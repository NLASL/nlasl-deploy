// ============================================================
// VEU v1 - Reconeixement de veu per fitxatge (CORREGIT)
// ============================================================

let reconeixementVeu = null;
let veuActiva = false;

function iniciarVeu(treballadorId) {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        mostrarNotificacio('El teu navegador no suporta reconeixement de veu', 'error');
        return;
    }

    if (veuActiva) {
        aturarVeu();
        return;
    }

    const btn = document.getElementById('btn-veu');
        btn.style.background = '#f44336';
        btn.style.animation = 'pulse 1s infinite';
        btn.textContent = '⏹️';
        veuActiva = true;

	// Afegir animació CSS
    if (!document.getElementById('veu-styles')) {
        const style = document.createElement('style');
        style.id = 'veu-styles';
        style.textContent = '@keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.1)} }';
        document.head.appendChild(style);
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    reconeixementVeu = new SpeechRecognition();
    reconeixementVeu.lang = 'es-ES';
    reconeixementVeu.continuous = false;
    reconeixementVeu.interimResults = false;
    reconeixementVeu.maxAlternatives = 3;

    reconeixementVeu.onresult = async function(event) {
        const text = event.results[0][0].transcript;
        console.log('Veu detectada:', text);
        aturarVeu();
        await interpretarVeu(text, treballadorId);
    };

    reconeixementVeu.onerror = function(event) {
        console.error('Error veu:', event.error);
        aturarVeu();
        if (event.error === 'no-speech') {
            mostrarNotificacio('No s\'ha detectat cap veu', 'warning');
        } else {
            mostrarNotificacio('Error de micròfon: ' + event.error, 'error');
        }
    };

    reconeixementVeu.onend = function() {
        aturarVeu();
    };

    reconeixementVeu.start();
    mostrarNotificacio('🎤 Escoltant...', 'info');
}

function aturarVeu() {
    if (reconeixementVeu) {
        reconeixementVeu.stop();
        reconeixementVeu = null;
    }
    veuActiva = false;
    const btn = document.getElementById('btn-veu');
    if (btn) {
        btn.style.background = '#4caf50';
        btn.style.animation = '';
        btn.textContent = '🎤';
    }
}

async function interpretarVeu(text, treballadorId) {
    mostrarNotificacio('⏳ Interpretant...', 'info');

    const textNorm = text.toLowerCase().trim();

    // Buscar finca amb Fuse.js
    const fuseFinca = new Fuse(finques, {
        threshold: 0.4,
        includeScore: true
    });
    const resultsFinca = fuseFinca.search(textNorm);
    const fincaTrobada = resultsFinca.length > 0 ? resultsFinca[0].item : null;
    const scoreFinca = resultsFinca.length > 0 ? resultsFinca[0].score : 1;

    // Buscar tasca amb Fuse.js
    const fuseTasca = new Fuse(tasques, {
        keys: ['nom'],
        threshold: 0.4,
        includeScore: true
    });
    const resultsTasca = fuseTasca.search(textNorm);
    const tascaTrobada = resultsTasca.length > 0 ? resultsTasca[0].item : null;
    const scoreTasca = resultsTasca.length > 0 ? resultsTasca[0].score : 1;

    // Calcular confiança
    const confiança = (scoreFinca < 0.3 || !fincaTrobada) && (scoreTasca < 0.3 || !tascaTrobada) ? 'BAIXA' : 'ALTA';

    const resultat = {
        finca: fincaTrobada || null,
        tasca: tascaTrobada ? tascaTrobada.nom : null,
        confiança: confiança
    };

    console.log('Text:', text, 'Resultat:', resultat);

    const registreObert = controlHorari.find(function(r) {
        const avui = new Date().toISOString().split('T')[0];
        return r.treballador_id === treballadorId &&
               r.data === avui &&
               r.hora_entrada &&
               !r.hora_sortida;
    });

    mostrarConfirmacioVeu(resultat, text, treballadorId, registreObert);
}





function mostrarConfirmacioVeu(resultat, textOriginal, treballadorId, registreObert) {
    // Eliminar confirmació anterior si existeix
    const anterior = document.getElementById('modal-confirmacio-veu');
    if (anterior) anterior.remove();

    const colorAccio = '#4caf50';
	const iconaAccio = '🟢';
    const confiançaColor = resultat.confiança === 'ALTA' ? '#4caf50' : '#ff9800';

    let html = '<div id="modal-confirmacio-veu" class="modal" style="display:block;">';
    html += '<div class="modal-content" style="max-width:400px;text-align:center;">';
    html += '<h2 style="color:' + colorAccio + ';">' + iconaAccio + ' ' + resultat.accio + '</h2>';
    html += '<p style="color:#999;font-style:italic;">"' + textOriginal + '"</p>';
    
    if (resultat.finca) html += '<p>📍 Finca: <strong>' + resultat.finca + '</strong></p>';
    if (resultat.tasca) html += '<p>🔧 Tasca: <strong>' + resultat.tasca + '</strong></p>';
    
    html += '<p style="font-size:12px;color:' + confiançaColor + ';">Confiança: ' + resultat.confiança + '</p>';
    
    html += '<div style="display:flex;gap:10px;justify-content:center;margin-top:20px;">';
    html += '<button class="btn btn-secondary" onclick="document.getElementById(\'modal-confirmacio-veu\').remove()">❌ Cancel·lar</button>';
    html += '<button class="btn btn-primary" style="background:' + colorAccio + ';" onclick="confirmarAccioVeu(\'ENTRADA\',\'' + (resultat.finca || '') + '\',\'' + (resultat.tasca || '') + '\',\'' + treballadorId + '\',\'' + (registreObert?.id || '') + '\')">✅ Confirmar</button>';
    html += '</div></div></div>';

    document.body.insertAdjacentHTML('beforeend', html);
}

async function confirmarAccioVeu(accio, finca, tasca, treballadorId, registreId) {
    document.getElementById('modal-confirmacio-veu')?.remove();

    try {
        if (accio === 'ENTRADA') {
            await fitxarEntradaTreballador(treballadorId);
        } else {
            await fitxarSortidaTreballador(treballadorId, registreId);
        }
    } catch (error) {
        mostrarNotificacio('Error: ' + error.message, 'error');
    }
}

console.log('✅ Veu v1 carregat');