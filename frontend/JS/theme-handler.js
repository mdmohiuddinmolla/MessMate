// /frontend/JS/theme-handler.js

document.addEventListener('DOMContentLoaded', async () => {
    const themeToggle = document.getElementById('global-theme-toggle');
    
    const phone = localStorage.getItem('userPhone');
    const role = localStorage.getItem('userRole');

    // ১. প্রথমে লোকাল স্টোরেজ থেকে থিম নিয়ে ইনস্ট্যান্ট এপ্লাই করা (যাতে ফ্লিকার বা দেরি না করে)
    let currentTheme = localStorage.getItem('userTheme') || localStorage.getItem('messmate-app-theme') || 'dark';

    if (currentTheme === 'dark') {
        document.body.classList.add('dark-theme');
        if (themeToggle) themeToggle.checked = true;
    } else {
        document.body.classList.remove('dark-theme');
        if (themeToggle) themeToggle.checked = false;
    }

    // ২. ব্যাকগ্রাউন্ডে সার্ভার বা ডাটাবেস থেকে লেটেস্ট থিম চেক করে সিঙ্ক রাখা
    if (phone && role) {
        try {
            const token = localStorage.getItem('userToken') || localStorage.getItem('token') || sessionStorage.getItem('token');
            const res = await fetch(API + `/api/get-user-data?phone=${phone}&role=${role}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const user = await res.json();
            if (res.ok && user && user.theme) {
                currentTheme = user.theme;
                localStorage.setItem('userTheme', currentTheme);
                localStorage.setItem('messmate-app-theme', currentTheme);

                if (currentTheme === 'dark') {
                    document.body.classList.add('dark-theme');
                    if (themeToggle) themeToggle.checked = true;
                } else {
                    document.body.classList.remove('dark-theme');
                    if (themeToggle) themeToggle.checked = false;
                }
            }
        } catch (err) {
            console.error("Failed to fetch theme from DB:", err);
        }
    }

    // ৩. টগল পরিবর্তন করলে ডাটাবেস ও লোকাল স্টোরেজে তাৎক্ষণিক সেভ করা
    if (themeToggle) {
        themeToggle.addEventListener('change', async () => {
            const newTheme = themeToggle.checked ? 'dark' : 'light';

            // UI এবং LocalStorage তাৎক্ষণিক আপডেট
            if (newTheme === 'dark') {
                document.body.classList.add('dark-theme');
            } else {
                document.body.classList.remove('dark-theme');
            }
            localStorage.setItem('userTheme', newTheme);
            localStorage.setItem('messmate-app-theme', newTheme);

            // ডাটাবেসে পাঠিয়ে পার্মানেন্টলি সেভ করা
            if (phone && role) {
                try {
                    const token = localStorage.getItem('userToken') || localStorage.getItem('token') || sessionStorage.getItem('token');
                    await fetch(API + '/api/auth/update-theme', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ phone, role, theme: newTheme })
                    });
                } catch (err) {
                    console.error("Failed to save theme to DB:", err);
                }
            }
        });
    }
});