// Layout and Positioning: Decide where each chart appears on the page and manage their relative positioning in the layout.
// Loading Data: Use this central file to fetch the data once for the dashboard and pass the relevant portions to each chart’s function.
// Interactivity Between Charts: Manage filters applied to multiple charts at once for enable interactivity, from the central file.

// Architecture:
// doctors_dashboard/
// │
// ├── public/
// │   ├── css/
// │   │   ├── styles.css         // Global CSS styles
// │   │   ├── numberCard.css     // CSS styles for number cards
// │   │   ├── midLevelChart1.css  // CSS styles for mid-level chart 1
// │   │   ├── midLevelChart2.css  // CSS styles for mid-level chart 2
// │   │   ├── combinedChart.css  // CSS styles for combined chart
// │   │   ├── detailedChart1.css // CSS styles for detailed chart 1
// │   │   ├── detailedChart2.css // CSS styles for detailed chart 2
// │   ├── js/
// │   │   ├── charts/
// │   │   │   ├── numberCard1.js
// │   │   │   ├── numberCard2.js
// │   │   │   ├── numberCard3.js
// │   │   │   ├── numberCard4.js
// │   │   │   ├── combinedChart.js
// │   │   │   ├── midLevelChart1.js
// │   │   │   ├── midLevelChart2.js
// │   │   │   ├── detailedChart1.js
// │   │   │   ├── detailedChart2.js
// │   │   └── dashboard.js       // Main dashboard JS file
// │   └── doc_dashboard.html      // Main HTML file for the dashboard
// ├── node_modules/               // Node.js modules
// ├── package-lock.json
// ├── package.json
// ├── server.js                   // Express server configuration



// Data Flow:
//  [MongoDB] --> [Node.js/Express API] --> [D3.js Fetch API Call] --> [Render Charts]

// Summary of Data Flow:
//  Top Layer (Number Cards):
//      Fetch aggregated data like total patients, surveys sent/completed, and response rates.
// 	Middle Section:
// 	Left Pane (2x2 Grid): The left-pane div with grid-container class includes placeholders for four charts (midLevelChart1, midLevelChart2, detailedChart1, and detailedChart2) in a 2x2 grid layout.
// 	Right Pane (Combined Donut and Bar Chart): The combinedChart div includes donutChartContainer and barChartContainer for placing the donut and bar chart components together. 
//      This layout keeps the combined chart on the right side.
//      Display mid-level analysis (e.g., average PROMIS score) with bubble charts.



// let dashboardData = {}; // To store fetched data centrally

// // Function to initialize the dashboard
// function initializeDashboard() {
//     fetchData();
// }

// // Fetch data from APIs
// function fetchData() {
//     // Example: Fetch aggregated data for the number cards
//     Promise.all([
//         fetch(basePath + '/api/summary').then(res => res.json()),
//         fetch(basePath + '/api/registeredpatients').then(res => res.json()),
//         fetch(basePath + '/api/surveysent').then(res => res.json()),
//         fetch(basePath + '/api/response-rate-time-series').then(res => res.json()),
//         fetch(basePath + '/api/mean-score-by-survey-timeline').then(res => res.json()),
//         fetch(basePath + '/api/get-hierarchical-options').then(res => res.json()),
//         fetch(basePath + '/api/proms-scores').then(res => res.json()),
//         fetch(basePath + '/api/treatment-diagnosis-heatmap').then(res => res.json()),
//         fetch(basePath + '/api/patients-mcid-count').then(res => res.json())
//     ]).then(([surveysentData,patientpredata,summaryData, timeSeriesData, meanScoreData, hierarchicalDropdown, promsScoresData, treatmentDiagnosis, mcidData]) => {
//         if (!surveysentData || !patientpredata || !summaryData || !timeSeriesData || !meanScoreData || !hierarchicalDropdown || !promsScoresData || !treatmentDiagnosis || !mcidData) {
//             console.error("One or more API responses are empty or invalid.");
//             return;
//         }

