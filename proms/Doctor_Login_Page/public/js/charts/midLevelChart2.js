//New code with the surveyType in the x-axis

function createMidLevelChart2(data) {
    const container = document.getElementById("midLevelChart2");

    if (!container) {
        console.error("Error: #midLevelChart2 container not found.");
        return;
    }

    // Set dimensions and margins
    const width = 460;
    const height = 210;
    const margin = { top: 45, right: 30, bottom: 55, left: 50 };

    // Clear any existing SVG content
    d3.select("#midLevelChart2").selectAll("svg").remove();
    // Clear any existing tooltips
    d3.select("#midLevelChart2").selectAll(".tooltip").remove();

    // If data is empty, display a message
    if (data.length === 0) {
        //container.innerHTML = "<p class='no-data-message'>No data available for the selected combination.</p>";
        return;
    } else {
        container.innerHTML = ""; // Clear any previous message
    }

    // Create tooltip div
    const tooltip = d3.select("#midLevelChart2")
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

    // Create SVG container
    const svg = d3.select("#midLevelChart2")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Add chart title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -margin.top / 1.6)
        .attr("class", "chart-title")
        .style("font-family", "Urbanist")
        .text("PROMs Score Trend");

    // -----------------------------------------------------------
    // EXISTING Date Parse/Format code (kept for tooltip usage)
    // -----------------------------------------------------------
    const parseDate = d3.timeParse("%Y-%m-%dT%H:%M:%S.%LZ");
    const formatDate = d3.timeFormat("%B %d, %Y");
    
    data.forEach(d => {
        d.surveyReceivedDate = parseDate(d.surveyReceivedDate);
    });

    // -----------------------------------------------------------
    // OLD X-SCALE (Time) - Commented Out
    // -----------------------------------------------------------
    /*
    const xTime = d3.scaleTime()
        .domain(d3.extent(data, d => d.surveyReceivedDate))
        .range([0, width]);
    */

    // -----------------------------------------------------------
    // NEW X-SCALE (Band) using surveyType
    // -----------------------------------------------------------
    const uniqueSurveyTypes = [...new Set(data.map(d => d.surveyType))];
    // Move "Baseline" to the front if it exists:
if (uniqueSurveyTypes.includes("Baseline")) {
    // Remove "Baseline" from its current position
    uniqueSurveyTypes.splice(uniqueSurveyTypes.indexOf("Baseline"), 1);
    // Insert it at the front
    uniqueSurveyTypes.unshift("Baseline");
  }
    const xBand = d3.scaleBand()
        .domain(uniqueSurveyTypes)
        .range([0, width])
        .padding(0.2);

    // Y scale remains the same
    const y = d3.scaleLinear()
        .domain([0, 100])
        .range([height, 0]);

    // -----------------------------------------------------------
    // CREATE X-AXIS using xBand
    // -----------------------------------------------------------
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xBand)) // band scale, no tickFormat
        .selectAll("text")
        .attr("class", "axis-label");

    // -----------------------------------------------------------
    // OLD X-AXIS using time (commented out)
    // -----------------------------------------------------------
    /*
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(xTime)
            .ticks(5)
            .tickFormat(d3.timeFormat("%b %d")))
        .selectAll("text")
        .attr("class", "axis-label");
    */

    // Y-Axis (unchanged)
    svg.append("g")
        .call(d3.axisLeft(y).tickPadding(10))
        .selectAll("text")
        .attr("class", "axis-label");

    // Function to handle mouseover
    const handleMouseOver = function(event, d) {
        const circle = d3.select(this);
        
        // Highlight the point
        circle.transition()
            .duration(300)
            .attr("r", 7)
            .attr("fill", "#1F8A70");

        // Show and position the tooltip
        tooltip.transition()
            .duration(200)
            .style("opacity", 0.9);
        
        tooltip.html(`
            <strong>Mr No.:</strong> ${d.patientId}<br/>
            <strong>Score:</strong> ${d.score}<br/>
            <strong>Date:</strong> ${formatDate(d.surveyReceivedDate)}
        `)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    };

    // Function to handle mouseout
    const handleMouseOut = function() {
        const circle = d3.select(this);
        
        // Reset the point
        circle.transition()
            .duration(300)
            .attr("r", 5)
            .attr("fill", "#2D9E69");

        // Hide the tooltip
        tooltip.transition()
            .duration(500)
            .style("opacity", 0);
    };

    // -----------------------------------------------------------
    // Plot points using xBand (surveyType) for X
    // -----------------------------------------------------------
    svg.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("class", "score-bubble")
        // old: .attr("cx", d => xTime(d.surveyReceivedDate))
        .attr("cx", d => xBand(d.surveyType) + xBand.bandwidth() / 2) 
        .attr("cy", d => y(d.score))
        .attr("r", 0)
        .attr("fill", "#2D9E69")
        .on("mouseover", handleMouseOver)
        .on("mouseout", handleMouseOut)
        .transition()
        .duration(800)
        .attr("r", 5);

    // -----------------------------------------------------------
    // Rename X-axis label to "Survey Type"
    // -----------------------------------------------------------
    svg.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 15)
        .style("font-family", "Urbanist")
        .style("font-size", "14px")
        // old: .text("Date Received")
        .text("Survey Type");

    // Y-axis label remains
    svg.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 10)
        .attr("x", -height / 2)
        .style("font-family", "Urbanist")
        .style("font-size", "14px")
        .text("PROMs Score");

    // Add the fade-in animation for the axis labels
    svg.selectAll(".axis-label")
        .style("opacity", 0)
        .transition()
        .duration(800)
        .style("opacity", 1);

    // Legend (unchanged)
    const legend = svg.append("g")
        .attr("transform", `translate(${width / 2 + 130}, ${height + margin.bottom - 20})`);

    legend.append("circle")
        .attr("class", "legend-bubble")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", 6)
        .attr("fill", "#2D9E69");

    legend.append("text")
        .attr("class", "legend-text")
        .attr("x", 15)
        .attr("y", 5)
        .style("font-family", "Urbanist")
        .text("PROMs Score");
}





