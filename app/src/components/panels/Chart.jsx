import React, { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries, LineSeries, HistogramSeries, CrosshairMode } from 'lightweight-charts';
import Panel from '../Panel';
import { ApiService } from '../../services/api';
import { useStore } from '../../store';
import MicrostructurePanel from './MicrostructurePanel';
import { Activity, Layers, X } from 'lucide-react';

const normalizeHistoryData = data => {
  if (!Array.isArray(data)) return [];
  return data
    .filter(bar =>
      bar &&
      bar.time != null &&
      bar.open != null &&
      bar.high != null &&
      bar.low != null &&
      bar.close != null
    )
    .map(bar => ({
      time: typeof bar.time === 'string' ? new Date(bar.time).getTime() / 1000 : (bar.time > 1e10 ? Math.floor(bar.time / 1000) : bar.time),
      open: Number(bar.open),
      high: Number(bar.high),
      low: Number(bar.low),
      close: Number(bar.close),
      volume: bar.volume ? Number(bar.volume) : 0
    }))
    .filter(bar => !isNaN(bar.time) && !isNaN(bar.close))
    .sort((a, b) => a.time - b.time);
};

const toLineSeriesData = data => normalizeHistoryData(data).map(bar => ({
  time: bar.time,
  value: bar.close
}));

// Technical Indicator Calculations
const calculateSMA = (data, period) => {
  const sma = [];
  if (data.length < period) return [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    sma.push({ time: data[i].time, value: sum / period });
  }
  return sma;
};

const calculateEMA = (data, period) => {
  const ema = [];
  if (data.length === 0) return [];
  let prev = data[0].close;
  const k = 2 / (period + 1);
  ema.push({ time: data[0].time, value: prev });
  for (let i = 1; i < data.length; i++) {
    const val = data[i].close * k + prev * (1 - k);
    ema.push({ time: data[i].time, value: val });
    prev = val;
  }
  return ema;
};

const calculateBollingerBands = (data, period = 20, multiplier = 2) => {
  const bands = { upper: [], middle: [], lower: [] };
  if (data.length < period) return bands;
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    const mean = sum / period;
    let varianceSum = 0;
    for (let j = 0; j < period; j++) {
      varianceSum += Math.pow(data[i - j].close - mean, 2);
    }
    const stdDev = Math.sqrt(varianceSum / period);
    bands.middle.push({ time: data[i].time, value: mean });
    bands.upper.push({ time: data[i].time, value: mean + multiplier * stdDev });
    bands.lower.push({ time: data[i].time, value: mean - multiplier * stdDev });
  }
  return bands;
};

const calculateRSI = (data, period = 14) => {
  if (data.length <= period) return [];
  const rsi = [];
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = data[i].close - data[i - 1].close;
    if (diff > 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  rsi.push({ time: data[period].time, value: 100 - (100 / (1 + rs)) });

  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i].close - data[i - 1].close;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi.push({ time: data[i].time, value: 100 - (100 / (1 + rs)) });
  }
  return rsi;
};

const calculateMACD = (data, slowPeriod = 26, fastPeriod = 12, signalPeriod = 9) => {
  if (data.length < slowPeriod) return { macdLine: [], signalLine: [], histogram: [] };

  const ema12 = calculateEMA(data, fastPeriod);
  const ema26 = calculateEMA(data, slowPeriod);

  const macdLine = [];
  ema26.forEach(slowVal => {
    const fastVal = ema12.find(f => f.time === slowVal.time);
    if (fastVal) {
      macdLine.push({ time: slowVal.time, value: fastVal.value - slowVal.value });
    }
  });

  if (macdLine.length === 0) return { macdLine: [], signalLine: [], histogram: [] };

  const emaOnVal = (valData, p) => {
    const emaResult = [];
    if (valData.length === 0) return [];
    let prev = valData[0].value;
    const k = 2 / (p + 1);
    emaResult.push({ time: valData[0].time, value: prev });
    for (let i = 1; i < valData.length; i++) {
      const val = valData[i].value * k + prev * (1 - k);
      emaResult.push({ time: valData[i].time, value: val });
      prev = val;
    }
    return emaResult;
  };

  const signalLine = emaOnVal(macdLine, signalPeriod);
  const histogram = [];
  signalLine.forEach(sigVal => {
    const mVal = macdLine.find(m => m.time === sigVal.time);
    if (mVal) {
      histogram.push({ time: sigVal.time, value: mVal.value - sigVal.value });
    }
  });

  return { macdLine, signalLine, histogram };
};

