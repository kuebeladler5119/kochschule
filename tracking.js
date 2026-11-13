/* Fitomat-Build 202611131313 */
/* Kochschule – Tagebuch-Erweiterungen: Mahlzeiten, eigene Mahlzeiten, Bearbeiten, Produktdatenbank.
   Wird nach rezepte.js und vor app.js geladen. Alle Daten liegen nur im lokalen Profil. */

/* ---------- Schutz vor Doppelbuchungen: dieselbe Aktion innerhalb von 0,8 s nur einmal ---------- */
const BUCHUNGS_AKTIONEN = new Set(['tb-rezept', 'tb-lm', 'tb-eigen', 'tb-kopie', 'tb-mz-buchen', 'tb-slot-kopie', 'rest-essen', 'auswahl-toggle', 'pd-auswahl', 'pd-menue', 'tr-start', 'tr-satz-add', 'einkauf-bestaetigen', 'anp-ok', 'tr-ende', 'tb-korb-add', 'tb-korb-buchen']);
let letzteAktion = { schluessel: '', zeit: 0 };
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-a]'); if (!b || !BUCHUNGS_AKTIONEN.has(b.dataset.a)) return;
  const k = b.dataset.a + '|' + (b.dataset.v || '') + '|' + (b.dataset.p || '') + '|' + (b.dataset.u || '');
  const jetzt = Date.now();
  if (letzteAktion.schluessel === k && jetzt - letzteAktion.zeit < 800) { ev.stopImmediatePropagation(); ev.preventDefault(); return; }
  letzteAktion = { schluessel: k, zeit: jetzt };
}, true);

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
      <span class="knopfreihe" style="margin:0">${tag !== heute() ? `<button class="still klein" data-a="tb-kopie-vorschau" data-v="${k}">kopieren …</button>` : ''}<button class="still klein" data-a="tb-slot-merken" data-v="${k}">als eigene Mahlzeit</button></span></div>
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
      ${e.naehr ? `<span>P ${zahlDE(e.naehr.protein, 1)} · KH ${zahlDE(e.naehr.kh, 1)} · F ${zahlDE(e.naehr.fett, 1)}</span>` : ''}${e.status === 'unvollstaendig' ? '<span class="chip warn">unvollständig</span>' : ''}${e.quelle === 'restportion' ? '<span class="chip">Restportion</span>' : ''}${e.produkt_pruefstatus === 'ungeprueft' ? '<span class="chip warn">Produktwerte ungeprüft</span>' : /^katalog-(wahrscheinlich|naeherung)$/.test(e.produkt_pruefstatus || '') ? '<span class="chip warn">Variante nicht bestätigt</span>' : ''}
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
// Kopie eines Eintrags: Restportions-Verknüpfung entfällt, damit Ändern/Löschen der Kopie keine Restportion verändert
function eintragKopie(e, datum, slot) { const n = JSON.parse(JSON.stringify(e)); n.id = uid('mz'); n.datum = datum; n.zeit = new Date().toTimeString().slice(0, 5); n.mahlzeit = slot || eintragSlot(e); delete n.kochprotokoll; delete n.restportion; if (n.quelle === 'restportion') n.quelle = 'kopie'; return n; }

/* Meine Standardprodukte: angeheftete Lebensmittel/Produkte mit bevorzugter Menge – ein Tipp legt sie auf die Sammelliste, gebucht wird erst mit „Alle eintragen“ */
function standardFuer(typ, id) { return (D.standardprodukte || []).find(s => s.typ === typ && s.id === id); }
function standardKnopf(typ, id) { const s = standardFuer(typ, id); return `<button class="klein still" data-a="${s ? 'tb-standard-weg' : 'tb-standard-merken'}" data-t="${typ}" data-v="${esc(id)}" aria-label="${s ? 'Aus Standardprodukten entfernen' : 'Als Standardprodukt merken'}" title="${s ? 'Standardprodukt – entfernen' : 'Als Standardprodukt merken (mit dieser Menge)'}">${s ? '★' : '☆'}</button>`; }
function korbEintragDaten(typ, id) {
  if (typ === 'rezept') { const r = R[id]; return r ? { name: kurztitel(r.titel), einheit: 'Portion(en)' } : null; }
  if (typ === 'lm') { const z = Z[id]; return z ? { name: z.name, einheit: istFluessig(z) ? 'ml' : 'g' } : null; }
  if (typ === 'marke') { const p = PRODUKT(id); return p ? { name: markeName(p), einheit: p.bezug === '100ml' ? 'ml' : 'g' } : null; }
  const l = (D.lebensmittel || []).find(x => x.id === id); return l ? { name: l.name, einheit: l.bezug === '100ml' ? 'ml' : 'g' } : null;
}
function standardListeHtml() {
  const l = (D.standardprodukte || []).map(s => Object.assign({}, s, korbEintragDaten(s.typ, s.id) || {})).filter(s => s.name);
  if (!l.length) return '';
  return `<h4>Meine Standardprodukte</h4><div class="schnellwahl">${l.map(s => `<button class="klein" data-a="tb-standard-liste" data-t="${s.typ}" data-v="${esc(s.id)}" title="Auf die Sammelliste – Menge dort änderbar">★ ${esc(kurztitel(s.name))} · ${zahlDE(s.menge)} ${esc(s.einheit)}</button>`).join('')}</div><p class="leise klein" style="margin-top:2px">Tippen legt das Produkt mit deiner üblichen Menge auf die Sammelliste – eingetragen wird erst mit „Alle eintragen“.</p>`;
}
// Nährwerte eines Sammellisten-Postens (Vorschau, identisch zur späteren Buchung)
function korbEintragBerechnen(k) {
  if (k.typ === 'rezept' && R[k.id]) return rezeptEintrag(R[k.id], k.menge);
  if (k.typ === 'lm' && Z[k.id]) return lebensmittelEintrag(Z[k.id], k.menge, k.einheit === 'ml' ? 'ml' : 'g');
  if (k.typ === 'marke' && PRODUKT(k.id)) return markenEintrag(PRODUKT(k.id), k.menge);
  const l = (D.lebensmittel || []).find(x => x.id === k.id); return l ? eigenerEintrag(l, k.menge) : null;
}
/* Sammelliste = Mahlzeiten- und Shake-Baukasten: mehrere Lebensmittel, Produkte oder Rezepte sammeln, Summe sehen, gemeinsam eintragen */
let tbKorb = [];
function korbHtml() {
  if (!tbKorb.length) return '';
  const es = tbKorb.map(korbEintragBerechnen); const sum = k => es.reduce((s, e) => s + (e && e.naehr && e.naehr[k] != null ? e.naehr[k] : 0), 0); const luecke = es.some(e => !e || e.status !== 'vollstaendig');
  return `<div class="flaeche"><h4 style="margin-top:0">Sammelliste (${tbKorb.length}) → ${SLOT_NAME[neuerEintragSlot()]}</h4>
    <ul class="eintraege">${tbKorb.map((k, i) => `<li><span>${esc(k.name)}${es[i] && es[i].naehr && es[i].naehr.kcal != null ? `<br><span class="leise klein">${zahlDE(es[i].naehr.kcal)} kcal · ${zahlDE(es[i].naehr.protein || 0, 1)} g Protein</span>` : ''}</span><span class="zeile" style="gap:6px"><input type="number" min="0.05" step="any" inputmode="decimal" value="${esc(k.menge)}" data-korb="${i}" aria-label="Menge ${esc(k.name)}" style="width:5.5em"> ${esc(k.einheit)}<button class="still klein" data-a="tb-korb-weg" data-v="${i}" aria-label="${esc(k.name)} entfernen">entfernen</button></span></li>`).join('')}</ul>
    <p class="klein" style="margin:.3em 0"><b>Summe:</b> ${zahlDE(sum('kcal'))} kcal · ${zahlDE(sum('protein'), 1)} g Protein · ${zahlDE(sum('kh'), 1)} g KH · ${zahlDE(sum('fett'), 1)} g Fett${luecke ? ' <span class="leise">(nicht alle Werte vollständig)</span>' : ''}</p>
    <p class="leise klein" style="margin:0 0 .4em">Jeder Posten wird einzeln gerechnet – z. B. Whey-Pulver und die Milch zum Anrühren getrennt. Herstellerangaben „zubereitet mit Milch“ werden nicht zusätzlich addiert.</p>
    <span class="knopfreihe"><button class="haupt klein" data-a="tb-korb-buchen">Alle eintragen (${tbKorb.length})</button><button class="klein" data-a="tb-korb-buchen" data-merken="1">Eintragen und als Mahlzeit merken</button><button class="still klein" data-a="tb-korb-leeren">Liste leeren</button></span></div>`;
}
function korbNeuZeichnen() { const k = $('#tb-korb'); if (k) k.innerHTML = korbHtml(); }

