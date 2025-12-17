// Jouw Firebase configuratie
const firebaseConfig = {
    apiKey: "AIzaSyBarLPNYzRq_A-UBCQDh7VvNyv0Vaq_6u4",
    authDomain: "seizoensplanning.firebaseapp.com",
    databaseURL: "https://seizoensplanning-default-rtdb.firebaseio.com",
    projectId: "seizoensplanning",
    storageBucket: "seizoensplanning.firebasestorage.app",
    messagingSenderId: "951299690860",
    appId: "1:951299690860:web:a415d61fdf1f5e01d46349"
};

// Initialiseer Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let campaigns = [];
let activeFilters = ['Logistiek', 'Webshop', 'MJFM', 'Outlet', 'Marketing', 'Winkels'];

const departments = {
    'Logistiek': '#f59e0b',
    'Webshop': '#3b82f6',
    'MJFM': '#8b5cf6',
    'Outlet': '#ec4899',
    'Marketing': '#10b981',
    'Winkels': '#6366f1'
};

const monthStructure = [
    { name: 'Januari', weeks: 4 }, { name: 'Februari', weeks: 4 },
    { name: 'Maart', weeks: 5 }, { name: 'April', weeks: 4 },
    { name: 'Mei', weeks: 4 }, { name: 'Juni', weeks: 5 },
    { name: 'Juli', weeks: 4 }, { name: 'Augustus', weeks: 4 },
    { name: 'September', weeks: 5 }, { name: 'Oktober', weeks: 4 },
    { name: 'November', weeks: 4 }, { name: 'December', weeks: 5 }
];

document.addEventListener('DOMContentLoaded', () => {
    buildHeaders();
    createLegend();
    listenToFirebase();
});

function buildHeaders() {
    const monthHeader = document.getElementById('monthHeader');
    const weekHeader = document.getElementById('weekHeader');
    monthHeader.innerHTML = ''; 
    weekHeader.innerHTML = '';
    monthStructure.forEach(m => {
        const el = document.createElement('div');
        el.className = 'month-label';
        el.innerText = m.name;
        el.style.gridColumn = `span ${m.weeks}`;
        monthHeader.appendChild(el);
    });
    for (let i = 1; i <= 52; i++) {
        const el = document.createElement('div');
        el.className = 'week-num';
        el.innerText = i;
        weekHeader.appendChild(el);
    }
}

function createLegend() {
    const legendEl = document.getElementById('legend');
    legendEl.innerHTML = '';
    Object.keys(departments).forEach(dept => {
        const isActive = activeFilters.includes(dept);
        const item = document.createElement('div');
        item.className = `legend-item ${isActive ? 'active' : 'inactive'}`;
        item.innerHTML = `<div class="legend-color" style="background:${departments[dept]}"></div>${dept}`;
        item.onclick = () => {
            if (activeFilters.includes(dept)) activeFilters = activeFilters.filter(f => f !== dept);
            else activeFilters.push(dept);
            if (activeFilters.length === 0) activeFilters = Object.keys(departments);
            createLegend();
            renderCampaigns();
        };
        legendEl.appendChild(item);
    });
}

// Luister live naar wijzigingen van iedereen
function listenToFirebase() {
    database.ref('campaigns').on('value', (snapshot) => {
        const data = snapshot.val();
        campaigns = data ? Object.values(data) : [];
        renderCampaigns();
    });
}

function renderCampaigns() {
    const grid = document.getElementById('timelineGrid');
    grid.innerHTML = '';
    const filtered = campaigns.filter(c => activeFilters.includes(c.department));
    const rows = [];
    
    filtered.sort((a, b) => a.startWeek - b.startWeek).forEach(item => {
        let rowIndex = rows.findIndex(row => row.every(placed => 
            item.endWeek < placed.startWeek || item.startWeek > placed.endWeek
        ));
        if (rowIndex === -1) { rows.push([item]); rowIndex = rows.length - 1; } 
        else { rows[rowIndex].push(item); }

        const span = (item.endWeek - item.startWeek) + 1;
        const bar = document.createElement('div');
        bar.className = 'task-bar';
        bar.innerText = item.title;
        bar.style.backgroundColor = item.color;
        bar.style.gridColumn = `${item.startWeek} / span ${span}`;
        bar.style.gridRow = rowIndex + 1;
        bar.onclick = (e) => { e.stopPropagation(); openModal(item.id); };
        grid.appendChild(bar);
    });
}

function openModal(editId = null) {
    document.getElementById('itemModal').style.display = 'flex';
    if (editId) {
        const item = campaigns.find(c => c.id == editId);
        document.getElementById('modalTitle').innerText = "Item Bewerken";
        document.getElementById('currentId').value = item.id;
        document.getElementById('taskName').value = item.title;
        document.getElementById('department').value = item.department;
        document.getElementById('taskDesc').value = item.description || '';
        document.getElementById('startWeek').value = item.startWeek;
        document.getElementById('endWeek').value = item.endWeek;
        document.getElementById('deleteBtn').style.display = 'block';
    } else {
        document.getElementById('modalTitle').innerText = "Nieuw Item";
        document.getElementById('currentId').value = '';
        document.getElementById('taskName').value = '';
        document.getElementById('taskDesc').value = '';
        document.getElementById('startWeek').value = '';
        document.getElementById('endWeek').value = '';
        document.getElementById('deleteBtn').style.display = 'none';
    }
}

function closeModal() { document.getElementById('itemModal').style.display = 'none'; }

function saveTask() {
    const idValue = document.getElementById('currentId').value;
    const id = idValue ? idValue : Date.now().toString();
    const title = document.getElementById('taskName').value;
    const dept = document.getElementById('department').value;
    const start = parseInt(document.getElementById('startWeek').value);
    const end = parseInt(document.getElementById('endWeek').value);

    if (!title || isNaN(start) || isNaN(end) || start > end) return alert("Check de velden.");

    const data = { 
        id: id, title, department: dept, 
        description: document.getElementById('taskDesc').value, 
        startWeek: start, endWeek: end, color: departments[dept] 
    };

    database.ref('campaigns/' + id).set(data);
    closeModal();
}

function deleteItem() {
    const id = document.getElementById('currentId').value;
    if (id && confirm("Verwijderen?")) {
        database.ref('campaigns/' + id).remove();
        closeModal();
    }
}

window.onclick = (e) => { if (e.target.className === 'modal') closeModal(); };