'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface JudicialEntry {
  council: string;
  court: string;
  municipalities: string[];
  branch?: string;
  type?: 'branch' | 'court';
  parentCourt?: string;
  branchNote?: string;
  status?: string;
}

const judicialData: JudicialEntry[] = [
  // مجلس قضاء أدرار
  { council: "أدرار", court: "أدرار", municipalities: ["أدرار","بودة","أولاد أحمد تيمي","تسابيت","السبع","فنوغيل","تامنطيت","تاماست"] },
  { council: "أدرار", court: "رقان", municipalities: ["رقان","سالي"] },
  { council: "أدرار", court: "أولف", municipalities: ["أولف","تيمقتن","أقبلي","تيت"] },
  { council: "أدرار", court: "زاوية كنتة", municipalities: ["زاوية كنتة","إن زغمير"] },
  
  // مجلس قضاء الشلف
  { council: "الشلف", court: "الشلف", municipalities: ["الشلف","سنجاس","أم الذروع","الحجاج"] },
  { council: "الشلف", court: "الشلف", branch: "فرع الشطية", type: "branch", parentCourt: "الشلف",
    municipalities: ["أولاد فارس", "الشطية", "الأبيض مجاجة"],
    branchNote: "أُنشئ بموجب قرار 20 أكتوبر 2022 ج.ر رقم 75" },
  { council: "الشلف", court: "بوقادير", municipalities: ["بوقادير","أولاد بن عبد القادر","وادي سلي","صبحة"] },
  { council: "الشلف", court: "بوقادير", branch: "فرع عين مران", type: "branch", parentCourt: "بوقادير",
    municipalities: ["عين مران", "تاوقريت", "الهرانفة", "الظهرة"] },
  { council: "الشلف", court: "تنس", municipalities: ["تنس","أبو الحسن","المرسى","بني حواء","سيدي عكاشة","سيدي عبد الرحمن","تلعصة","مصدق","وادي قوسين","بريرة","بوزغاية","تاجنة","الزبوجة","بنايرية"] },
  
  // مجلس قضاء الأغواط
  { council: "الأغواط", court: "الأغواط", municipalities: ["الأغواط","سيدي مخلوف","العسفية","الخنق"] },
  { council: "الأغواط", court: "عين ماضي", municipalities: ["عين ماضي","تاجموت","الحويطة","الغيشة","وادي مزي","تاجرونة"] },
  { council: "الأغواط", court: "أفلو", municipalities: ["أفلو","قلتة سيدي سعد","عين سيدي علي","بيضاء","بريدة","الحاج المشري","سبقاق","تاويالة","وادي مرة","سيدي بوزيد"] },
  { council: "الأغواط", court: "قصر الحيران", municipalities: ["قصر الحيران","بن ناصر بن شهرة","حاسي الدلاعة","حاسي الرمل"] },
  
  // مجلس قضاء أم البواقي
  { council: "أم البواقي", court: "أم البواقي", municipalities: ["أم البواقي","قصر الصباحي","عين الزيتون","عين بابوش","عين الديس"] },
  { council: "أم البواقي", court: "عين البيضاء", municipalities: ["عين البيضاء","وادي نيني","بريش","فكيرينة","الزرق"] },
  { council: "أم البواقي", court: "عين مليلة", municipalities: ["عين مليلة","بئر الشهداء","أولاد قاسم","أولاد حملة","أولاد الزوي","سوق نعمان"] },
  { council: "أم البواقي", court: "عين فكرون", municipalities: ["عين فكرون","العامرية","الفجوج","بوغرارة سعودى","سيقوس"] },
  { council: "أم البواقي", court: "مسكيانة", municipalities: ["مسكيانة","الجازية","الراحية","بحير الشرقي","البلالة","الضلعة","عين كرشة","الحرملية","هنشير تومغاني"] },
  
  // مجلس قضاء باتنة
  { council: "باتنة", court: "باتنة", municipalities: ["باتنة","تازولت","فسديس","وادي الشعبة","عيون العصافير"] },
  { council: "باتنة", court: "بريكة", municipalities: ["بريكة","بيطام","مدوكال","أولاد عمار","أزيل عبد القادر","الجزار"] },
  { council: "باتنة", court: "أريس", municipalities: ["أريس","إيشمول","ثنية العابد","بوزينة","منعة","تكوت","وادي الطاقة","تغرغار","غسيرة","كيمل","إينوغيسن","فم الطوب","تيغانمين","شير","لرباع"] },
  { council: "باتنة", court: "مروانة", municipalities: ["مروانة","حيدوسة","وادي الماء","أولاد سلام","تالغمت","قصر بلزمة","الحاسي"] },
  { council: "باتنة", court: "نقاوس", municipalities: ["نقاوس","أولاد سي سليمان","تاكسنلانت","بومقر","سفيان","لمسان"] },
  { council: "باتنة", court: "عين التوتة", municipalities: ["عين التوتة","سقانة","أولاد عوف","معافة","بني فضالة الحقانية","تيلاطو"] },
  { council: "باتنة", court: "سريانة", municipalities: ["سريانة","لازرو","زانة البيضاء","عين جاسر","عين ياقوت","جرمة","المعذر"] },
  { council: "باتنة", court: "رأس العين", municipalities: ["رأس العين","القصبات","قيقبة","الرحبات"] },
  { council: "باتنة", court: "شمرة", status: "unknown_court", municipalities: ["شمرة","أولاد فاضل","تيمقاد","بوالحيلات","بومية"] },
  
  // مجلس قضاء بجاية
  { council: "بجاية", court: "بجاية", municipalities: ["بجاية","تيشي","أوقاس","بوخليفة","تيزي نبربر","تالة حمزة"] },
  { council: "بجاية", court: "خراطة", municipalities: ["خراطة","سوق الاثنين","درقينة","تامريجت","تاسكريوت","آيت إسماعيل","ذراع القايد","ملبو"] },
  { council: "بجاية", court: "سيدي عيش", municipalities: ["سيدي عيش","تاورير إغيل","تيمزريت","أكفادو","لفلاي","شميني","تينبذار","تيفرة","سيدي عياد","أدكار","السوق أوفلا","تيبان"] },
  { council: "بجاية", court: "أميزور", municipalities: ["أميزور","فرعون","سمعون","كنديرة","بني جليل","برباشة"] },
  { council: "بجاية", court: "أقبو", municipalities: ["أقبو","تازمالت","بوجليل","إغيل علي","شلاطة","أوزلاقن","تامقرة","إغرم","بني مليكش","آيت رزين"] },
  { council: "بجاية", court: "صدوق", municipalities: ["صدوق","أمالو","بني معوش","بوحمزة","مسيسنة"] },
  { council: "بجاية", court: "القصر", municipalities: ["القصر","إفلاين الماثن","توجة","وادي غير","بني كسيلة"] },
  
  // مجلس قضاء بسكرة
  { council: "بسكرة", court: "بسكرة", municipalities: ["بسكرة","البرانس","جمورة","الحاجب"] },
  { council: "بسكرة", court: "بسكرة", branch: "فرع أورلال", type: "branch", parentCourt: "بسكرة",
    municipalities: ["أورلال", "أوماش", "مليلي", "مخادمة", "لواء"],
    branchNote: "أُنشئ بموجب قرار 28-03-2024 ج.ر رقم 30" },
  { council: "بسكرة", court: "سيدي عقبة", municipalities: ["سيدي عقبة"] },
  { council: "بسكرة", court: "سيدي عقبة", branch: "فرع زريبة الوادي", type: "branch", parentCourt: "سيدي عقبة",
    municipalities: ["زريبة الوادي", "شتمة", "مشونش", "الحوش", "عين الناقة", "الفيض", "المزيرعة", "خنقة سيدي ناجي"],
    branchNote: "أُنشئ بموجب قرار 19-04-2024 ج.ر رقم 37" },
  { council: "بسكرة", court: "طولقة", municipalities: ["طولقة","فوغالة","برج بن عزوز","بوشقرون","الغروس","لشانة"] },
  { council: "بسكرة", court: "طولقة", branch: "فرع القنطرة", type: "branch", parentCourt: "طولقة",
    municipalities: ["القنطرة", "عين زعطوط", "الوطاية"],
    branchNote: "أُنشئ بموجب قرار 28-03-2024 ج.ر رقم 30" },
  
  // مجلس قضاء بشار
  { council: "بشار", court: "بشار", municipalities: ["بشار","قنادسة","الأحمر","موغل","بوقايس","مريجة"] },
  { council: "بشار", court: "العبادلة", municipalities: ["العبادلة","تاغيت","مشرع هواري بومدين","عرق فراج"] },
  { council: "بشار", court: "بني ونيف", municipalities: ["بني ونيف"] },
  
  // مجلس قضاء البليدة
  { council: "البليدة", court: "البليدة", municipalities: ["البليدة","بوعرفة","أولاد يعيش","الشريعة","بني مراد","الصومعة"] },
  { council: "البليدة", court: "بوفاريك", municipalities: ["بوفاريك","الشبلي","بن خليل","قرواو","بوعينان","بوقرة","أولاد سلامة","حمام ملوان","بئر التوتة","السحاولة","أولاد شبل","تسالة المرجة","سيدي موسى"] },
  { council: "البليدة", court: "العفرون", municipalities: ["العفرون","موزاية","وادي العلايق","الشفة","وادي جر","بني تامو","عين الرمانة"] },
  { council: "البليدة", court: "الأربعاء", municipalities: ["الأربعاء","مفتاح","صوحان","جبابرة"] },
  
  // مجلس قضاء البويرة
  { council: "البويرة", court: "البويرة", municipalities: ["البويرة","أهل القصر","بشلول","الحيزر","الأسنام","آيت لعزيز","أولاد راشد","عين الترك"] },
  { council: "البويرة", court: "الأخضرية", municipalities: ["الأخضرية","بودربالة","قرومة","قاديرية","معلة","عومار","الزبربر","جباحية","بوكرم"] },
  { council: "البويرة", court: "سور الغزلان", municipalities: ["سور الغزلان","ديرة","برج أخريص","مزدور","الحاكمية","تاقديت","الدشمية","ريدان","معمورة","الحجرة الزرقاء"] },
  { council: "البويرة", court: "عين بسام", municipalities: ["عين بسام","بئر غباللو","الهاشمية","سوق الخميس","الخبوزية","عين العلوي","المقراني","وادي البردي","روراوة","عين الحجر"] },
  { council: "البويرة", court: "مشد الله", status: "unknown_court", municipalities: ["مشد الله","العجيبة","الصهاريج","تاوريرت","تاغزوت","حنيف","شرفة","أغبالو"] },
  
  // مجلس قضاء تامنغست
  { council: "تامنغست", court: "تامنغست", municipalities: ["تامنغست","أباليسا","إن أمقل","تازروق","إدلس"] },
  
  // مجلس قضاء تبسة
  { council: "تبسة", court: "تبسة", municipalities: ["تبسة","بئر الذهب","الحمامات","الكويف","الماء الأبيض","بكارية","الحويجبات","بولحاف الدين"] },
  { council: "تبسة", court: "بئر العاتر", municipalities: ["بئر العاتر","أم علي","صفصاف الوسرة","نقرين","فركان","العقلة المالحة"] },
  { council: "تبسة", court: "الشريعة", municipalities: ["الشريعة","العقلة","بئر مقدم","قوريقر","ثليجان","بجن","المزرعة","سطح قنطيس"] },
  { council: "تبسة", court: "العوينات", municipalities: ["العوينات","مرسط","بوخضرة"] },
  { council: "تبسة", court: "الونزة", status: "unknown_court", municipalities: ["الونزة","المريج","عين الزرقاء"] },
  
  // مجلس قضاء تلمسان
  { council: "تلمسان", court: "تلمسان", municipalities: ["تلمسان","بني مستر","تيرني بني هديل","شتوان","منصورة","عين الغرابة"] },
  { council: "تلمسان", court: "الغزوات", municipalities: ["الغزوات","السواحلية","تيانت","حنين","بني راشد"] },
  { council: "تلمسان", court: "مغنية", municipalities: ["مغنية","صبرة","حمام بوغرارة","سيدي مجاهد","بني بوسعيد","بوحلو"] },
  { council: "تلمسان", court: "سبدو", municipalities: ["سبدو","العريشة","القور","بني سنوس","سيدي الجيلالي","العزايل","بني بهدل","البويهي"] },
  { council: "تلمسان", court: "الرمشي", municipalities: ["الرمشي","عين يوسف","بني ورسوس","سيدي أحمد","الحناية","الفحول","عين نحالة"] },
  { council: "تلمسان", court: "باب العسة", municipalities: ["باب العسة","السواني","مرسى بن مهيدي","سوق الثلاثاء","مسيردة الفواقة"] },
  { council: "تلمسان", court: "أولاد ميمون", municipalities: ["أولاد ميمون","وادي شولي","بن سكران","سيدي عبد اللي","عين تالوت","بني صميل","عمير","عين نحالة","عين فزة"] },
  
  // مجلس قضاء تيارت
  { council: "تيارت", court: "تيارت", municipalities: ["تيارت","تاقدمت","عين بوشقيف","دهموني","ملاكو","قرطوفة"] },
  { council: "تيارت", court: "السوقر", municipalities: ["السوقر","عين الذهب","مدريسة","النعيمة","توسنينة","شحيمة","سي عبد الغني","الفايجة"] },
  { council: "تيارت", court: "فرندة", municipalities: ["فرندة","مدروسة","عين كرمس","تاخمرت","سيدي عبد الرحمن","عين الحديد","مادنة","سيدي بختي","جبيلة رصفة"] },
  { council: "تيارت", court: "قصر الشلالة", municipalities: ["قصر الشلالة","زمالة الأمير عبد القادر","رشايقة","سرغين"] },
  { council: "تيارت", court: "رحوية", municipalities: ["رحوية","سيدي علي ملال","جيلالي بن عمار","وادي ليلي","تيدة","مشرع الصفا"] },
  
  // مجلس قضاء تيزي وزو
  { council: "تيزي وزو", court: "تيزي وزو", municipalities: ["تيزي وزو","بني عيسي","بني زمنزر","آيت محمود","المعاتقة","بني دوالة","تيرمتين","ذراع بن خدة","سوق الاثنين","سيدي نعمان","تادمايت"] },
  { council: "تيزي وزو", court: "عزازقة", municipalities: ["عزازقة","فريحة","صوامع","أيلولة أومالو","اعكورن","زكري","بوزقن","إيفيغاء","بني زيكي","أجر","مقلع","آيت خليلي","تيمزارت"] },
  { council: "تيزي وزو", court: "ذراع الميزان", municipalities: ["ذراع الميزان","مشطراس","تيزي غنيف","بونوح","فريقات","عين الزاوية","مكيرة","واضية","بوغني","تيزي نثلاثة","آيت يحيى موسى","أقني قغران","آيت بوعدو","أسي يوسف"] },
  { council: "تيزي وزو", court: "عين الحمام", municipalities: ["عين الحمام","أقبيل","افرحونن","آيت يحيى","أبي يوسف","أليلتين","أمسوحال"] },
  { council: "تيزي وزو", court: "الأربعاء نايت إراثن", municipalities: ["الأربعاء نايت إراثن","أرجن","تيزي راشد","آيت أقواشة","آيت أومالو"] },
  { council: "تيزي وزو", court: "واسيف", municipalities: ["واسيف","آيت بومهدي","ياطفان","أبودرارن","آيت تودرت","بني يني"] },
  { council: "تيزي وزو", court: "تقزرت", municipalities: ["تقزرت","ماكودة","إيفليسن","بوجيمة","ميزرانة"] },
  { council: "تيزي وزو", court: "أزفون", municipalities: ["أزفون","أقرو","آيت شفعة"] },
  { council: "تيزي وزو", court: "واقنون", municipalities: ["واقنون","آيت عيسى ميمون","تيميزارت"] },
  { council: "تيزي وزو", court: "بني يني", municipalities: ["بني يني","إيبودرارن","ياطفان"] },
  
  // مجلس قضاء الجزائر
  { council: "الجزائر", court: "سيدي امحمد", municipalities: ["سيدي امحمد","الجزائر الوسطى","المدنية","المرادية"] },
  { council: "الجزائر", court: "باب الوادي", municipalities: ["باب الوادي","وادي قريش","بولوغين","الرايس حميدو","القصبة"] },
  { council: "الجزائر", court: "الحراش", municipalities: ["الحراش","بوروبة","باش جراح","وادي السمار","المقارية","الكاليتوس","براقي","سيدي موسى"] },
  { council: "الجزائر", court: "بئر مراد رايس", municipalities: ["بئر مراد رايس","بئر خادم","حيدرة","القبة","جسر قسنطينة"] },
  { council: "الجزائر", court: "حسين داي", municipalities: ["حسين داي","المقارية","القبة","بلوزداد"] },
  { council: "الجزائر", court: "الدار البيضاء", municipalities: ["الدار البيضاء","برج الكيفان","برج البحري","المرسى","المحمدية","عين طاية","هراوة"] },
  { council: "الجزائر", court: "الشراقة", municipalities: ["الشراقة","دالي إبراهيم","عين البنيان","الحمامات","أولاد فايت"] },
  { council: "الجزائر", court: "زرالدة", municipalities: ["زرالدة","سطاوالي","السويدانية","المعالمة","الرحمانية"] },
  { council: "الجزائر", court: "الرويبة", municipalities: ["الرويبة","الرغاية","هراوة"] },
  { council: "الجزائر", court: "بئر توتة", municipalities: ["بئر توتة","تسالة المرجة","أولاد شبل"] }
];

