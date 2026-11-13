/* Fitomat-Build 202611131038 */
/* Kochschule – Küchen, kombinierbare Filter und Mengen-Anpassung.
   Wird nach ernaehrung.js und vor app.js geladen; nutzt deren globale Funktionen erst zur Laufzeit.
   Datenmodell: Vault-Notiz „70 App/Küchen, Filter und Mengen-Anpassung – Datenmodell“. */

/* ---------- Küchen ---------- */
const KUECHEN_GRUPPEN = [
  ['asiatisch', 'Asiatisch', [['japanisch', 'Japanisch'], ['koreanisch', 'Koreanisch'], ['chinesisch', 'Chinesisch'], ['thailaendisch', 'Thailändisch'], ['vietnamesisch', 'Vietnamesisch'], ['indonesisch', 'Indonesisch'], ['malaysisch', 'Malaysisch'], ['philippinisch', 'Philippinisch'], ['taiwanisch', 'Taiwanisch'], ['srilankisch', 'Sri-lankisch'], ['indisch', 'Indisch'], ['pakistanisch', 'Pakistanisch']]],
  ['orient', 'Türkei, Nahost & Nordafrika', [['tuerkisch', 'Türkisch'], ['levantinisch', 'Levantinisch'], ['persisch', 'Persisch'], ['nordafrikanisch', 'Nordafrikanisch']]],
  ['europaeisch', 'Europäisch', [['italienisch', 'Italienisch'], ['griechisch', 'Griechisch'], ['spanisch', 'Spanisch'], ['franzoesisch', 'Französisch'], ['deutsch', 'Deutsch'], ['oesterreichisch', 'Österreichisch'], ['britisch', 'Britisch']]],
  ['amerika', 'Amerika', [['mexikanisch', 'Mexikanisch'], ['texmex', 'Tex-Mex'], ['us_amerikanisch', 'US-amerikanisch'], ['peruanisch', 'Peruanisch'], ['kolumbianisch', 'Kolumbianisch'], ['karibisch', 'Karibisch'], ['brasilianisch', 'Brasilianisch']]],
  ['afrika', 'Afrika (südlich der Sahara)', [['aethiopisch', 'Äthiopisch'], ['westafrikanisch', 'Westafrikanisch'], ['suedafrikanisch', 'Südafrikanisch']]]
];
const KUECHE_NAME = {}; const KUECHE_GRUPPE = {};
KUECHEN_GRUPPEN.forEach(([g, gn, subs]) => { KUECHE_NAME[g] = gn; subs.forEach(([k, n]) => { KUECHE_NAME[k] = n; KUECHE_GRUPPE[k] = g; }); });
const HERKUNFT_ART = { traditionell: 'traditionelles Gericht', angepasst: 'angepasste Variante', fusion: 'Fusion / inspiriert', ohne_bezug: 'ohne Bezug zu einer Landesküche' };
const rezeptKuechen = r => arr(r.meta.kuechen).filter(k => KUECHE_NAME[k]);
function kuechenErweitert(auswahl) { const s = new Set(); auswahl.forEach(k => { const g = KUECHEN_GRUPPEN.find(x => x[0] === k); if (g) g[2].forEach(([u]) => s.add(u)); else s.add(k); }); return s; }

/* ---------- Eigenschaften (UND-verknüpft) ---------- */
function istProteinreich(r) { const p = r.naehrwerte.pro_portion; return p.kcal > 0 && p.protein != null && p.protein * 4 / p.kcal >= 0.2; }
function istVegan(r) { const zs = r.zutaten.filter(z => z.zutat); return zs.length > 0 && zs.every(z => Z[z.zutat] && Z[z.zutat].vegan === true); }
const EIGENSCHAFTEN = [
  ['schnell', 'schnell (≤ 30 Min.)', (r, i) => i.gesamt != null && i.gesamt <= 30],
  ['proteinreich', 'proteinreich', r => istProteinreich(r)],
  ['vegetarisch', 'vegetarisch', (r, i) => i.veg],
  ['vegan', 'vegan', r => istVegan(r)],
  ['guenstig', 'günstig (Schätzung)', r => r.meta.kosten_klasse === 'guenstig'],
  ['vorkochen', 'vorkochgeeignet', r => r.meta.vorkochen_kuehlschrank === 'ja'],
  ['wenig', 'wenig Aufwand', (r, i) => i.aktiv != null && i.aktiv <= 20 && (i.schwierigkeit || 1) <= 2],
  ['fitness', 'fitnessgeeignet', (r, i) => i.kat.includes('fitness')],
  ['lernen', 'Neues lernen', (r, i) => i.kat.includes('lerngericht')],
  ['anspruchsvoll', 'anspruchsvoll', (r, i) => i.kat.includes('restaurant') || (i.schwierigkeit || 0) >= 3],
  ['eine-pfanne', 'eine Pfanne', r => rezeptGefaesse(r).join() === 'pfanne'],
  ['ein-topf', 'ein Topf', r => rezeptGefaesse(r).join() === 'topf'],
  ['ein-blech', 'ein Blech', r => rezeptGefaesse(r).join() === 'backblech'],
  ['wenig-abwasch', 'wenig Abwasch', r => rezeptGefaesse(r).length <= 1 && arr(r.meta.geraete_noetig).length <= 5],
  ['wenige-zutaten', 'wenige Zutaten', r => r.zutaten.filter(z => z.bedarf !== 'grundvorrat' && z.bedarf !== 'optional').length <= 7],
  ['mehrere-portionen', 'gut für mehrere Portionen', r => Number(r.meta.portionen) >= 4 && r.meta.vorkochen_kuehlschrank === 'ja'],
  ['date', 'Date-geeignet', (r, i) => i.kat.includes('date')]
];
// Koch- und Backgefäße laut „Geräte nötig“ (Topf, Pfanne, Blech, Auflaufform)
function rezeptGefaesse(r) { return arr(r.meta.geraete_noetig).filter(g => ['topf', 'pfanne', 'backblech', 'auflaufform'].includes(g)); }
const EIGENSCHAFT = Object.fromEntries(EIGENSCHAFTEN.map(e => [e[0], e]));
const EIGENSCHAFT_ERKLAERUNG = {
  proteinreich: 'mind. 20 % der Energie einer Portion aus Protein – Kriterium „hoher Proteingehalt“ der EU-Verordnung 1924/2006, auf die berechnete Portion übertragen',
  guenstig: 'grobe Schätzung nach Zutatenklassen, keine Preise',
  vegan: 'alle Zutaten laut Zutatennotiz vegan; bei Produkten zählt das Etikett',
  'eine-pfanne': 'laut „Geräte nötig“ genau ein Garbehälter: eine Pfanne (Schüssel, Messer, Brett zählen nicht)',
  'ein-topf': 'laut „Geräte nötig“ genau ein Garbehälter: ein Topf',
  'ein-blech': 'laut „Geräte nötig“ genau ein Garbehälter: ein Backblech',
  'wenig-abwasch': 'höchstens ein Topf/Pfanne/Blech/Auflaufform und insgesamt höchstens 5 nötige Geräte',
  'wenige-zutaten': 'höchstens 7 Zutaten ohne Grundvorrat (Salz, Öl …) und ohne optionale',
  'mehrere-portionen': 'Grundrezept für mindestens 4 Portionen und laut Rezept im Kühlschrank vorkochbar'
};

/* Prüft die gewählten Filter (ohne persönliche Ausschlüsse). ohne = Filterschlüssel, der für Lockerungsvorschläge weggelassen wird. */
function filterPasst(r, info, f, ohne) {
  if (ohne !== 'bereich' && f.bereich && r.meta.bereich !== f.bereich && !arr(r.meta.bereiche).includes(f.bereich)) return false;
  if (ohne !== 'kuechen' && f.kuechen.length) { const s = kuechenErweitert(f.kuechen); if (!rezeptKuechen(r).some(k => s.has(k))) return false; }
  for (const e of f.richtung) if (ohne !== 'e:' + e && EIGENSCHAFT[e] && !EIGENSCHAFT[e][2](r, info)) return false;
  if (ohne !== 'maxGesamt' && f.maxGesamt && !(info.gesamt && info.gesamt <= Number(f.maxGesamt))) return false;
  if (ohne !== 'maxAktiv' && f.maxAktiv && !(info.aktiv && info.aktiv <= Number(f.maxAktiv))) return false;
  if (ohne !== 'suche' && f.suche && !suchePasst(r, f.suche)) return false;
  return true;
}

/* ---------- Suche: Titel, Speisenart, Küche, Zutaten mit Synonymen; ohne Akzente und Groß/Klein ---------- */
const suchNorm = s => String(s || '').toLowerCase().replace(/ı/g, 'i').replace(/ß/g, 'ss').normalize('NFD').replace(/[̀-ͯ]/g, '');
const suchIndex = new Map();
function rezeptSuchtext(r) {
  if (suchIndex.has(r.id)) return suchIndex.get(r.id);
  const m = r.meta; const teile = [r.titel, BEREICH_NAME[m.bereich], ...arr(m.bereiche).map(b => BEREICH_NAME[b]), ...rezeptKuechen(r).map(k => KUECHE_NAME[k]), m.kueche, ...arr(m.kategorien), ...arr(m.techniken)];
  r.zutaten.forEach(z => { teile.push(z.text); const zz = z.zutat && Z[z.zutat]; if (zz) teile.push(zz.name, ...arr(zz.aliases)); });
  const t = suchNorm(teile.filter(Boolean).join(' | ')); suchIndex.set(r.id, t); return t;
}
/* Synonyme je Suchwort (Englisch ↔ Deutsch, Schreibvarianten); bereits normalisiert (ohne Umlaute). Ein Wort passt, wenn eine Variante vorkommt.
   Bewusst ohne zu kurze Teilwörter wie „ei“, die überall vorkämen. */
const SUCH_SYNONYME = [['honey', 'honig'], ['chicken', 'hahnchen', 'huhn', 'huhner', 'huhnchen', 'geflugel', 'pollo'], ['turkey', 'pute', 'puten', 'truthahn'], ['beef', 'rind', 'rinder'], ['duck', 'ente'], ['lamb', 'lamm'],
  ['minced', 'mince', 'ground', 'hack', 'hackfleisch'], ['fish', 'fisch'], ['salmon', 'lachs'], ['tuna', 'thunfisch'], ['cod', 'kabeljau', 'dorsch'], ['shrimp', 'shrimps', 'prawn', 'prawns', 'garnele', 'garnelen', 'gambas'],
  ['rice', 'reis'], ['noodle', 'noodles', 'nudel', 'nudeln', 'pasta'], ['egg', 'eggs', 'eier', 'ruhrei', 'spiegelei', 'omelett'], ['garlic', 'knoblauch'], ['ginger', 'ingwer'], ['lemon', 'zitrone', 'zitronen'], ['lime', 'limette', 'limetten'],
  ['soup', 'suppe'], ['salad', 'salat'], ['cake', 'kuchen'], ['bread', 'brot'], ['pancake', 'pancakes', 'pfannkuchen'], ['potato', 'potatoes', 'kartoffel', 'kartoffeln'], ['sweet potato', 'susskartoffel'], ['tomato', 'tomatoes', 'tomate', 'tomaten'],
  ['cheese', 'kase'], ['mushroom', 'mushrooms', 'pilz', 'pilze', 'champignon', 'champignons'], ['onion', 'zwiebel', 'zwiebeln'], ['bean', 'beans', 'bohne', 'bohnen'], ['chickpea', 'chickpeas', 'kichererbse', 'kichererbsen'], ['lentil', 'lentils', 'linse', 'linsen'],
  ['sesame', 'sesam'], ['soy', 'soja'], ['peanut', 'peanuts', 'erdnuss', 'erdnusse'], ['coconut', 'kokos'], ['oat', 'oats', 'hafer', 'haferflocken', 'porridge'], ['chocolate', 'schokolade', 'schoko'], ['vegetable', 'vegetables', 'veggie', 'gemuse'],
  ['spinach', 'spinat'], ['broccoli', 'brokkoli'], ['curd', 'quark'], ['yogurt', 'yoghurt', 'joghurt'], ['stew', 'eintopf'], ['sauce', 'sosse', 'sose'], ['fried', 'gebraten', 'braten'], ['baked', 'gebacken', 'ofen'], ['grilled', 'gegrillt', 'grill'],
  ['spicy', 'scharf'], ['sweet', 'suss'], ['sour', 'sauer'], ['quick', 'schnell'], ['easy', 'einfach'], ['breakfast', 'fruhstuck'], ['dessert', 'nachtisch', 'nachspeise'], ['protein', 'eiweiss'], ['meal prep', 'mealprep', 'vorkochen']];
