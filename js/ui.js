/**
 * UI & Logik-Komponenten - FW-Verwaltung Pro
 * Enthält die Steuerung für Suche, Stichtag und Formatierung
 */

Core.ui = {
    searchTimer: null,
    stichtagTimer: null,
    
    handleStichtagInput(value) {
        if (!value) return;
        clearTimeout(this.stichtagTimer);

        // UI sofort aktualisieren (für das Input-Feld selbst)
        Core.state.globalStichtag = value;

        this.stichtagTimer = setTimeout(async () => {
            console.log("Stichtag wird gespeichert:", value);
            await Core.service.updateStichtag(value);
            // Core.router.render() wird in updateStichtag aufgerufen
        }, 800);
    },

    formatDate(dateVal) {
        if (!dateVal || dateVal === '---') return '---';
        
        const dateStr = String(dateVal);
        
        // 1. Check: Wenn das Datum im ISO-Format kommt (YYYY-MM-DD), zerlegen wir es manuell.
        // Das ist die sicherste Methode gegen Zeitzonen-Fehler.
        if (dateStr.includes('-')) {
            const parts = dateStr.split('T')[0].split('-');
            if (parts.length === 3) {
                const [year, month, day] = parts;
                return `${day}.${month}.${year}`;
            }
        }

        // 2. Fallback: Falls es ein anderes Format ist, nutzen wir UTC-Methoden
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return dateVal;

        const day = String(d.getUTCDate()).padStart(2, '0');
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const year = d.getUTCFullYear();
        
        return `${day}.${month}.${year}`;
    },

    calculateServiceYears(entryDate) {
        if (!entryDate) return '---';
        
        // Wir setzen beide Daten auf Mittag, um Zeitzonen-Verschiebungen zu neutralisieren
        const start = new Date(String(entryDate).split('T')[0] + 'T12:00:00');
        if (isNaN(start)) return '---';
        
        const stichtagStr = Core.state.globalStichtag || new Date().toISOString().split('T')[0];
        const end = new Date(stichtagStr + 'T12:00:00');
        
        const diff = end - start;
        const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
        return years >= 0 ? `${years} Jahre` : '---';
    },

    handleSearch(value) {
        clearTimeout(this.searchTimer);
        Core.state.searchTerm = value;

        this.searchTimer = setTimeout(() => {
            Core.router.render();
            
            // Fokus nach dem Rendern zurück ins Suchfeld
            const searchInput = document.getElementById('tableSearch');
            if (searchInput) {
                searchInput.focus();
                searchInput.setSelectionRange(value.length, value.length);
            }
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
                <div class="${check.color} p-5 rounded-2xl border mb-6 shadow-sm">
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
