import dotenv from 'dotenv';
 
dotenv.config();
import express from "express";
import bodyParser from "body-parser";
import methodOverride from "method-override";
import axios from "axios";

import fs from 'fs';
import csv from 'csv-parser';

const app = express();
const PORT = process.env.PORT || 3000;
const API_URL = "https://www.alphavantage.co";

app.use(methodOverride("_method"));
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());


let countries = [];



app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  countries = countries.map(item => item.symbolAndName);
  res.render('index', { countries: countries });
});

let pickedSymbol; // Store the picked symbol here

app.get('/result', async (req, res) => {
  pickedSymbol = req.query.symbol;

  try {
      let config = {
          params: {
              function: 'TIME_SERIES_INTRADAY',
              symbol: pickedSymbol,
              interval: '5min',
              apikey: process.env.API_KEY, // Make sure you have your API key set up
          },
      };

      const response = await axios.get(API_URL + '/query', config);
      const data = response.data;

      // Access and format the required information from the response data
      const timeSeries = data['Time Series (5min)'];

      // Construct the prices array to pass to the template
      const prices = [];
      const stockSymbol = pickedSymbol;

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

      res.render('pickedStock.ejs', { content: prices, symbol: stockSymbol });
  } catch (error) {
      console.error(error);
      res.render('pickedStock.ejs', { content: 'Error!', symbol: pickedSymbol});
  }
});

fs.createReadStream('stocks_name_latest.csv')
  .pipe(csv())
  .on('data', (row) => {
    countries.push(row);
  })
  .on('end', () => {
    console.log('CSV file successfully processed');
    var convertedArray = countries.map(item => item.symbolAndName);
    //console.log(convertedArray);
  });


  app.post('/result', async (req, res) => {
  
    try {
      let content;
      let symbol = pickedSymbol;
      
      if (req.body.dailyPrice) {
        content = await fetchStockPrices(symbol, 'TIME_SERIES_DAILY');
      } else if (req.body.intradayPrice) {
        content = await fetchStockPrices(symbol, 'TIME_SERIES_INTRADAY');
      } else if (req.body.weeklyPrice) {
        content = await fetchStockPrices(symbol, 'TIME_SERIES_WEEKLY');
      } else if (req.body.monthlyPrice) {
        content = await fetchStockPrices(symbol, 'TIME_SERIES_MONTHLY');
      } 
  
      res.render('pickedStock.ejs', content);
    } catch (error) {
      console.error(error);
      res.render('pickedStock.ejs', { content: 'Error!', symbol: pickedSymbol });
    }
  });

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


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