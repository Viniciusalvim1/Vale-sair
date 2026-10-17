-- =====================================================================
-- Vale Sair? · Regiões que faltavam para os lugares reais
--
-- O supabase/seed.sql junta os lugares às regiões pelo nome, então elas
-- precisam existir antes. Estas entraram junto com a troca dos lugares
-- fictícios pelos lugares reais de Belo Horizonte.
-- =====================================================================

insert into public.regioes (nome) values
  ('Carmo'),
  ('Padre Eustáquio'),
  ('Santa Efigênia')
on conflict (nome) do nothing;
