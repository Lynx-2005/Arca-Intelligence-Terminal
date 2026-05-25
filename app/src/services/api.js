import { apiCache } from './cache';

const isCryptoTicker = (ticker) => {
  const symbol = (ticker || '').trim().toUpperCase();
  if (!symbol) return false;
  if (symbol.includes('-')) {
    const parts = symbol.split('-');
    if (parts.length !== 2) return false;
    const quote = parts[1];
    return ['USD', 'USDT', 'USDC', 'BUSD', 'EUR', 'BTC', 'ETH'].includes(quote);
  }
  if (symbol.endsWith('USDT') || symbol.endsWith('USDC')) return true;
  if (symbol.endsWith('USD') && symbol.length > 3) return true;
  return false;
};

const mapBinanceInterval = (interval) => (interval === '1wk' ? '1w' : interval);

// Help map yahoo finance currency tickers to clean symbols
const currencyMap = {
  'EURUSD=X': 'EUR/USD',
  'GBPUSD=X': 'GBP/USD',
  'USDJPY=X': 'USD/JPY',
  'USDINR=X': 'USD/INR',
  'USDCNY=X': 'USD/CNY',
  'AUDUSD=X': 'AUD/USD'
};

// Help map index tickers to common names
const indexMap = {
  '^GSPC': 'S&P 500',
  '^IXIC': 'NASDAQ',
  '^DJI': 'DOW JONES',
  '^FTSE': 'FTSE 100',
  '^N225': 'NIKKEI 225',
  '^NSEI': 'NIFTY 50',
  '000001.SS': 'SHANGHAI COMP'
};

// Help map commodity tickers to common names
const commodityMap = {
  'GC=F': 'GOLD',
  'SI=F': 'SILVER',
  'CL=F': 'BRENT CRUDE', // Crude WTI/Brent
  'NG=F': 'NATURAL GAS',
  'HG=F': 'COPPER',
  'ZC=F': 'CORN'
};

