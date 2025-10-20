import { supabase } from './supabaseClient.js';

// Variables globales
let employees = [];
let eventsByPersonChartInstance = null;
let topClientsChartInstance = null;
let eventsByDayOfWeekChartInstance = null;

// Structure pour l'export
let exportableStats = {
    period: { startDate: '', endDate: '' },
    summaryMetrics: {
        totalAmount: 0, averagePricePerEvent: 0, averageEventsPerDay: 0,
        totalAmountChange: '', averagePricePerEventChange: '', averageEventsPerDayChange: ''
    },
    eventsByPerson: {},
    topClients: [],
    eventsByDayOfWeek: { labels: [], data: [] },
    rawData: []
};

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 DOMContentLoaded - Début initialisation');
    initializeEmployeeStats();

    if (document.getElementById('startDate') && document.getElementById('endDate')) {
        console.log('📝 Initialisation dates seulement');
        setCurrentMonth(); // Remplit les dates
        clearGeneralResults(); // Masque résultats
        console.log('✅ Initialisation terminée - AUCUN calcul automatique');
    }
    console.log('🎯 DOMContentLoaded - Fin initialisation');
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
    console.log('👤 fetchEmployeeStats appelé pour:', employee, month, year);
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

// Afficher les heures par jour avec les totaux
function displayDailyHours(hoursByDay, employee, year, month) {
    let html = `<h4>Calcul des heures pour ${employee} :</h4>`;

    // Grouper les jours par semaine
    const weeks = groupDaysByWeek(hoursByDay, year, month);

    html += `<div class="weeks-with-totals">`;
    html += `<div class="weeks-header">`;
    html += `<div class="days-section">Jours</div>`;
    html += `<div class="total-section">Total heures par semaine</div>`;
    html += `</div>`;

    let monthlyTotal = 0;

    // Afficher chaque semaine en ligne
    weeks.forEach(week => {
        // Calculer le total de la semaine
        const weekTotal = week.days.reduce((total, day) => total + (day.hours || 0), 0);
        monthlyTotal += weekTotal;

        html += `<div class="week-row-with-total">`;

        // Section jours
        html += `<div class="days-section">`;
        html += `<div class="week-label">${week.weekLabel}</div>`;
        html += `<div class="week-days">`;

        // Afficher les 7 jours de la semaine
        week.days.forEach(day => {
            if (day.inMonth) {
                html += `
                    <div class="week-day">
                        <div class="day-name">${day.dayName}</div>
                        <div class="day-number">${day.dayNumber}</div>
                        <div class="day-hours">${day.hours.toFixed(1)}h</div>
                    </div>
                `;
            } else {
                html += `<div class="week-day empty"></div>`;
            }
        });

        html += `</div></div>`;

        // Section total hebdomadaire
        html += `<div class="total-section">`;
        html += `<div class="weekly-total">${weekTotal.toFixed(1)}h</div>`;
        html += `</div>`;

        html += `</div>`;
    });

    html += `</div>`;

    // Total mensuel
    const monthNames = [
        'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    const monthName = monthNames[parseInt(month) - 1];

    html += `<div class="monthly-total">`;
    html += `<strong>Total mensuel pour ${employee} : ${monthName} ${year}</strong> : ${monthlyTotal.toFixed(1)} heures`;
    html += `</div>`;

    document.getElementById('employeeDailyHours').innerHTML = html;
}

// Grouper les jours par semaine avec les jours vides en début de mois
function groupDaysByWeek(hoursByDay, year, month) {
    const weeks = {};
    const monthInt = parseInt(month);
    const yearInt = parseInt(year);

    // Obtenir le premier jour du mois
    const firstDay = new Date(yearInt, monthInt - 1, 1);
    const lastDay = new Date(yearInt, monthInt, 0);

    // Trouver le lundi de la semaine qui contient le 1er du mois
    const weekStart = new Date(firstDay);
    while (weekStart.getDay() !== 1) { // 1 = lundi
        weekStart.setDate(weekStart.getDate() - 1);
    }

    let currentDate = new Date(weekStart);

    // Parcourir toutes les semaines du mois
    while (currentDate <= lastDay || currentDate.getMonth() === monthInt - 1) {
        const weekNumber = getWeekNumberLocal(currentDate);
        const weekKey = `Semaine ${weekNumber}`;

        if (!weeks[weekKey]) {
            weeks[weekKey] = {
                weekLabel: weekKey,
                days: []
            };
        }

        // Ajouter les 7 jours de la semaine
        for (let i = 0; i < 7; i++) {
            const currentDay = new Date(currentDate);
            currentDay.setDate(currentDate.getDate() + i);

            // Vérifier si le jour est dans le mois sélectionné
            if (currentDay.getMonth() === monthInt - 1 && currentDay.getFullYear() === yearInt) {
                const dateStr = `${yearInt}-${monthInt.toString().padStart(2, '0')}-${currentDay.getDate().toString().padStart(2, '0')}`;
                const dayName = currentDay.toLocaleDateString('fr-FR', { weekday: 'short' });
                const hours = hoursByDay[dateStr] || 0;

                weeks[weekKey].days.push({
                    dateStr: dateStr,
                    dayName: dayName,
                    dayNumber: currentDay.getDate(),
                    formattedDate: currentDay.toLocaleDateString('fr-FR'),
                    hours: hours,
                    inMonth: true
                });
            } else {
                // Jour hors du mois (vide)
                weeks[weekKey].days.push({
                    dateStr: '',
                    dayName: '',
                    dayNumber: '',
                    formattedDate: '',
                    hours: 0,
                    inMonth: false
                });
            }
        }

        // Passer à la semaine suivante
        currentDate.setDate(currentDate.getDate() + 7);
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


// Fonctions pour les statistiques générales avancées
function getPreviousPeriodDates(startDateStr, endDateStr) {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    const diffMs = endDate.getTime() - startDate.getTime();
    const periodLengthDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const prevEndDate = new Date(startDate);
    prevEndDate.setDate(startDate.getDate() - 1);
    const prevStartDate = new Date(prevEndDate);
    prevStartDate.setDate(prevEndDate.getDate() - periodLengthDays);
    return {
        prevStartDate: prevStartDate.toISOString().slice(0, 10),
        prevEndDate: prevEndDate.toISOString().slice(0, 10)
    };
}

function formatPercentageChange(current, prev) {
    if (prev === 0) return current > 0 ? '+Inf%' : 'N/A';
    const change = ((current - prev) / prev) * 100;
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
}

async function fetchGeneralStats(startDate, endDate) {
    console.log('🚨 fetchGeneralStats appelé avec:', startDate, '->', endDate);
    console.trace('Stack trace'); // Montre d'où vient l'appel

    clearGeneralResults();
    document.getElementById('loadingIndicator').textContent = 'Chargement des données...';
    document.getElementById('loadingIndicator').style.display = 'block';

    const { data, error } = await supabase
        .from('event_quot1_fran')
        .select('Nom, Prix, Ajouté_pour, Date')
        .gte('Date', startDate)
        .lte('Date', endDate);

    console.log('✅ Réponse Supabase reçue');
    console.log('📊 Données reçues:', data?.length, 'lignes');
    console.log('❌ Erreur:', error);


    document.getElementById('loadingIndicator').style.display = 'none';

    if (error) {
        console.error("Erreur de récupération :", error);
        document.getElementById('totalAmount').innerText = 'Erreur de chargement';
        document.getElementById('averagePricePerEvent').innerText = 'Erreur de chargement';
        document.getElementById('averageEventsPerDay').innerText = 'Erreur de chargement';
        updateComparisonDisplays(0, 0, 0, 0, 0, 0);
        return;
    }

    console.log('🔄 Début traitement données...');
    exportableStats.period.startDate = startDate;
    exportableStats.period.endDate = endDate;
    exportableStats.rawData = data;

    if (data.length === 0) {
        document.getElementById('totalAmount').innerHTML = `Montant total : <span class="value">Aucune donnée</span>`;
        document.getElementById('averagePricePerEvent').innerHTML = `Prix moyen par événement : <span class="value">Aucune donnée</span>`;
        document.getElementById('averageEventsPerDay').innerHTML = `Moyenne événements/jour : <span class="value">Aucune donnée</span>`;
        exportableStats.summaryMetrics = {
            totalAmount: 0, averagePricePerEvent: 0, averageEventsPerDay: 0,
            totalAmountChange: 'N/A', averagePricePerEventChange: 'N/A', averageEventsPerDayChange: 'N/A'
        };
        exportableStats.eventsByPerson = {};
        exportableStats.topClients = [];
        exportableStats.eventsByDayOfWeek = { labels: [], data: [] };
        updateComparisonDisplays(0, 0, 0, 0, 0, 0);
        return;
    }
    console.log('📈 Calcul des métriques...');

    const totalAmount = data.reduce((sum, row) => sum + row.Prix, 0);
    const averagePricePerEvent = data.length > 0 ? totalAmount / data.length : 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const numberOfDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const averageEventsPerDay = numberOfDays > 0 ? data.length / numberOfDays : 0;

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

    const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
    const eventsByDayOfWeek = new Array(7).fill(0);

    data.forEach(row => {
        const [year, month, day] = row.Date.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        let dayIndex = date.getDay();
        if (dayIndex === 0) {
            dayIndex = 6;
        } else {
            dayIndex--;
        }
        eventsByDayOfWeek[dayIndex]++;
    });

    const orderedDayNames = dayNames;
    const orderedEventsByDayOfWeek = eventsByDayOfWeek;

    const { prevStartDate, prevEndDate } = getPreviousPeriodDates(startDate, endDate);
    const { data: prevData, error: prevError } = await supabase
        .from('event_quot1_fran')
        .select('Prix')
        .gte('Date', prevStartDate)
        .lte('Date', prevEndDate);

    let prevTotalAmount = 0;
    let prevAveragePricePerEvent = 0;
    let prevAverageEventsPerDay = 0;

    if (!prevError && prevData.length > 0) {
        prevTotalAmount = prevData.reduce((sum, row) => sum + row.Prix, 0);
        prevAveragePricePerEvent = prevData.length > 0 ? prevTotalAmount / prevData.length : 0;
        const prevStart = new Date(prevStartDate);
        const prevEnd = new Date(prevEndDate);
        const prevDiffTime = Math.abs(prevEnd - prevStart);
        const prevNumberOfDays = Math.ceil(prevDiffTime / (1000 * 60 * 60 * 24)) + 1;
        prevAverageEventsPerDay = prevNumberOfDays > 0 ? prevData.length / prevNumberOfDays : 0;
    }

    exportableStats.summaryMetrics = {
        totalAmount: totalAmount,
        averagePricePerEvent: averagePricePerEvent,
        averageEventsPerDay: averageEventsPerDay,
        totalAmountChange: formatPercentageChange(totalAmount, prevTotalAmount),
        averagePricePerEventChange: formatPercentageChange(averagePricePerEvent, prevAveragePricePerEvent),
        averageEventsPerDayChange: formatPercentageChange(averageEventsPerDay, prevAverageEventsPerDay)
    };
    exportableStats.eventsByPerson = eventsByPerson;
    exportableStats.topClients = topClients;
    exportableStats.eventsByDayOfWeek = {
        labels: orderedDayNames,
        data: orderedEventsByDayOfWeek
    };

    console.log('🎨 Affichage des résultats...');
    displayGeneralResults(totalAmount, averagePricePerEvent, averageEventsPerDay, eventsByPerson, topClients, orderedDayNames, orderedEventsByDayOfWeek);
    updateComparisonDisplays(
        totalAmount, prevTotalAmount,
        averagePricePerEvent, prevAveragePricePerEvent,
        averageEventsPerDay, prevAverageEventsPerDay
    );

    console.log('✅ fetchGeneralStats terminé');
}

// Mise à jour des comparaisons
function updateComparisonDisplays(
    currentTotal, prevTotal,
    currentAvgPrice, prevAvgPrice,
    currentAvgEvents, prevAvgEvents
) {
    const formatChangeForDisplay = (current, prev) => {
        if (prev === 0) return current > 0 ? `<span style="color: green;">+Inf%</span>` : `N/A`;
        const change = ((current - prev) / prev) * 100;
        const color = change >= 0 ? 'green' : 'red';
        const sign = change >= 0 ? '+' : '';
        return `<span style="color: ${color};">${sign}${change.toFixed(2)}%</span> vs période précédente`;
    };

    document.getElementById('totalAmountComparison').innerHTML = formatChangeForDisplay(currentTotal, prevTotal);
    document.getElementById('averagePricePerEventComparison').innerHTML = formatChangeForDisplay(currentAvgPrice, prevAvgPrice);
    document.getElementById('averageEventsPerDayComparison').innerHTML = formatChangeForDisplay(currentAvgEvents, prevAvgEvents);
}

// Affichage des résultats avec graphiques
function displayGeneralResults(totalAmount, averagePricePerEvent, averageEventsPerDay, eventsByPerson, topClients, orderedDayNames, orderedEventsByDayOfWeek) {
    document.getElementById('totalAmount').innerHTML = `Montant total : <span class="value">${totalAmount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>`;
    document.getElementById('averagePricePerEvent').innerHTML = `Prix moyen par événement : <span class="value">${averagePricePerEvent.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</span>`;
    document.getElementById('averageEventsPerDay').innerHTML = `Moyenne événements/jour : <span class="value">${averageEventsPerDay.toFixed(2)}</span>`;

    // Afficher les graphiques
    const chartsContainer = document.querySelector('.charts-container');
    if (chartsContainer) {
        chartsContainer.classList.add('visible');
        chartsContainer.style.display = 'grid';
    }

    // Graphique événements par employé
    const eventsByPersonCtx = document.getElementById('eventsByPersonChart').getContext('2d');
    if (eventsByPersonChartInstance) {
        eventsByPersonChartInstance.destroy();
        eventsByPersonChartInstance = null;
    }

    // S'assurer que le canvas a la bonne taille
    const eventsByPersonCanvas = document.getElementById('eventsByPersonChart');
    eventsByPersonCanvas.style.height = '300px';
    eventsByPersonCanvas.style.width = '100%';

    eventsByPersonChartInstance = new Chart(eventsByPersonCtx, {
        type: 'bar',
        data: {
            labels: Object.keys(eventsByPerson),
            datasets: [{
                label: 'Nombre d\'événements',
                data: Object.values(eventsByPerson),
                backgroundColor: 'rgba(0, 170, 163, 0.7)',
                borderColor: 'rgba(0, 170, 163, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0 }
                }
            },
            plugins: { legend: { display: false } }
        }
    });

    // Graphique top clients
    const topClientsCtx = document.getElementById('topClientsChart').getContext('2d');
    if (topClientsChartInstance) {
        topClientsChartInstance.destroy();
        topClientsChartInstance = null;
    }

    const topClientsCanvas = document.getElementById('topClientsChart');
    topClientsCanvas.style.height = '300px';
    topClientsCanvas.style.width = '100%';

    topClientsChartInstance = new Chart(topClientsCtx, {
        type: 'bar',
        data: {
            labels: topClients.map(client => client[0]),
            datasets: [{
                label: 'Montant dépensé',
                data: topClients.map(client => client[1]),
                backgroundColor: [
                    'rgba(30, 115, 190, 0.7)', 'rgba(0, 170, 163, 0.7)', 'rgba(87, 87, 96, 0.7)',
                    'rgba(255, 99, 132, 0.7)', 'rgba(255, 159, 64, 0.7)', 'rgba(255, 205, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)', 'rgba(153, 102, 255, 0.7)', 'rgba(201, 203, 207, 0.7)'
                ],
                borderColor: [
                    'rgba(30, 115, 190, 1)', 'rgba(0, 170, 163, 1)', 'rgba(87, 87, 96, 1)',
                    'rgba(255, 99, 132, 1)', 'rgba(255, 159, 64, 1)', 'rgba(255, 205, 86, 1)',
                    'rgba(75, 192, 192, 1)', 'rgba(153, 102, 255, 1)', 'rgba(201, 203, 207, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
                        }
                    }
                }
            },
            plugins: { legend: { display: false } }
        }
    });

    // Graphique événements par jour de la semaine
    const eventsByDayOfWeekCtx = document.getElementById('eventsByDayOfWeekChart').getContext('2d');
    if (eventsByDayOfWeekChartInstance) {
        eventsByDayOfWeekChartInstance.destroy();
        eventsByDayOfWeekChartInstance = null;
    }

    const eventsByDayOfWeekCanvas = document.getElementById('eventsByDayOfWeekChart');
    eventsByDayOfWeekCanvas.style.height = '300px';
    eventsByDayOfWeekCanvas.style.width = '100%';

    eventsByDayOfWeekChartInstance = new Chart(eventsByDayOfWeekCtx, {
        type: 'bar',
        data: {
            labels: orderedDayNames,
            datasets: [{
                label: 'Nombre d\'événements',
                data: orderedEventsByDayOfWeek,
                backgroundColor: 'rgba(30, 115, 190, 0.7)',
                borderColor: 'rgba(30, 115, 190, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0 }
                }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// Nettoyage des résultats généraux
function clearGeneralResults() {
    document.getElementById('totalAmount').innerHTML = `Montant total : <span class="value">--</span>`;
    document.getElementById('averagePricePerEvent').innerHTML = `Prix moyen par événement : <span class="value">--</span>`;
    document.getElementById('averageEventsPerDay').innerHTML = `Moyenne événements/jour : <span class="value">--</span>`;
    document.getElementById('totalAmountComparison').innerText = '';
    document.getElementById('averagePricePerEventComparison').innerText = '';
    document.getElementById('averageEventsPerDayComparison').innerText = '';

    // Masquer les graphiques
    const chartsContainer = document.querySelector('.charts-container');
    if (chartsContainer) {
        chartsContainer.style.display = 'none';
    }

    if (eventsByPersonChartInstance) { eventsByPersonChartInstance.destroy(); eventsByPersonChartInstance = null; }
    if (topClientsChartInstance) { topClientsChartInstance.destroy(); topClientsChartInstance = null; }
    if (eventsByDayOfWeekChartInstance) { eventsByDayOfWeekChartInstance.destroy(); eventsByDayOfWeekChartInstance = null; }
}

// Export CSV
function exportDataToCsv() {
    if (exportableStats.rawData.length === 0) {
        alert('Aucune donnée à exporter');
        return;
    }

    let csvContent = '';
    const escapeCsvValue = (value) => {
        if (value === null || value === undefined) return '""';
        let stringValue = String(value);
        if (stringValue.includes('"')) {
            stringValue = stringValue.replace(/"/g, '""');
        }
        return `"${stringValue}"`;
    };

    const formatCurrencyForCsv = (value) => {
        return escapeCsvValue(value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }).replace(/,/g, '.'));
    };

    const formatNumberForCsv = (value, fixed = 0) => escapeCsvValue(value.toFixed(fixed).replace(/,/g, '.'));

    csvContent += '"Rapport Statistiques"\n\n';
    csvContent += '"Période de calcul"\n';
    csvContent += '"Date de début",,"Date de fin"\n';
    csvContent += `${escapeCsvValue(exportableStats.period.startDate)},,${escapeCsvValue(exportableStats.period.endDate)}\n\n`;
    csvContent += '"Métriques de synthèse"\n';
    csvContent += '"Métrique",,,"Valeur actuelle","Évolution"\n';
    csvContent += `${escapeCsvValue('Montant total')},,,${formatCurrencyForCsv(exportableStats.summaryMetrics.totalAmount)},${escapeCsvValue(exportableStats.summaryMetrics.totalAmountChange)}\n`;
    csvContent += `${escapeCsvValue('Prix moyen par événement')},,,${formatCurrencyForCsv(exportableStats.summaryMetrics.averagePricePerEvent)},${escapeCsvValue(exportableStats.summaryMetrics.averagePricePerEventChange)}\n`;
    csvContent += `${escapeCsvValue('Moyenne événements/jour')},,,${formatNumberForCsv(exportableStats.summaryMetrics.averageEventsPerDay, 2)},${escapeCsvValue(exportableStats.summaryMetrics.averageEventsPerDayChange)}\n\n`;
    csvContent += '"Événements par employé"\n';
    csvContent += '"Employé","Nombre d\'événements"\n';
    for (const person in exportableStats.eventsByPerson) {
        csvContent += `${escapeCsvValue(person)},${escapeCsvValue(exportableStats.eventsByPerson[person])}\n`;
    }
    csvContent += '\n';
    csvContent += '"Top clients"\n';
    csvContent += '"Client",,,"Montant dépensé"\n';
    exportableStats.topClients.forEach(client => {
        csvContent += `${escapeCsvValue(client[0])},,,${formatCurrencyForCsv(client[1])}\n`;
    });
    csvContent += '\n';
    csvContent += '"Événements par jour de la semaine"\n';
    csvContent += '"Jour de la semaine","Nombre d\'événements"\n';
    exportableStats.eventsByDayOfWeek.labels.forEach((label, index) => {
        csvContent += `${escapeCsvValue(label)},${escapeCsvValue(exportableStats.eventsByDayOfWeek.data[index])}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `statistiques_${exportableStats.period.startDate}_${exportableStats.period.endDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Export PDF (nécessite les bibliothèques html2canvas et jspdf)
async function exportToPdf() {
    alert('Fonction PDF à implémenter avec html2canvas et jspdf');
    // Implémentation similaire à votre code existant
}

// Période - Mois en cours (ne s'exécute PAS automatiquement)
function setCurrentMonth() {
    console.log('📊 setCurrentMonth appelé (remplissage dates seulement)');
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    document.getElementById('startDate').value = start.toISOString().slice(0, 10);
    document.getElementById('endDate').value = end.toISOString().slice(0, 10);
    // NE PAS appeler updateGeneralStats() automatiquement
    // L'utilisateur devra cliquer sur "Calcul manuel"
}

// Mettre à jour les statistiques générales
async function updateGeneralStats() {
    console.log('🔧 updateGeneralStats appelé');
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    console.log('📅 Dates:', startDate, endDate);

    if (startDate && endDate) {
        if (new Date(startDate) > new Date(endDate)) {
            return;
        }
        await fetchGeneralStats(startDate, endDate);
    }
}

// Calcul manuel pour les statistiques générales
function calculateGeneralManualPeriod() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    if (startDate && endDate) {
        if (new Date(startDate) > new Date(endDate)) {
            alert("La date de début ne peut pas être après la date de fin");
            return;
        }
        fetchGeneralStats(startDate, endDate);
    } else {
        alert("Choisissez les dates de début et de fin de période pour faire le calcul.");
    }
}

// Exposer les fonctions globales
window.setCurrentMonth = setCurrentMonth;
window.calculateGeneralManualPeriod = calculateGeneralManualPeriod;
window.exportDataToCsv = exportDataToCsv;
window.exportToPdf = exportToPdf;
window.calculateManualPeriod = calculateGeneralManualPeriod;

// Fonctions pour les boutons de période des statistiques générales
window.setLastWeek = function() {
    console.log('🔄 setLastWeek appelé MANUELLEMENT');
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 7);
    document.getElementById('startDate').value = start.toISOString().slice(0, 10);
    document.getElementById('endDate').value = end.toISOString().slice(0, 10);
    updateGeneralStats();
};

window.setLastMonth = function() {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const end = new Date(today.getFullYear(), today.getMonth(), 0);

    const formattedStart = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
    const formattedEnd = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;

    document.getElementById('startDate').value = formattedStart;
    document.getElementById('endDate').value = formattedEnd;
    updateGeneralStats();
};

window.setLast30Days = function() {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    document.getElementById('startDate').value = start.toISOString().slice(0, 10);
    document.getElementById('endDate').value = end.toISOString().slice(0, 10);
    updateGeneralStats();
};

// Fonction pour les statistiques employés
window.calculateEmployeeStats = calculateEmployeeStats;