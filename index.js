import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import session from "express-session";
import methodOverride from "method-override";
import axios from "axios";
import dotenv from 'dotenv';
import StockManager from './public/scripts/stockManager.js'; // Importing StockManager class from stockManager.js
import SearchManager from './public/scripts/searchManager.js';
import DataManager from './public/scripts/dataManager.js';
import StockData from './public/scripts/stockData.js';
import StockDataManager from './public/scripts/stockDataManager.js';
import DataProcessor from './public/scripts/dataProcessor.js';
import User from './public/scripts/user.js';


const app = express();
const PORT = process.env.PORT || 3000;
const saltRounds = 10;
dotenv.config();
const API_URL = "https://alpha-vantage.p.rapidapi.com";

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

app.use(methodOverride("_method"));
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

db.connect();

const dataProcessor = new DataProcessor('./public/scripts/stocks_name_latest.csv');
dataProcessor.processCSVFile();
// Accessing the countries array data
const countries = dataProcessor.getData();


app.get("/", (req, res) => {
  res.render("index.ejs");
});

let pickedSymbol; // Store the picked symbol here

// add to list
// Instantiate StockManager with db connection
const stockManager = new StockManager(db);

// Use stockManager in your routes or functions
app.post('/add', async (req, res) => {
  const userId = req.user.id; // Assuming user ID is available in the request object
  const symbol = req.body.add; // Retrieve symbol from the form data

  const result = await stockManager.addStock(userId, symbol);

  res.render('success.ejs', result);
});

// Route to view the stock list
// "/stocklist" route using stockManager
app.get('/stocklist', async (req, res) => {
  const userId = req.user.id; // Assuming user ID is available in the request object

  try {
    const stocks = await stockManager.getStockList(userId);
    res.render('stocklist.ejs', { stocks });
  } catch (error) {
    console.error('Error fetching stock list:', error);
    res.render('error.ejs', { message: 'Error fetching stock list' });
  }
});


// Instantiate SearchManager with countries data
const searchManager = new SearchManager(countries);

// Instantiate DataManager with API URL and RapidAPI Key
const dataManager = new DataManager(API_URL, process.env.RAPIDAPI_KEY);

// search symbol or company name
app.get("/search", (req, res) => {
  res.render('search', { countries: JSON.stringify(searchManager.getSymbolAndNames()) });
});

// search statement
app.get("/sestate", (req, res) => {
  res.render('state', { countries: JSON.stringify(searchManager.getSymbolAndNames()) });
});

// "/statement" routes using DataManager
app.get("/statement", async (req, res) => {
  const pickedSymbol = req.query.symbol;

  try {
    const content = await dataManager.fetchFinancialData(pickedSymbol, 'INCOME_STATEMENT');
    res.render('statement.ejs', content);
  } catch (error) {
    console.error('Error in /statement route:', error);
    res.render('statement.ejs', { content: 'Error!', symbol: pickedSymbol });
  }
});

// search company overview
app.get("/seover", (req, res) => {
  res.render('over', { countries: JSON.stringify(searchManager.getSymbolAndNames()) });
});

//"/overview" routes using DataManager
app.get("/overview", async (req, res) => {
  const pickedSymbol = req.query.symbol;

  try {
    const content = await dataManager.fetchFinancialData(pickedSymbol, 'OVERVIEW');
    res.render('overview.ejs', content);
  } catch (error) {
    console.error('Error in /overview route:', error);
    res.render('overview.ejs', { content: 'Error!', symbol: pickedSymbol });
  }
});

// Implementing Object-Oriented Programming for managing stock data
const stockDataManager = new StockDataManager(db);

// show list stock and refresh
app.post('/refresh', async (req, res) => {
  let pickedSymbol = req.query.symbol || req.body.refresh;

  try {
    const config = {
      method: 'GET',
      url: API_URL + '/query',
      params: {
        function: 'GLOBAL_QUOTE',
        symbol: pickedSymbol,
        datatype: 'json'
      },
      headers: {
        'x-rapidapi-host': 'alpha-vantage.p.rapidapi.com',
        'x-rapidapi-key': process.env.RAPIDAPI_KEY
      }
    };

    const response = await axios.request(config);
    const data = response.data;
    const globalQuoteData = data['Global Quote'];

    const stockData = new StockData(
      globalQuoteData['01. symbol'],
      parseFloat(globalQuoteData['02. open']),
      parseFloat(globalQuoteData['03. high']),
      parseFloat(globalQuoteData['04. low']),
      parseFloat(globalQuoteData['05. price']),
      parseInt(globalQuoteData['06. volume']),
      new Date(globalQuoteData['07. latest trading day']),
      parseFloat(globalQuoteData['08. previous close']),
      parseFloat(globalQuoteData['09. change']),
      parseFloat(globalQuoteData['10. change percent'])
    );

    await stockDataManager.updateStockData(stockData);

    res.redirect(`/show?symbol=${pickedSymbol}`);
  } catch (error) {
    console.error('Error in /refresh route:', error);
    res.render('show.ejs', { content: 'Error!', symbol: pickedSymbol });
  }
});

app.get('/show', async (req, res) => {
  const pickedSymbol = req.query.symbol;

  try {
    const stockData = await stockDataManager.getStockData(pickedSymbol);

    if (stockData) {
      res.render('show.ejs', { content: stockData, symbol: pickedSymbol });
    } else {
      res.render('show.ejs', { content: null, symbol: pickedSymbol });
    }
  } catch (error) {
    console.error('Error in /show route:', error);
    res.render('show.ejs', { content: 'Error!', symbol: pickedSymbol });
  }
});

