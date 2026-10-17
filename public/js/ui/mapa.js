// Google Maps no Radar e Street View na página do lugar.
// A API só é carregada quando uma dessas experiências é aberta.
import { GOOGLE_MAP_ID, GOOGLE_MAPS_KEY } from '../config.js';

export const CENTRO_BH = { lat: -19.9245, lng: -43.9352 };
// Primeiro procuramos na rua do próprio lugar; só depois ampliamos. Um raio
// grande logo de cara devolve a rua errada sem ninguém perceber.
export const RAIO_STREET_VIEW = 120;
export const RAIO_STREET_VIEW_AMPLO = 400;
// Acima disso a imagem já não é a fachada do lugar, e a tela avisa.
export const DISTANCIA_CONFORTAVEL = 60;

// Mapa social inspirado no Bump: base clara, quarteirões suaves, vias brancas,
// parques vivos e água azul. Os POIs do Google continuam visíveis e clicáveis.
export const ESTILO_GOOGLE = [
  { elementType: 'geometry', stylers: [{ color: '#f4f2e9' }] },
  { elementType: 'labels.icon', stylers: [{ saturation: 58 }, { lightness: 3 }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#626873' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }, { weight: 4 }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.neighborhood', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f4f2e9' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry.stroke', stylers: [{ color: '#deddd4' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#f0eee5' }] },
  { featureType: 'poi.business', elementType: 'labels', stylers: [{ visibility: 'on' }] },
  { featureType: 'poi.business', elementType: 'labels.text.fill', stylers: [{ color: '#9d5835' }, { saturation: 35 }] },
  { featureType: 'poi.business', elementType: 'labels.icon', stylers: [{ saturation: 78 }, { lightness: 2 }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#b9ee91' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#39754d' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#dfded6' }] },
  { featureType: 'road.local', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.highway', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#fbfdfc' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#dff2c8' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#b8d99b' }] },
  { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: '#d8d8d2' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#7dcff2' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#2879a5' }] },
];

// Transform aplicado à caixa externa; o pino pode continuar usando rotate().
export const ANCORAS = {
  pino: 'translate(-50%, -50%)',
  bolha: 'translate(-50%, -50%)',
};

let carregamento = null;

export function urlGoogleMaps() {
  const parametros = new URLSearchParams({
    key: GOOGLE_MAPS_KEY,
    loading: 'async',
    callback: '__valeSairGoogleMapsPronto',
    v: 'weekly',
    language: 'pt-BR',
    region: 'BR',
  });
  return `https://maps.googleapis.com/maps/api/js?${parametros}`;
}

export function carregarGoogleMaps() {
  if (globalThis.google?.maps) return Promise.resolve(globalThis.google.maps);
  if (!GOOGLE_MAPS_KEY) return Promise.reject(new Error('A chave do Google Maps não foi configurada.'));
  if (carregamento) return carregamento;

  carregamento = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timeout = setTimeout(() => {
      carregamento = null;
      delete globalThis.__valeSairGoogleMapsPronto;
      script.remove();
      reject(new Error('O Google Maps demorou demais para responder.'));
    }, 15000);

    globalThis.__valeSairGoogleMapsPronto = () => {
      clearTimeout(timeout);
      delete globalThis.__valeSairGoogleMapsPronto;
      resolve(globalThis.google.maps);
    };
    script.src = urlGoogleMaps();
    script.async = true;
    script.onerror = () => {
      clearTimeout(timeout);
      carregamento = null;
      reject(new Error('Não foi possível carregar o Google Maps.'));
    };
    document.head.append(script);
  });
  return carregamento;
}

// Exportada para ser testada sem navegador (tests/mapa-google.test.mjs).
export function criarClasseMarcador(maps) {
  return class MarcadorValeSair extends maps.OverlayView {
    constructor(elemento, posicao, tipo, mapa) {
      super();
      this.elemento = elemento;
      this.posicao = new maps.LatLng(posicao);
      this.tipo = tipo;
      this.caixa = document.createElement('div');
      this.caixa.className = `marcador marcador-${tipo}`;
      this.caixa.append(elemento);
      this.setMap(mapa);
    }

    onAdd() {
      this.getPanes().overlayMouseTarget.append(this.caixa);
    }

    draw() {
      // a projeção só existe depois que o mapa monta; sem ela (mapa ainda
      // carregando ou chave recusada) o marcador apenas espera a próxima vez
      const pixel = this.getProjection()?.fromLatLngToDivPixel(this.posicao);
      if (!pixel) return;
      this.caixa.style.left = `${pixel.x}px`;
      this.caixa.style.top = `${pixel.y}px`;
      this.caixa.style.transform = ANCORAS[this.tipo] ?? ANCORAS.bolha;
    }

    onRemove() {
      this.caixa.remove();
    }

    remove() {
      this.setMap(null);
    }
  };
}

export function opcoesDoMapa(maps, { centro, zoom = 14 } = {}) {
  return {
    center: centro,
    zoom,
    minZoom: 10,
    maxZoom: 18,
    ...(GOOGLE_MAP_ID ? { mapId: GOOGLE_MAP_ID } : { styles: ESTILO_GOOGLE }),
    clickableIcons: true,
    streetViewControl: true,
    streetViewControlOptions: { position: maps.ControlPosition.LEFT_BOTTOM },
    mapTypeControl: false,
    zoomControl: false,
    fullscreenControl: false,
    cameraControl: false,
    rotateControl: false,
    gestureHandling: 'cooperative',
    disableDefaultUI: false,
  };
}

export async function prepararMapa(elemento, { centro, zoom = 14 } = {}) {
  const maps = await carregarGoogleMaps();
  const mapa = new maps.Map(elemento, opcoesDoMapa(maps, { centro, zoom }));
  const Marcador = criarClasseMarcador(maps);
  const pronto = new Promise((resolve) => maps.event.addListenerOnce(mapa, 'idle', resolve));
  let marcadores = [];

  return {
    mapa,
    pronto,

    marcar(elementoInterno, posicao, tipo = 'pino') {
      const marcador = new Marcador(elementoInterno, posicao, tipo, mapa);
      marcadores.push(marcador);
      return marcador;
    },

    limpar() {
      marcadores.forEach((marcador) => marcador.remove());
      marcadores = [];
    },

    ajustar(pontos, recuo = { top: 150, right: 60, bottom: 110, left: 40 }) {
      if (!pontos.length) return;
      if (pontos.length === 1) {
        mapa.setCenter(pontos[0]);
        mapa.setZoom(16);
        return;
      }
      const limites = new maps.LatLngBounds();
      pontos.forEach((ponto) => limites.extend(ponto));
      mapa.fitBounds(limites, recuo);
      maps.event.addListenerOnce(mapa, 'idle', () => {
        if (mapa.getZoom() > 16) mapa.setZoom(16);
      });
    },

    centralizar(ponto, zoomDesejado) {
      mapa.panTo(ponto);
      if (zoomDesejado !== undefined) mapa.setZoom(zoomDesejado);
    },

    aproximar(passo) {
      mapa.setZoom((mapa.getZoom() ?? zoom) + passo);
    },

    umDedo(ligado) {
      mapa.setOptions({ gestureHandling: ligado ? 'greedy' : 'cooperative' });
    },

    redimensionar() {
      maps.event.trigger(mapa, 'resize');
    },
  };
}

// Direção em graus (0 = norte) de um ponto para outro, sobre a esfera. É a
// mesma conta da biblioteca "geometry" do Google, feita aqui porque é curta e
// porque assim dá para testá-la sem navegador.
export function calcularHeading(de, para) {
  const rad = Math.PI / 180;
  const deltaLng = (para.lng - de.lng) * rad;
  const lat1 = de.lat * rad;
  const lat2 = para.lat * rad;
  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
  return ((Math.atan2(y, x) / rad) + 360) % 360;
}

// Distância em metros entre dois pontos (haversine). Serve para avisar quando a
// imagem mais próxima não é a porta do lugar.
export function calcularDistancia(de, para) {
  const rad = Math.PI / 180;
  const raioTerra = 6371000;
  const deltaLat = (para.lat - de.lat) * rad;
  const deltaLng = (para.lng - de.lng) * rad;
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(de.lat * rad) * Math.cos(para.lat * rad) * Math.sin(deltaLng / 2) ** 2;
  return Math.round(raioTerra * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// Procura um panorama pela forma com callback, e não pela que devolve promessa:
// depois que alguns panoramas são criados na mesma página, a versão em promessa
// passa a devolver undefined e a busca quebrava com "Cannot destructure data".
// O callback também entrega o status ("ZERO_RESULTS", "OK"...) sem adivinhação.
function procurarPanorama(servico, pedido, espera = 10000) {
  return new Promise((resolve, reject) => {
    const falhar = (status) => reject(Object.assign(new Error(`Street View: ${status}`), { status }));
    const relogio = setTimeout(() => falhar('TIMEOUT'), espera);
    servico.getPanorama(pedido, (dados, status) => {
      clearTimeout(relogio);
      if (status === 'OK' && dados) resolve(dados);
      else falhar(status ?? 'UNKNOWN_ERROR');
    });
  });
}

export async function prepararStreetView(elemento, posicao, { raio = RAIO_STREET_VIEW } = {}) {
  const maps = await carregarGoogleMaps();
  const biblioteca = await maps.importLibrary('streetView');
  const servico = new biblioteca.StreetViewService();

  // sources GOOGLE pede só as imagens de rua do Google. Sem isso a API devolve
  // a foto 360 mais próxima, que quase sempre é o interior de outra loja: em
  // A Obra vinha "Fotografia Empresarial BH", no Mercado Novo uma assistência
  // técnica. Se não houver imagem de rua perto, ampliamos o raio.
  let dados = null;
  let ultimoErro = null;
  for (const raioAtual of [raio, RAIO_STREET_VIEW_AMPLO]) {
    try {
      dados = await procurarPanorama(servico, {
        location: posicao,
        radius: raioAtual,
        preference: biblioteca.StreetViewPreference.NEAREST,
        sources: [biblioteca.StreetViewSource.GOOGLE],
      });
      break;
    } catch (erro) {
      ultimoErro = erro;
      if (erro?.status !== 'ZERO_RESULTS') break;
    }
  }
  if (!dados) {
    // Separar "não tem imagem" de "a chave foi recusada": antes tudo virava
    // "não encontramos Street View" e escondia problema de configuração.
    if (ultimoErro?.status === 'ZERO_RESULTS') {
      throw new Error(`Não encontramos imagem de rua em até ${RAIO_STREET_VIEW_AMPLO} m daqui.`);
    }
    throw new Error(`O Street View não respondeu agora (${ultimoErro?.status ?? 'erro'}).`);
  }

  const origem = { lat: dados.location.latLng.lat(), lng: dados.location.latLng.lng() };
  elemento.replaceChildren();
  const panorama = new biblioteca.StreetViewPanorama(elemento, {
    pano: dados.location.pano,
    // olhando para o estabelecimento, não para o norte
    pov: { heading: calcularHeading(origem, posicao), pitch: 0 },
    zoom: 1,
    visible: true,
    addressControl: true,
    linksControl: true,
    fullscreenControl: true,
    motionTracking: false,
    motionTrackingControl: false,
  });
  panorama.setVisible(true);
  panorama.focus();
  return {
    panorama,
    metros: calcularDistancia(origem, posicao),
    endereco: dados.location.description ?? dados.location.shortDescription ?? '',
  };
}
