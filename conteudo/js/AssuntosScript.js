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

const themeToggle = document.getElementById("themeToggle");
const body = document.body;
const form = document.querySelector("form");

// Verifique se o tema escuro já está definido no localStorage
if (localStorage.getItem('darkTheme') === 'enabled') {
  body.classList.add('darkmode');
  form.classList.add('darkmode');
  themeToggle.querySelector(".theme-icon").classList.add("dark-icon");
}

themeToggle.addEventListener("click", function() {
  body.classList.toggle("darkmode");
  form.classList.toggle("darkmode");
  themeToggle.querySelector(".theme-icon").classList.toggle("dark-icon");

  // Armazene a preferência do usuário no localStorage
  if (body.classList.contains('darkmode')) {
    localStorage.setItem('darkTheme', 'enabled');
  } else {
    localStorage.setItem('darkTheme', 'disabled');
  }
});
