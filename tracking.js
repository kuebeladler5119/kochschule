/* Kochschule – Tagebuch-Erweiterungen: Mahlzeiten, eigene Mahlzeiten, Bearbeiten, Produktdatenbank.
   Wird nach rezepte.js und vor app.js geladen. Alle Daten liegen nur im lokalen Profil. */

/* ---------- Mahlzeiten ---------- */
const SLOTS = [['fruehstueck', 'Frühstück'], ['mittag', 'Mittag'], ['abend', 'Abend'], ['snack', 'Snack']];
const SLOT_NAME = Object.fromEntries(SLOTS);
function slotVonZeit(z) { const [h, m] = String(z || new Date().toTimeString().slice(0, 5)).split(':').map(Number); const t = h * 60 + (m || 0); return t < 630 ? 'fruehstueck' : t < 900 ? 'mittag' : t < 1050 ? 'snack' : 'abend'; }
let tbSlot = null;   // gewählte Mahlzeit für neue Einträge (null = nach Uhrzeit)
let tbEdit = null;   // Eintrag, der gerade bearbeitet wird
const eintragSlot = e => e.mahlzeit || slotVonZeit(e.zeit);
function neuerEintragSlot() { return tbSlot || (tbDatum && tbDatum !== heute() ? 'mittag' : slotVonZeit()); }
function slotWahlHtml() {
  const akt = neuerEintragSlot();
  return `<div class="filterleiste" role="group" aria-label="Neue Einträge zu">${SLOTS.map(([k, n]) => `<button class="filterchip" data-a="tb-slot" data-v="${k}" aria-pressed="${akt === k}">${n}</button>`).join('')}</div>`;
}
/* Einträge eines Tages nach Mahlzeit gruppiert */
function eintraegeHtml(ein, tag) {
  if (!ein.length) return `<div class="leer">${ico('leer')}Noch nichts eingetragen.<br><span class="klein">Einträge entstehen hier, beim „Fertig gekocht“ oder mit einer Restportion.</span></div>`;
  return SLOTS.map(([k, n]) => {
    const liste = ein.filter(e => eintragSlot(e) === k); if (!liste.length) return '';
    const kcal = liste.reduce((s, e) => s + (e.naehr && e.naehr.kcal != null ? e.naehr.kcal : 0), 0); const unbek = liste.some(e => !e.naehr || e.naehr.kcal == null);
    return `<section class="mahlzeit"><div class="mahlzeit-kopf"><h3>${n}</h3><span class="leise klein">${unbek ? 'mind. ' : ''}${zahlDE(kcal)} kcal</span>
      <span class="knopfreihe" style="margin:0">${tag !== heute() ? `<button class="still klein" data-a="tb-slot-kopie" data-v="${k}">auf heute kopieren</button>` : ''}<button class="still klein" data-a="tb-slot-merken" data-v="${k}">als eigene Mahlzeit</button></span></div>
      <ul class="eintraege">${liste.map(eintragZeile).join('')}</ul></section>`;
  }).join('');
}
function mengeText(e) { return e.einheit === 'Portion' || !e.einheit ? zahlDE(e.portionen, 2) + ' P.' : zahlDE(e.gramm) + ' ' + esc(e.einheit); }
function eintragZeile(e) {
  const titel = e.rezept ? `<a href="#/rezept/${esc(e.rezept)}">${esc(e.titel)}</a>` : esc(e.titel);
  if (tbEdit === e.id) {
    const istPortion = e.einheit === 'Portion' || !e.einheit;
    return `<li class="bearbeiten"><span><b>${titel}</b></span><form class="zeile" data-tb-edit="${esc(e.id)}" style="grid-column:1/-1">
      <label class="feld"><span>${istPortion ? 'Portionen' : 'Menge (' + esc(e.einheit) + ')'}</span><input name="menge" type="number" inputmode="decimal" min="0.05" step="any" value="${esc(istPortion ? e.portionen : e.gramm)}" style="width:6em"></label>
      <label class="feld"><span>Mahlzeit</span><select name="slot">${SLOTS.map(([k, n]) => `<option value="${k}" ${eintragSlot(e) === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="feld"><span>Uhrzeit</span><input name="zeit" type="time" value="${esc(e.zeit || '')}"></label>
      <span class="knopfreihe"><button class="haupt klein" type="submit">Speichern</button><button class="still klein" type="button" data-a="tb-edit-ab">Abbrechen</button></span></form>
      <p class="leise klein" style="grid-column:1/-1;margin:0">Nährwerte werden aus den beim Buchen gespeicherten Werten umgerechnet – spätere Rezept- oder Produktänderungen wirken nicht zurück.</p></li>`;
  }
  return `<li><span><b>${titel}</b></span><span class="kcal">${e.naehr && e.naehr.kcal != null ? zahlDE(e.naehr.kcal) + ' kcal' : '? kcal'}</span>
    <span class="unter"><span>${esc(e.zeit || '')}</span>
      <span class="stepper"><button data-a="tb-menge" data-v="${esc(e.id)}" data-d="-1" aria-label="weniger">−</button><output>${mengeText(e)}</output><button data-a="tb-menge" data-v="${esc(e.id)}" data-d="1" aria-label="mehr">+</button></span>
      ${e.naehr ? `<span>P ${zahlDE(e.naehr.protein, 1)} · KH ${zahlDE(e.naehr.kh, 1)} · F ${zahlDE(e.naehr.fett, 1)}</span>` : ''}${e.status === 'unvollstaendig' ? '<span class="chip warn">unvollständig</span>' : ''}${e.quelle === 'restportion' ? '<span class="chip">Restportion</span>' : ''}${e.produkt_pruefstatus === 'ungeprueft' ? '<span class="chip warn">Produktwerte ungeprüft</span>' : ''}
      <button class="still klein" data-a="tb-edit" data-v="${esc(e.id)}">bearbeiten</button><button class="still klein" data-a="tb-kopie" data-v="${esc(e.id)}">erneut</button><button class="still klein" data-a="tb-weg" data-v="${esc(e.id)}">löschen</button></span></li>`;
}
/* Schnellwahl: eigene Mahlzeiten und zuletzt gebuchte Einträge */
function schnellwahlHtml() {
  const mz = D.mahlzeiten || [];
  const gesehen = new Set(); const letzte = [];
  [...D.tagebuch].sort((a, b) => (b.datum + (b.zeit || '')).localeCompare(a.datum + (a.zeit || ''))).forEach(e => { const k = (e.rezept || e.zutat || e.lebensmittel || e.titel) + '|' + (e.portionen || e.gramm); if (!gesehen.has(k) && letzte.length < 6) { gesehen.add(k); letzte.push(e); } });
  return `${mz.length ? `<h4>Eigene Mahlzeiten</h4><div class="schnellwahl">${mz.map(m => `<button class="klein" data-a="tb-mz-buchen" data-v="${esc(m.id)}">${esc(m.name)} · ${m.eintraege.length} Teile</button>`).join('')}</div>` : ''}
    ${letzte.length ? `<h4>Zuletzt</h4><div class="schnellwahl">${letzte.map(e => `<button class="klein" data-a="tb-kopie" data-v="${esc(e.id)}">${esc(kurztitel(e.titel))} · ${mengeText(e)}</button>`).join('')}</div>` : ''}`;
}
function eintragKopie(e, datum, slot) { const n = JSON.parse(JSON.stringify(e)); n.id = uid('mz'); n.datum = datum; n.zeit = new Date().toTimeString().slice(0, 5); n.mahlzeit = slot || eintragSlot(e); delete n.kochprotokoll; if (n.quelle === 'restportion') n.quelle = 'kopie'; return n; }

/* ---------- Mikronährstoffe mit Referenzwerten (DGE/ÖGE) und EFSA-Höchstmengen ---------- */
function refPerson() { const p = D.einstellungen.person || {}; return p.alter >= 19 && (p.geschlecht === 'm' || p.geschlecht === 'w') && !p.besonders ? p : null; }
const einheitFaktor = (von, nach) => von === nach ? 1 : von === 'mg' && nach === 'µg' ? 1000 : von === 'µg' && nach === 'mg' ? 0.001 : null;
function refWert(k, p) {
  const r = K.referenz && K.referenz.referenz && K.referenz.referenz[k]; if (!r || !p || !K.naehrstoffe[k]) return null;
  const f = einheitFaktor(r.einheit, K.naehrstoffe[k].einheit); if (f == null) return null;
  const passend = (r.werte || []).filter(w => w.geschlecht === p.geschlecht && p.alter >= w.alter_von && p.alter < w.alter_bis); if (!passend.length) return null;
  const werte = passend.map(w => Math.round(w.wert * f * 100) / 100);
  return { min: Math.min(...werte), max: Math.max(...werte), art: r.art, hinweis: r.hinweis, mehrere: werte.length > 1 };
}
function obergrenzeWert(k) { const o = K.referenz && K.referenz.obergrenze && K.referenz.obergrenze[k]; if (!o || !K.naehrstoffe[k]) return null; const f = einheitFaktor(o.einheit, K.naehrstoffe[k].einheit); return f == null ? null : Object.assign({}, o, { wertApp: o.wert * f }); }
function mikroTrend(tag) {
  const tage = [...Array(7)].map((_, i) => plusTage(tag, i - 6)).filter(t => ((D.tage || {})[t] || {}).vollstaendig && D.tagebuch.some(e => e.datum === t));
  if (tage.length < 3) return { n: tage.length, werte: null };
  const werte = {}; Object.keys(K.naehrstoffe || {}).forEach(k => { const je = tage.map(t => tagMikro(t).erg[k]); werte[k] = { w: je.reduce((s, x) => s + x.w, 0) / tage.length, unvollstaendig: je.some(x => x.ohne || x.abdeckung < 100) }; });
  return { n: tage.length, werte };
}
function mikroHtml(tag) {
  const mk = tagMikro(tag); const p = refPerson(); const tr = mikroTrend(tag); const fmt = (w, k) => zahlDE(w, w < 10 ? 1 : 0) + ' ' + esc(K.naehrstoffe[k].einheit);
  const ARTEN = { empfehlung: 'Empfehlung', schaetzwert: 'Schätzwert', richtwert: 'Richtwert' };
  if (!mk.n) return '<p class="leise">Noch keine Einträge an diesem Tag.</p>';
  const zeilen = Object.entries(mk.erg).filter(([k]) => k !== 'gesfs').map(([k, v]) => {
    const r = refWert(k, p); const o = obergrenzeWert(k); const mind = v.ohne || v.abdeckung < 100;
    const anteil = r && v.mit ? Math.round(v.w / r.max * 100) : null;   // bei zwei Werten gegen den höheren – nichts schönrechnen
    const ueber = o && v.mit && o.gilt_fuer === 'gesamtzufuhr' && v.w > o.wertApp;
    return `<tr><td>${esc(K.naehrstoffe[k].name)}</td>
      <td>${v.mit ? (mind ? 'mind. ' : '') + fmt(v.w, k) : 'unbekannt'}<br><span class="leise">${v.mit}/${v.mit + v.ohne} Einträge${v.mit ? ' · ' + v.abdeckung + ' %' : ''}</span></td>
      <td>${r ? `${r.mehrere ? zahlDE(r.min, 1) + '–' : ''}${fmt(r.max, k)}<br><span class="leise">${esc(ARTEN[r.art] || r.art)}</span>` : '<span class="leise">–</span>'}</td>
      <td>${anteil != null ? `<span class="spur mini"><i style="width:${Math.min(100, anteil)}%"></i></span>${mind ? 'mind. ' : ''}${anteil} %` : '<span class="leise">–</span>'}${ueber ? '<br><span class="chip warn">über EFSA-Höchstmenge laut Protokoll</span>' : ''}</td>
      <td>${tr.werte ? (tr.werte[k].unvollstaendig ? 'mind. ' : '') + fmt(tr.werte[k].w, k) : '<span class="leise">–</span>'}</td></tr>`;
  }).join('');
  return `<p class="leise klein"><b>Schätzung</b> aus allgemeinen BLS-Werten der Zutaten (meist Rohzustand) – Verluste beim Garen sind nicht eingerechnet, eigene Produkte ohne Angaben fehlen. Unbekannt ist nicht 0.</p>
    ${p ? '' : '<p class="hinweis klein">Für passende Referenzwerte bitte Alter (ab 19) und Geschlecht im <a href="#/einrichtung/1">Profil</a> eintragen. Bei Schwangerschaft, Stillzeit oder Erkrankungen zeigt die App keine Referenzwerte.</p>'}
    <div class="tabelle-wrap"><table class="mikro"><thead><tr><th>Nährstoff</th><th>Heute protokolliert</th><th>Referenz pro Tag</th><th>Anteil</th><th>Ø vollständige Tage</th></tr></thead><tbody>${zeilen}</tbody></table></div>
    <p class="leise klein">${tr.werte ? `Durchschnitt über ${tr.n} als vollständig markierte Tage der letzten Woche.` : `Durchschnitt erst ab 3 als vollständig markierten Tagen (bisher ${tr.n}).`}
    Referenzwerte: DGE/ÖGE (2025) für gesunde Erwachsene nach Alter und Geschlecht – sie gelten für Bevölkerungsgruppen, der Bedarf einzelner Menschen liegt meist darunter. <b>Eine niedrige protokollierte Zufuhr ist keine Diagnose eines Mangels</b>, und die App empfiehlt keine Nahrungsergänzung. Vitamin D: Schätzwert für fehlende Eigensynthese; über Lebensmittel kommen laut DGE nur wenige µg. Zink: Wert bei mittlerer Phytatzufuhr. Eisen bei Frauen 25–64: je nach Menopause 14–16 mg. Höchstmengen (EFSA) werden nur verglichen, wo sie für die Gesamtzufuhr gelten; bei Magnesium, Folsäure und Niacin betreffen sie nur Nahrungsergänzungen, bei Vitamin A nur vorgeformtes Vitamin A.</p>`;
}

/* ---------- Produktdatenbank ---------- */
const PRODUKT_QUELLEN = [['etikett', 'Etikett (selbst abgelesen)'], ['hersteller', 'Hersteller-Website'], ['openfoodfacts', 'Open Food Facts (Community-Daten)'], ['schaetzung', 'eigene Schätzung']];
const PRODUKT_NAEHR = [['kcal', 'Energie kcal'], ['fett', 'Fett g'], ['gesfs', 'davon gesättigte Fettsäuren g'], ['kh', 'Kohlenhydrate g'], ['zucker', 'davon Zucker g'], ['ballaststoffe', 'Ballaststoffe g'], ['protein', 'Eiweiß g'], ['salz', 'Salz g']];
function gtinPruefziffer(g) {   // GS1-Prüfziffer (EAN-8/12/13/14)
  if (!/^\d{8}$|^\d{12,14}$/.test(g)) return false;
  const z = g.split('').map(Number); const pz = z.pop(); const s = z.reverse().reduce((a, d, i) => a + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - s % 10) % 10 === pz;
}
let produktEdit = null;
function vProdukte(id) {
  const l = D.lebensmittel || [];
  if (id === 'neu' || (id && l.some(p => p.id === id))) return produktFormular(id === 'neu' ? null : l.find(p => p.id === id));
  const mz = D.mahlzeiten || [];
  return `<div class="seitenkopf"><h1>Produkte</h1><a class="knopf haupt klein" href="#/produkte/neu">${ico('plus', 'klein')} Produkt</a></div>
  <p class="unterzeile">Deine Markenprodukte mit Etikettwerten – getrennt von den allgemeinen BLS-Werten der Zutaten. Bleibt nur in diesem Profil auf diesem Gerät.</p>
  ${l.length ? `<ul class="eintraege">${l.map(p => `<li><span><b><a href="#/produkte/${esc(p.id)}">${esc(p.name)}</a></b>${p.marke ? ' · ' + esc(p.marke) : ''}${p.variante ? ' · ' + esc(p.variante) : ''}<br><span class="leise klein">${p.gtin ? 'GTIN ' + esc(p.gtin) + ' · ' : ''}${p.naehr.kcal != null ? zahlDE(p.naehr.kcal) + ' kcal je ' + (p.bezug === '100ml' ? '100 ml' : '100 g') : 'kcal unbekannt'} · ${esc((PRODUKT_QUELLEN.find(q => q[0] === p.quelle_art) || [, p.quelle || 'Quelle offen'])[1])}${p.quelle_datum ? ' (' + esc(datumDE(p.quelle_datum)) + ')' : ''} · Version ${esc(p.version || 1)}</span></span>
    <span>${p.pruefstatus === 'bestaetigt' ? '<span class="chip gut">Etikett bestätigt</span>' : '<span class="chip warn">ungeprüft</span>'}</span></li>`).join('')}</ul>`
    : `<div class="leer">${ico('leer')}Noch keine Produkte.<br><span class="klein">Lege ein Produkt mit den Werten vom Etikett an – das dauert einmal etwa eine Minute.</span></div>`}
  <h2>Eigene Mahlzeiten</h2>
  ${mz.length ? `<ul class="eintraege">${mz.map(m => `<li><span><b>${esc(m.name)}</b><br><span class="leise klein">${esc(m.eintraege.map(e => kurztitel(e.titel)).join(', '))} · ${zahlDE(m.eintraege.reduce((s, e) => s + (e.naehr && e.naehr.kcal || 0), 0))} kcal</span></span><span><button class="still klein" data-a="tb-mz-weg" data-v="${esc(m.id)}">löschen</button></span></li>`).join('')}</ul>` : '<p class="leise klein">Im Tagebuch bei einer Mahlzeit „als eigene Mahlzeit“ wählen – dann buchst du sie künftig mit einer Berührung.</p>'}`;
}
function produktFormular(p) {
  const v = p || { naehr: {}, allergene: [], bezug: '100g', pruefstatus: 'ungeprueft', quelle_art: 'etikett', quelle_datum: heute() };
  const n = (k, lab) => `<label class="feld"><span>${lab}</span><input type="number" name="n_${k}" min="0" step="any" inputmode="decimal" value="${esc(v.naehr[k] ?? '')}" style="width:6.5em"></label>`;
  const t = (k, lab, extra = '') => `<label class="feld" style="flex:1 1 160px"><span>${lab}</span><input name="${k}" value="${esc(v[k] ?? '')}" ${extra}></label>`;
  return `<p class="klein"><a class="knopf still klein" href="#/produkte">${ico('zurueck', 'klein')} Produkte</a></p>
  <h1>${p ? 'Produkt bearbeiten' : 'Neues Produkt'}</h1>
  ${p && (p.versionen || []).length ? `<p class="leise klein">Version ${esc(p.version)} · ${p.versionen.length} frühere Version(en) gespeichert. Bereits gebuchte Mahlzeiten behalten ihre damaligen Werte.</p>` : ''}
  <form id="produkt-form" data-id="${esc(p ? p.id : '')}">
    <fieldset><legend>Produkt</legend><div class="zeile">${t('name', 'Name', 'required')}${t('marke', 'Marke')}${t('variante', 'Variante / Sorte')}${t('haendler', 'Händler')}</div>
      <div class="zeile"><label class="feld"><span>Barcode (GTIN)</span><input name="gtin" value="${esc(v.gtin || '')}" inputmode="numeric" placeholder="8 oder 13 Ziffern" style="width:11em"></label>
        <label class="feld"><span>Nettofüllmenge</span><input name="packung" type="number" min="0" step="any" inputmode="decimal" value="${esc(v.packung ?? '')}" style="width:6em"></label>
        <label class="feld"><span>Einheit</span><select name="packung_einheit">${['g', 'ml', 'Stück'].map(x => `<option ${v.packung_einheit === x ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
        <label class="feld"><span>Abtropfgewicht g</span><input name="abtropf" type="number" min="0" step="any" inputmode="decimal" value="${esc(v.abtropf ?? '')}" style="width:6em"></label>
        <label class="feld"><span>übliche Portion</span><input name="portion" type="number" min="0" step="any" inputmode="decimal" value="${esc(v.portion ?? '')}" style="width:6em"></label></div>
      <p class="leise klein" id="gtin-info"></p>
      <p class="klein"><button type="button" class="klein" data-a="off-suche">Bei Open Food Facts nachsehen</button> <span class="leise">Sendet nur die Barcode-Nummer an die freie Datenbank Open Food Facts. Die Werte dort pflegen Freiwillige – sie werden als <b>ungeprüft</b> übernommen; bitte mit dem Etikett vergleichen.</span></p>
      <div id="off-ergebnis" role="status" aria-live="polite"></div></fieldset>
    <fieldset><legend>Nährwerte laut Quelle</legend>
      <div class="zeile"><label class="feld"><span>Bezugsbasis</span><select name="bezug"><option value="100g" ${v.bezug !== '100ml' ? 'selected' : ''}>je 100 g</option><option value="100ml" ${v.bezug === '100ml' ? 'selected' : ''}>je 100 ml</option></select></label>
        <label class="feld"><span>bezogen auf</span><select name="bezug_zustand">${[['verzehrfertig', 'wie verkauft / verzehrfertig'], ['abgetropft', 'abgetropft'], ['zubereitet', 'zubereitet laut Packung']].map(([k, n2]) => `<option value="${k}" ${v.bezug_zustand === k ? 'selected' : ''}>${n2}</option>`).join('')}</select></label></div>
      <div class="zeile">${PRODUKT_NAEHR.map(([k, lab]) => n(k, lab)).join('')}</div>
      <p class="leise klein">Leere Felder bleiben <b>unbekannt</b> (nicht 0). Mikronährstoffe stehen meist nicht auf dem Etikett und bleiben dann unbekannt – es werden keine allgemeinen Werte eingesetzt.</p></fieldset>
    <fieldset><legend>Zutaten und Allergene</legend>
      <label class="feld"><span>Zutatenliste (optional, vom Etikett)</span><textarea name="zutaten" rows="3">${esc(v.zutaten || '')}</textarea></label>
      <div class="wahl">${ALLERGENE.map(([k, n2]) => `<label><input type="checkbox" name="allergen" value="${k}" ${(v.allergene || []).includes(k) ? 'checked' : ''}><span>${esc(n2)}</span></label>`).join('')}</div>
      <label class="feld"><span>„Kann Spuren enthalten von …“ (optional)</span><input name="spuren" value="${esc(v.spuren || '')}"></label></fieldset>
    <fieldset><legend>Herkunft der Angaben</legend><div class="zeile">
      <label class="feld"><span>Quelle</span><select name="quelle_art">${PRODUKT_QUELLEN.map(([k, n2]) => `<option value="${k}" ${v.quelle_art === k ? 'selected' : ''}>${n2}</option>`).join('')}</select></label>
      <label class="feld"><span>Datum</span><input type="date" name="quelle_datum" value="${esc(v.quelle_datum || heute())}"></label>
      <label class="feld"><span>Prüfstatus</span><select name="pruefstatus"><option value="ungeprueft" ${v.pruefstatus !== 'bestaetigt' ? 'selected' : ''}>ungeprüft</option><option value="bestaetigt" ${v.pruefstatus === 'bestaetigt' ? 'selected' : ''}>mit Etikett verglichen</option></select></label></div></fieldset>
    <div class="knopfreihe"><button class="haupt" type="submit">Speichern</button>${p ? `<button class="still" type="button" data-a="produkt-weg" data-v="${esc(p.id)}">Produkt entfernen</button>` : ''}</div>
    <p class="leise klein">Ein Barcode identifiziert nur das Produkt – Nährwerte trägst du vom Etikett ein. Ändern sich Rezeptur oder Etikett, speichere einfach neu: die alte Version bleibt erhalten.</p>
  </form>`;
}
vProdukte.danach = () => {
  const f = $('#produkt-form'); if (!f) return;
  const gi = () => { const g = f.gtin.value.trim(); const el = $('#gtin-info'); if (!el) return; if (!g) { el.textContent = ''; return; }
    const dup = (D.lebensmittel || []).find(p => p.gtin === g && p.id !== f.dataset.id);
    el.textContent = (gtinPruefziffer(g) ? 'Prüfziffer stimmt.' : 'Prüfziffer stimmt nicht – bitte Nummer prüfen.') + (dup ? ` Achtung: Diese GTIN ist schon bei „${dup.name}“ gespeichert.` : ''); };
  f.gtin.addEventListener('input', gi); gi();
  f.addEventListener('submit', ev => { ev.preventDefault();
    const zahl = k => f[k].value === '' ? null : Number(f[k].value);
    const neu = { name: f.name.value.trim(), marke: f.marke.value.trim() || null, variante: f.variante.value.trim() || null, haendler: f.haendler.value.trim() || null, gtin: f.gtin.value.trim() || null,
      packung: zahl('packung'), packung_einheit: f.packung_einheit.value, abtropf: zahl('abtropf'), portion: zahl('portion'), bezug: f.bezug.value, bezug_zustand: f.bezug_zustand.value,
      naehr: Object.fromEntries(PRODUKT_NAEHR.map(([k]) => [k, zahl('n_' + k)])), zutaten: f.zutaten.value.trim() || null, allergene: [...f.querySelectorAll('input[name=allergen]:checked')].map(x => x.value), spuren: f.spuren.value.trim() || null,
      quelle_art: f.quelle_art.value, quelle: (PRODUKT_QUELLEN.find(q => q[0] === f.quelle_art.value) || [])[1], quelle_datum: f.quelle_datum.value || heute(), pruefstatus: f.pruefstatus.value };
    if (!neu.name) { toast('Bitte einen Namen eingeben'); return; }
    const id = f.dataset.id;
    aendere('Produkt gespeichert', d => { d.lebensmittel = d.lebensmittel || [];
      const alt = id ? d.lebensmittel.find(p => p.id === id) : null;
      if (alt) { const kopie = JSON.parse(JSON.stringify(alt)); delete kopie.versionen; alt.versionen = [...(alt.versionen || []), Object.assign(kopie, { ersetzt_am: heute() })]; Object.assign(alt, neu, { version: (alt.version || 1) + 1, geaendert: heute() }); }
      else d.lebensmittel.push(Object.assign({ id: uid('lm'), version: 1, erfasst: heute() }, neu)); }, { neuZeichnen: false });
    location.hash = '#/produkte'; });
};

/* Open Food Facts: nur auf Knopfdruck, nur die GTIN wird gesendet; Ergebnis bleibt „ungeprüft“ */
const OFF_ALLERGENE = { 'en:gluten': 'gluten', 'en:crustaceans': 'krebstiere', 'en:eggs': 'ei', 'en:fish': 'fisch', 'en:peanuts': 'erdnuss', 'en:soybeans': 'soja', 'en:milk': 'milch', 'en:nuts': 'schalenfruechte', 'en:celery': 'sellerie', 'en:mustard': 'senf', 'en:sesame-seeds': 'sesam', 'en:sulphur-dioxide-and-sulphites': 'sulfite', 'en:lupin': 'lupinen', 'en:molluscs': 'weichtiere' };
let offTreffer = null;
async function offSuchen() {
  const f = $('#produkt-form'); const el = $('#off-ergebnis'); const g = f.gtin.value.trim();
  if (!gtinPruefziffer(g)) { el.innerHTML = '<p class="hinweis warn klein">Bitte zuerst eine gültige GTIN eingeben.</p>'; return; }
  if (!navigator.onLine) { el.innerHTML = '<p class="hinweis klein">Offline – die Abfrage braucht eine Internetverbindung. Manuelle Eingabe geht immer.</p>'; return; }
  el.innerHTML = '<p class="leise klein">Frage Open Food Facts …</p>';
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(g)}.json?fields=product_name,product_name_de,brands,quantity,product_quantity,nutriments,nutrition_data_per,allergens_tags,ingredients_text_de,ingredients_text,last_modified_t`, { cache: 'no-store' });
    const j = await r.json();
    if (!j || j.status !== 1 || !j.product) { offTreffer = null; el.innerHTML = '<p class="hinweis klein">Kein Eintrag zu dieser Nummer gefunden. Bitte die Werte vom Etikett eintragen.</p>'; return; }
    const p = j.product, n = p.nutriments || {};
    const w = k => n[k] == null || n[k] === '' ? null : Math.round(Number(n[k]) * 10) / 10;
    offTreffer = { name: p.product_name_de || p.product_name || '', marke: (p.brands || '').split(',')[0].trim(), packung: p.product_quantity ? Number(p.product_quantity) : null, zutaten: p.ingredients_text_de || p.ingredients_text || '',
      allergene: (p.allergens_tags || []).map(t => OFF_ALLERGENE[t]).filter(Boolean),
      naehr: { kcal: w('energy-kcal_100g'), fett: w('fat_100g'), gesfs: w('saturated-fat_100g'), kh: w('carbohydrates_100g'), zucker: w('sugars_100g'), ballaststoffe: w('fiber_100g'), protein: w('proteins_100g'), salz: w('salt_100g') },
      stand: p.last_modified_t ? new Date(p.last_modified_t * 1000).toISOString().slice(0, 10) : null, je100: !p.nutrition_data_per || p.nutrition_data_per === '100g' };
    const t = offTreffer;
    el.innerHTML = `<div class="hinweis klein"><b>Treffer bei Open Food Facts</b> (Community-Daten${t.stand ? ', zuletzt geändert ' + esc(datumDE(t.stand)) : ''}, ungeprüft):<br>${esc(t.name || 'ohne Namen')}${t.marke ? ' · ' + esc(t.marke) : ''}${p.quantity ? ' · ' + esc(p.quantity) : ''}<br>
      je 100 g/ml: ${PRODUKT_NAEHR.map(([k, lab]) => `${esc(lab.replace(/ (g|kcal)$/, ''))} ${t.naehr[k] == null ? '?' : zahlDE(t.naehr[k], 1)}`).join(' · ')}${t.je100 ? '' : '<br><b>Achtung:</b> Werte dort sind je Portion angegeben – nicht übernommen.'}
      ${t.allergene.length ? `<br>Allergene laut Eintrag: ${esc(t.allergene.map(a => ALLERGEN_NAME[a] || a).join(', '))}` : ''}
      <br><button type="button" class="klein" data-a="off-uebernehmen" ${t.je100 ? '' : 'disabled'}>In das Formular übernehmen (als ungeprüft)</button></div>`;
  } catch (e) { el.innerHTML = '<p class="hinweis warn klein">Abfrage fehlgeschlagen. Bitte die Werte vom Etikett eintragen.</p>'; }
}
function offUebernehmen() {
  const f = $('#produkt-form'); const t = offTreffer; if (!f || !t) return;
  if (t.name && !f.name.value) f.name.value = t.name; if (t.marke && !f.marke.value) f.marke.value = t.marke; if (t.packung && !f.packung.value) f.packung.value = t.packung; if (t.zutaten && !f.zutaten.value) f.zutaten.value = t.zutaten;
  PRODUKT_NAEHR.forEach(([k]) => { if (t.naehr[k] != null) f['n_' + k].value = t.naehr[k]; });
  t.allergene.forEach(a => { const c = f.querySelector(`input[name=allergen][value="${a}"]`); if (c) c.checked = true; });
  f.quelle_art.value = 'openfoodfacts'; f.quelle_datum.value = t.stand || heute(); f.pruefstatus.value = 'ungeprueft';
  toast('Übernommen – bitte mit dem Etikett vergleichen und dann ggf. „mit Etikett verglichen“ wählen');
}

/* ---------- Ereignisse ---------- */
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a, v = b.dataset.v;
  switch (a) {
    case 'off-suche': offSuchen(); break;
    case 'off-uebernehmen': offUebernehmen(); break;
    case 'tb-slot': tbSlot = v; route(); break;
    case 'tb-edit': tbEdit = v; route(); break;
    case 'tb-edit-ab': tbEdit = null; route(); break;
    case 'tb-slot-kopie': { const quelle = D.tagebuch.filter(e => e.datum === tbDatum && eintragSlot(e) === v);
      aendere(`${SLOT_NAME[v]} auf heute kopiert (${quelle.length})`, d => { quelle.forEach(e => d.tagebuch.push(eintragKopie(e, heute(), v))); }); break; }
    case 'tb-slot-merken': { const quelle = D.tagebuch.filter(e => e.datum === tbDatum && eintragSlot(e) === v); const name = (prompt('Name der Mahlzeit (z. B. „Mein Frühstück“):', SLOT_NAME[v]) || '').trim(); if (!name) return;
      aendere('Eigene Mahlzeit gespeichert', d => { (d.mahlzeiten = d.mahlzeiten || []).push({ id: uid('mzv'), name: name.slice(0, 40), slot: v, eintraege: quelle.map(e => { const n = JSON.parse(JSON.stringify(e)); delete n.id; delete n.datum; delete n.kochprotokoll; return n; }), erstellt: heute() }); }); break; }
    case 'tb-mz-buchen': { const m = (D.mahlzeiten || []).find(x => x.id === v); if (!m) return; const slot = tbSlot || m.slot;
      aendere(`${m.name} eingetragen (${m.eintraege.length} Teile)`, d => { m.eintraege.forEach(e => d.tagebuch.push(eintragKopie(e, tbDatum || heute(), slot))); }); break; }
    case 'tb-mz-weg': { const m = (D.mahlzeiten || []).find(x => x.id === v); if (!m || !confirm(`Eigene Mahlzeit „${m.name}“ löschen? Gebuchte Einträge bleiben.`)) return; aendere('Eigene Mahlzeit gelöscht', d => { d.mahlzeiten = d.mahlzeiten.filter(x => x.id !== v); }); break; }
    case 'produkt-weg': { const p = (D.lebensmittel || []).find(x => x.id === v); if (!p || !confirm(`„${p.name}“ aus deinen Produkten entfernen? Gebuchte Einträge behalten ihre Werte; Rückgängig ist möglich.`)) return; aendere('Produkt entfernt', d => { d.lebensmittel = d.lebensmittel.filter(x => x.id !== v); }, { neuZeichnen: false }); location.hash = '#/produkte'; break; }
  }
});
document.addEventListener('submit', ev => {
  const f = ev.target; if (!f.dataset || !f.dataset.tbEdit) return; ev.preventDefault();
  const id = f.dataset.tbEdit; const menge = Number(String(f.menge.value).replace(',', '.'));
  if (!(menge > 0)) { toast('Bitte eine Menge größer als 0 eingeben'); return; }
  tbEdit = null;
  aendere('Eintrag geändert', d => { const e = d.tagebuch.find(x => x.id === id); if (!e) return; const istPortion = e.einheit === 'Portion' || !e.einheit; const alt = istPortion ? (e.portionen || 1) : (e.gramm || 100);
    eintragSkalieren(e, menge / alt); if (istPortion) e.portionen = menge; else e.gramm = menge; e.mahlzeit = f.slot.value; if (f.zeit.value) e.zeit = f.zeit.value; e.bearbeitet = new Date().toISOString(); });
});
