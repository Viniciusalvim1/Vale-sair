// Página de abertura: quem já tem sessão vai direto para o Agora.
import { lerSessao } from '../api/sessao.js';

if (lerSessao()) location.replace('agora.html');
