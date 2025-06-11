const express = require('express');
const path = require('path'); // Add this line to import the path module
// Load environment variables from .env file
require('dotenv').config();
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const flash = require('connect-flash');
const session = require('express-session');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Response</title>
            <style>
                body {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                }
                .message {
                    text-align: center;
                    font-size: 36px;
                }
            </style>
        </head>
        <body>
            <div class="message">
                Thanks for Submitting!
            </div>
        </body>
        </html>
    `;
const app = express();
// const PORT = 3088;
const PORT = process.env.PORT;
const crypto = require('crypto');

// Define the new base path
const basePath = '/patientsurveys';
app.locals.basePath = basePath;

// Function to hash the MR number
function hashMrNo(mrNo) {
    return crypto.createHash('sha256').update(mrNo).digest('hex');
}

// Set up express-session middleware
app.use(session({
  secret: process.env.SESSION_SECRET, // Use session secret from .env
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using HTTPS
}));


// Initialize flash messages
app.use(flash());


// Connection URI
const uri = process.env.MONGO_URI; // Change this URI according to your MongoDB setup

// app.use(express.static(path.join(__dirname, 'public')));

app.use(basePath, express.static(path.join(__dirname, 'public')));

// Database Name
const dbName = process.env.DB_NAME; // Change this to your actual database name

// Connection options
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  // Add more options as needed
};

// Function to connect to the MongoDB database
async function connectToDatabase() {
  let client;
  try {
    // Create a new MongoClient
    client = new MongoClient(uri, options);

    // Connect the client to the server
    await client.connect();

    console.log("Connected successfully to MongoDB server");

    // Specify the database you want to use
    const db = client.db(dbName);

    return db;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
}

// MongoDB Connection URIs
const uri1 = process.env.DB_URI1; // Use URI1 from .env
const uri3 = process.env.DB_URI3; // Use URI3 from .env

let db1, db2, db3;
    // Connect to the first database
const client1 = new MongoClient(uri1, { useNewUrlParser: true, useUnifiedTopology: true });
client1.connect();
db1 = client1.db(process.env.DB_NAME);  // Use DB_NAME from .env
console.log('Connected to Data_Entry_Incoming database');


     // Connect to the third database
     const client3 = new MongoClient(uri3, { useNewUrlParser: true, useUnifiedTopology: true });
     client3.connect();
     db3 = client3.db(process.env.DB_NAME_THIRD);
     console.log('Connected to manage_doctors database');




  
// Function to connect to the MongoDB database
async function connectToThirdDatabase() {
  let client;
  try {
      // Create a new MongoClient
      client = new MongoClient(uri3, { useNewUrlParser: true, useUnifiedTopology: true });

      // Connect the client to the server
      await client.connect();

      console.log("Connected successfully to third database");

      // Specify the database you want to use
      const db = client.db(process.env.DB_NAME_THIRD);

      return db;
  } catch (error) {
      console.error("Error connecting to third database:", error);
      throw error;
  }
}

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

// Create an Express Router
const router = express.Router();

router.get('/', (req, res) => {
  const flashMessage = req.flash('error'); // Retrieve flash messages
  res.render('search', { flashMessage }); // Pass the flash message to the view
});



router.get('/search', async (req, res) => {
  const { identifier } = req.query;
  const flashMessage = req.flash('error'); // Retrieve flash messages

  try {
      const db = await connectToDatabase(); // Establish connection to the MongoDB database
      const collection = db.collection('patient_data');

      // Find the patient by plain MR number or phone number
      const patient = await collection.findOne({
          $or: [
              { Mr_no: identifier },
              { phoneNumber: identifier }
          ]
      });

      if (!patient) {
          req.flash('error', 'Patient not found'); // Set flash message
          return res.redirect(basePath + '/'); // Redirect to the search page
      }

      // Use hashedMrNo for all further references
      const hashedMrNo = patient.hashedMrNo;

      // Check if appointmentFinished is present or absent
      const showTerms = !patient.appointmentFinished; // If appointmentFinished is absent, show terms
      const appointmentFinished = patient.appointmentFinished; // Add the appointmentFinished value

      // Redirect to `dob-validation` page with `hashMrNo` in the URL
      res.redirect(`${basePath}/dob-validation?identifier=${hashedMrNo}`);
  } catch (error) {
      console.error(error);
      req.flash('error', 'Internal server error'); // Set flash message
      res.redirect(basePath + '/'); // Redirect to the search page
  }
});



router.get('/dob-validation', async (req, res) => {
  const { identifier, lang } = req.query; // Get the patient's identifier and language preference
  const flashMessage = req.flash('error'); // Retrieve any error messages

  try {
      const db = await connectToDatabase();
      const collection = db.collection('patient_data');

      // Retrieve patient using `hashedMrNo`
      const patient = await collection.findOne({ hashedMrNo: identifier });

      if (!patient) {
          req.flash('error', 'Patient not found'); // Set error message
          return res.render('dob-validation', {
              Mr_no: null,
              showTerms: false,
              appointmentFinished: null,
              flashMessage: req.flash('error'),
              currentLang: lang || 'en', // Pass default language as 'en' if not provided
          }); // Re-render with an error
      }

      // Check if appointmentFinished is present or absent
      const showTerms = !patient.appointmentFinished;
      const appointmentFinished = patient.appointmentFinished;

      // Render the `dob-validation` view
      res.render('dob-validation', {
          Mr_no: patient.Mr_no,
          showTerms,
          appointmentFinished,
          flashMessage, // Pass any error messages to the template
          currentLang: lang || 'en', // Pass the current language preference
      });
  } catch (error) {
      console.error(error);
      req.flash('error', 'Internal server error'); // Set error message
      res.render('dob-validation', {
          Mr_no: null,
          showTerms: false,
          appointmentFinished: null,
          flashMessage: req.flash('error'),
          currentLang: 'en', // Default language on error
      }); // Re-render with an error
  }
});






//this is working


router.get('/details', async (req, res) => {
  let { Mr_no, lang = 'en' } = req.query; // Only keep Mr_no and lang

  try {
    // Connect to the first database (patient_data)
    const db = await connectToDatabase();
    const collection = db.collection('patient_data');

    // Find patient data based on Mr_no or hashedMrNo
    const patient = await collection.findOne({
      $or: [{ Mr_no }, { hashedMrNo: Mr_no }]
    });

    if (!patient) {
      return res.status(404).send('Patient not found');
    }

    // Set appointmentFinished to 1, creating the field if it doesn't exist
    await collection.updateOne(
      { Mr_no: patient.Mr_no },
      { $set: { appointmentFinished: 1 } }
    );

    // Clear all survey completion times if surveyStatus is 'Completed'
    if (patient.surveyStatus === 'Completed') {
      const updates = {};
      ['Global-Health', 'PAID', 'Global-Health_d', 'Wexner', 'ICIQ_UI_SF', 'EPDS', 'Pain-Interference', 'Physical-Function'].forEach(survey => {
        updates[`${survey}_completionDate`] = "";
      });

      // Remove customSurveyTimeCompletion field as well
      updates['customSurveyTimeCompletion'] = "";

      await collection.updateOne(
        { Mr_no: patient.Mr_no },
        { $unset: updates }
      );
    }

    // Fetch survey data from the third database based on patient's specialty, hospital_code, and site_code
    const db3 = await connectToThirdDatabase();
    const surveyData = await db3.collection('surveys').findOne({
      specialty: patient.speciality,
      hospital_code: patient.hospital_code,
      site_code: patient.site_code
    });

    // Use the custom array from the third database, or handle if surveyData is null
    const customSurveyNames = surveyData ? surveyData.custom : [];

    // Check survey completion dates for the surveys in the custom array
    const today = new Date();
    const completedSurveys = {};

    customSurveyNames.forEach(survey => {
      const completionDateField = `${survey}_completionDate`;
      if (patient[completionDateField]) {
        const completionDate = new Date(patient[completionDateField]);
        const daysDifference = Math.floor((today - completionDate) / (1000 * 60 * 60 * 24));
        completedSurveys[survey] = daysDifference <= 30; // Completed if within 30 days
      }
    });

    // Function to execute curl commands with SurveyData waiting logic
    const executeBackgroundTasks = async (patientMrNo) => {
      try {
        // 1. Execute api_script first
        console.log('Executing api_script...');
        await exec(`curl -X POST http://localhost:3055/patientlogin/run-scripts \
          -H "Content-Type: application/json" -d '{"mr_no": "${patientMrNo}"}'`);
        console.log('run-scripts completed successfully.');

        // 2. Wait for SurveyData object to be created in the database
        let updatedPatient;
        const waitForSurveyData = async () => {
          const maxRetries = 10;
          let retries = 0;

          while (retries < maxRetries) {
            updatedPatient = await collection.findOne({ Mr_no: patientMrNo });

            if (updatedPatient && updatedPatient.SurveyData) {
              console.log('SurveyData found.');
              return updatedPatient;
            }

            console.log(`SurveyData not found. Retrying... (${retries + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retrying
            retries++;
          }

          throw new Error('SurveyData not found after maximum retries.');
        };

        await waitForSurveyData(); // Wait until SurveyData is present

        // 3. Execute doctor-llama-script and run-scripts concurrently
        console.log('Executing doctor-llama-script and run-scripts...');
        await Promise.all([
          exec(`curl -X POST http://localhost:3003/doctorlogin/doctor-llama-script \
            -H "Content-Type: application/json" -d '{"mr_no": "${patientMrNo}"}'`),
          exec(`curl -X POST http://localhost:3055/patientlogin/api_script \
            -H "Content-Type: application/json" -d '{"mr_no": "${patientMrNo}"}'`)
        ]);
        console.log('doctor-llama-script and api_script completed successfully.');

      } catch (error) {
        console.error('Error executing background curl tasks:', error);
      }
    };

    // Trigger background execution without waiting
    executeBackgroundTasks(patient.Mr_no);

    // Determine the MR number to use in the URL
    const mrNoToUse = patient.hashedMrNo || patient.Mr_no;

    // Render the details view regardless of the presence of custom surveys
    res.render('details', {
      Mr_no: mrNoToUse, // Use masked Mr_no if available
      patient,
      surveyName: customSurveyNames, // Pass custom survey names to the view
      completedSurveys,
      currentLang: lang // Pass current language to the view for multi-language support
    });

  } catch (error) {
    console.error('Error fetching patient data or survey data:', error);
    return res.status(500).send('Internal server error');
  }
});



// const getSurveyUrls = async (patient, lang) => {
//   const db3 = await connectToThirdDatabase();
//   const surveyData = await db3.collection('surveys').findOne({
//       specialty: patient.speciality,
//       hospital_code: patient.hospital_code,
//       site_code: patient.site_code
//   });

//   const customSurveyNames = surveyData ? surveyData.custom : [];

