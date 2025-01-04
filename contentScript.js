// Self-executing function to avoid polluting global namespace
(function() {
  console.log("E*TRADE APY Calculator: Starting...");
  
  // Flag to track if we're currently modifying the DOM
  let isProcessing = false;

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

  function getDaysToExpiration() {
    // First try to get days from mouseover text
    const detailsLink = document.querySelector('a[onmouseover*="Days to Trade"]');
    if (detailsLink) {
      const mouseover = detailsLink.getAttribute('onmouseover') || '';
      const daysMatch = mouseover.match(/Days to Trade:\s*(\d+)/);
      if (daysMatch && daysMatch[1]) {
        const days = parseInt(daysMatch[1]);
        console.log(`Found days to expiration from mouseover: ${days}`);
        return days;
      }
    }

    // Try different date selectors based on table structure
    const dateSelectors = [
      'td.selectedDate b',                    // Combined table
      'span.selectedDate b',                  // Separate tables
      'th span.selectedDate b',               // Another possible structure
      'tr.title_curr_month_bg td.selectedDate b',  // Yet another structure
      'tr th span.selectedDate b'             // Put-only table structure
    ];

    for (const selector of dateSelectors) {
      const dateElement = document.querySelector(selector);
      if (dateElement) {
        const dateText = dateElement.textContent.trim(); // e.g. "JAN 31 '25"
        console.log(`Found date text "${dateText}" using selector "${selector}"`);
        
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
        const days = Math.round((expirationDate.getTime() - today.getTime()) / msInDay);
        console.log(`Calculated ${days} days to expiration from date ${dateText}`);
        return Math.max(0, days);
      }
    }

    console.error("Could not find expiration date using any selector!");
    return 0;
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

  function determineTableType(table) {
    // First check for combined table
    const headerCells = table.querySelectorAll("tr.title_curr_month_bg td");
    if (headerCells.length > 0) {
      const headerText = Array.from(headerCells).map(cell => cell.textContent).join(" ");
      if (headerText.includes("CALLS") && headerText.includes("PUTS")) {
        console.log("Detected combined calls/puts table");
        return "combined";
      }
    }

    // Check for separate tables
    const headerTh = table.querySelector("tr th, tr td.title_curr_month_bg");
    if (headerTh) {
      const headerText = headerTh.textContent.trim();
      console.log("Table header text:", headerText);
      
      if (headerText.includes("CALLS")) {
        console.log("Detected calls-only table");
        return "calls";
      }
      if (headerText.includes("PUTS")) {
        console.log("Detected puts-only table");
        return "puts";
      }
    }

    console.log("Could not determine table type from header");
    return null;
  }

  function processOptionsTable() {
    if (isProcessing) {
      console.log("Already processing, skipping...");
      return;
    }

    try {
      isProcessing = true;
      console.log("\n=== Starting APY Column Addition ===");

      // Track highest APYs with open interest
      let highestCallAPY = { value: -1, element: null };
      let highestPutAPY = { value: -1, element: null };

      // Get days to expiration first
      const daysToExp = getDaysToExpiration();
      if (!daysToExp) {
        console.error("Could not determine days to expiration");
        isProcessing = false;
        return;
      }

      // Find all option tables
      const tables = document.querySelectorAll("tbody");
      console.log(`Found ${tables.length} potential tables`);
      
      tables.forEach((table, tableIndex) => {
        const tableType = determineTableType(table);
        if (!tableType) {
          return;
        }

        console.log(`Processing ${tableType} table #${tableIndex + 1}`);

        // Add APY header(s)
        const headerRow = table.querySelector("tr.TBHeader_bg");
        if (headerRow && !headerRow.querySelector("[data-apy-header]")) {
          if (tableType === "combined") {
            // Add both Call and Put APY headers at the end
            const callHeader = document.createElement("td");
            callHeader.className = "oheader";
            const callContent = document.createElement("b");
            callContent.textContent = "Call APY";
            callContent.setAttribute("data-apy-header", "call");
            callHeader.appendChild(callContent);

            const putHeader = document.createElement("td");
            putHeader.className = "oheader";
            const putContent = document.createElement("b");
            putContent.textContent = "Put APY";
            putContent.setAttribute("data-apy-header", "put");
            putHeader.appendChild(putContent);

            headerRow.appendChild(callHeader);
            headerRow.appendChild(putHeader);
          } else {
            // Add single APY header at the end
            const apyHeader = document.createElement("td");
            apyHeader.className = "oheader";
            const headerContent = document.createElement("b");
            headerContent.textContent = tableType === "calls" ? "Call APY" : "Put APY";
            headerContent.setAttribute("data-apy-header", tableType === "calls" ? "call" : "put");
            apyHeader.appendChild(headerContent);
            headerRow.appendChild(apyHeader);
          }
        }

        // Process option rows
        const optionRows = table.querySelectorAll("tr[bgcolor='#ffffff'], tr.itm");
        console.log(`Found ${optionRows.length} option rows in ${tableType} table`);
        
        optionRows.forEach((row, index) => {
          // Skip if APY cells already exist
          if (row.querySelector("[data-apy-cell]")) {
            return;
          }

          const cells = row.querySelectorAll("td");
          const strikeCell = row.querySelector("td.strikePrice_bg");
          
          if (!strikeCell || cells.length < 8) {
            console.log(`Row ${index}: Missing required cells`);
            return;
          }

          const strike = parseFloat(strikeCell.textContent.trim());
          console.log(`Row ${index}: Processing strike price ${strike}`);

          if (tableType === "combined") {
            // Process both call and put data
            const callBidCell = cells[6];  // 7th cell is call bid
            const putBidCell = cells[9];   // 10th cell is put bid
            const callOICell = cells[2];   // 3rd cell is call OI
            const putOICell = cells[14];   // 15th cell is put OI

            // Calculate Call APY
            const callBid = extractBidFromCell(callBidCell);
            const callOI = parseInt(callOICell.textContent.trim().replace(/,/g, '')) || 0;
            const callAPY = calculateAPY(callBid, strike, daysToExp);

            const callAPYCell = document.createElement("td");
            callAPYCell.className = callBid > 0 ? "itm" : "";
            callAPYCell.setAttribute("data-apy-cell", "call");
            const callAPYPercent = (callAPY * 100).toFixed(2) + "%";
            callAPYCell.textContent = callAPYPercent;

            if (callOI > 0) {
              callAPYCell.style.fontWeight = "bold";
              if (callAPY > highestCallAPY.value) {
                highestCallAPY.value = callAPY;
                highestCallAPY.element = callAPYCell;
              }
            }
            callAPYCell.style.color = callAPY > 0 ? "#009900" : "#cc0000";

            // Calculate Put APY
            const putBid = extractBidFromCell(putBidCell);
            const putOI = parseInt(putOICell.textContent.trim().replace(/,/g, '')) || 0;
            const putAPY = calculateAPY(putBid, strike, daysToExp);

            const putAPYCell = document.createElement("td");
            putAPYCell.className = putBid > 0 ? "itm" : "";
            putAPYCell.setAttribute("data-apy-cell", "put");
            const putAPYPercent = (putAPY * 100).toFixed(2) + "%";
            putAPYCell.textContent = putAPYPercent;

            if (putOI > 0) {
              putAPYCell.style.fontWeight = "bold";
              if (putAPY > highestPutAPY.value) {
                highestPutAPY.value = putAPY;
                highestPutAPY.element = putAPYCell;
              }
            }
            putAPYCell.style.color = putAPY > 0 ? "#009900" : "#cc0000";

            // Add both cells at the end
            row.appendChild(callAPYCell);
            row.appendChild(putAPYCell);
          } else {
            // Process single type (calls or puts)
            const bidCell = cells[2];  // 3rd cell is bid
            const oiCell = cells[7];   // 8th cell is OI

            if (!bidCell || !oiCell) {
              console.log(`Row ${index}: Missing bid or OI cell`);
              return;
            }

            const bid = extractBidFromCell(bidCell);
            const openInterest = parseInt(oiCell.textContent.trim().replace(/,/g, '')) || 0;
            const apy = calculateAPY(bid, strike, daysToExp);

            const apyCell = document.createElement("td");
            apyCell.className = bid > 0 ? "itm" : "";
            apyCell.setAttribute("data-apy-cell", tableType);
            const apyPercent = (apy * 100).toFixed(2) + "%";
            apyCell.textContent = apyPercent;

            if (openInterest > 0) {
              apyCell.style.fontWeight = "bold";
              if (tableType === "calls" && apy > highestCallAPY.value) {
                highestCallAPY.value = apy;
                highestCallAPY.element = apyCell;
              } else if (tableType === "puts" && apy > highestPutAPY.value) {
                highestPutAPY.value = apy;
                highestPutAPY.element = apyCell;
              }
            }
            apyCell.style.color = apy > 0 ? "#009900" : "#cc0000";
            row.appendChild(apyCell);
          }
        });

        // Adjust footer colspan
        const footerRow = table.querySelector("tr.strikePrice_bg");
        if (footerRow) {
          const footerCell = footerRow.querySelector("td");
          if (footerCell) {
            const currentColspan = parseInt(footerCell.getAttribute("colspan") || "9");
            const additionalCols = tableType === "combined" ? 2 : 1;
            footerCell.setAttribute("colspan", (currentColspan + additionalCols).toString());
          }
        }
      });

      // Update colors for highest APYs
      if (highestCallAPY.element) {
        highestCallAPY.element.style.color = "#0000FF";
      }
      if (highestPutAPY.element) {
        highestPutAPY.element.style.color = "#0000FF";
      }

    } catch (error) {
      console.error("Error in processOptionsTable:", error);
    } finally {
      isProcessing = false;
    }
  }

  // Initial run with delay
  setTimeout(() => {
    console.log("Initial run after delay");
    processOptionsTable();
  }, 2000);

  // Watch for dynamic updates
  let timeout = null;
  const observer = new MutationObserver((mutations) => {
    const relevantMutations = mutations.filter(mutation => {
      return ![...mutation.addedNodes].some(node => {
        return node.nodeType === 1 && 
               (node.hasAttribute('data-apy-cell') || 
                node.querySelector('[data-apy-cell], [data-apy-header]'));
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
      processOptionsTable();
    }, 400);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false
  });
})();