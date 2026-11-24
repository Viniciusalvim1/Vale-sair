// Modo mock do Pulso: o fluxo inteiro (escolher lugar, publicar, ver no feed,
// reagir e confirmar) funciona sem o Supabase, com dados guardados só neste
// navegador. Serve para apresentar, testar a interface e desenvolver offline.
//
//   Ligar:    abra qualquer página com ?mock=1 (fica salvo neste aparelho)
//   Desligar: abra qualquer página com ?mock=0
//   Ou fixe MODO_MOCK = true em config.js.
//
// As regras imitam as do banco (supabase/migrations): Pulso vale 2 horas,
// movimento é obrigatório, legenda até 80 caracteres, fila de 0 a 240 min e
// o mesmo lugar só aceita um Pulso seu a cada 10 minutos.
import { MODO_MOCK } from '../config.js';

const CHAVE_LIGADO = 'vs-mock';
const CHAVE_ESTADO = 'vs-mock-estado';
const BANCO_MIDIA = 'vs-mock-midia';

export const EU = Object.freeze({
  id: '00000000-0000-4000-8000-00000000e000',
  email: 'voce@demo.valesair.invalid',
  user_metadata: { nome: 'Você (demo)', username: 'voce' },
});

const DUAS_HORAS = 2 * 60 * 60 * 1000;
const TRES_HORAS = 3 * 60 * 60 * 1000;
const DEZ_MINUTOS = 10 * 60 * 1000;
const MOVIMENTOS = ['tranquilo', 'animado', 'cheio', 'lotado'];

const GENEROS = { mpb: 'MPB', eletronica: 'Eletrônica', rock: 'Rock', samba: 'Samba', funk: 'Funk', pop: 'Pop' };

// Descrições de supabase/seed.sql.
const DESCRICOES = {
  'mercado-central': "Mercado tradicional do Centro, com bares e botecos entre as bancas.",
  'mercado-novo': "Prédio modernista no Centro que virou point de bares e cervejarias independentes.",
  'mercado-distrital-santa-tereza': "Mercado de bairro em Santa Tereza, com bares e mesas na área central.",
  'cantina-do-lucas': "Restaurante e bar no Edifício Maletta, ponto histórico da boemia do Centro.",
  'sindicato-do-chopp': "Choperia na Rua da Bahia, no corredor boêmio do Centro.",
  'zona': "Bar com pista de dança na Rua Aarão Reis.",
  'a-obra': "Bar dançante na Savassi, na Rua Rio Grande do Norte.",
  'jack-rock-bar': "Bar de rock na Avenida do Contorno.",
  'duke-n-duke': "Bar de hambúrgueres e drinks na Rua Alagoas, na Savassi.",
  'moema': "Bar tradicional da Savassi, na Rua Sergipe.",
  'albanos': "Choperia de bairro no Sion, na Rua Pium-í.",
  'mercearia-lacerda': "Boteco na Rua Mármore, no coração boêmio de Santa Tereza.",
  'bar-do-museu-clube-da-esquina': "Bar do museu dedicado ao Clube da Esquina, em Santa Tereza.",
  'casa-do-samba-resenha': "Casa de samba na Rua Niquelina, em Santa Efigênia.",
  'granfinos': "Boteco na Avenida Brasil, em Santa Efigênia.",
  'bar-do-bolao': "Boteco tradicional do Padre Eustáquio, na Rua Vila Rica.",
  'befly-hall': "Casa de shows na Avenida Nossa Senhora do Carmo.",
  'cine-theatro-brasil': "Teatro e casa de shows na Avenida Amazonas, no Centro.",
};

