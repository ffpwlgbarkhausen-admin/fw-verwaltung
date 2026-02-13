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

  if (page === 'dashboard') {
    content.innerHTML = `
      <div class="space-y-4">
        <div class="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border-l-4 border-red-600">
          <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Einsätze 2026</p>
          <p class="text-5xl font-black text-slate-900 dark:text-white">${globalData.operations.length}</p>
        </div>
        <div class="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border-l-4 border-slate-400">
          <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Personal</p>
          <p class="text-5xl font-black text-slate-900 dark:text-white">${globalData.personnel.length}</p>
        </div>
      </div>`;
  }
  if (page === 'einsaetze') {
    let html = '<h2 class="text-xl font-black mb-4 uppercase italic">Einsatzliste 2026</h2><div class="space-y-3">';
    // Neueste Einsätze zuerst anzeigen
    const sortiert = [...globalData.operations].sort((a, b) => b.Einsatznummer - a.Einsatznummer);
    
    sortiert.forEach(e => {
      html += `
        <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border-l-4 border-red-500">
          <div class="flex justify-between items-start">
            <span class="text-[10px] font-bold text-slate-400">#${e.Einsatznummer}</span>
            <span class="text-[10px] text-slate-500">${e.Datum}</span>
          </div>
          <p class="font-bold text-slate-900 dark:text-white leading-tight">${e.Stichwort || 'Einsatz'}</p>
          <p class="text-[10px] text-slate-500 uppercase mt-1">${e["Einsatz Art"] || ''}</p>
        </div>`;
    });
    html += '</div>';
    content.innerHTML = html;
  }
  if (page === 'personal') {
    let html = '<h2 class="text-xl font-black mb-4 uppercase italic">Mannschaft LG13</h2><div class="grid gap-2">';
    globalData.personnel.forEach(p => {
      html += `
        <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm flex justify-between items-center">
          <div>
            <p class="font-bold text-slate-900 dark:text-white">${p.Vorname} ${p.Nachname}</p>
            <p class="text-[10px] text-slate-500 uppercase tracking-widest">${p.Dienstgrad || 'Feuerwehr'}</p>
          </div>
          <div class="w-2 h-2 rounded-full bg-green-500"></div>
        </div>`;
    });
    html += '</div>';
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



