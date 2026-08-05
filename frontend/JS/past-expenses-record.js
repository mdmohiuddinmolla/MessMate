// ১. ম্যানেজার এর দেওয়া মেয়াদকাল (এখন ডাটাবেজ থেকে ডাইনামিকলি আসবে)
let allDatesInTerm = [];
let currentPage = 1;
const itemsPerPage = 6; // ১ পেজে ৬টি করে পারফেক্ট বই থাকবে

let currentSelectedDate = "";
let currentGalleryIndex = 0;
let tempUploadedImages = []; // সাময়িক ছবি রাখার অ্যারে
let totalTermExpenses = 0;

// 🌟 [এখানে নতুন ফাংশনটি বসাও] টোটাল খরচ হিসাব করার ফাংশন
function updateBazarTotalDisplay() {
    let total = 0;
    
    Object.keys(bazarDatabase).forEach(dateKey => {
        const dayData = bazarDatabase[dateKey];
        if (dayData) {
            const cost = Number(dayData.totalCost || dayData.amount || 0);
            total += cost;
        }
    });

    // ড্যাশবোর্ডের টোটাল এক্সপেন্স কার্ডে মানটি ডায়নামিকলি বসানোর জন্য
    const totalExpenseEl = document.getElementById('dash-total-expense');
    if (totalExpenseEl) {
        totalExpenseEl.innerText = total.toLocaleString();
    }
}

// লোকাল বাজার ডাটাবেজ অবজেক্ট (গ্লোবাল ডিক্লেয়ারেশন ব্যাকআপ)
if (typeof bazarDatabase === 'undefined') {
    var bazarDatabase = {};
}