/* Tag oder Mahlzeit kopieren – erst Vorschau mit Auswahl, dann bestätigen */
let tbKopieVon = null;   // { slot: '' (ganzer Tag) | Mahlzeit }
function kopierVorschauHtml(ein) {
  if (!tbKopieVon) return '';
  const liste = ein.filter(e => !tbKopieVon.slot || eintragSlot(e) === tbKopieVon.slot); if (!liste.length) return '';
  const ziel = heute(); const schon = D.tagebuch.filter(e => e.datum === ziel).length;
  return `<div class="flaeche"><h4 style="margin-top:0">${tbKopieVon.slot ? SLOT_NAME[tbKopieVon.slot] : 'Ganzen Tag'} kopieren – Vorschau</h4>
    <form id="tb-kopie-form"><label class="feld"><span>Zieltag</span><input type="date" name="ziel" value="${ziel}" max="${heute()}" required></label>
    <ul class="eintraege">${liste.map(e => `<li><label><input type="checkbox" name="e" value="${esc(e.id)}" checked> ${esc(e.titel)} · ${mengeText(e)} · ${SLOT_NAME[eintragSlot(e)]}</label><span class="kcal">${e.naehr && e.naehr.kcal != null ? zahlDE(e.naehr.kcal) + ' kcal' : '? kcal'}</span></li>`).join('')}</ul>
    <p class="leise klein" id="tb-kopie-hinweis">${kopierHinweis(ziel, schon)}</p>
    <p class="leise klein">Kopiert werden die beim Buchen gespeicherten Werte und Mahlzeiten. Restportionen werden dabei nicht erneut abgezogen.</p>
    <span class="knopfreihe"><button class="haupt klein" type="submit">Ausgewählte kopieren</button><button class="still klein" type="button" data-a="tb-kopie-ab">Abbrechen</button></span></form></div>`;
}
function kopierHinweis(ziel, schon) { return schon ? `Am ${ziel === heute() ? 'heutigen Tag' : datumDE(ziel)} ${schon === 1 ? 'steht schon 1 Eintrag – er bleibt' : `stehen schon ${schon} Einträge – sie bleiben`} erhalten, die Kopien kommen dazu.` : `Am ${ziel === heute() ? 'heutigen Tag' : datumDE(ziel)} gibt es noch keine Einträge.`; }

/* ---------- Einkauf: Packungen und Preise aus eigenen Produkten (nur mit Datum, sonst nichts) ---------- */
function packungsInfo(p) {
  if (!p.zutat || !p.menge || !(p.fehlt > 0)) return null;
  const kandidaten = (D.lebensmittel || []).filter(l => l.zutat === p.zutat && l.packung > 0 && l.packung_einheit === p.einheit);
  if (!kandidaten.length) return null;
  const l = kandidaten.sort((a, b) => (b.preis_datum || '').localeCompare(a.preis_datum || ''))[0];
  const n = Math.ceil(p.fehlt / l.packung - 1e-9); const rest = Math.round((n * l.packung - p.fehlt) * 10) / 10;
  return { l, n, rest, kosten: l.preis != null ? Math.round(n * l.preis * 100) / 100 : null };
}
function packungsText(p) {
  const i = packungsInfo(p); if (!i) return '';
  const name = [i.l.marke, i.l.name].filter(Boolean).join(' ');
  return `<br><span class="klein">${i.n} × ${esc(name)} à ${fmtMenge(i.l.packung, i.l.packung_einheit)} ${esc(i.l.packung_einheit)}${i.rest > 0 ? ` · Rest ca. ${fmtMenge(i.rest, i.l.packung_einheit)} ${esc(i.l.packung_einheit)} für den Vorrat` : ''}${i.kosten != null ? ` · ca. ${i.kosten.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € (Preis vom ${esc(datumDE(i.l.preis_datum))}${i.l.haendler ? ', ' + esc(i.l.haendler) : ''})` : ''}</span>`;
}
function einkaufKostenHtml(liste) {
  const mit = liste.map(packungsInfo).filter(i => i && i.kosten != null);
  if (!mit.length) return '<p class="leise klein">Preise: keine hinterlegt. In deinen <a href="#/produkte">Produkten</a> kannst du Packungsgröße und Preis (mit Datum) eintragen – dann rechnet der Einkauf Packungen und ungefähre Kosten.</p>';
  const summe = mit.reduce((s, i) => s + i.kosten, 0);
  return `<p class="klein">Ungefähre Kosten für ${mit.length} von ${liste.length} Posten: <b>${summe.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</b> – aus deinen gespeicherten Preisen (mit Datum), ganze Packungen. Für die übrigen Posten ist kein Preis hinterlegt.</p>`;
}

/* ---------- Mehrtagesauswertung (nur vollständig markierte Tage zählen für Durchschnitte) ---------- */
let tbZeitraum = 30;
function auswertungHtml(tag) {
  const n = tbZeitraum; const tage = [...Array(n)].map((_, i) => plusTage(tag, i - n + 1));
  const mitEintrag = tage.filter(t => D.tagebuch.some(e => e.datum === t)); const voll = mitEintrag.filter(t => ((D.tage || {})[t] || {}).vollstaendig);
  const ziele = aktuelleZiele();
  const zeilen = MAKROS.map(([k, name, einh]) => { const werte = voll.map(t => tagWerte(t)); const unvoll = werte.some(s => s.fehlend[k]);
    const avg = werte.length ? werte.reduce((a, s) => a + s[k], 0) / werte.length : null; const z = ziele && ziele[k] != null && ziele[k] !== '' ? Number(ziele[k]) : null;
    return `<tr><td>${name}</td><td>${avg == null ? '–' : (unvoll ? 'mind. ' : '') + zahlDE(avg, einh === 'kcal' ? 0 : 1) + ' ' + einh}</td><td>${z ? zahlDE(z) + ' ' + einh : '–'}</td><td>${avg != null && z ? (avg >= z ? zahlDE(avg - z, einh === 'kcal' ? 0 : 1) + ' ' + einh + ' über dem Ziel' : zahlDE(z - avg, einh === 'kcal' ? 0 : 1) + ' ' + einh + ' unter dem Ziel') : '–'}</td></tr>`; }).join('');
  return `<div class="filterleiste" role="group" aria-label="Zeitraum">${[7, 14, 30].map(x => `<button class="filterchip" data-a="tb-zeitraum" data-v="${x}" aria-pressed="${n === x}">${x} Tage</button>`).join('')}</div>
    <p class="klein">${mitEintrag.length} von ${n} Tagen mit Einträgen, davon <b>${voll.length}</b> als vollständig markiert. Durchschnitte nur über vollständige Tage${voll.length < 3 ? ' – <b>noch zu wenige für eine aussagekräftige Auswertung</b> (mind. 3)' : ''}.</p>
    ${voll.length ? `<div class="tabelle-wrap"><table class="mikro"><thead><tr><th>Ø pro Tag</th><th>protokolliert</th><th>eingestelltes Ziel</th><th>Abstand</th></tr></thead><tbody>${zeilen}</tbody></table></div>` : ''}
    <p class="leise klein">Schätzwerte aus deinem Protokoll. Für Veränderungen des Körpergewichts zählt der Verlauf über Wochen, nicht einzelne Tage.</p>`;
}

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
  const v = p || Object.assign({ naehr: {}, allergene: [], bezug: '100g', pruefstatus: 'ungeprueft', quelle_art: 'etikett', quelle_datum: heute() }, produktVorbelegung || {});
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
      <div class="zeile"><label class="feld" style="flex:1 1 200px"><span>Entspricht der Zutat (für Einkauf und Vorrat)</span><input name="zutat_name" list="produkt-zutaten" value="${esc(v.zutat && Z[v.zutat] ? Z[v.zutat].name : '')}" placeholder="z. B. Rinderhackfleisch"></label>
        <datalist id="produkt-zutaten">${K.zutaten.map(z => `<option value="${esc(z.name)}">`).join('')}</datalist>
        <label class="feld"><span>Preis je Packung (€)</span><input name="preis" type="number" min="0" step="0.01" inputmode="decimal" value="${esc(v.preis ?? '')}" style="width:6em"></label>
        <label class="feld"><span>Preis vom</span><input name="preis_datum" type="date" value="${esc(v.preis_datum || '')}"></label></div>
      <p class="leise klein">Preis bitte vom Kassenbon oder Regal – mit Datum. Die App rechnet daraus nur Packungen und ungefähre Kosten im Einkauf; Preise ändern sich.</p>
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
    <fieldset><legend>Etikettfoto (optional)</legend>
      <label class="feld"><span>Foto vom Etikett als Beleg</span><input type="file" id="etikett-foto" accept="image/*" capture="environment"></label>
      <div id="etikett-vorschau">${v.etikett_foto ? `<img src="${esc(v.etikett_foto)}" alt="Etikettfoto" class="etikett-bild">` : ''}</div>
      <p class="leise klein">Nur ein Beleg auf diesem Gerät: Das Foto wird verkleinert gespeichert, nicht ausgelesen und nirgends hochgeladen. Die Werte oben trägst du selbst ein. ${v.etikett_foto ? '<button type="button" class="klein still" data-a="etikett-weg">Foto entfernen</button>' : ''}</p></fieldset>
    <div class="knopfreihe"><button class="haupt" type="submit">Speichern</button>${p ? `<button class="still" type="button" data-a="produkt-weg" data-v="${esc(p.id)}">Produkt entfernen</button>` : ''}</div>
    <p class="leise klein">Ein Barcode identifiziert nur das Produkt – Nährwerte trägst du vom Etikett ein. Ändern sich Rezeptur oder Etikett, speichere einfach neu: die alte Version bleibt erhalten.</p>
  </form>`;
}
let etikettFoto;   // undefined = unverändert, null = entfernen, Text = neues Foto (verkleinert)
vProdukte.danach = () => {
  const f = $('#produkt-form'); if (!f) return; produktVorbelegung = null; etikettFoto = undefined;
  const fi = $('#etikett-foto'); if (fi) fi.addEventListener('change', () => { const datei = fi.files && fi.files[0]; if (!datei) return; const url = URL.createObjectURL(datei); const img = new Image();
    img.onload = () => { const s = Math.min(1, 700 / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); etikettFoto = c.toDataURL('image/jpeg', 0.6); URL.revokeObjectURL(url); const vs = $('#etikett-vorschau'); if (vs) vs.innerHTML = `<img src="${etikettFoto}" alt="Etikettfoto" class="etikett-bild">`; };
    img.onerror = () => toast('Foto konnte nicht gelesen werden'); img.src = url; });
  const gi = () => { const g = f.gtin.value.trim(); const el = $('#gtin-info'); if (!el) return; if (!g) { el.textContent = ''; return; }
    const dup = (D.lebensmittel || []).find(p => p.gtin === g && p.id !== f.dataset.id);
    el.textContent = (gtinPruefziffer(g) ? 'Prüfziffer stimmt.' : 'Prüfziffer stimmt nicht – bitte Nummer prüfen.') + (dup ? ` Achtung: Diese GTIN ist schon bei „${dup.name}“ gespeichert.` : ''); };
  f.gtin.addEventListener('input', gi); gi();
  f.addEventListener('submit', ev => { ev.preventDefault();
    const zahl = k => f[k].value === '' ? null : Number(f[k].value);
    const neu = { name: f.name.value.trim(), marke: f.marke.value.trim() || null, variante: f.variante.value.trim() || null, haendler: f.haendler.value.trim() || null, gtin: f.gtin.value.trim() || null,
      packung: zahl('packung'), packung_einheit: f.packung_einheit.value, abtropf: zahl('abtropf'), portion: zahl('portion'), bezug: f.bezug.value, bezug_zustand: f.bezug_zustand.value,
      naehr: Object.fromEntries(PRODUKT_NAEHR.map(([k]) => [k, zahl('n_' + k)])), zutaten: f.zutaten.value.trim() || null, allergene: [...f.querySelectorAll('input[name=allergen]:checked')].map(x => x.value), spuren: f.spuren.value.trim() || null,
      quelle_art: f.quelle_art.value, quelle: (PRODUKT_QUELLEN.find(q => q[0] === f.quelle_art.value) || [])[1], quelle_datum: f.quelle_datum.value || heute(), pruefstatus: f.pruefstatus.value,
      zutat: (K.zutaten.find(z => z.name.toLowerCase() === f.zutat_name.value.trim().toLowerCase()) || {}).id || null, preis: zahl('preis'), preis_datum: f.preis_datum.value || null };
    if (f.zutat_name.value.trim() && !neu.zutat) { toast('Zutat nicht gefunden – bitte einen Namen aus der Liste wählen oder das Feld leeren'); return; }
    if (neu.preis != null && !neu.preis_datum) neu.preis_datum = heute();
    if (etikettFoto !== undefined) neu.etikett_foto = etikettFoto;
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
  el.innerHTML = '<p class="leise klein" role="status">Frage Open Food Facts … (höchstens 12 s)</p>';
  const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(g)}.json?fields=product_name,product_name_de,brands,quantity,product_quantity,nutriments,nutrition_data_per,allergens_tags,ingredients_text_de,ingredients_text,last_modified_t`, { cache: 'no-store', signal: ctrl.signal });
    clearTimeout(to);
    if (r.status !== 404 && !r.ok) throw new Error('HTTP ' + r.status);
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
  } catch (e) { clearTimeout(to); el.innerHTML = `<p class="hinweis warn klein">Abfrage fehlgeschlagen (${e.name === 'AbortError' ? 'keine Antwort nach 12 s' : esc(e.message || 'Verbindung')}). <button type="button" class="klein" data-a="off-suche">Erneut versuchen</button> Oder die Werte vom Etikett eintragen.</p>`; }
}
function offUebernehmen() {
  const f = $('#produkt-form'); const t = offTreffer; if (!f || !t) return;
  if (t.name && !f.name.value) f.name.value = t.name; if (t.marke && !f.marke.value) f.marke.value = t.marke; if (t.packung && !f.packung.value) f.packung.value = t.packung; if (t.zutaten && !f.zutaten.value) f.zutaten.value = t.zutaten;
  PRODUKT_NAEHR.forEach(([k]) => { if (t.naehr[k] != null) f['n_' + k].value = t.naehr[k]; });
  t.allergene.forEach(a => { const c = f.querySelector(`input[name=allergen][value="${a}"]`); if (c) c.checked = true; });
  f.quelle_art.value = 'openfoodfacts'; f.quelle_datum.value = t.stand || heute(); f.pruefstatus.value = 'ungeprueft';
  toast('Übernommen – bitte mit dem Etikett vergleichen und dann ggf. „mit Etikett verglichen“ wählen');
}

