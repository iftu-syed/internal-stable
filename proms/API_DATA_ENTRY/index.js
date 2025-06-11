// index.js

const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const path = require('path');
const ejs = require('ejs'); // Require EJS module
const multer = require('multer');
const csvParser = require('csv-parser');
const fs = require('fs');
const fsPromises = require('fs').promises;
const jwt = require('jsonwebtoken');
const cors = require('cors');
const app = express();
const i18nextMiddleware = require('i18next-http-middleware');
const i18next = require('i18next');
const cookieParser = require('cookie-parser');
app.use(cookieParser());
const Backend = require('i18next-fs-backend');
const upload = multer({ dest: "uploads/" });
const sgMail = require('@sendgrid/mail');
const { ObjectId } = require('mongodb');


const axios = require('axios');


// 2. Configuration for the Mock Auth Server
const MOCK_AUTH_SERVER_BASE_URL = 'http://localhost:3006'; // URL of your mock_auth_server.js
const MOCK_AUTH_CLIENT_ID = 'test_client_id_123';         // Client ID for mock server
const MOCK_AUTH_CLIENT_SECRET = 'super_secret_key_shhh';  // Client Secret for mock server


const ExcelJS = require('exceljs');

app.use('/staff/locales', express.static(path.join(__dirname, 'views/locales')));;
i18next
  .use(Backend)
  .use(i18nextMiddleware.LanguageDetector)
  .init({
    backend: {
      loadPath: path.join(__dirname, 'views/locales/{{lng}}/translation.json'),
    },
    fallbackLng: 'en',
    preload: ['en', 'ar'], // Supported languages
    detection: {
      order: ['querystring', 'cookie', 'header'],
      caches: ['cookie'],
    },
  });
  app.use(i18nextMiddleware.handle(i18next));

// Add session management dependencies
const session = require('express-session');
const MongoStore = require('connect-mongo');

// // require('dotenv').config();
// require('dotenv').config({ path: path.join(__dirname, '.env') }); // Ensure .env is loaded

require('dotenv').config();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be 32 characters
const IV_LENGTH = 16; // AES block size for CBC mode

app.use(express.urlencoded({ extended: true }));

// Import Twilio SDK
const twilio = require('twilio');
const crypto = require('crypto');
const flash = require('connect-flash');
// Function to hash the MR number
function hashMrNo(mrNo) {
    return crypto.createHash('sha256').update(mrNo).digest('hex');
}

// Add this after express-session middleware



app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.sendStatus(200);
  });
// Allow two origins for Swagger UI and local development
const allowedOrigins = ['http://localhost:3005', 'http://localhost/staff/api/v1'];

// const corsOptions = {
//   origin: (origin, callback) => {
//     if (allowedOrigins.includes(origin) || !origin) {
//       callback(null, true);
//     } else {
//       callback(new Error('Not allowed by CORS'));
//     }
//   }
// };


app.use(cors());
const basePath = '/staff'; // Base path for routes
app.locals.basePath = basePath;
// const PORT = process.env.PORT || 3051;
// const PORT = 3051;
const PORT = process.env.API_DATA_ENTRY_PORT; 

// AES-256 encryption function
function encrypt(text) {
    const iv = crypto.randomBytes(IV_LENGTH);  // Generate a random IV
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);

    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return iv.toString('hex') + ':' + encrypted.toString('hex'); // Return IV + encrypted text
}

// Helper function to decrypt the password (AES-256)
function decrypt(text) {
    let textParts = text.split(':');
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);

    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString();
}


app.use(bodyParser.json());

// Create a router for the staff base path
const staffRouter = express.Router();

// index.js

// // Connection URIs
// const dataEntryUri = 'mongodb+srv://admin:admin@mydevopsdb.5hmumeq.mongodb.net///Data_Entry_Incoming';
// const manageDoctorsUri = 'mongodb+srv://admin:admin@mydevopsdb.5hmumeq.mongodb.net///manage_doctors';

const dataEntryUri = process.env.DATA_ENTRY_MONGO_URL;  // Use environment variable
const manageDoctorsUri = process.env.MANAGE_DOCTORS_MONGO_URL;  // Use environment variable
const apiUri = process.env.API_URL;
const adminUserUri = process.env.ADMIN_USER_URL;

// Create new MongoClient instances for both databases
const dataEntryClient = new MongoClient(dataEntryUri);
const manageDoctorsClient = new MongoClient(manageDoctorsUri);
const apiClient = new MongoClient(apiUri);
const adminUserClient = new MongoClient(adminUserUri);

// Connect to both MongoDB databases
async function connectToMongoDB() {
    try {
        await Promise.all([
            dataEntryClient.connect(),
            manageDoctorsClient.connect(),
            apiClient.connect(),
            adminUserClient.connect()
        ]);
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
    }
}

connectToMongoDB();


// Access databases and collections in the routes as needed
staffRouter.use((req, res, next) => {
    const currentLanguage = req.query.lng || req.cookies.lng || 'en'; // Default to English
    const dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';

    res.locals.lng = currentLanguage; // Set the language for EJS templates
    res.locals.dir = dir;             // Set the direction for EJS templates

    res.cookie('lng', currentLanguage); // Persist language in cookies
    req.language = currentLanguage;
    req.dir = dir;
    
    req.dataEntryDB = dataEntryClient.db();
    req.manageDoctorsDB = manageDoctorsClient.db();
    req.apiDB = apiClient.db();
    req.adminUserDB = adminUserClient.db();
    next();
});


app.use(session({
    secret: process.env.SESSION_SECRET || 'your_secret_key', // Use a secret key from environment variables
    resave: false,
    saveUninitialized: false, // Ensure sessions are only saved when modified
    store: MongoStore.create({ mongoUrl: manageDoctorsUri }),
    cookie: { secure: false, maxAge: 60000 * 30 } // Set appropriate cookie options
}));



// Log function
function writeLog(logFile, logData) {
    fs.appendFile(path.join(__dirname, 'logs', logFile), logData + '\n', (err) => {
        if (err) {
            console.error('Error writing to log file:', err);
        }
    });
}





function formatTo12Hour(datetime) {
    const date = new Date(datetime);
    if (isNaN(date)) {
        return "Invalid Date";
    }
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}




app.use(flash());

// Ensure flash messages are available in all templates
staffRouter.use((req, res, next) => {
    res.locals.successMessage = req.flash('successMessage');
    res.locals.errorMessage = req.flash('errorMessage');
    next();
});
app.set('view engine', 'ejs'); // Set EJS as the view engine
app.set('views', path.join(__dirname, 'views')); // Set views directory
// Serve static files (including index.html)
app.use(bodyParser.urlencoded({ extended: true }));
// app.use(express.static(path.join(__dirname, 'public')));

app.use(basePath, express.static(path.join(__dirname, 'public'))); // Serve static files under the base path

staffRouter.use((req, res, next) => {
    res.on('finish', () => {
        if (req.session && req.session.username && req.session.hospital_code) {
            const { username, hospital_code } = req.session;
            const timestamp = new Date().toISOString();
            let Mr_no;

            if (req.method === 'POST' && req.path === '/api/data') {
                Mr_no = req.body.Mr_no;
                const { datetime, speciality } = req.body;
                const action = 'creation';
                const logData = `Mr_no: ${Mr_no}, timestamp: ${timestamp}, action: ${action}, username: ${username}, hospital_code: ${hospital_code}, datetime: ${datetime}, speciality: ${speciality}`;
                writeLog('appointment_logs.txt', logData);
            }

            if (req.method === 'POST' && req.path === '/api-edit') {
                Mr_no = req.body.mrNo;  // Ensure mrNo is captured correctly here
                const { datetime, speciality } = req.body;
                const action = 'modification';
                const logData = `Mr_no: ${Mr_no}, timestamp: ${timestamp}, action: ${action}, username: ${username}, hospital_code: ${hospital_code}, datetime: ${datetime}, speciality: ${speciality}`;
                writeLog('appointment_logs.txt', logData);
            }
        }
    });
    next();
});

