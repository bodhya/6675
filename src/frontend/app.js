// API Configuration
const API_BASE = 'http://localhost:3000/api';
const WS_URL = 'ws://localhost:3000';

// State
let currentUser = null;
let currentMode = 'centralized';
let ws = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initWebSocket();
    initEventListeners();
    loadConfig();
    loadStats();
    loadDeals();
});

// = WS =

function initWebSocket() {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
        console.log('WebSocket connected');
        document.getElementById('wsStatus').className = 'connection-status connected';
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected');
        document.getElementById('wsStatus').className = 'connection-status disconnected';
        // Attempt reconnect after 3 seconds
        setTimeout(initWebSocket, 3000);
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
    };
}

function handleWebSocketMessage(message) {
    console.log('WebSocket message:', message);

    switch (message.type) {
        case 'NEW_DEAL':
            addDealToList(message.deal);
            loadStats();
            break;
        case 'DEAL_UPDATED':
            updateDealInList(message.deal);
            loadStats();
            break;
        case 'DEAL_PROMOTED':
            updateDealInList(message.deal);
            showNotification('Deal Promoted!', message.deal);
            loadStats();
            break;
        case 'DEAL_VERIFIED':
            updateDealInList(message.deal);
            showNotification('Deal Verified!', message.deal);
            loadStats();
            break;
        case 'DEAL_REJECTED':
            updateDealInList(message.deal);
            loadStats();
            break;
        case 'ALERT_TRIGGERED':
            if (message.notification.userId === currentUser?.id) {
                showAlertNotification(message.notification);
            }
            break;
        case 'CONFIG_UPDATED':
            updateModeDisplay(message.config.mode);
            break;
    }
}

function initEventListeners() {
    // Login
    document.getElementById('loginBtn').addEventListener('click', handleLogin);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Mode toggle
    document.getElementById('toggleModeBtn').addEventListener('click', toggleMode);

    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            switchTab(e.target.dataset.tab, e.target);
        });
    });

    // Forms
    document.getElementById('submitDealForm').addEventListener('submit', handleSubmitDeal);
    document.getElementById('createAlertForm').addEventListener('submit', handleCreateAlert);
}

function switchTab(tabName, clickedTabElement) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });

    event.target.classList.add('active');
    clickedTabElement.classList.add('active');

    // Update tab content
    document.getElementById('dealsTab').classList.add('hidden');
    document.getElementById('submitTab').classList.add('hidden');
    document.getElementById('alertsTab').classList.add('hidden');

    document.getElementById(tabName + 'Tab').classList.remove('hidden');

    if (tabName === 'alerts' && currentUser) {
        loadUserAlerts();
    }
}

// = USERS =

async function handleLogin() {
    const username = document.getElementById('username').value.trim();
    if (!username) {
        alert('Please enter a username');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/users/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });

        const data = await response.json();

        if (response.ok) {
            currentUser = data.user;
            updateUserDisplay();
            alert(`Welcome, ${username}!`);
        } else {
            alert(data.error || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Is the server running?');
    }
}

function handleLogout() {
    currentUser = null;
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('userInfo').classList.add('hidden');
    document.getElementById('username').value = '';
}

function updateUserDisplay() {
    if (currentUser) {
        document.getElementById('displayUsername').textContent = currentUser.username;
        document.getElementById('displayReputation').textContent = currentUser.reputationScore;
        document.getElementById('displayUserId').textContent = currentUser.id.substring(0, 8);
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('userInfo').classList.remove('hidden');
    }
}

// = CHANGE MODE =

async function loadConfig() {
    try {
        const response = await fetch(`${API_BASE}/config`);
        const config = await response.json();
        updateModeDisplay(config.mode);
    } catch (error) {
        console.error('Error loading config:', error);
    }
}

async function toggleMode() {
    const newMode = currentMode === 'centralized' ? 'decentralized' : 'centralized';

    try {
        const response = await fetch(`${API_BASE}/config/mode`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: newMode })
        });

        if (response.ok) {
            const data = await response.json();
            updateModeDisplay(data.config.mode);
        }
    } catch (error) {
        console.error('Error toggling mode:', error);
        alert('Failed to toggle mode');
    }
}

function updateModeDisplay(mode) {
    currentMode = mode;
    const modeDisplay = document.getElementById('currentMode');
    const toggleBtn = document.getElementById('toggleModeBtn');

    if (mode === 'centralized') {
        modeDisplay.textContent = 'Centralized Mode';
        modeDisplay.className = 'mode-badge mode-centralized';
        toggleBtn.textContent = 'Switch to Decentralized';
    } else {
        modeDisplay.textContent = 'Decentralized Mode';
        modeDisplay.className = 'mode-badge mode-decentralized';
        toggleBtn.textContent = 'Switch to Centralized';
    }
}

