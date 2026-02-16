Core.service = {
    async fetchData() {
        const URL = "DEINE_GOOGLE_SHEETS_CSV_URL"; // Ersetze mich!
        try {
            const response = await fetch(URL);
            const csvText = await response.text();
            // Hier folgt dein CSV-Parser (Papaparse oder ähnliches)
            // Beispielhafter Store:
            // Core.state.data.personnel = parsedData;
            Core.ui.render();
        } catch (e) {
            console.error("Datenfehler:", e);
        }
    }
};
