const fs = require('fs');
const code = fs.readFileSync('app/src/components/panels/GlobalNewsMap.jsx', 'utf-8');
const lines = code.split('\n');
console.log(lines.find(l => l.includes('screenX < -100')));