export const ApiService = {
  
  /**
   * Fetch real-time quote for a stock
   */
  async getStockQuote(ticker) {
    const cacheKey = `quote_${ticker}`;
    const cached = apiCache.get(cacheKey);
    if (cached) return cached;

    try {
      const res = await fetch(`http://localhost:3001/api/quote/${ticker}`);
      if (!res.ok) throw new Error("Proxy error");
      const q = await res.json();
      
      if (!q || !q.symbol) throw new Error("No data");
      
      const result = {
        ticker: q.symbol,
        price: q.regularMarketPrice,
        change: q.regularMarketChange,
        changePct: `${q.regularMarketChangePercent?.toFixed(2) || 0}%`,
        volume: q.regularMarketVolume,
        avgVolume: q.averageDailyVolume3Month || q.averageVolume || 0,
        high: q.regularMarketDayHigh,
        low: q.regularMarketDayLow,
        fiftyTwoWeekHigh: q.fiftyTwoWeekHigh || q.regularMarketDayHigh,
        fiftyTwoWeekLow: q.fiftyTwoWeekLow || q.regularMarketDayLow,
        marketCap: q.marketCap,
        pe: q.trailingPE || q.forwardPE,
        eps: q.epsTrailingTwelveMonths,
        name: q.shortName || q.longName || q.symbol,
      };
      
      apiCache.set(cacheKey, result, 1); // 1 min TTL
      return result;
    } catch (e) {
      console.warn(`Quote fetch failed for ${ticker}`, e);
      return null;
    }
  },

  /**
   * Fetch real-time quotes for multiple stocks in a single request
   */
  async getBulkQuotes(tickers) {
    if (!tickers || tickers.length === 0) return [];
    
    try {
      const res = await fetch(`http://localhost:3001/api/quotes?symbols=${encodeURIComponent(tickers.join(','))}`);
      if (!res.ok) throw new Error("Bulk proxy error");
      const list = await res.json();
      
      return list.map(q => {
        if (!q || !q.symbol) return null;
        return {
          ticker: q.symbol,
          price: q.regularMarketPrice,
          change: q.regularMarketChange,
          changePct: `${q.regularMarketChangePercent >= 0 ? '+' : ''}${q.regularMarketChangePercent?.toFixed(2) || '0.00'}%`,
          volume: q.regularMarketVolume || 0,
          avgVolume: q.averageDailyVolume3Month || q.averageVolume || 0,
          high: q.regularMarketDayHigh,
          low: q.regularMarketDayLow,
          name: q.shortName || q.longName || q.symbol,
        };
      }).filter(Boolean);
    } catch (e) {
      console.warn("Falling back to single quote loop due to bulk failure:", e);
      return Promise.all(tickers.map(ticker => this.getStockQuote(ticker).catch(() => null))).then(res => res.filter(Boolean));
    }
  },

  /**
   * Fetch historical daily or intraday candles
   */
  async getHistoricalData(ticker, interval = '1d') {
    const cacheKey = `history_${ticker}_${interval}`;
    const cached = apiCache.get(cacheKey);
    if (cached) return cached;

    try {
       const targetInterval = mapBinanceInterval(interval);
       const res = isCryptoTicker(ticker)
         ? await fetch(`http://localhost:3001/api/crypto/history/${ticker}?interval=${encodeURIComponent(targetInterval)}`)
         : await fetch(`http://localhost:3001/api/history/${ticker}?interval=${encodeURIComponent(interval)}`);
       if (!res.ok) throw new Error("Proxy error");
       const data = await res.json();
       
       if (!data || !Array.isArray(data) || data.length === 0) {
         throw new Error("No data");
       }
       
       const isFiniteNumber = value => typeof value === 'number' && Number.isFinite(value);
       const formatted = data
         .filter(day =>
           day &&
           day.date &&
           isFiniteNumber(day.close) &&
           isFiniteNumber(day.open) &&
           isFiniteNumber(day.high) &&
           isFiniteNumber(day.low)
         )
         .map(day => ({
           time: Math.floor(new Date(day.date).getTime() / 1000),
           open: day.open,
           high: day.high,
           low: day.low,
           close: day.close,
           volume: isFiniteNumber(day.volume) ? day.volume : 0
         }))
         .filter(day => isFiniteNumber(day.time))
         .sort((a, b) => a.time - b.time); // ensure strictly ascending order

       // Crypto history already arrives in normalized format.
       const normalized = isCryptoTicker(ticker)
         ? data
         : formatted;

       apiCache.set(cacheKey, normalized, 5); // 5 min TTL
       return normalized;
    } catch (e) {
       console.warn(`History fetch failed for ${ticker} [${interval}]`, e);
       throw e;
    }
  },

  /**
   * Fetch comprehensive Company Intelligence
   */
  async getCompanyIntel(ticker, model) {
    const cacheKey = `intel_${ticker}_${model || ''}`;
    const cached = apiCache.get(cacheKey);
    if (cached) return cached;

    try {
      const url = model 
        ? `http://localhost:3001/api/company-intel/${ticker}?model=${encodeURIComponent(model)}`
        : `http://localhost:3001/api/company-intel/${ticker}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Proxy error");
      const data = await res.json();
      
      if (!data) throw new Error("No data");

      const profile = data.assetProfile || data.summaryProfile || {};
      const price = data.price || {};
      const fin = data.financialData || {};
      const stats = data.defaultKeyStatistics || {};
      
      // Parse real competitor data from dynamic fetch
      const competitors = this.parseCompetitors(data.competitors, price.regularMarketPrice || 150);
      
      // Parse real institutional ownership
      const institutionalOwnership = this.parseInstitutionalOwnership(data.institutionOwnership);
      
      // Parse real insider holders
      const insiderHolders = this.parseInsiderHolders(data.insiderHolders);
      
      // Parse real fund ownership
      const fundOwnership = this.parseFundOwnership(data.fundOwnership);
      
      // Parse real SEC filings
      const secFilings = this.parseSECFilings(data.secFilings);
      
      // Parse real earnings data
      const earningsData = this.parseEarningsData(data.earnings, data.earningsHistory, data.earningsTrend);
      
      // Parse real analyst recommendations
      const analystData = this.parseAnalystData(data.recommendationTrend, data.upgradeDowngradeHistory);
      
      // Parse real financial statements
      const financialStatements = this.parseFinancialStatements(
        data.incomeStatementHistory,
        data.balanceSheetHistory,
        data.cashflowStatementHistory,
        data.incomeStatementHistoryQuarterly,
        data.fundamentalsTimeSeries
      );
      
      // Parse net share purchase activity
      const netShareActivity = this.parseNetShareActivity(data.netSharePurchaseActivity);
      
      // Parse major holders breakdown
      const majorHolders = this.parseMajorHolders(data.majorHoldersBreakdown);

      const parsedIntel = {
        symbol: ticker,
        companyName: price.shortName || price.longName || ticker,
        sector: profile.sector || 'Technology',
        industry: profile.industry || 'Software',
        description: profile.longBusinessSummary || 'No summary available.',
        ceo: profile.companyOfficers?.find(o => o.title?.toLowerCase().includes('ceo'))?.name || 'N/A',
        country: profile.country || 'US',
        fullTimeEmployees: profile.fullTimeEmployees || 10000,
        hq: profile.address1 ? `${profile.city || ''}, ${profile.state || ''}, ${profile.country || ''}` : 'N/A',
        website: profile.website || '',
        companyOfficers: profile.companyOfficers || [],
        financials: {
          revenue: fin.totalRevenue || 0,
          netIncome: fin.netIncomeToCommon || 0,
          operatingMargin: fin.operatingMargins || 0.15,
          profitMargin: fin.profitMargins || 0.10,
          freeCashFlow: fin.freeCashflow || 0,
          eps: stats.trailingEps || fin.earningsPerShare || 0,
          debtEquity: fin.debtToEquity || 0,
          revenueGrowth: fin.revenueGrowth || 0,
          peRatio: stats.trailingPE || price.trailingPE || 25,
          pegRatio: stats.pegRatio || 1.8,
          evEbitda: stats.enterpriseToEbitda || 18,
          priceSales: stats.priceToSalesTrailing12Months || 5.2,
          returnOnEquity: fin.returnOnEquity || 0,
          returnOnAssets: fin.returnOnAssets || 0,
          grossMargin: fin.grossMargins || 0,
          ebitdaMargin: fin.ebitdaMargins || 0,
          currentRatio: fin.currentRatio || 1,
          quickRatio: fin.quickRatio || 1,
        },
        snapshot: {
          marketCap: price.marketCap || 0,
          revenue: fin.totalRevenue || 0,
          netIncome: fin.netIncomeToCommon || 0,
          cashReserves: fin.totalCash || 0,
          debt: fin.totalDebt || 0,
          enterpriseValue: stats.enterpriseValue || 0,
        },
        competitors: competitors,
        aiDossier: data.aiDossier || {},
        supplyChainAI: data.supplyChainAI || null,
        threatsAI: data.threatsAI || null,
        ownership: {
          institutionalPct: stats.heldPercentInstitutions ? (stats.heldPercentInstitutions * 100).toFixed(1) + '%' : 'N/A',
          insiderPct: stats.heldPercentInsiders ? (stats.heldPercentInsiders * 100).toFixed(1) + '%' : 'N/A',
          retailPct: 'N/A',
          insiderTransactions: this.parseInsiderTransactions(data.insiderTransactions || []),
          institutionalHolders: institutionalOwnership,
          insiderHolders: insiderHolders,
          fundHolders: fundOwnership,
          majorHolders: majorHolders,
          netShareActivity: netShareActivity,
        },
        secFilings: secFilings,
        earnings: earningsData,
        analyst: analystData,
        financialStatements: financialStatements,
        calendarEvents: data.calendarEvents || null,
        trends: {
          index: data.indexTrend || null,
          industry: data.industryTrend || null,
          sector: data.sectorTrend || null,
        }
      };

      apiCache.set(cacheKey, parsedIntel, 10); // 10 min TTL
      return parsedIntel;
    } catch {
      console.warn("CompanyIntel API failed for", ticker);
      return null;
    }
  },

  /**
   * Parse real competitor data from Yahoo Finance quotes
   */
  parseCompetitors(competitorQuotes, currentPrice) {
    if (!Array.isArray(competitorQuotes) || competitorQuotes.length === 0) {
      return null;
    }

    const peers = competitorQuotes.map(q => ({
      symbol: q.symbol,
      name: q.shortName || q.longName || q.symbol,
      price: q.regularMarketPrice,
      marketCap: q.marketCap,
      pe: q.trailingPE || q.forwardPE,
      eps: q.epsTrailingTwelveMonths,
      revenueGrowth: q.revenueGrowth || 0,
      operatingMargin: q.operatingMargin || 0,
      changePct: q.regularMarketChangePercent?.toFixed(2) || '0.00'
    }));

    const primary = peers[0] || {};

    return {
      currentPrice: currentPrice,
      peerSymbol: primary.symbol || null,
      peerPrice: primary.price || null,
      peerPe: primary.pe || null,
      peerMargin: primary.operatingMargin ? (primary.operatingMargin * 100).toFixed(1) + '%' : null,
      peerGrowth: primary.revenueGrowth ? (primary.revenueGrowth * 100).toFixed(1) + '%' : null,
      peers: peers,
      moatScore: null,
      moatScorecard: [],
      marketShare: [],
      threats: []
    };
  },

  /**
   * Parse institutional ownership from Yahoo Finance
   */
  parseInstitutionalOwnership(institutionOwnership) {
    if (!institutionOwnership?.ownershipList) return [];
    
    return institutionOwnership.ownershipList.slice(0, 10).map(holder => ({
      name: holder.organization || 'Unknown',
      shares: holder.position || holder.position?.raw || 0,
      value: holder.value || holder.value?.raw || 0,
      pctHeld: holder.pctHeld || holder.pctHeld?.raw || 0,
      pctChange: holder.pctChange || holder.pctChange?.raw || 0,
      reportDate: holder.reportDate || 'N/A'
    }));
  },

  /**
   * Parse insider holders from Yahoo Finance
   */
  parseInsiderHolders(insiderHolders) {
    if (!insiderHolders?.holders) return [];
    
    return insiderHolders.holders.slice(0, 10).map(holder => ({
      name: holder.name || 'Unknown',
      relation: holder.relation || 'Insider',
      shares: holder.positionDirect || holder.positionDirect?.raw || 0,
      value: holder.positionDirectValue || holder.positionDirectValue?.raw || 0,
      latestTransDate: holder.latestTransDate || 'N/A',
      positionDirectDate: holder.positionDirectDate || 'N/A'
    }));
  },

  /**
   * Parse fund ownership from Yahoo Finance
   */
  parseFundOwnership(fundOwnership) {
    if (!fundOwnership?.ownershipList) return [];
    
    return fundOwnership.ownershipList.slice(0, 10).map(holder => ({
      name: holder.organization || 'Unknown',
      shares: holder.position || holder.position?.raw || 0,
      value: holder.value || holder.value?.raw || 0,
      pctHeld: holder.pctHeld || holder.pctHeld?.raw || 0,
      pctChange: holder.pctChange || holder.pctChange?.raw || 0,
      reportDate: holder.reportDate || 'N/A'
    }));
  },

  /**
   * Parse SEC filings from Yahoo Finance
   */
  parseSECFilings(secFilings) {
    if (!secFilings || !Array.isArray(secFilings)) return [];
    
    return secFilings.slice(0, 15).map(filing => ({
      date: filing.date,
      type: filing.type,
      title: filing.title || `${filing.type} Filing`,
      url: filing.edgarUrl || filing.url || '#'
    }));
  },

  /**
   * Parse earnings data from Yahoo Finance
   */
  parseEarningsData(earnings, earningsHistory, earningsTrend) {
    const history = [];
    if (earningsHistory?.history) {
      earningsHistory.history.slice(0, 8).forEach(e => {
        history.push({
          quarter: e.quarter || 'N/A',
          epsEstimate: e.epsEstimate || 0,
          epsActual: e.epsActual || 0,
          surprise: e.epsPercentChange || 0,
          date: e.startdatetime || 'N/A'
        });
      });
    }

    const trend = [];
    if (earningsTrend?.trend) {
      earningsTrend.trend.slice(0, 5).forEach(t => {
        trend.push({
          period: t.period || 'N/A',
          growth: t.growth || t.growth?.raw || 0,
          earningsEstimate: {
            avg: t.earningsEstimate?.avg || 0,
            low: t.earningsEstimate?.low || 0,
            high: t.earningsEstimate?.high || 0,
            numberOfAnalysts: t.earningsEstimate?.numberOfAnalysts || 0
          },
          revenueEstimate: {
            avg: t.revenueEstimate?.avg || 0,
            low: t.revenueEstimate?.low || 0,
            high: t.revenueEstimate?.high || 0,
            numberOfAnalysts: t.revenueEstimate?.numberOfAnalysts || 0
          }
        });
      });
    }

    return {
      earningsChart: earnings?.earningsChart || null,
      financialsChart: earnings?.financialsChart || null,
      history: history,
      trend: trend
    };
  },

  /**
   * Parse analyst recommendations and upgrades/downgrades
   */
  parseAnalystData(recommendationTrend, upgradeDowngradeHistory) {
    const recommendations = [];
    if (recommendationTrend?.trend) {
      recommendationTrend.trend.forEach(t => {
        recommendations.push({
          period: t.period,
          strongBuy: t.strongBuy || 0,
          buy: t.buy || 0,
          hold: t.hold || 0,
          sell: t.sell || 0,
          strongSell: t.strongSell || 0
        });
      });
    }

    const upgrades = [];
    if (upgradeDowngradeHistory?.history) {
      upgradeDowngradeHistory.history.slice(0, 10).forEach(h => {
        let parsedDate = 'N/A';
        try {
          if (h.epochGradeDate) {
            const d = new Date(typeof h.epochGradeDate === 'number' ? h.epochGradeDate * 1000 : h.epochGradeDate);
            if (!isNaN(d.getTime())) {
              parsedDate = d.toISOString().split('T')[0];
            }
          }
        } catch {
          // ignore
        }
        upgrades.push({
          date: parsedDate,
          firm: h.firm || 'Unknown',
          toGrade: h.toGrade || 'N/A',
          fromGrade: h.fromGrade || 'N/A',
          action: h.action || 'N/A'
        });
      });
    }

    return {
      recommendations: recommendations,
      upgrades: upgrades
    };
  },

  /**
   * Parse financial statements (income, balance sheet, cash flow) from fundamentalsTimeSeries
   */
  parseFinancialStatements(incomeHistory, balanceSheetHistory, cashflowHistory, incomeQuarterly, fundamentalsTimeSeries) {
    const incomeStatements = [];
    
    // Try fundamentalsTimeSeries first (Yahoo's replacement for deprecated statement modules)
    if (fundamentalsTimeSeries?.financialsChart?.yearly) {
      fundamentalsTimeSeries.financialsChart.yearly.forEach(s => {
        incomeStatements.push({
          endDate: s.date?.toString() || 'N/A',
          totalRevenue: s.revenue || 0,
          costOfRevenue: 0,
          grossProfit: 0,
          operatingExpense: 0,
          operatingIncome: s.operatingIncome || 0,
          netIncome: s.netIncome || 0,
          ebitda: s.ebitda || 0,
          researchDevelopment: 0,
          sellingGeneralAdministrative: 0
        });
      });
    }
    
    // Fallback to deprecated modules if available
    if (incomeStatements.length === 0 && incomeHistory?.incomeStatementHistory) {
      incomeHistory.incomeStatementHistory.forEach(s => {
        incomeStatements.push({
          endDate: s.endDate || 'N/A',
          totalRevenue: s.totalRevenue || s.totalRevenue?.raw || 0,
          costOfRevenue: s.costOfRevenue || s.costOfRevenue?.raw || 0,
          grossProfit: s.grossProfit || s.grossProfit?.raw || 0,
          operatingExpense: s.operatingExpense || s.operatingExpense?.raw || 0,
          operatingIncome: s.operatingIncome || s.operatingIncome?.raw || 0,
          netIncome: s.netIncome || s.netIncome?.raw || 0,
          ebitda: s.ebitda || s.ebitda?.raw || 0,
          researchDevelopment: s.researchDevelopment || s.researchDevelopment?.raw || 0,
          sellingGeneralAdministrative: s.sellingGeneralAdministrative || s.sellingGeneralAdministrative?.raw || 0
        });
      });
    }

    const balanceSheets = [];
    if (balanceSheetHistory?.balanceSheetStatements) {
      balanceSheetHistory.balanceSheetStatements.forEach(s => {
        balanceSheets.push({
          endDate: s.endDate || 'N/A',
          totalAssets: s.totalAssets || s.totalAssets?.raw || 0,
          totalLiabilities: s.totalLiabilities || s.totalLiabilities?.raw || 0,
          totalStockholderEquity: s.totalStockholderEquity || s.totalStockholderEquity?.raw || 0,
          cash: s.cash || s.cash?.raw || 0,
          shortTermInvestments: s.shortTermInvestments || s.shortTermInvestments?.raw || 0,
          totalCurrentAssets: s.totalCurrentAssets || s.totalCurrentAssets?.raw || 0,
          totalCurrentLiabilities: s.totalCurrentLiabilities || s.totalCurrentLiabilities?.raw || 0,
          longTermDebt: s.longTermDebt || s.longTermDebt?.raw || 0,
          shortLongTermDebt: s.shortLongTermDebt || s.shortLongTermDebt?.raw || 0,
          retainedEarnings: s.retainedEarnings || s.retainedEarnings?.raw || 0
        });
      });
    }

    const cashFlows = [];
    if (cashflowHistory?.cashflowStatements) {
      cashflowHistory.cashflowStatements.forEach(s => {
        cashFlows.push({
          endDate: s.endDate || 'N/A',
          operatingCashFlow: s.operatingCashflow || s.operatingCashflow?.raw || 0,
          capitalExpenditures: s.capitalExpenditures || s.capitalExpenditures?.raw || 0,
          freeCashFlow: (s.operatingCashflow?.raw || s.operatingCashflow || 0) - (s.capitalExpenditures?.raw || s.capitalExpenditures || 0),
          dividendsPaid: s.dividendsPaid || s.dividendsPaid?.raw || 0,
          netBorrowings: s.netBorrowings || s.netBorrowings?.raw || 0
        });
      });
    }

    return {
      incomeStatements: incomeStatements,
      balanceSheets: balanceSheets,
      cashFlows: cashFlows,
      quarterlyIncome: incomeQuarterly?.incomeStatementHistory || []
    };
  },

  /**
   * Parse net share purchase activity
   */
  parseNetShareActivity(netSharePurchaseActivity) {
    if (!netSharePurchaseActivity) return null;
    
    return {
      period: netSharePurchaseActivity.period || 'N/A',
      buyInfoCount: netSharePurchaseActivity.buyInfoCount || 0,
      buyInfoShares: netSharePurchaseActivity.buyInfoShares || netSharePurchaseActivity.buyInfoShares?.raw || 0,
      buyPercentInsiderShares: netSharePurchaseActivity.buyPercentInsiderShares || netSharePurchaseActivity.buyPercentInsiderShares?.raw || 0,
      sellInfoCount: netSharePurchaseActivity.sellInfoCount || 0,
      sellInfoShares: netSharePurchaseActivity.sellInfoShares || netSharePurchaseActivity.sellInfoShares?.raw || 0,
      sellPercentInsiderShares: netSharePurchaseActivity.sellPercentInsiderShares || netSharePurchaseActivity.sellPercentInsiderShares?.raw || 0,
      netInfoCount: netSharePurchaseActivity.netInfoCount || 0,
      netInfoShares: netSharePurchaseActivity.netInfoShares || netSharePurchaseActivity.netInfoShares?.raw || 0,
      netPercentInsiderShares: netSharePurchaseActivity.netPercentInsiderShares || netSharePurchaseActivity.netPercentInsiderShares?.raw || 0,
      totalInsiderShares: netSharePurchaseActivity.totalInsiderShares || netSharePurchaseActivity.totalInsiderShares?.raw || 0
    };
  },

  /**
   * Parse major holders breakdown
   */
  parseMajorHolders(majorHoldersBreakdown) {
    if (!majorHoldersBreakdown) return {};
    
    return {
      insidersPercentHeld: majorHoldersBreakdown.insidersPercentHeld || majorHoldersBreakdown.insidersPercentHeld?.raw || 0,
      institutionsPercentHeld: majorHoldersBreakdown.institutionsPercentHeld || majorHoldersBreakdown.institutionsPercentHeld?.raw || 0,
      institutionsFloatPercentHeld: majorHoldersBreakdown.institutionsFloatPercentHeld || majorHoldersBreakdown.institutionsFloatPercentHeld?.raw || 0,
      institutionsCount: majorHoldersBreakdown.institutionsCount || majorHoldersBreakdown.institutionsCount?.raw || 0
    };
  },

  /**
   * Helper to fetch global indices
   */
  async getGlobalIndices() {
    const cacheKey = 'global_indices';
    const cached = apiCache.get(cacheKey);
    if (cached) return cached;

    try {
      const res = await fetch('http://localhost:3001/api/indices');
      if (!res.ok) throw new Error("Indices proxy failed");
      const data = await res.json();
      
      const formatted = data.map(item => ({
        ticker: indexMap[item.symbol] || item.symbol,
        symbol: item.symbol,
        price: item.regularMarketPrice,
        changeRaw: item.regularMarketChange,
        changePct: `${item.regularMarketChangePercent?.toFixed(2)}%`
      }));

      apiCache.set(cacheKey, formatted, 1);
      return formatted;
    } catch {
      console.warn("Indices fetch failed");
      return [];
    }
  },

  /**
   * Helper to fetch currencies
   */
  async getCurrencies() {
    const cacheKey = 'currencies';
    const cached = apiCache.get(cacheKey);
    if (cached) return cached;

    try {
      const res = await fetch('http://localhost:3001/api/currencies');
      if (!res.ok) throw new Error("Currencies proxy failed");
      const data = await res.json();
      
      const formatted = data.map(item => ({
        ticker: currencyMap[item.symbol] || item.symbol,
        symbol: item.symbol,
        price: item.regularMarketPrice,
        changeRaw: item.regularMarketChange,
        changePct: `${item.regularMarketChangePercent?.toFixed(2)}%`
      }));

      apiCache.set(cacheKey, formatted, 1);
      return formatted;
    } catch {
      console.warn("Currencies fetch failed");
      return [];
    }
  },

  /**
   * Helper to fetch commodities
   */
  async getCommodities() {
    const cacheKey = 'commodities';
    const cached = apiCache.get(cacheKey);
    if (cached) return cached;

    try {
      const res = await fetch('http://localhost:3001/api/commodities');
      if (!res.ok) throw new Error("Commodities proxy failed");
      const data = await res.json();
      
      const formatted = data.map(item => ({
        ticker: commodityMap[item.symbol] || item.symbol,
        symbol: item.symbol,
        price: item.regularMarketPrice,
        changeRaw: item.regularMarketChange,
        changePct: `${item.regularMarketChangePercent?.toFixed(2)}%`
      }));

      apiCache.set(cacheKey, formatted, 1);
      return formatted;
    } catch {
      console.warn("Commodities fetch failed");
      return [];
    }
  },

  /**
   * Fetch News Headlines
   */
  async getNews(query = 'markets') {
    const cacheKey = `news_${query}`;
    const cached = apiCache.get(cacheKey);
    if (cached) return cached;

    try {
       const res = await fetch(`http://localhost:3001/api/news/${query}`);
       const data = await res.json();
       
       if(data && Array.isArray(data) && data.length > 0) {
         const result = data.map(a => {
           const title = a.title || 'Market Update';
           const lowerTitle = title.toLowerCase();
           
           let sentiment = 'Neutral';
           if (lowerTitle.match(/soar|gain|up|beat|growth|rise|rally|jump|climb|buy|bull/)) {
             sentiment = 'Bullish';
           } else if (lowerTitle.match(/fall|down|miss|drop|plunge|sink|sell|bear|loss|cut/)) {
             sentiment = 'Bearish';
           }

           const publisher = a.publisher || 'Finance Feed';
           let impact = 'LOW';
           if (publisher.match(/Bloomberg|Reuters|Wall Street Journal|WSJ|CNBC|Financial Times/i)) {
             impact = 'HIGH';
           } else if (publisher.match(/Yahoo|MarketWatch|Barron|Forbes/i)) {
             impact = 'MED';
           }

            let parsedTime = new Date().toISOString();
            try {
              if (a.providerPublishTime) {
                const pd = new Date(typeof a.providerPublishTime === 'number' ? 
                  (a.providerPublishTime < 1e12 ? a.providerPublishTime * 1000 : a.providerPublishTime) 
                  : a.providerPublishTime);
                if (!isNaN(pd.getTime())) {
                  parsedTime = pd.toISOString();
                }
              }
            } catch {
              // fallback to current time
            }

            return {
              title,
              source: publisher,
              url: a.link || '#',
              time: parsedTime,
              sentiment,
              impactScore: impact
            };
         });
         apiCache.set(cacheKey, result, 5); // 5 min TTL
         return result;
       }
       throw new Error("Empty news");
    } catch {
      console.warn("News fetch failed");
      return [];
    }
  },

  parseInsiderTransactions(transactions) {
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return [];
    }
    return transactions.slice(0, 10).map(t => ({
      filerName: t.filerName || 'Insider',
      relation: t.filerRelation || 'Officer',
      transactionDate: t.startDate || 'N/A',
      transactionType: t.transactionText?.includes('Sale') ? 'SELL' : 'BUY',
      shares: t.shares || t.shares?.raw || 0,
      value: t.value || t.value?.raw || 0
    }));
  },

  /**
   * Search symbols with optional asset type filter
   */
  async searchSymbols(query, assetType = null) {
    if (!query || query.trim().length === 0) return [];
    try {
      let url = `http://localhost:3001/api/search?q=${encodeURIComponent(query.trim())}`;
      if (assetType && assetType !== 'ALL') {
        url += `&type=${encodeURIComponent(assetType)}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error("Search proxy error");
      return await res.json();
    } catch (e) {
      console.warn("Symbol search failed:", e.message);
      return [];
    }
  },

  /**
   * Fetch available models from OpenRouter via proxy
   */
  async getAvailableModels() {
    try {
      const res = await fetch('http://localhost:3001/api/models');
      if (!res.ok) throw new Error("Proxy error");
      return await res.json();
    } catch (e) {
      console.warn("Could not fetch models from proxy:", e.message);
      return [];
    }
  },

  /**
   * Send message history to the AI agent
   */
  async postChatMessage(messages, activeTicker, model, activeCountry, watchlist) {
    try {
      const res = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, activeTicker, model, activeCountry, watchlist })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Unknown server error' }));
        throw new Error(errData.error || `Proxy error ${res.status}`);
      }
      const data = await res.json();
      return data.message;
    } catch (e) {
      console.error("AI Agent chat failed:", e);
      throw e;
    }
  }
};
