import { create } from 'zustand';

export const useStore = create((set) => ({
  // Global Active Context — persist to localStorage so refresh remembers the ticker
  activeTicker: (() => {
    try {
      return localStorage.getItem('arca_active_ticker') || 'AAPL';
    } catch {
      return 'AAPL';
    }
  })(),
  activeQuery: 'markets',
  activeCountry: null,
  activePanel: (() => {
    try {
      return localStorage.getItem('arca_active_panel') || 'MAP';
    } catch {
      return 'MAP';
    }
  })(),

  // Watchlist State (persist to localStorage)
  watchlist: (() => {
    try {
      const stored = localStorage.getItem('arca_watchlist');
      return stored ? JSON.parse(stored) : ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'GOOGL'];
    } catch {
      return ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'GOOGL'];
    }
  })(),

  // Chart Comparison Ticker
  comparedTicker: null,

  // Actions
  setContext: (ticker) => {
    try {
      localStorage.setItem('arca_active_ticker', ticker);
      localStorage.setItem('arca_active_panel', 'COMPANY');
    } catch {
      // ignore
    }
    set({ activeTicker: ticker, activePanel: 'COMPANY' });
  },
  setQuery: (query) => set({ activeQuery: query }),
  setCountry: (countryCode) => {
    try {
      localStorage.setItem('arca_active_panel', 'MACRO');
    } catch {
      // ignore
    }
    set({ activeCountry: countryCode, activePanel: 'MACRO' });
  },
  setPanel: (panelName) => {
    try {
      localStorage.setItem('arca_active_panel', panelName);
    } catch {
      // ignore
    }
    set({ activePanel: panelName });
  },
  
  // Watchlist Actions
  addToWatchlist: (ticker) => set((state) => {
    const formatted = ticker.toUpperCase().trim();
    if (!formatted || state.watchlist.includes(formatted)) return {};
    const newWatchlist = [...state.watchlist, formatted];
    try {
      localStorage.setItem('arca_watchlist', JSON.stringify(newWatchlist));
    } catch (e) {
      console.error(e);
    }
    return { watchlist: newWatchlist };
  }),
  
  removeFromWatchlist: (ticker) => set((state) => {
    const formatted = ticker.toUpperCase().trim();
    const newWatchlist = state.watchlist.filter(t => t !== formatted);
    try {
      localStorage.setItem('arca_watchlist', JSON.stringify(newWatchlist));
    } catch (e) {
      console.error(e);
    }
    // Also clear comparedTicker if it was the one removed (optional)
    return { watchlist: newWatchlist };
  }),

  setComparedTicker: (ticker) => set({ comparedTicker: ticker ? ticker.toUpperCase().trim() : null }),
  
  // Smart Search Context
  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),
  
  // Global App State
  isMapLoaded: false,
  setMapLoaded: (status) => set({ isMapLoaded: status }),
  
  // Model state for LLM
  selectedModel: localStorage.getItem('arca_selected_model') || 'google/gemini-2.5-flash',
  setSelectedModel: (model) => {
    localStorage.setItem('arca_selected_model', model);
    set({ selectedModel: model });
  },
}));
