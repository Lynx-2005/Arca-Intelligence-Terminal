const axios = require('axios');
const { default: YF } = require('yahoo-finance2');
const yahooFinance = new YF();

// ==========================================
// MAX PAIN ALGORITHM (same as Deribit)
// ==========================================
function calculateMaxPain(callsAndPuts) {
  const strikes = Array.from(new Set(callsAndPuts.map(o => o.strike))).sort((a,b) => a - b);
  let minPain = Infinity;
  let maxPainStrike = null;
  for (const s of strikes) {
    let pain = 0;
    for (const opt of callsAndPuts) {
      if (opt.type === 'C' && s > opt.strike) pain += (s - opt.strike) * opt.oi;
      else if (opt.type === 'P' && s < opt.strike) pain += (opt.strike - s) * opt.oi;
    }
    if (pain < minPain) { minPain = pain; maxPainStrike = s; }
  }
  return maxPainStrike;
}

// Build normalized levels array from OI data
function buildLevels(callsAndPuts, source, expStr, expLabel) {
  const levels = [];
  let maxCall = null, maxPut = null;
  callsAndPuts.forEach(opt => {
    if (opt.type === 'C' && (!maxCall || opt.oi > maxCall.oi)) maxCall = opt;
    if (opt.type === 'P' && (!maxPut || opt.oi > maxPut.oi)) maxPut = opt;
  });
  if (maxCall) levels.push({ strike: maxCall.strike, oi: maxCall.oi, type: 'resistance', source, expStr, expirationLabel: expLabel });
  if (maxPut) levels.push({ strike: maxPut.strike, oi: maxPut.oi, type: 'support', source, expStr, expirationLabel: expLabel });
  if (callsAndPuts.length > 0) {
    const painStrike = calculateMaxPain(callsAndPuts);
    if (painStrike !== null) levels.push({ strike: painStrike, oi: 0, type: 'maxpain', source, expStr, expirationLabel: expLabel });
  }
  return levels;
}

// ==========================================
// US EQUITIES ENGINE (Yahoo Finance)
// ==========================================
async function getUSOptionsLevels(ticker) {
  try {
    const initial = await yahooFinance.options(ticker);
    if (!initial || !initial.expirationDates || initial.expirationDates.length === 0) return [];
    const dates = initial.expirationDates;
    const nearestDates = dates.slice(0, 2);
    const levels = [];
    for (let i = 0; i < nearestDates.length; i++) {
      const d = nearestDates[i];
      const opt = await yahooFinance.options(ticker, { date: d });
      if (!opt || !opt.options || opt.options.length === 0) continue;
      const chain = opt.options[0];
      const expLabel = i === 0 ? 'Daily' : 'Weekly/Monthly';
      const expStr = new Date(d).toISOString().split('T')[0];
      const callsAndPuts = [];
      (chain.calls || []).forEach(c => {
        if (c.openInterest > 0) callsAndPuts.push({ strike: c.strike, type: 'C', oi: c.openInterest });
      });
      (chain.puts || []).forEach(p => {
        if (p.openInterest > 0) callsAndPuts.push({ strike: p.strike, type: 'P', oi: p.openInterest });
      });
      levels.push(...buildLevels(callsAndPuts, 'Yahoo', expStr, expLabel));
    }
    return levels;
  } catch (err) {
    console.error('US Options Error:', err.message);
    return [];
  }
}

// ==========================================
// INDIAN EQUITIES — Shared Helpers
// ==========================================

// Expiry labeling: NIFTY/BANKNIFTY/SENSEX have weekly, all others monthly
function getExpLabel(rawTicker) {
  const u = rawTicker.toUpperCase();
  if (u.includes('NIFTY') || u === '^NSEI' || u === '^BSESN' || u === 'SENSEX') return 'Weekly';
  return 'Monthly';
}

// Parse date strings like "25JUL2024" or "2024-07-25" into YYYY-MM-DD
function normalizeDateStr(dateStr) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const m = dateStr.match(/^(\d{2})([A-Z]{3})(\d{4})$/i);
  if (m) {
    const months = { JAN:'01',FEB:'02',MAR:'03',APR:'04',MAY:'05',JUN:'06',JUL:'07',AUG:'08',SEP:'09',OCT:'10',NOV:'11',DEC:'12' };
    return `${m[3]}-${months[m[2].toUpperCase()]}-${m[1]}`;
  }
  return dateStr;
}

