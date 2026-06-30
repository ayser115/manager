const fs = require('fs');
const csv = require('csv-parser');
const format = require('fast-csv');

const ORIGINAL_FILE = 'c4857d.csv';     
const TAGS_FILE = 'shopify_1.csv';       
const OUTPUT_FILE = 'shopify_final.csv'; 
const TARGET_COLLECTION = 'Home Improvement';

async function mergeAndCompleteImages() {
    console.log("1️⃣  المرحلة الأولى: جلب التاجات الجاهزة من ملف shopify_5.csv...");
    const tagsMap = new Map();
    
    if (fs.existsSync(TAGS_FILE)) {
        const tagsStream = fs.createReadStream(TAGS_FILE).pipe(csv());
        for await (const row of tagsStream) {
            // تخزين الـ Handle القديم (الذي يحتوي على اللون والمقاس)
            if (row.Handle && row.Tags && row.Tags.trim() !== "") {
                tagsMap.set(row.Handle.toLowerCase().trim(), row.Tags);
            }
        }
        console.log(`✅ تم حفظ [${tagsMap.size}] سطر تاجات قديم في الذاكرة.`);
    }

    console.log("\n2️⃣  المرحلة الثانية: تجميع المتغيرات وكافة الصور ديناميكياً...");
    const productsMap = new Map();
    const originalStream = fs.createReadStream(ORIGINAL_FILE).pipe(csv());

    for await (const row of originalStream) {
        if (row.Category && row.Category.includes(TARGET_COLLECTION)) {
            
            // تنظيف الاسم وتوحيد الـ Handle للمنتج الأب (بدون حشو الألوان والمقاسات)
            let baseName = row.Name || "";
            if (row.color) {
                const colorRegex = new RegExp(`\\b${row.color.trim()}\\b`, 'gi');
                baseName = baseName.replace(colorRegex, '');
            }
            if (row.size) {
                const sizeRegex = new RegExp(`\\b${row.size.trim()}\\b`, 'gi');
                baseName = baseName.replace(sizeRegex, '');
            }
            baseName = baseName.replace(/\s+/g, ' ').trim();
            
            const handle = baseName.toLowerCase()
                                   .replace(/[^a-z0-9]+/g, '-')
                                   .replace(/-+/g, '-')
                                   .replace(/^-|-$/g, '');

            if (!handle) continue;

            if (!productsMap.has(handle)) {
                productsMap.set(handle, {
                    parentName: baseName || row.Name, 
                    description: row.description || row.short_description,
                    Product_Type: row.Product_Type || TARGET_COLLECTION,
                    variants: new Map()
                });
            }
            
            const product = productsMap.get(handle);
            const variantKey = `${row.color || 'default'}-${row.size || 'default'}`.toLowerCase().trim();
            
            if (!product.variants.has(variantKey)) {
                product.variants.set(variantKey, {
                    color: row.color ? row.color.trim() : 'Default',
                    size: row.size ? row.size.trim() : 'Default',
                    SKU: row.SKU ? row.SKU.trim() : '',
                    Price: row.Price ? row.Price.trim() : '0',
                    Qty: row.Qty ? row.Qty.trim() : '0',
                    images: [] // مصفوفة ستجمع "كل" صور هذا المتغير
                });
            }
            
            const variant = product.variants.get(variantKey);
            const rawImages = [];
            
            // جلب الصور من العمود المجمع Images
            if (row.Images && row.Images.trim() !== "") {
                const splitImages = row.Images.split(/[\s,\|]+/).map(img => img.trim());
                rawImages.push(...splitImages);
            }
            
            // جلب الصور من الأعمدة المنفصلة (Image, Image1 ... Image7)
            Object.keys(row).forEach(key => {
                if (key.toLowerCase().startsWith('image') && key.toLowerCase() !== 'images') {
                    if (row[key] && row[key].trim() !== "") {
                        rawImages.push(row[key].trim());
                    }
                }
            });
            
            // تنظيف وفلترة الروابط التالفة لعدم إظهار العلامة الحمراء
            rawImages.forEach(img => {
                const isUrl = img.startsWith('http://') || img.startsWith('https://');
                const isInvalidText = ['na', 'n/a', 'none', 'null', 'undefined'].some(word => img.toLowerCase().includes(word));
                const hasImageAsset = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].some(ext => img.toLowerCase().split('?')[0].endsWith(ext));
                
                if (isUrl && !isInvalidText && hasImageAsset) {
                    if (!variant.images.includes(img)) {
                        variant.images.push(img); // هنا يتم جلب "كل" الصور للمتغير
                    }
                }
            });
        }
    }

    console.log(`✅ اكتمل التجميع. جاري كتابة وتصدير ملف شوبيفاي النهائي...`);

    const csvStream = format.format({ headers: true });
    csvStream.pipe(fs.createWriteStream(OUTPUT_FILE));

    for (const [handle, product] of productsMap.entries()) {
        
        // 🔥 حل مشكلة التاجات (البحث الجزئي الذكي):
        // نبحث عن أي هاندل قديم في الذاكرة يبدأ بالهاندل الجديد الموحد
        let savedTags = "ألعاب, Toys, ናይ መጻወቲ ኣቕሑ"; // افتراضي في حال لم يجد
        for (const [oldHandle, tags] of tagsMap.entries()) {
            if (oldHandle.startsWith(handle) || handle.startsWith(oldHandle)) {
                savedTags = tags;
                break; // وجدنا التاجات المناسبة للمنتج، نوقف البحث
            }
        }
        
        let isFirstRowOfProduct = true;

        for (const [variantKey, v] of product.variants.entries()) {
            // إذا لم تكن هناك صور، نضع سطراً فارغاً للمتغير، وإذا وُجدت صور نمر عليها جميعاً
            let globalImagePosition = 1; 
            const imagesToLoop = v.images.length > 0 ? v.images : [''];

            imagesToLoop.forEach((imgUrl, idx) => {
                const defaultSku = `${handle}-${v.color}-${v.size}`.replace(/\s+/g, '-');

                csvStream.write({
                    'Handle': handle,
                    'Command': 'MERGE',
                    
                    // 1. بيانات المنتج الأب الأساسية
                    'Title': isFirstRowOfProduct ? product.parentName : '', 
                    'Body (HTML)': isFirstRowOfProduct ? (product.description || '').replace(/"/g, "'") : '',
                    'Tags': isFirstRowOfProduct ? savedTags : '', // تم جلب التاج القديم بنجاح هنا
                    'Type': isFirstRowOfProduct ? TARGET_COLLECTION : '',
                    'Vendor' : isFirstRowOfProduct ? 'Aosom' : '',
                    
                    // 2. بيانات المتغير
                    'Option1 Name': idx === 0 ? 'Color' : '',
                    'Option1 Value': idx === 0 ? v.color : '',
                    'Option2 Name': idx === 0 ? 'Size' : '',
                    'Option2 Value': idx === 0 ? v.size : '',
                    'Variant SKU': idx === 0 ? (v.SKU || defaultSku) : '',
                    'Variant Price': idx === 0 ? v.Price : '',
                    'Variant Inventory Tracker': idx === 0 ? 'shopify' : '',
                    'Variant Inventory Qty': idx === 0 ? v.Qty : '',
                    'Variant Inventory Policy': idx === 0 ? 'deny' : '',
                    
                    // 🔥 قاعدة شوبيفاي: نربط "أول صورة فقط" كصورة للمتغير في السطر الأول له
                    'Variant Image': idx === 0 ? imgUrl : '', 
                    
                    'Status': idx === 0 ? 'active' : '',
                    
                    // 3. معرض الصور العام (يتم كتابة "كل" الصور هنا لتظهر في المعرض التابع للمنتج)
                    'Image Src': imgUrl || '',
                    'Image Position': imgUrl ? globalImagePosition++ : ''
                });
                
                isFirstRowOfProduct = false; 
            });
        }
    }
    
    csvStream.end();
    console.log(`\n🎉🎉Aiser You Did it 📁🎉🎉 ${OUTPUT_FILE}`);
}

mergeAndCompleteImages();