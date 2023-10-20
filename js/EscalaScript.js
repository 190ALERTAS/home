    document.addEventListener("DOMContentLoaded", function() {
        const dataInicio = document.getElementById("dataInicio");
        const horaInicio = document.getElementById("horaInicio");
        const horaFim = document.getElementById("horaFim");
        const adicionar = document.getElementById("adicionar");
        const limpar = document.getElementById("limpar");
        const tabela = document.getElementById("tabela");
        const resumoMes = document.getElementById("resumoMes");
        const salvar = document.getElementById("salvar");
        /* const salvarPDF = document.getElementById("salvarPDF"); */
        const importar = document.getElementById("importar");
        let registros = [];

        // Verifique se há dados no localStorage e carregue-os se existirem
        if (localStorage.getItem("registros")) {
            registros = JSON.parse(localStorage.getItem("registros"));
            atualizarTabela();
            calcularResumoMes();
        }

        adicionar.addEventListener("click", function() {
            const dataInput = dataInicio.value;
            // Parse the date input in the format "DD/MM/YYYY"
            const [day, month, year] = dataInput.split('-');
            const data = `${year}/${month}/${day}`; // Convert to "YYYY/MM/DD" format

            const inicio = horaInicio.value;
            const fim = horaFim.value;
            const horasTrabalhadas = calcularHorasTrabalhadas(inicio, fim);

            registros.push({ data, inicio, fim, horasTrabalhadas });
            // Ordene os registros com base na data antes de atualizar a tabela
            registros.sort((a, b) => a.data.localeCompare(b.data));
            atualizarTabela();
            calcularResumoMes();

            // Atualize o localStorage
            localStorage.setItem("registros", JSON.stringify(registros));
        });

        limpar.addEventListener("click", function() {
            Swal.fire({
                title: "Tem certeza?",
                text: "Esta ação irá limpar todos os registros. Você tem certeza que deseja continuar?",
                icon: "warning",
                iconColor: '#7c7565',
                showCancelButton: true,
                confirmButtonColor: "#694f43",
                cancelButtonColor: "#d33",
                confirmButtonText: "Sim, limpar",
                cancelButtonText: "Cancelar"
            }).then((result) => {
                if (result.isConfirmed) {
                    registros = [];
                    // Limpe os registros no localStorage
                    localStorage.removeItem("registros");
                    atualizarTabela();
                    calcularResumoMes();
                    location.reload(); // Isso recarrega a página
                }
            });
        });
        

        salvar.addEventListener("click", function() {
            const dataToSave = JSON.stringify(registros);
            const blob = new Blob([dataToSave], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "registros.json";
            a.click();
        });

        importar.addEventListener("change", function(event) {
            const file = event.target.files[0];
            const reader = new FileReader();
            reader.onload = function(e) {
                registros = JSON.parse(e.target.result);
                atualizarTabela();
                calcularResumoMes();

                // Atualize o localStorage
                localStorage.setItem("registros", JSON.stringify(registros));
            };
            reader.readAsText(file);
        });

        function calcularHorasTrabalhadas(inicio, fim) {
            const inicioTime = new Date(`1970-01-01T${inicio}`);
            const fimTime = new Date(`1970-01-01T${fim}`);
            
            // Calcula a diferença em milissegundos
            let diff = fimTime - inicioTime;

            // Verifica se a diferença é negativa, o que indica que passou para o dia seguinte
            if (diff < 0) {
                const umDia = 24 * 60 * 60 * 1000; // 24 horas em milissegundos
                diff += umDia;
            }
            
            const horas = Math.floor(diff / 3600000);
            const minutos = Math.round((diff % 3600000) / 60000);
            
            return `${horas} horas ${minutos} minutos`;
        }

        function atualizarTabela() {
            tabela.innerHTML = `
                <tr>
                    <th>Data</th>
                    <th>Início</th>
                    <th>Fim</th>
                    <th>Horas Trabalhadas</th>
                    <th>Ação</th>
                </tr>
            `;
            registros.forEach((registro, index) => {
                tabela.innerHTML += `
                    <tr>
                        <td>${registro.data}</td>
                        <td>${registro.inicio}</td>
                        <td>${registro.fim}</td>
                        <td>${registro.horasTrabalhadas}</td>
                        <td><button id="excluirbtn" onclick="excluirRegistro(${index})">Excluir</button></td>
                    </tr>
                `;
            });
        }

        window.excluirRegistro = function(index) {
            registros.splice(index, 1);
            atualizarTabela();
            calcularResumoMes();

            // Atualize o localStorage
            localStorage.setItem("registros", JSON.stringify(registros));
        };

        function calcularResumoMes() {
            let total = 0;
            registros.forEach(registro => {
                const horas = Number(registro.horasTrabalhadas.split(" ")[0]);
                const minutos = Number(registro.horasTrabalhadas.split(" ")[2]);
                total += horas * 60 + minutos;
            });
            const horas = Math.floor(total / 60);
            const minutos = total % 60;
            resumoMes.textContent = `${horas} horas ${minutos} minutos`;
        }


        document.getElementById("salvarPDF").addEventListener("click", function () {
            // Defina as definições do documento
            const documentDefinition = {
                content: [
                    { text: 'Registros de Horas', style: 'header' },
                    {
                        table: {
                            headerRows: 1,
                            widths: ['auto', 'auto', 'auto', 'auto'],
                            body: [
                                ['Data', 'Início', 'Fim', 'Horas Trabalhadas no dia'],
                            ],
                        }
                    },
                    { text: `Total do mês: ${resumoMes.textContent}`, style: 'total' }
                ],
        
                styles: {
                    header: { fontSize: 16, bold: true, margin: [0, 0, 0, 10] },
                    total: { fontSize: 14, bold: true, margin: [0, 20, 0, 0] }
                }
            };
        
            registros.forEach(({ data, inicio, fim, horasTrabalhadas }) => {
                documentDefinition.content[1].table.body.push([data, inicio, fim, horasTrabalhadas]);
            });
        
            // Gere o PDF e abra-o em uma nova aba
            pdfMake.createPdf(documentDefinition).getBuffer(function (buffer) {
                var blob = new Blob([buffer], { type: 'application/pdf' });
                var url = URL.createObjectURL(blob);
                window.open(url, '_blank');
            });
        });
    });
        

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