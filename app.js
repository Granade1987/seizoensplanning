document.addEventListener('DOMContentLoaded', () => {
    initWeeks();
});

// 1. Genereer de 52 weken in de header
function initWeeks() {
    const weekHeader = document.getElementById('weekHeader');
    for (let i = 1; i <= 52; i++) {
        const div = document.createElement('div');
        div.className = 'week-num';
        div.innerText = i;
        weekHeader.appendChild(div);
    }
}

// 2. Modal open/dicht
function openModal() {
    document.getElementById('itemModal').style.display = 'flex';
    document.getElementById('taskName').focus();
}

function closeModal() {
    document.getElementById('itemModal').style.display = 'none';
    resetForm();
}

function resetForm() {
    document.getElementById('taskName').value = '';
    document.getElementById('taskDesc').value = '';
    document.getElementById('startWeek').value = '';
    document.getElementById('endWeek').value = '';
}

// 3. Item toevoegen
function addTask() {
    const title = document.getElementById('taskName').value;
    const desc = document.getElementById('taskDesc').value;
    const start = parseInt(document.getElementById('startWeek').value);
    const end = parseInt(document.getElementById('endWeek').value);
    const grid = document.getElementById('timelineGrid');

    // Validatie
    if (!title || isNaN(start) || isNaN(end)) {
        alert("Vul alle velden in.");
        return;
    }
    if (start < 1 || end > 52 || start > end) {
        alert("Kies een geldige weekreeks (1-52).");
        return;
    }

    // Bereken breedte (span)
    const span = (end - start) + 1;

    // Maak HTML element
    const bar = document.createElement('div');
    bar.className = 'task-bar';
    bar.innerText = title;
    
    // Tooltip met extra info
    bar.title = `Project: ${title}\nWeek: ${start} t/m ${end}\nInfo: ${desc}`;

    // Kleur: We gebruiken een vrolijke kleur op basis van een willekeurig getal
    const hue = Math.floor(Math.random() * 360);
    bar.style.backgroundColor = `hsl(${hue}, 70%, 45%)`;
    bar.style.borderLeft = `5px solid hsl(${hue}, 70%, 30%)`;

    // CSS Grid positionering
    bar.style.gridColumn = `${start} / span ${span}`;

    // Toevoegen aan de grid
    grid.appendChild(bar);

    // Klaar! Sluit popup
    closeModal();
}

// Klik buiten modal om te sluiten
window.onclick = function(event) {
    const modal = document.getElementById('itemModal');
    if (event.target == modal) {
        closeModal();
    }
}