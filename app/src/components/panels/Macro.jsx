import { useEffect, useState } from 'react';
import Panel from '../Panel';
import { ApiService } from '../../services/api';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

const MacroItem = ({ title, seriesId, color = "#ffb000" }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await ApiService.getMacroData(seriesId);
        setData(result.reverse().slice(0, 24).reverse()); // Last 24 obs
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchData();
  }, [seriesId]);

  const latestVal = data.length > 0 ? data[data.length - 1].value : 0;
  const prevVal = data.length > 1 ? data[data.length - 2].value : 0;
  const change = latestVal - prevVal;

  return (
    <div style={{ marginBottom: '16px' }}>
      <div className="flex-between" style={{ marginBottom: '4px' }}>
        <span className="text-muted">{title}</span>
        <div>
          <span style={{ fontWeight: 'bold', marginRight: '8px' }}>{latestVal.toFixed(2)}</span>
          <span className={change >= 0 ? 'text-up' : 'text-down'} style={{ fontSize: '11px' }}>
            {change > 0 ? '▲' : '▼'} {Math.abs(change).toFixed(2)}
          </span>
        </div>
      </div>
      <div style={{ height: '60px', width: '100%' }}>
        {loading ? <div className="text-muted flex-center">Loading...</div> : 
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        }
      </div>
    </div>
  );
};

const Macro = () => {
  return (
    <Panel title="MACRO DASHBOARD (ECO)">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <MacroItem title="US GDP (Billions)" seriesId="GDP" color="#0088ff" />
        <MacroItem title="CPI Inflation (Index)" seriesId="CPIAUCSL" color="#ffb000" />
        <MacroItem title="Federal Funds Rate (%)" seriesId="FEDFUNDS" color="#00ff00" />
        <MacroItem title="Unemployment Rate (%)" seriesId="UNRATE" color="#ff0000" />
      </div>
    </Panel>
  );
};

export default Macro;
