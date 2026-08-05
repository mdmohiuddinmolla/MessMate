// ডেট পার্স করার হেল্পার ফাংশন
const parseDate = (dateStr) => {
    const [day, month, year] = dateStr.split('-');
    return new Date(year, month - 1, day);
};

// কাস্টম মেম্বার সর্টিং লজিক
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

// মান্থলি রিপোর্ট ইনিশিয়ালাইজেশন ফাংশন
async function initMonthlyReport() {
    try {
        // ১. ব্যাকএন্ড থেকে একটিভ টার্ম বা মাস বের করা
        const termResponse = await fetch(API + '/api/bazar-term');
        if (!termResponse.ok) throw new Error("Active term not found");
        const termData = await termResponse.json();

        if (!termData || termData.isZero === true || !termData.termStart || !termData.termEnd) {
            console.error("Active term not found for report");
            return;
        }

        const startDateStr = termData.termStart;
        const dateObjForInit = parseDate(startDateStr);
        const monthYear = `${dateObjForInit.toLocaleString('default', { month: 'long' }).toLowerCase()}_${dateObjForInit.getFullYear()}`;

        // ২. মেম্বার ডাটা এবং টার্ম সামারি ফেচ করা
        const membersRes = await fetch(API + '/api/members', {
            headers: { 'month-year': monthYear }
        });
        
        if (!membersRes.ok) return;

        const resData = await membersRes.json();
        console.log("Full Response from /api/members:", resData);
        
        let members = [];
        let mealRate = 0;

        if (Array.isArray(resData)) {
            members = resData;
        } else {
            members = resData.members || [];
            // ব্যাকএন্ডের termSummary থেকে ডাইনামিক mealRate নেওয়া
            mealRate = resData.termSummary?.mealRate || 0;
        }

        // যদি কোনো কারণে resData থেকে mealRate না আসে, তবে সরাসরি /api/members/term-summary থেকে এনে নেওয়া
        if (mealRate === 0) {
            try {
                const summaryRes = await fetch(API + '/api/members/term-summary');
                const summaryData = await summaryRes.json();
                if (summaryData && summaryData.mealRate) {
                    mealRate = summaryData.mealRate;
                }
            } catch (err) {
                console.error("Fallback mealRate fetch error:", err);
            }
        }

        if (members.length === 0) return;

        // সর্ট করা
        const sortedMembers = members.sort(customMemberSort);

        // ৩. টেবিলের বডি সিলেক্ট করা
        const tableBody = document.getElementById('report-table-body');
        if (!tableBody) return;

        tableBody.innerHTML = '';

        // ৪. মেম্বারদের লুপ চালিয়ে কার্ড ফরম্যাটে টেবিল রো তৈরি করা
        // ৪. মেম্বারদের লুপ চালিয়ে কার্ড ফরম্যাটে টেবিল রো তৈরি করা
        sortedMembers.forEach((member, index) => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-gray-50/50';
            tr.setAttribute('data-member-id', member._id);

            // ডাটাবেজ থেকে আসা ফিল্ডগুলোর মান
            const totalMeal = member.totalMainGuest || 0;
            const cookBill = member.totalCookBill || 0;
            const deposit = member.deposit || 0;
            const due = member.due || 0;
            const refundable = member.refundable || 0;
            const fineMeal = member.totalFineMeal || 0;

            // ক্যালকুলেশন: 
            // মিলের খরচ = totalMainGuest * mealRate
            const mealCost = parseFloat((totalMeal * mealRate).toFixed(2));
            
            // জরিমানা = totalFineMeal * mealRate
            const fineAmount = parseFloat((fineMeal * mealRate).toFixed(2));

            // মোট খরচ = মিলের খরচ + রান্নার খরচ + জরিমানা
            const totalCost = (mealCost + Number(cookBill) + fineAmount).toFixed(2);

            tr.innerHTML = `
                <td class="py-3 px-3 text-center font-medium text-gray-500">${index + 1}</td>
                <td class="py-3 px-3">
                    <div class="m-card">
                        <div class="font-medium text-gray-900">${member.name}</div>
                        <div class="text-xs text-gray-500">
                            <span>${member.semester || ''}</span> - <span>${member.roomID || 'N/A'}</span>
                        </div>
                    </div>
                </td>
                <td class="py-3 px-3 text-center text-gray-900">${totalMeal}</td>
                <td class="py-3 px-3 text-center text-gray-900">${mealCost.toFixed(2)}</td>
                <td class="py-3 px-3 text-center text-gray-900">${Number(cookBill).toFixed(2)}</td>
                <td class="py-3 px-3  text-center text-gray-900">${fineAmount.toFixed(2)}</td>
                <td class="py-3 px-3 text-center font-medium text-gray-900">${totalCost}</td>
                <td class="py-3 px-3 text-center text-gray-900">${Number(deposit).toFixed(2)}</td>
                <td class="py-3 px-3 text-center font-semibold text-rose-600">${Number(due).toFixed(2)}</td>
                <td class="py-3 px-3 text-center text-emerald-600">${Number(refundable).toFixed(2)}</td>
            `;
            tableBody.appendChild(tr);
        });
    } catch (error) {
        console.error("Monthly Report Init Error:", error);
    }
}

