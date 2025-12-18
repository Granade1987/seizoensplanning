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
    switchView('week', document.querySelector('.btn-view[onclick*="week"]'));
    createLegend();
    listenToFirebase();
});

function switchView(view, btn) {
    currentView = view;
    document.querySelectorAll('.btn-view').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
    
    const root = document.documentElement;
    const grid = document.getElementById('timelineGrid');
    if (view === 'day') {
        root.style.setProperty('--column-width', '35px');
        root.style.setProperty('--total-cols', '365');
        grid.style.maxHeight = '400px';
        grid.style.overflowY = 'auto';
    } else if (view === 'week') {
        root.style.setProperty('--column-width', '60px');
        root.style.setProperty('--total-cols', '53');
        grid.style.maxHeight = '';
        grid.style.overflowY = '';
    } else {
        root.style.setProperty('--column-width', '180px');
        root.style.setProperty('--total-cols', '12');
        grid.style.maxHeight = '';
        grid.style.overflowY = '';
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
            const el = document.createElement('div');
            el.className = 'week-num'; el.innerText = m.name;
            weekHeader.appendChild(el);
        });
    } else if (currentView === 'week') {
        monthHeader.style.display = 'grid';
        monthStructure.forEach(m => {
            const el = document.createElement('div');
            el.className = 'month-label'; el.innerText = m.name;
            el.style.gridColumn = `span ${m.weeks}`;
            monthHeader.appendChild(el);
        });
        for (let i = 1; i <= 53; i++) {
            const el = document.createElement('div');
            el.className = 'week-num'; el.innerText = 'W' + i;
            weekHeader.appendChild(el);
        }
    } else if (currentView === 'day') {
        monthHeader.style.display = 'grid';
        monthStructure.forEach((m, mIdx) => {
            const el = document.createElement('div');
            el.className = 'month-label'; el.innerText = m.name;
            el.style.gridColumn = `span ${m.days}`;
            monthHeader.appendChild(el);
            for (let d = 1; d <= m.days; d++) {
                const date = new Date(2026, mIdx, d);
                const isWeekend = (date.getDay() === 0 || date.getDay() === 6);
                const dEl = document.createElement('div');
                dEl.className = 'week-num' + (isWeekend ? ' weekend' : '');
                dEl.innerText = d;
                weekHeader.appendChild(dEl);
            }
        });
    }
}

