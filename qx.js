// --- NAYA qx.js (Hash-Proof Version) ---
const QUOTEX_SECRET_PAYLOAD = {
    hidingCss: `
        [class*="Usermenu-styles-module__demo"],
        svg.icon-academic,
        [class*="Header-Banner-styles-module__banner"],
        [class*="Banner-styles-module__container"] {
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
        // 🔥 Exact hash hatakar sirf main keyword rakha hai
        demoTarget: "Usermenu-styles-module__demo",
        liveTarget: "Usermenu-styles-module__live"
    }
};

module.exports = QUOTEX_SECRET_PAYLOAD;
