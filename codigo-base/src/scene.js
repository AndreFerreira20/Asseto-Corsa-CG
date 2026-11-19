// scene.js
// Monta a cena (camera, luzes e chao) e coloca o Twingo dentro dela

function criarCena(motor, canvas) {
    const cena = new BABYLON.Scene(motor);
    cena.clearColor = new BABYLON.Color3(0.6, 0.78, 0.92);

    // Uma luz ambiente e uma direcional 
    const luzAmbiente = new BABYLON.HemisphericLight("luzAmbiente", new BABYLON.Vector3(0, 1, 0), cena);
    luzAmbiente.intensity = 0.8;

    const luzSol = new BABYLON.DirectionalLight("luzSol", new BABYLON.Vector3(-1, -2, -1), cena);
    luzSol.intensity = 0.6;

    // -----------------------------------------------------------------
    // Pista de Monza (asfalto + grama). Substitui a reta de teste antiga.
    const pista = criarPistaMonza(cena);

    // Cercas e arquibancadas em volta da pista.
    const cenario = criarCenario(cena, pista);

    const carro = criarTwingo(cena);

    // Posiciona o carro sobre a linha de largada, na posicao e direcao
    // derivadas do tracado (ja alinhadas com a pista).
    carro.raiz.position.x = pista.largada.x;
    carro.raiz.position.z = pista.largada.z;
    carro.raiz.rotation.y = pista.largada.rotacaoY;

    // Liga o controle de movimento do carro (W A S D), com grama e colisao
    habilitarControles(carro, cena, pista, cenario.linhasCerca);

    // -----------------------------------------------------------------
    // Estado dia/noite (cor do ceu + intensidade das luzes do ambiente)
    const DIA = {
        ceu: new BABYLON.Color3(0.6, 0.78, 0.92),  
        ambiente: 0.8,
        solLigado: true,
    };
    const NOITE = {
        ceu: new BABYLON.Color3(0.03, 0.04, 0.1),  
        ambiente: 0.15,                           
        solLigado: false,
    };

    let ehNoite = false;

    function aplicarPeriodo(periodo) {
        cena.clearColor = periodo.ceu;
        luzAmbiente.intensity = periodo.ambiente;
        luzSol.setEnabled(periodo.solLigado);
    }

    // Controle das luzes por tecla
    //   H -> liga/desliga os dois farois do carro
    //   J -> alterna entre dia e noite (ceu + sol + ambiente)
    window.addEventListener("keydown", (evento) => {
        const tecla = evento.key.toLowerCase();

        if (tecla === "h") {
            // Inverte o estado atual dos farois (usa o primeiro como referencia)
            const ligar = !carro.luzesFarois[0].isEnabled();
            for (const farol of carro.luzesFarois) {
                farol.setEnabled(ligar);
            }
        }

        if (tecla === "j") {
            ehNoite = !ehNoite;
            aplicarPeriodo(ehNoite ? NOITE : DIA);
        }
    });


    camera = criarCameras(cena, carro.raiz);
    window.addEventListener("keydown", (evento) => {
        const tecla = evento.key.toLocaleLowerCase();
        if (tecla === "1") cena.activeCamera = camera[0]; // capo
        if (tecla === "2") cena.activeCamera = camera[1]; // 360
        if (tecla === "3") cena.activeCamera = camera[2]; // 3a pessoa
        if (tecla === "v") cena.activeCamera = (cena.activeCamera === camera[0] ? camera[2] : camera[0]); // alterna 1a e 3a
    });

    cena.activeCamera = camera[0]; // 3a pessoa
    // cena.activeCamera = camera[1]; // capo

    return cena;
}
