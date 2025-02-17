const map = L.map('map', {
    center: [-30.0346, -51.2177],
    zoom: 18,
    minZoom: 12,
    maxZoom: 19, // Aumente o valor do maxZoom para permitir um zoom maior
    zoomControl: true,
    doubleClickZoom: false
});

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
}).addTo(map);


const images = {
    'veiculo': 'https://raw.githubusercontent.com/190ALERTAS/home/refs/heads/main/img/croqui-img/ve%C3%ADculo.png',
    'moto': 'https://raw.githubusercontent.com/190ALERTAS/home/refs/heads/main/img/croqui-img/motocicleta-bicicleta.png',
    'onibus': 'https://raw.githubusercontent.com/190ALERTAS/home/refs/heads/main/img/croqui-img/onibus.png',
    'caminhao': 'https://raw.githubusercontent.com/190ALERTAS/home/refs/heads/main/img/croqui-img/caminh%C3%A3o.png',
    'carroça': 'https://raw.githubusercontent.com/190ALERTAS/home/refs/heads/main/img/croqui-img/carro%C3%A7a.png',
    'carroça-tombada': 'https://raw.githubusercontent.com/190ALERTAS/home/refs/heads/main/img/croqui-img/carro%C3%A7a%20tombada.png',
    'veiculo-capotado': 'https://raw.githubusercontent.com/190ALERTAS/home/refs/heads/main/img/croqui-img/ve%C3%ADculo%20capotado.png',
    'veiculo-tombado': 'https://raw.githubusercontent.com/190ALERTAS/home/refs/heads/main/img/croqui-img/ve%C3%ADculo%20tombado.png',
};

let currentControls = null;

function addMarker(type) {
    if (images[type]) {
        const img = new Image();
        img.src = images[type];
        img.onload = function() {
            const width = img.width;
            const height = img.height;
            const baseSize = 32;

            let newWidth, newHeight;
            if (width > height) {
                newWidth = baseSize;
                newHeight = (height / width) * baseSize;
            } else {
                newHeight = baseSize;
                newWidth = (width / height) * baseSize;
            }

            const icon = L.icon({
                iconUrl: images[type],
                iconSize: [newWidth, newHeight],
                iconAnchor: [newWidth / 2, newHeight / 2]
            });

            map.once('click', function placeMarker(e) {
                const marker = L.marker(e.latlng, { 
                    icon, 
                    draggable: true, 
                    rotationAngle: 0 
                }).addTo(map);
                
                // Adiciona evento de clique para mostrar os controles
                marker.on('click', function() {
                    showControls(marker);
                });

                // Adiciona evento touchstart para prevenir comportamento padrão
                marker.on('touchstart', function(e) {
                    e.originalEvent.preventDefault();
                });
            });
        };
    }
}

