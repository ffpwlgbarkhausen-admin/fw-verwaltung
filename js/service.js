Core.service = {
    // Hier deine Google Sheets CSV-Export URL eintragen
    // WICHTIG: Die URL muss auf "/export?format=csv" enden!
    url: "https://script.google.com/macros/s/AKfycbxA8lHhtAXoGKTCkN1s4thQH-qWQYeNS3QkySUDpB-2_3mrAuy2cuuWBy4UjR4xpjeR/exec",

    async fetchData() {
        try {
            console.log("Synchronisiere mit Google Sheets...");
            const response = await fetch(this.url);
            
            if (!response.ok) throw new Error("Netzwerk-Antwort war nicht ok");
            
            const csvText = await response.text();
            const rawData = this.parseCSV(csvText);

            // Daten im State verteilen
            // Wir filtern hier direkt nach Modulen, falls du alles in einem Sheet hast, 
            // oder du nutzt verschiedene URLs für verschiedene Tabs.
            Core.state.data.personnel = rawData.filter(row => row.Art === "Personal" || row.Name);
            Core.state.data.operations = rawData.filter(row => row.Einsatznummer || row.Einsatzart);

            console.log("Synchronisation abgeschlossen:", {
                Personal: Core.state.data.personnel.length,
                Einsätze: Core.state.data.operations.length
            });

            // Nach dem Laden: Ersten View rendern
            Core.ui.render();

        } catch (error) {
            console.error("Fehler beim Laden der Daten:", error);
            const viewport = document.getElementById('app-viewport');
            if (viewport) {
                viewport.innerHTML = `
                    <div class="p-10 text-center border-2 border-dashed border-red-200 rounded-2xl">
                        <p class="text-red-500 font-black uppercase italic">Verbindungsfehler</p>
                        <p class="text-xs text-slate-500 mt-2">Die Daten konnten nicht von Google Sheets geladen werden.<br>Prüfe deine Internetverbindung oder die CSV-URL.</p>
                        <button onclick="Core.service.fetchData()" class="mt-4 px-4 py-2 bg-slate-100 rounded-lg text-[10px] font-bold uppercase">Erneut versuchen</button>
                    </div>
                `;
            }
        }
    },

    // Ein robuster CSV-zu-JSON Parser
    parseCSV(text) {
        const lines = text.split(/\r?\n/);
        if (lines.length < 2) return [];

        // Header extrahieren (Erste Zeile)
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        return lines.slice(1).map(line => {
            // Berücksichtigt Kommas innerhalb von Anführungszeichen
            const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
            const row = {};
            
            headers.forEach((header, index) => {
                let val = values[index] ? values[index].trim() : "---";
                // Anführungszeichen entfernen
                val = val.replace(/^"|"$/g, '');
                row[header] = val || "---";
            });
            
            return row;
        }).filter(row => Object.values(row).some(v => v !== "---")); // Leere Zeilen filtern
    }
};
