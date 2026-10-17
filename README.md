# Vale Sair?

Rede social para descobrir **como os lugares de Belo Horizonte estão agora**, pelo olhar de quem está lá: movimento, fila e música em tempo real, com Turmas para combinar o rolê e votação que funciona até para quem não tem o app.

Projeto do **TI2** · PUC Minas. A etapa de Design Thinking (Matriz CSD, Mapa de Stakeholders e Roteiro de Entrevistas) orientou as funcionalidades que estão aqui.

## Como funciona

| Conceito | O que é |
| --- | --- |
| **Pulso** | Foto ou vídeo de até 7 segundos, sem filtro, com movimento e fila. Vale por 2 horas. |
| **Confirmação** | Quem também está no lugar confirma que o Pulso continua valendo. É o que gera o selo de confiança. |
| **Tô aqui** | Check-in manual. Suas Turmas veem onde você está só se você deixar. |
| **Turma** | Grupo fechado de amigos, com código de convite. |
| **Chama** | Enquete de 2 a 4 lugares. O link de votação funciona **sem conta**. |
| **Cena** | Comunidade aberta por estilo musical, com ranking dos lugares. |
| **Sala** | Chat de cada lugar, com selo "oficial" para o gestor. |

## Tecnologias

- **Front-end:** HTML, CSS e JavaScript puro (ES modules). Sem framework e sem etapa de build.
- **Back-end:** [Supabase](https://supabase.com) consumido pela **API RESTful** com `fetch`: `/rest/v1` (PostgREST), `/auth/v1` (autenticação) e `/storage/v1` (mídia dos Pulsos).
- **Banco:** PostgreSQL com migrations versionadas, RLS em todas as tabelas, views, funções e gatilhos.
- **Testes:** `node --test`, com o banco rodando em memória via PGlite.

## Rodando na sua máquina

Os módulos JavaScript não funcionam abrindo o HTML direto do disco, então use um servidor local:

```bash
npm install     # só para os testes; o app não tem dependências
npm run dev     # http://localhost:8000
```

Também funciona com a extensão **Live Server** do VS Code, apontando para a pasta `public/`.

## Configurando o Supabase

O projeto já aponta para o banco da equipe em `public/js/config.js`. Para criar outro do zero:

1. **Estrutura:** rode as migrations de `supabase/migrations/` em ordem, pelo SQL Editor ou pela CLI:
   ```bash
   supabase link --project-ref SEU_REF
   supabase db push
   ```
2. **Lugares:** rode `supabase/seed.sql` (18 lugares reais de Belo Horizonte — veja *Os lugares* abaixo).
3. **Dados de demonstração (opcional):** `supabase/demo/dados-demo.sql` cria pessoas fictícias, Turma, Pulsos, Sala e um Chama aberto, para o app não ficar vazio na apresentação. Pode rodar de novo para renovar os Pulsos, que expiram em 2 horas. Para apagar: `supabase/demo/remover-demo.sql`.
4. **Chaves:** copie a URL e a *publishable key* do projeto para `public/js/config.js`. Essa chave pode ficar no front-end: quem protege os dados são as políticas de RLS.
5. **Autenticação:** em *Authentication → URL Configuration*, coloque o endereço do site publicado em **Site URL** e em **Redirect URLs**, para os links de confirmação de e-mail e de nova senha voltarem para o app.

## Os lugares

Os 18 lugares de `supabase/seed.sql` são estabelecimentos **reais** de Belo Horizonte — Mercado Central, Mercado Novo, Mercado Distrital de Santa Tereza, Cantina do Lucas, Sindicato do Chopp, Zona, A Obra, Jack Rock Bar, Duke'n'Duke, Moema, Albanos, Mercearia Lacerda, Bar do Museu Clube da Esquina, Casa do Samba Resenha, Granfinos, Bar do Bolão, BeFly Hall e Cine Theatro Brasil Vallourec.

Nome, endereço e coordenadas vêm do **OpenStreetMap** (© colaboradores do OpenStreetMap, dados sob a licença [ODbL](https://www.openstreetmap.org/copyright)), consultados pela Overpass API. Gênero musical, música ao vivo e descrição foram preenchidos pela equipe; horário de fechamento e foto ficaram em branco de propósito, para ninguém publicar informação errada sobre um lugar de verdade.

Como são lugares reais, os dados de `supabase/demo/` (movimento, fila, mensagens) são **inventados** e precisam ser removidos com `supabase/demo/remover-demo.sql` antes de qualquer uso público: ninguém deve ler "cheio, fila de 8 minutos" sobre um bar que não disse isso.

## Mapa do Radar

O Radar usa a **Google Maps JavaScript API**. Os estabelecimentos do mapa-base continuam visíveis e clicáveis, e o controle do Pegman permite entrar no Street View. Na página de cada lugar, o botão **Street View** abre diretamente a imagem panorâmica mais próxima das coordenadas cadastradas.

A chave de navegador fica em `public/js/config.js`. No Google Cloud, ela deve ter restrição de aplicativo por **sites (HTTP referrers)** e restrição de API somente para **Maps JavaScript API**. Cadastre `http://localhost:8000/*` para desenvolvimento e os domínios reais da publicação. O Google Maps exige faturamento habilitado e aplica sua própria cota; o app carrega a API somente quando o Radar ou o Street View são usados.

Os marcadores sociais continuam sendo componentes HTML do Vale Sair, posicionados sobre o Google Maps por `public/js/ui/mapa.js`. Se o serviço estiver indisponível, o Radar mantém o mapa ilustrado como alternativa. Avaliações detalhadas dentro da interface não fazem parte desta integração: para exibi-las em componentes próprios, seria necessário habilitar também a **Places API** e respeitar suas regras de exibição.

## Testes

```bash
npm test
```

São 35 testes: 17 aplicam as migrations reais num PostgreSQL em memória e conferem regras de negócio, RLS e privilégios (inclusive tentando burlá-los), e 18 cobrem formatação, proteção contra XSS, Google Maps, mapa social e Street View no front-end.

## Estrutura

```
public/                 o app (é o que vai para o ar)
├── *.html              uma página por tela
├── css/                tokens, base, layout, componentes, telas e movimento
├── js/
│   ├── config.js       chaves públicas do Supabase e Google Maps
│   ├── api/            sessão, cliente REST, autenticação e operações
│   ├── ui/             HTML seguro, formatação, componentes e efeitos
│   └── paginas/        um módulo por tela
└── assets/             ícones, favicon e imagens

supabase/
├── migrations/         estrutura, regras de negócio, views, segurança, storage e catálogos
├── seed.sql            os 18 lugares reais de Belo Horizonte (OpenStreetMap)
└── demo/               dados fictícios para testes e apresentação

docs/                   documentação do projeto
prototipo/              a demo original em HTML, que deu origem ao app
tests/                  testes do banco e do front
scripts/                servidor de desenvolvimento
```

## Documentação

- [Banco de dados](docs/banco-de-dados.md) — modelo relacional, views, funções e segurança
- [Arquitetura](docs/arquitetura.md) — como as telas conversam com a API
- [API REST](docs/api-rest.md) — como o front consome o Supabase
- [Identidade visual](docs/identidade-visual.md) — cores, tipografia, componentes e responsividade
- [Sprints](docs/sprints.md) — planejamento e andamento das entregas

## Publicação

O app é estático: basta servir a pasta `public/`. Na Vercel, importe o repositório e use o preset "Other" com *Output Directory* = `public`.
