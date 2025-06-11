// function createNumberCard4(responseRate) {
//     // Define dimensions for the SVG
//     const width = 200;
//     const height = 100;

//     // Clear previous content
//     d3.select('#numberCard4').selectAll('*').remove();

//     // Create an SVG container
//     const svg = d3.select('#numberCard4')
//         .append('svg')
//         .attr('width', width)
//         .attr('height', height);

//     // Add text for the response rate
//     const valueText = svg.append('text')
//         .attr('x', width / 2)  // Center the text horizontally
//         .attr('y', height / 2 - 10)  // Position vertically
//         .attr('text-anchor', 'middle')  // Align text to the center
//         .attr('class', 'number-card-value-4')
//         .style("font-family", "Urbanist")
//         .text('0%'); // Start with 0%

//     // Add text for the description
//     svg.append('text')
//         .attr('x', width / 2)  // Center the text horizontally
//         .attr('y', height / 2 + 20)  // Position below the number
//         .attr('text-anchor', 'middle')  // Align text to the center
//         .attr('class', 'number-card-description')
//         .style("font-family", "Urbanist")
//         .text('Response Rate');

//     // Count-Up Animation using D3's interval
//     let currentValue = 0; // Starting value
//     const targetValue = Math.round(responseRate); // Convert fraction to whole percentage and round
//     const step = Math.max(1, Math.ceil(targetValue / 50)); // Dynamic step size
//     const intervalDuration = 30; // Interval time in ms

//     const countUpInterval = d3.interval(() => {
//         currentValue += step;

//         // Ensure the value doesn't overshoot the target
//         if (currentValue >= targetValue) {
//             currentValue = targetValue;
//             valueText.text(`${currentValue}%`);
//             countUpInterval.stop(); // Stop the animation
//         } else {
//             valueText.text(`${currentValue}%`);
//         }
//     }, intervalDuration);
// }

// function waitForDropdownsToLoad(callback) {
//     const departmentDropdown = document.getElementById("departmentDropdown");
//     const siteNameDropdown = document.getElementById("siteNameDropdown");
//     const doctorIdDropdown = document.getElementById("doctorIdDropdown");

//     const interval = setInterval(() => {
//         if (
//             departmentDropdown?.value &&
//             siteNameDropdown?.value &&
//             doctorIdDropdown?.value !== undefined
//         ) {
//             clearInterval(interval);
//             callback();
//         }
//     }, 50);
// }

// document.addEventListener("DOMContentLoaded", () => {
//     waitForDropdownsToLoad(() => {
//         const departmentDropdown = document.getElementById("departmentDropdown");
//         const siteNameDropdown = document.getElementById("siteNameDropdown");
//         const doctorIdDropdown = document.getElementById("doctorIdDropdown");

//         const fetchNumberCard4Data = (department, siteName, doctorId) => {
//             const queryParams = new URLSearchParams({
//                 ...(department && { department }),
//                 ...(siteName && { siteName }),
//                 ...(doctorId && doctorId !== 'all' && { doctorId })
//             }).toString();

//             fetch(`${basePath}/api/summary?${queryParams}`)
//                 .then(response => response.json())
//                 .then(data => {
//                     const rate = data?.surveyResponseRate ?? 0;
//                     createNumberCard4(rate);
//                 })
//                 .catch(error => console.error("Error fetching number card 4 data:", error));
//         };

//         // Initial fetch with the selected department, site, and doctorId
//         fetchNumberCard4Data(
//             departmentDropdown.value,
//             siteNameDropdown.value,
//             doctorIdDropdown.value
//         );

//         // Add event listeners for department, site, and doctorId changes
//         departmentDropdown.addEventListener("change", () => {
//             fetchNumberCard4Data(
//                 departmentDropdown.value,
//                 siteNameDropdown.value,
//                 doctorIdDropdown.value
//             );
//         });

//         siteNameDropdown.addEventListener("change", () => {
//             fetchNumberCard4Data(
//                 departmentDropdown.value,
//                 siteNameDropdown.value,
//                 doctorIdDropdown.value
//             );
//         });

//         doctorIdDropdown.addEventListener("change", () => {
//             fetchNumberCard4Data(
//                 departmentDropdown.value,
//                 siteNameDropdown.value,
//                 doctorIdDropdown.value
//             );
//         });
//     });
// });





// ---- Start of numberCard4.js ----

function createNumberCard4(responseRate) {
    // Define dimensions for the SVG
    const width = 200;
    const height = 100;

    // Clear previous content
    d3.select('#numberCard4').selectAll('*').remove();

    // Create an SVG container
    const svg = d3.select('#numberCard4')
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    // Add text for the response rate
    const valueText = svg.append('text')
        .attr('x', width / 2)  // Center the text horizontally
        .attr('y', height / 2 - 10)  // Position vertically
        .attr('text-anchor', 'middle')  // Align text to the center
        .attr('class', 'number-card-value-4')
        .style("font-family", "Urbanist")
        .text('0%'); // Start with 0%

    // Add text for the description
    svg.append('text')
        .attr('x', width / 2)  // Center the text horizontally
        .attr('y', height / 2 + 20)  // Position below the number
        .attr('text-anchor', 'middle')  // Align text to the center
        .attr('class', 'number-card-description')
        .style("font-family", "Urbanist")
        .text('Response Rate');

    // --- Animation logic remains the same ---
    // Ensure responseRate is a number, default to 0 if not
    const targetValue = Math.round(isNaN(responseRate) ? 0 : responseRate);
    let currentValue = 0;
    const step = Math.max(1, Math.ceil(targetValue / 50));
    const intervalDuration = 30;

    // Handle case where target is 0 immediately
    if (targetValue <= 0) {
        valueText.text('0%');
        return; // No animation needed
    }

    const countUpInterval = d3.interval(() => {
        currentValue += step;

        if (currentValue >= targetValue) {
            currentValue = targetValue;
            valueText.text(`${currentValue}%`);
            countUpInterval.stop();
        } else {
            valueText.text(`${currentValue}%`);
        }
    }, intervalDuration);
}

