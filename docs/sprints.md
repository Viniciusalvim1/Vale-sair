# Planejamento das Sprints

> Os nomes e as datas estão como **(preencher)**: são decisões da equipe. O resto reflete o que já está no repositório.

## Equipe

| Pessoa | Papel principal | Entregas |
| --- | --- | --- |
| Vinícius Alvim Silveira | Autenticação e perfil | Cadastro, login, recuperação de senha, controle de sessão e página "Meu rolê" (`login`, `cadastro`, `perfil`, `configuracoes`, `js/api/auth.js`, `js/api/sessao.js`) |
| Augusto Mariano Moreira | Descoberta dos lugares | Feed "Agora", página do lugar com check-in "Tô aqui" e publicação de Pulso (`agora`, `local`, `pulso`) |
| Gabriel Cardoso | Decisão em grupo | Turmas com código de convite e Chama: criação da enquete e votação sem conta (`comunidades`, `turma`, `chama`, `chama-lugares`, `enquete`, `c`) |

## Situação por entrega

As entregas são as do enunciado do TI2.

| # | Entrega | Situação | Onde está |
| --- | --- | --- | --- |
| 1 | Layout padrão (HTML/CSS), identidade visual, responsividade e iconografia | **feito** | `public/css/`, `docs/identidade-visual.md` |
| 2 | Modelagem e implementação do banco relacional no Supabase | **feito** | `supabase/migrations/`, `docs/banco-de-dados.md` |
| 3 | Planejamento de cada Sprint (equipe e individual) | **em aberto** | este arquivo |
| 4 | Desenvolvimento dos artefatos | **parcial** | Matriz CSD, Mapa de Stakeholders e Roteiro de Entrevistas já feitos; falta consolidar as entrevistas |
| 5 | Consumo da API RESTful do Supabase com JavaScript | **feito** | `public/js/api/`, `docs/api-rest.md` |
| 6 | Autenticação e autorização de usuários | **feito** | `public/js/api/auth.js` + RLS na migration de segurança |
| 7 | Programação das funcionalidades e testes | **feito** para o MVP | 20 telas; `npm test` com 34 testes |
| 8 | Daily meetings e retrospectivas | **em aberto** | registrar abaixo |
| 9 | Publicação em servidor na Internet | **pendente** | ver o fim do README |
| 10 | Documentação do projeto | **feito** | `README.md` e `docs/` |
| 11 | Apresentação em PDF | **pendente** | (preencher) |
| 12 | Vídeo de demonstração | **pendente** | roteiro sugerido abaixo |
| 13 | Apresentação em sala | **pendente** | (preencher) |

## Sprints

### Sprint 1 · Base do produto — **concluída**

- Design Thinking: Matriz CSD, Mapa de Stakeholders e Roteiro de Entrevistas
- Protótipo navegável (hoje em `prototipo/`)
- Modelo relacional, RLS e regras de negócio no banco
- Layout padrão e identidade visual
- Consumo da API REST, autenticação e as 20 telas do MVP
- Testes automatizados do banco e do front

### Sprint 2 · Validação e publicação — **a fazer**

- [ ] Rodar de 6 a 10 entrevistas com o roteiro pronto e revisar a Matriz CSD
- [ ] Publicar na Internet e configurar Site URL e Redirect URLs no Supabase
- [ ] Testar com pessoas de verdade num rolê (com Pulsos e Chama reais)
- [ ] Ajustar o MVP conforme as entrevistas
- [ ] Dono(a): (preencher) · Período: (preencher)

### Sprint 3 · Apresentação — **a fazer**

- [ ] Gravar o vídeo de demonstração
- [ ] Montar a apresentação em PDF
- [ ] Ensaiar a apresentação em sala
- [ ] Dono(a): (preencher) · Período: (preencher)

## Roteiro sugerido para o vídeo (3 a 4 minutos)

1. **Problema** (30s): a cena de decidir onde sair olhando Instagram e Google Maps, com uma dor tirada das entrevistas.
2. **Agora** (30s): abrir o app e ver a noite acontecendo, com o movimento e a fila de quem está lá.
3. **Pulso** (40s): publicar um Pulso no lugar e ver outra pessoa confirmando.
4. **Chama** (50s): escolher lugares, criar a enquete e **votar pelo link em outro celular, sem conta** — o momento mais forte da demonstração.
5. **Privacidade** (30s): mostrar a tela de privacidade e o radar, com o amigo aparecendo só pela região.
6. **Por baixo** (30s): as políticas de RLS no Supabase e os testes passando.

## Registro das reuniões

| Data | Quem participou | Combinados | Impedimentos |
| --- | --- | --- | --- |
| (preencher) | | | |
