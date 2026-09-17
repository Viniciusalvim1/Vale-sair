// Autenticação pela API REST do Supabase Auth (/auth/v1).
import { SUPABASE_URL, SUPABASE_KEY } from '../config.js';
import { ErroApi, traduzirErro } from './http.js';
import { lerSessao, salvarSessao, limparSessao, tokenDeAcesso } from './sessao.js';
import { destinoSeguro } from '../ui/formatos.js';

async function chamarAuth(caminho, { metodo = 'POST', corpo, token } = {}) {
  const headers = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  let resposta;
  try {
    resposta = await fetch(`${SUPABASE_URL}/auth/v1/${caminho}`, {
      method: metodo,
      headers,
      body: metodo === 'GET' ? undefined : JSON.stringify(corpo ?? {}),
    });
  } catch {
    throw new ErroApi('Sem conexão com a internet. Confira sua rede e tente de novo.', 0);
  }
  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) throw new ErroApi(traduzirErro(dados, resposta.status), resposta.status, dados);
  return dados;
}

// Os links enviados por e-mail voltam para a tela de entrar deste app.
const voltarPara = () => encodeURIComponent(new URL('login.html', location.href).href);

// nome e username vão em "data" e o gatilho do banco cria o perfil com eles
export async function cadastrar({ nome, username, email, senha }) {
  const dados = await chamarAuth(`signup?redirect_to=${voltarPara()}`, {
    corpo: { email, password: senha, data: { nome, username } },
  });
  if (dados?.access_token) {
    salvarSessao(dados);
    return { entrou: true };
  }
  return { entrou: false }; // o projeto pede confirmação por e-mail
}

export async function entrar({ email, senha }) {
  salvarSessao(await chamarAuth('token?grant_type=password', { corpo: { email, password: senha } }));
}

export async function sair() {
  const token = lerSessao()?.access_token;
  try {
    if (token) await chamarAuth('logout', { token });
  } catch {
    // a sessão já não valia no servidor: basta limpar a local
  } finally {
    limparSessao();
  }
}

export async function recuperarSenha(email) {
  await chamarAuth(`recover?redirect_to=${voltarPara()}`, { corpo: { email } });
}

export async function trocarSenha(novaSenha) {
  const token = await tokenDeAcesso();
  const usuario = await chamarAuth('user', { metodo: 'PUT', corpo: { password: novaSenha }, token });
  const sessao = lerSessao();
  if (sessao) salvarSessao({ ...sessao, user: usuario });
}

// Links de confirmação e de recuperação voltam com a sessão no fragmento
// (#access_token=...&type=signup). Salva a sessão e devolve o tipo do link.
export async function sessaoDoLink() {
  const fragmento = new URLSearchParams(location.hash.slice(1));
  const erro = fragmento.get('error_description');
  const accessToken = fragmento.get('access_token');
  if (erro || accessToken) history.replaceState(null, '', location.pathname + location.search);
  if (erro) throw new ErroApi('Esse link expirou ou já foi usado. Peça um novo.', 400);
  if (!accessToken) return null;

  const user = await chamarAuth('user', { metodo: 'GET', token: accessToken });
  salvarSessao({
    access_token: accessToken,
    refresh_token: fragmento.get('refresh_token'),
    expires_in: Number(fragmento.get('expires_in')) || 3600,
    user,
  });
  return fragmento.get('type');
}

// Páginas internas chamam isto antes de tudo: sem login, vai para a tela de entrar.
export function exigirLogin() {
  if (lerSessao()) return true;
  const aqui = location.pathname.split('/').pop() + location.search;
  location.replace(`login.html?next=${encodeURIComponent(destinoSeguro(aqui))}`);
  return false;
}

export function irParaDestino(padrao = 'agora.html') {
  location.replace(destinoSeguro(new URLSearchParams(location.search).get('next'), padrao));
}
