import React, { useEffect, useState, useRef } from 'react';
import Panel from '../Panel';
import { ApiService } from '../../services/api';
import { useStore } from '../../store';
import { generateIntelData } from './IntelDataGenerator';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LineChart,
  Line,
  BarChart,
  Bar
} from 'recharts';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Layers,
  Globe,
  Sliders,
  Shield,
  Users,
  Anchor,
  Zap,
  BarChart3,
  Link,
  ChevronDown,
  Target
} from 'lucide-react';

const CompanyIntel = () => {
  const ticker = useStore(state => state.activeTicker);
  const selectedModel = useStore(state => state.selectedModel);
  const [intel, setIntel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedSection, setExpandedSection] = useState('bull'); // bull, bear, moat, risk
  
  // Upgraded dossier scrolling states
  const scrollRef = useRef(null);
  const [activeLevel, setActiveLevel] = useState(1);
  const [scrollPercent, setScrollPercent] = useState(0);

  // Dynamic Scenario Engine States
  const [scenarioInput, setScenarioInput] = useState({
    inflation: 2.5,  // %
    rates: 4.5,      // %
    tariffs: 10.0,   // %
    demand: 5.0      // %
  });

  const levels = [
    { num: 1, name: "Executive Snapshot", desc: "Overview, Financial Metrics, Peer comparison" },
    { num: 2, name: "SEC Filings Intelligence", desc: "Risk shift heatmap & Exec relation graph" },
    { num: 3, name: "Forensic Financials", desc: "Altman Z, Financial DNA Sankey, Sensitivity" },
    { num: 4, name: "Smart Money Flows", desc: "Institutional ownership nodes & Whale tracking" },
    { num: 5, name: "Competitive Moat", desc: "Peer bubble positioning & Moat scorecard" },
    { num: 6, name: "Predictive AI Engine", desc: "Forecast bounds & Scenario simulator" }
  ];

  useEffect(() => {
    if (!ticker) return;
    let isMounted = true;
    
    const fetchData = async () => {
      setLoading(true);
      setIntel(null);
      try {
        const rawData = await ApiService.getCompanyIntel(ticker, selectedModel);
        // Augment with rich multi-level intelligence datasets
        const enrichedData = generateIntelData(ticker, rawData);
        if (isMounted) {
          setIntel(enrichedData);
          // Reset scroll parameters on ticker change
          setActiveLevel(1);
          setScrollPercent(0);
          if (scrollRef.current) {
            scrollRef.current.scrollTop = 0;
          }
        }
      } catch (e) {
        console.error("Failed to load company intelligence data", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchData();
    return () => { isMounted = false; };
  }, [ticker, selectedModel]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const sections = container.querySelectorAll('.intel-section');
    let currentActive = 1;
    let minDiff = Infinity;

    sections.forEach((section, index) => {
      const rect = section.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const diff = Math.abs(rect.top - containerRect.top);
      if (diff < minDiff) {
        minDiff = diff;
        currentActive = index + 1;
      }
    });

    setActiveLevel(currentActive);

    const maxScroll = container.scrollHeight - container.clientHeight;
    const percent = maxScroll > 0 ? (container.scrollTop / maxScroll) * 100 : 0;
    setScrollPercent(percent);
  };

  const scrollToSection = (levelNum) => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const target = container.querySelector(`#intel-level-${levelNum}`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveLevel(levelNum);
    }
  };

  if (loading || !intel) {
    return (
      <Panel title="COMPANY INTELLIGENCE DOSSIER">
        <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
          <div className="skeleton" style={{ width: '60%', height: '24px' }} />
          <div className="skeleton" style={{ width: '100%', height: '60px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <div className="skeleton" style={{ height: '50px' }} />
            <div className="skeleton" style={{ height: '50px' }} />
            <div className="skeleton" style={{ height: '50px' }} />
          </div>
          <div className="skeleton" style={{ flex: 1, minHeight: '100px' }} />
        </div>
      </Panel>
    );
  }

  const formatNum = (num) => {
    if (num === undefined || num === null) return 'N/A';
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const formatPercent = (val) => {
    if (val === undefined || val === null) return 'N/A';
    if (Math.abs(val) < 1) {
      return (val * 100).toFixed(2) + '%';
    }
    return val.toFixed(2) + '%';
  };

  // Scenario Simulator Math
  const getScenarioOutcomes = () => {
    const baseMCap = intel.snapshot.marketCap;
    const baseMargin = intel.financials.operatingMargin * 100; // in %
    const baseEPS = intel.financials.eps || 5.0;

    // Adjusting parameters based on sliders
    // Inflation pushes cost of goods up (contracts margins)
    const inflationImpact = (scenarioInput.inflation - 2.5) * -0.5;
    // Interest rates raise discounting (lowers multiple/target)
    const interestImpact = (scenarioInput.rates - 4.5) * -1.5;
    // Tariffs directly subtract from margin
    const tariffImpact = (scenarioInput.tariffs - 10.0) * -0.4;
    // Demand increases revenue and operating leverage
    const demandImpact = (scenarioInput.demand - 5.0) * 0.8;

    const simMargin = Math.max(5.0, baseMargin + inflationImpact + tariffImpact + (demandImpact * 0.3));
    const simEPS = Math.max(0.5, baseEPS * (simMargin / baseMargin) * (1 + (scenarioInput.demand - 5.0)/100));
    
    // Multiple compresses with rates and expands with demand
    const baseMultiple = intel.financials.peRatio || 25;
    const simMultiple = Math.max(8.0, baseMultiple + interestImpact + (scenarioInput.demand - 5.0) * 0.2);
    const simPrice = simEPS * simMultiple;

    return {
      margin: simMargin,
      eps: simEPS,
      priceTarget: simPrice
    };
  };

  const simulated = getScenarioOutcomes();

  return (
    <Panel title={`SEC INTELLIGENCE DOSSIER: ${ticker}`}>
      <div className="intel-wrapper">
        
        {/* Floating HUD Navigator */}
        <div className="hud-navigator">
          <div className="hud-track"></div>
          <div 
            className="hud-progress-bar" 
            style={{ height: `${Math.min(90, scrollPercent)}%` }}
          ></div>
          {levels.map((l) => (
            <div 
              key={l.num} 
              className={`hud-node-container ${activeLevel === l.num ? 'active' : ''}`}
              onClick={() => scrollToSection(l.num)}
            >
              <div className="hud-node"></div>
              <div className="hud-tooltip">
                <b>L{l.num}: {l.name}</b>
                <div style={{ color: 'var(--text-secondary)', fontSize: '7px' }}>{l.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Scrollable Intelligence Content */}
        <div 
          className="intel-scroller" 
          ref={scrollRef} 
          onScroll={handleScroll}
        >
          
          {/* ================= LEVEL 1: EXECUTIVE COMPANY OVERVIEW ================= */}
          <div className="intel-section" id="intel-level-1">
            <div className="intel-section-title-hud">LEVEL 1 — EXECUTIVE COMPANY OVERVIEW</div>
            
            {/* Header Metadata */}
            <div style={{ borderBottom: '1px solid var(--panel-border)', paddingBottom: '6px', marginBottom: '8px' }}>
              <div className="flex-between">
                <span style={{ fontSize: '9px', color: 'var(--accent-amber)', fontWeight: 'bold' }}>
                  {intel.sector.toUpperCase()} &gt; {intel.industry.toUpperCase()}
                </span>
                <span className="text-muted" style={{ fontSize: '9px' }}>
                  HQ: {intel.hq}
                </span>
              </div>
              <h2 style={{ margin: '4px 0', fontSize: '15px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                {intel.companyName}
              </h2>
              <div style={{ fontSize: '9px', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '4px' }}>
                {intel.description}
              </div>
              <div style={{ fontSize: '8px', color: 'var(--accent-blue)', marginTop: '2px' }}>
                <b>SUBSIDIARIES:</b> {intel.subsidiaries} | <b>GLOBAL REACH:</b> {intel.globalPresence}
              </div>
            </div>

            {/* Quick Financial Health Score Cards */}
            <div className="health-scores-grid">
              {[
                { label: 'Growth Score', val: intel.healthScores.growth, color: 'var(--accent-green)' },
                { label: 'Fin. Strength', val: intel.healthScores.strength, color: 'var(--accent-blue)' },
                { label: 'Profitability', val: intel.healthScores.profitability, color: 'var(--accent-amber)' },
                { label: 'Risk Factor', val: intel.healthScores.risk, color: 'var(--accent-red)' },
                { label: 'Valuation Multiple', val: intel.healthScores.valuation, color: 'var(--accent-amber)' },
                { label: 'Momentum Score', val: intel.healthScores.momentum, color: 'var(--accent-green)' }
              ].map((card, idx) => (
                <div className="health-card" key={idx}>
                  <div className="health-card-header">{card.label}</div>
                  <div className="health-card-value">
                    <span>{card.val}</span>
                    <span style={{ fontSize: '8px', color: 'var(--text-secondary)' }}>/ 100</span>
                  </div>
                  <div 
                    className="health-card-glow" 
                    style={{ width: `${card.val}%`, backgroundColor: card.color, boxShadow: `0 0 4px ${card.color}` }}
                  />
                </div>
              ))}
            </div>

            {/* Fundamentals & Multiples Grid */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--accent-amber)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Core Valuations & Margins
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                <div style={{ padding: '4px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--panel-border)' }}>
                  <div className="text-muted" style={{ fontSize: '8px' }}>MARKET CAP</div>
                  <div style={{ fontSize: '10px', fontWeight: 'bold' }}>${formatNum(intel.snapshot.marketCap)}</div>
                </div>
                <div style={{ padding: '4px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--panel-border)' }}>
                  <div className="text-muted" style={{ fontSize: '8px' }}>P/E RATIO</div>
                  <div style={{ fontSize: '10px', fontWeight: 'bold' }}>{intel.financials.peRatio?.toFixed(2)}</div>
                </div>
                <div style={{ padding: '4px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--panel-border)' }}>
                  <div className="text-muted" style={{ fontSize: '8px' }}>PEG RATIO</div>
                  <div style={{ fontSize: '10px', fontWeight: 'bold' }}>{intel.financials.pegRatio?.toFixed(2)}</div>
                </div>
                <div style={{ padding: '4px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--panel-border)' }}>
                  <div className="text-muted" style={{ fontSize: '8px' }}>EV / EBITDA</div>
                  <div style={{ fontSize: '10px', fontWeight: 'bold' }}>{intel.financials.evEbitda?.toFixed(2)}</div>
                </div>
                <div style={{ padding: '4px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--panel-border)' }}>
                  <div className="text-muted" style={{ fontSize: '8px' }}>PRICE / SALES</div>
                  <div style={{ fontSize: '10px', fontWeight: 'bold' }}>{intel.financials.priceSales?.toFixed(2)}</div>
                </div>
                <div style={{ padding: '4px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--panel-border)' }}>
                  <div className="text-muted" style={{ fontSize: '8px' }}>DEBT / EQUITY</div>
                  <div style={{ fontSize: '10px', fontWeight: 'bold', color: intel.financials.debtEquity > 1.5 ? 'var(--status-down)' : 'var(--text-primary)' }}>
                    {intel.financials.debtEquity?.toFixed(2)}
                  </div>
                </div>
                <div style={{ padding: '4px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--panel-border)' }}>
                  <div className="text-muted" style={{ fontSize: '8px' }}>REVENUE YoY</div>
                  <div className="text-up" style={{ fontSize: '10px', fontWeight: 'bold' }}>+{formatPercent(intel.financials.revenueGrowth)}</div>
                </div>
                <div style={{ padding: '4px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--panel-border)' }}>
                  <div className="text-muted" style={{ fontSize: '8px' }}>OPER. MARGIN</div>
                  <div style={{ fontSize: '10px', fontWeight: 'bold' }}>{formatPercent(intel.financials.operatingMargin)}</div>
                </div>
                <div style={{ padding: '4px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--panel-border)' }}>
                  <div className="text-muted" style={{ fontSize: '8px' }}>FREE CASH FLOW</div>
                  <div style={{ fontSize: '10px', fontWeight: 'bold' }}>${formatNum(intel.financials.freeCashFlow)}</div>
                </div>
              </div>
            </div>

            {/* Peer Comparison */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--accent-amber)', marginBottom: '4px', textTransform: 'uppercase' }}>
                Peer Comparison Matrix
              </div>
              <table className="data-table" style={{ fontSize: '9px' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Ticker</th>
                    <th>Price</th>
                    <th>P/E</th>
                    <th>Oper. Margin</th>
                    <th>YoY Growth</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ textAlign: 'left', fontWeight: 'bold', color: 'var(--accent-blue)' }}>{ticker}</td>
                    <td style={{ fontWeight: '600' }}>${intel.competitors?.currentPrice?.toFixed(2) || '0.00'}</td>
                    <td>{intel.financials?.peRatio?.toFixed(1) || '0.0'}</td>
                    <td>{formatPercent(intel.financials?.operatingMargin)}</td>
                    <td className="text-up">+{formatPercent(intel.financials?.revenueGrowth)}</td>
                  </tr>
                  <tr style={{ color: 'var(--text-secondary)' }}>
                    <td style={{ textAlign: 'left', fontWeight: 'bold' }}>{intel.competitors?.peerSymbol || 'PEER'}</td>
                    <td>${intel.competitors?.peerPrice?.toFixed(2) || '0.00'}</td>
                    <td>{intel.competitors?.peerPe?.toFixed(1) || '0.0'}</td>
                    <td>{intel.competitors?.peerMargin || '0.0%'}</td>
                    <td className="text-up">+{intel.competitors?.peerGrowth || '0.0%'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Executive Intelligence Profiles */}
            <div style={{ marginBottom: '8.5px', border: '1px solid var(--panel-border)', padding: '6px', background: 'rgba(255,255,255,0.01)' }}>
              <div style={{ fontSize: '8.5px', color: 'var(--accent-amber)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '3px' }}>
                Executive Profiles & Compensation ($ Millions)
              </div>
              <div style={{ fontSize: '8px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                <b>CEO PROFILE:</b> {intel.execIntel.ceoProfile}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8px', marginBottom: '4px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--panel-border)', color: 'var(--text-secondary)' }}>
                    <th style={{ textTransform: 'uppercase', textAlign: 'left', padding: '2px 0' }}>Officer</th>
                    <th style={{ textAlign: 'right' }}>Salary</th>
                    <th style={{ textAlign: 'right' }}>Stock Awards</th>
                    <th style={{ textAlign: 'right' }}>Bonus/Non-Eq</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(intel.execIntel.execComp || []).map((exec, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                      <td style={{ textAlign: 'left', padding: '2px 0', fontWeight: 'bold' }}>{exec.name}</td>
                      <td style={{ textAlign: 'right' }}>${exec.salary.toFixed(1)}M</td>
                      <td style={{ textAlign: 'right', color: 'var(--accent-blue)' }}>${exec.stockAwards.toFixed(1)}M</td>
                      <td style={{ textAlign: 'right' }}>${exec.nonEquity.toFixed(1)}M</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--accent-amber)' }}>${exec.total.toFixed(1)}M</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ fontSize: '8px', color: 'var(--text-secondary)', lineHeight: '1.3' }}>
                <b>INSIDER OWNERSHIP:</b> {intel.execIntel.insiderPct} <br />
                <b>BOARD MEMBERS NETWORK:</b> {intel.execIntel.boardNetwork} <br />
                <b>RECENT CHANGES:</b> {intel.execIntel.keyMgmtChanges}
              </div>
            </div>

            {/* AI Research Dossier (Tabs) */}
            <div>
              <div style={{ display: 'flex', borderBottom: '1px solid var(--panel-border)', marginBottom: '4px' }}>
                {['bull', 'bear', 'moat', 'exposure'].map(tab => (
                  <button 
                    key={tab}
                    onClick={() => setExpandedSection(tab)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: expandedSection === tab ? (tab === 'bull' ? 'var(--accent-green)' : tab === 'bear' ? 'var(--accent-red)' : tab === 'moat' ? 'var(--accent-amber)' : 'var(--accent-blue)') : 'var(--text-secondary)',
                      fontSize: '8px',
                      fontWeight: 'bold',
                      padding: '4px 8px',
                      cursor: 'pointer',
                      borderBottom: expandedSection === tab ? `2px solid ${tab === 'bull' ? 'var(--accent-green)' : tab === 'bear' ? 'var(--accent-red)' : tab === 'moat' ? 'var(--accent-amber)' : 'var(--accent-blue)'}` : 'none'
                    }}
                  >
                    {tab.toUpperCase()} DOSSIER
                  </button>
                ))}
              </div>
              <div style={{ 
                padding: '6px', 
                background: 'rgba(255,255,255,0.01)', 
                border: '1px solid var(--panel-border)', 
                fontSize: '9px', 
                lineHeight: '1.4', 
                color: 'var(--text-primary)',
                minHeight: '44px' 
              }}>
                {expandedSection === 'bull' && (
                  <div style={{ borderLeft: '2px solid var(--accent-green)', paddingLeft: '6px' }}>{intel.aiDossier.bullCase}</div>
                )}
                {expandedSection === 'bear' && (
                  <div style={{ borderLeft: '2px solid var(--accent-red)', paddingLeft: '6px' }}>{intel.aiDossier.bearCase}</div>
                )}
                {expandedSection === 'moat' && (
                  <div style={{ borderLeft: '2px solid var(--accent-amber)', paddingLeft: '6px' }}>{intel.aiDossier.moat}</div>
                )}
                {expandedSection === 'exposure' && (
                  <div style={{ borderLeft: '2px solid var(--accent-blue)', paddingLeft: '6px' }}>
                    <div><strong>Geographic Rev:</strong> {intel.aiDossier.geographicExposure}</div>
                    <div style={{ marginTop: '3px' }}><strong>Logistics:</strong> {intel.aiDossier.supplyChainRisk}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Shareholder & Insider Transactions */}
            <div style={{ marginTop: '8px' }}>
              <div className="flex-between" style={{ marginBottom: '4px' }}>
                <span style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--accent-amber)', textTransform: 'uppercase' }}>
                  Ownership & Insider Transactions
                </span>
                <span className="text-muted" style={{ fontSize: '8px' }}>
                  Inst: <b>{intel.ownership.institutionalPct}</b> | Ins: <b>{intel.ownership.insiderPct}</b> | Ret: <b>{intel.ownership.retailPct}</b>
                </span>
              </div>
              <table className="data-table" style={{ fontSize: '9px' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Filer Name</th>
                    <th>Relation</th>
                    <th>Date</th>
                    <th>Action</th>
                    <th>Shares</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {(intel.ownership.insiderTransactions || []).map((tx, idx) => (
                    <tr key={idx}>
                      <td style={{ textAlign: 'left', fontWeight: 'bold' }}>{tx.filerName}</td>
                      <td className="text-muted">{tx.relation}</td>
                      <td>{tx.transactionDate}</td>
                      <td style={{ 
                        fontWeight: 'bold', 
                        color: tx.transactionType === 'BUY' ? 'var(--status-up)' : 'var(--status-down)' 
                      }}>
                        {tx.transactionType}
                      </td>
                      <td>{tx.shares.toLocaleString()}</td>
                      <td style={{ fontWeight: '600' }}>${formatNum(tx.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>

          {/* ================= LEVEL 2: ADVANCED SEC FILINGS INTELLIGENCE ================= */}
          <div className="intel-section" id="intel-level-2">
            <div className="intel-section-title-hud">LEVEL 2 — ADVANCED SEC FILINGS INTELLIGENCE</div>
            
            {/* AI Text Summaries */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '9px', marginBottom: '8px' }}>
              <div style={{ background: 'rgba(255, 51, 51, 0.03)', border: '1px solid rgba(255, 51, 51, 0.1)', padding: '5px', borderRadius: '2px' }}>
                <span style={{ color: 'var(--accent-red)', fontWeight: 'bold' }}>[HIDDEN RISK COMPLIANCE] </span>
                {intel.filings.hiddenRisks}
              </div>
              <div style={{ background: 'rgba(0, 170, 255, 0.03)', border: '1px solid rgba(0, 170, 255, 0.1)', padding: '5px', borderRadius: '2px' }}>
                <span style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>[ACCOUNTING ESTIMATES UPDATE] </span>
                {intel.filings.accountingChanges}
              </div>
              <div style={{ background: 'rgba(255, 176, 0, 0.03)', border: '1px solid rgba(255, 176, 0, 0.1)', padding: '5px', borderRadius: '2px' }}>
                <span style={{ color: 'var(--accent-amber)', fontWeight: 'bold' }}>[LEGAL / REGULATORY EXPOSURE] </span>
                {intel.filings.legalExposures}
              </div>
              <div style={{ fontSize: '8px', color: 'var(--text-secondary)', borderTop: '1px solid var(--panel-border)', paddingTop: '4px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                <div><b>WORDING SHIFTS:</b> {intel.filings.wordingShifts}</div>
                <div><b>SENTIMENT INDEX:</b> {intel.filings.sentimentChange}</div>
                <div><b>FOOTNOTE ANOMALIES:</b> {intel.filings.footnoteAnomalies}</div>
                <div><b>RISK FACTOR INDEX:</b> {intel.filings.riskFactorEvolution}</div>
              </div>
            </div>

            {/* Wording Change Heatmap */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '8.5px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                Quarter-Over-Quarter SEC Language Shifts
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
                {(intel.heatmap || []).map((cell, idx) => (
                  <div 
                    key={idx} 
                    className="heatmap-cell"
                    style={{ border: `1px solid ${cell.shift !== 0 ? cell.color : 'var(--panel-border)'}`, background: `rgba(255,255,255,0.01)` }}
                  >
                    <div style={{ fontSize: '7.5px', color: cell.color, fontWeight: 'bold' }}>
                      {cell.shift > 0 ? `+${cell.shift}%` : cell.shift === 0 ? '0%' : `${cell.shift}%`}
                    </div>
                    <div style={{ fontSize: '6px', color: 'var(--text-primary)', marginTop: '2px', lineHeight: '1.1' }}>
                      {cell.label}
                    </div>
                    <div style={{ fontSize: '5px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginTop: '1px' }}>
                      {cell.category}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Executive Mention Network Graph (Interactive SVG) */}
            <div>
              <div style={{ fontSize: '8.5px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                Executive & Corporate Mention Relationship Network
              </div>
              <div style={{ border: '1px solid var(--panel-border)', background: '#050505', position: 'relative', height: '140px' }}>
                <svg width="100%" height="100%" viewBox="0 0 320 140" style={{ display: 'block' }}>
                  {/* Draw Connections */}
                  {(() => {
                    const width = 320;
                    const height = 140;
                    const cX = width / 2;
                    const cY = height / 2;
                    const numNodes = intel.execMentionNetwork.nodes.length - 1;
                    
                    return (intel.execMentionNetwork.nodes || []).map((node, idx) => {
                      if (node.group === 'company') return null;
                      // Calculate position around a circle
                      const angle = ((idx - 1) * (2 * Math.PI)) / numNodes;
                      const nX = cX + 110 * Math.cos(angle);
                      const nY = cY + 45 * Math.sin(angle);
                      
                      const link = intel.execMentionNetwork.links.find(
                        l => l.target === node.id || l.source === node.id
                      );
                      const relLabel = link ? link.rel : '';
                      
                      return (
                        <g key={`l-${idx}`}>
                          {/* Animated flow particle path */}
                          <path 
                            d={`M ${cX} ${cY} L ${nX} ${nY}`} 
                            stroke="rgba(0, 170, 255, 0.15)" 
                            strokeWidth="1"
                          />
                          <path 
                            d={`M ${cX} ${cY} L ${nX} ${nY}`} 
                            stroke="var(--accent-blue)" 
                            strokeWidth="1.5" 
                            strokeDasharray="4,15"
                            className="flow-particle"
                          />
                          {/* Text on line */}
                          <text 
                            x={(cX + nX) / 2} 
                            y={(cY + nY) / 2 - 2} 
                            fill="var(--text-secondary)" 
                            fontSize="5px" 
                            textAnchor="middle"
                            fontFamily="var(--font-mono)"
                          >
                            {relLabel.substring(0, 12)}
                          </text>
                        </g>
                      );
                    });
                  })()}

                  {/* Draw Nodes */}
                  {(() => {
                    const width = 320;
                    const height = 140;
                    const cX = width / 2;
                    const cY = height / 2;
                    const numNodes = intel.execMentionNetwork.nodes.length - 1;

                    return (intel.execMentionNetwork.nodes || []).map((node, idx) => {
                      let x = cX;
                      let y = cY;
                      let color = "var(--accent-amber)";
                      
                      if (node.group !== 'company') {
                        const angle = ((idx - 1) * (2 * Math.PI)) / numNodes;
                        x = cX + 110 * Math.cos(angle);
                        y = cY + 45 * Math.sin(angle);
                        
                        if (node.group === 'executive') color = "var(--accent-blue)";
                        else if (node.group === 'supplier') color = "var(--accent-red)";
                        else if (node.group === 'holder') color = "var(--accent-green)";
                        else color = "var(--text-secondary)";
                      }
                      
                      return (
                        <g key={`n-${idx}`} className="network-node" style={{ cursor: 'pointer' }}>
                          <circle 
                            cx={x} 
                            cy={y} 
                            r={node.group === 'company' ? 10 : 5} 
                            fill="#111" 
                            stroke={color} 
                            strokeWidth="1.5"
                          />
                          <text 
                            x={x} 
                            y={y + (node.group === 'company' ? 16 : 10)} 
                            fill="var(--text-primary)" 
                            fontSize="6.5px" 
                            fontWeight={node.group === 'company' ? 'bold' : 'normal'}
                            textAnchor="middle"
                            fontFamily="var(--font-mono)"
                          >
                            {node.label}
                          </text>
                        </g>
                      );
                    });
                  })()}
                </svg>
              </div>
            </div>

          </div>

          {/* ================= LEVEL 3: FORENSIC FINANCIAL ANALYSIS ================= */}
          <div className="intel-section" id="intel-level-3">
            <div className="intel-section-title-hud">LEVEL 3 — FORENSIC FINANCIAL ANALYSIS</div>
            
            {/* Forensic Scores */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', marginBottom: '8px' }}>
              <div style={{ padding: '5px', border: '1px solid var(--panel-border)', background: 'rgba(255,255,255,0.01)' }}>
                <div className="flex-between">
                  <span className="text-muted" style={{ fontSize: '7px' }}>ALTMAN Z-SCORE</span>
                  <span style={{ 
                    fontSize: '8px', 
                    fontWeight: 'bold', 
                    color: intel.forensics.altmanZ > 3.0 ? 'var(--accent-green)' : intel.forensics.altmanZ > 1.8 ? 'var(--accent-amber)' : 'var(--accent-red)' 
                  }}>
                    {intel.forensics.altmanZ > 3.0 ? 'SAFE' : intel.forensics.altmanZ > 1.8 ? 'GREY' : 'DISTRESS'}
                  </span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', margin: '2px 0' }}>{intel.forensics.altmanZ}</div>
                <div style={{ height: '3px', background: '#222', width: '100%', borderRadius: '1.5px', overflow: 'hidden' }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${Math.min(100, (intel.forensics.altmanZ / 10) * 100)}%`, 
                    backgroundColor: intel.forensics.altmanZ > 3.0 ? 'var(--accent-green)' : 'var(--accent-amber)' 
                  }}/>
                </div>
              </div>

              <div style={{ padding: '5px', border: '1px solid var(--panel-border)', background: 'rgba(255,255,255,0.01)' }}>
                <div className="flex-between">
                  <span className="text-muted" style={{ fontSize: '7px' }}>BENEISH M-SCORE</span>
                  <span style={{ 
                    fontSize: '8px', 
                    fontWeight: 'bold', 
                    color: intel.forensics.beneishM < -1.78 ? 'var(--accent-green)' : 'var(--accent-red)' 
                  }}>
                    {intel.forensics.beneishM < -1.78 ? 'SAFE' : 'RISK'}
                  </span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', margin: '2px 0' }}>{intel.forensics.beneishM}</div>
                <div style={{ height: '3px', background: '#222', width: '100%', borderRadius: '1.5px', overflow: 'hidden' }}>
                  {/* Beneish goes from -4 to 0 usually. If it's more negative it is safer. */}
                  <div style={{ 
                    height: '100%', 
                    width: `${Math.max(10, Math.min(100, ((intel.forensics.beneishM + 4) / 4) * 100))}%`, 
                    backgroundColor: intel.forensics.beneishM < -1.78 ? 'var(--accent-green)' : 'var(--accent-red)' 
                  }}/>
                </div>
              </div>

              <div style={{ padding: '5px', border: '1px solid var(--panel-border)', background: 'rgba(255,255,255,0.01)' }}>
                <div className="flex-between">
                  <span className="text-muted" style={{ fontSize: '7px' }}>PIOTROSKI F-SCORE</span>
                  <span style={{ fontSize: '8px', color: 'var(--text-secondary)' }}>MAX 9</span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', margin: '2px 0' }}>{intel.forensics.piotroskiF} <span style={{ fontSize: '8px', color: 'var(--text-secondary)' }}>/ 9</span></div>
                <div style={{ height: '3px', background: '#222', width: '100%', borderRadius: '1.5px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(intel.forensics.piotroskiF / 9) * 100}%`, backgroundColor: 'var(--accent-amber)' }}/>
                </div>
              </div>
            </div>

            <div style={{ fontSize: '8.5px', color: 'var(--text-secondary)', lineHeight: '1.3', marginBottom: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <div><b>MANIPULATION RISK:</b> {intel.forensics.manipulationProb}</div>
              <div><b>BANKRUPTCY PROB:</b> {intel.forensics.bankruptcyProb}</div>
              <div><b>MARGIN DURABILITY:</b> {intel.forensics.marginDurability}</div>
              <div><b>DEBT STRESS:</b> {intel.forensics.debtStress}</div>
              <div><b>REVENUE FOCUS:</b> {intel.forensics.revenueConcentration}</div>
              <div><b>CLIENT CONCENTRATION:</b> {intel.forensics.customerConcentration}</div>
            </div>

            {/* Financial DNA Visual Flow (Sankey SVG) */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '8.5px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                Financial DNA: Capital Resource & Cost Flow Engine
              </div>
              <div style={{ border: '1px solid var(--panel-border)', background: '#050505', padding: '4px', height: '140px' }}>
                <svg width="100%" height="100%" viewBox="0 0 320 130" style={{ display: 'block' }}>
                  {/* Connections */}
                  {(() => {
                    const flows = [
                      // Revenue to Gross Profit & COGS
                      { d: "M 15 50 C 70 50, 70 30, 110 30", color: "var(--accent-amber)" }, // Revenue -> Gross Profit
                      { d: "M 15 50 C 70 50, 70 90, 110 90", color: "var(--accent-red)" },  // Revenue -> COGS
                      // Gross Profit to Operating Income & OpEx
                      { d: "M 175 30 C 200 30, 205 20, 230 20", color: "var(--accent-green)" }, // GP -> OpIncome
                      { d: "M 175 30 C 200 30, 205 60, 230 60", color: "var(--accent-red)" },   // GP -> OpEx
                      // OpEx to R&D and SG&A
                      { d: "M 270 60 C 280 60, 285 50, 295 50", color: "var(--accent-blue)" },  // OpEx -> R&D
                      { d: "M 270 60 C 280 60, 285 75, 295 75", color: "var(--text-secondary)" }, // OpEx -> SG&A
                      // Op Income to Net Income & Tax
                      { d: "M 270 20 C 280 20, 285 10, 295 10", color: "var(--accent-green)" }, // OpInc -> Net Income
                      { d: "M 270 20 C 280 20, 285 30, 295 30", color: "var(--accent-amber)" }  // OpInc -> Tax
                    ];

                    return flows.map((f, idx) => (
                      <g key={idx}>
                        <path d={f.d} fill="none" stroke={f.color} strokeWidth="3" opacity="0.12" />
                        <path d={f.d} fill="none" stroke={f.color} strokeWidth="1" strokeDasharray="3,15" className="flow-particle" />
                      </g>
                    ));
                  })()}

                  {/* Nodes */}
                  {/* Left Column */}
                  <g>
                    <rect x="5" y="40" width="55" height="20" className="sankey-node-rect" stroke="var(--accent-amber)" />
                    <text x="32" y="50" fill="var(--text-primary)" fontSize="6.5px" textAnchor="middle" dominantBaseline="middle" fontFamily="var(--font-mono)" fontWeight="bold">REV</text>
                    <text x="32" y="56" fill="var(--text-secondary)" fontSize="5.5px" textAnchor="middle" dominantBaseline="middle" fontFamily="var(--font-mono)">${formatNum(intel.financialDna.revenue * 1000000)}</text>
                  </g>

                  {/* Middle Column */}
                  <g>
                    <rect x="110" y="20" width="65" height="20" className="sankey-node-rect" stroke="var(--accent-green)" />
                    <text x="142" y="30" fill="var(--text-primary)" fontSize="6.5px" textAnchor="middle" dominantBaseline="middle" fontFamily="var(--font-mono)" fontWeight="bold">GROSS PROFIT</text>
                    <text x="142" y="36" fill="var(--accent-green)" fontSize="5.5px" textAnchor="middle" dominantBaseline="middle" fontFamily="var(--font-mono)">${formatNum(intel.financialDna.grossProfit * 1000000)}</text>
                  </g>
                  <g>
                    <rect x="110" y="80" width="65" height="20" className="sankey-node-rect" stroke="var(--accent-red)" />
                    <text x="142" y="90" fill="var(--text-primary)" fontSize="6.5px" textAnchor="middle" dominantBaseline="middle" fontFamily="var(--font-mono)" fontWeight="bold">COGS (COSTS)</text>
                    <text x="142" y="96" fill="var(--accent-red)" fontSize="5.5px" textAnchor="middle" dominantBaseline="middle" fontFamily="var(--font-mono)">-${formatNum(intel.financialDna.cogs * 1000000)}</text>
                  </g>

                  {/* Right Column */}
                  <g>
                    <rect x="230" y="10" width="40" height="20" className="sankey-node-rect" stroke="var(--accent-green)" />
                    <text x="250" y="20" fill="var(--text-primary)" fontSize="6.5px" textAnchor="middle" dominantBaseline="middle" fontFamily="var(--font-mono)" fontWeight="bold">OP INC</text>
                    <text x="250" y="26" fill="var(--text-secondary)" fontSize="5px" textAnchor="middle" dominantBaseline="middle" fontFamily="var(--font-mono)">${formatNum(intel.financialDna.operatingIncome * 1000000)}</text>
                  </g>
                  <g>
                    <rect x="230" y="50" width="40" height="20" className="sankey-node-rect" stroke="var(--accent-red)" />
                    <text x="250" y="60" fill="var(--text-primary)" fontSize="6.5px" textAnchor="middle" dominantBaseline="middle" fontFamily="var(--font-mono)" fontWeight="bold">OPEX</text>
                    <text x="250" y="66" fill="var(--text-secondary)" fontSize="5px" textAnchor="middle" dominantBaseline="middle" fontFamily="var(--font-mono)">-${formatNum(intel.financialDna.opex * 1000000)}</text>
                  </g>

                  {/* Far Right Column */}
                  <g>
                    <rect x="295" y="2" width="20" height="15" className="sankey-node-rect" stroke="var(--accent-green)" />
                    <text x="305" y="8" fill="var(--status-up)" fontSize="6px" textAnchor="middle" dominantBaseline="middle" fontFamily="var(--font-mono)" fontWeight="bold">NET</text>
                    <text x="305" y="13" fill="var(--text-primary)" fontSize="4.5px" textAnchor="middle" dominantBaseline="middle" fontFamily="var(--font-mono)">${formatNum(intel.financialDna.netIncome * 1000000)}</text>
                  </g>
                  <g>
                    <rect x="295" y="22" width="20" height="15" className="sankey-node-rect" stroke="var(--accent-amber)" />
                    <text x="305" y="28" fill="var(--text-primary)" fontSize="5px" textAnchor="middle" dominantBaseline="middle" fontFamily="var(--font-mono)">TAX</text>
                    <text x="305" y="33" fill="var(--text-secondary)" fontSize="4.5px" textAnchor="middle" dominantBaseline="middle" fontFamily="var(--font-mono)">-${formatNum(intel.financialDna.tax * 1000000)}</text>
                  </g>
                  <g>
                    <rect x="295" y="42" width="20" height="15" className="sankey-node-rect" stroke="var(--accent-blue)" />
                    <text x="305" y="48" fill="var(--text-primary)" fontSize="5px" textAnchor="middle" dominantBaseline="middle" fontFamily="var(--font-mono)">R&D</text>
                    <text x="305" y="53" fill="var(--accent-blue)" fontSize="4.5px" textAnchor="middle" dominantBaseline="middle" fontFamily="var(--font-mono)">${formatNum(intel.financialDna.rnd * 1000000)}</text>
                  </g>
                  <g>
                    <rect x="295" y="68" width="20" height="15" className="sankey-node-rect" stroke="var(--text-secondary)" />
                    <text x="305" y="74" fill="var(--text-primary)" fontSize="5px" textAnchor="middle" dominantBaseline="middle" fontFamily="var(--font-mono)">SGA</text>
                    <text x="305" y="79" fill="var(--text-secondary)" fontSize="4.5px" textAnchor="middle" dominantBaseline="middle" fontFamily="var(--font-mono)">${formatNum(intel.financialDna.sga * 1000000)}</text>
                  </g>
                </svg>
              </div>
            </div>

            {/* 10-Year Evolution Chart */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '8.5px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                Historical Financial Evolution ($ Millions)
              </div>
              <div style={{ border: '1px solid var(--panel-border)', background: '#050505', padding: '6px', height: '110px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={(() => {
                      const incomeHistory = intel.financialStatements?.incomeStatements || [];
                      // Reverse to go from oldest to newest (index 0 is usually the most recent)
                      return [...incomeHistory].reverse().map(s => {
                        const date = new Date(s.endDate);
                        const yearNum = !isNaN(date.getTime()) ? date.getFullYear().toString() : 'N/A';
                        return {
                          year: yearNum,
                          Revenue: Math.round((s.totalRevenue || 0) / 1000000),
                          NetIncome: Math.round((s.netIncome || 0) / 1000000)
                        };
                      });
                    })()}
                    margin={{ top: 2, right: 5, left: -25, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent-amber)" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="var(--accent-amber)" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent-green)" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="var(--accent-green)" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="year" stroke="#444" style={{ fontSize: '7px', fontFamily: 'var(--font-mono)' }} />
                    <YAxis stroke="#444" style={{ fontSize: '7px', fontFamily: 'var(--font-mono)' }} />
                    <Tooltip 
                      contentStyle={{ background: '#0a0a0a', border: '1px solid var(--panel-border)', fontSize: '8px', fontFamily: 'var(--font-mono)' }}
                      labelStyle={{ color: 'var(--accent-amber)', fontWeight: 'bold' }}
                    />
                    <Legend iconSize={6} wrapperStyle={{ fontSize: '7.5px', fontFamily: 'var(--font-mono)', marginTop: '-8px' }} />
                    <Area type="monotone" dataKey="Revenue" stroke="var(--accent-amber)" strokeWidth={1.5} fillOpacity={1} fill="url(#colorRev)" />
                    <Area type="monotone" dataKey="NetIncome" stroke="var(--accent-green)" strokeWidth={1.5} fillOpacity={1} fill="url(#colorNet)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Valuation Sensitivity Matrix Heatmap */}
            <div>
              <div className="flex-between" style={{ marginBottom: '4px' }}>
                <span style={{ fontSize: '8.5px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Valuation Sensitivity Matrix
                </span>
                <span className="text-muted" style={{ fontSize: '7.5px' }}>
                  Variable: Discount Rate vs Growth Rate (Implied P/E Multiple)
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '40px repeat(5, 1fr)', gap: '2px', textAlign: 'center', fontSize: '7.5px' }}>
                {/* Header cell */}
                <div style={{ color: 'var(--text-secondary)', fontWeight: 'bold', borderRight: '1px solid var(--panel-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>WACC / g</div>
                
                {/* Column Headers (Growth Rates) */}
                {(intel.valuationSensitivity.colValues || []).map((g, idx) => (
                  <div key={idx} style={{ color: 'var(--accent-blue)', fontWeight: 'bold', background: 'rgba(255,255,255,0.02)', padding: '2px 0' }}>
                    {g}%
                  </div>
                ))}

                {/* Grid Rows */}
                {((intel.valuationSensitivity.rowValues || [])).map((wacc, rowIdx) => (
                  <React.Fragment key={rowIdx}>
                    {/* Row Header (Discount Rates) */}
                    <div style={{ color: 'var(--accent-amber)', fontWeight: 'bold', background: 'rgba(255,255,255,0.02)', borderRight: '1px solid var(--panel-border)', padding: '4px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {wacc}%
                    </div>
                    {/* Heatmap Cells */}
                    {((intel.valuationSensitivity.matrix || [])[rowIdx] || []).map((peVal, colIdx) => {
                      // Color scale: lower P/E (low growth/high rates) -> dark, higher P/E -> brighter gold/amber
                      const maxVal = 50.0;
                      const ratio = Math.min(1.0, peVal / maxVal);
                      const bg = `rgba(255, 176, 0, ${0.05 + ratio * 0.35})`;
                      const fontCol = peVal > 30 ? '#fff' : 'var(--text-primary)';
                      return (
                        <div 
                          key={colIdx} 
                          className="heatmap-cell"
                          style={{
                            background: bg,
                            color: fontCol,
                            padding: '3px 0',
                            borderRadius: '1px',
                            minHeight: '20px',
                            fontWeight: '600',
                            fontSize: '8px'
                          }}
                          title={`WACC: ${wacc}% | Growth: ${intel.valuationSensitivity.colValues[colIdx]}% -> Implied P/E: ${peVal}x`}
                        >
                          {peVal.toFixed(1)}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>

          </div>

          {/* ================= LEVEL 4: INSTITUTIONAL OWNERSHIP INTELLIGENCE ================= */}
          <div className="intel-section" id="intel-level-4">
            <div className="intel-section-title-hud">LEVEL 4 — INSTITUTIONAL OWNERSHIP INTELLIGENCE</div>
            
            {/* Smart Money Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '9px', marginBottom: '8px' }}>
              <div style={{ border: '1px solid var(--panel-border)', padding: '5px', background: 'rgba(255,255,255,0.01)' }}>
                <span className="text-muted" style={{ fontSize: '7.5px' }}>INSTITUTIONAL POSITIONING</span>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--accent-green)', marginTop: '2px' }}>
                  {intel.smartMoney.instChange}
                </div>
              </div>
              <div style={{ border: '1px solid var(--panel-border)', padding: '5px', background: 'rgba(255,255,255,0.01)' }}>
                <span className="text-muted" style={{ fontSize: '7.5px' }}>HEDGE FUND ACCUMULATION INDEX</span>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--accent-amber)', marginTop: '2px' }}>
                  {intel.smartMoney.hedgeFundIndex} <span style={{ fontSize: '7px', fontWeight: 'normal', color: 'var(--text-secondary)' }}>/ 100</span>
                </div>
              </div>
              <div style={{ border: '1px solid var(--panel-border)', padding: '5px', background: 'rgba(255,255,255,0.01)' }}>
                <span className="text-muted" style={{ fontSize: '7.5px' }}>INSIDER TRANSACTION RATE</span>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--accent-red)', marginTop: '2px' }}>
                  {intel.smartMoney.insiderVolume}
                </div>
              </div>
              <div style={{ border: '1px solid var(--panel-border)', padding: '5px', background: 'rgba(255,255,255,0.01)' }}>
                <span className="text-muted" style={{ fontSize: '7.5px' }}>PORTFOLIO OVERLAP RATIO</span>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--accent-blue)', marginTop: '2px' }}>
                  {intel.smartMoney.fundOverlap}
                </div>
              </div>
            </div>

            <div style={{ fontSize: '8px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              <b>WHALE ACCUMULATION SUMMARY:</b> {intel.smartMoney.whalePositioning}
            </div>

            {/* Ownership Network Map (Interactive SVG) */}
            <div>
              <div style={{ fontSize: '8.5px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                Major Institutional Holders Network Graph
              </div>
              <div style={{ border: '1px solid var(--panel-border)', background: '#050505', position: 'relative', height: '140px' }}>
                <svg width="100%" height="100%" viewBox="0 0 320 140" style={{ display: 'block' }}>
                  {/* Connections */}
                  {(() => {
                    const width = 320;
                    const height = 140;
                    const cX = width / 2;
                    const cY = height / 2;
                    const numNodes = intel.ownershipNetwork.nodes.length - 1;

                    return (intel.ownershipNetwork.nodes || []).map((node, idx) => {
                      if (node.group === 'center') return null;
                      const angle = ((idx - 1) * (2 * Math.PI)) / numNodes;
                      const nX = cX + 105 * Math.cos(angle);
                      const nY = cY + 45 * Math.sin(angle);
                      
                      const link = intel.ownershipNetwork.links.find(
                        l => l.source === node.id || l.target === node.id
                      );
                      const weight = link ? link.weight : 1;

                      return (
                        <g key={`ol-${idx}`}>
                          <line 
                            x1={cX} y1={cY} x2={nX} y2={nY} 
                            stroke="rgba(0, 255, 102, 0.15)" 
                            strokeWidth={Math.min(5, weight / 1.5)}
                          />
                          <circle 
                            cx={(cX + nX)/2} 
                            cy={(cY + nY)/2} 
                            r="1" 
                            fill="var(--accent-green)"
                          />
                        </g>
                      );
                    });
                  })()}

                  {/* Nodes */}
                  {(() => {
                    const width = 320;
                    const height = 140;
                    const cX = width / 2;
                    const cY = height / 2;
                    const numNodes = intel.ownershipNetwork.nodes.length - 1;

                    return (intel.ownershipNetwork.nodes || []).map((node, idx) => {
                      let x = cX;
                      let y = cY;
                      let color = node.color;
                      
                      if (node.group !== 'center') {
                        const angle = ((idx - 1) * (2 * Math.PI)) / numNodes;
                        x = cX + 105 * Math.cos(angle);
                        y = cY + 45 * Math.sin(angle);
                      }
                      
                      return (
                        <g key={`on-${idx}`} className="network-node" style={{ cursor: 'pointer' }}>
                          <circle 
                            cx={x} 
                            cy={y} 
                            r={node.size / 2.5} 
                            fill="#111" 
                            stroke={color} 
                            strokeWidth="1.5"
                          />
                          <text 
                            x={x} 
                            y={y + (node.group === 'center' ? 12 : 9)} 
                            fill="var(--text-primary)" 
                            fontSize="6px" 
                            fontWeight={node.group === 'center' ? 'bold' : 'normal'}
                            textAnchor="middle"
                            fontFamily="var(--font-mono)"
                          >
                            {node.label}
                          </text>
                        </g>
                      );
                    });
                  })()}
                </svg>
              </div>
            </div>

          </div>

          {/* ================= LEVEL 5: COMPETITIVE INTELLIGENCE ================= */}
          <div className="intel-section" id="intel-level-5">
            <div className="intel-section-title-hud">LEVEL 5 — COMPETITIVE INTELLIGENCE</div>
            
            {/* Competitive Moat Scorecard */}
            <div style={{ border: '1px solid var(--panel-border)', padding: '6px', background: 'rgba(255,255,255,0.01)', marginBottom: '8px' }}>
              <div className="flex-between" style={{ marginBottom: '4px' }}>
                <span style={{ fontSize: '8.5px', fontWeight: 'bold', color: 'var(--accent-amber)' }}>
                  COMPETITIVE MOAT RATING
                </span>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--accent-amber)' }}>
                  {intel.competitors.moatScore} <span style={{ fontSize: '8px', color: 'var(--text-secondary)' }}>/ 100</span>
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {(intel.competitors.moatScorecard || []).map((item, idx) => (
                  <div key={idx} style={{ fontSize: '8px' }}>
                    <div className="flex-between" style={{ marginBottom: '1px' }}>
                      <span className="text-muted">{item.metric}</span>
                      <span>Score: {item.score} (wt: {item.weight})</span>
                    </div>
                    <div style={{ height: '3px', background: '#111', width: '100%', borderRadius: '1.5px' }}>
                      <div style={{ height: '100%', width: `${item.score}%`, backgroundColor: 'var(--accent-amber)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Peer Bubble scatter plot matrix (Interactive SVG) */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '8.5px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                Competitive Positioning Matrix (Revenue YoY Growth vs Operating Margin)
              </div>
              <div style={{ border: '1px solid var(--panel-border)', background: '#050505', position: 'relative', height: '110px' }}>
                <svg width="100%" height="100%" viewBox="0 0 320 110" style={{ display: 'block' }}>
                  {/* Axis lines */}
                  <line x1="25" y1="90" x2="310" y2="90" stroke="#333" strokeWidth="1" />
                  <line x1="25" y1="10" x2="25" y2="90" stroke="#333" strokeWidth="1" />
                  <text x="310" y="100" fill="var(--text-secondary)" fontSize="5px" textAnchor="end">REVENUE YOY (%) &gt;</text>
                  <text x="10" y="15" fill="var(--text-secondary)" fontSize="5px" transform="rotate(-90 10 15)" textAnchor="end">MARGIN (%) &gt;</text>

                  {/* Draw grid quadrants */}
                  <line x1="167" y1="10" x2="167" y2="90" stroke="#1c1c1c" strokeDasharray="2,2" />
                  <line x1="25" y1="50" x2="310" y2="50" stroke="#1c1c1c" strokeDasharray="2,2" />

                  {/* Plot bubbles */}
                  {(intel.competitors.peers || []).map((peer, idx) => {
                    // map Growth (X) 0 to 30% (or 250% for NVDA) -> x: 40 to 300
                    const maxGrowth = ticker === 'NVDA' ? 250 : 25;
                    const growthRatio = Math.max(0.05, Math.min(1.0, peer.growth / maxGrowth));
                    const x = 35 + growthRatio * 260;

                    // map Margin (Y) 0 to 50% -> y: 80 to 20
                    const marginRatio = Math.max(0.05, Math.min(1.0, peer.margin / 50));
                    const y = 85 - marginRatio * 70;

                    // Size relative to market cap
                    const size = Math.max(4, Math.min(10, (peer.mcap || 0.1) * 3));
                    const isSelf = peer.name.includes(ticker);
                    const color = isSelf ? 'var(--accent-amber)' : 'var(--accent-blue)';

                    return (
                      <g key={idx} style={{ cursor: 'pointer' }}>
                        <circle 
                          cx={x} cy={y} r={size} 
                          fill={isSelf ? 'rgba(255, 176, 0, 0.15)' : 'rgba(0, 170, 255, 0.1)'} 
                          stroke={color} strokeWidth="1.5" 
                        />
                        <text 
                          x={x} y={y - size - 2} 
                          fill="var(--text-primary)" fontSize="5.5px" 
                          textAnchor="middle" fontFamily="var(--font-mono)"
                          fontWeight={isSelf ? 'bold' : 'normal'}
                        >
                          {peer.name}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Market Share Evolution */}
            {intel.competitors.marketShare && intel.competitors.marketShare.length > 0 ? (
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '8.5px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                Competitive Market Share Evolution (%)
              </div>
              <div style={{ border: '1px solid var(--panel-border)', background: '#050505', padding: '6px', height: '110px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={intel.competitors.marketShare}
                    margin={{ top: 2, right: 5, left: -25, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="year" stroke="#444" style={{ fontSize: '7px', fontFamily: 'var(--font-mono)' }} />
                    <YAxis stroke="#444" style={{ fontSize: '7px', fontFamily: 'var(--font-mono)' }} />
                    <Tooltip 
                      contentStyle={{ background: '#0a0a0a', border: '1px solid var(--panel-border)', fontSize: '8px', fontFamily: 'var(--font-mono)' }}
                    />
                    <Legend iconSize={6} wrapperStyle={{ fontSize: '7.5px', fontFamily: 'var(--font-mono)', marginTop: '-8px' }} />
                    <Line type="monotone" dataKey={ticker} stroke="var(--accent-amber)" strokeWidth={2} dot={{ r: 2 }} />
                    {Object.keys(intel.competitors.marketShare[0] || {})
                      .filter(k => k !== 'year' && k !== ticker)
                      .map((k, idx) => (
                        <Line 
                          key={idx} 
                          type="monotone" 
                          dataKey={k} 
                          stroke={idx === 0 ? 'var(--accent-blue)' : idx === 1 ? 'var(--accent-green)' : 'var(--text-secondary)'} 
                          strokeWidth={1} 
                          strokeDasharray="4 2"
                          dot={{ r: 1.5 }} 
                        />
                      ))
                    }
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            ) : (
            <div style={{ marginBottom: '8px', padding: '8px', border: '1px solid var(--panel-border)', background: 'rgba(255,255,255,0.01)', fontSize: '8px', color: 'var(--text-secondary)' }}>
              Market share evolution data requires historical segment revenue data from company filings.
            </div>
            )}

            {/* Competitive Threats list */}
            {intel.competitors.threats && intel.competitors.threats.length > 0 && (
              <div>
              <div style={{ fontSize: '7.5px', color: 'var(--accent-red)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '3px' }}>
                Corporate Vulnerabilities & Disruption Risks (Threat Matrix)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {(intel.competitors.threats || []).map((threat, idx) => (
                  <div 
                    key={idx} 
                    style={{ 
                      padding: '5px', 
                      background: 'rgba(255,255,255,0.01)', 
                      border: '1px solid var(--panel-border)', 
                      borderRadius: '2px' 
                    }}
                  >
                    <div className="flex-between" style={{ marginBottom: '2px' }}>
                      <span style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '8.5px' }}>{threat.title}</span>
                      <span 
                        style={{ 
                          fontSize: '7px', 
                          fontWeight: 'bold', 
                          color: threat.risk === 'CRITICAL' ? 'var(--accent-red)' : threat.risk === 'HIGH' ? 'var(--accent-amber)' : 'var(--accent-blue)',
                          background: threat.risk === 'CRITICAL' ? 'rgba(255,51,51,0.08)' : 'transparent',
                          padding: '1px 3px',
                          borderRadius: '1px'
                        }}
                      >
                        {threat.risk} RISK
                      </span>
                    </div>
                    <div style={{ fontSize: '8px', color: 'var(--text-secondary)', lineHeight: '1.2' }}>{threat.desc}</div>
                  </div>
                ))}
              </div>
            </div>
            )}

          </div>

          {/* ================= LEVEL 6: PREDICTIVE AI ENGINE ================= */}
          <div className="intel-section" id="intel-level-6">
            <div className="intel-section-title-hud">LEVEL 6 — PREDICTIVE AI ENGINE</div>
             {/* Future Forecast Grid */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <div style={{ fontSize: '8.5px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Discounted Cash Flow (DCF) Model (5-Year)
                </div>
                <div style={{ fontSize: '8.5px', fontWeight: 'bold' }}>
                  Implied Value: <span style={{ color: 'var(--accent-green)' }}>${(intel.predictions.impliedSharePrice || 0).toFixed(2)}</span> / share
                </div>
              </div>
              <table className="data-table" style={{ fontSize: '9px' }}>
                <thead>
                  <tr style={{ color: 'var(--text-secondary)' }}>
                    <th style={{ textAlign: 'left' }}>Fiscal Year</th>
                    <th>Proj. FCF</th>
                    <th>YoY Growth</th>
                    <th>Discounted PV</th>
                    <th>WACC</th>
                  </tr>
                </thead>
                <tbody>
                  {(intel.predictions.years || []).map((year, idx) => {
                    const fcf = intel.predictions.fcfProj?.[idx] || 0;
                    const prevFcf = idx === 0 ? (intel.financials?.freeCashflow || 100000000) : intel.predictions.fcfProj[idx - 1];
                    const yoyG = ((fcf - prevFcf) / (prevFcf || 1)) * 100;
                    const pv = fcf / Math.pow(1 + (intel.predictions.wacc || 0.09), idx + 1);

                    return (
                      <tr key={idx}>
                        <td style={{ textAlign: 'left', fontWeight: 'bold', color: 'var(--accent-blue)' }}>FY {year} (E)</td>
                        <td style={{ fontWeight: '600' }}>${formatNum(fcf)}</td>
                        <td className="text-up">+{yoyG.toFixed(1)}%</td>
                        <td style={{ color: 'var(--accent-green)', fontWeight: '600' }}>${formatNum(pv)}</td>
                        <td className="text-muted">{((intel.predictions.wacc || 0.09) * 100).toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ fontSize: '8px', color: 'var(--text-secondary)', lineHeight: '1.3', marginBottom: '8px' }}>
              <b>RECESSION SENSITIVITY:</b> {intel.predictions.recessionSensitivity} <br />
              <b>BLACK SWAN TAIL EXPOSURE:</b> {intel.predictions.blackSwanExposure} <br />
              <b>MACROECONOMIC SENSITIVITY:</b> {intel.predictions.macroSensitivity}
            </div>

            {/* Interactive Scenario Engine */}
            <div>
              <div className="flex-between" style={{ marginBottom: '4px' }}>
                <span style={{ fontSize: '8.5px', fontWeight: 'bold', color: 'var(--accent-amber)', textTransform: 'uppercase' }}>
                  Macro Scenario Simulator Engine
                </span>
                <span className="text-muted" style={{ fontSize: '7.5px' }}>
                  Simulate dynamic multiple/EPS outcomes under stress
                </span>
              </div>
              
              <div className="scenario-slider-container">
                <div className="scenario-slider-row">
                  <div className="scenario-slider-header">
                    <span>Core Inflation Rate</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{scenarioInput.inflation.toFixed(1)}%</span>
                  </div>
                  <input 
                    type="range" className="scenario-range-input" 
                    min="0" max="10" step="0.5" 
                    value={scenarioInput.inflation}
                    onChange={(e) => setScenarioInput({ ...scenarioInput, inflation: parseFloat(e.target.value) })}
                  />
                </div>
                
                <div className="scenario-slider-row">
                  <div className="scenario-slider-header">
                    <span>Federal Funds Rate (Rates)</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{scenarioInput.rates.toFixed(1)}%</span>
                  </div>
                  <input 
                    type="range" className="scenario-range-input" 
                    min="0" max="8" step="0.5" 
                    value={scenarioInput.rates}
                    onChange={(e) => setScenarioInput({ ...scenarioInput, rates: parseFloat(e.target.value) })}
                  />
                </div>

                <div className="scenario-slider-row">
                  <div className="scenario-slider-header">
                    <span>Geopolitical Tariffs Exposure</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{scenarioInput.tariffs.toFixed(1)}%</span>
                  </div>
                  <input 
                    type="range" className="scenario-range-input" 
                    min="0" max="50" step="2" 
                    value={scenarioInput.tariffs}
                    onChange={(e) => setScenarioInput({ ...scenarioInput, tariffs: parseFloat(e.target.value) })}
                  />
                </div>

                <div className="scenario-slider-row">
                  <div className="scenario-slider-header">
                    <span>Global Macro Demand Shock</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>
                      {scenarioInput.demand >= 0 ? `+${scenarioInput.demand.toFixed(1)}%` : `${scenarioInput.demand.toFixed(1)}%`}
                    </span>
                  </div>
                  <input 
                    type="range" className="scenario-range-input" 
                    min="-10" max="20" step="1" 
                    value={scenarioInput.demand}
                    onChange={(e) => setScenarioInput({ ...scenarioInput, demand: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              {/* Simulation outcomes */}
              <div className="scenario-outcomes-grid">
                <div className="scenario-outcome-card">
                  <div className="scenario-outcome-label">Simulated Margin</div>
                  <div className="scenario-outcome-val" style={{ color: simulated.margin < intel.financials.operatingMargin * 100 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                    {simulated.margin.toFixed(2)}%
                  </div>
                </div>
                <div className="scenario-outcome-card">
                  <div className="scenario-outcome-label">Simulated EPS</div>
                  <div className="scenario-outcome-val" style={{ color: simulated.eps < (intel.financials.eps || 5.0) ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                    ${simulated.eps.toFixed(2)}
                  </div>
                </div>
                <div className="scenario-outcome-card" style={{ border: '1px solid var(--accent-amber)' }}>
                  <div className="scenario-outcome-label" style={{ color: 'var(--accent-amber)' }}>Sim. Target Price</div>
                  <div className="scenario-outcome-val" style={{ color: 'var(--accent-amber)' }}>
                    ${simulated.priceTarget.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </Panel>
  );
};

export default CompanyIntel;
