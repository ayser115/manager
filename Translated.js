require('dotenv').config();
const fs = require('fs');
const Papa = require('papaparse');
const axios = require('axios');

// ===== الإعدادات =====
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

async function translateFile() {
  const fileContent = fs.readFileSync('My_Store_4_translations_Jun-29-2026.csv', 'utf8');
  let translatedCount =0;
  Papa.parse(fileContent, {
    header: true,
    complete: async (results) => {
      const data = results.data;

    for (let i = 0; i < data.length; i++) {
  const row = data[i];
  
  // نترجم فقط إذا كان النص موجوداً والترجمة فارغة
  if (row['Default content'] && !row['Translated content']) {
    try {
      // إرسال طلب الترجمة إلى DeepSeek
      const response = await axios.post(
        'https://api.deepseek.com/chat/completions',
        {
          model: "deepseek-chat", // النموذج الصحيح
          messages: [
            { 
              role: "system", 
              content: "You are a professional translator. Translate the following e-commerce text to Tigrinya. Only respond with the translation, nothing else." 
            },
            { 
              role: "user", 
              content: row['Default content'] 
            }
          ],
          temperature: 0.1,    // تحكم في إبداع الترجمة (0 = دقيق، 1 = إبداعي)
          max_tokens: 2000      // الحد الأقصى لطول الترجمة
        },
        {
          headers: { 
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // استخراج الترجمة من الرد
      const translation = response.data.choices[0].message.content.trim();
      row['Translated content'] = translation;
      translatedCount++;
      
      console.log(`✅ تمت الترجمة (${translatedCount}): ${row['Default content'].substring(0, 50)}...`);
      
      // تأخير 500 ملي ثانية بين كل طلب وآخر لتجنب الحظر
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
  if (error.response) {
    // هذا سيطبع السبب الدقيق الذي رفض الخادم الطلب بسببه
    console.error('❌ خطأ من DeepSeek:', JSON.stringify(error.response.data, null, 2));
  } else {
    console.error('❌ خطأ في الاتصال:', error.message);
  }
  row['Translated content'] = `ERROR: Failed`;
}
  }
}

      // حفظ الملف بعد الانتهاء
      const csv = Papa.unparse(data);
      fs.writeFileSync('translated_file_ready.csv', csv);
      console.log('تم حفظ الملف بنجاح باسم translated_file_ready.csv');
    }
  });
}

translateFile();