/* Kochschule – Küchen, kombinierbare Filter und Mengen-Anpassung.
   Wird nach ernaehrung.js und vor app.js geladen; nutzt deren globale Funktionen erst zur Laufzeit.
   Datenmodell: Vault-Notiz „70 App/Küchen, Filter und Mengen-Anpassung – Datenmodell“. */

/* ---------- Küchen ---------- */
const KUECHEN_GRUPPEN = [
  ['asiatisch', 'Asiatisch', [['japanisch', 'Japanisch'], ['koreanisch', 'Koreanisch'], ['chinesisch', 'Chinesisch'], ['thailaendisch', 'Thailändisch'], ['vietnamesisch', 'Vietnamesisch'], ['indonesisch', 'Indonesisch'], ['indisch', 'Indisch']]],
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
  ['anspruchsvoll', 'anspruchsvoll', (r, i) => i.kat.includes('restaurant') || (i.schwierigkeit || 0) >= 3]
];
const EIGENSCHAFT = Object.fromEntries(EIGENSCHAFTEN.map(e => [e[0], e]));
const EIGENSCHAFT_ERKLAERUNG = {
  proteinreich: 'mind. 20 % der Energie einer Portion aus Protein – Kriterium „hoher Proteingehalt“ der EU-Verordnung 1924/2006, auf die berechnete Portion übertragen',
  guenstig: 'grobe Schätzung nach Zutatenklassen, keine Preise',
  vegan: 'alle Zutaten laut Zutatennotiz vegan; bei Produkten zählt das Etikett'
};

/* Prüft die gewählten Filter (ohne persönliche Ausschlüsse). ohne = Filterschlüssel, der für Lockerungsvorschläge weggelassen wird. */
function filterPasst(r, info, f, ohne) {
  if (ohne !== 'bereich' && f.bereich && r.meta.bereich !== f.bereich && !arr(r.meta.bereiche).includes(f.bereich)) return false;
  if (ohne !== 'kuechen' && f.kuechen.length) { const s = kuechenErweitert(f.kuechen); if (!rezeptKuechen(r).some(k => s.has(k))) return false; }
  for (const e of f.richtung) if (ohne !== 'e:' + e && EIGENSCHAFT[e] && !EIGENSCHAFT[e][2](r, info)) return false;
  if (ohne !== 'maxGesamt' && f.maxGesamt && !(info.gesamt && info.gesamt <= Number(f.maxGesamt))) return false;
  if (ohne !== 'maxAktiv' && f.maxAktiv && !(info.aktiv && info.aktiv <= Number(f.maxAktiv))) return false;
  if (ohne !== 'suche' && f.suche) { const q = f.suche.toLowerCase(); if (!(r.titel.toLowerCase().includes(q) || r.zutaten.some(z => (z.text || '').toLowerCase().includes(q)))) return false; }
  return true;
}
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
