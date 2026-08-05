// ../JS/login-signup.js

// 1. Login/Signup Form Toggle Functionality

document.getElementById('login-toggle').addEventListener('click', function() {

    document.getElementById('login-form-data').classList.remove('hidden');

    document.getElementById('signup-form-data').classList.add('hidden');

    document.getElementById('login-toggle').classList.add('active');

    document.getElementById('signup-toggle').classList.remove('active');

});

document.getElementById('signup-toggle').addEventListener('click', function() {

    document.getElementById('signup-form-data').classList.remove('hidden');

    document.getElementById('login-form-data').classList.add('hidden');

    document.getElementById('signup-toggle').classList.add('active');

    document.getElementById('login-toggle').classList.remove('active');

});

// 2. Role-based Signup Fields Toggle

// এই ফাংশনটি HTML-এর select এলিমেন্টের onchange="toggleSignupFields()" হিসেবে থাকতে হবে
function toggleSignupFields() {
    const role = document.getElementById('signup-role').value; // আপনার রোলের ID
    const managerFields = document.getElementById('manager-only-fields');
    const nameInput = document.getElementById('signup-name');

    if (role === 'member') {
        managerFields.style.display = 'none'; // মেম্বার হলে হাইড হবে
        nameInput.placeholder = "Full Name (Required)";
    } else if (role === 'manager') {
        managerFields.style.display = 'block'; // ম্যানেজার হলে শো করবে
        nameInput.placeholder = "Manager Name";
    }
}
/// 3. Signup API Implementation

document.getElementById('signup-form-data')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    e.stopImmediatePropagation(); 
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    const role = document.getElementById('signup-role').value;
    const pass = document.getElementById('signup-password').value;
    const confirmPass = document.getElementById('confirm-password').value;
    if (pass !== confirmPass) {
    Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Password does not match!',
        confirmButtonColor: '#d33'
    });
    return;
}
    const bodyData = {
        role: role,
        name: document.getElementById('signup-name').value,
        email: document.getElementById('signup-email').value, 
        phone: document.getElementById('signup-phone').value,
        password: pass,
        status: 'pending',
        start: role === 'manager' ? document.getElementById('start-date').value : null,
        end: role === 'manager' ? document.getElementById('end-date').value : null
    };
    try {
        const response = await fetch(API + '/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
        });
        const result = await response.json();
        if(response.ok) {
            Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: 'Your account is created and currently pending for approval.',
                confirmButtonColor: '#3085d6'
            }).then(() => {
                location.reload();
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Registration Failed',
                text: result.message || "Fail!",
                confirmButtonColor: '#d33'
            });
            if (submitBtn) submitBtn.disabled = false; 
        }
    } catch (err) { 
        if (submitBtn) submitBtn.disabled = false;
        Swal.fire({
            icon: 'error',
            title: 'Connection Error',
            text: 'Unable to connect to the server.',
            confirmButtonColor: '#d33'
        });
    }
});


// 3.1 পেজ লোড হওয়ার সময় চেক করবে ইউআরএল-এ #signup আছে কি না

window.addEventListener('DOMContentLoaded', () => {
    if (window.location.hash === '#signup') {
        // সাইনআপ ফর্ম দেখাবে
        document.getElementById('signup-form-data')?.classList.remove('hidden');
        document.getElementById('login-form-data')?.classList.add('hidden');
        
        // টগল বাটনগুলোর ডিজাইন আপডেট করবে
        document.getElementById('signup-toggle')?.classList.add('active');
        document.getElementById('login-toggle')?.classList.remove('active');
    }
});

// 4. Login API Implementation

// এই ফাংশনটা Remember Me অনুযায়ী লগ-ইন করলে ইউজার ডাটা স্টোর করে

// 4. Login API Implementation

