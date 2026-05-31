/* eslint-env browser, es6 */
/* eslint-disable no-unused-vars */
"use strict";

// --- KONFIGURATION (HIER DEINE DATEN EINTRAGEN!) ---
const SUPABASE_URL = "https://faopamglziztknceaqsv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhb3BhbWdseml6dGtuY2VhcXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxNDE3MTQsImV4cCI6MjA5NTcxNzcxNH0.7Da4mEBPW1p3jQ6x_v3IuG2BNVmT7OmORjyM3F-I7x8";
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
    checkLoginLockout();
    prefillDates(); 
});

// Live-Daten von Supabase holen
async function fetchLiveSchedules() {
    const { data, error } = await _supabase.from('schedules').select('*').order('id', { ascending: true });
    if (error) console.error("Fehler beim Laden:", error.message);
    else schedules = data || [];
}

async function fetchLiveExamStatus() {
    const { data, error } = await _supabase.from('exam_status').select('*').eq('id', 1).maybeSingle();
    if (error) console.error("Fehler beim Laden Status:", error.message);
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
    if(lockoutStatus && Date.now() < lockoutStatus.lockedUntil) {
        // Gesperrt
    } else {
        localStorage.removeItem('fkh_loginLockout');
    }
}

function showLogin(role) {
    currentLoginRole = role;
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('loginTitle').innerText = role === 'ausbilder' ? 'Ausbilder Login' : 'Kommission Login';
}

function goBack() {
    document.getElementById('loginSection').style.display = 'none';
    document.querySelectorAll('.portal-content').forEach(el => el.style.display = 'none');
    document.getElementById('mainMenu').style.display = 'flex';
}

function doLogin() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    if (user === USERS[currentLoginRole].user && pass === USERS[currentLoginRole].pass) {
        openPortal(currentLoginRole);
    } else {
        alert("Falsche Anmeldedaten!");
    }
}

async function openPortal(role) {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById(`portal-${role}`).style.display = 'block';
    await fetchLiveSchedules();
    await fetchLiveExamStatus();
    
    if (role === 'azubi') renderAzubiView();
    if (role === 'ausbilder' || role === 'kommission') renderManagementSchedules(role);
}

// Termin Funktionen
async function addSchedule(role) {
    const date = document.getElementById(`schedDate_${role}`).value;
    const time = document.getElementById(`schedTime_${role}`).value;
    const program = document.getElementById(`schedProgram_${role}`).value;
    const dateObj = new Date(date);
    const dateStr = dateObj.toLocaleDateString('de-DE');

    await _supabase.from('schedules').insert([{ date: dateStr, time: time, program: program, created_by: role }]);
    alert("Termin eingetragen!");
    await fetchLiveSchedules();
    renderManagementSchedules(role);
}

function renderManagementSchedules(role) {
    const container = document.getElementById(`${role}SchedulesContainer`);
    container.innerHTML = schedules.map(s => `
        <div class="schedule-item">
            📅 ${s.date} um ${s.time} Uhr - ${s.program}
            <button onclick="deleteSchedule(${s.id}, '${role}')">Löschen</button>
        </div>`).join('');
}

async function deleteSchedule(id, role) {
    await _supabase.from('schedules').delete().eq('id', id);
    await fetchLiveSchedules();
    renderManagementSchedules(role);
}

async function unlockSelectedExams() {
    const e1 = document.getElementById('checkExam1').checked;
    await _supabase.from('exam_status').upsert([{ id: 1, unlocked_at: Date.now(), exam1_unlocked: e1, cooldown_until: Date.now() + 86400000 }]);
    alert("Prüfungen live geschaltet!");
}

function renderAzubiView() {
    const container = document.getElementById('azubiSchedules');
    container.innerHTML = schedules.map(s => `<p>📅 ${s.date} um ${s.time} Uhr - ${s.program}</p>`).join('');
}
