const firebaseConfig = {
    apiKey: "AIzaSyBarLPNYzRq_A-UBCQDh7VvNyv0Vaq_6u4",
    authDomain: "seizoensplanning.firebaseapp.com",
    databaseURL: "https://seizoensplanning-default-rtdb.firebaseio.com",
    projectId: "seizoensplanning",
    storageBucket: "seizoensplanning.firebasestorage.app",
    messagingSenderId: "951299690860",
    appId: "1:951299690860:web:a415d61fdf1f5e01d46349"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let campaigns = [];
let activeFilters = ['Logistiek', 'Webshop', 'MJFM', 'Outlet', 'Marketing', 'Winkels'];
let currentView = 'week';

const departments = {
    'Logistiek': '#f59e0b', 'Webshop': '#3b82f6', 'MJFM': '#8b5cf6',
    'Outlet': '#ec4899', 'Marketing': '#10b981', 'Winkels': '#6366f1'
};

const monthStructure = [
    { name: 'Januari', days: 31, weeks: 4 }, { name: 'Februari', days: 28, weeks: 4 },
    { name: 'Maart', days: 31, weeks: 5 }, { name: 'April', days: 30, weeks: 4 },
    { name: 'Mei', days: 31, weeks: 4 }, { name: 'Juni', days: 30, weeks: 5 },
    { name: 'Juli', days: 31, weeks: 4 }, { name: 'Augustus', days: 31, weeks: 4 },
    { name: 'September', days: 30, weeks: 5 }, { name: 'Oktober', days: 31, weeks: 4 },
    { name: 'November', days: 30, weeks: 4 }, { name: 'December', days: 31, weeks: 5 }
];

document.addEventListener('DOMContentLoaded', () => {
    switchView('week', document.querySelector('.btn-view.active'));
    createLegend();
    listenToFirebase();
});

function switchView(view, btn) {
    currentView = view;
    document.querySelectorAll('.btn-view').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    const root = document.documentElement;
    if (view === 'day') {
        root.style.setProperty('--column-width', '40px');
        root.style.setProperty('--total-cols', '365');
    } else if (view === 'week') {
        root.style.setProperty('--column-width', '65px');
        root.style.setProperty('--total-cols', '53');
    } else {
        root.style.setProperty('--column-width', '180px');
        root.style.setProperty('--total-cols', '12');
    }
    buildHeaders();
    renderCampaigns();
}

function buildHeaders() {
    const monthHeader = document.getElementById('monthHeader');
    const weekHeader = document.getElementById('weekHeader');
    monthHeader.innerHTML = ''; weekHeader.innerHTML = '';

    if (currentView === 'month') {
        monthHeader.style.display = 'none';
        monthStructure.forEach(m => {
            const el = document.createElement('div'); el.className = 'week-num'; el.innerText = m.name;
            weekHeader.appendChild(el);
        });
    } else {
        monthHeader.style.display = 'grid';
        monthStructure.forEach((m, mIdx) => {
            const el = document.createElement('div'); el.className = 'month-label'; el.innerText = m.name;
            el.style.gridColumn = `span ${currentView === 'day' ? m.days : m.weeks}`;
            monthHeader.appendChild(el);
            
            const count = currentView === 'day' ? m.days : m.weeks;
            for (let i = 1; i <= count; i++) {
                const wEl = document.createElement('div'); wEl.className = 'week-num';
                wEl.innerText = currentView === 'day' ? i : 'W' + i;
                weekHeader.appendChild(wEl);
            }
        });
    }
}

function renderCampaigns() {
    const grid = document.getElementById('timelineGrid');
    grid.innerHTML = '';
    currentView === 'day' ? grid.classList.add('day-view') : grid.classList.remove('day-view');

    const filtered = campaigns.filter(c => activeFilters.includes(c.department));
    const rows = [];
    
    filtered.forEach(item => {
        let start = item.startWeek;
        let end = item.endWeek;
        if (currentView === 'day') { start = (item.startWeek * 7) - 6; end = item.endWeek * 7; }
        if (currentView === 'month') { start = Math.ceil(item.startWeek/4.4); end = Math.ceil(item.endWeek/4.4); }

        let rowIndex = rows.findIndex(row => row.every(p => end < p.start || start > p.end));
        if (rowIndex === -1) { rows.push([{start, end}]); rowIndex = rows.length - 1; } 
        else { rows[rowIndex].push({start, end}); }

        const bar = document.createElement('div');
        bar.className = 'task-bar';
        bar.innerText = item.title;
        bar.style.backgroundColor = item.color;
        bar.style.gridColumn = `${start} / span ${(end - start) + 1}`;
        bar.style.gridRow = rowIndex + 1;
        bar.onclick = () => openModal(item.id);
        grid.appendChild(bar);
    });
}

function listenToFirebase() {
    database.ref('campaigns_2026').on('value', (s) => {
        campaigns = s.val() ? Object.values(s.val()) : [];
        renderCampaigns();
    });
}

function openModal(id = null) {
    document.getElementById('itemModal').style.display = 'flex';
    if (id) {
        const item = campaigns.find(c => c.id == id);
        document.getElementById('currentId').value = item.id;
        document.getElementById('taskName').value = item.title;
        document.getElementById('department').value = item.department;
        document.getElementById('startWeek').value = item.startWeek;
        document.getElementById('endWeek').value = item.endWeek;
        document.getElementById('taskDesc').value = item.description || '';
        document.getElementById('attachmentUrl').value = item.attachmentUrl || '';
        document.getElementById('deleteBtn').style.display = 'block';
        refreshComments(id);
    } else {
        resetModal();
    }
}

function saveTask() {
    const id = document.getElementById('currentId').value || Date.now().toString();
    const data = {
        id, title: document.getElementById('taskName').value,
        department: document.getElementById('department').value,
        startWeek: parseInt(document.getElementById('startWeek').value),
        endWeek: parseInt(document.getElementById('endWeek').value),
        description: document.getElementById('taskDesc').value,
        attachmentUrl: document.getElementById('attachmentUrl').value,
        color: departments[document.getElementById('department').value]
    };
    database.ref('campaigns_2026/' + id).update(data).then(() => closeModal());
}

function addComment() {
    const id = document.getElementById('currentId').value;
    const text = document.getElementById('newComment').value;
    if(!text) return;
    const comment = { text, date: new Date().toLocaleDateString() };
    database.ref(`campaigns_2026/${id}/comments`).push(comment).then(() => {
        document.getElementById('newComment').value = '';
        refreshComments(id);
    });
}

function refreshComments(itemId) {
    const item = campaigns.find(c => c.id == itemId);
    const list = document.getElementById('commentsList');
    list.innerHTML = '';
    if(item && item.comments) {
        Object.values(item.comments).forEach(c => {
            list.innerHTML += `<div><strong>${c.date}:</strong> ${c.text}</div>`;
        });
    }
}

function resetModal() {
    document.getElementById('currentId').value = '';
    document.getElementById('taskName').value = '';
    document.getElementById('startWeek').value = '';
    document.getElementById('endWeek').value = '';
    document.getElementById('taskDesc').value = '';
    document.getElementById('attachmentUrl').value = '';
    document.getElementById('deleteBtn').style.display = 'none';
}

function closeModal() { document.getElementById('itemModal').style.display = 'none'; }
function deleteItem() { 
    const id = document.getElementById('currentId').value;
    database.ref('campaigns_2026/' + id).remove().then(() => closeModal());
}
function createLegend() {
    const leg = document.getElementById('legend');
    Object.keys(departments).forEach(d => {
        leg.innerHTML += `<div class="legend-item" onclick="toggleFilter('${d}')"><div class="legend-color" style="background:${departments[d]}"></div>${d}</div>`;
    });
}
function toggleFilter(d) {
    activeFilters.includes(d) ? activeFilters = activeFilters.filter(f => f !== d) : activeFilters.push(d);
    renderCampaigns();
}