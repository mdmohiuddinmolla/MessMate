// ==========================================
// 1. Global Variables and API Configuration
// ==========================================
if (typeof window.membersData === 'undefined') {
    window.membersData = []; 
}
const API_URL = API + '/api/members';
const memberListBody = document.getElementById('member-list-body');
const searchInput = document.getElementById('member-search-input');
const addMemberModal = document.getElementById('add-member-modal');
const addMemberBtn = document.getElementById('add-member-btn');
const closeBtn = addMemberModal ? addMemberModal.querySelector('.close-btn') : null; 
const addMemberForm = document.getElementById('add-member-form');
const darkModeToggle = document.getElementById('global-theme-toggle');

// Global state for Term Activity
window.isTermActiveGlobal = false;

// ==========================================
// 2. Authentication & Profile Helpers
// ==========================================
// member.js এর getAuthData() ফাংশনটি এভাবে আপডেট করুন
async function getAuthData() {
    
    
    const phone = localStorage.getItem('userPhone') || sessionStorage.getItem('userPhone'); 
    // লগইন করার সময় সাধারণত রোল স্টোরেজ বা অন্য কোথাও সেভ থাকে, অথবা লোকালস্টোরেজ থেকে রোল নিতে পারেন
    const userRole = localStorage.getItem('userRole') || sessionStorage.getItem('userRole') || 'member'; 
    
    if (!phone) return { role: 'guest', status: 'inactive' }; 

    try {
        // রিকোয়েস্টে রোল যুক্ত করে পাঠানো হলো
       const token = localStorage.getItem('token') || sessionStorage.getItem('token');

const response = await fetch(API + `/api/auth/profile-info?phone=${phone}&role=${userRole}`, {
    headers: {
        'Authorization': `Bearer ${token}` // 👈 নতুন যুক্ত হলো
    }
});
        const user = await response.json();

        if (response.ok) {
            return user; 
        }
        return { role: 'guest', status: 'inactive' };
    } catch (err) {
        console.error("Auth Fetch Error:", err);
        return { role: 'guest', status: 'inactive' };
    }
}

async function getTermStatus() {
    try {
        const userPhone = localStorage.getItem('userPhone');
        if (!userPhone) return null;

        // ফোন নম্বরসহ রিকোয়েস্ট পাঠানো হচ্ছে
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');

const metaResponse = await fetch(API + `/api/active-term-status?phone=${userPhone}`, {
    headers: {
        'Authorization': `Bearer ${token}` // 👈 নতুন যুক্ত হলো
    }
});
        const metaData = await metaResponse.json();
        
        return metaData; // { buttonStatus: "already_active", termStart: "...", termEnd: "..." }
    } catch (err) {
        console.error("Error fetching term status:", err);
        return null;
    }
}

// ==========================================
// 3. Fetch & Render Members from Server
// ==========================================
async function fetchMembers() {
    try {
       const token = localStorage.getItem('token') || sessionStorage.getItem('token');

const response = await fetch(API_URL, { 
    cache: "no-store",
    headers: {
        'Authorization': `Bearer ${token}` // 👈 নতুন যুক্ত হলো
    }
});
        const resData = await response.json();

        // এপিআই থেকে ডাটা অ্যারে আকারে আসছে নাকি নতুন অবজেক্ট আকারে আসছে তা হ্যান্ডেল করা
        if (Array.isArray(resData)) {
            window.membersData = resData;
        } else {
            window.membersData = resData.members || [];
        }

        renderMembers(window.membersData);
        
        // ড্যাশবোর্ড কালেকশন ফাংশন কল করা
        calculateDashTotalCollection(); 
        
        if (typeof showTotalMessDeposit === 'function') showTotalMessDeposit();
    } catch (error) {
        console.error("Error fetching members:", error);
    }
}

function renderMembers(data) {
    const isLocked = !window.isTermActiveGlobal;
    
    if (!memberListBody) return;
    data.sort(customMemberSort);
    memberListBody.innerHTML = '';

    if (data.length === 0) {
        memberListBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #999;">No members found.</td></tr>';
        return;
    }

    data.forEach(member => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${member.roomID || ''}</td>
            <td>${member.name || ''}</td>
            <td>${member.semester || ''}</td>
            <td onclick="showHistory('${member._id}')" style="cursor: pointer; font-weight: bold; color: #2ecc71;" title="Click to view deposit details">
                ৳ ${member.deposit ? member.deposit.toLocaleString() : 0}
            </td>
            <td onclick="showMealDetails('${member._id}', '${member.name}')" 
                style="cursor: pointer; font-weight: bold; color: #3498db;" 
                title="Click to view meal details">
                ${member.totalMainGuestFine || 0}
            </td>
            <td class="action-buttons">
                <button class="edit-btn" title="Edit Info" onclick="editMember('${member._id}')"
                    ${isLocked ? 'disabled style="opacity:0.5; cursor:not-allowed"' : ''}>
                    <i class="fas fa-user-edit"></i>
                </button>
                
                <button class="deposit-btn" title="Add Deposit" onclick="updateDeposit('${member._id}', ${member.deposit || 0})"
                    ${isLocked ? 'disabled style="opacity:0.5; cursor:not-allowed"' : ''}>
                    <i class="fas fa-file-invoice-dollar"></i>
                </button>
                
                <button class="delete-btn" title="Delete" onclick="deleteMember('${member._id}')"
                    ${isLocked ? 'disabled style="opacity:0.5; cursor:not-allowed"' : ''}>
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        memberListBody.appendChild(row);
    });
}

// ==========================================
// Theme Handler for SweetAler8 2 (Dynamic)
// ==========================================
function getSwalTheme() {
    const isDark = document.body.classList.contains('dark-theme');
    
    // টগল বাটন কন্ট্রোল করার ফাংশন
    const toggleGlobalButtons = (disabled) => {
        const darkModeToggle = document.getElementById('global-theme-toggle');
        if (darkModeToggle) darkModeToggle.disabled = disabled;
    };

    return {
        background: isDark ? '#1e1e1e' : '#fff',
        color: isDark ? '#fff' : '#545454',
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        // পপআপ ওপেন হওয়ার সময় টগল ডিজেবল করা
        didOpen: () => {
            toggleGlobalButtons(true);
        },
        // পপআপ ক্লোজ হওয়ার সময় টগল এনাবল করা
        didClose: () => {
            toggleGlobalButtons(false);
        }
    };
}