// Os 18 lugares de supabase/seed.sql, com as fotos de assets/img/locais.
const LUGARES = [
  ['Mercado Central', 'mercado-central', 'Mercado', 'Centro', null, 'Avenida Augusto de Lima, 744 · Centro', -19.922582, -43.943024, false],
  ['Mercado Novo', 'mercado-novo', 'Mercado', 'Centro', null, 'Rua dos Tupis, 879 · Centro', -19.920613, -43.945293, false],
  ['Mercado Distrital de Santa Tereza', 'mercado-distrital-santa-tereza', 'Mercado', 'Santa Tereza', null, 'Rua São Gotardo, 273 · Santa Tereza', -19.9126, -43.911833, false],
  ['Cantina do Lucas', 'cantina-do-lucas', 'Restaurante', 'Centro', 'mpb', 'Avenida Augusto de Lima, 233 · Centro', -19.924811, -43.937578, true],
  ['Sindicato do Chopp', 'sindicato-do-chopp', 'Bar', 'Centro', null, 'Rua da Bahia, 1172 · Centro', -19.925189, -43.937644, false],
  ['Zona', 'zona', 'Bar', 'Centro', 'eletronica', 'Rua Aarão Reis, 554 · Centro', -19.919508, -43.93462, false],
  ['A Obra', 'a-obra', 'Balada', 'Savassi', 'rock', 'Rua Rio Grande do Norte, 1168 · Savassi', -19.935816, -43.932255, false],
  ['Jack Rock Bar', 'jack-rock-bar', 'Bar', 'Carmo', 'rock', 'Avenida do Contorno, 5623 · Carmo', -19.939673, -43.929766, true],
  ["Duke'n'Duke", 'duke-n-duke', 'Bar', 'Savassi', null, 'Rua Alagoas, 1470 · Savassi', -19.939889, -43.937465, false],
  ['Moema', 'moema', 'Bar', 'Savassi', null, 'Rua Sergipe, 1370 · Savassi', -19.938437, -43.938563, false],
  ['Albanos', 'albanos', 'Boteco', 'Sion', null, 'Rua Pium-i, 611 · Sion', -19.945125, -43.930462, false],
  ['Mercearia Lacerda', 'mercearia-lacerda', 'Boteco', 'Santa Tereza', null, 'Rua Mármore, 170 · Santa Tereza', -19.91575, -43.920861, false],
  ['Bar do Museu Clube da Esquina', 'bar-do-museu-clube-da-esquina', 'Boteco', 'Santa Tereza', 'mpb', 'Rua Paraisópolis, 738 · Santa Tereza', -19.915419, -43.912734, true],
  ['Casa do Samba Resenha', 'casa-do-samba-resenha', 'Bar', 'Santa Efigênia', 'samba', 'Rua Niquelina, 691 · Santa Efigênia', -19.921601, -43.914655, true],
  ['Granfinos', 'granfinos', 'Boteco', 'Santa Efigênia', null, 'Avenida Brasil · Santa Efigênia', -19.924865, -43.923207, false],
  ['Bar do Bolão', 'bar-do-bolao', 'Boteco', 'Padre Eustáquio', null, 'Rua Vila Rica, 637 · Padre Eustáquio', -19.917278, -43.981962, false],
  ['BeFly Hall', 'befly-hall', 'Casa de show', 'Savassi', null, 'Avenida Nossa Senhora do Carmo, 230 · Savassi', -19.942064, -43.934214, true],
  ['Cine Theatro Brasil Vallourec', 'cine-theatro-brasil', 'Casa de show', 'Centro', null, 'Avenida Amazonas, 315 · Centro', -19.919042, -43.937972, true],
].map(([nome, slug, categoria, regiao, genero, endereco, latitude, longitude, ao_vivo], i) => ({
  id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
  nome,
  slug,
  categoria,
  categoria_slug: categoria.toLowerCase().replace(/ /g, '-'),
  regiao,
  regiao_id: null,
  genero_principal: GENEROS[genero] ?? null,
  endereco,
  latitude,
  longitude,
  musica_ao_vivo: ao_vivo,
  faixa_preco: 2,
  fecha_as: null,
  descricao: DESCRICOES[slug] ?? null,
  foto_url: `assets/img/locais/${slug}.jpg`,
  instagram: null,
  tiktok: null,
  cardapio_url: null,
  responsavel_id: null,
}));

const PESSOAS = {
  julia: 'Júlia Ramos', leo: 'Leo Martins', 'gi.costa': 'Gi Costa', 'rafa.souza': 'Rafa Souza',
  'bia.andrade': 'Bia Andrade', 'caio.freitas': 'Caio Freitas', 'nanda.lima': 'Nanda Lima', 'duda.p': 'Duda Pereira',
};

