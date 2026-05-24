const path = require('path');
const SERVER = path.join(__dirname, 'server');

module.paths.unshift(path.join(SERVER, 'node_modules'));
const p = require('@clack/prompts');
const pc = require('picocolors');
const fs = require('fs');
const { authenticator } = require('otplib');
const axios = require('axios');
require('dotenv').config({ path: path.join(SERVER, '.env') });

const envPath = path.join(SERVER, '.env');

// ─── Utilities ───────────────────────────────────────────

function loadEnv() {
  const env = {};
  try {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const m = line.match(/^([^#=]+)=("?)(.*?)\2$/);
      if (m) env[m[1].trim()] = m[3];
    }
  } catch {}
  return env;
}

function saveEnv(key, value) {
  let envFile = fs.readFileSync(envPath, 'utf8');
  const re = new RegExp(`^${key}=.*`, 'm');
  if (envFile.match(re)) {
    envFile = envFile.replace(re, `${key}=${value}`);
  } else {
    envFile += `\n${key}=${value}`;
  }
  fs.writeFileSync(envPath, envFile);
}

function statusIcon(ok) {
  return ok ? '●' : '○';
}

function statusLabel(ok) {
  return ok ? 'CONFIGURED' : 'EMPTY';
}

function isSet(env, ...keys) {
  return keys.every(k => env[k] && env[k].length > 0);
}

async function getField(env, key, label, opts = {}) {
  const current = env[key] || '';
  const method = opts.secret ? p.password : p.text;
  const result = await method({
    message: label,
    initialValue: current || undefined,
    placeholder: opts.placeholder || (current ? 'keep current' : 'leave empty to skip'),
    validate: (val) => {
      if (opts.required && (!val || val.trim() === '')) return `${label} is required`;
    },
  });
  if (p.isCancel(result)) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }
  if (result && result.trim()) {
    saveEnv(key, result.trim());
    env[key] = result.trim();
  }
  return result;
}

function formatUrl(url) {
  return `\n  ${url}\n`;
}

// ─── Broker Configurators ────────────────────────────────

async function configureOpenRouter(env) {
  p.note(
    'OpenRouter provides AI-powered company analysis (bull/bear cases, moat analysis).\nGet a free API key at https://openrouter.ai/keys',
    'OPENROUTER'
  );
  const ok = isSet(env, 'OPENROUTER_API_KEY');
  const want = await p.confirm({
    message: `OpenRouter API Key  ${statusIcon(ok)} ${statusLabel(ok)}`,
    initialValue: !ok,
  });
  if (p.isCancel(want)) { p.cancel('Cancelled.'); process.exit(0); }
  if (!want) return;

  await getField(env, 'OPENROUTER_API_KEY', 'Enter your OpenRouter API key', {
    secret: true,
    required: true,
    placeholder: 'sk-or-v1-...',
  });
}

async function configureFyers(env) {
  const ok = isSet(env, 'FYERS_APP_ID', 'FYERS_APP_SECRET', 'FYERS_ACCESS_TOKEN');
  p.note(
    ok
      ? `  ${statusIcon(true)}  FYERS_APP_ID, FYERS_APP_SECRET, FYERS_ACCESS_TOKEN — all set`
      : `  ${statusIcon(false)}  Not configured`,
    'FYERS'
  );

  const want = await p.confirm({
    message: `${ok ? 'Re-configure' : 'Configure'} Fyers?`,
    initialValue: !ok,
  });
  if (p.isCancel(want)) { p.cancel('Cancelled.'); process.exit(0); }
  if (!want) return;

  await getField(env, 'FYERS_APP_ID', 'Fyers App ID', {
    required: true,
    placeholder: 'XXXXXXXXXX-100',
  });
  await getField(env, 'FYERS_APP_SECRET', 'Fyers App Secret', {
    secret: true,
    required: true,
    placeholder: 'XXXXXXXXXXXXXXXX',
  });

  p.note(
    `When creating your Fyers app, set the redirect URL to:${formatUrl('http://127.0.0.1:3000/callback')}After saving your API keys, run:\n  npm run auth:fyers\n\nThis will open your browser for OAuth login.`,
    'FYERS OAUTH'
  );
}

async function configureKite(env) {
  const ok = isSet(env, 'KITE_API_KEY', 'KITE_API_SECRET', 'KITE_ACCESS_TOKEN');
  p.note(
    ok
      ? `  ${statusIcon(true)}  KITE_API_KEY, KITE_API_SECRET, KITE_ACCESS_TOKEN — all set`
      : `  ${statusIcon(false)}  Not configured`,
    'ZERODHA KITE'
  );

  const want = await p.confirm({
    message: `${ok ? 'Re-configure' : 'Configure'} Zerodha Kite?`,
    initialValue: !ok,
  });
  if (p.isCancel(want)) { p.cancel('Cancelled.'); process.exit(0); }
  if (!want) return;

  await getField(env, 'KITE_API_KEY', 'Kite API Key', {
    required: true,
    placeholder: 'XXXXXXXXXXXXXXXX',
  });
  await getField(env, 'KITE_API_SECRET', 'Kite API Secret', {
    secret: true,
    required: true,
    placeholder: 'XXXXXXXXXXXXXXXX',
  });

  p.note(
    `When creating your Kite app, set the redirect URL to:${formatUrl('http://127.0.0.1:3000/callback')}After saving your API keys, run:\n  npm run auth:kite\n\nThis will open your browser for OAuth login.`,
    'KITE OAUTH'
  );
}

async function configureAngel(env) {
  const ok = isSet(env, 'ANGEL_API_KEY', 'ANGEL_CLIENT_CODE', 'ANGEL_PASSWORD', 'ANGEL_TOTP_SECRET', 'ANGEL_FEED_TOKEN');
  p.note(
    ok
      ? `  ${statusIcon(true)}  ANGEL_API_KEY, ANGEL_CLIENT_CODE, ANGEL_PASSWORD, ANGEL_TOTP_SECRET — all set`
      : `  ${statusIcon(false)}  Not configured`,
    'ANGEL ONE'
  );

  const want = await p.confirm({
    message: `${ok ? 'Re-configure' : 'Configure'} Angel One?`,
    initialValue: !ok,
  });
  if (p.isCancel(want)) { p.cancel('Cancelled.'); process.exit(0); }
  if (!want) return;

  await getField(env, 'ANGEL_CLIENT_CODE', 'Angel One Client Code', {
    required: true,
    placeholder: 'Your trading login ID',
  });
  await getField(env, 'ANGEL_PASSWORD', 'Angel One Password', {
    secret: true,
    required: true,
    placeholder: 'Your trading password',
  });
  await getField(env, 'ANGEL_TOTP_SECRET', 'Angel One TOTP Secret', {
    secret: true,
    required: true,
    placeholder: 'Base32 secret from 2FA setup',
  });

  await getField(env, 'ANGEL_API_KEY', 'Angel One SmartAPI Key', {
    required: true,
    placeholder: 'Your SmartAPI key',
  });

  p.note(
    'Angel One uses fully automated auth (TOTP generation + API login).\nNo browser redirect needed.',
    'ANGEL AUTH'
  );

  const runAuth = await p.confirm({
    message: 'Run Angel One auto-auth now?',
    initialValue: true,
  });
  if (p.isCancel(runAuth)) { p.cancel('Cancelled.'); process.exit(0); }
  if (runAuth) {
    const sp = p.spinner();
    sp.start('Generating TOTP and logging into Angel One...');
    try {
      const apiKey = env.ANGEL_API_KEY || process.env.ANGEL_API_KEY;
      const clientCode = env.ANGEL_CLIENT_CODE || process.env.ANGEL_CLIENT_CODE;
      const password = env.ANGEL_PASSWORD || process.env.ANGEL_PASSWORD;
      const totpSecret = env.ANGEL_TOTP_SECRET || process.env.ANGEL_TOTP_SECRET;
      const currentTotp = authenticator.generate(totpSecret);
      const res = await axios.post('https://apiconnect.angelbroking.com/rest/auth/angelbroking/user/v1/loginByPassword', {
        clientcode: clientCode,
        password: password,
        totp: currentTotp,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-UserType': 'USER',
          'X-SourceID': 'WEB',
          'X-ClientLocalIP': '127.0.0.1',
          'X-ClientPublicIP': '127.0.0.1',
          'X-MACAddress': '00-00-00-00-00-00',
          'X-PrivateKey': apiKey,
        },
      });
      if (res.data && res.data.status === true && res.data.data) {
        saveEnv('ANGEL_FEED_TOKEN', res.data.data.feedToken);
        env.ANGEL_FEED_TOKEN = res.data.data.feedToken;
        if (res.data.data.jwtToken) {
          saveEnv('ANGEL_JWT_TOKEN', res.data.data.jwtToken);
          env.ANGEL_JWT_TOKEN = res.data.data.jwtToken;
        }
        sp.stop('Angel One authenticated successfully! Feed token saved.');
      } else {
        sp.stop('Angel One login failed. Check your credentials.');
      }
    } catch (err) {
      sp.stop(`Angel One auth error: ${err.message}`);
    }
  }
}

