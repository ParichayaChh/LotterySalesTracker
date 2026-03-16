// ===== LOTTO TRACKER - PURE LOCAL DATE VERSION =====
// Fixed Timezone/String Conflict for January 2026

// ===== DATA STORAGE =====
const DB = {
    users: [
        { id: 1, username: 'admin', pin: '1234', role: 'admin', createdAt: new Date().toISOString() }
    ],
    inventoryHistory: [],
    dailySales: [],
    currentUser: null,
    isGuestView: false,
    nextUserId: 2,
    nextHistoryId: 1,
    nextSalesId: 1,
    currentInventory: 0
};

let currentReportData = [];
let currentReportFilename = '';

// ===== DATE UTILITIES (PURE LOCAL) =====

// Get today's date as YYYY-MM-DD string in local time
function getLocalToday() {
    const now = new Date();
    return formatDate(now);
}

// Format a Date object to YYYY-MM-DD string in local time
function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// Parse YYYY-MM-DD string into a local Date object (midnight)
function parseLocalDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    try {
        initializeApp();
        setupEventListeners();
        setDefaultDates();
    } catch (err) {
        console.error("Initialization error:", err);
    }
});

function initializeApp() {
    const savedData = localStorage.getItem('lottoTrackerDB');
    if (savedData) {
        try {
            const parsedData = JSON.parse(savedData);
            Object.assign(DB, parsedData);
            if (!DB.users || DB.users.length === 0) {
                DB.users = [{ id: 1, username: 'admin', pin: '1234', role: 'admin', createdAt: new Date().toISOString() }];
            }
        } catch (e) {
            console.error("Error parsing saved data", e);
        }
    }
    updateInventoryDisplay();
    showPage('loginPage');
}

function setupEventListeners() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    
    const guestViewBtn = document.getElementById('guestViewBtn');
    if (guestViewBtn) {
        guestViewBtn.addEventListener('click', function(e) {
            e.preventDefault();
            DB.isGuestView = true;
            DB.currentUser = { username: 'GUEST', role: 'viewer' };
            updateUserDisplay();
            showPage('dashboardPage');
            switchPage('dashboard');
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
            const dailyNavItem = document.querySelector('[data-page="daily-sales"]');
            if (dailyNavItem) dailyNavItem.style.display = 'none';
        });
    }
    
    const loginPin = document.getElementById('loginPin');
    if (loginPin) {
        loginPin.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
            updatePinCounter();
        });
    }
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = e.currentTarget.dataset.page;
            switchPage(page);
        });
    });
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    
    const dailySalesForm = document.getElementById('dailySalesForm');
    if (dailySalesForm) dailySalesForm.addEventListener('submit', handleDailySalesSubmit);
    
    const scratchOffInput = document.getElementById('scratchOffSales');
    if (scratchOffInput) scratchOffInput.addEventListener('input', updateDailyTotal);
    
    const lottoInput = document.getElementById('lottoSales');
    if (lottoInput) lottoInput.addEventListener('input', updateDailyTotal);
    
    const addDeliveryForm = document.getElementById('addDeliveryForm');
    if (addDeliveryForm) addDeliveryForm.addEventListener('submit', handleAddDelivery);
    
    const addGameForm = document.getElementById('addGameForm');
    if (addGameForm) addGameForm.addEventListener('submit', handleAddActivation);
    
    const returnBookForm = document.getElementById('returnBookForm');
    if (returnBookForm) returnBookForm.addEventListener('submit', handleReturnBook);
    
    const addUserForm = document.getElementById('addUserForm');
    if (addUserForm) addUserForm.addEventListener('submit', handleAddUser);
    
    const salesDateInput = document.getElementById('salesDate');
    if (salesDateInput) salesDateInput.addEventListener('change', loadDailySalesData);
}

