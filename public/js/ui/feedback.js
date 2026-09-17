// Retorno visual: aviso rápido (toast), recortes de papel e reações.
import { icone } from './dom.js';
import { limparSessao } from '../api/sessao.js';

let temporizador;

export const movimentoReduzido = () =>
  document.documentElement.classList.contains('manual-reduce') ||
  matchMedia('(prefers-reduced-motion: reduce)').matches;

export function avisar(mensagem) {
  const toast = document.querySelector('.toast');
  if (!toast) return;
  toast.textContent = mensagem;
  toast.classList.add('show');
  clearTimeout(temporizador);
  temporizador = setTimeout(() => toast.classList.remove('show'), 2600);
}

// Reinicia uma animação CSS de classe (remover, forçar reflow, recolocar).
export function reiniciarAnimacao(elemento, classe) {
  elemento.classList.remove(classe);
  void elemento.offsetWidth;
  elemento.classList.add(classe);
}

const centro = (elemento) => {
  const r = elemento.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

export function explosao(elemento, quantidade = 7) {
  const camada = document.querySelector('.fx-layer');
  if (!camada || !elemento || movimentoReduzido()) return;
  const p = centro(elemento);
  const cores = ['#ccff27', '#ff405b', '#185cf5', '#fff'];
  for (let i = 0; i < quantidade; i += 1) {
    const recorte = document.createElement('i');
    recorte.className = 'scrap-bit';
    recorte.style.left = `${p.x}px`;
    recorte.style.top = `${p.y}px`;
    recorte.style.setProperty('--bit', cores[i % cores.length]);
    recorte.style.setProperty('--x', `${Math.random() * 110 - 55}px`);
    recorte.style.setProperty('--y', `${-35 - Math.random() * 75}px`);
    recorte.style.setProperty('--r', `${Math.random() * 220 - 110}deg`);
    camada.append(recorte);
    setTimeout(() => recorte.remove(), 760);
  }
}

export function reacaoFlutuante(elemento, nomeIcone) {
  const camada = document.querySelector('.fx-layer');
  if (!camada || movimentoReduzido()) return;
  const p = centro(elemento);
  const reacao = document.createElement('span');
  reacao.className = 'float-reaction';
  reacao.innerHTML = String(icone(nomeIcone));
  reacao.style.left = `${p.x}px`;
  reacao.style.top = `${p.y}px`;
  reacao.style.setProperty('--drift', `${Math.random() * 54 - 27}px`);
  camada.append(reacao);
  setTimeout(() => reacao.remove(), 1000);
}

// Erro de sessão volta para o login; os demais viram aviso na tela.
export function tratarErro(erro) {
  console.error(erro);
  if (erro?.status === 401) {
    limparSessao();
    const aqui = location.pathname.split('/').pop() + location.search;
    location.replace(`login.html?next=${encodeURIComponent(aqui)}`);
    return;
  }
  avisar(erro?.message || 'Algo deu errado. Tente de novo.');
}
