// Criar: atalhos para Chama e Pulso, e o status "QUERO SAIR" (liga e desliga).
import { exigirLogin } from '../api/auth.js';
import { presenca, perfil } from '../api/dados.js';
import { montarShell } from '../ui/shell.js';
import { $ } from '../ui/dom.js';
import { avisar, tratarErro, explosao } from '../ui/feedback.js';
import { horaCurta } from '../ui/formatos.js';

let querSairAte = null;

if (exigirLogin()) iniciar();

async function iniciar() {
  montarShell();
  $('#queroSair').addEventListener('click', alternar);
  try {
    const eu = await perfil.meu();
    querSairAte = eu?.quer_sair_ate && new Date(eu.quer_sair_ate) > new Date() ? eu.quer_sair_ate : null;
    atualizar();
  } catch (erro) {
    tratarErro(erro);
  }
}

function atualizar() {
  $('#queroSairTitulo').textContent = querSairAte ? 'TÔ QUERENDO SAIR' : 'QUERO SAIR';
  $('#queroSairTexto').textContent = querSairAte
    ? `Suas Turmas sabem até ${horaCurta(querSairAte)}. Toque para cancelar.`
    : 'Avise suas Turmas sem revelar sua localização exata.';
}

async function alternar(evento) {
  const botao = evento.currentTarget;
  botao.disabled = true;
  try {
    querSairAte = await presenca.queroSair(querSairAte ? 0 : 4);
    atualizar();
    if (querSairAte) explosao(botao, 10);
    avisar(querSairAte ? 'Status atualizado: suas Turmas sabem que você quer sair.' : 'Status "quero sair" cancelado.');
  } catch (erro) {
    tratarErro(erro);
  } finally {
    botao.disabled = false;
  }
}
