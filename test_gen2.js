const fs = require('fs');

const rawStr = fs.readFileSync('aapl_raw.json', 'utf8');
const rawData = JSON.parse(rawStr);

const content = fs.readFileSync('app/src/components/panels/IntelDataGenerator.js', 'utf8');
const moduleCode = content.replace(/export const generateIntelData/g, 'const generateIntelData');

eval(moduleCode + `
  const testRun = () => {
    try {
      const res = generateIntelData('AAPL', rawData);
      console.log("Success! fcfProj:", res.predictions.fcfProj);
    } catch(e) {
      console.error("ERROR in generateIntelData:", e.message, e.stack);
    }
  };
  testRun();
`);
