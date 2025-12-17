let campaigns = [];

document.addEventListener('DOMContentLoaded', () => {
    generateWeeks();
    loadFromLocalStorage();
});

// 1. Weeknummers genereren
function generateWeeks() {
    const header = document.getElementById('weekHeader');
    for (let i = 1; i <= 52; i++) {
        const div = document.createElement('div');
        div.className = 'week-num';
        div.innerText = i;
        header.appendChild(div);
    }
}

// 2. Modal openen (Nieuw of Bewerken)
function openModal(editId = null) {
    const modal = document.getElementById('itemModal');
    const deleteBtn = document.getElementById('deleteBtn');
    modal.style.display = 'flex';

    if (editId) {
        // BEWERKEN MODUS
        const item = campaigns.find(c => c.id === editId);
        document.getElementById('modalTitle').innerText = "Campagne Bewerken";
        document.getElementById('currentId').value = item.id;
        document.getElementById('taskName').value = item.title;
        document.getElementById('taskDesc').value = item.description;
        document.getElementById('startWeek').value = item.startWeek;
        document.getElementById('endWeek').value = item.endWeek;
        deleteBtn.style.display = 'block';
    } else {
        // NIEUW MODUS
        document.getElementById('modalTitle').innerText = "Nieuwe Campagne";
        resetFormFields();
        deleteBtn.style.display = 'none';
    }
}

function closeModal() {
    document.getElementById('itemModal').style.display = 'none';
}

// 3. Opslaan (Nieuw of Update)
function saveTask() {
    const id = document.getElementById('currentId').value;
    const title = document.getElementById('taskName').value;
    const desc = document.getElementById('taskDesc').value;
    const start = parseInt(document.getElementById('startWeek').value);
    const end = parseInt(document.getElementById('endWeek').value);

    if (!title || !start || !end || start > end) {
        alert("Vul alle velden correct in (startweek moet voor eindweek liggen).");
        return;
    }

    if (id) {
        // Update bestaand
        const index = campaigns.findIndex(c => c.id == id);
        campaigns[index] = { ...campaigns[index], title, description: desc, startWeek: start, endWeek: end };
    } else {
        // Voeg nieuwe toe
        const newCampagne = {
            id: Date.now(),
            title,
            description: desc,
            startWeek: start,
            endWeek: end,
            color: `hsl(${Math.floor(Math.random() * 360)}, 65%, 45%)`
        };
        campaigns.push(newCampagne);
    }

    saveAndRefresh();
    closeModal();
}

// 4. Verwijderen
function deleteItem() {
    const id = document.getElementById('currentId').value;
    if (confirm("Weet je zeker dat je deze campagne wilt verwijderen?")) {
        campaigns = campaigns.filter(c => c.id != id);
        saveAndRefresh();
        closeModal();
    }
}

// 5. Renderen naar de tijdlijn
function renderCampaigns() {
    const grid = document.getElementById('timelineGrid');
    grid.innerHTML = '';

    campaigns.sort((a, b) => a.startWeek - b.startWeek);

    campaigns.forEach(item => {
        const span = (item.endWeek - item.startWeek) + 1;
        const bar = document.createElement('div');
        bar.className = 'task-bar';
        bar.innerText = item.title;
        bar.style.backgroundColor = item.color;
        bar.style.gridColumn = `${item.startWeek} / span ${span}`;
        
        // Klikbaar maken voor bewerken
        bar.onclick = () => openModal(item.id);
        
        grid.appendChild(bar);
    });
}

// Opslag & Reset helpers
function saveAndRefresh() {
    localStorage.setItem('marketingPlannerData', JSON.stringify(campaigns));
    renderCampaigns();
}

function loadFromLocalStorage() {
    const data = localStorage.getItem('marketingPlannerData');
    if (data) {
        campaigns = JSON.parse(data);
        renderCampaigns();
    }
}

function resetFormFields() {
    document.getElementById('currentId').value = '';
    document.getElementById('taskName').value = '';
    document.getElementById('taskDesc').value = '';
    document.getElementById('startWeek').value = '';
    document.getElementById('endWeek').value = '';
}

function clearAll() {
    if (confirm("Hele planning wissen? Dit kan niet ongedaan worden gemaakt.")) {
        campaigns = [];
        saveAndRefresh();
    }
}

// Sluit modal bij klik buiten de inhoud
window.onclick = (e) => {
    if (e.target == document.getElementById('itemModal')) closeModal();
};