// ----------------------------------------------------------------
// Updated fetchScatterPlotData – now includes intervention and doctorId
// ----------------------------------------------------------------
function fetchScatterPlotData(diagnosisICD10, promsInstrument, scale, department, siteName, intervention, doctorId) {
    const queryParams = new URLSearchParams({
      ...(diagnosisICD10 && { diagnosisICD10 }),
      ...(promsInstrument && { promsInstrument }),
      ...(scale && { scale }),
      ...(department && { department }),
      ...(siteName && { siteName }),
      ...(intervention && { intervention }), // NEW: add intervention parameter
      ...(doctorId && { doctorId })          // NEW: add doctorId parameter
    }).toString();
  
    fetch(`${basePath}/api/proms-scores?${queryParams}`)
      .then(response => response.json())
      .then(data => {
        data.forEach(d => {
          d.patientId = d.patientId || "Unknown";
        });
        createMidLevelChart2(data);
      })
      .catch(error => console.error("Error fetching PROMs scores:", error));
}
  
// ----------------------------------------------------------------
// Updated waitForDropdownsToLoad – now also waits for interventionDropdown and doctorIdDropdown (if present)
// ----------------------------------------------------------------
function waitForDropdownsToLoad(callback) {
    const departmentDropdown   = document.getElementById("departmentDropdown");
    const siteNameDropdown     = document.getElementById("siteNameDropdown");
    const diagnosisDropdown    = document.getElementById("diagnosisDropdown");
    const instrumentDropdown   = document.getElementById("instrumentDropdown");
    const scaleDropdown        = document.getElementById("scaleDropdown");
    const interventionDropdown = document.getElementById("interventionDropdown"); // NEW
    const doctorIdDropdown     = document.getElementById("doctorIdDropdown");     // NEW
  
    const interval = setInterval(() => {
        // If interventionDropdown exists, ensure its value is set;
        // also ensure doctorIdDropdown value is set if present.
        if (
            departmentDropdown.value &&
            siteNameDropdown.value &&
            diagnosisDropdown.value &&
            instrumentDropdown.value &&
            scaleDropdown.value &&
            (interventionDropdown ? interventionDropdown.value : true) &&
            (doctorIdDropdown ? doctorIdDropdown.value : true)
        ) {
            clearInterval(interval);
            callback();
        }
    }, 50);
}
  
// ----------------------------------------------------------------
// Updated DOMContentLoaded logic – now includes interventionDropdown and doctorIdDropdown
// ----------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    console.log("Initializing midLevelChart2...");
  
    waitForDropdownsToLoad(() => {
        const departmentDropdown   = document.getElementById("departmentDropdown");
        const siteNameDropdown     = document.getElementById("siteNameDropdown");
        const diagnosisDropdown    = document.getElementById("diagnosisDropdown");
        const instrumentDropdown   = document.getElementById("instrumentDropdown");
        const scaleDropdown        = document.getElementById("scaleDropdown");
        const interventionDropdown = document.getElementById("interventionDropdown"); // NEW
        const doctorIdDropdown     = document.getElementById("doctorIdDropdown");     // NEW
  
        // Grab initial values
        const initialDepartment   = departmentDropdown.value;
        const initialSiteName     = siteNameDropdown.value;
        const initialDiagnosis    = diagnosisDropdown.value;
        const initialInstrument   = instrumentDropdown.value;
        const initialScale        = scaleDropdown.value;
        const initialIntervention = interventionDropdown ? interventionDropdown.value : null;
        const initialDoctorId     = doctorIdDropdown ? doctorIdDropdown.value : null;
  
        // Fetch initial data with all default values
        if (
            initialDepartment &&
            initialSiteName &&
            initialDiagnosis &&
            initialInstrument &&
            initialScale &&
            initialIntervention &&
            initialDoctorId
        ) {
            fetchScatterPlotData(
                initialDiagnosis,
                initialInstrument,
                initialScale,
                initialDepartment,
                initialSiteName,
                initialIntervention,
                initialDoctorId
            );
        }
  
        // Watch all dropdowns for changes (including interventionDropdown and doctorIdDropdown)
        const dropdownsToWatch = [
            departmentDropdown,
            siteNameDropdown,
            diagnosisDropdown,
            instrumentDropdown,
            scaleDropdown
        ];
  
        if (interventionDropdown) {
            dropdownsToWatch.push(interventionDropdown);
        }
        if (doctorIdDropdown) {
            dropdownsToWatch.push(doctorIdDropdown);
        }
  
        dropdownsToWatch.forEach(dropdown => {
            dropdown.addEventListener("change", () => {
                const updatedDepartment   = departmentDropdown.value;
                const updatedSiteName     = siteNameDropdown.value;
                const updatedDiagnosis    = diagnosisDropdown.value;
                const updatedInstrument   = instrumentDropdown.value;
                const updatedScale        = scaleDropdown.value;
                const updatedIntervention = interventionDropdown ? interventionDropdown.value : null;
                const updatedDoctorId     = doctorIdDropdown ? doctorIdDropdown.value : null;
  
                fetchScatterPlotData(
                    updatedDiagnosis,
                    updatedInstrument,
                    updatedScale,
                    updatedDepartment,
                    updatedSiteName,
                    updatedIntervention,
                    updatedDoctorId
                );
            });
        });
    });
});
