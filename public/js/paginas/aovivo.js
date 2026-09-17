// Feed ao vivo: Pulsos ativos de um lugar (?local=), de uma Cena (?cena=)
// ou da cidade inteira. Reações e confirmações vão direto para a API.
import { exigirLogin } from '../api/auth.js';
import { locais, pulsos, cenas } from '../api/dados.js';
import { usuarioAtual } from '../api/sessao.js';
import { montarShell } from '../ui/shell.js';
import { html, montar, icone, seguro, parametro, $ } from '../ui/dom.js';
import { avisar, tratarErro, explosao, reacaoFlutuante, reiniciarAnimacao } from '../ui/feedback.js';
import { rotuloMovimento, rotuloFila, tempoRelativo } from '../ui/formatos.js';
import { vazio, erroNaTela, compartilhar } from '../ui/componentes.js';

const localId = parametro('local');
const cenaSlug = parametro('cena');
const eu = usuarioAtual();

if (exigirLogin()) iniciar();

async function iniciar() {
  montarShell();
  $('#compartilhar').addEventListener('click', () => compartilhar({ titulo: document.title, url: location.href }));
  $('#feed').addEventListener('click', agir);
  try {
    let lista;
    if (localId) {
      const [local, feed] = await Promise.all([locais.porId(localId), pulsos.ativos({ localId })]);
      if (local) titulo(`${local.nome} · AO VIVO`);
      $('#postar').href = `pulso.html?local=${encodeURIComponent(localId)}`;
      $('[data-voltar]').href = `local.html?id=${encodeURIComponent(localId)}`;
      lista = feed;
    } else if (cenaSlug) {
      const [cena, feed] = await Promise.all([cenas.porSlug(cenaSlug), pulsos.daCena(cenaSlug)]);
      if (cena) titulo(`${cena.nome} · AO VIVO`);
      $('[data-voltar]').href = `cena.html?slug=${encodeURIComponent(cenaSlug)}`;
      lista = feed;
    } else {
      lista = await pulsos.ativos();
    }
    mostrar(lista);
  } catch (erro) {
    tratarErro(erro);
    montar($('#feed'), erroNaTela(erro.message));
  }
}

function titulo(texto) {
  $('#tituloFeed').textContent = texto;
  document.title = `${texto} · Vale Sair?`;
}

function mostrar(lista) {
  if (!lista.length) {
    montar($('#feed'), vazio(
      'Nada ao vivo agora',
      cenaSlug
        ? 'Ninguém da cena mostrou um lugar nas últimas 2 horas.'
        : 'Os Pulsos duram 2 horas. Está num lugar? Mostre como ele está.',
      { href: $('#postar').getAttribute('href'), rotulo: 'POSTAR MEU PULSO' },
    ));
    return;
  }
  montar($('#feed'), lista.map(post));
}

function post(pulso) {
  const movimento = rotuloMovimento(pulso.movimento);
  const meu = pulso.autor_id === eu.id;
  const url = pulso.midia_path ? pulsos.urlMidia(pulso.midia_path) : null;
  const detalhes = [movimento.rotulo, rotuloFila(pulso.fila_minutos), pulso.genero].filter(Boolean).join(' · ');
  return html`<article class="live-post${url ? '' : ' sem-midia'}" data-id="${pulso.id}" data-local="${pulso.local_id}">
    ${url && pulso.midia_tipo === 'video'
      ? html`<video src="${url}" autoplay muted loop playsinline preload="metadata" aria-label="Vídeo do Pulso em ${pulso.local_nome}"></video>`
      : ''}
    ${url && pulso.midia_tipo === 'foto' ? html`<img src="${url}" alt="Foto do Pulso em ${pulso.local_nome}" loading="lazy">` : ''}
    <span class="post-tag">${tempoRelativo(pulso.created_at).toUpperCase()} · SEM FILTRO</span>
    <div class="post-copy">
      <h2>${pulso.legenda || movimento.etiqueta}</h2>
      <p><a href="local.html?id=${pulso.local_id}">${pulso.local_nome}</a> · @${pulso.autor_username}<br>${detalhes}</p>
    </div>
    <div class="post-actions">
      <button type="button" data-acao="reagir" class="${pulso.reagi ? 'is-on' : ''}" aria-pressed="${pulso.reagi}"
        aria-label="Reagir com fogo">${icone('flame')}<small>${pulso.reacoes}</small></button>
      <button type="button" data-acao="confirmar" class="${pulso.confirmei ? 'is-on' : ''}" ${pulso.confirmei || meu ? seguro('disabled') : ''}
        aria-label="${meu ? 'Seu Pulso' : 'Confirmar que continua assim'}">${icone('check')}<small>${pulso.confirmacoes}</small></button>
      <button type="button" data-acao="compartilhar" aria-label="Compartilhar">${icone('share')}</button>
    </div>
  </article>`;
}

async function agir(evento) {
  const botao = evento.target.closest('[data-acao]');
  if (!botao || botao.disabled) return;
  const artigo = botao.closest('[data-id]');
  const contador = botao.querySelector('small');
  const acao = botao.dataset.acao;

  if (acao === 'compartilhar') {
    compartilhar({
      titulo: 'Pulso no Vale Sair?',
      texto: 'Olha como está agora:',
      url: new URL(`aovivo.html?local=${artigo.dataset.local}`, location.href).href,
    });
    return;
  }

  botao.disabled = true;
  try {
    if (acao === 'reagir') {
      const ligado = botao.classList.contains('is-on');
      await (ligado ? pulsos.desfazerReacao(artigo.dataset.id) : pulsos.reagir(artigo.dataset.id));
      botao.classList.toggle('is-on', !ligado);
      botao.setAttribute('aria-pressed', String(!ligado));
      contador.textContent = Number(contador.textContent) + (ligado ? -1 : 1);
      if (!ligado) {
        reiniciarAnimacao(botao, 'reacted');
        reacaoFlutuante(botao, 'flame');
        explosao(botao, 7);
      }
      botao.disabled = false;
    } else if (acao === 'confirmar') {
      await pulsos.confirmar(artigo.dataset.id);
      botao.classList.add('is-on');
      contador.textContent = Number(contador.textContent) + 1;
      reacaoFlutuante(botao, 'check');
      avisar('Valeu! Você confirmou que continua assim.');
      // confirmação não se desfaz: o botão fica desativado
    }
  } catch (erro) {
    botao.disabled = false;
    tratarErro(erro);
  }
}