//         // Log the fetched data to check if it's loaded correctly
//         console.log('Summary Data:', summaryData);
//         console.log('PatientData:', patientpredata);
//         console.log('SurveySent',surveysentData);
//         console.log('Time Series Data:', timeSeriesData);
//         console.log('Mean Score Data:', meanScoreData);
//         console.log('Hierarchical drop down Data:', hierarchicalDropdown);
//         console.log('Proms Scatter Plot Data:', promsScoresData);
//         console.log('Treatment Plan and Diagnosis Data:', treatmentDiagnosis);
//         console.log('MCID Data:', mcidData);
        
//         // Store fetched data in centralized object
//         dashboardData = {
//             patientpredata: patientpredata,
//             surveysentData: surveysentData,
//             summaryData: summaryData,
//             timeSeriesData: timeSeriesData,
//             meanScoreData: meanScoreData,
//             hierarchicalDropdown: hierarchicalDropdown,
//             promsScoresData: promsScoresData,
//             treatmentDiagnosis: treatmentDiagnosis,
//             mcidData: mcidData
//         };

//         // Initialize charts with the fetched data
//         createNumberCard1(dashboardData.patientpredata.totalPatientsRegistered);
//         createNumberCard2(dashboardData.surveysentData.totalSurveysSent);
//         createNumberCard3(dashboardData.summaryData.totalSurveysCompleted);
//         createNumberCard4(dashboardData.summaryData.surveyResponseRate);
//         createCombinedChart(dashboardData.summaryData.surveyResponseRate, dashboardData.timeSeriesData);
//         // Do NOT initialize midLevelChart1, midLevelChart2, detailedChart2 as they are initialized from within their individual .js files. 
//         // createDetailedChart1(dashboardData.treatmentDiagnosis);
//         // createDetailedChart2(dashboardData.mcidData);
//     }).catch(error => {
//         console.error("Error fetching data:", error);
//     });
// }

// // Initialize the dashboard when the document is fully loaded
// document.addEventListener('DOMContentLoaded', initializeDashboard);



let dashboardData = {}; // To store fetched data centrally if needed elsewhere

// Function to display the empty state for charts
function displayNoDataMessage(chartContainerId) {
    const container = d3.select(`#${chartContainerId}`);
    if (!container.empty()) {
        container.selectAll("*").remove(); // Clear previous content
        // Get dimensions for centering (assuming chart files define width/height or use container size)
        // This is a basic example; adjust positioning as needed based on your chart setup
        const width = container.node().getBoundingClientRect().width || 300;
        const height = container.node().getBoundingClientRect().height || 200;
        container.append("text")
            .attr("x", width / 2)
            .attr("y", height / 2)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .style("font-size", "16px")
            .style("fill", "#888") // Optional styling
            .text("No Data Found");
    } else {
        console.warn(`Container #${chartContainerId} not found for no-data message.`);
    }
}

