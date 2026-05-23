import { useState, useEffect } from 'react';

const isCrypto = (ticker) => {
  if (!ticker) return null;
  const t = ticker.toUpperCase();
  if (t.includes('BTC')) return 'BTC';
  if (t.includes('ETH')) return 'ETH';
  if (t.includes('SOL')) return 'SOL';
  return null;
};

export const useDeribitOptions = (ticker, currentPrice) => {
  const [data, setData] = useState({
    loading: true,
    error: null,
    itmCalls: 0,
    otmCalls: 0,
    itmPuts: 0,
    otmPuts: 0,
    gammaExposure: 0,
    totalOI: 0
  });

  useEffect(() => {
    const currency = isCrypto(ticker);
    
    if (!currency) {
      setData(prev => ({ ...prev, loading: false, error: 'Not a supported crypto asset' }));
      return;
    }

    if (!currentPrice || currentPrice <= 0) {
      return; // Wait for current price
    }

    let isMounted = true;
    setData(prev => ({ ...prev, loading: true, error: null }));

    const fetchOptionsData = async () => {
      try {
        const res = await fetch(`https://www.deribit.com/api/v2/public/get_book_summary_by_currency?currency=${currency}&kind=option`);
        if (!res.ok) throw new Error('Failed to fetch Deribit data');
        const json = await res.json();
        
        if (!isMounted) return;

        const options = json.result;
        if (!options || options.length === 0) {
          throw new Error('No options data returned');
        }

        let itmCallsOI = 0;
        let otmCallsOI = 0;
        let itmPutsOI = 0;
        let otmPutsOI = 0;
        let totalOI = 0;

        options.forEach(opt => {
          const instrument = opt.instrument_name; // e.g. "BTC-24JUN22-30000-C"
          const parts = instrument.split('-');
          if (parts.length < 4) return;
          
          const strike = parseFloat(parts[2]);
          const type = parts[3]; // 'C' or 'P'
          const oi = opt.open_interest || 0;
          
          totalOI += oi;

          if (type === 'C') {
            if (strike < currentPrice) itmCallsOI += oi;
            else otmCallsOI += oi;
          } else if (type === 'P') {
            if (strike > currentPrice) itmPutsOI += oi;
            else otmPutsOI += oi;
          }
        });

        if (totalOI === 0) totalOI = 1; // prevent divide by zero

        // Normalize to 0-1 for the heatmap
        setData({
          loading: false,
          error: null,
          itmCalls: itmCallsOI / totalOI,
          otmCalls: otmCallsOI / totalOI,
          itmPuts: itmPutsOI / totalOI,
          otmPuts: otmPutsOI / totalOI,
          totalOI
        });

      } catch (err) {
        if (isMounted) {
          setData(prev => ({ ...prev, loading: false, error: err.message }));
        }
      }
    };

    fetchOptionsData();
    // Poll every 60 seconds
    const interval = setInterval(fetchOptionsData, 60000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [ticker, currentPrice]);

  return data;
};
