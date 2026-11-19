// Checkpoints da volta, feitos com caixas invisiveis (portao) que atravessam
// a pista. O carro tem um sensor invisivel que ao passar pelo portao tem uma
// funcao que observa esse sensor: quando ele entra na caixa, eh chamada
// a funcao aoTocar. Se o portao for o indice "proximo", esse indice avanca em 1
// e dispara o evento "checkpoint". Na linha de chegada, "proximo" volta a 0 e
// dispara o evento "volta".

// A volta so fecha depois de passar por todos os checkpoints, em ordem, e
// cruzar a linha de chegada 


// Calcula as caixas (portoes).
// "qtd" pontos igualmente espacados ao longo do caminho.
// O ultimo portao cai na largada.
function calcularPortoes(pista, qtd) {
    const pontos = pista.pontosCaminho;
    const n = pontos.length;

    // Indice do ponto do caminho mais proximo da largada.
    let idxLargada = pista.indiceLargada;

    const portoes = [];
    for (let k = 1; k <= qtd; k++) {
        const i = (idxLargada + Math.round(k * n / qtd)) % n;
        const a = pontos[i];
        const b = pontos[(i + 1) % n];

        // Direcao da pista neste ponto (normalizada).
        let dirX = b.x - a.x;
        let dirZ = b.z - a.z;

        const c = Math.sqrt(dirX * dirX + dirZ * dirZ) || 1;

        dirX /= c;
        dirZ /= c;

        portoes.push({
            x: a.x,
            z: a.z,
            dirX,
            dirZ,
            angulo: Math.atan2(dirZ, dirX),
        });
    }
    return portoes;
}

// Cria os portoes e o sensor do carro.
// aoEvento(tipo, indice) eh chamado com:
//   "checkpoint" -> passou pelo portao "indice" (0 a qtd-2)
//   "volta"      -> cruzou a chegada com todos os checkpoints feitos
function criarCheckpoints(cena, pista, carro, aoEvento) {
    
    const num_checkpoints = 6;     // contando a linha de chegada (ultimo)
    const largura_portao = 8;        // metros depois da borda da pista (ate a cerca)
    const espessura_portao = 3;
    const altura_portao = 3;
    const mostra_portao = false; // true pra ver os portoes

    // Sensor do carro (adaptado pro twingo)
    const sensor_comprimento = 3.5;
    const sensor_largura = 1.6;
    const sensor_altura = 1;
    const sensor_y = 0.6;

    const portoes = calcularPortoes(pista, num_checkpoints);
    const larguraPortao = pista.larguraPista + largura_portao * 2;

    // Sensor preso ao carro 
    const sensor = BABYLON.MeshBuilder.CreateBox("sensorCarro", {
        width: sensor_comprimento,   // eixo X = frente do carro
        height: sensor_altura,
        depth: sensor_largura,
    }, cena);

    sensor.parent = carro.raiz;
    sensor.position.y = sensor_y;
    sensor.isVisible = false; // mostra o sensor do carro
    sensor.isPickable = false;

    // Estado
    let proximo = 0; // portao que o carro precisa tocar agora

    // Posicao do carro no fim do frame anterior.
    // A checagem de intersecao roda depois do movimento e antes do fim do frame
    // (posicao atual - posAnterior) eh o deslocamento do frame.
    const posAnterior = carro.raiz.position.clone();
    cena.onAfterRenderObservable.add(() => posAnterior.copyFrom(carro.raiz.position));

    function aoTocar(indice) {
        if (indice !== proximo) return; // fora de ordem

        // So vale se o carro esta indo no sentido da pista (nao de re).
        const g = portoes[indice];
        const dx = carro.raiz.position.x - posAnterior.x;
        const dz = carro.raiz.position.z - posAnterior.z;

        if (dx * g.dirX + dz * g.dirZ <= 0) 
            return;

        if (indice === portoes.length - 1) {
            proximo = 0;
            aoEvento("volta", indice);
        } else {
            proximo++;
            aoEvento("checkpoint", indice);
        }
    }

    // Faz o material amarelo do portao
    // usa soh se mostra_portao === true
    let matPortao = null;
    if (mostra_portao) {
        matPortao = new BABYLON.StandardMaterial("matPortao", cena);
        matPortao.diffuseColor = new BABYLON.Color3(1, 0.8, 0);
        matPortao.emissiveColor = new BABYLON.Color3(0.6, 0.45, 0);
        matPortao.alpha = 0.3;
        matPortao.backFaceCulling = false;
    }

    // Portoes 
    const caixas = portoes.map((g, indice) => {

        const caixa = BABYLON.MeshBuilder.CreateBox("portao" + indice, {
            width: espessura_portao,   // eixo X local = sentido da pista
            height: altura_portao,
            depth: larguraPortao,      // eixo Z local = atravessa a pista
        }, cena);

        caixa.position.set(g.x, altura_portao / 2, g.z);

        // Mesma convencao do carro: anda em (cos(ang), 0, -sin(ang)).
        caixa.rotation.y = -g.angulo;
        caixa.isVisible = mostra_portao;
        caixa.isPickable = false;

        if (matPortao) 
            caixa.material = matPortao;

        caixa.actionManager = new BABYLON.ActionManager(cena);

        caixa.actionManager.registerAction(new BABYLON.ExecuteCodeAction({
            trigger: BABYLON.ActionManager.OnIntersectionEnterTrigger,
            parameter: { mesh: sensor, usePreciseIntersection: true },
        }, () => aoTocar(indice)));
        
        return caixa;
    });

    return {
        sensor,
        portoes,
        caixas,
        proximoIndice: () => proximo,
        totalPortoes: portoes.length,
    };
}
