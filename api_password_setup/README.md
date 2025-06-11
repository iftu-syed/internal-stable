# API Password Setup Module

## Description

This project is a Node.js-based module that allows users to securely create and manage passwords for patients in a healthcare system. The application provides an interface where patients can input their medical record number (Mr_no) and date of birth (DOB) to set or update their password. It uses MongoDB to store patient data and EJS to render forms.

The project also utilizes session management and flash messages to provide user feedback during the process.

## Table of Contents

1. [Installation](#installation)
2. [Usage](#usage)
3. [Environment Variables](#environment-variables)
4. [API Documentation](#api-documentation)
5. [Technologies Used](#technologies-used)
6. [Contributing](#contributing)
7. [License](#license)
8. [Contact](#contact)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/api_password_setup.git

2. Usage
Start the server:

After setting up the environment variables, run the following command:

bash
Copy code
npm start
The server will start on the port specified in your .env file (default is port 3002).

Access the application:

Open your browser and navigate to http://localhost:3002. You will see the input form where users can enter their MR number and Date of Birth (DOB) to reset or set their password.

Features:
Form submission: Patients submit their MR number and DOB to the /password/:Mr_no route, where their information is validated against the database.

Password reset: If valid, the patient can set a new password.

Flash messages: Users are notified with success or error messages using flash messaging (e.g., "Passwords do not match", "Please check your details and try again").


3. Environment Variables
The following environment variables are required for the project. Set them in the .env file:

PORT: The port on which the app runs (e.g., 3002).
DB_URI: The MongoDB URI for database connection (default: mongodb+srv://admin:admin@mydevopsdb.5hmumeq.mongodb.net//).
DB_NAME: The name of the MongoDB database (e.g., Data_Entry_Incoming).
SESSION_SECRET: A secret key used for session management (replace your_secret_key with an actual secret).
REDIRECT_PORT: The port for the redirection after successful password setup (e.g., 3055).

4. API Endpoints
Root Route (/)
Method: GET
Description: Renders the input form (input_form.ejs) where users can submit their MR number and DOB.
Response: Renders a form for input.
Password Form Route (/password/:Mr_no)
Method: GET

Description: Displays the password form after validating the MR number and DOB.

Params:

Mr_no: The patient's Medical Record number (MR number).
Query Parameters:

dob: Date of birth in MM/DD/YYYY format.
Response:

Renders the password setup form (form.ejs).
Flash error messages if details are invalid.
Method: POST

Description: Handles password setup form submission. Updates the patient record in the MongoDB database with the new password.

Params:

Mr_no: The patient's MR number.
Body:

password: The new password.
confirmPassword: Confirmed password (must match password).
Response:

Redirects to the homepage on success.
Shows error messages if passwords do not match or if there’s a server error.


5. Technologies Used
Node.js: JavaScript runtime for building the backend.
Express.js: Web framework for Node.js.
MongoDB: NoSQL database to store patient data.
EJS: Templating engine for rendering views.
dotenv: For managing environment variables.
express-session: Session middleware for user sessions.
connect-flash: For displaying flash messages.
body-parser: Middleware to parse form data.


6. ## Author

This project is developed and maintained by:

- **[GIFTY INTERNATIONAL](https://www.companywebsite.com)**
  - Company Contact: [contact@company.com](mailto:contact@company.com)

## Contributors

The development team includes:

- **VIJAY KUMAR CHAGANTIPATI**: [vijay@giftysolutions.com](mailto:vijay@giftysolutions.com)


7. 


8. Contact
If you have any questions, feel free to reach out:

Name: VIJAY KUMAR CHAGANTIPATI
Email: vijaykumarchagantipati2002@gmail.com
<!-- GitHub: https://github.com/your-username -->