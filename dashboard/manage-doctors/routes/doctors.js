const express = require('express');
const router = express.Router();
const Doctor = require('../models/doctor');
const User = require('../models/user'); // Import the User model for adminUser database
const Staff = require('../models/staff'); // Import the Staff model
const { MongoClient } = require('mongodb');
const crypto = require('crypto');
require('dotenv').config();  // Load environment variables

// AES-256 encryption key (32 chars long) and IV (Initialization Vector)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be 32 characters
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

// Use the MongoDB URI from the .env file
const uri = process.env.MONGO_URI  // Fallback to default MongoDB URI



// Middleware to check authentication
function checkAuth(req, res, next) {
    if (req.session && req.session.user) {
        next();
    } else {
        res.redirect('http://localhost/hospitaladmin'); // Redirect to port 4000 if session is missing
    }
}

// Apply the checkAuth middleware to all routes
router.use(checkAuth);

// Dynamic base path to be used in routes
const basePath = '/manageproviders/doctors'; // Adjust this according to the basePath you are using


router.get('/', async (req, res) => {
    const adminCredentials = req.session.adminCredentials;

    let staffCredentials = null;
    if (req.session.staffCredentials) {
        staffCredentials = req.session.staffCredentials;
        delete req.session.staffCredentials; // Clear staffCredentials after use
    }
    
    const staffUsername = staffCredentials?.username || null; // Extract staffUsername from staffCredentials
    const staffPassword = staffCredentials?.password || null; // Extract staffPassword from staffCredentials
    delete req.session.adminCredentials; // Clear adminCredentials after use
    // delete req.session.staffCredentials; // Clear staffCredentials after use

    let client;

    const hospital_code = req.session.user.hospital_code;
    const site_code = req.session.user.site_code;

    if (!hospital_code || !site_code) {
        req.flash('error', 'Invalid session data. Please log in again.');
        return res.redirect(basePath);
    }

    try {
        client = new MongoClient(uri);
        await client.connect();
        const db = client.db();

        const doctors = await db.collection('doctors').find({ hospital_code, site_code }).toArray();
        const staff = await db.collection('staffs').find({ hospital_code, site_code }).toArray();
        const surveys = await db.collection('surveys').find({ hospital_code, site_code }).toArray();

        const combinedData = doctors.map(doctor => {
            const matchedSurveys = surveys.filter(survey => survey.specialty === doctor.speciality);
            return {
                id: doctor._id,
                firstName: doctor.firstName,
                lastName: doctor.lastName,
                username: doctor.username,
                speciality: doctor.speciality,
                surveyName: matchedSurveys.map(survey => {
                    const apiSurveys = Array.isArray(survey.API) ? survey.API.map(api => api.name) : [];
                    const customSurveys = Array.isArray(survey.custom) ? survey.custom : [];
                    return [...customSurveys, ...apiSurveys];
                }).flat(),
            };
        });

        const specialities = await db.collection('surveys').distinct('specialty', { hospital_code, site_code });

        const { firstName, lastName, hospitalName } = req.session.user;

        res.render('manage-doctors', {
            doctors: combinedData,
            staff,
            specialities,
            hospital_code,
            site_code,
            firstName,
            lastName,
            hospitalName,
            adminCredentials,
            staffCredentials, // Pass staffCredentials here
            staffUsername, // Explicitly pass staffUsername to the template
            staffPassword, // Explicitly pass staffPassword to the template
        });
    } catch (error) {
        console.error('Error fetching data:', error);
        req.flash('error', 'An error occurred while fetching the data. Please try again.');
        res.status(500).send('Internal Server Error');
    } finally {
        if (client) {
            await client.close();
        }
    }
});


// Test route to check if we can access the users collection in adminUser database
router.get('/test-users-connection', async (req, res) => {
    try {
        // Fetch all users to verify the connection
        const users = await User.find({});
        console.log('Users:', users);  // Log output to confirm data retrieval
        res.json(users);  // Return users as JSON response
    } catch (error) {
        console.error('Error accessing users collection:', error);
        res.status(500).json({ message: 'Failed to access users collection' });
    }
});

router.get('/edit/:id', async (req, res) => {
    let client;  // Define client outside of try block
    const hospital_code = req.session.user.hospital_code;
    const site_code = req.session.user.site_code;
    const hospitalName = req.session.user.hospitalName;

    // Validate presence of hospital_code and site_code
    if (!hospital_code || !site_code) {
        req.flash('error', 'Invalid session data. Please log in again.');
        return res.redirect(basePath);
    }

    try {
        client = new MongoClient(uri);  // Initialize client here
        await client.connect();
        const db = client.db();

        // Fetch the doctor to be edited
        const doctor = await Doctor.findById(req.params.id);

        if (!doctor) {
            req.flash('error', 'Doctor not found.');
            return res.redirect(`${basePath}`);
        }

        const specialities = await db.collection('surveys').distinct('specialty', { hospital_code, site_code });

        const { firstName, lastName } = req.session.user
        res.render('edit-doctor', { doctor, specialities, hospitalName, hospital_code, site_code, firstName, lastName });
    } catch (err) {
        console.error('Error fetching doctor or specialties:', err);
        req.flash('error', 'An error occurred while fetching the doctor or specialties. Please try again.');
        res.status(500).send('Internal Server Error');
    } finally {
        if (client) {
            await client.close();  // Ensure client.close() is always called
        }
    }
});


