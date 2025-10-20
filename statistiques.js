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
    // Calculer les dates de début et fin du mois (corrigé)
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = `${year}-${month.padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;

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

    // Calculer les heures par semaine (locale) - version corrigée
    const hoursByWeek = calculateHoursByWeekLocal(data, year, month);

    // Calculer le total du mois
    const monthlyTotal = calculateMonthlyTotal(data);

    displayDailyHours(hoursByDay, employee, year, month);
    displayWeeklyHours(hoursByWeek, employee);
    displayMonthlyHours(monthlyTotal, employee, month, year);
}

// Calculer les heures par jour (version simplifiée)
function calculateHoursByDay(data, year, month) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const hoursByDay = {};

    // Initialiser uniquement les jours du mois
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${month.padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        hoursByDay[dateStr] = 0;
    }

    // Ajouter les heures réelles
    data.forEach(event => {
        if (event.nombre_heures) {
            // Extraire directement les parties de la date sans conversion
            const [eventYear, eventMonth, eventDay] = event.Date.split('-');

            // Vérifier que la date est bien dans le mois sélectionné
            if (eventYear == year && eventMonth == month.padStart(2, '0')) {
                const dateStr = event.Date; // Utiliser directement la date de la base
                if (hoursByDay[dateStr] !== undefined) {
                    hoursByDay[dateStr] += event.nombre_heures;
                }
            }
        }
    });

    return hoursByDay;
}

// Calculer les heures par semaine (version corrigée)
function calculateHoursByWeekLocal(data, year, month) {
    const weeks = {};
    const monthInt = parseInt(month);
    const yearInt = parseInt(year);

    // Obtenir toutes les semaines du mois (même celles sans données)
    const allWeeks = getAllWeeksInMonth(yearInt, monthInt);

    // Initialiser toutes les semaines à 0
    allWeeks.forEach(week => {
        weeks[week.key] = 0;
    });

    // Ajouter les heures réelles
    data.forEach(event => {
        if (event.nombre_heures) {
            const eventDate = new Date(event.Date);
            const weekKey = getWeekKeyForDate(eventDate);
            if (weeks[weekKey] !== undefined) {
                weeks[weekKey] += event.nombre_heures;
            }
        }
    });

    return weeks;
}


// Obtenir toutes les semaines du mois (version corrigée)
function getAllWeeksInMonth(year, month) {
    const weeks = [];
    const firstDay = new Date(year, month - 1, 1); // 1er du mois
    const lastDay = new Date(year, month, 0); // Dernier du mois

    let currentDate = new Date(firstDay);

    // Commencer au 1er du mois, pas besoin de reculer
    // Si le 1er n'est pas un lundi, on commence quand même au 1er
    const weekStart = new Date(currentDate);

    // Trouver le lundi de la semaine qui contient le 1er du mois
    while (weekStart.getDay() !== 1) { // 1 = lundi
        weekStart.setDate(weekStart.getDate() - 1);
    }

    currentDate = new Date(weekStart);

    // Avancer semaine par semaine jusqu'à dépasser le mois
    while (currentDate <= lastDay || currentDate.getMonth() === month - 1) {
        const weekStart = new Date(currentDate);
        const weekEnd = new Date(currentDate);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const weekKey = getWeekKey(weekStart, weekEnd);

        weeks.push({
            key: weekKey,
            start: new Date(weekStart),
            end: new Date(weekEnd)
        });

        currentDate.setDate(currentDate.getDate() + 7);
    }

    return weeks;
}

// Générer une clé de semaine
function getWeekKey(start, end) {
    const startStr = formatDateLocal(start);
    const endStr = formatDateLocal(end);
    const weekNumber = getWeekNumberLocal(start);
    return `S${weekNumber} (${startStr} - ${endStr})`;
}

// Obtenir la clé de semaine pour une date
function getWeekKeyForDate(date) {
    const weekStart = getWeekStart(date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return getWeekKey(weekStart, weekEnd);
}

// Obtenir le début de la semaine (lundi) pour une date
function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajuster pour lundi
    const weekStart = new Date(d);
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
}

// Obtenir le numéro de semaine local
function getWeekNumberLocal(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);

    // Premier jour de l'année
    const yearStart = new Date(d.getFullYear(), 0, 1);

    // Ajuster pour que la semaine commence le lundi
    const dayOfWeek = d.getDay();
    const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Lundi=0, Dimanche=6

    // Calculer le numéro de semaine
    const diff = Math.floor((d - yearStart) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.floor((diff + yearStart.getDay() - 1) / 7) + 1;

    return weekNumber;
}

// Formater la date en local (JJ/MM)
function formatDateLocal(date) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month}`;
}

