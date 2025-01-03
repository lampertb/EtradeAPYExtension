// Self-executing function to avoid polluting global namespace
(function() {
  console.log("E*TRADE APY Calculator: Starting...");
  
  // Flag to track if we're currently modifying the DOM
  let isProcessing = false;

  // Track highest APYs for options with open interest
  let highestCallAPY = { value: -1, element: null };
  let highestPutAPY = { value: -1, element: null };

  function extractBidFromCell(cell) {
    const link = cell.querySelector('a');
    if (!link) {
      console.log("No link found in cell");
      return 0;
    }

    const href = link.getAttribute('href') || '';
    const match = href.match(/limitprice=(\d*\.?\d+)/);
    if (match && match[1]) {
      const bid = parseFloat(match[1]);
      console.log(`Extracted bid price ${bid} from href: ${href}`);
      return bid;
    }

    console.log("No bid price found in href:", href);
    return 0;
  }

  function getOpenInterest(cell) {
    const text = cell.textContent.trim();
    const value = parseInt(text.replace(/,/g, ''), 10);
    return isNaN(value) ? 0 : value;
  }

  function calculateAPY(bid, strike, daysToExp) {
    console.log("\nAPY Calculation Details:");
    console.log(`Input values: bid=${bid}, strike=${strike}, daysToExp=${daysToExp}`);
    
    if (!bid || !strike || !daysToExp || daysToExp <= 0) {
      console.log("❌ Invalid inputs - Calculation skipped");
      console.log(`  bid ${bid ? '✓' : '❌'} (${typeof bid})`);
      console.log(`  strike ${strike ? '✓' : '❌'} (${typeof strike})`);
      console.log(`  daysToExp ${daysToExp ? '✓' : '❌'} (${typeof daysToExp})`);
      return 0;
    }

    const bidTerm = bid * 10;
    const strikeTerm = strike * 1000;
    const ratio = bidTerm / strikeTerm;
    const daysRatio = 365 / daysToExp;
    const apy = ratio * daysRatio;
    
    console.log(`Final APY as percentage: ${(apy * 100).toFixed(2)}%`);
    return apy;
  }

  function updateHighestAPYs() {
    // Reset colors of previous highest APYs
    if (highestCallAPY.element) {
      highestCallAPY.element.style.color = "#009900";
    }
    if (highestPutAPY.element) {
      highestPutAPY.element.style.color = "#009900";
    }

    // Set new highest APYs to blue
    if (highestCallAPY.value > 0) {
      highestCallAPY.element.style.color = "#0000FF";
    }
    if (highestPutAPY.value > 0) {
      highestPutAPY.element.style.color = "#0000FF";
    }
  }

  function waitForElement(selector, maxAttempts = 10) {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const interval = setInterval(() => {
        const element = document.querySelector(selector);
        attempts++;
        console.log(`Attempt ${attempts} to find ${selector}`);
        
        if (element) {
          clearInterval(interval);
          resolve(element);
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          reject(`Element ${selector} not found after ${maxAttempts} attempts`);
        }
      }, 1000);
    });
  }

  async function addAPYColumns() {
    if (isProcessing) {
      console.log("Already processing, skipping...");
      return;
    }

    try {
      isProcessing = true;
      console.log("\n=== Starting APY Column Addition ===");
      
      // Reset highest APY tracking
      highestCallAPY = { value: -1, element: null };
      highestPutAPY = { value: -1, element: null };

      if (document.querySelector("td.oheader b[data-apy-call-header='true']")) {
        console.log("APY columns already exist, skipping");
        isProcessing = false;
        return;
      }

      const optionTable = await waitForElement("tr.title_curr_month_bg");
      if (!optionTable) {
        console.error("Could not find options table!");
        isProcessing = false;
        return;
      }

      const headerRow = document.querySelector("tr.TBHeader_bg");
      if (headerRow) {
        const callHeader = document.createElement("td");
        callHeader.className = "oheader";
        const callHeaderContent = document.createElement("b");
        callHeaderContent.textContent = "Call APY";
        callHeaderContent.setAttribute("data-apy-call-header", "true");
        callHeader.appendChild(callHeaderContent);
        
        const putHeader = document.createElement("td");
        putHeader.className = "oheader";
        const putHeaderContent = document.createElement("b");
        putHeaderContent.textContent = "Put APY";
        putHeaderContent.setAttribute("data-apy-put-header", "true");
        putHeader.appendChild(putHeaderContent);
        
        headerRow.appendChild(callHeader);
        headerRow.appendChild(putHeader);
      }

      const dateCell = document.querySelector("td.selectedDate b");
      let daysToExp = 0;
      if (dateCell) {
        const dateText = dateCell.textContent.trim();
        const [monthStr, dayStr, yearStrWithApostrophe] = dateText.split(" ");
        const dayNum = parseInt(dayStr);
        const months = {
          JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
          JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11
        };
        const monthNum = months[monthStr.toUpperCase()] || 0;
        const yearNum = 2000 + parseInt(yearStrWithApostrophe.replace("'", ""));
        
        const expirationDate = new Date(yearNum, monthNum, dayNum);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        expirationDate.setHours(0, 0, 0, 0);
        
        const msInDay = 1000 * 60 * 60 * 24;
        daysToExp = Math.round((expirationDate.getTime() - today.getTime()) / msInDay);
        if (daysToExp < 0) daysToExp = 0;
      } else {
        console.error("Could not find expiration date!");
        isProcessing = false;
        return;
      }

      const optionRows = document.querySelectorAll("tr[bgcolor='#ffffff']");
      
      optionRows.forEach((row, index) => {
        if (row.querySelector("td[data-apy-cell]")) {
          return;
        }

        const cells = row.querySelectorAll("td");
        const strikeCell = row.querySelector("td.strikePrice_bg");
        const callBidCell = cells[6];
        const putBidCell = cells[9];
        const callOpenInterestCell = cells[2];  // Open Interest cell for calls
        const putOpenInterestCell = cells[14];  // Open Interest cell for puts

        if (!strikeCell || !callBidCell || !putBidCell || !callOpenInterestCell || !putOpenInterestCell) {
          return;
        }

        const strike = parseFloat(strikeCell.textContent.trim());
        const callBid = extractBidFromCell(callBidCell);
        const putBid = extractBidFromCell(putBidCell);
        const callOpenInterest = getOpenInterest(callOpenInterestCell);
        const putOpenInterest = getOpenInterest(putOpenInterestCell);

        console.log(`Row ${index + 1}: Call OI=${callOpenInterest}, Put OI=${putOpenInterest}`);

        // Calculate Call APY
        const callAPY = calculateAPY(callBid, strike, daysToExp);
        const callAPYCell = document.createElement("td");
        callAPYCell.className = callBid > 0 ? "itm" : "";
        callAPYCell.setAttribute("data-apy-cell", "call");
        const callAPYPercent = (callAPY * 100).toFixed(2) + "%";
        callAPYCell.textContent = callAPYPercent;
        callAPYCell.style.color = callAPY > 0 ? "#009900" : "#cc0000";

        // Bold if has open interest
        if (callOpenInterest > 0) {
            callAPYCell.style.fontWeight = "bold";
            // Track highest call APY with open interest
            if (callAPY > highestCallAPY.value) {
                highestCallAPY.value = callAPY;
                highestCallAPY.element = callAPYCell;
            }
        }

        // Calculate Put APY
        const putAPY = calculateAPY(putBid, strike, daysToExp);
        const putAPYCell = document.createElement("td");
        putAPYCell.className = putBid > 0 ? "itm" : "";
        putAPYCell.setAttribute("data-apy-cell", "put");
        const putAPYPercent = (putAPY * 100).toFixed(2) + "%";
        putAPYCell.textContent = putAPYPercent;
        putAPYCell.style.color = putAPY > 0 ? "#009900" : "#cc0000";

        // Bold if has open interest
        if (putOpenInterest > 0) {
            putAPYCell.style.fontWeight = "bold";
            // Track highest put APY with open interest
            if (putAPY > highestPutAPY.value) {
                highestPutAPY.value = putAPY;
                highestPutAPY.element = putAPYCell;
            }
        }

        row.appendChild(callAPYCell);
        row.appendChild(putAPYCell);
      });

      // Update colors for highest APYs
      updateHighestAPYs();

      // Adjust footer colspan
      const footerRow = document.querySelector("tr.strikePrice_bg");
      if (footerRow) {
        const footerCell = footerRow.querySelector("td");
        if (footerCell) {
          const currentColspan = parseInt(footerCell.getAttribute("colspan") || "17");
          footerCell.setAttribute("colspan", (currentColspan + 2).toString());
        }
      }

    } catch (error) {
      console.error("Error in addAPYColumns:", error);
    } finally {
      isProcessing = false;
    }
  }

  // Initial run with delay
  setTimeout(() => {
    console.log("Initial run after delay");
    addAPYColumns();
  }, 2000);

  // Watch for dynamic updates
  let timeout = null;
  const observer = new MutationObserver((mutations) => {
    const relevantMutations = mutations.filter(mutation => {
      return ![...mutation.addedNodes].some(node => {
        return node.nodeType === 1 && 
               (node.hasAttribute('data-apy-cell') || 
                node.querySelector('[data-apy-cell], [data-apy-call-header], [data-apy-put-header]'));
      });
    });

    if (relevantMutations.length === 0) {
      return;
    }

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      console.log("\n=== Re-running APY Calculations ===");
      addAPYColumns();
    }, 1000);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false
  });
})();