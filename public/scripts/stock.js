// StockData class representing stock data
class Stock {
  constructor(symbol, open_price, high_price, low_price, current_price, volume, last_trading_day, previous_close, change_amount, change_percent) {
    this.symbol = symbol;
    this.open_price = open_price;
    this.high_price = high_price;
    this.low_price = low_price;
    this.current_price = current_price;
    this.volume = volume;
    this.last_trading_day = last_trading_day;
    this.previous_close = previous_close;
    this.change_amount = change_amount;
    this.change_percent = change_percent;
  }
}

  export default Stock;