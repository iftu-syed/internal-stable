const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const app = express();
require('dotenv').config();  // Load environment variables
const crypto = require('crypto');
const session = require('express-session');
const flash = require('connect-flash');
const MongoStore = require('connect-mongo'); // Import connect-mongo

// Make BASE_URL available in all EJS templates
app.locals.BASE_URL = process.env.BASE_URL;


// Define the base path
const basePath = '/hospital';
app.locals.basePath = basePath;
const path = require('path');
const fs = require('fs');

const multer = require('multer');
function writeLog(logFile, logData) {
    const logDir = path.join(__dirname, 'logs');



    // Check if the 'logs' folder exists, create it if it doesn't
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir);
    }
    const timestamp = new Date().toISOString().replace('T', ' ').split('.')[0]; // Formatting the timestamp
    const logMessage = `${timestamp} | ${logData}\n`;
    // Now append the log data to the file
    fs.appendFile(path.join(logDir, logFile), logMessage, (err) => {
        if (err) {
            console.error('Error writing to log file:', err);
        }
    });
}

// AES-256 encryption key (32 chars long) and IV (Initialization Vector)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 character key (256 bits)
const IV_LENGTH = 16; // AES block size for CBC mode

// Helper function to encrypt text (password)
function encrypt(text) {
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);

    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// Helper function to decrypt text (password)
function decrypt(text) {
    let textParts = text.split(':');
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);

    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString();
}

// Connect to MongoDB using environment variables
// mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });


const adminUserConnection = mongoose.createConnection(process.env.MONGO_URI, {

    useNewUrlParser: true,

    useUnifiedTopology: true

});


const manageDoctorsConnection = mongoose.createConnection(process.env.MONGO_URI_DOCTORS, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const doctorSchema = new mongoose.Schema({
    username: String
    // Add other fields as needed
});

const staffSchema = new mongoose.Schema({
    username: String
    // Add other fields as needed
});

const adminSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    username: String,
    password: String,
    hospital_code: String,
    hospitalName: String,
    siteCode: String,
    siteName: String,
    subscription: { type: String, enum: ['Active', 'Inactive'] },
    loginCounter: { type: Number, default: 0 }  // Add this line
});

// const Admin = mongoose.model('User', adminSchema); // Model name is 'User'
const Admin = adminUserConnection.model("User", adminSchema);

const Doctor = manageDoctorsConnection.model('Doctor', doctorSchema);
const Staff = manageDoctorsConnection.model('Staff', staffSchema);

const siteSchema = new mongoose.Schema({
    site_code: String,
    site_name: String,
    address: String,
    city: String,
    state: String,
    country: String,
    zip: String,
    notification_preference: String
});

const hospitalSchema = new mongoose.Schema({
    hospital_code: { type: String, required: true, unique: true },
    hospital_name: { type: String, required: true },
    sites: [siteSchema]
});

// const Hospital = mongoose.model('Hospital', hospitalSchema);


const Hospital = adminUserConnection.model('Hospital', hospitalSchema);



// Define Hospital Onboarding Schema

const hospitalOnboardingSchema = new mongoose.Schema({

    hospitalName: { type: String, required: true },

    // hospitalCode: { type: String, required: true },

    siteName: { type: String, required: true },

    street_details: String,

    country: String,

    state: String,

    city: String,

    zip: String,

    specialties: [{

        name: { type: String, required: true },

        surveys: [{ type: String }]

    }],

    users: [{ firstName: String, lastName: String, phoneNumber: String, email: String }],

    doctors: [{ firstName: String, lastName: String, specialty: String }],

    staff: [{ firstName: String, lastName: String }],

    hospitalLogo: String,

    patientDataFile: String,

    createdAt: { type: Date, default: Date.now }

});





const HospitalOnboarding = adminUserConnection.model('onboarding', hospitalOnboardingSchema);



app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files under the base path
app.use(basePath, express.static('public'));



// app.use(session({
//     secret: process.env.SESSION_SECRET,  // Use environment variable for session secret
//     resave: false,
//     saveUninitialized: true
// }));



// Update session middleware to store sessions in MongoDB
app.use(session({
    secret: process.env.SESSION_SECRET,  // Use environment variable for session secret
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI, // MongoDB connection URI from environment variables
        dbName: process.env.SESSION_DB, // Use environment variable for database name
        collectionName: process.env.SESSION_COLLECTION, // Use environment variable for session collection name
        ttl: 14 * 24 * 60 * 60,          // Session expiry (14 days in this example)
        autoRemove: 'native',            // Automatically remove expired sessions
    })
}));

// Middleware to check if the user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        writeLog('user_activity_logs.txt', `Severity: INFO | Event: Authenticated Access | Action: User ${req.session.user.username} accessed protected route`);
        // If the session exists, proceed to the next middleware or route
        return next();
    } else {
        writeLog('user_activity_logs.txt', `Severity: WARNING | Event: Unauthenticated Access | Action: User attempted to access protected route without being logged in`);
        // If no session exists, redirect to the login page with an error message
        req.flash('error', 'You must be logged in to access this page.');
        return res.redirect(basePath + '/');
    }
}

app.use(flash());

// Middleware to pass flash messages to views
app.use((req, res, next) => {
    res.locals.messages = req.flash();
    next();
});

// Create an Express Router
const router = express.Router();

// // Routes
// router.get('/', (req, res) => {
//     res.render('login');
// });

