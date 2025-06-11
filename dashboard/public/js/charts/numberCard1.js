// function createNumberCard1(value) {
//     const container = document.getElementById('number-card-1');
//     if (!container) {
//         console.error("Number Card 1 container not found.");
//         return;
//     }

//     container.innerHTML = `
//         <p>${value}</p>
//         <h3>Total Patients Registered</h3>
//     `;
// }


function createNumberCard1(value) {
    const container = document.getElementById('number-card-1');
    if (!container) {
        console.error("Number Card 1 container not found.");
        return;
    }

    container.innerHTML = `
        <p>${value}</p>
        <h3>Total Patients Registered</h3>
    `;
}
