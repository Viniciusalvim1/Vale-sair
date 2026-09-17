-- =====================================================================
-- Vale Sair? · Regras de negócio no banco
--
-- Gatilhos mantêm a consistência (perfil no cadastro, XP, conquistas,
-- notificações, antispam). As funções expostas viram endpoints REST em
-- /rest/v1/rpc/<nome>. Toda função security definer fixa search_path = ''
-- e usa nomes qualificados, como recomenda o Supabase.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Utilitários
-- ---------------------------------------------------------------------
create function public.tocar_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_tocar_updated_at
  before update on public.profiles
  for each row execute function public.tocar_updated_at();

create trigger preferencias_tocar_updated_at
  before update on public.preferencias
  for each row execute function public.tocar_updated_at();

-- ---------------------------------------------------------------------
-- Autorização (usadas dentro das políticas de RLS)
-- security definer evita recursão: a política de turma_membros consulta
-- a própria turma_membros sem cair nela de novo.
-- ---------------------------------------------------------------------
create function public.eh_membro_da_turma(p_turma_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.turma_membros
    where turma_id = p_turma_id and usuario_id = (select auth.uid())
  );
$$;

create function public.eh_admin_da_turma(p_turma_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.turma_membros
    where turma_id = p_turma_id and usuario_id = (select auth.uid()) and papel = 'admin'
  );
$$;

-- Conta quem está no lugar sem expor quem são essas pessoas.
create function public.pessoas_no_local(p_local_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(distinct usuario_id)::integer
  from public.checkins
  where local_id = p_local_id and expira_em > now();
$$;

-- ---------------------------------------------------------------------
-- Cadastro
-- ---------------------------------------------------------------------
create function public.criar_perfil_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nome text := left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'nome'), ''),
                               nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
                               'Pessoa'), 60);
  v_username text := lower(btrim(coalesce(new.raw_user_meta_data ->> 'username', '')));
begin
  if char_length(v_nome) < 2 then
    v_nome := rpad(v_nome, 2, '.');
  end if;

  -- username inválido ou já usado: gera um a partir do e-mail
  if v_username !~ '^[a-z0-9_.]{3,24}$'
     or exists (select 1 from public.profiles where username = v_username) then
    v_username := left(regexp_replace(lower(split_part(coalesce(new.email, ''), '@', 1)), '[^a-z0-9_.]', '', 'g'), 18)
                  || '_' || substr(md5(new.id::text), 1, 5);
  end if;

  insert into public.profiles (id, nome, username) values (new.id, v_nome, v_username);
  insert into public.preferencias (usuario_id) values (new.id);
  return new;
end;
$$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil_novo_usuario();

