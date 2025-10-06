// --- Node.js Server (V5: Final, Robust & Fully Error Handled) ---
const express = require('express');
const crypto = require('crypto');
const cors = require('cors');
const rateLimit = require("express-rate-limit");
const mongoose = require('mongoose');
const path = require('path');

const app = express();

// ✅ Render पर Rate Limiter को सही ढंग से काम करने के लिए
app.set('trust proxy', 1);

app.use(cors());

// --- Database Connection & Schema ---
// सुनिश्चित करें कि Render पर DATABASE_URL और ADMIN_PASSWORD एनवायरनमेंट वेरिएबल में सेट हैं।
const MONGODB_URI = process.env.DATABASE_URL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "gatsbybarbie@1234";

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('MongoDB Atlas Connected Successfully!'))
.catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
});

// Mongoose स्कीमा (License Data Structure)
const licenseSchema = new mongoose.Schema({
    licenseKey: { type: String, required: true, unique: true },
    email: { type: String, default: 'user@example.com' },
    expiryDate: { type: Date, default: () => new Date(new Date().setFullYear(new Date().getFullYear() + 1)) },
    isActive: { type: Boolean, default: true },
    deviceId: { type: String, default: null },
    lastSeen: { type: Date, default: null },
});
const License = mongoose.model('License', licenseSchema);

const PORT = process.env.PORT || 3000;

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

// POST /validate-license
app.post('/validate-license', async (req, res) => {
    try {
        const { licenseKey, deviceId } = req.body;
        if (!licenseKey || !deviceId) {
            return res.status(400).json({ valid: false, message: 'License key and Device ID are required.' });
        }
        const user = await License.findOne({ licenseKey });
        if (!user) {
            return res.status(404).json({ valid: false, message: 'Invalid license key.' });
        }
        if (!user.isActive) {
            return res.status(403).json({ valid: false, message: 'This license has been terminated.' });
        }
        const now = new Date();
        if (now > user.expiryDate) {
            return res.status(403).json({ valid: false, message: 'Your license has expired.' });
        }
        if (user.deviceId && user.deviceId !== deviceId) {
            return res.status(403).json({ valid: false, message: 'This key is already registered to another device.' });
        }
        if (!user.deviceId) {
            user.deviceId = deviceId;
        }
        user.lastSeen = new Date();
        await user.save();
        res.json({
            valid: true,
            user: user.email,
            message: 'License validated successfully.'
        });
    } catch (error) {
        console.error('--- VALIDATION FAILED, ERROR: ---', error);
        res.status(500).json({ valid: false, message: 'An internal server error occurred.' });
    }
});


// --- API Routes for Admin Panel ---

// POST /admin-login
app.post('/admin-login', adminLoginLimiter, (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

// GET /api/users
app.get('/api/users', checkAdminAuth, async (req, res) => {
    try {
        const users = await License.find({});
        res.json(users);
    } catch (error) {
        console.error('--- GET USERS FAILED, ERROR: ---', error);
        res.status(500).json({ message: 'Failed to fetch users.' });
    }
});

// POST /api/users
app.post('/api/users', checkAdminAuth, async (req, res) => {
    try {
        const { email, licenseKey } = req.body;
        const newUser = await License.create({ email, licenseKey });
        res.status(201).json(newUser);
    } catch (error) {
        console.error('--- CREATE USER FAILED, ERROR: ---', error);
        if (error.code === 11000) {
            return res.status(409).json({ message: 'License key already exists.' });
        }
        res.status(500).json({ message: 'Failed to create user.' });
    }
});

// PUT /api/users/:id (Edit, Terminate, Extend करने के लिए)
app.put('/api/users/:id', checkAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        // ✅ ADDED: ID validation to prevent crashes
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid user ID format.' });
        }
        const updatedUser = await License.findByIdAndUpdate(
            id,
            { $set: req.body }, // जो भी डेटा फ्रंटएंड से आएगा, वह अपडेट हो जाएगा
            { new: true }
        );
        if (updatedUser) {
            res.json(updatedUser);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        // ✅ ADDED: Error logging to prevent crashes
        console.error('--- UPDATE USER FAILED, ERROR: ---', error);
        res.status(500).json({ message: 'Failed to update user.' });
    }
});

// DELETE /api/users/:id
app.delete('/api/users/:id', checkAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        // ✅ ADDED: ID validation to prevent crashes
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
        // ✅ ADDED: Error logging to prevent crashes
        console.error('--- DELETE USER FAILED, ERROR: ---', error);
        res.status(500).json({ message: 'Failed to delete user.' });
    }
});

// POST /api/users/:id/reset-device
app.post('/api/users/:id/reset-device', checkAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        // ✅ ADDED: ID validation to prevent crashes
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
        // ✅ ADDED: Error logging to prevent crashes
        console.error('--- RESET DEVICE FAILED, ERROR: ---', error);
        res.status(500).json({ message: 'Failed to reset device ID.' });
    }
});


// --- Server Start ---
app.listen(PORT, () => {
    console.log(`Server is running on port: ${PORT}`);
});
