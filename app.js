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
const auth = firebase.auth();

let campaigns = [];
let notifications = [];
let activeFilters = ['Logistiek', 'Webshop', 'MJFM', 'Outlet', 'Marketing', 'Winkels', 'Content', 'Feestdagen'];
let currentView = 'week';
let isAuthInitialized = false;

// Company domain for authorization
const ALLOWED_DOMAIN = '@mikesjustformen.nl';

const departments = {
    'Logistiek': '#767676ff', 'Webshop': '#0062ffff', 'MJFM': '#9a6fffff',
    'Outlet': '#fffb00ff', 'Marketing': '#10b981', 'Winkels': '#11c5c5ff',
    'Content': '#fb923cff', /* Oranje */
    'Feestdagen': '#ef4444' /* Rood */
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
    initTheme();
    // Initialize authentication before UI
    initAuth();
});

function initAuth() {
    // Listen to auth state changes
    auth.onAuthStateChanged(user => {
        if (!user) {
            // Not signed in: show login prompt
            showLoginPrompt();
        } else if (!user.email || !user.email.endsWith(ALLOWED_DOMAIN)) {
            // Signed in but wrong domain
            showUnauthorizedMessage(user.email);
            auth.signOut();
        } else {
            // Authorized: show app and init UI
            hideLoginPrompt();
            isAuthInitialized = true;
            switchView('day', document.querySelector('.btn-view[onclick*="day"]'));
            createLegend();
            listenToFirebase();
            listenToNotifications();
        }
    });
}

function initTheme() {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
        document.body.classList.add('dark');
    } else if (saved === 'light') {
        document.body.classList.remove('dark');
    } else {
        // respect system preference by default
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.body.classList.add('dark');
        }
    }
    updateThemeButton();
}

function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeButton();
}

function updateThemeButton() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    if (document.body.classList.contains('dark')) {
        btn.textContent = '☀️';
        btn.title = 'Schakel naar licht thema';
    } else {
        btn.textContent = '🌙';
        btn.title = 'Schakel naar donker thema';
    }
}

function switchView(view, btn) {
    currentView = view;
    document.querySelectorAll('.btn-view').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

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
    updateTodayIndicator();
}

function updateTodayIndicator() {
    const today = new Date();
    const indicator = document.getElementById('todayIndicator');
    const columnWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--column-width'));

    if (currentView === 'day') {
        // Bereken dag van het jaar (1-365)
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        const dayOfYear = Math.floor((today - startOfYear) / (24 * 60 * 60 * 1000)) + 1;
        const left = (dayOfYear - 1) * columnWidth + (columnWidth / 2);
        indicator.style.left = left + 'px';
    } else if (currentView === 'week') {
        // Bereken weeknummer
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        const diff = today - startOfYear;
        const dayOfYear = Math.floor(diff / (24 * 60 * 60 * 1000));
        const weekNumber = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7);
        const left = (weekNumber - 1) * columnWidth + (columnWidth / 2);
        indicator.style.left = left + 'px';
    } else if (currentView === 'month') {
        // Bereken maandnummer
        const monthNumber = today.getMonth();
        const left = monthNumber * columnWidth + (columnWidth / 2);
        indicator.style.left = left + 'px';
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
                col.style.left = `${(i - 1) * 35}px`;
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
        if (rowIndex === -1) { rows.push([{ start, end }]); rowIndex = rows.length - 1; }
        else { rows[rowIndex].push({ start, end }); }

        const bar = document.createElement('div');
        bar.className = 'task-bar';
        bar.innerHTML = `<span>${item.title}</span> ${item.attachmentUrl ? '🔗' : ''}`;
        // Tooltip data + accessibility
        bar.setAttribute('data-title', item.title);
        bar.setAttribute('aria-label', item.title);

        // JS tooltip handlers (append tooltip to body so it's not clipped by containers)
        bar.addEventListener('mouseenter', (ev) => showTooltip(ev.currentTarget, item.title));
        bar.addEventListener('mousemove', (ev) => moveTooltip(ev));
        bar.addEventListener('mouseleave', hideTooltip);
        bar.addEventListener('focus', (ev) => showTooltip(ev.currentTarget, item.title));
        bar.addEventListener('blur', hideTooltip);
        bar.style.backgroundColor = item.color;
        bar.style.gridColumn = `${start} / span ${(end - start) + 1}`;
        bar.style.gridRow = rowIndex + 1;
        bar.onclick = () => openModal(item.id);
        grid.appendChild(bar);
    });
}

// --- Tooltip implementation ---
let __tooltipEl = null;
function showTooltip(target, text) {
    if (!text) return;
    if (!__tooltipEl) {
        __tooltipEl = document.createElement('div');
        __tooltipEl.className = 'js-tooltip';
        document.body.appendChild(__tooltipEl);
    }
    __tooltipEl.textContent = text;
    __tooltipEl.style.display = 'block';
    positionTooltipForTarget(target);
}

function moveTooltip(ev) {
    if (!__tooltipEl) return;
    // Slight offset from cursor
    const x = ev.clientX + 12;
    const y = ev.clientY - 28;
    __tooltipEl.style.left = x + 'px';
    __tooltipEl.style.top = y + 'px';
}

