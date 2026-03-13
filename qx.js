// --- quotexPayload.js ---

const QUOTEX_SECRET_HTML = `
<style id="qx-flicker-fix-style">
    [class*="---react-features-Usermenu-styles-module__infoBalance--"],
    .usermenu__info-balance,
    [class*="---react-features-Usermenu-styles-module__infoLevels--"],
    .usermenu__info-levels,
    [class*="---react-features-Usermenu-Dropdown-styles-module__selectBalance--"],
    .usermenu__select-balance,
    .balance__value,
    .balance-list__value,
    [class*="---react-features-Usermenu-Dropdown-styles-module__dropdown--"],
    .usermenu__dropdown {
        visibility: hidden !important;
        opacity: 0 !important;
    }
</style>

<style id="quotex-hiding-style-final">
    .---react-features-Usermenu-styles-module__demo--TmWTp,
    svg.icon-academic,
    [class*="---react-features-Header-Banner-styles-module__banner"], 
    [class*="---react-features-Banner-styles-module__container"] {
        display: none !important;
        visibility: hidden !important;
    }
    * { transition: none !important; transition-duration: 0s !important; }
</style>
`;

module.exports = { QUOTEX_SECRET_HTML };
