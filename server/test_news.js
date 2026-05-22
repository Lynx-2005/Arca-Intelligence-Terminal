const YF = require('yahoo-finance2').default;
const yahooFinance = new YF();
async function test() {
  try {
    const res = await yahooFinance.search('AAPL', { newsCount: 2 });
    console.log(JSON.stringify(res.news, null, 2));
  } catch (e) {
    console.error(e);
  }
}
test();