// // POST route to update doctor details
// router.post('/edit/:id', async (req, res) => {
//     try {
//         // Extract and sanitize input fields
//         const firstName = req.body.firstName.trim();
//         const lastName = req.body.lastName.trim();
//         const speciality = req.body.speciality;
//         const isLocked = req.body.isLocked;
//         const resetPassword = req.body.resetPassword;

//         const hospital_code = req.session.user.hospital_code;
//         const site_code = req.session.user.site_code; // Get site_code from session

//         const existingDoctor = await Doctor.findById(req.params.id);
//         let newPassword = existingDoctor.password; // Default to the encrypted password

//         // Generate the base username (without numeric suffix)
//         let baseUsername = `${site_code.toLowerCase()}_${firstName.charAt(0).toLowerCase()}${lastName.split(' ')[0].toLowerCase()}`;
//         let username = baseUsername;

//         // Check across doctors, staff, and users collections for existing usernames
//         const existingDoctors = await Doctor.find({ username: { $regex: `^${baseUsername}(\\d{2})?$` }, _id: { $ne: req.params.id } });
//         const existingStaffs = await Staff.find({ username: { $regex: `^${baseUsername}(\\d{2})?$` } });
//         const existingUsers = await User.find({ username: { $regex: `^${baseUsername}(\\d{2})?$` } });

//         if (existingDoctors.length > 0 || existingStaffs.length > 0 || existingUsers.length > 0) {
//             // Extract numeric suffixes and find the highest number
//             let maxSuffix = 0;
//             [...existingDoctors, ...existingStaffs, ...existingUsers].forEach(record => {
//                 const suffixMatch = record.username.match(/(\d{2})$/);
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

//         // Prepare the update data
//         const updateData = {
//             firstName,
//             lastName,
//             username, // Update with new username
//             speciality,
//             hospital_code, // Include hospital_code in the update
//             site_code, // Include site_code in the update
//             isLocked: isLocked === 'true',
//             passwordChangedByAdmin: false
//         };

//         // If reset password is requested
//         if (resetPassword === 'true') {
//             const randomNum = Math.floor(Math.random() * 90000) + 10000; // Generate a 5-digit random number
//             newPassword = `${site_code}_${firstName.charAt(0).toLowerCase()}${randomNum}`; // Use site_code for new password
//             const encryptedPassword = encrypt(newPassword); // Encrypt the password using AES-256
//             updateData.password = encryptedPassword;
//             updateData.isLocked = false;
//             updateData.failedLogins = 0;
//             updateData.lastLogin = null;
//             updateData.passwordChangedByAdmin = true; // Mark password as changed by admin
//         }

//         // Update the doctor's information
//         await Doctor.findByIdAndUpdate(req.params.id, updateData);

//         req.flash('success', 'Doctor updated successfully');

//         // Store credentials in session for display
//         req.session.adminCredentials = {
//             username: username,
//             ...(resetPassword === 'true' && { password: newPassword }) // Include password only if reset
//         };

//         // Redirect to the manage doctors page
//         res.redirect(basePath);

//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Server Error');
//     }
// });

// router.post('/edit/:id', async (req, res) => {
//     try {
//         const firstName = req.body.firstName.trim();
//         const lastName = req.body.lastName.trim();
//         const speciality = req.body.speciality;
//         const isLocked = req.body.isLocked;
//         const resetPassword = req.body.resetPassword;

//         const hospital_code = req.session.user.hospital_code;
//         const site_code = req.session.user.site_code;

//         const existingDoctor = await Doctor.findById(req.params.id);
//         let newPassword = existingDoctor.password;

//         let cleanFirstName = firstName.split(' ')[0].toLowerCase();
//         let cleanLastName = lastName.split(' ')[0].toLowerCase();
//         let baseUsername = `${cleanFirstName}.${cleanLastName}.${site_code.toLowerCase()}`;
//         let username = baseUsername;

//         let isDuplicate = await Doctor.exists({ username: username, _id: { $ne: req.params.id } }) ||
//                           await Staff.exists({ username: username }) ||
//                           await User.exists({ username: username });

