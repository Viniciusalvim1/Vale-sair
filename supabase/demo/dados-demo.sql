-- =====================================================================
-- Vale Sair? · Dados de demonstração
--
-- Cria pessoas fictícias (e-mails @demo.valesair.invalid: o domínio .invalid
-- é reservado e nunca recebe e-mail), uma Turma, Pulsos, check-ins, mensagens
-- na Sala, um Chama aberto e fotos fictícias (geradas por IA) para os lugares,
-- para o app ter vida nos testes e na apresentação.
--
-- ATENÇÃO: os lugares são reais (vêm do OpenStreetMap), mas o movimento, a
-- fila e as mensagens daqui são INVENTADOS para demonstração. Antes de abrir
-- o app para o público, rode supabase/demo/remover-demo.sql: ninguém deve ver
-- "cheio, fila de 8 minutos" sobre um bar de verdade sem que isso seja real.
--
-- Como usar: cole no SQL Editor do Supabase e rode. Pode rodar quantas vezes
-- quiser: Pulsos e check-ins (que expiram em poucas horas) são renovados.
-- As contas recebem senhas aleatórias: servem só de conteúdo.
-- =====================================================================

do $$
declare
  v_pessoas constant jsonb := '[
    {"email": "julia@demo.valesair.invalid", "nome": "Júlia Ramos", "username": "julia"},
    {"email": "leo@demo.valesair.invalid", "nome": "Leo Martins", "username": "leo"},
    {"email": "gi@demo.valesair.invalid", "nome": "Gi Costa", "username": "gi.costa"},
    {"email": "rafa@demo.valesair.invalid", "nome": "Rafa Souza", "username": "rafa.souza"},
    {"email": "bia@demo.valesair.invalid", "nome": "Bia Andrade", "username": "bia.andrade"},
    {"email": "caio@demo.valesair.invalid", "nome": "Caio Freitas", "username": "caio.freitas"},
    {"email": "nanda@demo.valesair.invalid", "nome": "Nanda Lima", "username": "nanda.lima"},
    {"email": "duda@demo.valesair.invalid", "nome": "Duda Pereira", "username": "duda.p"},
    {"email": "aobra@demo.valesair.invalid", "nome": "A Obra (demo)", "username": "aobra.demo"}
  ]';
  v_pessoa jsonb;
  v_ids jsonb := '{}'::jsonb;
  v_id uuid;
  v_julia uuid;
  v_leo uuid;
  v_gi uuid;
  v_rafa uuid;
  v_bia uuid;
  v_caio uuid;
  v_nanda uuid;
  v_duda uuid;
  v_demo uuid[];
  v_gestor uuid;
  v_obra uuid := (select id from public.locais where slug = 'a-obra');
  v_mercado uuid := (select id from public.locais where slug = 'mercado-novo');
  v_mercearia uuid := (select id from public.locais where slug = 'mercearia-lacerda');
  v_turma uuid;
  v_chama uuid;
