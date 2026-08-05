

let idTimeout; // অটো-হাইডের টাইমার রাখার জন্য
let realMemberID = ""; // আসল আইডি জমা রাখার জন্য
let isEditMode = false;



//

document.addEventListener('DOMContentLoaded', function() {
    const cachedPic = localStorage.getItem('userProfilePic');
    if (cachedPic) document.getElementById('display-pic').src = cachedPic;
    loadProfileData();
});

// 

// ২. একাউন্ট এক্টিভেশন (OTP/Member ID ভেরিফাই)
async function verifyActivation() {
    // ১. ইউজার ইনপুট বক্স থেকে আইডিটা নিল (ইমেইল থেকে যেটা পেয়েছে)
    const enteredID = document.getElementById('otp-input').value.trim();
    const phone = localStorage.getItem('userPhone');
    const role = localStorage.getItem('userRole');

    if (!enteredID) return Swal.fire({ icon: 'warning', title: 'Attention', text: 'দয়া করে ইমেইলে পাওয়া আইডিটি এখানে দিন।', confirmButtonColor: '#3182ce' });

    try {
        // ২. সার্ভারের কাছে রিকোয়েস্ট পাঠানো হচ্ছে আইডি চেক করার জন্য
       const token = localStorage.getItem('token') || sessionStorage.getItem('token');

const response = await fetch(API + '/api/auth/activate-account', {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // 👈 নতুন যুক্ত হলো
    },
    body: JSON.stringify({ phone, role, enteredID })
});

        const data = await response.json();

        if (response.ok) {
            Swal.fire({
                icon: 'success',
                title: 'Activated!',
                text: 'অভিনন্দন! আপনার অ্যাকাউন্ট এখন অ্যাক্টিভ।',
                confirmButtonColor: '#38a169'
            }).then(() => {
                localStorage.setItem('userStatus', 'active');
                location.reload(); 
            });
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: data.message || "ভুল আইডি! আবার চেষ্টা করুন।", confirmButtonColor: '#e53e3e' });
        }
    } catch (err) {
        console.error("Verification Error:", err);
        Swal.fire({ icon: 'error', title: 'Server Error', text: 'সার্ভার কানেকশন এরর! নিশ্চিত করুন সার্ভার চালু আছে।', confirmButtonColor: '#e53e3e' });
    }
}

// ৩. এডিট মোড টগল করা
// profile.js (পুরো ফাংশন রিপ্লেস)
function toggleEditMode() {
    isEditMode = !isEditMode;
    const inputs = document.querySelectorAll('.edit-input');
    const saveActions = document.getElementById('save-actions');
    const editBtn = document.getElementById('edit-toggle-btn');
    const emailBtn = document.getElementById('verify-email-btn');
    const phoneBtn = document.getElementById('verify-phone-btn');
    
    document.getElementById('info-room').disabled = !isEditMode;
    document.getElementById('info-nickname').disabled = !isEditMode;
    document.getElementById('info-semester').disabled = !isEditMode;
    inputs.forEach(input => input.disabled = !isEditMode);
    
    if (isEditMode) {
        saveActions.classList.remove('hidden');
        editBtn.classList.add('hidden');

        // অরিজিনাল ডাটা যা লোড হওয়ার সময় স্টোরেজে রাখা হয়েছিল
        const originalEmail = localStorage.getItem('userEmail');
        const originalPhone = localStorage.getItem('userPhone');

        // ইমেইল চেক
        const emailInput = document.getElementById('info-email');
        emailInput.oninput = function() {
            if (this.value.trim() !== originalEmail && this.value.trim() !== "") {
                emailBtn.classList.remove('hidden');
            } else {
                emailBtn.classList.add('hidden');
            }
        };

        // ফোন চেক
        const phoneInput = document.getElementById('info-phone');
        phoneInput.oninput = function() {
            if (this.value.trim() !== originalPhone && this.value.trim() !== "") {
                phoneBtn.classList.remove('hidden');
            } else {
                phoneBtn.classList.add('hidden');
            }
        };

    } else {
        saveActions.classList.add('hidden');
        editBtn.classList.remove('hidden');
        emailBtn.classList.add('hidden');
        phoneBtn.classList.add('hidden');
    }
}

