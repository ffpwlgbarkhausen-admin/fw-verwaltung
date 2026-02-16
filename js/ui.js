Core.ui = {
    calculateServiceYears(entryDate) {
        if (!entryDate) return '---';
        let parts = String(entryDate).split('.');
        let start = parts.length === 3 ? new Date(parts[2], parts[1] - 1, parts[0]) : new Date(entryDate);
        if (isNaN(start)) return '---';
        let years = new Date().getFullYear() - start.getFullYear();
        return years >= 0 ? years : 0;
    },

    getUniqueEinsatzData(data, targetYear = 'all') {
        const uniqueMap = new Map();
        if (!data) return [];
        data.forEach(row => {
            const dateObj = new Date(row.Datum);
            const year = !isNaN(dateObj) ? dateObj.getFullYear().toString() : 'all';
            if (targetYear !== 'all' && year !== targetYear) return;
            const key = `${year}-${row.Einsatznummer}`;
            if (!uniqueMap.has(key)) {
                let dauer = Math.ceil(parseFloat(String(row.Stunden).replace(',', '.')) || 1);
                uniqueMap.set(key, { ...row, Stunden: dauer, AnzahlPers: 1 });
            } else {
                uniqueMap.get(key).AnzahlPers += 1;
            }
        });
        return Array.from(uniqueMap.values()).map(e => {
            e.Erstattung = e.Stunden * e.AnzahlPers * 4;
            return e;
        });
    },

    renderTable(title, headers, data) {
        if (!data || data.length === 0) return `<div class="p-10 text-center">Lade Daten...</div>`;
        const searchTerm = Core.state.searchTerm.toLowerCase();
        const filteredData = data.filter(row => 
            Object.values(row).some(v => String(v).toLowerCase().includes(searchTerm))
        );

        return `
            <div class="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                <div class="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h2 class="font-black italic text-brandRed uppercase">${title} (${filteredData.length})</h2>
                    <input type="text" id="tableSearch" oninput="Core.ui.handleSearch(this.value)" value="${Core.state.searchTerm}" class="bg-slate-50 dark:bg-slate-800 p-2 rounded-lg text-xs border border-slate-200" placeholder="Suchen...">
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs">
                        <thead>
                            <tr class="bg-slate-50 dark:bg-slate-800">
                                ${headers.map(h => `<th class="p-4 uppercase font-black">${h}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredData.map((row, idx) => `
                                <tr onclick="Core.ui.showDetail('${Core.state.activeModule}', ${idx})" class="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 cursor-pointer">
                                    ${headers.map(h => {
                                        let val = row[h] || '---';
                                        if(h === "Beförderung") {
                                            const check = PromotionLogic.check(row, FW_CONFIG);
                                            return `<td class="p-4"><span class="${check.color} px-2 py-1 rounded text-[10px] font-bold">${check.status}</span></td>`;
                                        }
                                        return `<td class="p-4">${val}</td>`;
                                    }).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>`;
    },

    handleSearch(val) {
        Core.state.searchTerm = val;
        this.render();
    },

    showDetail(moduleId, index) {
        const item = Core.state.data[moduleId][index];
        if (!item) return;
        const body = document.getElementById('modal-body');
        
        // Modal-Inhalt Generierung (wie in deinem Code oben)
        body.innerHTML = `<h2 class="text-xl font-black italic">${item.Name || 'Detail'}</h2>
                         <div class="mt-4 space-y-2">
                            ${Object.entries(item).map(([k,v]) => `<div class="p-2 bg-slate-50 rounded"><b>${k}:</b> ${v}</div>`).join('')}
                         </div>`;

        document.getElementById('detail-modal').classList.remove('hidden');
        setTimeout(() => document.getElementById('modal-content').classList.remove('translate-x-full'), 10);
    },

    closeDetail() {
        document.getElementById('modal-content').classList.add('translate-x-full');
        setTimeout(() => document.getElementById('detail-modal').classList.add('hidden'), 300);
    },

    render() {
        const viewport = document.getElementById('app-viewport');
        if (viewport) viewport.innerHTML = Core.views[Core.state.activeModule]();
    }
};
