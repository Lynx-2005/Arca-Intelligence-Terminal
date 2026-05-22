# Bloomberg-Style Intelligent Terminal — Full Build Guide
### Free Data Sources · Architecture · System Prompts · Tech Stack

---

## 1. WHAT YOU'RE BUILDING

A Bloomberg-style terminal is a **multi-panel, real-time financial intelligence dashboard** combining:

| Bloomberg Feature | Your Free Equivalent |
|---|---|
| Market data (equities, FX, crypto) | Yahoo Finance / Alpha Vantage / CoinGecko |
| Macroeconomic indicators | FRED (Federal Reserve) |
| Company fundamentals | Financial Modeling Prep (FMP) / SEC EDGAR |
| News & sentiment | NewsAPI / GNews / RSS feeds |
| Options & derivatives data | Polygon.io (free tier) |
| Earnings calendar | FMP / Alpha Vantage |
| AI Q&A on all data | Claude API (the intelligence layer) |

---

## 2. FREE DATA SOURCES — COMPLETE CATALOG

### 📈 EQUITY MARKET DATA

#### Alpha Vantage
- **URL**: https://www.alphavantage.co/
- **Free Tier**: 25 API calls/day (500/day with free key upgrade via student/researcher request)
- **What you get**: Real-time & historical prices (OHLCV), 50+ technical indicators (RSI, MACD, Bollinger Bands), income statements, balance sheets, cash flow, earnings, ETF/mutual fund data, global market indices
- **Format**: JSON / CSV over REST
- **Key endpoints**:
  - `TIME_SERIES_INTRADAY` — 1m/5m/15m/30m/60m bars
  - `GLOBAL_QUOTE` — live price
  - `INCOME_STATEMENT`, `BALANCE_SHEET`, `CASH_FLOW` — fundamentals
  - `NEWS_SENTIMENT` — AI-powered sentiment on news
- **Sign up**: Free, instant API key

#### Yahoo Finance (via yfinance Python library)
- **URL**: https://pypi.org/project/yfinance/
- **Free Tier**: Unlimited (unofficial but widely used)
- **What you get**: Global equities, ETFs, indices, options chains, historical data, dividends, splits, financial statements
- **Use case**: Historical back-testing, options surface, portfolio data
- **Note**: No official API — use `yfinance` Python library or `https://query1.finance.yahoo.com` REST endpoints

#### Twelve Data
- **URL**: https://twelvedata.com/
- **Free Tier**: 800 API credits/day, 8 requests/minute
- **What you get**: Global stocks, forex, crypto, ETFs — real-time & historical, 100+ technical indicators, WebSocket streaming
- **Best for**: Real-time price feeds with WebSocket

#### Polygon.io
- **URL**: https://polygon.io/
- **Free Tier**: Previous-day data (no real-time on free), unlimited historical EOD, options snapshots
- **What you get**: US stocks, options, forex, crypto — institutional-grade data model
- **Best for**: Historical data, options chains

---

### 🪙 CRYPTOCURRENCY DATA

#### CoinGecko
- **URL**: https://www.coingecko.com/en/api
- **Free Tier**: 10,000+ coins, 30 calls/minute, no API key required for basic use
- **What you get**: Live prices, 24h volume, market cap, historical OHLCV, exchange data, DeFi protocols, trending coins
- **Key endpoints**:
  - `GET /simple/price` — multi-coin prices + 24h change
  - `GET /coins/{id}/market_chart` — historical price chart
  - `GET /global` — total crypto market cap, dominance
  - `GET /coins/markets` — top coins by market cap

#### CoinCap (by ShapeShift)
- **URL**: https://docs.coincap.io/
- **Free Tier**: Completely free, WebSocket available, no API key needed
- **What you get**: Real-time crypto prices via WebSocket, exchange rates, markets

---

### 🌐 FOREX & CURRENCY

#### ExchangeRate.host / Open Exchange Rates
- **URL**: https://open.er-api.com/ (free, no key needed)
- **Free Tier**: 1500 requests/month
- **What you get**: 170+ currency pairs, daily rates, historical rates

