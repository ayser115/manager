require('dotenv').config();
const fs = require('fs');
const Papa = require('papaparse');
const axios = require('axios');

// ===== الإعدادات =====
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const cacheFile = 'translation_cache.json';
const fileName = 'translated_final_result.csv';
const CHUNK_SIZE = 10;      // عدد الطلبات المتوازية (غيرها إلى 10 لو تحب)
const RETRY_COUNT = 3;     // عدد محاولات إعادة الطلب الفاشل
const DELAY_BETWEEN_CHUNKS = 200; // تأخير بين الدفعات (نصف ثانية)

// ===== الكاش =====
let translationCache = fs.existsSync(cacheFile) 
    ? JSON.parse(fs.readFileSync(cacheFile, 'utf8')) 
    : {};

// ===== وظيفة التأخير =====
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ===== دالة التحقق من الحاجة للترجمة =====
function shouldTranslate(field, content) {
    if (!field) return false;
    const autoTranslate = ['body_html', 'title', 'product_type'];
    if (autoTranslate.includes(field.toLowerCase())) return true;

    const optionsFields = ['option1 value', 'option2 value', 'color', 'size', 'name'];
    if (optionsFields.includes(field.toLowerCase())) {
        const sizeKeywords = ['xl', 'xs', 's', 'm', 'l'];
        const hasNumbers = /\d/.test(content);
        const isSize = sizeKeywords.includes(content.toLowerCase().trim());
        if (hasNumbers || isSize) return false;
    }
    return false;
}

// ===== دالة الترجمة مع إعادة المحاولة =====
async function translateWithRetry(content, isHTML) {
    let lastError;
    for (let attempt = 1; attempt <= RETRY_COUNT; attempt++) {
        try {
            const response = await axios.post(
                'https://api.deepseek.com/chat/completions',
                {
                    model: "deepseek-chat",
                    messages: [
                        { 
                            role: "system", 
                            content: isHTML 
                                ? "You are a professional translator. Translate to Tigrinya. CRITICAL: Keep HTML tags exactly as they are. Translate ONLY the human-readable text inside the tags." 
                                : "You are a professional translator. Translate the following text to Tigrinya. Return ONLY the translated text. Do not add any HTML tags, do not add any explanations." 
                        },
                        { role: "user", content: content }
                    ],
                    temperature: 0.1,
                    max_tokens: 2500
                },
                { headers: { 'Authorization': `Bearer ${DEEPSEEK_API_KEY}`, 'Content-Type': 'application/json' } }
            );
            return response.data.choices[0].message.content.trim();
        } catch (error) {
            lastError = error;
            console.log(`   ⚠️ محاولة ${attempt}/${RETRY_COUNT} فشلت: ${error.message}`);
            if (attempt < RETRY_COUNT) await sleep(2000 * attempt); // انتظر 2، 4، 6 ثواني
        }
    }
    throw lastError; // فشلت كل المحاولات
}

// ===== دالة معالجة صف واحد (تُستخدم داخل الدفعة المتوازية) =====
async function processRow(row, index, totalRows) {
    const content = row['Default content'];
    const field = row['Field'];
    const isHTML = field === 'body_html' || field === 'description';

    // 1. تحقق من وجود محتوى
    if (!content) {
        console.log(`[${index}/${totalRows}] ⏭️ Nothing`);
        return;
    }

    // 2. تحقق إذا كان مترجماً مسبقاً
    if (row['Translated content'] && row['Translated content'].trim().length > 0) {
        console.log(`[${index}/${totalRows}] ⏭️ it's indeed translated`);
        return;
    }

    // 3. هل يحتاج ترجمة؟
    if (!shouldTranslate(field, content)) {
        row['Translated content'] = content; // انسخ النص الأصلي
        console.log(`[${index}/${totalRows}] ⏭️ Skip It's Size`);
        return;
    }

    // 4. تحقق من الكاش
    if (translationCache[content]) {
        row['Translated content'] = translationCache[content];
        console.log(`[${index}/${totalRows}] ⚡⚡⚡ From Cach ==>( ${content.substring(0, 20)}...)`);
        return;
    }

    // 5. الترجمة عبر API (مع إعادة المحاولة)
    try {
        console.log(`[${index}/${totalRows}] 🔄 Translating ==>( ${content.substring(0, 20)}...)`);
        const translation = await translateWithRetry(content, isHTML);
        row['Translated content'] = translation;
        translationCache[content] = translation; // حفظ في الكاش
        console.log(`[${index}/${totalRows}] ✅ Translate Done`);
    } catch (error) {
        console.error(`[${index}/${totalRows}] ❌❌❌ Translate it's field( ${RETRY_COUNT}RETRY_COUNT):❌❌❌`, error.message);
       
    }
}

// ===== الدالة الرئيسية =====
async function translateFile() {
    console.log('📖 Start Reading CSV...');
    const fileContent = fs.readFileSync('SIEN_translations_Jun-30-2026.csv', 'utf8');
    const results = Papa.parse(fileContent, { header: true });
    const data = results.data;
    const totalRows = data.length;
    console.log(`📊 End Reading${totalRows} row.`);

    let processedCount = 0;

    // معالجة الملف على شكل دفعات (Chunks)
    for (let i = 0; i < totalRows; i += CHUNK_SIZE) {
        const chunk = data.slice(i, i + CHUNK_SIZE);
        
        // إنشاء مصفوفة من المهام المتوازية (Promise)
        const promises = chunk.map((row, indexInChunk) => {
            const globalIndex = i + indexInChunk + 1; // رقم الصف الحقيقي
            return processRow(row, globalIndex, totalRows);
        });

        // تنفيذ جميع طلبات الدفعة الحالية بالتوازي
        await Promise.all(promises);
        
        processedCount += chunk.length;

        // 💾 حفظ الكاش وملف CSV بعد كل دفعة (حماية من الفقدان)
        fs.writeFileSync(cacheFile, JSON.stringify(translationCache, null, 2));
        const csv = Papa.unparse(data);
        fs.writeFileSync(fileName, csv);
        
        console.log(`💾 Done Save CSV(${processedCount}/${totalRows})`);

        // ⏳ انتظر قليلاً بين الدفعات لتجنب ضغط الـ API
        if (i + CHUNK_SIZE < totalRows) {
            await sleep(DELAY_BETWEEN_CHUNKS);
        }
    }

    console.log(`🎉🎉✅ You did Boss ${fileName}✅🎉🎉`);
}

// ===== تشغيل البرنامج =====
translateFile().catch(console.error);