const calculateStochastic = (data, kPeriod = 14, dPeriod = 3) => {
  const stochK = [];
  if (data.length < kPeriod) return { stochK: [], stochD: [] };

  for (let i = kPeriod - 1; i < data.length; i++) {
    let lowestLow = Infinity;
    let highestHigh = -Infinity;
    for (let j = 0; j < kPeriod; j++) {
      const bar = data[i - j];
      if (bar.low < lowestLow) lowestLow = bar.low;
      if (bar.high > highestHigh) highestHigh = bar.high;
    }
    const range = highestHigh - lowestLow;
    const kVal = range === 0 ? 50 : ((data[i].close - lowestLow) / range) * 100;
    stochK.push({ time: data[i].time, value: kVal });
  }

  const stochD = [];
  if (stochK.length < dPeriod) return { stochK, stochD: [] };

  for (let i = dPeriod - 1; i < stochK.length; i++) {
    let sum = 0;
    for (let j = 0; j < dPeriod; j++) {
      sum += stochK[i - j].value;
    }
    stochD.push({ time: stochK[i].time, value: sum / dPeriod });
  }

  return { stochK, stochD };
};

const TIMEFRAMES = ['1m', '5m', '15m', '1h', '1d', '1wk'];

const Chart = ({ ticker }) => {
  const chartContainerRef = useRef(null);
  const subChartContainerRef = useRef(null);

  const chartRef = useRef(null);
  const subChartRef = useRef(null);

  const mainSeriesRef = useRef(null);
  const priceLineSeriesRef = useRef(null);
  const compareSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);

  // Overlay Series Refs
  const overlaySeriesRefs = useRef({});
  // Oscillator Series Refs
  const oscillatorSeriesRefs = useRef({});

  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('1m');
  const [chartType, setChartType] = useState('candlestick');
  const [activeOverlay, setActiveOverlay] = useState('none');
  const [activeOscillator, setActiveOscillator] = useState('none');
  const [activeTab, setActiveTab] = useState('station');

  const comparedTicker = useStore(state => state.comparedTicker);
  const setComparedTicker = useStore(state => state.setComparedTicker);

  const [compareInput, setCompareInput] = useState('');
  const [rawHistory, setRawHistory] = useState([]);
  const [comparedData, setComparedData] = useState([]);
  const [hudData, setHudData] = useState(null);

  const tradeAccumulatorRef = useRef({ price: null, vol: 0, time: null, high: null, low: null });
  const needsFitContentRef = useRef(false);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: 'solid', color: 'transparent' },
        textColor: '#888888',
        fontSize: 9,
        fontFamily: 'var(--font-mono)'
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.02)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.02)' }
      },
      crosshair: { mode: CrosshairMode.Normal },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.06)',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.06)'
      },
      leftPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.06)',
        visible: false
      }
    });

    const subChart = subChartContainerRef.current ? createChart(subChartContainerRef.current, {
      layout: {
        background: { type: 'solid', color: 'transparent' },
        textColor: '#888888',
        fontSize: 9,
        fontFamily: 'var(--font-mono)'
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.02)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.02)' }
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.06)',
        timeVisible: true,
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.06)'
      }
    }) : null;

    chartRef.current = chart;
    subChartRef.current = subChart;

    mainSeriesRef.current = chart.addSeries(CandlestickSeries, {
      upColor: '#00ff66',
      downColor: '#ff3333',
      borderVisible: false,
      wickUpColor: '#00ff66',
      wickDownColor: '#ff3333'
    });

    priceLineSeriesRef.current = chart.addSeries(LineSeries, {
      color: '#00ff66',
      lineWidth: 2,
      priceLineVisible: false
    });

    volumeSeriesRef.current = chart.addSeries(HistogramSeries, {
      color: 'rgba(0, 255, 102, 0.12)',
      priceFormat: { type: 'volume' },
      priceScaleId: ''
    });

    chart.priceScale('').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0
      }
    });

    // Initialize overlay line series
    overlaySeriesRefs.current.ema9 = chart.addSeries(LineSeries, { color: '#ab47bc', lineWidth: 1.5, title: 'EMA 9', visible: false });
    overlaySeriesRefs.current.ema20 = chart.addSeries(LineSeries, { color: '#ff9800', lineWidth: 1.5, title: 'EMA 20', visible: false });
    overlaySeriesRefs.current.sma50 = chart.addSeries(LineSeries, { color: '#03a9f4', lineWidth: 1.5, title: 'SMA 50', visible: false });
    overlaySeriesRefs.current.sma200 = chart.addSeries(LineSeries, { color: '#f44336', lineWidth: 1.5, title: 'SMA 200', visible: false });
    overlaySeriesRefs.current.bbUpper = chart.addSeries(LineSeries, { color: '#00e5ff', lineWidth: 1, lineStyle: 2, visible: false });
    overlaySeriesRefs.current.bbMiddle = chart.addSeries(LineSeries, { color: '#00e5ff', lineWidth: 1, visible: false });
    overlaySeriesRefs.current.bbLower = chart.addSeries(LineSeries, { color: '#00e5ff', lineWidth: 1, lineStyle: 2, visible: false });

    if (subChart) {
      oscillatorSeriesRefs.current.rsi = subChart.addSeries(LineSeries, { color: '#ffeb3b', lineWidth: 1.5, visible: false });
      oscillatorSeriesRefs.current.rsiUpper = subChart.addSeries(LineSeries, { color: 'rgba(255, 51, 51, 0.5)', lineWidth: 1, lineStyle: 2, visible: false });
      oscillatorSeriesRefs.current.rsiLower = subChart.addSeries(LineSeries, { color: 'rgba(0, 255, 102, 0.5)', lineWidth: 1, lineStyle: 2, visible: false });
      
      oscillatorSeriesRefs.current.macdLine = subChart.addSeries(LineSeries, { color: '#00e5ff', lineWidth: 1.5, visible: false });
      oscillatorSeriesRefs.current.macdSignal = subChart.addSeries(LineSeries, { color: '#ff9800', lineWidth: 1.5, visible: false });
      oscillatorSeriesRefs.current.macdHist = subChart.addSeries(HistogramSeries, { color: 'rgba(0, 255, 102, 0.4)', priceFormat: { type: 'volume' }, visible: false });
      
      oscillatorSeriesRefs.current.stochK = subChart.addSeries(LineSeries, { color: '#00e5ff', lineWidth: 1.5, visible: false });
      oscillatorSeriesRefs.current.stochD = subChart.addSeries(LineSeries, { color: '#ff9800', lineWidth: 1.5, lineStyle: 2, visible: false });
      oscillatorSeriesRefs.current.stochUpper = subChart.addSeries(LineSeries, { color: 'rgba(255, 51, 51, 0.5)', lineWidth: 1, lineStyle: 2, visible: false });
      oscillatorSeriesRefs.current.stochLower = subChart.addSeries(LineSeries, { color: 'rgba(0, 255, 102, 0.5)', lineWidth: 1, lineStyle: 2, visible: false });
    }
    
    chart.subscribeCrosshairMove(param => {
      if (param.time) {
        const data = param.seriesData.get(mainSeriesRef.current) || param.seriesData.get(priceLineSeriesRef.current);
        const vol = param.seriesData.get(volumeSeriesRef.current);
        if (data) {
          setHudData({
            time: param.time,
            open: data.open !== undefined ? data.open : data.value,
            high: data.high !== undefined ? data.high : data.value,
            low: data.low !== undefined ? data.low : data.value,
            close: data.close !== undefined ? data.close : data.value,
            volume: vol ? vol.value : 0
          });
        }
      } else {
        // Fallback to last bar
        const lastBar = rawHistory[rawHistory.length - 1];
        if (lastBar) {
          setHudData({
            time: lastBar.time,
            open: lastBar.open,
            high: lastBar.high,
            low: lastBar.low,
            close: lastBar.close,
            volume: lastBar.volume
          });
        }
      }
    });

    const handleResize = () => {
      const width = chartContainerRef.current?.clientWidth;
      if (width) {
        chart.applyOptions({ width });
        if (subChart) subChart.applyOptions({ width });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      if (subChart) subChart.remove();
      chartRef.current = null;
      subChartRef.current = null;
    };
  }, [activeOscillator]); // re-init chart when oscillator changes to handle subchart container existence

  useEffect(() => {
    if (!ticker) return;
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await ApiService.getHistoricalData(ticker, timeframe);
        setRawHistory(normalizeHistoryData(data));
        needsFitContentRef.current = true;
      } catch (e) {
        console.error('Failed to load chart data', e);
        setRawHistory([]);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [ticker, timeframe]);

  // Web Socket Connection for Live Data
  useEffect(() => {
    if (!ticker) return;

    const isCryptoTicker = t => {
      const s = (t || '').trim().toUpperCase();
      if (s.includes('-')) return ['USD', 'USDT', 'USDC', 'BUSD', 'EUR', 'BTC', 'ETH'].includes(s.split('-')[1]);
      if (s.endsWith('USDT') || s.endsWith('USDC') || (s.endsWith('USD') && s.length > 3)) return true;
      return false;
    };

    const toBinanceSymbol = t => {
      const s = (t || '').trim().toUpperCase();
      if (s.includes('-')) {
        const [base, quote] = s.split('-');
        return quote === 'USD' ? `${base}USDT` : `${base}${quote}`;
      }
      if (s.endsWith('USD') && s.length > 3) return `${s.slice(0, -3)}USDT`;
      return s;
    };

    const crypto = isCryptoTicker(ticker);
    let wsUrl = '';
    if (crypto) {
      const binanceSymbol = toBinanceSymbol(ticker).toLowerCase();
      wsUrl = `wss://stream.binance.com:9443/stream?streams=${binanceSymbol}@trade`;
    } else {
      wsUrl = import.meta.env.VITE_STOCK_ORDERBOOK_WS_URL || 'ws://localhost:3001';
    }

    let active = true;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      if (!crypto && active) {
        ws.send(JSON.stringify({ type: 'subscribe', ticker: ticker.toUpperCase() }));
      }
    };

    ws.onmessage = event => {
      if (!active) return;
      try {
        const payload = JSON.parse(event.data);
        const data = payload.data || payload;
        
        let price, vol, time;
        if (crypto && data.e === 'trade') {
           price = parseFloat(data.p);
           vol = parseFloat(data.q);
           time = data.T;
        } else if (!crypto && data.e === 'trade') {
           price = parseFloat(data.p);
           vol = parseFloat(data.q);
           time = data.T;
        }

        if (price && vol && time) {
           const accum = tradeAccumulatorRef.current;
           accum.price = price;
           accum.vol += vol;
           accum.high = accum.high === null ? price : Math.max(accum.high, price);
           accum.low = accum.low === null ? price : Math.min(accum.low, price);
           accum.time = time;
        }
      } catch (e) {
        // ignore
      }
    };

    return () => {
      active = false;
      ws.close();
    };
  }, [ticker]);

  // Trade Aggregation Interval
  useEffect(() => {
    if (!ticker) return;
    const intervalId = setInterval(() => {
      const accum = tradeAccumulatorRef.current;
      if (accum.price !== null) {
        setRawHistory(prev => {
          if (prev.length === 0) return prev;
          
          const newHist = [...prev];
          const last = { ...newHist[newHist.length - 1] };
          
          const tfMap = { '1m': 60, '5m': 300, '15m': 900, '1h': 3600, '1d': 86400, '1wk': 604800 };
          const bucketSize = tfMap[timeframe] || 60;
          const tradeSec = Math.floor(accum.time / 1000);
          
          if (tradeSec >= last.time + bucketSize && bucketSize < 86400) {
            newHist.push({
               time: last.time + bucketSize,
               open: last.close,
               high: Math.max(last.close, accum.high),
               low: Math.min(last.close, accum.low),
               close: accum.price,
               volume: accum.vol
            });
          } else {
            last.close = accum.price;
            last.high = Math.max(last.high, accum.high);
            last.low = Math.min(last.low, accum.low);
            last.volume += accum.vol;
            newHist[newHist.length - 1] = last;
          }
          
          return newHist;
        });
        
        tradeAccumulatorRef.current = { price: null, vol: 0, time: null, high: null, low: null };
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, [ticker, timeframe]);

  useEffect(() => {
    if (!comparedTicker) {
      setComparedData([]);
      return;
    }
    const loadCompare = async () => {
      try {
        const data = await ApiService.getHistoricalData(comparedTicker, timeframe);
        setComparedData(normalizeHistoryData(data));
      } catch (err) {
        console.error('Failed to load compare symbol data', err);
        setComparedData([]);
      }
    };
    loadCompare();
  }, [comparedTicker, timeframe]);

  useEffect(() => {
    if (rawHistory.length === 0 || !mainSeriesRef.current) return;

    let filtered = rawHistory;
    
    // De-duplicate times
    const uniqueTimes = new Set();
    filtered = filtered.filter(bar => {
      if (uniqueTimes.has(bar.time)) return false;
      uniqueTimes.add(bar.time);
      return true;
    });

    if (filtered.length === 0) return;

    if (chartType === 'line') {
      mainSeriesRef.current.applyOptions({ visible: false });
      priceLineSeriesRef.current.applyOptions({ visible: true });
      priceLineSeriesRef.current.setData(filtered.map(d => ({ time: d.time, value: d.close })));
    } else {
      mainSeriesRef.current.applyOptions({ visible: true });
      priceLineSeriesRef.current.applyOptions({ visible: false });
      mainSeriesRef.current.setData(filtered);
    }

    const volumes = filtered.map(d => ({
      time: d.time,
      value: d.volume,
      color: d.close >= d.open ? 'rgba(0, 255, 102, 0.12)' : 'rgba(255, 51, 51, 0.12)'
    }));
    volumeSeriesRef.current.setData(volumes);

    // Apply Overlays
    Object.values(overlaySeriesRefs.current).forEach(series => series.applyOptions({ visible: false }));
    if (activeOverlay === 'ema9') {
      overlaySeriesRefs.current.ema9.setData(calculateEMA(filtered, 9));
      overlaySeriesRefs.current.ema9.applyOptions({ visible: true });
    } else if (activeOverlay === 'ema20') {
      overlaySeriesRefs.current.ema20.setData(calculateEMA(filtered, 20));
      overlaySeriesRefs.current.ema20.applyOptions({ visible: true });
    } else if (activeOverlay === 'sma50') {
      overlaySeriesRefs.current.sma50.setData(calculateSMA(filtered, 50));
      overlaySeriesRefs.current.sma50.applyOptions({ visible: true });
    } else if (activeOverlay === 'sma200') {
      overlaySeriesRefs.current.sma200.setData(calculateSMA(filtered, 200));
      overlaySeriesRefs.current.sma200.applyOptions({ visible: true });
    } else if (activeOverlay === 'bollinger') {
      const bands = calculateBollingerBands(filtered, 20, 2);
      overlaySeriesRefs.current.bbUpper.setData(bands.upper);
      overlaySeriesRefs.current.bbMiddle.setData(bands.middle);
      overlaySeriesRefs.current.bbLower.setData(bands.lower);
      overlaySeriesRefs.current.bbUpper.applyOptions({ visible: true });
      overlaySeriesRefs.current.bbMiddle.applyOptions({ visible: true });
      overlaySeriesRefs.current.bbLower.applyOptions({ visible: true });
    }

    // Apply Oscillators
    if (subChartRef.current) {
      Object.values(oscillatorSeriesRefs.current).forEach(series => series.applyOptions({ visible: false }));
      if (activeOscillator === 'rsi') {
        const rsiData = calculateRSI(filtered, 14);
        if (rsiData.length > 0) {
          oscillatorSeriesRefs.current.rsi.setData(rsiData);
          oscillatorSeriesRefs.current.rsiUpper.setData(filtered.map(d => ({ time: d.time, value: 70 })));
          oscillatorSeriesRefs.current.rsiLower.setData(filtered.map(d => ({ time: d.time, value: 30 })));
          oscillatorSeriesRefs.current.rsi.applyOptions({ visible: true });
          oscillatorSeriesRefs.current.rsiUpper.applyOptions({ visible: true });
          oscillatorSeriesRefs.current.rsiLower.applyOptions({ visible: true });
        }
      } else if (activeOscillator === 'macd') {
        const macd = calculateMACD(filtered);
        if (macd.macdLine.length > 0) {
          oscillatorSeriesRefs.current.macdLine.setData(macd.macdLine);
          oscillatorSeriesRefs.current.macdSignal.setData(macd.signalLine);
          oscillatorSeriesRefs.current.macdHist.setData(macd.histogram.map(d => ({
            time: d.time,
            value: d.value,
            color: d.value >= 0 ? 'rgba(0, 255, 102, 0.4)' : 'rgba(255, 51, 51, 0.4)'
          })));
          oscillatorSeriesRefs.current.macdLine.applyOptions({ visible: true });
          oscillatorSeriesRefs.current.macdSignal.applyOptions({ visible: true });
          oscillatorSeriesRefs.current.macdHist.applyOptions({ visible: true });
        }
      } else if (activeOscillator === 'stoch') {
        const stoch = calculateStochastic(filtered);
        if (stoch.stochK.length > 0) {
          oscillatorSeriesRefs.current.stochK.setData(stoch.stochK);
          oscillatorSeriesRefs.current.stochD.setData(stoch.stochD);
          oscillatorSeriesRefs.current.stochUpper.setData(filtered.map(d => ({ time: d.time, value: 80 })));
          oscillatorSeriesRefs.current.stochLower.setData(filtered.map(d => ({ time: d.time, value: 20 })));
          oscillatorSeriesRefs.current.stochK.applyOptions({ visible: true });
          oscillatorSeriesRefs.current.stochD.applyOptions({ visible: true });
          oscillatorSeriesRefs.current.stochUpper.applyOptions({ visible: true });
          oscillatorSeriesRefs.current.stochLower.applyOptions({ visible: true });
        }
      }
    }

    if (comparedTicker && comparedData.length > 0 && chartRef.current) {
      if (!compareSeriesRef.current) {
        compareSeriesRef.current = chartRef.current.addSeries(LineSeries, {
          color: '#ff00ff',
          lineWidth: 1.5,
          priceScaleId: 'left',
          priceLineVisible: false
        });
      }
      
      let compFiltered = comparedData;
      const compUnique = new Set();
      compFiltered = compFiltered.filter(bar => {
        if (compUnique.has(bar.time)) return false;
        compUnique.add(bar.time);
        return true;
      });

      compareSeriesRef.current.setData(toLineSeriesData(compFiltered));
      compareSeriesRef.current.applyOptions({ visible: true, title: comparedTicker });
      chartRef.current.priceScale('left').applyOptions({ visible: true });
    } else {
      if (compareSeriesRef.current && chartRef.current) {
        try {
          chartRef.current.removeSeries(compareSeriesRef.current);
        } catch (e) {}
        compareSeriesRef.current = null;
      }
      try {
        chartRef.current?.priceScale('left').applyOptions({ visible: false });
      } catch (e) {}
    }

    const lastBar = filtered[filtered.length - 1];
    if (lastBar) {
      setHudData({
        time: lastBar.time,
        open: lastBar.open,
        high: lastBar.high,
        low: lastBar.low,
        close: lastBar.close,
        volume: lastBar.volume
      });
    }

    if (needsFitContentRef.current) {
      chartRef.current?.timeScale().fitContent();
      subChartRef.current?.timeScale().fitContent();
      needsFitContentRef.current = false;
    }
  }, [rawHistory, timeframe, chartType, comparedData, activeOverlay, activeOscillator]);

  const handleCompareSubmit = (e) => {
    e.preventDefault();
    const symbol = compareInput.trim().toUpperCase();
    if (symbol) {
      setComparedTicker(symbol);
      setCompareInput('');
    }
  };

  const clearComparison = () => {
    setComparedTicker(null);
  };
  
  const formatTime = (time) => {
    if (!time) return '';
    const date = typeof time === 'number' ? new Date(time * 1000) : new Date(time);
    return date.toLocaleString();
  };

  return (
    <Panel title={`${ticker || 'SELECT TICKER'} - ANALYTICS TERMINAL`} className="h-full">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{
          display: 'flex',
          background: 'var(--panel-header-bg)',
          borderBottom: '1px solid var(--panel-border)',
          padding: '0 8px'
        }}>
          <button
            onClick={() => setActiveTab('station')}
            style={{
              background: activeTab === 'station' ? 'var(--panel-bg)' : 'transparent',
              border: 'none',
              borderRight: '1px solid var(--panel-border)',
              borderTop: activeTab === 'station' ? '2px solid var(--accent-amber)' : '2px solid transparent',
              color: activeTab === 'station' ? 'var(--accent-amber)' : 'var(--text-secondary)',
              padding: '6px 16px',
              fontWeight: 'bold',
              fontSize: '9px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: activeTab === 'station' ? '-1px' : '0'
            }}
          >
            <Activity size={10} />
            INTERACTIVE STATION
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            style={{
              background: activeTab === 'stats' ? 'var(--panel-bg)' : 'transparent',
              border: 'none',
              borderRight: '1px solid var(--panel-border)',
              borderTop: activeTab === 'stats' ? '2px solid var(--accent-amber)' : '2px solid transparent',
              color: activeTab === 'stats' ? 'var(--accent-amber)' : 'var(--text-secondary)',
              padding: '6px 16px',
              fontWeight: 'bold',
              fontSize: '9px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: activeTab === 'stats' ? '-1px' : '0'
            }}
          >
            <Layers size={10} />
            MICROSTRUCTURE INTEL
          </button>
        </div>

        {activeTab === 'station' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <div style={{
              background: 'var(--panel-header-bg)',
              borderBottom: '1px solid var(--panel-border)',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '4px 8px',
              gap: '8px',
              fontSize: '9px'
            }}>
              <div style={{ display: 'flex', gap: '3px' }}>
                {TIMEFRAMES.map(tf => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    style={{
                      background: timeframe === tf ? 'var(--accent-amber)' : 'rgba(255,255,255,0.03)',
                      border: '1px solid #222',
                      color: timeframe === tf ? '#000' : 'var(--text-secondary)',
                      padding: '2px 5px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      borderRadius: '2px'
                    }}
                  >
                    {tf.toUpperCase()}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <select
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value)}
                  style={{
                    background: '#0b0b0b',
                    border: '1px solid var(--panel-border)',
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '9px',
                    padding: '3px 6px'
                  }}
                >
                  <option value="candlestick">Candlestick</option>
                  <option value="line">Line Graph</option>
                </select>
                
                <select
                  value={activeOverlay}
                  onChange={(e) => setActiveOverlay(e.target.value)}
                  style={{
                    background: '#0b0b0b',
                    border: '1px solid var(--panel-border)',
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '9px',
                    padding: '3px 6px'
                  }}
                >
                  <option value="none">No Overlay</option>
                  <option value="ema9">EMA 9</option>
                  <option value="ema20">EMA 20</option>
                  <option value="sma50">SMA 50</option>
                  <option value="sma200">SMA 200</option>
                  <option value="bollinger">Bollinger Bands</option>
                </select>

                <select
                  value={activeOscillator}
                  onChange={(e) => setActiveOscillator(e.target.value)}
                  style={{
                    background: '#0b0b0b',
                    border: '1px solid var(--panel-border)',
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '9px',
                    padding: '3px 6px'
                  }}
                >
                  <option value="none">No Oscillator</option>
                  <option value="rsi">RSI</option>
                  <option value="macd">MACD</option>
                  <option value="stoch">Stochastic</option>
                </select>
              </div>

              <form onSubmit={handleCompareSubmit} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="text"
                  value={compareInput}
                  onChange={(e) => setCompareInput(e.target.value)}
                  placeholder="COMPARE"
                  style={{
                    background: '#050505',
                    border: '1px solid var(--panel-border)',
                    color: 'var(--text-primary)',
                    padding: '3px 6px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '9px',
                    width: '90px'
                  }}
                />
                <button
                  type="submit"
                  style={{
                    background: 'var(--accent-amber)',
                    color: '#000',
                    border: 'none',
                    padding: '3px 8px',
                    fontWeight: 'bold',
                    fontSize: '9px',
                    cursor: 'pointer'
                  }}
                >
                  ADD
                </button>
                {comparedTicker && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
                    {comparedTicker}
                    <X size={8} onClick={clearComparison} style={{ cursor: 'pointer' }} />
                  </div>
                )}
              </form>
            </div>

            {hudData && (
              <div style={{
                display: 'flex',
                gap: '10px',
                padding: '4px 8px',
                background: 'rgba(0,0,0,0.35)',
                borderBottom: '1px solid var(--panel-border)',
                fontSize: '9px',
                color: 'var(--text-secondary)',
                alignItems: 'center'
              }}>
                <span>{formatTime(hudData.time)}</span>
                <span>O {hudData.open?.toFixed(2)}</span>
                <span>H {hudData.high?.toFixed(2)}</span>
                <span>L {hudData.low?.toFixed(2)}</span>
                <span>C {hudData.close?.toFixed(2)}</span>
                <span>V {(hudData.volume || 0).toLocaleString()}</span>
              </div>
            )}

            <div style={{ position: 'relative', flex: activeOscillator !== 'none' ? 0.7 : 1, minHeight: 0 }}>
              {loading && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10,
                  fontSize: '9px',
                  color: 'var(--accent-amber)',
                  fontWeight: 'bold',
                  background: 'rgba(0,0,0,0.85)',
                  padding: '6px 12px',
                  border: '1px solid var(--accent-amber)'
                }}>
                  FETCHING REAL-TIME QUOTES...
                </div>
              )}
              <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }} />
            </div>
            
            {activeOscillator !== 'none' && (
              <div style={{ flex: 0.3, position: 'relative', minHeight: 0, borderTop: '1px solid var(--panel-border)' }}>
                <div ref={subChartContainerRef} style={{ width: '100%', height: '100%' }} />
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <MicrostructurePanel ticker={ticker} enabled={activeTab === 'stats'} />
          </div>
        )}
      </div>
    </Panel>
  );
};

export default Chart;
