-- Remove as pessoas fictícias criadas por dados-demo.sql e, em cascata,
-- tudo o que elas criaram: perfis, Pulsos, Turma, Chama, votos e mensagens.
-- Também tira as fotos fictícias (geradas por IA) dos lugares.
-- Os lugares e catálogos continuam intactos.
delete from auth.users where email like '%@demo.valesair.invalid';
update public.locais set foto_url = null where foto_url like 'assets/img/locais/%';
