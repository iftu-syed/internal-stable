function createCombinedChart(surveyResponseRate, timeSeriesData) {
    const width = 250;
    const height = 250;
    const thickness = 35;
    const radius = Math.min(width, height) / 2;
    const margin = { top: 60, right: 20, bottom: 50, left: 40 };
    const barWidth = width;
    const barHeight = 150;

    const responseRate = surveyResponseRate;

    // Clear any existing content and tooltips
    d3.select("#combinedChart").selectAll("*").remove();

    // Create tooltip div
    const tooltip = d3.select("#combinedChart")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background-color", "white")
        .style("border", "1px solid #ddd")
        .style("border-radius", "4px")
        .style("padding", "8px")
        .style("pointer-events", "none")
        .style("font-size", "12px")
        .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)");

    const svg = d3.select("#combinedChart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + barHeight + margin.top + margin.bottom + 20)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2 - 15)
        .attr("class", "chart-title")
        .attr("text-anchor", "middle")
        .style("font-family", "Urbanist")
        .text("Survey Response Rate");

    const donutGroup = svg.append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2 - 20})`);

    const arc = d3.arc()
        .innerRadius(radius - thickness)
        .outerRadius(radius);

    const pie = d3.pie()
        .value(d => d)
        .sort(null);

    const dataForDonut = [responseRate, 100 - responseRate];

    // Function to handle donut segment mouseover
    const handleDonutMouseOver = function(event, d) {
        const segment = d3.select(this);
        
        // Highlight the segment
        segment.transition()
            .duration(300)
            .attr('transform', 'scale(1.05)');

        // Show tooltip
        tooltip.transition()
            .duration(200)
            .style("opacity", 0.9);

        const label = d.index === 0 ? "Response Rate" : "Non-Response Rate";
        tooltip.html(`${label}: ${d.value.toFixed(1)}%`)
            .style("left", (event.pageX + 10) + "px")
            .style("font-family", "Urbanist")
            .style("top", (event.pageY - 28) + "px");
    };
    const handleMouseMove = function(event) {
        // Update tooltip position to be closer to the cursor
        tooltip
            .style("left", (event.pageX - 35) + "px")  // Adjusted X position (closer)
            .style("top", (event.pageY - 5) + "px"); // Adjusted Y position (closer)
    };

    // Function to handle donut segment mouseout
    const handleDonutMouseOut = function() {
        const segment = d3.select(this);
        
        // Reset the segment
        segment.transition()
            .duration(300)
            .attr('transform', 'scale(1)');

        // Hide tooltip
        tooltip.transition()
            .duration(500)
            .style("opacity", 0);
    };

    // Add donut segments with tooltips
    donutGroup.selectAll('path')
        .data(pie(dataForDonut))
        .enter()
        .append('path')
        .attr('d', arc)
        .attr('class', (d, i) => i === 0 ? 'donut-arc' : 'donut-arc-background')
        .attr('transform', 'scale(0)')
        .on('mouseover', handleDonutMouseOver)
        .on("mousemove", handleMouseMove)
        .on('mouseout', handleDonutMouseOut)
        .transition()
        .duration(800)
        .attr('transform', 'scale(1)');

    donutGroup.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '.35em')
        .style("font-family", "Urbanist")
        .attr('class', 'donut-text')
        .text(`${responseRate.toFixed(0)}%`);

    const x = d3.scaleBand()
        .domain(timeSeriesData.map(d => d.monthYear))
        .range([0, barWidth])
        .padding(0.1);

    const y = d3.scaleLinear()
        .domain([0, 100])
        .range([barHeight, 0]);

    const barGroup = svg.append("g")
        .attr("transform", `translate(0, ${height + margin.top - 40})`);

    // Function to handle bar mouseover
    const handleBarMouseOver = function(event, d) {
        const bar = d3.select(this);
        
        // Highlight the bar
        bar.transition()
            .duration(300)
            .attr("fill", "#2D9E69");

        // Show tooltip
        tooltip.transition()
            .duration(200)
            .style("opacity", 0.9);

        tooltip.html(`
            <strong>Month:</strong> ${d.monthYear.replace('-', '/')}<br/>
            <strong>Response Rate:</strong> ${d.responseRate.toFixed(1)}%
        `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
    };

    // Function to handle bar mouseout
    const handleBarMouseOut = function() {
        const bar = d3.select(this);
        
        // Reset the bar
        bar.transition()
            .duration(300)
            .attr("fill", "#333");

        // Hide tooltip
        tooltip.transition()
            .duration(500)
            .style("opacity", 0);
    };

    // Add bars with tooltips
    barGroup.selectAll(".bar")
        .data(timeSeriesData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.monthYear))
        .attr("y", barHeight)
        .attr("width", x.bandwidth())
        .attr("height", 0)
        .attr("fill", "#333")
        .attr("rx", 5)
        .attr("ry", 5)
        .on('mouseover', handleBarMouseOver)
        .on("mousemove", handleMouseMove)
        .on('mouseout', handleBarMouseOut)
        .transition()
        .duration(800)
        .delay((d, i) => i * 100)
        .attr("y", d => y(d.responseRate))
        .attr("height", d => barHeight - y(d.responseRate));

    barGroup.append("g")
        .attr("transform", `translate(0, ${barHeight})`)
        .call(d3.axisBottom(x).tickFormat(d => d.replace('-', '/')))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end")
        .style("font-size", "12px");

    barGroup.append("g")
        .call(d3.axisLeft(y).ticks(5).tickFormat(d => `${d}%`));
}

function updateCombinedChart(newSurveyResponseRate, newTimeSeriesData) {
    // Update the donut chart
    const newDataForDonut = [newSurveyResponseRate, 100 - newSurveyResponseRate];
    donutGroup.selectAll('path')
        .data(pie(newDataForDonut))
        .transition()
        .duration(800)
        .attrTween('d', function(d) {
            const interpolate = d3.interpolate(this.getAttribute('d'), arc(d));
            return function(t) {
                return interpolate(t);
            };
        });

    // Update the donut text
    donutGroup.select('.donut-text')
        .transition()
        .duration(800)
        .tween('text', function() {
            const i = d3.interpolate(this.textContent, `${newSurveyResponseRate.toFixed(0)}%`);
            return function(t) {
                this.textContent = i(t);
            };
        });

    // Update the bar chart
    const newX = d3.scaleBand()
        .domain(newTimeSeriesData.map(d => d.monthYear))
        .range([0, barWidth])
        .padding(0.1);

    barGroup.selectAll(".bar")
        .data(newTimeSeriesData)
        .transition()
        .duration(800)
        .attr("x", d => newX(d.monthYear))
        .attr("y", d => y(d.responseRate))
        .attr("width", newX.bandwidth())
        .attr("height", d => barHeight - y(d.responseRate));
}






// function waitForDropdownsToLoad(callback) {
//     const departmentDropdown = document.getElementById("departmentDropdown");
//     const siteNameDropdown = document.getElementById("siteNameDropdown");
//     const doctorIdDropdown = document.getElementById("doctorIdDropdown");

//     const interval = setInterval(() => {
//         if (
//             departmentDropdown?.value &&
//             siteNameDropdown?.value &&
//             doctorIdDropdown?.value !== undefined
//         ) {
//             clearInterval(interval);
//             callback();
//         }
//     }, 50);
// }

// document.addEventListener("DOMContentLoaded", () => {
//     waitForDropdownsToLoad(() => {
//         const departmentDropdown = document.getElementById("departmentDropdown");
//         const siteNameDropdown = document.getElementById("siteNameDropdown");
//         const doctorIdDropdown = document.getElementById("doctorIdDropdown");
//         const combinedSurveyTypeDropdown = document.getElementById("combinedSurveyTypeDropdown");

//         // 1) Fetch survey types and populate the dropdown
//         fetch(`${basePath}/api/get-survey-types`)
//             .then(res => res.json())
//             .then(surveyTypes => {
//                 combinedSurveyTypeDropdown.innerHTML = '<option value="">All</option>';
//                 surveyTypes.forEach(type => {
//                     const opt = document.createElement('option');
//                     opt.value = type;
//                     opt.text = type;
//                     combinedSurveyTypeDropdown.appendChild(opt);
//                 });
//                  // Ensure "All" is selected by default after populating
//                 combinedSurveyTypeDropdown.value = "";
//             })
//             .catch(err => console.error("Error fetching survey types:", err));

//         // 2) Fetch chart data with doctorId included
//         const fetchCombinedChartData = (department, siteName, surveyType, doctorId) => {
//             const queryParams = new URLSearchParams({
//                 ...(department && { department }),
//                 ...(siteName && { siteName }),
//                 // Only add surveyType if it's not empty (i.e., not "All")
//                 ...(surveyType && { surveyType }),
//                 ...(doctorId && doctorId !== 'all' && { doctorId })
//             }).toString();

//             // Log the query params for debugging
//             console.log(`Fetching combined chart data with params: ${queryParams}`);

//             fetch(`${basePath}/api/response-rate-time-series?${queryParams}`)
//                 .then(response => response.json())
//                 .then(data => {
//                     // Check if time series data is valid
//                     if (!data || !Array.isArray(data)) {
//                          console.error("Invalid time series data received:", data);
//                          // Optionally display a message or default chart state
//                          createCombinedChart(0, []); // Example: show 0% and empty bar chart
//                          return; // Stop further processing
//                     }
//                     fetch(`${basePath}/api/summary?${queryParams}`)
//                         .then(response => response.json())
//                         .then(summaryData => {
//                              // Check if summary data is valid
//                              if (!summaryData || typeof summaryData.surveyResponseRate === 'undefined') {
//                                  console.error("Invalid summary data received:", summaryData);
//                                  createCombinedChart(0, data); // Use valid time series data but 0% rate
//                                  return;
//                              }
//                             // Ensure responseRate is a number, default to 0 if not
//                              const responseRate = typeof summaryData.surveyResponseRate === 'number' ? summaryData.surveyResponseRate : 0;
//                             createCombinedChart(responseRate, data);
//                         })
//                         .catch(error => {
//                              console.error("Error fetching survey summary data:", error);
//                              createCombinedChart(0, data); // Show valid time series but 0% rate on error
//                         });
//                 })
//                 .catch(error => {
//                      console.error("Error fetching response rate time series data:", error);
//                      createCombinedChart(0, []); // Show 0% rate and empty bar chart on error
//                 });
//         };

//         // 3) Initial fetch - Explicitly use "" for "All" survey types
//         fetchCombinedChartData(
//             departmentDropdown.value,
//             siteNameDropdown.value,
//             "", // <-- Use "" for "All" survey types on initial load
//             doctorIdDropdown.value
//         );

//         // 4) Event listeners (remain the same, use dropdown's current value)
//         departmentDropdown.addEventListener("change", () => {
//             fetchCombinedChartData(
//                 departmentDropdown.value,
//                 siteNameDropdown.value,
//                 combinedSurveyTypeDropdown.value,
//                 doctorIdDropdown.value
//             );
//         });

//         siteNameDropdown.addEventListener("change", () => {
//             fetchCombinedChartData(
//                 departmentDropdown.value,
//                 siteNameDropdown.value,
//                 combinedSurveyTypeDropdown.value,
//                 doctorIdDropdown.value
//             );
//         });

//         combinedSurveyTypeDropdown.addEventListener("change", () => {
//             fetchCombinedChartData(
//                 departmentDropdown.value,
//                 siteNameDropdown.value,
//                 combinedSurveyTypeDropdown.value,
//                 doctorIdDropdown.value
//             );
//         });

//         // 5) Add doctorId change listener (remains the same)
//         doctorIdDropdown.addEventListener("change", () => {
//             fetchCombinedChartData(
//                 departmentDropdown.value,
//                 siteNameDropdown.value,
//                 combinedSurveyTypeDropdown.value,
//                 doctorIdDropdown.value
//             );
//         });
//     });
// });






// // --- Start of combinedChart.js DOMContentLoaded block ---

// document.addEventListener("DOMContentLoaded", () => {
//     waitForDropdownsToLoad(() => {
//         // Get references to all relevant dropdowns
//         const departmentDropdown = document.getElementById("departmentDropdown");
//         const siteNameDropdown = document.getElementById("siteNameDropdown");
//         const doctorIdDropdown = document.getElementById("doctorIdDropdown");
//         const combinedSurveyTypeDropdown = document.getElementById("combinedSurveyTypeDropdown");
//         // Add hospital dropdowns if they exist and filters should apply
//         const hospitalIdDropdown = document.getElementById("hospitalIdDropdown");
//         const hospitalNameDropdown = document.getElementById("hospitalNameDropdown");

//         // 1) Fetch survey types and populate the dropdown (remains the same)
//         fetch(`${basePath}/api/get-survey-types`)
//             .then(res => res.json())
//             .then(surveyTypes => {
//                 combinedSurveyTypeDropdown.innerHTML = '<option value="">All</option>';
//                 surveyTypes.forEach(type => {
//                     const opt = document.createElement('option');
//                     opt.value = type;
//                     opt.text = type;
//                     combinedSurveyTypeDropdown.appendChild(opt);
//                 });
//                 combinedSurveyTypeDropdown.value = ""; // Default to "All"
//             })
//             .catch(err => {
//                  console.error("Error fetching survey types:", err);
//                  // Add a default 'All' option even on error
//                  combinedSurveyTypeDropdown.innerHTML = '<option value="">All</option>';
//                  combinedSurveyTypeDropdown.value = "";
//             });


//         // *** MODIFIED FUNCTION: Fetches all 3 data points ***
//         const fetchCombinedChartData = (department, siteName, surveyType, doctorId, hospitalId, hospitalName) => {
//             // Construct query params including optional hospital filters
//             const queryParams = new URLSearchParams({
//                 ...(department && department !== 'all' && { department }),
//                 ...(siteName && siteName !== 'all' && { siteName }),
//                 ...(surveyType && { surveyType }), // Keep surveyType if not empty
//                 ...(doctorId && doctorId !== 'all' && { doctorId }),
//                 ...(hospitalId && hospitalId !== 'all' && { hospitalId }),
//                 ...(hospitalName && hospitalName !== 'all' && { hospitalName })
//             }).toString();

//             // Optional: Log params for debugging
//             console.log(`CombinedChart Fetching with params: ${queryParams}`);

//             // Fetch all three data points concurrently
//             Promise.all([
//                 fetch(`${basePath}/api/response-rate-time-series?${queryParams}`).then(res => res.json()),
//                 fetch(`${basePath}/api/summary?${queryParams}`).then(res => res.json()), // For completed count
//                 fetch(`${basePath}/api/surveysent?${queryParams}`).then(res => res.json()) // For sent count
//             ])
//             .then(([timeSeriesData, summaryData, surveysentData]) => {
//                 // --- Debugging Logs ---
//                 console.log("CombinedChart TimeSeries Data:", timeSeriesData);
//                 console.log("CombinedChart Summary Data:", summaryData);
//                 console.log("CombinedChart SurveysSent Data:", surveysentData);

//                 // Validate Time Series Data
//                 const validTimeSeries = Array.isArray(timeSeriesData) ? timeSeriesData : [];
//                  if (!Array.isArray(timeSeriesData)) {
//                       console.warn("CombinedChart: Invalid time series data received:", timeSeriesData);
//                  }

//                 // --- Calculate Rate ---
//                 const totalCompleted = summaryData?.totalSurveysCompleted ?? 0;
//                 const totalSent = surveysentData?.totalSurveysSent ?? 0;
//                 console.log(`CombinedChart Calculating Rate: Completed=${totalCompleted}, Sent=${totalSent}`); // Log counts

//                 let calculatedRate = 0;
//                 if (totalSent > 0) {
//                     calculatedRate = (totalCompleted / totalSent) * 100;
//                 }
//                 console.log("CombinedChart Calculated Rate:", calculatedRate); // Log calculated rate

//                 // --- Create chart with calculated rate and time series data ---
//                 createCombinedChart(calculatedRate, validTimeSeries);

//             })
//             .catch(error => {
//                 console.error("Error fetching combined chart data:", error);
//                 // Display empty/error state
//                 createCombinedChart(0, []);
//             });
//         };

//         // --- Unified Handler for Filter Changes ---
//          const handleFilterChange = () => {
//               fetchCombinedChartData(
//                   departmentDropdown.value,
//                   siteNameDropdown.value,
//                   combinedSurveyTypeDropdown.value,
//                   doctorIdDropdown.value,
//                   hospitalIdDropdown?.value, // Pass optional value safely
//                   hospitalNameDropdown?.value // Pass optional value safely
//               );
//           };

//         // --- Initial Fetch ---
//         // Call the handler directly for initial load AFTER dropdowns are ready
//         handleFilterChange();

//         // --- Event Listeners ---
//         departmentDropdown.addEventListener("change", handleFilterChange);
//         siteNameDropdown.addEventListener("change", handleFilterChange);
//         combinedSurveyTypeDropdown.addEventListener("change", handleFilterChange);
//         doctorIdDropdown.addEventListener("change", handleFilterChange);
//         // Add listeners for hospital dropdowns if they exist
//         if (hospitalIdDropdown) hospitalIdDropdown.addEventListener("change", handleFilterChange);
//         if (hospitalNameDropdown) hospitalNameDropdown.addEventListener("change", handleFilterChange);

//         // IMPORTANT: If other filters (Diagnosis, Intervention, etc.) should affect
//         // this specific chart, add listeners for them here as well, calling handleFilterChange.
//         // Example:
//         // document.getElementById("diagnosisDropdown")?.addEventListener("change", handleFilterChange);

//     });
// });

// // --- End of combinedChart.js DOMContentLoaded block ---


// --- Start of combinedChart.js DOMContentLoaded block (Timing Fix) ---

document.addEventListener("DOMContentLoaded", () => {
    // Use the existing waitForDropdownsToLoad function.
    waitForDropdownsToLoad(() => {
        // Get references to dropdowns
        const departmentDropdown = document.getElementById("departmentDropdown");
        const siteNameDropdown = document.getElementById("siteNameDropdown");
        const doctorIdDropdown = document.getElementById("doctorIdDropdown");
        const combinedSurveyTypeDropdown = document.getElementById("combinedSurveyTypeDropdown");
        // REMOVED: hospitalIdDropdown and hospitalNameDropdown references

        // *** fetchCombinedChartData function definition remains the same as the previous version ***
        const fetchCombinedChartData = (department, siteName, surveyType, doctorId) => {
            const queryParams = new URLSearchParams({
                ...(department && department !== 'all' && { department }),
                ...(siteName && siteName !== 'all' && { siteName }),
                ...(surveyType && { surveyType }),
                ...(doctorId && doctorId !== 'all' && { doctorId })
            }).toString();

            console.log(`CombinedChart Fetching with params: ${queryParams}`);

            Promise.all([
                fetch(`${basePath}/api/response-rate-time-series?${queryParams}`).then(res => res.json()),
                fetch(`${basePath}/api/summary?${queryParams}`).then(res => res.json()),
                fetch(`${basePath}/api/surveysent?${queryParams}`).then(res => res.json())
            ])
            .then(([timeSeriesData, summaryData, surveysentData]) => {
                console.log("CombinedChart TimeSeries Data:", timeSeriesData);
                console.log("CombinedChart Summary Data:", summaryData);
                console.log("CombinedChart SurveysSent Data:", surveysentData);

                const validTimeSeries = Array.isArray(timeSeriesData) ? timeSeriesData : [];
                 if (!Array.isArray(timeSeriesData)) {
                      console.warn("CombinedChart: Invalid time series data received:", timeSeriesData);
                 }

                const totalCompleted = summaryData?.totalSurveysCompleted ?? 0;
                const totalSent = surveysentData?.totalSurveysSent ?? 0;
                console.log(`CombinedChart Calculating Rate: Completed=${totalCompleted}, Sent=${totalSent}`);

                let calculatedRate = 0;
                if (totalSent > 0) {
                    calculatedRate = (totalCompleted / totalSent) * 100;
                }
                console.log("CombinedChart Calculated Rate:", calculatedRate);

                createCombinedChart(calculatedRate, validTimeSeries);
            })
            .catch(error => {
                console.error("Error fetching combined chart data:", error);
                createCombinedChart(0, []);
            });
        };

        // --- Unified Handler for Filter Changes (remains the same) ---
         const handleFilterChange = () => {
              fetchCombinedChartData(
                  departmentDropdown.value,
                  siteNameDropdown.value,
                  combinedSurveyTypeDropdown.value, // Reads the current value when called
                  doctorIdDropdown.value
              );
          };

        // --- Event Listeners (remain the same) ---
        departmentDropdown.addEventListener("change", handleFilterChange);
        siteNameDropdown.addEventListener("change", handleFilterChange);
        combinedSurveyTypeDropdown.addEventListener("change", handleFilterChange);
        doctorIdDropdown.addEventListener("change", handleFilterChange);


        // --- Fetch survey types AND THEN trigger initial chart load ---
        fetch(`${basePath}/api/get-survey-types`)
            .then(res => res.json())
            .then(surveyTypes => {
                combinedSurveyTypeDropdown.innerHTML = '<option value="">All</option>'; // Add "All"
                surveyTypes.forEach(type => {
                    const opt = document.createElement('option');
                    opt.value = type;
                    opt.text = type;
                    combinedSurveyTypeDropdown.appendChild(opt);
                });
                combinedSurveyTypeDropdown.value = ""; // Set default to "All"
                console.log("Survey Type dropdown populated. Default set to 'All'.");

                // *** MOVED INITIAL FETCH HERE ***
                // Now call the handler AFTER the dropdown is populated and default is set
                handleFilterChange();
            })
            .catch(err => {
                 console.error("Error fetching survey types:", err);
                 combinedSurveyTypeDropdown.innerHTML = '<option value="">All</option>';
                 combinedSurveyTypeDropdown.value = "";
                 console.log("Error fetching survey types. Defaulting to 'All'.");

                 // *** MOVED INITIAL FETCH HERE (for error case too) ***
                 // Still attempt to load the chart with "All" selected even if types failed
                 handleFilterChange();
            });

        // REMOVED: Initial handleFilterChange() call from here

    });
});

// --- End of combinedChart.js DOMContentLoaded block ---