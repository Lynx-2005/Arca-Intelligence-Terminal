import React, { memo, useState, useEffect } from 'react';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { useStore } from '../../store';
import Panel from '../Panel';

// A lightweight TopoJSON for the world map
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Major global financial centers
const markers = [
  { markerOffset: -12, name: "New York", coordinates: [-74.006, 40.7128], id: 'USA' },
  { markerOffset: 12, name: "London", coordinates: [-0.1276, 51.5072], id: 'GBR' },
  { markerOffset: 12, name: "Tokyo", coordinates: [139.6917, 35.6895], id: 'JPN' },
  { markerOffset: -12, name: "Hong Kong", coordinates: [114.1694, 22.3193], id: 'CHN' },
  { markerOffset: -12, name: "Mumbai", coordinates: [72.8777, 19.0760], id: 'IND' },
  { markerOffset: 12, name: "Shanghai", coordinates: [121.4737, 31.2304], id: 'CHN' },
];

// ISO 3166-1 Numeric to Alpha-3 Mapping Table
const NUMERIC_TO_ISO3 = {
  "004": "AFG", "008": "ALB", "012": "DZA", "016": "ASM", "020": "AND", "024": "AGO", "028": "ATG", "031": "AZE", "032": "ARG", "036": "AUS",
  "040": "AUT", "044": "BHS", "048": "BHR", "050": "BGD", "052": "BRB", "056": "BEL", "060": "BER", "064": "BTN", "068": "BOL", "070": "BIH",
  "072": "BWA", "076": "BRA", "084": "BLZ", "090": "SLB", "092": "VGB", "096": "BRN", "100": "BGR", "104": "MMR", "108": "BDI", "112": "BLR",
  "116": "KHM", "120": "CMR", "124": "CAN", "132": "CPV", "136": "CYM", "140": "CAF", "144": "LKA", "148": "TCD", "152": "CHL", "156": "CHN",
  "158": "TWN", "162": "CXR", "166": "CCK", "170": "COL", "174": "COM", "178": "COG", "180": "COD", "184": "COK", "188": "CRI", "191": "HRV",
  "192": "CUB", "196": "CYP", "203": "CZE", "204": "BEN", "208": "DNK", "212": "DMA", "214": "DOM", "218": "ECU", "222": "SLV", "226": "GNQ",
  "231": "ETH", "232": "ERI", "233": "EST", "234": "FRO", "238": "FLK", "242": "FJI", "246": "FIN", "248": "ALA", "250": "FRA", "254": "GUF",
  "258": "PYF", "260": "ATF", "262": "DJI", "266": "GAB", "268": "GEO", "270": "GMB", "275": "PSE", "276": "DEU", "288": "GHA", "292": "GIB",
  "300": "GRC", "304": "GRL", "308": "GRD", "312": "GLP", "316": "GUM", "320": "GTM", "324": "GIN", "328": "GNB", "332": "GUY", "336": "HTI",
  "340": "HMD", "344": "HKG", "348": "HUN", "352": "ISL", "356": "IND", "360": "IDN", "364": "IRN", "368": "IRQ", "372": "IRL", "376": "ISR",
  "380": "ITA", "384": "CIV", "388": "JAM", "392": "JPN", "398": "KAZ", "400": "KEN", "404": "PRK", "410": "KOR", "414": "KWT", "417": "KGZ",
  "418": "LAO", "422": "LBN", "426": "LSO", "428": "LVA", "430": "LBR", "434": "LBY", "438": "LIE", "440": "LTU", "442": "LUX", "446": "MAC",
  "450": "MDG", "454": "MWI", "458": "MYS", "462": "MDV", "466": "MLI", "470": "MLT", "474": "MTQ", "478": "MRT", "480": "MUS", "484": "MEX",
  "492": "MCO", "496": "MNG", "498": "MDA", "499": "MNE", "500": "MSR", "504": "MAR", "508": "MOZ", "512": "OMN", "516": "NAM", "520": "NRU",
  "524": "NPL", "528": "NLD", "531": "CUW", "533": "ABW", "534": "SXM", "535": "BES", "540": "NCL", "548": "NZL", "554": "NIC", "558": "NER",
  "562": "NGA", "566": "NIU", "570": "NFK", "574": "MNP", "578": "NOR", "580": "MNP", "583": "FSM", "584": "MHL", "585": "PLW", "586": "PAK",
  "591": "PAN", "598": "PNG", "600": "PRY", "604": "PER", "608": "PHL", "612": "PCN", "616": "POL", "620": "PRT", "624": "GNB", "626": "TLS",
  "630": "PUR", "634": "QAT", "638": "REU", "642": "ROU", "643": "RUS", "646": "RWA", "652": "BLM", "654": "SHN", "659": "KNA", "660": "AIA",
  "662": "LCA", "663": "MAF", "666": "SPM", "670": "VCT", "674": "SMR", "678": "STP", "682": "SAU", "686": "SEN", "688": "SRB", "690": "SYC",
  "694": "SLE", "702": "SGP", "703": "SVK", "704": "VNM", "705": "SVN", "706": "SOM", "710": "ZAF", "711": "SGS", "716": "ZWE", "724": "ESP",
  "728": "SSD", "729": "SDN", "732": "ESH", "736": "SDN", "740": "SUR", "744": "SJM", "748": "SWZ", "752": "SWE", "756": "CHE", "760": "SYR",
  "762": "TJK", "764": "THA", "768": "TGO", "772": "TKL", "776": "TON", "780": "TTO", "784": "ARE", "788": "TUN", "792": "TUR", "795": "TKM",
  "796": "TCA", "798": "TUV", "800": "UGA", "804": "UKR", "807": "MKD", "818": "EGY", "826": "GBR", "834": "TZA", "840": "USA", "850": "VIR",
  "854": "BFA", "858": "URY", "860": "UZB", "862": "VEN", "882": "WSM", "887": "YEM", "894": "ZMB"
};

const numericToIso3 = (id) => {
  if (!id) return null;
  const padded = String(id).padStart(3, '0');
  return NUMERIC_TO_ISO3[padded] || null;
};

