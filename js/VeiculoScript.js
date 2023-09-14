function copiarCampos() {
  var fato = document.getElementById("fato").value;
  var cidade = document.getElementById("cidade").value;
  var dataInput = document.getElementById("data");
  var hora = document.getElementById("hora").value;
  var cor = document.getElementById("cor").value;
  var placa = document.getElementById("placa").value;
  var modelo = document.getElementById("modelo").value;
  var endereco = document.getElementById("endereco").value;
  var historico = document.getElementById("historico").value;
  var mensagem = formatMessage(modelo, placa, cor, dataInput, hora, endereco, historico, fato, cidade);

  // Criar um elemento temporário e definir seu valor como a mensagem
  var temp = document.createElement("textarea");
  temp.value = mensagem;

  // Adicionar o elemento temporário à página
  document.body.appendChild(temp);

  // Selecionar o conteúdo do elemento temporário
  temp.select();

  // Copiar o conteúdo selecionado para a área de transferência
  document.execCommand("copy");

  // Remover o elemento temporário da página
  document.body.removeChild(temp);

  // Exibir um alerta de sucesso
  Swal.fire({
    confirmButtonColor: "#694f43",
    icon: 'success',
    title: 'COPIADO!',
    iconColor: '#7c7565',
    confirmButtonText: 'OK'
  }).then((result) => {
    if (result.isConfirmed) {
      window.open('https://api.whatsapp.com/', '_blank');
    }
  });
}

function formatMessage(modelo, placa, cor, dataInput, hora, endereco, historico, fato, cidade) {
  const rawDate = dataInput.value;
  const date = new Date(rawDate);
  const timezoneOffset = date.getTimezoneOffset() / 60;
  date.setUTCHours(date.getUTCHours() + timezoneOffset);
  const formattedDate = ("0" + date.getDate()).slice(-2) + "/" + ("0" + (date.getMonth() + 1)).slice(-2) + "/" + date.getFullYear();
  const dataText = "" + formattedDate;
  const mensagem = `🚨 *ALERTA DE ${fato} EM ${cidade}* 🚨\n\n*MODELO:* ${modelo}\n*PLACA:* ${placa}\n*COR:* ${cor}\n*DATA:* ${dataText}\n*HORA:* ${hora}\n*ENDEREÇO:* ${endereco}\n\n*HISTÓRICO:* \n${historico}`;
  return mensagem.toUpperCase(); // Converter a mensagem inteira para maiúsculas
}

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
