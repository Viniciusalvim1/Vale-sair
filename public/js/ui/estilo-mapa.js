// Estilo do mapa do Radar, inspirado no Bump (o app do time do Zenly):
// mapa de brinquedo, não mapa de navegação. Ruas brancas e grossas de ponta
// arredondada, água vibrante, parques verdes, nenhum ponto de interesse e só
// bairro e cidade escritos. O mapa vira cenário; quem aparece são os lugares
// e as pessoas.
//
// É um estilo MapLibre (spec 8) sobre os tiles abertos do OpenFreeMap, que não
// pede chave, conta nem cartão. Como o estilo mora aqui, cada cor e cada
// espessura de via é revisável junto com o resto do código.
const PAPEL = '#eee5d2';
const TINTA = '#111111';
const AGUA = '#7cc4ff';
const PARQUE = '#cfe86a';
const VIA = '#ffffff';
const VIA_MENOR = '#fdf9f0';
const RODOVIA = '#ffe9a8';
const PREDIO = '#e4d8c0';
const ROTULO = '#8a7f6c';

// Espessura das vias por zoom: é o que dá o ar "de brinquedo" do Bump.
const espessura = (fina, media, grossa, enorme) => [
  'interpolate', ['exponential', 1.4], ['zoom'],
  12, fina,
  14, media,
  16, grossa,
  18, enorme,
];

const ehClasse = (...classes) => ['in', ['get', 'class'], ['literal', classes]];

export const ESTILO_MAPA = {
  version: 8,
  name: 'Vale Sair? · noite de BH',
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources: {
    ofm: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' },
  },
  layers: [
    { id: 'fundo', type: 'background', paint: { 'background-color': PAPEL } },

    // água e verde primeiro: são o fundo do cenário
    {
      id: 'agua',
      type: 'fill',
      source: 'ofm',
      'source-layer': 'water',
      paint: { 'fill-color': AGUA },
    },
    {
      id: 'curso-dagua',
      type: 'line',
      source: 'ofm',
      'source-layer': 'waterway',
      paint: { 'line-color': AGUA, 'line-width': espessura(0.6, 1.4, 3, 6) },
    },
    {
      id: 'parque',
      type: 'fill',
      source: 'ofm',
      'source-layer': 'park',
      paint: { 'fill-color': PARQUE, 'fill-opacity': 0.85 },
    },
    {
      id: 'verde',
      type: 'fill',
      source: 'ofm',
      'source-layer': 'landcover',
      filter: ehClasse('wood', 'grass', 'scrub'),
      paint: { 'fill-color': PARQUE, 'fill-opacity': 0.5 },
    },
    {
      id: 'predios',
      type: 'fill',
      source: 'ofm',
      'source-layer': 'building',
      minzoom: 15,
      paint: {
        'fill-color': PREDIO,
        'fill-opacity': ['interpolate', ['linear'], ['zoom'], 15, 0, 16.5, 0.55],
      },
    },

    // ruas: das menores para as maiores, para as grandes ficarem por cima
    {
      id: 'via-menor',
      type: 'line',
      source: 'ofm',
      'source-layer': 'transportation',
      filter: ehClasse('minor', 'service', 'track', 'path'),
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': VIA_MENOR, 'line-width': espessura(0.8, 3, 7, 16) },
    },
    {
      id: 'via',
      type: 'line',
      source: 'ofm',
      'source-layer': 'transportation',
      filter: ehClasse('tertiary', 'secondary'),
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': VIA, 'line-width': espessura(2, 6, 12, 24) },
    },
    {
      id: 'avenida',
      type: 'line',
      source: 'ofm',
      'source-layer': 'transportation',
      filter: ehClasse('primary', 'trunk'),
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': VIA, 'line-width': espessura(3, 8, 16, 30) },
    },
    {
      id: 'rodovia',
      type: 'line',
      source: 'ofm',
      'source-layer': 'transportation',
      filter: ehClasse('motorway'),
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': RODOVIA, 'line-width': espessura(4, 10, 20, 34) },
    },

    // texto só do essencial: bairro e cidade
    {
      id: 'bairro',
      type: 'symbol',
      source: 'ofm',
      'source-layer': 'place',
      filter: ehClasse('suburb', 'neighbourhood', 'quarter'),
      minzoom: 12,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Bold'],
        'text-size': 11,
        'text-letter-spacing': 0.14,
        'text-transform': 'uppercase',
        'text-padding': 12,
      },
      paint: { 'text-color': ROTULO, 'text-halo-color': PAPEL, 'text-halo-width': 2.5 },
    },
    {
      id: 'cidade',
      type: 'symbol',
      source: 'ofm',
      'source-layer': 'place',
      filter: ehClasse('city', 'town'),
      maxzoom: 13,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Bold'],
        'text-size': 15,
        'text-letter-spacing': 0.06,
        'text-transform': 'uppercase',
      },
      paint: { 'text-color': TINTA, 'text-halo-color': PAPEL, 'text-halo-width': 3 },
    },
  ],
};

// Centro de Belo Horizonte, usado enquanto os lugares não chegam da API.
export const CENTRO_BH = { lat: -19.9245, lng: -43.9352 };