//   // If no survey names are found, redirect to port 8080 with plain Mr_no
//   if (customSurveyNames.length === 0) {
//       return [`${process.env.API_SURVEY_URL}?mr_no=${Mr_no}&lang=${lang}`];
//   }

//   // Generate survey URLs in the order specified in `custom`
//   const mrNoToUse = patient.hashedMrNo || patient.Mr_no; // Use hashedMrNo if available for survey URLs

//   return customSurveyNames
//       .filter(survey => {
//           if (survey === 'Global-Health_d') {
//               return !patient['Global-Health_completionDate'];
//           }
//           return !patient[`${survey}_completionDate`];
//       })
//       .map(survey => `${basePath}/${survey}?Mr_no=${mrNoToUse}&lang=${lang}`);
// };


// const getSurveyUrls = async (patient, lang) => {
//   const db3 = await connectToThirdDatabase();
//   const surveyData = await db3.collection('surveys').findOne({
//     specialty: patient.speciality,
//     hospital_code: patient.hospital_code,
//     site_code: patient.site_code
//   });

//   const customSurveyNames = surveyData ? surveyData.custom : [];

//   console.log(`\n🔍 Fetching surveys for patient: ${patient.Mr_no}`);
//   console.log(`✅ Specialty: ${patient.speciality}`);
//   console.log(`✅ Available Surveys:`, customSurveyNames);

//   // If no survey names are found, redirect to API survey
//   if (customSurveyNames.length === 0) {
//     console.log(`⚠ No surveys found. Redirecting to API survey.`);
//     return [`${process.env.API_SURVEY_URL}?mr_no=${patient.Mr_no}&lang=${lang}`];
//   }

//   // Get today's date for appointment filtering
//   const today = new Date();

//   // Retrieve appointment tracker details
//   const appointmentTracker = patient.appointment_tracker?.[patient.speciality] || [];

//   // Filter surveys based on appointment time and completion status
//   const validSurveys = customSurveyNames.filter((survey) => {
//     const completionDateField = `${survey}_completionDate`;
//     const isCompleted = Boolean(patient[completionDateField]);

//     // Find appointment details for this survey
//     const appointment = appointmentTracker.find(app => app.survey_name.includes(survey));

//     if (!appointment) {
//       console.log(`🚫 No appointment scheduled for survey: ${survey}`);
//       return false; // No appointment, do not start survey
//     }

//     const appointmentTime = new Date(appointment.appointment_time);
//     const isAvailable = !isCompleted && appointmentTime <= today;

//     console.log(
//       `📌 Survey: ${survey} | Completed: ${isCompleted} | Appointment Time: ${appointmentTime} | Available: ${isAvailable}`
//     );

//     return isAvailable;
//   });

//   console.log(`✅ Valid Surveys to Start:`, validSurveys);

//   // Generate survey URLs for valid (uncompleted & scheduled) surveys
//   const mrNoToUse = patient.hashedMrNo || patient.Mr_no;
//   return validSurveys.map(survey => `${basePath}/${survey}?Mr_no=${mrNoToUse}&lang=${lang}`);
// };

// Make sure you have access to basePath and connectToThirdDatabase 
// in the same scope before this function.

// async function getSurveyUrls(patient, lang) {
//   const db3 = await connectToThirdDatabase();
//   const surveyData = await db3.collection('surveys').findOne({
//     specialty: patient.speciality,
//     hospital_code: patient.hospital_code,
//     site_code: patient.site_code
//   });

//   // The list of custom surveys (e.g. ["EPDS","Wexner"])
//   const customSurveyNames = surveyData ? surveyData.custom : [];

//   console.log(`\n🔍 Fetching surveys for patient: ${patient.Mr_no}`);
//   console.log(`✅ Specialty: ${patient.speciality}`);
//   console.log(`✅ Available Surveys:`, customSurveyNames);

//   // If no surveys at all, fall back to API-based survey
//   if (customSurveyNames.length === 0) {
//     console.log(`⚠ No surveys found. Redirecting to API survey.`);
//     return [`${process.env.API_SURVEY_URL}?mr_no=${patient.Mr_no}&lang=${lang}`];
//   }

//   // Pull out the correct appointments for this specialty
//   const appointmentTracker = patient.appointment_tracker?.[patient.speciality] || [];
//   const today = new Date();

//   // Filter out surveys that are completed or have no matching/valid appointment
//   const validSurveys = customSurveyNames.filter(survey => {
//     // 1) Already completed?
//     const completionDateField = `${survey}_completionDate`;
//     if (patient[completionDateField]) return false;

//     // 2) Must have a matching appointment entry
//     const matchingAppt = appointmentTracker.find(ap => ap.survey_name.includes(survey));
//     if (!matchingAppt) return false;

//     // 3) Appointment time must be now or in the past
//     const apptTime = new Date(matchingAppt.appointment_time);
//     return apptTime <= today;
//   });

//   console.log(`✅ Valid Surveys to Start:`, validSurveys);

//   // If there is a hashed Mr_no, use that in survey URLs
//   const mrNoToUse = patient.hashedMrNo || patient.Mr_no;

//   // Build survey URLs only for valid/pending surveys
//   return validSurveys.map(survey => `${basePath}/${survey}?Mr_no=${mrNoToUse}&lang=${lang}`);
// }

//This is better

// async function getSurveyUrls(patient, lang) {
//   const db3 = await connectToThirdDatabase();
//   const surveyData = await db3.collection('surveys').findOne({
//     specialty: patient.speciality,
//     hospital_code: patient.hospital_code,
//     site_code: patient.site_code
//   });

//   // The list of custom surveys (e.g., ["EPDS","Wexner"])
//   const customSurveyNames = surveyData ? surveyData.custom : [];

//   console.log(`\n🔍 Fetching surveys for patient: ${patient.Mr_no}`);
//   console.log(`✅ Specialty: ${patient.speciality}`);
//   console.log(`✅ Available Surveys:`, customSurveyNames);

//   // If no surveys at all, fall back to API-based survey
//   if (customSurveyNames.length === 0) {
//     console.log(`⚠ No surveys found. Redirecting to API survey.`);
//     return [`${process.env.API_SURVEY_URL}?mr_no=${patient.Mr_no}&lang=${lang}`];
//   }

//   // Pull out the correct appointments for this specialty
//   const appointmentTracker = patient.appointment_tracker?.[patient.speciality] || [];
//   const today = new Date();

//   // Filter out surveys that are completed or have no matching/valid appointment
//   const validSurveys = customSurveyNames.filter(survey => {
//     // 1) Already completed?
//     const completionDateField = `${survey}_completionDate`;
//     if (patient[completionDateField]) return false;

//     // 2) Must have a matching appointment entry
//     const matchingAppt = appointmentTracker.find(ap => ap.survey_name.includes(survey));
//     if (!matchingAppt) return false;

//     // 2a) That appointment must have surveyStatus = "Not Completed"
//     if (matchingAppt.surveyStatus !== 'Not Completed') {
//       console.log(`🚫 Appointment not available. Current status: ${matchingAppt.surveyStatus}`);
//       return false;
//     }

//     // 3) Appointment time must be now or in the past
//     const apptTime = new Date(matchingAppt.appointment_time);
//     return apptTime <= today;
//   });

//   console.log(`✅ Valid Surveys to Start:`, validSurveys);

//   // If there's a hashed Mr_no, use that in survey URLs
//   const mrNoToUse = patient.hashedMrNo || patient.Mr_no;

//   // Build survey URLs only for valid/pending surveys
//   return validSurveys.map(survey => `${basePath}/${survey}?Mr_no=${mrNoToUse}&lang=${lang}`);
// }


// async function getSurveyUrls(patient, lang) {
//   const db3 = await connectToThirdDatabase();
//   const surveyData = await db3.collection('surveys').findOne({
//     specialty: patient.speciality,
//     hospital_code: patient.hospital_code,
//     site_code: patient.site_code
//   });

//   const customSurveyNames = surveyData ? surveyData.custom : [];
//   console.log(`\n🔍 Fetching surveys for patient: ${patient.Mr_no}`);
//   console.log(`✅ Specialty: ${patient.speciality}`);
//   console.log(`✅ Available Surveys:`, customSurveyNames);

//   // If none found, fall back to your API survey
//   if (customSurveyNames.length === 0) {
//     console.log(`⚠ No surveys found. Redirecting to API survey.`);
//     return [`${process.env.API_SURVEY_URL}?mr_no=${patient.Mr_no}&lang=${lang}`];
//   }

//   // Filter for surveys in appointment_tracker that have surveyStatus = "Not Completed"
//   const appointmentTracker = patient.appointment_tracker?.[patient.speciality] || [];
//   const today = new Date();

//   const validSurveys = customSurveyNames.filter(survey => {
//     // Already completed in patient_data?
//     const completionDateField = `${survey}_completionDate`;
//     if (patient[completionDateField]) return false;

//     // Matching appointment must exist
//     const matchingAppt = appointmentTracker.find(ap => ap.survey_name.includes(survey));
//     if (!matchingAppt) return false;

//     // Appointment must have surveyStatus = "Not Completed"
//     if (matchingAppt.surveyStatus !== 'Not Completed') {
//       console.log(`🚫 Appointment not available. Current status: ${matchingAppt.surveyStatus}`);
//       return false;
//     }

//     // Appointment time must be now or in the past
//     const apptTime = new Date(matchingAppt.appointment_time);
//     return apptTime <= today;
//   });

//   console.log(`✅ Valid Surveys to Start:`, validSurveys);

//   const mrNoToUse = patient.hashedMrNo || patient.Mr_no;
//   return validSurveys.map(s => `${basePath}/${s}?Mr_no=${mrNoToUse}&lang=${lang}`);
// }

async function getSurveyUrls(patient, lang) {
  const db3 = await connectToThirdDatabase();
  const surveyData = await db3.collection('surveys').findOne({
    specialty: patient.speciality,
    hospital_code: patient.hospital_code,
    site_code: patient.site_code
  });

  const customSurveyNames = surveyData ? surveyData.custom : [];
  console.log(`\n🔍 Fetching surveys for patient: ${patient.Mr_no}`);
  console.log(`✅ Specialty: ${patient.speciality}`);
  console.log(`✅ Available Surveys:`, customSurveyNames);

  if (customSurveyNames.length === 0) {
    console.log(`⚠ No surveys found. Redirecting to API survey.`);
    return [`${process.env.API_SURVEY_URL}?mr_no=${patient.Mr_no}&lang=${lang}`];
  }

  // Get all surveys in appointment_tracker for the specialty
  const appointmentTracker = patient.appointment_tracker?.[patient.speciality] || [];

  // Determine valid surveys
  let validSurveys = [];

  if (patient.surveyStatus === "Completed") {
    console.log(`✅ SurveyStatus is Completed. Fetching all remaining "Not Completed" surveys.`);
    validSurveys = customSurveyNames.filter(survey => {
      const matchingAppt = appointmentTracker.find(ap => ap.survey_name.includes(survey));
      return matchingAppt && matchingAppt.surveyStatus === "Not Completed";
    });
  } else {
    console.log(`✅ SurveyStatus is Not Completed. Fetching first available "Not Completed" survey.`);
    for (let appt of appointmentTracker) {
      if (appt.surveyStatus === "Not Completed") {
        validSurveys.push(...appt.survey_name);
        break; // Stop after getting the first available survey
      }
    }
  }

  console.log(`✅ Valid Surveys to Start:`, validSurveys);

  const mrNoToUse = patient.hashedMrNo || patient.Mr_no;
  return validSurveys.map(s => `${basePath}/${s}?Mr_no=${mrNoToUse}&lang=${lang}`);
}




