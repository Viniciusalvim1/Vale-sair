-- =====================================================================
-- Vale Sair? · Dados de demonstração
--
-- Cria pessoas fictícias (e-mails @demo.valesair.invalid: o domínio .invalid
-- é reservado e nunca recebe e-mail), uma Turma, Pulsos, check-ins,
-- mensagens na Sala e um Chama aberto, para o app ter vida nos testes e
-- na apresentação.
--
-- Como usar: cole no SQL Editor do Supabase e rode. Pode rodar quantas vezes
-- quiser: Pulsos e check-ins (que expiram em poucas horas) são renovados.
-- Para apagar tudo o que foi criado aqui, rode supabase/demo/remover-demo.sql.
-- As contas recebem senhas aleatórias: servem só de conteúdo, ninguém entra
-- com elas.
-- =====================================================================

do $$
declare
  v_pessoas constant jsonb := '[
    {"email": "julia@demo.valesair.invalid", "nome": "Júlia Ramos", "username": "julia"},
    {"email": "leo@demo.valesair.invalid", "nome": "Leo Martins", "username": "leo"},
    {"email": "gi@demo.valesair.invalid", "nome": "Gi Costa", "username": "gi.costa"},
    {"email": "galpao54@demo.valesair.invalid", "nome": "Galpão 54", "username": "galpao54"}
  ]';
  v_pessoa jsonb;
  v_ids jsonb := '{}'::jsonb;
  v_id uuid;
  v_julia uuid;
  v_leo uuid;
  v_gi uuid;
  v_gestor uuid;
  v_galpao uuid := (select id from public.locais where slug = 'galpao-54');
  v_mercado uuid := (select id from public.locais where slug = 'mercado-novo');
  v_rock uuid := (select id from public.locais where slug = 'mister-rock');
  v_autentico uuid := (select id from public.locais where slug = 'autentico');
  v_turma uuid;
  v_chama uuid;
  v_pulso uuid;
