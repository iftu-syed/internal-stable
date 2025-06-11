const express = require('express');
const path = require('path');
const cors_proxy = require('cors-anywhere');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();
const host = 'localhost';
const port = 8080;

// MongoDB connection for Data_Entry_Incoming database
const dataEntryDB = mongoose.createConnection('mongodb+srv://admin:admin@mydevopsdb.5hmumeq.mongodb.net/Data_Entry_Incoming', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// MongoDB connection for manage_doctors database
const manageDoctorsDB = mongoose.createConnection('mongodb+srv://admin:admin@mydevopsdb.5hmumeq.mongodb.net/manage_doctors', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

dataEntryDB.on('error', console.error.bind(console, 'connection error:'));
dataEntryDB.once('open', function () {
    console.log('Connected to Data_Entry_Incoming MongoDB');
});

manageDoctorsDB.on('error', console.error.bind(console, 'connection error:'));
manageDoctorsDB.once('open', function () {
    console.log('Connected to manage_doctors MongoDB');
});

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// Function to find the API Object IDs for a given mr_no
async function findApiObjectId(mr_no) {
    try {
        // Step 1: Fetch patient data from patient_data collection
        let patientDoc = await dataEntryDB.collection('patient_data').findOne({ Mr_no: mr_no.toString() });

        if (!patientDoc) {
            console.error(`Patient not found for Mr_no: ${mr_no}`);
            return [];
        }

        console.log(`Patient document found for Mr_no ${mr_no}:`, patientDoc);

        // Step 2: Access the fields correctly (assuming the first speciality is the target)
        const specialty = patientDoc.speciality;
        const hospital_code = patientDoc.hospital_code;
        const site_code = patientDoc.site_code;

        // Log extracted data to ensure they are not undefined
        console.log(`Extracted speciality: ${specialty}, hospital_code: ${hospital_code}, site_code: ${site_code}`);

        if (!specialty || !hospital_code || !site_code) {
            console.error('One or more fields are missing (speciality, hospital_code, site_code).');
            return [];
        }

        // Step 3: Find matching API object in the surveys collection of the manage_doctors database
        let surveyRecord = await manageDoctorsDB.collection('surveys').findOne({
            specialty: { $regex: new RegExp(specialty, 'i') }, // Case-insensitive match for specialty
            hospital_code: { $regex: new RegExp(hospital_code, 'i') }, // Case-insensitive match for hospital_code
            site_code: { $regex: new RegExp(site_code, 'i') } // Case-insensitive match for site_code
        });

        if (!surveyRecord || !surveyRecord.API) {
            console.error(`Survey record or API not found for specialty: ${specialty}, hospital_code: ${hospital_code}, site_code: ${site_code}`);
            return [];
        }

        console.log('Survey record found:', surveyRecord);

        // Step 4: Return the API object IDs
        const apiObjectIds = surveyRecord.API.map(api => api.id); // Fetch all ids from API array
        console.log(`API Object IDs for Mr_no ${mr_no}:`, apiObjectIds);

        return apiObjectIds;
    } catch (error) {
        console.error(`Error fetching API Object ID for Mr_no: ${mr_no}`, error);
        return [];
    }
}

// Route to serve index.html at the root route
app.get('/', (req, res) => {
    const mr_no = req.query.mr_no; // Get mr_no from query parameters

    // Read the index.html file
    fs.readFile(path.join(__dirname, 'index.html'), 'utf8', (err, data) => {
        if (err) {
            res.status(500).send('Error reading index.html file');
            return;
        }

        res.send(data); // Send the original HTML file
    });
});

// Route to fetch API Object IDs dynamically based on Mr_no
app.get('/getApiObjectIds', async (req, res) => {
    const { mr_no } = req.query;

    try {
        const apiObjectIds = await findApiObjectId(mr_no);

        if (apiObjectIds.length > 0) {
            res.json({ success: true, apiObjectIds });
        } else {
            res.status(404).json({ success: false, message: 'No API Object IDs found for this Mr_no.' });
        }
    } catch (error) {
        console.error(`Error fetching API Object ID for Mr_no: ${mr_no}`, error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Route to handle storing scores
app.post('/storeScore', async (req, res) => {
    try {
        const { Mr_no, formID, assessmentID, scoreDetails } = req.body;
        const timestamp = new Date();

        // Find the document by Mr_no
        let patientDoc = await dataEntryDB.collection('patient_data').findOne({ Mr_no: Mr_no });

        if (patientDoc) {
            // If the document exists, update it by adding a new assessment under the corresponding formID
            if (!patientDoc.FORM_ID) {
                patientDoc.FORM_ID = {};
            }

            if (!patientDoc.FORM_ID[formID]) {
                patientDoc.FORM_ID[formID] = { assessments: [] };
            }

            patientDoc.FORM_ID[formID].assessments.push({
                assessmentID: assessmentID,
                scoreDetails: scoreDetails,
                timestamp: timestamp
            });

            await dataEntryDB.collection('patient_data').updateOne(
                { Mr_no: Mr_no },
                { $set: { FORM_ID: patientDoc.FORM_ID } }
            );
        } else {
            // Handle case where Mr_no does not exist
            res.status(404).send('Mr_no not found');
            return;
        }

        res.send('Score stored successfully');
    } catch (err) {
        console.error('Error saving score: ', err);
        res.status(500).send('Error saving score');
    }
});

// Start the CORS Anywhere proxy
cors_proxy.createServer({
    originWhitelist: [], // Allow all origins
    requireHeader: ['origin', 'x-requested-with'],
    removeHeaders: ['cookie', 'cookie2']
}).listen(port + 1, host, function () {
    console.log('Running CORS Anywhere on ' + host + ':' + (port + 1));
});

app.post('/updateFinalStatus', async (req, res) => {
    try {
        const { Mr_no } = req.body;

        // Update the fields in the database
        await dataEntryDB.collection('patient_data').updateOne(
            { Mr_no: Mr_no },
            { $set: { appointmentFinished: 1, surveyStatus: 'Completed' } }
        );

        res.send('Final status updated successfully');
    } catch (err) {
        console.error('Error updating final status: ', err);
        res.status(500).send('Error updating final status');
    }
});

app.get('/getPatientDOB', async (req, res) => {
    const { Mr_no } = req.query;

    try {
        const patient = await dataEntryDB.collection('patient_data').findOne({ Mr_no: Mr_no });

        if (patient) {
            res.json({ DOB: patient.DOB });
        } else {
            res.status(404).send('Patient not found');
        }
    } catch (error) {
        console.error('Error fetching patient DOB: ', error);
        res.status(500).send('Internal server error');
    }
});

// Start the Express server
app.listen(port, () => {
    console.log(`Server running at http://${host}:${port}/`);
});
