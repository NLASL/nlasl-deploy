// ============================================================
// AUTENTICACI脫 - Sistema de login/logout
// Quadern de Camp NLASL - v3
// ============================================================

// Inicialitzar app
document.addEventListener('DOMContentLoaded', async function() {
    console.log('馃殌 Iniciant aplicaci贸...');
    
    // Comprovar si hi ha sessi贸 activa
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (session) {
        await iniciarSessio(session.user);
    } else {
        mostrarPantallaLogin();
    }
    
    // Escoltar canvis d'autenticaci贸
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

// Mostrar aplicaci贸
function mostrarApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'block';
}

// Iniciar sessi贸
async function iniciarSessio(user) {
    console.log('鉁?Usuari autenticat:', user.email);
    
    currentUser = user;
    
    currentUserProfile = await getUserProfile(user.id);
    
    if (!currentUserProfile) {
        console.error('鉂?No s\'ha trobat el perfil de l\'usuari');
        await supabaseClient.auth.signOut();
        mostrarError('Error: Perfil d\'usuari no trobat');
        return;
    }
    
    console.log('鉁?Perfil carregat:', currentUserProfile);
    
    mostrarInfoUsuari();
    mostrarApp();
    canviarVista('dashboard');
}

// Tancar sessi贸
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
    }[currentUserProfile.role] || 'badge-default';
    
    const rolText = {
        'admin': 'Administrador',
        'editor': 'Editor',
        'visor': 'Visor'
    }[currentUserProfile.role] || 'Usuari';
    
    userInfo.innerHTML = '<span class="user-name">' + (currentUserProfile.email || 'Usuari') + '</span>' +
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
            submitBtn.textContent = '馃攧 Entrant...';
            
            try {
                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password,
                });
                
                if (error) throw error;
                
                console.log('鉁?Login correcte');
                
            } catch (error) {
                console.error('鉂?Error login:', error);
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
    
    errorDiv.textContent = '鉂?' + missatge;
    errorDiv.style.display = 'block';
}

console.log('鉁?Auth system v3 carregat');
