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

function formatMessage(dataInput, hora, endereco, historico, fato, cidade, detidos, mostrarMaterialidade, batalhao, ba, dp, vtr, gu) {
  const rawDate = dataInput;
  const date = new Date(rawDate);

  // Processar timezone
  const timezoneOffset = date.getTimezoneOffset() / 60;
  date.setUTCHours(date.getUTCHours() + timezoneOffset);

  // Formatar a data no formato dd/mm/yyyy
  const formattedDate = ("0" + date.getDate()).slice(-2) + "/" + ("0" + (date.getMonth() + 1)).slice(-2) + "/" + date.getFullYear();
  const dataText = "" + formattedDate;

  // Processar materialidade
  const materialidade = document.getElementById("materialidade").value;
  const materialidadeList = materialidade.split(";").map(item => `- ${item.trim()}`).join("\n");
  const materialidadeText = mostrarMaterialidade && materialidadeList ? `\n\n*APREENSÃO:* \n${materialidadeList}` : "";

  // Processar indivíduos detidos
  const detidosList = detidos
    ? detidos.split(";").filter(individuo => individuo.trim() !== "").map(individuo => `- ${individuo.trim()}`).join("\n")
    : "";
  const detidosText = detidosList
    ? `\n*INDIVÍDUOS DETIDOS:* \n${detidosList}\n`
    : "\n*INDIVÍDUOS DETIDOS:* \n- Nenhum\n";

  // Campos adicionais (apenas se houver valor)
  const baText = ba ? `*BA:* ${ba}` : "";
  const dpText = dp ? `*DP:* ${dp}` : "";
  const vtrText = vtr ? `\n*VTR:* ${vtr}` : "";
  const guText = gu ? `*GU:* ${gu}` : "";

  // Combinar os campos adicionais com espaçamento condicional
  const camposAdicionais = [baText, dpText, vtrText, guText].filter(text => text !== "").join("    ");

  // Formatar a mensagem
  const mensagem = `🚔${batalhao}🚔

*FATO:* ${fato}
*DATA:* ${dataText}
*HORA:* ${hora}
*ENDEREÇO:* ${cidade}, ${endereco}
${materialidadeText}
${detidosText}
*HISTÓRICO:*
${historico}

${camposAdicionais}`;

  // Converter a mensagem inteira para maiúsculas
  return mensagem.toUpperCase();
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

  // Registre o evento no Google Analytics
  gtag('event', 'dark_mode_toggle', {
    event_category: 'Tema',
    event_label: 'Alternar Tema Escuro',
  });
}

// Verificar se o usuário já tem uma preferência salva no localStorage
const storedDarkMode = localStorage.getItem('darkMode');
if (storedDarkMode === 'true') {
  // Se a preferência for "true", ativar o modo escuro
  toggleDarkMode();
}

document.getElementById('btnInserirDados').addEventListener('click', () => {
  const formContent = document.getElementById('formTemplate').innerHTML;

  Swal.fire({
    showCancelButton: true,
    title: 'Inserir Dados Adicionais',
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#694f43",
    html: formContent,
    focusConfirm: false,
    preConfirm: () => {
      const dados = {
        ba: document.getElementById('ba').value,
        dp: document.getElementById('dp').value,
        vtr: document.getElementById('vtr').value,
        gu: document.getElementById('gu').value
      };

      if (dados.ba || dados.dp || dados.vtr || dados.gu) {
        document.getElementById('loadingPage').style.display = 'block';
        document.getElementById('statusDadosInseridos').innerText = "Dados Adicionais Inseridos ✅";

        // Armazenar os dados temporariamente para serem copiados depois
        window.dadosAdicionais = dados;
        console.log('Dados armazenados:', window.dadosAdicionais);
      } else {
        Swal.showValidationMessage('Preencha ao menos um campo');
      }
    }
  });
});

// Função para limpar os dados e resetar o status
function limparDados() {
  // Resetar o status na página
  document.getElementById('statusDadosInseridos').innerText = "Status: Nenhum dado inserido";
  document.getElementById('loadingPage').style.display = 'none';

  // Limpar os dados armazenados globalmente
  window.dadosAdicionais = null;

  console.log('Dados limpos:', window.dadosAdicionais);
}

// Adicionar evento ao botão de limpar dados
document.getElementById('btnLimparDados').addEventListener('click', limparDados);

function copiarCampos() {
  // Coletar os dados inseridos anteriormente
  var fato = document.getElementById("fato") ? document.getElementById("fato").value : '';
  var cidade = document.getElementById("cidade") ? document.getElementById("cidade").value : '';
  var dataInput = document.getElementById("data") ? document.getElementById("data").value : '';
  var hora = document.getElementById("hora") ? document.getElementById("hora").value : '';
  var detidos = document.getElementById("detidos") ? document.getElementById("detidos").value : '';
  var endereco = document.getElementById("endereco") ? document.getElementById("endereco").value : '';
  var historico = document.getElementById("historico") ? document.getElementById("historico").value : '';
  var materialidadeCheckbox = document.getElementById("materialidadeCheckbox") ? document.getElementById("materialidadeCheckbox").checked : false;
  var batalhao = document.getElementById("batalhao") ? document.getElementById("batalhao").value : '';
  var ba = window.dadosAdicionais?.ba || ''; // Coletando dados adicionais armazenados
  var dp = window.dadosAdicionais?.dp || ''; // Coletando dados adicionais armazenados
  var vtr = window.dadosAdicionais?.vtr || ''; // Coletando dados adicionais armazenados
  var gu = window.dadosAdicionais?.gu || ''; // Coletando dados adicionais armazenados

  // Verificar se algum campo necessário está vazio antes de copiar
  if (!cidade || !dataInput || !hora || !endereco) {
    Swal.fire({
      icon: 'error',
      title: 'Erro',
      text: 'Verifique o endereço, cidade, data e hora!',
    });
    return;  // Interrompe a execução se faltar dados importantes
  }

  // Formatar a mensagem a ser copiada
  var mensagem = formatMessage(dataInput, hora, endereco, historico, fato, cidade, detidos, materialidadeCheckbox, batalhao, ba, dp, vtr, gu);

  // Criar um elemento temporário para copiar a mensagem
  var temp = document.createElement("textarea");
  temp.value = mensagem;

  // Adicionar o elemento temporário à página
  document.body.appendChild(temp);

  // Selecionar o conteúdo do elemento temporário
  temp.select();

  // Copiar o conteúdo para a área de transferência
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

function updateWhatsappLinkColor() {
  const link = document.getElementById('whatsapp-link');
  if (!link) return;
  // Força a classe correta (caso o Swal sobrescreva)
  link.classList.add('whatsapp-link');
}