/* Shared, DOM-free rules used by the browser, catalog build and regression tests. */
(function (root) {
  "use strict";
  const AGE = { baby: [0, 2], toddler: [3, 5], school_child: [6, 9], preteen: [10, 13], teen: [14, 17] };
  const OCCASIONS = { birthday: "geburtstag", christmas: "weihnachten", valentines_day: "valentinstag", anniversary: "jahrestag", wedding_anniversary: "jahrestag", mothers_day: "muttertag", fathers_day: "vatertag", thank_you: "danke sagen", just_because: "einfach so", housewarming: "einzug", farewell: "abschiedsgeschenk", secret_santa: "wichteln", birth: "geburt", baptism: "taufe", communion: "kommunion", confirmation: "konfirmation", school_start: "einschulung", graduation: "abschluss", wedding: "hochzeit" };
  const PERSONS = { partner: ["partner", "partnerin"], best_friend: ["freund", "freundin"], mother_grandmother: ["mutter", "oma"], father_grandfather: ["vater", "opa"], child_teen: ["kind", "kinder", "neffe", "nichte", "patenkind"], nephew_niece_godchild: ["kind", "kinder", "neffe", "nichte", "patenkind"], sibling: ["freund", "freundin", "bruder", "schwester"], colleague: ["kollege", "kollegen"], relative: ["mutter", "vater", "freund", "freundin", "kollege", "verwandte"] };
  const normalize = value => String(value || "").toLowerCase().replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue").replace(/ß/g,"ss").replace(/[^a-z0-9]+/g," ").trim();
  const number = value => typeof value === "number" && Number.isFinite(value) ? value : null;
  const isChild = selection => ["child_teen", "nephew_niece_godchild"].includes(selection.recipientId);
  function amazonLink(value, tag = "example-21") {
    try {
      const url = new URL(value);
      const asin = url.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:\/|$)/i)?.[1];
      if (url.protocol !== "https:" || !["amazon.de", "www.amazon.de"].includes(url.hostname) || !asin) return "";
      return `https://www.amazon.de/dp/${asin.toUpperCase()}?tag=${encodeURIComponent(tag)}`;
    } catch { return ""; }
  }
  function amazonImage(value) {
    try { const u = new URL(value); return u.protocol === "https:" && ["m.media-amazon.com", "images-eu.ssl-images-amazon.com", "images-na.ssl-images-amazon.com"].includes(u.hostname); } catch { return false; }
  }
  // Manually researched entries use our own illustration, not cached Amazon imagery.
  function editorialImage(value) { return value === "/static/editorial-gift.svg"; }
  function inBudget(price, tier) {
    if (number(price) === null || price <= 0) return false;
    return ({ under_20: price < 20, "20_50": price >= 20 && price <= 50, "50_100": price > 50 && price <= 100, over_100: price > 100 })[tier] || false;
  }
  function occasionAllowed(matrix, selection, occasionId) {
    const recipient = matrix.recipients.find(r => r.id === selection.recipientId);
    if (!recipient?.occasions.includes(occasionId)) return false;
    if (isChild(selection) && !AGE[selection.ageGroup]) return false;
    const allowedAges = { birth: ["baby"], communion: ["school_child", "preteen"], confirmation: ["preteen", "teen"], school_start: ["toddler", "school_child"], graduation: ["preteen", "teen"] };
    if (allowedAges[occasionId] && !allowedAges[occasionId].includes(selection.ageGroup)) return false;
    const exactAge = number(selection.ageYears);
    if (exactAge !== null && (!AGE[selection.ageGroup] || exactAge < AGE[selection.ageGroup][0] || exactAge > AGE[selection.ageGroup][1])) return false;
    const age = exactAge ?? AGE[selection.ageGroup]?.[0];
    if (occasionId === "birth" && age > 0) return false;
    if (occasionId === "school_start" && (age < 5 || age > 7)) return false;
    if (occasionId === "confirmation" && age < 13) return false;
    if (occasionId === "graduation" && age < 14) return false;
    if (occasionId === "communion" && (age < 6 || age > 13)) return false;
    return matrix.validationRules.every(rule =>
      !(rule.blockedOccasionsForRecipients?.[selection.recipientId] || []).includes(occasionId) &&
      (!rule.allowedRecipientsForOccasions?.[occasionId] || rule.allowedRecipientsForOccasions[occasionId].includes(selection.recipientId)));
  }
  function hasTerm(text, term) {
    term = normalize(term);
    return term.length <= 4 ? (` ${text} `).includes(` ${term} `) : text.includes(term);
  }
  function ageFits(product, selection) {
    if (!isChild(selection)) return true;
    const range = AGE[selection.ageGroup];
    if (!range) return false;
    const years = number(product.minAgeYears);
    const months = number(product.minAgeMonths);
    const minimum = months === null ? years : Math.max(years ?? 0, months / 12);
    const maximum = number(product.maxAgeYears);
    // Unknown age is never interpreted as zero. With age bands, use the youngest
    // possible recipient so an 8+ toy cannot be recommended to a six-year-old.
    const selectedAge = selection.occasionId === "birth" ? 0 : number(selection.ageYears) ?? range[0];
    return minimum !== null && minimum <= selectedAge && (maximum === null || maximum >= selectedAge);
  }
  function ageMetadata(product) {
    const text = normalize([product.title, product.ageRecommendationText].join(" "));
    const minima = [number(product.minAgeYears)];
    const month = number(product.minAgeMonths);
    if (month !== null) minima.push(month / 12);
    for (const match of text.matchAll(/\bab\s+(\d{1,2})\s*(jahr|monat)/g)) minima.push(Number(match[1]) / (match[2] === "monat" ? 12 : 1));
    for (const match of text.matchAll(/\b(\d{1,2})(?:\s+(?:bis\s+)?\d{1,2})+\s+jahre\b/g)) minima.push(Number(match[1]));
    if (/\bfuer erwachsene\b/.test(text)) minima.push(18);
    const known = minima.filter(v=>v!==null);
    return {minAgeYears:known.length ? Math.max(...known) : null, minAgeMonths:month, maxAgeYears:number(product.maxAgeYears)};
  }
  function recommend(catalog, matrix, selection) {
    if (!selection || !occasionAllowed(matrix, selection, selection.occasionId)) return [];
    const recipient = matrix.recipients.find(r => r.id === selection.recipientId);
    const gender = recipient?.detailStep.fixedGender || selection.gender || "neutral";
    const requested = OCCASIONS[selection.occasionId];
    const candidates = [];
    for (const p of catalog.products || []) {
      if (selection.hiddenIds?.includes(p.id) || exclusionReasons(p, selection.excludes).length) continue;
      if (!amazonLink(p.link) || !amazonImage(p.image) || !inBudget(p.priceAmount, selection.budgetTierId) || !ageFits(p, selection)) continue;
      const persons = p.persons || [];
      if (!(PERSONS[selection.recipientId] || []).some(person => persons.includes(person))) continue;
      if (["female", "girl"].includes(gender) && p.gender === "m" || ["male", "boy"].includes(gender) && p.gender === "w") continue;
      const occasions = (p.occasions || []).map(normalize);
      if (!occasions.includes(requested)) continue;
      const text = normalize(p.title);
      // Imported search categories are not evidence of what is printed on a gift.
      // Inspect actual product content, not SEO queries or scraper explanations.
      const rules = catalog.rules || {};
      const blockers = [ ...(rules.hardBlockersByOccasion?.[Object.keys(rules.hardBlockersByOccasion || {}).find(k => normalize(k) === requested)] || []) ];
      if (isChild(selection)) blockers.push(...(rules.detailRules?.child?.hardBlockers || []), "whisky", "wein", "bier", "vodka", "erotik", "alkohol");
      if (selection.recipientId === "nephew_niece_godchild") blockers.push("meine tochter", "meinen sohn", "mein sohn");
      if (selection.recipientId === "partner") blockers.push("papa", "mama", "oma", "opa", "muttertag", "vatertag", "kollege", "kollegin");
      if (selection.recipientId === "mother_grandmother") blockers.push("papa", "bester opa", "vatertag", "ehefrau", "beste freundin");
      if (selection.recipientId === "father_grandfather") blockers.push("mama", "beste oma", "muttertag", "ehemann", "beste freundin");
      if (selection.recipientId === "mother_grandmother") {
        if (selection.relationship !== "mother") blockers.push("mama", "mutter");
        if (selection.relationship !== "grandmother") blockers.push("oma", "grossmutter");
      }
      if (selection.recipientId === "father_grandfather") {
        if (selection.relationship !== "father") blockers.push("papa", "vater");
        if (selection.relationship !== "grandfather") blockers.push("opa", "grossvater");
      }
      if (selection.recipientId === "relative" || selection.recipientId === "sibling" || selection.recipientId === "best_friend" || selection.recipientId === "colleague") blockers.push("mama", "papa", "muttertag", "vatertag", "beste oma", "bester opa");
      if (selection.recipientId !== "partner") blockers.push("liebespaar", "ehefrau", "ehemann", "romantisch", "valentinstag", "ich liebe dich", "meinen schatz");
      if (selection.recipientId === "colleague") blockers.push("voodoo", "sexy", "unterwaesche", "dessous", "vibrator", "kuscheldecke", "fotocollage", "herzkette", "liebesgeschenk");
      if (selection.recipientId === "colleague" && selection.occasionId === "secret_santa") {
        // The finder does not ask for a job role, a shared joke or the intended
        // calendar year. Do not infer any of them from a broad scraper category.
        // An occasion-specific title is a reason to leave the item out here;
        // it can still be considered in its actual occasion, such as farewell.
        if (/abschied|jobwechsel|ruhestand|\b(?:rente|praktikant\w*|azubi\w*|lehrer\w*|erzieher\w*|chef|chefin)\b|\bneuer job\b|\berster arbeitstag\b|ausbildungsbeginn|happy birthday/.test(text)) continue;
        if (/halt dein maul|halt die fresse|fick dich|du arsch|demotivier|\bkacka\b/.test(text)) continue;
        if (/kalender/.test(text) && /\b(?:19|20)\d{2}\b/.test(text)) continue;
      }
      if (isChild(selection) && (number(p.minAgeYears) ?? 0) >= 18) continue;
      const birthdayAge = p.title.match(/\b(\d{1,3})\.\s*Geburtstag/i)?.[1];
      if (birthdayAge && Number(birthdayAge) !== selection.ageYears) continue;
      if (blockers.some(term => hasTerm(text, term))) continue;
      if (/\b20(?:1\d|2[0-5])\b/.test(text) && /abschluss|klasse geschafft|kalender/.test(text)) continue;
      const exclusions = Object.entries(rules.manualExclusionsBySelector || {}).some(([key, ids]) => {
        const [person, occasion, budget] = key.split("|");
        const budgetId = {under_20:"budget_0_20", "20_50":"budget_20_50", "50_100":"budget_50_100", over_100:"budget_100_plus"}[selection.budgetTierId];
        return persons.includes(person) && normalize(occasion) === requested && budget === budgetId && ids.includes(p.id);
      });
      if (exclusions) continue;
      let score = (p.editorial ? 40 : 0) + (p.quality || 0) * 10;
      if (selection.interest && selection.interest !== "any") score += (p.interests || []).includes(selection.interest) ? 120 : -15;
      if (isChild(selection) && number(p.minAgeYears) !== null) score += Math.min(p.minAgeYears, 17);
      candidates.push({ ...p, score });
    }
    candidates.sort((a,b) => b.score - a.score || a.id.localeCompare(b.id));
    const seen = new Set(), families = new Map(), result = [], deferred = [];
    for (const p of candidates) {
      const key = p.family || normalize(p.title).slice(0,65);
      const asin = amazonLink(p.link).split("/dp/")[1].split("?")[0];
      if (seen.has(asin) || seen.has(key)) continue;
      seen.add(asin); seen.add(key);
      const category = p.interests?.[0] || "other";
      if ((families.get(category) || 0) >= 2) deferred.push(p);
      else { result.push(p); families.set(category, (families.get(category) || 0) + 1); }
    }
    const diversified = [...result, ...deferred];
    if (selection.interest && selection.interest !== "any") {
      // Variety must never push the requested interest behind unrelated products.
      diversified.sort((a,b)=>Number(b.interests?.includes(selection.interest)||false)-Number(a.interests?.includes(selection.interest)||false));
    }
    return diversified;
  }
  function exclusionReasons(product, excluded = []) {
    const title = normalize(product.title);
    const rules = {
      alcohol: /\b(?:alkohol\w*|wein|rotwein|weisswein|weingla\w*|weinflasch\w*|whisk\w*|bier\w*|gin|vodka|wodka|schnaps\w*|likoer\w*|prosecco|sekt|champagner|cocktail\w*)\b/.test(title),
      decor: /\b(?:deko\w*|vase\w*|skulptur\w*|zierfigur\w*|kunstblum\w*|wandbild\w*|kerzenhalter\w*|duftkerz\w*|blumenstrauss)\b/.test(title),
      tech: product.interests?.includes("tech") || /\b(?:bluetooth|usb|smart\w*|kopfhoerer\w*|lautsprecher\w*|powerbank\w*|fitnesstracker\w*|gps|elektrisch\w*|digital\w*|kamera\w*|led|beamer|toniebox\w*)\b/.test(title)
    };
    return Array.isArray(excluded) ? excluded.filter(id=>rules[id]) : [];
  }
  root.GiftFinderEngine = { AGE, OCCASIONS, normalize, amazonLink, amazonImage, editorialImage, inBudget, occasionAllowed, ageFits, ageMetadata, recommend, exclusionReasons };
})(typeof window === "undefined" ? globalThis : window);

