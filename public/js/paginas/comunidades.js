// Comunidades: abas Turmas, Cenas e Salas (carregadas só quando abertas),
// criação de Turma e entrada por código (inclusive pelo link ?convite=).
import { exigirLogin } from '../api/auth.js';
import { turmas, cenas, sala } from '../api/dados.js';
import { montarShell } from '../ui/shell.js';
import { html, montar, icone, parametro, $, $$ } from '../ui/dom.js';
import { tratarErro } from '../ui/feedback.js';
import { tempoRelativo } from '../ui/formatos.js';
import { avatar, vazio, erroNaTela, mostrarAviso } from '../ui/componentes.js';

const ABAS = { turmas: carregarTurmas, cenas: carregarCenas, salas: carregarSalas };
const carregadas = new Set();

if (exigirLogin()) iniciar();

function iniciar() {
  montarShell();
  const convite = parametro('convite');
  $$('[role="tab"]').forEach((aba) => aba.addEventListener('click', () => abrirAba(aba.dataset.aba)));
  $('#novaTurma').addEventListener('click', () => $('#dialogoTurma').showModal());
  $('#comCodigo').addEventListener('click', () => $('#dialogoCodigo').showModal());
  $('#entrarCodigo').addEventListener('click', () => $('#dialogoCodigo').showModal());
  $('#formTurma').addEventListener('submit', criarTurma);
  $('#formCodigo').addEventListener('submit', entrarComCodigo);

  const aba = location.hash.slice(1);
  abrirAba(Object.hasOwn(ABAS, aba) ? aba : 'turmas');
  if (convite) {
    $('#codigoTurma').value = convite.toUpperCase();
    $('#dialogoCodigo').showModal();
  }
}

function abrirAba(nome) {
  $$('[role="tab"]').forEach((aba) => aba.setAttribute('aria-selected', String(aba.dataset.aba === nome)));
  Object.keys(ABAS).forEach((chave) => {
    $(`#painel-${chave}`).hidden = chave !== nome;
  });
  history.replaceState(null, '', `${location.pathname}#${nome}`);
  if (!carregadas.has(nome)) {
    carregadas.add(nome);
    ABAS[nome]();
  }
}

const pessoas = (n) => `${n} ${n === 1 ? 'PESSOA' : 'PESSOAS'}`;

async function carregarTurmas() {
  const alvo = $('#listaTurmas');
  try {
    const lista = await turmas.minhas();
    montar(alvo, lista.length
      ? lista.map(cartaoDaTurma)
      : vazio('Nenhuma Turma ainda', 'Crie uma Turma com seus amigos ou entre com um código de convite.'));
  } catch (erro) {
    tratarErro(erro);
    montar(alvo, erroNaTela(erro.message));
  }
}

function cartaoDaTurma(turma, indice) {
  const status = [
    turma.querem_sair ? `${turma.querem_sair} ${turma.querem_sair === 1 ? 'quer' : 'querem'} sair hoje.` : null,
    turma.chama_aberto ? 'Enquete aberta para decidir o lugar.' : 'Nenhuma enquete aberta.',
  ].filter(Boolean).join(' ');
  return html`<a class="community-card${indice === 0 ? ' blue' : ''}" href="turma.html?id=${turma.id}">
    <span class="count">${pessoas(turma.membros)}</span>
    ${icone('users')}
    <h2>${turma.nome}</h2>
    <p>${status}</p>
    <div class="members">
      ${turma.primeiros_membros.slice(0, 3).map((nome) => avatar(nome))}
      ${turma.membros > 3 ? html`<span>+${turma.membros - 3}</span>` : ''}
    </div>
  </a>`;
}

async function carregarCenas() {
  const alvo = $('#listaCenas');
  try {
    const lista = await cenas.todas();
    montar(alvo, lista.map((cena) => html`<a class="community-card ${cena.cor}" href="cena.html?slug=${cena.slug}">
      <span class="count">${pessoas(cena.membros)}</span>
      ${icone('music')}
      <h2>${cena.nome}</h2>
      <p>${cena.descricao}</p>
      ${cena.participo ? html`<div class="members"><span class="mini-tag">VOCÊ PARTICIPA</span></div>` : ''}
    </a>`));
  } catch (erro) {
    tratarErro(erro);
    montar(alvo, erroNaTela(erro.message));
  }
}

async function carregarSalas() {
  const alvo = $('#listaSalas');
  try {
    const lista = await sala.ativas();
    montar(alvo, lista.map((item, indice) => {
      const recentes = item.mensagens_recentes;
      const texto = recentes
        ? `${recentes} ${recentes === 1 ? 'mensagem' : 'mensagens'} nas últimas 3 horas.`
        : 'Sala quieta. Puxe o assunto!';
      return html`<a class="community-card${indice === 0 ? ' blue' : ''}" href="local.html?id=${item.id}#chat">
        <span class="count">${item.pessoas_agora} AGORA</span>
        ${icone('pin')}
        <h2>SALA ${item.nome}</h2>
        <p>${texto}${item.ultima_mensagem_em ? ` Última ${tempoRelativo(item.ultima_mensagem_em)}.` : ''}</p>
      </a>`;
    }));
  } catch (erro) {
    tratarErro(erro);
    montar(alvo, erroNaTela(erro.message));
  }
}

async function criarTurma(evento) {
  evento.preventDefault();
  const form = evento.currentTarget;
  const aviso = form.querySelector('.aviso');
  const botao = form.querySelector('[type="submit"]');
  const nome = $('#nomeTurma').value.trim();
  if (nome.length < 2) {
    mostrarAviso(aviso, 'Dê um nome com pelo menos 2 letras.');
    return;
  }
  botao.disabled = true;
  try {
    const turma = await turmas.criar(nome, $('#descricaoTurma').value.trim());
    location.assign(`turma.html?id=${encodeURIComponent(turma.id)}&nova=1`);
  } catch (erro) {
    mostrarAviso(aviso, erro.message);
    botao.disabled = false;
  }
}

async function entrarComCodigo(evento) {
  evento.preventDefault();
  const form = evento.currentTarget;
  const aviso = form.querySelector('.aviso');
  const botao = form.querySelector('[type="submit"]');
  const codigo = $('#codigoTurma').value.trim();
  if (!codigo) {
    mostrarAviso(aviso, 'Digite o código que te mandaram.');
    return;
  }
  botao.disabled = true;
  try {
    const turma = await turmas.entrar(codigo);
    location.assign(`turma.html?id=${encodeURIComponent(turma.id)}`);
  } catch (erro) {
    mostrarAviso(aviso, erro.message);
    botao.disabled = false;
  }
}
