// ../JS/meal-record.js

// Global variables
let allDates = [];
let currentPage = 1;
const daysPerPage = 7;
let allMembersData = []; // সব মেম্বার ক্যাশ করে রাখার জন্য
let currentSearchTerm = ''; // সার্চ টার্ম ধরে রাখার জন্য

const parseDate = (dateStr) => {
    const [day, month, year] = dateStr.split('-');
    return new Date(year, month - 1, day);
};

const formatDateDay = (date) => {
    const options = { day: '2-digit', month: 'short', weekday: 'short' };
    return date.toLocaleDateString('en-US', options).replace(/,$/, '');
};

function checkUserPermissionAndApplyReadOnly() {
    try {
        // সরাসরি আলাদা আলাদা key থেকে ভ্যালুগুলো রিড করা হচ্ছে
        const userRole = (localStorage.getItem('userRole') || '').toLowerCase();
        const userStatus = (localStorage.getItem('userStatus') || '').toLowerCase();

        console.log("Direct Storage Check - Role:", userRole, "Status:", userStatus);

        // ইউজার যদি 'manager' এবং তার স্ট্যাটাস 'active' হয়, তবে রিড-ওনলি হবে না
        if (userRole !== 'manager' || userStatus !== 'active') {
            console.warn("Access restricted. Applying Read-Only mode.");
            applyReadOnlyMode();
        } else {
            console.log("Active Manager verified. Full edit access granted.");
        }
    } catch (e) {
        console.error("Permission check error:", e);
    }
}

function applyReadOnlyMode() {
    // ১. ইনপুটগুলোকে disabled না করে readonly করা, যাতে টেক্সট ক্লিয়ার দেখায়
    document.querySelectorAll('.meal-input').forEach(input => {
        input.readOnly = true; // এডিট করা যাবে না, কিন্তু লেখা স্পষ্ট দেখা যাবে
        input.style.backgroundColor = ''; // আগের ব্যাকগ্রাউন্ড কালার ঠিক রাখবে
        input.style.cursor = 'text';     // মাউস নিলে কার্সর দেখাবে
    });

    // ২. সেভ বাটন এবং কুইক মিল মোডাল ওপেন বাটন হাইড করা
    const saveMealBtn = document.getElementById('save-meal-data');
    if (saveMealBtn) saveMealBtn.style.display = 'none';

    const openQuickModalBtn = document.getElementById('open-quick-meal-modal');
    if (openQuickModalBtn) openQuickModalBtn.style.display = 'none';
}
// ==========================================
// মূল ইনিশিয়ালাইজেশন ও লজিক চেক
// ==========================================
async function initMealRecordPage() {
    try {
        // ১. ব্যাকএন্ড থেকে টার্ম চেক করা
        const token = localStorage.getItem('token') || sessionStorage.getItem('token'); // টোকেন রিড করা

const termResponse = await fetch(API + '/api/bazar-term', {
    headers: {
        'Authorization': `Bearer ${token}` // 👈 হেডার যুক্ত করা হলো
    }
});
        if (!termResponse.ok) {
            throw new Error("Active term not found");
        }
        const data = await termResponse.json();

        if (!data || data.isZero === true || !data.termStart || !data.termEnd) {
            showNoRecordState();
            return;
        }

        const startDateStr = data.termStart;
        const endDateStr = data.termEnd;

        // ইনপুট ফিল্ডে ডেট সেট করা (যদি থাকে)
        const startDateInput = document.getElementById('start-date');
        const endDateInput = document.getElementById('end-date');
        if (startDateInput && endDateInput) {
            startDateInput.value = startDateStr;
            endDateInput.value = endDateStr;
        }

        // ২. ডাইনামিক মান্থ বের করা
        const dateObjForInit = parseDate(startDateStr);
        const monthYear = `${dateObjForInit.toLocaleString('default', { month: 'long' }).toLowerCase()}_${dateObjForInit.getFullYear()}`;

        // ৩. মেম্বার ডাটা ফেচ করা
        // ৩. মেম্বার ডাটা ফেচ করা
        const membersRes = await fetch(API + '/api/members', {
    headers: { 
        'month-year': monthYear,
        'Authorization': `Bearer ${token}` // 👈 হেডার যুক্ত করা হলো
    }
});
        
        if (!membersRes.ok) {
            showNoRecordState();
            return;
        }

        const resData = await membersRes.json();
        
        // এপিআই থেকে ডাটা অ্যারে আকারে আসছে নাকি অবজেক্ট (members & termSummary) আকারে আসছে তা হ্যান্ডেল করা
        const members = Array.isArray(resData) ? resData : (resData.members || []);

        if (!members || members.length === 0) {
            showNoRecordState("এই মাসে কোনো মেম্বার পাওয়া যায়নি!");
            return;
        }

        

        // মেম্বারদের তোমার কাস্টম সর্টিং লজিক দিয়ে সর্ট করা
        allMembersData = members.sort(customMemberSort);

        // UI-তে সার্চ বার ইভেন্ট যুক্ত করা (যদি না করে থাকে)
        setupSearchEventListener();

        // সব লজিক ঠিক থাকলে টেবিল জেনারেট করার জন্য ডেট অ্যারে তৈরি ও রেন্ডার কল করা
        setupDatesAndRender(startDateStr, endDateStr);

    } catch (error) {
        console.error("Initialization Error:", error);
        showNoRecordState();
    }
}

// ==========================================
// কাস্টম মেম্বার সর্টিং লজিক
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

// ==========================================
// সার্চ বার হ্যান্ডলার
// ==========================================
function setupSearchEventListener() {
    const searchInput = document.getElementById('member-search-input');
    if (searchInput && !searchInput.dataset.listenerAttached) {
        searchInput.dataset.listenerAttached = 'true';
        searchInput.addEventListener('input', (e) => {
            currentSearchTerm = e.target.value.toLowerCase().trim();
           // currentPage = 1; // সার্চ করলে প্রথম পেজে নিয়ে যাবে
            renderMealTable();
        });
    }
}

