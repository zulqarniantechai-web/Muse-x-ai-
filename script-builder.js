(() => {
  const byId = (id) => document.getElementById(id);

  const copyText = async (value, field) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        field.focus();
        field.select();
        if (!document.execCommand("copy")) throw new Error("copy failed");
      }
      return true;
    } catch (_) {
      return false;
    }
  };

  const cleanTopic = (value) => value.trim().replace(/\s+/g, " ");
  const readPoints = (value) => value
    .split(/\n+/)
    .map((item) => item.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 10);

  const templates = {
    ur: {
      documentary: {
        hook: (topic) => "کسی بھی موضوع کو سمجھنے کے لیے اس کا پس منظر، اہم واقعات اور اثرات جاننا ضروری ہے۔ آج ہم " + topic + " کو انہی زاویوں سے دیکھیں گے۔",
        point: (point, i) => "پہلا/اگلا اہم پہلو یہ ہے: " + point + "۔ اس نکتے کو سمجھنے کے لیے اس کا پس منظر دیکھیے، پھر اس کے اثرات پر غور کیجیے۔",
        close: "اب آپ کے سامنے " + "اس موضوع کی بنیادی تصویر واضح ہے۔ یاد رکھیں، کسی بھی نتیجے تک پہنچنے سے پہلے معلومات کے معتبر ذرائع ضرور دیکھیں۔"
      },
      educational: {
        hook: (topic) => "اگر آپ " + topic + " کو آسان الفاظ میں سمجھنا چاہتے ہیں، تو یہ ویڈیو آپ کے لیے ہے۔ آئیے بنیادی بات سے آغاز کرتے ہیں۔",
        point: (point) => "اہم نکتہ: " + point + "۔ اسے ایک سادہ مثال سے سمجھیں، تاکہ بات واضح ہو جائے۔",
        close: "تو یہ تھا " + "موضوع کو سمجھنے کا آسان طریقہ۔ ویڈیو مفید لگی ہو تو اسے محفوظ کریں اور مزید ایسی ویڈیوز کے لیے فالو کریں۔"
      },
      suspense: {
        hook: (topic) => topic + " کے بارے میں ایک اہم سوال ہے: آخر اس کے پیچھے اصل وجہ کیا ہے؟ آئیے اشاروں اور دستیاب حقائق کی مدد سے اسے سمجھتے ہیں۔",
        point: (point) => "اب اگلا اشارہ دیکھیے: " + point + "۔ لیکن اس نکتے کو حتمی حقیقت سمجھنے سے پہلے اس کی تصدیق ضرور کریں۔",
        close: "اب اصل تصویر پہلے سے زیادہ واضح ہے، لیکن ہر دعوے کی تصدیق ضروری ہے۔ آپ کے خیال میں اس موضوع کا سب سے اہم پہلو کون سا ہے؟"
      },
      motivational: {
        hook: (topic) => "کبھی کبھی ایک نئی سوچ ہمارے کام کرنے کا انداز بدل دیتی ہے۔ آج " + topic + " سے جڑے چند عملی نکات دیکھتے ہیں۔",
        point: (point) => "یہاں سے ایک سبق ملتا ہے: " + point + "۔ سوچیں کہ آپ اس بات کو اپنی روزمرہ زندگی میں کیسے آزما سکتے ہیں۔",
        close: "یاد رکھیں، صرف جاننا کافی نہیں؛ چھوٹا سا عملی قدم بھی اہم ہوتا ہے۔ آج ہی ایک قدم اٹھائیں اور اپنی پیش رفت نوٹ کریں۔"
      },
      story: {
        hook: (topic) => "تصور کریں کہ آپ کے سامنے " + topic + " سے جڑا ایک سوال آتا ہے۔ آپ اس کا جواب کیسے تلاش کریں گے؟ آئیے اسی سفر کا آغاز کرتے ہیں۔",
        point: (point) => "کہانی کا اگلا حصہ ہمیں یہ بات دکھاتا ہے: " + point + "۔ اسے ایک حقیقی مثال یا واقعے کے ذریعے واضح کریں۔",
        close: "اور اس طرح ہم اس موضوع کے اہم پہلوؤں تک پہنچتے ہیں۔ آپ اس کہانی سے کیا سیکھتے ہیں؟ اپنی رائے ضرور بتائیں۔"
      }
    },
    roman: {
      documentary: {
        hook: (topic) => "Kisi bhi mauzoo ko samajhne ke liye us ka pas-e-manzar, aham waqiat aur asraat jaan'na zaroori hai. Aaj hum " + topic + " ko inhi pehluon se dekhenge.",
        point: (point) => "Agla aham pehlu yeh hai: " + point + ". Is nuqtay ka pas-e-manzar samjhein aur phir is ke asraat par ghaur karein.",
        close: "Ab is mauzoo ki bunyadi tasveer aap ke samne hai. Kisi natijay par pohanchne se pehle maloomat ke mustanad zaraye zaroor check karein."
      },
      educational: {
        hook: (topic) => "Agar aap " + topic + " ko asaan alfaaz mein samajhna chahte hain, to yeh video aap ke liye hai. Aaiye bunyadi baat se shuru karte hain.",
        point: (point) => "Aham nuqta: " + point + ". Isay ek saada misaal se samjhein taa-ke baat wazeh ho jaye.",
        close: "To yeh tha is mauzoo ko samajhne ka asaan tareeqa. Video mufeed lagi ho to save karein aur mazeed videos ke liye follow karein."
      },
      suspense: {
        hook: (topic) => topic + " ke baare mein ek aham sawal hai: aakhir is ke peechay asal wajah kya hai? Aaiye dastiyab haqaiq ki madad se samajhte hain.",
        point: (point) => "Ab agla ishara dekhein: " + point + ". Is nuqtay ko final haqeeqat samajhne se pehle tasdeeq zaroor karein.",
        close: "Ab asal tasveer zyada wazeh hai, lekin har daaway ki tasdeeq zaroori hai. Aap ke khayal mein sab se aham pehlu kaunsa hai?"
      },
      motivational: {
        hook: (topic) => "Kabhi kabhi ek nayi soch hamara kaam karne ka andaaz badal deti hai. Aaj " + topic + " se juray chand amli nuqaat dekhte hain.",
        point: (point) => "Yahan se ek sabaq milta hai: " + point + ". Sochiye ke aap is baat ko rozmarra zindagi mein kaise apna sakte hain.",
        close: "Sirf jaanna kaafi nahi; chhota sa amli qadam bhi aham hota hai. Aaj hi ek qadam uthayein."
      },
      story: {
        hook: (topic) => "Tasawwur karein ke aap ke samne " + topic + " se jura ek sawal aata hai. Aap iska jawab kaise talash karein ge? Aaiye safar shuru karte hain.",
        point: (point) => "Kahani ka agla hissa yeh baat dikhata hai: " + point + ". Isay kisi haqeeqi misaal ya waqay se wazeh karein.",
        close: "Aur is tarah hum is mauzoo ke aham pehluon tak pohanchte hain. Aap ne is se kya seekha?"
      }
    },
    en: {
      documentary: {
        hook: (topic) => "To understand any subject, we need to look at its background, key events, and impact. Today, we are exploring " + topic + " from those angles.",
        point: (point) => "Here is another important point: " + point + ". Explain the background, then show why its impact matters.",
        close: "You now have a clearer picture of the subject. Before accepting a conclusion, verify the information with reliable sources."
      },
      educational: {
        hook: (topic) => "Want to understand " + topic + " in simple terms? This video breaks it down step by step. Let's start with the basics.",
        point: (point) => "Key point: " + point + ". Make this easier to understand with one clear, relevant example.",
        close: "That is the simple breakdown. Save this video and follow for more clear explanations."
      },
      suspense: {
        hook: (topic) => "There is one important question about " + topic + ": what is really behind it? Let's examine the available clues and verified facts.",
        point: (point) => "Now consider this clue: " + point + ". Check the evidence before treating this as a confirmed fact.",
        close: "The picture is becoming clearer, but every claim still needs verification. What do you think is the most important part?"
      },
      motivational: {
        hook: (topic) => "Sometimes one new idea can change the way we act. Today, let's explore practical lessons connected to " + topic + ".",
        point: (point) => "Here is a lesson to consider: " + point + ". Think about one practical way to apply it in daily life.",
        close: "Knowing is only the first step. Choose one small action and start today."
      },
      story: {
        hook: (topic) => "Imagine you are faced with a question about " + topic + ". How would you find the answer? Let's begin that journey.",
        point: (point) => "The next part of the story reveals this: " + point + ". Support it with a real example or event.",
        close: "And that brings us to the key parts of this subject. What did you take away from this story?"
      }
    }
  };

  const platformCta = (platform, lang) => {
    if (lang === "en") return platform === "youtube"
      ? "If you found this useful, like the video, subscribe, and share it with someone who may need it."
      : "Follow for more, and share this video with someone who may find it useful.";
    if (lang === "roman") return platform === "youtube"
      ? "Video mufeed lagi ho to like karein, channel subscribe karein aur kisi dost ke saath share karein."
      : "Mazeed videos ke liye follow karein aur isay kisi dost ke saath share karein.";
    return platform === "youtube"
      ? "ویڈیو مفید لگی ہو تو لائک کریں، چینل سبسکرائب کریں اور اسے کسی دوست کے ساتھ شیئر کریں۔"
      : "مزید ویڈیوز کے لیے فالو کریں اور اسے کسی دوست کے ساتھ شیئر کریں۔";
  };

  const build = ({ topic, points, style, lang, platform, length }) => {
    const pack = templates[lang][style];
    const placeholder = lang === "en"
      ? ["[Add one verified fact about the topic]", "[Add a cause, example, or supporting detail]", "[Add the result or impact]"]
      : lang === "roman"
        ? ["[Mauzoo ke baare mein pehli tasdeeq-shuda maloomat likhein]", "[Wajah, misaal ya mazeed tafseel likhein]", "[Natija ya asar likhein]"]
        : ["[موضوع کے بارے میں پہلی مصدقہ حقیقت شامل کریں]", "[وجہ، مثال یا مزید تفصیل شامل کریں]", "[نتیجہ یا اثر شامل کریں]"];
    const chosenPoints = points.length ? points : placeholder;
    const body = chosenPoints.map((point, index) => {
      const sentence = pack.point(point, index);
      return (index + 1) + ". " + sentence;
    }).join("\n\n");

    const title = lang === "en" ? "Topic: " + topic
      : lang === "roman" ? "Mauzoo: " + topic
      : "موضوع: " + topic;

    const labelHook = lang === "en" ? "HOOK" : lang === "roman" ? "HOOK" : "ابتدائی جملے";
    const labelVoice = lang === "en" ? "VOICE-OVER SCRIPT" : lang === "roman" ? "VOICE-OVER SCRIPT" : "وائس اوور اسکرپٹ";
    const labelEnd = lang === "en" ? "ENDING" : lang === "roman" ? "ENDING" : "اختتام";
    const duration = ({ "30": "30 seconds", "60": "1 minute", "120": "2 minutes", "300": "5 minutes", "600": "10 minutes" })[length];

    return title + "\nTarget length: " + duration + " (approximate)\n\n" +
      labelHook + "\n" + pack.hook(topic) + "\n\n" +
      labelVoice + "\n" + body + "\n\n" +
      labelEnd + "\n" + pack.close + " " + platformCta(platform, lang);
  };

  const init = () => {
    const topic = byId("builderTopic");
    const output = byId("generatedScript");
    const status = byId("builderStatus");
    if (!topic || !output || !status) return;

    byId("buildScript").addEventListener("click", () => {
      const clean = cleanTopic(topic.value);
      if (!clean) {
        status.textContent = "پہلے ویڈیو کا موضوع درج کریں۔";
        topic.focus();
        return;
      }
      if (clean.length > 180) {
        status.textContent = "موضوع 180 حروف سے کم رکھیں۔";
        return;
      }
      const points = readPoints(byId("builderPoints").value);
      output.value = build({
        topic: clean,
        points,
        style: byId("builderStyle").value,
        lang: byId("builderLanguage").value,
        platform: byId("builderPlatform").value,
        length: byId("builderLength").value
      });
      status.textContent = points.length
        ? "اسکرپٹ ڈرافٹ تیار ہے۔ اپنے حقائق اور جملے ضرور چیک کریں۔"
        : "ٹیمپلیٹ تیار ہے، مگر خالی جگہوں پر اپنی مصدقہ معلومات شامل کریں۔";
    });

    byId("useScript").addEventListener("click", () => {
      if (!output.value.trim()) {
        status.textContent = "پہلے اسکرپٹ تیار کریں۔";
        return;
      }
      const mainScript = byId("script");
      mainScript.value = output.value;
      mainScript.focus();
      mainScript.scrollIntoView({ behavior: "smooth", block: "center" });
      status.textContent = "اسکرپٹ ویڈیو والے خانے میں منتقل ہوگئی۔";
    });

    byId("copyScript").addEventListener("click", async () => {
      if (!output.value.trim()) {
        status.textContent = "پہلے اسکرپٹ تیار کریں۔";
        return;
      }
      status.textContent = await copyText(output.value, output)
        ? "اسکرپٹ کاپی ہوگئی۔"
        : "کاپی نہیں ہوسکی؛ اسکرپٹ منتخب کرکے دستی طور پر کاپی کریں۔";
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
