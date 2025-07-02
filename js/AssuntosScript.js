const materialidadeCheckbox = document.getElementById("materialidadeCheckbox");
const materialidadeLabel = document.querySelector("label[for='materialidade']");
const materialidadeTextarea = document.getElementById("materialidade");

materialidadeCheckbox.checked = false;
materialidadeTextarea.style.display = "none";
materialidadeTextarea.disabled = true;

materialidadeCheckbox.addEventListener("change", function () {
  if (materialidadeCheckbox.checked) {
    materialidadeTextarea.style.display = "block";
    materialidadeTextarea.disabled = false;
  } else {
    materialidadeTextarea.style.display = "none";
    materialidadeTextarea.disabled = true;
  }
});

const veiculoCheckbox = document.getElementById("veiculoCheckbox");
const veiculoLabel = document.querySelector("label[for='veiculo']");
const veiculoTextarea = document.getElementById("veiculo");

veiculoCheckbox.checked = false;
veiculoTextarea.style.display = "none";
veiculoTextarea.disabled = true;

veiculoCheckbox.addEventListener("change", function () {
  if (veiculoCheckbox.checked) {
    veiculoTextarea.style.display = "block";
    veiculoTextarea.disabled = false;
  } else {
    veiculoTextarea.style.display = "none";
    veiculoTextarea.disabled = true;
  }
});

function copiarCampos() {
  var fato = document.getElementById("fato").value;
  var cidade = document.getElementById("cidade").value;
  var dataInput = document.getElementById("data");
  var hora = document.getElementById("hora").value;
  var endereco = document.getElementById("endereco").value;
  var historico = document.getElementById("historico").value;
  var veiculoCheckbox = document.getElementById("veiculoCheckbox").checked;
  var materialidadeCheckbox = document.getElementById("materialidadeCheckbox").checked;
  var mensagem = formatMessage(dataInput, hora, endereco, historico, fato, cidade, materialidadeCheckbox, veiculoCheckbox);

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
    iconColor: '#7c7565',
    icon: "success",
    confirmButtonColor: "#694f43",
    title: "Texto Copiado",
    footer: '<a id="whatsapp-link" class="whatsapp-link" href="https://api.whatsapp.com/" target="_blank">Abrir Whatsapp</a>'
  });
  setTimeout(updateWhatsappLinkColor, 10);
}

function formatMessage(dataInput, hora, endereco, historico, fato, cidade, mostrarMaterialidade, mostrarVeiculo) {
  const rawDate = dataInput.value;
  const date = new Date(rawDate);
  const timezoneOffset = date.getTimezoneOffset() / 60;
  date.setUTCHours(date.getUTCHours() + timezoneOffset);
  const formattedDate = ("0" + date.getDate()).slice(-2) + "/" + ("0" + (date.getMonth() + 1)).slice(-2) + "/" + date.getFullYear();
  const dataText = "" + formattedDate;
  const veiculo = document.getElementById("veiculo").value;
  const materialidade = document.getElementById("materialidade").value;
  const veiculoText = mostrarVeiculo ? `\n*VEICULO SUSPEITO:* \n${veiculo}` : "";
  const materialidadeText = mostrarMaterialidade ? `\n*MATERIALIDADE ENVOLVIDA:* \n${materialidade}` : "";
  const mensagem = `*ASSUNTOS CORRENTES*\n\n*${fato}*\n\n*DATA:* ${dataText} *HORA:* ${hora}\n*ENDEREÇO:* ${endereco} EM ${cidade}\n\n*HISTÓRICO PRELIMINAR:* \n${historico}\n${materialidadeText}\n${veiculoText}\n`;
  return mensagem.toUpperCase(); // Converter a mensagem inteira para maiúsculas
}

function updateWhatsappLinkColor() {
  const link = document.getElementById('whatsapp-link');
  if (!link) return;
  // Força a classe correta (caso o Swal sobrescreva)
  link.classList.add('whatsapp-link');
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
  setTimeout(updateWhatsappLinkColor, 10);
}
// Verificar se o usuário já tem uma preferência salva no localStorage
const storedDarkMode = localStorage.getItem('darkMode');
if (storedDarkMode === 'true') {
  // Se a preferência for "true", ativar o modo escuro
  toggleDarkMode();
}
