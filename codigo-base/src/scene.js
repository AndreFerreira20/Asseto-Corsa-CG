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

    // Caminho base das texturas (relativo ao index.html)
    const PASTA_TEXTURAS = "./src/assets/texturas/";

    // Tamanho em metros que cada repeticao da textura cobre no chao.
    // Como a repeticao e calculada a partir do tamanho real do mesh,
    // a textura fica na mesma escala no comprimento e na largura e
    // nao estica. Valor menor deixa o padrao mais miudo.
    const METROS_POR_REPETICAO_GRAMA = 4;
    const METROS_POR_REPETICAO_ASFALTO = 3;

    const GRAMA_LARGURA = 10;
    const GRAMA_COMPRIMENTO = 100;

    // Textura da grama
    const matGrama = new BABYLON.StandardMaterial("matGrama", cena);
    const texGrama = new BABYLON.Texture(PASTA_TEXTURAS + "grama.jpg", cena);
    texGrama.uScale = GRAMA_LARGURA / METROS_POR_REPETICAO_GRAMA;
    texGrama.vScale = GRAMA_COMPRIMENTO / METROS_POR_REPETICAO_GRAMA;
    matGrama.diffuseTexture = texGrama;
    matGrama.specularColor = new BABYLON.Color3(0, 0, 0);

    for (let i = 0; i < 10; i++) {
        const faixa = BABYLON.MeshBuilder.CreateGround("grama" + i, { width: GRAMA_LARGURA, height: GRAMA_COMPRIMENTO }, cena);
        faixa.position.x = -45 + i * GRAMA_LARGURA;
        faixa.material = matGrama;
    }

    // Faixa de asfalto ao longo do eixo X.
    // Usa uma caixa fina (altura 0.02) pra formar um pequeno degrau
    // acima da grama, como asfalto de verdade. Fica em y = 0.01 pra
    // a face de cima nao brigar com o chao (z-fighting).
    //
    // Textura do asfalto (Poly Haven asphalt_track 1k):
    //   asfalto_polyhaven.jpg         -> cor (diffuse)
    //   asfalto_polyhaven_normal.jpg  -> relevo (normal GL)
    const ARQUIVO_ASFALTO = "asfalto_polyhaven.jpg";
    const ARQUIVO_ASFALTO_NORMAL = "asfalto_polyhaven_normal.jpg";

    const ASFALTO_COMPRIMENTO = 100; // ao longo de X
    const ASFALTO_LARGURA = 7;       // ao longo de Z
    const ASFALTO_ALTURA = 0.02;

    // Quantas vezes a textura repete em cada direcao, proporcional ao
    // tamanho real em metros. Sem isso, a caixa estica a imagem na face
    // de cima porque ela e muito mais comprida (X) do que larga (Z).
    const REP_X = ASFALTO_COMPRIMENTO / METROS_POR_REPETICAO_ASFALTO;
    const REP_Z = ASFALTO_LARGURA / METROS_POR_REPETICAO_ASFALTO;
    const REP_Y = ASFALTO_ALTURA / METROS_POR_REPETICAO_ASFALTO;

    // faceUV define a regiao da textura (Vector4: u1, v1, u2, v2) por face.
    // Ordem das faces no CreateBox: 0 +Z, 1 -Z, 2 +X, 3 -X, 4 +Y (cima), 5 -Y.
    const faceUV = [
        new BABYLON.Vector4(0, 0, REP_X, REP_Y), // +Z lateral comprida
        new BABYLON.Vector4(0, 0, REP_X, REP_Y), // -Z lateral comprida
        new BABYLON.Vector4(0, 0, REP_Z, REP_Y), // +X ponta
        new BABYLON.Vector4(0, 0, REP_Z, REP_Y), // -X ponta
        new BABYLON.Vector4(0, 0, REP_X, REP_Z), // +Y face de cima (a que importa)
        new BABYLON.Vector4(0, 0, REP_X, REP_Z), // -Y face de baixo
    ];

    const asfalto = BABYLON.MeshBuilder.CreateBox("asfalto", {
        width: ASFALTO_COMPRIMENTO,
        height: ASFALTO_ALTURA,
        depth: ASFALTO_LARGURA,
        faceUV: faceUV,
        wrap: true,
    }, cena);
    asfalto.position.y = 0.01;

    const matAsfalto = new BABYLON.StandardMaterial("matAsfalto", cena);
    const texAsfalto = new BABYLON.Texture(PASTA_TEXTURAS + ARQUIVO_ASFALTO, cena);
    matAsfalto.diffuseTexture = texAsfalto;

    // Normal map: da relevo ao asfalto sem adicionar geometria. Usa as
    // mesmas coordenadas UV (faceUV) da cor, entao segue a repeticao.
    const texAsfaltoNormal = new BABYLON.Texture(PASTA_TEXTURAS + ARQUIVO_ASFALTO_NORMAL, cena);
    matAsfalto.bumpTexture = texAsfaltoNormal;

    matAsfalto.specularColor = new BABYLON.Color3(0, 0, 0);
    asfalto.material = matAsfalto;

    const carro = criarTwingo(cena);

    // Liga o controle de movimento do carro (W A S D)
    habilitarControles(carro, cena);

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
