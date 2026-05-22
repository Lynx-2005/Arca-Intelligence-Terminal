const fs = require('fs');
let content = fs.readFileSync('server/index.js', 'utf8');

const replaceTarget2 = `const industrySearch = await yahooFinance.search(industry, { quotesCount: 8, newsCount: 0 }).catch(() => null);`;
const replacement2 = `const industrySearch = await withTimeout(yahooFinance.search(industry, { quotesCount: 8, newsCount: 0 }), 3000).catch(() => null);`;

const replaceTarget3 = `peers.map(p => yahooFinance.quote(p).catch(() => null))`;
const replacement3 = `peers.map(p => withTimeout(yahooFinance.quote(p), 3000).catch(() => null))`;

content = content.replace(replaceTarget2, replacement2);
content = content.replace(replaceTarget3, replacement3);

fs.writeFileSync('server/index.js', content);
console.log('Patched search and quote timeouts.');
