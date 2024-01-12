import dotenv from 'dotenv';
 
dotenv.config();
import express from "express";
import bodyParser from "body-parser";
import methodOverride from "method-override";
import axios from "axios";

const app = express();
const port = 3000;
const API_URL = "https://www.alphavantage.co";

app.use(methodOverride("_method"));
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.get("/", (req, res) => {
  res.render("index.ejs");
});

app.get("/dailyprice", (req, res) => {
  res.render("dailyprice.ejs", { content: "" , symbol: ""});
});

app.post("/dailyprice", async (req, res) => {
  let symbol = req.body.symbol;

  try {
    let config = {
      params: {
        function: "TIME_SERIES_MONTHLY",
        symbol: symbol,
        apikey: process.env.API_KEY,
      },
    };

    const response = await axios.get(API_URL + "/query", config);
    const data = response.data;

    // Access and format the required information from the response data
    const metaData = data["Meta Data"];
    const timeSeries = data["Time Series (Daily)"];

    // Construct the prices array to pass to the template
    const prices = [];
    const stockSymbol = symbol;

    for (const timestamp in timeSeries) {
      if (timeSeries.hasOwnProperty(timestamp)) {
        const entry = timeSeries[timestamp];
        const price = {
          timestamp: timestamp,
          openPrice: entry["1. open"],
          highPrice: entry["2. high"],
          lowPrice: entry["3. low"],
          closePrice: entry["4. close"],
          volume: entry["5. volume"],
        };
        prices.push(price);
      }
    }

    res.render("dailyprice.ejs", { content: prices, symbol: stockSymbol });
  } catch (error) {
    console.error(error);
    res.render("dailyprice.ejs", { content: "Error!", symbol: symbol });
  }
});



app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
