-- =====================================================================
-- Vale Sair? · Storage
--
-- Buckets públicos para leitura (a mídia aparece no feed por URL pública).
-- Escrita só na pasta com o id da própria pessoa: pulsos/<uid>/arquivo.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('pulsos', 'pulsos', true, 15728640,
   array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
         'video/mp4', 'video/webm', 'video/quicktime']),
  ('avatares', 'avatares', true, 2097152,
   array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "vale sair: ler a própria pasta" on storage.objects
  for select to authenticated
  using (bucket_id in ('pulsos', 'avatares') and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "vale sair: enviar para a própria pasta" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('pulsos', 'avatares') and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "vale sair: substituir na própria pasta" on storage.objects
  for update to authenticated
  using (bucket_id in ('pulsos', 'avatares') and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id in ('pulsos', 'avatares') and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "vale sair: apagar da própria pasta" on storage.objects
  for delete to authenticated
  using (bucket_id in ('pulsos', 'avatares') and (storage.foldername(name))[1] = (select auth.uid())::text);
