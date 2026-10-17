// Lugar: situação atual, ações (salvar, confirmar, tô aqui) e a Sala (chat),
// que busca mensagens novas a cada 5 segundos enquanto a aba está aberta.
import { exigirLogin } from '../api/auth.js';
import { locais, pulsos, salvos, presenca, sala } from '../api/dados.js';
import { usuarioAtual } from '../api/sessao.js';
import { montarShell } from '../ui/shell.js';
import { html, montar, icone, seguro, urlSegura, parametro, $ } from '../ui/dom.js';
import { avisar, tratarErro, explosao, reiniciarAnimacao } from '../ui/feedback.js';
import {
  rotuloMovimento, rotuloFila, tempoRelativo, horario, faixaPreco, iniciais, distanciaKm, formatarDistancia,
} from '../ui/formatos.js';
import { midiaDoLocal, mascote, vazio, erroNaTela, compartilhar } from '../ui/componentes.js';
import { DISTANCIA_CONFORTAVEL, prepararStreetView } from '../ui/mapa.js';

const localId = parametro('id');
const eu = usuarioAtual();
const CONFIANCA = { alta: 'ALTA', media: 'MÉDIA', baixa: 'BAIXA' };
let ultimoPulso = null;
let checkin = null;
let ultimaMensagem = 0;
let buscando = false;
let buscarDeNovo = false;
let panoramaStreetView = null;
let avisoStreetView = '';

if (exigirLogin()) iniciar();

async function iniciar() {
  montarShell();
  if (!localId) {
    location.replace('agora.html');
    return;
  }
  try {
    const [local, feed, salvo, meuCheckin, mensagens] = await Promise.all([
      locais.porId(localId),
      pulsos.ativos({ localId }),
      salvos.estaSalvo(localId),
      presenca.meuCheckinAtivo(),
      sala.recentes(localId),
    ]);
    if (!local) {
      montar($('#tela'), vazio('Lugar não encontrado', 'Esse endereço não leva a nenhum lugar do Vale Sair?.', {
        href: 'agora.html', rotulo: 'VOLTAR PARA O AGORA',
      }));
      return;
    }
    document.title = `${local.nome} · Vale Sair?`;
    ultimoPulso = feed[0] ?? null;
    checkin = meuCheckin;
    mostrar(local, salvo);
    adicionarMensagens(mensagens, false);
    ligar(local);
    mostrarDistancia(local);
    setInterval(buscarNovas, 5000);
    document.addEventListener('visibilitychange', buscarNovas);
    if (location.hash === '#chat') $('#chat').scrollIntoView();
    if (location.hash === '#street-view') abrirStreetView(local);
  } catch (erro) {
    tratarErro(erro);
    montar($('#tela'), erroNaTela(erro.message));
  }
}