async function configureDhan(env) {
  const ok = isSet(env, 'DHAN_CLIENT_ID', 'DHAN_ACCESS_TOKEN');
  p.note(
    ok
      ? `  ${statusIcon(true)}  DHAN_CLIENT_ID, DHAN_ACCESS_TOKEN — all set`
      : `  ${statusIcon(false)}  Not configured`,
    'DHAN'
  );

  const want = await p.confirm({
    message: `${ok ? 'Re-configure' : 'Configure'} Dhan?`,
    initialValue: !ok,
  });
  if (p.isCancel(want)) { p.cancel('Cancelled.'); process.exit(0); }
  if (!want) return;

  await getField(env, 'DHAN_CLIENT_ID', 'Dhan Client ID', {
    required: true,
    placeholder: 'Your Dhan client ID',
  });
  await getField(env, 'DHAN_ACCESS_TOKEN', 'Dhan Access Token', {
    secret: true,
    required: true,
    placeholder: 'Your Dhan API access token',
  });

  p.note(
    'Dhan requires a static IP whitelist for order endpoints.\nTo generate your access token:\n  1. Go to https://web.dhan.co\n  2. Navigate to My Profile → Access DhanHQ APIs\n  3. Generate and copy your access token\n  4. Paste it above',
    'DHAN AUTH'
  );
}

