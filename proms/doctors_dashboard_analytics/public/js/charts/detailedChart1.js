// Function to create a grayscale heatmap for Treatment Plan vs Diagnosis

// Function to calculate brightness of a color
function getBrightness(color) {
    const rgb = d3.color(color);
    return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000; // Standard luminance formula
}

function createDetailedChart1(data) {
    const container = document.getElementById("detailedChart1");

    if (!container) {
        console.error("Error: #detailedChart1 container not found.");
        return;
    }

    // Define dimensions and margins
    const width = 400;
    const height = 200;
    const margin = { top: 50, right: 60, bottom: 100, left: 120 };

    // Extract unique treatment plans and diagnoses
    const treatmentPlans = Array.from(new Set(data.map(d => d.treatmentPlan)));
    const diagnoses = Array.from(new Set(data.map(d => d.diagnosisICD10)));

    // Define scales
    const x = d3.scaleBand()
        .domain(diagnoses)
        .range([0, width])
        .padding(0.05);

    const y = d3.scaleBand()
        .domain(treatmentPlans)
        .range([height, 0])
        .padding(0.05);

    // const color = d3.scaleLinear()
    //     .domain([0, d3.max(data, d => d.count)]) // Adjust domain based on data
    //     .range(["#e0e0e0", "#333333"]); // Grayscale range from light to dark
    // const color = d3.scaleLinear()
    // .domain([0, d3.max(data, d => d.count)]) // Define the data range
    // .range(["#F9FDCC", "#3AAEC3", "#11246B"]); // Use the colors from your reference

    const color = d3.scaleThreshold()
    .domain([20, 30, 40, 50, 60, 70, 80, 90]) // Define the thresholds
    .range(["#f0f9b8", "#d0edb3", "#95d5b9", "#59BFC0", "#2DA2C2", "#1F78B4", "#234DA0", "#1B2C80"]); // Use the corresponding colors



    // Clear any existing SVG content
    d3.select("#detailedChart1").selectAll("svg").remove();

    // Create SVG container
    const svg = d3.select("#detailedChart1")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Add chart title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2 + 15)
        .attr("class", "chart-title") // Apply CSS class
        .text("Treatment Plan vs. Diagnosis Heatmap");

    // Update x-axis with new text transform and alignment
    svg.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x).tickSize(0))
    .selectAll("text")
    .attr("transform", "rotate(-15)") // Rotate less for better readability
    .style("text-anchor", "end")
    .attr("dy", "0.5em") // Offset the labels slightly
    .attr("class", "axis-label");



// Update y-axis to avoid text cut-off and ensure all labels are visible
svg.append("g")
    .call(d3.axisLeft(y).tickSize(0))
    .selectAll("text")
    .attr("class", "axis-label")
    .style("text-anchor", "end")
    .attr("transform", "rotate(-15)") // Rotate less for better readability
    .attr("dx", "-0.5em"); // Increase padding for y-axis labels



    // Draw cells
    svg.selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .attr("x", d => x(d.diagnosisICD10))
        .attr("y", d => y(d.treatmentPlan))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("fill", d => color(d.count))
        .attr("stroke", "#ffffff");

    // Add cell labels (counts)
    // svg.selectAll("text.count")
    //     .data(data)
    //     .enter()
    //     .append("text")
    //     .attr("x", d => x(d.diagnosisICD10) + x.bandwidth() / 2)
    //     .attr("y", d => y(d.treatmentPlan) + y.bandwidth() / 2)
    //     .attr("text-anchor", "middle")
    //     .attr("dominant-baseline", "middle")
    //     .attr("class", "bubble-text") // Use CSS class for font styling
    //     .text(d => d.count);

    // Add cell labels (counts)
    svg.selectAll("text.count")
    .data(data)
    .enter()
    .append("text")
    .attr("x", d => x(d.diagnosisICD10) + x.bandwidth() / 2)
    .attr("y", d => y(d.treatmentPlan) + y.bandwidth() / 2)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .attr("class", "bubble-text") // Use CSS class for font styling
    .text(d => d.count)
    .style("fill", d => {
        const bgColor = color(d.count); // Get block color
        return getBrightness(bgColor) > 128 ? "black" : "white"; // Set text color based on brightness
    });


