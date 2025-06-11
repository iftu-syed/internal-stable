// Function to populate the combined dropdown with PROMs and Diagnosis options
function populateCombinedDropdown() {
    return fetch(basePath + '/api/get-combined-options')
        .then(response => response.json())
        .then(data => {
            const combinedDropdown = document.getElementById("combinedDropdown");
            combinedDropdown.innerHTML = ''; // Clear existing options

            // Populate combined dropdown
            data.combinedOptions.forEach(item => {
                const option = document.createElement("option");
                option.value = item;
                option.text = item;
                combinedDropdown.appendChild(option);
            });

            // Set default value to the first option if available
            if (data.combinedOptions.length > 0) {
                combinedDropdown.value = data.combinedOptions[0];
                return combinedDropdown.value; // Return the default option value
            }

            console.warn("No options available in the combined dropdown");
            return null; // Return null if no options are available
        })
        .catch(error => {
            console.error("Error fetching combined dropdown data:", error);
            return null;
        });
}
