const fs = require('fs');
// Mocking simple functions or variables needed by IntelDataGenerator
global.useStore = () => {};
global.Math.random = () => 0.5;

const content = fs.readFileSync('app/src/components/panels/IntelDataGenerator.js', 'utf8');
const moduleCode = content.replace(/export const generateIntelData/g, 'const generateIntelData');

eval(moduleCode + `
  const testRun = () => {
    try {
      const rawData = {
        assetProfile: { sector: 'Tech', industry: 'Software' },
        price: { regularMarketPrice: 150 },
        summaryDetail: { marketCap: 2000000000 },
        financialData: { freeCashflow: 50000000, revenueGrowth: 0.1 },
      };
      const res = generateIntelData('AAPL', rawData);
      console.log("Success! fcfProj:", res.predictions.fcfProj);
    } catch(e) {
      console.error("ERROR in generateIntelData:", e);
    }
  };
  testRun();
`);