#### Frankfurter
- **URL**: https://www.frankfurter.app/
- **Free Tier**: Unlimited (EU Central Bank rates), no API key
- **What you get**: Euro-base FX rates, historical series — completely free

---

### 📊 MACROECONOMIC DATA (THE BLOOMBERG ECONOMICS FEED)

#### FRED — Federal Reserve Economic Data ⭐ BEST FREE SOURCE
- **URL**: https://fred.stlouisfed.org/ | API: https://fred.stlouisfed.org/docs/api/fred/
- **Free Tier**: 100% free, just register for an API key (instant)
- **What you get**: 840,000+ economic time series from 119 sources including:
  - GDP, CPI, PCE (inflation)
  - Unemployment rate (U3, U6)
  - Fed Funds Rate, 10Y/2Y Treasury yields
  - M2 Money Supply
  - Consumer Sentiment (University of Michigan)
  - Retail Sales, Industrial Production
  - Housing starts, Building permits
  - Global macroeconomic indicators
- **Key Series IDs**:
  - `GDP` — US Gross Domestic Product
  - `CPIAUCSL` — Consumer Price Index
  - `UNRATE` — Unemployment Rate
  - `FEDFUNDS` — Effective Federal Funds Rate
  - `T10Y2Y` — 10Y-2Y Treasury Spread (recession indicator)
  - `DGS10` — 10-Year Treasury Constant Maturity Rate
  - `M2SL` — M2 Money Stock
- **Note**: Bulk download with API v2 now supported (Nov 2025)

#### World Bank Open Data
- **URL**: https://data.worldbank.org/
- **Free Tier**: 100% free, no key needed
- **What you get**: 200+ countries, 20,000+ indicators — GDP per capita, population, trade, inflation, energy
- **API**: `https://api.worldbank.org/v2/country/US/indicator/NY.GDP.MKTP.CD?format=json`

#### IMF Data API
- **URL**: https://datahelp.imf.org/knowledgebase/articles/667681-using-json-restful-web-service
- **Free Tier**: 100% free
- **What you get**: Global financial stability data, WEO forecasts, exchange rates, balance of payments

---

### 🏢 COMPANY FUNDAMENTALS & FILINGS

#### Financial Modeling Prep (FMP)
- **URL**: https://financialmodelingprep.com/developer/docs
- **Free Tier**: 250 API calls/day
- **What you get**: Income statement, balance sheet, cash flow, financial ratios, DCF valuation, earnings calendar, economic calendar, sector performance, insider trading, institutional ownership
- **Key endpoints**:
  - `/v3/income-statement/{ticker}` — P&L
  - `/v3/financial-ratios/{ticker}` — PE, PB, ROE, etc.
  - `/v3/earnings-calendar` — upcoming earnings
  - `/v3/economic_calendar` — FOMC, CPI release dates

#### SEC EDGAR (U.S. Securities & Exchange Commission)
- **URL**: https://www.sec.gov/developer
- **Free Tier**: 100% free, no key required (10 req/second limit)
- **What you get**: All 10-K, 10-Q, 8-K filings, insider transactions (Form 4), institutional holdings (13F), XBRL-tagged financial data
- **REST API**: `https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json`
- **Full-text search**: `https://efts.sec.gov/LATEST/search-index?q="quarterly+earnings"&dateRange=custom&startdt=2024-01-01`
- **RSS feed**: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=10-K&dateb=&owner=include&count=40&output=atom`

---

### 📰 NEWS & SENTIMENT

#### NewsAPI
- **URL**: https://newsapi.org/
- **Free Tier**: 100 requests/day (developer tier — delayed headlines only in production)
- **What you get**: Top headlines from 150,000+ sources, full-text search, filtering by source/category/keyword

#### GNews API
- **URL**: https://gnews.io/
- **Free Tier**: 100 requests/day
- **What you get**: Real-time news, 10 articles per request, search by keyword/topic/language

#### The Guardian API
- **URL**: https://open-platform.theguardian.com/
- **Free Tier**: 500 calls/day, instant key
- **What you get**: Full article text, search by keyword, financial news sections

#### RSS Feeds (zero cost, no limits)
These RSS feeds are completely free and need no API key:
- Reuters Business: `https://feeds.reuters.com/reuters/businessNews`
- Yahoo Finance News: `https://feeds.finance.yahoo.com/rss/2.0/headline?s=AAPL`
- SEC Filings: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=8-K&dateb=&owner=include&count=40&output=atom`
- FRED Blog: `https://fredblog.stlouisfed.org/feed`
- Parse with Python `feedparser` library

