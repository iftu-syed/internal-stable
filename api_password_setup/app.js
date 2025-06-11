require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const passwordRouter = require('./routes/index');
const { MongoClient } = require('mongodb');
const app = express();
const i18next = require('i18next');
const i18nextMiddleware = require('i18next-http-middleware');
const cookieParser = require('cookie-parser');
app.use(cookieParser());
const Backend = require('i18next-fs-backend');

// Use environment variables
const uri = process.env.DB_URI; // Ensure DB_URI is set in your .env file
const dbName = process.env.DB_NAME; // Ensure DB_NAME is set in your .env file

let db;
app.use('/patientpassword/locales', express.static(path.join(__dirname, 'views/locales')));;
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

// Use environment variables
const PORT = process.env.PORT;

// Function to connect to MongoDB
async function connectToDatabase() {
  if (db) return db; // Return the existing connection if available
  try {
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    await client.connect();
    console.log('Connected successfully to server');
    db = client.db(dbName);
    return db;
  } catch (err) {
    console.error('Error connecting to database:', err);
    throw err;
  }
}

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/patientpassword', express.static(path.join(__dirname, 'public')));

// Set up express-session middleware using environment variable
app.use(session({
  secret: process.env.SESSION_SECRET, // Use secret from .env
  resave: false,
  saveUninitialized: true
}));

// Set up connect-flash middleware
app.use(flash());

app.use((req, res, next) => {
  const currentLanguage = req.query.lng || req.cookies.lng || 'en'; // Default to English
    const dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';

    res.locals.lng = currentLanguage; // Set the language for EJS templates
    res.locals.dir = dir;             // Set the direction for EJS templates

    res.cookie('lng', currentLanguage); // Persist language in cookies
    req.language = currentLanguage;
    req.dir = dir;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

// Function to format date to MM/DD/YYYY
const formatDateToMMDDYYYY = (date) => {
  const d = new Date(date);
  let month = '' + (d.getMonth() + 1);
  let day = '' + d.getDate();
  const year = d.getFullYear();

  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;

  return [month, day, year].join('/');
};

// Create a new router
const patientRouter = express.Router();

// Define root route
patientRouter.get('/', (req, res) => {
  res.render('input_form', { 
    message: res.locals.error,
    lng: res.locals.lng,
    dir: res.locals.dir,
   });
});

// patientRouter.post('/password', (req, res) => {
//   const { Mr_no, dob } = req.body;

//   // Format the date to MM/DD/YYYY
//   const formattedDob = formatDateToMMDDYYYY(dob);

//   // Correct the redirect path to include /patientpassword
//   res.redirect(`/patientpassword/password/${Mr_no}?dob=${formattedDob}`);
// });

// patientRouter.post('/password', async (req, res) => {
//   const { Mr_no, dob } = req.body;

//   // Format the date to MM/DD/YYYY
//   const formattedDob = formatDateToMMDDYYYY(dob);

//   try {
//     const db = await connectToDatabase();
//     const collection = db.collection('patient_data');

//     console.log('Searching for patient with:', { Mr_no, dob: formattedDob });

//     // Find the patient using the provided Mr_no and formatted DOB
//     const patient = await collection.findOne({
//       Mr_no: Mr_no,
//       DOB: formattedDob,
//     });

//     if (!patient) {
//       console.log('Patient not found or hashMrNo is missing');
//       req.flash('error', 'Please check your details and try again');
//       return res.redirect('/patientpassword');
//     }

//     console.log('Patient found:', patient);

//     // Ensure the code accesses `hashedMrNo` correctly
//     if (!patient.hashedMrNo) {
//       console.log('hashedMrNo not found for the patient');
//       req.flash('error', 'Internal server error: Missing patient hashedMrNo');
//       return res.redirect('/patientpassword');
//     }

//     console.log('hashedMrNo found:', patient.hashedMrNo);

//     // Redirect with the `hashedMrNo` and `dob`
//     res.redirect(`/patientpassword/password/${patient.hashedMrNo}`);
//   } catch (error) {
//     console.error('Error fetching patient:', error);
//     req.flash('error', 'Internal server error');
//     res.redirect('/patientpassword');
//   }
// });


//new code with phoneNumber and DOB

patientRouter.post('/password', async (req, res) => {
  // Get the identifier (which could be Mr_no or phone number) and dob
  const { Mr_no: identifier, dob } = req.body; // Input field name is still 'Mr_no' in the form

  // Format the date to MM/DD/YYYY
  const formattedDob = formatDateToMMDDYYYY(dob);

  // Validate input
  if (!identifier || !dob) {
      req.flash('error', 'Please provide both identifier (MRN or Phone) and Date of Birth.');
      return res.redirect('/patientpassword');
  }

  try {
    const db = await connectToDatabase();
    const collection = db.collection('patient_data'); // Ensure this is your correct collection name

    console.log('Searching for patient with identifier:', identifier, 'and DOB:', formattedDob);

    // Find the patient using the identifier (Mr_no OR phoneNumber) and formatted DOB
    const patient = await collection.findOne({
      $or: [
        { Mr_no: identifier },
        { phoneNumber: identifier } // Use 'phoneNumber' based on your screenshot
      ],
      DOB: formattedDob, // DOB must also match
    });

    if (!patient) {
      console.log('Patient not found with the given identifier and DOB.');
      req.flash('error', 'Patient not found. Please check your details and try again.');
      return res.redirect('/patientpassword');
    }

    console.log('Patient found:', patient.Mr_no, patient.firstName); // Log some patient info for confirmation

    // Ensure the hashedMrNo exists before redirecting
    // Assuming hashedMrNo is the unique key needed for the next step regardless of login method
    if (!patient.hashedMrNo) {
      console.error('Critical error: Found patient but hashedMrNo is missing.', { patientId: patient._id });
      req.flash('error', 'Internal server error: Missing required patient identifier.');
      return res.redirect('/patientpassword');
    }

    console.log('Redirecting with hashedMrNo:', patient.hashedMrNo);

    // Redirect with the hashedMrNo
    res.redirect(`/patientpassword/password/${patient.hashedMrNo}`);

  } catch (error) {
    console.error('Error during patient lookup:', error);
    req.flash('error', 'An internal server error occurred. Please try again later.');
    res.redirect('/patientpassword');
  }
});

// Use the password router
patientRouter.use('/password', passwordRouter);
app.use(express.urlencoded({ extended: true }));
// Mount the patientRouter under '/patientpassword'
app.use('/patientpassword', patientRouter);

app.listen(PORT, () => {
  console.log(`The patient password generation is running at http://localhost/patientpassword`);
});
