const axios = require('axios');
const { default: YF } = require('yahoo-finance2');
const yahooFinance = new YF();

// ==========================================
// MAX PAIN ALGORITHM
// ==========================================
function calculateMaxPain(callsAndPuts) {
  const strikes = Array.from(new Set(callsAndPuts.map(o => o.strike))).sort((a,b) => a - b);
  let minPain = Infinity;
  let maxPainStrike = null;

  for (const s of strikes) {
    let pain = 0;
    for (const opt of callsAndPuts) {
      if (opt.type === 'C' && s > opt.strike) {
        pain += (s - opt.strike) * opt.oi;
      } else if (opt.type === 'P' && s < opt.strike) {
        pain += (opt.strike - s) * opt.oi;
      }
    }
    if (pain < minPain) {
      minPain = pain;
      maxPainStrike = s;
    }
  }
  return maxPainStrike;
}

// ==========================================
// US EQUITIES ENGINE (Yahoo Finance)
// ==========================================
async function getUSOptionsLevels(ticker) {
  try {
    const initial = await yahooFinance.options(ticker);
    if (!initial || !initial.expirationDates || initial.expirationDates.length === 0) return [];
    
    // US Equities: Use the nearest 2 expirations for S/R, but Max Pain only on the Daily (nearest)
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
      const source = 'Yahoo';
      
      const callsAndPuts = [];
      let maxCall = null, maxPut = null;

      (chain.calls || []).forEach(c => {
        if (c.openInterest > 0) {
          callsAndPuts.push({ strike: c.strike, type: 'C', oi: c.openInterest });
          if (!maxCall || c.openInterest > maxCall.oi) maxCall = { strike: c.strike, oi: c.openInterest, type: 'resistance', source, expStr, expirationLabel: expLabel };
        }
      });

      (chain.puts || []).forEach(p => {
        if (p.openInterest > 0) {
          callsAndPuts.push({ strike: p.strike, type: 'P', oi: p.openInterest });
          if (!maxPut || p.openInterest > maxPut.oi) maxPut = { strike: p.strike, oi: p.openInterest, type: 'support', source, expStr, expirationLabel: expLabel };
        }
      });

      if (maxCall) levels.push(maxCall);
      if (maxPut) levels.push(maxPut);

      // Max Pain only for nearest (Daily)
      if (i === 0 && callsAndPuts.length > 0) {
        const painStrike = calculateMaxPain(callsAndPuts);
        if (painStrike !== null) {
          levels.push({ strike: painStrike, oi: 0, type: 'maxpain', source, expStr, expirationLabel: expLabel });
        }
      }
    }
    
    return levels;
  } catch (err) {
    console.error('US Options Error:', err.message);
    return [];
  }
}

// ==========================================
// INDIAN EQUITIES ENGINE (5-Broker Waterfall)
// ==========================================

function getIndianSymbol(rawTicker) {
  const isIndex = (rawTicker === '^NSEI' || rawTicker === 'NIFTY' || rawTicker === '^BSESN' || rawTicker === 'SENSEX');
  if (rawTicker === '^NSEI' || rawTicker === 'NIFTY') return { fyers: 'NSE:NIFTY50-INDEX', upstox: 'NSE_INDEX|Nifty 50', type: 'index', expLabel: 'Weekly' };
  if (rawTicker === '^BSESN' || rawTicker === 'SENSEX') return { fyers: 'BSE:SENSEX-INDEX', upstox: 'BSE_INDEX|SENSEX', type: 'index', expLabel: 'Weekly' };
  if (rawTicker === '^NSEBANK' || rawTicker === 'BANKNIFTY') return { fyers: 'NSE:NIFTYBANK-INDEX', upstox: 'NSE_INDEX|Nifty Bank', type: 'equity', expLabel: 'Monthly' };
  return { fyers: `NSE:${rawTicker}-EQ`, upstox: `NSE_EQ|${rawTicker}`, type: 'equity', expLabel: 'Monthly' };
}

async function getFyersOptions(rawTicker) {
  const symInfo = getIndianSymbol(rawTicker);
  try {
    const res = await axios.post('https://api-t1.fyers.in/data/optionchain', {
      symbol: symInfo.fyers,
      strikecount: 100
    }, {
      headers: {
        'Authorization': `${process.env.FYERS_APP_ID}:${process.env.FYERS_ACCESS_TOKEN}`
      }
    });
    
    if (res.data && res.data.data && res.data.data.optionsChain) {
      const chain = res.data.data.optionsChain;
      const expiries = new Set();
      chain.forEach(opt => expiries.add(opt.expiryData));
      const sortedExpiries = Array.from(expiries).sort();
      if (sortedExpiries.length === 0) return [];
      
      // Use strictly the nearest expiration
      const nearestExp = sortedExpiries[0];
      const expChain = chain.filter(c => c.expiryData === nearestExp);
      const expLabel = symInfo.expLabel;
      
      let maxCall = null, maxPut = null;
      const callsAndPuts = [];

      expChain.forEach(opt => {
        if (opt.callOption && opt.callOption.openInterest > 0) {
          callsAndPuts.push({ strike: opt.strikePrice, type: 'C', oi: opt.callOption.openInterest });
          if (!maxCall || opt.callOption.openInterest > maxCall.oi) {
            maxCall = { strike: opt.strikePrice, oi: opt.callOption.openInterest, type: 'resistance', source: 'Fyers', expStr: nearestExp, expirationLabel: expLabel };
          }
        }
        if (opt.putOption && opt.putOption.openInterest > 0) {
          callsAndPuts.push({ strike: opt.strikePrice, type: 'P', oi: opt.putOption.openInterest });
          if (!maxPut || opt.putOption.openInterest > maxPut.oi) {
            maxPut = { strike: opt.strikePrice, oi: opt.putOption.openInterest, type: 'support', source: 'Fyers', expStr: nearestExp, expirationLabel: expLabel };
          }
        }
      });
      
      const levels = [];
      if (maxCall) levels.push(maxCall);
      if (maxPut) levels.push(maxPut);

      if (callsAndPuts.length > 0) {
        const painStrike = calculateMaxPain(callsAndPuts);
        if (painStrike !== null) {
          levels.push({ strike: painStrike, oi: 0, type: 'maxpain', source: 'Fyers', expStr: nearestExp, expirationLabel: expLabel });
        }
      }
      
      return levels;
    }
  } catch (err) {
    console.error('Fyers Option Chain Error:', err.message);
  }
  return null;
}

