import axios from 'axios';
import StockPrices from './stockPrices.js';

// DataManager class to handle data fetching and processing
class DataManager {
  constructor(apiUrl, rapidapiKey) {
    this.apiUrl = apiUrl;
    this.rapidapiKey = rapidapiKey;
  }

  async fetchFinancialData(symbol, dataType) {
    try {
      const config = {
        method: 'GET',
        url: this.apiUrl + '/query',
        params: {
          function: dataType,
          symbol: symbol,
          apikey: this.rapidapiKey,
        },
        headers: {
          'x-rapidapi-host': 'alpha-vantage.p.rapidapi.com',
          'x-rapidapi-key': this.rapidapiKey
        },
      };

      const response = await axios.request(config);
      const data = response.data;

      // Process the data based on the dataType
      if (dataType === 'OVERVIEW') {
        return this.formatCompanyOverview(data, symbol);
      } else if (dataType === 'INCOME_STATEMENT') {
        return this.formatIncomeStatement(data, symbol);
      } else {
        throw new Error('Invalid data type');
      }
    } catch (error) {
      console.error(`Error in fetchFinancialData (${dataType}):`, error);
      throw new Error(`Failed to fetch ${dataType.toLowerCase()}.`);
    }
  }

  formatCompanyOverview(data, symbol) {
    const companyOverview = {
      companyName: data.Name,
      exchange: data.Exchange,
      symbol: data.Symbol,
      description: data.Description,
      country: data.Country,
      currency: data.Currency,
      sector: data.Sector,
      industry: data.Industry,
      address: data.Address,
      // Add more properties based on the actual structure of the data
    };

    return { content: companyOverview, symbol: symbol, timeSerie: "Company Overview" };
  }

  formatIncomeStatement(data, symbol) {
    // Modify this part based on the actual structure of the Income Statement data
    return { content: data, symbol: symbol, timeSerie: "Income Statement" };
  }


  // DataManager for managing stock data
  async fetchStockPrices(symbol, timeSeriesFunction) {
    try {
      const config = {
        method: 'GET',
        url: this.apiUrl + '/query',
        params: {
          function: timeSeriesFunction,
          symbol: symbol,
          ...(timeSeriesFunction === 'TIME_SERIES_INTRADAY' && { interval: '5min' }),
          datatype: 'json',
        },
        headers: {
          'x-rapidapi-host': 'alpha-vantage.p.rapidapi.com',
          'x-rapidapi-key': this.rapidapiKey
        },
      };

      const response = await axios.request(config);
      const data = response.data;

      const timeSeries = data[timeSeriesFunction === 'TIME_SERIES_INTRADAY' ? 'Time Series (5min)' :
        timeSeriesFunction === 'TIME_SERIES_DAILY' ? 'Time Series (Daily)' :
          timeSeriesFunction === 'TIME_SERIES_WEEKLY' ? 'Weekly Time Series' :
            timeSeriesFunction === 'TIME_SERIES_MONTHLY' ? 'Monthly Time Series' : undefined];

      const prices = [];
      const stockSymbol = symbol;
      const timeSerie = timeSeriesFunction.substring('TIME_SERIES_'.length);

      let latestDayTimestamp = null;
      // Get the first timestamp in the timeSeries
      const firstTimestamp = Object.keys(timeSeries)[0];

      for (const timestamp in timeSeries) {
        if (timeSeries.hasOwnProperty(timestamp)) {
          const entry = timeSeries[timestamp];
          const price = new StockPrices(
            timestamp,
            entry['1. open'],
            entry['2. high'],
            entry['3. low'],
            entry['4. close'],
            entry['5. volume']
          );
          prices.push(price);
        }
      }

      latestDayTimestamp = firstTimestamp;

      return { content: prices, symbol: stockSymbol, timeSerie: timeSerie, latestDayTimestamp: latestDayTimestamp };
    } catch (error) {
      console.error('Error in fetchStockPrices:', error);
      throw new Error('Failed to fetch stock prices.');
    }
  }

}

  export default DataManager;