// ডেটা না থাকলে বা সার্ভার অফ থাকলে পুরো পেজ জুড়ে নোটিশ এবং বাটন হাইড করার ফাংশন
function showEmptyState() {
    const shelfGrid = document.getElementById('book-shelf-grid');
    const paginationWrapper = document.getElementById('pagination-wrapper');
    
    // Expenses Not Found মেসেজ
    shelfGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 80px 20px;">
            <i class="fas fa-folder-open" style="font-size: 65px; color: #a0aec0; margin-bottom: 20px;"></i>
            <h2 style="font-size: 32px; color: var(--text-color, #e2e8f0); font-weight: 700; margin: 0; letter-spacing: 0.5px;">Expenses Not Found</h2>
            <p style="color: #a0aec0; margin-top: 10px; font-size: 15px;">Please ensure the server is running or activate the term to view expenses.</p>
        </div>
    `;
    
    // সার্ভার অফ বা ডেটা না থাকলে পেজিনেশন এরিয়া পুরো ফাঁকা (ক্লিন) থাকবে
    if (paginationWrapper) {
        paginationWrapper.innerHTML = "";
    }
}

document.addEventListener('DOMContentLoaded', () => {

    // 🌟 ক্যাশ ও বাকি খরচের অটো-ক্যালকুলেশন লজিক
    const totalInput = document.getElementById('diary-amount');
    const cashInput = document.getElementById('diary-cash-cost');
    const dueInput = document.getElementById('diary-due-cost');

    if (cashInput && totalInput && dueInput) {
        cashInput.addEventListener('input', () => {
            const total = Number(totalInput.value) || 0;
            const cash = Number(cashInput.value) || 0;
            
            if (cash > total) {
                showToast("নগদ খরচ মোট খরচের চেয়ে বেশি হতে পারে না!", false);
                cashInput.value = total;
                dueInput.value = 0;
            } else {
                dueInput.value = total - cash; // বাকी অংশ স্বয়ংক্রিয়ভাবে বাকি খরচ হয়ে যাবে
            }
        });

        totalInput.addEventListener('input', () => {
            const total = Number(totalInput.value) || 0;
            const cash = Number(cashInput.value) || 0;
            if (cash <= total) {
                dueInput.value = total - cash;
            } else {
                cashInput.value = total;
                dueInput.value = 0;
            }
        });
    }

    // টোকেন লোকালস্টোরেজ বা সেশন থেকে নেওয়া
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    
    // ১. ব্যাকএন্ড থেকে টার্ম এবং খরচ একসাথে চেক করা
    fetch(API + '/api/bazar-term', {
        headers: {
            'Authorization': `Bearer ${token}` // 👈 টোকেন যুক্ত করা হলো
        }
    })
        .then(res => res.json())
        .then(data => {
            console.log("Term Data:", data); 
            if (data && data.isZero === false) {
                // এখানে আর কোনো প্যারামিটার পাঠানোর প্রয়োজন নেই, সার্ভার নিজে বুঝে নেবে
                fetch(API + '/api/diary/fetch-term-data', {
                    headers: {
                        'Authorization': `Bearer ${token}` // 👈 টোকেন যুক্ত করা হলো
                    }
                })
                    .then(res => res.json())
                    .then(serverExpenses => {
                        console.log("Server Expenses:", serverExpenses);
                        bazarDatabase = serverExpenses || {};
                        updateBazarTotalDisplay();
                        generateTermDates(data.termStart, data.termEnd);
                        renderShelf();
                    })
                    .catch(err => {
                        console.error("Fetch Term Data Error:", err);
                        generateTermDates(data.termStart, data.termEnd);
                        renderShelf();
                    });
            } else {
                showEmptyState();
            }
        })
        .catch(err => {
            console.error("Server Connection Error:", err);
            showEmptyState();
        });

    // ২. মোডাল ও অন্যান্য ইভেন্ট লিসেনার
    document.getElementById('close-book-modal').addEventListener('click', () => {
        document.getElementById('book-diary-modal').classList.add('hidden');
    });

    // গ্যালারি নেভিগেশন বাটন
    document.getElementById('gallery-prev').addEventListener('click', () => navigateGallery(-1));
    document.getElementById('gallery-next').addEventListener('click', () => navigateGallery(1));

    // ইমেজ রিমুভ / ডিলিট বাটন লজিক
    document.getElementById('remove-current-img-btn').addEventListener('click', () => {
        if (tempUploadedImages.length === 0) return;
        
        tempUploadedImages.splice(currentGalleryIndex, 1);
        
        if (currentGalleryIndex >= tempUploadedImages.length && currentGalleryIndex > 0) {
            currentGalleryIndex = tempUploadedImages.length - 1;
        }
        
        document.getElementById('diary-files').value = ""; 
        document.getElementById('file-count-preview').innerText = `${tempUploadedImages.length} files selected`;
        
        updateGallery(); 
    });

    // মাল্টিপল ইমেজ আপলোড হ্যান্ডলার
    const fileInput = document.getElementById('diary-files');
    if(fileInput) {
        fileInput.addEventListener('change', handleMultipleImages);
    }

    // ডায়েরি ফর্ম সাবমিট (সার্ভারে ডাইনামিক কালেকশনে ডেটা সেভ)
// ডায়েরি ফর্ম সাবমিট (সার্ভারে ডাইনামিক কালেকশনে ডেটা সেভ)
document.getElementById('diary-form').addEventListener('submit', (e) => {
    try {
        const userRole = (localStorage.getItem('userRole') || '').toLowerCase();
        const userStatus = (localStorage.getItem('userStatus') || '').toLowerCase();

        const isManager = (userRole === 'manager');
        const isActive = (userStatus === '' || userStatus === 'active');

        if (!isManager || !isActive) {
            showToast("আপনার এই ডাটা সেভ করার অনুমতি নেই!", false);
            return;
        }
    } catch(e) {
        return;
    }
    e.preventDefault();
    
    const submitBtn = document.querySelector('#diary-form button[type="submit"]');
    submitBtn.innerText = "Saving...";
    submitBtn.disabled = true;

    // ভ্যারিয়েবলগুলো সঠিকভাবে ডিক্লেয়ার করা হলো
    const totalCost = Number(document.getElementById('diary-amount').value) || 0;
    const cashCost = Number(document.getElementById('diary-cash-cost').value) || 0; 
    const dueCategory = document.getElementById('diary-due-category').value.trim();
    const dueCost = Number(document.getElementById('diary-due-cost').value) || 0;     
    const shopperName = document.getElementById('diary-shopper').value;
    const bazarDescription = document.getElementById('diary-desc').value;
    
    // যোগফল ঠিক আছে কিনা চেক
    if ((cashCost + dueCost) !== totalCost) {
        showToast("নগদ খরচ এবং বাকি খরচের যোগফল মোট খরচের সমান হতে হবে!", false);
        submitBtn.innerText = "Save into Diary";
        submitBtn.disabled = false;
        return;
    }

    const expenseData = {
        date: currentSelectedDate,
        totalCost: totalCost,
        cashCost: cashCost,   
        dueCost: dueCost,     
        dueCategory: dueCategory,
        shopperName: shopperName,
        bazarDescription: bazarDescription,
        receipts: tempUploadedImages
    };

    const token = localStorage.getItem('token') || sessionStorage.getItem('token'); // টোকেন রিড করা

    fetch(API + '/api/diary/save', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` // 👈 টোকেন যুক্ত করা হলো
        },
        body: JSON.stringify(expenseData)
    })
    .then(res => res.json())
    .then(data => {
        submitBtn.innerText = "Save into Diary";
        submitBtn.disabled = false;

        if (data.success) {
            showToast("বাজার খরচ সফলভাবে ডাটাবেজে সেভ হয়েছে!", true);
            
            bazarDatabase[currentSelectedDate] = {
                totalCost: totalCost,
                cashCost: cashCost,
                dueCost: dueCost,
                dueCategory: dueCategory,
                amount: totalCost,
                desc: bazarDescription,
                shopperName: shopperName,
                images: tempUploadedImages
            };
            updateBazarTotalDisplay();
            
            if (data.totalTermExpenses !== undefined) {
                totalTermExpenses = data.totalTermExpenses;
            }

            document.getElementById('book-diary-modal').classList.add('hidden');
            renderShelf(); 
        } else {
            showToast("ডেটা সেভ করতে সমস্যা হয়েছে: " + data.message, false);
        }
    })
    .catch(err => {
        submitBtn.innerText = "Save into Diary";
        submitBtn.disabled = false;
        console.error("Error saving diary entry:", err);
        showToast("সার্ভার কানেকশন ব্যর্থ হয়েছে!", false);
    });
});

    // --- ৩. অ্যাডভান্সড লাইটবক্স জুম, মাউস স্ক্রোল ও সোয়াইপ লজিক ---
    const lightbox = document.getElementById('image-lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const closeLightbox = document.querySelector('.lightbox-close');
    const mainGalleryImg = document.getElementById('gallery-img-view');
    const receiptHolder = document.querySelector('.receipt-holder');
    
    let zoomScale = 1;

    let touchStartX = 0;
    let touchEndX = 0;

    if (receiptHolder) {
        receiptHolder.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        receiptHolder.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipeGesture();
        }, { passive: true });
    }

    function handleSwipeGesture() {
        const swipeThreshold = 50; 
        if (touchStartX - touchEndX > swipeThreshold) {
            navigateGallery(1);
        } else if (touchEndX - touchStartX > swipeThreshold) {
            navigateGallery(-1);
        }
    }

    if (mainGalleryImg) {
        mainGalleryImg.addEventListener('click', () => {
            if (mainGalleryImg.src && !mainGalleryImg.classList.contains('hidden') && mainGalleryImg.getAttribute('src') !== "") {
                lightboxImg.src = mainGalleryImg.src;
                zoomScale = 1;
                lightboxImg.style.transform = `scale(${zoomScale})`;
                lightbox.classList.remove('hidden');
            }
        });
    }

    if (lightbox) {
        lightbox.addEventListener('wheel', (e) => {
            if (!lightbox.classList.contains('hidden')) {
                e.preventDefault(); 
                
                if (e.deltaY < 0) {
                    zoomScale += 0.15;
                } else {
                    zoomScale -= 0.15;
                }
                
                zoomScale = Math.min(Math.max(0.5, zoomScale), 4);
                lightboxImg.style.transform = `scale(${zoomScale})`;
            }
        }, { passive: false });
    }

    let initialDist = 0;
    
    if (lightboxImg) {
        lightboxImg.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                initialDist = Math.hypot(
                    e.touches[0].pageX - e.touches[1].pageX,
                    e.touches[0].pageY - e.touches[1].pageY
                );
            }
        }, { passive: true });

        lightboxImg.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2 && initialDist > 0) {
                e.preventDefault();
                const currentDist = Math.hypot(
                    e.touches[0].pageX - e.touches[1].pageX,
                    e.touches[0].pageY - e.touches[1].pageY
                );
                
                const diff = currentDist / initialDist;
                let newScale = zoomScale * diff;
                
                newScale = Math.min(Math.max(0.5, newScale), 4);
                lightboxImg.style.transform = `scale(${newScale})`;
                
                zoomScale = newScale;
                initialDist = currentDist;
            }
        }, { passive: false });

        lightboxImg.addEventListener('touchend', (e) => {
            if (e.touches.length < 2) {
                initialDist = 0; 
            }
        }, { passive: true });
    }

    const zoomInBtn = document.getElementById('lightbox-zoom-in');
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            zoomScale += 0.25;
            if (zoomScale > 4) zoomScale = 4;
            lightboxImg.style.transform = `scale(${zoomScale})`;
        });
    }

    const zoomOutBtn = document.getElementById('lightbox-zoom-out');
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            zoomScale -= 0.25;
            if (zoomScale < 0.5) zoomScale = 0.5;
            lightboxImg.style.transform = `scale(${zoomScale})`;
        });
    }

    const resetBtn = document.getElementById('lightbox-reset');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            zoomScale = 1;
            lightboxImg.style.transform = `scale(${zoomScale})`;
        });
    }

    if (closeLightbox) {
        closeLightbox.addEventListener('click', () => {
            lightbox.classList.add('hidden');
        });
    }
    if (lightbox) {
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox || e.target.classList.contains('lightbox-content-wrapper')) {
                lightbox.classList.add('hidden');
            }
        });
    }
});

