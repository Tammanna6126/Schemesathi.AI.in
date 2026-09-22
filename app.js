const schemes = [
  { id: "education", title: "National Scholarship Portal", category: "Education · Central Government", roles: ["student", "parent"], keywords: "education study college school scholarship fees", symbol: "◎", tone: "blue", fit: "98% potential fit", summary: "A single window for scholarships that support school and college students from eligible families.", eligibility: ["Students enrolled in a recognised school, college or university", "Income and category criteria vary by scholarship"], documents: ["Aadhaar card", "Income / caste certificate (if applicable)", "Bank account details", "Previous academic marksheet"], source: "scholarships.gov.in" },
  { id: "business", title: "PM SVANidhi", category: "Business · Central Government", roles: ["street-vendor"], keywords: "street vendor cart stall business working capital", symbol: "♨", tone: "orange", fit: "91% potential fit", summary: "Working-capital loans for street vendors to restart or grow their small business.", eligibility: ["Street vendors with a vending certificate or Letter of Recommendation", "Loans are available in stages, up to ₹50,000"], documents: ["Aadhaar card", "Vending certificate / LoR", "Bank account details", "Mobile number"], source: "pmsvanidhi.mohua.gov.in" },
  { id: "farmer", title: "PM-KISAN", category: "Farming · Central Government", roles: ["farmer"], keywords: "farmer farming agriculture crop kisan loan", symbol: "✺", tone: "green", fit: "87% potential fit", summary: "Income support for eligible landholding farmer families, transferred directly to their bank account.", eligibility: ["Landholding farmer families with cultivable land", "Some exclusions apply for institutional landholders and high-income groups"], documents: ["Aadhaar card", "Land ownership records", "Bank account details", "Mobile number"], source: "pmkisan.gov.in" },
  { id: "mudra", title: "Pradhan Mantri MUDRA Yojana", category: "Business · Central Government", roles: ["entrepreneur", "worker", "self-employed"], keywords: "business entrepreneur startup shop enterprise loan", symbol: "↗", tone: "orange", fit: "94% potential fit", summary: "Collateral-free business loans for micro enterprises, from starting a shop to expanding an existing service.", eligibility: ["Micro business owners and aspiring entrepreneurs", "Loan amount and terms depend on the business plan and lender"], documents: ["Aadhaar and PAN", "Business address proof", "Bank statements", "Basic business plan"], source: "mudra.org.in" },
  { id: "housing", title: "PM Awas Yojana – Urban", category: "Housing · Central Government", roles: ["worker", "entrepreneur", "parent"], keywords: "housing home rent house urban family", symbol: "⌂", tone: "blue", fit: "89% potential fit", summary: "Housing support for eligible urban families who need help building or buying a home.", eligibility: ["Families without a pucca house in their name", "Income and ownership conditions apply"], documents: ["Aadhaar card", "Income certificate", "Address proof", "Bank account details"], source: "pmay-urban.gov.in" },
  { id: "health", title: "Ayushman Bharat PM-JAY", category: "Health · Central Government", roles: ["parent", "worker", "farmer", "street-vendor"], keywords: "health hospital treatment medical family insurance", symbol: "＋", tone: "green", fit: "86% potential fit", summary: "Cashless hospitalisation cover for eligible families at empanelled hospitals.", eligibility: ["Families listed in the eligible government database", "Coverage and package availability follow official scheme rules"], documents: ["Aadhaar or alternate ID", "Ration card / family ID", "Mobile number"], source: "pmjay.gov.in" }
];

let activeProfession = "";
const API_BASE = window.SCHEMESAATHI_API_BASE || "http://127.0.0.1:8000";
let latestSearchId = 0;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]));
}

