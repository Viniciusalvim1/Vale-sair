// Entrar, voltar de links de e-mail (confirmação e nova senha) e recuperar senha.
import { entrar, sessaoDoLink, recuperarSenha, trocarSenha, irParaDestino } from '../api/auth.js';
import { lerSessao } from '../api/sessao.js';
import { montarShell } from '../ui/shell.js';
import { $ } from '../ui/dom.js';
import { mostrarAviso } from '../ui/componentes.js';

montarShell({ navegacao: false });
const aviso = $('#aviso');
const formEntrar = $('#formEntrar');
const formNovaSenha = $('#formNovaSenha');

iniciar();

async function iniciar() {
  try {
    const tipoDoLink = await sessaoDoLink();
    if (tipoDoLink === 'recovery') {
      formEntrar.hidden = true;
      formNovaSenha.hidden = false;
      mostrarAviso(aviso, 'Crie uma senha nova para a sua conta.', false);
      $('#novaSenha').focus();
      return;
    }
    if (tipoDoLink) {
      irParaDestino();
      return;
    }
  } catch (erro) {
    mostrarAviso(aviso, erro.message);
  }
  if (lerSessao()) irParaDestino();
}

formEntrar.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const email = formEntrar.elements.email.value.trim();
  const senha = formEntrar.elements.senha.value;
  if (!email || !senha) {
    mostrarAviso(aviso, 'Preencha o e-mail e a senha.');
    return;
  }
  const botao = formEntrar.querySelector('[type="submit"]');
  botao.disabled = true;
  botao.textContent = 'ENTRANDO...';
  try {
    await entrar({ email, senha });
    irParaDestino();
  } catch (erro) {
    mostrarAviso(aviso, erro.message);
    botao.disabled = false;
    botao.textContent = 'ENTRAR';
  }
});

$('#esqueci').addEventListener('click', async () => {
  const email = formEntrar.elements.email.value.trim();
  if (!email) {
    mostrarAviso(aviso, 'Digite seu e-mail acima e toque de novo em "Esqueci minha senha".');
    formEntrar.elements.email.focus();
    return;
  }
  try {
    await recuperarSenha(email);
    mostrarAviso(aviso, 'Se existir uma conta com esse e-mail, mandamos um link para criar outra senha.', false);
  } catch (erro) {
    mostrarAviso(aviso, erro.message);
  }
});

formNovaSenha.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const senha = formNovaSenha.elements.novaSenha.value;
  if (senha.length < 8) {
    mostrarAviso(aviso, 'A senha precisa ter pelo menos 8 caracteres.');
    return;
  }
  try {
    await trocarSenha(senha);
    irParaDestino();
  } catch (erro) {
    mostrarAviso(aviso, erro.message);
  }
});
