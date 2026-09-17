// Cena: ranking dos lugares do estilo (últimos 30 dias) e participação.
import { exigirLogin } from '../api/auth.js';
import { cenas } from '../api/dados.js';
import { montarShell } from '../ui/shell.js';
import { html, montar, icone, parametro, $ } from '../ui/dom.js';
import { avisar, tratarErro, explosao } from '../ui/feedback.js';
import { vazio, erroNaTela } from '../ui/componentes.js';

const slug = parametro('slug');

if (exigirLogin()) iniciar();

async function iniciar() {
  montarShell();
  if (!slug) {
    location.replace('comunidades.html#cenas');
    return;
  }
  try {
    const [cena, ranking] = await Promise.all([cenas.porSlug(slug), cenas.ranking(slug)]);
    if (!cena) {
      montar($('#tela'), vazio('Cena não encontrada', 'Confira o link ou veja as cenas abertas.', {
        href: 'comunidades.html#cenas', rotulo: 'VER CENAS',
      }));
      return;
    }
    mostrar(cena, ranking);
  } catch (erro) {
    tratarErro(erro);
    montar($('#tela'), erroNaTela(erro.message));
  }
}

const participantes = (n) => `${n} ${n === 1 ? 'pessoa' : 'pessoas'} na cena`;

function mostrar(cena, ranking) {
  document.title = `${cena.nome} · Vale Sair?`;
  montar($('#tela'), html`
    <div class="flow-head">
      <a class="back" href="comunidades.html#cenas" data-voltar aria-label="Voltar">${icone('chevron')}</a>
      <div><div class="kicker">CENA ABERTA · BELO HORIZONTE</div></div>
    </div>
    <header class="scene-header ${cena.cor}">
      ${icone('music')}
      <h1>${cena.nome}</h1>
      <p>${cena.descricao}</p>
      <p id="participantes">${participantes(cena.membros)}</p>
      <button class="physical${cena.participo ? '' : ' lime'} full" type="button" id="participar" aria-pressed="${cena.participo}">
        ${cena.participo ? 'SAIR DA CENA' : 'ENTRAR NA CENA'}</button>
    </header>
    <h2 class="titulo-secao">EM ALTA NA CENA</h2>
    ${ranking.length
      ? html`<div class="rank-list">${ranking.map((item) => html`<a class="rank-row" href="local.html?id=${item.local_id}">
          <b>${item.posicao}</b><strong>${item.nome}</strong>
          <span>${item.pulsos_30d} ${item.pulsos_30d === 1 ? 'PULSO' : 'PULSOS'}</span></a>`)}</div>`
      : vazio('Cena sem lugares', 'Ainda não há lugares ligados a este estilo.')}
    <a class="physical blue full" href="aovivo.html?cena=${cena.slug}">VER PULSOS DA CENA</a>`);

  $('#participar').addEventListener('click', (evento) => alternar(evento.currentTarget, cena));
}

async function alternar(botao, cena) {
  botao.disabled = true;
  try {
    await (cena.participo ? cenas.sair(cena.id) : cenas.entrar(cena.id));
    cena.participo = !cena.participo;
    cena.membros += cena.participo ? 1 : -1;
    botao.textContent = cena.participo ? 'SAIR DA CENA' : 'ENTRAR NA CENA';
    botao.classList.toggle('lime', !cena.participo);
    botao.setAttribute('aria-pressed', String(cena.participo));
    $('#participantes').textContent = participantes(cena.membros);
    if (cena.participo) explosao(botao, 10);
    avisar(cena.participo ? `Você agora participa da cena ${cena.nome}.` : `Você saiu da cena ${cena.nome}.`);
  } catch (erro) {
    tratarErro(erro);
  } finally {
    botao.disabled = false;
  }
}