// Calculer le total mensuel
function calculateMonthlyTotal(data) {
    return data.reduce((total, event) => {
        return total + (event.nombre_heures || 0);
    }, 0);
}

// Afficher les heures par jour groupées par semaine
function displayDailyHours(hoursByDay, employee, year, month) {
    let html = `<h4>Heures par jour pour ${employee} :</h4>`;

    // Grouper les jours par semaine
    const weeks = groupDaysByWeek(hoursByDay, year, month);

    // Afficher chaque semaine
    weeks.forEach(week => {
        html += `<div class="week-section">`;
        html += `<h5>${week.weekLabel}</h5>`;
        html += `<div class="week-days-grid">`;

        // Afficher les jours de la semaine
        week.days.forEach(day => {
            html += `
                <div class="week-day-item">
                    <div class="day-header">${day.dayName} ${day.dayNumber}</div>
                    <div class="day-hours">${day.hours.toFixed(1)}h</div>
                    <div class="day-date">${day.formattedDate}</div>
                </div>
            `;
        });

        html += `</div></div>`;
    });

    document.getElementById('employeeDailyHours').innerHTML = html;
}

// Grouper les jours par semaine
function groupDaysByWeek(hoursByDay, year, month) {
    const weeks = {};
    const monthInt = parseInt(month);
    const yearInt = parseInt(year);

    // Obtenir tous les jours du mois
    const daysInMonth = new Date(yearInt, monthInt, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${yearInt}-${monthInt.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const dateObj = new Date(yearInt, monthInt - 1, day);

        // Obtenir la semaine
        const weekNumber = getWeekNumberLocal(dateObj);
        const weekKey = `Semaine ${weekNumber}`;

        if (!weeks[weekKey]) {
            weeks[weekKey] = {
                weekLabel: weekKey,
                days: []
            };
        }

        const dayName = dateObj.toLocaleDateString('fr-FR', { weekday: 'short' });
        const formattedDate = dateObj.toLocaleDateString('fr-FR');
        const hours = hoursByDay[dateStr] || 0;

        weeks[weekKey].days.push({
            dateStr: dateStr,
            dayName: dayName,
            dayNumber: day,
            formattedDate: formattedDate,
            hours: hours
        });
    }

    // Convertir en tableau et trier par semaine
    return Object.values(weeks).sort((a, b) => {
        const weekA = parseInt(a.weekLabel.replace('Semaine ', ''));
        const weekB = parseInt(b.weekLabel.replace('Semaine ', ''));
        return weekA - weekB;
    });
}

// Obtenir le numéro de semaine local
function getWeekNumberLocal(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);

    // Premier jour de l'année
    const yearStart = new Date(d.getFullYear(), 0, 1);

    // Ajuster pour que la semaine commence le lundi
    const dayOfWeek = d.getDay();
    const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Lundi=0, Dimanche=6

    // Calculer le numéro de semaine
    const diff = Math.floor((d - yearStart) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.floor((diff + yearStart.getDay() - 1) / 7) + 1;

    return weekNumber;
}

// Afficher les heures par semaine (version corrigée)
function displayWeeklyHours(hoursByWeek, employee) {
    let html = `<h4>Heures par semaine pour ${employee} :</h4>`;

    // Trier les semaines par ordre chronologique
    const sortedWeeks = Object.entries(hoursByWeek).sort((a, b) => {
        return a[0].localeCompare(b[0]);
    });

    if (sortedWeeks.length === 0) {
        html += '<p>Aucune donnée pour ce mois</p>';
    } else {
        sortedWeeks.forEach(([week, hours]) => {
            const hoursDisplay = hours > 0 ? hours.toFixed(1) + ' heures' : '0 heure';
            html += `<p><strong>${week}</strong> : ${hoursDisplay}</p>`;
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