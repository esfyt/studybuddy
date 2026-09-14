// ========================================
// STUDY BUDDY — COOKIE CONSENT BANNER
// Shows once until the user acknowledges.
// This app uses NO cookies — only localStorage.
// ========================================

const CONSENT_KEY = "studyBuddyCookieConsent";

function initCookieConsent() {
    // Already accepted? Don't show banner
    if (localStorage.getItem(CONSENT_KEY) === "accepted") return;

    const banner = document.getElementById("cookieBanner");
    if (!banner) return;

    banner.classList.remove("hidden");

    const acceptBtn = document.getElementById("cookieAccept");
    if (acceptBtn) {
        acceptBtn.addEventListener("click", function () {
            localStorage.setItem(CONSENT_KEY, "accepted");
            banner.classList.add("hidden");
        });
    }
}

// Run after DOM is ready (this script loads after HTML is parsed)
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCookieConsent);
} else {
    initCookieConsent();
}
