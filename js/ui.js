/**
 * UI & Logik-Komponenten - FW-Verwaltung Pro
 * Enthält die Beförderungslogik und Modal-Steuerung
 */

const PromotionLogic = {
    check(item, config) {
        const currentRank = item["Dienstgrad"];
        const rule = config[currentRank];

        // 1. Falls Rang nicht in der Config
        if (!rule) return { status: "CHECK N.A.", color: "bg-slate-100 text-slate-400", monthsLeft: 0 };
        
        // 2. Prüfung auf Endamt (MAX)
        if (!rule.next) {
            return { 
                status: "MAX", 
                color: "bg-transparent text-slate-400 border-slate-200 shadow-none",
                monthsLeft: 0 
            };
        }

        // 3. Zeitprüfung
        // Wir nutzen hier das Eintrittsdatum oder "Letzte Beförderung", falls vorhanden
        const referenceDate = new Date(item["Letzte Beförderung"] || item["Eintritt"]);
        const now = new Date();
        const yearsServed = (now - referenceDate) / (1000 * 60 * 60 * 24 * 365.25);
        
        const requiredYears = parseInt(rule.years) || 0;
        const timeMet = isNaN(yearsServed) ? false : yearsServed >= requiredYears;

        // Monate berechnen
        const monthsLeft = Math.max(0, Math.ceil((requiredYears - yearsServed) * 12));

        // 4. Lehrgangsprüfung
        // Filtert die Voraussetzungen (z.B. "Truppführer") und schaut nach, ob in dieser Spalte beim User etwas steht
        const missingLgs = rule.req.filter(lg => {
            const val = item[lg]; 
            return !val || val === '---' || val === '';
        });

        // 5. Status ermitteln
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
    // Hilfsfunktion für Dienstjahre (Anzeige in der Tabelle)
    calculateServiceYears(entryDate) {
        if (!entryDate) return '---';
        const start = new Date(entryDate);
        if (isNaN(start)) return '---';
        const diff = new Date() - start;
        const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
        return years >= 0 ? `${years} Jahre` : '---';
    },

    handleSearch(value) {
        Core.state.searchTerm = value;
        Core.router.render();
    },

    showDetail(moduleId, index) {
        const item = Core.state.data[moduleId][index];
        if (!item) return;

        const modal = document.getElementById('detail-modal');
        const body = document.getElementById('modal-body');
        const content = document.getElementById('modal-content');

        // Promotion Check für das Modal
        let promoHtml = "";
        if (moduleId === 'personnel') {
            const check = PromotionLogic.check(item, FW_CONFIG);
            const nextRank = FW_CONFIG[item["Dienstgrad"]]?.next || "---";
            
            promoHtml = `
                <div class="${check.color} p-4 rounded-2xl border mb-6">
                    <p class="text-[10px] uppercase font-black italic opacity-70 tracking-widest">Status</p>
                    <p class="text-xl font-black italic uppercase">${check.status}</p>
                    ${check.monthsLeft > 0 ? `<p class="text-[10px] font-bold mt-1 italic">Noch ca. ${check.monthsLeft} Monate</p>` : ''}
                    <p class="text-[10px] mt-3 uppercase font-bold opacity-60 italic">Nächster Dienstgrad: ${nextRank}</p>
                </div>
            `;
        }

        body.innerHTML = `
            ${promoHtml}
            <div class="space-y-4">
                ${Object.entries(item).map(([k, v]) => `
                    <div class="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                        <p class="text-[9px] uppercase font-black text-slate-400 italic tracking-tighter">${k}</p>
                        <p class="text-sm font-bold">${v || '---'}</p>
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
};
