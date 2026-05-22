const YF = require('yahoo-finance2').default;
const yahooFinance = new YF();
async function test() {
  try {
    const res = await yahooFinance.quoteSummary('MSFT', { modules: ['secFilings'] });
    console.log(JSON.stringify(res.secFilings, null, 2));
  } catch (e) {
    console.error(e);
  }
}
test();
