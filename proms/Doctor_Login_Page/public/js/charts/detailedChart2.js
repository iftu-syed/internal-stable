function createDetailedChart2(data) {
    const container = document.getElementById("detailedChart2");

    if (!container) {
        console.error("Error: #detailedChart2 container not found.");
        return;
    }

    const width = 490;
    const height = 210;
    const margin = { top: 80, right: 30, bottom: 60, left: 60 };

    // Clear any existing SVG content
    d3.select("#detailedChart2").selectAll("svg").remove();

    // If data is empty, display a message
    if (data.length === 0) {
        // container.innerHTML = "<p class='no-data-message'>No data available for the selected combination.</p>";
        return;
    }

    // Create SVG container
    const svg = d3.select("#detailedChart2")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Create tooltip div
    const tooltip = d3.select("#detailedChart2")
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

    // Add chart title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -margin.top / 2 + 1)
        .attr("class", "chart-title")
        .style("font-family", "Urbanist")
        .text("Total Patients with Minimal Clinical Improvement");

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
    const xAxis = svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .style("opacity", 0);

    xAxis.call(d3.axisBottom(x0))
        .selectAll("text")
        .attr("class", "axis-label");

    // Add y-axis
    const yAxis = svg.append("g")
        .style("opacity", 0);

    // yAxis.call(d3.axisLeft(y))
    //     .selectAll("text")
    //     .attr("class", "axis-label");


    yAxis.call(d3.axisLeft(y).tickPadding(10)) // Add tickPadding for more space
    .selectAll("text")
    .attr("class", "axis-label");


    // Function to handle mouseover
    const handleMouseOver = function(event, d) {
        const bar = d3.select(this);
        bar.transition()
            .duration(200)
            .style("opacity", 0.7);

        tooltip.transition()
            .duration(200)
            .style("opacity", 0.9);

        const label = d.key === "totalPatients" ? "Total Patients" : "MCID Achieved";
        tooltip.html(`${label}: ${d.value}`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
    };
    const handleMouseMove = function(event) {
        // Update tooltip position to be closer to the cursor
        tooltip
            .style("left", (event.pageX - 35) + "px")  // Adjusted X position (closer)
            .style("top", (event.pageY - 5) + "px"); // Adjusted Y position (closer)
    };

    // Function to handle mouseout
    const handleMouseOut = function() {
        const bar = d3.select(this);
        bar.transition()
            .duration(200)
            .style("opacity", 1);

        tooltip.transition()
            .duration(500)
            .style("opacity", 0);
    };

    // Add bars with hover effects
    svg.append("g")
        .selectAll("g")
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
        .attr("class", d => d.key === "totalPatients" ? "total-patients-bar" : "mcid-bar")
        .attr("x", d => x1(d.key))
        .attr("y", height)
        .attr("width", x1.bandwidth())
        .attr("height", 0)
        .attr("rx", 5) // Horizontal corner radius
        .attr("ry", 5) // Vertical corner radius
        .on("mouseover", handleMouseOver)
        .on("mousemove", handleMouseMove)
        .on("mouseout", handleMouseOut)
        .transition()
        .duration(800)
        .delay((d, i) => i * 100)
        .attr("y", d => y(d.value))
        .attr("height", d => height - y(d.value));

    // Animate axes
    xAxis.transition()
        .duration(800)
        .style("opacity", 1);

    yAxis.transition()
        .duration(800)
        .style("opacity", 1);

    // Add axis labels with animation
    const xAxisLabel = svg.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 25)
        .style("opacity", 0)
        .style("font-family", "Urbanist")
        .style("font-size", "14px")
        .text("Survey");

    xAxisLabel.transition()
        .duration(800)
        .style("opacity", 1);

    const yAxisLabel = svg.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 20)
        .attr("x", -height / 2)
        .style("opacity", 0)
        .style("font-family", "Urbanist")
        .style("font-size", "14px")
        .text("Number of Patients");

    yAxisLabel.transition()
        .duration(800)
        .style("opacity", 1);

    // Add legend
    const legend = svg.append("g")
        .attr("transform", `translate(${width / 2 - 20}, ${height + margin.bottom - 20})`);

    // Add legend rectangles with the new classes
    legend.selectAll("rect")
        .data(["totalPatients", "mcidAchieved"])
        .enter()
        .append("rect")
        .attr("class", d => d === "totalPatients" ? "legend-rect-total" : "legend-rect-mcid")
        .attr("x", (d, i) => i * 120)
        .attr("width", 15)
        .attr("height", 15);

    legend.selectAll("text")
        .data(["Total Patients", "Min Clinical Improvement"])
        .enter()
        .append("text")
        .style("font-family", "Urbanist")
        .attr("class", "legend-text")
        .attr("x", (d, i) => i * 120 + 20)
        .attr("y", 12)
        .text(d => d);
}



