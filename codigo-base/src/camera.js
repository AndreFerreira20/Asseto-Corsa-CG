// cameras.js
// Cria as duas câmeras do jogo. As duas usam projecao perspectiva

function criarCameras(cena, carro) {
    const { Vector3, FreeCamera, Camera } = BABYLON;

    // camera 3a pessoa
    const terceiraPessoa = new FreeCamera("3a pessoa", new Vector3(-7, 3.4, 0), cena);
    terceiraPessoa.parent = carro;           // anda junto com o carro
    terceiraPessoa.rotation.y = Math.PI / 2; // olha para +X (frente do carro)
    terceiraPessoa.rotation.x = 0.22;        // inclina para baixo

    // camera no capo
    const capo = new FreeCamera("Capo", new Vector3(1.25, 1.2, 0), cena);
    capo.parent = carro;
    capo.rotation.y = Math.PI / 2;
    capo.rotation.x = 0.1;

    // camera 360
    const alvo360 = new BABYLON.TransformNode("alvo360", cena);
    alvo360.parent = carro;                  // acompanha o carro
    alvo360.position.set(0, 1, 0);           // ponto observado, no meio do carro

    const camera360 = new BABYLON.ArcRotateCamera("360", Math.PI, 1.2, 8, Vector3.Zero(), cena);
    camera360.lockedTarget = alvo360;        // sempre olha para o carro
    camera360.lowerRadiusLimit = 8;
    camera360.upperRadiusLimit = 8;
    camera360.upperBetaLimit = Math.PI / 2 - 0.05; // nao desce abaixo do chao
    camera360.panningSensibility = 0;        // sem mover de lado
    camera360.inputs.removeByType("ArcRotateCameraKeyboardMoveInput"); // teclado nao mexe na camera
    camera360.attachControl(cena.getEngine().getRenderingCanvas(), true);

    const cameras = [capo, camera360, terceiraPessoa];

    // projecao perspectiva 
    for (const cam of cameras) {
        cam.mode = Camera.PERSPECTIVE_CAMERA; // tipo de projecao
        cam.fov = 0.8;                        // abertura vertical, em radianos (~46°)
        cam.minZ = 0.1;                       // plano near 
        cam.maxZ = 500;                       // plano far
    }

    return cameras;
}