async function configureUpstox(env) {
  const ok = isSet(env, 'UPSTOX_API_KEY', 'UPSTOX_API_SECRET', 'UPSTOX_ACCESS_TOKEN');
  p.note(
    ok
      ? `  ${statusIcon(true)}  UPSTOX_API_KEY, UPSTOX_API_SECRET, UPSTOX_ACCESS_TOKEN — all set`
      : `  ${statusIcon(false)}  Not configured`,
    'UPSTOX'
  );

  const want = await p.confirm({
    message: `${ok ? 'Re-configure' : 'Configure'} Upstox?`,
    initialValue: !ok,
  });
  if (p.isCancel(want)) { p.cancel('Cancelled.'); process.exit(0); }
  if (!want) return;

  await getField(env, 'UPSTOX_API_KEY', 'Upstox API Key', {
    required: true,
    placeholder: 'Your Upstox API key',
  });
  await getField(env, 'UPSTOX_API_SECRET', 'Upstox API Secret', {
    secret: true,
    required: true,
    placeholder: 'Your Upstox API secret',
  });

  p.note(
    `When creating your Upstox app, set the redirect URL to:${formatUrl('http://127.0.0.1:3000/callback')}After saving your API keys, run:\n  npm run auth:upstox\n\nThis will open your browser for OAuth login.`,
    'UPSTOX OAUTH'
  );
}

