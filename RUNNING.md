# 📻 ARCA TERMINAL — RUNNING INSTRUCTIONS

This guide describes how to start, stop, and manage the backend API proxy server and the frontend Vite web application.

---

## 🛠️ Prerequisites

Before launching the terminal, ensure you have:
1. **Node.js**: Version 18 or higher installed (`node -v`).
2. **Ports Available**: Ports `3001` (Backend) and `5173` (Frontend) must be free.

---

## 🚀 Starting the Terminal

For the terminal to function with live data feeds (News, Indicators, Global Maps, and SEC Dossiers), you must run both the backend server and the frontend client simultaneously.

### 1. Start the API Backend Proxy
The backend server handles all API queries, macroeconomic feeds, stock-specific searches, and handles the LLM integration fallbacks.
```bash
cd /home/madhavan-rithvik/arca-terminal/server
node index.js
```
* **Host**: `http://localhost:3001`
* **Status**: You will see `Server running on port 3001` once online.

### 2. Start the Frontend Client
The frontend launches the Vite-powered React client dashboard.
```bash
cd /home/madhavan-rithvik/arca-terminal/app
npm run dev
```
* **Host**: `http://localhost:5173` (or the fallback port outputted by Vite).

---

## 🛑 Stopping the Terminal

To stop the servers gracefully:

### 1. Standard Termination
In the terminal window/pane where the processes are running:
* Press `Ctrl + C` to cancel execution.

### 2. Clean Background Port Liberation
If the servers were sent to the background or if a terminal session was closed without stopping them, you can forcefully kill the processes on their respective ports:

* **Stop Backend Proxy (Port 3001)**:
  ```bash
  kill $(lsof -t -i:3001)
  ```

* **Stop Frontend Client (Port 5173)**:
  ```bash
  kill $(lsof -t -i:5173)
  ```

---

## 🧭 Troubleshooting

* **Address in Use (EADDRINUSE)**: If you get an error that the port is already bound, run the `kill` commands above to clear the sockets.
* **No news data or Dossier hangs**: Ensure the backend proxy server at `http://localhost:3001` is actively running. The frontend relies on this proxy to route requests and bypass CORS limitations.