function mostrar(local, salvo) {
  const movimento = rotuloMovimento(local.movimento);
  const confianca = CONFIANCA[local.confianca];
  const podeConfirmar = ultimoPulso && !ultimoPulso.confirmei && ultimoPulso.autor_id !== eu.id;
  const detalhes = [
    local.fecha_as && `Até ${horario(local.fecha_as)}`,
    faixaPreco(local.faixa_preco),
    local.musica_ao_vivo ? 'Música ao vivo' : local.genero_principal,
  ].filter(Boolean).join(' · ');
  const links = [
    ['INSTAGRAM', local.instagram && `https://instagram.com/${local.instagram.replace(/^@/, '')}`],
    ['TIKTOK', local.tiktok && `https://www.tiktok.com/@${local.tiktok.replace(/^@/, '')}`],
    ['CARDÁPIO', local.cardapio_url],
  ].map(([rotulo, url]) => [rotulo, urlSegura(url)]).filter(([, url]) => url);

  montar($('#tela'), html`
    <div class="detail-hero">
      <a class="detail-back" href="agora.html" data-voltar aria-label="Voltar">${icone('chevron')}</a>
      <div class="detail-tools">
        <button type="button" id="salvar" class="${salvo ? 'saved' : ''}" aria-pressed="${salvo}" aria-label="Salvar lugar">${icone('heart')}</button>
        <button type="button" id="compartilhar" aria-label="Compartilhar lugar">${icone('share')}</button>
      </div>
      ${midiaDoLocal(local)}
      <span class="detail-label">${movimento.etiqueta} ${icone(movimento.icone)}</span>
    </div>

    <div class="place-title">
      <div>
        <div class="kicker">${local.categoria} · ${local.regiao}<span id="distancia"></span></div>
        <h1>${local.nome}</h1>
        <p>${detalhes}</p>
      </div>
      <div class="trust${confianca ? '' : ' sem'}">
        <strong>${confianca ?? '—'}</strong>confiança<br>${local.ultimo_pulso_em ? tempoRelativo(local.ultimo_pulso_em) : 'sem pulso'}
      </div>
    </div>

    <div class="quick-actions">
      <a class="quick" href="https://www.google.com/maps/dir/?api=1&amp;destination=${local.latitude},${local.longitude}" target="_blank" rel="noopener">${icone('route')}ROTA</a>
      <a class="quick" href="aovivo.html?local=${local.id}">${icone('play')}AO VIVO</a>
      <button class="quick" type="button" id="streetView">${icone('camera')}STREET VIEW</button>
      <button class="quick${ultimoPulso?.confirmei ? ' is-on' : ''}" type="button" id="confirmar" ${podeConfirmar ? '' : seguro('disabled')}
        title="Confirmar que o último Pulso continua valendo">${icone('check')}${ultimoPulso?.confirmei ? 'CONFIRMADO' : 'CONFIRMAR'}</button>
      <a class="quick" href="chama-lugares.html?local=${local.id}">${icone('users')}CHAMAR</a>
    </div>

    <div class="live-summary">
      <div class="live-stat"><strong>${movimento.rotulo}</strong><span>MOVIMENTO</span></div>
      <div class="live-stat"><strong>${rotuloFila(local.fila_minutos)?.replace('FILA ', '') ?? '—'}</strong><span>FILA</span></div>
      <div class="live-stat"><strong>${local.genero_agora ?? '—'}</strong><span>AGORA</span></div>
    </div>

    <div class="button-row">
      <button class="physical lime" type="button" id="toAqui">${checkin?.local_id === local.id ? 'SAIR DAQUI' : 'TÔ AQUI'}</button>
      <a class="physical blue" href="pulso.html?local=${local.id}">POSTAR PULSO</a>
    </div>

    <article class="about">
      <h2>SOBRE O LUGAR</h2>
      <p>${local.descricao ?? 'Sem descrição ainda.'}</p>
      <p class="kicker endereco">${icone('pin')} ${local.endereco}</p>
      ${links.length ? html`<div class="socials">${links.map(([rotulo, url]) => html`<a href="${url}" target="_blank" rel="noopener">${rotulo} ↗</a>`)}</div>` : ''}
    </article>

    <section class="chat" id="chat" aria-labelledby="tituloSala">
      ${mascote('papo', 'Papo, o mascote da Sala', 'FOFOCA FRESCA!')}
      <h2 id="tituloSala">SALA DO ROLÊ</h2>
      <p class="chat-sub">${local.pessoas_agora} ${local.pessoas_agora === 1 ? 'pessoa' : 'pessoas'} por aqui agora · atualiza sozinho</p>
      <div class="chat-lista" id="mensagens" aria-live="polite"></div>
      <form class="chat-form" id="chatForm">
        <input id="chatInput" maxlength="280" autocomplete="off" aria-label="Mensagem para a Sala" placeholder="Pergunte ao pessoal...">
        <button type="submit" aria-label="Enviar mensagem">${icone('send')}</button>
      </form>
    </section>`);
}