//         if (isDuplicate) {
//             let suffix = 2;
//             while (true) {
//                 let newUsername = `${cleanFirstName}.${cleanLastName}${suffix}.${site_code.toLowerCase()}`;
//                 let exists = await Doctor.exists({ username: newUsername, _id: { $ne: req.params.id } }) ||
//                              await Staff.exists({ username: newUsername }) ||
//                              await User.exists({ username: newUsername });
//                 if (!exists) {
//                     username = newUsername;
//                     break;
//                 }
//                 suffix++;
//             }
//         }

//         const updateData = {
//             firstName,
//             lastName,
//             username,
//             speciality,
//             hospital_code,
//             site_code,
//             isLocked: isLocked === 'true',
//             passwordChangedByAdmin: false
//         };

//         if (resetPassword === 'true') {
//             const randomNum = Math.floor(Math.random() * 90000) + 10000;
//             newPassword = `${site_code}_${firstName.charAt(0).toLowerCase()}@${randomNum}`;
//             const encryptedPassword = encrypt(newPassword);
//             updateData.password = encryptedPassword;
//             updateData.isLocked = false;
//             updateData.failedLogins = 0;
//             updateData.lastLogin = null;
//             updateData.passwordChangedByAdmin = true;
//         }

//         await Doctor.findByIdAndUpdate(req.params.id, updateData);

//         req.flash('success', 'Doctor updated successfully');

//         req.session.adminCredentials = {
//             username: username,
//             ...(resetPassword === 'true' && { password: newPassword })
//         };

//         res.redirect(basePath);
//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Server Error');
//     }
// });


router.post('/edit/:id', async (req, res) => {
    try {
        const firstName = req.body.firstName.trim();
        const lastName = req.body.lastName.trim();
        const speciality = req.body.speciality;
        const isLocked = req.body.isLocked;
        const resetPassword = req.body.resetPassword;

        const hospital_code = req.session.user.hospital_code;
        const site_code = req.session.user.site_code;

        const existingDoctor = await Doctor.findById(req.params.id);
        let newPassword = existingDoctor.password;

        // Clean up names to create consistent username format
        let cleanFirstName = firstName.split(' ')[0].toLowerCase();
        let cleanLastName = lastName.split(' ')[0].toLowerCase();
        let baseUsername = `${cleanFirstName}.${cleanLastName}.${site_code.toLowerCase()}`;
        let username = baseUsername;

        // Check for duplicate usernames
        let isDuplicate = await Doctor.exists({ username: username, _id: { $ne: req.params.id } }) ||
                          await Staff.exists({ username: username }) ||
                          await User.exists({ username: username });

        // Handle duplicate usernames by adding a suffix
        if (isDuplicate) {
            let suffix = 2;
            while (true) {
                let newUsername = `${cleanFirstName}.${cleanLastName}${suffix}.${site_code.toLowerCase()}`;
                let exists = await Doctor.exists({ username: newUsername, _id: { $ne: req.params.id } }) ||
                             await Staff.exists({ username: newUsername }) ||
                             await User.exists({ username: newUsername });
                if (!exists) {
                    username = newUsername;
                    break;
                }
                suffix++;
            }
        }

        // Create the update data object
        const updateData = {
            firstName,
            lastName,
            username,
            doctor_id: username, // Update doctor_id to match username
            speciality,
            hospital_code,
            site_code,
            isLocked: isLocked === 'true',
            passwordChangedByAdmin: false
        };

        // Handle password reset if requested
        if (resetPassword === 'true') {
            const randomNum = Math.floor(Math.random() * 90000) + 10000;
            newPassword = `${site_code}_${firstName.charAt(0).toLowerCase()}@${randomNum}`;
            const encryptedPassword = encrypt(newPassword);
            updateData.password = encryptedPassword;
            updateData.isLocked = false;
            updateData.failedLogins = 0;
            updateData.lastLogin = null;
            updateData.passwordChangedByAdmin = true;
        }

        // Update the doctor record
        await Doctor.findByIdAndUpdate(req.params.id, updateData);

        req.flash('success', 'Doctor updated successfully');

        // Store credentials in session for display
        req.session.adminCredentials = {
            username: username,
            ...(resetPassword === 'true' && { password: newPassword })
        };

        res.redirect(basePath);
    } catch (err) {
        console.error(err);
        req.flash('error', 'An error occurred while updating the doctor');
        res.status(500).send('Server Error');
    }
});



// // POST route to add a new doctor
// router.post('/', async (req, res) => {
//     let client;  // Define client outside of try block
//     try {
       
//         const firstName = req.body.firstName.trim();
//         const lastName = req.body.lastName.trim();
//         const speciality = req.body.speciality;

//         const hospital_code = req.session.user.hospital_code.toUpperCase();
//         const site_code = req.session.user.site_code;
//         const hospitalName = req.session.user.hospitalName; // Pull hospitalName from session

        
//         // let baseUsername = `${site_code.toLowerCase()}_${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}`;