function setDefaultDates() {
    const today = getLocalToday();
    const dateInputs = ['salesDate', 'lookupDate', 'lookupStart', 'lookupEnd', 'reportWeekStart', 'gameDate', 'returnDate', 'deliveryDate'];
    dateInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = today;
    });
    
    const now = new Date();
    const reportYear = document.getElementById('reportYear');
    if (reportYear) reportYear.value = now.getFullYear();
    
    const reportMonth = document.getElementById('reportMonth');
    if (reportMonth) reportMonth.value = now.getMonth() + 1;
}

// ===== AUTHENTICATION =====
function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const pin = document.getElementById('loginPin').value;
    const user = DB.users.find(u => u.username === username && u.pin === pin);
    if (!user) { alert('Invalid username or PIN'); return; }
    DB.currentUser = user;
    DB.isGuestView = false;
    saveData();
    updateUserDisplay();
    showPage('dashboardPage');
    switchPage('dashboard');
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        DB.currentUser = null;
        DB.isGuestView = false;
        saveData();
        showPage('loginPage');
        const loginForm = document.getElementById('loginForm');
        if (loginForm) loginForm.reset();
    }
}

function updateUserDisplay() {
    if (DB.currentUser) {
        const userDisplay = document.getElementById('currentUser');
        if (userDisplay) userDisplay.textContent = DB.currentUser.username.toUpperCase();
        const roleElement = document.getElementById('currentRole');
        if (roleElement) {
            if (DB.currentUser.role === 'admin' && !DB.isGuestView) {
                roleElement.style.display = 'block';
                document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
                const dailyNavItem = document.querySelector('[data-page="daily-sales"]');
                if (dailyNavItem) dailyNavItem.style.display = 'block';
            } else {
                roleElement.style.display = 'none';
                document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
                if (DB.isGuestView) {
                    const dailyNavItem = document.querySelector('[data-page="daily-sales"]');
                    if (dailyNavItem) dailyNavItem.style.display = 'none';
                }
            }
        }
    }
}

function updatePinCounter() {
    const pinInput = document.getElementById('loginPin');
    const pinCounter = document.getElementById('pinCounter');
    if (pinInput && pinCounter) pinCounter.textContent = pinInput.value.length + '/4 digits';
}

// ===== PAGE NAVIGATION =====
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const targetPage = document.getElementById(pageId);
    if (targetPage) targetPage.classList.add('active');
}

function switchPage(pageName) {
    const section = document.getElementById(pageName + '-content');
    if (!section) return;
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    section.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const activeNav = document.querySelector(`.nav-item[data-page="${pageName}"]`);
    if (activeNav) activeNav.classList.add('active');
    
    if (pageName === 'dashboard') updateDashboardStats();
    if (pageName === 'inventory') renderInventoryHistory();
    if (pageName === 'weekly') renderWeeklySummary();
    if (pageName === 'monthly') renderMonthlySummary();
    if (pageName === 'insights') renderInsights();
    if (pageName === 'users') renderUsers();
}

function updateDashboardStats() {
    const invCount = document.getElementById('dashInventoryCount');
    if (invCount) invCount.textContent = DB.currentInventory;
    const today = getLocalToday();
    const todaySales = DB.dailySales.find(s => s.date === today);
    const salesDisplay = document.getElementById('dashTodaySales');
    if (salesDisplay) salesDisplay.textContent = todaySales ? '$' + todaySales.total.toFixed(2) : '$0.00';
}

// ===== INVENTORY LOGIC =====
function updateInventoryDisplay() {
    const countElements = ['inventoryCount', 'dashInventoryCount'];
    countElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = DB.currentInventory;
    });
}

function handleAddDelivery(e) {
    e.preventDefault();
    const qty = parseInt(document.getElementById('deliveryQty').value);
    const entry = {
        id: DB.nextHistoryId++,
        type: 'delivery',
        date: document.getElementById('deliveryDate').value,
        qty: qty,
        notes: document.getElementById('deliveryNotes').value || 'New Delivery',
        change: qty
    };
    DB.inventoryHistory.push(entry);
    DB.currentInventory += qty;
    saveData();
    updateInventoryDisplay();
    closeModal('addDeliveryModal');
    renderInventoryHistory();
    document.getElementById('addDeliveryForm').reset();
    setDefaultDates();
}

