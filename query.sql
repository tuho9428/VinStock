DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS stock_data;
DROP TABLE IF EXISTS favorite_stocks;

CREATE TABLE users(
id SERIAL PRIMARY KEY,
email VARCHAR(100) NOT NULL UNIQUE,
password VARCHAR(100)
);

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

CREATE TABLE favorite_stocks (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_symbol UNIQUE (user_id, symbol)
);
