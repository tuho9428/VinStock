import dotenv from 'dotenv';
import express from 'express';
import bodyParser from 'body-parser';
import methodOverride from 'method-override';
import axios from 'axios';

dotenv.config();

const app = express();
const port = 3000;
const API_URL = 'https://www.alphavantage.co';

app.use(methodOverride('_method'));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Fetch stock prices based on time series function
async function fetchStockPrices(symbol, timeSeriesFunction) {
  try {
    const config = {
      params: {
        function: timeSeriesFunction,
        symbol: symbol,
        interval: timeSeriesFunction === 'TIME_SERIES_INTRADAY' ? '5min'  :
                  timeSeriesFunction === 'TIME_SERIES_DAILY' ? '1d'  :
                  timeSeriesFunction === 'TIME_SERIES_WEEKLY' ? '1wk'  :
                  timeSeriesFunction === 'TIME_SERIES_MONTHLY' ? '1mo'  : undefined,
        apikey: process.env.API_KEY,
      },
      
    };

    const response = await axios.get(API_URL + '/query', config);
    const data = response.data;

    // Access and format the required information from the response data
    const metaData = data['Meta Data'];
    const timeSeries = data[timeSeriesFunction === 'TIME_SERIES_INTRADAY' ? 'Time Series (5min)' : 
                            timeSeriesFunction === 'TIME_SERIES_DAILY' ? 'Time Series (Daily)' : 
                            timeSeriesFunction === 'TIME_SERIES_WEEKLY' ? 'Weekly Time Series' : 
                            timeSeriesFunction === 'TIME_SERIES_MONTHLY' ? 'Monthly Time Series' : undefined];

    // Construct the prices array to pass to the template
    const prices = [];
    const stockSymbol = symbol;

    for (const timestamp in timeSeries) {
      if (timeSeries.hasOwnProperty(timestamp)) {
        const entry = timeSeries[timestamp];
        const price = {
          timestamp: timestamp,
          openPrice: entry['1. open'],
          highPrice: entry['2. high'],
          lowPrice: entry['3. low'],
          closePrice: entry['4. close'],
          volume: entry['5. volume'],
        };
        prices.push(price);
      }
    }

    return { content: prices, symbol: stockSymbol };
  } catch (error) {
    console.error(error);
    throw new Error('Failed to fetch stock prices.');
  }
}

const ticketSearch = async (symbol, interval) => {
  const config = {
    params: {
      function: 'TICKET_SEARCH', // Assuming 'TICKET_SEARCH' is the correct function for ticket search
      symbol: symbol,
      interval: interval,
      apikey: process.env.API_KEY,
    },
  };

  try {
    const response = await axios.get(API_URL + '/query', config);
    const data = response.data;

    // Access and format the required information from the response data
    const metaData = data['Meta Data'];
    const ticketInfo = data['Ticket Info']; // Update this based on the actual structure of the API response

    // Process ticket information as needed

    return ticketInfo; // You may want to return relevant information based on your use case
  } catch (error) {
    console.error('Error in ticket search:', error);
    throw error; // Handle the error as needed
  }
};

// Example usage:
const symbol = 'AAPL';
const interval = '1d'; // You can adjust the interval based on your requirements
const ticketInfo = await ticketSearch(symbol, interval);
console.log('Ticket Information:', ticketInfo);


app.get('/', (req, res) => {
  res.render('index.ejs');
});

app.get('/prices', (req, res) => {
  res.render('prices.ejs', { content: '', symbol: '' });
});

app.post('/prices', async (req, res) => {
  let symbol = req.body.symbol;

  try {
    let result;
    if (req.body.dailyPrice) {
      result = await fetchStockPrices(symbol, 'TIME_SERIES_DAILY');
    } else if (req.body.intradayPrice) {
      result = await fetchStockPrices(symbol, 'TIME_SERIES_INTRADAY');
    } else if (req.body.weeklyPrice) {
      result = await fetchStockPrices(symbol, 'TIME_SERIES_WEEKLY');
    } else if (req.body.monthlyPrice) {
      result = await fetchStockPrices(symbol, 'TIME_SERIES_MONTHLY');
    } 

    res.render('prices.ejs', result);
  } catch (error) {
    console.error(error);
    res.render('prices.ejs', { content: 'Error!', symbol: symbol });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
