-- =====================================================================
-- Vale Sair? · Segurança
--
-- Três camadas:
--   1. RLS em todas as tabelas: cada linha só é visível/alterável por
--      quem tem direito a ela.
--   2. Privilégios por coluna: mesmo na própria linha, a API só escreve
--      nas colunas que fazem sentido (ninguém edita o próprio XP).
--   3. Funções fechadas por padrão: só as RPCs do app ficam expostas.
-- (select auth.uid()) entre parênteses faz o Postgres calcular o id uma
-- vez por consulta, e não uma vez por linha.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Row Level Security
-- ---------------------------------------------------------------------
alter table public.regioes enable row level security;
alter table public.categorias enable row level security;
alter table public.generos_musicais enable row level security;
alter table public.conquistas enable row level security;
alter table public.profiles enable row level security;
alter table public.preferencias enable row level security;
alter table public.locais enable row level security;
alter table public.locais_salvos enable row level security;
alter table public.pulsos enable row level security;
alter table public.pulso_confirmacoes enable row level security;
alter table public.pulso_reacoes enable row level security;
alter table public.checkins enable row level security;
alter table public.mensagens enable row level security;
alter table public.turmas enable row level security;
alter table public.turma_membros enable row level security;
alter table public.chamas enable row level security;
alter table public.chama_opcoes enable row level security;
alter table public.votos enable row level security;
alter table public.cenas enable row level security;
alter table public.cena_membros enable row level security;
alter table public.notificacoes enable row level security;
alter table public.usuario_conquistas enable row level security;

-- Catálogos e lugares: leitura aberta, inclusive para visitantes
create policy "regiões são públicas" on public.regioes
  for select to anon, authenticated using (true);
create policy "categorias são públicas" on public.categorias
  for select to anon, authenticated using (true);
create policy "gêneros são públicos" on public.generos_musicais
  for select to anon, authenticated using (true);
create policy "conquistas são públicas" on public.conquistas
  for select to anon, authenticated using (true);
create policy "cenas são públicas" on public.cenas
  for select to anon, authenticated using (true);
create policy "lugares são públicos" on public.locais
  for select to anon, authenticated using (true);
create policy "gestor atualiza o próprio lugar" on public.locais
  for update to authenticated
  using (responsavel_id = (select auth.uid()))
  with check (responsavel_id = (select auth.uid()));

-- Perfis
create policy "perfis visíveis para quem está logado" on public.profiles
  for select to authenticated using (true);
create policy "cada pessoa edita o próprio perfil" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Preferências (privadas)
create policy "preferências são privadas" on public.preferencias
  for select to authenticated using (usuario_id = (select auth.uid()));
create policy "cada pessoa altera as próprias preferências" on public.preferencias
  for update to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

-- Lugares salvos (privados)
create policy "salvos são privados" on public.locais_salvos
  for select to authenticated using (usuario_id = (select auth.uid()));
create policy "cada pessoa salva para si" on public.locais_salvos
  for insert to authenticated with check (usuario_id = (select auth.uid()));
create policy "cada pessoa remove os próprios salvos" on public.locais_salvos
  for delete to authenticated using (usuario_id = (select auth.uid()));

-- Pulsos: ativos para todos os logados; expirados só para o autor
create policy "pulsos ativos são visíveis" on public.pulsos
  for select to authenticated
  using (expira_em > now() or autor_id = (select auth.uid()));
create policy "cada pessoa publica os próprios pulsos" on public.pulsos
  for insert to authenticated
  with check (
    autor_id = (select auth.uid())
    and (midia_path is null or midia_path like (select auth.uid())::text || '/%')
  );
create policy "cada pessoa apaga os próprios pulsos" on public.pulsos
  for delete to authenticated using (autor_id = (select auth.uid()));

-- Confirmações: só em Pulso ativo de outra pessoa; não se desfaz
create policy "confirmações são visíveis" on public.pulso_confirmacoes
  for select to authenticated using (true);
create policy "confirma Pulso ativo de outra pessoa" on public.pulso_confirmacoes
  for insert to authenticated
  with check (
    usuario_id = (select auth.uid())
    and exists (
      select 1 from public.pulsos p
      where p.id = pulso_id and p.expira_em > now() and p.autor_id <> (select auth.uid())
    )
  );

