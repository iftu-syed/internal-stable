function createBarChart1(topDocData) {
   const container = document.getElementsByClassName("#topDocContainer");

   // Check if the container exists
   if (!container) {
       console.error("Error: #topDocContainer container not found.");
       return;
   }

   // Prepare dropdown filter options
   const siteNames = Array.from(new Set(topDocData.map(d => d.siteName)));
   const dropdown = document.getElementById("site-dropdown");
   const colorScale = d3.scaleOrdinal(d3.schemeSet3); // Define colorScale using d3.schemeSet3


   // Populate the dropdown
   dropdown.innerHTML = `<option value="All">All</option>`;
   siteNames.forEach(siteName => {
       const option = document.createElement("option");
       option.value = siteName;
       option.textContent = siteName;
       dropdown.appendChild(option);
   });

   // Function to render the bar chart
   function renderChart(filteredData) {
       // Clear existing chart
       d3.select("#topDocChart").html("");

       // Set fixed dimensions for simplicity
       const width = 250; // Fixed width
       const height = 250; // Fixed height
       const margin = { top: 15, right: 50, bottom: 35, left: 110 };

       // Create the SVG container
       const svg = d3.select("#topDocChart")
           .append("svg")
           .attr("width", width + margin.left + margin.right)
           .attr("height", height + margin.top + margin.bottom)
           .append("g")
           .attr("transform", `translate(${margin.left},${margin.top})`);

       // Set up the scales
       const x = d3.scaleLinear()
           .domain([0, 100])
           .range([0, width]);

       const y = d3.scaleBand()
           .domain(filteredData.map(d => d.doctorName))
           .range([0, height])
           .padding(0.2);
           svg.selectAll(".bar")
           .data(filteredData)
           .enter()
           .append("rect")
           .attr("class", "bar")
           .attr("y", d => y(d.doctorName))
           .attr("rx", 5) // Horizontal corner radius
           .attr("ry", 5) // Vertical corner radius
           .attr("height", y.bandwidth())
           .attr("x", 0)
           .attr("width", d => x(d.mcidPercentage))
           .attr("fill", d => colorScale(d.doctorName)); // Assign color based on doctorName
       

       // Add x-axis
       svg.append("g")
           .attr("transform", `translate(0,${height})`)
           .call(d3.axisBottom(x).ticks(5))
           .attr("class", "axis-label");

       // Add y-axis
       svg.append("g")
           .call(d3.axisLeft(y))
           .attr("class", "axis-label");

       // Add labels
       svg.selectAll(".bar-label")
           .data(filteredData)
           .enter()
           .append("text")
           .attr("class", "bar-label")
           .attr("x", d => x(d.mcidPercentage) + 5)
           .attr("y", d => y(d.doctorName) + y.bandwidth() / 2)
           .attr("dy", ".35em")
           .text(d => d.mcidPercentage);
   }

   // Render initial chart
   renderChart(topDocData);

   // Add event listener for the dropdown
   dropdown.addEventListener("change", () => {
       const selectedSite = dropdown.value;
       const filteredData = selectedSite === "All" 
           ? topDocData 
           : topDocData.filter(d => d.siteName === selectedSite);
       renderChart(filteredData);
   });
}