// ==========================================
// BROKER: Fyers
// ==========================================
async function getFyersOptions(rawTicker) {
  const ticker = rawTicker.toUpperCase();
  let symbol;
  if (ticker === '^NSEI' || ticker === 'NIFTY' || ticker === 'NIFTY50') symbol = 'NSE:NIFTY50-INDEX';
  else if (ticker === '^BSESN' || ticker === 'SENSEX') symbol = 'BSE:SENSEX-INDEX';
  else if (ticker === '^NSEBANK' || ticker === 'BANKNIFTY') symbol = 'NSE:NIFTYBANK-INDEX';
  else if (ticker === 'MIDCPNIFTY') symbol = 'NSE:MIDCPNIFTY-INDEX';
  else if (ticker === 'FINNIFTY') symbol = 'NSE:FINNIFTY-INDEX';
  else {
    let cleanTicker = ticker;
    if (cleanTicker.endsWith('.NS')) cleanTicker = cleanTicker.replace('.NS', '');
    else if (cleanTicker.endsWith('.BO')) cleanTicker = cleanTicker.replace('.BO', '');
    symbol = `NSE:${cleanTicker}-EQ`;
  }
  try {
    const { fyersModel } = require('fyers-api-v3');
    const fyers = new fyersModel();
    fyers.setAppId(process.env.FYERS_APP_ID);
    fyers.setAccessToken(process.env.FYERS_ACCESS_TOKEN);

    const res = await fyers.getOptionChain({ symbol, strikecount: 50 });

    if (res && res.data && res.data.optionsChain) {
      const chain = res.data.optionsChain;
      const expiriesList = res.data.expiryData;
      let nearestExp = '';
      if (expiriesList && expiriesList.length > 0) {
         nearestExp = expiriesList[0].date;
      }
      
      const callsAndPuts = [];
      chain.forEach(opt => {
        if (!opt.option_type || !opt.strike_price) return;
        const type = opt.option_type === 'CE' ? 'C' : opt.option_type === 'PE' ? 'P' : null;
        if (type && opt.oi > 0) {
          callsAndPuts.push({ strike: opt.strike_price, type, oi: opt.oi });
        }
      });
      
      const expLabel = getExpLabel(ticker);
      const levels = buildLevels(callsAndPuts, 'Fyers', nearestExp, expLabel);
      return levels.length > 0 ? levels : null;
    } else if (res && res.message) {
      console.error('[Fyers OptionChain Error]', res.message);
    }
  } catch (err) {
    console.error('Fyers Option Chain Error:', err.message);
  }
  return null;
}

