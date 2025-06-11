// Updated treemap.js for vertical block stacking
function createTreemap(treemapData) {
    const container = document.getElementById('tree-map');

    // Check if the container exists
    if (!container) {
        console.error("Error: #tree-map container not found.");
        return;
    }

    // Prepare dropdown filter options
    const dropdown = document.getElementById("site-dropdown");
    dropdown.innerHTML = `<option value="All">All</option>`;

    const siteNames = treemapData.children.map(d => d.name);
    siteNames.forEach(siteName => {
        const option = document.createElement("option");
        option.value = siteName;
        option.textContent = siteName;
        dropdown.appendChild(option);
    });

    // Set initial dimensions
    let width = container.clientWidth;
    let height = 400; // Fixed height for the treemap

    // Improved color scheme using D3's schemeSet3
    const colorScale = d3.scaleOrdinal(d3.schemeSet3);

    // Create or select the SVG and tooltip
    // Clear any existing SVG (if this function might be called multiple times)
    d3.select(container).selectAll("svg").remove();

    const svg = d3.select(container)
        .append("svg")
        .attr("width", "100%")
        .attr("height", height + 60)
        .attr("viewBox", `0 0 ${width} ${height + 60}`)
        .attr("preserveAspectRatio", "xMinYMin meet");

    const tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    function renderTreemap(selectedSite) {
        // If 'All' is selected, default to the first site
        const siteData = selectedSite === "All"
            ? treemapData.children[0]
            : treemapData.children.find(d => d.name === selectedSite);

        if (!siteData) return;

        // Update dimensions dynamically if needed
        width = container.clientWidth;
        height = 600;

        // Clear existing content for redraw
        svg.selectAll("*").remove();

        svg
            .attr("width", "100%")
            .attr("height", height + 60)
            .attr("viewBox", `0 0 ${width} ${height + 60}`);

        const root = d3.hierarchy(siteData)
            .sum(d => d.value)
            .sort((a, b) => b.value - a.value);

        const treemapLayout = d3.treemap()
            .size([width, height])
            .paddingInner(2)
            .tile(d3.treemapSlice); // Use vertical stacking layout

        treemapLayout(root);

        const nodes = svg.selectAll("g.node")
            .data(root.leaves())
            .enter()
            .append("g")
            .attr("class", "node")
            .attr("transform", d => `translate(${d.x0},${d.y0})`);

        nodes.append("rect")
            .attr("id", d => d.data.name)
            .attr("width", d => d.x1 - d.x0)
            .attr("height", d => d.y1 - d.y0)
            .attr("fill", d => colorScale(d.parent.data.name))
            .style("stroke", "#fff")
            .on("mouseover", function (event, d) {
                d3.select(this).style("opacity", 0.7);
                tooltip.transition()
                    .duration(200)
                    .style("opacity", 0.9);
                tooltip.html(`
                    <strong>${d.data.name}</strong><br/>
                    Patients: ${d.data.value}<br/>
                    Department: ${d.parent.data.name}
                `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
            })
            .on("mousemove", function (event) {
                tooltip
                    .style("left", (event.pageX + 45) + "px") // Update position dynamically as the cursor moves
                    .style("top", (event.pageY + 5) + "px");
            })
            .on("mouseout", function () {
                d3.select(this).style("opacity", 1);
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });

        // Append node labels
        nodes.append("text")
            .attr("class", "node-label")
            .attr("x", d => d.x0 + 3)
            .attr("y", 20)
            .text(d => d.data.name)
            .attr("font-size", "14px")
            .attr("fill", "#000")
            .call(wrapText);

        // Function to wrap text within rectangles
        function wrapText(selection) {
            selection.each(function () {
                const node = d3.select(this);
                const rectWidth = +node.node().previousSibling.getAttribute("width");
                let word;
                const words = node.text().split(/\s+/).reverse();
                let line = [];
                let lineNumber = 0;
                const lineHeight = 1.1; // ems
                const y = node.attr("y");
                const x = node.attr("x");
                const dy = 0;
                let tspan = node.text(null).append("tspan").attr("x", x).attr("y", y);

                while ((word = words.pop())) {
                    line.push(word);
                    tspan.text(line.join(" "));
                    if (tspan.node().getComputedTextLength() > rectWidth - 6) {
                        line.pop();
                        tspan.text(line.join(" "));
                        line = [word];
                        tspan = node.append("tspan")
                            .attr("x", x)
                            .attr("y", y)
                            .attr("dy", ++lineNumber * lineHeight + dy + "em")
                            .text(word);
                    }
                }
            });
        }

        // Add legend for departments at the bottom
        const departments = [...new Set(root.leaves().map(d => d.parent.data.name))];
        const legendContainer = svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(0, ${height + 10})`);

        const legendItems = legendContainer.selectAll(".legend-item")
            .data(departments)
            .enter()
            .append("g")
            .attr("class", "legend-item")
            .attr("transform", (d, i) => `translate(${i * 120}, 0)`);

        legendItems.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 20)
            .attr("height", 20)
            .attr("fill", d => colorScale(d));

        legendItems.append("text")
            .attr("x", 25)
            .attr("y", 15)
            .text(d => d)
            .attr("font-size", "12px");
    }

    // Render initial treemap
    renderTreemap("All");

    // Add event listener for the dropdown
    dropdown.addEventListener("change", () => {
        const selectedSite = dropdown.value;
        renderTreemap(selectedSite);
    });

    // Handle window resize for responsiveness
    window.addEventListener('resize', () => {
        const selectedSite = dropdown.value;
        renderTreemap(selectedSite);
    });
}

// Make the createTreemap function accessible globally
window.createTreemap = createTreemap;
