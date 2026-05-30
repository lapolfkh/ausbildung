// --- FESTE LOGINDATEN ---
const USERS = {
    ausbilder: { user: "AusbildungPolFKH", pass: "PolizeiFKH" },
    kommission: { user: "KommissionPolFKH", pass: "Pruef@ngKomPK34#" }
};

let currentLoginRole = "";

// --- NAVIGATION ---
function showLogin(role) {
    currentLoginRole = role;
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('loginSection').style.display = 'block';
    
    let title = role === 'ausbilder' ? 'Ausbilder Login' : 'Kommission Login';
    document.getElementById('loginTitle').innerText = title;
}

function goBack() {
    document.getElementById('loginSection').style.display = 'none';
    document.querySelectorAll('.portal-content').forEach(el => el.style.display = 'none');
    document.getElementById('mainMenu').style.display = 'flex';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('loginError').style.display = 'none';
}

function doLogin() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const errorMsg = document.getElementById('loginError');

    if (user === USERS[currentLoginRole].user && pass === USERS[currentLoginRole].pass) {
        openPortal(currentLoginRole);
    } else {
        errorMsg.style.display = 'block';
    }
}

function logout() {
    goBack();
}

function openPortal(role) {
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById(`portal-${role}`).style.display = 'block';

    if (role === 'azubi') renderAzubiView();
    if (role === 'kommission') checkCooldown();
}

// --- TERMINVERWALTUNG (Lokal) ---
let schedules = JSON.parse(localStorage.getItem('fkh_schedules')) || [];

function addSchedule() {
    const date = document.getElementById('schedDate').value;
    const time = document.getElementById('schedTime').value;
    const program = document.getElementById('schedProgram').value;

    if(!date || !time) return alert("Bitte Datum und Uhrzeit eintragen!");

    // Deutsches Format
    const dateObj = new Date(date);
    const dateStr = dateObj.toLocaleDateString('de-DE');

    schedules.push({ date: dateStr, time: time, program: program });
    localStorage.setItem('fkh_schedules', JSON.stringify(schedules));
    alert("Termin eingetragen!");
}

// --- PRÜFUNGS-FREISCHALTUNG (Lokal) ---
function unlockExams() {
    const now = Date.now();
    const unlockData = {
        unlockedAt: now,
        cooldownUntil: now + (24 * 60 * 60 * 1000) // + 24 Stunden in Millisekunden
    };
    
    localStorage.setItem('fkh_examStatus', JSON.stringify(unlockData));
    alert("Prüfungen sind jetzt für 5 Minuten freigeschaltet!");
    checkCooldown();
}

function checkCooldown() {
    const btn = document.getElementById('unlockBtn');
    const txt = document.getElementById('cooldownText');
    const status = JSON.parse(localStorage.getItem('fkh_examStatus'));

    if (!status) return;

    if (Date.now() < status.cooldownUntil) {
        btn.style.display = 'none';
        txt.style.display = 'block';
        
        let remainingHours = Math.ceil((status.cooldownUntil - Date.now()) / (1000 * 60 * 60));
        txt.innerText = `Sperrfrist aktiv! Prüfungen können in ca. ${remainingHours} Stunden wieder freigegeben werden.`;
    } else {
        btn.style.display = 'block';
        txt.style.display = 'none';
    }
}

// --- AZUBI ANSICHT LADEN ---
function renderAzubiView() {
    // 1. Termine laden
    const schedContainer = document.getElementById('azubiSchedules');
    if (schedules.length === 0) {
        schedContainer.innerHTML = "<p>Aktuell keine Ausbildungen geplant.</p>";
    } else {
        schedContainer.innerHTML = schedules.map(s => 
            `<p style="background: rgba(255,255,255,0.1); padding: 10px; margin-bottom: 5px; border-radius: 4px;">
                📅 <strong>${s.date}</strong> um <strong>${s.time} Uhr</strong> - ${s.program}
            </p>`
        ).join('');
    }

    // 2. Prüfungen checken (Sind sie freigeschaltet?)
    const examContainer = document.getElementById('azubiExams');
    const status = JSON.parse(localStorage.getItem('fkh_examStatus'));
    
    let isUnlocked = false;
    if (status) {
        const timePassed = Date.now() - status.unlockedAt;
        if (timePassed < (5 * 60 * 1000)) { // Wenn weniger als 5 Min (300.000 ms) vergangen sind
            isUnlocked = true;
        }
    }

    if (isUnlocked) {
        examContainer.innerHTML = `
            <p style="color: #4cd137; font-weight:bold; margin-bottom: 10px;">⚠️ PRÜFUNGEN SIND JETZT GEÖFFNET!</p>
            <a href="https://docs.google.com/forms/d/e/1FAIpQLSevtU3kABQmHy8YjPqyP0sXwH2UV9YruMKOQH3BKu37J_1xuQ/viewform" target="_blank" class="module-link exam">Prüfung Modul 1</a>
            <a href="https://forms.gle/nuzS3cDVn3FucxKW7" target="_blank" class="module-link exam">Prüfung Modul 2</a>
            <a href="https://forms.gle/hfTeo3K8zCjM4UHt7" target="_blank" class="module-link exam">Prüfung Modul 3</a>
        `;
    } else {
        examContainer.innerHTML = `<p style="color: #718093;">Derzeit sind keine Prüfungen freigeschaltet.</p>`;
    }
}
