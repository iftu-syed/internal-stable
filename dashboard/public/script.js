document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', function (event) {
        event.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        // Perform AJAX request to send login data to the server
        fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        })
        .then(response => {
            if (response.redirected) {
                window.location.href = response.url; // Redirect to admin dashboard on successful login
            } else {
                alert('Invalid username or password');
            }
        })
        .catch(error => console.error('Error:', error));
    });
});


// Function to adjust button sizes based on screen width
function adjustButtonSizes() {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        const width = window.innerWidth;
        if (width <= 768) {
            button.style.width = '100%';
            button.style.margin = '10px 0';
        } else {
            button.style.width = 'auto';
            button.style.margin = '10px';
        }
    });
}

// Call the adjustButtonSizes function on page load and window resize
window.addEventListener('load', adjustButtonSizes);
window.addEventListener('resize', adjustButtonSizes);