-- Reações
create policy "reações são visíveis" on public.pulso_reacoes
  for select to authenticated using (true);
create policy "cada pessoa reage por si" on public.pulso_reacoes
  for insert to authenticated with check (usuario_id = (select auth.uid()));
create policy "cada pessoa muda a própria reação" on public.pulso_reacoes
  for update to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));
create policy "cada pessoa desfaz a própria reação" on public.pulso_reacoes
  for delete to authenticated using (usuario_id = (select auth.uid()));

-- Check-ins (privados; amigos veem pela RPC amigos_por_perto)
create policy "check-ins são privados" on public.checkins
  for select to authenticated using (usuario_id = (select auth.uid()));
create policy "cada pessoa faz o próprio check-in" on public.checkins
  for insert to authenticated with check (usuario_id = (select auth.uid()));
create policy "cada pessoa desfaz o próprio check-in" on public.checkins
  for delete to authenticated using (usuario_id = (select auth.uid()));

-- Mensagens das Salas
create policy "salas abertas para quem está logado" on public.mensagens
  for select to authenticated using (true);
create policy "cada pessoa escreve em nome próprio" on public.mensagens
  for insert to authenticated with check (autor_id = (select auth.uid()));
create policy "cada pessoa apaga as próprias mensagens" on public.mensagens
  for delete to authenticated using (autor_id = (select auth.uid()));

-- Turmas: fechadas para quem não é membro
-- (o criador entra na regra de leitura porque o INSERT ... RETURNING é
--  checado antes do gatilho que o adiciona como membro)
create policy "turma visível para membros" on public.turmas
  for select to authenticated
  using (criador_id = (select auth.uid()) or public.eh_membro_da_turma(id));
create policy "qualquer pessoa logada cria turma" on public.turmas
  for insert to authenticated with check (criador_id = (select auth.uid()));
create policy "admins editam a turma" on public.turmas
  for update to authenticated
  using (public.eh_admin_da_turma(id))
  with check (public.eh_admin_da_turma(id));
create policy "criador apaga a turma" on public.turmas
  for delete to authenticated using (criador_id = (select auth.uid()));

create policy "membros veem a turma" on public.turma_membros
  for select to authenticated using (public.eh_membro_da_turma(turma_id));
create policy "sair da turma ou remover membro" on public.turma_membros
  for delete to authenticated
  using (usuario_id = (select auth.uid()) or public.eh_admin_da_turma(turma_id));
create policy "admins mudam papéis" on public.turma_membros
  for update to authenticated
  using (public.eh_admin_da_turma(turma_id))
  with check (public.eh_admin_da_turma(turma_id));

-- Chamas: criador e turma; quem tem o link usa as RPCs públicas
create policy "chama visível para criador e turma" on public.chamas
  for select to authenticated
  using (
    criador_id = (select auth.uid())
    or (turma_id is not null and public.eh_membro_da_turma(turma_id))
  );
create policy "criador apaga o chama" on public.chamas
  for delete to authenticated using (criador_id = (select auth.uid()));

create policy "opções seguem o chama" on public.chama_opcoes
  for select to authenticated
  using (exists (select 1 from public.chamas c where c.id = chama_id));

create policy "votos seguem o chama" on public.votos
  for select to authenticated
  using (exists (select 1 from public.chamas c where c.id = chama_id));
create policy "cada pessoa retira o próprio voto" on public.votos
  for delete to authenticated using (usuario_id = (select auth.uid()));

-- Cenas
create policy "participação em cenas é visível" on public.cena_membros
  for select to authenticated using (true);
create policy "cada pessoa entra numa cena" on public.cena_membros
  for insert to authenticated with check (usuario_id = (select auth.uid()));
create policy "cada pessoa sai de uma cena" on public.cena_membros
  for delete to authenticated using (usuario_id = (select auth.uid()));

-- Notificações (privadas)
create policy "notificações são privadas" on public.notificacoes
  for select to authenticated using (usuario_id = (select auth.uid()));
create policy "cada pessoa marca as próprias como lidas" on public.notificacoes
  for update to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));
create policy "cada pessoa apaga as próprias notificações" on public.notificacoes
  for delete to authenticated using (usuario_id = (select auth.uid()));