// মেয়াদের তারিখ জেনারেটর
function generateTermDates(startStr, endStr) {
    function parseCustomDate(dateStr) {
        if (typeof dateStr === 'string' && dateStr.includes('-')) {
            const parts = dateStr.split('-');
            if (parts[0].length === 2) { 
                return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`); 
            }
        }
        return new Date(dateStr);
    }

    let current = parseCustomDate(startStr);
    const last = parseCustomDate(endStr);
    allDatesInTerm = [];
    
    if (isNaN(current.getTime()) || isNaN(last.getTime())) {
        console.error("Invalid date formats received from DB:", startStr, endStr);
        return;
    }

    while (current <= last) {
        allDatesInTerm.push(current.toISOString().split('T')[0]); 
        current.setDate(current.getDate() + 1);
    }
}

// ৬টি বই সাজানোর মেইন ফাংশন
let isFirstLoad = true; 

function renderShelf() {
    const shelfGrid = document.getElementById('book-shelf-grid');
    const paginationWrapper = document.getElementById('pagination-wrapper');
    
    shelfGrid.innerHTML = "";
    if (paginationWrapper) paginationWrapper.innerHTML = ""; 

    if (allDatesInTerm.length === 0) {
        showEmptyState();
        return;
    }

    if (isFirstLoad && allDatesInTerm.length > 0) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`; 
        
        const todayIndex = allDatesInTerm.indexOf(todayStr);
        
        if (todayIndex !== -1) {
            const currentDayNumber = todayIndex + 1; 
            currentPage = Math.ceil(currentDayNumber / itemsPerPage);
        }
        isFirstLoad = false; 
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, allDatesInTerm.length);

    const monthYearElement = document.getElementById('dynamic-month-year');
    if (monthYearElement && allDatesInTerm.length > 0) {
        let uniqueMonths = new Set();
        let uniqueYears = new Set();

        for (let i = startIndex; i < endIndex; i++) {
            const dateObj = new Date(allDatesInTerm[i]);
            if (!isNaN(dateObj.getTime())) {
                const mName = dateObj.toLocaleDateString('en-US', { month: 'long' });
                const yName = dateObj.getFullYear();
                uniqueMonths.add(mName);
                uniqueYears.add(yName);
            }
        }

        const monthArray = Array.from(uniqueMonths);
        const yearArray = Array.from(uniqueYears);
        let headerText = "";

        if (monthArray.length === 1) {
            headerText = `, ${monthArray[0]} ${yearArray[0]}`;
        } else {
            if (yearArray.length === 1) {
                headerText = `, ${monthArray[0]} - ${monthArray[monthArray.length - 1]} ${yearArray[0]}`;
            } else {
                const startFull = new Date(allDatesInTerm[startIndex]).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                const endFull = new Date(allDatesInTerm[endIndex - 1]).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                headerText = `, ${startFull} - ${endFull}`;
            }
        }
        monthYearElement.innerText = headerText;
    }

    for (let i = startIndex; i < endIndex; i++) {
        const dateStr = allDatesInTerm[i]; 
        const parts = dateStr.split('-');
        const alternativeDateStr = `${parts[2]}-${parts[1]}-${parts[0]}`; 
        
        const savedData = bazarDatabase[dateStr] || bazarDatabase[alternativeDateStr];
        const dateObj = new Date(dateStr);
        const formattedDate = dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

        const book = document.createElement('div');
        const displayAmount = savedData ? (savedData.totalCost ?? savedData.amount ?? 0) : 0;
        const isEmpty = displayAmount === 0;

        book.className = `bazar-book-cover ${isEmpty ? 'is-empty' : ''}`;
        book.innerHTML = `
            <div class="cover-date">${formattedDate}</div>
            <div class="cover-title"><i class="fas fa-book-open"></i> Day ${i + 1}</div>
            <div class="cover-amount">${isEmpty ? '৳ 0' : '৳ ' + displayAmount.toLocaleString()}</div>
            <div class="cover-status">${isEmpty ? 'Blank Page <i class="fas fa-pen-fancy"></i>' : 'Recorded <i class="fas fa-check"></i>'}</div>
        `;

        book.addEventListener('click', () => openDiary(dateStr, formattedDate, i + 1));
        shelfGrid.appendChild(book);
    }

    const totalPages = Math.ceil(allDatesInTerm.length / itemsPerPage);

    if (totalPages > 1 && paginationWrapper) {
        const prevBtn = document.createElement('button');
        prevBtn.className = 'nav-btn';
        prevBtn.innerHTML = `<i class="fas fa-arrow-left"></i> Previous Page`;
        prevBtn.disabled = (currentPage === 1);
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderShelf();
            }
        });

        const pageIndicator = document.createElement('span');
        pageIndicator.id = 'page-indicator'; 
        pageIndicator.innerText = `Page ${currentPage} of ${totalPages}`;

        const nextBtn = document.createElement('button');
        nextBtn.className = 'nav-btn';
        nextBtn.innerHTML = `Next Page <i class="fas fa-arrow-right"></i>`;
        nextBtn.disabled = (currentPage === totalPages);
        nextBtn.addEventListener('click', () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderShelf();
            }
        });

        paginationWrapper.appendChild(prevBtn);
        paginationWrapper.appendChild(pageIndicator);
        paginationWrapper.appendChild(nextBtn);
    }
}

