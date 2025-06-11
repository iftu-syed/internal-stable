function createNumberCard1(totalPatients) {
    // Define dimensions for the SVG
    const width = 200;
    const height = 100;

    // Clear previous content
    d3.select('#numberCard1').selectAll('*').remove();

    // Create an SVG container
    const svg = d3.select('#numberCard1')
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    // Add text for the total patients
    const valueText = svg.append('text')
        .attr('x', width / 2)  // Center the text horizontally
        .attr('y', height / 2 - 10)  // Position vertically
        .attr('text-anchor', 'middle')  // Align text to the center
        .attr('class', 'number-card-value-1')
        .style("font-family", "Urbanist")
        .text('0'); // Start with 0

    // Add text for the description
    svg.append('text')
        .attr('x', width / 2)  // Center the text horizontally
        .attr('y', height / 2 + 20)  // Position below the number
        .attr('text-anchor', 'middle')  // Align text to the center
        .attr('class', 'number-card-description')
        .style("font-family", "Urbanist")
        .text('Registered Patients');

    // Count-Up Animation using D3.js
    let currentValue = 0;
    const duration = 250; // Reduced the total animation duration
    let countUpInterval; // Store the interval reference

    countUpInterval = d3.interval(() => {
        currentValue += 1;
        if (currentValue > totalPatients) {
            currentValue = totalPatients;
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
    }, duration / totalPatients * 3); // Update value more frequently and faster loading
}



function waitForDropdownsToLoad(callback) {
    const departmentDropdown = document.getElementById("departmentDropdown");
    const siteDropdown = document.getElementById("siteNameDropdown");
    const doctorIdDropdown = document.getElementById("doctorIdDropdown");

    const interval = setInterval(() => {
        if (
            departmentDropdown?.value &&
            siteDropdown?.value &&
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
        const siteDropdown = document.getElementById("siteNameDropdown");
        const doctorIdDropdown = document.getElementById("doctorIdDropdown");

        const fetchNumberCardData = (department, siteName, doctorId) => {
            const queryParams = new URLSearchParams({
                ...(department && { department }),
                ...(siteName && { siteName }),
                ...(doctorId && doctorId !== 'all' && { doctorId })
            }).toString();

            fetch(`${basePath}/api/registeredpatients?${queryParams}`)
                .then(response => response.json())
                .then(data => {
                    const total = data?.totalPatientsRegistered ?? 0;
                    createNumberCard1(total);
                })
                .catch(error => console.error("Error fetching number card data:", error));
        };

        // Initial fetch with selected values
        fetchNumberCardData(
            departmentDropdown.value,
            siteDropdown.value,
            doctorIdDropdown.value
        );

        // Event listeners for dropdowns
        departmentDropdown.addEventListener("change", () => {
            fetchNumberCardData(
                departmentDropdown.value,
                siteDropdown.value,
                doctorIdDropdown.value
            );
        });

        siteDropdown.addEventListener("change", () => {
            fetchNumberCardData(
                departmentDropdown.value,
                siteDropdown.value,
                doctorIdDropdown.value
            );
        });

        doctorIdDropdown.addEventListener("change", () => {
            fetchNumberCardData(
                departmentDropdown.value,
                siteDropdown.value,
                doctorIdDropdown.value
            );
        });
    });
});