create function public.username_disponivel(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select lower(btrim(p_username)) ~ '^[a-z0-9_.]{3,24}$'
     and not exists (select 1 from public.profiles where username = lower(btrim(p_username)));
$$;

-- ---------------------------------------------------------------------
-- Gamificação (uso interno: não é exposta pela API)
-- ---------------------------------------------------------------------
create function public.conceder_xp(p_usuario uuid, p_xp integer)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles set xp = xp + greatest(p_xp, 0) where id = p_usuario;
$$;

create function public.conceder_conquista(p_usuario uuid, p_codigo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conquista public.conquistas%rowtype;
  v_novas integer;
begin
  select * into v_conquista from public.conquistas where codigo = p_codigo;
  if not found then
    return;
  end if;

  insert into public.usuario_conquistas (usuario_id, conquista_id)
  values (p_usuario, v_conquista.id)
  on conflict do nothing;
  get diagnostics v_novas = row_count;

  if v_novas > 0 then
    perform public.conceder_xp(p_usuario, v_conquista.xp);
    insert into public.notificacoes (usuario_id, tipo, titulo, corpo, link)
    values (p_usuario, 'conquista', 'CONQUISTA: ' || upper(v_conquista.nome), v_conquista.descricao, 'perfil.html');
  end if;
end;
$$;

create function public.verificar_explorador(p_usuario uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from (
        select local_id from public.checkins where usuario_id = p_usuario
        union
        select local_id from public.pulsos where autor_id = p_usuario
      ) lugares) >= 5 then
    perform public.conceder_conquista(p_usuario, 'explorador');
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Pulsos
-- ---------------------------------------------------------------------
-- Pedidos de usuários finais têm auth.uid(); cargas feitas pela equipe
-- (service_role ou SQL direto) não têm, e podem definir datas livremente.
create function public.validar_pulso()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null then
    if exists (
      select 1 from public.pulsos
      where autor_id = new.autor_id and local_id = new.local_id
        and created_at > now() - interval '10 minutes'
    ) then
      raise exception 'Você mostrou este lugar há pouco. Espere uns minutos para postar outro Pulso.'
        using errcode = 'P0001';
    end if;
    new.created_at := now();
    new.expira_em := now() + interval '2 hours';
  end if;
  return new;
end;
$$;

create trigger pulsos_validar
  before insert on public.pulsos
  for each row execute function public.validar_pulso();

create function public.ao_publicar_pulso()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total integer;
  v_local public.locais%rowtype;
begin
  perform public.conceder_xp(new.autor_id, case when new.midia_path is null then 10 else 20 end);

  select count(*) into v_total from public.pulsos where autor_id = new.autor_id;
  if v_total = 1 then
    perform public.conceder_conquista(new.autor_id, 'primeiro_pulso');
  elsif v_total = 10 then
    perform public.conceder_conquista(new.autor_id, 'reporter_da_noite');
  end if;
  perform public.verificar_explorador(new.autor_id);

  -- avisa quem salvou o lugar quando ele passa a encher (uma vez por hora)
  if new.movimento in ('cheio', 'lotado') and not exists (
    select 1 from public.pulsos
    where local_id = new.local_id and id <> new.id
      and movimento in ('cheio', 'lotado')
      and created_at > now() - interval '1 hour'
  ) then
    select * into v_local from public.locais where id = new.local_id;
    insert into public.notificacoes (usuario_id, tipo, titulo, corpo, link)
    select s.usuario_id, 'movimento',
           upper(v_local.nome) || case new.movimento when 'lotado' then ' LOTOU' else ' ESTÁ ENCHENDO' end,
           'Quem está lá acabou de atualizar o movimento.',
           'local.html?id=' || v_local.id
    from public.locais_salvos s
    where s.local_id = new.local_id and s.usuario_id <> new.autor_id;
  end if;
  return new;
end;
$$;

create trigger pulsos_ao_publicar
  after insert on public.pulsos
  for each row execute function public.ao_publicar_pulso();

create function public.ao_confirmar_pulso()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pulso public.pulsos%rowtype;
  v_confirmacoes integer;
  v_dadas integer;
begin
  select * into v_pulso from public.pulsos where id = new.pulso_id;
  perform public.conceder_xp(v_pulso.autor_id, 5);
  perform public.conceder_xp(new.usuario_id, 2);

  select count(*) into v_confirmacoes from public.pulso_confirmacoes where pulso_id = new.pulso_id;
  if v_confirmacoes = 5 then
    perform public.conceder_conquista(v_pulso.autor_id, 'boa_fonte');
  end if;
  if v_confirmacoes in (1, 5, 10) then
    insert into public.notificacoes (usuario_id, tipo, titulo, corpo, link)
    values (v_pulso.autor_id, 'pulso', 'SEU PULSO FOI CONFIRMADO',
            v_confirmacoes || case when v_confirmacoes = 1 then ' pessoa disse' else ' pessoas disseram' end
              || ' que a informação continua atual.',
            'aovivo.html?local=' || v_pulso.local_id);
  end if;

  select count(*) into v_dadas from public.pulso_confirmacoes where usuario_id = new.usuario_id;
  if v_dadas = 10 then
    perform public.conceder_conquista(new.usuario_id, 'olho_vivo');
  end if;
  return new;
end;
$$;

create trigger pulso_confirmacoes_ao_confirmar
  after insert on public.pulso_confirmacoes
  for each row execute function public.ao_confirmar_pulso();

-- ---------------------------------------------------------------------
-- Check-ins ("TÔ AQUI")
-- ---------------------------------------------------------------------
create function public.validar_checkin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null then
    if exists (
      select 1 from public.checkins
      where usuario_id = new.usuario_id and local_id = new.local_id and expira_em > now()
    ) then
      raise exception 'Seu "tô aqui" neste lugar já está valendo.' using errcode = 'P0001';
    end if;
    new.created_at := now();
    new.expira_em := now() + interval '3 hours';
  end if;
  return new;
end;
$$;

create trigger checkins_validar
  before insert on public.checkins
  for each row execute function public.validar_checkin();

create function public.ao_fazer_checkin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total integer;
begin
  -- só um "tô aqui" vale por vez: os anteriores expiram agora
  update public.checkins set expira_em = now()
  where usuario_id = new.usuario_id and id <> new.id and expira_em > now();

  -- XP no máximo a cada 30 minutos, para não virar farm de check-in
  if not exists (
    select 1 from public.checkins
    where usuario_id = new.usuario_id and id <> new.id and created_at > now() - interval '30 minutes'
  ) then
    perform public.conceder_xp(new.usuario_id, 10);
  end if;

  select count(*) into v_total from public.checkins where usuario_id = new.usuario_id;
  if v_total = 5 then
    perform public.conceder_conquista(new.usuario_id, 'to_sempre_aqui');
  end if;
  perform public.verificar_explorador(new.usuario_id);
  return new;
end;
$$;

create trigger checkins_ao_fazer
  after insert on public.checkins
  for each row execute function public.ao_fazer_checkin();

-- ---------------------------------------------------------------------
-- Mensagens (antiflood)
-- ---------------------------------------------------------------------
create function public.validar_mensagem()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null then
    if (select count(*) from public.mensagens
        where autor_id = new.autor_id and created_at > now() - interval '20 seconds') >= 5 then
      raise exception 'Calma! Espere alguns segundos para mandar outra mensagem.' using errcode = 'P0001';
    end if;
    new.conteudo := btrim(new.conteudo);
    new.created_at := now();
  end if;
  return new;
end;
$$;

create trigger mensagens_validar
  before insert on public.mensagens
  for each row execute function public.validar_mensagem();

-- ---------------------------------------------------------------------
-- Turmas
-- ---------------------------------------------------------------------
create function public.ao_criar_turma()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.turma_membros (turma_id, usuario_id, papel)
  values (new.id, new.criador_id, 'admin');
  return new;
end;
$$;

create trigger turmas_ao_criar
  after insert on public.turmas
  for each row execute function public.ao_criar_turma();

create function public.entrar_na_turma(p_codigo text)
returns public.turmas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_turma public.turmas%rowtype;
  v_novos integer;
begin
  if v_uid is null then
    raise exception 'Entre na sua conta para participar de uma Turma.' using errcode = '42501';
  end if;

  select * into v_turma from public.turmas where codigo_convite = upper(btrim(p_codigo));
  if not found then
    raise exception 'Código de convite não encontrado.' using errcode = 'P0002';
  end if;

  insert into public.turma_membros (turma_id, usuario_id)
  values (v_turma.id, v_uid)
  on conflict do nothing;
  get diagnostics v_novos = row_count;

  if v_novos > 0 then
    insert into public.notificacoes (usuario_id, tipo, titulo, corpo, link)
    select m.usuario_id, 'turma', upper(p.nome) || ' ENTROU NA TURMA', v_turma.nome, 'turma.html?id=' || v_turma.id
    from public.turma_membros m
    join public.profiles p on p.id = v_uid
    where m.turma_id = v_turma.id and m.papel = 'admin' and m.usuario_id <> v_uid;
  end if;
  return v_turma;
end;
$$;

-- "QUERO SAIR": avisa as Turmas sem revelar onde a pessoa está.
create function public.quero_sair(p_horas integer default 4)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_ja_queria boolean;
  v_ate timestamptz;
begin
  if v_uid is null then
    raise exception 'Entre na sua conta primeiro.' using errcode = '42501';
  end if;
  if p_horas is null or p_horas not between 0 and 12 then
    raise exception 'Escolha de 0 a 12 horas.' using errcode = '22023';
  end if;

  select coalesce(quer_sair_ate > now(), false) into v_ja_queria from public.profiles where id = v_uid;
  v_ate := case when p_horas = 0 then null else now() + make_interval(hours => p_horas) end;
  update public.profiles set quer_sair_ate = v_ate where id = v_uid;

  if v_ate is not null and not v_ja_queria then
    insert into public.notificacoes (usuario_id, tipo, titulo, corpo, link)
    select distinct on (m2.usuario_id)
           m2.usuario_id, 'turma', upper(p.nome) || ' QUER SAIR', 'Bora chamar para um rolê?',
           'chama-lugares.html?turma=' || m2.turma_id
    from public.turma_membros m1
    join public.turma_membros m2 on m2.turma_id = m1.turma_id and m2.usuario_id <> v_uid
    join public.profiles p on p.id = v_uid
    where m1.usuario_id = v_uid;
  end if;
  return v_ate;
end;
$$;

-- ---------------------------------------------------------------------
-- Chamas (enquetes)
-- ---------------------------------------------------------------------
create function public.criar_chama(
  p_local_ids uuid[],
  p_turma_id uuid default null,
  p_titulo text default 'Onde vamos?',
  p_quando timestamptz default null,
  p_horas_votacao integer default 6
)
returns public.chamas
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_qtd integer := coalesce(cardinality(p_local_ids), 0);
  v_chama public.chamas%rowtype;
begin
  if v_uid is null then
    raise exception 'Entre na sua conta para criar um Chama.' using errcode = '42501';
  end if;
  if v_qtd not between 2 and 4 or (select count(distinct x) from unnest(p_local_ids) as x) <> v_qtd then
    raise exception 'Escolha de 2 a 4 lugares diferentes.' using errcode = '22023';
  end if;
  if (select count(*) from public.locais where id = any (p_local_ids)) <> v_qtd then
    raise exception 'Algum lugar escolhido não existe.' using errcode = '22023';
  end if;
  if p_turma_id is not null and not public.eh_membro_da_turma(p_turma_id) then
    raise exception 'Você não participa desta Turma.' using errcode = '42501';
  end if;
  if p_horas_votacao is null or p_horas_votacao not between 1 and 48 then
    raise exception 'A votação pode durar de 1 a 48 horas.' using errcode = '22023';
  end if;

  insert into public.chamas (turma_id, criador_id, titulo, quando, encerra_em)
  values (p_turma_id, v_uid, coalesce(nullif(btrim(p_titulo), ''), 'Onde vamos?'), p_quando,
          now() + make_interval(hours => p_horas_votacao))
  returning * into v_chama;

  insert into public.chama_opcoes (chama_id, local_id, ordem)
  select v_chama.id, escolha.local_id, escolha.ordem
  from unnest(p_local_ids) with ordinality as escolha(local_id, ordem);

  if p_turma_id is not null then
    insert into public.notificacoes (usuario_id, tipo, titulo, corpo, link)
    select m.usuario_id, 'chama', upper(t.nome) || ' CRIOU UM CHAMA',
           v_chama.titulo || ' A votação termina às '
             || to_char(v_chama.encerra_em at time zone 'America/Sao_Paulo', 'HH24"h"MI') || '.',
           'enquete.html?codigo=' || v_chama.codigo
    from public.turma_membros m
    join public.turmas t on t.id = m.turma_id
    where m.turma_id = p_turma_id and m.usuario_id <> v_uid;
  end if;

  perform public.conceder_xp(v_uid, 15);
  if (select count(*) from public.chamas where criador_id = v_uid) = 1 then
    perform public.conceder_conquista(v_uid, 'faisca');
  end if;
  return v_chama;
end;
$$;

-- Leitura pública pelo código do link (quem tem o link pode ver e votar).
create function public.chama_publica(p_codigo text, p_convidado_id uuid default null)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', c.id,
    'codigo', c.codigo,
    'titulo', c.titulo,
    'quando', c.quando,
    'encerra_em', c.encerra_em,
    'aberto', c.encerra_em > now(),
    'sou_criador', coalesce(c.criador_id = (select auth.uid()), false),
    'turma', case when t.id is null then null else jsonb_build_object('id', t.id, 'nome', t.nome) end,
    'criador', jsonb_build_object('nome', p.nome, 'username', p.username),
    'total_votos', (select count(*) from public.votos v where v.chama_id = c.id),
    'meu_voto', (
      select v.opcao_id from public.votos v
      where v.chama_id = c.id
        and (v.usuario_id = (select auth.uid())
             or (p_convidado_id is not null and v.convidado_id = p_convidado_id))
      limit 1
    ),
    'opcoes', (
      select jsonb_agg(jsonb_build_object(
               'id', o.id,
               'ordem', o.ordem,
               'local_id', l.id,
               'nome', l.nome,
               'regiao', r.nome,
               'foto_url', l.foto_url,
               'votos', (select count(*) from public.votos v where v.opcao_id = o.id)
             ) order by o.ordem)
      from public.chama_opcoes o
      join public.locais l on l.id = o.local_id
      join public.regioes r on r.id = l.regiao_id
      where o.chama_id = c.id
    )
  )
  from public.chamas c
  join public.profiles p on p.id = c.criador_id
  left join public.turmas t on t.id = c.turma_id
  where c.codigo = upper(btrim(p_codigo));
$$;

create function public.votar_no_chama(
  p_codigo text,
  p_opcao_id uuid,
  p_convidado_id uuid default null,
  p_convidado_nome text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_chama public.chamas%rowtype;
begin
  select * into v_chama from public.chamas where codigo = upper(btrim(p_codigo));
  if not found then
    raise exception 'Chama não encontrado.' using errcode = 'P0002';
  end if;
  if v_chama.encerra_em <= now() then
    raise exception 'A votação deste Chama já terminou.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.chama_opcoes where id = p_opcao_id and chama_id = v_chama.id) then
    raise exception 'Essa opção não faz parte do Chama.' using errcode = '22023';
  end if;

  if v_uid is not null then
    insert into public.votos (chama_id, opcao_id, usuario_id)
    values (v_chama.id, p_opcao_id, v_uid)
    on conflict (chama_id, usuario_id)
      do update set opcao_id = excluded.opcao_id, created_at = now();
  elsif p_convidado_id is not null then
    insert into public.votos (chama_id, opcao_id, convidado_id, convidado_nome)
    values (v_chama.id, p_opcao_id, p_convidado_id, left(nullif(btrim(p_convidado_nome), ''), 40))
    on conflict (chama_id, convidado_id)
      do update set opcao_id = excluded.opcao_id,
                    convidado_nome = coalesce(excluded.convidado_nome, public.votos.convidado_nome),
                    created_at = now();
  else
    raise exception 'Não deu para identificar o voto. Recarregue a página.' using errcode = '22023';
  end if;

  return public.chama_publica(p_codigo, p_convidado_id);
end;
$$;

-- ---------------------------------------------------------------------
-- Radar social: amigos = quem divide alguma Turma com você.
-- Regras de privacidade (tabela preferencias):
--   mostrar_estou_aqui -> aparece no lugar exato do check-in
--   só mostrar_regiao  -> aparece no centro aproximado do bairro
--   nenhum dos dois    -> não aparece
-- ---------------------------------------------------------------------
create function public.amigos_por_perto()
returns table (
  usuario_id uuid,
  nome text,
  username text,
  situacao text,
  local_id uuid,
  local_nome text,
  regiao text,
  latitude numeric,
  longitude numeric,
  desde timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with amigos as (
    select distinct m2.usuario_id
    from public.turma_membros m1
    join public.turma_membros m2 on m2.turma_id = m1.turma_id and m2.usuario_id <> m1.usuario_id
    where m1.usuario_id = (select auth.uid())
  ),
  presenca as (
    select distinct on (c.usuario_id) c.usuario_id, c.local_id, c.created_at
    from public.checkins c
    join amigos a on a.usuario_id = c.usuario_id
    where c.expira_em > now()
    order by c.usuario_id, c.created_at desc
  ),
  centro_regiao as (
    select regiao_id, avg(latitude) as latitude, avg(longitude) as longitude
    from public.locais
    group by regiao_id
  )
  select p.id, p.nome, p.username,
         case when pref.mostrar_estou_aqui then 'no_local' else 'na_regiao' end,
         case when pref.mostrar_estou_aqui then l.id end,
         case when pref.mostrar_estou_aqui then l.nome end,
         r.nome,
         case when pref.mostrar_estou_aqui then l.latitude else round(cr.latitude, 3) end,
         case when pref.mostrar_estou_aqui then l.longitude else round(cr.longitude, 3) end,
         pres.created_at
  from presenca pres
  join public.profiles p on p.id = pres.usuario_id
  join public.preferencias pref on pref.usuario_id = pres.usuario_id
  join public.locais l on l.id = pres.local_id
  join public.regioes r on r.id = l.regiao_id
  join centro_regiao cr on cr.regiao_id = l.regiao_id
  where pref.mostrar_estou_aqui or pref.mostrar_regiao

  union all

  select p.id, p.nome, p.username, 'quer_sair', null, null,
         case when pref.mostrar_regiao then r.nome end,
         null, null, p.updated_at
  from amigos a
  join public.profiles p on p.id = a.usuario_id
  join public.preferencias pref on pref.usuario_id = p.id
  left join public.regioes r on r.id = p.regiao_id
  where p.quer_sair_ate > now()
    and not exists (select 1 from presenca pres where pres.usuario_id = p.id);
$$;

-- ---------------------------------------------------------------------
-- Perfil e retrospectiva (security invoker: rodam com o RLS de quem chama)
-- ---------------------------------------------------------------------
create function public.meu_resumo()
returns jsonb
language sql
stable
set search_path = ''
as $$
  with eu as (
    select * from public.profiles where id = (select auth.uid())
  ),
  atividade as (
    select local_id from public.checkins where usuario_id = (select auth.uid())
    union all
    select local_id from public.pulsos where autor_id = (select auth.uid())
  ),
  por_categoria as (
    select c.nome, count(*) as qtd
    from atividade a
    join public.locais l on l.id = a.local_id
    join public.categorias c on c.id = l.categoria_id
    group by c.nome
  )
  select jsonb_build_object(
    'xp', eu.xp,
    'nivel', eu.nivel,
    'xp_nivel_atual', (100 * (eu.nivel - 1) * (eu.nivel - 1)),
    'xp_proximo_nivel', (100 * eu.nivel * eu.nivel),
    'lugares', (select count(distinct local_id) from atividade),
    'pulsos', (select count(*) from public.pulsos where autor_id = eu.id),
    'turmas', (select count(*) from public.turma_membros where usuario_id = eu.id),
    'estilo', (
      select coalesce(jsonb_agg(jsonb_build_object('nome', nome, 'pct', pct) order by pct desc, nome), '[]'::jsonb)
      from (select nome, round(100.0 * qtd / sum(qtd) over ())::integer as pct from por_categoria) s
    ),
    'conquistas', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'codigo', c.codigo, 'nome', c.nome, 'descricao', c.descricao, 'obtida_em', uc.obtida_em
             ) order by uc.obtida_em), '[]'::jsonb)
      from public.usuario_conquistas uc
      join public.conquistas c on c.id = uc.conquista_id
      where uc.usuario_id = eu.id
    )
  )
  from eu;