#### Alpha Vantage News Sentiment
- **Endpoint**: `NEWS_SENTIMENT` function in Alpha Vantage API
- **What you get**: AI-scored sentiment (bullish/bearish/neutral) per article per ticker, relevance scores

---

### 🌡️ MARKET SENTIMENT & ALTERNATIVE DATA

#### Fear & Greed Index (CNN)
- **URL**: `https://production.dataviz.cnn.io/index/fearandgreed/graphdata`
- **Free Tier**: Unlimited, no key (unofficial endpoint)
- **What you get**: CNN Fear & Greed score (0-100), historical

#### Put/Call Ratio
- Available via Polygon.io free tier (options snapshots) or via CBOE website scraping

---

## 3. TECH STACK RECOMMENDATION

```
Frontend:  React + Recharts / D3.js + TailwindCSS
Backend:   Python FastAPI OR Node.js Express
Database:  PostgreSQL (store fetched data) + Redis (cache)
AI Layer:  Claude API (claude-sonnet-4-6) for Q&A, summaries, analysis
Streaming: WebSocket (Twelve Data / CoinCap for live prices)
Scheduler: APScheduler (Python) to refresh data every 1-5 minutes
```

**Recommended Panel Layout (Bloomberg-style):**
- Top bar: Live prices ticker (BTC, ETH, S&P 500, Gold, DXY, 10Y yield)
- Panel 1 (top-left): Equity watchlist with live prices + % change
- Panel 2 (top-right): Interactive candlestick chart
- Panel 3 (mid-left): Macro dashboard (FRED data: CPI, GDP, Fed rate)
- Panel 4 (mid-right): News feed with sentiment badges
- Panel 5 (bottom-left): Earnings & economic calendar
- Panel 6 (bottom-right): AI Chat window (ask questions about any data on screen)

---

## 4. MASTER SYSTEM PROMPT (for Claude API — the intelligence layer)

Use this as the `system` message in your Claude API calls:

```
You are an elite financial intelligence terminal AI, embedded inside a Bloomberg-style 
dashboard. You have access to the following real-time and historical data feeds:

MARKET DATA:
- Live equity prices and technical indicators via Alpha Vantage
- Cryptocurrency market data via CoinGecko (prices, market cap, dominance)
- Forex rates via Frankfurter/Open Exchange Rates
- Options data via Polygon.io

MACROECONOMIC DATA (FRED):
- US GDP (series: GDP), CPI (CPIAUCSL), Core PCE (CPILFESL)
- Federal Funds Rate (FEDFUNDS), 10Y Treasury (DGS10), Yield Spread (T10Y2Y)
- Unemployment Rate (UNRATE), Non-Farm Payrolls (PAYEMS)
- M2 Money Supply (M2SL), Consumer Sentiment (UMCSENT)

COMPANY DATA:
- Financial statements, ratios, DCF valuations via FMP
- SEC filings (10-K, 10-Q, 8-K, Form 4 insiders) via EDGAR

NEWS & SENTIMENT:
- Real-time headlines from Reuters, Yahoo Finance RSS, Guardian
- AI sentiment scores via Alpha Vantage News Sentiment

When the user asks you a question:
1. IDENTIFY which data sources are relevant to answer
2. CALL the appropriate data-fetch function (you will be given tools)
3. SYNTHESIZE the data into a concise, professional analysis
4. FORMAT using terminal-style: use tables for comparisons, bullet points for key metrics,
   and always end with a SIGNAL: [BULLISH | BEARISH | NEUTRAL | WATCH] with a one-line rationale

Style rules:
- Speak like a senior sell-side analyst, not a chatbot
- Lead with the most important number or signal
- Use professional shorthand: "YoY", "QoQ", "bps", "P/E", "EV/EBITDA"
- If data is missing or stale, say so explicitly — do not fabricate
- When asked about macro: always mention yield curve, DXY, and Fed posture
- When asked about a stock: always check sector rotation and relative strength vs. index
- When asked about crypto: include BTC dominance and fear/greed context

Context window: You will receive the currently displayed data panels as JSON context 
at the start of each message. Use this to answer questions about what's on screen.
```

