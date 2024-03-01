class CompanyOverview {
    constructor(data) {
      this.companyName = data.Name;
      this.exchange = data.Exchange;
      this.symbol = data.Symbol;
      this.description = data.Description;
      this.country = data.Country;
      this.currency = data.Currency;
      this.sector = data.Sector;
      this.industry = data.Industry;
      this.address = data.Address;
      // Add more properties based on the actual structure of the data
    }
    // Add more properties
    addProperty(propertyName, propertyValue) {
      this[propertyName] = propertyValue;
    }
  }
  
  export default CompanyOverview;
  