function getNewAppointmentHtml(firstName, doctorName, formattedDatetime, hashedMrNo, to) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Urbanist:wght@300;400;600&display=swap');

            body {
                margin: 0;
                padding: 0;
                font-family: 'Urbanist', sans-serif;
                background-color: #f7f9fc;
            }
            .email-container {
                max-width: 650px;
                margin: 40px auto;
                background: #ffffff;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                overflow: hidden;
                border: 1px solid #e2e8f0;
            }
            .email-header {
                background-color: #eaf3fc;
                color: #3b82f6;
                text-align: center;
                padding: 25px;
                font-size: 24px;
                font-weight: 600;
            }
            .email-body {
                padding: 25px 30px;
                color: #4a5568;
                font-size: 16px;
                line-height: 1.8;
            }
            .email-body h2 {
                color: #3b82f6;
                font-size: 20px;
                margin-bottom: 15px;
            }
            .email-body p {
                margin: 10px 0;
            }
            .cta-button {
                display: inline-block;
                margin: 20px auto;
                padding: 12px 30px;
                font-size: 16px;
                font-weight: 600;
                color: #ffffff;
                background-color: #3b82f6;
                border-radius: 8px;
                text-decoration: none;
                text-align: center;
                transition: background-color 0.3s;
            }
            .cta-button:hover {
                background-color: #2563eb;
            }
            .email-footer {
                background-color: #f1f5f9;
                padding: 20px;
                text-align: center;
                font-size: 14px;
                color: #6b7280;
                border-top: 1px solid #e2e8f0;
            }
            .email-footer a {
                color: #3b82f6;
                text-decoration: none;
            }
            .email-footer a:hover {
                text-decoration: underline;
            }

            /* Additional Styles Removed */
          </style>
      </head>
      <body>
          <div class="email-container">
              <!-- Header -->
              <div class="email-header">
                  Appointment Confirmation
              </div>

              <!-- Body -->
              <div class="email-body">
                  <p>Dear <strong>${firstName}</strong>,</p><br>
                  <p>Dr. <strong>${doctorName}</strong> kindly requests that you complete a short questionnaire ahead of your appointment on <strong>${formattedDatetime}</strong>. This information will help us understand your current health state and provide you with the most effective care possible.</p><br>
                  <p>Please select the link below to begin the questionnaire:</p><br>
                  <a href="http://localhost/patientsurveys/dob-validation?identifier=${hashedMrNo}" class="cta-button">Complete the Survey</a>
              </div>

              <!-- Footer -->
              <div class="email-footer">
                  If you have any questions, feel free to <a href="mailto:support@wehealthify.org">Contact Us.</a><br>
                  &copy; 2024 Your Clinic. All rights reserved.
                  <div class="footer-links">
                      <p><a href="http://localhost/privacy-policy" target="_blank">Privacy Policy</a></p>
                  </div>
              </div>
          </div>
      </body>
      </html>
    `;
}

function getReminderHtml(firstName, speciality, formattedDatetime, hashedMrNo, to) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reminder</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Urbanist:wght@300;400;600&display=swap');

            body {
                margin: 0;
                padding: 0;
                font-family: 'Urbanist', sans-serif !important;
                background-color: #f7f9fc;
            }
            .email-container {
                max-width: 650px;
                margin: 40px auto;
                background: #ffffff;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                overflow: hidden;
                border: 1px solid #e2e8f0;
            }
            .email-header {
                background-color: #eaf3fc;
                color: #3b82f6;
                text-align: center;
                padding: 12px;
                font-size: 12px;
                font-weight: 600;
            }
            .email-body {
                padding: 25px 30px;
                color: #4a5568;
                font-size: 16px;
                line-height: 1.8;
            }
            .email-body h2 {
                color: #3b82f6;
                font-size: 20px;
                margin-bottom: 15px;
            }
            .email-body p {
                margin: 10px 0;
            }
            .survey-link {
                display: inline-block;
                margin: 20px auto;
                padding: 12px 30px;
                font-size: 16px;
                font-weight: 600;
                color: #ffffff !important;
                background: linear-gradient(90deg, #0061f2, #00b3f6) !important; 
                border-radius: 8px;
                text-decoration: none;
                text-align: center;
                transition: transform 0.3s ease;
            }
            .survey-link:hover {
                background: linear-gradient(90deg, #0053d4, #009fd1);
                transform: translateY(-2px);
            }
            .email-footer {
                background-color: #f1f5f9;
                padding: 20px;
                text-align: center;
                font-size: 14px;
                color: #6b7280;
                border-top: 1px solid #e2e8f0;
            }
            .email-footer a {
                color: #3b82f6;
                text-decoration: none;
            }
            .email-footer a:hover {
                text-decoration: underline;
            }

            /* Additional Styles Removed */
          </style>
      </head>
      <body>
          <div class="email-container">
              <!-- Header -->
              <div class="email-header">
                  <h1>Reminder</h1>
              </div>

              <!-- Body -->
              <div class="email-body">
                  <p>Dear <strong>${firstName}</strong>,</p><br>
                  <p>Your appointment for <strong>${speciality}</strong> is approaching. Don't forget to complete your survey beforehand. </p>
                  <p>If already completed, ignore. </p> <br>
                  
                  <a href="http://localhost/patientsurveys/dob-validation?identifier=${hashedMrNo}" class="survey-link">Complete the Survey</a>
              </div>

              <!-- Footer -->
              <div class="email-footer">
                  If you have any questions, feel free to <a href="mailto:support@wehealthify.org">Contact Us.</a><br>
                  &copy; 2024 Your Clinic. All rights reserved.
                  <div class="footer-links">
                      <p><a href="http://localhost/privacy-policy" target="_blank">Privacy Policy</a></p>
                  </div>
              </div>
          </div>
      </body>
      </html>
    `;
  }
  
  function getFollowUpHtml(firstName, doctorName, hashedMrNo) {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Follow Up</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Urbanist:wght@300;400;600&display=swap');

            body {
                margin: 0;
                padding: 0;
                font-family: 'Urbanist', sans-serif !important;
                background-color: #f7f9fc;
            }
            .email-container {
                max-width: 650px;
                margin: 40px auto;
                background: #ffffff;
                border-radius: 12px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                overflow: hidden;
                border: 1px solid #e2e8f0;
            }
            .email-header {
                background-color: #eaf3fc;
                color: #3b82f6;
                text-align: center;
                padding: 12px;
                font-size: 12px;
                font-weight: 600;
            }
            .email-body {
                padding: 25px 30px;
                color: #4a5568;
                font-size: 16px;
                line-height: 1.8;
            }
            .email-body h2 {
                color: #3b82f6;
                font-size: 20px;
                margin-bottom: 15px;
            }
            .email-body p {
                margin: 10px 0;
            }
            .survey-link {
                display: inline-block;
                margin: 20px auto;
                padding: 12px 30px;
                font-size: 16px;
                font-weight: 600;
                color: #ffffff !important;
                background: linear-gradient(90deg, #0061f2, #00b3f6) !important; 
                border-radius: 8px;
                text-decoration: none;
                text-align: center;
                transition: transform 0.3s ease;
            }
            .survey-link:hover {
                background: linear-gradient(90deg, #0053d4, #009fd1);
                transform: translateY(-2px);
            }
            .email-footer {
                background-color: #f1f5f9;
                padding: 20px;
                text-align: center;
                font-size: 14px;
                color: #6b7280;
                border-top: 1px solid #e2e8f0;
            }
            .email-footer a {
                color: #3b82f6;
                text-decoration: none;
            }
            .email-footer a:hover {
                text-decoration: underline;
            }

            /* Additional Styles Removed */
          </style>
      </head>
      <body>
          <div class="email-container">
              <!-- Header -->
              <div class="email-header">
                  <h1>Follow Up</h1>
              </div>

              <!-- Body -->
              <div class="email-body">
                  <p>Dear <strong>${firstName}</strong>,</p><br>
                  <p>Dr. <strong>${doctorName}</strong> once again kindly requests that you complete a short questionnaire to assess how your health has changed as a result of your treatment.</p><br>
                  <p>Please select the link below to begin.</p><br>
                  <a href="http://localhost/patientsurveys/dob-validation?identifier=${hashedMrNo}" class="survey-link">Complete the Survey</a>
              </div>

              <!-- Footer -->
              <div class="email-footer">
                  If you have any questions, feel free to <a href="mailto:support@wehealthify.org">Contact Us.</a><br>
                  &copy; 2024 Your Clinic. All rights reserved.
                  <div class="footer-links">
                      <p><a href="http://localhost/privacy-policy" target="_blank">Privacy Policy</a></p>
                  </div>
              </div>
          </div>
      </body>
      </html>
    `;
}


sgMail.setApiKey(process.env.SENDGRID_API_KEY);
async function sendEmail(to, emailType, speciality, formattedDatetime, hashedMrNo, firstName, doctorName ) {
    console.log("Sending email to:", to);
    console.log("Email Type:", emailType);
    console.log("Speciality:", speciality);
    console.log("Formatted Datetime:", formattedDatetime);
    console.log("Hashed MR No:", hashedMrNo);
    console.log("First Name:", firstName);
    console.log("Doctor Name:", doctorName);
    let htmlBody;
  
    // Choose the appropriate template based on the emailType
    switch (emailType) {
      case 'appointmentConfirmation':
        htmlBody = getNewAppointmentHtml(firstName, doctorName, formattedDatetime, hashedMrNo, to);
        break;
      case 'appointmentReminder':
        htmlBody = getReminderHtml(firstName, speciality, formattedDatetime, hashedMrNo, to);
        break;
      case 'postAppointmentFeedback':
        htmlBody = getFollowUpHtml(firstName, doctorName, hashedMrNo);
        break;
      default:
        throw new Error("Invalid email type");
    }
    //console.log("HTML Body generated:", htmlBody);
    const msg = {
        to: to, 
        from: 'sara@giftysolutions.com', // Change to your verified sender
        subject: 'Help Us Improve Your Care: Complete Your Health Survey',
        html: htmlBody,
    }
    try {
            console.log("In sendEmail");
            await sgMail.send(msg);
            console.log('Email sent successfully');
        } catch (error) {
            console.error("Error sending email:", error);
            throw error;
        }
}
const accountSid = 'AC67f36ac44b4203d21bb5f7ddfc9ea3ad';  // Replace with your Account SID
const authToken = '2831644b0d889a5d26b6ba2f507db929';
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER || '+17077223196';  // Replace with your Twilio Phone Number

// Twilio client initialization
const client = require('twilio')(accountSid, authToken);

// Function to send SMS
function sendSMS(to, message) {
    return client.messages.create({
        body: message,
        from: twilioPhoneNumber,  // Your Twilio phone number
        to: to                    // Recipient's phone number
    });
}

// Login route
staffRouter.get('/', (req, res) => {
    res.render('login', {
        lng: res.locals.lng,
        dir: res.locals.dir,
    });
});


function formatTo12Hour(dateInput) {
    // This is just an example formatTo12Hour. 
    // In your actual code, you might already have a different/better implementation.
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) {
        // If invalid date, just return whatever was passed
        return dateInput;
    }
    let hours = date.getHours();
    let minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month}/${day}/${year}, ${hours}:${minutesStr} ${ampm}`;
}





staffRouter.post('/data-entry/upload', upload.single("csvFile"), async (req, res) => {
    // Flags from request body
    const skip = req.body.skip === "true"; // If true, don't add found duplicates to the error list
    const validateOnly = req.body.validate_only === "true"; // If true, only validate

    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded!" });
    }

    const filePath = req.file.path;
    const originalFilename = req.file.originalname; // Original name of the uploaded file


        // --- Define Storage Paths ---
    const batchUploadStorageDir = path.join(__dirname, '../public/batch_upload_csv'); // Base directory relative to current file
    const successfulDir = path.join(batchUploadStorageDir, 'successful');
    const failedDir = path.join(batchUploadStorageDir, 'failed');
    // --- End Storage Paths ---

    // --- Database Connections (Ensure these are correctly passed via req) ---
    // Make sure req.dataEntryDB, req.manageDoctorsDB, req.adminUserDB are available
    if (!req.dataEntryDB || !req.manageDoctorsDB || !req.adminUserDB) {
        console.error("Upload Error: Database connections not found on request object.");
        await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file on DB error:", err));
        return res.status(500).json({ success: false, error: 'Internal server error: Database connection missing.' });
    }
    const patientDB = req.dataEntryDB.collection("patient_data");
    const docDBCollection = req.manageDoctorsDB.collection("doctors");
    const surveysCollection = req.manageDoctorsDB.collection("surveys");
    const hospitalsCollection = req.adminUserDB.collection("hospitals");

    // --- Session Data (Ensure session middleware is used) ---
    const hospital_code = req.session.hospital_code;
    const site_code = req.session.site_code;

    if (!hospital_code || !site_code) {
         console.error("Upload Error: Missing hospital_code or site_code in session.");
         await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file on session error:", err));
         return res.status(401).json({ success: false, error: 'User session not found or invalid. Please login again.' });
    }

        // --- Declare variables outside try for catch block access ---
    let targetDirForFile = failedDir; // Default to failed, change on success
    let finalFileName = `failed_${Date.now()}_${originalFilename}`; // Default name

    try {
        // --- Initialization ---
        const duplicates = [];
        const invalidEntries = [];
        const invalidDoctorsData = [];
        const missingDataRows = [];
        const successfullyProcessed = [];
        const recordsWithNotificationErrors = [];
        const doctorsCache = new Map();
        const validationPassedRows = []; // To store rows passing validation + their parsed date object

        // --- Header Mapping ---
        const headerMapping = {
             'MR Number': 'Mr_no', 'First Name': 'firstName', 'MiddleName (Optional)': 'middleName',
             'Last Name': 'lastName', 'Date of Birth (mm/dd/yyyy)': 'DOB',
             'Appointment Date & Time (mm/dd/yyyy , hh:mm AM/PM )': 'datetime',
             'Specialty': 'speciality', 'Doctor ID': 'doctorId', 'Phone Number': 'phoneNumber',
             'Email': 'email', 'Gender': 'gender','Diagnosis':'icd',
        };

        // --- Regex Patterns ---
        const datetimeRegex = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12][0-9]|3[01])\/(20\d{2})\s*,\s*(0?[1-9]|1[0-2]):([0-5][0-9])\s*(AM|PM|am|pm)$/;
        
        // const dobRegex = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/([12]\d{3})$/;
               const dobRegex = /^(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/([12]\d{3})$/;



        // --- Read CSV Data ---
        const csvData = await new Promise((resolve, reject) => {
             const records = [];
             fs.createReadStream(filePath)
                 .pipe(csvParser({ mapHeaders: ({ header }) => headerMapping[header] || header, skipEmptyLines: true }))
                 .on('data', (data) => records.push(data))
                 .on('end', () => resolve(records))
                 .on('error', reject);
        });

       // --- Pre-fetch Doctors & Patients ---
        const uniqueDoctorIds = new Set(csvData.map(record => record.doctorId).filter(Boolean));
        const doctors = await docDBCollection.find({ doctor_id: { $in: Array.from(uniqueDoctorIds) }, hospital_code, site_code }).toArray();
        doctors.forEach(doctor => doctorsCache.set(doctor.doctor_id, doctor));

        const uniqueMrNumbers = new Set(csvData.map(record => record.Mr_no).filter(Boolean));
        const existingPatientsArray = await patientDB.find({ Mr_no: { $in: Array.from(uniqueMrNumbers) } }).toArray();
        const existingPatients = new Map(existingPatientsArray.map(patient => [patient.Mr_no, patient]));

       // --- Fetch Site Settings ---
        const siteSettings = await hospitalsCollection.findOne({ "sites.site_code": site_code }, { projection: { "sites.$": 1, hospital_name: 1 } });
        const notificationPreference = siteSettings?.sites?.[0]?.notification_preference;
        const hospitalName = siteSettings?.hospital_name || "Your Clinic";
        console.log(`Upload Process: Notification preference for site ${site_code}: ${notificationPreference}`);

        // ==============================================================
        // --- Loop 1: VALIDATION ---
        // ==============================================================
        for (const [index, record] of csvData.entries()) {
            const rowNumber = index + 2;
            const validationErrors = [];

            const {
                 Mr_no, firstName, middleName = '', lastName, DOB, datetime,
                 speciality, // Defined with 'i'
                 doctorId, phoneNumber, email = '', gender = ''
            } = record;
            console.log(record,record);

            // 1. Missing Required Fields
            const requiredFields = ['Mr_no', 'firstName', 'lastName', 'DOB', 'datetime', 'speciality', 'doctorId', 'phoneNumber'];
            const missingFields = requiredFields.filter(field => !record[field]);
            if (missingFields.length > 0) validationErrors.push(`Missing: ${missingFields.join(', ')}`);

            // 2. Format Validation
            if (datetime && !datetimeRegex.test(datetime)) validationErrors.push('Invalid datetime format');
            if (DOB && !dobRegex.test(DOB)) validationErrors.push('Invalid DOB format');
            if (gender && !['Male', 'Female', 'Other'].includes(gender)) validationErrors.push('Invalid gender value');

            // ICD Code Validation
            const icd = record.icd?.trim();

            let codeDetail = {};
            if (icd) {
                codeDetail = codesData.find(item => item.code === icd);
                if (!codeDetail) {
                    validationErrors.push(`Invalid ICD Code - ${icd}`);
                }
            }



            // 3. Cross-Reference Validation
            const existingPatient = existingPatients.get(Mr_no);
            if (DOB && existingPatient && existingPatient.DOB !== DOB) validationErrors.push('DOB mismatch');

            const doctor = doctorsCache.get(doctorId);
            if (doctorId && !doctor) validationErrors.push(`Doctor Not Found`);
            // Ensure 'speciality' (with i) variable is used for the check
            if (speciality && !doctors.some(doc => doc.speciality === speciality)) {
                 validationErrors.push(`Specialty not found`);
            }

            // 4. Duplicate Appointment Check
            let appointmentDateObj = null;
            let formattedDatetimeStr = datetime;
            let isDuplicate = false;
            if (datetime && !validationErrors.some(e => e.includes('datetime'))) {
                 try {
                    const correctedDatetime = datetime.replace(/(\d)([APap][Mm])$/, '$1 $2');
                    const tempDate = new Date(correctedDatetime);
                     if (isNaN(tempDate.getTime())) { validationErrors.push('Invalid datetime value'); }
                     else {
                        appointmentDateObj = tempDate;
                        formattedDatetimeStr = formatTo12Hour(appointmentDateObj);
                        // Check exact duplicate
                        const exactDuplicateCheck = await patientDB.findOne({ Mr_no, "specialities": { $elemMatch: { name: speciality, timestamp: appointmentDateObj, doctor_ids: doctorId } } });
                        if (exactDuplicateCheck) {
                            isDuplicate = true; validationErrors.push('Appointment already exists');
                        } else if (existingPatient) {
                            // Check same-day duplicate
                             const dateOnly = appointmentDateObj.toLocaleDateString('en-US');
                             const hasExistingAppointmentOnDay = existingPatient.specialities?.some(spec => {
                                 const specDate = spec.timestamp ? new Date(spec.timestamp) : null;
                                 return spec.name === speciality && specDate && !isNaN(specDate.getTime()) && specDate.toLocaleDateString('en-US') === dateOnly;
                             });
                             if (hasExistingAppointmentOnDay) { isDuplicate = true; validationErrors.push('Duplicate Appointment'); }
                         }
                     }
                 } catch (dateError) { console.error(`Date Check Error Row ${rowNumber}:`, dateError); validationErrors.push('Error processing datetime'); }
            }

            // --- Categorize Errors OR Store Valid Row ---
            if (validationErrors.length > 0) {
                const validationRow = { rowNumber, ...record, validationErrors };
                if (validationErrors.some(e => e.startsWith('Missing:'))) missingDataRows.push(validationRow);
                else if (validationErrors.some(e => e.includes('Doctor') || e.includes('Specialty'))) invalidDoctorsData.push(validationRow);
                else if (isDuplicate) { if (!skip) { duplicates.push(validationRow); } } // Only add if skip flag is false
                else invalidEntries.push(validationRow); // Catches format, mismatch, etc.
            } else {
                // Row passed validation, store it for processing phase
                validationPassedRows.push({ rowNumber, record, appointmentDateObj, formattedDatetimeStr });
            }
        } // =================== End of Validation Loop ===================


        // ==============================================================
        // --- Handle validateOnly or skip flags (Early Return) ---
        // This block executes AFTER the loop if EITHER flag is true
        // ==============================================================
        if (validateOnly || skip) {
                 targetDirForFile = successfulDir; // Mark as successful for file moving
            finalFileName = `validation_${Date.now()}_${originalFilename}`;
            const validationDestPath = path.join(targetDirForFile, finalFileName);
            await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file on validate/skip:", err));
            // Return the validation summary using the structure from the old logic request
            return res.status(200).json({
                success: true,
                message: "Validation completed", // Static message as requested
                validationIssues: {
                    missingData: missingDataRows,
                    invalidDoctors: invalidDoctorsData, // Use key from old structure request
                    duplicates: duplicates,            // Contains only non-skipped duplicates found
                    invalidEntries: invalidEntries    // Use key from old structure request
                }
            });
        }


        // ==============================================================
        // --- Loop 2: PROCESS VALID RECORDS (DB Ops & Notifications) ---
        // This block only runs if validateOnly = false AND skip = false
        // ==============================================================
        for (const validRow of validationPassedRows) {
            const { rowNumber, record, appointmentDateObj, formattedDatetimeStr } = validRow;
            const {
                 Mr_no, firstName, middleName = '', lastName, DOB,
                 speciality, // Use 'speciality' (with i) consistently
                 doctorId, phoneNumber, email = '', gender = ''
            } = record;

            const existingPatient = existingPatients.get(Mr_no);
            const doctor = doctorsCache.get(doctorId);

            // ----- Start: Data Processing Logic -----
            const currentTimestamp = new Date();
            const hashedMrNo = hashMrNo(Mr_no);
            const surveyLink = `http://localhost/patientsurveys/dob-validation?identifier=${hashedMrNo}`; // Adjust domain as needed
            const patientFullName = `${firstName} ${lastName}`.trim();
            const doctorName = doctor ? `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() : 'Your Doctor';

            let updatedSurveyStatus = "Not Completed";
            let isNewPatient = !existingPatient;
            // Fix: Load existing appointment tracker
            let existingAppointmentTracker = existingPatient?.appointment_tracker || {};
            let appointment_tracker = { ...existingAppointmentTracker };

            try {
                const specialitySurveys = await surveysCollection.findOne({ specialty: speciality, hospital_code, site_code });

                if (specialitySurveys?.surveys?.length > 0) {
                    // Skip if this speciality already exists for the patient
                    if (!appointment_tracker[speciality]) {
                        let sortedSurveys = {};
                        specialitySurveys.surveys.forEach(survey => {
                            if (Array.isArray(survey.selected_months)) {
                                survey.selected_months.forEach(month => {
                                    if (!sortedSurveys[month]) sortedSurveys[month] = [];
                                    sortedSurveys[month].push(survey.survey_name);
                                });
                            }
                        });

                        let sortedMonths = Object.keys(sortedSurveys).sort((a, b) => parseInt(a) - parseInt(b));
                        let surveyTypeLabels = ["Baseline", ...sortedMonths.slice(1).map((m, i) => `Followup - ${i + 1}`)];
                        let firstAppointmentTime = new Date(appointmentDateObj);
                        let lastAppointmentTime = new Date(firstAppointmentTime);

                        appointment_tracker[speciality] = sortedMonths.map((month, index) => {
                            let trackerAppointmentTime;

                            if (index === 0) {
                                trackerAppointmentTime = new Date(firstAppointmentTime);
                            } else {
                                let previousMonth = parseInt(sortedMonths[index - 1]);
                                let currentMonth = parseInt(month);
                                if (!isNaN(previousMonth) && !isNaN(currentMonth)) {
                                    let monthDifference = currentMonth - previousMonth;
                                    trackerAppointmentTime = new Date(lastAppointmentTime);
                                    trackerAppointmentTime.setMonth(trackerAppointmentTime.getMonth() + monthDifference);
                                    lastAppointmentTime = new Date(trackerAppointmentTime);
                                } else {
                                    trackerAppointmentTime = new Date(lastAppointmentTime);
                                }
                            }

                            const formattedTrackerTime = formatTo12Hour(trackerAppointmentTime);

                            const completed_in_appointment = {};
                            if (Array.isArray(sortedSurveys[month])) {
                                sortedSurveys[month].forEach(surveyName => {
                                    completed_in_appointment[surveyName] = false;
                                });
                            }

                            return {
                                month,
                                survey_name: sortedSurveys[month],
                                surveyType: surveyTypeLabels[index],
                                appointment_time: formattedTrackerTime,
                                surveyStatus: "Not Completed",
                                completed_in_appointment
                            };
                        });
                    } else {
                        console.log(`Specialty "${speciality}" already exists, skipping appointment_time update.`);
                    }
                }
            } catch (trackerError) {
                console.error(`Tracker Error Row ${rowNumber}:`, trackerError);
            }


            // Database Operation
            let operationType = '';
            let notificationSent = false;
            let recordDataForNotification = null;

            const batch_code_date = new Date().toISOString().split('T')[0];
            try {
                if (existingPatient) {
                    operationType = 'update';
                    updatedSurveyStatus = existingPatient.surveyStatus || "Not Completed";

                    const trackerKey = (speciality || "").trim();
                    const allTrackerKeys = Object.keys(existingPatient?.appointment_tracker || {});
                    console.log(`🩺 Speciality being checked: "${trackerKey}"`);
                    console.log("📂 All tracker keys:", allTrackerKeys);

                    const trackerEntries = existingPatient?.appointment_tracker?.[trackerKey] || [];
                    const csvDatetime = appointmentDateObj; // already parsed from CSV

                    let followupDueSoonOrPassed = false;

                    for (const entry of trackerEntries) {
                        if (!entry.surveyType || !entry.appointment_time) continue;
                        if (entry.surveyType.toLowerCase().includes("baseline")) continue;

                        const apptTime = new Date(entry.appointment_time.replace(/(\d)([APap][Mm])$/, '$1 $2'));
                        if (isNaN(apptTime.getTime())) continue;

                        const sevenDaysBefore = new Date(apptTime);
                        sevenDaysBefore.setDate(apptTime.getDate() - 7);

                        console.log(`📅 Follow-up '${entry.surveyType}' scheduled on: ${apptTime}`);
                        console.log(`⏳ 7 days before: ${sevenDaysBefore}`);
                        console.log(`📌 Comparing CSV date: ${csvDatetime} >= ${sevenDaysBefore}`);

                        if (csvDatetime >= sevenDaysBefore) {
                            followupDueSoonOrPassed = true;
                            break;
                        }
                    }

                    // ✅ Split into two conditions
                    if (followupDueSoonOrPassed) {
                        updatedSurveyStatus = "Not Completed";
                        console.log(`✅ Updating surveyStatus to 'Not Completed' due to follow-up timing.`);
                    }

                    if (existingPatient.speciality !== trackerKey) {
                        updatedSurveyStatus = "Not Completed";
                        console.log(`✅ Updating surveyStatus to 'Not Completed' due to specialty mismatch (existing: "${existingPatient.speciality}", incoming: "${trackerKey}").`);
                    }

                    // Prepare update... Ensure 'speciality' (with i) is used
                    
                    let updatedSpecialities = existingPatient.specialities || [];
                    const specIdx = updatedSpecialities.findIndex(s => s.name === speciality);
                    if (specIdx !== -1) { updatedSpecialities[specIdx].timestamp = appointmentDateObj; if (!updatedSpecialities[specIdx].doctor_ids.includes(doctorId)) updatedSpecialities[specIdx].doctor_ids.push(doctorId); }
                    else { updatedSpecialities.push({ name: speciality, timestamp: appointmentDateObj, doctor_ids: [doctorId] }); }
                    const icd = record.icd?.trim();
                    let updatedDiagnosis = [];
                    if (icd) {
                        
                        const codeDetail = codesData.find(cd => cd.code === icd);
                        if (codeDetail?.description){
                            
                        updatedDiagnosis.push({ code: icd, description: codeDetail.description, date: batch_code_date, _id: new ObjectId() });}
                        
         
                    }
                    await patientDB.updateOne({ Mr_no }, { $set: { firstName, middleName, lastName, DOB, gender, datetime: formattedDatetimeStr, speciality, phoneNumber, email, specialities: updatedSpecialities, hospital_code, site_code, surveyStatus: updatedSurveyStatus, appointment_tracker, hashedMrNo, surveyLink, Codes: updatedDiagnosis }, $unset: { aiMessage: "", aiMessageGeneratedAt: "" }, $setOnInsert: { SurveySent: 0, smsLogs: [], emailLogs: [], whatsappLogs: [] } });
                    recordDataForNotification = { ...existingPatient, ...record, hashedMrNo, surveyLink, surveyStatus: updatedSurveyStatus, speciality, datetime: formattedDatetimeStr, appointment_tracker };
                } else {
                    operationType = 'insert';
                    updatedSurveyStatus = "Not Completed";
                    // Ensure 'speciality' (with i) is used
                    const icd = record.icd?.trim();
                    const codeDetail = codesData.find(cd => cd.code === icd);
                    let newDiagnosis = icd && codeDetail?.description ? [{ code: icd, description: codeDetail.description, date: batch_code_date, _id: new ObjectId()  }] : [];
                    const newRecord = { Mr_no, firstName, middleName, lastName, DOB, gender, datetime: formattedDatetimeStr, speciality, phoneNumber,Codes: newDiagnosis, email, specialities: [{ name: speciality, timestamp: appointmentDateObj, doctor_ids: [doctorId] }], hospital_code, site_code, surveyStatus: updatedSurveyStatus, hashedMrNo, surveyLink, appointment_tracker, SurveySent: 0, smsLogs: [], emailLogs: [], whatsappLogs: [] };
                    await patientDB.insertOne(newRecord);
                    recordDataForNotification = newRecord;
                }
                console.log(`CSV Upload (Process): DB ${operationType} success for ${Mr_no} (Row ${rowNumber})`);
            } catch (err) {
                 console.error(`CSV Upload (Process): DB ${operationType} error for row ${rowNumber} (MRN: ${Mr_no}):`, err);
                 // Add to invalidEntries for final report if DB fails post-validation
                 invalidEntries.push({ rowNumber, ...record, validationErrors: [`Database ${operationType} failed post-validation: ${err.message}`] });
                 continue; // Skip notification attempts if DB failed
            }

            // Conditional Notification Logic
            if (recordDataForNotification) {
                let notificationErrorOccurred = false;
                const prefLower = notificationPreference?.toLowerCase();

                if (prefLower === 'none') { /* Log skip */ }
                else if (prefLower === 'third_party_api') { 
                    // ***** ADD THE FOLLOWING CODE SNIPPET HERE *****
                console.log(`[MockAuthComm] Preparing to send data for CSV record (Row ${rowNumber}, MRN: ${Mr_no}) to mock server.`);

                // Construct the payload for the mock server
                // Ensure all these variables are correctly defined in your loop's scope
                const payloadForMockServer = {
                    patientMrNo: recordDataForNotification.Mr_no || Mr_no,
                    patientFullName: `${recordDataForNotification.firstName || firstName} ${recordDataForNotification.lastName || lastName}`.trim(),
                    doctorFullName: doctorName, // Ensure doctorName is defined (e.g., from doctorsCache)
                    appointmentDatetime: formattedDatetimeStr, // This should be the formatted appointment date/time for the record
                    hospitalName: hospitalName, // You fetch this from siteSettings
                    hashedMrNo: recordDataForNotification.hashedMrNo || hashedMrNo, // Ensure this is the hashed MRN
                    surveyLink: recordDataForNotification.surveyLink || surveyLink, // Ensure this is defined
                    speciality: recordDataForNotification.speciality || speciality,
                    phoneNumber: recordDataForNotification.phoneNumber || phoneNumber,
                    email: recordDataForNotification.email || email,
                    gender: recordDataForNotification.gender || gender,
                    icdCode: record.icd, // From the original CSV record, if it exists
                    isNewPatient: isNewPatient, // You determine this based on existingPatient
                    sourceSystemRecordId: null, // Or some unique ID if your CSV rows have one, or DB record ID
                    uploadSource: 'csv_batch_upload',
                    csvRowNumber: rowNumber,
                    notificationPreferenceUsed: notificationPreference // The site's preference
                };

                // Asynchronously send data to the mock server
                sendAppointmentDataToMockServer(payloadForMockServer).catch(err => {
                    console.error(`[MockAuthComm] Background send error for CSV Row ${rowNumber} (MRN: ${Mr_no}):`, err);
                });
                 }
                else if (notificationPreference) {
                    let smsMessage; let emailType = null;
                    let shouldSendSurveyLink = recordDataForNotification.surveyStatus === "Not Completed";
                    if (shouldSendSurveyLink) { /* Construct messages with link */
                        smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetimeStr} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;
                        emailType = 'appointmentConfirmation';
                    } else { /* Construct messages without link */
                        smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetimeStr} has been recorded.`;
                    }

                    // --- Attempt SMS ---
                    if ((prefLower === 'sms' || prefLower === 'both') && smsMessage && recordDataForNotification.phoneNumber) {
                        try { const smsResult = await sendSMS(recordDataForNotification.phoneNumber, smsMessage); await patientDB.updateOne({ Mr_no }, { $push: { smsLogs: { type: "upload_creation", speciality, timestamp: new Date(), sid: smsResult.sid } }, $inc: { SurveySent: 1 } }); notificationSent = true; }
                        catch (smsError) { console.error(`SMS error Row ${rowNumber}: ${smsError.message}`); notificationErrorOccurred = true; }
                    }
                    // --- Attempt Email ---
                    if ((prefLower === 'email' || prefLower === 'both') && recordDataForNotification.email && emailType) {
                       try { await sendEmail(recordDataForNotification.email, emailType, speciality, formattedDatetimeStr, recordDataForNotification.hashedMrNo, recordDataForNotification.firstName, doctorName); await patientDB.updateOne({ Mr_no }, { $push: { emailLogs: { type: "upload_creation", speciality, timestamp: new Date() } }, $inc: { SurveySent: 1 } }); notificationSent = true; }
                       catch (emailError) { console.error(`Email error Row ${rowNumber}: ${emailError.message}`); notificationErrorOccurred = true; }
                   }
                   // --- Attempt WhatsApp ---
                   if (prefLower === 'whatsapp' || prefLower === 'both') {
                       const accountSid = process.env.TWILIO_ACCOUNT_SID, authToken = process.env.TWILIO_AUTH_TOKEN, twilioWhatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER, twilioTemplateSid = process.env.TWILIO_TEMPLATE_SID;
                       if (accountSid && authToken && twilioWhatsappNumber && twilioTemplateSid && recordDataForNotification.phoneNumber) {
                           try { const client=twilio(accountSid, authToken); const placeholders={ 1: patientFullName, 2: doctorName, 3: formattedDatetimeStr, 4: hospitalName, 5: hashedMrNo }; let fmtPhone = recordDataForNotification.phoneNumber; if (!fmtPhone.startsWith('whatsapp:')) fmtPhone=`whatsapp:${fmtPhone}`; const msg=await client.messages.create({ from: twilioWhatsappNumber, to: fmtPhone, contentSid: twilioTemplateSid, contentVariables: JSON.stringify(placeholders), statusCallback: 'http://localhost/whatsapp-status-callback' }); await patientDB.updateOne({ Mr_no }, { $push: { whatsappLogs: { type: "upload_creation", speciality, timestamp: new Date(), sid: msg.sid } }, $inc: { SurveySent: 1 } }); notificationSent = true; }
                           catch (twilioError) { console.error(`WhatsApp error Row ${rowNumber}: ${twilioError.message}`); notificationErrorOccurred = true; }
                       } else { console.warn(`WhatsApp skipped Row ${rowNumber}: Config/phone missing.`); }
                   }
                } else { /* Log invalid/missing preference */ }

                // Track Final Status
                if (notificationErrorOccurred) { recordsWithNotificationErrors.push({ rowNumber, Mr_no, operationType, error: "Notification failed" }); }
                else { successfullyProcessed.push({ rowNumber, Mr_no, operationType, notificationSent }); }
            }
            // ----- End: Data Processing Logic -----

        } // --- End of Processing Loop ---


        // --- Final Response (only if !validateOnly && !skip) ---
        // await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp CSV file post-processing:", err));
                // --- MOVE FILE on Success ---
        targetDirForFile = successfulDir; // Mark as successful for file moving
        finalFileName = `success_${Date.now()}_${originalFilename}`;
        const successDestPath = path.join(targetDirForFile, finalFileName);
        try {
            await fsPromises.mkdir(targetDirForFile, { recursive: true }); // Ensure dir exists
            await fsPromises.rename(filePath, successDestPath); // Move the file
            console.log(`CSV Upload (Success): Moved temp file to ${successDestPath}`);
        } catch (moveError) {
            console.error(`CSV Upload (Success): Error moving temp file ${filePath} to ${successDestPath}:`, moveError);
            // If move fails, attempt to delete the original temp file as a fallback cleanup
            await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file after failed move on success:", err));
        }
        // --- End MOVE FILE ---

        // Recalculate total issues based on arrays populated during validation
        const totalValidationIssues = missingDataRows.length + invalidDoctorsData.length + duplicates.length + invalidEntries.length;
        const uploadedCount = successfullyProcessed.length;
        const skippedRecords = totalValidationIssues; // All validation issues are skipped records
        const totalRecords = csvData.length;
        
        const responseMessage = `Upload processed. ${uploadedCount} records processed successfully. ${recordsWithNotificationErrors.length} had notification errors. ${skippedRecords} validation issues found and skipped processing.`;
        
        const uploadsDir = path.join(__dirname, '../public/uploads');
        if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true }); // Create folder if missing
        }
        const outputFileName = `batch_upload_results_${Date.now()}.xlsx`;
        const outputFilePath = path.join(__dirname, '../public/uploads/', outputFileName); // Ensure folder exists

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Processed Patients');

        // Define headers
        sheet.columns = [
        { header: 'Row #', key: 'rowNumber', width: 10 },
        { header: 'MR Number', key: 'Mr_no', width: 15 },
        { header: 'First Name', key: 'firstName', width: 15 },
        { header: 'Last Name', key: 'lastName', width: 15 },
        { header: 'Phone Number', key: 'phoneNumber', width: 15 },
        { header: 'Survey Link', key: 'surveyLink', width: 50 },
        { header: 'Notification Sent', key: 'notificationSent', width: 18 },
        ];

        // Populate rows
        for (const row of successfullyProcessed) {
        const patient = csvData[row.rowNumber - 2]; // original CSV record
        sheet.addRow({
            rowNumber: row.rowNumber,
            Mr_no: row.Mr_no,
            firstName: patient.firstName,
            lastName: patient.lastName,
            phoneNumber: patient.phoneNumber,
            surveyLink: `http://localhost/patientsurveys/dob-validation?identifier=${hashMrNo(row.Mr_no)}`,
            operationType: row.operationType,
            notificationSent: row.notificationSent ? 'Yes' : 'No',
        });
        }

        // Write file to disk
        await workbook.xlsx.writeFile(outputFilePath);
        req.session.processedExcelFile = outputFileName;

        return res.status(200).json({
            success: true,
            message: responseMessage,
            uploadedCount: uploadedCount,  // Match frontend expectation
            skippedRecords: skippedRecords,  // Match frontend expectation
            totalRecords: totalRecords,  // Match frontend expectation
            notificationErrorsCount: recordsWithNotificationErrors.length,
            downloadUrl: `/data-entry/download-latest`,
            details: {
                processed: successfullyProcessed,
                notificationErrors: recordsWithNotificationErrors,
                validationIssues: {
                    missingData: missingDataRows,
                    invalidDoctorsOrSpecialty: invalidDoctorsData,
                    duplicates: duplicates,
                    invalidFormatOrData: invalidEntries
                }
            }
        });
    } catch (error) { // --- Catch Block (Overall Failure) ---
        console.error("Error processing CSV upload:", error); // Log the actual error

        // --- MOVE FILE on Failure --- (targetDirForFile is already 'failedDir' by default)
        const failedDestPath = path.join(targetDirForFile, finalFileName); // Use default name/path

        if (filePath && originalFilename) { // Check if filePath was determined before error
             try {
                 await fsPromises.mkdir(targetDirForFile, { recursive: true }); // Ensure dir exists
                 await fsPromises.rename(filePath, failedDestPath); // Move the file
                 console.log(`CSV Upload (Failure): Moved temp file to ${failedDestPath}`);
             } catch (moveError) {
                 console.error(`CSV Upload (Failure): Error moving temp file ${filePath} to ${failedDestPath}:`, moveError);
                 // Attempt deletion of temp file if move fails
                 await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file after failed move on main error:", err));
             }
        } else {
             console.error("CSV Upload (Failure): Could not move file as filePath or originalFilename was not available.");
             // Try to delete if filePath exists but move wasn't attempted (e.g., error before filePath assigned)
             if (filePath) {
                 await fsPromises.unlink(filePath).catch(err => console.error("Error deleting temp file on main error (no move attempted):", err));
             }
        }
        // --- End MOVE FILE ---

        return res.status(500).json({
            success: false,
            error: "An unexpected error occurred during CSV processing.", // Generic error for client
            details: error.message // Log details server-side, maybe hide from client in prod
        });
    }
});

