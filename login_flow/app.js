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

// router.get('/', (req, res) => {
//   const flashMessage = req.flash('error'); // Retrieve flash messages
//   res.render('search', { flashMessage }); // Pass the flash message to the view
// });



// router.get('/search', async (req, res) => {
//   const { identifier } = req.query;
//   const flashMessage = req.flash('error'); // Retrieve flash messages

//   try {
//       const db = await connectToDatabase(); // Establish connection to the MongoDB database
//       const collection = db.collection('patient_data');

//       // Find the patient by plain MR number or phone number
//       const patient = await collection.findOne({
//           $or: [
//               { Mr_no: identifier },
//               { phoneNumber: identifier }
//           ]
//       });

//       if (!patient) {
//           req.flash('error', 'Patient not found'); // Set flash message
//           return res.redirect(basePath + '/'); // Redirect to the search page
//       }

//       // Use hashedMrNo for all further references
//       const hashedMrNo = patient.hashedMrNo;

//       // Check if appointmentFinished is present or absent
//       const showTerms = !patient.appointmentFinished; // If appointmentFinished is absent, show terms
//       const appointmentFinished = patient.appointmentFinished; // Add the appointmentFinished value

//       // Redirect to `dob-validation` page with `hashMrNo` in the URL
//       res.redirect(`${basePath}/dob-validation?identifier=${hashedMrNo}`);
//   } catch (error) {
//       console.error(error);
//       req.flash('error', 'Internal server error'); // Set flash message
//       res.redirect(basePath + '/'); // Redirect to the search page
//   }
// });

//New with Arabic search Page(flash message)

router.get('/', (req, res) => {
  const lang         = req.query.lang || (req.cookies && req.cookies.lang) || 'en';
  const flashMessage = req.flash('error');
  res.render('search', {
    flashMessage,
    currentLang: lang
  });
});


