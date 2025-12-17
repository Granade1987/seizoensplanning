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
    if(btn) btn.classList.add('active');
    
    const root = document.documentElement;
    if (view === 'day') {
        root.style.setProperty('--column-width', '35px');
        root.style.setProperty('--total-cols', '365');
    } else if (view === 'week') {
        root.style.setProperty('--column-width', '60px');
        root.style.setProperty('--total-cols', '53');
    } else {
        root.style.setProperty('--column-width', '150px');
        root.style.setProperty('--total-cols', '12');
    }

    buildHeaders();
    renderCampaigns();
    if(view === 'day') scrollToToday();
}

function buildHeaders() {
    const monthHeader = document.getElementById('monthHeader');
    const weekHeader = document.getElementById('weekHeader');
    monthHeader.innerHTML = ''; weekHeader.innerHTML = '';

    if (currentView === 'month') {
        monthHeader.style.display = 'none';
        monthStructure.forEach(m => {
            const el = document.createElement('div');
            el.className = 'week-num';
            el.innerText = m.name;
            weekHeader.appendChild(el);
        });
    } else if (currentView === 'week') {
        monthHeader.style.display = 'grid';
        const curW = getISOWeek(new Date());
        monthStructure.forEach(m => {
            const el = document.createElement('div');
            el.className = 'month-label';
            el.innerText = m.name;
            el.style.gridColumn = `span ${m.weeks}`;
            monthHeader.appendChild(el);
        });
        for (let i = 1; i <= 53; i++) {
            const el = document.createElement('div');
            el.className = 'week-num' + (i === curW ? ' current-week' : '');
            el.innerText = 'W' + i;
            weekHeader.appendChild(el);
        }
    } else if (currentView === 'day') {
        monthHeader.style.display = 'grid';
        let dayOfYear = 1;
        monthStructure.forEach((m, mIndex) => {
            const el = document.createElement('div');
            el.className = 'month-label';
            el.innerText = m.name;
            el.style.gridColumn = `span ${m.days}`;
            monthHeader.appendChild(el);
            
            for (let d = 1; d <= m.days; d++) {
                const date = new Date(2026, mIndex, d);
                const isWeekend = (date.getDay() === 0 || date.getDay() === 6);
                
                const dEl = document.createElement('div');
                dEl.className = 'week-num' + (isWeekend ? ' weekend' : '');
                dEl.innerText = d;
                dEl.style.fontSize = '8px';
                weekHeader.appendChild(dEl);
                dayOfYear++;
            }
        });
    }
}

function renderCampaigns() {
    const grid = document.getElementById('timelineGrid');
    grid.innerHTML = '<div id="todayLine" class="today-line"></div>';
    
    // Voeg weekend kolommen toe in dagweergave
    if (currentView === 'day') {
        for (let i = 1; i <= 365; i++) {
            const date = new Date(2026, 0, i);
            if (date.getDay() === 0 || date.getDay() === 6) {
                const col = document.createElement('div');
                col.className = 'weekend-col';
                col.style.gridColumn = i;
                grid.appendChild(col);
            }
        }
    }

    updateTodayLine();
    
    const filtered = campaigns.filter(c => activeFilters.includes(c.department));
    const rows = [];
    
    filtered.forEach(item => {
        let start, end;
        if (currentView === 'month') {
            start = Math.floor(item.startWeek / 4.4) + 1;
            end = Math.floor(item.endWeek / 4.4) + 1;
        } else if (currentView === 'day') {
            start = (item.startWeek * 7) - 6;
            end = item.endWeek * 7;
        } else {
            start = item.startWeek;
            end = item.endWeek;
        }

        let rowIndex = rows.findIndex(row => row.every(placed => end < placed.start || start > placed.end));
        if (rowIndex === -1) { rows.push([{start, end}]); rowIndex = rows.length - 1; } 
        else { rows[rowIndex].push({start, end}); }

        const bar = document.createElement('div');
        bar.className = 'task-bar';
        bar.innerHTML = `<span>${item.title}</span> ${item.attachmentUrl ? '📎' : ''}`;
        bar.style.backgroundColor = item.color;
        bar.style.gridColumn = `${start} / span ${(end - start) + 1}`;
        bar.style.gridRow = rowIndex + 1;
        bar.onclick = () => openModal(item.id);
        grid.appendChild(bar);
    });
}

function updateTodayLine() {
    const now = new Date();
    if (now.getFullYear() !== 2026) return;
    const line = document.getElementById('todayLine');
    if (!line) return;

    const colWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--column-width'));
    let pos = 0;
    
    if (currentView === 'day') {
        const yearStart = new Date(2026, 0, 1);
        const diff = now - yearStart;
        const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
        pos = dayOfYear * colWidth;
    } else if (currentView === 'week') {
        const w = getISOWeek(now);
        pos = (w - 1) * colWidth + ((now.getDay() || 7) - 1) * (colWidth / 7);
    } else {
        pos = now.getMonth() * colWidth + (now.getDate() / 31) * colWidth;
    }
    line.style.left = pos + 'px';
}

function scrollToToday() {
    const wrapper = document.querySelector('.timeline-wrapper');
    setTimeout(() => {
        const line = document.getElementById('todayLine');
        if(line) wrapper.scrollLeft = line.offsetLeft - 100;
    }, 100);
}

// REST VAN DE FUNCTIES (Firebase, Modal, etc.)
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
        refreshCommentsOnly(id);
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
    database.ref('campaigns_2026/' + id).update(data);
    closeModal();
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
            list.innerHTML += `<div class="comment-item"><span>${c.date}: ${c.text}</span><span class="delete-comment" onclick="deleteComment('${key}')">&times;</span></div>`;
        });
    }
}

function deleteComment(key) {
    const id = document.getElementById('currentId').value;
    database.ref(`campaigns_2026/${id}/comments/${key}`).remove().then(() => refreshCommentsOnly(id));
}

function openAttachment() {
    const url = document.getElementById('attachmentUrl').value;
    if(url) window.open(url, '_blank');
}

function deleteItem() {
    const id = document.getElementById('currentId').value;
    if(confirm("Item verwijderen?")) {
        database.ref('campaigns_2026/' + id).remove();
        closeModal();
    }
}

function resetModal() {
    document.getElementById('currentId').value = '';
    document.getElementById('taskName').value = '';
    document.getElementById('attachmentUrl').value = '';
    document.getElementById('deleteBtn').style.display = 'none';
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

function getISOWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    return Math.ceil((((d - new Date(Date.UTC(d.getUTCFullYear(), 0, 1))) / 86400000) + 1) / 7);
}

window.onclick = (e) => { if(e.target.className === 'modal') closeModal(); };