-- Conquistas obtidas
create policy "conquistas obtidas são visíveis" on public.usuario_conquistas
  for select to authenticated using (true);

-- ---------------------------------------------------------------------
-- 2. Privilégios por tabela e coluna
-- ---------------------------------------------------------------------
-- Visitante sem conta: só catálogos e lugares (o resto passa pelas RPCs públicas)
revoke all on all tables in schema public from anon;
grant select on public.regioes, public.categorias, public.generos_musicais,
  public.conquistas, public.cenas, public.locais
  to anon;

-- Pessoa logada: escreve só nas colunas abaixo; o banco preenche o resto
revoke insert, update, delete on public.regioes, public.categorias, public.generos_musicais,
  public.conquistas, public.cenas
  from authenticated;

revoke insert, update, delete on public.locais from authenticated;
grant update (descricao, fecha_as, musica_ao_vivo, foto_url, instagram, tiktok, cardapio_url)
  on public.locais to authenticated;

revoke insert, update, delete on public.profiles from authenticated;
grant update (nome, username, bio, avatar_url, regiao_id) on public.profiles to authenticated;

revoke insert, update, delete on public.preferencias from authenticated;
grant update (mostrar_regiao, mostrar_estou_aqui, pulsos_em_cenas, reduzir_movimento)
  on public.preferencias to authenticated;

revoke insert, update on public.locais_salvos from authenticated;
grant insert (local_id) on public.locais_salvos to authenticated;

revoke insert, update on public.pulsos from authenticated;
grant insert (local_id, movimento, fila_minutos, genero_id, legenda, midia_path, midia_tipo)
  on public.pulsos to authenticated;

revoke insert, update, delete on public.pulso_confirmacoes from authenticated;
grant insert (pulso_id) on public.pulso_confirmacoes to authenticated;

revoke insert, update on public.pulso_reacoes from authenticated;
grant insert (pulso_id, tipo), update (tipo) on public.pulso_reacoes to authenticated;

revoke insert, update on public.checkins from authenticated;
grant insert (local_id) on public.checkins to authenticated;

revoke insert, update on public.mensagens from authenticated;
grant insert (local_id, conteudo) on public.mensagens to authenticated;

revoke insert, update on public.turmas from authenticated;
grant insert (nome, descricao), update (nome, descricao) on public.turmas to authenticated;

revoke insert, update on public.turma_membros from authenticated;
grant update (papel) on public.turma_membros to authenticated;

revoke insert, update on public.chamas from authenticated;
revoke insert, update, delete on public.chama_opcoes from authenticated;
revoke insert, update on public.votos from authenticated;

revoke insert, update on public.cena_membros from authenticated;
grant insert (cena_id) on public.cena_membros to authenticated;

revoke insert, update on public.notificacoes from authenticated;
grant update (lida) on public.notificacoes to authenticated;

revoke insert, update, delete on public.usuario_conquistas from authenticated;

-- Views: só leitura
revoke insert, update, delete on public.locais_status, public.pulsos_feed, public.mensagens_sala,
  public.turmas_resumo, public.cenas_resumo, public.salas_ativas
  from authenticated;
grant select on public.locais_status, public.pulsos_feed, public.mensagens_sala,
  public.turmas_resumo, public.cenas_resumo, public.salas_ativas
  to authenticated;

-- ---------------------------------------------------------------------
-- 3. Funções: fechadas por padrão, só os endpoints do app ficam abertos
-- ---------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;

-- abertas também para visitantes (cadastro e votação pelo link)
grant execute on function
  public.username_disponivel(text),
  public.chama_publica(text, uuid),
  public.votar_no_chama(text, uuid, uuid, text)
  to anon, authenticated;

-- só para quem está logado (as três primeiras são usadas pelas políticas e views)
grant execute on function
  public.eh_membro_da_turma(uuid),
  public.eh_admin_da_turma(uuid),
  public.pessoas_no_local(uuid),
  public.criar_chama(uuid[], uuid, text, timestamptz, integer),
  public.entrar_na_turma(text),
  public.quero_sair(integer),
  public.amigos_por_perto(),
  public.meu_resumo(),
  public.minha_retrospectiva(date),
  public.ranking_da_cena(text),
  public.pulsos_da_cena(text)
  to authenticated;
