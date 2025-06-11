function createNumberCard2(value) {
    const container = document.getElementById('number-card-2');
    if (!container) {
        console.error("Number Card 2 container not found.");
        return;
    }

    container.innerHTML = `
        <p>${value}</p>
        <h3>Total Surveys Sent</h3>

    `;
}