// ==========================================
// BROKER: Upstox
// ==========================================
async function getUpstoxOptions(rawTicker) {
  const ticker = rawTicker.toUpperCase();
  let instrumentKey;
  if (ticker === '^NSEI' || ticker === 'NIFTY' || ticker === 'NIFTY50') instrumentKey = 'NSE_INDEX|Nifty 50';
  else if (ticker === '^BSESN' || ticker === 'SENSEX') instrumentKey = 'BSE_INDEX|SENSEX';
  else if (ticker === '^NSEBANK' || ticker === 'BANKNIFTY') instrumentKey = 'NSE_INDEX|Nifty Bank';
  else if (ticker === 'MIDCPNIFTY') instrumentKey = 'NSE_INDEX|Nifty Mid Select';
  else if (ticker === 'FINNIFTY') instrumentKey = 'NSE_INDEX|Nifty Fin Service';
  else instrumentKey = `NSE_EQ|${ticker}`;

  try {
    const res = await axios.get(`https://api.upstox.com/v2/option/chain?instrument_key=${encodeURIComponent(instrumentKey)}`, {
      headers: { 'Authorization': `Bearer ${process.env.UPSTOX_ACCESS_TOKEN}`, 'Accept': 'application/json' }
    });
    if (res.data && res.data.data) {
      // Upstox returns all expiries — group by expiry, use the nearest
      const expiries = {};
      res.data.data.forEach(opt => {
        const exp = opt.expiry;
        if (!expiries[exp]) expiries[exp] = [];
        expiries[exp].push(opt);
      });
      const sorted = Object.keys(expiries).sort();
      if (sorted.length === 0) return null;
      const nearestExp = sorted[0];
      const chain = expiries[nearestExp];
      const expLabel = getExpLabel(rawTicker);
      const callsAndPuts = [];
      chain.forEach(opt => {
        if (opt.call_options && opt.call_options.market_data && opt.call_options.market_data.oi > 0)
          callsAndPuts.push({ strike: opt.strike_price, type: 'C', oi: opt.call_options.market_data.oi });
        if (opt.put_options && opt.put_options.market_data && opt.put_options.market_data.oi > 0)
          callsAndPuts.push({ strike: opt.strike_price, type: 'P', oi: opt.put_options.market_data.oi });
      });
      const levels = buildLevels(callsAndPuts, 'Upstox', nearestExp, expLabel);
      return levels.length > 0 ? levels : null;
    }
  } catch (err) {
    console.error('Upstox Option Chain Error:', err.message);
  }
  return null;
}

// ==========================================
// BROKER: DhanHQ
// ==========================================

// Security IDs for major Indian indices (from DhanHQ instrument list)
const DHAN_SCRIP_IDS = {
  'NIFTY': 13, '^NSEI': 13, 'NIFTY50': 13,
  'BANKNIFTY': 25, '^NSEBANK': 25,
  'SENSEX': 51, '^BSESN': 51,
  'MIDCPNIFTY': 39,
  'FINNIFTY': 27,
  'NIFTYIT': 47,
  'NIFTYMIDCAP': 42,
  'NIFTYSMLCAP': 45,
};

const DHAN_SEGMENT = {
  'NIFTY': 'IDX_I', '^NSEI': 'IDX_I', 'NIFTY50': 'IDX_I',
  'BANKNIFTY': 'IDX_I', '^NSEBANK': 'IDX_I',
  'SENSEX': 'IDX_I', '^BSESN': 'IDX_I',
  'MIDCPNIFTY': 'IDX_I', 'FINNIFTY': 'IDX_I',
  'NIFTYIT': 'IDX_I', 'NIFTYMIDCAP': 'IDX_I', 'NIFTYSMLCAP': 'IDX_I',
};

async function getDhanOptions(rawTicker) {
  const ticker = rawTicker.toUpperCase();
  const scripId = DHAN_SCRIP_IDS[ticker];
  const seg = DHAN_SEGMENT[ticker] || 'NSE_FNO';

  if (!scripId) {
    console.warn(`[Dhan] No security ID mapping for ${ticker}, skipping.`);
    return null;
  }

  try {
    // 1. Get expiry list
    const expRes = await axios.post('https://api.dhan.co/v2/optionchain/expirylist', {
      UnderlyingScrip: scripId,
      UnderlyingSeg: seg,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'access-token': process.env.DHAN_ACCESS_TOKEN,
        'client-id': process.env.DHAN_CLIENT_ID,
      }
    });

    let expiries = [];
    if (expRes.data && expRes.data.data) {
      expiries = Array.isArray(expRes.data.data) ? expRes.data.data : [];
    }
    if (expiries.length === 0) return null;

    // Sort and use nearest expiry
    const sorted = expiries.sort();
    const nearestExp = sorted[0];

    // 2. Fetch option chain for nearest expiry
    const chainRes = await axios.post('https://api.dhan.co/v2/optionchain', {
      UnderlyingScrip: scripId,
      UnderlyingSeg: seg,
      Expiry: nearestExp,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'access-token': process.env.DHAN_ACCESS_TOKEN,
        'client-id': process.env.DHAN_CLIENT_ID,
      }
    });

    if (chainRes.data && chainRes.data.data && chainRes.data.data.oc) {
      const oc = chainRes.data.data.oc;
      const expLabel = getExpLabel(rawTicker);
      const callsAndPuts = [];
      Object.entries(oc).forEach(([strikeStr, optData]) => {
        const strike = parseFloat(strikeStr);
        if (optData.ce && optData.ce.oi > 0)
          callsAndPuts.push({ strike, type: 'C', oi: optData.ce.oi });
        if (optData.pe && optData.pe.oi > 0)
          callsAndPuts.push({ strike, type: 'P', oi: optData.pe.oi });
      });
      const levels = buildLevels(callsAndPuts, 'Dhan', nearestExp, expLabel);
      return levels.length > 0 ? levels : null;
    }
  } catch (err) {
    console.error('Dhan Option Chain Error:', err.message);
  }
  return null;
}