/* ---------- Online-Produktsuche über Open Food Facts (ODbL) ----------
   Gesendet wird nur der Suchbegriff bzw. die Barcode-Nummer – nie Profil oder Tagebuch.
   Textsuche laut OFF max. 10/Minute und „nicht beim Tippen“: daher erst nach einer Tipp-Pause, gedrosselt, mit Zwischenspeicher und Abbruch alter Anfragen.
   Ausgewählte Produkte werden privat in „Eigene Produkte“ gespeichert (mit Quelle) und nie zurückgesendet oder veröffentlicht. */
const datumJahr = d => { try { return new Date(d + 'T12:00:00').toLocaleDateString('de-DE'); } catch (e) { return d; } };
const OFF_FELDER = 'code,product_name,product_name_de,generic_name_de,brands,quantity,product_quantity,product_quantity_unit,serving_quantity,serving_size,nutrition_data_per,nutrition_data_prepared_per,nutriments,last_modified_t,allergens_tags,ingredients_text_de,countries_tags';
/* Zustände: leer · bereit (Namenssuche wartet auf Knopf) · laedt · ok · fehler (mit Art) · limit (eigene Bremse) · pause (Sperre nach Ablehnung) */
let offOnline = { q: '', status: 'leer', treffer: [], fehler: '', art: '', seq: 0, ctrl: null, timer: null, cache: false, host: 0, sperreBis: { suche: 0, code: 0 }, alt: null };
const offAufrufe = { suche: [], code: [] };
const offCacheName = () => 'kochschule.off.v1.' + PROFIL;   // erst zur Laufzeit (PROFIL kommt aus app.js)
// frisch = jünger als 24 h; alt = beliebiges Alter (nur als gekennzeichneter Ausweg, wenn Open Food Facts nicht antwortet)
function offCache(key, wert, alt) { const OFF_CACHE = offCacheName(); try { const c = JSON.parse(localStorage.getItem(OFF_CACHE) || '{}'); if (wert === undefined) { const e = c[key]; if (alt) return e ? { d: e.d, t: e.t } : null; return e && Date.now() - e.t < 864e5 ? e.d : null; }
  c[key] = { t: Date.now(), d: wert }; Object.keys(c).sort((a, b) => c[b].t - c[a].t).slice(40).forEach(k => delete c[k]); localStorage.setItem(OFF_CACHE, JSON.stringify(c)); } catch (e) { return null; } }
const istBarcode = q => /^\d{8}$|^\d{12,14}$/.test(q);
// OFF-Datensatz → einheitliches Produkt; Auffälligkeiten werden benannt, nie stillschweigend „repariert“
function offNormalisieren(p) {
  const n = p.nutriments || {}; const hinweise = []; const z = k => { const v = n[k + '_100g']; return v === '' || v == null || isNaN(Number(v)) ? null : Math.round(Number(v) * 100) / 100; };
  let kcal = z('energy-kcal'); if (kcal == null) { const kj = z('energy-kj') != null ? z('energy-kj') : z('energy'); if (kj != null) { kcal = Math.round(kj / 4.184); hinweise.push('kcal aus kJ umgerechnet'); } }
  let salz = z('salt'); if (salz == null && z('sodium') != null) { salz = Math.round(z('sodium') * 2.5 * 100) / 100; hinweise.push('Salz aus Natrium berechnet (× 2,5)'); }
  const naehr = { kcal, fett: z('fat'), gesfs: z('saturated-fat'), kh: z('carbohydrates'), zucker: z('sugars'), ballaststoffe: z('fiber'), protein: z('proteins'), salz };
  const fehlt = [['kcal', 'Energie'], ['protein', 'Eiweiß'], ['kh', 'Kohlenhydrate'], ['fett', 'Fett']].filter(([k]) => naehr[k] == null).map(x => x[1]); if (fehlt.length) hinweise.push('fehlt: ' + fehlt.join(', '));
  if (p.nutrition_data_per === 'serving') hinweise.push('Etikettangabe je Portion – Werte je 100 von OFF umgerechnet');
  if (n['energy-kcal_prepared_100g'] != null || n['energy_prepared_100g'] != null) hinweise.push('auch „zubereitet“-Werte vorhanden – verwendet werden die Werte wie verkauft (z. B. Pulver)');
  if (kcal != null && naehr.protein != null && naehr.protein * 4 > kcal * 1.15 + 5) hinweise.push('mehr Energie aus Eiweiß als angegebene Energie – Werte widersprüchlich, Etikett prüfen');
  else if (kcal != null && naehr.protein != null && naehr.kh != null && naehr.fett != null) { const r = naehr.protein * 4 + naehr.kh * 4 + naehr.fett * 9; if (Math.abs(r - kcal) > Math.max(40, kcal * 0.3)) hinweise.push('Energie passt nicht zu Eiweiß/Kohlenhydraten/Fett – Etikett prüfen'); }
  const menge = String(p.quantity || '').trim(); const ml = /\d\s*(ml|cl|l)\b/i.test(menge) || p.product_quantity_unit === 'ml';
  return { code: String(p.code || ''), name: (p.product_name_de || p.product_name || p.generic_name_de || '').trim(), marke: String(p.brands || '').split(',')[0].trim(), menge, packung: Number(p.product_quantity) || null, packung_einheit: ml ? 'ml' : 'g',
    portion: Number(p.serving_quantity) || null, portion_text: p.serving_size || '', bezug: ml ? '100ml' : '100g', naehr, stand: p.last_modified_t ? new Date(p.last_modified_t * 1000).toISOString().slice(0, 10) : null, hinweise,
    de: arr(p.countries_tags).includes('en:germany'),   // laut OFF in Deutschland verkauft (Community-Angabe)
    allergene: arr(p.allergens_tags).map(t => OFF_ALLERGENE[t]).filter(Boolean), zutaten: p.ingredients_text_de || '' };
}
/* Barcode: automatisch (eine exakte, günstige Abfrage). Name: nur per Knopf – Open Food Facts drosselt die Namenssuche stark
   (Grenze je Internetanschluss, Antwort dann 503 ohne CORS-Freigabe → im Browser nur „Failed to fetch“). Keine automatischen Wiederholungen. */
