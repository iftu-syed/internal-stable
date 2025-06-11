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



let dashboardData = {}; // To store fetched data centrally

// Function to initialize the dashboard
function initializeDashboard() {
    fetchData();
}

// Fetch data from APIs
function fetchData() {
    // Example: Fetch aggregated data for the number cards
    Promise.all([
        fetch('/api/summary').then(res => res.json()),
        fetch('/api/response-rate-time-series').then(res => res.json()),
        fetch('/api/mean-score-by-survey-timeline').then(res => res.json()),
        fetch('/api/get-combined-options').then(res => res.json()),
        fetch('/api/get-hierarchical-options').then(res => res.json()),
        fetch('/api/proms-scores').then(res => res.json()),
        fetch('/api/treatment-diagnosis-heatmap').then(res => res.json()),
        fetch('/api/patients-mcid-count').then(res => res.json())
    ]).then(([summaryData, timeSeriesData, meanScoreData, promsDiagnosisDropDown, hierarchicalDropdown, promsScoresData, treatmentDiagnosis, mcidData]) => {
        if (!summaryData || !timeSeriesData || !meanScoreData || !promsDiagnosisDropDown || !hierarchicalDropdown || !promsScoresData || !treatmentDiagnosis || !mcidData) {
            console.error("One or more API responses are empty or invalid.");
            return;
        }

        // Log the fetched data to check if it's loaded correctly
        console.log('Summary Data:', summaryData);
        console.log('Time Series Data:', timeSeriesData);
        console.log('Mean Score Data:', meanScoreData);
        console.log('Proms Instrument and Diagnosis drop down Data:', promsDiagnosisDropDown);
        console.log('Hierarchical drop down Data:', hierarchicalDropdown);
        console.log('Proms Scatter Plot Data:', promsScoresData);
        console.log('Treatment Plan and Diagnosis Data:', treatmentDiagnosis);
        console.log('MCID Data:', mcidData);
        
        // Store fetched data in centralized object
        dashboardData = {
            summaryData: summaryData,
            timeSeriesData: timeSeriesData,
            meanScoreData: meanScoreData,
            promsDiagnosisDropDown: promsDiagnosisDropDown,
            hierarchicalDropdown: hierarchicalDropdown,
            promsScoresData: promsScoresData,
            treatmentDiagnosis: treatmentDiagnosis,
            mcidData: mcidData
        };

        // Initialize charts with the fetched data
        createNumberCard1(dashboardData.summaryData.totalPatientsRegistered);
        createNumberCard2(dashboardData.summaryData.totalSurveysSent);
        createNumberCard3(dashboardData.summaryData.totalSurveysCompleted);
        createNumberCard4(dashboardData.summaryData.surveyResponseRate);
        createCombinedChart(dashboardData.summaryData.surveyResponseRate, dashboardData.timeSeriesData);
        // Do NOT initialize midLevelChart1, midLevelChart2, detailedChart2 as they are initialized from within their individual .js files. 
        // createDetailedChart1(dashboardData.treatmentDiagnosis);
        // createDetailedChart2(dashboardData.mcidData);
    }).catch(error => {
        console.error("Error fetching data:", error);
    });
}

// Initialize the dashboard when the document is fully loaded
document.addEventListener('DOMContentLoaded', initializeDashboard);
