// Servidor local sem dependências: `npm run dev` e abra http://localhost:8000
// (os módulos JavaScript não funcionam abrindo o HTML direto do disco).
// Se existir public/js/config.local.js, ele substitui o config.js: útil para
// apontar para outro projeto Supabase sem mexer no arquivo versionado.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../public/', import.meta.url));
const porta = Number(process.env.PORT) || 8000;
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

const existe = (caminho) => stat(caminho).then((info) => info.isFile(), () => false);

createServer(async (pedido, resposta) => {
  let caminho = decodeURIComponent(new URL(pedido.url, 'http://localhost').pathname);
  if (caminho.endsWith('/')) caminho += 'index.html';
  let arquivo = normalize(join(raiz, caminho));
  if (!arquivo.startsWith(raiz.endsWith(sep) ? raiz : raiz + sep)) {
    resposta.writeHead(403).end();
    return;
  }
  if (caminho === '/js/config.js' && (await existe(join(raiz, 'js', 'config.local.js')))) {
    arquivo = join(raiz, 'js', 'config.local.js');
  }
  if (!(await existe(arquivo))) {
    resposta.writeHead(404, { 'Content-Type': TIPOS['.html'] });
    resposta.end(await readFile(join(raiz, '404.html')));
    return;
  }
  resposta.writeHead(200, {
    'Content-Type': TIPOS[extname(arquivo).toLowerCase()] ?? 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  resposta.end(await readFile(arquivo));
}).listen(porta, () => {
  console.log(`Vale Sair? rodando em http://localhost:${porta}`);
});