// ডায়েরি ওপেন করা
// ডায়েরি ওপেন করা (সংশোধিত)
function openDiary(dateStr, formattedDate, dayNumber) {
    currentSelectedDate = dateStr;
    currentGalleryIndex = 0;
    
    document.getElementById('diary-modal-date').innerText = formattedDate;
    document.getElementById('left-page-num').innerText = `Page ${dayNumber * 2 - 1}`;
    document.getElementById('right-page-num').innerText = `Page ${dayNumber * 2}`;

    const savedData = bazarDatabase[dateStr]; 
    
    if (savedData) {
        document.getElementById('diary-amount').value = savedData.totalCost || savedData.amount || "";
        document.getElementById('diary-cash-cost').value = savedData.cashCost || ""; 
        document.getElementById('diary-due-category').value = savedData.dueCategory || ""; 
        document.getElementById('diary-due-cost').value = savedData.dueCost || "";
        document.getElementById('diary-desc').value = savedData.bazarDescription || savedData.desc || "";
        document.getElementById('diary-shopper').value = savedData.shopperName || ""; 
        
        // 🌟 লোকাল ডাটাবেজ থেকে ছবি বা রসিদ থাকলে সাথে সাথে সেট করে দেওয়া
        tempUploadedImages = savedData.receipts || savedData.images || []; 
    } else {
        document.getElementById('diary-amount').value = "";
        document.getElementById('diary-cash-cost').value = ""; 
        document.getElementById('diary-due-cost').value = "";   
        document.getElementById('diary-due-category').value = ""; 
        document.getElementById('diary-desc').value = "";
        document.getElementById('diary-shopper').value = ""; 
        tempUploadedImages = [];
    }

    document.getElementById('file-count-preview').innerText = `${tempUploadedImages.length} files selected`;
    updateGallery(); 

    // মোডাল ওপেন করা
    document.getElementById('book-diary-modal').classList.remove('hidden');

    // ব্যাকগ্রাউন্ডে সার্ভার থেকে লেটেস্ট রসিদগুলো ফেচ করে সিঙ্ক করার জন্য
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    // ব্যাকগ্রাউন্ডে সার্ভার থেকে লেটেস্ট রসিদগুলো ফেচ করে সিঙ্ক করার জন্য
    fetch(API + `/api/diary/fetch-receipts?date=${dateStr}`, {
        headers: {
            'Authorization': `Bearer ${token}` // 👈 টোকেন যুক্ত করা হলো
        }
    })
        .then(res => res.json())
        .then(data => {
            if (data && data.receipts && data.receipts.length > 0) {
                tempUploadedImages = data.receipts;
                document.getElementById('file-count-preview').innerText = `${tempUploadedImages.length} files selected`;
                updateGallery();
            }
        })
        .catch(err => console.error("ছবি লোড করতে সমস্যা:", err));
}

