// ============================================================
// AUTENTICACIÓN - SISTEMA PROFESIONAL
// ============================================================

// Función para esperar que Supabase esté disponible en window
function waitForSupabase() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 100; // 5 segundos (50ms x 100)
        const interval = setInterval(() => {
            if (window.supabaseClient) {
                clearInterval(interval);
                resolve();
            } else if (attempts++ >= maxAttempts) {
                clearInterval(interval);
                reject(new Error("❌ SupabaseClient no disponible después de esperar"));
            }
        }, 50);
    });
}

// Función para mostrar pantalla de login
function mostrarPantallaLogin() {
    document.getElementById("login-screen").style.display = "flex";
    document.getElementById("app-screen").style.display = "none";
}

// Función para mostrar la aplicación tras login
function mostrarApp() {
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("app-screen").style.display = "block";
}

// Función para mostrar información del usuario
function mostrarInfoUsuari() {
    const userInfo = document.getElementById("user-info");
    if (!userInfo || !window.currentUserProfile) return;

    const rol = window.currentUserProfile.rol;
    const badgeClass = {
        admin: "badge-admin",
        editor: "badge-editor",
        visor: "badge-visor"
    }[rol] || "badge-default";

    const rolText = {
        admin: "Administrador",
        editor: "Editor",
        visor: "Visor"
    }[rol] || "Usuari";

    userInfo.innerHTML = `
        <span class="user-name">${window.currentUserProfile.nom}</span>
        <span class="user-badge ${badgeClass}">${rolText}</span>
    `;
}

// Función para mostrar errores en login
function mostrarError(message) {
    const errorDiv = document.getElementById("login-error");
    if (!errorDiv) return;
    errorDiv.textContent = "❌ " + message;
    errorDiv.style.display = "block";
}

// Función para iniciar sesión con usuario autenticado
async function iniciarSessio(user) {
    const supabase = window.supabaseClient;
    console.log("✅ Usuario autenticado:", user.email);
    window.currentUser = user;

    // Suponiendo que tienes una función getUserProfile que devuelve perfil del usuario
    window.currentUserProfile = await getUserProfile(user.id);

    if (!window.currentUserProfile) {
        console.error("❌ Perfil no encontrado");
        await supabase.auth.signOut();
        mostrarError("Perfil de usuario no encontrado");
        mostrarPantallaLogin();
        return;
    }

    mostrarInfoUsuari();
    mostrarApp();
    canviarVista("dashboard"); // Asumiendo que tienes esta función para cambiar vista
}

// Función para cerrar sesión
async function tancarSessio() {
    if (!confirm("¿Seguro que quieres salir?")) return;
    const supabase = window.supabaseClient;
    await supabase.auth.signOut();
    window.currentUser = null;
    window.currentUserProfile = null;
    mostrarPantallaLogin();
}

// Función principal de inicialización de autenticación
(async function initAuth() {
    console.log("🚀 Iniciando aplicación...");

    try {
        await waitForSupabase();
    } catch (err) {
        console.error(err.message);
        mostrarError("No se puede conectar al servidor. Inténtalo de nuevo.");
        return;
    }

    const supabase = window.supabaseClient;
    if (!supabase) {
        console.error("❌ SupabaseClient no disponible.");
        mostrarError("Error de conexión. Inténtalo de nuevo.");
        return;
    }

    // Comprobar sesión activa
    try {
        console.log("--- DEBUG AUTH.JS ---");
        console.log("window.supabaseClient:", window.supabaseClient);
        console.log("window.supabaseClient.auth:", window.supabaseClient?.auth);
        console.log("--- FIN DEBUG ---");

        if (!supabase.auth) {
            throw new Error("Supabase client no está inicializado correctamente.");
        }

        // Obtener usuario actual
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;

        if (user) {
            await iniciarSessio(user);
        } else {
            mostrarPantallaLogin();
        }
    } catch (err) {
        console.error("Error obteniendo usuario:", err);
        mostrarError(err.message || "Error de conexión. Inténtalo de nuevo.");
        mostrarPantallaLogin();
    }

    // Listener para cambios de autenticación
    if (supabase.auth.onAuthStateChange.callbacks) {
        supabase.auth.onAuthStateChange.callbacks = [];
    }
    supabase.auth.onAuthStateChange(async (event, session) => {
        console.log("Evento Auth:", event);
        if (event === "SIGNED_IN" && session) {
            await iniciarSessio(session.user);
        }
        if (event === "SIGNED_OUT") {
            window.currentUser = null;
            window.currentUserProfile = null;
            mostrarPantallaLogin();
        }
    });

    // Configurar formulario de login
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("login-email").value.trim();
            const password = document.getElementById("login-password").value;
            const submitBtn = loginForm.querySelector("button[type='submit']");
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = "🔄 Entrando...";

            try {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                // El listener onAuthStateChange se encargará de iniciar sesión
            } catch (error) {
                console.error("❌ Error login:", error);
                mostrarError(error.message || "Error de autenticación");
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }

    console.log("✅ Sistema de autenticación cargado correctamente");
})();
