-- =====================================================================
-- Vale Sair? · Estrutura relacional
--
-- Convenções
--   * nomes em português e snake_case
--   * uuid para o que as pessoas criam; identity para catálogos
--   * colunas de autoria usam auth.uid() como padrão, então o front-end
--     nunca informa "quem sou eu" (e não consegue se passar por outra pessoa)
-- =====================================================================

create type public.movimento_nivel as enum ('tranquilo', 'animado', 'cheio', 'lotado');
create type public.papel_turma as enum ('admin', 'membro');
create type public.midia_tipo as enum ('foto', 'video');
create type public.reacao_tipo as enum ('flame', 'spark');
create type public.notificacao_tipo as enum ('chama', 'movimento', 'pulso', 'turma', 'conquista', 'sistema');

-- ---------------------------------------------------------------------
-- Catálogos
-- ---------------------------------------------------------------------
create table public.regioes (
  id smallint generated always as identity primary key,
  nome text not null unique,
  cidade text not null default 'Belo Horizonte'
);
comment on table public.regioes is 'Bairros e regiões. A privacidade do app mostra a região, nunca a localização exata.';

create table public.categorias (
  id smallint generated always as identity primary key,
  nome text not null unique,
  slug text not null unique
);
comment on table public.categorias is 'Tipos de lugar: bar, boteco, balada, casa de show...';

create table public.generos_musicais (
  id smallint generated always as identity primary key,
  nome text not null unique,
  slug text not null unique
);

create table public.conquistas (
  id smallint generated always as identity primary key,
  codigo text not null unique,
  nome text not null,
  descricao text not null,
  xp smallint not null default 0 check (xp >= 0)
);
comment on table public.conquistas is 'Gamificação: conquistas liberadas por gatilhos do banco.';

-- ---------------------------------------------------------------------
-- Pessoas
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null check (char_length(nome) between 2 and 60),
  username text not null unique check (username ~ '^[a-z0-9_.]{3,24}$'),
  bio text check (char_length(bio) <= 160),
  avatar_url text,
  regiao_id smallint references public.regioes (id) on delete set null,
  xp integer not null default 0 check (xp >= 0),
  nivel integer generated always as (floor(sqrt(xp / 100.0))::integer + 1) stored,
  quer_sair_ate timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'Perfil público de cada conta (1:1 com auth.users), criado por gatilho no cadastro.';
comment on column public.profiles.nivel is 'Nível derivado do XP: 1 + raiz(xp/100). Nível 2 = 100 XP, 3 = 400 XP, 4 = 900 XP.';
comment on column public.profiles.quer_sair_ate is 'Status "QUERO SAIR": vale até este instante.';
create index profiles_regiao_idx on public.profiles (regiao_id);

create table public.preferencias (
  usuario_id uuid primary key references public.profiles (id) on delete cascade,
  mostrar_regiao boolean not null default true,
  mostrar_estou_aqui boolean not null default true,
  pulsos_em_cenas boolean not null default false,
  reduzir_movimento boolean not null default false,
  updated_at timestamptz not null default now()
);
comment on table public.preferencias is 'Configurações de privacidade. Só a própria pessoa lê e altera.';