// Mesmos Pulsos de supabase/demo/dados-demo.sql. "min" é há quantos minutos
// foi postado: as datas são recalculadas a cada leitura, então nunca expiram.
const PULSOS_DEMO = [
  ['a-obra', 'julia', 'cheio', 8, 'rock', 'A noite começou', 4],
  ['a-obra', 'leo', 'cheio', 10, 'funk', 'DJ na pista', 11],
  ['mercado-novo', 'gi.costa', 'animado', 0, null, 'Sem fila no terceiro andar', 25],
  ['mercado-novo', 'bia.andrade', 'cheio', 3, null, 'Mesas acabando, vem logo', 6],
  ['casa-do-samba-resenha', 'leo', 'animado', 5, 'samba', 'Roda de samba rolando', 38],
  ['casa-do-samba-resenha', 'nanda.lima', 'lotado', 15, 'samba', 'Não cabe mais ninguém na roda', 9],
  ['jack-rock-bar', 'gi.costa', 'tranquilo', 0, 'rock', 'Banda começa às 23h', 52],
  ['jack-rock-bar', 'caio.freitas', 'animado', 2, 'rock', 'Passagem de som, já tá enchendo', 14],
  ['mercado-central', 'rafa.souza', 'animado', 0, null, 'Fígado com jiló saindo no balcão', 33],
  ['mercado-distrital-santa-tereza', 'duda.p', 'tranquilo', 0, null, 'Mesa fácil na área central', 41],
  ['cantina-do-lucas', 'bia.andrade', 'animado', 0, 'mpb', 'Violão e voz no cantinho', 27],
  ['sindicato-do-chopp', 'caio.freitas', 'cheio', 6, null, 'Calçada tomada, chopp gelado', 18],
  ['zona', 'nanda.lima', 'cheio', 12, 'eletronica', 'Pista esquentando', 7],
  ['duke-n-duke', 'julia', 'animado', 4, null, 'Espera de uns 10 min pelo burger', 22],
  ['moema', 'rafa.souza', 'animado', 0, null, 'Mesas na calçada ainda livres', 36],
  ['albanos', 'duda.p', 'cheio', 5, null, 'Pastel acabando rápido', 15],
  ['mercearia-lacerda', 'leo', 'animado', 0, null, 'Galera na porta, clima bom', 48],
  ['bar-do-museu-clube-da-esquina', 'gi.costa', 'tranquilo', 0, 'mpb', 'Clube da Esquina tocando baixinho', 55],
  ['granfinos', 'caio.freitas', 'animado', 0, null, 'Cerveja a 1 grau', 29],
  ['bar-do-bolao', 'rafa.souza', 'cheio', 20, null, 'Fila grande pro espaguete', 12],
  ['befly-hall', 'bia.andrade', 'lotado', 25, 'pop', 'Show começou, fila na entrada', 5],
  ['cine-theatro-brasil', 'nanda.lima', 'cheio', 10, 'mpb', 'Plateia cheia, abriu a segunda sessão', 19],
];

// "Eletrônica" -> "eletronica": é o que vem antes de "-bh" no slug da Cena
const slugDoGenero = (genero) => (genero ?? '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');

// Duas mensagens de demonstração na Sala dos lugares que têm Pulso da demo.
const MENSAGENS_DEMO = [
  ['a-obra', 'julia', 'Alguém chegando? Tô perto do bar', 9],
  ['a-obra', 'leo', 'Chegando em 10, guarda lugar', 6],
  ['mercado-novo', 'gi.costa', 'Terceiro andar tá de boa', 20],
  ['casa-do-samba-resenha', 'nanda.lima', 'A roda tá linda hoje', 8],
  ['befly-hall', 'bia.andrade', 'Fila andando rápido', 4],
];

const porSlug = new Map(LUGARES.map((l) => [l.slug, l]));
const porId = new Map(LUGARES.map((l) => [l.id, l]));

// ---------- Ligar e desligar ----------

