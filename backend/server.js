require('dotenv').config();
const path = require("path");
const bcrypt = require('bcrypt');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const nodemailer = require('nodemailer');
const dns = require('dns');
// const { use } = require('react');

dns.setDefaultResultOrder('ipv4first');
const app = express();
app.use(cors({
    origin: [
        "http://127.0.0.1:3000",
        "http://localhost:3000",
        "https://your-app.onrender.com"
    ],
    credentials: true
}));
app.use(express.json({ limit: '10mb' })); // এই লাইনটি এখানে বসান
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(path.join(__dirname, "../frontend")));

// ১. MongoDB Connection
const mongoURI = process.env.MONGO_URI;
mongoose.connect(mongoURI)
    .then(() => console.log('Connected to MongoDB Atlas! 🌍✅'))
    .catch(err => console.error('Connection Error: ❌', err.message));

// ১. Member Schema
// ১. Member Schema
const memberSchema = new mongoose.Schema({
    roomID: { type: String, required: true }, 
    name: { type: String, required: true },
    semester: { type: String, required: true },
    deposit: { type: Number, default: 0 },
    depositHistory: [
        { 
            amount: Number, 
            date: { type: Date, default: Date.now } 
        } 
    ],
    totalMainMeal: { type: Number, default: 0 },
    totalGuestMeal: { type: Number, default: 0 },
    totalFineMeal: { type: Number, default: 0 },
    totalMainGuestFine: { type: Number, default: 0 },
    totalMainGuest: { type: Number, default: 0 },
    yourExpenses: { type: Number, default: 0 },
    refundable: { type: Number, default: 0 },
    due: { type: Number, default: 0 },
    mainCookBill: { type: Number, default: 0 },
    guestCookBill: { type: Number, default: 0 },
    totalCookBill: { type: Number, default: 0 }
}, { 
    versionKey: false, 
    autoCreate: false 
});

// সংশোধিত Meal Schema
const mealSchema = new mongoose.Schema({
    memberId: { type: mongoose.Schema.Types.ObjectId, required: true }, 
    name: { type: String, required: true },
    roomID: { type: String },
    semester: { type: String },
    date: { type: String, required: true }, 
    mainLunch: { type: Number, default: 0 },
    mainDinner: { type: Number, default: 0 },
    guestLunch: { type: Number, default: 0 },
    guestDinner: { type: Number, default: 0 },
    fineLunch: { type: Number, default: 0 },
    fineDinner: { type: Number, default: 0 }
}, { versionKey: false, autoCreate: false });


// সংশোধিত Dynamic Model ফাংশন
function getDynamicModel(collectionName, monthYear, schema) {
    if (mongoose.models[collectionName]) {
        return mongoose.models[collectionName];
    }

    const finalSchema = schema || mealSchema;
    return mongoose.model(collectionName, finalSchema, collectionName);
}
// (((new st))) --- নতুন অথেনটিকেশন মডেল ---

// ম্যানেজারদের জন্য আলাদা কালেকশন
const managerAuthSchema = new mongoose.Schema({
    managerID: { type: String, default: null },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true }, // এটি যোগ করুন
    phone: { type: String, required: true, unique: true },
    roomNo: { type: String, default: null },
    nickname: { type: String, default: "" }, // নতুন যুক্ত হলো
    semester: { type: String, default: "" }, // নতুন যুক্ত হলো
    password: { type: String, required: true },
    termStart: String,
    termEnd: String,
    role: { type: String, default: 'manager' },
    status: { type: String, default: 'pending' },
    resetOTP: { type: String, default: null },
    emailChangeOTP: { type: String, default: null }, // শুধু ইমেইলের জন্য
    phoneChangeOTP: { type: String, default: null }, // শুধু ফোনের জন্য
    profilePic: { type: String, default: "/frontend/Image/user.png" },
    theme: { type: String, default: 'dark' }
}, { collection: 'manager_accounts' });

const ManagerAuth = mongoose.model('ManagerAuth', managerAuthSchema);

// মেম্বারদের জন্য আলাদা কালেকশন
const memberAuthSchema = new mongoose.Schema({
    memberID: { type: String, default: null }, 
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true }, 
    phone: { type: String, required: true, unique: true },
    roomNo: { type: String, default: null },
    nickname: { type: String, default: "" }, // নতুন যুক্ত হলো
    semester: { type: String, default: "" }, // নতুন যুক্ত হলো
    password: { type: String, required: true },
    role: { type: String, default: 'member' },
    status: { type: String, default: 'pending' },
    resetOTP: { type: String, default: null },
    profilePic: { type: String, default: "/frontend/Image/user.png" },
    theme: { type: String, default: 'dark' },
    emailChangeOTP: { type: String, default: null }, 
    phoneChangeOTP: { type: String, default: null }, 
    yourTotalExpenses: { type: Number, default: 0 },
    yourTotalMeal: { type: Number, default: 0 },
    yourTotalDeposit: { type: Number, default: 0 },
    yourRefundableAmount: { type: Number, default: 0 },
    yourDue: { type: Number, default: 0 },
    yourCookBill: { type: Number, default: 0 },
    yourMealFines: { type: Number, default: 0 }
}, { collection: 'member_accounts' });

// এই কম্পাউন্ড ইনডেক্সটি নিশ্চিত করবে যেন nickname, roomNo এবং semester তিনটির কম্বিনেশন একসাথে একই না হয়
// memberAuthSchema.index({ nickname: 1, roomNo: 1, semester: 1 }, { unique: true, sparse: true });

const MemberAuth = mongoose.model('MemberAuth', memberAuthSchema);
// (((new end )))

// ইমেইল ট্রান্সপোর্টার সেটআপ
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // আপনার জিমেইল (যেমন: abc@gmail.com)
        pass: process.env.EMAIL_PASS  // গুগল থেকে পাওয়া ১৬ অক্ষরের App Password
    }
});


/// id genarete

function generateUniqueID(name, roomNo) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const roomStr = String(roomNo).padStart(3, '0'); // রুম নম্বর ৩ ডিজিট নিশ্চিত করা
    const totalLength = 8; // আইডির মোট দৈর্ঘ্য

    // র‍্যান্ডম ক্যারেক্টার জেনারেট করার ফাংশন
    const getRandomStr = (len) => {
        let res = '';
        for (let i = 0; i < len; i++) {
            res += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return res;
    };

    /** * লজিক: 
     * রুম নম্বরের জন্য ৩টি ঘর লাগবে। বাকি ৫টি ঘরে র‍্যান্ডম ক্যারেক্টার বসবে।
     * রুম নম্বরটি ০ থেকে ৫ নম্বর ইনডেক্সের যেকোনো জায়গায় শুরু হতে পারে।
     **/
    const startIndex = Math.floor(Math.random() * (totalLength - 2)); // ০ থেকে ৫ এর মধ্যে র‍্যান্ডম পজিশন
    
    const leftSide = getRandomStr(startIndex); // রুমের বাম পাশের অংশ
    const rightSide = getRandomStr(totalLength - 3 - startIndex); // রুমের ডান পাশের অংশ

    // সব মিলিয়ে ৮ ডিজিটের ফাইনাল আইডি
    return `${leftSide}${roomStr}${rightSide}`;


}

// সিঙ্ক করার রিইউজেবল ফাংশন
async function syncMemberAccountData() {
    try {
        const db = mongoose.connection.db;

        // ১. একটিভ টার্ম মেটাডাটা আনা
        const activeMeta = await db.collection('app_metadata').findOne({ termStatus: "active" });
        if (!activeMeta || !activeMeta.termStart || !activeMeta.termEnd) {
            console.log("❌ Active term metadata not found!");
            return false;
        }

        const termCollectionName = `members_${activeMeta.termStart}_${activeMeta.termEnd}`;
        const termCollection = db.collection(termCollectionName);
        const memberAccountsCollection = db.collection('member_accounts');

        const activeMembers = await memberAccountsCollection.find({ status: "active" }).toArray();
        if (activeMembers.length === 0) {
            console.log("⚠️ No active members found in member_accounts.");
            return false;
        }

        let updateCount = 0;

        for (const member of activeMembers) {
            // নাম বা নিকনেম দিয়ে টার্ম কালেকশনে খোঁজা
            let matchedTermData = null;

            if (member.name) {
                matchedTermData = await termCollection.findOne({
                    roomID: String(member.roomNo),
                    name: { $regex: new RegExp(`^${member.name.trim()}$`, "i") }
                });
            }

            if (!matchedTermData && member.nickname) {
                matchedTermData = await termCollection.findOne({
                    roomID: String(member.roomNo),
                    name: { $regex: new RegExp(`^${member.nickname.trim()}$`, "i") }
                });
            }

            // যদি টার্ম কালেকশনে মেম্বার পাওয়া যায়, তবে member_accounts আপডেট করব
            if (matchedTermData) {
                await memberAccountsCollection.updateOne(
                    { _id: member._id },
                    {
                        $set: {
                            yourTotalExpenses: matchedTermData.yourExpenses || 0,
                            yourTotalMeal: matchedTermData.totalMainGuest || 0,
                            yourTotalDeposit: matchedTermData.deposit || 0,
                            yourRefundableAmount: matchedTermData.refundable || 0,
                            yourDue: matchedTermData.due || 0,
                            yourCookBill: matchedTermData.totalCookBill || 0,
                            yourMealFines: matchedTermData.totalFineMeal || 0
                        }
                    }
                );
                updateCount++;
            } else {
                console.log(`⚠️ Term data not found for member: ${member.name} (Room: ${member.roomNo})`);
            }
        }

        console.log(`✨ Successfully synced data for ${updateCount} active members.`);
        return true;
    } catch (error) {
        console.error("🔥 Real-time Sync Error:", error);
        return false;
    }
}


// সব ক্যালকুলেশন সঠিক সিরিয়ালে রান করার মাস্টার ফাংশন
async function runSequentialCalculations(db, collectionName) {
    try {
        // ধাপ ১ ও ২: প্রথমে সামারি মিল এবং এক্সপেন্স ক্যালকুলেশন নিশ্চিত করা
        await updateTermSummaryMeals(db, collectionName);
        
        // ধাপ ৩: এবার mealRate ক্যালকুলেট করে term_summary-তে আপডেট করা
        const termSummaryDoc = await db.collection(collectionName).findOne({ type: "term_summary" });
        const totalExpense = termSummaryDoc ? Number(termSummaryDoc.totalTermExpenses) || 0 : 0;
        const totalMeal = termSummaryDoc ? Number(termSummaryDoc.allmemTotalMainGuest) || 0 : 0;
        
        let calculatedMealRate = 0;
        if (totalMeal > 0) {
            calculatedMealRate = totalExpense / totalMeal;
        }

        await db.collection(collectionName).updateOne(
            { type: "term_summary" },
            { $set: { mealRate: Number(calculatedMealRate.toFixed(4)) } }
        );

        // ধাপ ৪: কুক বিলগুলো আপডেট করা (termCookBill এর ওপর ভিত্তি করে)
        await updateTermCookBills(db, collectionName);

        // ধাপ ৫: সবার শেষে মেম্বারদের yourExpenses, refundable এবং due ক্যালকুলেট করা
        await updateMemberExpensesAndBalances(db, collectionName);

        console.log("✅ Sequential Calculations Completed Successfully!");
    } catch (error) {
        console.error("❌ Error in Sequential Calculations:", error);
    }
}

// মেম্বারদের সব মিলের যোগফল ক্যালকুলেট করে term_summary আপডেট করার ফাংশন
async function updateTermSummaryMeals(db, collectionName) {
    const DynamicMember = getDynamicModel(collectionName, null, memberSchema);
    
    // শুধু মেম্বারদের ডাটা ফেচ করা (term_summary বাদে)
    const members = await DynamicMember.find({ type: { $ne: "term_summary" } });
    
    let totalMainGuestSum = 0;
    members.forEach(m => {
        // সবার মোট মিলের ফিল্ডটি যোগ করা (আপনার প্রজেক্টে totalMainGuest ব্যবহার করা হচ্ছে)
        totalMainGuestSum += Number(m.totalMainGuest || 0); 
    });

    // term_summary ডকুমেন্টে আপডেট করা
    await db.collection(collectionName).updateOne(
        { type: "term_summary" },
        { $set: { allmemTotalMainGuest: totalMainGuestSum } },
        { upsert: true }
    );
}

// মেম্বারদের কুক বিল এবং টার্ম টোটাল কুক বিল ক্যালকুলেট করে আপডেট করার ফাংশন
async function updateTermCookBills(db, collectionName) {
    const DynamicMember = getDynamicModel(collectionName, null, memberSchema);
    
    // ১. term_summary ডকুমেন্ট থেকে termCookBill আনা
    const termSummary = await db.collection(collectionName).findOne({ type: "term_summary" });
    const termCookBill = termSummary ? Number(termSummary.termCookBill) || 0 : 0;

    // ২. সব মেম্বারদের ডাটা ফেচ করা (term_summary বাদে)
    const members = await DynamicMember.find({ type: { $ne: "term_summary" } });
    
    let termTotalCookBillSum = 0;
    const bulkOps = [];

    members.forEach(m => {
        const totalMainMeal = Number(m.totalMainMeal) || 0;
        const totalGuestMeal = Number(m.totalGuestMeal) || 0;

        // --- লজিক ১: mainCookBill ---
        let mainCookBill = 0;

if (totalMainMeal >= 10) {
    mainCookBill = termCookBill;
} else if (totalMainMeal >= 1 && totalMainMeal <= 9) {
    mainCookBill = termCookBill / 2;
} else {
    mainCookBill = 0;
}

        // --- লজিক ২: guestCookBill ---
        let guestCookBill = 0;
        if (totalGuestMeal >= 10) {
            guestCookBill = termCookBill;
        } else {
            guestCookBill = 0;
        }

        // --- লজিক ৩: totalCookBill ---
        const totalCookBill = mainCookBill + guestCookBill;

        // টার্মের সব মেম্বারের totalCookBill এর যোগফল (লজিক ৪ এর জন্য)
        termTotalCookBillSum += totalCookBill;

        // বাল্ক আপডেটের জন্য পুশ করা
        bulkOps.push({
            updateOne: {
                filter: { _id: m._id },
                update: { 
                    $set: { 
                        mainCookBill: mainCookBill,
                        guestCookBill: guestCookBill,
                        totalCookBill: totalCookBill 
                    } 
                }
            }
        });
    });

    // ৩. মেম্বারদের কুক বিল ডাটাবেসে আপডেট করা
    if (bulkOps.length > 0) {
        await DynamicMember.bulkWrite(bulkOps);
    }

    // --- লজিক ৪: termTotalCookBill ---
    // ৪. টার্ম সামারিতে `termTotalCookBill` আপডেট করা
    await db.collection(collectionName).updateOne(
        { type: "term_summary" },
        { $set: { termTotalCookBill: termTotalCookBillSum } },
        { upsert: true }
    );
}

