// Votação pública pelo link (c.html?codigo=...): funciona sem conta.
// Quem não entrou recebe um identificador guardado no navegador, e o banco
// garante um voto por Chama para cada identificador (trocar de ideia pode).
import { chamas } from '../api/dados.js';
import { lerSessao } from '../api/sessao.js';
import { montarShell } from '../ui/shell.js';
import { montar, parametro, $ } from '../ui/dom.js';
import { avisar, tratarErro, explosao } from '../ui/feedback.js';
import { renderEnquete } from '../ui/enquete.js';
import { vazio } from '../ui/componentes.js';

const codigo = parametro('codigo');
const logado = Boolean(lerSessao());
let convidadoId = null;

montarShell({ navegacao: false });
iniciar();

function identificarConvidado() {
  try {
    convidadoId = localStorage.getItem('vs-convidado');
    if (!convidadoId) {
      convidadoId = crypto.randomUUID();
      localStorage.setItem('vs-convidado', convidadoId);
    }
    $('#nomeConvidado').value = localStorage.getItem('vs-convidado-nome') ?? '';
  } catch {
    convidadoId = crypto.randomUUID();
  }
  $('#campoNome').hidden = false;
}

async function iniciar() {
  if (!codigo) {
    montar($('#enquete'), vazio('Link incompleto', 'Peça o link do Chama de novo para quem te chamou.'));
    return;
  }
  if (!logado) identificarConvidado();
  $('#enquete').addEventListener('click', votar);
  await carregar();
  setInterval(() => {
    if (!document.hidden) carregar();
  }, 10000);
}

async function carregar(recemVotada = false, dados = null) {
  try {
    const chama = dados ?? (await chamas.publico(codigo, convidadoId));
    if (!chama) {
      montar($('#enquete'), vazio('Chama não encontrado', 'Esse link não existe mais. Peça outro para quem te chamou.'));
      return;
    }
    $('#convite').textContent = `${chama.criador.nome} te chamou${chama.turma ? ` · ${chama.turma.nome}` : ''}`;
    renderEnquete($('#enquete'), chama, { recemVotada });
  } catch (erro) {
    tratarErro(erro);
  }
}

async function votar(evento) {
  const botao = evento.target.closest('[data-opcao]');
  if (!botao || botao.disabled) return;
  const opcao = botao.dataset.opcao;
  const nome = $('#nomeConvidado').value.trim();
  try {
    if (!logado && nome) localStorage.setItem('vs-convidado-nome', nome);
    const chama = await chamas.votar(codigo, opcao, logado ? null : { id: convidadoId, nome: nome || null });
    await carregar(true, chama);
    explosao($(`[data-opcao="${opcao}"]`), 10);
    avisar('Voto registrado! Dá para mudar até a votação fechar.');
  } catch (erro) {
    tratarErro(erro);
  }
}
