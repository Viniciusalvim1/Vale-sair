-- =====================================================================
-- Vale Sair? · Views de leitura
--
-- security_invoker = true: a view roda com as permissões de quem consulta,
-- então o RLS das tabelas continua valendo. Contagens que dependem de dados
-- privados (quem fez check-in) passam por funções que devolvem só números.
-- =====================================================================

-- Situação atual de cada lugar, calculada a partir dos Pulsos ativos.
create view public.locais_status
with (security_invoker = true) as
select
  l.id,
  l.nome,
  l.slug,
  l.descricao,
  l.endereco,
  l.latitude,
  l.longitude,
  l.faixa_preco,
  l.fecha_as,
  l.musica_ao_vivo,
  l.foto_url,
  l.instagram,
  l.tiktok,
  l.cardapio_url,
  l.responsavel_id,
  c.nome as categoria,
  c.slug as categoria_slug,
  r.id as regiao_id,
  r.nome as regiao,
  g.nome as genero_principal,
  ult.id as ultimo_pulso_id,
  ult.movimento,
  ult.fila_minutos,
  coalesce(gu.nome, g.nome) as genero_agora,
  ult.created_at as ultimo_pulso_em,
  mid.midia_path as ultima_midia_path,
  mid.midia_tipo as ultima_midia_tipo,
  coalesce(ativos.pulsos_ativos, 0) as pulsos_ativos,
  coalesce(ativos.confirmacoes, 0) as confirmacoes,
  public.pessoas_no_local(l.id) as pessoas_agora,
  case
    when ult.id is null then null
    when ativos.confirmacoes >= 5 or ativos.pulsos_ativos >= 3 then 'alta'
    when ativos.confirmacoes >= 1 or ativos.pulsos_ativos >= 2 then 'media'
    else 'baixa'
  end as confianca
from public.locais l
join public.categorias c on c.id = l.categoria_id
join public.regioes r on r.id = l.regiao_id
left join public.generos_musicais g on g.id = l.genero_principal_id
left join lateral (
  select p.id, p.movimento, p.fila_minutos, p.genero_id, p.created_at
  from public.pulsos p
  where p.local_id = l.id and p.expira_em > now()
  order by p.created_at desc
  limit 1
) ult on true
left join public.generos_musicais gu on gu.id = ult.genero_id
left join lateral (
  select p.midia_path, p.midia_tipo
  from public.pulsos p
  where p.local_id = l.id and p.expira_em > now() and p.midia_path is not null
  order by p.created_at desc
  limit 1
) mid on true
left join lateral (
  select count(*)::integer as pulsos_ativos,
         coalesce(sum((select count(*) from public.pulso_confirmacoes pc where pc.pulso_id = p.id)), 0)::integer
           as confirmacoes
  from public.pulsos p
  where p.local_id = l.id and p.expira_em > now()
) ativos on true;

comment on view public.locais_status is 'Lugar + movimento, fila, gênero e confiança calculados dos Pulsos ativos.';

-- Feed de Pulsos com contadores e o estado do usuário atual.
create view public.pulsos_feed
with (security_invoker = true) as
select
  p.id,
  p.local_id,
  p.autor_id,
  p.movimento,
  p.fila_minutos,
  p.legenda,
  p.midia_path,
  p.midia_tipo,
  p.created_at,
  p.expira_em,
  l.nome as local_nome,
  l.genero_principal_id,
  r.nome as regiao,
  g.nome as genero,
  pr.nome as autor_nome,
  pr.username as autor_username,
  (select count(*) from public.pulso_confirmacoes c where c.pulso_id = p.id)::integer as confirmacoes,
  (select count(*) from public.pulso_reacoes x where x.pulso_id = p.id)::integer as reacoes,
  exists (select 1 from public.pulso_confirmacoes c
          where c.pulso_id = p.id and c.usuario_id = (select auth.uid())) as confirmei,
  exists (select 1 from public.pulso_reacoes x
          where x.pulso_id = p.id and x.usuario_id = (select auth.uid())) as reagi
from public.pulsos p
join public.locais l on l.id = p.local_id
join public.regioes r on r.id = l.regiao_id
left join public.generos_musicais g on g.id = p.genero_id
join public.profiles pr on pr.id = p.autor_id;

-- Mensagens da Sala com autor e selo "oficial" do gestor do lugar.
create view public.mensagens_sala
with (security_invoker = true) as
select
  m.id,
  m.local_id,
  m.autor_id,
  m.conteudo,
  m.created_at,
  pr.nome as autor_nome,
  pr.username as autor_username,
  coalesce(m.autor_id = l.responsavel_id, false) as oficial
from public.mensagens m
join public.profiles pr on pr.id = m.autor_id
join public.locais l on l.id = m.local_id;

-- Turmas da pessoa com resumo para os cards.
create view public.turmas_resumo
with (security_invoker = true) as
select
  t.id,
  t.nome,
  t.descricao,
  t.codigo_convite,
  t.criador_id,
  t.created_at,
  (select count(*) from public.turma_membros m where m.turma_id = t.id)::integer as membros,
  (select count(*) from public.turma_membros m
     join public.profiles p on p.id = m.usuario_id
    where m.turma_id = t.id and p.quer_sair_ate > now())::integer as querem_sair,
  (select coalesce(jsonb_agg(s.nome), '[]'::jsonb)
     from (select p.nome from public.turma_membros m
             join public.profiles p on p.id = m.usuario_id
            where m.turma_id = t.id
            order by m.created_at
            limit 4) s) as primeiros_membros,
  (select c.codigo from public.chamas c
    where c.turma_id = t.id and c.encerra_em > now()
    order by c.created_at desc
    limit 1) as chama_aberto
from public.turmas t;

-- Cenas com contagem de participantes e se eu participo.
create view public.cenas_resumo
with (security_invoker = true) as
select
  c.id,
  c.nome,
  c.slug,
  c.descricao,
  c.cor,
  c.genero_id,
  g.nome as genero,
  (select count(*) from public.cena_membros m where m.cena_id = c.id)::integer as membros,
  exists (select 1 from public.cena_membros m
          where m.cena_id = c.id and m.usuario_id = (select auth.uid())) as participo
from public.cenas c
left join public.generos_musicais g on g.id = c.genero_id;

-- Salas (chats dos lugares) ordenáveis por movimento recente.
create view public.salas_ativas
with (security_invoker = true) as
select
  l.id,
  l.nome,
  r.nome as regiao,
  (select count(*) from public.mensagens m
    where m.local_id = l.id and m.created_at > now() - interval '3 hours')::integer as mensagens_recentes,
  public.pessoas_no_local(l.id) as pessoas_agora,
  (select max(m.created_at) from public.mensagens m where m.local_id = l.id) as ultima_mensagem_em
from public.locais l
join public.regioes r on r.id = l.regiao_id;

-- Pulsos ativos de uma Cena, só de quem autorizou em preferencias.pulsos_em_cenas.
create function public.pulsos_da_cena(p_slug text)
returns setof public.pulsos_feed
language sql
stable
security definer
set search_path = ''
as $$
  select f.*
  from public.pulsos_feed f
  join public.cenas c on c.slug = p_slug and c.genero_id = f.genero_principal_id
  join public.preferencias pref on pref.usuario_id = f.autor_id and pref.pulsos_em_cenas
  where f.expira_em > now()
  order by f.created_at desc
  limit 30;
$$;
