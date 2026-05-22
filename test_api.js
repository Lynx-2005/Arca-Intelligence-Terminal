const fs = require('fs');

const apiStr = fs.readFileSync('app/src/services/api.js', 'utf8');

// Minimal mock fetch
global.fetch = async (url) => {
  console.log('Fetching', url);
  return {
    ok: true,
    json: async () => JSON.parse(fs.readFileSync('aapl_test.json', 'utf8'))
  };
};

const moduleCode = apiStr.replace(/export const ApiService/g, 'const ApiService');

eval(moduleCode + `
  const run = async () => {
    try {
      const res = await ApiService.getCompanyIntel('AAPL', 'google/gemini-2.5-flash');
      console.log('Success! ownership:', res.ownership.insiderHolders.length);
    } catch(e) {
      console.error('ERROR in getCompanyIntel:', e);
    }
  };
  run();
`);
