// --- Node.js Server (V6: With Server-Side HTML Payload, Device Lock & Platform Check) ---
const express = require('express');
const crypto = require('crypto');
const cors = require('cors');
const rateLimit = require("express-rate-limit");
const mongoose = require('mongoose');
const path = require('path');

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
    platform: { type: String, default: 'exness' }, // 🔥 NAYA FIELD: By default purani keys exness banengi
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

// =================================================================
// 🔥 THE SECRET HTML PAYLOAD (EXNESS BUTTONS)
// =================================================================
const SECRET_HTML_PAYLOAD = `
<div class="AccountCards_actionButtonWrapper__RXeIk">
    <button class="MuiButtonBase-root MuiButton-root MuiLoadingButton-root MuiButton-outlined MuiButton-outlinedNeutral MuiButton-sizeMedium MuiButton-outlinedSizeMedium MuiButton-colorNeutral MuiButton-disableElevation MuiButton-fullWidth muiltr-1d2x5pf" tabindex="0" type="button" data-test="account-card-deposit-button">
        <span class="MuiButton-icon MuiButton-startIcon MuiButton-iconSizeMedium muiltr-1l6c7y9"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tabler-icon tabler-icon-circle-arrow-down"><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"></path><path d="M8 12l4 4"></path><path d="M12 8v8"></path><path d="M16 12l-4 4"></path></svg></span>
        <span class="MuiTypography-root MuiTypography-bodyB1Regular muiltr-1mjke3v">Deposit</span>
    </button>
</div>
<div class="AccountCards_actionButtonWrapper__RXeIk">
    <button class="MuiButtonBase-root MuiButton-root MuiLoadingButton-root MuiButton-outlined MuiButton-outlinedNeutral MuiButton-sizeMedium MuiButton-outlinedSizeMedium MuiButton-colorNeutral MuiButton-disableElevation MuiButton-fullWidth muiltr-1d2x5pf" tabindex="0" type="button" data-test="account-card-withdraw-button">
        <span class="MuiButton-icon MuiButton-startIcon MuiButton-iconSizeMedium muiltr-1l6c7y9"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tabler-icon tabler-icon-circle-arrow-up-right"><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"></path><path d="M15 9l-6 6"></path><path d="M15 15v-6h-6"></path></svg></span>
        <span class="MuiTypography-root MuiTypography-bodyB1Regular muiltr-1mjke3v">Withdraw</span>
    </button>
</div>
<div class="AccountCards_actionButtonWrapper__RXeIk">
    <button class="MuiButtonBase-root MuiButton-root MuiLoadingButton-root MuiButton-outlined MuiButton-outlinedNeutral MuiButton-sizeMedium MuiButton-outlinedSizeMedium MuiButton-colorNeutral MuiButton-disableElevation MuiButton-fullWidth muiltr-1d2x5pf" tabindex="0" type="button" data-test="account-card-transfer-button">
        <span class="MuiButton-icon MuiButton-startIcon MuiButton-iconSizeMedium muiltr-1l6c7y9"><svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M21 17H3M21 17L17.5 20.5M21 17L17.5 13.5M6.5 10.5L3 7M3 7L6.5 3.5M3 7H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg></span>
        <span class="MuiTypography-root MuiTypography-bodyB1Regular muiltr-1mjke3v">Transfer</span>
    </button>
</div>`;

// =================================================================
// 🔥 THE SECRET PAYLOAD (QUOTEX CSS & TEXTS)
// =================================================================
const QUOTEX_SECRET_PAYLOAD = {
    hidingCss: `
        .---react-features-Usermenu-styles-module__demo--TmWTp,
        svg.icon-academic,
        [class*="---react-features-Header-Banner-styles-module__banner"],
        [class*="---react-features-Banner-styles-module__container"] {
            display: none !important;
            visibility: hidden !important;
        }
        * { transition: none !important; transition-duration: 0s !important; }
    `,
    texts: {
        liveAccountLabel: "Live Account",
        fixedDemoBalance: "$500.00",
        levels: {
            vip: { text: "VIP", profit: "+4% profit" },
            pro: { text: "Pro", profit: "+2% profit" },
            standard: { text: "Standard", profit: "+0% profit" }
        }
    },
    classes: {
        demoTarget: "---react-features-Usermenu-styles-module__demo--TmWTp",
        liveTarget: "---react-features-Usermenu-styles-module__live--Bx7Ua"
    }
};

// --- API Routes for Extension ---

// POST /validate-license (EXNESS)
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

        // 🔥 PLATFORM CHECK: Agar key quotex ki hai, toh Exness me block kar do!
        if (user.platform === 'quotex') {
            return res.status(403).json({ valid: false, message: 'Invalid Key: This key is for Quotex, not Exness.' });
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
        
        // 🔥 HTML Payload for Exness
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
        const { licenseKey, deviceId } = req.body;
        if (!licenseKey || !deviceId) {
            return res.status(400).json({ valid: false, message: 'License key and Device ID are required.' });
        }
        const user = await License.findOne({ licenseKey });
        if (!user) {
            return res.status(404).json({ valid: false, message: 'Invalid license key.' });
        }

        // 🔥 PLATFORM CHECK: Agar key Exness ki hai, toh Quotex me block kar do!
        if (user.platform !== 'quotex') {
            return res.status(403).json({ valid: false, message: 'Invalid Key: This key is for Exness, not Quotex.' });
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
        
        // 🔥 Secret Payload for Quotex
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
        // 🔥 NAYA: req.body me 'platform' pass hoga taaki Exness ya Quotex select ho sake
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
