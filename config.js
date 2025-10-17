// Initialisation des codes par défaut
const defaultPageCodes = {
    "Jean": "101",
    "Maria": "102",
    "Luc": "103",
    "Kevin": "104",
    "Mickael": "105",
    "Julie": "106",
    "Bertrand": "107",
    "Anaelle": "108",
    "Richard": "109",
    "Helene": "110",
    "Chef": "2024"
};

// Charger les codes existants ou les valeurs par défaut
function loadPageCodes() {
    const storedCodes = JSON.parse(localStorage.getItem('pageCodes')) || defaultPageCodes;
    const configList = document.getElementById('config-list');
    configList.innerHTML = '';

    Object.keys(storedCodes).forEach(person => {
        // Créer une entrée pour chaque personne
        const personDiv = document.createElement('div');
        personDiv.className = 'person-entry';

        personDiv.innerHTML = `
            <label>Nom :</label>
            <input type="text" name="name" value="${person}" ${person === "Chef" ? "disabled" : ""}>
            <label>Code :</label>
            <input type="text" name="code" value="${storedCodes[person]}">
            <button class="delete-button" onclick="deleteEntry(this)" ${person === "Chef" ? "disabled" : ""}>Supprimer</button>
        `;

        configList.appendChild(personDiv);
    });

    // Ajouter une entrée vide pour l'ajout de nouvelles personnes
    addEmptyEntry();
}

// Ajouter une nouvelle ligne vide pour l'ajout d'une personne
function addEmptyEntry() {
    const configList = document.getElementById('config-list');
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'person-entry';

    emptyDiv.innerHTML = `
        <label>Nom :</label>
        <input type="text" name="name" placeholder="Nom">
        <label>Code :</label>
        <input type="text" name="code" placeholder="Code">
        <button class="delete-button" onclick="deleteEntry(this)">Supprimer</button>
    `;

    configList.appendChild(emptyDiv);
}

// Fonction pour enregistrer les configurations dans le localStorage
function saveConfigurations() {
    const newPageCodes = {};
    const inputs = document.querySelectorAll('#config-list .person-entry');

    inputs.forEach(entry => {
        const name = entry.querySelector('input[name="name"]').value.trim();
        const code = entry.querySelector('input[name="code"]').value.trim();

        if (name && code) { // Si les champs ne sont pas vides
            newPageCodes[name] = code;
        }
    });

    // Sauvegarde dans le localStorage
    localStorage.setItem('pageCodes', JSON.stringify(newPageCodes));
    alert("Les codes d'accès ont été mis à jour avec succès.");
    loadPageCodes(); // Recharger pour mettre à jour l'affichage et retirer les lignes vides
}

// Fonction pour supprimer une entrée
function deleteEntry(button) {
    const entry = button.parentElement;
    const name = entry.querySelector('input[name="name"]').value.trim();

    // Empêche de supprimer l'entrée Chef
    if (name === "Chef") {
        alert("Vous ne pouvez pas supprimer l'accès Chef.");
        return;
    }

    entry.remove();
}

// Avertir en cas de modifications non sauvegardées
let changesMade = false;
// Vérification que le bouton d'enregistrement existe avant d'ajouter un écouteur
document.addEventListener('DOMContentLoaded', () => {
    loadPageCodes();

    const saveButton = document.getElementById('saveButton');
    if (saveButton) {
        saveButton.addEventListener('click', () => {
            saveConfigurations();
            changesMade = false;
        });
    } else {
        console.error("L'élément 'saveButton' est introuvable dans le DOM.");
    }

    document.querySelectorAll('#config-list input').forEach(input => {
        input.addEventListener('input', () => {
            changesMade = true;
        });
    });
});
