//This code is after the ningix configuration


const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const session = require('express-session');
const flash = require('connect-flash');
const crypto = require('crypto'); // Add crypto module for encryption

// Use environment variables
const uri = process.env.DB_URI;
const dbName = process.env.DB_NAME;
const encryptionKey = process.env.ENCRYPTION_KEY; // Use encryption key from .env
const RedirectUrl =process.env.REDIRECT_URL;

const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

let db;

// Function to connect to MongoDB
async function connectToDatabase() {
  if (db) return db; // Return the existing connection if available
  try {
    const client = new MongoClient(uri, options);
    await client.connect();
    console.log("Connected successfully to server");
    db = client.db(dbName);
    return db;
  } catch (err) {
    console.error("Error connecting to database:", err);
    throw err;
  }
}

// Encryption function for passwords (AES-256-CBC)
const encrypt = (text) => {
  const iv = crypto.randomBytes(16); // Generate random IV
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex'); // Store IV along with the encrypted password
};

// Decryption function (if needed for password comparison)
const decrypt = (text) => {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(encryptionKey), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};

router.use(bodyParser.urlencoded({ extended: true }));


router.get('/:hashMrNo', async (req, res) => {
  const { hashMrNo } = req.params;
  // const { dob } = req.query; // DOB is not strictly needed here if hashMrNo is unique and sufficient

  console.log('Received hashMrNo for form display:', hashMrNo);

  try {
    const db = await connectToDatabase();
    const collection = db.collection('patient_data');

    const patient = await collection.findOne({
      hashedMrNo: hashMrNo,
    });

    if (!patient) {
      console.log('Patient not found with hashMrNo:', hashMrNo);
      req.flash('error', 'Patient details not found. Please try again.');
      return res.redirect('/patientpassword');
    }

    console.log('Patient found for form display:', patient.Mr_no);
    // Pass both Mr_no (for context if needed, but primarily for DB update)
    // and hashMrNo (for constructing URLs, especially error redirects)
    res.render('form', {
      Mr_no: patient.Mr_no, // The actual Mr_no
      hashMrNo: hashMrNo,   // The identifier used in the URL
      lng: req.language,    // Pass language
      dir: req.dir,       // Pass direction
      // Ensure flash messages are available to the template
      // error: req.flash('error'), // if you pass them individually
      // success: req.flash('success') // if you pass them individually
    });
  } catch (error) {
    console.error('Error fetching patient for form display:', error);
    req.flash('error', 'Internal server error. Please try again.');
    res.redirect('/patientpassword');
  }
});


router.post('/submit', async (req, res) => {
  // Mr_no (actual) and hashMrNo (for URL identifier) will come from hidden fields in the form body
  const { Mr_no, hashMrNo, password, confirmPassword } = req.body;
  const currentLanguage = req.query.lng || req.cookies.lng || 'en';

  // Validate that hashMrNo and Mr_no are present (they should be from the hidden fields)
  if (!hashMrNo || !Mr_no) {
      req.flash('error', 'An error occurred. Missing patient identifier. Please try again.');
      return res.redirect('/patientpassword');
  }

  // Regular expression for password validation
  const passwordPattern = /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;

  if (!passwordPattern.test(password)) {
    req.flash('error', 'Password must contain at least one capital letter, one number, one special character, and be at least 6 characters long.');
    // Redirect back to the form using hashMrNo
    return res.redirect(`/patientpassword/password/${hashMrNo}?lng=${currentLanguage}`);
  }

  if (password !== confirmPassword) {
    req.flash('error', 'Passwords do not match.');
    // Redirect back to the form using hashMrNo
    return res.redirect(`/patientpassword/password/${hashMrNo}?lng=${currentLanguage}`);
  }

  try {
    const db = await connectToDatabase();
    const collection = db.collection('patient_data');

    const encryptedPassword = encrypt(password);

    // Update the patient's password using the actual Mr_no
    const updateResult = await collection.updateOne({ Mr_no: Mr_no }, { $set: { password: encryptedPassword } });

    if (updateResult.matchedCount === 0) {
        req.flash('error', 'Failed to update password. Patient not found with the provided MRN.');
        return res.redirect(`/patientpassword/password/${hashMrNo}?lng=${currentLanguage}`);
    }
    
    req.flash('success', 'Password updated successfully');
    res.redirect(RedirectUrl); // Redirect to a configured URL or a default
  } catch (error) {
    console.error('Error updating password:', error);
    req.flash('error', 'Internal server error during password update.');
    // Redirect back to the form using hashMrNo
    res.redirect(`/patientpassword/password/${hashMrNo}?lng=${currentLanguage}`);
  }
});


module.exports = router;