// Add x-axis label with updated position to avoid overlap
svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 40) // Adjusted for new bottom margin
    .attr("text-anchor", "middle")
    .attr("class", "axis-label")
    .text("Diagnosis");

// Add y-axis label with updated position to avoid overlap
svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", -margin.left + 12) // Adjusted for new left margin
    .attr("x", -height / 2)
    .attr("text-anchor", "middle")
    .attr("class", "axis-label")
    .text("Treatment Plan");

    // Add legend
    const legend = svg.append("g")
        .attr("transform", `translate(${width + 10}, 0)`); // Position the legend on the right

    // Legend rectangle for gradient
    const legendHeight = 100;
    // const legendScale = d3.scaleLinear()
    //     .domain([0, d3.max(data, d => d.count)])
    //     .range([legendHeight, 0]);

    const legendScale = d3.scaleLinear()
    .domain([20, 90]) // Match the new range
    .range([legendHeight, 0]); // Map to the legend height


    const legendAxis = d3.axisRight(legendScale).ticks(5);

    // Draw legend gradient
    // const defs = svg.append("defs");
    // const gradient = defs.append("linearGradient")
    //     .attr("id", "heatmapGradient")
    //     .attr("x1", "0%")
    //     .attr("y1", "100%")
    //     .attr("x2", "0%")
    //     .attr("y2", "0%");

    // gradient.append("stop")
    //     .attr("offset", "0%")
    //     .attr("stop-color", "#e0e0e0");

    // gradient.append("stop")
    //     .attr("offset", "100%")
    //     .attr("stop-color", "#333333");

// Define gradient for the legend
// Define gradient for the legend
const defs = svg.append("defs");
const gradient = defs.append("linearGradient")
    .attr("id", "heatmapGradient")
    .attr("x1", "0%")
    .attr("y1", "100%")
    .attr("x2", "0%")
    .attr("y2", "0%");

// Add gradient color stops for each range
gradient.append("stop")
    .attr("offset", "0%")
    .attr("stop-color", "#f0f9b8");

gradient.append("stop")
    .attr("offset", "12.5%")
    .attr("stop-color", "#d0edb3");

gradient.append("stop")
    .attr("offset", "25%")
    .attr("stop-color", "#95d5b9");

gradient.append("stop")
    .attr("offset", "37.5%")
    .attr("stop-color", "#59BFC0");

gradient.append("stop")
    .attr("offset", "50%")
    .attr("stop-color", "#2DA2C2");

gradient.append("stop")
    .attr("offset", "62.5%")
    .attr("stop-color", "#1F78B4");

gradient.append("stop")
    .attr("offset", "75%")
    .attr("stop-color", "#234DA0");

gradient.append("stop")
    .attr("offset", "87.5%")
    .attr("stop-color", "#1B2C80");



    // Append gradient rectangle to legend
    legend.append("rect")
        .attr("width", 10)
        .attr("height", legendHeight)
        .style("fill", "url(#heatmapGradient)");

    // Append legend axis
    legend.append("g")
        .attr("transform", "translate(12, 0)")
        .call(legendAxis)
        .selectAll("text")
        .attr("class", "legend-text"); // Use CSS class for legend text
}

// Fetch and render the heatmap
function fetchHeatmapData() {
    fetch('/api/treatment-diagnosis-heatmap')
        .then(response => response.json())
        .then(data => {
            createDetailedChart1(data);
        })
        .catch(error => console.error("Error fetching heatmap data:", error));
}

// Initialize the chart on page load
document.addEventListener("DOMContentLoaded", fetchHeatmapData);