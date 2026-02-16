/**
 * UI & Logik-Komponenten - FW-Verwaltung Pro
 * Enthält die Beförderungslogik und Modal-Steuerung
 */

const PromotionLogic = {
    check(item, config) {
        const currentRank = item["Dienstgrad"];
        const rule = config[currentRank];

        if (!rule) return { status: "CHECK N.A.", color: "bg-slate-100 text-slate-400", monthsLeft: 0 };
        
        if (!rule.next) {
            return { 
                status: "MAX", 
                color: "bg-transparent text-slate-400 border-slate-200 shadow-none",
                monthsLeft: 0 
            };
        }

        const referenceDate = new Date(item["Letzte Beförderung"] || item["Eintritt"]);
        
        // KORREKTUR: Nutze den globalen Stichtag statt das heutige Datum
        const stichtag = Core.state.globalStichtag ? new Date(Core.state.globalStichtag) : new Date();
        
        // Differenz basierend auf dem Stichtag berechnen
        const diffTime = stichtag - referenceDate;
        const yearsServed = diffTime / (1000 * 60 * 60 * 24 * 365.25);
        
        const requiredYears = parseInt(rule.years) || 0;
        const timeMet = isNaN(yearsServed) ? false : yearsServed >= requiredYears;
        const monthsLeft = Math.max(0, Math.ceil((requiredYears - yearsServed) * 12));

        const missingLgs = rule.req.filter(lg => {
            const val = item[lg]; 
            return !val || val === '---' || val === '';
        });

        if (timeMet && missingLgs.length === 0) {
            return { status: "BEREIT", color: "bg-emerald-500 text-white", monthsLeft: 0 };
        } else if (!timeMet) {
            return { status: "WARTEZEIT", color: "bg-amber-100 text-amber-700", monthsLeft: monthsLeft };
        } else {
            return { status: "LG FEHLT", color: "bg-orange-100 text-orange-700", monthsLeft: 0 };
        }
    }
};

Core.ui = {
    searchTimer: null,
    stichtagTimer: null,
    
    handleStichtagInput(value) {
        if (!value) return;

        clearTimeout(this.stichtagTimer);

        // Beim Datum warten wir etwas länger (800ms), 
        // da das Schreiben ins Sheet länger dauert als nur die Liste zu filtern.
        this.stichtagTimer = setTimeout(async () => {
            await Core.service.updateStichtag(value);
            // Info: Core.router.render() wird bereits in updateStichtag aufgerufen!
        }, 800);
    },
    // KORRIGIERT: Verhindert den Versatz um einen Tag durch UTC-Nutzung
    formatDate(dateVal) {
    if (!dateVal || dateVal === '---') return '---';
    
    // Sicherstellen, dass wir mit einem String arbeiten
    const dateStr = String(dateVal);
    
    // Wir extrahieren Jahr, Monat, Tag direkt aus dem String, 
    // falls er im ISO-Format (2026-05-30...) kommt
    if (dateStr.includes('-')) {
        const [year, month, day] = dateStr.split('T')[0].split('-');
        return `${day}.${month}.${year}`;
    }

    // Fallback für andere Formate (z.B. Date-Objekte vom Sheet)
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return dateVal;

    const day = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const year = d.getUTCFullYear();
    
    return `${day}.${month}.${year}`;
}
    calculateServiceYears(entryDate) {
        if (!entryDate) return '---';
        const start = new Date(entryDate);
        if (isNaN(start)) return '---';
        
        // Nutze Stichtag oder heute
        const end = Core.state.globalStichtag ? new Date(Core.state.globalStichtag) : new Date();
        
        const diff = end - start;
        const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
        return years >= 0 ? `${years} Jahre` : '---';
    },

    handleSearch(value) {
        // Den alten Timer stoppen
        clearTimeout(this.searchTimer);
        
        // Den Suchbegriff sofort im State speichern (für die Anzeige im Feld)
        Core.state.searchTerm = value;

        // Erst nach 300ms ohne weiteren Tastendruck die Liste neu zeichnen
        this.searchTimer = setTimeout(() => {
            console.log("Suche wird ausgeführt für:", value);
            Core.router.render();
        }, 300);
    },

    resetSearch() {
        Core.state.searchTerm = "";
        Core.router.render();
    },

    showDetail(moduleId, uniqueId) {
        const item = Core.state.data[moduleId].find(d => 
            (d["Pers.Nr."] && String(d["Pers.Nr."]) === String(uniqueId)) || 
            (d["Einsatznummer"] && String(d["Einsatznummer"]) === String(uniqueId)) ||
            (d["Thema"] && String(d["Thema"]) === String(uniqueId))
        );
        
        if (!item) return;

        const modal = document.getElementById('detail-modal');
        const body = document.getElementById('modal-body');
        const content = document.getElementById('modal-content');

        let promoHtml = "";
        if (moduleId === 'personnel') {
            const check = PromotionLogic.check(item, FW_CONFIG);
            const currentRule = FW_CONFIG[item["Dienstgrad"]];
            const nextRank = currentRule?.next || "Endamt erreicht";
            
            let missingInfo = "";
            if (check.status === "LG FEHLT" && currentRule) {
                const missing = currentRule.req.filter(lg => !item[lg] || item[lg] === '---' || item[lg] === '');
                missingInfo = `<p class="text-[10px] mt-2 font-black uppercase text-orange-800/60 italic">Fehlend: ${missing.join(', ')}</p>`;
            }

            promoHtml = `
                <div class="${check.color} p-5 rounded-2xl border mb-6 shadow-sm shadow-slate-200 dark:shadow-none">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="text-[10px] uppercase font-black italic opacity-70 tracking-widest leading-none mb-1">Status</p>
                            <p class="text-2xl font-black italic uppercase leading-none">${check.status}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-[10px] uppercase font-black italic opacity-70 tracking-widest leading-none mb-1">Ziel-Amt</p>
                            <p class="text-sm font-black italic uppercase text-slate-900 dark:text-white leading-none">${nextRank}</p>
                        </div>
                    </div>
                    ${check.monthsLeft > 0 ? `<div class="mt-4 pt-3 border-t border-amber-200/50"><p class="text-[10px] font-black italic uppercase tracking-widest">Noch ca. ${check.monthsLeft} Monate Wartezeit</p></div>` : ''}
                    ${missingInfo}
                </div>
            `;
        }

        body.innerHTML = `
            <div class="flex flex-col h-full">
                <p class="text-[10px] font-black text-brandRed uppercase italic mb-1 tracking-widest">${moduleId}</p>
                <h2 class="text-2xl font-black italic mb-6 border-b pb-4 dark:border-slate-800 uppercase tracking-tighter">
                    ${item.Name || item["Einsatz Art"] || item["Thema"] || 'Details'}
                </h2>
                <div class="flex-1 overflow-y-auto pr-2 pb-10">
                    ${promoHtml}
                    <div class="grid grid-cols-1 gap-3">
                        ${Object.entries(item).map(([k, v]) => {
                            // DATUMS-CHECK FÜR DIE ANZEIGE
                            let displayValue = v;
                            if (k.includes("Datum") || k === "Eintritt" || k === "Letzte Beförderung") {
                                displayValue = this.formatDate(v);
                            }

                            return `
                            <div class="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                <p class="text-[9px] uppercase font-black text-slate-400 italic tracking-widest mb-1">${k}</p>
                                <p class="text-sm font-bold text-slate-800 dark:text-slate-200">${displayValue || '---'}</p>
                            </div>`;
                        }).join('')}
                    </div>
                </div>
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
};
