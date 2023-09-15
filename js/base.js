function toggleDarkMode() {
  const body = document.body;
  const icon = document.getElementById('icon');
  const iframes = document.querySelectorAll('iframe'); // Seleciona todos os iframes

  if (body.classList.contains('dark-mode')) {
    body.classList.remove('dark-mode');
    icon.src = 'https://raw.githubusercontent.com/190ALERTAS/home/main/img/sun-solid-24.png';
    localStorage.setItem('darkMode', 'false');
    
    // Remove a classe dark-mode dos iframes quando o tema claro estiver ativado
    iframes.forEach(iframe => {
      iframe.classList.remove('dark-mode');
    });
  } else {
    body.classList.add('dark-mode');
    icon.src = 'https://raw.githubusercontent.com/190ALERTAS/home/main/img/moon-solid-24.png';
    localStorage.setItem('darkMode', 'true');
    
    // Adiciona a classe dark-mode aos iframes quando o tema escuro estiver ativado
    iframes.forEach(iframe => {
      iframe.classList.add('dark-mode');
    });
  }
}

// Verificar se o usuário já tem uma preferência salva no localStorage
const storedDarkMode = localStorage.getItem('darkMode');
if (storedDarkMode === 'true') {
  // Se a preferência for "true", ativar o modo escuro
  toggleDarkMode();
}
