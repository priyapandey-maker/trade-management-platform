const { TwelveDataMarketProvider } = require('./dist/src/engines/market/providers/twelve-data-market.provider');
const { AlphaVantageMarketProvider } = require('./dist/src/engines/market/providers/alpha-vantage-market.provider');
const { YahooMarketProvider } = require('./dist/src/engines/market/providers/yahoo-market.provider');
const { MarketProviderFactory } = require('./dist/src/engines/market/providers/market-provider.factory');

async function testProviders() {
  console.log('--- 🧪 STARTING INSTITUTIONAL MARKET DATA PROVIDER VERIFICATION ---');
  
  const td = new TwelveDataMarketProvider();
  const av = new AlphaVantageMarketProvider();
  const yf = new YahooMarketProvider();
  const factory = new MarketProviderFactory(td, av, yf);

  await factory.connect();

  console.log('\n1. Testing Symbol Translation & Quote Retrieval (RELIANCE.NS) via Factory...');
  try {
    const quote = await factory.getQuote('RELIANCE.NS');
    console.log('✅ Quote Success:', JSON.stringify({
      symbol: quote.symbol,
      company: quote.company,
      price: quote.price,
      changePercent: quote.changePercent + '%',
      volume: quote.volume
    }, null, 2));
  } catch (err) {
    console.error('❌ Quote Failed:', err.message);
  }

  console.log('\n2. Testing 5Y Weekly Candle Retrieval (RELIANCE.NS) via Factory...');
  try {
    const candles = await factory.getCandles('RELIANCE.NS', '1wk', '5Y');
    console.log(`✅ 5Y Weekly Candles Success! Total Candles Retrieved: ${candles.length}`);
    if (candles.length > 0) {
      console.log('   Oldest Candle:', candles[0].date, 'Close: ₹' + candles[0].close);
      console.log('   Latest Candle:', candles[candles.length - 1].date, 'Close: ₹' + candles[candles.length - 1].close);
    }
  } catch (err) {
    console.error('❌ 5Y Weekly Candles Failed:', err.message);
  }

  console.log('\n3. Testing Intraday 15m Candle Retrieval (TCS.NS) for 5D range via Factory...');
  try {
    const intCandles = await factory.getCandles('TCS.NS', '15min', '5D');
    console.log(`✅ Intraday 15m Candles Success! Total Candles Retrieved: ${intCandles.length}`);
    if (intCandles.length > 0) {
      console.log('   Latest Intraday Bar:', intCandles[intCandles.length - 1].date, 'Close: ₹' + intCandles[intCandles.length - 1].close);
    }
  } catch (err) {
    console.error('❌ Intraday Candles Failed:', err.message);
  }

  await factory.disconnect();
  console.log('\n--- 🏁 VERIFICATION COMPLETED ---');
}

testProviders();
