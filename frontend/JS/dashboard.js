// ../JS/dashboard.js

// 1. Pending Account Restrictions (Read-Only Mode)

document.addEventListener('DOMContentLoaded', function() {
    const userStatus = localStorage.getItem('userStatus');
    if (userStatus === 'pending') {
        const alertBanner = document.createElement('div');
        alertBanner.style = "background: #e67e22; color: white; text-align: center; padding: 10px; position: fixed; bottom: 0; width: 100%; z-index: 10000; font-weight: bold;";
        alertBanner.innerText = "Account is pending. You can view information but cannot make changes.";
        document.body.appendChild(alertBanner);
        const applyReadOnly = () => {
            const allElements = document.querySelectorAll('input, select, textarea, button');
            allElements.forEach(el => {
                const isNavBtn = el.innerText.includes('Next') || el.innerText.includes('Previous') || el.classList.contains('nav-link');
                if (!isNavBtn) {
                    el.disabled = true;
                    el.style.opacity = "0.5";
                    el.style.cursor = "not-allowed";
                }
            });
        };
        applyReadOnly();
        setInterval(applyReadOnly, 1000);
    }
});

// --- 2. Load User Data and Update UI Profile ---

// --- 2. Load User Data and Update UI Profile ---

function updateProfileInfo() {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const name = localStorage.getItem('userName') || sessionStorage.getItem('userName');
    const phone = localStorage.getItem('userPhone') || sessionStorage.getItem('userPhone');
    const role = localStorage.getItem('userRole') || sessionStorage.getItem('userRole');
    const status = localStorage.getItem('userStatus') || sessionStorage.getItem('userStatus');
    const userPic = localStorage.getItem('userProfilePic');
    const sidebarPic = document.querySelector('.profile-area img');
    if (userPic && sidebarPic) {
        sidebarPic.src = userPic;
    }
    const nameDisplay = document.querySelector('.profile-name');
    const phoneDisplay = document.querySelector('.profile-email');
    const dropdownMenu = document.getElementById('profile-dropdown-menu');

    if (token && name && nameDisplay) {
        // ১. রোল অনুযায়ী লেবেল (Badge) তৈরি
        const roleBg = role === 'manager' ? '#2ecc71' : '#3498db';
        const roleBadge = `<span style="font-size: 11px; background: ${roleBg}; color: white; padding: 2px 8px; border-radius: 12px; margin-left: 8px; vertical-align: middle; display: inline-block;">${role.charAt(0).toUpperCase() + role.slice(1)}</span>`;
        
        // ২. প্রথমে নাম, তারপর পাশে রোল দেখানো
        nameDisplay.innerHTML = `${name}${roleBadge}`;
        
        // ৩. নিচের লাইনে নাম্বার এবং সবার শেষে স্ট্যাটাস দেখানো
        let statusHtml = status === 'pending' ? `<div style="color: #ffcc00; font-weight: bold; margin-top: 4px;">(Pending)</div>` : '';
        phoneDisplay.innerHTML = `<div>${phone || "No Number"}</div>${statusHtml}`;
        if (dropdownMenu) {
            const isApprovedManager = (role === 'manager' && status === 'active');
            dropdownMenu.innerHTML = `
                <li><a href="/HTML/profile.html"><i class="fas fa-user"></i> My Profile</a></li>
                ${isApprovedManager ? '<li><a href="#"><i class="fas fa-gear"></i> Mess Settings</a></li>' : ''}
                <li><a href="#" id="logout-btn"><i class="fas fa-sign-out-alt"></i> Log Out</a></li>
            `;
        }
    } else {
        if (nameDisplay) nameDisplay.innerText = "Guest User";
        if (phoneDisplay) phoneDisplay.innerText = "Login to access more";
        if (dropdownMenu) {
            dropdownMenu.innerHTML = `
                <li><a href="/HTML/login.html"><i class="fas fa-sign-in-alt"></i> Log In</a></li>
                <li><a href="/HTML/login.html#signup"><i class="fas fa-user-plus"></i> Sign Up</a></li>
                <li><a href="#" id="logout-btn"><i class="fas fa-sign-out-alt"></i> Log Out</a></li>
            `;
        }
    }
}

