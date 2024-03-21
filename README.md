# VinStock

VinStock is a financial service application that provides users with access to comprehensive financial data for a set of U.S. listed stocks. The application includes historical share prices, financials, and company information for the listed stocks, enhancing users' ability to make informed investment decisions.

## Screenshots

![Homepage](screenshots/homepage.png)
*Figure 1: Homepage showcasing featured stocks*

![Stock Detail](screenshots/stock_detail.png)
*Figure 2: Detailed view of a stock including historical data and financials*

## Features

- Access to historical share prices for U.S. listed stocks.
- Detailed financial information including balance sheets, income statements, and cash flow statements.
- Company profiles and key metrics for each listed stock.
- User-friendly interface with intuitive navigation and multiple views for summary and detailed data.

## Getting Started

To get started with VinStock, follow these steps:

1. Install the necessary software: Visual Studio Code, Node.js, Git bash, and PostgreSQL
2. Clone the repository to your local machine: git clone https://github.com/yourusername/vinstock.git
3. Launch Visual Studio Code and navigate to the project directory using the integrated terminal, preferably the Git Bash terminal.
4. Install dependencies: npm install
5. Set up the PostgreSQL database and configure the connection settings.
The database configuration is stored in the .env file.
You can adjust the values for PG_DATABASE and PG_PASSWORD to match your configuration.
6. Use the provided code in query.sql to create the necessary SQL tables.
7. Create a .env file with the following environment variables: Please contact for more information [ht@cwu.edu](mailto:ht@cwu.edu).
6. Start the server: nodemon index.js
7. Access the application in your web browser at `http://localhost:3000`.

## Usage

1. Register an account or log in if you already have an account.
2. Explore the available stocks and view detailed financial information for each stock.
3. Add stocks to your favorite list for quick access.

## Contributing

We welcome contributions from the community to enhance VinStock. If you would like to contribute, please follow these guidelines:

- Fork the repository and create a new branch for your feature or bug fix.
- Submit a pull request detailing the changes made and any relevant information.

## Contact

For any questions or inquiries, please contact [ht@cwu.edu](mailto:ht@cwu.edu).

## Acknowledgments

Special thanks to [Alpha Vantage](https://rapidapi.com/alphavantage/api/alpha-vantage) for providing financial data API.
