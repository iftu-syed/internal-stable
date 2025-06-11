// Function to create the side-by-side bar chart for total patients and MCID achieved
function createDetailedChart2(data) {
    const container = document.getElementById("detailedChart2");

    if (!container) {
        console.error("Error: #detailedChart2 container not found.");
        return;
    }

// Set dimensions and margins
const width = 400; // Increased width from 300 to 400
const height = 200;
const margin = { top: 80, right: 30, bottom: 60, left: 60 }; // Keep margins the same

    // Clear any existing SVG content
    d3.select("#detailedChart2").selectAll("svg").remove();

    // Create SVG container
    const svg = d3.select("#detailedChart2")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Add chart title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2 + 1)
        .attr("class", "chart-title") // Use CSS class for title styling
        .text("Total Patients with Minimal Clinical Improvment");

    // Set up scales
    const x0 = d3.scaleBand()
        .domain(data.map(d => d.surveyType))
        .range([0, width])
        .padding(0.2);

    const x1 = d3.scaleBand()
        .domain(["totalPatients", "mcidAchieved"])
        .range([0, x0.bandwidth()])
        .padding(0.1);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => Math.max(d.totalPatients, d.mcidAchieved))])
        .nice()
        .range([height, 0]);

    // Add x-axis
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x0))
        .selectAll("text")
        .style("text-anchor", "middle")
        .attr("class", "axis-label"); // Use CSS class for axis labels

    // Add y-axis
    svg.append("g")
        .call(d3.axisLeft(y))
        .selectAll("text")
        .attr("class", "axis-label"); // Use CSS class for axis labels

    // // Colors for grayscale
    // const color = d3.scaleOrdinal()
    //     .domain(["totalPatients", "mcidAchieved"])
    //     .range(["#B0B0B0", "#707070"]);

    // Update colors for bars and legends
const color = d3.scaleOrdinal()
.domain(["totalPatients", "mcidAchieved"])
.range(["#87ceeb", "#f18080"]); // Updated colors for Total Patients and MCID Achieved


    // // Add bars
    // svg.selectAll("g.layer")
    //     .data(data)
    //     .enter()
    //     .append("g")
    //     .attr("transform", d => `translate(${x0(d.surveyType)}, 0)`)
    //     .selectAll("rect")
    //     .data(d => [
    //         { key: "totalPatients", value: d.totalPatients },
    //         { key: "mcidAchieved", value: d.mcidAchieved }
    //     ])
    //     .enter()
    //     .append("rect")
    //     .attr("x", d => x1(d.key))
    //     .attr("y", d => y(d.value))
    //     .attr("width", x1.bandwidth())
    //     .attr("height", d => height - y(d.value))
    //     .attr("fill", d => color(d.key))
    //     .attr("opacity", 0.8);

    // Add bars
    svg.selectAll("g.layer")
        .data(data)
        .enter()
        .append("g")
        .attr("transform", d => `translate(${x0(d.surveyType)}, 0)`)
        .selectAll("rect")
        .data(d => [
            { key: "totalPatients", value: d.totalPatients },
            { key: "mcidAchieved", value: d.mcidAchieved }
        ])
        .enter()
        .append("rect")
        .attr("x", d => x1(d.key))
        .attr("y", d => y(d.value))
        .attr("width", x1.bandwidth())
        .attr("height", d => height - y(d.value))
        .attr("fill", d => color(d.key)) // Use updated color scale
        .attr("opacity", 0.8);

    // Add x-axis label
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 25)
        .attr("text-anchor", "middle")
        .attr("class", "axis-label") // Use CSS class
        .text("Survey");

    // Add y-axis label
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 20)
        .attr("x", -height / 2)
        .attr("text-anchor", "middle")
        .attr("class", "axis-label") // Use CSS class
        .text("Number of Patients");

//     // Adjust the legend at the top
// const legend = svg.append("g")
// .attr("transform", `translate(${width / 2 - 120}, -${margin.top / 2 - 10})`); // Adjusted positioning
// Add legend
const legend = svg.append("g")
    .attr("transform", `translate(${width / 2 - 20}, ${height + margin.bottom - 20})`); // Shift right and below the x-axis


// legend.selectAll("rect")
// .data(["totalPatients", "mcidAchieved"])
// .enter()
// .append("rect")
// .attr("x", (d, i) => i * 120) // Increased spacing between items
// .attr("width", 15)
// .attr("height", 15)
// .attr("fill", d => color(d));

// legend.selectAll("text")
// .data(["Total Patients", "MCID Achieved"])
// .enter()
// .append("text")
// .attr("x", (d, i) => i * 120 + 20) // Match the increased spacing
// .attr("y", 12)
// .attr("class", "legend-text") // Use CSS class for legend text styling
// .text(d => d);
// Update legend
legend.selectAll("rect")
    .data(["totalPatients", "mcidAchieved"])
    .enter()
    .append("rect")
    .attr("x", (d, i) => i * 120) // Adjust spacing
    .attr("width", 15)
    .attr("height", 15)
    .attr("fill", d => color(d)); // Use updated color scale

legend.selectAll("text")
    .data(["Total Patients", "MCID Achieved"])
    .enter()
    .append("text")
    .attr("x", (d, i) => i * 120 + 20) // Match spacing
    .attr("y", 12)
    .attr("class", "legend-text") // Use CSS class for legend text styling
    .text(d => d);

}

// Function to fetch data and render the chart based on selected combined option
function fetchPatientsMCIDData(diagnosisICD10, promsInstrument, scale) {
    const queryParams = `diagnosisICD10=${encodeURIComponent(diagnosisICD10)}&promsInstrument=${encodeURIComponent(promsInstrument)}&scale=${encodeURIComponent(scale)}`;

    fetch(`/api/patients-mcid-count?${queryParams}`)
        .then(response => response.json())
        .then(data => {
            createDetailedChart2(data);
        })
        .catch(error => console.error("Error fetching MCID data:", error));
}

// Add event listeners for all dropdowns
document.addEventListener("DOMContentLoaded", () => {
    waitForDropdownsToLoad(() => {
        const diagnosisDropdown = document.getElementById("diagnosisDropdown");
        const instrumentDropdown = document.getElementById("instrumentDropdown");
        const scaleDropdown = document.getElementById("scaleDropdown");

        const initialDiagnosis = diagnosisDropdown.value;
        const initialInstrument = instrumentDropdown.value;
        const initialScale = scaleDropdown.value;

        if (initialDiagnosis && initialInstrument && initialScale) {
            fetchPatientsMCIDData(initialDiagnosis, initialInstrument, initialScale);
        }

        [diagnosisDropdown, instrumentDropdown, scaleDropdown].forEach(dropdown => {
            dropdown.addEventListener("change", () => {
                if (diagnosisDropdown.value && instrumentDropdown.value && scaleDropdown.value) {
                    fetchPatientsMCIDData(
                        diagnosisDropdown.value,
                        instrumentDropdown.value,
                        scaleDropdown.value
                    );
                }
            });
        });
    });
});
