Core.views = {
    personnel: () => {
        const data = Core.state.data.personnel;
        return `
            <div class="space-y-4">
                <div class="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div>
                        <p class="text-xs font-bold text-slate-400 uppercase">Personalstand</p>
                        <p class="text-3xl font-black italic text-slate-900">${data.length}</p>
                    </div>
                    <input type="date" value="${Core.state.globalStichtag}" onchange="Core.state.globalStichtag = this.value; Core.ui.render()" class="bg-slate-100 p-2 rounded-lg font-bold text-brandRed">
                </div>
                ${Core.ui.renderTable("Personalverwaltung", SCHEMA.personnel, data)}
            </div>
        `;
    },

    operations: () => {
        const rawData = Core.state.data.operations;
        const uniqueData = Core.ui.getUniqueEinsatzData(rawData, Core.state.selectedYear);
        return `
            <div class="space-y-4">
                <div class="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex justify-between">
                    <h2 class="text-xl font-black italic">Einsatz-Statistik</h2>
                    <select onchange="Core.state.selectedYear = this.value; Core.ui.render()" class="bg-slate-100 p-2 rounded-lg">
                        <option value="all">Alle Jahre</option>
                        <option value="2025">2025</option>
                        <option value="2024">2024</option>
                    </select>
                </div>
                ${Core.ui.renderTable("Einsatzdokumentation", SCHEMA.operations, uniqueData)}
            </div>
        `;
    }
};