-- ---------------------------------------------------------------------
-- Lugares
-- ---------------------------------------------------------------------
create table public.locais (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique,
  categoria_id smallint not null references public.categorias (id),
  regiao_id smallint not null references public.regioes (id),
  genero_principal_id smallint references public.generos_musicais (id),
  descricao text,
  endereco text not null,
  latitude numeric(9, 6) not null check (latitude between -90 and 90),
  longitude numeric(9, 6) not null check (longitude between -180 and 180),
  faixa_preco smallint not null default 2 check (faixa_preco between 1 and 4),
  fecha_as time,
  musica_ao_vivo boolean not null default false,
  foto_url text,
  instagram text,
  tiktok text,
  cardapio_url text,
  responsavel_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
comment on column public.locais.responsavel_id is 'Gestor do lugar. Mensagens dele aparecem como "oficial" na Sala.';
create index locais_categoria_idx on public.locais (categoria_id);
create index locais_regiao_idx on public.locais (regiao_id);
create index locais_genero_idx on public.locais (genero_principal_id);
create index locais_responsavel_idx on public.locais (responsavel_id);

create table public.locais_salvos (
  usuario_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  local_id uuid not null references public.locais (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (usuario_id, local_id)
);
create index locais_salvos_local_idx on public.locais_salvos (local_id);

-- ---------------------------------------------------------------------
-- Tempo real colaborativo
-- ---------------------------------------------------------------------
create table public.pulsos (
  id uuid primary key default gen_random_uuid(),
  local_id uuid not null references public.locais (id) on delete cascade,
  autor_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  movimento public.movimento_nivel not null,
  fila_minutos smallint check (fila_minutos between 0 and 240),
  genero_id smallint references public.generos_musicais (id),
  legenda text check (char_length(legenda) <= 80),
  midia_path text,
  midia_tipo public.midia_tipo,
  created_at timestamptz not null default now(),
  expira_em timestamptz not null default now() + interval '2 hours',
  check ((midia_path is null) = (midia_tipo is null))
);
comment on table public.pulsos is 'Atualização "sem filtro" de quem está no lugar: movimento, fila e mídia. Expira em 2 horas.';
create index pulsos_local_recentes_idx on public.pulsos (local_id, created_at desc);
create index pulsos_autor_idx on public.pulsos (autor_id, created_at desc);
create index pulsos_expira_idx on public.pulsos (expira_em);
create index pulsos_genero_idx on public.pulsos (genero_id);

create table public.pulso_confirmacoes (
  pulso_id uuid not null references public.pulsos (id) on delete cascade,
  usuario_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (pulso_id, usuario_id)
);
comment on table public.pulso_confirmacoes is '"Continua assim": outras pessoas confirmam que o Pulso segue atual. Base do selo de confiança.';
create index pulso_confirmacoes_usuario_idx on public.pulso_confirmacoes (usuario_id);

create table public.pulso_reacoes (
  pulso_id uuid not null references public.pulsos (id) on delete cascade,
  usuario_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  tipo public.reacao_tipo not null default 'flame',
  created_at timestamptz not null default now(),
  primary key (pulso_id, usuario_id)
);
create index pulso_reacoes_usuario_idx on public.pulso_reacoes (usuario_id);

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  local_id uuid not null references public.locais (id) on delete cascade,
  created_at timestamptz not null default now(),
  expira_em timestamptz not null default now() + interval '3 hours'
);
comment on table public.checkins is '"TÔ AQUI": presença confirmada manualmente. Só um check-in vale por vez.';
create index checkins_usuario_idx on public.checkins (usuario_id, created_at desc);
create index checkins_local_ativos_idx on public.checkins (local_id, expira_em);

create table public.mensagens (
  id bigint generated always as identity primary key,
  local_id uuid not null references public.locais (id) on delete cascade,
  autor_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  conteudo text not null check (char_length(btrim(conteudo)) between 1 and 280),
  created_at timestamptz not null default now()
);
comment on table public.mensagens is 'Chat da Sala de cada lugar.';
create index mensagens_local_idx on public.mensagens (local_id, id);
create index mensagens_autor_idx on public.mensagens (autor_id, created_at desc);

-- ---------------------------------------------------------------------
-- Social: Turmas, Chamas (enquetes) e Cenas
-- ---------------------------------------------------------------------
create table public.turmas (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(btrim(nome)) between 2 and 40),
  descricao text check (char_length(descricao) <= 140),
  criador_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  codigo_convite text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 6)),
  created_at timestamptz not null default now()
);
comment on table public.turmas is 'Grupo fechado de amigos. Entrada por código de convite.';
create index turmas_criador_idx on public.turmas (criador_id);

