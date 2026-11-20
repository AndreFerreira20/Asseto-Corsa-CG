// Sistema que controla o cronometro.
// O cronometro vai contar ateh o jogador passar da
// linha de chegada, dai entao contabiliza o tempo da volta.
// No canto superior esquerdo mostra a atual melhor volta

// Formata o tempo para ficar apresentavel
function formatarTempo(ms) {
    const min = Math.floor(ms / 60000);
    const seg = Math.floor(ms / 1000) % 60;
    const mil = Math.floor(ms % 1000);

    return String(min).padStart(2, "0") + ":" + String(seg).padStart(2, "0") + "." + String(mil).padStart(3, "0");
}
  
function criarCronometro(cena) {
    const elTempo = document.getElementById("hudTempo");
    const elMelhor = document.getElementById("hudMelhor");

    let inicio = performance.now();
    let melhor = null; // so em memoria, sem localStorage

    cena.onBeforeRenderObservable.add(() => {
        elTempo.textContent = formatarTempo(performance.now() - inicio);
    });

    // Chamar quando o evento "volta" chegar de criarCheckpoints.
    function fecharVolta() {
        const tempo = performance.now() - inicio;

        if (melhor === null || tempo < melhor) {
            melhor = tempo;
            elMelhor.textContent = formatarTempo(melhor);
        }
        
        inicio = performance.now();
    }

    return { fecharVolta };
}