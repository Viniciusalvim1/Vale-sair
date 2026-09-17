// Turma: Chama aberto, quem está na turma (e quem quer sair), convite e histórico.
import { exigirLogin } from '../api/auth.js';
import { turmas, chamas } from '../api/dados.js';
import { usuarioAtual } from '../api/sessao.js';
import { montarShell } from '../ui/shell.js';
import { html, montar, icone, parametro, $ } from '../ui/dom.js';
import { avisar, tratarErro } from '../ui/feedback.js';
import { formatarQuando, horaCurta, tempoRelativo } from '../ui/formatos.js';
import { avatar, vazio, erroNaTela, compartilhar } from '../ui/componentes.js';

const turmaId = parametro('id');
const eu = usuarioAtual();

if (exigirLogin()) iniciar();

async function iniciar() {
  montarShell();
  if (!turmaId) {
    location.replace('comunidades.html');
    return;
  }
  try {
    const [turma, membros, historico] = await Promise.all([
      turmas.porId(turmaId),
      turmas.membros(turmaId),
      turmas.chamas(turmaId),
    ]);
    if (!turma) {
      montar($('#tela'), vazio('Turma não encontrada', 'Ela não existe ou você não participa dela.', {
        href: 'comunidades.html', rotulo: 'VER MINHAS TURMAS',
      }));
      return;
    }
    const aberto = turma.chama_aberto ? await chamas.publico(turma.chama_aberto) : null;
    mostrar(turma, membros, historico, aberto);
    if (parametro('nova')) avisar('Turma criada! Mande o código de convite para o pessoal.');
  } catch (erro) {
    tratarErro(erro);
    montar($('#tela'), erroNaTela(erro.message));
  }
}

function pessoa(membro) {
  const { perfil } = membro;
  const querSair = perfil.quer_sair_ate && new Date(perfil.quer_sair_ate) > new Date();
  return html`<div class="person-status">
    ${avatar(perfil.nome, perfil.avatar_url)}
    <span><strong>${perfil.nome}${perfil.id === eu.id ? ' (você)' : ''}</strong>
      <small>@${perfil.username}${membro.papel === 'admin' ? ' · admin' : ''}</small></span>
    <span class="status-pill${querSair ? '' : ' off'}">${querSair ? 'QUER SAIR' : 'DE BOA'}</span>
  </div>`;
}

function cartaoDoChama(turma, membros, chama) {
  const lider = [...chama.opcoes].sort((a, b) => b.votos - a.votos)[0];
  return html`<article class="ticket">
      <div class="ticket-top">
        <span>${chama.quando ? formatarQuando(chama.quando) : 'HOJE'}</span>
        <span>${chama.total_votos} ${chama.total_votos === 1 ? 'VOTO' : 'VOTOS'}</span>
      </div>
      <h2>${chama.titulo}</h2>
      <p>${icone('pin')} ${lider?.votos ? `${lider.nome} na frente` : 'Ninguém votou ainda'}<br>
        ${icone('clock')} votação até ${horaCurta(chama.encerra_em)}</p>
      <div class="members">
        ${membros.slice(0, 3).map((m) => avatar(m.perfil.nome, m.perfil.avatar_url))}
        ${turma.membros > 3 ? html`<span>e mais ${turma.membros - 3}</span>` : ''}
      </div>
    </article>
    <a class="physical lime full" href="enquete.html?codigo=${chama.codigo}">VOTAR NO ROLÊ</a>`;
}

function mostrar(turma, membros, historico, aberto) {
  document.title = `${turma.nome} · Vale Sair?`;
  const anteriores = historico.filter((chama) => chama.codigo !== turma.chama_aberto);
  montar($('#tela'), html`
    <div class="flow-head">
      <a class="back" href="comunidades.html" data-voltar aria-label="Voltar">${icone('chevron')}</a>
      <div>
        <div class="kicker">MINHA TURMA · ${turma.membros} ${turma.membros === 1 ? 'PESSOA' : 'PESSOAS'}</div>
        ${turma.descricao ? html`<p>${turma.descricao}</p>` : ''}
      </div>
    </div>
    <div class="crew-title">${turma.nome}</div>
    ${aberto
      ? cartaoDoChama(turma, membros, aberto)
      : vazio('Nenhum Chama aberto', 'Escolha de 2 a 4 lugares e deixe a turma decidir.', {
        href: `chama-lugares.html?turma=${turma.id}`, rotulo: 'CRIAR UM CHAMA',
      })}
    <section class="availability" aria-labelledby="tituloMembros">
      <h3 id="tituloMembros">QUEM ESTÁ NA TURMA</h3>
      ${membros.map(pessoa)}
    </section>
    <div class="share-code"><strong>${turma.codigo_convite}</strong>código de convite</div>
    <div class="button-row">
      <button class="physical" type="button" id="convidar">${icone('copy')} CONVIDAR</button>
      <button class="physical coral" type="button" id="sair">SAIR</button>
    </div>
    ${anteriores.length ? html`<h2 class="titulo-secao">CHAMAS ANTERIORES ↘</h2>
      <div class="rank-list">${anteriores.map((chama) => html`<a class="rank-row" href="enquete.html?codigo=${chama.codigo}">
        <b>${icone('users')}</b><strong>${chama.titulo}</strong><span>${tempoRelativo(chama.created_at)}</span></a>`)}</div>` : ''}`);

  $('#convidar').addEventListener('click', () => compartilhar({
    titulo: `Turma ${turma.nome}`,
    texto: `Entra na minha Turma "${turma.nome}" no Vale Sair?`,
    url: new URL(`comunidades.html?convite=${turma.codigo_convite}`, location.href).href,
  }));

  $('#sair').addEventListener('click', async (evento) => {
    const botao = evento.currentTarget;
    if (!window.confirm(`Sair da Turma ${turma.nome}?`)) return;
    botao.disabled = true;
    try {
      await turmas.sair(turma.id);
      location.replace('comunidades.html');
    } catch (erro) {
      botao.disabled = false;
      tratarErro(erro);
    }
  });
}