function offOnlineSuche(q, sofort) {
  clearTimeout(offOnline.timer); const qn = String(q || '').trim(); const seq = ++offOnline.seq;
  if (offOnline.ctrl) { try { offOnline.ctrl.abort(); } catch (e) { /* */ } offOnline.ctrl = null; }   // veraltete Anfrage abbrechen
  offOnline.q = qn; offOnline.treffer = []; offOnline.fehler = ''; offOnline.art = ''; offOnline.alt = null; offOnline.cache = false;
  if (qn.length < 3 && !istBarcode(qn)) { offOnline.status = 'leer'; offOnlineZeichnen(); return; }
  const code = istBarcode(qn); const key = (code ? 'c:' : 'q:') + suchNorm(qn); const c = offCache(key);
  if (c) { offOnline.status = 'ok'; offOnline.treffer = c; offOnline.cache = true; offOnlineZeichnen(); return; }   // frischer Zwischenspeicher: keine Anfrage
  if (!code && !sofort) { offOnline.status = 'bereit'; offOnlineZeichnen(); return; }   // Namenssuche wartet auf den Knopf
  if (!navigator.onLine) { offOnlineFehler('offline', '', key); return; }
  offOnline.timer = setTimeout(() => offOnlineAbfrage(qn, key, code, seq), sofort ? 0 : 400);
}
const OFF_PRUEF_BARCODE = '4337256501569';   // öffentlicher Barcode (ja! Magerquark) nur für die Erreichbarkeitsprüfung
// Bei „Failed to fetch“ genau EINE Prüfung: Ist die Barcode-Schnittstelle erreichbar? Ist das Internet erreichbar (eigene Adresse, 404 erwartet)?
async function offDiagnose(code) {
  const kurz = async (url, opt) => { const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 6000); try { const r = await fetch(url, Object.assign({ signal: ctrl.signal, cache: 'no-store' }, opt || {})); clearTimeout(to); return r; } catch (e) { clearTimeout(to); return null; } };
  if (!code) { const r = await kurz(`https://world.openfoodfacts.org/api/v2/product/${OFF_PRUEF_BARCODE}.json?fields=code`); if (r && r.ok) return 'abgelehnt'; }
  const n = await kurz(new URL('netzpruefung-' + Date.now() + '.txt', location.href).href); return n && n.status === 404 ? 'blockiert' : 'netz';
}
function offOnlineFehler(art, detail, key) {
  offOnline.ctrl = null; offOnline.status = 'fehler'; offOnline.art = art; offOnline.fehler = detail || '';
  const a = offCache(key, undefined, true); offOnline.alt = a && a.d && a.d.length ? a : null;   // älterer gespeicherter Stand als Ausweg
  if (['abgelehnt', 'grenze', 'server'].includes(art)) { const typ = key.startsWith('c:') ? 'code' : 'suche'; offOnline.sperreBis[typ] = Date.now() + (typ === 'suche' ? 60000 : 20000); }
  offOnlineZeichnen();
}
async function offOnlineAbfrage(qn, key, code, seq) {
  const typ = code ? 'code' : 'suche'; const jetzt = Date.now();
  if (offOnline.sperreBis[typ] > jetzt) { offOnline.status = 'pause'; offOnline.warte = Math.ceil((offOnline.sperreBis[typ] - jetzt) / 1000); offOnlineZeichnen(); return; }
  const liste = offAufrufe[typ]; while (liste.length && jetzt - liste[0] > 60000) liste.shift();
  if (liste.length >= (code ? 12 : 4)) { offOnline.status = 'limit'; offOnline.warte = Math.ceil((60000 - (jetzt - liste[0])) / 1000); offOnlineZeichnen(); return; }   // eigene Bremse, deutlich unter der OFF-Grenze
  liste.push(jetzt); offOnline.status = 'laedt'; offOnlineZeichnen();
  /* Messung 2026-11-13 aus der veröffentlichten App: de.openfoodfacts.org antwortete bei 2 von 4 Namenssuchen nach ~0,15 s ohne CORS-Freigabe
     („Failed to fetch“), world.openfoodfacts.org bei 4 von 4 normal. Deshalb world zuerst; scheitert ein Aufruf schnell (< 3 s),
     genau EIN automatischer Versuch beim anderen Server (zählt zur eigenen Bremse). Beim manuellen Wiederholen wird der Server gewechselt. */
  const hosts = ['world', 'de']; const host = hosts[offOnline.host % 2];
  const urlFuer = h => code ? `https://world.openfoodfacts.org/api/v2/product/${qn}.json?fields=${OFF_FELDER}` : `https://${h}.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(qn)}&search_simple=1&action=process&json=1&page_size=15&fields=${OFF_FELDER}`;
  const ctrl = new AbortController(); offOnline.ctrl = ctrl; const to = setTimeout(() => ctrl.abort(), code ? 12000 : 20000);
  try { const t0 = Date.now(); let r;
    try { r = await fetch(urlFuer(host), { signal: ctrl.signal }); }
    catch (e1) { if (code || e1.name === 'AbortError' || Date.now() - t0 > 3000 || seq !== offOnline.seq || !navigator.onLine) throw e1;
      offAufrufe[typ].push(Date.now()); offOnline.host++; r = await fetch(urlFuer(hosts[offOnline.host % 2]), { signal: ctrl.signal }); }
    clearTimeout(to); if (seq !== offOnline.seq) return;   // alte Antwort darf nichts überschreiben
    if (code && r.status === 404) { offOnline.status = 'ok'; offOnline.treffer = []; offCache(key, []); offOnlineZeichnen(); return; }
    if (r.status === 429) { offOnlineFehler('grenze', '429', key); return; }
    if (!r.ok) { offOnlineFehler('server', String(r.status), key); return; }
    const j = await r.json(); if (seq !== offOnline.seq) return;
    const roh = code ? (j.status === 1 && j.product ? [Object.assign({ code: qn }, j.product)] : []) : arr(j.products);
    const gesehen = new Set(); const treffer = roh.map(offNormalisieren).filter(p => p.name && p.code && !gesehen.has(p.code) && gesehen.add(p.code))   // Dubletten nur über den Barcode
      .map((p, i) => [p, i]).sort((a, b) => (b[0].de - a[0].de) || a[1] - b[1]).map(x => x[0]);   // in Deutschland verkaufte zuerst, sonst Reihenfolge von OFF
    offOnline.ctrl = null; offOnline.status = 'ok'; offOnline.treffer = treffer; offOnline.cache = false; offCache(key, treffer); offOnlineZeichnen();
  } catch (e) { clearTimeout(to); if (seq !== offOnline.seq) return;
    if (e.name === 'AbortError') { offOnlineFehler('zeit', '', key); return; }
    if (!navigator.onLine) { offOnlineFehler('offline', '', key); return; }
    offOnline.status = 'laedt'; offOnlineZeichnen(); const art = await offDiagnose(code); if (seq !== offOnline.seq) return; offOnlineFehler(art, e.message, key); }
}
const OFF_FEHLER_TEXT = {
  offline: ['Kein Internet', 'Dieses Gerät ist gerade offline.'],
  netz: ['Keine Internetverbindung erkennbar', 'Auch die App-Adresse selbst ist gerade nicht erreichbar – Netz bzw. WLAN prüfen.'],
  zeit: ['Keine rechtzeitige Antwort', 'Open Food Facts hat nicht innerhalb der Wartezeit geantwortet (Barcode 12 s, Namenssuche 20 s) – langsame Verbindung oder langsamer Server.'],
  abgelehnt: ['Die Namenssuche von Open Food Facts hat nicht geantwortet', 'Geprüft: Die Barcode-Abfrage bei Open Food Facts funktioniert gerade, nur die Suche nach Namen nicht. Den genauen Grund verrät der Browser nicht. Beobachtet: Der Server antwortet zeitweise ohne die Freigabe, die eine Web-App braucht (CORS) – deshalb versucht die App automatisch einen zweiten Server. Möglich ist auch die Suchgrenze, die Open Food Facts je Internetanschluss setzt (gleiches WLAN, manche Mobilfunknetze oder iCloud Privat-Relay teilen sie), oder eine kurzzeitige Überlastung der Namenssuche. Meist geht es nach 1–2 Minuten wieder.'],
  grenze: ['Zu viele Anfragen', 'Open Food Facts meldet, dass gerade zu viele Anfragen von diesem Internetanschluss kommen (429). Meist geht es nach 1–2 Minuten wieder.'],
  server: ['Serverfehler bei Open Food Facts', 'Open Food Facts hat einen Fehler gemeldet. Das liegt nicht an deinem Gerät.'],
  blockiert: ['Open Food Facts ist von diesem Gerät aus nicht erreichbar', 'Das Internet funktioniert, aber Open Food Facts antwortet nicht. Mögliche Gründe: eine Störung oder Drosselung bei Open Food Facts, ein Inhalts- bzw. Werbeblocker oder ein Firmen-/Schul-WLAN, das die Seite sperrt.']
};
function offOnlineHtml() {
  const o = offOnline; if (o.status === 'leer') return '';
  const kopf = `<h4 class="tg-titel">Online: Open Food Facts${typeof o.cache === 'string' ? ` <span class="leise">(gespeicherter Stand vom ${esc(o.cache)} – kann veraltet sein)</span>` : o.cache ? ' <span class="leise">(zwischengespeichert)</span>' : ''}</h4>`;
  const fuss = `<p class="leise klein">Produktdaten aus <a href="https://de.openfoodfacts.org" target="_blank" rel="noopener">Open Food Facts</a> (Lizenz <a href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank" rel="noopener">ODbL</a>), von Freiwilligen erfasst – kein garantiert aktuelles Etikett. Gesendet wird nur dein Suchbegriff.</p>`;
  // Zustände klar getrennt: wartet · lädt · Treffer · ohne Treffer · Fehler · offline · Grenze erreicht – nie „gibt es nicht“, solange gesucht wird
  const anlegen = `<p class="klein"><button class="klein" data-a="produkt-neu-vorbelegt">${istBarcode(o.q) ? `Produkt mit Barcode ${esc(o.q)} anlegen` : `Produkt „${esc(o.q)}“ selbst anlegen`}</button> <span class="leise">Werte vom Etikett, optional mit Foto als Beleg.</span></p>`;
  if (o.status === 'bereit') return kopf + `<p class="klein" role="status"><button class="klein" data-a="off-jetzt">${ico('suche', 'klein')} „${esc(o.q)}“ bei Open Food Facts suchen</button></p><p class="leise klein">Online-Namenssuche nur auf Knopfdruck – Open Food Facts erlaubt nur wenige Suchen pro Minute. Barcodes werden automatisch gesucht und sind genauer.</p>`;
  if (o.status === 'laedt') return kopf + `<p class="leise klein" role="status"><span class="lade-punkt" aria-hidden="true"></span> Suche läuft bei Open Food Facts … (höchstens etwa ${istBarcode(o.q) ? 15 : 25} s)</p>`;
  const altHtml = o.alt ? `<div class="hinweis klein"><b>Gespeicherter Stand vom ${esc(new Date(o.alt.t).toLocaleDateString('de-DE'))}</b> (${o.alt.d.length} Treffer zu „${esc(o.q)}“) – kann veraltet sein. <button class="klein" data-a="off-alt">Anzeigen</button></div>` : '';
  const webLink = istBarcode(o.q) ? '' : ` Oder auf der <a href="https://de.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(o.q)}&search_simple=1&action=process" target="_blank" rel="noopener">Website von Open Food Facts suchen ↗</a> und den Barcode hier eingeben.`;
  const auswege = altHtml + anlegen + (webLink ? `<p class="leise klein">${webLink.trim()}</p>` : '');
  if (o.status === 'limit' || o.status === 'pause') return kopf + `<p class="hinweis klein" role="status"><b>${o.status === 'limit' ? 'Kurz warten' : 'Kurze Pause nach der Ablehnung'}</b> – damit die Grenze von Open Food Facts nicht weiter überschritten wird, sucht die App erst in etwa ${o.warte} s wieder. <button class="klein" data-a="off-jetzt">Erneut versuchen</button></p>` + auswege;
  if (o.status === 'fehler') { const [t, txt] = OFF_FEHLER_TEXT[o.art] || ['Online-Suche fehlgeschlagen', o.fehler]; const sperre = Math.max(0, Math.ceil((o.sperreBis[istBarcode(o.q) ? 'code' : 'suche'] - Date.now()) / 1000));
    // Kurz und mit Handlung zuerst; die technische Erklärung ist ausklappbar
    const kurzText = o.art === 'offline' ? 'Kein Internet – online suchen geht gerade nicht.' : 'Online-Suche gerade nicht möglich.';
    return kopf + `<div class="hinweis warn klein" role="status"><b>${esc(kurzText)}</b> Deine Treffer oben und die Sammelliste bleiben erhalten.
      <div class="knopfreihe" style="margin:.4em 0"><button class="klein" data-a="off-jetzt">${sperre ? `Erneut versuchen (in ${sperre} s)` : 'Erneut versuchen'}</button>${istBarcode(o.q) ? '' : '<button class="klein still" data-a="scan-start">📷 Barcode scannen</button>'}</div>
      <details><summary>Warum?</summary><p style="margin:.3em 0"><b>${esc(t)}.</b> ${esc(txt)}${o.art === 'server' && o.fehler ? ` (HTTP ${esc(o.fehler)})` : o.fehler && o.art !== 'grenze' ? ` (Browser-Meldung: ${esc(String(o.fehler).slice(0, 60))})` : ''}</p><p style="margin:.3em 0">Das heißt nicht, dass es das Produkt nicht gibt. Die App versucht höchstens zwei Server pro Suche und wartet nach einer Ablehnung 60 s, damit die Suchgrenze nicht weiter überschritten wird.</p></details></div>` + auswege; }
  const lokaleCodes = new Set([...(D.lebensmittel || []).map(l => l.gtin), ...(K.produkte || []).map(p => p.gtin)].filter(Boolean));
  const l = o.treffer.filter(p => !lokaleCodes.has(p.code)); const doppelt = o.treffer.length - l.length;
  if (!o.treffer.length) return kopf + `<p class="klein" role="status"><b>Online kein Treffer</b> zu „${esc(o.q)}“.${istBarcode(o.q) ? ' Diese Nummer ist bei Open Food Facts nicht erfasst.' : ' Tipp: Marke und Sorte kombinieren (z. B. „Milbona Skyr“) oder den Barcode verwenden.'}</p>` + anlegen + fuss;
  // Gleiches Produkt aus mehreren Quellen: Abweichungen zeigen, die bekannte (bestätigte/kuratierte) Angabe bleibt maßgeblich
  const vergleich = o.treffer.filter(p => lokaleCodes.has(p.code)).map(p => { const lok = (D.lebensmittel || []).find(x => x.gtin === p.code) || (K.produkte || []).find(x => x.gtin === p.code); if (!lok || !lok.naehr) return '';
    const diff = ['kcal', 'protein'].filter(k => lok.naehr[k] != null && p.naehr[k] != null && Math.abs(lok.naehr[k] - p.naehr[k]) > Math.max(2, lok.naehr[k] * 0.03)); if (!diff.length) return '';
    const lq = lok.quelle_art === 'hersteller' ? 'Herstellerangabe' : lok.pruefstatus === 'bestaetigt' ? 'mit Etikett verglichen' : lok.quelle || 'deine Angabe'; const ld = lok.abgerufen || lok.quelle_datum || '';
    return `<li>${esc(lok.marke ? lok.marke + ' ' : '')}${esc(lok.name)}: ${diff.map(k => `${k === 'kcal' ? 'Energie' : 'Eiweiß'} ${zahlDE(lok.naehr[k], 1)} (${esc(lq)}${ld ? ', ' + esc(datumDE(ld)) : ''}) vs. ${zahlDE(p.naehr[k], 1)} (Open Food Facts${p.stand ? ', ' + esc(datumJahr(p.stand)) : ''})`).join('; ')}</li>`; }).filter(Boolean);
  const vergleichHtml = vergleich.length ? `<div class="hinweis klein"><b>Gleicher Barcode, andere Werte:</b><ul>${vergleich.join('')}</ul>Gerechnet wird mit deiner bzw. der geprüften Angabe oben. Im Zweifel gilt das Etikett deiner Packung.</div>` : '';
  if (!l.length) return kopf + `<p class="leise klein" role="status">${doppelt} Online-Treffer – alle schon oben bei deinen Produkten bzw. den Markenprodukten (gleicher Barcode).</p>` + vergleichHtml + fuss;
  return kopf + `${doppelt ? `<p class="leise klein">${doppelt} Treffer hast du schon (siehe oben, gleicher Barcode).</p>` : ''}${vergleichHtml}<ul class="eintraege treffer">${l.map(p => { const einh = p.bezug === '100ml' ? 'ml' : 'g'; const start = p.portion || (p.packung && p.packung <= 250 ? p.packung : 100);
      const n = p.naehr; const kurzName = p.marke && !p.name.toLowerCase().startsWith(p.marke.toLowerCase()) ? p.marke + ' ' + p.name : p.name;
      return `<li><span class="tz-name"><b>${esc(kurzName)}</b>${p.menge ? ` · ${esc(p.menge)}` : ''}<br><span class="leise klein">${n.kcal != null ? zahlDE(n.kcal) + ' kcal' : 'kcal ?'} · ${n.protein != null ? zahlDE(n.protein, 1) + ' g Eiweiß' : 'Eiweiß ?'} je 100 ${einh}</span>
        <br><span class="chip">Online-Daten, ungeprüft</span>${p.hinweise.length ? ' <span class="chip warn">Etikett prüfen</span>' : ''}${p.de === false ? ' <span class="chip warn">nicht als in Deutschland verkauft erfasst</span>' : ''}
        ${mengenWahlHtml('off-' + p.code, 'off', { packung: p.packung, packung_einheit: p.packung_einheit, bezug: p.bezug, portionen: p.portion ? [{ name: 'Portion laut Angabe', menge: p.portion }] : [] })}
        <details class="klein tz-details"><summary>Details</summary><p class="klein">Je 100 ${einh}: Fett ${n.fett != null ? zahlDE(n.fett, 1) + ' g' : '?'} · Kohlenhydrate ${n.kh != null ? zahlDE(n.kh, 1) + ' g' : '?'} · Zucker ${n.zucker != null ? zahlDE(n.zucker, 1) + ' g' : '?'} · Ballaststoffe ${n.ballaststoffe != null ? zahlDE(n.ballaststoffe, 1) + ' g' : '?'} · Salz ${n.salz != null ? zahlDE(n.salz, 2) + ' g' : '?'}. Fehlende Angaben = unbekannt, nicht 0.</p>
          ${p.hinweise.length ? `<p class="klein"><b>Auffälligkeiten:</b> ${esc(p.hinweise.join(' · '))}</p>` : ''}${p.portion_text ? `<p class="klein">Portionsangabe im Eintrag: ${esc(p.portion_text)}</p>` : ''}
          <p class="klein">Barcode ${esc(p.code)}${p.stand ? ' · zuletzt geändert ' + esc(datumJahr(p.stand)) : ''} · <a href="https://de.openfoodfacts.org/produkt/${esc(p.code)}" target="_blank" rel="noopener">Eintrag ansehen</a></p>
          <p class="leise klein">Von Freiwilligen erfasst. Ob Sorte und Rezeptur zu deiner Packung passen, zeigt nur das Etikett.</p></details></span>
        <span class="tz-aktion"><label class="feld menge-feld"><span class="sr-only">Menge</span><input type="number" min="1" value="${esc(start)}" data-gramm="off-${esc(p.code)}" inputmode="decimal"></label><span class="einh">${einh}</span><button class="haupt klein" data-a="off-eintragen" data-v="${esc(p.code)}" ${p.naehr.kcal == null ? 'disabled title="Energie unbekannt"' : ''}>${ico('plus', 'klein')} Eintragen</button><button class="klein" data-a="off-liste" data-v="${esc(p.code)}" ${p.naehr.kcal == null ? 'disabled' : ''}>+ Liste</button><button class="klein still" data-a="off-merken" data-v="${esc(p.code)}" title="Als Standardprodukt merken">☆</button></span></li>`; }).join('')}</ul>
    <p class="klein">Nicht dabei? <button class="klein still" data-a="produkt-neu-vorbelegt">Produkt selbst anlegen</button> oder genauer suchen (Marke, Sorte, Barcode).</p>` + fuss;
}
function offOnlineZeichnen() { const el = document.getElementById('tb-online'); if (el) el.innerHTML = offOnlineHtml(); }
// Externes Produkt privat speichern (gleicher Barcode → vorhandenes Produkt; vom Nutzer bestätigte Werte werden nie überschrieben)
function offProduktUebernehmen(d, p) {
  d.lebensmittel = d.lebensmittel || []; const da = d.lebensmittel.find(l => l.gtin && l.gtin === p.code); const neu = { name: p.name, marke: p.marke || null, gtin: p.code, packung: p.packung, packung_einheit: p.packung_einheit, portion: p.portion, bezug: p.bezug, bezug_zustand: 'verzehrfertig', naehr: p.naehr, zutaten: p.zutaten || null, allergene: p.allergene, quelle_art: 'openfoodfacts', quelle: 'Open Food Facts (Community-Daten)', quelle_datum: p.stand || heute(), pruefstatus: 'ungeprueft', datenhinweise: p.hinweise };
  if (da) { if (da.quelle_art === 'openfoodfacts' && da.pruefstatus !== 'bestaetigt' && (p.stand || '') > (da.quelle_datum || '')) { const k = JSON.parse(JSON.stringify(da)); delete k.versionen; da.versionen = [...(da.versionen || []), Object.assign(k, { ersetzt_am: heute() })]; Object.assign(da, neu, { version: (da.version || 1) + 1, geaendert: heute() }); } return da; }
  const l = Object.assign({ id: uid('lm'), version: 1, erfasst: heute() }, neu); d.lebensmittel.push(l); return l;
}
let produktVorbelegung = null;