create table public.turma_membros (
  turma_id uuid not null references public.turmas (id) on delete cascade,
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  papel public.papel_turma not null default 'membro',
  created_at timestamptz not null default now(),
  primary key (turma_id, usuario_id)
);
create index turma_membros_usuario_idx on public.turma_membros (usuario_id);

create table public.chamas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 5)),
  turma_id uuid references public.turmas (id) on delete cascade,
  criador_id uuid not null references public.profiles (id) on delete cascade,
  titulo text not null default 'Onde vamos?' check (char_length(btrim(titulo)) between 2 and 60),
  quando timestamptz,
  encerra_em timestamptz not null default now() + interval '6 hours',
  created_at timestamptz not null default now(),
  check (encerra_em > created_at)
);
comment on table public.chamas is 'Enquete "onde vamos?" com 2 a 4 lugares. Pode ser votada pelo link, mesmo sem conta.';
create index chamas_turma_idx on public.chamas (turma_id, created_at desc);
create index chamas_criador_idx on public.chamas (criador_id);

create table public.chama_opcoes (
  id uuid primary key default gen_random_uuid(),
  chama_id uuid not null references public.chamas (id) on delete cascade,
  local_id uuid not null references public.locais (id) on delete cascade,
  ordem smallint not null check (ordem between 1 and 4),
  unique (chama_id, local_id),
  unique (chama_id, ordem),
  unique (id, chama_id)
);
create index chama_opcoes_local_idx on public.chama_opcoes (local_id);

create table public.votos (
  id bigint generated always as identity primary key,
  chama_id uuid not null references public.chamas (id) on delete cascade,
  opcao_id uuid not null,
  usuario_id uuid references public.profiles (id) on delete cascade,
  convidado_id uuid,
  convidado_nome text check (char_length(convidado_nome) <= 40),
  created_at timestamptz not null default now(),
  -- a opção votada precisa pertencer ao mesmo Chama
  foreign key (opcao_id, chama_id) references public.chama_opcoes (id, chama_id) on delete cascade,
  -- ou é uma conta, ou é um convidado pelo link: nunca os dois
  check ((usuario_id is null) <> (convidado_id is null)),
  unique (chama_id, usuario_id),
  unique (chama_id, convidado_id)
);
comment on column public.votos.convidado_id is 'Identificador gerado no navegador de quem vota pelo link sem ter conta.';
create index votos_opcao_idx on public.votos (opcao_id, chama_id);
create index votos_usuario_idx on public.votos (usuario_id);

create table public.cenas (
  id smallint generated always as identity primary key,
  nome text not null unique,
  slug text not null unique,
  descricao text not null,
  genero_id smallint references public.generos_musicais (id),
  cor text not null default 'purple' check (cor in ('purple', 'coral', 'blue', 'lime'))
);
comment on table public.cenas is 'Comunidade aberta de um estilo (Samba BH, Eletrônica BH...).';
create index cenas_genero_idx on public.cenas (genero_id);

create table public.cena_membros (
  cena_id smallint not null references public.cenas (id) on delete cascade,
  usuario_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (cena_id, usuario_id)
);
create index cena_membros_usuario_idx on public.cena_membros (usuario_id);

-- ---------------------------------------------------------------------
-- Notificações e gamificação
-- ---------------------------------------------------------------------
create table public.notificacoes (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  tipo public.notificacao_tipo not null,
  titulo text not null,
  corpo text,
  link text,
  lida boolean not null default false,
  created_at timestamptz not null default now()
);
comment on table public.notificacoes is 'Geradas por gatilhos e RPCs do banco (Chama criado, lugar enchendo, conquista...).';
create index notificacoes_usuario_idx on public.notificacoes (usuario_id, created_at desc);

create table public.usuario_conquistas (
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  conquista_id smallint not null references public.conquistas (id) on delete cascade,
  obtida_em timestamptz not null default now(),
  primary key (usuario_id, conquista_id)
);
create index usuario_conquistas_conquista_idx on public.usuario_conquistas (conquista_id);