const countryDossiers = {
  'USA': {
    name: 'United States',
    gdp: 'Loading...',
    inflation: 'Loading...',
    interestRate: '5.25% - 5.50%',
    currency: 'USD (DXY: 104.55)',
    stockIndex: 'S&P 500 (+12.4% YTD)',
    creditRating: 'AA+ (Fitch) / Aaa (Moody\'s)',
    exports: 'Refined Petroleum, Crude Oil, Integrated Circuits, Aircraft',
    tradeDependency: '12% of GDP (Low exposure to direct trade shocks)',
    commodityExposure: 'High energy self-sufficiency; Net exporter of gas/oil',
    regionalRisks: 'Electoral policy swings, fiscal deficit trajectory',
    stability: '92/100',
    marketData: {
      movers: [
        { ticker: 'AAPL', name: 'Apple Inc.', price: '$189.84', change: '+1.45%' },
        { ticker: 'NVDA', name: 'Nvidia Corp.', price: '$945.50', change: '+3.88%' },
        { ticker: 'TSLA', name: 'Tesla Inc.', price: '$174.60', change: '-2.10%' }
      ],
      sectors: 'Tech (+22%), Energy (+11%), Financials (+8%)',
      etf: 'SPY (AUM: $520B), QQQ (AUM: $250B)'
    },
    geopolitics: {
      status: 'Stable / Leading Hegemon',
      conflicts: 'Indirect exposure via trade corridor blockades',
      sanctions: 'Primary issuer of global sanctions grids (OFAC)',
      logistics: 'Strategic control of main Atlantic/Pacific trade paths'
    },
    news: [
      { title: 'Fed Signals Retaining Policy Rates Higher for Longer to Combat Sticky Housing Costs', sentiment: 'Bearish', impact: 'HIGH' },
      { title: 'Treasury Auction of 10-Year Notes Sees Strong Bid-to-Cover Ratio at 2.52', sentiment: 'Bullish', impact: 'MED' }
    ]
  },
  'CHN': {
    name: 'China',
    gdp: 'Loading...',
    inflation: 'Loading...',
    interestRate: '3.45% (LPR 1Y)',
    currency: 'CNY (USDCNY: 7.2340)',
    stockIndex: 'Shanghai Composite (+3.8% YTD)',
    creditRating: 'A+ (S&P) / A1 (Moody\'s)',
    exports: 'Broadcasting Equipment, Computers, Integrated Circuits, EVs',
    tradeDependency: '35% of GDP (High reliance on export markets)',
    commodityExposure: 'Net importer of crude oil, copper, iron ore, and soybeans',
    regionalRisks: 'Real estate sector deleveraging, technology export controls',
    stability: '85/100',
    marketData: {
      movers: [
        { ticker: 'TCEHY', name: 'Tencent Holdings', price: '$48.50', change: '+1.12%' },
        { ticker: 'BABA', name: 'Alibaba Group', price: '$82.40', change: '+2.05%' },
        { ticker: 'BYDDF', name: 'BYD Company', price: '$29.50', change: '+4.20%' }
      ],
      sectors: 'EVs/Batteries (+18%), Tech (-4%), Real Estate (-14%)',
      etf: 'MCHI (AUM: $6.2B), FXI (AUM: $4.8B)'
    },
    geopolitics: {
      status: 'Strategic Rivalry with US',
      conflicts: 'Maritime border disputes in South China Sea',
      sanctions: 'Tech transfer limits, restriction on advanced logic chips',
      logistics: 'Malacca Strait chokepoint dependency for energy shipping imports'
    },
    news: [
      { title: 'PBOC Cuts Reserve Requirement Ratio (RRR) by 25bps to Unlock Banking Liquidity', sentiment: 'Bullish', impact: 'HIGH' },
      { title: 'Local Government Debt Refinancing Quota Expanded to Restructure Regional Balance Sheets', sentiment: 'Neutral', impact: 'MED' }
    ]
  },
  'DEU': {
    name: 'Germany',
    gdp: 'Loading...',
    inflation: 'Loading...',
    interestRate: '4.00% (ECB Refi)',
    currency: 'EUR (USDEUR: 0.9210)',
    stockIndex: 'DAX 40 (+9.8% YTD)',
    creditRating: 'AAA (S&P / Moody\'s)',
    exports: 'Cars, Machinery, Chemical Products, Pharmaceuticals',
    tradeDependency: '89% of GDP (High Eurozone integration)',
    commodityExposure: 'High energy import reliance; transitioning grids',
    regionalRisks: 'Industrial power prices, demographics',
    stability: '93/100',
    marketData: {
      movers: [
        { ticker: 'SAP', name: 'SAP SE', price: '€175.40', change: '+1.62%' },
        { ticker: 'BAYRY', name: 'Bayer AG', price: '€28.10', change: '-2.15%' },
        { ticker: 'MBG.DE', name: 'Mercedes-Benz', price: '€74.20', change: '+0.45%' }
      ],
      sectors: 'Auto/Industrial (+8%), Tech (+14%), Chemicals (-5%)',
      etf: 'EWG (AUM: $2.1B)'
    },
    geopolitics: {
      status: 'EU Core Economic Leader',
      conflicts: 'Indirect gas supply route exposure',
      sanctions: 'EU Joint Sanctions Framework contributor',
      logistics: 'Central European transport corridor hub'
    },
    news: [
      { title: 'German Factory Orders Rebound 1.8% Driven by Aerospace/Capital Goods Export Demand', sentiment: 'Bullish', impact: 'MED' }
    ]
  },
  'FRA': {
    name: 'France',
    gdp: 'Loading...',
    inflation: 'Loading...',
    interestRate: '4.00% (ECB Refi)',
    currency: 'EUR (USDEUR: 0.9210)',
    stockIndex: 'CAC 40 (+6.4% YTD)',
    creditRating: 'AA- (S&P) / Aa2 (Moody\'s)',
    exports: 'Aircraft, Spacecraft, Luxury Goods, Wine, Pharmaceuticals',
    tradeDependency: '72% of GDP (High single market exposure)',
    commodityExposure: 'Buffered by domestic nuclear energy generation',
    regionalRisks: 'Sovereign debt trajectory, domestic pension reforms',
    stability: '89/100',
    marketData: {
      movers: [
        { ticker: 'MC.PA', name: 'LVMH Group', price: '€820.00', change: '+2.11%' },
        { ticker: 'OR.PA', name: 'L\'Oréal', price: '€440.50', change: '+0.85%' },
        { ticker: 'AIR.PA', name: 'Airbus SE', price: '€158.40', change: '-0.30%' }
      ],
      sectors: 'Luxury/Fashion (+15%), Aerospace (+9%), Banks (+4%)',
      etf: 'EWQ (AUM: $1.8B)'
    },
    geopolitics: {
      status: 'EU Core Power / NATO Nuclear Power',
      conflicts: 'Maritime diplomatic monitoring missions',
      sanctions: 'EU Joint Sanctions aligned',
      logistics: 'Key ports on Mediterranean and Atlantic channels'
    },
    news: [
      { title: 'French Services PMI Expands to 51.2, Outperforming Manufacturing Drag', sentiment: 'Bullish', impact: 'MED' }
    ]
  },
  'ITA': {
    name: 'Italy',
    gdp: 'Loading...',
    inflation: 'Loading...',
    interestRate: '4.00% (ECB Refi)',
    currency: 'EUR (USDEUR: 0.9210)',
    stockIndex: 'FTSE MIB (+11.2% YTD)',
    creditRating: 'BBB (S&P / Moody\'s)',
    exports: 'Packaged Medicaments, Cars, Parts, Valves, Leather Footwear',
    tradeDependency: '68% of GDP',
    commodityExposure: 'High dependency on gas/oil imports from North Africa/East',
    regionalRisks: 'Fiscal consolidation obligations, debt refinancing load',
    stability: '82/100',
    marketData: {
      movers: [
        { ticker: 'RACE', name: 'Ferrari NV', price: '$412.00', change: '+1.55%' },
        { ticker: 'ENI.MI', name: 'Eni SpA', price: '€14.50', change: '+0.60%' }
      ],
      sectors: 'Financials (+12%), Autos (+16%), Utilities (-2%)',
      etf: 'EWI (AUM: $820M)'
    },
    geopolitics: {
      status: 'G7 Member / Mediterranean Power',
      conflicts: 'Maritime migrant route security surveillance',
      sanctions: 'EU aligned sanctions frameworks',
      logistics: 'Critical hub for Mediterranean sea routes'
    },
    news: [
      { title: 'FTSE MIB Hits multi-year high as banking yields support capitalization margins', sentiment: 'Bullish', impact: 'MED' }
    ]
  },
  'ESP': {
    name: 'Spain',
    gdp: 'Loading...',
    inflation: 'Loading...',
    interestRate: '4.00% (ECB Refi)',
    currency: 'EUR (USDEUR: 0.9210)',
    stockIndex: 'IBEX 35 (+7.5% YTD)',
    creditRating: 'A (S&P / Fitch)',
    exports: 'Cars, Refined Petroleum, Packaged Medicaments, Pigs',
    tradeDependency: '64% of GDP',
    commodityExposure: 'Moderate energy import reliance; expanding renewables',
    regionalRisks: 'Youth unemployment, regional political volatility',
    stability: '86/100',
    marketData: {
      movers: [
        { ticker: 'SAN.MC', name: 'Banco Santander', price: '€4.50', change: '+1.20%' },
        { ticker: 'ITX.MC', name: 'Inditex (Zara)', price: '€44.10', change: '+1.05%' }
      ],
      sectors: 'Tourism/Services (+12%), Banks (+8%), Energy (+3%)',
      etf: 'EWP (AUM: $710M)'
    },
    geopolitics: {
      status: 'EU Member / Southern Flank security',
      conflicts: 'Low border threat indicators',
      sanctions: 'EU aligned sanctions frameworks',
      logistics: 'Access to Gibraltar and Mediterranean cargo routes'
    },
    news: [
      { title: 'Spanish Tourism Revenue Hits Record High in Q1, Supporting Fiscal Receipts', sentiment: 'Bullish', impact: 'HIGH' }
    ]
  },
  'CAN': {
    name: 'Canada',
    gdp: 'Loading...',
    inflation: 'Loading...',
    interestRate: '5.00% (Bank of Canada)',
    currency: 'CAD (USDCAD: 1.3620)',
    stockIndex: 'S&P/TSX Composite (+5.8% YTD)',
    creditRating: 'AAA (S&P / DBRS)',
    exports: 'Crude Petroleum, Cars, Gold, Coal Briquettes, Wheat',
    tradeDependency: '65% of GDP (Extreme exposure to US trade corridors)',
    commodityExposure: 'Major resource exporter (Oil sands, natural gas, minerals)',
    regionalRisks: 'Housing debt concentrations, productivity growth mismatch',
    stability: '94/100',
    marketData: {
      movers: [
        { ticker: 'RY.TO', name: 'Royal Bank of Canada', price: 'C$141.20', change: '+0.54%' },
        { ticker: 'SU.TO', name: 'Suncor Energy', price: 'C$52.10', change: '+1.88%' },
        { ticker: 'BCE.TO', name: 'BCE Inc.', price: 'C$45.40', change: '-1.10%' }
      ],
      sectors: 'Financials (+7%), Energy (+14%), Materials (+9%)',
      etf: 'EWC (AUM: $3.2B)'
    },
    geopolitics: {
      status: 'G7 Member / North American Security Ally',
      conflicts: 'Low territorial threat level',
      sanctions: 'US/UK aligned sanctions policies',
      logistics: 'Pacific/Atlantic transport connections and Arctic lane interest'
    },
    news: [
      { title: 'Bank of Canada Maintains Neutral Stance as Wage Pressures Ease in Q1', sentiment: 'Neutral', impact: 'HIGH' }
    ]
  },
  'BRA': {
    name: 'Brazil',
    gdp: 'Loading...',
    inflation: 'Loading...',
    interestRate: '10.50% (Selic Rate)',
    currency: 'BRL (USDBRL: 5.1520)',
    stockIndex: 'Bovespa (+2.1% YTD)',
    creditRating: 'BB- (S&P) / Ba2 (Moody\'s)',
    exports: 'Soybeans, Iron Ore, Crude Petroleum, Poultry, Corn',
    tradeDependency: '39% of GDP (High agricultural exporter profile)',
    commodityExposure: 'High export exposure to commodities price fluctuation',
    regionalRisks: 'Fiscal policy credibility, social program spend limits',
    stability: '80/100',
    marketData: {
      movers: [
        { ticker: 'VALE', name: 'Vale S.A.', price: '$12.10', change: '-1.42%' },
        { ticker: 'PBR', name: 'Petrobras', price: '$15.80', change: '+3.15%' }
      ],
      sectors: 'Mining/Materials (+6%), Energy (+11%), Agriculture (+8%)',
      etf: 'EWZ (AUM: $5.4B)'
    },
    geopolitics: {
      status: 'Leading South American Hegemon / BRICS Core',
      conflicts: 'Border drug transit control focus',
      sanctions: 'Strategic non-alignment policy',
      logistics: 'Key South Atlantic maritime nodes'
    },
    news: [
      { title: 'Brazilian Coffee and Soybean Export Quotas Hit Records on Strong Asian Demand', sentiment: 'Bullish', impact: 'MED' }
    ]
  },
  'RUS': {
    name: 'Russia',
    gdp: 'Loading...',
    inflation: 'Loading...',
    interestRate: '16.00%',
    currency: 'RUB (USDRUB: 91.50)',
    stockIndex: 'MOEX (+1.2% YTD)',
    creditRating: 'NR (Not Rated / Default Status)',
    exports: 'Crude Petroleum, Refined Petroleum, Coal, Gold, Wheat',
    tradeDependency: '42% of GDP (Slightly insulated by parallel trade paths)',
    commodityExposure: 'Major oil, gas, and wheat exporter; currency tied to resource revenues',
    regionalRisks: 'Geopolitical sanctions, labor shortage, high military spending',
    stability: '65/100',
    marketData: {
      movers: [
        { ticker: 'GAZP', name: 'Gazprom PJSC', price: '₽142.10', change: '-0.88%' },
        { ticker: 'SBER', name: 'Sberbank', price: '₽306.40', change: '+1.05%' }
      ],
      sectors: 'Energy/Oil (+12%), Financials (+4%), Mining (+6%)',
      etf: 'RSX (Suspended/Delisted)'
    },
    geopolitics: {
      status: 'Active Combatant / Heavily Sanctioned',
      conflicts: 'Ongoing military engagement in Eastern Europe',
      sanctions: 'Extensive US, EU, and UK sanctions (OFAC SDN block lists)',
      logistics: 'Pipelines redirected East; Northern Sea Route development'
    },
    news: [
      { title: 'Central Bank of Russia Holds Rates at 16.0% to Stabilize High Military-Driven Wages', sentiment: 'Bearish', impact: 'HIGH' }
    ]
  },
  'AUS': {
    name: 'Australia',
    gdp: 'Loading...',
    inflation: 'Loading...',
    interestRate: '4.35% (RBA)',
    currency: 'AUD (AUDUSD: 0.6640)',
    stockIndex: 'ASX 200 (+4.8% YTD)',
    creditRating: 'AAA (S&P / Moody\'s)',
    exports: 'Iron Ore, Coal, Gas (LNG), Gold, Wheat',
    tradeDependency: '46% of GDP (High reliance on East Asian buying markets)',
    commodityExposure: 'Massive exporter of iron ore, LNG, and coking coal',
    regionalRisks: 'Household mortgage debt sensitivity, commodity price cycles',
    stability: '95/100',
    marketData: {
      movers: [
        { ticker: 'BHP.AX', name: 'BHP Group', price: 'A$43.20', change: '+1.10%' },
        { ticker: 'CBA.AX', name: 'Commonwealth Bank', price: 'A$118.50', change: '+0.45%' }
      ],
      sectors: 'Mining/Materials (+12%), Banking (+7%), Real Estate (-2%)',
      etf: 'EWA (AUM: $1.9B)'
    },
    geopolitics: {
      status: 'Western Security Ally in Indo-Pacific',
      conflicts: 'Regional maritime surveillance focus',
      sanctions: 'Western-aligned sanctions policies',
      logistics: 'Strategic oceanic routes linking Indian and Pacific Oceans'
    },
    news: [
      { title: 'Reserve Bank of Australia Minutes Highlight Stubborn Services Inflation in Rents', sentiment: 'Neutral', impact: 'HIGH' }
    ]
  },
  'KOR': {
    name: 'South Korea',
    gdp: 'Loading...',
    inflation: 'Loading...',
    interestRate: '3.50% (Bank of Korea)',
    currency: 'KRW (USDKRW: 1362.50)',
    stockIndex: 'KOSPI (+2.3% YTD)',
    creditRating: 'AA (S&P) / Aa2 (Moody\'s)',
    exports: 'Integrated Circuits, Cars, Refined Petroleum, Passenger Ships',
    tradeDependency: '84% of GDP (Highly sensitive to global chip/tech demand)',
    commodityExposure: 'Almost 100% dependency on imported petroleum and raw minerals',
    regionalRisks: 'Declining labor force, export chip cycles, high household debt',
    stability: '92/100',
    marketData: {
      movers: [
        { ticker: '005930.KS', name: 'Samsung Electronics', price: '₩78,400', change: '+1.54%' },
        { ticker: '000660.KS', name: 'SK Hynix', price: '₩189,200', change: '+3.85%' }
      ],
      sectors: 'Technology (+15%), Automotives (+8%), Chemicals (-2%)',
      etf: 'EWY (AUM: $4.2B)'
    },
    geopolitics: {
      status: 'Western Security Partner in East Asia',
      conflicts: 'High military monitoring along demilitarized border zone',
      sanctions: 'Aligned with G7/UN sanctions frameworks',
      logistics: 'Key ports on Yellow Sea and East China Sea cargo routes'
    },
    news: [
      { title: 'South Korean Semiconductor Export Volumes Reach 18-Month High on AI DRAM Shipments', sentiment: 'Bullish', impact: 'HIGH' }
    ]
  },
  'IND': {
    name: 'India',
    gdp: 'Loading...',
    inflation: 'Loading...',
    interestRate: '6.50% (Repo Rate)',
    currency: 'INR (USDINR: 83.32)',
    stockIndex: 'Nifty 50 (+8.4% YTD)',
    creditRating: 'BBB- (S&P / Moody\'s)',
    exports: 'Refined Petroleum, Packaged Medicaments, Diamonds, Software Services',
    tradeDependency: '45% of GDP (Medium exposure, supported by domestic demand)',
    commodityExposure: 'Importers of 85% of crude requirements; vulnerable to energy price hikes',
    regionalRisks: 'Monsoon dependency for agricultural yields, fiscal deficit control',
    stability: '88/100',
    marketData: {
      movers: [
        { ticker: 'RELIANCE.NS', name: 'Reliance Industries', price: '₹2,840.00', change: '+1.54%' },
        { ticker: 'TCS.NS', name: 'Tata Consultancy Services', price: '₹3,750.00', change: '+0.88%' },
        { ticker: 'HDFCBANK.NS', name: 'HDFC Bank', price: '₹1,510.00', change: '-1.10%' }
      ],
      sectors: 'Infrastructure (+20%), IT Services (+5%), Banking (+8%)',
      etf: 'INDA (AUM: $7.2B), INDY (AUM: $3.1B)'
    },
    geopolitics: {
      status: 'Rising Regional Power',
      conflicts: 'Friction along northern mountain frontiers',
      sanctions: 'Strategic neutrality; maintains energy trade links with diverse partners',
      logistics: 'Sovereign security presence along Indian Ocean lanes'
    },
    news: [
      { title: 'Government Capital Expenditure Allocation Projected to Surge 11% to Drive Port & Highway Buildout', sentiment: 'Bullish', impact: 'HIGH' },
      { title: 'RBI Holds Key Repo Rate at 6.5%, Indicating Food Price Pressures Require Vigilance', sentiment: 'Neutral', impact: 'MED' }
    ]
  },
  'GBR': {
    name: 'United Kingdom',
    gdp: 'Loading...',
    inflation: 'Loading...',
    interestRate: '5.25%',
    currency: 'GBP (GBPUSD: 1.2715)',
    stockIndex: 'FTSE 100 (+6.2% YTD)',
    creditRating: 'AA (Standard & Poor\'s)',
    exports: 'Cars, Gas Turbines, Gold, Crude Petroleum, Pharmaceuticals',
    tradeDependency: '62% of GDP (High exposure to European supply routes)',
    commodityExposure: 'Dependent on imported natural gas, though North Sea acts as buffer',
    regionalRisks: 'Sticky wage inflation, structural productivity lags',
    stability: '90/100',
    marketData: {
      movers: [
        { ticker: 'SHEL', name: 'Shell Plc', price: '$72.10', change: '+0.88%' },
        { ticker: 'HSBC', name: 'HSBC Holdings', price: '$42.15', change: '-0.30%' },
        { ticker: 'AZN', name: 'AstraZeneca', price: '$120.40', change: '+1.05%' }
      ],
      sectors: 'Energy (+12%), Banking (+6%), Tech (+2%)',
      etf: 'EWU (AUM: $2.4B)'
    },
    geopolitics: {
      status: 'Stable / G7 Member',
      conflicts: 'Joint naval security operations in critical channels',
      sanctions: 'Sanctions matching OFAC on geopolitical adversaries',
      logistics: 'High reliance on English Channel maritime lanes'
    },
    news: [
      { title: 'Bank of England Hints at Possible Rate Cut in August as Headline CPI Falls Close to 2% Target', sentiment: 'Bullish', impact: 'HIGH' },
      { title: 'UK Trade Deficit Narrows Marginally on Higher Services Exports and Financial Volumes', sentiment: 'Neutral', impact: 'LOW' }
    ]
  },
  'JPN': {
    name: 'Japan',
    gdp: 'Loading...',
    inflation: 'Loading...',
    interestRate: '0.10% (BOJ Policy Rate)',
    currency: 'JPY (USDJPY: 156.12)',
    stockIndex: 'Nikkei 225 (+15.2% YTD)',
    creditRating: 'A+ (S&P) / A1 (Moody\'s)',
    exports: 'Cars, Integrated Circuits, Machinery, Refined Petroleum',
    tradeDependency: '48% of GDP (High dependency on importing food and raw materials)',
    commodityExposure: 'Almost 100% import dependency on oil, gas, iron ore, and copper',
    regionalRisks: 'Demographic decline, yen depreciation pressure, seismic activity risks',
    stability: '95/100',
    marketData: {
      movers: [
        { ticker: '7203.T', name: 'Toyota Motor', price: '¥3,410.00', change: '+2.10%' },
        { ticker: '6758.T', name: 'Sony Group', price: '¥12,450.00', change: '+0.45%' },
        { ticker: '9984.T', name: 'SoftBank Group', price: '¥7,840.00', change: '+3.15%' }
      ],
      sectors: 'Automotive (+14%), Electronics (+9%), Real Estate (+4%)',
      etf: 'EWJ (AUM: $12.5B), DXJ (AUM: $4.2B)'
    },
    geopolitics: {
      status: 'Key Western Security Ally',
      conflicts: 'Maritime tension over regional islands',
      sanctions: 'Coordinated sanctions with G7 frameworks',
      logistics: 'East Asian sea lines are strategic and vital for raw material shipping'
    },
    news: [
      { title: 'Yen Weakness Sparks Speculation of Currency Intervention by Ministry of Finance', sentiment: 'Neutral', impact: 'HIGH' },
      { title: 'Tokyo Stocks Hit Record Highs as Corporate Governance Reforms Accelerate Share Buybacks', sentiment: 'Bullish', impact: 'MED' }
    ]
  },
  'SAU': {
    name: 'Saudi Arabia',
    gdp: 'Loading...',
    inflation: 'Loading...',
    interestRate: '6.00%',
    currency: 'SAR (USDSAR: 3.7500)',
    stockIndex: 'TASI Index (+3.1% YTD)',
    creditRating: 'A (S&P) / A1 (Moody\'s)',
    exports: 'Crude Petroleum, Refined Petroleum, Acyclic Alcohols, Polymers',
    tradeDependency: '62% of GDP (High sovereign energy export profile)',
    commodityExposure: 'Swing oil producer of OPEC+; massive sovereign wealth fund (PIF)',
    regionalRisks: 'Global oil transition rates, regional security alignments',
    stability: '85/100',
    marketData: {
      movers: [
        { ticker: '1180.SE', name: 'Saudi Aramco', price: 'SAR31.20', change: '+0.64%' },
        { ticker: '1120.SE', name: 'Al Rajhi Bank', price: 'SAR78.50', change: '-1.10%' }
      ],
      sectors: 'Energy (+9%), Financials (+6%), Materials (+4%)',
      etf: 'KSA (AUM: $1.1B)'
    },
    geopolitics: {
      status: 'Middle East Regional Hegemon',
      conflicts: 'Active diplomatic broker in regional disputes',
      sanctions: 'No active international sanctions; sovereign non-alignment',
      logistics: 'Strategic control of Red Sea shipping routes via Suez Canal access'
    },
    news: [
      { title: 'OPEC+ Extends Voluntary Oil Output Cuts of 2.2M Barrels Per Day Into Q3', sentiment: 'Bullish', impact: 'HIGH' }
    ]
  },
  'SGP': {
    name: 'Singapore',
    gdp: 'Loading...',
    inflation: 'Loading...',
    interestRate: '3.80% (SORA)',
    currency: 'SGD (USDSGD: 1.3450)',
    stockIndex: 'Straits Times Index (+4.2% YTD)',
    creditRating: 'AAA (S&P / Moody\'s)',
    exports: 'Integrated Circuits, Refined Petroleum, Gold, Gas Turbines',
    tradeDependency: '320% of GDP (Extreme exposure to global trade volume)',
    commodityExposure: 'Highly vulnerable to container freight indices and energy costs',
    regionalRisks: 'Global shipping slowdown, technological trade barriers',
    stability: '98/100',
    marketData: {
      movers: [
        { ticker: 'D05.SI', name: 'DBS Group Holdings', price: 'S$35.40', change: '+1.02%' },
        { ticker: 'U11.SI', name: 'United Overseas Bank', price: 'S$29.10', change: '+0.55%' }
      ],
      sectors: 'Financials (+11%), Real Estate (+2%), Manufacturing (-4%)',
      etf: 'EWS (AUM: $640M)'
    },
    geopolitics: {
      status: 'Neutral Diplomatic Hub',
      conflicts: 'Low immediate security threat level',
      sanctions: 'Adheres to international consensus and UN sanctions',
      logistics: 'Premier global shipping hub at the mouth of the Malacca Strait'
    },
    news: [
      { title: 'Singapore Non-Oil Domestic Exports (NODX) Grow 2.4% on Semiconductor Demand Rebound', sentiment: 'Bullish', impact: 'MED' }
    ]
  },
  'ZAF': {
    name: 'South Africa',
    gdp: 'Loading...',
    inflation: 'Loading...',
    interestRate: '8.25% (SARB)',
    currency: 'ZAR (USDZAR: 18.42)',
    stockIndex: 'JSE Top 40 (+1.4% YTD)',
    creditRating: 'BB- (S&P / Moody\'s)',
    exports: 'Gold, Platinum, Coal, Diamonds, Cars, Manganese Ore',
    tradeDependency: '60% of GDP (High reliance on raw mineral exports)',
    commodityExposure: 'Rich mining resources; vulnerable to PGMs and precious metal price drops',
    regionalRisks: 'Electricity/logistics infrastructure bottlenecks, high youth unemployment',
    stability: '72/100',
    marketData: {
      movers: [
        { ticker: 'NPN.JO', name: 'Naspers Ltd.', price: 'R3,450', change: '+2.05%' },
        { ticker: 'SOL.JO', name: 'Sasol Ltd.', price: 'R142.10', change: '-1.45%' }
      ],
      sectors: 'Resources (+4%), Financials (+6%), Industrials (-1%)',
      etf: 'EZA (AUM: $420M)'
    },
    geopolitics: {
      status: 'Regional African Leader / BRICS Member',
      conflicts: 'Low physical border threats; focus on maritime channel security',
      sanctions: 'Maintains neutral non-aligned strategic profile',
      logistics: 'Strategic Cape Route shipping lanes bypass option'
    },
    news: [
      { title: 'S&P Upgrades South Africa Rating Outlook to Stable Citing Reforms in Electricity Utility', sentiment: 'Bullish', impact: 'HIGH' }
    ]
  },
  'PAK': {
    name: 'Pakistan',
    gdp: 'Loading...',
    inflation: 'Loading...',
    interestRate: '20.00% (State Bank of Pakistan)',
    currency: 'PKR (USD/PKR: 278.50)',
    stockIndex: 'KSE 100 (+14.2% YTD)',
    creditRating: 'CCC+ (S&P) / Caa3 (Moody\'s)',
    exports: 'Textiles, Rice, Cotton Yarn, Leather Goods, Surgical Instruments',
    tradeDependency: '30% of GDP',
    commodityExposure: 'High energy import dependency; Vulnerable to oil price shocks',
    regionalRisks: 'Balance of payments pressure, high inflation, political transition risks',
    stability: '42/100',
    marketData: {
      movers: [
        { ticker: 'ENGRO.KA', name: 'Engro Corporation', price: '₨324.50', change: '+1.45%' },
        { ticker: 'OGDC.KA', name: 'Oil & Gas Development Co', price: '₨132.80', change: '+2.10%' },
        { ticker: 'MCB.KA', name: 'MCB Bank Limited', price: '₨185.20', change: '-0.85%' }
      ],
      sectors: 'Textiles (+12%), Fertilizer (+8%), Commercial Banks (-2%)',
      etf: 'PAKS (AUM: $12M)'
    },
    geopolitics: {
      status: 'Strategic Regional Alignment',
      conflicts: 'Border security monitoring and trade transit concerns',
      sanctions: 'None; standard international trade relationships',
      logistics: 'Strategic access to Arabian Sea / Gwadar Port'
    },
    news: [
      { title: 'State Bank of Pakistan Keeps Policy Rate at 20% to Anchor Core Inflationary Pressures', sentiment: 'Neutral', impact: 'HIGH' },
      { title: 'IMF Staff Reaches Agreement on Extended Fund Facility Program for Macro Stabilization', sentiment: 'Bullish', impact: 'HIGH' }
    ]
  }
};

