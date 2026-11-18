// pista/monza.js
// Versao simplificada do circuito de Monza.
//
//   - Pontos de controle descrevem o tracado (plano XZ).
//   - Catmull-Rom suaviza os pontos numa curva fechada.
//   - O caminho e reamostrado com espacamento uniforme.
//   - CreateRibbon gera a fita de asfalto; um plano de grama fica por baixo.
//
// Convencoes: 1 unidade = 1 metro, Y para cima, pista no plano XZ.

// Reamostra um caminho com espacamento uniforme: anda pelos segmentos e
// emite um ponto a cada "espacamento" metros. Mantem o caminho fechado.
function reamostrarCaminho(pontos, espacamento) {
    const saida = [];
    let acumulado = 0;
    saida.push(pontos[0].clone());

    for (let i = 0; i < pontos.length; i++) {
        const a = pontos[i];
        const b = pontos[(i + 1) % pontos.length];
        let segX = b.x - a.x;
        let segZ = b.z - a.z;
        let comprimentoSeg = Math.sqrt(segX * segX + segZ * segZ);
        if (comprimentoSeg < 1e-6) continue;

        let restante = comprimentoSeg;
        let origemX = a.x;
        let origemZ = a.z;
        const dirX = segX / comprimentoSeg;
        const dirZ = segZ / comprimentoSeg;

        // Emite um ponto a cada "espacamento" dentro deste segmento.
        while (acumulado + restante >= espacamento) {
            const avanco = espacamento - acumulado;
            origemX += dirX * avanco;
            origemZ += dirZ * avanco;
            saida.push(new BABYLON.Vector3(origemX, 0, origemZ));
            restante -= avanco;
            acumulado = 0;
        }
        acumulado += restante;
    }
    return saida;
}

