// ============================================================
// AUTENTICACIÓ - Sistema de login/logout
// Quadern de Camp NLASL - v3
// ============================================================

// Inicialitzar app
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Iniciant aplicació...');
    
    // Comprovar si hi ha sessió activa
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (session) {
        await iniciarSessio(session.user);
    } else {
        mostrarPantallaLogin();
    }
    
    // Escoltar canvis d'autenticació
    supabaseClient.auth.onAuthStateChange(async function(event, session) {
        console.log('Auth event:', event);
        
        if (event === 'SIGNED_IN' && session) {
            await iniciarSessio(session.user);
        } else if (event === 'SIGNED_OUT') {
            mostrarPantallaLogin();
        }
    });
});

// Mostrar pantalla de login
function mostrarPantallaLogin() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app-screen').style.display = 'none';
    document.getElementById('login-error').style.display = 'none';
}

// Mostrar aplicació
function mostrarApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'block';
}

// Iniciar sessió
async function iniciarSessio(user) {
    console.log('✅ Usuari autenticat:', user.email);
    
    currentUser = user;
    
    currentUserProfile = await getUserProfile(user.id);
    
    if (!currentUserProfile) {
        console.error('❌ No s\'ha trobat el perfil de l\'usuari');
        await supabaseClient.auth.signOut();
        mostrarError('Error: Perfil d\'usuari no trobat');
        return;
    }
    
    console.log('✅ Perfil carregat:', currentUserProfile);
    
    mostrarInfoUsuari();
    mostrarApp();
    canviarVista('dashboard');
}

// Tancar sessió
async function tancarSessio() {
    if (confirm('Segur que vols sortir?')) {
        await supabaseClient.auth.signOut();
        currentUser = null;
        currentUserProfile = null;
        mostrarPantallaLogin();
    }
}

// Mostrar info usuari al header
function mostrarInfoUsuari() {
    const userInfo = document.getElementById('user-info');
    if (!userInfo || !currentUserProfile) return;
    
    const badgeClass = {
        'admin': 'badge-admin',
        'editor': 'badge-editor',
        'visor': 'badge-visor'
    }[currentUserProfile.rol] || 'badge-default';
    
    const rolText = {
        'admin': 'Administrador',
        'editor': 'Editor',
        'visor': 'Visor'
    }[currentUserProfile.rol] || 'Usuari';
    
    userInfo.innerHTML = '<span class="user-name">' + currentUserProfile.nom + '</span>' +
        '<span class="user-badge ' + badgeClass + '">' + rolText + '</span>';
}

// Formulari login
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            
            document.getElementById('login-error').style.display = 'none';
            
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = '🔄 Entrant...';
            
            try {
                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password,
                });
                
                if (error) throw error;
                
                console.log('✅ Login correcte');
                
            } catch (error) {
                console.error('❌ Error login:', error);
                mostrarError(error.message || 'Email o contrasenya incorrectes');
                
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }
});

// Mostrar error al formulari login
function mostrarError(message) {
    const errorDiv = document.getElementById('login-error');
    if (!errorDiv) return;
    
    const missatgesCatala = {
        'Invalid login credentials': 'Email o contrasenya incorrectes',
        'Email not confirmed': 'Email no confirmat',
        'User not found': 'Usuari no trobat',
    };
    
    const missatge = missatgesCatala[message] || message;
    
    errorDiv.textContent = '❌ ' + missatge;
    errorDiv.style.display = 'block';
}

console.log('✅ Auth system v3 carregat');
