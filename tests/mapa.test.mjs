// Testes do mapa do Radar: o estilo (que precisa ficar no repositório e seguir
// o traço do Bump) e as âncoras dos marcadores. Rodam sem navegador.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ESTILO_MAPA, CENTRO_BH } from '../public/js/ui/estilo-mapa.js';
import { ANCORAS } from '../public/js/ui/mapa.js';

const camada = (id) => ESTILO_MAPA.layers.find((c) => c.id === id);

test('o estilo é um MapLibre válido servido pelos tiles abertos do OpenFreeMap', () => {
  assert.equal(ESTILO_MAPA.version, 8);
  assert.equal(ESTILO_MAPA.sources.ofm.type, 'vector');
  assert.match(ESTILO_MAPA.sources.ofm.url, /^https:\/\/tiles\.openfreemap\.org\//);
  assert.match(ESTILO_MAPA.glyphs, /^https:\/\/tiles\.openfreemap\.org\/fonts\//);
  // sem chave, sem token, sem cota: nada de credencial escondida no estilo
  assert.ok(!JSON.stringify(ESTILO_MAPA).match(/key=|access_token|apikey/i));
});

test('o traço do Bump: fundo de papel, ruas brancas grossas e arredondadas', () => {
  assert.equal(camada('fundo').paint['background-color'], '#eee5d2');
  assert.equal(camada('via').paint['line-color'], '#ffffff');
  assert.equal(camada('via').layout['line-cap'], 'round');
  assert.equal(camada('avenida').layout['line-join'], 'round');
  assert.equal(camada('agua').paint['fill-color'], '#7cc4ff');
  assert.equal(camada('parque').paint['fill-color'], '#cfe86a');

  // as vias engrossam com o zoom, e as maiores são sempre mais grossas
  const largura = (id, indiceDoZoom) => camada(id).paint['line-width'][indiceDoZoom];
  const noZoom16 = (id) => largura(id, 8); // ..., 16, valor
  assert.ok(noZoom16('rodovia') > noZoom16('avenida'));
  assert.ok(noZoom16('avenida') > noZoom16('via'));
  assert.ok(noZoom16('via') > noZoom16('via-menor'));
});

test('o mapa é cenário: sem POIs e só com bairro e cidade escritos', () => {
  const camadasDePoi = ESTILO_MAPA.layers.filter((c) => c['source-layer'] === 'poi');
  assert.deepEqual(camadasDePoi, [], 'nenhum ponto de interesse do mapa base');

  const comTexto = ESTILO_MAPA.layers.filter((c) => c.layout?.['text-field']);
  assert.deepEqual(comTexto.map((c) => c.id).sort(), ['bairro', 'cidade']);
  comTexto.forEach((c) => {
    assert.deepEqual(c.layout['text-font'], ['Noto Sans Bold'], 'fonte precisa existir no servidor de glifos');
    assert.equal(c.layout['text-transform'], 'uppercase');
  });

  // nenhum rótulo de rua, como no Bump
  assert.ok(!ESTILO_MAPA.layers.some((c) => c['source-layer'] === 'transportation_name'));
});

test('as âncoras põem a ponta do pino e o centro da bolha sobre a coordenada', () => {
  // o pino é um quadrado de 60px girado 45°: a ponta fica 12px abaixo da caixa
  assert.equal(ANCORAS.pino.anchor, 'bottom');
  assert.deepEqual(ANCORAS.pino.offset, [0, -12]);
  assert.equal(ANCORAS.bolha.anchor, 'center');
  assert.deepEqual(ANCORAS.bolha.offset, [0, 0]);
});

test('o centro padrão é Belo Horizonte', () => {
  assert.ok(CENTRO_BH.lat < -19 && CENTRO_BH.lat > -20);
  assert.ok(CENTRO_BH.lng < -43 && CENTRO_BH.lng > -44);
});
