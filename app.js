// 1. Genereer weeknummers 1 t/m 52
const weekHeader = document.getElementById('weekHeader');
for (let i = 1; i <= 52; i++) {
    const div = document.createElement('div');
    div.className = 'week-num';
    div.innerText = i;
    weekHeader.appendChild(div);
}

// 2. Functie om een taak toe te voegen
function addTask() {
    const name = document.getElementById('taskName').value;
    const start = parseInt(document.getElementById('startWeek').value);
    const duration = parseInt(document.getElementById('duration').value);
    const grid = document.getElementById('timelineGrid');

    if (!name || isNaN(start) || isNaN(duration)) {
        alert("Vul alle velden in");
        return;
    }

    // Maak het balkje
    const bar = document.createElement('div');
    bar.className = 'task-bar';
    bar.innerText = name;

    // Positionering via CSS Grid!
    // grid-column: start / eind
    bar.style.gridColumn = `${start} / span ${duration}`;

    grid.appendChild(bar);

    // Reset velden
    document.getElementById('taskName').value = '';
}