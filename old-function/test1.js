const fs = require('fs');
const csv = require('csv-parser');
const format = require('fast-csv');
const { OpenAI } = require("openai");

const client = new OpenAI({ apiKey: "sk-b989028c44684716bab5c9a8e87387a8", baseURL: "https://api.deepseek.com" });
 
const inputFile = 'c4857d.csv';
const outputFile = 'shopify_4.csv';
const TARGET_COLLECTION = 'Patio & Garden';

const productsMap = new Map();

// تصحيح البرومبت ليكون متسقاً
const systemPrompt = `
You are an expert E-commerce product classifier. 
MANDATORY RULES:
1. Provide EXACTLY 15 tags (which means 5 sets of [Arabic, English, Tigrinya]).
2. Format: Return them as a single comma-separated list.
3. Do NOT include the product name. 
4. Use ONLY English commas (,) as separators.
`;

async function processProducts() {
    console.log("بدء المعالجة الذكية لملف شوبيفاي...");
    const stream = fs.createReadStream(inputFile).pipe(csv());
    const csvStream = format.format({ headers: true });
    csvStream.pipe(fs.createWriteStream(outputFile));

    // سنخزن الـ Handles التي تمت معالجتها لمنع تكرار طلب التاجات
    const processedHandles = new Set();
    let processedCount = 0;

    for await (const row of stream) {
        if (row.Category && row.Category.includes(TARGET_COLLECTION)) {
            const handle = row.Name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            processedCount++;
            
            // تصحيح الـ console.log ليقرأ البيانات مباشرة من السطر (row) الحالي
            console.log(`[${processedCount}] تصنيف منتج: ${row.Name}`);
            
            // تصنيف التاجات مرة واحدة فقط لكل منتج فريد (Handle) لإنقاص الاستهلاك والوقت
            let tags = "";
            if (!processedHandles.has(handle)) {
                tags = await getSmartTags(row.Name, row.description);
                processedHandles.add(handle);
            }

            // قائمة الصور لهذا الصف
            const images = [row.Image, row.Image1, row.Image2, row.Image3, row.Image4].filter(i => i && i.trim() !== "");
            
            // كتابة صف لكل صورة بناءً على شروط وقواعد شوبيفاي
            images.forEach((imgUrl, idx) => {
                // إنشاء الـ SKU الافتراضي في حال لم يوفره المورد
                const defaultSku = `${handle}-${row.color || 'default'}-${row.size || 'default'}`.replace(/\s+/g, '-');

                csvStream.write({
                    'Handle': handle,
                    'Command': 'MERGE', // تحديث المنتج أو المتغير إذا كان موجوداً مسبقاً
                    
                    // 1. بيانات المنتج الأساسية (تُكتب في السطر الأول للمنتج فقط، أي عند أول صورة)
                    'Title': idx === 0 ? row.Name : '', 
                    'Body (HTML)': idx === 0 ? (row.description || '').replace(/"/g, "'") : '',
                    'Tags': idx === 0 ? tags : '',
                    'Type': idx === 0 ? TARGET_COLLECTION : '',
                    
                    // 2. بيانات المتغير (تُكتب في السطر الأول فقط لكل متغير! وتُترك فارغة تماماً في بقية أسطر الصور لتفادي خطأ التكرار)
                    'Option1 Name': idx === 0 ? 'Color' : '',
                    'Option1 Value': idx === 0 ? (row.color || 'Default') : '',
                    'Option2 Name': idx === 0 ? 'Size' : '',
                    'Option2 Value': idx === 0 ? (row.size || 'Default') : '',
                    'Variant SKU': idx === 0 ? (row.SKU || defaultSku) : '',
                    'Variant Price': idx === 0 ? row.Price : '',
                    'Variant Inventory Tracker': idx === 0 ? 'shopify' : '',
                    'Variant Inventory Qty': idx === 0 ?  (row.Qty || 0)  : '',
                    'Variant Inventory Policy': idx === 0 ? 'deny' : '',
                    'Vendor' : 'Aosom',
                    'Status': idx === 0 ? 'active' : '',
                    
                    // 3. بيانات الصور ورقم ترتيبها (تُكتب دائماً في كل السطور)
                    'Image Src': imgUrl,
                    'Image Position': idx + 1
                });
            });
            
            // تأخير ثانية واحدة لتجنب الضغط على الـ API
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    csvStream.end();
    console.log("تم الانتهاء تماماً! الملف الجديد جاهز ونظيف 100%.");
}

async function getSmartTags(name, description) {
    try {
        const res = await client.chat.completions.create({
            messages: [{ role: "system", content: systemPrompt },
                       { role: "user", content: `Name: ${name}. Desc: ${description}.` }],
            model: "deepseek-chat",
        });
        // 1. استخراج النص
        const content = res.choices[0].message.content;
        
        // 2. طباعة ما تم جلبه للتأكد
        console.log("التاجات التي تم جلبها:", content); 

        // 3. تنظيف النص والتأكد من وجود قيمة
        if (!content || content.trim() === "") {
            throw new Error("Empty response");
        }
        return res.choices[0].message.content.replace(/،/g, ','); // تنظيف الفواصل العربية
    } catch (e) { return "أثاث, Furniture, ናይ ገዛ ኣቕሑ"; }
}

processProducts();