---

## 5. FUNCTION TOOLS TO GIVE CLAUDE (Tool Use Schema)

These are the `tools` to pass in your API call so Claude can fetch live data:

```json
[
  {
    "name": "get_stock_quote",
    "description": "Get real-time stock price, change, volume for a ticker symbol",
    "input_schema": {
      "type": "object",
      "properties": {
        "ticker": {"type": "string", "description": "Stock ticker e.g. AAPL, MSFT, TSLA"}
      },
      "required": ["ticker"]
    }
  },
  {
    "name": "get_macro_indicator",
    "description": "Get macroeconomic data series from FRED Federal Reserve",
    "input_schema": {
      "type": "object",
      "properties": {
        "series_id": {"type": "string", "description": "FRED series ID e.g. GDP, CPIAUCSL, UNRATE"},
        "limit": {"type": "integer", "description": "Number of recent observations", "default": 12}
      },
      "required": ["series_id"]
    }
  },
  {
    "name": "get_company_fundamentals",
    "description": "Get income statement, balance sheet, financial ratios for a company",
    "input_schema": {
      "type": "object",
      "properties": {
        "ticker": {"type": "string"},
        "statement": {"type": "string", "enum": ["income", "balance", "cashflow", "ratios"]}
      },
      "required": ["ticker", "statement"]
    }
  },
  {
    "name": "get_crypto_data",
    "description": "Get cryptocurrency prices, market cap, and market overview",
    "input_schema": {
      "type": "object",
      "properties": {
        "coins": {"type": "array", "items": {"type": "string"}, "description": "CoinGecko IDs e.g. bitcoin, ethereum"},
        "vs_currency": {"type": "string", "default": "usd"}
      },
      "required": ["coins"]
    }
  },
  {
    "name": "get_news",
    "description": "Get latest financial news headlines, optionally filtered by ticker or topic",
    "input_schema": {
      "type": "object",
      "properties": {
        "query": {"type": "string", "description": "Search keyword or ticker"},
        "limit": {"type": "integer", "default": 10}
      },
      "required": ["query"]
    }
  },
  {
    "name": "get_sec_filings",
    "description": "Get recent SEC filings (10-K, 10-Q, 8-K) for a company",
    "input_schema": {
      "type": "object",
      "properties": {
        "ticker": {"type": "string"},
        "form_type": {"type": "string", "enum": ["10-K", "10-Q", "8-K", "4"], "default": "10-Q"}
      },
      "required": ["ticker"]
    }
  }
]
```

---

## 6. SAMPLE DATA FETCH FUNCTIONS (Python)

