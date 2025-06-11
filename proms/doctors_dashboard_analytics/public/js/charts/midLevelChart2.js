// Function to create the scatter plot for PROMs scores
function createMidLevelChart2(data) {
    const container = document.getElementById("midLevelChart2");

    if (!container) {
        console.error("Error: #midLevelChart2 container not found.");
        return;
    }

    // Set dimensions and margins
    const width = 400;
    const height = 250;
    // const margin = { top: 40, right: 30, bottom: 60, left: 50 }; // Increased top margin for the title
    const margin = { top: 50, right: 30, bottom: 60, left: 50 };


    // Clear any existing SVG content
    d3.select("#midLevelChart2").selectAll("svg").remove();

    // If data is empty, display a message
    if (data.length === 0) {
        container.innerHTML = "<p>No data available for the selected combination.</p>";
        return;
    } else {
        container.innerHTML = ""; // Clear any previous message
    }

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
        .attr("class", "chart-title") // Apply CSS class for the title
        .text("PROMs Score Trend");

    // Parse dates and set scales
    const parseDate = d3.timeParse("%Y-%m-%dT%H:%M:%S.%LZ"); // Adjust based on your date format
    data.forEach(d => {
        d.surveyReceivedDate = parseDate(d.surveyReceivedDate);
    });

    const x = d3.scaleTime()
        .domain(d3.extent(data, d => d.surveyReceivedDate))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, 100]) // Assume scores range from 0 to 100
        .range([height, 0]);

    // Create x-axis and y-axis
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x)
            .ticks(5)
            .tickFormat(d3.timeFormat("%b %d")) // Format date on x-axis
        )
        .selectAll("text")
        .attr("class", "axis-label"); // Apply CSS class for axis labels

    svg.append("g")
        .call(d3.axisLeft(y))
        .selectAll("text")
        .attr("class", "axis-label"); // Apply CSS class for axis labels

    // Plot points for each data entry
    // svg.selectAll("circle")
    //     .data(data)
    //     .enter()
    //     .append("circle")
    //     .attr("cx", d => x(d.surveyReceivedDate))
    //     .attr("cy", d => y(d.score))
    //     .attr("r", 5)
    //     .attr("fill", "#333")
    //     .attr("opacity", 0.7);

    // Define color scale based on score ranges
    const colorScale = d3.scaleThreshold()
    .domain([80, 90, 95]) // Score thresholds
    .range(["rgba(255, 141, 65, 1)", "rgba(65, 175, 255, 1)", "rgba(230, 230, 74, 1)", "rgba(128, 176, 67, 1)"]); // Corresponding colors



    // Plot points for each data entry with colors based on score
    svg.selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", d => x(d.surveyReceivedDate))
    .attr("cy", d => y(d.score))
    .attr("r", 5)
    .attr("fill", d => colorScale(d.score)) // Set fill color based on score
    .attr("opacity", 0.7);

    // Add x-axis label
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 15)
        .attr("class", "axis-label") // Use CSS class
        .text("Date Received");

    // Add y-axis label
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 10)
        .attr("x", -height / 2)
        .attr("class", "axis-label") // Use CSS class
        .text("PROMs Score");

    // // Add legend
    // const legend = svg.append("g")
    // .attr("transform", `translate(${width / 2 - 30}, -10)`); // Center the legend horizontally
// Add legend
const legend = svg.append("g")
    .attr("transform", `translate(${width / 2 + 130}, ${height + margin.bottom - 20})`); // Shift right and below the x-axis



    // Add a sample circle for the legend
    legend.append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", 6)
        .attr("fill", "#333")
        .attr("opacity", 0.7);

    // Add text next to the legend circle
    legend.append("text")
        .attr("x", 15)
        .attr("y", 5)
        .attr("class", "legend-text") // Use CSS class
        .text("PROMs Score");
}


// Function to fetch data for the scatter plot
function fetchScatterPlotData(diagnosisICD10, promsInstrument, scale) {
    console.log("Fetching scatter plot data with:", { diagnosisICD10, promsInstrument, scale });
    const queryParams = `diagnosisICD10=${encodeURIComponent(diagnosisICD10)}&promsInstrument=${encodeURIComponent(promsInstrument)}&scale=${encodeURIComponent(scale)}`;

    fetch(`/api/proms-scores?${queryParams}`)
        .then(response => response.json())
        .then(data => {
            console.log("Received data:", data);
            createMidLevelChart2(data);
        })
        .catch(error => console.error("Error fetching PROMs scores for scatter plot:", error));
}

// Utility function to wait for dropdowns to populate
function waitForDropdownsToLoad(callback) {
    const diagnosisDropdown = document.getElementById("diagnosisDropdown");
    const instrumentDropdown = document.getElementById("instrumentDropdown");
    const scaleDropdown = document.getElementById("scaleDropdown");

    const interval = setInterval(() => {
        if (diagnosisDropdown.value && instrumentDropdown.value && scaleDropdown.value) {
            clearInterval(interval);
            callback();
        }
    }, 50);
}

// Initialize the chart on page load
document.addEventListener("DOMContentLoaded", () => {
    waitForDropdownsToLoad(() => {
        const diagnosisDropdown = document.getElementById("diagnosisDropdown");
        const instrumentDropdown = document.getElementById("instrumentDropdown");
        const scaleDropdown = document.getElementById("scaleDropdown");

        const initialDiagnosis = diagnosisDropdown.value;
        const initialInstrument = instrumentDropdown.value;
        const initialScale = scaleDropdown.value;

        if (initialDiagnosis && initialInstrument && initialScale) {
            fetchScatterPlotData(initialDiagnosis, initialInstrument, initialScale);
        }

        // Add event listeners for all dropdowns
        [diagnosisDropdown, instrumentDropdown, scaleDropdown].forEach(dropdown => {
            dropdown.addEventListener("change", () => {
                if (diagnosisDropdown.value && instrumentDropdown.value && scaleDropdown.value) {
                    fetchScatterPlotData(
                        diagnosisDropdown.value,
                        instrumentDropdown.value,
                        scaleDropdown.value
                    );
                }
            });
        });
    });
});