/* ---------- Barcode-Scanner: Kamera erst auf Knopfdruck; Erkennung lokal (BarcodeDetector, sonst eigene EAN-/UPC-Erkennung) ---------- */
const EAN_L = ['3211', '2221', '2122', '1411', '1132', '1231', '1114', '1312', '1213', '3112'].map(s => s.split('').map(Number));
const EAN_PARITAET = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];
function eanZiffer(w, mitG) { const s = w[0] + w[1] + w[2] + w[3]; if (!s) return null; const n = w.map(x => x * 7 / s); let best = null, bd = 9;
  EAN_L.forEach((p, d) => { const dl = p.reduce((a, x, i) => a + Math.abs(x - n[i]), 0); if (dl < bd) { bd = dl; best = { d, g: false }; } if (mitG) { const gp = [...p].reverse(); const dg = gp.reduce((a, x, i) => a + Math.abs(x - n[i]), 0); if (dg < bd) { bd = dg; best = { d, g: true }; } } });
  return bd < 1.6 ? best : null; }
function eanPruefen(code) { return gtinPruefziffer(code) ? code : null; }
// Läufe (abwechselnd hell/dunkel) einer Bildzeile → EAN-13/UPC-A oder EAN-8
// Begrenzungszeichen (Start/Mitte/Ende) müssen aus Läufen von etwa einer Modulbreite bestehen
const eanGuard = (runs, a, n, m) => { for (let k = a; k < a + n; k++) { if (!(runs[k] > m * 0.4 && runs[k] < m * 2.1)) return false; } return true; };
function eanAusLaeufen(runs, art) {
  const ziffern = art === 13 ? 6 : 4; const laenge = 3 + ziffern * 4 + 5 + ziffern * 4 + 3;   // Läufe ohne Ruhezonen
  for (let i = 1; i + laenge < runs.length; i += 2) {   // runs[i] = dunkel (Startzeichen 1-1-1), davor helle Ruhezone
    const m = (runs[i] + runs[i + 1] + runs[i + 2]) / 3; if (!m || !eanGuard(runs, i, 3, m) || runs[i - 1] < m * 3) continue;
    let j = i + 3, par = '', ziff = [], ok = true;
    for (let k = 0; k < ziffern && ok; k++, j += 4) { const z = eanZiffer(runs.slice(j, j + 4), art === 13); if (!z) ok = false; else { ziff.push(z.d); par += z.g ? 'G' : 'L'; } }
    if (!ok || !eanGuard(runs, j, 5, m)) continue; j += 5;
    for (let k = 0; k < ziffern && ok; k++, j += 4) { const z = eanZiffer(runs.slice(j, j + 4), false); if (!z) ok = false; else ziff.push(z.d); }
    if (!ok || !eanGuard(runs, j, 3, m)) continue; j += 3;
    if (j < runs.length && runs[j] < m * 3) continue;   // helle Ruhezone hinter dem Endzeichen
    if (art === 13) { const erst = EAN_PARITAET.indexOf(par); if (erst < 0) continue; const c = eanPruefen(erst + ziff.join('')); if (c) return c; }
    else if (!par.includes('G')) { const c = eanPruefen(ziff.join('')); if (c) return c; }
  }
  return null;
}
function eanAusBild(img) {   // img: ImageData; mehrere Zeilen um die Mitte, beide Leserichtungen
  const { width: w, height: h, data } = img; const zeilen = [0.5, 0.42, 0.58, 0.35, 0.65, 0.28, 0.72];
  const laeufe = []; for (const f of zeilen) { const y = Math.round(h * f); const roh = new Float32Array(w); for (let x = 0; x < w; x++) { const o = (y * w + x) * 4; roh[x] = data[o] * 0.299 + data[o + 1] * 0.587 + data[o + 2] * 0.114; }
    // senkrecht über 3 Zeilen mitteln (weniger Rauschen)
    const lum = new Float32Array(w); for (let x = 0; x < w; x++) { let s = roh[x], n = 1; for (const dy of [-2, 2]) { const yy = y + dy; if (yy >= 0 && yy < h) { const o = (yy * w + x) * 4; s += data[o] * 0.299 + data[o + 1] * 0.587 + data[o + 2] * 0.114; n++; } } lum[x] = s / n; }
    for (const [teiler, versatz] of [[40, 4], [20, 0]]) { const r = Math.max(4, Math.round(w / teiler)); const bits = new Uint8Array(w); let summe = 0;
      for (let x = 0; x < w; x++) { const a = Math.max(0, x - r), b = Math.min(w - 1, x + r); if (x === 0) { summe = 0; for (let k = a; k <= b; k++) summe += lum[k]; } else { if (x + r < w) summe += lum[x + r]; if (x - r - 1 >= 0) summe -= lum[x - r - 1]; } bits[x] = lum[x] < summe / (b - a + 1) - versatz ? 1 : 0; }
      const runs = []; let farbe = 0, len = 0; for (let x = 0; x < w; x++) { if (bits[x] === farbe) len++; else { runs.push(len); farbe = bits[x]; len = 1; } } runs.push(len); if (farbe === 1) runs.push(0);
      laeufe.push(runs, runs.slice().reverse()); } }   // beginnt und endet hell → auch umgekehrt gültig
  for (const art of [13, 8]) for (const runs of laeufe) { const c = eanAusLaeufen(runs, art); if (c) return c; }   // EAN-13 vor EAN-8
  return null;
}
let scanZustand = null;
async function scannerOeffnen() {
  let dlg = document.getElementById('scanner'); if (!dlg) { dlg = document.createElement('dialog'); dlg.id = 'scanner'; dlg.className = 'anl'; document.body.appendChild(dlg); dlg.addEventListener('close', scannerStoppen); }
  dlg.innerHTML = `<div class="anl-kopf"><div><h2 style="margin:0">Barcode scannen</h2><p class="anl-variante">Kamera auf den Strichcode halten – waagrecht, gut beleuchtet, etwa 10–15 cm Abstand.</p></div><button type="button" class="anl-zu" data-a="scan-zu" aria-label="Scanner schließen">✕</button></div>
    <div class="anl-inhalt"><div class="scan-bild"><video id="scan-video" playsinline muted></video><div class="scan-linie"></div></div><p id="scan-status" class="klein" role="status" aria-live="polite">Kamera wird gestartet …</p>
    <label class="feld"><span>oder Barcode-Nummer eingeben</span><input id="scan-manuell" inputmode="numeric" placeholder="z. B. 4056489216162" autocomplete="off"></label><button class="klein" data-a="scan-manuell">Suchen</button>
    <p class="leise klein">Das Bild wird nur auf diesem Gerät ausgewertet und nirgends hingeschickt. Gesucht wird danach nur die erkannte Nummer.</p></div>`;
  if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  const st = document.getElementById('scan-status'); scanZustand = { stream: null, timer: null, letzter: '', treffer: 0, fertig: false };
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { st.textContent = 'Dieser Browser erlaubt keinen Kamerazugriff – bitte die Nummer eingeben.'; return; }
  try { scanZustand.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }); }
  catch (e) { st.textContent = e.name === 'NotAllowedError' ? 'Kamera nicht erlaubt. Du kannst den Zugriff in den Einstellungen erlauben – oder die Nummer unten eingeben.' : 'Kamera nicht verfügbar – bitte die Nummer eingeben.'; return; }
  if (!scanZustand) { scannerStoppen(); return; }
  const v = document.getElementById('scan-video'); v.srcObject = scanZustand.stream; try { await v.play(); } catch (e) { /* */ }
  st.textContent = 'Suche Barcode …'; const cv = document.createElement('canvas'); const ctx = cv.getContext('2d', { willReadFrequently: true });
  let detektor = null; try { if ('BarcodeDetector' in window) { const f = await BarcodeDetector.getSupportedFormats(); if (f.includes('ean_13')) detektor = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] }); } } catch (e) { detektor = null; }
  const runde = async () => { if (!scanZustand || scanZustand.fertig) return; let code = null;
    try { if (v.videoWidth) { if (detektor) { const r = await detektor.detect(v); code = r && r[0] ? r[0].rawValue : null; } else { const w = Math.min(960, v.videoWidth); const h = Math.round(v.videoHeight * w / v.videoWidth); cv.width = w; cv.height = h; ctx.drawImage(v, 0, 0, w, h); code = eanAusBild(ctx.getImageData(0, 0, w, h)); } } } catch (e) { code = null; }
    if (code && gtinPruefziffer(code)) { if (code === scanZustand.letzter) scanZustand.treffer++; else { scanZustand.letzter = code; scanZustand.treffer = 1; }
      if (scanZustand.treffer >= 2) { scanZustand.fertig = true; scanErgebnis(code); return; } }   // zweimal gleich gelesen → sicher, nur einmal ausgelöst
    scanZustand.timer = setTimeout(runde, 120); };
  runde();
}
function scannerStoppen() { if (!scanZustand) return; clearTimeout(scanZustand.timer); if (scanZustand.stream) scanZustand.stream.getTracks().forEach(t => t.stop()); scanZustand = null; }
function scanErgebnis(code) {
  scannerStoppen(); const dlg = document.getElementById('scanner'); if (dlg && dlg.open) dlg.close(); if (navigator.vibrate) navigator.vibrate(60);
  if (!location.hash.startsWith('#/tagebuch')) location.hash = '#/tagebuch';
  setTimeout(() => { tbSuche = code; const s = document.getElementById('tb-suche'); if (s) { s.value = code; s.scrollIntoView({ block: 'start' }); } const t = document.getElementById('tb-treffer'); if (t) t.innerHTML = tbTreffer(); offOnlineSuche(code, true); toast('Barcode erkannt: ' + code); }, 150);
}

