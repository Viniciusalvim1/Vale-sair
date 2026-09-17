// Perfil: números da pessoa, nível e XP, conquistas e edição do perfil.
import { exigirLogin } from '../api/auth.js';
import { perfil } from '../api/dados.js';
import { montarShell } from '../ui/shell.js';
import { html, montar, icone, urlSegura, $ } from '../ui/dom.js';
import { tratarErro } from '../ui/feedback.js';
import { iniciais, tituloDoNivel, listaNatural, normalizarUsername, usernameValido } from '../ui/formatos.js';
import { erroNaTela, mostrarAviso } from '../ui/componentes.js';

const LIMITE_FOTO = 2 * 1024 * 1024;
let meu = null;
let regioes = [];
let verificacao;

if (exigirLogin()) iniciar();

async function iniciar() {
  montarShell();
  $('#formPerfil').addEventListener('submit', salvar);
  $('#username').addEventListener('input', verificarUsername);
  try {
    const [dados, resumo, catalogo, listaDeRegioes] = await Promise.all([
      perfil.meu(), perfil.resumo(), perfil.conquistas(), perfil.regioes(),
    ]);
    meu = dados;
    regioes = listaDeRegioes;
    mostrar(resumo, catalogo);
  } catch (erro) {
    tratarErro(erro);
    montar($('#perfil'), erroNaTela(erro.message));
  }
}

function mostrar(resumo, catalogo) {
  const obtidas = new Set(resumo.conquistas.map((c) => c.codigo));
  const faixa = resumo.xp_proximo_nivel - resumo.xp_nivel_atual;
  const progresso = faixa > 0 ? Math.min(100, Math.round(((resumo.xp - resumo.xp_nivel_atual) / faixa) * 100)) : 0;
  const regiao = regioes.find((r) => r.id === meu.regiao_id)?.nome;
  const foto = urlSegura(meu.avatar_url);
  const estilo = resumo.estilo.length
    ? `Você é ${listaNatural(resumo.estilo.slice(0, 3).map((e) => `${e.pct}% ${e.nome.toLowerCase()}`))}.`
    : 'Faça um check-in ou poste um Pulso para descobrir seu jeito de sair.';

  montar($('#perfil'), html`
    <div class="profile-face">${foto ? html`<img src="${foto}" alt="">` : iniciais(meu.nome)}</div>
    <h1>${meu.nome}</h1>
    <p>@${meu.username}${regiao ? ` · ${regiao}` : ''}</p>
    ${meu.bio ? html`<p>${meu.bio}</p>` : ''}
    <button class="link-texto" type="button" id="editar">${icone('edit')} EDITAR PERFIL</button>
    <div class="profile-stats">
      <div class="stat"><strong>${resumo.lugares}</strong><span>LUGARES</span></div>
      <div class="stat"><strong>${resumo.pulsos}</strong><span>PULSOS</span></div>
      <div class="stat"><strong>${resumo.turmas}</strong><span>TURMAS</span></div>
    </div>
    <div class="identity">
      <h3>${tituloDoNivel(resumo.nivel)}</h3>
      <p>${estilo}</p>
      <div class="xp">
        <div class="xp-topo"><span>NÍVEL ${resumo.nivel}</span><span>${resumo.xp} / ${resumo.xp_proximo_nivel} XP</span></div>
        <div class="xp-barra" role="progressbar" aria-label="Progresso até o próximo nível"
          aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progresso}"><span style="--p:${progresso}%"></span></div>
      </div>
    </div>
    <h2 class="titulo-secao">CONQUISTAS · ${obtidas.size}/${catalogo.length}</h2>
    <div class="conquistas">
      ${catalogo.map((c) => html`<div class="conquista${obtidas.has(c.codigo) ? '' : ' bloqueada'}">
        <strong>${c.nome}</strong><span>${c.descricao} +${c.xp} XP</span></div>`)}
    </div>
    <a class="physical full" href="retrospectiva.html">VER MEU MÊS ${icone('share')}</a>
    <a class="physical lime full" href="salvos.html">MEUS LUGARES SALVOS</a>`);

  $('#editar').addEventListener('click', abrirEdicao);
}

function abrirEdicao() {
  $('#nome').value = meu.nome;
  $('#username').value = meu.username;
  $('#bio').value = meu.bio ?? '';
  $('#foto').value = '';
  montar($('#regiao'), html`<option value="">Prefiro não dizer</option>
    ${regioes.map((r) => html`<option value="${r.id}">${r.nome}</option>`)}`);
  $('#regiao').value = meu.regiao_id ?? '';
  $('#usernameInfo').textContent = 'Letras minúsculas, números, ponto e _.';
  $('#usernameInfo').className = '';
  mostrarAviso($('#formPerfil .aviso'), '');
  $('#dialogoEditar').showModal();
}

function verificarUsername() {
  const campo = $('#username');
  const info = $('#usernameInfo');
  const valor = normalizarUsername(campo.value);
  if (valor !== campo.value) campo.value = valor;
  clearTimeout(verificacao);
  if (valor === meu.username) {
    info.textContent = 'Esse é o seu usuário atual.';
    info.className = '';
    return;
  }
  if (!usernameValido(valor)) {
    info.textContent = 'Use de 3 a 24 caracteres.';
    info.className = 'erro';
    return;
  }
  info.textContent = 'Verificando...';
  info.className = '';
  verificacao = setTimeout(async () => {
    const livre = await perfil.usernameDisponivel(valor).catch(() => null);
    if (campo.value !== valor || livre === null) return;
    info.textContent = livre ? `@${valor} está livre!` : `@${valor} já está em uso.`;
    info.className = livre ? 'ok' : 'erro';
  }, 400);
}

async function salvar(evento) {
  evento.preventDefault();
  const aviso = $('#formPerfil .aviso');
  const botao = $('#salvarPerfil');
  botao.disabled = true;
  try {
    const dados = {
      nome: $('#nome').value.trim(),
      username: normalizarUsername($('#username').value),
      bio: $('#bio').value.trim() || null,
      regiao_id: $('#regiao').value ? Number($('#regiao').value) : null,
    };
    if (dados.nome.length < 2) throw new Error('O nome precisa ter pelo menos 2 letras.');
    if (!usernameValido(dados.username)) throw new Error('O usuário precisa ter de 3 a 24 caracteres: letras minúsculas, números, ponto ou _.');
    if (dados.username !== meu.username && !(await perfil.usernameDisponivel(dados.username))) {
      throw new Error('Esse usuário já está em uso.');
    }
    const foto = $('#foto').files[0];
    if (foto) {
      if (foto.size > LIMITE_FOTO) throw new Error('A foto passa de 2 MB.');
      dados.avatar_url = await perfil.enviarAvatar(foto);
    }
    await perfil.atualizar(dados);
    location.reload();
  } catch (erro) {
    mostrarAviso(aviso, erro.message);
    botao.disabled = false;
  }
}