function showNoRecordState(message = "Please ensure the server is running or activate the term to view meal records.") {
    const tableArea = document.getElementById('monthly-record-area');
    const actionArea = document.querySelector('.table-action-area');
    const paginationControls = document.getElementById('pagination-controls');

    if (tableArea) {
        tableArea.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 80px 20px;">
                <i class="fas fa-folder-open" style="font-size: 65px; color: #a0aec0; margin-bottom: 20px;"></i>
                <h2 style="font-size: 32px; color: var(--text-color, #e2e8f0); font-weight: 700; margin: 0; letter-spacing: 0.5px;">Meal Records Not Found</h2>
                <p style="color: #a0aec0; margin-top: 10px; font-size: 15px;">${message}</p>
            </div>
        `;
    }

    if (actionArea) actionArea.classList.add('hidden');
    if (paginationControls) paginationControls.classList.add('hidden');
}

// ==========================================
// ডেট সেটআপ ও অটো পেজ ক্যালকুলেশন লজিক
// ==========================================
let isFirstLoadMeal = true; // প্রথম লোডের জন্য ফ্ল্যাগ

function setupDatesAndRender(startDateStr, endDateStr) {
    const startDate = parseDate(startDateStr);
    const endDate = parseDate(endDateStr);

    allDates = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
        allDates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }

    // expenses.js এর মতো প্রথম লোডে আজকের তারিখ অনুযায়ী অটো পেজে যাওয়ার লজিক
    if (isFirstLoadMeal && allDates.length > 0) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`; 

        // allDates অ্যারে থেকে আজকের ডেট স্ট্রিং খুঁজে বের করা
        const todayIndex = allDates.findIndex(d => d.toLocaleDateString('en-CA') === todayStr);

        if (todayIndex !== -1) {
            const currentDayNumber = todayIndex + 1; 
            currentPage = Math.ceil(currentDayNumber / daysPerPage);
        } else {
            // যদি আজকের দিনটি টার্মের মধ্যে না থাকে (টার্ম শেষ বা ভবিষ্যতে হয়), তবে প্রথম পেজে রাখবে
            currentPage = 1;
        }
        isFirstLoadMeal = false; 
    } else {
        currentPage = 1;
    }

    renderMealTable();
}

// ==========================================
// টেবিল রেন্ডারিং লজিক (ফিল্টারসহ)
// ==========================================
async function renderMealTable() {
    const tableArea = document.getElementById('monthly-record-area');
    const actionArea = document.querySelector('.table-action-area');

    if (allDates.length === 0) {
        showNoRecordState();
        return;
    }

    // সার্চ টার্ম অনুযায়ী মেম্বার ফিল্টার করা
    const filteredMembers = allMembersData.filter(m => 
        (m.name && m.name.toLowerCase().includes(currentSearchTerm)) || 
        (m.roomID && m.roomID.toString().toLowerCase().includes(currentSearchTerm)) ||
        (m.semester && m.semester.toString().toLowerCase().includes(currentSearchTerm))
    );

    if (!filteredMembers || filteredMembers.length === 0) {
        tableArea.innerHTML = `
            <div style="text-align: center; padding: 50px; color: #a0aec0;">
                <i class="fas fa-search" style="font-size: 40px; margin-bottom: 10px;"></i>
                <p style="font-size: 16px;">কোনো মিলছে এমন মেম্বার পাওয়া যায়নি!</p>
            </div>
        `;
        if (actionArea) actionArea.classList.add('hidden');
        const paginationControls = document.getElementById('pagination-controls');
        if (paginationControls) paginationControls.classList.add('hidden');
        return;
    }

    const startDateQuery = allDates[0].toLocaleDateString('en-CA');
    const endDateQuery = allDates[allDates.length - 1].toLocaleDateString('en-CA');

    // সেভ করা মিল ডাটা ফেচ করা
    let currentSavedMeals = [];
    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');

const url = API + `/api/get-meals?start=${startDateQuery}&end=${endDateQuery}`;
const mealRes = await fetch(url, {
    headers: {
        'Authorization': `Bearer ${token}` // 👈 হেডার যুক্ত করা হলো
    }
});
        if (mealRes.ok) {
            const data = await mealRes.json();
            currentSavedMeals = Array.isArray(data) ? data : [];
        }
    } catch (err) {
        console.error("Fetch meals error:", err);
    }

    const startIndex = (currentPage - 1) * daysPerPage;
    const endIndex = Math.min(startIndex + daysPerPage, allDates.length);
    const datesForPage = allDates.slice(startIndex, endIndex);

    let tableHTML = `
        <div class="meal-entry-table-responsive">
        <table class="meal-entry-table">
            <thead>
                <tr>
                    <th rowspan="2" class="member-column-header">Member Details</th>
    `;

    datesForPage.forEach(date => {
        tableHTML += `<th colspan="2" class="date-day-header">${formatDateDay(date)}</th>`;
    });

    tableHTML += `</tr><tr>`;
    datesForPage.forEach(() => {
        tableHTML += `<th class="sub-head">Lunch</th><th class="sub-head">Dinner</th>`;
    });
    tableHTML += `</tr></thead><tbody>`;

    filteredMembers.forEach(member => {
        tableHTML += `<tr data-member-id="${member._id}">`;
        tableHTML += `
            <td class="member-info-cell">
                <div class="m-card">
                    <span class="m-name">${member.name}</span>
                    <div class="m-details">
                        <span>${member.semester}</span> - <span>${member.roomID}</span>
                    </div>
                </div>
            </td>`;

        datesForPage.forEach(date => {
            const dateStr = date.toLocaleDateString('en-CA');
            
            // ওই মেম্বার এবং ওই ডেটের মিল রেকর্ড খুঁজে বের করা
            const foundMeal = currentSavedMeals.find(m => 
                String(m.memberId) === String(member._id) && 
                m.date === dateStr
            );

            // যদি ডাটা থাকে সেখান থেকে ফিল্ডের ভ্যালু নিবে, না থাকলে ০ দেখাবে
            const lMain = foundMeal ? (foundMeal.lunch ?? foundMeal.mainLunch ?? 0) : 0;
            const lGuest = foundMeal ? (foundMeal.lunch_guest ?? foundMeal.guestLunch ?? 0) : 0;
            const lFine = foundMeal ? (foundMeal.lunch_fine ?? foundMeal.fineLunch ?? 0) : 0;
            
            const dMain = foundMeal ? (foundMeal.dinner ?? foundMeal.mainDinner ?? 0) : 0;
            const dGuest = foundMeal ? (foundMeal.dinner_guest ?? foundMeal.guestDinner ?? 0) : 0; // এখানে guestDinner করা হয়েছে
            const dFine = foundMeal ? (foundMeal.dinner_fine ?? foundMeal.fineDinner ?? 0) : 0;

            tableHTML += `
                <td>
                    <div class="meal-pair">
                        <input type="number" min="0" value="${lMain}"
                            data-member-id="${member._id}" data-date="${dateStr}" data-type="lunch"
                            class="meal-input-small meal-input">
                        <input type="number" min="0" value="${lGuest}"
                            data-member-id="${member._id}" data-date="${dateStr}" data-type="lunch_guest"
                            class="meal-input-small meal-input guest-input">
                        <input type="number" min="0" value="${lFine}"
                            data-member-id="${member._id}" data-date="${dateStr}" data-type="lunch_fine"
                            class="meal-input-small meal-input fine-input">
                    </div>
                </td>
                <td>
                    <div class="meal-pair">
                        <input type="number" min="0" value="${dMain}"
                            data-member-id="${member._id}" data-date="${dateStr}" data-type="dinner"
                            class="meal-input-small meal-input">
                        <input type="number" min="0" value="${dGuest}"
                            data-member-id="${member._id}" data-date="${dateStr}" data-type="dinner_guest"
                            class="meal-input-small meal-input guest-input">
                        <input type="number" min="0" value="${dFine}"
                            data-member-id="${member._id}" data-date="${dateStr}" data-type="dinner_fine"
                            class="meal-input-small meal-input fine-input">
                    </div>
                </td>
            `;
        });
        tableHTML += `</tr>`;
    });

    tableHTML += `</tbody></table></div>`;
    tableArea.innerHTML = tableHTML;
    
    if (actionArea) actionArea.classList.remove('hidden');
    checkUserPermissionAndApplyReadOnly();
    updatePaginationControls();
}

