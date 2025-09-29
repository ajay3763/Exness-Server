// --- Node.js Server (V3 with Improved UI support & Device Lock) ---
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cors = require('cors'); // <-- YEH NAYI LINE ADD KI HAI

const app = express();
app.use(cors()); // <-- YEH NAYI LINE ADD KI HAI
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'db.json');
const ADMIN_PASSWORD = "admin123"; // Aap isse badal sakte hain

// --- Middleware ---
app.use(express.json()); // JSON data ko samajhne ke liye
app.use(express.static(path.join(__dirname, 'public'))); // Admin panel files ko serve karne ke liye

// --- Helper Functions ---
const readDB = () => {
    try {
        const data = fs.readFileSync(DB_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        // Agar file nahi hai to ek default structure return karein
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
        next(); // Password sahi hai, aage badhein
    } else {
        res.status(401).json({ message: 'Unauthorized: Incorrect admin password' });
    }
};


// --- API Routes for Extension ---

// POST /validate-license
// Extension is route par license key ko validate karne aayega
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
    
    // Check if license is terminated by admin
    if (!user.isActive) {
        return res.status(403).json({ valid: false, message: 'This license has been terminated.' });
    }

    // Check for expiry date
    const now = new Date();
    const expiry = new Date(user.expiryDate);
    if (now > expiry) {
        return res.status(403).json({ valid: false, message: 'Your license has expired.' });
    }
    
    // 1 Key - 1 Device Logic
    if (user.deviceId && user.deviceId !== deviceId) {
        return res.status(403).json({ valid: false, message: 'This key is already registered to another device.' });
    }

    // Agar user pehli baar login kar raha hai, to Device ID save karein
    if (!user.deviceId) {
        user.deviceId = deviceId;
    }
    
    // Last seen update karein
    user.lastSeen = new Date().toISOString();

    writeDB(db);

    res.json({
        valid: true,
        user: user.email, // Extension mein user ka email dikhane ke liye
        message: 'License validated successfully.'
    });
});


// --- API Routes for Admin Panel ---

// POST /admin-login
// Admin panel ke login page ke liye
app.post('/admin-login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

// GET /api/users
// Saare users ka data admin panel ko bhejne ke liye
app.get('/api/users', checkAdminAuth, (req, res) => {
    const db = readDB();
    res.json(db.users);
});

// POST /api/users
// Naya user banane ke liye
app.post('/api/users', checkAdminAuth, (req, res) => {
    const db = readDB();

    // 🌟 FIX: Calculate Expiry Date for 1 Year from Now
    const now = new Date();
    // nextFullYear nikalne ke liye new Date(now) use kiya taki original 'now' change na ho
    const oneYearFromNow = new Date(now.setFullYear(now.getFullYear() + 1)); 
    
    const newUser = {
        id: crypto.randomUUID(),
        ...req.body,
        // ✅ ADDED: Expiry Date set ki gayi (1 saal aage)
        expiryDate: oneYearFromNow.toISOString(), 
        isActive: true, // Shuru mein active rakhein
        deviceId: null, // Shuru mein Device ID null rahega
        lastSeen: null, // Shuru mein lastSeen null rahega
    };
    db.users.push(newUser);
    writeDB(db);
    res.status(201).json(newUser);
});

// PUT /api/users/:id
// Kisi user ka data update karne ke liye
app.put('/api/users/:id', checkAdminAuth, (req, res) => {
    const { id } = req.params;
    const db = readDB();
    const userIndex = db.users.findIndex(u => u.id === id);
    if (userIndex > -1) {
        // Purana deviceId aur lastSeen maintain karein
        const oldUser = db.users[userIndex];
        db.users[userIndex] = { ...oldUser, ...req.body, id: oldUser.id };
        writeDB(db);
        res.json(db.users[userIndex]);
    } else {
        res.status(404).json({ message: 'User not found' });
    }
});

// DELETE /api/users/:id
// Kisi user ko delete karne ke liye
app.delete('/api/users/:id', checkAdminAuth, (req, res) => {
    const { id } = req.params;
    const db = readDB();
    const filteredUsers = db.users.filter(u => u.id !== id);
    db.users = filteredUsers;
    writeDB(db);
    res.status(204).send(); // No content
});

// POST /api/users/:id/reset-device
// Device ID reset karne ke liye
app.post('/api/users/:id/reset-device', checkAdminAuth, (req, res) => {
    const { id } = req.params;
    const db = readDB();
    const user = db.users.find(u => u.id === id);
    if (user) {
        user.deviceId = null; // Device ID ko null set kar dein
        writeDB(db);
        res.json({ message: 'Device ID reset successfully.' });
    } else {
        res.status(404).json({ message: 'User not found' });
    }
});


// --- Server Start ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('Admin Panel is available at http://localhost:3000');
    console.log('Use password: ' + ADMIN_PASSWORD);
});