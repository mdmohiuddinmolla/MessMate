// ==========================================
// Past Record - Diary Generation Logic (Max 6 Diaries)
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
    await loadPastRecordDiaries();
});

async function loadPastRecordDiaries() {
    try {
        const userPhone = localStorage.getItem('userPhone') || sessionStorage.getItem('userPhone');
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');

        // ১. ব্যাকএন্ড থেকে এক্সপায়ার্ড টার্মগুলোর লিস্ট ফেচ করা[cite: 4]
        const response = await fetch(API + `/api/expired-terms?phone=${userPhone}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error("Failed to fetch past terms");
        
        const data = await response.json();
        let expiredTerms = data.expiredTerms || []; 

        // ২. termEnd তারিখ অনুযায়ী ডিসেন্ডিং সর্ট করা এবং সর্বোচ্চ ৬টি ফিল্টার করা[cite: 4]
        expiredTerms.sort((a, b) => new Date(b.termEnd) - new Date(a.termEnd));
        const latestSixTerms = expiredTerms.slice(0, 6);

        const container = document.getElementById('diary-container'); 
        if (!container) return;
        container.innerHTML = '';

        if (latestSixTerms.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 80px 20px;">
                    <i class="fas fa-folder-open" style="font-size: 65px; color: #a0aec0; margin-bottom: 20px;"></i>
                    <h2 style="font-size: 28px; color: var(--text-color, #e2e8f0); font-weight: 700;">No Past Records Found</h2>
                    <p style="color: #a0aec0; margin-top: 10px; font-size: 15px;">Previous term diaries will appear here once terms are expired/closed.</p>
                </div>
            `;
            return;
        }

        // ৩. expenses.html-এর বুক শেলফ স্টাইলের সাথে সামঞ্জস্য রেখে ডাইনামিক ডায়েরি কার্ড তৈরি[cite: 2, 4]
        // ৩. expenses.html-এর বুক শেলফ স্টাইলের সাথে সামঞ্জস্য রেখে ডাইনামিক ডায়েরি কার্ড তৈরি
        latestSixTerms.forEach((term, index) => {
            const diaryCard = document.createElement('div');
            
            // expenses.css এর .bazar-book-cover ক্লাসের ডিজাইন এখানে ব্যবহার করা হলো
            diaryCard.className = 'bazar-book-cover'; 
            
            // dd-mm-yyyy ফরম্যাটকে সুন্দর করে দেখানোর হেল্পার ফাংশন
            const formatDate = (dateStr) => {
                if (!dateStr) return '';
                
                // যদি ডেটাটি "dd-mm-yyyy" ফরম্যাটে থাকে (যেমন: 30-06-2026)
                let formattedStr = dateStr;
                if (dateStr.includes('-') && dateStr.split('-')[0].length === 2) {
                    const parts = dateStr.split('-');
                    // YYYY-MM-DD ফরম্যাটে রূপান্তর করা
                    formattedStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
                }

                const dateObj = new Date(formattedStr);
                if (isNaN(dateObj.getTime())) return dateStr;
                
                const day = dateObj.getDate();
                const month = dateObj.toLocaleDateString('en-US', { month: 'short' });
                const year = dateObj.getFullYear();
                
                return `${day} ${month} ${year}`;
            };

            const formattedStart = formatDate(term.termStart);
            const formattedEnd = formatDate(term.termEnd);

            diaryCard.innerHTML = `
                <div class="cover-date"><i class="fas fa-book-open"></i> Record ${index + 1}</div>
                <div class="cover-title" style="font-size: 20px;">${formattedStart} to ${formattedEnd}</div>
                <div class="cover-status" style="color: #2ec4b6;">View Details <i class="fas fa-arrow-right"></i></div>
            `;

            // কার্ডে ক্লিক করলে নির্দিষ্ট পাস্ট ডায়েরির বিস্তারিত পেজে রিডাইরেক্ট হবে
            diaryCard.addEventListener('click', () => {
                openPastDiaryModal(term.termStart, term.termEnd);
            });

            container.appendChild(diaryCard);
        });

    } catch (err) {
            console.error("Past Record Error:", err);
            const container = document.getElementById('diary-container');
            if (container) {
                container.innerHTML = `<p style="text-align: center; color: #e53935; grid-column: 1 / -1;">ডাটা লোড করতে সমস্যা হয়েছে!</p>`;
            }
    }
}

// ৪. নির্দিষ্ট ডায়েরিতে ক্লিক করলে ডেটা সেভ করে ডিটেইলস পেজে যাওয়ার ফাংশন[cite: 4]
function openPastDiaryModal(termStart, termEnd) {
    console.log(`Opening Diary for Term: ${termStart} to ${termEnd}`);
    
    // লোকাল স্টোরেজে ডেটা সেভ করা
    localStorage.setItem('selectedPastTermStart', termStart);
    localStorage.setItem('selectedPastTermEnd', termEnd);

    // রুট স্ল্যাশ (/) ছাড়া সরাসরি relative path দিন
    window.location.href = `past-record-details.html?start=${termStart}&end=${termEnd}`;
}