// ==========================================
// 4. CRUD Operations (Add, Edit, Delete, Deposit)
// ==========================================
async function saveMemberToServer(newMember) {
    
    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');

const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // 👈 নতুন যুক্ত হলো
    },
    body: JSON.stringify(newMember) 
});
        const result = await response.json();

        if (response.ok) {
            Swal.fire({ 
                icon: 'success', 
                title: 'Member added! 🎉', 
                ...getSwalTheme(),
                showConfirmButton: false, 
                timer: 1500 
            });
            addMemberModal.style.display = 'none';
            addMemberForm.reset();
            fetchMembers(); 
        } else {
            Swal.fire({ icon: 'error', title: '⚠️ ' + result.message, ...getSwalTheme() });
        }
    } catch (error) {
        console.error("Error saving member:", error);
        Swal.fire({ icon: 'error', title: 'সার্ভারের সাথে কানেক্ট করা যাচ্ছে না!', ...getSwalTheme() });
    }
}

async function deleteMember(id) {
    if (!id || id === 'undefined') {
        Swal.fire({ icon: 'error', title: 'Invalid ID for deletion.', ...getSwalTheme() });
        return;
    }

    Swal.fire({
        title: 'Are you sure?',
        text: "You want to delete this member?",
        icon: 'warning',
        ...getSwalTheme(),
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem('token') || sessionStorage.getItem('token');

const response = await fetch(`${API_URL}/${id}`, { 
    method: 'DELETE',
    headers: {
        'Authorization': `Bearer ${token}` // 👈 নতুন যুক্ত হলো
    }
});
                if (response.ok) {
                    Swal.fire({ 
                        icon: 'success', 
                        title: 'Member deleted from Database! 🗑️', 
                        ...getSwalTheme(),
                        showConfirmButton: false, 
                        timer: 1500 
                    });
                    fetchMembers(); 
                } else {
                    Swal.fire({ icon: 'error', title: 'Failed to delete member from server.', ...getSwalTheme() });
                }
            } catch (error) {
                console.error("Error deleting member:", error);
            }
        }
    });
}

async function updateDeposit(id, currentDeposit) {
    if (!id || id === 'undefined') return;

    // ১. কত টাকা এড করবেন তার ইনপুট বক্স (ডাইনামিক থিম)
    const { value: addAmount } = await Swal.fire({
        title: 'Update Deposit',
        text: `Current: ৳${currentDeposit}`,
        input: 'text',
        inputPlaceholder: 'Enter Amount:',
        ...getSwalTheme(),
        showCancelButton: true,
        inputValidator: (value) => {
            if (!value || value.trim() === "" || isNaN(value)) {
                return 'Doya kore sothik takar poriman likhun!';
            }
        }
    });

    if (!addAmount) return; 

    const now = new Date();
    const todayStr = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;

    // ২. তারিখ ইনপুট বক্স (ডাইনামিক থিম)
    const { value: manualDateInput } = await Swal.fire({
        title: 'Tarikh din (DD-MM-YYYY)',
        input: 'text',
        inputValue: todayStr,
        ...getSwalTheme(),
        showCancelButton: true,
        inputValidator: (value) => {
            if (!value) return 'Tarikh dewa baddhotamuluk!';
        }
    });

    if (!manualDateInput) return;

    const parts = manualDateInput.split('-'); 
    const entryDateObj = new Date(parts[2], parts[1] - 1, parts[0]);

    if (isNaN(entryDateObj.getTime())) {
        Swal.fire({ icon: 'error', title: 'Invalid date! Please use DD-MM-YYYY format.', ...getSwalTheme() });
        return;
    }

    const isoDate = entryDateObj.toISOString(); 
    const amountToAdd = parseFloat(addAmount);
    const totalNewDeposit = currentDeposit + amountToAdd;

    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');

const response = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // 👈 নতুন যুক্ত হলো
    },
    body: JSON.stringify({ 
        deposit: totalNewDeposit,
        newDepositEntry: amountToAdd,
        manualDate: isoDate
    })
});
        if (response.ok) {
            Swal.fire({ 
                icon: 'success', 
                title: 'Deposit successful! ৳' + amountToAdd, 
                ...getSwalTheme(),
                showConfirmButton: false, 
                timer: 1500 
            });
            fetchMembers();
        } else {
            Swal.fire({ icon: 'error', title: 'Deposit failed on server.', ...getSwalTheme() });
        }
    } catch (error) { 
        console.error("Update error:", error); 
        Swal.fire({ icon: 'error', title: 'Server error occurred.', ...getSwalTheme() });
    }
}

async function editMember(id) {
    if (!id) return;
    const member = membersData.find(m => m._id === id);
    if (!member) return;

    // একবারে সব ইনপুট নেওয়ার জন্য HTML ফর্ম
    const { value: formValues } = await Swal.fire({
        title: 'Edit Member Details',
        html:
            `<input id="swal-input1" class="swal2-input" value="${member.name}" placeholder="Name">` +
            `<input id="swal-input2" class="swal2-input" value="${member.roomID}" placeholder="Room ID">` +
            `<input id="swal-input3" class="swal2-input" value="${member.semester}" placeholder="Semester">`,
        focusConfirm: false,
        preConfirm: () => {
            return [
                document.getElementById('swal-input1').value,
                document.getElementById('swal-input2').value,
                document.getElementById('swal-input3').value
            ]
        },
        ...getSwalTheme(),
        showCancelButton: true
    });

    if (!formValues) return; // যদি ইউজার cancel করে তবে আর কিছু হবে না

    const [finalName, finalID, finalSemester] = formValues;

    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');

const response = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // 👈 নতুন যুক্ত হলো
    },
    body: JSON.stringify({ 
        name: finalName, 
        roomID: finalID, 
        semester: finalSemester,
        deposit: member.deposit 
    })
});

        if (response.ok) {
            Swal.fire({ icon: 'success', title: 'Updated!', ...getSwalTheme(), timer: 1500 });
            await fetchMembers(); // ডাটা রিফ্রেশ করুন
        } else {
            Swal.fire({ icon: 'error', title: 'Update failed!', ...getSwalTheme() });
        }
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Server error!', ...getSwalTheme() });
    }
}

