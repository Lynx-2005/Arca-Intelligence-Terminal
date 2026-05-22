#!/bin/bash
# ARCA Terminal - Start All Services

echo "Starting ARCA Terminal..."

    cd /home/madhavan-rithvik/arca-terminal/server
    
    if grep -q "^FYERS_APP_ID=[a-zA-Z0-9]" .env; then
        echo "Auto-detect: Fyers configured. Launching auth..."
        npm run auth:fyers
    fi
    if grep -q "^KITE_API_KEY=[a-zA-Z0-9]" .env; then
        echo "Auto-detect: Zerodha Kite configured. Launching auth..."
        npm run auth:kite
    fi
    if grep -q "^UPSTOX_API_KEY=[a-zA-Z0-9]" .env; then
        echo "Auto-detect: Upstox configured. Launching auth..."
        npm run auth:upstox
    fi
    if grep -q "^ANGEL_CLIENT_CODE=[a-zA-Z0-9]" .env; then
        echo "Auto-detect: Angel One configured. Launching auth..."
        npm run auth:angel
    fi
    if grep -q "^DHAN_CLIENT_ID=[a-zA-Z0-9]" .env; then
        echo "Auto-detect: Dhan configured. Launching auth..."
        npm run auth:dhan
    fi

    echo "Auth flow complete. Proceeding to boot Terminal..."
    echo ""
    cd ..

# Start backend server
echo "Starting backend proxy server on port 3001..."
cd /home/madhavan-rithvik/arca-terminal/server && node index.js &
BACKEND_PID=$!

# Wait a moment for backend to initialize
sleep 2

# Start frontend dev server
echo "Starting frontend Vite dev server on port 5173..."
cd /home/madhavan-rithvik/arca-terminal/app && npm run dev &
FRONTEND_PID=$!

echo ""
echo "=========================================="
echo " ARCA Terminal is running!"
echo "=========================================="
echo " Backend:  http://localhost:3001"
echo " Frontend: http://localhost:5173"
echo "=========================================="
echo ""
echo "Press Ctrl+C to stop all services..."

# Wait for user to press Ctrl+C
wait
