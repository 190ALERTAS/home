function listar_dados(){
    var filtro_sexo = document.getElementById("filtro_sexo").value;
    var filtro_idade = document.getElementById("filtro_idade").value;

    // Limpa o conteÃºdo anterior da div
    document.getElementById("listar_dados").innerHTML = "";

    var novoDiv = document.createElement("div");

    // Função auxiliar para montar cada linha de exercício
    function linhaExercicio(label, id, options, pontosId) {
        return `
        <div class="taf-exercicio-row">
            <span class="taf-exercicio-label">${label}</span>
            <select class="taf-exercicio-select form-select" id="${id}" onchange="calcular_pontos(this.value)">
                ${options}
            </select>
            <span class="taf-exercicio-pontos" id="${pontosId}">Pontos</span>
        </div>
        `;
    }

    if (filtro_sexo === 'masculino'){
        if (filtro_idade == 1){

            novoDiv.innerHTML =
                linhaExercicio(
                    "ABDOMINAL",
                    "select_abdominal",
                    `<option value="pontos">Selecione</option><option value="0">&lt; 31</option><option value="1">31</option><option value="10">33</option><option value="20">35</option><option value="25">37</option><option value="30">39</option><option value="35">40</option><option value="40">41</option><option value="45">42</option><option value="50">43</option><option value="55">44</option><option value="60">45</option><option value="65">46</option><option value="70">47</option><option value="75">48</option><option value="75">&gt; 48</option>`,
                    "text_abdominal"
                ) +
                linhaExercicio(
                    "BARRA",
                    "select_barra",
                    `<option value="pontos">Selecione</option><option value="0">&lt; 1</option><option value="20">1</option><option value="25">2</option><option value="30">3</option><option value="35">4</option><option value="40">5</option><option value="45">6</option><option value="50">7</option><option value="55">8</option><option value="60">9</option><option value="65">10</option><option value="70">11</option><option value="75">12</option><option value="75">&gt; 12</option>`,
                    "text_barra"
                ) +
                linhaExercicio(
                    "CORRIDA",
                    "select_corrida",
                    `<option value="pontos">Selecione</option><option value="0">&lt; 1500 metros</option><option value="1 ">1500 metros</option><option value="10 ">1550 metros</option><option value="20 ">1600 metros</option><option value="25 ">1650 metros</option><option value="30 ">1700 metros</option><option value="35 ">1750 metros</option><option value="40 ">1800 metros</option><option value="45 ">1850 metros</option><option value="50 ">1900 metros</option><option value="55 ">1950 metros</option><option value="60 ">2000 metros</option><option value="65 ">2050 metros</option><option value="70 ">2100 metros</option><option value="75 ">2150 metros</option><option value="80 ">2200 metros</option><option value="85 ">2250 metros</option><option value="90 ">2300 metros</option><option value="95 ">2350 metros</option><option value="100 ">2400 metros</option><option value="105 ">2450 metros</option><option value="110 ">2500 metros</option><option value="115 ">2550 metros</option><option value="120 ">2600 metros</option><option value="125 ">2650 metros</option><option value="130 ">2700 metros</option><option value="135 ">2750 metros</option><option value="140 ">2800 metros</option><option value="145 ">2850 metros</option><option value="150 ">2900 metros</option><option value="150 ">&gt; 2900 metros</option>`,
                    "text_corrida"
                );

        }else if(filtro_idade == 2){
            novoDiv.innerHTML =
                linhaExercicio(
                    "ABDOMINAL",
                    "select_abdominal",
                    `<option value="pontos">Selecione</option><option value="0">&lt; 27</option><option value="1">27</option><option value="10">29</option><option value="20">31</option><option value="25">33</option><option value="30">35</option><option value="35">37</option><option value="40">39</option><option value="45">40</option><option value="50">41</option><option value="55">42</option><option value="60">43</option><option value="65">44</option><option value="70">45</option><option value="75">46</option><option value="75">&gt; 46</option>`,
                    "text_abdominal"
                ) +
                linhaExercicio(
                    "BARRA",
                    "select_barra",
                    `<option value="pontos">Selecione</option><option value="0">&lt; 1</option><option value="30">1</option><option value="35">2</option><option value="40">3</option><option value="45">4</option><option value="50">5</option><option value="55">6</option><option value="60">7</option><option value="65">8</option><option value="70">9</option><option value="75">10</option><option value="75">&gt; 10</option>`,
                    "text_barra"
                ) +
                linhaExercicio(
                    "CORRIDA",
                    "select_corrida",
                    `<option value="pontos">Selecione</option><option value="0">&lt; 1400 metros</option><option value="1 ">1400 metros</option><option value="10 ">1450 metros</option><option value="20 ">1500 metros</option><option value="25 ">1550 metros</option><option value="30 ">1600 metros</option><option value="35 ">1650 metros</option><option value="40 ">1700 metros</option><option value="45 ">1750 metros</option><option value="50 ">1800 metros</option><option value="55 ">1850 metros</option><option value="60 ">1900 metros</option><option value="65 ">1950 metros</option><option value="70 ">2000 metros</option><option value="75 ">2050 metros</option><option value="80 ">2100 metros</option><option value="85 ">2150 metros</option><option value="90 ">2200 metros</option><option value="95 ">2250 metros</option><option value="100 ">2300 metros</option><option value="105 ">2350 metros</option><option value="110 ">2400 metros</option><option value="115 ">2450 metros</option><option value="120 ">2500 metros</option><option value="125 ">2550 metros</option><option value="130 ">2600 metros</option><option value="135 ">2650 metros</option><option value="140 ">2700 metros</option><option value="145 ">2750 metros</option><option value="150 ">2800 metros</option><option value="150 ">&gt; 2800 metros</option>`,
                    "text_corrida"
                );

        }else if(filtro_idade == 3){
            novoDiv.innerHTML =
                linhaExercicio(
                    "ABDOMINAL",
                    "select_abdominal",
                    `<option value="pontos">Selecione</option><option value="0">&lt; 23</option><option value="1">23</option><option value="10">25</option><option value="20">27</option><option value="25">29</option><option value="30">31</option><option value="35">33</option><option value="40">35</option><option value="45">37</option><option value="50">39</option><option value="55">40</option><option value="60">41</option><option value="65">42</option><option value="70">43</option><option value="75">44</option><option value="75">&gt; 44</option>`,
                    "text_abdominal"
                ) +
                linhaExercicio(
                    "APOIO",
                    "select_barra",
                    `<option value="pontos">Selecione</option><option value="0">&lt; 20</option><option value="1">20</option><option value="10">21</option><option value="20">22</option><option value="25">23</option><option value="30">24</option><option value="35">25</option><option value="40">26</option><option value="45">27</option><option value="50">28</option><option value="55">29</option><option value="60">30</option><option value="65">31</option><option value="70">32</option><option value="75">33</option>`,
                    "text_barra"
                ) +
                linhaExercicio(
                    "CORRIDA",
                    "select_corrida",
                    `<option value="pontos">Selecione</option><option value="0">&lt; 1300 metros</option><option value="1 ">1300 metros</option><option value="10 ">1350 metros</option><option value="20 ">1400 metros</option><option value="25 ">1450 metros</option><option value="30 ">1500 metros</option><option value="35 ">1550 metros</option><option value="40 ">1600 metros</option><option value="45 ">1650 metros</option><option value="50 ">1700 metros</option><option value="55 ">1750 metros</option><option value="60 ">1800 metros</option><option value="65 ">1850 metros</option><option value="70 ">1900 metros</option><option value="75 ">1950 metros</option><option value="80 ">2000 metros</option><option value="85 ">2050 metros</option><option value="90 ">2100 metros</option><option value="95 ">2150 metros</option><option value="100 ">2200 metros</option><option value="105 ">2250 metros</option><option value="110 ">2300 metros</option><option value="115 ">2350 metros</option><option value="120 ">2400 metros</option><option value="125 ">2450 metros</option><option value="130 ">2500 metros</option><option value="135 ">2550 metros</option><option value="140 ">2600 metros</option><option value="145 ">2650 metros</option><option value="150 ">2700 metros</option><option value="150 ">&gt; 2700 metros</option>`,
                    "text_corrida"
                );

        }else if(filtro_idade == 4){
            novoDiv.innerHTML =
                linhaExercicio(
                    "ABDOMINAL",
                    "select_abdominal",
                    `<option value="pontos">Selecione</option><option value="0">&lt; 19</option><option value="1">19</option><option value="10">21</option><option value="20">23</option><option value="25">25</option><option value="30">27</option><option value="35">29</option><option value="40">31</option><option value="45">33</option><option value="50">35</option><option value="55">37</option><option value="60">39</option><option value="65">40</option><option value="70">41</option><option value="75">42</option><option value="75">&gt; 42</option>`,
                    "text_abdominal"
                ) +
                linhaExercicio(
                    "APOIO",
                    "select_barra",
                    `<option value="pontos">Selecione</option><option value="0">&lt; 18</option><option value="1">18</option><option value="10">19</option><option value="20">20</option><option value="25">21</option><option value="30">22</option><option value="35">23</option><option value="40">24</option><option value="45">25</option><option value="50">26</option><option value="55">27</option><option value="60">28</option><option value="65">29</option><option value="70">30</option><option value="75">31</option>`,
                    "text_barra"
                ) +
                linhaExercicio(
                    "CORRIDA",
                    "select_corrida",
                    `<option value="pontos">Selecione</option><option value="0">&lt; 1200 metros</option><option value="1 ">1200 metros</option><option value="10 ">1250 metros</option><option value="20 ">1300 metros</option><option value="25 ">1350 metros</option><option value="30 ">1400 metros</option><option value="35 ">1450 metros</option><option value="40 ">1500 metros</option><option value="45 ">1550 metros</option><option value="50 ">1600 metros</option><option value="55 ">1650 metros</option><option value="60 ">1700 metros</option><option value="65 ">1750 metros</option><option value="70 ">1800 metros</option><option value="75 ">1850 metros</option><option value="80 ">1900 metros</option><option value="85 ">1950 metros</option><option value="90 ">2000 metros</option><option value="95 ">2050 metros</option><option value="100 ">2100 metros</option><option value="105 ">2150 metros</option><option value="110 ">2200 metros</option><option value="115 ">2250 metros</option><option value="120 ">2300 metros</option><option value="125 ">2350 metros</option><option value="130 ">2400 metros</option><option value="135 ">2450 metros</option><option value="140 ">2500 metros</option><option value="145 ">2550 metros</option><option value="150 ">2600 metros</option><option value="150 ">&gt; 2600 metros</option>`,
                    "text_corrida"
                );
        }else if(filtro_idade == 5){
            novoDiv.innerHTML =
                linhaExercicio(
                    "ABDOMINAL",
                    "select_abdominal",
                    `<option value="pontos">Selecione</option><option value="0">&lt; 19</option><option value="5">19</option><option value="15">21</option><option value="25">23</option><option value="30">25</option><option value="35">27</option><option value="40">29</option><option value="45">31</option><option value="50">33</option><option value="55">35</option><option value="60">37</option><option value="65">39</option><option value="70">40</option><option value="75">41</option><option value="75">&gt; 41</option>`,
                    "text_abdominal"
                ) +
                linhaExercicio(
                    "APOIO",
                    "select_barra",
                    `<option value="pontos">Selecione</option><option value="0">&lt; 18</option><option value="5">18</option><option value="15">19</option><option value="25">20</option><option value="30">21</option><option value="35">22</option><option value="40">23</option><option value="45">24</option><option value="50">25</option><option value="55">26</option><option value="60">27</option><option value="65">28</option><option value="70">29</option><option value="75">30</option>`,
                    "text_barra"
                ) +
                linhaExercicio(
                    "CORRIDA",
                    "select_corrida",
                    `<option value="pontos">Selecione</option><option value="0">&lt; 1200 metros</option><option value="5 ">1200 metros</option><option value="15 ">1250 metros</option><option value="25 ">1300 metros</option><option value="30 ">1350 metros</option><option value="35 ">1400 metros</option><option value="40 ">1450 metros</option><option value="45 ">1500 metros</option><option value="50 ">1550 metros</option><option value="55 ">1600 metros</option><option value="60 ">1650 metros</option><option value="65 ">1700 metros</option><option value="70 ">1750 metros</option><option value="75 ">1800 metros</option><option value="80 ">1850 metros</option><option value="85 ">1900 metros</option><option value="90 ">1950 metros</option><option value="95 ">2000 metros</option><option value="100 ">2050 metros</option><option value="105 ">2100 metros</option><option value="110 ">2150 metros</option><option value="115 ">2200 metros</option><option value="120 ">2250 metros</option><option value="125 ">2300 metros</option><option value="130 ">2350 metros</option><option value="135 ">2400 metros</option><option value="140 ">2450 metros</option><option value="145 ">2500 metros</option><option value="150 ">2550 metros</option><option value="150 ">&gt; 2550 metros</option>`,
                    "text_corrida"
                );
        }

    } else if (filtro_sexo === 'feminino'){
        if (filtro_idade == 1){
            novoDiv.innerHTML =
                linhaExercicio(
                    "ABDOMINAL",
                    "select_abdominal",
                    `<option value="pontos">Selecione</option><option value="0">&lt; 23</option><option value="1">23</option><option value="10">25</option><option value="20">27</option><option value="25">29</option><option value="30">31</option><option value="35">32</option><option value="40">33</option><option value="45">34</option><option value="50">35</option><option value="55">36</option><option value="60">37</option><option value="65">38</option><option value="70">39</option><option value="75">40</option><option value="75">&gt; 40</option>`,
                    "text_abdominal"
                ) +
                linhaExercicio(
                    "BARRA",
                    "select_barra",
                    `<option value="pontos">Selecione</option><option value="0">< 5" segundos</option><option value="20">5" segundos</option><option value="25">9" segundos</option><option value="30">13" segundos</option><option value="35">17" segundos</option><option value="40">20" segundos</option><option value="45">23" segundos</option><option value="50">25" segundos</option><option value="55">29" segundos</option><option value="60">32" segundos</option><option value="65">35" segundos</option><option value="70">37" segundos</option><option value="75">39" segundos</option><option value="75">> 39" segundos</option>`,
                    "text_barra"
                ) +
                linhaExercicio(
                    "CORRIDA",
                    "select_corrida",
                    `<option value="pontos">Selecione</option><option value="0">&lt; 1100 metros</option><option value="1 ">1100 metros</option><option value="10 ">1150 metros</option><option value="20 ">1200 metros</option><option value="25 ">1250 metros</option><option value="30 ">1300 metros</option><option value="35 ">1350 metros</option><option value="40 ">1400 metros</option><option value="45 ">1450 metros</option><option value="50 ">1500 metros</option><option value="55 ">1550 metros</option><option value="60 ">1600 metros</option><option value="65 ">1650 metros</option><option value="70 ">1700 metros</option><option value="75 ">1750 metros</option><option value="80 ">1800 metros</option><option value="85 ">1850 metros</option><option value="90 ">1900 metros</option><option value="95 ">1950 metros</option><option value="100 ">2000 metros</option><option value="105 ">2150 metros</option><option value="110 ">2100 metros</option><option value="115 ">2150 metros</option><option value="120 ">2200 metros</option><option value="125 ">2250 metros</option><option value="130 ">2300 metros</option><option value="135 ">2350 metros</option><option value="140 ">2400 metros</option><option value="145 ">2450 metros</option><option value="150 ">2500 metros</option><option value="150 ">&gt; 2500 metros</option>`,
                    "text_corrida"
                );
        }else if(filtro_idade == 2){
            novoDiv.innerHTML =
                linhaExercicio(
                    "ABDOMINAL",
                    "select_abdominal",
                    `<option value="pontos">Selecione</option><option value="0">&lt; 19</option><option value="1">19</option><option value="10">21</option><option value="20">23</option><option value="25">25</option><option value="30">27</option><option value="35">29</option><option value="40">31</option><option value="45">32</option><option value="50">33</option><option value="55">34</option><option value="60">35</option><option value="65">36</option><option value="70">37</option><option value="75">38</option><option value="75">&gt; 38</option>`,
                    "text_abdominal"
                ) +
                linhaExercicio(
                    "BARRA",
                    "select_barra",
                    `<option value="pontos">Selecione</option><option value="0">&lt; 5" segundos</option><option value="30">5" segundos</option><option value="35">9" segundos</option><option value="40">13" segundos</option><option value="45">17" segundos</option><option value="50">20" segundos</option><option value="55">23" segundos</option><option value="60">26" segundos</option><option value="65">29" segundos</option><option value="70">32" segundos</option><option value="75">35" segundos</option><option value="75">&gt; 35" segundos</option>`,
                    "text_barra"
                ) +
                linhaExercicio(
                    "CORRIDA",
                    "select_corrida",
                    `<option value="pontos">Selecione</option><option value="0">&lt; 1000 metros</option><option value="1 ">1000 metros</option><option value="10 ">1050 metros</option><option value="20 ">1100 metros</option><option value="25 ">1150 metros</option><option value="30 ">1200 metros</option><option value="35 ">1250 metros</option><option value="40 ">1300 metros</option><option value="45 ">1350 metros</option><option value="50 ">1400 metros</option><option value="55 ">1450 metros</option><option value="60 ">1500 metros</option><option value="65 ">1550 metros</option><option value="70 ">1600 metros</option><option value="75 ">1650 metros</option><option value="80 ">1700 metros</option><option value="85 ">1750 metros</option><option value="90 ">1800 metros</option><option value="95 ">1850 metros</option><option value="100 ">1900 metros</option><option value="105 ">1950 metros</option><option value="110 ">2000 metros</option><option value="115 ">2150 metros</option><option value="120 ">2100 metros</option><option value="125 ">2150 metros</option><option value="130 ">2200 metros</option><option value="135 ">2250 metros</option><option value="140 ">2300 metros</option><option value="145 ">2350 metros</option><option value="150 ">2400 metros</option><option value="150 ">&gt; 2400 metros</option>`,
                    "text_corrida"
                );
        }else if(filtro_idade == 3){
            novoDiv.innerHTML =
                linhaExercicio(
                    "ABDOMINAL",
                    "select_abdominal",
                    `<option value="pontos">Selecione</option><option value="0">&lt; 15</option><option value="1">15</option><option value="10">17</option><option value="20">19</option><option value="25">21</option><option value="30">23</option><option value="35">25</option><option value="40">27</option><option value="45">29</option><option value="50">31</option><option value="55">32</option><option value="60">33</option><option value="65">34</option><option value="70">35</option><option value="75">36</option><option value="75">&gt; 36</option>`,
                    "text_abdominal"
                ) +
                linhaExercicio(
                    "APOIO",
                    "select_barra",
                    `<option value="pontos">Selecione</option><option value="0">&lt; 19</option><option value="1">19</option><option value="10">20</option><option value="20">21</option><option value="25">22</option><option value="30">23</option><option value="35">24</option><option value="40">25</option><option value="45">26</option><option value="50">27</option><option value="55">28</option><option value="60">29</option><option value="65">30</option><option value="70">31</option><option value="75">32</option>`,
                    "text_barra"
                ) +
                linhaExercicio(
                    "CORRIDA",
                    "select_corrida",
                    `<option value="pontos">Selecione</option><option value="0">&lt; 900 metros</option><option value="1 ">900 metros</option><option value="10 ">950 metros</option><option value="20 ">1000 metros</option><option value="25 ">1050 metros</option><option value="30 ">1100 metros</option><option value="35 ">1150 metros</option><option value="40 ">1200 metros</option><option value="45 ">1250 metros</option><option value="50 ">1300 metros</option><option value="55 ">1350 metros</option><option value="60 ">1400 metros</option><option value="65 ">1450 metros</option><option value="70 ">1500 metros</option><option value="75 ">1550 metros</option><option value="80 ">1600 metros</option><option value="85 ">1650 metros</option><option value="90 ">1700 metros</option><option value="95 ">1750 metros</option><option value="100 ">1800 metros</option><option value="105 ">1850 metros</option><option value="110 ">1900 metros</option><option value="115 ">1950 metros</option><option value="120 ">2000 metros</option><option value="125 ">2150 metros</option><option value="130 ">2100 metros</option><option value="135 ">2150 metros</option><option value="140 ">2200 metros</option><option value="145 ">2250 metros</option><option value="150 ">2300 metros</option><option value="150 ">&gt; 2300 metros</option>`,
                    "text_corrida"
                );
        }else if(filtro_idade == 4){
            novoDiv.innerHTML =
                linhaExercicio(
                    "ABDOMINAL",
                    "select_abdominal",
                    `<option value="pontos">Selecione</option><option value="0">&lt; 11</option><option value="1">11</option><option value="10">13</option><option value="20">15</option><option value="25">17</option><option value="30">19</option><option value="35">21</option><option value="40">23</option><option value="45">25</option><option value="50">27</option><option value="55">29</option><option value="60">31</option><option value="65">32</option><option value="70">33</option><option value="75">34</option><option value="75">&gt; 34</option>`,
                    "text_abdominal"
                ) +
                linhaExercicio(
                    "APOIO",
                    "select_barra",
                    `<option value="pontos">Selecione</option><option value="0">&lt; 17</option><option value="1">17</option><option value="10">18</option><option value="20">19</option><option value="25">20</option><option value="30">21</option><option value="35">22</option><option value="40">23</option><option value="45">24</option><option value="50">25</option><option value="55">26</option><option value="60">27</option><option value="65">28</option><option value="70">29</option><option value="75">30</option>`,
                    "text_barra"
                ) +
                linhaExercicio(
                    "CORRIDA",
                    "select_corrida",
                    `<option value="pontos">Selecione</option><option value="0">&lt; 800 metros</option><option value="1 ">800 metros</option><option value="10 ">850 metros</option><option value="20 ">900 metros</option><option value="25 ">950 metros</option><option value="30 ">1000 metros</option><option value="35 ">1050 metros</option><option value="40 ">1100 metros</option><option value="45 ">1150 metros</option><option value="50 ">1200 metros</option><option value="55 ">1250 metros</option><option value="60 ">1300 metros</option><option value="65 ">1350 metros</option><option value="70 ">1400 metros</option><option value="75 ">1450 metros</option><option value="80 ">1500 metros</option><option value="85 ">1550 metros</option><option value="90 ">1600 metros</option><option value="95 ">1650 metros</option><option value="100 ">1700 metros</option><option value="105 ">1750 metros</option><option value="110 ">1800 metros</option><option value="115 ">1850 metros</option><option value="120 ">1900 metros</option><option value="125 ">1950 metros</option><option value="130 ">2000 metros</option><option value="135 ">2150 metros</option><option value="140 ">2100 metros</option><option value="145 ">2150 metros</option><option value="150 ">2200 metros</option><option value="150 ">&gt; 2200 metros</option>`,
                    "text_corrida"
                );
        }else if(filtro_idade == 5){
            novoDiv.innerHTML =
                linhaExercicio(
                    "ABDOMINAL",
                    "select_abdominal",
                    `<option value="pontos">Selecione</option><option value="0">&lt; 11</option><option value="5">11</option><option value="15">13</option><option value="25">15</option><option value="30">17</option><option value="35">19</option><option value="40">21</option><option value="45">23</option><option value="50">25</option><option value="55">27</option><option value="60">29</option><option value="65">31</option><option value="70">32</option><option value="75">33</option><option value="75">&gt; 33</option>`,
                    "text_abdominal"
                ) +
                linhaExercicio(
                    "APOIO",
                    "select_barra",
                    `<option value="pontos">Selecione</option><option value="0">&lt; 17</option><option value="5">17</option><option value="15">18</option><option value="25">19</option><option value="30">20</option><option value="35">21</option><option value="40">22</option><option value="45">23</option><option value="50">24</option><option value="55">25</option><option value="60">26</option><option value="65">27</option><option value="70">28</option><option value="75">29</option>`,
                    "text_barra"
                ) +
                linhaExercicio(
                    "CORRIDA",
                    "select_corrida",
                    `<option value="pontos">Selecione</option><option value="0">&lt; 800 metros</option><option value="5 ">800 metros</option><option value="15 ">850 metros</option><option value="25 ">900 metros</option><option value="30 ">950 metros</option><option value="35 ">1000 metros</option><option value="40 ">1050 metros</option><option value="45 ">1100 metros</option><option value="50 ">1150 metros</option><option value="55 ">1200 metros</option><option value="60 ">1250 metros</option><option value="65 ">1300 metros</option><option value="70 ">1350 metros</option><option value="75 ">1400 metros</option><option value="80 ">1450 metros</option><option value="85 ">1500 metros</option><option value="90 ">1550 metros</option><option value="95 ">1600 metros</option><option value="100 ">1650 metros</option><option value="105 ">1700 metros</option><option value="110 ">1750 metros</option><option value="115 ">1800 metros</option><option value="120 ">1850 metros</option><option value="125 ">1900 metros</option><option value="130 ">1950 metros</option><option value="135 ">2000 metros</option><option value="140 ">2150 metros</option><option value="145 ">2100 metros</option><option value="150 ">2150 metros</option><option value="150 ">&gt; 2150 metros</option>`,
                    "text_corrida"
                );
        }
    }

    document.getElementById("listar_dados").appendChild(novoDiv);

    document.getElementById("div_excelente").style.display = 'none';
    document.getElementById("div_muito_bom").style.display = 'none';
    document.getElementById("div_bom").style.display = 'none';
    document.getElementById("div_regular").style.display = 'none';
    document.getElementById("div_insuficiente").style.display = 'none';

}