// মেম্বারদের yourExpenses, refundable এবং due ক্যালকুলেট করে আপডেট করার ফাংশন 1111111111
// মেম্বারদের yourExpenses, refundable এবং due ক্যালকুলেট করার পর member_accounts এ সিঙ্ক করা
// মেম্বারদের yourExpenses, refundable এবং due ক্যালকুলেট করার পর member_accounts এ সিঙ্ক করা
async function updateMemberExpensesAndBalances(db, collectionName) {
    const DynamicMember = getDynamicModel(collectionName, null, memberSchema);
    
    const termSummary = await db.collection(collectionName).findOne({ type: "term_summary" });
    const mealRate = termSummary ? Number(termSummary.mealRate) || 0 : 0;

    const members = await DynamicMember.find({ type: { $ne: "term_summary" } });
    const memberAccountsCollection = db.collection('member_accounts');
    
    const bulkOps = [];
    const accountBulkOps = [];

    members.forEach(m => {
        const totalMainGuestFine = Number(m.totalMainGuestFine) || 0;
        const totalCookBill = Number(m.totalCookBill) || 0;
        const deposit = Number(m.deposit) || 0;
        const totalFineMeal = Number(m.totalFineMeal) || 0;
        const mealFinesAmount = totalFineMeal * mealRate;

        const yourExpenses = (mealRate * totalMainGuestFine) + totalCookBill;

        let refundable = 0;
        let due = 0;
        const balance = deposit - yourExpenses;

        if (balance >= 0) {
            refundable = balance;
            due = 0;
        } else {
            refundable = 0;
            due = Math.abs(balance);
        }

        // টার্ম কালেকশনের জন্য বাল্ক অপারেশন
        bulkOps.push({
            updateOne: {
                filter: { _id: m._id },
                update: { 
                    $set: { 
                        yourExpenses: Number(yourExpenses.toFixed(2)),
                        refundable: Number(refundable.toFixed(2)),
                        due: Number(due.toFixed(2))
                    } 
                }
            }
        });

        // 🌟 মেম্বারের নিজস্ব অ্যাকাউন্ট কালেকশন (member_accounts) এ ডেটা পাঠানোর জন্য অপারেশন
        accountBulkOps.push({
            updateOne: {
                filter: { 
                    roomNo: String(m.roomID),
                    $or: [
                        { name: { $regex: new RegExp(`^${m.name.trim()}$`, "i") } },
                        { nickname: { $regex: new RegExp(`^${m.name.trim()}$`, "i") } }
                    ]
                },
                update: {
                    $set: {
                        yourTotalExpenses: Number(yourExpenses.toFixed(2)),
                        yourTotalMeal: Number(m.totalMainGuest || 0),
                        yourTotalDeposit: Number(deposit.toFixed(2)),
                        yourRefundableAmount: Number(refundable.toFixed(2)),
                        yourDue: Number(due.toFixed(2)),
                        yourCookBill: Number(totalCookBill.toFixed(2)),
                        yourMealFines: Number(mealFinesAmount.toFixed(2))
                    }
                }
            }
        });
    });

    if (bulkOps.length > 0) {
        await DynamicMember.bulkWrite(bulkOps);
    }
    
    // member_accounts এ ডেটা আপডেট করা
    if (accountBulkOps.length > 0) {
        await memberAccountsCollection.bulkWrite(accountBulkOps);
    }
}


// JWT ভেরিফিকেশন মিডলওয়্যার
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

    if (!token) {
        return res.status(401).json({ message: "কোনো টোকেন পাওয়া যায়নি! এক্সেস ডিনাইড।" });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'my_super_secret_key', (err, user) => {
        if (err) {
            return res.status(403).json({ message: "টোকেনটি সঠিক নয় বা মেয়াদ শেষ হয়ে গেছে!" });
        }
        req.user = user; // টোকেন থেকে প্রাপ্ত ইউজার ইনফো রিকোয়েস্টে সেভ করা হলো
        next();
    });
};
// --- API Routes ---

// ((((new st)))) সাইনআপ এপিআই (ম্যানেজার ও মেম্বার)

// সংশোধিত সাইনআপ এপিআই (পাসওয়ার্ড হ্যাশ সহ)
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { role, name, email, phone, password, start, end } = req.body;

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        if (role === 'manager') {
            const existing = await ManagerAuth.findOne({ $or: [{ phone }, { email }] });
            if (existing) return res.status(400).json({ message: "এই ফোন বা ইমেইলে অলরেডি অ্যাকাউন্ট আছে!" });
            
            // ম্যানেজার একাউন্ট তৈরির সময় ডেট ওভারল্যাপ চেক
            if (start && end) {
                // DD-MM-YYYY ফরম্যাটকে YYYY-MM-DD তে রূপান্তর করার ছোট ফাংশন
                const parseDateToISO = (dateStr) => {
                    const parts = dateStr.split('-');
                    if (parts.length !== 3) return null;
                    return `${parts[2]}-${parts[1]}-${parts[0]}`; // Year-Month-Day
                };

                const newStartISO = parseDateToISO(start);
                const newEndISO = parseDateToISO(end);

                if (!newStartISO || !newEndISO) {
                    return res.status(400).json({ message: "সঠিক ডেট ফরম্যাট প্রদান করুন (DD-MM-YYYY)!" });
                }

                // ডাটাবেজের সব ম্যানেজারদের নিয়ে আসা যাদের টার্ম ডেট দেওয়া আছে
                const existingManagers = await ManagerAuth.find({
                    termStart: { $exists: true, $ne: "" },
                    termEnd: { $exists: true, $ne: "" }
                });

                let isOverlapping = false;

                for (let mgr of existingManagers) {
                    const existingStartISO = parseDateToISO(mgr.termStart);
                    const existingEndISO = parseDateToISO(mgr.termEnd);

                    if (existingStartISO && existingEndISO) {
                        // ডেট ওভারল্যাপ ফর্মুলা: (StartA <= EndB) AND (EndA >= StartB)
                        if (newStartISO <= existingEndISO && newEndISO >= existingStartISO) {
                            isOverlapping = true;
                            break;
                        }
                    }
                }

                if (isOverlapping) {
                    return res.status(400).json({ 
                        message: `দুঃখিত! এই ডেট রেঞ্জ (${start} থেকে ${end}) এর মধ্যে ইতিমধ্যে অন্য কোনো ম্যানেজারের টার্ম রয়েছে। আপনি ওভারল্যাপিং ডেটে অ্যাকাউন্ট তৈরি করতে পারবেন না।` 
                    });
                }
            }

            const newManager = new ManagerAuth({ 
                name, email, phone, password: hashedPassword,
                termStart: start || "",
                termEnd: end || "" ,
                status: 'pending'
            });
            await newManager.save();
        } else {
            const existing = await MemberAuth.findOne({ $or: [{ phone }, { email }] });
            if (existing) return res.status(400).json({ message: "এই ফোন বা ইমেইলে অলরেডি অ্যাকাউন্ট আছে!" });
            
            const newMemberAcc = new MemberAuth({ 
                name, email, phone, password: hashedPassword,
                status: 'pending' 
            });
            await newMemberAcc.save();
        }

        return res.status(201).json({ message: "Account request sent! Please wait for approval." });

    } catch (error) {
        console.error("Signup Error:", error);
        return res.status(500).json({ message: "সার্ভার এরর!" });
    }
});

// লগইন এপিআই 
app.post('/api/auth/login', async (req, res) => {
    try {
        const { phone, password, role } = req.body;
        let user;

        // ১. রোল অনুযায়ী ইউজার খোঁজা
        if (role === 'manager') {
            user = await ManagerAuth.findOne({ phone });
        } else {
            user = await MemberAuth.findOne({ phone });
        }

        if (!user) {
            return res.status(401).json({ message: "ফোন নম্বর ভুল বা একাউন্ট নেই!" });
        }

        // ২. ম্যানেজার হলে মেয়াদের সময় (Expiry Check) করা
        if (role === 'manager') {
            const today = new Date();
            today.setHours(0, 0, 0, 0); // সময় বাদ দিয়ে শুধু তারিখ তুলনা করার জন্য

            // আপনার DD-MM-YYYY ফরম্যাটকে JavaScript Date অবজেক্টে রূপান্তর করার জন্য ফাংশন
            const parseCustomDate = (dateStr) => {
                if (!dateStr) return new Date(0);
                const [day, month, year] = dateStr.split('-');
                return new Date(year, month - 1, day); // মাস ০ থেকে শুরু হয় (জানুয়ারি = ০)
            };

            // বাফার লজিক: ১ দিন আগে থেকে ১ দিন পর পর্যন্ত
            const startDate = parseCustomDate(user.termStart);
            startDate.setDate(startDate.getDate() - 10); // ১ দিন আগে (বড় বাফার চাইলে -২ দিতে পারেন)
            
            const endDate = parseCustomDate(user.termEnd);
            endDate.setDate(endDate.getDate() + 2); // ১ দিন পরে (বড় বাফার চাইলে +২ দিতে পারেন)

            if (today < startDate || today > endDate) {
                return res.status(403).json({ 
                    message: "আপনার মেয়াদের সময় শেষ অথবা এখনও শুরু হয়নি! মেয়াদের ২ দিন আগে থেকে ২ দিন পর পর্যন্ত এক্সেস পাবেন।" 
                });
            }
        }

        // ৩. পাসওয়ার্ড চেক করা
        const isMatch = await bcrypt.compare(password, user.password);
        let loginSuccess = isMatch || (password === user.password);

        if (!loginSuccess) {
            return res.status(401).json({ message: "পাসওয়ার্ড ভুল!" });
        }

        // ৪. মেম্বার হলে স্ট্যাটাস চেক (Pending মেম্বাররা লগইন করতে পারবে না)
        if (role === 'member' && user.status === 'pending') {
            // return res.status(403).json({ message: "আপনার একাউন্ট এখনও এপ্রুভ করা হয়নি। ম্যানেজারের সাথে যোগাযোগ করুন।" });
        }

        // ৫. সফল লগইন রেসপন্স (JWT টোকেনসহ)
        const tokenPayload = {
            phone: user.phone,
            role: user.role,
            name: user.name
        };

        // একটি সিক্রেট কি (এটি .env ফাইলে JWT_SECRET=your_secret_key নামে রাখা সবচেয়ে নিরাপদ)
        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET || 'my_super_secret_key', { expiresIn: '7d' });

        res.json({ 
            message: "লগইন সফল!", 
            name: user.name, 
            role: user.role,
            phone: user.phone,
            email: user.email,
            status: user.status || 'active', 
            memberID: user.memberID || null,
            profilePic: user.profilePic,
            theme: user.theme || 'dark', // 👈 নতুন যুক্ত হলো
            token: token 
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "লগইন প্রসেসে সমস্যা হয়েছে।" });
    }
});


// ইউজারের সব তথ্য ডাটাবেস থেকে চেক করার ইউনিভার্সাল রুট
// server.js এর এই রুটটি পরিবর্তন করুন
app.get('/api/auth/profile-info', async (req, res) => {
    const { phone, role } = req.query; // role কুয়েরি থেকে রিসিভ করুন

    if (!phone) {
        return res.status(400).json({ message: "ফোন নম্বর প্রয়োজন!" });
    }

    try {
        let user = null;
        let userType = role || 'member';

        // রোল অনুযায়ী সঠিক কালেকশনে চেক করা
        if (userType === 'manager') {
            user = await mongoose.connection.db.collection('manager_accounts').findOne({ phone });
        } else {
            user = await mongoose.connection.db.collection('member_accounts').findOne({ phone });
            // যদি রোল পাঠানো না থাকে এবং ম্যানেজারে না পাওয়া যায়, তবে মেম্বারে ট্রাই করবে
            if (!user) {
                user = await mongoose.connection.db.collection('manager_accounts').findOne({ phone });
                userType = 'manager';
            }
        }

        if (!user) {
            return res.status(404).json({ message: "ইউজার পাওয়া যায়নি!" });
        }

        const userData = {
            name: user.name,
            email: user.email,
            phone: user.phone,
            roomNo: user.roomNo,
            role: user.role || userType, 
            status: user.status,
            nickname: user.nickname,
            semester: user.semester
        };

        if (userType === 'manager') {
            userData.managerID = user.managerID;
            userData.termStart = user.termStart;
            userData.termEnd = user.termEnd;
        } else {
            userData.memberID = user.memberID;
        }

        res.json(userData);

    } catch (err) {
        console.error("Profile Info Error:", err);
        res.status(500).json({ message: "সার্ভার এরর!" });
    }
});


// ১. পেন্ডিং মেম্বারদের তালিকা দেখার এপিআই
app.get('/api/auth/pending-members', async (req, res) => {
    try {
        const pending = await MemberAuth.find({ status: 'pending' });
        res.json(pending);
    } catch (error) {
        res.status(500).json({ message: "Error fetching data" });
    }
});


// থিম সেভ করার API
app.post('/api/auth/update-theme', async (req, res) => {
    try {
        const { phone, role, theme } = req.body;
        const TargetModel = role === 'manager' ? ManagerAuth : MemberAuth;

        const updatedUser = await TargetModel.findOneAndUpdate(
            { phone: phone },
            { $set: { theme: theme } },
            { returnDocument: 'after' }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "ইউজার পাওয়া যায়নি!" });
        }

        res.status(200).json({ message: "থিম সফলভাবে সেভ হয়েছে! ✅", theme: updatedUser.theme });
    } catch (error) {
        console.error("Theme Update Error:", error);
        res.status(500).json({ message: "সার্ভার এরর!" });
    }
});

// ২. মেম্বার অ্যাপ্রুভ করার এপিআই (এটি স্ট্যাটাস active করে দিবে)

app.post('/api/auth/activate-account', async (req, res) => {
    try {
        const { phone, role, enteredID } = req.body;
        const TargetModel = (role === 'manager') ? ManagerAuth : MemberAuth;
        
        const user = await TargetModel.findOne({ phone });

        if (!user) return res.status(404).json({ message: "ইউজার পাওয়া যায়নি!" });

        // --- ফিক্স শুরু: রোল অনুযায়ী সঠিক ফিল্ড চেক করা ---
        const actualID = (role === 'manager') ? user.managerID : user.memberID;

        if (actualID === enteredID) {
            user.status = 'active';
            await user.save();
            res.json({ message: "আপনার একাউন্ট সফলভাবে একটিভ হয়েছে! ✅" });
        } else {
            res.status(400).json({ message: "ভুল আইডি! আবার চেষ্টা করুন।" });
        }
        // --- ফিক্স শেষ ---

    } catch (error) {
        console.error("Activation Error:", error);
        res.status(500).json({ message: "অ্যাক্টিভ করতে সমস্যা হয়েছে।" });
    }
});

