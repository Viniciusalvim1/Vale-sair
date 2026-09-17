// Testes do banco de dados.
// Aplica as migrations reais num Postgres 17 em memória (PGlite) com uma
// réplica mínima do Supabase e confere regras de negócio, RLS e privilégios
// simulando pessoas logadas (role authenticated) e visitantes (role anon).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const raiz = new URL('../', import.meta.url);
const ler = (caminho) => readFile(new URL(caminho, raiz), 'utf8');

const ANA = '00000000-0000-4000-8000-00000000000a';
const BETO = '00000000-0000-4000-8000-00000000000b';
const CAIO = '00000000-0000-4000-8000-00000000000c';
const CONVIDADO = '00000000-0000-4000-8000-0000000000ff';

const db = new PGlite();
const sql = async (texto, params = []) => (await db.query(texto, params)).rows;
const um = async (texto, params) => (await sql(texto, params))[0];

// Roda fn como pessoa logada (authenticated + auth.uid()) ou como visitante (anon).
async function como(usuario, fn) {
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [usuario ?? '']);
  await db.exec(`set role ${usuario ? 'authenticated' : 'anon'}`);
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
  }
}

const idDoLocal = async (slug) => (await um('select id from public.locais where slug = $1', [slug])).id;
const xpDe = async (id) => (await um('select xp from public.profiles where id = $1', [id])).xp;

before(async () => {
  await db.exec(await ler('tests/banco/supabase-stub.sql'));
  const pasta = new URL('supabase/migrations/', raiz);
  for (const arquivo of (await readdir(pasta)).filter((f) => f.endsWith('.sql')).sort()) {
    try {
      await db.exec(await readFile(new URL(arquivo, pasta), 'utf8'));
    } catch (erro) {
      erro.message = `${arquivo}: ${erro.message}`;
      throw erro;
    }
  }
  await db.exec(await ler('supabase/seed.sql'));
  await sql(
    `insert into auth.users (id, email, raw_user_meta_data) values
       ($1, 'ana@teste.com', '{"nome": "Ana Souza", "username": "ana"}'),
       ($2, 'beto@teste.com', '{"nome": "Beto", "username": "beto"}'),
       ($3, 'caio@teste.com', '{"nome": "Caio", "username": "ana"}')`,
    [ANA, BETO, CAIO],
  );
});

after(() => db.close());

test('as migrations criam 22 tabelas, todas com RLS ligado', async () => {
  const { total } = await um(`select count(*)::int as total from pg_tables where schemaname = 'public'`);
  assert.equal(total, 22);
  const semRls = await sql(
    `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`,
  );
  assert.deepEqual(semRls, []);
});

test('cadastro cria perfil e preferências; username repetido ganha sufixo', async () => {
  const perfis = await sql('select id, username from public.profiles');
  assert.equal(perfis.length, 3);
  assert.match(perfis.find((p) => p.id === CAIO).username, /^caio_[0-9a-f]{5}$/);
  assert.equal((await um('select count(*)::int as n from public.preferencias')).n, 3);

  await como(null, async () => {
    assert.equal((await um(`select public.username_disponivel('ana') as ok`)).ok, false);
    assert.equal((await um(`select public.username_disponivel('nova.pessoa') as ok`)).ok, true);
    assert.equal((await um(`select public.username_disponivel('A!') as ok`)).ok, false);
  });
});

test('visitante sem conta lê lugares, mas não perfis, pulsos ou votos', async () => {
  await como(null, async () => {
    assert.equal((await sql('select nome from public.locais')).length, 8);
    await assert.rejects(sql('select * from public.profiles'), /permission denied/);
    await assert.rejects(sql('select * from public.pulsos'), /permission denied/);
    await assert.rejects(sql('select * from public.votos'), /permission denied/);
  });
});

