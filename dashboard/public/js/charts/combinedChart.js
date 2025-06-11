function createCombinedChart(surveyResponseRate, timeSeriesData) {
    const width = 250;
    const height = 250;
    const thickness = 35;
    const radius = Math.min(width, height) / 2;
    const margin = { top: 40, right: 20, bottom: 30, left: 40 };
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
        // .text("Survey Response Rate");

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
            .style("left", (event.pageX + 1) + "px")
            .style("top", (event.pageY - 11) + "px");
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
            .style("left", (event.pageX + 5) + "px")
            .style("top", (event.pageY - 8) + "px");
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
