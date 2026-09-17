// Agora: o lugar com o Pulso mais recente em destaque e a lista dos demais.
import { exigirLogin } from '../api/auth.js';
import { locais } from '../api/dados.js';
import { montarShell } from '../ui/shell.js';
import { html, montar, icone, $ } from '../ui/dom.js';
import { avisar, tratarErro, reiniciarAnimacao } from '../ui/feedback.js';
import { rotuloMovimento, tempoRelativo } from '../ui/formatos.js';
import { cardLocal, midiaDoLocal, resumoDoLocal, mascote, vazio, erroNaTela } from '../ui/componentes.js';

if (exigirLogin()) iniciar();

async function iniciar() {
  montarShell();
  try {
    const lista = await locais.emAlta();
    const destaque = lista.find((local) => local.ultimo_pulso_id) ?? null;
    mostrarDestaque(destaque);
    const outros = lista.filter((local) => local !== destaque);
    montar($('#lista'), outros.length ? outros.map(cardLocal) : vazio('Só esse por enquanto', 'Nenhum outro lugar cadastrado ainda.'));
  } catch (erro) {
    tratarErro(erro);
    montar($('#destaque'), erroNaTela(erro.message));
  }
}

function mostrarDestaque(local) {
  if (!local) {
    montar($('#destaque'), vazio(
      'A noite ainda não começou',
      'Ninguém mostrou nenhum lugar nas últimas 2 horas. Que tal ser a primeira pessoa?',
      { href: 'pulso.html', rotulo: 'POSTAR UM PULSO' },
    ));
    return;
  }
  const movimento = rotuloMovimento(local.movimento);
  montar($('#destaque'), html`
    <article class="pulse-card">
      <span class="paper-tag tag-top">SEM FILTRO</span>
      ${midiaDoLocal(local, 'pulse-photo')}
      <span class="photo-sticker">TÔ<br>AQUI</span>
      <span class="paper-tag tag-bottom">${tempoRelativo(local.ultimo_pulso_em)} ${icone('spark')}</span>
      ${mascote('faisca', 'Faísca, a mascote do Vale Sair?', 'BORA AGORA?')}
    </article>
    <div class="venue-row">
      <div class="venue">
        <h2><a href="local.html?id=${local.id}">${local.nome}</a></h2>
        <p>${resumoDoLocal(local)}</p>
      </div>
      <div class="live-badge ${local.movimento}">${movimento.rotulo}</div>
    </div>
    <div class="button-row">
      <a class="physical" href="aovivo.html?local=${local.id}">FEED AO VIVO</a>
      <a class="physical blue" href="local.html?id=${local.id}">VER LOCAL</a>
    </div>`);

  $('[data-mascote="faisca"]').addEventListener('click', (evento) => {
    reiniciarAnimacao(evento.currentTarget, 'do-faisca');
    avisar('Faísca já deu o primeiro passo: bora?');
  });
}
