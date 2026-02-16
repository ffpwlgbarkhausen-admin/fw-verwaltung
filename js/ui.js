/**
 * UI & Logik-Komponenten - FW-Verwaltung Pro
 * Enthält die Steuerung für Suche, Stichtag und Formatierung
 */

Core.views = {
    dashboard: () => {
        const p = Core.state.data.personnel;
        const o = Core.state.data.operations;
        return `<div class="p-4"><h1 class="text-4xl font-black italic italic mb-8 uppercase tracking-tighter">Dashboard</h1>
                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
                        <p class="text-xs font-black uppercase text-slate-400 italic mb-2">Personal</p>
                        <p class="text-5xl font-black italic text-brandRed">${p.length}</p>
                    </div>
                    <div class="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
                        <p class="text-xs font-black uppercase text-slate-400 italic mb-2">Einsätze</p>
                        <p class="text-5xl font-black italic text-brandRed">${o.length}</p>
                    </div>
                </div></div>`;
    },

    personnel: () => {
        const controls = `<div class="mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex justify-between items-center border border-slate-200 dark:border-slate-700">
            <div><p class="text-[10px] font-black uppercase text-slate-400 italic">Beförderungs-Stichtag</p></div>
            <input type="date" value="${Core.state.globalStichtag}" oninput="Core.ui.handleStichtagInput(this.value)" class="bg-white dark:bg-slate-900 border rounded-lg px-3 py-1 font-bold text-brandRed">
        </div>`;
        return controls + Core.views.renderTable("Personal", SCHEMA.personnel, Core.state.data.personnel);
    },

    operations: () => Core.views.renderTable("Einsätze", SCHEMA.operations, Core.state.data.operations),
    events: () => Core.views.renderTable("Termine", SCHEMA.events, Core.state.data.events),

    renderTable: (title, headers, data) => {
        const term = Core.state.searchTerm.toLowerCase();
        const filtered = data.filter(row => Object.values(row).some(v => String(v).toLowerCase().includes(term)));

        return `
            <div class="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div class="p-6 border-b dark:border-slate-800 flex justify-between items-center">
                    <h2 class="text-xl font-black italic text-brandRed uppercase tracking-tighter">${title}</h2>
                    <input type="text" id="tableSearch" placeholder="Suchen..." oninput="Core.ui.handleSearch(this.value)" value="${Core.state.searchTerm}" class="bg-slate-50 dark:bg-slate-800 border rounded-xl px-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-brandRed transition-all">
                </div>
                <div class="overflow-x-auto max-h-[600px]">
                    <table class="w-full text-left">
                        <thead class="sticky top-0 bg-slate-50 dark:bg-slate-800 z-10">
                            <tr>${headers.map(h => `<th class="px-6 py-4 text-[10px] font-black italic uppercase text-slate-500 tracking-widest">${h}</th>`).join('')}</tr>
                        </thead>
                        <tbody class="text-[11px] font-bold uppercase italic">
                            ${filtered.map((row, idx) => {
                                const id = row["Pers.Nr."] || row["Einsatznummer"] || row["Thema"] || idx;
                                return `
                                    <tr class="border-t dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors" onclick="Core.ui.showDetail('${Core.state.activeModule}', '${id}')">
                                        ${headers.map(h => {
                                            let v = row[h] || '---';
                                            if (h.includes("Datum") || h === "Eintritt") v = Core.ui.formatDate(v);
                                            if (h === "Dienstjahre") v = Core.ui.calculateServiceYears(row["Eintritt"]);
                                            if (h === "Beförderung") {
                                                const check = PromotionLogic.check(row, FW_CONFIG);
                                                return `<td class="px-6 py-4"><span class="${check.color} px-2 py-1 rounded-md text-[9px] border shadow-sm">${check.status}</span></td>`;
                                            }
                                            return `<td class="px-6 py-4 text-slate-700 dark:text-slate-300">${v}</td>`;
                                        }).join('')}
                                    </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>`;
    }
};
