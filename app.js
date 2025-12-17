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
    if (view === 'day') {
        root.style.setProperty('--column-width', '35px');
        root.style.setProperty('--total-cols', '365');
    } else if (view === 'week') {
        root.style.setProperty('--column-width', '60px');
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
    } else if (currentView === 'week') {
        monthHeader.style.display = 'grid';
        monthStructure.forEach(m => {
            const el = document.createElement('div'); el.className = 'month-label';
            el.innerText = m.name; el.style.gridColumn = `span ${m.weeks}`;
            monthHeader.appendChild(el);
        });
        for (let i = 1; i <= 53; i++) {
            const el = document.createElement('div'); el.className = 'week-num'; el.innerText = 'W' + i;
            weekHeader.appendChild(el);
        }
    } else if (currentView === 'day') {
        monthHeader.style.display = 'grid';
        monthStructure.forEach((m, mIdx) => {
            const el = document.createElement('div'); el.className = 'month-label';
            el.innerText = m.name; el.style.gridColumn = `span ${m.days}`;
            monthHeader.appendChild(el);
            for (let d = 1; d <= m.days; d++) {
                const dEl = document.createElement('div'); dEl.className = 'week-num'; dEl.innerText = d;
                weekHeader.appendChild(dEl);
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
        let start, end;
        if (currentView === 'month') {
            start = Math.max(1, Math.ceil(item.startWeek / 4.42));
            end = Math.max(1, Math.ceil(item.endWeek / 4.42));
        } else if (currentView === 'day') {
            start = (item.startWeek * 7) - 6; end = item.endWeek * 7;
        } else {
            start = item.startWeek; end = item.endWeek;
        }

        let rowIndex = rows.findIndex(row => row.every(p => end < p.start || start > p.end));
        if (rowIndex === -1) { rows.push([{start, end}]); rowIndex = rows.length - 1; } 
        else { rows[rowIndex].push({start, end}); }

        const bar = document.createElement('div');
        bar.className = 'task-bar';
        bar.innerHTML = `<span>${item.title}</span> ${item.attachmentUrl ? '<span style="margin-left:5px">🔗</span>' : ''}`;
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
    if (id) {
        const item = campaigns.find(c => c.id == id);
        document.getElementById('currentId').value = item.id;
        document.getElementById('taskName').value = item.title;
        document.getElementById('department').value = item.department;
        document.getElementById('taskDesc').value = item.description || '';
        document.getElementById('attachmentUrl').value = item.attachmentUrl || '';
        document.getElementById('startWeek').value = item.startWeek;
        document.getElementById('endWeek').value = item.endWeek;
        document.getElementById('deleteBtn').style.display = 'block';
        refreshComments(id);
    }
}

function saveTask() {
    const id = document.getElementById('currentId').value || Date.now().toString();
    const data = {
        id, title: document.getElementById('taskName').value,
        department: document.getElementById('department').value,
        description: document.getElementById('taskDesc').value,
        attachmentUrl: document.getElementById('attachmentUrl').value,
        startWeek: parseInt(document.getElementById('startWeek').value),
        endWeek: parseInt(document.getElementById('endWeek').value),
        color: departments[document.getElementById('department').value]
    };
    if(!data.title || !data.startWeek) return alert("Vul titel en startweek in.");
    database.ref('campaigns_2026/' + id).update(data).then(() => closeModal());
}

function addComment() {
    const id = document.getElementById('currentId').value;
    const text = document.getElementById('newComment').value;
    if(!id || !text) return;
    const comment = { text, date: new Date().toLocaleDateString('nl-NL', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'}) };
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
        Object.keys(item.comments).forEach(key => {
            const c = item.comments[key];
            list.innerHTML += `<div style="margin-bottom:8px; padding-bottom:4px; border-bottom:1px solid #eee;">
                <strong>${c.date}:</strong> ${c.text}
            </div>`;
        });
    }
}

function deleteItem() {
    const id = document.getElementById('currentId').value;
    if(confirm("Item definitief verwijderen?")) {
        database.ref('campaigns_2026/' + id).remove().then(() => closeModal());
    }
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
    document.getElementById('startWeek').value = '';
    document.getElementById('endWeek').value = '';
    document.getElementById('deleteBtn').style.display = 'none';
    document.getElementById('commentsList').innerHTML = '';
}

function closeModal() { document.getElementById('itemModal').style.display = 'none'; }

function createLegend() {
    const leg = document.getElementById('legend');
    leg.innerHTML = '';
    Object.keys(departments).forEach(d => {
        leg.innerHTML += `<div class="legend-item" onclick="toggleFilter('${d}')">
            <div class="legend-color" style="background:${departments[d]}"></div>${d}
        </div>`;
    });
}

function toggleFilter(d) {
    activeFilters.includes(d) ? activeFilters = activeFilters.filter(f => f !== d) : activeFilters.push(d);
    renderCampaigns();
}

window.onclick = (e) => { if(e.target.className === 'modal') closeModal(); };