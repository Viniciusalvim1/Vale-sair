// Retrospectiva: cartão do mês (rolês, lugares novos, região e estilo),
// calculado no banco pela RPC minha_retrospectiva.
import { exigirLogin } from '../api/auth.js';
import { perfil } from '../api/dados.js';
import { montarShell } from '../ui/shell.js';
import { html, montar, $ } from '../ui/dom.js';
import { tratarErro } from '../ui/feedback.js';
import { mesPorExtenso } from '../ui/formatos.js';
import { compartilhar, erroNaTela } from '../ui/componentes.js';

const hoje = new Date();
let mes = new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth(), 1));
let atual = null;
let primeiroNome = '';

const iso = (data) => data.toISOString().slice(0, 10);
const somarMeses = (data, n) => new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth() + n, 1));

if (exigirLogin()) iniciar();

async function iniciar() {
  montarShell();
  $('#anterior').addEventListener('click', () => mudar(-1));
  $('#proximo').addEventListener('click', () => mudar(1));
  $('#compartilhar').addEventListener('click', compartilharCartao);
  try {
    primeiroNome = ((await perfil.meu())?.nome ?? '').split(' ')[0];
  } catch (erro) {
    tratarErro(erro);
  }
  carregar();
}

function mudar(delta) {
  const novo = somarMeses(mes, delta);
  if (novo > hoje) return;
  mes = novo;
  carregar();
}

async function carregar() {
  $('#mesAtual').textContent = `${mesPorExtenso(iso(mes))} ${mes.getUTCFullYear()}`;
  $('#proximo').disabled = somarMeses(mes, 1) > hoje;
  try {
    atual = await perfil.retrospectiva(iso(mes));
    mostrar(atual);
  } catch (erro) {
    tratarErro(erro);
    montar($('#cartao'), erroNaTela(erro.message));
  }
}

function mostrar(retro) {
  montar($('#cartao'), html`<article class="retro-card">
    <div class="kicker">${mesPorExtenso(iso(mes))} · BELO HORIZONTE</div>
    <h2>${primeiroNome || 'VOCÊ'}<br>${retro.roles ? 'VIVEU A CIDADE' : 'FICOU DE BOA'}</h2>
    <div class="retro-grid">
      <div class="retro-stat"><strong>${retro.roles}</strong><span>${retro.roles === 1 ? 'ROLÊ' : 'ROLÊS'}</span></div>
      <div class="retro-stat"><strong>${retro.lugares_novos}</strong><span>LUGARES NOVOS</span></div>
      <div class="retro-stat"><strong>${retro.regiao_favorita ?? '—'}</strong><span>REGIÃO FAVORITA</span></div>
      <div class="retro-stat"><strong>${retro.estilo ?? '—'}</strong><span>ESTILO DO MÊS</span></div>
    </div>
    <div class="retro-sign">VALE SAIR? · MEU MÊS NA RUA · ${retro.pulsos} ${retro.pulsos === 1 ? 'PULSO' : 'PULSOS'}</div>
  </article>`);
  $('#compartilhar').disabled = !retro.roles;
}

function compartilharCartao() {
  if (!atual?.roles) return;
  const nomeDoMes = mesPorExtenso(iso(mes)).toLowerCase();
  compartilhar({
    titulo: 'Meu mês no Vale Sair?',
    texto: `Em ${nomeDoMes} eu fiz ${atual.roles} ${atual.roles === 1 ? 'rolê' : 'rolês'}, conheci `
      + `${atual.lugares_novos} ${atual.lugares_novos === 1 ? 'lugar novo' : 'lugares novos'} e minha região favorita foi `
      + `${atual.regiao_favorita ?? 'BH inteira'}.`,
    url: new URL('index.html', location.href).href,
  });
}