// ==========================================
// পেজিনেশন কন্ট্রোল
// ==========================================
function updatePaginationControls() {
    const totalDays = allDates.length;
    const totalPages = Math.ceil(totalDays / daysPerPage);
    const paginationControls = document.getElementById('pagination-controls');

    if (!paginationControls) return;
    paginationControls.innerHTML = "";

    if (totalPages > 1) {
        paginationControls.classList.remove('hidden');

        // Previous Button
        const prevBtn = document.createElement('button');
        prevBtn.className = 'nav-btn';
        prevBtn.innerHTML = `<i class="fas fa-arrow-left"></i> Previous Page`;
        prevBtn.disabled = (currentPage === 1);
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderMealTable();
            }
        });

        // Page Indicator
        const pageIndicator = document.createElement('span');
        pageIndicator.id = 'page-indicator';
        pageIndicator.innerText = `Page ${currentPage} of ${totalPages}`;

        // Next Button
        const nextBtn = document.createElement('button');
        nextBtn.className = 'nav-btn';
        nextBtn.innerHTML = `Next Page <i class="fas fa-arrow-right"></i>`;
        nextBtn.disabled = (currentPage === totalPages);
        nextBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderMealTable();
            }
        });

        paginationControls.appendChild(prevBtn);
        paginationControls.appendChild(pageIndicator);
        paginationControls.appendChild(nextBtn);
    } else {
        paginationControls.classList.add('hidden');
    }
}

function handlePagination(direction) {
    const totalDays = allDates.length;
    const totalPages = Math.ceil(totalDays / daysPerPage);
    if (direction === 'next' && currentPage < totalPages) {
        currentPage++;
    } else if (direction === 'prev' && currentPage > 1) {
        currentPage--;
    }
    renderMealTable();
}

// ==========================================
// পেজ লোড ইভেন্ট লিসেনার
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    initMealRecordPage();

    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');

    if (prevBtn) prevBtn.addEventListener('click', () => handlePagination('prev'));
    if (nextBtn) nextBtn.addEventListener('click', () => handlePagination('next'));
});


// ==========================================
// মিল সেভ করার লজিক (যেগুলোর মান ০ সেগুলো বাদ দিয়ে)
// ==========================================
async function saveAllMeals() {
    try {
        // সরাসরি আলাদা আলাদা key থেকে ভ্যালুগুলো রিড করা হচ্ছে
        const userRole = (localStorage.getItem('userRole') || '').toLowerCase();
        const userStatus = (localStorage.getItem('userStatus') || '').toLowerCase();

        if (userRole !== 'manager' || userStatus !== 'active') {
            alert("আপনার এই ডাটা সেভ করার অনুমতি নেই!");
            return;
        }
    } catch (e) {
        console.error("Permission check error:", e);
        return;
    }
    
    // তোমার বাকি সেভ করার কোড এখানে থাকবে...

    const mealInputs = document.querySelectorAll('.meal-input');
    const mealMap = {};

    mealInputs.forEach(input => {
        const memberId = input.dataset.memberId;
        const date = input.dataset.date;
        const type = input.dataset.type; 
        const value = Number(input.value) || 0;

        const key = `${memberId}_${date}`;
        if (!mealMap[key]) {
            mealMap[key] = {
                memberId: memberId,
                date: date,
                mainLunch: 0,
                mainDinner: 0,
                guestLunch: 0,
                guestDinner: 0,
                fineLunch: 0,
                fineDinner: 0
            };
        }

        // টাইপ অনুযায়ী মান অ্যাসাইন করা
        if (type === 'lunch') mealMap[key].mainLunch = value;
        if (type === 'lunch_guest') mealMap[key].guestLunch = value;
        if (type === 'lunch_fine') mealMap[key].fineLunch = value;
        if (type === 'dinner') mealMap[key].mainDinner = value;
        if (type === 'dinner_guest') mealMap[key].guestDinner = value;
        if (type === 'dinner_fine') mealMap[key].fineDinner = value;
    });

    // শুধুমাত্র যেগুলোর মধ্যে কোনো না কোনো মিলের সংখ্যা ০ এর বেশি আছে, সেগুলো ফিল্টার করা
    const mealsArray = Object.values(mealMap).filter(item => 
        item.mainLunch > 0 || item.mainDinner > 0 || 
        item.guestLunch > 0 || item.guestDinner > 0 || 
        item.fineLunch > 0 || item.fineDinner > 0
    );

    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');

const response = await fetch(API + '/api/save-meals', {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // 👈 হেডার যুক্ত করা হলো
    },
    body: JSON.stringify({ meals: mealsArray })
});

        const result = await response.json();
        if (response.ok) {
            Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: result.message || "মিল সফলভাবে সেভ হয়েছে!",
                confirmButtonColor: '#38a169'
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Failed',
                text: result.message || "মিল সেভ করতে সমস্যা হয়েছে!",
                confirmButtonColor: '#e53e3e'
            });
        }
    } catch (error) {
        console.error("Save Meal Error:", error);
        Swal.fire({
            icon: 'error',
            title: 'Connection Error',
            text: 'সার্ভার কানেকশনে সমস্যা হয়েছে!',
            confirmButtonColor: '#e53e3e'
        });
    }
}

// সেভ বাটনের সাথে ইভেন্ট কানেক্ট করা (যদি HTML এ save-btn আইডি থাকে)
document.addEventListener('DOMContentLoaded', () => {
    const saveBtn = document.getElementById('save-meal-data'); // এখানে আইডি ঠিক করা হলো
    if (saveBtn) {
        saveBtn.addEventListener('click', saveAllMeals);
    }
});

// ==========================================
// প্রতিটি মেম্বারের ৫টি ক্যাটাগরির মিল কাউন্ট করার লজিক
// ==========================================
function calculateMemberMealTotals(memberId, allSavedMeals) {
    // নির্দিষ্ট মেম্বারের সব মিল ফিল্টার করা
    const memberMeals = allSavedMeals.filter(m => String(m.memberId) === String(memberId));
    
    let totalMainMeal = 0;
    let totalGuestMeal = 0;
    let totalFineMeal = 0;

    memberMeals.forEach(m => {
        const lMain = (m.lunch ?? m.mainLunch ?? 0);
        const dMain = (m.dinner ?? m.mainDinner ?? 0);
        const lGuest = (m.lunch_guest ?? m.guestLunch ?? 0);
        const dGuest = (m.dinner_guest ?? m.guestDinner ?? 0);
        const lFine = (m.lunch_fine ?? m.fineLunch ?? 0);
        const dFine = (m.dinner_fine ?? m.fineDinner ?? 0);

        totalMainMeal += (lMain + dMain);
        totalGuestMeal += (lGuest + dGuest);
        totalFineMeal += (lFine + dFine);
    });

    // আপনার দেওয়া ৫টি নিয়ম অনুযায়ী হিসাব:
    const totalMainGuest = totalMainMeal + totalGuestMeal;
    const totalMainGuestFine = totalMainMeal + totalGuestMeal + totalFineMeal;

    return {
        totalMainMeal,
        totalGuestMeal,
        totalFineMeal,
        totalMainGuest,
        totalMainGuestFine
    };
}

