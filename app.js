// Opslag voor onze campagnes
let campaigns = [];

// Start de applicatie
document.addEventListener('DOMContentLoaded', () => {
    generateWeekHeader();
    loadFromStorage();
});

// 1. Maak de weeknummers bovenin
function generateWeekHeader() {
    const header = document.getElementById('weekHeader');
    for (let i = 1; i <= 52; i++) {
        const week = document.createElement('div');
        week.className = 'week-num';
        week.innerText = i;
        header.appendChild(week);
    }
}

// 2. Open/Sluit modal
function openModal() {
    document.getElementById('itemModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('itemModal').style.display = 'none';
    clearForm();
}

// 3. Campagne toevoegen
function addTask() {
    const title = document.getElementById('taskName').value;
    const desc = document.getElementById('taskDesc').value;
    const start = parseInt(document.getElementById('startWeek').value);
    const end = parseInt(document.getElementById('endWeek').value);

    if (!title || !start || !end) {
        alert("Vul alle velden in a.u.b.");
        return;
    }

    if (start > end || start < 1 || end > 52) {
        alert("Ongeldige weeknummers (kies 1 t/m 52)");
        return;
    }

    // Maak nieuw object
    const newCampagne = {
        id: Date.now(),
        title: title,
        description: desc,
        startWeek: start,
        endWeek: end,
        color: `hsl(${Math.floor(Math.random() * 360)}, 65%, 45%)`
    };

    campaigns.push(newCampagne);
    saveToStorage();
    renderCampaigns();
    closeModal();
}

// 4. Teken alle campagnes in de grid
function renderCampaigns() {
    const grid = document.getElementById('timelineGrid');
    grid.innerHTML = ''; // Reset de grid

    campaigns.sort((a, b) => a.startWeek - b.startWeek); // Sorteer op tijd

    campaigns.forEach(item => {
        const span = (item.endWeek - item.startWeek) + 1;
        const bar = document.createElement('div');
        bar.className = 'task-bar';
        bar.innerText = item.title;
        bar.title = `${item.title}\nWeek ${item.startWeek} - ${item.endWeek}\n${item.description}`;
        
        bar.style.backgroundColor = item.color;
        bar.style.gridColumn = `${item.startWeek} / span ${span}`;
        
        grid.appendChild(bar);
    });
}

// 5. Lokale Opslag functies
function saveToStorage() {
    localStorage.setItem('marketingPlannerData', JSON.stringify(campaigns));
}

function loadFromStorage() {
    const data = localStorage.getItem('marketingPlannerData');
    if (data) {
        campaigns = JSON.parse(data);
        renderCampaigns();
    }
}

function clearAll() {
    if (confirm("Weet je zeker dat je de gehele planning wilt wissen? Dit kan niet ongedaan worden gemaakt.")) {
        campaigns = [];
        localStorage.removeItem('marketingPlannerData');
        renderCampaigns();
    }
}

function clearForm() {
    document.getElementById('taskName').value = '';
    document.getElementById('taskDesc').value = '';
    document.getElementById('startWeek').value = '';
    document.getElementById('endWeek').value = '';
}

// Klik buiten modal om te sluiten
window.onclick = function(event) {
    const modal = document.getElementById('itemModal');
    if (event.target == modal) closeModal();
}