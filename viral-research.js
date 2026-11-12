(() => {
  const $ = (id) => document.getElementById(id);
  const form = $('viralResearchForm');
  if (!form) return;

  const fields = {
    niche: $('vrNiche'),
    topic: $('vrTopic'),
    audience: $('vrAudience'),
    language: $('vrLanguage'),
    region: $('vrRegion'),
    interest: $('vrInterest'),
    competition: $('vrCompetition'),
    gap: $('vrGap'),
    freshness: $('vrFreshness'),
    examples: $('vrExamples'),
    output: $('vrOutput'),
    status: $('vrStatus')
  };

  const scoreValue = (value, map) => map[value] ?? 0;
  const interestScore = { high: 35, medium: 23, low: 10, unknown: 0 };
  const competitionScore = { low: 25, medium: 16, high: 7, unknown: 0 };
  const gapScore = { strong: 25, some: 15, weak: 5, unknown: 0 };
  const freshnessScore = { current: 15, evergreen: 12, fading: 3, unknown: 0 };

  function buildBrief() {
    const niche = fields.niche.value.trim();
    const topic = fields.topic.value.trim();
    if (!niche || !topic) {
      fields.status.textContent = 'براہِ کرم چینل کا موضوع اور ریسرچ ٹاپک درج کریں۔';
      return;
    }

    const score = scoreValue(fields.interest.value, interestScore)
      + scoreValue(fields.competition.value, competitionScore)
      + scoreValue(fields.gap.value, gapScore)
      + scoreValue(fields.freshness.value, freshnessScore);

    const scoreLabel = score >= 80 ? 'اچھا امکان — مزید تصدیق کریں'
      : score >= 55 ? 'درمیانہ امکان — منفرد زاویہ مضبوط کریں'
      : score > 0 ? 'کمزور یا ناکافی شواہد — مزید تحقیق کریں'
      : 'اسکور نہیں دیا جا سکتا — پہلے شواہد درج کریں';

    const examples = fields.examples.value.trim() || 'ابھی کوئی مثال درج نہیں کی گئی۔';
    const researchChecklist = [
      'YouTube Studio کے Trends ٹیب میں اپنے موضوع کے Top searches، Breakout videos اور Shorts content gaps دیکھیں۔',
      'Google Trends میں ملک، مدت اور متعلقہ search terms کا موازنہ کریں؛ صرف ایک spike کو مقبولیت کا ثبوت نہ سمجھیں۔',
      'YouTube پر اسی موضوع کی حالیہ ویڈیوز دیکھ کر upload date، views، comments اور ویڈیو کے زاویے نوٹ کریں۔',
      'کم از کم 3 متعلقہ ویڈیوز کے عنوان، تاریخ اور دستیاب اعدادوشمار درج کریں۔',
      'ایک ایسا سوال یا زاویہ منتخب کریں جسے موجودہ ویڈیوز نے اچھی طرح واضح نہ کیا ہو۔'
    ];

    const angles = [
      'کیا ہوا؟ — موضوع کی اصل کہانی مختصر اور واضح انداز میں',
      '3 اہم حقائق — صرف قابلِ تصدیق معلومات کے ساتھ',
      'عام غلط فہمی بمقابلہ حقیقت — معتبر حوالوں کی بنیاد پر',
      'کیا، کیوں اور آگے کیا؟ — وضاحت اور ممکنہ اثرات'
    ];

    const report = [
      'MUSE-X AI — VIRAL VIDEO RESEARCH BRIEF',
      '---------------------------------------',
      'چینل / نِش: ' + niche,
      'ریسرچ ٹاپک: ' + topic,
      'ہدفی ناظرین: ' + (fields.audience.value.trim() || 'متعین نہیں'),
      'زبان: ' + fields.language.value,
      'علاقہ: ' + fields.region.value,
      '',
      'ابتدائی ریسرچ اسکور: ' + score + '/100',
      'تشریح: ' + scoreLabel,
      '',
      'آپ کے درج کردہ شواہد:',
      'سرچ دلچسپی: ' + fields.interest.options[fields.interest.selectedIndex].text,
      'مقابلہ: ' + fields.competition.options[fields.competition.selectedIndex].text,
      'Content gap: ' + fields.gap.options[fields.gap.selectedIndex].text,
      'موضوع کی تازگی: ' + fields.freshness.options[fields.freshness.selectedIndex].text,
      '',
      'مقابل ویڈیوز / لنکس / نوٹس:',
      examples,
      '',
      'ریسرچ چیک لسٹ:',
      ...researchChecklist.map((item, i) => (i + 1) + '. ' + item),
      '',
      'ممکنہ ویڈیو زاویے (آئیڈیاز، تصدیق شدہ حقائق نہیں):',
      ...angles.map((item, i) => (i + 1) + '. ' + item),
      '',
      'اگلا قدم:',
      'منتخب زاویے کے لیے 3 معتبر ذرائع سے حقائق verify کریں، پھر MUSE-X Script Builder میں اسکرپٹ ڈرافٹ بنائیں۔',
      '',
      'اہم: یہ اسکور صرف آپ کے درج کردہ inputs پر مبنی ایک سادہ planning heuristic ہے؛ یہ YouTube کی اندرونی analytics، خودکار live trend data یا viral ہونے کی پیش گوئی نہیں۔'
    ].join('\n');

    fields.output.value = report;
    fields.status.textContent = 'ریسرچ بریف تیار ہے۔ اسکور صرف آپ کے فراہم کردہ شواہد پر مبنی ہے۔';
  }

  $('buildViralBrief').addEventListener('click', buildBrief);
  $('copyViralBrief').addEventListener('click', async () => {
    if (!fields.output.value.trim()) {
      fields.status.textContent = 'پہلے ریسرچ بریف تیار کریں۔';
      return;
    }
    try {
      await navigator.clipboard.writeText(fields.output.value);
      fields.status.textContent = 'ریسرچ بریف کاپی ہوگیا۔';
    } catch {
      fields.output.focus();
      fields.output.select();
      fields.status.textContent = 'متن منتخب کردیا ہے؛ Copy استعمال کریں۔';
    }
  });

  $('sendViralTopicToScript').addEventListener('click', () => {
    const topic = fields.topic.value.trim();
    if (!topic) {
      fields.status.textContent = 'پہلے ریسرچ ٹاپک درج کریں۔';
      return;
    }
    const builderTopic = $('builderTopic');
    if (builderTopic) builderTopic.value = topic;
    const points = $('builderPoints');
    if (points) points.value = 'ریسرچ بریف سے مصدقہ حقائق اور ذرائع شامل کریں۔\n' + (fields.examples.value.trim() || '');
    if (builderTopic) builderTopic.scrollIntoView({ behavior: 'smooth', block: 'center' });
    fields.status.textContent = 'موضوع Script Builder میں منتقل ہوگیا۔ پہلے حقائق verify کریں۔';
  });

  $('vrYoutubeSearch').addEventListener('click', () => {
    const topic = fields.topic.value.trim() || fields.niche.value.trim();
    if (!topic) {
      fields.status.textContent = 'YouTube پر تلاش کے لیے موضوع درج کریں۔';
      return;
    }
    const query = encodeURIComponent(topic + ' ' + fields.language.value);
    window.open('https://www.youtube.com/results?search_query=' + query, '_blank', 'noopener,noreferrer');
  });
})();