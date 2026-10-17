-- =====================================================================
-- Vale Sair? · Lugares de Belo Horizonte
--
-- Nomes, endereços e coordenadas vêm do OpenStreetMap (© colaboradores do
-- OpenStreetMap, licença ODbL), consultados pela Overpass API. São lugares
-- reais: confira antes de publicar, porque bar fecha e muda de endereço.
--
-- O que o OpenStreetMap NÃO traz e ficou para a equipe preencher:
--   * genero_principal_id: só foi preenchido quando o próprio nome ou a
--     natureza do lugar deixa claro (Jack Rock Bar, Casa do Samba...);
--   * musica_ao_vivo: idem, marcado só nas casas de show e nos lugares
--     que são conhecidos por música ao vivo;
--   * faixa_preco: todos entraram como 2 ($$), que é o padrão da coluna;
--   * fecha_as e foto_url: em branco, para ninguém publicar horário errado.
--
-- Pode rodar mais de uma vez (on conflict do nothing).
-- =====================================================================

insert into public.locais (
  nome, slug, categoria_id, regiao_id, genero_principal_id, descricao, endereco,
  latitude, longitude, musica_ao_vivo
)
select v.nome, v.slug, c.id, r.id, g.id, v.descricao, v.endereco, v.lat, v.lng, v.ao_vivo
from (values
  ('Mercado Central', 'mercado-central', 'mercado', 'Centro', null,
   'Mercado tradicional do Centro, com bares e botecos entre as bancas.',
   'Avenida Augusto de Lima, 744 · Centro', -19.922582, -43.943024, false),
  ('Mercado Novo', 'mercado-novo', 'mercado', 'Centro', null,
   'Prédio modernista no Centro que virou point de bares e cervejarias independentes.',
   'Rua dos Tupis, 879 · Centro', -19.920613, -43.945293, false),
  ('Mercado Distrital de Santa Tereza', 'mercado-distrital-santa-tereza', 'mercado', 'Santa Tereza', null,
   'Mercado de bairro em Santa Tereza, com bares e mesas na área central.',
   'Rua São Gotardo, 273 · Santa Tereza', -19.912600, -43.911833, false),
  ('Cantina do Lucas', 'cantina-do-lucas', 'restaurante', 'Centro', 'mpb',
   'Restaurante e bar no Edifício Maletta, ponto histórico da boemia do Centro.',
   'Avenida Augusto de Lima, 233 · Centro', -19.924811, -43.937578, true),
  ('Sindicato do Chopp', 'sindicato-do-chopp', 'bar', 'Centro', null,
   'Choperia na Rua da Bahia, no corredor boêmio do Centro.',
   'Rua da Bahia, 1172 · Centro', -19.925189, -43.937644, false),
  ('Zona', 'zona', 'bar', 'Centro', 'eletronica',
   'Bar com pista de dança na Rua Aarão Reis.',
   'Rua Aarão Reis, 554 · Centro', -19.919508, -43.934620, false),
  ('A Obra', 'a-obra', 'balada', 'Savassi', 'rock',
   'Bar dançante na Savassi, na Rua Rio Grande do Norte.',
   'Rua Rio Grande do Norte, 1168 · Savassi', -19.935816, -43.932255, false),
  ('Jack Rock Bar', 'jack-rock-bar', 'bar', 'Carmo', 'rock',
   'Bar de rock na Avenida do Contorno.',
   'Avenida do Contorno, 5623 · Carmo', -19.939673, -43.929766, true),
  ('Duke''n''Duke', 'duke-n-duke', 'bar', 'Savassi', null,
   'Bar de hambúrgueres e drinks na Rua Alagoas, na Savassi.',
   'Rua Alagoas, 1470 · Savassi', -19.939889, -43.937465, false),
  ('Moema', 'moema', 'bar', 'Savassi', null,
   'Bar tradicional da Savassi, na Rua Sergipe.',
   'Rua Sergipe, 1370 · Savassi', -19.938437, -43.938563, false),
  ('Albanos', 'albanos', 'boteco', 'Sion', null,
   'Choperia de bairro no Sion, na Rua Pium-í.',
   'Rua Pium-i, 611 · Sion', -19.945125, -43.930462, false),
  ('Mercearia Lacerda', 'mercearia-lacerda', 'boteco', 'Santa Tereza', null,
   'Boteco na Rua Mármore, no coração boêmio de Santa Tereza.',
   'Rua Mármore, 170 · Santa Tereza', -19.915750, -43.920861, false),
  ('Bar do Museu Clube da Esquina', 'bar-do-museu-clube-da-esquina', 'boteco', 'Santa Tereza', 'mpb',
   'Bar do museu dedicado ao Clube da Esquina, em Santa Tereza.',
   'Rua Paraisópolis, 738 · Santa Tereza', -19.915419, -43.912734, true),
  ('Casa do Samba Resenha', 'casa-do-samba-resenha', 'bar', 'Santa Efigênia', 'samba',
   'Casa de samba na Rua Niquelina, em Santa Efigênia.',
   'Rua Niquelina, 691 · Santa Efigênia', -19.921601, -43.914655, true),
  ('Granfinos', 'granfinos', 'boteco', 'Santa Efigênia', null,
   'Boteco na Avenida Brasil, em Santa Efigênia.',
   'Avenida Brasil · Santa Efigênia', -19.924865, -43.923207, false),
  ('Bar do Bolão', 'bar-do-bolao', 'boteco', 'Padre Eustáquio', null,
   'Boteco tradicional do Padre Eustáquio, na Rua Vila Rica.',
   'Rua Vila Rica, 637 · Padre Eustáquio', -19.917278, -43.981962, false),
  ('BeFly Hall', 'befly-hall', 'casa-de-show', 'Savassi', null,
   'Casa de shows na Avenida Nossa Senhora do Carmo.',
   'Avenida Nossa Senhora do Carmo, 230 · Savassi', -19.942064, -43.934214, true),
  ('Cine Theatro Brasil Vallourec', 'cine-theatro-brasil', 'casa-de-show', 'Centro', null,
   'Teatro e casa de shows na Avenida Amazonas, no Centro.',
   'Avenida Amazonas, 315 · Centro', -19.919042, -43.937972, true)
) as v (nome, slug, categoria, regiao, genero, descricao, endereco, lat, lng, ao_vivo)
join public.categorias c on c.slug = v.categoria
join public.regioes r on r.nome = v.regiao
left join public.generos_musicais g on g.slug = v.genero
on conflict (slug) do nothing;