function showControls(marker) {
    if (currentControls) {
        document.getElementById('controls-container').removeChild(currentControls);
    }

    const controls = document.createElement('div');
    controls.className = 'controls-container';
    controls.id = 'marker-controls'; // Adiciona um ID específico para os controles do marcador

    // Campo de Legenda
    const labelControl = document.createElement('div');
    labelControl.className = 'control-group';

    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.placeholder = 'Placa';
    labelControl.appendChild(labelInput);

    const addLabelButton = document.createElement('button');
    addLabelButton.className = 'add-label-button';
    addLabelButton.innerText = 'Adicionar';
    addLabelButton.onclick = function() {
        if (marker.label) {
            map.removeLayer(marker.label);
        }

        const labelText = labelInput.value.trim().toUpperCase();
        if (labelText) {
            const labelDiv = L.divIcon({
                className: 'marker-label',
                html: `<div class="label-container">${labelText}</div>`,
                iconSize: [100, 30],
                iconAnchor: [50, -10]
            });

            const labelMarker = L.marker(marker.getLatLng(), { icon: labelDiv, draggable: true }).addTo(map);
            marker.label = labelMarker;

            labelMarker.on('drag', function() {
                marker.setLatLng(labelMarker.getLatLng());
            });

            closeControls();
        }
    };
    labelControl.appendChild(addLabelButton);

    controls.appendChild(labelControl);

    // Controle de Rotação
    const rotationControl = document.createElement('div');
    rotationControl.className = 'control-group';

    const rotationLabel = document.createElement('label');
    rotationLabel.innerText = 'Rotação: ';
    rotationControl.appendChild(rotationLabel);

    const rotationSlider = document.createElement('input');
    rotationSlider.type = 'range';
    rotationSlider.min = '-360';
    rotationSlider.max = '360';
    rotationSlider.value = marker.options.rotationAngle;
    rotationSlider.oninput = function() {
        const newAngle = parseInt(rotationSlider.value);
        marker.setRotationAngle(newAngle);
        console.log(`Rotated marker to: ${newAngle} degrees`);
    };
    rotationControl.appendChild(rotationSlider);

    controls.appendChild(rotationControl);

    // Controle de Tamanho
    const sizeControl = document.createElement('div');
    sizeControl.className = 'control-group';

    const sizeLabel = document.createElement('label');
    sizeLabel.innerText = 'Tamanho: ';
    sizeControl.appendChild(sizeLabel);

    const sizeSlider = document.createElement('input');
    sizeSlider.type = 'range';
    sizeSlider.min = '10';
    sizeSlider.max = '100';
    sizeSlider.value = marker.options.icon.options.iconSize[0];
    sizeSlider.oninput = function() {
        const newWidth = parseInt(sizeSlider.value);
        const aspectRatio = marker.options.icon.options.iconSize[1] / marker.options.icon.options.iconSize[0];
        const newHeight = newWidth * aspectRatio;

        marker.setIcon(L.icon({
            iconUrl: marker.options.icon.options.iconUrl,
            iconSize: [newWidth, newHeight],
            iconAnchor: [newWidth / 2, newHeight / 2]
        }));

        sizeValue.innerText = sizeSlider.value;
        console.log(`Resized marker to: ${newWidth}x${newHeight}`);
    };
    sizeControl.appendChild(sizeSlider);

    controls.appendChild(sizeControl);

    const sizeValue = document.createElement('span');
    sizeValue.className = 'size-value'; // Adiciona uma classe CSS
    sizeValue.innerText = marker.options.icon.options.iconSize[0];
    sizeControl.appendChild(sizeValue);

    // Botões de Ação
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'button-group';

    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-button';
    deleteButton.innerText = 'Excluir';
    deleteButton.onclick = function() {
        if (marker.label) {
            map.removeLayer(marker.label);
        }
        map.removeLayer(marker);
        document.getElementById('controls-container').removeChild(controls);
        currentControls = null;
        console.log('Marker and label deleted');
    };
    buttonGroup.appendChild(deleteButton);

    const closeButton = document.createElement('button');
    closeButton.className = 'close-button';
    closeButton.innerText = 'Fechar';
    closeButton.onclick = function() {
        document.getElementById('controls-container').removeChild(controls);
        currentControls = null;
    };
    buttonGroup.appendChild(closeButton);

    controls.appendChild(buttonGroup);

    document.getElementById('controls-container').appendChild(controls);
    currentControls = controls;

 
    };

function locate() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            map.setView([lat, lng], 18);
            console.log(`Located at: ${lat}, ${lng}`);
        }, function(error) {
            console.error(`Geolocation error: ${error.message}`);
        });
    } else {
        console.error('Geolocation is not supported by this browser.');
    }
}

L.Control.Locate = L.Control.extend({
    onAdd: function(map) {
        const btn = L.DomUtil.create('button', 'locate-button'); // Adiciona uma classe CSS
        const img = document.createElement('img');
        img.src = 'https://raw.githubusercontent.com/190ALERTAS/home/refs/heads/main/img/croqui-img/localizacao.png';
        img.alt = 'Posicionar no Mapa';
        btn.appendChild(img);
        btn.title = 'Posicionar no Mapa';
        btn.onclick = locate;
        return btn;
    },
    onRemove: function(map) {
        // Nothing to do here
    }
});

L.control.locate = function(opts) {
    return new L.Control.Locate(opts);
}