const getDossier = (id) => {
  if (!id) return {
    name: 'Unknown Territory',
    gdp: 'Loading...',
    inflation: 'Loading...',
    interestRate: 'Not Available',
    currency: 'Not Available',
    stockIndex: 'Not Available',
    creditRating: 'Not Available',
    exports: 'Not Available',
    tradeDependency: 'Not Available',
    commodityExposure: 'Not Available',
    regionalRisks: 'Not Available',
    stability: 'Not Available',
    marketData: { movers: [], sectors: 'Not Available', etf: 'Not Available' },
    geopolitics: { status: 'Not Available', conflicts: 'Not Available', sanctions: 'Not Available', logistics: 'Not Available' },
    news: []
  };

  if (countryDossiers[id]) return countryDossiers[id];

  const countryNames = {
    'AFG': 'Afghanistan', 'ALB': 'Albania', 'DZA': 'Algeria', 'ARG': 'Argentina', 'ARM': 'Armenia', 'AUS': 'Australia',
    'AUT': 'Austria', 'AZE': 'Azerbaijan', 'BGD': 'Bangladesh', 'BLR': 'Belarus', 'BEL': 'Belgium', 'BOL': 'Bolivia',
    'BRA': 'Brazil', 'BRN': 'Brunei', 'BGR': 'Bulgaria', 'KHM': 'Cambodia', 'CMR': 'Cameroon', 'CAN': 'Canada',
    'CHL': 'Chile', 'CHN': 'China', 'COL': 'Colombia', 'CRI': 'Costa Rica', 'HRV': 'Croatia', 'CUB': 'Cuba',
    'CYP': 'Cyprus', 'CZE': 'Czechia', 'DNK': 'Denmark', 'DOM': 'Dominican Republic', 'ECU': 'Ecuador', 'EGY': 'Egypt',
    'SLV': 'El Salvador', 'EST': 'Estonia', 'ETH': 'Ethiopia', 'FIN': 'Finland', 'FRA': 'France', 'GEO': 'Georgia',
    'DEU': 'Germany', 'GRC': 'Greece', 'GTM': 'Guatemala', 'HND': 'Honduras', 'HKG': 'Hong Kong', 'HUN': 'Hungary',
    'ISL': 'Iceland', 'IND': 'India', 'IDN': 'Indonesia', 'IRN': 'Iran', 'IRQ': 'Iraq', 'IRL': 'Ireland',
    'ISR': 'Israel', 'ITA': 'Italy', 'JAM': 'Jamaica', 'JPN': 'Japan', 'JOR': 'Jordan', 'KAZ': 'Kazakhstan',
    'KEN': 'Kenya', 'KOR': 'South Korea', 'KWT': 'Kuwait', 'KGZ': 'Kyrgyzstan', 'LAO': 'Laos', 'LVA': 'Latvia',
    'LBN': 'Lebanon', 'LBY': 'Libya', 'LTU': 'Lithuania', 'LUX': 'Luxembourg', 'MYS': 'Malaysia', 'MEX': 'Mexico',
    'MDA': 'Moldova', 'MNG': 'Mongolia', 'MAR': 'Morocco', 'MMR': 'Myanmar', 'NPL': 'Nepal', 'NLD': 'Netherlands',
    'NZL': 'New Zealand', 'NIC': 'Nicaragua', 'NGA': 'Nigeria', 'NOR': 'Norway', 'OMN': 'Oman', 'PAK': 'Pakistan',
    'PAN': 'Panama', 'PRY': 'Paraguay', 'PER': 'Peru', 'PHL': 'Philippines', 'POL': 'Poland', 'PRT': 'Portugal',
    'QAT': 'Qatar', 'ROU': 'Romania', 'RUS': 'Russia', 'SAU': 'Saudi Arabia', 'SEN': 'Senegal', 'SRB': 'Serbia',
    'SGP': 'Singapore', 'SVK': 'Slovakia', 'SVN': 'Slovenia', 'ZAF': 'South Africa', 'ESP': 'Spain', 'LKA': 'Sri Lanka',
    'SDN': 'Sudan', 'SWE': 'Sweden', 'CHE': 'Switzerland', 'SYR': 'Syria', 'TWN': 'Taiwan', 'TJK': 'Tajikistan',
    'THA': 'Thailand', 'TUN': 'Tunisia', 'TUR': 'Turkey', 'TKM': 'Turkmenistan', 'UGA': 'Uganda', 'UKR': 'Ukraine',
    'ARE': 'United Arab Emirates', 'GBR': 'United Kingdom', 'USA': 'United States', 'URY': 'Uruguay', 'UZB': 'Uzbekistan',
    'VEN': 'Venezuela', 'VNM': 'Vietnam', 'YEM': 'Yemen', 'ZMB': 'Zambia', 'ZWE': 'Zimbabwe'
  };

  const name = countryNames[id] || `${id} Territory`;

  return {
    name,
    gdp: 'Loading...',
    inflation: 'Loading...',
    interestRate: 'Not Available',
    currency: 'Not Available',
    stockIndex: 'Not Available',
    creditRating: 'Not Available',
    exports: 'Not Available',
    tradeDependency: 'Not Available',
    commodityExposure: 'Not Available',
    regionalRisks: 'Not Available',
    stability: 'Not Available',
    marketData: {
      movers: [],
      sectors: 'Not Available',
      etf: 'Not Available'
    },
    geopolitics: {
      status: 'Not Available',
      conflicts: 'Not Available',
      sanctions: 'Not Available',
      logistics: 'Not Available'
    },
    news: []
  };
};

