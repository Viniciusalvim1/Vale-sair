// Radar: mapa de verdade (MapLibre + OpenFreeMap) com os lugares nas
// coordenadas reais e os amigos conforme a privacidade de cada um. Se o mapa
// não abrir (navegador sem WebGL, por exemplo), cai no mapa ilustrado.
import { exigirLogin } from '../api/auth.js';
import { locais, presenca } from '../api/dados.js';
import { montarShell } from '../ui/shell.js';
import { html, montar, icone, $, $$ } from '../ui/dom.js';
import { avisar, tratarErro, reiniciarAnimacao, movimentoReduzido } from '../ui/feedback.js';
import { criarProjecao, rotuloMovimento, iniciais, distanciaKm, formatarDistancia } from '../ui/formatos.js';
import { avatar, linhaDeStatus, resumoDoLocal, seloMovimento } from '../ui/componentes.js';
import { prepararMapa } from '../ui/mapa.js';
import { CENTRO_BH } from '../ui/estilo-mapa.js';

const ANIMADOS = ['animado', 'cheio', 'lotado'];

let todos = [];
let amigos = [];
let filtroAtual = 'todos';
let minhaPosicao = null;
let regiaoEmAlta = null;
let controle = null; // mapa real; null significa mapa ilustrado
let projetar = () => ({ x: 50, y: 50 });

const ponto = (item) => ({ lat: Number(item.latitude), lng: Number(item.longitude) });

if (exigirLogin()) iniciar();

async function iniciar() {
  montarShell();
  ligarControles();
  try {
    [todos, amigos] = await Promise.all([locais.emAlta(), presenca.amigosPorPerto()]);
  } catch (erro) {
    tratarErro(erro);
    return;
  }
  projetar = criarProjecao(todos.map(ponto));
  await abrirMapa();
  desenhar();
  mostrarNota();
  mostrarQueremSair();
}

async function abrirMapa() {
  const caixa = $('#mapaReal');
  caixa.hidden = false; // o mapa precisa de um container com tamanho
  try {
    controle = await prepararMapa(caixa, {
      centro: CENTRO_BH,
      zoom: 14,
      semAnimacao: movimentoReduzido(),
    });
    $('#mapa').classList.add('com-mapa');
    controle.pronto.then(() => $('#mapa').classList.add('mapa-pronto'));
  } catch (erro) {
    controle = null;
    caixa.hidden = true;
    console.warn('Mapa indisponível:', erro.message);
    $('#avisoMapa').textContent = 'Não deu para abrir o mapa neste navegador. Seguindo com o mapa ilustrado.';
    $('#avisoMapa').hidden = false;
  }
}

// ---------- desenho ----------
function passaNoFiltro(local, comAmigos) {
  switch (filtroAtual) {
    case 'amigos': return comAmigos.has(local.id);
    case 'sem-fila': return local.fila_minutos === 0;
    case 'ao-vivo': return local.musica_ao_vivo;
    default: return true;
  }
}

function elemento(marcacao) {
  const molde = document.createElement('div');
  molde.innerHTML = String(marcacao);
  return molde.firstElementChild;
}

function pinoHtml(local, estilo = '') {
  const conteudo = local.pessoas_agora > 0 ? local.pessoas_agora : icone(rotuloMovimento(local.movimento).icone);
  return html`<button class="pin ${local.movimento ?? ''}" type="button" data-local="${local.id}" style="${estilo}"
    aria-label="${local.nome}: ${linhaDeStatus(local)}"><span>${conteudo}</span></button>`;
}

function amigoHtml(amigo, estilo = '', comNome = false) {
  const onde = amigo.situacao === 'no_local' ? `está em ${amigo.local_nome}` : `está pela região ${amigo.regiao}`;
  return html`<span class="friend-dot${amigo.situacao === 'na_regiao' ? ' na-regiao' : ''}" style="${estilo}"
    role="img" aria-label="${amigo.nome} ${onde}" title="${amigo.nome} ${onde}">${iniciais(amigo.nome)}${
      comNome ? html`<span class="friend-nome">${amigo.nome.split(' ')[0]}</span>` : ''}</span>`;
}

