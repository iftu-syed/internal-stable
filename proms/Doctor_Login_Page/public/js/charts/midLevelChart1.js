function createMidLevelChart1(meanScoreData) {
    const container = document.getElementById("midLevelChart1");

    if (!container) {
        console.error("Error: #midLevelChart1 container not found.");
        return;
    }

    const width = 460;
    const height = 210;
    const margin = { top: 50, right: 30, bottom: 60, left: 50 };

    // Clear any existing SVG content and tooltips
    d3.select("#midLevelChart1").selectAll("*").remove();

    // if (meanScoreData.length === 0) {
    //     // container.innerHTML = "<p class='no-data-message'>No data available for the selected combination.</p>";
    //     return;
    // }
// 1) Find the maximum patient count across all data points
const maxPatientCount = d3.max(meanScoreData, d => d.patientCount) || 0;

 // 2) Create a sqrt scale: domain from [0..maxPatientCount] 
 //    and range from [5..25] for the bubble radius (tweak as needed)
 const radiusScale = d3.scaleSqrt()
     .domain([0, maxPatientCount])
     .range([5, 25]);


    // Create tooltip div
    const tooltip = d3.select("#midLevelChart1")
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

    const svg = d3.select("#midLevelChart1")
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
    .style("fill", "#131217") // Set text color to #131217
    .text("PROMs Mean Score by Time");

    // Set up scales
    const x = d3.scaleBand()
        .domain(meanScoreData.map(d => d.surveyType))
        .range([0, width])
        .padding(0.5);

    const y = d3.scaleLinear()
        .domain([0, 100])
        .range([height, 0]);

    // Create axes
    svg.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("class", "axis-text");

        svg.append("g")
        .call(d3.axisLeft(y).ticks(5))
        .selectAll("text") // Select all tick text
        .style("font-size", "12px"); // Set font size to 12px

    // Function to handle bubble mouseover
    const handleMouseOver = function(event, d) {
        const bubble = d3.select(this);
        
        // Highlight the bubble
        bubble.transition()
        .duration(300)
        // .attr("r", () => {
        //   const hoverRadius = Math.sqrt(d.patientCount) * 3.5;
        //   return Math.max(14, hoverRadius);
        // })
        .attr("r", () => {
            return radiusScale(d.patientCount) * 1.2; // 20% bigger on hover
            })
            
        .attr("fill", "#1F8A70");
    
    

        // Show tooltip
        tooltip.transition()
            .duration(200)
            .style("opacity", 0.9);

        // tooltip.html(`
        //     <strong>Survey Type:</strong> ${d.surveyType}<br/>
        //     <strong>Mean Score:</strong> ${d.meanScore.toFixed(1)}
        // `)
        tooltip.html(`
                <strong>Survey Type : </strong> ${d.surveyType}<br/>>
                <strong>Mean Score:</strong> ${d.meanScore.toFixed(1)}<br/>
                <strong>Patient Count:</strong>${d.patientCount}
            `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");

        // Bring the bubble text to front
        d3.select(this.parentNode)
            .selectAll(".bubble-text")
            .filter(textD => textD === d)
            .style("font-weight", "bold");
    };
    const handleMouseMove = function(event) {
        // Update tooltip position to be closer to the cursor
        tooltip
            .style("left", (event.pageX - 35) + "px")  // Adjusted X position (closer)
            .style("top", (event.pageY - 5) + "px"); // Adjusted Y position (closer)
    };

    // Function to handle bubble mouseout
    const handleMouseOut = function(event, d) {
        const bubble = d3.select(this);
        
        // Reset the bubble
        bubble.transition()
                .duration(300)
                // .attr("r", () => {
                // const baseRadius = Math.sqrt(d.patientCount) * 3.0;
                // return Math.max(10, baseRadius);
                // })
                .attr("r", () => {
                    return radiusScale(d.patientCount);
                    })
                    
                .attr("fill", "#2D9E69");
        // Hide tooltip
        tooltip.transition()
            .duration(500)
            .style("opacity", 0);

        // Reset the bubble text
        d3.select(this.parentNode)
            .selectAll(".bubble-text")
            .filter(textD => textD === d)
            .style("font-weight", "normal");
    };

    // Add bubbles with tooltips
    svg.selectAll("circle")
        .data(meanScoreData)
        .enter()
        .append("circle")
        .attr("class", "mean-score-bubble")
        .attr("cx", d => x(d.surveyType) + x.bandwidth() / 2)
        .attr("cy", d => y(d.meanScore))
        .attr("r", 0)
        .attr("fill", "#2D9E69")
        .on("mouseover", handleMouseOver)
        .on("mousemove", handleMouseMove)
        .on("mouseout", handleMouseOut)
        .transition()
        .duration(800)
        .attr("r", d => {
        return radiusScale(d.patientCount);
        });


    // Add labels with fade-in animation
    svg.selectAll("text.label")
        .data(meanScoreData)
        .enter()
        .append("text")
        .attr("class", "bubble-text")
        .attr("x", d => x(d.surveyType) + x.bandwidth() / 2)
        .attr("y", d => y(d.meanScore) + 5)
        .style("opacity", 0)
        .style("fill", "#fff")
        .style("pointer-events", "none")
        .text(d => d.meanScore.toFixed(1))
        // .text(d => `${d.meanScore.toFixed(1)} (${d.patientCount})`)
        .transition()
        .duration(800)
        .style("opacity", 1);

    // Add axis labels with animation
    svg.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 15)
        .style("font-family", "Urbanist")
        .style("font-size", "14px")
        .style("opacity", 0)
        .text("Survey Timeline")
        .transition()
        .duration(800)
        .style("opacity", 1);

    svg.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 15)
        .attr("x", -height / 2)
        .style("opacity", 0)
        .style("font-family", "Urbanist")
        .style("font-size", "14px")
        .text("Mean Score")
        .transition()
        .duration(800)
        .style("opacity", 1);

    // Add legend
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
        .text("Mean Score");
}






