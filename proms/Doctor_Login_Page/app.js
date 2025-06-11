const isCurrentDate = (datetime) => {
    // Parse the datetime to extract the date part
    const [datePart] = datetime.split(','); // Get "MM/DD/YYYY" part
    const [month, day, year] = datePart.trim().split('/'); // Split "MM/DD/YYYY"
    
    // Get today's date in the same format
    const today = new Date();
    const todayFormatted = `${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getDate().toString().padStart(2, '0')}/${today.getFullYear()}`;
    
    // Compare the dates
    return datePart.trim() === todayFormatted;

}

const i18nextMiddleware = require('i18next-http-middleware');
const cookieParser = require('cookie-parser');
const Backend = require('i18next-fs-backend');
const i18next = require('i18next');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');
const app = express();
const { exec } = require('child_process');
const axios = require('axios'); // Import axios for HTTP requests
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const Table = require('cli-table3');
app.use(express.json());
const { ObjectId } = require('mongodb');
// require('dotenv').config();
require('dotenv').config({ path: path.join(__dirname, '.env') }); // Ensure .env is loaded
const crypto = require('crypto');

const dashboardDbUri = 'mongodb+srv://admin:admin@mydevopsdb.5hmumeq.mongodb.net/dashboards';
mongoose.connect(dashboardDbUri, { useNewUrlParser: true, useUnifiedTopology: true });
const dashboardDb = mongoose.connection;
dashboardDb.on('error', console.error.bind(console, 'connection error:'));
dashboardDb.once('open', function () {
    console.log("Connected to MongoDB dashboards database!");
});

const BASE_URL = process.env.BASE_URL;

// Define the base path for the entire application
const basePath = '/doctorlogin';
app.locals.basePath = basePath;
app.use(cookieParser())
// AES-256 encryption key (32 chars long) and IV (Initialization Vector)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Ensure this is loaded from .env
const IV_LENGTH = 16; // AES block size for CBC mode

// Helper function to decrypt text (password)
function decrypt(text) {
    let textParts = text.split(':');
    let iv = Buffer.from(textParts.shift(), 'hex');  // Extract the IV
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');  // Extract the encrypted text
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);  // Create decipher using the key
    let decrypted = decipher.update(encryptedText);  // Decrypt the text

    decrypted = Buffer.concat([decrypted, decipher.final()]);  // Finalize decryption

    return decrypted.toString();  // Return the decrypted password as a string
}

function encrypt(text) {
    let iv = crypto.randomBytes(IV_LENGTH); // Generate random IV
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);

    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return iv.toString('hex') + ':' + encrypted.toString('hex'); // Return IV and encrypted text
}



app.use(`${basePath}/new_folder`, express.static(path.join(__dirname, 'new_folder')));
app.use(`${basePath}/new_folder_1`, express.static(path.join(__dirname, 'new_folder_1')));
app.use(`${basePath}/data`, express.static(path.join(__dirname, 'data')));
// const PORT = 3003;  
// app.use(express.static(path.join(__dirname, 'public')));
// app.use(`${basePath}`, express.static(path.join(__dirname, 'public')));


app.use(session({
    // secret: 'your-secret-key', // Change this to a random secret key
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: 'mongodb+srv://admin:admin@mydevopsdb.5hmumeq.mongodb.net/manage_doctors', // Use a different database for sessions
        ttl: 14 * 24 * 60 * 60 // Sessions will be stored for 14 days
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 // 1 day for session cookie
    }
}));

const flash = require('connect-flash');

app.use(flash());

// Middleware to make flash messages accessible in all views
app.use((req, res, next) => {
    const currentLanguage = req.query.lng || req.cookies.lng || 'en'; // Default to English
    const dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';

    res.locals.lng = currentLanguage; // Set the language for EJS templates
    res.locals.dir = dir;             // Set the direction for EJS templates

    res.cookie('lng', currentLanguage); // Persist language in cookies
    req.language = currentLanguage;
    req.dir = dir;
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    next();
});


const doctorsSurveysURL = process.env.DOCTORS_SURVEYS_MONGO_URL;
const patientDataURL = process.env.PATIENT_DATA_MONGO_URL;

// Connect to MongoDB for doctors and surveys connection
const doctorsSurveysDB = mongoose.createConnection(doctorsSurveysURL, { useNewUrlParser: true, useUnifiedTopology: true });

// Connect to MongoDB for patient_data connection
const patientDataDB = mongoose.createConnection(patientDataURL, { useNewUrlParser: true, useUnifiedTopology: true });

app.use('/doctorlogin/locales', express.static(path.join(__dirname, 'views/locales')));;
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



const Doctor = doctorsSurveysDB.model('doctors', {
    firstName: String,
    lastName: String,
    username: String,
    doctor_id: String,
    password: String,
    speciality: String,
    hospital_code: String,
    hospitalName:String,
    site_code: String,
    loginCounter: {
        type: Number,
        default: 0
    },
    failedLogins: {
        type: Number,
        default: 0
    },
    lastLogin: {
        type: Date,
        default: null
    },
    isLocked: {
        type: Boolean,
        default: false
    },
    passwordChangedByAdmin: {
        type: Boolean,
        default: false
    }
});






const codesFilePath = path.join(__dirname, 'public','codes.json');
let codesData = [];

try {
  const fileData = fs.readFileSync(codesFilePath, 'utf-8');
  codesData = JSON.parse(fileData);
} catch (error) {
  console.error("Error reading codes JSON file:", error);
}

// --- Your existing Survey model remains unchanged ---
const Survey = doctorsSurveysDB.model('surveys', {
  custom: [String],
  specialty: String
});




const patientSchema = new mongoose.Schema({
    Mr_no: String,
    firstName: String,
    lastName: String,
    DOB: String,
    datetime: String,
    speciality: String,
    dateOfSurgery: String,
    phoneNumber: String,
    hospital_code: String,
    site_code: String,  // Add this line for site code
    password: String,
    Events: [
        {
            event: String,
            date: String,
            treatment_plan: {
                type: String,
                enum: ['Surgery', 'Lifestyle Modifications', 'Medication', 'Physical Therapy'],
              },
        }
    ],
    Codes: [
        {
            code: String,
            description: String,  // Add this line for description
            date: String
        }
    ],
    doctorNotes: [
        {
            note: String,
            date: String
        }
    ],
    specialities: [
        {
            name: String,
            timestamp: Date
        }
    ],
    aiMessageDoctorEnglish: String,
    aiMessageDoctorArabic: String,
    aiMessageDoctorTimestamp: { type: String }

});



// Define Patient model
const Patient = patientDataDB.model('Patient', patientSchema, 'patient_data');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));

app.use(`${basePath}`, express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');


function formatTimestamp(date) {
    const options = { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
    };
    return new Date(date).toLocaleString('en-US', options); // Format to "MM/DD/YYYY, HH:mm AM/PM"
}

// Function to write logs
function writeLog(message, fileName) {
    const logDir = path.join(__dirname, 'logs'); // Directory to store logs
    const logFilePath = path.join(logDir, fileName); // Full path to the log file

    // Ensure the logs directory exists
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir);
    }

    // Append the message to the log file
    fs.appendFile(logFilePath, `${new Date().toISOString()} - ${message}\n`, (err) => {
        if (err) {
            console.error('Failed to write to log file:', err);
        }
    });
}

const router = express.Router();

router.get('/codes', (req, res) => {
    const { page = 1, limit = 50, searchTerm = '' } = req.query;
  
    try {
      let filteredCodes;
  
      // If there's no searchTerm or it's shorter than 3 characters, show ALL codes
      // If there's no searchTerm or it's shorter than 3 characters, show ALL codes
      if (!searchTerm || searchTerm.length < 3) {
        filteredCodes = codesData;
      } else {
        const lowerTerm = searchTerm.toLowerCase();
        filteredCodes = codesData.filter(item =>
          item.code.toLowerCase().includes(lowerTerm) ||
          item.description.toLowerCase().includes(lowerTerm)
        );
      }
  
      // Paginate the results
      const startIndex = (page - 1) * limit;
      const paginatedCodes = filteredCodes.slice(startIndex, startIndex + Number(limit));
  
      res.json(paginatedCodes);
    } catch (error) {
      console.error('Error fetching codes:', error);
      res.status(500).send('Internal Server Error');
    }
  });
  

const uri3 = 'mongodb+srv://admin:admin@mydevopsdb.5hmumeq.mongodb.net/manage_doctors';
let db3;

const client3 = new MongoClient(uri3, { useNewUrlParser: true, useUnifiedTopology: true });
client3.connect().then(() => {
    db3 = client3.db('manage_doctors');
    console.log('Connected to manage_doctors database');
}).catch(error => {
    console.error('Failed to connect to manage_doctors database', error);
});

function checkAuth(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/');
    }
}



const client = new MongoClient(process.env.DATA_ENTRY_MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });

let db;
let patientDataCollection;

async function connectDB() {
    try {
        await client.connect();
        db = client.db('Data_Entry_Incoming'); // Use your database name here
        patientDataCollection = db.collection('patient_data'); // Access patient_data collection
        console.log('Connected to MongoDB successfully! for SurveyData pull');
    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
    }
}

// Call the connectDB function when the app starts
connectDB();

// Route to generate and serve patient_health_scores CSV
router.get('/patient_health_scores_csv', async (req, res) => {
    const { mr_no } = req.query;

    try {
        const patientData = await patientDataCollection.findOne({ Mr_no: mr_no });

        if (!patientData || !patientData.SurveyData || !patientData.SurveyData.patient_health_scores) {
            return res.status(404).send('Patient health scores not found.');
        }

        const patientHealthScores = patientData.SurveyData.patient_health_scores.map(score => ({
            date: score.date,
            months_since_baseline: score.months_since_baseline,
            score: score.score,
            trace_name: score.trace_name,
            title: score.title,
            ymin: score.ymin,
            ymax: score.ymax,
            event_date: score.event_date,
            event: score.event,
        }));

        const { Parser } = require('json2csv');
        const parser = new Parser({ fields: Object.keys(patientHealthScores[0]) });
        const csv = parser.parse(patientHealthScores);

        res.header('Content-Type', 'text/csv');
        res.attachment(`patient_health_scores_${mr_no}.csv`);
        res.send(csv);
    } catch (err) {
        console.error('Error generating patient health scores CSV:', err);
        res.status(500).send('Internal Server Error');
    }
});


router.get('/api_surveys_csv', async (req, res) => {
    const { mr_no } = req.query;

    try {
        const patientData = await patientDataCollection.findOne({ Mr_no: mr_no });

        if (!patientData || !patientData.SurveyData || !patientData.SurveyData.API_SURVEYS) {
            return res.status(404).send('API Surveys not found or empty.');
        }

        const apiSurveys = patientData.SurveyData.API_SURVEYS.map(survey => ({
            date: survey.date || 'N/A',
            months_since_baseline: survey.months_since_baseline || 'N/A',
            score: survey.score || 'N/A',
            trace_name: survey.trace_name || 'N/A',
            title: survey.title || 'N/A',
            ymin: survey.ymin || 'N/A',
            ymax: survey.ymax || 'N/A',
            event_date: survey.event_date || 'N/A',
            event: survey.event || 'N/A',
        }));

        if (apiSurveys.length === 0) {
            return res.status(404).send('No API Surveys data available.');
        }

        const { Parser } = require('json2csv');
        const parser = new Parser({ fields: Object.keys(apiSurveys[0]) });
        const csv = parser.parse(apiSurveys);

        res.header('Content-Type', 'text/csv');
        res.attachment(`api_surveys_${mr_no}.csv`);
        res.send(csv);
    } catch (err) {
        console.error('Error generating API Surveys CSV:', err);
        res.status(500).send('Internal Server Error');
    }
});




// router.get('/api/surveysent', async (req, res) => {
//     try {
//         const { department, siteName, surveyType, doctorId } = req.query;
        
//         // Update collection name if necessary:
//         // e.g. 'test' or 'pretest' or whatever your data is in
//         const collection = dashboardDb.collection('pretest'); 

//         // Simple pipeline: sum up "SurveySent"
//         const aggregationPipeline = [
//             {
//                 $match: {
//                     ...(department && { departmentName: department }),
//                     ...(siteName && { siteName }),
//                     ...(surveyType && { surveyType }),
//                     ...(doctorId && doctorId !== 'all' && { doctorId })
//                 }
//             },
//             {
//                 $group: {
//                     _id: null,
//                     // <-- Sum the numeric "SurveySent" field
//                     totalSurveysSent: { $sum: "$surveySent" }
//                 }
//             }
//         ];

//         const results = await collection.aggregate(aggregationPipeline).toArray();
//         // If no documents matched, default to 0
//         const data = results[0] || { totalSurveysSent: 0 };

//         // Return the final object
//         res.json(data);

//     } catch (error) {
//         console.error("Error fetching survey sent data:", error);
//         res.status(500).json({ message: "Error fetching survey sent data" });
//     }
// });




// //This is with doctorId

// //New route that can real-time registered patients with cdc(change data capture).

// router.get('/api/registeredpatients', async (req, res) => {
//     try {
//         const { department, siteName, surveyType, doctorId } = req.query;
        
//         // Use 'pretest' collection instead of 'test'
//         const collection = dashboardDb.collection('pretest');

//         const aggregationPipeline = [
//             {
//                 $match: {
//                     ...(department && { departmentName: department }),
//                     ...(siteName && { siteName }),
//                     ...(surveyType && { surveyType }),
//                     ...(doctorId && doctorId !== 'all' && { doctorId })
//                 }
//             },
//             {
//                 $group: {
//                     _id: "$patientId",
//                     surveysSent: { $addToSet: "$surveyType" },
//                     surveysCompleted: {
//                         $addToSet: {
//                             surveyType: "$surveyType",
//                             receivedDate: "$surveyReceivedDate"
//                         }
//                     }
//                 }
//             },
//             {
//                 $project: {
//                     totalSurveysSent: { $size: "$surveysSent" },
//                     totalSurveysCompleted: {
//                         $size: {
//                             $filter: {
//                                 input: "$surveysCompleted",
//                                 as: "survey",
//                                 cond: { $ifNull: ["$$survey.receivedDate", false] }
//                             }
//                         }
//                     }
//                 }
//             },
//             {
//                 $group: {
//                     _id: null,
//                     uniquePatientIds: { $addToSet: "$_id" },
//                     totalSurveysSent: { $sum: "$totalSurveysSent" },
//                     totalSurveysCompleted: { $sum: "$totalSurveysCompleted" }
//                 }
//             },
//             {
//                 $project: {
//                     _id: 0,
//                     totalPatientsRegistered: { $size: "$uniquePatientIds" },
//                     totalSurveysSent: 1,
//                     totalSurveysCompleted: 1,
//                     surveyResponseRate: {
//                         $multiply: [
//                             {
//                                 $cond: [
//                                     { $eq: ["$totalSurveysSent", 0] },
//                                     0,
//                                     { $divide: ["$totalSurveysCompleted", "$totalSurveysSent"] }
//                                 ]
//                             },
//                             100
//                         ]
//                     }
//                 }
//             }
//         ];

