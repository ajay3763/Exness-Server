// --- Node.js Server (Cleaned up with External Payloads) ---
const express = require('express');
const crypto = require('crypto');
const cors = require('cors');
const rateLimit = require("express-rate-limit");
const mongoose = require('mongoose');
const path = require('path');

// 🔥 IMPORTING PAYLOADS SEPARATELY 🔥
const SECRET_HTML_PAYLOAD = require('./exness');
const QUOTEX_SECRET_PAYLOAD = require('./qx');

const app = express();

// ✅ Render par Rate Limiter ko sahi dhang se kaam karne ke liye
app.set('trust proxy', 1);
app.use(cors());

// --- Database Connection & Schema ---
const MONGODB_URI = process.env.DATABASE_URL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('MongoDB Atlas Connected Successfully!'))
.catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
});

const licenseSchema = new mongoose.Schema({
    licenseKey: { type: String, required: true, unique: true },
    platform: { type: String, default: 'exness' }, 
    email: { type: String, default: 'user@example.com' },
    mobile: { type: String, default: null },
    telegramId: { type: String, default: null },
    amount: { type: Number, default: null },
    expiryDate: { type: Date, default: () => new Date(new Date().setFullYear(new Date().getFullYear() + 1)) },
    isActive: { type: Boolean, default: true },
    deviceId: { type: String, default: null },
    lastSeen: { type: Date, default: null },
});
const License = mongoose.model('License', licenseSchema);

const PORT = process.env.PORT || 10000;

// --- Middleware ---
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const checkAdminAuth = (req, res, next) => {
    const password = req.headers['x-admin-password'];
    if (password === ADMIN_PASSWORD) {
        next();
    } else {
        res.status(401).json({ message: 'Unauthorized: Incorrect admin password' });
    }
};

const adminLoginLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 5,
    message: { success: false, message: 'Too many login attempts. Please try again after 5 minutes. ⏰' },
    standardHeaders: true,
    legacyHeaders: false,
});


// --- API Routes for Extension ---

// POST /validate-license (EXNESS)
app.post('/validate-license', async (req, res) => {
    try {
        const { licenseKey, deviceId, isRevalidation } = req.body;
        if (!licenseKey || !deviceId) {
            return res.status(400).json({ valid: false, message: 'License key and Device ID are required.' });
        }
        const user = await License.findOne({ licenseKey });
        if (!user) {
            return res.status(404).json({ valid: false, message: 'Invalid license key.' });
        }

        if (user.platform === 'quotex') {
            return res.status(403).json({ valid: false, message: 'Invalid license key.' });
        }

        if (!user.isActive) {
            return res.status(403).json({ valid: false, message: 'This license has been terminated.' });
        }
        const now = new Date();
        if (now > user.expiryDate) {
            return res.status(403).json({ valid: false, message: 'Your license has expired.' });
        }

        // 🔥 STRICT ONE-TIME USE LOGIC
        if (user.deviceId) {
            if (user.deviceId !== deviceId) {
                return res.status(403).json({ valid: false, message: 'This key is already registered to another device.' });
            }
            if (isRevalidation === false) {
                return res.status(403).json({ valid: false, message: 'Invalid or expired key.' });
            }
        } else {
            user.deviceId = deviceId; 
        }

        user.lastSeen = new Date();
        await user.save();
        
        res.json({
            valid: true,
            user: user.email,
            buttonsHTML: SECRET_HTML_PAYLOAD, 
            message: 'License validated successfully.'
        });
    } catch (error) {
        console.error('--- VALIDATION FAILED, ERROR: ---', error);
        res.status(500).json({ valid: false, message: 'An internal server error occurred.' });
    }
});

