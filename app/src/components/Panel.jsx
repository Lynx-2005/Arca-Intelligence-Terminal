

const Panel = ({ title, children, className = '', headerActions = null }) => {
  return (
    <div className={`panel glass-panel ${className}`}>
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{title}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {headerActions}
          <div style={{ display: 'flex', gap: '4px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--panel-border)' }}></div>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--panel-border)' }}></div>
          </div>
        </div>
      </div>
      <div className="panel-content">
        {children}
      </div>
    </div>
  );
};

export default Panel;

