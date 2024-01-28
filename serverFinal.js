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
const API_URL = "https://alpha-vantage.p.rapidapi.com";

app.use(methodOverride("_method"));
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

let countries = [];

app.get('/', (req, res) => {
  res.render('search', { countries: JSON.stringify(countries.map(item => item.symbolAndName)) });
});

let pickedSymbol; // Store the picked symbol here

app.get('/result', async (req, res) => {
  pickedSymbol = req.query.symbol;

  try {
    let config = {
      method: 'GET',
      url: API_URL + '/query',
      params: {
        interval: '5min',
        function: 'TIME_SERIES_INTRADAY',
        symbol: pickedSymbol,
        datatype: 'json',
        output_size: 'compact'
      },
      headers: {
        'x-rapidapi-host': 'alpha-vantage.p.rapidapi.com',
        'x-rapidapi-key': process.env.RAPIDAPI_KEY
      }
    };

    const response = await axios.request(config);
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

    res.render('pickedStock.ejs', { content: prices, symbol: stockSymbol, timeSerie: "INTRADAY" });
  } catch (error) {
    console.error('Error in /result route:', error);
    res.render('pickedStock.ejs', { content: 'Error!', symbol: pickedSymbol });
  }
});

fs.createReadStream('./public/scripts/stocks_name_latest.csv')
  .pipe(csv())
  .on('data', (row) => {
    countries.push(row);
  })
  .on('end', () => {
    console.log('CSV file successfully processed');
  });

app.post('/result', async (req, res) => {
  try {
    let content;
    let symbol = pickedSymbol;

    if (req.body.companyOverview) {
      content = await fetchCompanyOverview(symbol);
      res.render('companyOverview.ejs', content);
    } else if (req.body.dailyPrice) {
      content = await fetchStockPrices(symbol, 'TIME_SERIES_DAILY');
    } else if (req.body.intradayPrice) {
      content = await fetchStockPrices(symbol, 'TIME_SERIES_INTRADAY');
    } else if (req.body.weeklyPrice) {
      content = await fetchStockPrices(symbol, 'TIME_SERIES_WEEKLY');
    } else if (req.body.monthlyPrice) {
      content = await fetchStockPrices(symbol, 'TIME_SERIES_MONTHLY');
    }

    if (!req.body.companyOverview) {
      res.render('pickedStock.ejs', content);
    }
  } catch (error) {
    console.error('Error in /result POST route:', error);
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
      method: 'GET',
      url: API_URL + '/query',
      params: {
        function: timeSeriesFunction,
        symbol: symbol,
        interval: timeSeriesFunction === 'TIME_SERIES_INTRADAY' ? '5min' :
          timeSeriesFunction === 'TIME_SERIES_DAILY' ? '1d' :
          timeSeriesFunction === 'TIME_SERIES_WEEKLY' ? '1wk' :
          timeSeriesFunction === 'TIME_SERIES_MONTHLY' ? '1mo' : undefined,
        datatype: 'json',
        output_size: 'compact'
      },
      headers: {
        'x-rapidapi-host': 'alpha-vantage.p.rapidapi.com',
        'x-rapidapi-key': process.env.RAPIDAPI_KEY
      },
    };

    const response = await axios.request(config);
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
    const timeSerie = timeSeriesFunction.substring('TIME_SERIES_'.length);
    return { content: prices, symbol: stockSymbol, timeSerie: timeSerie };
  } catch (error) {
    console.error('Error in fetchStockPrices:', error);
    throw new Error('Failed to fetch stock prices.');
  }
}

async function fetchCompanyOverview(symbol) {
  try {
    const config = {
      method: 'GET',
      url: API_URL + '/query',
      params: {
        function: 'OVERVIEW',
        symbol: symbol,
        apikey: process.env.RAPIDAPI_KEY,
      },
      headers: {
        'x-rapidapi-host': 'alpha-vantage.p.rapidapi.com',
        'x-rapidapi-key': process.env.RAPIDAPI_KEY
      },
    };

    const response = await axios.request(config);
    const data = response.data;

    // Access and format the required information from the response data
    const companyOverview = {
      companyName: data.Name,
      exchange: data.Exchange,
      symbol: data.Symbol,
      description: data.Description,
      // Add more properties based on the actual structure of the data
    };

    return { content: companyOverview, symbol: symbol, timeSerie: "Company Overview" };
  } catch (error) {
    console.error('Error in fetchCompanyOverview:', error);
    throw new Error('Failed to fetch company overview.');
  }
}