// بيانات المحاكم الإدارية
const adminJudicialData: Record<string, { court: string, appellate: string }> = {
  "الجزائر": { court: "المحكمة الإدارية بالجزائر", appellate: "المحكمة الإدارية الاستئنافية بالجزائر" },
  "البليدة": { court: "المحكمة الإدارية بالبليدة", appellate: "المحكمة الإدارية الاستئنافية بالجزائر" },
  "تيزي وزو": { court: "المحكمة الإدارية بتيزي وزو", appellate: "المحكمة الإدارية الاستئنافية بالجزائر" },
  "البويرة": { court: "المحكمة الإدارية بالبويرة", appellate: "المحكمة الإدارية الاستئنافية بالجزائر" },
  "بومرداس": { court: "المحكمة الإدارية ببومرداس", appellate: "المحكمة الإدارية الاستئنافية بالجزائر" },
  "تيبازة": { court: "المحكمة الإدارية بتيبازة", appellate: "المحكمة الإدارية الاستئنافية بالجزائر" },
  "الشلف": { court: "المحكمة الإدارية بالشلف", appellate: "المحكمة الإدارية الاستئنافية بوهران" },
  "وهران": { court: "المحكمة الإدارية بوهران", appellate: "المحكمة الإدارية الاستئنافية بوهران" },
  "قسنطينة": { court: "المحكمة الإدارية بقسنطينة", appellate: "المحكمة الإدارية الاستئنافية بقسنطينة" },
  "ورقلة": { court: "المحكمة الإدارية بورقلة", appellate: "المحكمة الإدارية الاستئنافية بورقلة" },
  "بشار": { court: "المحكمة الإدارية ببشار", appellate: "المحكمة الإدارية الاستئنافية ببشار" }
};