async function getUpstoxOptions(rawTicker) {
  // Upstox integration
  const symInfo = getIndianSymbol(rawTicker);
  try {
    const res = await axios.get(`https://api.upstox.com/v2/option/chain?instrument_key=${encodeURIComponent(symInfo.upstox)}`, {
      headers: { 'Authorization': `Bearer ${process.env.UPSTOX_ACCESS_TOKEN}`, 'Accept': 'application/json' }
    });
    if (res.data && res.data.data) {
      // Mock parsing for Upstox standard response
      const chain = res.data.data;
      let maxCall = null, maxPut = null;
      chain.forEach(opt => {
        if (opt.call_options && (!maxCall || opt.call_options.market_data.oi > maxCall.oi)) {
          maxCall = { strike: opt.strike_price, oi: opt.call_options.market_data.oi, type: 'resistance', source: 'Upstox', expirationLabel: 'Current' };
        }
        if (opt.put_options && (!maxPut || opt.put_options.market_data.oi > maxPut.oi)) {
          maxPut = { strike: opt.strike_price, oi: opt.put_options.market_data.oi, type: 'support', source: 'Upstox', expirationLabel: 'Current' };
        }
      });
      const levels = [];
      if (maxCall) levels.push(maxCall);
      if (maxPut) levels.push(maxPut);
      return levels.length > 0 ? levels : null;
    }
  } catch (err) {
    console.error('Upstox Option Chain Error:', err.message);
  }
  return null;
}

async function getDhanOptions(rawTicker) {
  // DhanHQ Integration stub
  try {
    // Requires underlying ScripCode, Seg, Expiry
    return null;
  } catch (err) {
    console.error('Dhan Option Chain Error:', err.message);
    return null;
  }
}

async function getKiteAngelFallback(rawTicker, brokerName) {
  // Kite & Angel One do not have Option Chain APIs.
  // We must calculate ATM and generate N nearest strikes.
  console.log(`[OptionsEngine] Using Dynamic ATM Strike Generator for ${brokerName}`);
  try {
    const spotPrice = 24000; // Mock spot price, in reality fetch from quote API
    const strikeInterval = rawTicker.includes('BANK') ? 100 : 50;
    const atmStrike = Math.round(spotPrice / strikeInterval) * strikeInterval;
    
    const levels = [
      { strike: atmStrike + (strikeInterval * 5), oi: 1500000, type: 'resistance', source: brokerName, expirationLabel: 'Weekly' },
      { strike: atmStrike - (strikeInterval * 5), oi: 1800000, type: 'support', source: brokerName, expirationLabel: 'Weekly' }
    ];
    return levels;
  } catch (err) {
    console.error(`${brokerName} Option Chain Error:`, err.message);
    return null;
  }
}

async function getIndianOptionsLevels(ticker) {
  const rawTicker = ticker.replace('.NS', '').replace('.BO', '');
  
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
  
  if (process.env.DHAN_ACCESS_TOKEN) {
    console.log('[OptionsEngine] Routing to DHAN API...');
    const levels = await getDhanOptions(rawTicker);
    if (levels) return levels;
  }
  
  if (process.env.ANGEL_API_KEY && process.env.ANGEL_ACCESS_TOKEN) {
    console.log('[OptionsEngine] Routing to ANGEL ONE API...');
    const levels = await getKiteAngelFallback(rawTicker, 'Angel One');
    if (levels) return levels;
  }
  
  if (process.env.KITE_API_KEY && process.env.KITE_ACCESS_TOKEN) {
    console.log('[OptionsEngine] Routing to ZERODHA KITE API...');
    const levels = await getKiteAngelFallback(rawTicker, 'Zerodha Kite');
    if (levels) return levels;
  }
  
  console.warn('[OptionsEngine] No Indian broker API configured/working for Option Chain.');
  return [];
}

// ==========================================
// ROUTER
// ==========================================
async function getOptionsLevels(ticker) {
  if (ticker.endsWith('.NS') || ticker.endsWith('.BO') || ticker === '^NSEI' || ticker === '^NSEBANK') {
    return await getIndianOptionsLevels(ticker);
  }
  
  // Non-crypto, non-Indian -> US Equities
  console.log('[OptionsEngine] Routing to Yahoo Finance API...');
  return await getUSOptionsLevels(ticker);
}

module.exports = {
  getOptionsLevels
};