// === কুইক মিল প্যানেল কন্ট্রোল লজিক ===
document.addEventListener('DOMContentLoaded', () => {
    const openModalBtn = document.getElementById('open-quick-meal-modal'); 
    const modal = document.getElementById('quick-meal-modal');
    const closeModalBtn = document.getElementById('close-quick-modal');
    const memberListContainer = document.getElementById('quick-member-list-container');
    const saveQuickBtn = document.getElementById('save-quick-meals-btn');
    const searchInputModal = document.getElementById('quick-search-member');
    
    const globalLunchMainInput = document.getElementById('quick-lunch-val');
    const globalDinnerMainInput = document.getElementById('quick-dinner-val');

    // নতুন ইলিমেন্টগুলো সিলেক্ট করা
    const selectAllCheckbox = document.getElementById('quick-select-all');
    const selectedCountText = document.getElementById('quick-selected-count-text');

    // সিলেক্ট করা মেম্বারদের আইডি সেভ রাখার জন্য Set
    let selectedQuickMemberIds = new Set();

    // সিলেকশন কাউন্ট এবং 'Select All' চেকবক্স আপডেট করার ফাংশন
    function updateSelectedCountAndSelectAll() {
        const totalCheckboxes = document.querySelectorAll('.quick-member-checkbox');
        const checkedCheckboxes = document.querySelectorAll('.quick-member-checkbox:checked');
        
        if (selectedCountText) {
            selectedCountText.innerText = `Selected: ${selectedQuickMemberIds.size} members`;
        }

        if (selectAllCheckbox) {
            if (totalCheckboxes.length > 0 && checkedCheckboxes.length === totalCheckboxes.length) {
                selectAllCheckbox.checked = true;
                selectAllCheckbox.indeterminate = false;
            } else if (checkedCheckboxes.length > 0) {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = true; // কিছু সিলেক্ট করা থাকলে মাইনাস/ইনডেটারমিনেট লুক দেখাবে
            } else {
                selectAllCheckbox.checked = false;
                selectAllCheckbox.indeterminate = false;
            }
        }
    }
    

    // ১. মোডাল ওপেন করা এবং ম্যানেজারের টার্ম অনুযায়ী ডেট রেঞ্জ সেট করা
    if (openModalBtn) {
        openModalBtn.addEventListener('click', async () => {
            if (modal) {
                modal.classList.remove('hidden');
                modal.style.display = 'flex';

                try {
                    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                    const termResponse = await fetch(API + '/api/bazar-term', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (termResponse.ok) {
                        const termData = await termResponse.json();
                        if (termData && termData.termStart && termData.termEnd) {
                            const dateInput = document.getElementById('quick-meal-date');
                            if (dateInput) {
                                dateInput.min = convertDateFormat(termData.termStart);
                                dateInput.max = convertDateFormat(termData.termEnd);
                            }
                        }
                    }
                } catch (err) {
                    console.error("Term fetch error for quick modal:", err);
                }

                if (typeof allMembersData !== 'undefined') {
                    renderQuickMemberList(allMembersData);
                }
            }
        });
    }

    // হেল্পপার ফাংশন
    function convertDateFormat(dateStr) {
        if (!dateStr) return '';
        if (dateStr.includes('-') && dateStr.split('-')[0].length === 4) return dateStr;
        const [day, month, year] = dateStr.split('-');
        return `${year}-${month}-${day}`;
    }

    // ২. মোডাল বন্ধ করা
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            if (modal) modal.style.display = 'none';
            window.location.reload();
        });
    }

    // ৩. মেম্বার লিস্ট রেন্ডার করা (অটো মিল অন/অফ সুইচসহ)
    function renderQuickMemberList(members) {
        if (!memberListContainer) return;
        
        document.querySelectorAll('.quick-member-checkbox').forEach(cb => {
            if (cb.checked) {
                selectedQuickMemberIds.add(cb.value);
            } else {
                selectedQuickMemberIds.delete(cb.value);
            }
        });

        const sortedMembers = [...members].sort((a, b) => {
            const aChecked = selectedQuickMemberIds.has(String(a._id));
            const bChecked = selectedQuickMemberIds.has(String(b._id));
            if (aChecked && !bChecked) return -1;
            if (!aChecked && bChecked) return 1;
            return 0;
        });

        memberListContainer.innerHTML = '';

        const defaultLunch = (globalLunchMainInput && globalLunchMainInput.value !== '') ? Number(globalLunchMainInput.value) : 1;
        const defaultDinner = (globalDinnerMainInput && globalDinnerMainInput.value !== '') ? Number(globalDinnerMainInput.value) : 1;

        sortedMembers.forEach(m => {
            const isChecked = selectedQuickMemberIds.has(String(m._id));
            // অটো মিলের স্ট্যাটাস চেক (ডিফল্টভাবে অন বা true থাকবে)
            const isAutoMealActive = (typeof autoMealStatusMap !== 'undefined' && autoMealStatusMap[m._id] !== undefined) 
                ? autoMealStatusMap[m._id] 
                : true;

            const div = document.createElement('div');
            div.className = 'quick-member-row';
            div.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid #edf2f7; background: #fff; border-radius: 6px; margin-bottom: 6px; gap: 10px;';
            
            div.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 8px;">
                    <!-- মেম্বার ইনফো এবং টগল সুইচ -->
                    <div style="display: flex; align-items: center; gap: 8px; min-width: 155px; max-width: 175px; flex-shrink: 0;">
                        <input type="checkbox" class="quick-member-checkbox" value="${m._id}" data-name="${m.name}" ${isChecked ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer; flex-shrink: 0;">
                        <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex-grow: 1;">
                            <div style="font-weight: 600; color: #2d3748; font-size: 13px;">${m.name}</div>
                            <div style="font-size: 11px; color: #718096;">${m.semester || ''} - ${m.roomID || 'N/A'}</div>
                        </div>
                        <div title="Auto Meal Status" style="flex-shrink: 0;">
                            <label class="switch" style="position: relative; display: inline-block; width: 28px; height: 16px; margin-bottom: 0;">
                                <input type="checkbox" class="quick-auto-status-toggle" data-id="${m._id}" ${isAutoMealActive ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;">
                                <span class="slider-toggle" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: ${isAutoMealActive ? '#38a169' : '#cbd5e0'}; transition: .4s; border-radius: 16px;"></span>
                            </label>
                        </div>
                    </div>

                    <!-- লাঞ্চ এবং ডিনার কাউন্টার সেকশন -->
                    <div style="display: flex; flex-direction: column; gap: 3px; flex-grow: 1; justify-content: flex-end;">
                        <div style="display: flex; align-items: center; justify-content: flex-end; gap: 4px; font-size: 11px;">
                            <span style="font-weight: 600; color: #4a5568; margin-right: 2px;">Lunch:</span>
                            <span style="color: #718096; font-size: 10px;">Main</span>
                            <div class="custom-counter" style="display:flex; align-items:center; border:1px solid #cbd5e0; border-radius:3px; background:#fff; overflow:hidden;">
                                <button type="button" class="btn-dec" style="background:#edf2f7; border:none; padding:1px 4px; cursor:pointer;">-</button>
                                <input type="number" min="0" value="${defaultLunch}" class="qm-input qm-lunch-main" style="width:22px; border:none; text-align:center; font-size:11px; outline:none;" data-id="${m._id}">
                                <button type="button" class="btn-inc" style="background:#edf2f7; border:none; padding:1px 4px; cursor:pointer;">+</button>
                            </div>
                            <span style="color: #718096; font-size: 10px;">Guest</span>
                            <div class="custom-counter" style="display:flex; align-items:center; border:1px solid #cbd5e0; border-radius:3px; background:#fff; overflow:hidden;">
                                <button type="button" class="btn-dec" style="background:#edf2f7; border:none; padding:1px 4px; cursor:pointer;">-</button>
                                <input type="number" min="0" value="0" class="qm-input qm-lunch-guest" style="width:22px; border:none; text-align:center; font-size:11px; outline:none;" data-id="${m._id}">
                                <button type="button" class="btn-inc" style="background:#edf2f7; border:none; padding:1px 4px; cursor:pointer;">+</button>
                            </div>
                            <span style="color: #718096; font-size: 10px;">Fine</span>
                            <div class="custom-counter" style="display:flex; align-items:center; border:1px solid #cbd5e0; border-radius:3px; background:#fff; overflow:hidden;">
                                <button type="button" class="btn-dec" style="background:#edf2f7; border:none; padding:1px 4px; cursor:pointer;">-</button>
                                <input type="number" min="0" value="0" class="qm-input qm-lunch-fine" style="width:22px; border:none; text-align:center; font-size:11px; outline:none;" data-id="${m._id}">
                                <button type="button" class="btn-inc" style="background:#edf2f7; border:none; padding:1px 4px; cursor:pointer;">+</button>
                            </div>
                        </div>

                        <div style="display: flex; align-items: center; justify-content: flex-end; gap: 4px; font-size: 11px;">
                            <span style="font-weight: 600; color: #4a5568; margin-right: 2px;">Dinner:</span>
                            <span style="color: #718096; font-size: 10px;">Main</span>
                            <div class="custom-counter" style="display:flex; align-items:center; border:1px solid #cbd5e0; border-radius:3px; background:#fff; overflow:hidden;">
                                <button type="button" class="btn-dec" style="background:#edf2f7; border:none; padding:1px 4px; cursor:pointer;">-</button>
                                <input type="number" min="0" value="${defaultDinner}" class="qm-input qm-dinner-main" style="width:22px; border:none; text-align:center; font-size:11px; outline:none;" data-id="${m._id}">
                                <button type="button" class="btn-inc" style="background:#edf2f7; border:none; padding:1px 4px; cursor:pointer;">+</button>
                            </div>
                            <span style="color: #718096; font-size: 10px;">Guest</span>
                            <div class="custom-counter" style="display:flex; align-items:center; border:1px solid #cbd5e0; border-radius:3px; background:#fff; overflow:hidden;">
                                <button type="button" class="btn-dec" style="background:#edf2f7; border:none; padding:1px 4px; cursor:pointer;">-</button>
                                <input type="number" min="0" value="0" class="qm-input qm-dinner-guest" style="width:22px; border:none; text-align:center; font-size:11px; outline:none;" data-id="${m._id}">
                                <button type="button" class="btn-inc" style="background:#edf2f7; border:none; padding:1px 4px; cursor:pointer;">+</button>
                            </div>
                            <span style="color: #718096; font-size: 10px;">Fine</span>
                            <div class="custom-counter" style="display:flex; align-items:center; border:1px solid #cbd5e0; border-radius:3px; background:#fff; overflow:hidden;">
                                <button type="button" class="btn-dec" style="background:#edf2f7; border:none; padding:1px 4px; cursor:pointer;">-</button>
                                <input type="number" min="0" value="0" class="qm-input qm-dinner-fine" style="width:22px; border:none; text-align:center; font-size:11px; outline:none;" data-id="${m._id}">
                                <button type="button" class="btn-inc" style="background:#edf2f7; border:none; padding:1px 4px; cursor:pointer;">+</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // মেম্বার চেকবাক্স ইভেন্ট
            const checkbox = div.querySelector('.quick-member-checkbox');
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    selectedQuickMemberIds.add(m._id);
                } else {
                    selectedQuickMemberIds.delete(m._id);
                }
                if (typeof allMembersData !== 'undefined') {
                    renderQuickMemberList(allMembersData);
                } else {
                    updateSelectedCountAndSelectAll();
                }
            });

            // অটো মিল টগল সুইচ ইভেন্ট
            const autoToggle = div.querySelector('.quick-auto-status-toggle');
            autoToggle.addEventListener('change', (e) => {
                if (typeof autoMealStatusMap === 'undefined') {
                    window.autoMealStatusMap = {};
                }
                autoMealStatusMap[m._id] = e.target.checked;
                // সুইচের ব্যাকগ্রাউন্ড কালার ডাইনামিক আপডেট
                const slider = e.target.nextElementSibling;
                slider.style.backgroundColor = e.target.checked ? '#38a169' : '#cbd5e0';
            });

            // কাউন্টার বাটনগুলোর ইভেন্ট হ্যান্ডলার
            div.querySelectorAll('.custom-counter').forEach(counter => {
                const input = counter.querySelector('input');
                const btnDec = counter.querySelector('.btn-dec');
                const btnInc = counter.querySelector('.btn-inc');

                btnDec.addEventListener('click', () => {
                    let val = input.value !== '' ? Number(input.value) : 0;
                    if (val > 0) input.value = val - 1;
                });

                btnInc.addEventListener('click', () => {
                    let val = input.value !== '' ? Number(input.value) : 0;
                    input.value = val + 1;
                });
            });

            memberListContainer.appendChild(div);
        });

        updateSelectedCountAndSelectAll();
    }

    // ৪. Select All চেকবক্স লজিক
    // ৪. Select All চেকবক্স লজিক