const voceHtml = (estilo = '') =>
  html`<span class="friend-dot voce" style="${estilo}" role="img" aria-label="Você está aqui">VOCÊ</span>`;

function desenhar() {
  const comAmigos = new Set(amigos.filter((a) => a.local_id).map((a) => a.local_id));
  const visiveis = todos.filter((local) => passaNoFiltro(local, comAmigos));
  if (controle) desenharNoMapa(visiveis);
  else desenharIlustrado(visiveis);
  return visiveis.length;
}

function desenharNoMapa(visiveis) {
  controle.limpar();
  montar($('#pinos'), '');

  visiveis.forEach((local) => {
    const pino = elemento(pinoHtml(local));
    pino.addEventListener('click', () => abrirPrevia(local));
    controle.marcar(pino, ponto(local), 'pino');
  });

  amigos
    .filter((amigo) => amigo.latitude !== null)
    .forEach((amigo) => controle.marcar(elemento(amigoHtml(amigo, '', true)), ponto(amigo), 'bolha'));

  if (minhaPosicao) controle.marcar(elemento(voceHtml()), minhaPosicao, 'bolha');

  controle.ajustar([...visiveis.map(ponto), ...(minhaPosicao ? [minhaPosicao] : [])]);
}

// Mapa ilustrado: as mesmas coordenadas, projetadas em % dentro do quadro.
function desenharIlustrado(visiveis) {
  const pinos = visiveis.map((local, i) => {
    const { x, y } = projetar(ponto(local));
    return pinoHtml(local, `--x:${x.toFixed(2)}%;--y:${y.toFixed(2)}%;--d:${(i * 0.06).toFixed(2)}s`);
  });

  const pontosDeAmigos = amigos
    .filter((amigo) => amigo.latitude !== null)
    .map((amigo, i) => {
      const { x, y } = projetar(ponto(amigo));
      return amigoHtml(amigo, `--x:calc(${x.toFixed(2)}% + ${22 + (i % 2) * 10}px);--y:calc(${y.toFixed(2)}% - ${40 + (i % 3) * 12}px)`);
    });

  let voce = '';
  if (minhaPosicao) {
    const { x, y } = projetar(minhaPosicao);
    voce = voceHtml(`--x:${x.toFixed(2)}%;--y:${y.toFixed(2)}%`);
  }

  montar($('#pinos'), [pinos, pontosDeAmigos, voce]);
}

// ---------- informações abaixo do mapa ----------
function mostrarNota() {
  const porRegiao = new Map();
  todos.forEach((local) => porRegiao.set(local.regiao, (porRegiao.get(local.regiao) ?? 0) + local.pulsos_ativos));
  const [regiao, pulsosNaRegiao] = [...porRegiao].sort((a, b) => b[1] - a[1])[0] ?? [];
  regiaoEmAlta = pulsosNaRegiao ? regiao : null;
  const animados = todos.filter((local) => ANIMADOS.includes(local.movimento)).length;
  const perto = amigos.filter((amigo) => amigo.situacao !== 'quer_sair').length;
  montar($('#notaMapa'), html`<strong>${regiaoEmAlta ? `${regiaoEmAlta} subindo` : 'Noite começando'}</strong>
    ${perto} ${perto === 1 ? 'amigo' : 'amigos'} por perto · ${animados} ${animados === 1 ? 'lugar animado' : 'lugares animados'}`);
}

function mostrarQueremSair() {
  const lista = amigos.filter((amigo) => amigo.situacao === 'quer_sair');
  const alvo = $('#queremSair');
  alvo.hidden = !lista.length;
  if (!lista.length) return;
  montar(alvo, html`<h2 class="titulo-secao">QUEREM SAIR ↘</h2>
    <div class="availability">
      ${lista.map((amigo) => html`<div class="person-status">${avatar(amigo.nome)}
        <span><strong>${amigo.nome}</strong><small>@${amigo.username}${amigo.regiao ? ` · ${amigo.regiao}` : ''}</small></span>
        <span class="status-pill">QUER SAIR</span></div>`)}
    </div>`);
}

