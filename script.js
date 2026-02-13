if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('SW registriert', reg))
      .catch(err => console.log('SW Fehler', err));
  });
}
let globalData = null;
const BACKEND_URL = "https://script.google.com/macros/s/AKfycbxA8lHhtAXoGKTCkN1s4thQH-qWQYeNS3QkySUDpB-2_3mrAuy2cuuWBy4UjR4xpjeR/exec";

window.onload = () => {
  if (localStorage.getItem('dark-mode') === 'true') {
    document.documentElement.classList.add('dark');
    document.getElementById('dark-icon').innerText = '☀️';
  }
  ladeDaten();
};

async function ladeDaten() {
  const punkt = document.getElementById('status-punkt');
  try {
    const response = await fetch(BACKEND_URL + "?action=read&module=all_dashboard_data");
    const rawData = await response.json();
    
    // 2026 Filter & Deduplizierung
    const aktuelleJahr = 2026; 
    const eindeutigeEinsaetze = [];
    const gesehen = new Set();

    rawData.operations.forEach(e => {
      const datum = new Date(e.Zeitpunkt || e.Datum);
      const einsatzJahr = !isNaN(datum) ? datum.getFullYear() : 0;
      const id = `${einsatzJahr}-${e.Einsatznummer}`;

      if (einsatzJahr === aktuelleJahr && !gesehen.has(id)) {
        gesehen.add(id);
        eindeutigeEinsaetze.push(e);
      }
    });

    globalData = {
      operations: eindeutigeEinsaetze,
      personnel: rawData.personnel
    };

    if (punkt) {
      punkt.classList.add('glow-green');
      punkt.classList.remove('bg-gray-400');
    }
    showPage('dashboard');

  } catch (error) {
    console.error("Fehler:", error);
    if (punkt) punkt.classList.add('bg-red-600');
  }
}