function handleAddMember(event) {
    event.preventDefault(); 
    const idValue = document.getElementById('new-room-id').value.trim();
    const nameValue = document.getElementById('new-member-name').value.trim();
    const semesterValue = document.getElementById('new-member-semester').value.trim();
    const depositValue = document.getElementById('new-member-deposit').value.trim();

    if (!idValue || !nameValue || !semesterValue) {
        Swal.fire({ icon: 'warning', title: 'দয়া করে সব ঘর পূরণ করুন!', ...getSwalTheme() });
        return;
    }

    const newMember = {
        roomID: idValue,          
        name: nameValue,
        semester: semesterValue,
        deposit: parseFloat(depositValue) || 0,
        totalMainMeal: 0,
        totalGuestMeal: 0,
        totalFineMeal: 0,
        totalMainGuestFine: 0,
        mainCookBill: 0,   // নতুন যোগ করা হলো
        guestCookBill: 0,  // নতুন যোগ করা হলো
        totalCookBill: 0
    };

    console.log("সার্ভারে পাঠানো হচ্ছে:", newMember);
    saveMemberToServer(newMember);
}

// ==========================================
// 5. Term Management & Actions
// ==========================================
async function autoFillManagerTerm() {
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const activeTermBtn = document.getElementById('active-term-btn');

    try {
        const response = await fetch(API + '/api/manager-profile', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (response.ok) {
            const managerData = await response.json();
            if (managerData.termStart && managerData.termEnd) {
                if (startDateInput) startDateInput.value = managerData.termStart; 
                if (endDateInput) endDateInput.value = managerData.termEnd;

                if (startDateInput) startDateInput.readOnly = true;
                if (endDateInput) endDateInput.readOnly = true;

                if (activeTermBtn) activeTermBtn.disabled = false;
                console.log("Term dates auto-filled successfully!");
            }
        }
    } catch (error) {
        console.error("Error auto-filling term dates:", error);
    }
}

async function handleSetTerm() {
    const startDateInput = document.getElementById('start-date'); 
    const auth = await getAuthData();

    if (!startDateInput.value || !auth.phone) {
        return Swal.fire({
            icon: 'warning',
            title: 'সতর্কতা!',
            text: 'টার্ম ডাটা পাওয়া যায়নি! লগইন নিশ্চিত করুন।',
            ...getSwalTheme() // থিম অ্যাপ্লাই করার জন্য
        });
    }

    const selectedTerm = startDateInput.value; 

    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');

const response = await fetch(API + '/api/active-term', {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // 👈 নতুন যুক্ত হলো
    },
    body: JSON.stringify({ 
        selectedTerm: selectedTerm, // অথবা termStart (যে ফাংশনে যা আছে)
        userPhone: auth.phone 
    })
});
        const result = await response.json();
        if (response.ok) {
            Swal.fire({
                icon: 'success',
                title: 'সফল!',
                text: 'Term Active Hoyeche! 🎉',
                ...getSwalTheme()
            }).then(() => {
                // ইউজার OK তে ক্লিক করার পর পেজ রিলোড হবে
                window.location.reload(); 
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'সমস্যা হয়েছে',
                text: "⚠️ " + result.message,
                ...getSwalTheme()
            });
        }
    } catch (error) {
        console.error("Error:", error);
        Swal.fire({
            icon: 'error',
            title: 'সার্ভার এরর',
            text: 'সার্ভারের সাথে যোগাযোগ করা যায়নি!',
            ...getSwalTheme()
        });
    }
}

async function handleActiveTerm() {
    const activeBtn = document.getElementById('active-term-btn'); // আপনার বাটনের সঠিক আইডি এখানে দেবেন
    
    // যদি বাটনে 'Term Expired' লেখা থাকে বা ডিসেবল করা থাকে, তবে ফাংশন এখানেই রিটার্ন করে দিবে
    if (activeBtn && (activeBtn.classList.contains('expired') || activeBtn.textContent.includes('Term Expired'))) {
        Swal.fire({
            icon: 'info',
            title: 'মেয়াদ উত্তীর্ণ',
            text: 'এই টার্মটির মেয়াদ শেষ হয়ে গেছে, তাই এটি আর একটিভ করা সম্ভব নয়।',
            ...getSwalTheme()
        });
        return;
    }

    const userPhone = localStorage.getItem('userPhone');
    const startDateVal = document.getElementById('start-date').value; 
    
    const endDateInput = document.getElementById('end-date'); 
    const endDateVal = endDateInput ? endDateInput.value : '';

    if (!startDateVal) {
        Swal.fire({
            icon: 'warning',
            title: 'সতর্কতা',
            text: 'ম্যানেজারের টার্ম ডেট পাওয়া যায়নি!',
            ...getSwalTheme()
        });
        return;
    }

    const formatDateToReadable = (dateStr) => {
        if (!dateStr) return '';
        const parts = dateStr.split('-'); 
        const day = parts[0];
        const monthIndex = parseInt(parts[1]) - 1;
        const year = parts[2];

        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        return `${day} ${monthNames[monthIndex]} ${year}`;
    };

    const formattedStartDate = formatDateToReadable(startDateVal);
    const formattedEndDate = formatDateToReadable(endDateVal);

    const confirmMessage = formattedEndDate 
        ? `${formattedStartDate} থেকে ${formattedEndDate} তারিখের টার্মটি একটিভ করতে চান?`
        : `${formattedStartDate} তারিখের টার্মটি একটিভ করতে চান?`;

    const confirmResult = await Swal.fire({
        title: 'টার্ম একটিভ করুন',
        text: confirmMessage,
        icon: 'question',
        ...getSwalTheme(),
        showCancelButton: true,
        confirmButtonText: 'হ্যাঁ, একটিভ করুন',
        cancelButtonText: 'বাতিল'
    });

    if (!confirmResult.isConfirmed) return;

    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');

        const response = await fetch(API + '/api/active-term', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ 
                userPhone: userPhone, 
                termStart: startDateVal 
            })
        });

        const result = await response.json();
        
        if (response.ok && result.success) {
            Swal.fire({
                icon: 'success',
                title: result.message,
                ...getSwalTheme(),
                showConfirmButton: false,
                timer: 2000
            });
            setTimeout(() => {
                window.location.reload(); 
            }, 1800);
        } else {
            Swal.fire({
                icon: 'error',
                title: 'ত্রুটি',
                text: result.message || 'টার্ম একটিভ করা যায়নি।',
                ...getSwalTheme()
            });
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        Swal.fire({
            icon: 'error',
            title: 'সংযোগ ত্রুটি',
            text: 'সার্ভারের সাথে যোগাযোগ করা যাচ্ছে না।',
            ...getSwalTheme()
        });
    }
}

