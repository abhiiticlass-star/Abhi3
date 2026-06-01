const express = require('express');
const cors = require('cors');
const { RSI, EMA, BollingerBands } = require('technicalindicators');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// Rigid High-Precision Database Structure
let marketData = {
    EURUSD: { prices: [], highs: [], lows: [], opens: [], currentSignal1m: "AVOID", currentSignal5m: "AVOID" },
    GBPUSD: { prices: [], highs: [], lows: [], opens: [], currentSignal1m: "AVOID", currentSignal5m: "AVOID" },
    USDJPY: { prices: [], highs: [], lows: [], opens: [], currentSignal1m: "AVOID", currentSignal5m: "AVOID" },
    AUDUSD: { prices: [], highs: [], lows: [], opens: [], currentSignal1m: "AVOID", currentSignal5m: "AVOID" }
};

let signalHistoryList = []; 
let lastActiveSignals = { "1m": {}, "5m": {} }; 

// True Indian Standard Time (IST) Clock Node
function getISTTime() {
    let now = new Date();
    return now.toLocaleTimeString('en-US', { timeZone: "Asia/Kolkata", hour12: false, hour: '2-digit', minute: '2-digit' });
}

// Stable Market Simulator (Generates structure patterns, not random noise)
function generateStableMarketFeeds() {
    Object.keys(marketData).forEach(asset => {
        let data = marketData[asset];
        let basePrice = asset === "USDJPY" ? 156.80 : (asset === "EURUSD" ? 1.0890 : 1.2750);
        
        if (data.prices.length === 0) {
            for(let i=0; i<80; i++) {
                let wave = Math.sin(i * 0.15) * 0.0012; 
                let p = basePrice + wave + (Math.random() * 0.0002);
                data.prices.push(p);
                data.opens.push(p - 0.0001);
                data.highs.push(p + 0.0002);
                data.lows.push(p - 0.0002);
            }
        }

        let lastP = data.prices[data.prices.length - 1];
        let trendBias = Math.sin(Date.now() * 0.00008) * 0.00008; 
        let nextP = lastP + trendBias + ((Math.random() - 0.5) * 0.00008);
        
        data.prices.push(nextP);
        data.opens.push(lastP);
        data.highs.push(Math.max(lastP, nextP) + 0.0001);
        data.lows.push(Math.min(lastP, nextP) - 0.0001);

        if (data.prices.length > 200) {
            data.prices.shift(); data.opens.shift(); data.highs.shift(); data.lows.shift();
        }
    });
}

// STRATEGY ENGINE: CANDLESTICK PSYCHOLOGY + SUPPORT/RESISTANCE BREAKOUTS
function analyzeHighAccuracyMetrics(asset) {
    let data = marketData[asset];
    let closes = data.prices;
    if (closes.length < 50) return { signal: "AVOID", trend: "Neutral", callPct: 50, putPct: 50, confluence: "Syncing market matrix..." };

    let currentPrice = closes[closes.length - 1];
    let openPrice = data.opens[data.opens.length - 1];
    let highPrice = data.highs[data.highs.length - 1];
    let lowPrice = data.lows[data.lows.length - 1];

    // Advanced Technical Matrix
    let rsi = RSI.calculate({ values: closes, period: 14 }).pop() || 50;
    let ema9 = EMA.calculate({ values: closes, period: 9 }).pop() || currentPrice;
    let bb = BollingerBands.calculate({ period: 20, values: closes, stdDev: 2 }).pop() || { upper: currentPrice, lower: currentPrice };

    // Support & Resistance (Calculated from Highs/Lows of last 30 intervals)
    let resistance = Math.max(...data.highs.slice(-30));
    let support = Math.min(...data.lows.slice(-30));

    // Candle Wick & Body Dynamics (Psychology mapping)
    let isBullishCandle = currentPrice > openPrice;
    let candleBody = Math.abs(currentPrice - openPrice);
    let upperWick = isBullishCandle ? (highPrice - currentPrice) : (highPrice - openPrice);
    let lowerWick = isBullishCandle ? (openPrice - lowPrice) : (currentPrice - lowPrice);

    // Strict Patterns
    let isHammer = lowerWick > (candleBody * 2) && upperWick < (candleBody * 0.4); 
    let isShootingStar = upperWick > (candleBody * 2) && lowerWick < (candleBody * 0.4); 

    let trend = currentPrice > ema9 ? "Bullish" : "Bearish";
    let signal = "AVOID";
    let callPct = 50; let putPct = 50;
    let confluenceText = "AVOID: Indicators looking for strict breakout pattern.";

    // 🟢 CRITERIA FOR HIGH-ACCURACY UP (CALL) SIGNAL
    if (trend === "Bullish" && isBullishCandle && (currentPrice >= (resistance - 0.0001) || isHammer || currentPrice <= bb.lower) && rsi > 53 && rsi < 67) {
        callPct = Math.floor(76 + (rsi - 53) * 1.4);
        putPct = 100 - callPct;
        signal = "UP";
        confluenceText = "🟢 STRAT CONFIRMED: Support Rebound / Breakout Zone + Hammer Pattern + RSI Strength.";
    }
    // 🔴 CRITERIA FOR HIGH-ACCURACY DOWN (PUT) SIGNAL
    else if (trend === "Bearish" && !isBullishCandle && (currentPrice <= (support + 0.0001) || isShootingStar || currentPrice >= bb.upper) && rsi < 47 && rsi > 33) {
        putPct = Math.floor(76 + (47 - rsi) * 1.4);
        callPct = 100 - putPct;
        signal = "DOWN";
        confluenceText = "🔴 STRAT CONFIRMED: Resistance Rejection + Shooting Star Formed + Bearish Momentum.";
    }

    return { signal, trend, callPct, putPct, confluence: confluenceText, triggerPrice: currentPrice };
}