// Routes
// router.get('/', (req, res) => {
//     res.send(`
//         <div style="text-align: center; padding: 50px;">
//             <h1 style="font-size: 48px; color: #4CAF50;">Welcome to WeHealthify</h1>
//             <p style="font-size: 20px; max-width: 600px; margin: auto;">
//                 WeHealthify is your trusted healthcare platform, ensuring seamless patient management, 
//                 secure data handling, and intelligent health insights. Join us on our mission to revolutionize 
//                 healthcare technology and improve patient experiences.
//             </p>
//             <p style="font-size: 18px;">
//                 Stay connected, stay informed, and stay healthy!
//             </p>
//         </div>
//     `);
// });


// Routes



router.get('/', (req, res) => {
    res.send(`
        <div 
        style="
            text-align: center; 
            padding: 80px; 
            background-image: url('assets/lgbg.png'); 
            background-size: cover; 
            background-position: center; 
            background-repeat: no-repeat; 
            position: relative;
            color: #333;
            font-family: Arial, sans-serif;
            height: -webkit-fill-available;
        "
    >
        <!-- Center-Aligned Logo -->
        <img 
            src="assets/logo1.png" 
            alt="WeHealthify Logo" 
            style=" 
                margin-bottom: 30px; 
                display: block; 
                margin-left: auto; 
                margin-right: auto;
            "
        >

        <!-- Heading -->
        <h1 style="color: #4CAF50;">
            Welcome to WeHealthify
        </h1>

        <!-- Description Paragraph -->
        <p 
            style="
                font-size: 22px; 
                max-width: 800px; 
                margin: auto;  
                color: #333;
            "
        >
            Your trusted healthcare platform for seamless patient management, secure data handling, 
            and intelligent health insights. Join us in revolutionizing healthcare technology to improve 
            patient experiences and streamline hospital operations.
        </p>

        <!-- Subheading -->
        <p 
            style="
                font-size: 24px; 
                font-weight: bold; 
                color: #555; 
                margin-top: 30px;
            "
        >
            Stay connected, Stay informed, and Stay healthy!
        </p>
        <br>

        <!-- Onboarding Button -->
        <a 
            href="http://localhost/hospital/onboarding" 
            style="
                color: white; 
                background-color: #007BFF; 
                padding: 20px 20px;  
                border-radius: 10px; 
                display: inline-block; 
                margin-top: 40px; 
                text-decoration: none;
                font-size: 16px;
                transition: background-color 0.3s ease, transform 0.3s ease;
            "
            onmouseover="this.style.backgroundColor='#0056b3'; this.style.transform='scale(1.05)';"
            onmouseout="this.style.backgroundColor='#007BFF'; this.style.transform='scale(1)';"
        >
             Click Here to Start Your Healthcare Facility Onboarding 
        </a>
    </div>
    `);
});




// Logout Route
router.get('/logout', isAuthenticated, (req, res) => {
    //console.log("Hi");
    // Set the flash message before destroying the session
    req.flash('success', 'You have been logged out.');
    console.log('Session before logout:', req.session);
    // Destroy the session
    req.session.destroy((err) => {
        if (err) {
            //writeLog('error_logs.txt', `Severity: ERROR | Event: Logout Failed | Action: Failed to destroy session for user: ${req.session.user ? req.session.user.username : 'Unknown'}`);
            writeLog('error_logs.txt', `Severity: ERROR | Event: Logout Failed | Action: Failed to destroy session for user: ${username}`);
            console.error('Failed to destroy session during logout', err);
            req.flash('error', 'Failed to log out. Please try again.');
            return res.redirect(basePath + '/dashboard');
        }
        // Clear the cookie and redirect to the login page
        res.clearCookie('connect.sid'); // Optional: Clears the session cookie
        //console.log("in here",req.session.user.username);
        writeLog('user_activity_logs.txt', `Severity: INFO | Event: Successful Logout | Action: User ${req.session.user ? req.session.user.username : 'Unknown'} logged out successfully`);
        res.redirect(basePath + '/');
    });
});

// // Route to render the Hospital Form
// router.get('/addHospital', (req, res) => {
//     res.render('add-hospital');
// });


// Route to render the Hospital Form
router.get('/addHospital', isAuthenticated,(req, res) => {
    writeLog('user_activity_logs.txt', `Severity: INFO | Event: Hospital Form Accessed | Action: User ${req.session.user ? req.session.user.username : 'Unknown'} accessed add hospital form`);
    res.render('add-hospital');
});

router.post('/addHospital', async (req, res) => {
    const { hospital_code, hospital_name, site_code, site_name, address, city, state, country, zip, notification_preference} = req.body;

    try {
        console.log("notification_preference:",notification_preference);
        let hospital = await Hospital.findOne({ hospital_code, hospital_name });

        if (hospital) {
            // Hospital exists, add the new site
            hospital.sites.push({ site_code, site_name, address, city, state, country, zip, notification_preference });
            writeLog('user_activity_logs.txt', `Severity: INFO | Event: Hospital Updated | Action: Added site to existing hospital: ${hospital_name}, hospital_code: ${hospital_code}`);
        } else {
            // Hospital does not exist, create a new hospital entry
            hospital = new Hospital({
                hospital_code,
                hospital_name,
                sites: [{ site_code, site_name, address, city, state, country, zip, notification_preference }]
            });
            console.log("hospital:",hospital);
            writeLog('user_activity_logs.txt', `Severity: INFO | Event: New Hospital Added | Action: Added new hospital: ${hospital_name}, hospital_code: ${hospital_code}`);
        }

        await hospital.save();
        req.flash('success', 'Hospital and sites added/updated successfully.');
        res.redirect(basePath + '/dashboard');
    } catch (error) {
        console.error(error);
        writeLog('error_logs.txt', `Severity: ERROR | Event: Hospital Add/Update Failed | Action: Error occurred while adding/updating hospital: ${hospital_name}, hospital_code: ${hospital_code}`);
        res.redirect(basePath + '/addHospital');
        req.flash('error', 'Failed to add/update hospital.');
        res.redirect(basePath + '/addHospital');
    }
});