// ==========================================
// BROKER: Angel One (SmartAPI)
// ==========================================

// Angel One NFO symbol tokens for major underlyings (from Scrip Master)
// These tokens are for the underlying itself (used as parent for option chain lookup)
async function getAngelSymbolToken(ticker) {
  try {
    // Fetch scrip master from Angel One's public Scrip Master JSON
    const res = await axios.get('https://margincalculator.angelbroking.com/OpenAPI_ScripMaster.json', { timeout: 10000 });
    if (res.data) {
      const data = Array.isArray(res.data) ? res.data : [];
      // Search for the underlying in NFO segment
      const uTicker = ticker.toUpperCase();
      const match = data.find(item =>
        item.exch_seg === 'NFO' &&
        (item.symbol === uTicker ||
         item.name === uTicker ||
         item.tradingsymbol === uTicker)
      );
      if (match) return match.token;
      // If not found in NFO, try BFO for SENSEX
      if (uTicker === 'SENSEX' || uTicker === '^BSESN') {
        const bse = data.find(item =>
          item.exch_seg === 'BFO' &&
          (item.symbol === 'SENSEX' || item.name === 'SENSEX')
        );
        if (bse) return bse.token;
      }
    }
  } catch (err) {
    console.warn(`[Angel] Scrip master fetch error:`, err.message);
  }
  return null;
}

async function getAngelOptions(rawTicker) {
  const ticker = rawTicker.toUpperCase();
  const apiKey = process.env.ANGEL_API_KEY || 'replace_with_smartapi_key';
  const clientCode = process.env.ANGEL_CLIENT_CODE;
  const authToken = process.env.ANGEL_JWT_TOKEN;
  const feedToken = process.env.ANGEL_FEED_TOKEN;

  if (!clientCode || !authToken || !feedToken) return null;

  try {
    // Get symbol token dynamically from scrip master
    let token = await getAngelSymbolToken(ticker);
    if (!token) {
      console.warn(`[Angel] Could not find symbol token for ${ticker}, skipping.`);
      return null;
    }

    // Get expiry dates
    const expRes = await axios.post('https://apiconnect.angelone.in/rest/secure/angelbroking/marketData/v1/getOptionExpiryDate', {
      exchange: 'NFO',
      symboltoken: token,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-PrivateKey': apiKey,
        'X-ClientCode': clientCode,
        'X-AuthToken': authToken,
        'X-FeedToken': feedToken,
        'X-UserType': 'USER',
        'X-SourceID': 'WEB',
      }
    });

    let expiryDates = [];
    if (expRes.data && expRes.data.data) {
      expiryDates = Array.isArray(expRes.data.data)
        ? expRes.data.data.map(e => e.expiryDate || e)
        : [];
    }

    // If expiry API fails, try common date patterns
    if (expiryDates.length === 0) return null;

    // Sort and use nearest expiry
    const sorted = expiryDates.sort();
    const nearestExp = sorted[0];
    const expLabel = getExpLabel(rawTicker);

    // Fetch option chain for nearest expiry
    const chainRes = await axios.post('https://apiconnect.angelone.in/rest/secure/angelbroking/marketData/v1/getOptionChain', {
      exchange: 'NFO',
      symboltoken: token,
      expirydate: nearestExp,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-PrivateKey': apiKey,
        'X-ClientCode': clientCode,
        'X-AuthToken': authToken,
        'X-FeedToken': feedToken,
        'X-UserType': 'USER',
        'X-SourceID': 'WEB',
      }
    });

    if (chainRes.data && chainRes.data.data) {
      const chain = Array.isArray(chainRes.data.data) ? chainRes.data.data : [];
      const callsAndPuts = [];
      chain.forEach(opt => {
        const strike = parseFloat(opt.strikePrice || opt.strikeprice || 0);
        if (opt.callOi && opt.callOi > 0)
          callsAndPuts.push({ strike, type: 'C', oi: opt.callOi });
        else if (opt.CE && opt.CE.openInterest > 0)
          callsAndPuts.push({ strike, type: 'C', oi: opt.CE.openInterest });
        if (opt.putOi && opt.putOi > 0)
          callsAndPuts.push({ strike, type: 'P', oi: opt.putOi });
        else if (opt.PE && opt.PE.openInterest > 0)
          callsAndPuts.push({ strike, type: 'P', oi: opt.PE.openInterest });
      });
      const levels = buildLevels(callsAndPuts, 'Angel One', nearestExp, expLabel);
      return levels.length > 0 ? levels : null;
    }
  } catch (err) {
    console.error('Angel One Option Chain Error:', err.message);
  }
  return null;
}