const WorldMap = () => {
  const setCountry = useStore((state) => state.setCountry);
  const activeCountry = useStore((state) => state.activeCountry);
  const [tooltipContent, setTooltipContent] = useState('');
  const [dossier, setDossier] = useState(null);

  // Sync dossier with store activeCountry and fetch dynamic G20 macro + index quotes
  useEffect(() => {
    if (activeCountry) {
      const staticDossier = getDossier(activeCountry);
      setDossier(staticDossier);

      // Fetch dynamic macroeconomic indicators and market quote
      fetch(`http://localhost:3001/api/macro/${activeCountry}`)
        .then(res => res.json())
        .then(data => {
          if (data) {
            setDossier(prev => {
              // Avoid potential race conditions if user clicked another country in the meantime
              if (!prev || prev.name !== staticDossier.name) return prev;
              
              const updated = { ...prev };
              if (data.gdp) updated.gdp = data.gdp;
              if (data.inflation) updated.inflation = data.inflation;
              if (data.index) {
                const sign = data.index.change >= 0 ? '+' : '';
                const pctSign = data.index.changePercent >= 0 ? '+' : '';
                updated.stockIndex = `${data.index.name || updated.stockIndex} (${pctSign}${data.index.changePercent.toFixed(2)}% Live)`;
                
                // Inject the live index quote as the first row in the Market Movers table
                updated.marketData = {
                  ...prev.marketData,
                  movers: [
                    {
                      ticker: data.index.symbol,
                      name: data.index.name,
                      price: typeof data.index.price === 'number' ? data.index.price.toLocaleString() : data.index.price,
                      change: `${sign}${data.index.change.toFixed(2)} (${pctSign}${data.index.changePercent.toFixed(2)}%)`
                    },
                    ...(prev.marketData?.movers ? prev.marketData.movers.filter(m => m.ticker !== data.index.symbol) : [])
                  ]
                };
              }
              return updated;
            });
          }
        })
        .catch(err => {
          console.warn("Failed to fetch live macro metrics:", err);
        });
    } else {
      setDossier(null);
    }
  }, [activeCountry]);

  return (
    <Panel title="GLOBAL MACRO INTELLIGENCE" className="map-panel">
      <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080808' }}>
        
        {/* Map Object */}
        <ComposableMap projectionConfig={{ scale: 145 }} style={{ width: '100%', height: '100%' }}>
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const isoCode = numericToIso3(geo.id);
                const isSelected = activeCountry === isoCode;
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onClick={() => {
                      if (!isoCode) return;
                      // Toggle off if clicked again, otherwise select
                      if (activeCountry === isoCode) {
                        setCountry(null);
                      } else {
                        setCountry(isoCode);
                      }
                    }}
                    onMouseEnter={() => {
                      if (!isoCode) {
                        setTooltipContent(`${geo.properties.name || 'Unknown Region'}`);
                        return;
                      }
                      const dossierData = getDossier(isoCode);
                      setTooltipContent(`${geo.properties.name} (GDP: ${dossierData.gdp} | Inflation: ${dossierData.inflation})`);
                    }}
                    onMouseLeave={() => {
                      setTooltipContent('');
                    }}
                    style={{
                      default: {
                        fill: isSelected ? 'rgba(255, 176, 0, 0.35)' : '#141414',
                        stroke: isSelected ? 'var(--accent-amber)' : '#262626',
                        strokeWidth: 0.5,
                        outline: 'none',
                        transition: 'fill 0.2s, stroke 0.2s'
                      },
                      hover: {
                        fill: 'rgba(0, 170, 255, 0.25)',
                        stroke: 'var(--accent-blue)',
                        strokeWidth: 0.5,
                        outline: 'none',
                        cursor: 'pointer'
                      },
                      pressed: {
                        fill: 'var(--accent-amber)',
                        outline: 'none',
                      },
                    }}
                  />
                );
              })
            }
          </Geographies>
          {markers.map(({ name, coordinates, markerOffset, id }) => (
            <Marker key={name} coordinates={coordinates} onClick={() => setCountry(id)} style={{ cursor: 'pointer' }}>
              <circle r={3.5} fill="var(--accent-amber)" stroke="#000" strokeWidth={1.5} />
              <text
                textAnchor="middle"
                y={markerOffset}
                style={{ fontFamily: "var(--font-mono)", fill: "var(--text-secondary)", fontSize: "8px", fontWeight: 'bold' }}
              >
                {name}
              </text>
            </Marker>
          ))}
        </ComposableMap>
        
        {/* Absolute Hover Tooltip */}
        {tooltipContent && (
          <div style={{ 
            position: 'absolute', 
            top: 6, 
            left: 6, 
            background: 'rgba(5,5,5,0.95)', 
            padding: '6px 10px',
            border: '1px solid var(--panel-border)',
            borderRadius: '2px',
            pointerEvents: 'none',
            fontSize: '9px',
            zIndex: 10
          }}>
            <span className="text-amber" style={{ fontWeight: 'bold' }}>{tooltipContent}</span>
            <div style={{ fontSize: '8px', color: 'var(--text-secondary)', marginTop: '2px' }}>Click to lock macro intelligence dossier</div>
          </div>
        )}

        {/* Sliding Country Dossier Drawer Panel */}
        {dossier && (
          <div className="map-dossier-overlay">
            <div className="dossier-header">
              <span style={{ fontWeight: 'bold', color: 'var(--accent-amber)', fontSize: '11px' }}>
                MACRO DOSSIER: {dossier.name.toUpperCase()}
              </span>
              <button className="dossier-close-btn" onClick={() => setCountry(null)}>CLOSE</button>
            </div>
            
            <div className="dossier-content">
              {/* Country Intelligence */}
              <div>
                <div className="dossier-section-title">Country Intelligence</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '4px' }}>
                  <span className="text-muted">GDP Size:</span><span style={{ fontWeight: '600' }}>{dossier.gdp}</span>
                  <span className="text-muted">CPI Inflation:</span><span className="text-down" style={{ fontWeight: '600' }}>{dossier.inflation}</span>
                  <span className="text-muted">Interest Rate:</span><span className="text-amber" style={{ fontWeight: '600' }}>{dossier.interestRate}</span>
                  <span className="text-muted">Sovereign Debt:</span><span>{dossier.creditRating}</span>
                  <span className="text-muted">National Currency:</span><span className="text-blue">{dossier.currency}</span>
                  <span className="text-muted">Pol. Stability:</span><span className="text-up">{dossier.stability}</span>
                  <span className="text-muted">Primary Exports:</span><span style={{ fontSize: '9px' }}>{dossier.exports}</span>
                  <span className="text-muted">Trade Exposure:</span><span>{dossier.tradeDependency}</span>
                  <span className="text-muted">Geopol. Risks:</span><span className="text-down" style={{ fontSize: '9px' }}>{dossier.regionalRisks}</span>
                </div>
              </div>

              {/* Financial Market Data */}
              <div>
                <div className="dossier-section-title">Financial Market Data</div>
                <div style={{ marginBottom: '6px' }}>
                  <span className="text-muted">Equity Index: </span>
                  <span className="text-up" style={{ fontWeight: 'bold' }}>{dossier.stockIndex}</span>
                </div>
                <div style={{ fontSize: '9px', marginBottom: '6px' }}>
                  <span className="text-muted">Key Sectors: </span>
                  <span>{dossier.marketData.sectors}</span>
                </div>
                <div style={{ fontSize: '9px', marginBottom: '8px' }}>
                  <span className="text-muted">Liquid ETF Proxy: </span>
                  <span className="text-blue" style={{ fontWeight: 'bold' }}>{dossier.marketData.etf}</span>
                </div>
                <table className="data-table" style={{ fontSize: '9px' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Market Mover</th>
                      <th>Price</th>
                      <th>Chg%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dossier.marketData.movers.map((mover, i) => (
                      <tr key={i}>
                        <td style={{ textAlign: 'left', fontWeight: 'bold' }}>{mover.ticker}</td>
                        <td>{mover.price}</td>
                        <td className={mover.change.includes('+') ? 'text-up' : 'text-down'}>{mover.change}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Geopolitical Intelligence */}
              <div>
                <div className="dossier-section-title">Geopolitical Alignment</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div><span className="text-muted">Strategic Status: </span><span style={{ fontWeight: 'bold' }}>{dossier.geopolitics.status}</span></div>
                  <div><span className="text-muted">Active Friction: </span><span>{dossier.geopolitics.conflicts}</span></div>
                  <div><span className="text-muted">Trade Corridors: </span><span>{dossier.geopolitics.logistics}</span></div>
                </div>
              </div>

              {/* Dossier Specific News */}
              <div>
                <div className="dossier-section-title">Macro Feed & Intel</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {dossier.news.map((item, i) => (
                    <div key={i} style={{ borderBottom: '1px solid #1c1c1c', paddingBottom: '4px' }}>
                      <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '9px' }}>{item.title}</div>
                      <div className="flex-between" style={{ fontSize: '8px', marginTop: '2px' }}>
                        <span className={item.sentiment === 'Bullish' ? 'text-up' : 'text-down'}>{item.sentiment.toUpperCase()}</span>
                        <span className="text-muted">IMPACT: <b className="text-amber">{item.impact}</b></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
};

export default memo(WorldMap);
