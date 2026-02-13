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

        updateStatus(color) {
            const d = document.getElementById('conn-dot');
            if(d) { 
                const colorMap = {
                    'green': 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)]',
                    'orange': 'bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.9)]',
                    'red': 'bg-rose-600 animate-bounce shadow-[0_0_8px_rgba(225,29,72,0.9)]'
                };
                d.className = `absolute -top-1 -right-2 w-2 h-2 rounded-full transition-all duration-500 ${colorMap[color] || 'bg-slate-400'}`;
            }
        },
        
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
        // Optimiert für den Header-Nav
        renderNav() {
            const nav = document.getElementById('main-nav');
            if(!nav) return;
            nav.innerHTML = Core.modules.map(m => `
                <button onclick="Core.router.navigate('${m.id}')" 
                        class="px-4 py-1.5 rounded-xl text-[10px] font-black-italic transition-all duration-300 ${Core.state.activeModule === m.id ? 'nav-active' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}">
                    ${m.label}
                </button>
            `).join('');
        },

        renderTable(title, schema, data) {
            if (!data || data.length === 0) return `<p class="p-8 text-center text-slate-400 italic">Keine Daten vorhanden.</p>`;
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
                                <tr onclick='Core.ui.showDetail("${title}", ${JSON.stringify(row).replace(/'/g, "&apos;")})' 
                                    class="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer">
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
                <button onclick="Core.ui.closeDetail()" class="mb-8 text-brandRed font-black-italic flex items-center gap-2">
                    <span class="text-xl">←</span> Schließen
                </button>
                <h2 class="text-3xl font-black-italic mb-8 animate-logo">${title} Details</h2>
                <div class="space-y-3">
                    ${Object.entries(data).map(([k, v]) => `
                        <div class="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                            <p class="text-[10px] font-black text-slate-400 uppercase italic mb-1">${k}</p>
                            <p class="font-bold text-slate-900 dark:text-white">${v || 'Keine Angabe'}</p>
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

            // Die Überschriften nutzen jetzt 'animate-logo' für den Fade-In Effekt
            if (Core.state.activeModule === 'dashboard') {
                vp.innerHTML = `
                    <h1 class="text-4xl font-black-italic mb-8 animate-logo">Übersicht</h1>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-white">
                        <div class="bg-slate-900 dark:bg-brandRed p-8 rounded-[2rem] shadow-xl relative overflow-hidden group">
                            <div class="relative z-10">
                                <p class="font-black-italic text-white/60">Personal Gesamt</p>
                                <p class="text-7xl font-black italic mt-2">${Core.state.data.personnel.length}</p>
                            </div>
                            <div class="absolute -right-4 -bottom-4 text-900 opacity-10 group-hover:scale-110 transition-transform">
                                <span class="text-9xl">👥</span>
                            </div>
                        </div>
                    </div>`;
            } else if (Core.state.activeModule === 'personnel') {
                vp.innerHTML = `
                    <h1 class="text-4xl font-black-italic mb-8 animate-logo">Personalverwaltung</h1>
                    ${Core.ui.renderTable("Mitglied", SCHEMA.personnel, Core.state.data.personnel)}`;
            } else if (Core.state.activeModule === 'operations') {
                vp.innerHTML = `
                    <h1 class="text-4xl font-black-italic mb-8 animate-logo">Einsatzberichte</h1>
                    ${Core.ui.renderTable("Einsatz", SCHEMA.operations, Core.state.data.operations)}`;
            }
        }
    }
};

// Initialisierung
Core.service.fetchData();


