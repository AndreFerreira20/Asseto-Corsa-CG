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


    // Textura
    const TEXTURA_LATARIA = "./src/assets/texturas/";

    const texturaLataria = new BABYLON.Texture(TEXTURA_LATARIA + "lataria.jpg", cena);
    texturaLataria.uScale = 1;
    texturaLataria.vScale = 1;

    // A textura e multiplicada pelo diffuseColor vermelho do matCorpo
    matCorpo.diffuseTexture = texturaLataria;

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
    // escolhe o plano conforme pra onde a face aponta.
    const posicoes = Corpo.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    const normais = Corpo.getVerticesData(BABYLON.VertexBuffer.NormalKind);
    const uvs = [];
  
    for (let i = 0; i < posicoes.length; i += 3) {
        const x = posicoes[i];
        const y = posicoes[i + 1];
        const z = posicoes[i + 2];
        const normalX = Math.abs(normais[i]);
        const normalY = Math.abs(normais[i + 1]);
        const normalZ = Math.abs(normais[i + 2]);
  
      if (normalZ >= normalX && normalZ >= normalY) {
          uvs.push(x, y);   // lateral (aponta em Z)
      } else if (normalY >= normalX) {
          uvs.push(x, z);   // teto, capo, para-brisa e fundo (aponta em Y)
      } else {
          uvs.push(z, y);   // frente e traseira (aponta em X)
      }
    }
  
    Corpo.setVerticesData(BABYLON.VertexBuffer.UVKind, uvs);
  

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