// ⚡ [আপডেটেড] মাল্টিপল ইমেজ আপলোড ও অটো-কম্প্রেশন লজিক (Max 6 Pics)
async function handleMultipleImages(e) {
    const files = Array.from(e.target.files);
    
    if (files.length + tempUploadedImages.length > 6) {
        showToast("You can upload a maximum of 6 images per day.", false);
        return;
    }

    // প্রতিটা ফাইল লুপ চালিয়ে কমপ্রেস করে পুশ করা হচ্ছে
    for (let file of files) {
        try {
            // ৩-৪ MB ছবিকে কমপ্রেস করে ১০০০ পিক্সেল চওড়া ও ৭০% কোয়ালিটির হালকা ছবিতে রূপান্তর করবে
            const compressedBase64 = await compressImage(file, 800, 800, 0.5); // পিক্সেল এবং কোয়ালিটি দুটোই কমিয়েছি
            tempUploadedImages.push(compressedBase64);
        } catch (error) {
            console.error("ছবি সাইজ ছোট করতে সমস্যা হয়েছে:", error);
        }
    }

    // গ্যালারি এবং প্রিভিউ আপডেট
    document.getElementById('file-count-preview').innerText = `${tempUploadedImages.length} files selected`;
    currentGalleryIndex = tempUploadedImages.length - 1; 
    updateGallery();
}

