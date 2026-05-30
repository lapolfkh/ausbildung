// Admin Zugangsdaten
const ADMIN_USER = "PolizeiAdmin";
const ADMIN_PASS = "##AdminPolizeiFKH##";

// Holt die Module aus dem LocalStorage oder erstellt ein leeres Array
let modules = JSON.parse(localStorage.getItem('fkh_modules')) || [];

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

// MODUL ERSTELLEN
function createNewModule() {
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

    const newModule = {
        id: Date.now(), // Eindeutige ID
        name: name,
        link: link,
        status: status,
        date: timestamp
    };

    modules.push(newModule);
    saveToStorage();
    
    // Felder leeren
    document.getElementById('modName').value = '';
    document.getElementById('modLink').value = '';
    
    renderAdminModules();
    alert('Modul erfolgreich hochgeladen!');
}

// SPEICHERN
function saveToStorage() {
    localStorage.setItem('fkh_modules', JSON.stringify(modules));
}

// KLASSEN-STYLING FÜR TAGS HOLEN
function getStatusClass(status) {
    if(status === 'In Verwendung') return 'tag-in-verwendung';
    if(status === 'In Bearbeitung') return 'tag-in-bearbeitung';
    return 'tag-außerkraft';
}

// MODULE FÜR USER ANZEIGEN (inkl. Suche)
function renderModules(searchQuery = '') {
    const container = document.getElementById('modulesContainer');
    if(!container) return;
    
    container.innerHTML = '';

    const filtered = modules.filter(mod => 
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

// MODULE FÜR ADMIN ANZEIGEN (Mit Live-Statusänderung & Löschen)
function renderAdminModules() {
    const container = document.getElementById('adminModulesContainer');
    if(!container) return;

    container.innerHTML = '';

    modules.forEach(mod => {
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

// STATUS LIVE ÄNDERN
function updateStatus(id, newStatus) {
    modules = modules.map(mod => {
        if(mod.id === id) {
            mod.status = newStatus;
        }
        return mod;
    });
    saveToStorage();
    renderAdminModules();
}

// MODUL LÖSCHEN
function deleteModule(id) {
    if(confirm('Möchtest du dieses Modul wirklich löschen?')) {
        modules = modules.filter(mod => mod.id !== id);
        saveToStorage();
        renderAdminModules();
    }
}
