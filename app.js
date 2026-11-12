/* Kochschule – Webapp v2 (Kochen + Ernährung)
   Keine Server, keine KI. Katalog: data/katalog.js (öffentlich). Persönliche Daten: localStorage dieses Geräts.
   Modul ernaehrung.js (vorher geladen): Profile, Ersteinrichtung, Ziele, Tagebuch, Bilder. */
'use strict';
const K = window.KATALOG || { rezepte: [], techniken: [], zutaten: [], quellen: {}, naehrstoffe: {} };
const APP_VERSION = '2.20.4';
const APP_BUILD = '202611122056';   // wird von tools/build-katalog.ps1 gesetzt (gleich der Version in sw.js)
const SCHEMA = 3;                   // Datenformat der persönlichen Daten; Änderungen nur über MIGRATIONEN unten
// Getrennte Profile nutzen eigene Speicherschlüssel: ?profil=test (Tests) oder ein unter „Profile“ gewähltes Profil.
const PROFIL = (new URLSearchParams(location.search).get('profil') || aktivesProfilId()).replace(/[^a-z0-9-]/gi, '').slice(0, 20);
const SPEICHER = 'kochschule.daten.v1' + (PROFIL ? '.' + PROFIL : '');
const TIMER_SPEICHER = 'kochschule.timer.v1' + (PROFIL ? '.' + PROFIL : '');
const ZWISCHEN_SPEICHER = SPEICHER + '.zwischenstaende';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const heute = () => new Date().toISOString().slice(0, 10);
const plusTage = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const tageBis = iso => Math.round((new Date(iso + 'T12:00:00') - new Date(heute() + 'T12:00:00')) / 864e5);
const datumDE = iso => iso ? new Date(iso + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }) : '';
const uid = p => p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const zahlDE = (n, st = 0) => n == null || isNaN(n) ? '–' : Number(n).toLocaleString('de-DE', { maximumFractionDigits: st, minimumFractionDigits: 0 });

/* ---------- Katalog-Indizes ---------- */
const R = {}; K.rezepte.forEach(r => { R[r.id] = r; });
const RN = {}; K.rezepte.forEach(r => { RN[r.datei] = r; });
const Z = {}; K.zutaten.forEach(z => { Z[z.id] = z; });
const ZN = {}; K.zutaten.forEach(z => { ZN[z.name] = z; (z.aliases || []).forEach(a => { if (!ZN[a]) ZN[a] = z; }); });
const T = {}; K.techniken.forEach(t => { T[t.id] = t; });
const TN = {}; K.techniken.forEach(t => { TN[t.name] = t; });
const arr = v => Array.isArray(v) ? v : (v == null || v === '' ? [] : [v]);

const BEREICHE = [['fruehstueck', 'Frühstück'], ['vorspeise', 'Vorspeise & Kleines'], ['suppe', 'Suppe & Eintopf'], ['salat', 'Salat & Bowl'], ['hauptgericht', 'Hauptgericht'], ['beilage', 'Beilage'], ['sauce', 'Sauce, Dip & Dressing'], ['snack', 'Snack'], ['dessert', 'Dessert'], ['backen', 'Backen']];
const BEREICH_NAME = Object.fromEntries(BEREICHE);
const RICHTUNGEN = [['schnell', 'schnell (≤ 30 Min.)'], ['wenig', 'wenig Aufwand'], ['fitness', 'fitnessgeeignet'], ['lernen', 'Neues lernen'], ['anspruchsvoll', 'anspruchsvoll']];
const GERAETE = { kochfeld: 'Kochfeld', backofen: 'Backofen', backblech: 'Backblech', auflaufform: 'Auflaufform', pfanne: 'Pfanne', deckel: 'Deckel (passend)', topf: 'Topf', reiskocher: 'Reiskocher', kochmesser: 'Kochmesser', schneidebrett: 'Schneidebrett', kuechenwaage: 'Küchenwaage', reibe: 'Reibe', sieb: 'Sieb', schneebesen: 'Schneebesen', kartoffelstampfer: 'Kartoffelstampfer/-presse', puerierstab: 'Pürierstab', kernthermometer: 'Kernthermometer', glaeser: 'Gläser/Förmchen', schuessel: 'Rührschüssel' };
const LADEN = ['Obst & Gemüse', 'Brot & Backwaren', 'Kühlregal: Milch, Eier, Käse', 'Fleisch & Fisch', 'Tiefkühl', 'Trockenware: Getreide, Nudeln, Hülsenfrüchte', 'Konserven & Gläser', 'Öl, Essig, Würzsaucen', 'Gewürze', 'Backzutaten & Süßes', 'Sonstiges'];
const LADEN_ID = { 'zut-dosentomaten': 6, 'zut-tomatenmark': 6, 'zut-kidneybohne': 6, 'zut-kapern': 6, 'zut-gemuesebruehe': 6, 'zut-petersilie': 0, 'zut-basilikum': 0, 'zut-himbeeren': 4, 'zut-weissbrot': 1, 'zut-butter': 2, 'zut-sahne': 2, 'zut-joghurt': 2, 'zut-griechischer-joghurt': 2, 'zut-parmesan': 2, 'zut-milch': 2, 'zut-sojasauce': 7, 'zut-apfelessig': 7, 'zut-rapsoel': 7, 'zut-olivenoel': 7, 'zut-honig': 9, 'zut-zucker': 9, 'zut-weizenmehl': 9, 'zut-speisestaerke': 9, 'zut-agar-agar': 9, 'zut-vanille': 9, 'zut-sonnenblumenkerne': 5, 'zut-ingwer': 0, 'zut-knoblauch': 0, 'zut-limette': 0, 'zut-zitrone': 0, 'zut-salz': 8, 'zut-pfeffer': 8 };
const LADEN_KAT = { gemuese: 0, obst: 0, milch: 2, ei: 2, fleisch: 3, fisch: 3, getreide: 5, huelsenfrucht: 5, fett: 7, gewuerz_kraut: 8, sonstiges: 10 };
const ladenbereich = zid => { if (zid in LADEN_ID) return LADEN_ID[zid]; const z = Z[zid]; return z && z.kategorie in LADEN_KAT ? LADEN_KAT[z.kategorie] : 10; };
const lagerortFuer = zid => { const b = ladenbereich(zid); return b === 4 ? 'tiefkuehler' : ([0, 2, 3].includes(b) ? 'kuehlschrank' : 'vorratsschrank'); };
const LAGER = { vorratsschrank: 'Vorratsschrank', kuehlschrank: 'Kühlschrank', tiefkuehler: 'Tiefkühler' };

/* ---------- Persönliche Daten ---------- */
function leer() {
  return { schema: SCHEMA, angelegt: heute(),
    einstellungen: { ausschluesse: null, geraete: null, geraete_hinweise: {}, grundvorrat: null, portionen: 2, hilfen_offen: true, ziele: { modus: 'keine' },
      person: {}, ernaehrungsweise: null, allergien: [], abneigungen: {}, budget: null, kochzeit: null, einrichtung: null },
    vorrat: [], auswahl: [], planung: { tage: '' }, einkauf: { abgehakt: {}, bestaetigt: {} },
    restportionen: [], tagebuch: [], kochprotokolle: [], fortschritt: {}, tage: {}, lebensmittel: [], anpassungen: {}, varianten: {}, kochbuch: { favoriten: [], kochen_wollen: [], sammlungen: [], zuletzt: [], variante_standard: {} }, mahlzeiten: [], training: { uebungen: [], routinen: [], einheiten: [], aktiv: null, koerpergewicht: [] }, letzter_export: null, geschrieben_von: null };
}
/* Datenformat-Updates: je Schritt eine Funktion „von Schema n auf n+1“. Vorher wird der unveränderte Stand
   als Zwischenstand gesichert. Nie Felder löschen, die eine ältere Version noch braucht. */
const MIGRATIONEN = {
  // 1 → 2: Vermerk, mit welcher App-Version zuletzt gespeichert wurde; Kochfortschritt bekommt Zeitstempel
  1: d => { d.geschrieben_von = null; Object.values(d.fortschritt || {}).forEach(f => { if (f && typeof f === 'object') { f.schritt = Number(f.schritt) || 0; if (!f.aktualisiert) f.aktualisiert = f.start || null; } }); },
  // 2 → 3: Profil/Ziele/Ernährung. Bestehende Nutzer werden NIE zur Einrichtung gezwungen; alte manuelle Ziele bleiben erhalten.
  2: d => {
    const e = d.einstellungen = d.einstellungen || {};
    const alt = e.ziele;
    if (alt && !alt.modus && ['kcal', 'protein', 'kh', 'fett'].some(k => alt[k] != null)) e.ziele = { modus: 'manuell', manuell: { kcal: alt.kcal ?? null, protein: alt.protein ?? null, kh: alt.kh ?? null, fett: alt.fett ?? null, ballaststoffe: null }, quelle: alt.quelle || '', geaendert_am: alt.gesetzt_am || null };
    else if (!alt || !alt.modus) e.ziele = { modus: 'keine' };
    e.person = e.person || {}; e.allergien = e.allergien || []; e.abneigungen = e.abneigungen || {};
    if (e.einrichtung == null) e.einrichtung = 'bestehend';
    d.tage = d.tage || {}; d.lebensmittel = d.lebensmittel || [];
    (d.tagebuch || []).forEach(t => { if (!t.einheit) t.einheit = 'Portion'; });
  }
};
function aufSchemaBringen(d) {
  if (!d || typeof d !== 'object' || typeof d.schema !== 'number' || d.schema < 1) return null;
  if (d.schema > SCHEMA) throw new Error('neuer');
  while (d.schema < SCHEMA) { MIGRATIONEN[d.schema](d); d.schema += 1; }
  return Object.assign(leer(), d, { einstellungen: Object.assign(leer().einstellungen, d.einstellungen || {}), einkauf: Object.assign(leer().einkauf, d.einkauf || {}) });
}
let ladeProblem = null, schreibschutz = false, migriert = null, istNeu = false;
function laden() {
  let roh = null;
  try { roh = localStorage.getItem(SPEICHER); } catch (e) { ladeProblem = 'Speicher nicht lesbar: ' + e.message; return leer(); }
  if (!roh) { istNeu = true; return leer(); }
  let d = null; try { d = JSON.parse(roh); } catch (e) { console.warn(e); }
  if (d && typeof d.schema === 'number' && d.schema > SCHEMA) {
    // Daten einer neueren App-Version (z. B. zweiter, noch alter Tab): anzeigen, aber nichts überschreiben
    schreibschutz = true;
    ladeProblem = 'Deine Daten stammen von einer neueren App-Version. Bitte unter Mehr aktualisieren – bis dahin speichert diese Version nichts.';
    return Object.assign(leer(), d, { einstellungen: Object.assign(leer().einstellungen, d.einstellungen || {}), einkauf: Object.assign(leer().einkauf, d.einkauf || {}) });
  }
  try {
    const von = d && d.schema;
    const neu = aufSchemaBringen(d);
    if (neu) { if (von < SCHEMA) { zwischenstandRoh(`vor Datenformat-Update (Schema ${von} → ${SCHEMA})`, roh); migriert = von; } return neu; }
  } catch (e) { console.warn(e); }
  // Unbekanntes Format: niemals verwerfen, ohne vorher eine unveränderte Kopie abzulegen
  const sk = SPEICHER + '.unlesbar-' + Date.now(); try { localStorage.setItem(sk, roh); } catch (e) { /* */ }
  ladeProblem = 'Gespeicherte Daten hatten ein unbekanntes Format. Eine unveränderte Kopie liegt im Browser unter „' + sk + '“. Bitte den Browser-Speicher nicht löschen.';
  return leer();
}
function zwischenstaende() { try { return JSON.parse(localStorage.getItem(ZWISCHEN_SPEICHER)) || []; } catch (e) { return []; } }
function zwischenstandRoh(grund, daten) {
  try { const z = zwischenstaende(); z.unshift({ zeit: new Date().toISOString(), grund, daten }); localStorage.setItem(ZWISCHEN_SPEICHER, JSON.stringify(z.slice(0, 6))); } catch (e) { console.warn('Zwischenstand', e); }
}
function zwischenstand(grund) { zwischenstandRoh(grund, JSON.stringify(D)); }
let D = laden();
let speicherFehler = false;
function speichern() {
  if (schreibschutz) { toast('Nicht gespeichert: Bitte zuerst die App aktualisieren (Mehr).'); navZaehler(); return; }
  D.geschrieben_von = { version: APP_VERSION, build: APP_BUILD };
  try { localStorage.setItem(SPEICHER, JSON.stringify(D)); speicherFehler = false; } catch (e) { speicherFehler = true; toast('Speichern fehlgeschlagen – bitte jetzt exportieren.'); }
  navZaehler();
}
const undoStapel = [];
function aendere(text, fn, { neuZeichnen = true } = {}) {
  undoStapel.push(JSON.stringify(D)); if (undoStapel.length > 25) undoStapel.shift();
  const zs = zwischenstaende(); if (!zs.length || zs[0].zeit.slice(0, 10) !== heute()) zwischenstand('automatisch: erste Änderung des Tages');
  fn(D); speichern();
  if (text) toast(text, true);
  if (neuZeichnen) route();
}
function rueckgaengig() { const s = undoStapel.pop(); if (!s) return; D = JSON.parse(s); speichern(); toast('Rückgängig gemacht'); route(); }

let toastZeit;
function toast(text, mitUndo = false) {
  const el = $('#toast'); el.innerHTML = `<span>${esc(text)}</span>` + (mitUndo ? '<button data-a="undo">Rückgängig</button>' : '');
  el.hidden = false; clearTimeout(toastZeit); toastZeit = setTimeout(() => { el.hidden = true; }, mitUndo ? 6000 : 3000);
}

