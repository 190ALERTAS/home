function toggleDarkMode() {
  const body = document.body;
  const icon = document.getElementById('icon');
  if (body.classList.contains('dark-mode')) {
      body.classList.remove('dark-mode');
      icon.src = 'https://raw.githubusercontent.com/190ALERTAS/home/main/img/sun-solid-24.png'; // Altere para o ícone do sol
      localStorage.setItem('darkMode', 'false'); // Salve a preferência como "false"
  } else {
      body.classList.add('dark-mode');
      icon.src = 'https://raw.githubusercontent.com/190ALERTAS/home/main/img/moon-solid-24.png'; // Altere para o ícone da lua
      localStorage.setItem('darkMode', 'true'); // Salve a preferência como "true"
  }
}
// Verificar se o usuário já tem uma preferência salva no localStorage
const storedDarkMode = localStorage.getItem('darkMode');
if (storedDarkMode === 'true') {
  // Se a preferência for "true", ativar o modo escuro
  toggleDarkMode();
}
