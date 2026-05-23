const fs = require('fs');
const path = './app/src/components/panels/WorldMap.jsx';
let content = fs.readFileSync(path, 'utf8');

// Replace gdp and inflation fields inside countryDossiers
// Only match the lines that look like:
// gdp: '...',
// inflation: '...',

content = content.replace(/gdp:\s*'[^']+',/g, "gdp: 'Loading...',");
content = content.replace(/inflation:\s*'[^']+',/g, "inflation: 'Loading...',");

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed hardcoded gdp and inflation');
