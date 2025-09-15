// עוזרים קצרים
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

// משתנים עיקריים
const flow = $("#qflow");
const panels = $$(".q", flow);
const bar = $("#bar");
const counter = $("#counter");
const footer = document.querySelector(".footer");
let activeIndex = 0;
let animating = false;

// ולידציה לפאנל
function validatePanel(idx) {
  const q = panels[idx];
  if (!q) return true;
  if (q.classList.contains("tf")) {
    const input = q.querySelector("input, textarea, select");
    const check =
      input && input.type === "checkbox"
        ? input.checked
        : (input?.value || "").trim();
    const ok = !!check;
    q.classList.toggle("invalid", !ok);
    return ok;
  }
  // למסך הראשון (classic)
  let ok = true;
  $$(".field", q).forEach((box) => {
    const input = box.querySelector("input, textarea, select");
    if (!input) return;
    let v =
      input.type === "checkbox" ? input.checked : (input.value || "").trim();
    if (input.type === "email" && v) {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!re.test(v)) {
        ok = false;
        box.classList.add("invalid");
      } else box.classList.remove("invalid");
    } else if (input.name === "phone" && v) {
      const re = /^0\d{1,2}-?\d{7}$/;
      if (!re.test(v)) {
        ok = false;
        box.classList.add("invalid");
      } else box.classList.remove("invalid");
    } else {
      if (!v) {
        ok = false;
        box.classList.add("invalid");
      } else box.classList.remove("invalid");
    }
  });
  return ok;
}

// עדכון פס התקדמות ומונה
// function updateProgress(i) {
//   const total = panels.length;
//   const p = i / Math.max(total - 1, 1);
//   bar.style.insetInlineEnd = `${100 - Math.round(p * 100)}%`;
//   counter.textContent = `${Math.min(i + 1, total)} / ${total}`;
// }

function updateProgress(i) {
  const total = panels.length;
  const p = i / Math.max(total - 1, 1);
  const pct = Math.round(p * 100);

  // פה bar הוא ה־<span>
  bar.style.width = pct + "%";

  counter.textContent = `${Math.min(i + 1, total)} / ${total}`;
}

// הצגת/הסתרת פוטר
function toggleFooter(forPanel) {
  if (!footer) return;
  const hide = forPanel?.hasAttribute("data-no-footer");
  footer.classList.toggle("hidden", !!hide);
}

// ניווט בין פאנלים עם אנימציה
function goTo(i) {
  const target = Math.max(0, Math.min(i, panels.length - 1));
  if (animating) return;
  const start = flow.scrollTop;
  const end = target * flow.clientHeight;
  const duration = 900;
  const startTime = performance.now();
  animating = true;
  const prevSnap = flow.style.scrollSnapType;
  flow.style.scrollSnapType = "none";
  function animate(now) {
    const t = Math.min(1, (now - startTime) / duration);
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    flow.scrollTop = start + (end - start) * ease;
    if (t < 1) {
      requestAnimationFrame(animate);
    } else {
      flow.scrollTop = end;
      flow.style.scrollSnapType = prevSnap || "y mandatory";
      animating = false;
      toggleFooter(panels[target]);
    }
  }
  requestAnimationFrame(animate);
}

// תצפית על פאנלים
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting && e.intersectionRatio > 0.6) {
        const i = panels.indexOf
          ? panels.indexOf(e.target)
          : Array.from(panels).indexOf(e.target);
        activeIndex = i;
        updateProgress(i);
        toggleFooter(e.target);
        const inp = e.target.querySelector("input, textarea, select");
        if (inp) setTimeout(() => inp.focus({ preventScroll: true }), 40);
      }
    });
  },
  { root: flow, threshold: [0.6] }
);
panels.forEach((q) => io.observe(q));

// גלגלת – ניווט בין פאנלים
flow.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    if (animating) return;
    const dir = Math.sign(e.deltaY);
    if (dir > 0) goTo(activeIndex + 1);
    else if (dir < 0) goTo(activeIndex - 1);
  },
  { passive: false }
);

// מקשים – ניווט
flow.addEventListener("keydown", (e) => {
  const tag = (e.target.tagName || "").toLowerCase();
  const isTextarea = tag === "textarea";
  if (e.key === "Enter" && !e.shiftKey && !isTextarea) {
    e.preventDefault();
    goTo(activeIndex + 1);
  } else if (e.key === "PageDown" || e.key === "ArrowDown") {
    e.preventDefault();
    goTo(activeIndex + 1);
  } else if (e.key === "PageUp" || e.key === "ArrowUp") {
    e.preventDefault();
    goTo(activeIndex - 1);
  }
});

// כפתורי ניווט
$("#prevBtn")?.addEventListener("click", () => goTo(activeIndex - 1));
$("#nextBtn")?.addEventListener("click", () => goTo(activeIndex + 1));
$$("[data-next]").forEach((btn) =>
  btn.addEventListener("click", () => goTo(activeIndex + 1))
);

