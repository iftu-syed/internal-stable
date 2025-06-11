function createNumberCard3(totalSurveysCompleted) {
    // Define dimensions for the SVG
    const width = 200;
    const height = 100;

    // Create an SVG container
    const svg = d3.select('#numberCard3')
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    // Add text for the total patients
    svg.append('text')
        .attr('x', width / 2)  // Center the text horizontally
        .attr('y', height / 2 - 10)  // Position vertically
        .attr('text-anchor', 'middle')  // Align text to the center
        .attr('class', 'number-card-value')
        .text(totalSurveysCompleted);

    // Add text for the description
    svg.append('text')
        .attr('x', width / 2)  // Center the text horizontally
        .attr('y', height / 2 + 20)  // Position below the number
        .attr('text-anchor', 'middle')  // Align text to the center
        .attr('class', 'number-card-description')
        .text('Surveys Completed');
}