// router.get('/start-surveys', async (req, res) => {
//   const { hashedMrNo: Mr_no, DOB, lang } = req.query; // Extract hashedMrNo, DOB, and language preference

//   try {
//       const db = await connectToDatabase();
//       const collection = db.collection('patient_data');

//       // Find the patient using Mr_no or hashedMrNo
//       const patient = await collection.findOne({
//           $or: [{ Mr_no }, { hashedMrNo: Mr_no }]
//       });

//       if (!patient) {
//           req.flash('error', 'Patient not found'); // Set error message
//           return res.redirect(basePath + `/dob-validation?identifier=${Mr_no}&lang=${lang}`);
//       }

//       // Validate the entered DOB against the stored DOB
//       const formatDate = (date) => {
//           const d = new Date(date);
//           const month = String(d.getMonth() + 1).padStart(2, '0');
//           const day = String(d.getDate()).padStart(2, '0');
//           const year = d.getFullYear();
//           return `${month}/${day}/${year}`; // Format to mm/dd/yyyy
//       };

//       const formattedEnteredDOB = formatDate(DOB); // Format user-entered DOB
//       const formattedStoredDOB = formatDate(patient.DOB); // Format stored DOB

//       if (formattedEnteredDOB !== formattedStoredDOB) {
//         req.flash('error', 'Invalid Date of Birth. Please try again.'); 
//         return res.redirect(`${basePath}/dob-validation?identifier=${patient.hashedMrNo}&lang=${lang}`);
//     }
    
    

//       // Determine the Mr_no to use for URL masking
//       const mrNoToUse = patient.hashedMrNo || patient.Mr_no;

//       if (patient.surveyStatus === 'Completed') {
//           return res.redirect(basePath + `/details?Mr_no=${mrNoToUse}&lang=${lang}`);
//       }

//       // Get the survey URLs based on the patient's data
//       const surveyUrls = await getSurveyUrls(patient, lang);

//       if (surveyUrls.length > 0) {
//           const maskedSurveyUrl = surveyUrls[0].replace(`Mr_no=${patient.Mr_no}`, `Mr_no=${mrNoToUse}`);
//           return res.redirect(maskedSurveyUrl);
//       } else {
//           await db.collection('patient_data').findOneAndUpdate(
//               { Mr_no: patient.Mr_no },
//               { $set: { surveyStatus: 'Completed' } }
//           );
//           return res.redirect(basePath + `/details?Mr_no=${mrNoToUse}&lang=${lang}`);
//       }
//     } catch (error) {
//       console.error(error);
//       req.flash('error', 'Internal server error');
//       return res.render('dob-validation', {
//           Mr_no: null,
//           showTerms: false,
//           appointmentFinished: null,
//           flashMessage: req.flash('error'),
//           // Add this line:
//           currentLang: lang || 'en'
//       });
//   }
// });


router.get('/start-surveys', async (req, res) => {
  const { hashedMrNo: Mr_no, DOB, lang } = req.query;

  try {
    const db = await connectToDatabase();
    const collection = db.collection('patient_data');

    // Find the patient using Mr_no or hashedMrNo
    const patient = await collection.findOne({
      $or: [{ Mr_no }, { hashedMrNo: Mr_no }]
    });

    if (!patient) {
      console.log(`❌ Patient not found for Mr_no: ${Mr_no}`);
      req.flash('error', 'Patient not found');
      return res.redirect(`${basePath}/dob-validation?identifier=${Mr_no}&lang=${lang}`);
    }

    console.log(`\n🔍 Starting survey process for: ${patient.Mr_no}`);
    console.log(`✅ Patient Name: ${patient.firstname} ${patient.lastname}`);
    console.log(`✅ Specialty: ${patient.speciality}`);
    console.log(`✅ Current Survey Status: ${patient.surveyStatus}`);

    // Validate DOB
    const formatDate = (date) => {
      const d = new Date(date);
      return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
    };

    if (formatDate(DOB) !== formatDate(patient.DOB)) {
      console.log(`❌ DOB Mismatch! Entered: ${DOB}, Expected: ${patient.DOB}`);
      req.flash('error', 'Invalid Date of Birth. Please try again.');
      return res.redirect(`${basePath}/dob-validation?identifier=${patient.hashedMrNo}&lang=${lang}`);
    }

    // Determine the correct Mr_no to use for privacy
    const mrNoToUse = patient.hashedMrNo || patient.Mr_no;

    if (patient.surveyStatus === 'Completed') {
      console.log(`✅ All surveys completed! Redirecting to details page.`);
      return res.redirect(`${basePath}/details?Mr_no=${mrNoToUse}&lang=${lang}`);
    }

    // Fetch the valid survey URLs (filtered by appointment time)
    const surveyUrls = await getSurveyUrls(patient, lang);

    if (surveyUrls.length > 0) {
      console.log(`✅ Redirecting to the first available survey: ${surveyUrls[0]}`);
      return res.redirect(surveyUrls[0]);
    } else {
      console.log(`🎉 No more surveys pending. Marking survey process as completed.`);
      await collection.updateOne(
        { Mr_no: patient.Mr_no },
        { $set: { surveyStatus: 'Completed' } }
      );

      return res.redirect(`${basePath}/details?Mr_no=${mrNoToUse}&lang=${lang}`);
    }
  } catch (error) {
    console.error('❌ Error in /start-surveys:', error);
    req.flash('error', 'Internal server error');
    return res.render('dob-validation', {
      Mr_no: null,
      showTerms: false,
      appointmentFinished: null,
      flashMessage: req.flash('error'),
      currentLang: lang || 'en'
    });
  }
});




// const handleSurveySubmission = async (req, res, collectionName) => {
//   const formData = req.body;
//   const { Mr_no, lang } = formData; // Capture the lang from formData

//   const storageKey = collectionName === 'Global-Health_d' ? 'Global-Health' : collectionName;

//   try {
//     const patientData = await db1.collection('patient_data').findOne({ Mr_no });

//     if (patientData) {
//       let newIndex = 0;
//       if (patientData[storageKey]) {
//         newIndex = Object.keys(patientData[storageKey]).length;
//       }

//       const newKey = `${storageKey}_${newIndex}`;
//       formData.timestamp = new Date().toISOString();

//       const completionDateField = `${storageKey}_completionDate`;
//       const completionDate = new Date().toISOString();

//       // Set pre_post_indicator (assuming you already have this logic)
//       let prePostIndicator = 'pre_operative';
//       if (patientData.Events && patientData.Events.length > 0) {
//         const surveyTime = new Date(completionDate);
//         patientData.Events.forEach(event => {
//           const eventTime = new Date(event.date);
//           if (eventTime.getMonth() === surveyTime.getMonth() &&
//               eventTime.getFullYear() === surveyTime.getFullYear() &&
//               eventTime < surveyTime) {
//             prePostIndicator = 'post_operative';
//           }
//         });
//       }

//       // Prepare surveyEvents array and update the patient document with the new survey data
//       const surveyEvents = [{ surveyStatus: 'received', surveyTime: completionDate, surveyResult: formData }];
//       const surveyEvent = {
//         survey_id: `${collectionName.toLowerCase()}_${newIndex}`,
//         survey_name: collectionName,
//         site_code: patientData.site_code || 'default_site_code',
//         pre_post_indicator: prePostIndicator,
//         surveyEvents: surveyEvents
//       };

//       await db1.collection('patient_data').updateOne(
//         { Mr_no },
//         {
//           $set: {
//             [`${storageKey}.${newKey}`]: formData,
//             [completionDateField]: completionDate,
//             [`SurveyEntry.${collectionName}_${newIndex}`]: surveyEvent
//           }
//         }
//       );

//       // Redirect to the next survey with lang parameter
//       await handleNextSurvey(Mr_no, collectionName, lang, res);
//     } else {
//       console.log('No matching document found for Mr_no:', Mr_no);
//       return res.status(404).send('No matching document found');
//     }
//   } catch (error) {
//     console.error('Error updating form data:', error);
//     res.status(500).send('Internal server error');
//   }
// };

// const handleSurveySubmission = async (req, res, collectionName) => {
//   try {
//     const formData = req.body;
//     const { Mr_no, lang } = formData; // Capture language preference

//     if (!Mr_no) {
//       console.log(`❌ Missing Mr_no in request body.`);
//       return res.status(400).send('Missing Mr_no in the request.');
//     }

//     // Ensure correct storage key mapping
//     const storageKey = collectionName === 'Global-Health_d' ? 'Global-Health' : collectionName;

//     console.log(`\n📝 Submitting survey: ${collectionName}`);
//     console.log(`🔍 Fetching patient data for Mr_no: ${Mr_no}`);

//     // Find the patient document
//     const patientData = await db1.collection('patient_data').findOne({ Mr_no });

//     if (!patientData) {
//       console.log(`❌ No matching document found for Mr_no: ${Mr_no}`);
//       return res.status(404).send('No matching document found.');
//     }

//     console.log(`✅ Patient found: ${patientData.firstname} ${patientData.lastname}`);
//     console.log(`✅ Specialty: ${patientData.speciality}`);
//     console.log(`✅ Site Code: ${patientData.site_code}`);

//     // Determine the new index for survey storage
//     let newIndex = patientData[storageKey] ? Object.keys(patientData[storageKey]).length : 0;
//     const newKey = `${storageKey}_${newIndex}`;
    
//     // Set timestamp for survey submission
//     const completionDate = new Date().toISOString();
//     formData.timestamp = completionDate;
    
//     const completionDateField = `${storageKey}_completionDate`;

//     // Determine pre/post-operative indicator based on events
//     let prePostIndicator = 'pre_operative';
//     if (Array.isArray(patientData.Events)) {
//       const surveyTime = new Date(completionDate);
//       patientData.Events.forEach(event => {
//         const eventTime = new Date(event.date);
//         if (eventTime < surveyTime && 
//             eventTime.getMonth() === surveyTime.getMonth() &&
//             eventTime.getFullYear() === surveyTime.getFullYear()) {
//           prePostIndicator = 'post_operative';
//         }
//       });
//     }

