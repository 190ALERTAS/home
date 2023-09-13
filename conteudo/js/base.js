const themeToggle = document.getElementById("themeToggle");
const body = document.body;
const form = document.querySelector("form");

// Verifique se o tema escuro já está definido no localStorage
if (localStorage.getItem('darkTheme') === 'enabled') {
  body.classList.add('darkmode');
  form.classList.add('darkmode');
}

themeToggle.addEventListener("click", function() {
  body.classList.toggle("darkmode");
  form.classList.toggle("darkmode");

  // Armazene a preferência do usuário no localStorage
  if (body.classList.contains('darkmode')) {
    localStorage.setItem('darkTheme', 'enabled');
  } else {
    localStorage.setItem('darkTheme', 'disabled');
  }
});