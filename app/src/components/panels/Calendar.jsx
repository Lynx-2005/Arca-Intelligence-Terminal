import React from 'react';
import Panel from '../Panel';

const Calendar = () => {
  // Mock calendar data
  const events = [
    { date: 'Today 08:30 AM', event: 'US Core CPI (MoM)', impact: 'HIGH', prev: '0.3%', cons: '0.4%' },
    { date: 'Today 02:00 PM', event: 'FOMC Statement', impact: 'HIGH', prev: '-', cons: '-' },
    { date: 'Tmrw 08:30 AM', event: 'Initial Jobless Claims', impact: 'MED', prev: '210K', cons: '212K' },
    { date: 'Tmrw 10:00 AM', event: 'Existing Home Sales', impact: 'LOW', prev: '4.38M', cons: '4.20M' },
  ];

  const earnings = [
    { date: 'Today AMC', ticker: 'NVDA', estimate: '$5.59', impact: 'HIGH' },
    { date: 'Today AMC', ticker: 'SNOW', estimate: '$0.18', impact: 'MED' },
    { date: 'Tmrw BMO', ticker: 'WMT', estimate: '$1.65', impact: 'HIGH' },
  ];

  return (
    <Panel title="ECO & EARNINGS CALENDAR (CAL)">
      <div style={{ marginBottom: '16px' }}>
        <h3 className="text-amber" style={{ fontSize: '11px', marginBottom: '8px', borderBottom: '1px solid #333', paddingBottom: '4px' }}>ECONOMIC EVENTS</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>TIME</th>
              <th>EVENT</th>
              <th>IMP</th>
              <th>CONS</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e, i) => (
              <tr key={i}>
                <td style={{ fontSize: '11px' }} className="text-muted">{e.date}</td>
                <td>{e.event}</td>
                <td style={{ color: e.impact === 'HIGH' ? 'var(--status-down)' : e.impact === 'MED' ? 'var(--accent-amber)' : 'var(--status-neutral)' }}>{e.impact}</td>
                <td>{e.cons}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h3 className="text-amber" style={{ fontSize: '11px', marginBottom: '8px', borderBottom: '1px solid #333', paddingBottom: '4px' }}>UPCOMING EARNINGS</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>TIME</th>
              <th>TICKER</th>
              <th>EST EPS</th>
            </tr>
          </thead>
          <tbody>
            {earnings.map((e, i) => (
              <tr key={i}>
                <td style={{ fontSize: '11px' }} className="text-muted">{e.date}</td>
                <td style={{ fontWeight: 'bold' }}>{e.ticker}</td>
                <td className="text-up">{e.estimate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
};

export default Calendar;