// ((((new end))))

// genarte id

app.post('/api/auth/reset-member-id', async (req, res) => {
    const { phone, role, nickname, semester, email, roomNo } = req.body;

    // ব্যাকএন্ডে বাধ্যতামূলক ফিল্ড চেক
    if (!nickname || !semester || !roomNo || !email) {
        return res.status(400).json({ message: "নিকনেম, সেমিস্টার, রুম নম্বর এবং ইমেইল আবশ্যক!" });
    }

    try {
        // ১. নতুন ৮-ডিজিট আইডি তৈরি (এখানে চাইলে জেনারেটরে নিকনেম বা সেমিস্টারও ব্যবহার করতে পারো)
        const newID = generateUniqueID(nickname, roomNo);

        // ২. রোল অনুযায়ী সঠিক মডেল সিলেক্ট করা
        const TargetModel = role === 'manager' ? ManagerAuth : MemberAuth;

        // ৩. ডাটাবেসে আপডেট (নিকনেম, সেমিস্টার এবং নতুন আইডি সেট করা)
        const idFieldName = role === 'manager' ? 'managerID' : 'memberID';

        const user = await TargetModel.findOneAndUpdate(
            { phone: phone },
            { 
                $set: { 
                    [idFieldName]: newID,
                    nickname: nickname,
                    semester: semester,
                    status: 'pending' 
                } 
            },
            { new: true }
        );

        if (!user) return res.status(404).json({ message: "ইউজার পাওয়া যায়নি!" });

        // ৪. ইমেইল পাঠানো
        const mailOptions = {
            from: `"MessMate Admin" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'New Unique Member ID - MessMate',
            html: `
                <div style="font-family: sans-serif; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #333;">Hello ${nickname},</h2>
                    <p>You requested a <b>Unique Member ID</b> for your <b>${role.toUpperCase()}</b> account.</p>
                    <p>Your new 8-digit ID is:</p>
                    <h1 style="color: #2ecc71; letter-spacing: 5px; background: #f9f9f9; padding: 15px; border-radius: 5px; text-align: center;">${newID}</h1>
                    <p>Please use this ID on your profile page to verify and activate your account. Keep this ID safe.</p>
                    <hr style="border: 0; border-top: 1px solid #eee;">
                    <p style="font-size: 12px; color: #888;">MessMate - Mess Management System</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);

        console.log(`✅ New ID Generated for ${nickname}: ${newID}`);
        res.status(200).json({ message: "নতুন আইডি ইমেইলে পাঠানো হয়েছে!" });

    } catch (err) {
        console.error("ID Reset Error:", err);
        res.status(500).json({ message: "সার্ভার এরর! আইডি রিসেট করা যায়নি।" });
    }
});

/// ## email or phn cng otp 

// ১. ইমেইল পরিবর্তনের ওটিপি পাঠানোর রুট
app.post('/api/auth/send-email-change-otp', async (req, res) => {
    const { email, role, currentPhone } = req.body;
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    try {
        const TargetModel = role === 'manager' ? ManagerAuth : MemberAuth;
        
        // ডাটাবেসে শুধুমাত্র emailChangeOTP আপডেট করা
        const user = await TargetModel.findOneAndUpdate(
            { phone: currentPhone }, 
            { $set: { emailChangeOTP: otp } }
        );

        if (!user) return res.status(404).json({ message: "ইউজার পাওয়া যায়নি!" });

        // ইমেইল পাঠানো
        const mailOptions = {
            from: `"MessMate Admin" <${process.env.EMAIL_USER}>`,
            to: email, // নতুন ইমেইলে ওটিপি যাবে
            subject: 'Email Change Verification',
            html: `
                <div style="font-family: sans-serif; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #333;">Hello ${user.name},</h2>
                    <p>You requested an OTP to change email for your <b>${role.toUpperCase()}</b> account.</p>
                    <p>Your OTP is:</p>
                    <h1 style="color: #007bff; letter-spacing: 5px;">${otp}</h1>
                    <p>This code will expire soon. Do not share it with anyone.</p>
                    <hr style="border: 0; border-top: 1px solid #eee;">
                    <p style="font-size: 12px; color: #888;">MessMate - Mess Management System</p>
                </div>
                `
        };

        await transporter.sendMail(mailOptions);


        // ৬. টার্মিনাল লগ (কালারফুল)
        const formattedRole = role.charAt(0).toUpperCase() + role.slice(1);
        const yellowRole = `\x1b[1m\x1b[33m${formattedRole}\x1b[0m`;
        const greenOTP = `\x1b[1m\x1b[32m${otp}\x1b[0m`;

        console.log(`\n--------------------------------------------`);
        console.log(`👤 User: ${user.name}`);
        console.log(`🔑 OTP Sent for ${yellowRole} Account to change email`);
        console.log(`User Email: ${user.email}`);
        console.log(`Your OTP  : ${greenOTP}`);
        console.log(`--------------------------------------------\n`);

        res.status(200).json({ message: "OTP আপনার ইমেইলে পাঠানো হয়েছে!" });


    } catch (err) {
        console.error("Email OTP Error:", err);
        res.status(500).json({ message: "ইমেইল ওটিপি পাঠাতে সমস্যা হয়েছে।" });
    }
});


// phone:

// ২. ফোন নম্বর পরিবর্তনের ওটিপি পাঠানোর রুট (Terminal Only)
app.post('/api/auth/send-phone-change-otp', async (req, res) => {
    const { role, currentPhone } = req.body;
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    try {
        const TargetModel = role === 'manager' ? ManagerAuth : MemberAuth;
        
        const user = await TargetModel.findOneAndUpdate(
            { phone: currentPhone }, 
            { $set: { phoneChangeOTP: otp } }
        );

        if (!user) return res.status(404).json({ message: "ইউজার পাওয়া যায়নি!" });

        // ৬. টার্মিনাল লগ (কালারফুল)
        const formattedRole = role.charAt(0).toUpperCase() + role.slice(1);
        const yellowRole = `\x1b[1m\x1b[33m${formattedRole}\x1b[0m`;
        const greenOTP = `\x1b[1m\x1b[32m${otp}\x1b[0m`;

        console.log(`\n--------------------------------------------`);
        console.log(`👤 User: ${user.name}`);
        console.log(`🔑 OTP Sent for ${yellowRole} Account to change phone`);
        console.log(`📱 Current Phone: ${currentPhone}`);
        console.log(`User Email: ${user.email}`);
        console.log(`Your OTP  : ${greenOTP}`);
        console.log(`--------------------------------------------\n`);
        
        res.status(200).json({ message: "ফোন পরিবর্তনের ওটিপি পাঠানো হয়েছে (সার্ভার টার্মিনাল দেখুন)!" });

    } catch (err) {
        res.status(500).json({ message: "ফোন ওটিপি জেনারেট করতে সমস্যা হয়েছে।" });
    }
});


// 

// --- বেসিক তথ্য (Name & Room No) আপডেট করার রুট ---
app.post('/api/auth/update-basic-info', async (mainReq, res) => {
    const { phone, role, name, nickname, roomNo, semester } = mainReq.body;

    try {
        const TargetModel = (role === 'manager') ? ManagerAuth : MemberAuth;

        // অতিরিক্ত সুরক্ষার জন্য ট্রিম করে নেওয়া (যাতে অতিরিক্ত স্পেস সমস্যা না করে)
        const cleanNickname = nickname ? nickname.trim() : "";
        const cleanRoomNo = roomNo ? roomNo.trim() : "";
        const cleanSemester = semester ? semester.trim() : "";

        // ১. রেগুলার এক্সপ্রেশন (RegExp) ব্যবহার করে কেস-ইনসেন্সিটিভ চেক করা (যেমন "Sami" আর "sami" একই ধরবে)
        const existingUser = await TargetModel.findOne({
            phone: { $ne: phone },
            nickname: { $regex: new RegExp(`^${cleanNickname}$`, "i") },
            roomNo: cleanRoomNo,
            semester: { $regex: new RegExp(`^${cleanSemester}$`, "i") }
        });

        if (existingUser) {
            return res.status(400).json({ 
                message: "এই নিকনেম, রুম নম্বর এবং সেমিস্টারের কম্বিনেশন দিয়ে ইতিমধ্যে অন্য একটি অ্যাকাউন্ট রয়েছে! দয়া করে আলাদা তথ্য দিন।" 
            });
        }

        // ২. আপডেট করা
        const updatedUser = await TargetModel.findOneAndUpdate(
            { phone: phone }, 
            { 
                $set: { 
                    name: name, 
                    nickname: cleanNickname, 
                    roomNo: cleanRoomNo,
                    semester: cleanSemester   
                } 
            },
            { returnDocument: 'after' }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "ইউজার পাওয়া যায়নি!" });
        }

        res.status(200).json({ message: "তথ্য সফলভাবে আপডেট হয়েছে।" });

    } catch (err) {
        console.error("Update Error:", err);
        res.status(500).json({ message: "সার্ভার এরর! ডাটাবেসে সমস্যা হয়েছে।" });
    }
});

// ##ইমেইল বা ফোন নম্বর ভেরিফাই করে আপডেট করার রুট
app.post('/api/auth/verify-and-update-profile', async (req, res) => {
    const { phone, role, type, newValue, otp } = req.body;

    try {
        const TargetAuthModel = role === 'manager' ? ManagerAuth : MemberAuth;
        const userInDB = await TargetAuthModel.findOne({ phone: phone });

        if (!userInDB) return res.status(404).json({ message: "ইউজার পাওয়া যায়নি!" });

        // ডাটাবেস থেকে সঠিক ওটিপি ফিল্ড চেক করা
        const dbOtp = type === 'email' ? userInDB.emailChangeOTP : userInDB.phoneChangeOTP;

        if (String(otp) !== String(dbOtp)) {
            return res.status(400).json({ message: "ভুল ওটিপি! পরিবর্তন করা সম্ভব হয়নি।" });
        }

        // ওটিপি মিলে গেলে আপডেট এবং ওটিপি ফিল্ড মুছে দেওয়া
        let updateData = { [type]: newValue };
        updateData.emailChangeOTP = null; // কাজ শেষে ওটিপি রিসেট
        updateData.phoneChangeOTP = null;

        const updatedUser = await TargetAuthModel.findOneAndUpdate(
            { phone: phone }, 
            { $set: updateData },
            { new: true }
        );

        res.status(200).json({ message: "সফলভাবে আপডেট হয়েছে!", user: updatedUser });

    } catch (err) {
        res.status(500).json({ message: "সার্ভার এরর!" });
    }
});



//

app.post('/api/auth/update-password', async (req, res) => {
    try {
        const { phone, role, oldPass, newPass } = req.body;

        // ১. রোল অনুযায়ী সঠিক মডেল সিলেক্ট করা
        const TargetModel = (role === 'manager') ? ManagerAuth : MemberAuth;

        // ২. ইউজারকে খুঁজে বের করা
        const user = await TargetModel.findOne({ phone });

        if (!user) {
            return res.status(404).json({ message: "ইউজার পাওয়া যায়নি!" });
        }

        // ৩. পুরনো পাসওয়ার্ড ডাটাবেসের পাসওয়ার্ডের সাথে মিলছে কি না চেক করা
        // নোট: যদি আপনি bcrypt ব্যবহার করেন তবে compare ব্যবহার করবেন
        const isMatch = await bcrypt.compare(oldPass, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: "বর্তমান পাসওয়ার্ডটি সঠিক নয়!" });
        }

        // ৪. নতুন পাসওয়ার্ডটি হ্যাস (Hash) করা
        const salt = await bcrypt.genSalt(10);
        const hashedNewPass = await bcrypt.hash(newPass, salt);

        // ৫. ডাটাবেসে নতুন পাসওয়ার্ড আপডেট করা
        user.password = hashedNewPass;
        await user.save();

        res.status(200).json({ message: "পাসওয়ার্ড সফলভাবে আপডেট হয়েছে! ✅" });

    } catch (error) {
        console.error("Password Update Server Error:", error);
        res.status(500).json({ message: "সার্ভারে সমস্যা হয়েছে, পরে চেষ্টা করুন।" });
    }
});


// ##

// উদাহরণ: গেট ইউজার ডাটা রুটটিতে মিডলওয়্যার যুক্ত করা
app.get('/api/get-user-data', verifyToken, async (req, res) => {
    const { phone, role } = req.query;
    try {
        let user = (role === 'manager') 
            ? await ManagerAuth.findOne({ phone }) 
            : await MemberAuth.findOne({ phone });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: "Error" });
    }
});

// ((((new st))))

// --- ভেরিফিকেশন এপিআই (সরাসরি ডাটাবেস চেক করবে) ---
app.get('/api/auth/verify', async (req, res) => {
    try {
        // ফ্রন্টএন্ড থেকে আমরা হেডার ছাড়াও কুয়েরি প্যারামিটারে ফোন নম্বর পাঠাবো
        const phone = req.query.phone;
        const role = req.query.role;

        if (!phone) return res.status(401).json({ message: "No identity provided" });

        let user;
        if (role === 'manager') {
            user = await ManagerAuth.findOne({ phone });
        } else {
            user = await MemberAuth.findOne({ phone });
        }

        // যদি ডাটাবেসে ইউজারকে না পাওয়া যায় (অর্থাৎ আপনি ডিলিট করে দিয়েছেন)
        if (!user) {
            console.log(`User with phone ${phone} not found! Logging out...`);
            return res.status(404).json({ message: "User no longer exists" });
        }

        // ইউজার পাওয়া গেলে সাকসেস
        res.status(200).json({ status: user.status });
    } catch (error) {
        res.status(500).json({ message: "Server error during verification" });
    }
});


// ((((new end))))

// ((((new st))))

// ==========================================
// পাসওয়ার্ড রিসেট ও ওটিপি এপিআই (NEW)
// ==========================================