// প্রোফাইল পিকচার প্রিভিউ এবং আপলোড হ্যান্ডলার
// ১. HTML এলিমেন্টগুলো সিলেক্ট করা (নিশ্চিত হয়ে নিন আপনার HTML এ এই ID গুলো আছে)
const picUpload = document.getElementById('pic-upload'); // <input type="file">
const displayPic = document.getElementById('display-pic'); // <img> tag

if (picUpload) {
    picUpload.addEventListener('change', function(e) {
        const file = e.target.files[0];
        
        if (file) {
            // ছবির সাইজ চেক (২ এমবি লিমিট)
            if (file.size > 2 * 1024 * 1024) { 
                Swal.fire({ icon: 'warning', title: 'Too Large', text: 'Image is too large! Please select a picture under 2MB.', confirmButtonColor: '#3182ce' });
                return;
            }

            const reader = new FileReader();
            
            reader.onload = function(event) {
                const img = new Image();
                img.src = event.target.result;

                img.onload = function() {
                    // --- কম্প্রেশন লজিক ---
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    const maxWidth = 500; 
                    const scale = maxWidth / img.width;
                    canvas.width = maxWidth;
                    canvas.height = img.height * scale;

                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    // ছবিকে হালকা করা (JPEG, 0.6 quality)
                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);

                    // UI আপডেট
                    displayPic.src = compressedBase64;

                    // ডাটাবেসে পাঠানো
                    uploadProfilePicToDB(compressedBase64); 
                };
            };
            
            reader.readAsDataURL(file);
        }
    }); // এই ব্র্যাকেটগুলো আপনার আগের কোডে হয়তো মিসিং ছিল
}

/// ## 

async function uploadProfilePicToDB(base64Image) {
    // আপনার LocalStorage-এর সঠিক কী (Key) ব্যবহার করা হলো
    const phone = localStorage.getItem('userPhone'); 
    const role = localStorage.getItem('userRole');

    if (!phone || !role) {
        Swal.fire({
            icon: 'error',
            title: 'Session Error',
            text: 'Please login again.',
            confirmButtonColor: '#e53e3e'
        });
        return;
    }

    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');

const response = await fetch(API + '/api/update-profile-pic', {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // 👈 নতুন যুক্ত হলো
    },
    body: JSON.stringify({ 
        phone: phone, 
        role: role, 
        imageData: base64Image 
    })
});

        const result = await response.json();
        if (response.ok) {
            localStorage.setItem('userProfilePic', base64Image);
            Swal.fire({ icon: 'success', title: 'Updated', text: 'Success! Profile picture updated in DB.', confirmButtonColor: '#38a169' });
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: "Error: " + result.message, confirmButtonColor: '#e53e3e' });
        }
    } catch (err) {
        console.error("Upload failed:", err);
    }
}

/// ##