function mensagemHtml(mensagem, nova) {
  const minha = mensagem.autor_id === eu.id;
  return html`<div class="message${mensagem.oficial ? ' official' : ''}${minha ? ' minha' : ''}${nova ? ' new-note' : ''}">
    <span class="message-avatar" aria-hidden="true">${mensagem.oficial ? '★' : iniciais(mensagem.autor_nome)}</span>
    <div class="bubble">
      <small>${minha ? 'Você' : mensagem.autor_nome}${mensagem.oficial ? ' · oficial' : ''} · ${tempoRelativo(mensagem.created_at)}</small>${mensagem.conteudo}
    </div>
  </div>`;
}

function adicionarMensagens(lista, novas = true) {
  const caixa = $('#mensagens');
  const ineditas = lista.filter((mensagem) => mensagem.id > ultimaMensagem);
  if (!novas && !ineditas.length) {
    montar(caixa, html`<p class="chat-sub" id="salaVazia">Ninguém falou nada ainda. Pergunte sobre fila, música ou movimento.</p>`);
    return;
  }
  if (!ineditas.length) return;
  $('#salaVazia')?.remove();
  const estavaNoFim = caixa.scrollHeight - caixa.scrollTop - caixa.clientHeight < 80;
  caixa.insertAdjacentHTML('beforeend', ineditas.map((mensagem) => String(mensagemHtml(mensagem, novas))).join(''));
  ultimaMensagem = ineditas.at(-1).id;
  if (estavaNoFim || !novas) caixa.scrollTop = caixa.scrollHeight;
}

async function buscarNovas() {
  if (document.hidden) return;
  if (buscando) {
    buscarDeNovo = true;
    return;
  }
  buscando = true;
  try {
    adicionarMensagens(await sala.novas(localId, ultimaMensagem));
  } catch {
    // sem rede por um instante: tenta de novo no próximo ciclo
  } finally {
    buscando = false;
    if (buscarDeNovo) {
      buscarDeNovo = false;
      buscarNovas();
    }
  }
}

function ligar(local) {
  $('#salvar').addEventListener('click', async (evento) => {
    const botao = evento.currentTarget;
    const salvar = !botao.classList.contains('saved');
    botao.disabled = true;
    try {
      await (salvar ? salvos.salvar(local.id) : salvos.remover(local.id));
      botao.classList.toggle('saved', salvar);
      botao.setAttribute('aria-pressed', String(salvar));
      if (salvar) explosao(botao, 9);
      avisar(salvar ? `${local.nome} salvo. Avisamos quando encher.` : `${local.nome} saiu dos salvos.`);
    } catch (erro) {
      tratarErro(erro);
    } finally {
      botao.disabled = false;
    }
  });

  $('#compartilhar').addEventListener('click', () =>
    compartilhar({ titulo: local.nome, texto: `Olha como está o ${local.nome} agora:`, url: location.href }));

  $('#streetView').addEventListener('click', () => abrirStreetView(local));
  $('#streetViewDialog').addEventListener('close', () => panoramaStreetView?.setVisible(false));

  $('#confirmar').addEventListener('click', async (evento) => {
    const botao = evento.currentTarget;
    botao.disabled = true;
    try {
      await pulsos.confirmar(ultimoPulso.id);
      botao.classList.add('is-on');
      montar(botao, html`${icone('check')}CONFIRMADO`);
      explosao(botao, 8);
      avisar('Valeu! Você confirmou que continua assim.');
    } catch (erro) {
      botao.disabled = false;
      tratarErro(erro);
    }
  });

  $('#toAqui').addEventListener('click', async (evento) => {
    const botao = evento.currentTarget;
    botao.disabled = true;
    try {
      if (checkin?.local_id === local.id) {
        await presenca.sairDoLocal(checkin.id);
        checkin = null;
        botao.textContent = 'TÔ AQUI';
        avisar('Check-in desfeito. Até a próxima!');
      } else {
        await presenca.toAqui(local.id);
        checkin = await presenca.meuCheckinAtivo();
        botao.textContent = 'SAIR DAQUI';
        explosao(botao, 10);
        avisar('Check-in feito! Ele vale por 3 horas.');
      }
    } catch (erro) {
      tratarErro(erro);
    } finally {
      botao.disabled = false;
    }
  });

  $('#chatForm').addEventListener('submit', enviarMensagem);
  $('[data-mascote="papo"]').addEventListener('click', falarPapo);
}

