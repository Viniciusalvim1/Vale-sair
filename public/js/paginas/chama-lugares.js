// Novo Chama: escolhe a Turma e de 2 a 4 lugares; o banco valida tudo de
// novo na RPC criar_chama (quantidade, lugares existentes, participação).
import { exigirLogin } from '../api/auth.js';
import { locais, turmas, chamas } from '../api/dados.js';
import { montarShell } from '../ui/shell.js';
import { html, montar, parametro, $ } from '../ui/dom.js';
import { avisar, tratarErro } from '../ui/feedback.js';
import { rotuloMovimento, rotuloFila, paraBusca } from '../ui/formatos.js';
import { fotoDoLocal, vazio, erroNaTela } from '../ui/componentes.js';

const MINIMO = 2;
const MAXIMO = 4;
const escolhidos = new Set();
let lista = [];

if (exigirLogin()) iniciar();

async function iniciar() {
  montarShell();
  if (parametro('local')) escolhidos.add(parametro('local'));
  $('#busca').addEventListener('input', mostrar);
  $('#lugares').addEventListener('click', alternar);
  $('#formChama').addEventListener('submit', criar);
  try {
    const [todos, minhas] = await Promise.all([locais.emAlta(), turmas.minhas()]);
    lista = todos;
    const seletor = $('#turma');
    seletor.insertAdjacentHTML('beforeend', minhas
      .map((turma) => String(html`<option value="${turma.id}">${turma.nome} · ${turma.membros} ${turma.membros === 1 ? 'pessoa' : 'pessoas'}</option>`))
      .join(''));
    const turmaPedida = parametro('turma');
    if (turmaPedida && minhas.some((turma) => turma.id === turmaPedida)) seletor.value = turmaPedida;
    else if (minhas.length === 1) seletor.value = minhas[0].id;
    mostrar();
  } catch (erro) {
    tratarErro(erro);
    montar($('#lugares'), erroNaTela(erro.message));
  }
}

const descricao = (local) =>
  [local.movimento ? rotuloMovimento(local.movimento).rotulo : 'Sem pulso', rotuloFila(local.fila_minutos), local.regiao]
    .filter(Boolean).join(' · ');

function mostrar() {
  const termo = paraBusca($('#busca').value);
  const visiveis = lista.filter((local) =>
    escolhidos.has(local.id) || !termo || paraBusca(`${local.nome} ${local.regiao} ${local.categoria}`).includes(termo));
  montar($('#lugares'), visiveis.length
    ? visiveis.map((local) => html`<button class="venue-pick" type="button" data-local="${local.id}" aria-pressed="${escolhidos.has(local.id)}">
        <img src="${fotoDoLocal(local)}" alt="" loading="lazy">
        <span><strong>${local.nome}</strong><small>${descricao(local)}</small></span>
        <i class="pick-dot" aria-hidden="true"></i>
      </button>`)
    : vazio('Nada encontrado', 'Tente outro nome ou bairro.'));
  $('#contagem').textContent = `${escolhidos.size} DE ${MAXIMO}`;
}

function alternar(evento) {
  const botao = evento.target.closest('[data-local]');
  if (!botao) return;
  const id = botao.dataset.local;
  if (escolhidos.has(id)) {
    escolhidos.delete(id);
  } else if (escolhidos.size >= MAXIMO) {
    avisar('O Chama aceita até quatro lugares.');
    return;
  } else {
    escolhidos.add(id);
  }
  botao.setAttribute('aria-pressed', String(escolhidos.has(id)));
  $('#contagem').textContent = `${escolhidos.size} DE ${MAXIMO}`;
}

async function criar(evento) {
  evento.preventDefault();
  if (escolhidos.size < MINIMO) {
    avisar('Escolha pelo menos dois lugares.');
    return;
  }
  const botao = $('#criar');
  botao.disabled = true;
  botao.textContent = 'CRIANDO...';
  const quando = $('#quando').value;
  try {
    const chama = await chamas.criar({
      localIds: [...escolhidos],
      turmaId: $('#turma').value,
      titulo: $('#titulo').value.trim(),
      quando: quando ? new Date(quando).toISOString() : null,
      horas: Number($('#horas').value),
    });
    location.assign(`enquete.html?codigo=${encodeURIComponent(chama.codigo)}&novo=1`);
  } catch (erro) {
    tratarErro(erro);
    botao.disabled = false;
    botao.textContent = 'CRIAR ENQUETE';
  }
}