// POST /validate-quotex-license (QUOTEX)
app.post('/validate-quotex-license', async (req, res) => {
    try {
        const { licenseKey, deviceId, isRevalidation } = req.body;
        if (!licenseKey || !deviceId) {
            return res.status(400).json({ valid: false, message: 'License key and Device ID are required.' });
        }
        const user = await License.findOne({ licenseKey });
        if (!user) {
            return res.status(404).json({ valid: false, message: 'Invalid license key.' });
        }

        if (user.platform !== 'quotex') {
            return res.status(403).json({ valid: false, message: 'Invalid license key.' });
        }

        if (!user.isActive) {
            return res.status(403).json({ valid: false, message: 'This license has been terminated.' });
        }
        const now = new Date();
        if (now > user.expiryDate) {
            return res.status(403).json({ valid: false, message: 'Your license has expired.' });
        }

        // 🔥 STRICT ONE-TIME USE LOGIC
        if (user.deviceId) {
            if (user.deviceId !== deviceId) {
                return res.status(403).json({ valid: false, message: 'This key is already registered to another device.' });
            }
            if (isRevalidation === false) {
                return res.status(403).json({ valid: false, message: 'Invalid or expired key.' });
            }
        } else {
            user.deviceId = deviceId; 
        }

        user.lastSeen = new Date();
        await user.save();
        
        res.json({
            valid: true,
            user: user.email,
            payload: QUOTEX_SECRET_PAYLOAD, 
            message: 'Quotex license validated successfully.'
        });
    } catch (error) {
        console.error('--- QUOTEX VALIDATION FAILED, ERROR: ---', error);
        res.status(500).json({ valid: false, message: 'An internal server error occurred.' });
    }
});

// 🔥 NAYA FEATURE: BURN ON LOGOUT
app.post('/revoke-license', async (req, res) => {
    try {
        const { licenseKey, deviceId } = req.body;
        if (!licenseKey || !deviceId) {
            return res.status(400).json({ success: false });
        }
        
        const user = await License.findOne({ licenseKey });
        
        if (user && user.deviceId === deviceId) {
            user.isActive = false;
            await user.save();
            return res.json({ success: true, message: 'Key burned successfully.' });
        }
        res.status(400).json({ success: false });
    } catch (error) {
        console.error('--- REVOKE FAILED ---', error);
        res.status(500).json({ success: false });
    }
});

// --- API Routes for Admin Panel ---
app.post('/admin-login', adminLoginLimiter, (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

app.get('/api/users', checkAdminAuth, async (req, res) => {
    try {
        const users = await License.find({});
        res.json(users);
    } catch (error) {
        console.error('--- GET USERS FAILED, ERROR: ---', error);
        res.status(500).json({ message: 'Failed to fetch users.' });
    }
});

app.post('/api/users', checkAdminAuth, async (req, res) => {
    try {
        const newUser = await License.create(req.body);
        res.status(201).json(newUser);
    } catch (error) {
        console.error('--- CREATE USER FAILED, ERROR: ---', error);
        if (error.code === 11000) {
            return res.status(409).json({ message: 'License key already exists.' });
        }
        res.status(500).json({ message: 'Failed to create user.' });
    }
});

app.put('/api/users/:id', checkAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid user ID format.' });
        }
        const updatedUser = await License.findByIdAndUpdate(
            id,
            { $set: req.body }, 
            { new: true }
        );
        if (updatedUser) {
            res.json(updatedUser);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('--- UPDATE USER FAILED, ERROR: ---', error);
        res.status(500).json({ message: 'Failed to update user.' });
    }
});

app.delete('/api/users/:id', checkAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid user ID format.' });
        }
        const result = await License.findByIdAndDelete(id);
        if (result) {
            res.status(204).send();
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('--- DELETE USER FAILED, ERROR: ---', error);
        res.status(500).json({ message: 'Failed to delete user.' });
    }
});

app.post('/api/users/:id/reset-device', checkAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid user ID format.' });
        }
        const user = await License.findByIdAndUpdate(
            id,
            { deviceId: null },
            { new: true }
        );
        if (user) {
            res.json({ message: 'Device ID reset successfully.', user });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('--- RESET DEVICE FAILED, ERROR: ---', error);
        res.status(500).json({ message: 'Failed to reset device ID.' });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Server Start ---
app.listen(PORT, () => {
    console.log(`Server is running on port: ${PORT}`);
});
