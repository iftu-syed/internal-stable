let dashboardData = {}; // To store fetched data centrally

// Function to initialize the dashboard
function initializeDashboard() {
    fetchData();
}

// Fetch data from APIs
function fetchData() {
    // Fetch aggregated data for the number cards and other dashboard sections
    Promise.all([
        fetch(basePath + '/api/summary').then(res => res.json()),
        fetch(basePath + '/api/top-doc').then(res => res.json()),
        fetch(basePath + '/api/bottom-doc').then(res => res.json()),
        fetch(basePath + '/api/treemap-data').then(res => res.json()),
        fetch(basePath + '/api/response-rate-time-series').then(res => res.json()) // Added fetch for time series data
    ])
        .then(([summaryData, topDocData, bottomDocData, treemapData, timeSeriesData]) => {
            if (!summaryData || !topDocData || !bottomDocData || !treemapData || !timeSeriesData) {
                console.error("One or more API responses are empty or invalid.");
                return;
            }

            // Log the fetched data to ensure they're loaded correctly
            console.log('Summary Data:', summaryData);
            console.log('Top Doctors Data:', topDocData);
            console.log('Bottom Documents Data:', bottomDocData);
            console.log('Treemap Data:', treemapData);
            console.log('Time Series Data:', timeSeriesData);

            // Store fetched data in centralized object
            dashboardData = {
                summaryData: summaryData,
                topDocData: topDocData,
                bottomDocData: bottomDocData,
                treemapData: treemapData,
                timeSeriesData: timeSeriesData
            };

            // Initialize the number cards
            createNumberCard1(dashboardData.summaryData.totalPatientsRegistered);
            createNumberCard2(dashboardData.summaryData.totalSurveysSent);
            createNumberCard3(dashboardData.summaryData.totalSurveysCompleted);

            // Initialize other charts
            createBarChart1(dashboardData.topDocData);
            createBarChart2(dashboardData.bottomDocData);
            createTreemap(dashboardData.treemapData);
            createCombinedChart(dashboardData.summaryData.surveyResponseRate, dashboardData.timeSeriesData);
            createTimeSeriesChart(dashboardData.timeSeriesData); // Added initialization for time series chart
        })
        .catch(error => {
            console.error("Error fetching data:", error);
        });
}

// Initialize the dashboard when the document is fully loaded
document.addEventListener('DOMContentLoaded', initializeDashboard);