router.post('/login', (req, res) => {
    const { username, password } = req.body;

    const hardcodedUsername = process.env.HARDCODED_USERNAME;  // Use environment variable for hardcoded username
    const hardcodedPassword = process.env.HARDCODED_PASSWORD;  // Use environment variable for hardcoded password

    if (username !== hardcodedUsername && password !== hardcodedPassword) {
        writeLog('user_activity_logs.txt', `Severity: WARNING | Event: Login Failed | Action: Invalid username and password for user: ${username}`);
        req.flash('error', 'Invalid username and password');
    } else if (username !== hardcodedUsername) {
        writeLog('user_activity_logs.txt', `Severity: WARNING | Event: Login Failed | Action: Invalid username for user: ${username}`);
        req.flash('error', 'Invalid username');
    } else if (password !== hardcodedPassword) {
        writeLog('user_activity_logs.txt', `Severity: WARNING | Event: Login Failed | Action: Invalid password for user: ${username}`);
        req.flash('error', 'Invalid password');
    } else {
        // Set the user object in the session upon successful login
        req.session.user = { username };
        writeLog('user_activity_logs.txt', `Severity: INFO | Event: Successful Login | Action: User ${username} logged in successfully`);
        // Redirect to the dashboard
        return res.redirect(basePath + '/dashboard');
    }

    // If login fails, redirect back to the login page
    res.redirect(basePath + '/');
});



// router.post('/addAdmin', isAuthenticated, async (req, res) => {
//     try {
//         const { firstName, lastName, hospital_code, hospitalName, siteCode, subscription } = req.body;

//         // Find the hospital based on the selected hospital code
//         const hospital = await Hospital.findOne({ hospital_code });

//         // Find the selected site within the hospital's sites array
//         const site = hospital.sites.find(s => s.site_code === siteCode);

//         // Extract siteName from the selected site
//         const siteName = site ? site.site_name : '';

//         // Generate the base username (without numeric suffix)
//         // let baseUsername = `${siteCode.toLowerCase()}_${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}`;

//         // // Fetch all admins with similar base usernames
//         // const existingAdmins = await Admin.find({ username: { $regex: `^${baseUsername}(_[0-9]{3})?$` } });

//         // let username = baseUsername;

//         // if (existingAdmins.length > 0) {
//         //     // Extract the numeric suffix from existing usernames and find the highest number
//         //     let maxSuffix = 0;
//         //     existingAdmins.forEach(admin => {
//         //         const suffixMatch = admin.username.match(/_(\d{3})$/);  // Check for numeric suffix
//         //         if (suffixMatch) {
//         //             const suffixNum = parseInt(suffixMatch[1], 10);
//         //             if (suffixNum > maxSuffix) {
//         //                 maxSuffix = suffixNum;
//         //             }
//         //         }
//         //     });

//         //     // Increment the highest suffix by 1 for the new username
//         //     username = `${baseUsername}_${String(maxSuffix + 1).padStart(3, '0')}`;
//         // }

//         let baseUsername = `${siteCode.toLowerCase()}_${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}`;

//         // // Find all admins with similar base usernames
//         // const existingAdmins = await Admin.find({ username: { $regex: `^${baseUsername}(\\d{2})?$` } });

//         // let username = baseUsername;

//         // if (existingAdmins.length > 0) {
//         //     // Get the numeric suffixes from existing usernames and find the highest number
//         //     let maxSuffix = 0;
//         //     existingAdmins.forEach(admin => {
//         //         const suffixMatch = admin.username.match(/(\d{2})$/);  // Check for 2-digit numeric suffix
//         //         if (suffixMatch) {
//         //             const suffixNum = parseInt(suffixMatch[1], 10);
//         //             if (suffixNum > maxSuffix) {
//         //                 maxSuffix = suffixNum;
//         //             }
//         //         }
//         //     });

//         //     // Increment the highest suffix by 1 and format it as a 2-digit number
//         //     username = `${baseUsername}${String(maxSuffix + 1).padStart(2, '0')}`;
//         // }


//         // Check for existing username in Admin, Doctor, and Staff collections
//         const adminExists = await Admin.exists({ username: baseUsername });
//         const doctorExists = await Doctor.exists({ username: baseUsername });
//         const staffExists = await Staff.exists({ username: baseUsername });

//         // If username exists in any one collection, apply suffix logic
//         let username = baseUsername;

//         if (adminExists || doctorExists || staffExists) {
//             const existingAdmins = await Admin.find({ username: { $regex: `^${baseUsername}(\\d{2})?$` } });
//             const existingDoctors = await Doctor.find({ username: { $regex: `^${baseUsername}(\\d{2})?$` } });
//             const existingStaffs = await Staff.find({ username: { $regex: `^${baseUsername}(\\d{2})?$` } });

//             // Combine results from all collections
//             let maxSuffix = 0;
//             [...existingAdmins, ...existingDoctors, ...existingStaffs].forEach(user => {
//                 const suffixMatch = user.username.match(/(\d{2})$/);  // Check for 2-digit numeric suffix
//                 if (suffixMatch) {
//                     const suffixNum = parseInt(suffixMatch[1], 10);
//                     if (suffixNum > maxSuffix) {
//                         maxSuffix = suffixNum;
//                     }
//                 }
//             });