function criarPistaMonza(cena) {
    // ----- Parametros de ajuste (o grupo calibra por teste) -----
    const LARGURA_PISTA = 11;        // largura do asfalto em metros (~7 carros)
    const ALTURA_ASFALTO = 0.05;     // degrau acima da grama (evita z-fighting)
    const PONTOS_POR_TRECHO = 30;    // suavidade da spline; maior = mais suave
    const REPETICAO_ASFALTO = 6;     // metros cobertos por repeticao da textura

    const GRAMA_LADO = 900;          // lado do plano de grama (quadrado)
    const REPETICAO_GRAMA = 8;       // metros por repeticao da textura de grama

    const PASTA_TEXTURAS = "./src/assets/texturas/";

    // ----- Pontos de controle do tracado (X, Z em metros) -----
    // X cresce para a direita, Z para o topo do mapa. Sentido horario:
    // larga na reta indo para -X, sobe pela esquerda, desce a diagonal
    // ate Ascari, segue a reta longa e fecha pela Parabolica.
    const pontosControle = [
        new BABYLON.Vector3(0, 0, 0),        // largada/chegada (reta principal)
        new BABYLON.Vector3(-130, 0, 0),     // fim da reta
        // Variante del Rettifilo: chicane curta direita-esquerda
        new BABYLON.Vector3(-165, 0, 28),    // curva 1 (sobe)
        new BABYLON.Vector3(-180, 0, 33),    // apice
        new BABYLON.Vector3(-190, 0, 26),    // volta (meio curto)
        new BABYLON.Vector3(-210, 0, 5),     // curva 2 (desce, saida)
        new BABYLON.Vector3(-275, 0, 45),    // curva 3 (vira pra cima)
        new BABYLON.Vector3(-280, 0, 150),   // subida pela esquerda
        // Variante della Roggia: chicane
        new BABYLON.Vector3(-265, 0, 200),   // curva 4
        new BABYLON.Vector3(-295, 0, 220),   // curva 5
        new BABYLON.Vector3(-285, 0, 265),   // saida da Roggia
        new BABYLON.Vector3(-265, 0, 315),   // curva 6 (topo esquerdo)
        new BABYLON.Vector3(-175, 0, 335),   // curva 7 (ponto mais alto)
        new BABYLON.Vector3(-60, 0, 150),    // longa diagonal 7->8 descendo
        // Ascari: "S" esquerda-direita-esquerda
        new BABYLON.Vector3(-20, 0, 90),     // curva 8 (entrada)
        new BABYLON.Vector3(20, 0, 115),     // curva 9 (meio)
        new BABYLON.Vector3(60, 0, 75),      // curva 10 (saida)
        new BABYLON.Vector3(250, 0, 70),     // reta longa ate a Parabolica
        new BABYLON.Vector3(330, 0, 55),     // curva 11 (entrada da Parabolica)
        new BABYLON.Vector3(360, 0, 10),     // apice da Parabolica (U a direita)
        new BABYLON.Vector3(330, 0, -20),    // saida da Parabolica
        new BABYLON.Vector3(150, 0, -5),     // volta para a reta principal
    ];

    // Os pontos ja estao na ordem de percurso.

    // ----- Curva suave e fechada -----
    const caminho = BABYLON.Curve3.CreateCatmullRomSpline(
        pontosControle,
        PONTOS_POR_TRECHO,
        true // curva fechada
    );
    const pontosBrutos = caminho.getPoints();

    // Reamostra com espacamento uniforme. O Catmull-Rom gera o mesmo numero
    // de pontos por trecho, entao trechos longos ficam com pontos esparsos
    // (ate ~8m) e a pista vira facetas retas grandes ali. Reamostrar deixa
    // tudo na mesma densidade e a pista lisa.
    const ESPACAMENTO = 2.5; // metros entre pontos
    const pontosCaminho = reamostrarCaminho(pontosBrutos, ESPACAMENTO);

    // ----- Asfalto: fita plana -----
    // Em cada ponto, desloca meia largura pra cada lado (perpendicular a
    // tangente). em curva apertada (raio < meia largura) a borda interna 
    // inverteria e abriria buracos; entao limitamos o avanco dela. 
    // A pista so estreita um pouco no apice, sem buraco.
    const meiaLargura = LARGURA_PISTA / 2;
    const bordaEsquerda = [];
    const bordaDireita = [];

    for (let i = 0; i < pontosCaminho.length; i++) {
        const anterior = pontosCaminho[(i - 1 + pontosCaminho.length) % pontosCaminho.length];
        const atual = pontosCaminho[i];
        const proximo = pontosCaminho[(i + 1) % pontosCaminho.length];

        // Tangente normalizada (direcao de avanco) no plano XZ.
        let dirX = proximo.x - atual.x;
        let dirZ = proximo.z - atual.z;
        const comprimento = Math.sqrt(dirX * dirX + dirZ * dirZ) || 1;
        dirX /= comprimento;
        dirZ /= comprimento;

        const perpX = -dirZ;
        const perpZ = dirX;

        // Tangente do segmento anterior, pra medir o raio da curva.
        let d1X = atual.x - anterior.x;
        let d1Z = atual.z - anterior.z;
        const l1 = Math.sqrt(d1X * d1X + d1Z * d1Z) || 1;
        d1X /= l1;
        d1Z /= l1;

        // Raio local aproximado (angulo entre as tangentes).
        const dot = Math.max(-1, Math.min(1, d1X * dirX + d1Z * dirZ));
        const angulo = Math.acos(dot);
        const raioLocal = angulo > 1e-4 ? (comprimento / angulo) : Infinity;

        // Para que lado a curva vira (produto vetorial 2D).
        const cross = d1X * dirZ - d1Z * dirX;

        // Borda interna; a externa fica na meia largura.
        const offsetInterno = raioLocal < meiaLargura
            ? Math.max(1.5, raioLocal * 0.9)
            : meiaLargura;

        const offsetEsq = cross > 0 ? offsetInterno : meiaLargura;
        const offsetDir = cross > 0 ? meiaLargura : offsetInterno;

        bordaEsquerda.push(new BABYLON.Vector3(
            atual.x + perpX * offsetEsq,
            0,
            atual.z + perpZ * offsetEsq
        ));
        bordaDireita.push(new BABYLON.Vector3(
            atual.x - perpX * offsetDir,
            0,
            atual.z - perpZ * offsetDir
        ));
    }

    // Fecha o loop repetindo a primeira borda no fim (liga os mesmos
    // vertices, sem o vao que o closePath do ribbon abria).
    bordaEsquerda.push(bordaEsquerda[0].clone());
    bordaDireita.push(bordaDireita[0].clone());

    const asfalto = BABYLON.MeshBuilder.CreateRibbon("asfaltoMonza", {
        pathArray: [bordaEsquerda, bordaDireita],
        closePath: false, // fechado manualmente acima
        sideOrientation: BABYLON.Mesh.DOUBLESIDE,
    }, cena);
    asfalto.position.y = ALTURA_ASFALTO;

    const matAsfalto = new BABYLON.StandardMaterial("matAsfaltoMonza", cena);
    const texAsfalto = new BABYLON.Texture(PASTA_TEXTURAS + "asfalto_polyhaven.jpg", cena);
    // Escala a repeticao pela largura e pelo numero de pontos (nao estica).
    texAsfalto.uScale = LARGURA_PISTA / REPETICAO_ASFALTO;
    texAsfalto.vScale = pontosCaminho.length / REPETICAO_ASFALTO;
    matAsfalto.diffuseTexture = texAsfalto;
    matAsfalto.specularColor = new BABYLON.Color3(0, 0, 0);
    asfalto.material = matAsfalto;

    // ----- Grama: plano grande por baixo -----
    const grama = BABYLON.MeshBuilder.CreateGround("gramaMonza", {
        width: GRAMA_LADO,
        height: GRAMA_LADO,
    }, cena);
    grama.position.y = 0;

    const matGrama = new BABYLON.StandardMaterial("matGramaMonza", cena);
    const texGrama = new BABYLON.Texture(PASTA_TEXTURAS + "grama.jpg", cena);
    texGrama.uScale = GRAMA_LADO / REPETICAO_GRAMA;
    texGrama.vScale = GRAMA_LADO / REPETICAO_GRAMA;
    matGrama.diffuseTexture = texGrama;
    matGrama.specularColor = new BABYLON.Color3(0, 0, 0);
    grama.material = matGrama;

    // ----- Linha de largada/chegada -----
    // Acha o ponto real do caminho mais proximo de X alvo (a reta tem um
    // leve desvio em Z), pra a linha ficar colada e alinhada com a pista.
    const LARGADA_X_ALVO = 30;
    let idxLargada = 0;
    let menorDist = Infinity;
    for (let i = 0; i < pontosCaminho.length; i++) {
        const p = pontosCaminho[i];
        // so a reta principal (Z pequeno), nao a reta de cima
        if (Math.abs(p.z) < 20) {
            const d = Math.abs(p.x - LARGADA_X_ALVO);
            if (d < menorDist) { menorDist = d; idxLargada = i; }
        }
    }
    const pLargada = pontosCaminho[idxLargada];
    const pSeg = pontosCaminho[(idxLargada + 1) % pontosCaminho.length];

    // Direcao da pista no ponto de largada, pra girar a linha.
    const tanX = pSeg.x - pLargada.x;
    const tanZ = pSeg.z - pLargada.z;
    const anguloPista = Math.atan2(tanZ, tanX);

    const linhaLargada = BABYLON.MeshBuilder.CreateGround("linhaLargada", {
        width: 1.5,                 // espessura da faixa (no sentido de avanco)
        height: LARGURA_PISTA + 1,  // cobre toda a largura da pista
    }, cena);
    linhaLargada.position.x = pLargada.x;
    linhaLargada.position.z = pLargada.z;
    linhaLargada.position.y = ALTURA_ASFALTO + 0.01; // logo acima do asfalto
    linhaLargada.rotation.y = anguloPista;           // alinha com a pista

    const matLinha = new BABYLON.StandardMaterial("matLinhaLargada", cena);
    matLinha.diffuseColor = new BABYLON.Color3(1, 1, 1);
    matLinha.specularColor = new BABYLON.Color3(0, 0, 0);
    matLinha.emissiveColor = new BABYLON.Color3(0.3, 0.3, 0.3); // visivel a noite
    linhaLargada.material = matLinha;

    // Referencias uteis pra posicionar o carro, detectar grama ou por grades.
    return {
        asfalto,
        grama,
        linhaLargada,
        pontosCaminho,
        pontosControle,
        larguraPista: LARGURA_PISTA,
        largada: {
            x: pLargada.x,
            z: pLargada.z,
            // o carro anda em (cos, -sin); -anguloPista aponta no sentido da pista
            rotacaoY: -anguloPista,
        },
    };
}
