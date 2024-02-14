CREATE TABLE users(
id SERIAL PRIMARY KEY,
email VARCHAR(100) NOT NULL UNIQUE,
password VARCHAR(100)
)

CREATE TABLE stock_data (
    symbol VARCHAR(10) unique,
    open_price NUMERIC,
    high_price NUMERIC,
    low_price NUMERIC,
    current_price NUMERIC,
    volume INTEGER,
    last_trading_day DATE,
    previous_close NUMERIC,
    change_amount NUMERIC,
    change_percent NUMERIC
);