document.getElementById('login-form-data')?.addEventListener('submit', async function(e) {
    e.preventDefault();

    const phone = document.getElementById('login-phone').value;
    const password = document.getElementById('login-password').value;
    const role = document.getElementById('login-role').value;
    const rememberMeCheckbox = document.getElementById('remember-me');
    const rememberMe = rememberMeCheckbox ? rememberMeCheckbox.checked : false;

    // নতুন শর্ত: 'Remember Me' এ টিক দেওয়া না থাকলে লগইন আটকাবে এবং ওয়ার্নিং দেবে
    if (!rememberMe) {
        Swal.fire({
            icon: 'warning',
            title: 'Attention',
            text: "দয়া করে লগইন করার জন্য 'Remember Me' অপশনটিতে টিক দিন!",
            confirmButtonColor: '#f39c12'
        });
        return;
    }

    try {
        const response = await fetch(API + '/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, password, role })
        });

        const data = await response.json();

        if (response.ok) {
            // ১. গেস্ট মোডের বা পুরোনো লগইনের সব ডাটা আগে পরিষ্কার করা
            localStorage.clear();
            sessionStorage.clear();

            // যেহেতু বাধ্যতামূলক করা হয়েছে, তাই ডাটা সবসময় localStorage-এই সেভ হবে
            const storage = localStorage; 

            // ৩. নতুন এবং সঠিক ইউজার ডাটা সেট করা
            // ৪. নতুন এবং সঠিক ইউজার ডাটা সেট করা
            if (data.profilePic) {
                storage.setItem('userProfilePic', data.profilePic); 
            }
            storage.setItem('token', data.token);
            storage.setItem('userName', data.name);
            storage.setItem('userRole', data.role);   
            storage.setItem('userStatus', data.status);
            storage.setItem('userPhone', data.phone);
            storage.setItem('isLoggedIn', 'true');    
            storage.setItem('loginDate', new Date().getTime()); 

            // 🌟 এখানে 'theme'-এর পরিবর্তে আপনার নির্দিষ্ট করা 'messmate-app-theme' ব্যবহার করা হলো
            if (data.theme) {
                storage.setItem('messmate-app-theme', data.theme);
            }

            // ৫. ড্যাশবোর্ডে রিডাইরেক্ট করা
            window.location.href = '/HTML/dashboard.html';
        }
        else {
            Swal.fire({
                icon: 'error',
                title: 'Login Failed',
                text: data.message || "Login failed!",
                confirmButtonColor: '#d33'
            });
        }
    }
    catch (err) {
        console.error("Login Error:", err);
        Swal.fire({
            icon: 'error',
            title: 'Connection Error',
            text: 'Unable to connect to the server.',
            confirmButtonColor: '#d33'
        });
    }
});

//// 5. Flatpickr Date Restriction Logic

document.addEventListener('DOMContentLoaded', function() {
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    if (startDateInput && endDateInput) {
        const today = new Date(); // Start Date Config
        const minDateForStart = new Date(today);
        minDateForStart.setDate(today.getDate() - 10);
        const maxDateForStart = new Date(today);
        maxDateForStart.setDate(today.getDate() + 60);
        const fpStartDate = flatpickr(startDateInput, {
            dateFormat: "d-m-Y",
            allowInput: false,
            minDate: minDateForStart,
            maxDate: maxDateForStart,
            disableMobile: true,
            onChange: function(selectedDates, dateStr, instance) {
                if (selectedDates.length > 0) {
                    const startDate = selectedDates[0];
                    const maxEndDate = new Date(startDate);
                    maxEndDate.setDate(startDate.getDate() + 60);
                    fpEndDate.set('minDate', startDate);
                    fpEndDate.set('maxDate', maxEndDate);
                    endDateInput.disabled = false;
                    if (fpEndDate.selectedDates.length > 0 && fpEndDate.selectedDates[0] > maxEndDate) {
                        fpEndDate.clear();
                    }
                } else {
                    fpEndDate.clear();
                    fpEndDate.set('minDate', null);
                    fpEndDate.set('maxDate', null);
                    endDateInput.disabled = true;
                }
            }
        });
        const fpEndDate = flatpickr(endDateInput, {     // --- End Date Config
            dateFormat: "d-m-Y",
            allowInput: false,
            disableMobile: true,
            minDate: null,
            maxDate: null,
        });
        endDateInput.disabled = true;
    }
});

// 6. Global Exports

window.toggleSignupFields = typeof toggleSignupFields !== 'undefined' ? toggleSignupFields : function(){};