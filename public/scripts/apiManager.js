import axios from 'axios';
import graphicStockPrices from './graphicStockPrices.js';
import CompanyOverview from './companyOverview.js';

// apiManager class to handle data fetching and processing
class apiManager {
  constructor(apiUrl, rapidapiKey) {
    this.apiUrl = apiUrl;
    this.rapidapiKey = rapidapiKey;
  }

  async fetchFinancialData(symbol, dataType, retries = 3, delay = 60000) {
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

        if (error.response && error.response.status === 429) {
            console.log(`API rate limit exceeded. Please wait for ${delay / 1000} seconds before trying again.`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return this.fetchFinancialData(symbol, dataType, retries - 1, delay);
        } else {
            throw new Error(`Failed to fetch ${dataType.toLowerCase()}.`);
        }
    }
}


  formatCompanyOverview(data, symbol) {
    const companyData = {
      Name: data.Name,
      Exchange: data.Exchange,
      Symbol: data.Symbol,
      Description: data.Description,
      Country: data.Country,
      Currency: data.Currency,
      Sector: data.Sector,
      Industry: data.Industry,
      Address: data.Address
    };
    
    // Create an instance of CompanyOverview
    const companyOverview = new CompanyOverview(companyData);

    return { content: companyOverview, symbol: symbol, timeSerie: "Company Overview" };
  }

  formatIncomeStatement(data, symbol) {
    // Modify this part based on the actual structure of the Income Statement data
    return { content: data, symbol: symbol, timeSerie: "Income Statement" };
  }


  // apiManager for managing stock data
  async fetchStockPrices(symbol, timeSeriesFunction, retries = 3, delay = 60000) {
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
                const price = new graphicStockPrices(
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

        if (error.response && error.response.status === 429) {
            console.log(`API rate limit exceeded. Please wait for ${delay / 1000} seconds before trying again.`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return this.fetchStockPrices(symbol, timeSeriesFunction, retries - 1, delay);
        } else {
            throw new Error('Failed to fetch stock prices.');
        }
    }
}


}

  export default apiManager;