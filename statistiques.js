import { supabase } from './supabaseClient.js';

// Variables globales
let employees = [];

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    initializeEmployeeStats();
    updateStats();
});

// Initialisation des statistiques employés
async function initializeEmployeeStats() {
    await loadEmployees();
    initializeYearSelect();
}

// Charger la liste des employés
async function loadEmployees() {
    const { data, error } = await supabase
        .from('access_code1_fran')
        .select('Nom')
        .order('Nom');

    if (error) {
        console.error("Erreur de récupération des employés :", error);
        return;
    }

    employees = data;
    const employeeSelect = document.getElementById('employeeSelect');
    employeeSelect.innerHTML = '<option value="">Sélectionner un employé</option>';

    data.forEach(employee => {
        const option = document.createElement('option');
        option.value = employee.Nom;
        option.textContent = employee.Nom;
        employeeSelect.appendChild(option);
    });
}

// Initialiser le sélecteur d'année
function initializeYearSelect() {
    const yearSelect = document.getElementById('yearSelect');
    const currentYear = new Date().getFullYear();

    for (let year = currentYear - 5; year <= currentYear + 1; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (year === currentYear) {
            option.selected = true;
        }
        yearSelect.appendChild(option);
    }
}

// Calculer les statistiques employés
async function calculateEmployeeStats() {
    const year = document.getElementById('yearSelect').value;
    const month = document.getElementById('monthSelect').value;
    const employee = document.getElementById('employeeSelect').value;

    if (!year || !month || !employee) {
        alert("Veuillez sélectionner une année, un mois et un employé");
        return;
    }

    await fetchEmployeeStats(year, month, employee);
}

// Récupérer les statistiques employés
async function fetchEmployeeStats(year, month, employee) {
    // Calculer les dates de début et fin du mois
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().slice(0, 10); // Dernier jour du mois

    const { data, error } = await supabase
        .from('event_quot1_fran')
        .select('Date, nombre_heures, Ajouté_pour')
        .gte('Date', startDate)
        .lte('Date', endDate)
        .eq('Ajouté_pour', employee);

    if (error) {
        console.error("Erreur de récupération des données employé :", error);
        return;
    }

    displayEmployeeStats(data, year, month, employee);
}

// Afficher les statistiques employés
function displayEmployeeStats(data, year, month, employee) {
    // Calculer les heures par jour
    const hoursByDay = calculateHoursByDay(data, year, month);

    // Calculer les heures par semaine
    const hoursByWeek = calculateHoursByWeek(data, year, month);

    // Calculer le total du mois
    const monthlyTotal = calculateMonthlyTotal(data);

    displayDailyHours(hoursByDay, employee);
    displayWeeklyHours(hoursByWeek, employee);
    displayMonthlyHours(monthlyTotal, employee, month, year);
}

// Calculer les heures par jour
function calculateHoursByDay(data, year, month) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const hoursByDay = {};

    // Initialiser tous les jours du mois à 0
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${month.padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        hoursByDay[dateStr] = 0;
    }

    // Ajouter les heures réelles
    data.forEach(event => {
        if (event.nombre_heures) {
            hoursByDay[event.Date] = (hoursByDay[event.Date] || 0) + event.nombre_heures;
        }
    });

    return hoursByDay;
}

// Calculer les heures par semaine
function calculateHoursByWeek(data, year, month) {
    const weeks = {};

    data.forEach(event => {
        if (event.nombre_heures) {
            const weekNumber = getWeekNumber(new Date(event.Date));
            const weekKey = `S${weekNumber}`;
            weeks[weekKey] = (weeks[weekKey] || 0) + event.nombre_heures;
        }
    });

    return weeks;
}

// Obtenir le numéro de semaine (ISO)
function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Calculer le total mensuel
function calculateMonthlyTotal(data) {
    return data.reduce((total, event) => {
        return total + (event.nombre_heures || 0);
    }, 0);
}

// Afficher les heures par jour
function displayDailyHours(hoursByDay, employee) {
    let html = `<h4>Heures par jour pour ${employee} :</h4>`;
    html += '<div class="daily-hours-grid">';

    Object.entries(hoursByDay).forEach(([date, hours]) => {
        const dayName = new Date(date).toLocaleDateString('fr-FR', { weekday: 'short' });
        const dayNumber = new Date(date).getDate();
        html += `
            <div class="day-item">
                <span class="day-name">${dayName} ${dayNumber}</span>
                <span class="day-hours">${hours.toFixed(1)}h</span>
            </div>
        `;
    });

    html += '</div>';
    document.getElementById('employeeDailyHours').innerHTML = html;
}

// Afficher les heures par semaine
function displayWeeklyHours(hoursByWeek, employee) {
    let html = `<h4>Heures par semaine pour ${employee} :</h4>`;

    if (Object.keys(hoursByWeek).length === 0) {
        html += '<p>Aucune donnée pour ce mois</p>';
    } else {
        Object.entries(hoursByWeek).forEach(([week, hours]) => {
            html += `<p><strong>${week}</strong> : ${hours.toFixed(1)} heures</p>`;
        });
    }

    document.getElementById('employeeWeeklyHours').innerHTML = html;
}

// Afficher le total mensuel
function displayMonthlyHours(total, employee, month, year) {
    const monthNames = [
        'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    const monthName = monthNames[parseInt(month) - 1];

    const html = `
        <h4>Total mensuel pour ${employee} :</h4>
        <p><strong>${monthName} ${year}</strong> : ${total.toFixed(1)} heures</p>
    `;

    document.getElementById('employeeMonthlyHours').innerHTML = html;
}

// Fonctions existantes (conservées)
async function fetchStats(startDate, endDate) {
    clearResults();

    const { data, error } = await supabase
        .from('event_quot1_fran')
        .select('Nom, Prix, Ajouté_pour')
        .gte('Date', startDate)
        .lte('Date', endDate);

    if (error) {
        console.error("Erreur de récupération :", error);
        return;
    }

    const totalAmount = data.reduce((sum, row) => sum + row.Prix, 0);
    const eventsByPerson = data.reduce((acc, row) => {
        acc[row.Ajouté_pour] = (acc[row.Ajouté_pour] || 0) + 1;
        return acc;
    }, {});

    const spendingByClient = data.reduce((acc, row) => {
        acc[row.Nom] = (acc[row.Nom] || 0) + row.Prix;
        return acc;
    }, {});

    const topClients = Object.entries(spendingByClient)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    displayResults(totalAmount, eventsByPerson, topClients);
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

// Exposer les fonctions globales
window.setLastWeek = setLastWeek;
window.setLastMonth = setLastMonth;
window.setLast30Days = setLast30Days;
window.calculateManualPeriod = calculateManualPeriod;
window.calculateEmployeeStats = calculateEmployeeStats;