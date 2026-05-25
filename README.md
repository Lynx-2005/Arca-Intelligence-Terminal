# ⚡ ARCA Intelligence Terminal

A powerful, full-featured terminal and dashboard , macroeconomic feeds, stock-specific searches, and LLM integration. ARCA Terminal seamlessly connects to crypto feed ,multiple US and Indian brokers, providing live data feeds, global news, and microstructure analysis.

---

## ✨ Features

- **Multi-Broker Support**: Native integrations for leading US brokers (Alpaca, Tradier, Tradestation, Interactive Brokers) and Indian brokers (Fyers, Zerodha Kite, Angel One, Upstox, Dhan).
- **Crypto-Feed**: use binance open websockets ,so no keys required!.
- **Interactive Setup Wizard**: An animated, secure CLI tool to easily configure all your API keys and automated authentication flows.
- **Global Macro & News**: Live global news mapping, SEC dossiers, and macroeconomic indicators.
- **Microstructure & Order Books**: Live L2 order book visualization and microstructure analysis.
- **AI-Powered Insights**: Integrates with OpenRouter for automated company analysis, moat generation, and bull/bear cases.

---

## 🛠️ Prerequisites

Before launching the terminal, ensure you have:
1. **Node.js**: Version 18 or higher installed (`node -v`).
2. **Ports Available**: Ports `3001` (Backend Proxy) and `5173` (Frontend Vite App) must be free.

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
Run the fully automated requirements script from the root of the project to install all necessary packages for the root, server, and application:

```bash
node requirements.js
```

### 2. Configure Environment (Setup Wizard)
Once requirements are installed, run the interactive setup wizard. This beautiful CLI tool will safely store your API keys and configure your environment variables.

```bash
node setup.js
```
*Follow the on-screen instructions to configure OpenRouter, US Brokers, and Indian Brokers. The wizard handles automated login flows (like TOTP) automatically.*

### 3. Start the Terminal
After finishing the setup run this command to launch the terminal

```bash
./start.sh
```

*The client will launch at `http://localhost:5173`*

---

## 🛑 Stopping the Terminal

To stop the servers gracefully, go to the terminal windows where they are running and press `Ctrl + C`.



---

## 🧭 Troubleshooting

* **Address in Use (EADDRINUSE)**: If you get an error that the port is already bound, run the `kill` commands above to clear the sockets.
* **No news data or Dossier hangs**: Ensure the backend proxy server at `http://localhost:3001` is actively running. The frontend relies on this proxy to route requests and bypass CORS limitations.
* **Invalid Broker Credentials**: Simply re-run `node setup.js` to securely update your API keys without breaking your `.env` formatting.

---

*Powered by ARCA Intelligence*

## Step-by-Step Setup Guide

Follow these steps to download, install, and run the Arca Intelligence Terminal on your local machine.

### Prerequisites
- [Node.js](https://nodejs.org/en/download/) (v16+)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)
- API Keys for Brokers (Optional, required for live trading)

### 1. Clone the Repository
Open your terminal and run:
```bash
git clone https://github.com/yourusername/arca-terminal.git
cd arca-terminal
```

### 2. Install Dependencies
Install dependencies for both the frontend (`app`) and the backend (`server`).

```bash
# Install frontend dependencies
cd app
npm install

# Install backend dependencies
cd ../server
npm install
cd ..
```

### 3. Configure Environment Variables
You need to create `.env` files in both the `app` and `server` directories to configure your API keys.

1. **Backend `.env`**:
   Copy the example file or create a new one in the `server` directory:
   ```bash
   touch server/.env
   ```
   Add the following variables to `server/.env`:
   ```env
   # Example Broker Configuration
   ZERODHA_API_KEY=your_zerodha_api_key
   ZERODHA_API_SECRET=your_zerodha_secret
   UPSTOX_API_KEY=your_upstox_api_key
   UPSTOX_API_SECRET=your_upstox_secret
   ```

2. **Frontend `.env`**:
   Create a new one in the `app` directory:
   ```bash
   touch app/.env
   ```
   Add the following variables to `app/.env`:
   ```env
   VITE_API_URL=http://localhost:3000
   VITE_WS_URL=ws://localhost:3000
   ```

### 4. Broker API Setup (Redirect URLs)
If you are integrating brokers like Zerodha Kite or Upstox, you must configure the **Redirect URLs** in their developer portals when you create your API app.

**Provide these exact Redirect URLs in your broker portal:**
- **Zerodha:** `http://localhost:3000/api/brokers/zerodha/callback`
- **Upstox:** `http://localhost:3000/api/brokers/upstox/callback`

### 5. Run the Application
Start both the backend server and the frontend client simultaneously.

```bash
# Terminal 1: Start the Backend Proxy Server
cd server
npm run dev

# Terminal 2: Start the Frontend App
cd app
npm run dev
```

Your terminal will now be running at `http://localhost:5173`.
