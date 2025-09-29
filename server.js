// --- Node.js Server (V3 with Improved UI support & Device Lock) ---
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cors = require('cors'); 
// ✅ NEW: Rate Limiter Library Import
const rateLimit = require("express-rate-limit"); 

const app = express();
app.use(cors()); 
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'db.json');
// 🔑 NOTE: आपका नया एडमिन पासवर्ड
const ADMIN_PASSWORD = "gatsbybarbie@1234"; 

// --- Middleware ---
app.use(express.json()); 
app.use(express.static(path.join(__dirname, 'public'))); 

// --- Helper Functions ---
const readDB = () => {
    try {
        const data = fs.readFileSync(DB_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        return { users: [] };
    }
};

const writeDB = (data) => {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
};

// Admin password check karne ke liye ek middleware
const checkAdminAuth = (req, res, next) => {
    const password = req.headers['x-admin-password'];
    if (password === ADMIN_PASSWORD) {
        next(); 
    } else {
        res.status(401).json({ message: 'Unauthorized: Incorrect admin password' });
    }
};

// ✅ NEW: 5 Minute Rate Limiter Configuration
const adminLoginLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 मिनट की विंडो (300000 milliseconds)
    max: 5, // 5 ग़लत प्रयासों के बाद ब्लॉक
    message: { 
        success: false, 
        message: 'Too many login attempts. Please try again after 5 minutes. ⏰' 
    },
    standardHeaders: true, 
    legacyHeaders: false,
});


// --- API Routes for Extension ---

// POST /validate-license (No Change)
app.post('/validate-license', (req, res) => {
    const { licenseKey, deviceId } = req.body;

    if (!licenseKey || !deviceId) {
        return res.status(400).json({ valid: false, message: 'License key and Device ID are required.' });
    }

    const db = readDB();
    const user = db.users.find(u => u.licenseKey === licenseKey);

    if (!user) {
        return res.status(404).json({ valid: false, message: 'Invalid license key.' });
    }
    
    if (!user.isActive) {
        return res.status(403).json({ valid: false, message: 'This license has been terminated.' });
    }

    const now = new Date();
    const expiry = new Date(user.expiryDate);
    if (now > expiry) {
        return res.status(403).json({ valid: false, message: 'Your license has expired.' });
    }
    
    // 1 Key - 1 Device Logic
    if (user.deviceId && user.deviceId !== deviceId) {
        return res.status(403).json({ valid: false, message: 'This key is already registered to another device.' });
    }

    if (!user.deviceId) {
        user.deviceId = deviceId;
    }
    
    user.lastSeen = new Date().toISOString();

    writeDB(db);

    res.json({
        valid: true,
        user: user.email, 
        message: 'License validated successfully.'
    });
});


// --- API Routes for Admin Panel ---

// POST /admin-login
// ✅ CHANGED: Rate Limiter Middleware लागू किया गया
app.post('/admin-login', adminLoginLimiter, (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

// GET /api/users (No Change)
app.get('/api/users', checkAdminAuth, (req, res) => {
    const db = readDB();
    res.json(db.users);
});

// POST /api/users (No Change)
app.post('/api/users', checkAdminAuth, (req, res) => {
    const db = readDB();

    const now = new Date();
    const oneYearFromNow = new Date(now.setFullYear(now.getFullYear() + 1)); 
    
    const newUser = {
        id: crypto.randomUUID(),
        ...req.body,
        expiryDate: oneYearFromNow.toISOString(), 
        isActive: true, 
        deviceId: null, 
        lastSeen: null, 
    };
    db.users.push(newUser);
    writeDB(db);
    res.status(201).json(newUser);
});

// PUT /api/users/:id (No Change)
app.put('/api/users/:id', checkAdminAuth, (req, res) => {
    const { id } = req.params;
    const db = readDB();
    const userIndex = db.users.findIndex(u => u.id === id);
    if (userIndex > -1) {
        const oldUser = db.users[userIndex];
        db.users[userIndex] = { ...oldUser, ...req.body, id: oldUser.id };
        writeDB(db);
        res.json(db.users[userIndex]);
    } else {
        res.status(404).json({ message: 'User not found' });
    }
});

// DELETE /api/users/:id (No Change)
app.delete('/api/users/:id', checkAdminAuth, (req, res) => {
    const { id } = req.params;
    const db = readDB();
    const filteredUsers = db.users.filter(u => u.id !== id);
    db.users = filteredUsers;
    writeDB(db);
    res.status(204).send(); 
});

// POST /api/users/:id/reset-device (No Change)
app.post('/api/users/:id/reset-device', checkAdminAuth, (req, res) => {
    const { id } = req.params;
    const db = readDB();
    const user = db.users.find(u => u.id === id);
    if (user) {
        user.deviceId = null; 
        writeDB(db);
        res.json({ message: 'Device ID reset successfully.' });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
});


// --- Server Start (No Change) ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('Admin Panel is available at http://localhost:3000');
    console.log('Use password: ' + ADMIN_PASSWORD);
});