// Implementing Object-Oriented Programming for managing stock data and fetching prices
const stockPricesManager = new DataManager(API_URL, process.env.RAPIDAPI_KEY);

// get result from search
app.get('/result', async (req, res) => {
  try {
    const pickedSymbol = req.query.symbol;
    const content = await stockPricesManager.fetchStockPrices(pickedSymbol, 'TIME_SERIES_DAILY');
    
    res.render('pickedStock.ejs', { content: content.content, symbol: pickedSymbol, timeSerie: content.timeSerie }); // Include timeSerie in the content object
  } catch (error) {
    console.error('Error in /result route:', error);
    res.render('pickedStock.ejs', { content: 'Error!', symbol: pickedSymbol });
  }
});

app.post('/result', async (req, res) => {
  try {
    let content;
    const symbol = req.query.symbol || req.body.symbol;

    if (req.body.companyOverview) {
      content = await dataManager.fetchFinancialData(symbol, 'OVERVIEW');
      res.render('overview.ejs', content);
    } else if (req.body.dailyPrice) {
      content = await stockPricesManager.fetchStockPrices(symbol, 'TIME_SERIES_DAILY');
    } else if (req.body.intradayPrice) {
      content = await stockPricesManager.fetchStockPrices(symbol, 'TIME_SERIES_INTRADAY');
    } else if (req.body.weeklyPrice) {
      content = await stockPricesManager.fetchStockPrices(symbol, 'TIME_SERIES_WEEKLY');
    } else if (req.body.monthlyPrice) {
      content = await stockPricesManager.fetchStockPrices(symbol, 'TIME_SERIES_MONTHLY');
    } else if (req.body.incomeStatement) {
      content = await dataManager.fetchFinancialData(symbol, 'INCOME_STATEMENT');
      res.render('statement.ejs', content);
    }

    if (!req.body.companyOverview && !req.body.incomeStatement) {
      res.render('pickedStock.ejs', content); // Include timeSerie in the content object
    }
  } catch (error) {
    console.error('Error in /result POST route:', error);
    res.render('pickedStock.ejs', { content: 'Error!', symbol: pickedSymbol });
  }
});

app.get("/contact", (req, res) => {
  res.render("contact.ejs");
});

app.get("/about", (req, res) => {
  res.render("about.ejs");
});

app.get("/works", (req, res) => {
  res.render("works.ejs");
});

app.get("/products", (req, res) => {
  res.render("products.ejs");
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.get("/register", (req, res) => {
  res.render("register.ejs", {error: ""});
});

app.get("/service", (req, res) => {
  res.render("works.ejs");
});

app.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

app.get("/secrets", (req, res) => {
  if (req.isAuthenticated()) {
    const userId = req.user.id; // Get the user ID from the request object
    // Use the userId for further operations
    res.render("secrets.ejs");
  } else {
    res.redirect("/login");
  }
});

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

app.get(
  "/auth/google/secrets",
  passport.authenticate("google", {
    successRedirect: "/secrets",
    failureRedirect: "/login",
  })
);

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/secrets",
    failureRedirect: "/login",
  })
);

app.post("/register", async (req, res) => {
  const email = req.body.username;
  const password = req.body.password;
  
  const newUser = new User(email,password);

  if (password.length < 6) {
    // Render the register.ejs template with an error message
    return res.render('register', { error: 'Password must be at least 6 characters long' });
  }

  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
      newUser.email,
    ]);

    if (checkResult.rows.length > 0) {
      req.redirect("/login");
    } else {
      bcrypt.hash(newUser.password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
        } else {
          const result = await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
            [newUser.email, hash]
          );
          const user = result.rows[0];
          req.login(user, (err) => {
            req.user = {
              id: user.id, // Set the user ID in the request object
              // Other user properties
            };
            console.log("success");
            res.redirect("/secrets");
          });
        }
      });
    }
  } catch (err) {
    console.log(err);
    res.render('register.ejs', { error: `${newUser.email} is already exists` });
  }
  
});

passport.use(
  "local",
  new Strategy(async function verify(username, password, cb) {
    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1 ", [
        username,
      ]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        const storedHashedPassword = user.password;
        bcrypt.compare(password, storedHashedPassword, (err, valid) => {
          if (err) {
            console.error("Error comparing passwords:", err);
            return cb(err);
          } else {
            if (valid) {
              // return cb(null, user);
              return cb(null, { id: user.id, /* Other user properties */ });
            } else {
              return cb(null, false);
            }
          }
        });
      } else {
        return cb("User not found");
      }
    } catch (err) {
      console.log(err);
    }
  })
);

passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        console.log(profile);
        const result = await db.query("SELECT * FROM users WHERE email = $1", [
          profile.email,
        ]);
        if (result.rows.length === 0) {
          const newUser = await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2)",
            [profile.email, "google"]
          );
          req.user = { id: newUser.rows[0].id, /* Other user properties */ }; // Set the user ID in the request object
          return cb(null, newUser.rows[0]);
        } else {
          return cb(null, result.rows[0]);
        }
      } catch (err) {
        return cb(err);
      }
    }
  )
);
passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((user, cb) => {
  cb(null, user);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});