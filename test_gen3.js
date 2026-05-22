const fs = require('fs');

const rawStr = fs.readFileSync('aapl_raw.json', 'utf8');
const data = JSON.parse(rawStr);

// A minimal mock of ApiService.getCompanyIntel processing
const processedData = {
  assetProfile: data.assetProfile || {},
  price: data.price || {},
  summaryDetail: data.summaryDetail || {},
  financialData: data.financialData || {},
  stats: data.defaultKeyStatistics || {},
  companyName: data.quoteType?.shortName || data.price?.shortName || "AAPL",
  sector: data.assetProfile?.sector || "Technology",
  industry: data.assetProfile?.industry || "Consumer Electronics",
  competitors: data.competitors || [],
  secFilings: [],
  earnings: { history: [], trend: data.earningsTrend?.trend || [] },
  analyst: { recommendations: [], upgrades: [] },
  financialStatements: {
    incomeStatements: data.incomeStatementHistory?.incomeStatementHistory || [],
    balanceSheets: data.balanceSheetHistory?.balanceSheetStatements || [],
    cashFlows: data.cashflowStatementHistory?.cashflowStatements || []
  },
  aiDossier: data.aiDossier || {},
  ownership: {
    insiderHolders: [],
    fundHolders: [],
    majorHolders: {},
    netShareActivity: null
  }
};

const content = fs.readFileSync('app/src/components/panels/IntelDataGenerator.js', 'utf8');
const moduleCode = content.replace(/export const generateIntelData/g, 'const generateIntelData');

eval(moduleCode + `
  const testRun = () => {
    try {
      const res = generateIntelData('AAPL', processedData);
      console.log("Success! fcfProj:", res.predictions.fcfProj);
    } catch(e) {
      console.error("ERROR in generateIntelData:", e.message, '\\n', e.stack);
    }
  };
  testRun();
`);