function waitForDropdownsToLoad(callback) {
    const departmentDropdown = document.getElementById("departmentDropdown");
    const siteNameDropdown = document.getElementById("siteNameDropdown");
    const doctorIdDropdown = document.getElementById("doctorIdDropdown");

    // Optional: Add Hospital ID/Name if they influence the rate directly
    // const hospitalIdDropdown = document.getElementById("hospitalIdDropdown");
    // const hospitalNameDropdown = document.getElementById("hospitalNameDropdown");

    const interval = setInterval(() => {
        // Check if all required dropdowns have a value (or are loaded)
        if (
            departmentDropdown?.value &&
            siteNameDropdown?.value &&
            doctorIdDropdown?.value !== undefined
            // && hospitalIdDropdown?.value // Add if needed
            // && hospitalNameDropdown?.value // Add if needed
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
        // Optional: Get Hospital ID/Name dropdowns if needed for API calls
        const hospitalIdDropdown = document.getElementById("hospitalIdDropdown");
        const hospitalNameDropdown = document.getElementById("hospitalNameDropdown");

        // *** MODIFIED FUNCTION ***
        const fetchAndCalculateNumberCard4Data = (department, siteName, doctorId, hospitalId, hospitalName) => {
            // --- 1. Construct Query Params ---
            const queryParams = new URLSearchParams({
                // Only add parameters if they have a value and are not 'all' (unless 'all' is meaningful for your API)
                ...(department && department !== 'all' && { department }),
                ...(siteName && siteName !== 'all' && { siteName }),
                ...(doctorId && doctorId !== 'all' && { doctorId }),
                ...(hospitalId && hospitalId !== 'all' && { hospitalId }),
                ...(hospitalName && hospitalName !== 'all' && { hospitalName })
            }).toString();

            console.log("NumberCard4 Fetching with params:", queryParams); // Debug log

            // --- 2. Fetch BOTH endpoints ---
            Promise.all([
                fetch(`${basePath}/api/summary?${queryParams}`).then(res => res.json()), // Fetch completed count
                fetch(`${basePath}/api/surveysent?${queryParams}`).then(res => res.json()) // Fetch sent count
            ])
            .then(([summaryData, surveysentData]) => {
                // --- 3. Log fetched data for debugging ---
                console.log("NumberCard4 Summary Data:", summaryData);
                console.log("NumberCard4 Surveys Sent Data:", surveysentData);

                // --- 4. Extract the counts ---
                const totalCompleted = summaryData?.totalSurveysCompleted ?? 0;
                const totalSent = surveysentData?.totalSurveysSent ?? 0;

                 // --- 5. Debug individual counts ---
                 console.log(`Calculating Rate: Completed=${totalCompleted}, Sent=${totalSent}`);

                // --- 6. Calculate the rate ---
                let calculatedRate = 0;
                if (totalSent > 0) {
                    calculatedRate = (totalCompleted / totalSent) * 100;
                } else {
                    // Handle case where nothing was sent
                    calculatedRate = 0;
                }

                // --- 7. Log the calculated rate ---
                console.log("NumberCard4 Calculated Rate:", calculatedRate);

                // --- 8. Update the card ---
                createNumberCard4(calculatedRate);
            })
            .catch(error => {
                console.error("Error fetching data for number card 4:", error);
                createNumberCard4(0); // Display 0 or an error state on failure
            });
        };

        // --- Initial Fetch ---
        fetchAndCalculateNumberCard4Data(
            departmentDropdown.value,
            siteNameDropdown.value,
            doctorIdDropdown.value,
            hospitalIdDropdown?.value, // Pass hospital values if dropdown exists
            hospitalNameDropdown?.value // Pass hospital values if dropdown exists
        );

        // --- Add Event Listeners ---
        // Function to refetch data on any relevant filter change
        const handleFilterChange = () => {
             fetchAndCalculateNumberCard4Data(
                departmentDropdown.value,
                siteNameDropdown.value,
                doctorIdDropdown.value,
                hospitalIdDropdown?.value,
                hospitalNameDropdown?.value
            );
        };

        // Listen to changes on all relevant dropdowns
        departmentDropdown.addEventListener("change", handleFilterChange);
        siteNameDropdown.addEventListener("change", handleFilterChange);
        doctorIdDropdown.addEventListener("change", handleFilterChange);
        if (hospitalIdDropdown) hospitalIdDropdown.addEventListener("change", handleFilterChange);
        if (hospitalNameDropdown) hospitalNameDropdown.addEventListener("change", handleFilterChange);

        // IMPORTANT: Also listen for changes in other filters if they should affect this card
        // e.g., diagnosis, intervention, etc., if your API endpoints use them for card 4.
        // Example:
        // document.getElementById("diagnosisDropdown")?.addEventListener("change", handleFilterChange);
        // document.getElementById("interventionDropdown")?.addEventListener("change", handleFilterChange);

    });
});

// ---- End of numberCard4.js ----