// পেজ লোড হলে ফাংশনটি রান করা
document.addEventListener('DOMContentLoaded', () => {
    initMonthlyReport();
});

// বাংলা সংখ্যায় রূপান্তর করার ছোট্ট একটি হেল্পার ফাংশন (somoykal বাংলায় দেখানোর জন্য)
function convertToBanglaNumber(input) {
    const numbers = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' };
    return input.toString().replace(/[0-9]/g, (match) => numbers[match]);
}

function formatGregorianToBanglaDate(dateStr) {
    if (!dateStr) return "";
    // ধরা যাক ডেট ফরম্যাট "15-07-2026"
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const day = convertToBanglaNumber(parts[0]);
    const monthNum = parts[1];
    const year = convertToBanglaNumber(parts[2]);

    const months = {
        "01": "জানুয়ারি", "02": "ফেব্রুয়ারি", "03": "মার্চ", "04": "এপ্রিল",
        "05": "মে", "06": "জুন", "07": "জুলাই", "08": "আগস্ট",
        "09": "সেপ্টেম্বর", "10": "অক্টোবর", "11": "নভেম্বর", "12": "ডিসেম্বর"
    };
    const monthName = months[monthNum] || monthNum;
    return `${day} ${monthName}, ${year}`;
}

// পেজ লোডের সময় তারিখ এবং ম্যানেজার ডিটেইলস আপডেট করার ফাংশন
async function loadMonthlyReportHeaderAndManager() {
    try {
        // ১. বাজার টার্ম থেকে এক্টিভ টার্মের ডেট আনা (termStart)
        const termRes = await fetch(API + '/api/bazar-term');
        const termData = await termRes.json();

        if (!termData || termData.isZero) return;

        const firstDate = termData.termStart; // টার্ম স্টার্ট ডেট
        
        // আজকের ডেট DD-MM-YYYY ফরম্যাটে তৈরি করা
        const todayObj = new Date();
        const dd = String(todayObj.getDate()).padStart(2, '0');
        const mm = String(todayObj.getMonth() + 1).padStart(2, '0');
        const yyyy = todayObj.getFullYear();
        const secondDate = `${dd}-${mm}-${yyyy}`;

        // পিক ১ এর জায়গায় তারিখ বসানো (Monthly Report 15-07-2026 - 24-07-2026)
        const titleElement = document.getElementById('monthly-report-title-date');
        if (titleElement) {
            titleElement.innerText = `Monthly Report  ${firstDate}  -  ${secondDate}`;
        }

        // ২. ম্যানেজার ডিটেইলস ফেচ করা (পিক ২ এর জন্য)
        const managerRes = await fetch(API + '/api/active-manager-details');
        const managerData = await managerRes.json();

        if (managerData.success) {
            const nameEl = document.getElementById('manager-card-name');
            const somoykalEl = document.getElementById('manager-card-somoykal');

            if (nameEl) nameEl.innerText = `Name: ${managerData.name}`;

            if (somoykalEl) {
                const startBn = formatGregorianToBanglaDate(managerData.termStart);
                const endBn = formatGregorianToBanglaDate(managerData.termEnd);
                somoykalEl.innerText = `সময়কাল: ${startBn} হতে ${endBn}`;
            }
        }
    } catch (err) {
        console.error("Error loading report header details:", err);
    }
}

