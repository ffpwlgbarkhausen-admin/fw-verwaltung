const SCHEMA = {
    personnel: ["Pers.Nr.", "Name", "Vorname", "Dienstgrad", "Abteilung", "Eintritt", "Dienstjahre", "Beförderung"],
    operations: ["Einsatznummer", "Datum", "Einsatz Art", "Stunden", "Erstattung"]
};

const Core = {
    state: {
        activeModule: 'dashboard',
        data: { personnel: [], operations: [], events: [] },
        globalStichtag: new Date().toISOString().split('T')[0],
        searchTerm: ''
    },

    modules: [
        { id: 'dashboard', label: 'Übersicht', icon: '🏠' },
        { id: 'personnel', label: 'Personal', icon: '👥' },
        { id: 'operations', label: 'Einsätze', icon: '🚒' }
    ],

    service: {
        endpoint: 'https://script.google.com/macros/s/AKfycbxA8lHhtAXoGKTCkN1s4thQH-qWQYeNS3QkySUDpB-2_3mrAuy2cuuWBy4UjR4xpjeR/exec',
        
        async fetchData() {
            try {
                const res = await fetch(`${this.endpoint}?action=read&module=all&t=${Date.now()}`);
                const json = await res.json();
                Core.state.data.personnel = json.personnel || [];
                Core.state.data.operations = json.operations || [];
                if(json.stichtag) Core.state.globalStichtag = json.stichtag.split('T')[0];
                Core.router.render();
            } catch (e) {
                console.error("Fetch Error:", e);
            }
        }
    },

    ui: {
        renderNav() {
            const nav = document.getElementById('main-nav');
            nav.innerHTML = Core.modules.map(m => `
                <button onclick="Core.router.navigate('${m.id}')" 
                        class="flex-1 flex flex-col items-center py-2 rounded-2xl transition-all ${Core.state.activeModule === m.id ? 'nav-active' : 'text-slate-400'}">
                    <span class="text-xl">${m.icon}</span>
                    <span class="text-[9px] font-black uppercase mt-1">${m.label}</span>
                </button>
            `).join('');
        },

        renderTable(title, schema, data) {
            return `
                <div class="overflow-x-auto bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-50 dark:bg-slate-900/50">
                                ${schema.map(s => `<th class="p-4 text-[10px] font-black uppercase text-slate-400 italic">${s}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${data.map(row => `
                                <tr onclick='Core.ui.showDetail("${title}", ${JSON.stringify(row)})' class="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">
                                    ${schema.map(key => `<td class="p-4 text-sm font-semibold">${row[key] || '-'}</td>`).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>`;
        },

        showDetail(title, data) {
            const modal = document.getElementById('detail-modal');
            const content = document.getElementById('modal-content');
            content.innerHTML = `
                <button onclick="Core.ui.closeDetail()" class="mb-8 text-brandRed font-black-italic">← Schließen</button>
                <h2 class="text-3xl font-black-italic mb-8">${title}</h2>
                <div class="space-y-4">
                    ${Object.entries(data).map(([k, v]) => `
                        <div class="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                            <p class="text-[10px] font-black text-slate-400 uppercase">${k}</p>
                            <p class="font-bold text-slate-900 dark:text-white">${v}</p>
                        </div>
                    `).join('')}
                </div>`;
            modal.classList.remove('hidden');
            setTimeout(() => content.classList.remove('translate-x-full'), 10);
        },

        closeDetail() {
            document.getElementById('modal-content').classList.add('translate-x-full');
            setTimeout(() => document.getElementById('detail-modal').classList.add('hidden'), 300);
        }
    },

    router: {
        navigate(mod) {
            Core.state.activeModule = mod;
            this.render();
        },
        render() {
            const vp = document.getElementById('app-viewport');
            Core.ui.renderNav();

            if (Core.state.activeModule === 'dashboard') {
                vp.innerHTML = `<h1 class="text-4xl font-black-italic mb-8">Übersicht</h1>
                                <div class="grid grid-cols-1 gap-4">
                                    <div class="bg-white dark:bg-slate-800 p-8 rounded-[2rem] shadow-sm border-l-8 border-brandRed">
                                        <p class="font-black-italic text-slate-400">Personal</p>
                                        <p class="text-6xl font-black italic">${Core.state.data.personnel.length}</p>
                                    </div>
                                </div>`;
            } else if (Core.state.activeModule === 'personnel') {
                vp.innerHTML = `<h1 class="text-4xl font-black-italic mb-8">Personal</h1>
                                ${Core.ui.renderTable("Mitglied", SCHEMA.personnel, Core.state.data.personnel)}`;
            } else if (Core.state.activeModule === 'operations') {
                vp.innerHTML = `<h1 class="text-4xl font-black-italic mb-8">Einsätze</h1>
                                ${Core.ui.renderTable("Einsatz", SCHEMA.operations, Core.state.data.operations)}`;
            }
        }
    }
};

// Initialisierung
Core.service.fetchData();
