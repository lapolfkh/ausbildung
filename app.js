// SUPABASE KONFIGURATION
const SUPABASE_URL = "https://faopamglziztknceaqsv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhb3BhbWdseml6dGtuY2VhcXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxNDE3MTQsImV4cCI6MjA5NTcxNzcxNH0.7Da4mEBPW1p3jQ6x_v3IuG2BNVmT7OmORjyM3F-I7x8";

// Verbindung zu Supabase herstellen
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Admin Zugangsdaten
const ADMIN_USER = "PolizeiAdmin";
const ADMIN_PASS = "##AdminPolizeiFKH##";

// LOGIN FUNKTION
function login() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const errorMsg = document.getElementById('loginError');

    if (user === ADMIN_USER && pass === ADMIN_PASS) {
        sessionStorage.setItem('isAdmin', 'true');
        showDashboard();
    } else {
        errorMsg.style.display = 'block';
    }
}

function logout() {
    sessionStorage.removeItem('isAdmin');
    window.location.href = 'index.html';
}

function showDashboard() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'block';
    renderAdminModules();
}

// MODUL ERSTELLEN (In Datenbank speichern)
async function createNewModule() {
    const name = document.getElementById('modName').value;
    const link = document.getElementById('modLink').value;
    const status = document.getElementById('modStatus').value;

    if (!name || !link) {
        alert('Bitte alle Felder ausfüllen!');
        return;
    }

    // Automatisches Datum und Uhrzeit generieren
    const now = new Date();
    const timestamp = now.toLocaleDateString('de-DE') + ' - ' + now.toLocaleTimeString('de-DE', {hour: '2-digit', minute:'2-digit'});

    // Daten in Supabase hochladen
    const { data, error } = await supabase
        .from('modules')
        .insert([{ name: name, link: link, status: status, date: timestamp }]);

    if (error) {
        console.error("Fehler beim Hochladen:", error);
        alert("Fehler beim Speichern in der Datenbank! Überprüfe die RLS-Einstellungen.");
    } else {
        // Felder leeren
        document.getElementById('modName').value = '';
        document.getElementById('modLink').value = '';
        
        renderAdminModules();
        alert('Modul erfolgreich für alle hochgeladen!');
    }
}

// KLASSEN-STYLING FÜR TAGS HOLEN
function getStatusClass(status) {
    if(status === 'In Verwendung') return 'tag-in-verwendung';
    if(status === 'In Bearbeitung') return 'tag-in-bearbeitung';
    return 'tag-außerkraft';
}

// MODULE FÜR USER ANZEIGEN (Aus Datenbank laden + Suche)
async function renderModules(searchQuery = '') {
    const container = document.getElementById('modulesContainer');
    if(!container) return;
    
    container.innerHTML = '<p>Lade Module...</p>';

    // Daten live aus Supabase abrufen
    let { data: dbModules, error } = await supabase
        .from('modules')
        .select('*');

    if (error) {
        console.error("Fehler beim Abrufen der Daten:", error);
        container.innerHTML = '<p>Fehler beim Laden der Module. Bitte RLS in Supabase prüfen!</p>';
        return;
    }

    container.innerHTML = '';

    // Suchfilter anwenden
    const filtered = dbModules.filter(mod => 
        mod.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if(filtered.length === 0) {
        container.innerHTML = '<p>Keine Module gefunden.</p>';
        return;
    }

    filtered.forEach(mod => {
        const card = document.createElement('div');
        card.className = 'module-card';
        card.innerHTML = `
            <h3>${mod.name}</h3>
            <p><strong>Hochgeladen:</strong> ${mod.date}</p>
            <p>Status: <span class="tag ${getStatusClass(mod.status)}">${mod.status}</span></p>
            <a href="${mod.link}" target="_blank" class="module-link">Öffnen (Google Docs/Präsentation)</a>
        `;
        container.appendChild(card);
    });
}

// MODULE FÜR ADMIN ANZEIGEN
async function renderAdminModules() {
    const container = document.getElementById('adminModulesContainer');
    if(!container) return;

    container.innerHTML = '<p>Lade Module...</p>';

    let { data: dbModules, error } = await supabase
        .from('modules')
        .select('*');

    if (error) {
        container.innerHTML = '<p>Fehler beim Laden.</p>';
        return;
    }

    container.innerHTML = '';

    dbModules.forEach(mod => {
        const card = document.createElement('div');
        card.className = 'module-card';
        card.innerHTML = `
            <h3>${mod.name}</h3>
            <p><strong>Datum:</strong> ${mod.date}</p>
            
            <label>Status ändern:</label>
            <select onchange="updateStatus(${mod.id}, this.value)">
                <option value="In Verwendung" ${mod.status === 'In Verwendung' ? 'selected' : ''}>In Verwendung</option>
                <option value="In Bearbeitung" ${mod.status === 'In Bearbeitung' ? 'selected' : ''}>In Bearbeitung</option>
                <option value="Außerkraft gesetzt" ${mod.status === 'Außerkraft gesetzt' ? 'selected' : ''}>Außerkraft gesetzt</option>
            </select>

            <button class="btn-delete" onclick="deleteModule(${mod.id})">Löschen</button>
        `;
        container.appendChild(card);
    });
}

// STATUS LIVE IN DATENBANK ÄNDERN
async function updateStatus(id, newStatus) {
    const { error } = await supabase
        .from('modules')
        .update({ status: newStatus })
        .eq('id', id);

    if (error) {
        alert("Fehler beim Aktualisieren!");
    } else {
        renderAdminModules();
    }
}

// MODUL LÖSCHEN
async function deleteModule(id) {
    if(confirm('Möchtest du dieses Modul wirklich für ALLE löschen?')) {
        const { error } = await supabase
            .from('modules')
            .delete()
            .eq('id', id);

        if (error) {
            alert("Fehler beim Löschen!");
        } else {
            renderAdminModules();
        }
    }
}