//3. Update User Name and Role in Dashboard UI

document.addEventListener('DOMContentLoaded', function() {
    const role = localStorage.getItem('userRole');
    const name = localStorage.getItem('userName');
    const nameDisplay = document.querySelector('.user-info h3') || document.querySelector('.manager-name');
    const roleDisplay = document.querySelector('.user-info p') || document.querySelector('.manager-email');
    if (role === 'guest') {
        if (nameDisplay) nameDisplay.innerText = "Guest";
        if (roleDisplay) roleDisplay.innerText = "You need to login";
    } else if (name) {
        if (nameDisplay) nameDisplay.innerText = name;
        if (roleDisplay) roleDisplay.innerText = role.charAt(0).toUpperCase() + role.slice(1);
    }
});

// 4. Profile Dropdown and Logout Logic

function setupProfileDropdown() {
    const profileArea = document.getElementById('profile-area');
    const dropdownMenu = document.getElementById('profile-dropdown-menu');
    const toggleIcon = document.getElementById('dropdown-toggle-icon');
    if (profileArea && dropdownMenu) { 
        profileArea.addEventListener('click', function() {
            dropdownMenu.classList.toggle('hidden');
            if (toggleIcon) {
                toggleIcon.classList.toggle('rotated');
                toggleIcon.classList.toggle('fa-chevron-up');
            }
        });
    }
    dropdownMenu?.addEventListener('click', function(e) {
        const logoutBtn = e.target.closest('a');
        if (logoutBtn && logoutBtn.innerText.includes('Log Out')) {
            e.preventDefault();
            if (confirm("Are you sure you want to log out?")) {
                localStorage.clear();
                sessionStorage.clear();
                window.location.replace('/HTML/index.html'); 
            }
        }
    });
}


// --- মেম্বার ড্যাশবোর্ড সামারি লোড করার ফাংশন ---
document.addEventListener('DOMContentLoaded', function() {
    const userStatus = localStorage.getItem('userStatus');
    const userRole = localStorage.getItem('userRole');
    const userPhone = localStorage.getItem('userPhone');
    const userName = localStorage.getItem('userName');

    // আপনার শর্ত অনুযায়ী: userStatus active & userRole member হলে ডেটা ফেচ করবে[cite: 7]
    if (userStatus === 'active' && userRole === 'member' && userPhone && userName) {
        fetchMemberDashboardData(userPhone, userName);
    }
});