// ---------- interação ----------
function ligarControles() {
  $$('.filter').forEach((botao) => botao.addEventListener('click', () => filtrar(botao)));
  $('#pinos').addEventListener('click', cliqueNoPinoIlustrado);
  $('[data-mascote="radar"]').addEventListener('click', ouvir);
  $('#minhaLocalizacao').addEventListener('click', localizar);
  $('#maisZoom').addEventListener('click', () => controle?.aproximar(1));
  $('#menosZoom').addEventListener('click', () => controle?.aproximar(-1));
  $('#telaCheia').addEventListener('click', alternarTelaCheia);
  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' && $('#mapa').classList.contains('cheia')) alternarTelaCheia();
  });
}

function filtrar(botao) {
  filtroAtual = botao.dataset.filtro;
  $$('.filter').forEach((outro) => outro.setAttribute('aria-pressed', String(outro === botao)));
  const total = desenhar();
  avisar(total ? `Radar filtrado: ${botao.textContent.toLowerCase()}` : 'Nada por aqui com esse filtro agora.');
}

function cliqueNoPinoIlustrado(evento) {
  const pino = evento.target.closest('[data-local]');
  if (!pino) return;
  abrirPrevia(todos.find((local) => local.id === pino.dataset.local));
}

function abrirPrevia(local) {
  const aqui = amigos.filter((amigo) => amigo.local_id === local.id).map((amigo) => amigo.nome);
  const distancia = minhaPosicao ? formatarDistancia(distanciaKm(minhaPosicao, ponto(local))) : null;
  montar($('#previaConteudo'), html`
    <div class="sheet-head"><h2>${local.nome}</h2>
      <button class="close" type="button" data-fechar aria-label="Fechar">${icone('close')}</button></div>
    <div class="kicker">${local.categoria} · ${local.regiao}${distancia ? ` · ${distancia}` : ''}</div>
    <div class="venue-row">
      <div class="venue"><p>${resumoDoLocal(local)}</p><p>${linhaDeStatus(local)}</p></div>
      ${seloMovimento(local.movimento)}
    </div>
    ${aqui.length ? html`<p class="kicker">${aqui.join(', ')} ${aqui.length > 1 ? 'estão' : 'está'} aqui</p>` : ''}
    <div class="button-row">
      <a class="physical" href="aovivo.html?local=${local.id}">AO VIVO</a>
      <a class="physical blue" href="local.html?id=${local.id}">VER LOCAL</a>
    </div>`);
  $('#previa').showModal();
}

function ouvir(evento) {
  reiniciarAnimacao(evento.currentTarget, 'do-radar');
  const mapa = $('#mapa');
  reiniciarAnimacao(mapa, 'radar-scan');
  setTimeout(() => mapa.classList.remove('radar-scan'), 850);
  avisar(regiaoEmAlta ? `Radar captou: ${regiaoEmAlta} está subindo` : 'Radar ligado. Quando alguém postar um Pulso, aparece aqui.');
}

function alternarTelaCheia() {
  const mapa = $('#mapa');
  const cheia = mapa.classList.toggle('cheia');
  document.body.classList.toggle('mapa-cheio', cheia);
  $('#telaCheia').setAttribute('aria-label', cheia ? 'Fechar o mapa em tela cheia' : 'Abrir o mapa em tela cheia');
  controle?.umDedo(cheia);
  if (!controle) return;
  setTimeout(() => {
    controle.redimensionar();
    desenhar();
  }, 160);
}

// A localização é usada só no navegador: nada disso vai para o servidor.
function localizar() {
  if (!navigator.geolocation) {
    avisar('Seu navegador não informa a localização.');
    return;
  }
  avisar('Procurando você no mapa...');
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      const posicao = { lat: coords.latitude, lng: coords.longitude };
      if (!controle) {
        const { x, y } = projetar(posicao);
        if (x < 0 || x > 100 || y < 0 || y > 100) {
          avisar('Você está fora da área do mapa ilustrado.');
          return;
        }
      }
      minhaPosicao = posicao;
      desenhar();
      controle?.centralizar(posicao, 15);
      avisar('Achei você! Os lugares agora mostram a distância.');
    },
    () => avisar('Sem permissão de localização. Dá para liberar nas configurações do navegador.'),
    { timeout: 10000, maximumAge: 300000 },
  );
}