// ==========================================
// BROKER: Zerodha Kite
// ==========================================
async function getKiteOptions(rawTicker) {
  const ticker = rawTicker.toUpperCase();
  const apiKey = process.env.KITE_API_KEY;
  const accessToken = process.env.KITE_ACCESS_TOKEN;
  if (!apiKey || !accessToken) return null;

  try {
    // 1. Fetch NFO instruments CSV
    const instRes = await axios.get('https://api.kite.trade/instruments/NFO', {
      headers: { 'Authorization': `token ${apiKey}:${accessToken}`, 'X-Kite-Version': '3' },
      timeout: 15000,
      responseType: 'text',
    });

    // Parse CSV to find underlying's options contracts
    const lines = instRes.data.split('\n');
    if (lines.length < 2) return null;

    // Headers: instrument_token, exchange_token, tradingsymbol, name, last_price, expiry, strike, tick_size, lot_size, instrument_type, segment, exchange
    const headers = lines[0].split(',').map(h => h.trim());

    // Build tradingsymbol prefix for NFO options
    // Format: NIFTY{DD}{MON}{YY}{STRIKE}{CE/PE}
    // We need to find all CE/PE instruments for the underlying

    const now = new Date();
    const options = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      if (cols.length < 12) continue;
      const tradingSymbol = cols[2].trim();
      const instrumentType = cols[8].trim();
      const expiry = cols[5].trim();
      const strike = parseFloat(cols[6].trim());
      const instrumentToken = cols[0].trim();
      const lotSize = parseInt(cols[7].trim(), 10);

      // Match options contracts for this underlying
      // The tradingsymbol starts with the ticker name (e.g., NIFTY, BANKNIFTY, RELIANCE)
      if ((instrumentType === 'CE' || instrumentType === 'PE') && expiry && strike > 0) {
        // Check if it's for our ticker
        let matches = false;
        if (ticker === '^NSEI' || ticker === 'NIFTY' || ticker === 'NIFTY50') {
          matches = tradingSymbol.startsWith('NIFTY') && !tradingSymbol.startsWith('NIFTYIT')
            && !tradingSymbol.startsWith('NIFTYMID') && !tradingSymbol.startsWith('NIFTYSML')
            && !tradingSymbol.startsWith('NIFTYFIN') && !tradingSymbol.startsWith('NIFTYMNC')
            && !tradingSymbol.startsWith('NIFTYNXT');
        } else if (ticker === '^NSEBANK' || ticker === 'BANKNIFTY') {
          matches = tradingSymbol.startsWith('BANKNIFTY');
        } else if (ticker === '^BSESN' || ticker === 'SENSEX') {
          matches = tradingSymbol.startsWith('SENSEX');
        } else {
          matches = tradingSymbol.startsWith(ticker);
        }

        if (matches) {
          options.push({ instrumentToken, tradingSymbol, instrumentType, expiry, strike, lotSize });
        }
      }
    }

    if (options.length === 0) return null;

    // Group by expiry, find nearest
    const expiryGroups = {};
    options.forEach(o => {
      if (!expiryGroups[o.expiry]) expiryGroups[o.expiry] = [];
      expiryGroups[o.expiry].push(o);
    });
    const sortedExpiries = Object.keys(expiryGroups).sort();
    const nearestExp = sortedExpiries[0];

    if (!nearestExp) return null;
    const expLabel = getExpLabel(rawTicker);
    const nearestOptions = expiryGroups[nearestExp];

    // 2. Fetch OI via quote API (up to 250 instruments per call)
    // Build chunks of 250 instrument tokens
    const chunks = [];
    for (let i = 0; i < nearestOptions.length; i += 250) {
      chunks.push(nearestOptions.slice(i, i + 250));
    }

    const callsAndPuts = [];

    for (const chunk of chunks) {
      const symbols = chunk.map(o => `NFO:${o.tradingSymbol}`);
      const params = new URLSearchParams();
      symbols.forEach(s => params.append('i', s));

      const quoteRes = await axios.get('https://api.kite.trade/quote', {
        params,
        headers: { 'Authorization': `token ${apiKey}:${accessToken}`, 'X-Kite-Version': '3' },
        timeout: 10000,
      });

      if (quoteRes.data) {
        chunk.forEach(o => {
          const key = `NFO:${o.tradingSymbol}`;
          const quote = quoteRes.data[key];
          if (quote && quote.oi > 0) {
            callsAndPuts.push({
              strike: o.strike,
              type: o.instrumentType === 'CE' ? 'C' : 'P',
              oi: quote.oi,
            });
          }
        });
      }
    }

    const levels = buildLevels(callsAndPuts, 'Zerodha Kite', nearestExp, expLabel);
    return levels.length > 0 ? levels : null;

  } catch (err) {
    console.error('Kite Option Chain Error:', err.message);
  }
  return null;
}

