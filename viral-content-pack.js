(() => {
  const $ = (id) => document.getElementById(id);
  const topicEl = $('packTopic');
  if (!topicEl) return;

  const clean = (value) => String(value || '').trim().replace(/[\\r\\n]+/g, ' ').slice(0, 220);
  const titleEl = $('packTitles');
  const hookEl = $('packHooks');
  const thumbEl = $('packThumbs');
  const statusEl = $('packStatus');

  function generatePack() {
    const topic = clean(topicEl.value || $('vrTopic')?.value || $('builderTopic')?.value);
    if (!topic) {
      statusEl.textContent = 'پہلے ویڈیو کا موضوع درج کریں۔';
      return;
    }

    const audience = clean($('packAudience').value) || 'عام ناظرین';
    const style = $('packStyle').value;
    const language = $('packLanguage').value;
    const script = clean($('generatedScript')?.value);
    const facts = clean($('builderPoints')?.value);
    const proof = facts || clean($('vrExamples')?.value);
    const safeClaim = proof ? 'درج کردہ معلومات کی بنیاد پر' : 'اس موضوع پر دستیاب مصدقہ حقائق شامل کرکے';

    const titleTemplates = {
      documentary: [
        topic + ': وہ حقیقت جو اکثر لوگ نہیں جانتے',
        topic + ' کی مکمل کہانی | اہم حقائق اور پس منظر',
        topic + ' کے پیچھے اصل معاملہ کیا ہے؟'
      ],
      suspense: [
        topic + ': آخر حقیقت کیا ہے؟',
        topic + ' کا حیران کن پہلو — حقیقت جانیں',
        'کیا آپ نے کبھی سوچا کہ ' + topic + ' کے پیچھے کیا ہے؟'
      ],
      educational: [
        topic + ' آسان الفاظ میں سمجھیں',
        topic کے ساتھ ' — 3 اہم باتیں جو جاننا ضروری ہیں',
        topic + ': بنیادی باتیں اور اہم مثالیں'
      ],
      viral: [
        topic + ': یہ بات آپ کو معلوم ہونی چاہیے',
        topic + ' کے بارے میں 3 اہم سوالات',
        'لوگ ' + topic + ' کے بارے میں کیا جاننا چاہتے ہیں؟'
      ]
    };
    const titles = titleTemplates[style] || titleTemplates.documentary;
    const hooks = [
      'ایک لمحے کے لیے سوچیں: ' + topic + ' ہماری توقع سے مختلف کیوں ہو سکتا ہے؟',
      'اس ویڈیو میں ہم ' + topic + ' کے بارے میں ' + safeClaim + ' بات کریں گے۔',
      'آخر تک دیکھیے، کیونکہ ہم ' + topic + ' کے تین اہم پہلو واضح کریں گے۔'
    ];
    const thumbnails = [
      'بڑا متن: "' + topic + '" — ساتھ ایک واضح، متعلقہ تصویر',
      'موازنہ: "عام خیال" بمقابلہ "حقیقت" — صرف درست ہونے پر استعمال کریں',
      'سوالیہ انداز: "اصل حقیقت کیا ہے؟" — موضوع کی متعلقہ تصویر کے ساتھ'
    ];

    const langNote = language === 'English' ? 'Write final title/thumbnail text in natural English.'
      : language === 'Roman Urdu' ? 'Final wording Roman Urdu mein likhein.'
      : 'عنوان اور تھمب نیل کا متن سادہ اردو میں رکھیں۔';

    titleEl.value = titles.map((t, i) => (i + 1) + '. ' + t).join('\\n');
    hookEl.value = hooks.map((t, i) => (i + 1) + '. ' + t).join('\\n');
    thumbEl.value = thumbnails.map((t, i) => (i + 1) + '. ' + t).join('\\n')
      + '\\n\\nہدفی ناظرین: ' + audience
      + '\\nزبان کی ہدایت: ' + langNote
      + '\\n\\nتھمب نیل اصول: ایک مرکزی فوکس، زیادہ سے زیادہ 2 تا 5 مختصر الفاظ، واضح contrast، موبائل پر پڑھنے کے قابل۔ گمراہ کن تصویر یا جھوٹا دعویٰ نہ کریں۔';

    if (script) {
      hookEl.value += '\\n\\nاسکرپٹ سے متعلقہ ابتدائی لائن: ' + script.slice(0, 170) + (script.length > 170 ? '…' : '');
    }
    statusEl.textContent = '3 عنوانات، 3 ہُکس اور 3 تھمب نیل آئیڈیاز تیار ہیں۔ اشاعت سے پہلے دعوے اور حقائق verify کریں۔';
  }

  $('buildContentPack').addEventListener('click', generatePack);
  $('copyContentPack').addEventListener('click', async () => {
    const content = [
      'VIDEO TITLES\\n' + titleEl.value,
      'HOOKS\\n' + hookEl.value,
      'THUMBNAIL IDEAS\\n' + thumbEl.value
    ].join('\\n\\n');
    if (!titleEl.value.trim()) {
      statusEl.textContent = 'پہلے آئیڈیاز تیار کریں۔';
      return;
    }
    try {
      await navigator.clipboard.writeText(content);
      statusEl.textContent = 'تمام عنوانات، ہُکس اور تھمب نیل آئیڈیاز کاپی ہوگئے۔';
    } catch {
      titleEl.focus();
      titleEl.select();
      statusEl.textContent = 'عنوانات منتخب ہیں؛ باقی حصے الگ کاپی کریں۔';
    }
  });

  $('usePackTopic').addEventListener('click', () => {
    const topic = clean(topicEl.value || $('vrTopic')?.value);
    if (!topic) {
      statusEl.textContent = 'پہلے موضوع درج کریں۔';
      return;
    }
    const target = $('builderTopic');
    if (target) target.value = topic;
    const points = $('builderPoints');
    if (points && !points.value.trim()) points.value = clean($('vrExamples')?.value);
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    statusEl.textContent = 'موضوع Script Builder میں منتقل ہوگیا۔';
  });
})();