// = DEALS =

async function handleSubmitDeal(e) {
    e.preventDefault();

    if (!currentUser) {
        alert('Please login first');
        return;
    }

    const deal = {
        title: document.getElementById('dealTitle').value,
        price: document.getElementById('dealPrice').value,
        originalPrice: document.getElementById('dealOriginalPrice').value,
        url: document.getElementById('dealUrl').value,
        productCategory: document.getElementById('dealCategory').value,
        submittedBy: currentUser.id
    };

    try {
        const response = await fetch(`${API_BASE}/deals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(deal)
        });

        if (response.ok) {
            alert('Deal submitted successfully!');
            document.getElementById('submitDealForm').reset();
            switchTab('deals');
        } else {
            const data = await response.json();
            alert(data.error || 'Failed to submit deal');
        }
    } catch (error) {
        console.error('Error submitting deal:', error);
        alert('Failed to submit deal');
    }
}

async function loadDeals() {
    try {
        const response = await fetch(`${API_BASE}/deals`);
        const deals = await response.json();

        const dealsList = document.getElementById('dealsList');
        dealsList.innerHTML = '';

        if (deals.length === 0) {
            dealsList.innerHTML = '<p style="color: #666; text-align: center; padding: 40px;">No deals yet. Submit one to get started!</p>';
            return;
        }

        deals.forEach(deal => addDealToList(deal));
    } catch (error) {
        console.error('Error loading deals:', error);
    }
}

function addDealToList(deal) {
    const dealsList = document.getElementById('dealsList');

    // Remove "no deals" message if present
    if (dealsList.children[0]?.tagName === 'P') {
        dealsList.innerHTML = '';
    }

    // Check if deal already exists
    const existing = document.getElementById(`deal-${deal.id}`);
    if (existing) {
        updateDealInList(deal);
        return;
    }

    const dealCard = createDealCard(deal);
    dealsList.insertBefore(dealCard, dealsList.firstChild);
}

function updateDealInList(deal) {
    const existing = document.getElementById(`deal-${deal.id}`);
    if (existing) {
        const updated = createDealCard(deal);
        existing.replaceWith(updated);
    }
}

function createDealCard(deal) {
    const card = document.createElement('div');
    card.className = 'deal-card';
    card.id = `deal-${deal.id}`;

    const discount = deal.originalPrice ?
        Math.round((1 - deal.price / deal.originalPrice) * 100) : 0;

    const statusClass = `status-${deal.status}`;
    const statusText = deal.status.charAt(0).toUpperCase() + deal.status.slice(1);

    const verificationsHTML = deal.verifications.length > 0 ? `
        <div class="verifications">
            <strong>Verifications (${deal.verifications.length}):</strong>
            ${deal.verifications.map(v => `
                <div class="verification-item ${v.verdict === 'valid' ? 'verification-valid' : 'verification-invalid'}">
                    ${v.verdict === 'valid' ? '✓' : '✗'} ${v.verifierUsername}: ${v.verdict}
                    ${v.evidence ? `- "${v.evidence}"` : ''}
                </div>
            `).join('')}
        </div>
    ` : '';

    const actionsHTML = currentUser ? `
        <div class="deal-actions">
            ${currentMode === 'centralized' ?
                `<button onclick="voteDeal('${deal.id}')" class="btn-success">👍 Vote (${deal.votes || 0})</button>` :
                `<button onclick="verifyDeal('${deal.id}', 'valid')" class="btn-success">✓ Valid</button>
                 <button onclick="verifyDeal('${deal.id}', 'invalid')" class="btn-danger">✗ Invalid</button>`
            }
            <button onclick="window.open('${deal.url}', '_blank')">🔗 View Deal</button>
        </div>
    ` : '';

    card.innerHTML = `
        <div class="deal-header">
            <div>
                <div class="deal-title">${deal.title}</div>
                <div class="deal-meta">
                    <span>📁 ${deal.productCategory}</span>
                    <span>👤 ${deal.submittedByUsername}</span>
                    <span>🕐 ${formatTime(deal.timestamp)}</span>
                </div>
            </div>
            <span class="status-badge ${statusClass}">${statusText}</span>
        </div>
        <div class="deal-price">
            <span class="current-price">$${deal.price.toFixed(2)}</span>
            ${deal.originalPrice ? `<span class="original-price">$${deal.originalPrice.toFixed(2)}</span>` : ''}
            ${discount > 0 ? `<span class="discount">${discount}% OFF</span>` : ''}
        </div>
        ${verificationsHTML}
        ${actionsHTML}
    `;

    return card;
}

async function voteDeal(dealId) {
    if (!currentUser) {
        alert('Please login first');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/deals/${dealId}/vote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id })
        });

        if (response.ok) {
            // Deal will be updated via WebSocket
        } else {
            const data = await response.json();
            alert(data.error || 'Failed to vote');
        }
    } catch (error) {
        console.error('Error voting:', error);
        alert('Failed to vote');
    }
}

async function verifyDeal(dealId, verdict) {
    if (!currentUser) {
        alert('Please login first');
        return;
    }

    const evidence = prompt(`Why is this deal ${verdict}? (optional)`);

    try {
        const response = await fetch(`${API_BASE}/deals/${dealId}/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUser.id,
                verdict,
                evidence
            })
        });

        if (response.ok) {
            // Deal will be updated via WebSocket
        } else {
            const data = await response.json();
            alert(data.error || 'Failed to verify');
        }
    } catch (error) {
        console.error('Error verifying:', error);
        alert('Failed to verify');
    }
}

