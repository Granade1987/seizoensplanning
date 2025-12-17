let campaigns = [];

const departments = {
    'Logistiek': '#f59e0b',
    'Webshop': '#3b82f6',
    'MJFM': '#8b5cf6',
    'Outlet': '#ec4899',
    'Marketing': '#10b981',
    'Winkels': '#6366f1'
};

const months = [
    { name: 'Januari', weeks: 4 }, { name: 'Februari', weeks: 4 },
    { name: 'Maart', weeks: 5 }, { name: 'April', weeks: 4 },
    { name: 'Mei', weeks: 4 }, { name: 'Juni', weeks: 5 },
    { name: 'Juli', weeks: 4 }, { name: 'Augustus', weeks: 4 },
    { name: 'September', weeks: 5 }, { name: 'Oktober', weeks: 4 },
    { name: 'November', weeks: 4 }, { name: 'December', weeks: 5 }
];

document.addEventListener('DOMContentLoaded', () => {
    initTimelineHeaders();
    createLegend();
    loadData();
});

function initTimelineHeaders() {
    const monthHeader = document.getElementById('monthHeader');
    const weekHeader = document.getElementById('weekHeader');

    // Maanden genereren
    months.forEach(m => {
        const div = document.createElement('div');
        div.className = 'month-label';
        div.innerText = m.name;
        div.style.gridColumn = `span ${m.weeks}`;
        monthHeader.appendChild(div);
    });

    // Weken genereren (1-52)
    for (let i = 1; i <= 52; i++) {
        const div = document.createElement('div');
        div.className = 'week-num';
        div.innerText = i;
        weekHeader.appendChild(div);
    }
}

function createLegend() {
    const legendEl = document.getElementById('legend');
    for (const [dept, color] of Object.entries(departments)) {
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.innerHTML = `<div class="legend-color" style="background:${color}"></div>${dept}`;
        legendEl.appendChild(item);
    }
}

function openModal(editId = null) {
    document.getElementById('itemModal').style.display = 'flex';
    if (editId) {
        const item = campaigns.find(c => c.id === editId);
        document.getElementById('modalTitle').innerText = "Item Bewerken";
        document.getElementById('currentId').value = item.id;
        document.getElementById('taskName').value = item.title;
        document.getElementById('department').value = item.department;
        document.getElementById('taskDesc').value = item.description;
        document.getElementById('startWeek').value = item.startWeek;
        document.getElementById('endWeek').value = item.endWeek;
        document.getElementById('deleteBtn').style.display = 'block';
    } else {
        document.getElementById('modalTitle').innerText = "Nieuw Item Toevoegen";
        resetForm();
        document.getElementById('deleteBtn').style.display = 'none';
    }
}

function closeModal() { document.getElementById('itemModal').style.display = 'none'; }

function saveTask() {
    const id = document.getElementById('currentId').value;
    const title = document.getElementById('taskName').value;
    const dept = document.getElementById('department').value;
    const desc = document.getElementById('taskDesc').value;
    const start = parseInt(document.getElementById('startWeek').value);
    const end = parseInt(document.getElementById('endWeek').value);

    if (!title || !start || !end || start > end) {
        alert("Vul alle velden correct in.");
        return;
    }

    const taskObj = { title, department: dept, description: desc, startWeek: start, endWeek: end, color: departments[dept] };

    if (id) {
        const index = campaigns.findIndex(c => c.id == id);
        campaigns[index] = { ...campaigns[index], ...taskObj };
    } else {
        campaigns.push({ id: Date.now(), ...taskObj });
    }

    saveAndRender();
    closeModal();
}

function deleteItem() {
    const id = document.getElementById('currentId').value;
    if (confirm("Item verwijderen?")) {
        campaigns = campaigns.filter(c => c.id != id);
        saveAndRender();
        closeModal();
    }
}

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
        bar.onclick = () => openModal(item.id);
        grid.appendChild(bar);
    });
}

function saveAndRender() {
    localStorage.setItem('marketingPlanner_v3', JSON.stringify(campaigns));
    renderCampaigns();
}

function loadData() {
    const data = localStorage.getItem('marketingPlanner_v3');
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
}

window.onclick = (e) => { if (e.target == document.getElementById('itemModal')) closeModal(); };