function handleAddActivation(e) {
    e.preventDefault();
    const entry = {
        id: DB.nextHistoryId++,
        type: 'activation',
        date: document.getElementById('gameDate').value,
        gameName: document.getElementById('gameName').value,
        price: parseFloat(document.getElementById('gamePrice').value),
        change: -1
    };
    DB.inventoryHistory.push(entry);
    DB.currentInventory -= 1;
    saveData();
    updateInventoryDisplay();
    closeModal('addGameModal');
    renderInventoryHistory();
    document.getElementById('addGameForm').reset();
    setDefaultDates();
}

function handleReturnBook(e) {
    e.preventDefault();
    const entry = {
        id: DB.nextHistoryId++,
        type: 'return',
        date: document.getElementById('returnDate').value,
        gameName: document.getElementById('returnGameName').value,
        price: parseFloat(document.getElementById('returnGamePrice').value),
        notes: document.getElementById('returnNotes').value,
        change: -1
    };
    DB.inventoryHistory.push(entry);
    DB.currentInventory -= 1;
    saveData();
    updateInventoryDisplay();
    closeModal('returnBookModal');
    renderInventoryHistory();
    document.getElementById('returnBookForm').reset();
    setDefaultDates();
}

function renderInventoryHistory(filter = 'all') {
    const tbody = document.getElementById('inventoryHistoryBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    let history = [...DB.inventoryHistory].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    if (filter !== 'all') history = history.filter(h => h.type === filter);
    history.forEach(item => {
        const tr = document.createElement('tr');
        let typeClass = 'text-primary';
        if (item.type === 'return') typeClass = 'text-danger';
        if (item.type === 'delivery') typeClass = 'text-success';
        let col3 = item.type === 'delivery' ? item.qty + ' BOOKS' : '$' + (item.price ? item.price.toFixed(2) : '0.00');
        let col4 = item.type === 'delivery' ? item.notes : item.gameName + (item.notes ? ' (' + item.notes + ')' : '');
        tr.innerHTML = `<td>${item.date}</td><td class="${typeClass}" style="font-weight:bold">${item.type.toUpperCase()}</td><td>${col3}</td><td>${col4}</td><td>${item.change > 0 ? '+' + item.change : item.change}</td><td><button class="btn btn-secondary" onclick="deleteHistoryItem(${item.id})" ${DB.isGuestView ? 'disabled' : ''}>DELETE</button></td>`;
        tbody.appendChild(tr);
    });
}

function filterHistory(type) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase().includes(type) || (type === 'all' && btn.textContent === 'ALL')) btn.classList.add('active');
    });
    renderInventoryHistory(type);
}

function deleteHistoryItem(id) {
    if (confirm('Are you sure you want to delete this entry?')) {
        const item = DB.inventoryHistory.find(h => h.id === id);
        if (item) {
            DB.currentInventory -= item.change;
            DB.inventoryHistory = DB.inventoryHistory.filter(h => h.id !== id);
            saveData();
            updateInventoryDisplay();
            renderInventoryHistory();
        }
    }
}

// ===== DAILY SALES =====
function handleDailySalesSubmit(e) {
    e.preventDefault();
    if (DB.isGuestView) return;
    const date = document.getElementById('salesDate').value;
    const scratchOff = parseFloat(document.getElementById('scratchOffSales').value) || 0;
    const lotto = parseFloat(document.getElementById('lottoSales').value) || 0;
    const notes = document.getElementById('salesNotes').value;
    const existingIndex = DB.dailySales.findIndex(s => s.date === date);
    const entry = { id: existingIndex >= 0 ? DB.dailySales[existingIndex].id : DB.nextSalesId++, date, scratchOff, lotto, total: scratchOff + lotto, notes };
    if (existingIndex >= 0) DB.dailySales[existingIndex] = entry;
    else DB.dailySales.push(entry);
    saveData();
    alert('Sales saved successfully!');
}

