// Novo Pulso: escolhe o lugar, fotografa ou grava (até 7 s), diz como está
// e publica. A mídia sobe para o Storage antes do registro no banco.
import { exigirLogin } from '../api/auth.js';
import { locais, pulsos, presenca } from '../api/dados.js';
import { montarShell } from '../ui/shell.js';
import { html, parametro, $, $$ } from '../ui/dom.js';
import { avisar, tratarErro, explosao, reiniciarAnimacao } from '../ui/feedback.js';

const LIMITE_MB = 15;
const LIMITE_SEGUNDOS = 7.5;
let arquivo = null;
let urlDaPrevia = null;

if (exigirLogin()) iniciar();

async function iniciar() {
  montarShell();
  ligar();
  try {
    const [lista, checkin] = await Promise.all([locais.emAlta(), presenca.meuCheckinAtivo()]);
    const opcoes = lista
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      .map((local) => String(html`<option value="${local.id}">${local.nome} · ${local.regiao}</option>`));
    $('#local').insertAdjacentHTML('beforeend', opcoes.join(''));
    $('#local').value = parametro('local') ?? checkin?.local_id ?? '';
    atualizarEtiqueta();
  } catch (erro) {
    tratarErro(erro);
  }
}

function ligar() {
  $('#local').addEventListener('change', atualizarEtiqueta);
  $$('[data-movimento]').forEach((botao) => botao.addEventListener('click', () => escolher(botao, '[data-movimento]')));
  $$('[data-fila]').forEach((botao) => botao.addEventListener('click', () => escolher(botao, '[data-fila]', true)));
  $('#arquivo').addEventListener('change', escolherArquivo);
  $('.record-button').addEventListener('click', (evento) => reiniciarAnimacao(evento.currentTarget, 'recording'));
  $('#formPulso').addEventListener('submit', publicar);
}

// Movimento é obrigatório; a fila pode ser desmarcada tocando de novo.
function escolher(botao, grupo, podeDesmarcar = false) {
  const jaEstava = botao.getAttribute('aria-pressed') === 'true';
  $$(grupo).forEach((outro) => outro.setAttribute('aria-pressed', 'false'));
  if (!(jaEstava && podeDesmarcar)) botao.setAttribute('aria-pressed', 'true');
}

function atualizarEtiqueta() {
  const opcao = $('#local').selectedOptions[0];
  $('#tagLocal').textContent = opcao?.value ? opcao.textContent.split(' · ')[0] : 'ESCOLHA O LUGAR';
}

function duracaoDoVideo(video) {
  return new Promise((resolve, reject) => {
    const elemento = document.createElement('video');
    elemento.preload = 'metadata';
    elemento.onloadedmetadata = () => {
      URL.revokeObjectURL(elemento.src);
      resolve(elemento.duration);
    };
    elemento.onerror = () => reject(new Error('Não deu para ler esse vídeo. Tente gravar de novo.'));
    elemento.src = URL.createObjectURL(video);
  });
}

async function escolherArquivo(evento) {
  const escolhido = evento.target.files[0];
  if (!escolhido) return;
  try {
    if (!/^(image|video)\//.test(escolhido.type)) throw new Error('Escolha uma foto ou um vídeo.');
    if (escolhido.size > LIMITE_MB * 1024 * 1024) throw new Error(`O arquivo passa de ${LIMITE_MB} MB. Grave um vídeo mais curto.`);
    const video = escolhido.type.startsWith('video/');
    if (video) {
      const segundos = await duracaoDoVideo(escolhido);
      if (segundos > LIMITE_SEGUNDOS) throw new Error(`O vídeo tem ${Math.round(segundos)} segundos. O Pulso aceita até 7.`);
    }
    arquivo = escolhido;
    mostrarPrevia(escolhido, video);
    $('#infoArquivo').textContent = `${video ? 'Vídeo' : 'Foto'} pronto para publicar, do jeito que está.`;
  } catch (erro) {
    evento.target.value = '';
    avisar(erro.message);
  }
}

function mostrarPrevia(escolhido, video) {
  if (urlDaPrevia) URL.revokeObjectURL(urlDaPrevia);
  urlDaPrevia = URL.createObjectURL(escolhido);
  const palco = $('#palco');
  palco.querySelector(':scope > img, :scope > video')?.remove();
  $('#cameraVazia').hidden = true;
  const elemento = document.createElement(video ? 'video' : 'img');
  elemento.src = urlDaPrevia;
  if (video) {
    Object.assign(elemento, { muted: true, loop: true, playsInline: true, autoplay: true });
  } else {
    elemento.alt = 'Prévia do Pulso';
  }
  palco.prepend(elemento);
  if (video) elemento.play().catch(() => {});
}

async function publicar(evento) {
  evento.preventDefault();
  const localId = $('#local').value;
  const movimento = $('[data-movimento][aria-pressed="true"]')?.dataset.movimento;
  const fila = $('[data-fila][aria-pressed="true"]')?.dataset.fila;
  if (!localId) {
    avisar('Escolha onde você está.');
    $('#local').focus();
    return;
  }
  if (!movimento) {
    avisar('Diga como está o movimento.');
    return;
  }

  const botao = $('#publicar');
  botao.disabled = true;
  botao.textContent = arquivo ? 'ENVIANDO...' : 'PUBLICANDO...';
  try {
    await pulsos.publicar({
      localId,
      movimento,
      filaMinutos: fila === undefined ? null : Number(fila),
      legenda: $('#legenda').value.trim(),
      arquivo,
    });
    explosao(botao, 12);
    avisar('Pulso publicado! Ele vale por 2 horas.');
    setTimeout(() => location.assign(`aovivo.html?local=${encodeURIComponent(localId)}`), 700);
  } catch (erro) {
    tratarErro(erro);
    botao.disabled = false;
    botao.textContent = 'PUBLICAR PULSO';
  }
}