const setupTermControl = (statusData) => {
    const activeTermBtn = document.getElementById('active-term-btn');
    if (!activeTermBtn) return;

    window.isTermActiveGlobal = (statusData.buttonStatus === "already_active");

    switch (statusData.buttonStatus) {
        case "not_started":
            activeTermBtn.disabled = true;
            activeTermBtn.innerHTML = `<i class="fas fa-clock"></i> Term Not Started`;
            activeTermBtn.style.backgroundColor = "#f39c12";
            lockManagerActions(true);
            break;
        case "expired":
            activeTermBtn.disabled = true;
            activeTermBtn.innerHTML = `<i class="fas fa-times-circle"></i> Term Expired`;
            activeTermBtn.style.backgroundColor = "#e74c3c";
            lockManagerActions(true);
            break;
        case "already_active":
            activeTermBtn.disabled = true; // বাটন ডিজেবল করা
            activeTermBtn.innerHTML = `<i class="fas fa-check-circle"></i> Term Is Active`;
            activeTermBtn.style.backgroundColor = "#2ecc71"; // সবুজ কালার
            activeTermBtn.style.cursor = "not-allowed"; // মাউস নিলে নট-অ্যালাউড আইকন দেখাবে
            activeTermBtn.style.pointerEvents = "none"; // অতিরিক্ত সুরক্ষার জন্য যাতে কোনোভাবেই ক্লিক না পড়ে
            lockManagerActions(false); 
            break;
        case "allow_activation":
            activeTermBtn.disabled = false;
            activeTermBtn.innerHTML = `<i class="fas fa-play-circle"></i> Active Term`;
            activeTermBtn.style.backgroundColor = "#2ecc71";
            lockManagerActions(true); 
            break;
    }
};

function lockManagerActions(shouldLock) {
    window.isTermActiveGlobal = !shouldLock;

    const addBtn = document.getElementById('add-member-btn');
    if (addBtn) {
        addBtn.disabled = shouldLock;
        addBtn.style.opacity = shouldLock ? "0.5" : "1";
    }

    const actionButtons = document.querySelectorAll('.edit-btn, .deposit-btn, .delete-btn');
    actionButtons.forEach(btn => {
        btn.disabled = shouldLock;
        btn.style.opacity = shouldLock ? "0.5" : "1";
    });
}

function hideActionColumn() {
    if (!document.getElementById('hide-action-style')) {
        const style = document.createElement('style');
        style.id = 'hide-action-style';
        style.innerHTML = `.action-buttons, .member-table th:last-child, .member-table td:last-child { display: none !important; }`;
        document.head.appendChild(style);
    }
}

// ==========================================
// 6. Modals & History Modals Logic
// ==========================================
function closeMealModal() {
    const mealModal = document.getElementById('mealModal');
    if (mealModal) {
        mealModal.style.display = 'none';
        console.log("Modal Closed. Fetching fresh data..."); 
    }
}

const historyModal = document.getElementById('history-modal');
const historyListBody = document.getElementById('history-list-body');
const historyMemberName = document.getElementById('history-member-name');

async function showHistory(id) {
    const member = membersData.find(m => m._id === id);
    if (!member) return;

    const auth = await getAuthData(); 
    if (!auth) return; 

    const userRole = auth.role;
    const userStatus = auth.status; 
    
    if (historyMemberName) historyMemberName.innerText = `${member.name}'s Deposit History`;
    if (historyListBody) historyListBody.innerHTML = '';
    
    if (!member.depositHistory || member.depositHistory.length === 0) {
        if (historyListBody) historyListBody.innerHTML = '<tr><td colspan="2" style="text-align:center; padding:20px; color:#888;">No records found.</td></tr>';
    } else {
        member.depositHistory.slice().reverse().forEach(entry => {
            const date = new Date(entry.date).toLocaleDateString('en-GB');

            let deleteBtn = "";
            if (userRole === 'manager' && userStatus === 'active') {
                deleteBtn = `
                    <button onclick="deleteDepositEntry('${member._id}', '${entry._id}')" 
                            style="color: #ff4757; border: none; background: none; cursor: pointer; margin-left: 10px; font-size: 1.1em; vertical-align: middle;">
                        <i class="fas fa-trash-alt"></i>
                    </button>`;
            }
            
            const row = `
                <tr>
                    <td style="text-align: left; padding-left: 15px;">
                        <span style="color: #7f8c8d; font-size: 0.85em;">${date}</span>
                    </td>
                    <td style="text-align: right; padding-right: 15px; position: relative;">
                        <strong style="color: #2ecc71; font-size: 1em;">
                            ৳ ${entry.amount.toLocaleString()}
                        </strong>
                        ${deleteBtn}
                    </td>
                </tr>`;
            if (historyListBody) historyListBody.innerHTML += row;
        });

        const totalHtml = `
            <tr>
                <td colspan="2" class="total-box-container">
                    <div class="total-display-box">
                        Total: ৳ ${member.deposit.toLocaleString()}
                    </div>
                </td>
            </tr>`;
        if (historyListBody) historyListBody.innerHTML += totalHtml;
    }

    if (historyModal) historyModal.style.display = 'block';
}