async function configureAlpaca(env) {
  const ok = isSet(env, 'ALPACA_API_KEY', 'ALPACA_SECRET_KEY');
  p.note(
    ok
      ? `  ${statusIcon(true)}  ALPACA_API_KEY, ALPACA_SECRET_KEY — all set`
      : `  ${statusIcon(false)}  Not configured`,
    'ALPACA'
  );

  const want = await p.confirm({
    message: `${ok ? 'Re-configure' : 'Configure'} Alpaca?`,
    initialValue: !ok,
  });
  if (p.isCancel(want)) { p.cancel('Cancelled.'); process.exit(0); }
  if (!want) return;

  await getField(env, 'ALPACA_API_KEY', 'Alpaca API Key', {
    required: true,
    placeholder: 'Your Alpaca API key',
  });
  await getField(env, 'ALPACA_SECRET_KEY', 'Alpaca Secret Key', {
    secret: true,
    required: true,
    placeholder: 'Your Alpaca secret key',
  });

  const feed = await p.select({
    message: 'Alpaca data feed',
    initialValue: env.ALPACA_FEED || 'sip',
    options: [
      { value: 'sip', label: 'SIP (full market — requires subscription)' },
      { value: 'iep', label: 'IEP (free — IEX only)' },
    ],
  });
  if (p.isCancel(feed)) { p.cancel('Cancelled.'); process.exit(0); }
  saveEnv('ALPACA_FEED', feed);
  env.ALPACA_FEED = feed;
}

async function configurePolygon(env) {
  const ok = isSet(env, 'POLYGON_API_KEY');
  p.note(
    ok
      ? `  ${statusIcon(true)}  POLYGON_API_KEY — set`
      : `  ${statusIcon(false)}  Not configured`,
    'POLYGON'
  );

  const want = await p.confirm({
    message: `${ok ? 'Re-configure' : 'Configure'} Polygon?`,
    initialValue: !ok,
  });
  if (p.isCancel(want)) { p.cancel('Cancelled.'); process.exit(0); }
  if (!want) return;

  await getField(env, 'POLYGON_API_KEY', 'Polygon API Key', {
    secret: true,
    required: true,
    placeholder: 'Your Polygon.io API key',
  });
}

async function configureTradier(env) {
  const ok = isSet(env, 'TRADIER_ACCESS_TOKEN');
  p.note(
    ok
      ? `  ${statusIcon(true)}  TRADIER_ACCESS_TOKEN — set`
      : `  ${statusIcon(false)}  Not configured`,
    'TRADIER'
  );

  const want = await p.confirm({
    message: `${ok ? 'Re-configure' : 'Configure'} Tradier?`,
    initialValue: !ok,
  });
  if (p.isCancel(want)) { p.cancel('Cancelled.'); process.exit(0); }
  if (!want) return;

  await getField(env, 'TRADIER_ACCESS_TOKEN', 'Tradier Access Token', {
    secret: true,
    required: true,
    placeholder: 'Your Tradier access token',
  });
}

async function configureFinnhub(env) {
  const ok = isSet(env, 'FINNHUB_API_KEY');
  p.note(
    ok
      ? `  ${statusIcon(true)}  FINNHUB_API_KEY — set`
      : `  ${statusIcon(false)}  Not configured`,
    'FINNHUB'
  );

  const want = await p.confirm({
    message: `${ok ? 'Re-configure' : 'Configure'} Finnhub?`,
    initialValue: !ok,
  });
  if (p.isCancel(want)) { p.cancel('Cancelled.'); process.exit(0); }
  if (!want) return;

  await getField(env, 'FINNHUB_API_KEY', 'Finnhub API Key', {
    secret: true,
    required: true,
    placeholder: 'Your Finnhub API key',
  });
}

// ─── Summary ─────────────────────────────────────────────