//             // Increment the highest suffix by 1 and format it as a 2-digit number
//             username = `${baseUsername}${String(maxSuffix + 1).padStart(2, '0')}`;
//         }



//         // Auto-generate the password
//         const randomNum = Math.floor(Math.random() * 90000) + 10000;
//         const password = `${siteCode}_${firstName.toLowerCase()}@${randomNum}`;

//         // Encrypt the password using AES-256
//         const encryptedPassword = encrypt(password);

//         // Create new admin including encrypted password and siteName
//         const newAdmin = new Admin({
//             firstName,
//             lastName,
//             username,
//             password: encryptedPassword,  // Save encrypted password
//             hospital_code,
//             hospitalName,
//             siteCode,
//             siteName,
//             subscription
//         });

//         await newAdmin.save();

//         // Redirect to dashboard with decrypted password in query parameters
//         res.redirect(`${basePath}/dashboard?username=${username}&password=${password}`);
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Internal Server Error');
//     }
// });





// router.get('/editAdmin/:id', isAuthenticated,async (req, res) => {
//     try {
//         const { id } = req.params;
//         const admin = await Admin.findById(id).lean();
//         const hospitals = await Hospital.find().lean();

//         res.render('edit-admin', { admin, hospitals });
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Internal Server Error');
//     }
// });



// router.post('/addAdmin', isAuthenticated, async (req, res) => {
//     try {
//         // const { firstName, lastName, hospital_code, hospitalName, siteCode, subscription } = req.body;

//         // // Find the hospital based on the selected hospital code
//         // const hospital = await Hospital.findOne({ hospital_code });

//         // // Find the selected site within the hospital's sites array
//         // const site = hospital.sites.find(s => s.site_code === siteCode);

//         // // Extract siteName from the selected site
//         // const siteName = site ? site.site_name : '';


//         // let baseUsername = `${siteCode.toLowerCase()}_${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}`;

//         let { firstName, lastName, hospital_code, hospitalName, siteCode, subscription } = req.body;

//         // Trim leading and trailing spaces from firstName and lastName
//         firstName = firstName.trim();
//         lastName = lastName.trim();

//         // Find the hospital based on the selected hospital code
//         const hospital = await Hospital.findOne({ hospital_code });

//         // Find the selected site within the hospital's sites array
//         const site = hospital.sites.find(s => s.site_code === siteCode);

//         // Extract siteName from the selected site
//         const siteName = site ? site.site_name : '';

//         // Generate username based on the updated format
//         let baseUsername = `${siteCode.toLowerCase()}_${firstName.charAt(0).toLowerCase()}${lastName.split(' ')[0].toLowerCase()}`;
//         // (Rest of the code remains unchanged)




//         // Check for existing username in Admin, Doctor, and Staff collections
//         const adminExists = await Admin.exists({ username: baseUsername });
//         const doctorExists = await Doctor.exists({ username: baseUsername });
//         const staffExists = await Staff.exists({ username: baseUsername });

//         // If username exists in any one collection, apply suffix logic
//         let username = baseUsername;

//         if (adminExists || doctorExists || staffExists) {
//             const existingAdmins = await Admin.find({ username: { $regex: `^${baseUsername}(\\d{2})?$` } });
//             const existingDoctors = await Doctor.find({ username: { $regex: `^${baseUsername}(\\d{2})?$` } });
//             const existingStaffs = await Staff.find({ username: { $regex: `^${baseUsername}(\\d{2})?$` } });

//             // Combine results from all collections
//             let maxSuffix = 0;
//             [...existingAdmins, ...existingDoctors, ...existingStaffs].forEach(user => {
//                 const suffixMatch = user.username.match(/(\d{2})$/);  // Check for 2-digit numeric suffix
//                 if (suffixMatch) {
//                     const suffixNum = parseInt(suffixMatch[1], 10);
//                     if (suffixNum > maxSuffix) {
//                         maxSuffix = suffixNum;
//                     }
//                 }
//             });

//             // Increment the highest suffix by 1 and format it as a 2-digit number
//             username = `${baseUsername}${String(maxSuffix + 1).padStart(2, '0')}`;
//         }



//         // Auto-generate the password
//         const randomNum = Math.floor(Math.random() * 90000) + 10000;
//         const password = `${siteCode}_${firstName.charAt(0).toLowerCase()}@${randomNum}`;

//         // Encrypt the password using AES-256
//         const encryptedPassword = encrypt(password);

//         // Create new admin including encrypted password and siteName
//         const newAdmin = new Admin({
//             firstName,
//             lastName,
//             username,
//             password: encryptedPassword,  // Save encrypted password
//             hospital_code,
//             hospitalName,
//             siteCode,
//             siteName,
//             subscription
//         });

//         await newAdmin.save();

//         // Redirect to dashboard with decrypted password in query parameters
//         res.redirect(`${basePath}/dashboard?username=${username}&password=${password}`);
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Internal Server Error');
//     }
// });


