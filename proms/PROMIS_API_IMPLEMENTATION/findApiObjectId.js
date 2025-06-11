const mongoose = require('mongoose');

// MongoDB connection for Data_Entry_Incoming database
const dataEntryDB = mongoose.createConnection('mongodb+srv://admin:admin@mydevopsdb.5hmumeq.mongodb.net/Data_Entry_Incoming', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Create a separate connection for the manage_doctors database
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

async function findApiObjectId(mr_no) {
    try {
        // Step 1: Fetch patient data from patient_data collection
        let patientDoc = await dataEntryDB.collection('patient_data').findOne({ Mr_no: mr_no.toString() });

        if (!patientDoc) {
            console.error(`Patient not found for Mr_no: ${mr_no}`);
            return;
        }

        console.log(`Patient document found for Mr_no ${mr_no}:`, patientDoc);

        // Step 2: Access the fields correctly (assuming the first speciality is the target)
        const specialty = patientDoc.speciality; // Speciality field (use the correct spelling)
        const hospital_code = patientDoc.hospital_code;
        const site_code = patientDoc.site_code;

        // Log extracted data to ensure they are not undefined
        console.log(`Extracted speciality: ${specialty}, hospital_code: ${hospital_code}, site_code: ${site_code}`);

        if (!specialty || !hospital_code || !site_code) {
            console.error('One or more fields are missing (speciality, hospital_code, site_code).');
            return;
        }

        // Step 3: Find matching API object in the surveys collection of the manage_doctors database
        let surveyRecord = await manageDoctorsDB.collection('surveys').findOne({
            specialty: { $regex: new RegExp(specialty, 'i') }, // Case-insensitive match for specialty
            hospital_code: { $regex: new RegExp(hospital_code, 'i') }, // Case-insensitive match for hospital_code
            site_code: { $regex: new RegExp(site_code, 'i') } // Case-insensitive match for site_code
        });

        if (!surveyRecord || !surveyRecord.API) {
            console.error(`Survey record or API not found for specialty: ${specialty}, hospital_code: ${hospital_code}, site_code: ${site_code}`);
            return;
        }

        console.log('Survey record found:', surveyRecord);

        // Step 4: Print the API object id in the console
        const apiObjectId = surveyRecord.API.map(api => api.id); // Fetch all ids from API array
        console.log(`API Object IDs for Mr_no ${mr_no}:`, apiObjectId);

    } catch (error) {
        console.error(`Error fetching API Object ID for Mr_no: ${mr_no}`, error);
    }
}


// You can pass the mr_no as a command line argument
const mr_no = process.argv[2]; // Get Mr_no from command line arguments

if (!mr_no) {
    console.error('Please provide Mr_no as a command line argument.');
    process.exit(1);
}

// Run the function to find the API object ID
findApiObjectId(mr_no);