// ১. OTP পাঠানোর রুট
app.post('/api/auth/send-otp', async (req, res) => {
    const { email, role } = req.body; // ফ্রন্টএন্ড থেকে আসা role ধরছি
    try {
        // ১. নির্দিষ্ট রোল অনুযায়ী ডাটাবেস মডেল সিলেক্ট করা
        const TargetModel = role === 'manager' ? ManagerAuth : MemberAuth;
        
        // ২. শুধুমাত্র ওই নির্দিষ্ট মডেলে ইমেইল দিয়ে ইউজার খোঁজা
        const user = await TargetModel.findOne({ email });
        
        if (!user) {
            return res.status(404).json({ 
                message: `এই ইমেইল দিয়ে কোনো ${role === 'manager' ? 'ম্যানেজার' : 'মেম্বার'} অ্যাকাউন্ট পাওয়া যায়নি!` 
            });
        }

        // ৩. ওটিপি তৈরি
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        
        // ৪. ওই ইউজারের অ্যাকাউন্টে ওটিপি সেভ করা
        await TargetModel.findByIdAndUpdate(user._id, { $set: { resetOTP: otp } });

        // ৫. ইমেইল পাঠানো
        const mailOptions = {
            from: `"MessMate Admin" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Password Reset OTP - MessMate',
            html: `
                <div style="font-family: sans-serif; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #333;">Hello ${user.name},</h2>
                    <p>You requested an OTP to reset password for your <b>${role.toUpperCase()}</b> account.</p>
                    <p>Your OTP is:</p>
                    <h1 style="color: #007bff; letter-spacing: 5px;">${otp}</h1>
                    <p>This code will expire soon. Do not share it with anyone.</p>
                    <hr style="border: 0; border-top: 1px solid #eee;">
                    <p style="font-size: 12px; color: #888;">MessMate - Mess Management System</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);

        // ৬. টার্মিনাল লগ (কালারফুল)
        const formattedRole = role.charAt(0).toUpperCase() + role.slice(1);
        const yellowRole = `\x1b[1m\x1b[33m${formattedRole}\x1b[0m`;
        const greenOTP = `\x1b[1m\x1b[32m${otp}\x1b[0m`;

        console.log(`\n--------------------------------------------`);
        console.log(`👤 User: ${user.name}`);
        console.log(`🔑 OTP Sent for ${yellowRole} Account`);
        console.log(`User Email: ${user.email}`);
        console.log(`Your OTP  : ${greenOTP}`);
        console.log(`--------------------------------------------\n`);

        res.status(200).json({ message: "OTP আপনার ইমেইলে পাঠানো হয়েছে!" });

    } catch (err) {
        console.error("OTP/Email Error:", err);
        res.status(500).json({ message: "সার্ভার এরর! ওটিপি পাঠানো যায়নি।" });
    }
});

// ২. পাসওয়ার্ড রিসেট ভেরিফিকেশন
// ২. পাসওয়ার্ড রিসেট ভেরিফিকেশন (Email + Role ভিত্তিক)
app.post('/api/auth/verify-otp-reset', async (req, res) => {
    // ফ্রন্টএন্ড থেকে এখন role-ও আসবে
    const { email, role, otp, newPassword } = req.body; 

    try {
        // ১. নির্দিষ্ট রোল অনুযায়ী মডেল সিলেক্ট করা
        const TargetModel = role === 'manager' ? ManagerAuth : MemberAuth;

        // ২. নির্দিষ্ট মডেলে ইমেইল এবং ওটিপি মিলিয়ে ইউজার খোঁজা
        const user = await TargetModel.findOne({ email, resetOTP: otp });

        if (!user) {
            return res.status(400).json({ 
                message: "ভুল ওটিপি অথবা রোল তথ্য সঠিক নয়!" 
            });
        }

        // ৩. নতুন পাসওয়ার্ড হ্যাশ করা
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        
        // ৪. পাসওয়ার্ড আপডেট এবং ওটিপি ক্লিয়ার করা
        await TargetModel.findByIdAndUpdate(user._id, { 
            $set: { 
                password: hashedPassword, 
                resetOTP: null // ওটিপি একবার ব্যবহার হয়ে গেলে তা মুছে ফেলা ভালো
            } 
        });

        // টার্মিনাল লগ
        console.log(`\x1b[32m✔ Password updated successfully for ${role}: ${email}\x1b[0m`);

        res.status(200).json({ message: "পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে!" });

    } catch (err) {
        console.error("Reset Error:", err);
        res.status(500).json({ message: "পাসওয়ার্ড আপডেট করতে সমস্যা হয়েছে।" });
    }
});

// ((((new end))))


// ৩. মেম্বার লিস্ট গেট করা (FIXED: এটি এখন রিয়েল-টাইম মিল ক্যালকুলেট করবে)
// ১. মেম্বার লিস্ট গেট করার রুট (FIXED: টার্ম-ভিত্তিক এবং নতুন ৪টি ফিল্ড সহ)
app.get('/api/members', async (req, res) => {
    try {
        // ১. রিকোয়েস্ট হেডার অথবা মেটাডাটা থেকে টার্মের তথ্য নেওয়া
        let { termStart, termEnd } = req.headers;

        if (!termStart || !termEnd) {
            const meta = await mongoose.connection.db.collection('app_metadata').findOne({ termStatus: 'active' });
            if (meta && meta.termStart && meta.termEnd) {
                termStart = meta.termStart;
                termEnd = meta.termEnd;
            }
        }

        if (!termStart || !termEnd) {
            return res.status(400).json({ message: "অ্যাক্টিভ টার্ম খুঁজে পাওয়া যায়নি, দয়া করে আগে টার্ম সেট করুন!" });
        }

        // ২. কালেকশন নাম তৈরি
        const memberCollectionName = `members_${termStart}_${termEnd}`;
        const DynamicMember = getDynamicModel(memberCollectionName, null, memberSchema);

        // ৩. সাধারণ মেম্বার ডাটা ফেচ করা (যাতে term_summary লিস্টে না আসে)
        const members = await DynamicMember.find({ type: { $ne: "term_summary" } });
        
        // ৪. ডিফল্ট মান ও ফিল্ড নিশ্চিতকরণ (মেম্বারদের জন্য)
        const formattedMembers = members.map(m => {
            const memberObj = m.toObject();
            return {
                ...memberObj,
                roomID: memberObj.roomID || "N/A",
                semester: memberObj.semester || "N/A",
                totalMainMeal: memberObj.totalMainMeal || 0,
                totalGuestMeal: memberObj.totalGuestMeal || 0,
                totalFineMeal: memberObj.totalFineMeal || 0,
                totalMainGuestFine: memberObj.totalMainGuestFine || 0
            };
        });

        // ৫. আলাদাভাবে type: "term_summary" ডাটাটি ফেচ করা
        const termSummaryDoc = await DynamicMember.findOne({ type: "term_summary" });
        
        // টার্ম সামারি থেকে প্রয়োজনীয় ফিল্ডগুলো এক্সট্রাক্ট করা (না থাকলে ডিফল্ট ০ বা নাল রাখা)
        const termSummaryData = {
            mealRate: termSummaryDoc ? termSummaryDoc.mealRate || 0 : 0,
            termCookBill: termSummaryDoc ? termSummaryDoc.termCookBill || 0 : 0
        };

        // ৬. মেম্বারদের লিস্ট এবং টার্ম সামারি একসাথে রেসপন্স পাঠানো
        res.json({
            members: formattedMembers,
            termSummary: termSummaryData
        });

    } catch (error) {
        console.error("Fetch Error:", error);
        res.status(500).json({ message: error.message });
    }
});
/// ###

//// প্রোফাইল পিকচার আপডেট করার API
app.post('/api/update-profile-pic', async (req, res) => {
    const { phone, role, imageData } = req.body;

    console.log("Request Received for Phone:", phone); // চেক করার জন্য

    try {
        let updatedUser;
        // ডাটাবেসে ইউজার খোঁজা এবং আপডেট করা
        if (role === 'manager') {
            updatedUser = await ManagerAuth.findOneAndUpdate(
                { phone: phone }, 
                { $set: { profilePic: imageData } }, // $set ব্যবহার করা নিরাপদ
                { new: true }
            );
        } else {
            updatedUser = await MemberAuth.findOneAndUpdate(
                { phone: phone }, 
                { $set: { profilePic: imageData } }, 
                { new: true }
            );
        }

        if (!updatedUser) {
            console.log("User not found in DB for phone:", phone);
            return res.status(404).json({ message: "User not found in database" });
        }

        console.log("Database Updated Successfully!");
        res.status(200).json({ message: "DB Updated Successfully!", pic: updatedUser.profilePic });

    } catch (err) {
        console.error("DB Error:", err);
        res.status(500).json({ message: "Server error during update" });
    }
});

// ##

// ৬. সেভ করা মিল ফেচ করার রুট
app.get('/api/get-meals', async (req, res) => {
    try {
        const { start, end } = req.query;
        if (!start || !end) {
            return res.status(400).json({ message: "Start and End dates are required!" });
        }

        // একটিভ টার্ম চেক করা
        const meta = await mongoose.connection.db.collection('app_metadata').findOne({ termStatus: 'active' });
        if (!meta || !meta.termStart || !meta.termEnd) {
            return res.status(400).json({ message: "Active term not found!" });
        }

        const mealCollectionName = `meals_${meta.termStart}_${meta.termEnd}`;
        const DynamicMealRecord = getDynamicModel(mealCollectionName, null, mealSchema);

        // ডেট রেঞ্জের মধ্যে বা নির্দিষ্ট তারিখের ডাটা কুয়েরি করা
        const query = {};
        if (start && end) {
            query.date = { $gte: start, $lte: end };
        }

        const mealsData = await DynamicMealRecord.find(query);
        res.status(200).json(mealsData);

    } catch (error) {
        console.error("Get Meals Error:", error);
        res.status(500).json({ message: "মিল ডাটা ফেচ করতে সমস্যা হয়েছে: " + error.message });
    }
});






// ৪. নতুন মেম্বার সেভ করা
// ৪. মেম্বার সেভ করার রুট (সংশোধিত)
app.post('/api/members', async (req, res) => {
    try {
        // ১. বর্তমানে active টার্ম চেক করা (metadata থেকে)
        const meta = await mongoose.connection.db.collection('app_metadata').findOne({ termStatus: 'active' });
        
        if (!meta || !meta.termStart || !meta.termEnd) {
            return res.status(400).json({ 
                message: "মেম্বার অ্যাড করার আগে টার্ম অ্যাক্টিভ করুন!" 
            });
        }

        // ২. কালেকশন নাম ফরম্যাট: members_termStart_termEnd
        const collectionName = `members_${meta.termStart}_${meta.termEnd}`;
        const db = mongoose.connection.db;
        
        // ডাইনামিক মডেল ব্যবহার
        const DynamicMember = getDynamicModel(collectionName, null, memberSchema);

        // ৩. ফ্রন্টএন্ড থেকে আসা ডাটা ট্রিম করে নেওয়া
        const roomID = (req.body.roomID || "").trim();
        const name = (req.body.name || "").trim();
        const semester = (req.body.semester || "").trim();
        const deposit = Number(req.body.deposit) || 0;

        // --- নতুন যোগ করা ডুপ্লিকেট চেক লজিক ---
        // একই roomID, name এবং semester একই সাথে আছে কি না তা চেক করা
        const existingMember = await DynamicMember.findOne({
            roomID: { $regex: new RegExp(`^${roomID}$`, "i") },
            name: { $regex: new RegExp(`^${name}$`, "i") },
            semester: { $regex: new RegExp(`^${semester}$`, "i") }
        });

        if (existingMember) {
            return res.status(400).json({ 
                message: "এই মেম্বার, সেমিস্টার এবং রুম আইডি দিয়ে ইতিমধ্যে একজন মেম্বার তালিকাভুক্ত রয়েছে!" 
            });
        }
        // ----------------------------------------

        const newMember = new DynamicMember({ 
            roomID, 
            name, 
            semester, 
            deposit,
            depositHistory: deposit > 0 ? [{ amount: deposit, date: new Date() }] : [],
            mainCookBill: 0,
            guestCookBill: 0,
            totalCookBill: 0
        });
        
        await newMember.save();

        // ৪. চেক করা যে এই কালেকশনে অলরেডি টার্মের এক্সট্রা ফিল্ড বা সামারি একবার এন্ট্রি হয়েছে কিনা
        const existingSummary = await db.collection(collectionName).findOne({ type: "term_summary" });

        // যদি একবারও না থাকে, তবে শুধুমাত্র ১ বার এই ফিল্ডগুলো ইনসার্ট হবে
        if (!existingSummary) {
            await db.collection(collectionName).insertOne({
                type: "term_summary", // এটিকে আলাদা ডকুমেন্ট হিসেবে চিহ্নিত করার ফ্ল্যাগ
                termStart: meta.termStart,
                termEnd: meta.termEnd,
                mealRate: 0,                    // আপনার প্রয়োজনমতো ডিফল্ট ভ্যালু দিন
                totalTermExpenses: 0,
                allmemTotalMainGuest: 0,     // আপনার প্রয়োজনমতো ডিফল্ট ভ্যালু দিন
                termCookBill: 0,
                termTotalCookBill: 0,
                createdAt: new Date()
            });
        }

        res.status(201).json({ 
            message: `সফলভাবে ${meta.termStart} থেকে ${meta.termEnd} টার্মের জন্য মেম্বার যুক্ত হয়েছে! ✅`, 
            data: newMember 
        });

    } catch (error) {
        console.error("Add Member Error:", error);
        res.status(500).json({ message: "মেম্বার সেভ করা সম্ভব হয়নি।" });
    }
});
// ৫. মিল সেভ করার রুট
app.post('/api/save-meals', async (req, res) => {
    try {
        const { meals } = req.body;
        if (!meals || !Array.isArray(meals)) {
            return res.status(400).json({ message: "Invalid data format!" });
        }

        // ১. একটিভ টার্ম চেক করা app_metadata থেকে
        const meta = await mongoose.connection.db.collection('app_metadata').findOne({ termStatus: 'active' });
        
        if (!meta || !meta.termStart || !meta.termEnd) {
            return res.status(400).json({ message: "আগে টার্ম অ্যাক্টিভ করুন!" });
        }

        // ২. ডাইনামিক কালেকশন নাম তৈরি: meals_termStart_termEnd
        const mealCollectionName = `meals_${meta.termStart}_${meta.termEnd}`;
        const memberCollectionName = `members_${meta.termStart}_${meta.termEnd}`;
        
        const DynamicMealRecord = getDynamicModel(mealCollectionName, null, mealSchema);
        const DynamicMember = getDynamicModel(memberCollectionName, null, memberSchema);

        // ৩. মেম্বারদের তথ্য ম্যাপ করে নেওয়া
        const membersList = await DynamicMember.find({});
        const memberMap = {};
        membersList.forEach(m => {
            memberMap[m._id.toString()] = {
                name: m.name,
                roomID: m.roomID,
                semester: m.semester
            };
        });

        // ৪. বাল্ক রাইট অপারেশন প্রস্তুত করা
        const bulkOps = [];
        
        meals.forEach(item => {
    const mainLunch = Number(item.mainLunch) || 0;
    const mainDinner = Number(item.mainDinner) || 0;
    const guestLunch = Number(item.guestLunch) || 0;
    const guestDinner = Number(item.guestDinner) || 0;
    const fineLunch = Number(item.fineLunch) || 0;
    const fineDinner = Number(item.fineDinner) || 0;

    // কোনো মিল জিরো হলেও যেন ডাটাবেজে ০ সেভ বা আপডেট হতে পারে, তাই শর্তটি বাদ দেওয়া হলো

    const filter = {
        memberId: new mongoose.Types.ObjectId(item.memberId),
        date: item.date
    };

    const memberInfo = memberMap[item.memberId] || {};

    const updateData = {
        name: memberInfo.name || item.name || "N/A",
        roomID: memberInfo.roomID || "N/A",
        semester: memberInfo.semester || "N/A",
        date: item.date,
        mainLunch,
        mainDinner,
        guestLunch,
        guestDinner,
        fineLunch,
        fineDinner
    };

    bulkOps.push({
        updateOne: {
            filter,
            update: { $set: updateData },
            upsert: true
        }
    });
});

        if (bulkOps.length > 0) {
            await DynamicMealRecord.bulkWrite(bulkOps);
        }

        // ৫. মেম্বার টেবিলের মিল হিসাব করে আপডেট করা (এখানে ফাইন মিল যুক্ত করা হলো)
        const uniqueMemberIds = [...new Set(meals.map(m => m.memberId))];
        await Promise.all(uniqueMemberIds.map(async (mId) => {
            const totalResult = await DynamicMealRecord.aggregate([
                { $match: { memberId: new mongoose.Types.ObjectId(mId) } },
                { 
                    $group: { 
                        _id: null, 
                        totalMain: { $sum: { $add: ["$mainLunch", "$mainDinner"] } },
                        totalGuest: { $sum: { $add: ["$guestLunch", "$guestDinner"] } },
                        totalFine: { $sum: { $add: ["$fineLunch", "$fineDinner"] } }
                    } 
                }
            ]);

            const stats = totalResult[0] || { totalMain: 0, totalGuest: 0, totalFine: 0 };
            
            const totalMainMeal = stats.totalMain;
            const totalGuestMeal = stats.totalGuest;
            const totalFineMeal = stats.totalFine;
            
            // ✅ ফিক্স: এখানে টোটালে ফাইন মিলও যোগ করে দেওয়া হলো
            const totalMainGuest = totalMainMeal + totalGuestMeal;
            const totalMainGuestFine = totalMainMeal + totalGuestMeal + totalFineMeal;

            await DynamicMember.findByIdAndUpdate(mId, { 
                $set: { 
                    totalMainMeal,
                    totalGuestMeal,
                    totalFineMeal,
                    totalMainGuest,
                    totalMainGuestFine
                } 
            });
        }));

        // মিল সেভ বা আপডেট হওয়ার পর সামারি আপডেট কল করা হলো
        await updateTermSummaryMeals(mongoose.connection.db, memberCollectionName);
        // মিল সেভ করার পর কুক বিল ক্যালকুলেশন রান করার জন্য এটি দিন
        await updateTermCookBills(mongoose.connection.db, memberCollectionName);
        await updateMemberExpensesAndBalances(mongoose.connection.db, memberCollectionName);
        await runSequentialCalculations(mongoose.connection.db, memberCollectionName);
        res.status(200).json({ message: "মিল সফলভাবে সেভ হয়েছে! ✅", collection: mealCollectionName });
        


    } catch (error) {
        console.error("Meal Save Error:", error);
        res.status(500).json({ message: "মিল সেভ করতে সমস্যা হয়েছে: " + error.message });
    }
});