// Function to initialize the dashboard - checks doctorHasData first
function initializeDashboard() {
    // Check the global flag passed from EJS
    if (typeof doctorHasData !== 'undefined' && !doctorHasData) {
        console.log("Doctor has no data. Initializing empty dashboard state.");

        // 1. Set Number Cards to Zero
        // Assuming these functions exist and simply display the value
        if (typeof createNumberCard1 === 'function') createNumberCard1(0);
        if (typeof createNumberCard2 === 'function') createNumberCard2(0);
        if (typeof createNumberCard3 === 'function') createNumberCard3(0);
        if (typeof createNumberCard4 === 'function') createNumberCard4(0); // Display 0 for the rate

        // 2. Display "No Data Found" in Chart areas
        // Call functions that *draw* the charts with empty data or directly display message
        if (typeof createCombinedChart === 'function') createCombinedChart(0, []); else displayNoDataMessage('combinedChart');
        if (typeof createMeanScoreChart === 'function') createMeanScoreChart([]); else displayNoDataMessage('midLevelChart1'); // Assuming midLevelChart1 uses createMeanScoreChart
        if (typeof createScatterPlot === 'function') createScatterPlot([]); else displayNoDataMessage('midLevelChart2'); // Assuming midLevelChart2 uses createScatterPlot
        if (typeof createHeatmap === 'function') createHeatmap([]); else displayNoDataMessage('detailedChart1');       // Assuming detailedChart1 uses createHeatmap
        if (typeof createMCIDChart === 'function') createMCIDChart([]); else displayNoDataMessage('detailedChart2');         // Assuming detailedChart2 uses createMCIDChart

        // 3. Optional: Disable filters (except Doctor ID if needed)
        // disableFiltersForNoData(); // You can implement this if desired

    } else {
        console.log("Doctor has data. Proceeding to fetch data.");
        // Proceed with the normal data fetching routine
        fetchAndDisplayData();
    }
     // 4. Initialize dropdowns regardless of data presence (as doctorId needs 'All Doctors')
     // This should happen via hierarchicalDropdown.js's DOMContentLoaded listener
}

