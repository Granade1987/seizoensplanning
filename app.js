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

const departments = {
    'Logistiek': '#f59e0b', 'Webshop': '#3b82f6', 'MJFM': '#8b5cf6',
    'Outlet': '#ec4899', 'Marketing': '#10b981', 'Winkels': '#6366f1'
};

// Kalenderstructuur voor 2026
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

// Hulpmiddel om huidig weeknummer te berekenen
function getISOWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function buildHeaders() {
    const monthHeader = document.getElementById('monthHeader');
    const weekHeader = document.getElementById('weekHeader');
    const currentWeek = getISOWeek(new Date());

    monthHeader.innerHTML = ''; weekHeader.innerHTML = '';
    monthStructure.forEach(m => {
        const el = document.createElement('div');
        el.className = 'month-label';
        el.innerText = m.name;
        el.style.gridColumn = `span ${m.weeks}`;
        monthHeader.appendChild(el);
    });

    for (let i = 1; i <= 53; i++) {
        const el = document.createElement('div');
        el.className = 'week-num' + (i === currentWeek ? ' current-week' : '');
        el.innerText = i;
        weekHeader.appendChild(el);
    }
}

function listenToFirebase() {
    database.ref('campaigns_2026').on('value', (snapshot) => {
        const data = snapshot.val();
        campaigns = data ? Object.values(data) : [];
        renderCampaigns();
    });
}

function renderCampaigns() {
    const grid = document.getElementById('timelineGrid');
    grid.innerHTML = '<div id="todayLine" class="today-line"></div>';
    
    updateTodayLine();

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

function updateTodayLine() {
    const now = new Date();
    // Alleen tekenen als we in 2026 zitten
    if (now.getFullYear() !== 2026) return;
    
    const week = getISOWeek(now);
    const dayOfWeek = now.getDay() || 7; // Maandag = 1, Zondag = 7
    const weekWidth = 50; 
    
    // Bereken positie: (weken gepasseerd * breedte) + (dagen in deze week * fractie van breedte)
    const position = ((week - 1) * weekWidth) + ((dayOfWeek - 1) * (weekWidth / 7));
    const line = document.getElementById('todayLine');
    if (line) line.style.left = position + 'px';
}

function openModal(editId = null) {
    document.getElementById('itemModal').style.display = 'flex';
    const commentsList = document.getElementById('commentsList');
    commentsList.innerHTML = '';
    document.getElementById('newComment').value = '';

    if (editId) {
        const item = campaigns.find(c => c.id == editId);
        document.getElementById('modalTitle').innerText = "Item Bewerken";
        document.getElementById('currentId').value = item.id;
        document.getElementById('taskName').value = item.title;
        document.getElementById('department').value = item.department;
        document.getElementById('taskDesc').value = item.description || '';
        document.getElementById('startWeek').value = item.startWeek;
        document.getElementById('endWeek').value = item.endWeek;
        
        if (item.comments) {
            Object.values(item.comments).forEach(c => {
                const div = document.createElement('div');
                div.className = 'comment-item';
                div.innerHTML = `<span class="comment-date">${c.date}</span> ${c.text}`;
                commentsList.appendChild(div);
            });
        }
        document.getElementById('deleteBtn').style.display = 'block';
    } else {
        document.getElementById('modalTitle').innerText = "Nieuw Item";
        resetModal();
    }
}

function addComment() {
    const id = document.getElementById('currentId').value;
    const text = document.getElementById('newComment').value;
    if (!id) return alert("Sla het item eerst op voordat je comments toevoegt.");
    if (!text) return;

    const commentData = {
        text: text,
        date: new Date().toLocaleDateString('nl-NL', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'})
    };

    database.ref(`campaigns_2026/${id}/comments`).push(commentData);
    document.getElementById('newComment').value = '';
}

function saveTask() {
    const idValue = document.getElementById('currentId').value;
    const id = idValue ? idValue : Date.now().toString();
    const title = document.getElementById('taskName').value;
    const dept = document.getElementById('department').value;
    const start = parseInt(document.getElementById('startWeek').value);
    const end = parseInt(document.getElementById('endWeek').value);

    if (!title || isNaN(start) || isNaN(end) || start > end) return alert("Check de velden.");

    const itemRef = database.ref('campaigns_2026/' + id);
    
    // Update gebruiken om bestaande comments te behouden
    itemRef.update({
        id: id,
        title: title,
        department: dept,
        description: document.getElementById('taskDesc').value,
        startWeek: start,
        endWeek: end,
        color: departments[dept]
    });

    closeModal();
}

function resetModal() {
    document.getElementById('currentId').value = '';
    document.getElementById('taskName').value = '';
    document.getElementById('taskDesc').value = '';
    document.getElementById('startWeek').value = '';
    document.getElementById('endWeek').value = '';
    document.getElementById('deleteBtn').style.display = 'none';
    document.getElementById('commentsList').innerHTML = '';
}

function closeModal() { document.getElementById('itemModal').style.display = 'none'; }

function deleteItem() {
    const id = document.getElementById('currentId').value;
    if (id && confirm("Wil je dit item definitief verwijderen?")) {
        database.ref('campaigns_2026/' + id).remove();
        closeModal();
    }
}

function createLegend() {
    const legendEl = document.getElementById('legend');
    legendEl.innerHTML = '';
    Object.keys(departments).forEach(dept => {
        const item = document.createElement('div');
        item.className = `legend-item ${activeFilters.includes(dept) ? 'active' : 'inactive'}`;
        item.innerHTML = `<div class="legend-color" style="background:${departments[dept]}"></div>${dept}`;
        item.onclick = () => {
            if (activeFilters.includes(dept)) activeFilters = activeFilters.filter(f => f !== dept);
            else activeFilters.push(dept);
            if (activeFilters.length === 0) activeFilters = Object.keys(departments);
            createLegend(); renderCampaigns();
        };
        legendEl.appendChild(item);
    });
}

window.onclick = (e) => { if (e.target.className === 'modal') closeModal(); };