staffRouter.get('/data-entry/download-latest', (req, res) => {
    const fileName = req.session.processedExcelFile;
    if (!fileName) return res.status(404).send("No processed file available.");
    const filePath = path.join(__dirname, '../public/uploads/', fileName);
    res.download(filePath, fileName);
});

let codesData = [];
const codesFilePath = path.join(__dirname, 'public','codes.json');
try {
  const fileData = fs.readFileSync(codesFilePath, 'utf-8');
  codesData = JSON.parse(fileData);
} catch (error) {
  console.error("Error reading codes JSON file:", error);
}

// staffRouter.get('/codes', (req, res) => {
//     const { page = 1, limit = 50, searchTerm = '' } = req.query;
  
//     try {
//       let filteredCodes;
  
//       // If there's no searchTerm or it's shorter than 3 characters, show ALL codes
//       if (!searchTerm || searchTerm.length < 3) {
//         filteredCodes = codesData;
//       } else {
//         // Otherwise, filter based on case-insensitive match of the description
//         filteredCodes = codesData.filter(item =>
//           item.description.toLowerCase().includes(searchTerm.toLowerCase())
//         );
//       }
  
//       // Paginate the results
//       const startIndex = (page - 1) * limit;
//       const paginatedCodes = filteredCodes.slice(startIndex, startIndex + Number(limit));
  
//       res.json(paginatedCodes);
//     } catch (error) {
//       console.error('Error fetching codes:', error);
//       res.status(500).send('Internal Server Error');
//     }
//   });


staffRouter.get('/codes', (req, res) => {
    const { page = 1, limit = 50, searchTerm = '' } = req.query;
  
    try {
      let filteredCodes;
  
      if (!searchTerm || searchTerm.length < 3) {
        filteredCodes = codesData;
      } else {
        const lowerTerm = searchTerm.toLowerCase();
        filteredCodes = codesData.filter(item =>
          item.code.toLowerCase().includes(lowerTerm) ||
          item.description.toLowerCase().includes(lowerTerm)
        );
      }
  
      const startIndex = (page - 1) * limit;
      const paginatedCodes = filteredCodes.slice(startIndex, startIndex + Number(limit));
  
      res.json(paginatedCodes);
    } catch (error) {
      console.error('Error fetching codes:', error);
      res.status(500).send('Internal Server Error');
    }
  });

