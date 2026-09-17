// Roda antes da primeira pintura (script comum no <head>): aplica o
// "reduzir movimento" salvo neste aparelho para as animações nem começarem.
(function () {
  try {
    if (localStorage.getItem('vs-reduzir-movimento') === '1') {
      document.documentElement.classList.add('manual-reduce');
    }
  } catch (erro) {
    // navegação privada sem localStorage: segue com as animações padrão
  }
})();
