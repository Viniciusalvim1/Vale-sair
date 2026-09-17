// Salvos: lugares guardados pela pessoa, com a situação atual de cada um.
import { exigirLogin } from '../api/auth.js';
import { salvos, locais } from '../api/dados.js';
import { montarShell } from '../ui/shell.js';
import { html, montar, icone, $ } from '../ui/dom.js';
import { avisar, tratarErro } from '../ui/feedback.js';
import { rotuloMovimento, tempoRelativo, paraBusca } from '../ui/formatos.js';
import { fotoDoLocal, linhaDeStatus, vazio, erroNaTela } from '../ui/componentes.js';

let itens = [];

if (exigirLogin()) iniciar();

async function iniciar() {
  montarShell();
  $('#busca').addEventListener('input', mostrar);
  $('#lista').addEventListener('click', remover);
  try {
    const meus = await salvos.meus();
    const detalhes = new Map((await locais.porIds(meus.map((s) => s.local_id))).map((local) => [local.id, local]));
    itens = meus
      .filter((salvo) => detalhes.has(salvo.local_id))
      .map((salvo) => ({ ...detalhes.get(salvo.local_id), salvo_em: salvo.created_at }));
    mostrar();
  } catch (erro) {
    tratarErro(erro);
    montar($('#lista'), erroNaTela(erro.message));
  }
}

const cartao = (local) => html`<article class="saved-card" data-local="${local.id}">
  <img src="${fotoDoLocal(local)}" alt="" loading="lazy">
  <div>
    <span class="mini-tag">${local.movimento ? rotuloMovimento(local.movimento).rotulo : `SALVO ${tempoRelativo(local.salvo_em)}`}</span>
    <h3><a href="local.html?id=${local.id}">${local.nome}</a></h3>
    <p>${local.categoria} · ${local.regiao}<br>${linhaDeStatus(local)}</p>
  </div>
  <button class="close" type="button" data-remover aria-label="Remover ${local.nome} dos salvos">${icone('trash')}</button>
</article>`;

function mostrar() {
  if (!itens.length) {
    montar($('#lista'), vazio(
      'Nada salvo ainda',
      'Toque no coração de um lugar para guardar e ser avisado quando ele encher.',
      { href: 'radar.html', rotulo: 'ABRIR O RADAR' },
    ));
    return;
  }
  const termo = paraBusca($('#busca').value);
  const visiveis = itens.filter((local) => !termo || paraBusca(`${local.nome} ${local.regiao} ${local.categoria}`).includes(termo));
  montar($('#lista'), visiveis.length ? visiveis.map(cartao) : vazio('Nada encontrado', 'Tente outro nome ou bairro.'));
}

async function remover(evento) {
  const botao = evento.target.closest('[data-remover]');
  if (!botao) return;
  const id = botao.closest('[data-local]').dataset.local;
  botao.disabled = true;
  try {
    await salvos.remover(id);
    itens = itens.filter((local) => local.id !== id);
    mostrar();
    avisar('Removido dos salvos.');
  } catch (erro) {
    botao.disabled = false;
    tratarErro(erro);
  }
}
