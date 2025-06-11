// JavaScript for button interactions
document.addEventListener('DOMContentLoaded', () => {
    const editButtons = document.querySelectorAll('.edit-btn');
    // const deleteButtons = document.querySelectorAll('.delete-btn');

    editButtons.forEach(button => {
        button.addEventListener('click', () => {
            const doctorId = button.dataset.doctorId;
            window.location.href = `<%= basePath %>/doctors/edit/${doctorId}`;
        });
    });

});





