// ============================================================
// AUTENTICACIÓ - Sistema de login/logout
// ============================================================

// Comprovar que Supabase està carregat
if (!window.supabase) {
    console.error("❌ ERROR: Supabase no està carregat correctament.");
}

// ============================================================
// INICIALITZAR APP
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Iniciant aplicació...');

    // Comprovar sessió activa
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        await iniciarSessio(session.user);
    } else {
        mostrarPantallaLogin();
    }

    // Escoltar canvis d'autenticació
    supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth event:', event);

        if (event === 'SIGNED_IN' && session) {
            await iniciarSessio(session.user);
        } else if (event === 'SIGNED_OUT') {
            mostrarPantallaLogin();
        }
    });

    // Registrar formulari login
    const loginForm = document.getElementById('login-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            const remember = document.getElementById('login-remember').checked;

            document.getElementById('login-error').style.display = 'none';

            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = '🔄 Entrant...';

            try {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });

                if (error) throw error;

                console.log('✅ Login correcte');

            } catch (error) {
                console.error('❌ Error login:', error);

                mostrarError(
                    error.message ||
                    error.error_description ||
                    'Email o contrasenya incorrectes'
                );

                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }
});

// ============================================================
// FUNCIONS LOGIN/LOGOUT
// ============================================================

function mostrarPantallaLogin() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app-screen').style.display = 'none';
    document.getElementById('login-error').style.display = 'none';
}

function mostrarApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'block';
}

async function iniciarSessio(user) {
    console.log('✅ Usuari autenticat:', user.email);

    currentUser = user;

    currentUserProfile = await getUserProfile(user.id);

    if (!currentUserProfile) {
        console.error('❌ Perfil no trobat');
        await supabase.auth.signOut();
        mostrarError('Error: Perfil d\'usuari no trobat');
        return;
    }

    console.log('✅ Perfil carregat:', currentUserProfile);

    mostrarInfoUsuari();
    mostrarApp();
    canviarVista('dashboard');
}

async function tancarSessio() {
    if (confirm('Segur que vols sortir?')) {
        await supabase.auth.signOut();
        currentUser = null;
        currentUserProfile = null;
        mostrarPantallaLogin();
    }
}

function mostrarInfoUsuari() {
    const userInfo = document.getElementById('user-info');
    if (!userInfo || !currentUserProfile) return;

    const badgeClass = {
        admin: 'badge-admin',
        editor: 'badge-editor',
        visor: 'badge-visor'
    }[currentUserProfile.rol] || 'badge-default';

    const rolText = {
        admin: 'Administrador',
        editor: 'Editor',
        visor: 'Visor'
    }[currentUserProfile.rol] || 'Usuari';

    userInfo.innerHTML = `
        <span class="user-name">${currentUserProfile.nom}</span>
        <span class="user-badge ${badgeClass}">${rolText}</span>
    `;
}

// ============================================================
// ERRORS LOGIN
// ============================================================

function mostrarError(message) {
    const errorDiv = document.getElementById('login-error');
    if (!errorDiv) return;

    const missatgesCatala = {
        'Invalid login credentials': 'Email o contrasenya incorrectes',
        'Email not confirmed': 'Email no confirmat',
        'User not found': 'Usuari no trobat'
    };

    const missatge = missatgesCatala[message] || message;

    errorDiv.textContent = '❌ ' + missatge;
    errorDiv.style.display = 'block';
}

// ============================================================
// CANVIAR PASSWORD (opcional)
// ============================================================

async function canviarPassword(nouPassword) {
    const { data, error } = await supabase.auth.updateUser({
        password: nouPassword
    });

    if (error) {
        console.error('Error canviant password:', error);
        return false;
    }

    console.log('✅ Password actualitzat');
    return true;
}

console.log('✅ Auth system carregat');