router.post('/addAdmin', isAuthenticated, async (req, res) => {
    try {
        let { firstName, lastName, hospital_code, hospitalName, siteCode, subscription } = req.body;

        // Trim leading and trailing spaces from firstName and lastName
        firstName = firstName.trim();
        lastName = lastName.trim();

        // Find the hospital based on the selected hospital code
        const hospital = await Hospital.findOne({ hospital_code });

        // Find the selected site within the hospital's sites array
        const site = hospital.sites.find(s => s.site_code === siteCode);

        // Extract siteName from the selected site
        const siteName = site ? site.site_name : '';

        // Generate username based on the updated format
        let baseUsername = `${siteCode.toLowerCase()}_${firstName.charAt(0).toLowerCase()}${lastName.split(' ')[0].toLowerCase()}`;

        // Check for existing username in Admin, Doctor, and Staff collections
        const adminExists = await Admin.exists({ username: baseUsername });
        const doctorExists = await Doctor.exists({ username: baseUsername });
        const staffExists = await Staff.exists({ username: baseUsername });

        let username = baseUsername;

        if (adminExists || doctorExists || staffExists) {
            const existingAdmins = await Admin.find({ username: { $regex: `^${baseUsername}(\\d{2})?$` } });
            const existingDoctors = await Doctor.find({ username: { $regex: `^${baseUsername}(\\d{2})?$` } });
            const existingStaffs = await Staff.find({ username: { $regex: `^${baseUsername}(\\d{2})?$` } });

            let maxSuffix = 0;
            [...existingAdmins, ...existingDoctors, ...existingStaffs].forEach(user => {
                const suffixMatch = user.username.match(/(\d{2})$/);
                if (suffixMatch) {
                    const suffixNum = parseInt(suffixMatch[1], 10);
                    if (suffixNum > maxSuffix) {
                        maxSuffix = suffixNum;
                    }
                }
            });

            username = `${baseUsername}${String(maxSuffix + 1).padStart(2, '0')}`;
        }

        const randomNum = Math.floor(Math.random() * 90000) + 10000;
        const password = `${siteCode}_${firstName.charAt(0).toLowerCase()}@${randomNum}`;

        const encryptedPassword = encrypt(password);

        const newAdmin = new Admin({
            firstName,
            lastName,
            username,
            password: encryptedPassword,
            hospital_code,
            hospitalName,
            siteCode,
            siteName,
            subscription
        });

        await newAdmin.save();

        // Store the credentials in session instead of query params
        req.session.adminCredentials = { username, password };
        writeLog('user_activity_logs.txt', `Severity: INFO | Event: Admin Added | Action: Admin created with username: ${username}, hospital_code: ${hospital_code}, site_code: ${siteCode}`);
        res.redirect(`${basePath}/dashboard`);
    } catch (err) {
        console.error(err);
        writeLog('user_activity_logs.txt', `Severity: ERROR | Event: Admin Addition Failed | Action: Error occurred while adding new admin for hospital_code: ${hospital_code}, site_code: ${siteCode}`);
        res.status(500).send('Internal Server Error');
    }
});





router.get('/editAdmin/:id', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const admin = await Admin.findById(id).lean();
        const hospitals = await Hospital.find().lean();
        writeLog('user_activity_logs.txt', `Severity: INFO | Event: Admin Edit Accessed | Action: Admin details for ${admin.username} fetched for editing`);
        // Decrypt the password before sending to the view
        admin.password = decrypt(admin.password);

        res.render('edit-admin', { admin, hospitals });
    } catch (err) {
        console.error(err);
        writeLog('user_activity_logs.txt', `Severity: ERROR | Event: Admin Edit Access Failed | Action: Error occurred while fetching admin details for editing`);
        res.status(500).send('Internal Server Error');
    }
});


// router.post('/editAdmin/:id', async (req, res) => {
//     try {
//         // const { id } = req.params;
//         // const { firstName, lastName, password, hospital_code, hospitalName, siteCode, subscription } = req.body;

//         // // Find the hospital based on the selected hospital code
//         // const hospital = await Hospital.findOne({ hospital_code });

//         // // Find the selected site within the hospital's sites array
//         // const site = hospital.sites.find(s => s.site_code === siteCode);

//         // // Extract siteName from the selected site
//         // const siteName = site ? site.site_name : '';

        
//         // let baseUsername = `${siteCode.toLowerCase()}_${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}`;

//         const { id } = req.params;
//         let { firstName, lastName, password, hospital_code, hospitalName, siteCode, subscription } = req.body;

//         // Trim leading and trailing spaces from firstName and lastName
//         firstName = firstName.trim();
//         lastName = lastName.trim();

//         // Find the hospital based on the selected hospital code
//         const hospital = await Hospital.findOne({ hospital_code });

//         // Find the selected site within the hospital's sites array
//         const site = hospital.sites.find(s => s.site_code === siteCode);

//         // Extract siteName from the selected site
//         const siteName = site ? site.site_name : '';

//         // Generate username based on the updated format
//         let baseUsername = `${siteCode.toLowerCase()}_${firstName.charAt(0).toLowerCase()}${lastName.split(' ')[0].toLowerCase()}`;
        

//         // Check for existing username in Admin, Doctor, and Staff collections
//         const adminExists = await Admin.exists({ username: baseUsername });
//         const doctorExists = await Doctor.exists({ username: baseUsername });
//         const staffExists = await Staff.exists({ username: baseUsername });

//         // If username exists in any one collection, apply suffix logic
//         let username = baseUsername;

//         if (adminExists || doctorExists || staffExists) {
//             const existingAdmins = await Admin.find({ username: { $regex: `^${baseUsername}(\\d{2})?$` } });
//             const existingDoctors = await Doctor.find({ username: { $regex: `^${baseUsername}(\\d{2})?$` } });
//             const existingStaffs = await Staff.find({ username: { $regex: `^${baseUsername}(\\d{2})?$` } });

