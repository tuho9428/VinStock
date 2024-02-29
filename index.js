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

app.get("/", async (req, res) => {
  if (req.isAuthenticated()) {
    const userId = req.user.id; // Get the user ID from the request object
    // Use the userId for further operations
    const userRole = req.user.role;
    const userEmail = req.user.email;
    userEmail
    try {
      const symbolLists = await symbolList.getSymbolList();
      res.render('secrets.ejs', { symbolLists: symbolLists, userRole: userRole, userEmail: userEmail});
    } catch (error) {
      console.error('Error fetching stock list:', error);
      res.render('error.ejs', { message: 'Error fetching stock list' });
    }
  } else {
    res.render("index.ejs");
  }
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
  const userRole = req.user.role;
  const userEmail = req.user.email;
  userEmail
  try {
    const stocks = await stockManager.getStockList(userId);
    res.render('stocklist.ejs', { stocks: stocks , role: userRole, userEmail: userEmail });
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

app.get("/admin/add-symbol", (req, res) => {
  res.render("admin.ejs");
});

const symbolManager = new StockDataManager(db);

app.post("/admin/add-symbol", async (req, res) => {
  const symbol = req.body.symbol;

  if (!symbol) {
    return res.status(400).send("Symbol is required");
  }

  try {
    await symbolManager.addSymbol(symbol);
    
    res.render("successAdd.ejs");
  } catch (error) {
    console.error('Error adding symbol:', error);
    res.render('error.ejs', { message: 'Error adding symbol' });
  }
});

app.post("/admin/delete-symbol", async (req, res) => {
  const symbol = req.body.symbol;

  if (!symbol) {
    return res.status(400).send("Symbol is required");
  }

  try {
    // Check if the symbol exists in the database
    const symbolExists = await symbolManager.checkSymbolExists(symbol);

    if (symbolExists) {
      await symbolManager.removeSymbol(symbol);
      res.render("deleted.ejs");
    } else {
      res.render('error.ejs', { message: 'Symbol not found in the database' });
    }
  } catch (error) {
    console.error('Error removing symbol:', error);
    res.render('error.ejs', { message: 'Error removing symbol' });
  }
});



app.get("/admin/symbols", async (req, res) => {
  try {
    const symbolList = await symbolManager.getSymbolListAdmin();
    res.render("symbols.ejs", { symbolList });
  } catch (error) {
    console.error('Error fetching symbol list:', error);
    res.render('error.ejs', { message: 'Error fetching symbol list' });
  }
});

app.get("/admin/users", async (req, res) => {
  try {
    const userList = await symbolManager.getUserList();
    res.render("users.ejs", { userList });
  } catch (error) {
    console.error('Error fetching users list:', error);
    res.render('error.ejs', { message: 'Error fetching users list' });
  }
});

//admin see contact list
app.get("/admin/contacts", async (req, res) => {
  try {
    const contactMessages = await symbolManager.getContactMessages(); // Fetch contact messages
    res.render("contactMessage.ejs", { contactMessages }); // Pass contactMessages to the template
  } catch (error) {
    console.error('Error fetching contact messages:', error);
    res.render('error.ejs', { message: 'Error fetching contact messages' });
  }
});




app.get("/contact", (req, res) => {
  res.render("contact.ejs");
});

app.post('/submit-form', (req, res) => {
  const { name, email, message } = req.body;

  db.query('INSERT INTO contacts (name, email, message) VALUES ($1, $2, $3)', [name, email, message], (error, results) => {
    if (error) {
      res.render('error', { message: 'Error saving data' }); // Assuming you have an 'error' view/template
    } else {
      res.render('successContact', { message: 'Data saved successfully' }); // Assuming you have a 'success' view/template
    }
  });
});


/**
 * 
 */

// Assuming you're using fetch API for making the request

//
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
  res.render("login.ejs", {error: ""});
});

app.get("/register", (req, res) => {
  res.render("register.ejs", {error: ""});
});

app.get("/service", (req, res) => {
  res.render("works.ejs");
});

// Ensure only users with the admin role can access the '/admin' route and render the admin.ejs page
app.get("/admin", (req, res) => {
  if (req.isAuthenticated() && req.user.role === 'admin') {
    res.render("admin.ejs");
  } else {
    res.redirect("/login");
  }
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

const symbolList = new StockManager(db);

app.get("/secrets", async (req, res) => {
  if (req.isAuthenticated()) {
    const userId = req.user.id; // Get the user ID from the request object
    // Use the userId for further operations
    const userRole = req.user.role;
    const userEmail = req.user.email;
    try {
      const symbolLists = await symbolList.getSymbolList();
      res.render('secrets.ejs', { symbolLists: symbolLists, userRole: userRole, userEmail: userEmail });
    } catch (error) {
      console.error('Error fetching stock list:', error);
      res.render('error.ejs', { message: 'Error fetching stock list' });
    }
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
    failureRedirect: "/successGoogle",
  })
);
app.get("/successGoogle", (req, res) => {
  res.render("successGoogle.ejs", {error: ""});
});
app.post("/login", (req, res, next) => {
  passport.authenticate("admin", (err, user, info) => {
    if (user) {
      return req.logIn(user, (loginErr) => {
        if (loginErr) {
          return next(loginErr);
        }
        return res.redirect("/admin");
      });
    } else {
      // If admin authentication fails, proceed to local authentication
      passport.authenticate("local", (err, user, info) => {
        if (user) {
          return req.logIn(user, (loginErr) => {
            if (loginErr) {
              return next(loginErr);
            }
            return res.redirect("/secrets");
          });
        } else {
          // If both admin and local authentication fail, display error message
          return res.render('login', { error: "Incorrect username or password"});
        }
      })(req, res, next);
    }
  })(req, res, next);
});


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
      res.render('register', { error: `${newUser.email} already exists` });
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
              email: user.email,
            };
            console.log("success");
            res.render('successRegister.ejs', { message: 'Registration successful! \n Now you can experience our product' }); // Passing message variable
          });
        }
      });
    }
  } catch (err) {
    console.log(err);
    //res.render('register.ejs', { error: `${newUser.email} already exists` });
  }
});


// Define the 'admin' authentication strategy
passport.use(
  "admin",
  new Strategy(async function verify(username, password, cb) {
    try {
      const result = await db.query("SELECT * FROM users WHERE email = $1 AND is_admin = true", [
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
              console.log('admin');
              return cb(null, { id: user.id, role: 'admin', email: user.email/* Other user properties */ });
            } else {
              return cb(null, false);
            }
          }
        });
      } else {
        return cb("Admin not found");
      }
    } catch (err) {
      console.log(err);
    }
  })
);

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
              return cb(null, { id: user.id,  role: 'local', email: user.email /* Other user properties */ });
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
          //req.user = { id: newUser.rows[0].id, /* Other user properties */ }; // Set the user ID in the request object
          return cb(null, newUser.rows[0],);
        } else {
          return cb(null, result.rows[0],);
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