// ../JS/pass-otp.js

//1. Forget Pass Model open & close

// 1.1 Model Open

document.querySelector('.forgot-link a')?.addEventListener('click', function(e) {
    e.preventDefault();
    document.getElementById('otp-modal').classList.remove('hidden');
});

// 1.2 Model Close

function closeOtpModal() {
    document.getElementById('otp-modal').classList.add('hidden');
    document.getElementById('otp-step-1').classList.remove('hidden');
    document.getElementById('otp-step-2').classList.add('hidden');
}

// 2. Send OTP Role wise 

// 2. Send OTP Role wise 

async function sendOTP() {
    const emailInput = document.getElementById('otp-email');
    const roleInput = document.getElementById('otp-role'); 
    const resendLink = document.getElementById('resend-link');
    
    if (!emailInput || !emailInput.value) {     
        return Swal.fire({ icon: 'warning', title: 'Attention', text: 'Enter your registered email address.', confirmButtonColor: '#3182ce' });
    }
    if (!roleInput || !roleInput.value) {       
        return Swal.fire({ icon: 'warning', title: 'Attention', text: 'Select your role (Manager/Member).', confirmButtonColor: '#3182ce' });
    }
    
    const email = emailInput.value;
    const role = roleInput.value;

    try {
        const response = await fetch(API + '/api/auth/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, role: role })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            Swal.fire({ icon: 'success', title: 'Success', text: 'OTP sent to your email.', confirmButtonColor: '#38a169' });
            
            // 🌟 একদম সরাসরি ডম ম্যানিপুলেশন (DOM Manipulation)
            const step1 = document.getElementById('otp-step-1');
            const step2 = document.getElementById('otp-step-2');
            
            if (step1) {
                step1.style.display = 'none'; // স্টেপ ১ লুকায়ে ফেলবে
            }
            if (step2) {
                step2.style.display = 'block'; // স্টেপ ২ সামনে নিয়ে আসবে
            }

            // Resend OTP Logic With 60s timer
            if (resendLink) {
                resendLink.style.pointerEvents = "none";
                resendLink.style.color = "#888";
                let timeLeft = 60;
                const countdown = setInterval(() => {
                    if (timeLeft <= 0) {
                        clearInterval(countdown);
                        resendLink.innerText = "Resend OTP";
                        resendLink.style.pointerEvents = "auto";
                        resendLink.style.color = "#3498db";
                    } else {
                        resendLink.innerText = `Resend in ${timeLeft}s`;
                        timeLeft--;
                    }
                }, 1000);
            }
        } else {
            Swal.fire({ icon: 'error', title: 'Failed', text: data.message || "Unable to send OTP.", confirmButtonColor: '#e53e3e' });
        }
    } catch (err) {
        console.error("Fetch Error:", err);
        Swal.fire({ icon: 'error', title: 'Connection Error', text: 'Unable to connect to the server.', confirmButtonColor: '#e53e3e' });
    }
}

// 3. Verify OTP and Reset Pass

async function verifyAndReset() {
    const email = document.getElementById('otp-email').value;
    const role = document.getElementById('otp-role').value;
    const otp = document.getElementById('otp-code').value;
    const newPassword = document.getElementById('otp-new-password').value;
    if (!otp || !newPassword) {
        return Swal.fire({ icon: 'warning', title: 'Attention', text: 'Enter OTP and new password.', confirmButtonColor: '#3182ce' });
    }
    try {
        const response = await fetch(API + '/api/auth/verify-otp-reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, role, otp, newPassword })
        });
        const data = await response.json();
        if (response.ok) {
            Swal.fire({ 
                icon: 'success', 
                title: 'Success', 
                text: 'Password updated successfully. Please log in now.', 
                confirmButtonColor: '#38a169' 
            }).then(() => {
                location.reload();
            });
        } else {
            Swal.fire({ icon: 'error', title: 'Verification Failed', text: data.message || "Verification failed.", confirmButtonColor: '#e53e3e' });
        }
    } catch (err) {
        console.error("Reset Error:", err);
        Swal.fire({ icon: 'error', title: 'Error', text: 'Unable to reset.', confirmButtonColor: '#e53e3e' });
    }
}

// 4. Pass Show & Hide Logic

 document.addEventListener('click', function(e) {
     const toggleBtn = e.target.closest('.password-toggle');
    if (toggleBtn) {
        e.preventDefault(); 
        const targetId = toggleBtn.getAttribute('data-target');
        const input = document.getElementById(targetId);
        const icon = toggleBtn.querySelector('i');
        if (input && icon) {
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        }
    }
});

///5. Global Export (From Html)

window.sendOTP = sendOTP;
window.verifyAndReset = verifyAndReset;
window.closeOtpModal = closeOtpModal;