function fetchMeanScoreData(diagnosisICD10, promsInstrument, scale, department, siteName, intervention, doctorId) {
    // Build query params, skipping if 'null' or 'all' logic handled in backend
    const queryParams = new URLSearchParams({
        ...(diagnosisICD10 && { diagnosisICD10 }),
        ...(promsInstrument && { promsInstrument }),
        ...(scale && { scale }),
        ...(department && { department }),
        ...(siteName && { siteName }),
        ...(intervention && { intervention }), // NEW: add intervention
        ...(doctorId && { doctorId })          // NEW: add doctorId
    }).toString();

    fetch(`${basePath}/api/mean-score-by-survey-timeline?${queryParams}`)
        .then(response => response.json())
        .then(data => {
            d3.select("#midLevelChart1 svg").remove();
            createMidLevelChart1(data);
        })
        .catch(error => console.error("Error fetching mean score data:", error));
}

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
            interventionDropdown && interventionDropdown.value && // Ensure intervention is loaded
            doctorIdDropdown && doctorIdDropdown.value                // Ensure doctorId is loaded
        ) {
            clearInterval(interval);
            callback();
        }
    }, 50);
}

document.addEventListener("DOMContentLoaded", () => {
    console.log("Initializing midLevelChart1...");

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

        // Fetch initial data
        if (
            initialDepartment && initialSiteName &&
            initialDiagnosis  && initialInstrument &&
            initialScale && initialIntervention &&
            initialDoctorId
        ) {
            fetchMeanScoreData(
                initialDiagnosis,
                initialInstrument,
                initialScale,
                initialDepartment,
                initialSiteName,
                initialIntervention,
                initialDoctorId
            );
        }

        // Re-fetch on any filter changes
        const dropdownsToWatch = [
            departmentDropdown,
            siteNameDropdown,
            diagnosisDropdown,
            instrumentDropdown,
            scaleDropdown,
            interventionDropdown, // NEW
            doctorIdDropdown      // NEW
        ];

        dropdownsToWatch.forEach(dropdown => {
            dropdown.addEventListener("change", () => {
                const updatedDepartment   = departmentDropdown.value;
                const updatedSiteName     = siteNameDropdown.value;
                const updatedDiagnosis    = diagnosisDropdown.value;
                const updatedInstrument   = instrumentDropdown.value;
                const updatedScale        = scaleDropdown.value;
                const updatedIntervention = interventionDropdown ? interventionDropdown.value : null;
                const updatedDoctorId     = doctorIdDropdown ? doctorIdDropdown.value : null;

                fetchMeanScoreData(
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
