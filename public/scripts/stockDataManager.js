import StockData from './stockData.js';

// StockDataManager class for managing stock data
class StockDataManager {
  constructor(db) {
    this.db = db;
  }

  async updateStockData(stockData) {
    try {
      const queryCheck = `SELECT * FROM stock_data WHERE symbol = $1`;
      const checkResult = await this.db.query(queryCheck, [stockData.symbol]);

      if (checkResult.rows.length > 0) {
        const updateQuery = `UPDATE stock_data 
                             SET open_price = $2, high_price = $3, low_price = $4, current_price = $5, volume = $6,
                                 last_trading_day = $7, previous_close = $8, change_amount = $9, change_percent = $10
                             WHERE symbol = $1`;
        await this.db.query(updateQuery, [
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
        await this.db.query(insertQuery, [
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
    } catch (error) {
      console.error('Error updating stock data:', error);
      throw error;
    }
  }

  async getStockData(symbol) {
    try {
      const query = 'SELECT * FROM stock_data WHERE symbol = $1';
      const { rows } = await this.db.query(query, [symbol]);

      if (rows.length > 0) {
        const data = rows[0];
        return new StockData(data.symbol, data.open_price, data.high_price, data.low_price, data.current_price,
          data.volume, data.last_trading_day, data.previous_close, data.change_amount, data.change_percent);
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting stock data:', error);
      throw error;
    }
  }

  async addSymbol(symbol) {
    try {
      // Add the symbol to the database
      const query = "INSERT INTO stock_data (symbol) VALUES ($1)";
      await this.db.query(query, [symbol]);
    } catch (error) {
      throw new Error("Error adding symbol to the database");
    }
  }

  async removeSymbol(symbol) {
    try {
      const query = "DELETE FROM stock_data WHERE symbol = $1";
      await this.db.query(query, [symbol]);
    } catch (error) {
      throw new Error("Error removing symbol from the database");
    }
  }

  async getSymbolListAdmin() {
    try {
      const query = "SELECT symbol FROM stock_data";
      const result = await this.db.query(query);
      return result.rows.map(row => row.symbol);
    } catch (error) {
      throw new Error("Error fetching symbol list from the database");
    }
  }

  async getUserList() {
    try {
      const query = "SELECT email FROM users"; // Adjust this query based on your actual database schema
      const result = await this.db.query(query);
      return result.rows.map(row => row.email);
    } catch (error) {
      throw new Error("Error fetching symbol list from the database");
    }
  }

}

  export default StockDataManager;