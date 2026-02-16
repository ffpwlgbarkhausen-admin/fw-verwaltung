Core.views = {
    dashboard: () => {
        const pCount = Core.state.data.personnel.length;
        const oCount = Core.state.data.operations.length;
        return `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="stat-card">
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Personalstand</p>
                    <p class="text-4xl font-black italic text-brandRed">${pCount}</p>
                </div>
                <div class="stat-card">
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Einsätze gesamt</p>
                    <p class="text-4xl font-black italic text-slate-900 dark:text-white">${oCount}</p>
                </div>
                <div class="stat-card">
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stichtag</p>
                    <input type="date" value="${Core.state.globalStichtag}" 
                           onchange="Core.state.globalStichtag = this.value; Core.router.render()"
                           class="bg-transparent font-black italic text-brandRed focus:outline-none">
                </div>
            </div>
            ${Core.views.personnel()}
        `;
    },

    personnel: () => Core.views.renderTable("Personalverwaltung", SCHEMA.personnel, Core.state.data.personnel),
    operations: () => Core.views.renderTable("Einsatzdokumentation", SCHEMA.operations, Core.state.data.operations),
    events: () => Core.views.renderTable("Termine & Ausbildung", SCHEMA.events, Core.state.data.events),

    renderTable: (title, headers, data) => {
        const searchTerm = Core.state.searchTerm.toLowerCase();
        const filteredData = data.filter(row => 
            Object.values(row).some(val => String(val).toLowerCase().includes(searchTerm))
        );

        return `
            <div class="w-full bg-white dark:bg-slate-900 rounded-[1rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
                    <h2 class="text-xl font-black italic text-brandRed uppercase tracking-tighter">${title}</h2>
                    <div class="relative w-full md:w-72">
                        <input type="text" id="tableSearch" placeholder="Suchen..." 
                               oninput="Core.ui.handleSearch(this.value)" value="${Core.state.searchTerm}"
                               class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-bold focus:ring-2 focus:ring-brandRed outline-none">
                    </div>
                </div>
                <div class="overflow-x-auto max-h-[650px]">
                    <table class="w-full text-left border-collapse">
                        <thead class="sticky-header">
                            <tr>
                                ${headers.map(h => `<th>${h}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody class="text-[11px] font-bold">
                            ${filteredData.map((row, idx) => `
                                <tr class="data-row cursor-pointer" onclick="Core.ui.showDetail('${Core.state.activeModule}', ${idx})">
                                    ${headers.map(h => {
                                        let val = row[h] || '---';
                                        if (h === "Dienstjahre") val = Core.ui.calculateServiceYears(row["Eintritt"]);
                                        if (h === "Beförderung") {
                                            const check = PromotionLogic.check(row, FW_CONFIG);
                                            return `<td><span class="${check.color} px-2 py-0.5 rounded text-[10px] font-black uppercase border shadow-sm">${check.status}</span></td>`;
                                        }
                                        return `<td class="px-6 py-4">${val}</td>`;
                                    }).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>`;
    }
};