function positionTooltipForTarget(target) {
    if (!__tooltipEl || !target) return;
    const rect = target.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top - 10;
    __tooltipEl.style.left = x + 'px';
    __tooltipEl.style.top = (y - __tooltipEl.offsetHeight) + 'px';
}

function hideTooltip() {
    if (!__tooltipEl) return;
    __tooltipEl.style.display = 'none';
}

function listenToFirebase() {
    database.ref('campaigns_2026').on('value', (s) => {
        campaigns = s.val() ? Object.values(s.val()) : [];
        renderCampaigns();
        updateNotificationsUI();
    });
}

function listenToNotifications() {
    database.ref('notifications').on('value', (s) => {
        const val = s.val() || {};
        // Convert to array with id
        notifications = Object.keys(val).map(k => ({ id: k, ...val[k] }));
        // Sort newest first
        notifications.sort((a, b) => (b.date || 0) - (a.date || 0));
        updateNotificationsUI();
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
        // override delete button to use notification-aware delete
        document.getElementById('deleteBtn').onclick = deleteItemWithNotification;
        refreshCommentsOnly(id);
    }
}

function saveTask() {
    const currentIdVal = document.getElementById('currentId').value;
    const isNew = !currentIdVal;
    const id = currentIdVal || Date.now().toString();
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
    if (isNew) data.unread = true;
    if (!data.title) return alert("Vul titel in.");
    database.ref('campaigns_2026/' + id).update(data).then(() => {
        // push notification about creation or update
        pushNotification({
            type: isNew ? 'created' : 'updated',
            itemId: id,
            title: data.title,
            department: data.department,
            date: Date.now(),
            read: false
        });
        alert("Opgeslagen!");
        closeModal();
    }).catch(err => {
        alert("Fout bij opslaan: " + err.message);
    });
}

/* Notifications panel and helpers */
function updateNotificationsUI() {
    const panel = document.getElementById('notifPanel');
    const dot = document.getElementById('notifDot');
    if (!panel || !dot) return;
    // use notifications array from DB
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) {
        dot.style.display = 'none';
    } else {
        dot.style.display = 'inline-block';
    }

    if (notifications.length === 0) {
        panel.innerHTML = '<div class="notif-empty">Geen notificaties</div>';
        return;
    }

    let html = '';
    notifications.slice(0, 20).forEach(n => {
        const time = n.date ? new Date(n.date).toLocaleString('nl-NL') : '';
        // use more standard checkbox symbols: ☐ (unread) and ☑ (read)
        const symbol = n.read ? '☑' : '☐';
        const cls = n.read ? 'read' : 'unread';
        // make the whole item clickable to open the related campaign (if it exists)
        html += `<div class="notif-item" data-id="${n.id}" onclick="openNotificationTarget('${n.id}','${n.itemId || ''}')">` +
                `<div class="notif-checkbox ${cls}" onclick="markNotificationRead('${n.id}', event)">${symbol}</div>` +
                `<div style="flex:1;"><div class="notif-title">${n.title}</div><div style="font-size:11px;color:var(--muted)">${n.type} · ${time}</div></div>` +
                `</div>`;
    });
    panel.innerHTML = html;
}

function toggleNotifPanel() {
    const panel = document.getElementById('notifPanel');
    const btn = document.getElementById('notifBtn');
    if (!panel || !btn) return;
    const isOpen = panel.style.display === 'block';
    panel.style.display = isOpen ? 'none' : 'block';
    btn.setAttribute('aria-expanded', (!isOpen).toString());
}

function markNotificationRead(id, ev) {
    // prevent click bubbling that might open modal
    ev && ev.stopPropagation && ev.stopPropagation();
    if (!id) return;
    database.ref('notifications/' + id).update({ read: true }).then(() => {
        // UI will update via Firebase listener
    }).catch(err => console.error('Failed to mark read', err));
}

function pushNotification(obj) {
    // obj: { type, itemId, title, department, date, read }
    if (!obj) return;
    const n = Object.assign({ date: Date.now(), read: false }, obj);
    database.ref('notifications').push(n).catch(err => console.error('Failed to push notification', err));
}

function openNotificationTarget(notificationId, itemId) {
    // If item exists, open modal for that item. Otherwise notify user it's deleted.
    if (!notificationId) return;
    if (!itemId) {
        alert('Geen gekoppeld item gevonden.');
        // mark notification read as it has no target
        markNotificationRead(notificationId, null);
        return;
    }
    const item = campaigns.find(c => c.id == itemId);
    if (item) {
        // open the item modal and mark notification read
        openModal(itemId);
        markNotificationRead(notificationId, null);
    } else {
        alert('Het item is verwijderd of bestaat niet meer.');
        // mark as read to clear it from 'new' list
        markNotificationRead(notificationId, null);
    }
}

function addComment() {
    const id = document.getElementById('currentId').value;
    const text = document.getElementById('newComment').value;
    if (!id || !text) return;
    const comment = { text, date: new Date().toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) };
    database.ref(`campaigns_2026/${id}/comments`).push(comment).then(() => {
        document.getElementById('newComment').value = '';
        refreshCommentsOnly(id);
    });
}

