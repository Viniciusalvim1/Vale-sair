// Avisos gerados pelo banco (Chama criado, lugar enchendo, conquistas...).
// Ao abrir a tela, todos são marcados como lidos.
import { exigirLogin } from '../api/auth.js';
import { notificacoes } from '../api/dados.js';
import { montarShell, atualizarContador } from '../ui/shell.js';
import { html, montar, icone, $ } from '../ui/dom.js';
import { tratarErro } from '../ui/feedback.js';
import { tempoRelativo, destinoSeguro } from '../ui/formatos.js';
import { vazio, erroNaTela } from '../ui/componentes.js';

const ESTILO = {
  chama: ['users', 'coral'],
  movimento: ['flame', 'coral'],
  pulso: ['spark', 'blue'],
  turma: ['users', ''],
  conquista: ['trophy', ''],
  sistema: ['bell', 'blue'],
};

if (exigirLogin()) iniciar();

async function iniciar() {
  montarShell();
  try {
    const lista = await notificacoes.recentes();
    montar($('#lista'), lista.length
      ? lista.map(aviso)
      : vazio('Tudo calmo por aqui', 'Quando sua Turma criar um Chama ou um lugar salvo encher, aparece aqui.'));
    if (lista.some((item) => !item.lida)) {
      await notificacoes.marcarTodasComoLidas();
      atualizarContador();
    }
  } catch (erro) {
    tratarErro(erro);
    montar($('#lista'), erroNaTela(erro.message));
  }
}

function aviso(item) {
  const [nomeIcone, cor] = ESTILO[item.tipo] ?? ESTILO.sistema;
  const destino = destinoSeguro(item.link, null);
  const conteudo = html`<span class="notice-icon ${cor}">${icone(nomeIcone)}</span>
    <div>
      <h3>${item.titulo}</h3>
      ${item.corpo ? html`<p>${item.corpo}</p>` : ''}
      <time datetime="${item.created_at}">${tempoRelativo(item.created_at)}</time>
    </div>`;
  const classe = `notice${item.lida ? '' : ' nova'}`;
  return destino ? html`<a class="${classe}" href="${destino}">${conteudo}</a>` : html`<div class="${classe}">${conteudo}</div>`;
}