async function fetchMemberDashboardData(phone, name) {
    try {
        // লোকালস্টোরেজ বা সেশন থেকে টোকেনটি নিয়ে নিন
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');

        const response = await fetch(API + `/api/member/dashboard-summary`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`, // 👈 টোকেনটি হেডার-এ যুক্ত করা হলো
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error("Failed to fetch member dashboard stats");
            return;
        }

        const data = await response.json();

        // ড্যাশবোর্ডের আইডিগুলোতে ডেটা বসিয়ে দেওয়া
        document.getElementById('val-expenses').innerText = `৳ ${data.yourTotalExpenses}`;
        document.getElementById('val-meals').innerText = data.yourTotalMeal;
        document.getElementById('val-deposit').innerText = `৳ ${data.yourTotalDeposit}`;
        document.getElementById('val-refund').innerText = `৳ ${data.yourRefundableAmount}`;
        document.getElementById('val-due').innerText = `৳ ${data.yourDue}`;
        document.getElementById('val-cook').innerText = `৳ ${data.yourCookBill}`;
        document.getElementById('val-fine').innerText = data.yourMealFines;

    } catch (error) {
        console.error("Error loading member dashboard summary:", error);
    }
}




// 5. Initialize Dashboard on Page Load

document.addEventListener('DOMContentLoaded', function() {
    updateProfileInfo(); 
    setupProfileDropdown();
});


// --- ড্যাশবোর্ডে লগইন করা ইউজারের নাম ডাইনামিক করার কোড ---
document.addEventListener('DOMContentLoaded', function() {
    const name = localStorage.getItem('userName') || sessionStorage.getItem('userName');
    const nameDisplay = document.getElementById('display-username') || document.querySelector('.user-info h3') || document.querySelector('.manager-name');
    
    if (name && nameDisplay) {
        nameDisplay.innerText = name;
    }
});

// --- গত ৭ দিনের (আজসহ পূর্বের ৬ দিন) মিল চার্ট লোড করার ফাংশন ---
async function loadDailyMealChart() {
    try {
        const response = await fetch(API + '/api/dashboard/meal-chart-data');
        const result = await response.json();

        if (!result.success || !result.data) {
            console.error("চার্টের ডেটা পাওয়া যায়নি!");
            return;
        }

        const dates = [];
        const dayMeals = [];
        const nightMeals = [];

        // সার্ভার থেকে সাজানো ডেটা সরাসরি অ্যারেতে রূপান্তর
        result.data.forEach(item => {
            dates.push(item.date);
            dayMeals.push(item.totalDayMeals);
            nightMeals.push(item.totalNightMeals);
        });

        if (dates.length > 0) {
            document.getElementById('dateRangeText').innerText = `Showing data from ${dates[0]} to ${dates[dates.length - 1]}.`;
        }

        const ctx = document.getElementById('dailyMealChart').getContext('2d');
        
        if (window.myMealChart) {
            window.myMealChart.destroy();
        }

        window.myMealChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dates,
                datasets: [
                    {
                        label: 'Lunch',
                        data: dayMeals,
                        backgroundColor: '#3498db',
                        borderRadius: 3
                    },
                    {
                        label: 'Dinner',
                        data: nightMeals,
                        backgroundColor: '#2ecc71',
                        borderRadius: 3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            precision: 0
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#ffffff'
                        }
                    }
                }
            }
        });

    } catch (error) {
        console.error("Error loading meal chart:", error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadDailyMealChart();
});

document.addEventListener("DOMContentLoaded", async () => {
    // লোকাল স্টোরেজ বা সেশন থেকে ফোন নম্বর, রোল এবং স্ট্যাটাস নিন
    const userPhone = localStorage.getItem("userPhone") || sessionStorage.getItem("userPhone");
    const userRole = localStorage.getItem("userRole") || sessionStorage.getItem("userRole");
    const userStatus = localStorage.getItem("userStatus") || sessionStorage.getItem("userStatus"); // 👈 স্ট্যাটাস সংগ্রহ করা হলো

    // ফোন নম্বর না থাকলে, রোল 'member' না হলে, অথবা স্ট্যাটাস 'active' না হলে ফেচ হবে না
    if (!userPhone || userRole !== "member" || userStatus !== "active") {
        console.log("Unauthorized, inactive, or missing user details for member dashboard.");
        return;
    }

    try {
        const response = await fetch(API + `/api/member/dashboard-summary?phone=${userPhone}`);
        const data = await response.json();

        if (response.ok) {
            document.getElementById("val-expenses").innerText = `৳ ${data.yourTotalExpenses}`;
            document.getElementById("val-meals").innerText = data.yourTotalMeal;
            document.getElementById("val-deposit").innerText = `৳ ${data.yourTotalDeposit}`;
            document.getElementById("val-refund").innerText = `৳ ${data.yourRefundableAmount}`;
            document.getElementById("val-due").innerText = `৳ ${data.yourDue}`;
            document.getElementById("val-cook").innerText = `৳ ${data.yourCookBill}`;
            document.getElementById("val-fine").innerText = `৳ ${data.yourMealFines}`;
        } else {
            console.error("Failed to load dashboard data:", data.message);
        }
    } catch (error) {
        console.error("Error fetching dashboard summary:", error);
    }
});