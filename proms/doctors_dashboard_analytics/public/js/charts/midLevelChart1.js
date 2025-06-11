// Function to create the "Mean Score by Survey Timeline" chart
function createMidLevelChart1(meanScoreData) {
    const container = document.getElementById("midLevelChart1");

    // Check if the container exists
    if (!container) {
        console.error("Error: #midLevelChart1 container not found.");
        return;
    }

    // Set fixed dimensions for simplicity
    const width = 400; // Fixed width
    const height = 250; // Fixed height
    const margin = { top: 50, right: 30, bottom: 60, left: 50 };

    // Clear any existing SVG content before adding new SVG
    d3.select("#midLevelChart1").selectAll("svg").remove();

    // If meanScoreData is empty, display a message
    if (meanScoreData.length === 0) {
        container.innerHTML = "<p>No data available for the selected combination.</p>";
        return;
    } else {
        container.innerHTML = ""; // Clear any previous message
    }

    // Create the SVG container with fixed dimensions
    const svg = d3.select("#midLevelChart1")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Add chart title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -margin.top / 1.6) // Position above the chart
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .text("PROMs Mean Score by Survey Timeline");

    // Set up scales for x and y axes
    const x = d3.scaleBand()
        .domain(meanScoreData.map(d => d.surveyType))
        .range([0, width])
        .padding(0.5);

    const y = d3.scaleLinear()
        .domain([0, 100]) // Mean scores range from 0 to 100
        .range([height, 0]);

    // Create x-axis and y-axis
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("class","axis-text")

    svg.append("g")
        .call(d3.axisLeft(y).ticks(5));

    // // Add bubbles to represent mean scores
    // svg.selectAll("circle")
    //     .data(meanScoreData)
    //     .enter()
    //     .append("circle")
    //     .attr("cx", d => x(d.surveyType) + x.bandwidth() / 2)
    //     .attr("cy", d => y(d.meanScore))
    //     .attr("r", d => Math.sqrt(d.meanScore) * 3.0) // Bubble size based on mean score
    //     .attr("fill", "#333")
    //     .attr("opacity", 0.7);

    // Change the circle fill color to #6666ff
    svg.selectAll("circle")
    .data(meanScoreData)
    .enter()
    .append("circle")
    .attr("cx", d => x(d.surveyType) + x.bandwidth() / 2)
    .attr("cy", d => y(d.meanScore))
    .attr("r", d => Math.sqrt(d.meanScore) * 3.0) // Bubble size based on mean score
    .attr("fill", "#3d3dff") // Updated color
    .attr("opacity", 0.7);


    // // Add mean score labels to bubbles
    // svg.selectAll("text.label")
    //     .data(meanScoreData)
    //     .enter()
    //     .append("text")
    //     .attr("x", d => x(d.surveyType) + x.bandwidth() / 2)
    //     .attr("y", d => y(d.meanScore) + 5)
    //     .attr("text-anchor", "middle")
    //     .attr("class", "bubble-text")
    //     .text(d => d.meanScore.toFixed(1));
    // Change the text color to white
    svg.selectAll("text.label")
    .data(meanScoreData)
    .enter()
    .append("text")
    .attr("x", d => x(d.surveyType) + x.bandwidth() / 2)
    .attr("y", d => y(d.meanScore) + 5)
    .attr("text-anchor", "middle")
    .attr("class", "bubble-text")
    .attr("fill", "white") // Updated text color
    .text(d => d.meanScore.toFixed(1));


    // Add x-axis label
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 15) // Position it below the x-axis
        .attr("class", "axis-label") // Apply CSS class
        .text("Survey Timeline");

    // Add y-axis label
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 15) // Position it to the left of the y-axis
        .attr("x", -height / 2)
        .attr("class", "axis-label") // Apply CSS class
        .text("Mean Score");

    // // Add legend
    // const legend = svg.append("g")
    //     .attr("transform", `translate(${width / 2 - 30}, -20)`);
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
        .attr("text-anchor", "start")
        .attr("class", "legend-text") // Apply CSS class for legend text
        .text("Mean Score");
}

// Function to fetch data for the chart based on selected dropdown values
function fetchMeanScoreData(diagnosisICD10, promsInstrument, scale) {
    const queryParams = `diagnosisICD10=${encodeURIComponent(diagnosisICD10)}&promsInstrument=${encodeURIComponent(promsInstrument)}&scale=${encodeURIComponent(scale)}`;

    fetch(`/api/mean-score-by-survey-timeline?${queryParams}`)
        .then(response => response.json())
        .then(data => {
            d3.select("#midLevelChart1 svg").remove(); // Clear existing SVG content
            createMidLevelChart1(data);
        })
        .catch(error => console.error("Error fetching mean score data:", error));
}

// Utility function to wait for dropdowns to populate
function waitForDropdownsToLoad(callback) {
    const diagnosisDropdown = document.getElementById("diagnosisDropdown");
    const instrumentDropdown = document.getElementById("instrumentDropdown");
    const scaleDropdown = document.getElementById("scaleDropdown");

    const interval = setInterval(() => {
        if (diagnosisDropdown.value && instrumentDropdown.value && scaleDropdown.value) {
            clearInterval(interval); // Stop checking
            callback(); // Execute the callback function
        }
    }, 50); // Check every 50ms
}

// Initialize the chart on page load
document.addEventListener("DOMContentLoaded", () => {
    console.log("Initializing midLevelChart1...");

    waitForDropdownsToLoad(() => {
        const diagnosisDropdown = document.getElementById("diagnosisDropdown");
        const instrumentDropdown = document.getElementById("instrumentDropdown");
        const scaleDropdown = document.getElementById("scaleDropdown");

        const initialDiagnosis = diagnosisDropdown.value;
        const initialInstrument = instrumentDropdown.value;
        const initialScale = scaleDropdown.value;

        if (initialDiagnosis && initialInstrument && initialScale) {
            console.log("Fetching initial chart data...");
            fetchMeanScoreData(initialDiagnosis, initialInstrument, initialScale);
        }

        // Add event listeners for all dropdowns
        [diagnosisDropdown, instrumentDropdown, scaleDropdown].forEach(dropdown => {
            dropdown.addEventListener("change", () => {
                if (diagnosisDropdown.value && instrumentDropdown.value && scaleDropdown.value) {
                    fetchMeanScoreData(
                        diagnosisDropdown.value,
                        instrumentDropdown.value,
                        scaleDropdown.value
                    );
                }
            });
        });
    });
});

