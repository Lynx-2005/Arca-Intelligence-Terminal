# ⚡ ARCA Intelligence Terminal

<p align="center">
  <img src="https://github.com/user-attachments/assets/2ba1b082-af1a-4c1d-9bad-488dcbf92b7b" width="49%" />
  <img src="https://github.com/user-attachments/assets/837ad601-d7ce-4adc-8cfc-16ec3348a9cb" width="49%" />
</p>
<p align="center">
  <img src="https://github.com/user-attachments/assets/409c2e23-dbc2-46f6-9d5a-730a4a051009" width="49%" />
  <img src="https://github.com/user-attachments/assets/051e0f05-1995-4761-af34-744fefe32537" width="49%" />
</p>


A powerful, full-featured terminal and dashboard for, macroeconomic feeds, stock-specific searches, and LLM integration. ARCA Terminal seamlessly connects to multiple US and Indian brokers, providing live data feeds, options chains, global news, and microstructure analysis.

📖 **[Read the Official Indicators & Analytics Documentation](docs/INDICATORS.md)** to learn how to interpret the Microstructure Regimes, Max Pain options engine, and SEC forensic scoring algorithms.

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
### Install Node.js

- **Windows**
  - **Winget**: `winget install OpenJS.NodeJS` (latest) or `winget install OpenJS.NodeJS.LTS` (LTS)
  - **Chocolatey**: `choco install nodejs`

- **Linux**
  - **Version Managers (recommended)**:  
    `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash`  
    then:  
    `nvm install --lts`

- **macOS**
  - **Homebrew (recommended)**: `brew install node` (latest) or `brew install node@lts` (LTS)
  - **Version Managers (recommended)**:  
    `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash`  
    then:  
    `nvm install --lts`
  - **Installer (.pkg)**: Download from [Node.js Official Website](https://nodejs.org/)
## 🚀 Quick Start Guide

### 1. Clone the Repository
Open your terminal and clone the repository:
```bash
git clone https://github.com/Lynx-2005/Arca-Intelligence-Terminal.git
cd Arca-Intelligence-Terminal
```

### 2. Install Dependencies
Run the fully automated requirements script from the root of the project to safely install all necessary packages for both the backend server and frontend client.
```bash
node requirements.js
```

### 3. Configure Environment (Setup Wizard)
Once requirements are installed, run the interactive setup wizard. This beautiful CLI tool will securely store your API keys, configure your environment variables, and show you the exact Redirect URLs required by your brokers.
```bash
node setup.js
```
*Follow the on-screen instructions to configure OpenRouter, US Brokers, and Indian Brokers. The wizard handles automated login flows automatically.*

### 4. Start the Terminal
Once your API keys are securely stored, launch the entire application with a single command:
```bash
node start.js
```
*This cross-platform Node.js script automatically verifies your credentials, triggers any required browser-based authentication flows (like the 24-hour Fyers token exchange), boots up the backend proxy on port 3001, and launches the frontend client at `http://localhost:5173`.*

---

## 🛑 Stopping the Terminal

To stop the servers gracefully, press `Ctrl + C` in the terminal window running `start.js`.

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
