// Testes das funções puras do front-end (formatação, segurança e mapa).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { html, seguro } from '../public/js/ui/dom.js';
import * as f from '../public/js/ui/formatos.js';

test('html`` escapa o que vem de fora e preserva o markup do próprio código', () => {
  const nome = '<img src=x onerror=alert(1)>';
  assert.equal(String(html`<b>${nome}</b>`), '<b>&lt;img src=x onerror=alert(1)&gt;</b>');
  assert.equal(String(html`<a title="${'" onclick="x'}">`), '<a title="&quot; onclick=&quot;x">');
  assert.equal(String(html`<i>${seguro('<svg></svg>')}</i>`), '<i><svg></svg></i>');
  assert.equal(String(html`<ul>${['a', '<b>'].map((x) => html`<li>${x}</li>`)}</ul>`), '<ul><li>a</li><li>&lt;b&gt;</li></ul>');
  assert.equal(String(html`${null}${undefined}${false}${0}`), '0');
});

test('tempo relativo', () => {
  const agora = Date.parse('2026-09-15T22:00:00-03:00');
  assert.equal(f.tempoRelativo(agora - 20_000, agora), 'agora');
  assert.equal(f.tempoRelativo(agora - 4 * 60_000, agora), 'há 4 min');
  assert.equal(f.tempoRelativo(agora - 3 * 3_600_000, agora), 'há 3 h');
  assert.equal(f.tempoRelativo(agora - 26 * 3_600_000, agora), 'ontem');
  assert.equal(f.tempoRelativo(agora - 3 * 86_400_000, agora), 'há 3 dias');
});

test('fila, horário, preço e movimento', () => {
  assert.equal(f.rotuloFila(0), 'SEM FILA');
  assert.equal(f.rotuloFila(8), 'FILA 8 MIN');
  assert.equal(f.rotuloFila(75), 'FILA 1H+');
  assert.equal(f.rotuloFila(null), null);
  assert.equal(f.horario('02:00:00'), '02h');
  assert.equal(f.horario('23:30:00'), '23h30');
  assert.equal(f.faixaPreco(3), '$$$');
  assert.equal(f.faixaPreco(9), '$$$$');
  assert.equal(f.rotuloMovimento('cheio').etiqueta, 'TÁ PEGANDO');
  assert.equal(f.rotuloMovimento(null).rotulo, 'SEM PULSO');
});

test('quando formata dia da semana, data e hora no fuso de BH', () => {
  assert.equal(f.formatarQuando('2026-09-11T22:30:00Z'), 'SEX · 11/09 · 19H30');
  assert.equal(f.horaCurta('2026-09-11T22:30:00Z'), '19h30');
  assert.equal(f.mesPorExtenso('2026-08-01'), 'AGOSTO');
});

test('distância entre a Savassi e o Mercado Novo fica perto de 2 km', () => {
  const km = f.distanciaKm({ lat: -19.9372, lng: -43.9338 }, { lat: -19.9236, lng: -43.9447 });
  assert.ok(km > 1.7 && km < 2.1, `${km}`);
  assert.equal(f.formatarDistancia(0.43), '450 M');
  assert.equal(f.formatarDistancia(1.84), '1,8 KM');
});

test('iniciais, usuário, busca e nível', () => {
  assert.equal(f.iniciais('Júlia'), 'JU');
  assert.equal(f.iniciais('Ana Maria Souza'), 'AS');
  assert.equal(f.iniciais(''), '?');
  assert.equal(f.normalizarUsername('Vinícius Alvim!'), 'viniciusalvim');
  assert.equal(f.usernameValido('ab'), false);
  assert.equal(f.usernameValido('vale.sair_2'), true);
  assert.equal(f.paraBusca('Galpão ÁGUA'), 'galpao agua');
  assert.equal(f.listaNatural(['46% bar', '32% balada', '22% boteco']), '46% bar, 32% balada e 22% boteco');
  assert.equal(f.tituloDoNivel(1), 'NOVATO DA NOITE');
  assert.equal(f.tituloDoNivel(99), 'LENDA DO ROLÊ');
});

test('projeção do mapa respeita as margens', () => {
  const projetar = f.criarProjecao([{ lat: -19.91, lng: -43.96 }, { lat: -19.94, lng: -43.91 }]);
  const noroeste = projetar({ lat: -19.91, lng: -43.96 });
  const sudeste = projetar({ lat: -19.94, lng: -43.91 });
  assert.deepEqual([noroeste.x, noroeste.y].map(Math.round), [12, 20]);
  assert.deepEqual([sudeste.x, sudeste.y].map(Math.round), [88, 70]);
  assert.deepEqual(f.criarProjecao([])({ lat: 0, lng: 0 }), { x: 50, y: 50 });
});

test('redirecionamento só para páginas do próprio app', () => {
  assert.equal(f.destinoSeguro('local.html?id=0f3a-12'), 'local.html?id=0f3a-12');
  assert.equal(f.destinoSeguro('https://golpe.com'), 'agora.html');
  assert.equal(f.destinoSeguro('javascript:alert(1)'), 'agora.html');
  assert.equal(f.destinoSeguro('//golpe.com/x.html'), 'agora.html');
  assert.equal(f.destinoSeguro(null, null), null);
});

test('extensão do arquivo pelo tipo', () => {
  assert.equal(f.extensaoDoArquivo({ type: 'video/quicktime', name: 'IMG_1.MOV' }), 'mov');
  assert.equal(f.extensaoDoArquivo({ type: '', name: 'foto.JPEG' }), 'jpeg');
});
