const fs = require('fs');
let content = fs.readFileSync('server/index.js', 'utf8');

if (!content.includes('console.log(`Sending response for ${ticker}`)) {
  content = content.replace(
    /res\.json\(result\);/g,
    'console.log(`Sending response for ${ticker}, keys:`, Object.keys(result));\n    res.json(result);'
  );
  fs.writeFileSync('server/index.js', content);
  console.log('Patched server logging');
}
