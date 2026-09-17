// Sessão do Supabase Auth guardada no navegador.
// O access_token (um JWT) vai no header Authorization de cada requisição;
// perto de expirar, ele é renovado com o refresh_token.
import { SUPABASE_URL, SUPABASE_KEY } from '../config.js';

const CHAVE = 'vs-sessao';
let renovacao = null;

export function lerSessao() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE)) ?? null;
  } catch {
    return null;
  }
}

export function salvarSessao(dados) {
  const sessao = {
    access_token: dados.access_token,
    refresh_token: dados.refresh_token,
    expires_at: dados.expires_at ?? Math.floor(Date.now() / 1000) + (dados.expires_in ?? 3600),
    user: dados.user,
  };
  localStorage.setItem(CHAVE, JSON.stringify(sessao));
  return sessao;
}

export function limparSessao() {
  localStorage.removeItem(CHAVE);
}

export function usuarioAtual() {
  return lerSessao()?.user ?? null;
}

// Devolve um access_token válido (renovando se preciso) ou null sem login.
export async function tokenDeAcesso() {
  const sessao = lerSessao();
  if (!sessao) return null;
  if (sessao.expires_at - 60 > Date.now() / 1000) return sessao.access_token;
  renovacao ??= renovar(sessao.refresh_token).finally(() => {
    renovacao = null;
  });
  return (await renovacao)?.access_token ?? null;
}

async function renovar(refreshToken) {
  const resposta = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!resposta.ok) {
    limparSessao();
    return null;
  }
  return salvarSessao(await resposta.json());
}