// ==========================================
// WATERFALL ROUTER — Indian Brokers
// ==========================================
async function getIndianOptionsLevels(ticker) {
  const rawTicker = ticker.replace('.NS', '').replace('.BO', '');

  // Priority: Fyers > Upstox > Dhan > Angel One > Kite
  if (process.env.FYERS_APP_ID && process.env.FYERS_ACCESS_TOKEN) {
    console.log('[OptionsEngine] Routing to FYERS API...');
    const levels = await getFyersOptions(rawTicker);
    if (levels) return levels;
  }
  if (process.env.UPSTOX_ACCESS_TOKEN) {
    console.log('[OptionsEngine] Routing to UPSTOX API...');
    const levels = await getUpstoxOptions(rawTicker);
    if (levels) return levels;
  }
  if (process.env.DHAN_ACCESS_TOKEN && process.env.DHAN_CLIENT_ID) {
    console.log('[OptionsEngine] Routing to DHAN API...');
    const levels = await getDhanOptions(rawTicker);
    if (levels) return levels;
  }
  if (process.env.ANGEL_CLIENT_CODE && process.env.ANGEL_JWT_TOKEN && process.env.ANGEL_FEED_TOKEN) {
    console.log('[OptionsEngine] Routing to ANGEL ONE API...');
    const levels = await getAngelOptions(rawTicker);
    if (levels) return levels;
  }
  if (process.env.KITE_API_KEY && process.env.KITE_ACCESS_TOKEN) {
    console.log('[OptionsEngine] Routing to ZERODHA KITE API...');
    const levels = await getKiteOptions(rawTicker);
    if (levels) return levels;
  }

  console.warn('[OptionsEngine] No Indian broker API configured/working for Option Chain.');
  return [];
}

// ==========================================
// TOP-LEVEL ROUTER
// ==========================================
async function getOptionsLevels(ticker) {
  if (ticker.endsWith('.NS') || ticker.endsWith('.BO') || ticker === '^NSEI' || ticker === '^NSEBANK') {
    return await getIndianOptionsLevels(ticker);
  }
  console.log('[OptionsEngine] Routing to Yahoo Finance API...');
  return await getUSOptionsLevels(ticker);
}

module.exports = { getOptionsLevels };
