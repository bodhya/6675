/**
 * Baseline Design: Dealbuster
 *
 * This simulates a traditional Slickdeals-like platform with:
 * - Central server authority
 * - Promotion queue with algorithmic delays
 * - Vote-based promotion (no real verification)
 */

const express = require('express');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory data store
const state = {
  deals: new Map(),
  users: new Map(),
  verifications: new Map(),
  alerts: new Map(),
  config: {
    // BASELINE CONFIG: Centralized promotion model
    mode: 'centralized', // 'centralized' or 'decentralized'
    promotionThreshold: 5, // votes needed for promotion
    promotionDelay: 4 * 60 * 60 * 1000, // 4 hours in milliseconds (simulated)
    promotionDelaySimulated: 10000, // 10 seconds for demo purposes
  }
};

// WebSocket server for real-time updates
const wss = new WebSocket.Server({ noServer: true });

const connectedClients = new Set();

wss.on('connection', (ws) => {
  connectedClients.add(ws);
  console.log('Client connected. Total clients:', connectedClients.size);

  ws.on('close', () => {
    connectedClients.delete(ws);
    console.log('Client disconnected. Total clients:', connectedClients.size);
  });
});

// Broadcast to all connected clients
function broadcast(message) {
  const data = JSON.stringify(message);
  connectedClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// = Users =

app.post('/api/users/register', (req, res) => {
  const { username } = req.body;

  if (!username || username.trim().length === 0) {
    return res.status(400).json({ error: 'Username required' });
  }

  for (let user of state.users.values()) {
    if (user.username === username) {
      return res.status(409).json({ error: 'Username already exists' });
    }
  }

  const userId = uuidv4();
  const user = {
    id: userId,
    username: username.trim(),
    reputationScore: 100, // Starting reputation
    verificationHistory: [],
    createdAt: Date.now()
  };

  state.users.set(userId, user);

  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      reputationScore: user.reputationScore
    }
  });
});

