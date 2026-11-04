// scene.js
// Monta a cena (camera, luzes e chao) e coloca o Twingo dentro dela

function criarCena(motor, canvas) {
    const cena = new BABYLON.Scene(motor);
    cena.clearColor = new BABYLON.Color3(0.6, 0.78, 0.92);

    // Câmera orbital em volta do centro do carro
    const camera = new BABYLON.ArcRotateCamera(
        "camera",
        -Math.PI / 2.5,                    // angulo horizontal
        Math.PI / 2.8,                     // angulo vertical
        9,                                 // distancia do alvo
        new BABYLON.Vector3(0, 0.8, 0),
        cena
    );
    camera.attachControl(canvas, true);
    camera.lowerRadiusLimit = 4;
    camera.upperRadiusLimit = 20;

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

    criarTwingo(cena);

    return cena;
}
