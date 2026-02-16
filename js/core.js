/**
 * Core Logik - FW-Verwaltung Pro
 * Verwaltet State, API-Kommunikation und Routing
 */

const SCHEMA = {
    personnel: ["Pers.Nr.", "Name", "Vorname", "Dienstgrad", "Abteilung", "Eintritt", "Dienstjahre", "Beförderung"],
    operations: ["Einsatznummer", "Datum", "Einsatz Art", "AnzahlPers", "Stunden", "Erstattung"],
    events: ["Datum", "Thema", "Typ", "Leitung"]
};

const FW_CONFIG = {
    "FMA/FFA": { next: "FM/FF", req: ["Eintritt"], years: 0 },
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

let debounceTimer; // Globaler Timer für die Eingabe-Verzögerung
const Core = {
    state: {
        activeModule: 'dashboard',
        data: { personnel: [], operations: [], events: [], promoRules: [] },
        // Wir setzen es initial auf leer oder heute, 
        // da es gleich durch handleFullDataSync() aus dem Sheet befüllt wird.
        globalStichtag: "", 
        searchTerm: '',
        selectedYear: 'all'
    },

    service: {
        // HINWEIS: Ersetze diese URL durch deine Web-App URL aus Google Apps Script
        endpoint: 'https://script.google.com/macros/s/AKfycbxA8lHhtAXoGKTCkN1s4thQH-qWQYeNS3QkySUDpB-2_3mrAuy2cuuWBy4UjR4xpjeR/exec',

        async fetchData() {
            const dot = document.getElementById('conn-dot');
            const viewport = document.getElementById('app-viewport');
            
            try {
                if (dot) dot.className = 'absolute -top-1 -right-2 w-2 h-2 rounded-full bg-orange-500 animate-pulse';
                
                // Wir rufen das Modul 'all_dashboard_data' ab, wie in deinem GAS definiert
                const response = await fetch(`${this.endpoint}?action=read&module=all_dashboard_data`);
                if (!response.ok) throw new Error("Server-Antwort war nicht ok");
                
                const result = await response.json();

                // Mapping der GAS-Daten in den App-State
                Core.state.data.personnel = result.personnel || [];
                Core.state.data.operations = result.operations || [];
                Core.state.data.events = result.dienstplan || []; // GAS liefert 'dienstplan'
                Core.state.data.promoRules = result.promoRules || [];
                
                // Übernahme des Stichtags (Direkt als String, um Zeitzonen-Fehler zu vermeiden)
                if (result.stichtag) {
                    // Wir nehmen nur die ersten 10 Zeichen (YYYY-MM-DD), falls noch Zeit-Infos dran hängen
                    Core.state.globalStichtag = String(result.stichtag).substring(0, 10);
                }

                if (dot) dot.className = 'absolute -top-1 -right-2 w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
                
                Core.router.render();
            } catch (error) {
                console.error("Synchronisationsfehler:", error);
                if (dot) dot.className = 'absolute -top-1 -right-2 w-2 h-2 rounded-full bg-red-500';
                
                if (viewport) {
                    viewport.innerHTML = `
                        <div class="flex flex-col items-center justify-center py-20">
                            <div class="bg-red-50 dark:bg-red-900/20 p-8 rounded-3xl border border-red-100 dark:border-red-800 text-center">
                                <p class="text-red-500 font-black-italic italic uppercase mb-2">Verbindungsfehler</p>
                                <p class="text-xs text-slate-500 mb-6">Die Daten konnten nicht geladen werden.</p>
                                <button onclick="Core.service.fetchData()" class="px-6 py-3 bg-white dark:bg-slate-800 shadow-sm rounded-xl font-black-italic italic text-xs uppercase border border-slate-200 dark:border-slate-700">Erneut versuchen</button>
                            </div>
                        </div>`;
                }
            }
        },

        // Funktion um den Stichtag zurück ins Google Sheet zu schreiben

        async updateStichtag(newDate) {
            const dot = document.getElementById('conn-dot');
            try {
                if (dot) dot.className = 'absolute -top-1 -right-2 w-2 h-2 rounded-full bg-blue-500 animate-ping';
                
                // 1. Ab ans Google Sheet
                await fetch(`${this.endpoint}?action=update_stichtag&date=${newDate}`, { mode: 'no-cors' });
                
                // 2. WICHTIG: Lokal speichern, damit die App sofort mit dem neuen Datum rechnet
                Core.state.globalStichtag = newDate;
                
                if (dot) dot.className = 'absolute -top-1 -right-2 w-2 h-2 rounded-full bg-emerald-500';
                
                // 3. UI neu zeichnen, damit alle Beförderungs-Badges sofort aktualisiert werden
                Core.router.render();
                
            } catch (e) {
                console.error("Update Fehler:", e);
                if (dot) dot.className = 'absolute -top-1 -right-2 w-2 h-2 rounded-full bg-red-500';
                
                // Auch im Fehlerfall lokal setzen, damit der User das Ergebnis sieht
                Core.state.globalStichtag = newDate;
                Core.router.render();
            }
        }
    },

    router: {
        navigate(id) {
            Core.state.activeModule = id;
            Core.state.searchTerm = ""; // Suche beim Wechsel zurücksetzen
            this.render();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        render() {
            const nav = document.getElementById('main-nav');
            if(nav) {
                nav.innerHTML = Core.modules.map(m => `
                    <button onclick="Core.router.navigate('${m.id}')" 
                            class="px-4 py-2 md:px-6 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${Core.state.activeModule === m.id ? 'nav-active' : 'text-slate-500 hover:text-slate-900'}">
                        ${m.label}
                    </button>`).join('');
            }
            const viewport = document.getElementById('app-viewport');
            if(viewport) viewport.innerHTML = Core.views[Core.state.activeModule]();
        }
    },

    modules: [
        { id: 'dashboard', label: 'Übersicht' },
        { id: 'personnel', label: 'Personal' },
        { id: 'operations', label: 'Einsätze' },
        { id: 'events', label: 'Termine' }
    ]
};