function loadDailySalesData() {
    const date = document.getElementById('salesDate').value;
    const entry = DB.dailySales.find(s => s.date === date);
    if (entry) {
        document.getElementById('scratchOffSales').value = entry.scratchOff;
        document.getElementById('lottoSales').value = entry.lotto;
        document.getElementById('salesNotes').value = entry.notes || '';
    } else {
        document.getElementById('scratchOffSales').value = 0;
        document.getElementById('lottoSales').value = 0;
        document.getElementById('salesNotes').value = '';
    }
    updateDailyTotal();
}

function updateDailyTotal() {
    const scratchOff = parseFloat(document.getElementById('scratchOffSales').value) || 0;
    const lotto = parseFloat(document.getElementById('lottoSales').value) || 0;
    const totalDisplay = document.getElementById('dailyTotal');
    if (totalDisplay) totalDisplay.textContent = '$' + (scratchOff + lotto).toFixed(2);
}

// ===== WEEKLY SUMMARY (MONDAY START) =====
let currentWeekOffset = 0;

function renderWeeklySummary() {
    const tbody = document.getElementById('weeklyTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const todayStr = getLocalToday();
    const today = parseLocalDate(todayStr);
    const day = today.getDay(); // 0=Sun, 1=Mon...
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() + diffToMonday + (currentWeekOffset * 7));
    
    const weekDisplay = document.getElementById('weekDisplay');
    if (weekDisplay) {
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        weekDisplay.textContent = `${startOfWeek.toLocaleDateString()} - ${endOfWeek.toLocaleDateString()}`;
    }
    
    let weekTotalScratch = 0;
    let weekTotalLotto = 0;
    
    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startOfWeek);
        currentDate.setDate(startOfWeek.getDate() + i);
        const dateStr = formatDate(currentDate);
        const entry = DB.dailySales.find(s => s.date === dateStr);
        const scratch = entry ? entry.scratchOff : 0;
        const lotto = entry ? entry.lotto : 0;
        const total = scratch + lotto;
        weekTotalScratch += scratch;
        weekTotalLotto += lotto;
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</td><td>$${scratch.toFixed(2)}</td><td>$${lotto.toFixed(2)}</td><td style="font-weight:bold">$${total.toFixed(2)}</td>`;
        tbody.appendChild(tr);
    }
    const totalTr = document.createElement('tr');
    totalTr.style.backgroundColor = '#f8f9fa';
    totalTr.style.fontWeight = 'bold';
    totalTr.innerHTML = `<td>WEEKLY TOTAL</td><td>$${weekTotalScratch.toFixed(2)}</td><td>$${weekTotalLotto.toFixed(2)}</td><td style="color:var(--accent-green)">$${(weekTotalScratch + weekTotalLotto).toFixed(2)}</td>`;
    tbody.appendChild(totalTr);
}

function previousWeek() { currentWeekOffset--; renderWeeklySummary(); }
function nextWeek() { currentWeekOffset++; renderWeeklySummary(); }

// ===== MONTHLY SUMMARY (CALENDAR) =====
let currentMonthOffset = 0;

function renderMonthlySummary() {
    const grid = document.getElementById('calendarGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth() + currentMonthOffset, 1);
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth();
    
    const monthDisplay = document.getElementById('monthDisplay');
    if (monthDisplay) monthDisplay.textContent = targetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].forEach(day => {
        const div = document.createElement('div');
        div.className = 'calendar-day-header';
        div.textContent = day;
        grid.appendChild(div);
    });
    
    const firstDay = new Date(targetYear, targetMonth, 1).getDay();
    const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    
    for (let i = 0; i < firstDay; i++) {
        const div = document.createElement('div');
        div.className = 'calendar-day empty';
        grid.appendChild(div);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
        const div = document.createElement('div');
        div.className = 'calendar-day';
        const currentDate = new Date(targetYear, targetMonth, i);
        const dateStr = formatDate(currentDate);
        if (getLocalToday() === dateStr) div.classList.add('today');
        const sales = DB.dailySales.find(s => s.date === dateStr);
        const activations = DB.inventoryHistory.filter(h => h.date === dateStr && h.type === 'activation');
        div.innerHTML = `<div class="day-number">${i}</div>`;
        const content = document.createElement('div');
        content.className = 'day-content';
        if (sales) content.innerHTML += `<div class="day-total">$${sales.total.toFixed(0)}</div>`;
        if (activations.length > 0) content.innerHTML += `<div class="day-activations">${activations.length} ACT</div>`;
        div.appendChild(content);
        grid.appendChild(div);
    }
}

function previousMonth() { currentMonthOffset--; renderMonthlySummary(); }
function nextMonth() { currentMonthOffset++; renderMonthlySummary(); }

// ===== LOOKUP =====
let lookupMode = 'single';
function switchLookupMode(mode) {
    lookupMode = mode;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.toLowerCase().includes(mode)) btn.classList.add('active');
    });
    document.querySelectorAll('.lookup-mode').forEach(m => m.classList.remove('active'));
    const targetLookup = document.getElementById(mode + 'Lookup');
    if (targetLookup) targetLookup.classList.add('active');
}

function performLookup() {
    const tbody = document.getElementById('lookupTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    const resultsSection = document.getElementById('lookupResults');
    if (resultsSection) resultsSection.classList.remove('hidden');
    let results = [];
    if (lookupMode === 'single') {
        const date = document.getElementById('lookupDate').value;
        results = DB.dailySales.filter(s => s.date === date);
    } else {
        const start = document.getElementById('lookupStart').value;
        const end = document.getElementById('lookupEnd').value;
        results = DB.dailySales.filter(s => s.date >= start && s.date <= end);
    }
    results.sort((a, b) => b.date.localeCompare(a.date)).forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${s.date}</td><td>$${s.scratchOff.toFixed(2)}</td><td>$${s.lotto.toFixed(2)}</td><td style="font-weight:bold">$${s.total.toFixed(2)}</td>`;
        tbody.appendChild(tr);
    });
    if (results.length === 0) tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">No records found</td></tr>';
}