test('preferências são privadas e ninguém edita o próprio XP', async () => {
  const linhas = await como(ANA, () => sql('select usuario_id from public.preferencias'));
  assert.deepEqual(linhas.map((l) => l.usuario_id), [ANA]);

  await como(ANA, async () => {
    await assert.rejects(sql('update public.profiles set xp = 9999 where id = $1', [ANA]), /permission denied/);
    await sql(`update public.profiles set bio = 'bora?' where id = $1`, [ANA]);
    // o RLS impede alterar o perfil de outra pessoa (0 linhas afetadas)
    await sql(`update public.profiles set bio = 'invadido' where id = $1`, [BETO]);
  });
  assert.equal((await um('select bio from public.profiles where id = $1', [BETO])).bio, null);
});

test('pulso: autor vem do login, rende XP e a conquista Primeiro Pulso', async () => {
  const galpao = await idDoLocal('galpao-54');
  const pulso = await como(ANA, () =>
    um(
      `insert into public.pulsos (local_id, movimento, fila_minutos)
       values ($1, 'cheio', 8) returning autor_id`,
      [galpao],
    ),
  );
  assert.equal(pulso.autor_id, ANA);
  assert.equal(await xpDe(ANA), 10 + 30); // pulso sem mídia + conquista
  const notas = await sql('select titulo from public.notificacoes where usuario_id = $1', [ANA]);
  assert.ok(notas.some((n) => n.titulo === 'CONQUISTA: PRIMEIRO PULSO'));
});

test('antispam: outro pulso no mesmo lugar em menos de 10 minutos é recusado', async () => {
  const galpao = await idDoLocal('galpao-54');
  await como(ANA, () =>
    assert.rejects(sql(`insert into public.pulsos (local_id, movimento) values ($1, 'lotado')`, [galpao]), /há pouco/),
  );
});

test('não dá para forjar o autor nem confirmar o próprio pulso', async () => {
  const galpao = await idDoLocal('galpao-54');
  const { id } = await um('select id from public.pulsos where autor_id = $1', [ANA]);
  await como(ANA, async () => {
    await assert.rejects(
      sql(`insert into public.pulsos (local_id, movimento, autor_id) values ($1, 'animado', $2)`, [galpao, BETO]),
      /permission denied/,
    );
    await assert.rejects(sql('insert into public.pulso_confirmacoes (pulso_id) values ($1)', [id]), /row-level security/);
  });
});

test('confirmação de outra pessoa dá XP ao autor e aparece no status do lugar', async () => {
  const { id } = await um('select id from public.pulsos where autor_id = $1', [ANA]);
  const antes = await xpDe(ANA);
  await como(BETO, () => sql('insert into public.pulso_confirmacoes (pulso_id) values ($1)', [id]));
  assert.equal((await xpDe(ANA)) - antes, 5);

  const status = await como(CAIO, () =>
    um(`select movimento, fila_minutos, confirmacoes, confianca from public.locais_status where slug = 'galpao-54'`),
  );
  assert.deepEqual({ ...status }, { movimento: 'cheio', fila_minutos: 8, confirmacoes: 1, confianca: 'media' });

  const feed = await como(BETO, () => um('select confirmacoes, confirmei, reagi, autor_username from public.pulsos_feed'));
  assert.deepEqual({ ...feed }, { confirmacoes: 1, confirmei: true, reagi: false, autor_username: 'ana' });
});

test('turma: criador vira admin, só membros enxergam, entrada por código', async () => {
  const turma = await como(ANA, () =>
    um(`insert into public.turmas (nome) values ('Os de sempre') returning id, codigo_convite`),
  );
  assert.equal((await como(BETO, () => sql('select id from public.turmas'))).length, 0);

  await como(BETO, () => sql('select public.entrar_na_turma($1)', [turma.codigo_convite.toLowerCase()]));
  assert.equal((await como(BETO, () => sql('select id from public.turmas'))).length, 1);
  assert.equal((await como(CAIO, () => sql('select * from public.turma_membros'))).length, 0);

  const resumo = await como(ANA, () => um('select membros from public.turmas_resumo where id = $1', [turma.id]));
  assert.equal(resumo.membros, 2);
  const avisos = await sql(`select titulo from public.notificacoes where usuario_id = $1 and tipo = 'turma'`, [ANA]);
  assert.ok(avisos.some((a) => a.titulo === 'BETO ENTROU NA TURMA'));

  await como(CAIO, () => assert.rejects(sql(`select public.entrar_na_turma('XXXXXX')`), /não encontrado/));
});

