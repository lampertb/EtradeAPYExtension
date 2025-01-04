# E*TRADE APY Calculator Chrome Extension

A Chrome extension that adds APY (Annual Percentage Yield) calculations to E*TRADE option chains. The extension automatically calculates and displays APY values for both calls and puts, helping you identify potential returns.

## Features

- Automatic APY calculations for all option chains
- Color-coded indicators:
  - 🔵 Blue: Highest APY among options with open interest
  - 🟢 Green: Positive APY
  - 🔴 Red: Negative APY
  - **Bold**: Options with open interest (actively traded)
- Works with all E*TRADE option table layouts:
  - Combined calls/puts view
  - Calls-only view
  - Puts-only view
- Auto-updates when option prices change
- Clear visual indicators for best opportunities

## Installation

1. Clone this repository or download the source code:
```bash
git clone https://github.com/yourusername/etrade-apy-calculator.git
```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" in the top right corner

4. Click "Load unpacked" and select the extension directory

5. The extension icon should appear in your Chrome toolbar

## Usage

1. Log in to your E*TRADE account

2. Navigate to the options chain page:
   - Go to: https://us.etrade.com/e/t/invest/quotesandresearch
   - Enter a stock symbol
   - Click "Option Chain" or select an option strike

3. The APY columns will automatically appear:
   - For combined view: Both Call APY and Put APY columns at the end
   - For separate views: Single APY column at the end

## APY Formula

```
APY = ((bid price × 10) / (strike price × 1000)) × (365 / days to expiration)
```

## Example URLs

- Main Research Page:
  https://us.etrade.com/e/t/invest/quotesandresearch

- Option Chain Examples:
  - AAPL Options:
    https://us.etrade.com/e/t/invest/quotesandresearch?symbol=AAPL#optionsChain
  - SPY Options:
    https://us.etrade.com/e/t/invest/quotesandresearch?symbol=SPY#optionsChain

Note: You must be logged into your E*TRADE account to access these URLs.

## Understanding the Results

- **APY Value**: Shows the annualized return if the option expires worthless
- **Bold Numbers**: Indicates active trading (has open interest)
- **Blue Color**: Best return among actively traded options
- **Green/Red**: Positive/negative potential returns

## Troubleshooting

If the APY columns don't appear:
1. Refresh the page
2. Ensure you're on an E*TRADE options chain page
3. Check that the extension is enabled
4. Try disabling and re-enabling the extension

## Contributing

Feel free to submit issues, fork the repository, and create pull requests for any improvements.

## License

MIT License - feel free to use and modify as needed.

## Disclaimer

This extension is not affiliated with, endorsed by, or connected to E*TRADE. Use at your own risk. Always verify calculations and consult with a financial advisor before making investment decisions.