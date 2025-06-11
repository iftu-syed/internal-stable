require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const fs = require('fs');
const cors = require('cors');
const yaml = require('js-yaml');
const app = express();
const PORT = 3005;

app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.sendStatus(200);
  });
// Allow two origins for Swagger UI and local development
const allowedOrigins = ['http://localhost:3005', 'http://localhost/staff/api/v1'];

const corsOptions = {
  origin: (origin, callback) => {
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
};

app.use(cors(corsOptions));

// Middleware setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
const swaggerDocument = yaml.load(fs.readFileSync('./swagger.yaml', 'utf8'));

// Serve Swagger UI at /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// MongoDB setup
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.log(err));

// Schema and Model
const clientSchema = new mongoose.Schema({
    clientId: String,
    clientSecret: String, // Store hashed clientSecret
    name: String, // Optional: client name or description
});

const tokenSchema = new mongoose.Schema({
    clientId: String,
    accessToken: String,
    refreshToken: String,
    expiresAt: Date,
    refreshExpiresAt: Date
});

const Client = mongoose.model('Client', clientSchema);
const Token = mongoose.model('Token', tokenSchema);

// Routes
// Render form to create client credentials
app.get('/', (req, res) => {
    res.render('clientToken');
});

// Handle client creation
app.post('/create-client', async (req, res) => {
    const { name } = req.body;
    const clientId = uuidv4();
    const clientSecret = uuidv4(); // Generate UUID for clientSecret

    const hashedSecret = await bcrypt.hash(clientSecret, 10);

    const client = new Client({ clientId, clientSecret: hashedSecret, name });
    await client.save();

    res.send(`Client created!<br>Client ID: ${clientId}<br>Client Secret: ${clientSecret}`);
});

// Authenticate and generate token
app.post('/token', async (req, res) => {
    const { clientId, clientSecret } = req.body;

    const client = await Client.findOne({ clientId });
    if (!client || !await bcrypt.compare(clientSecret, client.clientSecret)) {
        return res.status(401).json({ error: 'Invalid client credentials' });
    }

    const accessToken = jwt.sign({ clientId }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign({ clientId }, process.env.JWT_SECRET, { expiresIn: '30d' });

    const token = new Token({
        clientId,
        accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // Access token expiration (1 hour)
        refreshExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Refresh token expiration (30 days)
    });

    await token.save();
    res.json({
        accessToken,
        refreshToken,
        expiresIn: 3600,  // 1 hour
        refreshExpiresIn: 30 * 24 * 60 * 60 // 30 days
    });
});

// Refresh access token using the refresh token
app.post('/refresh-token', async (req, res) => {
    const { clientId, refreshToken } = req.body;

    const tokenRecord = await Token.findOne({ clientId, refreshToken });
    if (!tokenRecord) {
        return res.status(401).json({ error: 'Invalid refresh token' });
    }

    try {
        if (new Date() > tokenRecord.refreshExpiresAt) {
            return res.status(401).json({ error: 'Refresh token has expired, Please log in again to obtain new tokens.' });
        }

        jwt.verify(refreshToken, process.env.JWT_SECRET);

        const newAccessToken = jwt.sign({ clientId }, process.env.JWT_SECRET, { expiresIn: '1h' });
        const newRefreshToken = jwt.sign({ clientId }, process.env.JWT_SECRET, { expiresIn: '30d' });

        tokenRecord.accessToken = newAccessToken;
        tokenRecord.refreshToken = newRefreshToken;
        tokenRecord.expiresAt = new Date(Date.now() + 60 * 60 * 1000); // New access token expiration
        tokenRecord.refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // New refresh token expiration

        await tokenRecord.save();

        res.json({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            expiresIn: 3600,  // 1 hour
            refreshExpiresIn: 30 * 24 * 60 * 60 // 30 days
        });
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
});

// Validate token
app.get('/validate', async (req, res) => {
    const { accessToken } = req.query;

    try {
        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
        const token = await Token.findOne({ accessToken });

        if (!token || new Date() > token.expiresAt) {
            return res.status(401).json({ valid: false, error: 'Token expired or invalid' });
        }

        res.json({ valid: true, clientId: decoded.clientId });
    } catch (err) {
        res.status(401).json({ valid: false, error: 'Invalid token' });
    }
});

app.get('/api-guide', (req, res) => {
    res.render('apiGuide');
});

// Start server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