test('chama: 2 a 4 lugares, avisa a turma e aceita voto pelo link sem conta', async () => {
  const { id: turmaId } = await um('select id from public.turmas limit 1');
  const locais = (await sql('select id from public.locais order by nome limit 3')).map((l) => l.id);
  const lista = (ids) => `{${ids.join(',')}}`;

  await como(ANA, () =>
    assert.rejects(sql('select * from public.criar_chama($1::uuid[], $2)', [lista(locais.slice(0, 1)), turmaId]), /2 a 4/),
  );
  const chama = await como(ANA, () => um('select * from public.criar_chama($1::uuid[], $2)', [lista(locais), turmaId]));
  const aviso = await um(`select link from public.notificacoes where usuario_id = $1 and tipo = 'chama'`, [BETO]);
  assert.equal(aviso.link, `enquete.html?codigo=${chama.codigo}`);
  assert.equal((await como(CAIO, () => sql('select * from public.chamas'))).length, 0);

  const publico = await como(null, async () => (await um('select public.chama_publica($1) as c', [chama.codigo])).c);
  assert.equal(publico.opcoes.length, 3);
  assert.equal(publico.turma.nome, 'Os de sempre');

  const [primeira, segunda] = publico.opcoes.map((o) => o.id);
  let resultado = await como(null, async () =>
    (await um(`select public.votar_no_chama($1, $2, $3, 'Duda') as c`, [chama.codigo, segunda, CONVIDADO])).c,
  );
  assert.equal(resultado.meu_voto, segunda);

  // mudar de ideia troca o voto em vez de duplicar
  resultado = await como(null, async () =>
    (await um('select public.votar_no_chama($1, $2, $3) as c', [chama.codigo, primeira, CONVIDADO])).c,
  );
  assert.equal(resultado.total_votos, 1);
  assert.equal(resultado.meu_voto, primeira);

  // voto de conta logada + opção que não é do Chama
  resultado = await como(BETO, async () => (await um('select public.votar_no_chama($1, $2) as c', [chama.codigo, primeira])).c);
  assert.equal(resultado.total_votos, 2);
  await como(BETO, () =>
    assert.rejects(sql('select public.votar_no_chama($1, $2)', [chama.codigo, CONVIDADO]), /não faz parte/),
  );
});

test('radar: amigo aparece no lugar, só na região ou some, conforme a privacidade', async () => {
  const galpao = await idDoLocal('galpao-54');
  await como(BETO, () => sql('insert into public.checkins (local_id) values ($1)', [galpao]));
  const radar = () => como(ANA, () => sql('select situacao, local_nome, regiao from public.amigos_por_perto()'));

  assert.deepEqual((await radar()).map((a) => ({ ...a })), [{ situacao: 'no_local', local_nome: 'Galpão 54', regiao: 'Savassi' }]);

  await como(BETO, () => sql('update public.preferencias set mostrar_estou_aqui = false where usuario_id = $1', [BETO]));
  assert.deepEqual((await radar()).map((a) => ({ ...a })), [{ situacao: 'na_regiao', local_nome: null, regiao: 'Savassi' }]);

  await como(BETO, () => sql('update public.preferencias set mostrar_regiao = false where usuario_id = $1', [BETO]));
  assert.equal((await radar()).length, 0);

  // quem não divide turma não vê ninguém; o lugar mostra só a contagem
  assert.equal((await como(CAIO, () => sql('select * from public.amigos_por_perto()'))).length, 0);
  const status = await como(CAIO, () => um(`select pessoas_agora from public.locais_status where slug = 'galpao-54'`));
  assert.equal(status.pessoas_agora, 1);
  assert.equal((await como(ANA, () => sql('select * from public.checkins'))).length, 0);
});

