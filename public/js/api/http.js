// Cliente da API RESTful do Supabase, feito só com fetch.
//   /rest/v1     PostgREST: tabelas, views e funções (RPC)
//   /storage/v1  arquivos (fotos e vídeos dos Pulsos, avatares)
// Toda requisição leva a publishable key (header apikey) e, com login, o JWT
// da pessoa (Authorization: Bearer ...). É por ele que o RLS sabe quem pede.
import { SUPABASE_URL, SUPABASE_KEY } from '../config.js';
import { tokenDeAcesso } from './sessao.js';

export class ErroApi extends Error {
  constructor(mensagem, status, detalhes) {
    super(mensagem);
    this.name = 'ErroApi';
    this.status = status;
    this.detalhes = detalhes;
  }
}

const ERROS_DO_AUTH = {
  invalid_credentials: 'E-mail ou senha incorretos.',
  email_not_confirmed: 'Confirme seu e-mail pelo link que enviamos antes de entrar.',
  user_already_exists: 'Já existe uma conta com este e-mail.',
  email_exists: 'Já existe uma conta com este e-mail.',
  weak_password: 'Essa senha é fraca. Use pelo menos 8 caracteres, misturando letras e números.',
  email_address_invalid: 'Esse e-mail não parece válido.',
  validation_failed: 'Confira os dados digitados.',
  over_email_send_rate_limit: 'Muitos e-mails enviados seguidos. Espere alguns minutos.',
  over_request_rate_limit: 'Muitas tentativas seguidas. Espere um pouco e tente de novo.',
  signup_disabled: 'O cadastro está desativado no momento.',
  same_password: 'A nova senha precisa ser diferente da atual.',
  session_expired: 'Sua sessão expirou. Entre de novo.',
};

const ERROS_POR_TEXTO = [
  [/invalid login credentials/i, ERROS_DO_AUTH.invalid_credentials],
  [/email not confirmed/i, ERROS_DO_AUTH.email_not_confirmed],
  [/user already registered/i, ERROS_DO_AUTH.user_already_exists],
  [/password should be/i, ERROS_DO_AUTH.weak_password],
  [/jwt expired/i, ERROS_DO_AUTH.session_expired],
  [/payload too large|exceeded the maximum allowed size/i, 'O arquivo é grande demais (máximo de 15 MB).'],
  [/mime type .* is not supported/i, 'Esse tipo de arquivo não é aceito. Use foto (JPG, PNG) ou vídeo (MP4).'],
];

// Converte as respostas de erro do PostgREST, Auth e Storage numa frase para a pessoa.
export function traduzirErro(dados, status) {
  const original = String(dados?.message ?? dados?.msg ?? dados?.error_description ?? dados?.error ?? '');
  if (ERROS_DO_AUTH[dados?.error_code]) return ERROS_DO_AUTH[dados.error_code];
  for (const [padrao, texto] of ERROS_POR_TEXTO) if (padrao.test(original)) return texto;

  switch (dados?.code) {
    case 'P0001': // raise exception das regras de negócio: já vem em português
    case 'P0002':
    case '22023':
      return original;
    case '23505':
      return 'Isso já foi feito antes.';
    case '23514':
    case '22001':
      return 'Algum dado está fora do formato esperado.';
    case '42501':
      return /permission denied|row-level security/i.test(original)
        ? 'Você não tem permissão para fazer isso.'
        : original;
    default:
  }
  if (status === 401) return 'Entre na sua conta para continuar.';
  if (status === 413) return 'O arquivo é grande demais (máximo de 15 MB).';
  if (status >= 500) return 'O servidor não respondeu direito. Tente de novo em instantes.';
  return original || 'Algo deu errado. Tente de novo.';
}

function montarUrl(caminho, query) {
  const url = new URL(`${SUPABASE_URL}${caminho}`);
  for (const [chave, valor] of Object.entries(query ?? {})) {
    if (valor !== undefined && valor !== null) url.searchParams.append(chave, valor);
  }
  return url;
}

export async function requisitar(caminho, { metodo = 'GET', query, corpo, headers = {}, prefer } = {}) {
  const token = await tokenDeAcesso();
  const cabecalhos = { apikey: SUPABASE_KEY, ...headers };
  if (token) cabecalhos.Authorization = `Bearer ${token}`;
  if (prefer) cabecalhos.Prefer = prefer;

  let body = corpo;
  if (corpo !== undefined && !(corpo instanceof Blob)) {
    cabecalhos['Content-Type'] = 'application/json';
    body = JSON.stringify(corpo);
  }

  let resposta;
  try {
    resposta = await fetch(montarUrl(caminho, query), { method: metodo, headers: cabecalhos, body });
  } catch {
    throw new ErroApi('Sem conexão com a internet. Confira sua rede e tente de novo.', 0);
  }

  const texto = await resposta.text();
  let dados = null;
  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch {
    dados = { message: texto };
  }
  if (!resposta.ok) throw new ErroApi(traduzirErro(dados, resposta.status), resposta.status, dados);
  return dados;
}

// PostgREST: filtros vão na query string (ex.: { local_id: 'eq.<id>', order: 'nome.asc' })
export const rest = {
  listar: (recurso, query) => requisitar(`/rest/v1/${recurso}`, { query }),

  async um(recurso, query) {
    const linhas = await requisitar(`/rest/v1/${recurso}`, { query: { ...query, limit: 1 } });
    return linhas[0] ?? null;
  },

  inserir: (tabela, dados, { minimo = false } = {}) =>
    requisitar(`/rest/v1/${tabela}`, {
      metodo: 'POST',
      corpo: dados,
      prefer: minimo ? 'return=minimal' : 'return=representation',
    }),

  atualizar: (tabela, filtros, dados) =>
    requisitar(`/rest/v1/${tabela}`, { metodo: 'PATCH', query: filtros, corpo: dados, prefer: 'return=representation' }),

  remover: (tabela, filtros) =>
    requisitar(`/rest/v1/${tabela}`, { metodo: 'DELETE', query: filtros, prefer: 'return=minimal' }),

  rpc: (funcao, args = {}) => requisitar(`/rest/v1/rpc/${funcao}`, { metodo: 'POST', corpo: args }),
};

// Storage: upload com o JWT da pessoa (as políticas só liberam a própria pasta)
export const storage = {
  enviar: (bucket, caminho, arquivo) =>
    requisitar(`/storage/v1/object/${bucket}/${caminho}`, {
      metodo: 'POST',
      corpo: arquivo,
      headers: {
        'Content-Type': arquivo.type || 'application/octet-stream',
        'cache-control': 'max-age=3600',
        'x-upsert': 'false',
      },
    }),

  remover: (bucket, caminhos) =>
    requisitar(`/storage/v1/object/${bucket}`, { metodo: 'DELETE', corpo: { prefixes: caminhos } }),

  urlPublica: (bucket, caminho) =>
    `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${caminho.split('/').map(encodeURIComponent).join('/')}`,
};
