// car.js
// Renault Twingo.
//
// O Corpo eh o perfil lateral desenhado como polígono 2D (plano X/Y)
// e extrudado em Z pra dar a largura. O resto são caixas e cilindros.
//
// Eixos: X = comprimento (frente em +X), Y = altura, Z = largura.

function criarTwingo(cena) {
    const { Vector3, Color3, MeshBuilder, StandardMaterial, TransformNode, Mesh } = BABYLON;

    const raiz = new TransformNode("twingo", cena);

    const LARGURA = 1.6;
    const metadeLargura = LARGURA / 2;

    function criarMaterial(nome, r, g, b) {
        const material = new StandardMaterial(nome, cena);
        material.diffuseColor = new Color3(r, g, b);
        return material;
    }

    // Cria a caixa ja posicionada e pendurada no carro
    function criarCaixa(nome, medidas, x, y, z, material) {
        const caixa = MeshBuilder.CreateBox(nome, medidas, cena);
        caixa.position.set(x, y, z);
        caixa.material = material;
        caixa.parent = raiz;
        return caixa;
    }

    // Materiais
    const matCorpo = criarMaterial("matCorpo", 0.8, 0.12, 0.12);
    const matParachoque = criarMaterial("matParachoque", 0.45, 0.47, 0.5);
    const matVidro = criarMaterial("matVidro", 0.1, 0.7, 0.78);
    const matPneu = criarMaterial("matPneu", 0.07, 0.07, 0.07);
    const matFarol = criarMaterial("matFarol", 0.95, 0.95, 1);

    // ---------------------------------------------------------------------
    // Corpo do carro: perfil lateral, da frente embaixo até a traseira embaixo

    const perfil = [
        new Vector3( 1.68, 0.40, 0),   // 0: frente, embaixo
        new Vector3( 1.72, 1.00, 0),   // 1: topo do capo
        new Vector3( 1.20, 1.08, 0),   // 2: fim do capo (base do para-brisa)
        new Vector3( 0.65, 1.70, 0),   // 3: topo do para-brisa
        new Vector3(-1.70, 1.70, 0),   // 4: fim do teto
        new Vector3(-1.77, 0.40, 0),   // 5: traseira, embaixo
    ];

    // Extrusao indo de um lado pro outro
    const Corpo = MeshBuilder.ExtrudeShape("Corpo", {
        shape: perfil,
        path: [new Vector3(0, 0, -metadeLargura), new Vector3(0, 0, metadeLargura)],
        cap: Mesh.CAP_ALL,
        closeShape: true,
        sideOrientation: Mesh.DOUBLESIDE,
    }, cena);

    Corpo.material = matCorpo;
    Corpo.parent = raiz;
    Corpo.convertToFlatShadedMesh();

    // ---------------------------------------------------------------------
    // Vidros

    // Para-brisa em cima do segmento 2 -> 3 do perfil
    const dx = perfil[3].x - perfil[2].x;
    const dy = perfil[3].y - perfil[2].y;
    const comprimento = Math.sqrt(dx * dx + dy * dy);

    // (dy, -dx) é a normal do segmento apontando pra fora do carro
    const parabrisa = criarCaixa("parabrisa",
        { width: comprimento * 0.85, height: 0.02, depth: LARGURA - 0.2 },
        (perfil[2].x + perfil[3].x) / 2 + (dy / comprimento) * 0.012,
        (perfil[2].y + perfil[3].y) / 2 - (dx / comprimento) * 0.012,
        0, matVidro);

    parabrisa.rotation.z = Math.atan2(dy, dx);

    // Janela lateral eh uma caixa fina em cada lado
    for (const lado of [-1, 1]) {
        criarCaixa("janela" + lado,
            { width: 1.8, height: 0.35, depth: 0.02 },
            -0.4, 1.43, (metadeLargura + 0.01) * lado, matVidro);
    }

    // ---------------------------------------------------------------------
    // Para-choques e farois

    criarCaixa("parachoqueFrente",
        { width: 0.3, height: 0.35, depth: LARGURA + 0.06 },
        1.68, 0.55, 0, matParachoque);

    criarCaixa("parachoqueTras",
        { width: 0.3, height: 0.35, depth: LARGURA + 0.06 },
        -1.68, 0.55, 0, matParachoque);

    // Lampada (mesh) de cada farol
    for (const lado of [-1, 1]) {
        criarCaixa("farol" + lado,
            { width: 0.1, height: 0.22, depth: 0.35 },
            1.7, 0.88, 0.5 * lado, matFarol);
    }

    // Luzes dos farois: um SpotLight (cone de luz) em cada farol, apontando
    // pra frente do carro (+X). Ficam penduradas no "raiz", entao acompanham
    // o carro quando ele se mover/girar no futuro.
    //
    // SpotLight(nome, posicao, direcao, angulo do cone, expoente, cena)
    const luzesFarois = [];
    for (const lado of [-1, 1]) {
        const luzFarol = new BABYLON.SpotLight(
            "luzFarol" + lado,
            new Vector3(1.75, 0.88, 0.5 * lado),   // logo na frente do mesh do farol
            new Vector3(1, -0.15, 0),              // aponta pra frente, levemente pra baixo
            Math.PI / 6,                           // abertura do cone (~30 graus, mais estreito)
            20,                                    // concentracao do feixe (mais centrado)
            cena
        );
        luzFarol.diffuse = new Color3(1, 0.96, 0.8);  // branco-amarelado
        luzFarol.intensity = 6.0;
        luzFarol.range = 50;                          // alcance do feixe
        luzFarol.parent = raiz;                       // acompanha o carro
        luzesFarois.push(luzFarol);
    }

    // ---------------------------------------------------------------------
    // Rodas eh so o pneu, um cilindro deitado em cada canto

    function criarRoda(nome, x, z) {
        const roda = MeshBuilder.CreateCylinder(nome, { diameter: 0.62, height: 0.22 }, cena);

        // Girando o cilindro que eh gerado em pe
        roda.rotation.x = Math.PI / 2;

        // Altura = raio do pneu (0.31) + altura da pista (0.02)
        roda.position.set(x, 0.33, z);
        roda.material = matPneu;
        roda.parent = raiz;
    }

    const zRodas = metadeLargura - 0.02;
    criarRoda("rodaDianteiraEsq",  1.10,  zRodas);
    criarRoda("rodaDianteiraDir",  1.10, -zRodas);
    criarRoda("rodaTraseiraEsq",  -1.15,  zRodas);
    criarRoda("rodaTraseiraDir",  -1.15, -zRodas);

    // Devolve a raiz do carro e as luzes dos farois (pra ligar/desligar depois)
    return { raiz, luzesFarois };
}