function closeHistoryModal() {
    if (historyModal) historyModal.style.display = 'none';
}

window.onclick = function(event) {
    const historyModalEl = document.getElementById('history-modal');
    const mealModalEl = document.getElementById('mealModal');
    const addMemberModalEl = document.getElementById('add-member-modal');
    if (event.target == historyModalEl) {
        closeHistoryModal();
    }
    if (event.target == mealModalEl) {
        closeMealModal();
    }
    if (event.target == addMemberModalEl) {
        addMemberModalEl.style.display = 'none';
        if (addMemberForm) addMemberForm.reset(); 
    }
}

async function deleteDepositEntry(roomID, historyId) {
    Swal.fire({
        title: 'Are you sure?',
        text: "Are you sure you want to delete this deposit record?",
        icon: 'warning',
        ...getSwalTheme(),
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const token = localStorage.getItem('token') || sessionStorage.getItem('token');

const response = await fetch(`${API_URL}/${roomID}/deposit/${historyId}`, {
    method: 'DELETE',
    headers: {
        'Authorization': `Bearer ${token}` // 👈 নতুন যুক্ত হলো
    }
});
                if (response.ok) {
                    Swal.fire({ 
                        icon: 'success', 
                        title: 'Record deleted! ✅', 
                        ...getSwalTheme(),
                        showConfirmButton: false, 
                        timer: 1500 
                    });
                    closeHistoryModal();
                    await fetchMembers(); 
                } else {
                    const errorData = await response.json();
                    Swal.fire({ icon: 'error', title: 'Failed to delete: ' + errorData.message, ...getSwalTheme() });
                }
            } catch (error) {
                console.error("Delete history error:", error);
                Swal.fire({ icon: 'error', title: 'Unable to reach the server.', ...getSwalTheme() });
            }
        }
    });
}

async function showTotalMessDeposit() {
    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');

const response = await fetch(API + '/api/total-deposit', {
    headers: {
        'Authorization': `Bearer ${token}` // 👈 নতুন যুক্ত হলো
    }
});
        const data = await response.json();
        const displayElement = document.getElementById('total-mess-balance');
        if (displayElement) {
            displayElement.innerText = `৳ ${data.totalDeposit.toLocaleString()}`;
        }
    } catch (error) {
        console.error("Error fetching total deposit:", error);
    }
}

function calculateDashTotalCollection() {
    // ১. term_summary বাদ দিয়ে শুধু রিয়েল মেম্বারদের ফিল্টার করা
    const validMembers = window.membersData.filter(m => m.type !== "term_summary");
    if (!validMembers || validMembers.length === 0) return;
    
    // ২. সবার ডিপোজিট এক সাথে যোগ করা
    const totalCollection = validMembers.reduce((sum, member) => sum + (Number(member.deposit) || 0), 0);
    
    // ৩. সবার মোট মিল এক সাথে যোগ করা
    const totalAllMemberMeals = validMembers.reduce((sum, member) => {
        return sum + (Number(member.totalMainGuest) || 0);
    }, 0);
    
    // ৪. ড্যাশবোর্ডে মোট কালেকশন বসানো
    const dashDisplay = document.getElementById('dash-total-collection');
    if (dashDisplay) {
        dashDisplay.innerText = totalCollection.toLocaleString(); 
    }

    // ৫. ড্যাশবোর্ডে মোট মিল বসানো
    const dashMealsDisplay = document.getElementById('dash-total-meals');
    if (dashMealsDisplay) {
        dashMealsDisplay.innerText = totalAllMemberMeals;
    }
}

async function showMealDetails(id, name) {
    const modal = document.getElementById('mealModal');
    const title = document.getElementById('mealModalTitle');
    const body = document.getElementById('mealDetailsBody');
    
    if (!modal || !title || !body) return;

    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');

const response = await fetch(API + `/api/member-meal-summary/${id}`, {
    headers: {
        'Authorization': `Bearer ${token}` // 👈 নতুন যুক্ত হলো
    }
});
        if (!response.ok) throw new Error("Server error");
        
        const data = await response.json();
        
        // ব্যাকএন্ডের এগ্রিগেশন বা রেসপন্সের ওপর ভিত্তি করে প্রপার্টিগুলো সেট করা হলো
        // যেমন: data.totalMain, data.totalGuest, data.totalFine অথবা সরাসরি data.main, data.guest, data.fine
        const mainMeals = data.totalMain !== undefined ? data.totalMain : (data.main || 0);
        const guestMeals = data.totalGuest !== undefined ? data.totalGuest : (data.guest || 0);
        const fineMeals = data.totalFine !== undefined ? data.totalFine : (data.fine || 0);
        
        // ইউজার কারেকশন অনুযায়ী মোডালের টোটালে ফাইন মিলসহ হিসাব করা হলো
        const grandTotal = mainMeals + guestMeals + fineMeals;

        title.innerText = `${name}'s Meal Breakdown`;
        
        body.innerHTML = `
            <div style="margin-bottom: 12px; display: flex; justify-content: space-between; padding-bottom: 5px; border-bottom: 1px solid #eee;">
                <span>⚪ <b>Main Meals:</b></span> <span>${mainMeals}</span>
            </div>
            <div style="margin-bottom: 12px; display: flex; justify-content: space-between; padding-bottom: 5px; border-bottom: 1px solid #eee;">
                <span>🟢 <b>Guest Meals:</b></span> <span>${guestMeals}</span>
            </div>
            <div style="margin-bottom: 12px; display: flex; justify-content: space-between; padding-bottom: 5px; border-bottom: 1px solid #eee;">
                <span>🔴 <b>Fine Meals:</b></span> <span>${fineMeals}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 1.2em; color: #2c3e50; margin-top: 15px;">
                <span>Total:</span> <span>${grandTotal}</span>
            </div>
        `;
        
        modal.style.display = 'block'; 
    } catch (error) {
        console.error("Fetch Error:", error);
        
        // এখানেও সাধারণ  এর বদলে  ব্যবহার করা যেতে পারে
        Swal.fire({
            icon: 'error',
            title: 'এরর',
            text: 'মিলের তথ্য লোড করা সম্ভব হয়নি।',
            ...getSwalTheme()
        });
    }
}

