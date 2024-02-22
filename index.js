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
import fs from 'fs';
import csv from 'csv-parser';
import dotenv from 'dotenv';

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

let countries = [];

app.get("/", (req, res) => {
  res.render("index.ejs");
});

let pickedSymbol; // Store the picked symbol here

// add to list
app.post('/add', async (req, res) => {
  const userId = req.user.id; // Assuming user ID is available in the request object
  const symbol = req.body.add; // Retrieve symbol from the form data

  try {
    const checkQuery = 'SELECT COUNT(*) AS count FROM favorite_stocks WHERE user_id = $1 AND symbol = $2';
    const checkResult = await db.query(checkQuery, [userId, symbol]);

    if (checkResult.rows[0].count > 0) {
      // Symbol already exists for the user
      res.render('success.ejs', { userId: userId, symbol: symbol, message: 'Symbol already exists for the user.' });
    } else {
      const insertQuery = 'INSERT INTO favorite_stocks (user_id, symbol) VALUES ($1, $2) RETURNING *';
      const values = [userId, symbol];
      const result = await db.query(insertQuery, values);
      
      res.render('success.ejs', { userId: userId, symbol: symbol, message: '' });
    }
  } catch (error) {
    console.error('Error adding symbol:', error);
    res.render('success.ejs', { message: 'Error adding symbol' });
  }
});


// get stock list
// Route to view the stock list
app.get('/stocklist', async (req, res) => {
  try {
    const userId = req.user.id; // Assuming user ID is available in the request object
    const query = 'SELECT * FROM favorite_stocks WHERE user_id = $1'; // Adjust this query based on your actual database schema
    const { rows } = await db.query(query, [userId]);

    res.render('stocklist.ejs', { stocks: rows });
  } catch (error) {
    console.error('Error fetching stock list:', error);
    res.render('error.ejs', { message: 'Error fetching stock list' });
  }
});


// search symbol or company name
app.get("/search", (req, res) => {
  res.render('search', { countries: JSON.stringify(countries.map(item => item.symbolAndName)) });
});
// search statement
app.get("/sestate", (req, res) => {
  res.render('state', { countries: JSON.stringify(countries.map(item => item.symbolAndName)) });
});

app.get("/statement", async (req, res) => {
  let pickedSymbol = req.query.symbol;
  let content;

  try {
    content = await fetchIncomeStatement(pickedSymbol);
      res.render('statement.ejs', content);
  } catch (error) {
    console.error('Error in /result route:', error);
    res.render('statement.ejs', { content: 'Error!', symbol: pickedSymbol });
  }
});

// search company overview
app.get("/seover", (req, res) => {
  res.render('over', { countries: JSON.stringify(countries.map(item => item.symbolAndName)) });
});

app.get("/overview", async (req, res) => {
  let pickedSymbol = req.query.symbol;
  let content;

  try {
    content = await fetchCompanyOverview(pickedSymbol);
      res.render('overview.ejs', content);
  } catch (error) {
    console.error('Error in /result route:', error);
    res.render('overview.ejs', { content: 'Error!', symbol: pickedSymbol });
  }
});

