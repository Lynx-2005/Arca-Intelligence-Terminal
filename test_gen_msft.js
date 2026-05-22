const fs = require('fs');

const rawStr = fs.readFileSync('msft_test.json', 'utf8');
const data = JSON.parse(rawStr);

const apiStr = fs.readFileSync('app/src/services/api.js', 'utf8');
const match = apiStr.match(/export const ApiService = ({[\s\S]+});/);
const apiCode = 'const ApiService = ' + match[1] + ';\nApiService.parseSECFilings = ApiService.parseSECFilings;\nApiService.parseEarningsData = ApiService.parseEarningsData;\nApiService.parseAnalystData = ApiService.parseAnalystData;';

const content = fs.readFileSync('app/src/components/panels/IntelDataGenerator.js', 'utf8');
const moduleCode = content.replace(/export const generateIntelData/g, 'const generateIntelData');

eval(apiCode + '\n' + moduleCode + `
  const run = () => {
    try {
      const processed = {
        assetProfile: data.assetProfile || {},
        price: data.price || {},
        summaryDetail: data.summaryDetail || {},
        financialData: data.financialData || {},
        stats: data.defaultKeyStatistics || {},
        competitors: data.competitors || [],
        secFilings: ApiService.parseSECFilings(data.secFilings),
        earnings: ApiService.parseEarningsData(data.earnings, data.earningsHistory, data.earningsTrend),
        analyst: ApiService.parseAnalystData(data.recommendationTrend, data.upgradeDowngradeHistory),
        financialStatements: { incomeStatements: [], balanceSheets: [], cashFlows: [] },
        aiDossier: data.aiDossier || {},
        ownership: { insiderHolders: [], fundHolders: [], majorHolders: {}, netShareActivity: null }
      };
      const res = generateIntelData('MSFT', processed);
      console.log('MSFT Success!');
    } catch(e) {
      console.error('ERROR in MSFT gen:', e);
    }
  };
  run();
`);