//     console.log(`🔍 Pre/Post Indicator: ${prePostIndicator}`);

//     // Construct survey event entry
//     const surveyEvent = {
//       survey_id: `${collectionName.toLowerCase()}_${newIndex}`,
//       survey_name: collectionName,
//       site_code: patientData.site_code || 'default_site_code',
//       pre_post_indicator: prePostIndicator,
//       surveyEvents: [{ 
//         surveyStatus: 'received', 
//         surveyTime: completionDate, 
//         surveyResult: formData 
//       }]
//     };

//     console.log(`📌 Survey event ready for update:`, surveyEvent);

//     // Update patient document with the survey submission
//     await db1.collection('patient_data').updateOne(
//       { Mr_no },
//       {
//         $set: {
//           [`${storageKey}.${newKey}`]: formData,
//           [completionDateField]: completionDate,
//           [`SurveyEntry.${collectionName}_${newIndex}`]: surveyEvent
//         }
//       }
//     );

//     console.log(`✅ Survey ${collectionName} successfully submitted for Mr_no: ${Mr_no}`);

//     // Redirect to the next survey while respecting the appointment schedule
//     await handleNextSurvey(Mr_no, collectionName, lang, res);

//   } catch (error) {
//     console.error('❌ Error updating form data:', error);
//     return res.status(500).send('Internal server error.');
//   }
// };


const handleSurveySubmission = async (req, res, collectionName) => {
  try {
    const formData = req.body;
    const { Mr_no, lang } = formData; // Capture language preference

    if (!Mr_no) {
      console.log(`❌ Missing Mr_no in request body.`);
      return res.status(400).send('Missing Mr_no in the request.');
    }

    // Ensure correct storage key mapping
    const storageKey = collectionName === 'Global-Health_d' ? 'Global-Health' : collectionName;

    console.log(`\n📝 Submitting survey: ${collectionName}`);
    console.log(`🔍 Fetching patient data for Mr_no: ${Mr_no}`);

    // Find the patient document
    const patientData = await db1.collection('patient_data').findOne({ Mr_no });

    if (!patientData) {
      console.log(`❌ No matching document found for Mr_no: ${Mr_no}`);
      return res.status(404).send('No matching document found.');
    }

    console.log(`✅ Patient found: ${patientData.firstname} ${patientData.lastname}`);
    console.log(`✅ Specialty: ${patientData.speciality}`);
    console.log(`✅ Site Code: ${patientData.site_code}`);

    // Determine the new index for survey storage
    let newIndex = patientData[storageKey] ? Object.keys(patientData[storageKey]).length : 0;
    const newKey = `${storageKey}_${newIndex}`;
    
    // Set timestamp for survey submission
    const completionDate = new Date().toISOString();
    formData.timestamp = completionDate;
    
    const completionDateField = `${storageKey}_completionDate`;

    // Determine pre/post-operative indicator based on events
    let prePostIndicator = 'pre_operative';
    if (Array.isArray(patientData.Events)) {
      const surveyTime = new Date(completionDate);
      patientData.Events.forEach(event => {
        const eventTime = new Date(event.date);
        if (
          eventTime < surveyTime &&
          eventTime.getMonth() === surveyTime.getMonth() &&
          eventTime.getFullYear() === surveyTime.getFullYear()
        ) {
          prePostIndicator = 'post_operative';
        }
      });
    }

    console.log(`🔍 Pre/Post Indicator: ${prePostIndicator}`);

    // Construct survey event entry
    const surveyEvent = {
      survey_id: `${collectionName.toLowerCase()}_${newIndex}`,
      survey_name: collectionName,
      site_code: patientData.site_code || 'default_site_code',
      pre_post_indicator: prePostIndicator,
      surveyEvents: [
        { 
          surveyStatus: 'received',
          surveyTime: completionDate,
          surveyResult: formData
        }
      ]
    };

    console.log(`📌 Survey event ready for update:`, surveyEvent);

    // Update patient document with the survey submission
    await db1.collection('patient_data').updateOne(
      { Mr_no },
      {
        $set: {
          [`${storageKey}.${newKey}`]: formData,
          [completionDateField]: completionDate,
          [`SurveyEntry.${collectionName}_${newIndex}`]: surveyEvent
        }
      }
    );

    console.log(`✅ Survey ${collectionName} successfully submitted for Mr_no: ${Mr_no}`);

    // ➜ NEW: Mark the matching appointment "Completed" so getSurveyUrls won't return it again
    const appointmentField = `appointment_tracker.${patientData.speciality}`;
    await db1.collection('patient_data').updateOne(
      { Mr_no },
      {
        $set: {
          [`${appointmentField}.$[elem].surveyStatus`]: "Completed"
        }
      },
      {
        arrayFilters: [{ "elem.survey_name": { $in: [collectionName] } }]
      }
    );

    // Redirect to the next survey while respecting the appointment schedule
    await handleNextSurvey(Mr_no, collectionName, lang, res);

  } catch (error) {
    console.error('❌ Error updating form data:', error);
    return res.status(500).send('Internal server error.');
  }
};



router.post('/submit_Wexner', (req, res) => handleSurveySubmission(req, res, 'Wexner'));
router.post('/submit_ICIQ_UI_SF', (req, res) => handleSurveySubmission(req, res, 'ICIQ_UI_SF'));
router.post('/submitEPDS', (req, res) => handleSurveySubmission(req, res, 'EPDS'));
router.post('/submitPAID', (req, res) => handleSurveySubmission(req, res, 'PAID'));
router.post('/submitGlobal-Health', (req, res) => handleSurveySubmission(req, res, 'Global-Health'));
router.post('/submitGlobal-Health_d', (req, res) => handleSurveySubmission(req, res, 'Global-Health_d'));
router.post('/submitPain-Interference', (req, res) => handleSurveySubmission(req, res, 'Pain-Interference'));
router.post('/submitPhysical-Function', (req, res) => handleSurveySubmission(req, res, 'Physical-Function'));




// router.get('/Wexner', async (req, res) => {
//   let { Mr_no, lang } = req.query;

//   // If lang is undefined, set it to 'en' by default
//   if (!lang || lang === 'undefined') {
//     lang = 'en';
//   }

//   try {
//     // Fetch patient data using Mr_no or hashedMrNo
//     const patient = await db1.collection('patient_data').findOne({
//       $or: [{ Mr_no }, { hashedMrNo: Mr_no }]
//     });

//     if (!patient) {
//       return res.status(404).send('Patient not found');
//     }

//     // Fetch the custom survey names from the third database
//     const db3 = await connectToThirdDatabase();
//     const surveyData = await db3.collection('surveys').findOne({
//       specialty: patient.speciality,
//       hospital_code: patient.hospital_code,
//       site_code: patient.site_code
//     });

//     const customSurveyNames = surveyData ? surveyData.custom : [];

//     // Create an object to track the survey status for each survey
//     const surveyStatus = customSurveyNames.map(survey => {
//       const completionDateField = `${survey}_completionDate`;
//       return {
//         name: survey,
//         completed: Boolean(patient[completionDateField]), // true if completed
//         active: survey === 'Wexner' // Set to true for the current survey
//       };
//     });

//     // Render form.ejs with the surveyStatus list and currentLang
//     res.render('form', { Mr_no: patient.Mr_no, surveyStatus, currentLang: lang });
//   } catch (error) {
//     console.error('Error fetching data for Wexner survey:', error);
//     res.status(500).send('Internal server error');
//   }
// });




// router.get('/ICIQ_UI_SF', async (req, res) => {
//   let { Mr_no, lang } = req.query;

//   // If lang is undefined, set it to 'en' by default
//   if (!lang || lang === 'undefined') {
//     lang = 'en';
//   }

//   try {
//     // Fetch patient data using Mr_no or hashedMrNo
//     const patient = await db1.collection('patient_data').findOne({
//       $or: [{ Mr_no }, { hashedMrNo: Mr_no }]
//     });

//     if (!patient) {
//       return res.status(404).send('Patient not found');
//     }

//     // Fetch the custom survey names from the third database
//     const db3 = await connectToThirdDatabase();
//     const surveyData = await db3.collection('surveys').findOne({
//       specialty: patient.speciality,
//       hospital_code: patient.hospital_code,
//       site_code: patient.site_code
//     });

//     const customSurveyNames = surveyData ? surveyData.custom : [];

//     // Create an object to track the survey status for each survey
//     const surveyStatus = customSurveyNames.map(survey => {
//       const completionDateField = `${survey}_completionDate`;
//       return {
//         name: survey,
//         completed: Boolean(patient[completionDateField]), // true if completed
//         active: survey === 'ICIQ_UI_SF' // Set to true for the current survey
//       };
//     });

//     // Render ICIQ-UI_SF.ejs with the surveyStatus and currentLang
//     res.render('ICIQ_UI_SF', { Mr_no: patient.Mr_no, surveyStatus, currentLang: lang });
//   } catch (error) {
//     console.error('Error fetching data for ICIQ_UI SF:', error);
//     res.status(500).send('Error fetching data');
//   }
// });


// router.get('/EPDS', async (req, res) => {
//   const { Mr_no, lang = 'en' } = req.query;

//   try {
//     // Check if Mr_no is a hashed value and fetch the corresponding original Mr_no if necessary
//     let patient;
//     if (Mr_no.length === 64) { // Assuming SHA-256 hash length
//       patient = await db1.collection('patient_data').findOne({ hashedMrNo: Mr_no });
//     } else {
//       patient = await db1.collection('patient_data').findOne({ Mr_no });
//     }

//     if (!patient) {
//       return res.status(404).send('Patient not found');
//     }

//     // Now use the original Mr_no for subsequent operations
//     const originalMrNo = patient.Mr_no;

//     // Connect to the third database and fetch survey data
//     const db3 = await connectToThirdDatabase();
//     const surveyData = await db3.collection('surveys').findOne({
//       specialty: patient.speciality,
//       hospital_code: patient.hospital_code,
//       site_code: patient.site_code
//     });

//     const customSurveyNames = surveyData ? surveyData.custom : [];

//     // Create the survey status array
//     const surveyStatus = customSurveyNames.map(survey => {
//       const completionDateField = `${survey}_completionDate`;
//       return {
//         name: survey,
//         completed: Boolean(patient[completionDateField]), 
//         active: survey === 'EPDS'
//       };
//     });

//     // Render the EDPS EJS view with the original Mr_no, surveyStatus, and current language
//     res.render('EDPS', { Mr_no: originalMrNo, surveyStatus, currentLang: lang });
//   } catch (error) {
//     console.error('Error fetching patient data or survey data:', error);
//     res.status(500).send('Internal server error');
//   }
// });


