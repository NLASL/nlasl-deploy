// ============================================================
// AUTH SYSTEM v3 - Amb suport treballadors
// ============================================================

let currentUser = null;
let currentUserProfile = null;

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Iniciant aplicació...');
    
    const { data: { session } } = await supabaseClient.auth.getSession();

console.log('📍 Session:', session);  // DEBUG

if (session) {
    console.log('📍 Té sessió, carregant...');
    await iniciarSessio(session.user);
} else {
    console.log('📍 NO té sessió, mostrant login...');
    mostrarPantallaLogin();
}
    
    // Listener canvis auth
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth event:', event);
        
        if (event === 'SIGNED_IN' && session) {
            await iniciarSessio(session.user);
        } else if (event === 'SIGNED_OUT') {
            mostrarPantallaLogin();
        }
    });
});

// Iniciar sessió
async function iniciarSessio(user) {
    try {
        currentUser = user;
        console.log('✅ Usuari autenticat:', user.email);
        
        // Carregar perfil
        currentUserProfile = await getUserProfile(user.id);
        
        if (!currentUserProfile) {
            console.error('❌ No s\'ha trobat el perfil de l\'usuari');
            await supabaseClient.auth.signOut();
            return;
        }
        
        console.log('✅ Perfil carregat:', currentUserProfile);
        
        // Carregar dades necessàries
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
        
        // Detectar si és treballador
        const treballador = treballadors.find(function(t) { 
            return t.auth_user_id === user.id; 
        });
        
        mostrarApp();
        mostrarInfoUsuari();
        
        if (treballador) {
            // És treballador → Vista simple
            console.log('👤 Usuari és treballador:', treballador.nom);
            ocultarMenuAdmin();
            carregarVistaTreballadorSimple();
        } else {
            // És admin/editor → Dashboard complet
            console.log('💼 Usuari és admin/editor');
            carregarDashboard();
        }
        
        activarListeners();
        
    } catch (error) {
        console.error('Error iniciant sessió:', error);
        mostrarNotificacio('Error carregant dades: ' + error.message, 'error');
    }
}

// Ocultar menú per treballadors
function ocultarMenuAdmin() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(function(btn) {
        const view = btn.getAttribute('data-view');
        if (view !== 'control-horari' && view !== 'inici-treballador') {
            btn.style.display = 'none';
        }
    });

    // Afegir botó Inici si no existeix
    const nav = document.querySelector('.main-nav');
    if (nav && !document.getElementById('btn-inici-treballador')) {
        const btn = document.createElement('button');
        btn.id = 'btn-inici-treballador';
        btn.className = 'nav-btn active';
        btn.setAttribute('data-view', 'inici-treballador');
        btn.innerHTML = '🏠 Inici';
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
// Mostrar pantalla de login
function mostrarPantallaLogin() {
    console.log('📍 Executant mostrarPantallaLogin...');
    const loginScreen = document.getElementById('login-screen');
    const appScreen = document.getElementById('app-screen');
    
    console.log('📍 loginScreen exists?', !!loginScreen);
    console.log('📍 appScreen exists?', !!appScreen);
    
    if (loginScreen) loginScreen.style.display = 'flex';
    if (appScreen) appScreen.style.display = 'none';
    
    const errorDiv = document.getElementById('login-error');
    if (errorDiv) errorDiv.style.display = 'none';
}

// Mostrar aplicació
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
        
        console.log('✅ Login correcte');
        
    } catch (error) {
        console.error('❌ Error login:', error);
        errorDiv.textContent = 'Email o contrasenya incorrectes';
        errorDiv.style.display = 'block';
    }
}

// Tancar sessió
async function tancarSessio() {
    try {
        await supabaseClient.auth.signOut();
        currentUser = null;
        currentUserProfile = null;
        mostrarPantallaLogin();
        mostrarNotificacio('Sessió tancada', 'success');
    } catch (error) {
        console.error('Error tancant sessió:', error);
        mostrarNotificacio('Error tancant sessió', 'error');
    }
}

console.log('✅ Auth system v3 carregat');