// show list stock and refresh
app.post('/refresh', async (req, res) => {
  let pickedSymbol = req.query.symbol; // Retrieve symbol from URL query parameter

  if (!pickedSymbol) {
    pickedSymbol = req.body.refresh; // Retrieve symbol from form data if not in query parameter
  } // Assuming symbol is sent in the request body

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

    const stockData = {
      symbol: globalQuoteData['01. symbol'],
      open_price: parseFloat(globalQuoteData['02. open']),
      high_price: parseFloat(globalQuoteData['03. high']),
      low_price: parseFloat(globalQuoteData['04. low']),
      current_price: parseFloat(globalQuoteData['05. price']),
      volume: parseInt(globalQuoteData['06. volume']),
      last_trading_day: new Date(globalQuoteData['07. latest trading day']),
      previous_close: parseFloat(globalQuoteData['08. previous close']),
      change_amount: parseFloat(globalQuoteData['09. change']),
      change_percent: parseFloat(globalQuoteData['10. change percent'])
    };

    const queryCheck = `SELECT * FROM stock_data WHERE symbol = $1`;
    const checkResult = await db.query(queryCheck, [stockData.symbol]);

    if (checkResult.rows.length > 0) {
      const updateQuery = `UPDATE stock_data 
                           SET symbol = $1, open_price = $2, high_price = $3, low_price = $4, current_price = $5, volume = $6,
                               last_trading_day = $7, previous_close = $8, change_amount = $9, change_percent = $10
                           WHERE symbol = $1`;
      await db.query(updateQuery, [
        stockData.symbol,
        stockData.open_price,
        stockData.high_price,
        stockData.low_price,
        stockData.current_price,
        stockData.volume,
        stockData.last_trading_day,
        stockData.previous_close,
        stockData.change_amount,
        stockData.change_percent
      ]);
    } else {
      const insertQuery = `INSERT INTO stock_data (symbol, open_price, high_price, low_price, current_price, volume, last_trading_day, previous_close, change_amount, change_percent) 
                           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`;
      await db.query(insertQuery, [
        stockData.symbol,
        stockData.open_price,
        stockData.high_price,
        stockData.low_price,
        stockData.current_price,
        stockData.volume,
        stockData.last_trading_day,
        stockData.previous_close,
        stockData.change_amount,
        stockData.change_percent
      ]);
    }

    res.redirect(`/show?symbol=${pickedSymbol}`); // Redirect to show route after inserting or updating data
  } catch (error) {
    console.error('Error in /refresh route:', error);
    res.render('show.ejs', { content: 'Error!', symbol: pickedSymbol });
  }
});

app.get('/show', async (req, res) => {
  const pickedSymbol = req.query.symbol;

  try {
    const query = 'SELECT * FROM stock_data WHERE symbol = $1';
    const { rows } = await db.query(query, [pickedSymbol]);

    if (rows.length > 0) {
      const stockData = rows[0];
      res.render('show.ejs', { content: stockData, symbol: pickedSymbol });
    } else {
      res.render('show.ejs', { content: null, symbol: pickedSymbol });
    }
  } catch (error) {
    console.error('Error in /show route:', error);
    res.render('show.ejs', { content: 'Error!', symbol: pickedSymbol });
  }
});


// get result from search
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

app.post('/result', async (req, res) => {
  try {
    let content;
    let symbol = pickedSymbol;

    if (req.body.companyOverview) {
      content = await fetchCompanyOverview(symbol);
      res.render('overview.ejs', content);
    } else if (req.body.dailyPrice) {
      content = await fetchStockPrices(symbol, 'TIME_SERIES_DAILY');
    } else if (req.body.intradayPrice) {
      content = await fetchStockPrices(symbol, 'TIME_SERIES_INTRADAY');
    } else if (req.body.weeklyPrice) {
      content = await fetchStockPrices(symbol, 'TIME_SERIES_WEEKLY');
    } else if (req.body.monthlyPrice) {
      content = await fetchStockPrices(symbol, 'TIME_SERIES_MONTHLY');
    } else if (req.body.incomeStatement) {
      content = await fetchIncomeStatement(symbol);
      res.render('statement.ejs', content);
    }

    if (!req.body.companyOverview && !req.body.incomeStatement) {
      res.render('pickedStock.ejs', content);
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
  res.render("register.ejs");
});

app.get("/secrets", (req, res) => {
  res.render("secrets.ejs");
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

  try {
    const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (checkResult.rows.length > 0) {
      req.redirect("/login");
    } else {
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
        } else {
          const result = await db.query(
            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
            [email, hash]
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

// Fetch stock prices based on time series function
async function fetchStockPrices(symbol, timeSeriesFunction) {
  try {
    const config = {
      method: 'GET',
      url: API_URL + '/query',
      params: {
        function: timeSeriesFunction,
        symbol: symbol,
        ...(timeSeriesFunction === 'TIME_SERIES_INTRADAY' && { interval: '5min' }),
        datatype: 'json',
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
async function fetchIncomeStatement(symbol) {
  try {
    const config = {
      method: 'GET',
      url: API_URL + '/query',
      params: {
        function: 'INCOME_STATEMENT',
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
    // Modify this part based on the actual structure of the Income Statement data

    return { content: data, symbol: symbol, timeSerie: "Income Statement" };
  } catch (error) {
    console.error('Error in fetchIncomeStatement:', error);
    throw new Error('Failed to fetch income statement.');
  }
}

fs.createReadStream('./public/scripts/stocks_name_latest.csv')
  .pipe(csv())
  .on('data', (row) => {
    countries.push(row);
  })
  .on('end', () => {
    console.log('CSV file successfully processed');
  });