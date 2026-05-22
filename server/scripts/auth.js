const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { authenticator } = require('otplib');
const { exec } = require('child_process');

function openBrowser(url) {
  const start = (process.platform == 'darwin'? 'open': process.platform == 'win32'? 'start': 'xdg-open');
  exec(`${start} "${url}"`);
}
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const broker = process.argv[2];
const envPath = path.join(__dirname, '../.env');

// Utility to cleanly update the .env file
function updateEnv(key, value) {
  let envFile = fs.readFileSync(envPath, 'utf8');
  const regex = new RegExp(`^${key}=.*`, 'm');
  if (envFile.match(regex)) {
    envFile = envFile.replace(regex, `${key}=${value}`);
  } else {
    envFile += `\n${key}=${value}`;
  }
  fs.writeFileSync(envPath, envFile);
  console.log(`✅ Automatically updated ${key} in .env`);
}

async function fyersAuth() {
  const appId = process.env.FYERS_APP_ID;
  const appSecret = process.env.FYERS_APP_SECRET;
  if (!appId || !appSecret) {
    console.error("❌ Missing FYERS_APP_ID or FYERS_APP_SECRET in .env");
    process.exit(1);
  }
  
  const redirectUri = "http://127.0.0.1:3000/callback";
  const state = crypto.randomBytes(8).toString('hex');
  const authUrl = `https://api-t1.fyers.in/api/v3/generate-authcode?client_id=${appId}&redirect_uri=${redirectUri}&response_type=code&state=${state}`;

  console.log("\n==========================================");
  console.log("FYERS AUTHENTICATION");
  console.log("1. Opening your browser to the Fyers Login page...");
  console.log("2. Please log in on the web page to authorize ARCA Terminal.");
  console.log("3. Make sure your redirect_uri in Fyers dashboard is: http://127.0.0.1:3000/callback");
  console.log("\nIf your browser doesn't open automatically, click this link:");
  console.log(authUrl + "\n");
  console.log("==========================================\n");

  openBrowser(authUrl);

  const app = express();
  const server = app.listen(3000, () => console.log("⏳ Waiting for you to log in on your browser..."));

  app.get('/callback', async (req, res) => {
    const code = req.query.auth_code;
    if (!code) {
      res.send("Error: auth_code not found in URL");
      return;
    }
    res.send("Authorization Code received! You can close this window. Exchanging for access token...");

    try {
      const appIdHash = crypto.createHash('sha256').update(`${appId}:${appSecret}`).digest('hex');
      const tokenRes = await axios.post('https://api-t1.fyers.in/api/v3/validate-authcode', {
        grant_type: "authorization_code",
        appIdHash: appIdHash,
        code: code
      }, { headers: { "Content-Type": "application/json" } });

      if (tokenRes.data && tokenRes.data.access_token) {
        updateEnv("FYERS_ACCESS_TOKEN", tokenRes.data.access_token);
        console.log("🎉 Successfully generated 24-hour Fyers Access Token!");
      } else {
        console.error("❌ Failed to generate Fyers Access Token:", tokenRes.data);
      }
    } catch (err) {
      console.error("❌ Error exchanging token:", err.response ? err.response.data : err.message);
    }
    server.close();
    process.exit(0);
  });
}

async function kiteAuth() {
  const apiKey = process.env.KITE_API_KEY;
  const apiSecret = process.env.KITE_API_SECRET;
  if (!apiKey || !apiSecret) {
    console.error("❌ Missing KITE_API_KEY or KITE_API_SECRET in .env");
    process.exit(1);
  }

  const authUrl = `https://kite.zerodha.com/connect/login?v=3&api_key=${apiKey}`;

  console.log("\n==========================================");
  console.log("ZERODHA KITE AUTHENTICATION");
  console.log("1. Please click the link below to log in.");
  console.log("2. After login, you will be redirected to the local server.");
  console.log("3. Make sure your Redirect URL in Kite developer console is: http://127.0.0.1:3000/callback");
  console.log("\n" + authUrl + "\n");
  console.log("==========================================\n");

  const app = express();
  const server = app.listen(3000, () => console.log("⏳ Waiting for callback on http://127.0.0.1:3000/callback..."));

  app.get('/callback', async (req, res) => {
    const requestToken = req.query.request_token;
    if (!requestToken) return res.send("Error: request_token not found in URL");
    
    res.send("Request Token received! You can close this window. Exchanging for access token...");

    try {
      const checksum = crypto.createHash('sha256').update(`${apiKey}${requestToken}${apiSecret}`).digest('hex');
      const params = new URLSearchParams();
      params.append('api_key', apiKey);
      params.append('request_token', requestToken);
      params.append('checksum', checksum);

      const tokenRes = await axios.post('https://api.kite.trade/session/token', params, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });

      if (tokenRes.data && tokenRes.data.data && tokenRes.data.data.access_token) {
        updateEnv("KITE_ACCESS_TOKEN", tokenRes.data.data.access_token);
        console.log("🎉 Successfully generated 24-hour Kite Access Token!");
      } else {
        console.error("❌ Failed to generate Kite Access Token:", tokenRes.data);
      }
    } catch (err) {
      console.error("❌ Error exchanging token:", err.response ? err.response.data : err.message);
    }
    server.close();
    process.exit(0);
  });
}