// 6. নতুন মাসের সব কালেকশন জেনারেট করা
// আপনার server.js এর ৫৯০ নম্বর লাইনের আশেপাশে এটি বসান
app.post('/api/init-month', async (req, res) => {
    const { monthYear, startDate, endDate } = req.body;

    if (!monthYear || !startDate || !endDate) {
        return res.status(400).json({ message: "প্রয়োজনীয় তথ্য পাওয়া যায়নি!" });
    }

    try {
        const activeMonth = monthYear.toLowerCase().replace(/\s+/g, '_');
        
        // ডাইনামিক কালেকশন নামসমূহ
        const mealCol = `meal_sheets_${activeMonth}`;
        const memberCol = `members_${activeMonth}`;
        const reportCol = `reports_${activeMonth}`;
        const expenseCol = `expenses_${activeMonth}`;

        // এই ফাংশনটি কল করলেই মঙ্গোস ব্যাকেন্ডে কালেকশনগুলো রেজিস্টার করে ফেলবে
        getDynamicModel(mealCol, activeMonth, mealSchema);
        getDynamicModel(memberCol, activeMonth, memberSchema);
        getDynamicModel(reportCol, activeMonth);
        getDynamicModel(expenseCol, activeMonth);

        // মেটাডাটাতে সেভ করে রাখা যে এখন কোন মাস চলছে
        await mongoose.connection.db.collection('app_metadata').updateOne(
            { id: 'latest_month' },
            { 
                $set: { 
                    monthYear: activeMonth,
                    mealCollection: mealCol,
                    memberCollection: memberCol,
                    status: 'active' // এটি দিয়ে আমরা চেক করবো টেবিল রেডি কি না
                } 
            },
            { upsert: true }
        );

        res.status(201).json({ 
            message: `${monthYear}-এর জন্য মেম্বার কালেকশনসহ সব টেবিল তৈরি হয়েছে! ✅`
        });

    } catch (error) {
        console.error("Init Error:", error);
        res.status(500).json({ message: "টেবিল জেনারেট করতে সমস্যা হয়েছে।" });
    }
});


// term and metadata

// টার্ম একটিভ করার রুট (Active Term)
app.post('/api/active-term', async (req, res) => {
    const { userPhone, termStart } = req.body; 

    if (!userPhone || !termStart) {
        return res.status(400).json({ message: "ফোন নম্বর বা টার্ম ডেট পাওয়া যায়নি।" });
    }

    try {
        const manager = await mongoose.connection.db.collection('manager_accounts').findOne({ phone: userPhone });

        if (!manager) {
            return res.status(404).json({ message: "ম্যানেজার অ্যাকাউন্টটি ডাটাবেজে খুঁজে পাওয়া যায়নি।" });
        }

        const metadataCollection = mongoose.connection.db.collection('app_metadata');

        // চেক করুন এই টার্ম স্টার্ট বা ম্যানেজার ডাটাবেজে ইতিমধ্যে expired বা closed অবস্থায় আছে কিনা
        const existingTerm = await metadataCollection.findOne({ 
            managerPhone: userPhone, 
            termStart: manager.termStart,
            termStatus: { $in: ['expired', 'closed'] }
        });

        if (existingTerm) {
            return res.status(400).json({ message: "এই টার্মের মেয়াদ ইতিপূর্বে শেষ হয়ে গেছে! এটি আর একটিভ করা যাবে না।" });
        }

        const parts = termStart.split('-'); 
        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        const monthIndex = parseInt(parts[1]) - 1;
        const year = parts[2];
        const monthYear = `${monthNames[monthIndex].toLowerCase()}_${year}`; 

        // আগের লেটেস্ট গুলোর স্ট্যাটাস expired করা
        await metadataCollection.updateMany(
            { id: 'latest_month' },
            { 
                $unset: { id: "" }, 
                $set: { termStatus: 'expired' } 
            }
        );

        const newMetadata = {
            id: 'latest_month',
            monthYear: monthYear,
            managerPhone: userPhone,
            termStatus: 'active',
            termStart: manager.termStart, 
            termEnd: manager.termEnd,
            createdAt: new Date()
        };

        await metadataCollection.insertOne(newMetadata);

        const formatDbDate = (dateStr) => {
            if (!dateStr) return '';
            const p = dateStr.split('-');
            return `${p[0]} ${monthNames[parseInt(p[1]) - 1]} ${p[2]}`;
        };

        res.json({ 
            success: true, 
            message: `${formatDbDate(manager.termStart)} থেকে ${formatDbDate(manager.termEnd)} তারিখের টার্মটি সফলভাবে একটিভ হয়েছে! 🎉`,
            monthYear: monthYear 
        });
    } catch (error) {
        console.error("Activation Error:", error);
        res.status(500).json({ message: "টার্ম একটিভ করা যায়নি।" });
    }
});




// ৬. মেম্বার আপডেট (ডিপোজিট ও প্রোফাইল)

app.put('/api/members/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        // ১. 'latest_month' এর পরিবর্তে 'active' টার্ম খুঁজুন
        const meta = await mongoose.connection.db.collection('app_metadata').findOne({ termStatus: 'active' });
        if (!meta) return res.status(404).json({ message: "Active term not found" });

        // ২. সঠিক কালেকশন নেমিং কনভেনশন ব্যবহার করুন (members_start_end)
        const collectionName = `members_${meta.termStart}_${meta.termEnd}`;
        const memberCollection = mongoose.connection.db.collection(collectionName);

        let finalUpdate = {};

        // ৩. ডিপোজিট আপডেট লজিক (সঠিকভাবে $inc ব্যবহার করা হয়েছে)
        if (updateData.newDepositEntry) {
            finalUpdate = {
                // $set এর বদলে $inc ব্যবহার করুন যাতে আগের সাথে যোগ হয়
                $inc: { deposit: Number(updateData.newDepositEntry) },
                $push: {
                    depositHistory: {
                        _id: new mongoose.Types.ObjectId(),
                        amount: Number(updateData.newDepositEntry),
                        date: updateData.manualDate ? new Date(updateData.manualDate) : new Date()
                    }
                }
            };
        } 
        // ৪. সাধারণ আপডেট লজিক
        else {
            finalUpdate = {
                $set: {
                    name: updateData.name,
                    roomID: updateData.roomID,
                    semester: updateData.semester
                }
            };
        }

        const result = await memberCollection.findOneAndUpdate(
            { _id: new mongoose.Types.ObjectId(id) },
            finalUpdate,
            { returnDocument: 'after' }
        );

        // ৫. রেজাল্ট হ্যান্ডলিং
        if (!result) return res.status(404).json({ message: "Member not found in " + collectionName });
        res.json(result);

    } catch (error) {
        console.error("Update Error:", error);
        res.status(500).json({ message: "Update failed: " + error.message });
    }
});

// ৭. অন্যান্য রুট (ডিলিট, হিস্ট্রি, সামারি)


app.get('/api/total-deposit', async (req, res) => {
    try {
        const meta = await mongoose.connection.db.collection('app_metadata').findOne({ id: 'latest_month' });
        const DynamicMember = getDynamicModel(`members_${meta.monthYear}`, meta.monthYear, memberSchema);
        const result = await DynamicMember.aggregate([{ $group: { _id: null, total: { $sum: "$deposit" } } }]);
        res.json({ totalDeposit: result[0]?.total || 0 });
    } catch (e) { res.status(500).json({ totalDeposit: 0 }); }
});
//

