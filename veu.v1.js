// ============================================================
// VEU v1 - Reconeixement de veu per fitxatge
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

    // Determinar si té entrada oberta
    const avui = new Date().toISOString().split('T')[0];
    const registreObert = controlHorari.find(function(r) {
        return r.treballador_id === treballadorId &&
               r.data === avui &&
               r.hora_entrada &&
               !r.hora_sortida;
    });

    const context = registreObert 
        ? 'El treballador té una entrada oberta des de les ' + registreObert.hora_entrada + '. Acció per defecte si no s\'entén: SORTIDA.'
        : 'El treballador no té entrada oberta. Acció per defecte si no s\'entén: ENTRADA.';

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 500,
                system: `Ets un assistent de fitxatge agrícola català. El treballador vol fitxar ENTRADA. Analitza el text i extreu finca i tasca.

			FINQUES DISPONIBLES (busca coincidència parcial amb el que diu):
			${finques.map((f, i) => i+1 + '. ' + f).join('\n')}
	
			TASQUES DISPONIBLES:
			${tasques.map((t, i) => i+1 + '. ' + t.nom).join('\n')}

			FORMAT RESPOSTA (NOMÉS JSON, res més):
{
			"finca": "nom exacte de la finca de la llista o null",
			"tasca": "nom exacte de la tasca de la llista o null",
			"confiança": "ALTA" o "BAIXA"
}

Context: ${context}
Finques disponibles: ${finques.join(', ')}
Tasques disponibles: ${tasques.map(t => t.nom).join(', ')}`,
                messages: [{ role: 'user', content: text }]
            })
        });

        const data = await response.json();
        const textResposta = data.content[0].text;
        const resultat = JSON.parse(textResposta);

        mostrarConfirmacioVeu(resultat, text, treballadorId, registreObert);

    } catch (error) {
        console.error('Error interpretació:', error);
        // Acció per defecte
        const accioDefecte = registreObert ? 'SORTIDA' : 'ENTRADA';
        mostrarConfirmacioVeu({ accio: accioDefecte, finca: null, tasca: null, confiança: 'BAIXA' }, text, treballadorId, registreObert);
    }
}

function mostrarConfirmacioVeu(resultat, textOriginal, treballadorId, registreObert) {
    // Eliminar confirmació anterior si existeix
    const anterior = document.getElementById('modal-confirmacio-veu');
    if (anterior) anterior.remove();

    const colorAccio = resultat.accio === 'ENTRADA' ? '#4caf50' : '#f44336';
    const iconaAccio = resultat.accio === 'ENTRADA' ? '🟢' : '🔴';
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
    html += '<button class="btn btn-primary" style="background:' + colorAccio + ';" onclick="confirmarAccioVeu(\'' + resultat.accio + '\',\'' + (resultat.finca || '') + '\',\'' + (resultat.tasca || '') + '\',\'' + treballadorId + '\',\'' + (registreObert?.id || '') + '\')">✅ Confirmar</button>';
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