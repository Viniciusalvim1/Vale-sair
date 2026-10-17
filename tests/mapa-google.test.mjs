// Testes puros da configuração Google Maps. Rodam sem navegador nem consumo da API.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ANCORAS, CENTRO_BH, DISTANCIA_CONFORTAVEL, ESTILO_GOOGLE,
  RAIO_STREET_VIEW, RAIO_STREET_VIEW_AMPLO, calcularDistancia, calcularHeading,
  criarClasseMarcador, opcoesDoMapa, urlGoogleMaps,
} from '../public/js/ui/mapa.js';

// O mínimo da API do Google que o marcador usa, para testar sem navegador.
const mapsFalso = (projecao) => ({
  OverlayView: class {
    setMap() {}

    getPanes() {
      return { overlayMouseTarget: { append() {} } };
    }

    getProjection() {
      return projecao;
    }
  },
  LatLng: class {
    constructor(posicao) {
      Object.assign(this, posicao);
    }
  },
});

test('o carregador usa a API oficial de forma assíncrona e localizada para o Brasil', () => {
  const url = new URL(urlGoogleMaps());
  assert.equal(url.origin, 'https://maps.googleapis.com');
  assert.equal(url.pathname, '/maps/api/js');
  assert.equal(url.searchParams.get('loading'), 'async');
  assert.equal(url.searchParams.get('language'), 'pt-BR');
  assert.equal(url.searchParams.get('region'), 'BR');
  assert.equal(url.searchParams.get('callback'), '__valeSairGoogleMapsPronto');
  assert.ok(url.searchParams.get('key'));
});

test('o Radar mantém os estabelecimentos do Google visíveis e habilita Street View', () => {
  const opcoes = opcoesDoMapa({ ControlPosition: { LEFT_BOTTOM: 'left-bottom' } }, {
    centro: CENTRO_BH,
    zoom: 14,
  });
  assert.equal(opcoes.clickableIcons, true);
  assert.equal(opcoes.streetViewControl, true);
  assert.equal(opcoes.streetViewControlOptions.position, 'left-bottom');
  assert.equal(opcoes.zoomControl, false);
  assert.equal(opcoes.gestureHandling, 'cooperative');
  assert.equal(opcoes.center, CENTRO_BH);
});

test('o estilo preserva os POIs comerciais e aproxima o mapa da identidade visual', () => {
  const negocios = ESTILO_GOOGLE.find((regra) => regra.featureType === 'poi.business');
  const ruasLocais = ESTILO_GOOGLE.find((regra) => regra.featureType === 'road.local');
  assert.deepEqual(negocios.stylers, [{ visibility: 'on' }]);
  assert.deepEqual(ruasLocais.stylers, [{ visibility: 'off' }]);
  assert.ok(ESTILO_GOOGLE.some((regra) => regra.featureType === 'water'));
  assert.ok(ESTILO_GOOGLE.some((regra) => regra.featureType === 'road'));
  assert.ok(ESTILO_GOOGLE.some((regra) => regra.featureType === 'road.highway'));
});

test('o Radar usa ícones próprios e arredondados para as categorias de lugar', async () => {
  const codigo = await import('node:fs/promises').then(({ readFile }) =>
    readFile(new URL('../public/js/paginas/radar.js', import.meta.url), 'utf8'));
  assert.match(codigo, /bar: \['drink', 'bar'\]/);
  assert.match(codigo, /restaurante: \['utensils', 'restaurante'\]/);
  assert.match(codigo, /balada: \['music', 'balada'\]/);
});

test('o Street View procura primeiro na rua do lugar e só depois amplia', () => {
  // Um raio grande de cara devolve a imagem de outra rua sem ninguém notar.
  assert.ok(RAIO_STREET_VIEW <= 150, 'a primeira busca tem que ser curta');
  assert.ok(RAIO_STREET_VIEW_AMPLO > RAIO_STREET_VIEW);
  assert.ok(DISTANCIA_CONFORTAVEL < RAIO_STREET_VIEW);
});

test('o Street View pede só as imagens de rua do Google, não fotos 360 de terceiros', async () => {
  // Sem sources: [GOOGLE] a API devolvia o interior da loja mais próxima:
  // "Fotografia Empresarial BH" no lugar da fachada de A Obra.
  const codigo = await import('node:fs/promises').then(({ readFile }) =>
    readFile(new URL('../public/js/ui/mapa.js', import.meta.url), 'utf8'));
  assert.match(codigo, /sources: \[biblioteca\.StreetViewSource\.GOOGLE\]/);
});

test('a câmera do Street View aponta para o estabelecimento, não para o norte', () => {
  const lugar = { lat: -19.935816, lng: -43.932255 };
  // norte, sul, leste e oeste do lugar
  assert.equal(Math.round(calcularHeading({ lat: -19.9348, lng: -43.932255 }, lugar)), 180);
  assert.equal(Math.round(calcularHeading({ lat: -19.9368, lng: -43.932255 }, lugar)), 0);
  assert.equal(Math.round(calcularHeading({ lat: -19.935816, lng: -43.9312 }, lugar)), 270);
  assert.equal(Math.round(calcularHeading({ lat: -19.935816, lng: -43.9332 }, lugar)), 90);
  // sempre entre 0 e 360, que é o que o pov do Google aceita
  const angulo = calcularHeading({ lat: -19.9368, lng: -43.9332 }, lugar);
  assert.ok(angulo >= 0 && angulo < 360);
});

test('a distância até o panorama sai em metros', () => {
  const obra = { lat: -19.935816, lng: -43.932255 };
  assert.equal(calcularDistancia(obra, obra), 0);
  // um centésimo de grau de latitude é ~1,11 km
  assert.ok(Math.abs(calcularDistancia(obra, { lat: -19.925816, lng: -43.932255 }) - 1110) < 15);
});

test('as âncoras centralizam os adesivos sociais sobre a coordenada', () => {
  assert.equal(ANCORAS.pino, 'translate(-50%, -50%)');
  assert.equal(ANCORAS.bolha, 'translate(-50%, -50%)');
});

test('o marcador sobrevive ao mapa sem projeção e posiciona quando ela chega', () => {
  // getProjection() vem indefinido enquanto o mapa monta — e também quando a
  // chave é recusada (RefererNotAllowedMapError). Antes disso quebrava a tela.
  globalThis.document ??= {
    createElement: () => ({ className: '', style: {}, append() {}, remove() {} }),
  };

  const SemProjecao = criarClasseMarcador(mapsFalso(undefined));
  const esperando = new SemProjecao({ style: {} }, { lat: -19.93, lng: -43.93 }, 'pino', {});
  assert.doesNotThrow(() => esperando.draw());
  assert.deepEqual(esperando.caixa.style, {}, 'nada é posicionado sem projeção');

  const ComProjecao = criarClasseMarcador(mapsFalso({ fromLatLngToDivPixel: () => ({ x: 12, y: 34 }) }));
  const posicionado = new ComProjecao({ style: {} }, { lat: -19.93, lng: -43.93 }, 'pino', {});
  posicionado.draw();
  assert.equal(posicionado.caixa.style.left, '12px');
  assert.equal(posicionado.caixa.style.top, '34px');
  assert.equal(posicionado.caixa.style.transform, ANCORAS.pino);
});

test('o centro padrão é Belo Horizonte', () => {
  assert.ok(CENTRO_BH.lat < -19 && CENTRO_BH.lat > -20);
  assert.ok(CENTRO_BH.lng < -43 && CENTRO_BH.lng > -44);
});
