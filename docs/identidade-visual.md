# Identidade visual

**Y2K + grafite + scrapbook.** Papel com textura, fita adesiva, carimbo e sombra dura, sem gradiente e sem sombra difusa. A régua é simples: contorno preto grosso, um deslocamento sólido no lugar da sombra e cor cheia.

O CSS está em camadas, na ordem em que `css/estilo.css` importa:

| Arquivo | Conteúdo |
| --- | --- |
| `tokens.css` | cores, fontes, traços, sombras, espaçamentos e curvas de animação |
| `base.css` | reset, tipografia de marca e ícones |
| `layout.css` | o esqueleto de todas as páginas e a responsividade |
| `componentes.css` | botões, cartões, etiquetas, formulários, chat, enquete... |
| `telas.css` | o que é específico de cada tela |
| `movimento.css` | animações e a preferência de reduzir movimento |

## Cores

| Token | Cor | Uso |
| --- | --- | --- |
| `--ink` | `#111` | traço, texto e sombra dura |
| `--paper` | `#eee5d2` | fundo do app |
| `--sand` | `#d7cfbd` | fundo da página no tablet e no desktop |
| `--blue` | `#185cf5` | ação principal e destaque |
| `--lime` | `#ccff27` | confirmação, seleção e "animado" |
| `--coral` | `#ff405b` | urgência, "cheio" e criar |
| `--purple` | `#7c39a6` | cenas e amigos por região |
| `--sky` | `#19a9f2` | tela de abertura |

Movimento tem cor: **tranquilo** é branco, **animado** é lima, **cheio** é coral e **lotado** é preto com texto lima.

## Tipografia

| Papel | Fonte |
| --- | --- |
| Títulos | Impact, com **Anton** como reserva |
| Etiquetas e dados | Courier New, com **Courier Prime** como reserva |
| Texto corrido | Arial / system sans |

Impact e Courier New existem no Windows, no Mac e no iPhone, mas não no Android nem no Linux. Por isso as reservas do Google Fonts vêm depois na lista: o navegador só baixa a fonte se precisar dela, então quem já tem Impact não paga nada por isso.

## Componentes

- **Botão físico** (`.physical`): contorno de 3px, sombra sólida de 5px e, ao ser pressionado, desloca 3px e perde a sombra — como se afundasse.
- **Selo de movimento** (`.selo`, `.live-badge`): círculo carimbado com a situação do lugar.
- **Etiqueta de papel** (`.paper-tag`) e **adesivo** (`.photo-sticker`): coladas tortas sobre as fotos.
- **Cartão de Pulso** (`.pulse-card`): a foto tratada como polaroide, levemente girada.
- **Ingresso** (`.ticket`): usado no Chama da Turma, com o recorte lateral no `clip-path`.
- **Mascotes**: Faísca (Agora), Radar (mapa) e Papo (Sala), que entram em cena e reagem ao toque.

Ícones ficam num sprite SVG único (`assets/icons.svg`), com traço de 2,35px, herdando a cor do texto.

## Grade e responsividade

| Faixa | Layout |
| --- | --- |
| até 599px | coluna única, largura total, barra de navegação fixa embaixo |
| 600px a 1099px | coluna de 480px centralizada sobre o fundo pontilhado, com contorno e sombra azul |
| 1100px ou mais | três colunas: menu lateral (220px), conteúdo (520px) e painel da marca (250px); a barra inferior some |

Nada é escondido no celular: o desktop ganha navegação lateral em vez de espremer a mesma barra.

## Mapa

O mapa do Radar segue o **Bump**, o app do time do Zenly: mapa de brinquedo, não mapa de navegação. Ruas brancas e grossas sem contorno, água em azul vibrante, parques verdes, nenhum ponto de interesse da Google e quase nenhum rótulo — só bairro e cidade. Assim o mapa vira cenário, e quem aparece são os lugares e as pessoas.

As cores saem dos mesmos tokens do app: base em papel (`#eee5d2`), ruas brancas, avenidas em creme e água num azul saturado. Os marcadores são os componentes que já existiam — o pino em gota com o selo de movimento e a bolha do amigo, que no mapa real ganha o primeiro nome embaixo, como no Bump.

O quadro do mapa mantém a moldura preta e a sombra dura do resto do app, com botões de aproximar, afastar e tela cheia no canto. A marca da Google fica visível no rodapé do mapa, como exigem os termos de uso.

## Movimento

As animações imitam recorte e carimbo, com `steps()` no lugar de transições suaves: a tela entra como folha caindo, adesivos são "batidos", pinos caem no mapa e o voto recebe um carimbo. Cada toque solta recortes de papel coloridos.

Tudo isso desaparece para quem pediu: `prefers-reduced-motion` do sistema **ou** a chave "reduzir movimento" na tela de privacidade, que é gravada no aparelho e aplicada antes da primeira pintura.

## Acessibilidade

- Navegação com links reais, foco visível (contorno azul de 3px) e alvos de toque de 44px ou mais.
- Estados anunciados por `aria-pressed`, `aria-checked`, `aria-current` e `aria-live` (avisos e listas que mudam sozinhas).
- Diálogos usam `<dialog>` nativo: foco preso, `Esc` fecha.
- Texto sempre em cima de cor cheia; nada de texto sobre foto sem faixa escura.