// איסוף נתונים ושליחה ל-n8n
function serializeForm() {
  const data = {};
  $$(
    '#qflow input:not([name$="[]"]), #qflow textarea:not([name$="[]"]), #qflow select:not([name$="[]"])'
  ).forEach((inp) => {
    if (!inp.name) return;
    data[inp.name] = inp.type === "checkbox" ? !!inp.checked : inp.value ?? "";
  });
  // מתחרים
  const compNames = $$('input[name="competitor_name[]"]');
  const compUrls = $$('input[name="competitor_url[]"]');
  const compNotes = $$('input[name="competitor_note[]"]');
  const competitors = [];
  const compLen = Math.max(compNames.length, compUrls.length, compNotes.length);
  for (let i = 0; i < compLen; i++) {
    const name = compNames[i]?.value?.trim() || "";
    const url = compUrls[i]?.value?.trim() || "";
    const note = compNotes[i]?.value?.trim() || "";
    if (name || url || note) competitors.push({ name, url, note });
  }
  if (competitors.length) data.competitors = competitors;
  // רפרנסים
  const refTitles = $$('input[name="ref_title[]"]');
  const refUrls = $$('input[name="ref_url[]"]');
  const refNotes = $$('input[name="ref_note[]"]');
  const references = [];
  const refLen = Math.max(refTitles.length, refUrls.length, refNotes.length);
  for (let i = 0; i < refLen; i++) {
    const title = refTitles[i]?.value?.trim() || "";
    const url = refUrls[i]?.value?.trim() || "";
    const note = refNotes[i]?.value?.trim() || "";
    if (title || url || note) references.push({ title, url, note });
  }
  if (references.length) data.references = references;
  // מטא
  data._meta = {
    userAgent: navigator.userAgent,
    ts: new Date().toISOString(),
    path: location.pathname,
  };
  return data;
}

// שליחת נתונים לשרת
async function postToN8N(payload) {
  //   const webhookUrl = "https://n8n.scale4u.com/webhook/Details1";
  const webhookUrl =
    "https://n8n.srv972112.hstgr.cloud/webhook/f7cb8648-a328-484e-825a-c14fa29acbfa";
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (_) {}
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} – ${text || res.statusText}`);
  }
  return json ?? { ok: true, raw: text };
}

// אירוע שליחה
$("#submitBtn")?.addEventListener("click", async () => {
  let allOk = true;
  for (let i = 0; i < panels.length; i++) {
    if (!validatePanel(i)) allOk = false;
  }
  if (!allOk) {
    alert("יש שדות שחייבים למלא לפני שליחה.");
    return;
  }
  const payload = serializeForm();
  console.log("Submitting payload:", payload);
  const btn = $("#submitBtn");
  btn.disabled = true;
  const oldTxt = btn.textContent;
  btn.textContent = "שולח...";
  const loader = document.getElementById("loader");
  if (loader) {
    loader.classList.remove("hide");
  }
  try {
    const resp = await postToN8N(payload);
    console.log("n8n response:", resp);
    showSuccessPopup();
    $$("#qflow input, #qflow textarea").forEach((el) => {
      if (el.type === "checkbox") el.checked = false;
      else el.value = "";
    });
    goTo(0);
  } catch (err) {
    console.error(err);
    alert("שליחה נכשלה. נסה/י שוב בעוד רגע.");
  } finally {
    btn.disabled = false;
    btn.textContent = oldTxt;
    if (loader) {
      loader.classList.add("hide");
      loader.addEventListener("transitionend", () => loader.remove(), {
        once: true,
      });
    }
  }
});

// אתחול ראשוני
updateProgress(0);
toggleFooter(panels[0]);
const first = panels[0]?.querySelector("input, textarea, select");
if (first) first.focus({ preventScroll: true });

// לואדר – Splash קצר בעלייה
document.addEventListener("DOMContentLoaded", () => {
  const loader = document.getElementById("loader");
  if (!loader) return;
  setTimeout(() => {
    loader.classList.add("hide");
    loader.addEventListener("transitionend", () => loader.remove(), {
      once: true,
    });
  }, 2000);
});

// Popup Logic
function showSuccessPopup() {
  const popup = document.getElementById("successPopup");
  if (!popup) return;
  popup.style.display = "flex";
  popup.setAttribute("aria-hidden", "false");
  clearTimeout(showSuccessPopup._t);
  showSuccessPopup._t = setTimeout(closePopup, 3000);
}

function closePopup() {
  const popup = document.getElementById("successPopup");
  if (!popup) return;
  popup.style.display = "none";
  popup.setAttribute("aria-hidden", "true");
}

// סגירת פופאפ בלחיצה או Escape
document.addEventListener("click", (e) => {
  const popup = document.getElementById("successPopup");
  if (!popup || popup.style.display === "none") return;
  if (e.target.matches(".close-btn") || e.target === popup) closePopup();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closePopup();
});

// דוגמה: חיבור לאירוע שליחת טופס אמיתי
const _form = document.querySelector("form");
if (_form) {
  _form.addEventListener("submit", (e) => {
    e.preventDefault();
    showSuccessPopup();
  });
}
