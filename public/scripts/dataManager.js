import axios from 'axios';

// DataManager class to handle data fetching and processing
class DataManager {
  constructor(apiUrl, rapidapiKey) {
    this.apiUrl = apiUrl;
    this.rapidapiKey = rapidapiKey;
  }

  async fetchFinancialData(symbol, dataType) {
    try {
      const config = {
        method: 'GET',
        url: this.apiUrl + '/query',
        params: {
          function: dataType,
          symbol: symbol,
          apikey: this.rapidapiKey,
        },
        headers: {
          'x-rapidapi-host': 'alpha-vantage.p.rapidapi.com',
          'x-rapidapi-key': this.rapidapiKey
        },
      };

      const response = await axios.request(config);
      const data = response.data;

      // Process the data based on the dataType
      if (dataType === 'OVERVIEW') {
        return this.formatCompanyOverview(data, symbol);
      } else if (dataType === 'INCOME_STATEMENT') {
        return this.formatIncomeStatement(data, symbol);
      } else {
        throw new Error('Invalid data type');
      }
    } catch (error) {
      console.error(`Error in fetchFinancialData (${dataType}):`, error);
      throw new Error(`Failed to fetch ${dataType.toLowerCase()}.`);
    }
  }

  formatCompanyOverview(data, symbol) {
    const companyOverview = {
      companyName: data.Name,
      exchange: data.Exchange,
      symbol: data.Symbol,
      description: data.Description,
      // Add more properties based on the actual structure of the data
    };

    return { content: companyOverview, symbol: symbol, timeSerie: "Company Overview" };
  }

  formatIncomeStatement(data, symbol) {
    // Modify this part based on the actual structure of the Income Statement data
    return { content: data, symbol: symbol, timeSerie: "Income Statement" };
  }
}

  export default DataManager;