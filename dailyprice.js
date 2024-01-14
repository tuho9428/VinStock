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
  res.render("dailyprice.ejs", { content: "", symbol: "" });
});

app.post("/dailyprice", async (req, res) => {
  let symbol = req.body.symbol;

  const config = {
    params: {
      function: 'SYMBOL_SEARCH',
      keywords: symbol,
      apikey: process.env.API_KEY,
    },
  };

  try {
    const response = await axios.get(API_URL + '/query', config);
    const data = response.data;

    const bestMatches = data['bestMatches'];

    const results = bestMatches.map(match => {
      return {
        symbol: match['1. symbol'],
        name: match['2. name']
      };
    });

    res.render("dailyprice.ejs", { content: results, symbol: symbol });
  } catch (error) {
    console.error('Error in ticket search:', error);
    res.render("dailyprice.ejs", { content: "Error!", symbol: symbol });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