//         const results = await collection.aggregate(aggregationPipeline).toArray();
//         const patientpredata = results[0];
//         res.json(patientpredata);
//     } catch (error) {
//         console.error("Error fetching registered patient data:", error);
//         res.status(500).json({ message: "Error fetching registered patient data" });
//     }
// });


// router.get('/api/summary', async (req, res) => {
//     try {
//         // 1) Add doctorId to the destructuring
//         const { department, siteName, surveyType, doctorId } = req.query;
//         const collection = dashboardDb.collection('test');

//         const aggregationPipeline = [
//             {
//                 $match: {
//                     ...(department && { departmentName: department }),
//                     ...(siteName && { siteName }),
//                     ...(surveyType && { surveyType }),
//                     // 2) Filter by doctorId if provided and not "all"
//                     ...(doctorId && doctorId !== 'all' && { doctorId })
//                 }
//             },
//             {
//                 $group: {
//                     _id: "$patientId",
//                     surveysSent: { $addToSet: "$surveyType" },
//                     surveysCompleted: {
//                         $addToSet: {
//                             surveyType: "$surveyType",
//                             receivedDate: "$surveyReceivedDate"
//                         }
//                     }
//                 }
//             },
//             {
//                 $project: {
//                     totalSurveysSent: { $size: "$surveysSent" },
//                     totalSurveysCompleted: {
//                         $size: {
//                             $filter: {
//                                 input: "$surveysCompleted",
//                                 as: "survey",
//                                 cond: { $ifNull: ["$$survey.receivedDate", false] }
//                             }
//                         }
//                     }
//                 }
//             },
//             {
//                 $group: {
//                     _id: null,
//                     uniquePatientIds: { $addToSet: "$_id" },
//                     totalSurveysSent: { $sum: "$totalSurveysSent" },
//                     totalSurveysCompleted: { $sum: "$totalSurveysCompleted" }
//                 }
//             },
//             {
//                 $project: {
//                     _id: 0,
//                     totalPatientsRegistered: { $size: "$uniquePatientIds" },
//                     totalSurveysSent: 1,
//                     totalSurveysCompleted: 1,
//                     surveyResponseRate: {
//                         $multiply: [
//                             { 
//                                 $cond: [
//                                     { $eq: ["$totalSurveysSent", 0] }, 
//                                     0, 
//                                     { $divide: ["$totalSurveysCompleted", "$totalSurveysSent"] }
//                                 ]
//                             },
//                             100
//                         ]
//                     }
//                 }
//             }
//         ];

//         const results = await collection.aggregate(aggregationPipeline).toArray();
//         const summaryData = results[0];
//         res.json(summaryData);
//     } catch (error) {
//         console.error("Error fetching summary data:", error);
//         res.status(500).json({ message: "Error fetching summary data" });
//     }
// });


// router.get('/api/response-rate-time-series', async (req, res) => {
//     try {
//         // Pull department, siteName, surveyType, and doctorId from req.query
//         const { department, siteName, surveyType, doctorId } = req.query;
//         const collection = dashboardDb.collection('test');

//         const aggregationPipeline = [
//             {
//                 $match: {
//                     surveySentDate: { $exists: true },
//                     ...(department && { departmentName: department }), // Filter by department if provided
//                     ...(siteName && { siteName }),                      // Filter by siteName if provided
//                     ...(surveyType && { surveyType }),                  // Filter by surveyType if provided
//                     ...(doctorId && doctorId !== 'all' && { doctorId })   // Filter by doctorId if provided and not "all"
//                 }
//             },
//             {
//                 $addFields: {
//                     monthYear: { $dateToString: { format: "%Y-%m", date: "$surveySentDate" } },
//                     isCompleted: {
//                         $cond: [
//                             { $ifNull: ["$surveyReceivedDate", false] },
//                             1,
//                             0
//                         ]
//                     }
//                 }
//             },
//             {
//                 $group: {
//                     _id: "$monthYear",
//                     totalSurveysSent: { $sum: 1 },
//                     totalSurveysCompleted: { $sum: "$isCompleted" }
//                 }
//             },
//             {
//                 $project: {
//                     _id: 0,
//                     monthYear: "$_id",
//                     responseRate: {
//                         $cond: [
//                             { $eq: ["$totalSurveysSent", 0] },
//                             0,
//                             {
//                                 $multiply: [
//                                     { $divide: ["$totalSurveysCompleted", "$totalSurveysSent"] },
//                                     100
//                                 ]
//                             }
//                         ]
//                     }
//                 }
//             },
//             { $sort: { monthYear: 1 } }
//         ];

//         const results = await collection.aggregate(aggregationPipeline).toArray();
//         res.json(results);
//     } catch (error) {
//         console.error("Error fetching time series response rate data:", error);
//         res.status(500).json({ message: "Error fetching data" });
//     }
// });



// router.get('/api/mean-score-by-survey-timeline', async (req, res) => {
//     try {
//         const { promsInstrument, diagnosisICD10, scale, department, siteName, intervention, doctorId } = req.query;
//         const collection = dashboardDb.collection('test');

//         // Build a match object, ignoring filters when they're "null" or "all"
//         const matchStage = {};

//         if (promsInstrument && promsInstrument !== 'null' && promsInstrument !== 'all') {
//             matchStage.promsInstrument = promsInstrument;
//         }
//         if (scale && scale !== 'null' && scale !== 'all') {
//             matchStage.scale = scale;
//         }
//         if (department && department !== 'null') {
//             matchStage.departmentName = department;
//         }
//         if (siteName && siteName !== 'null') {
//             matchStage.siteName = siteName;
//         }
//         // NEW: Handle intervention filter
//         if (intervention && intervention !== 'null' && intervention !== 'all') {
//             matchStage.intervention = intervention;
//         }
//         // NEW: Handle doctorId filter
//         if (doctorId && doctorId !== 'null' && doctorId !== 'all') {
//             matchStage.doctorId = doctorId;
//         }

//         // We also only want documents where a response was actually received
//         matchStage.surveyReceivedDate = { $ne: null };

//         // Handle "all", "null", or a real diagnosis
//         if (diagnosisICD10 === 'all') {
//             // Skip adding any diagnosis filter
//         } else if (diagnosisICD10 === 'null') {
//             matchStage.$or = [
//                 { diagnosisICD10: null },
//                 { diagnosisICD10: { $exists: false } }
//             ];
//         } else if (diagnosisICD10 && diagnosisICD10 !== 'null') {
//             matchStage.diagnosisICD10 = diagnosisICD10;
//         }

//         const aggregationPipeline = [
//             { $match: matchStage },
//             {
//                 $group: {
//                     _id: "$surveyType",
//                     meanScore: { $avg: "$score" },
//                     patientIds: { $addToSet: "$patientId" }
//                 }
//             },
//             {
//                 $project: {
//                     _id: 0,
//                     surveyType: "$_id",
//                     meanScore: 1,
//                     patientCount: { $size: "$patientIds" }
//                 }
//             },
//             { $sort: { surveyType: 1 } }
//         ];

//         const results = await collection.aggregate(aggregationPipeline).toArray();
//         res.json(results);
//     } catch (error) {
//         console.error("Error fetching mean score data:", error);
//         res.status(500).json({ message: "Error fetching mean score data" });
//     }
// });





// router.get('/api/get-hierarchical-options', async (req, res) => {
//     try {
//         const { department, siteName, doctorId } = req.query; // Include doctorId from query
//         const collection = dashboardDb.collection('test');

//         const aggregationPipeline = [
//             // Add department, siteName, and doctorId match if provided
//             ...(department || siteName || (doctorId && doctorId !== 'all') ? [{
//                 $match: {
//                     ...(department && { departmentName: department }),
//                     ...(siteName && { siteName: siteName }),
//                     ...(doctorId && doctorId !== 'all' && { doctorId: doctorId })
//                 }
//             }] : []),
//             {
//                 $group: {
//                     _id: {
//                         diagnosisICD10: "$diagnosisICD10",
//                         promsInstrument: "$promsInstrument",
//                         scale: "$scale"
//                     }
//                 }
//             },
//             {
//                 $group: {
//                     _id: {
//                         diagnosisICD10: "$_id.diagnosisICD10",
//                         promsInstrument: "$_id.promsInstrument"
//                     },
//                     scales: { $addToSet: "$_id.scale" }
//                 }
//             },
//             {
//                 $group: {
//                     _id: "$_id.diagnosisICD10",
//                     promsInstruments: {
//                         $push: {
//                             promsInstrument: "$_id.promsInstrument",
//                             scales: "$scales"
//                         }
//                     }
//                 }
//             },
//             {
//                 $project: {
//                     _id: 0,
//                     diagnosisICD10: "$_id",
//                     promsInstruments: 1
//                 }
//             },
//             { $sort: { diagnosisICD10: 1 } }
//         ];

//         const results = await collection.aggregate(aggregationPipeline).toArray();
//         res.json(results);
//     } catch (error) {
//         console.error("Error fetching hierarchical dropdown values:", error);
//         res.status(500).json({ message: "Error fetching dropdown values" });
//     }
// });






//This is doctorId

// router.get('/api/proms-scores', async (req, res) => {
//     const {
//       promsInstrument,
//       diagnosisICD10,
//       scale,
//       department,
//       siteName,
//       surveyType,
//       intervention,  // NEW: extract intervention from query
//       doctorId       // NEW: extract doctorId from query
//     } = req.query;
  
//     try {
//       const collection = dashboardDb.collection('test');
//       const query = {};
  
//       // Skip instrument if it's 'null' or 'all'
//       if (promsInstrument && promsInstrument !== 'null' && promsInstrument !== 'all') {
//         query.promsInstrument = promsInstrument;
//       }
//       // Skip scale if it's 'null' or 'all'
//       if (scale && scale !== 'null' && scale !== 'all') {
//         query.scale = scale;
//       }
//       if (department && department !== 'null') {
//         query.departmentName = department;
//       }
//       if (siteName && siteName !== 'null') {
//         query.siteName = siteName;
//       }
//       // Optionally filter by surveyType
//       if (surveyType && surveyType !== 'null') {
//         query.surveyType = surveyType;
//       }
//       // Handle intervention filter—skip if it's 'null' or 'all'
//       if (intervention && intervention !== 'null' && intervention !== 'all') {
//         query.intervention = intervention;
//       }
//       // NEW: Handle doctorId filter—skip if it's 'null' or 'all'
//       if (doctorId && doctorId !== 'null' && doctorId !== 'all') {
//         query.doctorId = doctorId;
//       }
  
//       // Return only documents that have a received date
//       query.surveyReceivedDate = { $exists: true };
  
//       // Handle "all", "null", or a specific diagnosis
//       if (diagnosisICD10 === 'all') {
//           // Skip adding a diagnosis filter
//       } else if (diagnosisICD10 === 'null') {
//           query.$or = [
//               { diagnosisICD10: null },
//               { diagnosisICD10: { $exists: false } }
//           ];
//       } else if (diagnosisICD10 && diagnosisICD10 !== 'null') {
//           query.diagnosisICD10 = diagnosisICD10;
//       }
  
//       // Project the fields we need
//       const projection = {
//           _id: 0,
//           surveyReceivedDate: 1,
//           score: 1,
//           patientId: 1,
//           surveyType: 1
//       };
  
//       const results = await collection
//           .find(query)
//           .project(projection)
//           .toArray();
  
//       res.json(results);
//     } catch (error) {
//       console.error("Error fetching PROMs scores for scatter plot:", error);
//       res.status(500).json({ message: "Error fetching data" });
//     }
// });

  



// //This is for doctorId


// router.get('/api/treatment-diagnosis-heatmap', async (req, res) => {
//     try {
//       const { department, siteName, diagnosisICD10, promsInstrument, scale, intervention, doctorId } = req.query;
//       const collection = dashboardDb.collection('test');
  
//       // Build matchStage, skipping filter if values are "null" or "all"
//       const matchStage = {};
  
//       if (department && department !== 'null') {
//         matchStage.departmentName = department;
//       }
//       if (siteName && siteName !== 'null') {
//         matchStage.siteName = siteName;
//       }
//       if (promsInstrument && promsInstrument !== 'null' && promsInstrument !== 'all') {
//         matchStage.promsInstrument = promsInstrument;
//       }
//       if (scale && scale !== 'null' && scale !== 'all') {
//         matchStage.scale = scale;
//       }
//       // NEW: Handle intervention filter
//       if (intervention && intervention !== 'null' && intervention !== 'all') {
//         matchStage.intervention = intervention;
//       }
//       // NEW: Handle doctorId filter
//       if (doctorId && doctorId !== 'null' && doctorId !== 'all') {
//         matchStage.doctorId = doctorId;
//       }
  
//       let aggregationPipeline;
  
//       if (
//         diagnosisICD10 &&
//         diagnosisICD10 !== 'null' &&
//         diagnosisICD10 !== 'all'
//       ) {
//         matchStage.diagnosisICD10 = diagnosisICD10;
  
//         aggregationPipeline = [
//           { $match: matchStage },
//           {
//             $group: {
//               _id: {
//                 treatmentPlan: "$treatmentPlan",
//                 diagnosisICD10: "$diagnosisICD10"
//               },
//               uniquePatientIds: { $addToSet: "$patientId" }
//             }
//           },
//           {
//             $project: {
//               _id: 0,
//               treatmentPlan: "$_id.treatmentPlan",
//               diagnosisICD10: "$_id.diagnosisICD10",
//               count: { $size: "$uniquePatientIds" }
//             }
//           }
//         ];
//       } else if (diagnosisICD10 === 'null') {
//         aggregationPipeline = [
//           { $match: matchStage },
//           {
//             $group: {
//               _id: "$patientId",
//               allDiagnoses: { $addToSet: "$diagnosisICD10" },
//               allTreatments: { $addToSet: "$treatmentPlan" }
//             }
//           },
//           {
//             $match: {
//               allDiagnoses: { $not: { $elemMatch: { $ne: null } } },
//               allTreatments: { $not: { $elemMatch: { $ne: null } } }
//             }
//           },
//           {
//             $group: {
//               _id: null,
//               count: { $sum: 1 }
//             }
//           },
//           {
//             $project: {
//               _id: 0,
//               count: 1
//             }
//           }
//         ];
//       } else if (diagnosisICD10 === 'all') {
//         aggregationPipeline = [
//           { $match: matchStage },
//           {
//             $group: {
//               _id: {
//                 treatmentPlan: "$treatmentPlan",
//                 diagnosisICD10: "$diagnosisICD10"
//               },
//               uniquePatientIds: { $addToSet: "$patientId" }
//             }
//           },
//           {
//             $project: {
//               _id: 0,
//               treatmentPlan: "$_id.treatmentPlan",
//               diagnosisICD10: "$_id.diagnosisICD10",
//               count: { $size: "$uniquePatientIds" }
//             }
//           }
//         ];
//       } else {
//         aggregationPipeline = [
//           { $match: matchStage },
//           {
//             $group: {
//               _id: {
//                 treatmentPlan: "$treatmentPlan",
//                 diagnosisICD10: "$diagnosisICD10"
//               },
//               uniquePatientIds: { $addToSet: "$patientId" }
//             }
//           },
//           {
//             $project: {
//               _id: 0,
//               treatmentPlan: "$_id.treatmentPlan",
//               diagnosisICD10: "$_id.diagnosisICD10",
//               count: { $size: "$uniquePatientIds" }
//             }
//           }
//         ];
//       }
  