//             // Combine results from all collections
//             let maxSuffix = 0;
//             [...existingAdmins, ...existingDoctors, ...existingStaffs].forEach(user => {
//                 const suffixMatch = user.username.match(/(\d{2})$/);  // Check for 2-digit numeric suffix
//                 if (suffixMatch) {
//                     const suffixNum = parseInt(suffixMatch[1], 10);
//                     if (suffixNum > maxSuffix) {
//                         maxSuffix = suffixNum;
//                     }
//                 }
//             });

//             // Increment the highest suffix by 1 and format it as a 2-digit number
//             username = `${baseUsername}${String(maxSuffix + 1).padStart(2, '0')}`;
//         }

        
//         // Check if another admin with the same hospital_code, site code, first name, and last name exists (excluding the current one)
//         const existingAdmin = await Admin.findOne({
//             hospital_code,
//             hospitalName,
//             siteCode,
//             firstName,
//             lastName,
//             _id: { $ne: id }
//         });

//         if (existingAdmin) {
//             req.flash('error', 'An admin with the same details already exists.');
//             return res.redirect(`${basePath}/editAdmin/${id}`);
//         }

//         // Encrypt the new password using AES-256
//         const encryptedPassword = encrypt(password);

//         // Update the admin data including the siteName and siteCode
//         await Admin.findByIdAndUpdate(id, {
//             firstName,
//             lastName,
//             hospital_code,
//             hospitalName,
//             siteCode,
//             siteName,
//             subscription,
//             username,
//             password: encryptedPassword  // Use encrypted password
//         });

//         // Redirect to the dashboard with the decrypted password in query parameters
//         res.redirect(`${basePath}/dashboard?username=${username}&password=${password}`);
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Internal Server Error');
//     }
// });


// Protecting the dashboard route

// router.post('/editAdmin/:id', async (req, res) => {
//     try {
//         const { id } = req.params;
//         let { firstName, lastName, password, hospital_code, hospitalName, siteCode, subscription } = req.body;

//         // Trim leading and trailing spaces from firstName and lastName
//         firstName = firstName.trim();
//         lastName = lastName.trim();

//         // Find the hospital based on the selected hospital code
//         const hospital = await Hospital.findOne({ hospital_code });

//         // Find the selected site within the hospital's sites array
//         const site = hospital.sites.find(s => s.site_code === siteCode);

//         // Extract siteName from the selected site
//         const siteName = site ? site.site_name : '';

//         // Generate username based on the updated format
//         let baseUsername = `${siteCode.toLowerCase()}_${firstName.charAt(0).toLowerCase()}${lastName.split(' ')[0].toLowerCase()}`;

//         // Fetch the current admin data
//         const currentAdmin = await Admin.findById(id);

//         // Check if the username is actually changing
//         let username = currentAdmin.username;
//         if (username !== baseUsername) {
//             // Check for existing username in Admin, Doctor, and Staff collections
//             const adminExists = await Admin.exists({ username: baseUsername });
//             const doctorExists = await Doctor.exists({ username: baseUsername });
//             const staffExists = await Staff.exists({ username: baseUsername });

//             // If username exists in any one collection, apply suffix logic
//             if (adminExists || doctorExists || staffExists) {
//                 const existingAdmins = await Admin.find({ username: { $regex: `^${baseUsername}(\\d{2})?$` } });
//                 const existingDoctors = await Doctor.find({ username: { $regex: `^${baseUsername}(\\d{2})?$` } });
//                 const existingStaffs = await Staff.find({ username: { $regex: `^${baseUsername}(\\d{2})?$` } });

//                 // Combine results from all collections
//                 let maxSuffix = 0;
//                 [...existingAdmins, ...existingDoctors, ...existingStaffs].forEach(user => {
//                     const suffixMatch = user.username.match(/(\d{2})$/); // Check for 2-digit numeric suffix
//                     if (suffixMatch) {
//                         const suffixNum = parseInt(suffixMatch[1], 10);
//                         if (suffixNum > maxSuffix) {
//                             maxSuffix = suffixNum;
//                         }
//                     }
//                 });

//                 // Increment the highest suffix by 1 and format it as a 2-digit number
//                 username = `${baseUsername}${String(maxSuffix + 1).padStart(2, '0')}`;
//             } else {
//                 username = baseUsername;
//             }
//         }

//         // Check if another admin with the same hospital_code, site code, first name, and last name exists (excluding the current one)
//         const existingAdmin = await Admin.findOne({
//             hospital_code,
//             hospitalName,
//             siteCode,
//             firstName,
//             lastName,
//             _id: { $ne: id }
//         });

//         if (existingAdmin) {
//             req.flash('error', 'An admin with the same details already exists.');
//             return res.redirect(`${basePath}/editAdmin/${id}`);
//         }

//         // Prepare the update object
//         const updateData = {
//             firstName,
//             lastName,
//             hospital_code,
//             hospitalName,
//             siteCode,
//             siteName,
//             subscription
//         };

//         // Add username to the update data only if it changed
//         if (username !== currentAdmin.username) {
//             updateData.username = username;
//         }

//         // Encrypt and update the password only if it is changed
//         if (password && decrypt(currentAdmin.password) !== password) {
//             updateData.password = encrypt(password);
//         }

//         // Update the admin data
//         await Admin.findByIdAndUpdate(id, updateData);

//         // Redirect to the dashboard with the decrypted password in query parameters if updated
//         res.redirect(`${basePath}/dashboard?username=${updateData.username || currentAdmin.username}&password=${password || decrypt(currentAdmin.password)}`);
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Internal Server Error');
//     }
// });