app.get('/api/member-meal-summary/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // ১. app_metadata থেকে চেক করা কার termStatus active আছে
        const activeTerm = await mongoose.connection.db.collection('app_metadata').findOne({ termStatus: 'active' });
        
        if (!activeTerm) {
            return res.status(400).json({ message: "No active term found!" });
        }

        // ২. টার্মের স্টার্ট এবং এন্ড ডেট দিয়ে আগে থেকেই তৈরি থাকা কালেকশনের নামটি তৈরি করা (যেমন: members_15-07-2026_15-08-2026)
        const memberColName = `members_${activeTerm.termStart}_${activeTerm.termEnd}`;
        
        // ৩. আগে থেকেই থাকা সেই কালেকশন থেকে মেম্বারকে খোঁজা
        const MemberCollection = mongoose.connection.db.collection(memberColName);
        
        let queryId = id;
        if (mongoose.Types.ObjectId.isValid(id)) {
            queryId = new mongoose.Types.ObjectId(id);
        }

        const memberData = await MemberCollection.findOne({ _id: queryId });

        if (!memberData) {
            return res.json({
                main: 0,
                guest: 0,
                fine: 0,
                total: 0
            });
        }

        // ৪. ওই কালেকশনের ডকুমেন্ট থেকে ফিল্ডগুলোর ডেটা ফ্রন্টএন্ডে পাঠানো
        res.json({
            main: memberData.totalMainMeal || 0,
            guest: memberData.totalGuestMeal || 0,
            fine: memberData.totalFineMeal || 0,
            total: memberData.totalMainGuestFine || 0
        });

    } catch (error) {
        console.error("Meal Summary Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// টার্মের বর্তমান অবস্থা চেক করার রুট
// server.js - টার্ম স্ট্যাটাস চেক করার নতুন লজিক
// server.js - এই এপিআই-টি আপডেট করুন
app.get('/api/active-term-status', async (req, res) => {
    const { phone } = req.query;
    try {
        if (!phone) {
            return res.status(400).json({ message: "Phone number is required" });
        }

        const manager = await mongoose.connection.db.collection('manager_accounts').findOne({ phone });
        if (!manager) return res.status(404).json({ message: "Manager not found" });

        const metadataCollection = mongoose.connection.db.collection('app_metadata');
        const metadata = await metadataCollection.findOne({ id: 'latest_month' });

        const parseDate = (str) => {
            if (!str) return new Date();
            const [d, m, y] = str.split('-');
            return new Date(y, parseInt(m) - 1, parseInt(d));
        };

        const startDate = parseDate(manager.termStart);
        const endDate = parseDate(manager.termEnd);
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        let buttonStatus = "";

        // ১. টার্ম যদি এখনও শুরু না হয়
        if (now < startDate) {
            buttonStatus = "not_started";
        } 
        // ২. টার্ম যদি শেষ হয়ে যায়
        else if (now > endDate) {
            buttonStatus = "expired";
            
            if (metadata && metadata.termStatus === 'active' && metadata.managerPhone === phone) {
                await metadataCollection.updateOne(
                    { id: 'latest_month' },
                    { $set: { termStatus: 'expired' } }
                );
            }
        } 
        // ৩. টার্মের সময়ের ভেতরে থাকলে
        else {
            if (metadata && metadata.termStatus === 'active' && metadata.managerPhone === phone) {
                buttonStatus = "already_active";
            } else {
                buttonStatus = "allow_activation";
            }
        }

        res.json({
            buttonStatus,
            termStart: manager.termStart,
            termEnd: manager.termEnd
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// 

// ড্যাশবোর্ডের সামারি ক্যালকুলেশন রুট
// ড্যাশবোর্ডের সামারি ক্যালকুলেশন রুট (সংশোধিত)
app.get('/api/dashboard/stats', async (req, res) => {
    try {
        const meta = await mongoose.connection.db.collection('app_metadata').findOne({ id: 'latest_month' });
        if (!meta) return res.status(404).json({ message: "মাস পাওয়া যায়নি" });

        const collectionName = `members_${meta.termStart}_${meta.termEnd}`;
        const DynamicMember = getDynamicModel(collectionName, null, memberSchema);

        // এগ্রিগেশন দিয়ে মেম্বারদের ডাটা সামারি করা (term_summary বাদ দিয়ে)
        const stats = await DynamicMember.aggregate([
            { $match: { type: { $ne: "term_summary" } } }, // term_summary বাদ দেওয়া হলো
            {
                $group: {
                    _id: null,
                    totalCollection: { $sum: "$deposit" },
                    totalMeals: { $sum: "$totalMainGuest" } // $meals এর বদলে সঠিক ফিল্ড দেওয়া হলো
                }
            }
        ]);

        const result = stats.length > 0 ? stats[0] : { totalCollection: 0, totalMeals: 0 };
        res.json(result);
    } catch (error) {
        console.error("Stats Error:", error);
        res.status(500).json({ message: "ডেটা লোড করা যায়নি" });
    }
});

// --- বাজার মেয়াদের তারিখ ও স্ট্যাটাস চেক করার ফাইনাল API ---
app.get('/api/bazar-term', async (req, res) => {
    try {
        // ১. প্রথমে app_metadata কালেকশন থেকে কারেন্ট মাসের ডকুমেন্ট তুলবো
        const meta = await mongoose.connection.db.collection('app_metadata').findOne({ id: 'latest_month' });
        
        // যদি মেটাডাটা না থাকে বা স্ট্যাটাস active না হয়
        if (!meta || meta.termStatus !== 'active') {
            console.log("Active metadata not found or term is inactive.");
            return res.json({ isZero: true, message: "No active term found." });
        }

        // ২. সরাসরি মেটাডাটা (app_metadata) এর ভেতর থেকে তারিখ দুটি নিব
        let startDate = meta.termStart;
        let endDate = meta.termEnd;

        // ৩. তারিখ দুটির কোনো একটি যদি মেটাডাটায় মিস থাকে, তখন ব্যাকআপ হিসেবে সরাসরি manager_accounts কালেকশন থেকে খুঁজবো
        if (!startDate || !endDate) {
            console.log("Dates missing in metadata, checking backup manager accounts...");
            
            // মডেল বাদ দিয়ে সরাসরি কালেকশন থেকে কুয়েরি
            const manager = await mongoose.connection.db.collection('manager_accounts').findOne({ phone: meta.managerPhone });
            
            if (!manager || !manager.termStart || !manager.termEnd) {
                console.log("Active dates not found in manager account either.");
                return res.json({ isZero: true, message: "Active dates not found anywhere." });
            }
            
            startDate = manager.termStart;
            endDate = manager.termEnd;
        }

        // ৪. সফলভাবে ফ্রন্টএন্ডে সঠিক তারিখ ও ফরম্যাট পাঠিয়ে দেওয়া হচ্ছে
        console.log(`Success! Date found: ${startDate} to ${endDate}`);
        return res.json({
            isZero: false,
            termStart: startDate,
            termEnd: endDate,
            activeMonth: meta.monthYear
        });

    } catch (error) {
        console.error("Error fetching bazar term based on active metadata:", error);
        res.status(500).json({ isZero: true, message: "Internal server error" });
    }
});

// --- ম্যানেজার ডিটেইলস ভ্যালিডেশন এবং ইনফো গেট করার API ---
app.get('/api/active-manager-details', async (req, res) => {
    try {
        const meta = await mongoose.connection.db.collection('app_metadata').findOne({ termStatus: 'active' });
        if (!meta || !meta.managerPhone || !meta.termStart || !meta.termEnd) {
            return res.status(404).json({ success: false, message: "কোনো অ্যাক্টিভ টার্ম বা ম্যানেজার পাওয়া যায়নি!" });
        }

        // manager_accounts কালেকশন থেকে চেক করা যে termStart, termEnd ও phone হুবহু মিলে কি না
        const manager = await mongoose.connection.db.collection('manager_accounts').findOne({
            phone: meta.managerPhone,
            termStart: meta.termStart,
            termEnd: meta.termEnd,
            status: 'active'
        });

        if (!manager) {
            return res.status(404).json({ success: false, message: "ম্যানেজার তথ্য মিলেনি বা স্ট্যাটাস অ্যাক্টিভ নয়।" });
        }

        res.status(200).json({
            success: true,
            name: manager.name,
            termStart: manager.termStart,
            termEnd: manager.termEnd
        });
    } catch (error) {
        console.error("Manager Details Error:", error);
        res.status(500).json({ success: false, message: "সার্ভার এরর!" });
    }
});

// ২. মেম্বারের ডিপোজিট হিস্ট্রি থেকে নির্দিষ্ট এন্ট্রি ডিলিট করার রুট
// ২. মেম্বারের ডিপোজিট হিস্ট্রি থেকে নির্দিষ্ট এন্ট্রি ডিলিট করার রুট (ডাইনামিক ভার্সন)
app.delete('/api/members/:memberId/deposit/:historyId', async (req, res) => {
    try {
        const { memberId, historyId } = req.params;
        const meta = await mongoose.connection.db.collection('app_metadata').findOne({ termStatus: 'active' });
        const collectionName = `members_${meta.termStart}_${meta.termEnd}`;
        const DynamicMember = getDynamicModel(collectionName, null, memberSchema);

        // ১. আগে রেকর্ডটি খুঁজে এমাউন্ট বের করুন
        const member = await DynamicMember.findById(memberId);
        const entry = member.depositHistory.id(historyId);
        if (!entry) return res.status(404).json({ message: "Record not found" });
        const amountToSub = entry.amount;

        // ২. $pull দিয়ে রিমুভ এবং $inc দিয়ে ব্যালেন্স আপডেট করুন
        await DynamicMember.findByIdAndUpdate(memberId, {
            $pull: { depositHistory: { _id: new mongoose.Types.ObjectId(historyId) } },
            $inc: { deposit: -amountToSub }
        });

        res.status(200).json({ message: "ডিপোজিট এন্ট্রি ডিলিট এবং ব্যালেন্স আপডেট হয়েছে! ✅" });
    } catch (error) {
        res.status(500).json({ message: "ডিলিট করতে সমস্যা হয়েছে।" });
    }
});


// সব মেম্বার এবং মিল ডিলিট করার রুট
// সব মেম্বার এবং মিল ডিলিট করার রুট (সংশোধিত)
// সব মেম্বার এবং মিল ডিলিট করার রুট (সংশোধিত)
app.delete('/api/members/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // মেটাডাটা থেকে অ্যাক্টিভ কালেকশন নাম নিশ্চিত করা
        const meta = await mongoose.connection.db.collection('app_metadata').findOne({ termStatus: 'active' });
        if (!meta) return res.status(400).json({ message: "অ্যাক্টিভ টার্ম খুঁজে পাওয়া যায়নি।" });

        const memberCollectionName = `members_${meta.termStart}_${meta.termEnd}`;
        const mealCollectionName = `meals_${meta.termStart}_${meta.termEnd}`;

        const DynamicMember = getDynamicModel(memberCollectionName, null, memberSchema);
        const DynamicMealRecord = getDynamicModel(mealCollectionName, null, mealSchema);

        // ১. মেম্বার কালেকশন থেকে মেম্বার ডিলিট করা
        const result = await DynamicMember.findByIdAndDelete(id);
        if (!result) return res.status(404).json({ message: "মেম্বার পাওয়া যায়নি।" });

        // ২. ডাইনামিক মিল কালেকশন থেকে ওই মেম্বারের সমস্ত মিল রেকর্ড ডিলিট করা (Cascade Delete)
        await DynamicMealRecord.deleteMany({ memberId: new mongoose.Types.ObjectId(id) });

        // ৩. 🌟 নতুন সংযোজন: মেম্বার ডিলিট হওয়ার পর টার্ম সামারির `allmemTotalMainGuest` রিক্যালকুলেট ও আপডেট করা
        await updateTermSummaryMeals(mongoose.connection.db, memberCollectionName);

        res.status(200).json({ message: "মেম্বার, তার মিল এবং টার্ম সামারি সফলভাবে আপডেট করা হয়েছে! ✅" });
    } catch (error) {
        console.error("Delete Error:", error);
        res.status(500).json({ message: "ডিলিট করতে সমস্যা হয়েছে: " + error.message });
    }
});



// ==========================================
// 📘 ডায়েরি বাজার খরচ ডাইনামিক স্কিমা (Diary Expense Schema)
// ==========================================
const diaryExpenseSchema = new mongoose.Schema({
    date: { type: String, required: true }, // YYYY-MM-DD ফরম্যাট
    totalCost: { type: Number, required: true },
    cashCost: { type: Number, default: 0 }, 
    dueCost: { type: Number, default: 0 },
    dueCategory: { type: String, default: "" },
    shopperName: { type: String, required: true },
    bazarDescription: { type: String, default: "" },
    receipts: [{ type: String }] // বেস৬৪ ইমেজ অ্যারে
}, { versionKey: false, timestamps: true });

// ==========================================
// ❌ বাজার খরচ সেভ/আপডেট করার রুট (POST) - সংশোধিত
// ==========================================
// ❌ বাজার খরচ সেভ/আপডেট করার রুট (POST) - সংশোধিত
app.post('/api/diary/save', async (req, res) => {
    try {
        // 🌟 এখানে cashCost এবং dueCost যুক্ত করা হলো
        const { date, totalCost, cashCost, dueCost, dueCategory, shopperName, bazarDescription, receipts } = req.body;

        if (!date) {
            return res.status(400).json({ success: false, message: "Date is required!" });
        }

        const meta = await mongoose.connection.db.collection('app_metadata').findOne({ id: 'latest_month' });
        if (!meta || !meta.termStart || !meta.termEnd) {
            return res.status(400).json({ success: false, message: "Term not active!" });
        }

        const db = mongoose.connection.db;
        const expenseCollectionName = `expenses_${meta.termStart}_${meta.termEnd}`;
        const memberCollectionName = `members_${meta.termStart}_${meta.termEnd}`;

        const ExpenseModel = getDynamicModel(expenseCollectionName, null, diaryExpenseSchema);

        await ExpenseModel.findOneAndUpdate(
            { date: date },
            { 
                $set: { 
                    totalCost: Number(totalCost) || 0,
                    cashCost: Number(cashCost) || 0,   
                    dueCost: Number(dueCost) || 0,     
                    dueCategory: dueCategory || "",
                    shopperName: shopperName || "",
                    bazarDescription: bazarDescription || "",
                    receipts: receipts || []
                } 
            },
            { upsert: true, new: true }
        );

        const allExpenses = await ExpenseModel.find({});
        let calculatedTotalExpenses = 0;
        allExpenses.forEach(item => {
            calculatedTotalExpenses += Number(item.totalCost || 0);
        });

        await db.collection(memberCollectionName).updateOne(
            { type: "term_summary" },
            { $set: { totalTermExpenses: calculatedTotalExpenses } },
            { upsert: true }
        );

        await runSequentialCalculations(db, memberCollectionName);

        return res.status(200).json({
            success: true,
            message: "Expense saved and term summary updated successfully!",
            totalTermExpenses: calculatedTotalExpenses
        });

    } catch (error) {
        console.error("Diary Save Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

// কুক বিল সেভ বা আপডেট করার রুট
// কুক বিল সেভ বা আপডেট করার রুট
app.post('/api/term/set-cook-bill', async (req, res) => {
    try {
        const { cookBill } = req.body;

        // ১. একটিভ টার্ম চেক করা
        const meta = await mongoose.connection.db.collection('app_metadata').findOne({ termStatus: 'active' });
        if (!meta || !meta.termStart || !meta.termEnd) {
            return res.status(400).json({ success: false, message: "কোনো অ্যাক্টিভ টার্ম পাওয়া যায়নি!" });
        }

        const collectionName = `members_${meta.termStart}_${meta.termEnd}`;
        const db = mongoose.connection.db;

        // ২. term_summary ডকুমেন্টে termCookBill আপডেট করা
        await db.collection(collectionName).updateOne(
            { type: "term_summary" },
            { $set: { termCookBill: Number(cookBill) || 0 } },
            { upsert: true }
        );

       // সিকোয়েন্স অনুযায়ী কুক বিল ও অন্যান্য খরচ আপডেট করা
await runSequentialCalculations(db, collectionName);
        

        res.status(200).json({
            success: true,
            message: "কুক বিল সফলভাবে সেভ এবং মেম্বারদের মাঝে হিসাব করা হয়েছে! ✅",
            termCookBill: Number(cookBill) || 0
        });

    } catch (error) {
        console.error("Set Cook Bill Error:", error);
        res.status(500).json({ success: false, message: "কুক বিল সেভ করা সম্ভব হয়নি।" });
    }
});

// // app_metadata theke active term niye member_accounts ebong members_termStart_termEnd sync korar API
// app.post('/api/sync-member-accounts-finances', async (req, res) => {
//     try {
//         const db = mongoose.connection.db;

//         // ১. app_metadata theke dekha kar termStatus active ache
//         const activeMeta = await db.collection('app_metadata').findOne({ termStatus: 'active' });
        
//         if (!activeMeta || !activeMeta.termStart || !activeMeta.termEnd) {
//             return res.status(400).json({ success: false, message: "Kono active term pawa jayni!" });
//         }

//         const termStart = activeMeta.termStart;
//         const termEnd = activeMeta.termEnd;
//         const memberTermCollectionName = `members_${termStart}_${termEnd}`;

//         // ২. members_termStart_termEnd collection theke shob member er data ana (term_summary bade)
//         const termMembers = await db.collection(memberTermCollectionName).find({ type: { $ne: "term_summary" } }).toArray();

//         if (!termMembers || termMembers.length === 0) {
//             return res.status(404).json({ success: false, message: "Term member collection e kono member nei!" });
//         }

//         const bulkOps = [];

//         // ৩. Protita member er jonno loop chaliye member_accounts er sathe match kora
//         for (const tMember of termMembers) {
//             const targetRoomID = String(tMember.roomID || "").trim();
//             const targetName = String(tMember.name || "").trim();
//             const targetSemester = String(tMember.semester || "").trim();

//             // member_accounts collection theke match khunja (roomNo, nickname/name, semester diye)
//             // Note: Tomar schema onujayi member_accounts e roomNo, nickname/name ebong semester thake
//             const matchedAccount = await db.collection('member_accounts').findOne({
//                 roomNo: targetRoomID,
//                 semester: { $regex: new RegExp(`^${targetSemester}$`, "i") },
//                 $or: [
//                     { name: { $regex: new RegExp(`^${targetName}$`, "i") } },
//                     { nickname: { $regex: new RegExp(`^${targetName}$`, "i") } }
//                 ]
//             });

//             // Jodi match hoy ebong tar status active thake
//             if (matchedAccount && matchedAccount.status === 'active') {
//                 bulkOps.push({
//                     updateOne: {
//                         filter: { _id: matchedAccount._id },
//                         update: {
//                             $set: {
//                                 yourTotalExpenses: Number(tMember.yourExpenses || 0),
//                                 yourTotalMeal: Number(tMember.totalMainGuestFine || 0),
//                                 yourTotalDeposit: Number(tMember.deposit || 0),
//                                 yourRefundableAmount: Number(tMember.refundable || 0),
//                                 yourDue: Number(tMember.due || 0),
//                                 yourCookBill: Number(tMember.totalCookBill || 0),
//                                 yourMealFines: Number(tMember.totalFineMeal || 0)
//                             }
//                         }
//                     }
//                 });
//             }
//         }

//         // ৪. Bulk write er মাধ্যমে `member_accounts` update kora
//         if (bulkOps.length > 0) {
//             await db.collection('member_accounts').bulkWrite(bulkOps);
//         }

//         return res.status(200).json({
//             success: true,
//             message: `Member accounts successfully synced with ${memberTermCollectionName}! ✅`,
//             updatedCount: bulkOps.length
//         });

//     } catch (error) {
//         console.error("Sync Error:", error);
//         return res.status(500).json({ success: false, message: error.message });
//     }
// });

// ==========================================
// 📌 বাকি পরিশোধ এবং রান্নার বিল পরিশোধ সেভ করার API
// ==========================================

// ১. বাকি পরিশোধ সেভ করার রুট
app.post('/api/expenses/save-due-payment', async (req, res) => {
    try {
        const { category, date, amount, description } = req.body;

        // ১. active টার্ম চেক করা app_metadata থেকে
        const meta = await mongoose.connection.db.collection('app_metadata').findOne({ termStatus: 'active' });
        
        if (!meta || !meta.termStart || !meta.termEnd) {
            return res.status(400).json({ success: false, message: "আগে টার্ম অ্যাক্টিভ করুন!" });
        }

        // ২. কালেকশন নাম তৈরি: expenses_termStart_termEnd
        const expenseCollectionName = `expenses_${meta.termStart}_${meta.termEnd}`;
        const db = mongoose.connection.db;

        // ৩. নতুন ডকুমেন্ট তৈরি (type: "due_payment" দিয়ে আলাদা করা হয়েছে)
        const paymentRecord = {
            type: "due_payment",
            category: category || "Due Payment",
            date: date || new Date().toISOString().split('T')[0],
            amount: Number(amount) || 0,
            description: description || "",
            createdAt: new Date()
        };

        // ৪. ডাটাবেসে সেভ করা
        await db.collection(expenseCollectionName).insertOne(paymentRecord);

        res.status(200).json({
            success: true,
            message: "বাকি পরিশোধ সফলভাবে সেভ হয়েছে! ✅",
            data: paymentRecord
        });

    } catch (error) {
        console.error("Due Payment Save Error:", error);
        res.status(500).json({ success: false, message: "বাকি পরিশোধ সেভ করা সম্ভব হয়নি: " + error.message });
    }
});


// ২. রান্নার বিল পরিশোধ সেভ করার রুট
app.post('/api/expenses/save-cook-payment', async (req, res) => {
    try {
        const { date, amount, description } = req.body;

        // ১. active টার্ম চেক করা app_metadata থেকে
        const meta = await mongoose.connection.db.collection('app_metadata').findOne({ termStatus: 'active' });
        
        if (!meta || !meta.termStart || !meta.termEnd) {
            return res.status(400).json({ success: false, message: "আগে টার্ম অ্যাক্টিভ করুন!" });
        }

        // ২. কালেকশন নাম তৈরি: expenses_termStart_termEnd
        const expenseCollectionName = `expenses_${meta.termStart}_${meta.termEnd}`;
        const db = mongoose.connection.db;

        // ৩. নতুন ডকুমেন্ট তৈরি (type: "cook_bill_payment" দিয়ে আলাদা করা হয়েছে)
        const cookPaymentRecord = {
            type: "cook_bill_payment",
            date: date || new Date().toISOString().split('T')[0],
            amount: Number(amount) || 0,
            description: description || "",
            createdAt: new Date()
        };

        // ৪. ডাটাবেসে সেভ করা
        await db.collection(expenseCollectionName).insertOne(cookPaymentRecord);

        res.status(200).json({
            success: true,
            message: "রান্নার বিল পরিশোধ সফলভাবে সেভ হয়েছে! ✅",
            data: cookPaymentRecord
        });

    } catch (error) {
        console.error("Cook Payment Save Error:", error);
        res.status(500).json({ success: false, message: "রান্নার বিল পরিশোধ সেভ করা সম্ভব হয়নি: " + error.message });
    }
});


// app.post('/api/members/sync-term-data', async (req, res) => {
//     console.log("🔥 /api/members/sync-term-data route hit successfully!"); // এটি যোগ করো
//     try {
//         const db = mongoose.connection.db;

//         // ১. app_metadata থেকে active টার্ম বের করা
//         const activeMeta = await db.collection('app_metadata').findOne({ termStatus: "active" });
//         if (!activeMeta || !activeMeta.termStart || !activeMeta.termEnd) {
//             return res.status(404).json({ success: false, message: "Active term metadata not found!" });
//         }

//         const termCollectionName = `members_${activeMeta.termStart}_${activeMeta.termEnd}`;
//         const termCollection = db.collection(termCollectionName);
//         const memberAccountsCollection = db.collection('member_accounts');

//         // ২. member_accounts থেকে শুধু active স্ট্যাটাসের মেম্বারদের আনা
//         const activeMembers = await memberAccountsCollection.find({ status: "active" }).toArray();

//         if (activeMembers.length === 0) {
//             return res.status(200).json({ success: true, message: "No active members found to sync." });
//         }

//         let updateCount = 0;

//         // ৩. প্রতিটি active সদস্যের জন্য টার্ম কালেকশন থেকে ডাটা ম্যাচ করে আপডেট করা
//         for (const member of activeMembers) {
//             // pic 1 এর nickname, semester, roomNo এর সাথে pic 2 এর name, semester, roomID মেলানো
//             // (এখানে ধরে নেওয়া হচ্ছে pic 1 এর nickname হলো term কালেকশনের name এবং roomNo হলো roomID)
//             const matchedTermData = await termCollection.findOne({
//                 roomID: member.roomNo,
//                 semester: member.semester,
//                 $or: [
//                     { name: { $regex: new RegExp(`^${member.name}$`, "i") } },
//                     { name: { $regex: new RegExp(`^${member.nickname}$`, "i") } }
//                 ]
//             });

//             if (matchedTermData) {
//                 // ৪. টার্ম কালেকশনের ডেটা member_accounts এর নির্দিষ্ট ফিল্ডগুলোতে ম্যাপ করে আপডেট করা
//                 await memberAccountsCollection.updateOne(
//                     { _id: member._id },
//                     {
//                         $set: {
//                             yourTotalExpenses: matchedTermData.yourExpenses || 0,
//                             yourTotalMeal: matchedTermData.totalMainGuest || 0, // অথবা আপনার লজিক অনুযায়ী totalMainGuest
//                             yourTotalDeposit: matchedTermData.deposit || 0,
//                             yourRefundableAmount: matchedTermData.refundable || 0,
//                             yourDue: matchedTermData.due || 0,
//                             yourCookBill: matchedTermData.totalCookBill || 0,
//                             yourMealFines: matchedTermData.totalFineMeal || 0
//                         }
//                     }
//                 );
//                 updateCount++;
//             }
//         }

//         res.status(200).json({
//             success: true,
//             message: `Successfully synced data for ${updateCount} active members.`,
//             termCollection: termCollectionName
//         });

//     } catch (error) {
//         console.error("Sync Term Data Error:", error);
//         res.status(500).json({ success: false, message: "Internal server error during sync." });
//     }
// });

// নির্দিষ্ট মেম্বারের ডাটা term-specific কালেকশন থেকে member_accounts এ নিয়ে যাওয়ার রুট
// নির্দিষ্ট মেম্বারের ডাটা term-specific কালেকশন থেকে member_accounts এ নিয়ে যাওয়ার রুট
// নির্দিষ্ট মেম্বারের ডাটা term-specific কালেকশন থেকে member_accounts এ নিয়ে যাওয়ার রুট
app.post('/api/sync-member-to-accounts', async (req, res) => {
    try {
        const { memberID, phone, termStart, termEnd } = req.body;

        // ১. টার্মের তথ্য ও মেম্বার আইডি যাচাই করা
        if (!termStart || !termEnd || (!memberID && !phone)) {
            return res.status(400).json({ 
                success: false, 
                message: "টার্মের তথ্য এবং মেম্বারের পরিচয় (ID অথবা Phone) প্রয়োজন!" 
            });
        }

        // ২. ডাইনামিক টার্ম কালেকশন থেকে মেম্বার এবং টার্ম সামারি (mealRate এর জন্য) খোঁজা
        const memberCollectionName = `members_${termStart}_${termEnd}`;
        const DynamicMember = getDynamicModel(memberCollectionName, null, memberSchema);

        const termSummary = await mongoose.connection.db.collection(memberCollectionName).findOne({ type: "term_summary" });
        const mealRate = termSummary ? Number(termSummary.mealRate) || 0 : 0;

        // memberID অথবা phone দিয়ে কুয়েরি করা যেতে পারে
        const query = memberID ? { memberID } : { phone };
        const termMemberData = await DynamicMember.findOne(query);

        if (!termMemberData) {
            return res.status(404).json({ 
                success: false, 
                message: "টার্ম কালেকশনে নির্দিষ্ট মেম্বারটি পাওয়া যায়নি!" 
            });
        }

        // 🌟 ফাইন মিলের মোট টাকার হিসাব বের করা (totalFineMeal * mealRate)
        const totalFineMeal = Number(termMemberData.totalFineMeal) || 0;
        const mealFinesAmount = totalFineMeal * mealRate;

        // ৩. member_accounts কালেকশনে ডাটা আপডেট বা ইনসার্ট (Upsert) করা
        const memberAccountQuery = memberID ? { memberID } : { phone };
        
        const updatedMemberAccount = await mongoose.connection.db.collection('member_accounts').findOneAndUpdate(
            memberAccountQuery,
            { 
                $set: {
                    name: termMemberData.name,
                    email: termMemberData.email,
                    phone: termMemberData.phone,
                    roomNo: termMemberData.roomID || termMemberData.roomNo || "N/A",
                    semester: termMemberData.semester || "N/A",
                    memberID: termMemberData.memberID,
                    status: termMemberData.status || "active",
                    yourMealFines: Number(mealFinesAmount.toFixed(2)), // 👈 এখানে সরাসরি টাকার অ্যামাউন্ট সেট করে দেওয়া হলো
                    updatedAt: new Date()
                } 
            },
            { upsert: true, returnDocument: 'after' }
        );

        res.status(200).json({
            success: true,
            message: "মেম্বারের ডাটা সফলভাবে member_accounts এ সিঙ্ক করা হয়েছে!",
            data: updatedMemberAccount.value || updatedMemberAccount
        });

    } catch (error) {
        console.error("Sync Error:", error);
        res.status(500).json({ 
            success: false, 
            message: "সার্ভার এরর: " + error.message 
        });
    }
});

// ==========================================
// ❌ পেজ লোডের সময় পুরো মেয়াদের ডাটা আনার রুট (GET)
// ==========================================
// ==========================================
// ⚡ অপ্টিমাইজড: পেজ লোডের সময় শুধু টেক্সট ও অ্যামাউন্ট আসবে (ছবি ছাড়া)
// ==========================================
// কমন ফাংশন: যা টার্ম ডেট থেকে কালেকশন নাম তৈরি করবে
const getCollectionNameFromTerm = (start, end) => {
    // ফরম্যাট হবে: expenses_15july2026_15august2026
    const formatTermDate = (dateStr) => {
        const [d, m, y] = dateStr.split('-');
        const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
        return `${d}${monthNames[parseInt(m)-1]}${y}`;
    };
    return `expenses_${formatTermDate(start)}_${formatTermDate(end)}`;
};

// ১. পেজ লোডের সময় পুরো মেয়াদের ডাটা আনার রুট (GET)
app.get('/api/diary/fetch-term-data', async (req, res) => {
    try {
        const meta = await mongoose.connection.db.collection('app_metadata').findOne({ termStatus: 'active' });
        if (!meta) return res.json({});

        const collectionName = `expenses_${meta.termStart}_${meta.termEnd}`; 
        
        // রান্নার বিল এবং ডিউ পেমেন্ট দুটোই ফিল্টার করে বাদ দেওয়া
        const entries = await mongoose.connection.db.collection(collectionName).find({
            type: { $nin: ["cook_bill_payment", "due_payment"] } 
        }).toArray();

        let expensesObj = {};
        entries.forEach(item => {
            if (item.date) {
                const formattedDateKey = item.date.split('T')[0];
                expensesObj[formattedDateKey] = item;
            }
        });

        res.json(expensesObj);
    } catch (error) {
        console.error("Fetch Term Data Error:", error);
        res.status(500).json({});
    }
});
// ২. নির্দিষ্ট দিনের ছবি/রসিদ নিয়ে আসার API
app.get('/api/diary/fetch-receipts', async (req, res) => {
    try {
        const { date } = req.query; 
        if (!date) return res.status(400).json({ message: "Date is required" });

        // মেটাডাটা থেকে বর্তমান 'active' টার্মটি খুঁজে বের করা
        const meta = await mongoose.connection.db.collection('app_metadata').findOne({ termStatus: 'active' });
        
        if (!meta) return res.status(404).json({ message: "No active term found" });

        const collectionName = getCollectionNameFromTerm(meta.termStart, meta.termEnd);
        const collection = mongoose.connection.db.collection(collectionName);

        // নির্দিষ্ট তারিখের রসিদ খুঁজে বের করা
        const expense = await collection.findOne({ date: date }, { projection: { receipts: 1 } });
        
        res.json({ receipts: expense?.receipts || [] });
    } catch (error) {
        console.error("Error fetching receipts:", error);
        res.status(500).json({ message: "Server error" });
    }
});

app.get('/api/members/term-summary', async (req, res) => {
    try {
        const meta = await mongoose.connection.db.collection('app_metadata').findOne({ id: 'latest_month' });
        if (!meta) return res.json({});

        const collectionName = `members_${meta.termStart}_${meta.termEnd}`;
        const db = mongoose.connection.db;
        
        // ডেটাবেজ থেকে type: "term_summary" ডকুমেন্টটি আনা হলো
        const summaryDoc = await db.collection(collectionName).findOne({ type: "term_summary" });

        if (!summaryDoc) return res.json({});

        const totalExpense = Number(summaryDoc.totalTermExpenses) || 0;
        const totalMeal = Number(summaryDoc.allmemTotalMainGuest) || 0;
        
        let calculatedMealRate = summaryDoc.mealRate;
        
        // যদি mealRate ডেটাবেজে না থাকে বা আপডেট করার প্রয়োজন পড়ে এবং মোট মিল ০ এর বেশি হয়
        if (totalMeal > 0) {
            calculatedMealRate = totalExpense / totalMeal;

            // **এখানেই হিসাব করা মানটি ডেটাবেজে আপডেট করে সেভ করে দেওয়া হচ্ছে**
            await db.collection(collectionName).updateOne(
                { type: "term_summary" },
                { $set: { mealRate: calculatedMealRate } }
            );
        }

        // ফ্রন্টএন্ডে সব পাঠিয়ে দেওয়া
        res.json({
            mealRate: calculatedMealRate || 0,
            totalTermExpenses: totalExpense,
            allmemTotalMainGuest: totalMeal
        });

    } catch (error) {
        console.error("Error fetching term summary:", error);
        res.status(500).json({});
    }
});


// মেম্বারের ড্যাশবোর্ড সামারি ডেটা ফেচ করার রুট 2222
app.get('/api/member/dashboard-summary', async (req, res) => {
    try {
        const { phone } = req.query;
        if (!phone) {
            return res.status(400).json({ message: "ফোন নম্বর প্রয়োজন!" });
        }

        const memberData = await mongoose.connection.db.collection('member_accounts').findOne({ phone: phone });

        if (!memberData) {
            return res.status(404).json({ message: "মেম্বারের কোনো ডেটা পাওয়া যায়নি!" });
        }

        res.status(200).json({
            yourTotalExpenses: memberData.yourTotalExpenses || 0,
            yourTotalMeal: memberData.yourTotalMeal || 0,
            yourTotalDeposit: memberData.yourTotalDeposit || 0,
            yourRefundableAmount: memberData.yourRefundableAmount || 0,
            yourDue: memberData.yourDue || 0,
            yourCookBill: memberData.yourCookBill || 0,
            yourMealFines: memberData.yourMealFines || 0
        });

    } catch (error) {
        console.error("Dashboard Summary Error:", error);
        res.status(500).json({ message: "সার্ভার এরর!" });
    }
});

app.get('/api/dashboard-data', async (req, res) => {
    try {
        // Shob member gulo get korar jonno
        const members = await DynamicMember.find({});

        // Term summary (mealRate o termCookBill) get korar jonno
        const termSummary = await db.collection(collectionName).findOne({ type: "term_summary" });

        res.status(200).json({
            success: true,
            members,
            termSummary: termSummary || { mealRate: 0, termCookBill: 0 }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// নির্দিষ্ট তারিখের সকল মেম্বারের মোট লাঞ্চ ও ডিনার হিসাব করার এপিআই
app.get('/api/dashboard/meal-chart-data', async (req, res) => {
    try {
        const meta = await mongoose.connection.db.collection('app_metadata').findOne({ termStatus: 'active' });
        
        if (!meta || !meta.termStart || !meta.termEnd) {
            return res.status(400).json({ success: false, message: "Active term not found!" });
        }

        const mealCollectionName = `meals_${meta.termStart}_${meta.termEnd}`;
        const DynamicMealRecord = getDynamicModel(mealCollectionName, null, mealSchema);

        // টার্মের শুরু এবং শেষের তারিখ কনভার்ட் করা (DD-MM-YYYY থেকে Date অবজেক্টে)
        const [startDay, startMonth, startYear] = meta.termStart.split('-').map(Number);
        const termStartDate = new Date(startYear, startMonth - 1, startDay);

        // গত ৭ দিনের তারিখ জেনারেট করা, তবে তা কোনোভাবেই termStart-এর আগের হবে না
        const last7DaysDates = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            
            // যদি জেনারেট করা তারিখটি termStart-এর আগের হয়, তবে সেটি স্কিপ করব
            if (d < termStartDate) {
                continue;
            }

            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            last7DaysDates.push(`${year}-${month}-${day}`);
        }

        // ডাটাবেস থেকে ওই তারিখগুলোর মিল রেকর্ড এগ্রিগেট করা
        const aggregatedData = await DynamicMealRecord.aggregate([
            {
                $match: { date: { $in: last7DaysDates } }
            },
            {
                $group: {
                    _id: "$date",
                    totalDayMeals: { 
                        $sum: { 
                            $add: [
                                { $ifNull: ["$mainLunch", 0] }, 
                                { $ifNull: ["$guestLunch", 0] }
                            ] 
                        } 
                    },
                    totalNightMeals: { 
                        $sum: { 
                            $add: [
                                { $ifNull: ["$mainDinner", 0] }, 
                                { $ifNull: ["$guestDinner", 0] }
                            ] 
                        } 
                    }
                }
            }
        ]);

        const chartMap = {};
        last7DaysDates.forEach(date => {
            const [y, m, d] = date.split('-');
            const displayDate = `${d}/${m}/${y}`;
            chartMap[date] = { date: displayDate, totalDayMeals: 0, totalNightMeals: 0 };
        });

        aggregatedData.forEach(item => {
            if (chartMap[item._id]) {
                chartMap[item._id].totalDayMeals = item.totalDayMeals;
                chartMap[item._id].totalNightMeals = item.totalNightMeals;
            }
        });

        res.status(200).json({
            success: true,
            data: Object.values(chartMap)
        });

    } catch (error) {
        console.error("Meal Chart Data Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});


// ৩. বাকি হিসাব ফেচ করার API (মডালের টেবিলের জন্য) - আপডেট করা ভার্সন
app.get('/api/expenses/due-details', async (req, res) => {
    try {
        const meta = await mongoose.connection.db.collection('app_metadata').findOne({ termStatus: 'active' });
        if (!meta || !meta.termStart || !meta.termEnd) {
            return res.status(400).json({ categories: [], totalCashCost: 0 });
        }

        const expenseCollectionName = `expenses_${meta.termStart}_${meta.termEnd}`;
        const memberCollectionName = `members_${meta.termStart}_${meta.termEnd}`;
        const db = mongoose.connection.db;

        const records = await db.collection(expenseCollectionName).find({}).toArray();

        const termSummary = await db.collection(memberCollectionName).findOne({ type: 'term_summary' });
        const termTotalCookBill = termSummary && typeof termSummary.termTotalCookBill === 'number' ? termSummary.termTotalCookBill : 0;

        const categoryMap = {};
        let totalCashCostSum = 0; // নগদ খরচ যোগ করার জন্য ভেরিয়েবল

        categoryMap['cook bill'] = {
            originalCategory: 'Cook Bill',
            totalDue: termTotalCookBill,
            payments: [],
            totalPaid: 0,
            isCookBill: true
        };

        records.forEach(record => {
            // নগদ খরচ হিসাব করা (যেগুলো ডায়েরির সাধারণ খরচ বা ক্যাশ খরচ)
            // যদি তোমার ডাটাবেজে ক্যাশ খরচের জন্য কোনো নির্দিষ্ট প্রপার্টি যেমন amount বা cashCost থাকে
            if (record.type !== 'due_payment' && record.type !== 'cook_bill_payment') {
                totalCashCostSum += Number(record.amount || record.cashCost) || 0;
            }

            // বাকি খরচ (dueCategory) হিসাব
            if (record.dueCategory && typeof record.dueCategory === 'string' && record.dueCategory.trim() !== "") {
                let rawCategory = record.dueCategory.trim();
                let lowerCategory = rawCategory.toLowerCase();

                if (!categoryMap[lowerCategory]) {
                    categoryMap[lowerCategory] = {
                        originalCategory: rawCategory,
                        totalDue: 0,
                        payments: [],
                        totalPaid: 0,
                        isCookBill: false
                    };
                }
                categoryMap[lowerCategory].totalDue += Number(record.dueCost) || 0;
            }

            // বাকি পরিশোধ (due_payment)
            if (record.type === 'due_payment' && record.category && typeof record.category === 'string') {
                let rawCategory = record.category.trim();
                let lowerCategory = rawCategory.toLowerCase();

                if (!categoryMap[lowerCategory]) {
                    categoryMap[lowerCategory] = {
                        originalCategory: rawCategory,
                        totalDue: 0,
                        payments: [],
                        totalPaid: 0,
                        isCookBill: false
                    };
                }
                let payAmount = Number(record.amount) || 0;
                categoryMap[lowerCategory].totalPaid += payAmount;
                categoryMap[lowerCategory].payments.push({
                    amount: payAmount,
                    date: record.date || ''
                });
            }

            // রান্নার বিল পরিশোধ (cook_bill_payment)
            if (record.type === 'cook_bill_payment') {
                let lowerCategory = 'cook bill';
                let payAmount = Number(record.amount) || 0;
                
                categoryMap[lowerCategory].totalPaid += payAmount;
                categoryMap[lowerCategory].payments.push({
                    amount: payAmount,
                    date: record.date || ''
                });
            }
        });

        const categories = Object.keys(categoryMap).map(key => {
            const item = categoryMap[key];
            const finalTotalDue = item.isCookBill ? termTotalCookBill : item.totalDue;
            const remainingDue = finalTotalDue - item.totalPaid;

            return {
                category: item.originalCategory,
                totalDue: finalTotalDue,
                payments: item.payments,
                remainingDue: remainingDue > 0 ? remainingDue : 0
            };
        });

        // রেসপন্সে totalCashCost পাঠিয়ে দেওয়া হলো
        res.status(200).json({ categories, totalCashCost: totalCashCostSum });

    } catch (error) {
        console.error("Due Details Error:", error);
        res.status(500).json({ categories: [], totalCashCost: 0 });
    }
});


// ১. পাস্ট টার্ম বা এক্সপায়ার্ড টার্মগুলো আনার জন্য গেট রুট
app.get('/api/expired-terms', async (req, res) => {
    try {
        const db = mongoose.connection.db;
        
        // ম্যানেজার ফোন দিয়ে ফিল্টার না করে সরাসরি সব এক্সপায়ার্ড টার্মগুলো নিয়ে আসা
        const expiredTerms = await db.collection('app_metadata')
            .find({ termStatus: "expired" })
            .toArray();

        res.status(200).json({ 
            success: true, 
            expiredTerms: expiredTerms 
        });

    } catch (err) {
        console.error("Backend Error on /api/expired-terms:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});


// Past-Records API

// ১. পাস্ট টার্মের মেম্বার ইনফো ফেচ করার আলাদা API
app.get('/api/past-members', async (req, res) => {
    try {
        const { termStart, termEnd } = req.query;

        if (!termStart || !termEnd) {
            return res.status(400).json({ message: "টার্মের ডেট (termStart এবং termEnd) পাওয়া যায়নি!" });
        }

        // ডায়নামিক কালেকশন নাম তৈরি
        const memberCollectionName = `members_${termStart}_${termEnd}`;
        const DynamicMember = getDynamicModel(memberCollectionName, null, memberSchema);

        // term_summary বাদে শুধুমাত্র মেম্বারদের ডাটা আনা
        const members = await DynamicMember.find({ type: { $ne: "term_summary" } });
        
        const formattedMembers = members.map(m => {
            const memberObj = m.toObject();
            return {
                ...memberObj,
                roomID: memberObj.roomID || "N/A",
                semester: memberObj.semester || "N/A",
                totalMainMeal: memberObj.totalMainMeal || 0,
                totalGuestMeal: memberObj.totalGuestMeal || 0,
                totalFineMeal: memberObj.totalFineMeal || 0,
                totalMainGuestFine: memberObj.totalMainGuestFine || 0
            };
        });

        res.status(200).json({
            success: true,
            members: formattedMembers
        });

    } catch (error) {
        console.error("Past Members Fetch Error:", error);
        res.status(500).json({ message: error.message });
    }
});


// ২. পাস্ট টার্মের term_summary ইনফো ফেচ করার আলাদা API
app.get('/api/past-term-summary', async (req, res) => {
    try {
        const { termStart, termEnd } = req.query;

        if (!termStart || !termEnd) {
            return res.status(400).json({ message: "টার্মের ডেট (termStart এবং termEnd) পাওয়া যায়নি!" });
        }

        const memberCollectionName = `members_${termStart}_${termEnd}`;
        const DynamicMember = getDynamicModel(memberCollectionName, null, memberSchema);

        // শুধুমাত্র type: "term_summary" ডাটাটি ফেচ করা
        const termSummaryDoc = await DynamicMember.findOne({ type: "term_summary" });
        
        const termSummaryData = {
            mealRate: termSummaryDoc ? termSummaryDoc.mealRate || 0 : 0,
            termCookBill: termSummaryDoc ? termSummaryDoc.termCookBill || 0 : 0,
            totalTermExpenses: termSummaryDoc ? termSummaryDoc.totalTermExpenses || 0 : 0,
            allmemTotalMainGuest: termSummaryDoc ? termSummaryDoc.allmemTotalMainGuest || 0 : 0
        };

        res.status(200).json({
            success: true,
            termSummary: termSummaryData
        });

    } catch (error) {
        console.error("Past Term Summary Fetch Error:", error);
        res.status(500).json({ message: error.message });
    }
});


// ... আপনার সব API রুটগুলো এখানে আছে ...

// সব শেষে এই অংশটি বসান:
const db = mongoose.connection;
db.once('open', () => {
    console.log("Database connected, setting up Change Stream...");
    
    const managerCollection = db.collection('manager_accounts');
    const changeStream = managerCollection.watch();

    changeStream.on('change', async (change) => {
        if (change.operationType === 'update' || change.operationType === 'replace') {
            try {
                const updatedDoc = await managerCollection.findOne({ _id: change.documentKey._id });
                
                if (updatedDoc && updatedDoc.phone) {
                    await db.collection('app_metadata').updateOne(
                        { managerPhone: updatedDoc.phone },
                        { 
                            $set: { 
                                termStart: updatedDoc.termStart, 
                                termEnd: updatedDoc.termEnd 
                            } 
                        }
                    );
                    console.log(`Metadata updated for: ${updatedDoc.phone}`);
                }
            } catch (err) {
                console.error("Auto-sync error:", err);
            }
        }
    });
});

// Homepage Route
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/HTML/index.html"));
});

// ✅ 404 Route (এখানে)
app.use((req, res) => {
    res.status(404).json({
        message: "Route Not Found"
    });
})

// ✅ Global Error Handler (এখানে)
app.use((err, req, res, next) => {
    console.error(err);

    res.status(500).json({
        success: false,
        message: "Internal Server Error"
    });
});

// সবার শেষে Listen
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} 🚀`));