//       const results = await collection.aggregate(aggregationPipeline).toArray();
//       res.json(results);
  
//     } catch (error) {
//       console.error("Error fetching treatment-diagnosis data:", error);
//       res.status(500).json({ message: "Error fetching treatment-diagnosis data" });
//     }
// });



// //This is for doctorId

// router.get('/api/patients-mcid-count', async (req, res) => {
//     try {
//         const { promsInstrument, diagnosisICD10, scale, department, siteName, intervention, doctorId } = req.query;
//         const collection = dashboardDb.collection('test');

//         // Build a match object, skipping filters if they're "null" or "all"
//         const matchStage = {};

//         if (department && department !== 'null') {
//             matchStage.departmentName = department;
//         }
//         if (siteName && siteName !== 'null') {
//             matchStage.siteName = siteName;
//         }
//         // If instrument is 'null' or 'all', skip
//         if (promsInstrument && promsInstrument !== 'null' && promsInstrument !== 'all') {
//             matchStage.promsInstrument = promsInstrument;
//         }
//         // If scale is 'null' or 'all', skip
//         if (scale && scale !== 'null' && scale !== 'all') {
//             matchStage.scale = scale;
//         }
//         // NEW: Handle intervention filter—skip if it's 'null' or 'all'
//         if (intervention && intervention !== 'null' && intervention !== 'all') {
//             matchStage.intervention = intervention;
//         }
//         // NEW: Handle doctorId filter—skip if it's 'null' or 'all'
//         if (doctorId && doctorId !== 'null' && doctorId !== 'all') {
//             matchStage.doctorId = doctorId;
//         }

//         // Handle the diagnosis filter
//         if (diagnosisICD10 === 'all') {
//             // Skip adding any diagnosis filter
//         } else if (diagnosisICD10 === 'null') {
//             matchStage.$or = [
//                 { diagnosisICD10: null },
//                 { diagnosisICD10: { $exists: false } }
//             ];
//         } else if (diagnosisICD10 && diagnosisICD10 !== 'null') {
//             matchStage.diagnosisICD10 = diagnosisICD10;
//         }

//         const aggregationPipeline = [
//             { $match: matchStage },
//             {
//                 $group: {
//                     _id: {
//                         surveyType: "$surveyType",
//                         mcid: "$mcid",
//                         patientId: "$patientId"
//                     }
//                 }
//             },
//             {
//                 $group: {
//                     _id: "$_id.surveyType",
//                     uniquePatientIds: { $addToSet: "$_id.patientId" },
//                     mcidPatients: {
//                         $addToSet: {
//                             $cond: [{ $eq: ["$_id.mcid", 1] }, "$_id.patientId", null]
//                         }
//                     }
//                 }
//             },
//             {
//                 $project: {
//                     _id: 0,
//                     surveyType: "$_id",
//                     totalPatients: { $size: "$uniquePatientIds" },
//                     mcidAchieved: {
//                         $size: {
//                             $filter: {
//                                 input: "$mcidPatients",
//                                 as: "id",
//                                 cond: { $ne: ["$$id", null] }
//                             }
//                         }
//                     }
//                 }
//             },
//             { $sort: { surveyType: 1 } }
//         ];

//         const results = await collection.aggregate(aggregationPipeline).toArray();
//         res.json(results);
//     } catch (error) {
//         console.error("Error fetching MCID data:", error);
//         res.status(500).json({ message: "Error fetching MCID data" });
//     }
// });


// // Updated /api/get-intervention-options route
// router.get('/api/get-intervention-options', async (req, res) => {
//     try {
//       const { department, siteName } = req.query;
//       const collection = dashboardDb.collection('test');
//       const query = {};
  
//       // Only add filters if provided and not set to "all"
//       if (department && department !== 'all') {
//         query.departmentName = department;
//       }
//       if (siteName && siteName !== 'all') {
//         query.siteName = siteName;
//       }
  
//       // Return distinct intervention values based on the query
//       const interventions = await collection.distinct('intervention', query);
//       res.json(interventions);
//     } catch (error) {
//       console.error("Error fetching intervention options:", error);
//       res.status(500).json({ message: "Error fetching intervention options" });
//     }
//   });
  



router.get('/api/get-department-options', async (req, res) => {
    try {
        const collection = dashboardDb.collection('test');
        const departments = await collection.distinct("departmentName"); // Adjust the field name if different
        res.json(departments);
    } catch (error) {
        console.error("Error fetching department options:", error);
        res.status(500).json({ message: "Error fetching department options" });
    }
});

router.get('/api/get-site-options', async (req, res) => {
    try {
        const { department } = req.query;
        const collection = dashboardDb.collection('test');

        const query = department ? { departmentName: department } : {};

        const sites = await collection.distinct("siteName", query); // Fetch unique siteNames based on department
        res.json(sites);
    } catch (error) {
        console.error("Error fetching site options:", error);
        res.status(500).json({ message: "Error fetching site options" });
    }
});


// In your routes file, e.g., app.js or routes.js
router.get('/api/get-survey-types', async (req, res) => {
    try {
      const collection = dashboardDb.collection('test');
      // distinct returns all unique values for the specified field
      const surveyTypes = await collection.distinct('surveyType');
      res.json(surveyTypes);
    } catch (error) {
      console.error('Error fetching survey types:', error);
      res.status(500).json({ message: 'Error fetching survey types' });
    }
  });


// // NEW: Route to get distinct doctor IDs (optionally filtered by department or site)
// router.get('/api/get-doctorid-options', async (req, res) => {
//     try {
//       const { department, siteName } = req.query;
//       const collection = dashboardDb.collection('test');
      
//       // Build query based on optional filters
//       const query = {};
//       if (department && department !== 'all') {
//         query.departmentName = department;
//       }
//       if (siteName && siteName !== 'all') {
//         query.siteName = siteName;
//       }
      
//       // Get distinct doctorId values
//       const doctorIds = await collection.distinct("doctorId", query);
//       res.json(doctorIds);
//     } catch (error) {
//       console.error("Error fetching doctorId options:", error);
//       res.status(500).json({ message: "Error fetching doctorId options" });
//     }
//   });
  
  



// // Routes
router.get('/', (req, res) => {
    res.render('login', {
        lng: res.locals.lng,
        dir: res.locals.dir,
    });
});


// router.get('/dashboard', checkAuth, (req, res) => {
//     // Pass doctor and basePath to the template
//     const doctor = req.session.user;
//     res.render('doc_dashboard', { doctor, basePath });
// });


// router.get('/dashboard', checkAuth, async (req, res) => {
//     try {
//       const doctor = req.session.user;        // The logged-in doctor
//       const doctorUsername = doctor.username; // We'll match this to doctorId in `test` collection
  
//       // Grab first record in 'test' where `doctorId` = the logged-in user’s username
//       const docRecord = await dashboardDb.collection('test').findOne({ doctorId: doctorUsername });
  
//       // Extract siteName and departmentName; fallback to empty string if not found
//       const siteName = docRecord?.siteName || '';
//       const departmentName = docRecord?.departmentName || '';
  
//       // Pass them into doc_dashboard.ejs, along with everything else you already pass
//       res.render('doc_dashboard', {
//         doctor,
//         basePath,
//         siteName,
//         departmentName
//       });
//     } catch (error) {
//       console.error('Error in /dashboard route:', error);
//       res.status(500).send('Internal Server Error');
//     }
//   });
  


// --- Modified API Routes ---

// a. /api/surveysent
router.get('/api/surveysent', async (req, res) => {
    try {
        // ADDED: hospitalId, hospitalName
        const { department, siteName, surveyType, doctorId, hospitalId, hospitalName } = req.query;

        const collection = dashboardDb.collection('pretest'); // Using pretest as specified

        const aggregationPipeline = [
            {
                $match: {
                    ...(department && { departmentName: department }),
                    ...(siteName && { siteName }),
                    ...(surveyType && { surveyType }),
                    ...(doctorId && doctorId !== 'all' && { doctorId }),
                    ...(hospitalId && { hospitalId }), // ADDED filter
                    ...(hospitalName && { hospitalName }) // ADDED filter
                }
            },
            {
                $group: {
                    _id: null,
                    totalSurveysSent: { $sum: "$surveySent" }
                }
            }
        ];

        const results = await collection.aggregate(aggregationPipeline).toArray();
        const data = results[0] || { totalSurveysSent: 0 };
        res.json(data);

    } catch (error) {
        console.error("Error fetching survey sent data:", error);
        res.status(500).json({ message: "Error fetching survey sent data" });
    }
});