async function upstoxAuth() {
  const apiKey = process.env.UPSTOX_API_KEY;
  const apiSecret = process.env.UPSTOX_API_SECRET;
  if (!apiKey || !apiSecret) {
    console.error("❌ Missing UPSTOX_API_KEY or UPSTOX_API_SECRET in .env");
    process.exit(1);
  }

  const redirectUri = "http://127.0.0.1:3000/callback";
  const authUrl = `https://api.upstox.com/v2/login/authorization/dialog?response_type=code&client_id=${apiKey}&redirect_uri=${redirectUri}&state=upstoxauth`;

  console.log("\n==========================================");
  console.log("UPSTOX AUTHENTICATION");
  console.log("1. Please click the link below to log in.");
  console.log("2. After login, you will be redirected to the local server.");
  console.log("3. Make sure your Redirect URL in Upstox developer console is: http://127.0.0.1:3000/callback");
  console.log("\n" + authUrl + "\n");
  console.log("==========================================\n");

  const app = express();
  const server = app.listen(3000, () => console.log("⏳ Waiting for callback on http://127.0.0.1:3000/callback..."));

  app.get('/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.send("Error: code not found in URL");
    
    res.send("Authorization Code received! You can close this window. Exchanging for access token...");

    try {
      const params = new URLSearchParams();
      params.append('code', code);
      params.append('client_id', apiKey);
      params.append('client_secret', apiSecret);
      params.append('redirect_uri', redirectUri);
      params.append('grant_type', 'authorization_code');

      const tokenRes = await axios.post('https://api.upstox.com/v2/login/authorization/token', params, {
        headers: { 
          "Content-Type": "application/x-www-form-urlencoded", 
          "Accept": "application/json" 
        }
      });

      if (tokenRes.data && tokenRes.data.access_token) {
        updateEnv("UPSTOX_ACCESS_TOKEN", tokenRes.data.access_token);
        console.log("🎉 Successfully generated 24-hour Upstox Access Token!");
      } else {
        console.error("❌ Failed to generate Upstox Access Token:", tokenRes.data);
      }
    } catch (err) {
      console.error("❌ Error exchanging token:", err.response ? err.response.data : err.message);
    }
    server.close();
    process.exit(0);
  });
}

async function angelAuth() {
  const apiKey = process.env.ANGEL_API_KEY || "replace_with_smartapi_key";
  const clientCode = process.env.ANGEL_CLIENT_CODE;
  const password = process.env.ANGEL_PASSWORD;
  const totpSecret = process.env.ANGEL_TOTP_SECRET;

  if (!clientCode || !password || !totpSecret) {
    console.error("❌ Missing ANGEL_CLIENT_CODE, ANGEL_PASSWORD, or ANGEL_TOTP_SECRET in .env");
    process.exit(1);
  }

  console.log("\n==========================================");
  console.log("ANGEL ONE AUTHENTICATION");
  console.log("Running fully automated login with TOTP generation...");
  
  try {
    // Generate TOTP on the fly
    const currentTotp = authenticator.generate(totpSecret);
    console.log(`⏳ Generated live TOTP: ${currentTotp}`);

    const res = await axios.post('https://apiconnect.angelbroking.com/rest/auth/angelbroking/user/v1/loginByPassword', {
      clientcode: clientCode,
      password: password,
      totp: currentTotp
    }, {
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-UserType": "USER",
        "X-SourceID": "WEB",
        "X-ClientLocalIP": "127.0.0.1",
        "X-ClientPublicIP": "127.0.0.1",
        "X-MACAddress": "00-00-00-00-00-00",
        "X-PrivateKey": apiKey
      }
    });

    if (res.data && res.data.status === true && res.data.data) {
      updateEnv("ANGEL_FEED_TOKEN", res.data.data.feedToken);
      console.log("🎉 Successfully generated 24-hour Angel One Feed Token!");
    } else {
      console.error("❌ Failed to login to Angel One:", res.data);
    }
  } catch (err) {
    console.error("❌ Error during Angel One login:", err.response ? err.response.data : err.message);
  }
}

async function dhanAuth() {
  console.log("\n==========================================");
  console.log("DHAN API AUTHENTICATION");
  console.log("Dhan requires strict static IP whitelisting for order endpoints.");
  console.log("To securely get your 24-hour access token:");
  console.log("1. Go to https://web.dhan.co and log in.");
  console.log("2. Navigate to 'My Profile' -> 'Access DhanHQ APIs'.");
  console.log("3. Generate your access token and paste it into server/.env as DHAN_ACCESS_TOKEN");
  console.log("==========================================\n");
}

switch(broker) {
  case 'fyers': fyersAuth(); break;
  case 'kite': kiteAuth(); break;
  case 'upstox': upstoxAuth(); break;
  case 'angel': angelAuth(); break;
  case 'dhan': dhanAuth(); break;
  default: 
    console.log("Usage: npm run auth:<broker> [fyers|kite|upstox|angel|dhan]");
}
