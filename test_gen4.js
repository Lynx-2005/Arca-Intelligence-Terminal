const fs = require('fs');

const content = fs.readFileSync('app/src/components/panels/IntelDataGenerator.js', 'utf8');
const moduleCode = content.replace(/export const generateIntelData/g, 'const generateIntelData');

eval(moduleCode + `
  const testRun = () => {
    try {
      const res = generateIntelData('EMPTY', {});
      console.log("Success! fcfProj:", res.predictions.fcfProj);
    } catch(e) {
      console.error("ERROR in generateIntelData:", e.message, '\\n', e.stack);
    }
  };
  testRun();
`);
