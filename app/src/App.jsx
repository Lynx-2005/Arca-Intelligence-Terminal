import React from 'react';
import TickerBar from './components/TickerBar';
import NewsTicker from './components/NewsTicker';
import Chart from './components/panels/Chart';
import News from './components/panels/News';
import WorldMap from './components/panels/WorldMap';
import GlobalNewsMap from './components/panels/GlobalNewsMap';
import CompanyIntel from './components/panels/CompanyIntel';

import BottomDock from './components/panels/BottomDock';
import Chat from './components/panels/Chat';
import OrderflowChart from './components/panels/OrderflowChart';
import { useStore } from './store';
import Magnifier from './components/Magnifier';
import './index.css';

const App = () => {
  const activeTicker = useStore(state => state.activeTicker);
  const [leftTab, setLeftTab] = React.useState('MACRO');

  return (
    <div className="terminal-layout">
      {/* Top Tape */}
      <TickerBar />
      
      {/* Top Workspace (Map, Company, Stacked News/Chat) */}
      <div className="terminal-workspace">
        <div className="workspace-column">
          <div className="tab-container" style={{ display: 'flex', background: '#141414', border: '1px solid #1e1e1e', borderBottom: 'none' }}>
            <button 
              className={`dock-tab-btn ${leftTab === 'MACRO' ? 'active' : ''}`} 
              onClick={() => setLeftTab('MACRO')}
              style={{ flex: 1, padding: '4px 0' }}
            >
              MACRO INTELLIGENCE
            </button>
            <button 
              className={`dock-tab-btn ${leftTab === 'NEWS' ? 'active' : ''}`} 
              onClick={() => setLeftTab('NEWS')}
              style={{ flex: 1, padding: '4px 0' }}
            >
              GLOBAL NEWS
            </button>
            <button 
              className={`dock-tab-btn ${leftTab === 'AGENT' ? 'active' : ''}`} 
              onClick={() => setLeftTab('AGENT')}
              style={{ flex: 1, padding: '4px 0' }}
            >
              ARCA AI AGENT
            </button>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            {leftTab === 'MACRO' && <WorldMap />}
            {leftTab === 'NEWS' && <GlobalNewsMap />}
            {leftTab === 'AGENT' && <Chat context={activeTicker} />}
          </div>
        </div>
        
        <div className="workspace-column">
          <CompanyIntel />
        </div>
        
        <div className="workspace-column">
          <News query={activeTicker || 'markets'} />
        </div>
      </div>
      
      {/* Bottom Analytics (Chart, Orderflow + DOM, Bottom Dock) */}
      <div className="terminal-analytics">
        <div className="analytics-column">
          <Chart ticker={activeTicker} />
        </div>
        
        <div className="analytics-column">
          <OrderflowChart ticker={activeTicker} />
        </div>
        
        <div className="analytics-column">
          <BottomDock />
        </div>
      </div>
      
      {/* Floating Command Bar */}
      <NewsTicker />

      {/* Global Precision Magnifier Overlay */}
      <Magnifier />
    </div>
  );
};

export default App;
