# Vale Sair?

Demo interativa de uma rede social para descobrir, acompanhar e compartilhar rolês em tempo real.

## Demo publicada

https://vale-sair-demo.espa-o-de-tr-4556.chatgpt.site

## Executar localmente

O projeto é estático, sem build. Abra `index.html` no navegador ou inicie um servidor local:

```bash
python3 -m http.server 8000
```

Depois acesse `http://localhost:8000`.

## Estrutura

```
index.html    página única: markup, CSS e JS inline, ícones em sprite SVG
assets/       imagens (faisca, papo, radar, role-bh)
```

## Experiência incluída

- descoberta de locais e feed ao vivo
- detalhes do local e pulso em tempo real
- fluxo “Chama” para combinar rolês
- comunidades, cenas e notificações
- personagens e animações autorais
- interface responsiva sem uso de emojis
