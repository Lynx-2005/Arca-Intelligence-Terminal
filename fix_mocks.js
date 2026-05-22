const fs = require('fs');
let code = fs.readFileSync('app/src/services/api.js', 'utf8');

// 1. getStockQuote
code = code.replace(/console\.warn\(`Falling back to mock quote for \$\{ticker\}`\, e\);[\s\S]*?return mockResult;/g, 'console.warn(`Quote fetch failed for ${ticker}`, e);\n      return null;');

// 2. getCompanyIntel
code = code.replace(/console\.warn\("CompanyIntel API failed, using structured mock generator for", ticker\);[\s\S]*?return mockResult;/g, 'console.warn("CompanyIntel API failed for", ticker);\n      return null;');

// 3. getGlobalIndices
code = code.replace(/console\.warn\("Indices fetch failed, returning realistic mocks"\);[\s\S]*?return mockIndices;/g, 'console.warn("Indices fetch failed");\n      return [];');

// 4. getCurrencies
code = code.replace(/console\.warn\("Currencies fetch failed, returning mocks"\);[\s\S]*?return mockCur;/g, 'console.warn("Currencies fetch failed");\n      return [];');

// 5. getCommodities
code = code.replace(/console\.warn\("Commodities fetch failed, returning mocks"\);[\s\S]*?return mockComm;/g, 'console.warn("Commodities fetch failed");\n      return [];');

// 6. getNews
code = code.replace(/console\.warn\("Falling back to mock news for", query\);[\s\S]*?return mockResult;/g, 'console.warn("News fetch failed");\n      return [];');

fs.writeFileSync('app/src/services/api.js', code);
console.log("Mock blocks replaced.");
