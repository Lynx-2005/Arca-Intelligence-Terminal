const GEO_DICTIONARY = {
  " us ": [-95.7129, 37.0902],
  " usa ": [-95.7129, 37.0902],
  " uk ": [-3.4360, 55.3781],
  "britain": [-3.4360, 55.3781],
  "london": [-0.1276, 51.5072],
  "china": [104.1954, 35.8617],
  "beijing": [116.4074, 39.9042],
  "russia": [105.3188, 61.5240],
  "moscow": [37.6173, 55.7558],
  "ukraine": [31.1656, 48.3794],
  "kyiv": [30.5234, 50.4501],
  "israel": [34.8516, 31.0461],
  "gaza": [34.4668, 31.5017],
  "palestine": [35.2332, 31.9522],
  "iran": [53.6880, 32.4279],
  "japan": [138.2529, 36.2048],
  "tokyo": [139.6917, 35.6895],
  "taiwan": [120.9605, 23.6978],
  "korea": [127.7669, 35.9078],
  "india": [78.9629, 20.5937],
  "pakistan": [69.3451, 30.3753],
  "france": [2.2137, 46.2276],
  "paris": [2.3522, 48.8566],
  "germany": [10.4515, 51.1657],
  "berlin": [13.4050, 52.5200],
  "brazil": [-51.9253, -14.2350],
  "mexico": [-102.5528, 23.6345],
  "canada": [-106.3468, 56.1304],
  "australia": [133.7751, -25.2744],
  "africa": [17.0608, 1.0232],
  "egypt": [30.8025, 26.8206],
  "turkey": [35.2433, 38.9637],
  "syria": [38.9968, 34.8021],
  "yemen": [47.5144, 15.5527],
  "saudi": [45.0792, 23.8859],
  "dubai": [55.2708, 25.2048],
  "europe": [15.2551, 54.5260],
  "afghanistan": [67.7097, 33.9391],
  "kabul": [69.2401, 34.5553],
  "albania": [20.1683, 41.1533],
  "algeria": [1.6596, 28.0339],
  "algiers": [3.0588, 36.7538],
  "angola": [17.8739, -11.2027],
  "argentina": [-63.6167, -38.4161],
  "buenos aires": [-58.3816, -34.6037],
  "armenia": [45.0382, 40.0691],
  "austria": [14.5501, 47.5162],
  "vienna": [16.3738, 48.2082],
  "azerbaijan": [47.5769, 40.1431],
  "baku": [49.8932, 40.4093],
  "bahrain": [50.5577, 26.0667],
  "bangladesh": [90.3563, 23.6850],
  "dhaka": [90.4125, 23.8103],
  "belarus": [27.9534, 53.7098],
  "minsk": [27.5618, 53.9045],
  "belgium": [4.4699, 50.5039],
  "brussels": [4.3517, 50.8503],
  "benin": [2.3158, 9.3077],
  "bolivia": [-63.5887, -16.2902],
  "bosnia": [17.6791, 43.9159],
  "botswana": [24.6849, -22.3285],
  "brunei": [114.7277, 4.5353],
  "bulgaria": [25.4858, 42.7339],
  "sofia": [23.3219, 42.6977],
  "burkina": [-1.5616, 12.2383],
  "burma": [95.9562, 21.9162],
  "burundi": [29.9189, -3.3731],
  "cambodia": [104.9910, 12.5657],
  "cameroon": [12.3547, 7.3697],
  "cape verde": [-23.0418, 16.5388],
  "chad": [18.7322, 15.4542],
  "chile": [-71.5430, -35.6751],
  "santiago": [-70.6693, -33.4489],
  "colombia": [-74.2973, 4.5709],
  "bogota": [-74.0721, 4.7110],
  "congo": [15.8277, -0.2280],
  "costa rica": [-83.7534, 9.7489],
  "croatia": [15.2000, 45.1000],
  "zagreb": [15.9819, 45.8150],
  "cuba": [-77.7812, 21.5218],
  "havana": [-82.3666, 23.1136],
  "cyprus": [33.4299, 35.1264],
  "czech": [15.4730, 49.8175],
  "prague": [14.4378, 50.0755],
  "denmark": [9.5018, 56.2639],
  "copenhagen": [12.5683, 55.6761],
  "djibouti": [42.5903, 11.8251],
  "dominican": [-70.1627, 18.7357],
  "ecuador": [-78.1834, -1.8312],
  "quito": [-78.4678, -0.1807],
  "england": [-1.1743, 52.3555],
  "eritrea": [39.7823, 15.1794],
  "estonia": [25.0136, 58.5953],
  "tallinn": [24.7536, 59.4370],
  "ethiopia": [40.4897, 9.1450],
  "addis ababa": [38.7578, 9.0320],
  "finland": [25.7482, 61.9241],
  "helsinki": [24.9384, 60.1699],
  "gabon": [11.6094, -0.8037],
  "gambia": [-15.3101, 13.4432],
  "georgia": [43.3569, 42.3154],
  "tbilisi": [44.8271, 41.7151],
  "ghana": [-1.0232, 7.9465],
  "accra": [-0.1867, 5.6037],
  "greece": [21.8243, 39.0742],
  "athens": [23.7275, 37.9838],
  "guatemala": [-90.2308, 15.7835],
  "guinea": [-9.6966, 9.9456],
  "haiti": [-72.2852, 18.9712],
  "honduras": [-86.2419, 15.2000],
  "hong kong": [114.1694, 22.3193],
  "hungary": [19.5033, 47.1625],
  "budapest": [19.0402, 47.4979],
  "iceland": [-19.0208, 64.9631],
  "indonesia": [113.9213, -0.7893],
  "jakarta": [106.8650, -6.2088],
  "iraq": [43.6793, 33.2232],
  "baghdad": [44.3661, 33.3152],
  "ireland": [-8.2439, 53.4129],
  "dublin": [-6.2603, 53.3498],
  "italy": [12.5674, 41.8719],
  "rome": [12.4964, 41.9028],
  "milan": [9.1900, 45.4642],
  "ivory coast": [-5.5471, 7.5400],
  "jamaica": [-77.2975, 18.1096],
  "jordan": [36.0384, 30.5852],
  "amman": [35.9283, 31.9516],
  "kazakhstan": [66.9237, 48.0196],
  "nur-sultan": [71.4704, 51.1605],
  "kenya": [37.9062, -0.0236],
  "nairobi": [36.8167, -1.2921],
  "kosovo": [20.9029, 42.6026],
  "kuwait": [47.4834, 29.3117],
  "kyrgyzstan": [74.7661, 41.2044],
  "laos": [102.4955, 19.8563],
  "latvia": [24.6032, 56.8796],
  "riga": [24.1052, 56.9496],
  "lebanon": [35.8623, 33.8547],
  "beirut": [35.5018, 33.8938],
  "liberia": [-9.4295, 6.4281],
  "libya": [17.2284, 26.3351],
  "lithuania": [23.8813, 55.1694],
  "vilnius": [25.2797, 54.6872],
  "luxembourg": [6.1296, 49.8153],
  "madagascar": [46.8691, -18.7669],
  "malawi": [34.3015, -13.2543],
  "malaysia": [101.9758, 4.2105],
  "kuala lumpur": [101.6865, 3.1390],
  "maldives": [73.2207, 3.2028],
  "mali": [-3.9962, 17.5707],
  "malta": [14.3754, 35.9375],
  "mauritania": [-10.9408, 21.0079],
  "mauritius": [57.5522, -20.3484],
  "moldova": [28.3698, 47.4116],
  "mongolia": [103.8467, 46.8625],
  "ulan bator": [106.9172, 47.9184],
  "montenegro": [19.3744, 42.7087],
  "morocco": [-7.0926, 31.7917],
  "casablanca": [-7.5898, 33.5731],
  "mozambique": [35.5296, -18.6657],
  "myanmar": [95.9562, 21.9162],
  "naypyidaw": [96.0897, 19.7633],
  "namibia": [18.4904, -22.9576],
  "nepal": [84.1240, 28.3949],
  "kathmandu": [85.3240, 27.7172],
  "netherlands": [5.2913, 52.1326],
  "amsterdam": [4.8952, 52.3702],
  "new zealand": [174.8860, -40.9006],
  "wellington": [174.7762, -41.2865],
  "niger": [8.0812, 17.6078],
  "nigeria": [8.6753, 9.0820],
  "lagos": [3.4064, 6.5244],
  "abuja": [7.4951, 9.0765],
  "north korea": [127.5101, 40.3399],
  "norway": [8.4689, 60.4720],
  "oslo": [10.7522, 59.9139],
  "oman": [55.9233, 21.5126],
  "muscat": [58.5884, 23.5880],
  "papua": [143.9555, -6.3150],
  "paraguay": [-58.4438, -23.4425],
  "peru": [-75.0152, -9.1900],
  "lima": [-77.0428, -12.0464],
  "philippines": [121.7740, 12.8797],
  "manila": [120.9842, 14.5995],
  "poland": [19.1451, 51.9194],
  "warsaw": [21.0122, 52.2297],
  "portugal": [-8.2245, 39.3999],
  "lisbon": [-9.1393, 38.7223],
  "qatar": [51.1839, 25.3548],
  "doha": [51.5310, 25.2854],
  "romania": [24.9668, 45.9432],
  "bucharest": [26.1025, 44.4268],
  "rwanda": [29.8739, -1.9403],
  "kigali": [30.0609, -1.9441],
  "scotland": [-4.2026, 56.4907],
  "senegal": [-14.4524, 14.4974],
  "dakar": [-17.4677, 14.7167],
  "serbia": [20.5405, 44.0165],
  "belgrade": [20.4489, 44.7866],
  "sierra leone": [-11.7799, 8.4606],
  "singapore": [103.8198, 1.3521],
  "slovakia": [19.6990, 48.6690],
  "bratislava": [17.1077, 48.1486],
  "slovenia": [14.9955, 46.1512],
  "ljubljana": [14.5095, 46.0569],
  "somalia": [46.1996, 5.1521],
  "mogadishu": [45.3182, 2.0469],
  "south africa": [25.5449, -30.5595],
  "johannesburg": [28.0473, -26.2041],
  "pretoria": [28.1874, -25.7461],
  "cape town": [18.4241, -33.9249],
  "south korea": [127.7669, 35.9078],
  "south sudan": [31.3070, 6.8770],
  "spain": [-3.7492, 40.4637],
  "madrid": [-3.7038, 40.4168],
  "barcelona": [2.1734, 41.3851],
  "sri lanka": [80.7718, 7.8731],
  "colombo": [79.8612, 6.9271],
  "sudan": [30.2176, 12.8628],
  "khartoum": [32.5599, 15.5007],
  "sweden": [18.6435, 60.1282],
  "stockholm": [18.0686, 59.3293],
  "switzerland": [8.2275, 46.8182],
  "zurich": [8.5417, 47.3769],
  "geneva": [6.1432, 46.2044],
  "taipei": [121.5654, 25.0330],
  "tajikistan": [71.2761, 38.8610],
  "dushanbe": [68.7814, 38.5736],
  "tanzania": [34.8888, -6.3690],
  "dar es salaam": [39.2083, -6.7924],
  "thailand": [100.9925, 15.8700],
  "bangkok": [100.5018, 13.7563],
  "timor": [125.7275, -8.8736],
  "togo": [0.8248, 8.6195],
  "trinidad": [-61.2225, 10.6918],
  "tunisia": [9.5375, 33.8869],
  "tunis": [10.1658, 36.8065],
  "turkmenistan": [59.5563, 38.9697],
  "ashgabat": [58.3830, 37.9760],
  "uganda": [32.2903, 1.3733],
  "kampala": [32.5712, 0.3476],
  "uae": [53.8478, 23.4241],
  "abu dhabi": [54.3667, 24.4539],
  "uruguay": [-55.7658, -32.5228],
  "montevideo": [-56.1645, -34.9011],
  "uzbekistan": [64.5853, 41.3775],
  "tashkent": [69.2401, 41.2995],
  "vatican": [12.4534, 41.9022],
  "venezuela": [-66.5897, 6.4238],
  "caracas": [-66.9036, 10.4806],
  "vietnam": [108.2772, 14.0583],
  "hanoi": [105.8542, 21.0278],
  "ho chi minh": [106.6602, 10.7620],
  "wales": [-3.7837, 52.1307],
  "zambia": [27.8493, -13.1339],
  "harare": [31.0297, -17.8252],
  "zimbabwe": [29.1549, -19.0154]
};