function refreshCommentsOnly(itemId) {
    const item = campaigns.find(c => c.id == itemId);
    const list = document.getElementById('commentsList');
    list.innerHTML = '';
    if (item && item.comments) {
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
    if (confirm("Verwijderen?")) database.ref('campaigns_2026/' + id).remove().then(() => closeModal());
}

function deleteItemWithNotification() {
    const id = document.getElementById('currentId').value;
    if (!id) return;
    if (!confirm("Verwijderen?")) return;
    // read item to include title in notification
    database.ref('campaigns_2026/' + id).once('value').then(snap => {
        const item = snap.val() || {};
        pushNotification({
            type: 'deleted',
            itemId: id,
            title: item.title || ('Item ' + id),
            department: item.department || '',
            date: Date.now(),
            read: false
        });
        return database.ref('campaigns_2026/' + id).remove();
    }).then(() => closeModal()).catch(err => console.error(err));
}

function openAttachment() {
    const url = document.getElementById('attachmentUrl').value;
    if (url) window.open(url, '_blank');
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

function getWeekNumber(date) {
    // Kopieer de datum om de originele niet te wijzigen
    const target = new Date(date.valueOf());
    const dayNr = (date.getDay() + 6) % 7; // Maandag = 0

    // Zet naar dichtstbijzijnde donderdag (huidige datum + 3 - dayNr)
    target.setDate(target.getDate() - dayNr + 3);

    // 1 januari van het jaar
    const jan4 = new Date(target.getFullYear(), 0, 4);

    // Bereken aantal weken tussen de donderdag en 4 januari
    const weekDiff = Math.round((target - jan4) / 86400000 / 7);

    // Week 1 is de week met 4 januari
    return 1 + weekDiff;
}

function getDateFromWeek(week, year) {
    const d = new Date(year, 0, 1);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // naar maandag
    d.setDate(diff + (week - 1) * 7);
    return d;
}

window.onclick = (e) => { if (e.target.className === 'modal') closeModal(); };

/* === Authentication UI Helpers === */
function showLoginPrompt() {
    // Hide main UI and show login screen
    document.querySelector('.container').style.display = 'none';
    let loginDiv = document.getElementById('authPrompt');
    if (!loginDiv) {
        loginDiv = document.createElement('div');
        loginDiv.id = 'authPrompt';
        loginDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0,0,0,0.5);
            z-index: 10000;
        `;
        loginDiv.innerHTML = `
            <div style="background: white; padding: 40px; border-radius: 12px; text-align: center; max-width: 400px;">
                <h2>Welkom bij Jaarplanning 2026</h2>
                <p style="color: #666;">Log in met uw Google-account (@mikesjustformen.nl)</p>
                <button id="signInBtn" style="
                    background: #4285f4;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    font-size: 16px;
                    cursor: pointer;
                ">Inloggen met Google</button>
                <p id="authError" style="color: red; margin-top: 12px; display: none;"></p>
            </div>
        `;
        document.body.appendChild(loginDiv);
        document.getElementById('signInBtn').onclick = signInWithGoogle;
    }
    loginDiv.style.display = 'flex';
}

function hideLoginPrompt() {
    const loginDiv = document.getElementById('authPrompt');
    if (loginDiv) loginDiv.style.display = 'none';
    document.querySelector('.container').style.display = 'block';
    updateUserMenu();
}

function updateUserMenu() {
    if (auth.currentUser && auth.currentUser.email) {
        const userMenu = document.getElementById('userMenu');
        if (userMenu) userMenu.style.display = 'flex';
    }
}

function toggleUserMenu() {
    const userPanel = document.getElementById('userPanel');
    if (!userPanel.innerHTML) {
        const user = auth.currentUser;
        userPanel.innerHTML = `
            <div style="padding: 12px;">
                <p style="margin: 0 0 12px 0; font-size: 14px;"><strong>${user.email}</strong></p>
                <button onclick="signOut()" style="
                    background: #ef4444;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 6px;
                    font-size: 14px;
                    cursor: pointer;
                    width: 100%;
                ">Uitloggen</button>
            </div>
        `;
    }
    userPanel.style.display = userPanel.style.display === 'none' ? 'block' : 'none';
}

function signOut() {
    auth.signOut().then(() => {
        document.getElementById('userPanel').style.display = 'none';
        document.getElementById('userMenu').style.display = 'none';
    });
}

function showUnauthorizedMessage(email) {
    const msg = `Uw account (${email}) is niet geautoriseerd. Alleen accounts met ${ALLOWED_DOMAIN} hebben toegang.`;
    alert(msg);
    console.error(msg);
}

function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then(result => {
            // onAuthStateChanged will handle the rest
        })
        .catch(err => {
            const errDiv = document.getElementById('authError');
            if (errDiv) {
                errDiv.textContent = 'Inloggen mislukt: ' + err.message;
                errDiv.style.display = 'block';
            }
            console.error('Sign-in error:', err);
        });
}