// ==========================================
// 7. Helper Sorting & Search Functions
// ==========================================
function customMemberSort(a, b) {
    const idA = parseInt(a.roomID) || 0;
    const idB = parseInt(b.roomID) || 0;
    if (idA !== idB) return idA - idB;
    
    function getSemPriority(sem) {
        if (!sem) return 0;
        let s = sem.toString().toLowerCase();
        if (s.includes('8')) return 10;
        if (s.includes('7')) return 9;
        if (s.includes('6')) return 8;
        if (s.includes('v')) return 7; 
        if (s.includes('5')) return 6;
        if (s.includes('4')) return 5;
        if (s.includes('3')) return 4;
        if (s.includes('2')) return 3;
        if (s.includes('1')) return 2;
        return 1;
    }
    return getSemPriority(b.semester) - getSemPriority(a.semester);
}

function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase();
    const filteredData = membersData.filter(m => 
        (m.name && m.name.toLowerCase().includes(searchTerm)) || 
        (m.roomID && m.roomID.toString().includes(searchTerm))
    );
    renderMembers(filteredData);
}

function setupModalListeners() {
    if (addMemberBtn && addMemberModal) {
        addMemberBtn.addEventListener('click', () => { 
            if (!window.isTermActiveGlobal) {
                Swal.fire({
                    icon: 'warning',
                    title: 'টার্ম ইনঅ্যাক্টিভ!',
                    text: '⚠️ Age Term active koro! Term active na thakle member add kora jabe na.',
                    ...getSwalTheme()
                });
                return;
            }
            addMemberModal.style.display = 'block'; 
        });
    }
    if (closeBtn && addMemberModal) {
        closeBtn.addEventListener('click', () => { addMemberModal.style.display = 'none'; if (addMemberForm) addMemberForm.reset(); });
    }
}

// ==========================================
// 8. Main Single Initializer (Unified DOMContentLoaded)
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    const userPhone = localStorage.getItem('userPhone');
    const auth = await getAuthData();
    
    if (!auth || (auth.role === 'guest' && auth.status === 'inactive')) {
        console.log("Guest User Detected. Allowing limited view.");
    }

    const userRole = auth ? auth.role : 'guest'; 
    const userStatus = auth ? auth.status : 'inactive';

    // Elements Select
    const activeTermBtn = document.getElementById('active-term-btn');
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const selfJoinBtn = document.getElementById('self-join-btn');
    const managerPanel = document.querySelector('.manager-only');
    const termSelector = document.getElementById('term-selector');

    // 1. Common Listeners for all users
    if (searchInput) {
        searchInput.disabled = false;
        searchInput.style.opacity = "1";
        searchInput.style.pointerEvents = "auto";
        searchInput.addEventListener('input', handleSearch);
    }
    if (addMemberForm) {
        addMemberForm.addEventListener('submit', handleAddMember);
    }

    // 2. Conditional Access Control Logic
    if (userRole === 'guest') {
        if (addMemberBtn) addMemberBtn.style.display = 'none';
        if (managerPanel) managerPanel.style.display = 'none';
        if (selfJoinBtn) selfJoinBtn.style.display = 'none';
        hideActionColumn();
        lockManagerActions(true); 
    } 
    else if (userRole === 'member') {
        if (managerPanel) managerPanel.style.display = 'none';
        if (addMemberBtn) addMemberBtn.style.display = 'none';
        hideActionColumn();
        
        // মেম্বারদের জন্যও ব্যাকএন্ড থেকে টার্ম স্ট্যাটাস ফেচ করে গ্লোবাল ভেরিয়েবল আপডেট করা হলো
        try {
            // মেম্বারের ক্ষেত্রে ম্যানেজারের ফোন নম্বর বা অ্যাপ মেটাডাটা থেকে টার্ম স্ট্যাটাস আনতে হবে 
            // অথবা সার্বজনীন কোনো টার্ম স্ট্যাটাস API কল করতে পারেন
            const token = localStorage.getItem('token') || sessionStorage.getItem('token');

const res = await fetch(API + `/api/active-term-status?phone=${userPhone || ''}`, { 
    cache: "no-store",
    headers: {
        'Authorization': `Bearer ${token}` // 👈 নতুন যুক্ত হলো
    }
});
            const statusData = await res.json();
            
            // যদি টার্ম অলরেডি একটিভ থাকে তবে এটি true হবে
            window.isTermActiveGlobal = (statusData.buttonStatus === "already_active");
        } catch (err) {
            console.error("Error fetching term status for member:", err);
        }

        if (selfJoinBtn) {
            selfJoinBtn.style.display = 'inline-block';
            selfJoinBtn.disabled = (userStatus === 'pending');
            selfJoinBtn.style.opacity = (userStatus === 'pending') ? "0.5" : "1";

            selfJoinBtn.addEventListener('click', (e) => {
                if (!window.isTermActiveGlobal) {
                    e.preventDefault();
                    // এখানেও ব্রাউজারের -এর বদলে চাইলে SweetA ব্যবহার করতে পারেন
                    Swal.fire({
                        icon: 'warning',
                        title: 'সতর্কতা',
                        text: '⚠️ Manager ekhono term active koreni ba term-er meyad nei.',
                        ...getSwalTheme()
                    });
                }
            });
        }
    } 
    else if (userRole === 'manager') {
        if (managerPanel) managerPanel.style.display = 'flex';
        if (addMemberBtn) addMemberBtn.style.display = 'inline-block';

        const setCookBillBtn = document.getElementById('set-cook-bill-btn');
        if (setCookBillBtn) setCookBillBtn.style.display = 'inline-block';

        if (activeTermBtn) {
            activeTermBtn.onclick = handleActiveTerm;
        }

        if (userStatus === 'pending') {
            lockManagerActions(true);
            if (activeTermBtn) activeTermBtn.disabled = true;
            hideActionColumn();
        } else {
            // Active Manager - Fetch Term Status from DB
            try {
                const token = localStorage.getItem('token') || sessionStorage.getItem('token');

const res = await fetch(API + `/api/active-term-status?phone=${userPhone || ''}`, { 
    cache: "no-store",
    headers: {
        'Authorization': `Bearer ${token}` // 👈 নতুন যুক্ত হলো
    }
});
                const statusData = await res.json();
                setupTermControl(statusData);

                // Setup Date Conversion Formula (DD-MM-YYYY -> YYYY-MM-DD)
                const formatDateForInput = (dateStr) => {
                    if (!dateStr) return "";
                    const parts = dateStr.split('-'); 
                    if (parts.length === 3) {
                        return `${parts[0]}-${parts[1]}-${parts[2]}`; 
                    }
                    return dateStr;
                };

                // Inject Date values safely
                if (startDateInput) startDateInput.value = formatDateForInput(statusData.termStart);
                if (endDateInput) endDateInput.value = formatDateForInput(statusData.termEnd);

            } catch (err) { 
                console.error("Error fetching term status:", err); 
            }
        }

        // Auto fill trigger if profile contains data directly
        if (auth.termStart && auth.termEnd) {
            if (startDateInput) { startDateInput.value = auth.termStart; startDateInput.readOnly = true; }
            if (endDateInput) { endDateInput.value = auth.termEnd; endDateInput.readOnly = true; }
            if (activeTermBtn && userStatus !== 'pending') activeTermBtn.disabled = false;
        } else if (userStatus === 'active') {
            // Optional fallback picker initialize if data is blank
            if (typeof initTermPickers === 'function') initTermPickers();
        }
    }

    // 3. Flatpickr Initializer
    if (termSelector) {
        flatpickr("#term-selector", {
            disableMobile: "true",
            plugins: [
                new monthSelectPlugin({
                    shorthand: true, 
                    dateFormat: "Y-m", 
                    altFormat: "F Y"   
                })
            ]
        });
    }

    

    // 4. Initial Global Fetch Triggers
    fetchMembers();
    setupModalListeners();
});

