// Dados públicos do projeto no Supabase.
// A publishable key pode ficar no front-end: quem protege os dados são as
// políticas de RLS do banco (supabase/migrations/*_seguranca.sql).
export const SUPABASE_URL = 'https://gijlsoavgutvvfhhqfah.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_YS-TsuBxJeXOxTN7VwJcOg_EPcEG8ML';

export const BUCKET_PULSOS = 'pulsos';
export const BUCKET_AVATARES = 'avatares';

// O mapa do Radar usa MapLibre com os tiles abertos do OpenFreeMap: não há
// chave de API nem cota para configurar aqui. O estilo fica em
// public/js/ui/estilo-mapa.js.
