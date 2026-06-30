const fs = require('fs');
const csv = require('csv-parser'); // تأكد من تثبيتها أو استخدام نفس اسم الاستيراد عندك
const format = require('fast-csv'); // تأكد من تثبيتها أو استخدام نفس اسم الاستيراد عندك

const ORIGINAL_FILE = 'c4857d.csv';     // ملف المورد الأصلي المحتوي على كل الصور
const TAGS_FILE = 'shopify_1.csv';       // ملفك الحالي الذي يحتوي على التاجات الجاهزة
const OUTPUT_FILE = 'shopify_output_1.csv'; // الملف النهائي الاحترافي الجاهز لشوبيفاي
const TARGET_COLLECTION = 'Home Improvement';

async function mergeAndCompleteImages() {
    console.log("1️⃣  المرحلة الأولى: جلب التاجات الجاهزة من ملف shopify_5.csv...");
    const tagsMap = new Map();
    
    const tagsStream = fs.createReadStream(TAGS_FILE).pipe(csv());
    for await (const row of tagsStream) {
        // نأخذ التاجات ونربطها بالـ Handle الخاص بالمنتج
        if (row.Handle && row.Tags && row.Tags.trim() !== "") {
            tagsMap.set(row.Handle, row.Tags);
        }
    }
    console.log(`✅ تم حفظ تاجات لـ [${tagsMap.size}] منتج فريد في الذاكرة.`);

    console.log("\n2️⃣  المرحلة الثانية: قراءة ملف المورد وتجميع كافة الصور والمتغيرات ديناميكياً...");
    const productsMap = new Map();
    const originalStream = fs.createReadStream(ORIGINAL_FILE).pipe(csv());

    for await (const row of originalStream) {
        if (row.Category && row.Category.includes(TARGET_COLLECTION)) {
            const handle = row.Name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            
            if (!productsMap.has(handle)) {
                productsMap.set(handle, {
                    name: row.Name,
                    description: row.description,
                    variants: new Map()
                });
            }
            
            const product = productsMap.get(handle);
            const variantKey = `${row.color || 'default'}-${row.size || 'default'}`;
            
            if (!product.variants.has(variantKey)) {
                product.variants.set(variantKey, {
                    color: row.color,
                    size: row.size,
                    SKU: row.SKU,
                    Price: row.Price,
                    Qty: row.Qty,
                    images: []
                });
            }
            
            const variant = product.variants.get(variantKey);
            
            // 🔥 حركة ذكية: جلب جميع الأعمدة التي تبدأ بكلمة Image تلقائياً (Image, Image1, Image2 ... Image20)
            const rowImages = Object.keys(row)
                .filter(key => key.toLowerCase().startsWith('image'))
                .map(key => row[key])
                .filter(img => img && img.trim() !== "");
            
            // دمج الصور ومنع تكرارها لنفس المتغير
            rowImages.forEach(img => {
                if (!variant.images.includes(img)) {
                    variant.images.push(img);
                }
            });
        }
    }

    console.log(`✅ تم تجميع المنتجات الأصلية. جاري كتابة الملف النهائي المطابق لشروط شوبيفاي...`);

    const csvStream = format.format({ headers: true });
    csvStream.pipe(fs.createWriteStream(OUTPUT_FILE));

    let processedCount = 0;

    // 3️⃣ المرحلة الثالثة: الكتابة الذكية وتطبيق القواعد الذهبية لشوبيفاي
    for (const [handle, product] of productsMap.entries()) {
        processedCount++;
        
        // جلب التاج القديم من الذاكرة، وإذا لم يوجد نضع تاجات احتياطية
        const savedTags = tagsMap.get(handle) || "ألعاب, Toys, ናይ መጻወቲ ኣቕሑ";
        
        let isFirstRowOfProduct = true;
        let globalImagePosition = 1;

        for (const [variantKey, v] of product.variants.entries()) {
            const imagesToLoop = v.images.length > 0 ? v.images : [''];

            imagesToLoop.forEach((imgUrl, idx) => {
                const defaultSku = `${handle}-${v.color || 'default'}-${v.size || 'default'}`.replace(/\s+/g, '-');

                csvStream.write({
                    'Handle': handle,
                    'Command': 'MERGE',
                    
                    // 1. بيانات المنتج الأساسية (السطر الأول للمنتج فقط)
                    'Title': isFirstRowOfProduct ? product.name : '', 
                    'Body (HTML)': isFirstRowOfProduct ? (product.description || '').replace(/"/g, "'") : '',
                    'Tags': isFirstRowOfProduct ? savedTags : '',
                    'Type': isFirstRowOfProduct ? TARGET_COLLECTION : '',
                    'Vendor' : isFirstRowOfProduct ? 'Aosom' : '',
                    
                    // 2. بيانات المتغير (السطر الأول لكل متغير فقط لمنع خطأ Already Exists)
                    'Option1 Name': idx === 0 ? 'Color' : '',
                    'Option1 Value': idx === 0 ? (v.color || 'Default') : '',
                    'Option2 Name': idx === 0 ? 'Size' : '',
                    'Option2 Value': idx === 0 ? (v.size || 'Default') : '',
                    'Variant SKU': idx === 0 ? (v.SKU || defaultSku) : '',
                    'Variant Price': idx === 0 ? v.Price : '',
                    'Variant Inventory Tracker': idx === 0 ? 'shopify' : '',
                    'Variant Inventory Qty': idx === 0 ? (v.Qty || 0) : '',
                    'Variant Inventory Policy': idx === 0 ? 'deny' : '',
                    'Status': idx === 0 ? 'active' : '',
                    
                    // 3. الصور والترتيب التصاعدي التراكمي للمنتج بالكامل
                    'Image Src': imgUrl,
                    'Image Position': imgUrl ? globalImagePosition++ : ''
                });
                
                isFirstRowOfProduct = false;
            });
        }
    }
    
    csvStream.end();
    console.log(`\n🎉 مبروك! العملية تمت بنجاح وبسرعة فائقة بدون استهلاك الـ API.`);
    console.log(`📁 الملف النهائي الجاهز للرفع الآن هو: ${OUTPUT_FILE}`);
}

// تشغيل السكربت المدمج
mergeAndCompleteImages();