router.post('/editAdmin/:id', async (req, res) => {
    try {
        const { id } = req.params;
        let { firstName, lastName, password, hospital_code, hospitalName, siteCode, subscription } = req.body;

        firstName = firstName.trim();
        lastName = lastName.trim();

        const hospital = await Hospital.findOne({ hospital_code });
        const site = hospital.sites.find(s => s.site_code === siteCode);
        const siteName = site ? site.site_name : '';

        let baseUsername = `${siteCode.toLowerCase()}_${firstName.charAt(0).toLowerCase()}${lastName.split(' ')[0].toLowerCase()}`;
        const currentAdmin = await Admin.findById(id);

        let username = currentAdmin.username;
        if (username !== baseUsername) {
            const adminExists = await Admin.exists({ username: baseUsername });
            const doctorExists = await Doctor.exists({ username: baseUsername });
            const staffExists = await Staff.exists({ username: baseUsername });

            if (adminExists || doctorExists || staffExists) {
                const existingAdmins = await Admin.find({ username: { $regex: `^${baseUsername}(\\d{2})?$` } });
                const existingDoctors = await Doctor.find({ username: { $regex: `^${baseUsername}(\\d{2})?$` } });
                const existingStaffs = await Staff.find({ username: { $regex: `^${baseUsername}(\\d{2})?$` } });

                let maxSuffix = 0;
                [...existingAdmins, ...existingDoctors, ...existingStaffs].forEach(user => {
                    const suffixMatch = user.username.match(/(\d{2})$/);
                    if (suffixMatch) {
                        const suffixNum = parseInt(suffixMatch[1], 10);
                        if (suffixNum > maxSuffix) {
                            maxSuffix = suffixNum;
                        }
                    }
                });

                username = `${baseUsername}${String(maxSuffix + 1).padStart(2, '0')}`;
            } else {
                username = baseUsername;
            }
        }

        const existingAdmin = await Admin.findOne({
            hospital_code,
            hospitalName,
            siteCode,
            firstName,
            lastName,
            _id: { $ne: id }
        });

        if (existingAdmin) {
            req.flash('error', 'An admin with the same details already exists.');
            return res.redirect(`${basePath}/editAdmin/${id}`);
        }

        const updateData = {
            firstName,
            lastName,
            hospital_code,
            hospitalName,
            siteCode,
            siteName,
            subscription
        };

        if (username !== currentAdmin.username) {
            updateData.username = username;
        }

        if (password && decrypt(currentAdmin.password) !== password) {
            updateData.password = encrypt(password);
        }

        await Admin.findByIdAndUpdate(id, updateData);
        writeLog('user_activity_logs.txt', `Severity: INFO | Event: Admin Updated | Action: Admin ${username} updated for hospital_code: ${hospital_code}, site_code: ${siteCode}`);
        

        req.session.adminCredentials = { username: updateData.username || currentAdmin.username, password: password || decrypt(currentAdmin.password) };

        res.redirect(`${basePath}/dashboard`);
    } catch (err) {
        console.error(err);
        writeLog('error_logs.txt', `Severity: ERROR | Event: Admin Update Failed | Action: Error occurred while updating admin details for ${req.body.username}`);
        res.status(500).send('Internal Server Error');
    }
});


// router.get('/dashboard', isAuthenticated, async (req, res) => {
//     try {
//         const hospitals = await Hospital.find().lean();
//         const admins = await Admin.find().lean();
//         res.render('index', { hospitals, admins });
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Internal Server Error');
//     }
// });

