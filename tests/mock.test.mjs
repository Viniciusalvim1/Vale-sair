// Testes do modo mock do Pulso (public/js/api/mock.js): as regras precisam
// bater com as do banco para a demonstração não mostrar algo que o app real recusa.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarLoja, EU } from '../public/js/api/mock.js';

function memoria() {
  const dados = new Map();
  return { getItem: (k) => dados.get(k) ?? null, setItem: (k, v) => dados.set(k, String(v)), removeItem: (k) => dados.delete(k) };
}

function loja(inicio = Date.parse('2026-09-15T22:00:00-03:00')) {
  const relogio = { t: inicio };
  return { relogio, loja: criarLoja({ storage: memoria(), agora: () => relogio.t }) };
}

test('os 18 lugares aparecem, com os Pulsos da demo sempre recentes', () => {
  const { loja: l } = loja();
  const lugares = l.locaisStatus();
  assert.equal(lugares.length, 18);
  assert.ok(lugares.every((x) => x.movimento), 'todo lugar tem pelo menos um Pulso ativo');
  assert.equal(lugares[0].slug, 'a-obra', 'o Pulso mais recente (há 4 min) vem primeiro');
  assert.equal(l.feed().length, 22);
});

test('publicar entra no topo do feed e muda o status do lugar', () => {
  const { loja: l } = loja();
  const moema = l.locaisStatus().find((x) => x.slug === 'moema');
  const pulso = l.publicar({ localId: moema.id, movimento: 'lotado', filaMinutos: 45, legenda: '  Fila dobrando a esquina ' });
  assert.equal(pulso.legenda, 'Fila dobrando a esquina');
  assert.equal(l.feed()[0].id, pulso.id);
  assert.equal(l.feed()[0].autor_username, 'voce');
  const depois = l.locaisStatus().find((x) => x.slug === 'moema');
  assert.equal(depois.movimento, 'lotado');
  assert.equal(depois.fila_minutos, 45);
  assert.equal(depois.pulsos_ativos, 2);
  assert.equal(l.locaisStatus()[0].slug, 'moema');
});

test('mesmas regras do banco: movimento, fila, legenda e 10 minutos por lugar', () => {
  const { loja: l, relogio } = loja();
  const id = l.locaisStatus()[0].id;
  assert.throws(() => l.publicar({ localId: id, movimento: 'bombando' }), /movimento/);
  assert.throws(() => l.publicar({ localId: id, movimento: 'cheio', filaMinutos: 300 }), /formato/);
  assert.throws(() => l.publicar({ localId: id, movimento: 'cheio', legenda: 'x'.repeat(81) }), /formato/);
  assert.throws(() => l.publicar({ localId: 'nao-existe', movimento: 'cheio' }), /lugar/);
  l.publicar({ localId: id, movimento: 'cheio' });
  assert.throws(() => l.publicar({ localId: id, movimento: 'lotado' }), /há pouco/);
  relogio.t += 10 * 60_000;
  assert.doesNotThrow(() => l.publicar({ localId: id, movimento: 'lotado' }));
});

test('o Pulso publicado expira em 2 horas', () => {
  const { loja: l, relogio } = loja();
  const id = l.locaisStatus().find((x) => x.slug === 'zona').id;
  const pulso = l.publicar({ localId: id, movimento: 'cheio' });
  relogio.t += 2 * 60 * 60_000 - 1;
  assert.ok(l.feed().some((p) => p.id === pulso.id));
  relogio.t += 1;
  assert.ok(!l.feed().some((p) => p.id === pulso.id));
});

test('reagir, desfazer e confirmar (nunca o próprio Pulso)', () => {
  const { loja: l } = loja();
  const alheio = l.feed()[0];
  l.reagir(alheio.id);
  assert.equal(l.feed()[0].reacoes, alheio.reacoes + 1);
  assert.throws(() => l.reagir(alheio.id), /já foi feito/);
  l.desfazerReacao(alheio.id);
  assert.equal(l.feed()[0].reagi, false);

  l.confirmar(alheio.id);
  assert.equal(l.feed()[0].confirmacoes, alheio.confirmacoes + 1);
  assert.throws(() => l.confirmar(alheio.id), /já foi feito/);

  const meu = l.publicar({ localId: alheio.local_id, movimento: 'animado' });
  assert.equal(meu.autor_id, EU.id);
  assert.throws(() => l.confirmar(meu.id), /próprio/);
});

test('o check-in ("Tô aqui") pré-seleciona o lugar e vale 3 horas', () => {
  const { loja: l, relogio } = loja();
  const id = l.locaisStatus()[5].id;
  assert.equal(l.meuCheckinAtivo(), null);
  l.toAqui(id);
  assert.equal(l.meuCheckinAtivo().local_id, id);
  relogio.t += 3 * 60 * 60_000;
  assert.equal(l.meuCheckinAtivo(), null);
});

test('salvos e Sala do lugar', () => {
  const { loja: l, relogio } = loja();
  const obra = l.locaisStatus().find((x) => x.slug === 'a-obra');
  l.salvar(obra.id);
  assert.throws(() => l.salvar(obra.id), /já foi feito/);
  assert.equal(l.salvos()[0].local_id, obra.id);
  l.removerSalvo(obra.id);
  assert.equal(l.salvos().length, 0);

  const antes = l.mensagens(obra.id);
  assert.equal(antes.length, 2);
  relogio.t += 1000;
  l.enviarMensagem(obra.id, ' cheguei ');
  const depois = l.mensagens(obra.id);
  assert.equal(depois.at(-1).conteudo, 'cheguei');
  assert.ok(depois.at(-1).id > antes.at(-1).id, 'id cresce para o "buscar novas" funcionar');
  assert.throws(() => l.enviarMensagem(obra.id, '   '), /formato/);
});
