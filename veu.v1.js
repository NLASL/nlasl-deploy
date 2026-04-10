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
    if (btn) {
        btn.style.background = '#f44336';
        btn.style.animation = 'pulse 1s infinite';
        btn.textContent = '⏹️';
    }
    veuActiva = true;

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
    reconeixementVeu.maxAlternatives = 1;

    reconeixementVeu.onresult = async function(event) {
        const text = event.results[0][0].transcript;
        console.log('Veu detectada:', text);
        aturarVeu();
        await interpretarVeu(text, treballadorId);
    };

    reconeixementVeu.onerror = function(event) {
        console.error('Error veu:', event.error);
        aturarVeu();
        mostrarNotificacio('Error de micròfon: ' + event.error, 'error');
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

    const avui = new Date().toISOString().split('T')[0];
    const registreObert = controlHorari.find(r => 
        r.treballador_id === treballadorId && r.data === avui && r.hora_entrada && !r.hora_sortida
    );

    const accioSugerida = registreObert ? 'SORTIDA' : 'ENTRADA';

    const systemPrompt = `Ets un assistent de fitxatge per a treballadors del camp a Catalunya.
La teva missió és extreure la FINCA i la TASCA d'un text de veu.

FINQUES DISPONIBLES:
${finques.join(', ')}

TASQUES DISPONIBLES:
${tasques.map(t => t.nom).join(', ')}

REGLES ESTRICTES:
1. Si el text no esmenta cap finca de la llista, posa "finca": null.
2. Si el text no esmenta cap tasca de la llista, posa "tasca": null.
3. El nom de la finca i la tasca han de ser EXACTAMENT com apareixen a les llistes de dalt.
4. L'acció serà ${accioSugerida} a menys que el text digui clarament el contrari.
5. Respon ÚNICAMENT amb un objecte JSON, sense cap text addicional.

EXEMPLE DE RESPOSTA:
{"accio": "ENTRADA", "finca": "Nom de la Finca", "tasca": "Nom de la Tasca", "confiança": "ALTA"}`;
   
   try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-api-key': 'LA_TEVA_KEY_AQUÍ', // Recorda posar la teva Key
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 500,
                system: systemPrompt,
                messages: [{ role: 'user', content: text }]
            })
        });

        const data = await response.json();
        const resultat = JSON.parse(data.content[0].text);
        mostrarConfirmacioVeu(resultat, text, treballadorId, registreObert);

    } catch (error) {
        console.error('Error API:', error);
        mostrarConfirmacioVeu({ accio: accioSugerida, finca: null, tasca: null, confiança: 'BAIXA' }, text, treballadorId, registreObert);
    }
}

// Les funcions mostrarConfirmacioVeu i confirmarAccioVeu es mantenen igual que les tenies

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