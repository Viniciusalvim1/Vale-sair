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
2. **Lugares:** rode `supabase/seed.sql` (os 8 lugares de BH usados na demonstração).
3. **Dados de demonstração (opcional):** `supabase/demo/dados-demo.sql` cria pessoas fictícias, Turma, Pulsos, Sala e um Chama aberto, para o app não ficar vazio na apresentação. Pode rodar de novo para renovar os Pulsos, que expiram em 2 horas. Para apagar: `supabase/demo/remover-demo.sql`.
4. **Chaves:** copie a URL e a *publishable key* do projeto para `public/js/config.js`. Essa chave pode ficar no front-end: quem protege os dados são as políticas de RLS.
5. **Autenticação:** em *Authentication → URL Configuration*, coloque o endereço do site publicado em **Site URL** e em **Redirect URLs**, para os links de confirmação de e-mail e de nova senha voltarem para o app.

## Mapa do Radar

O Radar usa **MapLibre GL JS** com os tiles abertos do **OpenFreeMap**. Não exige chave, conta, cartão ou faturamento. A biblioteca está versionada em `public/vendor/`, então a aplicação não depende de uma CDN para carregar o código do mapa; os tiles e as fontes continuam vindo da internet.

O estilo inspirado no Bump fica em `public/js/ui/estilo-mapa.js`, e os marcadores são componentes HTML do próprio app, posicionados pelo MapLibre (`public/js/ui/mapa.js`). Se os tiles estiverem indisponíveis, a interface continua utilizável e informa a falha sem derrubar as outras telas.

## Testes

```bash
npm test
```

São 31 testes: 17 aplicam as migrations reais num PostgreSQL em memória e conferem regras de negócio, RLS e privilégios (inclusive tentando burlá-los), e 14 cobrem formatação, proteção contra XSS e o mapa do front-end.

## Estrutura

```
public/                 o app (é o que vai para o ar)
├── *.html              uma página por tela
├── css/                tokens, base, layout, componentes, telas e movimento
├── js/
│   ├── config.js       URL e chave pública do Supabase
│   ├── api/            sessão, cliente REST, autenticação e operações
│   ├── ui/             HTML seguro, formatação, componentes e efeitos
│   └── paginas/        um módulo por tela
└── assets/             ícones, favicon e imagens

supabase/
├── migrations/         estrutura, regras de negócio, views, segurança, storage e catálogos
├── seed.sql            lugares de Belo Horizonte
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