function armazenamento() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function mockAtivo() {
  const ls = armazenamento();
  const pedido = globalThis.location ? new URLSearchParams(globalThis.location.search).get('mock') : null;
  try {
    if (pedido === '1') ls?.setItem(CHAVE_LIGADO, '1');
    if (pedido === '0') ls?.removeItem(CHAVE_LIGADO);
  } catch {
    // navegação privada sem localStorage: vale só o parâmetro da URL
  }
  if (pedido === '0') return false;
  if (MODO_MOCK || pedido === '1') return true;
  try {
    return ls?.getItem(CHAVE_LIGADO) === '1';
  } catch {
    return false;
  }
}

export const sessaoMock = () => ({
  access_token: 'mock',
  refresh_token: 'mock',
  expires_at: Math.floor(Date.now() / 1000) + 10 * 365 * 24 * 3600,
  user: EU,
});

// ---------- Estado (o que a pessoa fez no modo mock) ----------

const estadoVazio = () => ({ pulsos: [], reacoes: [], confirmacoes: [], checkin: null, salvos: [], mensagens: [] });

export function criarLoja({ storage = armazenamento(), agora = () => Date.now() } = {}) {
  let memoria = estadoVazio();

  const ler = () => {
    if (!storage) return memoria;
    try {
      return { ...estadoVazio(), ...JSON.parse(storage.getItem(CHAVE_ESTADO) ?? 'null') };
    } catch {
      return estadoVazio();
    }
  };
  const gravar = (estado) => {
    memoria = estado;
    try {
      storage?.setItem(CHAVE_ESTADO, JSON.stringify(estado));
    } catch {
      // sem espaço ou sem localStorage: fica só na memória desta página
    }
  };

  function pulsosDemo() {
    return PULSOS_DEMO.map(([slug, autor, movimento, fila, genero, legenda, min], i) => {
      const criado = agora() - min * 60_000;
      return {
        id: `00000000-0000-4000-9000-${String(i + 1).padStart(12, '0')}`,
        local_id: porSlug.get(slug).id,
        autor_id: `demo-${autor}`,
        autor_username: autor,
        autor_nome: PESSOAS[autor],
        movimento,
        fila_minutos: fila,
        genero: GENEROS[genero] ?? null,
        legenda,
        // os da demo usam a foto do lugar como se fosse a do Pulso
        midia_path: `assets/img/locais/${slug}.jpg`,
        midia_tipo: 'foto',
        created_at: new Date(criado).toISOString(),
        expira_em: new Date(criado + DUAS_HORAS).toISOString(),
        // e já chegam com alguns "continua assim" e reações
        base_confirmacoes: 1 + (i % 3),
        base_reacoes: 2 + ((i * 5) % 7),
      };
    });
  }

  function feed() {
    const estado = ler();
    const t = agora();
    return [...estado.pulsos, ...pulsosDemo()]
      .filter((p) => Date.parse(p.expira_em) > t)
      .map((p) => {
        const local = porId.get(p.local_id);
        const reagi = estado.reacoes.includes(p.id);
        const confirmei = estado.confirmacoes.includes(p.id);
        return {
          ...p,
          local_nome: local.nome,
          regiao: local.regiao,
          genero: p.genero ?? local.genero_principal,
          reacoes: (p.base_reacoes ?? 0) + (reagi ? 1 : 0),
          confirmacoes: (p.base_confirmacoes ?? 0) + (confirmei ? 1 : 0),
          reagi,
          confirmei,
        };
      })
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  }

  // Mesmo cálculo da view locais_status.
  function status(local, ativos) {
    const doLocal = ativos.filter((p) => p.local_id === local.id);
    const ult = doLocal[0];
    const comMidia = doLocal.find((p) => p.midia_path);
    const confirmacoes = doLocal.reduce((soma, p) => soma + p.confirmacoes, 0);
    const checkin = ler().checkin;
    const euAqui = checkin && checkin.local_id === local.id && Date.parse(checkin.expira_em) > agora();
    let confianca = null;
    if (ult) confianca = confirmacoes >= 5 || doLocal.length >= 3 ? 'alta' : confirmacoes >= 1 || doLocal.length >= 2 ? 'media' : 'baixa';
    return {
      ...local,
      ultimo_pulso_id: ult?.id ?? null,
      movimento: ult?.movimento ?? null,
      fila_minutos: ult?.fila_minutos ?? null,
      genero_agora: ult?.genero ?? local.genero_principal,
      ultimo_pulso_em: ult?.created_at ?? null,
      ultima_midia_path: comMidia?.midia_path ?? null,
      ultima_midia_tipo: comMidia?.midia_tipo ?? null,
      pulsos_ativos: doLocal.length,
      confirmacoes,
      pessoas_agora: doLocal.length * 3 + (euAqui ? 1 : 0),
      confianca,
    };
  }

  function locaisStatus() {
    const ativos = feed();
    return LUGARES.map((l) => status(l, ativos)).sort(
      (a, b) =>
        (Date.parse(b.ultimo_pulso_em ?? 0) || 0) - (Date.parse(a.ultimo_pulso_em ?? 0) || 0) ||
        a.nome.localeCompare(b.nome, 'pt-BR'),
    );
  }

  function publicar({ localId, movimento, filaMinutos = null, legenda = '', midia = null }) {
    if (!porId.has(localId)) throw new Error('Esse lugar não existe.');
    if (!MOVIMENTOS.includes(movimento)) throw new Error('Diga como está o movimento.');
    if (filaMinutos !== null && !(Number.isInteger(filaMinutos) && filaMinutos >= 0 && filaMinutos <= 240)) {
      throw new Error('Algum dado está fora do formato esperado.');
    }
    const texto = (legenda ?? '').trim();
    if (texto.length > 80) throw new Error('Algum dado está fora do formato esperado.');

    const estado = ler();
    const t = agora();
    const recente = estado.pulsos.some((p) => p.local_id === localId && t - Date.parse(p.created_at) < DEZ_MINUTOS);
    if (recente) throw new Error('Você mostrou este lugar há pouco. Espere uns minutos para postar outro Pulso.');

    const pulso = {
      id: globalThis.crypto?.randomUUID?.() ?? `mock-${t}-${Math.random().toString(16).slice(2)}`,
      local_id: localId,
      autor_id: EU.id,
      autor_username: EU.user_metadata.username,
      autor_nome: EU.user_metadata.nome,
      movimento,
      fila_minutos: filaMinutos,
      genero: null,
      legenda: texto || null,
      midia_path: midia?.path ?? null,
      midia_tipo: midia?.tipo ?? null,
      created_at: new Date(t).toISOString(),
      expira_em: new Date(t + DUAS_HORAS).toISOString(),
    };
    // guarda só os que ainda valem, para o localStorage não crescer à toa
    estado.pulsos = [pulso, ...estado.pulsos.filter((p) => Date.parse(p.expira_em) > t)];
    gravar(estado);
    return pulso;
  }

  const existe = (pulsoId) => feed().find((p) => p.id === pulsoId);

  function reagir(pulsoId) {
    if (!existe(pulsoId)) throw new Error('Esse Pulso já expirou.');
    const estado = ler();
    if (estado.reacoes.includes(pulsoId)) throw new Error('Isso já foi feito antes.');
    estado.reacoes.push(pulsoId);
    gravar(estado);
  }

  function desfazerReacao(pulsoId) {
    const estado = ler();
    estado.reacoes = estado.reacoes.filter((id) => id !== pulsoId);
    gravar(estado);
  }

  function confirmar(pulsoId) {
    const pulso = existe(pulsoId);
    if (!pulso) throw new Error('Esse Pulso já expirou.');
    if (pulso.autor_id === EU.id) throw new Error('Você não pode confirmar o próprio Pulso.');
    const estado = ler();
    if (estado.confirmacoes.includes(pulsoId)) throw new Error('Isso já foi feito antes.');
    estado.confirmacoes.push(pulsoId);
    gravar(estado);
  }

  function meuCheckinAtivo() {
    const checkin = ler().checkin;
    return checkin && Date.parse(checkin.expira_em) > agora() ? checkin : null;
  }

  function toAqui(localId) {
    if (!porId.has(localId)) throw new Error('Esse lugar não existe.');
    const estado = ler();
    const t = agora();
    estado.checkin = {
      id: `checkin-${t}`,
      local_id: localId,
      created_at: new Date(t).toISOString(),
      expira_em: new Date(t + TRES_HORAS).toISOString(),
    };
    gravar(estado);
  }

  function sairDoLocal() {
    const estado = ler();
    estado.checkin = null;
    gravar(estado);
  }

  // Lugares salvos
  const salvos = () => ler().salvos;
  function salvar(localId) {
    const estado = ler();
    if (estado.salvos.some((s) => s.local_id === localId)) throw new Error('Isso já foi feito antes.');
    estado.salvos.unshift({ local_id: localId, created_at: new Date(agora()).toISOString() });
    gravar(estado);
  }
  function removerSalvo(localId) {
    const estado = ler();
    estado.salvos = estado.salvos.filter((s) => s.local_id !== localId);
    gravar(estado);
  }

  // Sala: as mensagens da demo (com horário relativo) + as que a pessoa enviou.
  // Os ids crescem com o tempo, como o "id > depois" do app espera.
  function mensagens(localId) {
    const t = agora();
    const demo = MENSAGENS_DEMO.filter(([slug]) => porSlug.get(slug).id === localId).map(([, autor, conteudo, min]) => ({
      id: t - min * 60_000,
      local_id: localId,
      autor_id: `demo-${autor}`,
      autor_nome: PESSOAS[autor],
      autor_username: autor,
      conteudo,
      created_at: new Date(t - min * 60_000).toISOString(),
      oficial: false,
    }));
    const minhas = ler().mensagens.filter((m) => m.local_id === localId);
    return [...demo, ...minhas].sort((a, b) => a.id - b.id);
  }
  function enviarMensagem(localId, conteudo) {
    const texto = (conteudo ?? '').trim();
    if (texto.length < 1 || texto.length > 280) throw new Error('Algum dado está fora do formato esperado.');
    const estado = ler();
    const t = agora();
    estado.mensagens = estado.mensagens.filter((m) => t - Date.parse(m.created_at) < 24 * 60 * 60_000);
    estado.mensagens.push({
      id: t,
      local_id: localId,
      autor_id: EU.id,
      autor_nome: EU.user_metadata.nome,
      autor_username: EU.user_metadata.username,
      conteudo: texto,
      created_at: new Date(t).toISOString(),
      oficial: false,
    });
    gravar(estado);
  }

  const limpar = () => gravar(estadoVazio());

  return {
    feed, locaisStatus, publicar, reagir, desfazerReacao, confirmar, meuCheckinAtivo, toAqui, sairDoLocal,
    salvos, salvar, removerSalvo, mensagens, enviarMensagem, limpar,
  };
}

