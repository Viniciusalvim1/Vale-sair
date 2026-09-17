// Cadastro: sugere o usuário a partir do nome e confere se ele está livre.
import { cadastrar } from '../api/auth.js';
import { lerSessao } from '../api/sessao.js';
import { perfil } from '../api/dados.js';
import { montarShell } from '../ui/shell.js';
import { $ } from '../ui/dom.js';
import { normalizarUsername, usernameValido } from '../ui/formatos.js';
import { mostrarAviso } from '../ui/componentes.js';

if (lerSessao()) location.replace('agora.html');
montarShell({ navegacao: false });

const form = $('#formCadastro');
const aviso = $('#aviso');
const info = $('#usernameInfo');
const { nome, username, email, senha } = form.elements;
let usernameEditado = false;
let verificacao;

nome.addEventListener('input', () => {
  if (usernameEditado) return;
  username.value = normalizarUsername(nome.value.trim().split(/\s+/)[0] ?? '');
  verificar();
});

username.addEventListener('input', () => {
  usernameEditado = true;
  const valor = normalizarUsername(username.value);
  if (valor !== username.value) username.value = valor;
  verificar();
});

function mostrarInfo(texto, tipo = '') {
  info.textContent = texto;
  info.className = tipo;
}

function verificar() {
  clearTimeout(verificacao);
  const valor = username.value;
  if (!valor) return mostrarInfo('Letras minúsculas, números, ponto e _.');
  if (!usernameValido(valor)) return mostrarInfo('Use de 3 a 24 caracteres.', 'erro');
  mostrarInfo('Verificando...');
  verificacao = setTimeout(async () => {
    const livre = await perfil.usernameDisponivel(valor).catch(() => null);
    if (username.value !== valor || livre === null) return;
    mostrarInfo(livre ? `@${valor} está livre!` : `@${valor} já está em uso.`, livre ? 'ok' : 'erro');
  }, 400);
  return undefined;
}

form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const dados = {
    nome: nome.value.trim(),
    username: username.value,
    email: email.value.trim(),
    senha: senha.value,
  };
  if (dados.nome.length < 2) return mostrarAviso(aviso, 'Diga seu nome (pelo menos 2 letras).');
  if (!usernameValido(dados.username)) return mostrarAviso(aviso, 'Escolha um usuário de 3 a 24 caracteres.');
  if (!/^\S+@\S+\.\S+$/.test(dados.email)) return mostrarAviso(aviso, 'Esse e-mail não parece válido.');
  if (dados.senha.length < 8) return mostrarAviso(aviso, 'A senha precisa ter pelo menos 8 caracteres.');

  const botao = form.querySelector('[type="submit"]');
  botao.disabled = true;
  botao.textContent = 'CRIANDO...';
  try {
    if (!(await perfil.usernameDisponivel(dados.username))) {
      throw new Error(`@${dados.username} já está em uso. Escolha outro.`);
    }
    const { entrou } = await cadastrar(dados);
    if (entrou) {
      location.replace('agora.html');
      return undefined;
    }
    form.hidden = true;
    mostrarAviso(aviso, `Pronto! Mandamos um link de confirmação para ${dados.email}. Abra o e-mail para ativar sua conta.`, false);
  } catch (erro) {
    mostrarAviso(aviso, erro.message);
    botao.disabled = false;
    botao.textContent = 'CRIAR CONTA';
  }
  return undefined;
});
