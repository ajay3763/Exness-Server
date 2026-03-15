// --- qx.js ---
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

// Yeh line server.js ko is data ko use karne ki permission degi
module.exports = QUOTEX_SECRET_PAYLOAD;
