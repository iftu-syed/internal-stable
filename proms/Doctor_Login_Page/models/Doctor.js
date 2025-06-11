const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  name: String,
  username: String,
  password: String,
  speciality: String
});

const Doctor = mongoose.model('Doctor', doctorSchema);

module.exports = Doctor;