export default function JudicialHierarchy() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResult, setSelectedResult] = useState<{
    municipality: string;
    court: string;
    council: string;
    adminCourt: string;
    adminAppellate: string;
  } | null>(null);

  const suggestions = useMemo(() => {
    if (searchQuery.length < 2) return [];
    const results: any[] = [];
    judicialData.forEach(entry => {
      entry.municipalities.forEach(muni => {
        if (muni.includes(searchQuery)) {
          const admin = adminJudicialData[entry.council] || { 
            court: `المحكمة الإدارية بـ ${entry.council}`, 
            appellate: "المحكمة الإدارية الاستئنافية المختصة" 
          };
          results.push({
            municipality: muni,
            court: entry.court,
            council: `مجلس قضاء ${entry.council}`,
            adminCourt: admin.court,
            adminAppellate: admin.appellate
          });
        }
      });
    });
    return results.slice(0, 10);
  }, [searchQuery]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('تم نسخ النص بنجاح');
  };

  const handleWhatsApp = (text: string) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const resultText = selectedResult ? 
    `⚖️ الاختصاص الإقليمي لبلدية ${selectedResult.municipality}:\n` +
    `🏛️ المحكمة الابتدائية: ${selectedResult.court}\n` +
    `⚖️ مجلس القضاء: ${selectedResult.council}\n` +
    `🏢 المحكمة الإدارية: ${selectedResult.adminCourt}\n` +
    `🏛️ المحكمة الإدارية الاستئنافية: ${selectedResult.adminAppellate}` : '';

  return (
    <div className="space-y-6" dir="rtl">
      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
        <strong>💡 مبدأ العمل:</strong> تتيح لك هذه الأداة تحديد الاختصاص الإقليمي الدقيق لكل بلدية في الجزائر. ابحث عن اسم البلدية لتظهر لك كافة الجهات القضائية (العادية والإدارية) المختصة إقليمياً بنظر النزاعات المتعلقة بها، وفقاً للتنظيم القضائي الجزائري الحالي.
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          placeholder="اكتب اسم البلدية (مثلاً: القبة، بئر مراد رايس...)"
          className="w-full p-4 pr-12 rounded-2xl border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 focus:border-[#1a3a5c] dark:focus:border-[#f0c040] outline-none transition-all font-bold"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl">📍</span>

        {/* Suggestions Dropdown */}
        <AnimatePresence>
          {suggestions.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              {suggestions.map((res, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedResult(res);
                    setSearchQuery('');
                  }}
                  className="w-full p-4 text-right hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-50 dark:border-gray-800 last:border-none flex items-center justify-between group"
                >
                  <span className="font-bold text-gray-700 dark:text-gray-200">بلدية {res.municipality}</span>
                  <span className="text-xs text-gray-400 group-hover:text-[#1a3a5c] transition-colors">اختيار ⬅️</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Result Modal */}
      <AnimatePresence>
        {selectedResult && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800"
            >
              <div className="bg-[#1a3a5c] p-6 text-white flex justify-between items-center">
                <h3 className="text-xl font-black">نتائج الاختصاص الإقليمي</h3>
                <button onClick={() => setSelectedResult(null)} className="text-2xl hover:rotate-90 transition-transform">✕</button>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border-r-4 border-[#f0c040]">
                  <p className="text-sm text-gray-500 mb-1">البلدية المختارة</p>
                  <p className="text-2xl font-black text-[#1a3a5c] dark:text-white">بلدية {selectedResult.municipality}</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-lg">🏛️</span>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">المحكمة الابتدائية</p>
                      <p className="font-bold text-gray-700 dark:text-gray-200">{selectedResult.court}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-lg">⚖️</span>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">مجلس القضاء</p>
                      <p className="font-bold text-gray-700 dark:text-gray-200">{selectedResult.council}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center text-lg">🏢</span>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">المحكمة الإدارية</p>
                      <p className="font-bold text-gray-700 dark:text-gray-200">{selectedResult.adminCourt}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center text-lg">🏛️</span>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">المحكمة الإدارية الاستئنافية</p>
                      <p className="font-bold text-gray-700 dark:text-gray-200">{selectedResult.adminAppellate}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4">
                  <button 
                    onClick={() => handleCopy(resultText)}
                    className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                  >
                    <span>نسخ النتيجة</span>
                    <span>📋</span>
                  </button>
                  <button 
                    onClick={() => handleWhatsApp(resultText)}
                    className="bg-[#25D366] hover:bg-[#128C7E] text-white py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
                  >
                    <span>نشر عبر واتساب</span>
                    <span>📱</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Default View - Councils List */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {Array.from(new Set(judicialData.map(d => d.council))).map((council, idx) => (
          <button
            key={idx}
            onClick={() => setSearchQuery(council)}
            className="p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl hover:border-[#1a3a5c] dark:hover:border-[#f0c040] transition-all text-center group"
          >
            <p className="text-xs text-gray-400 mb-1">مجلس قضاء</p>
            <p className="font-black text-[#1a3a5c] dark:text-white group-hover:scale-110 transition-transform">{council}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