app.get('/api/users/:userId', (req, res) => {
  const user = state.users.get(req.params.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

app.get('/api/users', (req, res) => {
  const users = Array.from(state.users.values()).map(u => ({
    id: u.id,
    username: u.username,
    reputationScore: u.reputationScore,
    verificationsCount: u.verificationHistory.length
  }));
  res.json(users);
});

// = Deals =

app.post('/api/deals', (req, res) => {
  const { title, price, originalPrice, url, productCategory, submittedBy } = req.body;

  if (!title || !price || !url || !submittedBy) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const user = state.users.get(submittedBy);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const dealId = uuidv4();
  const deal = {
    id: dealId,
    title,
    price: parseFloat(price),
    originalPrice: originalPrice ? parseFloat(originalPrice) : null,
    url,
    productCategory: productCategory || 'General',
    submittedBy,
    submittedByUsername: user.username,
    timestamp: Date.now(),
    verifications: [],
    votes: 0, // BASELINE: simple vote count
    status: 'pending', // pending, promoted, expired
    promotedAt: null
  };

  state.deals.set(dealId, deal);

  // BASELINE: Schedule promotion check after delay
  if (state.config.mode === 'centralized') {
    setTimeout(() => checkPromotion(dealId), state.config.promotionDelaySimulated);
  }

  broadcast({
    type: 'NEW_DEAL',
    deal
  });

  res.json({ success: true, deal });
});

app.get('/api/deals', (req, res) => {
  const deals = Array.from(state.deals.values())
    .sort((a, b) => b.timestamp - a.timestamp);
  res.json(deals);
});

app.get('/api/deals/:dealId', (req, res) => {
  const deal = state.deals.get(req.params.dealId);
  if (!deal) {
    return res.status(404).json({ error: 'Deal not found' });
  }
  res.json(deal);
});

// = BASELINE: PROMOTIONS =

function checkPromotion(dealId) {
  const deal = state.deals.get(dealId);
  if (!deal || deal.status !== 'pending') return;

  // BASELINE: Promote if vote threshold reached
  if (deal.votes >= state.config.promotionThreshold) {
    deal.status = 'promoted';
    deal.promotedAt = Date.now();

    broadcast({
      type: 'DEAL_PROMOTED',
      deal
    });

    // Check alerts ONLY after promotion
    checkAlertsForDeal(deal);

    console.log(`[BASELINE] Deal ${deal.id} promoted after ${(deal.promotedAt - deal.timestamp) / 1000}s`);
  } else {
    console.log(`[BASELINE] Deal ${deal.id} did NOT promote (${deal.votes}/${state.config.promotionThreshold} votes)`);
  }
}

// = VOTING (BASELINE) vs VERIFICATION (DECENTRALIZED) =

app.post('/api/deals/:dealId/vote', (req, res) => {
  const { userId } = req.body;
  const deal = state.deals.get(req.params.dealId);

  if (!deal) {
    return res.status(404).json({ error: 'Deal not found' });
  }

  const user = state.users.get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Simple vote increment (no verification logic)
  deal.votes += 1;

  broadcast({
    type: 'DEAL_UPDATED',
    deal
  });

  res.json({ success: true, deal });
});

app.post('/api/deals/:dealId/verify', (req, res) => {
  const { userId, verdict, evidence } = req.body;
  const deal = state.deals.get(req.params.dealId);

  if (!deal) {
    return res.status(404).json({ error: 'Deal not found' });
  }

  const user = state.users.get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Check if user already verified this deal
  if (deal.verifications.some(v => v.verifierId === userId)) {
    return res.status(409).json({ error: 'You already verified this deal' });
  }

  const verification = {
    id: uuidv4(),
    dealId: deal.id,
    verifierId: userId,
    verifierUsername: user.username,
    verdict: verdict, // 'valid' or 'invalid'
    evidence: evidence || '',
    timestamp: Date.now()
  };

  deal.verifications.push(verification);
  state.verifications.set(verification.id, verification);
  user.verificationHistory.push(verification.id);

  // DECENTRALIZED MODE: Check consensus immediately
  if (state.config.mode === 'decentralized') {
    checkConsensus(deal);
  }

  broadcast({
    type: 'DEAL_UPDATED',
    deal
  });

  res.json({ success: true, verification, deal });
});

// = DECENTRALIZED: CONSENSUS BASED =

function checkConsensus(deal) {
  const CONSENSUS_THRESHOLD = 3; // Need 3 verifications
  const validVerifications = deal.verifications.filter(v => v.verdict === 'valid').length;
  const invalidVerifications = deal.verifications.filter(v => v.verdict === 'invalid').length;

  if (validVerifications >= CONSENSUS_THRESHOLD && deal.status === 'pending') {
    deal.status = 'verified';
    deal.verifiedAt = Date.now();

    broadcast({
      type: 'DEAL_VERIFIED',
      deal
    });

    // DECENTRALIZED: Check alerts immediately upon verification
    checkAlertsForDeal(deal);

    console.log(`[DECENTRALIZED] Deal ${deal.id} verified after ${(deal.verifiedAt - deal.timestamp) / 1000}s`);
  } else if (invalidVerifications >= CONSENSUS_THRESHOLD && deal.status === 'pending') {
    deal.status = 'rejected';

    broadcast({
      type: 'DEAL_REJECTED',
      deal
    });

    console.log(`[DECENTRALIZED] Deal ${deal.id} rejected`);
  }
}

// = ALERTS =

app.post('/api/alerts', (req, res) => {
  const { userId, productKeywords, maxPrice, minVerifications } = req.body;

  if (!userId || !productKeywords || !maxPrice) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const user = state.users.get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const alertId = uuidv4();
  const alert = {
    id: alertId,
    userId,
    productKeywords: productKeywords.toLowerCase(),
    maxPrice: parseFloat(maxPrice),
    minVerifications: minVerifications || 3,
    createdAt: Date.now(),
    triggered: []
  };

  state.alerts.set(alertId, alert);

  res.json({ success: true, alert });
});

app.get('/api/alerts/user/:userId', (req, res) => {
  const userAlerts = Array.from(state.alerts.values())
    .filter(a => a.userId === req.params.userId);
  res.json(userAlerts);
});

app.delete('/api/alerts/:alertId', (req, res) => {
  const deleted = state.alerts.delete(req.params.alertId);
  res.json({ success: deleted });
});

function checkAlertsForDeal(deal) {
  const alerts = Array.from(state.alerts.values());

  alerts.forEach(alert => {
    // Check if deal matches alert criteria
    const keywordsMatch = deal.title.toLowerCase().includes(alert.productKeywords) ||
                          deal.productCategory.toLowerCase().includes(alert.productKeywords);
    const priceMatch = deal.price <= alert.maxPrice;
    const verificationMatch = deal.verifications.length >= alert.minVerifications;

    if (keywordsMatch && priceMatch && verificationMatch) {
      // Check if already triggered for this deal
      if (!alert.triggered.includes(deal.id)) {
        alert.triggered.push(deal.id);

        const notification = {
          alertId: alert.id,
          dealId: deal.id,
          userId: alert.userId,
          deal: deal,
          timestamp: Date.now(),
          latency: Date.now() - deal.timestamp // Time from deal submission to alert
        };

        broadcast({
          type: 'ALERT_TRIGGERED',
          notification
        });

        console.log(`[ALERT] Triggered for user ${alert.userId}: ${deal.title} at $${deal.price} (latency: ${notification.latency}ms)`);
      }
    }
  });
}

// = CONFIG =

app.post('/api/config/mode', (req, res) => {
  const { mode } = req.body;

  if (mode !== 'centralized' && mode !== 'decentralized') {
    return res.status(400).json({ error: 'Mode must be "centralized" or "decentralized"' });
  }

  state.config.mode = mode;

  broadcast({
    type: 'CONFIG_UPDATED',
    config: state.config
  });

  res.json({ success: true, config: state.config });
});

app.get('/api/config', (req, res) => {
  res.json(state.config);
});

// = METRICS =

app.get('/api/stats', (req, res) => {
  const deals = Array.from(state.deals.values());

  const stats = {
    totalDeals: deals.length,
    pendingDeals: deals.filter(d => d.status === 'pending').length,
    promotedDeals: deals.filter(d => d.status === 'promoted').length,
    verifiedDeals: deals.filter(d => d.status === 'verified').length,
    rejectedDeals: deals.filter(d => d.status === 'rejected').length,
    totalUsers: state.users.size,
    totalAlerts: state.alerts.size,
    totalVerifications: state.verifications.size,
    averagePromotionTime: calculateAveragePromotionTime(deals),
    averageVerificationTime: calculateAverageVerificationTime(deals)
  };

  res.json(stats);
});

function calculateAveragePromotionTime(deals) {
  const promotedDeals = deals.filter(d => d.promotedAt);
  if (promotedDeals.length === 0) return 0;

  const totalTime = promotedDeals.reduce((sum, d) => sum + (d.promotedAt - d.timestamp), 0);
  return totalTime / promotedDeals.length;
}

function calculateAverageVerificationTime(deals) {
  const verifiedDeals = deals.filter(d => d.verifiedAt);
  if (verifiedDeals.length === 0) return 0;

  const totalTime = verifiedDeals.reduce((sum, d) => sum + (d.verifiedAt - d.timestamp), 0);
  return totalTime / verifiedDeals.length;
}

// = SERVER =

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Mode: ${state.config.mode}`);
});

// Upgrade HTTP server to WebSocket
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
  });
});
