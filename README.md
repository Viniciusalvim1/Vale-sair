# Vale Sair?

Demo interativa de uma rede social para descobrir, acompanhar e compartilhar rolês em tempo real.

## Demo publicada

https://vale-sair-demo.espa-o-de-tr-4556.chatgpt.site

## Executar localmente

Os arquivos estáticos estão em `dist/`. Abra `dist/index.html` no navegador ou inicie um servidor local:

```bash
python3 -m http.server 8000 --directory dist
```

Depois acesse `http://localhost:8000`.

## Deploy na Vercel

O projeto é um site estático servido a partir de `dist/` (configurado em `vercel.json`, sem etapa de build).

1. Em https://vercel.com/new, importe o repositório `viniciusalvim1/vale-sair`.
2. Mantenha **Framework Preset** como *Other*; as demais opções vêm do `vercel.json`.
3. Clique em **Deploy**. Cada push na `main` gera um deploy de produção e cada PR ganha um preview.

Pela CLI:

```bash
npm i -g vercel
vercel        # preview
vercel --prod # produção
```

## Experiência incluída

- descoberta de locais e feed ao vivo
- detalhes do local e pulso em tempo real
- fluxo “Chama” para combinar rolês
- comunidades, cenas e notificações
- personagens e animações autorais
- interface responsiva sem uso de emojis
