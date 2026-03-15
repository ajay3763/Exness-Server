// --- exness.js ---
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

module.exports = SECRET_HTML_PAYLOAD;
