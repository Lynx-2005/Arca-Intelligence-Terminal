const fs = require('fs');
const apiStr = fs.readFileSync('app/src/services/api.js', 'utf8');

const rawDataStr = fs.readFileSync('aapl_test.json', 'utf8');

// We just want to extract the ApiService object literal
const match = apiStr.match(/export const ApiService = ({[\s\S]+});/);
if (match) {
  const code = 'const ApiService = ' + match[1] + ';\\n' +
    'ApiService.parseSECFilings = ApiService.parseSECFilings;\\n' +
    'const data = JSON.parse(`' + rawDataStr.replace(/\\/g, '\\\\').replace(/\`/g, '\\\`').replace(/\\$/g, '\\\\$') + '`);\\n' +
    'try {\\n' +
    '  console.log("Testing parsers...");\\n' +
    '  const sec = ApiService.parseSECFilings(data.secFilings);\\n' +
    '  const earn = ApiService.parseEarningsData(data.earnings, data.earningsHistory, data.earningsTrend);\\n' +
    '  const fs = ApiService.parseFinancialStatements(data.incomeStatementHistory, data.balanceSheetHistory, data.cashflowStatementHistory);\\n' +
    '  console.log("Success! Parsed without errors");\\n' +
    '} catch(e) {\\n' +
    '  console.error("ERROR in parsing:", e);\\n' +
    '}';
  fs.writeFileSync('test_runner.js', code);
  require('child_process').execSync('node test_runner.js', {stdio: 'inherit'});
} else {
  console.log("Could not extract ApiService");
}
