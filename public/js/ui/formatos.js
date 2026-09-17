// Funções puras de formatação e regras de apresentação (testadas em tests/).
const FUSO = 'America/Sao_Paulo';

export const MOVIMENTOS = ['tranquilo', 'animado', 'cheio', 'lotado'];

const MOVIMENTO = {
  tranquilo: { rotulo: 'TRANQUILO', etiqueta: 'TÁ TRANQUILO', icone: 'clock' },
  animado: { rotulo: 'ANIMADO', etiqueta: 'TÁ ANIMADO', icone: 'spark' },
  cheio: { rotulo: 'CHEIO', etiqueta: 'TÁ PEGANDO', icone: 'flame' },
  lotado: { rotulo: 'LOTADO', etiqueta: 'LOTOU', icone: 'flame' },
};
const SEM_PULSO = { rotulo: 'SEM PULSO', etiqueta: 'SEM PULSO AGORA', icone: 'camera' };

export const rotuloMovimento = (movimento) => MOVIMENTO[movimento] ?? SEM_PULSO;

export const FILAS = [
  { minutos: 0, rotulo: 'SEM FILA' },
  { minutos: 10, rotulo: 'ATÉ 10 MIN' },
  { minutos: 20, rotulo: '10 A 30 MIN' },
  { minutos: 45, rotulo: '30 MIN+' },
];

export function rotuloFila(minutos) {
  if (minutos === null || minutos === undefined) return null;
  if (minutos === 0) return 'SEM FILA';
  if (minutos >= 60) return 'FILA 1H+';
  return `FILA ${minutos} MIN`;
}

export function tempoRelativo(data, agora = Date.now()) {
  const minutos = Math.floor(Math.max(0, agora - new Date(data).getTime()) / 60000);
  if (minutos < 1) return 'agora';
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'ontem';
  if (dias < 7) return `há ${dias} dias`;
  return new Date(data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: FUSO });
}

// "SEX · 11/09 · 19H30"
export function formatarQuando(data) {
  const d = new Date(data);
  const semana = d.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: FUSO }).replace('.', '');
  const dia = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: FUSO });
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: FUSO }).replace(':', 'H');
  return `${semana} · ${dia} · ${hora}`.toLocaleUpperCase('pt-BR');
}

export function horaCurta(data) {
  return new Date(data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: FUSO }).replace(':', 'h');
}

// "02:00:00" -> "02h"; "23:30:00" -> "23h30"
export function horario(hora) {
  if (!hora) return null;
  const [h, m] = hora.split(':');
  return m === '00' ? `${h}h` : `${h}h${m}`;
}

export const faixaPreco = (nivel) => '$'.repeat(Math.min(Math.max(nivel ?? 2, 1), 4));

// Distância em linha reta (fórmula de haversine), em km
export function distanciaKm(a, b) {
  const rad = (graus) => (graus * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export function formatarDistancia(km) {
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} M`;
  return `${km.toFixed(1).replace('.', ',')} KM`;
}

const semAcento = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '');

export function iniciais(nome = '') {
  const partes = semAcento(nome).trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '?';
  const letras = partes.length > 1 ? partes[0][0] + partes.at(-1)[0] : partes[0].slice(0, 2);
  return letras.toUpperCase();
}

export const normalizarUsername = (valor = '') => semAcento(valor.toLowerCase()).replace(/[^a-z0-9_.]/g, '').slice(0, 24);
export const usernameValido = (valor = '') => /^[a-z0-9_.]{3,24}$/.test(valor);

// Comparação de busca sem diferenciar maiúsculas nem acentos
export const paraBusca = (texto = '') => semAcento(texto.toLowerCase());

// ["a", "b", "c"] -> "a, b e c"
export const listaNatural = (itens) => new Intl.ListFormat('pt-BR', { style: 'long', type: 'conjunction' }).format(itens);

const TITULOS = ['NOVATO DA NOITE', 'CURIOSO DO ROLÊ', 'EXPLORADOR DA NOITE', 'GUIA DA CIDADE', 'LENDA DO ROLÊ'];
export const tituloDoNivel = (nivel) => TITULOS[Math.min(Math.max(nivel || 1, 1), TITULOS.length) - 1];

export const porcentagem = (parte, total) => (total ? Math.round((parte / total) * 100) : 0);

export function mesPorExtenso(data) {
  const d = typeof data === 'string' ? new Date(`${data.slice(0, 10)}T12:00:00Z`) : data;
  return d.toLocaleDateString('pt-BR', { month: 'long', timeZone: FUSO }).toLocaleUpperCase('pt-BR');
}

// Projeta latitude/longitude dentro de um retângulo, em %, com margens para
// os pinos não ficarem colados na borda nem atrás da legenda do mapa.
export function criarProjecao(pontos, margem = { topo: 0.2, base: 0.3, lados: 0.12 }) {
  if (!pontos.length) return () => ({ x: 50, y: 50 });
  let minLat = Math.min(...pontos.map((p) => p.lat));
  let maxLat = Math.max(...pontos.map((p) => p.lat));
  let minLng = Math.min(...pontos.map((p) => p.lng));
  let maxLng = Math.max(...pontos.map((p) => p.lng));
  if (maxLat - minLat < 0.002) { minLat -= 0.001; maxLat += 0.001; }
  if (maxLng - minLng < 0.002) { minLng -= 0.001; maxLng += 0.001; }
  return ({ lat, lng }) => ({
    x: (margem.lados + (1 - 2 * margem.lados) * ((lng - minLng) / (maxLng - minLng))) * 100,
    y: (margem.topo + (1 - margem.topo - margem.base) * ((maxLat - lat) / (maxLat - minLat))) * 100,
  });
}

const EXTENSOES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};
export function extensaoDoArquivo(arquivo) {
  return EXTENSOES[arquivo.type] ?? ((arquivo.name ?? '').split('.').pop() || 'bin').toLowerCase();
}

// Só aceita voltar para páginas do próprio app (evita redirecionamento aberto).
export function destinoSeguro(valor, padrao = 'agora.html') {
  return /^[a-z0-9-]+\.html(\?[\w=&%.-]*)?$/i.test(valor ?? '') ? valor : padrao;
}
