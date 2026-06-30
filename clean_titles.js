const fs = require('fs');

const cacheFile = 'translation_cache.json';
const translationCache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));

let deletedCount = 0;

for (const key in translationCache) {
    const value = translationCache[key];

    // الفكرة: الأوصاف دائماً تحتوي على أكواد HTML.
    // إذا كان النص لا يحتوي على أي وسم HTML، فهو إذاً "عنوان" أو "اسم" وسنقوم بحذفه.
    const hasHTML = /<[^>]*>/.test(value);

    if (!hasHTML) {
        console.log(`🗑️ تم حذف عنوان: "${value.substring(0, 30)}..."`);
        delete translationCache[key];
        deletedCount++;
    }
}

fs.writeFileSync(cacheFile, JSON.stringify(translationCache, null, 2));
console.log(`✅ تم الانتهاء! تم حذف ${deletedCount} من العناوين/الأسماء من ملف الذاكرة.`);