if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        const checkboxes = document.querySelectorAll('.quick-member-checkbox');
        
        checkboxes.forEach(cb => {
            cb.checked = isChecked;
            if (isChecked) {
                selectedQuickMemberIds.add(cb.value);
            } else {
                selectedQuickMemberIds.delete(cb.value);
            }
        });

        // নতুন কোড: Select All করার পর লিস্ট রি-রেন্ডার করা
        if (typeof allMembersData !== 'undefined') {
            renderQuickMemberList(allMembersData);
        } else {
            updateSelectedCountAndSelectAll();
        }
    });
}

    // ৫. গ্লোবাল মেইন মিল সিঙ্ক
    if (globalLunchMainInput) {
        globalLunchMainInput.addEventListener('input', (e) => {
            const val = e.target.value;
            document.querySelectorAll('.qm-lunch-main').forEach(input => {
                input.value = val;
            });
        });
    }

    if (globalDinnerMainInput) {
        globalDinnerMainInput.addEventListener('input', (e) => {
            const val = e.target.value;
            document.querySelectorAll('.qm-dinner-main').forEach(input => {
                input.value = val;
            });
        });
    }

    // ৬. সার্চ ফিল্টার
    if (searchInputModal) {
        searchInputModal.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = allMembersData.filter(m => m.name.toLowerCase().includes(term) || String(m.roomID).includes(term));
            renderQuickMemberList(filtered);
        });
    }

    // ৭. ডেটা সেভ করা
    // ৭. ডেটা সেভ করা (আপডেটেড লজিক)
    if (saveQuickBtn) {
        saveQuickBtn.addEventListener('click', async () => {
            const selectedDate = document.getElementById('quick-meal-date').value;

            if (!selectedDate) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Attention',
                    text: 'দয়া করে একটি তারিখ সিলেক্ট করুন!',
                    confirmButtonColor: '#3182ce'
                });
                return;
            }

            // এখন আমরা সরাসরি selectedQuickMemberIds সেট থেকে চেক করব
            if (selectedQuickMemberIds.size === 0) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Attention',
                    text: 'কমপক্ষে একজন মেম্বার সিলেক্ট করুন!',
                    confirmButtonColor: '#3182ce'
                });
                return;
            }

            let mealsPayload = [];

            // Set-এর প্রতিটি মেম্বার আইডি ধরে লুপ চালাবো, সে DOM-এর যে পৃষ্ঠায় বা সার্চে থাকুক না কেন!
            selectedQuickMemberIds.forEach(memberId => {
                // মেম্বারের রো (row) DOM-এ যদি দৃশ্যমান থাকে, সেখান থেকে ইনপুট নেব
                const row = memberListContainer.querySelector(`.quick-member-checkbox[value="${memberId}"]`)?.closest('.quick-member-row');

                let lunchMain = 0, lunchGuest = 0, lunchFine = 0;
                let dinnerMain = 0, dinnerGuest = 0, dinnerFine = 0;

                if (row) {
                    const lunchMainInput = row.querySelector('.qm-lunch-main');
                    lunchMain = (lunchMainInput && lunchMainInput.value !== '') ? Number(lunchMainInput.value) : 0;

                    const lunchGuestInput = row.querySelector('.qm-lunch-guest');
                    lunchGuest = (lunchGuestInput && lunchGuestInput.value !== '') ? Number(lunchGuestInput.value) : 0;

                    const lunchFineInput = row.querySelector('.qm-lunch-fine');
                    lunchFine = (lunchFineInput && lunchFineInput.value !== '') ? Number(lunchFineInput.value) : 0;

                    const dinnerMainInput = row.querySelector('.qm-dinner-main');
                    dinnerMain = (dinnerMainInput && dinnerMainInput.value !== '') ? Number(dinnerMainInput.value) : 0;

                    const dinnerGuestInput = row.querySelector('.qm-dinner-guest');
                    dinnerGuest = (dinnerGuestInput && dinnerGuestInput.value !== '') ? Number(dinnerGuestInput.value) : 0;

                    const dinnerFineInput = row.querySelector('.qm-dinner-fine');
                    dinnerFine = (dinnerFineInput && dinnerFineInput.value !== '') ? Number(dinnerFineInput.value) : 0;
                } else {
                    // যদি রো ডাইরেক্ট DOM-এ না থাকে (যেমন সার্চ ফিল্টার করার কারণে লুকিয়ে থাকে), 
                    // তখন গ্লোবাল ডিফল্ট ভ্যালু বা জিরো বসবে
                    lunchMain = (globalLunchMainInput && globalLunchMainInput.value !== '') ? Number(globalLunchMainInput.value) : 0;
                    dinnerMain = (globalDinnerMainInput && globalDinnerMainInput.value !== '') ? Number(globalDinnerMainInput.value) : 0;
                }

                mealsPayload.push({
                    memberId: memberId,
                    date: selectedDate,
                    mainLunch: lunchMain,
                    guestLunch: lunchGuest,
                    fineLunch: lunchFine,
                    mainDinner: dinnerMain,
                    guestDinner: dinnerGuest,
                    fineDinner: dinnerFine
                });
            });

            try {
                const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                const response = await fetch(API + '/api/save-meals', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify({ meals: mealsPayload })
                });

                const result = await response.json();
                if (response.ok) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Updated!',
                        text: 'সফলভাবে কুইক মিল আপডেট হয়েছে!',
                        confirmButtonColor: '#38a169'
                    }).then(() => {
                        if (modal) modal.style.display = 'none';
                        window.location.reload();
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Failed',
                        text: result.message || "মিল সেভ করতে সমস্যা হয়েছে!",
                        confirmButtonColor: '#e53e3e'
                    });
                }
            } catch (err) {
                console.error("Quick Meal Save Error:", err);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'সার্ভার কানেকশনে ত্রুটি!',
                    confirmButtonColor: '#e53e3e'
                });
            }
        });
    }

    // ৮. Select Yesterday বাটন লজিক
    const selectYesterdayBtn = document.getElementById('select-yesterday-btn');

    if (selectYesterdayBtn) {
        selectYesterdayBtn.addEventListener('click', async () => {
            try {
                let termStart = "2025-01-01";
                const activeTermInput = document.getElementById('active-term-start') || document.getElementById('start-date');
                if (activeTermInput && activeTermInput.value) {
                    termStart = activeTermInput.value;
                }

                const futureDate = "2050-12-31"; 
                const token = localStorage.getItem('token') || sessionStorage.getItem('token');

                const response = await fetch(API + `/api/get-meals?start=${termStart}&end=${futureDate}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (!response.ok) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'মিল ডাটা ফেচ করতে সমস্যা হয়েছে!',
                        confirmButtonColor: '#e53e3e'
                    });
                    return;
                }

                const savedMeals = await response.json();
                if (!Array.isArray(savedMeals) || savedMeals.length === 0) {
                    Swal.fire({
                        icon: 'info',
                        title: 'No Record',
                        text: 'পূর্বের কোনো মিল রেকর্ড পাওয়া যায়নি!',
                        confirmButtonColor: '#3182ce'
                    });
                    return;
                }

                const dates = [...new Set(savedMeals.map(m => m.date))].sort();
                const lastMealDate = dates[dates.length - 1]; 

                if (!lastMealDate) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Not Found',
                        text: 'সর্বশেষ কোনো মিলের তারিখ পাওয়া যায়নি!',
                        confirmButtonColor: '#3182ce'
                    });
                    return;
                }

                const lastDateMeals = savedMeals.filter(m => m.date === lastMealDate);
                const activeMemberIds = lastDateMeals.map(m => String(m.memberId));

                const rows = document.querySelectorAll('.quick-member-row');
                let selectedCount = 0;

                rows.forEach(row => {
                    const checkbox = row.querySelector('.quick-member-checkbox');
                    if (!checkbox) return;
                    const memberId = checkbox.value;

                    if (activeMemberIds.includes(memberId)) {
                        checkbox.checked = true;
                        selectedQuickMemberIds.add(String(memberId));
                        selectedCount++;

                        const mealData = lastDateMeals.find(m => String(m.memberId) === memberId);
                        if (mealData) {
                            const lMain = row.querySelector('.qm-lunch-main');
                            const lGuest = row.querySelector('.qm-lunch-guest');
                            const lFine = row.querySelector('.qm-lunch-fine');
                            
                            const dMain = row.querySelector('.qm-dinner-main');
                            const dGuest = row.querySelector('.qm-dinner-guest');
                            const dFine = row.querySelector('.qm-dinner-fine');

                            if (lMain) lMain.value = mealData.lunch ?? mealData.mainLunch ?? 0;
                            if (lGuest) lGuest.value = mealData.lunch_guest ?? mealData.guestLunch ?? 0;
                            if (lFine) lFine.value = mealData.lunch_fine ?? mealData.fineLunch ?? 0;

                            if (dMain) dMain.value = mealData.dinner ?? mealData.mainDinner ?? 0;
                            if (dGuest) dGuest.value = mealData.dinner_guest ?? mealData.guestDinner ?? 0;
                            if (dFine) dFine.value = mealData.dinner_fine ?? mealData.fineDinner ?? 0;
                        }
                    } else {
                        checkbox.checked = false;
                        selectedQuickMemberIds.delete(String(memberId));
                    }
                });

                updateSelectedCountAndSelectAll();
                // নতুন কোড: গতকালের মেম্বাররা সিলেক্ট হওয়ার পর তাদের উপরে নিয়ে আসার জন্য
                if (typeof allMembersData !== 'undefined') {
                    renderQuickMemberList(allMembersData);
                }

                Swal.fire({
                    icon: 'success',
                    title: 'Copied!',
                    text: `সর্বশেষ তারিখ (${lastMealDate}) এর ${selectedCount} জন মেম্বার সফলভাবে সিলেক্ট করা হয়েছে!`,
                    confirmButtonColor: '#38a169'
                });

            } catch (err) {
                console.error("Error:", err);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'কিছু একটা সমস্যা হয়েছে!',
                    confirmButtonColor: '#e53e3e'
                });
            }
        });
    }
});

// ==========================================
// Meal Summary হ্যান্ডেলিং (সার্চবারসহ)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // --- Meal Summary Elements ---
    const openSummaryModalBtn = document.getElementById('open-meal-summary-modal');
    const summaryModal = document.getElementById('meal-summary-modal');
    const closeSummaryModalBtn = document.getElementById('close-summary-modal');
    const loadSummaryBtn = document.getElementById('load-summary-btn');
    const summaryDateInput = document.getElementById('summary-filter-date');
    const summaryResultContainer = document.getElementById('summary-result-container');

    // মেম্বারদের জন্য Meal Summary বাটন হাইড করার লজিক
    try {
        const userRole = (localStorage.getItem('userRole') || '').toLowerCase();
        const userStatus = (localStorage.getItem('userStatus') || '').toLowerCase();

        // ইউজার যদি ম্যানেজার না হয়, তবে সামারি বাটনটি হাইড করে দেওয়া হবে
        if (userRole !== 'manager' || userStatus !== 'active') {
            if (openSummaryModalBtn) {
                openSummaryModalBtn.style.display = 'none';
            }
        }
    } catch (e) {
        console.error("Summary permission check error:", e);
    }

    // --- Meal Summary Modal Logic ---
    if (openSummaryModalBtn) {
        openSummaryModalBtn.addEventListener('click', () => {
            if (summaryModal) summaryModal.style.display = 'flex';
        });
    }

    if (closeSummaryModalBtn) {
        closeSummaryModalBtn.addEventListener('click', () => {
            summaryModal.style.display = 'none';
            window.location.reload();
        });
    }

    if (loadSummaryBtn) {
        loadSummaryBtn.addEventListener('click', async () => {
            const selectedDate = summaryDateInput.value;
            if (!selectedDate) {
                Swal.fire({ icon: 'warning', title: 'Attention', text: 'দয়া করে ডেট সিলেক্ট করুন!' });
                return;
            }

            try {
                const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                const res = await fetch(API + `/api/get-meals?start=${selectedDate}&end=${selectedDate}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    const mealsData = await res.json();
                    
                    const mealMap = {};
                    if (Array.isArray(mealsData)) {
                        mealsData.forEach(item => {
                            mealMap[String(item.memberId)] = item;
                        });
                    }

                    if (!allMembersData || allMembersData.length === 0) {
                        summaryResultContainer.innerHTML = `<p style="text-align: center; color: #e53e3e; background: #fff !important; padding: 20px;">কোনো মেম্বার ডেটা পাওয়া যায়নি!</p>`;
                        return;
                    }

                    let totalActiveMembers = 0;
                    let totalLunchMeals = 0;
                    let totalDinnerMeals = 0;

                    allMembersData.forEach(m => {
                        const record = mealMap[String(m._id)];
                        const lMain = record?.mainLunch || 0;
                        const lGuest = record?.guestLunch || 0;
                        const dMain = record?.mainDinner || 0;
                        const dGuest = record?.guestDinner || 0;

                        if (lMain > 0 || dMain > 0 || lGuest > 0 || dGuest > 0) {
                            totalActiveMembers++;
                        }
                        totalLunchMeals += lMain + lGuest;
                        totalDinnerMeals += dMain + dGuest;
                    });

                    // সামারি বক্স, সার্চবার এবং টেবিল স্ট্রাকচার
                    let html = `
                        <div style="background: #fff !important; color: #2d3748 !important; padding: 5px;">
                            
                            <!-- তারিখের নিচে স্ট্যাটাস বা সামারি বক্স -->
                            <div style="display: flex; justify-content: space-between; align-items: center; background: #f7fafc; padding: 10px 14px; border-radius: 6px; margin-bottom: 10px; border: 1px solid #e2e8f0; font-size: 13px; font-weight: 500; color: #4a5568;">
                                <div>📅 Date: <strong style="color: #2d3748;">${selectedDate}</strong></div>
                                <div>👥 Active Members: <strong style="color: #3182ce;">${totalActiveMembers}</strong></div>
                                <div>🍽️ Lunch Total: <strong style="color: #3182ce;">${totalLunchMeals}</strong></div>
                                <div>🌙 Dinner Total: <strong style="color: #3182ce;">${totalDinnerMeals}</strong></div>
                            </div>

                            <!-- মেম্বার সার্চবার -->
                            <div style="margin-bottom: 10px;">
                                <input type="text" id="summary-member-search" placeholder="Search member by name or room..." style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e0; border-radius: 6px; font-size: 13px; outline: none; background: #fff; color: #2d3748;">
                            </div>

                            <!-- টেবিল সেকশন -->
                            <div style="max-height: 310px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 6px;">
                                <table id="summary-members-table" style="width: 100%; border-collapse: collapse; background: #fff !important; color: #2d3748 !important; text-align: left; font-size: 13px;">
                                    <thead>
                                        <tr style="background: #edf2f7 !important; color: #2d3748 !important; position: sticky; top: 0; z-index: 1;">
                                            <th style="padding: 10px 12px; border-bottom: 1px solid #cbd5e0;">Member Name</th>
                                            <th style="padding: 10px 12px; border-bottom: 1px solid #cbd5e0; text-align: center;">Lunch (Main/Guest)</th>
                                            <th style="padding: 10px 12px; border-bottom: 1px solid #cbd5e0; text-align: center;">Dinner (Main/Guest)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                    `;

                    allMembersData.forEach(m => {
                        const record = mealMap[String(m._id)];
                        const lunchMain = record?.mainLunch || 0;
                        const lunchGuest = record?.guestLunch || 0;
                        const dinnerMain = record?.mainDinner || 0;
                        const dinnerGuest = record?.guestDinner || 0;

                        html += `
                            <tr class="summary-member-row" data-name="${m.name.toLowerCase()}" data-room="${(m.roomID || '').toLowerCase()}" style="background: #fff !important; border-bottom: 1px solid #edf2f7;">
                                <td style="padding: 10px 12px; background: #fff !important; color: #2d3748 !important;">
                                    <div style="font-weight: 600; color: #2d3748;">${m.name}</div>
                                    <div style="font-size: 11px; color: #718096;">${m.semester || ''} - ${m.roomID || 'N/A'}</div>
                                </td>
                                <td style="padding: 10px 12px; text-align: center; background: #fff !important; color: #2d3748 !important;">
                                    <span style="background: #edf2f7; padding: 3px 8px; border-radius: 4px; font-weight: 500; color: #2d3748;">${lunchMain} / ${lunchGuest}</span>
                                </td>
                                <td style="padding: 10px 12px; text-align: center; background: #fff !important; color: #2d3748 !important;">
                                    <span style="background: #edf2f7; padding: 3px 8px; border-radius: 4px; font-weight: 500; color: #2d3748;">${dinnerMain} / ${dinnerGuest}</span>
                                </td>
                            </tr>
                        `;
                    });

                    html += `
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    `;

                    summaryResultContainer.innerHTML = html;

                    // সার্চবারের লাইভ ফিল্টারিং লজিক
                    const searchInput = document.getElementById('summary-member-search');
                    if (searchInput) {
                        searchInput.addEventListener('input', (e) => {
                            const query = e.target.value.toLowerCase().trim();
                            const rows = summaryResultContainer.querySelectorAll('.summary-member-row');

                            rows.forEach(row => {
                                const name = row.getAttribute('data-name');
                                const room = row.getAttribute('data-room');
                                if (name.includes(query) || room.includes(query)) {
                                    row.style.display = '';
                                } else {
                                    row.style.display = 'none';
                                }
                            });
                        });
                    }

                } else {
                    summaryResultContainer.innerHTML = `<p style="text-align: center; color: #e53e3e; background: #fff !important; padding: 20px;">ডাটা লোড করতে সমস্যা হয়েছে!</p>`;
                }
            } catch (err) {
                console.error("Summary error:", err);
            }
        });
    }
});