test('quero sair avisa quem divide turma, uma vez só', async () => {
  const avisos = async () =>
    (await sql(`select count(*)::int as n from public.notificacoes where usuario_id = $1 and titulo = 'BETO QUER SAIR'`, [ANA])).at(0).n;

  await como(CAIO, () => sql('select public.quero_sair(3)'));
  await como(BETO, () => sql('select public.quero_sair(3)'));
  assert.equal(await avisos(), 1);
  await como(BETO, () => sql('select public.quero_sair(2)'));
  assert.equal(await avisos(), 1);

  await como(BETO, () =>
    assert.rejects(sql('update public.profiles set quer_sair_ate = now() where id = $1', [BETO]), /permission denied/),
  );
});

test('sala: mensagem sai em nome próprio e o antiflood segura a sexta seguida', async () => {
  const galpao = await idDoLocal('galpao-54');
  await como(ANA, async () => {
    for (let i = 0; i < 5; i += 1) {
      await sql('insert into public.mensagens (local_id, conteudo) values ($1, $2)', [galpao, `  oi ${i}  `]);
    }
    await assert.rejects(sql(`insert into public.mensagens (local_id, conteudo) values ($1, 'mais uma')`, [galpao]), /Calma/);
  });
  const primeira = await como(BETO, () => um('select conteudo, autor_username, oficial from public.mensagens_sala order by id limit 1'));
  assert.deepEqual({ ...primeira }, { conteudo: 'oi 0', autor_username: 'ana', oficial: false });
});

test('storage: cada pessoa só envia arquivos para a própria pasta', async () => {
  await como(ANA, async () => {
    await sql(`insert into storage.objects (bucket_id, name) values ('pulsos', $1)`, [`${ANA}/foto.jpg`]);
    await assert.rejects(
      sql(`insert into storage.objects (bucket_id, name) values ('pulsos', $1)`, [`${BETO}/foto.jpg`]),
      /row-level security/,
    );
  });
});

test('perfil e retrospectiva trazem os números da pessoa', async () => {
  const resumo = await como(ANA, async () => (await um('select public.meu_resumo() as r')).r);
  assert.equal(resumo.pulsos, 1);
  assert.equal(resumo.lugares, 1);
  assert.equal(resumo.turmas, 1);
  assert.deepEqual(resumo.estilo, [{ nome: 'Bar', pct: 100 }]);
  assert.deepEqual(resumo.conquistas.map((c) => c.codigo).sort(), ['faisca', 'primeiro_pulso']);

  const mes = await como(ANA, async () => (await um('select public.minha_retrospectiva() as m')).m);
  assert.equal(mes.roles, 1);
  assert.equal(mes.lugares_novos, 1);
  assert.equal(mes.regiao_favorita, 'Savassi');
  assert.equal(mes.estilo, 'Pop');
});

test('cena: ranking agregado e pulsos só de quem autorizou', async () => {
  const autentico = await idDoLocal('autentico');
  await como(ANA, () => sql(`insert into public.pulsos (local_id, movimento) values ($1, 'animado')`, [autentico]));

  const doSamba = () => como(BETO, () => sql(`select id from public.pulsos_da_cena('samba-bh')`));
  assert.equal((await doSamba()).length, 0);
  await como(ANA, () => sql('update public.preferencias set pulsos_em_cenas = true where usuario_id = $1', [ANA]));
  assert.equal((await doSamba()).length, 1);

  const ranking = await como(BETO, () => sql(`select posicao, nome, pulsos_30d from public.ranking_da_cena('samba-bh')`));
  assert.deepEqual({ ...ranking[0] }, { posicao: 1, nome: 'Autêntico', pulsos_30d: 1 });
});

test('funções internas não ficam expostas pela API', async () => {
  await como(ANA, () => assert.rejects(sql('select public.conceder_xp($1, 1000)', [ANA]), /permission denied/));
  await como(null, () => assert.rejects(sql('select public.criar_chama(null)'), /permission denied/));
});
