const { spawnSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log("Starting ARCA Terminal...\n");

const serverDir = path.join(__dirname, 'server');
const appDir = path.join(__dirname, 'app');
const envPath = path.join(serverDir, '.env');

// Check if .env exists
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');

  const checkAndAuth = (envVar, scriptName, brokerName) => {
    // Basic check: see if the env var exists and has a value
    const regex = new RegExp(`^${envVar}=[a-zA-Z0-9]`, 'm');
    if (regex.test(envContent)) {
      console.log(`Auto-detect: ${brokerName} configured. Launching auth...`);
      spawnSync('npm', ['run', scriptName], { cwd: serverDir, stdio: 'inherit', shell: true });
    }
  };

  checkAndAuth('FYERS_APP_ID', 'auth:fyers', 'Fyers');
  checkAndAuth('KITE_API_KEY', 'auth:kite', 'Zerodha Kite');
  checkAndAuth('UPSTOX_API_KEY', 'auth:upstox', 'Upstox');
  checkAndAuth('ANGEL_CLIENT_CODE', 'auth:angel', 'Angel One');
  checkAndAuth('DHAN_CLIENT_ID', 'auth:dhan', 'Dhan');
}

console.log("\nAuth flow complete. Proceeding to boot Terminal...\n");

// Start backend
console.log("Starting backend proxy server on port 3001...");
const backend = spawn('node', ['index.js'], { cwd: serverDir, stdio: 'inherit', shell: true });

// Start frontend after a slight delay
setTimeout(() => {
  console.log("\nStarting frontend Vite dev server on port 5173...");
  const frontend = spawn('npm', ['run', 'dev'], { cwd: appDir, stdio: 'inherit', shell: true });

  console.log("\n==========================================");
  console.log(" ARCA Terminal is running!");
  console.log("==========================================");
  console.log(" Backend:  http://localhost:3001");
  console.log(" Frontend: http://localhost:5173");
  console.log("==========================================\n");
  console.log("Press Ctrl+C to stop all services...\n");

  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    console.log("\nStopping services...");
    backend.kill('SIGINT');
    frontend.kill('SIGINT');
    process.exit();
  });
}, 2000);