// রাত ১০:৩০ টার অটো মিল প্রসেসিং লজিক (উদাহরণস্বরূপ)
async function processAutoMealsForNextDay() {
    try {
        const todayStr = getFormattedDate(new Date()); // আজকের তারিখ (যেমন: "2026-08-04")
        const tomorrowStr = getFormattedDate(new Date(Date.now() + 86400000)); // আগামীকালের তারিখ ("2026-08-05")

        // সব মেম্বার বা যাদের অটো মিল অন আছে তাদের ফেচ করুন
        // autoMealStatusMap চেক করুন কার কার টগল অন আছে
        for (let memberId of allMemberIds) {
            // যদি এই মেম্বারের অটো মিল টগল অফ থাকে, তবে স্কিপ করুন
            if (autoMealStatusMap && autoMealStatusMap[memberId] === false) continue;

            // ১. আজকের (4 August) মিল রেকর্ড ডাটাবেজ থেকে আনুন
            const todayRecord = await MealModel.findOne({ memberId, date: todayStr });

            let lunchMainToSet = 0;
            let dinnerMainToSet = 0;

            if (todayRecord) {
                // আজকের মেইন মিল চেক করা হচ্ছে
                const todayLunchMain = todayRecord.lunch?.main || 0;
                const todayDinnerMain = todayRecord.dinner?.main || 0;

                // শর্ত অনুযায়ী আগামীকালের জন্য সেট হবে
                if (todayLunchMain > 0) {
                    lunchMainToSet = todayLunchMain; // যেমন: ১ হলে ১ সেট হবে
                }
                if (todayDinnerMain > 0) {
                    dinnerMainToSet = todayDinnerMain;
                }
            }

            // ২. যদি আজকের দু'টো মিলই ০ হয়, তবে আগামীকালের জন্য ডাটাবেজে কোনো রিকোয়েস্ট পাঠানোর দরকার নেই (Skip)
            if (lunchMainToSet === 0 && dinnerMainToSet === 0) {
                continue; 
            }

            // ৩. আগামীকালের (5 August) জন্য ডাটাবেজে সেভ বা আপডেটের রিকোয়েস্ট পাঠান
            // খেয়াল রাখবেন: Guest meal এবং Fine meal এখানে সবসময় 0 বা পাঠানো লাগবে না
            const nextDayData = {
                memberId: memberId,
                date: tomorrowStr,
                lunch: {
                    main: lunchMainToSet,
                    guest: 0,
                    fine: 0
                },
                dinner: {
                    main: dinnerMainToSet,
                    guest: 0,
                    fine: 0
                }
            };

            // ডাটাবেজে আপসর্ট (Upsert) বা সেভ করুন
            await MealModel.findOneAndUpdate(
                { memberId: memberId, date: tomorrowStr },
                nextDayData,
                { upsert: true, new: true }
            );
        }

        console.log("Auto meal for next day processed successfully!");
    } catch (error) {
        console.error("Error processing auto meals:", error);
    }
}