// ===== REPORTS PREVIEW & EXPORT =====
function previewReport(type) {
    const head = document.getElementById('reportPreviewHead');
    const body = document.getElementById('reportPreviewBody');
    const section = document.getElementById('reportPreviewSection');
    const title = document.getElementById('reportPreviewTitle');
    if (!head || !body || !section) return;
    head.innerHTML = '';
    body.innerHTML = '';
    currentReportData = [];
    if (type === 'weekly') {
        const startInput = document.getElementById('reportWeekStart').value;
        if (!startInput) { alert('Please select a start date'); return; }
        const start = parseLocalDate(startInput);
        title.textContent = `WEEKLY REPORT PREVIEW (${startInput})`;
        currentReportFilename = `weekly_report_${startInput}.csv`;
        head.innerHTML = '<tr><th>DATE</th><th>SCRATCH-OFF</th><th>LOTTO</th><th>TOTAL</th></tr>';
        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            const dateStr = formatDate(d);
            const entry = DB.dailySales.find(s => s.date === dateStr);
            const row = { date: dateStr, scratchOff: entry ? entry.scratchOff : 0, lotto: entry ? entry.lotto : 0, total: entry ? entry.total : 0 };
            currentReportData.push(row);
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${row.date}</td><td>$${row.scratchOff.toFixed(2)}</td><td>$${row.lotto.toFixed(2)}</td><td>$${row.total.toFixed(2)}</td>`;
            body.appendChild(tr);
        }
    } else {
        const month = parseInt(document.getElementById('reportMonth').value);
        const year = parseInt(document.getElementById('reportYear').value);
        title.textContent = `MONTHLY REPORT PREVIEW (${month}/${year})`;
        currentReportFilename = `monthly_report_${year}_${month}.csv`;
        head.innerHTML = '<tr><th>DATE</th><th>SCRATCH-OFF</th><th>LOTTO</th><th>TOTAL</th></tr>';
        const daysInMonth = new Date(year, month, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const entry = DB.dailySales.find(s => s.date === dateStr);
            const row = { date: dateStr, scratchOff: entry ? entry.scratchOff : 0, lotto: entry ? entry.lotto : 0, total: entry ? entry.total : 0 };
            currentReportData.push(row);
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${row.date}</td><td>$${row.scratchOff.toFixed(2)}</td><td>$${row.lotto.toFixed(2)}</td><td>$${row.total.toFixed(2)}</td>`;
            body.appendChild(tr);
        }
    }
    section.classList.remove('hidden');
}

