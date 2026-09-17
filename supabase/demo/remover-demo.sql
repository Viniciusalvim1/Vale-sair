-- Remove as pessoas fictícias criadas por dados-demo.sql e, em cascata,
-- tudo o que elas criaram: perfis, Pulsos, Turma, Chama, votos e mensagens.
-- Os lugares e catálogos continuam intactos.
delete from auth.users where email like '%@demo.valesair.invalid';
