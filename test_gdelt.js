const fetch = require('node-fetch');

async function testGDELT() {
  try {
    const url = 'https://api.gdeltproject.org/api/v2/geo/geo?mode=pointdata&format=geojson&TIMESPAN=60';
    console.log('Fetching', url);
    const res = await fetch(url);
    const data = await res.json();
    console.log('Data features count:', data.features ? data.features.length : 0);
    if (data.features && data.features.length > 0) {
      console.log('Sample feature:', JSON.stringify(data.features[0], null, 2));
    } else {
      console.log('Full data:', JSON.stringify(data, null, 2));
    }
  } catch (e) {
    console.error('Error:', e);
  }
}

testGDELT();
