// helpers.js

// Define a function to format numbers into "M" or "B" format
console.log('helpers.js is imported successfully');

function formatAmount(number) {
  if (Math.abs(number) >= 1e9) {
      return (number / 1e9).toFixed(1) + 'B'; // Divide by billion
  } else if (Math.abs(number) >= 1e6) {
      return (number / 1e6).toFixed(1) + 'M'; // Divide by million
  } else {
      return number.toString(); // Return the number as is
  }
}

module.exports = { formatAmount };