// গ্যালারি ও ডিলিট বাটন আপডেট লজিক
function updateGallery() {
    const imgView = document.getElementById('gallery-img-view');
    const noImgText = document.getElementById('no-img-text');
    const dotsContainer = document.getElementById('gallery-dots-container');
    const removeBtn = document.getElementById('remove-current-img-btn');
    
    if(!dotsContainer) return;
    dotsContainer.innerHTML = "";

    if (tempUploadedImages.length === 0) {
        if(imgView) imgView.classList.add('hidden');
        if(removeBtn) removeBtn.classList.add('hidden'); 
        if(noImgText) noImgText.classList.remove('hidden');
        return;
    }

    if(noImgText) noImgText.classList.add('hidden');
    if(imgView) {
        imgView.classList.remove('hidden');
        imgView.src = tempUploadedImages[currentGalleryIndex];
    }
    if(removeBtn) removeBtn.classList.remove('hidden'); 

    tempUploadedImages.forEach((_, idx) => {
        const dot = document.createElement('span');
        dot.className = `dot ${idx === currentGalleryIndex ? 'active' : ''}`;
        dot.addEventListener('click', () => { currentGalleryIndex = idx; updateGallery(); });
        dotsContainer.appendChild(dot);
    });
}

// সুন্দর কাস্টম টোস্ট নোটিফিকেশন দেখানোর ফাংশন
function showToast(message, isSuccess = true) {
    const toast = document.getElementById('toast-notification');
    const toastMsg = document.getElementById('toast-message');
    
    if (!toast || !toastMsg) return;

    toastMsg.innerText = message;
    
    let iconElement = toast.querySelector('i');
    if (!iconElement) {
        iconElement = document.createElement('i');
        toast.insertBefore(iconElement, toastMsg);
    }
    
    if (!isSuccess) {
        toast.style.background = '#ef4444'; 
        toast.style.boxShadow = '0 10px 25px rgba(239, 68, 68, 0.3)';
        iconElement.className = 'fas fa-exclamation-circle';
    } else {
        toast.style.background = '#10b981'; 
        toast.style.boxShadow = '0 10px 25px rgba(16, 185, 129, 0.3)';
        iconElement.className = 'fas fa-check-circle';
    }

    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('show');
    }, 50);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 300);
    }, 3000);
}

function navigateGallery(direction) {
    if (tempUploadedImages.length === 0) return;
    currentGalleryIndex += direction;
    if (currentGalleryIndex >= tempUploadedImages.length) currentGalleryIndex = 0;
    if (currentGalleryIndex < 0) currentGalleryIndex = tempUploadedImages.length - 1;
    updateGallery();
}

// ⚡ [নতুন এডেড] ক্যানভাস দিয়ে ব্রাউজারেই ছবি কমপ্রেস করার মাস্টার ফাংশন
function compressImage(file, maxWidth, maxHeight, quality) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedBase64);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}

async function loadDashboardSummary() {
    try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token'); // টোকেন নেওয়া

        const response = await fetch(API + '/api/members/term-summary', {
            headers: {
                'Authorization': `Bearer ${token}` // 👈 টোকেন যুক্ত করা হলো
            }
        });
        const data = await response.json();

        if (data) {
            // ১. Meal Rate (যদি দশমিক রাখতে চাও, যেমন 43.07)
            const mealRateEl = document.getElementById('dash-meal-rate');
            if (mealRateEl) {
                let rate = Number(data.mealRate) || 0;
                // যদি দশমিকের পর শুধু .00 হয়, তবে পূর্ণসংখ্যা দেখাবে, না হলে দশমিকসহ দেখাবে
                mealRateEl.innerText = rate % 1 === 0 ? rate : rate.toFixed(2);
            }

            // ২. Total Meal (Total Main & Guest)
            const totalMealEl = document.getElementById('dash-total-meal');
            if (totalMealEl) {
                totalMealEl.innerText = data.allmemTotalMainGuest ?? '0';
            }

            // ৩. Total Expense (এখানে .00 বাদ দেওয়ার জন্য সরাসরি Number এ রূপান্তর করা হলো)
            const totalExpenseEl = document.getElementById('dash-total-expense');
            if (totalExpenseEl) {
                totalExpenseEl.innerText = Number(data.totalTermExpenses) || 0;
            }
        }
    } catch (error) {
        console.error("Error loading dashboard summary:", error);
    }
}

// পেজ লোড হওয়ার সাথে সাথে ফাংশনটি রান করার জন্য
document.addEventListener("DOMContentLoaded", () => {
    checkExpensePermissionAndApplyReadOnly();
    loadDashboardSummary();
});