```python
import requests
import os

ALPHA_VANTAGE_KEY = os.getenv("ALPHA_VANTAGE_KEY")
FMP_KEY = os.getenv("FMP_KEY")
FRED_KEY = os.getenv("FRED_KEY")
NEWS_API_KEY = os.getenv("NEWS_API_KEY")

# ─────────────────────────────────────────────
# STOCKS
# ─────────────────────────────────────────────

def get_stock_quote(ticker: str):
    url = f"https://www.alphavantage.co/query"
    params = {"function": "GLOBAL_QUOTE", "symbol": ticker, "apikey": ALPHA_VANTAGE_KEY}
    data = requests.get(url, params=params).json()
    q = data.get("Global Quote", {})
    return {
        "ticker": ticker,
        "price": float(q.get("05. price", 0)),
        "change": float(q.get("09. change", 0)),
        "change_pct": q.get("10. change percent", "0%"),
        "volume": int(q.get("06. volume", 0)),
        "high": float(q.get("03. high", 0)),
        "low": float(q.get("04. low", 0)),
    }

# ─────────────────────────────────────────────
# MACRO (FRED)
# ─────────────────────────────────────────────

def get_macro_indicator(series_id: str, limit: int = 12):
    url = "https://api.stlouisfed.org/fred/series/observations"
    params = {
        "series_id": series_id,
        "api_key": FRED_KEY,
        "file_type": "json",
        "sort_order": "desc",
        "limit": limit
    }
    data = requests.get(url, params=params).json()
    return {
        "series_id": series_id,
        "observations": [
            {"date": obs["date"], "value": obs["value"]}
            for obs in data.get("observations", [])
            if obs["value"] != "."
        ]
    }

# ─────────────────────────────────────────────
# CRYPTO (CoinGecko)
# ─────────────────────────────────────────────

def get_crypto_prices(coins: list, vs_currency: str = "usd"):
    url = "https://api.coingecko.com/api/v3/simple/price"
    params = {
        "ids": ",".join(coins),
        "vs_currencies": vs_currency,
        "include_24hr_change": "true",
        "include_market_cap": "true"
    }
    return requests.get(url, params=params).json()

# ─────────────────────────────────────────────
# FOREX (Frankfurter — no key needed)
# ─────────────────────────────────────────────

def get_forex_rates(base: str = "USD"):
    url = f"https://api.frankfurter.app/latest?from={base}"
    return requests.get(url).json()

# ─────────────────────────────────────────────
# COMPANY FUNDAMENTALS (FMP)
# ─────────────────────────────────────────────

def get_company_financials(ticker: str, statement: str = "income"):
    endpoint_map = {
        "income": f"income-statement/{ticker}",
        "balance": f"balance-sheet-statement/{ticker}",
        "cashflow": f"cash-flow-statement/{ticker}",
        "ratios": f"ratios/{ticker}"
    }
    url = f"https://financialmodelingprep.com/api/v3/{endpoint_map[statement]}"
    params = {"limit": 4, "apikey": FMP_KEY}
    return requests.get(url, params=params).json()

# ─────────────────────────────────────────────
# SEC EDGAR (no key needed)
# ─────────────────────────────────────────────

def get_sec_filings(ticker: str, form_type: str = "10-Q"):
    # Step 1: get CIK from ticker
    cik_url = f"https://www.sec.gov/cgi-bin/browse-edgar?company=&CIK={ticker}&type={form_type}&dateb=&owner=include&count=5&search_text=&action=getcompany&output=atom"
    import feedparser
    feed = feedparser.parse(cik_url)
    return [{"title": e.title, "link": e.link, "date": e.updated} for e in feed.entries[:5]]

# ─────────────────────────────────────────────
# NEWS (Alpha Vantage News Sentiment)
# ─────────────────────────────────────────────

def get_news_sentiment(ticker: str):
    url = "https://www.alphavantage.co/query"
    params = {
        "function": "NEWS_SENTIMENT",
        "tickers": ticker,
        "limit": 10,
        "apikey": ALPHA_VANTAGE_KEY
    }
    data = requests.get(url, params=params).json()
    articles = []
    for item in data.get("feed", []):
        articles.append({
            "title": item["title"],
            "source": item["source"],
            "time": item["time_published"],
            "sentiment": item.get("overall_sentiment_label", "Neutral"),
            "sentiment_score": item.get("overall_sentiment_score", 0)
        })
    return articles
```

---