function showPage(page) {
  const content = document.getElementById('app-content');
  
  // 1. Sicherung: Falls Daten noch nicht da sind, zeige Lade-Spinner
  if (!globalData) {
    content.innerHTML = '<div class="text-center py-20 animate-pulse italic text-slate-500">Daten werden noch empfangen...</div>';
    return;
  }

  console.log("Wechsle zur Seite:", page); // Zum Testen in der Konsole
//---------------------------------
// ---Zusammenabu des Dashboards---
//---------------------------------  
  if (page === 'dashboard') {
    // --- 1. EINSATZ-STATISTIK BERECHNEN ---
    const eCounts = {};
    globalData.operations.forEach(e => {
        const art = e["Einsatz Art"] || 'Sonstige';
        eCounts[art] = (eCounts[art] || 0) + 1;
    });

    let eStatsHtml = "";
    for (const [name, zahl] of Object.entries(eCounts)) {
        eStatsHtml += `
            <div class="flex justify-between items-center text-[11px] pt-2 mt-2 border-t border-slate-50 dark:border-slate-700/50">
                <span class="text-slate-500 font-bold uppercase tracking-tighter">${name}</span>
                <span class="font-black text-red-600 dark:text-red-400">${zahl}</span>
            </div>`;
    }

    // --- 2. PERSONAL-STATISTIK BERECHNEN ---
    const pCounts = {};
    globalData.personnel.forEach(p => {
        const abt = p["Abteilung"] || 'Nicht zugeordnet';
        pCounts[abt] = (pCounts[abt] || 0) + 1;
    });

    let pStatsHtml = "";
    for (const [name, zahl] of Object.entries(pCounts)) {
        pStatsHtml += `
            <div class="flex justify-between items-center text-[11px] pt-2 mt-2 border-t border-slate-50 dark:border-slate-700/50">
                <span class="text-slate-500 font-bold uppercase tracking-tighter">${name}</span>
                <span class="font-black text-slate-700 dark:text-slate-300">${zahl}</span>
            </div>`;
    }

    // --- 3. DASHBOARD RENDERN ---
    content.innerHTML = `
      <div class="space-y-4">
        <div class="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border-l-4 border-red-600">
          <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Einsätze 2026</p>
          <p class="text-5xl font-black text-slate-900 dark:text-white mb-2">${globalData.operations.length}</p>
          <div class="mt-2">${eStatsHtml}</div>
        </div>

        <div class="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border-l-4 border-slate-400">
          <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Personal</p>
          <p class="text-5xl font-black text-slate-900 dark:text-white mb-2">${globalData.personnel.length}</p>
          <div class="mt-2">${pStatsHtml}</div>
        </div>
      </div>`;
}
  if (page === 'einsaetze') {
    // 1. Zähl-Logik (Strichliste für deine Spalte "Einsatz Art")
    const zaehler = {};
    globalData.operations.forEach(e => {
        const art = e["Einsatz Art"] || 'Sonstige';
        // Erhöht die Zahl für "Feuer", "BMA" etc. um 1
        zaehler[art] = (zaehler[art] || 0) + 1;
    });

    // 2. HTML für die Zusammenfassung (Badges) bauen
    let zusammenfassungHtml = '<div class="flex flex-wrap gap-2 mb-6">';
    
    // Wir gehen alle gefundenen Arten (Feuer, BMA...) durch
    for (const [art, anzahl] of Object.entries(zaehler)) {
        zusammenfassungHtml += `
            <div class="bg-white dark:bg-slate-800 px-3 py-2 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-2">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">${art}</span>
                <span class="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-lg font-black text-xs">${anzahl}</span>
            </div>`;
    }
    zusammenfassungHtml += '</div>';

    // 3. Die eigentliche Seite zusammenbauen
    let html = `
        <h2 class="text-xl font-black mb-4 uppercase italic text-slate-900 dark:text-white">Einsatzstatistik & Liste</h2>
        ${zusammenfassungHtml} 
        <div class="space-y-3">
    `;

    // Liste sortieren (Neueste oben)
    const sortiert = [...globalData.operations].sort((a, b) => b.Einsatznummer - a.Einsatznummer);
    
    sortiert.forEach(e => {
      html += `
        <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border-l-4 border-red-500">
          <div class="flex justify-between items-start">
            <span class="text-[10px] font-bold text-slate-400">#${e.Einsatznummer}</span>
            <span class="text-[10px] text-slate-500">${e.Datum}</span>
          </div>
          <p class="font-bold text-slate-900 dark:text-white leading-tight">${e.Stichwort || 'Einsatz'}</p>
          <p class="text-[10px] text-red-600 font-bold uppercase mt-1">${e["Einsatz Art"] || ''}</p>
        </div>`;
    });
    
    html += '</div>';
    content.innerHTML = html;
}
  if (page === 'personal') {
    const pers = globalData.personnel; // Zugriff auf deine Daten

    // 1. Zähl-Logik für die Statistik (Deine Logik)
    const abtZaehler = {};
    pers.forEach(p => {
        const abt = p["Abteilung"] || 'Nicht zugeordnet';
        abtZaehler[abt] = (abtZaehler[abt] || 0) + 1;
    });

    // 2. HTML für die Statistik-Badges (Dein Design)
    let personalStatsHtml = '<div class="flex flex-wrap gap-2 mb-6">';
    for (const [abteilung, anzahl] of Object.entries(abtZaehler)) {
        personalStatsHtml += `
            <div class="bg-white dark:bg-slate-800 px-3 py-2 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-2">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">${abteilung}</span>
                <span class="bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-lg font-black text-xs">${anzahl}</span>
            </div>`;
    }
    personalStatsHtml += '</div>';

    // 3. Die Seite mit Suchzeile und TABELLE zusammenbauen
    let html = `
        <h2 class="text-xl font-black mb-4 uppercase italic text-slate-900 dark:text-white">Personalverwaltung</h2>
        
        ${personalStatsHtml} 

        <div class="mb-4">
            <div class="relative">
                <input type="text" 
                       id="personnelSearch" 
                       onkeyup="filterPersonnelTable()"
                       placeholder="Name oder Abteilung suchen..." 
                       class="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-3 px-4 text-sm outline-none shadow-sm">
            </div>
        </div>

        <div id="personalTableContainer" class="overflow-x-auto">
            ${Core.ui.renderTable("Personalliste", SCHEMA.personnel, pers)}
        </div>
    `;

    content.innerHTML = html;
}
// Nach dem Wechseln: Scrolle nach ganz oben
  window.scrollTo(0, 0);
}

function toggleDarkMode() {
  const isDark = document.documentElement.classList.toggle('dark');
  document.getElementById('dark-icon').innerText = isDark ? '☀️' : '🌙';
  localStorage.setItem('dark-mode', isDark);

}
// Damit die Buttons die Funktionen unter Garantie finden
window.showPage = showPage;
window.toggleDarkMode = toggleDarkMode;

function filterPersonnelTable() {
    const input = document.getElementById('personnelSearch');
    const filter = input.value.toUpperCase();
    const container = document.getElementById('personalTableContainer');
    
    // Wir suchen die Tabelle, die Core.ui.renderTable erzeugt hat
    const table = container.getElementsByTagName("table")[0];
    if (!table) return;

    const tr = table.getElementsByTagName("tr");

    // Wir starten bei i=1, um die Überschriften der Tabelle stehen zu lassen
    for (let i = 1; i < tr.length; i++) {
        const rowText = tr[i].textContent || tr[i].innerText;
        
        if (rowText.toUpperCase().indexOf(filter) > -1) {
            tr[i].style.display = ""; // Zeile passt zur Suche
        } else {
            tr[i].style.display = "none"; // Zeile ausblenden
        }
    }
}








