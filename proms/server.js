//This is after ngnix conf

const express = require('express');
const { exec } = require('child_process');
const http = require('http');
const path = require('path');
require('dotenv').config();  // Load environment variables from .env

const app = express();
const PORT = process.env.PORT || 3000;  // Use the PORT from .env or default to 3000
const BASE_URL = process.env.BASE_URL;

// Define the base path for /proms
const basePath = '/proms';
app.locals.basePath = basePath;

// Create an Express Router
const router = express.Router();

// Start servers defined in other files
const startServer2 = require('./API_DATA_ENTRY/index');
const startServer3 = require('./common_login/server');
// const startDoctorDashboardServer = require('./doctors_dashboard_analytics/server');
// const startServer4 = require('./Doctor_Login_Page/app');

startServer2();
startServer3();
// startDoctorDashboardServer();
// startServer4();

// Static file serving under /proms
router.use(express.static(path.join(__dirname, 'public')));
router.use(express.urlencoded({ extended: true }));

// Routes under the router
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

router.get('/index1.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index1.html'));
});

// Redirect to API_DATA_ENTRY service using port from .env
router.get('/API_DATA_ENTRY/index.js', (req, res) => {
    res.redirect(`${BASE_URL}/staff`);
});

// Redirect to Doctor_Login_Page service using port from .env
router.get('/Doctor_Login_Page/app.js', (req, res) => {
    res.redirect(`${BASE_URL}:${process.env.DOCTOR_LOGIN_PAGE_PORT}/`);
});


// Mount the router at /proms base path
app.use(basePath, router);

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on ${BASE_URL}${basePath}`);
});