function officialUrl(scheme) {
  const raw = String(scheme.source || scheme.source_url || "").trim();
  if (!raw) return "";
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

const translations = {
  en: { topbar: "Making government benefits easier to find", howItWorks: "How it works ↗", navExplore: "Explore schemes", navGuide: "Your guide", navAbout: "About us", buildProfile: "Build my profile", eyebrow: "Your benefits, made simple", heroTitle: "Find the support<br><em>meant for you.</em>", heroDescription: "Tell us what you need in your own words. SchemeSaathi finds government schemes that could help you and explains what to do next.", trusted: "Trusted by 12,000+ citizens across India", searchKicker: "START WITH A QUESTION", searchTitle: "What do you need help with?", queryPlaceholder: "Try “I need support for my child’s education”", findSchemes: "Find my schemes", tryOne: "Try one of these", profileTitle: "Want more personal matches?", profileText: "Answer 5 quick questions and we’ll narrow down schemes for your situation.", createProfile: "Create my profile", guideKicker: "A LITTLE HELP, A LOT LESS HASSLE", guideTitle: "From “where do I start?”<br><em>to “I’ve got this.”</em>", step1Title: "Tell us your story", step1Text: "Ask a question in the words that feel natural to you.", step2Title: "See what fits", step2Text: "Get a clear shortlist, matched to your needs and location.", step3Title: "Take the next step", step3Text: "Understand documents and apply through the official source.", askSaathi: "Ask Saathi" },
  kn: { topbar: "ಸರ್ಕಾರಿ ಪ್ರಯೋಜನಗಳನ್ನು ಹುಡುಕುವುದು ಈಗ ಸುಲಭ", howItWorks: "ಇದು ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ ↗", navExplore: "ಯೋಜನೆಗಳನ್ನು ಹುಡುಕಿ", navGuide: "ನಿಮ್ಮ ಮಾರ್ಗದರ್ಶಿ", navAbout: "ನಮ್ಮ ಬಗ್ಗೆ", buildProfile: "ನನ್ನ ಪ್ರೊಫೈಲ್", eyebrow: "ನಿಮ್ಮ ಪ್ರಯೋಜನಗಳು, ಸರಳವಾಗಿ", heroTitle: "ನಿಮಗಾಗಿ <br><em>ಬೆಂಬಲ ಹುಡುಕಿ.</em>", heroDescription: "ನಿಮಗೆ ಬೇಕಾದುದನ್ನು ನಿಮ್ಮದೇ ಪದಗಳಲ್ಲಿ ತಿಳಿಸಿ. ನಿಮಗೆ ಸಹಾಯ ಮಾಡಬಹುದಾದ ಸರ್ಕಾರಿ ಯೋಜನೆಗಳನ್ನು SchemeSaathi ಹುಡುಕುತ್ತದೆ.", trusted: "ಭಾರತದಾದ್ಯಂತ 12,000+ ನಾಗರಿಕರ ನಂಬಿಕೆ", searchKicker: "ಪ್ರಶ್ನೆಯೊಂದಿಗೆ ಪ್ರಾರಂಭಿಸಿ", searchTitle: "ನಿಮಗೆ ಯಾವ ಸಹಾಯ ಬೇಕು?", queryPlaceholder: "“ನನ್ನ ಮಗುವಿನ ಶಿಕ್ಷಣಕ್ಕೆ ಸಹಾಯ ಬೇಕು” ಎಂದು ಪ್ರಯತ್ನಿಸಿ", findSchemes: "ಯೋಜನೆಗಳನ್ನು ಹುಡುಕಿ", tryOne: "ಇವುಗಳಲ್ಲಿ ಒಂದನ್ನು ಪ್ರಯತ್ನಿಸಿ", profileTitle: "ಹೆಚ್ಚು ವೈಯಕ್ತಿಕ ಹೊಂದಾಣಿಕೆ ಬೇಕೇ?", profileText: "5 ಸರಳ ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರಿಸಿ.", createProfile: "ನನ್ನ ಪ್ರೊಫೈಲ್ ರಚಿಸಿ", guideKicker: "ಕಡಿಮೆ ತೊಂದರೆ, ಹೆಚ್ಚಿನ ಸಹಾಯ", guideTitle: "“ಎಲ್ಲಿ ಪ್ರಾರಂಭಿಸಲಿ?”<br><em>ಇಂದ “ನಾನು ಮಾಡಬಲ್ಲೆ.”</em>", step1Title: "ನಿಮ್ಮ ಕಥೆ ತಿಳಿಸಿ", step1Text: "ಸಹಜವಾಗಿ ಅನಿಸುವ ಪದಗಳಲ್ಲಿ ಪ್ರಶ್ನೆ ಕೇಳಿ.", step2Title: "ಯಾವುದು ಸೂಕ್ತ ನೋಡಿ", step2Text: "ನಿಮ್ಮ ಅಗತ್ಯಕ್ಕೆ ಹೊಂದುವ ಪಟ್ಟಿಯನ್ನು ಪಡೆಯಿರಿ.", step3Title: "ಮುಂದಿನ ಹೆಜ್ಜೆ ಇಡಿ", step3Text: "ಅಗತ್ಯ ದಾಖಲೆಗಳನ್ನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳಿ.", askSaathi: "ಸಾಥಿಯನ್ನು ಕೇಳಿ" },
  hi: { topbar: "सरकारी लाभ ढूंढना अब आसान", howItWorks: "यह कैसे काम करता है ↗", navExplore: "योजनाएं खोजें", navGuide: "आपका मार्गदर्शक", navAbout: "हमारे बारे में", buildProfile: "मेरी प्रोफ़ाइल", eyebrow: "आपके लाभ, आसान भाषा में", heroTitle: "अपने लिए सही <br><em>सहायता खोजें।</em>", heroDescription: "आपको जो चाहिए, अपने शब्दों में बताएं। SchemeSaathi आपके लिए उपयोगी सरकारी योजनाएं ढूंढता है और आगे का रास्ता समझाता है।", trusted: "पूरे भारत में 12,000+ नागरिकों का भरोसा", searchKicker: "एक सवाल से शुरू करें", searchTitle: "आपको किस मदद की ज़रूरत है?", queryPlaceholder: "“मेरे बच्चे की पढ़ाई के लिए मदद चाहिए” लिखें", findSchemes: "योजनाएं खोजें", tryOne: "इनमें से आज़माएं", profileTitle: "और बेहतर सुझाव चाहिए?", profileText: "5 छोटे सवालों के जवाब दें और अपने लिए सही योजनाएं पाएं।", createProfile: "मेरी प्रोफ़ाइल बनाएं", guideKicker: "कम परेशानी, ज्यादा मदद", guideTitle: "“कहां से शुरू करूं?”<br><em>से “मैं कर सकता हूं।”</em>", step1Title: "अपनी बात बताएं", step1Text: "अपने आसान शब्दों में सवाल पूछें।", step2Title: "सही योजना देखें", step2Text: "आपकी ज़रूरत और जगह के अनुसार सुझाव पाएं।", step3Title: "अगला कदम उठाएं", step3Text: "दस्तावेज़ समझें और आधिकारिक स्रोत से आवेदन करें।", askSaathi: "साथी से पूछें" }
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
let currentLanguage = "en";

function applyLanguage(lang) {
  currentLanguage = lang;
  document.documentElement.lang = lang;
  const copy = translations[lang];
  $$("[data-i18n]").forEach((el) => { if (copy[el.dataset.i18n]) el.innerHTML = copy[el.dataset.i18n]; });
  $$("[data-i18n-placeholder]").forEach((el) => { el.placeholder = copy[el.dataset.i18nPlaceholder] || el.placeholder; });
}

async function getSchemeMatches(query) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (activeProfession) params.set("profession", activeProfession);
  try {
    const response = await fetch(`${API_BASE}/schemes?${params.toString()}`, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Scheme API returned ${response.status}`);
      const payload = await response.json();
      return payload.schemes || payload;
  } catch (error) {
    console.info("Using local scheme data because the API is unavailable.", error);
    return null;
  }
}

async function renderResults(query = "") {
  const searchId = ++latestSearchId;
  $("#results").hidden = false;
  $("#resultsGrid").innerHTML = `<div class="loading-state" role="status"><span class="loading-spinner"></span><p>Finding schemes that may fit you…</p></div>`;
  $("#results").scrollIntoView({ behavior: "smooth", block: "start" });
  const text = query.toLowerCase();
  const queryMatches = !text ? schemes : schemes.filter((scheme) => `${scheme.title} ${scheme.category} ${scheme.summary} ${scheme.keywords}`.toLowerCase().split(" ").some((word) => text.includes(word) || word.includes(text)));
  const professionMatches = activeProfession ? queryMatches.filter((scheme) => scheme.roles.includes(activeProfession)) : queryMatches;
  const fallback = professionMatches.length ? professionMatches : (activeProfession ? schemes.filter((scheme) => scheme.roles.includes(activeProfession)) : queryMatches);
  const apiResults = await getSchemeMatches(query);
  if (searchId !== latestSearchId) return;
  const visible = apiResults && apiResults.length ? apiResults : fallback;
  $("#resultsGrid").innerHTML = visible.length ? visible.map((scheme) => `<article class="scheme-card"><span class="fit-pill">${scheme.fit}</span><div class="card-symbol ${scheme.tone}">${scheme.symbol}</div><h3>${scheme.title}</h3><span class="category">${scheme.category}</span><p class="card-summary">${scheme.summary}</p><button class="card-action" data-scheme="${scheme.id}">View scheme details →</button></article>`).join("") : `<div class="empty-state"><span>⌕</span><h3>No close matches yet</h3><p>Try describing your need differently, or choose a profession in your profile.</p></div>`;
  $("#resultCount").textContent = visible.length;
  const heading = $("#results").querySelector("h2");
  heading.innerHTML = activeProfession ? `${visible.length} schemes matched to your profession` : `${visible.length} schemes found for you`;
  $("#results").hidden = false;
  $$(".card-action").forEach((button) => button.addEventListener("click", () => showDetails(schemes.find((scheme) => scheme.id === button.dataset.scheme) || visible.find((scheme) => scheme.id === button.dataset.scheme))));
  $("#results").scrollIntoView({ behavior: "smooth", block: "start" });
}

function showDetails(scheme) {
  const eligibility = scheme.eligibility || ["Please confirm current eligibility rules with the official department."];
  const documents = scheme.documents || ["Check the official source for the current document list."];
  const source = scheme.source || scheme.source_url || "";
  const sourceUrl = officialUrl(scheme);
  const sourceAction = sourceUrl ? `<a class="official-source-link" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">Visit official website <span aria-hidden="true">↗</span></a>` : `<span class="official-source-unavailable">Official source unavailable</span>`;
  const markup = `<div class="detail-dialog"><button class="modal-close" id="closeDetails" aria-label="Close details">×</button><div class="card-symbol ${scheme.tone || "blue"}">${scheme.symbol || "✦"}</div><span class="section-kicker">${escapeHtml(scheme.category || "Government scheme")}</span><h2>${escapeHtml(scheme.title || scheme.name)}</h2><p class="detail-summary">${escapeHtml(scheme.summary || scheme.description || "")}</p><div class="detail-columns"><div><h3>Potential eligibility</h3><ul>${eligibility.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div><div><h3>Common documents</h3><ul>${documents.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div></div><div class="official-source"><span>↗</span><div><small>Official source</small><b>${escapeHtml(source || "Not available")}</b>${sourceAction}</div></div><p class="detail-note">Eligibility shown here is potential, not guaranteed. Please confirm current rules with the official department.</p></div>`;
  const wrapper = document.createElement("div");
  wrapper.className = "modal-backdrop";
  wrapper.innerHTML = `<section class="profile-modal detail-modal" role="dialog" aria-modal="true">${markup}</section>`;
  document.body.appendChild(wrapper);
  $("#closeDetails").addEventListener("click", () => wrapper.remove());
  wrapper.addEventListener("click", (event) => { if (event.target === wrapper) wrapper.remove(); });
}

$("#languageSelect").addEventListener("change", (event) => applyLanguage(event.target.value));
$(".voice-button").addEventListener("click", () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    const toast = $("#toast");
    toast.textContent = "Voice input is not supported in this browser.";
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
    return;
  }
  const recognition = new SpeechRecognition();
  recognition.lang = currentLanguage === "hi" ? "hi-IN" : currentLanguage === "kn" ? "kn-IN" : "en-IN";
  recognition.onresult = (event) => { $("#queryInput").value = event.results[0][0].transcript; };
  recognition.onerror = () => { $("#toast").textContent = "We could not hear that. Please try again."; $("#toast").classList.add("show"); setTimeout(() => $("#toast").classList.remove("show"), 3000); };
  recognition.start();
});
$("#queryForm").addEventListener("submit", (event) => { event.preventDefault(); renderResults($("#queryInput").value.trim()); });
$$(".suggestion").forEach((button) => button.addEventListener("click", () => { $("#queryInput").value = button.textContent; renderResults(button.textContent); }));
$("#clearResults").addEventListener("click", () => { $("#results").hidden = true; $("#queryInput").value = ""; window.scrollTo({ top: $("#explore").offsetTop - 50, behavior: "smooth" }); });
$("#menuToggle").addEventListener("click", () => { const nav = $("#mobileNav"); nav.classList.toggle("open"); $("#menuToggle").setAttribute("aria-expanded", nav.classList.contains("open")); });
const openProfile = () => {
  let savedProfile = null;
  try { savedProfile = JSON.parse(localStorage.getItem("schemesaathi-profile") || "null"); } catch (error) { console.info("Ignoring invalid saved profile.", error); }
  if (savedProfile) {
    $("#profileName").value = savedProfile.name || "";
    $("#profileAge").value = savedProfile.age || "";
    $("#profileGender").value = savedProfile.gender || "";
    $("#profileState").value = savedProfile.state || "";
    $("#profileProfession").value = savedProfile.profession || "";
  }
  $("#profileModal").hidden = false;
  document.body.style.overflow = "hidden";
};
const closeProfile = () => { $("#profileModal").hidden = true; document.body.style.overflow = ""; };
$("#openProfile").addEventListener("click", openProfile); $("#openProfile2").addEventListener("click", openProfile); $("#closeProfile").addEventListener("click", closeProfile);
$("#profileModal").addEventListener("click", (event) => { if (event.target === $("#profileModal")) closeProfile(); });
$("#profileForm").addEventListener("submit", (event) => {
  event.preventDefault();
  activeProfession = $("#profileProfession").value;
  const profilePayload = { name: $("#profileName").value.trim(), profession: activeProfession, state: $("#profileState").value, gender: $("#profileGender").value, age: Number($("#profileAge").value) };
  const token = localStorage.getItem("schemesaathi-token");
  if (token && profilePayload.name && profilePayload.state && activeProfession) {
    fetch(`${API_BASE}/profile`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(profilePayload) }).catch((error) => console.info("Profile API unavailable; retaining local profile.", error));
  }
  localStorage.setItem("schemesaathi-profile-v2-complete", "true");
  localStorage.setItem("schemesaathi-profile", JSON.stringify(profilePayload));
  closeProfile();
  if (activeProfession) renderResults();
  const professionLabel = $("#profileProfession").selectedOptions[0].textContent;
  const toast = $("#toast");
  toast.textContent = `Profile complete for ${professionLabel} — showing your best matches.`;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3500);
});
$("#chatTrigger").addEventListener("click", () => { $("#chatPanel").hidden = false; $("#chatTrigger").hidden = true; });
$("#closeChat").addEventListener("click", () => { $("#chatPanel").hidden = true; $("#chatTrigger").hidden = false; });
$("#chatForm").addEventListener("submit", (event) => { event.preventDefault(); const input = event.target.querySelector("input"); if (!input.value.trim()) return; const body = $(".chat-body"); body.insertAdjacentHTML("beforeend", `<div class="chat-message user-message">${escapeHtml(input.value.trim())}</div>`); input.value = ""; setTimeout(() => body.insertAdjacentHTML("beforeend", `<div class="chat-message">I can help you explore schemes. Try telling me if you need support with education, farming, housing, or a small business.</div>`), 400); });