/* ---------- Markdown (Teilmenge, wie im Vault genutzt) ---------- */
function linkHtml(ziel, alias) {
  const [name, anker] = ziel.split('#');
  if (name === 'Quellenverzeichnis' && anker) {
    const q = K.quellen[anker.replace(/^\^/, '')];
    if (q && q.url) return `<a class="q" href="${esc(q.url)}" target="_blank" rel="noopener" title="${esc(q.titel + (q.status ? ' – ' + q.status : ''))}">${esc(alias || 'Quelle')} ↗</a>`;
    return `<span class="q">${esc(alias || 'Quelle')}</span>`;
  }
  if (name === 'Mobility – Grundlagen' && anker) { const q = ((K.mobility || {}).quellen || {})[anker.replace(/^\^/, '')]; return q && q.url ? `<a class="q" href="${esc(q.url)}" target="_blank" rel="noopener" title="${esc(q.titel)}">${esc(alias || 'Quelle')} ↗</a>` : `<span class="q">${esc(alias || 'Quelle')}</span>`; }
  const text = alias || name;
  if (TN[name]) return `<a href="#/technik/${esc(TN[name].id)}">${esc(text)}</a>`;
  if (RN[name]) return `<a href="#/rezept/${esc(RN[name].id)}">${esc(text)}</a>`;
  if (ZN[name] && ZN[name].name === name) return `<a href="#/zutat/${esc(ZN[name].id)}">${esc(text)}</a>`;
  return esc(text);
}
function inline(s) {
  const links = [];
  s = s.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (m, a, b) => { links.push(linkHtml(a.trim(), b && b.trim())); return `\u0001${links.length - 1}\u0001`; });
  const ext = [];
  s = s.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, (m, t, u) => { ext.push(`<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)} ↗</a>`); return `\u0002${ext.length - 1}\u0002`; });
  s = esc(s);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|[\s(„])\*([^*\s][^*]*?)\*(?=[\s).,;:!?“]|$)/g, '$1<i>$2</i>');
  s = s.replace(/⟦([^⟧]+)⟧/g, '<span class="skaliert">$1</span>').replace(/⟪ug⟫/g, '<span class="ug" title="Eigener Vorschlag ohne direkt gelesene Quelle">ungeprüft</span>');
  s = s.replace(/\u0001(\d+)\u0001/g, (m, i) => links[i]).replace(/\u0002(\d+)\u0002/g, (m, i) => ext[i]);
  return s;
}
const CALLOUT_TITEL = { danger: 'Sicherheit', warning: 'Achtung', tip: 'Tipp', info: 'Info', abstract: 'Überblick', question: 'Probieren', example: 'Beispiel' };
function md(text) {
  if (!text) return '';
  const zeilen = String(text).replace(/\r/g, '').split('\n');
  let html = '', i = 0;
  while (i < zeilen.length) {
    const z = zeilen[i];
    if (!z.trim()) { i++; continue; }
    const c = z.match(/^>\s*\[!(\w+)\]([+-]?)\s*(.*)$/);
    if (c) {
      const typ = c[1].toLowerCase(), fold = c[2], titel = c[3] || CALLOUT_TITEL[typ] || typ; const innen = []; i++;
      while (i < zeilen.length && /^>/.test(zeilen[i])) { innen.push(zeilen[i].replace(/^>\s?/, '')); i++; }
      const nieZu = typ === 'danger' || typ === 'question';
      const offen = fold !== '-' && (fold === '' || D.einstellungen.hilfen_offen || nieZu);
      if (fold && !nieZu) html += `<details class="callout c-${esc(typ)}"${offen ? ' open' : ''}><summary>${inline(titel)}</summary><div class="cb">${md(innen.join('\n'))}</div></details>`;
      else html += `<div class="callout c-${esc(typ)}"><div class="ct">${inline(titel)}</div><div class="cb">${md(innen.join('\n'))}</div></div>`;
      continue;
    }
    if (/^>/.test(z)) { const innen = []; while (i < zeilen.length && /^>/.test(zeilen[i])) { innen.push(zeilen[i].replace(/^>\s?/, '')); i++; } html += `<blockquote>${md(innen.join('\n'))}</blockquote>`; continue; }
    const h = z.match(/^(#{2,4})\s+(.*)$/);
    if (h) { const lv = Math.min(4, h[1].length + 1); html += `<h${lv}>${inline(h[2])}</h${lv}>`; i++; continue; }
    if (/^\|/.test(z)) {
      const rows = []; while (i < zeilen.length && /^\|/.test(zeilen[i])) { rows.push(zeilen[i]); i++; }
      const zellen = r => r.trim().replace(/^\||\|$/g, '').split('|').map(x => x.trim());
      const kopf = zellen(rows[0]); const body = rows.slice(rows[1] && /^\|[\s:|-]+\|?$/.test(rows[1].trim()) ? 2 : 1);
      html += `<div class="tabelle-wrap"><table><thead><tr>${kopf.map(x => `<th>${inline(x)}</th>`).join('')}</tr></thead><tbody>${body.map(r => `<tr>${zellen(r).map(x => `<td>${inline(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(z)) {
      const geordnet = /^\s*\d+\./.test(z); const items = [];
      while (i < zeilen.length && /^\s*([-*]|\d+\.)\s+/.test(zeilen[i])) {
        let it = zeilen[i].replace(/^\s*([-*]|\d+\.)\s+/, ''); i++;
        while (i < zeilen.length && /^\s{2,}\S/.test(zeilen[i]) && !/^\s*([-*]|\d+\.)\s+/.test(zeilen[i])) { it += ' ' + zeilen[i].trim(); i++; }
        it = it.replace(/^\[ \]\s*/, '☐ ').replace(/^\[x\]\s*/i, '☑ ');
        items.push(`<li>${inline(it)}</li>`);
      }
      html += geordnet ? `<ol>${items.join('')}</ol>` : `<ul>${items.join('')}</ul>`; continue;
    }
    const absatz = []; while (i < zeilen.length && zeilen[i].trim() && !/^(>|\||#{2,4}\s|\s*([-*]|\d+\.)\s)/.test(zeilen[i])) { absatz.push(zeilen[i].trim()); i++; }
    if (absatz.length) html += `<p>${inline(absatz.join(' '))}</p>`; else { html += `<p>${inline(z)}</p>`; i++; }
  }
  return html;
}

/* ---------- Mengen ---------- */
function fmtMenge(m, einheit) {
  if (m == null) return '';
  let st = 0; if (m < 10 && einheit !== 'g' && einheit !== 'ml') st = 1; if (m < 1) st = 2;
  if ((einheit === 'g' || einheit === 'ml') && m >= 50) m = Math.round(m / 5) * 5;
  return zahlDE(m, st);
}
function skaliereText(s, f) {
  if (!s || Math.abs(f - 1) < 1e-9) return s;
  return s.replace(/(\d+(?:[.,]\d+)?)(\s*)(kg|g|ml|l|EL|TL|Stück|Stk\.|Zehen?|Eier|Ei|Scheiben?|Dosen?|Prisen?)(?![a-zäöüß])/g, (m, n, sp, e) => {
    const v = parseFloat(n.replace(',', '.')) * f; return `⟦${fmtMenge(v, e)}${sp}${e}⟧`;
  });
}
function faktor(r, portionen) { return portionen / (Number(r.meta.portionen) || 1); }

/* ---------- Ableitungen je Rezept ---------- */
const istFleischFisch = z => z && (['fleisch', 'fisch'].includes(z.kategorie) || ['rind', 'gefluegel', 'schwein', 'fisch', 'gemischt'].includes(z.tier_herkunft));
function rezeptInfo(r) {
  const m = r.meta; const zs = r.zutaten.filter(z => z.zutat).map(z => Z[z.zutat]).filter(Boolean);
  const veg = !zs.some(istFleischFisch);
  const pruefen = zs.filter(z => z.tier_herkunft === 'unbekannt' || /Gelatine|Schwein|tierisch|Herkunft|Fleisch/i.test(z.pruef_hinweis || ''));
  const kat = arr(m.kategorien);
  return { veg, pruefen, kat, aktiv: Number(m.zeit_aktiv_min) || null, gesamt: Number(m.zeit_gesamt_min) || null, schwierigkeit: Number(m.schwierigkeit) || null };
}
/* Harte Filter: Ausschlüsse, Ernährungsweise, Allergien, „esse ich nie“ (Logik in ernaehrung.js) */
function ausgeschlossen(r) { return rezeptPruefung(r).hart; }
function geraeteFehlen(r) {
  const g = D.einstellungen.geraete; if (!g) return null;
  return arr(r.meta.geraete_noetig).filter(x => !g.includes(x));
}
function vorratMenge(zid) {
  let menge = 0, unbekannt = false, vorhanden = false;
  for (const v of D.vorrat) {
    if (v.zutat !== zid) continue;
    if (v.verbrauchsdatum && tageBis(v.verbrauchsdatum) < 0) continue;
    vorhanden = true; if (v.menge == null || v.menge === '') unbekannt = true; else menge += Number(v.menge);
  }
  return { vorhanden, menge, unbekannt };
}
function prioritaetsZutaten() {
  const ids = new Set();
  for (const v of D.vorrat) {
    const bald = v.prioritaet === 'bald' || v.prioritaet === 'dringend' || (v.verbrauchsdatum && tageBis(v.verbrauchsdatum) <= 2 && tageBis(v.verbrauchsdatum) >= 0) || v.geoeffnet;
    if (bald) ids.add(v.zutat);
  }
  return ids;
}
function letzteKochung(rid) { const p = D.kochprotokolle.filter(k => k.rezept === rid).sort((a, b) => b.datum.localeCompare(a.datum))[0]; return p || null; }
function tagesSumme(tag) {
  const s = { kcal: 0, protein: 0, kh: 0, fett: 0, eintraege: 0, unvollstaendig: false };
  D.tagebuch.filter(e => e.datum === tag).forEach(e => { s.eintraege++; for (const k of ['kcal', 'protein', 'kh', 'fett']) { if (e.naehr && e.naehr[k] != null) s[k] += e.naehr[k]; else s.unvollstaendig = true; } if (e.status === 'unvollstaendig') s.unvollstaendig = true; });
  return s;
}
function bewerte(r, filter) {
  const info = rezeptInfo(r); const gruende = []; let punkte = 0;
  const notw = r.zutaten.filter(z => z.zutat && z.bedarf === 'notwendig');
  const fehlend = []; let vorhanden = 0;
  notw.forEach(z => { const v = vorratMenge(z.zutat); if (v.vorhanden) vorhanden++; else fehlend.push(Z[z.zutat] ? Z[z.zutat].name : z.text); });
  if (D.vorrat.length) {
    if (!fehlend.length) { gruende.push(['gut', 'Alles Notwendige im Vorrat']); punkte += 40; }
    else if (fehlend.length <= 2) { gruende.push(['info', 'fehlt: ' + fehlend.join(', ')]); punkte += 25 * vorhanden / Math.max(1, notw.length); }
    else { gruende.push(['', `${fehlend.length} Zutaten fehlen`]); punkte += 20 * vorhanden / Math.max(1, notw.length); }
    const prio = prioritaetsZutaten(); const nutzt = [...new Set(r.zutaten.filter(z => prio.has(z.zutat)).map(z => Z[z.zutat].name))];
    if (nutzt.length) { gruende.push(['akzent', 'verbraucht ' + nutzt.join(', ')]); punkte += 20; }
  }
  if (info.aktiv) gruende.push(['', `aktiv ${info.aktiv} Min.` + (info.gesamt ? ` · gesamt ${info.gesamt} Min.` : '')]);
  if (r.meta.vorkochen_kuehlschrank === 'ja') gruende.push(['', `vorkochbar · Kühlschrank ${r.meta.kuehl_max_tage || '2'} Tage`]);
  const lk = letzteKochung(r.id);
  if (lk) { const tage = -tageBis(lk.datum); gruende.push(['', tage === 0 ? 'heute gekocht' : `zuletzt vor ${tage} Tagen gekocht`]); if (tage < 4) punkte -= 10; if (lk.nochmal === 'ja') { gruende.push(['gut', 'wolltest du wieder kochen']); punkte += 10; } if (lk.nochmal === 'nein') punkte -= 15; }
  else if (filter.richtung.includes('lernen')) { gruende.push(['info', 'neu für dich']); punkte += 5; }
  const z = aktuelleZiele(); const np = r.naehrwerte.pro_portion;
  if (z && z.kcal && np.kcal != null) {
    const s = tagesSumme(heute()); const rest = Number(z.kcal) - s.kcal;
    if (s.eintraege && np.kcal <= rest) { gruende.push(['info', `passt in dein restliches Tagesziel (laut Protokoll)`]); punkte += 5; }
  }
  const pr = rezeptPruefung(r);
  if (pr.malus) { punkte -= pr.malus; gruende.push(['', 'enthält ' + pr.abneigung.join(', ')]); }
  if (pr.warn.length) gruende.unshift(['warn', 'Allergene: Etikett prüfen']);
  const kz = Number(D.einstellungen.kochzeit); if (kz && info.aktiv && info.aktiv <= kz) punkte += 5;
  for (const rt of filter.richtung) if (passtRichtung(r, info, rt)) punkte += 15;
  return { info, gruende, punkte, fehlend };
}
function passtRichtung(r, info, rt) { return EIGENSCHAFT[rt] ? EIGENSCHAFT[rt][2](r, info) : true; }

/* ---------- Router ---------- */
const filterZustand = { bereich: '', kuechen: [], richtung: [], maxGesamt: '', maxAktiv: '', suche: '', ohneGeraete: false };
const FILTER_SPEICHER = 'kochschule.filter.v1' + (PROFIL ? '.' + PROFIL : '');
try { Object.assign(filterZustand, JSON.parse(localStorage.getItem(FILTER_SPEICHER)) || {}); } catch (e) { /* gemerkte Filter sind nur Komfort */ }
const scrollPos = {};
/* Bereich der App (für Akzentfarbe): Kochen warm, Ernährung ruhig, Training konzentriert */
const BEREICH_VON_SEITE = { tagebuch: 'ernaehrung', ziele: 'ernaehrung', produkte: 'ernaehrung', training: 'training' };
/* „Weitermachen“: laufendes Kochen, laufendes Training, bald fällige Restportionen */
function weitermachenHtml() {
  const teile = [];
  Object.entries(D.fortschritt || {}).forEach(([rid, fo]) => { const r = R[rid]; if (r) teile.push(`<span class="weiter-gruppe"><a class="weiter-chip" href="#/kochen/${esc(rid)}">${ico('flamme', 'klein')} Weiter kochen: ${esc(kurztitel(r.titel))} · Schritt ${fo.schritt + 1}/${r.schritte.length}</a><button class="weiter-x" data-a="fortschritt-weg" data-v="${esc(rid)}" aria-label="Kochvorgang ${esc(kurztitel(r.titel))} abbrechen">✕ abbrechen</button></span>`); });
  if (D.training && D.training.aktiv) { const e = (D.training.einheiten || []).find(x => x.id === D.training.aktiv); teile.push(`<a class="weiter-chip" href="#/training/${e && e.fuehrung ? 'fuehrung' : 'einheit'}">${ico('hantel', 'klein')} Training fortsetzen</a>`); }
  if (D.mobility && D.mobility.lauf) teile.push(`<a class="weiter-chip" href="#/mobility/lauf">${ico('dehnen', 'klein')} Mobility-Routine fortsetzen</a>`);
  D.restportionen.filter(p => p.portionen > 0 && p.verbrauchen_bis && tageBis(p.verbrauchen_bis) <= 1 && tageBis(p.verbrauchen_bis) >= 0).forEach(p => teile.push(`<a class="weiter-chip" href="#/vorrat">${ico('portion', 'klein')} ${esc(kurztitel(p.titel))}: ${tageBis(p.verbrauchen_bis) === 0 ? 'heute' : 'bis morgen'} essen</a>`));
  return teile.length ? `<div class="weitermachen" role="region" aria-label="Weitermachen">${teile.join('')}</div>` : '';
}
function planTabs(akt) { return `<div class="segment" role="tablist" aria-label="Einkauf"><a role="tab" href="#/planung" aria-selected="${akt === 'planung'}">Mehrere Tage planen</a><a role="tab" href="#/auswahl" aria-selected="${akt === 'auswahl'}">Gerichte${D.auswahl.length ? ' (' + D.auswahl.length + ')' : ''}</a><a role="tab" href="#/einkauf" aria-selected="${akt === 'einkauf'}">Einkaufsliste</a><a role="tab" href="#/preise" aria-selected="${akt === 'preise'}">Preise</a></div>`; }
/* ---------- Drei Hauptbereiche: Food · Training · Mobility – mit Unterreitern und Fortsetzen-Anzeige ---------- */
const FOOD_SEITEN = ['entdecken', 'jetzt', 'meinkochbuch', 'date', 'ablauf', 'preise', 'rezept', 'kochen', 'fertig', 'auswahl', 'einkauf', 'planung', 'vorrat', 'tagebuch', 'ziele', 'produkte', 'zutat', 'technik'];
function hauptBereich(seite) { return FOOD_SEITEN.includes(seite) ? 'food' : seite === 'training' ? 'training' : seite === 'mobility' ? 'mobility' : ''; }
const UNTERREITER = {
  food: [['entdecken', '#/entdecken', 'Kochbuch'], ['tagebuch', '#/tagebuch', 'Tagebuch'], ['einkauf', '#/auswahl', 'Einkauf'], ['vorrat', '#/vorrat', 'Vorrat']],
  training: [['', '#/training', 'Übersicht'], ['plaene', '#/training/plaene', 'Pläne'], ['uebungen', '#/training/uebungen', 'Übungen'], ['verlauf', '#/training/verlauf', 'Verlauf'], ['cardio', '#/training/cardio', 'Cardio']],
  mobility: [['', '#/mobility', 'Routinen'], ['plan', '#/mobility/plan', 'Mein Plan'], ['verlauf', '#/mobility/verlauf', 'Verlauf']]
};
function kopfLeiste(seite, a) {
  const haupt = hauptBereich(seite);
  const zeigeReiter = (haupt === 'food' && ['entdecken', 'tagebuch', 'auswahl', 'einkauf', 'planung', 'vorrat'].includes(seite)) || (haupt === 'training' && (!a || ['plaene', 'uebungen', 'verlauf', 'cardio'].includes(a))) || (haupt === 'mobility' && (!a || ['plan', 'verlauf'].includes(a)));
  if (!zeigeReiter) return '';
  const akt = haupt === 'food' ? (seite === 'auswahl' || seite === 'planung' ? 'einkauf' : seite) : (a || '');
  const nAusw = D.auswahl.length;
  return `${seite === 'kochen' ? '' : weitermachenHtml()}<nav class="unterreiter" aria-label="${haupt === 'food' ? 'Food' : haupt === 'training' ? 'Training' : 'Mobility'}">${UNTERREITER[haupt].map(([k, href, n]) => `<a href="${href}" ${k === akt ? 'aria-current="page"' : ''}>${n}${k === 'einkauf' && nAusw ? ` <b class="zaehl">${nAusw}</b>` : ''}</a>`).join('')}</nav>`;
}
/* Darstellung Hell/Dunkel/Wie Gerät – je Gerät (reine Anzeige-Vorliebe, keine persönlichen Daten); früh gesetzt im Kopf von index.html */
const FARBE_SPEICHER = 'kochschule.farbe.v1';
function farbeWahl() { try { const f = localStorage.getItem(FARBE_SPEICHER); return f === 'hell' || f === 'dunkel' ? f : 'system'; } catch (e) { return 'system'; } }
function farbeAnwenden(f) {
  const r = document.documentElement; if (f === 'hell' || f === 'dunkel') r.dataset.farbe = f; else delete r.dataset.farbe;
  const dunkel = f === 'dunkel' || (f !== 'hell' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => { if (f === 'system') { m.content = /dark/.test(m.media) ? '#171412' : '#fbf8f3'; } else m.content = dunkel ? '#171412' : '#fbf8f3'; });
}
function farbeSetzen(f) { try { if (f === 'system') localStorage.removeItem(FARBE_SPEICHER); else localStorage.setItem(FARBE_SPEICHER, f); } catch (e) { /* privates Fenster: gilt bis zum Schließen */ } farbeAnwenden(f); }
farbeAnwenden(farbeWahl());
function route() {
  rezepteAktualisieren();   // angepasste Mengen (nur für diesen Kochvorgang) wirken überall über R
  const h = location.hash.replace(/^#\/?/, '') || 'entdecken';
  const [seite, a, b] = h.split('/');
  document.body.classList.toggle('kochen', seite === 'kochen');
  const kf = (D.einstellungen && D.einstellungen.kochmodus_farbe) || 'hell';   // Standard hell, wählbar
  document.body.classList.toggle('koch-hell', kf === 'hell'); document.body.classList.toggle('koch-dunkel', kf === 'dunkel');
  // Neue Nutzer (leerer Speicher) sehen einmal die Einrichtung – bestehende nie erzwungen
  if (istNeu && !D.einstellungen.einrichtung && seite !== 'einrichtung' && !sessionStorage.getItem('einr-gezeigt-' + PROFIL)) { try { sessionStorage.setItem('einr-gezeigt-' + PROFIL, '1'); } catch (e) { /* */ } location.replace('#/einrichtung/0'); return; }
  const haupt = hauptBereich(seite);
  $$('.nav a').forEach(n => { const an = n.dataset.nav === haupt; n.classList.toggle('aktiv', an); if (an) n.setAttribute('aria-current', 'page'); else n.removeAttribute('aria-current'); });
  document.body.dataset.bereich = haupt || 'neutral';
  if (route.letzte && location.hash !== route.letzte) { scrollPos[route.letzte] = window.scrollY; if (typeof tbEdit !== 'undefined') tbEdit = null; if (typeof anpassDialog !== 'undefined' && anpassDialog && !location.hash.includes(anpassDialog.rid)) anpassDialog = null; }
  if (seite === 'entdecken') { try { localStorage.setItem(FILTER_SPEICHER, JSON.stringify(filterZustand)); } catch (e) { /* */ } }
  const app = $('#app');
  const views = { entdecken: vEntdecken, rezept: vRezept, kochen: vKochen, fertig: vFertig, auswahl: vAuswahl, einkauf: vEinkauf, vorrat: vVorrat, mehr: vMehr, tagebuch: vTagebuch2, einstellungen: vEinstellungen, daten: vDaten, technik: vTechnik, zutat: vZutat, info: vInfo, einrichtung: vEinrichtung, ziele: vZiele, profile: vProfile, produkte: vProdukte, training: vTraining, mobility: vMobility, planung: vPlanung, meinkochbuch: vMeinKochbuch, date: vDate, ablauf: vAblauf, preise: vPreise, jetzt: vJetzt };
  const fn = views[seite] || vEntdecken;
  app.innerHTML = kopfLeiste(seite, a) + fn(a ? decodeURIComponent(a) : undefined, b);
  if (fn.danach) fn.danach(a ? decodeURIComponent(a) : undefined, b);
  if (location.hash !== route.letzte) { route.letzte = location.hash; const zurueck = ['entdecken', 'training', 'produkte', 'vorrat'].includes(seite) ? scrollPos[location.hash] : 0; window.scrollTo(0, zurueck || 0); }   // neue Seite oben beginnen, Neuzeichnen derselben Seite behält die Position
  ungespeichert = false;
  navZaehler(); zeichneTimer(); updateLeiste();
  setTimeout(bilderVorladen, 1500);
}
/* Fotos der ausgewählten Rezepte vorab in den Bild-Speicher holen (offline beim Kochen verfügbar) */
const vorgeladen = new Set();
function bilderVorladen() { if (!navigator.onLine) return; D.auswahl.forEach(a => { const r = R[a.rezept]; const b = r && r.meta.bild; if (b && !vorgeladen.has(b)) { vorgeladen.add(b); fetch('bilder/' + b).catch(() => vorgeladen.delete(b)); } }); }
function navZaehler() { const n = D.auswahl.length; const el = $('#nav-auswahl'); if (el) { el.hidden = !n; el.textContent = n; } const teile = []; if (speicherFehler) teile.push('⚠ nicht gespeichert');
  if (PROFIL || profilListe().length > 1) teile.push(profilName(PROFIL));
  const rp = D.restportionen.reduce((s, p) => s + (p.portionen > 0 ? p.portionen : 0), 0); if (rp) teile.push(`${zahlDE(rp, 1)} Restportionen`);
  $('#kopf-info').textContent = teile.join(' · '); }

/* ---------- Entdecken ---------- */
let filterOffen = false;
function vEntdecken() {
  const f = filterZustand; const e = D.einstellungen;
  const setup = (!e.einrichtung || e.einrichtung === 'bestehend') && !e.person.ziel ? `<div class="hinweis"><b>Passt die App zu dir?</b> In einer kurzen, freiwilligen Einrichtung legst du Ziel, Ernährungsweise, Allergien und Geräte fest. <a href="#/einrichtung/0">Jetzt einrichten</a></div>` : '';
  const zusatz = aktiveFilter(f).filter(([k]) => !k.startsWith('e:') || !SCHNELLFILTER.includes(k.slice(2))).filter(([k]) => k !== 'suche').length + (f.ohneGeraete ? 1 : 0);
  const sec = (titel, inhalt, hilfe) => `<section class="fsec"><h3>${titel}</h3>${hilfe ? `<p class="leise klein">${hilfe}</p>` : ''}<div class="chips-wrap">${inhalt}</div></section>`;
  const chip = (a, v, n, an, extra = '') => `<button class="filterchip" data-a="${a}" data-v="${esc(v)}" aria-pressed="${an}"${extra}>${esc(n)}</button>`;
  const vorhanden = new Set(K.rezepte.flatMap(rezeptKuechen));
  const kuechen = KUECHEN_GRUPPEN.map(([g, gn, subs]) => { const da = subs.filter(([k]) => vorhanden.has(k)); if (!da.length) return ''; return `<div class="kgruppe">${chip('kueche', g, gn + ' (alle)', f.kuechen.includes(g), ' class="filterchip gruppe"').replace('class="filterchip" ', '')}${da.map(([k, n]) => chip('kueche', k, n, f.kuechen.includes(k) || f.kuechen.includes(g))).join('')}</div>`; }).join('');
  const bereiche = BEREICHE.filter(([id]) => K.rezepte.some(r => r.meta.bereich === id || arr(r.meta.bereiche).includes(id)));
  const zeitSel = (k, werte, titel) => `<label class="feld"><span>${titel}</span><select data-f="${k}"><option value="">egal</option>${werte.map(n => `<option value="${n}" ${String(f[k]) === String(n) ? 'selected' : ''}>${n < 90 ? 'bis ' + n + ' Min.' : 'bis ' + n / 60 + ' Std.'}</option>`).join('')}</select></label>`;
  const keineFilter = !aktiveFilter(f).length;
  return `<div class="seitenkopf"><h1>Kochbuch</h1><a class="knopf haupt klein" href="#/jetzt">Was passt jetzt?</a></div>${setup}
  <div class="kb-suche"><label class="such-feld"><span class="sr-only">Rezepte suchen</span>${ico('suche', 'klein')}<input id="kb-suche" type="search" enterkeyhint="search" autocomplete="off" value="${esc(f.suche)}" placeholder="Gericht, Zutat oder Küche – z. B. Hähnchen, Ramen"></label>
    <button class="kb-filterknopf" data-a="filter-panel" aria-expanded="${filterOffen}">${ico('filter', 'klein')} Filter${zusatz ? ` <span class="zaehl">${zusatz}</span>` : ''}</button></div>
  <div class="chips-wrap schnell" role="group" aria-label="Schnellfilter">${SCHNELLFILTER.map(id => chip('richtung', id, EIGENSCHAFT[id][1], f.richtung.includes(id), EIGENSCHAFT_ERKLAERUNG[id] ? ` title="${esc(EIGENSCHAFT_ERKLAERUNG[id])}"` : '')).join('')}</div>
  ${filterOffen ? `<div class="filterpanel karte" id="kb-filter">
    ${sec('Speisenart', chip('bereich', '', 'alle', !f.bereich) + bereiche.map(([id, n]) => chip('bereich', id, n, f.bereich === id)).join(''))}
    <section class="fsec"><h3>Küche</h3><p class="leise klein">Mehrere gewählt = eine davon genügt.</p>${kuechen}</section>
    <section class="fsec"><h3>Zeit</h3><div class="zeile">${zeitSel('maxAktiv', [10, 15, 20, 30, 45, 60], 'Arbeitszeit')}${zeitSel('maxGesamt', [20, 30, 45, 60, 90, 180, 480], 'Gesamtzeit inkl. Warten')}</div></section>
    ${sec('Merkmale', EIGENSCHAFTEN.filter(([id]) => id !== 'schnell').map(([id, n]) => chip('richtung', id, n, f.richtung.includes(id), EIGENSCHAFT_ERKLAERUNG[id] ? ` title="${esc(EIGENSCHAFT_ERKLAERUNG[id])}"` : '')).join(''), 'Alle gewählten Merkmale müssen zutreffen.')}
    <section class="fsec"><h3>Geräte</h3><label><input type="checkbox" data-f="ohneGeraete" ${f.ohneGeraete ? 'checked' : ''}> auch Rezepte zeigen, für die laut Einstellungen ein Gerät fehlt</label></section>
    <p class="leise klein">Persönliche Ausschlüsse (Allergien, Ernährungsweise, „esse ich nie“) gelten immer zusätzlich. Proteinreich: ${esc(EIGENSCHAFT_ERKLAERUNG.proteinreich)}. Günstig: ${esc(EIGENSCHAFT_ERKLAERUNG.guenstig)}.</p>
    <div class="knopfreihe"><button class="haupt" data-a="filter-panel">Treffer anzeigen</button><button class="still" data-a="filter-reset">Alles zurücksetzen</button></div></div>` : ''}
  ${keineFilter ? meinKochbuchLinksHtml() : ''}
  ${keineFilter ? `<div class="sammlungen" role="group" aria-label="Sammlungen"><a class="sammlung" href="#/date"><b>Date: Menü für zwei</b><span>${K.rezepte.filter(r => r.meta.date_gang).length} Rezepte</span></a>${SAMMLUNGEN.map(([id, n, s]) => { const tmp = Object.assign({ bereich: '', kuechen: [], richtung: [], maxGesamt: '', maxAktiv: '', suche: '' }, s); const zahl = K.rezepte.filter(r0 => { const r = R[r0.id]; return !ausgeschlossen(r).length && filterPasst(r, rezeptInfo(r), tmp); }).length; return zahl ? `<button class="sammlung" data-a="sammlung" data-v="${id}"><b>${esc(n)}</b><span>${zahl} Rezepte</span></button>` : ''; }).join('')}</div>` : ''}
  <div id="kb-ergebnis">${kbErgebnisHtml()}</div>`;
}
function kbErgebnisHtml() {
  const f = filterZustand;
  // Persönliche Ausschlüsse gelten immer; die gewählten Filter kommen zusätzlich dazu
  const alle = K.rezepte.map(r0 => { const r = R[r0.id]; return { r, b: bewerte(r, f), aus: ausgeschlossen(r), ger: geraeteFehlen(r) }; });
  alle.forEach(x => { x.info = x.b.info; });
  const persoenlichOk = x => !x.aus.length && (f.ohneGeraete || !(x.ger && x.ger.length));
  const kandidaten = alle.filter(persoenlichOk);
  const liste = kandidaten.filter(x => filterPasst(x.r, x.info, f));
  const filterOhnePersoenlich = alle.filter(x => filterPasst(x.r, x.info, f));
  const persoenlichAus = filterOhnePersoenlich.filter(x => x.aus.length).length;
  const geraeteAus = filterOhnePersoenlich.filter(x => !x.aus.length && x.ger && x.ger.length).length;
  const sortiert = f.suche ? liste.sort((x, y) => suchRang(y.r, f.suche) - suchRang(x.r, f.suche) || y.b.punkte - x.b.punkte)
    : D.vorrat.length || f.richtung.length ? liste.sort((x, y) => y.b.punkte - x.b.punkte) : liste.sort((x, y) => BEREICHE.findIndex(b => b[0] === x.r.meta.bereich) - BEREICHE.findIndex(b => b[0] === y.r.meta.bereich));
  return `${filterKopfHtml(f, sortiert.length, persoenlichAus, geraeteAus)}${D.vorrat.length && sortiert.length && !f.suche ? '<p class="leise klein">sortiert nach Vorrat und Wunsch</p>' : ''}
  ${sortiert.length ? `<div class="raster karten">${sortiert.map(({ r, b, ger }) => rezeptKarte(r, b, ger)).join('')}</div>` : (f.suche && aktiveFilter(f).length === 1 ? `<div class="leer">${ico('leer')}<p><b>Kein Rezept zu „${esc(f.suche)}“.</b></p><p class="klein">Andere Schreibweise oder eine Zutat versuchen (z. B. „Huhn“, „Linsen“).</p></div>` : lockerungenHtml(f, kandidaten))}`;
}
function filterMerken() { try { localStorage.setItem(FILTER_SPEICHER, JSON.stringify(filterZustand)); } catch (e) { /* */ } }
function rezeptKarte(r, b, ger) {
  const inAuswahl = D.auswahl.some(a => a.rezept === r.id);
  const np = r.naehrwerte.pro_portion; const i = b.info;
  const gruende = b.gruende.filter(([k, t]) => !/^aktiv |^vorkochbar|^zuletzt|^heute gekocht/.test(t)).slice(0, 1);
  const zk = zeitKurz(r);
  return `<article class="rezeptkarte"><a class="rk" href="#/rezept/${esc(r.id)}">${bildHtml(r)}
    <h3>${esc(r.titel)}</h3>
    <span class="meta">${zk ? `<span>${ico('uhr', 'klein')} ${esc(zk)}</span>` : ''}${np.kcal != null ? `<span>${zahlDE(np.kcal)} kcal · ${zahlDE(np.protein)} g Protein <span class="leise">je Portion</span></span>` : ''}<span>${esc([BEREICH_NAME[r.meta.bereich] || '', ...rezeptKuechen(r).map(k => KUECHE_NAME[k])].filter(Boolean).join(' · '))}</span>${r.angepasst ? '<span class="chip akzent">angepasst</span>' : ''}</span>
    ${gruende.length || (ger && ger.length) ? `<span class="chips gruende">${gruende.map(([k, t]) => `<span class="chip ${k}">${esc(t)}</span>`).join('')}${ger && ger.length ? `<span class="chip warn">Gerät fehlt: ${esc(ger.map(g => GERAETE[g] || g).join(', '))}</span>` : ''}</span>` : ''}</a>
    <button class="merken" data-a="auswahl-toggle" data-v="${esc(r.id)}" aria-pressed="${inAuswahl}" aria-label="${inAuswahl ? 'Aus der Auswahl entfernen' : 'Zur Auswahl hinzufügen'}">${inAuswahl ? ico('haken', 'klein') + ' Ausgewählt' : ico('plus', 'klein') + ' Auswahl'}</button></article>`;
}
const pruefText = p => p === 'quellen_geprueft' ? 'quellengeprüft, nicht erprobt' : 'Entwurf, nicht erprobt';

/* ---------- Rezept ---------- */
const portionenWahl = {};
function standardPortionen(r) { const a = D.auswahl.find(x => x.rezept === r.id); if (a) return a.jetzt + a.vorkochen; return portionenWahl[r.id] || Number(r.meta.portionen) || D.einstellungen.portionen || 2; }
function zutatenListe(r, p, mitStatus = true, anpassbar = false) {
  const f = faktor(r, p);
  return `<ul class="zliste">${r.zutaten.map((z, zi) => {
    const menge = z.menge != null ? `${fmtMenge(z.menge * f, z.einheit)} ${esc(z.einheit)}` : esc([z.menge_text, z.einheit].filter(Boolean).join(' '));
    let status = '';
    if (mitStatus && z.zutat) {
      if (z.bedarf === 'grundvorrat') { const gv = D.einstellungen.grundvorrat; status = gv && gv.includes(z.zutat) ? '<span class="status-ja">Grundvorrat</span>' : '<span class="status-nein">Grundvorrat?</span>'; }
      else if (D.vorrat.length) { const v = vorratMenge(z.zutat); status = v.vorhanden ? `<span class="status-ja">${v.unbekannt ? 'im Vorrat' : (z.menge != null && z.einheit === vorratEinheit(z.zutat) && v.menge < z.menge * f ? 'zu wenig' : 'im Vorrat')}</span>` : '<span class="status-nein">fehlt</span>'; }
    }
    const fz = f * (z._m || 1);   // Alltagsmaße gelten für das Original – bei anderer Menge als solche kennzeichnen
    const zus = quellKuerzelWeg([z.alltagsmass && z.alltagsmass !== z.menge_text ? (Math.abs(fz - 1) > 0.01 ? `im Original ${z.alltagsmass}` : z.alltagsmass) : '', z.zustand, z.vorbereitung, z.bedarf === 'optional' ? 'optional' : '', z.ersatz && z.ersatz !== '–' ? 'Ersatz: ' + z.ersatz : ''].filter(Boolean).join(' · '));
    const name = z.zutat && Z[z.zutat] ? `<a href="#/zutat/${esc(z.zutat)}">${esc(z.text)}</a>` : esc(z.text);
    const geaendert = z._ersatz ? ` <span class="chip akzent" title="Ersatz in deiner Variante">statt ${esc(z._ersatz.original)}</span>${z.naehr_status !== 'berechnet' ? ' <span class="ug">Nährwerte unbekannt</span>' : ''}` : z._m && Math.abs(z._m - 1) > 1e-9 ? ` <span class="chip akzent" title="Original: ${esc(fmtMenge(z._orig * f, z.einheit) + ' ' + z.einheit)}">geändert</span>` : '';
    const knopf = anpassbar && z.menge != null ? `<button class="zeilen-knopf" data-a="anp-start" data-r="${esc(r.id)}" data-i="${zi}" aria-label="Menge von ${esc(z.text)} ändern und Rezept anpassen">${ico('stift', 'klein')}</button>` : '';
    return `<li><span class="menge">${menge}</span><span>${name}${geaendert}</span><span>${status}${knopf}</span>${zus ? `<span class="zus">${esc(zus).replace(/\s*\((?:Vorschlag, )?ungeprüft\)/g, ' <span class="ug">ungeprüft</span>')}</span>` : ''}</li>`;
  }).join('')}</ul>`;
}
function vorratEinheit(zid) { const v = D.vorrat.find(x => x.zutat === zid && x.menge != null && x.menge !== ''); return v ? v.einheit : null; }
function naehrBox(r, portionen) {
  const n = r.naehrwerte, p = n.pro_portion;
  const st = { vollstaendig: 'alle Zutaten berechnet', ohne_kleinstmengen: 'ohne Kleinstmengen/Abschmecken', unvollstaendig: 'unvollständig' }[n.status];
  return `<div class="naehr"><div><b>${zahlDE(p.kcal)}</b><span>kcal</span></div><div><b>${zahlDE(p.protein, 1)}</b><span>g Eiweiß</span></div><div><b>${zahlDE(p.kh, 1)}</b><span>g Kohlenh.</span></div><div><b>${zahlDE(p.fett, 1)}</b><span>g Fett</span></div></div>
  <p class="leise klein">pro Portion · Zucker ${zahlDE(p.zucker, 1)} g · Ballaststoffe ${zahlDE(p.ballaststoffe, 1)} g · Salz ${zahlDE(p.salz, 2)} g · <b>${esc(st)}</b>. Schätzung aus allgemeinen BLS-4.0-Werten, nicht aus deinen Packungen.</p>
  <details class="klein"><summary>Wie berechnet?</summary><ul>
    ${n.verwendet.map(v => `<li>${esc(v)}</li>`).join('')}
    ${n.kleinstmengen.length ? `<li>Nicht berechnet (Kleinstmengen/Abschmecken): ${esc(n.kleinstmengen.join(', '))}</li>` : ''}
    ${n.nicht_berechnet.length ? `<li><b>Ohne Werte:</b> ${esc(n.nicht_berechnet.join(', '))}</li>` : ''}
    ${n.ohne.length ? `<li>Nicht enthalten: ${esc(n.ohne.join(', '))}</li>` : ''}
    ${n.mit_optional.length ? `<li>Enthalten, obwohl optional: ${esc(n.mit_optional.join(', '))}</li>` : ''}
    ${n.annahmen.length ? `<li>Annahmen: ${esc(n.annahmen.join('; '))}</li>` : ''}
    ${r.angepasst ? '<li><b>Angepasste Mengen:</b> Beiträge der geänderten Zutaten mit den übernommenen (gerundeten) Mengen neu berechnet; die Liste oben zeigt die Originalmengen.</li>' : ''}
    <li>Summe ÷ ${esc(zahlDE(Number(r.meta.portionen), 1))} Portionen. Genauer wird es, wenn du das fertige Gericht wiegst.</li></ul></details>`;
}
function vorkochBox(r) {
  const m = r.meta;
  const kuehl = m.vorkochen_kuehlschrank === 'ja' ? `Kühlschrank: ja, höchstens ${esc(m.kuehl_max_tage || 2)} Tage ${m.kuehl_beleg ? inline(String(m.kuehl_beleg)) : '(allgemeine BfR-Grenze)'}` : m.vorkochen_kuehlschrank === 'nein' ? 'Kühlschrank: nicht geeignet – frisch essen' : 'Kühlschrank: Eignung nicht belegt';
  const tk = m.vorkochen_tiefkuehl === 'ja' ? `Tiefkühler: ja${m.tk_max_monate ? `, ${esc(m.tk_max_monate)} Monate ${inline(String(m.tk_beleg || ''))}` : ', Dauer nicht belegt'}` : m.vorkochen_tiefkuehl === 'nein' ? 'Tiefkühler: nicht geeignet' : 'Tiefkühler: Eignung und Dauer unbekannt';
  return `<ul class="klein"><li>${kuehl}</li><li>${tk}</li>${m.portionen_pro_durchgang ? `<li>Pfanne/Topf fasst ca. ${esc(m.portionen_pro_durchgang)} Portionen pro Durchgang – mehr Portionen brauchen mehr Durchgänge.</li>` : ''}</ul>`;
}
function schrittFelder(mdText, f, r) {
  const zeilen = mdText.split('\n'); const felder = []; let i = 0;
  while (i < zeilen.length && /^- \*\*[^*]+:\*\*/.test(zeilen[i])) { const m = zeilen[i].match(/^- \*\*([^*]+):\*\*\s*(.*)$/); felder.push([m[1], m[2]]); i++; }
  const rest = zeilen.slice(i).join('\n');
  // Reihenfolge: Zutaten (Mengen) zuerst, dann Zeit/Geräte; „Fertig, wenn“ als eigener, gut sichtbarer Kasten
  const rang = k => k === 'Zutaten' ? 0 : /^Zeit/.test(k) ? 1 : 2;
  const fw = felder.find(([k]) => /^Fertig/.test(k));
  const sicht = felder.filter(([k]) => !/^Fertig/.test(k)).sort((a, b) => rang(a[0]) - rang(b[0]));
  const dl = sicht.length ? `<dl class="felder">${sicht.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${inline(k === 'Zutaten' ? skaliereZutatenText(r, v, f) : v)}</dd>`).join('')}</dl>` : '';
  const fertig = fw ? `<div class="fertig-wenn"><b>${esc(fw[0])}</b> ${inline(fw[1])}</div>` : '';
  return { dl, rest, felder, fertig };
}
function vRezept(id) {
  const r = R[id]; if (!r) return '<p class="leer">Rezept nicht gefunden.</p>';
  zuletztMerken(r.id);
  const m = r.meta, p = standardPortionen(r), f = faktor(r, p), info = rezeptInfo(r), aus = ausgeschlossen(r), ger = geraeteFehlen(r);
  const fort = D.fortschritt[r.id];
  const inAuswahl = D.auswahl.some(a => a.rezept === r.id);
  const quelle = m.herkunft_quelle ? inline(String(m.herkunft_quelle)) : '';
  const schritte = r.schritte.map((s, ix) => { const an = anleitung(s.md); const sf = schrittFelder(an.text, f, r); return `<div class="schritt"><span class="nr" aria-hidden="true">${s.nr != null ? s.nr : '·'}</span><div><h3>${inline(s.titel)}</h3>${sf.dl}${sf.fertig}${md(sf.rest)}${belegeHtml(an)}</div></div>`; }).join('');
  const ein = einleitungTeile(r), ab = abschnitteTeile(r);
  const mdAnl = t => { const an = anleitung(t); return md(an.text) + belegeHtml(an); };
  const pr = rezeptPruefung(r);
  const geraeteText = `${esc(arr(m.geraete_noetig).map(g => GERAETE[g] || g).join(', ') || '–')}${arr(m.geraete_optional).length ? ` <span class="leise">· optional: ${esc(arr(m.geraete_optional).map(g => GERAETE[g] || g).join(', '))}</span>` : ''}`;
  return `<article class="rezept">
  <p class="klein"><a class="knopf still klein" href="#/entdecken">${ico('zurueck', 'klein')} Kochbuch</a></p>
  ${bildHtml(r, 'hero')}
  <div class="rezept-kopf" style="margin-top:14px"><span class="ueber">${esc(BEREICH_NAME[m.bereich] || '')}${rezeptKuechen(r).length ? ' · ' + esc(rezeptKuechen(r).map(k => KUECHE_NAME[k]).join(', ')) : ''}</span><h1>${esc(r.titel)}</h1>
  <div class="eckdaten">${zeitDetailHtml(r)}${info.schwierigkeit ? `<span>${ico('flamme', 'klein')} Schwierigkeit ${info.schwierigkeit} von 5</span>` : ''}</div>
  <div class="chips">${info.veg ? `<span class="chip gut">${istVegan(r) ? 'vegan' : 'vegetarisch'}</span>` : ''}${istProteinreich(r) ? `<span class="chip gut" title="${esc(EIGENSCHAFT_ERKLAERUNG.proteinreich)}">proteinreich</span>` : ''}${m.kosten_klasse ? `<span class="chip" title="${esc(EIGENSCHAFT_ERKLAERUNG.guenstig)}">Kosten: ${esc({ guenstig: 'eher günstig', mittel: 'mittel', hoeher: 'eher höher' }[m.kosten_klasse] || m.kosten_klasse)} (Schätzung)</span>` : ''}${info.pruefen.length ? `<span class="chip warn">prüfen: ${esc(info.pruefen.map(z => z.name).join(', '))}</span>` : ''}</div>
  <details class="herkunft-kurz"><summary><span class="chip">${pruefText(m.pruefstand)}</span> Herkunft und offene Punkte</summary>
    ${herkunftHtml(r)}<p class="klein">${esc({ original_benannter_koch: 'Original eines benannten Kochs, angepasst', angepasste_variante: 'angepasste Variante', restaurantstil: 'Restaurantstil', eigener_entwurf: 'eigener quellenbasierter Entwurf' }[m.herkunftstyp] || '')}${m.koch ? ' · ' + esc(m.koch) : ''}${quelle ? '<br>' + quelle : ''}</p>
    ${ein.herkunft.map(t => md(t)).join('')}
    <p class="leise klein">„Quellengeprüft“ heißt: auf Grundlage gelesener Quellen geschrieben – nicht, dass das Rezept in dieser Form schon gekocht wurde. Mit <span class="ug">ungeprüft</span> markierte Angaben sind eigene Vorschläge ohne direkt gelesene Quelle.</p></details></div>
  ${persoenlichLeisteHtml(r)}
  ${rueckmeldungHinweisHtml(r)}
  ${ein.ueberblick.length ? `<div class="ueberblick">${md(ein.ueberblick.join('\n\n'))}</div>` : ''}
  ${vortagHinweisHtml(r)}
  ${aus.length ? `<div class="hinweis gefahr">Passt nicht zu deinem Profil: ${esc(aus.join(', '))}</div>` : ''}
  ${pr.warn.length ? `<div class="hinweis warn"><b>Allergene:</b> ${esc(pr.warn.join(' · '))}. Die App kann Verträglichkeit nicht garantieren.</div>` : ''}
  ${ger && ger.length ? `<div class="hinweis warn">Laut deinen Einstellungen fehlt: ${esc(ger.map(g => GERAETE[g] || g).join(', '))}</div>` : ''}
  ${ein.sicherheit.map(t => md(t)).join('')}${ab.sicherheit.map(a => `<div class="callout c-danger"><div class="ct">${inline(a.titel)}</div><div class="cb">${mdAnl(a.md)}</div></div>`).join('')}
  ${fort ? `<div class="hinweis">Kochfortschritt gespeichert: Schritt ${fort.schritt + 1} von ${r.schritte.length} (${esc(fort.portionen)} Portionen). <a href="#/kochen/${esc(r.id)}">Weiter kochen</a> · <button class="klein" data-a="fortschritt-weg" data-v="${esc(r.id)}">verwerfen</button></div>` : ''}
  <div class="zweispaltig"><div class="seite">
    <div class="karte"><div class="zeile" style="justify-content:space-between"><strong>Portionen</strong>
      <span class="stepper"><button data-a="port" data-v="-1" data-r="${esc(r.id)}" aria-label="weniger">−</button><output>${p}</output><button data-a="port" data-v="1" data-r="${esc(r.id)}" aria-label="mehr">+</button></span></div>
      <p class="leise klein">${f !== 1 ? `Rezept ist für ${esc(m.portionen)} Portionen geschrieben; Mengen sind ×${zahlDE(f, 2)} umgerechnet.${m.portionen_pro_durchgang && p > m.portionen_pro_durchgang ? ` <b>Mehr Durchgänge nötig</b> (ca. ${esc(m.portionen_pro_durchgang)} Portionen pro Durchgang) – aktive Zeit steigt.` : ''}` : `Originalrezept für ${esc(m.portionen)} Portionen.`}</p>
      <h2 style="margin-top:.6em">Zutaten</h2>${anpassungBannerHtml(r)}${anpassPanelHtml(r)}${zutatenListe(r, p, true, !anpassDialog)}<p class="leise klein">${ico('stift', 'klein')} bei einer Zutat: Menge ändern (z. B. ganze Packung) und das Rezept anpassen.</p>
      <p class="klein"><b>Geräte:</b> ${geraeteText}</p>${ein.geraete.length || geraeteHinweise(r) ? `<details class="klein"><summary>Hinweise zu den Geräten</summary>${ein.geraete.map(t => mdAnl(t)).join('')}${geraeteHinweise(r)}</details>` : ''}
      <div class="knopfreihe"><a class="knopf haupt" href="#/kochen/${esc(r.id)}">${ico('flamme', 'klein')} Kochen starten</a><button data-a="auswahl-toggle" data-v="${esc(r.id)}">${inAuswahl ? ico('haken', 'klein') + ' In der Auswahl' : ico('plus', 'klein') + ' Zur Auswahl'}</button><button class="still" data-a="tb-rezept" data-v="${esc(r.id)}" data-p="1">Als gegessen buchen</button></div>
    </div>
    <div class="karte"><h3 style="margin-top:0">Nährwerte</h3>${naehrBox(r, p)}</div>
    ${passtDazuHtml(r)}
    <div class="karte"><h3 style="margin-top:0">Aufbewahren</h3>${vorkochBox(r)}${ab.aufbewahren ? `<details class="klein"><summary>Abkühlen, Lagern, Aufwärmen im Detail</summary>${mdAnl(ab.aufbewahren.md)}</details>` : ''}</div>
  </div><div>
    <h2>Schritt für Schritt</h2>${ab.ablauf ? `<details class="callout c-abstract"><summary>Ablauf auf einen Blick</summary><div class="cb">${mdAnl(ab.ablauf.md)}</div></details>` : ''}${r.angepasst ? '<p class="hinweis klein">Mengen in den Schritten sind umgerechnet, soweit sie eindeutig einer Zutat zugeordnet werden können. Stück- und Alltagsangaben im Fließtext (z. B. „2 Zehen“) beziehen sich auf das Original – maßgeblich ist die Zutatenliste. Garzeiten und Temperaturen gelten unverändert; nach den Erkennungsmerkmalen garen.</p>' : ''}<div class="schritt-liste">${schritte}</div>
    ${ab.hinweise.map(a => `<details class="abschnitt-zu"><summary>${inline(a.titel)}</summary>${mdAnl(a.md)}</details>`).join('')}
    ${ein.sonst.map(t => md(t)).join('')}
    <details class="abschnitt-zu hintergrund"><summary>Quellen und Hintergrund</summary>
      ${ab.hintergrund.map(a => `<h3>${inline(a.titel)}</h3>${md(a.md)}`).join('')}
      <p class="leise klein">Kennzeichnung im Rezepttext: verlinkte Quelle = direkt gelesen · „abgeleitet“ = aus einer Quelle erklärt · „ungeprüft“ = eigener Vorschlag ohne direkt gelesene Quelle.</p></details>
  </div></div></article>`;
}

function geraeteHinweise(r, alsDetails = false) {
  const h = D.einstellungen.geraete_hinweise || {};
  const ids = [...new Set([...arr(r.meta.geraete_noetig), ...arr(r.meta.geraete_optional), ...arr(r.meta.geraete)])].filter(g => h[g]);
  if (!ids.length) return '';
  const liste = `<ul class="klein">${ids.map(g => `<li><b>${esc(GERAETE[g] || g)}:</b> ${esc(h[g])}</li>`).join('')}</ul>`;
  return alsDetails ? `<details class="callout c-info"><summary>Deine Geräte (lokale Einstellungen)</summary><div class="cb">${liste}</div></details>` : `<div class="hinweis"><b>Deine Geräte</b> (nur auf diesem Gerät gespeichert)${liste}</div>`;
}

/* ---------- Kochmodus ---------- */
let wakeLock = null;
function vKochen(id) {
  const r = R[id]; if (!r) return '<p class="leer">Rezept nicht gefunden.</p>';
  let fort = D.fortschritt[r.id];
  if (!fort) { fort = { schritt: 0, portionen: standardPortionen(r), start: new Date().toISOString() }; D.fortschritt[r.id] = fort; speichern(); }
  const i = Math.min(fort.schritt, r.schritte.length - 1), s = r.schritte[i], f = faktor(r, fort.portionen);
  const an = anleitung(s.md); const sf = schrittFelder(an.text, f, r);
  const zeit = (sf.felder.find(x => x[0].startsWith('Zeit')) || [])[1] || '';
  const mz = zeit.match(/(\d+)(?:\s*[–-]\s*(\d+))?\s*Min/);
  const letzter = i === r.schritte.length - 1;
  return `<div class="koch"><div class="koch-kopf"><a class="knopf still klein" href="#/rezept/${esc(r.id)}">${ico('zurueck', 'klein')} Pause – zum Rezept</a><button class="klein" data-a="kochen-abbrechen" data-v="${esc(r.id)}">✕ Kochen abbrechen</button></div>
  <p class="leise klein">${esc(r.titel)} · ${esc(zahlDE(Number(fort.portionen), 1))} Portionen · Fortschritt wird gespeichert; Abbrechen bucht nichts und zieht keine Zutaten ab${f !== 1 || r.angepasst ? ' · Mengen im Schritt umgerechnet' : ''}${r.angepasst ? ` · <b>angepasst:</b> ${esc(r.angepasst.beschreibung || '')} – maßgeblich ist die Zutatenliste` : ''}
    <span class="kochfarbe" role="group" aria-label="Darstellung im Kochmodus">${[['hell', 'Hell'], ['dunkel', 'Dunkel'], ['system', 'System']].map(([k, n]) => `<button class="klein" data-a="kochfarbe" data-v="${k}" aria-pressed="${((D.einstellungen.kochmodus_farbe || 'hell') === k)}">${n}</button>`).join('')}</span></p>
  <div class="fortschritt"><i style="width:${Math.round(100 * (i + 1) / r.schritte.length)}%"></i></div>
  <p class="leise klein">Schritt ${i + 1} von ${r.schritte.length} · ${esc(s.phase || '')}</p>
  <h1>${s.nr != null ? s.nr + ' · ' : ''}${inline(s.titel)}</h1>
  ${sf.dl}
  ${mz ? `<div class="knopfreihe"><button data-a="timer" data-min="${mz[1]}" data-name="${esc(s.titel)}">⏱ Timer ${mz[1]} Min.</button>${mz[2] ? `<button data-a="timer" data-min="${mz[2]}" data-name="${esc(s.titel)}">⏱ ${mz[2]} Min.</button>` : ''}<span class="leise klein">Zeiten sind Orientierung – entscheidend ist „Fertig, wenn“.</span></div>` : ''}
  ${sf.fertig}
  ${md(sf.rest)}
  ${belegeHtml(an)}
  ${geraeteHinweise(r, true)}
  <details class="klein"><summary>Alle Zutaten (${esc(fort.portionen)} Portionen)</summary>${zutatenListe(r, fort.portionen, false)}</details>
  <div style="height:80px"></div></div>
  <div class="kochnav"><button data-a="schritt" data-v="-1" ${i === 0 ? 'disabled' : ''}>← Zurück</button>${letzter ? `<button class="haupt" data-a="fertig" data-v="${esc(r.id)}">Fertig gekocht ✓</button>` : `<button class="haupt" data-a="schritt" data-v="1">Weiter →</button>`}</div>`;
}
vKochen.danach = async () => { try { if ('wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } } catch (e) { /* nicht unterstützt */ } window.scrollTo(0, 0); };

/* ---------- Nach dem Kochen ---------- */
function vFertig(id) {
  const r = R[id]; if (!r) return '<p class="leer">Rezept nicht gefunden.</p>';
  const fort = D.fortschritt[r.id] || { portionen: standardPortionen(r) };
  const a = D.auswahl.find(x => x.rezept === r.id);
  const gekocht = fort.portionen, jetzt = a ? Math.min(a.jetzt, gekocht) : Math.min(1, gekocht);
  const f = faktor(r, gekocht);
  const abzug = r.zutaten.filter(z => z.zutat && z.menge != null && /^(g|ml)$/.test(z.einheit)).map(z => {
    const v = vorratMenge(z.zutat); return { z, menge: Math.round(z.menge * f), v };
  }).filter(x => x.v.vorhanden);
  return `<h1>Fertig: ${esc(r.titel)}</h1>
  <p class="leise">Drei getrennte Dinge: was <b>gekocht</b> wurde, was vom <b>Vorrat</b> abgeht und was du <b>isst</b>. Nichts passiert ohne „Speichern“.</p>
  <form id="fertig-form" class="karte">
    <div class="zeile"><label class="feld"><span>Gekochte Portionen</span><input type="number" name="gekocht" min="1" max="40" value="${gekocht}"></label>
    <label class="feld"><span>Davon jetzt gegessen</span><input type="number" name="gegessen" min="0" max="40" step="0.5" value="${jetzt}"></label>
    <label class="feld"><span>Rest aufbewahren in</span><select name="lager"><option value="kuehlschrank">Kühlschrank</option><option value="tiefkuehler">Tiefkühler</option></select></label></div>
    <p class="leise klein" id="rest-info"></p>
    <h3>Vom Vorrat abziehen (Vorschlag)</h3>
    ${abzug.length ? `<p class="leise klein">Nur Zutaten, die im Vorrat stehen. Mengen anpassen oder Haken entfernen.</p><ul class="zliste">${abzug.map((x, ix) => `<li><span class="menge"><input type="number" name="abzug-${ix}" value="${x.menge}" min="0" style="width:5.5em"></span><span>${esc(Z[x.z.zutat].name)} <span class="leise klein">(${esc(x.z.einheit)}; im Vorrat: ${x.v.unbekannt ? 'Menge unbekannt' : zahlDE(x.v.menge) + ' ' + esc(vorratEinheit(x.z.zutat) || '')})</span></span><span><input type="checkbox" name="abzug-an-${ix}" checked aria-label="abziehen"></span></li>`).join('')}</ul>` : '<p class="leise klein">Keine passenden Vorratseinträge – nichts abzuziehen.</p>'}
    <details class="rueckmeldung" open><summary><b>Kurze Rückmeldung</b> <span class="leise klein">– optional, alles darf leer bleiben</span></summary>
    ${(() => { const sel = (name, titel, liste) => `<label class="feld"><span>${titel}</span><select name="${name}"><option value="">–</option>${liste.map(([k, t]) => `<option value="${k}">${esc(t)}</option>`).join('')}</select></label>`;
      const dauer = fort.start ? Math.round((Date.now() - new Date(fort.start)) / 60000) : ''; const dauerOk = dauer && dauer > 0 && dauer < 600;
      return `<div class="zeile">${sel('nochmal', 'Wieder kochen?', [['ja', 'ja'], ['vielleicht', 'vielleicht'], ['nein', 'nein']])}${sel('geschmack', 'Geschmack', RM_GESCHMACK)}${sel('konsistenz', 'Konsistenz', RM_KONSISTENZ)}</div>
      <div class="zeile">${sel('portion', 'Portionsgröße', RM_PORTION)}${sel('schwierigkeit', 'Schwierigkeit', RM_SCHWER)}<label class="feld"><span>Tatsächliche Dauer (Min.)</span><input type="number" name="dauer" min="1" max="600" inputmode="numeric" value="${dauerOk ? dauer : ''}" style="width:6em"><small>${dauerOk ? 'seit Kochstart gemessen – bei Pausen anpassen' : ''}</small></label></div>
      <label class="feld"><span>Nächstes Mal ändern</span><input name="aenderung" maxlength="200" placeholder="z. B. weniger Honig, mehr Gemüse"></label>
      <label class="feld"><span>Notiz</span><textarea name="notiz" rows="2"></textarea></label>
      <p class="leise klein">Die Rückmeldung bleibt bei diesem Kochprotokoll. Das Rezept wird nicht automatisch geändert, und eine schlechte Bewertung wird nicht zur allgemeinen Abneigung. Beim nächsten Öffnen des Rezepts erscheint ein kurzer Hinweis.</p>`; })()}</details>
    ${a ? '<label><input type="checkbox" name="ausAuswahl" checked> aus der Auswahl entfernen</label>' : ''}
    <div class="knopfreihe"><button type="submit" class="haupt">Speichern</button><a class="knopf" href="#/kochen/${esc(r.id)}">Zurück zum Kochen</a></div>
  </form>`;
}
function restGrenze(r, lager) {
  const m = r.meta;
  if (lager === 'tiefkuehler') return m.vorkochen_tiefkuehl === 'ja' && m.tk_max_monate ? { bis: plusTage(heute(), Math.round(m.tk_max_monate * 30)), beleg: 'Rezeptangabe' } : { bis: null, beleg: 'Tiefkühl-Dauer nicht belegt – nicht verlängern, regelmäßig prüfen' };
  if (m.vorkochen_kuehlschrank === 'nein') return { bis: heute(), beleg: 'laut Rezept nicht zum Aufbewahren geeignet' };
  const t = m.vorkochen_kuehlschrank === 'ja' && m.kuehl_max_tage ? Number(m.kuehl_max_tage) : 2;
  return { bis: plusTage(heute(), t), beleg: m.vorkochen_kuehlschrank === 'ja' && m.kuehl_max_tage ? 'Rezeptangabe (BfR)' : 'allgemeine BfR-Grenze 2–3 Tage, vorsichtig 2' };
}
vFertig.danach = (id) => {
  const r = R[id]; const form = $('#fertig-form'); if (!form) return;
  const info = () => { const g = Number(form.gekocht.value) || 0, e = Number(form.gegessen.value) || 0, rest = Math.max(0, g - e); const gr = restGrenze(r, form.lager.value); $('#rest-info').textContent = rest ? `${zahlDE(rest, 1)} Restportionen → ${LAGER[form.lager.value]}, ${gr.bis ? 'verbrauchen bis ' + datumDE(gr.bis) : 'Datum offen'} (${gr.beleg}).` : 'Keine Restportionen.'; };
  form.addEventListener('input', info); info();
  form.addEventListener('submit', ev => {
    ev.preventDefault();
    const g = Number(form.gekocht.value) || 0, e = Math.min(g, Number(form.gegessen.value) || 0), lager = form.lager.value;
    const fort = D.fortschritt[r.id] || {};
    const f = faktor(r, fort.portionen || g);
    const abzug = r.zutaten.filter(z => z.zutat && z.menge != null && /^(g|ml)$/.test(z.einheit)).filter(z => vorratMenge(z.zutat).vorhanden);
    aendere('Gespeichert: gekocht, Vorrat, Gegessen', d => {
      const kid = uid('koc');
      const abgezogen = [];
      abzug.forEach((z, ix) => { if (!form['abzug-an-' + ix] || !form['abzug-an-' + ix].checked) return; let rest = Number(form['abzug-' + ix].value) || 0; abgezogen.push({ zutat: z.zutat, menge: rest, einheit: z.einheit });
        for (const v of d.vorrat.filter(v => v.zutat === z.zutat && v.menge != null && v.menge !== '' && v.einheit === z.einheit).sort((a, b) => (b.geoeffnet ? 1 : 0) - (a.geoeffnet ? 1 : 0))) { const nimm = Math.min(rest, Number(v.menge)); v.menge = Math.round((Number(v.menge) - nimm) * 10) / 10; rest -= nimm; if (rest <= 0) break; }
        d.vorrat = d.vorrat.filter(v => !(v.zutat === z.zutat && v.menge !== null && v.menge !== '' && Number(v.menge) <= 0)); });
      d.kochprotokolle.push({ id: kid, rezept: r.id, rezept_version: r.meta.version || 1, datum: heute(), portionen_gekocht: g, portionen_direkt_gegessen: e, vorrat_abzug: abgezogen.length ? 'bestaetigt' : 'keiner', abgezogen, nochmal: form.nochmal.value, geschmack: form.geschmack.value, konsistenz: form.konsistenz.value, portion: form.portion.value, schwierigkeit: form.schwierigkeit.value, dauer_min: Number(form.dauer.value) || null, aenderung: form.aenderung.value.trim(), notiz: form.notiz.value, variante: r.angepasst && r.angepasst.variante ? r.angepasst.variante : null, naehr_pro_portion: r.naehrwerte.pro_portion, naehr_status: r.naehrwerte.status, angepasst: r.angepasst ? { mengen: r.angepasst.mengen, portionen: r.angepasst.portionen, beschreibung: r.angepasst.beschreibung } : null });
      if (e > 0) { const ein = rezeptEintrag(r, e, 'frisch', { kochprotokoll: kid }); ein.datum = heute(); d.tagebuch.push(ein); }
      if (g - e > 0) { const gr = restGrenze(r, lager); d.restportionen.push({ id: uid('rest'), kochprotokoll: kid, rezept: r.id, rezept_version: r.meta.version || 1, titel: r.titel, portionen: g - e, lagerort: lager, gekocht_am: heute(), verbrauchen_bis: gr.bis, grenze_beleg: gr.beleg, naehr_pro_portion: r.naehrwerte.pro_portion, mikro_pro_portion: r.naehrwerte.mikro_pro_portion || null, status: r.naehrwerte.status }); }
      delete d.fortschritt[r.id];
      if (d.anpassungen) delete d.anpassungen[r.id];   // Anpassung galt nur für diesen Kochvorgang; Varianten bleiben
      delete portionenWahl[r.id];
      if (form.ausAuswahl && form.ausAuswahl.checked) d.auswahl = d.auswahl.filter(a => a.rezept !== r.id);
    }, { neuZeichnen: false });
    location.hash = '#/vorrat';
  });
};
const mal = (n, f) => Object.fromEntries(Object.entries(n || {}).map(([k, v]) => [k, v == null ? null : Math.round(v * f * 10) / 10]));

/* ---------- Auswahl (mehrere Gerichte) ---------- */
function vAuswahl() {
  if (!D.auswahl.length) return `<h1>Einkauf</h1>${planTabs('auswahl')}<p class="leer">Noch nichts ausgewählt. Im <a href="#/entdecken">Kochbuch</a> Gerichte mit „+ Auswahl“ hinzufügen – zum Beispiel zwei Gerichte mit mehreren Portionen für die nächsten Tage.</p>`;
  let aktiv = 0, gesamt = 0, warnungen = [];
  const tage = Number(D.planung.tage) || 0;
  const zaehl = {};
  const zeilen = D.auswahl.map((a, ix) => {
    const r = R[a.rezept]; if (!r) return '';
    const p = a.jetzt + a.vorkochen, info = rezeptInfo(r), m = r.meta;
    const durchg = m.portionen_pro_durchgang ? Math.ceil(p / m.portionen_pro_durchgang) : null;
    aktiv += info.aktiv || 0; gesamt = Math.max(gesamt, info.gesamt || 0);
    if (durchg && durchg > 1) warnungen.push(`${r.titel}: ${durchg} Durchgänge in Pfanne/Topf – aktive Zeit steigt (nicht genau berechnet).`);
    if (m.skalierung_max_portionen && p > m.skalierung_max_portionen) warnungen.push(`${r.titel}: mehr als ${m.skalierung_max_portionen} Portionen überschreiten die Gerätegrenze.`);
    if (a.vorkochen > 0) { const gr = restGrenze(r, 'kuehlschrank'); const t = tageBis(gr.bis); if (m.vorkochen_kuehlschrank === 'nein') warnungen.push(`${r.titel}: nicht zum Vorkochen geeignet.`); else if (tage && tage > t) warnungen.push(`${r.titel}: gekocht hält im Kühlschrank bis ${datumDE(gr.bis)} (${gr.beleg}) – für ${tage} Tage reicht das nicht. Später frisch kochen oder einfrieren (Dauer nicht belegt).`); }
    new Set(r.zutaten.filter(z => z.zutat && z.bedarf !== 'grundvorrat').map(z => z.zutat)).forEach(z => { zaehl[z] = (zaehl[z] || 0) + 1; });
    const np = r.naehrwerte.pro_portion;
    return `<div class="karte"><div class="zeile" style="justify-content:space-between"><a href="#/rezept/${esc(r.id)}"><strong>${esc(r.titel)}</strong></a><button class="klein" data-a="auswahl-weg" data-v="${ix}">entfernen</button></div>
      ${a.zu && R[a.zu] ? `<p class="leise klein" style="margin:0">Ergänzung zu <a href="#/rezept/${esc(a.zu)}">${esc(kurztitel(R[a.zu].titel))}</a></p>` : ''}${r.angepasst ? `<p class="klein" style="margin:0"><span class="chip akzent">angepasst</span> ${esc(r.angepasst.beschreibung || '')}</p>` : ''}
      <div class="zeile"><span class="stepper">jetzt <button data-a="aw" data-ix="${ix}" data-k="jetzt" data-v="-1">−</button><output>${a.jetzt}</output><button data-a="aw" data-ix="${ix}" data-k="jetzt" data-v="1">+</button></span>
      <span class="stepper">vorkochen <button data-a="aw" data-ix="${ix}" data-k="vorkochen" data-v="-1">−</button><output>${a.vorkochen}</output><button data-a="aw" data-ix="${ix}" data-k="vorkochen" data-v="1">+</button></span></div>
      <p class="leise klein">aktiv ${info.aktiv || '?'} Min. · gesamt ${info.gesamt || '?'} Min. · ${np.kcal != null ? `≈ ${zahlDE(np.kcal)} kcal, ${zahlDE(np.protein)} g Eiweiß pro Portion` : 'Nährwerte unvollständig'} · Vorkochen: ${m.vorkochen_kuehlschrank === 'ja' ? `Kühlschrank ${m.kuehl_max_tage || 2} Tage` : m.vorkochen_kuehlschrank === 'nein' ? 'nein' : 'nicht belegt'}</p></div>`;
  }).join('');
  const gemeinsam = Object.entries(zaehl).filter(([, n]) => n > 1).map(([z]) => Z[z].name);
  return `<h1>Einkauf</h1>${planTabs('auswahl')}
  <p class="leise">Kein Wochenplan: Wähle Gerichte und Portionen für „jetzt“ und „vorkochen“. Die Einkaufsliste fasst alles zusammen.</p>
  ${zeilen}
  <div class="karte"><label class="feld"><span>Wie viele Tage möchtest du damit versorgt sein? (optional)</span><input type="number" min="0" max="14" data-a="tage" value="${esc(D.planung.tage)}" style="width:6em"></label>
  <ul class="klein"><li>Summe aktive Arbeit ca. <b>${aktiv} Min.</b> (nacheinander; manches läuft parallel). Längste Gesamtzeit: ${gesamt} Min.</li>
  ${gemeinsam.length ? `<li>Gemeinsame Zutaten: ${esc(gemeinsam.join(', '))} – eine Packung reicht eher für beide.</li>` : ''}
  <li><b>Einkaufsreichweite ≠ Lagerdauer:</b> Rohe Zutaten halten je nach Packungsdatum; fertig Gekochtes hält nur so lange wie unten angegeben.</li>
  ${warnungen.map(w => `<li class="status-nein">${esc(w)}</li>`).join('')}</ul>
  ${kostenHtml(D.auswahl.filter(a => R[a.rezept]).map(a => ({ rezept: a.rezept, portionen: a.jetzt + a.vorkochen })), (D.wochenplan && D.wochenplan.einst || {}).budget ?? '', 'beide', true)}
  <div class="knopfreihe"><a class="knopf haupt" href="#/einkauf">🛒 Einkaufsliste</a>${D.auswahl.filter(a => R[a.rezept]).length >= 2 ? '<a class="knopf" href="#/ablauf">Gemeinsamer Kochablauf</a>' : ''}</div></div>`;
}

/* ---------- Einkaufsliste ---------- */
function einkaufsPosten() {
  const posten = {};
  for (const a of D.auswahl) {
    const r = R[a.rezept]; if (!r) continue; const f = faktor(r, a.jetzt + a.vorkochen);
    for (const z of r.zutaten) {
      if (!z.zutat && /^Wasser/i.test(z.text)) continue;
      const key = (z.zutat || z.text) + '|' + (z.menge != null ? z.einheit : 'text');
      const p = posten[key] || (posten[key] = { key, zutat: z.zutat, name: z.zutat && Z[z.zutat] ? Z[z.zutat].name : z.text, einheit: z.einheit, menge: 0, texte: [], bedarf: 'optional', rezepte: [] });
      if (z.menge != null) p.menge += z.menge * f; else p.texte.push([z.menge_text, z.einheit].filter(Boolean).join(' '));
      const rang = { notwendig: 3, grundvorrat: 2, optional: 1 };
      if ((rang[z.bedarf] || 3) > (rang[p.bedarf] || 0)) p.bedarf = z.bedarf || 'notwendig';
      if (!p.rezepte.includes(r.titel)) p.rezepte.push(r.titel);
    }
  }
  return Object.values(posten).map(p => {
    if (p.zutat) { const v = vorratMenge(p.zutat); const ve = vorratEinheit(p.zutat);
      p.vorrat = v; p.fehlt = p.menge;
      if (v.vorhanden && !v.unbekannt && ve === p.einheit) p.fehlt = Math.max(0, p.menge - v.menge);
      if (v.vorhanden && (v.unbekannt || ve !== p.einheit)) p.pruefen = true; }
    else p.fehlt = p.menge;
    return p;
  });
}
function vEinkauf() {
  if (!D.auswahl.length) return `<h1>Einkauf</h1>${planTabs('einkauf')}<p class="leer">Die Einkaufsliste entsteht aus deiner <a href="#/auswahl">Auswahl</a>.</p>`;
  const posten = einkaufsPosten(); const gv = D.einstellungen.grundvorrat;
  const grund = posten.filter(p => p.bedarf === 'grundvorrat' && !(gv && gv.includes(p.zutat)) && !(p.vorrat && p.vorrat.vorhanden));
  const bestaetigt = D.einkauf.bestaetigt;
  const kaufen = posten.filter(p => (p.bedarf === 'notwendig' || (p.bedarf === 'grundvorrat' && grund.includes(p) && bestaetigt[p.key] === 'fehlt')) && !(p.vorrat && p.vorrat.vorhanden && !p.pruefen && p.fehlt <= 0));
  const optional = posten.filter(p => p.bedarf === 'optional' && !(p.vorrat && p.vorrat.vorhanden && !p.pruefen && p.fehlt <= 0));
  const da = posten.filter(p => p.vorrat && p.vorrat.vorhanden && !p.pruefen && p.fehlt <= 0);
  const zeile = p => { const k = D.einkauf.abgehakt[p.key]; const menge = p.menge ? `${fmtMenge(p.fehlt, p.einheit)} ${esc(p.einheit)}` : ''; const txt = p.texte.length ? esc(p.texte.join(' + ')) : '';
    return `<li class="${k ? 'erledigt' : ''}"><input type="checkbox" data-a="abhaken" data-v="${esc(p.key)}" ${k ? 'checked' : ''} aria-label="${esc(p.name)} abhaken"><span>${esc(p.name)}<br><span class="leise klein">${esc(p.rezepte.join(', '))}${p.pruefen ? ' · im Vorrat, Menge prüfen' : ''}${p.vorrat && p.vorrat.vorhanden && p.fehlt < p.menge && !p.pruefen ? ` · ${fmtMenge(p.menge - p.fehlt, p.einheit)} ${esc(p.einheit)} schon da` : ''}</span>${packungsText(p)}</span><span class="ekmenge">${menge}${menge && txt ? ' + ' : ''}${txt}</span></li>`; };
  const gruppiert = liste => LADEN.map((n, ix) => { const g = liste.filter(p => (p.zutat ? ladenbereich(p.zutat) : 10) === ix); return g.length ? `<h3>${esc(n)}</h3><ul>${g.map(zeile).join('')}</ul>` : ''; }).join('');
  const abgehakt = kaufen.concat(optional).filter(p => D.einkauf.abgehakt[p.key]).length;
  return `<h1>Einkauf</h1>${planTabs('einkauf')}<p class="leise">Aus ${D.auswahl.length} Gericht(en), inklusive Vorkoch-Portionen. Vorrat ist abgezogen, wo Einheit und Menge bekannt sind.</p>${einkaufKostenHtml(kaufen.concat(optional))}
  ${grund.length ? `<div class="karte"><h3 style="margin-top:0">Grundzutaten – kurz bestätigen</h3><p class="leise klein">${gv ? 'Nicht in deinem Grundvorrat:' : 'Dein Grundvorrat ist noch nicht erfasst – nichts wird als vorhanden angenommen.'}</p>
    <ul class="ek">${grund.map(p => `<li><span>${esc(p.name)} <span class="leise klein">${p.menge ? fmtMenge(p.menge, p.einheit) + ' ' + esc(p.einheit) : esc(p.texte.join(', '))}</span></span><span class="ekmenge"><button class="klein filterchip" data-a="gv" data-k="${esc(p.key)}" data-v="da" aria-pressed="${bestaetigt[p.key] === 'da'}">habe ich</button> <button class="klein filterchip" data-a="gv" data-k="${esc(p.key)}" data-v="fehlt" aria-pressed="${bestaetigt[p.key] === 'fehlt'}">kaufen</button></span></li>`).join('')}</ul>
    <p class="leise klein"><a href="#/einstellungen">Grundvorrat dauerhaft festlegen</a></p></div>` : ''}
  <div class="karte ek"><h2 style="margin-top:0">Notwendig</h2>${gruppiert(kaufen) || '<p class="leise">Alles Notwendige ist da.</p>'}</div>
  ${optional.length ? `<div class="karte ek"><h2 style="margin-top:0">Optionale Extras</h2>${gruppiert(optional)}</div>` : ''}
  ${da.length ? `<details class="karte"><summary>Schon im Vorrat (${da.length})</summary><ul class="klein">${da.map(p => `<li>${esc(p.name)}</li>`).join('')}</ul></details>` : ''}
  <div class="knopfreihe"><button class="haupt" data-a="einkauf-bestaetigen" ${abgehakt ? '' : 'disabled'}>Gekauft (${abgehakt}) → in den Vorrat</button><button data-a="liste-kopieren">Liste kopieren</button></div>
  <p class="leise klein">Erst „Gekauft“ verändert den Vorrat. Abgehakte Mengen werden als neue Vorratseinträge angelegt (Datum und Lagerort kannst du im Vorrat ergänzen).</p>`;
}

/* ---------- Vorrat & Restportionen ---------- */
function vVorrat() {
  const rest = D.restportionen.filter(p => p.portionen > 0).sort((a, b) => (a.verbrauchen_bis || '9').localeCompare(b.verbrauchen_bis || '9'));
  const gruppen = Object.keys(LAGER).map(l => { const g = D.vorrat.filter(v => (v.lagerort || 'vorratsschrank') === l); return g.length ? `<h3>${LAGER[l]}</h3><ul class="zliste">${g.map(vorratZeile).join('')}</ul>` : ''; }).join('');
  return `<h1>Vorrat</h1>
  <div class="karte"><h2 style="margin-top:0">Fertige Restportionen</h2>
  ${rest.length ? `<ul class="zliste">${rest.map(p => { const t = p.verbrauchen_bis ? tageBis(p.verbrauchen_bis) : null; const st = t == null ? '<span class="chip warn">Dauer offen</span>' : t < 0 ? '<span class="chip gefahr">Grenze überschritten – nicht mehr essen</span>' : t === 0 ? '<span class="chip warn">heute verbrauchen</span>' : `<span class="chip">bis ${datumDE(p.verbrauchen_bis)}</span>`;
    return `<li><span class="menge">${zahlDE(p.portionen, 1)} ×</span><span><a href="#/rezept/${esc(p.rezept)}">${esc(p.titel)}</a><br><span class="leise klein">${LAGER[p.lagerort]} · gekocht ${datumDE(p.gekocht_am)} · ${esc(p.grenze_beleg)}</span></span><span>${st}</span>
    <span class="zus"><button class="klein haupt" data-a="rest-essen" data-v="${esc(p.id)}">1 Portion gegessen</button> <button class="klein" data-a="rest-weg" data-v="${esc(p.id)}">verworfen</button>${p.lagerort === 'kuehlschrank' ? ` <button class="klein" data-a="rest-tk" data-v="${esc(p.id)}">eingefroren</button>` : ''}</span></li>`; }).join('')}</ul>
  <p class="leise klein">Aufwärmen: überall mind. 70 °C für 2 Minuten (BfR).</p>` : '<p class="leise">Keine. Restportionen entstehen nach „Fertig gekocht“.</p>'}</div>
  <div class="karte"><h2 style="margin-top:0">Lebensmittel</h2>
  <form id="vorrat-form" class="zeile">
    <label class="feld" style="flex:2 1 180px"><span>Zutat</span><input name="zutat" list="zutaten-liste" required placeholder="z. B. Brokkoli"></label>
    <label class="feld" style="flex:1 1 80px"><span>Menge (leer = unbekannt)</span><input name="menge" type="number" min="0" step="any"></label>
    <label class="feld" style="flex:0 1 90px"><span>Einheit</span><select name="einheit"><option>g</option><option>ml</option><option>Stück</option></select></label>
    <details style="flex-basis:100%"><summary class="leise">Details</summary><div class="zeile">
      <label class="feld"><span>Lagerort</span><select name="lagerort"><option value="">automatisch</option>${Object.entries(LAGER).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
      <label class="feld"><span>MHD</span><input type="date" name="mhd"></label>
      <label class="feld"><span>Verbrauchsdatum</span><input type="date" name="verbrauchsdatum"></label>
      <label class="feld"><span>Priorität</span><select name="prioritaet"><option value="normal">normal</option><option value="bald">bald verbrauchen</option><option value="dringend">dringend</option></select></label>
      <label><input type="checkbox" name="geoeffnet"> geöffnet</label></div></details>
    <button class="haupt" type="submit">Hinzufügen</button>
  </form>
  <datalist id="zutaten-liste">${K.zutaten.map(z => `<option value="${esc(z.name)}">`).join('')}</datalist>
  ${gruppen || '<p class="leise">Noch leer. Der Vorrat hilft bei Vorschlägen und kürzt die Einkaufsliste – er ist aber keine Pflicht.</p>'}
  <p class="leise klein">MHD ist kein Wegwerfdatum (nach Ablauf prüfen). Nach dem Verbrauchsdatum nicht mehr verwenden.</p></div>
  ${vorratRezepteHtml()}`;
}
/* „Was kann ich damit kochen?“ – Rezepte zu Vorratszutaten; persönliche Ausschlüsse gelten immer */
let vorratFokus = null;
function vorratRezepte(zid) {
  return K.rezepte.map(r0 => R[r0.id]).filter(r => r && !ausgeschlossen(r).length && (zid ? r.zutaten.some(z => z.zutat === zid) : r.zutaten.some(z => z.zutat && vorratMenge(z.zutat).vorhanden))).map(r => {
    const notw = r.zutaten.filter(z => z.zutat && z.bedarf === 'notwendig');
    const fehlt = [...new Set(notw.filter(z => !vorratMenge(z.zutat).vorhanden).map(z => Z[z.zutat] ? Z[z.zutat].name : z.text))];
    let menge = '';
    if (zid) {
      const zeilen = r.zutaten.filter(z => z.zutat === zid && z.menge != null && z.menge !== ''); const einh = zeilen.length ? zeilen[0].einheit : null;
      const bedarf = zeilen.filter(z => z.einheit === einh).reduce((s, z) => s + Number(z.menge), 0); const v = vorratMenge(zid);
      if (einh && bedarf > 0) menge = `${zahlDE(bedarf)} ${einh} nötig` + (vorratEinheit(zid) === einh && !v.unbekannt ? (v.menge >= bedarf ? ' – Vorrat reicht' : ` – im Vorrat ${zahlDE(v.menge)} ${einh}`) : '');
    }
    return { r, fehlt, menge };
  }).sort((a, b) => a.fehlt.length - b.fehlt.length || a.r.titel.localeCompare(b.r.titel, 'de'));
}
function vorratRezepteHtml() {
  if (!D.vorrat.length) return '';
  const optionen = [...new Set(D.vorrat.map(v => v.zutat))].filter(id => Z[id]).sort((a, b) => Z[a].name.localeCompare(Z[b].name, 'de'));
  const zid = optionen.includes(vorratFokus) ? vorratFokus : null; const liste = vorratRezepte(zid);
  const zeige = zid ? liste.slice(0, 12) : liste.filter(x => x.fehlt.length <= 2).slice(0, 8);
  return `<div class="karte"><h2 style="margin-top:0">Was kann ich damit kochen?</h2>
    <div class="filterleiste" role="group" aria-label="Zutat aus dem Vorrat wählen"><button class="filterchip" data-a="vorrat-fokus" data-v="" aria-pressed="${!zid}">ganzer Vorrat</button>${optionen.map(id => `<button class="filterchip" data-a="vorrat-fokus" data-v="${esc(id)}" aria-pressed="${zid === id}">${esc(Z[id].name)}</button>`).join('')}</div>
    ${zeige.length ? `<ul class="zliste">${zeige.map(x => `<li><span class="menge">${x.fehlt.length ? x.fehlt.length + ' fehlt' : 'alles da'}</span><span><a href="#/rezept/${esc(x.r.id)}">${esc(x.r.titel)}</a><br><span class="leise klein">${x.fehlt.length ? 'fehlt: ' + esc(x.fehlt.slice(0, 4).join(', ')) + (x.fehlt.length > 4 ? ' …' : '') : 'alles Notwendige im Vorrat'}${x.menge ? ' · ' + esc(x.menge) + ' (Rezept für ' + esc(x.r.meta.portionen || '?') + ' Portionen)' : ''}</span></span></li>`).join('')}</ul>`
      : `<p class="leise">${zid ? 'Kein Rezept mit dieser Zutat, das zu den persönlichen Ausschlüssen passt.' : 'Noch kein Rezept, bei dem höchstens zwei notwendige Zutaten fehlen – eine Zutat oben antippen zeigt alle Rezepte damit.'}</p>`}
    <p class="leise klein">Zählt nur notwendige Zutaten; persönliche Ausschlüsse gelten immer. Grundzutaten wie Salz oder Öl erscheinen als fehlend, wenn sie nicht im Vorrat stehen. Abgelaufene Verbrauchsdaten zählen nicht als vorhanden.</p></div>`;
}
function vorratZeile(v) {
  const z = Z[v.zutat]; const name = z ? z.name : v.zutat; const marken = [];
  if (v.verbrauchsdatum) { const t = tageBis(v.verbrauchsdatum); marken.push(t < 0 ? '<span class="chip gefahr">Verbrauchsdatum überschritten – nicht mehr verwenden</span>' : t <= 2 ? `<span class="chip warn">verbrauchen bis ${datumDE(v.verbrauchsdatum)}</span>` : `<span class="chip">verbr. bis ${datumDE(v.verbrauchsdatum)}</span>`); }
  if (v.mhd) { const t = tageBis(v.mhd); marken.push(t < 0 ? '<span class="chip warn">MHD überschritten – prüfen</span>' : `<span class="chip">MHD ${datumDE(v.mhd)}</span>`); }
  if (v.geoeffnet) marken.push('<span class="chip warn">geöffnet</span>');
  if (v.prioritaet && v.prioritaet !== 'normal') marken.push(`<span class="chip akzent">${v.prioritaet === 'bald' ? 'bald verbrauchen' : 'dringend'}</span>`);
  return `<li><span class="menge">${v.menge != null && v.menge !== '' ? zahlDE(v.menge, 1) + ' ' + esc(v.einheit) : '?'}</span><span>${esc(name)}</span><span><button class="klein" data-a="vorrat-weg" data-v="${esc(v.id)}" aria-label="${esc(name)} entfernen">✕</button></span>${marken.length ? `<span class="zus">${marken.join(' ')}</span>` : ''}</li>`;
}
vVorrat.danach = () => {
  const form = $('#vorrat-form'); if (!form) return;
  form.addEventListener('submit', ev => { ev.preventDefault(); const z = ZN[form.zutat.value.trim()]; if (!z) { toast('Unbekannte Zutat – bitte aus der Liste wählen.'); return; }
    aendere(`${z.name} im Vorrat`, d => d.vorrat.push({ id: uid('vor'), zutat: z.id, menge: form.menge.value === '' ? null : Number(form.menge.value), einheit: form.einheit.value, lagerort: form.lagerort.value || lagerortFuer(z.id), mhd: form.mhd.value || null, verbrauchsdatum: form.verbrauchsdatum.value || null, prioritaet: form.prioritaet.value, geoeffnet: form.geoeffnet.checked, erfasst: heute() })); });
};

/* ---------- Tagebuch (Gegessen) ---------- */
function vTagebuch() {
  const tage = [...new Set(D.tagebuch.map(e => e.datum))].sort().reverse();
  const ziele = D.einstellungen.ziele;
  const haeufig = Object.values(D.tagebuch.reduce((acc, e) => { const k = e.rezept || e.titel; acc[k] = acc[k] || { e, n: 0 }; acc[k].n++; return acc; }, {})).sort((a, b) => b.n - a.n).slice(0, 4);
  return `<h1>Gegessen</h1>
  <p class="leise">Einfaches Tagebuch für Kalorien und Makros. Summen gelten immer <b>laut bisherigem Protokoll</b> – fehlende Einträge heißen nicht, dass du nichts gegessen hast.</p>
  ${haeufig.length ? `<div class="karte"><h3 style="margin-top:0">Schnell erneut eintragen</h3><div class="knopfreihe">${haeufig.map(({ e }) => `<button class="klein" data-a="tb-kopie" data-v="${esc(e.id)}">${esc(e.titel)} (${zahlDE(e.portionen, 1)})</button>`).join('')}</div></div>` : ''}
  <details class="karte"><summary>Eigenen Eintrag hinzufügen</summary><form id="tb-form"><div class="zeile">
    <label class="feld" style="flex:2 1 200px"><span>Was?</span><input name="titel" required></label>
    <label class="feld"><span>kcal</span><input name="kcal" type="number" min="0" step="any" style="width:6em"></label><label class="feld"><span>Eiweiß g</span><input name="protein" type="number" min="0" step="any" style="width:6em"></label>
    <label class="feld"><span>KH g</span><input name="kh" type="number" min="0" step="any" style="width:6em"></label><label class="feld"><span>Fett g</span><input name="fett" type="number" min="0" step="any" style="width:6em"></label></div>
    <p class="leise klein">Leere Felder bleiben unbekannt (nicht 0).</p><button class="haupt" type="submit">Eintragen</button></form></details>
  ${tage.length ? tage.map(t => { const s = tagesSumme(t); const ein = D.tagebuch.filter(e => e.datum === t);
    return `<div class="karte"><h3 style="margin-top:0">${datumDE(t)}</h3>
      <p><b>${zahlDE(s.kcal)} kcal</b> · ${zahlDE(s.protein, 1)} g Eiweiß · ${zahlDE(s.kh, 1)} g KH · ${zahlDE(s.fett, 1)} g Fett <span class="leise klein">laut bisherigem Protokoll${s.unvollstaendig ? ', teils unvollständig' : ''}</span></p>
      ${ziele && t === heute() ? `<p class="leise klein">Deine Ziele: ${['kcal', 'protein', 'kh', 'fett'].filter(k => ziele[k]).map(k => `${k === 'kcal' ? 'kcal' : k === 'protein' ? 'Eiweiß' : k === 'kh' ? 'KH' : 'Fett'} noch ${zahlDE(ziele[k] - s[k])}`).join(' · ')} (laut bisherigem Protokoll)</p>` : ''}
      <ul class="zliste">${ein.map(e => `<li><span class="menge">${zahlDE(e.portionen, 1)} ×</span><span>${e.rezept ? `<a href="#/rezept/${esc(e.rezept)}">${esc(e.titel)}</a>` : esc(e.titel)}<br><span class="leise klein">${esc(e.zeit || '')} · ${e.naehr && e.naehr.kcal != null ? zahlDE(e.naehr.kcal) + ' kcal' : 'kcal unbekannt'}${e.quelle === 'restportion' ? ' · Restportion' : ''}</span></span><span><button class="klein" data-a="tb-weg" data-v="${esc(e.id)}" aria-label="löschen">✕</button></span></li>`).join('')}</ul></div>`; }).join('') : '<p class="leer">Noch keine Einträge. Sie entstehen beim „Fertig gekocht“, mit „1 Portion gegessen“ bei Restportionen oder hier von Hand.</p>'}`;
}
vTagebuch.danach = () => { const f = $('#tb-form'); if (!f) return; f.addEventListener('submit', ev => { ev.preventDefault(); const n = k => f[k].value === '' ? null : Number(f[k].value);
  aendere('Eingetragen', d => d.tagebuch.push({ id: uid('mz'), datum: heute(), zeit: new Date().toTimeString().slice(0, 5), quelle: 'sonstiges', titel: f.titel.value, portionen: 1, naehr: { kcal: n('kcal'), protein: n('protein'), kh: n('kh'), fett: n('fett') }, status: ['kcal', 'protein', 'kh', 'fett'].every(k => n(k) != null) ? 'vollstaendig' : 'unvollstaendig' })); }); };

/* ---------- Mehr, Einstellungen, Daten ---------- */
function vMehr() {
  const p = D.einstellungen.person || {}; const z = aktuelleZiele();
  const eintrag = (href, titel, text) => `<li><a href="${href}" style="display:flex;justify-content:space-between;gap:12px;text-decoration:none;color:inherit;padding:4px 0"><span><b>${titel}</b><br><span class="leise klein">${text}</span></span>${ico('weiter')}</a></li>`;
  const fw = farbeWahl();
  return `<div class="seitenkopf"><h1>Profil</h1><span class="chip">${esc(profilName(PROFIL))}</span></div>
  <div class="karte farbwahl"><b>Darstellung</b><div class="segment" role="group" aria-label="Darstellung der App">${[['system', 'Wie Gerät'], ['hell', 'Hell'], ['dunkel', 'Dunkel']].map(([k, n]) => `<button data-a="farbe" data-v="${k}" aria-pressed="${fw === k}">${n}</button>`).join('')}</div>
    <p class="leise klein">Gilt für dieses Gerät. „Wie Gerät“ folgt der Hell-/Dunkel-Einstellung von iPhone oder Computer. Den Kochmodus kannst du dort zusätzlich getrennt einstellen.</p></div>
  <ul class="eintraege">
    ${eintrag('#/ziele', 'Ziele', z ? `${z.herkunft}: ${z.kcal ? zahlDE(z.kcal) + ' kcal' : ''}${z.protein ? ' · ' + zahlDE(z.protein) + ' g Protein' : ''}` : 'keine Ziele – optional')}
    ${eintrag('#/einrichtung/0', 'Persönliche Angaben', `${p.ziel ? ZIELE[p.ziel][0] : 'nicht eingerichtet'} · Ernährungsweise: ${esc((WEISEN.find(w => w[0] === (D.einstellungen.ernaehrungsweise || 'alles')) || [])[1] || 'Alles')}${(D.einstellungen.allergien || []).length ? ' · Allergien: ' + D.einstellungen.allergien.length : ''}`)}
    ${eintrag('#/einstellungen', 'Küche und Einstellungen', 'Geräte, Geräte-Hinweise, Grundvorrat, Ausschlüsse, Anzeige')}
    ${eintrag('#/produkte', 'Produkte und eigene Mahlzeiten', `${(D.lebensmittel || []).length} Produkt(e) · ${(D.mahlzeiten || []).length} eigene Mahlzeit(en) – mit Etikettwerten, Barcode und Prüfstatus`)}
    ${eintrag('#/profile', 'Profile auf diesem Gerät', `${profilListe().length} Profil(e) · getrennte Daten, kein Passwortschutz`)}
    ${eintrag('#/daten', 'Daten sichern', `Export, Wiederherstellung, Zwischenstände${D.letzter_export ? ' · letzter Export ' + esc(datumDE(D.letzter_export.slice(0, 10))) : ' · noch nie exportiert'}`)}
    ${eintrag('#/info', 'Über diese App', 'Prüfstand, Quellen, Techniken, Bildnachweise')}
  </ul>
  <div class="karte"><h3 style="margin-top:0">App-Version</h3>
    <p>Installiert: <b id="app-version">${esc(APP_VERSION)}</b> <span class="leise klein">· Stand ${esc(buildText(APP_BUILD))}</span></p>
    <p class="leise klein" id="update-status">${updateStatusText()}</p>
    <div class="knopfreihe" id="update-knoepfe">${updateKnoepfe()}</div></div>`;
}
function vEinstellungen() {
  const e = D.einstellungen;
  const gruppen = ['schwein', 'rind', 'gefluegel', 'fisch', ...new Set(K.zutaten.flatMap(z => z.ausschluss_gruppen || []))].filter((v, i, a) => a.indexOf(v) === i);
  const gName = { schwein: 'nichts vom Schwein (auch Gelatine, Schmalz, Brühe)', rind: 'kein Rind', gefluegel: 'kein Geflügel', fisch: 'kein Fisch' };
  const geraete = [...new Set(K.rezepte.flatMap(r => [...arr(r.meta.geraete_noetig), ...arr(r.meta.geraete_optional)]))];
  const grund = [...new Set(K.rezepte.flatMap(r => r.zutaten.filter(z => z.bedarf === 'grundvorrat' && z.zutat).map(z => z.zutat)))];
  const z = e.ziele || {};
  return `<h1>Einstellungen</h1><form id="einst-form">
  <div class="karte"><h2 style="margin-top:0">Ausschlüsse</h2><p class="leise klein">${e.ausschluesse == null ? 'Noch nicht festgelegt.' : 'Rezepte mit diesen Zutaten werden ausgeblendet; unklare Produkte werden als „prüfen“ markiert.'}</p>
    ${gruppen.map(g => `<label style="display:flex"><input type="checkbox" name="aus" value="${esc(g)}" ${(e.ausschluesse || []).includes(g) ? 'checked' : ''}> ${esc(gName[g] || g)}</label>`).join('')}</div>
  <div class="karte"><h2 style="margin-top:0">Geräte</h2><p class="leise klein">${e.geraete == null ? 'Noch nicht erfasst – Rezepte werden nicht nach Geräten gefiltert.' : 'Rezepte, die ein fehlendes Gerät brauchen, werden ausgeblendet.'}</p>
    ${geraete.map(g => `<label style="display:flex"><input type="checkbox" name="ger" value="${esc(g)}" ${(e.geraete || []).includes(g) ? 'checked' : ''}> ${esc(GERAETE[g] || g)}</label>`).join('')}
    <label style="display:flex;margin-top:8px"><input type="checkbox" name="ger_erfasst" ${e.geraete != null ? 'checked' : ''}> Geräteliste ist vollständig (Filter aktiv)</label>
    <h3>Hinweise zu deinen Geräten</h3><p class="leise klein">Werden in Rezepten und im Kochmodus angezeigt, z. B. welche Herdstufe zu „mittel“ passt oder welches Programm dein Reiskocher hat. Bleiben nur auf diesem Gerät.</p>
    ${['kochfeld', 'pfanne', 'backofen', 'reiskocher', 'kernthermometer'].map(g => `<label class="feld"><span>${esc(GERAETE[g] || g)}</span><textarea name="hinweis_${g}" rows="2">${esc((e.geraete_hinweise || {})[g] || '')}</textarea></label>`).join('')}</div>
  <div class="karte"><h2 style="margin-top:0">Grundvorrat</h2><p class="leise klein">${e.grundvorrat == null ? 'Noch nicht erfasst – die Einkaufsliste fragt dann kurz nach.' : 'Gilt als vorhanden, ohne Menge.'}</p>
    ${grund.map(g => `<label style="display:flex"><input type="checkbox" name="gv" value="${esc(g)}" ${(e.grundvorrat || []).includes(g) ? 'checked' : ''}> ${esc(Z[g] ? Z[g].name : g)}</label>`).join('')}
    <label style="display:flex;margin-top:8px"><input type="checkbox" name="gv_erfasst" ${e.grundvorrat != null ? 'checked' : ''}> Grundvorrat ist erfasst</label></div>
  <p class="leise klein">Ernährungsweise, Allergien und Abneigungen: <a href="#/einrichtung/3">Persönliche Angaben</a> · Ziele: <a href="#/ziele">Ziele</a></p>
  <div class="karte"><h2 style="margin-top:0">Anzeige</h2>
    <label class="feld"><span>Standard-Portionen</span><input type="number" name="portionen" min="1" max="12" value="${e.portionen}" style="width:6em"></label>
    <label style="display:flex"><input type="checkbox" name="hilfen" ${e.hilfen_offen ? 'checked' : ''}> Anfängerhilfen im Rezept aufgeklappt</label></div>
  <button class="haupt" type="submit">Einstellungen speichern</button></form>`;
}
vEinstellungen.danach = () => { const f = $('#einst-form'); f.addEventListener('submit', ev => { ev.preventDefault();
  const werte = n => $$(`input[name="${n}"]:checked`, f).map(x => x.value);
  aendere('Einstellungen gespeichert', d => { const e = d.einstellungen; e.ausschluesse = werte('aus'); e.geraete = f.ger_erfasst.checked ? werte('ger') : null; e.grundvorrat = f.gv_erfasst.checked ? werte('gv') : null;
    const gh = Object.assign({}, e.geraete_hinweise || {}); ['kochfeld', 'pfanne', 'backofen', 'reiskocher', 'kernthermometer'].forEach(g => { const v = f['hinweis_' + g].value.trim(); if (v) gh[g] = v; else delete gh[g]; }); e.geraete_hinweise = gh;
    e.portionen = Number(f.portionen.value) || 2; e.hilfen_offen = f.hilfen.checked; }); }); };

function exportDaten() { return { art: 'kochschule-export', schema: SCHEMA, app_version: APP_VERSION, katalog_version: K.version, exportiert_am: new Date().toISOString(), daten: D }; }
function importiere(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('Keine gültige Datei.');
  if (obj.art === 'kochschule-privat-import') { const e = obj.einstellungen || {}; return { text: `Profil-Import: Ausschlüsse ${(e.ausschluesse || []).join(', ') || '–'}, ${(e.geraete || []).length} Geräte, ${Object.keys(e.geraete_hinweise || {}).length} Geräte-Hinweise. Vorrat, Tagebuch und alle anderen Daten bleiben unverändert.`, anwenden: d => { if (e.ausschluesse) d.einstellungen.ausschluesse = e.ausschluesse; if (e.geraete) d.einstellungen.geraete = e.geraete; if (e.geraete_hinweise) d.einstellungen.geraete_hinweise = Object.assign({}, d.einstellungen.geraete_hinweise || {}, e.geraete_hinweise); } }; }
  if (obj.art === 'fitomat-trainingsplan') return trainingsplanImport(obj);
  if (obj.art !== 'kochschule-export' || !obj.daten || typeof obj.daten.schema !== 'number') throw new Error('Unbekanntes Format (erwartet: kochschule-export).');
  if (obj.daten.schema > SCHEMA) throw new Error('Die Datei stammt von einer neueren App-Version – bitte zuerst die App aktualisieren (Mehr).');
  const x = aufSchemaBringen(JSON.parse(JSON.stringify(obj.daten))); if (!x) throw new Error('Unbekanntes Datenformat.'); return { text: `Sicherung vom ${String(obj.exportiert_am).slice(0, 16).replace('T', ' ')}: ${x.vorrat.length} Vorrat, ${x.restportionen.length} Restportionen, ${x.tagebuch.length} Tagebucheinträge, ${x.kochprotokolle.length} Kochprotokolle, ${x.auswahl.length} in Auswahl, ${arr((x.training || {}).einheiten).length} Trainingseinheiten, ${arr((x.training || {}).plaene).length} Trainingspläne, ${Object.values(x.varianten || {}).reduce((s, l) => s + arr(l).length, 0)} Rezeptvarianten, ${arr((x.kochbuch || {}).favoriten).length} Favoriten, ${arr(x.preise).length} Preise. Ersetzt alle Daten auf diesem Gerät.${(D.training && D.training.aktiv) || Object.keys(D.fortschritt || {}).length ? ' Achtung: Ein laufendes Training bzw. ein gespeicherter Kochfortschritt auf diesem Gerät wird dabei durch den Stand der Datei ersetzt.' : ''}`, anwenden: d => { Object.keys(d).forEach(k => delete d[k]); Object.assign(d, leer(), x); } };
}
function vDaten() {
  return `<h1>Daten sichern</h1>
  <div class="hinweis">Deine Daten liegen <b>nur auf diesem Gerät</b> im Browser. iPhone, iPad und Laptop gleichen sich nicht automatisch ab. Ein Export ist zugleich deine Sicherung.</div>
  <div class="karte"><h2 style="margin-top:0">Exportieren</h2><p class="leise klein">Letzter Export: ${D.letzter_export ? esc(D.letzter_export.slice(0, 16).replace('T', ' ')) : 'noch nie'}</p>
    <div class="knopfreihe"><button class="haupt" data-a="export">Export-Datei speichern</button><button data-a="export-kopie">Als Text kopieren</button></div></div>
  <div class="karte"><h2 style="margin-top:0">Wiederherstellen / Importieren</h2><p class="leise klein">Export-Datei oder <code>privat-import.json</code> (aus dem Vault erzeugt) wählen. Vor dem Ersetzen wird gefragt; danach kannst du rückgängig machen.</p>
    <input type="file" id="import-datei" accept="application/json,.json">
    <details><summary class="leise">oder Text einfügen</summary><textarea id="import-text" rows="4" style="width:100%"></textarea><button data-a="import-text">Text importieren</button></details></div>
  <div class="karte"><h2 style="margin-top:0">Zwischenstände</h2><p class="leise klein">Automatisch angelegt: bei der ersten Änderung des Tages, vor jedem Import, vor „Alles löschen“ und vor einer Wiederherstellung (die letzten 6). Sie liegen im selben Browser-Speicher – wird der Browser-Speicher gelöscht oder die App entfernt, sind sie ebenfalls weg. Nur eine Export-Datei schützt davor.</p>
    ${zwischenstaende().length ? `<ul class="zliste">${zwischenstaende().map((z, ix) => { let n = ''; try { const x = JSON.parse(z.daten); n = `${x.vorrat.length} Vorrat · ${x.tagebuch.length} Tagebuch · ${x.restportionen.filter(p => p.portionen > 0).length} Restportionen`; } catch (e) { n = 'nicht lesbar'; } return `<li><span class="menge klein">${esc(new Date(z.zeit).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }))}</span><span>${esc(z.grund)}<br><span class="leise klein">${esc(n)}</span></span><span><button class="klein" data-a="zs-zurueck" data-v="${ix}">wiederherstellen</button></span></li>`; }).join('')}</ul>` : '<p class="leise">Noch keine.</p>'}</div>
  <div class="karte"><h2 style="margin-top:0">Speicher</h2><p class="leise klein" id="speicher-info">…</p><button data-a="persist">Dauerhaften Speicher anfragen</button></div>
  <div class="karte"><h2 style="margin-top:0">Alles löschen</h2><p class="leise klein">Löscht alle persönlichen Daten auf diesem Gerät. Vorher exportieren.</p><button data-a="alles-loeschen">Alle Daten löschen…</button></div>`;
}
vDaten.danach = async () => {
  const inp = $('#import-datei'); inp.addEventListener('change', async () => { const f = inp.files[0]; if (!f) return; try { importAnwenden(JSON.parse(await f.text())); } catch (e) { toast('Import fehlgeschlagen: ' + e.message); } inp.value = ''; });
  try { const est = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate() : null; const pers = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : null;
    $('#speicher-info').textContent = `Belegt: ca. ${Math.round(JSON.stringify(D).length / 1024)} KB persönliche Daten. Dauerhafter Speicher: ${pers == null ? 'unbekannt' : pers ? 'ja' : 'nein (Browser darf bei Platzmangel löschen)'}.${est ? '' : ''}`; } catch (e) { /* */ }
};
function importAnwenden(obj) { const plan = importiere(obj); if (!confirm(plan.text + '\n\nFortfahren?')) return; zwischenstand('vor Import'); aendere('Import übernommen', plan.anwenden); }
function vInfo() {
  const n = K.rezepte.length;
  return `<h1>Über diese App</h1><div class="karte"><p>Katalog ${esc(K.version)} (${esc(K.erstellt)}) · ${n} Rezepte · ${K.techniken.length} Techniken · ${K.zutaten.length} Zutaten · App ${APP_VERSION}</p>
  <p class="leise klein"><b>Offline:</b> App und alle Rezepttexte sind nach dem ersten Laden ohne Internet nutzbar. Fotos werden gespeichert, sobald du sie einmal angesehen hast; die Fotos der Gerichte in deiner Auswahl lädt die App automatisch vor. Deine Daten liegen nur in diesem Browser – bitte regelmäßig unter Profil → Daten sichern exportieren.</p>
  <p class="leise klein">Alle Rezepte sind <b>Entwürfe</b>: quellenbasiert, aber noch von niemandem in dieser Form gekocht. „Quellengeprüft“ heißt nicht „erprobt“. Nährwerte sind Schätzungen aus allgemeinen BLS-4.0-Werten (Max Rubner-Institut (2025): Bundeslebensmittelschlüssel (BLS), Version 4.0, DOI 10.25826/Data20251217-134202-0; kostenfrei nutzbar). Sicherheitsangaben stammen aus gelesenen Quellen (vor allem BfR); Zeiten sind Orientierung.</p></div>
  <h2>Techniken</h2><div class="raster">${K.techniken.map(t => `<a class="karte rk" href="#/technik/${esc(t.id)}"><h3>${esc(t.titel)}</h3></a>`).join('')}</div>
  <h2>Produktdaten</h2><p class="leise klein">Die Online-Produktsuche und Barcode-Abfrage nutzen <a href="https://de.openfoodfacts.org" target="_blank" rel="noopener">Open Food Facts</a> – Daten unter der <a href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank" rel="noopener">Open Database License (ODbL)</a>, Inhalte unter der Database Contents License. Gesendet werden nur Suchbegriff bzw. Barcode. Übernommene Produkte werden nur in deinem Profil auf diesem Gerät gespeichert. Kuratierte Markenprodukte im Katalog stammen aus Hersteller- und Händlerangaben (je Produkt mit Quelle und Datum).</p>
  <h2>Bildnachweise</h2><p class="leise klein">Die Fotos sind <b>Beispielfotos</b> freier Lizenz von Wikimedia Commons, auf 800 px verkleinert. Sie zeigen ein ähnliches Gericht, nicht das Ergebnis dieses Rezepts. Rezepte ohne passendes freies Foto zeigen eine gestaltete Tellergrafik.</p>
  <ul class="klein">${K.rezepte.filter(r => r.meta.bild).map(r => `<li><a href="#/rezept/${esc(r.id)}">${esc(kurztitel(r.titel))}</a>: ${bildNachweisHtml(r.meta)}</li>`).join('') || '<li class="leise">keine</li>'}</ul>`;
}
function vTechnik(id) { const t = T[id]; if (!t) return '<p class="leer">Technik nicht gefunden.</p>'; return `<p class="leise klein"><a href="javascript:history.back()">← zurück</a></p><h1>${esc(t.titel)}</h1>${md(t.md.replace(/^# .*\n/, ''))}`; }
function vZutat(id) { const z = Z[id]; if (!z) return '<p class="leer">Zutat nicht gefunden.</p>'; const v = vorratMenge(id);
  return `<p class="leise klein"><a href="javascript:history.back()">← zurück</a></p><h1>${esc(z.name)}</h1>${v.vorhanden ? `<p class="chip gut">im Vorrat${v.unbekannt ? '' : ': ' + zahlDE(v.menge) + ' ' + esc(vorratEinheit(id) || '')}</p>` : ''}${z.pruef_hinweis ? `<div class="hinweis warn">Prüfen: ${inline(z.pruef_hinweis)}</div>` : ''}${md(z.md.replace(/^# .*\n/, ''))}
  <h2>In Rezepten</h2><ul>${K.rezepte.filter(r => r.zutaten.some(x => x.zutat === id)).map(r => `<li><a href="#/rezept/${esc(r.id)}">${esc(r.titel)}</a></li>`).join('') || '<li class="leise">–</li>'}</ul>`; }

/* ---------- Timer ---------- */
let timer = []; try { timer = JSON.parse(localStorage.getItem(TIMER_SPEICHER)) || []; } catch (e) { timer = []; }
function timerSpeichern() { try { localStorage.setItem(TIMER_SPEICHER, JSON.stringify(timer)); } catch (e) { /* */ } }
let audioCtx;
function piep() { try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.frequency.value = 880; o.connect(g); g.connect(audioCtx.destination); g.gain.value = .15; o.start(); o.stop(audioCtx.currentTime + .4); } catch (e) { /* */ } if (navigator.vibrate) navigator.vibrate([300, 150, 300]); }
function zeichneTimer() {
  const el = $('#timerleiste'); if (!timer.length) { el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  // Restzeit immer aus dem gespeicherten Endzeitpunkt – App-Wechsel oder ein pausierter Browser verfälschen den Countdown nicht
  el.innerHTML = timer.map(t => { const rest = t.pausiert != null ? t.pausiert : Math.max(0, Math.round((t.ende - Date.now()) / 1000)); const fertig = rest === 0 && t.pausiert == null;
    if (fertig && !t.gemeldet) { t.gemeldet = true; timerSpeichern(); if (t.ton !== false) piep(); }
    const zeit = fertig ? 'fertig!' : `${Math.floor(rest / 60)}:${String(rest % 60).padStart(2, '0')}${t.pausiert != null ? ' (angehalten)' : ''}`;
    if (t.art === 'pause') return `<span class="timer pausetimer ${fertig ? 'fertig' : ''}"><span><b>Pause ${zeit}</b>${t.naechstes ? `<br><small>danach: ${esc(t.naechstes)}</small>` : ''}</span>
      ${fertig ? '' : `<button class="klein" data-a="timer-plus" data-v="${esc(t.id)}" data-s="30">+30</button><button class="klein" data-a="timer-plus" data-v="${esc(t.id)}" data-s="60">+60</button><button class="klein" data-a="timer-halt" data-v="${esc(t.id)}" aria-label="${t.pausiert != null ? 'fortsetzen' : 'anhalten'}">${t.pausiert != null ? '▶' : 'Ⅱ'}</button>`}<button class="klein" data-a="timer-weg" data-v="${esc(t.id)}">${fertig ? 'OK' : 'überspringen'}</button></span>`;
    return `<span class="timer ${fertig ? 'fertig' : ''}">${esc(t.name.slice(0, 28))} · ${zeit}<button class="klein" data-a="timer-weg" data-v="${esc(t.id)}" aria-label="Timer beenden">✕</button></span>`; }).join('');
}
setInterval(zeichneTimer, 1000);

/* ---------- Aktionen ---------- */
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a, v = b.dataset.v;
  if (b.tagName === 'INPUT' && b.type === 'checkbox' && a !== 'abhaken') return;
  const f = filterZustand;
  switch (a) {
    case 'undo': rueckgaengig(); break;
    case 'kochfarbe': aendere(null, d => { d.einstellungen.kochmodus_farbe = v; }); break;
    case 'farbe': farbeSetzen(v); route(); break;
    case 'update-jetzt': updateAnwenden(); break;
    case 'update-suchen': updateSuchen(true); break;
    case 'bereich': f.bereich = v; route(); break;
    case 'filter-panel': filterOffen = !filterOffen; route(); if (!filterOffen) { const k = $('#kb-ergebnis'); if (k) k.scrollIntoView({ block: 'start' }); } break;
    case 'sammlung': { const s = SAMMLUNGEN.find(x => x[0] === v); if (s) { Object.assign(f, { bereich: '', kuechen: [], richtung: [], maxGesamt: '', maxAktiv: '', suche: '' }, JSON.parse(JSON.stringify(s[2]))); route(); } break; }
    case 'richtung': f.richtung = f.richtung.includes(v) ? f.richtung.filter(x => x !== v) : [...f.richtung, v]; route(); break;
    case 'auswahl-toggle': { ev.preventDefault(); const r = R[v]; const drin = D.auswahl.some(x => x.rezept === v);
      aendere(drin ? 'Aus Auswahl entfernt' : `${r.titel} in der Auswahl`, d => { if (drin) d.auswahl = d.auswahl.filter(x => x.rezept !== v); else d.auswahl.push({ rezept: v, jetzt: Math.min(Number(r.meta.portionen) || 2, d.einstellungen.portionen || 2), vorkochen: 0 }); }); break; }
    case 'auswahl-weg': aendere('Entfernt', d => d.auswahl.splice(Number(v), 1)); break;
    case 'aw': aendere(null, d => { const x = d.auswahl[Number(b.dataset.ix)]; x[b.dataset.k] = Math.max(b.dataset.k === 'jetzt' ? 0 : 0, x[b.dataset.k] + Number(v)); if (x.jetzt + x.vorkochen < 1) x.jetzt = 1; }); break;
    case 'port': { const r = R[b.dataset.r]; const a2 = D.auswahl.find(x => x.rezept === r.id); const neu = Math.max(1, standardPortionen(r) + Number(v));
      if (a2) aendere(null, () => { const diff = neu - (a2.jetzt + a2.vorkochen); a2.jetzt = Math.max(1, a2.jetzt + diff); }); else { portionenWahl[r.id] = neu; route(); } break; }
    case 'schritt': { const id = location.hash.split('/')[2]; const r = R[decodeURIComponent(id)]; const fo = D.fortschritt[r.id]; fo.schritt = Math.max(0, Math.min(r.schritte.length - 1, fo.schritt + Number(v))); fo.aktualisiert = new Date().toISOString(); speichern(); route(); window.scrollTo(0, 0); break; }
    case 'fertig': location.hash = '#/fertig/' + encodeURIComponent(v); break;
    case 'fortschritt-weg': aendere('Kochvorgang abgebrochen – nichts gebucht, keine Zutaten abgezogen', d => { delete d.fortschritt[v]; }); break;
    case 'kochen-abbrechen': aendere('Kochvorgang abgebrochen – nichts gebucht, keine Zutaten abgezogen', d => { delete d.fortschritt[v]; }, { neuZeichnen: false }); location.hash = '#/rezept/' + encodeURIComponent(v); break;
    case 'timer': { const min = Number(b.dataset.min); timer.push({ id: uid('t'), name: b.dataset.name || 'Timer', ende: Date.now() + min * 60000 }); timerSpeichern(); zeichneTimer(); toast(`Timer ${min} Min. läuft (nur bei geöffneter App zuverlässig)`); break; }
    case 'timer-weg': timer = timer.filter(t => t.id !== v); timerSpeichern(); zeichneTimer(); break;
    case 'timer-plus': { const t = timer.find(x => x.id === v); if (t) { const s = Number(b.dataset.s) || 30; if (t.pausiert != null) t.pausiert += s; else t.ende = Math.max(t.ende, Date.now()) + s * 1000; t.gemeldet = false; timerSpeichern(); zeichneTimer(); } break; }
    case 'timer-halt': { const t = timer.find(x => x.id === v); if (t) { if (t.pausiert != null) { t.ende = Date.now() + t.pausiert * 1000; t.pausiert = null; } else t.pausiert = Math.max(0, Math.round((t.ende - Date.now()) / 1000)); timerSpeichern(); zeichneTimer(); } break; }
    case 'abhaken': aendere(null, d => { if (b.checked) d.einkauf.abgehakt[v] = true; else delete d.einkauf.abgehakt[v]; }); break;
    case 'gv': aendere(null, d => { d.einkauf.bestaetigt[b.dataset.k] = v; }); break;
    case 'einkauf-bestaetigen': { const posten = einkaufsPosten().filter(p => D.einkauf.abgehakt[p.key]);
      aendere(`${posten.length} Posten in den Vorrat übernommen`, d => { posten.forEach(p => { const pk = packungsInfo(p); if (p.zutat) d.vorrat.push({ id: uid('vor'), zutat: p.zutat, produkt: pk ? pk.l.id : undefined, menge: p.menge ? Math.round(pk ? pk.n * pk.l.packung : p.fehlt) : null, einheit: p.menge ? p.einheit : 'g', lagerort: lagerortFuer(p.zutat), mhd: null, verbrauchsdatum: null, prioritaet: 'normal', geoeffnet: false, erfasst: heute() }); delete d.einkauf.abgehakt[p.key]; }); }); break; }
    case 'liste-kopieren': { const t = einkaufsPosten().filter(p => p.bedarf !== 'grundvorrat' && !(p.vorrat && p.vorrat.vorhanden && !p.pruefen && p.fehlt <= 0)).map(p => `- ${p.name}: ${p.menge ? fmtMenge(p.fehlt, p.einheit) + ' ' + p.einheit : p.texte.join(' + ')}`).join('\n');
      navigator.clipboard ? navigator.clipboard.writeText('Einkaufsliste\n' + t).then(() => toast('Kopiert'), () => toast('Kopieren nicht erlaubt')) : toast('Kopieren nicht unterstützt'); break; }
    case 'tage': break;
    case 'vorrat-fokus': vorratFokus = v || null; route(); break;
    case 'vorrat-weg': aendere('Aus dem Vorrat entfernt', d => { d.vorrat = d.vorrat.filter(x => x.id !== v); }); break;
    case 'rest-essen': { const p = D.restportionen.find(x => x.id === v); if (p.verbrauchen_bis && tageBis(p.verbrauchen_bis) < 0 && !confirm('Die Aufbewahrungsgrenze ist überschritten. Trotzdem als gegessen eintragen?')) break;
      const menge = Math.min(Number(b.dataset.p) || 1, p.portionen); aendere(`${zahlDE(menge, 2)} Restportion gegessen und eingetragen – Zutaten wurden beim Kochen schon abgezogen`, d => { const q = d.restportionen.find(x => x.id === v); q.portionen = Math.max(0, Math.round((q.portionen - menge) * 100) / 100); d.tagebuch.push({ id: uid('mz'), datum: (location.hash.startsWith('#/tagebuch') && typeof tbDatum === 'string' && tbDatum) ? tbDatum : heute(), zeit: new Date().toTimeString().slice(0, 5), quelle: 'restportion', mahlzeit: typeof neuerEintragSlot === 'function' ? neuerEintragSlot() : undefined, restportion: q.id, rezept: q.rezept, titel: q.titel, portionen: menge, einheit: 'Portion', naehr: mal(q.naehr_pro_portion, menge), mikro: q.mikro_pro_portion ? JSON.parse(JSON.stringify(q.mikro_pro_portion)) : null, status: q.status }); if (menge !== 1 && d.tagebuch[d.tagebuch.length - 1].mikro) { const e = d.tagebuch[d.tagebuch.length - 1]; e.mikro = Object.fromEntries(Object.entries(e.mikro).map(([k, x]) => [k, { w: x.w == null ? null : Math.round(x.w * menge * 1000) / 1000, abdeckung: x.abdeckung }])); } }); break; }
    case 'rest-weg': aendere('Restportion als verworfen markiert', d => { const q = d.restportionen.find(x => x.id === v); q.verworfen = q.portionen; q.portionen = 0; }); break;
    case 'rest-tk': aendere('Als eingefroren markiert', d => { const q = d.restportionen.find(x => x.id === v); const r = R[q.rezept]; q.lagerort = 'tiefkuehler'; q.eingefroren_am = heute(); const gr = r ? restGrenze(r, 'tiefkuehler') : { bis: null, beleg: 'Tiefkühl-Dauer nicht belegt' }; q.verbrauchen_bis = gr.bis; q.grenze_beleg = gr.beleg; }); break;
    case 'tb-weg': { const e0 = D.tagebuch.find(x => x.id === v); const rp = e0 && e0.restportion ? D.restportionen.find(x => x.id === e0.restportion) : null;
      aendere(rp ? 'Eintrag gelöscht – Restportion zurückgelegt' : 'Eintrag gelöscht', d => { d.tagebuch = d.tagebuch.filter(x => x.id !== v); if (rp) { const q = d.restportionen.find(x => x.id === rp.id); if (q && !q.verworfen) q.portionen = Math.round((q.portionen + (e0.portionen || 1)) * 100) / 100; } }); break; }
    case 'tb-kopie': { const ziel = (location.hash.startsWith('#/tagebuch') && typeof tbDatum === 'string' && tbDatum) ? tbDatum : heute(); aendere(ziel === heute() ? 'Erneut eingetragen (heute)' : 'Erneut eingetragen (' + datumDE(ziel) + ')', d => { const e = d.tagebuch.find(x => x.id === v); const n2 = JSON.parse(JSON.stringify(e)); Object.assign(n2, { id: uid('mz'), datum: ziel, zeit: new Date().toTimeString().slice(0, 5), quelle: 'kopie', mahlzeit: typeof neuerEintragSlot === 'function' ? neuerEintragSlot() : e.mahlzeit }); delete n2.restportion; delete n2.kochprotokoll; d.tagebuch.push(n2); }); break; }
    case 'export': { const blob = new Blob([JSON.stringify(exportDaten(), null, 1)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const l = document.createElement('a'); l.href = url; l.download = `fitomat-sicherung-${heute()}.json`; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000); aendere('Export erstellt', d => { d.letzter_export = new Date().toISOString(); }); break; }
    case 'export-kopie': navigator.clipboard && navigator.clipboard.writeText(JSON.stringify(exportDaten())).then(() => { aendere('Export als Text kopiert', d => { d.letzter_export = new Date().toISOString(); }); }, () => toast('Kopieren nicht erlaubt')); break;
    case 'import-text': try { importAnwenden(JSON.parse($('#import-text').value)); } catch (e) { toast('Import fehlgeschlagen: ' + e.message); } break;
    case 'persist': navigator.storage && navigator.storage.persist ? navigator.storage.persist().then(ok => { toast(ok ? 'Dauerhafter Speicher gewährt' : 'Browser hat abgelehnt – regelmäßig exportieren'); route(); }) : toast('Nicht unterstützt'); break;
    case 'zs-zurueck': { const z = zwischenstaende()[Number(v)]; if (z && confirm('Diesen Zwischenstand wiederherstellen? Der aktuelle Stand wird vorher ebenfalls als Zwischenstand gesichert.')) { let alt; try { alt = aufSchemaBringen(JSON.parse(z.daten)); } catch (e) { alt = null; } if (!alt) { toast('Dieser Zwischenstand passt nicht zu dieser App-Version.'); break; } zwischenstand('vor Wiederherstellung'); aendere('Zwischenstand wiederhergestellt', d => { Object.keys(d).forEach(k => delete d[k]); Object.assign(d, leer(), alt); }); } break; }
    case 'alles-loeschen': if (confirm('Wirklich alle persönlichen Daten auf diesem Gerät löschen? Vorher wird ein Zwischenstand angelegt (unter „Zwischenstände“ wiederherstellbar, solange der Browser-Speicher nicht gelöscht wird).')) zwischenstand('vor Alles löschen'), aendere('Alle Daten gelöscht', d => { const n = leer(); Object.keys(d).forEach(k => delete d[k]); Object.assign(d, n); }); break;
  }
});
document.addEventListener('change', ev => {
  const el = ev.target;
  if (el.dataset && el.dataset.f) { filterZustand[el.dataset.f] = el.type === 'checkbox' ? el.checked : el.value; route(); }
  if (el.dataset && el.dataset.a === 'tage') aendere(null, d => { d.planung.tage = el.value; });
});
// Kochbuch-Suche: nur die Trefferliste neu zeichnen, damit Tastatur und Fokus bleiben
document.addEventListener('input', ev => { const el = ev.target; if (el.id === 'kb-suche') { filterZustand.suche = el.value; clearTimeout(el._t); el._t = setTimeout(() => { filterMerken(); const k = $('#kb-ergebnis'); if (k) k.innerHTML = kbErgebnisHtml(); const sm = $('.sammlungen'); if (sm) sm.hidden = !!filterZustand.suche; }, 200); } });
window.addEventListener('hashchange', () => { route(); if (!location.hash.startsWith('#/kochen') && wakeLock) { wakeLock.release(); wakeLock = null; } });
window.addEventListener('storage', e => { if (e.key === SPEICHER) { D = laden(); route(); } });
document.addEventListener('visibilitychange', async () => { if (document.visibilityState === 'visible' && location.hash.startsWith('#/kochen') && !wakeLock && 'wakeLock' in navigator) { try { wakeLock = await navigator.wakeLock.request('screen'); } catch (e) { /* */ } } });

/* ---------- App-Updates ----------
   Beim Öffnen und bei jeder Rückkehr in die App (mit Internet) wird nach einer veröffentlichten Version gesucht.
   Eine gefundene Version lädt im Hintergrund und wartet; gewechselt wird nur nach Tippen auf „Jetzt aktualisieren“
   (oder beim nächsten kompletten Neustart der App). Während des Kochens wird der Hinweis nicht gezeigt. */
const SW_OK = 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1');
const UP = { reg: null, wartend: null, neu: null, geprueft: null, fehler: false, sucht: false, wechsel: false };
let ungespeichert = false;
function buildText(b) { const m = String(b || '').match(/^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)$/); return m ? `${m[3]}.${m[2]}.${m[1]} ${m[4]}:${m[5]}` : String(b || '–'); }
function updateStatusText() {
  if (!SW_OK) return 'Automatische Updates und Offline-Nutzung sind in diesem Browser nicht verfügbar.';
  if (UP.wartend && !UP.still) return `Update verfügbar${UP.neu && UP.neu.version ? ': Version ' + esc(UP.neu.version) : ''}${UP.neu && UP.neu.build ? ' (' + esc(buildText(UP.neu.build)) + ')' : ''}. Deine Daten bleiben erhalten.`;
  if (!navigator.onLine) return 'Offline – du nutzt die installierte Version. Nach Updates wird gesucht, sobald wieder Internet da ist.';
  if (UP.sucht) return 'Suche nach Updates …';
  if (UP.fehler) return 'Update-Suche gerade nicht möglich – die installierte Version funktioniert weiter.';
  return UP.geprueft ? `Aktuell. Zuletzt geprüft ${UP.geprueft.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}.` : 'Noch nicht geprüft.';
}
function updateKnoepfe() { if (!SW_OK) return ''; return UP.wartend && !UP.still ? '<button class="haupt" data-a="update-jetzt">Jetzt aktualisieren</button>' : '<button data-a="update-suchen">Nach Updates suchen</button>'; }
function updateLeiste() {
  const el = $('#update'); if (!el) return;
  const seite = (location.hash.replace(/^#\/?/, '') || 'entdecken').split('/')[0];
  const zeigen = !!UP.wartend && !UP.still && seite !== 'kochen' && seite !== 'fertig' && !(D.training && D.training.aktiv);   // nie mitten im Kochen oder Training
  if (zeigen && el.hidden) el.innerHTML = '<span>Update verfügbar</span><button class="haupt" data-a="update-jetzt">Jetzt aktualisieren</button>';
  el.hidden = !zeigen;
  const st = $('#update-status'); if (st) st.innerHTML = updateStatusText();
  const kn = $('#update-knoepfe'); if (kn) kn.innerHTML = updateKnoepfe();
}
function wartendPruefen() {
  const w = UP.reg && UP.reg.waiting;
  if (!w || !navigator.serviceWorker.controller) return;
  if (w !== UP.wartend) {
    UP.wartend = w; UP.neu = null;
    // Läuft der Code dieser Version schon (Umstieg vom alten Verfahren), still aktivieren – kein Hinweis, kein Neuladen
    const ch = new MessageChannel(); ch.port1.onmessage = e => { UP.neu = e.data; if (e.data && e.data.build === APP_BUILD) { UP.still = true; w.postMessage({ typ: 'aktivieren' }); } updateLeiste(); };
    w.postMessage({ typ: 'version' }, [ch.port2]);
  }
  updateLeiste();
}
let letzteSuche = 0;
async function updateSuchen(manuell = false) {
  if (!UP.reg) return;
  if (!manuell && Date.now() - letzteSuche < 60000) return;
  if (!navigator.onLine) { updateLeiste(); if (manuell) toast('Offline – die installierte Version läuft weiter.'); return; }
  letzteSuche = Date.now(); UP.sucht = true; updateLeiste();
  try { await UP.reg.update(); UP.fehler = false; UP.geprueft = new Date(); } catch (e) { UP.fehler = true; }
  UP.sucht = false;
  // Eine gefundene Version lädt noch – „installed“ meldet sich über updatefound/statechange
  wartendPruefen(); updateLeiste();
  if (manuell && !UP.wartend && !UP.reg.installing) toast(UP.fehler ? 'Gerade keine Verbindung zum Update-Server.' : 'Du hast die aktuelle Version.');
}
function updateAnwenden() {
  if (!UP.wartend || UP.still) return;
  if (ungespeichert && !confirm('Auf dieser Seite gibt es noch nicht gespeicherte Eingaben. Sie gehen beim Aktualisieren verloren.\n\nTrotzdem jetzt aktualisieren?')) return;
  UP.wechsel = true;
  UP.wartend.postMessage({ typ: 'aktivieren' });
  setTimeout(() => { if (UP.wechsel) location.reload(); }, 4000);   // falls controllerchange ausbleibt
}
// Nur möglich ohne Offline-Speicher (erster Besuch) während eine Veröffentlichung noch hochgeladen wird
if (K.version && K.version !== APP_BUILD) setTimeout(() => toast('App und Katalog stammen gerade aus verschiedenen Ständen (Update wird hochgeladen). Bitte in ein paar Minuten neu laden – deine Daten bleiben erhalten.'), 1500);
if (SW_OK) {
  const hatteSteuerung = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then(reg => {
    UP.reg = reg; wartendPruefen();
    const beobachte = n => { if (n) n.addEventListener('statechange', () => { if (n.state === 'installed') wartendPruefen(); }); };
    beobachte(reg.installing); reg.addEventListener('updatefound', () => beobachte(reg.installing));
    updateSuchen();
  }).catch(e => console.warn('SW', e));
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (UP.wechsel) { UP.wechsel = false; location.reload(); return; }
    if (UP.still) { UP.still = false; UP.wartend = null; UP.neu = null; updateLeiste(); return; }
    // in einem anderen Tab aktualisiert: diese Seite läuft noch mit der alten Version
    if (hatteSteuerung) { UP.wartend = null; updateLeiste(); toast('Neue App-Version ist aktiv. Bitte neu laden, sobald es passt – deine Daten bleiben erhalten.'); }
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') updateSuchen(); });
  window.addEventListener('online', () => updateSuchen());
  window.addEventListener('offline', updateLeiste);
  setInterval(() => { if (document.visibilityState === 'visible') updateSuchen(); }, 30 * 60000);
}
// Ungespeicherte Eingaben merken (Formulare; Filter und Haken speichern sofort und zählen nicht)
document.addEventListener('input', ev => { const el = ev.target; if (el.closest && el.closest('#app') && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && !(el.dataset && (el.dataset.f || el.dataset.a)) && el.type !== 'file') ungespeichert = true; });
if (migriert) { speichern(); setTimeout(() => toast(`Datenformat aktualisiert – deine Daten sind übernommen (Sicherung unter Mehr › Daten sichern › Zwischenstände).`), 300); }
if (ladeProblem) setTimeout(() => toast(ladeProblem), 500);
window.KS = { D: () => D, exportDaten, importiere, einkaufsPosten, bewerte, R, Z };
route();
