// ==========================================
// Past Record Details - Data Loading Logic
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    // ১. URL বা LocalStorage থেকে সিলেক্ট করা ডায়েরির Start ও End Date নেওয়া
    const urlParams = new URLSearchParams(window.location.search);
    const termStart = urlParams.get('start') || localStorage.getItem('selectedPastTermStart');
    const termEnd = urlParams.get('end') || localStorage.getItem('selectedPastTermEnd');

    if (!termStart || !termEnd) {
        alert('Term date not found! Returning to Past Records.');
        window.location.href = 'past-record.html';
        return;
    }

    // হেডার সেকশনে ডেট রেঞ্জ সুন্দর করে দেখানো
    const dateRangeEl = document.getElementById('term-date-range');
    if (dateRangeEl) {
        dateRangeEl.innerText = `Term Period: ${termStart} to ${termEnd}`;
    }

    console.log(`Fetching details for Term: ${termStart} to ${termEnd}`);

    // ২. ৪টি সেকশনের জন্য আলাদা ডেটা ফেচ ফাংশন কল করা
    await loadPastMeals(termStart, termEnd);
    await loadPastMembers(termStart, termEnd);
    await loadPastExpenses(termStart, termEnd);
    await loadPastReport(termStart, termEnd);
});

// ১. Meal Records ডেটা লোড করার ফাংশন
async function loadPastMeals(start, end) {
    try {
        const userPhone = localStorage.getItem('userPhone') || sessionStorage.getItem('userPhone');
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');

        const response = await fetch(API + `/api/past-meals?phone=${userPhone}&start=${start}&end=${end}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        const container = document.getElementById('past-meal-container');
        if (container) {
            // আপনার প্রয়োজন অনুযায়ী এখানে টেবিল বা ডেটা রেন্ডার করবেন
            container.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
        }
    } catch (err) {
        console.error("Error loading past meals:", err);
        document.getElementById('past-meal-container').innerHTML = `<span style="color: red;">Failed to load meal records.</span>`;
    }
}

// ২. Members ডেটা লোড করার ফাংশন
async function loadPastMembers(start, end) {
    try {
        const userPhone = localStorage.getItem('userPhone') || sessionStorage.getItem('userPhone');
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');

        const response = await fetch(API + `/api/past-members?phone=${userPhone}&start=${start}&end=${end}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        const container = document.getElementById('past-member-container');
        if (container) {
            container.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
        }
    } catch (err) {
        console.error("Error loading past members:", err);
        document.getElementById('past-member-container').innerHTML = `<span style="color: red;">Failed to load members.</span>`;
    }
}

// ৩. Expenses ডেটা লোড করার ফাংশন
async function loadPastExpenses(start, end) {
    try {
        const userPhone = localStorage.getItem('userPhone') || sessionStorage.getItem('userPhone');
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');

        const response = await fetch(API + `/api/past-expenses?phone=${userPhone}&start=${start}&end=${end}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        const container = document.getElementById('past-expense-container');
        if (container) {
            container.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
        }
    } catch (err) {
        console.error("Error loading past expenses:", err);
        document.getElementById('past-expense-container').innerHTML = `<span style="color: red;">Failed to load expenses.</span>`;
    }
}

// ৪. Monthly Report ডেটা লোড করার ফাংশন
async function loadPastReport(start, end) {
    try {
        const userPhone = localStorage.getItem('userPhone') || sessionStorage.getItem('userPhone');
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');

        const response = await fetch(API + `/api/past-report?phone=${userPhone}&start=${start}&end=${end}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        const container = document.getElementById('past-report-container');
        if (container) {
            container.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
        }
    } catch (err) {
        console.error("Error loading past report:", err);
        document.getElementById('past-report-container').innerHTML = `<span style="color: red;">Failed to load monthly report.</span>`;
    }
}

// ট্যাব সুইচ করার ফাংশন
function switchTab(tabName, event) {
    if (event) event.preventDefault();

    // সব ট্যাব কনটেন্ট হাইড করা
    document.querySelectorAll('.tab-content').forEach(el => {
        el.classList.remove('active');
    });

    // সব সাইডবার আইটেম থেকে active ক্লাস সরিয়ে ফেলা
    document.querySelectorAll('.sidebar-menu-container .menu-item').forEach(el => {
        el.classList.remove('active');
    });

    // ক্লিক করা ট্যাবটি শো করা
    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetTab) {
        targetTab.classList.add('active');
    }

    // ক্লিক করা মেনু আইটেমকে active করা
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
}