// বিদ্যমান ইনিশিয়ালাইজেশন ফাংশনের ভেতর অথবা পেজ লোডে এটি কল করে দিন
document.addEventListener('DOMContentLoaded', () => {
    loadMonthlyReportHeaderAndManager();
});

// --- রিপোর্ট পিকচার হিসেবে সেভ করার ফাংশন ---
document.getElementById('download-image-btn')?.addEventListener('click', async () => {
    const reportElement = document.getElementById('printable-report-area');

    if (!reportElement) {
        Swal.fire({
            icon: 'error',
            title: 'Oops!',
            text: 'রিপোর্ট এলিমেন্ট পাওয়া যায়নি!',
            confirmButtonColor: '#e53e3e'
        });
        return;
    }

    const btn = document.getElementById('download-image-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Saving as Images...`;
    btn.disabled = true;

    try {
        // ১. পুরো রিপোর্ট এলিমেন্টকে ক্যানভাসে রূপান্তর করা
        const canvas = await html2canvas(reportElement, {
            scale: 2,
            useCORS: true,
            backgroundColor: document.body.classList.contains('dark-theme') ? '#121212' : '#ffffff'
        });

        const imgWidth = canvas.width;
        const imgHeight = canvas.height;

        // ২. প্রিন্ট পেজের উচ্চতার অনুপাত অনুযায়ী পেজ সাইজ নির্ধারণ
        // A4 পেজ অনুপাত ধরে প্রতি পেজের হাইট ফিক্স করা হলো যাতে কোনো রো মাঝখান থেকে না কাটে
        const pageHeightPx = 1120 * 2; 
        let heightLeft = imgHeight;
        let position = 0;
        let pageNum = 1;

        // ৩. লুপ চালিয়ে নিখুঁতভাবে টুকরো করে একাধিক ইমেজ ডাউনলোড করা
        while (heightLeft > 0) {
            let sliceHeight = Math.min(heightLeft, pageHeightPx);

            const pageCanvas = document.createElement('canvas');
            pageCanvas.width = imgWidth;
            pageCanvas.height = sliceHeight;
            const ctx = pageCanvas.getContext('2d');

            // ব্যাকগ্রাউন্ড কালার সেট করা
            ctx.fillStyle = document.body.classList.contains('dark-theme') ? '#121212' : '#ffffff';
            ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

            // নির্দিষ্ট অংশ ড্র করা
            ctx.drawImage(canvas, 0, position, imgWidth, sliceHeight, 0, 0, imgWidth, sliceHeight);

            // অটো ডাউনলোড ট্রিগার করা
            const imageURL = pageCanvas.toDataURL('image/png');
            const downloadLink = document.createElement('a');
            downloadLink.href = imageURL;
            downloadLink.download = `Monthly-Report-Page-${pageNum}.png`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);

            heightLeft -= sliceHeight;
            position += sliceHeight;
            pageNum++;
            
            // ব্রাউজার যাতে ফ্রিজ না হয়ে যায় সেজন্য সামান্য বিরতি
            await new Promise(resolve => setTimeout(resolve, 100));
        }

    } catch (error) {
        console.error("Image generation error:", error);
        Swal.fire({
            icon: 'error',
            title: 'Failed',
            text: 'ইমেজ তৈরি করতে সমস্যা হয়েছে!',
            confirmButtonColor: '#e53e3e'
        });
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});


async function loadMonthlyReportExpenseStats() {
    try {
        const response = await fetch(API + '/api/expenses/due-details');
        if (!response.ok) throw new Error("Failed to fetch due details");
        
        const data = await response.json();
        const categories = data.categories || [];
        const totalCashCostSum = Number(data.totalCashCost) || 0; // এপিআই থেকে সরাসরি ক্যাশ খরচ চলে আসবে

        let totalDueCostSum = 0;
        let nonCookDuePaid = 0;
        let cookBillTotal = 0;
        let cookBillPaid = 0;

        categories.forEach(cat => {
            let catName = cat.category ? cat.category.trim().toLowerCase() : '';
            
            if (catName === 'cook bill') {
                cookBillTotal = Number(cat.totalDue) || 0; 
                if (cat.payments && cat.payments.length > 0) {
                    cookBillPaid = cat.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                }
            } else {
                totalDueCostSum += Number(cat.totalDue) || 0; 
                if (cat.payments && cat.payments.length > 0) {
                    nonCookDuePaid += cat.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                }
            }
        });

        // ১. নগদ খরচ
        const cashCostElem = document.getElementById('card-cash-cost');
        if (cashCostElem) cashCostElem.innerText = `নগদ খরচ: ৳ ${totalCashCostSum.toLocaleString()}`;

        // ২. বাকি খরচ
        const dueCostElem = document.getElementById('card-due-cost');
        if (dueCostElem) dueCostElem.innerText = `বাকি খরচ: ৳ ${totalDueCostSum.toLocaleString()}`;

        // ৩. মোট বাজার খরচ (নগদ খরচ + বাকি খরচ)
        const totalBazarElem = document.getElementById('card-total-bazar');
        if (totalBazarElem) totalBazarElem.innerText = `৳ ${(totalCashCostSum + totalDueCostSum).toLocaleString()}`;

        // ৪. মোট বাকি খরচ কার্ডের হেডার
        const totalDueExpenseElem = document.getElementById('card-total-due-expense');
        if (totalDueExpenseElem) totalDueExpenseElem.innerText = `৳ ${totalDueCostSum.toLocaleString()}`;

        // ৫. বাকি পরিশোধ
        const duePaidElem = document.getElementById('card-due-paid');
        if (duePaidElem) duePaidElem.innerText = `বাকি পরিশোধ: ৳ ${nonCookDuePaid.toLocaleString()}`;

        // ৬. বাকি = বাকি খরচ - বাকি পরিশোধ
        const remainingDueBalance = totalDueCostSum - nonCookDuePaid;
        const dueRemainingElem = document.getElementById('card-due-remaining');
        if (dueRemainingElem) dueRemainingElem.innerText = `বাকি: ৳ ${remainingDueBalance.toLocaleString()}`;

        // ৭. রান্নার বিল অংশ
        const cookTotalElem = document.getElementById('card-cook-total');
        if (cookTotalElem) cookTotalElem.innerText = `৳ ${cookBillTotal.toLocaleString()}`;

        const cookPaidElem = document.getElementById('card-cook-paid');
        if (cookPaidElem) cookPaidElem.innerText = `রান্নার বিল পরিশোধ: ৳ ${cookBillPaid.toLocaleString()}`;

        const cookRemainingElem = document.getElementById('card-cook-remaining');
        if (cookRemainingElem) cookRemainingElem.innerText = `রান্নার বিল বাকি: ৳ ${(cookBillTotal - cookBillPaid).toLocaleString()}`;

    } catch (error) {
        console.error("Monthly Report Expense Stats Error:", error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadMonthlyReportExpenseStats();
});

async function loadTermSummaryStats() {
    try {
        const response = await fetch(API + '/api/members/term-summary');
        if (!response.ok) throw new Error("Failed to fetch term summary");

        const data = await response.json();

        // ১. মোট মিল (allmemTotalMainGuest)
        const totalMealElem = document.getElementById('card-total-meal');
        if (totalMealElem) {
            const totalMeal = Number(data.allmemTotalMainGuest) || 0;
            totalMealElem.innerText = `${totalMeal.toLocaleString()} টি`;
        }

        // ২. মিল রেট (mealRate)
        const mealRateElem = document.getElementById('card-meal-rate');
        if (mealRateElem) {
            const mealRate = Number(data.mealRate) || 0;
            mealRateElem.innerText = `৳ ${mealRate.toFixed(2)}`;
        }

        // ৩. মোট টার্ম খরচ / কালেকশন (totalTermExpenses)
       const totalTermExpenseElem = document.getElementById('card-total-term-expense');
        if (totalTermExpenseElem) {
            const totalExpense = Math.round(Number(data.totalTermExpenses) || 0); // দশমিক এড়াতে রাউন্ড করা হয়েছে
            totalTermExpenseElem.innerText = `৳ ${totalExpense.toLocaleString()}`;
        }

    } catch (error) {
        console.error("Term Summary Stats Error:", error);
    }
}

// পেজ লোড হওয়ার সাথে সাথে ফাংশনটি কল করা
document.addEventListener('DOMContentLoaded', () => {
    loadTermSummaryStats();
});