const SYN_MAP = new Map(); SUCH_SYNONYME.forEach(g => g.forEach(w => { if (!w.includes(' ')) SYN_MAP.set(w, g.filter(x => !x.includes(' '))); }));
const suchVarianten = w => SYN_MAP.get(w) || [w];
function suchePasst(r, q) { const w = suchNorm(q).split(/\s+/).filter(Boolean); if (!w.length) return true; const t = rezeptSuchtext(r); return w.every(x => suchVarianten(x).some(v => t.includes(v))); }
const titelTreffer = (r, q) => suchNorm(r.titel).includes(suchNorm(q).trim());
/* Rangfolge: Titel vor ganzem Wort (z. B. Zutat „Huhn“) vor Wortanfang vor Wortteil (z. B. „Hühnerei“) */
function suchRang(r, q) {
  const t = rezeptSuchtext(r), ti = suchNorm(r.titel);
  return suchNorm(q).split(/\s+/).filter(Boolean).reduce((s, w0) => s + Math.max(...suchVarianten(w0).map(w => {
    const wort = new RegExp('(^|[^a-z0-9])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z0-9]|$)'), anfang = new RegExp('(^|[^a-z0-9])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return ti.includes(w) ? 8 : wort.test(t) ? 4 : anfang.test(t) ? 2 : t.includes(w) ? 1 : 0;
  })), 0);
}

/* ---------- Zeiten verständlich: Arbeit, Warte-/Garzeit, gesamt, Vortag ---------- */
function dauerText(min) { if (min == null) return ''; if (min < 90) return `${min} Min.`; return `ca. ${zahlDE(Math.round(min / 30) / 2, 1)} Std.`; }
const VORTAG_RE = /über Nacht|am Vortag|am Vorabend|Vortag/i;
const WARTE_ARTEN = [[/einweich/i, 'Einweichen'], [/marinier/i, 'Marinieren'], [/gehen lassen|Teig (?:ruht|ruhen)|Gare\b|gären/i, 'Teig gehen lassen'], [/kühlschrank[^.]{0,60}(?:fest|stunden|std\.|über nacht)|fest werden|durchkühlen|kalt stellen/i, 'Kühlen']];
function zeitInfo(r) {
  const i = rezeptInfo(r); const text = r.schritte.map(s => s.titel + ' ' + s.md).join(' \n ');
  const warte = i.gesamt && i.aktiv && i.gesamt > i.aktiv ? i.gesamt - i.aktiv : 0;
  const arten = warte >= 45 ? WARTE_ARTEN.filter(([re]) => re.test(text)).map(x => x[1]) : [];
  const vs = r.schritte.find(s => VORTAG_RE.test(s.titel + ' ' + s.md));
  const vortag = vs ? { nr: vs.nr, titel: vs.titel } : (i.gesamt >= 8 * 60 ? { nr: null, titel: '' } : null);
  return { aktiv: i.aktiv, gesamt: i.gesamt, warte, arten, vortag };
}
function zeitKurz(r) {
  const z = zeitInfo(r); if (!z.gesamt) return z.aktiv ? `${dauerText(z.aktiv)} Arbeit` : '';
  if (!z.aktiv || z.aktiv >= z.gesamt) return `${dauerText(z.gesamt)} gesamt`;
  return `${dauerText(z.aktiv)} Arbeit · ${dauerText(z.gesamt)} gesamt${z.vortag ? ' · Vortag' : ''}`;
}
function zeitDetailHtml(r) {
  const z = zeitInfo(r); const t = [];
  if (z.aktiv) t.push(`<span>${ico('hand', 'klein')} ${dauerText(z.aktiv)} Arbeit</span>`);
  if (z.gesamt) t.push(`<span>${ico('uhr', 'klein')} ${dauerText(z.gesamt)} insgesamt</span>`);
  const w = z.warte >= 15 ? `<span class="zeit-davon">davon ${dauerText(z.warte)} ohne Arbeit${z.arten.length ? ' – vor allem ' + esc(z.arten.slice(0, 2).join(' und ')) : ' (Garen, Ruhen, Warten)'}</span>` : '';
  return t.join('') + w;
}
function vortagHinweisHtml(r) {
  const z = zeitInfo(r); if (!z.vortag) return '';
  return `<div class="hinweis warn"><b>Rechtzeitig beginnen:</b> ${z.vortag.titel ? `Schritt ${esc(z.vortag.nr != null ? z.vortag.nr : '')} „${inline(z.vortag.titel)}“ braucht Vorlauf (über Nacht bzw. am Vortag).` : `insgesamt ${dauerText(z.gesamt)} – bitte vorausplanen.`}</div>`;
}

/* ---------- Rezeptseite: Anleitung, Herkunft und Redaktion trennen (nur Anzeige; der Vault bleibt vollständig) ---------- */
const INTERN_ZEILE = /(?:ergänzt|geändert|aktualisiert|überarbeitet) am \d{4}-\d\d-\d\d|weiterhin v\d|\barchiviert\b|Versionshistorie|nach deinem Kochen wird daraus v\d/i;
const ohneIntern = t => String(t || '').split('\n').filter(z => !INTERN_ZEILE.test(z)).join('\n');
/* Anleitungstext: Quellenlinks und Kennzeichnungen aus dem Fließtext lösen; Belege gesammelt am Schritt­ende, „ungeprüft“ als kurzes Etikett */
function anleitung(text) {
  const belege = []; let abgeleitet = false;
  let t = ohneIntern(text);
  t = t.replace(/\s*\(\s*\[\[Quellenverzeichnis#\^([^\]|]+)(?:\|[^\]]+)?\]\](?:\s*[,;]\s*\[\[Quellenverzeichnis#\^([^\]|]+)(?:\|[^\]]+)?\]\])*\s*\)/g, m => { m.replace(/#\^([^\]|]+)/g, (x, id) => { belege.push(id); return x; }); return ''; });
  t = t.replace(/\[\[Quellenverzeichnis#\^([^\]|]+)\|([^\]]+)\]\]/g, (m, id, alias) => { belege.push(id); return alias; });
  t = t.replace(/\s*\[\[Quellenverzeichnis#\^([^\]|]+)\]\]/g, (m, id) => { belege.push(id); return ''; });
  // kursive Klammer-Kennzeichnungen: „ungeprüft“ als Etikett, reine Herkunftsangaben aus dem Handlungstext lösen
  t = t.replace(/\s*\*\(([^()]*?)\)\*/g, (m, innen) => { if (/ungeprüft|Vorschlag/i.test(innen)) return ' ⟪ug⟫'; if (/abgeleitet|laut|nach |Quelle|🔎|Warentest|BfR|gelesen/i.test(innen)) { abgeleitet = true; return ''; } return m; });
  t = t.replace(/\s*\((?:Vorschlag, )?ungeprüft\)/g, ' ⟪ug⟫');
  t = quellKuerzelWeg(t);
  return { text: t, belege: [...new Set(belege)], abgeleitet };
}
/* Kürzel aus Rezeptvergleichen (A–E) sind ohne Vergleichstabelle unverständlich */
const quellKuerzelWeg = s => String(s || '').replace(/\s*\(([A-E])(?:\s*,\s*[A-E])*\)/g, '').replace(/,?\s*laut [A-E]\b/g, '').replace(/\(\s*([^()]*?),\s*\)/g, '($1)');
function belegeHtml(a) {
  if (!a.belege.length && !a.abgeleitet) return '';
  const qs = a.belege.map(id => { const q = K.quellen[id]; const n = q ? (q.kurz || q.titel || id) : id; return q && q.url ? `<a href="${esc(q.url)}" target="_blank" rel="noopener">${esc(String(n).slice(0, 60))}</a>` : esc(String(n).slice(0, 60)); });
  return `<p class="belege">${qs.length ? 'Belege: ' + qs.join(' · ') : ''}${a.abgeleitet ? `${qs.length ? ' · ' : ''}teils aus Quellen abgeleitet` : ''}</p>`;
}
/* Einleitung in Überblick, Herkunft/Prüfstatus, Geräte und Sicherheit aufteilen */
function einleitungTeile(r) {
  const z = String(r.einleitung || '').replace(/\r/g, '').split('\n'); const t = { ueberblick: [], herkunft: [], geraete: [], sicherheit: [], sonst: [] };
  let i = 0;
  while (i < z.length) {
    const c = z[i].match(/^>\s*\[!(\w+)\][+-]?\s*(.*)$/);
    if (c) { const typ = c[1].toLowerCase(), titel = c[2]; const innen = []; i++; while (i < z.length && /^>/.test(z[i])) { innen.push(z[i].replace(/^>\s?/, '')); i++; }
      const body = innen.filter(x => !/^Kennzeichnung:/.test(x) && !/Nährwertschätzung|Details und Grenzen:/.test(x) && !INTERN_ZEILE.test(x)).join('\n');
      if (typ === 'abstract') t.ueberblick.push(body);
      else if (typ === 'warning' && /Entwurf|erprobt|Quelle|angelehnt/i.test(titel + ' ' + body)) t.herkunft.push(body);
      else if (/Geräte/i.test(titel)) t.geraete.push(body);
      else if (typ === 'danger' || typ === 'warning') t.sicherheit.push(`> [!${typ}] ${titel}\n` + body.split('\n').map(x => '> ' + x).join('\n'));
      else t.sonst.push(`> [!${typ}]- ${titel}\n` + body.split('\n').map(x => '> ' + x).join('\n'));
      continue; }
    if (z[i].trim() && !INTERN_ZEILE.test(z[i])) t.ueberblick.push(z[i]);
    i++;
  }
  return t;
}
const ABSCHNITT_VERBERGEN = /Version|Archiv|Redaktion|Bearbeitung|Kochprotokoll/i;
const ABSCHNITT_HINTERGRUND = /Quellen|Anpassungen gegenüber|Nährwertschätzung|Rezeptvergleich|Methodik/i;
function abschnitteTeile(r) {
  const t = { ablauf: null, aufbewahren: null, sicherheit: [], hinweise: [], hintergrund: [] };
  r.abschnitte.forEach(a => {
    if (ABSCHNITT_VERBERGEN.test(a.titel)) return;
    const mdt = ohneIntern(a.md); if (!mdt.trim()) return;
    if (/^Ablauf auf einen Blick/.test(a.titel)) t.ablauf = { titel: a.titel, md: mdt };
    else if (/^Vorkochen und Aufbewahren/.test(a.titel)) t.aufbewahren = { titel: a.titel, md: mdt };
    else if (/Sicherheit|Gargrad/i.test(a.titel)) t.sicherheit.push({ titel: a.titel, md: mdt });
    else if (ABSCHNITT_HINTERGRUND.test(a.titel)) t.hintergrund.push({ titel: a.titel, md: mdt });
    else t.hinweise.push({ titel: a.titel, md: mdt });
  });
  return t;
}
/* Einstiegssammlungen – setzen nur Filter, kein Plan */
const SAMMLUNGEN = [
  ['schnell-protein', 'Schnell & proteinreich', { richtung: ['schnell', 'proteinreich'] }],
  ['japanisch', 'Japanisch entdecken', { kuechen: ['japanisch'] }],
  ['vorkochen', 'Gut vorzukochen', { richtung: ['vorkochen'] }],
  ['guenstig', 'Günstig (Schätzung)', { richtung: ['guenstig'] }],
  ['anspruchsvoll', 'Anspruchsvoller kochen', { richtung: ['anspruchsvoll'] }],
  ['vegetarisch', 'Vegetarisch', { richtung: ['vegetarisch'] }]
];
const SCHNELLFILTER = ['schnell', 'proteinreich', 'vegetarisch', 'vorkochen'];
function aktiveFilter(f) {
  const a = [];
  if (f.bereich) a.push(['bereich', BEREICH_NAME[f.bereich] || f.bereich, `data-a="bereich" data-v=""`]);
  if (f.kuechen.length) a.push(['kuechen', f.kuechen.map(k => KUECHE_NAME[k] || k).join(' oder '), `data-a="kueche-alle-weg"`]);
  f.richtung.forEach(e => a.push(['e:' + e, EIGENSCHAFT[e] ? EIGENSCHAFT[e][1] : e, `data-a="richtung" data-v="${esc(e)}"`]));
  if (f.maxGesamt) a.push(['maxGesamt', `gesamt ≤ ${f.maxGesamt} Min.`, `data-a="filter-weg" data-v="maxGesamt"`]);
  if (f.maxAktiv) a.push(['maxAktiv', `aktiv ≤ ${f.maxAktiv} Min.`, `data-a="filter-weg" data-v="maxAktiv"`]);
  if (f.suche) a.push(['suche', `„${f.suche}“`, `data-a="filter-weg" data-v="suche"`]);
  return a;
}
function filterKopfHtml(f, treffer, persoenlichAus, geraeteAus) {
  const a = aktiveFilter(f);
  const persoenlich = persoenlichAus + (f.ohneGeraete ? 0 : geraeteAus);
  return `<div class="aktivfilter" role="status" aria-live="polite"><b>${treffer} ${treffer === 1 ? 'Rezept' : 'Rezepte'}</b>${a.length ? ` · ${a.map(([, t, at]) => `<button class="chip entfernen" ${at} aria-label="Filter ${esc(t)} entfernen">${esc(t)} ×</button>`).join('')} <button class="still klein" data-a="filter-reset">Alle zurücksetzen</button>` : ''}
    ${persoenlich ? `<span class="leise klein">${a.length ? '' : ' · '}${persoenlich} weitere ausgeblendet durch <a href="#/mehr">persönliche Ausschlüsse${geraeteAus && !f.ohneGeraete ? ' oder fehlende Geräte' : ''}</a> – gelten immer zusätzlich.</span>` : ''}</div>`;
}
function lockerungenHtml(f, kandidaten) {
  const a = aktiveFilter(f); if (!a.length) return '';
  const vorschlaege = a.map(([key, t]) => [key, t, kandidaten.filter(({ r, info }) => filterPasst(r, info, f, key)).length]).filter(x => x[2] > 0).sort((x, y) => y[2] - x[2]).slice(0, 4);
  return `<div class="leer">${ico('leer')}<p><b>Keine Treffer mit dieser Kombination.</b></p>${vorschlaege.length ? `<p class="klein">Lockern – du entscheidest:</p><div class="chips" style="justify-content:center">${vorschlaege.map(([key, t, n]) => `<button class="filterchip" data-a="filter-locker" data-v="${esc(key)}">ohne „${esc(t)}“: ${n} ${n === 1 ? 'Treffer' : 'Treffer'}</button>`).join('')}</div>` : '<p class="klein">Auch einzeln gelockert passt nichts – Filter zurücksetzen oder persönliche Einstellungen prüfen.</p>'}</div>`;
}
function filterAktion(a, v, b) {
  const f = filterZustand;
  if (a === 'kueche') { f.kuechen = f.kuechen.includes(v) ? f.kuechen.filter(x => x !== v) : [...f.kuechen.filter(x => !(KUECHE_GRUPPE[x] === v) && x !== KUECHE_GRUPPE[v]), v]; return true; }
  if (a === 'kueche-alle-weg') { f.kuechen = []; return true; }
  if (a === 'filter-weg') { f[v] = ''; return true; }
  if (a === 'filter-reset') { Object.assign(f, { bereich: '', kuechen: [], richtung: [], maxGesamt: '', maxAktiv: '', suche: '' }); return true; }
  if (a === 'filter-locker') { if (v.startsWith('e:')) f.richtung = f.richtung.filter(x => x !== v.slice(2)); else if (v === 'kuechen') f.kuechen = []; else f[v] = ''; return true; }
  return false;
}
function kuechenLeisteHtml(f) {
  const vorhanden = new Set(K.rezepte.flatMap(rezeptKuechen));
  const chips = [];
  KUECHEN_GRUPPEN.forEach(([g, gn, subs]) => {
    const da = subs.filter(([k]) => vorhanden.has(k)); if (!da.length) return;
    chips.push(`<button class="filterchip gruppe" data-a="kueche" data-v="${g}" aria-pressed="${f.kuechen.includes(g)}">${esc(gn)}</button>`);
    da.forEach(([k, n]) => chips.push(`<button class="filterchip" data-a="kueche" data-v="${k}" aria-pressed="${f.kuechen.includes(k) || f.kuechen.includes(g)}">${esc(n)}</button>`));
  });
  return chips.length ? `<div class="filterleiste" role="group" aria-label="Küche (mehrere = eine davon)">${chips.join('')}</div>` : '';
}
function herkunftHtml(r) {
  const m = r.meta; const ks = rezeptKuechen(r);
  if (!ks.length && !m.herkunft_art) return '';
  return `<p>${ks.length ? esc(ks.map(k => KUECHE_NAME[k]).join(', ')) + ' · ' : ''}${esc(HERKUNFT_ART[m.herkunft_art] || '')}${m.herkunft_notiz ? `<br><span class="leise">${esc(m.herkunft_notiz)}</span>` : ''}</p>`;
}

/* ---------- Mengen-Anpassung ---------- */
const R0 = {};
const SK_VORSICHTIG = new Set(['zut-salz', 'zut-chili', 'zut-speisestaerke', 'zut-agar-agar', 'zut-backpulver', 'zut-natron', 'zut-hefe', 'zut-sojasauce', 'zut-fischsauce', 'zut-gochujang', 'zut-paprikapulver', 'zut-currypulver']);
function zeilenSkalierung(z) {
  if (z.skalierung) return z.skalierung;
  if (z.menge == null) return 'bedarf';
  if (/^(Stück|Stk\.?|Zehen?|Eier?|Dosen?|Stangen?|Scheiben?|Blatt|Blätter|Bund)$/i.test(z.einheit || '')) return 'stueck';
  if (/^(Prisen?|Spritzer)$/i.test(z.einheit || '')) return 'fest';
  const zu = Z[z.zutat]; if (zu && (SK_VORSICHTIG.has(zu.id) || zu.kategorie === 'gewuerz')) return 'vorsichtig';
  return 'linear';
}
function praktisch(m, e) {
  if (m == null || isNaN(m)) return m;
  if (/^(g|ml)$/.test(e)) { const s = m < 10 ? 0.5 : m < 50 ? 1 : m < 200 ? 5 : 10; return Math.max(s, Math.round(m / s) * s); }
  if (/^(EL|TL)$/.test(e)) return Math.max(0.25, Math.round(m * 4) / 4);
  return Math.round(m * 100) / 100;
}
function zeilenNeu(z, F) {
  const art = zeilenSkalierung(z);
  if (z.menge == null || art === 'bedarf') return { menge: z.menge, hinweis: 'nach Bedarf', art };
  if (art === 'fest') return { menge: z.menge, hinweis: 'bleibt gleich', art };
  if (art === 'vorsichtig') { const f2 = F > 1 ? 1 + (F - 1) * 0.75 : F; return { menge: praktisch(z.menge * f2, z.einheit), hinweis: F > 1 ? 'vorsichtige Startmenge – abschmecken, ggf. nachgeben' : 'abschmecken', art }; }
  if (art === 'stueck') { const roh = z.menge * F; const ganz = Math.max(1, Math.round(roh)); return { menge: ganz, hinweis: Math.abs(roh - ganz) >= 0.25 ? `rechnerisch ${zahlDE(roh, 1)}, gerundet${z.zutat === 'zut-ei' ? ' – oder Eier verquirlen und anteilig abwiegen' : ''}` : '', art }; }
  return { menge: praktisch(z.menge * F, z.einheit), hinweis: '', art };
}
function folgeKomponenten(r, k) {
  const regeln = arr(r.meta.skalierung_beziehungen).map(s => String(s).match(/^\s*(\w+)\s+folgt\s+(\w+)\s*$/)).filter(Boolean);
  const s = new Set([k]); let neu = true;
  while (neu) { neu = false; for (const [, a, b] of regeln) if (s.has(b) && !s.has(a)) { s.add(a); neu = true; } }
  return s;
}
/* plan: welche Zeilen ändern sich wie (Basis = aktuell wirksames Rezept) */
function anpassungPlan(r, idx, neu, option) {
  const z0 = r.zutaten[idx]; const F = neu / z0.menge;
  const komps = option === 'komponenten' ? folgeKomponenten(r, z0.komponente) : null;
  const zeilen = [];
  r.zutaten.forEach((z, i) => {
    const dabei = option === 'alle' || i === idx || (komps && z.komponente && komps.has(z.komponente));
    if (!dabei || z.menge == null) return;
    if (i === idx) { zeilen.push({ i, alt: z.menge, neu, hinweis: 'deine Menge', art: zeilenSkalierung(z) }); return; }
    const n = zeilenNeu(z, F); if (n.menge === z.menge && n.art !== 'fest') return;
    zeilen.push({ i, alt: z.menge, neu: n.menge, hinweis: n.hinweis, art: n.art });
  });
  return { F, zeilen, komps };
}
/* Allgemeine Werte einer Katalogzutat je 100 g (erster BLS-/USDA-Eintrag) */
function zutatWerte100(id) { const z = Z[id]; if (!z || !z.bls) return null; const c = Object.keys(z.bls)[0]; return c ? z.bls[c].werte : null; }
/* Ersatz in einer persönlichen Variante: andere Zutat bzw. anderes Produkt. Mit Katalogzutat und Grammzahl werden die
   Beiträge neu berechnet, sonst bleibt der Wert unbekannt (nie still mit der Originalzutat weiterrechnen). */
function ersatzZeile(z, e) {
  const w = e.zutat ? zutatWerte100(e.zutat) : null; const g = Number(e.gramm) || null;
  const neu = Object.assign({}, z, { text: e.text || (Z[e.zutat] || {}).name || z.text, zutat: e.zutat || null, _ersatz: { original: z.text }, _m: 1, menge: g != null ? g : z.menge, einheit: g != null ? 'g' : z.einheit, menge_text: g != null ? zahlDE(g) : z.menge_text, alltagsmass: '', bedarf: z.bedarf === 'grundvorrat' ? 'normal' : z.bedarf });
  if (w && g) { const b = {}; Object.keys(z.beitrag || w).forEach(k => { b[k] = w[k] == null ? null : Math.round(w[k] * g / 100 * 1000) / 1000; }); neu.beitrag = b; neu.naehr_status = 'berechnet'; neu.gramm = g; }
  else if (z.naehr_status === 'berechnet') { neu.beitrag = Object.fromEntries(Object.keys(z.beitrag || {}).map(k => [k, null])); }
  return neu;
}
function effektivesRezept(r0, a) {
  const P = Number(a.portionen) || Number(r0.meta.portionen) || 1;
  const ers = {}; arr(a.ersatz).forEach(e => { if (e && e.i != null) ers[e.i] = e; });
  const zut = r0.zutaten.map((z, i) => { if (ers[i]) return ersatzZeile(z, ers[i]); const neu = a.mengen ? a.mengen[i] : null; if (neu == null || z.menge == null || neu === z.menge) return Object.assign({}, z, { _m: 1 }); return Object.assign({}, z, { menge: neu, menge_text: zahlDE(neu, 2), _m: neu / z.menge, _orig: z.menge }); });
  const n0 = r0.naehrwerte; const mitBeitrag = zut.some(z => z.naehr_status);
  const pp = {};
  for (const k of Object.keys(n0.pro_portion)) {
    if (n0.pro_portion[k] == null || !mitBeitrag) { pp[k] = null; continue; }
    let s = 0, ok = true; zut.forEach(z => { if (z.naehr_status === 'berechnet') { const b = z.beitrag ? z.beitrag[k] : null; if (b == null) ok = false; else s += b * z._m; } });
    pp[k] = ok ? Math.round(s / P * (k === 'salz' ? 100 : 10)) / (k === 'salz' ? 100 : 10) : null;
  }
  const mp = {};
  for (const k of Object.keys(n0.mikro_pro_portion || {})) { let s = 0; zut.forEach(z => { if (z.naehr_status === 'berechnet' && z.beitrag && z.beitrag[k] != null) s += z.beitrag[k] * z._m; }); mp[k] = { w: mitBeitrag ? Math.round(s / P * 1000) / 1000 : null, abdeckung: mitBeitrag ? n0.mikro_pro_portion[k].abdeckung : 0 }; }
  const naehrwerte = Object.assign({}, n0, { pro_portion: pp, mikro_pro_portion: mp, angepasst: true, status: mitBeitrag ? n0.status : 'unvollstaendig' });
  return Object.assign({}, r0, { meta: Object.assign({}, r0.meta, { portionen: P, portionen_original: r0.meta.portionen }), zutaten: zut, naehrwerte, angepasst: a });
}
const originalAnsicht = {};   // „Original anzeigen“ trotz Standard-Variante – nur für diese Sitzung
function varianteAlsAnpassung(x) { return { mengen: Object.assign({}, x.mengen || {}), portionen: x.portionen, ersatz: arr(x.ersatz).map(e => Object.assign({}, e)), beschreibung: 'Variante „' + x.name + '“' + (x.beschreibung ? ': ' + x.beschreibung : ''), variante: x.name, notiz: x.notiz || '', geraete: x.geraete || '', geaendert: new Date().toISOString() }; }
function rezepteAktualisieren() {
  if (!Object.keys(R0).length) K.rezepte.forEach(r => { R0[r.id] = r; });
  const an = (D && D.anpassungen) || {}; const std = ((D && D.kochbuch) || {}).variante_standard || {};
  for (const id in R0) {
    if (an[id]) { R[id] = effektivesRezept(R0[id], an[id]); continue; }
    const v = std[id] != null && !originalAnsicht[id] ? arr((D.varianten || {})[id])[std[id]] : null;   // als Standard gewählte persönliche Variante
    R[id] = v ? effektivesRezept(R0[id], varianteAlsAnpassung(v)) : R0[id];
  }
}
/* Zubereitungshinweise bei geänderter Menge – keine erfundene Genauigkeit */
function anpassungHinweise(r0, rNeu) {
  const h = []; const m = r0.meta; const P0 = Number(m.portionen) || 1;
  const prot = rNeu.zutaten.filter(z => z.komponente === 'protein'); const basis = prot.length ? prot : rNeu.zutaten;
  const maxF = Math.max(1, ...basis.map(z => z._m || 1));
  const aequiv = P0 * maxF;
  if (m.portionen_pro_durchgang && aequiv > Number(m.portionen_pro_durchgang)) h.push(`Pfanne: ca. ${Math.ceil(aequiv / Number(m.portionen_pro_durchgang))} Durchgänge statt ${Math.ceil(P0 / Number(m.portionen_pro_durchgang))} (nicht stapeln) – die aktive Zeit steigt entsprechend.`);
  if (rNeu.zutaten.some(z => z.zutat === 'zut-reis' && (z._m || 1) > 1) && arr(m.geraete).includes('reiskocher')) h.push('Mehr Reis: Füllgrenze und Wassermenge laut Anleitung deines Reiskochers prüfen; ein Topf geht auch.');
  if (maxF > 1.25) h.push('Mehr Menge braucht länger zum Aufkochen und Erhitzen; Garzeiten und Temperaturen nicht hochrechnen, sondern nach den Erkennungsmerkmalen in den Schritten garen. Topfgröße prüfen.');
  if (Number(rNeu.meta.portionen) > P0 && rNeu.zutaten.some(z => ['beilage', 'gemuese'].includes(z.komponente) && (z._m || 1) === 1)) h.push('Beilage und Gemüse bleiben unverändert – bei mehr Portionen verteilen sie sich auf mehr Teller.');
  // Salz, Sojasauce, Chili & Co. wirken nicht linear: hochgerechnet steht die Menge in der Liste, gewürzt wird schrittweise
  const wuerz = rNeu.zutaten.filter(z => (z._m || 1) > 1.2 && z.zutat && Z[z.zutat] && (['gewuerz_kraut', 'wuerzmittel', 'sauce'].includes(Z[z.zutat].kategorie) || /salz|sojasauce|fischsauce|chili|pfeffer|brühe/i.test(Z[z.zutat].name)));
  if (wuerz.length) h.push(`Würzen nicht blind hochrechnen (${wuerz.slice(0, 4).map(z => Z[z.zutat].name).join(', ')}): zuerst etwa die ursprüngliche Menge nehmen, dann abschmecken und nachwürzen.`);
  return h;
}

/* Dialog-Zustand (nur im Arbeitsspeicher) */
let anpassDialog = null;
function anpassPanelHtml(r) {
  const d = anpassDialog; if (!d || d.rid !== r.id) return '';
  const z = r.zutaten[d.i]; if (!z) return '';
  const name = Z[z.zutat] ? Z[z.zutat].name : z.text;
  const kompMoeglich = z.komponente && folgeKomponenten(r, z.komponente).size > 1;
  const komps = kompMoeglich ? [...folgeKomponenten(r, z.komponente)] : [];
  const unver = [...new Set(r.zutaten.filter(x => x.komponente && !komps.includes(x.komponente)).map(x => x.komponente))];
  const radio = (wert, titel, unter, an, aus) => `<label${aus ? ' class="aus"' : ''}><input type="radio" name="anp-opt" value="${wert}" ${an ? 'checked' : ''} ${aus ? 'disabled' : ''}><span>${titel}<small>${unter}</small></span></label>`;
  return `<div class="karte anpassen" id="anp-panel"><h3 style="margin-top:0">Menge ändern: ${esc(name)}</h3>
    <label class="feld"><span>Neue Menge – im Rezept stehen ${fmtMenge(z.menge, z.einheit)} ${esc(z.einheit)}</span><span class="zeile" style="align-items:center"><input id="anp-neu" type="number" inputmode="decimal" min="0" step="any" value="${esc(d.neu)}" style="width:8em"> ${esc(z.einheit)}</span></label>
    <fieldset><legend>Wie soll das Rezept folgen?</legend><div class="wahl">
      ${radio('alle', 'Ganzes Rezept skalieren', 'alle Zutaten im gleichen Verhältnis', d.option === 'alle')}
      ${radio('komponenten', 'Zugehörige Teile mitanpassen', kompMoeglich ? `${komps.map(k => KOMPONENTE_NAME[k] || k).join(', ')} wachsen mit${unver.length ? '; ' + unver.map(k => KOMPONENTE_NAME[k] || k).join(', ') + ' bleiben' : ''}` : 'für dieses Rezept nicht hinterlegt', d.option === 'komponenten', !kompMoeglich)}
      ${radio('einzeln', 'Nur diese Zutat', 'alles andere bleibt', d.option === 'einzeln')}</div></fieldset>
    <fieldset><legend>Was ergibt die Änderung?</legend><div class="wahl">
      <label><input type="radio" name="anp-port-art" value="groesser" ${d.portionenArt === 'groesser' ? 'checked' : ''}><span>Größere Portionen<small>weiter ${zahlDE(Number(r.meta.portionen), 1)} Portionen</small></span></label>
      <label><input type="radio" name="anp-port-art" value="mehr" ${d.portionenArt === 'mehr' ? 'checked' : ''}><span>Mehr Portionen<small>Anzahl unten einstellen</small></span></label></div>
      <label class="feld" ${d.portionenArt === 'mehr' ? '' : 'hidden'} id="anp-port-feld"><span>Portionen</span><input id="anp-port" type="number" inputmode="decimal" min="0.5" step="0.5" value="${esc(d.portionen)}" style="width:6em"></label></fieldset>
    <div id="anp-vorschau">${anpassVorschauHtml(r)}</div>
    <div class="knopfreihe"><button class="haupt" data-a="anp-ok">Für diesen Kochvorgang übernehmen</button><button class="still" data-a="anp-abbruch">Abbrechen</button></div></div>`;
}
const KOMPONENTE_NAME = { protein: 'Protein', sauce: 'Sauce', basis: 'Basis', gemuese: 'Gemüse', beilage: 'Beilage', garnitur: 'Garnitur', teig: 'Teig', fuellung: 'Füllung', dressing: 'Dressing', topping: 'Topping' };
function anpassVorschau(r) {
  const d = anpassDialog; const neu = Number(String(d.neu).replace(',', '.'));
  if (!(neu > 0)) return null;
  const plan = anpassungPlan(r, d.i, neu, d.option);
  plan.zeilen.forEach(z => { if (d.manuell[z.i] != null && d.manuell[z.i] !== '') { z.neu = Number(d.manuell[z.i]); z.hinweis = 'von dir korrigiert'; } });
  const P = d.portionenArt === 'mehr' ? (Number(String(d.portionen).replace(',', '.')) || Number(r.meta.portionen)) : Number(r.meta.portionen);
  const basis = R0[r.id]; const alt = r.angepasst ? r.angepasst.mengen || {} : {};
  const mengen = Object.assign({}, alt); plan.zeilen.forEach(z => { mengen[z.i] = z.neu; });
  const probe = effektivesRezept(basis, { mengen, portionen: P });
  return { plan, P, mengen, probe };
}
function anpassVorschauHtml(r) {
  const v = anpassVorschau(r); if (!v) return '<p class="leise klein">Bitte eine Menge größer als 0 eingeben.</p>';
  const np = v.probe.naehrwerte.pro_portion, np0 = r.naehrwerte.pro_portion;
  const hinweise = anpassungHinweise(R0[r.id], v.probe);
  return `<h4>Vorschau – ${v.plan.zeilen.length} ${v.plan.zeilen.length === 1 ? 'Zutat ändert' : 'Zutaten ändern'} sich (Faktor ${zahlDE(v.plan.F, 2)})</h4>
    <div class="tabelle-wrap"><table class="anp-tabelle"><thead><tr><th>Zutat</th><th>bisher</th><th>neu</th><th>Hinweis</th></tr></thead><tbody>
    ${v.plan.zeilen.map(z => { const zz = r.zutaten[z.i]; return `<tr><td>${esc(Z[zz.zutat] ? Z[zz.zutat].name : zz.text)}</td><td>${fmtMenge(z.alt, zz.einheit)} ${esc(zz.einheit)}</td><td><input type="number" inputmode="decimal" step="any" min="0" data-anp-manuell="${z.i}" value="${esc(z.neu)}" aria-label="neue Menge ${esc(zz.text)}" style="width:5.5em"> ${esc(zz.einheit)}</td><td class="leise klein">${esc(z.hinweis)}</td></tr>`; }).join('')}
    </tbody></table></div>
    <p class="klein">Pro Portion (${zahlDE(v.P, 1)} Portionen): <b>${np.kcal != null ? zahlDE(np.kcal) + ' kcal' : 'kcal unbekannt'}</b> · ${np.protein != null ? zahlDE(np.protein, 1) + ' g Protein' : 'Protein unbekannt'}${np0.kcal != null && np.kcal != null ? ` <span class="leise">(bisher ${zahlDE(np0.kcal)} kcal · ${zahlDE(np0.protein, 1)} g)</span>` : ''}. Berechnet mit den übernommenen, gerundeten Mengen; unbekannte Werte bleiben unbekannt.</p>
    ${hinweise.length ? `<ul class="klein">${hinweise.map(h => `<li>${esc(h)}</li>`).join('')}</ul>` : ''}`;
}
function anpassStart(rid, i) {
  const r = R[rid]; const z = r.zutaten[i]; if (!z || z.menge == null) return;
  const kompMoeglich = z.komponente && folgeKomponenten(r, z.komponente).size > 1;
  anpassDialog = { rid, i, neu: z.menge, option: kompMoeglich ? 'komponenten' : 'alle', portionenArt: kompMoeglich ? 'groesser' : 'mehr', portionen: Number(r.meta.portionen), manuell: {} };
  route(); const el = $('#anp-panel'); if (el) { el.scrollIntoView({ block: 'start' }); const inp = $('#anp-neu'); if (inp) inp.select(); }
}
function anpassVorschauNeu() { const r = R[anpassDialog.rid]; const el = $('#anp-vorschau'); if (el) el.innerHTML = anpassVorschauHtml(r); }
function anpassUebernehmen() {
  const r = R[anpassDialog.rid]; const v = anpassVorschau(r); if (!v) { toast('Bitte eine gültige Menge eingeben'); return; }
  const rid = r.id; const z = r.zutaten[anpassDialog.i];
  const beschr = `${Z[z.zutat] ? Z[z.zutat].name : z.text} ${fmtMenge(R0[rid].zutaten[anpassDialog.i].menge, z.einheit)} → ${fmtMenge(Number(anpassDialog.neu), z.einheit)} ${z.einheit} · ${{ alle: 'ganzes Rezept', komponenten: 'zugehörige Teile', einzeln: 'nur diese Zutat' }[anpassDialog.option]}`;
  anpassDialog = null; portionenWahl[rid] = v.P;
  aendere('Angepasst – gilt für diesen Kochvorgang', d => {
    d.anpassungen = d.anpassungen || {};
    const mengen = {}; Object.entries(v.mengen).forEach(([i, m]) => { if (R0[rid].zutaten[i] && m !== R0[rid].zutaten[i].menge) mengen[i] = m; });
    d.anpassungen[rid] = { mengen, portionen: v.P, beschreibung: beschr, geaendert: new Date().toISOString() };
    const a = d.auswahl.find(x => x.rezept === rid); if (a) a.jetzt = Math.max(0.5, v.P - a.vorkochen);
  });
}
function anpassungBannerHtml(r) {
  const vs = ((D.varianten || {})[r.id] || []); const std = ((D.kochbuch || {}).variante_standard || {})[r.id];
  const a = r.angepasst; const nurStandard = a && !(D.anpassungen || {})[r.id];
  const ersatzText = a && arr(a.ersatz).length ? ' · Ersatz: ' + arr(a.ersatz).map(e => `${esc((R0[r.id].zutaten[e.i] || {}).text || '')} → ${esc(e.text || (Z[e.zutat] || {}).name || '?')}`).join(', ') : '';
  return `${a ? `<div class="hinweis variante-banner"><b>${nurStandard ? `Deine Variante „${esc(a.variante)}“ (als Standard gewählt)` : a.variante ? `Variante „${esc(a.variante)}“ für diesen Kochvorgang` : 'Angepasst für diesen Kochvorgang'}:</b> ${a.variante ? '' : esc(a.beschreibung || 'eigene Mengen') + ' · '}${zahlDE(Number(a.portionen), 1)} Portionen (Original: ${esc(R0[r.id].meta.portionen)})${ersatzText}.
      ${arr(a.ersatz).length ? `<br><b>Achtung Ersatz:</b> Text und Schritte nennen weiter die Originalzutat. Garzeit und Gargrad für den Ersatz selbst prüfen – z. B. Geflügel und Hack immer vollständig durchgaren.` : ''}
      ${a.notiz ? `<br><b>Deine Notiz:</b> ${esc(a.notiz)}` : ''}${a.geraete ? `<br><b>Gerätehinweis:</b> ${esc(a.geraete)}` : ''}
      <br><span class="leise klein">Einkauf, Kochschritte, Nährwerte, Vorrat und Restportionen nutzen diese Fassung. Das Grundrezept bleibt unverändert, bereits gebuchte Mahlzeiten auch.</span>
      <div class="knopfreihe"><button class="klein" data-a="anp-zurueck" data-v="${esc(r.id)}">Original anzeigen</button>${a.variante ? '' : `<button class="klein still" data-a="var-editor" data-v="${esc(r.id)}">Als persönliche Variante speichern</button>`}</div></div>` : ''}
    ${vs.length ? `<div class="klein varianten-liste"><b>Deine Varianten:</b> ${vs.map((x, ix) => `<span class="var-eintrag"><button class="chip ${a && a.variante === x.name ? 'akzent' : ''}" data-a="anp-var-an" data-v="${esc(r.id)}" data-ix="${ix}" aria-pressed="${!!(a && a.variante === x.name)}">${esc(x.name)}${std === ix ? ' ★' : ''}</button><button class="still klein" data-a="var-editor" data-v="${esc(r.id)}" data-ix="${ix}" aria-label="Variante ${esc(x.name)} bearbeiten">${ico('stift', 'klein')}</button></span>`).join(' ')}</div>` : ''}
    ${varEditorHtml(r)}`;
}
/* Editor für persönliche Varianten: Name, Portionen, Ersatzzutaten/-produkte, Notiz, Gerätehinweis. Mengen kommen aus der aktuellen Anpassung (Stift an der Zutat). */
let varEditor = null;
function varEditorHtml(r) {
  const e = varEditor; if (!e || e.rid !== r.id) return '';
  const r0 = R0[r.id]; const zeilen = r0.zutaten.map((z, i) => [i, z]).filter(([, z]) => z.zutat || z.text);
  return `<form class="karte var-editor" id="var-form"><h3 style="margin-top:0">${e.ix != null ? 'Variante bearbeiten' : 'Persönliche Variante speichern'}</h3>
    <p class="leise klein">Nur auf diesem Gerät, im Export enthalten. Das Grundrezept bleibt unverändert. Mengen änderst du über den Stift an einer Zutat; die aktuelle Anpassung wird übernommen.</p>
    <div class="zeile"><label class="feld" style="flex:2 1 200px"><span>Name</span><input name="name" required maxlength="40" value="${esc(e.name)}" placeholder="z. B. weniger süß, 500-g-Packung"></label>
    <label class="feld"><span>Portionen</span><input name="portionen" type="number" min="0.5" step="0.5" inputmode="decimal" value="${esc(e.portionen)}" style="width:6em"></label></div>
    <fieldset><legend>Andere Zutat oder anderes Produkt</legend>
      ${e.ersatz.length ? `<ul class="klein">${e.ersatz.map((x, k) => `<li>${esc((r0.zutaten[x.i] || {}).text || '')} → <b>${esc(x.text || (Z[x.zutat] || {}).name || '')}</b>${x.gramm ? ` · ${zahlDE(x.gramm)} g` : ''}${x.zutat && x.gramm ? ' · Nährwerte neu berechnet' : ' · <span class="ug">Nährwerte unbekannt</span>'} <button type="button" class="still klein" data-a="var-ersatz-weg" data-ix="${k}" aria-label="Ersatz entfernen">×</button></li>`).join('')}</ul>` : ''}
      <div class="zeile"><label class="feld" style="flex:1 1 160px"><span>Statt</span><select name="ers_i"><option value="">– Zutat wählen –</option>${zeilen.map(([i, z]) => `<option value="${i}">${esc(z.text)}</option>`).join('')}</select></label>
      <label class="feld" style="flex:1 1 160px"><span>nimm</span><input name="ers_text" list="var-zutaten" placeholder="z. B. Ahornsirup, Skyr"></label>
      <label class="feld"><span>Menge (g)</span><input name="ers_g" type="number" min="0" step="any" inputmode="decimal" style="width:6em"></label>
      <button type="button" class="klein" data-a="var-ersatz-add">+ Ersatz</button></div>
      <datalist id="var-zutaten">${K.zutaten.filter(z => z.bls && Object.keys(z.bls).length).map(z => `<option value="${esc(z.name)}">`).join('')}</datalist>
      <p class="leise klein">Steht der Ersatz in der Lebensmittelliste und hat eine Grammzahl, rechnet die App die Nährwerte neu. Sonst bleiben sie für dieses Gericht unbekannt.</p></fieldset>
    <label class="feld"><span>Eigene Notiz</span><textarea name="notiz" rows="2" maxlength="400">${esc(e.notiz)}</textarea></label>
    <label class="feld"><span>Hinweis zu deinen Geräten</span><input name="geraete" maxlength="200" value="${esc(e.geraete)}" placeholder="z. B. im Airfryer 12 Min. bei 200 °C"></label>
    <label><input type="checkbox" name="standard" ${e.standard ? 'checked' : ''}> Als Standard für dieses Rezept verwenden</label>
    <div class="knopfreihe"><button class="haupt" type="submit">Variante speichern</button><button type="button" class="still" data-a="var-abbruch">Abbrechen</button>${e.ix != null ? `<button type="button" class="still" data-a="anp-var-weg" data-v="${esc(r.id)}" data-ix="${e.ix}">Variante löschen</button>` : ''}</div></form>`;
}
function varEditorOeffnen(rid, ix) {
  const r = R[rid]; const x = ix != null ? arr((D.varianten || {})[rid])[ix] : null; const a = r.angepasst;
  varEditor = x ? { rid, ix, name: x.name, portionen: x.portionen || R0[rid].meta.portionen, ersatz: arr(x.ersatz).map(e => Object.assign({}, e)), notiz: x.notiz || '', geraete: x.geraete || '', mengen: Object.assign({}, x.mengen || {}), standard: ((D.kochbuch || {}).variante_standard || {})[rid] === ix }
    : { rid, ix: null, name: '', portionen: a ? a.portionen : (portionenWahl[rid] || R0[rid].meta.portionen), ersatz: a ? arr(a.ersatz).map(e => Object.assign({}, e)) : [], notiz: '', geraete: '', mengen: a ? Object.assign({}, a.mengen || {}) : {}, standard: false };
  route(); const el = document.getElementById('var-form'); if (el) el.scrollIntoView({ block: 'start' });
}
function varFormLesen() { const f = document.getElementById('var-form'); if (!f || !varEditor) return; varEditor.name = f.name.value; varEditor.portionen = f.portionen.value; varEditor.notiz = f.notiz.value; varEditor.geraete = f.geraete.value; varEditor.standard = f.standard.checked; return f; }
document.addEventListener('submit', ev => {
  if (ev.target.id !== 'var-form') return; ev.preventDefault(); varFormLesen(); const e = varEditor; const rid = e.rid;
  const name = e.name.trim(); if (!name) { toast('Bitte einen Namen eingeben'); return; }
  const x = { name, mengen: e.mengen, portionen: Number(String(e.portionen).replace(',', '.')) || Number(R0[rid].meta.portionen), ersatz: e.ersatz, notiz: e.notiz.trim(), geraete: e.geraete.trim(), beschreibung: '', rezept_version: R0[rid].meta.version || 1, geaendert: new Date().toISOString() };
  varEditor = null;
  aendere('Variante gespeichert – nur in diesem Profil, Rückgängig möglich', d => {
    d.varianten = d.varianten || {}; const l = d.varianten[rid] = d.varianten[rid] || []; let ix = e.ix;
    if (ix != null && l[ix]) l[ix] = Object.assign({}, l[ix], x); else { l.push(Object.assign({ erstellt: new Date().toISOString() }, x)); ix = l.length - 1; }
    d.kochbuch = d.kochbuch || {}; d.kochbuch.variante_standard = d.kochbuch.variante_standard || {};
    if (e.standard) d.kochbuch.variante_standard[rid] = ix; else if (d.kochbuch.variante_standard[rid] === ix) delete d.kochbuch.variante_standard[rid];
    d.anpassungen = d.anpassungen || {}; delete d.anpassungen[rid];   // gespeicherte Variante ersetzt die einmalige Anpassung
    if (!e.standard) d.anpassungen[rid] = varianteAlsAnpassung(l[ix]);   // sofort sichtbar für den nächsten Kochvorgang
    delete originalAnsicht[rid];
  }, { mitUndo: true });
});
/* Schritte: Mengen im Feld „Zutaten“ je Zeile umrechnen, wenn das Rezept angepasst ist */
function skaliereZutatenText(r, text, f) {
  if (!r || !r.angepasst) return skaliereText(text, f);
  return text.split(/(,\s*|\s+und\s+|;\s*)/).map(seg => {
    if (/^(,\s*|\s+und\s+|;\s*)$/.test(seg)) return seg;
    const s = seg.toLowerCase();
    const treffer = r.zutaten.filter(z => { const zu = z.zutat ? Z[z.zutat] : null; const namen = [zu ? zu.name : '', ...(zu && zu.aliases ? zu.aliases : []), (z.text || '').split(/[ ,(]/)[0]].filter(n => n && n.length > 2).map(n => n.toLowerCase());
      return namen.some(n => s.includes(n) || (n.length > 5 && s.includes(n.slice(0, n.length - 2)))); });
    const ms = [...new Set(treffer.map(z => Math.round((z._m || 1) * 1000) / 1000))];
    return skaliereText(seg, ms.length === 1 ? ms[0] * f : f);
  }).join('');
}

/* ---------- Passt dazu (ohne KI: hinterlegte Verknüpfungen + Regeln nach Küche und Speisebereich) ---------- */
function pdParse(s) { const [id, art, grund, quelle] = String(s).split('|'); return { id: (id || '').trim(), art: (art || '').trim(), grund: (grund || '').trim(), quelle: (quelle || '').trim() }; }
const pdArt = a => a === 'ergaenzt' ? 'ergänzt das Gericht' : a && a.startsWith('ersetzt') ? `ersetzt ${KOMPONENTE_NAME[a.split(':')[1]] || 'eine Komponente'}` : (a || '');
const pdQuelle = q => q === 'quelle' ? 'Empfehlung aus der Rezeptquelle' : 'eigener Vorschlag';
const pdErlaubt = id => R[id] && !rezeptPruefung(R[id]).hart.length;
function passtDazuDaten(r) {
  const direkt = arr(r.meta.passt_dazu).map(pdParse).filter(e => R[e.id] && e.id !== r.id);
  const rueck = K.rezepte.filter(x => x.id !== r.id && !direkt.some(d => d.id === x.id)).map(x => { const s = arr(x.meta.passt_dazu).map(pdParse).find(e => e.id === r.id); return s ? { id: x.id, art: 'ergaenzt', grund: s.grund, quelle: s.quelle, rueck: true } : null; }).filter(Boolean);
  const gruppen = new Set(rezeptKuechen(r).map(k => KUECHE_GRUPPE[k]));
  const istHaupt = r.meta.bereich === 'hauptgericht';
  const passendeBereiche = istHaupt ? ['vorspeise', 'suppe', 'salat', 'beilage', 'dessert'] : ['hauptgericht'];
  const bekannt = new Set([r.id, ...direkt.map(e => e.id), ...rueck.map(e => e.id)]);
  const regel = K.rezepte.filter(x => !bekannt.has(x.id) && passendeBereiche.includes(x.meta.bereich) && rezeptKuechen(x).some(k => gruppen.has(KUECHE_GRUPPE[k])))
    .map(x => ({ id: x.id, art: 'ergaenzt', grund: `gleiche Küchenfamilie (${KUECHE_NAME[KUECHE_GRUPPE[rezeptKuechen(x)[0]]]}), anderer Speisebereich`, quelle: 'regel' }));
  const alle = [...direkt, ...rueck, ...regel];
  return { direkt, rueck, regel, sichtbar: alle.filter(e => pdErlaubt(e.id)), ausgeblendet: alle.filter(e => !pdErlaubt(e.id)).length };
}
function kleinesMenue(r, d) {
  const pool = [...d.direkt, ...d.rueck, ...d.regel].filter(e => pdErlaubt(e.id)).map(e => R[e.id]);
  const nimm = bereiche => pool.find(x => bereiche.includes(x.meta.bereich));
  let gaenge;
  if (r.meta.bereich === 'hauptgericht') gaenge = [nimm(['suppe', 'vorspeise', 'salat']), r, nimm(['dessert'])];   // Dessert nur aus Verknüpfungen oder gleicher Küchenfamilie – keine beliebige Kombination
  else if (['vorspeise', 'suppe', 'salat'].includes(r.meta.bereich)) gaenge = [r, nimm(['hauptgericht'])];
  else gaenge = [nimm(['hauptgericht']), r];
  gaenge = gaenge.filter(Boolean); return gaenge.length >= 2 ? gaenge : null;
}
function mahlzeitWerte(rs) {
  const s = { kcal: 0, protein: 0, aktiv: 0, gesamt: 0, unbekannt: false, geraete: new Set() };
  rs.forEach(x => { const p = x.naehrwerte.pro_portion; if (p.kcal == null) s.unbekannt = true; else { s.kcal += p.kcal; s.protein += p.protein || 0; } s.aktiv += Number(x.meta.zeit_aktiv_min) || 0; s.gesamt = Math.max(s.gesamt, Number(x.meta.zeit_gesamt_min) || 0); arr(x.meta.geraete_noetig).forEach(g => s.geraete.add(g)); });
  return s;
}
function passtDazuHtml(r) {
  const d = passtDazuDaten(r); const zeig = d.sichtbar;
  const getr = arr(r.meta.getraenke).map(s => { const [name, art, grund, quelle] = String(s).split('|').map(x => (x || '').trim()); return { name, art, grund, quelle }; });
  const ohneAlk = getr.filter(g => g.art !== 'alkohol'), alk = getr.filter(g => g.art === 'alkohol');
  if (!zeig.length && !getr.length) return '';
  const inAuswahl = id => D.auswahl.some(a => a.rezept === id);
  const eintrag = e => { const x = R[e.id]; const np = x.naehrwerte.pro_portion;
    return `<li class="passt-eintrag">${bildHtml(x)}<div><a href="#/rezept/${esc(x.id)}"><b>${esc(kurztitel(x.titel))}</b></a> <span class="leise klein">· ${esc(BEREICH_NAME[x.meta.bereich] || '')}${np.kcal != null ? ' · ' + zahlDE(np.kcal) + ' kcal' : ''}${x.meta.zeit_gesamt_min ? ' · ' + esc(x.meta.zeit_gesamt_min) + ' Min.' : ''}</span>
      <br><span class="klein">${esc(pdArt(e.art))}: ${esc(e.grund)}</span> <span class="chip ${e.quelle === 'quelle' ? 'gut' : ''}">${e.quelle === 'regel' ? 'App-Regel, inhaltlich ungeprüft' : esc(pdQuelle(e.quelle))}</span></div>
      <button class="klein" data-a="pd-auswahl" data-v="${esc(x.id)}" data-zu="${esc(r.id)}" ${inAuswahl(x.id) ? 'disabled' : ''}>${inAuswahl(x.id) ? ico('haken', 'klein') + ' in der Auswahl' : ico('plus', 'klein') + ' dazu'}</button></li>`; };
  const erste = zeig.filter(e => e.quelle !== 'regel').slice(0, 3); const mehr = zeig.filter(e => !erste.includes(e));
  const menue = kleinesMenue(r, d);
  const begleit = D.auswahl.filter(a => a.zu === r.id && R[a.rezept]).map(a => R[a.rezept]);
  const mw = begleit.length ? mahlzeitWerte([r, ...begleit]) : null;
  return `<div class="karte"><h3 style="margin-top:0">Passt dazu</h3>
    ${erste.length ? `<ul class="passt" style="list-style:none;padding:0">${erste.map(eintrag).join('')}</ul>` : '<p class="leise klein">Keine hinterlegte Ergänzung, die zu deinen Einstellungen passt.</p>'}
    ${mehr.length ? `<details class="klein"><summary>Mehr Vorschläge (${mehr.length})</summary><ul class="passt" style="list-style:none;padding:0">${mehr.map(eintrag).join('')}</ul></details>` : ''}
    ${menue ? `<details class="klein"><summary>Kleines Menü</summary><ol>${menue.map(x => `<li><a href="#/rezept/${esc(x.id)}">${esc(kurztitel(x.titel))}</a> <span class="leise">(${esc(BEREICH_NAME[x.meta.bereich] || '')})</span></li>`).join('')}</ol>
      ${(() => { const s = mahlzeitWerte(menue); return `<p class="leise">Pro Person ${s.unbekannt ? 'mind. ' : 'ca. '}${zahlDE(s.kcal)} kcal · ${zahlDE(s.protein)} g Protein · aktive Zeit zusammen ca. ${s.aktiv} Min. (parallel teils kürzer) · Geräte: ${esc([...s.geraete].map(g => GERAETE[g] || g).join(', '))}.</p>`; })()}
      <button class="klein" data-a="pd-menue" data-v="${esc(menue.map(x => x.id).join(','))}" data-zu="${esc(r.id)}">${ico('plus', 'klein')} Menü in die Auswahl</button>
      <p class="leise">Zusammengestellt nach hinterlegten Verknüpfungen, Küche und Speisebereich – ohne KI und ohne geschmackliche Prüfung.</p></details>` : ''}
    ${mw ? `<p class="klein"><b>Mit deinen Ergänzungen</b> (${esc(begleit.map(x => kurztitel(x.titel)).join(', '))}): pro Person ${mw.unbekannt ? 'mind. ' : 'ca. '}${zahlDE(mw.kcal)} kcal · ${zahlDE(mw.protein)} g Protein · längste Gesamtzeit (inkl. Ruhe- und Kühlzeiten) ${mw.gesamt} Min. · Geräte: ${esc([...mw.geraete].map(g => GERAETE[g] || g).join(', '))}. Einkauf enthält alles. Ausgewählt heißt noch nicht gegessen.</p>` : ''}
    ${d.ausgeblendet ? `<p class="leise klein">${d.ausgeblendet} Vorschlag/Vorschläge wegen deiner persönlichen Ausschlüsse ausgeblendet.</p>` : ''}
    ${ohneAlk.length ? `<h4>Getränke</h4><ul class="klein">${ohneAlk.map(g => `<li><b>${esc(g.name)}</b> – ${esc(g.grund)}${g.quelle === 'quelle' ? ' <span class="chip gut">aus der Quelle</span>' : ''}</li>`).join('')}</ul>` : ''}
    ${alk.length ? `<details class="klein"><summary>Alkoholische Begleitung (nur für Erwachsene, optional)</summary><ul>${alk.map(g => `<li><b>${esc(g.name)}</b> – ${esc(g.grund)}</li>`).join('')}</ul><p class="leise">Geschmackliche Ergänzung, kein gesundheitlicher Nutzen. Alkoholfreie Getränke oben passen genauso.</p></details>` : ''}
  </div>`;
}

/* Ereignisse */
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a, v = b.dataset.v;
  if (['kueche', 'kueche-alle-weg', 'filter-weg', 'filter-reset', 'filter-locker'].includes(a)) { if (filterAktion(a, v, b)) route(); return; }
  switch (a) {
    case 'pd-auswahl': case 'pd-menue': { ev.preventDefault(); const zu = b.dataset.zu; const ids = v.split(',').filter(id => R[id]);
      const port = Math.max(1, Math.round(standardPortionen(R[zu])));
      aendere(`${ids.length > 1 ? 'Menü' : kurztitel(R[ids[0]].titel)} in der Auswahl – ausgewählt heißt noch nicht gegessen`, d => { ids.forEach(id => { if (!d.auswahl.some(x => x.rezept === id)) d.auswahl.push({ rezept: id, jetzt: port, vorkochen: 0, zu: id === zu ? undefined : zu }); }); }); break; }
    case 'anp-start': anpassStart(b.dataset.r, Number(b.dataset.i)); break;
    case 'anp-abbruch': anpassDialog = null; route(); break;
    case 'anp-ok': anpassUebernehmen(); break;
    case 'anp-zurueck': delete portionenWahl[v]; if (((D.kochbuch || {}).variante_standard || {})[v] != null) originalAnsicht[v] = true;
      aendere('Original wird angezeigt – Rückgängig möglich', d => { if (d.anpassungen) delete d.anpassungen[v]; const x = d.auswahl.find(y => y.rezept === v); if (x) x.jetzt = Math.max(1, Math.round(x.jetzt + x.vorkochen) - x.vorkochen); }, { mitUndo: true }); break;
    case 'anp-variante': case 'var-editor': varEditorOeffnen(v, b.dataset.ix != null ? Number(b.dataset.ix) : null); break;
    case 'var-abbruch': varEditor = null; route(); break;
    case 'var-ersatz-add': { const f = varFormLesen(); if (!f) break; const i = f.ers_i.value; const txt = f.ers_text.value.trim(); if (i === '' || !txt) { toast('Bitte Zutat und Ersatz angeben'); break; }
      const z = K.zutaten.find(x => x.name.toLowerCase() === txt.toLowerCase()); const g = f.ers_g.value === '' ? null : Number(f.ers_g.value);
      varEditor.ersatz = varEditor.ersatz.filter(x => x.i !== Number(i)).concat([{ i: Number(i), text: z ? z.name : txt, zutat: z ? z.id : null, gramm: g }]); route(); const el = document.getElementById('var-form'); if (el) el.scrollIntoView({ block: 'start' }); break; }
    case 'var-ersatz-weg': varFormLesen(); varEditor.ersatz.splice(Number(b.dataset.ix), 1); route(); break;
    case 'anp-var-an': { const x = D.varianten[v][Number(b.dataset.ix)]; portionenWahl[v] = x.portionen; delete originalAnsicht[v]; aendere(`Variante „${x.name}“ angewendet – Rückgängig möglich`, d => { d.anpassungen = d.anpassungen || {}; d.anpassungen[v] = varianteAlsAnpassung(x); }, { mitUndo: true }); break; }
    case 'anp-var-weg': { const ix = Number(b.dataset.ix); const x = D.varianten[v][ix]; if (!confirm(`Variante „${x.name}“ löschen?`)) return; varEditor = null;
      aendere('Variante gelöscht – Rückgängig möglich', d => { d.varianten[v].splice(ix, 1); const s = ((d.kochbuch || {}).variante_standard || {}); if (s[v] === ix) delete s[v]; else if (s[v] > ix) s[v] -= 1; if (d.anpassungen && d.anpassungen[v] && d.anpassungen[v].variante === x.name) delete d.anpassungen[v]; }, { mitUndo: true }); break; }
  }
});
document.addEventListener('input', ev => {
  const el = ev.target; if (!anpassDialog) return;
  if (el.id === 'anp-neu') { anpassDialog.neu = el.value; anpassDialog.manuell = {};
    if (anpassDialog.portionenArt === 'mehr') { const r = R[anpassDialog.rid]; const z = r.zutaten[anpassDialog.i]; const F = Number(String(el.value).replace(',', '.')) / z.menge; if (F > 0) { anpassDialog.portionen = Math.max(0.5, Math.round(Number(r.meta.portionen) * F * 2) / 2); const inp = $('#anp-port'); if (inp) inp.value = anpassDialog.portionen; } }
    anpassVorschauNeu(); }
  else if (el.id === 'anp-port') { anpassDialog.portionen = el.value; anpassVorschauNeu(); }
});
document.addEventListener('change', ev => {
  const el = ev.target; if (!anpassDialog) return;
  if (el.name === 'anp-opt') { anpassDialog.option = el.value; anpassDialog.manuell = {}; anpassVorschauNeu(); }
  else if (el.name === 'anp-port-art') { anpassDialog.portionenArt = el.value; if (el.value === 'mehr') { const r = R[anpassDialog.rid]; const z = r.zutaten[anpassDialog.i]; const F = Number(anpassDialog.neu) / z.menge; anpassDialog.portionen = Math.max(0.5, Math.round(Number(r.meta.portionen) * F * 2) / 2); const inp = $('#anp-port'); if (inp) inp.value = anpassDialog.portionen; } const fe = $('#anp-port-feld'); if (fe) fe.hidden = el.value !== 'mehr'; anpassVorschauNeu(); }
  else if (el.dataset && el.dataset.anpManuell != null) { anpassDialog.manuell[el.dataset.anpManuell] = el.value; anpassVorschauNeu(); }
});

/* ---------- Mehrere Tage planen: freiwilliger Vorschlag für Kochtermine, Portionen, Lagerung und Einkauf ----------
   Nichts wird dadurch gekauft, gekocht oder gegessen. Ziele sind Näherungen. Kosten nur aus belegten Preisen – sonst ehrlich „nicht belastbar“.
   Haltbarkeit fertig gekochter Portionen nur aus den belegten Rezeptangaben (Kühlschrank-Tage, Tiefkühlen ja/nein). */
const PL_SLOTS = [['fruehstueck', 'Frühstück'], ['mittag', 'Mittagessen'], ['abend', 'Abendessen'], ['snack', 'Snack']];
const PL_ANTEIL = { fruehstueck: 0.25, mittag: 0.3, abend: 0.3, snack: 0.15 };
function planEinst() { const p = D.wochenplan || (D.wochenplan = {}); return p.einst || (p.einst = { tage: 7, personen: 1, slots: ['abend'], termine: 3, zwei: false, max_aktiv: 45, wiederholen: 3, einfrieren: true, abwechslung: 'mittel', kuechen: [], budget: '', haendler: 'beide', restportionen: true, ziele: true }); }
const plArt = slot => slot === 'fruehstueck' ? 'fruehstueck' : slot === 'snack' ? 'snack' : 'haupt';
function plPasstArt(r, art) { const b = arr(r.meta.bereiche); return art === 'haupt' ? b.includes('hauptgericht') || b.includes('suppe') : b.includes(art); }
const plHauptzutat = r => { const z = r.zutaten.map(x => Z[x.zutat]).find(z => z && (['fleisch', 'fisch'].includes(z.kategorie) || /tofu|tempeh|linse|kichererbse|bohne|ei$|^ei,/i.test(z.name))); return z ? z.id : ''; };
function plBewertung(r, c, ziel, gewaehlt) {
  const m = r.meta, np = r.naehrwerte.pro_portion || {}; let s = 0; const gruende = [];
  if (arr(m.kategorien).includes('meal_prep')) { s += 3; gruende.push('gut vorzubereiten'); }
  if (c.kuechen.length && [m.kueche, ...arr(m.kuechen)].some(k => c.kuechen.includes(k))) { s += 3; gruende.push('bevorzugte Küche'); }
  if (c.budget !== '' && m.kosten_klasse === 'guenstig') { s += 2; gruende.push('eher günstig (Schätzklasse)'); } if (m.kosten_klasse === 'hoeher') s -= 1;
  const prio = new Set(D.vorrat.filter(v => v.geoeffnet || v.prioritaet === 'hoch' || (v.verbrauchsdatum && tageBis(v.verbrauchsdatum) <= 3)).map(v => v.zutat)); const vorrat = new Set(D.vorrat.map(v => v.zutat));
  const nutzt = r.zutaten.filter(z => z.zutat && z.bedarf !== 'grundvorrat' && vorrat.has(z.zutat)); if (nutzt.length) { s += nutzt.length + 2 * nutzt.filter(z => prio.has(z.zutat)).length; gruende.push('nutzt Vorrat: ' + [...new Set(nutzt.map(z => Z[z.zutat].name))].slice(0, 3).join(', ')); }
  if (ziel && np.protein != null) { s -= Math.abs(np.protein - ziel.protein) / 8; if (np.kcal != null) s -= Math.abs(np.kcal - ziel.kcal) / 200; if (np.protein >= ziel.protein * 0.9) gruende.push(`${zahlDE(np.protein)} g Protein je Portion`); }
  const strafe = { niedrig: 1, mittel: 3, hoch: 6 }[c.abwechslung] || 3;
  gewaehlt.forEach(g => { if (g.meta.kueche === m.kueche) s -= strafe / 2; if (plHauptzutat(g) && plHauptzutat(g) === plHauptzutat(r)) s -= strafe; });
  return { s, gruende };
}
// Lagerung je Gericht: Portionen über die abgedeckten Tage verteilen (frisch am Kochtag, dann Kühlschrank bis zur belegten Grenze, danach Tiefkühler)
function plLagerung(r, tage, proTag, c) {
  const m = r.meta; const kuehl = m.vorkochen_kuehlschrank === 'ja' ? Number(m.kuehl_max_tage) || 0 : 0; const tk = c.einfrieren && m.vorkochen_tiefkuehl === 'ja';
  const v = { jetzt: 0, kuehl: 0, tk: 0, unmoeglich: 0 };
  for (let t = 0; t < tage; t++) { if (t === 0) v.jetzt += proTag; else if (t <= kuehl) v.kuehl += proTag; else if (tk) v.tk += proTag; else v.unmoeglich += proTag; }
  return Object.assign(v, { kuehlTage: kuehl, tkOk: tk });
}
function planErstellen(c) {
  const ziele = c.ziele ? aktuelleZiele() : null; const k = Math.max(1, Math.min(Number(c.termine) || 1, Number(c.tage) || 1)); const tage = Number(c.tage) || 1, pers = Number(c.personen) || 1;
  const termTag = Array.from({ length: k }, (_, i) => Math.floor(i * tage / k));
  const gerichte = [], konflikte = [], gewaehlt = [];
  let rest = c.restportionen ? (D.restportionen || []).filter(p => p.portionen > 0 && (!p.verbrauchen_bis || tageBis(p.verbrauchen_bis) >= 0)).reduce((s, p) => s + Number(p.portionen), 0) : 0; const restGenutzt = rest;
  ['haupt', 'fruehstueck', 'snack'].forEach(art => {
    const slots = c.slots.filter(s => plArt(s) === art); if (!slots.length) return;
    const ziel = ziele && ziele.kcal ? { kcal: Number(ziele.kcal) * slots.reduce((a, s) => a + PL_ANTEIL[s], 0) / slots.length, protein: Number(ziele.protein || 0) * slots.reduce((a, s) => a + PL_ANTEIL[s], 0) / slots.length } : null;
    const proTermin = art === 'haupt' && c.zwei ? 2 : 1;
    termTag.forEach((tag, i) => {
      const tageAbgedeckt = (termTag[i + 1] != null ? termTag[i + 1] : tage) - tag; let bedarf = tageAbgedeckt * slots.length * pers;
      if (art === 'haupt' && rest > 0) { const n = Math.min(rest, bedarf); rest -= n; bedarf -= n; }
      if (bedarf <= 0) return;
      for (let d = 0; d < proTermin; d++) {
        const portionen = Math.ceil(bedarf / proTermin); const proTag = slots.length * pers / proTermin;
        const kand = K.rezepte.filter(r => plPasstArt(r, art) && !arr(ausgeschlossen(r)).length && !(geraeteFehlen(r) || []).length && !gewaehlt.includes(r));
        const zeitOk = kand.filter(r => (Number(r.meta.zeit_aktiv_min) || 999) <= Number(c.max_aktiv));
        const lagerOk = zeitOk.filter(r => !plLagerung(r, tageAbgedeckt, proTag, c).unmoeglich);
        const zuOft = proTermin === 1 && tageAbgedeckt > Number(c.wiederholen);   // mit zwei Gerichten je Termin wird abgewechselt
        const pool = lagerOk.length ? lagerOk : zeitOk;
        if (!pool.length) { konflikte.push({ art, termin: i, grund: kand.length ? `Kein ${art === 'haupt' ? 'Hauptgericht' : PL_SLOTS.find(s => s[0] === slots[0])[1]} mit höchstens ${c.max_aktiv} Min. aktiver Zeit gefunden.` : 'Keine passenden Rezepte (Ausschlüsse, Geräte).', fix: kand.length ? 'zeit' : '' }); continue; }
        const best = pool.map(r => Object.assign({ r }, plBewertung(r, c, ziel, gewaehlt))).sort((a, b) => b.s - a.s)[0];
        gewaehlt.push(best.r);
        const warn = []; const lag = plLagerung(best.r, tageAbgedeckt, proTag, c);
        if (zuOft) warn.push(`Dasselbe Gericht ${tageAbgedeckt} Tage lang – mehr als deine ${c.wiederholen} Tage. Mehr Kochtermine oder „zwei Gerichte je Termin“ wählen.`);
        if (lag.unmoeglich) warn.push(`${lag.unmoeglich} Portionen halten laut Rezept nicht bis zum Verzehrtag (Kühlschrank ${lag.kuehlTage} Tage${c.einfrieren ? ', Tiefkühlen nicht belegt' : ', Einfrieren abgewählt'}).`);
        gerichte.push({ rezept: best.r.id, art, termin: i, tag, tage: tageAbgedeckt, portionen, proTag, gruende: best.gruende, warn });
      }
    });
  });
  const ungeplant = PL_SLOTS.filter(([s]) => !c.slots.includes(s)).map(([, n]) => n);
  return { erstellt: new Date().toISOString(), gerichte, konflikte, ungeplant, rest_genutzt: restGenutzt - rest };
}
function planNaehrwerte(plan, c) {
  const tage = Number(c.tage) || 1, pers = Number(c.personen) || 1; let kcal = 0, protein = 0, luecke = false;
  plan.gerichte.forEach(g => { const r = R[g.rezept]; const np = r && r.naehrwerte.pro_portion; if (!np || np.kcal == null) { luecke = true; return; } kcal += np.kcal * g.portionen; protein += (np.protein || 0) * g.portionen; if (r.naehrwerte.status !== 'vollstaendig') luecke = true; });
  return { kcalTag: kcal / tage / pers, proteinTag: protein / tage / pers, luecke };
}
function plZusammenfassung(c) { const slotText = c.slots.map(s => PL_SLOTS.find(x => x[0] === s)[1]).join(', ') || 'keine Mahlzeit gewählt';
  return `${c.tage} Tage versorgen, ${c.personen} ${Number(c.personen) === 1 ? 'Person' : 'Personen'}, ${c.termine}× kochen${c.zwei ? ', zwei Gerichte je Termin' : ''}, geplant: ${slotText}; je Termin höchstens ${c.max_aktiv} Min. aktiv${c.einfrieren ? ', Einfrieren ok' : ', ohne Einfrieren'}${c.budget !== '' ? `, Budget ${c.budget} €` : ''}.`; }
/* Optionale Tageszuordnung: welches Gericht an welchem Tag (frisch, aus dem Kühlschrank oder aufgetaut) */
function plTageHtml(plan, c) {
  const tage = Number(c.tage) || 1; const zeilen = [];
  for (let t = 0; t < tage; t++) { const heuteG = plan.gerichte.filter(g => t >= g.tag && t < g.tag + g.tage).map(g => { const r = R[g.rezept]; if (!r) return ''; const lag = plLagerung(r, g.tage, g.portionen / g.tage, c); const off = t - g.tag; const art = off === 0 ? 'frisch gekocht' : off <= lag.kuehlTage ? 'aus dem Kühlschrank' : lag.tkOk ? 'aufgetaut (Tiefkühler)' : 'hält nicht – umplanen'; return `${esc(kurztitel(r.titel))} <span class="leise">(${art})</span>`; }).filter(Boolean);
    zeilen.push(`<li><b>Tag ${t + 1}</b>${plan.gerichte.some(g => g.tag === t) ? ' · <span class="chip">Kochtag</span>' : ''}: ${heuteG.length ? heuteG.join(' · ') : '<span class="leise">nichts geplant</span>'}</li>`); }
  return `<details class="karte"><summary><b>Nach Tagen ansehen</b> <span class="leise klein">– optional, kein Pflichtplan</span></summary><ul class="klein pl-tage">${zeilen.join('')}</ul><p class="leise klein">Die Reihenfolge innerhalb der haltbaren Tage ist frei – iss, worauf du Lust hast; Kühlschrankgrenzen beachten.</p></details>`;
}
function vPlanung() {
  const c = planEinst(); const plan = D.wochenplan.vorschlag; const ziele = aktuelleZiele();
  const chk = (name, wert, an, text) => `<label class="wahl-chip"><input type="checkbox" data-pl-liste="${name}" value="${wert}" ${an ? 'checked' : ''}> ${text}</label>`;
  const zahl = (k, text, min, max, step = 1) => `<label class="feld"><span>${text}</span><input type="number" inputmode="numeric" data-pl="${k}" min="${min}" max="${max}" step="${step}" value="${esc(c[k])}" style="width:6em"></label>`;
  const kuechen = [...new Set(K.rezepte.map(r => r.meta.kueche).filter(Boolean))].sort();
  const slotText = c.slots.map(s => PL_SLOTS.find(x => x[0] === s)[1]).join(', ') || 'keine Mahlzeit gewählt';
  const zusammenfassung = plZusammenfassung(c);
  const form = `<details class="karte" ${plan ? '' : 'open'}><summary><b>Vorgaben</b> <span class="leise klein">– ${c.tage} Tage · ${c.personen} Pers. · ${c.termine}× kochen · ${esc(slotText)}</span></summary>
    <p class="klein" style="margin:.3em 0"><b>Schnellstart:</b> <button class="klein" data-a="pl-preset" data-v="woche">7 Tage, 3× kochen, 2 Gerichte je Termin</button> <button class="klein" data-a="pl-preset" data-v="arbeitswoche">5 Tage Mittag + Abend, 2× kochen</button> <button class="klein" data-a="pl-preset" data-v="wenig">3 Tage, 1× kochen</button></p>
    <div class="zeile">${zahl('tage', 'Für wie viele Tage', 1, 14)}${zahl('personen', 'Personen', 1, 8)}${zahl('termine', 'Wie oft kochen', 1, 14)}<label class="feld"><span>Budget € (optional)</span><input type="number" inputmode="decimal" data-pl="budget" min="0" step="1" value="${esc(c.budget)}" style="width:6em"></label></div>
    <p class="klein" style="margin:.4em 0 .2em"><b>Welche Mahlzeiten planen?</b> <span class="leise">Nicht gewählte bleiben frei, z. B. ein einfaches Frühstück.</span></p><div class="chips-wrap">${PL_SLOTS.map(([k, n]) => chk('slots', k, c.slots.includes(k), n)).join('')}</div>
    <details class="klein pl-mehr"><summary>Mehr Einstellungen</summary>
      <div class="zeile">${zahl('max_aktiv', 'Aktive Zeit je Termin (Min.)', 10, 180, 5)}${zahl('wiederholen', 'Gleiches Gericht höchstens (Tage)', 1, 7)}
      <label class="feld"><span>Abwechslung</span><select data-pl="abwechslung">${['niedrig', 'mittel', 'hoch'].map(x => `<option ${c.abwechslung === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
      <label class="feld"><span>Händler</span><select data-pl="haendler">${[['beide', 'REWE und Lidl'], ['rewe', 'nur REWE'], ['lidl', 'nur Lidl']].map(([k, n]) => `<option value="${k}" ${c.haendler === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div>
      <div class="chips-wrap" style="margin-top:6px">${chk('opt', 'zwei', c.zwei, 'zwei Gerichte je Kochtermin')}${chk('opt', 'einfrieren', c.einfrieren, 'vorkochen und einfrieren ok')}${chk('opt', 'restportionen', c.restportionen, 'vorhandene Restportionen einplanen')}${chk('opt', 'ziele', c.ziele, 'Ernährungsziele berücksichtigen')}</div>
      <p class="klein" style="margin:.5em 0 .2em">Bevorzugte Küchen</p><div class="chips-wrap">${kuechen.map(k => chk('kuechen', k, c.kuechen.includes(k), esc(KUECHE_NAME[k] || k))).join('')}</div></details>
    <p class="klein pl-zusammenfassung" role="status"><b>Du planst:</b> ${esc(zusammenfassung)}</p>
    <p class="leise klein">Ausschlüsse, Allergien und deine Geräte aus dem Profil gelten automatisch. Vorrat wird bevorzugt verwendet.</p>
    <button class="haupt" data-a="pl-erstellen">${plan ? 'Neu vorschlagen' : 'Vorschlag erstellen'}</button></details>`;
  if (!plan) return `<h1>Mehrere Tage planen</h1>${planTabs('planung')}<p class="leise">Freiwillig: Lass dir Gerichte, Kochtermine, Portionen und Lagerung für einen Zeitraum vorschlagen. Nichts wird dadurch gekauft, gekocht oder gegessen – du übernimmst den Plan erst in die Einkaufsliste, wenn er passt.</p>${form}`;
  const nw = planNaehrwerte(plan, c); const proTagSlots = c.slots.length;
  const termine = [...new Set(plan.gerichte.map(g => g.termin))].sort((a, b) => a - b);
  const kartenHtml = termine.map(t => { const gs = plan.gerichte.map((g, i) => [g, i]).filter(([g]) => g.termin === t); const tag = gs[0][0].tag; const aktiv = gs.reduce((s, [g]) => s + (Number((R[g.rezept] || {}).meta && R[g.rezept].meta.zeit_aktiv_min) || 0), 0);
    return `<section class="karte"><h2 style="margin-top:0">Kochtermin ${t + 1} · Tag ${tag + 1}</h2><p class="leise klein" style="margin-top:-.4em">aktive Arbeit ca. ${aktiv} Min.${gs.length > 1 ? ' (Gerichte nacheinander; Wartezeiten können sich überlappen)' : ''}</p>
      ${gs.map(([g, i]) => { const r = R[g.rezept]; if (!r) return ''; const lag = plLagerung(r, g.tage, g.portionen / g.tage, c); const np = r.naehrwerte.pro_portion;
        return `<div class="pl-gericht"><div class="zeile" style="justify-content:space-between;align-items:flex-start"><span><b><a href="#/rezept/${esc(r.id)}">${esc(kurztitel(r.titel))}</a></b><br><span class="leise klein">${esc((PL_SLOTS.find(s => plArt(s[0]) === g.art && c.slots.includes(s[0])) || ['', 'Mahlzeit'])[1])} · ${r.meta.zeit_aktiv_min || '?'} Min. aktiv · ${np.kcal != null ? zahlDE(np.kcal) + ' kcal, ' + zahlDE(np.protein) + ' g Protein je Portion' : 'Nährwerte unvollständig'}</span></span>
          <span class="stepper">${g.portionen} Port. <button data-a="pl-port" data-v="${i}" data-d="-1" aria-label="weniger Portionen">−</button><button data-a="pl-port" data-v="${i}" data-d="1" aria-label="mehr Portionen">+</button></span></div>
          <p class="klein" style="margin:.3em 0">Für ${g.tage} Tag${g.tage > 1 ? 'e' : ''}: ${lag.jetzt ? `<b>${zahlDE(lag.jetzt)}</b> frisch` : ''}${lag.kuehl ? ` · <b>${zahlDE(lag.kuehl)}</b> Kühlschrank (bis ${lag.kuehlTage} Tage, laut Rezept)` : ''}${lag.tk ? ` · <b>${zahlDE(lag.tk)}</b> Tiefkühler` : ''}</p>
          ${g.gruende.length ? `<p class="leise klein" style="margin:0">Warum: ${esc(g.gruende.join(' · '))}</p>` : ''}${g.warn.map(w => `<p class="hinweis warn klein">${esc(w)}</p>`).join('')}
          <div class="knopfreihe"><button class="klein" data-a="pl-tausch" data-v="${i}">Anderes Gericht</button>${termine.length > 1 ? `<button class="klein still" data-a="pl-schieben" data-v="${i}">anderer Kochtermin</button>` : ''}<button class="klein still" data-a="pl-weg" data-v="${i}">streichen</button></div></div>`; }).join('')}</section>`; }).join('');
  const gesamtMz = Number(c.tage) * Number(c.personen) * proTagSlots; const geplantMz = plan.gerichte.reduce((s, g) => s + g.portionen, 0) + (plan.rest_genutzt || 0);
  const zk = ziele && ziele.kcal ? Number(ziele.kcal) : null;
  return `<h1>Mehrere Tage planen</h1>${planTabs('planung')}${form}
    <section class="karte"><h2 style="margin-top:0">Überblick</h2>
      <p class="klein">${plan.gerichte.length} Gerichte · ${termine.length} Kochtermine · ${geplantMz} von ${gesamtMz} geplanten Mahlzeiten${plan.rest_genutzt ? ` (davon ${plan.rest_genutzt} aus Restportionen)` : ''}.${plan.ungeplant.length ? ` Nicht geplant: ${esc(plan.ungeplant.join(', '))} – bitte selbst einplanen.` : ''}</p>
      <p class="klein">Geplante Gerichte liefern im Schnitt <b>${zahlDE(nw.kcalTag)} kcal</b> und <b>${zahlDE(nw.proteinTag)} g Protein</b> pro Person und Tag${nw.luecke ? ' (einige Werte unvollständig)' : ''}.${zk ? ` Dein Tagesziel: ${zahlDE(zk)} kcal${ziele.protein ? ', ' + zahlDE(ziele.protein) + ' g Protein' : ''} – Spielraum für Ungeplantes: ca. ${zahlDE(Math.max(0, zk - nw.kcalTag))} kcal.` : ' Ohne Ziele kein Abgleich.'} Ziele sind Näherungen; die Tage müssen nicht gleich aussehen.</p>
      ${kostenHtml(plan.gerichte.map(g => ({ rezept: g.rezept, portionen: g.portionen })), c.budget, c.haendler)}
      <p class="leise klein">Grobe Kostenklassen der Gerichte (Schätzung, kein Preis): ${esc([...new Set(plan.gerichte.map(g => (R[g.rezept] || { meta: {} }).meta.kosten_klasse).filter(Boolean))].map(k => ({ guenstig: 'günstig', mittel: 'mittel', hoeher: 'höher' }[k] || k)).join(', ') || '–')}.</p>
      ${plan.konflikte.length ? `<div class="hinweis warn klein"><b>Nicht alles erfüllbar:</b><ul>${plan.konflikte.map(k => `<li>Kochtermin ${k.termin + 1}: ${esc(k.grund)}${k.fix === 'zeit' ? ` <button class="klein" data-a="pl-fix-zeit">Aktive Zeit auf ${Number(c.max_aktiv) + 15} Min. erhöhen</button>` : ''}</li>`).join('')}</ul></div>` : ''}</section>
    ${kartenHtml}
    ${plTageHtml(plan, c)}
    <div class="karte"><p class="klein">Übernimmt die Gerichte mit Portionen in „Gerichte“ und die Einkaufsliste (dort wird dein Vorrat abgezogen). Gekauft, gekocht oder gegessen ist damit noch nichts.</p>
      <div class="knopfreihe"><button class="haupt" data-a="pl-uebernehmen" data-v="ersetzen">In den Einkauf übernehmen</button>${D.auswahl.length ? `<button data-a="pl-uebernehmen" data-v="ergaenzen">zur bisherigen Auswahl hinzufügen</button>` : ''}<button class="still" data-a="pl-verwerfen">Plan verwerfen</button></div></div>`;
}
document.addEventListener('change', ev => { const el = ev.target; if (!el.dataset) return;
  if (el.dataset.pl) { const k = el.dataset.pl; aendere(null, () => { const c = planEinst(); c[k] = el.type === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value; }, { neuZeichnen: false }); }
  else if (el.dataset.plListe) { const k = el.dataset.plListe; aendere(null, () => { const c = planEinst(); if (k === 'opt') c[el.value] = el.checked; else { const l = new Set(arr(c[k])); if (el.checked) l.add(el.value); else l.delete(el.value); c[k] = [...l]; } }, { neuZeichnen: false }); }
  if (el.dataset.pl || el.dataset.plListe) { const z = document.querySelector('.pl-zusammenfassung'); if (z) z.innerHTML = '<b>Du planst:</b> ' + esc(plZusammenfassung(planEinst())); } });
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-a^="pl-"]'); if (!b) return; const a = b.dataset.a, i = Number(b.dataset.v); const c = planEinst(); const plan = D.wochenplan.vorschlag;
  switch (a) {
    case 'pl-preset': { const p = { woche: { tage: 7, termine: 3, zwei: true, slots: ['mittag', 'abend'] }, arbeitswoche: { tage: 5, termine: 2, zwei: false, slots: ['mittag', 'abend'] }, wenig: { tage: 3, termine: 1, zwei: false, slots: ['abend'] } }[b.dataset.v]; if (p) aendere('Vorgaben gesetzt – prüfen und „Vorschlag erstellen“', () => { Object.assign(c, p); }); break; }
    case 'pl-erstellen': if (!c.slots.length) { toast('Bitte mindestens eine Mahlzeit wählen'); return; } aendere('Vorschlag erstellt – nichts gekauft oder gebucht', () => { D.wochenplan.vorschlag = planErstellen(c); }); break;
    case 'pl-fix-zeit': aendere('Aktive Zeit erhöht, neu vorgeschlagen', () => { c.max_aktiv = Number(c.max_aktiv) + 15; D.wochenplan.vorschlag = planErstellen(c); }); break;
    case 'pl-port': aendere(null, () => { const g = plan.gerichte[i]; g.portionen = Math.max(1, g.portionen + Number(b.dataset.d)); }); break;
    case 'pl-weg': aendere('Gericht gestrichen – Rückgängig möglich', () => { plan.gerichte.splice(i, 1); }); break;
    case 'pl-schieben': aendere(null, () => { const g = plan.gerichte[i]; const ts = [...new Set(plan.gerichte.map(x => x.termin))].sort((x, y) => x - y); const n = ts[(ts.indexOf(g.termin) + 1) % ts.length]; const ziel = plan.gerichte.find(x => x.termin === n); g.termin = n; g.tag = ziel.tag; }); break;
    case 'pl-tausch': { const g = plan.gerichte[i]; const benutzt = new Set(plan.gerichte.map(x => x.rezept)); const abgelehnt = new Set([...(g.abgelehnt || []), g.rezept]);
      const kand = K.rezepte.filter(r => plPasstArt(r, g.art) && !arr(ausgeschlossen(r)).length && !(geraeteFehlen(r) || []).length && !benutzt.has(r.id) && !abgelehnt.has(r.id) && (Number(r.meta.zeit_aktiv_min) || 999) <= Number(c.max_aktiv));
      const ziele = c.ziele ? aktuelleZiele() : null; const ziel = ziele && ziele.kcal ? { kcal: Number(ziele.kcal) * 0.3, protein: Number(ziele.protein || 0) * 0.3 } : null;
      const best = kand.map(r => Object.assign({ r }, plBewertung(r, c, ziel, plan.gerichte.filter((x, j) => j !== i).map(x => R[x.rezept]).filter(Boolean)))).sort((x, y) => y.s - x.s)[0];
      if (!best) { toast('Kein weiteres passendes Gericht – Vorgaben lockern'); return; }
      aendere(`Getauscht: ${kurztitel(best.r.titel)}`, () => { g.abgelehnt = [...abgelehnt]; g.rezept = best.r.id; g.gruende = best.gruende; const lag = plLagerung(best.r, g.tage, g.portionen / g.tage, c); g.warn = lag.unmoeglich ? [`${lag.unmoeglich} Portionen halten laut Rezept nicht bis zum Verzehrtag.`] : []; }); break; }
    case 'pl-verwerfen': aendere('Plan verworfen – Rückgängig möglich', () => { delete D.wochenplan.vorschlag; }); break;
    case 'pl-uebernehmen': { const neu = plan.gerichte.filter(g => R[g.rezept]).map(g => { const jetzt = Math.min(g.portionen, Math.max(1, Math.round(g.proTag || g.portionen / g.tage))); /* frisch am Kochtag, der Rest wird vorgekocht */ return { rezept: g.rezept, jetzt, vorkochen: g.portionen - jetzt, plan: true }; });
      aendere(`${neu.length} Gerichte im Einkauf – gekauft oder gekocht ist noch nichts`, d => { if (b.dataset.v === 'ersetzen') d.auswahl = []; neu.forEach(n => { const vorh = d.auswahl.find(x => x.rezept === n.rezept); if (vorh) { vorh.jetzt += n.jetzt; vorh.vorkochen += n.vorkochen; } else d.auswahl.push(n); }); d.planung.tage = Number(c.tage) || d.planung.tage; }, { neuZeichnen: false }); location.hash = '#/auswahl'; break; }
  }
});

/* ---------- Mein Kochbuch: Favoriten, „Will ich kochen“, Sammlungen, zuletzt angesehen, schon gekocht (alles privat im Profil) ---------- */
function kb() { D.kochbuch = D.kochbuch || {}; const k = D.kochbuch; ['favoriten', 'kochen_wollen', 'sammlungen', 'zuletzt'].forEach(x => { if (!Array.isArray(k[x])) k[x] = []; }); if (!k.variante_standard) k.variante_standard = {}; return k; }
function zuletztMerken(id) {   // ohne Neuzeichnen und ohne Rückgängig-Eintrag: reine Komfortliste
  const k = kb(); const l = k.zuletzt.filter(x => x.id !== id); l.unshift({ id, zeit: new Date().toISOString() }); const neu = l.slice(0, 12);
  if (JSON.stringify(neu.map(x => x.id)) === JSON.stringify(k.zuletzt.map(x => x.id))) return; k.zuletzt = neu; speichern();
}
function gekochtInfo(id) {
  const p = arr(D.kochprotokolle).filter(x => x.rezept === id).sort((a, b) => String(b.datum).localeCompare(String(a.datum)));
  return { n: p.length, letzt: p[0] || null, alle: p };
}
const RM_GESCHMACK = [['passt', 'passt'], ['fad', 'zu fad'], ['salzig', 'zu salzig'], ['scharf', 'zu scharf'], ['suess', 'zu süß'], ['sauer', 'zu sauer']];
const RM_KONSISTENZ = [['passt', 'passt'], ['duenn', 'zu dünn/flüssig'], ['dick', 'zu dick/fest'], ['trocken', 'zu trocken'], ['weich', 'zu weich/matschig']];
const RM_PORTION = [['passt', 'passt'], ['klein', 'zu klein'], ['gross', 'zu groß']];
const RM_SCHWER = [['passt', 'wie erwartet'], ['leichter', 'leichter als gedacht'], ['schwerer', 'schwerer als gedacht']];
const rmText = (liste, k) => (liste.find(x => x[0] === k) || [])[1] || '';
/* Hinweis aus der letzten Rückmeldung – nur Information, nichts wird automatisch geändert oder als Abneigung gespeichert */
function rueckmeldungHinweisHtml(r) {
  const g = gekochtInfo(r.id); if (!g.n) return '';
  const p = g.letzt; const teile = [];
  if (p.geschmack && p.geschmack !== 'passt') teile.push('Geschmack ' + rmText(RM_GESCHMACK, p.geschmack));
  if (p.konsistenz && p.konsistenz !== 'passt') teile.push('Konsistenz ' + rmText(RM_KONSISTENZ, p.konsistenz));
  if (p.portion && p.portion !== 'passt') teile.push('Portion ' + rmText(RM_PORTION, p.portion));
  if (p.schwierigkeit && p.schwierigkeit !== 'passt') teile.push(rmText(RM_SCHWER, p.schwierigkeit));
  const plan = rezeptInfo(r).gesamt; if (p.dauer_min && plan) teile.push(`gebraucht ${p.dauer_min} Min. (Rezept: ${plan} Min.)`);
  const tipps = [];
  if (p.portion === 'klein') tipps.push('Mehr Menge über den Stift an einer Zutat einstellen und als Variante speichern.');
  if (p.portion === 'gross') tipps.push('Weniger Portionen wählen oder den Rest als Restportion einplanen.');
  if (p.dauer_min && plan && p.dauer_min > plan * 1.3) tipps.push('Mehr Zeit einplanen – die App ändert die Rezeptzeiten nicht.');
  const a = r.angepasst; const wunsch = p.aenderung ? `Dein Wunsch: „${esc(p.aenderung)}“.` : '';
  const varText = a && a.variante ? ` Gerade aktiv: deine Variante „${esc(a.variante)}“${a.notiz ? ` (${esc(a.notiz)})` : ''}.` : (wunsch ? ' <button class="klein still" data-a="var-editor" data-v="' + esc(r.id) + '">Als Variante festhalten</button>' : '');
  return `<div class="hinweis klein rm-hinweis"><b>${g.n}× gekocht</b>, zuletzt ${esc(datumDE(p.datum))}${p.nochmal ? ` · wieder kochen: ${esc(p.nochmal)}` : ''}${teile.length ? `<br>Letztes Mal: ${esc(teile.join(' · '))}.` : ''} ${wunsch}${varText}${tipps.length ? `<br><span class="leise">${esc(tipps.join(' '))}</span>` : ''}</div>`;
}
function persoenlichLeisteHtml(r) {
  const k = kb(); const fav = k.favoriten.includes(r.id), will = k.kochen_wollen.includes(r.id);
  const inS = k.sammlungen.filter(s => arr(s.rezepte).includes(r.id));
  return `<div class="pers-leiste" role="group" aria-label="Mein Kochbuch"><button class="klein ${fav ? 'akzent' : ''}" data-a="kb-fav" data-v="${esc(r.id)}" aria-pressed="${fav}">${fav ? '♥ Favorit' : '♡ Favorit'}</button><button class="klein ${will ? 'akzent' : ''}" data-a="kb-will" data-v="${esc(r.id)}" aria-pressed="${will}">${will ? '✓ Will ich kochen' : '+ Will ich kochen'}</button>
    <label class="feld kb-samml"><span class="sr-only">Zu einer Sammlung hinzufügen</span><select data-a-select="kb-sammlung" data-v="${esc(r.id)}"><option value="">Zu Sammlung …</option>${k.sammlungen.map(s => `<option value="${esc(s.id)}">${arr(s.rezepte).includes(r.id) ? '✓ ' : ''}${esc(s.name)}</option>`).join('')}<option value="neu">+ Neue Sammlung …</option></select></label></div>
    ${inS.length ? `<p class="leise klein">In deinen Sammlungen: ${inS.map(s => `<a href="#/meinkochbuch/s-${esc(s.id)}">${esc(s.name)}</a>`).join(', ')}</p>` : ''}`;
}
function meinKochbuchZahlen() { const k = kb(); return { fav: k.favoriten.filter(id => R[id]).length, will: k.kochen_wollen.filter(id => R[id]).length, gekocht: new Set(arr(D.kochprotokolle).map(p => p.rezept).filter(id => R[id])).size, samml: k.sammlungen.length, zuletzt: k.zuletzt.filter(x => R[x.id]).length }; }
function meinKochbuchLinksHtml() {
  const z = meinKochbuchZahlen(); if (!z.fav && !z.will && !z.gekocht && !z.samml && !z.zuletzt) return '';
  const l = [['favoriten', '♥ Favoriten', z.fav], ['kochen', 'Will ich kochen', z.will], ['gekocht', 'Schon gekocht', z.gekocht], ['sammlungen', 'Sammlungen', z.samml], ['zuletzt', 'Zuletzt angesehen', z.zuletzt]].filter(x => x[2]);
  return `<nav class="chips-wrap mein-kb" aria-label="Mein Kochbuch">${l.map(([t, n, c]) => `<a class="filterchip" href="#/meinkochbuch/${t}">${esc(n)} <span class="leise">${c}</span></a>`).join('')}</nav>`;
}
function vMeinKochbuch(tab) {
  const k = kb(); tab = tab || 'favoriten'; const leerF = { bereich: '', kuechen: [], richtung: [], maxGesamt: '', maxAktiv: '', suche: '' };
  const karten = ids => { const l = ids.filter(id => R[id]); return l.length ? `<div class="raster karten">${l.map(id => rezeptKarte(R[id], bewerte(R[id], leerF), geraeteFehlen(R[id]))).join('')}</div>` : ''; };
  const z = meinKochbuchZahlen();
  const tabs = [['favoriten', '♥ Favoriten', z.fav], ['kochen', 'Will ich kochen', z.will], ['gekocht', 'Schon gekocht', z.gekocht], ['sammlungen', 'Sammlungen', z.samml], ['zuletzt', 'Zuletzt angesehen', z.zuletzt]];
  let inhalt = '';
  if (tab === 'favoriten') inhalt = karten(k.favoriten) || '<p class="leer">Noch keine Favoriten. Im Rezept auf „♡ Favorit“ tippen.</p>';
  else if (tab === 'kochen') inhalt = karten(k.kochen_wollen) || '<p class="leer">Noch nichts vorgemerkt. Im Rezept „+ Will ich kochen“ tippen.</p>';
  else if (tab === 'zuletzt') inhalt = karten(k.zuletzt.map(x => x.id)) || '<p class="leer">Noch keine Rezepte angesehen.</p>';
  else if (tab === 'gekocht') { const ids = [...new Set(arr(D.kochprotokolle).slice().sort((a, b) => String(b.datum).localeCompare(String(a.datum))).map(p => p.rezept))].filter(id => R[id]);
    inhalt = ids.length ? `<ul class="eintraege">${ids.map(id => { const g = gekochtInfo(id); return `<li><span><a href="#/rezept/${esc(id)}"><b>${esc(R[id].titel)}</b></a><br><span class="leise klein">${g.n}× gekocht · zuletzt ${esc(datumDE(g.letzt.datum))}${g.letzt.nochmal ? ' · wieder: ' + esc(g.letzt.nochmal) : ''}${g.letzt.aenderung ? ' · Wunsch: ' + esc(g.letzt.aenderung) : ''}</span></span></li>`; }).join('')}</ul><p class="leise klein">Aus deinen gespeicherten Kochprotokollen („Fertig gekocht“).</p>` : '<p class="leer">Noch nichts als gekocht gespeichert. Nach dem Kochen „Fertig gekocht“ und „Speichern“ tippen.</p>'; }
  else if (tab === 'sammlungen' || tab.startsWith('s-')) {
    const offen = tab.startsWith('s-') ? k.sammlungen.find(s => 's-' + s.id === tab) : null;
    inhalt = offen ? `<h2>${esc(offen.name)}</h2>${karten(arr(offen.rezepte)) || '<p class="leer">Noch leer. Im Rezept über „Zu Sammlung …“ hinzufügen.</p>'}
      <div class="knopfreihe"><button class="klein" data-a="kb-s-umbenennen" data-v="${esc(offen.id)}">Umbenennen</button><button class="klein still" data-a="kb-s-weg" data-v="${esc(offen.id)}">Sammlung löschen</button>${arr(offen.rezepte).length ? `<button class="klein" data-a="kb-s-auswahl" data-v="${esc(offen.id)}">Alle in die Einkaufsauswahl</button>` : ''}</div><p class="leise klein">Löschen entfernt nur die Sammlung, nicht die Rezepte.</p>`
      : `${k.sammlungen.length ? `<ul class="eintraege">${k.sammlungen.map(s => `<li><a href="#/meinkochbuch/s-${esc(s.id)}"><b>${esc(s.name)}</b></a> <span class="leise klein">${arr(s.rezepte).filter(id => R[id]).length} Rezepte</span></li>`).join('')}</ul>` : '<p class="leer">Noch keine eigenen Sammlungen.</p>'}<button class="klein" data-a="kb-s-neu">+ Neue Sammlung</button>`;
  }
  return `<div class="seitenkopf"><h1>Mein Kochbuch</h1><a class="knopf klein still" href="#/entdecken">${ico('zurueck', 'klein')} Kochbuch</a></div>
  <div class="segment" role="tablist">${tabs.map(([t, n, c]) => `<a role="tab" href="#/meinkochbuch/${t}" aria-selected="${tab === t || (t === 'sammlungen' && tab.startsWith('s-'))}">${esc(n)}${c ? ` <span class="leise">${c}</span>` : ''}</a>`).join('')}</div>
  ${inhalt}<p class="leise klein">Alles hier ist privat auf diesem Gerät und im Export enthalten.</p>`;
}
function sammlungNeu(rid) { const name = (prompt('Name der Sammlung (z. B. „Meal Prep Sonntag“):') || '').trim().slice(0, 40); if (!name) return null; const id = uid('sam');
  aendere(`Sammlung „${name}“ angelegt`, d => { kb(); d.kochbuch.sammlungen.push({ id, name, rezepte: rid ? [rid] : [], erstellt: new Date().toISOString() }); }); return id; }
document.addEventListener('change', ev => {
  const s = ev.target.closest('[data-a-select="kb-sammlung"]'); if (!s) return; const rid = s.dataset.v, wert = s.value; s.value = ''; if (!wert) return;
  if (wert === 'neu') { sammlungNeu(rid); return; }
  const sm = kb().sammlungen.find(x => x.id === wert); if (!sm) return; const drin = arr(sm.rezepte).includes(rid);
  aendere(drin ? `Aus „${sm.name}“ entfernt` : `Zu „${sm.name}“ hinzugefügt`, d => { const x = d.kochbuch.sammlungen.find(y => y.id === wert); x.rezepte = drin ? arr(x.rezepte).filter(id => id !== rid) : [...arr(x.rezepte), rid]; });
});
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a, v = b.dataset.v;
  if (a === 'kb-fav' || a === 'kb-will') { const feld = a === 'kb-fav' ? 'favoriten' : 'kochen_wollen'; const drin = kb()[feld].includes(v);
    aendere(drin ? (a === 'kb-fav' ? 'Aus Favoriten entfernt' : 'Nicht mehr vorgemerkt') : (a === 'kb-fav' ? 'Als Favorit gemerkt' : 'Vorgemerkt: will ich kochen'), d => { kb(); d.kochbuch[feld] = drin ? d.kochbuch[feld].filter(x => x !== v) : [v, ...d.kochbuch[feld]]; }); }
  else if (a === 'kb-s-neu') sammlungNeu(null);
  else if (a === 'kb-s-umbenennen') { const s = kb().sammlungen.find(x => x.id === v); const n = (prompt('Neuer Name:', s.name) || '').trim().slice(0, 40); if (n) aendere('Sammlung umbenannt', d => { d.kochbuch.sammlungen.find(x => x.id === v).name = n; }); }
  else if (a === 'kb-s-weg') { const s = kb().sammlungen.find(x => x.id === v); if (!confirm(`Sammlung „${s.name}“ löschen? Die Rezepte bleiben erhalten.`)) return; aendere('Sammlung gelöscht – Rückgängig möglich', d => { d.kochbuch.sammlungen = d.kochbuch.sammlungen.filter(x => x.id !== v); }, { neuZeichnen: false }); location.hash = '#/meinkochbuch/sammlungen'; }
  else if (a === 'kb-s-auswahl') { const s = kb().sammlungen.find(x => x.id === v); const ids = arr(s.rezepte).filter(id => R[id]);
    aendere(`${ids.length} Rezepte in der Einkaufsauswahl – gekauft ist noch nichts`, d => { ids.forEach(id => { if (!d.auswahl.some(x => x.rezept === id)) d.auswahl.push({ rezept: id, jetzt: Math.max(1, Math.round(standardPortionen(R[id]))), vorkochen: 0 }); }); }); }
});
/* ---------- Date-Ansicht: Menü für zwei aus Rezepten mit date_gang; Vorbereitung, Ablauf, gemeinsamer Einkauf ---------- */
const DATE_GAENGE = [['vorspeise', 'Vorspeise'], ['haupt', 'Hauptgang'], ['dessert', 'Dessert']];
/* Menüportion als Zahl: Anteil einer Rezeptportion je Person im Mehrgangmenü (Feld `date_menue_faktor` im Rezept; Text in `date_menue_portion`).
   Fehlt die Zahl, rechnet die App mit der vollen Portion und sagt das. Mengen, Einkauf und Nährwerte folgen daraus. */
const dateFaktor = r => { const f = Number(r && r.meta.date_menue_faktor); return f > 0 && f <= 2 ? f : null; };
const datePortionen = (r, personen) => Math.max(0.5, Math.round(personen * (dateFaktor(r) || 1) * 2) / 2);
// Servier-Abstände im Menü (Vorschlag): Hauptgang 30 Min. nach der Vorspeise, Dessert 45 Min. nach dem Hauptgang
const DATE_ABSTAND = { vorspeise: 0, haupt: 30, dessert: 45 };
function dateZustand() { D.date = D.date || {}; const d = D.date; d.einst = Object.assign({ anspruch: 'egal', budget: 'egal', veg: false, zeit: 'egal', personen: 2, servieren: '' }, d.einst || {}); d.gaenge = Object.assign({ vorspeise: true, haupt: true, dessert: true }, d.gaenge || {}); d.wahl = d.wahl || {}; return d; }
function dateKandidaten(gang, e, locker) {
  return K.rezepte.map(x => R[x.id]).filter(r => r.meta.date_gang === gang && !ausgeschlossen(r).length && !(geraeteFehlen(r) || []).length).filter(r => { const i = rezeptInfo(r);
    if (e.veg && !i.veg) return false; if (locker) return true;
    if (e.anspruch === 'einfach' && (i.schwierigkeit || 1) > 2) return false; if (e.anspruch === 'anspruchsvoll' && (i.schwierigkeit || 1) < 3 && !i.kat.includes('restaurant')) return false;
    if (e.budget === 'guenstig' && r.meta.kosten_klasse === 'hoeher') return false;
    if (e.zeit === 'kurz' && (i.aktiv || 0) > 30) return false; return true; });
}
function dateMenue() {
  const d = dateZustand(); const m = {}; const gelockert = [];
  DATE_GAENGE.forEach(([g]) => { if (!d.gaenge[g]) return; let k = dateKandidaten(g, d.einst, false); if (!k.length) { k = dateKandidaten(g, d.einst, true); if (k.length) gelockert.push(g); }
    const gew = k.find(r => r.id === d.wahl[g]) || k[0]; m[g] = { r: gew || null, anzahl: k.length, kandidaten: k }; });
  return { m, gelockert };
}
const vorabRang = t => /Monat/i.test(t) ? 0 : /Vortag|Vorabend|1 Tag/i.test(t) ? 1 : /Morgen|8 Std|8 Stunden/i.test(t) ? 2 : /[3-6] ?Std|[3-6] Stunden/i.test(t) ? 3 : 4;
function vDate() {
  const d = dateZustand(); const e = d.einst; const { m, gelockert } = dateMenue(); const rs = DATE_GAENGE.map(([g]) => m[g] && m[g].r).filter(Boolean);
  const sel = (k, titel, opt) => `<label class="feld"><span>${titel}</span><select data-date-einst="${k}">${opt.map(([v, t]) => `<option value="${v}" ${String(e[k]) === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label>`;
  const gangKarte = ([g, gn]) => { if (!d.gaenge[g]) return `<div class="karte date-gang aus"><b>${gn}</b> <span class="leise klein">weggelassen</span> <button class="klein" data-a="date-gang" data-v="${g}">wieder dazu</button></div>`;
    const x = m[g]; if (!x || !x.r) return `<div class="karte date-gang"><b>${gn}</b><p class="leise klein">Kein passendes Rezept mit Date-Angaben – Einstellungen lockern.</p></div>`;
    const r = x.r, i = rezeptInfo(r), np = r.naehrwerte.pro_portion;
    return `<div class="karte date-gang"><div class="zeile" style="justify-content:space-between"><b>${gn}</b><span>${x.anzahl > 1 ? `<button class="klein" data-a="date-anders" data-v="${g}">anderes (${x.anzahl})</button>` : ''}<button class="klein still" data-a="date-gang" data-v="${g}">weglassen</button></span></div>
      <a class="date-rezept" href="#/rezept/${esc(r.id)}">${bildHtml(r)}<span><b>${esc(r.titel)}</b><br><span class="leise klein">aktiv ${i.aktiv || '?'} Min. · gesamt ${i.gesamt || '?'} Min. · Schwierigkeit ${i.schwierigkeit || '?'}/5${i.veg ? ' · vegetarisch' : ''}${r.meta.kosten_klasse ? ' · Kosten ' + esc({ guenstig: 'eher günstig', mittel: 'mittel', hoeher: 'eher höher' }[r.meta.kosten_klasse] || '') + ' (Schätzung)' : ''}</span></span></a>
      ${x.anzahl > 1 ? `<label class="feld"><span>Gericht wählen</span><select data-date-wahl="${g}">${x.kandidaten.map(k => `<option value="${esc(k.id)}" ${k.id === r.id ? 'selected' : ''}>${esc(kurztitel(k.titel))}</option>`).join('')}</select></label>` : ''}
      ${(() => { const f = dateFaktor(r); const port = datePortionen(r, P); const pp = f || 1;
        return `<p class="klein"><b>Menüportion:</b> ${f ? `${zahlDE(Math.round(f * 100))} % einer Rezeptportion je Person` : 'nicht beziffert – gerechnet wird mit der vollen Portion'} → für ${P} ${P === 1 ? 'Person' : 'Personen'} <b>${zahlDE(port, 1)} Rezeptportion${port === 1 ? '' : 'en'}</b> kochen (Rezept ist für ${esc(r.meta.portionen)}).</p>
        <p class="leise klein">Je Person im Menü: ${np.kcal != null ? `ca. ${zahlDE(Math.round(np.kcal * pp))} kcal · ${zahlDE(Math.round((np.protein || 0) * pp))} g Eiweiß` : 'Nährwerte unvollständig'} (volle Rezeptportion: ${np.kcal != null ? zahlDE(np.kcal) + ' kcal' : '?'}).</p>
        ${r.meta.date_menue_portion ? `<details class="klein"><summary>Wie portionieren?</summary><p>${esc(r.meta.date_menue_portion)}</p></details>` : ''}`; })()}</div>`; };
  const vorab = rs.filter(r => r.meta.date_vorab).map(r => [r, String(r.meta.date_vorab)]).sort((a, b) => vorabRang(a[1]) - vorabRang(b[1]));
  const getr = rs.flatMap(r => arr(r.meta.getraenke).map(s => String(s).split('|').map(x => (x || '').trim())).filter(([, art]) => art !== 'alkohol').map(([n, , grund]) => [r, n, grund]));
  const P = Math.max(1, Math.min(8, Number(e.personen) || 2));
  const kcalMenue = rs.reduce((s, r) => s + (r.naehrwerte.pro_portion.kcal || 0) * (dateFaktor(r) || 1), 0); const protMenue = rs.reduce((s, r) => s + (r.naehrwerte.pro_portion.protein || 0) * (dateFaktor(r) || 1), 0);
  const unbek = rs.some(r => r.naehrwerte.pro_portion.kcal == null); const ohneFaktor = rs.filter(r => !dateFaktor(r));
  // Zeitplan rückwärts vom Servierzeitpunkt: je Gang „spätestens beginnen“ = Servierzeit des Gangs − Gesamtzeit laut Rezept
  const zeitplan = (() => { const m0 = /^(\d{1,2}):(\d{2})$/.exec(e.servieren || ''); if (!m0) return null; let t = Number(m0[1]) * 60 + Number(m0[2]); const fmt = x => { const y = ((x % 1440) + 1440) % 1440; return String(Math.floor(y / 60)).padStart(2, '0') + ':' + String(y % 60).padStart(2, '0'); };
    let erster = true; return DATE_GAENGE.filter(([g]) => m[g] && m[g].r).map(([g, gn]) => { if (!erster) t += DATE_ABSTAND[g] || 30; erster = false; const r = m[g].r; const i = rezeptInfo(r); return { gn, r, servieren: fmt(t), start: i.gesamt != null ? fmt(t - i.gesamt) : null, vorab: r.meta.date_vorab }; }); })();
  return `<div class="seitenkopf"><h1>Date: Menü für ${P === 2 ? 'zwei' : P}</h1><a class="knopf klein still" href="#/entdecken">${ico('zurueck', 'klein')} Kochbuch</a></div>
  <p class="unterzeile">Vorspeise, Hauptgang und Dessert aus Rezepten mit Date-Angaben (${K.rezepte.filter(r => r.meta.date_gang).length} Rezepte). Ohne KI zusammengestellt – du tauschst oder lässt Gänge weg.</p>
  <div class="karte"><div class="zeile">${sel('anspruch', 'Aufwand', [['egal', 'egal'], ['einfach', 'unkompliziert'], ['anspruchsvoll', 'anspruchsvoller']])}${sel('zeit', 'Arbeit pro Gang', [['egal', 'egal'], ['kurz', 'höchstens 30 Min.']])}${sel('budget', 'Budget', [['egal', 'egal'], ['guenstig', 'eher günstig']])}
    <label class="feld"><span>Vegetarisch</span><select data-date-einst="veg"><option value="false" ${!e.veg ? 'selected' : ''}>egal</option><option value="true" ${e.veg ? 'selected' : ''}>nur vegetarisch</option></select></label>
    <label class="feld"><span>Personen</span><select data-date-einst="personen">${[1, 2, 3, 4, 5, 6].map(n => `<option value="${n}" ${n === P ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    <label class="feld"><span>Servieren um</span><input type="time" data-date-einst="servieren" value="${esc(e.servieren || '')}"></label></div>
    ${gelockert.length ? `<p class="hinweis warn klein">Für ${gelockert.map(g => DATE_GAENGE.find(x => x[0] === g)[1]).join(', ')} passt nichts zu allen Vorgaben – gezeigt wird die nächstbeste Wahl ohne Aufwand-/Zeit-/Budgetgrenze (persönliche Ausschlüsse gelten weiter).</p>` : ''}
    <p class="leise klein">Budget: nur grobe Kostenklasse je Rezept, keine geprüften Preise.</p></div>
  ${DATE_GAENGE.map(gangKarte).join('')}
  ${rs.length ? `<div class="karte"><h2 style="margin-top:0">Vorher vorbereiten</h2>${vorab.length ? `<ol class="klein">${vorab.map(([r, t]) => `<li><b>${esc(kurztitel(r.titel))}:</b> ${esc(t)}</li>`).join('')}</ol>` : '<p class="leise klein">Keine Vorbereitungsangaben hinterlegt.</p>'}
    <h2>Am Abend</h2>${zeitplan ? `<ol class="klein">${zeitplan.map(z => `<li><b>${esc(z.gn)} ${esc(z.servieren)}</b> – ${esc(kurztitel(z.r.titel))}: ${z.start ? `spätestens um ${esc(z.start)} beginnen` : 'Gesamtzeit unbekannt'}${z.vorab ? ' (Teile davon vorher, siehe oben)' : ''}</li>`).join('')}</ol>
      <p class="leise klein">Rückwärts gerechnet aus den Gesamtzeiten der Rezepte (für Anfänger geschätzt) und Abständen von 30 Min. vor dem Hauptgang und 45 Min. vor dem Dessert (Vorschlag). Überschneiden sich Zeiten, bereite einen Gang vorher vor.</p>` : '<p class="leise klein">Trag oben eine Servierzeit ein, dann rechnet die App zurück, wann du mit jedem Gang beginnen solltest.</p>'}
    <p class="klein">Den gemeinsamen Ablauf mit Reihenfolge, Geräten und „kurz vor dem Servieren“ findest du hier: <a class="knopf klein" href="#/ablauf/${esc(rs.map(r => r.id).join(','))}">Gemeinsamer Ablauf</a></p>
    ${getr.length ? `<h2>Alkoholfreie Getränke</h2><ul class="klein">${getr.map(([r, n, g]) => `<li><b>${esc(n)}</b> – ${esc(g)} <span class="leise">(zu ${esc(kurztitel(r.titel))})</span></li>`).join('')}</ul>` : ''}
    <h2>Nährwerte und Einkauf</h2><p class="klein">Ganzes Menü je Person mit Menüportionen: ${unbek ? 'mind. ' : 'ca. '}${zahlDE(Math.round(kcalMenue))} kcal · ${zahlDE(Math.round(protMenue))} g Eiweiß${ohneFaktor.length ? ` – für ${esc(ohneFaktor.map(r => kurztitel(r.titel)).join(', '))} ist keine Menüportion beziffert, dort ist die volle Portion gerechnet` : ''}.</p>
    <p class="leise klein">Eingekauft wird für ${rs.map(r => `${esc(kurztitel(r.titel))} ${zahlDE(datePortionen(r, P), 1)} Port.`).join(' · ')} – Getränke und Brot extra sind nicht eingerechnet.</p>
    <div class="knopfreihe"><button class="haupt" data-a="date-einkauf">${ico('plus', 'klein')} Menü für ${P} in die Einkaufsauswahl</button></div>
    <p class="leise klein">Gemeinsame Zutaten werden in der Einkaufsliste zusammengefasst. Ausgewählt heißt noch nicht gekauft oder gegessen.</p></div>` : ''}`;
}
document.addEventListener('change', ev => { const s = ev.target.closest('[data-date-einst]'); if (!s) return; const k = s.dataset.dateEinst; const v = k === 'veg' ? s.value === 'true' : k === 'personen' ? Number(s.value) || 2 : s.value;
  aendere('', dd => { dateZustand(); dd.date.einst[k] = v; if (!['personen', 'servieren'].includes(k)) dd.date.wahl = {}; }); });
document.addEventListener('change', ev => { const s = ev.target.closest('[data-date-wahl]'); if (!s) return; aendere('', dd => { dateZustand(); dd.date.wahl[s.dataset.dateWahl] = s.value; }); });
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a, v = b.dataset.v;
  if (a === 'date-anders') { const { m } = dateMenue(); const x = m[v]; const ix = x.kandidaten.indexOf(x.r); const n = x.kandidaten[(ix + 1) % x.kandidaten.length]; aendere('', dd => { dateZustand(); dd.date.wahl[v] = n.id; }); }
  else if (a === 'date-gang') aendere('', dd => { dateZustand(); dd.date.gaenge[v] = !dd.date.gaenge[v]; });
  else if (a === 'date-einkauf') { const { m } = dateMenue(); const rs = DATE_GAENGE.map(([g]) => m[g] && m[g].r).filter(Boolean); const haupt = (m.haupt && m.haupt.r) || rs[0];
    const P = Math.max(1, Math.min(8, Number(dateZustand().einst.personen) || 2));
    aendere(`Menü (${rs.length} Gänge, ${P} Pers.) in der Einkaufsauswahl – Mengen nach Menüportion`, dd => { rs.forEach(r => { const port = datePortionen(r, P); const vorh = dd.auswahl.find(x => x.rezept === r.id);
      if (vorh) { if (vorh.date) vorh.jetzt = port; } else dd.auswahl.push({ rezept: r.id, jetzt: port, vorkochen: 0, zu: r.id === haupt.id ? undefined : haupt.id, date: true }); }); }, { neuZeichnen: false }); location.hash = '#/auswahl'; }
});

/* ---------- Gemeinsamer Kochablauf für mehrere Gerichte: Reihenfolge nach Rezeptzeiten, keine erfundene Minutenplanung ---------- */
function ablaufDaten(ids) {
  const rs = ids.map(id => R[id]).filter(Boolean);
  const info = rs.map(r => { const i = rezeptInfo(r); const aktiv = i.aktiv || null, gesamt = i.gesamt || null; return { r, aktiv, gesamt, warten: aktiv != null && gesamt != null ? Math.max(0, gesamt - aktiv) : null, schwer: (i.schwierigkeit || 1) >= 3, geraete: arr(r.meta.geraete_noetig) }; });
  const ger = {}; info.forEach(x => x.geraete.forEach(g => { (ger[g] = ger[g] || []).push(x.r); }));
  const konflikte = [];
  if ((ger.backofen || []).length > 1) konflikte.push(`Backofen: ${ger.backofen.map(r => kurztitel(r.titel)).join(', ')} – Temperaturen in den Rezepten vergleichen; bei unterschiedlicher Hitze nacheinander backen (was vorab geht, zuerst).`);
  const herd = info.filter(x => x.geraete.some(g => ['pfanne', 'topf', 'wok'].includes(g))); if (herd.length >= 3) konflikte.push(`Herd: ${herd.length} Gerichte brauchen Topf/Pfanne – Anzahl deiner Kochfelder prüfen.`);
  // nur Geräte, die man meist einmal hat und die länger belegt sind (Messer, Schüsseln usw. nicht)
  Object.entries(ger).filter(([g, l]) => l.length > 1 && /airfryer|heissluft|reiskocher|mixer|puerier|stabmixer|kuechenmaschine|kuchenmaschine|wok|schnellkoch|dampfgarer|mikrowelle|grill|waffel|toaster/.test(g)).forEach(([g, l]) => konflikte.push(`${GERAETE[g] || g}: von ${l.map(r => kurztitel(r.titel)).join(' und ')} gebraucht – nacheinander nutzen oder spülen.`));
  const schwer = info.filter(x => x.schwer);
  const vorab = info.filter(x => x.r.meta.date_vorab || x.r.meta.vorkochen_kuehlschrank === 'ja');
  const startReihe = info.slice().sort((a, b) => (b.gesamt || 0) - (a.gesamt || 0));
  const vorb = info.map(x => ({ r: x.r, schritte: x.r.schritte.filter(s => /^Vorbereitung/.test(s.phase || '')).map(s => s.titel) })).filter(x => x.schritte.length);
  const zaehl = {}; info.forEach(x => new Set(x.r.zutaten.filter(z => z.zutat && z.bedarf !== 'grundvorrat').map(z => z.zutat)).forEach(z => { zaehl[z] = (zaehl[z] || 0) + 1; }));
  const gemeinsam = Object.entries(zaehl).filter(([, n]) => n > 1).map(([z]) => (Z[z] || {}).name).filter(Boolean);
  const zuletzt = info.map(x => ({ r: x.r, s: x.r.schritte[x.r.schritte.length - 1] })).filter(x => x.s);
  return { info, konflikte, schwer, vorab, startReihe, vorb, gemeinsam, zuletzt };
}
function vAblauf(teil) {
  const ids = String(teil || '').split(',').filter(id => R[id]); const quelle = ids.length ? ids : D.auswahl.map(a => a.rezept).filter(id => R[id]);
  if (quelle.length < 2) return `<h1>Gemeinsamer Ablauf</h1><p class="leer">Für einen gemeinsamen Ablauf mindestens zwei Gerichte wählen – in der <a href="#/auswahl">Einkaufsauswahl</a> oder über die <a href="#/date">Date-Ansicht</a>.</p>`;
  const a = ablaufDaten(quelle); const st = D.ablauf && D.ablauf.ids && D.ablauf.ids.join() === quelle.join() ? D.ablauf : null; const erl = (st && st.erledigt) || {};
  const punkt = (key, html) => `<li class="ablauf-punkt ${erl[key] ? 'erledigt' : ''}"><label><input type="checkbox" data-ablauf-haken="${esc(key)}" ${erl[key] ? 'checked' : ''} ${st ? '' : 'disabled'}><span>${html}</span></label></li>`;
  const maxG = Math.max(0, ...a.info.map(x => x.gesamt || 0));
  return `<div class="seitenkopf"><h1>Gemeinsamer Ablauf</h1><a class="knopf klein still" href="#/auswahl">${ico('zurueck', 'klein')} Auswahl</a></div>
  <p class="unterzeile">${a.info.map(x => esc(kurztitel(x.r.titel))).join(' · ')}</p>
  <div class="karte"><ul class="klein">${a.info.map(x => `<li><b>${esc(kurztitel(x.r.titel))}</b>: aktiv ${x.aktiv ?? '?'} Min.${x.warten != null ? `, Warten/Garen ohne Arbeit ca. ${x.warten} Min.` : ''}${x.schwer ? ' · <span class="chip warn">anspruchsvoll</span>' : ''}</li>`).join('')}</ul>
    <p class="leise klein">Zeiten stammen aus den Rezepten (für Anfänger geschätzt). Die Reihenfolge unten ist ein Vorschlag aus diesen Zeiten – keine minutengenaue Planung; echte Garzeiten hängen von Gerät und Menge ab.</p>
    ${st ? `<p class="klein"><b>Läuft</b> seit ${esc(new Date(st.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }))} – Häkchen bleiben gespeichert, du kannst jederzeit unterbrechen.</p><div class="knopfreihe"><button class="klein still" data-a="ablauf-ende" data-v="${esc(quelle.join(','))}">Ablauf beenden</button></div>` : `<div class="knopfreihe"><button class="haupt" data-a="ablauf-start" data-v="${esc(quelle.join(','))}">Ablauf starten (abhaken)</button></div>`}
    <p class="leise klein">Der Ablauf verbraucht keine Zutaten und bucht nichts. Gekocht wird im Kochmodus des jeweiligen Rezepts; dort gibt es nach „Fertig gekocht“ Vorrat und Tagebuch.</p></div>
  ${a.konflikte.length ? `<div class="hinweis warn klein"><b>Geräte:</b><ul>${a.konflikte.map(k => `<li>${esc(k)}</li>`).join('')}</ul></div>` : ''}
  <ol class="ablauf">
    ${a.vorab.length ? `<li><h3>Was vorher geht</h3><ul>${a.vorab.map(x => punkt('vorab-' + x.r.id, `<b>${esc(kurztitel(x.r.titel))}:</b> ${esc(x.r.meta.date_vorab || 'lässt sich vorkochen und gekühlt aufbewahren (siehe Rezept).')}`)).join('')}</ul></li>` : ''}
    <li><h3>Vorbereitung bündeln</h3>${a.gemeinsam.length ? `<p class="klein">Kommt in mehreren Gerichten vor – zusammen schneiden/abwiegen: <b>${esc(a.gemeinsam.join(', '))}</b>.</p>` : ''}<ul>${a.vorb.map(x => punkt('vorb-' + x.r.id, `<b>${esc(kurztitel(x.r.titel))}:</b> ${x.schritte.map(t => esc(String(t).replace(/\*\*/g, ''))).join(' · ')}`)).join('') || '<li class="leise klein">Keine eigenen Vorbereitungsschritte hinterlegt.</li>'}</ul></li>
    <li><h3>Starten – längste Gesamtzeit zuerst</h3><ul>${a.startReihe.map(x => punkt('start-' + x.r.id, `<b>${esc(kurztitel(x.r.titel))}</b> ${x.gesamt != null ? `– braucht insgesamt ca. ${x.gesamt} Min.; damit alles zugleich fertig ist, etwa ${maxG - x.gesamt > 0 ? (maxG - x.gesamt) + ' Min. nach dem ersten Gericht' : 'als Erstes'} beginnen (Richtwert)` : '– Zeit unbekannt'} · <a href="#/kochen/${esc(x.r.id)}">Kochmodus</a>`)).join('')}</ul>
      ${a.schwer.length > 1 ? `<p class="hinweis klein">Mehrere anspruchsvolle Gerichte (${a.schwer.map(x => esc(kurztitel(x.r.titel))).join(', ')}): deren heikle Schritte (Anbraten, Saucen, Garpunkt) <b>nacheinander</b> erledigen, nicht gleichzeitig. Was warten kann, solange warm halten oder vorab zubereiten.</p>` : ''}</li>
    <li><h3>Kurz vor dem Servieren</h3><ul>${a.zuletzt.map(x => punkt('ende-' + x.r.id, `<b>${esc(kurztitel(x.r.titel))}:</b> ${esc(String(x.s.titel).replace(/\*\*/g, ''))}`)).join('')}</ul></li>
  </ol>`;
}
document.addEventListener('change', ev => { const h = ev.target.closest('[data-ablauf-haken]'); if (!h || !D.ablauf) return; const k = h.dataset.ablaufHaken; aendere('', d => { d.ablauf.erledigt = d.ablauf.erledigt || {}; if (h.checked) d.ablauf.erledigt[k] = true; else delete d.ablauf.erledigt[k]; }); });
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a, v = b.dataset.v;
  if (a === 'ablauf-start') aendere('Ablauf gestartet – Häkchen werden gespeichert', d => { d.ablauf = { ids: v.split(','), start: new Date().toISOString(), erledigt: {} }; });
  else if (a === 'ablauf-ende') { if (!confirm('Ablauf beenden? Die Häkchen werden verworfen; Rezepte, Vorrat und Tagebuch bleiben unverändert.')) return; aendere('Ablauf beendet – Rückgängig möglich', d => { delete d.ablauf; }); }
});
/* ---------- Preise: kleiner, belegter, PRIVATER Bestand (nie im öffentlichen Katalog). Unbekannte Preise zählen nie als 0. ---------- */
function preise() { D.preise = arr(D.preise); return D.preise; }
function preisGueltig(p) { if (p.angebot && p.gueltig_bis && p.gueltig_bis < heute()) return { ok: false, grund: 'Angebot abgelaufen' }; const alt = p.datum ? -tageBis(p.datum) : 999; return { ok: true, alt: alt > 90, tage: alt }; }
function preisFuer(zid, einheit, haendler) {
  const l = preise().filter(p => p.zutat === zid && (!haendler || haendler === 'beide' || p.haendler === haendler) && preisGueltig(p).ok && Number(p.preis) > 0 && Number(p.packung) > 0 && (p.einheit || 'g') === einheit);
  return l.sort((a, b) => a.preis / a.packung - b.preis / b.packung)[0] || null;
}
function kostenRechnung(liste, haendler, vorratAbziehen) {
  const bedarf = {}; let grundvorrat = 0;
  liste.forEach(({ rezept, portionen }) => { const r = R[rezept]; if (!r) return; const f = faktor(r, portionen);
    r.zutaten.forEach(z => { if (!z.zutat || z.menge == null || !/^(g|ml)$/.test(z.einheit)) return; if (z.bedarf === 'grundvorrat') { grundvorrat++; return; } if (z.bedarf === 'optional') return; const k = z.zutat + '|' + z.einheit; bedarf[k] = (bedarf[k] || 0) + z.menge * f; }); });
  const posten = Object.entries(bedarf).map(([k, menge]) => { const [zid, einheit] = k.split('|'); let m = menge;
    if (vorratAbziehen) { const v = vorratMenge(zid); if (v.vorhanden && !v.unbekannt && vorratEinheit(zid) === einheit) m = Math.max(0, m - v.menge); }
    const p = preisFuer(zid, einheit, haendler); const pk = p ? Math.ceil(m / p.packung - 1e-9) : null;
    return { zid, name: (Z[zid] || {}).name || zid, einheit, menge: m, p, packungen: pk, kosten: p && m > 0 ? pk * p.preis : p ? 0 : null, anteil: p ? m / p.packung * p.preis : null, pfand: p && p.pfand ? pk * p.pfand : 0, alt: p ? preisGueltig(p).alt : false, rest: p && m > 0 ? pk * p.packung - m : 0 }; }).filter(x => x.menge > 0);
  const mit = posten.filter(x => x.p), ohne = posten.filter(x => !x.p);
  return { posten, mit, ohne, summe: mit.reduce((s, x) => s + x.kosten, 0), anteil: mit.reduce((s, x) => s + x.anteil, 0), pfand: mit.reduce((s, x) => s + x.pfand, 0), alt: mit.filter(x => x.alt).length, grundvorrat };
}
const euro = x => x == null ? '?' : x.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
function kostenHtml(liste, budget, haendler, vorratAbziehen) {
  const k = kostenRechnung(liste, haendler, vorratAbziehen); const n = k.posten.length;
  if (!n) return '<p class="klein"><b>Kosten:</b> keine Zutaten mit Mengenangabe.</p>';
  const stufe = !k.mit.length ? 'nicht belastbar' : k.ohne.length ? 'teilweise belegt' : k.alt ? 'vollständig belegt, teils ältere Preise' : 'vollständig belegt';
  const b = budget !== '' && budget != null ? Number(budget) : null;
  const budgetText = b == null ? '' : !k.mit.length ? ` Budget ${euro(b)}: <b>nicht prüfbar</b> – ohne Preise wird keine Einhaltung bestätigt.` : k.ohne.length ? (k.summe > b ? ` Budget ${euro(b)}: <b>schon mit den belegten Teilen überschritten</b>.` : ` Budget ${euro(b)}: <b>nicht prüfbar</b> – ${k.ohne.length} Zutaten ohne Preis.`) : k.summe <= b ? ` Budget ${euro(b)}: eingehalten (laut belegten Preisen${k.alt ? ', teils älter als 90 Tage' : ''}).` : ` Budget ${euro(b)}: <b>überschritten</b>.`;
  return `<div class="klein kosten"><p><b>Kosten: ${stufe}.</b> ${k.mit.length ? `Für ${k.mit.length} von ${n} Zutaten: ${euro(k.summe)} beim Kauf ganzer Packungen (verbraucht davon ca. ${euro(k.anteil)})${k.pfand ? `, Pfand separat ${euro(k.pfand)}` : ''}.` : `Für keine der ${n} Zutaten ist ein Preis hinterlegt.`}${k.ohne.length && k.mit.length ? ` Ohne Preis (nicht als 0 gerechnet): ${esc(k.ohne.slice(0, 6).map(x => x.name).join(', '))}${k.ohne.length > 6 ? ` und ${k.ohne.length - 6} weitere` : ''}.` : ''}${budgetText}</p>
    ${k.mit.some(x => x.rest > 0) ? `<details><summary>Packungsreste</summary><ul>${k.mit.filter(x => x.rest > 0).map(x => `<li>${esc(x.name)}: ${x.packungen}× ${zahlDE(x.p.packung)} ${esc(x.einheit)} gekauft, ${zahlDE(Math.round(x.rest))} ${esc(x.einheit)} bleiben übrig</li>`).join('')}</ul><p class="leise">Reste kommen nach dem Einkauf in den Vorrat und werden bei späteren Vorschlägen bevorzugt.</p></details>` : ''}
    <p class="leise">${k.grundvorrat ? 'Grundvorrat (Salz, Öl, Gewürze) nicht eingerechnet. ' : ''}Preise stammen nur aus deinem privaten Preisbestand – <a href="#/preise">Preise ansehen oder eintragen</a>.</p></div>`;
}
function vPreise() {
  const l = preise().slice().sort((a, b) => String(b.datum).localeCompare(String(a.datum))); const e = D.preise_einst || {};
  const zeile = p => { const g = preisGueltig(p); return `<li><span><b>${esc(p.name || (Z[p.zutat] || {}).name || '?')}</b> · ${esc({ rewe: 'REWE', lidl: 'Lidl' }[p.haendler] || p.haendler || '')} · ${euro(Number(p.preis))} für ${zahlDE(p.packung)} ${esc(p.einheit || 'g')}${p.packung ? ` <span class="leise">(${euro(p.preis / p.packung * (p.einheit === 'stk' ? 1 : 1000))}/${p.einheit === 'stk' ? 'Stück' : p.einheit === 'ml' ? 'l' : 'kg'})</span>` : ''}${p.pfand ? ` + Pfand ${euro(Number(p.pfand))}` : ''}<br><span class="leise klein">${esc(datumDE(p.datum))} · ${esc(p.quelle || 'Quelle?')}${p.angebot ? ` · <span class="chip warn">Angebot${p.gueltig_bis ? ' bis ' + esc(datumDE(p.gueltig_bis)) : ''}</span>` : ''}${p.bedingung ? ' · Bedingung: ' + esc(p.bedingung) : ''}${!g.ok ? ` · <span class="chip warn">${g.grund} – wird nicht gerechnet</span>` : g.alt ? ' · <span class="chip warn">älter als 90 Tage</span>' : ''}${p.zutat ? '' : ' · <span class="chip warn">keiner Zutat zugeordnet – wird nicht gerechnet</span>'}</span></span><button class="klein still" data-a="preis-weg" data-v="${esc(p.id)}" aria-label="Preis löschen">×</button></li>`; };
  return `<h1>Einkauf</h1>${planTabs('preise')}
  <p class="leise">Dein privater Preisbestand – nur auf diesem Gerät, im Export enthalten, nie veröffentlicht. Die App erfindet keine Preise und rechnet fehlende nicht als 0.</p>
  <details class="karte" ${l.length ? '' : 'open'}><summary><b>Preis eintragen</b></summary><form id="preis-form">
    <div class="zeile"><label class="feld" style="flex:2 1 180px"><span>Zutat (aus der Liste)</span><input name="zutat" list="preis-zutaten" required placeholder="z. B. Magerquark"></label><label class="feld" style="flex:2 1 180px"><span>Genaues Produkt</span><input name="name" placeholder="z. B. Milbona Magerquark 500 g"></label>
    <label class="feld"><span>Händler</span><select name="haendler"><option value="lidl">Lidl</option><option value="rewe">REWE</option><option value="andere">anderer</option></select></label></div>
    <div class="zeile"><label class="feld"><span>Preis €</span><input name="preis" type="number" step="0.01" min="0" inputmode="decimal" required style="width:6em"></label><label class="feld"><span>Packung</span><input name="packung" type="number" step="any" min="0" inputmode="decimal" required style="width:6em"></label><label class="feld"><span>Einheit</span><select name="einheit"><option>g</option><option>ml</option><option value="stk">Stück</option></select></label><label class="feld"><span>Pfand €</span><input name="pfand" type="number" step="0.01" min="0" inputmode="decimal" style="width:5em"></label><label class="feld"><span>Datum</span><input name="datum" type="date" value="${heute()}"></label></div>
    <div class="zeile"><label><input type="checkbox" name="angebot"> Angebot</label><label class="feld"><span>gültig bis</span><input name="gueltig_bis" type="date"></label><label class="feld" style="flex:1 1 160px"><span>Bedingung (Coupon, App, Karte)</span><input name="bedingung"></label><label class="feld" style="flex:1 1 160px"><span>Quelle</span><input name="quelle" placeholder="Kassenbon, Prospekt, App …"></label></div>
    <datalist id="preis-zutaten">${K.zutaten.filter(z => z.bls && Object.keys(z.bls).length).map(z => `<option value="${esc(z.name)}">`).join('')}</datalist>
    <button class="haupt" type="submit">Speichern</button></form></details>
  <details class="karte"><summary><b>Mehrere Preise importieren</b> <span class="leise klein">– z. B. einmal pro Woche aus deinen Notizen</span></summary>
    <p class="klein">Eine Zeile je Preis: <code>Zutat; Produkt; Händler; Preis; Packung; Einheit; Datum; Quelle; Angebot bis (optional); Bedingung (optional); Pfand (optional)</code></p>
    <textarea id="preis-import" rows="5" placeholder="Magerquark; Milbona Magerquark 500 g; lidl; 1,19; 500; g; 2026-11-14; Kassenbon"></textarea>
    <div class="knopfreihe"><button class="klein" data-a="preis-import">Prüfen und übernehmen</button></div><p class="leise klein">Nur Zeilen mit bekannter Zutat, Preis, Packung und Datum werden übernommen; der Rest wird angezeigt.</p></details>
  <div class="karte"><label class="feld"><span>Deine Märkte / Region (privat, optional)</span><input id="preis-region" value="${esc(e.region || '')}" maxlength="80" placeholder="z. B. deine zwei Stammmärkte"></label><p class="leise klein">Hilft dir beim Notieren, weil Preise je Markt abweichen können. Bleibt auf diesem Gerät.</p></div>
  <h2>Hinterlegt (${l.length})</h2>${l.length ? `<ul class="eintraege">${l.map(zeile).join('')}</ul>` : '<p class="leer">Noch keine Preise. Ohne Preise schlägt die App trotzdem Gerichte vor, bestätigt aber kein Budget.</p>'}`;
}
function preisAusFeldern(o) {
  const z = K.zutaten.find(x => x.name.toLowerCase() === String(o.zutat || '').trim().toLowerCase()); const zahl = v => v === '' || v == null ? null : Number(String(v).replace(',', '.'));
  const p = { id: uid('preis'), zutat: z ? z.id : null, name: String(o.name || '').trim() || (z ? z.name : String(o.zutat || '')), haendler: String(o.haendler || '').toLowerCase().replace('rewe', 'rewe').trim() || 'andere', preis: zahl(o.preis), packung: zahl(o.packung), einheit: /^(g|ml|stk)$/.test(String(o.einheit || '').trim()) ? String(o.einheit).trim() : 'g', datum: String(o.datum || '').trim(), quelle: String(o.quelle || '').trim(), angebot: !!o.gueltig_bis || !!o.angebot, gueltig_bis: String(o.gueltig_bis || '').trim() || null, bedingung: String(o.bedingung || '').trim(), pfand: zahl(o.pfand), erfasst: heute() };
  const fehler = []; if (!p.zutat) fehler.push('Zutat unbekannt'); if (!(p.preis > 0)) fehler.push('Preis fehlt'); if (!(p.packung > 0)) fehler.push('Packung fehlt'); if (!/^\d{4}-\d\d-\d\d$/.test(p.datum)) fehler.push('Datum fehlt (JJJJ-MM-TT)');
  return { p, fehler };
}
document.addEventListener('submit', ev => { if (ev.target.id !== 'preis-form') return; ev.preventDefault(); const f = ev.target;
  const { p, fehler } = preisAusFeldern({ zutat: f.zutat.value, name: f.name.value, haendler: f.haendler.value, preis: f.preis.value, packung: f.packung.value, einheit: f.einheit.value, datum: f.datum.value, quelle: f.quelle.value, angebot: f.angebot.checked, gueltig_bis: f.gueltig_bis.value, bedingung: f.bedingung.value, pfand: f.pfand.value });
  if (fehler.length) { toast(fehler.join(', ')); return; } aendere('Preis gespeichert – Rückgängig möglich', d => { d.preise = arr(d.preise); d.preise.push(p); }); });
document.addEventListener('change', ev => { if (ev.target.id === 'preis-region') aendere('', d => { d.preise_einst = Object.assign({}, d.preise_einst, { region: ev.target.value.trim() }); }, { neuZeichnen: false }); });
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a, v = b.dataset.v;
  if (a === 'preis-weg') aendere('Preis gelöscht – Rückgängig möglich', d => { d.preise = arr(d.preise).filter(p => p.id !== v); });
  else if (a === 'preis-import') { const t = document.getElementById('preis-import').value; const ok = [], schlecht = [];
    t.split(/\r?\n/).map(z => z.trim()).filter(Boolean).forEach((z, i) => { const s = z.split(';').map(x => x.trim()); const { p, fehler } = preisAusFeldern({ zutat: s[0], name: s[1], haendler: s[2], preis: s[3], packung: s[4], einheit: s[5], datum: s[6], quelle: s[7], gueltig_bis: s[8], bedingung: s[9], pfand: s[10] }); if (fehler.length) schlecht.push(`Zeile ${i + 1}: ${fehler.join(', ')}`); else ok.push(p); });
    if (!ok.length) { toast(schlecht.length ? schlecht[0] : 'Nichts zu übernehmen'); return; }
    aendere(`${ok.length} Preise übernommen${schlecht.length ? `, ${schlecht.length} Zeilen übersprungen (${schlecht.slice(0, 2).join('; ')})` : ''} – Rückgängig möglich`, d => { d.preise = arr(d.preise); ok.forEach(p => { if (!d.preise.some(x => x.zutat === p.zutat && x.haendler === p.haendler && x.datum === p.datum && x.packung === p.packung && x.preis === p.preis)) d.preise.push(p); }); }); }
});
/* ---------- „Was passt jetzt?“: Zeit → Personen → Vorschläge aus Vorrat, Restportionen, Geräten, Vorlieben und Tagesspielraum ---------- */
const jetztZustand = { zeit: null, personen: null, art: 'mahlzeit' };
// Rolle eines Rezepts: Dips und Saucen sind keine Mahlzeit und kein eigenständiger Snack, auch wenn sie als Snack verschlagwortet sind
const JETZT_ART = { mahlzeit: 'Mahlzeit', fruehstueck: 'Frühstück', snack: 'Snack', beilage: 'Beilage, Dip oder Sauce' };
function jetztRollen(r) {
  const b = arr(r.meta.bereiche).length ? arr(r.meta.bereiche) : [r.meta.bereich]; const haupt = b.includes('hauptgericht') || b.includes('suppe');
  const dip = !haupt && (b.includes('sauce') || r.meta.bereich === 'sauce'); const rollen = new Set();
  if (haupt) rollen.add('mahlzeit'); if (b.includes('fruehstueck')) rollen.add('fruehstueck');
  if (b.includes('snack') && !dip) rollen.add('snack');
  if (dip || b.includes('beilage') || (b.includes('salat') && !haupt)) rollen.add('beilage');
  return rollen;
}
function jetztVorschlaege(zeit, personen, art) {
  const gv = new Set(arr(D.einstellungen.grundvorrat)); const geoeffnet = new Set(D.vorrat.filter(v => v.geoeffnet || (v.verbrauchsdatum && tageBis(v.verbrauchsdatum) <= 3)).map(v => v.zutat));
  const ziele = aktuelleZiele(); const s = tagWerte(heute()); const tagInfo = (D.tage || {})[heute()] || {};
  const rest = ziele && ziele.kcal ? { kcal: Number(ziele.kcal) - s.kcal, protein: ziele.protein ? Number(ziele.protein) - s.protein : null } : null;
  const liste = K.rezepte.map(x => R[x.id]).filter(r => !ausgeschlossen(r).length && !(geraeteFehlen(r) || []).length && jetztRollen(r).has(art || 'mahlzeit')).map(r => {
    const i = rezeptInfo(r); if (zeit && (i.gesamt == null || i.gesamt > zeit)) return null;
    const noetig = r.zutaten.filter(z => z.zutat && z.bedarf !== 'optional');
    const fehlt = noetig.filter(z => z.bedarf === 'grundvorrat' ? false : !vorratMenge(z.zutat).vorhanden);
    const gvUnklar = noetig.filter(z => z.bedarf === 'grundvorrat' && gv.size && !gv.has(z.zutat));
    const nutztOffen = [...new Set(noetig.filter(z => geoeffnet.has(z.zutat)).map(z => Z[z.zutat].name))];
    const gruende = []; let punkte = 0;
    const imVorrat = [...new Set(noetig.filter(z => z.bedarf !== 'grundvorrat' && vorratMenge(z.zutat).vorhanden).map(z => Z[z.zutat].name))];
    if (!fehlt.length) { gruende.push('alles im Vorrat'); punkte += 6; } else if (fehlt.length <= 2) { gruende.push(`fehlt nur: ${fehlt.map(z => Z[z.zutat].name).join(', ')}`); punkte += 3 - fehlt.length; } else { gruende.push(`${fehlt.length} Zutaten fehlen`); punkte -= fehlt.length; }
    if (fehlt.length && imVorrat.length) { gruende.push('nutzt Vorrat: ' + imVorrat.slice(0, 3).join(', ')); punkte += Math.min(3, imVorrat.length); }
    if (nutztOffen.length) { gruende.push('verbraucht angebrochene/bald fällige Packung: ' + nutztOffen.slice(0, 2).join(', ')); punkte += 3; }
    const np = r.naehrwerte.pro_portion; let spielraum = '';
    if (rest && np.kcal != null) { const d = rest.kcal - np.kcal; if (rest.kcal <= 0) { spielraum = 'Energieziel heute schon erreicht'; punkte -= 2; } else if (d >= -150) { spielraum = `passt ungefähr in den Spielraum (${zahlDE(np.kcal)} von ca. ${zahlDE(Math.round(rest.kcal))} kcal)`; punkte += 2; } else { spielraum = `über dem Spielraum (${zahlDE(np.kcal)} kcal, frei ca. ${zahlDE(Math.round(rest.kcal))})`; punkte -= 1; }
      if (rest.protein != null && rest.protein > 15 && np.protein != null && np.protein >= Math.min(30, rest.protein * 0.4)) { gruende.push(`${zahlDE(np.protein)} g Eiweiß`); punkte += 1; } }
    if (r.meta.vorkochen_kuehlschrank === 'ja' && personen && personen < Number(r.meta.portionen)) gruende.push('Rest lässt sich aufbewahren');
    if (gvUnklar.length) gruende.push('Grundvorrat prüfen: ' + gvUnklar.slice(0, 2).map(z => Z[z.zutat].name).join(', '));
    const ab = (D.einstellungen.abneigungen || {}); if (r.zutaten.some(z => ab[z.zutat] && ab[z.zutat] < 3)) punkte -= 3;
    if (arr((D.kochbuch || {}).favoriten).includes(r.id)) { gruende.push('Favorit'); punkte += 1; }
    if ((art || 'mahlzeit') === 'mahlzeit' && np.kcal != null && np.kcal < 300) gruende.push('eher leicht – ggf. mit Beilage ergänzen');
    if (art === 'beilage') { const rol = arr(r.meta.bereiche); gruende.unshift(rol.includes('sauce') && !rol.includes('beilage') ? 'Dip/Sauce – ergänzt ein Gericht' : 'Beilage – ergänzt ein Gericht'); }
    return { r, i, fehlt, punkte, gruende, spielraum };
  }).filter(Boolean).sort((a, b) => b.punkte - a.punkte || (a.i.aktiv || 99) - (b.i.aktiv || 99));
  return { liste, rest, tagVollstaendig: !!tagInfo.vollstaendig, eintraege: s.eintraege };
}
function vJetzt() {
  const z = jetztZustand; const knopf = (k, v, t) => `<button class="filterchip" data-a="jetzt-wahl" data-k="${k}" data-v="${v}" aria-pressed="${z[k] === v}">${t}</button>`;
  const restp = D.restportionen.filter(p => p.portionen > 0);
  const frage1 = `<div class="karte"><h2 style="margin-top:0">Wie viel Zeit hast du?</h2><div class="chips-wrap">${[[20, 'bis 20 Min.'], [30, 'bis 30 Min.'], [45, 'bis 45 Min.'], [60, 'bis 1 Std.'], [0, 'egal']].map(([v, t]) => knopf('zeit', v, t)).join('')}</div></div>`;
  const frage2 = z.zeit != null ? `<div class="karte"><h2 style="margin-top:0">Für wie viele?</h2><div class="chips-wrap">${[1, 2, 3, 4].map(v => knopf('personen', v, v + (v === 1 ? ' Person' : ' Personen'))).join('')}</div></div>` : '';
  let erg = '';
  if (z.zeit != null && z.personen) {
    const v = jetztVorschlaege(z.zeit || null, z.personen, z.art); const top = v.liste.slice(0, 8);
    erg = `<div class="chips-wrap" role="group" aria-label="Was suchst du?">${Object.entries(JETZT_ART).map(([k, t]) => `<button class="filterchip" data-a="jetzt-art" data-v="${k}" aria-pressed="${z.art === k}">${t}</button>`).join('')}</div>
      ${restp.length ? `<div class="hinweis klein"><b>Schon fertig:</b> ${restp.map(p => `${esc(kurztitel(p.titel))} (${zahlDE(p.portionen, 1)} Port.${p.verbrauchen_bis ? ', bis ' + esc(datumDE(p.verbrauchen_bis)) : ''})`).join(' · ')} – nur aufwärmen. <a href="#/tagebuch">Im Tagebuch eintragen</a></div>` : ''}
      ${v.rest ? `<p class="leise klein">Spielraum heute: ca. ${zahlDE(Math.round(Math.max(0, v.rest.kcal)))} kcal${v.rest.protein != null ? ` · ${zahlDE(Math.round(Math.max(0, v.rest.protein)))} g Eiweiß` : ''} – laut ${v.eintraege} Tagebucheinträgen${v.tagVollstaendig ? '' : '; der Tag ist nicht als vollständig markiert, der Spielraum ist deshalb unsicher'}. Rezeptwerte sind Schätzungen.</p>` : '<p class="leise klein">Ohne Ernährungsziel kein Abgleich mit dem Tagesspielraum.</p>'}
      ${D.vorrat.length ? '' : '<p class="hinweis klein">Dein Vorrat ist leer erfasst – „alles im Vorrat“ lässt sich deshalb nicht prüfen. <a href="#/vorrat">Vorrat eintragen</a></p>'}
      ${top.length ? `<ul class="eintraege jetzt-liste">${top.map(x => `<li><span><a href="#/rezept/${esc(x.r.id)}"><b>${esc(x.r.titel)}</b></a><br><span class="leise klein">${x.i.aktiv || '?'} Min. aktiv · ${x.i.gesamt || '?'} Min. gesamt · Rezept für ${esc(x.r.meta.portionen)}${Number(x.r.meta.portionen) !== z.personen ? ` → auf ${z.personen} umrechnen` : ''}</span><br><span class="klein">${esc([...x.gruende, x.spielraum].filter(Boolean).join(' · '))}</span></span><span><button class="klein" data-a="jetzt-kochen" data-v="${esc(x.r.id)}">Kochen</button></span></li>`).join('')}</ul>` : `<p class="leer">Nichts passt in ${z.zeit} Min. – <button class="klein" data-a="jetzt-wahl" data-k="zeit" data-v="0">Zeit egal</button></p>`}
      <p class="leise klein">Ausschlüsse, Allergien und fehlende Geräte gelten automatisch. Die Liste ist ohne KI aus deinen Daten sortiert – eine Hilfe, keine Pflicht.</p>`;
  }
  return `<div class="seitenkopf"><h1>Was passt jetzt?</h1><a class="knopf klein still" href="#/entdecken">${ico('zurueck', 'klein')} Kochbuch</a></div>${frage1}${frage2}${erg}`;
}
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a;
  if (a === 'jetzt-wahl') { jetztZustand[b.dataset.k] = Number(b.dataset.v); route(); }
  else if (a === 'jetzt-art') { jetztZustand.art = b.dataset.v in JETZT_ART ? b.dataset.v : 'mahlzeit'; route(); }
  else if (a === 'jetzt-kochen') { portionenWahl[b.dataset.v] = jetztZustand.personen || portionenWahl[b.dataset.v]; location.hash = '#/rezept/' + b.dataset.v; }
});