// = ALERTS =

async function handleCreateAlert(e) {
    e.preventDefault();

    if (!currentUser) {
        alert('Please login first');
        return;
    }

    const alert = {
        userId: currentUser.id,
        productKeywords: document.getElementById('alertKeywords').value,
        maxPrice: document.getElementById('alertMaxPrice').value,
        minVerifications: document.getElementById('alertMinVerifications').value
    };

    try {
        const response = await fetch(`${API_BASE}/alerts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(alert)
        });

        if (response.ok) {
            alert('Alert created successfully!');
            document.getElementById('createAlertForm').reset();
            await loadUserAlerts();
        } else {
            const data = await response.json();
            alert(data.error || 'Failed to create alert');
        }
    } catch (error) {
        console.error('Error creating alert:', error);
        alert('Failed to create alert');
    }
}

async function loadUserAlerts() {
    if (!currentUser) return;

    try {
        const response = await fetch(`${API_BASE}/alerts/user/${currentUser.id}`);
        const alerts = await response.json();

        const alertsList = document.getElementById('alertsList');
        alertsList.innerHTML = '';

        if (alerts.length === 0) {
            alertsList.innerHTML = '<p style="color: #666; font-size: 14px;">No alerts yet.</p>';
            return;
        }

        alerts.forEach(alert => {
            const alertItem = document.createElement('div');
            alertItem.className = 'alert-item';
            alertItem.innerHTML = `
                <p><strong>Keywords:</strong> ${alert.productKeywords}</p>
                <p><strong>Max Price:</strong> $${alert.maxPrice}</p>
                <p><strong>Min Verifications:</strong> ${alert.minVerifications}</p>
                <p><strong>Triggered:</strong> ${alert.triggered.length} times</p>
                <button onclick="deleteAlert('${alert.id}')" class="btn-danger" style="margin-top: 10px;">Delete</button>
            `;
            alertsList.appendChild(alertItem);
        });
    } catch (error) {
        console.error('Error loading alerts:', error);
    }
}

async function deleteAlert(alertId) {
    try {
        const response = await fetch(`${API_BASE}/alerts/${alertId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadUserAlerts();
        }
    } catch (error) {
        console.error('Error deleting alert:', error);
    }
}

// = METRICS =

async function loadStats() {
    try {
        const response = await fetch(`${API_BASE}/stats`);
        const stats = await response.json();

        document.getElementById('statTotalDeals').textContent = stats.totalDeals;
        document.getElementById('statVerified').textContent =
            stats.verifiedDeals + stats.promotedDeals;
        document.getElementById('statAvgTime').textContent =
            formatMilliseconds(currentMode === 'centralized' ? stats.averagePromotionTime : stats.averageVerificationTime);
        document.getElementById('statUsers').textContent = stats.totalUsers;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// = NOTIFY =

function showNotification(title, deal) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
        <h3>${title}</h3>
        <p><strong>${deal.title}</strong></p>
        <p>Price: $${deal.price.toFixed(2)}</p>
        <p>Status: ${deal.status}</p>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 5000);
}

function showAlertNotification(notification) {
    const alert = document.createElement('div');
    alert.className = 'notification';
    alert.style.background = '#ff6b6b';
    alert.innerHTML = `
        <h3>🔔 Price Alert Triggered!</h3>
        <p><strong>${notification.deal.title}</strong></p>
        <p>Price: $${notification.deal.price.toFixed(2)}</p>
        <p>Latency: ${formatMilliseconds(notification.latency)}</p>
        <button onclick="window.open('${notification.deal.url}', '_blank')" style="margin-top: 10px;">View Deal</button>
    `;

    document.body.appendChild(alert);

    setTimeout(() => {
        alert.remove();
    }, 10000);
}

function formatTime(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
}

function formatMilliseconds(ms) {
    if (ms === 0) return '0s';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
}