staffRouter.post('/whatsapp-status-callback', (req, res) => {
    const { MessageSid, MessageStatus, To, From, ErrorCode, ErrorMessage } = req.body;

    console.log('WhatsApp message status update:');
    console.log('Message SID:', MessageSid);
    console.log('Status:', MessageStatus);
    console.log('To:', To);
    console.log('From:', From);
    if (ErrorCode) {
        console.error('Error Code:', ErrorCode);
        console.error('Error Message:', ErrorMessage);
    }

    // Optional: Save this info to your DB for tracking
    
    res.sendStatus(200);
});

// Redirect from blank-page to home
staffRouter.get('/blank-page', (req, res) => {
    // Use a 301 redirect for permanent redirection
    res.redirect(301, basePath + '/home');
});

staffRouter.get('/home', async (req, res) => {
    try {
        const hospital_code = req.session.hospital_code; 
        const site_code = req.session.site_code;
        const username = req.session.username; // Assuming username is stored in session
        const basePath = req.baseUrl || '/staff'; // Define basePath here
        
        if (!hospital_code || !site_code || !username) {
            return res.redirect(basePath); 
        }

        // Get the doctor information
        const doctor = await req.manageDoctorsDB.collection('staffs').findOne({ username });



        if (!doctor) {
            return res.status(404).send('Doctor not found');
        }

        // Get patients data from the database filtered by hospital_code and site_code
        const patients = await req.dataEntryDB.collection('patient_data').find({ hospital_code, site_code }).toArray();

        const siteSettings = await req.adminUserDB.collection('hospitals').findOne(
            { "sites.site_code": site_code },
            { projection: { "sites.$": 1 } }
        );

        const notificationPreference = siteSettings?.sites?.[0]?.notification_preference?.toLowerCase() || 'none';

        res.render('home', {
            patients,
            doctor,
            notificationPreference,
            lng: res.locals.lng,
            dir: res.locals.dir,
            basePath: basePath  // Pass basePath to template
        });


    } catch (error) {
        console.error('Error fetching patients data:', error);
        res.status(500).send('Internal Server Error');
    }
});


staffRouter.post('/delete-appointment', async (req, res) => {
    const db = req.dataEntryDB;
    const { Mr_no } = req.body;
    const hospital_code = req.session.hospital_code;
    const site_code = req.session.site_code;
    const username = req.session.username;
    const basePath = req.baseUrl || '/staff'; // Use req.baseUrl for the base path
    
    try {
        const query = { 
            Mr_no,
            hospital_code,
            site_code 
        };
        
        const result = await db.collection('patient_data').deleteOne(query);
        
        if (result.deletedCount === 1) {
            req.flash('successMessage', `Patient with MR No. ${Mr_no} deleted successfully.`);
        } else {
            req.flash('errorMessage', `Patient with MR No. ${Mr_no} not found or already deleted.`);
        }
        
        return res.redirect(`${basePath}/home`);
    } catch (error) {
        console.error('Error during delete operation:', error);
        req.flash('errorMessage', 'An internal error occurred while deleting the patient record.');
        return res.redirect(`${basePath}/home`);
    }
});





staffRouter.post('/login', async (req, res) => {
    const staffDB = req.manageDoctorsDB.collection('staffs');
    const { username, password } = req.body;

    try {
        const staff = await staffDB.findOne({ username });

        if (!staff) {
            req.flash('errorMessage', 'Invalid username or password');
            return res.redirect(basePath);
        }

        // Check if account is locked first
        if (staff.isLocked) {
            req.flash('errorMessage', 'Your account is locked due to multiple failed login attempts. Please contact admin.');
            return res.redirect(basePath);
        }

        // Decrypt and compare password
        const decryptedPassword = decrypt(staff.password);
        
        if (decryptedPassword === password) {
            // Successful login
            if (staff.loginCounter === 0 || staff.passwordChangedByAdmin) {
                // Store minimal user info in session
                req.session.username = staff.username;
                req.session.hospital_code = staff.hospital_code;
                req.session.site_code = staff.site_code;
                
                // Update login counter and reset failed attempts
                await staffDB.updateOne(
                    { username },
                    { 
                        $set: { 
                            failedLogins: 0,
                            lastLogin: new Date()
                        },
                        $inc: { loginCounter: 1 }
                    }
                );

                return res.redirect(basePath + '/reset-password');
            }

            // Regular successful login
            await staffDB.updateOne(
                { username },
                { 
                    $set: { 
                        failedLogins: 0,
                        lastLogin: new Date()
                    },
                    $inc: { loginCounter: 1 }
                }
            );

            // Set session data
            req.session.username = staff.username;
            req.session.hospital_code = staff.hospital_code;
            req.session.site_code = staff.site_code;
            req.session.loginTime = new Date().toISOString();

            // Log the login activity
            const loginLogData = `username: ${staff.username}, timestamp: ${req.session.loginTime}, hospital_code: ${staff.hospital_code}, site_code: ${staff.site_code}, action: login`;
            writeLog('user_activity_logs.txt', loginLogData);

            return res.redirect(basePath + '/home');
        } else {
            // Failed login attempt
            const currentFailedLogins = (staff.failedLogins || 0) + 1;
            const updateData = {
                $set: { failedLogins: currentFailedLogins }
            };

            if (currentFailedLogins >= 3) {
                updateData.$set.isLocked = true;
                await staffDB.updateOne({ username }, updateData);
                req.flash('errorMessage', 'Your account is locked due to multiple failed login attempts. Please contact admin.');
            } else {
                await staffDB.updateOne({ username }, updateData);
                req.flash('errorMessage', `Invalid password. ${3 - currentFailedLogins} attempt(s) left.`);
            }

            return res.redirect(basePath);
        }

    } catch (error) {
        console.error('Error during login:', error);
        const logError = `Error during login for username ${username}: ${error.message}`;
        writeLog('error.log', logError);
        req.flash('errorMessage', 'Internal server error. Please try again later.');
        return res.redirect(basePath);
    }
});

staffRouter.get('/logout', (req, res) => {
    if (req.session && req.session.username && req.session.hospital_code && req.session.loginTime) {
        const { username, hospital_code, loginTime } = req.session;
        const logoutTime = new Date();

        // Ensure loginTime is a valid date
        const loginTimestamp = new Date(loginTime);
        const sessionDuration = (logoutTime - loginTimestamp) / 1000; // Duration in seconds

        // Log the logout activity and session duration
        const logoutLogData = `username: ${username}, timestamp: ${logoutTime.toISOString()}, hospital_code: ${hospital_code}, action: logout, session_duration: ${sessionDuration} seconds`;
        writeLog('user_activity_logs.txt', logoutLogData);
    }

    // Destroy the session and redirect to login page
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        res.redirect(basePath);
    });
});


staffRouter.get('/reset-password', (req, res) => {
    // Check if the user is logged in and has a valid session
    if (!req.session.username) {
        req.flash('errorMessage', 'You must be logged in to reset your password.');
        return res.redirect(basePath);
    }

    // Render the reset password page
    res.render('reset-password', {
        success_msg: req.flash('successMessage'),
        error_msg: req.flash('errorMessage'),
        lng: res.locals.lng,
        dir: res.locals.dir,
    });
});

staffRouter.post('/reset-password', async (req, res) => {
    const doctorsDB = req.manageDoctorsDB.collection('staffs');
    const { newPassword, confirmPassword } = req.body;

    // Validate that passwords match
    if (newPassword !== confirmPassword) {
        req.flash('errorMessage', 'Passwords do not match.');
        return res.redirect(basePath+'/reset-password');
    }

    // Encrypt the new password
    const encryptedPassword = encrypt(newPassword);

    try {
        // Update password and reset loginCounter to 1
        await doctorsDB.updateOne(
            { username: req.session.username },
            { 
                $set: { password: encryptedPassword, loginCounter: 1,passwordChangedByAdmin:false }  // Set loginCounter to 1 after password reset
            }
        );
        
        req.flash('successMessage', 'Password updated successfully.');
        res.redirect(basePath+'/home');
    } catch (error) {
        console.error('Error resetting password:', error);
        req.flash('errorMessage', 'Internal server error. Please try again later.');
        res.redirect(basePath+'/reset-password');
    }
});


staffRouter.get('/data-entry', async (req, res) => {
    // Check if required session variables are set; if not, redirect to basePath
    const hospital_code = req.session.hospital_code;
    const site_code = req.session.site_code;
    const username = req.session.username;

    if (!hospital_code || !site_code || !username) {
        return res.redirect(basePath); // Redirect to basePath if any session variable is missing
    }

    try {
        // Retrieve specialties and doctor information
        const specialities = await req.manageDoctorsDB.collection('surveys').distinct('specialty');
        const doctor = await req.manageDoctorsDB.collection('staffs').findOne({ username });

        res.render('data-entry', {
            specialities: specialities.filter(speciality => speciality !== 'STAFF'),
            hospital_code,
            site_code,
            doctor,
            lng: res.locals.lng,
            dir: res.locals.dir,
        });
    } catch (error) {
        console.error('Error:', error);
        res.render('data-entry', {
            specialities: [],
            hospital_code,
            site_code,
            doctor: null,
            lng: res.locals.lng,
            dir: res.locals.dir,
        });
    }
});
function validateSession(req, res, next) {
    const hospital_code = req.session.hospital_code;
    const site_code = req.session.site_code;
    const username = req.session.username;

    if (!hospital_code || !site_code || !username) {
        return res.redirect(basePath); // Redirect to basePath if any session variable is missing
    }

    // Attach session variables to res.locals for easy access in views and route handlers
    res.locals.hospital_code = hospital_code;
    res.locals.site_code = site_code;
    res.locals.username = username;

    next(); // Proceed to the next middleware or route handler
}

module.exports = validateSession;




staffRouter.get('/edit-appointment', validateSession, async (req, res) => {
    const hashedMrNo = req.query.Mr_no;

    const hospital_code = req.session.hospital_code; 
        const site_code = req.session.site_code;
        const username = req.session.username; 
        if (!hospital_code || !site_code || !username) {
            return res.redirect(basePath); // Redirect to basePath if any session variable is missing
        }

    try {
        // Fetch patient data from the database using MR number
        const patient = await req.dataEntryDB.collection('patient_data').findOne({ hashedMrNo:hashedMrNo });

        if (!patient) {
            return res.status(404).send('Patient not found');
        }

        // Fetch doctor information from the 'staffs' collection
        const doctor = await req.manageDoctorsDB.collection('staffs').findOne({ username });

        if (!doctor) {
            console.warn(`Doctor with username "${username}" not found.`);
            // Depending on your application's requirements, you might:
            // - Redirect to an error page
            // - Render the view without doctor information
            // - Throw an error
            // Here, we'll proceed without the doctor information
        }

        // Render the edit-appointment view with the patient and doctor data
        res.render('edit-appointment', {
            patient: {
                mrNo: patient.Mr_no,
                firstName: patient.firstName || '',
                middleName: patient.middleName || '',
                lastName: patient.lastName || '',
                DOB: patient.DOB,
                phoneNumber: patient.phoneNumber,
                datetime: patient.datetime,
                speciality: patient.speciality,
            },
            doctor, // Pass the doctor data to the view
            successMessage: req.flash('successMessage'),
            errorMessage: req.flash('errorMessage'),
            lng: res.locals.lng,
            dir: res.locals.dir,
            hospital_code: res.locals.hospital_code, // If needed in the view
            site_code: res.locals.site_code,
            username: res.locals.username,
        });
    } catch (error) {
        console.error('Error fetching patient or doctor data:', error);
        res.status(500).send('Internal Server Error');
    }
});



staffRouter.post('/api-edit', async (req, res) => {
    const db = req.dataEntryDB;
    const manageDoctorsDB = req.manageDoctorsDB; // Get manageDoctorsDB from req

    // Get necessary data from request body and session first
    const { mrNo, firstName, middleName, lastName, DOB, datetime, speciality, phoneNumber } = req.body;
    const hospital_code = req.session.hospital_code;
    const username = req.session.username; // Needed to fetch doctor info if re-rendering

    // --- START: SERVER-SIDE VALIDATION ---
    if (!DOB) { // Check if DOB is empty or missing
        console.error(`Validation Error: DOB is empty for MRN ${mrNo}`);
        req.flash('errorMessage', 'Date of Birth cannot be empty.');

        // Need to fetch patient and doctor data again to re-render the form correctly
        try {
            const patientData = await db.collection('patient_data').findOne({ Mr_no: mrNo });
            const doctorData = await manageDoctorsDB.collection('staffs').findOne({ username });

            if (!patientData) {
                 // If patient not found during re-render attempt, send a generic error
                 req.flash('errorMessage', 'Patient not found. Cannot reload edit form.');
                 return res.redirect(basePath + '/home'); // Or another suitable page
            }

            return res.render('edit-appointment', {
                patient: { // Map data back to the structure expected by the EJS template
                    mrNo: patientData.Mr_no,
                    firstName: patientData.firstName,
                    middleName: patientData.middleName,
                    lastName: patientData.lastName,
                    DOB: patientData.DOB, // Use original DOB
                    phoneNumber: patientData.phoneNumber,
                    datetime: patientData.datetime, // Use original datetime
                    speciality: patientData.speciality // Use original speciality
                },
                doctor: doctorData,
                successMessage: '', // No success message
                errorMessage: req.flash('errorMessage'), // Show the specific error
                lng: res.locals.lng,
                dir: res.locals.dir,
                hospital_code: hospital_code,
                site_code: req.session.site_code, // Get site_code from session
                username: username,
                basePath: basePath // Pass basePath if needed in template links
            });
        } catch (renderError) {
            console.error("Error fetching data for re-rendering edit form:", renderError);
            req.flash('errorMessage', 'An error occurred while reloading the form.');
            return res.redirect(basePath + '/home'); // Redirect to a safe page on error
        }
    }
    // --- END: SERVER-SIDE VALIDATION ---

    // If DOB validation passed, proceed with the update logic
    try {
        const collection = db.collection('patient_data');
        const formattedDatetime = formatTo12Hour(datetime);

        console.log('mrNo:', mrNo);
        console.log('req.body (validated):', req.body);

        const result = await collection.updateOne(
            { Mr_no: mrNo },
            {
                $set: {
                    firstName,
                    middleName,
                    lastName,
                    DOB, // Now we know DOB has a value
                    datetime: formattedDatetime,
                    speciality,
                    phoneNumber,
                    hospital_code // Include hospital_code from session if needed
                }
            }
        );

        if (result.matchedCount === 0) {
            // This case should ideally not happen if the user came from the edit page,
            // but handle it just in case.
            req.flash('errorMessage', 'Patient with MR Number ' + mrNo + ' not found during update.');
            console.error(`Update Error: Patient ${mrNo} not found.`);
             // Redirect to a page where the user can see the error
            return res.redirect(basePath + '/home');
        }

        // Fetch data needed to render the page *after* successful update
        const updatedPatient = await collection.findOne({ Mr_no: mrNo });
        const doctor = await manageDoctorsDB.collection('staffs').findOne({ username });

        if (!updatedPatient) { // Should not happen if update succeeded, but check anyway
             req.flash('errorMessage', 'Failed to fetch updated patient data.');
             return res.redirect(basePath + '/home');
        }

        // Set success flash message
        req.flash('successMessage', 'Patient data updated successfully.');

        // Re-render the edit page with the success message and updated data
        // OR redirect to the dashboard page with the success message
        // Redirecting is often simpler after a successful update.
        return res.redirect(`${basePath}/edit-appointment?Mr_no=${updatedPatient.hashedMrNo}`);
        // If you prefer to re-render the edit page:
        /*
        return res.render('edit-appointment', {
             patient: {
                 mrNo: updatedPatient.Mr_no,
                 firstName: updatedPatient.firstName,
                 middleName: updatedPatient.middleName,
                 lastName: updatedPatient.lastName,
                 DOB: updatedPatient.DOB,
                 phoneNumber: updatedPatient.phoneNumber,
                 datetime: updatedPatient.datetime,
                 speciality: updatedPatient.speciality,
             },
             doctor,
             successMessage: req.flash('successMessage'),
             errorMessage: '', // Clear any previous errors
             lng: res.locals.lng,
             dir: res.locals.dir,
             // Include other necessary variables like basePath, hospital_code, etc.
         });
        */

    } catch (error) { // Catch errors during the database update or subsequent fetches
        const timestamp = new Date().toISOString();
        const errorData = `ErrorType: ${error.message}, timestamp: ${timestamp}, username: ${username}, hospital_code: ${hospital_code}, mrNo: ${mrNo}`;
        writeLog('error_logs.txt', errorData); // Log the error

        console.error('Error during API edit process:', error);
        req.flash('errorMessage', 'An internal server error occurred while updating patient data.');
         // Redirect to a page where the user can see the error
        return res.redirect(basePath + '/edit-appointment?Mr_no=' + hashMrNo(mrNo)); // Redirect back to edit page with error
    }
});



let mockServerAccessToken = null;
let mockServerRefreshToken = null;
let mockServerAccessTokenExpiresAt = 0;

// 4. Helper Function: Generate Signature for Mock Auth Server
function generateSignatureForMockServer(timestamp, secret) {
    return crypto.createHash('sha256').update(timestamp + secret).digest('hex');
}

