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
  res.render('indexFinal', { countries: countries });
});


app.get('/result', async (req, res) => {
  const symbol = req.query.symbol;

  try {
      let config = {
          params: {
              function: 'TIME_SERIES_INTRADAY',
              symbol: symbol,
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

      res.render('pickedStock.ejs', { content: prices, symbol: stockSymbol });
  } catch (error) {
      console.error(error);
      res.render('pickedStock.ejs', { content: 'Error!', symbol: symbol });
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


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});