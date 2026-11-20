// pista/cenario.js
// Cenario em volta da pista:
//   - Cercas: tela (textura com transparencia) sobre uma mureta de concreto,
//     seguindo as duas bordas da pista, afastadas pra sobrar grama.
//   - Arquibancada: modelo .obj posicionado perto da largada.

function criarCenario(cena, pista) {
    const PASTA_TEXTURAS = "./src/assets/texturas/";
    const PASTA_MODELOS = "./src/assets/modelos/";

    // ----- Parametros de ajuste -----
    const FOLGA        = 8;    // metros de grama entre a borda da pista e a cerca
    const MURETA_ALTURA = 0.8; // altura da base de concreto
    const TELA_ALTURA  = 2.4;  // altura da tela acima da mureta
    const REPETICAO_TELA = 3;  // metros por repeticao da textura da tela

    // Arquibancada (modelo .obj)
    const ARQ_ARQUIVO  = "Free+Grandstand.obj";
    const ARQ_ESCALA   = 0.0025;
    const ARQ_FOLGA    = 20;
    // Giro extra pra a arquibancada olhar PRA pista (perpendicular a ela).
    const ARQ_GIRO_EXTRA = Math.PI / 2;
    // Pontos onde colocar arquibancadas. Cada item tem o X alvo e de que
    // lado da pista (z: usa a reta principal Z~0 ou a reta oposta Z~70).
    const ARQ_POSICOES = [
        { x: 60,  reta: "principal" },
        { x: 10,  reta: "principal" },
        { x: -40, reta: "principal" },
        { x: 60,  reta: "oposta" },
        { x: 120, reta: "oposta" },
        { x: 180, reta: "oposta" },
    ];

    const pontos = pista.pontosCaminho;
    const meiaLargura = pista.larguraPista / 2;
    const distCerca = meiaLargura + FOLGA;

    function perpendicular(i) {
        const atual = pontos[i];
        const proximo = pontos[(i + 1) % pontos.length];
        let dx = proximo.x - atual.x;
        let dz = proximo.z - atual.z;
        const c = Math.sqrt(dx * dx + dz * dz) || 1;
        dx /= c; dz /= c;
        return { perpX: -dz, perpZ: dx, dirX: dx, dirZ: dz };
    }

    // Monta a linha de base de um dos lados (deslocada distCerca da central).
    // lado = +1 (esquerda) ou -1 (direita).
    // Em curva fechada (raio < distancia pedida), a borda interna inverteria 
    // e a cerca bugaria; entao limitamos o quanto ela avanca pra dentro, 
    // nunca passando do centro de curvatura.
    function linhaBorda(lado) {
        const linha = [];
        const n = pontos.length;
        for (let i = 0; i < n; i++) {
            const anterior = pontos[(i - 1 + n) % n];
            const atual = pontos[i];
            const proximo = pontos[(i + 1) % n];

            // Tangente atual e anterior (normalizadas).
            let dx = proximo.x - atual.x, dz = proximo.z - atual.z;
            const c = Math.sqrt(dx * dx + dz * dz) || 1; dx /= c; dz /= c;
            let d1x = atual.x - anterior.x, d1z = atual.z - anterior.z;
            const l1 = Math.sqrt(d1x * d1x + d1z * d1z) || 1; d1x /= l1; d1z /= l1;

            const perpX = -dz, perpZ = dx;

            // Raio local e lado da curva.
            const dot = Math.max(-1, Math.min(1, d1x * dx + d1z * dz));
            const raio = Math.acos(dot) > 1e-4 ? c / Math.acos(dot) : Infinity;
            const cross = d1x * dz - d1z * dx; // sinal da curva

            // Este lado da cerca e o interno da curva?
            // lado=+1 fica em +perp; a curva vira pra +perp quando cross<0.
            const esteLadoInterno = (lado === 1) ? (cross < 0) : (cross > 0);
            let offset = distCerca;
            if (esteLadoInterno && raio < distCerca) {
                offset = Math.max(2, raio * 0.9);
            }

            linha.push(new BABYLON.Vector3(
                atual.x + lado * perpX * offset,
                0,
                atual.z + lado * perpZ * offset
            ));
        }
        // Suaviza a linha pra tirar as dobras que
        // ainda sobram em curva fechada. Sem isso a cerca
        // auto-cruza.
        const suave = suavizarLinha(linha, 6, 4);

        // A suavizacao corta cantos e pode puxar a cerca pra perto 
        // da pista em curva fechada. Garante a folga minima: empurra
        // pra fora qualquer ponto que ficou perto demais da linha central.
        const folgaMinima = meiaLargura + FOLGA * 0.85;
        for (const p of suave) {
            // ponto da linha central mais proximo e a distancia ate ele
            let maisProx = pontos[0];
            let menor = Infinity;
            for (const c of pontos) {
                const d = (c.x - p.x) ** 2 + (c.z - p.z) ** 2;
                if (d < menor) { menor = d; maisProx = c; }
            }
            const dist = Math.sqrt(menor);
            if (dist < folgaMinima && dist > 1e-3) {
                // direcao do centro pra fora, empurra ate a folga minima
                const fx = (p.x - maisProx.x) / dist;
                const fz = (p.z - maisProx.z) / dist;
                p.x = maisProx.x + fx * folgaMinima;
                p.z = maisProx.z + fz * folgaMinima;
            }
        }
        suave.push(suave[0].clone()); // fecha o loop
        return suave;
    }

    // Media movel circular: cada ponto vira a media dos vizinhos numa janela.
    // Repete "passadas" vezes. Arredonda cantos e remove auto-interseccoes.
    function suavizarLinha(linha, passadas, janela) {
        let atual = linha.map(p => p.clone());
        const m = atual.length;
        for (let p = 0; p < passadas; p++) {
            const novo = [];
            for (let i = 0; i < m; i++) {
                let sx = 0, sz = 0, c = 0;
                for (let k = -janela; k <= janela; k++) {
                    const j = ((i + k) % m + m) % m;
                    sx += atual[j].x; sz += atual[j].z; c++;
                }
                novo.push(new BABYLON.Vector3(sx / c, 0, sz / c));
            }
            atual = novo;
        }
        return atual;
    }

    // Material da tela: textura da trama + opacidade separada (ve atraves).
    // O PNG da cor nao tem alpha; a opacidade vem de cerca_opacity.png, lida
    // como tons de cinza (getAlphaFromRGB), branco = arame, preto = furo.
    const matTela = new BABYLON.StandardMaterial("matTela", cena);
    const texTela = new BABYLON.Texture(PASTA_TEXTURAS + "cerca.png", cena);
    const texTelaOp = new BABYLON.Texture(PASTA_TEXTURAS + "cerca_opacity.png", cena);
    matTela.diffuseTexture = texTela;
    matTela.opacityTexture = texTelaOp;
    texTelaOp.getAlphaFromRGB = true; // le o brilho (p&b) como transparencia
    matTela.specularColor = new BABYLON.Color3(0, 0, 0);
    matTela.backFaceCulling = false; // visivel dos dois lados
    // uScale e vScale sao definidos por parede (dependem do comprimento).

    // Material da mureta: textura de concreto.
    const matMureta = new BABYLON.StandardMaterial("matMureta", cena);
    const texMureta = new BABYLON.Texture(PASTA_TEXTURAS + "concreto.jpg", cena);
    matMureta.diffuseTexture = texMureta;
    matMureta.specularColor = new BABYLON.Color3(0, 0, 0);
    matMureta.backFaceCulling = false;

    // Constroi uma "parede" vertical (ribbon) entre yBaixo e yAlto ao longo
    // da linha dada. Retorna o mesh.
    function construirParede(nome, linha, yBaixo, yAlto, material) {
        const baixo = linha.map(p => new BABYLON.Vector3(p.x, yBaixo, p.z));
        const alto = linha.map(p => new BABYLON.Vector3(p.x, yAlto, p.z));
        const parede = BABYLON.MeshBuilder.CreateRibbon(nome, {
            pathArray: [baixo, alto],
            sideOrientation: BABYLON.Mesh.DOUBLESIDE,
        }, cena);
        parede.material = material;
        return parede;
    }

    // Comprimento total de uma borda, pra escalar a textura sem esticar.
    function comprimentoLinha(linha) {
        let total = 0;
        for (let i = 0; i < linha.length - 1; i++) {
            total += Math.sqrt(
                (linha[i + 1].x - linha[i].x) ** 2 +
                (linha[i + 1].z - linha[i].z) ** 2
            );
        }
        return total;
    }

    // Cria mureta + tela nos dois lados. Guarda as linhas das bordas da
    // cerca pra a colisao do carro medir a distancia real ate elas.
    const linhasCerca = [];
    for (const lado of [1, -1]) {
        const linha = linhaBorda(lado);
        linhasCerca.push(linha);
        const nomeLado = lado === 1 ? "Esq" : "Dir";
        construirParede("muretaCerca" + nomeLado, linha, 0, MURETA_ALTURA, matMureta);
        construirParede("telaCerca" + nomeLado, linha, MURETA_ALTURA, MURETA_ALTURA + TELA_ALTURA, matTela);
    }

    // Escala a textura da tela pelo comprimento real (horizontal) e pela
    // altura (vertical), pra a trama ficar quadrada e nao esticada.
    const comp = comprimentoLinha(linhaBorda(1));
    texTela.uScale = comp / REPETICAO_TELA;
    texTela.vScale = TELA_ALTURA / REPETICAO_TELA;
    texTelaOp.uScale = texTela.uScale;
    texTelaOp.vScale = texTela.vScale;

    // Mesma logica pro concreto da mureta (repeticao a cada 2m).
    const REPETICAO_MURETA = 2;
    texMureta.uScale = comp / REPETICAO_MURETA;
    texMureta.vScale = MURETA_ALTURA / REPETICAO_MURETA;

    // ----- Arquibancadas (modelo .obj) -----
    // Carrega o modelo uma vez (molde escondido) e clona em varias posicoes,
    // na reta principal e na reta oposta, cada uma virada de frente pra pista.
    BABYLON.SceneLoader.ImportMesh("", PASTA_MODELOS, ARQ_ARQUIVO, cena, (meshes) => {
        const base = BABYLON.Mesh.MergeMeshes(
            meshes.filter(m => m instanceof BABYLON.Mesh),
            true, true, undefined, false, true
        );
        if (!base) return;

        const mat = new BABYLON.StandardMaterial("matArquibancada", cena);
        mat.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.72);
        mat.specularColor = new BABYLON.Color3(0, 0, 0);
        base.material = mat;
        base.scaling = new BABYLON.Vector3(ARQ_ESCALA, ARQ_ESCALA, ARQ_ESCALA);
        base.isVisible = false; // molde

        // Acha o indice do ponto da pista mais proximo de (x, reta).
        function acharIndice(xAlvo, reta) {
            // reta principal: Z perto de 0; reta oposta: Z perto de 70.
            const zRef = reta === "oposta" ? 70 : 0;
            let idx = 0, menor = Infinity;
            for (let i = 0; i < pontos.length; i++) {
                if (Math.abs(pontos[i].z - zRef) < 25) {
                    const d = Math.abs(pontos[i].x - xAlvo);
                    if (d < menor) { menor = d; idx = i; }
                }
            }
            return idx;
        }

        // Dado um ponto e a perpendicular, decide qual lado (+1/-1) e o de
        // FORA da pista: o que, deslocado, fica mais longe de qualquer outro
        // ponto da pista. Assim a arquibancada nunca fica entre duas retas.
        function ladoDeFora(p, perpX, perpZ) {
            const teste = 40; // distancia de teste
            function minDistPista(x, z) {
                let m = Infinity;
                for (const c of pontos) {
                    const d = (c.x - x) ** 2 + (c.z - z) ** 2;
                    if (d < m) m = d;
                }
                return m;
            }
            const dMais = minDistPista(p.x + perpX * teste, p.z + perpZ * teste);
            const dMenos = minDistPista(p.x - perpX * teste, p.z - perpZ * teste);
            return dMais >= dMenos ? 1 : -1;
        }

        let n = 0;
        for (const pos of ARQ_POSICOES) {
            const idx = acharIndice(pos.x, pos.reta);
            const p = pontos[idx];
            const { perpX, perpZ, dirX, dirZ } = perpendicular(idx);
            const anguloPista = Math.atan2(dirZ, dirX);
            const dist = meiaLargura + ARQ_FOLGA;

            const lado = ladoDeFora(p, perpX, perpZ);

            const arq = base.clone("arquibancada" + n++);
            arq.isVisible = true;
            arq.position = new BABYLON.Vector3(
                p.x + lado * perpX * dist,
                0,
                p.z + lado * perpZ * dist
            );
            // Vira de frente pra pista (perpendicular a direcao da pista).
            arq.rotation.y = -anguloPista + ARQ_GIRO_EXTRA * lado;
        }
    });

    // Retorna as linhas das duas bordas da cerca (pontos reais), pra a
    // colisao do carro medir a distancia ate a cerca onde ela de fato esta.
    return { linhasCerca };
}
