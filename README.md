# ⚡ ARCA Intelligence Terminal

A powerful, full-featured terminal and dashboard for algorithmic trading, macroeconomic feeds, stock-specific searches, and LLM integration. ARCA Terminal seamlessly connects to multiple US and Indian brokers, providing live data feeds, options chains, global news, and microstructure analysis.

---

## ✨ Features

- **Multi-Broker Support**: Native integrations for leading US brokers (Alpaca, Tradier, Tradestation, Interactive Brokers) and Indian brokers (Fyers, Zerodha Kite, Angel One, Upstox, Dhan).
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

For the terminal to function with live data feeds, you must run both the backend server and the frontend client simultaneously.

**A. Start the API Backend Proxy**
Open a new terminal window:
```bash
cd server
node index.js
```
*Wait for the message: `Server running on port 3001`*

**B. Start the Frontend Client**
Open another terminal window:
```bash
cd app
npm run dev
```
*The client will launch at `http://localhost:5173`*

---

## 🛑 Stopping the Terminal

To stop the servers gracefully, go to the terminal windows where they are running and press `Ctrl + C`.

**Clean Background Port Liberation:**
If the servers were sent to the background or if a terminal session was closed without stopping them, you can forcefully kill the processes on their respective ports:

* **Stop Backend Proxy (Port 3001)**: `kill $(lsof -t -i:3001)`
* **Stop Frontend Client (Port 5173)**: `kill $(lsof -t -i:5173)`

---

## 🧭 Troubleshooting

* **Address in Use (EADDRINUSE)**: If you get an error that the port is already bound, run the `kill` commands above to clear the sockets.
* **No news data or Dossier hangs**: Ensure the backend proxy server at `http://localhost:3001` is actively running. The frontend relies on this proxy to route requests and bypass CORS limitations.
* **Invalid Broker Credentials**: Simply re-run `node setup.js` to securely update your API keys without breaking your `.env` formatting.

---

*Powered by ARCA Intelligence*
