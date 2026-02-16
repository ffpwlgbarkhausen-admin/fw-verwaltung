const SCHEMA = {
    personnel: ["Pers.Nr.", "Name", "Vorname", "Dienstgrad", "Abteilung", "Eintritt", "Dienstjahre", "Beförderung"],
    operations: ["Einsatznummer", "Datum", "Einsatz Art", "AnzahlPers", "Stunden", "Erstattung"],
    events: ["Datum", "Thema", "Typ", "Leitung"]
};

const FW_CONFIG = {
    "FMA/FFA": { next: "FM/FF", req: ["Eintritt"], years: 0 },
    "FM/FF": { next: "OFM/OFF", req: ["Grundausbildung"], years: 2 },
    "OFM/OFF": { next: "HFM/HFF", req: [], years: 5 },
    "HFM/HFF": { next: "UBM", req: ["Truppführer"], years: 1 },
    "UBM": { next: "BM", req: ["Gruppenführer"], years: 2 },
    "BM": { next: "OBM", req: [], years: 2 },
    "OBM": { next: "HBM", req: [], years: 5 },
    "HBM": { next: "BI", req: ["Zugführer"], years: 0 },
    "BI": { next: "BOI", req: ["Verbandsführer 1"], years: 0 },
    "BOI": { next: "StBI", req: ["Verbandsführer 2"], years: 0 },
    "StBI": { next: null, req: [], years: 0 }
};

const Core = {
    state: {
        activeModule: 'dashboard',
        data: { personnel: [], operations: [], events: [] },
        globalStichtag: new Date().toISOString().split('T')[0],
        searchTerm: '',
        selectedYear: 'all'
    },
    
    service: {
        endpoint: 'https://script.google.com/macros/s/AKfycbxA8lHhtAXoGKTCkN1s4thQH-qWQYeNS3QkySUDpB-2_3mrAuy2cuuWBy4UjR4xpjeR/exec',
        // ... (fetchData Logik wie im Original)
    },
    
    router: {
        navigate(id) {
            Core.state.activeModule = id;
            this.render();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        render() {
            const nav = document.getElementById('main-nav');
            if(nav) {
                nav.innerHTML = Core.modules.map(m => `
                <button onclick="Core.router.navigate('${m.id}')" 
                        class="px-4 py-2 md:px-6 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${Core.state.activeModule === m.id ? 'nav-active' : 'text-slate-500 hover:text-slate-900'}">
                    ${m.label}
                </button>`).join('');
            }
            const viewport = document.getElementById('app-viewport');
            if(viewport) viewport.innerHTML = Core.views[Core.state.activeModule]();
        }
    },
    
    modules: [
        { id: 'dashboard', label: 'Übersicht' },
        { id: 'personnel', label: 'Personal' },
        { id: 'operations', label: 'Einsätze' },
        { id: 'events', label: 'Termine' }
    ]
};
