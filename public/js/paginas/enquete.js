// Enquete de um Chama para quem tem conta: vota, acompanha o placar
// (atualiza a cada 8 s) e compartilha o link público de votação.
import { exigirLogin } from '../api/auth.js';
import { chamas } from '../api/dados.js';
import { montarShell } from '../ui/shell.js';
import { html, montar, parametro, $ } from '../ui/dom.js';
import { avisar, tratarErro, explosao } from '../ui/feedback.js';
import { renderEnquete, linkDoChama } from '../ui/enquete.js';
import { vazio, compartilhar } from '../ui/componentes.js';

const codigo = parametro('codigo');

if (exigirLogin()) iniciar();

async function iniciar() {
  montarShell();
  if (!codigo) {
    location.replace('comunidades.html');
    return;
  }
  if (parametro('novo')) montar($('#titulo'), html`CHAMA<br>PRONTO`);
  $('#enquete').addEventListener('click', votar);
  $('#copiar').addEventListener('click', copiar);
  await carregar();
  setInterval(() => {
    if (!document.hidden) carregar();
  }, 8000);
}

async function carregar(recemVotada = false, dados = null) {
  try {
    const chama = dados ?? (await chamas.publico(codigo));
    if (!chama) {
      montar($('#enquete'), vazio('Chama não encontrado', 'Confira o link ou peça outro para quem criou.', {
        href: 'comunidades.html', rotulo: 'VOLTAR PARA AS TURMAS',
      }));
      return;
    }
    renderEnquete($('#enquete'), chama, { recemVotada });
    mostrarCompartilhamento(chama);
  } catch (erro) {
    tratarErro(erro);
  }
}

function mostrarCompartilhamento(chama) {
  const link = linkDoChama(chama.codigo);
  $('#codigo').textContent = `CÓDIGO ${chama.codigo}`;
  $('#linkTexto').textContent = link.replace(/^https?:\/\//, '');
  $('#whatsapp').href = `https://wa.me/?text=${encodeURIComponent(`${chama.titulo} Vota aqui: ${link}`)}`;
  if (chama.turma) {
    $('#acompanhar').href = `turma.html?id=${encodeURIComponent(chama.turma.id)}`;
    $('#acompanhar').hidden = false;
  }
  $('#compartilhamento').hidden = false;
}

async function copiar() {
  const link = linkDoChama(codigo.toUpperCase());
  try {
    await navigator.clipboard.writeText(link);
    avisar('Link do Chama copiado!');
  } catch {
    compartilhar({ titulo: 'Vota no rolê', url: link });
  }
}

async function votar(evento) {
  const botao = evento.target.closest('[data-opcao]');
  if (!botao || botao.disabled) return;
  const opcao = botao.dataset.opcao;
  try {
    await carregar(true, await chamas.votar(codigo, opcao));
    explosao($(`[data-opcao="${opcao}"]`), 10);
    avisar('Voto registrado! Dá para mudar até a votação fechar.');
  } catch (erro) {
    tratarErro(erro);
  }
}