// ==========================================
// Self-Join (Add Yourself) Modal & Logic
// ==========================================
async function openSelfJoinModal() {
    let userData = {};
    const phone = localStorage.getItem('userPhone') || sessionStorage.getItem('userPhone');
    const role = localStorage.getItem('userRole') || sessionStorage.getItem('userRole') || 'member';

    // ১. ইউজারের প্রোফাইল তথ্য ফেচ করা (অটো-ফিল করার জন্য)
    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');

const res = await fetch(API + `/api/auth/profile-info?phone=${phone}&role=${role}`, {
    headers: {
        'Authorization': `Bearer ${token}` // 👈 নতুন যুক্ত হলো
    }
});
        if (res.ok) {
            userData = await res.json();
        }
    } catch (e) {
        console.log("Could not fetch pre-existing user data", e);
    }

    Swal.fire({
        title: 'Add Yourself to Mess',
        html:
            `<input id="self-nickname" class="swal2-input" placeholder="Nickname" value="${userData.nickname || ''}">` +
            `<input id="self-room" class="swal2-input" placeholder="Room No" value="${userData.roomNo || ''}">` +
            `<input id="self-semester" class="swal2-input" placeholder="Semester (e.g. V, 2nd)" value="${userData.semester || ''}">`,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Submit Info',
        ...getSwalTheme(),
        preConfirm: () => {
            return {
                nickname: document.getElementById('self-nickname').value.trim(), // এখানে নাম না নিয়ে নিকনেম নেওয়া হচ্ছে
                roomID: document.getElementById('self-room').value.trim(),
                semester: document.getElementById('self-semester').value.trim()
            }
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            const data = result.value;

            // ভ্যালিডেশন চেক যেন নিকনেম, রুম এবং সেমিস্টার ফাঁকা না থাকে
            if (!data.nickname || !data.roomID || !data.semester) {
                Swal.fire({ icon: 'warning', title: 'দয়া করে প্রয়োজনীয় ঘরগুলো পূরণ করুন!', ...getSwalTheme() });
                return;
            }

            try {
                // ২. ডুপ্লিকেট চেক করা (নিকনেম দিয়ে)
                const membersRes = await fetch(API + '/api/members', {
    headers: {
        'Authorization': `Bearer ${token}` // 👈 নতুন যুক্ত হলো
    }
});
                if (membersRes.ok) {
                    const membersData = await membersRes.json();
                    const existingMembers = membersData.members || [];

                    const isAlreadyAdded = existingMembers.some(m => 
                        (m.nickname && m.nickname.toLowerCase() === data.nickname.toLowerCase()) &&
                        (m.roomID && m.roomID.toLowerCase() === data.roomID.toLowerCase())
                    );

                    if (isAlreadyAdded) {
                        Swal.fire({ 
                            icon: 'info', 
                            title: 'আপনি ইতিমধ্যেই এই মেসে যুক্ত আছেন!', 
                            ...getSwalTheme() 
                        });
                        return;
                    }
                }

                // ৩. ব্যাকএন্ডে রিকোয়েস্ট পাঠানো (name এর বদলে nickname পাঠানো হলো)
                const response = await fetch(API + '/api/members', {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // 👈 নতুন যুক্ত হলো
    },
    body: JSON.stringify({
        name: data.nickname, 
        roomID: data.roomID,
        semester: data.semester,
        deposit: 0
    })
});

                const resData = await response.json();

                if (response.ok) {
                    Swal.fire({ icon: 'success', title: resData.message || 'সফলভাবে যুক্ত হয়েছে!', ...getSwalTheme(), timer: 1500 });
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    Swal.fire({ icon: 'error', title: resData.message || 'কিছু সমস্যা হয়েছে!', ...getSwalTheme() });
                }
            } catch (err) {
                console.error("Self-Join Error:", err);
                Swal.fire({ icon: 'error', title: 'সার্ভারের সাথে সংযোগ স্থাপন করা যায়নি।', ...getSwalTheme() });
            }
        }
    });
}