// b. /api/registeredpatients
router.get('/api/registeredpatients', async (req, res) => {
    try {
        // ADDED: hospitalId, hospitalName
        const { department, siteName, surveyType, doctorId, hospitalId, hospitalName } = req.query;

        const collection = dashboardDb.collection('pretest'); // Using pretest as specified

        const aggregationPipeline = [
            {
                $match: {
                    ...(department && { departmentName: department }),
                    ...(siteName && { siteName }),
                    ...(surveyType && { surveyType }),
                    ...(doctorId && doctorId !== 'all' && { doctorId }),
                    ...(hospitalId && { hospitalId }), // ADDED filter
                    ...(hospitalName && { hospitalName }) // ADDED filter
                }
            },
            {
                $group: {
                    _id: "$patientId",
                    surveysSent: { $addToSet: "$surveyType" },
                    surveysCompleted: {
                        $addToSet: {
                            surveyType: "$surveyType",
                            receivedDate: "$surveyReceivedDate"
                        }
                    }
                }
            },
            {
                $project: {
                    totalSurveysSent: { $size: "$surveysSent" },
                    totalSurveysCompleted: {
                        $size: {
                            $filter: {
                                input: "$surveysCompleted",
                                as: "survey",
                                cond: { $ifNull: ["$$survey.receivedDate", false] }
                            }
                        }
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    uniquePatientIds: { $addToSet: "$_id" },
                    totalSurveysSent: { $sum: "$totalSurveysSent" },
                    totalSurveysCompleted: { $sum: "$totalSurveysCompleted" }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalPatientsRegistered: { $size: "$uniquePatientIds" },
                    totalSurveysSent: 1,
                    totalSurveysCompleted: 1,
                    surveyResponseRate: {
                        $multiply: [
                            {
                                $cond: [
                                    { $eq: ["$totalSurveysSent", 0] },
                                    0,
                                    { $divide: ["$totalSurveysCompleted", "$totalSurveysSent"] }
                                ]
                            },
                            100
                        ]
                    }
                }
            }
        ];

        const results = await collection.aggregate(aggregationPipeline).toArray();
        const patientpredata = results[0] || { totalPatientsRegistered: 0, totalSurveysSent: 0, totalSurveysCompleted: 0, surveyResponseRate: 0 }; // Ensure default object
        res.json(patientpredata);
    } catch (error) {
        console.error("Error fetching registered patient data:", error);
        res.status(500).json({ message: "Error fetching registered patient data" });
    }
});


// c. /api/summary
router.get('/api/summary', async (req, res) => {
    try {
        // ADDED: hospitalId, hospitalName
        const { department, siteName, surveyType, doctorId, hospitalId, hospitalName } = req.query;
        const collection = dashboardDb.collection('test'); // Uses 'test' collection

        const aggregationPipeline = [
            {
                $match: {
                    ...(department && { departmentName: department }),
                    ...(siteName && { siteName }),
                    ...(surveyType && { surveyType }),
                    ...(doctorId && doctorId !== 'all' && { doctorId }),
                    ...(hospitalId && { hospitalId }), // ADDED filter
                    ...(hospitalName && { hospitalName }) // ADDED filter
                }
            },
            // ... rest of the aggregation pipeline remains the same ...
            {
                $group: {
                    _id: "$patientId",
                    surveysSent: { $addToSet: "$surveyType" },
                    surveysCompleted: {
                        $addToSet: {
                            surveyType: "$surveyType",
                            receivedDate: "$surveyReceivedDate"
                        }
                    }
                }
            },
            {
                $project: {
                    totalSurveysSent: { $size: "$surveysSent" },
                    totalSurveysCompleted: {
                        $size: {
                            $filter: {
                                input: "$surveysCompleted",
                                as: "survey",
                                cond: { $ifNull: ["$$survey.receivedDate", false] }
                            }
                        }
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    uniquePatientIds: { $addToSet: "$_id" },
                    totalSurveysSent: { $sum: "$totalSurveysSent" },
                    totalSurveysCompleted: { $sum: "$totalSurveysCompleted" }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalPatientsRegistered: { $size: "$uniquePatientIds" },
                    totalSurveysSent: 1,
                    totalSurveysCompleted: 1,
                    surveyResponseRate: {
                        $multiply: [
                            {
                                $cond: [
                                    { $eq: ["$totalSurveysSent", 0] },
                                    0,
                                    { $divide: ["$totalSurveysCompleted", "$totalSurveysSent"] }
                                ]
                            },
                            100
                        ]
                    }
                }
            }
        ];

        const results = await collection.aggregate(aggregationPipeline).toArray();
        // Provide default values if no results
        const summaryData = results[0] || { totalPatientsRegistered: 0, totalSurveysSent: 0, totalSurveysCompleted: 0, surveyResponseRate: 0 };
        res.json(summaryData);
    } catch (error) {
        console.error("Error fetching summary data:", error);
        res.status(500).json({ message: "Error fetching summary data" });
    }
});

// d. /api/response-rate-time-series
router.get('/api/response-rate-time-series', async (req, res) => {
    try {
        // ADDED: hospitalId, hospitalName
        const { department, siteName, surveyType, doctorId, hospitalId, hospitalName } = req.query;
        const collection = dashboardDb.collection('test'); // Uses 'test' collection

        const aggregationPipeline = [
            {
                $match: {
                    surveySentDate: { $exists: true },
                    ...(department && { departmentName: department }),
                    ...(siteName && { siteName }),
                    ...(surveyType && { surveyType }),
                    ...(doctorId && doctorId !== 'all' && { doctorId }),
                    ...(hospitalId && { hospitalId }), // ADDED filter
                    ...(hospitalName && { hospitalName }) // ADDED filter
                }
            },
            // ... rest of the aggregation pipeline remains the same ...
            {
                $addFields: {
                    monthYear: { $dateToString: { format: "%Y-%m", date: "$surveySentDate" } },
                    isCompleted: {
                        $cond: [
                            { $ifNull: ["$surveyReceivedDate", false] },
                            1,
                            0
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: "$monthYear",
                    totalSurveysSent: { $sum: 1 },
                    totalSurveysCompleted: { $sum: "$isCompleted" }
                }
            },
            {
                $project: {
                    _id: 0,
                    monthYear: "$_id",
                    responseRate: {
                        $cond: [
                            { $eq: ["$totalSurveysSent", 0] },
                            0,
                            {
                                $multiply: [
                                    { $divide: ["$totalSurveysCompleted", "$totalSurveysSent"] },
                                    100
                                ]
                            }
                        ]
                    }
                }
            },
            { $sort: { monthYear: 1 } }
        ];

        const results = await collection.aggregate(aggregationPipeline).toArray();
        res.json(results);
    } catch (error) {
        console.error("Error fetching time series response rate data:", error);
        res.status(500).json({ message: "Error fetching data" });
    }
});

// e. /api/mean-score-by-survey-timeline
router.get('/api/mean-score-by-survey-timeline', async (req, res) => {
    try {
        // ADDED: hospitalId, hospitalName
        const { promsInstrument, diagnosisICD10, scale, department, siteName, intervention, doctorId, hospitalId, hospitalName } = req.query;
        const collection = dashboardDb.collection('test'); // Uses 'test' collection

        const matchStage = {};

        if (promsInstrument && promsInstrument !== 'null' && promsInstrument !== 'all') {
            matchStage.promsInstrument = promsInstrument;
        }
        if (scale && scale !== 'null' && scale !== 'all') {
            matchStage.scale = scale;
        }
        if (department && department !== 'null') {
            matchStage.departmentName = department;
        }
        if (siteName && siteName !== 'null') {
            matchStage.siteName = siteName;
        }
        if (intervention && intervention !== 'null' && intervention !== 'all') {
            matchStage.intervention = intervention;
        }
        if (doctorId && doctorId !== 'null' && doctorId !== 'all') {
            matchStage.doctorId = doctorId;
        }
        // ADDED Filters
        if (hospitalId && hospitalId !== 'null') {
            matchStage.hospitalId = hospitalId;
        }
        if (hospitalName && hospitalName !== 'null') {
            matchStage.hospitalName = hospitalName;
        }

        matchStage.surveyReceivedDate = { $ne: null };

        if (diagnosisICD10 === 'all') {
            // Skip adding any diagnosis filter
        } else if (diagnosisICD10 === 'null') {
            matchStage.$or = [
                { diagnosisICD10: null },
                { diagnosisICD10: { $exists: false } }
            ];
        } else if (diagnosisICD10 && diagnosisICD10 !== 'null') {
            matchStage.diagnosisICD10 = diagnosisICD10;
        }

        const aggregationPipeline = [
            { $match: matchStage },
            // ... rest of the aggregation pipeline remains the same ...
             {
                $group: {
                    _id: "$surveyType",
                    meanScore: { $avg: "$score" },
                    patientIds: { $addToSet: "$patientId" }
                }
            },
            {
                $project: {
                    _id: 0,
                    surveyType: "$_id",
                    meanScore: 1,
                    patientCount: { $size: "$patientIds" }
                }
            },
            { $sort: { surveyType: 1 } }
        ];

        const results = await collection.aggregate(aggregationPipeline).toArray();
        res.json(results);
    } catch (error) {
        console.error("Error fetching mean score data:", error);
        res.status(500).json({ message: "Error fetching mean score data" });
    }
});

// f. /api/get-hierarchical-options (Note: This gets options, typically not filtered by hospital directly unless needed for context)
router.get('/api/get-hierarchical-options', async (req, res) => {
    try {
        // ADDED: hospitalId, hospitalName
        const { department, siteName, doctorId, hospitalId, hospitalName } = req.query;
        const collection = dashboardDb.collection('test'); // Uses 'test' collection

        // Determine if any primary filters are present
        const hasPrimaryFilters = department || siteName || (doctorId && doctorId !== 'all') || hospitalId || hospitalName;

        const aggregationPipeline = [
            // Conditionally add the $match stage
            ...(hasPrimaryFilters ? [{
                $match: {
                    ...(department && { departmentName: department }),
                    ...(siteName && { siteName: siteName }),
                    ...(doctorId && doctorId !== 'all' && { doctorId: doctorId }),
                    ...(hospitalId && { hospitalId: hospitalId }), // ADDED filter
                    ...(hospitalName && { hospitalName: hospitalName }) // ADDED filter
                }
            }] : []),
            // ... rest of the aggregation pipeline remains the same ...
             {
                $group: {
                    _id: {
                        diagnosisICD10: "$diagnosisICD10",
                        promsInstrument: "$promsInstrument",
                        scale: "$scale"
                    }
                }
            },
            {
                $group: {
                    _id: {
                        diagnosisICD10: "$_id.diagnosisICD10",
                        promsInstrument: "$_id.promsInstrument"
                    },
                    scales: { $addToSet: "$_id.scale" }
                }
            },
            {
                $group: {
                    _id: "$_id.diagnosisICD10",
                    promsInstruments: {
                        $push: {
                            promsInstrument: "$_id.promsInstrument",
                            scales: "$scales"
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    diagnosisICD10: "$_id",
                    promsInstruments: 1
                }
            },
            { $sort: { diagnosisICD10: 1 } }
        ];

        const results = await collection.aggregate(aggregationPipeline).toArray();
        res.json(results);
    } catch (error) {
        console.error("Error fetching hierarchical dropdown values:", error);
        res.status(500).json({ message: "Error fetching dropdown values" });
    }
});


// h. /api/proms-scores
router.get('/api/proms-scores', async (req, res) => {
    // ADDED: hospitalId, hospitalName
    const {
      promsInstrument,
      diagnosisICD10,
      scale,
      department,
      siteName,
      surveyType,
      intervention,
      doctorId,
      hospitalId, // ADDED
      hospitalName // ADDED
    } = req.query;

    try {
      const collection = dashboardDb.collection('test'); // Uses 'test' collection
      const query = {};

      if (promsInstrument && promsInstrument !== 'null' && promsInstrument !== 'all') {
        query.promsInstrument = promsInstrument;
      }
      if (scale && scale !== 'null' && scale !== 'all') {
        query.scale = scale;
      }
      if (department && department !== 'null') {
        query.departmentName = department;
      }
      if (siteName && siteName !== 'null') {
        query.siteName = siteName;
      }
      if (surveyType && surveyType !== 'null') {
        query.surveyType = surveyType;
      }
      if (intervention && intervention !== 'null' && intervention !== 'all') {
        query.intervention = intervention;
      }
      if (doctorId && doctorId !== 'null' && doctorId !== 'all') {
        query.doctorId = doctorId;
      }
      // ADDED Filters
      if (hospitalId && hospitalId !== 'null') {
        query.hospitalId = hospitalId;
      }
      if (hospitalName && hospitalName !== 'null') {
        query.hospitalName = hospitalName;
      }

      query.surveyReceivedDate = { $exists: true };

      if (diagnosisICD10 === 'all') {
        // Skip diagnosis filter
      } else if (diagnosisICD10 === 'null') {
          query.$or = [
              { diagnosisICD10: null },
              { diagnosisICD10: { $exists: false } }
          ];
      } else if (diagnosisICD10 && diagnosisICD10 !== 'null') {
          query.diagnosisICD10 = diagnosisICD10;
      }

      const projection = {
          _id: 0,
          surveyReceivedDate: 1,
          score: 1,
          patientId: 1,
          surveyType: 1
      };

      const results = await collection
          .find(query)
          .project(projection)
          .toArray();

      res.json(results);
    } catch (error) {
      console.error("Error fetching PROMs scores for scatter plot:", error);
      res.status(500).json({ message: "Error fetching data" });
    }
});

// i. /api/treatment-diagnosis-heatmap
router.get('/api/treatment-diagnosis-heatmap', async (req, res) => {
    try {
        // ADDED: hospitalId, hospitalName
        const { department, siteName, diagnosisICD10, promsInstrument, scale, intervention, doctorId, hospitalId, hospitalName } = req.query;
        const collection = dashboardDb.collection('test'); // Uses 'test' collection

        const matchStage = {};

        if (department && department !== 'null') {
            matchStage.departmentName = department;
        }
        if (siteName && siteName !== 'null') {
            matchStage.siteName = siteName;
        }
        if (promsInstrument && promsInstrument !== 'null' && promsInstrument !== 'all') {
            matchStage.promsInstrument = promsInstrument;
        }
        if (scale && scale !== 'null' && scale !== 'all') {
            matchStage.scale = scale;
        }
        if (intervention && intervention !== 'null' && intervention !== 'all') {
            matchStage.intervention = intervention;
        }
        if (doctorId && doctorId !== 'null' && doctorId !== 'all') {
            matchStage.doctorId = doctorId;
        }
        // ADDED Filters
        if (hospitalId && hospitalId !== 'null') {
            matchStage.hospitalId = hospitalId;
        }
        if (hospitalName && hospitalName !== 'null') {
            matchStage.hospitalName = hospitalName;
        }

        let aggregationPipeline;

        // Logic for different diagnosisICD10 cases remains the same, but uses the updated matchStage
        if (diagnosisICD10 && diagnosisICD10 !== 'null' && diagnosisICD10 !== 'all') {
            matchStage.diagnosisICD10 = diagnosisICD10;
            aggregationPipeline = [ { $match: matchStage }, /* ... rest of specific diagnosis pipeline ... */
             {
                $group: {
                    _id: {
                        treatmentPlan: "$treatmentPlan",
                        diagnosisICD10: "$diagnosisICD10"
                    },
                    uniquePatientIds: { $addToSet: "$patientId" }
                }
            },
            {
                $project: {
                    _id: 0,
                    treatmentPlan: "$_id.treatmentPlan",
                    diagnosisICD10: "$_id.diagnosisICD10",
                    count: { $size: "$uniquePatientIds" }
                }
            }
           ];
        } else if (diagnosisICD10 === 'null') {
            aggregationPipeline = [ { $match: matchStage }, /* ... rest of null diagnosis pipeline ... */
             {
                $group: {
                    _id: "$patientId",
                    allDiagnoses: { $addToSet: "$diagnosisICD10" },
                    allTreatments: { $addToSet: "$treatmentPlan" }
                }
            },
            {
                $match: {
                    allDiagnoses: { $not: { $elemMatch: { $ne: null } } },
                    allTreatments: { $not: { $elemMatch: { $ne: null } } }
                }
            },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    count: 1
                }
            }
          ];
        } else { // Covers 'all' or default case
            aggregationPipeline = [ { $match: matchStage }, /* ... rest of all diagnosis pipeline ... */
             {
                $group: {
                    _id: {
                        treatmentPlan: "$treatmentPlan",
                        diagnosisICD10: "$diagnosisICD10"
                    },
                    uniquePatientIds: { $addToSet: "$patientId" }
                }
            },
            {
                $project: {
                    _id: 0,
                    treatmentPlan: "$_id.treatmentPlan",
                    diagnosisICD10: "$_id.diagnosisICD10",
                    count: { $size: "$uniquePatientIds" }
                }
            }
           ];
        }

        const results = await collection.aggregate(aggregationPipeline).toArray();
        res.json(results);

    } catch (error) {
        console.error("Error fetching treatment-diagnosis data:", error);
        res.status(500).json({ message: "Error fetching treatment-diagnosis data" });
    }
});


// j. /api/patients-mcid-count
router.get('/api/patients-mcid-count', async (req, res) => {
    try {
        // ADDED: hospitalId, hospitalName
        const { promsInstrument, diagnosisICD10, scale, department, siteName, intervention, doctorId, hospitalId, hospitalName } = req.query;
        const collection = dashboardDb.collection('test'); // Uses 'test' collection

        const matchStage = {};

        if (department && department !== 'null') {
            matchStage.departmentName = department;
        }
        if (siteName && siteName !== 'null') {
            matchStage.siteName = siteName;
        }
        if (promsInstrument && promsInstrument !== 'null' && promsInstrument !== 'all') {
            matchStage.promsInstrument = promsInstrument;
        }
        if (scale && scale !== 'null' && scale !== 'all') {
            matchStage.scale = scale;
        }
        if (intervention && intervention !== 'null' && intervention !== 'all') {
            matchStage.intervention = intervention;
        }
        if (doctorId && doctorId !== 'null' && doctorId !== 'all') {
            matchStage.doctorId = doctorId;
        }
         // ADDED Filters
        if (hospitalId && hospitalId !== 'null') {
            matchStage.hospitalId = hospitalId;
        }
        if (hospitalName && hospitalName !== 'null') {
            matchStage.hospitalName = hospitalName;
        }


        if (diagnosisICD10 === 'all') {
           // Skip diagnosis filter
        } else if (diagnosisICD10 === 'null') {
            matchStage.$or = [
                { diagnosisICD10: null },
                { diagnosisICD10: { $exists: false } }
            ];
        } else if (diagnosisICD10 && diagnosisICD10 !== 'null') {
            matchStage.diagnosisICD10 = diagnosisICD10;
        }

        const aggregationPipeline = [
            { $match: matchStage },
            // ... rest of the aggregation pipeline remains the same ...
             {
                $group: {
                    _id: {
                        surveyType: "$surveyType",
                        mcid: "$mcid", // Assuming mcid field exists
                        patientId: "$patientId"
                    }
                }
            },
            {
                $group: {
                    _id: "$_id.surveyType",
                    uniquePatientIds: { $addToSet: "$_id.patientId" },
                    mcidPatients: {
                        $addToSet: {
                            $cond: [{ $eq: ["$_id.mcid", 1] }, "$_id.patientId", null]
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    surveyType: "$_id",
                    totalPatients: { $size: "$uniquePatientIds" },
                    mcidAchieved: {
                        $size: {
                            $filter: {
                                input: "$mcidPatients",
                                as: "id",
                                cond: { $ne: ["$$id", null] }
                            }
                        }
                    }
                }
            },
            { $sort: { surveyType: 1 } }
        ];

        const results = await collection.aggregate(aggregationPipeline).toArray();
        res.json(results);
    } catch (error) {
        console.error("Error fetching MCID data:", error);
        res.status(500).json({ message: "Error fetching MCID data" });
    }
});


// k. /api/get-intervention-options
router.get('/api/get-intervention-options', async (req, res) => {
 try {
    // ADDED: hospitalId, hospitalName
   const { department, siteName, hospitalId, hospitalName } = req.query;
   const collection = dashboardDb.collection('test'); // Uses 'test' collection
   const query = {};

   if (department && department !== 'all') {
     query.departmentName = department;
   }
   if (siteName && siteName !== 'all') {
     query.siteName = siteName;
   }
    // ADDED Filters
   if (hospitalId && hospitalId !== 'all') {
     query.hospitalId = hospitalId;
   }
   if (hospitalName && hospitalName !== 'all') {
     query.hospitalName = hospitalName;
   }

   const interventions = await collection.distinct('intervention', query);
   res.json(interventions);
 } catch (error) {
   console.error("Error fetching intervention options:", error);
   res.status(500).json({ message: "Error fetching intervention options" });
 }
});

// l. /api/get-doctorid-options
router.get('/api/get-doctorid-options', async (req, res) => {
  try {
    // ADDED: hospitalId, hospitalName
    const { department, siteName, hospitalId, hospitalName } = req.query;
    const collection = dashboardDb.collection('test'); // Uses 'test' collection

    const query = {};
    if (department && department !== 'all') {
      query.departmentName = department;
    }
    if (siteName && siteName !== 'all') {
      query.siteName = siteName;
    }
    // ADDED Filters
    if (hospitalId && hospitalId !== 'all') {
      query.hospitalId = hospitalId;
    }
    if (hospitalName && hospitalName !== 'all') {
      query.hospitalName = hospitalName;
    }

    const doctorIds = await collection.distinct("doctorId", query);
    res.json(doctorIds);
  } catch (error) {
    console.error("Error fetching doctorId options:", error);
    res.status(500).json({ message: "Error fetching doctorId options" });
  }
});


// --- NEW API Routes ---

// Get distinct hospital IDs from pretest collection
router.get('/api/get-hospitalid-options', async (req, res) => {
    try {
        const collection = dashboardDb.collection('pretest'); // Use pretest collection
        const hospitalIds = await collection.distinct("hospitalId");
        res.json(hospitalIds.filter(id => id)); // Filter out null/empty values if necessary
    } catch (error) {
        console.error("Error fetching hospitalId options:", error);
        res.status(500).json({ message: "Error fetching hospitalId options" });
    }
});

// Get distinct hospital names from pretest collection, optionally filtered by hospitalId
router.get('/api/get-hospitalname-options', async (req, res) => {
    try {
        const { hospitalId } = req.query; // Optional filter
        const collection = dashboardDb.collection('pretest'); // Use pretest collection

        const query = hospitalId ? { hospitalId: hospitalId } : {}; // Apply filter if provided

        const hospitalNames = await collection.distinct("hospitalName", query);
        res.json(hospitalNames.filter(name => name)); // Filter out null/empty values
    } catch (error) {
        console.error("Error fetching hospitalName options:", error);
        res.status(500).json({ message: "Error fetching hospitalName options" });
    }
});


// --- Modified Page Route ---

// m. /dashboard
// router.get('/dashboard', checkAuth, async (req, res) => {
//     try {
//       const doctor = req.session.user;
//       const doctorUsername = doctor.username;

//       // Fetch relevant details including hospital info from the 'test' collection based on doctorId
//       const docRecord = await dashboardDb.collection('test').findOne(
//           { doctorId: doctorUsername },
//           { projection: { siteName: 1, departmentName: 1, hospitalId: 1, hospitalName: 1, _id: 0 } } // Specify fields to return
//       );

//       // Extract details, providing defaults if not found
//       const siteName = docRecord?.siteName || '';
//       const departmentName = docRecord?.departmentName || '';
//       const hospitalId = docRecord?.hospitalId || '';       // ADDED
//       const hospitalName = docRecord?.hospitalName || '';   // ADDED

//       // Pass all details to the EJS template
//       res.render('doc_dashboard', {
//         doctor,
//         basePath,
//         siteName,
//         departmentName,
//         hospitalId,   // ADDED
//         hospitalName  // ADDED
//       });
//     } catch (error) {
//       console.error('Error in /dashboard route:', error);
//       res.status(500).send('Internal Server Error');
//     }
//   });


//This is route where it will handle the users with no data in the test or pretest collection of the dashboard database.


// m. /dashboard (Modified)
router.get('/dashboard', checkAuth, async (req, res) => {
    try {
        const doctor = req.session.user;
        const doctorUsername = doctor.username;

        // --- START CHANGES ---
        // Check both collections to see if the doctor exists in either
        const doctorExistsInTest = await dashboardDb.collection('test').findOne(
            { doctorId: doctorUsername },
            { projection: { _id: 1, siteName: 1, departmentName: 1, hospitalId: 1, hospitalName: 1 } } // Include fields needed if found
        );

        const doctorExistsInPretest = await dashboardDb.collection('pretest').findOne(
            { doctorId: doctorUsername },
            { projection: { _id: 1 } } // Just need to know if they exist
        );

        // Determine if the doctor has data in either relevant collection
        const doctorHasData = !!(doctorExistsInTest || doctorExistsInPretest);

        // Use details from 'test' collection if found, otherwise default to empty
        // (This part remains similar, but now we also have the doctorHasData flag)
        const siteName = doctorExistsInTest?.siteName || '';
        const departmentName = doctorExistsInTest?.departmentName || '';
        const hospitalId = doctorExistsInTest?.hospitalId || '';
        const hospitalName = doctorExistsInTest?.hospitalName || '';
        // --- END CHANGES ---

        // Pass all details AND the new flag to the EJS template
        res.render('doc_dashboard', {
            doctor,
            basePath,
            siteName,
            departmentName,
            hospitalId,
            hospitalName,
            doctorHasData // Pass the flag to the template
        });
    } catch (error) {
        console.error('Error in /dashboard route:', error);
        res.status(500).send('Internal Server Error');
    }
});



router.get('/logout', (req, res) => {
    if (req.session.user) {
        const logoutTime = Date.now();
        const loginTime = req.session.loginTime || logoutTime; // Fallback to logout time if loginTime is missing
        const duration = ((logoutTime - loginTime) / 1000).toFixed(2); // Duration in seconds

        const logData = `Doctor ${req.session.user.username} from ${req.session.user.hospital_code} logged out at ${new Date(logoutTime).toLocaleString()} after ${duration} seconds of activity.`;
        writeLog(logData, 'access.log');
        

        req.session.destroy(); // Destroy the session
    }

    res.redirect(basePath);
});





router.post('/login', async (req, res) => {
    const { username, password } = req.body; // The password from the login form input

    try {
        const doctor = await Doctor.findOne({ username });

        if (!doctor) {
            req.flash('error_msg', 'Invalid username or password');
            return res.redirect(basePath);
        }

        if (doctor.isLocked) {
            req.flash('error_msg', 'Your account is locked due to multiple failed login attempts. Please, contact admin.');
            return res.redirect(basePath);
        }

        // Decrypt the stored password using the decrypt function
        const decryptedPassword = decrypt(doctor.password);

        // Compare the decrypted password with the password provided in the login form
        if (decryptedPassword === password) {
            // Check if this is the first login or if the password was changed by admin
            if (doctor.loginCounter === 0 || doctor.passwordChangedByAdmin) {
                req.session.user = doctor; // Save user info in session
                return res.render('reset-password', {
                    lng: res.locals.lng,
                    dir: res.locals.dir,
                }); // Render a page with a form to reset the password
            }

            // Successful login
            doctor.failedLogins = 0; // Reset failed logins
            doctor.loginCounter += 1; // Increment login counter
            doctor.lastLogin = new Date(); // Update last login timestamp
            await doctor.save();

            const surveys = await Survey.findOne({ specialty: doctor.speciality });
            if (surveys) {
                const surveyNames = surveys.custom; // Use `custom` instead of `surveyName`
                
                // Add site_code check
                const patients = await Patient.find({
                    hospital_code: doctor.hospital_code,
                    site_code: doctor.site_code, // Ensure patient site_code matches doctor site_code
                    'specialities.name': doctor.speciality
                });

                const patientsWithDateStatus = patients.map(patient => {
                    const specialityTimestamp = patient.specialities.find(spec => spec.name === doctor.speciality)?.timestamp;
                    return {
                        ...patient.toObject(),
                        specialityTimestamp: specialityTimestamp ? new Date(specialityTimestamp).toISOString() : null,
                        specialityMatches: doctor.speciality === patient.speciality
                    };
                });

                req.session.user = doctor; // Save user info in session
                req.session.loginTime = Date.now(); // Log the login time

                // Logging the login event
                const logData = `Doctor ${username} from ${doctor.hospital_code} logged in at ${new Date(req.session.loginTime).toLocaleString()}`;
                writeLog(logData, 'access.log');

                const isCurrentDate = (timestamp) => {
                    const date = new Date(timestamp);
                    const today = new Date();
                    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
                };

                const highlightRow = (patient) => {
                    return patient.specialityTimestamp && isCurrentDate(patient.specialityTimestamp) ? 'highlight-green' : '';
                };

                const formatDate = (timestamp) => {
                    const date = new Date(timestamp);
                    const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
                    return date.toLocaleString(undefined, options);
                };

                res.render('home', {
                    lng: res.locals.lng,
                    dir: res.locals.dir,
                    doctor, surveys, patients: patientsWithDateStatus, isCurrentDate, highlightRow, formatDate });
            } else {
                res.send('No surveys found for this speciality');
            }
        } else {
            // Failed login
            doctor.failedLogins += 1;

            if (doctor.failedLogins >= 3) {
                doctor.isLocked = true;
                req.flash('error_msg', 'Your account is locked due to multiple failed login attempts. Please, contact admin.');
            } else {
                req.flash('error_msg', `Invalid password. ${3 - doctor.failedLogins} attempt(s) left.`);
            }

            await doctor.save();
            res.redirect(basePath);
        }
    } catch (error) {
        console.error(error);
        const logError = `Error during login for username ${username}: ${error.message}`;
        writeLog(logError, 'error.log');
        res.status(500).send('Server Error');
    }
});



const clearDirectory = (directory) => {
    fs.readdir(directory, (err, files) => {
        if (err) throw err;
        for (const file of files) {
            fs.unlink(path.join(directory, file), err => {
                if (err) throw err;
            });
        }
    });
};




// Function to execute Python script for graph generation
const generateGraphs = (mr_no, survey_type) => {

    return new Promise((resolve, reject) => {
        // Bypass the execution of script-d3.py
        // console.log(`Skipping graph generation for Mr_no: ${mr_no}, Survey: ${survey_type}`);
        resolve(); // Simply resolve without executing the script
    });
};




// Ensure this middleware is defined for session authentication
function checkAuth(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect(basePath);
    }
}

router.get('/reset-password', checkAuth, (req, res) => {
    res.render('reset-password', {
        lng: res.locals.lng,
        dir: res.locals.dir,
    });
});



router.post('/reset-password', checkAuth, async (req, res) => {
    const { newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
        req.flash('error_msg', 'Passwords do not match');
        return res.redirect(basePath+'/reset-password');
    }

    try {
        const doctorId = req.session.user._id;

        // Retrieve the full Mongoose document by its _id
        const doctor = await Doctor.findById(doctorId);

        if (!doctor) {
            req.flash('error_msg', 'Doctor not found. Please log in again.');
            return res.redirect(basePath);
        }

        // Update the doctor's password
        // doctor.password = newPassword;
        // Encrypt the new password using AES-256
        doctor.password = encrypt(newPassword);
        doctor.passwordChangedByAdmin = false; // Reset the flag after password change
        doctor.loginCounter += 1; // Increment the loginCounter after password reset
        await doctor.save();

        req.flash('success_msg', 'Password updated successfully.');
        // Redirect to the home page after the password is updated
        res.redirect(basePath+'/home');
    } catch (error) {
        console.error('Error resetting password:', error);
        req.flash('error_msg', 'An error occurred while updating the password. Please try again.');
        res.redirect(basePath+'/reset-password');
    }
});



router.get('/home', checkAuth, async (req, res) => {
    try {
        const doctor = req.session.user; // Retrieve doctor from session
        const surveys = await Survey.findOne({ specialty: doctor.speciality });
        if (surveys) {
            // Add site_code check
            const patients = await Patient.find({
                hospital_code: doctor.hospital_code,
                site_code: doctor.site_code, // Ensure patient site_code matches doctor site_code
                'specialities.name': doctor.speciality
            });
            
            const patientsWithDateStatus = patients.map(patient => {
                const specialityTimestamp = patient.specialities.find(spec => spec.name === doctor.speciality)?.timestamp;
                return {
                    ...patient.toObject(),
                    specialityTimestamp: specialityTimestamp ? new Date(specialityTimestamp).toISOString() : null,
                    specialityMatches: doctor.speciality === patient.speciality
                };
            });

            // Function to check if the timestamp is the current date
            const isCurrentDate = (timestamp) => {
                const date = new Date(timestamp);
                const today = new Date();
                return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
            };

            // Function to highlight rows based on the speciality timestamp
            const highlightRow = (patient) => {
                return patient.specialityTimestamp && isCurrentDate(patient.specialityTimestamp) ? 'highlight-green' : '';
            };

            // Function to format the date
            const formatDate = (timestamp) => {
                const date = new Date(timestamp);
                const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
                return date.toLocaleString(undefined, options);
            };

            res.render('home', {
                lng: res.locals.lng,
                dir: res.locals.dir,
                doctor,
                surveys,
                patients: patientsWithDateStatus,
                isCurrentDate,
                highlightRow,
                formatDate
            });
        } else {
            res.send('No surveys found for this speciality');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});


// router.get('/home', checkAuth, async (req, res) => {
//     try {
//         const doctor = req.session.user; // Retrieve doctor from session

//         // === START: Check for dashboard data ===
//         let doctorHasData = false; // Default to false
//         // Ensure doctor and username exist before querying
//         if (doctor && doctor.username) {
//             try {
//                  const doctorUsername = doctor.username;
//                  // Check both collections in parallel for efficiency
//                  const [doctorExistsInTest, doctorExistsInPretest] = await Promise.all([
//                     dashboardDb.collection('test').findOne(
//                         { doctorId: doctorUsername },
//                         { projection: { _id: 1 } } // Only need to know if it exists
//                     ),
//                     dashboardDb.collection('pretest').findOne(
//                         { doctorId: doctorUsername },
//                         { projection: { _id: 1 } } // Only need to know if it exists
//                     )
//                  ]);
//                 // Set to true if found in either collection
//                  doctorHasData = !!(doctorExistsInTest || doctorExistsInPretest);
//             } catch (dbError) {
//                 // Log the specific error during dashboard DB check
//                 console.error(`Error checking dashboard data for doctor ${doctor.username}:`, dbError);
//                 // Keep doctorHasData as false if there's an error accessing dashboard DB
//             }
//         } else {
//              console.warn('Doctor session or username not found while checking dashboard access.');
//         }
//         // === END: Check for dashboard data ===

//         // Proceed with fetching surveys and patient data
//         const surveys = await Survey.findOne({ specialty: doctor.speciality });

//         if (surveys) {
//             // Add site_code check
//             const patients = await Patient.find({
//                 hospital_code: doctor.hospital_code,
//                 site_code: doctor.site_code, // Ensure patient site_code matches doctor site_code
//                 'specialities.name': doctor.speciality
//             });

//             const patientsWithDateStatus = patients.map(patient => {
//                 const specialityTimestamp = patient.specialities.find(spec => spec.name === doctor.speciality)?.timestamp;
//                 return {
//                     ...patient.toObject(),
//                     specialityTimestamp: specialityTimestamp ? new Date(specialityTimestamp).toISOString() : null,
//                     specialityMatches: doctor.speciality === patient.speciality,
//                     // Make sure surveyStatus is included if needed by the template
//                     surveyStatus: patient.surveyStatus || 'Not Started' // Add a default if needed
//                 };
//             });

//             // Function to check if the timestamp is the current date
//             const isCurrentDate = (timestamp) => {
//                 if (!timestamp) return false;
//                 try {
//                     const date = new Date(timestamp);
//                     const today = new Date();
//                     return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
//                 } catch (e) {
//                     console.error("Error parsing date for isCurrentDate:", timestamp, e);
//                     return false;
//                 }
//             };

//             // Function to highlight rows based on the speciality timestamp
//             const highlightRow = (patient) => {
//                 return patient.specialityTimestamp && isCurrentDate(patient.specialityTimestamp) ? 'highlight-green' : '';
//             };

//             // Function to format the date
//             const formatDate = (timestamp) => {
//                  if (!timestamp) return 'N/A'; // Handle null or undefined timestamps
//                  try {
//                     const date = new Date(timestamp);
//                     // Check if the date is valid before formatting
//                     if (isNaN(date.getTime())) {
//                          console.warn("Invalid date encountered in formatDate:", timestamp);
//                          return 'Invalid Date';
//                     }
//                     const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }; // Added hour12 for AM/PM
//                     return date.toLocaleString(res.locals.lng === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US', options); // Locale based formatting
//                  } catch(e) {
//                      console.error("Error formatting date:", timestamp, e);
//                      return 'Error Formatting Date';
//                  }
//             };

//             // Render 'home' with all necessary data, including doctorHasData
//             res.render('home', {
//                 lng: res.locals.lng,
//                 dir: res.locals.dir,
//                 doctor,
//                 surveys,
//                 patients: patientsWithDateStatus,
//                 isCurrentDate,
//                 highlightRow,
//                 formatDate,
//                 doctorHasData: doctorHasData // Pass the boolean here
//             });
//         } else {
//             // Handle case where no surveys found, but still render the page
//              console.warn(`No surveys found for specialty: ${doctor.speciality}`);
//              // Render 'home' with empty patient list but include other necessary data
//              res.render('home', {
//                 lng: res.locals.lng,
//                 dir: res.locals.dir,
//                 doctor,
//                 surveys: { custom: [] }, // Provide default empty surveys object
//                 patients: [], // Empty patient list
//                  // Provide default functions or simple values
//                  isCurrentDate: () => false,
//                  highlightRow: () => '',
//                  formatDate: () => 'N/A',
//                 doctorHasData: doctorHasData // Pass the boolean here
//             });
//             // Alternative: res.send('No surveys found for this speciality');
//         }
//     } catch (error) {
//         // Catch potential errors during survey/patient fetching or processing
//         console.error('Error in /home route:', error);
//         // Attempt to render the home page even with errors, showing minimal info
//          res.render('home', {
//             lng: res.locals.lng,
//             dir: res.locals.dir,
//             doctor: req.session.user || {}, // Use session user or empty object
//             surveys: { custom: [] }, // Default empty surveys
//             patients: [], // Empty patients
//             isCurrentDate: () => false, // Default functions
//             highlightRow: () => '',
//             formatDate: () => 'N/A',
//             doctorHasData: false, // Assume no dashboard access if main data fetch fails
//             error_msg: 'Error loading patient list. Please try again later.' // Pass an error message
//          });
//         // Alternative: res.status(500).send('Server Error');
//     }
// });






router.get('/search', checkAuth, async (req, res) => {
    const { mrNo: hashMrNo } = req.query; // Extract only needed query parameters
    try {
        const loggedInDoctor = req.session.user; // Retrieve the logged-in doctor's details from the session

        // Find the patient using hashMrNo and get the corresponding Mr_no
        const patientWithHash = await Patient.findOne({ hashedMrNo: hashMrNo });
        if (!patientWithHash) {
            return res.status(404).send('Patient not found');
        }

        const mrNo = patientWithHash.Mr_no;

        // Retrieve the patient details using Mr_no
        const patient = await Patient.findOne({ Mr_no: mrNo });

        if (!patient) {
            return res.status(404).send('Patient not found');
        }

        // Check if the patient's hospital_code matches the logged-in doctor's hospital_code
        if (patient.hospital_code !== loggedInDoctor.hospital_code) {
            return res.status(403).send('You cannot access this patient\'s details');
        }

        const allPatients = await Patient.find();

        const surveyData = await db3.collection('surveys').findOne({ specialty: patient.speciality });
        const surveyNames = surveyData ? surveyData.custom : [];

        const folderPath = path.join(__dirname, 'new_folder');
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
            console.log('Folder "new_folder" created');
        } else {
            console.log('Folder "new_folder" already exists');
        }

        await clearDirectory(folderPath);

        // Execute API_script.py
        const apiScriptCommand = `python python_scripts/API_script.py ${mrNo}`;
        exec(apiScriptCommand, (apiError, apiStdout, apiStderr) => {
            if (apiError) {
                console.error(`Error executing API_script.py: ${apiError.message}`);
                // Decide whether to proceed or not. Here, we'll proceed.
            }
            if (apiStderr) {
                console.error(`stderr from API_script.py: ${apiStderr}`);
            }
            console.log(`API_script.py output: ${apiStdout}`);

            // Generate graphs for each survey type
            surveyNames.forEach(surveyType => {
                generateGraphs(mrNo, surveyType);
            });

            // Sort doctor notes by date in descending order
            patient.doctorNotes.sort((a, b) => new Date(b.date) - new Date(a.date));

            // Define paths for CSV files
            const csvFileName = `patient_health_scores_${patient.Mr_no}.csv`;
            const csvPath = path.join(__dirname, 'data', csvFileName);
            const csvExists = fs.existsSync(csvPath);

            if (!csvExists) {
                console.warn(`CSV file not found at ${csvPath}`);
                // Optionally, set a flag or handle accordingly
            }

            const csvApiSurveysPath = `/data/API_SURVEYS_${patient.Mr_no}.csv`;

            // Determine if AI message needs regeneration
            const shouldRegenerateAIMessage = patient.specialities.some(spec => 
                new Date(spec.timestamp) > new Date(patient.aiMessageDoctorTimestamp)
            );

            if (shouldRegenerateAIMessage || !patient.aiMessageDoctor) {
                // **Do not** run patientprompt.py here
                // Instead, indicate that AI messages need to be generated after survey completion
                // You might set a flag or handle it in the frontend
                // For example, set patient.aiMessageDoctorEnglish and Arabic to empty or a placeholder
                // Alternatively, manage this logic in the frontend to trigger AI message generation

                // Log the access
                const logData = `Doctor ${loggedInDoctor.username} accessed surveys: ${surveyNames.join(', ')}`;
                writeLog(logData, 'access.log');

                const patientHealthScoresCsvPath = `/patient_health_scores_csv?mr_no=${mrNo}`;
                const apiSurveysCsvPathFinal = `/api_surveys_csv?mr_no=${mrNo}`;

                res.render('patient-details', {
                    lng: res.locals.lng,
                    dir: res.locals.dir,
                    patient,
                    allPatients,
                    surveyNames: patient.custom || [],
                    codes: patient.Codes,
                    interventions: patient.Events,
                    doctorNotes: patient.doctorNotes,
                    doctor: {
                        username: loggedInDoctor.username,
                        speciality: loggedInDoctor.speciality,
                        hospitalName: loggedInDoctor.hospitalName,
                        site_code: loggedInDoctor.site_code,
                        firstName: loggedInDoctor.firstName,
                        lastName: loggedInDoctor.lastName
                    },
                    csvPath: patientHealthScoresCsvPath,
                    csvApiSurveysPath: apiSurveysCsvPathFinal,
                    aiMessageEnglish: patient.aiMessageDoctorEnglish || '', // Ensure defined
                    aiMessageArabic: patient.aiMessageDoctorArabic || '',   // Ensure defined
                });
            } else {
                // If AI message doesn't need regeneration, proceed to render the response

                // Log the access
                const logData = `Doctor ${loggedInDoctor.username} accessed surveys: ${surveyNames.join(', ')}`;
                writeLog(logData, 'access.log');

                const patientHealthScoresCsvPath = `/patient_health_scores_csv?mr_no=${mrNo}`;
                const apiSurveysCsvPathFinal = `/api_surveys_csv?mr_no=${mrNo}`;

                // Ensure AI messages are defined even if not regenerated
                const aiMessageEnglish = patient.aiMessageDoctorEnglish || '';
                const aiMessageArabic = patient.aiMessageDoctorArabic || '';

                res.render('patient-details', {
                    lng: res.locals.lng,
                    dir: res.locals.dir,
                    patient,
                    allPatients,
                    surveyNames: patient.custom || [],
                    codes: patient.Codes,
                    interventions: patient.Events,
                    doctorNotes: patient.doctorNotes,
                    doctor: {
                        username: loggedInDoctor.username,
                        speciality: loggedInDoctor.speciality,
                        hospitalName: loggedInDoctor.hospitalName,
                        site_code: loggedInDoctor.site_code,
                        firstName: loggedInDoctor.firstName,
                        lastName: loggedInDoctor.lastName
                    },
                    csvPath: patientHealthScoresCsvPath,
                    csvApiSurveysPath: apiSurveysCsvPathFinal,
                    aiMessageEnglish: aiMessageEnglish,
                    aiMessageArabic: aiMessageArabic,
                });
            }
        });

    } catch (error) {
        console.error('Error in /search route:', error);
        res.status(500).send('Server Error');
    }
});



router.post('/doctor-llama-script', async (req, res) => {
    const { mr_no } = req.body;

    try {
        // 1) Fetch the CSV text from your patient_health_scores endpoint
        const patientHealthScoresCSVUrl = `http://localhost:3003/doctorlogin/patient_health_scores_csv?mr_no=${mr_no}`;
        let patientHealthScoresData = '';
        try {
            const response = await axios.get(patientHealthScoresCSVUrl);
            patientHealthScoresData = response.data;
            console.log(`\n[DEBUG] patient_health_scores for Mr_no=${mr_no}:\n`);
            console.log(patientHealthScoresData);
        } catch (csvError) {
            console.error('[ERROR] Could not fetch patient_health_scores_csv:', csvError.message);
        }

        // 2) Read SeverityLevels.csv from your /public folder
        let severityLevelsData = '';
        const severityFile = path.join(__dirname, 'public', 'SeverityLevels.csv');
        try {
            severityLevelsData = fs.readFileSync(severityFile, 'utf8');
            console.log('\n[DEBUG] SeverityLevels.csv:\n');
            console.log(severityLevelsData);
        } catch (err) {
            console.error('Error reading SeverityLevels.csv:', err);
        }

        // Ensure the "new_folder" directory exists
        folderPath = path.join(__dirname, 'new_folder');
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
            console.log('Folder "new_folder" created');
        } else {
            console.log('Folder "new_folder" already exists');
        }

        // -----------------------
        // Helper function to remove 'mr_no' column from CSV
        // -----------------------
        function trimMrNoFromCSV(csvData) {
            const lines = csvData.split('\n');
            const headers = lines[0].split(',');
            const mrNoIndex = headers.indexOf('mr_no');

            if (mrNoIndex === -1) {
                return csvData; // Return original data if 'mr_no' column not found
            }

            const trimmedHeaders = headers.filter((_, index) => index !== mrNoIndex);
            const trimmedLines = lines.map(line => {
                const columns = line.split(',');
                return columns.filter((_, index) => index !== mrNoIndex).join(',');
            });

            return [trimmedHeaders.join(','), ...trimmedLines.slice(1)].join('\n');
        }

        // -----------------------
        // Helper function to strip leading/trailing quotes
        // -----------------------
        function stripQuotes(str) {
            return str.replace(/^"+|"+$/g, '');
        }

        // Remove 'mr_no' column from both CSVs
        patientHealthScoresData = trimMrNoFromCSV(patientHealthScoresData);
        severityLevelsData = trimMrNoFromCSV(severityLevelsData);

        // ---------------------------
        // Filter severityLevelsData to match only the trace_names from patientHealthScoresData
        // ---------------------------
        // 1) Gather unique trace_name from patientHealthScoresData
        const phsLines = patientHealthScoresData.trim().split('\n');
        phsLines.shift(); // Remove CSV header
        const traceNamesSet = new Set();

        for (const line of phsLines) {
            const cols = line.split(',');
            // Ensure enough columns: [date, months_since_baseline, score, trace_name, ...]
            if (cols.length > 3) {
                const rawTraceName = cols[3].trim();
                // Strip any quotes from the trace_name column
                const traceName = stripQuotes(rawTraceName);
                traceNamesSet.add(traceName);
            }
        }

        // 2) Filter out rows in severityLevelsData whose "Scale" is not in traceNamesSet
        let severityLines = severityLevelsData.trim().split('\n');
        const severityHeader = severityLines.shift(); // Save header line

        // Keep only those lines that match the existing trace_names
        severityLines = severityLines.filter((row) => {
            const cols = row.split(',');
            if (cols.length < 1) return false;
            // The first column is "Scale"—strip quotes and compare
            const scaleName = stripQuotes(cols[0].trim());
            return traceNamesSet.has(scaleName);
        });

        // 3) Rebuild severityLevelsData with filtered rows
        severityLevelsData = [severityHeader, ...severityLines].join('\n');

        // For debugging, log the final CSVs that will be passed to the script
        console.log('\n[DEBUG] Filtered patient_health_scores:\n', patientHealthScoresData);
        console.log('\n[DEBUG] Filtered severityLevels:\n', severityLevelsData);

        // ---------------------------
        // Write the filtered CSV strings to temporary files
        // ---------------------------
        const newFolderDirectory = path.join(__dirname, 'new_folder');
        const patientTempFile = path.join(newFolderDirectory, `temp_patient_scores_${mr_no}.csv`);
        const severityTempFile = path.join(newFolderDirectory, `temp_severity_levels_${mr_no}.csv`);

        fs.writeFileSync(patientTempFile, patientHealthScoresData, 'utf8');
        fs.writeFileSync(severityTempFile, severityLevelsData, 'utf8');

        // ---------------------------
        // Execute patientprompt.py with the two temp files
        // ---------------------------
        const patientPromptCommand = `python python_scripts/patientprompt.py "${patientTempFile}" "${severityTempFile}"`;
        exec(patientPromptCommand, async (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing patientprompt.py: ${error.message}`);
                return res.status(500).send('Error generating AI message');
            }
            if (stderr) {
                console.error(`stderr from patientprompt.py: ${stderr}`);
            }

            // ---------------------------
            // Parse both English and Arabic from stdout
            // ---------------------------
            const lines = stdout.split('\n');
            let englishSummary = '';
            let arabicSummary = '';
            let isEnglishSection = false;
            let isArabicSection = false;

            for (const line of lines) {
                if (line.includes('===ENGLISH_SUMMARY_START===')) {
                    isEnglishSection = true;
                    isArabicSection = false;
                    continue;
                }
                if (line.includes('===ENGLISH_SUMMARY_END===')) {
                    isEnglishSection = false;
                    continue;
                }
                if (line.includes('===ARABIC_SUMMARY_START===')) {
                    isArabicSection = true;
                    isEnglishSection = false;
                    continue;
                }
                if (line.includes('===ARABIC_SUMMARY_END===')) {
                    isArabicSection = false;
                    continue;
                }

                if (isEnglishSection) {
                    englishSummary += line + '\n';
                }
                if (isArabicSection) {
                    arabicSummary += line + '\n';
                }
            }

            // Fallback if markers not found
            if (!englishSummary.trim()) {
                englishSummary = '';
            }
            if (!arabicSummary.trim()) {
                arabicSummary = '';
            }

            // ---------------------------
            // Update the patient in MongoDB
            // ---------------------------
            const patientDoc = await Patient.findOne({ Mr_no: mr_no });
            if (!patientDoc) {
                return res.status(404).send(`Patient with Mr_no=${mr_no} not found.`);
            }

            patientDoc.aiMessageDoctorEnglish = englishSummary.trim();
            patientDoc.aiMessageDoctorArabic = arabicSummary.trim();
            patientDoc.aiMessageDoctorTimestamp = formatTimestamp(new Date());
            await patientDoc.save();

            return res.status(200).send(`Doctor-facing AI message updated for Mr_no=${mr_no}`);
        });
    } catch (err) {
        console.error('Error in /doctor-llama-script route:', err);
        return res.status(500).send('Internal Server Error');
    }
});


router.post('/addNote', checkAuth, async (req, res) => {
    const { Mr_no, event, date, treatment_plan } = req.body;
    const loggedInDoctor = req.session.user; // Get the logged-in doctor from the session

    try {
        // Update the patient document by adding the event to the Events array
        await Patient.updateOne(
            { Mr_no },
            { $push: { Events: { event, date, treatment_plan } } }  // Ensure that the event and date are properly stored
        );

        const logData = `Doctor ${loggedInDoctor.username} from ${loggedInDoctor.hospital_code} added an event for patient Mr_no: ${Mr_no} at ${new Date().toLocaleString()} - Event: ${event}`;
        writeLog(logData, 'interaction.log');
        
        // Run the script synchronously by sending an HTTP POST request
        const response = await axios.post(
            `${BASE_URL}:3055/patientlogin/run-scripts`,
            { mr_no: Mr_no }, // Pass the Mr_no in the request body
            { headers: { 'Content-Type': 'application/json' } }
        );

        // Check if the script execution was successful
        if (response.status === 200) {
            console.log(`Script executed successfully for Mr_no: ${Mr_no}`);
            
        } else {
            console.error(`Error executing script for Mr_no: ${Mr_no}:`, response.data);
        }

        // Respond with the updated event data
        res.status(200).json({ event, date, treatment_plan });
    } catch (error) {
        console.error('Error adding event:', error);
        // Log the error
        const logError = `Error adding event for patient Mr_no: ${Mr_no} by Doctor ${loggedInDoctor.username} - Error: ${error.message}`;
        writeLog(logError, 'error.log');
        res.status(500).send('Error adding event');
    }
});





router.post('/addDoctorNote', checkAuth, async (req, res) => {
    const { Mr_no, doctorNote } = req.body;
    const loggedInDoctor = req.session.user; // Get the logged-in doctor from the session

    try {
        // Update the patient document by adding the doctor's note to the doctorNotes array
        await Patient.updateOne(
            { Mr_no },
            { $push: { doctorNotes: { note: doctorNote, date: new Date().toISOString().split('T')[0] } } }
        );

        const logData = `Doctor ${loggedInDoctor.username} from ${loggedInDoctor.hospital_code} added a note for patient Mr_no: ${Mr_no} at ${new Date().toLocaleString()} - Note: ${doctorNote}`;
        writeLog(logData, 'interaction.log');
        

        res.redirect(`<%= basePath %>/search?mrNo=${Mr_no}`);
    } catch (error) {
        console.error('Error adding doctor\'s note:', error);
        res.status(500).send('Error adding doctor\'s note');
    }
});

router.post('/deleteNote', async (req, res) => {
    // console.log('Incoming POST request to /deleteNote');
    // console.log('Request body:', req.body);

    const { noteId } = req.body;
    const loggedInDoctor = req.session.user; // Assuming you have session handling
    const objectId = new ObjectId(noteId);

    // Check if noteId is provided
    if (!noteId) {
        console.error('Error: Note ID is missing');
        return res.status(400).json({ success: false, message: 'Note ID is missing' });
    }

    try {
        // Remove the note from the doctorNotes array
        const result = await Patient.updateOne(
            { "doctorNotes._id": objectId }, // Match the document containing the note
            { $pull: { doctorNotes: { _id: objectId } } } // Pull the note from the array
        );

        // Check if any documents were modified
        if (result.modifiedCount === 0) {
            console.error('Error: Note not found or not deleted');
            return res.status(404).json({ success: false, message: 'Note not found' });
        }

        // console.log(`Note with ID ${noteId} deleted successfully`);
        res.json({ success: true, message: 'Note deleted successfully' });
    } catch (error) {
        console.error('Error deleting the note:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

router.post('/updateNote', async (req, res) => {
    console.log('Request body:', req.body); // Debug incoming request

    const { noteId, note } = req.body;
    if (!noteId || !note) {
        console.error('Invalid request data:', req.body);
        return res.status(400).json({ success: false, message: 'Invalid request data' });
    }

    try {
        const result = await Patient.updateOne(
            { "doctorNotes._id": noteId },
            { $set: { "doctorNotes.$.note": note } }
        );

        if (result.modifiedCount === 0) {
            console.error('Note not found');
            return res.status(404).json({ success: false, message: 'Note not found' });
        }

        res.json({ success: true, message: 'Note updated successfully' });
    } catch (error) {
        console.error('Error updating note:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});



router.post('/addCode', checkAuth, async (req, res) => {
    const { Mr_no, code, code_date } = req.body;
    const loggedInDoctor = req.session.user;
  
    try {
      // 1) Look up the code in your local codesData array
      const codeDetail = codesData.find((item) => item.code === code);
  
      if (!codeDetail) {
        return res.status(404).send('Code not found in JSON file');
      }
  
      // 2) Update the patient's record with the code, its description, and the chosen date
      await Patient.updateOne(
        { Mr_no },
        { $push: { Codes: { code, description: codeDetail.description, date: code_date } } }
      );
  
      // 3) Log the update (optional)
      const logData = `Doctor ${loggedInDoctor.username} from ${loggedInDoctor.hospital_code} added ICD code ${code} with description "${codeDetail.description}" for patient Mr_no: ${Mr_no} on ${code_date}`;
      writeLog(logData, 'interaction.log');
  
      // 4) Return updated code in JSON response
      res.status(200).json({
        code,
        description: codeDetail.description,
        date: code_date
      });
  
    } catch (error) {
      console.error('Error adding code:', error);
      const logError = `Error adding ICD code for Mr_no: ${Mr_no} by Doctor ${loggedInDoctor.username} - ${error.message}`;
      writeLog(logError, 'error.log');
      res.status(500).send('Error adding code');
    }
  });
  




router.get('/chart', async (req, res) => {
    const { mr_no } = req.query;
    const csvPath = `patient_health_scores_${mr_no}.csv`;  // Just the file name
    const csvFullPath = path.join(__dirname, 'data', csvPath); // Full path for checking existence
    // console.log(`CSV Path: ${csvFullPath}`);  // Log the full CSV path for debugging
    
    if (fs.existsSync(csvFullPath)) {
        res.render('chart1', { csvPath });  // Pass only the file name to the template
    } else {
        res.status(404).send('CSV file not found');
    }
});


const url = 'mongodb+srv://admin:admin@mydevopsdb.5hmumeq.mongodb.net//'; // Update with your MongoDB connection string
const dbName = 'Data_Entry_Incoming'; // Database name
const collectionName = 'patient_data'; // Collection name
// Route to display survey details





router.get('/survey-details/:hashedMrNo', async (req, res) => {
    const hashedMrNo = req.params.hashedMrNo;

    try {
        const client = new MongoClient(url);
        await client.connect();
        console.log('Connected successfully to server');
        const db = client.db(dbName);
        const collection = db.collection(collectionName);

        // Fetch the patient data based on Mr_no
        const patient = await collection.findOne({ hashedMrNo: hashedMrNo });

        if (!patient) {
            console.log('Patient not found');
            res.status(404).send('Patient not found');
            return;
        }

        // Load survey labels JSON
        const surveyLabelsPath = path.join(__dirname, 'public', 'survey_labels.json');
        const surveyLabels = JSON.parse(fs.readFileSync(surveyLabelsPath, 'utf8'));

        const surveyData = [];
        if (patient.FORM_ID) {
            Object.keys(patient.FORM_ID).forEach(formId => {
                const form = patient.FORM_ID[formId];

                form.assessments.forEach((assessment, index) => {
                    const assessmentData = {
                        name: assessment.scoreDetails.Name,
                        tScore: assessment.scoreDetails['T-Score'],
                        questions: [],
                    };

                    assessment.scoreDetails.Items.forEach(item => {
                        const middleElement = item.Elements[Math.floor(item.Elements.length / 2)];
                        const responseValue = item.Response;

                        let responseLabel = 'Unknown label';
                        const mapElement = item.Elements.find(el => el.Map);

                        if (mapElement && mapElement.Map) {
                            const matchedMap = mapElement.Map.find(map => map.Value === responseValue);
                            if (matchedMap) {
                                responseLabel = matchedMap.Description;
                            }
                        }

                        assessmentData.questions.push({
                            question: middleElement.Description,
                            response: `${responseLabel} (${responseValue})`,
                        });
                    });

                    surveyData.push(assessmentData);
                });
            });
        }

        // Function to format the timestamp
        const formatDate = (timestamp) => {
            if (!timestamp) return 'Invalid Date';

            const date = new Date(timestamp);
            const day = date.getDate();
            const month = date.toLocaleString('default', { month: 'short' });
            const year = date.getFullYear();
            const daySuffix = day % 10 === 1 && day !== 11 ? 'st' : day % 10 === 2 && day !== 12 ? 'nd' : day % 10 === 3 && day !== 13 ? 'rd' : 'th';
            return `${day}${daySuffix} ${month} ${year}`;
        };

        // Updated function for mapping EPDS responses
        const mapEPDSResponseToLabels = (surveyKey) => {
            if (!patient[surveyKey]) return null;

            return Object.keys(patient[surveyKey]).map((key, index) => {
                const entry = patient[surveyKey][key];
                const timestamp = entry['timestamp'];
                const formattedDate = timestamp ? formatDate(timestamp) : 'Date not available';

                return {
                    question: `Assessment ${index + 1}<br>(${formattedDate})`,
                    responses: Object.keys(entry).reduce((acc, questionKey) => {
                        if (questionKey !== 'Mr_no' && questionKey !== 'selectedLang' && questionKey !== 'timestamp') {
                            const responseValue = entry[questionKey];
                            if (questionKey === 'lang') {
                                acc[questionKey] = responseValue; 
                            } else {
                                const fullScore = 3;  

                                // Specific mapping for EPDS questions using questionKey
                                const questionLabel = surveyLabels['EPDS'] &&
                                                    surveyLabels['EPDS'][responseValue] &&
                                                    surveyLabels['EPDS'][responseValue][questionKey];
                                const labeledResponse = questionLabel ? `${questionLabel} (${responseValue}/${fullScore})` : `${responseValue}/${fullScore}`;
                                

                                // const labeledResponses = questionLabel ? `${questionLabel} (${responseValue})` : `${responseValue}/${fullScore}`;
                                // console.log(labeledResponses);
                                acc[questionKey] = labeledResponse;
                        }

                    }//console.log("acc",acc);
                        return acc;
                    }, {})
                };
            });
        };

        
        const mapResponseToLabels = (survey, surveyKey) => {
            if (!patient[surveyKey]) return null;
        
            return Object.keys(patient[surveyKey]).map((key, index) => {
                const entry = patient[surveyKey][key];
                const timestamp = entry['timestamp'];
                const formattedDate = timestamp ? formatDate(timestamp) : 'Date not available';
        
                return {
                    question: `Assessment ${index + 1}<br>(${formattedDate})`,
                    responses: Object.keys(entry).reduce((acc, questionKey) => {
                        if (questionKey !== 'Mr_no' && questionKey !== 'selectedLang' && questionKey !== 'timestamp') {
                            const responseValue = entry[questionKey];
                            if (questionKey === 'lang') {
                                acc[questionKey] = responseValue; 
                            } else {
                                const fullScore = 4;  // Set full score to 4 for PAID & PAID-5
        
                                // Default handling for PAID & PAID-5 surveys
                                const labeledResponse = surveyLabels[survey] && surveyLabels[survey][responseValue]
                                    ? `${surveyLabels[survey][responseValue]} (${responseValue}/${fullScore})`
                                    : `${responseValue}/${fullScore}`;
                                
                                acc[questionKey] = labeledResponse;
                            }
                        }
                        return acc;
                    }, {})
                };
            });
        };
        
        
        const mapPROMISResponseToLabels = (survey, surveyKey) => {
            if (!patient[surveyKey]) return null;
        
            return Object.keys(patient[surveyKey]).map((key, index) => {
                const entry = patient[surveyKey][key];
                const timestamp = entry['timestamp'];
                const formattedDate = timestamp ? formatDate(timestamp) : 'Date not available';
        
                return {
                    question: `Assessment ${index + 1}<br>(${formattedDate})`,
                    responses: Object.keys(entry).reduce((acc, questionKey) => {
                        if (questionKey !== 'Mr_no' && questionKey !== 'selectedLang' && questionKey !== 'timestamp') {
                            const responseValue = entry[questionKey];
                            if (questionKey === 'lang') {
                                acc[questionKey] = responseValue; 
                            } else {
                                const questionSpecificLabels = surveyLabels[survey][questionKey];
                                let fullScore = 5; 
        
                                // Debugging log to check what question is being processed
                                //console.log("Processing question key:", questionKey);
        
                                if (questionKey.toLowerCase().includes('pain')) {
                                    fullScore = 10; 
                                    console.log(`Pain question detected: ${responseValue}/${fullScore}`);
                                }
        
                                const labeledResponse = questionSpecificLabels && questionSpecificLabels[responseValue]
                                    ? `${questionSpecificLabels[responseValue]} (${responseValue}/${fullScore})`
                                    : `${responseValue}/${fullScore}`;
        
            
                                acc[questionKey] = labeledResponse;
                            }
                        }
                        return acc;
                    }, {})
                };
            });
        };
        
        // Function to map PAIN-6b and PHYSICAL-6b responses to labels
        const mapPainAndPhysicalResponsesToLabels = (surveyKey) => {
            if (!patient[surveyKey]) return null;

            return Object.keys(patient[surveyKey]).map((key, index) => {
                const entry = patient[surveyKey][key];
                const timestamp = entry['timestamp'];
                const formattedDate = timestamp ? formatDate(timestamp) : 'Date not available';

                return {
                    question: `Assessment ${index + 1}<br>(${formattedDate})`,
                    responses: Object.keys(entry).reduce((acc, questionKey) => {
                        if (questionKey !== 'Mr_no' && questionKey !== 'selectedLang' && questionKey !== 'timestamp') {
                            const responseValue = entry[questionKey];

                            // Handle the 'lang' field separately to avoid formatting it with the score
                            if (questionKey === 'lang') {
                                acc[questionKey] = responseValue; // Just assign the value directly
                            } else {
                                // PAIN-6b and PHYSICAL-6b specific mapping using surveyLabels
                                const questionLabel = surveyLabels[surveyKey] &&
                                    surveyLabels[surveyKey][responseValue] &&
                                    surveyLabels[surveyKey][responseValue][questionKey];

                                const fullScore = 5;

                                // Format response to show the raw value and the full score
                                const labeledResponse = questionLabel
                                    ? `${questionLabel} (${responseValue}/${fullScore})`
                                    : `${responseValue}/${fullScore}`;
                                
                                acc[questionKey] = labeledResponse;
                            }
                        }
                        //console.log(acc);
                        return acc;
                    }, {})
                };
            });
        };

        // Updated logic for surveys
        const PAIN6bSurvey = mapPainAndPhysicalResponsesToLabels('Pain-Interference');
        const PHYSICAL6bSurvey = mapPainAndPhysicalResponsesToLabels('Physical-Function');


        // Function to map ICIQ responses with specific labels for questions 3, 4, and 5
        const mapICIQResponseToLabels = (surveyKey) => {
            if (!patient[surveyKey]) return null;

            return Object.keys(patient[surveyKey]).map((key, index) => {
                const entry = patient[surveyKey][key];
                const timestamp = entry['timestamp'];
                const formattedDate = timestamp ? formatDate(timestamp) : 'Date not available';

                return {
                    question: `Assessment ${index + 1}<br>(${formattedDate})`,
                    responses: Object.keys(entry).reduce((acc, questionKey) => {
                        if (questionKey !== 'Mr_no' && questionKey !== 'selectedLang' && questionKey !== 'timestamp') {
                            const responseValue = entry[questionKey];
                            fullScore = 5;
                            if (questionKey === "How often do you leak urine?") {
                                const questionLabel = surveyLabels['ICIQ_UI_SF'] &&
                                                      surveyLabels['ICIQ_UI_SF'][responseValue] &&
                                                      surveyLabels['ICIQ_UI_SF'][responseValue][questionKey];
                                acc[questionKey] = questionLabel ? `${questionLabel} (${responseValue}/${fullScore})` : `(${responseValue}/${fullScore})`;
                            } else if (questionKey === "How much urine do you usually leak?") {
                                if (["0", "2", "4", "6"].includes(responseValue)) {
                                    fullScore = 6;
                                    const questionLabel = surveyLabels['ICIQ_UI_SF'][responseValue][questionKey];
                                    acc[questionKey] = questionLabel ? `${questionLabel} (${responseValue}/${fullScore})` : `(${responseValue}/${fullScore})`;
                                } else {
                                    acc[questionKey] = `(${responseValue}/${fullScore})`;
                                }
                            } else if (questionKey === "Overall, how much does leaking urine interfere with your everyday life?") {
                                if (responseValue === "0") {
                                    acc[questionKey] = "Not at all (0/10)";
                                } else if (responseValue === "10") {
                                    acc[questionKey] = "A great deal (10/10)";
                                } else {
                                    fullScore = 10;
                                    acc[questionKey] = `(${responseValue}/${fullScore})`;
                                }
                            } else {
                                acc[questionKey] = responseValue;
                            }
                        }
                        return acc;
                    }, {})
                };
            });
        };

        // Use the new function for EPDS
        const EPDSSurvey = mapEPDSResponseToLabels('EPDS');

// REPLACEMENT for the mapEQ5DResponseToLabels function in app.js

const mapEQ5DResponseToLabels = (surveyKey) => {
    // Ensure the patient has data for this survey and the surveyLabels are loaded
    if (!patient[surveyKey] || !surveyLabels || !surveyLabels['EQ-5D-3L']) {
        return null;
    }

    const eq5dSurveyLabels = surveyLabels['EQ-5D-3L'];

    return Object.keys(patient[surveyKey]).map((key) => {
        const entry = patient[surveyKey][key];
        if (!entry || typeof entry !== 'object') return null;

        const timestamp = entry['timestamp'];
        const formattedDate = timestamp ? formatDate(timestamp) : 'Date not available';
        const responses = {};

        // Database keys for dimensions
        const dbDimensionKeys = {
            'Mobility': 'MOBILITY',
            'Self-Care': 'SELF-CARE',
            'Usual-Activities': 'USUAL ACTIVITIES',
            'Pain-Discomfort': 'PAIN / DISCOMFORT',
            'Anxiety-Depression': 'ANXIETY / DEPRESSION'
        };

        // Iterate over the EJS dimension keys to build the responses object
        Object.keys(dbDimensionKeys).forEach(ejsDimensionKey => {
            const dbKey = dbDimensionKeys[ejsDimensionKey]; // Get the corresponding DB key

            if (entry[dbKey] !== undefined) {
                const value = entry[dbKey]; // This is the numeric response (e.g., "1", "2", "3")
                
                // Get the label from surveyLabels JSON
                let labelText = 'Unknown';
                if (eq5dSurveyLabels[dbKey] && eq5dSurveyLabels[dbKey][value]) {
                    labelText = eq5dSurveyLabels[dbKey][value];
                }
                
                responses[ejsDimensionKey] = `${labelText} (${value}/3)`;
            }
        });
        
        // Handle Health State (VAS value)
        if (entry['VAS_value'] !== undefined) { // Corrected from 'VAS value' to 'VAS_value'
            responses['Health State'] = `${entry['VAS_value']}/100`;
        }
        
        // Handle Language
        if (entry['lang'] !== undefined) {
            responses['lang'] = entry['lang'];
        }
        
        return {
            question: `Assessment 1<br>(${formattedDate})`, // Assuming only one assessment shown at a time from this source
            responses: responses
        };
    }).filter(item => item !== null); // Clean up any null entries
};

const EQ5DSurvey = mapEQ5DResponseToLabels('EQ-5D');


const mapPHQ2ResponseToLabels = (surveyKeyInDB) => {
    // Ensure the patient has data for this survey and the surveyLabels are loaded
    // The key in surveyLabels.json is "PHQ-2"
    if (!patient[surveyKeyInDB] || !surveyLabels || !surveyLabels['PHQ-2']) {
        return null;
    }

    const phq2LabelsConfig = surveyLabels['PHQ-2'];

    return Object.keys(patient[surveyKeyInDB]).map((assessmentKey) => { // e.g., PHQ-2_0
        const entry = patient[surveyKeyInDB][assessmentKey];
        if (!entry || typeof entry !== 'object') return null;

        const timestamp = entry['timestamp'];
        const formattedDate = timestamp ? formatDate(timestamp) : 'Date not available';
        const responses = {};

        // Question 1: "Little interest or pleasure in doing things"
        const q1Text = "Little interest or pleasure in doing things";
        if (entry[q1Text] !== undefined) {
            const value = entry[q1Text];
            const label = phq2LabelsConfig[q1Text]?.[value] || 'Unknown';
            responses[q1Text] = `${label} (${value}/3)`; // Max score for each item is 3
        }

        // Question 2: "Feeling down, depressed, or hopeless"
        const q2Text = "Feeling down, depressed, or hopeless";
        if (entry[q2Text] !== undefined) {
            const value = entry[q2Text];
            const label = phq2LabelsConfig[q2Text]?.[value] || 'Unknown';
            responses[q2Text] = `${label} (${value}/3)`;
        }
        
        if (entry['lang'] !== undefined) {
            responses['lang'] = entry['lang'];
        }
        
        return {
            question: `Assessment<br>(${formattedDate})`, // Changed "Assessment 1" to just "Assessment"
            responses: responses
        };
    }).filter(item => item !== null);
};


const PHQ2Survey = mapPHQ2ResponseToLabels('PHQ-2');


        res.render('surveyDetails', {
            lng: res.locals.lng,
            dir: res.locals.dir,
            patient,
            surveyData,
            PAIDSurvey: mapResponseToLabels('PAID', 'PAID'),
            PAID5Survey: mapResponseToLabels('PAID-5', 'PAID-5'), // Added PAID-5
            PROMISSurvey: mapPROMISResponseToLabels('PROMIS', 'Global-Health'),
            ICIQSurvey: mapICIQResponseToLabels('ICIQ_UI_SF'),
            WexnerSurvey: mapResponseToLabels('Wexner', 'Wexner'),
            EPDSSurvey,
            PAIN6bSurvey, 
            PHYSICAL6bSurvey,
            EQ5DSurvey,
            PHQ2Survey
        });
        

    } catch (error) {
        console.error('Error fetching survey details:', error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;



function shouldRegenerateAIMessage(patient) {
    const latestTimestamp = patient.aiMessageDoctorTimestamp;

    if (!latestTimestamp) return true; // If no previous timestamp exists, regenerate the message

    // Extract date part (MM/DD/YYYY) from a timestamp
    const extractDate = (timestamp) => timestamp.split(',')[0].trim();

    // Check if surveyStatus is "Completed" and the date in the timestamp of specialities is the same as aiMessageDoctorTimestamp
    const isSameDayCompleted = patient.specialities.some(spec => {
        const specDate = extractDate(spec.timestamp.trim());
        const latestDate = extractDate(latestTimestamp);
        return patient.surveyStatus === 'Completed' && specDate === latestDate;
    });

    // If the above condition is true, use the existing AI message
    if (isSameDayCompleted) {
        return false;
    }

    // Check if the speciality timestamp is newer than the AI message timestamp
    return patient.specialities.some(spec => {
        const specTimestamp = spec.timestamp.trim();
        return specTimestamp > latestTimestamp;
    });
}


// Route for generating or fetching AI message
router.get('/patient-details/:mr_no', checkAuth, async (req, res) => {
    const hashMrNo = req.params.mr_no;
    try {
        // Find the patient using hashMrNo and get the corresponding Mr_no
        const patientWithHash = await Patient.findOne({ hashedMrNo: hashMrNo });
        if (!patientWithHash) {
            return res.status(404).send('Patient not found');
        }

        // Use the actual Mr_no for further processing
        const mrNo = patientWithHash.Mr_no;

        // Find the patient using Mr_no for further processing
        const patient = await Patient.findOne({ Mr_no: mrNo });
        if (!patient) {
            return res.status(404).send('Patient not found');
        }

        // Check if we need to regenerate the AI message
        if (shouldRegenerateAIMessage(patient)) {
            // Call the function to regenerate the AI message
            // const csvPath = `patient_health_scores_${patient.Mr_no}.csv`;
            // const csvApiSurveysPath = `/data/API_SURVEYS_${patient.Mr_no}.csv`;

            const csvPath = `/patient_health_scores_csv?mr_no=${mrNo}`;
            const csvApiSurveysPath = `/api_surveys_csv?mr_no=${mrNo}`;

            const patientPromptCommand = `python python_scripts/patientprompt.py "${csvPath}" "${path.join(__dirname, 'public', 'SeverityLevels.csv')}" "${csvApiSurveysPath}"`;
            
            exec(patientPromptCommand, async (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error executing patientprompt.py: ${error.message}`);
                    return res.status(500).send('Error generating AI message');
                }
                
                if (stderr) {
                    console.error(`stderr: ${stderr}`);
                }

                const aiMessage = stdout.trim();
                
                // Update the patient document with the new AI message and timestamp
                patient.aiMessageDoctor = aiMessage;
                patient.aiMessageDoctorTimestamp = new Date();
                await patient.save();

                // Render the response with updated data
                res.render('patient-details', {
                    lng: res.locals.lng,
                    dir: res.locals.dir,
                    patient,
                    aiMessageEnglish: patient.aiMessageDoctorEnglish,
                    aiMessageArabic: patient.aiMessageDoctorArabic,
                    csvPath,
                    csvApiSurveysPath,
                });
            });

        } else {
            // Use the existing AI message
            const aiMessage = patient.aiMessageDoctor;
            const csvPath = `/patient_health_scores_csv?mr_no=${mrNo}`;
            const csvApiSurveysPath = `/api_surveys_csv?mr_no=${mrNo}`;

            res.render('patient-details', {
                lng: res.locals.lng,
                dir: res.locals.dir,
                patient,
                aiMessageEnglish: patient.aiMessageDoctorEnglish,
                aiMessageArabic: patient.aiMessageDoctorArabic,
                csvPath,
                csvApiSurveysPath,
            });
        }
    } catch (error) {
        console.error('Error fetching patient details:', error);
        res.status(500).send('Server Error');
    }
});



//This is code for the doctor llama message




// Mount the router with the base path
app.use(basePath, router);

// // Start server
const PORT = process.env.DOCTOR_LOGIN_PAGE_PORT || 3003;
// const PORT = 3003;
app.listen(PORT, () => console.log(`Server is running on ${BASE_URL}${basePath}`));


// function startServer() {
//     app.listen(PORT, () => {
//         console.log(`Doctor Login Server is running on ${BASE_URL}:${PORT}`);
//     });
// }


// module.exports = startServer