// Example: inside your route that renders the EPDS view:
// router.get('/EPDS', async (req, res) => {
//   const { Mr_no, lang = 'en' } = req.query;

//   // 1) Fetch the patient record
//   const patient = await db1.collection('patient_data').findOne({
//     $or: [{ Mr_no }, { hashedMrNo: Mr_no }]
//   });
//   if (!patient) return res.status(404).send('Patient not found');

//   // 2) Grab the custom survey array from the “surveys” collection
//   const db3 = await connectToThirdDatabase();
//   const surveyData = await db3.collection('surveys').findOne({
//     specialty: patient.speciality,
//     hospital_code: patient.hospital_code,
//     site_code: patient.site_code
//   });
//   const customSurveyNames = surveyData ? surveyData.custom : [];

//   // 3) Build the usual surveyStatus array
//   const surveyStatus = customSurveyNames.map(survey => {
//     const doneField = survey + '_completionDate';
//     return {
//       name: survey,
//       completed: Boolean(patient[doneField]),     // true if done
//       active: survey === 'EPDS'                  // set active for current route
//     };
//   });

//   // 4) ALSO fetch the valid surveys (appointments not in the future, not completed) via getSurveyUrls
//   const validSurveyUrls = await getSurveyUrls(patient, lang);
//   //    Something like: [ "/patientsurveys/EPDS?Mr_no=xxxxx&lang=en" ]
//   //    So we just extract the survey names from those URLs:
//   const validNames = validSurveyUrls.map(url => {
//     // last chunk after the slash => "EPDS?Mr_no=..." => then split on "?" => "EPDS"
//     return url.split('/').pop().split('?')[0];
//   });

//   // 5) Now filter surveyStatus to keep only those surveys that appear in validNames
//   const filteredSurveyStatus = surveyStatus.filter(s => validNames.includes(s.name));

//   // 6) Render your EJS, passing the filtered array.  The sidebar will only show the valid ones.
//   res.render('EDPS', {
//     Mr_no: patient.Mr_no,
//     surveyStatus: filteredSurveyStatus,
//     currentLang: lang
//   });
// });





// router.get('/PAID', async (req, res) => {
//   const { Mr_no, lang = 'en' } = req.query;

//   try {
//     // Find patient using Mr_no or hashedMrNo
//     const patient = await db1.collection('patient_data').findOne({
//       $or: [{ Mr_no }, { hashedMrNo: Mr_no }]
//     });

//     if (!patient) {
//       return res.status(404).send('Patient not found');
//     }

//     // Fetch custom survey data from the manage_doctors database
//     const db3 = await connectToThirdDatabase();
//     const surveyData = await db3.collection('surveys').findOne({
//       specialty: patient.speciality,
//       hospital_code: patient.hospital_code,
//       site_code: patient.site_code
//     });

//     const customSurveyNames = surveyData ? surveyData.custom : [];

//     // Create a survey status object to track the survey's status
//     const surveyStatus = customSurveyNames.map(survey => {
//       const completionDateField = `${survey}_completionDate`;
//       return {
//         name: survey,
//         completed: Boolean(patient[completionDateField]), // true if completed
//         active: survey === 'PAID' // Set to true for the current survey
//       };
//     });

//     // Render the PAID form with survey status and language preferences
//     res.render('PAID', { Mr_no: patient.Mr_no, surveyStatus, currentLang: lang });
//   } catch (error) {
//     console.error('Error fetching data for PAID survey:', error);
//     res.status(500).send('Internal server error');
//   }
// });



// router.get('/Global-Health', async (req, res) => {
//   let { Mr_no, lang } = req.query; // Default lang to 'en'

//   // Ensure lang is set to 'en' if undefined
//   if (!lang || lang === 'undefined') {
//     lang = 'en';
//   }

//   try {
//     // Fetch patient data from the primary database (db1) using Mr_no or hashedMrNo
//     const patient = await db1.collection('patient_data').findOne({
//       $or: [{ Mr_no }, { hashedMrNo: Mr_no }]
//     });

//     if (!patient) {
//       return res.status(404).send('Patient not found');
//     }

//     // Fetch the custom survey names from the third database (db3)
//     const db3 = await connectToThirdDatabase();
//     const surveyData = await db3.collection('surveys').findOne({
//       specialty: patient.speciality,
//       hospital_code: patient.hospital_code,
//       site_code: patient.site_code
//     });

//     const customSurveyNames = surveyData ? surveyData.custom : [];

//     // Create an object to track the survey status for each survey
//     const surveyStatus = customSurveyNames.map(survey => {
//       const completionDateField = `${survey}_completionDate`;
//       return {
//         name: survey,
//         completed: Boolean(patient[completionDateField]), // true if completed
//         active: survey === 'Global-Health' // Set to true for the current survey
//       };
//     });

//     // Render the Global-Health.ejs view with the surveyStatus and currentLang
//     res.render('Global-Health', { Mr_no: patient.Mr_no, surveyStatus, currentLang: lang });
//   } catch (error) {
//     console.error('Error fetching patient or survey data:', error);
//     return res.status(500).send('Error fetching patient or survey data');
//   }
// });



// router.get('/Global-Health_d', async (req, res) => {
//   const { Mr_no, lang = 'en' } = req.query;
  
//   // Fetch patient data
//   const patient = await db1.collection('patient_data').findOne({ Mr_no });
  
//   // Fetch the custom survey names from the third database
//   const db3 = await connectToThirdDatabase();
//   const surveyData = await db3.collection('surveys').findOne({
//     specialty: patient.speciality,
//     hospital_code: patient.hospital_code,
//     site_code: patient.site_code
//   });

//   const customSurveyNames = surveyData ? surveyData.custom : [];

//   // Create an object to track the survey status for each survey
//   const surveyStatus = customSurveyNames.map(survey => {
//     const completionDateField = `${survey}_completionDate`;
//     return {
//       name: survey,
//       completed: Boolean(patient[completionDateField]), // true if completed
//       active: survey === 'Global-Health_d' // Set to true for the current survey
//     };
//   });

//   // Render Global-Health_d.ejs with the surveyStatus list and currentLang
//   res.render('Global-Health_d', { Mr_no, surveyStatus, currentLang: lang });
// });

// router.get('/Pain-Interference', async (req, res) => {
//   const { Mr_no, lang = 'en' } = req.query;

//   try {
//     const patient = await db1.collection('patient_data').findOne({
//       $or: [{ Mr_no }, { hashedMrNo: Mr_no }]
//     });

//     if (!patient) {
//       return res.status(404).send('Patient not found');
//     }

//     const db3 = await connectToThirdDatabase();
//     const surveyData = await db3.collection('surveys').findOne({
//       specialty: patient.speciality,
//       hospital_code: patient.hospital_code,
//       site_code: patient.site_code
//     });

//     const customSurveyNames = surveyData ? surveyData.custom : [];

//     const surveyStatus = customSurveyNames.map(survey => {
//       const completionDateField = `${survey}_completionDate`;
//       return {
//         name: survey,
//         completed: Boolean(patient[completionDateField]),
//         active: survey === 'Pain-Interference'
//       };
//     });

//     res.render('Pain-Interference', { Mr_no: patient.Mr_no, surveyStatus, currentLang: lang });
//   } catch (error) {
//     console.error('Error fetching data for Pain-Interference survey:', error);
//     res.status(500).send('Internal server error');
//   }
// });

// router.get('/Physical-Function', async (req, res) => {
//   const { Mr_no, lang = 'en' } = req.query;

//   try {
//     // Find patient using Mr_no or hashedMrNo
//     const patient = await db1.collection('patient_data').findOne({
//       $or: [{ Mr_no }, { hashedMrNo: Mr_no }]
//     });

//     if (!patient) {
//       return res.status(404).send('Patient not found');
//     }

//     // Fetch custom survey data from the manage_doctors database
//     const db3 = await connectToThirdDatabase();
//     const surveyData = await db3.collection('surveys').findOne({
//       specialty: patient.speciality,
//       hospital_code: patient.hospital_code,
//       site_code: patient.site_code
//     });

//     const customSurveyNames = surveyData ? surveyData.custom : [];

//     // Create a survey status object to track the survey's status
//     const surveyStatus = customSurveyNames.map(survey => {
//       const completionDateField = `${survey}_completionDate`;
//       return {
//         name: survey,
//         completed: Boolean(patient[completionDateField]), // true if completed
//         active: survey === 'Physical-Function' // Set to true for the current survey
//       };
//     });

//     // Render the Physical-Function form with survey status and language preferences
//     res.render('Physical-Function', { Mr_no: patient.Mr_no, surveyStatus, currentLang: lang });
//   } catch (error) {
//     console.error('Error fetching data for Physical-Function survey:', error);
//     res.status(500).send('Internal server error');
//   }
// });


//////////////////////////////////////////////////////////////////////////////
// GET /Wexner
//////////////////////////////////////////////////////////////////////////////
router.get('/Wexner', async (req, res) => {
  const { Mr_no, lang = 'en' } = req.query;
  const routeSurveyName = 'Wexner';

  try {
    // 1) Fetch the patient record
    const patient = await db1.collection('patient_data').findOne({
      $or: [{ Mr_no }, { hashedMrNo: Mr_no }]
    });
    if (!patient) return res.status(404).send('Patient not found');

    // 2) Grab the custom surveys from the third DB
    const db3 = await connectToThirdDatabase();
    const surveyData = await db3.collection('surveys').findOne({
      specialty: patient.speciality,
      hospital_code: patient.hospital_code,
      site_code: patient.site_code
    });
    const customSurveyNames = surveyData ? surveyData.custom : [];

    // 3) Build the usual surveyStatus array
    const surveyStatus = customSurveyNames.map(survey => {
      const doneField = survey + '_completionDate';
      return {
        name: survey,
        completed: Boolean(patient[doneField]),
        active: survey === routeSurveyName
      };
    });

    // 4) Get valid surveys from getSurveyUrls
    const validSurveyUrls = await getSurveyUrls(patient, lang);
    const validNames = validSurveyUrls.map(url => url.split('/').pop().split('?')[0]);

    // 5) Filter the main list to only show valid surveys
    const filteredSurveyStatus = surveyStatus.filter(s => validNames.includes(s.name));

    // 6) Render with the filtered array
    res.render('form', {
      Mr_no: patient.Mr_no,
      surveyStatus: filteredSurveyStatus,
      currentLang: lang
    });
  } catch (error) {
    console.error('Error fetching data for Wexner survey:', error);
    res.status(500).send('Internal server error');
  }
});


