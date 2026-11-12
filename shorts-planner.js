(() => {
  const $ = (id) => document.getElementById(id);
  const splitSentences = (value) => value
    .replace(/\r/g, "")
    .split(/[\n۔.!?]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 2);

  const visualIdeas = [
    "موضوع سے متعلق واضح establishing shot یا wide shot",
    "متعلقہ چیز کا close-up؛ اہم تفصیل پر فوکس",
    "B-roll: عمل، جگہ یا مثال دکھانے والا مختصر کلپ",
    "سادہ نقشہ، ٹائم لائن یا نمبر والی گرافک",
    "پہلے اور بعد کا تقابل یا دو چیزوں کا موازنہ",
    "اہم نکتے کے لیے kinetic text اور ہلکا zoom",
    "اختتامی visual؛ سوال یا مرکزی خیال کو نمایاں کریں"
  ];

  const makePlan = (script, duration, style) => {
    const sentences = splitSentences(script);
    if (!sentences.length) return null;
    const seconds = Number(duration);
    const count = Math.min(7, Math.max(3, Math.min(sentences.length, Math.ceil(seconds / 8))));
    const chunks = Array.from({ length: count }, (_, i) => {
      const start = Math.floor(i * sentences.length / count);
      const end = Math.floor((i + 1) * sentences.length / count);
      return sentences.slice(start, Math.max(start + 1, end)).join("۔ ");
    }).filter(Boolean);
    const sceneDuration = seconds / chunks.length;
    const title = style === "documentary" ? "ڈاکومنٹری اسٹائل" : style === "fast" ? "تیز رفتار Shorts" : "سادہ معلوماتی انداز";
    const lines = [
      "MUSE-X AI — SHORTS PLANNER",
      "فارمیٹ: عمودی 9:16 | ہدف: " + seconds + " سیکنڈ | انداز: " + title,
      "نوٹ: یہ ایڈیٹنگ پلان ہے؛ کلپس خودکار طور پر ڈاؤن لوڈ یا ویڈیو میں شامل نہیں کیے گئے۔",
      ""
    ];
    let cursor = 0;
    chunks.forEach((voice, index) => {
      const from = Math.round(cursor);
      cursor += sceneDuration;
      const to = index === chunks.length - 1 ? seconds : Math.round(cursor);
      const visual = visualIdeas[index % visualIdeas.length];
      const overlay = voice.length > 62 ? voice.slice(0, 59).trim() + "…" : voice;
      lines.push(
        "SCENE " + (index + 1) + " — " + from + "s تا " + to + "s",
        "وائس اوور: " + voice,
        "ویژول / کلپ: " + visual,
        "اسکرین ٹیکسٹ: " + overlay,
        "ایڈیٹنگ: " + (style === "fast" ? "ہر 1–2 سیکنڈ میں cut، captions اور مناسب zoom" : "نرم cut، واضح captions اور ضرورت کے مطابق zoom"),
        ""
      );
    });
    lines.push(
      "اختتامی چیک لسٹ",
      "• پہلے 2 سیکنڈ میں مضبوط hook دکھائیں۔",
      "• ہر scene کے لیے متعلقہ اور اجازت یافتہ ویڈیو/تصویر استعمال کریں۔",
      "• captions کو محفوظ جگہ پر رکھیں؛ کناروں سے دور۔",
      "• موسیقی کم رکھیں تاکہ وائس اوور صاف سنائی دے۔",
      "• حقائق، کلپس کے حقوق اور آواز کی مطابقت چیک کریں۔",
      "• 1080 × 1920، MP4، 9:16 میں export کریں۔"
    );
    return lines.join("\n");
  };

  const copy = async (text, field) => {
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
      else {
        field.focus();
        field.select();
        if (!document.execCommand("copy")) throw new Error("copy failed");
      }
      return true;
    } catch (_) { return false; }
  };

  const init = () => {
    const source = $("shortsSource");
    const output = $("shortsPlan");
    const status = $("shortsStatus");
    if (!source || !output || !status) return;

    $("loadShortsScript").addEventListener("click", () => {
      const current = $("generatedScript")?.value.trim() || $("script")?.value.trim() || "";
      if (!current) {
        status.textContent = "پہلے Script Builder سے اسکرپٹ بنائیں یا ویڈیو والے خانے میں پیسٹ کریں۔";
        return;
      }
      source.value = current;
      status.textContent = "اسکرپٹ Shorts Planner میں آگئی۔";
    });

    $("buildShortsPlan").addEventListener("click", () => {
      if (!source.value.trim()) {
        status.textContent = "پہلے اپنی اسکرپٹ درج کریں یا اوپر والے بٹن سے منتقل کریں۔";
        source.focus();
        return;
      }
      const plan = makePlan(source.value, $("shortsDuration").value, $("shortsStyle").value);
      if (!plan) {
        status.textContent = "اسکرپٹ میں قابلِ استعمال جملے نہیں ملے۔";
        return;
      }
      output.value = plan;
      status.textContent = "Shorts کا scene-by-scene پلان تیار ہے۔ کلپس آپ کو خود منتخب کرنے ہوں گے۔";
    });

    $("copyShortsPlan").addEventListener("click", async () => {
      if (!output.value.trim()) {
        status.textContent = "پہلے Shorts پلان بنائیں۔";
        return;
      }
      status.textContent = await copy(output.value, output)
        ? "Shorts پلان کاپی ہوگیا۔"
        : "کاپی نہیں ہوسکا؛ متن منتخب کرکے دستی طور پر کاپی کریں۔";
    });
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
