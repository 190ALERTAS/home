document.addEventListener("DOMContentLoaded", function () {
    const dataInicio = document.getElementById("dataInicio");
    const horaInicio = document.getElementById("horaInicio");
    const horaFim = document.getElementById("horaFim");
    const adicionar = document.getElementById("adicionar");
    const limparTudo = document.getElementById("limparTudo");
    const excluirMes = document.getElementById("excluirMes");
    const resumoMes = document.getElementById("resumoMes");
    const exportarPDF = document.getElementById("exportarPDF");
    const listaRegistros = document.getElementById("listaRegistros");
    const calendarioEl = document.getElementById("calendario");
    const mesSelecionado = document.getElementById("mesSelecionado");
    const atualizarResumo = document.getElementById("atualizarResumo");
    const configButton = document.getElementById("configButton");
    let registros = JSON.parse(localStorage.getItem("registros")) || {};
    let calendar;

    function inicializarCalendario(dataInicial) {
        if (calendar) {
            calendar.destroy();
        }
        // Criando o calendário com as configurações desejadas
        calendar = new FullCalendar.Calendar(calendarioEl, {
            initialView: "dayGridMonth",
            locale: "pt-br", // Idioma configurado para português brasileiro
            initialDate: dataInicial, // Define a data inicial do calendário
            events: Object.values(registros)
                .flat()
                .map((registro) => ({
                    title: `${registro.horasTrabalhadas}`,
                    start: registro.data,
                })),
            // Configuração para formatar os meses com a primeira letra maiúscula
            eventRender: function (info) {
                // Caso queira alterar o título do evento (em horas trabalhadas, por exemplo)
                info.el.innerHTML = info.event.title;
            },
            headerToolbar: {
                // left: "prev,next today",
                // center: "title",
                // right: "dayGridMonth,dayGridWeek,dayGridDay",
            },
            // Formatação da exibição do título do mês
            titleFormat: { year: "numeric", month: "short" }, // Exibir mês completo (ex: Janeiro, Fevereiro...)
            dayHeaderFormat: { weekday: "short" }, // Exibe o dia da semana abreviado (ex: Seg, Ter...)
            weekNumberCalculation: "local", // Calculando número da semana de acordo com a localidade
            buttonText: {
                today: "Hoje",
                month: "Mês",
                week: "Semana",
                day: "Dia",
            },
        });
        // Renderizando o calendário
        calendar.render();
    }

    function atualizarMesesDisponiveis() {
        mesSelecionado.innerHTML = "";
        const mesesDisponiveis = Object.keys(registros).sort();
        const mesAtual = new Date().toISOString().slice(0, 7); // Obtém o mês atual no formato YYYY-MM

        if (mesesDisponiveis.length === 0) {
            const option = document.createElement("option");
            option.value = "";
            option.textContent = "Nenhum mês disponível";
            mesSelecionado.appendChild(option);
        } else {
            mesesDisponiveis.forEach((mes) => {
                const [ano, mesIndexado] = mes.split("-");
                const option = document.createElement("option");
                option.value = mes;
                option.textContent = new Date(ano, mesIndexado - 1).toLocaleDateString("pt-BR", {
                    month: "long",
                    year: "numeric",
                });
                if (mes === mesAtual) {
                    option.selected = true; // Seleciona o mês atual
                }
                mesSelecionado.appendChild(option);
            });
        }

        // Atualiza os dados para o mês atual
        if (mesSelecionado.value) {
            calcularResumoMes(mesSelecionado.value);
            atualizarListaRegistros(mesSelecionado.value);
            inicializarCalendario(`${mesSelecionado.value}-01`); // Atualiza o calendário para o mês selecionado
        }
    }

    mesSelecionado.addEventListener("change", function () {
        const mes = mesSelecionado.value;
        if (mes) {
            calcularResumoMes(mes);
            atualizarListaRegistros(mes);
            inicializarCalendario(`${mes}-01`); // Atualiza o calendário para o mês selecionado
        }
    });

    // Função para calcular o total de horas do mês
    function calcularTotalDeMinutos(mes) {
        const registrosMes = registros[mes] || [];
        let totalMinutos = 0;

        registrosMes.forEach((registro) => {
            const [horas, minutos] = registro.horasTrabalhadas.match(/\d+/g).map(Number);
            totalMinutos += horas * 60 + minutos; // Converte horas para minutos e soma
        });

        return totalMinutos;
    }

    // Função para verificar o limite de horas para o mês selecionado
    function verificarLimiteMinutos(mes) {
        const totalMinutos = calcularTotalDeMinutos(mes);

        let limiteMinutos = 0;
        const data = new Date(`${mes}-01`);
        const mesIndexado = data.getMonth(); // Retorna 0 para Janeiro, 1 para Fevereiro, etc.

        // Determinar o limite de minutos para o mês
        if (mesIndexado === 1) { // Fevereiro
            const ano = data.getFullYear();
            limiteMinutos = (ano % 4 === 0 && (ano % 100 !== 0 || ano % 400 === 0)) ? 342 * 29 : 342 * 28; // Ano bissexto ou não
        } else {
            limiteMinutos = mesIndexado === 3 || mesIndexado === 5 || mesIndexado === 8 || mesIndexado === 10 ? 342 * 30 : 342 * 31;
        }

        // Verificar se excedeu o limite
        const minutosExtras = totalMinutos > limiteMinutos ? totalMinutos - limiteMinutos : 0;
        return { totalMinutos, minutosExtras, limiteMinutos };
    }

    function calcularResumoMes(mes) {
        const registrosMes = registros[mes] || [];
        let totalMinutos = registrosMes.reduce((acc, { horasTrabalhadas }) => {
            const [horas, minutos] = horasTrabalhadas.match(/\d+/g).map(Number);
            return acc + horas * 60 + minutos;
        }, 0);

        const diasNoMes = new Date(mes.split("-")[0], mes.split("-")[1], 0).getDate();
        const limiteMinutos = diasNoMes * 342;

        const horasLimite = Math.floor(limiteMinutos / 60);
        const minutosLimite = limiteMinutos % 60;

        const horasExtras = Math.max(0, totalMinutos - limiteMinutos);
        const horasExtrasFormatadas = Math.floor(horasExtras / 60);
        const minutosExtrasFormatados = horasExtras % 60;

        const horas = Math.floor(totalMinutos / 60);
        const minutos = totalMinutos % 60;

        // Calcular Total ajustado (removendo extras)
        const totalAjustadoMinutos = totalMinutos - horasExtras; // Subtrair os extras do total
        const totalAjustadoHoras = Math.floor(totalAjustadoMinutos / 60);
        const totalAjustadoMinutosRestantes = totalAjustadoMinutos % 60;

        // Atualizar o texto do resumo
        resumoMes.innerHTML = `
        <span style="color: #3788d8;">Horas Normais: ${totalAjustadoHoras}h${totalAjustadoMinutosRestantes}m</span>
        <span style="color: red;">Extras: ${horasExtrasFormatadas}h${minutosExtrasFormatados}m</span>
        <span style="color: green;">Total de Horas: ${horas}h${minutos}m</span>
    `;
    
        // Adicionar a base de cálculo
        const baseCalculoElemento = document.getElementById("baseCalculo");
        baseCalculoElemento.innerHTML = `Base de Cálculo conforme NI 033.2: (342m) 5,7xdia/mês`;

        // Definindo o estilo para o texto pequeno
        baseCalculoElemento.style.fontSize = "12px";  // Define o tamanho do texto
    }

    function atualizarListaRegistros(mes) {
        listaRegistros.innerHTML = "";
        const registrosMes = registros[mes] || [];

        // Criar a tabela
        const table = document.createElement("table");
        table.style.width = "100%";
        table.style.borderCollapse = "collapse";

        // Criar o cabeçalho da tabela
        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");

        const headers = ["Data", "Início", "Fim", "Total", "Ações"];
        headers.forEach((headerText) => {
            const th = document.createElement("th");
            th.textContent = headerText;
            th.style.border = "1px solid black";
            th.style.padding = "8px";
            th.style.backgroundColor = "#694f43";
            th.style.color = "white"; // Cor do texto
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Criar o corpo da tabela
        const tbody = document.createElement("tbody");

        registrosMes.forEach((registro, index) => {
            const row = document.createElement("tr");

            // Formatar a data para DD/MM/YYYY
            const dataFormatada = formatarData(registro.data);

            const values = [dataFormatada, registro.inicio, registro.fim, registro.horasTrabalhadas];
            values.forEach((value) => {
                const td = document.createElement("td");
                td.textContent = value;
                td.style.border = "1px solid black";
                td.style.padding = "8px";
                row.appendChild(td);
            });

            // Criar botão de excluir
            const tdExcluir = document.createElement("td");
            const btnExcluir = document.createElement("button");
            btnExcluir.textContent = "X";

            // Estilos diretos no botão
            btnExcluir.style.backgroundColor = "red";
            btnExcluir.style.fontSize = "10px";
            btnExcluir.style.color = "white";
            btnExcluir.style.border = "none";
            btnExcluir.style.cursor = "pointer";

            btnExcluir.addEventListener("click", function () {
                registros[mes].splice(index, 1);
                if (registros[mes].length === 0) {
                    delete registros[mes];
                }
                localStorage.setItem("registros", JSON.stringify(registros));
                inicializarCalendario();
                atualizarMesesDisponiveis();
                calcularResumoMes(mesSelecionado.value);
                atualizarListaRegistros(mesSelecionado.value);
            });

            tdExcluir.appendChild(btnExcluir);
            tdExcluir.style.textAlign = "center";
            row.appendChild(tdExcluir);

            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        listaRegistros.appendChild(table);
    }

    exportarPDF.addEventListener("click", function () {
        const mes = mesSelecionado.value;
        if (!mes) {
            Swal.fire("Erro", "Selecione um mês para exportar o PDF.", "error");
            return;
        }
        const registrosMes = registros[mes] || [];
        if (registrosMes.length === 0) {
            Swal.fire("Erro", "Não há registros para este mês.", "error");
            return;
        }
        const totalHoras = resumoMes.textContent;
        const tabelaDados = registrosMes.map((registro) => [
            formatarData(registro.data), // Usando a função formatarData para exibir a data corretamente
            registro.inicio,
            registro.fim,
            registro.horasTrabalhadas,
        ]);
        const docDefinition = {
            content: [
                // Título em caixa alta com o mês
                { text: `RELATÓRIO DE ESCALA - ${new Date(`${mes}-01T00:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }).toUpperCase()}`, style: "header" },
                { text: `Total de Horas Trabalhadas: ${totalHoras}`, style: "subheader" },
                {
                    table: {
                        headerRows: 1,
                        widths: ["*", "*", "*", "*"],
                        body: [["Data", "Hora Início", "Hora Fim", "Horas Trabalhadas"], ...tabelaDados],
                    },
                },
            ],
            styles: {
                header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
                subheader: { fontSize: 14, bold: true, margin: [0, 10, 0, 5] },
            },
        };
        pdfMake.createPdf(docDefinition).download(`Relatorio_${mes}.pdf`);
    });

    excluirMes.addEventListener("click", function () {
        const mes = mesSelecionado.value;
        if (!mes) {
            Swal.fire("Erro", "Selecione um mês.", "error");
            return;
        }
        Swal.fire({
            title: "Confirmação",
            text: `Tem certeza que deseja excluir todos os registros do mês ${mes}?`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sim",
            cancelButtonText: "Não",
        }).then((result) => {
            if (result.isConfirmed) {
                delete registros[mes];
                localStorage.setItem("registros", JSON.stringify(registros));
                inicializarCalendario();
                atualizarMesesDisponiveis();
                calcularResumoMes("");
                atualizarListaRegistros("");
                Swal.fire("Sucesso", "Registros do mês excluídos.", "success");
            }
        });
    });

    limparTudo.addEventListener("click", function () {
        Swal.fire({
            title: "Tem certeza?",
            text: "Isso irá apagar TODOS os registros.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sim",
            cancelButtonText: "Não",
            customClass: {
                confirmButton: 'btn-confirm', // Classe para o botão de confirmação
                cancelButton: 'btn-cancel',  // Classe para o botão de cancelamento
            },
            buttonsStyling: false, // Necessário para usar estilos personalizados
        }).then((result) => {
            if (result.isConfirmed) {
                // Segunda confirmação
                Swal.fire({
                    title: "Confirmação Final",
                    text: "Esta ação é irreversível. NÃO SEJA BISONHO",
                    icon: "warning",
                    showCancelButton: true,
                    confirmButtonText: "Sim, apagar TUDO",
                    cancelButtonText: "Cancelar",
                    customClass: {
                        confirmButton: 'btn-confirm',
                        cancelButton: 'btn-cancel',
                    },
                    buttonsStyling: false,
                }).then((finalResult) => {
                    if (finalResult.isConfirmed) {
                        // Ação de limpeza definitiva
                        registros = {};
                        localStorage.removeItem("registros");
                        inicializarCalendario();
                        atualizarMesesDisponiveis();
                        calcularResumoMes("");
                        atualizarListaRegistros("");
                        Swal.fire("Sucesso", "Todos os registros foram apagados.", "success");
                    }
                });
            }
        });
    });
    
    adicionar.addEventListener("click", function () {
        const data = dataInicio.value; // Mantém a data como string no formato YYYY-MM-DD
        const inicio = horaInicio.value;
        const fim = horaFim.value;

        if (!data || !inicio || !fim) {
            Swal.fire("Erro", "Por favor, preencha todos os campos.", "error");
            return;
        }

        const horasTrabalhadas = calcularHorasTrabalhadas(inicio, fim);
        const mes = data.slice(0, 7); // Extrai o ano e mês da data fornecida

        if (!registros[mes]) {
            registros[mes] = [];
        }

        registros[mes].push({ data, inicio, fim, horasTrabalhadas });

        // Ordena os registros do mês pela data como string (sem conversão para Date)
        registros[mes].sort((a, b) => a.data.localeCompare(b.data));

        localStorage.setItem("registros", JSON.stringify(registros));
        inicializarCalendario();
        atualizarMesesDisponiveis();

        if (mesSelecionado.value === mes) {
            calcularResumoMes(mes);
            atualizarListaRegistros(mes);
        }

        Swal.fire("Sucesso", "Registro adicionado.", "success");
    });

    configButton.addEventListener("click", function () {
        Swal.fire({
            title: 'Configurações',
            showCancelButton: true,
            showConfirmButton: false,
            html: `
                <button id="downloadRegistros" class="swal2-styled">Exportar registros 🡅</button>
                <button id="importRegistros" class="swal2-styled">Importar registros 🡇</button>
            `,
            didOpen: () => {
                const downloadButton = document.getElementById("downloadRegistros");
                const importButton = document.getElementById("importRegistros");

                downloadButton.addEventListener("click", function () {
                    const registros = JSON.parse(localStorage.getItem("registros")) || {};
                    const blob = new Blob([JSON.stringify(registros, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "registros.json";
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    Swal.close();
                });

                importButton.addEventListener("click", function () {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = "application/json";
                    input.addEventListener("change", function (event) {
                        const file = event.target.files[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.onload = function (e) {
                                const importedRegistros = JSON.parse(e.target.result);
                                localStorage.setItem("registros", JSON.stringify(importedRegistros));
                                registros = importedRegistros;
                                inicializarCalendario();
                                atualizarMesesDisponiveis();
                                calcularResumoMes(mesSelecionado.value);
                                atualizarListaRegistros(mesSelecionado.value);
                                Swal.fire("Sucesso", "Registros importados com sucesso.", "success");
                            };
                            reader.readAsText(file);
                        }
                    });
                    input.click();
                    Swal.close();
                });
            }
        });
    });

    function calcularHorasTrabalhadas(inicio, fim) {
        const [horaInicio, minInicio] = inicio.split(":").map(Number);
        const [horaFim, minFim] = fim.split(":").map(Number);
        let horas = horaFim - horaInicio;
        let minutos = minFim - minInicio;
        if (minutos < 0) {
            minutos += 60;
            horas -= 1;
        }
        if (horas < 0) {
            horas += 24;
        }
        return `${horas}h${minutos}m`;
    }
    inicializarCalendario(new Date().toISOString().slice(0, 10)); // Inicializa o calendário com a data atual
    atualizarMesesDisponiveis();
});

function formatarData(data) {
    const [ano, mes, dia] = data.split("-"); // Divide a string YYYY-MM-DD
    return `${dia}/${mes}/${ano}`; // Retorna no formato DD/MM/YYYY
}

function toggleDarkMode() {
    const body = document.body;
    const icon = document.getElementById("icon");
    if (body.classList.contains("dark-mode")) {
        body.classList.remove("dark-mode");
        icon.src = "https://raw.githubusercontent.com/190ALERTAS/home/main/img/sun-solid-24.png"; // Altere para o ícone do sol
        localStorage.setItem("darkMode", "false"); // Salve a preferência como "false"
    } else {
        body.classList.add("dark-mode");
        icon.src = "https://raw.githubusercontent.com/190ALERTAS/home/main/img/moon-solid-24.png"; // Altere para o ícone da lua
        localStorage.setItem("darkMode", "true"); // Salve a preferência como "true"
    }
}

// Verificar se o usuário já tem uma preferência salva no localStorage
const storedDarkMode = localStorage.getItem("darkMode");
if (storedDarkMode === "true") {
    // Se a preferência for "true", ativar o modo escuro
    toggleDarkMode();
}