// ----------------------------------------------------------------
// Updated fetchPatientsMCIDData – now includes intervention and doctorId
// ----------------------------------------------------------------
function fetchPatientsMCIDData(diagnosisICD10, promsInstrument, scale, department, siteName, intervention, doctorId) {
    const queryParams = new URLSearchParams({
        ...(diagnosisICD10 && { diagnosisICD10 }),
        ...(promsInstrument && { promsInstrument }),
        ...(scale && { scale }),
        ...(department && { department }),
        ...(siteName && { siteName }),
        ...(intervention && { intervention }), // NEW: include intervention
        ...(doctorId && { doctorId })          // NEW: include doctorId
    }).toString();

    fetch(`${basePath}/api/patients-mcid-count?${queryParams}`)
        .then(response => response.json())
        .then(data => {
            createDetailedChart2(data);
        })
        .catch(error => console.error("Error fetching MCID data:", error));
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

document.addEventListener("DOMContentLoaded", () => {
    waitForDropdownsToLoad(() => {
        const departmentDropdown   = document.getElementById("departmentDropdown");
        const siteNameDropdown     = document.getElementById("siteNameDropdown");
        const diagnosisDropdown    = document.getElementById("diagnosisDropdown");
        const instrumentDropdown   = document.getElementById("instrumentDropdown");
        const scaleDropdown        = document.getElementById("scaleDropdown");
        const interventionDropdown = document.getElementById("interventionDropdown"); // NEW
        const doctorIdDropdown     = document.getElementById("doctorIdDropdown");     // NEW

        const initialDepartment   = departmentDropdown.value;
        const initialSiteName     = siteNameDropdown.value;
        const initialDiagnosis    = diagnosisDropdown.value;
        const initialInstrument   = instrumentDropdown.value;
        const initialScale        = scaleDropdown.value;
        const initialIntervention = interventionDropdown ? interventionDropdown.value : null;
        const initialDoctorId     = doctorIdDropdown ? doctorIdDropdown.value : null;

        // Fetch initial data with default values
        if (
            initialDepartment &&
            initialSiteName &&
            initialDiagnosis &&
            initialInstrument &&
            initialScale &&
            initialIntervention &&
            initialDoctorId
        ) {
            fetchPatientsMCIDData(
                initialDiagnosis,
                initialInstrument,
                initialScale,
                initialDepartment,
                initialSiteName,
                initialIntervention,
                initialDoctorId
            );
        }

        // Add event listeners to update the heatmap on dropdown changes
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

                if (
                    updatedDepartment &&
                    updatedSiteName &&
                    updatedDiagnosis &&
                    updatedInstrument &&
                    updatedScale &&
                    updatedIntervention &&
                    updatedDoctorId
                ) {
                    fetchPatientsMCIDData(
                        updatedDiagnosis,
                        updatedInstrument,
                        updatedScale,
                        updatedDepartment,
                        updatedSiteName,
                        updatedIntervention,
                        updatedDoctorId
                    );
                }
            });
        });
    });
});