// 5. Helper Function: Fetch JWT Token from Mock Auth Server
async function fetchMockServerJwtToken() {
    console.log('[MockAuthComm] Attempting to fetch JWT token from mock server...');
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = generateSignatureForMockServer(timestamp, MOCK_AUTH_CLIENT_SECRET);

    const authPayload = {
        clientId: MOCK_AUTH_CLIENT_ID,
        signature: signature,
        timestamp: timestamp,
    };

    try {
        const response = await axios.get(`${MOCK_AUTH_SERVER_BASE_URL}/services/fetch_jwt_token`, {
            headers: {
                'Authorization': JSON.stringify(authPayload),
            },
        });

        if (response.data.code === 200 && response.data.data) {
            mockServerAccessToken = response.data.data.access_token;
            mockServerRefreshToken = response.data.data.refresh_token;
            mockServerAccessTokenExpiresAt = Date.now() + (parseInt(response.data.data.access_token_expires_in, 10) * 1000);
            console.log('[MockAuthComm] Successfully fetched tokens from mock server.');
            return true;
        } else {
            console.error('[MockAuthComm] Failed to fetch tokens from mock server:', response.data.message || 'Unknown error');
            return false;
        }
    } catch (error) {
        console.error('[MockAuthComm] Error fetching JWT token from mock server:', error.response ? error.response.data : error.message);
        return false;
    }
}

// 6. Helper Function: Refresh Access Token from Mock Auth Server
async function refreshMockServerAccessToken() {
    if (!mockServerRefreshToken) {
        console.error('[MockAuthComm] No refresh token available for mock server.');
        return false;
    }
    console.log('[MockAuthComm] Attempting to refresh access token from mock server...');
    try {
        const response = await axios.get(`${MOCK_AUTH_SERVER_BASE_URL}/services/refresh_access_token`, {
            headers: {
                'Authorization': mockServerRefreshToken,
            },
        });

        if (response.data.code === 200 && response.data.data) {
            mockServerAccessToken = response.data.data.access_token;
            mockServerRefreshToken = response.data.data.refresh_token; // Get the new refresh token
            mockServerAccessTokenExpiresAt = Date.now() + (parseInt(response.data.data.access_token_expires_in, 10) * 1000);
            console.log('[MockAuthComm] Successfully refreshed tokens from mock server.');
            return true;
        } else {
            console.error('[MockAuthComm] Failed to refresh tokens from mock server:', response.data.message || 'Unknown error');
            mockServerAccessToken = null; // Invalidate
            return false;
        }
    } catch (error) {
        console.error('[MockAuthComm] Error refreshing access token from mock server:', error.response ? error.response.data : error.message);
        mockServerAccessToken = null; // Invalidate
        return false;
    }
}

// 7. Helper Function: Ensure a valid token is available (fetches or refreshes)
async function ensureValidMockServerToken() {
    const bufferTime = 30 * 1000; // 30 seconds buffer before expiry
    if (!mockServerAccessToken || mockServerAccessTokenExpiresAt < (Date.now() + bufferTime)) {
        console.log('[MockAuthComm] Access token missing or expired/nearing expiry.');
        let refreshed = false;
        if (mockServerRefreshToken) {
            refreshed = await refreshMockServerAccessToken();
        }
        if (!refreshed) {
            console.log('[MockAuthComm] Refresh failed or no refresh token, fetching new token set.');
            return await fetchMockServerJwtToken();
        }
        return refreshed;
    }
    return true; // Token is still valid
}