//////////////////////////////////////////////////////////////////////////////
// GET /ICIQ_UI_SF
//////////////////////////////////////////////////////////////////////////////
router.get('/ICIQ_UI_SF', async (req, res) => {
  const { Mr_no, lang = 'en' } = req.query;
  const routeSurveyName = 'ICIQ_UI_SF';

  try {
    // 1) Fetch the patient record
    const patient = await db1.collection('patient_data').findOne({
      $or: [{ Mr_no }, { hashedMrNo: Mr_no }]
    });
    if (!patient) return res.status(404).send('Patient not found');

    // 2) Grab the custom surveys from the third DB
    const db3 = await connectToThirdDatabase();
    const surveyData = await db3.collection('surveys').findOne({
      specialty: patient.speciality,
      hospital_code: patient.hospital_code,
      site_code: patient.site_code
    });
    const customSurveyNames = surveyData ? surveyData.custom : [];

    // 3) Build surveyStatus
    const surveyStatus = customSurveyNames.map(survey => {
      const doneField = survey + '_completionDate';
      return {
        name: survey,
        completed: Boolean(patient[doneField]),
        active: survey === routeSurveyName
      };
    });

    // 4) Filter by valid surveys
    const validSurveyUrls = await getSurveyUrls(patient, lang);
    const validNames = validSurveyUrls.map(url => url.split('/').pop().split('?')[0]);
    const filteredSurveyStatus = surveyStatus.filter(s => validNames.includes(s.name));

    // 5) Render
    res.render('ICIQ_UI_SF', {
      Mr_no: patient.Mr_no,
      surveyStatus: filteredSurveyStatus,
      currentLang: lang
    });
  } catch (error) {
    console.error('Error fetching data for ICIQ_UI_SF survey:', error);
    res.status(500).send('Internal server error');
  }
});


//////////////////////////////////////////////////////////////////////////////
// GET /EPDS (already updated, but here's the same style for reference)
//////////////////////////////////////////////////////////////////////////////
router.get('/EPDS', async (req, res) => {
  const { Mr_no, lang = 'en' } = req.query;
  const routeSurveyName = 'EPDS';

  try {
    // 1) Fetch the patient
    const patient = await db1.collection('patient_data').findOne({
      $or: [{ Mr_no }, { hashedMrNo: Mr_no }]
    });
    if (!patient) return res.status(404).send('Patient not found');

    // 2) Grab the custom surveys
    const db3 = await connectToThirdDatabase();
    const surveyData = await db3.collection('surveys').findOne({
      specialty: patient.speciality,
      hospital_code: patient.hospital_code,
      site_code: patient.site_code
    });
    const customSurveyNames = surveyData ? surveyData.custom : [];

    // 3) Build surveyStatus
    const surveyStatus = customSurveyNames.map(survey => {
      const doneField = survey + '_completionDate';
      return {
        name: survey,
        completed: Boolean(patient[doneField]),
        active: survey === routeSurveyName
      };
    });

    // 4) getSurveyUrls => filter
    const validSurveyUrls = await getSurveyUrls(patient, lang);
    const validNames = validSurveyUrls.map(url => url.split('/').pop().split('?')[0]);
    const filteredSurveyStatus = surveyStatus.filter(s => validNames.includes(s.name));

    // 5) Render
    res.render('EDPS', {
      Mr_no: patient.Mr_no,
      surveyStatus: filteredSurveyStatus,
      currentLang: lang
    });
  } catch (error) {
    console.error('Error fetching EPDS survey data:', error);
    res.status(500).send('Internal server error');
  }
});


//////////////////////////////////////////////////////////////////////////////
// GET /PAID
//////////////////////////////////////////////////////////////////////////////
router.get('/PAID', async (req, res) => {
  const { Mr_no, lang = 'en' } = req.query;
  const routeSurveyName = 'PAID';

  try {
    // 1) Patient
    const patient = await db1.collection('patient_data').findOne({
      $or: [{ Mr_no }, { hashedMrNo: Mr_no }]
    });
    if (!patient) return res.status(404).send('Patient not found');

    // 2) custom surveys
    const db3 = await connectToThirdDatabase();
    const surveyData = await db3.collection('surveys').findOne({
      specialty: patient.speciality,
      hospital_code: patient.hospital_code,
      site_code: patient.site_code
    });
    const customSurveyNames = surveyData ? surveyData.custom : [];

    // 3) Build status
    const surveyStatus = customSurveyNames.map(survey => {
      const doneField = survey + '_completionDate';
      return {
        name: survey,
        completed: Boolean(patient[doneField]),
        active: survey === routeSurveyName
      };
    });

    // 4) Filter by valid surveys
    const validSurveyUrls = await getSurveyUrls(patient, lang);
    const validNames = validSurveyUrls.map(url => url.split('/').pop().split('?')[0]);
    const filteredSurveyStatus = surveyStatus.filter(s => validNames.includes(s.name));

    // 5) Render
    res.render('PAID', {
      Mr_no: patient.Mr_no,
      surveyStatus: filteredSurveyStatus,
      currentLang: lang
    });
  } catch (error) {
    console.error('Error fetching PAID survey:', error);
    res.status(500).send('Internal server error');
  }
});


//////////////////////////////////////////////////////////////////////////////
// GET /Global-Health
//////////////////////////////////////////////////////////////////////////////
router.get('/Global-Health', async (req, res) => {
  const { Mr_no, lang = 'en' } = req.query;
  const routeSurveyName = 'Global-Health';

  try {
    // 1) Patient
    const patient = await db1.collection('patient_data').findOne({
      $or: [{ Mr_no }, { hashedMrNo: Mr_no }]
    });
    if (!patient) return res.status(404).send('Patient not found');

    // 2) custom surveys
    const db3 = await connectToThirdDatabase();
    const surveyData = await db3.collection('surveys').findOne({
      specialty: patient.speciality,
      hospital_code: patient.hospital_code,
      site_code: patient.site_code
    });
    const customSurveyNames = surveyData ? surveyData.custom : [];

    // 3) Build status
    const surveyStatus = customSurveyNames.map(survey => {
      const doneField = survey + '_completionDate';
      return {
        name: survey,
        completed: Boolean(patient[doneField]),
        active: survey === routeSurveyName
      };
    });

    // 4) Filter
    const validSurveyUrls = await getSurveyUrls(patient, lang);
    const validNames = validSurveyUrls.map(url => url.split('/').pop().split('?')[0]);
    const filteredSurveyStatus = surveyStatus.filter(s => validNames.includes(s.name));

    // 5) Render
    res.render('Global-Health', {
      Mr_no: patient.Mr_no,
      surveyStatus: filteredSurveyStatus,
      currentLang: lang
    });
  } catch (error) {
    console.error('Error in /Global-Health:', error);
    res.status(500).send('Internal server error');
  }
});


//////////////////////////////////////////////////////////////////////////////
// GET /Global-Health_d
//////////////////////////////////////////////////////////////////////////////
router.get('/Global-Health_d', async (req, res) => {
  const { Mr_no, lang = 'en' } = req.query;
  const routeSurveyName = 'Global-Health_d';

  try {
    // 1) Patient
    const patient = await db1.collection('patient_data').findOne({
      $or: [{ Mr_no }, { hashedMrNo: Mr_no }]
    });
    if (!patient) return res.status(404).send('Patient not found');

    // 2) custom surveys
    const db3 = await connectToThirdDatabase();
    const surveyData = await db3.collection('surveys').findOne({
      specialty: patient.speciality,
      hospital_code: patient.hospital_code,
      site_code: patient.site_code
    });
    const customSurveyNames = surveyData ? surveyData.custom : [];

    // 3) Build status
    const surveyStatus = customSurveyNames.map(survey => {
      const doneField = survey + '_completionDate';
      return {
        name: survey,
        completed: Boolean(patient[doneField]),
        active: survey === routeSurveyName
      };
    });

    // 4) Filter
    const validSurveyUrls = await getSurveyUrls(patient, lang);
    const validNames = validSurveyUrls.map(url => url.split('/').pop().split('?')[0]);
    const filteredSurveyStatus = surveyStatus.filter(s => validNames.includes(s.name));

    // 5) Render
    res.render('Global-Health_d', {
      Mr_no: patient.Mr_no,
      surveyStatus: filteredSurveyStatus,
      currentLang: lang
    });
  } catch (error) {
    console.error('Error in /Global-Health_d:', error);
    res.status(500).send('Internal server error');
  }
});


//////////////////////////////////////////////////////////////////////////////
// GET /Pain-Interference
//////////////////////////////////////////////////////////////////////////////
router.get('/Pain-Interference', async (req, res) => {
  const { Mr_no, lang = 'en' } = req.query;
  const routeSurveyName = 'Pain-Interference';

  try {
    // 1) Patient
    const patient = await db1.collection('patient_data').findOne({
      $or: [{ Mr_no }, { hashedMrNo: Mr_no }]
    });
    if (!patient) return res.status(404).send('Patient not found');

    // 2) custom surveys
    const db3 = await connectToThirdDatabase();
    const surveyData = await db3.collection('surveys').findOne({
      specialty: patient.speciality,
      hospital_code: patient.hospital_code,
      site_code: patient.site_code
    });
    const customSurveyNames = surveyData ? surveyData.custom : [];

    // 3) Build status
    const surveyStatus = customSurveyNames.map(survey => {
      const doneField = survey + '_completionDate';
      return {
        name: survey,
        completed: Boolean(patient[doneField]),
        active: survey === routeSurveyName
      };
    });

    // 4) Filter
    const validSurveyUrls = await getSurveyUrls(patient, lang);
    const validNames = validSurveyUrls.map(url => url.split('/').pop().split('?')[0]);
    const filteredSurveyStatus = surveyStatus.filter(s => validNames.includes(s.name));

    // 5) Render
    res.render('Pain-Interference', {
      Mr_no: patient.Mr_no,
      surveyStatus: filteredSurveyStatus,
      currentLang: lang
    });
  } catch (error) {
    console.error('Error in /Pain-Interference:', error);
    res.status(500).send('Internal server error');
  }
});


//////////////////////////////////////////////////////////////////////////////
// GET /Physical-Function
//////////////////////////////////////////////////////////////////////////////
router.get('/Physical-Function', async (req, res) => {
  const { Mr_no, lang = 'en' } = req.query;
  const routeSurveyName = 'Physical-Function';

  try {
    // 1) Patient
    const patient = await db1.collection('patient_data').findOne({
      $or: [{ Mr_no }, { hashedMrNo: Mr_no }]
    });
    if (!patient) return res.status(404).send('Patient not found');

    // 2) custom surveys
    const db3 = await connectToThirdDatabase();
    const surveyData = await db3.collection('surveys').findOne({
      specialty: patient.speciality,
      hospital_code: patient.hospital_code,
      site_code: patient.site_code
    });
    const customSurveyNames = surveyData ? surveyData.custom : [];

    // 3) Build status
    const surveyStatus = customSurveyNames.map(survey => {
      const doneField = survey + '_completionDate';
      return {
        name: survey,
        completed: Boolean(patient[doneField]),
        active: survey === routeSurveyName
      };
    });

    // 4) Filter
    const validSurveyUrls = await getSurveyUrls(patient, lang);
    const validNames = validSurveyUrls.map(url => url.split('/').pop().split('?')[0]);
    const filteredSurveyStatus = surveyStatus.filter(s => validNames.includes(s.name));

    // 5) Render
    res.render('Physical-Function', {
      Mr_no: patient.Mr_no,
      surveyStatus: filteredSurveyStatus,
      currentLang: lang
    });
  } catch (error) {
    console.error('Error in /Physical-Function:', error);
    res.status(500).send('Internal server error');
  }
});


