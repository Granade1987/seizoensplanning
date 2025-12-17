let campaigns = [];

// Definitie van afdelingen en kleuren
const departments = {
    'Logistiek': '#f59e0b',
    'Webshop': '#3b82f6',
    'MJFM': '#8b5cf6',
    'Outlet': '#ec4899',
    'Marketing': '#10b981',
    'Winkels': '#6366f1'
};

document.addEventListener('DOMContentLoaded', () => {
    initWeeks();
    createLegend();
    loadData();
});

// Genereer week-header (1-52)
function initWeeks() {
    const header = document.getElementById('weekHeader');
    for (let i = 1; i <= 52; i++) {
        const div = document.createElement('div');
        div.className = 'week-num';
        div.innerText = i;
        header.appendChild(div);
    }
}

// Genereer de legenda op basis van de afdelingen
function createLegend() {
    const legendEl = document.getElementById('legend');
    for (const [dept, color] of Object.entries(departments)) {
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.innerHTML = `<div class="legend-color" style="background:${color}"></div>${dept}`;
        legendEl.appendChild(item);
    }
}

// Modal handling
function openModal(editId = null) {
    const modal = document.getElementById('itemModal');
    const deleteBtn = document.getElementById('deleteBtn');
    modal.style.display = 'flex';

    if (editId) {
        const item = campaigns.find(c => c.id === editId);
        document.getElementById('modalTitle').innerText = "Item Bewerken";
        document.getElementById('currentId').value = item.id;
        document.getElementById('taskName').value = item.title;
        document.getElementById('department').value = item.department;
        document.getElementById('taskDesc').value = item.description;
        document.getElementById('startWeek').value = item.startWeek;
        document.getElementById('endWeek').value = item.endWeek;
        deleteBtn.style.display = 'block';
    } else {
        document.getElementById('modalTitle').innerText = "Nieuw Item Toevoegen";
        resetForm();
        deleteBtn.style.display = 'none';
    }
}

function closeModal() {
    document.getElementById('itemModal').style.display = 'none';
}

// Opslaan (Create of Update)
function saveTask() {
    const id = document.getElementById('currentId').value;
    const title = document.getElementById('taskName').value;
    const dept = document.getElementById('department').value;
    const desc = document.getElementById('taskDesc').value;
    const start = parseInt(document.getElementById('startWeek').value);
    const end = parseInt(document.getElementById('endWeek').value);

    if (!title || !start || !end || start > end) {
        alert("Vul alle velden correct in. Startweek mag niet na eindweek liggen.");
        return;
    }

    const taskObj = {
        title,
        department: dept,
        description: desc,
        startWeek: start,
        endWeek: end,
        color: departments[dept]
    };

    if (id) {
        const index = campaigns.findIndex(c => c.id == id);
        campaigns[index] = { ...campaigns[index], ...taskObj };
    } else {
        campaigns.push({ id: Date.now(), ...taskObj });
    }

    saveAndRender();
    closeModal();
}

// Verwijder één specifiek item
function deleteItem() {
    const id = document.getElementById('currentId').value;
    if (confirm("Wil je dit item definitief verwijderen?")) {
        campaigns = campaigns.filter(c => c.id != id);
        saveAndRender();
        closeModal();
    }
}

// Render alles naar de grid
function renderCampaigns() {
    const grid = document.getElementById('timelineGrid');
    grid.innerHTML = '';

    // Sorteer op startweek voor een netter overzicht
    campaigns.sort((a, b) => a.startWeek - b.startWeek);

    campaigns.forEach(item => {
        const span = (item.endWeek - item.startWeek) + 1;
        const bar = document.createElement('div');
        bar.className = 'task-bar';
        bar.innerText = item.title;
        bar.title = `${item.department}: ${item.description} (W${item.startWeek}-W${item.endWeek})`;
        bar.style.backgroundColor = item.color;
        bar.style.gridColumn = `${item.startWeek} / span ${span}`;
        
        bar.onclick = () => openModal(item.id);
        grid.appendChild(bar);
    });
}

// Storage management
function saveAndRender() {
    localStorage.setItem('marketingPlanner_final', JSON.stringify(campaigns));
    renderCampaigns();
}

function loadData() {
    const data = localStorage.getItem('marketingPlanner_final');
    if (data) {
        campaigns = JSON.parse(data);
        renderCampaigns();
    }
}

function resetForm() {
    document.getElementById('currentId').value = '';
    document.getElementById('taskName').value = '';
    document.getElementById('taskDesc').value = '';
    document.getElementById('startWeek').value = '';
    document.getElementById('endWeek').value = '';
    document.getElementById('department').selectedIndex = 0;
}

// Sluit modal bij klik buiten window
window.onclick = (e) => {
    if (e.target == document.getElementById('itemModal')) closeModal();
};