router.get('/dashboard', isAuthenticated, async (req, res) => {
    try {
        const hospitals = await Hospital.find().lean();
        const admins = await Admin.find().lean();

        // Retrieve admin credentials from session
        const adminCredentials = req.session.adminCredentials;
        delete req.session.adminCredentials; // Clear the session data after use

        res.render('index', { hospitals, admins, adminCredentials });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});


// router.post('/deleteAdmin/:id', async (req, res) => {
//     try {
//         const { id } = req.params;
//         writeLog('user_activity_logs.txt', `Severity: INFO | Event: Admin Deleted | Action: Admin ${admin.username} deleted from system`);
//         await Admin.findByIdAndDelete(id);

//         // Fetch the updated list of admins and hospitals
//         const admins = await Admin.find();
//         const hospitals = await Hospital.find();

//         // Render the index.ejs view with the updated data
//         // res.render('index', { admins, hospitals });
//         res.redirect(basePath + '/dashboard');
//     } catch (err) {
//         console.error(err);
//         writeLog('error_logs.txt', `Severity: ERROR | Event: Admin Deletion Failed | Action: Error occurred while deleting admin with ID: ${req.params.id}`);
//         res.status(500).send('Internal Server Error');
//     }
// });

router.get('/onboarding', (req, res) => {

    res.render('onboarding');

});

router.get('/hospitalDirectory', (req, res) => {

    res.render('hospitalDirectory');

});


const sanitize = require('sanitize-filename'); // You can install this via npm to sanitize the hospital name




// Define storage settings for patient data uploads

const storage = multer.diskStorage({

    destination: (req, file, cb) => {

       
        const hospitalName = req.body.hospital_name || "defaultHospital"; // 

        const sanitizedHospitalName = sanitize(hospitalName); 

        const uploadPath = path.join(__dirname, "public", "assets", "uploads", sanitizedHospitalName);



        // Create the folder if it doesn't exist

        if (!fs.existsSync(uploadPath)) {

            fs.mkdirSync(uploadPath, { recursive: true });

        }



        cb(null, uploadPath); // Store in the site's specific folder

    },

    filename: (req, file, cb) => {

        const hospitalName = req.body.hospital_name || "defaultHospital";

        const sanitizedHospitalName = sanitize(hospitalName);



        // Use hospital name and a timestamp to ensure the filename is unique

        const uniqueFilename = `${sanitizedHospitalName}_${Date.now()}${path.extname(file.originalname)}`;

         cb(null, uniqueFilename);




    }

});



// Filter to allow only images (JPG, PNG) and spreadsheets (CSV, XLSX)

const fileFilter = (req, file, cb) => {



    const allowedTypes = {

        "hospital_logo": ["image/jpeg", "image/png"], // Allowed image types

        "patient_upload": [

            "text/csv", "application/csv",

            "application/vnd.ms-excel",

            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

            "text/plain"

        ] // Allowed CSV/XLSX types

    };



    if (allowedTypes["hospital_logo"].includes(file.mimetype) || allowedTypes["patient_upload"].includes(file.mimetype)) {

        cb(null, true);

    } else {

        console.error(" Invalid file type uploaded:", file.mimetype);

        cb(new Error("Only CSV, XLSX, JPG, and PNG files are allowed"), false);

    }

};



// Use `upload.fields()` to handle multiple files

const upload = multer({ 

    storage, 

    fileFilter, 

    limits: { fileSize: 5 * 1024 * 1024 } 

});



module.exports = upload;



router.post("/hospital-onboarding", upload.fields([

    { name: "hospital_logo", maxCount: 1 }, 

    { name: "patient_upload", maxCount: 1 }

]), async (req, res) => {

    // console.log("📌 Hospital Onboarding Form Received!");

    

    try {

        if (!req.body.hospital_name) {

            return res.status(400).json({ message: "Hospital name required!" });

        }

    

        const specialties = req.body.specialties ? 

            Object.keys(req.body.specialties).map(specialtyName => ({

                name: specialtyName,

                surveys: req.body.specialties[specialtyName]

            })) : [];

    

        const users = [];

        Object.keys(req.body).forEach(key => {

            if (key.startsWith("users[")) {

                const index = key.match(/\d+/)[0]; // Extract index from key

                if (!users[index]) users[index] = {};

                const field = key.split(".")[1];

                users[index][field] = req.body[key];

            }

        });

    

        const doctors = [];

        Object.keys(req.body).forEach(key => {

            if (key.startsWith("doctors[")) {

                const index = key.match(/\d+/)[0];

                if (!doctors[index]) doctors[index] = {};

                const field = key.split(".")[1];

                doctors[index][field] = req.body[key];

            }

        });

    

        const staff = [];

        Object.keys(req.body).forEach(key => {

            if (key.startsWith("staff[")) {

                const index = key.match(/\d+/)[0];

                if (!staff[index]) staff[index] = {};

                const field = key.split(".")[1];

                staff[index][field] = req.body[key];

            }

        });

    

        // Extract relevant data

        const hospitalData = {

            hospitalName: req.body.hospital_name,

            // hospitalCode: req.body.hospital_code,

            siteName: req.body.branch_name,

            // siteCode: req.body.branch_code,

            country: req.body.country,

            state: req.body.state,

            city: req.body.city,

            street_details:req.body.street_details,

            zip: req.body.zip,

            specialties: specialties,

            users: users.filter(user => Object.keys(user).length > 0), // Remove empty objects

            doctors: doctors.filter(doctor => Object.keys(doctor).length > 0),

            staff: staff.filter(staffMember => Object.keys(staffMember).length > 0),

            hospitalLogo: req.files["hospital_logo"]? `/assets/uploads/${req.body.hospital_name || "default"}/${req.files["hospital_logo"][0].filename}`: null,



            patientDataFile: req.files["patient_upload"] ? `/assets/uploads/${req.body.hospital_name || "default"}/${req.files["patient_upload"][0].filename}` : null



        };

    

       

    

        const newHospital = new HospitalOnboarding(hospitalData);

        await newHospital.save();

        res.render('thankyou');
        //redirectUrl: basePath + '/thankyou?hospitalName=' + encodeURIComponent(hospitalData.hospitalName),

    } catch (error) {

        console.error(" Error processing form:", error);

        res.status(500).json({ message: "Server error. Please try again." });

    }

    

});
router.get('thankyou', (req, res) => {
    //const { hospitalName } = req.query;
    //res.render('thankyou', { hospitalName });
    res.render('thankyou');
});



router.get('/api/hospitals', async (req, res) => {

    try {

        const hospitals = await HospitalOnboarding.find();

	res.json(hospitals);

    } catch (error) {

        res.status(500).json({ error: "Error fetching hospitals" });

    }

});



// Mount the router at the base path


// Mount the router at the base path


router.post('/deleteAdmin/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch the admin before deleting for logging purposes
        const admin = await Admin.findById(id);

        if (!admin) {
            writeLog('error_logs.txt', `Severity: ERROR | Event: Admin Deletion Failed | Action: Admin with ID: ${id} not found`);
            req.flash('error', 'Admin not found.');
            return res.redirect(basePath + '/dashboard');
        }

        await Admin.findByIdAndDelete(id);

        writeLog('user_activity_logs.txt', `Severity: INFO | Event: Admin Deleted | Action: Admin ${admin.username} deleted from system`);

        req.flash('success', 'Admin deleted successfully.');
        res.redirect(basePath + '/dashboard');
    } catch (err) {
        console.error(err);
        writeLog('error_logs.txt', `Severity: ERROR | Event: Admin Deletion Failed | Action: Error occurred while deleting admin with ID: ${req.params.id}`);
        res.status(500).send('Internal Server Error');
    }
});
app.use(basePath, router);

app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});