// মডাল ওপেন করার ফাংশন (যদি আগে থেকে না থাকে)
function openCookBillModal() {
    const modal = document.getElementById('cook-bill-modal');
    if (modal) modal.style.display = 'block';
}

// মডাল ক্লোজ করার ফাংশন
function closeCookBillModal() {
    const modal = document.getElementById('cook-bill-modal');
    if (modal) modal.style.display = 'none';
}

// সরাসরি অ্যামাউন্ট সাবমিট করার ফাংশন
// সরাসরি অ্যামাউন্ট সাবমিট করার ফাংশন
async function saveCookBillDirectly(event) {
    event.preventDefault();

    // ১. চেক করা মেম্বার যোগ করা হয়েছে কিনা বা টার্ম অ্যাক্টিভ আছে কিনা
    if (!window.isTermActiveGlobal || (window.membersData && window.membersData.length === 0)) {
        return Swal.fire({
            icon: 'warning',
            title: 'সতর্কতা!',
            text: '⚠️ আগে টার্ম অ্যাক্টিভ করুন এবং অন্তত একজন মেম্বার যোগ করুন! মেম্বার ছাড়া কুক বিল সেভ করা যাবে না।',
            ...getSwalTheme()
        });
    }

    const amount = document.getElementById('direct-cook-amount').value;

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
        return Swal.fire({
            icon: 'warning',
            title: 'সঠিক পরিমাণ দিন',
            text: 'দয়া করে একটি বৈধ কুক বিল অ্যামাউন্ট লিখুন।',
            ...getSwalTheme()
        });
    }

    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');

const response = await fetch(API + '/api/term/set-cook-bill', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // 👈 নতুন যুক্ত হলো
    },
    body: JSON.stringify({ cookBill: amount })
});

        const result = await response.json();

        if (response.ok && result.success) {
            Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: result.message,
                ...getSwalTheme()
            });
            closeCookBillModal();
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: result.message || 'কিছু সমস্যা হয়েছে!',
                ...getSwalTheme()
            });
        }
    } catch (error) {
        console.error("Error saving cook bill:", error);
        Swal.fire({
            icon: 'error',
            title: 'Server Error',
            text: 'সার্ভারের সাথে সংযোগ স্থাপন করা যায়নি।',
            ...getSwalTheme()
        });
    }
}


// মাসিক রিপোর্টের কার্ডের হিসাব ডাইনামিক করার ফাংশন
async function loadMonthlyReportExpenseStats() {
    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');

const response = await fetch(API + '/api/expenses/due-details', {
    headers: {
        'Authorization': `Bearer ${token}` // 👈 নতুন যুক্ত হলো
    }
});
        if (!response.ok) throw new Error("Failed to fetch due details");
        
        const data = await response.json();
        const categories = data.categories || [];

        let totalCashCostSum = 0;
        let totalDueCostSum = 0;
        let totalDuePayments = 0;
        let totalRemainingDue = 0;
        
        let totalCookBillDue = 0;
        let totalCookBillPaid = 0;
        let totalCookBillRemaining = 0;

        categories.forEach(cat => {
            if (cat.isCookBill) {
                // রান্নার বিল কার্ডের হিসাব
                totalCookBillDue = Number(cat.totalDue) || 0;
                totalCookBillPaid = Number(cat.totalPaid) || 0;
                totalCookBillRemaining = Number(cat.remainingDue) || 0;
            } else {
                // অন্যান্য ক্যাটাগরির খরচ হিসাব
                totalCashCostSum += Number(cat.cashCost) || 0; // যদি ক্যাশ খরচ আলাদা ফিল্ড থাকে
                totalDueCostSum += Number(cat.totalDue) || 0;
                totalDuePayments += Number(cat.totalPaid) || 0;
                totalRemainingDue += Number(cat.remainingDue) || 0;
            }
        });

        // ১. মোট বাজার খরচ কার্ডের আপডেট
        // নগদ খরচ ও বাকি খরচের যোগফল
        const totalBazarCost = totalCashCostSum + totalDueCostSum;
        
        // HTML-এ মানগুলো বসানোর জন্য আইডি বা সিলেক্টর ব্যবহার করতে পারেন:
         document.getElementById('card-total-bazar').innerText = `৳ ${totalBazarCost.toLocaleString()}`;
         document.getElementById('card-cash-cost').innerText = `নগদ খরচ: ৳ ${totalCashCostSum.toLocaleString()}`;
         document.getElementById('card-due-cost').innerText = `বাকি খরচ: ৳ ${totalDueCostSum.toLocaleString()}`;

        // ২. মোট বাকি খরচ কার্ডের আপডেট
        // বাকি পরিশোধ (cookbill ছাড়া অনান্য ক্যাটাগরির পরিশোধের যোগফল)
        // বাকি: সকল ক্যাটাগরির dueCost (cookbill ছাড়া) - সকল ক্যাটাগরির পরিশোধ (cookbill ছাড়া)
        
        // ৩. মোট রান্নার বিল কার্ডের আপডেট
        // termTotalCookBill, রান্নার বিল পরিশোধ, রান্নার বিল বাকি (termTotalCookBill - total rannar bill porishod)
        
        console.log({
            totalBazarCost,
            totalCashCostSum,
            totalDueCostSum,
            totalDuePayments,
            totalRemainingDue,
            totalCookBillDue,
            totalCookBillPaid,
            totalCookBillRemaining
        });

    } catch (error) {
        console.error("Expense Stats Error:", error);
    }
}

// পেজ লোড হলে ফাংশনটি কল করুন
document.addEventListener('DOMContentLoaded', () => {
    loadMonthlyReportExpenseStats();
});