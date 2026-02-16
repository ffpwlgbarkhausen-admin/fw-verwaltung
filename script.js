const SCHEMA = {
    personnel: ["Pers.Nr.", "Name", "Vorname", "Dienstgrad", "Abteilung", "Eintritt", "Dienstjahre", "Beförderung"],
    operations: ["Einsatznummer", "Datum", "Einsatz Art", "AnzahlPers", "Stunden", "Erstattung"],
    events: ["Datum", "Thema", "Typ", "Leitung"]
};

const FW_CONFIG = {
    "FMA/FFA": { next: "FM/FF", req: ["Grundausbildung"], years: 0 }, // angepasst laut Logik
    "FM/FF": { next: "OFM/OFF", req: ["Grundausbildung"], years: 2 },
    "OFM/OFF": { next: "HFM/HFF", req: [], years: 5 },
    "HFM/HFF": { next: "UBM", req: ["Truppführer"], years: 1 },
    "UBM": { next: "BM", req: ["Gruppenführer"], years: 2 },
    "BM": { next: "OBM", req: [], years: 2 },
    "OBM": { next: "HBM", req: [], years: 5 },
    "HBM": { next: "BI", req: ["Zugführer"], years: 0 },
    "BI": { next: "BOI", req: ["Verbandsführer 1"], years: 0 },
    "BOI": { next: "StBI", req: ["Verbandsführer 2"], years: 0 },
    "StBI": { next: null, req: [], years: 0 }
};

const PromotionLogic = {
    check(item, config) {
        const currentRank = item["Dienstgrad"];
        const rule = config[currentRank];
        if (!rule) return { status: "CHECK N.A.", color: "bg-slate-100 text-slate-400", monthsLeft: 0 };
        if (!rule.next) return { status: "MAX", color: "bg-transparent text-slate-400 border-slate-200 shadow-none", monthsLeft: 0 };

        const referenceDate = new Date(item["Letzte Beförderung"] || item["Eintritt"]);
        const now = new Date(Core.state.globalStichtag); 
        const yearsServed = (now - referenceDate) / (1000 * 60 * 60 * 24 * 365.25);
        const requiredYears = parseInt(rule.years) || 0;
        const timeMet = isNaN(yearsServed) ? false : yearsServed >= requiredYears;
        const monthsLeft = Math.max(0, Math.ceil((requiredYears - yearsServed) * 12));

        const missingLgs = rule.req.filter(lg => {
            const val = item[lg]; 
            return !val || val === '---' || val === '';
        });

        if (timeMet && missingLgs.length === 0) return { status: "BEREIT", color: "bg-emerald-500 text-white", monthsLeft: 0 };
        else if (!timeMet) return { status: "WARTEZEIT", color: "bg-amber-100 text-amber-700", monthsLeft: monthsLeft };
        else return { status: "LG FEHLT", color: "bg-orange-100 text-orange-700", monthsLeft: 0 };
    }
};

