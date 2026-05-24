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

const getDossier = (id) => {
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

  if (!id) return {
    name: 'Unknown Territory',
    gdp: 'Loading...', inflation: 'Loading...', interestRate: 'Not Available',
    currency: 'Not Available', stockIndex: 'Not Available',
    exports: 'Not Available', tradeDependency: 'Not Available',
    marketData: { movers: [] }
  };

  const name = countryNames[id] || `${id} Territory`;

  return {
    name, gdp: 'Loading...', inflation: 'Loading...', interestRate: 'Not Available',
    currency: 'Not Available', stockIndex: 'Not Available',
    exports: 'Not Available', tradeDependency: 'Not Available',
    marketData: { movers: [] }
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
              if (data.interestRate) updated.interestRate = data.interestRate;
              if (data.currency) updated.currency = data.currency;
              if (data.exports) updated.exports = data.exports;
              if (data.tradeDependency) updated.tradeDependency = data.tradeDependency;
              if (data.index) {
                const sign = data.index.change >= 0 ? '+' : '';
                const pctSign = data.index.changePercent >= 0 ? '+' : '';
                updated.stockIndex = `${data.index.name || updated.stockIndex} (${pctSign}${data.index.changePercent.toFixed(2)}% Live)`;
                
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
                  <span className="text-muted">National Currency:</span><span className="text-blue">{dossier.currency}</span>
                  <span className="text-muted">Primary Exports:</span><span style={{ fontSize: '9px' }}>{dossier.exports}</span>
                  <span className="text-muted">Trade Exposure:</span><span>{dossier.tradeDependency}</span>
                </div>
              </div>

              {/* Financial Market Data */}
              <div>
                <div className="dossier-section-title">Financial Market Data</div>
                <div style={{ marginBottom: '6px' }}>
                  <span className="text-muted">Equity Index: </span>
                  <span className="text-up" style={{ fontWeight: 'bold' }}>{dossier.stockIndex}</span>
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
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
};

export default memo(WorldMap);