// --- নতুন যুক্ত করা মোডাল ও বাকি হিসাব সংক্রান্ত লজিক ---
document.addEventListener('DOMContentLoaded', () => {
    // ১. বাকি পরিশোধ মোডাল হ্যান্ডলিং
    const payDueBtn = document.getElementById('pay-due-btn');
    const payDueModal = document.getElementById('pay-due-modal');
    const closePayDueModal = document.getElementById('close-pay-due-modal');
    const payDueForm = document.getElementById('pay-due-form');

    if (payDueBtn && payDueModal) {
        payDueBtn.addEventListener('click', () => {
            const dueDateInput = document.getElementById('pay-due-date');
          //  if (dueDateInput) dueDateInput.valueAsDate = new Date();  // ajker date auto select korar code
            payDueModal.classList.remove('hidden');
        });
    }
    if (closePayDueModal) {
        closePayDueModal.addEventListener('click', () => payDueModal.classList.add('hidden'));
    }

    if (payDueForm) {
        payDueForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const category = document.getElementById('pay-due-category').value.trim();
            const amount = Number(document.getElementById('pay-due-amount').value);
            const date = document.getElementById('pay-due-date').value;

            const token = localStorage.getItem('token') || sessionStorage.getItem('token');

            fetch(API + '/api/expenses/save-due-payment', { 
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // 👈 টোকেন যুক্ত করা হলো
                },
                body: JSON.stringify({ category, amount, date })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showToast("বাকি পরিশোধ সফলভাবে সেভ হয়েছে!", true);
                    payDueModal.classList.add('hidden');
                    payDueForm.reset();
                } else {
                    showToast("সমস্যা হয়েছে: " + data.message, false);
                }
            })
            .catch(err => {
                console.error(err);
                showToast("সার্ভার এরর!", false);
            });
        });
    }

    // ২. রান্নার বিল পরিশোধ মোডাল হ্যান্ডলিং
    const payCookbillBtn = document.getElementById('pay-cookbill-btn');
    const payCookbillModal = document.getElementById('pay-cookbill-modal');
    const closeCookbillModal = document.getElementById('close-cookbill-modal');
    const payCookbillForm = document.getElementById('pay-cookbill-form');

    if (payCookbillBtn && payCookbillModal) {
        payCookbillBtn.addEventListener('click', () => {
            const cookDateInput = document.getElementById('cookbill-date');
         //   if (cookDateInput) cookDateInput.valueAsDate = new Date();
            payCookbillModal.classList.remove('hidden');
        });
    }
    if (closeCookbillModal) {
        closeCookbillModal.addEventListener('click', () => payCookbillModal.classList.add('hidden'));
    }

    if (payCookbillForm) {
        payCookbillForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const amount = Number(document.getElementById('cookbill-amount').value);
            const date = document.getElementById('cookbill-date').value;

            const token = localStorage.getItem('token') || sessionStorage.getItem('token');

            fetch(API + '/api/expenses/save-cook-payment', { 
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // 👈 টোকেন যুক্ত করা হলো
                },
                body: JSON.stringify({ amount, date })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showToast("রান্নার বিল পরিশোধ সফলভাবে সেভ হয়েছে!", true);
                    payCookbillModal.classList.add('hidden');
                    payCookbillForm.reset();
                } else {
                    showToast("সমস্যা হয়েছে: " + data.message, false);
                }
            })
            .catch(err => {
                console.error(err);
                showToast("সার্ভার এরর!", false);
            });
        });
    }

    // ৩. বাকি হিসাব মোডাল হ্যান্ডলিং
const viewDuedetailsBtn = document.getElementById('view-duedetails-btn');
const viewDuedetailsModal = document.getElementById('view-duedetails-modal');
const closeDuedetailsModal = document.getElementById('close-duedetails-modal');
const dueDetailsContent = document.getElementById('due-details-content');

if (viewDuedetailsBtn && viewDuedetailsModal) {
    viewDuedetailsBtn.addEventListener('click', () => {
        viewDuedetailsModal.classList.remove('hidden');
        if (dueDetailsContent) {
            dueDetailsContent.innerHTML = `<p style="text-align: center; color: #718096; padding: 20px;">হিসাব লোড হচ্ছে...</p>`;
        }

        const token = localStorage.getItem('token') || sessionStorage.getItem('token');

        fetch(API + '/api/expenses/due-details', {
            headers: {
                'Authorization': `Bearer ${token}` // 👈 টোকেন যুক্ত করা হলো
            }
        })
            .then(res => res.json())
            .then(data => {
                if (data && data.categories && data.categories.length > 0 && dueDetailsContent) {
                    let html = `<table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 14px;">
                        <thead>
                            <tr style="background: #e2e8f0; color: #2d3748;">
                                <th style="padding: 10px; border: 1px solid #cbd5e0;">ক্যাটাগরি</th>
                                <th style="padding: 10px; border: 1px solid #cbd5e0;">মোট বাকি (৳)</th>
                                <th style="padding: 10px; border: 1px solid #cbd5e0;">পরিশোধ (৳ & তারিখ)</th>
                                <th style="padding: 10px; border: 1px solid #cbd5e0;">এখনো বাকি (৳)</th>
                            </tr>
                        </thead>
                        <tbody>`;
                    
                    data.categories.forEach(item => {
                        let paymentsHtml = item.payments && item.payments.length > 0 
                            ? item.payments.map(p => `${p.amount}৳ (${p.date})`).join('<br>') 
                            : 'কোনো পরিশোধ নেই';
                        
                        html += `<tr>
                            <td style="padding: 10px; border: 1px solid #cbd5e0; color: #e53935; font-weight: bold;">${item.category}</td>
                            <td style="padding: 10px; border: 1px solid #cbd5e0; color: #e53935;">${item.totalDue}</td>
                            <td style="padding: 10px; border: 1px solid #cbd5e0; color: #27ae60;">${paymentsHtml}</td>
                            <td style="padding: 10px; border: 1px solid #cbd5e0; font-weight: bold; color: ${item.remainingDue > 0 ? '#e53935' : '#27ae60'};">${item.remainingDue}</td>
                        </tr>`;
                    });

                    html += `</tbody></table>`;
                    dueDetailsContent.innerHTML = html;
                } else if (dueDetailsContent) {
                    dueDetailsContent.innerHTML = `<p style="text-align: center; color: #e53935; padding: 20px;">কোনো ডেটা পাওয়া যায়নি।</p>`;
                }
            })
            .catch(err => {
                console.error(err);
                if (dueDetailsContent) {
                    dueDetailsContent.innerHTML = `<p style="text-align: center; color: #e53935; padding: 20px;">ডেটা লোড করতে ব্যর্থ হয়েছে!</p>`;
                }
            });
    });
}

