// ============================================================
// AUTENTICACIÓ - SISTEMA PROFESSIONAL
// ============================================================

(async function initAuth() {

    console.log("🚀 Iniciant aplicació...");

    // Esperar que Supabase estigui disponible
    await waitForSupabase();

    const supabase = window.supabaseClient;

    if (!supabase) {
        console.error("❌ SupabaseClient no disponible.");
        return;
    }

    // Comprovar sessió activa
    try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
            await iniciarSessio(session.user);
        } else {
            mostrarPantallaLogin();
        }
    } catch (err) {
        console.error("Error obtenint sessió:", err);
        mostrarPantallaLogin();
    }

    // Listener autenticació
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
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });

                if (error) throw error;

            } catch (error) {
                console.error("❌ Error login:", error);
                mostrarError(error.message || "Error d'autenticació");
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
    return new Promise((resolve) => {
        if (window.supabaseClient) return resolve();

        const interval = setInterval(() => {
            if (window.supabaseClient) {
                clearInterval(interval);
                resolve();
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
