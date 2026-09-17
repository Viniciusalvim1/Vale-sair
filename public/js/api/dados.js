// Operações do app sobre a API REST. Cada função corresponde a uma chamada
// HTTP (GET/POST/PATCH/DELETE) em uma tabela, view ou RPC do banco.
import { rest, storage } from './http.js';
import { usuarioAtual } from './sessao.js';
import { BUCKET_PULSOS, BUCKET_AVATARES } from '../config.js';
import { extensaoDoArquivo } from '../ui/formatos.js';

const agoraIso = () => new Date().toISOString();
const emLista = (ids) => `(${ids.join(',')})`;
const meuId = () => usuarioAtual()?.id;

// ---------- Lugares ----------
export const locais = {
  // GET /rest/v1/locais_status?order=ultimo_pulso_em.desc.nullslast
  emAlta: () =>
    rest.listar('locais_status', { select: '*', order: 'ultimo_pulso_em.desc.nullslast,nome.asc' }),
  porId: (id) => rest.um('locais_status', { select: '*', id: `eq.${id}` }),
  porIds: (ids) =>
    ids.length ? rest.listar('locais_status', { select: '*', id: `in.${emLista(ids)}` }) : Promise.resolve([]),
};

// ---------- Lugares salvos ----------
export const salvos = {
  meus: () => rest.listar('locais_salvos', { select: 'local_id,created_at', order: 'created_at.desc' }),
  estaSalvo: async (localId) =>
    Boolean(await rest.um('locais_salvos', { select: 'local_id', local_id: `eq.${localId}` })),
  salvar: (localId) => rest.inserir('locais_salvos', { local_id: localId }, { minimo: true }),
  remover: (localId) => rest.remover('locais_salvos', { local_id: `eq.${localId}` }),
};

// ---------- Pulsos ----------
export const pulsos = {
  ativos: ({ localId } = {}) =>
    rest.listar('pulsos_feed', {
      select: '*',
      expira_em: `gt.${agoraIso()}`,
      local_id: localId ? `eq.${localId}` : undefined,
      order: 'created_at.desc',
      limit: 30,
    }),

  daCena: (slug) => rest.rpc('pulsos_da_cena', { p_slug: slug }),

  // 1) envia a mídia para o Storage (pasta da pessoa)  2) grava o Pulso
  async publicar({ localId, movimento, filaMinutos, legenda, arquivo }) {
    let midia = {};
    if (arquivo) {
      const caminho = `${meuId()}/${crypto.randomUUID()}.${extensaoDoArquivo(arquivo)}`;
      await storage.enviar(BUCKET_PULSOS, caminho, arquivo);
      midia = { midia_path: caminho, midia_tipo: arquivo.type.startsWith('video/') ? 'video' : 'foto' };
    }
    try {
      const [pulso] = await rest.inserir('pulsos', {
        local_id: localId,
        movimento,
        fila_minutos: filaMinutos ?? null,
        legenda: legenda || null,
        ...midia,
      });
      return pulso;
    } catch (erro) {
      // o banco recusou (antispam, por exemplo): não deixa arquivo órfão
      if (midia.midia_path) await storage.remover(BUCKET_PULSOS, [midia.midia_path]).catch(() => {});
      throw erro;
    }
  },

  confirmar: (pulsoId) => rest.inserir('pulso_confirmacoes', { pulso_id: pulsoId }, { minimo: true }),
  reagir: (pulsoId, tipo = 'flame') => rest.inserir('pulso_reacoes', { pulso_id: pulsoId, tipo }, { minimo: true }),
  desfazerReacao: (pulsoId) =>
    rest.remover('pulso_reacoes', { pulso_id: `eq.${pulsoId}`, usuario_id: `eq.${meuId()}` }),
  urlMidia: (caminho) => storage.urlPublica(BUCKET_PULSOS, caminho),
};

// ---------- Presença ----------
export const presenca = {
  meuCheckinAtivo: () =>
    rest.um('checkins', { select: 'id,local_id,expira_em', expira_em: `gt.${agoraIso()}`, order: 'created_at.desc' }),
  toAqui: (localId) => rest.inserir('checkins', { local_id: localId }, { minimo: true }),
  sairDoLocal: (checkinId) => rest.remover('checkins', { id: `eq.${checkinId}` }),
  queroSair: (horas = 4) => rest.rpc('quero_sair', { p_horas: horas }),
  amigosPorPerto: () => rest.rpc('amigos_por_perto'),
};

