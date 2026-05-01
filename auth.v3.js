// ============================================================
// AUTH SYSTEM v3 - Amb suport treballadors
// ============================================================
let currentUser = null;
let currentUserProfile = null;
let ignorarProximSignedIn = false;

// Login amb email/password
async function login(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });
        if (error) throw error;
        console.log('? Login correcte');
    } catch (error) {
        console.error('? Error login:', error);
        errorDiv.textContent = 'Email o contrasenya incorrectes';
        errorDiv.style.display = 'block';
    }
}

// Tancar sessi®Æ
async function tancarSessio() {
    try {
        ignorarProximSignedIn = true;
        await supabaseClient.auth.signOut({ scope: 'global' });
        currentUser = null;
        currentUserProfile = null;
        mostrarPantallaLogin();
        mostrarNotificacio('Sessi®Æ tancada', 'success');
    } catch (error) {
        console.error('Error tancant sessi®Æ:', error);
        mostrarNotificacio('Error tancant sessi®Æ', 'error');
    }
}
// Mostrar pantalla de login
function mostrarPantallaLogin() {
    console.log('üìç Executant mostrarPantallaLogin...');
    const loginScreen = document.getElementById('login-screen');
    const appScreen = document.getElementById('app-screen');
    
    console.log('üìç loginScreen exists?', !!loginScreen);
    console.log('üìç appScreen exists?', !!appScreen);
    
    if (loginScreen) loginScreen.style.display = 'flex';
    if (appScreen) appScreen.style.display = 'none';
    
    const errorDiv = document.getElementById('login-error');
    if (errorDiv) errorDiv.style.display = 'none';
}


document.addEventListener('DOMContentLoaded', async function() { 

let ignorarProximSignedIn = false;

// Listener canvis auth
supabaseClient.auth.onAuthStateChange(async (event, session) => {
    console.log('Auth event:', event);
    
    if (event === 'SIGNED_IN' && session) {
        if (ignorarProximSignedIn) {
            ignorarProximSignedIn = false;
            return;
        }
        // Si ja estem dins l'app i ®¶s un refresc de sessi®Æ, ignorar
        if (currentUser && currentUser.id === session.user.id) {
            console.log('?? Refresc de sessi®Æ ignorat');
            return;
        }
        await iniciarSessio(session.user);
    } else if (event === 'SIGNED_OUT') {
        ignorarProximSignedIn = false;
        mostrarPantallaLogin();
    }
});

// Iniciar sessi√≥
async function iniciarSessio(user) {
    try {
        currentUser = user;
        console.log('‚ú?Usuari autenticat:', user.email);
        
        // Carregar perfil
        currentUserProfile = await getUserProfile(user.id);
        
        if (!currentUserProfile) {
            console.error('‚ù?No s\'ha trobat el perfil de l\'usuari');
            await supabaseClient.auth.signOut();
            return;
        }
        
        console.log('‚ú?Perfil carregat:', currentUserProfile);
        
       // Carregar dades necess®§ries
        parcelles = await getParcellas();
        finques = await getFinques();
        treballadors = await getTreballadors();
        fitosanitaris = await getFitosanitaris();
        fertilitzants = await getFertilitzants();
        tractaments = await getTractaments();
        fertilitzacions = await getFertilitzacions();
        controlHorari = await getControlHorari();
        tasques = await getTasques();
        motiusAbsencia = await getMotiusAbsencia();
        incidencies = await getIncidencies();
        absencies = await getAbsencies();
        alertes = await getAlertes();
        
        // Detectar si √©s treballador
        const treballador = treballadors.find(function(t) { 
            return t.auth_user_id === user.id; 
        });
        
        mostrarApp();
        mostrarInfoUsuari();
        
        const role = currentUserProfile ? currentUserProfile.role : 'visor';

		if (treballador && role === 'visor') {
			console.log('üë§ Usuari √©s treballador visor:', treballador.nom);
			ocultarMenuAdmin();
			carregarVistaTreballadorSimple();
} else {
    console.log('?? Usuari Ès admin/editor:', role);
    
    // Esperar a que app_v8.js estÈ completamente cargado
    setTimeout(() => {
        if (typeof carregarDashboard === 'function') {
            carregarDashboard();
        } else {
            console.warn('?? carregarDashboard no disponible');
        }
    }, 1000);
}

activarListeners();

} catch (error) {
    console.error('Error iniciant sessiÛ:', error);
    
    // Esperar a que mostrarNotificacio estÈ disponible
    setTimeout(() => {
        if (typeof mostrarNotificacio === 'function') {
            mostrarNotificacio('Error carregant dades: ' + error.message, 'error');
        } else {
            console.error('mostrarNotificacio no disponible:', error.message);
        }
    }, 500);
}

// Ocultar men√∫ per treballadors
function ocultarMenuAdmin() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(function(btn) {
        const view = btn.getAttribute('data-view');
        if (view !== 'control-horari' && view !== 'inici-treballador') {
            btn.style.display = 'none';
        }
    });

    // Afegir bot√≥ Inici si no existeix
    const nav = document.querySelector('.main-nav');
    if (nav && !document.getElementById('btn-inici-treballador')) {
        const btn = document.createElement('button');
        btn.id = 'btn-inici-treballador';
        btn.className = 'nav-btn active';
        btn.setAttribute('data-view', 'inici-treballador');
        btn.innerHTML = 'üè† Inici';
        btn.onclick = function() {
            document.querySelectorAll('.nav-btn').forEach(function(b) {
                b.classList.remove('active');
            });
            btn.classList.add('active');
            carregarVistaTreballadorSimple();
        };
        nav.insertBefore(btn, nav.firstChild);
    }
}


// Mostrar aplicaci√≥
function mostrarApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'block';
}

// Mostrar info usuari al header
function mostrarInfoUsuari() {
    const userInfo = document.getElementById('user-info');
    if (!userInfo || !currentUserProfile) return;
    
    const badgeClass = {
        'admin': 'badge-admin',
        'editor': 'badge-editor',
        'visor': 'badge-visor'
    }[currentUserProfile.role] || 'badge-default';
    
    const rolText = {
        'admin': 'Administrador',
        'editor': 'Editor',
        'visor': 'Visor'
    }[currentUserProfile.role] || 'Usuari';
    
	userInfo.innerHTML = '<span class="user-name">' + (currentUserProfile.email || 'Usuari') + '</span>' +
    '<span class="user-badge ' + badgeClass + '">' + rolText + '</span>';
}

console.log('?Auth system v3 carregat');