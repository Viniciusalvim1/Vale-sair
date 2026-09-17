-- =====================================================================
-- Vale Sair? · Dados de referência (catálogos que o app precisa para rodar)
-- =====================================================================

insert into public.regioes (nome) values
  ('Savassi'), ('Centro'), ('Lourdes'), ('Funcionários'), ('Santa Tereza'),
  ('Prado'), ('Floresta'), ('Santo Agostinho'), ('Sion'), ('Pampulha');

insert into public.categorias (nome, slug) values
  ('Bar', 'bar'),
  ('Boteco', 'boteco'),
  ('Restaurante', 'restaurante'),
  ('Balada', 'balada'),
  ('Casa de show', 'casa-de-show'),
  ('Mercado', 'mercado');

insert into public.generos_musicais (nome, slug) values
  ('Pop', 'pop'), ('Funk', 'funk'), ('Samba', 'samba'), ('Pagode', 'pagode'),
  ('Rock', 'rock'), ('Eletrônica', 'eletronica'), ('MPB', 'mpb'),
  ('Sertanejo', 'sertanejo'), ('Forró', 'forro'), ('Indie', 'indie');

insert into public.conquistas (codigo, nome, descricao, xp) values
  ('primeiro_pulso', 'Primeiro Pulso', 'Mostrou a noite como ela é pela primeira vez.', 30),
  ('reporter_da_noite', 'Repórter da Noite', 'Publicou 10 Pulsos.', 80),
  ('boa_fonte', 'Boa Fonte', 'Um Pulso seu foi confirmado por 5 pessoas.', 50),
  ('olho_vivo', 'Olho Vivo', 'Confirmou 10 Pulsos de outras pessoas.', 40),
  ('faisca', 'Faísca', 'Criou o primeiro Chama.', 30),
  ('to_sempre_aqui', 'Tô Sempre Aqui', 'Fez 5 check-ins.', 40),
  ('explorador', 'Explorador da Noite', 'Conheceu 5 lugares diferentes.', 60);

insert into public.cenas (nome, slug, descricao, genero_id, cor)
select v.nome, v.slug, v.descricao, g.id, v.cor
from (values
  ('Samba BH', 'samba-bh', 'Agenda, lugares e gente que mantém a roda girando.', 'samba', 'coral'),
  ('Eletrônica BH', 'eletronica-bh', 'Festas, DJs locais e movimento em tempo real.', 'eletronica', 'blue'),
  ('Rock BH', 'rock-bh', 'Bandas ao vivo, bares de rock e noites barulhentas.', 'rock', 'purple'),
  ('Funk BH', 'funk-bh', 'Bailes, pistas cheias e o som que faz a cidade dançar.', 'funk', 'lime')
) as v (nome, slug, descricao, genero, cor)
join public.generos_musicais g on g.slug = v.genero;
