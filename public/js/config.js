// Dados públicos do projeto no Supabase.
// A publishable key pode ficar no front-end: quem protege os dados são as
// políticas de RLS do banco (supabase/migrations/*_seguranca.sql).
export const SUPABASE_URL = 'https://gijlsoavgutvvfhhqfah.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_YS-TsuBxJeXOxTN7VwJcOg_EPcEG8ML';

// Chave de navegador: restrinja no Google Cloud aos domínios do app e somente
// à Maps JavaScript API. Ela fica visível no navegador por definição.
export const GOOGLE_MAPS_KEY = 'AIzaSyCYoxO4x2fci6rIUnPDbu4Pzd97WvzlZts';
// Preencha depois de publicar o estilo no Google Cloud. Map IDs não são secretos.
export const GOOGLE_MAP_ID = 'a9c69b95c8fe9ebda601d45d';

export const BUCKET_PULSOS = 'pulsos';
export const BUCKET_AVATARES = 'avatares';

// O Google Maps é carregado sob demanda no Radar e no Street View.
