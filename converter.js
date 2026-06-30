const fs = require('fs');
const csv = require('csv-parser');
const format = require('fast-csv');

const ORIGINAL_FILE = 'c4857d.csv';     
const TAGS_FILE = 'shopify_1.csv';       
const OUTPUT_FILE = 'shopify_Improvement.csv'; 
const TARGET_COLLECTION = 'Home Improvement';

// --- دالة البصمة الذكية ---
function generateFingerprint(name) {
    if (!name) return "unknown";
    const blacklist = [
        'red', 'blue', 'green', 'yellow', 'black', 'white', 'grey', 'brown', 'oak', 'walnut',
        'small', 'medium', 'large', 'xl', 'xxl', 'cm', 'inch', 'mm',
        'drawer', 'drawers', 'tier', 'tiers', 'shelf', 'shelves', 'door', 'doors', 'piece', 'pcs',
        'round', 'square', 'rectangular', 'oval'
    ];
    let clean = name.toLowerCase().replace(/\d+\s*(cm|mm|inch)?/gi, '').replace(/[^a-z0-9\s]/g, ' ');
    blacklist.forEach(word => {
        clean = clean.replace(new RegExp(`\\b${word}\\b`, 'gi'), '');
    });
    return clean.replace(/\s+/g, ' ').trim().replace(/\s/g, '-');
}

async function mergeAndCompleteImages() {
    console.log("1️⃣  جاري تحميل التاجات...");
    const tagsMap = new Map();
    if (fs.existsSync(TAGS_FILE)) {
        const tagsStream = fs.createReadStream(TAGS_FILE).pipe(csv());
        for await (const row of tagsStream) {
            if (row.Handle && row.Tags) tagsMap.set(row.Handle.toLowerCase().trim(), row.Tags);
        }
    }

    console.log("2️⃣  جاري تجميع المنتجات باستخدام البصمة...");
    const productsMap = new Map();
    const originalStream = fs.createReadStream(ORIGINAL_FILE).pipe(csv());

    for await (const row of originalStream) {
        if (row.Category && row.Category.includes(TARGET_COLLECTION)) {
            
            // استخدام البصمة كـ Handle للمنتج الأب
            const handle = generateFingerprint(row.Name);
            const handleO = row.Name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
            if (!handle) continue;

            if (!productsMap.has(handle)) {
                productsMap.set(handle, {
                    handle: handleO,
                    parentName: row.Name, 
                    description: row.description || '',
                    variants: new Map()
                });
            }
            
            const product = productsMap.get(handle);
            const variantKey = `${row.color || 'default'}-${row.size || 'default'}`.toLowerCase().trim();
            
            if (!product.variants.has(variantKey)) {
                product.variants.set(variantKey, {
                    color: row.color || 'Default',
                    size: row.size || 'Default',
                    SKU: row.SKU || '',
                    Price: row.Price || '0',
                    Qty: row.Qty || '0',
                    images: []
                });
            }
            
            const variant = product.variants.get(variantKey);
            
            // جمع الصور
            const rawImages = [];
            if (row.Images && row.Images.trim() !== "") {
                rawImages.push(...row.Images.split(/[\s,\|]+/).map(img => img.trim()));
            }
            Object.keys(row).forEach(key => {
                if (key.toLowerCase().startsWith('image') && key.toLowerCase() !== 'images' && row[key]) {
                    rawImages.push(row[key].trim());
                }
            });
            
            rawImages.forEach(img => {
                if (img.startsWith('http') && !variant.images.includes(img)) {
                    variant.images.push(img);
                }
            });
        }
    }

    console.log("3️⃣  جاري كتابة الملف النهائي...");
    const csvStream = format.format({ headers: true });
    csvStream.pipe(fs.createWriteStream(OUTPUT_FILE));

    for (const [handle, product] of productsMap.entries()) {
        let savedTags = tagsMap.get(product.handle) || "General";
        let isFirstRowOfProduct = true;

        for (const [variantKey, v] of product.variants.entries()) {
            let globalImagePosition = 1;
            const imagesToLoop = v.images.length > 0 ? v.images : [''];

            imagesToLoop.forEach((imgUrl, idx) => {
                csvStream.write({
                    'Handle': handle,
                    'Command': 'MERGE',
                    'Title': isFirstRowOfProduct ? product.parentName : '', 
                    'Body (HTML)': isFirstRowOfProduct ? product.description : '',
                    'Tags': savedTags ,
                    'Type': isFirstRowOfProduct ? TARGET_COLLECTION : '',
                    'Vendor': isFirstRowOfProduct ? 'Aosom' : '',
                    'Option1 Name': idx === 0 ? 'Color' : '',
                    'Option1 Value': idx === 0 ? v.color : '',
                    'Option2 Name': idx === 0 ? 'Size' : '',
                    'Option2 Value': idx === 0 ? v.size : '',
                    'Variant SKU': idx === 0 ? v.SKU : '',
                    'Variant Price': idx === 0 ? v.Price : '',
                    'Variant Inventory Tracker': idx === 0 ? 'shopify' : '',
                    'Variant Inventory Qty': idx === 0 ? v.Qty : '',
                    'Variant Inventory Policy': idx === 0 ? 'deny' : '', 
                    'Variant Image': idx === 0 ? imgUrl : '', 
                    'Image Src': imgUrl || '',
                    'Image Position': imgUrl ? globalImagePosition++ : ''
                });
                isFirstRowOfProduct = false;
            });
        }
    }
    
    csvStream.end();
    console.log("✅ تم الحفظ بنجاح! الملف: shopify_final_perfect.csv");
}

mergeAndCompleteImages();