// cameras.js
// Cria as duas câmeras do jogo. As duas usam projecao perspectiva

function criarCameras(cena, carro) {
    const { Vector3, FreeCamera, Camera } = BABYLON;

    // camera 3a pessoa
    const terceiraPessoa = new FreeCamera("3a pessoa", new Vector3(-7, 3, 0), cena);
    terceiraPessoa.parent = carro;           // anda junto com o carro
    terceiraPessoa.rotation.y = Math.PI / 2; // olha para +X (frente do carro)
    terceiraPessoa.rotation.x = 0.25;        // inclina para baixo

    // camera no capo
    const capo = new FreeCamera("Capo", new Vector3(1.25, 1.2, 0), cena);
    capo.parent = carro;
    capo.rotation.y = Math.PI / 2;
    capo.rotation.x = 0.1;

    const cameras = [terceiraPessoa, capo];

    // projecao perspectiva 
    for (const cam of cameras) {
        cam.mode = Camera.PERSPECTIVE_CAMERA; // tipo de projecao
        cam.fov = 0.8;                        // abertura vertical, em radianos (~46°)
        cam.minZ = 0.1;                       // plano near 
        cam.maxZ = 500;                       // plano far
    }

    return cameras;
}