$$;

create function public.minha_retrospectiva(p_mes date default current_date)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with periodo as (
    select date_trunc('month', p_mes::timestamp) as inicio,
           date_trunc('month', p_mes::timestamp) + interval '1 month' as fim
  ),
  atividade as (
    select c.local_id, c.created_at
    from public.checkins c, periodo
    where c.usuario_id = (select auth.uid()) and c.created_at >= periodo.inicio and c.created_at < periodo.fim
    union all
    select p.local_id, p.created_at
    from public.pulsos p, periodo
    where p.autor_id = (select auth.uid()) and p.created_at >= periodo.inicio and p.created_at < periodo.fim
  ),
  anteriores as (
    select c.local_id from public.checkins c, periodo
    where c.usuario_id = (select auth.uid()) and c.created_at < periodo.inicio
    union
    select p.local_id from public.pulsos p, periodo
    where p.autor_id = (select auth.uid()) and p.created_at < periodo.inicio
  )
  select jsonb_build_object(
    'inicio', (select inicio::date from periodo),
    'roles', (select count(distinct (created_at at time zone 'America/Sao_Paulo')::date) from atividade),
    'pulsos', (select count(*) from public.pulsos p, periodo
               where p.autor_id = (select auth.uid()) and p.created_at >= periodo.inicio and p.created_at < periodo.fim),
    'lugares', (select count(distinct local_id) from atividade),
    'lugares_novos', (select count(distinct a.local_id) from atividade a
                      where a.local_id not in (select local_id from anteriores)),
    'regiao_favorita', (
      select r.nome from atividade a
      join public.locais l on l.id = a.local_id
      join public.regioes r on r.id = l.regiao_id
      group by r.nome order by count(*) desc, r.nome limit 1
    ),
    'estilo', (
      select g.nome from atividade a
      join public.locais l on l.id = a.local_id
      join public.generos_musicais g on g.id = l.genero_principal_id
      group by g.nome order by count(*) desc, g.nome limit 1
    )
  );
$$;

-- Ranking agregado: conta Pulsos dos últimos 30 dias sem expor autores.
create function public.ranking_da_cena(p_slug text)
returns table (posicao integer, local_id uuid, nome text, regiao text, pulsos_30d integer)
language sql
stable
security definer
set search_path = ''
as $$
  select (row_number() over (order by count(p.id) desc, l.nome))::integer,
         l.id, l.nome, r.nome, count(p.id)::integer
  from public.cenas c
  join public.locais l on l.genero_principal_id = c.genero_id
  join public.regioes r on r.id = l.regiao_id
  left join public.pulsos p on p.local_id = l.id and p.created_at > now() - interval '30 days'
  where c.slug = p_slug
  group by l.id, l.nome, r.nome
  order by 1
  limit 10;
$$;