function printSummary(env) {
  const rows = [
    ['OpenRouter', isSet(env, 'OPENROUTER_API_KEY')],
    ['───', ''],
    ['Fyers', isSet(env, 'FYERS_APP_ID', 'FYERS_APP_SECRET', 'FYERS_ACCESS_TOKEN')],
    ['Kite', isSet(env, 'KITE_API_KEY', 'KITE_API_SECRET', 'KITE_ACCESS_TOKEN')],
    ['Angel One', isSet(env, 'ANGEL_API_KEY', 'ANGEL_CLIENT_CODE', 'ANGEL_PASSWORD', 'ANGEL_TOTP_SECRET', 'ANGEL_FEED_TOKEN')],
    ['Dhan', isSet(env, 'DHAN_CLIENT_ID', 'DHAN_ACCESS_TOKEN')],
    ['Upstox', isSet(env, 'UPSTOX_API_KEY', 'UPSTOX_API_SECRET', 'UPSTOX_ACCESS_TOKEN')],
    ['───', ''],
    ['Alpaca', isSet(env, 'ALPACA_API_KEY', 'ALPACA_SECRET_KEY')],
    ['Polygon', isSet(env, 'POLYGON_API_KEY')],
    ['Tradier', isSet(env, 'TRADIER_ACCESS_TOKEN')],
    ['Finnhub', isSet(env, 'FINNHUB_API_KEY')],
  ];

  const labelWidth = 12;
  const lines = rows.map(([label, ok]) => {
    if (label === '───') return `  ─────────────────────`;
    const padded = label.padEnd(labelWidth);
    return ok
      ? `  ${padded}  ${pc.green('● CONFIGURED')}`
      : `  ${padded}  ${pc.dim('○ EMPTY')}`;
  });

  p.note(lines.join('\n'), 'SETUP SUMMARY');
}

// ─── Main ────────────────────────────────────────────────

async function playIntroAnimation() {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  
  console.clear();
  const art = [
    "    █████╗ ██████╗  ██████╗ █████╗ ",
    "   ██╔══██╗██╔══██╗██╔════╝██╔══██╗",
    "   ███████║██████╔╝██║     ███████║",
    "   ██╔══██║██╔══██╗██║     ██╔══██║",
    "   ██║  ██║██║  ██║╚██████╗██║  ██║",
    "   ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝",
    "                                   ",
    "      T E R M I N A L   S E T U P  "
  ];

  console.log("\\n");
  for (let i = 0; i < art.length; i++) {
    console.log(pc.cyan(pc.bold(art[i])));
    await sleep(60);
  }
  console.log("\\n");

  const msg = " Initializing Secure Environment...";
  for(let i=0; i<30; i++) {
    process.stdout.write(`\\r  ${pc.magenta(frames[i % frames.length])}${pc.white(msg)}`);
    await sleep(50);
  }
  process.stdout.write(`\\r  ${pc.green('✔')}${pc.white(msg)} done.\\n\\n`);
}

async function main() {
  await playIntroAnimation();
  p.intro(`${pc.bgCyan(pc.black(' ARCA '))} ${pc.bold('Terminal — API Setup Wizard')}`);

  const env = loadEnv();

  // ── OpenRouter ──
  await configureOpenRouter(env);

  // ── Market Choice ──
  console.log('');
  const market = await p.select({
    message: 'Which market do you want to configure?',
    initialValue: 'indian',
    options: [
      { value: 'indian', label: 'Indian Equity Brokers (Fyers, Kite, Angel, Dhan, Upstox)' },
      { value: 'us', label: 'US Brokers & Market Data (Alpaca, Polygon, Tradier, Finnhub)' },
      { value: 'both', label: 'Both — configure all brokers' },
    ],
  });
  if (p.isCancel(market)) { p.cancel('Cancelled.'); process.exit(0); }

  if (market === 'indian' || market === 'both') {
    console.log(`\n${pc.bold(pc.bgYellow(pc.black(' INDIAN EQUITY BROKERS ')))}`);
    await configureFyers(env);
    await configureKite(env);
    await configureAngel(env);
    await configureDhan(env);
    await configureUpstox(env);
  }

  if (market === 'us' || market === 'both') {
    console.log(`\n${pc.bold(pc.bgBlue(pc.black(' US BROKERS & MARKET DATA ')))}`);
    await configureAlpaca(env);
    await configurePolygon(env);
    await configureTradier(env);
    await configureFinnhub(env);
  }

  // ── Summary ──
  console.log('');
  printSummary(env);

  p.outro(
    `${pc.green('✓')} Setup complete!\n\n` +
    `  ${pc.bold('Start the Terminal:')}\n` +
    `  $ ${pc.cyan('./start.sh')}\n\n` +
    `  ${pc.dim('Or run services individually:')}\n` +
    `  ${pc.dim('  server: cd server && node index.js')}\n` +
    `  ${pc.dim('  client: cd app && npm run dev')}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
