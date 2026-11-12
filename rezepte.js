/* Kochschule – Küchen, kombinierbare Filter und Mengen-Anpassung.
   Wird nach ernaehrung.js und vor app.js geladen; nutzt deren globale Funktionen erst zur Laufzeit.
   Datenmodell: Vault-Notiz „70 App/Küchen, Filter und Mengen-Anpassung – Datenmodell“. */

/* ---------- Küchen ---------- */
const KUECHEN_GRUPPEN = [
  ['asiatisch', 'Asiatisch', [['japanisch', 'Japanisch'], ['koreanisch', 'Koreanisch'], ['chinesisch', 'Chinesisch'], ['thailaendisch', 'Thailändisch'], ['vietnamesisch', 'Vietnamesisch'], ['indonesisch', 'Indonesisch'], ['malaysisch', 'Malaysisch'], ['philippinisch', 'Philippinisch'], ['taiwanisch', 'Taiwanisch'], ['srilankisch', 'Sri-lankisch'], ['indisch', 'Indisch']]],
  ['orient', 'Türkei, Nahost & Nordafrika', [['tuerkisch', 'Türkisch'], ['levantinisch', 'Levantinisch'], ['persisch', 'Persisch'], ['nordafrikanisch', 'Nordafrikanisch']]],
  ['europaeisch', 'Europäisch', [['italienisch', 'Italienisch'], ['griechisch', 'Griechisch'], ['spanisch', 'Spanisch'], ['franzoesisch', 'Französisch'], ['deutsch', 'Deutsch'], ['oesterreichisch', 'Österreichisch'], ['britisch', 'Britisch']]],
  ['amerika', 'Amerika', [['mexikanisch', 'Mexikanisch'], ['texmex', 'Tex-Mex'], ['us_amerikanisch', 'US-amerikanisch']]]
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
  ['mehrere-portionen', 'gut für mehrere Portionen', r => Number(r.meta.portionen) >= 4 && r.meta.vorkochen_kuehlschrank === 'ja']
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
function suchePasst(r, q) { const w = suchNorm(q).split(/\s+/).filter(Boolean); if (!w.length) return true; const t = rezeptSuchtext(r); return w.every(x => t.includes(x)); }
const titelTreffer = (r, q) => suchNorm(r.titel).includes(suchNorm(q).trim());
/* Rangfolge: Titel vor ganzem Wort (z. B. Zutat „Huhn“) vor Wortanfang vor Wortteil (z. B. „Hühnerei“) */
function suchRang(r, q) {
  const t = rezeptSuchtext(r), ti = suchNorm(r.titel);
  return suchNorm(q).split(/\s+/).filter(Boolean).reduce((s, w) => {
    const wort = new RegExp('(^|[^a-z0-9])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z0-9]|$)'), anfang = new RegExp('(^|[^a-z0-9])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return s + (ti.includes(w) ? 8 : wort.test(t) ? 4 : anfang.test(t) ? 2 : 1);
  }, 0);
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
function effektivesRezept(r0, a) {
  const P = Number(a.portionen) || Number(r0.meta.portionen) || 1;
  const zut = r0.zutaten.map((z, i) => { const neu = a.mengen ? a.mengen[i] : null; if (neu == null || z.menge == null || neu === z.menge) return Object.assign({}, z, { _m: 1 }); return Object.assign({}, z, { menge: neu, menge_text: zahlDE(neu, 2), _m: neu / z.menge, _orig: z.menge }); });
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
function rezepteAktualisieren() {
  if (!Object.keys(R0).length) K.rezepte.forEach(r => { R0[r.id] = r; });
  const an = (D && D.anpassungen) || {};
  for (const id in R0) R[id] = an[id] ? effektivesRezept(R0[id], an[id]) : R0[id];
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
  const vs = ((D.varianten || {})[r.id] || []);
  const a = r.angepasst;
  return `${a ? `<div class="hinweis"><b>Angepasst für diesen Kochvorgang:</b> ${esc(a.beschreibung || 'eigene Mengen')} · ${zahlDE(Number(a.portionen), 1)} Portionen (Original: ${esc(R0[r.id].meta.portionen)}). Einkauf, Kochschritte, Nährwerte, Vorrat und Restportionen nutzen diese Mengen; bereits gebuchte Mahlzeiten bleiben unverändert.
      <div class="knopfreihe"><button class="klein" data-a="anp-zurueck" data-v="${esc(r.id)}">Auf Original zurücksetzen</button><button class="klein still" data-a="anp-variante" data-v="${esc(r.id)}">Als persönliche Variante speichern</button></div></div>` : ''}
    ${vs.length ? `<p class="klein">Deine Varianten: ${vs.map((x, ix) => `<button class="chip" data-a="anp-var-an" data-v="${esc(r.id)}" data-ix="${ix}">${esc(x.name)}</button><button class="still klein" data-a="anp-var-weg" data-v="${esc(r.id)}" data-ix="${ix}" aria-label="Variante ${esc(x.name)} löschen">×</button>`).join(' ')}</p>` : ''}`;
}
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
    case 'anp-zurueck': delete portionenWahl[v]; aendere('Original-Mengen wiederhergestellt', d => { if (d.anpassungen) delete d.anpassungen[v]; const x = d.auswahl.find(y => y.rezept === v); if (x) x.jetzt = Math.max(1, Math.round(x.jetzt + x.vorkochen) - x.vorkochen); }); break;
    case 'anp-variante': { const r = R[v]; const name = (prompt('Name der Variante (z. B. „500-g-Packung“):', (r.angepasst && r.angepasst.beschreibung || '').slice(0, 40)) || '').trim(); if (!name) return;
      aendere('Variante gespeichert – nur in diesem Profil', d => { d.varianten = d.varianten || {}; (d.varianten[v] = d.varianten[v] || []).push({ name, mengen: Object.assign({}, r.angepasst.mengen), portionen: r.angepasst.portionen, beschreibung: r.angepasst.beschreibung, rezept_version: R0[v].meta.version || 1, erstellt: new Date().toISOString() }); }); break; }
    case 'anp-var-an': { const x = D.varianten[v][Number(b.dataset.ix)]; portionenWahl[v] = x.portionen; aendere(`Variante „${x.name}“ angewendet`, d => { d.anpassungen = d.anpassungen || {}; d.anpassungen[v] = { mengen: Object.assign({}, x.mengen), portionen: x.portionen, beschreibung: 'Variante ' + x.name + (x.beschreibung ? ': ' + x.beschreibung : ''), geaendert: new Date().toISOString() }; }); break; }
    case 'anp-var-weg': { const x = D.varianten[v][Number(b.dataset.ix)]; if (!confirm(`Variante „${x.name}“ löschen?`)) return; aendere('Variante gelöscht', d => { d.varianten[v].splice(Number(b.dataset.ix), 1); }); break; }
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
function vPlanung() {
  const c = planEinst(); const plan = D.wochenplan.vorschlag; const ziele = aktuelleZiele();
  const chk = (name, wert, an, text) => `<label class="wahl-chip"><input type="checkbox" data-pl-liste="${name}" value="${wert}" ${an ? 'checked' : ''}> ${text}</label>`;
  const zahl = (k, text, min, max, step = 1) => `<label class="feld"><span>${text}</span><input type="number" inputmode="numeric" data-pl="${k}" min="${min}" max="${max}" step="${step}" value="${esc(c[k])}" style="width:6em"></label>`;
  const kuechen = [...new Set(K.rezepte.map(r => r.meta.kueche).filter(Boolean))].sort();
  const form = `<details class="karte" ${plan ? '' : 'open'}><summary><b>Vorgaben</b> <span class="leise klein">– ${c.tage} Tage · ${c.personen} Pers. · ${c.termine}× kochen · ${esc(c.slots.map(s => PL_SLOTS.find(x => x[0] === s)[1]).join(', '))}</span></summary>
    <div class="zeile">${zahl('tage', 'Für wie viele Tage', 1, 14)}${zahl('personen', 'Personen', 1, 8)}${zahl('termine', 'Wie oft kochen', 1, 14)}${zahl('max_aktiv', 'Aktive Zeit je Termin (Min.)', 10, 180, 5)}${zahl('wiederholen', 'Gleiches Gericht höchstens (Tage)', 1, 7)}</div>
    <p class="klein" style="margin:.4em 0 .2em"><b>Welche Mahlzeiten planen?</b></p><div class="chips-wrap">${PL_SLOTS.map(([k, n]) => chk('slots', k, c.slots.includes(k), n)).join('')}</div>
    <div class="chips-wrap" style="margin-top:6px">${chk('opt', 'zwei', c.zwei, 'zwei Gerichte je Kochtermin')}${chk('opt', 'einfrieren', c.einfrieren, 'vorkochen und einfrieren ok')}${chk('opt', 'restportionen', c.restportionen, 'vorhandene Restportionen einplanen')}${chk('opt', 'ziele', c.ziele, 'Ernährungsziele berücksichtigen')}</div>
    <div class="zeile" style="margin-top:6px"><label class="feld"><span>Abwechslung</span><select data-pl="abwechslung">${['niedrig', 'mittel', 'hoch'].map(x => `<option ${c.abwechslung === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
      <label class="feld"><span>Budget € (optional)</span><input type="number" inputmode="decimal" data-pl="budget" min="0" step="1" value="${esc(c.budget)}" style="width:6em"></label>
      <label class="feld"><span>Händler</span><select data-pl="haendler">${[['beide', 'REWE und Lidl'], ['rewe', 'nur REWE'], ['lidl', 'nur Lidl']].map(([k, n]) => `<option value="${k}" ${c.haendler === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div>
    <details class="klein"><summary>Bevorzugte Küchen (optional)</summary><div class="chips-wrap">${kuechen.map(k => chk('kuechen', k, c.kuechen.includes(k), esc(KUECHE_NAME[k] || k))).join('')}</div></details>
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
      <p class="klein"><b>Kosten:</b> Für die Zutaten sind noch keine belegten Preise hinterlegt – ${c.budget !== '' ? `die Budgetprüfung (${esc(c.budget)} €) ist deshalb <b>nicht belastbar</b>.` : 'eine Kostenrechnung ist noch nicht möglich.'} Grobe Kostenklassen der Gerichte (Schätzung): ${esc([...new Set(plan.gerichte.map(g => (R[g.rezept] || { meta: {} }).meta.kosten_klasse).filter(Boolean))].map(k => ({ guenstig: 'günstig', mittel: 'mittel', hoeher: 'höher' }[k] || k)).join(', ') || '–')}.</p>
      ${plan.konflikte.length ? `<div class="hinweis warn klein"><b>Nicht alles erfüllbar:</b><ul>${plan.konflikte.map(k => `<li>Kochtermin ${k.termin + 1}: ${esc(k.grund)}${k.fix === 'zeit' ? ` <button class="klein" data-a="pl-fix-zeit">Aktive Zeit auf ${Number(c.max_aktiv) + 15} Min. erhöhen</button>` : ''}</li>`).join('')}</ul></div>` : ''}</section>
    ${kartenHtml}
    <div class="karte"><p class="klein">Übernimmt die Gerichte mit Portionen in „Gerichte“ und die Einkaufsliste (dort wird dein Vorrat abgezogen). Gekauft, gekocht oder gegessen ist damit noch nichts.</p>
      <div class="knopfreihe"><button class="haupt" data-a="pl-uebernehmen" data-v="ersetzen">In den Einkauf übernehmen</button>${D.auswahl.length ? `<button data-a="pl-uebernehmen" data-v="ergaenzen">zur bisherigen Auswahl hinzufügen</button>` : ''}<button class="still" data-a="pl-verwerfen">Plan verwerfen</button></div></div>`;
}
document.addEventListener('change', ev => { const el = ev.target; if (!el.dataset) return;
  if (el.dataset.pl) { const k = el.dataset.pl; aendere(null, () => { const c = planEinst(); c[k] = el.type === 'number' ? (el.value === '' ? '' : Number(el.value)) : el.value; }, { neuZeichnen: false }); }
  else if (el.dataset.plListe) { const k = el.dataset.plListe; aendere(null, () => { const c = planEinst(); if (k === 'opt') c[el.value] = el.checked; else { const l = new Set(arr(c[k])); if (el.checked) l.add(el.value); else l.delete(el.value); c[k] = [...l]; } }, { neuZeichnen: false }); } });
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-a^="pl-"]'); if (!b) return; const a = b.dataset.a, i = Number(b.dataset.v); const c = planEinst(); const plan = D.wochenplan.vorschlag;
  switch (a) {
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
