function loadAgenda() {
    fetch('journalier.html')
        .then(response => response.text())
        .then(data => {
            document.getElementById('agenda-container').innerHTML = data;
        })
        .catch(error => console.error('Error loading the agenda:', error));
}