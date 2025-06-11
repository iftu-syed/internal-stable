// const mongoose = require('mongoose');
// const staffSchema = new mongoose.Schema({
//     firstName: String,
//     lastName: String,
//     username: String,
//     password: String,
//     speciality: String,
//     hospital_code: String,
//     site_code: String,
//     hospitalName: String, 
//     loginCounter: { type: Number, default: 0 } // Add this line
// });


// const Staff = mongoose.model('Staff', staffSchema);
// module.exports = Staff;



const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    username: String,
    password: String,
    speciality: String,
    hospital_code: String,
    site_code: String,
    hospitalName: String,
    loginCounter: { type: Number, default: 0 },
    failedLogins: { type: Number, default: 0 },
    lastLogin: { type: Date, default: Date.now },
    isLocked: { type: Boolean, default: false },
    passwordChangedByAdmin: { type: Boolean, default: false }
});

const Staff = mongoose.model('Staff', staffSchema);
module.exports = Staff;