// ---------- Mídia (fotos e vídeos ficam no IndexedDB deste navegador) ----------

const urlsDaMidia = new Map();

function abrirBanco() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) return reject(new Error('Sem IndexedDB'));
    const pedido = indexedDB.open(BANCO_MIDIA, 1);
    pedido.onupgradeneeded = () => pedido.result.createObjectStore('arquivos');
    pedido.onsuccess = () => resolve(pedido.result);
    pedido.onerror = () => reject(pedido.error);
  });
}

async function guardarMidia(caminho, arquivo) {
  const banco = await abrirBanco();
  await new Promise((resolve, reject) => {
    const tx = banco.transaction('arquivos', 'readwrite');
    tx.objectStore('arquivos').put(arquivo, caminho);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  urlsDaMidia.set(caminho, URL.createObjectURL(arquivo));
}

// Carrega as mídias dos Pulsos ainda válidos e apaga as dos que expiraram.
async function carregarMidias(caminhosValidos) {
  let banco;
  try {
    banco = await abrirBanco();
  } catch {
    return;
  }
  const validos = new Set(caminhosValidos);
  await new Promise((resolve) => {
    const tx = banco.transaction('arquivos', 'readwrite');
    const store = tx.objectStore('arquivos');
    store.openCursor().onsuccess = (evento) => {
      const cursor = evento.target.result;
      if (!cursor) return;
      if (!validos.has(cursor.key)) cursor.delete();
      else if (!urlsDaMidia.has(cursor.key)) urlsDaMidia.set(cursor.key, URL.createObjectURL(cursor.value));
      cursor.continue();
    };
    tx.oncomplete = resolve;
    tx.onerror = resolve;
  });
}

// ---------- Mesmo formato de api/dados.js ----------

export function criarApiMock(loja = criarLoja()) {
  const espera = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms)); // imita a rede
  const comMidias = async (lista) => {
    await carregarMidias(loja.feed().map((p) => p.midia_path).filter((c) => c?.startsWith('mock/')));
    return lista;
  };

  const locais = {
    emAlta: async () => comMidias(loja.locaisStatus()),
    porId: async (id) => comMidias(loja.locaisStatus().find((l) => l.id === id) ?? null),
    porIds: async (ids) => comMidias(loja.locaisStatus().filter((l) => ids.includes(l.id))),
  };

  const pulsos = {
    ativos: async ({ localId } = {}) =>
      comMidias(loja.feed().filter((p) => !localId || p.local_id === localId).slice(0, 30)),
    // nas Cenas, o gênero do Pulso (ou o do lugar) decide em qual feed ele aparece
    daCena: async (slug) => comMidias(loja.feed().filter((p) => slugDoGenero(p.genero) === slug.replace(/-bh$/, ''))),
    async publicar({ localId, movimento, filaMinutos, legenda, arquivo }) {
      await espera(arquivo ? 700 : 300);
      let midia = null;
      if (arquivo) {
        const tipo = arquivo.type.startsWith('video/') ? 'video' : 'foto';
        const caminho = `mock/${EU.id}/${Date.now()}-${Math.random().toString(16).slice(2)}`;
        try {
          await guardarMidia(caminho, arquivo);
          midia = { path: caminho, tipo };
        } catch {
          // sem IndexedDB (navegação privada em alguns navegadores): publica sem a mídia
        }
      }
      return loja.publicar({ localId, movimento, filaMinutos, legenda, midia });
    },
    confirmar: async (id) => loja.confirmar(id),
    reagir: async (id) => loja.reagir(id),
    desfazerReacao: async (id) => loja.desfazerReacao(id),
    urlMidia: (caminho) =>
      caminho.startsWith('assets/') ? caminho : urlsDaMidia.get(caminho) ?? 'assets/img/role-bh.jpg',
  };

  const presenca = {
    meuCheckinAtivo: async () => loja.meuCheckinAtivo(),
    toAqui: async (localId) => loja.toAqui(localId),
    sairDoLocal: async () => loja.sairDoLocal(),
    queroSair: async () => null,
    amigosPorPerto: async () => [],
  };

  const salvos = {
    meus: async () => loja.salvos(),
    estaSalvo: async (localId) => loja.salvos().some((s) => s.local_id === localId),
    salvar: async (localId) => loja.salvar(localId),
    remover: async (localId) => loja.removerSalvo(localId),
  };

  const sala = {
    recentes: async (localId) => loja.mensagens(localId).slice(-40),
    novas: async (localId, depoisDe) => loja.mensagens(localId).filter((m) => m.id > depoisDe),
    enviar: async (localId, conteudo) => loja.enviarMensagem(localId, conteudo),
    ativas: async () => {
      const t = loja.locaisStatus();
      return t
        .map((l) => {
          const msgs = loja.mensagens(l.id);
          return {
            id: l.id,
            nome: l.nome,
            regiao: l.regiao,
            mensagens_recentes: msgs.length,
            pessoas_agora: l.pessoas_agora,
            ultima_mensagem_em: msgs.at(-1)?.created_at ?? null,
          };
        })
        .sort((a, b) => b.mensagens_recentes - a.mensagens_recentes || b.pessoas_agora - a.pessoas_agora || a.nome.localeCompare(b.nome, 'pt-BR'));
    },
  };

  const notificacoes = {
    recentes: async () => [],
    naoLidas: async () => 0,
    marcarTodasComoLidas: async () => {},
  };

  return { locais, pulsos, presenca, salvos, sala, notificacoes, loja };
}
