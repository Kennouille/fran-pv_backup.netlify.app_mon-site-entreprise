import { supabase } from './supabaseClient.js';

async function fetchStats(startDate, endDate) {
    clearResults(); // Efface les anciens résultats

    const { data, error } = await supabase
        .from('event_quot1_fran')
        .select('Nom, Prix, Ajouté_pour')
        .gte('Date', startDate)
        .lte('Date', endDate);

    if (error) {
        console.error("Erreur de récupération :", error);
        return;
    }

    // Calculer la somme totale des prix
    const totalAmount = data.reduce((sum, row) => sum + row.Prix, 0);

    // Compter les événements ajoutés par chaque personne
    const eventsByPerson = data.reduce((acc, row) => {
        acc[row.Ajouté_pour] = (acc[row.Ajouté_pour] || 0) + 1;
        return acc;
    }, {});

    // Calculer les dépenses totales des clients pour les top 10
    const spendingByClient = data.reduce((acc, row) => {
        acc[row.Nom] = (acc[row.Nom] || 0) + row.Prix;
        return acc;
    }, {});

    const topClients = Object.entries(spendingByClient)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    displayResults(totalAmount, eventsByPerson, topClients); // Affiche les résultats
}

function setLastWeek() {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 7);
    document.getElementById('startDate').value = start.toISOString().slice(0, 10);
    document.getElementById('endDate').value = end.toISOString().slice(0, 10);
    updateStats();
}

function setLastMonth() {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);

    const formattedStart = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
    const formattedEnd = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;

    document.getElementById('startDate').value = formattedStart;
    document.getElementById('endDate').value = formattedEnd;

    updateStats();
}

function setLast30Days() {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    document.getElementById('startDate').value = start.toISOString().slice(0, 10);
    document.getElementById('endDate').value = end.toISOString().slice(0, 10);
    updateStats();
}

function clearResults() {
    document.getElementById('totalAmount').innerText = '';
    document.getElementById('eventsByPerson').innerText = '';
    document.getElementById('topClients').innerText = '';
}

function displayResults(totalAmount, eventsByPerson, topClients) {
    document.getElementById('totalAmount').innerText = `Montant total : ${totalAmount}€`;

    let eventsText = "Nombre de rendez-vous par employé :\n";
    for (const [person, count] of Object.entries(eventsByPerson)) {
        eventsText += `${person} : ${count}\n`;
    }
    document.getElementById('eventsByPerson').innerText = eventsText;

    let clientsText = "Top clients :\n";
    topClients.forEach(([client, amount]) => {
        clientsText += `${client} : ${amount}€\n`;
    });
    document.getElementById('topClients').innerText = clientsText;
}

document.getElementById('startDate').addEventListener('change', updateStats);
document.getElementById('endDate').addEventListener('change', updateStats);

// Nueva función para calcular la estadística manualmente
function calculateManualPeriod() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    if (startDate && endDate) {
        fetchStats(startDate, endDate);
    } else {
        alert("Choisissez les dates de début et de fin de période pour faire le calcul.");
    }
}

async function updateStats() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    if (startDate && endDate) {
        await fetchStats(startDate, endDate);
    }
}

window.setLastWeek = setLastWeek;
window.setLastMonth = setLastMonth;
window.setLast30Days = setLast30Days;
window.calculateManualPeriod = calculateManualPeriod;
