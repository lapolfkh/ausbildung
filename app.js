/* eslint-env browser, es6 */
/* eslint-disable no-unused-vars */
"use strict";

// --- LIVE-SPEICHER (SUPABASE) KONFIGURATION ---
// Ersetze diese beiden Texte mit deinen echten Zugangsdaten aus Supabase!
const SUPABASE_URL = "DEINE_SUPABASE_PROJEKT_URL_HIER";
const SUPABASE_ANON_KEY = "DEIN_SUPABASE_ANON_KEY_HIER";
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- FESTE LOGINDATEN ---
const USERS = {
    ausbilder: { user: "AusbildungPolFKH", pass: "PolizeiFKH" },
    kommission: { user: "KommissionPolFKH", pass: "Pruef@ngKomPK34#" }
};

let currentLoginRole = "";
let schedules = [];
let examStatus = null;

document.addEventListener('DOMContentLoaded', () => {
    const passInput = document.getElementById('password');
    if (passInput) {
        passInput.addEventListener('paste', (e) => {
            if(currentLoginRole === 'kommission') {
                e.preventDefault();
                alert("Sicherheitshinweis: Einfügen von Passwörtern im Kommissions-Login ist nicht erlaubt!");
            }
        });
    }

    checkLoginLockout();
    prefillDates(); 
});

// Live-Daten aus der Datenbank abrufen
async function fetchLiveSchedules() {
    const { data, error } = await _supabase.from('schedules').select('*').order('id', { ascending: true });
    if (error) console.error("Fehler beim Laden der Termine:", error.message);
    else schedules = data || [];
}

async function fetchLiveExamStatus() {
    const { data, error } = await _supabase.from('exam_status').select('*').eq('id', 1).maybeSingle();
    if (error) console.error("Fehler beim Laden des Prüfungsstatus:", error.message);
    else examStatus = data || null;
}

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

async function openPortal(role) {
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById(`portal-${role}`).style.display = 'block';

    prefillDates();

    // WICHTIG: Vor dem Anzeigen immer die frischesten Live-Daten holen!
    await fetchLiveSchedules();
    await fetchLiveExamStatus();

    if (role === 'azubi') renderAzubiView();
    if (role === 'ausbilder' || role === 'kommission') renderManagementSchedules(role);
    if (role === 'kommission') checkCooldown();
}

// --- TERMINVERWALTUNG IM LIVE-SPEICHER ---
async function addSchedule(role) {
    const date = document.getElementById(`schedDate_${role}`).value;
    const time = document.getElementById(`schedTime_${role}`).value;
    const program = document.getElementById(`schedProgram_${role}`).value;

    if(!date || !time) return alert("Bitte Datum und Uhrzeit eintragen!");

    const inputDateTime = new Date(`${date}T${time}`);
    const currentDateTime = new Date();

    if (inputDateTime <= currentDateTime) {
        alert("❌ DATUM UNGÜLTIG! Der Termin muss in der Zukunft liegen!");
        return;
    }

    const dateObj = new Date(date);
    const dateStr = dateObj.toLocaleDateString('de-DE');

    // Live-In Supabase eintragen
    const { error } = await _supabase.from('schedules').insert([{
        date: dateStr,
        time: time,
        program: program,
        created_by: role
    }]);

    if (error) {
        alert("Fehler beim Speichern: " + error.message);
        return;
    }

    alert("Termin erfolgreich eingetragen!");
    await fetchLiveSchedules();
    renderManagementSchedules(role);
}

function renderManagementSchedules(role) {
    const container = document.getElementById(`${role}SchedulesContainer`);
    if(!container) return;

    if(schedules.length === 0) {
        container.innerHTML = "<p style='color:#718093;'>Aktuell keine Termine eingetragen.</p>";
        return;
    }

    let html = "";
    schedules.forEach(s => {
        const kannLoeschen = (role === 'kommission' || (role === 'ausbilder' && s.created_by === 'ausbilder'));
        
        html += `<div class="schedule-item">
            <div>
                📅 <strong>${s.date}</strong> um <strong>${s.time} Uhr</strong><br>
                <small style="color:#00a8ff;">${s.program}</small> <span style="font-size:0.8em; color:#718093;">(Erstellt durch: ${s.created_by === 'kommission' ? 'Kommission' : 'Ausbilder'})</span>
            </div>
            ${kannLoeschen ? `<button class="btn-delete-item" onclick="deleteSchedule(${s.id}, '${role}')">Löschen</button>` : `<span style="font-size:0.8em; color:#9e2a2b;">Keine Rechte</span>`}
        </div>`;
    });

    container.innerHTML = html;
}

