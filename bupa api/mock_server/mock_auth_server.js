const { logToApp } = require('./logger');
// mock_auth_server.js  
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const app = express();
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

// Create a write stream for the access log
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'logs', 'access.log'), { flags: 'a' });

const PORT = 3006; // Port for our mock server

// --- Configuration (normally this would be stored securely) ---
const MOCK_CLIENT_ID = 'test_client_id_123';
const MOCK_CLIENT_SECRET = 'super_secret_key_shhh'; // Used to validate signature & sign JWTs
const JWT_ACCESS_TOKEN_SECRET = MOCK_CLIENT_SECRET; // For simplicity, use same secret for JWT signing
const JWT_REFRESH_TOKEN_SECRET = 'another_super_secret_for_refresh';

const ACCESS_TOKEN_EXPIRES_IN = 15 * 60;
const REFRESH_TOKEN_EXPIRES_IN = 60 * 60;

// In-memory store for valid refresh tokens (for simplicity in this mock)
// In a real app, this would be a persistent database
const validRefreshTokens = new Set();

app.use(bodyParser.json()); // To parse JSON bodies
app.use(bodyParser.text()); // To parse raw text bodies if Authorization header is sent as plain string

// --- Helper Functions ---
function generateSignature(timestamp, secret) {
    return crypto.createHash('sha256').update(timestamp + secret).digest('hex');
}

function generateTokens(clientId) {
    const accessTokenPayload = { clientId: clientId, type: 'access', sub: 'user_or_client_identifier' };
    const accessToken = jwt.sign(accessTokenPayload, JWT_ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });

    const refreshTokenPayload = { clientId: clientId, type: 'refresh', sub: 'user_or_client_identifier' };
    const refreshToken = jwt.sign(refreshTokenPayload, JWT_REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
    
    validRefreshTokens.add(refreshToken); // Store valid refresh token

    return {
        access_token: accessToken,
        access_token_expires_in: ACCESS_TOKEN_EXPIRES_IN.toString(),
        refresh_token: refreshToken,
        refresh_token_expires_in: REFRESH_TOKEN_EXPIRES_IN.toString(),
    };
}

// --- Token Endpoints ---

// 1. GET JWT TOKEN
app.get('/services/fetch_jwt_token', (req, res) => {
    console.log('\n--- Received request for /services/fetch_jwt_token ---');
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        console.error('Authorization header missing');
        return res.status(400).json({ code: 400, message: 'Authorization header missing' });
    }

    let authData;
    try {
        authData = JSON.parse(authHeader);
        console.log('Parsed Authorization Header:', authData);
    } catch (e) {
        console.error('Invalid Authorization header format (not JSON):', authHeader);
        return res.status(400).json({ code: 400, message: 'Invalid Authorization header format. Expected JSON.' });
    }

    const { clientId, signature, timestamp } = authData;

    if (!clientId || !signature || !timestamp) {
        console.error('Missing clientId, signature, or timestamp in Authorization header');
        return res.status(400).json({ code: 400, message: 'Missing clientId, signature, or timestamp' });
    }

    // Validate clientId
    if (clientId !== MOCK_CLIENT_ID) {
        console.error(`Invalid clientId: ${clientId}. Expected: ${MOCK_CLIENT_ID}`);
        return res.status(401).json({ code: 401, message: 'Invalid clientId' });
    }

    // Validate signature
    const expectedSignature = generateSignature(timestamp.toString(), MOCK_CLIENT_SECRET);
    console.log(`Received Signature: ${signature}`);
    console.log(`Expected Signature: ${expectedSignature}`);
    console.log(`Timestamp used for expected signature: ${timestamp}`);


    // --- Timestamp validation (optional but good practice) ---
    const requestTimestamp = parseInt(timestamp, 10);
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const FIVE_MINUTES = 5 * 60;

    if (Math.abs(currentTimestamp - requestTimestamp) > FIVE_MINUTES) {
        console.error('Timestamp is too old or too far in the future.');
        // Note: The client's example timestamp "1726124042" is for Sep 12 2024.
        // For local testing, ensure your client sends a current timestamp.
        // We'll be more lenient here for simple testing, but in production, this check is vital.
        // return res.status(401).json({ code: 401, message: 'Timestamp out of valid range.' });
    }
    // --- End Timestamp validation ---


    if (signature !== expectedSignature) {
        console.error('Invalid signature');
        return res.status(401).json({ code: 401, message: 'Invalid signature' });
    }

    // If all checks pass, issue tokens
    const tokens = generateTokens(clientId);
    console.log('Successfully validated. Issuing tokens:', tokens);
    res.status(200).json({
        code: 200,
        data: tokens,
    });
});