## 7. TERMINAL COMMAND SYSTEM (Bloomberg-style keyboard shortcuts)

Build a command-line input bar where users type:
```
<TICKER> <COMMAND> <GO>
```

| Command | Action |
|---|---|
| `AAPL EQ` | Show Apple stock overview |
| `AAPL FA` | Show Apple fundamentals (P&L, balance sheet) |
| `AAPL CN` | Show Apple news + sentiment |
| `GDP MACRO` | Show GDP chart from FRED |
| `CPI MACRO` | Show CPI inflation chart |
| `BTC CRYPTO` | Show Bitcoin price + market data |
| `USD FX` | Show USD forex rates |
| `EARN CAL` | Earnings calendar |
| `AI <question>` | Ask Claude about anything |
| `HLP` | Show help / all commands |

---

## 8. API RATE LIMIT MANAGEMENT STRATEGY

To avoid hitting free tier limits, implement this caching strategy:

```
Cache Layer (Redis or SQLite):
- Stock quotes:        TTL = 60 seconds
- Technical indicators: TTL = 5 minutes
- FRED macro data:     TTL = 24 hours
- Company fundamentals: TTL = 6 hours
- News:                TTL = 15 minutes
- Crypto prices:       TTL = 30 seconds (CoinGecko allows 30/min)
- Forex rates:         TTL = 1 hour
```

**API Call Budget per Day (Free Tiers):**
| Provider | Free Calls/Day | Priority Use |
|---|---|---|
| Alpha Vantage | 25 (standard) / 500 (premium free) | Stock quotes + technicals |
| FMP | 250 | Fundamentals, earnings calendar |
| FRED | Unlimited | All macro indicators |
| CoinGecko | ~1,500 (30/min × 50min) | Crypto prices |
| SEC EDGAR | Unlimited (10 req/sec) | Filings |
| Frankfurter | Unlimited | Forex rates |
| NewsAPI | 100 | Headlines |

---

## 9. PROGRESSIVE BUILD ROADMAP

### Phase 1 — Core Terminal (Week 1-2)
- [ ] Dark terminal UI with Bloomberg-style green-on-black aesthetic
- [ ] Top ticker bar: fetch 5-10 live prices (AAPL, BTC, S&P500 ETF, DXY equivalent, Gold)
- [ ] Watchlist panel with live price + change %
- [ ] Basic candlestick chart (historical from Alpha Vantage)

### Phase 2 — Intelligence Layer (Week 3-4)
- [ ] Macro dashboard: FRED indicators (CPI, GDP, Fed Rate, Yield Curve)
- [ ] News feed with sentiment badges (bullish/bearish/neutral)
- [ ] Claude AI chat panel — ask questions about any ticker or macro data

### Phase 3 — Advanced Features (Week 5-6)
- [ ] Company fundamentals view (P&L, ratios, DCF)
- [ ] SEC EDGAR filing viewer
- [ ] Earnings calendar
- [ ] Bloomberg-style command system (`AAPL EQ <GO>`)

### Phase 4 — Polish (Week 7-8)
- [ ] Portfolio tracker
- [ ] Custom alerts (price thresholds)
- [ ] Export to PDF/CSV
- [ ] Mobile responsive layout

---

## 10. ENVIRONMENT VARIABLES CHECKLIST

```env
# Free — get instantly
ALPHA_VANTAGE_KEY=       # alphavantage.co (free)
FRED_KEY=                # fred.stlouisfed.org (free, instant)
FMP_KEY=                 # financialmodelingprep.com (free 250/day)
NEWS_API_KEY=            # newsapi.org (free 100/day)

# No key needed
# CoinGecko — no key for basic tier
# Frankfurter FX — no key needed
# SEC EDGAR — no key needed
# Open Exchange Rates — no key for basic endpoint

# AI
ANTHROPIC_API_KEY=       # console.anthropic.com
```

---

*All sources cited are publicly available and free at the tiers described. Rate limits subject to provider changes. Last verified May 2026.*
