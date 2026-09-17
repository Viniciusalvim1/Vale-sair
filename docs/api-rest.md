# Consumo da API RESTful do Supabase

Todo o back-end do Vale Sair? é consumido por HTTP, com `fetch`, sem SDK. São três APIs do mesmo projeto:

| API | Para que serve |
| --- | --- |
| `/rest/v1` | tabelas, views e funções do banco (PostgREST) |
| `/auth/v1` | cadastro, login, renovação de token e senha |
| `/storage/v1` | fotos e vídeos dos Pulsos e avatares |

O cliente está em [`public/js/api/http.js`](../public/js/api/http.js) e as operações do app em [`public/js/api/dados.js`](../public/js/api/dados.js).

## Cabeçalhos

```js
const cabecalhos = {
  apikey: SUPABASE_KEY,                    // chave pública do projeto
  Authorization: `Bearer ${access_token}`, // só quando a pessoa está logada
  'Content-Type': 'application/json',
};
```

A `apikey` diz **qual projeto**; o `Authorization` diz **quem está pedindo**. Sem token, o pedido chega como visitante (`anon`) e só enxerga o que as políticas liberam para ele.

## Os quatro verbos

```js
// GET: filtros, ordenação e limite vão na query string
GET /rest/v1/locais_status?select=*&order=ultimo_pulso_em.desc.nullslast&limit=30
GET /rest/v1/mensagens_sala?select=*&local_id=eq.<uuid>&id=gt.42&order=id.asc

// POST: cria. Prefer diz se a resposta traz a linha criada
POST /rest/v1/pulsos
Prefer: return=representation
{ "local_id": "<uuid>", "movimento": "cheio", "fila_minutos": 8 }

// PATCH: atualiza as linhas que passarem no filtro (e no RLS)
PATCH /rest/v1/notificacoes?lida=eq.false
{ "lida": true }

// DELETE: remove as linhas do filtro (e só as suas, por causa do RLS)
DELETE /rest/v1/locais_salvos?local_id=eq.<uuid>
```

Repare no que **não** vai no corpo: `autor_id`, `usuario_id` e `criador_id` têm `default auth.uid()` no banco, e a API nem tem permissão de escrever nessas colunas. É impossível publicar em nome de outra pessoa.

## Funções (RPC)

Operações com mais de um passo viram uma função no banco, chamada por POST:

```js
POST /rest/v1/rpc/criar_chama
{ "p_local_ids": ["<uuid>", "<uuid>"], "p_turma_id": "<uuid>", "p_horas_votacao": 6 }
```

Assim a validação (de 2 a 4 lugares, participar da Turma, avisar todo mundo) acontece numa transação só, sem depender do front.

## Storage

```js
POST /storage/v1/object/pulsos/<uid>/<arquivo>.jpg   // corpo = o arquivo
Content-Type: image/jpeg

GET  /storage/v1/object/public/pulsos/<uid>/<arquivo>.jpg   // leitura pública
```

A política do bucket só aceita gravação na pasta cujo nome é o id de quem está enviando.

## Autenticação

| Ação | Chamada |
| --- | --- |
| Criar conta | `POST /auth/v1/signup` com `data: { nome, username }` |
| Entrar | `POST /auth/v1/token?grant_type=password` |
| Renovar sessão | `POST /auth/v1/token?grant_type=refresh_token` |
| Sair | `POST /auth/v1/logout` |
| Esqueci a senha | `POST /auth/v1/recover` |
| Trocar a senha | `PUT /auth/v1/user` |

## Erros

As respostas de erro do PostgREST, do Auth e do Storage passam por `traduzirErro()`, que devolve uma frase em português. As mensagens escritas nas regras do banco (`raise exception`) chegam inteiras à tela — por exemplo *"Você mostrou este lugar há pouco. Espere uns minutos para postar outro Pulso."*

| Situação | Código | O que a pessoa vê |
| --- | --- | --- |
| Senha errada | 400 `invalid_credentials` | E-mail ou senha incorretos. |
| Sem permissão (RLS) | 42501 | Você não tem permissão para fazer isso. |
| Regra do banco | P0001 | a mensagem da regra, em português |
| Sessão expirada | 401 | volta para a tela de entrar |
| Sem internet | — | Sem conexão com a internet. |

## Testando pelo terminal

```bash
U=https://gijlsoavgutvvfhhqfah.supabase.co
K=<publishable key>

# visitante consegue ler os lugares
curl -s "$U/rest/v1/locais?select=nome&order=nome.asc" -H "apikey: $K"

# ...mas não os perfis nem os Pulsos
curl -s -o /dev/null -w '%{http_code}\n' "$U/rest/v1/profiles?select=id" -H "apikey: $K"   # 401

# função pública usada no cadastro
curl -s "$U/rest/v1/rpc/username_disponivel" -H "apikey: $K" \
     -H 'Content-Type: application/json' -d '{"p_username":"pessoa.nova"}'                  # true

# função interna: fechada
curl -s "$U/rest/v1/rpc/conceder_xp" -H "apikey: $K" \
     -H 'Content-Type: application/json' -d '{"p_usuario":"...","p_xp":9999}'
# {"code":"42501","message":"permission denied for function conceder_xp"}
```
