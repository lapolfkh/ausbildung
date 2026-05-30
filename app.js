/* eslint-env browser, es6 */
/* eslint-disable no-unused-vars */
"use strict";

// --- FESTE LOGINDATEN ---
const USERS = {
    ausbilder: { user: "AusbildungPolFKH", pass: "PolizeiFKH" },
    kommission: { user: "KommissionPolFKH", pass: "Pruef@ngKomPK34#" }
};

let currentLoginRole = "";

document.addEventListener('DOMContentLoaded', () => {
    const passInput = document.getElementById('password');
    passInput.addEventListener('paste', (e) => {
        if(currentLoginRole === 'kommission') {
            e.preventDefault();
            alert("Sicherheitshinweis: Einfügen von Passwörtern im Kommissions-Login ist nicht erlaubt!");
        }
    });

    checkLoginLockout();
    prefillDates(); // Setzt Datum automatisch auf Morgen
});

// Automatische Datumshilfe (Morgen vor-ausfüllen, damit Jahr direkt da ist)
function prefillDates() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    
    if(document.getElementById('schedDate_ausbilder')) document.getElementById('schedDate_ausbilder').value = dateStr;
    if(document.getElementById('schedDate_kommission')) document.getElementById('schedDate_kommission').value = dateStr;
}

function checkLoginLockout() {
    const lockoutStatus = JSON.parse(localStorage.getItem('fkh_loginLockout'));
    if(!lockoutStatus) return;

    if (Date.now() < lockoutStatus.lockedUntil) {
        if(currentLoginRole === 'kommission' && document.getElementById('loginSection').style.display === 'block') {
            document.getElementById('loginSection').style.display = 'none';
            alert(`Sicherheitshinweis: Dieser Login ist für 5 Minuten gesperrt. Bitte warte ${Math.ceil((lockoutStatus.lockedUntil - Date.now()) / (1000 * 60))} Minute(n).`);
            goBack();
        }
    } else {
        localStorage.removeItem('fkh_loginLockout');
    }
}

function showLogin(role) {
    currentLoginRole = role;
    if(role === 'kommission' && JSON.parse(localStorage.getItem('fkh_loginLockout'))) {
        checkLoginLockout();
    }
    if(role === 'kommission' && JSON.parse(localStorage.getItem('fkh_loginLockout'))) {
        return;
    }

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
    const lockoutMsg = document.getElementById('lockoutText');

    if (user === USERS[currentLoginRole].user && pass === USERS[currentLoginRole].pass) {
        errorMsg.style.display = 'none';
        lockoutMsg.style.display = 'none';
        openPortal(currentLoginRole);
    } else {
        if(currentLoginRole === 'kommission') {
            document.getElementById('portalBody').classList.add('blink-red');
            errorMsg.style.display = 'block';
            lockoutMsg.style.display = 'block';

            setTimeout(() => {
                document.getElementById('portalBody').classList.remove('blink-red');
                const now = Date.now();
                const lockoutData = { lockedAt: now, lockedUntil: now + (5 * 60 * 1000) };
                localStorage.setItem('fkh_loginLockout', JSON.stringify(lockoutData));
                alert("Sicherheitszugriff gesperrt für 5 Minuten aufgrund falscher Logindaten!");
                goBack();
            }, 500); 
        } else {
            errorMsg.style.display = 'block';
        }
    }
}

function logout() {
    goBack();
}

function openPortal(role) {
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById(`portal-${role}`).style.display = 'block';

    prefillDates(); // Erneut setzen für saubere Maske

    if (role === 'azubi') renderAzubiView();
    if (role === 'ausbilder' || role === 'kommission') renderManagementSchedules(role);
    if (role === 'kommission') checkCooldown();
}

// --- TERMINVERWALTUNG MIT VALIDIERUNG & LÖSCHFUNKTION ---
let schedules = JSON.parse(localStorage.getItem('fkh_schedules')) || [];

function addSchedule(role) {
    const date = document.getElementById(`schedDate_${role}`).value;
    const time = document.getElementById(`schedTime_${role}`).value;
    const program = document.getElementById(`schedProgram_${role}`).value;

    if(!date || !time) return alert("Bitte Datum und Uhrzeit eintragen!");

    // --- ZUKUNFTS-CHECK (VALIDIERUNG) ---
    const inputDateTime = new Date(`${date}T${time}`);
    const currentDateTime = new Date();

    if (inputDateTime <= currentDateTime) {
        alert("❌ DATUM UNGÜLTIG! Der Termin muss in der Zukunft liegen!");
        return;
    }

    const dateObj = new Date(date);
    const dateStr = dateObj.toLocaleDateString('de-DE');

    // Termin mit ID und Ersteller-Stempel sichern
    schedules.push({
        id: Date.now(),
        date: dateStr,
        time: time,
        program: program,
        createdBy: role
    });

    localStorage.setItem('fkh_schedules', JSON.stringify(schedules));
    alert("Termin erfolgreich eingetragen!");
    renderManagementSchedules(role);
}

