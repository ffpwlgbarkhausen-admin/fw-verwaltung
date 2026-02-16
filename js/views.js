/**
 * Views & Templates - FW-Verwaltung Pro
 * Generiert das HTML für Dashboard und Tabellen
 */

Core.views = {
    // DASHBOARD VIEW
    dashboard: () => {
        // 1. Daten-Vorbereitung: Personal nach Status filtern
        const personnel = Core.state.data.personnel;
        const pCount = personnel.length;
        const aCount = personnel.filter(p => p.Status === 'A').length;
        const uaCount = personnel.filter(p => p.Status === 'UA').length;
        const tvCount = personnel.filter(p => p.Status === 'TV').length;

        // 2. Daten-Vorbereitung: Einsätze nach Art filtern
        const ops = Core.state.data.operations;
        const oCount = ops.length;
        const bmaCount = ops.filter(o => o.Art === 'BMA').length;
        const feuerCount = ops.filter(o => o.Art === 'FEUER').length;
        const thCount = ops.filter(o => o.Art === 'TH').length;
        const sonstigeCount = oCount - (bmaCount + feuerCount + thCount);

        return `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-12 p-2">
                
                <div class="border-l-4 border-brandRed pl-8">
                    <div class="flex flex-col mb-8">
                        <p class="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Personalstand</p>
                        <div class="flex items-baseline italic gap-3">
                            <span class="text-7xl font-black text-slate-900 dark:text-white tracking-tighter">${pCount}</span>
                            <span class="text-[12px] font-black text-slate-400 uppercase tracking-widest">Gesamt</span>
                        </div>
                    </div>

                    <div class="flex gap-12">
                        <div>
                            <p class="text-[12px] font-black text-brandRed uppercase italic mb-1">A</p>
                            <p class="text-4xl font-black italic text-slate-800 dark:text-slate-200">${aCount}</p>
                        </div>
                        <div>
                            <p class="text-[12px] font-black text-slate-400 uppercase italic mb-1">UA</p>
                            <p class="text-4xl font-black italic text-slate-800 dark:text-slate-200">${uaCount}</p>
                        </div>
                        <div>
                            <p class="text-[12px] font-black text-slate-400 uppercase italic mb-1">TV</p>
                            <p class="text-4xl font-black italic text-slate-800 dark:text-slate-200">${tvCount}</p>
                        </div>
                    </div>
                </div>

                <div class="border-l-4 border-brandRed pl-8">
                    <div class="flex flex-col mb-8">
                        <p class="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Einsätze 2026</p>
                        <div class="flex items-baseline italic gap-3">
                            <span class="text-7xl font-black text-slate-900 dark:text-white tracking-tighter">${oCount}</span>
                            <span class="text-[12px] font-black text-slate-400 uppercase tracking-widest">Gesamt</span>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-8">
                        <div>
                            <p class="text-[12px] font-black text-brandRed uppercase italic mb-1">Feuer</p>
                            <p class="text-3xl font-black italic text-slate-800 dark:text-slate-200">${feuerCount}</p>
                        </div>
                        <div>
                            <p class="text-[12px] font-black text-slate-400 uppercase italic mb-1">TH</p>
                            <p class="text-3xl font-black italic text-slate-800 dark:text-slate-200">${thCount}</p>
                        </div>
                        <div>
                            <p class="text-[12px] font-black text-slate-400 uppercase italic mb-1">BMA</p>
                            <p class="text-3xl font-black italic text-slate-800 dark:text-slate-200">${bmaCount}</p>
                        </div>
                        <div>
                            <p class="text-[12px] font-black text-slate-400 uppercase italic mb-1">Andere</p>
                            <p class="text-3xl font-black italic text-slate-800 dark:text-slate-200">${sonstigeCount}</p>
                        </div>
                    </div>
                </div>

            </div>

            <div class="mb-12 px-2 flex items-center gap-4 border-t border-slate-100 dark:border-slate-800 pt-8">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stichtag der Auswertung:</p>
                <input type="date" value="${Core.state.globalStichtag}" 
                       onchange="Core.service.updateStichtag(this.value); Core.state.globalStichtag = this.value; Core.router.render()"
                       class="bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-lg font-black italic text-brandRed focus:outline-none cursor-pointer">
            </div>

            ${Core.views.personnel()}
        `;
    },
    // MODULE VIEWS
    personnel: () => Core.views.renderTable("Personalverwaltung", SCHEMA.personnel, Core.state.data.personnel),
    operations: () => Core.views.renderTable("Einsatzdokumentation", SCHEMA.operations, Core.state.data.operations),
    events: () => Core.views.renderTable("Termine & Dienstplan", SCHEMA.events, Core.state.data.events),

    // GENERISCHE TABELLEN-FUNKTION
    renderTable: (title, headers, data) => {
        const searchTerm = Core.state.searchTerm.toLowerCase();
        const filteredData = data.filter(row => 
            Object.values(row).some(val => String(val).toLowerCase().includes(searchTerm))
        );

        return `
            <div class="w-full bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div class="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
                    <h2 class="text-xl font-black italic text-brandRed uppercase tracking-tighter">${title}</h2>
                    <div class="relative w-full md:w-80">
                        <input type="text" id="tableSearch" placeholder="Suchen..." 
                               oninput="Core.ui.handleSearch(this.value)" value="${Core.state.searchTerm}"
                               class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-brandRed outline-none transition-all">
                        ${Core.state.searchTerm ? `<button onclick="Core.ui.resetSearch()" class="absolute right-3 top-2.5 text-slate-400 hover:text-brandRed">✕</button>` : ''}
                    </div>
                </div>
                
                <div class="overflow-x-auto max-h-[600px] scrollbar-hide">
                    <table class="w-full text-left border-collapse">
                        <thead class="sticky-header">
                            <tr class="bg-slate-50 dark:bg-slate-800/50">
                                ${headers.map(h => `<th class="px-6 py-4 text-[10px] font-black italic uppercase text-slate-500 tracking-widest">${h}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody class="text-[11px] font-bold">
                            ${filteredData.map((row, idx) => `
                                <tr class="data-row cursor-pointer" onclick="Core.ui.showDetail('${Core.state.activeModule}', '${row["Pers.Nr."]}')">
                                    ${headers.map(h => {
                                        let val = row[h] || '---';
                                        
                                        // 1. Datums-Formatierung
                                        if (h.includes("Datum") || h === "Eintritt" || h === "Letzte Beförderung") {
                                            val = Core.ui.formatDate(val);
                                        }

                                        // 2. Spezial-Handling: Dienstjahre
                                        if (h === "Dienstjahre") {
                                            val = Core.ui.calculateServiceYears(row["Eintritt"]);
                                        }

                                        // 3. Spezial-Handling: Beförderungs-Badges
                                        if (h === "Beförderung") {
                                            const check = PromotionLogic.check(row, FW_CONFIG);
                                            const currentRule = FW_CONFIG[row["Dienstgrad"]];
                                            const nextRank = currentRule ? currentRule.next : null;

                                            return `
                                                <td class="px-6 py-4">
                                                    <div class="flex flex-col gap-1">
                                                        ${nextRank ? `<span class="text-[8px] uppercase font-black text-slate-400 italic leading-none mb-0.5 tracking-tighter">Ziel: ${nextRank}</span>` : ''}
                                                        <span class="${check.color} px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border shadow-sm inline-block w-fit">
                                                            ${check.status}
                                                        </span>
                                                        ${check.status === "WARTEZEIT" && check.monthsLeft > 0 ? 
                                                            `<span class="text-[8px] text-amber-600 font-black italic ml-1 leading-none">${check.monthsLeft} Mon. verbleibend</span>` : ''}
                                                    </div>
                                                </td>`;
                                        }

                                        // 4. Standard-Zelle
                                        return `<td class="px-6 py-4 text-slate-700 dark:text-slate-300">${val}</td>`;
                                    }).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="p-4 bg-slate-50/50 dark:bg-slate-800/20 text-center">
                    <p class="text-[9px] font-black italic text-slate-400 uppercase tracking-tighter">Gefiltert: ${filteredData.length} von ${data.length} Einträgen</p>
                </div>
            </div>`;
    }
}; // <--- DIESE KLAMMER HAT GEFEHLT