async function abrirStreetView(local) {
  const dialogo = $('#streetViewDialog');
  const canvas = $('#streetViewCanvas');
  const estado = $('#streetViewEstado');
  $('#streetViewTitulo').textContent = local.nome;
  dialogo.showModal();

  if (panoramaStreetView) {
    canvas.hidden = false;
    estado.hidden = !avisoStreetView;
    panoramaStreetView.setVisible(true);
    return;
  }

  estado.hidden = false;
  estado.classList.remove('nota');
  estado.textContent = 'PROCURANDO STREET VIEW...';
  canvas.hidden = false;
  canvas.setAttribute('aria-busy', 'true');
  try {
    const visao = await prepararStreetView(canvas, {
      lat: Number(local.latitude),
      lng: Number(local.longitude),
    });
    panoramaStreetView = visao.panorama;
    // A imagem de rua mais próxima nem sempre é a porta: no Mercado Central o
    // carro do Google passou a 67 m. Melhor dizer do que deixar a pessoa achar
    // que está olhando a fachada errada.
    avisoStreetView = visao.metros > DISTANCIA_CONFORTAVEL
      ? `IMAGEM DE RUA MAIS PRÓXIMA: ${visao.metros} M DAQUI`
      : '';
    estado.classList.add('nota');
    estado.textContent = avisoStreetView;
    estado.hidden = !avisoStreetView;
  } catch (erro) {
    canvas.hidden = true;
    montar(estado, html`${erro.message}
      <a href="https://www.google.com/maps/@?api=1&amp;map_action=pano&amp;viewpoint=${local.latitude},${local.longitude}"
        target="_blank" rel="noopener">ABRIR NO GOOGLE MAPS ↗</a>`);
  } finally {
    canvas.removeAttribute('aria-busy');
  }
}

async function enviarMensagem(evento) {
  evento.preventDefault();
  const campo = $('#chatInput');
  const texto = campo.value.trim();
  if (!texto) return;
  const botao = evento.currentTarget.querySelector('button');
  campo.value = '';
  reiniciarAnimacao(botao, 'sending');
  explosao(botao, 8);
  try {
    await sala.enviar(localId, texto);
    await buscarNovas();
  } catch (erro) {
    campo.value = texto;
    tratarErro(erro);
  }
}

function falarPapo(evento) {
  reiniciarAnimacao(evento.currentTarget, 'do-papo');
  const chat = $('#chat');
  ['BORA?', 'TÁ CHEIO?', 'CHEGUEI!'].forEach((palavra, i) => {
    const nota = document.createElement('span');
    nota.className = 'papo-word';
    nota.textContent = palavra;
    nota.style.right = `${75 + i * 34}px`;
    nota.style.top = `${-20 - i * 21}px`;
    nota.style.setProperty('--wx', `${-16 - i * 12}px`);
    nota.style.setProperty('--wy', `${-22 - i * 13}px`);
    chat.append(nota);
    setTimeout(() => nota.remove(), 880);
  });
  avisar('Papo espalhou: pergunte aqui como está o lugar.');
}

// Distância só aparece se a pessoa já liberou a localização (no Radar, por exemplo).
async function mostrarDistancia(local) {
  if (!navigator.geolocation || !navigator.permissions) return;
  try {
    const { state } = await navigator.permissions.query({ name: 'geolocation' });
    if (state !== 'granted') return;
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const km = distanciaKm(
        { lat: coords.latitude, lng: coords.longitude },
        { lat: Number(local.latitude), lng: Number(local.longitude) },
      );
      $('#distancia').textContent = ` · ${formatarDistancia(km)}`;
    }, () => {}, { maximumAge: 300000, timeout: 8000 });
  } catch {
    // navegador sem a API de permissões: segue sem distância
  }
}