// 8. Main Function to Send Data to Mock Auth Server's New Endpoint
async function sendAppointmentDataToMockServer(appointmentData) {
    console.log('[MockAuthComm] Preparing to send appointment data to mock server:', appointmentData);

    const hasValidToken = await ensureValidMockServerToken();
    if (!hasValidToken || !mockServerAccessToken) {
        console.error('[MockAuthComm] No valid access token for mock server. Aborting data send.');
        return; // Or throw an error / handle appropriately
    }

    try {
        // *** THIS WILL BE A NEW ENDPOINT ON YOUR MOCK_AUTH_SERVER.JS ***
        const response = await axios.post(
            `${MOCK_AUTH_SERVER_BASE_URL}/api/v1/external_appointment_data`, // New endpoint
            appointmentData,
            {
                headers: {
                    'Authorization': `Bearer ${mockServerAccessToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );
        console.log('[MockAuthComm] Successfully sent data to mock server. Response:', response.data);
    } catch (error) {
        console.error('[MockAuthComm] Error sending data to mock server:', error.response ? error.response.data : error.message);
        // Optionally, if it's an auth error (401), you might try to clear the token and retry once,
        // or just log and move on. For now, we'll just log.
        if (error.response && error.response.status === 401) {
            mockServerAccessToken = null; // Force re-auth on next attempt
        }
    }
}






staffRouter.post('/api/data', async (req, res) => {
    const db = req.dataEntryDB;
    const adminDB = req.adminUserDB;
    const docDB = req.manageDoctorsDB;

    try {
        const { Mr_no, firstName, middleName, lastName, DOB, datetime, phoneNumber, email, gender,codes,code_date } = req.body;
        console.log("code_date",code_date);
        const hospital_code = req.session.hospital_code;
        const site_code = req.session.site_code;

        // Extract speciality and doctorId from the combined field
        const [speciality, doctorId] = req.body['speciality-doctor'].split('||');

        // --- Start: Input Validation ---
        if (!Mr_no || !firstName || !lastName || !DOB || !datetime || !phoneNumber || !speciality || !doctorId) {
            let missingFields = [];
            if (!Mr_no) missingFields.push('MR Number');
            if (!firstName) missingFields.push('First Name');
            if (!lastName) missingFields.push('Last Name');
            if (!DOB) missingFields.push('Date of Birth');
            if (!datetime) missingFields.push('Appointment Date & Time');
            if (!phoneNumber) missingFields.push('Phone Number');
            if (!speciality || !doctorId) missingFields.push('Speciality & Doctor');

            req.flash('errorMessage', `Missing required fields: ${missingFields.join(', ')}.`);
            console.error('Validation Error:', `Missing required fields: ${missingFields.join(', ')}.`);
            return res.redirect(basePath + '/data-entry');
        }
         // Validate datetime format more strictly if needed before creating Date object
        const appointmentDateObj = new Date(datetime.replace(/(\d)([APap][Mm])$/, '$1 $2'));
        if (isNaN(appointmentDateObj.getTime())) {
            req.flash('errorMessage', 'Invalid Appointment Date & Time format.');
            console.error('Validation Error:', 'Invalid Appointment Date & Time format.');
            return res.redirect(basePath + '/data-entry');
        }
        // --- End: Input Validation ---


        const collection = db.collection('patient_data');
        const doc_collection = docDB.collection('doctors');

        // Find the doctor, ensure they belong to the session's hospital/site
        const doctor = await doc_collection.findOne({ doctor_id: doctorId, hospital_code: hospital_code, site_code: site_code });
        if (!doctor) {
             req.flash('errorMessage', `Doctor with ID ${doctorId} not found for the selected hospital/site.`);
             console.error('Data Entry Error:', `Doctor with ID ${doctorId} not found for hospital ${hospital_code}, site ${site_code}.`);
             return res.redirect(basePath + '/data-entry');
        }
        // Prepare doctor name string safely
        const doctorName = `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() || 'Your Doctor';

        // Format the datetime for display
        const formattedDatetime = formatTo12Hour(appointmentDateObj); // Use the validated Date object

                if (codes && !codesData.find((item) => item.code === codes)) {
                    req.flash('errorMessage', `ICD Code ${codes} not found`);
                    console.error('Validation Error:', `ICD Code ${codes} not found: ${codes}`);
                    return res.redirect(basePath + '/data-entry');
                }
        
                const codeDetail = codesData.find((item) => item.code === codes);

        // Fetch survey details and build appointment_tracker
        const surveysCollection = docDB.collection('surveys');
        const specialitySurveys = await surveysCollection.findOne({
            specialty: speciality, hospital_code: hospital_code, site_code: site_code
        });
        
         const patient = await collection.findOne({ Mr_no });

            // Fix: Load existing appointment tracker
            let existingAppointmentTracker = patient?.appointment_tracker || {};
            let appointment_tracker = { ...existingAppointmentTracker };

            try {
                const specialitySurveys = await surveysCollection.findOne({ specialty: speciality, hospital_code, site_code });

                if (specialitySurveys?.surveys?.length > 0) {

                    // Skip if this speciality already exists for the patient
                    if (!appointment_tracker[speciality]) {
                        let sortedSurveys = {};
                        specialitySurveys.surveys.forEach(survey => {
                            if (Array.isArray(survey.selected_months)) {
                                survey.selected_months.forEach(month => {
                                    if (!sortedSurveys[month]) sortedSurveys[month] = [];
                                    sortedSurveys[month].push(survey.survey_name);
                                });
                            }
                        });

                        let sortedMonths = Object.keys(sortedSurveys).sort((a, b) => parseInt(a) - parseInt(b));
                        let surveyTypeLabels = ["Baseline", ...sortedMonths.slice(1).map((m, i) => `Followup - ${i + 1}`)];
                        let firstAppointmentTime = new Date(appointmentDateObj);
                        let lastAppointmentTime = new Date(firstAppointmentTime);

                        appointment_tracker[speciality] = sortedMonths.map((month, index) => {
                            let trackerAppointmentTime;

                            if (index === 0) {
                                trackerAppointmentTime = new Date(firstAppointmentTime);
                            } else {
                                let previousMonth = parseInt(sortedMonths[index - 1]);
                                let currentMonth = parseInt(month);
                                if (!isNaN(previousMonth) && !isNaN(currentMonth)) {
                                    let monthDifference = currentMonth - previousMonth;
                                    trackerAppointmentTime = new Date(lastAppointmentTime);
                                    trackerAppointmentTime.setMonth(trackerAppointmentTime.getMonth() + monthDifference);
                                    lastAppointmentTime = new Date(trackerAppointmentTime);
                                } else {
                                    trackerAppointmentTime = new Date(lastAppointmentTime);
                                }
                            }

                            const formattedTrackerTime = formatTo12Hour(trackerAppointmentTime);

                            const completed_in_appointment = {};
                            if (Array.isArray(sortedSurveys[month])) {
                                sortedSurveys[month].forEach(surveyName => {
                                    completed_in_appointment[surveyName] = false;
                                });
                            }

                            return {
                                month,
                                survey_name: sortedSurveys[month],
                                surveyType: surveyTypeLabels[index],
                                appointment_time: formattedTrackerTime,
                                surveyStatus: "Not Completed",
                                completed_in_appointment
                            };
                        });
                    } else {
                        console.log(`Specialty "${speciality}" already exists, skipping appointment_time update.`);
                    }
                }
            } catch (trackerError) {
                console.error(`Tracker Error Row ${rowNumber}:`, trackerError);
            }

        // Find existing patient data
        const currentTimestamp = new Date();
        const hashedMrNo = hashMrNo(Mr_no.toString());
        const surveyLink = `http://localhost/patientsurveys/dob-validation?identifier=${hashedMrNo}`; // Use actual domain

        // Fetch Notification Preference and Hospital Name
        const siteSettings = await adminDB.collection('hospitals').findOne(
            { "sites.site_code": site_code }, { projection: { "sites.$": 1 } }
        );
        const notificationPreference = siteSettings?.sites?.[0]?.notification_preference; // Could be undefined, 'none', 'sms', 'email', 'both', 'whatsapp', 'third_party_api'
        console.log(`API Data: Notification preference for site ${site_code}: ${notificationPreference}`);

        const hospitalDetails = await adminDB.collection('hospitals').findOne({ hospital_code });
        const hospitalName = hospitalDetails?.hospital_name || "Unknown Hospital";

        let updatedSurveyStatus = "Not Completed"; // Default for new or reset
        let isNewPatient = false;
        const patientFullName = `${firstName} ${lastName}`.trim(); // Prepare patient name string

        // --- Start: DB Upsert Logic ---
        if (patient) {
            // Existing Patient Update
             isNewPatient = false;
             let updatedDiagnosis = patient.codes || [];
            if (codes) {
                updatedDiagnosis.push({ code: codes, description: codeDetail.description, date: code_date, _id: new ObjectId() });
                console.log("diagnosis",updatedDiagnosis);
            }
             console.log(`API Data: Patient ${Mr_no} found, updating.`);
             // Determine survey status
            // const lastAppointmentDate = patient.datetime ? new Date(patient.datetime.replace(/(\d)([APap][Mm])$/, '$1 $2')) : null;
            //  updatedSurveyStatus = patient.surveyStatus;
            //  if (lastAppointmentDate && !isNaN(lastAppointmentDate.getTime())) {
            //      const daysDifference = (currentTimestamp - lastAppointmentDate) / (1000 * 60 * 60 * 24);
            //      const isSpecialityChanged = patient.speciality !== speciality;
            //      if (daysDifference >= 30 || isSpecialityChanged) updatedSurveyStatus = "Not Completed";
            //  } else { updatedSurveyStatus = "Not Completed"; }

            const trackerEntries = patient?.appointment_tracker?.[speciality] || [];
            const dateTimeFromFormInput = new Date(datetime.replace(/(\d)([APap][Mm])$/, '$1 $2')); // datetime from form input

            let followupDueSoonOrPassed = false;
            trackerEntries.forEach(entry => {
                if (!entry.surveyType || !entry.appointment_time) return;
                if (entry.surveyType.toLowerCase().includes("baseline")) return;

                const apptTime = new Date(entry.appointment_time.replace(/(\d)([APap][Mm])$/, '$1 $2'));
                if (isNaN(apptTime)) return;

                const sevenDaysBefore = new Date(apptTime);
                sevenDaysBefore.setDate(apptTime.getDate() - 7);

                if (dateTimeFromFormInput >= sevenDaysBefore) {
                    console.log(`📌 Follow-up '${entry.surveyType}' scheduled for ${apptTime}, comparing with CSV time ${dateTimeFromFormInput} ✅`);
                    followupDueSoonOrPassed = true;
                }
            });
            updatedSurveyStatus = patient.surveyStatus; // start with existing status
            // Case 1: Check if follow-up is due soon or passed
            if (followupDueSoonOrPassed) {
                updatedSurveyStatus = "Not Completed";
                console.log(`✅ Updating surveyStatus to 'Not Completed' because follow-up is due soon or has passed.`);
            }

            // Case 2: Check if specialty has changed
            if (patient.speciality !== speciality) {
                updatedSurveyStatus = "Not Completed";
                console.log(`✅ Updating surveyStatus to 'Not Completed' because specialty changed from "${patient.speciality}" to "${speciality}".`);
            }

            else {
                console.log(`🛑 No change to surveyStatus: ${patient.surveyStatus}`);
            }


             // Update specialities array
             let updatedSpecialities = patient.specialities || [];
             const specialityIndex = updatedSpecialities.findIndex(s => s.name === speciality);
             if (specialityIndex !== -1) {
                 updatedSpecialities[specialityIndex].timestamp = formatTo12Hour(appointmentDateObj); // Use Date object
                 if (!updatedSpecialities[specialityIndex].doctor_ids.includes(doctorId)) {
                     updatedSpecialities[specialityIndex].doctor_ids.push(doctorId);
                 }
             } else {
                 updatedSpecialities.push({ name: speciality, timestamp: formatTo12Hour(appointmentDateObj), doctor_ids: [doctorId] });
             }

             // Perform Update
             await collection.updateOne({ Mr_no }, {
                 $set: {
                     firstName, middleName, lastName, gender, DOB,
                     datetime: formattedDatetime, // Store formatted string
                     specialities: updatedSpecialities, // Store array with Date objects
                     speciality, phoneNumber, email,
                     hospital_code, site_code,
                     surveyStatus: updatedSurveyStatus,
                     appointment_tracker,
                     Codes: updatedDiagnosis,
                 },
                 $unset: { aiMessage: "", aiMessageGeneratedAt: "" }
             });

        } else {
            // New Patient Insert
             isNewPatient = true;
             console.log(`API Data: Patient ${Mr_no} not found, inserting.`);
             let newDiagnosis = codes ? [{ code: codes, description: codeDetail.description, date: code_date, _id: new ObjectId() }] : [];

             updatedSurveyStatus = "Not Completed";
             await collection.insertOne({
                 Mr_no, firstName, middleName, lastName, gender, DOB,
                 datetime: formattedDatetime, // Store formatted string
                 specialities: [{ name: speciality, timestamp: formatTo12Hour(appointmentDateObj), doctor_ids: [doctorId] }], // Store Date object
                 speciality, phoneNumber, email,
                 hospital_code, site_code,
                 surveyStatus: updatedSurveyStatus,
                 hashedMrNo, surveyLink,
                 Codes: newDiagnosis,
                 appointment_tracker,
                 SurveySent: 0, // Initialize count
                 smsLogs: [], emailLogs: [], whatsappLogs: [] // Initialize logs
             });
        }
        // --- End: DB Upsert Logic ---


        // ***** START: Conditional Notification Logic *****
        //  let finalMessage = 'Appointment created successfully'; // Base success message
        // With this dynamic version:
const userLang = req.cookies.lng || req.query.lng || 'en';

let finalMessage = userLang === 'ar' 
    ? 'تم إنشاء الموعد بنجاح' // Arabic success message
    : 'Appointment created successfully'; // English success message (default)

         if (notificationPreference && notificationPreference.toLowerCase() === 'none') {
             console.log(`API Data: Notifications skipped for ${Mr_no} due to site preference: 'none'.`);
            //  finalMessage += ' Notifications skipped as per site preference.';
             // No SurveySent increment

            

         } else if (notificationPreference && notificationPreference.toLowerCase() === 'third_party_api') {
             // --- Handle Third Party API Case ---
             console.log(`API Data: Notification preference 'third_party_api' detected for ${Mr_no}. Logging placeholders only.`);
            //  const placeholders = {
            //      patientMrNo: Mr_no, // 0: Added MRN for clarity
            //      patientFullName: patientFullName, // 1
            //      doctorFullName: doctorName,      // 2
            //      appointmentDatetime: formattedDatetime, // 3
            //      hospitalName: hospitalName,      // 4
            //      hashedMrNo: hashedMrNo,          // 5
            //      surveyLink: surveyLink,          // 6: Added survey link
            //      speciality: speciality           // 7: Added specialty
            //  };
            //  // Log the placeholders to the console
            //  console.log("--- Third-Party API Placeholders ---");
            //  console.log(JSON.stringify(placeholders, null, 2)); // Pretty print the JSON
            //  console.log("--- End Placeholders ---");

            const payloadForMockServer = {
            patientMrNo: Mr_no,
            patientFullName: patientFullName, // You should have this defined (firstName + lastName)
            doctorFullName: doctorName,       // You should have this defined
            appointmentDatetime: formattedDatetime, // You have this
            hospitalName: hospitalName,     // You have this
            hashedMrNo: hashedMrNo,         // You have this
            surveyLink: surveyLink,         // You have this
            speciality: speciality,         // You have this from req.body
            phoneNumber: phoneNumber,       // From req.body
            email: email,                   // From req.body
            gender: gender,                 // From req.body
            // Add any other relevant fields
            sourceSystemRecordId: null, // If you have a unique ID from your DB for the appointment record
            isNewPatient: isNewPatient, // You determined this earlier
            notificationPreferenceUsed: notificationPreference // The preference that was actioned
        };

        // Call the function to send data to the mock server
        // This can be called asynchronously (don't await if you don't want to block response)
        // or awaited if you need to ensure it's attempted before responding.
        // For external non-critical calls, fire-and-forget is often fine.
        sendAppointmentDataToMockServer(payloadForMockServer).catch(err => {
            // Log error from the async call if it's not awaited and you want to catch promise rejections
            console.error('[MockAuthComm] Background send error:', err);
        });



            //  finalMessage += ' Third-party API placeholders logged.';
             // No SurveySent increment as no message was sent externally

         } else if (notificationPreference) {
            // --- Handle Actual Sending ('sms', 'email', 'both', 'whatsapp') ---
             console.log(`API Data: Notifications enabled (${notificationPreference}) for ${Mr_no}. Preparing to send.`);
            //  finalMessage += ' Notifications attempted (check logs for status).';

             let smsMessage;
             let emailType = null;

             // Determine message content based on survey status
             if (updatedSurveyStatus === "Not Completed") {
                 smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;
                 emailType = 'appointmentConfirmation';
             } else {
                 smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded.`;
                 console.log(`API Data: Survey complete/not applicable for ${Mr_no}, adjusting message.`);
             }

             // --- Attempt to Send SMS ---
             if ((notificationPreference.toLowerCase() === 'sms' || notificationPreference.toLowerCase() === 'both') && smsMessage) {
                 try {
                     const smsResult = await sendSMS(phoneNumber, smsMessage);
                     console.log(`API Data: SMS sent successfully for ${Mr_no}, SID: ${smsResult.sid}`);
                     await collection.updateOne({ Mr_no }, {
                         $push: { smsLogs: { type: "api_creation", speciality: speciality, timestamp: new Date(), sid: smsResult.sid } },
                         $inc: { SurveySent: 1 }
                     });
                 } catch (smsError) { console.error(`API Data: Error sending SMS for ${Mr_no}:`, smsError.message); }
             }

             // --- Attempt to Send Email ---
             if ((notificationPreference.toLowerCase() === 'email' || notificationPreference.toLowerCase() === 'both') && email && emailType) {
                 try {
                     await sendEmail(email, emailType, speciality, formattedDatetime, hashedMrNo, firstName, doctorName);
                     console.log(`API Data: Email sent successfully for ${Mr_no}`);
                     await collection.updateOne({ Mr_no }, {
                         $push: { emailLogs: { type: "api_creation", speciality: speciality, timestamp: new Date() } },
                         $inc: { SurveySent: 1 }
                     });
                 } catch (emailError) { console.error(`API Data: Error sending Email for ${Mr_no}:`, emailError.message); }
             }

             // --- Attempt to Send WhatsApp Template ---
             if (notificationPreference.toLowerCase() === 'whatsapp' || notificationPreference.toLowerCase() === 'both') {
                 try {
                     const accountSid = process.env.TWILIO_ACCOUNT_SID;
                     const authToken = process.env.TWILIO_AUTH_TOKEN;
                     if (accountSid && authToken && process.env.TWILIO_WHATSAPP_NUMBER && process.env.TWILIO_TEMPLATE_SID) {
                         const client = twilio(accountSid, authToken);
                         const placeholders = {
                              1: patientFullName, 2: doctorName, 3: formattedDatetime,
                              4: hospitalName, 5: hashedMrNo
                          };
                         let formattedPhoneNumber = phoneNumber;
                         if (phoneNumber && !phoneNumber.startsWith('whatsapp:')) formattedPhoneNumber = `whatsapp:${phoneNumber}`;

                         if (formattedPhoneNumber) {
                              const message = await client.messages.create({
                                  from: process.env.TWILIO_WHATSAPP_NUMBER,
                                  to: formattedPhoneNumber,
                                  contentSid: process.env.TWILIO_TEMPLATE_SID,
                                  contentVariables: JSON.stringify(placeholders),
                                  statusCallback: 'http://localhost/whatsapp-status-callback' // Use actual URL
                              });
                              console.log(`API Data: Template WhatsApp message sent for ${Mr_no}, SID: ${message.sid}`);
                              await collection.updateOne({ Mr_no }, {
                                  $push: { whatsappLogs: { type: "api_creation", speciality: speciality, timestamp: new Date(), sid: message.sid } },
                                  $inc: { SurveySent: 1 }
                              });
                         } else { console.warn(`API Data: Skipping WhatsApp for ${Mr_no}: Invalid phone format.`); }
                     } else { console.warn(`API Data: Skipping WhatsApp for ${Mr_no} due to missing Twilio config.`); }
                 } catch (twilioError) { console.error(`API Data: Error sending Twilio WhatsApp template for ${Mr_no}:`, twilioError.message); }
             }

         } else {
             // Case where notificationPreference is null, undefined, or an unrecognized value (other than 'none' or 'third_party_api')
             console.log(`API Data: Notification preference '${notificationPreference}' is not configured for sending. No notifications sent for ${Mr_no}.`);
            //  finalMessage += ' Notifications not sent (preference not configured for sending).';
             // No SurveySent increment
         }
        // ***** END: Conditional Notification Logic *****

        const uploadsDir = path.join(__dirname, '../public/uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
      

        const timestamp = Date.now();
        const singleUploadFile = `patient_${Mr_no}_${timestamp}.xlsx`;

        const outputFilePath = path.join(uploadsDir, singleUploadFile);

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Single Upload');

        sheet.columns = [
            { header: 'MR Number', key: 'Mr_no', width: 15 },
            { header: 'First Name', key: 'firstName', width: 15 },
            { header: 'Last Name', key: 'lastName', width: 15 },
            { header: 'Phone Number', key: 'phoneNumber', width: 18 },
            { header: 'Survey Link', key: 'surveyLink', width: 50 },
            { header: 'Notification Sent', key: 'notificationSent', width: 18 },
        ];

        sheet.addRow({
            Mr_no,
            firstName,
            lastName,
            phoneNumber,
            surveyLink,
            notificationSent: (notificationPreference?.toLowerCase() !== 'none') ? 'Yes' : 'No', 
        });

        await workbook.xlsx.writeFile(outputFilePath);
        req.session.processedExcelFile = singleUploadFile;



        // --- Final Response ---
        req.flash('successMessage', finalMessage); // Use the dynamically set message
        res.redirect(basePath + '/data-entry'); // Redirect back to data entry form

    } catch (error) {
        console.error('Error processing /api/data request:', error);
        const logErrorData = `Error in /api/data for MR ${req.body?.Mr_no}: ${error.stack || error.message}`;
        writeLog('error_logs.txt', logErrorData); // Assuming writeLog function exists
        req.flash('errorMessage', 'Internal server error processing patient data. Please check logs.');
        res.redirect(basePath + '/data-entry'); // Redirect on error as well
    }
});





staffRouter.post('/api/json-patient-data', async (req, res) => {
    const db = req.dataEntryDB;
    const adminDB = req.adminUserDB;
    const docDB = req.manageDoctorsDB;

    try {
        // --- Extract and Validate Input Data ---
        const {
            Mr_no, firstName, middleName, lastName, DOB, datetime,
            phoneNumber, email, gender,
            'speciality-doctor': specialityDoctor
        } = req.body;

        if (!Mr_no || !firstName || !lastName || !DOB || !datetime || !phoneNumber || !specialityDoctor) {
            let missing = ['Mr_no', 'firstName', 'lastName', 'DOB', 'datetime', 'phoneNumber', 'speciality-doctor']
                          .filter(field => !req.body[field] && field !== 'speciality-doctor' || (field === 'speciality-doctor' && !specialityDoctor));
            return res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(', ')}.` });
        }

        const hospital_code = req.session?.hospital_code;
        const site_code = req.session?.site_code;

        if (!hospital_code || !site_code) {
            console.warn("JSON API Error: Missing hospital_code or site_code in session.");
            return res.status(401).json({ success: false, message: 'User session not found or invalid. Please login again.' });
        }

        const [speciality, doctorId] = (specialityDoctor || '').split('||');
        if (!speciality || !doctorId) {
            return res.status(400).json({ success: false, message: 'Invalid speciality-doctor format. Expected "SpecialtyName||DoctorID".' });
        }

        const appointmentDateObj = new Date(datetime.replace(/(\d)([APap][Mm])$/, '$1 $2'));
        if (isNaN(appointmentDateObj.getTime())) {
            return res.status(400).json({ success: false, message: 'Invalid appointment datetime format provided.' });
        }
        const formattedDatetime = formatTo12Hour(appointmentDateObj);
        // --- End Validation ---

        const collection = db.collection('patient_data');
        const doc_collection = docDB.collection('doctors');

        // Find Doctor
        const doctor = await doc_collection.findOne({ doctor_id: doctorId, hospital_code, site_code });
        if (!doctor) {
            return res.status(404).json({ success: false, message: `Doctor with ID ${doctorId} not found for hospital ${hospital_code} / site ${site_code}.` });
        }
        const doctorName = `${doctor.firstName || ''} ${doctor.lastName || ''}`.trim() || 'Your Doctor';

        // Fetch Survey Details & Build Tracker
        const surveysCollection = docDB.collection('surveys');
        const specialitySurveys = await surveysCollection.findOne({ specialty, hospital_code, site_code });
        let appointment_tracker = {};
        if (specialitySurveys && specialitySurveys.surveys && Array.isArray(specialitySurveys.surveys)) {
             try {
                 // --- Build appointment_tracker logic ---
                 let sortedSurveys = {};
                 specialitySurveys.surveys.forEach(survey => {
                     if (Array.isArray(survey.selected_months)) {
                         survey.selected_months.forEach(month => {
                             if (!sortedSurveys[month]) sortedSurveys[month] = [];
                             sortedSurveys[month].push(survey.survey_name);
                         });
                     }
                 });
                 let sortedMonths = Object.keys(sortedSurveys).sort((a, b) => parseInt(a) - parseInt(b));
                 let surveyTypeLabels = ["Baseline"];
                 for (let i = 1; i < sortedMonths.length; i++) surveyTypeLabels.push(`Followup - ${i}`);

                 let firstAppointmentTime = new Date(appointmentDateObj);
                 let lastAppointmentTime = new Date(firstAppointmentTime);

                 appointment_tracker[speciality] = sortedMonths.map((month, index) => {
                     let appointmentTime;
                     if (index === 0) {
                         appointmentTime = new Date(firstAppointmentTime);
                     } else {
                         let previousMonth = parseInt(sortedMonths[index - 1]);
                         let currentMonth = parseInt(month);
                         if (!isNaN(previousMonth) && !isNaN(currentMonth)) {
                             let monthDifference = currentMonth - previousMonth;
                             appointmentTime = new Date(lastAppointmentTime);
                             appointmentTime.setMonth(appointmentTime.getMonth() + monthDifference);
                             lastAppointmentTime = new Date(appointmentTime);
                         } else {
                              console.warn(`JSON API: Invalid month values for tracker: prev=${previousMonth}, curr=${currentMonth}`);
                              appointmentTime = new Date(lastAppointmentTime); // Fallback
                          }
                     }
                     const formattedAppointmentTime = !isNaN(appointmentTime?.getTime()) ? formatTo12Hour(appointmentTime) : "Invalid Date";
                     return { month, survey_name: sortedSurveys[month], surveyType: surveyTypeLabels[index], appointment_time: formattedAppointmentTime, surveyStatus: "Not Completed" };
                 });
                 // --- End build appointment_tracker logic ---
             } catch(trackerError) {
                 console.error("JSON API: Error building appointment tracker:", trackerError);
             }
        }

        // Find existing patient data & Prepare Common Vars
        const patient = await collection.findOne({ Mr_no });
        const currentTimestamp = new Date();
        const hashedMrNo = hashMrNo(Mr_no.toString());
        const surveyLink = `http://localhost/patientsurveys/dob-validation?identifier=${hashedMrNo}`; // Use actual domain
        const patientFullName = `${firstName} ${lastName}`.trim();

        let updatedSurveyStatus = "Not Completed";
        let isNewPatient = !patient;

        // --- Start: DB Upsert Logic ---
        if (patient) {
             // Update Existing Patient...
             console.log(`JSON API: Patient ${Mr_no} found, updating.`);
             const lastAppointmentDate = patient.datetime ? new Date(patient.datetime.replace(/(\d)([APap][Mm])$/, '$1 $2')) : null;
             updatedSurveyStatus = patient.surveyStatus;
             if (lastAppointmentDate && !isNaN(lastAppointmentDate.getTime())) {
                 const daysDifference = (currentTimestamp - lastAppointmentDate) / (1000 * 60 * 60 * 24);
                 if (daysDifference >= 30 || patient.speciality !== speciality) updatedSurveyStatus = "Not Completed";
             } else { updatedSurveyStatus = "Not Completed"; }
             let updatedSpecialities = patient.specialities || [];
             const specialityIndex = updatedSpecialities.findIndex(s => s.name === speciality);
             if (specialityIndex !== -1) { /* ... update existing specialty entry ... */ }
             else { updatedSpecialities.push({ name: speciality, timestamp: appointmentDateObj, doctor_ids: [doctorId] }); }
             await collection.updateOne({ Mr_no }, { $set: { /* ... fields ... */ surveyStatus: updatedSurveyStatus, appointment_tracker }, $unset: { /* ... */ } });
        } else {
             // Insert New Patient...
             console.log(`JSON API: Patient ${Mr_no} not found, inserting.`);
             updatedSurveyStatus = "Not Completed";
             await collection.insertOne({ /* ... fields ... */ SurveySent: 0, smsLogs: [], emailLogs: [], whatsappLogs: [] });
        }
        // --- End: DB Upsert Logic ---

        // --- Start: Fetch Notification Settings (Post-DB Op) ---
        const siteSettings = await adminDB.collection('hospitals').findOne(
             { "sites.site_code": site_code }, { projection: { "sites.$": 1 } }
        );
        const notificationPreference = siteSettings?.sites?.[0]?.notification_preference;
        const hospitalDetails = await adminDB.collection('hospitals').findOne({ hospital_code });
        const hospitalName = hospitalDetails?.hospital_name || "Unknown Hospital";
        console.log(`JSON API: Post-DB Op. Notification preference for site ${site_code}: ${notificationPreference}`);
        // --- End: Fetch Notification Settings ---

        // ***** START: Conditional Notification Logic *****
        let finalMessage = 'Appointment created successfully'; // Base success message

        const prefLower = notificationPreference?.toLowerCase(); // Handle undefined safely

        if (prefLower === 'none') {
            console.log(`JSON API: Notifications skipped for ${Mr_no} due to preference 'none'.`);
            finalMessage += ' Notifications skipped as per site preference.';
            // No SurveySent increment

        } else if (prefLower === 'third_party_api') {
            // --- Handle Third Party API Case ---
            console.log(`JSON API: Preference 'third_party_api' detected for ${Mr_no}. Logging placeholders.`);
            const placeholders = {
                patientMrNo: Mr_no,
                patientFullName: patientFullName,
                doctorFullName: doctorName,
                appointmentDatetime: formattedDatetime, // Use formatted string for consistency
                hospitalName: hospitalName,
                hashedMrNo: hashedMrNo,
                surveyLink: surveyLink,
                speciality: speciality,
                phoneNumber: phoneNumber,
                email: email
            };
            // Log the placeholders clearly to the console
            console.log(`--- JSON API: Third-Party Placeholders for MRN: ${Mr_no} ---`);
            console.log(JSON.stringify(placeholders, null, 2));
            console.log(`--- End Placeholders ---`);

            finalMessage += ' Third-party API placeholders logged.';
            // No SurveySent increment

        } else if (notificationPreference) { // Handles 'sms', 'email', 'both', 'whatsapp', etc.
            // --- Handle Actual Sending ---
            console.log(`JSON API: Notifications enabled (${notificationPreference}) for ${Mr_no}. Preparing to send.`);
            finalMessage += ' Notifications attempted (check logs for status).';

            let smsMessage;
            let emailType = null;

            if (updatedSurveyStatus === "Not Completed") {
                smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;
                emailType = 'appointmentConfirmation';
            } else {
                smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded.`;
                console.log(`JSON API: Survey complete/not applicable for ${Mr_no}, adjusting message.`);
            }

            // --- Attempt to Send SMS ---
            if ((prefLower === 'sms' || prefLower === 'both') && smsMessage) {
                try {
                    const smsResult = await sendSMS(phoneNumber, smsMessage);
                    console.log(`JSON API: SMS sent successfully for ${Mr_no}, SID: ${smsResult.sid}`);
                    await collection.updateOne({ Mr_no }, {
                        $push: { smsLogs: { type: "api_creation", speciality: speciality, timestamp: new Date(), sid: smsResult.sid } },
                        $inc: { SurveySent: 1 }
                    });
                } catch (smsError) { console.error(`JSON API: Error sending SMS for ${Mr_no}:`, smsError.message); }
            }

            // --- Attempt to Send Email ---
            if ((prefLower === 'email' || prefLower === 'both') && email && emailType) {
                try {
                    await sendEmail(email, emailType, speciality, formattedDatetime, hashedMrNo, firstName, doctorName);
                    console.log(`JSON API: Email sent successfully for ${Mr_no}`);
                    await collection.updateOne({ Mr_no }, {
                        $push: { emailLogs: { type: "api_creation", speciality: speciality, timestamp: new Date() } },
                        $inc: { SurveySent: 1 }
                    });
                } catch (emailError) { console.error(`JSON API: Error sending Email for ${Mr_no}:`, emailError.message); }
            }

            // --- Attempt to Send WhatsApp Template ---
            if (prefLower === 'whatsapp' || prefLower === 'both') {
                try {
                    const accountSid = process.env.TWILIO_ACCOUNT_SID;
                    const authToken = process.env.TWILIO_AUTH_TOKEN;
                    if (accountSid && authToken && process.env.TWILIO_WHATSAPP_NUMBER && process.env.TWILIO_TEMPLATE_SID) {
                        const client = twilio(accountSid, authToken);
                        const placeholders = { 1: patientFullName, 2: doctorName, 3: formattedDatetime, 4: hospitalName, 5: hashedMrNo };
                        let formattedPhoneNumber = phoneNumber;
                        if (phoneNumber && !phoneNumber.startsWith('whatsapp:')) formattedPhoneNumber = `whatsapp:${phoneNumber}`;

                        if (formattedPhoneNumber) {
                             const message = await client.messages.create({
                                 from: process.env.TWILIO_WHATSAPP_NUMBER, to: formattedPhoneNumber,
                                 contentSid: process.env.TWILIO_TEMPLATE_SID, contentVariables: JSON.stringify(placeholders),
                                 statusCallback: 'http://localhost/whatsapp-status-callback'
                             });
                             console.log(`JSON API: Template WhatsApp message sent for ${Mr_no}, SID: ${message.sid}`);
                             await collection.updateOne({ Mr_no }, {
                                 $push: { whatsappLogs: { type: "api_creation", speciality: speciality, timestamp: new Date(), sid: message.sid } },
                                 $inc: { SurveySent: 1 }
                             });
                        } else { console.warn(`JSON API: Skipping WhatsApp for ${Mr_no}: Invalid phone format.`); }
                    } else { console.warn(`JSON API: Skipping WhatsApp for ${Mr_no} due to missing Twilio config.`); }
                } catch (twilioError) { console.error(`JSON API: Error sending Twilio WhatsApp template for ${Mr_no}:`, twilioError.message); }
            }

        } else {
            // Handle null/undefined or unrecognized preference
            console.log(`JSON API: Notification preference '${notificationPreference}' is not set or invalid for site ${site_code}. No notifications sent for ${Mr_no}.`);
            finalMessage += ' Notification preference not set/invalid; none sent.';
            // No SurveySent increment
        }
        // ***** END: Conditional Notification Logic *****


        // --- Final JSON Response ---
        return res.status(200).json({
            success: true,
            message: finalMessage,
            patientMrNo: Mr_no
        });

    } catch (error) {
        console.error('Error processing /api/json-patient-data request:', error);
        const logErrorData = `Error in /api/json-patient-data for MR ${req.body?.Mr_no}: ${error.stack || error.message}`;
        // Ensure writeLog exists and handles errors gracefully
        typeof writeLog === 'function' ? writeLog('error_logs.txt', logErrorData) : console.error("writeLog function not available for error logging.");

        return res.status(500).json({
            success: false,
            message: 'Internal server error processing patient data.',
            error: error.message // Send error message back for API debugging
        });
    }
});




staffRouter.get('/api/patient/:mrNo', async (req, res) => {
    const mrNo = req.params.mrNo;
    const db = req.dataEntryDB;
    const userHospitalCode = req.session.hospital_code; // Get hospital_code from the logged-in user's session

    // Validate if userHospitalCode exists in the session
    if (!userHospitalCode) {
        console.error('API Error: hospital_code not found in session for /api/patient/:mrNo');
        // Return a generic error, as the issue is with the session, not the patient data itself
        return res.status(401).json({ success: false, message: 'Session invalid or expired. Please log in again.' });
    }

    try {
        // Modify the query to find the patient matching BOTH Mr_no AND the user's hospital_code
        const patient = await db.collection('patient_data').findOne({
            Mr_no: mrNo,
            hospital_code: userHospitalCode // Add this condition
        });

        if (patient) {
            // Patient found AND belongs to the correct hospital
            res.json({ success: true, patient });
        } else {
            // Check if a patient with this MRN exists at all (but maybe in a different hospital)
            const patientExistsElsewhere = await db.collection('patient_data').findOne({ Mr_no: mrNo });
            if (patientExistsElsewhere) {
                 // Patient exists, but not in the user's hospital
                res.json({ success: false, message: 'Patient found, but does not belong to your hospital.' });
            } else {
                 // Patient with this MRN not found anywhere
                res.json({ success: false, message: 'Patient not found.' });
            }
        }
    } catch (error) {
        console.error('Error fetching patient data:', error);
        res.status(500).json({ success: false, message: 'Internal server error while fetching patient data.' });
    }
});


// Endpoint to get all available specialties
staffRouter.get('/api/specialties', async (req, res) => {
    try {
        const specialties = await manageDoctorsClient.db().collection('surveys').distinct('specialty');
        res.json({ success: true, specialties });
    } catch (error) {
        console.error('Error fetching specialties:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// // Endpoint to get doctors based on speciality and hospital_code


// Endpoint to get doctors based on speciality, hospital_code, and site_code
staffRouter.get('/api/doctors', async (req, res) => {
    const { speciality, hospital_code, site_code } = req.query;

    try {
        const doctors = await req.manageDoctorsDB.collection('doctors').find({
            speciality,
            hospital_code,
            site_code // Filter by site_code as well
        }).toArray();

        if (doctors.length > 0) {
            res.json({ success: true, doctors });
        } else {
            res.json({ success: false, message: 'No doctors found for this speciality, hospital_code, and site_code.' });
        }
    } catch (error) {
        console.error('Error fetching doctors:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});





staffRouter.get('/api/specialties-doctors', async (req, res) => {
    const hospital_code = req.query.hospital_code;
    const site_code = req.query.site_code; // Get site_code from the query parameters

    try {
        const specialties = await req.manageDoctorsDB.collection('surveys').distinct('specialty');
        const result = [];

        for (let speciality of specialties) {
            const doctors = await req.manageDoctorsDB.collection('doctors').find({ speciality, hospital_code, site_code }).toArray();
            if (doctors.length > 0) {
                result.push({ name: speciality, doctors });
            }
        }

        if (result.length > 0) {
            res.json({ success: true, specialties: result });
        } else {
            res.json({ success: false, message: 'No specialities or doctors found.' });
        }
    } catch (error) {
        console.error('Error fetching specialties and doctors:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});



// staffRouter.post('/send-reminder', async (req, res) => {
//     const { Mr_no } = req.body;
//     const db = req.dataEntryDB;
//     const adminDB = req.adminUserDB;
//     try {
//         // Retrieve patient data based on Mr_no
//         const collection = db.collection('patient_data');
//         const patient = await collection.findOne({ Mr_no });

//         if (!patient) {
//             return res.status(400).json({ error: 'Phone Number not found' });
//         }

//         // Get the latest speciality from the specialities array
//         const latestSpeciality = patient.specialities.reduce((latest, speciality) => {
//             return new Date(speciality.timestamp) > new Date(latest.timestamp) ? speciality : latest;
//         }, patient.specialities[0]);
//         const latestSpecialityName = latestSpeciality.name;

//         const surveyLink = `http://localhost/patientsurveys/dob-validation?identifier=${patient.hashedMrNo}`;
//         const formattedDatetime = formatTo12Hour(patient.datetime);

//         // Construct the reminder message
//         const reminderMessage = `Friendly reminder! Your appointment for ${latestSpeciality.name} on ${formattedDatetime} is approaching. Don't forget to complete your survey beforehand : ${surveyLink}`;

//         const siteSettings = await adminDB.collection('hospitals').findOne(
//             { "sites.site_code": patient.site_code },
//             { projection: { "sites.$": 1 } } // Only return the matching site object
//         );

//         const notificationPreference = siteSettings?.sites?.[0]?.notification_preference;
//         const emailType = 'appointmentReminder'; // You can modify this if the email needs to differ from SMS

//         // Send SMS and/or email based on notification preference
//         try {
//             if (notificationPreference === 'sms' || notificationPreference === 'both') {
//                 try{
//                     await collection.updateOne(
//                         { Mr_no },
//                         {
//                             $push: {
//                                 smsLogs: {
//                                     type: "reminder",
//                                     speciality: latestSpeciality.name,
//                                     timestamp: new Date()
//                                 }
//                             }
//                         }
//                     );

//                 await sendSMS(patient.phoneNumber, reminderMessage);
//                 // Log the reminder SMS in the smsLogs array
//                 }catch{
//                     console.log("Reminder SMS Logs added in Database, but SMS not sent.")
//                 }
                
//             }

//             if (notificationPreference === 'email' || notificationPreference === 'both') {
//                 if (patient.email) { // Ensure the email exists
//                     // await sendEmail(patient.email, emailType, latestSpecialityName, formattedDatetime, patient.hashedMrNo, patient.firstName);
//                     // // Log the email in the emailLogs array
//                     // await collection.updateOne(
//                     //     { Mr_no },
//                     //     {
//                     //         $push: {
//                     //             emailLogs: {
//                     //                 type: "reminder",
//                     //                 speciality: latestSpeciality.name,
//                     //                 timestamp: new Date()
//                     //             }
//                     //         }
//                     //     }
//                     // );
//                     console.log("In Send Reminder - Email or both");
//                 } else {
//                     console.warn('Email not provided for patient:', Mr_no);
//                 }
//             }

//             // Correct placement of res.redirect() after sending notifications
//             res.redirect(basePath + '/home');
//         } catch (error) {
//             console.error('Error sending reminder:', error);
//             res.status(500).json({ error: 'Internal server error' });
//         }
//     } catch (error) {
//         console.error('Error processing the request:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// });


staffRouter.post('/send-reminder', async (req, res) => {
    const { Mr_no } = req.body;
    const db = req.dataEntryDB;
    const adminDB = req.adminUserDB;

    try {
        const collection = db.collection('patient_data');
        const patient = await collection.findOne({ Mr_no });

        if (!patient) {
            return res.status(400).json({ error: 'MR No not found' });
        }

        const latestSpeciality = patient.specialities.reduce((latest, spec) =>
            new Date(spec.timestamp) > new Date(latest.timestamp) ? spec : latest,
            patient.specialities[0]
        );

        const latestSpecialityName = latestSpeciality.name;
        const formattedDatetime = formatTo12Hour(patient.datetime);
        const surveyLink = `http://localhost/patientsurveys/dob-validation?identifier=${patient.hashedMrNo}`;

        const reminderMessage = `Friendly reminder! Your appointment for ${latestSpecialityName} on ${formattedDatetime} is approaching. Don't forget to complete your survey: ${surveyLink}`;

        const siteSettings = await adminDB.collection('hospitals').findOne(
            { "sites.site_code": patient.site_code },
            { projection: { "sites.$": 1 } }
        );

        const notificationPreference = siteSettings?.sites?.[0]?.notification_preference?.toLowerCase();

        // ======= Send based on preference =======
        if (notificationPreference === 'none') {
            console.log("Reminder skipped - Notification disabled");
            
            return res.redirect(basePath + '/home');
        }

        if (notificationPreference === 'third_party_api') {
            console.log("Reminder handled by third-party API. No local message sent.");
           
            return res.redirect(basePath + '/home');
        }   
        // Send SMS
        if (notificationPreference === 'sms' || notificationPreference === 'both') {
            try {
                await sendSMS(patient.phoneNumber, reminderMessage);
                await collection.updateOne(
                    { Mr_no },
                    { $push: { smsLogs: { type: 'reminder', speciality: latestSpecialityName, timestamp: new Date() } } }
                );
               
            } catch (err) {
                console.warn("SMS failed:", err.message);
            }
        }
        // Send Email
        if ((notificationPreference === 'email' || notificationPreference === 'both') && patient.email) {
            try {
                const emailType = 'appointmentReminder';
                console.log("in send reminder");
                await sendEmail(patient.email, emailType, latestSpecialityName, formattedDatetime, patient.hashedMrNo, patient.firstName);
                await collection.updateOne(
                    { Mr_no },
                    { $push: { emailLogs: { type: 'reminder', speciality: latestSpecialityName, timestamp: new Date() } } }
                );
                
            } catch (err) {
                console.warn("Email failed:", err.message);
            }
        }
        // Send WhatsApp (if supported)
        if (notificationPreference === 'whatsapp') {
            try {
                const accountSid = process.env.TWILIO_ACCOUNT_SID;
                const authToken = process.env.TWILIO_AUTH_TOKEN;
                if (accountSid && authToken && process.env.TWILIO_WHATSAPP_NUMBER && process.env.TWILIO_TEMPLATE_SID) {
                    const client = twilio(accountSid, authToken);
                    const whatsappMessage = {
                        1: `${patient.firstName} ${patient.lastName || ''}`,
                        2: latestSpecialityName,
                        3: formattedDatetime,
                        4: siteSettings?.sites?.[0]?.hospital_name || "Hospital",
                        5: patient.hashedMrNo
                    };
                    const message = await client.messages.create({
                        from: process.env.TWILIO_WHATSAPP_NUMBER,
                        to: `whatsapp:${patient.phoneNumber}`,
                        contentSid: process.env.TWILIO_TEMPLATE_SID,
                        contentVariables: JSON.stringify(whatsappMessage),
                        statusCallback: 'http://localhost/whatsapp-status-callback'
                    });

                    await collection.updateOne(
                        { Mr_no },
                        { $push: { whatsappLogs: { type: 'reminder', speciality: latestSpecialityName, timestamp: new Date(), sid: message.sid } } }
                    );
                    console.log("Whatsapp sent");
                } else {
                    console.warn("Twilio WhatsApp not configured properly.");
                }
                
            } catch (err) {
                console.warn("WhatsApp failed:", err.message);
            }
        }
        return res.redirect(basePath + '/home');
    } catch (error) {
        console.error('Send Reminder error:', error.message);
        return res.status(500).json({ error: 'Internal Server Error' });

    }
});



staffRouter.post('/api/data-with-hospital_code', async (req, res) => {
    const db = req.dataEntryDB;
    try {
        const { Mr_no, firstName, middleName, lastName, DOB, datetime, phoneNumber, hospital_code } = req.body;  // hospital_code now taken from the body

        // Extract speciality and doctor from the combined field
        const [speciality, doctor] = req.body['speciality-doctor'].split('||');

        // Validate required fields
        if (!datetime || !speciality || !doctor || !hospital_code) { // Ensure hospital_code is not null
            req.flash('errorMessage', 'Appointment date & time, speciality, doctor, and hospital_code are required.');
            return res.redirect(basePath+'/data-entry');
        }

        const collection = db.collection('patient_data');

        // Format the datetime to 12-hour format
        const formattedDatetime = formatTo12Hour(datetime);

        // Find existing patient data
        const patient = await collection.findOne({ Mr_no });
        const currentTimestamp = new Date();
        if (patient) {
            // Update existing patient data
            let updatedSpecialities = patient.specialities || [];
            
            // Check if the speciality already exists in the array
            const specialityIndex = updatedSpecialities.findIndex(s => s.name === speciality);
            if (specialityIndex !== -1) {
                // If the speciality exists, update the timestamp and add the doctor
                updatedSpecialities[specialityIndex].timestamp = currentTimestamp;
                if (!updatedSpecialities[specialityIndex].doctors.includes(doctor)) {
                    updatedSpecialities[specialityIndex].doctors.push(doctor);
                }
            } else {
                // If speciality does not exist, add a new object
                updatedSpecialities.push({
                    name: speciality,
                    timestamp: currentTimestamp,
                    doctors: [doctor]
                });
            }

            await collection.updateOne(
                { Mr_no },
                {
                    $set: {
                        firstName,
                        middleName,
                        lastName,
                        DOB,
                        datetime: formattedDatetime,
                        specialities: updatedSpecialities,
                        speciality,
                        phoneNumber,
                        hospital_code,  // Now using the hospital_code from the form data
                        surveyStatus: "Not Completed"
                    },
                    $push: {
                        smsLogs: {
                            type: "appointment creation",
                            speciality: speciality,
                            timestamp: currentTimestamp
                        }
                    }
                }
            );
        } else {
            // Insert new patient data
            const hashedMrNo = hashMrNo(Mr_no.toString());
            await collection.insertOne({
                Mr_no,
                firstName,
                middleName,
                lastName,
                DOB,
                datetime: formattedDatetime,
                specialities: [{
                    name: speciality,
                    timestamp: new Date(),
                    doctors: [doctor]
                }],
                speciality,
                phoneNumber,
                hospital_code,  // Now using the hospital_code from the form data
                surveyStatus: "Not Completed",
                hashedMrNo,
                smsLogs: [{
                    type: "appointment creation",
                    speciality: speciality,
                    timestamp: new Date()
                }]
            });
        }

        // Generate the survey link and SMS message
        const hashedMrNo = hashMrNo(Mr_no.toString());
        const surveyLink = `http://localhost/patientsurveys/dob-validation?identifier=${hashedMrNo}`;
        const smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;

        try {
            // Send SMS to the patient
            await sendSMS(phoneNumber, smsMessage);
            req.flash('successMessage', 'Patient added. SMS sent.');
            res.redirect(basePath+'/data-entry');
        } catch (error) {
            console.error('Error sending SMS:', error);
            req.flash('successMessage', 'Patient added, but SMS not sent.');
            res.redirect(basePath+'/data-entry');
        }
    } catch (error) {
        console.error('Error inserting data into MongoDB:', error);
        req.flash('errorMessage', 'Internal server error.');
        res.redirect(basePath+'/data-entry');
    }
});

// Middleware to authenticate token
async function authenticateToken(req, res, next) {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            return res.status(401).json({ error: 'Authorization header missing' });
        }
        // Check for Bearer token
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Access token missing' });
        }
        console.log("In here 1");
        // Verify token using JWT
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log("decoded", decoded);
        } catch (err) {
            console.error("Error verifying token:", err);
            return res.status(401).json({ error: 'Invalid token' });
        }

        // Check if token exists in the database
        console.log("Checking database for token...");
        const tokenRecord = await req.apiDB.collection('tokens').findOne({ accessToken: token });
        console.log("tokenRecord", tokenRecord);
        if (!tokenRecord || new Date() > tokenRecord.expiresAt) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // Attach clientId to the request for further use
        req.clientId = decoded.clientId;
        next();
    } catch (err) {
        console.error("Error in authenticateToken:", err);
        return res.status(401).json({ error: 'Invalid token' });
    }
}


staffRouter.post('/api/v1/add-appointment', authenticateToken, async (req, res) => {
    const db = req.dataEntryDB;
    try {
        const { Mr_no, firstName, middleName, lastName, DOB, datetime, phoneNumber } = req.body;  
        console.log("Received patient data:", { Mr_no, firstName, middleName, lastName, DOB, datetime, phoneNumber});
        // Extract speciality and doctorId from the combined field
        const [speciality, doctor_id] = req.body['speciality-doctor'].split('||');
        console.log("Extracted specialty and doctorId:", { speciality, doctor_id });
        // Validate required fields
        if (!datetime || !speciality || !doctor_id) {
            console.log("Validation failed: Missing required fields.");
            return res.json('Appointment date & time, and speciality & doctor selection are required.');
        }
        const doctor = await req.manageDoctorsDB.collection('doctors').findOne({ doctor_id });
        let hospital_code, site_code;
        if (doctor) {
            console.log(doctor);
            console.log(doctor.hospital_code);
            hospital_code = doctor.hospital_code;
            site_code = doctor.site_code;
        } else {
            console.log('Doctor not found');
            return res.json('Doctor not found' );
        }
        const collection = db.collection('patient_data');

        // Format the datetime to 12-hour format
        const formattedDatetime = formatTo12Hour(datetime);

        // Find existing patient data
        const patient = await collection.findOne({ Mr_no });
        const currentTimestamp = new Date();

        let smsMessage;
        const hashedMrNo = hashMrNo(Mr_no.toString());

        if (patient) {
            // Check if the last appointment is more than or equal to 30 days ago
            const lastAppointmentDate = new Date(patient.datetime);
            const daysDifference = (currentTimestamp - lastAppointmentDate) / (1000 * 60 * 60 * 24);

            let updatedSurveyStatus = patient.surveyStatus;

            // Check if the speciality is different from the existing one
            const isSpecialityChanged = patient.speciality !== speciality;

            // If more than 30 days, set surveyStatus to "Not Completed"
            if (daysDifference >= 30 || isSpecialityChanged) {
                updatedSurveyStatus = "Not Completed";
            }

            // Update existing patient data
            let updatedSpecialities = patient.specialities || [];
            
            // Check if the speciality already exists in the array
            const specialityIndex = updatedSpecialities.findIndex(s => s.name === speciality);

            if (specialityIndex !== -1) {
                updatedSpecialities[specialityIndex].timestamp = formatTo12Hour(datetime);  // Use formatTo12Hour here
                if (!updatedSpecialities[specialityIndex].doctor_ids.includes(doctor_id)) {
                    updatedSpecialities[specialityIndex].doctor_ids.push(doctorId);
                }
            } else {
                updatedSpecialities.push({
                    name: speciality,
                    timestamp: formatTo12Hour(datetime),  // Apply the same format
                    doctor_ids: [doctor_id]
                });
            }
            
            const result = await await collection.updateOne(
                { Mr_no },
                {
                    $set: {
                        firstName,
                        middleName,
                        lastName,
                        DOB,
                        datetime: formattedDatetime,
                        specialities: updatedSpecialities,
                        speciality,
                        phoneNumber,
                        hospital_code,
                        site_code, // Add site_code to the update
                        surveyStatus: updatedSurveyStatus // Set surveyStatus based on 30-day check or speciality change
                    },
                    $unset: {
                        aiMessage: "", // Remove aiMessage field
                        aiMessageGeneratedAt: "" // Remove aiMessageGeneratedAt field
                    },
                    $push: {
                        smsLogs: {
                            type: "appointment creation",
                            speciality: speciality,
                            timestamp: currentTimestamp
                        }
                    }
                }
            );

             // Log the result of the update operation
            if (result.modifiedCount > 0) {
                console.log(`Successfully updated document for Mr_no: ${Mr_no}`);
            } else {
                console.log(`No document found or updated for Mr_no: ${Mr_no}`);
            }

            // Modify the SMS message to omit the survey link if surveyStatus is not "Not Completed"
            if (updatedSurveyStatus === "Not Completed") {
                const surveyLink = `http://localhost/patientsurveys/dob-validation?identifier=${hashedMrNo}`;
                smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;
            } else {
                smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded.`;
            }

        } else {
            // Insert new patient data
            await collection.insertOne({
                Mr_no,
                firstName,
                middleName,
                lastName,
                DOB,
                datetime: formattedDatetime,
                specialities: [{
                    name: speciality,
                    timestamp: formatTo12Hour(datetime),  // Use formatTo12Hour for timestamp
                    doctor_ids: [doctor_id]
                }],
                speciality,
                phoneNumber,
                hospital_code,
                site_code,
                surveyStatus: "Not Completed", // For new patients, set surveyStatus to "Not Completed"
                hashedMrNo,
                smsLogs: [{
                    type: "appointment creation",
                    speciality: speciality,
                    timestamp: formatTo12Hour(datetime)  // Apply format here as well
                }]
            });

            // Always include the survey link for new patients
            const surveyLink = `http://localhost/patientsurveys/dob-validation?identifier=${hashedMrNo}`;
            smsMessage = `Dear patient, your appointment for ${speciality} on ${formattedDatetime} has been recorded. Please fill out these survey questions prior to your appointment with the doctor: ${surveyLink}`;
        }

        try {
            // Send SMS to the patient
            await sendSMS(phoneNumber, smsMessage);
            return res.json( 'Patient added. SMS sent.');
        } catch (error) {
            console.error('Error sending SMS:', error);
            return res.json( 'Patient added, but SMS not sent.');
        }
    } catch (error) {
        console.error('Error inserting data into MongoDB:', error);
        return res.json('Internal server error.');
    }
});

staffRouter.post('/api/v1/update', authenticateToken, async (req, res) => {
    const db = req.dataEntryDB; 

    try {
        
        const { mrNo, firstName, middleName, lastName, DOB, datetime, speciality, phoneNumber } = req.body;

        const collection = db.collection('patient_data');

        const formattedDatetime = formatTo12Hour(datetime);

        console.log('mrNo:', mrNo);
        console.log('req.body:', req.body);

        const result = await collection.updateOne(
            { Mr_no: mrNo },
            {
                $set: {
                    firstName,
                    middleName,
                    lastName,
                    DOB,
                    datetime: formattedDatetime,
                    speciality,  // Update speciality
                    phoneNumber
                }
            }
        );

        if (result.matchedCount === 0) {
            throw new Error(`Patient with MR Number ${mrNo} does not exist.`);
        }

        const updatedPatient = await collection.findOne({ Mr_no: mrNo });

        if (!updatedPatient) {
            throw new Error('Failed to fetch updated patient data.');
        }
        res.status(200).json({ message: 'Patient data updated successfully', data: updatedPatient });

    } catch (error) {
        console.error('Error:', error);

        if (error.message.includes('does not exist')) {
            res.status(400).json({ error: `Patient with MR Number ${mrNo} does not exist.` });
        } else {
            res.status(500).json({ error: 'Internal server error', details: error.message });
        }
    }
});

staffRouter.post('/api/v1/get-patient',authenticateToken, async (req, res) => {
    const db = req.dataEntryDB;
    try {
        const { Mr_no } = req.body;  // Assuming Mr_no is sent in the request body
        const collection = db.collection('patient_data');
        
        // Find the patient based on the MR number
        const patient = await collection.findOne({ Mr_no });
        
        if (patient) {
            // Return the patient data in the response
            return res.json({ patient });
        } else {
            // Patient not found
            res.status(404).json({ error: 'Patient not found' });
        }
    } catch (error) {
        console.error('Error fetching patient data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

staffRouter.post('/api/v1/delete-patient', authenticateToken, async (req, res) => {
    const db = req.dataEntryDB;

    try {
        const { Mr_no } = req.body;  // Assuming Mr_no is sent in the request body
        const collection = db.collection('patient_data');

        // Delete the patient based on the MR number
        const result = await collection.deleteOne({ Mr_no });

        if (result.deletedCount > 0) {
            // Patient successfully deleted
            return res.json({ message: 'Patient record deleted successfully' });
        } else {
            // Patient not found
            res.status(404).json({ error: 'Patient not found' });
        }
    } catch (error) {
        console.error('Error deleting patient data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});



/* ------------------------------------------------------------------
   ROUTE  :  POST  /staff/send-survey-link
   PURPOSE:  (Re)send the survey link for a single patient MR number.
   BODY   :  { "Mr_no": "400" }
   ------------------------------------------------------------------ */
   staffRouter.post('/send-survey-link', async (req, res) => {
    const { Mr_no } = req.body;
    if (!Mr_no) {
      return res.status(400).json({ error: 'Mr_no is required' });
    }
  
    const patientCol   = req.dataEntryDB.collection('patient_data');
    const doctorsCol   = req.manageDoctorsDB.collection('doctors');
    const hospitalsCol = req.adminUserDB.collection('hospitals');
  
    try {
      /* ── 1. Fetch patient record ─────────────────────────────── */
      const patient = await patientCol.findOne({ Mr_no });
      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }
  
      /* ── 2. Ensure hashed MR number & survey‑link ────────────── */
      let hashedMrNo = patient.hashedMrNo;
      if (!hashedMrNo) {
        hashedMrNo = hashMrNo(String(Mr_no));
        await patientCol.updateOne({ Mr_no }, { $set: { hashedMrNo } });
      }
      const surveyLink = `http://localhost/patientsurveys/dob-validation?identifier=${hashedMrNo}`;
  
      /* ── 3. Latest speciality / doctor / appointment time ────── */
      const latestSpec = (patient.specialities || []).reduce(
        (latest, spec) =>
          !latest || new Date(spec.timestamp) > new Date(latest.timestamp)
            ? spec
            : latest,
        null
      );
  
      const speciality  = latestSpec?.name || patient.speciality;
      const doctorId    = latestSpec?.doctor_ids?.[0];
      const formattedDt = formatTo12Hour(patient.datetime);
  
      const doctor = doctorId
        ? await doctorsCol.findOne({ doctor_id: doctorId })
        : null;
  
      /* ── 4. Notification preference at site level ────────────── */
      const siteMeta = await hospitalsCol.findOne(
        { 'sites.site_code': patient.site_code },
        { projection: { 'sites.$': 1 } }
      );
      const preference =
        siteMeta?.sites?.[0]?.notification_preference || 'sms'; // default = sms
  
      /* ── 5. Build common text message ────────────────────────── */
      const baseMsg =
        `Dear ${patient.firstName}, your appointment for ${speciality} ` +
        `on ${formattedDt} is approaching. Please complete your survey: ` +
        surveyLink;
  
      /* ── 6‑A.  SMS (traditional)  ────────────────────────────── */
      if (['sms', 'both'].includes(preference)) {
        try {
          await sendSMS(patient.phoneNumber, baseMsg);
  
          // Log SMS
          await patientCol.updateOne(
            { Mr_no },
            { $push: { smsLogs: { type: 'survey‑link', timestamp: new Date() } } }
          );
  
          // ✅ Increment SurveySent by 1 for a successful SMS
          await patientCol.updateOne({ Mr_no }, { $inc: { SurveySent: 1 } });
  
          console.log(`SMS sent for Mr_no ${Mr_no}`);
        } catch (err) {
          console.error(`SMS error for ${Mr_no}:`, err.message);
        }
      }
  
      /* ── 6‑B.  E‑mail  ───────────────────────────────────────── */
      if (['email', 'both'].includes(preference) && patient.email) {
        try {
          await sendEmail(
            patient.email,
            'appointmentReminder',   // reuses the reminder template
            speciality,
            formattedDt,
            hashedMrNo,
            patient.firstName,
            doctor?.firstName || 'Doctor'
          );
  
          // Log e‑mail
          await patientCol.updateOne(
            { Mr_no },
            { $push: { emailLogs: { type: 'survey‑link', timestamp: new Date() } } }
          );
  
          // ✅ Increment SurveySent by 1 for a successful e‑mail
          await patientCol.updateOne({ Mr_no }, { $inc: { SurveySent: 1 } });
  
          console.log(`Email sent for Mr_no ${Mr_no}`);
        } catch (err) {
          console.error(`Email error for ${Mr_no}:`, err.message);
        }
      }
  
      /* ── 6‑C.  WhatsApp template (same as /api/data) ─────────── */
      try {
        const twilio     = require('twilio');
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken  = process.env.TWILIO_AUTH_TOKEN;
        const client     = twilio(accountSid, authToken);
  
        const hospital   = await hospitalsCol.findOne({
          hospital_code: patient.hospital_code
        });
        const hospitalName = hospital?.hospital_name || 'Hospital';
  
        const placeholders = {
          1: `${patient.firstName} ${patient.lastName}`.trim(), // {{1}}
          2: doctor ? `${doctor.firstName} ${doctor.lastName}`.trim() : '',
          3: formattedDt,  // {{3}}
          4: hospitalName, // {{4}}
          5: hashedMrNo    // {{5}}
        };
  
        let phone = patient.phoneNumber;
        if (!phone.startsWith('whatsapp:')) phone = `whatsapp:${phone}`;
  
        await client.messages.create({
          from            : process.env.TWILIO_WHATSAPP_NUMBER,
          to              : phone,
          contentSid      : process.env.TWILIO_TEMPLATE_SID,
          contentVariables: JSON.stringify(placeholders),
          statusCallback  : 'http://localhost/whatsapp-status-callback'
        });
  
        // ✅ Increment SurveySent by 1 for a successful WhatsApp
        await patientCol.updateOne({ Mr_no }, { $inc: { SurveySent: 1 } });
  
        console.log(`WhatsApp template sent for ${Mr_no}`);
      } catch (waErr) {
        console.error(`WhatsApp error for ${Mr_no}:`, waErr.message);
      }
  
      /* ── 7. Response ─────────────────────────────────────────── */
      return res.json({
        success   : true,
        message   : 'Survey link sent (check logs for channel status).',
        surveyLink: surveyLink
      });
  
    } catch (err) {
      console.error('Error in /send-survey-link:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
  

app.use(basePath, staffRouter);


function startServer() {
    app.listen(PORT, () => {
        console.log(`API data entry server is running on http://localhost${basePath}`);
    });
}



module.exports = startServer;