begin
  -- 1) Pessoas fictícias (o gatilho do banco cria perfil e preferências).
  -- Os ids são guardados aqui mesmo: o username no perfil pode ganhar
  -- sufixo se já existir outro igual, mas o e-mail é sempre único.
  for v_pessoa in select * from jsonb_array_elements(v_pessoas) loop
    select id into v_id from auth.users where email = v_pessoa ->> 'email';
    if v_id is null then
      v_id := gen_random_uuid();
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change
      ) values (
        '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_pessoa ->> 'email',
        extensions.crypt(encode(extensions.gen_random_bytes(18), 'base64'), extensions.gen_salt('bf')), now(),
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        jsonb_build_object('nome', v_pessoa ->> 'nome', 'username', v_pessoa ->> 'username'),
        now(), now(), '', '', '', ''
      );
      insert into auth.identities (user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      values (v_id, v_id::text,
              jsonb_build_object('sub', v_id::text, 'email', v_pessoa ->> 'email', 'email_verified', true),
              'email', now(), now(), now());
    end if;
    v_ids := v_ids || jsonb_build_object(v_pessoa ->> 'username', v_id);
  end loop;

  v_julia := (v_ids ->> 'julia')::uuid;
  v_leo := (v_ids ->> 'leo')::uuid;
  v_gi := (v_ids ->> 'gi')::uuid;
  v_gestor := (v_ids ->> 'galpao54')::uuid;

  if v_galpao is null then
    raise exception 'Rode antes o supabase/seed.sql: os lugares de demonstração não estão no banco.';
  end if;

  -- 2) Perfis e privacidade
  update public.profiles
     set bio = 'Samba no sábado, pista na sexta.', regiao_id = (select id from public.regioes where nome = 'Savassi')
   where id = v_julia;
  update public.profiles
     set bio = 'Se tem banda ao vivo, eu tô.', regiao_id = (select id from public.regioes where nome = 'Centro')
   where id = v_leo;
  update public.profiles
     set quer_sair_ate = now() + interval '3 hours', regiao_id = (select id from public.regioes where nome = 'Funcionários')
   where id = v_gi;
  -- Leo aparece no radar só pela região; todos liberam Pulsos nas Cenas
  update public.preferencias set mostrar_estou_aqui = false where usuario_id = v_leo;
  update public.preferencias set pulsos_em_cenas = true where usuario_id in (v_julia, v_leo, v_gi);
  -- as mensagens deste perfil aparecem como "oficial" na Sala do Galpão 54
  update public.locais set responsavel_id = v_gestor where id = v_galpao;

  -- 3) Turma
  select id into v_turma from public.turmas where criador_id = v_julia and nome = 'Os de sempre';
  if v_turma is null then
    insert into public.turmas (nome, descricao, criador_id)
    values ('Os de sempre', 'Quem sai toda sexta.', v_julia)
    returning id into v_turma;
  end if;
  insert into public.turma_membros (turma_id, usuario_id)
  values (v_turma, v_leo), (v_turma, v_gi)
  on conflict do nothing;

  -- 4) Pulsos: valem 2 horas, então a cada execução os da demo são renovados
  delete from public.pulsos where autor_id in (v_julia, v_leo, v_gi) and expira_em > now();
  insert into public.pulsos (local_id, autor_id, movimento, fila_minutos, genero_id, legenda, created_at, expira_em) values
    (v_galpao, v_julia, 'cheio', 8, (select id from public.generos_musicais where slug = 'pop'),
     'A noite começou', now() - interval '4 minutes', now() + interval '116 minutes'),
    (v_galpao, v_leo, 'cheio', 10, (select id from public.generos_musicais where slug = 'funk'),
     'DJ na pista', now() - interval '11 minutes', now() + interval '109 minutes'),
    (v_mercado, v_gi, 'animado', 0, null,
     'Sem fila no terceiro andar', now() - interval '25 minutes', now() + interval '95 minutes'),
    (v_autentico, v_leo, 'animado', 5, (select id from public.generos_musicais where slug = 'samba'),
     'Roda de samba rolando', now() - interval '38 minutes', now() + interval '82 minutes'),
    (v_rock, v_gi, 'tranquilo', 0, (select id from public.generos_musicais where slug = 'rock'),
     'Banda começa às 23h', now() - interval '52 minutes', now() + interval '68 minutes');

  select id into v_pulso from public.pulsos
   where autor_id = v_julia and local_id = v_galpao and expira_em > now()
   order by created_at desc limit 1;
  insert into public.pulso_confirmacoes (pulso_id, usuario_id)
  values (v_pulso, v_leo), (v_pulso, v_gi) on conflict do nothing;
  insert into public.pulso_reacoes (pulso_id, usuario_id, tipo)
  values (v_pulso, v_leo, 'flame'), (v_pulso, v_gi, 'spark') on conflict do nothing;

  -- 5) Presença
  delete from public.checkins where usuario_id in (v_julia, v_leo) and expira_em > now();
  insert into public.checkins (usuario_id, local_id, created_at, expira_em) values
    (v_julia, v_galpao, now() - interval '20 minutes', now() + interval '160 minutes'),
    (v_leo, v_mercado, now() - interval '30 minutes', now() + interval '150 minutes');

  -- 6) Sala do Galpão 54
  if not exists (select 1 from public.mensagens where local_id = v_galpao and created_at > now() - interval '2 hours') then
    insert into public.mensagens (local_id, autor_id, conteudo, created_at) values
      (v_galpao, v_julia, 'A fila está andando rápido?', now() - interval '6 minutes'),
      (v_galpao, v_gestor, 'Sim! Uns 8 minutos agora.', now() - interval '5 minutes'),
      (v_galpao, v_leo, 'O DJ já começou. Tá bem animado', now() - interval '2 minutes');
  end if;

  -- 7) Chama aberto na Turma
  if not exists (select 1 from public.chamas where turma_id = v_turma and encerra_em > now()) then
    insert into public.chamas (turma_id, criador_id, titulo, quando, encerra_em)
    values (v_turma, v_julia, 'Bora sexta?',
            date_trunc('day', now()) + interval '1 day 22 hours 30 minutes', now() + interval '6 hours')
    returning id into v_chama;
    insert into public.chama_opcoes (chama_id, local_id, ordem)
    values (v_chama, v_galpao, 1), (v_chama, v_mercado, 2), (v_chama, v_rock, 3);
    insert into public.votos (chama_id, opcao_id, usuario_id)
    select v_chama, o.id, v.usuario
    from (values (v_leo, 1), (v_gi, 1), (v_julia, 2)) as v (usuario, ordem)
    join public.chama_opcoes o on o.chama_id = v_chama and o.ordem = v.ordem;
  end if;

  -- 8) Cenas
  insert into public.cena_membros (cena_id, usuario_id)
  select c.id, v.usuario
  from (values ('samba-bh', v_julia), ('samba-bh', v_gi), ('rock-bh', v_leo), ('eletronica-bh', v_gi)) as v (slug, usuario)
  join public.cenas c on c.slug = v.slug
  on conflict do nothing;
end;
$$;
