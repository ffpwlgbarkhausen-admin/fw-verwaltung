const FW_CONFIG = {
    "Feuerwehrmann-Anwärter": { next: "Feuerwehrmann", req: ["TM1"], years: 1 },
    "Feuerwehrmann": { next: "Oberfeuerwehrmann", req: ["Sprechfunker", "AGT"], years: 2 },
    "Oberfeuerwehrmann": { next: "Hauptfeuerwehrmann", req: ["Truppführer"], years: 5 },
    // Erweitere diese Liste nach deiner Laufbahnverordnung
};

const SCHEMA = {
    personnel: ["Pers.Nr.", "Name", "Vorname", "Abteilung", "Eintritt", "Dienstgrad", "Beförderung"],
    operations: ["Einsatznummer", "Datum", "Einsatz Art", "Einsatz Ort", "Stunden", "AnzahlPers", "Erstattung"]
};

const Core = {
    state: {
        activeModule: 'personnel',
        data: { personnel: [], operations: [], events: [] },
        searchTerm: '',
        globalStichtag: new Date().toISOString().split('T')[0],
        selectedYear: 'all'
    },
    
    router: {
        navigate(module) {
            Core.state.activeModule = module;
            Core.ui.render();
        }
    }
};

const PromotionLogic = {
    check(member, config) {
        const currentRank = member["Dienstgrad"];
        const rule = config[currentRank];
        if (!rule) return { status: "MAX", color: "bg-slate-100 text-slate-400 border-slate-200" };

        const stichtag = new Date(Core.state.globalStichtag);
        const lastPromotion = new Date(member["letzte Beförderung"] || member["Eintritt"]);
        
        const diffTime = Math.abs(stichtag - lastPromotion);
        const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30.44));
        const requiredMonths = rule.years * 12;

        const hasLehrgaenge = rule.req.every(req => 
            Object.values(member).some(val => String(val).includes(req))
        );

        if (diffMonths >= requiredMonths && hasLehrgaenge) {
            return { status: "BEREIT", color: "bg-emerald-500 text-white border-emerald-600" };
        }
        
        return { 
            status: "WARTEZEIT", 
            monthsLeft: Math.max(0, requiredMonths - diffMonths),
            color: "bg-amber-100 text-amber-700 border-amber-200" 
        };
    }
};
