// SearchManager class to handle searching for symbols or company names
class SearchManager {
  constructor(countries) {
    this.countries = countries;
  }

  getSymbolAndNames() {
    return this.countries.map(item => item.symbolAndName);
  }
}

  export default SearchManager;