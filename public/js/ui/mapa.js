// Mapa do Radar com MapLibre GL JS sobre os tiles abertos do OpenFreeMap:
// sem chave, sem conta e sem cota. A biblioteca está em public/vendor/ para o
// app não depender de CDN na hora da apresentação, e só é carregada quando
// alguém abre o Radar.
//
// Os marcadores são o HTML do próprio app (os mesmos pinos e bolhas do resto
// das telas). Cada um vai dentro de uma caixa porque o MapLibre escreve no
// `transform` do elemento que posiciona — e o nosso pino já usa `rotate()`.
import { ESTILO_MAPA } from './estilo-mapa.js';

// Onde o ponto da coordenada encosta em cada tipo de marcador.
// O pino é um quadrado de 60px girado 45°: a ponta fica 12px abaixo da caixa.
export const ANCORAS = {
  pino: { anchor: 'bottom', offset: [0, -12] },
  bolha: { anchor: 'center', offset: [0, 0] },
};

let modulo = null;

async function carregarMapLibre() {
  modulo ??= import('../../vendor/maplibre-gl.mjs');
  const carregado = await modulo;
  return carregado.default ?? carregado;
}

export async function prepararMapa(elemento, { centro, zoom = 14, semAnimacao = false } = {}) {
  const ml = await carregarMapLibre();

  const mapa = new ml.Map({
    container: elemento,
    style: ESTILO_MAPA,
    center: [centro.lng, centro.lat],
    zoom,
    minZoom: 10,
    maxZoom: 18,
    // os créditos vão para a esquerda: a direita é dos botões e do mascote
    attributionControl: false,
    // um dedo rola a página, dois movem o mapa; em tela cheia vira um dedo
    cooperativeGestures: true,
    dragRotate: false,
    pitchWithRotate: false,
    fadeDuration: semAnimacao ? 0 : 300,
  });
  mapa.touchZoomRotate?.disableRotation();
  mapa.addControl(new ml.AttributionControl({ compact: true }), 'bottom-left');

  const pronto = new Promise((resolve) => {
    mapa.on('load', resolve);
    mapa.on('error', () => resolve()); // tiles podem falhar; a tela segue
  });

  let marcadores = [];

  return {
    mapa,
    pronto,

    marcar(elementoInterno, posicao, tipo = 'pino') {
      const caixa = document.createElement('div');
      caixa.className = 'marcador';
      caixa.append(elementoInterno);
      const marcador = new ml.Marker({ element: caixa, ...ANCORAS[tipo] })
        .setLngLat([posicao.lng, posicao.lat])
        .addTo(mapa);
      marcadores.push(marcador);
      return marcador;
    },

    limpar() {
      marcadores.forEach((marcador) => marcador.remove());
      marcadores = [];
    },

    // o recuo de cima conta a altura do pino (72px): sem isso, um marcador do
    // topo fica embaixo da nota do mapa e não dá para tocar nele
    ajustar(pontos, recuo = { top: 150, right: 60, bottom: 110, left: 40 }) {
      if (!pontos.length) return;
      const limites = new ml.LngLatBounds();
      pontos.forEach((ponto) => limites.extend([ponto.lng, ponto.lat]));
      mapa.fitBounds(limites, { padding: recuo, maxZoom: 16, animate: !semAnimacao });
    },

    centralizar(ponto, zoomDesejado) {
      const destino = { center: [ponto.lng, ponto.lat], zoom: zoomDesejado ?? mapa.getZoom() };
      if (semAnimacao) mapa.jumpTo(destino);
      else mapa.easeTo(destino);
    },

    aproximar(passo) {
      mapa.easeTo({ zoom: mapa.getZoom() + passo, duration: semAnimacao ? 0 : 300 });
    },

    umDedo(ligado) {
      if (ligado) mapa.cooperativeGestures?.disable?.();
      else mapa.cooperativeGestures?.enable?.();
    },

    redimensionar() {
      mapa.resize();
    },
  };
}
