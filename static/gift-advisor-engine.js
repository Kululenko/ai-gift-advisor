(function (root) {
  "use strict";
  const base = root.GiftFinderEngine;
  const normalize = base.normalize;
  const TOPICS = {
    nature: { label: "Natur & Wald", query: /wald|natur|wander|camping|picknick|fernglas|kompass|outdoor/, product: /wald|wander|camping|picknick|fernglas|kompass|natur entdecken/ },
    games: { label: "Gesellschaftsspiele", query: /spiel|brett|wuerfel|karten/, product: /\bspiel\b|brettspiel|kartenspiel|wuerfelspiel|gesellschaftsspiel|memory|dobble|qwixx|carcassonne|suchspiel/ },
    creative: { label: "Bauen & Gestalten", query: /kreativ|bastel|malen|zeichnen|bauen|lego|puzzle/, product: /lego|bastel|mal|stift|kreativ|puzzle|bausatz|modellbau|kugelbahn/ },
    music: { label: "Musik", query: /musik|singen|instrument|kopfhoerer/, product: /musik|kopfhoerer|lautsprecher|karaoke|instrument|mikrofon/ },
    food: { label: "Kochen & Genießen", query: /koch|back|kaffee|tee\b|grill|essen|geniess/, product: /koch|back|kaffee|tee\b|grill|gewuerz|schokolade/ },
    reading: { label: "Lesen", query: /lese|lesen|buch|buecher/, product: /buch|buecher|lese/ },
    cozy: { label: "Entspannung", query: /wellness|entspann|gemuetlich|kuschel|wohlfuehl/, product: /kerze|decke|wellness|kuschel|bade|massage|handtuch/ },
    tech: { label: "Technik", query: /technik|gaming|computer|zock|gadget/, product: /technik|bluetooth|kopfhoerer|lautsprecher|powerbank|gaming|kamera|roboter/ },
    sport: { label: "Sport", query: /sport|fussball|fahrrad|fitness|laufen/, product: /sport|fussball|fahrrad|fitness|lauf/ },
    garden: { label: "Garten", query: /garten|gaertner|pflanze|kraeuter/, product: /garten|gaertner|pflanze|kraeuter/ },
    animals: { label: "Tiere", query: /tiere|tier\b|katze|hund|pferd|dino/, product: /tier|katze|hund|pferd|dino/ }
  };
  const OCCASIONS = ["any", "geburtstag", "weihnachten", "wichteln", "abschiedsgeschenk", "danke sagen", "einschulung", "taufe", "geburt", "kommunion", "konfirmation", "jahrestag", "valentinstag", "hochzeit", "einfach so"];
  const RECIPIENTS = ["any", "partner", "mother", "father", "grandmother", "grandfather", "friend", "colleague", "child"];
  // Match product identity, not incidental words in advice (e.g. "entdecken"
  // is not a blanket, "Fermentieren" is not an animal, "Buchenholz" not a book).
  Object.assign(TOPICS.creative,{product:/\blego\b|bastel|\bmal(?:en|buch|set|kasten|farbe|stift)|bemalen|\bstift|stifte\b|kreativset|puzzle|bausatz|baustein|modellbau|kugelbahn|zeichen|aquarell/});
  Object.assign(TOPICS.reading,{product:/\bbuch\b|buch\b|buecher|\blese|erstlese|\broman|\bkrimi|gedicht/});
  Object.assign(TOPICS.cozy,{product:/\bkerze|duftkerze|\bdecke\b|kuscheldecke|wellness|kuschel|\bbade|massage|handtuch|sauna/});
  Object.assign(TOPICS.sport,{product:/\bsport|fussball|fahrrad|fitness|\blauf|schwimm|yoga/});
  Object.assign(TOPICS.garden,{product:/garten\s*(?:arbeit|werkzeug|handschuh|schere|set|buch)|gaertner|pflanz|anzucht|saatgut|hochbeet|blumentopf|blumentoepf/});
  Object.assign(TOPICS.animals,{product:/\btier|\b(?:haus|wild|wald|pluesch|kuschel)tier|katze|hund\b|hunde|pferd|dino|vogel|voegel/});
  const FACETS={
    food:[[/tee/,/tee\b|teebeutel|teesieb|teefilter|teekanne|teetasse/],[/kaffee|espresso|cappuccino/,/kaffee|espresso|cappuccino/],[/grill/,/grill|bbq/],[/back|kuchen/,/\bback|kuchen|\bteig|plaetzchen/],[/ferment|kimchi|sauerkraut/,/ferment|kimchi|sauerkraut/]],
    creative:[[/lego/,/\blego\b/],[/robot/,/robot|solar bots/],[/kugelbahn/,/kugelbahn|gecko run/],[/^(?!.*(?:lego|robot|kugelbahn|modellbau)).*(?:bauprojekt|bauen)/,/\blego\b|bausatz|baustein|modellbau|kugelbahn|gecko run|robot/],[/modellbau/,/modellbau|modellbausatz/],[/buntstift/,/buntstift/],[/zeichn|pastell|aquarell/,/\bzeichn|zeichnung|pastell|aquarell|skizz|buntstift/]],
    music:[[/karaoke/,/karaoke|mikrofon/],[/klavier/,/klavier|piano|keyboard/],[/schallplatte|vinyl|jazz/,/schallplatte|vinyl|jazz|plattenspieler/],[/musikinstrument/,/instrument|gitarre|trommel|klavier|piano|xylophon|floete/]],
    tech:[[/robot/,/robot|solar bots/],[/gaming|computer/,/gaming|computer|tastatur|mauspad|headset/],[/kamera|fotograf/,/kamera|foto/]],
    reading:[[/krimi/,/krimi|thriller/],[/roman/,/\broman/],[/histor|sachbuch|sachbuecher/,/histor|sachbuch|sachbuecher/],[/gedicht|poesie/,/gedicht|poesie/]],
    cozy:[[/badewanne|baden|badeabend/,/bade|badewanne/],[/sauna/,/sauna/],[/decke|kuschel/,/\bdecke\b|kuscheldecke|kuschel/]],
    sport:[[/lauf|marathon|jogg/,/\blauf|marathon|jogg|sport.*gutschein|trinkflasche/],[/fussball/,/fussball/],[/fahrrad|radfahr/,/fahrrad|radfahr|fahrrad.*flasche|sport.*gutschein/],[/fitness/,/fitness|hantel|yoga|sport.*gutschein|trinkflasche/],[/schwimm/,/schwimm|badehose|schwimmbrille|sport.*gutschein/]],
    animals:[[/pferd/,/pferd/],[/katze/,/katze/],[/hund/,/\bhund|hunde/],[/dino/,/dino/],[/vogel|voegel/,/vogel|voegel|fernglas/],[/wildtier/,/wildtier|safari|\bwaldtier/]],
    garden:[[/zimmerpflanz/,/zimmerpflanz|blumentopf|blumentoepf|giess|pflanzenpflege/],[/kraeuter/,/kraeuter.*(?:saat|anzucht|pflanz)|(?:saat|anzucht|pflanz).*kraeuter/]],
    games:[[/memory/,/memory/],[/wuerfel/,/wuerfel|qwixx/],[/karten/,/karten|dobble/],[/strateg/,/strateg|carcassonne|catan|schach/]]
  };
  function termMatch(text,term){
    const words=normalize(term).split(' ').filter(w=>w.length>2&&!['gern','sehr','gerne','einen','eine','zum','fuer'].includes(w));
    const tokens=text.split(' ');
    return words.length>0 && words.every(q=>tokens.some(w=>w===q||['e','en','n','s'].some(s=>w===q+s||q===w+s)));
  }
  function matchesTopic(id,title,p){
    if(id==='tech' && /hasbro gaming|monopoly/.test(title))return false;
    if(id==='tech' && /brille/.test(title) && !/gaming|computer/.test(normalize(p.keywords.join(' '))))return false;
    if(id==='cozy' && /picknick|stranddecke|campingdecke/.test(title))return false;
    if(id==='reading' && /kochbuch|kochbuecher|backbuch/.test(title) && !p.topics.includes('food'))return false;
    if(id==='creative' && /holzbild|wandbild|kunstdruck|leinwand bilder/.test(title))return false;
    const interests=normalize(p.keywords.join(' '));
    const focus=(FACETS[id]||[]).filter(([query])=>query.test(interests));
    return focus.length ? focus.some(([,product])=>product.test(title)) : TOPICS[id].product.test(title);
  }
  const empty = () => ({age:null,audience:"unknown",budgetMin:null,budgetMax:null,occasion:"any",recipient:"any",topics:[],keywords:[],exclude:[],question:""});
  const finite = value => typeof value === "number" && Number.isFinite(value);
  function validate(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid profile");
    const p = {...empty(), ...value};
    if (p.age !== null && (!finite(p.age) || p.age < 0 || p.age > 120)) throw new Error("Invalid age");
    for (const key of ["budgetMin", "budgetMax"]) if (p[key] !== null && (!finite(p[key]) || p[key] < 0 || p[key] > 100000)) throw new Error("Invalid budget");
    if (p.budgetMin !== null && p.budgetMax !== null && p.budgetMin > p.budgetMax) throw new Error("Conflicting budget");
    if (!["child","adult","unknown"].includes(p.audience) || !OCCASIONS.includes(p.occasion) || !RECIPIENTS.includes(p.recipient)) throw new Error("Invalid category");
    for (const key of ["topics","keywords","exclude"]) {
      if (!Array.isArray(p[key]) || p[key].length > 12 || p[key].some(s=>typeof s!=="string" || s.length>60)) throw new Error("Invalid terms");
      p[key] = [...new Set(p[key].map(s=>s.trim()).filter(Boolean))];
    }
    if (p.topics.some(t=>!TOPICS[t]) || typeof p.question!=="string" || p.question.length>240) throw new Error("Invalid interpretation");
    if (p.age !== null) p.audience = p.age < 18 ? "child" : "adult";
    return p;
  }
  function parseLocal(text, fields = {}) {
    const t = normalize(text), raw = String(text).toLowerCase();
    const p = empty();
    const age = t.match(/\b(\d{1,3})\s*(?:jahre|jahr|jaehrig)/) || t.match(/\b(?:sie|er|person|kind|frau|mann|mutter|vater|oma|opa|sohn|tochter|freundin|freund|kollegin|kollege|partner|partnerin|weiblich|maennlich|und)\s+(?:ist|wird)\s+(\d{1,3})\b(?!\s*(?:euro|eur)\b)/);
    if (age) p.age=Number(age[1]);
    const ageRange=raw.match(/\b(\d{1,2})\s*(?:-|–|bis)\s*(\d{1,2})\s*(?:jahre|jahr|jährige)/);
    if(ageRange)p.age=Math.min(Number(ageRange[1]),Number(ageRange[2]));
    const months=raw.match(/\b(\d{1,2})\s*monat/);if(months)p.age=Number(months[1])/12;
    if (/\b(kind|kinder|junge|maedchen|baby|kleinkind|sohn|tochter|enkel|enkelin|neffe|nichte|patenkind)\b/.test(t)) p.audience="child";
    if (/\b(frau|mann|weiblich|maennlich|erwachsene|erwachsenen|mutter|vater|oma|opa|freundin|kollegin|kollege)\b/.test(t)) p.audience="adult";
    const budget = raw.match(/(?:bis(?:\s+zu)?|maximal|max\.?|höchstens|unter)\s*(\d+(?:[.,]\d{1,2})?)\s*(?:€|euro\b|eur\b)/) || raw.match(/budget(?:\s+(?:von|ist|beträgt))?\s*:?\s*(\d+(?:[.,]\d{1,2})?)/);
    if (budget) p.budgetMax=Math.max(0,Number(budget[1].replace(",",".")) - (/^unter/.test(budget[0]) ? 0.01 : 0));
    const budgetRange=raw.match(/\b(\d+(?:[.,]\d{1,2})?)\s*(?:-|–|bis)\s*(\d+(?:[.,]\d{1,2})?)\s*(?:€|euro|eur)/);
    if(budgetRange){p.budgetMin=Number(budgetRange[1].replace(",","."));p.budgetMax=Number(budgetRange[2].replace(",","."));}
    for (const [id,topic] of Object.entries(TOPICS)) if(topic.query.test(t)) p.topics.push(id);
    for (const [regex,id] of [[/weihnacht/,"weihnachten"],[/geburtstag/,"geburtstag"],[/wichtel/,"wichteln"],[/abschied/,"abschiedsgeschenk"],[/einschulung/,"einschulung"],[/valentin/,"valentinstag"],[/jahrestag/,"jahrestag"]]) if(regex.test(t)) p.occasion=id;
    for (const [regex,id] of [[/\b(?:mutter|mama)\b/,"mother"],[/\b(?:vater|papa)\b/,"father"],[/\boma\b/,"grandmother"],[/\bopa\b/,"grandfather"],[/kolleg/,"colleague"],[/partner|ehefrau|ehemann/,"partner"]]) if(regex.test(t))p.recipient=id;
    for(const match of t.matchAll(/\b(?:kein\w*|ohne|nicht)\s+(?:neue\s+)?([a-z]+)/g))if(/^(?:deko|technik|elektronik|alkohol|wein|bier|tee|kaffee|kerze|kochbuch|kochbuecher|bastelset|lego|tasse|kopfh|lautsprecher|lebensmittel|getraenk|qwixx|carcassonne)/.test(match[1]))p.exclude.push(match[1]);
    p.topics=p.topics.filter(id=>!p.exclude.some(term=>TOPICS[id].query.test(term)));
    if(fields.age!==undefined && fields.age!==null && fields.age!=="")p.age=Number(fields.age);
    if(fields.budgetMax!==undefined && fields.budgetMax!==null && fields.budgetMax!=="")p.budgetMax=Number(fields.budgetMax);
    return validate(p);
  }
  function clarification(p) {
    if(p.question)return p.question;
    if(p.audience === "unknown")return "Wie alt ist die Person ungefähr, und was macht sie gern?";
    if(p.audience === "child" && p.age===null)return "Wie alt ist das Kind? So können wir die Altersangaben der Geschenke berücksichtigen.";
    if(!p.topics.length && !p.keywords.length)return "Nenne ein Hobby oder Interesse, zum Beispiel Wald, Brettspiele, Kochen oder Musik.";
    return "";
  }
  function eligible(product, p, catalog) {
    if(!base.amazonLink(product.link,catalog.affiliateTag))return false;
    if(product.editorialManual === true) {
      // A rough editorial budget class is not a live price. Never infer that a
      // minimum price has been met; the card explicitly asks for a price check.
      const minimumBudget={small:15,low:20,medium:30,standard:40,upper:50}[product.budgetFit];
      if(!base.editorialImage(product.image) || !finite(minimumBudget) || p.budgetMin!==null || (p.budgetMax!==null && p.budgetMax<minimumBudget))return false;
      const words=normalize(p.keywords.join(' '));
      if((product.requiresAny||[]).length && !product.requiresAny.some(term=>words.includes(normalize(term))))return false;
      if((product.excludeKeywords||[]).some(term=>words.includes(normalize(term))))return false;
    } else {
      if(!base.amazonImage(product.image) || !finite(product.priceAmount) || product.priceAmount<=0)return false;
      const cents=Math.round(product.priceAmount*100);
      if(p.budgetMax!==null && cents>Math.round(p.budgetMax*100) || p.budgetMin!==null && cents<Math.round(p.budgetMin*100))return false;
    }
    const title=normalize(product.title);
    if(p.age!==null && ((finite(product.minAgeYears)&&product.minAgeYears>p.age) || (finite(product.maxAgeYears)&&product.maxAgeYears<p.age)))return false;
    if(p.audience==="child") {
      if(!finite(product.minAgeYears) || p.age===null)return false;
      if(/alkohol|whisk|wein|bier|vodka|erotik|vibrator|messer|feuertonne|feuerkorb/.test(title))return false;
    }
    if(p.audience==="adult" && (product.persons||[]).length && (product.persons||[]).every(x=>["kind","kinder","neffe","nichte","patenkind"].includes(x)))return false;
    // Routing tags are not an exhaustive list of when a neutral gift can be given.
    // Specific occasions still require a tag; generic celebrations use title blockers.
    if(!['any','geburtstag','weihnachten','einfach so'].includes(p.occasion) && !(product.occasions||[]).includes(p.occasion))return false;
    const occasionBlockers=Object.entries(catalog.rules?.hardBlockersByOccasion||{}).find(([key])=>normalize(key)===p.occasion)?.[1]||[];
    if(occasionBlockers.some(x=>title.includes(normalize(x))))return false;
    const relationTerms={mother:/\b(?:mamas?|mutter|mutters|muetter)\b/,father:/\b(?:papas?|vater|vaters|vaeter)\b/,grandmother:/\b(?:omas?|grossmutter)\b/,grandfather:/\b(?:opas?|grossvater)\b/,partner:/ehefrau|ehemann|ich liebe dich|meinen schatz|liebespaar/,colleague:/kolleg/};
    if(Object.entries(relationTerms).some(([id,re])=>id!==p.recipient && re.test(title)))return false;
    if(p.recipient!=="friend" && /beste[nr]? freund|bff|bestie/.test(title))return false;
    if(p.recipient!=="partner" && /romantisch|valentinstag/.test(title))return false;
    if(p.recipient!=="partner" && /mr right|mrs always|ehepaar|fuer paare/.test(title))return false;
    if(p.occasion!=="abschiedsgeschenk" && /abschied|jobwechsel|ruhestand|rentner|rente\b|pension/.test(title))return false;
    if(p.occasion!=="hochzeit" && /hochzeit/.test(title))return false;
    if(p.occasion!=="einschulung" && /einschulung|schulanfang/.test(title))return false;
    if(/zum einzug|einzugsgeschenk/.test(title))return false;
    if(!['weihnachten','wichteln'].includes(p.occasion) && /weihnachtsbaum|tannenbaum|adventskalender/.test(title))return false;
    if(!['taufe','kommunion','konfirmation'].includes(p.occasion) && /taufe|kommunion|konfirmation/.test(title))return false;
    if(/praktikant|bester chef|beste chefin/.test(title) && !p.keywords.some(k=>/praktikant|chef/.test(normalize(k))))return false;
    const printedAge=title.match(/\b(\d{1,3}) geburtstag/);
    if(printedAge && Number(printedAge[1])!==p.age)return false;
    if(/\b20(?:1\d|2[0-5])\b/.test(title) && /kalender|abschluss/.test(title))return false;
    if(p.exclude.some(term=>{
      const n=normalize(term);
      if(/(?:fuer (?:die )?katze|produkte fuer katzen)/.test(n))return /katzenfutter|kratzbaum|katzenspielzeug|katzenstreu|futternapf/.test(title);
      if(/kochbuch|kochbuecher/.test(n))return /kochbuch|kochbuecher/.test(title);
      if(/ferment/.test(n))return /ferment/.test(title);
      if(/reaktionsspiel|hektisch/.test(n))return /reaktion|dobble/.test(title);
      if(/getraenk|lebensmittel/.test(n))return /tee\b|kaffee|schokolade|gewuerz|salz\b|suessigkeit|wein\b|bier\b/.test(title);
      if(/teepack|tee/.test(n))return /tee\b|teebeutel|teefilter|teesieb/.test(title);
      const category=/alkohol|wein|bier/.test(n)?"alcohol":/deko/.test(n)?"decor":/technik|elektronik/.test(n)?"tech":"";
      return category ? base.exclusionReasons(product,[category]).length>0 : n.length>1 && (termMatch(title,n)||title.includes(n));
    }))return false;
    return true;
  }
  function recommend(catalog, input) {
    const p=validate(input), question=clarification(p);
    if(question)return {profile:p,question,products:[]};
    const ranked=[];
    for(const product of catalog.products||[]) {
      if(!eligible(product,p,catalog))continue;
      const text=normalize(product.title);
      const topics=p.topics.filter(id=>matchesTopic(id,text,p));
      // Baby toys have concrete names that differ from everyday descriptions.
      // Keep this synonym expansion age-bound; it cannot admit board games.
      const terms=p.keywords.filter(term=>termMatch(text,term)||(p.age!==null&&p.age<3&&/spielzeug|spielsach|greif|rassel/.test(normalize(term))&&/greifling|rassel|greifball|motorikball/.test(text)));
      if(p.topics.length ? !topics.length : !terms.length)continue;
      if(p.topics.includes('reading') && /buecher|\bbuch\b/.test(normalize(p.keywords.join(' '))) && !TOPICS.reading.product.test(text))continue;
      if(p.topics.includes('reading') && p.topics.includes('animals') && /buecher|\bbuch\b/.test(normalize(p.keywords.join(' '))) && !matchesTopic('animals',text,p))continue;
      const score=topics.length*50+terms.length*30+(product.editorial?45:0)+(product.quality||0);
      const detail=product.fit?`Passt, wenn: ${product.fit}`:product.description||(/picknick/.test(text)?"Eine Idee für Pausen beim Picknick oder unterwegs":"Ein thematisch passender Katalogtreffer. Vergleiche die konkrete Variante und vorhandene Ausstattung");
      const reason=topics.length ? `Zum Interesse „${topics.map(id=>TOPICS[id].label).join(" / ")}“: ${detail.replace(/[.!?]+$/,"")}.` : `Im Katalog zu „${terms.join(", ")}“ gefunden. Prüfe, ob diese Variante zur Person passt.`;
      ranked.push({...product,link:base.amazonLink(product.link,catalog.affiliateTag),reason,score});
    }
    ranked.sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
    const seen=new Set(), products=[];
    for(const product of ranked) {
      const asin=product.link.match(/\/dp\/([A-Z0-9]{10})/)[1], title=normalize(product.title);
      const similarFamily=[[/picknickdecke/,"picknickdecke"],[/kuscheldecke|personalisierte decke/,"kuscheldecke"],[/badetuch|saunatuch/,"badetuch"],[/trinkflasche/,"trinkflasche"],[/gaming.*brille|brille.*gaming|blaulichtfilter brille/,"gamingbrille"],[/walkie talkie/,"walkie-talkie"]].find(([pattern])=>pattern.test(title))?.[1];
      const family=product.family||similarFamily||asin;
      if(seen.has(asin)||seen.has(family))continue;
      seen.add(asin);seen.add(family);products.push(product);
      if(products.length===3)break;
    }
    return {profile:p,question:"",products,message:products.length ? "" : "Dazu haben wir im Katalog gerade keinen ausreichend passenden Treffer. Ändere ein Interesse oder den Budgetrahmen – deine Grenzen werden nicht automatisch gelockert."};
  }
  function keywords({age,topic="games",budgetMax=null,occasion="geburtstag"}) {
    const p=validate({...empty(),age:Number(age),audience:"child",topics:[topic],budgetMax:budgetMax===null||budgetMax===""?null:Number(budgetMax),occasion});
    if(p.age<3||p.age>17)throw new Error("Bitte ein Alter zwischen 3 und 17 wählen.");
    const names={games:"Gesellschaftsspiele",creative:"Kreativspiele",nature:"Naturspiele",animals:"Tierspiele",music:"Musikspiele",tech:"Technikspiele",sport:"Bewegungsspiele",reading:"Lernspiele",cozy:"Ruhige Spiele",food:"Spiele rund ums Kochen",garden:"Gartenspiele"};
    const label=names[topic], limit=p.budgetMax===null?"":` bis ${p.budgetMax.toLocaleString("de-DE")} Euro`;
    return {profile:p,phrases:[`${label} für Kinder ab ${p.age} Jahren`,`${label} als Geschenk${limit}`,`Geschenke für Kinder ${p.age} Jahre${limit}`,`${p.occasion==="weihnachten"?"Weihnachtsgeschenk":"Geburtstagsgeschenk"} ${label.toLowerCase()} ${p.age} Jahre`,`${label} für gemeinsames Spielen${limit}`]};
  }
  root.GiftAdvisorEngine={TOPICS,OCCASIONS,RECIPIENTS,empty,validate,parseLocal,clarification,recommend,keywords};
})(typeof window === "undefined" ? globalThis : window);