router.post('/submit', async (req, res) => {
  const formData = req.body;
  const { Mr_no } = formData; // Mr_no passed from the form

  try {
      // Find the document in patient_data collection that matches Mr_no
      const patientData = await db1.collection('patient_data').findOne({ Mr_no });

      if (patientData) {
          // Calculate the index for the new CCFFIS object
          let newIndex = 0;
          if (patientData.CCFFIS) {
              newIndex = Object.keys(patientData.CCFFIS).length;
          }

          // Construct the new CCFFIS object key with the calculated index
          const newCCFFISKey = `CCFFIS_${newIndex}`;

          // Get the current date and time
          const currentDate = new Date();
          const timestamp = currentDate.toISOString(); // Convert to ISO string format

          // Add timestamp to the form data
          formData.timestamp = timestamp;

          // Construct the new CCFFIS object with the calculated key and form data
          const newCCFFIS = { [newCCFFISKey]: formData };

          // Update the document with the new CCFFIS object
          await db1.collection('patient_data').updateOne(
              { Mr_no },
              { $set: { [`CCFFIS.${newCCFFISKey}`]: formData } }
          );

          // Send success response
          // return res.status(200).send('CCFFIS object created successfully');

  // Send the HTML content as the response
  res.status(200).send(htmlContent);


      } else {
          // If no document found for the given Mr_no
          console.log('No matching document found for Mr_no:', Mr_no);
          return res.status(404).send('No matching document found');
      }
  } catch (error) {
      console.error('Error updating form data:', error);
      return res.status(500).send('Error updating form data');
  }
});


// const handleNextSurvey = async (Mr_no, currentSurvey, lang, res) => {
//   try {
//     // Retrieve the patient data from patient_data
//     const patientData = await db1.collection('patient_data').findOne({ Mr_no });
//     if (!patientData) {
//       return res.status(404).send('Patient not found');
//     }

//     // Retrieve the custom surveys list from the surveys collection in the third database
//     const db3 = await connectToThirdDatabase();
//     const surveyData = await db3.collection('surveys').findOne({
//       specialty: patientData.speciality,
//       hospital_code: patientData.hospital_code,
//       site_code: patientData.site_code
//     });

//     const customSurveyNames = surveyData ? surveyData.custom : [];
//     const apiSurvey = surveyData ? surveyData.API : [];

//     if (customSurveyNames.length === 0) {
//       return res.status(404).send('No custom surveys found.');
//     }

//     // Find the index of the current survey in the custom array
//     const currentSurveyIndex = customSurveyNames.indexOf(currentSurvey);

//     // If the current survey is the last one, mark the custom surveys as completed
//     if (currentSurveyIndex === customSurveyNames.length - 1) {
//       // Record the custom survey completion time
//       const completionTime = new Date().toISOString();

//       await db1.collection('patient_data').updateOne(
//         { Mr_no },
//         { $set: { customSurveyTimeCompletion: completionTime } }
//       );

//       // If API surveys exist and custom surveys are done, redirect to the API survey using plain Mr_no
//       if (apiSurvey && apiSurvey.length > 0) {
//         return res.redirect(`${process.env.API_SURVEY_URL}?mr_no=${Mr_no}&lang=${lang}`);
//       } else {
//         // Otherwise, mark the survey as completed
//         await db1.collection('patient_data').updateOne(
//           { Mr_no },
//           { $set: { surveyStatus: 'Completed' } }
//         );

//         // Redirect to the details page with lang parameter and use masked Mr_no if available
//         const mrNoToUse = patientData.hashedMrNo || Mr_no;
//         return res.redirect(`${basePath}/details?Mr_no=${mrNoToUse}&lang=${lang}`);
//       }
//     }

//     // Get the next survey in the custom array and construct the URL with masked Mr_no if available
//     const nextSurvey = customSurveyNames[currentSurveyIndex + 1];
//     const mrNoToUse = patientData.hashedMrNo || Mr_no; // Use hashedMrNo if available
//     const nextSurveyUrl = `${basePath}/${nextSurvey}?Mr_no=${mrNoToUse}&lang=${lang}`;

//     // Redirect to the next survey
//     return res.redirect(nextSurveyUrl);
//   } catch (error) {
//     console.error('Error determining the next survey:', error);
//     return res.status(500).send('Internal server error');
//   }
// };


const handleNextSurvey = async (Mr_no, currentSurvey, lang, res) => {
  try {
    // 1) Fetch the patient data
    const patientData = await db1.collection('patient_data').findOne({ Mr_no });
    if (!patientData) {
      return res.status(404).send('Patient not found');
    }

    // 2) Retrieve the custom and API surveys from the third DB
    const db3 = await connectToThirdDatabase();
    const surveyData = await db3.collection('surveys').findOne({
      specialty: patientData.speciality,
      hospital_code: patientData.hospital_code,
      site_code: patientData.site_code
    });
    const customSurveyNames = surveyData ? surveyData.custom : [];
    const apiSurvey = surveyData ? surveyData.API : [];

    if (customSurveyNames.length === 0) {
      return res.status(404).send('No custom surveys found.');
    }

    // 3) Get the *current* list of valid/pending surveys from getSurveyUrls
    const validSurveyUrls = await getSurveyUrls(patientData, lang); 
    // e.g. [ "/patientsurveys/EPDS?Mr_no=xxxx&lang=en", ... ]

    // 4) Convert those URLs into just the survey names, e.g. ["EPDS", "Wexner", ...]
    const validSurveyNames = validSurveyUrls.map(url => {
      return url.split('/').pop().split('?')[0]; // last chunk before "?Mr_no=..."
    });

    // If no valid surveys remain at all, or the "current" survey isn't in that list,
    // we mark custom surveys done and jump to API or "details."
    if (validSurveyNames.length === 0 || !validSurveyNames.includes(currentSurvey)) {
      const completionTime = new Date().toISOString();
      await db1.collection('patient_data').updateOne(
        { Mr_no },
        { $set: { customSurveyTimeCompletion: completionTime } }
      );

      if (apiSurvey && apiSurvey.length > 0) {
        return res.redirect(`${process.env.API_SURVEY_URL}?mr_no=${Mr_no}&lang=${lang}`);
      } else {
        await db1.collection('patient_data').updateOne(
          { Mr_no },
          { $set: { surveyStatus: 'Completed' } }
        );
        const mrNoToUse = patientData.hashedMrNo || Mr_no;
        return res.redirect(`${basePath}/details?Mr_no=${mrNoToUse}&lang=${lang}`);
      }
    }

    // 5) Otherwise, find the index of this current survey in the valid list
    const currentIndex = validSurveyNames.indexOf(currentSurvey);

    // If this current is at the end, mark done or go to API
    if (currentIndex === validSurveyNames.length - 1) {
      const completionTime = new Date().toISOString();
      await db1.collection('patient_data').updateOne(
        { Mr_no },
        { $set: { customSurveyTimeCompletion: completionTime } }
      );

      if (apiSurvey && apiSurvey.length > 0) {
        return res.redirect(`${process.env.API_SURVEY_URL}?mr_no=${Mr_no}&lang=${lang}`);
      } else {
        await db1.collection('patient_data').updateOne(
          { Mr_no },
          { $set: { surveyStatus: 'Completed' } }
        );
        const mrNoToUse = patientData.hashedMrNo || Mr_no;
        return res.redirect(`${basePath}/details?Mr_no=${mrNoToUse}&lang=${lang}`);
      }
    }

    // 6) Otherwise, go to the next valid survey
    const nextSurvey = validSurveyNames[currentIndex + 1];
    const mrNoToUse = patientData.hashedMrNo || Mr_no;
    const nextSurveyUrl = `${basePath}/${nextSurvey}?Mr_no=${mrNoToUse}&lang=${lang}`;
    return res.redirect(nextSurveyUrl);

  } catch (error) {
    console.error('Error determining the next survey:', error);
    return res.status(500).send('Internal server error');
  }
};


router.post('/submit_Wexner', async (req, res) => {
  const formData = req.body;
  const { Mr_no, lang = 'en' } = formData; // Default lang to 'en' if not provided

  try {
    // Fetch the patient document using Mr_no or hashedMrNo
    const patientData = await db1.collection('patient_data').findOne({
      $or: [{ Mr_no }, { hashedMrNo: Mr_no }]
    });

    if (!patientData) {
      return res.status(404).send('Patient not found');
    }

    // Determine the next index for Wexner entries
    let newIndex = 0;
    if (patientData.Wexner) {
      newIndex = Object.keys(patientData.Wexner).length;
    }

    // Create a new key for this Wexner entry
    const newWexnerKey = `Wexner_${newIndex}`;

    // Add a timestamp to the form data
    formData.timestamp = new Date().toISOString();

    // Update the patient document with the new Wexner data
    await db1.collection('patient_data').updateOne(
      { Mr_no: patientData.Mr_no },
      {
        $set: {
          [`Wexner.${newWexnerKey}`]: formData,
          'Wexner_completionDate': formData.timestamp
        }
      }
    );

    // Redirect to the next survey or mark surveys as completed
    await handleNextSurvey(patientData.Mr_no, 'Wexner', lang, res);  // Use the actual Mr_no when redirecting
  } catch (error) {
    console.error('Error updating Wexner form data:', error);
    return res.status(500).send('Error updating Wexner form data');
  }
});


