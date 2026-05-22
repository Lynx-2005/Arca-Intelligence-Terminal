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
  "europe": [15.2551, 54.5260]
};

const FALLBACK_HUBS = [
  [-74.0060, 40.7128], // NY
  [-0.1276, 51.5072], // London
  [139.6917, 35.6895], // Tokyo
  [114.1694, 22.3193], // HK
  [103.8198, 1.3521], // Singapore
  [8.5417, 47.3769], // Zurich
  [151.2093, -33.8688] // Sydney
];

const assignCoordinates = (title) => {
  const lowerTitle = ` ${title.toLowerCase()} `;
  for (const [key, coords] of Object.entries(GEO_DICTIONARY)) {
    if (lowerTitle.includes(key)) {
      // Add slight jitter so points in same country don't overlap perfectly
      return [
        coords[0] + (Math.random() - 0.5) * 2,
        coords[1] + (Math.random() - 0.5) * 2
      ];
    }
  }
  // If no match, hash the title to pick a consistent fallback hub with some spread
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hubIndex = Math.abs(hash) % FALLBACK_HUBS.length;
  const hub = FALLBACK_HUBS[hubIndex];
  
  // Create a wider spread for non-specific global news around financial hubs
  return [
    hub[0] + (Math.random() - 0.5) * 15,
    hub[1] + (Math.random() - 0.5) * 15
  ];
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
          
          const plainDesc = rawDesc.replace(/<[^>]*>?/gm, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
          
          // Prevent duplicates
          if (!allArticles.find(a => a.title === title)) {
            allArticles.push({ 
              title, 
              summary: plainDesc || "No summary available for this developing story.", 
              description: `Category: ${topic || 'TOP STORIES'}`, 
              news_link: link 
            });
          }
        });
      } catch (err) {
        console.error(`Failed to fetch topic ${topic}:`, err);
      }
    }));

    const features = allArticles.filter(a => a && a.title).map(article => {
      const coords = assignCoordinates(article.title);
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: coords },
        properties: { 
          name: article.title,
          html: article.summary || "No summary available for this developing story.",
          description: article.description || "",
          link: article.news_link
        }
      };
    });

    return { type: "FeatureCollection", features: features };
  } catch (error) {
    console.error("Failed to fetch Google News data:", error);
    return { type: "FeatureCollection", features: [] };
  }
};

export const fetchGDELTByTopic = async (topic) => {
  return { type: "FeatureCollection", features: [] };
};