const assignCoordinates = (title) => {
  const lowerTitle = ` ${title.toLowerCase()} `;
  for (const [key, coords] of Object.entries(GEO_DICTIONARY)) {
    if (lowerTitle.includes(key)) {
      return [
        coords[0] + (Math.random() - 0.5) * 2,
        coords[1] + (Math.random() - 0.5) * 2
      ];
    }
  }
  return null;
};

export const fetchGDELTGeoData = async () => {
  try {
    const topics = ["", "WORLD", "TECHNOLOGY", "SCIENCE", "HEALTH", "ENTERTAINMENT", "SPORTS", "BREAKING"];
    let allArticles = [];

    await Promise.all(topics.map(async (topic) => {
      try {
        let url = `/api/googlenews/rss?hl=en-US&gl=US&ceid=US:en`;
        if (topic === "BREAKING") {
          url = `/api/googlenews/rss/search?q=breaking+news&hl=en-US&gl=US&ceid=US:en`;
        } else if (topic) {
          url = `/api/googlenews/rss/headlines/section/topic/${topic}?hl=en-US&gl=US&ceid=US:en`;
        }
        
        const response = await fetch(url);
        if (!response.ok) return;
        
        const text = await response.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, "application/xml");
        const items = xml.querySelectorAll("item");
        
        items.forEach(item => {
          const title = item.querySelector("title")?.textContent || "";
          const link = item.querySelector("link")?.textContent || "";
          const source = item.querySelector("source")?.textContent || "Google News";
          const rawDesc = item.querySelector("description")?.textContent || "";
          const pubDate = item.querySelector("pubDate")?.textContent || "";
          
          const plainDesc = rawDesc.replace(/<[^>]*>?/gm, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
          
          // Prevent duplicates
          if (!allArticles.find(a => a.title === title)) {
            allArticles.push({ 
              title, 
              summary: plainDesc || "No summary available for this developing story.", 
              description: `Category: ${topic || 'TOP STORIES'}`, 
              news_link: link,
              pubDate
            });
          }
        });
      } catch (err) {
        console.error(`Failed to fetch topic ${topic}:`, err);
      }
    }));

    const features = allArticles.filter(a => a && a.title).map(article => {
      const coords = assignCoordinates(article.title);
      if (!coords) return null;
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: coords },
        properties: { 
          name: article.title,
          html: article.summary || "No summary available for this developing story.",
          description: article.description || "",
          link: article.news_link,
          pubDate: article.pubDate
        }
      };
    }).filter(Boolean);

    return { type: "FeatureCollection", features: features };
  } catch (error) {
    console.error("Failed to fetch Google News data:", error);
    return { type: "FeatureCollection", features: [] };
  }
};

export const fetchGDELTByTopic = async (topic) => {
  return { type: "FeatureCollection", features: [] };
};