if (closeDuedetailsModal && viewDuedetailsModal) {
    closeDuedetailsModal.addEventListener('click', () => viewDuedetailsModal.classList.add('hidden'));
}

    // ৪. ডেট ইনপুট ফিল্ডে ক্লিক করলে ক্যালেন্ডার খোলার লজিক (একই DOMContentLoaded এর ভেতর যুক্ত করা হলো)
    const dateInputs = document.querySelectorAll('.clickable-date-input');
    dateInputs.forEach(input => {
        input.addEventListener('click', function() {
            if (typeof this.showPicker === 'function') {
                this.showPicker();
            }
        });
    });
});


// ইউজার পারমিশন চেক করার ফাংশন
function checkExpensePermissionAndApplyReadOnly() {
    try {
        // সরাসরি লোকালস্টোরেজ থেকে আলাদা কি (key) গুলো রিড করা হচ্ছে
        const userRole = (localStorage.getItem('userRole') || '').toLowerCase();
        const userStatus = (localStorage.getItem('userStatus') || '').toLowerCase();

        console.log("Checked Role:", userRole, "Status:", userStatus);

        const isManager = (userRole === 'manager');
        const isActive = (userStatus === '' || userStatus === 'active');

        if (!isManager || !isActive) {
            applyExpenseReadOnlyMode();
            console.log("Access Restricted: Read-Only Mode Applied.");
        } else {
            console.log("Access Granted: Active Manager.");
        }
    } catch (e) {
        console.error("Permission check error:", e);
    }
}

function applyExpenseReadOnlyMode() {
    // ১. ডায়ারি মোডালের সব ইনপুট এবং টেক্সটএরিয়া ReadOnly করা
    const diaryInputs = document.querySelectorAll('#diary-form input, #diary-form textarea, #diary-form select');
    diaryInputs.forEach(input => {
        input.readOnly = true;
        input.style.cursor = 'text';
    });

    // ২. সেভ বাটন এবং ফাইল আপলোড ফিল্ড ও বাটন হাইড বা ডিসেবল করা
    const saveDiaryBtn = document.querySelector('#diary-form button[type="submit"]');
    if (saveDiaryBtn) saveDiaryBtn.style.display = 'none';

    const fileInput = document.getElementById('diary-files');
    if (fileInput) fileInput.disabled = true;

    // 🌟 ৩. "Upload Receipts" বাটন বা এর লেবেলটি হাইড করার জন্য (এখানে লেবেল বা ইনপুটের প্যারেন্ট ধরে হাইড করা হচ্ছে)
    if (fileInput) {
        // যদি ফাইল ইনপুটটি কোনো লেবেল বা কন্টেইনারের ভেতরে থাকে, পুরোটা হাইড করতে নিচের লাইনটি কাজ করবে
        const uploadContainer = fileInput.closest('label') || fileInput.parentElement;
        if (uploadContainer) {
            uploadContainer.style.display = 'none';
        }
    }

    const removeImgBtn = document.getElementById('remove-current-img-btn');
    if (removeImgBtn) removeImgBtn.style.display = 'none';

    // ৪. এক্সপেন্স পেজের অন্যান্য অ্যাকশন বাটনগুলো হাইড করা
    const payDueBtn = document.getElementById('pay-due-btn');
    if (payDueBtn) payDueBtn.style.display = 'none';

    const payCookbillBtn = document.getElementById('pay-cookbill-btn');
    if (payCookbillBtn) payCookbillBtn.style.display = 'none';

    const viewDuedetailsBtn = document.getElementById('view-duedetails-btn');
    if (viewDuedetailsBtn) viewDuedetailsBtn.style.display = 'none';
    
}