async function deleteSchedule(id, role) {
    if(confirm("Möchtest du diesen Termin wirklich unwiderruflich aus der Datenbank löschen?")) {
        const { error } = await _supabase.from('schedules').delete().eq('id', id);
        if (error) {
            alert("Fehler beim Löschen: " + error.message);
            return;
        }
        await fetchLiveSchedules();
        renderManagementSchedules(role);
    }
}

// --- LIVE PRÜFUNGS-FREISCHALTUNG ---
async function unlockSelectedExams() {
    const exam1Checked = document.getElementById('checkExam1').checked;
    const exam2Checked = document.getElementById('checkExam2').checked;
    const exam3Checked = document.getElementById('checkExam3').checked;

    if(!exam1Checked && !exam2Checked && !exam3Checked) return alert("Sicherheitshinweis: Bitte wähle mindestens eine Prüfung zum Freischalten!");

    const now = Date.now();
    const cooldownUntil = now + (24 * 60 * 60 * 1000);

    // Zustand global für alle in die DB überschreiben (ID 1 fixiert)
    const { error } = await _supabase.from('exam_status').upsert([{
        id: 1,
        unlocked_at: now,
        exam1_unlocked: exam1Checked,
        exam2_unlocked: exam2Checked,
        exam3_unlocked: exam3Checked,
        cooldown_until: cooldownUntil
    }]);

    if (error) {
        alert("Fehler bei Live-Freischaltung: " + error.message);
        return;
    }

    alert("Ausgewählte Prüfungen sind jetzt für alle Spieler live freigeschaltet!");
    await fetchLiveExamStatus();
    checkCooldown();
}

function checkCooldown() {
    const btn = document.getElementById('unlockBtn');
    const txt = document.getElementById('cooldownText');

    if (!examStatus) return;

    if (Date.now() < examStatus.cooldown_until) {
        if(btn) btn.style.display = 'none';
        if(txt) {
            txt.style.display = 'block';
            let remainingHours = Math.ceil((examStatus.cooldown_until - Date.now()) / (1000 * 60 * 60));
            txt.innerText = `Sperrfrist aktiv! Nächste Freigabe erst in ca. ${remainingHours} Stunden möglich.`;
        }
    } else {
        if(btn) btn.style.display = 'block';
        if(txt) txt.style.display = 'none';
    }
}

function renderAzubiView() {
    const schedContainer = document.getElementById('azubiSchedules');
    if (schedules.length === 0) {
        if(schedContainer) schedContainer.innerHTML = "<p>Aktuell keine Ausbildungen geplant.</p>";
    } else {
        if(schedContainer) schedContainer.innerHTML = schedules.map(s => 
            `<p style="background: rgba(255,255,255,0.1); padding: 10px; margin-bottom: 5px; border-radius: 4px;">
                📅 <strong>${s.date}</strong> um <strong>${s.time} Uhr</strong> - ${s.program}
            </p>`
        ).join('');
    }

    const examContainer = document.getElementById('azubiExams');
    if (!examContainer) return;
    
    let isUnlocked = false;
    let unlockedExamsHTML = '';

    if (examStatus) {
        const timePassed = Date.now() - examStatus.unlocked_at;
        // 5 Minuten Countdown Check
        if (timePassed < (5 * 60 * 1000)) {
            isUnlocked = true;
            if(examStatus.exam1_unlocked) unlockedExamsHTML += `<a href="https://docs.google.com/forms/d/e/1FAIpQLSevtU3kABQmHy8YjPqyP0sXwH2UV9YruMKOQH3BKu37J_1xuQ/viewform" target="_blank" class="module-link exam">Prüfung Modul 1</a>`;
            if(examStatus.exam2_unlocked) unlockedExamsHTML += `<a href="https://forms.gle/nuzS3cDVn3FucxKW7" target="_blank" class="module-link exam">Prüfung Modul 2</a>`;
            if(examStatus.exam3_unlocked) unlockedExamsHTML += `<a href="https://forms.gle/hfTeo3K8zCjM4UHt7" target="_blank" class="module-link exam">Prüfung Modul 3</a>`;
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
