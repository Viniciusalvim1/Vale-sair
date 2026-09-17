// Cartão de votação do Chama, usado na tela da turma (enquete.html) e no
// link público (c.html), que funciona mesmo sem conta.
import { html, montar, seguro } from './dom.js';
import { formatarQuando, horaCurta, porcentagem } from './formatos.js';

export const linkDoChama = (codigo) => new URL(`c.html?codigo=${encodeURIComponent(codigo)}`, location.href).href;

export function renderEnquete(alvo, chama, { recemVotada = false } = {}) {
  const total = chama.total_votos;
  const maisVotada = Math.max(0, ...chama.opcoes.map((opcao) => opcao.votos));

  montar(alvo, html`
    <article class="poll-ready">
      <div class="kicker">${chama.turma?.nome ?? 'CHAMA ABERTO'} · ${chama.quando ? formatarQuando(chama.quando) : 'HOJE'}</div>
      <h2>${chama.titulo}</h2>
      <div class="poll-line">
        <span>${total} ${total === 1 ? 'voto' : 'votos'}</span>
        <b>${chama.aberto ? `vota até ${horaCurta(chama.encerra_em)}` : 'votação encerrada'}</b>
      </div>
    </article>
    <div role="group" aria-label="Opções do Chama">
      ${chama.opcoes.map((opcao) => {
        const pct = porcentagem(opcao.votos, total);
        const minha = chama.meu_voto === opcao.id;
        const venceu = !chama.aberto && maisVotada > 0 && opcao.votos === maisVotada;
        return html`<button class="poll-option${minha ? ' selected' : ''}${minha && recemVotada ? ' just-voted' : ''}"
            type="button" data-opcao="${opcao.id}" aria-pressed="${minha}" ${chama.aberto ? '' : seguro('disabled')}>
          <div>
            <strong>${opcao.nome}</strong> <small>${opcao.regiao}</small>${venceu ? html`<span class="mini-tag">VENCEU</span>` : ''}
            <div class="bar"><span style="width:${pct}%"></span></div>
          </div>
          <b>${pct}%</b>
        </button>`;
      })}
    </div>`);
}
