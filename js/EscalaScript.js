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
    const mesSelecionadoMes = document.getElementById("mesSelecionadoMes");
    const mesSelecionadoAno = document.getElementById("mesSelecionadoAno");
    const atualizarResumo = document.getElementById("atualizarResumo");
    const configButton = document.getElementById("configButton");
    let registros = JSON.parse(localStorage.getItem("registros")) || {};
    let mesAtualSelecionado = localStorage.getItem("mesAtualSelecionado"); // Armazena o mês selecionado
    let calendar;

    function inicializarCalendario(dataInicial) {
        if (calendar) {
            calendar.destroy();
        }
                // Ajuste de CSS para o container do calendário
        calendarioEl.style.maxWidth = "600px";
        calendarioEl.style.margin = "0 auto";
        calendarioEl.style.overflow = "hidden";
        calendarioEl.style.height = "auto";
        calendarioEl.style.boxSizing = "border-box";
        // Criando o calendário com as configurações desejadas
        calendar = new FullCalendar.Calendar(calendarioEl, {
            initialView: "dayGridMonth",
            locale: "pt-br", // Idioma configurado para português brasileiro
            initialDate: dataInicial, // Define a data inicial do calendário
                        height: "auto", // Ajusta a altura automaticamente ao mês
            contentHeight: "auto",
            aspectRatio: 1.2, // Deixa mais quadrado/proporcional
            showNonCurrentDates: false, // Mostra apenas os dias do mês selecionado
            events: Object.values(registros)
                .flat()
                .map((registro) => ({
                    title: `${registro.horasTrabalhadas}`,
                    start: registro.data,
                })),
                            // Remover toolbars/botões para visual limpo
            headerToolbar: false,
            footerToolbar: false,
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

    // Função para obter todos os anos disponíveis nos registros
    function getAnosDisponiveis() {
        return [...new Set(Object.keys(registros).map(m => m.split('-')[0]))].sort();
    }
    // Função para obter todos os meses disponíveis para um ano
    function getMesesDisponiveis(ano) {
        return [...new Set(Object.keys(registros).filter(m => m.startsWith(ano)).map(m => m.split('-')[1]))].sort();
    }

    // Popula os seletores de mês e ano
    function atualizarMesesAnosDisponiveis() {
        // Salva os valores atualmente selecionados
        const anoSelecionadoAntes = mesSelecionadoAno.value;
        const mesSelecionadoAntes = mesSelecionadoMes.value;

        // Limpa seletores
        mesSelecionadoAno.innerHTML = "";
        mesSelecionadoMes.innerHTML = "";

        const anos = getAnosDisponiveis();
        const mesAtual = new Date().toISOString().slice(0, 7);

        // Preenche anos
        anos.forEach(ano => {
            const opt = document.createElement("option");
            opt.value = ano;
            opt.textContent = ano;
            mesSelecionadoAno.appendChild(opt);
        });

        // Seleciona o ano salvo anteriormente, se existir, senão usa lógica antiga
        let anoSelecionado = anoSelecionadoAntes && anos.includes(anoSelecionadoAntes)
            ? anoSelecionadoAntes
            : (mesAtualSelecionado ? mesAtualSelecionado.split('-')[0] : (anos.includes(mesAtual.split('-')[0]) ? mesAtual.split('-')[0] : anos[anos.length-1]));
        if (!anoSelecionado) anoSelecionado = new Date().getFullYear().toString();
        mesSelecionadoAno.value = anoSelecionado;

        // Preenche meses do ano selecionado
        const meses = getMesesDisponiveis(anoSelecionado);
        const nomesMeses = [
            "janeiro", "fevereiro", "março", "abril", "maio", "junho",
            "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
        ];
        meses.forEach(mesNum => {
            const opt = document.createElement("option");
            opt.value = mesNum;
            opt.textContent = nomesMeses[parseInt(mesNum, 10) - 1];
            mesSelecionadoMes.appendChild(opt);
        });

        // Seleciona o mês salvo anteriormente, se existir, senão usa lógica antiga
        let mesSelecionado = mesSelecionadoAntes && meses.includes(mesSelecionadoAntes)
            ? mesSelecionadoAntes
            : (mesAtualSelecionado ? mesAtualSelecionado.split('-')[1] : (meses.includes(mesAtual.split('-')[1]) ? mesAtual.split('-')[1] : meses[meses.length-1]));
        if (!mesSelecionado) mesSelecionado = (new Date().getMonth()+1).toString().padStart(2, "0");
        mesSelecionadoMes.value = mesSelecionado;

        // Atualiza os dados para o mês selecionado
        const mesAno = mesSelecionadoAno.value && mesSelecionadoMes.value ? `${mesSelecionadoAno.value}-${mesSelecionadoMes.value}` : "";
        if (mesAno && registros[mesAno]) {
            calcularResumoMes(mesAno);
            atualizarListaRegistros(mesAno);
            inicializarCalendario(`${mesAno}-01`);
        } else {
            calcularResumoMes("");
            atualizarListaRegistros("");
            inicializarCalendario(new Date().toISOString().slice(0, 10));
        }
    }

    mesSelecionadoAno.addEventListener("change", function () {
        atualizarMesesAnosDisponiveis();
    });
    mesSelecionadoMes.addEventListener("change", function () {
        const mesAno = mesSelecionadoAno.value && mesSelecionadoMes.value ? `${mesSelecionadoAno.value}-${mesSelecionadoMes.value}` : "";
        mesAtualSelecionado = mesAno;
        localStorage.setItem("mesAtualSelecionado", mesAtualSelecionado);
        if (mesAno && registros[mesAno]) {
            calcularResumoMes(mesAno);
            atualizarListaRegistros(mesAno);
            inicializarCalendario(`${mesAno}-01`);
        } else {
            calcularResumoMes("");
            atualizarListaRegistros("");
            inicializarCalendario(new Date().toISOString().slice(0, 10));
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
        let totalMinutos = 0;
        let diasEDTRSP = 0;
        let diasFerias = 0;

        registrosMes.forEach(({ horasTrabalhadas, tipo }) => {
            if (horasTrabalhadas === "FER" || tipo === "FER") {
                diasFerias++;
                // Não soma nada ao total de minutos
            } else if (horasTrabalhadas === "EDT/RSP" || tipo === "EDT/RSP") {
                diasEDTRSP++;
                // Não soma nada ao total de minutos, mas desconta do limite
            } else {
                const [horas, minutos] = horasTrabalhadas.match(/\d+/g).map(Number);
                totalMinutos += horas * 60 + minutos;
            }
        });

        const diasNoMes = new Date(mes.split("-")[0], mes.split("-")[1], 0).getDate();
        // Limite padrão: 342m por dia útil, descontando férias e EDT/RSP
        // Cada dia de EDT/RSP desconta 6h (360m) do limite mensal
        const limiteMinutos = (diasNoMes - diasFerias) * 342 - diasEDTRSP * 360;

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
        <span style="color: #694f43; font-size:10px; display:block;">Férias: ${diasFerias} dias -&nbsp;EDT/RSP: ${diasEDTRSP} dias</span>
    `;

        // Adicionar a base de cálculo
        const baseCalculoElemento = document.getElementById("baseCalculo");
        baseCalculoElemento.innerHTML = `Base de Cálculo conforme NI 033.2: (342m) 5,7xdia/mês<br>
        Cada dia de EDT/RSP desconta 6h (360m) do limite mensal.`;

        // Definindo o estilo para o texto pequeno
        baseCalculoElemento.style.fontSize = "10px";
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

            // Destacar linha de férias ou EDT/RSP
            if (registro.horasTrabalhadas === "FER" || registro.tipo === "FER") {
                row.style.backgroundColor = "#e0e0e0";
                row.style.fontWeight = "bold";
            }
            if (registro.horasTrabalhadas === "EDT/RSP" || registro.tipo === "EDT/RSP") {
                row.style.backgroundColor = "#d0e6fa";
                row.style.fontWeight = "bold";
            }

            const values = [
                dataFormatada,
                registro.inicio,
                registro.fim,
                registro.horasTrabalhadas
            ];
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
                atualizarMesesAnosDisponiveis(); // Troque para a função correta
                calcularResumoMes(mesSelecionadoMes.value);
                atualizarListaRegistros(mesSelecionadoMes.value);
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
        const mes = mesSelecionadoAno.value && mesSelecionadoMes.value ? `${mesSelecionadoAno.value}-${mesSelecionadoMes.value}` : "";
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
        const mes = mesSelecionadoAno.value && mesSelecionadoMes.value ? `${mesSelecionadoAno.value}-${mesSelecionadoMes.value}` : "";
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
                atualizarMesesAnosDisponiveis(); // Troque para a função correta
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
                        atualizarMesesAnosDisponiveis(); // Troque para a função correta
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
        atualizarMesesAnosDisponiveis(); // Troque para a função correta

        if (mesSelecionadoMes.value === mes) {
            calcularResumoMes(mes);
            atualizarListaRegistros(mes);
        }

        // Limpa os campos após adicionar
        dataInicio.value = "";
        horaInicio.value = "";
        horaFim.value = "";

        Swal.fire({
            position: "center",
            icon: "success",
            title: "Registro adicionado",
            showConfirmButton: false,
            timer: 800
        });
    });

    configButton.addEventListener("click", function () {
        Swal.fire({
            title: 'Configurações',
            showCancelButton: true,
            showConfirmButton: false,
            cancelButtonText: "Fechar",
            html: `
<div style="display: flex; flex-direction: column; align-items: center; gap: 12px; margin-top: 10px;">
    <button id="downloadRegistros" class="swal2-styled" style="width: 250px; margin: 0;">
        Exportar registros
        <img src="https://raw.githubusercontent.com/190ALERTAS/home/main/img/setas/seta-cima.png" alt="Seta para cima" style="width: 18px; margin-left: 8px; filter: invert(1);">
    </button>
    <button id="importRegistros" class="swal2-styled" style="width: 250px; margin: 0;">
        Importar registros
        <img src="https://raw.githubusercontent.com/190ALERTAS/home/main/img/setas/seta-baixo.png" alt="Seta para baixo" style="width: 18px; margin-left: 8px; filter: invert(1);">
    </button>
    <button id="inserirFerias" class="swal2-styled" style="width: 250px; margin: 0;">
        Inserir Férias ⛱︎
    </button>
    <button id="inserirEDTRSP" class="swal2-styled" style="width: 250px; margin: 0;">
        EDT/RSP 🗓
    </button>
</div>
            `,
            didOpen: () => {
                const downloadButton = document.getElementById("downloadRegistros");
                const importButton = document.getElementById("importRegistros");
                const inserirFeriasBtn = document.getElementById("inserirFerias");
                const inserirEDTRSPBtn = document.getElementById("inserirEDTRSP");

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
                                atualizarMesesAnosDisponiveis(); // Troque para a função correta
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

                inserirFeriasBtn.addEventListener("click", function () {
                    Swal.fire({
                        title: 'Inserir Férias',
                        html: `
                            <label>Data Início: <input type="date" id="feriasDataInicio"></label><br><br>
                            <label>Data Fim: <input type="date" id="feriasDataFim"></label>
                        `,
                        showCancelButton: true,
                        confirmButtonText: 'Inserir',
                        cancelButtonText: 'Cancelar',
                        preConfirm: () => {
                            const inicio = document.getElementById('feriasDataInicio').value;
                            const fim = document.getElementById('feriasDataFim').value;
                            if (!inicio || !fim) {
                                Swal.showValidationMessage('Preencha ambas as datas.');
                                return false;
                            }
                            if (fim < inicio) {
                                Swal.showValidationMessage('Data final deve ser igual ou posterior à inicial.');
                                return false;
                            }
                            return { inicio, fim };
                        }
                    }).then((result) => {
                        if (result.isConfirmed) {
                            const { inicio, fim } = result.value;
                            let dataAtual = new Date(inicio);
                            const dataFim = new Date(fim);
                            while (dataAtual <= dataFim) {
                                const dataStr = dataAtual.toISOString().slice(0, 10);
                                const mes = dataStr.slice(0, 7);
                                if (!registros[mes]) registros[mes] = [];
                                // Evita duplicidade de férias
                                if (!registros[mes].some(r => r.data === dataStr && r.tipo === "FER")) {
                                    registros[mes].push({
                                        data: dataStr,
                                        inicio: "-",
                                        fim: "-",
                                        horasTrabalhadas: "FER",
                                        tipo: "FER"
                                    });
                                    // Ordena após inserir
                                    registros[mes].sort((a, b) => a.data.localeCompare(b.data));
                                }
                                dataAtual.setDate(dataAtual.getDate() + 1);
                            }
                            localStorage.setItem("registros", JSON.stringify(registros));
                            inicializarCalendario();
                            atualizarMesesAnosDisponiveis(); // Troque para a função correta
                            calcularResumoMes(mesSelecionado.value);
                            atualizarListaRegistros(mesSelecionado.value);
                            Swal.fire("Sucesso", "Férias inseridas.", "success");
                        }
                    });
                });

                inserirEDTRSPBtn.addEventListener("click", function () {
                    Swal.fire({
                        title: 'Inserir EDT/RSP',
                        html: `
                            <label>Data: <input type="date" id="edtrspData"></label>
                        `,
                        showCancelButton: true,
                        confirmButtonText: 'Inserir',
                        cancelButtonText: 'Cancelar',
                        preConfirm: () => {
                            const data = document.getElementById('edtrspData').value;
                            if (!data) {
                                Swal.showValidationMessage('Selecione a data.');
                                return false;
                            }
                            return { data };
                        }
                    }).then((result) => {
                        if (result.isConfirmed) {
                            const { data } = result.value;
                            const mes = data.slice(0, 7);
                            if (!registros[mes]) registros[mes] = [];
                            // Evita duplicidade de EDT/RSP
                            if (!registros[mes].some(r => r.data === data && r.tipo === "EDT/RSP")) {
                                registros[mes].push({
                                    data: data,
                                    inicio: "-",
                                    fim: "-",
                                    horasTrabalhadas: "EDT/RSP",
                                    tipo: "EDT/RSP"
                                });
                                // Ordena após inserir
                                registros[mes].sort((a, b) => a.data.localeCompare(b.data));
                            }
                            localStorage.setItem("registros", JSON.stringify(registros));
                            inicializarCalendario();
                            atualizarMesesAnosDisponiveis(); // Troque para a função correta
                            calcularResumoMes(mesSelecionado.value);
                            atualizarListaRegistros(mesSelecionado.value);
                            Swal.fire("Sucesso", "EDT/RSP inserido.", "success");
                        }
                    });
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
    // Scroll automático ao focar nos campos de hora no mobile
    [horaInicio, horaFim].forEach(input => {
        input.addEventListener('focus', function () {
            setTimeout(() => this.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
        });
    });

    inicializarCalendario(new Date().toISOString().slice(0, 10)); // Inicializa o calendário com a data atual
    atualizarMesesAnosDisponiveis();
});

function formatarData(data) {
    const [ano, mes, dia] = data.split("-"); // Divide a string YYYY-MM-DD
    return `${dia}/${mes}/${ano}`; // Retorna no formato DD/MM/YYYY
}

const configButton = document.getElementById('configButton');
const img = configButton.querySelector('img');

configButton.addEventListener('click', () => {
    img.classList.add('animated');

    setTimeout(() => {
        img.classList.remove('animated');
    }, 800); // Retorna ao original após 0.8s
});

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