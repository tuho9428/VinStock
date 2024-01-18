import dotenv from 'dotenv';
 
dotenv.config();
import express from "express";
import bodyParser from "body-parser";
import methodOverride from "method-override";
import axios from "axios";
// ... (other imports and app setup)




// Add a global array to store blogs
const blogs = [];
const app = express();
const port = 3000;
const API_URL = "http://localhost:4000";
const yourAPIKey = "170b6183-0ad0-4fdb-b76f-e4bebf389c5d";

app.use(methodOverride("_method"));
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());


app.get("/", (req, res) => {
  res.render("index.ejs");
});

// overview
app.get("/overview", (req, res) => {
  res.render("overview.ejs", { content: "", symbol: StockSymbol  });
});

// Inside the app.post("/get-prices") route handler
app.post("/overview", async (req, res) => {
  let score = req.body.score; // Get the score entered by the user

  try {
    let config = {
      params: {
        score: score,
        apiKey: process.env.API_KEY,
      },
    };

    const response = await axios.get(API_URL+"/filter", config);
    const data = response.data;
    const StockSymbol = score;

    if (Array.isArray(data) && data.length > 0) {
      // Format the API response into an array of objects
      const secrets = Object.values(data);

      // Construct the secrets object to pass to the template
      const secretsObj = {
        secrets: secrets,
      };

      res.render("overview.ejs", { content: secretsObj });
    } 
  } catch (error) {
    console.error(error);
    res.render("overview.ejs", { content: { error: `Secrets not found for the given filter (score: ${score}).` } });
  }
});
//

// income statement
app.get("/incomestatement", (req, res) => {
  res.render("incomestatement.ejs", { content: "" });
});

app.post("/incomestatement", async (req, res) => {
  let score = req.body.score; // Get the score entered by the user

  try {
    let config = {
      params: {
        score: score,
        apiKey: yourAPIKey,
      },
    };

    const response = await axios.get(API_URL+"/filter", config);
    const data = response.data;

    if (Array.isArray(data) && data.length > 0) {
      // Format the API response into an array of objects
      const secrets = Object.values(data);

      // Construct the secrets object to pass to the template
      const secretsObj = {
        secrets: secrets,
      };

      res.render("incomestatement.ejs", { content: secretsObj });
    } 
  } catch (error) {
    console.error(error);
    res.render("incomestatement.ejs", { content: { error: `Secrets not found for the given filter (score: ${score}).` } });
  }
});
//


app.get("/stockprice", (req, res) => {
  res.render("stockprice.ejs", { content: "" });
});

app.post("/stockprice", async (req, res) => {
  let score = req.body.score; // Get the score entered by the user

  try {
    let config = {
      params: {
        score: score,
        apiKey: yourAPIKey,
      },
    };

    const response = await axios.get(API_URL+"/filter", config);
    const data = response.data;

    if (Array.isArray(data) && data.length > 0) {
      // Format the API response into an array of objects
      const secrets = Object.values(data);

      // Construct the secrets object to pass to the template
      const secretsObj = {
        secrets: secrets,
      };

      res.render("stockprice.ejs", { content: secretsObj });
    } 
  } catch (error) {
    console.error(error);
    res.render("stockprice.ejs", { content: { error: `Secrets not found for the given filter (score: ${score}).` } });
  }
});

app.get("/about", (req, res) => {
  //res.render("about.ejs");
  res.render("graph.ejs");
});

app.get("/contact", (req, res) => {
  res.render("contact.ejs");
});



app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});