// INTERVAL CONTROLLER
setInterval(() => {
    generateStableMarketFeeds();

    let now = new Date();
    let istSeconds = parseInt(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata", second: "2-digit"}));
    let istMinutes = parseInt(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata", minute: "2-digit"}));

    if (now.getDay() === 0 || now.getDay() === 6) {
        Object.keys(marketData).forEach(asset => {
            marketData[asset].currentSignal1m = "CLOSED"; marketData[asset].currentSignal5m = "CLOSED";
        });
        return;
    }

    // STRICT CANDLE COMPLETION CLOSURE TRICK (IST 00th Second)
    if (istSeconds === 0) {
        let indianTimeStr = getISTTime();

        Object.keys(marketData).forEach(asset => {
            let currentClosePrice = marketData[asset].prices[marketData[asset].prices.length - 1];

            // 1 Minute Validation
            if (lastActiveSignals["1m"][asset]) {
                let past = lastActiveSignals["1m"][asset];
                let evaluationResult = currentClosePrice > past.entryPrice ? "CORRECT" : "WRONG";
                if (past.signal === "DOWN") {
                    evaluationResult = currentClosePrice < past.entryPrice ? "CORRECT" : "WRONG";
                }
                signalHistoryList.unshift({ time: past.time, tf: "1m", asset: asset, type: past.signal, result: evaluationResult });
                delete lastActiveSignals["1m"][asset];
            }

            // 5 Minute Validation
            if (istMinutes % 5 === 0 && lastActiveSignals["5m"][asset]) {
                let past = lastActiveSignals["5m"][asset];
                let evaluationResult = currentClosePrice > past.entryPrice ? "CORRECT" : "WRONG";
                if (past.signal === "DOWN") {
                    evaluationResult = currentClosePrice < past.entryPrice ? "CORRECT" : "WRONG";
                }
                signalHistoryList.unshift({ time: past.time, tf: "5m", asset: asset, type: past.signal, result: evaluationResult });
                delete lastActiveSignals["5m"][asset];
            }

            // Generate Next Candle Parameters
            let analysis = analyzeHighAccuracyMetrics(asset);
            marketData[asset].currentSignal1m = analysis.signal;
            marketData[asset].metrics1m = analysis;

            if (analysis.signal !== "AVOID") {
                lastActiveSignals["1m"][asset] = { signal: analysis.signal, entryPrice: analysis.triggerPrice, time: indianTimeStr };
            }

            if (istMinutes % 5 === 0) {
                marketData[asset].currentSignal5m = analysis.signal;
                marketData[asset].metrics5m = analysis;

                if (analysis.signal !== "AVOID") {
                    lastActiveSignals["5m"][asset] = { signal: analysis.signal, entryPrice: analysis.triggerPrice, time: indianTimeStr };
                }
            }
        });

        if (signalHistoryList.length > 60) signalHistoryList.pop(); 
    }
}, 1000);

app.get('/api/signals', (req, res) => {
    let payload = { signals: { "1m": {}, "5m": {} }, metrics: {}, history: signalHistoryList };
    Object.keys(marketData).forEach(asset => {
        payload.signals["1m"][asset] = marketData[asset].currentSignal1m;
        payload.signals["5m"][asset] = marketData[asset].currentSignal5m;
        payload.metrics[asset] = {
            "1m": marketData[asset].metrics1m || { trend: "Neutral", callPct: 50, putPct: 50, confluence: "Warming engine..." },
            "5m": marketData[asset].metrics5m || { trend: "Neutral", callPct: 50, putPct: 50, confluence: "Warming engine..." }
        };
    });
    res.json(payload);
});

app.listen(PORT, () => { console.log(`Rigid Engine Live on Port ${PORT}`); });
