// Agora: pilha de polaroids (arrasta pro lado, estilo Tinder) com o último
// Pulso de cada lugar, e a lista de todos os lugares.
import { exigirLogin } from '../api/auth.js';
import { locais, pulsos } from '../api/dados.js';
import { montarShell } from '../ui/shell.js';
import { html, montar, icone, $, $$ } from '../ui/dom.js';
import { avisar, tratarErro, reiniciarAnimacao, explosao } from '../ui/feedback.js';
import { rotuloMovimento, tempoRelativo } from '../ui/formatos.js';
import { cardLocal, midiaDoLocal, resumoDoLocal, mascote, vazio, erroNaTela } from '../ui/componentes.js';

const LIMITE_ARRASTE = 90; // px para a polaroid "voar"
const CAMADAS_VISIVEIS = 3;

if (exigirLogin()) iniciar();

async function iniciar() {
  montarShell();
  try {
    const [lista, feed] = await Promise.all([locais.emAlta(), pulsos.ativos().catch(() => [])]);
    // legenda do Pulso mais recente de cada lugar (o feed vem do mais novo)
    const legendas = new Map();
    for (const pulso of feed) if (!legendas.has(pulso.local_id)) legendas.set(pulso.local_id, pulso.legenda);
    const comPulso = lista.filter((local) => local.ultimo_pulso_id);
    mostrarCarrossel(comPulso, legendas);
    montar($('#lista'), lista.length ? lista.map(cardLocal) : vazio('Nada por aqui', 'Nenhum lugar cadastrado ainda.'));
  } catch (erro) {
    tratarErro(erro);
    montar($('#destaque'), erroNaTela(erro.message));
  }
}

const polaroid = (local, i, legenda) => html`
  <article class="pulse-card polaroid" data-i="${i}" aria-label="${local.nome}">
    ${midiaDoLocal(local, 'pulse-photo')}
    <span class="photo-sticker">TÔ<br>AQUI</span>
    <span class="paper-tag tag-bottom">${tempoRelativo(local.ultimo_pulso_em)} ${icone('spark')}</span>
    <span class="carimbo carimbo-bora" aria-hidden="true">BORA!</span>
    <span class="carimbo carimbo-passa" aria-hidden="true">PRÓXIMO</span>
    <p class="polaroid-legenda">${legenda ? `“${legenda}”` : local.nome}</p>
  </article>`;

function mostrarCarrossel(lugares, legendas) {
  if (!lugares.length) {
    montar($('#destaque'), vazio(
      'A noite ainda não começou',
      'Ninguém mostrou nenhum lugar nas últimas 2 horas. Que tal ser a primeira pessoa?',
      { href: 'pulso.html', rotulo: 'POSTAR UM PULSO' },
    ));
    return;
  }

  montar($('#destaque'), html`
    <div class="pilha" tabindex="0" aria-roledescription="carrossel"
         aria-label="Pulsos dos lugares. Arraste para o lado ou use as setas.">
      <span class="paper-tag tag-top">SEM FILTRO</span>
      ${lugares.map((local, i) => polaroid(local, i, legendas.get(local.id)))}
      ${mascote('faisca', 'Faísca, a mascote do Vale Sair?', 'BORA AGORA?')}
    </div>
    <div class="pilha-controles">
      <button class="round-icon" type="button" data-voltar aria-label="Pulso anterior">←</button>
      <span class="pilha-contador" aria-live="polite"></span>
      <button class="round-icon" type="button" data-avancar aria-label="Próximo Pulso">→</button>
    </div>
    <div id="destaque-info"></div>`);

  const pilha = $('.pilha');
  const cartas = $$('.polaroid', pilha);
  const total = cartas.length;
  let atual = 0;
  let ocupado = false;

  function posicionar() {
    cartas.forEach((carta, i) => {
      const pos = (i - atual + total) % total;
      carta.dataset.pos = pos < CAMADAS_VISIVEIS ? pos : 'oculto';
      carta.inert = pos !== 0;
    });
    $('.pilha-contador').textContent = `${atual + 1} / ${total}`;
    mostrarInfo(lugares[atual]);
  }

  // A polaroid do topo sai voando para o lado e a próxima assume.
  function passar(direcao) {
    if (ocupado || total < 2) return;
    ocupado = true;
    const carta = cartas[atual];
    carta.classList.remove('arrastando');
    carta.classList.add('saindo');
    carta.style.transform = `translateX(${direcao * 130}%) rotate(${direcao * 24}deg)`;
    if (direcao > 0) {
      explosao($('.carimbo-bora', carta));
      avisar(`Bora pro ${lugares[atual].nome}? Chama a Turma!`);
    }
    setTimeout(() => {
      carta.classList.remove('saindo');
      carta.style.transform = '';
      atual = (atual + 1) % total;
      posicionar();
      ocupado = false;
    }, 320);
  }

  function voltar() {
    if (ocupado || total < 2) return;
    atual = (atual - 1 + total) % total;
    posicionar();
  }

  // Arrastar com dedo ou mouse
  let inicioX = null;
  let dx = 0;
  pilha.addEventListener('pointerdown', (evento) => {
    const carta = evento.target.closest('.polaroid[data-pos="0"]');
    if (!carta || ocupado) return;
    inicioX = evento.clientX;
    dx = 0;
    carta.setPointerCapture(evento.pointerId);
    carta.classList.add('arrastando');
  });
  pilha.addEventListener('pointermove', (evento) => {
    if (inicioX === null) return;
    dx = evento.clientX - inicioX;
    const carta = cartas[atual];
    carta.style.transform = `translateX(${dx}px) rotate(${dx / 14 - 1}deg)`;
    carta.style.setProperty('--bora', Math.max(0, Math.min(1, dx / LIMITE_ARRASTE)));
    carta.style.setProperty('--passa', Math.max(0, Math.min(1, -dx / LIMITE_ARRASTE)));
  });
  const soltar = () => {
    if (inicioX === null) return;
    inicioX = null;
    const carta = cartas[atual];
    carta.style.removeProperty('--bora');
    carta.style.removeProperty('--passa');
    if (Math.abs(dx) >= LIMITE_ARRASTE) {
      passar(Math.sign(dx));
      return;
    }
    carta.classList.remove('arrastando');
    carta.style.transform = '';
    // toque sem arrastar abre o lugar
    if (Math.abs(dx) < 6) location.href = `local.html?id=${lugares[atual].id}`;
  };
  pilha.addEventListener('pointerup', soltar);
  pilha.addEventListener('pointercancel', () => {
    dx = 0;
    soltar();
  });

  pilha.addEventListener('keydown', (evento) => {
    if (evento.key === 'ArrowRight') passar(-1);
    else if (evento.key === 'ArrowLeft') voltar();
    else return;
    evento.preventDefault();
  });
  $('[data-avancar]').addEventListener('click', () => passar(-1));
  $('[data-voltar]').addEventListener('click', voltar);

  $('[data-mascote="faisca"]').addEventListener('click', (evento) => {
    reiniciarAnimacao(evento.currentTarget, 'do-faisca');
    avisar('Faísca já deu o primeiro passo: bora?');
  });

  posicionar();
}

function mostrarInfo(local) {
  const movimento = rotuloMovimento(local.movimento);
  montar($('#destaque-info'), html`
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
}
