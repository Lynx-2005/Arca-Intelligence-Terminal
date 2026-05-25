# 📊 ARCA Terminal Indicators & Analytics

This documentation provides an in-depth explanation of the quantitative, AI-driven, and macroeconomic indicators used throughout the ARCA Terminal. 

---

## 1. Microstructure & Orderflow

The Microstructure panel relies on Level 2 Tick Data (Market Depth) to analyze the actual flow of buying and selling pressure before it reflects on the price chart.

### Order Flow Imbalance (OFI)
OFI measures the aggression of buyers versus sellers by classifying every single trade. ARCA Terminal uses a robust "Aggressor Inference" algorithm based on the Lee-Ready Tick Rule.

- **Aggressive Buy:** Trade executes at or above the Best Ask.
- **Aggressive Sell:** Trade executes at or below the Best Bid.
- **Tick Rule:** If the trade occurs inside the spread, we compare it to the last traded price. 
  - $P_t > P_{t-1} \rightarrow \text{Buy}$
  - $P_t < P_{t-1} \rightarrow \text{Sell}$

The OFI is the net difference between aggressive buy volume ($V_{buy}$) and aggressive sell volume ($V_{sell}$):
> **$OFI = \sum V_{buy} - \sum V_{sell}$**

### Microstructure Regimes
ARCA uses machine learning models to classify the current state of the order book into probability vectors:

| Regime | Description | Indication |
|--------|-------------|------------|
| **Trend Continuation** | Consistent unidirectional OFI with expanding liquidity. | High probability of the current trend persisting. |
| **Mean Reversion** | OFI diverges from the price trend (e.g., price rising but aggressive selling increases). | Potential exhaustion and reversal. |
| **Liquidity Compression** | Order book thickens on both sides, suppressing volatility. | Anticipation of a breakout (calm before the storm). |
| **Panic / Sweep** | Sudden, massive market orders clearing multiple levels of the book. | Institutional algorithmic execution or stop-loss cascading. |

---

## 2. Options Engine

The Options Engine analyzes the Open Interest (OI) across the entire options chain to identify critical support/resistance levels and market maker hedging targets.

### Support & Resistance (Call / Put Walls)
- **Call Wall (Resistance):** The strike price with the highest Call Open Interest. Option sellers (dealers) will heavily defend this level.
- **Put Wall (Support):** The strike price with the highest Put Open Interest. Acts as a floor where dealers step in to buy the underlying.

### Max Pain
Max Pain is the strike price where the highest number of options contracts expire worthless, causing the maximum financial loss for option buyers (and maximum profit for option sellers/market makers). 

ARCA Terminal iterates through every strike price $S$ and calculates the theoretical "Pain":
> **$Pain = \sum_{C} \max(S - K_c, 0) \times OI_c + \sum_{P} \max(K_p - S, 0) \times OI_p$**

Where:
- $K_c, K_p$ = Strike prices for Calls and Puts
- $OI_c, OI_p$ = Open Interest for Calls and Puts

The strike $S$ that yields the lowest total Pain is the **Max Pain Strike**, which acts as a powerful magnet for the stock price on expiration day.

---

## 3. ARCA AI Agent (SEC Intelligence)

The ARCA AI Agent parses thousands of pages of raw SEC filings (10-K, 10-Q), earnings call transcripts, and institutional holdings to generate a localized intelligence dossier.

### Quantitative Forensics Scoring
We run the raw balance sheet and income statements through institutional forensic accounting algorithms to detect bankruptcy risk and earnings manipulation.

#### Altman Z-Score (Bankruptcy Risk)
Predicts the probability of a company going bankrupt within 2 years.
> **$Z = 1.2(X_1) + 1.4(X_2) + 3.3(X_3) + 0.6(X_4) + 1.0(X_5)$**
- $X_1$ = Working Capital / Total Assets
- $X_2$ = Retained Earnings / Total Assets
- $X_3$ = EBIT / Total Assets
- $X_4$ = Market Value of Equity / Total Liabilities
- $X_5$ = Sales / Total Assets

**Interpretation:**
- $Z < 1.8$: High Distress (Red)
- $1.8 < Z < 3$: Grey Zone (Yellow)
- $Z > 3$: Safe Zone (Green)

#### Beneish M-Score (Earnings Manipulation)
Detects whether a company has been artificially inflating earnings.
> **$M = -4.84 + 0.92(DSRI) + 0.528(GMI) + 0.404(AQI) + 0.892(SGI) + 0.115(DEPI) - 0.172(SGAI) + 4.679(LVGI) - 0.327(TATA)$**

**Interpretation:**
- $M > -1.78$: High probability of accounting manipulation.

### AI Moat Analysis
The LLM evaluates the company's competitive advantage based on its gross margins, R&D spend, and peer comparison to determine if it has a Wide, Narrow, or No Moat.

---

## 4. Global Macro Intelligence

The Macro Engine maps geopolitical and macroeconomic risk factors to localized equity indices.

- **Breaking News Nodes:** Analyzes global RSS feeds and maps conflicts (e.g., Strait of Hormuz) to commodity impacts (e.g., Oil).
- **Country Intelligence:** Tracks GDP, CPI Inflation, and Interest Rates. An elevated CPI generally triggers a hawkish rate expectation, shifting the Terminal's Macro Risk to "ELEVATED", signaling algorithmic risk-off positioning.
