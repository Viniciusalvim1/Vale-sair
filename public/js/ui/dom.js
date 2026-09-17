// Montagem de HTML segura contra XSS: tudo que entra por ${} é escapado,
// menos o que vier de outro html`` ou for marcado com seguro() (ícones e
// atributos fixos escritos no próprio código).
const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

class Seguro {
  constructor(texto) {
    this.texto = texto;
  }

  toString() {
    return this.texto;
  }
}

export const escapar = (valor) => String(valor ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);
export const seguro = (texto) => new Seguro(String(texto));

function renderizar(valor) {
  if (valor instanceof Seguro) return valor.texto;
  if (Array.isArray(valor)) return valor.map(renderizar).join('');
  if (valor === null || valor === undefined || valor === false) return '';
  return escapar(valor);
}

export function html(partes, ...valores) {
  return new Seguro(partes.reduce((saida, parte, i) => saida + renderizar(valores[i - 1]) + parte));
}

export function montar(elemento, conteudo) {
  elemento.innerHTML = renderizar(conteudo);
}

export const icone = (nome) =>
  seguro(`<svg class="ui-icon" aria-hidden="true"><use href="assets/icons.svg#i-${nome}"></use></svg>`);

// Só deixa passar links http(s) (bloqueia javascript: e afins em dados do banco).
export function urlSegura(valor) {
  if (!valor) return null;
  try {
    const url = new URL(valor, location.href);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export const $ = (seletor, raiz = document) => raiz.querySelector(seletor);
export const $$ = (seletor, raiz = document) => [...raiz.querySelectorAll(seletor)];
export const parametro = (nome) => new URLSearchParams(location.search).get(nome);