function renderCampaigns() {
    const grid = document.getElementById('timelineGrid');
    grid.innerHTML = '';
    
    // Voeg weekend kolommen toe alleen als dagniveau (beperkte hoogte)
    if (currentView === 'day') {
        for (let i = 1; i <= 365; i++) {
            const date = new Date(2026, 0, i);
            if (date.getDay() === 0 || date.getDay() === 6) {
                const col = document.createElement('div');
                col.className = 'weekend-col';
                col.style.left = `${(i-1) * 35}px`;
                grid.appendChild(col);
            }
        }
    }

    const filtered = campaigns.filter(c => activeFilters.includes(c.department));
    const rows = [];
    
    filtered.forEach(item => {
        if (!item.startDate || !item.endDate) return; // Skip oude data zonder datums
        let start, end;
        const startDate = new Date(item.startDate);
        const endDate = new Date(item.endDate);
        if (currentView === 'month') {
            start = startDate.getMonth() + 1;
            end = endDate.getMonth() + 1;
        } else if (currentView === 'day') {
            start = Math.floor((startDate - new Date(2026, 0, 1)) / (1000 * 60 * 60 * 24)) + 1;
            end = Math.floor((endDate - new Date(2026, 0, 1)) / (1000 * 60 * 60 * 24)) + 1;
        } else {
            start = getWeekNumber(startDate);
            end = getWeekNumber(endDate);
        }

        let rowIndex = rows.findIndex(row => row.every(p => end < p.start || start > p.end));
        if (rowIndex === -1) { rows.push([{start, end}]); rowIndex = rows.length - 1; } 
        else { rows[rowIndex].push({start, end}); }

        const bar = document.createElement('div');
        bar.className = 'task-bar';
        const weekInfo = currentView === 'week' ? ` (week ${start}-${end})` : '';
        bar.innerHTML = `<span>${item.title}${weekInfo}</span> ${item.attachmentUrl ? '🔗' : ''}`;
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
    resetModal();
    document.getElementById('startDate').min = '2026-01-01';
    document.getElementById('startDate').max = '2026-12-31';
    document.getElementById('endDate').min = '2026-01-01';
    document.getElementById('endDate').max = '2026-12-31';
    if (id) {
        const item = campaigns.find(c => c.id == id);
        document.getElementById('currentId').value = item.id;
        document.getElementById('taskName').value = item.title;
        document.getElementById('department').value = item.department;
        document.getElementById('taskDesc').value = item.description || '';
        document.getElementById('attachmentUrl').value = item.attachmentUrl || '';
        document.getElementById('startDate').value = item.startDate || '';
        document.getElementById('endDate').value = item.endDate || '';
        document.getElementById('deleteBtn').style.display = 'block';
        refreshCommentsOnly(id);
    }
}

function saveTask() {
    const id = document.getElementById('currentId').value || Date.now().toString();
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    if (!startDate || !endDate) return alert("Vul start en eind datum in.");
    const data = {
        id, title: document.getElementById('taskName').value,
        department: document.getElementById('department').value,
        description: document.getElementById('taskDesc').value,
        attachmentUrl: document.getElementById('attachmentUrl').value,
        startDate: startDate,
        endDate: endDate,
        color: departments[document.getElementById('department').value]
    };
    if(!data.title) return alert("Vul titel in.");
    database.ref('campaigns_2026/' + id).update(data).then(() => {
        alert("Opgeslagen!");
        closeModal();
    }).catch(err => {
        alert("Fout bij opslaan: " + err.message);
    });
}

function addComment() {
    const id = document.getElementById('currentId').value;
    const text = document.getElementById('newComment').value;
    if(!id || !text) return;
    const comment = { text, date: new Date().toLocaleDateString('nl-NL', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'}) };
    database.ref(`campaigns_2026/${id}/comments`).push(comment).then(() => {
        document.getElementById('newComment').value = '';
        refreshCommentsOnly(id);
    });
}

function refreshCommentsOnly(itemId) {
    const item = campaigns.find(c => c.id == itemId);
    const list = document.getElementById('commentsList');
    list.innerHTML = '';
    if(item && item.comments) {
        Object.keys(item.comments).forEach(key => {
            const c = item.comments[key];
            list.innerHTML += `<div style="font-size:12px; margin-bottom:5px; border-bottom:1px solid #eee; display:flex; justify-content:space-between;"><span>${c.date}: ${c.text}</span><span style="cursor:pointer; color:red" onclick="deleteComment('${key}')">&times;</span></div>`;
        });
    }
}

function deleteComment(key) {
    const id = document.getElementById('currentId').value;
    database.ref(`campaigns_2026/${id}/comments/${key}`).remove().then(() => refreshCommentsOnly(id));
}

function deleteItem() {
    const id = document.getElementById('currentId').value;
    if(confirm("Verwijderen?")) database.ref('campaigns_2026/' + id).remove().then(() => closeModal());
}

function openAttachment() {
    const url = document.getElementById('attachmentUrl').value;
    if(url) window.open(url, '_blank');
}

function resetModal() {
    document.getElementById('currentId').value = '';
    document.getElementById('taskName').value = '';
    document.getElementById('taskDesc').value = '';
    document.getElementById('attachmentUrl').value = '';
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('deleteBtn').style.display = 'none';
    document.getElementById('commentsList').innerHTML = '';
}

function closeModal() { document.getElementById('itemModal').style.display = 'none'; }

function createLegend() {
    const leg = document.getElementById('legend');
    leg.innerHTML = '';
    Object.keys(departments).forEach(d => {
        leg.innerHTML += `<div class="legend-item ${activeFilters.includes(d) ? 'active' : 'inactive'}" onclick="toggleFilter('${d}')"><div class="legend-color" style="background:${departments[d]}"></div>${d}</div>`;
    });
}

function toggleFilter(d) {
    activeFilters.includes(d) ? activeFilters = activeFilters.filter(f => f !== d) : activeFilters.push(d);
    createLegend(); renderCampaigns();
}

function getDateFromWeek(week, year) {
    const d = new Date(year, 0, 1);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // naar maandag
    d.setDate(diff + (week - 1) * 7);
    return d;
}

window.onclick = (e) => { if(e.target.className === 'modal') closeModal(); };