L.control.locate({ position: 'topleft' }).addTo(map);

window.addEventListener("resize", function() {
    setTimeout(() => {
        map.invalidateSize();
    }, 200);
});


function captureMap() {
    const mapElement = document.getElementById('map');

    // Atualiza o tamanho do mapa
    map.invalidateSize();

    html2canvas(mapElement, {
        useCORS: true,
        logging: true,
        scale: 10, // Reduz um pouco para melhorar performance sem perder qualidade
        letterRendering: true,
        backgroundColor: null,
        width: mapElement.clientWidth,  // Captura o tamanho real do mapa
        height: mapElement.clientHeight, 
        x: 0,
        y: 0
    }).then(canvas => {
        const link = document.createElement('a');
        link.href = canvas.toDataURL("image/png");
        link.download = 'croqui.png';
        link.click();
    }).catch(error => {
        console.error('Erro ao capturar o mapa:', error);
    });
}

function nextStep(step) {
    // Esconder todos os passos
    document.querySelectorAll('.step').forEach(el => el.style.display = 'none');

    // Mostrar o passo atual
    document.getElementById(`step${step}`).style.display = 'block';

    // Atualizar preenchimento da barra de progresso
    let progressPercent = (step - 1) * 50;
    document.getElementById("progress-fill").style.width = `${progressPercent}%`;

    // Atualizar os círculos da barra de progresso
    document.querySelectorAll('.step-circle').forEach(el => el.classList.remove('active'));
    document.getElementById(`circle${step}`).classList.add('active');

    if (step === 1) {
        enableMapDragging();
        disableMarkerInteractions();
        showZoomControls();
        showLocateControl();
        closeControls(); // Fechar controles ao clicar no passo 1
    } else if (step === 2) {
        disableMapDragging();
        enableMarkerInteractions();
        hideZoomControls();
        hideLocateControl();
    } else if (step === 3) {
        disableAllInteractions();
        hideZoomControls();
        hideLocateControl();
        closeControls(); // Fechar controles ao clicar no passo 3
    }
}

function closeControls() {
    if (currentControls) {
        document.getElementById('controls-container').removeChild(currentControls);
        currentControls = null;
    }
}

function disableMapDragging() {
    map.dragging.disable();
    map.touchZoom.disable();
    map.doubleClickZoom.disable();
    map.scrollWheelZoom.disable();
    map.boxZoom.disable();
    map.keyboard.disable();
    if (map.tap) map.tap.disable();
    document.getElementById('map-container').style.pointerEvents = 'auto';
}

function enableMapDragging() {
    map.dragging.enable();
    map.touchZoom.enable();
    map.doubleClickZoom.enable();
    map.scrollWheelZoom.enable();
    map.boxZoom.enable();
    map.keyboard.enable();
    if (map.tap) map.tap.enable();
    document.getElementById('map-container').style.pointerEvents = 'auto';
}

function enableMarkerInteractions() {
    map.eachLayer(function(layer) {
        if (layer instanceof L.Marker) {
            layer.dragging.enable();
            layer.on('click', function() {
                showControls(layer);
            });
        }
    });
}

function disableMarkerInteractions() {
    map.eachLayer(function(layer) {
        if (layer instanceof L.Marker) {
            layer.dragging.disable();
            layer.off('click');
        }
    });
}

function disableAllInteractions() {
    disableMapDragging();
    disableMarkerInteractions();
    document.getElementById('map-container').style.pointerEvents = 'none';
}

function hideZoomControls() {
    if (map.zoomControl) {
        map.removeControl(map.zoomControl);
        map.zoomControl = null; // Certifique-se de que o controle seja removido completamente
    }
}

function showZoomControls() {
    if (!map.zoomControl) {
        map.zoomControl = L.control.zoom({ position: 'topleft' }).addTo(map);
    }
}

function hideLocateControl() {
    const locateControl = document.querySelector('.locate-button');
    if (locateControl) {
        locateControl.style.display = 'none';
    }
}

function showLocateControl() {
    const locateControl = document.querySelector('.locate-button');
    if (locateControl) {
        locateControl.style.display = 'block';
    }
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