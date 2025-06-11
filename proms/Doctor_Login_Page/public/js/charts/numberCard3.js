function createNumberCard3(totalSurveysCompleted) {
    // Define dimensions for the SVG
    const width = 200;
    const height = 100;

    // Clear previous content
    d3.select('#numberCard3').selectAll('*').remove();

    // Create an SVG container
    const svg = d3.select('#numberCard3')
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    // Add text for the total surveys completed
    const valueText = svg.append('text')
        .attr('x', width / 2)  // Center the text horizontally
        .attr('y', height / 2 - 10)  // Position vertically
        .attr('text-anchor', 'middle')  // Align text to the center
        .attr('class', 'number-card-value-3')
        .style("font-family", "Urbanist")
        .text('0'); // Start with 0

    // Add text for the description
    svg.append('text')
        .attr('x', width / 2)  // Center the text horizontally
        .attr('y', height / 2 + 20)  // Position below the number
        .attr('text-anchor', 'middle')  // Align text to the center
        .attr('class', 'number-card-description')
        .style("font-family", "Urbanist")
        .text('Surveys Completed');

    // Count-Up Animation using D3.js
    let currentValue = 0;
    const duration = 1000; // Adjust the total animation duration
    let countUpInterval; // Store the interval reference

    countUpInterval = d3.interval(() => {
        currentValue += 1;
        if (currentValue > totalSurveysCompleted) {
            currentValue = totalSurveysCompleted;
            valueText.transition()
                .duration(duration)
                .tween('text', function() {
                    const i = d3.interpolate(this.textContent, currentValue);
                    return function(t) {
                        this.textContent = Math.floor(i(t)).toLocaleString();
                    };
                });
            countUpInterval.stop(); // Stop the interval
        } else {
            valueText.text(currentValue.toLocaleString());
        }
    }, duration / (totalSurveysCompleted * 2)); // Update value twice as fast
}



function waitForDropdownsToLoad(callback) {
    const departmentDropdown = document.getElementById("departmentDropdown");
    const siteNameDropdown = document.getElementById("siteNameDropdown");
    const doctorIdDropdown = document.getElementById("doctorIdDropdown");

    const interval = setInterval(() => {
        if (
            departmentDropdown?.value &&
            siteNameDropdown?.value &&
            doctorIdDropdown?.value !== undefined
        ) {
            clearInterval(interval);
            callback();
        }
    }, 50);
}

document.addEventListener("DOMContentLoaded", () => {
    waitForDropdownsToLoad(() => {
        const departmentDropdown = document.getElementById("departmentDropdown");
        const siteNameDropdown = document.getElementById("siteNameDropdown");
        const doctorIdDropdown = document.getElementById("doctorIdDropdown");

        const fetchNumberCard3Data = (department, siteName, doctorId) => {
            const queryParams = new URLSearchParams({
                ...(department && { department }),
                ...(siteName && { siteName }),
                ...(doctorId && doctorId !== 'all' && { doctorId })
            }).toString();

            fetch(`${basePath}/api/summary?${queryParams}`)
                .then(response => response.json())
                .then(data => {
                    const total = data?.totalSurveysCompleted ?? 0;
                    createNumberCard3(total);
                })
                .catch(error => console.error("Error fetching number card 3 data:", error));
        };

        // Initial fetch
        fetchNumberCard3Data(
            departmentDropdown.value,
            siteNameDropdown.value,
            doctorIdDropdown.value
        );

        // Add event listener to update number card 3 on dropdown change
        departmentDropdown.addEventListener("change", () => {
            fetchNumberCard3Data(
                departmentDropdown.value,
                siteNameDropdown.value,
                doctorIdDropdown.value
            );
        });

        siteNameDropdown.addEventListener("change", () => {
            fetchNumberCard3Data(
                departmentDropdown.value,
                siteNameDropdown.value,
                doctorIdDropdown.value
            );
        });

        doctorIdDropdown.addEventListener("change", () => {
            fetchNumberCard3Data(
                departmentDropdown.value,
                siteNameDropdown.value,
                doctorIdDropdown.value
            );
        });
    });
});
