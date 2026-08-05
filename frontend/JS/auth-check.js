// ../JS/auth-check.js

// 1. এই ফাংশনটি যদি ইউজার লগইন থাকে তাকে ডিরেক্ট ড্যাশবোর্ডে পাঠাবে, আর না থাকলে ইনডেক্সে ।

(function() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true' || sessionStorage.getItem('isLoggedIn') === 'true';
    const path = window.location.pathname;
    if (isLoggedIn && (path.includes('index.html') || path.includes('login.html') || path.endsWith('/'))) {
        window.location.href = 'dashboard.html';
    }
})();

// 2. লগডইন ইউজারদের ৩০ দিন পর লগড-আউট করে দিবে

function checkSessionTimeout() {
    const loginDate = localStorage.getItem('loginDate') || sessionStorage.getItem('loginDate');
    
    if (loginDate) {
        const currentTime = new Date().getTime();
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;

        if (currentTime - loginDate > thirtyDaysInMs) {
    // গেস্টদের জন্য এলার্ট দেওয়ার দরকার নেই যদি তারা লগইন না থাকে
    if(localStorage.getItem('isLoggedIn') === 'true'){
        alert("Session expired for security. Please log in again.");
        localStorage.clear();
        sessionStorage.clear();
        // window.location.href = '/frontend/HTML/login.html'; // এই লাইনটি বন্ধ করে দিলাম
    }
}
    }
}
document.addEventListener('DOMContentLoaded', checkSessionTimeout);


