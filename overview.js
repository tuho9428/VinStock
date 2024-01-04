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

app.get("/overview", (req, res) => {
  res.render("overview.ejs", { stockInfo: [], symbol: "" });
});

app.post("/overview", async (req, res) => {
  let symbol = req.body.symbol;

  try {
    let config = {
      params: {
        function: "OVERVIEW",
        symbol: symbol,
        apikey: process.env.API_KEY,
      },
    };

    const response = await axios.get(API_URL + "/query", config);
    const stockInfo = response.data;

    const stockSymbol = symbol;

    res.render("overview.ejs", { stockInfo: stockInfo, symbol: stockSymbol });
  } catch (error) {
    console.error(error);
    res.render("overview.ejs", { stockInfo: null, symbol: stockSymbol });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
