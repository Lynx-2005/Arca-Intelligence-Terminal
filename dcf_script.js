const fs = require('fs');
const content = fs.readFileSync('app/src/components/panels/IntelDataGenerator.js', 'utf8');

const buildPredictions = `// Build predictions using a Discounted Cash Flow (DCF) model
const buildPredictions = (earningsTrend, financials, snapshot) => {
  const baseFcf = financials?.freeCashflow || financials?.operatingCashflow || 100000000;
  const growthRate = Math.min(0.20, Math.max(0.02, financials?.revenueGrowth || 0.05));
  const wacc = 0.09;
  const terminalGrowthRate = 0.025;
  const sharesOutstanding = financials?.sharesOutstanding || (snapshot?.marketCap / (snapshot?.regularMarketPrice || 1)) || 100000000;
  
  const years = [];
  const fcfProj = [];
  
  let currentFcf = baseFcf;
  let pvOfFcf = 0;
  
  for (let i = 1; i <= 5; i++) {
    years.push((2025 + i).toString());
    currentFcf = currentFcf * (1 + growthRate);
    fcfProj.push(currentFcf);
    
    // Discount to present value
    pvOfFcf += currentFcf / Math.pow(1 + wacc, i);
  }
  
  // Terminal Value calculation (Gordon Growth Model)
  const terminalValue = (fcfProj[4] * (1 + terminalGrowthRate)) / (wacc - terminalGrowthRate);
  const pvOfTerminalValue = terminalValue / Math.pow(1 + wacc, 5);
  
  // Implied Enterprise Value and Share Price
  const impliedEnterpriseValue = pvOfFcf + pvOfTerminalValue;
  const impliedSharePrice = impliedEnterpriseValue / sharesOutstanding;
  
  const recessionSensitivity = financials?.debtEquity > 2 ? 'HIGH' : 
                               financials?.debtEquity > 1 ? 'MEDIUM' : 'LOW';
  
  const blackSwanExposure = 'Company-specific operational or regulatory disruption risk.';
  const macroSensitivity = \`Sensitive to interest rates, inflation, and \${growthRate > 0.15 ? 'growth' : 'value'} market dynamics.\`;

  return {
    years,
    fcfProj,
    impliedSharePrice,
    impliedEnterpriseValue,
    wacc,
    growthRate,
    recessionSensitivity,
    blackSwanExposure,
    macroSensitivity
  };
};`;

const newContent = content.replace(
  /\/\/ Build predictions from real earnings trend data[\s\S]*?(?=\/\/ Build executive intel from real company officers)/,
  buildPredictions + '\n\n'
);

fs.writeFileSync('app/src/components/panels/IntelDataGenerator.js', newContent);
