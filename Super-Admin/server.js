const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const app = express();
require('dotenv').config();  // Load environment variables
const crypto = require('crypto');
const session = require('express-session');
const flash = require('connect-flash');
const MongoStore = require('connect-mongo'); // Import connect-mongo
// Define the base path
const basePath = '/superadmin';
app.locals.basePath = basePath;
const path = require('path');
const fs = require('fs');
function writeLog(logFile, logData) {
    const logDir = path.join(__dirname, 'logs');
// .
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
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
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

const Admin = mongoose.model('User', adminSchema); // Model name is 'User'

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

const Hospital = mongoose.model('Hospital', hospitalSchema);

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files under the base path
app.use(basePath, express.static('public'));



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

// Routes
router.get('/', (req, res) => {
    res.render('login');
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

router.post('/deleteSite', isAuthenticated, async (req, res) => {
    const { hospitalId, siteId } = req.body;
  
    try {
      await Hospital.updateOne(
        { _id: hospitalId },
        { $pull: { sites: { _id: siteId } } }
      );
      console.log(`✅ Deleted site ${siteId} from hospital ${hospitalId}`);
      res.redirect('/superadmin/addHospital');
    } catch (error) {
      console.error('❌ Error deleting site:', error);
      res.status(500).send('Error deleting site');
    }
  });

  router.post('/updateSite', isAuthenticated, async (req, res) => {
    const { hospitalId, siteId, site_code, site_name, address, city, state, country, zip, notification_preference } = req.body;
  
    try {
        console.log("in updateSite");
      const result = await Hospital.updateOne(
        { _id: hospitalId, "sites._id": siteId },
        {
          $set: {
            "sites.$.site_code": site_code,
            "sites.$.site_name": site_name,
            "sites.$.address": address,
            "sites.$.city": city,
            "sites.$.state": state,
            "sites.$.country": country,
            "sites.$.zip": zip,
            "sites.$.notification_preference": notification_preference
          }
        }
      );
      console.log("result",result);
  
      console.log(`✅ Site ${siteId} updated in hospital ${hospitalId}`);
      //res.redirect('/superadmin/addHospital');
      return res.redirect(basePath + '/addHospital');
    } catch (err) {
      console.error("❌ Error updating site:", err);
      res.status(500).send('Update failed');
    }
  });
    


  router.get('/addHospital', isAuthenticated, async (req, res) => {
    try {
        const hospitals = await Hospital.find().lean();

        writeLog('user_activity_logs.txt', `Severity: INFO | Event: Hospital Form Accessed | Action: User ${req.session.user ? req.session.user.username : 'Unknown'} accessed add hospital form`);
        res.render('add-hospital', { hospitals }); // Pass to EJS
    } catch (err) {
        console.error("❌ Error loading hospital form:", err);
        res.status(500).send('Error loading hospital form');
    }
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
// Generate username based on the updated format
let cleanFirstName = firstName.split(' ')[0].toLowerCase();
let cleanLastName = lastName.split(' ')[0].toLowerCase();
let baseUsername = `${cleanFirstName}.${cleanLastName}.${siteCode.toLowerCase()}`;
let username = baseUsername;

// Check if the username already exists in Admin, Doctor, or Staff collections
let isDuplicate = await Admin.exists({ username: username }) ||
                  await Doctor.exists({ username: username }) ||
                  await Staff.exists({ username: username });

if (isDuplicate) {
    let suffix = 2; // Start numbering from 2 if duplicate exists

    while (true) {
        let newUsername = `${cleanFirstName}.${cleanLastName}${suffix}.${siteCode.toLowerCase()}`;

        // Check if this new username exists
        let exists = await Admin.exists({ username: newUsername }) ||
                     await Doctor.exists({ username: newUsername }) ||
                     await Staff.exists({ username: newUsername });

        if (!exists) {
            username = newUsername; // Found a unique username
            break;
        }

        suffix++; // Increment the suffix and try again
    }
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
//         const { id } = req.params;
//         let { firstName, lastName, password, hospital_code, hospitalName, siteCode, subscription } = req.body;

//         firstName = firstName.trim();
//         lastName = lastName.trim();

//         const hospital = await Hospital.findOne({ hospital_code });
//         const site = hospital.sites.find(s => s.site_code === siteCode);
//         const siteName = site ? site.site_name : '';

//         let baseUsername = `${siteCode.toLowerCase()}_${firstName.charAt(0).toLowerCase()}${lastName.split(' ')[0].toLowerCase()}`;
//         const currentAdmin = await Admin.findById(id);

//         let username = currentAdmin.username;
//         if (username !== baseUsername) {
//             const adminExists = await Admin.exists({ username: baseUsername });
//             const doctorExists = await Doctor.exists({ username: baseUsername });
//             const staffExists = await Staff.exists({ username: baseUsername });

//             if (adminExists || doctorExists || staffExists) {
//                 const existingAdmins = await Admin.find({ username: { $regex: `^${baseUsername}(\\d{2})?$` } });
//                 const existingDoctors = await Doctor.find({ username: { $regex: `^${baseUsername}(\\d{2})?$` } });
//                 const existingStaffs = await Staff.find({ username: { $regex: `^${baseUsername}(\\d{2})?$` } });

//                 let maxSuffix = 0;
//                 [...existingAdmins, ...existingDoctors, ...existingStaffs].forEach(user => {
//                     const suffixMatch = user.username.match(/(\d{2})$/);
//                     if (suffixMatch) {
//                         const suffixNum = parseInt(suffixMatch[1], 10);
//                         if (suffixNum > maxSuffix) {
//                             maxSuffix = suffixNum;
//                         }
//                     }
//                 });

//                 username = `${baseUsername}${String(maxSuffix + 1).padStart(2, '0')}`;
//             } else {
//                 username = baseUsername;
//             }
//         }

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

//         const updateData = {
//             firstName,
//             lastName,
//             hospital_code,
//             hospitalName,
//             siteCode,
//             siteName,
//             subscription
//         };

//         if (username !== currentAdmin.username) {
//             updateData.username = username;
//         }

//         if (password && decrypt(currentAdmin.password) !== password) {
//             updateData.password = encrypt(password);
//         }

//         await Admin.findByIdAndUpdate(id, updateData);
//         writeLog('user_activity_logs.txt', `Severity: INFO | Event: Admin Updated | Action: Admin ${username} updated for hospital_code: ${hospital_code}, site_code: ${siteCode}`);
        

//         req.session.adminCredentials = { username: updateData.username || currentAdmin.username, password: password || decrypt(currentAdmin.password) };

//         res.redirect(`${basePath}/dashboard`);
//     } catch (err) {
//         console.error(err);
//         writeLog('error_logs.txt', `Severity: ERROR | Event: Admin Update Failed | Action: Error occurred while updating admin details for ${req.body.username}`);
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

        let cleanFirstName = firstName.split(' ')[0].toLowerCase();
        let cleanLastName = lastName.split(' ')[0].toLowerCase();
        let baseUsername = `${cleanFirstName}.${cleanLastName}.${siteCode.toLowerCase()}`;
        const currentAdmin = await Admin.findById(id);

        let username = baseUsername;

        if (username !== currentAdmin.username) {
            let isDuplicate = await Admin.exists({ username: username }) ||
                              await Doctor.exists({ username: username }) ||
                              await Staff.exists({ username: username });

            if (isDuplicate) {
                let suffix = 2; // Start numbering from 2 if duplicate exists

                while (true) {
                    let newUsername = `${cleanFirstName}.${cleanLastName}${suffix}.${siteCode.toLowerCase()}`;

                    // Check if this new username exists
                    let exists = await Admin.exists({ username: newUsername }) ||
                                 await Doctor.exists({ username: newUsername }) ||
                                 await Staff.exists({ username: newUsername });

                    if (!exists) {
                        username = newUsername; // Found a unique username
                        break;
                    }

                    suffix++; // Increment the suffix and try again
                }
            }
        } else {
            username = currentAdmin.username;
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