// Termine in den Admin-Bereichen auflisten (mit intelligenten Löschknöpfen)
function renderManagementSchedules(role) {
    const container = document.getElementById(`${role}SchedulesContainer`);
    if(!container) return;

    if(schedules.length === 0) {
        container.innerHTML = "<p style='color:#718093;'>Aktuell keine Termine eingetragen.</p>";
        return;
    }

    let html = "";
    schedules.forEach(s => {
        // Berechtigungsprüfung fürs Löschen
        // Kommission darf ALLES löschen, Ausbilder NUR von 'ausbilder'
        const kannLoeschen = (role === 'kommission' || (role === 'ausbilder' && s.createdBy === 'ausbilder'));
        
        html += `<div class="schedule-item">
            <div>
                📅 <strong>${s.date}</strong> um <strong>${s.time} Uhr</strong><br>
                <small style="color:#00a8ff;">${s.program}</small> <span style="font-size:0.8em; color:#718093;">(Erstellt durch: ${s.createdBy === 'kommission' ? 'Kommission' : 'Ausbilder'})</span>
            </div>
            ${kannLoeschen ? `<button class="btn-delete-item" onclick="deleteSchedule(${s.id}, '${role}')">Löschen</button>` : `<span style="font-size:0.8em; color:#9e2a2b;">Keine Rechte</span>`}
        </div>`;
    });

    container.innerHTML = html;
}

function deleteSchedule(id, role) {
    if(confirm("Möchtest du diesen Termin wirklich unwiderruflich löschen?")) {
        schedules = schedules.filter(s => s.id !== id);
        localStorage.setItem('fkh_schedules', JSON.stringify(schedules));
        renderManagementSchedules(role);
    }
}

// --- PRÜFUNGS-FREISCHALTUNG ---
function unlockSelectedExams() {
    const exam1Checked = document.getElementById('checkExam1').checked;
    const exam2Checked = document.getElementById('checkExam2').checked;
    const exam3Checked = document.getElementById('checkExam3').checked;

    if(!exam1Checked && !exam2Checked && !exam3Checked) return alert("Sicherheitshinweis: Bitte wähle mindestens eine Prüfung zum Freischalten!");

    const now = Date.now();
    const unlockData = {
        unlockedAt: now,
        exam1Unlocked: exam1Checked,
        exam2Unlocked: exam2Checked,
        exam3Unlocked: exam3Checked,
        cooldownUntil: now + (24 * 60 * 60 * 1000)
    };
    
    localStorage.setItem('fkh_examStatus', JSON.stringify(unlockData));
    alert("Ausgewählte Prüfungen sind jetzt für 5 Minuten freigeschaltet!");
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
        txt.innerText = `Sperrfrist aktiv! Nächste Freigabe erst in ca. ${remainingHours} Stunden möglich.`;
    } else {
        btn.style.display = 'block';
        txt.style.display = 'none';
    }
}

// --- AZUBI ANSICHT LADEN ---
function renderAzubiView() {
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

    const examContainer = document.getElementById('azubiExams');
    const status = JSON.parse(localStorage.getItem('fkh_examStatus'));
    
    let isUnlocked = false;
    let unlockedExamsHTML = '';

    if (status) {
        const timePassed = Date.now() - status.unlockedAt;
        if (timePassed < (5 * 60 * 1000)) {
            isUnlocked = true;
            if(status.exam1Unlocked) unlockedExamsHTML += `<a href="https://docs.google.com/forms/d/e/1FAIpQLSevtU3kABQmHy8YjPqyP0sXwH2UV9YruMKOQH3BKu37J_1xuQ/viewform" target="_blank" class="module-link exam">Prüfung Modul 1</a>`;
            if(status.exam2Unlocked) unlockedExamsHTML += `<a href="https://forms.gle/nuzS3cDVn3FucxKW7" target="_blank" class="module-link exam">Prüfung Modul 2</a>`;
            if(status.exam3Unlocked) unlockedExamsHTML += `<a href="https://forms.gle/hfTeo3K8zCjM4UHt7" target="_blank" class="module-link exam">Prüfung Modul 3</a>`;
        }
    }

    if (isUnlocked && unlockedExamsHTML) {
        examContainer.innerHTML = `
            <p style="color: #4cd137; font-weight:bold; margin-bottom: 10px;">⚠️ PRÜFUNGEN SIND JETZT GEÖFFNET!</p>
            ${unlockedExamsHTML}
        `;
    } else if (isUnlocked && !unlockedExamsHTML) {
        examContainer.innerHTML = `<p style="color: #ffb703;">Keine Prüfungen freigeschaltet.</p>`;
    } else {
        examContainer.innerHTML = `<p style="color: #718093;">Derzeit sind keine Prüfungen freigeschaltet.</p>`;
    }
}
