-- =====================================================================
-- Vale Sair? · Lugares de demonstração (Belo Horizonte)
--
-- Dados para testes e para a apresentação do MVP. Descrições, endereços e
-- coordenadas são aproximados; não representam informações oficiais.
-- Pode rodar mais de uma vez (on conflict do nothing).
-- =====================================================================

insert into public.locais (
  nome, slug, categoria_id, regiao_id, genero_principal_id, descricao, endereco,
  latitude, longitude, faixa_preco, fecha_as, musica_ao_vivo, foto_url
)
select v.nome, v.slug, c.id, r.id, g.id, v.descricao, v.endereco,
       v.lat, v.lng, v.preco, v.fecha::time, v.ao_vivo, 'assets/img/role-bh.jpg'
from (values
  ('Galpão 54', 'galpao-54', 'bar', 'Savassi', 'pop',
   'Bar urbano, pista aberta e programação que mistura pop, funk e DJs locais.',
   'Savassi, Belo Horizonte', -19.937200, -43.933800, 2, '02:00', false),
  ('Mercado Novo', 'mercado-novo', 'mercado', 'Centro', 'indie',
   'Andares de bares, cervejarias e lojas independentes que lotam no fim de semana.',
   'Av. Olegário Maciel, 742 · Centro', -19.923600, -43.944700, 2, '23:00', false),
  ('Mister Rock', 'mister-rock', 'casa-de-show', 'Prado', 'rock',
   'Casa de shows com bandas autorais e covers até de madrugada.',
   'Prado, Belo Horizonte', -19.928700, -43.963600, 2, '03:00', true),
  ('Autêntico', 'autentico', 'bar', 'Savassi', 'samba',
   'Roda de samba ao vivo, petiscos e mesas na calçada.',
   'Savassi, Belo Horizonte', -19.939800, -43.936500, 2, '01:00', true),
  ('Quintal do Chalé', 'quintal-do-chale', 'boteco', 'Santa Tereza', 'samba',
   'Quintal com samba de raiz e cerveja gelada no bairro mais boêmio da cidade.',
   'Santa Tereza, Belo Horizonte', -19.912800, -43.915100, 1, '00:00', true),
  ('Distrital', 'distrital', 'balada', 'Funcionários', 'eletronica',
   'Pista escura, som alto e line-up de DJs da cena local.',
   'Funcionários, Belo Horizonte', -19.933900, -43.928400, 3, '05:00', false),
  ('Estação Baile', 'estacao-baile', 'balada', 'Floresta', 'funk',
   'Baile funk com MCs convidados e pista cheia a noite toda.',
   'Floresta, Belo Horizonte', -19.916000, -43.931000, 2, '04:00', true),
  ('Casa Lua', 'casa-lua', 'restaurante', 'Lourdes', 'mpb',
   'Cozinha mineira contemporânea com voz e violão nas quintas e sextas.',
   'Lourdes, Belo Horizonte', -19.932700, -43.943100, 3, '00:00', true)
) as v (nome, slug, categoria, regiao, genero, descricao, endereco, lat, lng, preco, fecha, ao_vivo)
join public.categorias c on c.slug = v.categoria
join public.regioes r on r.nome = v.regiao
left join public.generos_musicais g on g.slug = v.genero
on conflict (slug) do nothing;