//SCRIPT PARA PASSAR O VALOR DO SELECT PARA O INPUT//
function calcular_pontos(value){

    var value_abdominal = document.getElementById("select_abdominal").value;
    var value_barra = document.getElementById("select_barra").value;
    var value_corrida = document.getElementById("select_corrida").value;

    var total_pontos = parseInt (value_abdominal) + parseInt (value_barra) + parseInt (value_corrida);

    if (value_abdominal >= 0) { var text_abdominal = value_abdominal + ' /75'; } else if (value_abdominal = 'pontos') { var text_abdominal = 'Pontos';}
    if (value_barra >= 0) { var text_barra = value_barra + ' /75'; } else if (value_barra = 'pontos') { var text_barra = 'Pontos';}
    if (value_corrida >= 0) { var text_corrida = value_corrida + ' /150'; } else if (value_corrida = 'pontos') { var text_corrida = 'Pontos';}

    $('#text_abdominal').text(text_abdominal);
    $('#text_barra').text(text_barra);
    $('#text_corrida').text(text_corrida);

    document.getElementById("div_excelente").style.display = 'none';
    document.getElementById("div_muito_bom").style.display = 'none';
    document.getElementById("div_bom").style.display = 'none';
    document.getElementById("div_regular").style.display = 'none';
    document.getElementById("div_insuficiente").style.display = 'none';


    if (total_pontos > 0 && total_pontos <= 150) {

        document.getElementById("div_excelente").style.display = 'none';
        document.getElementById("div_muito_bom").style.display = 'none';
        document.getElementById("div_bom").style.display = 'none';
        document.getElementById("div_regular").style.display = 'none';
        document.getElementById("div_insuficiente").style.display = 'block';

        var text_insuficiente = total_pontos + '/300 pontos - INSUFICIENTE';
        $('#span_pontos_insuficiente').text(text_insuficiente);

    } else if (total_pontos >= 151 && total_pontos <= 210) {

        document.getElementById("div_excelente").style.display = 'none';
        document.getElementById("div_muito_bom").style.display = 'none';
        document.getElementById("div_bom").style.display = 'none';
        document.getElementById("div_regular").style.display = 'block';
        document.getElementById("div_insuficiente").style.display = 'none';

        var text_regular = total_pontos + '/300 pontos - REGULAR';
        $('#span_pontos_regular').text(text_regular);

    } else if (total_pontos >= 211 && total_pontos <= 254) {

        document.getElementById("div_excelente").style.display = 'none';
        document.getElementById("div_muito_bom").style.display = 'none';
        document.getElementById("div_bom").style.display = 'block';
        document.getElementById("div_regular").style.display = 'none';
        document.getElementById("div_insuficiente").style.display = 'none';

        var text_bom = total_pontos + '/300 pontos - BOM';
        $('#span_pontos_bom').text(text_bom);

    } else if (total_pontos >= 255 && total_pontos <= 299) {

        document.getElementById("div_excelente").style.display = 'none';
        document.getElementById("div_muito_bom").style.display = 'block';
        document.getElementById("div_bom").style.display = 'none';
        document.getElementById("div_regular").style.display = 'none';
        document.getElementById("div_insuficiente").style.display = 'none';

        var text_muito_bom = total_pontos + '/300 pontos - MUITO BOM';
        $('#span_pontos_muito_bom').text(text_muito_bom);

    } else if (total_pontos == 300) {

        document.getElementById("div_excelente").style.display = 'block';
        document.getElementById("div_muito_bom").style.display = 'none';
        document.getElementById("div_bom").style.display = 'none';
        document.getElementById("div_regular").style.display = 'none';
        document.getElementById("div_insuficiente").style.display = 'none';

        var text_excelente = total_pontos + '/300 pontos - EXCELENTE';
        $('#span_pontos_excelente').text(text_excelente);

    }
};

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