// ---------------------------------------------------------------------
// Controle de movimento do carro (teclas W A S D)
// O movimento usa o deltaTime do motor pra ficar independente do FPS, e aplica
// aceleração + atrito, de modo que o carro ganha e perde velocidade suavemente
function habilitarControles(carro, cena, pista, linhasCerca) {
    const { Vector3 } = BABYLON;
    const raiz = carro.raiz;

    // Parametros de dirigibilidade
    const ACELERACAO    = 9.0;   // quao rapido ganha velocidade com W (carro lento)
    const VEL_MAXIMA    = 27.0;   // teto de velocidade pra frente
    const VEL_MAX_RE    = 10.0;   // teto de velocidade de ré
    const ATRITO        = 10.0;   // desaceleracao quando nenhuma tecla de avanço
    const FREIO         = 36.0;   // desaceleracao extra quando pressiona S andando pra frente
    const VEL_ESTERCO   = 2.7;    // rad/s de giro com o volante no máximo
    const VEL_ESTERCO_MIN = 8.0;  // abaixo disso o carro quase nao gira (parado/lento)
    const VEL_ESTERCO_CHEIO = 16.0; // esterço cheio nesta velocidade
    const VEL_ESTERCO_MINIMO = 0.35; // fracao de giro que sobra em alta velocidade
    const VOLANTE_VEL   = 3.2;    // rad/s de quão rápido o volante gira em direção ao máximo
    const VOLANTE_RETORNO = 5.0;  // rad/s de quão rápido o volante volta ao centro quando solto

    // --- Grama e colisao (dependem de onde o carro esta na pista) ---
    const VEL_MAX_GRAMA = 10.0;   // teto de velocidade quando esta na grama
    const DESACEL_GRAMA = 60.0;   // quao rapido a velocidade cai ate o teto da grama
    const MARGEM_CERCA  = 0.5;    // o carro para esta distancia antes da cerca
    const meiaPista = pista ? pista.larguraPista / 2 : 999;
    const pontosPista = pista ? pista.pontosCaminho : null;
    // As duas bordas da cerca (listas de pontos), pra medir distancia ate
    // os SEGMENTOS da cerca, nao so os pontos (senao da pra passar nos vaos).
    const bordasCerca = linhasCerca || null;

    // Menor distancia do ponto (x,z) ate a linha central da pista.
    // Usada pra saber se o carro esta no asfalto ou na grama.
    function distanciaDaPista(x, z) {
        if (!pontosPista) return 0;
        let menor = Infinity;
        for (const p of pontosPista) {
            const d = (p.x - x) ** 2 + (p.z - z) ** 2;
            if (d < menor) menor = d;
        }
        return Math.sqrt(menor);
    }

    // Menor distancia do ponto (x,z) ate a cerca. Mede a distancia a cada
    // SEGMENTO (linha entre dois pontos consecutivos), nao so aos pontos,
    // pra nao haver vaos por onde o carro atravessa.
    function distanciaDaCerca(x, z) {
        if (!bordasCerca) return Infinity;
        let menor = Infinity;
        for (const borda of bordasCerca) {
            for (let i = 0; i < borda.length - 1; i++) {
                const a = borda[i];
                const b = borda[i + 1];
                // projecao do ponto no segmento a->b, limitada a [0,1]
                const abx = b.x - a.x, abz = b.z - a.z;
                const apx = x - a.x, apz = z - a.z;
                const lenAb = abx * abx + abz * abz || 1;
                let t = (apx * abx + apz * abz) / lenAb;
                t = Math.max(0, Math.min(1, t));
                const cx = a.x + abx * t, cz = a.z + abz * t;
                const d = (cx - x) ** 2 + (cz - z) ** 2;
                if (d < menor) menor = d;
            }
        }
        return Math.sqrt(menor);
    }

    const teclas = {};
    window.addEventListener("keydown", (e) => { teclas[e.key.toLowerCase()] = true; });
    window.addEventListener("keyup",   (e) => { teclas[e.key.toLowerCase()] = false; });

    let velocidade = 0;

    // Ângulo do volante, de -1 (esquerda) a +1 (direita)
    let volante = 0;

    cena.onBeforeRenderObservable.add(() => {
        const dt = cena.getEngine().getDeltaTime() / 1000;
        if (dt <= 0) return;

        const frente = teclas["w"];
        const re     = teclas["s"];

        // --- Atualiza a velocidade (aceleração / freio / atrito) ---
        if (frente) {
            velocidade += ACELERACAO * dt;
        } else if (re) {
            // S freia com mais força se ainda estiver indo pra frente,
            // senão acelera em ré
            if (velocidade > 0) {
                velocidade -= FREIO * dt;
            } else {
                velocidade -= ACELERACAO * dt;
            }
        } else {
            // Nenhuma tecla de avanço: atrito puxa a velocidade pra zero
            if (velocidade > 0) {
                velocidade = Math.max(0, velocidade - ATRITO * dt);
            } else if (velocidade < 0) {
                velocidade = Math.min(0, velocidade + ATRITO * dt);
            }
        }

        // Grama: se o carro esta fora do asfalto, a velocidade desce SUAVE
        // ate o teto da grama (nao corta de uma vez).
        const distAtual = distanciaDaPista(raiz.position.x, raiz.position.z);
        const naGrama = distAtual > meiaPista;
        if (naGrama && Math.abs(velocidade) > VEL_MAX_GRAMA) {
            if (velocidade > 0) velocidade = Math.max(VEL_MAX_GRAMA, velocidade - DESACEL_GRAMA * dt);
            else velocidade = Math.min(-VEL_MAX_GRAMA, velocidade + DESACEL_GRAMA * dt);
        }

        // Limita aos tetos de velocidade
        velocidade = Math.max(-VEL_MAX_RE, Math.min(VEL_MAXIMA, velocidade));

        // A/D empurram o volante gradualmente pros lados; sem tecla, ele
        // retorna ao centro. Clamp em [-1, 1]
        const querEsquerda = teclas["a"];
        const querDireita  = teclas["d"];

        if (querEsquerda && !querDireita) {
            volante -= VOLANTE_VEL * dt;
        } else if (querDireita && !querEsquerda) {
            volante += VOLANTE_VEL * dt;
        } else {
            // Retorna ao centro
            if (volante > 0) volante = Math.max(0, volante - VOLANTE_RETORNO * dt);
            else if (volante < 0) volante = Math.min(0, volante + VOLANTE_RETORNO * dt);
        }
        volante = Math.max(-1, Math.min(1, volante));

        // --- Esterço: só gira o carro se estiver em movimento ---
        if (Math.abs(velocidade) > 0.05 && Math.abs(volante) > 0.001) {
            const velAbs = Math.abs(velocidade);

            // Em baixa velocidade o carro gira pouco (sobe de 0 a 1 ate VEL_ESTERCO_MIN).
            const fatorBaixa = Math.min(1, velAbs / VEL_ESTERCO_MIN);

            // Em alta velocidade o carro responde menos ao volante: acima de
            // VEL_ESTERCO_CHEIO, o giro cai ate VEL_ESTERCO_MINIMO na velocidade
            // maxima (fica "pior pra virar" quanto mais rapido).
            let fatorAlta = 1;
            if (velAbs > VEL_ESTERCO_CHEIO) {
                const t = Math.min(1, (velAbs - VEL_ESTERCO_CHEIO) / (VEL_MAXIMA - VEL_ESTERCO_CHEIO));
                fatorAlta = 1 - t * (1 - VEL_ESTERCO_MINIMO);
            }

            const fator = fatorBaixa * fatorAlta;
            // Em ré, inverte o sentido do giro (como num carro real dando ré)
            const sinal = velocidade >= 0 ? 1 : -1;
            raiz.rotation.y += VEL_ESTERCO * volante * fator * sinal * dt;
        }

        const ang = raiz.rotation.y;
        const dirFrente = new Vector3(Math.cos(ang), 0, -Math.sin(ang));
        const passo = dirFrente.scale(velocidade * dt);

        // Colisao: mede a partir da PONTA do carro na direcao do movimento
        // (frente se anda pra frente, traseira se da re), nao do centro.
        // Senao a frente/parabrisa entra na cerca antes do centro chegar.
        const META_CARRO = 1.8; // ~metade do comprimento do carro
        const sentido = velocidade >= 0 ? 1 : -1;
        const pontaX = raiz.position.x + dirFrente.x * META_CARRO * sentido;
        const pontaZ = raiz.position.z + dirFrente.z * META_CARRO * sentido;

        const pontaNovaX = pontaX + passo.x;
        const pontaNovaZ = pontaZ + passo.z;
        const cercaAtual = distanciaDaCerca(pontaX, pontaZ);
        const cercaNova = distanciaDaCerca(pontaNovaX, pontaNovaZ);
        if (cercaNova > MARGEM_CERCA || cercaNova > cercaAtual) {
            raiz.position.addInPlace(passo);
        } else {
            velocidade = 0;
        }
    });
}
