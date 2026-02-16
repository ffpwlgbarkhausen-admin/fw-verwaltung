const PromotionLogic = {
    check(member, config) {
        const currentRank = member["Dienstgrad"];
        const rule = config[currentRank];
        if (!rule || !rule.next) return { status: "MAX", color: "bg-slate-100 text-slate-400 border-slate-200" };

        const stichtag = new Date(Core.state.globalStichtag);
        const lastPromotion = new Date(member["letzte Beförderung"] || member["Eintritt"]);
        
        const diffTime = Math.abs(stichtag - lastPromotion);
        const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30.44));
        const requiredMonths = rule.years * 12;

        const hasLehrgaenge = rule.req.every(req => 
            Object.values(member).some(val => String(val).includes(req))
        );

        if (diffMonths >= requiredMonths && hasLehrgaenge) {
            return { status: "BEREIT", color: "bg-emerald-500 text-white border-emerald-600 shadow-emerald-200" };
        }
        
        return { 
            status: "WARTEZEIT", 
            monthsLeft: Math.max(0, requiredMonths - diffMonths),
            color: "bg-amber-100 text-amber-700 border-amber-200" 
        };
    }
};

Core.ui = {
    calculateServiceYears(entryDate) {
        if (!entryDate) return '---';
        let parts = String(entryDate).split('.');
        let start = parts.length === 3 ? new Date(parts[2], parts[1] - 1, parts[0]) : new Date(entryDate);
        if (isNaN(start)) return '---';
        const today = new Date();
        let years = today.getFullYear() - start.getFullYear();
        const m = today.getMonth() - start.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < start.getDate())) years--;
        return years >= 0 ? `${years} Jahre` : '---';
    },

    handleSearch(value) {
        Core.state.searchTerm = value;
        Core.router.render();
    },

    resetSearch(event) {
        if (event) { event.preventDefault(); event.stopPropagation(); }
        Core.state.searchTerm = "";
        Core.router.render();
        setTimeout(() => {
            const input = document.getElementById('tableSearch');
            if (input) input.focus();
        }, 10);
    },

    showDetail(moduleId, index) {
        const mapping = { '1': 'personnel', 'personnel': 'personnel', '4': 'operations', 'operations': 'operations' };
        const dataKey = mapping[moduleId] || moduleId;
        const item = Core.state.data[dataKey] ? Core.state.data[dataKey][index] : null;
        if (!item) return;

        const modal = document.getElementById('detail-modal');
        const content = document.getElementById('modal-content');
        const body = document.getElementById('modal-body');

        const fieldFilters = {
            personnel: ["Pers.Nr.", "Name", "Vorname", "Eintritt", "Dienstgrad", "Geburtstag", "Telefon", "E-Mail", "Adresse", "Ort", "letzte Beförderung"],
            operations: ["Einsatznummer", "Datum", "Alarm", "Einsatz Ort", "Einsatz Art", "Gruppenführer"]
        };
        const allowedFields = fieldFilters[dataKey] || Object.keys(item);

        let promotionHtml = "";
        if (dataKey === 'personnel') {
            const check = PromotionLogic.check(item, FW_CONFIG);
            const rule = FW_CONFIG[item["Dienstgrad"]];
            promotionHtml = `
                <div class="${check.color} p-4 rounded-xl border mb-4 shadow-sm">
                    <p class="text-[9px] uppercase font-bold italic opacity-80">Beförderungs-Status</p>
                    <p class="text-lg font-black italic uppercase">${check.status}</p>
                    <p class="text-[9px] mt-2 uppercase font-bold opacity-80">Ziel: ${rule?.next || 'Endamt'}</p>
                </div>`;
        }

        body.innerHTML = `
            <div class="flex flex-col h-full">
                <p class="text-[10px] font-black text-brandRed uppercase italic mb-2">${dataKey}</p>
                <h2 class="text-xl font-black italic mb-6 border-b pb-4 dark:border-slate-800">${item.Name || item["Einsatz Art"]}</h2>
                <div class="flex-1 overflow-y-auto space-y-3 pr-2">
                    ${promotionHtml}
                    ${Object.entries(item).filter(([k]) => allowedFields.includes(k)).map(([k, v]) => `
                        <div class="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                            <p class="text-[9px] uppercase font-bold text-slate-400 italic">${k}</p>
                            <p class="text-sm font-semibold">${v || '---'}</p>
                        </div>
                    `).join('')}
                </div>
            </div>`;

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
