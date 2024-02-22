import fs from 'fs';
import csv from 'csv-parser';

// DataProcessor class for processing country data from CSV
class DataProcessor {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = [];
  }

  processCSVFile() {
    fs.createReadStream(this.filePath)
      .pipe(csv())
      .on('data', (row) => {
        this.data.push(row);
      })
      .on('end', () => {
        console.log('CSV file successfully processed');
      });
  }

  getData() {
    return this.data;
  }
}


  export default DataProcessor;