async function loadProfileData() {
    const phone = localStorage.getItem('userPhone') || sessionStorage.getItem('userPhone');
    const role = localStorage.getItem('userRole') || sessionStorage.getItem('userRole');

    if (!phone) return;

    try {
        // ১. ডাটাবেস থেকে ইউজারের লেটেস্ট ডাটা ফেচ করা
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');

const response = await fetch(API + `/api/get-user-data?phone=${phone}&role=${role}`, {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${token}` // 👈 নতুন যুক্ত হলো
    }
});
        const user = await response.json();

        if (response.ok && user) {
            
            // --- গুরুত্বপূর্ণ: তুলনা করার জন্য ডাটা স্টোরেজে রাখা শুরু ---
            localStorage.setItem('userEmail', user.email || "");
            localStorage.setItem('userPhone', user.phone || "");
            localStorage.setItem('userName', user.name || "");
            // --- শেষ ---

            // ২. নাম এবং নামের নিচের রোল ব্যাজ আপডেট
            if(document.getElementById('view-name')) document.getElementById('view-name').innerText = user.name;
            
            const roleContainer = document.getElementById('role-badge-container');
            if (roleContainer) {
                const roleBg = user.role === 'manager' ? '#2ecc71' : '#3498db';
                roleContainer.innerHTML = `<span class="badge" style="background:${roleBg}; display: inline-block; margin-top: 5px; padding: 3px 12px; border-radius: 20px; font-size: 11px;">${user.role.toUpperCase()}</span>`;
            }

            // ৩. Basic Information সেকশন
            document.getElementById('info-name').value = user.name || "";
            document.getElementById('info-email').value = user.email || "Not set";
            document.getElementById('info-phone').value = user.phone || "";
            document.getElementById('info-nickname').value = user.nickname || "";
            document.getElementById('info-semester').value = user.semester || "";

            
            
            const roomInput = document.getElementById('info-room');
            if(roomInput) {
                roomInput.value = (user.roomNo && user.roomNo !== "null" && user.roomNo !== "Not Assigned") ? user.roomNo : "";
                roomInput.disabled = true; 
            }

            const nickInput = document.getElementById('info-nickname');
            if(nickInput) {
                nickInput.value = user.nickname || "";
                nickInput.disabled = true;
            }

            const semInput = document.getElementById('info-semester');
            if(semInput) {
                semInput.value = user.semester || "";
                semInput.disabled = true;
            }

            // ৪. মেম্বার আইডি এবং স্ট্যাটাস ব্যানার
            // ৪. মেম্বার আইডি এবং স্ট্যাটাস চেক
            const idDisplay = document.getElementById('info-member-id');
            if (idDisplay) {
                // এখানে পরিবর্তন: মেম্বার আইডি না থাকলে ম্যানেজার আইডি চেক করবে
                realMemberID = user.memberID || user.managerID || "NOT SET"; 
                
                idDisplay.innerText = "********"; 
                idDisplay.style.cursor = "pointer";

                // Click korle toggle function call hobe
                idDisplay.onclick = function() {
                    if (user.status === 'active') {
                        toggleMemberID();
                    } 
                };
            }

            // --- ৫. রিসেট বাটন কন্ট্রোল (নতুন লজিক) ---
            const resetBtn = document.getElementById('reset-id-btn'); // আপনার HTML বাটনের আইডি

            if (resetBtn) {
                if (user.status === 'pending') {
                    // যদি পেন্ডিং থাকে তবে বাটনটি লক থাকবে
                    resetBtn.disabled = true;
                    resetBtn.style.opacity = "0.5";
                    resetBtn.style.cursor = "not-allowed";
                    resetBtn.title = "Verify your current ID first!";
                    // আপনি চাইলে বাটনের টেক্সটও বদলে দিতে পারেন
                    resetBtn.innerHTML = '<i class="fas fa-lock"></i> Verification Pending';
                } 
                else if (user.status === 'active') {
                    // শুধুমাত্র একটিভ থাকলেই বাটনটি কাজ করবে
                    resetBtn.disabled = false;
                    resetBtn.style.opacity = "1";
                    resetBtn.style.cursor = "pointer";
                    resetBtn.innerHTML = '<i class="fas fa-sync"></i> Reset & Send New ID';
                }
            }

            // status check korbe

            const getIDBtn = document.getElementById('send-otp-btn'); // আপনার HTML বাটনের আইডি
            if (user.status === 'active') {
                if (getIDBtn) {
                    getIDBtn.disabled = true; // বাটনটি ক্লিক করা যাবে না
                    getIDBtn.style.opacity = "0.6"; // বাটনটা একটু ঝাপসা দেখাবে
                    getIDBtn.innerHTML = '<i class="fas fa-check-circle"></i> ID Active';
                }
                // স্ট্যাটাস ব্যানার হাইড করা (যদি চান)
                const banner = document.getElementById('status-banner');
                if (banner) banner.style.display = 'none';
            }

            // updateStatusUI ফাংশনটি কল করা
            if (typeof updateStatusUI === "function") {
                updateStatusUI(user.status);
            }

            // ৫. প্রোফাইল ছবি
            if (user.profilePic) {
                document.getElementById('display-pic').src = user.profilePic;
                localStorage.setItem('userProfilePic', user.profilePic);
            }
        }
    } catch (err) {
        console.error("Error loading profile from DB:", err);
    }
}

// ##

function toggleMemberID() {
    const display = document.getElementById('info-member-id');
    
    if (display.innerText === "********") {
        display.innerText = realMemberID; 
        display.style.color = (realMemberID === "NOT SET") ? "red" : "#3498db";

        // ৫ সেকেন্ড পর অটো-হাইড করার টাইমার (৫০০০ মানে ৫ সেকেন্ড)
        clearTimeout(idTimeout); 
        idTimeout = setTimeout(() => {
            hideMemberID();
        }, 5000); 
    } else {
        hideMemberID();
    }
}

function hideMemberID() {
    const display = document.getElementById('info-member-id');
    if (display) {
        display.innerText = "********";
        display.style.color = ""; // আগের কালারে ফিরে যাবে
    }
    clearTimeout(idTimeout);
}


//genarate unique id

async function sendActivationEmail() {
    const name = document.getElementById('info-nickname') ? document.getElementById('info-nickname').value.trim() : '';
    const nickname = document.getElementById('info-nickname') ? document.getElementById('info-nickname').value.trim() : '';
    const semester = document.getElementById('info-semester') ? document.getElementById('info-semester').value.trim() : '';
    const email = document.getElementById('info-email').value.trim();
    const roomNo = document.getElementById('info-room').value.trim();
    const phone = localStorage.getItem('userPhone');
    const role = localStorage.getItem('userRole');

    // ডাটা চেক (নিকনেম এবং সেমিস্টার বাধ্যতামূলক করা হলো)
    if (!name || !email || !nickname || !semester || !roomNo || roomNo === "Not Assigned") {
        return Swal.fire({ icon: 'warning', title: 'Incomplete', text: 'আইডি পাওয়ার আগে দয়া করে নাম, ইমেইল, নিকনেম, সেমিস্টার এবং রুম নম্বর সেভ করে নিন।', confirmButtonColor: '#3182ce' });
    }

    const btn = document.getElementById('send-otp-btn');
    if (btn) {
        btn.disabled = true;
        btn.innerText = "Sending...";
    }

    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');

const response = await fetch(API + '/api/auth/reset-member-id', {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // 👈 নতুন যুক্ত হলো
    },
    body: JSON.stringify({ phone, role, nickname, semester, email, roomNo })
});

        const data = await response.json();
        if (response.ok) {
            Swal.fire({ icon: 'success', title: 'Sent', text: 'সফল! আপনার ইমেইল চেক করুন, আইডি পাঠানো হয়েছে।', confirmButtonColor: '#38a169' });
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: data.message, confirmButtonColor: '#e53e3e' });
        }
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'সার্ভার কানেকশন এরর!', confirmButtonColor: '#e53e3e' });
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> Get ID in Email';
        }
    }
}


async function resetMemberID() {
    const name = document.getElementById('info-name').value;
    const roomNo = document.getElementById('info-room').value;
    const email = document.getElementById('info-email').value;
    const phone = localStorage.getItem('userPhone');
    const role = localStorage.getItem('userRole'); // রোল পাঠানো জরুরি

    // সব ফিল্ড চেক করা
    if (!name || !roomNo || roomNo === "Not Assigned" || !email) {
        return Swal.fire({ icon: 'warning', title: 'Attention', text: 'ID জেনারেট করার আগে নাম, ইমেইল এবং রুম নম্বর সেট করুন!', confirmButtonColor: '#3182ce' });
    }

    // কনফার্মেশন এর জন্যও  ব্যবহার করা যায়
    const confirmResult = await Swal.fire({
        title: 'Are you sure?',
        text: "আপনি কি নতুন ID জেনারেট করতে চান? আপনার একাউন্ট আবার 'Pending' হয়ে যাবে।",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, generate!'
    });

    if (!confirmResult.isConfirmed) return;

    try {
        // রুটটি server.js এর সাথে মিলিয়ে লিখুন
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');

const response = await fetch(API + '/api/auth/reset-member-id', {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // 👈 নতুন যুক্ত হলো
    },
    body: JSON.stringify({ 
        phone,
        role, 
        name, 
        roomNo, 
        email 
    })
});

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('userStatus', 'pending');
            Swal.fire({
                icon: 'success',
                title: 'Generated!',
                text: 'নতুন ইউনিক আইডি আপনার ইমেইলে পাঠানো হয়েছে!',
                confirmButtonColor: '#38a169'
            }).then(() => {
                window.location.href = "/frontend/HTML/member.html";
                location.reload(); 
            });
        } else {
            Swal.fire({ icon: 'error', title: 'Failed', text: data.message || "আইডি জেনারেট করা যায়নি।", confirmButtonColor: '#e53e3e' });
        }
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'সার্ভার এরর! কানেকশন চেক করুন।', confirmButtonColor: '#e53e3e' });
    }
}

//

let currentUpdateData = {}; 

async function sendChangeOTP(type) {
    // ১. সঠিক ইনপুট ফিল্ড থেকে ভ্যালু নেওয়া
    const inputField = document.getElementById(type === 'email' ? 'info-email' : 'info-phone');
    if (!inputField) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Input field not found!',
            confirmButtonColor: '#e53e3e'
        });
        return;
    }
    
    const newValue = inputField.value.trim();
    const originalValue = type === 'email' ? localStorage.getItem('userEmail') : localStorage.getItem('userPhone');

    // ২. ভ্যালিডেশন
    if (newValue === originalValue) {
        return Swal.fire({ icon: 'info', title: 'No Change', text: 'আপনি তো নতুন কিছু লেখেননি!', confirmButtonColor: '#3182ce' });
    }

    // ৩. টাইপ অনুযায়ী সঠিক URL সেট করা (ইমেইল বনাম ফোন)
    const endpoint = type === 'email' 
        ? '/api/auth/send-email-change-otp' 
        : '/api/auth/send-phone-change-otp';

    const modal = document.getElementById('otp-modal');
    const msg = document.getElementById('otp-message');
    modal.style.display = 'flex'; 
    msg.innerText = "Sending code..."; 

    try {
        // ৪. সার্ভারে রিকোয়েস্ট পাঠানো
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');

const res = await fetch(API + `${endpoint}`, {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // 👈 নতুন যুক্ত হলো
    },
    body: JSON.stringify({ 
        email: type === 'email' ? newValue : null, 
        type: type,
        role: localStorage.getItem('userRole'),
        currentPhone: localStorage.getItem('userPhone')
    })
});

        const data = await res.json();
        
        if (res.ok) {
            msg.innerText = `Enter the 4-digit code sent to your ${type}: ${newValue}`;
            
            window.currentUpdateData = { 
                type: type, 
                newValue: newValue, 
                currentPhone: localStorage.getItem('userPhone'),
                role: localStorage.getItem('userRole')
            };
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: data.message || "ওটিপি পাঠাতে সমস্যা হয়েছে।", confirmButtonColor: '#e53e3e' });
            closeOtpModal();
        }
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Connection Error', text: 'সার্ভার কানেকশন এরর! নিশ্চিত করুন আপনার সার্ভার (Port 5000) চালু আছে।', confirmButtonColor: '#e53e3e' });
        closeOtpModal();
    }
}


//

async function confirmProfileUpdate() {
    const userOtp = document.getElementById('change-otp-input').value.trim();

    // চেক করা হচ্ছে ডাটাগুলো আছে কি না
    if (!window.currentUpdateData) {
        return Swal.fire({ icon: 'error', title: 'Error', text: 'Data error! Please try again.', confirmButtonColor: '#e53e3e' });
    }
    if (!userOtp) {
        return Swal.fire({ icon: 'warning', title: 'Attention', text: 'দয়া করে ওটিপি কোডটি দিন!', confirmButtonColor: '#3182ce' });
    }

    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');

const updateRes = await fetch(API + '/api/auth/verify-and-update-profile', {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // 👈 নতুন যুক্ত হলো
    },
    body: JSON.stringify({ 
        phone: window.currentUpdateData.currentPhone, 
        role: window.currentUpdateData.role, 
        type: window.currentUpdateData.type, 
        newValue: window.currentUpdateData.newValue, 
        otp: userOtp
    })
});

        const updateData = await updateRes.json();

        if (updateRes.ok) {
            Swal.fire({
                icon: 'success',
                title: 'Updated!',
                text: `অভিনন্দন! আপনার ${window.currentUpdateData.type === 'email' ? 'ইমেইল' : 'ফোন নম্বর'} সফলভাবে পরিবর্তন হয়েছে।`,
                confirmButtonColor: '#38a169'
            }).then(() => {
                if(window.currentUpdateData.type === 'email') localStorage.setItem('userEmail', window.currentUpdateData.newValue);
                if(window.currentUpdateData.type === 'phone') localStorage.setItem('userPhone', window.currentUpdateData.newValue);
                location.reload(); 
            });
        } else {
            Swal.fire({ icon: 'error', title: 'Failed', text: updateData.message, confirmButtonColor: '#e53e3e' });
        }
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'সার্ভার এরর! আপডেট করা যায়নি।', confirmButtonColor: '#e53e3e' });
    }
}
//
function closeOtpModal() {
    const modal = document.getElementById('otp-modal');
    modal.style.display = 'none'; // ডিসপ্লে বন্ধ করা
    modal.classList.add('hidden'); // hidden ক্লাস আবার যোগ করা
    document.getElementById('change-otp-input').value = ""; // ইনপুট ক্লিয়ার করা
}

//

// ওটিপি রিসেন্ড করার ফাংশন
function resendProfileOTP() {
    if (!window.currentUpdateData || !window.currentUpdateData.type) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No pending update found!',
            confirmButtonColor: '#e53e3e'
        });
        return;
    }

    // বাটনের টেক্সট পরিবর্তন করে ইউজারকে ফিডব্যাক দেওয়া
    const resendBtn = document.getElementById('resend-timer');
    const originalText = resendBtn.innerText;
    resendBtn.innerText = "Sending...";
    resendBtn.style.pointerEvents = "none"; // বার বার ক্লিক করা বন্ধ করা

    // আগের ডাটা ব্যবহার করে আবার ওটিপি পাঠানো
    sendChangeOTP(window.currentUpdateData.type);

    // ৫ সেকেন্ড পর আবার ক্লিক করার সুযোগ দেওয়া
    setTimeout(() => {
        resendBtn.innerText = "Resend Now";
        resendBtn.style.pointerEvents = "auto";
    }, 5000);
}

//

async function saveProfile() {
    // ইনপুট ফিল্ড থেকে বর্তমান ভ্যালু নেওয়া
    const name = document.getElementById('info-name').value.trim();
    const nickname = document.getElementById('info-nickname').value.trim();
    const roomNo = document.getElementById('info-room').value.trim();
    const semester = document.getElementById('info-semester').value.trim();
    
    // লোকাল স্টোরেজ থেকে ইউজারের তথ্য নেওয়া
    const userPhone = localStorage.getItem('userPhone');
    const userRole = localStorage.getItem('userRole'); // 'manager' অথবা 'member'

    // নাম, রুম নম্বর ছাড়াও এখন নিকনেম এবং সেমিস্টার বাধ্যতামূলক করা হলো
    if (!name || !nickname || !roomNo || !semester) {
        return Swal.fire({ icon: 'warning', title: 'Incomplete', text: 'নাম, নিকনেম, রুম নম্বর এবং সেমিস্টার—সবগুলো তথ্য অবশ্যই দিতে হবে!', confirmButtonColor: '#3182ce' });
    }

    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');

const res = await fetch(API + '/api/auth/update-basic-info', {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // 👈 নতুন যুক্ত হলো
    },
    body: JSON.stringify({ 
        phone: userPhone, 
        role: userRole, 
        name: name, 
        nickname: nickname,
        roomNo: roomNo,
        semester: semester 
    })
});

        const data = await res.json();

        if (res.ok) {
            Swal.fire({
                icon: 'success',
                title: 'Saved',
                text: 'সফলভাবে সেভ হয়েছে!',
                confirmButtonColor: '#38a169'
            }).then(() => {
                localStorage.setItem('userName', name);
                location.reload(); 
            });
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: data.message, confirmButtonColor: '#e53e3e' });
        }
    } catch (err) {
        console.error("Save Profile Error:", err);
        Swal.fire({
            icon: 'error',
            title: 'Connection Error',
            text: 'সার্ভারের সাথে যোগাযোগ করা যাচ্ছে না!',
            confirmButtonColor: '#e53e3e'
        });
    }
}

// 
function cancelEdit() {
    // এডিট মোড বন্ধ করা
    isEditMode = false;
    
    // পেজ রিলোড দিয়ে আগের অরিজিনাল ডাটা ফিরিয়ে আনা
    location.reload(); 
}

///// ###

// ১. মোডাল ওপেন করার ফাংশন
function openChangePasswordModal() {
    const modal = document.getElementById('password-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// ২. মোডাল ক্লোজ করার ফাংশন
function closePasswordModal() {
    const modal = document.getElementById('password-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    // ইনপুট ফিল্ডগুলো ক্লিয়ার করে দেওয়া যাতে পরে আবার ওপেন করলে খালি থাকে
    document.getElementById('old-pass').value = '';
    document.getElementById('new-pass').value = '';
    document.getElementById('confirm-new-pass').value = '';
}

// ৩. পাসওয়ার্ড আপডেট করার মেইন ফাংশন
async function updatePassword() {
    const oldPass = document.getElementById('old-pass').value;
    const newPass = document.getElementById('new-pass').value;
    const confirmNewPass = document.getElementById('confirm-new-pass').value;
    
    const phone = localStorage.getItem('userPhone');
    const role = localStorage.getItem('userRole');

    // ১. সবগুলো ফিল্ড পূরণ করা হয়েছে কি না
    if (!oldPass || !newPass || !confirmNewPass) {
        return Swal.fire({ icon: 'warning', title: 'Attention', text: 'সবগুলো ফিল্ড পূরণ করুন!', confirmButtonColor: '#3182ce' });
    }

    // ২. নতুন পাসওয়ার্ড এবং কনফার্ম পাসওয়ার্ড একই কি না
    if (newPass !== confirmNewPass) {
        return Swal.fire({ icon: 'warning', title: 'Mismatch', text: 'নতুন পাসওয়ার্ড দুটি মিলছে না!', confirmButtonColor: '#3182ce' });
    }

    // ৩. নতুন পাসওয়ার্ড পুরনোটার মতো কি না (Security Check)
    if (oldPass === newPass) {
        return Swal.fire({ icon: 'warning', title: 'Attention', text: 'নতুন পাসওয়ার্ড পুরনো পাসওয়ার্ড থেকে আলাদা হতে হবে!', confirmButtonColor: '#3182ce' });
    }

    if (newPass.length < 6) {
        return Swal.fire({ icon: 'warning', title: 'Short Password', text: 'নতুন পাসওয়ার্ড কমপক্ষে ৬ ডিজিটের হতে হবে!', confirmButtonColor: '#3182ce' });
    }

    const updateBtn = document.querySelector('#password-modal .btn-primary');
    const originalText = updateBtn.innerText;
    updateBtn.innerText = "Updating...";
    updateBtn.disabled = true;

    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');

const response = await fetch(API + '/api/auth/update-password', {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // 👈 নতুন যুক্ত হলো
    },
    body: JSON.stringify({ phone, role, oldPass, newPass })
});

        const data = await response.json();

        if (response.ok) {
            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে! ✅',
                confirmButtonColor: '#38a169'
            });
            closePasswordModal();
        } else {
            Swal.fire({ icon: 'error', title: 'Failed', text: data.message || "পাসওয়ার্ড পরিবর্তন করা সম্ভব হয়নি।", confirmButtonColor: '#e53e3e' });
        }
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Error', text: 'সার্ভার এরর! কানেকশন চেক করুন।', confirmButtonColor: '#e53e3e' });
    } finally {
        updateBtn.innerText = originalText;
        updateBtn.disabled = false;
    }
}
//
function toggleVisibility(inputId, icon) {
    const input = document.getElementById(inputId);
    if (input.type === "password") {
        input.type = "text";
        icon.classList.replace("fa-eye", "fa-eye-slash");
    } else {
        input.type = "password";
        icon.classList.replace("fa-eye-slash", "fa-eye");
    }
}