router.get('/search', async (req, res) => {
  
  const { identifier, lang = 'en' } = req.query;
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
        const errorMsg = (lang === 'ar')
          ? 'لم يتم العثور على المريض'
          : 'Patient not found';
  
        req.flash('error', errorMsg);
        return res.redirect(`${basePath}/?lang=${lang}`);  // keep language
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




// router.get('/dob-validation', async (req, res) => {
//   const { identifier, lang } = req.query; // Get the patient's identifier and language preference
//   const flashMessage = req.flash('error'); // Retrieve any error messages

//   try {
//       const db = await connectToDatabase();
//       const collection = db.collection('patient_data');

//       // Retrieve patient using `hashedMrNo`
//       const patient = await collection.findOne({ hashedMrNo: identifier });

//       if (!patient) {
//           req.flash('error', 'Patient not found'); // Set error message
//           return res.render('dob-validation', {
//               Mr_no: null,
//               showTerms: false,
//               appointmentFinished: null,
//               flashMessage: req.flash('error'),
//               currentLang: lang || 'en', // Pass default language as 'en' if not provided
//           }); // Re-render with an error
//       }

//       // Check if appointmentFinished is present or absent
//       const showTerms = !patient.appointmentFinished;
//       const appointmentFinished = patient.appointmentFinished;

//       // Render the `dob-validation` view
//       res.render('dob-validation', {
//           Mr_no: patient.Mr_no,
//           showTerms,
//           appointmentFinished,
//           flashMessage, // Pass any error messages to the template
//           currentLang: lang || 'en', // Pass the current language preference
//       });
//   } catch (error) {
//       console.error(error);
//       req.flash('error', 'Internal server error'); // Set error message
//       res.render('dob-validation', {
//           Mr_no: null,
//           showTerms: false,
//           appointmentFinished: null,
//           flashMessage: req.flash('error'),
//           currentLang: 'en', // Default language on error
//       }); // Re-render with an error
//   }
// });






//this is working


// ------------------------------------------------------------------
// GET /dob-validation   (only this route is changed)
// ------------------------------------------------------------------
router.get('/dob-validation', async (req, res) => {
  const { identifier, lang } = req.query;            // identifier **is already hashedMrNo**
  const flashMessage = req.flash('error');

  try {
    const db         = await connectToDatabase();
    const collection = db.collection('patient_data');

    // look‑up strictly by hashedMrNo
    const patient = await collection.findOne({ hashedMrNo: identifier });

    if (!patient) {
      req.flash('error', 'Patient not found');
      return res.render('dob-validation', {
        Mr_no:            null,
        showTerms:        false,
        appointmentFinished: null,
        flashMessage:     req.flash('error'),
        currentLang:      lang || 'en'
      });
    }

    const showTerms          = !patient.appointmentFinished;
    const appointmentFinished = patient.appointmentFinished;

    // ⬇️ expose only the *hashed* MR number to the template so the form that
    //     posts to /start‑surveys will send ?hashedMrNo=<hash> instead of plain MR
    res.render('dob-validation', {
      // Mr_no:            patient.hashedMrNo,   // <-- was patient.Mr_no
  Mr_no:            patient.hashedMrNo,
  displayMrNo:      patient.Mr_no,        // plain MR number for the heading
  hashedMrNo:       patient.hashedMrNo,   // hash for the hidden field
      showTerms,
      appointmentFinished,
      flashMessage,
      currentLang:      lang || 'en'
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'Internal server error');
    res.render('dob-validation', {
      Mr_no:            null,
      displayMrNo:      null,
      hashedMrNo:       null,
      showTerms:        false,
      appointmentFinished: null,
      flashMessage:     req.flash('error'),
      currentLang:      'en'
    });
  }
});


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
      ['Global-Health', 'PAID','PAID-5','PHQ-2','EQ-5D', 'Global-Health_d', 'Wexner', 'ICIQ_UI_SF', 'EPDS', 'Pain-Interference', 'Physical-Function'].forEach(survey => {
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
          -H "Content-Type: application/json" -d "{\\"mr_no\\": \\"${patient.Mr_no}\\"}"`);
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
            -H "Content-Type: application/json" -d "{\\"mr_no\\": \\"${patient.Mr_no}\\"}"`),
          exec(`curl -X POST http://localhost:3055/patientlogin/api_script \
            -H "Content-Type: application/json" -d "{\\"mr_no\\": \\"${patient.Mr_no}\\"}"`)
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

//   if (customSurveyNames.length === 0) {
//     console.log(`⚠ No surveys found. Redirecting to API survey.`);
//     return [`${process.env.API_SURVEY_URL}?mr_no=${patient.Mr_no}&lang=${lang}`];
//   }

//   // Get all surveys in appointment_tracker for the specialty
//   const appointmentTracker = patient.appointment_tracker?.[patient.speciality] || [];

//   // Determine valid surveys
//   let validSurveys = [];

//   if (patient.surveyStatus === "Completed") {
//     console.log(`✅ SurveyStatus is Completed. Fetching all remaining "Not Completed" surveys.`);
//     validSurveys = customSurveyNames.filter(survey => {
//       const matchingAppt = appointmentTracker.find(ap => ap.survey_name.includes(survey));
//       return matchingAppt && matchingAppt.surveyStatus === "Not Completed";
//     });
//   } else {
//     console.log(`✅ SurveyStatus is Not Completed. Fetching first available "Not Completed" survey.`);
//     for (let appt of appointmentTracker) {
//       if (appt.surveyStatus === "Not Completed") {
//         validSurveys.push(...appt.survey_name);
//         break; // Stop after getting the first available survey
//       }
//     }
//   }

//   console.log(`✅ Valid Surveys to Start:`, validSurveys);

//   const mrNoToUse = patient.hashedMrNo || patient.Mr_no;
//   return validSurveys.map(s => `${basePath}/${s}?Mr_no=${mrNoToUse}&lang=${lang}`);
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

//   if (customSurveyNames.length === 0) {
//     console.log(`⚠ No surveys found. Redirecting to API survey.`);
//     return [`${process.env.API_SURVEY_URL}?mr_no=${patient.Mr_no}&lang=${lang}`];
//   }

//   const appointmentTracker = patient.appointment_tracker?.[patient.speciality] || [];

//   let validSurveys = [];

//   if (patient.surveyStatus === "Completed") {
//     console.log(`✅ SurveyStatus is Completed. Fetching all remaining "Not Completed" surveys.`);
//     validSurveys = customSurveyNames.filter(survey => {
//       const matchingAppt = appointmentTracker.find(ap => ap.survey_name.includes(survey));
//       return matchingAppt && matchingAppt.surveyStatus === "Not Completed";
//     });
//   } else {
//     console.log(`✅ SurveyStatus is Not Completed. Fetching first available "Not Completed" survey.`);
//     for (let appt of appointmentTracker) {
//       if (appt.surveyStatus === "Not Completed") {
//         validSurveys.push(...appt.survey_name);
//         break;
//       }
//     }
//   }

//   console.log(`✅ Valid Surveys to Start:`, validSurveys);

//   const mrNoToUse = patient.hashedMrNo || patient.Mr_no;
//   return validSurveys.map(s => `${basePath}/${s}?Mr_no=${mrNoToUse}&lang=${lang}`);
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

//   if (customSurveyNames.length === 0) {
//     console.log(`⚠ No surveys found. Redirecting to API survey.`);
//     return [
//       `${process.env.API_SURVEY_URL}?mr_no=${patient.Mr_no}&lang=${lang}`
//     ];
//   }

//   const appointmentTracker =
//     patient.appointment_tracker?.[patient.speciality] || [];

//   let validSurveys = [];

//   if (patient.surveyStatus === 'Completed') {
//     console.log(
//       `✅ SurveyStatus is Completed. Fetching all remaining "Not Completed" surveys.`
//     );
//     validSurveys = customSurveyNames.filter((survey) => {
//       const matchingAppt = appointmentTracker.find((ap) =>
//         ap.survey_name.includes(survey)
//       );
//       return matchingAppt && matchingAppt.surveyStatus === 'Not Completed';
//     });
//   } else {
//     console.log(
//       `✅ SurveyStatus is Not Completed. Fetching first available "Not Completed" survey.`
//     );
//     for (let appt of appointmentTracker) {
//       if (appt.surveyStatus === 'Not Completed') {
//         validSurveys.push(...appt.survey_name);
//         break;
//       }
//     }
//   }

//   console.log(`✅ Valid Surveys to Start:`, validSurveys);

//   // 🚫 never expose plain MR_no – always hashed
//   const mrNoToUse = patient.hashedMrNo;
//   return validSurveys.map(
//     (s) => `${basePath}/${s}?Mr_no=${mrNoToUse}&lang=${lang}`
//   );
// }


async function getSurveyUrls(patient, lang) {
    if (!patient || !patient.speciality || (!patient.Mr_no && !patient.hashedMrNo)) {
        console.error('\U0001F6AB Critical error in getSurveyUrls: Invalid patient object.', patient);
        return [];
    }

    const db3 = await connectToThirdDatabase();
    const surveyDataConfig = await db3.collection('surveys').findOne({
        specialty: patient.speciality,
        hospital_code: patient.hospital_code,
        site_code: patient.site_code
    });

    const customSurveyNamesFromConfig = surveyDataConfig ? surveyDataConfig.custom : [];
    const patientIdentifier = patient.Mr_no || patient.hashedMrNo;
    console.log(`\n\U0001F50D getSurveyUrls for patient: ${patientIdentifier}, Specialty: ${patient.speciality}`);
    console.log(`\u2705 Configured Custom Surveys for Specialty: [${customSurveyNamesFromConfig.join(', ')}]`);

    if (customSurveyNamesFromConfig.length === 0) {
        console.log(`\u2139 No custom surveys configured for specialty: ${patient.speciality}.`);
        return [];
    }

    const appointmentsForSpecialty = patient.appointment_tracker?.[patient.speciality] || [];
    let pendingSurveysForUrls = [];
    const currentBasePath = app.locals.basePath || '/patientsurveys'; // Ensure basePath is accessible

    console.log(`\u2139 Found ${appointmentsForSpecialty.length} appointments for specialty ${patient.speciality}.`);

    for (let i = 0; i < appointmentsForSpecialty.length; i++) {
        const appointment = appointmentsForSpecialty[i];
        if (!appointment || !Array.isArray(appointment.survey_name)) {
            console.log(`\u26A0 Appointment index ${i} is invalid or has no survey_name array. Skipping.`);
            continue;
        }
        console.log(`\u27A1 Checking Appointment index ${i}: Status='${appointment.surveyStatus}', Surveys='[${appointment.survey_name.join(', ')}]'`);

        if (appointment.surveyStatus === "Not Completed") {
            console.log(`\u2705 Found 'Not Completed' appointment (index ${i}). Checking its surveys: [${appointment.survey_name.join(', ')}]`);
            let foundPendingInThisAppointment = false;
            for (const surveyName of appointment.survey_name) {
                if (!customSurveyNamesFromConfig.includes(surveyName)) {
                    console.log(`\u26A0 Survey '${surveyName}' from appt index ${i} is NOT in current central config. Skipping.`);
                    continue;
                }
                if (!appointment.completed_in_appointment || appointment.completed_in_appointment[surveyName] !== true) {
                    pendingSurveysForUrls.push(surveyName);
                    console.log(`\u2795 Added PENDING survey '${surveyName}' from appt index ${i}.`);
                    foundPendingInThisAppointment = true;
                } else {
                    console.log(`\u2714 Survey '${surveyName}' in appt index ${i} is already completed_in_appointment.`);
                }
            }
            if (foundPendingInThisAppointment) {
                console.log(`\u2705 Returning pending surveys from current 'Not Completed' appointment (index ${i}): [${pendingSurveysForUrls.join(', ')}]`);
                break; 
            } else if (appointment.survey_name.length > 0) {
                console.log(`\u2139 All configured surveys in 'Not Completed' appointment (index ${i}) are individually done or not in config. This appointment might now be complete. Checking next appointment.`);
            } else {
                 console.log(`\u2139 'Not Completed' appointment (index ${i}) has no relevant surveys.`);
            }
        }
    }
    console.log(`\u2705 Final list of pending survey names for URLs (getSurveyUrls): [${pendingSurveysForUrls.join(', ')}]`);
    const mrNoToUseInUrl = patient.hashedMrNo || patient.Mr_no; 
    if (!mrNoToUseInUrl) {
        console.error("\U0001F6AB Critical error in getSurveyUrls: mrNoToUseInUrl undefined for patient:", patientIdentifier);
        return [];
    }
    return pendingSurveysForUrls.map(
        (s) => `${currentBasePath}/${s}?Mr_no=${mrNoToUseInUrl}&lang=${lang}`
    );
}







// router.get('/start-surveys', async (req, res) => {
//   const { hashedMrNo: Mr_no, DOB, lang } = req.query;

//   try {
//     const db = await connectToDatabase();
//     const collection = db.collection('patient_data');

//     // Find the patient using Mr_no or hashedMrNo
//     const patient = await collection.findOne({
//       $or: [{ Mr_no }, { hashedMrNo: Mr_no }]
//     });

//     if (!patient) {
//       console.log(`❌ Patient not found for Mr_no: ${Mr_no}`);
//       req.flash('error', 'Patient not found');
//       return res.redirect(`${basePath}/dob-validation?identifier=${Mr_no}&lang=${lang}`);
//     }

//     console.log(`\n🔍 Starting survey process for: ${patient.Mr_no}`);
//     console.log(`✅ Patient Name: ${patient.firstname} ${patient.lastname}`);
//     console.log(`✅ Specialty: ${patient.speciality}`);
//     console.log(`✅ Current Survey Status: ${patient.surveyStatus}`);

//     // Validate DOB
//     const formatDate = (date) => {
//       const d = new Date(date);
//       return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
//     };

//     if (formatDate(DOB) !== formatDate(patient.DOB)) {
//       console.log(`❌ DOB Mismatch! Entered: ${DOB}, Expected: ${patient.DOB}`);
//       req.flash('error', 'Invalid Date of Birth. Please try again.');
//       return res.redirect(`${basePath}/dob-validation?identifier=${patient.hashedMrNo}&lang=${lang}`);
//     }

//     // Determine the correct Mr_no to use for privacy
//     const mrNoToUse = patient.hashedMrNo || patient.Mr_no;

//     if (patient.surveyStatus === 'Completed') {
//       console.log(`✅ All surveys completed! Redirecting to details page.`);
//       return res.redirect(`${basePath}/details?Mr_no=${mrNoToUse}&lang=${lang}`);
//     }

//     // Fetch the valid survey URLs (filtered by appointment time)
//     const surveyUrls = await getSurveyUrls(patient, lang);

//     if (surveyUrls.length > 0) {
//       console.log(`✅ Redirecting to the first available survey: ${surveyUrls[0]}`);
//       return res.redirect(surveyUrls[0]);
//     } else {
//       console.log(`🎉 No more surveys pending. Marking survey process as completed.`);
//       await collection.updateOne(
//         { Mr_no: patient.Mr_no },
//         { $set: { surveyStatus: 'Completed' } }
//       );

//       return res.redirect(`${basePath}/details?Mr_no=${mrNoToUse}&lang=${lang}`);
//     }
//   } catch (error) {
//     console.error('❌ Error in /start-surveys:', error);
//     req.flash('error', 'Internal server error');
//     return res.render('dob-validation', {
//       Mr_no: null,
//       showTerms: false,
//       appointmentFinished: null,
//       flashMessage: req.flash('error'),
//       currentLang: lang || 'en'
//     });
//   }
// });


//new code of submission


// router.get('/start-surveys', async (req, res) => {
//   const { hashedMrNo: Mr_no, DOB, lang } = req.query;

//   try {
//     const db = await connectToDatabase();
//     const collection = db.collection('patient_data');

//     // Find the patient using Mr_no or hashedMrNo
//     const patient = await collection.findOne({
//       $or: [{ Mr_no }, { hashedMrNo: Mr_no }]
//     });

//     if (!patient) {
//       console.log(`❌ Patient not found for Mr_no: ${Mr_no}`);
//       req.flash('error', 'Patient not found');
//       return res.redirect(`${basePath}/dob-validation?identifier=${Mr_no}&lang=${lang}`);
//     }

//     console.log(`\n🔍 Starting survey process for: ${patient.Mr_no}`);
//     console.log(`✅ Patient Name: ${patient.firstname} ${patient.lastname}`);
//     console.log(`✅ Specialty: ${patient.speciality}`);
//     console.log(`✅ Current Survey Status: ${patient.surveyStatus}`);

//     // Validate DOB
//     const formatDate = (date) => {
//       const d = new Date(date);
//       return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(
//         d.getDate()
//       ).padStart(2, '0')}/${d.getFullYear()}`;
//     };

//     if (formatDate(DOB) !== formatDate(patient.DOB)) {
//       console.log(`❌ DOB Mismatch! Entered: ${DOB}, Expected: ${patient.DOB}`);
//       req.flash('error', 'Invalid Date of Birth. Please try again.');
//       return res.redirect(`${basePath}/dob-validation?identifier=${patient.hashedMrNo}&lang=${lang}`);
//     }

//     // always pass the hashed MR number forward
//     const mrNoToUse = patient.hashedMrNo;

//     if (patient.surveyStatus === 'Completed') {
//       console.log(`✅ All surveys completed! Redirecting to details page.`);
//       return res.redirect(`${basePath}/details?Mr_no=${mrNoToUse}&lang=${lang}`);
//     }

//     // Fetch the valid survey URLs
//     const surveyUrls = await getSurveyUrls(patient, lang);

//     if (surveyUrls.length > 0) {
//       console.log(`✅ Redirecting to the first available survey: ${surveyUrls[0]}`);
//       return res.redirect(surveyUrls[0]);
//     } else {
//       console.log(`🎉 No more surveys pending. Marking survey process as completed.`);
//       await collection.updateOne(
//         { Mr_no: patient.Mr_no },
//         { $set: { surveyStatus: 'Completed' } }
//       );

//       return res.redirect(`${basePath}/details?Mr_no=${mrNoToUse}&lang=${lang}`);
//     }
//   } catch (error) {
//     console.error('❌ Error in /start-surveys:', error);
//     req.flash('error', 'Internal server error');
//     return res.render('dob-validation', {
//       Mr_no: null,
//       showTerms: false,
//       appointmentFinished: null,
//       flashMessage: req.flash('error'),
//       currentLang: lang || 'en'
//     });
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
      
      // Localized error message
      const errorMessage = lang === 'ar' 
        ? 'لم يتم العثور على المريض' 
        : 'Patient not found';
      
      req.flash('error', errorMessage);
      return res.redirect(`${basePath}/dob-validation?identifier=${Mr_no}&lang=${lang}`);
    }

    console.log(`\n🔍 Starting survey process for: ${patient.Mr_no}`);
    console.log(`✅ Patient Name: ${patient.firstname} ${patient.lastname}`);
    console.log(`✅ Specialty: ${patient.speciality}`);
    console.log(`✅ Current Survey Status: ${patient.surveyStatus}`);

    // Validate DOB
    const formatDate = (date) => {
      const d = new Date(date);
      return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(
        d.getDate()
      ).padStart(2, '0')}/${d.getFullYear()}`;
    };

    if (formatDate(DOB) !== formatDate(patient.DOB)) {
      console.log(`❌ DOB Mismatch! Entered: ${DOB}, Expected: ${patient.DOB}`);
      
      // Localized error message for DOB validation
      const errorMessage = lang === 'ar' 
        ? 'تاريخ الميلاد غير صالح. الرجاء المحاولة مرة أخرى.' 
        : 'Invalid Date of Birth. Please try again.';
      
      req.flash('error', errorMessage);
      return res.redirect(`${basePath}/dob-validation?identifier=${patient.hashedMrNo}&lang=${lang}`);
    }

    // always pass the hashed MR number forward
    const mrNoToUse = patient.hashedMrNo;

    if (patient.surveyStatus === 'Completed') {
      console.log(`✅ All surveys completed! Redirecting to details page.`);
      return res.redirect(`${basePath}/details?Mr_no=${mrNoToUse}&lang=${lang}`);
    }

    // Fetch the valid survey URLs
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
    
    // Localized error message for general error
    const errorMessage = lang === 'ar' 
      ? 'خطأ في الخادم الداخلي' 
      : 'Internal server error';
    
    req.flash('error', errorMessage);
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
//   try {
//     const formData = req.body;
//     const { Mr_no, lang } = formData;

//     if (!Mr_no) {
//       console.log(`❌ Missing Mr_no in request body.`);
//       return res.status(400).send('Missing Mr_no in the request.');
//     }

//     const storageKey = collectionName === 'Global-Health_d' ? 'Global-Health' : collectionName;

//     console.log(`\n📝 Submitting survey: ${collectionName}`);
//     console.log(`🔍 Fetching patient data for Mr_no: ${Mr_no}`);

//     const patientData = await db1.collection('patient_data').findOne({ Mr_no });

//     if (!patientData) {
//       console.log(`❌ No matching document found for Mr_no: ${Mr_no}`);
//       return res.status(404).send('No matching document found.');
//     }

//     console.log(`✅ Patient found: ${patientData.firstname} ${patientData.lastname}`);
//     console.log(`✅ Specialty: ${patientData.speciality}`);
//     console.log(`✅ Site Code: ${patientData.site_code}`);

//     // 1) Store the newly submitted survey
//     let newIndex = patientData[storageKey] ? Object.keys(patientData[storageKey]).length : 0;
//     const newKey = `${storageKey}_${newIndex}`;
    
//     const completionDate = new Date().toISOString();
//     formData.timestamp = completionDate;
    
//     const completionDateField = `${storageKey}_completionDate`;

//     let prePostIndicator = 'pre_operative';
//     if (Array.isArray(patientData.Events)) {
//       const surveyTime = new Date(completionDate);
//       patientData.Events.forEach(event => {
//         const eventTime = new Date(event.date);
//         if (
//           eventTime < surveyTime &&
//           eventTime.getMonth() === surveyTime.getMonth() &&
//           eventTime.getFullYear() === surveyTime.getFullYear()
//         ) {
//           prePostIndicator = 'post_operative';
//         }
//       });
//     }

//     console.log(`🔍 Pre/Post Indicator: ${prePostIndicator}`);

//     const surveyEvent = {
//       survey_id: `${collectionName.toLowerCase()}_${newIndex}`,
//       survey_name: collectionName,
//       site_code: patientData.site_code || 'default_site_code',
//       pre_post_indicator: prePostIndicator,
//       surveyEvents: [
//         { 
//           surveyStatus: 'received',
//           surveyTime: completionDate,
//           surveyResult: formData
//         }
//       ]
//     };

//     console.log(`📌 Survey event ready for update:`, surveyEvent);

//     // Update the patient's survey data in Mongo
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

//     // Also update locally so we can check if all surveys are done
//     patientData[completionDateField] = completionDate;

//     console.log(`✅ Survey ${collectionName} successfully submitted for Mr_no: ${Mr_no}`);

//     // 2) Check if there's exactly one appointment with surveyStatus=Not Completed
//     //    and that contains this survey. If that item is truly all done, set it = "Completed".
//     const appointmentField = `appointment_tracker.${patientData.speciality}`;
//     const appointments = patientData.appointment_tracker?.[patientData.speciality] || [];

//     // Find the single appointment that is Not Completed and includes this survey
//     const apptIndex = appointments.findIndex(ap =>
//       ap.surveyStatus === "Not Completed" &&
//       Array.isArray(ap.survey_name) &&
//       ap.survey_name.includes(collectionName)
//     );

//     if (apptIndex !== -1) {
//       const currentAppt = appointments[apptIndex];
//       // Are all surveys in this appt's survey_name now done?
//       const allSurveysDone = currentAppt.survey_name.every(surveyName => {
//         const doneField = `${surveyName}_completionDate`;
//         return Boolean(patientData[doneField]);
//       });

//       if (allSurveysDone) {
//         await db1.collection('patient_data').updateOne(
//           { Mr_no },
//           {
//             $set: {
//               [`${appointmentField}.${apptIndex}.surveyStatus`]: "Completed"
//             }
//           }
//         );
//         console.log(`✅ Marked appointment #${apptIndex} as Completed (all surveys finished).`);
//       }
//     }

//     // 3) Finally, move to the "next" survey in the flow
//     await handleNextSurvey(Mr_no, collectionName, lang, res);

//   } catch (error) {
//     console.error('❌ Error updating form data:', error);
//     return res.status(500).send('Internal server error.');
//   }
// };


// const handleSurveySubmission = async (req, res, collectionName) => {
//     try {
//         const formData = req.body;
//         const { Mr_no: mrNoFromForm, lang = 'en' } = formData; 
//         const currentBasePath = app.locals.basePath || '/patientsurveys';

//         if (!mrNoFromForm) {
//             console.log(`\u274C Missing Mr_no in request body for ${collectionName}.`);
//             req.flash('error', 'Patient identifier missing.');
//             return res.redirect(`${currentBasePath}/?lang=${lang}`);
//         }
        
//         const patientData = await db1.collection('patient_data').findOne({
//             $or: [{ Mr_no: mrNoFromForm }, { hashedMrNo: mrNoFromForm }]
//         });

//         if (!patientData) {
//             console.log(`\u274C No matching document found for identifier: ${mrNoFromForm} (submitting ${collectionName}).`);
//             req.flash('error', 'Patient not found.');
//             return res.redirect(`${currentBasePath}/dob-validation?identifier=${mrNoFromForm}&lang=${lang}`);
//         }
//         const actualMrNo = patientData.Mr_no; 

//         const storageKey = collectionName === 'Global-Health_d' ? 'Global-Health' : collectionName;
//         console.log(`\n\U0001F4DD Submitting survey: ${collectionName} for MRN: ${actualMrNo}`);
        
//         let newIndex = patientData[storageKey] ? Object.keys(patientData[storageKey]).length : 0;
//         const newKey = `${storageKey}_${newIndex}`;
//         const completionDate = new Date().toISOString();
//         formData.timestamp = completionDate;
//         const completionDateField = `${storageKey}_completionDate`;

//         let prePostIndicator = 'pre_operative';
//         // ... (prePostIndicator logic as before) ...
//         if (Array.isArray(patientData.Events)) {
//             const surveyTime = new Date(completionDate);
//             patientData.Events.forEach(event => {
//                 const eventTime = new Date(event.date);
//                 if (eventTime < surveyTime && eventTime.getMonth() === surveyTime.getMonth() && eventTime.getFullYear() === surveyTime.getFullYear()) {
//                     prePostIndicator = 'post_operative';
//                 }
//             });
//         }

//         const surveyEvent = {
//             survey_id: `${collectionName.toLowerCase()}_${newIndex}`, survey_name: collectionName,
//             site_code: patientData.site_code || 'default_site_code', pre_post_indicator: prePostIndicator,
//             surveyEvents: [{ surveyStatus: 'received', surveyTime: completionDate, surveyResult: { ...formData } }]
//         };

//         await db1.collection('patient_data').updateOne(
//             { Mr_no: actualMrNo },
//             {
//                 $set: {
//                     [`${storageKey}.${newKey}`]: formData, 
//                     [completionDateField]: completionDate, 
//                     [`SurveyEntry.${collectionName}_${newIndex}`]: surveyEvent
//                 }
//             }
//         );
//         console.log(`\u2705 Survey ${collectionName} data and event stored for MRN: ${actualMrNo}.`);
        
//         const appointmentFieldPathBase = `appointment_tracker.${patientData.speciality}`;
//         const refreshedPatientDataForTracker = await db1.collection('patient_data').findOne({ Mr_no: actualMrNo });
//         const currentAppointments = refreshedPatientDataForTracker.appointment_tracker?.[refreshedPatientDataForTracker.speciality] || [];
//         let currentAppointmentFinalized = false;

//         for (let i = 0; i < currentAppointments.length; i++) {
//             const appointment = currentAppointments[i];
//             if (appointment.surveyStatus === "Not Completed" && Array.isArray(appointment.survey_name) && appointment.survey_name.includes(collectionName)) {
//                 console.log(`\u2139 Found active 'Not Completed' appointment (index ${i}) for survey '${collectionName}'.`);
//                 const completedInAppointmentUpdatePath = `${appointmentFieldPathBase}.${i}.completed_in_appointment.${collectionName}`;
//                 await db1.collection('patient_data').updateOne(
//                     { Mr_no: actualMrNo },
//                     { $set: { [completedInAppointmentUpdatePath]: true } }
//                 );
//                 console.log(`\u2705 Marked '${collectionName}' as true in 'completed_in_appointment' for appt index ${i} (MRN: ${actualMrNo}).`);

//                 const finalCheckPatientData = await db1.collection('patient_data').findOne({ Mr_no: actualMrNo });
//                 const updatedAppointmentToCheck = finalCheckPatientData.appointment_tracker?.[finalCheckPatientData.speciality]?.[i];

//                 if (updatedAppointmentToCheck && Array.isArray(updatedAppointmentToCheck.survey_name) && updatedAppointmentToCheck.survey_name.length > 0) {
//                     const allSurveysInThisAppointmentDone = updatedAppointmentToCheck.survey_name.every(sName =>
//                         updatedAppointmentToCheck.completed_in_appointment &&
//                         updatedAppointmentToCheck.completed_in_appointment[sName] === true
//                     );

//                     if (allSurveysInThisAppointmentDone) {
//                         currentAppointmentFinalized = true; // This appointment block is now done.
//                         const appointmentStatusUpdatePath = `${appointmentFieldPathBase}.${i}.surveyStatus`;
//                         await db1.collection('patient_data').updateOne(
//                             { Mr_no: actualMrNo },
//                             { $set: { [appointmentStatusUpdatePath]: "Completed" } }
//                         );
//                         console.log(`\u2705 Appointment index ${i} surveyStatus marked 'Completed' (MRN: ${actualMrNo}).`);
//                     }
//                 } else if (updatedAppointmentToCheck && Array.isArray(updatedAppointmentToCheck.survey_name) && updatedAppointmentToCheck.survey_name.length === 0) {
//                     // If an appointment has no surveys listed but was "Not Completed", completing an unrelated survey shouldn't affect it
//                     // unless this specific survey was incorrectly listed in it.
//                     // This case means the appointment itself is likely done if it had no surveys assigned.
//                     currentAppointmentFinalized = true; // Treat as finalized if it had no surveys.
//                      const appointmentStatusUpdatePath = `${appointmentFieldPathBase}.${i}.surveyStatus`;
//                         await db1.collection('patient_data').updateOne(
//                             { Mr_no: actualMrNo },
//                             { $set: { [appointmentStatusUpdatePath]: "Completed" } }
//                         );
//                     console.log(`\u2139 Appointment index ${i} had no surveys, marking as 'Completed'.`);
//                 }
//                 break; 
//             }
//         }
        
//         // Pass a flag or rely on getSurveyUrls to determine if overall patient status should change.
//         await handleNextSurvey(actualMrNo, collectionName, lang, res, currentAppointmentFinalized);

//     } catch (error) {
//         console.error(`\u274C Error in handleSurveySubmission for ${collectionName}:`, error);
//         // ... (error handling as before)
//         const mrNoFromForm = req.body.Mr_no;
//         const langForRedirect = req.body.lang || 'en';
//         req.flash('error', 'Internal server error during survey submission.');
//         const currentBasePath = app.locals.basePath || '/patientsurveys';
//         if (mrNoFromForm) {
//              return res.redirect(`${currentBasePath}/dob-validation?identifier=${mrNoFromForm}&lang=${langForRedirect}`);
//         }
//         return res.status(500).send('Internal server error.');
//     }
// };



const handleSurveySubmission = async (req, res, collectionName) => {
    try {
        const formData = req.body;
        const { Mr_no: mrNoFromForm, lang = 'en' } = formData;
        const currentBasePath = app.locals.basePath || '/patientsurveys';

        if (!mrNoFromForm) {
            console.log(`\u274C Missing Mr_no in request body for ${collectionName}.`);
            req.flash('error', 'Patient identifier missing.');
            return res.redirect(`${currentBasePath}/?lang=${lang}`);
        }

        const patientData = await db1.collection('patient_data').findOne({
            $or: [{ Mr_no: mrNoFromForm }, { hashedMrNo: mrNoFromForm }]
        });

        if (!patientData) {
            console.log(`\u274C No matching document found for identifier: ${mrNoFromForm} (submitting ${collectionName}).`);
            req.flash('error', 'Patient not found.');
            return res.redirect(`${currentBasePath}/dob-validation?identifier=${mrNoFromForm}&lang=${lang}`);
        }
        const actualMrNo = patientData.Mr_no;
        const storageKey = collectionName === 'Global-Health_d' ? 'Global-Health' : collectionName;
        console.log(`\n\U0001F4DD Submitting survey: ${collectionName} for MRN: ${actualMrNo}`);

        const currentSubmissionTimestamp = new Date();
        formData.timestamp = currentSubmissionTimestamp.toISOString();
        const completionDateField = `${storageKey}_completionDate`;

        let surveyObjectKeyToUpdate;
        let surveyEntryIndexForDB;
        let isOverride = false;
        let timeDifferenceInMinutes = null; // Variable to store the time difference

        const existingSurveyTypeEntries = patientData[storageKey];
        let latestEntryKeyFound = null;
        let latestNumericIndexFound = -1;

        if (existingSurveyTypeEntries && typeof existingSurveyTypeEntries === 'object' && Object.keys(existingSurveyTypeEntries).length > 0) {
            for (const key in existingSurveyTypeEntries) {
                if (Object.prototype.hasOwnProperty.call(existingSurveyTypeEntries, key)) {
                    const parts = key.split('_');
                    if (parts.length > 1) {
                        const potentialIndex = parseInt(parts[parts.length - 1], 10);
                        if (!isNaN(potentialIndex) && potentialIndex > latestNumericIndexFound) {
                            latestNumericIndexFound = potentialIndex;
                            latestEntryKeyFound = key;
                        }
                    }
                }
            }

            if (latestEntryKeyFound && existingSurveyTypeEntries[latestEntryKeyFound] && existingSurveyTypeEntries[latestEntryKeyFound].timestamp) {
                const latestEntryTimestampString = existingSurveyTypeEntries[latestEntryKeyFound].timestamp;
                const latestEntryTimestampFromDB = new Date(latestEntryTimestampString);

                const diffInMilliseconds = currentSubmissionTimestamp.getTime() - latestEntryTimestampFromDB.getTime();
                timeDifferenceInMinutes = diffInMilliseconds / (1000 * 60); // Calculate and store

                console.log(`[INFO] Time difference from last entry (${latestEntryKeyFound}): ${timeDifferenceInMinutes.toFixed(2)} minutes.`);

                if (timeDifferenceInMinutes < 1440) {
                    isOverride = true;
                    surveyObjectKeyToUpdate = latestEntryKeyFound;
                    surveyEntryIndexForDB = latestNumericIndexFound;
                }
            }
        }

        if (!isOverride) {
            surveyEntryIndexForDB = latestNumericIndexFound + 1;
            surveyObjectKeyToUpdate = `${storageKey}_${surveyEntryIndexForDB}`;
        }

        let prePostIndicator = 'pre_operative';
        if (Array.isArray(patientData.Events)) {
            patientData.Events.forEach(event => {
                const eventTime = new Date(event.date);
                if (eventTime < currentSubmissionTimestamp && eventTime.getMonth() === currentSubmissionTimestamp.getMonth() && eventTime.getFullYear() === currentSubmissionTimestamp.getFullYear()) {
                    prePostIndicator = 'post_operative';
                }
            });
        }

        const surveyEvent = {
            survey_id: `${collectionName.toLowerCase()}_${surveyEntryIndexForDB}`,
            survey_name: collectionName,
            site_code: patientData.site_code || 'default_site_code',
            pre_post_indicator: prePostIndicator,
            surveyEvents: [{ surveyStatus: 'received', surveyTime: formData.timestamp, surveyResult: { ...formData } }]
        };

        await db1.collection('patient_data').updateOne(
            { Mr_no: actualMrNo },
            {
                $set: {
                    [`${storageKey}.${surveyObjectKeyToUpdate}`]: formData,
                    [completionDateField]: formData.timestamp,
                    [`SurveyEntry.${collectionName}_${surveyEntryIndexForDB}`]: surveyEvent
                }
            }
        );

        if (isOverride) {
            console.log(`\u2705 Survey ${collectionName} (entry ${surveyObjectKeyToUpdate}) OVERRIDDEN for MRN: ${actualMrNo}. Time since last: ${timeDifferenceInMinutes !== null ? timeDifferenceInMinutes.toFixed(2) : 'N/A'} min.`);
        } else {
            if (latestEntryKeyFound && timeDifferenceInMinutes !== null) { // A previous entry existed
                console.log(`\u2705 Survey ${collectionName} (new entry ${surveyObjectKeyToUpdate}) STORED for MRN: ${actualMrNo}. Time since last: ${timeDifferenceInMinutes.toFixed(2)} min.`);
            } else { // This is the very first entry for this survey type
                console.log(`\u2705 Survey ${collectionName} (new entry ${surveyObjectKeyToUpdate}) STORED for MRN: ${actualMrNo}. This is the first entry for this survey type.`);
            }
        }

        const appointmentFieldPathBase = `appointment_tracker.${patientData.speciality}`;
        const refreshedPatientDataForTracker = await db1.collection('patient_data').findOne({ Mr_no: actualMrNo });
        const currentAppointments = refreshedPatientDataForTracker.appointment_tracker?.[refreshedPatientDataForTracker.speciality] || [];
        let currentAppointmentFinalized = false;

        for (let i = 0; i < currentAppointments.length; i++) {
            const appointment = currentAppointments[i];
            if (appointment.surveyStatus === "Not Completed" && Array.isArray(appointment.survey_name) && appointment.survey_name.includes(collectionName)) {
                console.log(`\u2139 Found active 'Not Completed' appointment (index ${i}) for survey '${collectionName}'.`);
                const completedInAppointmentUpdatePath = `${appointmentFieldPathBase}.${i}.completed_in_appointment.${collectionName}`;
                await db1.collection('patient_data').updateOne(
                    { Mr_no: actualMrNo },
                    { $set: { [completedInAppointmentUpdatePath]: true } }
                );
                console.log(`\u2705 Marked '${collectionName}' as true in 'completed_in_appointment' for appt index ${i} (MRN: ${actualMrNo}).`);

                const finalCheckPatientData = await db1.collection('patient_data').findOne({ Mr_no: actualMrNo });
                const updatedAppointmentToCheck = finalCheckPatientData.appointment_tracker?.[finalCheckPatientData.speciality]?.[i];

                if (updatedAppointmentToCheck && Array.isArray(updatedAppointmentToCheck.survey_name) && updatedAppointmentToCheck.survey_name.length > 0) {
                    const allSurveysInThisAppointmentDone = updatedAppointmentToCheck.survey_name.every(sName =>
                        updatedAppointmentToCheck.completed_in_appointment &&
                        updatedAppointmentToCheck.completed_in_appointment[sName] === true
                    );

                    if (allSurveysInThisAppointmentDone) {
                        currentAppointmentFinalized = true;
                        const appointmentStatusUpdatePath = `${appointmentFieldPathBase}.${i}.surveyStatus`;
                        await db1.collection('patient_data').updateOne(
                            { Mr_no: actualMrNo },
                            { $set: { [appointmentStatusUpdatePath]: "Completed" } }
                        );
                        console.log(`\u2705 Appointment index ${i} surveyStatus marked 'Completed' (MRN: ${actualMrNo}).`);
                    }
                } else if (updatedAppointmentToCheck && Array.isArray(updatedAppointmentToCheck.survey_name) && updatedAppointmentToCheck.survey_name.length === 0) {
                    currentAppointmentFinalized = true;
                    const appointmentStatusUpdatePath = `${appointmentFieldPathBase}.${i}.surveyStatus`;
                    await db1.collection('patient_data').updateOne(
                        { Mr_no: actualMrNo },
                        { $set: { [appointmentStatusUpdatePath]: "Completed" } }
                    );
                    console.log(`\u2139 Appointment index ${i} had no surveys, marking as 'Completed'.`);
                }
                break;
            }
        }

        await handleNextSurvey(actualMrNo, collectionName, lang, res, currentAppointmentFinalized);

    } catch (error) {
        console.error(`\u274C Error in handleSurveySubmission for ${collectionName}:`, error);
        const mrNoFromFormError = req.body.Mr_no;
        const langForRedirectError = req.body.lang || 'en';
        req.flash('error', 'Internal server error during survey submission.');
        const currentBasePathError = app.locals.basePath || '/patientsurveys';
        if (mrNoFromFormError) {
            return res.redirect(`${currentBasePathError}/dob-validation?identifier=${mrNoFromFormError}&lang=${langForRedirectError}`);
        }
        return res.status(500).send('Internal server error.');
    }
};

router.post('/submit_Wexner', (req, res) => handleSurveySubmission(req, res, 'Wexner'));
router.post('/submit_ICIQ_UI_SF', (req, res) => handleSurveySubmission(req, res, 'ICIQ_UI_SF'));
router.post('/submitEPDS', (req, res) => handleSurveySubmission(req, res, 'EPDS'));
router.post('/submitPAID', (req, res) => handleSurveySubmission(req, res, 'PAID'));
router.post('/submitPAID-5', (req, res) => handleSurveySubmission(req, res, 'PAID-5'));
router.post('/submitEQ-5D', (req, res) => handleSurveySubmission(req, res, 'EQ-5D'));
router.post('/submitGlobal-Health', (req, res) => handleSurveySubmission(req, res, 'Global-Health'));
router.post('/submitGlobal-Health_d', (req, res) => handleSurveySubmission(req, res, 'Global-Health_d'));
router.post('/submitPain-Interference', (req, res) => handleSurveySubmission(req, res, 'Pain-Interference'));
router.post('/submitPhysical-Function', (req, res) => handleSurveySubmission(req, res, 'Physical-Function'));
router.post('/submitPHQ-2', (req, res) => handleSurveySubmission(req, res, 'PHQ-2'));






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


router.get('/PHQ-2', async (req, res) => {
  const { Mr_no, lang = 'en' } = req.query;
  const routeSurveyName = 'PHQ-2';

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
    res.render('PHQ-2', {
      Mr_no: patient.Mr_no,
      surveyStatus: filteredSurveyStatus,
      currentLang: lang
    });
  } catch (error) {
    console.error('Error fetching PHQ-2 survey:', error);
    res.status(500).send('Internal server error');
  }
});

router.get('/PAID-5', async (req, res) => {
  const { Mr_no, lang = 'en' } = req.query;
  const routeSurveyName = 'PAID-5';

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
    res.render('PAID-5', {
      Mr_no: patient.Mr_no,
      surveyStatus: filteredSurveyStatus,
      currentLang: lang
    });
  } catch (error) {
    console.error('Error fetching PAID-5 survey:', error);
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
//     const patientData = await db1.collection('patient_data').findOne({ Mr_no });
//     if (!patientData) {
//       return res.status(404).send('Patient not found');
//     }

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

//     const validSurveyUrls = await getSurveyUrls(patientData, lang);
//     const validSurveyNames = validSurveyUrls.map(url => url.split('/').pop().split('?')[0]);

//     if (validSurveyNames.length === 0) {
//       const completionTime = new Date().toISOString();
//       await db1.collection('patient_data').updateOne(
//         { Mr_no },
//         { $set: { customSurveyTimeCompletion: completionTime, surveyStatus: "Completed" } }
//       );

//       if (apiSurvey && apiSurvey.length > 0) {
//         return res.redirect(`${process.env.API_SURVEY_URL}?mr_no=${Mr_no}&lang=${lang}`);
//       } else {
//         const mrNoToUse = patientData.hashedMrNo || Mr_no;
//         return res.redirect(`${basePath}/details?Mr_no=${mrNoToUse}&lang=${lang}`);
//       }
//     }

//     const currentIndex = validSurveyNames.indexOf(currentSurvey);
//     if (currentIndex === -1 || currentIndex === validSurveyNames.length - 1) {
//       const completionTime = new Date().toISOString();
//       await db1.collection('patient_data').updateOne(
//         { Mr_no },
//         { $set: { customSurveyTimeCompletion: completionTime, surveyStatus: "Completed" } }
//       );

//       if (apiSurvey && apiSurvey.length > 0) {
//         return res.redirect(`${process.env.API_SURVEY_URL}?mr_no=${Mr_no}&lang=${lang}`);
//       } else {
//         const mrNoToUse = patientData.hashedMrNo || Mr_no;
//         return res.redirect(`${basePath}/details?Mr_no=${mrNoToUse}&lang=${lang}`);
//       }
//     }

//     const nextSurvey = validSurveyNames[currentIndex + 1];
//     const mrNoToUse = patientData.hashedMrNo || Mr_no;
//     return res.redirect(`${basePath}/${nextSurvey}?Mr_no=${mrNoToUse}&lang=${lang}`);

//   } catch (error) {
//     console.error('Error determining the next survey:', error);
//     return res.status(500).send('Internal server error');
//   }
// };



// const handleNextSurvey = async (Mr_no, currentSurvey, lang, res) => {
//   try {
//     const patientData = await db1.collection('patient_data').findOne({ Mr_no });
//     if (!patientData) {
//       return res.status(404).send('Patient not found');
//     }

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

//     const validSurveyUrls = await getSurveyUrls(patientData, lang);
//     const validSurveyNames = validSurveyUrls.map(
//       (url) => url.split('/').pop().split('?')[0]
//     );

//     if (validSurveyNames.length === 0) {
//       const completionTime = new Date().toISOString();
//       await db1.collection('patient_data').updateOne(
//         { Mr_no },
//         { $set: { customSurveyTimeCompletion: completionTime, surveyStatus: 'Completed' } }
//       );

//       if (apiSurvey && apiSurvey.length > 0) {
//         return res.redirect(
//           `${process.env.API_SURVEY_URL}?mr_no=${Mr_no}&lang=${lang}`
//         );
//       } else {
//         const mrNoToUse = patientData.hashedMrNo;
//         return res.redirect(`${basePath}/details?Mr_no=${mrNoToUse}&lang=${lang}`);
//       }
//     }

//     const currentIndex = validSurveyNames.indexOf(currentSurvey);
//     if (currentIndex === -1 || currentIndex === validSurveyNames.length - 1) {
//       const completionTime = new Date().toISOString();
//       await db1.collection('patient_data').updateOne(
//         { Mr_no },
//         { $set: { customSurveyTimeCompletion: completionTime, surveyStatus: 'Completed' } }
//       );

//       if (apiSurvey && apiSurvey.length > 0) {
//         return res.redirect(
//           `${process.env.API_SURVEY_URL}?mr_no=${Mr_no}&lang=${lang}`
//         );
//       } else {
//         const mrNoToUse = patientData.hashedMrNo;
//         return res.redirect(`${basePath}/details?Mr_no=${mrNoToUse}&lang=${lang}`);
//       }
//     }

//     const nextSurvey = validSurveyNames[currentIndex + 1];
//     const mrNoToUse = patientData.hashedMrNo;
//     return res.redirect(`${basePath}/${nextSurvey}?Mr_no=${mrNoToUse}&lang=${lang}`);
//   } catch (error) {
//     console.error('Error determining the next survey:', error);
//     return res.status(500).send('Internal server error');
//   }
// };


const handleNextSurvey = async (actualMrNo_from_submission, submittedSurveyName, lang, res, currentAppointmentJustFinalized = false) => {
    try {
        const patientData = await db1.collection('patient_data').findOne({ Mr_no: actualMrNo_from_submission });
        const currentBasePath = app.locals.basePath || '/patientsurveys';

        if (!patientData) {
            console.error(`\u274C Patient not found in handleNextSurvey for MRN: ${actualMrNo_from_submission}`);
            req.flash('error', 'Patient record not found.');
            return res.redirect(`${currentBasePath}/?lang=${lang}`);
        }

        // If the appointment block the user was just working on was finalized:
        if (currentAppointmentJustFinalized) {
            console.log(`\U0001F389 handleNextSurvey: Current appointment block for MRN ${actualMrNo_from_submission} was just finalized. Setting patient surveyStatus to Completed.`);
            const completionTime = new Date().toISOString();
            await db1.collection('patient_data').updateOne(
                { Mr_no: actualMrNo_from_submission },
                { $set: { customSurveyTimeCompletion: completionTime, surveyStatus: "Completed" } } // Overall patient status
            );
            console.log(`\u2705 Patient surveyStatus on root marked as 'Completed' for MRN: ${actualMrNo_from_submission}.`);

            // Now check for API survey or redirect to details (same logic as "no more pending surveys")
            const db3 = await connectToThirdDatabase();
            const surveyDataConfig = await db3.collection('surveys').findOne({
                specialty: patientData.speciality, hospital_code: patientData.hospital_code, site_code: patientData.site_code
            });
            const apiSurvey = surveyDataConfig ? surveyDataConfig.API : [];

            if (apiSurvey && apiSurvey.length > 0 && process.env.API_SURVEY_URL) {
                console.log(`\u2705 Redirecting to API survey for MRN: ${actualMrNo_from_submission}`);
                return res.redirect(`${process.env.API_SURVEY_URL}?mr_no=${actualMrNo_from_submission}&lang=${lang}`);
            } else {
                const mrNoForDetailsRedirect = patientData.hashedMrNo || actualMrNo_from_submission;
                console.log(`\u2705 All surveys for this block done. Redirecting to details page for: ${mrNoForDetailsRedirect}`);
                return res.redirect(`${currentBasePath}/details?Mr_no=${mrNoForDetailsRedirect}&lang=${lang}`);
            }
        }

        // If the current appointment block was NOT just finalized, check if there are other pending surveys.
        const pendingSurveyUrls = await getSurveyUrls(patientData, lang);

        if (pendingSurveyUrls.length > 0) {
            const nextSurveyUrl = pendingSurveyUrls[0];
            console.log(`\u2705 handleNextSurvey: Redirecting to next pending survey: ${nextSurveyUrl} for MRN: ${actualMrNo_from_submission}`);
            return res.redirect(nextSurveyUrl);
        } else {
            // This case means no more surveys in any "Not Completed" appointment, or all appointments are "Completed".
            // This also leads to overall completion.
            console.log(`\U0001F389 handleNextSurvey: No more custom surveys pending (getSurveyUrls returned empty) for MRN: ${actualMrNo_from_submission}.`);
            const completionTime = new Date().toISOString();
             // Ensure patient surveyStatus is marked completed if not already by the currentAppointmentJustFinalized logic
            if (patientData.surveyStatus !== "Completed") {
                await db1.collection('patient_data').updateOne(
                    { Mr_no: actualMrNo_from_submission },
                    { $set: { customSurveyTimeCompletion: completionTime, surveyStatus: "Completed" } }
                );
                console.log(`\u2705 Patient surveyStatus on root marked 'Completed' (via empty pending URLs) for MRN: ${actualMrNo_from_submission}.`);
            }

            const db3 = await connectToThirdDatabase();
            const surveyDataConfig = await db3.collection('surveys').findOne({
                specialty: patientData.speciality, hospital_code: patientData.hospital_code, site_code: patientData.site_code
            });
            const apiSurvey = surveyDataConfig ? surveyDataConfig.API : [];

            if (apiSurvey && apiSurvey.length > 0 && process.env.API_SURVEY_URL) {
                console.log(`\u2705 Redirecting to API survey for MRN: ${actualMrNo_from_submission}`);
                return res.redirect(`${process.env.API_SURVEY_URL}?mr_no=${actualMrNo_from_submission}&lang=${lang}`);
            } else {
                const mrNoForDetailsRedirect = patientData.hashedMrNo || actualMrNo_from_submission;
                console.log(`\u2705 All surveys done. Redirecting to details page for: ${mrNoForDetailsRedirect}`);
                return res.redirect(`${currentBasePath}/details?Mr_no=${mrNoForDetailsRedirect}&lang=${lang}`);
            }
        }
    } catch (error) {
        console.error('\u274C Error in handleNextSurvey:', error);
        // ... (error handling as before) ...
        req.flash('error', 'Internal server error determining next survey.');
        const mrNoForRedirect = actualMrNo_from_submission; 
        const currentBasePath = app.locals.basePath || '/patientsurveys';
        if (mrNoForRedirect) {
            const patientForRedirect = await db1.collection('patient_data').findOne({ Mr_no: mrNoForRedirect }, { projection: { hashedMrNo: 1 } });
            const identifierForRedirect = patientForRedirect?.hashedMrNo || mrNoForRedirect;
            return res.redirect(`${currentBasePath}/dob-validation?identifier=${identifierForRedirect}&lang=${lang || 'en'}`);
        }
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



router.post('/submitPHQ-2', async (req, res) => {
  const formData = req.body;
  const { Mr_no, lang = 'en' } = formData; 

  try {
    // Fetch patient data
    const patientData = await db1.collection('patient_data').findOne({
      $or: [{ Mr_no }, { hashedMrNo: Mr_no }]
    });

    if (!patientData) {
      return res.status(404).send('Patient not found');
    }

    // Determine index for new PAID-5 entries
    let newIndex = 0;
    if (patientData['PHQ-2']) {
      newIndex = Object.keys(patientData['PHQ-2']).length;
    }

    // Create new PAID-5 key
    const newPAID5Key = `PHQ-2_${newIndex}`;
    formData.timestamp = new Date().toISOString();

    // Update database
    await db1.collection('patient_data').updateOne(
      { Mr_no: patientData.Mr_no },
      {
        $set: {
          [`PHQ-2.${newPAID5Key}`]: formData,
          'PHQ-2_completionDate': formData.timestamp
        }
      }
    );

    // Redirect to next survey
    await handleNextSurvey(patientData.Mr_no, 'PHQ-2', lang, res);
  } catch (error) {
    console.error('Error submitting PHQ-2:', error);
    return res.status(500).send('Error submitting PHQ-2 survey');
  }
});

router.post('/submitPAID-5', async (req, res) => {
  const formData = req.body;
  const { Mr_no, lang = 'en' } = formData; 

  try {
    // Fetch patient data
    const patientData = await db1.collection('patient_data').findOne({
      $or: [{ Mr_no }, { hashedMrNo: Mr_no }]
    });

    if (!patientData) {
      return res.status(404).send('Patient not found');
    }

    // Determine index for new PAID-5 entries
    let newIndex = 0;
    if (patientData['PAID-5']) {
      newIndex = Object.keys(patientData['PAID-5']).length;
    }

    // Create new PAID-5 key
    const newPAID5Key = `PAID-5_${newIndex}`;
    formData.timestamp = new Date().toISOString();

    // Update database
    await db1.collection('patient_data').updateOne(
      { Mr_no: patientData.Mr_no },
      {
        $set: {
          [`PAID-5.${newPAID5Key}`]: formData,
          'PAID-5_completionDate': formData.timestamp
        }
      }
    );

    // Redirect to next survey
    await handleNextSurvey(patientData.Mr_no, 'PAID-5', lang, res);
  } catch (error) {
    console.error('Error submitting PAID-5:', error);
    return res.status(500).send('Error submitting PAID-5 survey');
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



router.get('/EQ-5D', async (req, res) => {
  const { Mr_no, lang = 'en' } = req.query;
  const routeSurveyName = 'EQ-5D';

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
    res.render('EQ-5D', {
      Mr_no: patient.Mr_no,
      surveyStatus: filteredSurveyStatus,
      currentLang: lang
    });
  } catch (error) {
    console.error('Error fetching EQ-5D survey:', error);
    res.status(500).send('Internal server error');
  }
});


router.post('/submitEQ-5D', async (req, res) => {
  const formData = req.body;
  const { Mr_no, lang = 'en' } = formData; 

  try {
    // Fetch patient data
    const patientData = await db1.collection('patient_data').findOne({
      $or: [{ Mr_no }, { hashedMrNo: Mr_no }]
    });

    if (!patientData) {
      return res.status(404).send('Patient not found');
    }

    // Determine index for new PAID-5 entries
    let newIndex = 0;
    if (patientData['EQ-5D']) {
      newIndex = Object.keys(patientData['EQ-5D']).length;
    }

    // Create new PAID-5 key
    const newPAID5Key = `EQ-5D_${newIndex}`;
    formData.timestamp = new Date().toISOString();

    // Update database
    await db1.collection('patient_data').updateOne(
      { Mr_no: patientData.Mr_no },
      {
        $set: {
          [`EQ-5D.${newPAID5Key}`]: formData,
          'EQ-5D_completionDate': formData.timestamp
        }
      }
    );

    // Redirect to next survey
    await handleNextSurvey(patientData.Mr_no, 'EQ-5D', lang, res);
  } catch (error) {
    console.error('Error submitting EQ-5D:', error);
    return res.status(500).send('Error submitting EQ-5D survey');
  }
});

// Add this new route handler

router.get('/check-redirect', async (req, res) => {
  const { hashedMrNo, lang = 'en' } = req.query; // Get hashedMrNo and lang

  if (!hashedMrNo) {
      req.flash('error', 'Missing patient identifier.');
      // Redirect to a safe default page, like the initial search
      return res.redirect(`${basePath}/?lang=${lang}`);
  }

  try {
      // Use the existing db1 connection (assuming patient_data is in db1)
      const patientCollection = db1.collection('patient_data');

      // Find the patient using the provided hashedMrNo
      const patient = await patientCollection.findOne({ hashedMrNo: hashedMrNo });

      if (!patient) {
          console.log(`\u274C Patient not found for hashedMrNo during redirect check: ${hashedMrNo}`);
          // Use localized error message if available, otherwise default
          const errorMessage = lang === 'ar' ? 'لم يتم العثور على المريض' : 'Patient not found';
          req.flash('error', errorMessage);
          return res.redirect(`${basePath}/?lang=${lang}`); // Redirect to search
      }

      // Check if the patient document has a 'password' field and it's not empty/null
      if (patient.password && patient.password.length > 0) {
          // Password exists - Redirect to Patient Login
          console.log(`\u2705 Password found for ${hashedMrNo}. Redirecting to login.`);
          // Construct the patient login URL from environment variable
          const loginUrl = `${process.env.PATIENT_LOGIN_URL}/patientlogin?lang=${lang}`; // Adjust path if needed
          return res.redirect(loginUrl);

      } else {
          // Password does NOT exist - Redirect to Patient Password Creation
          console.log(`\u274C No password found for ${hashedMrNo}. Redirecting to set password.`);
          // Construct the password creation URL from environment variable
          const setPasswordUrl = `${process.env.PATIENT_PASSWORD_URL}/patientpassword/password/${hashedMrNo}?lang=${lang}`;
          return res.redirect(setPasswordUrl);
      }

  } catch (error) {
      console.error('\u274C Error during password check and redirect:', error);
      // Use localized error message if available, otherwise default
      const errorMessage = lang === 'ar' ? 'خطأ في الخادم الداخلي عند التحقق من كلمة المرور' : 'Internal server error during password check.';
      req.flash('error', errorMessage);
      // Redirect to a safe default page
      res.redirect(`${basePath}/?lang=${lang}`);
  }
});

// Make sure this new route is defined *before* the line:
// app.use(basePath, router);


// Mount the router at the base path
app.use(basePath, router);


app.listen(PORT, () => {
  console.log(`The patient surveys flow is running at http://localhost${basePath}`);
});