router.post('/submit_ICIQ_UI_SF', async (req, res) => {
  const formData = req.body;
  const { Mr_no, lang = 'en' } = formData;  // Default lang to 'en' if not provided

  try {
    // Process form data and find the patient
    const patientData = await db1.collection('patient_data').findOne({ Mr_no });

    if (patientData) {
      // Calculate new index for ICIQ-UI SF form submissions
      let newIndex = 0;
      if (patientData.ICIQ_UI_SF) {
        newIndex = Object.keys(patientData.ICIQ_UI_SF).length;
      }

      // Create new key for the ICIQ-UI SF submission
      const newICIQKey = `ICIQ_UI_SF_${newIndex}`;
      formData.timestamp = new Date().toISOString();

      // Update patient document with the new ICIQ-UI SF data and timestamp
      await db1.collection('patient_data').updateOne(
        { Mr_no },
        { $set: { [`ICIQ_UI_SF.${newICIQKey}`]: formData, 'ICIQ_UI_SF_completionDate': formData.timestamp } }
      );

      // Redirect to the next survey or mark surveys as completed
      await handleNextSurvey(Mr_no, 'ICIQ_UI_SF', lang, res);  // Use the lang when redirecting
    } else {
      return res.status(404).send('Patient not found');
    }
  } catch (error) {
    console.error('Error updating ICIQ_UI SF form data:', error);
    return res.status(500).send('Error updating ICIQ_UI SF form data');
  }
});


router.post('/submit_ICIQ_UI_SF', async (req, res) => {
  const formData = req.body;
  const { Mr_no, lang = 'en' } = formData;  // Default lang to 'en' if not provided

  try {
    // Process form data and find the patient using Mr_no or hashedMrNo
    const patientData = await db1.collection('patient_data').findOne({
      $or: [{ Mr_no }, { hashedMrNo: Mr_no }]
    });

    if (!patientData) {
      return res.status(404).send('Patient not found');
    }

    // Calculate new index for ICIQ-UI SF form submissions
    let newIndex = 0;
    if (patientData.ICIQ_UI_SF) {
      newIndex = Object.keys(patientData.ICIQ_UI_SF).length;
    }

    // Create new key for the ICIQ-UI SF submission
    const newICIQKey = `ICIQ_UI_SF_${newIndex}`;
    formData.timestamp = new Date().toISOString();

    // Update patient document with the new ICIQ-UI SF data and timestamp
    await db1.collection('patient_data').updateOne(
      { Mr_no: patientData.Mr_no },
      {
        $set: {
          [`ICIQ_UI_SF.${newICIQKey}`]: formData,
          'ICIQ_UI_SF_completionDate': formData.timestamp
        }
      }
    );

    // Redirect to the next survey or mark surveys as completed
    await handleNextSurvey(patientData.Mr_no, 'ICIQ_UI_SF', lang, res);  // Use the actual Mr_no when redirecting
  } catch (error) {
    console.error('Error updating ICIQ_UI SF form data:', error);
    return res.status(500).send('Error updating ICIQ_UI SF form data');
  }
});


router.post('/submitEPDS', async (req, res) => {
  const formData = req.body;
  let { Mr_no, lang = 'en' } = formData; // Capture lang from formData, default to 'en' if not provided

  try {
    // Check if Mr_no is a hashed value and map it to the original Mr_no if necessary
    let patientData;
    if (Mr_no.length === 64) { // Assuming SHA-256 hash length
      patientData = await db1.collection('patient_data').findOne({ hashedMrNo: Mr_no });
      if (patientData) {
        Mr_no = patientData.Mr_no; // Update Mr_no to the original value
      }
    } else {
      patientData = await db1.collection('patient_data').findOne({ Mr_no });
    }

    if (patientData) {
      // Determine the new index for EPDS entries
      let newIndex = 0;
      if (patientData.EPDS) {
        newIndex = Object.keys(patientData.EPDS).length;
      }

      // Create a new key for the EPDS entry and add a timestamp
      const newEPDSKey = `EPDS_${newIndex}`;
      formData.timestamp = new Date().toISOString();

      // Update the patient document with the new EPDS entry and completion date
      await db1.collection('patient_data').updateOne(
        { Mr_no },
        { $set: { [`EPDS.${newEPDSKey}`]: formData, 'EPDS_completionDate': formData.timestamp } }
      );

      // Redirect to the next survey or mark surveys as completed with the lang parameter
      await handleNextSurvey(Mr_no, 'EPDS', lang, res);
    } else {
      return res.status(404).send('Patient not found');
    }
  } catch (error) {
    console.error('Error updating EPDS form data:', error);
    return res.status(500).send('Error updating EPDS form data');
  }
});


router.post('/submitPAID', async (req, res) => {
  const formData = req.body;
  const { Mr_no, lang = 'en' } = formData; // Capture lang from formData, default to 'en' if not provided

  try {
    // Find the patient document using Mr_no or hashedMrNo
    const patientData = await db1.collection('patient_data').findOne({
      $or: [{ Mr_no }, { hashedMrNo: Mr_no }]
    });

    if (!patientData) {
      return res.status(404).send('Patient not found');
    }

    // Determine the next index for PAID entries
    let newIndex = 0;
    if (patientData.PAID) {
      newIndex = Object.keys(patientData.PAID).length;
    }

    // Create a new key for this PAID entry
    const newPAIDKey = `PAID_${newIndex}`;

    // Add a timestamp to the form data
    formData.timestamp = new Date().toISOString();

    // Update the patient document with the new PAID data
    await db1.collection('patient_data').updateOne(
      { Mr_no: patientData.Mr_no },
      {
        $set: {
          [`PAID.${newPAIDKey}`]: formData,
          'PAID_completionDate': formData.timestamp
        }
      }
    );

    // Handle the next survey or complete the process
    await handleNextSurvey(patientData.Mr_no, 'PAID', lang, res); // Use the actual Mr_no when redirecting
  } catch (error) {
    console.error('Error submitting PAID form data:', error);
    return res.status(500).send('Error submitting PAID form data');
  }
});


router.post('/submitGlobal-Health', async (req, res) => {
  const formData = req.body;
  const { Mr_no, lang = 'en' } = formData; // Ensure lang is passed and default to 'en' if missing

  try {
    // Find the patient document in the patient_data collection using Mr_no or hashedMrNo
    const patientData = await db1.collection('patient_data').findOne({
      $or: [{ Mr_no }, { hashedMrNo: Mr_no }]
    });

    if (!patientData) {
      return res.status(404).send('Patient not found');
    }

    // Calculate the new index for the Global-Health data
    let newIndex = 0;
    if (patientData['Global-Health']) {
      newIndex = Object.keys(patientData['Global-Health']).length;
    }

    // Construct the new Global-Health object key
    const newPROMIS10Key = `Global-Health_${newIndex}`;

    // Add timestamp to the form data
    formData.timestamp = new Date().toISOString();

    // Update the patient document with the new Global-Health data
    await db1.collection('patient_data').updateOne(
      { Mr_no: patientData.Mr_no },
      {
        $set: {
          [`Global-Health.${newPROMIS10Key}`]: formData,
          'Global-Health_completionDate': formData.timestamp
        }
      }
    );

    // Redirect to the next survey or mark surveys as completed
    await handleNextSurvey(patientData.Mr_no, 'Global-Health', lang, res);
  } catch (error) {
    console.error('Error updating Global-Health form data:', error);
    return res.status(500).send('Error updating Global-Health form data');
  }
});


router.post('/submitGlobal-Health_d', async (req, res) => {
  const formData = req.body;
  const { Mr_no } = formData; // Mr_no passed from the form

  try {
    // Find the patient document in the patient_data collection that matches Mr_no
    const patientData = await db1.collection('patient_data').findOne({ Mr_no });

    if (patientData) {
      // Calculate the index for the new Global-Health_d object
      let newIndex = 0;
      if (patientData['Global-Health_d']) {
        newIndex = Object.keys(patientData['Global-Health_d']).length;
      }

      // Construct the new Global-Health_d object key with the calculated index
      const newPROMIS10_dKey = `Global-Health_d_${newIndex}`;

      // Add timestamp to the form data
      formData.timestamp = new Date().toISOString();

      // Update the patient document with the new Global-Health_d data
      await db1.collection('patient_data').updateOne(
        { Mr_no },
        { $set: { [`Global-Health_d.${newPROMIS10_dKey}`]: formData, 'Global-Health_d_completionDate': formData.timestamp } }
      );

      // Redirect to the next survey or mark surveys as completed
      await handleNextSurvey(Mr_no, 'Global-Health_d', formData.lang, res);
    } else {
      return res.status(404).send('Patient not found');
    }
  } catch (error) {
    console.error('Error updating Global-Health_d form data:', error);
    return res.status(500).send('Error updating Global-Health_d form data');
  }
});

router.post('/submitPain-Interference', async (req, res) => {
  const formData = req.body;
  const { Mr_no, lang = 'en' } = formData;

  try {
    const patientData = await db1.collection('patient_data').findOne({
      $or: [{ Mr_no }, { hashedMrNo: Mr_no }]
    });

    if (!patientData) {
      return res.status(404).send('Patient not found');
    }

    let newIndex = 0;
    if (patientData['Pain-Interference']) {
      newIndex = Object.keys(patientData['Pain-Interference']).length;
    }

    const newPAIN10bKey = `Pain-Interference_${newIndex}`;
    formData.timestamp = new Date().toISOString();

    await db1.collection('patient_data').updateOne(
      { Mr_no: patientData.Mr_no },
      {
        $set: {
          [`Pain-Interference.${newPAIN10bKey}`]: formData,
          'Pain-Interference_completionDate': formData.timestamp
        }
      }
    );

    await handleNextSurvey(patientData.Mr_no, 'Pain-Interference', lang, res);
  } catch (error) {
    console.error('Error submitting Pain-Interference form data:', error);
    return res.status(500).send('Error submitting Pain-Interference form data');
  }
});

router.post('/submitPhysical-Function', async (req, res) => {
  const formData = req.body;
  const { Mr_no, lang = 'en' } = formData;

  try {
    const patientData = await db1.collection('patient_data').findOne({
      $or: [{ Mr_no }, { hashedMrNo: Mr_no }]
    });

    if (!patientData) {
      return res.status(404).send('Patient not found');
    }

    // Determine the new index for Physical-Function entries
    let newIndex = 0;
    if (patientData['Physical-Function']) {
      newIndex = Object.keys(patientData['Physical-Function']).length;
    }

    // Create a new key for this Physical-Function entry
    const newPHYSICALKey = `Physical-Function_${newIndex}`;

    // Add a timestamp to the form data
    formData.timestamp = new Date().toISOString();

    // Update the patient document with the new Physical-Function data
    await db1.collection('patient_data').updateOne(
      { Mr_no: patientData.Mr_no },
      {
        $set: {
          [`Physical-Function.${newPHYSICALKey}`]: formData,
          'Physical-Function_completionDate': formData.timestamp
        }
      }
    );

    // Handle the next survey or complete the process
    await handleNextSurvey(patientData.Mr_no, 'Physical-Function', lang, res);
  } catch (error) {
    console.error('Error submitting Physical-Function form data:', error);
    return res.status(500).send('Error submitting Physical-Function form data');
  }
});


// Mount the router at the base path
app.use(basePath, router);


app.listen(PORT, () => {
  console.log(`The patient surveys flow is running at http://localhost${basePath}`);
});