const Core = {
    state: {
        activeModule: 'dashboard',
        data: { personnel: [], operations: [], events: [] },
        globalStichtag: new Date().toISOString().split('T')[0],
        searchTerm: '',
        selectedYear: 'all'
    },

    actions: {
        updateGlobalStichtag: async function(newDate) {
            Core.state.globalStichtag = newDate;
            Core.service.updateStatus('orange');
            try {
                const url = `${Core.service.endpoint}?action=update_stichtag&date=${newDate}&t=${Date.now()}`;
                const response = await fetch(url);
                if (response.ok) Core.service.updateStatus('green');
            } catch (error) {
                Core.service.updateStatus('red');
            }
            Core.router.render();
        }
    },

    modules: [
        { id: 'dashboard', label: 'Übersicht' },
        { id: 'personnel', label: 'Personal' },
        { id: 'operations', label: 'Einsätze' },
        { id: 'events', label: 'Termine' }
    ],

    service: {
    endpoint: 'https://script.google.com/macros/s/AKfycbxA8lHhtAXoGKTCkN1s4thQH-qWQYeNS3QkySUDpB-2_3mrAuy2cuuWBy4UjR4xpjeR/exec',
    
    // Hilfsfunktion: Schreibt Daten sicher in den State
    applyData(json) {
        if (json.stichtag) {
            // Wir extrahieren das Datum stur als Text (verhindert 02.05. vs 30.05. Fehler)
            const s = String(json.stichtag);
            const match = s.match(/(\d{4})-(\d{2})-(\d{2})/) || s.match(/(\d{2})\.(\d{2})\.(\d{4})/);
            if (match) {
                Core.state.globalStichtag = match[0].includes('-') ? match[0] : `${match[3]}-${match[2]}-${match[1]}`;
            }
        }
        Core.state.data.personnel = json.personnel || [];
        Core.state.data.operations = json.operations || [];
        Core.state.data.events = json.events || [];
    },

    updateStatus(color) {
        const d = document.getElementById('conn-dot');
        if(!d) return;
        const colorMap = {
            'green': 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)]',
            'orange': 'bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.9)]',
            'red': 'bg-rose-600 animate-bounce shadow-[0_0_8px_rgba(225,29,72,0.9)]'
        };
        d.className = `absolute -top-1 -right-2 w-2 h-2 rounded-full transition-all duration-500 ${colorMap[color] || 'bg-slate-400'}`;
    },

    async fetchData() {
        // 1. SOFORT-START: Daten aus dem Cache laden (keine Wartezeit!)
        const cached = localStorage.getItem('fw_data_cache');
        if (cached) {
            console.log("🚀 Lade aus Cache...");
            this.applyData(JSON.parse(cached));
            Core.router.render(); // App ist sofort bedienbar
        }

        this.updateStatus('orange');
        try {
            // 2. HINTERGRUND-LADEN: Frische Daten vom Server holen
            const res = await fetch(`${this.endpoint}?action=read&module=all&t=${Date.now()}`);
            const json = await res.json();
            
            console.log("✅ Frische Daten empfangen:", json.stichtag);

            // 3. CACHE AKTUALISIEREN & ANZEIGEN
            localStorage.setItem('fw_data_cache', JSON.stringify(json));
            this.applyData(json);
            
            this.updateStatus('green');
            Core.router.render(); // Nur das UI auffrischen
        } catch (e) {
            console.error("Netzwerk-Fehler:", e);
            this.updateStatus('red');
        }
    }
},

    router: {
    navigate(id) {
        Core.state.activeModule = id;
        this.render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    render() {
        // Wir suchen das mobile Menü
        const nav = document.getElementById('main-nav');
        if (nav) {
            nav.innerHTML = Core.modules.map(m => `
                <button onclick="Core.router.navigate('${m.id}')" 
                        class="flex-1 flex flex-col items-center py-2 transition-all ${Core.state.activeModule === m.id ? 'text-brandRed scale-110' : 'text-slate-500'}">
                    <span class="text-[10px] font-black uppercase tracking-tighter">${m.label}</span>
                    ${Core.state.activeModule === m.id ? '<div class="w-1.5 h-1.5 bg-brandRed rounded-full mt-1"></div>' : ''}
                </button>`).join('');
        }
        Core.ui.render();
    }
},

    views: {
        dashboard: () => {
    const rawOps = Core.state.data.operations;
    const pers = Core.state.data.personnel;
    const currentYear = new Date().getFullYear().toString();
    
    // Performance-Optimierung: Vorab-Initialisierung der festen Kategorien
    const abteilungStats = { "A": 0, "UA": 0, "TV": 0 };
    const artStats = { "Feuer": 0, "TH": 0, "BMA": 0, "sonstige/HRM": 0 };
    let errorCount = 0;
    
    const uniqueOpsMap = new Map();
    const ranking = {};
    let totalUniqueOps = 0;

    // 1. SCHLEIFE: Personal (nur einmal durchlaufen)
    pers.forEach(p => {
        const abt = (p.Abteilung || "").trim().toUpperCase();
        if (abteilungStats.hasOwnProperty(abt)) abteilungStats[abt]++;
    });

    // 2. SCHLEIFE: Einsätze (Filterung und Statistik in einem Durchgang)
    rawOps.forEach(o => {
        const d = new Date(o.Datum);
        if (d.getFullYear().toString() === currentYear) {
            // Ranking-Zählung (für Top 3)
            if (o.Name && o.Vorname) {
                const nameKey = `${o.Vorname} ${o.Name}`;
                ranking[nameKey] = (ranking[nameKey] || 0) + 1;
            }

            // Eindeutige Einsätze zählen & Typen-Statistik
            const opKey = `E-${o.Einsatznummer}_D-${o.Datum}`;
            if (!uniqueOpsMap.has(opKey)) {
                uniqueOpsMap.set(opKey, true);
                totalUniqueOps++;
                
                const art = (o["Einsatz Art"] || "").trim(); // Kein Fallback auf "Sonstige" mehr
                if (artStats.hasOwnProperty(art)) {
                    artStats[art]++;
                } else {
                    errorCount++; // Alles was nicht Feuer, TH, BMA oder sonstige/HRM ist
                }
            }
        }
    });

    // Ranking sortieren (Top 3)
    const top3 = Object.entries(ranking).sort((a, b) => b[1] - a[1]).slice(0, 3);

    return `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            
            <div class="stat-card border-l-4 border-l-brandRed">
                <p class="text-[10px] font-bold text-slate-400 uppercase italic">Personalstand</p>
                <div class="flex items-baseline gap-2">
                    <h2 class="text-4xl font-black-italic italic">${pers.length}</h2>
                    <span class="text-[10px] font-black text-slate-400 uppercase tracking-tighter italic font-bold">Gesamt</span>
                </div>
                <div class="mt-4 grid grid-cols-3 gap-2">
                    <div class="bg-slate-50 dark:bg-slate-800 p-2 rounded-xl text-center">
                        <p class="text-[11px] font-bold text-brandRed italic uppercase">A</p>
                        <p class="text-lg font-black italic">${abteilungStats["A"]}</p>
                    </div>
                    <div class="bg-slate-50 dark:bg-slate-800 p-2 rounded-xl text-center">
                        <p class="text-[11px] font-bold text-slate-500 italic uppercase">UA</p>
                        <p class="text-lg font-black italic">${abteilungStats["UA"]}</p>
                    </div>
                    <div class="bg-slate-50 dark:bg-slate-800 p-2 rounded-xl text-center">
                        <p class="text-[11px] font-bold text-slate-500 italic uppercase">TV</p>
                        <p class="text-lg font-black italic">${abteilungStats["TV"]}</p>
                    </div>
                </div>
            </div>

            <div class="stat-card border-l-4 border-l-brandRed">
                <p class="text-[10px] font-bold text-slate-400 uppercase italic">Einsätze ${currentYear}</p>
                <div class="flex items-baseline gap-2">
                    <h2 class="text-4xl font-black-italic italic">${totalUniqueOps}</h2>
                    <span class="text-[10px] font-black text-slate-400 uppercase tracking-tighter italic font-bold">Gesamt</span>
                </div>
                <div class="mt-4 grid grid-cols-2 gap-2">
                    <div class="bg-slate-50 dark:bg-slate-800 p-2 rounded-xl text-center">
                        <p class="text-[11px] font-bold text-brandRed italic uppercase">Feuer</p>
                        <p class="text-lg font-black italic">${artStats["Feuer"]}</p>
                    </div>
                    <div class="bg-slate-50 dark:bg-slate-800 p-2 rounded-xl text-center">
                        <p class="text-[11px] font-bold text-slate-500 italic uppercase">TH</p>
                        <p class="text-lg font-black italic">${artStats["TH"]}</p>
                    </div>
                    <div class="bg-slate-50 dark:bg-slate-800 p-2 rounded-xl text-center">
                        <p class="text-[11px] font-bold text-slate-500 italic uppercase">BMA</p>
                        <p class="text-lg font-black italic">${artStats["BMA"]}</p>
                    </div>
                    <div class="bg-slate-50 dark:bg-slate-800 p-2 rounded-xl text-center flex flex-col justify-center">
                        <p class="text-[9px] font-bold text-slate-500 italic uppercase leading-none">Sonstige/HRM</p>
                        <p class="text-lg font-black italic">${artStats["sonstige/HRM"]}</p>
                    </div>
                </div>
                ${errorCount > 0 ? `
                    <div class="mt-2 p-1 bg-red-50 dark:bg-red-900/20 rounded border border-red-100 dark:border-red-800/40 text-center">
                        <p class="text-[8px] font-bold text-red-600 uppercase italic">! ${errorCount} Unbekannte Typen im Sheet</p>
                    </div>
                ` : ''}
            </div>

            <div class="stat-card border-l-4 border-l-brandRed">
                <p class="text-[10px] font-bold text-slate-400 uppercase italic">Top 3 Kräfte (Einsätze)</p>
                <div class="mt-4 grid grid-cols-1 gap-2">
                    ${top3.map(([name, count], idx) => `
                        <div class="bg-slate-50 dark:bg-slate-800 p-2 px-3 rounded-xl flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <span class="text-brandRed font-black italic text-lg">#${idx + 1}</span>
                                <p class="text-[11px] font-bold uppercase italic truncate w-32">${name}</p>
                            </div>
                            <p class="text-lg font-black italic">${count}</p>
                        </div>
                    `).join('')}
                </div>
            </div>

        </div>
    `;
},
        personnel: () => {
            const pers = Core.state.data.personnel;
            const abteilungStats = { "A": 0, "UA": 0, "TV": 0 };
            pers.forEach(p => {
                const abt = String(p.Abteilung || "").toUpperCase().trim();
                if (abteilungStats.hasOwnProperty(abt)) abteilungStats[abt]++;
            });
            return `
                <div class="space-y-4 -mt-4">
                    <div class="px-6 flex flex-wrap items-center gap-x-8 gap-y-4 py-4 border-b border-slate-200 dark:border-slate-800">
                        <div class="flex items-center gap-3">
                            <p class="text-[14px] font-bold text-slate-400 dark:text-slate-500 uppercase italic tracking-widest">Personalstand</p>
                            <div class="flex items-baseline gap-2">
                                <p class="text-[11px] font-bold text-brandRed italic uppercase">Gesamt</p>
                                <p class="text-2xl font-black italic text-slate-900 dark:text-white leading-none">${pers.length}</p>
                            </div>
                        </div>
                        <div class="ml-auto flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-1.5 pl-3 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                            <div class="text-right">
                                <p class="text-[9px] font-black uppercase text-slate-400 leading-none">Prüf-Stichtag</p>
                                <p class="text-[8px] text-brandRed font-black italic uppercase leading-tight">Laufbahn-Check</p>
                            </div>
                            <input type="date" value="${Core.state.globalStichtag}" onchange="Core.actions.updateGlobalStichtag(this.value)" class="bg-white dark:bg-slate-900 border-none rounded-lg px-2 py-1 text-xs font-black text-brandRed outline-none cursor-pointer">
                        </div>
                    </div>
                    ${Core.ui.renderTable("Personalverwaltung", SCHEMA.personnel, pers)}
                </div>
            `;
        },
        operations: () => {
            const oprt = Core.state.data.operations || [];
            const uniqueOps = Core.ui.getUniqueEinsatzData(oprt, Core.state.selectedYear);
            return Core.ui.renderTable("Einsatzdokumentation", SCHEMA.operations, uniqueOps);
        },
        events: () => Core.ui.renderTable("Terminplanung", SCHEMA.events, Core.state.data.events)
    },

    ui: {
        // --- NEU: Diese Funktion formatiert das Datum global ---
        // --- Optimierte Datums-Formatierung ---
        formatDate(value) {
            if (!value || value === '---' || String(value).trim() === '') return '---';
            
            // 1. Wenn es bereits ein Date-Objekt ist (von Google Apps Script oft so geliefert)
            const date = new Date(value);
            
            // 2. Prüfen, ob die Umwandlung gültig war
            const isValidDate = !isNaN(date.getTime());
            
            // 3. Sicherheits-Check: Sieht der Wert wie ein Datum aus? (DD.MM.YYYY oder YYYY-MM-DD)
            const datePattern = /^\d{1,4}[.\-]\d{1,2}[.\-]\d{1,4}/;
            const looksLikeDate = datePattern.test(String(value));

            if (isValidDate && looksLikeDate) {
                return date.toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
            }
            
            // Falls es kein Datum ist (z.B. ein Name), gib den Wert einfach zurück
            return value;
        },

        calculateServiceYears(entryDate) {
            if (!entryDate) return '---';
            const start = new Date(entryDate);
            const today = new Date();
            if (isNaN(start)) return '---';
            let years = today.getFullYear() - start.getFullYear();
            if (today.getMonth() < start.getMonth() || (today.getMonth() === start.getMonth() && today.getDate() < start.getDate())) years--;
            return years >= 0 ? `${years} Jahre` : '---';
        },

        getUniqueEinsatzData(data, targetYear = 'all') {
            const uniqueMap = new Map();
            data.forEach(row => {
                const dateObj = new Date(row.Datum);
                const year = dateObj.getFullYear().toString();
                if (targetYear !== 'all' && year !== targetYear.toString()) return;
                const nr = row.Einsatznummer || '0';
                const key = `${year}-${nr}`;
                if (!uniqueMap.has(key)) {
                    uniqueMap.set(key, { ...row, AnzahlPers: 1 });
                } else {
                    uniqueMap.get(key).AnzahlPers += 1;
                }
            });
            return Array.from(uniqueMap.values()).map(e => {
                e.Erstattung = (parseFloat(e.Stunden) || 0) * (e.AnzahlPers || 0) * 4;
                return e;
            });
        },

        render() {
            const viewport = document.getElementById('app-viewport');
            if (viewport) viewport.innerHTML = Core.views[Core.state.activeModule]();
        },

        handleSearch(value) {
            Core.state.searchTerm = value;
            this.render();
        },

        renderTable(title, headers, data) {
            const searchTerm = Core.state.searchTerm.toLowerCase();
            const filteredData = data.filter(row => 
                Object.values(row).some(val => String(val).toLowerCase().includes(searchTerm))
            );

            return `
                <div class="w-full bg-white dark:bg-slate-900 rounded-[1rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
                        <h2 class="text-xl font-black italic text-brandRed uppercase tracking-tighter">${title}</h2>
                        <input type="text" placeholder="Suchen..." oninput="Core.ui.handleSearch(this.value)" value="${Core.state.searchTerm}" class="bg-slate-50 dark:bg-slate-800 border rounded-xl px-4 py-2 text-xs font-bold w-full md:w-72">
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-left">
                            <thead class="sticky-header">
                                <tr>${headers.map(h => `<th class="px-6 py-4">${h}</th>`).join('')}</tr>
                            </thead>
                            <tbody class="text-[11px] font-bold">
                                ${filteredData.map((row, idx) => `
                                    <tr class="data-row cursor-pointer" onclick="Core.ui.showDetail('${Core.state.activeModule}', ${idx})">
                                        ${headers.map(h => {
                                            let val = row[h] || '---';
                                            if (h === "Dienstjahre") {
                                                val = this.calculateServiceYears(row["Eintritt"]);
                                            } else {
                                                // HIER EINGEBAUT: Datum formatieren
                                                val = this.formatDate(val);
                                            }
                                            return `<td class="px-6 py-4">${val}</td>`;
                                        }).join('')}
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>`;
        },

        showDetail(moduleId, index) {
            const modal = document.getElementById('detail-modal');
            const content = document.getElementById('modal-content');
            const body = document.getElementById('modal-body');
            
            // Korrekte Datenquelle wählen
            const dataSet = (Core.state.activeModule === 'personnel') ? Core.state.data.personnel : 
                          (Core.state.activeModule === 'operations') ? Core.ui.getUniqueEinsatzData(Core.state.data.operations) : 
                          Core.state.data.events;
            
            const item = dataSet[index];
            if (!item) return;
            
            body.innerHTML = `
                <h2 class="text-xl font-black italic mb-6 text-brandRed uppercase">${item.Name || item.Thema || 'Details'}</h2>
                <div class="grid grid-cols-1 gap-3">
                    ${Object.entries(item).map(([k,v]) => `
                        <div class="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                            <p class="text-[9px] uppercase font-bold text-slate-400 italic">${k}</p>
                            <p class="text-sm font-semibold text-slate-900 dark:text-white break-words">
                                ${this.formatDate(v)} </p>
                        </div>
                    `).join('')}
                </div>
            `;
            
            modal.classList.remove('hidden');
            setTimeout(() => content.classList.remove('translate-x-full'), 10);
        },

        closeDetail() {
            const modal = document.getElementById('detail-modal');
            const content = document.getElementById('modal-content');
            content.classList.add('translate-x-full');
            setTimeout(() => modal.classList.add('hidden'), 300);
        }
    }
};

// Start & Service Worker
Core.service.fetchData();

/* Deaktiviere das hier kurzzeitig, wenn du viel entwickelst:
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(console.error);
    });
}
*/