//         let baseUsername = `${site_code.toLowerCase()}_${firstName.charAt(0).toLowerCase()}${lastName.split(' ')[0].toLowerCase()}`;

        
//         let username = baseUsername;

//         // Check across doctors, staff, and users collections for existing usernames
//         const existingDoctors = await Doctor.find({ username: { $regex: `^${baseUsername}(\\d{2})?$` } });
//         const existingStaffs = await Staff.find({ username: { $regex: `^${baseUsername}(\\d{2})?$` } });
//         const existingUsers = await User.find({ username: { $regex: `^${baseUsername}(\\d{2})?$` } });

//         if (existingDoctors.length > 0 || existingStaffs.length > 0 || existingUsers.length > 0) {
//             // Extract numeric suffixes and find the highest number
//             let maxSuffix = 0;
//             [...existingDoctors, ...existingStaffs, ...existingUsers].forEach(record => {
//                 const suffixMatch = record.username.match(/(\d{2})$/);
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

        
        
        

//         const doctor_id = `${site_code.toLowerCase()}_${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}`;
//         const randomNum = Math.floor(Math.random() * 90000) + 10000;
//         const password = `${site_code}_${firstName.charAt(0).toLowerCase()}${randomNum}`;

//         // Encrypt the password using AES-256
//         const encryptedPassword = encrypt(password);
//         const encryptedDoctorusername = encrypt(username)

//         const newDoctor = new Doctor({ 
//             firstName, 
//             lastName, 
//             username, 
//             doctor_id,
//             password: encryptedPassword,  // Store encrypted password
//             speciality, 
//             hashedusername:encryptedDoctorusername,
//             hospital_code,  
//             site_code,
//             hospitalName, // Store hospitalName from session
//             loginCounter: 0,  
//             failedLogins: 0,  
//             lastLogin: null,  
//             isLocked: false   
//         });

//         await newDoctor.save();
//         // req.flash('success', 'Doctor added successfully');
//         // res.redirect(`${basePath}?username=${username}&password=${password}&doctor_id=${doctor_id}`);
//         req.session.adminCredentials = { username, password };
//     res.redirect(`${basePath}`);

//     } catch (err) {
//         console.error(err);
//         res.status(500).send('Server Error');
//     } finally {
//         if (client) {
//             await client.close();  // Ensure client.close() is always called
//         }
//     }
// });

router.post('/', async (req, res) => {
    let client;
    try {
        const firstName = req.body.firstName.trim();
        const lastName = req.body.lastName.trim();
        const speciality = req.body.speciality;

        const hospital_code = req.session.user.hospital_code.toUpperCase();
        const site_code = req.session.user.site_code;
        const hospitalName = req.session.user.hospitalName;

        // Generate username based on the updated format
        let cleanFirstName = firstName.split(' ')[0].toLowerCase();
        let cleanLastName = lastName.split(' ')[0].toLowerCase();
        let baseUsername = `${cleanFirstName}.${cleanLastName}.${site_code.toLowerCase()}`;
        let username = baseUsername;

        // Check across doctors, staff, and users collections for existing usernames
        let isDuplicate = await Doctor.exists({ username: username }) ||
                          await Staff.exists({ username: username }) ||
                          await User.exists({ username: username });

        if (isDuplicate) {
            let suffix = 2; // Start numbering from 2 if duplicate exists
            while (true) {
                let newUsername = `${cleanFirstName}.${cleanLastName}${suffix}.${site_code.toLowerCase()}`;
                let exists = await Doctor.exists({ username: newUsername }) ||
                             await Staff.exists({ username: newUsername }) ||
                             await User.exists({ username: newUsername });
                if (!exists) {
                    username = newUsername; // Found a unique username
                    break;
                }
                suffix++;
            }
        }

        const doctor_id = username;
        const randomNum = Math.floor(Math.random() * 90000) + 10000;
        const password = `${site_code}_${firstName.charAt(0).toLowerCase()}@${randomNum}`;

        // Encrypt the password using AES-256
        const encryptedPassword = encrypt(password);
        const encryptedDoctorUsername = encrypt(username);

        const newDoctor = new Doctor({
            firstName,
            lastName,
            username,
            doctor_id,
            password: encryptedPassword,
            speciality,
            hashedusername: encryptedDoctorUsername,
            hospital_code,
            site_code,
            hospitalName,
            loginCounter: 0,
            failedLogins: 0,
            lastLogin: null,
            isLocked: false
        });

        await newDoctor.save();
        req.session.adminCredentials = { username, password };
        res.redirect(`${basePath}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    } finally {
        if (client) {
            await client.close();
        }
    }
});


module.exports = router;
