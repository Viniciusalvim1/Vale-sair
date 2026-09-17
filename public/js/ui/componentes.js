// Pedaços de interface usados em várias telas.
import { html, icone, urlSegura } from './dom.js';
import { avisar } from './feedback.js';
import { pulsos } from '../api/dados.js';
import { rotuloMovimento, rotuloFila, tempoRelativo, iniciais } from './formatos.js';

const FOTO_PADRAO = 'assets/img/role-bh.jpg';

// Foto mais recente: a do último Pulso com foto ou a cadastrada do lugar
export function fotoDoLocal(local) {
  if (local.ultima_midia_path && local.ultima_midia_tipo === 'foto') return pulsos.urlMidia(local.ultima_midia_path);
  return local.foto_url || FOTO_PADRAO;
}

export function midiaDoLocal(local, classe = '') {
  if (local.ultima_midia_path && local.ultima_midia_tipo === 'video') {
    return html`<video class="${classe}" src="${pulsos.urlMidia(local.ultima_midia_path)}" autoplay muted loop playsinline
      preload="metadata" aria-label="Último Pulso em ${local.nome}"></video>`;
  }
  return html`<img class="${classe}" src="${fotoDoLocal(local)}" alt="Ambiente de ${local.nome}">`;
}

// "CHEIO · POP · FILA 8 MIN"
export const resumoDoLocal = (local) =>
  [rotuloMovimento(local.movimento).rotulo, local.genero_agora, rotuloFila(local.fila_minutos)].filter(Boolean).join(' · ');

// "há 4 min · FILA 8 MIN · Pop"
export function linhaDeStatus(local) {
  if (!local.movimento) return 'Sem Pulso nas últimas 2 horas';
  return [tempoRelativo(local.ultimo_pulso_em), rotuloFila(local.fila_minutos), local.genero_agora].filter(Boolean).join(' · ');
}

export const seloMovimento = (movimento) =>
  html`<span class="selo ${movimento ?? 'sem'}">${rotuloMovimento(movimento).rotulo}</span>`;

export function cardLocal(local) {
  return html`<a class="local-card" href="local.html?id=${local.id}">
    <img src="${fotoDoLocal(local)}" alt="" loading="lazy">
    <span><strong>${local.nome}</strong><small>${local.categoria} · ${local.regiao}</small><small>${linhaDeStatus(local)}</small></span>
    ${seloMovimento(local.movimento)}
  </a>`;
}

export function avatar(nome, url) {
  const foto = urlSegura(url);
  return html`<i class="avatar" aria-hidden="true">${foto ? html`<img src="${foto}" alt="">` : iniciais(nome)}</i>`;
}

export const mascote = (nome, rotulo, fala) =>
  html`<button class="mascot-button mascot-${nome}" type="button" data-mascote="${nome}" aria-label="${rotulo}">
    <img src="assets/img/${nome}.png" alt=""><span class="mascot-label">${fala}</span></button>`;

export const vazio = (titulo, texto, acao) =>
  html`<div class="vazio"><strong>${titulo}</strong>${texto}${
    acao ? html`<a class="physical lime full" href="${acao.href}">${acao.rotulo}</a>` : ''
  }</div>`;

export const erroNaTela = (mensagem) =>
  html`<div class="vazio"><strong>Não carregou</strong>${mensagem}
    <button class="physical full" type="button" data-recarregar>${icone('route')} TENTAR DE NOVO</button></div>`;

export function mostrarAviso(elemento, texto, erro = true) {
  elemento.textContent = texto;
  elemento.classList.toggle('erro', erro);
  elemento.hidden = !texto;
}

// Compartilhamento nativo do celular; no computador, copia o link
export async function compartilhar({ titulo, texto, url }) {
  if (navigator.share) {
    try {
      await navigator.share({ title: titulo, text: texto, url });
      return;
    } catch (erro) {
      if (erro.name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(texto ? `${texto} ${url}` : url);
    avisar('Link copiado!');
  } catch {
    avisar('Não deu para copiar. Use o endereço da barra do navegador.');
  }
}
