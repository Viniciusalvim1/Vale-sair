// Privacidade: cada chave grava uma coluna de "preferencias" (PATCH na API).
// "Reduzir movimento" também fica no aparelho para valer antes do login.
import { exigirLogin, sair } from '../api/auth.js';
import { perfil } from '../api/dados.js';
import { usuarioAtual } from '../api/sessao.js';
import { montarShell } from '../ui/shell.js';
import { $, $$ } from '../ui/dom.js';
import { avisar, tratarErro } from '../ui/feedback.js';

if (exigirLogin()) iniciar();

async function iniciar() {
  montarShell();
  $('#emailConta').textContent = usuarioAtual()?.email ?? '';
  $$('[data-preferencia]').forEach((chave) => chave.addEventListener('click', alternar));
  $('#sair').addEventListener('click', async (evento) => {
    evento.currentTarget.disabled = true;
    await sair();
    location.replace('index.html');
  });
  try {
    const preferencias = await perfil.preferencias();
    $$('[data-preferencia]').forEach((chave) => {
      chave.setAttribute('aria-checked', String(Boolean(preferencias?.[chave.dataset.preferencia])));
      chave.disabled = false;
    });
    aplicarMovimento(preferencias?.reduzir_movimento);
  } catch (erro) {
    tratarErro(erro);
  }
}

function aplicarMovimento(reduzir) {
  try {
    localStorage.setItem('vs-reduzir-movimento', reduzir ? '1' : '0');
  } catch {
    // sem localStorage: vale só nesta página
  }
  document.documentElement.classList.toggle('manual-reduce', Boolean(reduzir));
}

async function alternar(evento) {
  const chave = evento.currentTarget;
  const campo = chave.dataset.preferencia;
  const valor = chave.getAttribute('aria-checked') !== 'true';
  chave.setAttribute('aria-checked', String(valor));
  chave.disabled = true;
  try {
    await perfil.salvarPreferencia(campo, valor);
    if (campo === 'reduzir_movimento') {
      aplicarMovimento(valor);
      avisar(valor ? 'Movimentos reduzidos.' : 'Movimentos completos ativados.');
    } else {
      avisar('Preferência de privacidade atualizada.');
    }
  } catch (erro) {
    chave.setAttribute('aria-checked', String(!valor));
    tratarErro(erro);
  } finally {
    chave.disabled = false;
  }
}
