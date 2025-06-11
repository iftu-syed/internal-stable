const mongoose = require('mongoose');

// Create a new connection specifically for the `adminUser` database
const adminUserConnection = mongoose.createConnection(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Define the User schema
const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    hospital_code: { type: String, required: true },
    hospitalName: { type: String },
    siteCode: { type: String, required: true },
    siteName: { type: String },
    subscription: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    loginCounter: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Middleware to update the `updatedAt` field on save
userSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Create the User model using the `adminUserConnection`
const User = adminUserConnection.model('User', userSchema);

// Export the model
module.exports = User;