// ---------- Sala (chat de cada lugar) ----------
export const sala = {
  recentes: async (localId) =>
    (await rest.listar('mensagens_sala', { select: '*', local_id: `eq.${localId}`, order: 'id.desc', limit: 40 })).reverse(),
  novas: (localId, depoisDe) =>
    rest.listar('mensagens_sala', { select: '*', local_id: `eq.${localId}`, id: `gt.${depoisDe}`, order: 'id.asc' }),
  enviar: (localId, conteudo) => rest.inserir('mensagens', { local_id: localId, conteudo }, { minimo: true }),
  ativas: () =>
    rest.listar('salas_ativas', { select: '*', order: 'mensagens_recentes.desc,pessoas_agora.desc,nome.asc' }),
};

// ---------- Turmas ----------
export const turmas = {
  minhas: () => rest.listar('turmas_resumo', { select: '*', order: 'created_at.desc' }),
  porId: (id) => rest.um('turmas_resumo', { select: '*', id: `eq.${id}` }),
  membros: (turmaId) =>
    rest.listar('turma_membros', {
      select: 'papel,created_at,perfil:profiles(id,nome,username,avatar_url,quer_sair_ate)',
      turma_id: `eq.${turmaId}`,
      order: 'created_at.asc',
    }),
  chamas: (turmaId) =>
    rest.listar('chamas', {
      select: 'id,codigo,titulo,quando,encerra_em,created_at',
      turma_id: `eq.${turmaId}`,
      order: 'created_at.desc',
      limit: 5,
    }),
  criar: async (nome, descricao) => (await rest.inserir('turmas', { nome, descricao: descricao || null }))[0],
  entrar: (codigo) => rest.rpc('entrar_na_turma', { p_codigo: codigo }),
  sair: (turmaId) => rest.remover('turma_membros', { turma_id: `eq.${turmaId}`, usuario_id: `eq.${meuId()}` }),
};

// ---------- Chamas (enquetes) ----------
export const chamas = {
  criar: ({ localIds, turmaId, titulo, quando, horas }) =>
    rest.rpc('criar_chama', {
      p_local_ids: localIds,
      p_turma_id: turmaId || null,
      p_titulo: titulo || 'Onde vamos?',
      p_quando: quando || null,
      p_horas_votacao: horas ?? 6,
    }),
  publico: (codigo, convidadoId) => rest.rpc('chama_publica', { p_codigo: codigo, p_convidado_id: convidadoId ?? null }),
  votar: (codigo, opcaoId, convidado) =>
    rest.rpc('votar_no_chama', {
      p_codigo: codigo,
      p_opcao_id: opcaoId,
      p_convidado_id: convidado?.id ?? null,
      p_convidado_nome: convidado?.nome ?? null,
    }),
};

// ---------- Cenas ----------
export const cenas = {
  todas: () => rest.listar('cenas_resumo', { select: '*', order: 'membros.desc,nome.asc' }),
  porSlug: (slug) => rest.um('cenas_resumo', { select: '*', slug: `eq.${slug}` }),
  ranking: (slug) => rest.rpc('ranking_da_cena', { p_slug: slug }),
  entrar: (cenaId) => rest.inserir('cena_membros', { cena_id: cenaId }, { minimo: true }),
  sair: (cenaId) => rest.remover('cena_membros', { cena_id: `eq.${cenaId}`, usuario_id: `eq.${meuId()}` }),
};

// ---------- Perfil e preferências ----------
export const perfil = {
  meu: () => rest.um('profiles', { select: '*', id: `eq.${meuId()}` }),
  resumo: () => rest.rpc('meu_resumo'),
  retrospectiva: (mes) => rest.rpc('minha_retrospectiva', { p_mes: mes }),
  atualizar: async (dados) => (await rest.atualizar('profiles', { id: `eq.${meuId()}` }, dados))[0],
  usernameDisponivel: (username) => rest.rpc('username_disponivel', { p_username: username }),
  async enviarAvatar(arquivo) {
    const caminho = `${meuId()}/avatar-${Date.now()}.${extensaoDoArquivo(arquivo)}`;
    await storage.enviar(BUCKET_AVATARES, caminho, arquivo);
    return storage.urlPublica(BUCKET_AVATARES, caminho);
  },
  preferencias: () => rest.um('preferencias', { select: '*' }),
  salvarPreferencia: (campo, valor) =>
    rest.atualizar('preferencias', { usuario_id: `eq.${meuId()}` }, { [campo]: valor }),
  regioes: () => rest.listar('regioes', { select: 'id,nome', order: 'nome.asc' }),
  conquistas: () => rest.listar('conquistas', { select: 'codigo,nome,descricao,xp', order: 'xp.asc' }),
};

// ---------- Notificações ----------
export const notificacoes = {
  recentes: () => rest.listar('notificacoes', { select: '*', order: 'created_at.desc', limit: 50 }),
  naoLidas: async () => (await rest.listar('notificacoes', { select: 'id', lida: 'eq.false', limit: 99 })).length,
  marcarTodasComoLidas: () => rest.atualizar('notificacoes', { lida: 'eq.false' }, { lida: true }),
};
