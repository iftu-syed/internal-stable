function createCombinedChart(surveyResponseRate, timeSeriesData) {
    const width = 250;
    const height = 250;
    const thickness = 35;
    const radius = Math.min(width, height) / 2;
    const margin = { top: 60, right: 20, bottom: 50, left: 40 };
    const barWidth = width;
    const barHeight = 150;

    const responseRate = surveyResponseRate;

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
        .text("Survey Response Rate");

    const donutGroup = svg.append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2 - 20})`);

    const arc = d3.arc()
        .innerRadius(radius - thickness)
        .outerRadius(radius);

    const pie = d3.pie()
        .value(d => d)
        .sort(null);

    const dataForDonut = [responseRate, 100 - responseRate];

    donutGroup.selectAll('path')
        .data(pie(dataForDonut))
        .enter()
        .append('path')
        .attr('d', arc)
        .attr('fill', (d, i) => i === 0 ? '#008000' : '#ccc');

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

    // Function to determine color based on response rate
    function getColorByRate(responseRate) {
        if (responseRate <= 20) return "rgba(244, 51, 46, 1)"; // Red
        else if (responseRate <= 40) return "rgba(255, 141, 65, 1)"; // Orange
        else if (responseRate <= 60) return "rgba(231, 231, 74, 1)"; // Yellow
        else if (responseRate <= 80) return "rgba(215, 250, 0, 1)"; // Light Green
        else return "rgba(128, 176, 67, 1)"; // Dark Green
    }

    // Debug to verify colors
    timeSeriesData.forEach(d => {
        console.log(`Month-Year: ${d.monthYear}, Response Rate: ${d.responseRate}, Color: ${getColorByRate(d.responseRate)}`);
    });

    barGroup.selectAll(".bar")
        .data(timeSeriesData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.monthYear))
        .attr("y", d => y(d.responseRate))
        .attr("width", x.bandwidth())
        .attr("height", d => barHeight - y(d.responseRate))
        .attr("fill", d => getColorByRate(d.responseRate)) // Apply dynamic color
        .attr("rx", 5)
        .attr("ry", 5);

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