begin
  if v_obra is null then
    raise exception 'Rode antes o supabase/seed.sql: os lugares de Belo Horizonte não estão no banco.';
  end if;

  -- 1) Pessoas fictícias (o gatilho do banco cria perfil e preferências).
  -- Os ids ficam guardados aqui porque o username pode ganhar sufixo se já
  -- existir outro igual, mas o e-mail é sempre único.
  for v_pessoa in select * from jsonb_array_elements(v_pessoas) loop
    select id into v_id from auth.users where email = v_pessoa ->> 'email';
    if v_id is null then
      v_id := gen_random_uuid();
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change
      ) values (
        '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_pessoa ->> 'email',
        extensions.crypt(encode(extensions.gen_random_bytes(18), 'base64'), extensions.gen_salt('bf')), now(),
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        jsonb_build_object('nome', v_pessoa ->> 'nome', 'username', v_pessoa ->> 'username'),
        now(), now(), '', '', '', ''
      );
      insert into auth.identities (user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      values (v_id, v_id::text,
              jsonb_build_object('sub', v_id::text, 'email', v_pessoa ->> 'email', 'email_verified', true),
              'email', now(), now(), now());
    end if;
    v_ids := v_ids || jsonb_build_object(v_pessoa ->> 'username', v_id);
  end loop;

  v_julia := (v_ids ->> 'julia')::uuid;
  v_leo := (v_ids ->> 'leo')::uuid;
  v_gi := (v_ids ->> 'gi.costa')::uuid;
  v_rafa := (v_ids ->> 'rafa.souza')::uuid;
  v_bia := (v_ids ->> 'bia.andrade')::uuid;
  v_caio := (v_ids ->> 'caio.freitas')::uuid;
  v_nanda := (v_ids ->> 'nanda.lima')::uuid;
  v_duda := (v_ids ->> 'duda.p')::uuid;
  v_demo := array[v_julia, v_leo, v_gi, v_rafa, v_bia, v_caio, v_nanda, v_duda];
  -- "(demo)" no nome de propósito: A Obra é um bar de verdade e esta conta não
  -- é dele. Na Sala as mensagens dela aparecem como "oficial", então quem vir a
  -- tela precisa enxergar na hora que é demonstração.
  v_gestor := (v_ids ->> 'aobra.demo')::uuid;

  -- 2) Perfis e privacidade
  update public.profiles
     set bio = 'Samba no sábado, pista na sexta.', regiao_id = (select id from public.regioes where nome = 'Savassi')
   where id = v_julia;
  update public.profiles
     set bio = 'Se tem banda ao vivo, eu tô.', regiao_id = (select id from public.regioes where nome = 'Centro')
   where id = v_leo;
  update public.profiles
     set quer_sair_ate = now() + interval '3 hours', regiao_id = (select id from public.regioes where nome = 'Santa Tereza')
   where id = v_gi;
  -- Leo aparece no radar só pela região; todos liberam Pulsos nas Cenas
  update public.preferencias set mostrar_estou_aqui = false where usuario_id = v_leo;
  update public.preferencias set pulsos_em_cenas = true where usuario_id = any (v_demo);
  -- este perfil responde como "oficial" na Sala do lugar
  update public.locais set responsavel_id = v_gestor where id = v_obra;

  -- 3) Turma
  select id into v_turma from public.turmas where criador_id = v_julia and nome = 'Os de sempre';
  if v_turma is null then
    insert into public.turmas (nome, descricao, criador_id)
    values ('Os de sempre', 'Quem sai toda sexta.', v_julia)
    returning id into v_turma;
  end if;
  insert into public.turma_membros (turma_id, usuario_id)
  values (v_turma, v_leo), (v_turma, v_gi)
  on conflict do nothing;

  -- 4) Pulsos: valem 2 horas, então a cada execução os da demo são renovados.
  -- Todos os 18 lugares ficam com pelo menos um Pulso ativo.
  delete from public.pulsos where autor_id = any (v_demo) and expira_em > now();
  insert into public.pulsos (local_id, autor_id, movimento, fila_minutos, genero_id, legenda, created_at, expira_em)
  select l.id, (v_ids ->> v.autor)::uuid, v.movimento::public.movimento_nivel, v.fila, g.id, v.legenda,
         now() - make_interval(mins => v.min_atras), now() - make_interval(mins => v.min_atras) + interval '2 hours'
  from (values
    ('a-obra', 'julia', 'cheio', 8, 'rock', 'A noite começou', 4),
    ('a-obra', 'leo', 'cheio', 10, 'funk', 'DJ na pista', 11),
    ('mercado-novo', 'gi.costa', 'animado', 0, null, 'Sem fila no terceiro andar', 25),
    ('mercado-novo', 'bia.andrade', 'cheio', 3, null, 'Mesas acabando, vem logo', 6),
    ('casa-do-samba-resenha', 'leo', 'animado', 5, 'samba', 'Roda de samba rolando', 38),
    ('casa-do-samba-resenha', 'nanda.lima', 'lotado', 15, 'samba', 'Não cabe mais ninguém na roda', 9),
    ('jack-rock-bar', 'gi.costa', 'tranquilo', 0, 'rock', 'Banda começa às 23h', 52),
    ('jack-rock-bar', 'caio.freitas', 'animado', 2, 'rock', 'Passagem de som, já tá enchendo', 14),
    ('mercado-central', 'rafa.souza', 'animado', 0, null, 'Fígado com jiló saindo no balcão', 33),
    ('mercado-distrital-santa-tereza', 'duda.p', 'tranquilo', 0, null, 'Mesa fácil na área central', 41),
    ('cantina-do-lucas', 'bia.andrade', 'animado', 0, 'mpb', 'Violão e voz no cantinho', 27),
    ('sindicato-do-chopp', 'caio.freitas', 'cheio', 6, null, 'Calçada tomada, chopp gelado', 18),
    ('zona', 'nanda.lima', 'cheio', 12, 'eletronica', 'Pista esquentando', 7),
    ('duke-n-duke', 'julia', 'animado', 4, null, 'Espera de uns 10 min pelo burger', 22),
    ('moema', 'rafa.souza', 'animado', 0, null, 'Mesas na calçada ainda livres', 36),
    ('albanos', 'duda.p', 'cheio', 5, null, 'Pastel acabando rápido', 15),
    ('mercearia-lacerda', 'leo', 'animado', 0, null, 'Galera na porta, clima bom', 48),
    ('bar-do-museu-clube-da-esquina', 'gi.costa', 'tranquilo', 0, 'mpb', 'Clube da Esquina tocando baixinho', 55),
    ('granfinos', 'caio.freitas', 'animado', 0, null, 'Cerveja a 1 grau', 29),
    ('bar-do-bolao', 'rafa.souza', 'cheio', 20, null, 'Fila grande pro espaguete', 12),
    ('befly-hall', 'bia.andrade', 'lotado', 25, 'pop', 'Show começou, fila na entrada', 5),
    ('cine-theatro-brasil', 'nanda.lima', 'cheio', 10, 'mpb', 'Plateia cheia, abriu a segunda sessão', 19)
  ) as v (slug, autor, movimento, fila, genero, legenda, min_atras)
  join public.locais l on l.slug = v.slug
  left join public.generos_musicais g on g.slug = v.genero;

  -- Confirmações e reações: cada Pulso recebe um "continua assim" de outros
  -- dois perfis da demo, para o selo de confiança aparecer.
  insert into public.pulso_confirmacoes (pulso_id, usuario_id)
  select p.id, v_demo[1 + (array_position(v_demo, p.autor_id) + d) % array_length(v_demo, 1)]
  from public.pulsos p, (values (1), (3)) as desloc (d)
  where p.autor_id = any (v_demo) and p.expira_em > now()
  on conflict do nothing;
  insert into public.pulso_reacoes (pulso_id, usuario_id, tipo)
  select p.id, v_demo[1 + (array_position(v_demo, p.autor_id) + 1) % array_length(v_demo, 1)],
         case when p.movimento in ('cheio', 'lotado') then 'flame' else 'spark' end::public.reacao_tipo
  from public.pulsos p
  where p.autor_id = any (v_demo) and p.expira_em > now()
  on conflict do nothing;

  -- 5) Presença
  delete from public.checkins where usuario_id = any (v_demo) and expira_em > now();
  insert into public.checkins (usuario_id, local_id, created_at, expira_em) values
    (v_julia, v_obra, now() - interval '20 minutes', now() + interval '160 minutes'),
    (v_leo, v_mercado, now() - interval '30 minutes', now() + interval '150 minutes'),
    (v_nanda, (select id from public.locais where slug = 'casa-do-samba-resenha'), now() - interval '10 minutes', now() + interval '170 minutes'),
    (v_caio, (select id from public.locais where slug = 'jack-rock-bar'), now() - interval '15 minutes', now() + interval '165 minutes');

  -- 5b) Fotos FICTÍCIAS dos lugares, geradas por IA (public/assets/img/locais).
  -- Não são fotos dos estabelecimentos reais: remover-demo.sql as tira.
  update public.locais set foto_url = 'assets/img/locais/' || slug || '.jpg'
   where foto_url is null or foto_url like 'assets/img/locais/%';

  -- 6) Sala do lugar em destaque
  if not exists (select 1 from public.mensagens where local_id = v_obra and created_at > now() - interval '2 hours') then
    insert into public.mensagens (local_id, autor_id, conteudo, created_at) values
      (v_obra, v_julia, 'A fila está andando rápido?', now() - interval '6 minutes'),
      (v_obra, v_gestor, 'Sim! Uns 8 minutos agora.', now() - interval '5 minutes'),
      (v_obra, v_leo, 'O DJ já começou. Tá bem animado', now() - interval '2 minutes');
  end if;

  -- 7) Chama aberto na Turma
  if not exists (select 1 from public.chamas where turma_id = v_turma and encerra_em > now()) then
    insert into public.chamas (turma_id, criador_id, titulo, quando, encerra_em)
    values (v_turma, v_julia, 'Bora sexta?',
            date_trunc('day', now()) + interval '1 day 22 hours 30 minutes', now() + interval '6 hours')
    returning id into v_chama;
    insert into public.chama_opcoes (chama_id, local_id, ordem)
    values (v_chama, v_obra, 1), (v_chama, v_mercado, 2), (v_chama, v_mercearia, 3);
    insert into public.votos (chama_id, opcao_id, usuario_id)
    select v_chama, o.id, v.usuario
    from (values (v_leo, 1), (v_gi, 1), (v_julia, 2)) as v (usuario, ordem)
    join public.chama_opcoes o on o.chama_id = v_chama and o.ordem = v.ordem;
  end if;

  -- 8) Cenas
  insert into public.cena_membros (cena_id, usuario_id)
  select c.id, v.usuario
  from (values ('samba-bh', v_julia), ('samba-bh', v_gi), ('rock-bh', v_leo), ('eletronica-bh', v_gi)) as v (slug, usuario)
  join public.cenas c on c.slug = v.slug
  on conflict do nothing;
end;
$$;
