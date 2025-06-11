// Function to populate the hierarchical dropdowns
function populateHierarchicalDropdowns() {
    return fetch(basePath + '/api/get-hierarchical-options')
        .then(response => response.json())
        .then(data => {
            const diagnosisDropdown = document.getElementById("diagnosisDropdown");
            const instrumentDropdown = document.getElementById("instrumentDropdown");
            const scaleDropdown = document.getElementById("scaleDropdown");

            // Clear all dropdowns
            diagnosisDropdown.innerHTML = '<option value="">Select Diagnosis</option>';
            instrumentDropdown.innerHTML = '<option value="">Select Instrument</option>';
            scaleDropdown.innerHTML = '<option value="">Select Scale</option>';

            // Populate the diagnosis dropdown
            data.forEach(item => {
                const option = document.createElement("option");
                option.value = item.diagnosisICD10;
                option.text = item.diagnosisICD10;
                diagnosisDropdown.appendChild(option);
            });

            // Set default values and return initial state
            if (data.length > 0) {
                const defaultDiagnosis = data[0].diagnosisICD10;
                diagnosisDropdown.value = defaultDiagnosis;

                const defaultInstrument = updateInstrumentDropdown(data, defaultDiagnosis);
                if (defaultInstrument) {
                    const defaultScale = updateScaleDropdown(data, defaultDiagnosis, defaultInstrument);
                    if (defaultScale) {
                        // Trigger the initial dashboard filter (or chart load) with all default values
                        filterDashboard(defaultScale);
                    }
                }

                return { data, diagnosis: defaultDiagnosis };
            }

            console.warn("No data available for dropdowns");
            return null;
        })
        .catch(error => {
            console.error("Error fetching hierarchical dropdown data:", error);
            return null;
        });
}

// Function to update the instrument dropdown based on selected diagnosis
function updateInstrumentDropdown(data, selectedDiagnosis) {
    const instrumentDropdown = document.getElementById("instrumentDropdown");
    const scaleDropdown = document.getElementById("scaleDropdown");

    instrumentDropdown.innerHTML = '<option value="">Select Instrument</option>';
    scaleDropdown.innerHTML = '<option value="">Select Scale</option>';

    const selectedData = data.find(item => item.diagnosisICD10 === selectedDiagnosis);
    if (selectedData) {
        selectedData.promsInstruments.forEach((instrument, index) => {
            const option = document.createElement("option");
            option.value = instrument.promsInstrument;
            option.text = instrument.promsInstrument;
            instrumentDropdown.appendChild(option);

            // Set the first instrument as default
            if (index === 0) {
                instrumentDropdown.value = instrument.promsInstrument;
            }
        });

        instrumentDropdown.disabled = false;
        return instrumentDropdown.value; // Return the default selected instrument
    } else {
        console.warn("No instruments found for the selected diagnosis");
        instrumentDropdown.disabled = true;
        return null;
    }
}

// Function to update the scale dropdown based on selected instrument
function updateScaleDropdown(data, selectedDiagnosis, selectedInstrument) {
    const scaleDropdown = document.getElementById("scaleDropdown");

    scaleDropdown.innerHTML = '<option value="">Select Scale</option>';

    const selectedData = data.find(item => item.diagnosisICD10 === selectedDiagnosis);
    const instrumentData = selectedData?.promsInstruments.find(inst => inst.promsInstrument === selectedInstrument);

    if (instrumentData) {
        instrumentData.scales.forEach((scale, index) => {
            const option = document.createElement("option");
            option.value = scale;
            option.text = scale;
            scaleDropdown.appendChild(option);

            // Set the first scale as default
            if (index === 0) {
                scaleDropdown.value = scale;
            }
        });

        scaleDropdown.disabled = false;
        return scaleDropdown.value; // Return the default selected scale
    } else {
        console.warn("No scales found for the selected instrument");
        scaleDropdown.disabled = true;
        return null;
    }
}

// Event listeners for cascading behavior
document.addEventListener("DOMContentLoaded", () => {
    let hierarchicalData = [];

    // Initialize the dropdowns
    populateHierarchicalDropdowns().then(initialState => {
        if (initialState && initialState.data) {
            hierarchicalData = initialState.data; // Ensure data is properly assigned
        }

        const diagnosisDropdown = document.getElementById("diagnosisDropdown");
        const instrumentDropdown = document.getElementById("instrumentDropdown");
        const scaleDropdown = document.getElementById("scaleDropdown");

        // Diagnosis dropdown change event
        diagnosisDropdown.addEventListener("change", event => {
            const selectedDiagnosis = event.target.value;
            const selectedInstrument = updateInstrumentDropdown(hierarchicalData, selectedDiagnosis);
            if (selectedInstrument) {
                updateScaleDropdown(hierarchicalData, selectedDiagnosis, selectedInstrument);
            }
        });

        // Instrument dropdown change event
        instrumentDropdown.addEventListener("change", event => {
            const selectedDiagnosis = diagnosisDropdown.value;
            const selectedInstrument = event.target.value;
            updateScaleDropdown(hierarchicalData, selectedDiagnosis, selectedInstrument);
        });

        // Scale dropdown change event
        scaleDropdown.addEventListener("change", event => {
            const selectedDiagnosis = diagnosisDropdown.value;
            const selectedInstrument = instrumentDropdown.value;
            const selectedScale = event.target.value;

            if (selectedDiagnosis && selectedInstrument && selectedScale) {
                filterDashboard(selectedScale);
            }
        });
    });
});

// Function to filter the dashboard based on the selected scale
function filterDashboard(scale) {
    console.log("Filtering dashboard with scale:", scale);
    // Implement dashboard filtering logic or chart initialization here
}