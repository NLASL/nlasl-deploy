// ============================================================
// AUTENTICACIÓ - SISTEMA PROFESSIONAL
// ============================================================
(async function initAuth() {
    console.log("🚀 Iniciant aplicació...");

    // Esperar que Supabase estigui disponible
    try {
        await waitForSupabase();
    } catch (err) {
        console.error(err.message);
        mostrarError("No es pot connectar al servidor. Torna-ho a intentar.");
        return;
    }

    const supabase = window.supabaseClient;
    if (!supabase) {
        console.error("❌ SupabaseClient no disponible.");
        mostrarError("Error de connexió. Torna-ho a intentar.");
        return;
    }

    // --- NOU BLOC: Comprovar sessió activa (amb debug i gestió d'errors) ---
    try {
        console.log("--- DEBUG AUTH.JS ---");
        console.log("window.supabaseClient:", window.supabaseClient);
        console.log("window.supabaseClient.auth:", window.supabaseClient?.auth);
        console.log("--- FI DEBUG ---");

        if (!window.supabaseClient || !window.supabaseClient.auth) {
            throw new Error("Supabase client no està inicialitzat correctament.");
        }

        const { data: { user } } = await window.supabaseClient.auth.getUser();
        console.log("Usuari obtingut:", user); // Debug

        if (user) {
            await iniciarSessio(user);
        } else {
            mostrarPantallaLogin();
        }
    } catch (err) {
        console.error("Error obtenint usuari:", err);
        mostrarError(err.message || "Error de connexió. Torna-ho a intentar.");
        mostrarPantallaLogin();
    }
    // --- FI NOU BLOC ---

    // ... (resta del teu codi: listener d'autenticació, formulari login, etc.)
})();


    // Comprovar sessió activa
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (user) {
            await iniciarSessio(user);
        } else {
            mostrarPantallaLogin();
        }
    } catch (err) {
        console.error("Error obtenint usuari:", err);
        mostrarError("No es pot verificar la sessió. Torna-ho a intentar.");
        mostrarPantallaLogin();
    }

    // Listener autenticació (evitar duplicats)
    if (supabase.auth.onAuthStateChange.callbacks) {
        supabase.auth.onAuthStateChange.callbacks = [];
    }
    supabase.auth.onAuthStateChange(async (event, session) => {
        console.log("Auth event:", event);
        if (event === "SIGNED_IN" && session) {
            await iniciarSessio(session.user);
        }
        if (event === "SIGNED_OUT") {
            window.currentUser = null;
            window.currentUserProfile = null;
            mostrarPantallaLogin();
        }
    });

    // Formulari login
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("login-email").value.trim();
            const password = document.getElementById("login-password").value;
            const submitBtn = loginForm.querySelector("button[type='submit']");
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = "🔄 Entrant...";

            try {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            } catch (error) {
                console.error("❌ Error login:", error);
                mostrarError(error.message || "Error d'autenticació");
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }
})();

// ============================================================
// ESPERAR SUPABASE (ROBUST)
// ============================================================
function waitForSupabase() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 100; // 5 segons (50ms x 100)
        const interval = setInterval(() => {
            if (window.supabaseClient) {
                clearInterval(interval);
                resolve();
            } else if (attempts++ >= maxAttempts) {
                clearInterval(interval);
                reject(new Error("❌ SupabaseClient no disponible després d'esperar"));
            }
        }, 50);
    });
}

// ============================================================
// LOGIN / LOGOUT
// ============================================================
async function iniciarSessio(user) {
    const supabase = window.supabaseClient;
    console.log("✅ Usuari autenticat:", user.email);
    window.currentUser = user;
    window.currentUserProfile = await getUserProfile(user.id);

    if (!window.currentUserProfile) {
        console.error("❌ Perfil no trobat");
        await supabase.auth.signOut();
        mostrarError("Perfil d'usuari no trobat");
        return;
    }
    mostrarInfoUsuari();
    mostrarApp();
    canviarVista("dashboard");
}

async function tancarSessio() {
    if (!confirm("Segur que vols sortir?")) return;
    const supabase = window.supabaseClient;
    await supabase.auth.signOut();
    window.currentUser = null;
    window.currentUserProfile = null;
    mostrarPantallaLogin();
}

// ============================================================
// UI
// ============================================================
function mostrarPantallaLogin() {
    document.getElementById("login-screen").style.display = "flex";
    document.getElementById("app-screen").style.display = "none";
}

function mostrarApp() {
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("app-screen").style.display = "block";
}

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

// ============================================================
// ERRORS
// ============================================================
function mostrarError(message) {
    const errorDiv = document.getElementById("login-error");
    if (!errorDiv) return;
    errorDiv.textContent = "❌ " + message;
    errorDiv.style.display = "block";
}

console.log("✅ Auth system carregat (professional)");
