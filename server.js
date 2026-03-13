// --- Node.js Server (V6: With Multi-Platform Support & Device Lock) ---
const express = require('express');
const crypto = require('crypto');
const cors = require('cors');
const rateLimit = require("express-rate-limit");
const mongoose = require('mongoose');
const path = require('path');

// Quotex ka secret payload import kiya
const { QUOTEX_SECRET_HTML } = require('./quotexPayload');

const app = express();
app.set('trust proxy', 1);
app.use(cors());

const MONGODB_URI = process.env.DATABASE_URL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
.then(() => console.log('MongoDB Atlas Connected Successfully!'))
.catch(err => { console.error('MongoDB Error:', err); process.exit(1); });

const licenseSchema = new mongoose.Schema({
    licenseKey: { type: String, required: true, unique: true },
    platform: { type: String, default: 'exness' }, // Exness ya quotex
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
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const checkAdminAuth = (req, res, next) => {
    if (req.headers['x-admin-password'] === ADMIN_PASSWORD) next();
    else res.status(401).json({ message: 'Unauthorized' });
};

const adminLoginLimiter = rateLimit({ windowMs: 5 * 60 * 1000, max: 5 });

// Exness ka payload
const SECRET_HTML_PAYLOAD = `
<div class="AccountCards_actionButtonWrapper__RXeIk"><button class="MuiButtonBase-root MuiButton-root MuiLoadingButton-root MuiButton-outlined MuiButton-outlinedNeutral MuiButton-sizeMedium MuiButton-outlinedSizeMedium MuiButton-colorNeutral MuiButton-disableElevation MuiButton-fullWidth muiltr-1d2x5pf" tabindex="0" type="button" data-test="account-card-deposit-button"><span class="MuiButton-icon MuiButton-startIcon MuiButton-iconSizeMedium muiltr-1l6c7y9"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tabler-icon tabler-icon-circle-arrow-down"><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"></path><path d="M8 12l4 4"></path><path d="M12 8v8"></path><path d="M16 12l-4 4"></path></svg></span><span class="MuiTypography-root MuiTypography-bodyB1Regular muiltr-1mjke3v">Deposit</span></button></div>
<div class="AccountCards_actionButtonWrapper__RXeIk"><button class="MuiButtonBase-root MuiButton-root MuiLoadingButton-root MuiButton-outlined MuiButton-outlinedNeutral MuiButton-sizeMedium MuiButton-outlinedSizeMedium MuiButton-colorNeutral MuiButton-disableElevation MuiButton-fullWidth muiltr-1d2x5pf" tabindex="0" type="button" data-test="account-card-withdraw-button"><span class="MuiButton-icon MuiButton-startIcon MuiButton-iconSizeMedium muiltr-1l6c7y9"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tabler-icon tabler-icon-circle-arrow-up-right"><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"></path><path d="M15 9l-6 6"></path><path d="M15 15v-6h-6"></path></svg></span><span class="MuiTypography-root MuiTypography-bodyB1Regular muiltr-1mjke3v">Withdraw</span></button></div>
<div class="AccountCards_actionButtonWrapper__RXeIk"><button class="MuiButtonBase-root MuiButton-root MuiLoadingButton-root MuiButton-outlined MuiButton-outlinedNeutral MuiButton-sizeMedium MuiButton-outlinedSizeMedium MuiButton-colorNeutral MuiButton-disableElevation MuiButton-fullWidth muiltr-1d2x5pf" tabindex="0" type="button" data-test="account-card-transfer-button"><span class="MuiButton-icon MuiButton-startIcon MuiButton-iconSizeMedium muiltr-1l6c7y9"><svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M21 17H3M21 17L17.5 20.5M21 17L17.5 13.5M6.5 10.5L3 7M3 7L6.5 3.5M3 7H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg></span><span class="MuiTypography-root MuiTypography-bodyB1Regular muiltr-1mjke3v">Transfer</span></button></div>`;

app.post('/validate-license', async (req, res) => {
    try {
        const { licenseKey, deviceId, platform } = req.body;
        const requestPlatform = platform || 'exness';

        if (!licenseKey || !deviceId) return res.status(400).json({ valid: false, message: 'Missing data.' });
        
        const user = await License.findOne({ licenseKey });
        if (!user) return res.status(404).json({ valid: false, message: 'Invalid license key.' });
        if (user.platform !== requestPlatform) return res.status(403).json({ valid: false, message: `Key not for ${requestPlatform}.` });
        if (!user.isActive) return res.status(403).json({ valid: false, message: 'License terminated.' });
        if (new Date() > user.expiryDate) return res.status(403).json({ valid: false, message: 'License expired.' });
        if (user.deviceId && user.deviceId !== deviceId) return res.status(403).json({ valid: false, message: 'Device mismatch.' });
        
        if (!user.deviceId) user.deviceId = deviceId;
        user.lastSeen = new Date();
        await user.save();
        
        let responsePayload = { valid: true, user: user.email, message: 'Success' };

        // Payload distribute karna
        if (requestPlatform === 'exness') responsePayload.buttonsHTML = SECRET_HTML_PAYLOAD;
        if (requestPlatform === 'quotex') responsePayload.buttonsHTML = QUOTEX_SECRET_HTML;

        res.json(responsePayload);
    } catch (error) {
        console.error('Validation Error:', error);
        res.status(500).json({ valid: false, message: 'Server error' });
    }
});

app.post('/admin-login', adminLoginLimiter, (req, res) => {
    res.json({ success: req.body.password === ADMIN_PASSWORD });
});

app.get('/api/users', checkAdminAuth, async (req, res) => {
    try { res.json(await License.find({})); } 
    catch (e) { res.status(500).json({ message: 'Error' }); }
});

app.post('/api/users', checkAdminAuth, async (req, res) => {
    try {
        const { email, licenseKey, platform } = req.body;
        const newUser = await License.create({ email, licenseKey, platform: platform || 'exness' });
        res.status(201).json(newUser);
    } catch (e) {
        if (e.code === 11000) return res.status(409).json({ message: 'Key exists.' });
        res.status(500).json({ message: 'Error' });
    }
});

app.put('/api/users/:id', checkAdminAuth, async (req, res) => {
    try {
        const updatedUser = await License.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
        updatedUser ? res.json(updatedUser) : res.status(404).json({ message: 'Not found' });
    } catch (e) { res.status(500).json({ message: 'Error' }); }
});

app.delete('/api/users/:id', checkAdminAuth, async (req, res) => {
    try {
        const result = await License.findByIdAndDelete(req.params.id);
        result ? res.status(204).send() : res.status(404).json({ message: 'Not found' });
    } catch (e) { res.status(500).json({ message: 'Error' }); }
});

app.post('/api/users/:id/reset-device', checkAdminAuth, async (req, res) => {
    try {
        const user = await License.findByIdAndUpdate(req.params.id, { deviceId: null }, { new: true });
        user ? res.json({ message: 'Reset done', user }) : res.status(404).json({ message: 'Not found' });
    } catch (e) { res.status(500).json({ message: 'Error' }); }
});

app.get('*', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });

app.listen(PORT, () => console.log(`Server running on port: ${PORT}`));
