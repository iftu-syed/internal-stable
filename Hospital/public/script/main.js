// main.js

document.addEventListener('DOMContentLoaded', function () {
    const deleteButtons = document.querySelectorAll('.delete-btn');

    deleteButtons.forEach(button => {
        button.addEventListener('click', function (event) {
            const confirmation = confirm('Are you sure you want to delete this admin?');
            if (!confirmation) {
                event.preventDefault();
            }
        });
    });
});
