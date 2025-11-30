# Decentralized Deal Verification and Price Alerting System

A peer-to-peer deal discovery platform that uses crowd-computing principles to verify deals and provide personalized price alerts without central authority bias.

## Overview

This project addresses critical limitations in centralized deal aggregation platforms (like Slickdeals) by implementing a decentralized verification system where:

- **Users verify deals** through consensus, not central authority
- **Reputation system** rewards accurate verifications
- **Personalized alerts** trigger immediately upon verification, not after promotion
- **Transparent process** eliminates commercial bias

## Key Features

### Dual-Mode Operation

**Centralized Mode** (Baseline):
- Simulates traditional platforms like Slickdeals
- Vote-based promotion with algorithmic delay
- Alerts trigger only after deals reach front page
- Demonstrates existing system limitations

**Decentralized Mode** (Refinement):
- Consensus-based verification (3 of 5 verifications)
- Immediate alerts upon consensus
- No promotion queue delays
- Reputation-staked verification

### Core Functionality

1. **Deal Submission**: Users post deals with price, URL, category
2. **Verification/Voting**:
   - Centralized: Simple voting
   - Decentralized: Valid/Invalid verification with evidence
3. **Reputation System**: Users earn/lose reputation based on verification accuracy
4. **Price Alerts**: Set personalized thresholds for products
5. **Real-Time Updates**: WebSocket-based live feed

## Quick Start

### Prerequisites

- Node.js (v14+)
- Python 3 (for serving frontend)

### Installation

```bash
# Clone or navigate to project directory
cd /Users/prakharkumar/Documents/play/6675/6675

# Install dependencies
npm install
```

### Running the System

**Terminal 1 - Start Backend Server:**
```bash
npm run dev:backend
# Server runs on http://localhost:3000
```

**Terminal 2 - Start Frontend:**
```bash
cd src/frontend
python3 -m http.server 8080
# Frontend available at http://localhost:8080
```

**Access the Application:**
Open browser to `http://localhost:8080`

### Basic Usage

1. **Create User**: Enter username and click "Login / Register"
2. **Switch Modes**: Click "Switch to Decentralized" to compare behaviors
3. **Submit Deal**: Go to "Submit Deal" tab, fill form, submit
4. **Verify/Vote**:
   - Centralized mode: Click "Vote" button
   - Decentralized mode: Click "✓ Valid" or "✗ Invalid"
5. **Create Alert**: Go to "My Alerts" tab, set keywords and max price
6. **Watch Feed**: Return to "All Deals" tab to see real-time updates

## Project Structure

```
/
├── src/
│   ├── backend/
│   │   └── server.js              # Express + WebSocket server
│   ├── frontend/
│   │   ├── index.html             # UI layout
│   │   └── app.js                 # Client-side logic
│   └── shared/                    # (placeholder for shared types)
├── package.json
└── README.md
```

## API Endpoints

### User Management
- `POST /api/users/register` - Create/login user
- `GET /api/users/:userId` - Get user details
- `GET /api/users` - List all users

### Deal Management
- `POST /api/deals` - Submit new deal
- `GET /api/deals` - List all deals
- `GET /api/deals/:dealId` - Get deal details
- `POST /api/deals/:dealId/vote` - Vote on deal (centralized mode)
- `POST /api/deals/:dealId/verify` - Verify deal (decentralized mode)

### Price Alerts
- `POST /api/alerts` - Create price alert
- `GET /api/alerts/user/:userId` - Get user's alerts
- `DELETE /api/alerts/:alertId` - Delete alert

### Configuration
- `POST /api/config/mode` - Switch between centralized/decentralized
- `GET /api/config` - Get current configuration
- `GET /api/stats` - Get system statistics

## WebSocket Events

Real-time updates via WebSocket on `ws://localhost:3000`:

- `NEW_DEAL` - New deal submitted
- `DEAL_UPDATED` - Deal votes/verifications changed
- `DEAL_PROMOTED` - Deal promoted to front page (centralized)
- `DEAL_VERIFIED` - Deal reached consensus (decentralized)
- `ALERT_TRIGGERED` - User's price alert matched
- `CONFIG_UPDATED` - System mode changed

## Testing Scenarios

### Scenario 1: Baseline Promotion Delay

```
1. Ensure mode is "Centralized"
2. User A submits deal
3. User B creates matching alert
4. Users vote (need 5 votes for promotion)
5. Wait 10 seconds for promotion check
6. Observe: Alert triggers only after promotion
7. Check stats: Note "Average Time"
```

### Scenario 2: Decentralized Verification Speed

```
1. Switch to "Decentralized" mode
2. User A submits deal
3. User B creates matching alert
4. 3 users verify as "Valid"
5. Observe: Alert triggers immediately on 3rd verification
6. Check stats: Compare "Average Time" with centralized
```

### Scenario 3: Failed Promotion (Baseline Weakness)

```
1. Ensure mode is "Centralized"
2. User A submits deal
3. User B creates matching alert (keywords, price match)
4. Only 2 users vote (below 5-vote threshold)
5. Wait 10 seconds
6. Observe: Deal NOT promoted, alert NEVER triggers
7. Demonstrates: Personal criteria ignored without popularity
```

## Key Metrics Tracked

- **Total Deals**: All submitted deals
- **Verified/Promoted**: Deals that passed threshold
- **Average Time**: Time from submission to verification/promotion
- **Alert Latency**: Time from deal submission to user notification

## Technology Stack

- **Backend**: Node.js, Express.js, ws (WebSocket)
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Data Storage**: In-memory (Map objects) for POC
- **Real-Time**: WebSocket for bidirectional communication

## Configuration

Edit `src/backend/server.js` to adjust:

```javascript
state.config = {
  mode: 'centralized', // or 'decentralized'
  promotionThreshold: 5, // votes needed
  promotionDelaySimulated: 10000, // 10 seconds for demo
  // promotionDelaySimulated: 14400000, // 4 hours realistic
}
```
