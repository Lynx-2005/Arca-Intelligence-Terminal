const fs = require('fs');

const content = fs.readFileSync('server/index.js', 'utf8');

// We will add a timeout wrapper to yahooFinance.quoteSummary
const replaceTarget = `const result = await yahooFinance.quoteSummary(ticker, { modules: allModules }).catch(err => {
      console.warn(\`Company intel error for \${ticker}:\`, err.message);
      return {};
    });`;

const replacement = `const withTimeout = (promise, ms) => {
      return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
      ]);
    };

    const result = await withTimeout(yahooFinance.quoteSummary(ticker, { modules: allModules }), 5000).catch(err => {
      console.warn(\`Company intel error for \${ticker}:\`, err.message);
      return {};
    });`;

if (content.includes(replaceTarget)) {
  fs.writeFileSync('server/index.js', content.replace(replaceTarget, replacement));
  console.log('Successfully patched quoteSummary with timeout.');
} else {
  console.log('Could not find replace target.');
}