/* ---------- Ereignisse ---------- */
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a, v = b.dataset.v;
  switch (a) {
    case 'tb-zeitraum': tbZeitraum = Number(v) || 30; route(); break;
    case 'off-suche': offSuchen(); break;
    case 'off-uebernehmen': offUebernehmen(); break;
    case 'tb-slot': tbSlot = v; route(); break;
    case 'tb-edit': tbEdit = v; route(); break;
    case 'tb-edit-ab': tbEdit = null; route(); break;
    case 'tb-tag': tbKopieVon = null; break;
    case 'tb-fokus': { const s = $('#tb-suche'); if (s) { s.scrollIntoView({ block: 'start', behavior: 'smooth' }); setTimeout(() => s.focus(), 250); } break; }
    case 'tb-suche-setzen': { tbSuche = v; const s = $('#tb-suche'); if (s) s.value = v; const t = $('#tb-treffer'); if (t) t.innerHTML = tbTreffer(); offOnlineSuche(v); break; }
    case 'tb-kopie-vorschau': tbKopieVon = { slot: v || '' }; route(); { const p = $('#tb-kopie-form'); if (p) p.scrollIntoView({ block: 'center' }); } break;
    case 'tb-kopie-ab': tbKopieVon = null; route(); break;
    case 'tb-korb-add': { const t = b.dataset.t; const eingabe = Number(String(($(`[data-gramm="${v}"]`) || {}).value || '').replace(',', '.')); let k = null;
      if (t === 'rezept') { const r = R[v]; if (r) k = { name: kurztitel(r.titel), menge: Number(b.dataset.p) || 1, einheit: 'Portion(en)' }; }
      else if (t === 'lm') { const z = Z[v]; if (z) k = { name: z.name, menge: eingabe > 0 ? eingabe : 100, einheit: ($(`[data-einheit="${v}"]`) || {}).value || 'g' }; }
      else if (t === 'marke') { const p = PRODUKT(v); if (p) k = { name: markeName(p), menge: eingabe > 0 ? eingabe : 100, einheit: p.bezug === '100ml' ? 'ml' : 'g' }; }
      else { const l = (D.lebensmittel || []).find(x => x.id === v); if (l) k = { name: l.name, menge: eingabe > 0 ? eingabe : (l.portion || 100), einheit: l.bezug === '100ml' ? 'ml' : 'g' }; }
      if (!k) return; tbKorb.push(Object.assign({ typ: t, id: v }, k)); korbNeuZeichnen(); toast(`${k.name} auf der Sammelliste`); break; }
    case 'off-jetzt': { if (offOnline.status === 'fehler' && !istBarcode(String(tbSuche || '').trim())) offOnline.host++;   // manuell: anderer Server
      offOnlineSuche(tbSuche, true); break; }
    case 'off-alt': { const a = offOnline.alt; if (!a) break; offOnline.status = 'ok'; offOnline.treffer = a.d; offOnline.cache = new Date(a.t).toLocaleDateString('de-DE'); offOnlineZeichnen(); break; }
    case 'tr-art-bestaetigen': { if (!['kraft', 'ausdauer'].includes(v)) break; const tr = trainingAngaben(D.einstellungen.person || {});
      aendere(v === 'kraft' ? 'Als Krafttraining gespeichert – Rückgängig möglich' : 'Als Ausdauer gespeichert – Rückgängig möglich', d => { const pp = Object.assign({}, d.einstellungen.person); pp.training_art = v; pp.training_einheiten = tr.n; pp.training_minuten = tr.min || 60; if (v === 'kraft') pp.kraft = true; d.einstellungen.person = pp; }, { mitUndo: true }); break; }
    case 'off-eintragen': case 'off-liste': case 'off-merken': { const p = offOnline.treffer.find(x => x.code === v); if (!p) return; const inp = $(`[data-gramm="off-${v}"]`); const menge = Number(String((inp || {}).value || '').replace(',', '.')) || p.portion || 100; let l;
      if (a === 'off-eintragen') { if (!(menge > 0)) { toast('Bitte eine Menge eingeben'); return; } aendere(`${p.name} eingetragen – Produkt mit Quelle gespeichert`, d => { l = offProduktUebernehmen(d, p); d.tagebuch.push(eigenerEintrag(l, menge)); }); break; }
      aendere(null, d => { l = offProduktUebernehmen(d, p); }, { neuZeichnen: false });
      if (a === 'off-liste') { tbKorb.push({ typ: 'eigen', id: l.id, name: l.name + (l.marke ? ' (' + l.marke + ')' : ''), menge, einheit: l.bezug === '100ml' ? 'ml' : 'g' }); korbNeuZeichnen(); toast(`${l.name} auf der Sammelliste`); }
      else aendere(`${l.name} als Standardprodukt gemerkt – wird nie automatisch gebucht`, d => { d.standardprodukte = (d.standardprodukte || []).filter(s => !(s.typ === 'eigen' && s.id === l.id)); d.standardprodukte.push({ typ: 'eigen', id: l.id, menge, einheit: l.bezug === '100ml' ? 'ml' : 'g' }); }, { neuZeichnen: false });
      { const tr = $('#tb-treffer'); if (tr) tr.innerHTML = tbTreffer(); const sl = $('#tb-standard'); if (sl) sl.innerHTML = standardListeHtml(); offOnlineZeichnen(); } break; }
    case 'produkt-neu-vorbelegt': { const q = offOnline.q || tbSuche; produktVorbelegung = istBarcode(q) ? { gtin: q } : { name: q }; location.hash = '#/produkte/neu'; break; }
    case 'etikett-weg': etikettFoto = null; { const vs = $('#etikett-vorschau'); if (vs) vs.innerHTML = '<p class="leise klein">Foto wird beim Speichern entfernt.</p>'; } break;
    case 'scan-start': scannerOeffnen(); break;
    case 'scan-zu': { const dl = document.getElementById('scanner'); if (dl && dl.open) dl.close(); scannerStoppen(); break; }
    case 'scan-manuell': { const c = String(($('#scan-manuell') || {}).value || '').replace(/\D/g, ''); if (!gtinPruefziffer(c)) { toast('Bitte eine gültige Barcode-Nummer (8 oder 13 Ziffern) eingeben'); return; } scanErgebnis(c); break; }
    case 'tb-art': tbArt = v || 'alle'; { const t = $('#tb-treffer'); if (t) t.innerHTML = tbTreffer(); } break;
    case 'tb-menge-setzen': { const inp = $(`[data-gramm="${v}"]`); if (inp) { inp.value = b.dataset.m; inp.focus(); } break; }
    case 'tb-standard-merken': { const t = b.dataset.t; const inp = $(`[data-gramm="${v}"]`); const menge = Number(String((inp || {}).value || '').replace(',', '.')) || 100; const ein = ($(`[data-einheit="${v}"]`) || {}).value; const dat = korbEintragDaten(t, v); if (!dat) return;
      aendere(`${dat.name} als Standardprodukt gemerkt (${zahlDE(menge)} ${ein || dat.einheit}) – wird nie automatisch gebucht`, d => { d.standardprodukte = (d.standardprodukte || []).filter(s => !(s.typ === t && s.id === v)); d.standardprodukte.push({ typ: t, id: v, menge, einheit: ein || dat.einheit }); }, { neuZeichnen: false }); { const tr = $('#tb-treffer'); if (tr) tr.innerHTML = tbTreffer(); const sl = $('#tb-standard'); if (sl) sl.innerHTML = standardListeHtml(); } break; }
    case 'tb-standard-weg': { const t = b.dataset.t; aendere('Aus den Standardprodukten entfernt', d => { d.standardprodukte = (d.standardprodukte || []).filter(s => !(s.typ === t && s.id === v)); }, { neuZeichnen: false }); { const tr = $('#tb-treffer'); if (tr) tr.innerHTML = tbTreffer(); const sl = $('#tb-standard'); if (sl) sl.innerHTML = standardListeHtml(); } break; }
    case 'tb-standard-liste': { const s = standardFuer(b.dataset.t, v); const dat = s && korbEintragDaten(s.typ, s.id); if (!dat) return; tbKorb.push({ typ: s.typ, id: s.id, name: dat.name, menge: s.menge, einheit: s.einheit || dat.einheit }); korbNeuZeichnen(); const k = $('#tb-korb'); if (k) k.scrollIntoView({ block: 'nearest' }); toast(`${dat.name} auf der Sammelliste – Menge änderbar`); break; }
    case 'tb-korb-weg': tbKorb.splice(Number(v), 1); korbNeuZeichnen(); break;
    case 'tb-korb-leeren': tbKorb = []; korbNeuZeichnen(); break;
    case 'tb-korb-buchen': { const liste = tbKorb.filter(k => k.menge > 0); if (!liste.length) { toast('Bitte Mengen größer als 0 eingeben'); return; }
      const name = b.dataset.merken ? (prompt('Name der Mahlzeit (z. B. „Quark-Bowl“ oder „Whey-Shake“):', '') || '').trim() : ''; if (b.dataset.merken && !name) return; tbKorb = [];
      aendere(`${liste.length} Einträge eingetragen${name ? ` – als „${name}“ gemerkt` : ''}`, d => { const neu = []; liste.forEach(k => { const e = korbEintragBerechnen(k); if (e) { d.tagebuch.push(e); neu.push(e); } });
        if (name) (d.mahlzeiten = d.mahlzeiten || []).push({ id: uid('mzl'), name: name.slice(0, 40), erstellt: heute(), eintraege: neu.map(e => { const c = JSON.parse(JSON.stringify(e)); delete c.id; delete c.datum; delete c.zeit; return c; }) }); }); break; }
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
document.addEventListener('input', ev => { const i = ev.target.dataset ? ev.target.dataset.korb : undefined; if (i != null && tbKorb[i]) tbKorb[i].menge = Number(String(ev.target.value).replace(',', '.')) || 0; });
// Summe nach Mengenänderung neu berechnen (beim Verlassen des Felds, damit die Eingabe nicht unterbrochen wird)
document.addEventListener('change', ev => { const i = ev.target.dataset ? ev.target.dataset.korb : undefined; if (i != null && tbKorb[i]) korbNeuZeichnen(); });
document.addEventListener('change', ev => { const t = ev.target; if (t.name === 'ziel' && t.form && t.form.id === 'tb-kopie-form' && t.value) { const h = $('#tb-kopie-hinweis'); if (h) h.textContent = kopierHinweis(t.value, D.tagebuch.filter(e => e.datum === t.value).length); } });
document.addEventListener('submit', ev => {
  const f = ev.target; if (f.id !== 'tb-kopie-form') return; ev.preventDefault();
  const ziel = f.ziel.value; const ids = [...f.querySelectorAll('input[name="e"]:checked')].map(x => x.value);
  if (!/^\d{4}-\d\d-\d\d$/.test(ziel) || ziel > heute()) { toast('Bitte einen Tag bis heute wählen'); return; }
  if (!ids.length) { toast('Bitte mindestens einen Eintrag auswählen'); return; }
  const knopf = f.querySelector('[type="submit"]'); if (knopf.disabled) return; knopf.disabled = true;
  const quelle = D.tagebuch.filter(e => ids.includes(e.id)); tbKopieVon = null;
  aendere(`${quelle.length} Einträge nach ${ziel === heute() ? 'heute' : datumDE(ziel)} kopiert`, d => { quelle.forEach(e => { const n = eintragKopie(e, ziel, eintragSlot(e)); n.zeit = e.zeit || n.zeit; d.tagebuch.push(n); }); }, { neuZeichnen: false });
  location.hash = '#/tagebuch/' + ziel; route();
});
document.addEventListener('submit', ev => {
  const f = ev.target; if (!f.dataset || !f.dataset.tbEdit) return; ev.preventDefault();
  const id = f.dataset.tbEdit; const menge = Number(String(f.menge.value).replace(',', '.'));
  if (!(menge > 0)) { toast('Bitte eine Menge größer als 0 eingeben'); return; }
  tbEdit = null;
  aendere('Eintrag geändert', d => { const e = d.tagebuch.find(x => x.id === id); if (!e) return; const istPortion = e.einheit === 'Portion' || !e.einheit; const alt = istPortion ? (e.portionen || 1) : (e.gramm || 100);
    const q = istPortion && e.restportion ? d.restportionen.find(x => x.id === e.restportion) : null; if (q) { const diff = menge - alt; if (diff > q.portionen) { toast('So viel ist von der Restportion nicht mehr übrig'); return; } q.portionen = Math.round((q.portionen - diff) * 100) / 100; }
    eintragSkalieren(e, menge / alt); if (istPortion) e.portionen = menge; else e.gramm = menge; e.mahlzeit = f.slot.value; if (f.zeit.value) e.zeit = f.zeit.value; e.bearbeitet = new Date().toISOString(); });
});