// Renamed function: Fetches data ONLY if doctorHasData was true
function fetchAndDisplayData() {
    console.log("Fetching initial dashboard data...");
    // Select only the APIs needed for the initial view (number cards, combined chart)
    // Other charts are typically populated via filterDashboard in hierarchicalDropdown.js
    Promise.all([
        // APIs for Number Cards
        fetch(basePath + '/api/registeredpatients').then(res => res.json()), // For card 1
        fetch(basePath + '/api/surveysent').then(res => res.json()),         // For card 2
        fetch(basePath + '/api/summary').then(res => res.json()),            // For cards 3 & 4
        // API For Combined Chart (if needed on initial load)
        fetch(basePath + '/api/response-rate-time-series').then(res => res.json()) // For combined chart time series
    ]).then(([patientData, surveysentData, summaryData, timeSeriesData]) => {

        // Store fetched data (optional, if needed globally)
        dashboardData = {
            patientpredata: patientData || { totalPatientsRegistered: 0 }, // Use defaults
            surveysentData: surveysentData || { totalSurveysSent: 0 },
            summaryData: summaryData || { totalSurveysCompleted: 0, surveyResponseRate: 0, totalSurveysSent: 0 },
            timeSeriesData: timeSeriesData || []
        };

        // Log fetched data
        console.log('Initial Patient Data:', dashboardData.patientpredata);
        console.log('Initial Survey Sent Data:', dashboardData.surveysentData);
        console.log('Initial Summary Data:', dashboardData.summaryData);
        console.log('Initial Time Series Data:', dashboardData.timeSeriesData);

        // Initialize Number Cards with fetched data
        if (typeof createNumberCard1 === 'function') createNumberCard1(dashboardData.patientpredata.totalPatientsRegistered);
        if (typeof createNumberCard2 === 'function') createNumberCard2(dashboardData.surveysentData.totalSurveysSent);
        if (typeof createNumberCard3 === 'function') createNumberCard3(dashboardData.summaryData.totalSurveysCompleted);

        // // Robust calculation for response rate
        // const responseRate = (dashboardData.summaryData.totalSurveysSent > 0)
        //    ? (dashboardData.summaryData.totalSurveysCompleted / dashboardData.summaryData.totalSurveysSent) * 100
        //    : 0;
        // if (typeof createNumberCard4 === 'function') createNumberCard4(responseRate); // Display calculated rate

        // Updated calculation:
// const responseRate = (dashboardData.surveysentData.totalSurveysSent > 0) // Use surveysentData for totalSent
// ? (dashboardData.summaryData.totalSurveysCompleted / dashboardData.surveysentData.totalSurveysSent) * 100 // Use summaryData for completed, surveysentData for totalSent
// : 0; // Handle division by zero

// if (typeof createNumberCard4 === 'function') {
//  createNumberCard4(responseRate); // Display calculated rate
// } else {
//  console.warn("createNumberCard4 function not found.");
//  // Optionally display the rate elsewhere or handle the missing function
//  const rateElement = document.getElementById('responseRateDisplay'); // Example placeholder
//  if (rateElement) {
//      rateElement.textContent = `${Math.round(responseRate)}%`;
//  }
// }


// --- START: Updated Rate Calculation and Chart Initialization ---

        // Calculate rate using data from BOTH relevant APIs for initial load
        const initialTotalCompleted = dashboardData.summaryData.totalSurveysCompleted ?? 0;
        const initialTotalSent = dashboardData.surveysentData.totalSurveysSent ?? 0;
        const initialCalculatedRate = (initialTotalSent > 0)
           ? (initialTotalCompleted / initialTotalSent) * 100
           : 0;

        // Optional: Keep this log for debugging the initial calculation
        console.log(`Dashboard Initial Rate Calculation: Completed=${initialTotalCompleted}, Sent=${initialTotalSent}, Rate=${initialCalculatedRate}`);

        // Initialize Number Card 4 with the calculated rate
        // Note: numberCard4.js will likely fetch again on load based on its own logic,
        // but this sets an initial value quickly using the dashboard's fetched data.
        if (typeof createNumberCard4 === 'function') {
             createNumberCard4(initialCalculatedRate);
        } else {
             console.warn("createNumberCard4 function not found.");
        }

        // Initialize Combined Chart with the calculated rate and time series
        if (typeof createCombinedChart === 'function') {
            // Ensure time series data is valid before passing
            const validTimeSeries = Array.isArray(dashboardData.timeSeriesData) ? dashboardData.timeSeriesData : [];
             if (!Array.isArray(dashboardData.timeSeriesData)) {
                 // Optional: Keep warning for invalid data
                 console.warn("Dashboard Initial Load: Invalid time series data received:", dashboardData.timeSeriesData);
             }
            // *** Pass the CALCULATED rate and the VALID time series data ***
            createCombinedChart(initialCalculatedRate, validTimeSeries);
        } else {
            console.warn("createCombinedChart function not found.");
            displayNoDataMessage('combinedChart'); // Handle missing function
        }

        // --- END: Updated Rate Calculation and Chart Initialization ---
        // Initialize Combined Chart (pass calculated rate and time series)
        if (typeof createCombinedChart === 'function') {
            createCombinedChart(responseRate, dashboardData.timeSeriesData);
        } else {
            console.warn("createCombinedChart function not found.");
        }

        // IMPORTANT: The other charts (midLevel1/2, detailed1/2) are usually
        // populated based on the initial filter values set by hierarchicalDropdown.js
        // after the dropdowns are populated. Ensure that process still runs correctly.
        // If filterDashboard() isn't called automatically after dropdown init, you might need to trigger it.

    }).catch(error => {
        console.error("Error fetching initial dashboard data:", error);
        // Display error state for number cards and combined chart
         if (typeof createNumberCard1 === 'function') createNumberCard1("Error"); // Or 0
         if (typeof createNumberCard2 === 'function') createNumberCard2("Error");
         if (typeof createNumberCard3 === 'function') createNumberCard3("Error");
         if (typeof createNumberCard4 === 'function') createNumberCard4("Error");
         displayNoDataMessage('combinedChart'); // Show no data on error
    });
}

// Optional function to disable filters
function disableFiltersForNoData() {
    const idsToDisable = ["diagnosisDropdown", "interventionDropdown", "instrumentDropdown", "scaleDropdown", "combinedSurveyTypeDropdown"];
    idsToDisable.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.disabled = true;
            // Maybe add a class for styling disabled state
            element.classList.add('disabled-filter');
        }
    });
     console.log("Filters disabled due to no doctor data.");
     // Keep doctorIdDropdown enabled as requested
}


// Initialize the dashboard when the document is fully loaded
// This replaces the old direct call to fetchData
document.addEventListener('DOMContentLoaded', initializeDashboard);