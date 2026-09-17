// Layout padrão das páginas internas: menu lateral (desktop), barra inferior
// (celular), painel da marca, aviso rápido e camada de efeitos.
import { html, icone, seguro, $ } from './dom.js';
import { explosao, reiniciarAnimacao } from './feedback.js';
import { notificacoes } from '../api/dados.js';
import { lerSessao } from '../api/sessao.js';

const ITENS = [
  { id: 'agora', rotulo: 'AGORA', longo: 'AGORA', href: 'agora.html', icone: 'spark' },
  { id: 'radar', rotulo: 'RADAR', longo: 'RADAR', href: 'radar.html', icone: 'map' },
  { id: 'chama', rotulo: 'CRIAR', longo: 'CRIAR ROLÊ', href: 'chama.html', icone: 'plus', criar: true },
  { id: 'comunidades', rotulo: 'COMUN.', longo: 'COMUNIDADES', href: 'comunidades.html', icone: 'users' },
  { id: 'eu', rotulo: 'EU', longo: 'MEU PERFIL', href: 'perfil.html', icone: 'profile' },
];

const atual = (ativo, id) => (ativo === id ? seguro('aria-current="page"') : '');

function menuLateral(ativo) {
  return html`<nav class="side-nav" aria-label="Menu principal">
    <a class="logo" href="agora.html">VALE SAIR?</a>
    ${ITENS.map(
      (item) => html`<a class="side-link${item.criar ? ' criar' : ''}" href="${item.href}" ${atual(ativo, item.id)}>
        ${icone(item.icone)} ${item.longo}</a>`,
    )}
    <a class="side-link" href="notificacoes.html" ${atual(ativo, 'notificacoes')}>
      ${icone('bell')} AVISOS <span class="badge" data-contador hidden></span></a>
    <small>BELO HORIZONTE · AO VIVO</small>
  </nav>`;
}

function barraInferior(ativo) {
  return html`<nav class="bottom-nav" aria-label="Navegação principal">
    ${ITENS.map((item) =>
      item.criar
        ? html`<a class="nav-item" href="${item.href}" aria-label="Criar um rolê" ${atual(ativo, item.id)}>
            <span class="nav-create">${icone('plus')}</span></a>`
        : html`<a class="nav-item" href="${item.href}" ${atual(ativo, item.id)}>
            <span class="ico">${icone(item.icone)}</span><span>${item.rotulo}</span></a>`,
    )}
  </nav>`;
}

function painelDaMarca() {
  return html`<aside class="side-panel" aria-hidden="true">
    <div class="eyebrow">BELO HORIZONTE · AGORA</div>
    <div class="display">A CIDADE<br>ACONTECE<br><span class="brush">AGORA.</span></div>
    <p>Veja como os lugares estão, chame sua turma e vote no próximo rolê.</p>
    <div class="sticker-stack">
      <span class="desk-sticker">BORA?</span><span class="desk-sticker">TÔ AQUI</span><span class="desk-sticker">SÓ MAIS UMA</span>
    </div>
  </aside>`;
}

export function montarShell({ navegacao = true } = {}) {
  const ativo = document.body.dataset.nav;
  const shell = $('.shell');
  if (navegacao && shell) {
    shell.insertAdjacentHTML('afterbegin', String(menuLateral(ativo)));
    shell.insertAdjacentHTML('beforeend', String(painelDaMarca()));
    document.body.insertAdjacentHTML('beforeend', String(barraInferior(ativo)));
  }
  document.body.insertAdjacentHTML(
    'beforeend',
    '<div class="toast" role="status" aria-live="polite"></div><div class="fx-layer" aria-hidden="true"></div>',
  );
  ligarEfeitos();
  if (navegacao) atualizarContador();
}

function ligarEfeitos() {
  document.addEventListener('click', (evento) => {
    const alvo = evento.target.closest('.physical, .round-icon, .quick, .filter, .launch-choice, .nav-item, .side-link');
    if (alvo) {
      explosao(alvo, 5);
      const item = alvo.closest('.nav-item');
      if (item) reiniciarAnimacao(item, 'nav-pop');
      const criar = alvo.querySelector('.nav-create');
      if (criar) reiniciarAnimacao(criar, 'create-spin');
    }
    // diálogos: botão [data-fechar] ou clique no fundo escuro
    const fechar = evento.target.closest('[data-fechar]');
    if (fechar) fechar.closest('dialog')?.close();
    if (evento.target instanceof HTMLDialogElement) evento.target.close();

    // voltar: usa o histórico quando a pessoa veio de outra tela do app
    const voltar = evento.target.closest('[data-voltar]');
    if (voltar && history.length > 1 && document.referrer.startsWith(location.origin)) {
      evento.preventDefault();
      history.back();
    }
    if (evento.target.closest('[data-recarregar]')) location.reload();
  });
}

export async function atualizarContador() {
  if (!lerSessao()) return;
  try {
    const total = await notificacoes.naoLidas();
    document.querySelectorAll('[data-contador]').forEach((contador) => {
      contador.textContent = total > 9 ? '9+' : String(total);
      contador.hidden = total === 0;
    });
  } catch {
    // o contador é só um detalhe: se falhar, a página segue normal
  }
}
