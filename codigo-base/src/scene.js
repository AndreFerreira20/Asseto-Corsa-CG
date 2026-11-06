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

    // Textura da grama
    const matGramaClara = new BABYLON.StandardMaterial("matGramaClara", cena);
    matGramaClara.diffuseColor = new BABYLON.Color3(0.4, 0.62, 0.32);
    matGramaClara.specularColor = new BABYLON.Color3(0, 0, 0);

    const matGramaEscura = new BABYLON.StandardMaterial("matGramaEscura", cena);
    matGramaEscura.diffuseColor = new BABYLON.Color3(0.3, 0.5, 0.25);
    matGramaEscura.specularColor = new BABYLON.Color3(0, 0, 0);

    for (let i = 0; i < 10; i++) {
        const faixa = BABYLON.MeshBuilder.CreateGround("grama" + i, { width: 10, height: 100 }, cena);
        faixa.position.x = -45 + i * 10;
        faixa.material = i % 2 === 0 ? matGramaClara : matGramaEscura;
    }

    // Faixa de asfalto ao longo do eixo X
    // Tem 0.02 de altura pra nao brigar com o chao (z-fighting).
    const asfalto = BABYLON.MeshBuilder.CreateBox("asfalto", { width: 100, height: 0.02, depth: 7 }, cena);
    asfalto.position.y = 0.01;
    
    const matAsfalto = new BABYLON.StandardMaterial("matAsfalto", cena);
    matAsfalto.diffuseColor = new BABYLON.Color3(0.22, 0.23, 0.25);
    matAsfalto.specularColor = new BABYLON.Color3(0, 0, 0);
    asfalto.material = matAsfalto;

    const carro = criarTwingo(cena);

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
        if (tecla === "1") cena.activeCamera = camera[0]; // 3a pessoa
        if (tecla === "2") cena.activeCamera = camera[1]; // capo
        if (tecla === "v") cena.activeCamera = (cena.activeCamera === camera[0] ? camera[1] : camera[0]); // 3a pessoa
    });

    cena.activeCamera = camera[0]; // 3a pessoa
    // cena.activeCamera = camera[1]; // capo

    return cena;
}