function downloadCurrentReport() {
    if (currentReportData.length === 0) return;
    const csvContent = "data:text/csv;charset=utf-8," + "Date,Scratch-Off,Lotto,Total\n" + currentReportData.map(r => `${r.date},${r.scratchOff},${r.lotto},${r.total}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", currentReportFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ===== INSIGHTS =====
function renderInsights() {
    if (DB.dailySales.length === 0) return;
    const total = DB.dailySales.reduce((sum, s) => sum + s.total, 0);
    const avg = total / DB.dailySales.length;
    const best = [...DB.dailySales].sort((a, b) => b.total - a.total)[0];
    const totalDisp = document.getElementById('totalSalesAllTime');
    const avgDisp = document.getElementById('avgDailySales');
    const bestDisp = document.getElementById('bestSalesDay');
    if (totalDisp) totalDisp.textContent = '$' + total.toFixed(2);
    if (avgDisp) avgDisp.textContent = '$' + avg.toFixed(2);
    if (bestDisp) bestDisp.textContent = best ? `${best.date} ($${best.total.toFixed(0)})` : '-';
}

// ===== USER MANAGEMENT =====
function renderUsers() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    DB.users.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${user.username}</td><td>${user.role.toUpperCase()}</td><td>${new Date(user.createdAt).toLocaleDateString()}</td><td><button class="btn btn-secondary" onclick="deleteUser(${user.id})" ${user.username === 'admin' ? 'disabled' : ''}>DELETE</button></td>`;
        tbody.appendChild(tr);
    });
}

function handleAddUser(e) {
    e.preventDefault();
    const username = document.getElementById('newUsername').value.trim();
    const pin = document.getElementById('newPin').value;
    const role = document.getElementById('newRole').value;
    if (DB.users.find(u => u.username === username)) { alert('Username already exists'); return; }
    DB.users.push({ id: DB.nextUserId++, username, pin, role, createdAt: new Date().toISOString() });
    saveData();
    closeModal('addUserModal');
    renderUsers();
    document.getElementById('addUserForm').reset();
}

function deleteUser(id) {
    if (confirm('Are you sure you want to delete this user?')) {
        DB.users = DB.users.filter(u => u.id !== id);
        saveData();
        renderUsers();
    }
}

// ===== UTILITIES =====
function saveData() { localStorage.setItem('lottoTrackerDB', JSON.stringify(DB)); }
function openAddDeliveryModal() { document.getElementById('addDeliveryModal').classList.add('active'); }
function openAddGameModal() { document.getElementById('addGameModal').classList.add('active'); }
function openReturnBookModal() { document.getElementById('returnBookModal').classList.add('active'); }
function openAddUserModal() { document.getElementById('addUserModal').classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
window.onclick = function(event) { if (event.target.classList.contains('modal')) event.target.classList.remove('active'); };