// 2. REFRESH ACCESS TOKEN
app.get('/services/refresh_access_token', (req, res) => {
    console.log('\n--- Received request for /services/refresh_access_token ---');
    const providedRefreshToken = req.headers.authorization; // As per client spec, refresh token is directly in Auth header

    if (!providedRefreshToken) {
        console.error('Authorization header (refresh token) missing');
        return res.status(400).json({ code: 400, message: 'Refresh token missing in Authorization header' });
    }
    console.log('Received Refresh Token in Auth Header:', providedRefreshToken);

    // Check if this refresh token is one we issued and consider valid
    if (!validRefreshTokens.has(providedRefreshToken)) {
        console.error('Invalid or expired refresh token provided.');
        return res.status(401).json({ code: 401, message: 'Invalid or expired refresh token.' });
    }
    
    try {
        // Verify the refresh token itself (optional if just checking against the set, but good for checking expiry)
        const decoded = jwt.verify(providedRefreshToken, JWT_REFRESH_TOKEN_SECRET);
        console.log('Refresh token successfully verified. Decoded:', decoded);

        // Issue new set of tokens
        const tokens = generateTokens(decoded.clientId);
        
        // Invalidate the old refresh token (important for security)
        validRefreshTokens.delete(providedRefreshToken);
        console.log('Old refresh token invalidated. Issuing new tokens:', tokens);

        res.status(200).json({
            code: 200,
            data: tokens,
        });

    } catch (err) {
        console.error('Refresh token verification failed:', err.message);
        validRefreshTokens.delete(providedRefreshToken); // Remove if verification fails (e.g. expired)
        return res.status(401).json({ code: 401, message: `Refresh token error: ${err.message}` });
    }
});


// --- Protected Resource Endpoint ---
// This endpoint requires a valid access token
app.post('/api/my_protected_data', (req, res) => {
    console.log('\n--- Received request for /api/my_protected_data ---');
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.error('Authorization header missing or not Bearer type');
        return res.status(401).json({ code: 401, message: 'Unauthorized: Missing or invalid Bearer token' });
    }

    const token = authHeader.split(' ')[1];
    console.log('Received Access Token:', token);

    try {
        const decoded = jwt.verify(token, JWT_ACCESS_TOKEN_SECRET); // Verify using the same secret used to sign
        console.log('Access token successfully verified. Decoded:', decoded);

        // Token is valid, process the request
        const requestInput = req.body;
        console.log('Request Input to protected resource:', requestInput);

        res.status(200).json({
            code: 200,
            message: 'Hi, I have received your request input.',
            received_input: requestInput,
            token_payload: decoded
        });
    } catch (err) {
        console.error('Access token verification failed:', err.message);
        res.status(401).json({ code: 401, message: `Unauthorized: ${err.message}` });
    }
});


function verifyMockAccessToken(req, res, next) {
    console.log('\n--- Verifying access token for protected route ---');
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.error('Authorization header missing or not Bearer type');
        return res.status(401).json({ code: 401, message: 'Unauthorized: Missing or invalid Bearer token' });
    }

    const token = authHeader.split(' ')[1];
    console.log('Received Access Token:', token);

    try {
        // Ensure JWT_ACCESS_TOKEN_SECRET is defined (it should be from your existing code)
        const decoded = jwt.verify(token, JWT_ACCESS_TOKEN_SECRET);
        console.log('Access token successfully verified. Decoded:', decoded);
        req.user = decoded; // Attach decoded payload to request if needed
        next(); // Proceed to the route handler
    } catch (err) {
        console.error('Access token verification failed:', err.message);
        return res.status(401).json({ code: 401, message: `Unauthorized: ${err.message}` });
    }
}


// --- New Protected Endpoint to Receive Appointment Data ---
app.post('/api/v1/external_appointment_data', verifyMockAccessToken, (req, res) => {
    console.log('\n--- Received request for /api/v1/external_appointment_data ---');
    const receivedData = req.body;

    console.log('Authenticated Client ID:', req.user.clientId); // From the token
    console.log('Received Appointment Data Payload:', JSON.stringify(receivedData, null, 2));

    // TODO: Here you would typically:
    // 1. Validate the receivedData payload structure.
    // 2. Process the data (e.g., store it in a mock database, log it, etc.).

    // For now, just acknowledge receipt
    res.status(200).json({
        code: 200,
        message: 'Appointment data received successfully by mock server.',
        data_received: receivedData // Echo back the data for confirmation
    });
});



app.use(morgan('combined', { stream: accessLogStream }));
// Define a simple route for testing
app.get('/', (req, res) => {
  res.send('Welcome to the Mock Auth Server!');
});


app.listen(PORT, () => {
  console.log(`Mock Auth Server running on http://localhost:${PORT}`);
  console.log(`Client ID: ${MOCK_CLIENT_ID}`);
  console.log(`Client Secret: ${MOCK_CLIENT_SECRET}`);
  console.log(`Endpoints:`);
  console.log(` GET /services/fetch_jwt_token`);
  console.log(` POST /services/refresh_access_token`);
  console.log(` POST /api/my_protected_data (requires Bearer token)`);
  console.log(`POST /api/v1/external_appointment_data`);

  // Now, just log to the app log file as well
  logToApp(`Server is running on port ${PORT}`);
  console.log(`Server started at http://localhost:${PORT}`);
});
