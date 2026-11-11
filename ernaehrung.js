/* Kochschule – Modul „Ernährung & Profil“ (ab v2.0)
   Profile auf einem Gerät, Ersteinrichtung, nachvollziehbare Ziele, Tagebuch, eigene Lebensmittel, Bilder.
   Wird VOR app.js geladen; nutzt deren Funktionen (D, aendere, esc, md …) erst zur Laufzeit. Keine Server, keine KI. */
'use strict';

/* ---------- Symbole ---------- */
const ico = (n, k = '') => `<svg class="ico ${k}" aria-hidden="true"><use href="#i-${n}"/></svg>`;

/* ---------- Profile auf demselben Gerät ----------
   Jedes Profil hat eigene Speicherschlüssel. Ein Profilwechsel ist KEIN Passwortschutz. */
const PROFILE_SPEICHER = 'kochschule.profile.v1';
const AKTIV_SPEICHER = 'kochschule.aktivesProfil.v1';
function profilListe() {
  try { const l = JSON.parse(localStorage.getItem(PROFILE_SPEICHER)); if (Array.isArray(l) && l.length) return l; } catch (e) { /* */ }
  return [{ id: '', name: 'Hauptprofil' }];
}
function aktivesProfilId() { try { const a = localStorage.getItem(AKTIV_SPEICHER) || ''; return profilListe().some(p => p.id === a) ? a : ''; } catch (e) { return ''; } }
function profilName(id) { const p = profilListe().find(x => x.id === id); return p ? p.name : (id ? 'Profil „' + id + '“' : 'Hauptprofil'); }

/* ---------- Ernährungsweise, Allergene, Abneigungen ---------- */
const ALLERGENE = [['gluten', 'Gluten (Weizen, Roggen, Gerste, Hafer)'], ['krebstiere', 'Krebstiere'], ['ei', 'Eier'], ['fisch', 'Fisch'], ['erdnuss', 'Erdnüsse'], ['soja', 'Soja'], ['milch', 'Milch (inkl. Laktose)'], ['schalenfruechte', 'Schalenfrüchte (Nüsse)'], ['sellerie', 'Sellerie'], ['senf', 'Senf'], ['sesam', 'Sesam'], ['sulfite', 'Sulfite'], ['lupinen', 'Lupinen'], ['weichtiere', 'Weichtiere']];
const ALLERGEN_NAME = Object.fromEntries(ALLERGENE);
const WEISEN = [['alles', 'Alles', ''], ['ohne_schwein', 'Ohne Schwein', 'auch keine Gelatine, kein Schmalz'], ['pescetarisch', 'Pescetarisch', 'Fisch ja, kein Fleisch'], ['vegetarisch', 'Vegetarisch', 'kein Fleisch, kein Fisch'], ['vegan', 'Vegan', 'nichts Tierisches']];
const ABNEIGUNG = { 1: 'mag ich nicht so', 2: 'meide ich', 3: 'esse ich nie' };
function effektiveAusschluesse() {
  const e = D.einstellungen; const s = new Set(e.ausschluesse || []);
  const w = e.ernaehrungsweise;
  if (w === 'ohne_schwein') s.add('schwein');
  if (w === 'pescetarisch' || w === 'vegetarisch' || w === 'vegan') ['schwein', 'rind', 'gefluegel', 'gemischt'].forEach(x => s.add(x));
  if (w === 'vegetarisch' || w === 'vegan') s.add('fisch');
  return [...s];
}
/* Prüft eine Zutat gegen Profil: hart = darf nicht vorkommen; warn = Etikett prüfen; malus = Abwertung */
function zutatPruefung(z) {
  const e = D.einstellungen; const r = { hart: [], warn: [], malus: 0 };
  if (!z) return r;
  const aus = effektiveAusschluesse(); const gruppen = [z.tier_herkunft, ...(z.ausschluss_gruppen || [])];
  if (gruppen.some(g => aus.includes(g))) r.hart.push(z.name);
  if (e.ernaehrungsweise === 'vegan' && (z.vegan === false || ['milch', 'ei'].includes(z.kategorie))) r.hart.push(z.name + ' (nicht vegan)');
  for (const a of (e.allergien || [])) {
    if ((z.allergene || []).includes(a)) { const an = ALLERGEN_NAME[a] || a; r.hart.push(an.toLowerCase().startsWith(z.name.toLowerCase()) ? `${z.name} (Allergen)` : `${z.name} (${an})`); }
    else if ((z.allergene_moeglich || []).includes(a)) r.warn.push(`${z.name}: kann ${ALLERGEN_NAME[a] || a} enthalten – Etikett prüfen`);
  }
  const ab = (e.abneigungen || {})[z.id];
  if (ab === 3) r.hart.push(z.name + ' (isst du nie)'); else if (ab === 2) r.malus += 25; else if (ab === 1) r.malus += 8;
  return r;
}
function rezeptPruefung(r) {
  const erg = { hart: [], warn: [], malus: 0, abneigung: [] };
  for (const zr of r.zutaten) {
    const z = Z[zr.zutat]; if (!z) continue;
    const p = zutatPruefung(z);
    // Ausschluss über Ersatz nur, wenn die Zutat optional ist und ein Ersatz genannt ist
    if (p.hart.length && !(zr.bedarf === 'optional')) erg.hart.push(...p.hart);
    erg.warn.push(...p.warn); erg.malus += p.malus;
    const ab = (D.einstellungen.abneigungen || {})[z.id]; if (ab && ab < 3) erg.abneigung.push(z.name);
  }
  erg.hart = [...new Set(erg.hart)]; erg.warn = [...new Set(erg.warn)];
  return erg;
}

/* ---------- Ziele (Methode: Vault-Notiz „Ernährungsziele – Methode“) ---------- */
const PAL_ALLTAG = { sitzend: [1.4, 'überwiegend sitzend (Büro), sonst wenig Bewegung'], gemischt: [1.6, 'sitzend, aber zeitweise gehend oder stehend'], stehend: [1.8, 'überwiegend gehend oder stehend (z. B. Verkauf, Handwerk)'], schwer: [2.0, 'körperlich schwere Arbeit'] };
const TRAINING = { keins: [0, 'kein regelmäßiger Sport'], wenig: [0.15, '1–3 Einheiten pro Woche (30–60 Min.)'], regelmaessig: [0.3, '4–5 Einheiten pro Woche (30–60 Min.)'], viel: [null, 'mehr als 5 Einheiten oder Leistungssport'] };
const ZIELE = { aufbau: ['Muskelaufbau', 0.10], halten: ['Gewicht halten', 0], abbau: ['Fettabbau', -0.10], keins: ['Nur kochen, kein Ziel', null] };
const rund = (x, s) => Math.round(x / s) * s;
function zielBerechnung(p = D.einstellungen.person || {}) {
  const grund = [];
  if (!p.ziel || p.ziel === 'keins') grund.push('kein Ernährungsziel gewählt');
  if (!(p.alter >= 19)) grund.push('Die automatische Formel gilt nur für Erwachsene ab 19 Jahren.');
  if (p.geschlecht !== 'w' && p.geschlecht !== 'm') grund.push('Die DGE-Formel unterscheidet Frauen und Männer – ohne diese Angabe bitte Ziele manuell eintragen.');
  if (!(p.gewicht > 30 && p.gewicht < 300)) grund.push('Körpergewicht fehlt.');
  if (p.besonders) grund.push('Bei Schwangerschaft, Stillzeit oder Erkrankungen rechnet die App nicht automatisch – bitte manuell und ggf. mit Fachberatung.');
  if (p.training === 'viel') grund.push('Für sehr viel Training bzw. Leistungssport gibt es hier keine Standardformel – bitte manuell.');
  if (!p.alltag) grund.push('Alltagsaktivität fehlt.');
  if (grund.length) return { ok: false, grund };
  const ree = (0.047 * p.gewicht + (p.geschlecht === 'm' ? 1.009 : 0) - 0.01452 * p.alter + 3.21) * 239;
  const palA = PAL_ALLTAG[p.alltag][0], palT = TRAINING[p.training || 'keins'][0];
  const pal = Math.round((palA + palT) * 100) / 100;
  const gesamt = ree * pal;
  const zf = ZIELE[p.ziel][1]; const abbauStufe = p.ziel === 'abbau' ? (p.defizit || 0.10) : null;
  const faktorZiel = p.ziel === 'abbau' ? -abbauStufe : zf;
  const kcal = rund(gesamt * (1 + faktorZiel), 50);
  let bezug = p.gewicht, bezugText = 'aktuelles Körpergewicht';
  if (p.groesse > 120) { const bmi = p.gewicht / Math.pow(p.groesse / 100, 2); if (bmi > 25) { bezug = 25 * Math.pow(p.groesse / 100, 2); bezugText = `Gewicht bei BMI 25 (${Math.round(bezug)} kg), weil die DGE bei Übergewicht das Normalgewicht zugrunde legt${p.kraft ? ' – für die ISSN-Spanne hier ebenso vorsichtig übernommen (eigene Festlegung)' : ''}`; } }
  const bmiWert = p.groesse > 120 ? p.gewicht / Math.pow(p.groesse / 100, 2) : null;
  let gkg, protQuelle;
  if (p.kraft && p.ziel === 'aufbau') { gkg = 1.6; protQuelle = 'ISSN: 1,4–2,0 g/kg für Trainierende (Aufbau: 1,6)'; }
  else if (p.kraft && p.ziel === 'abbau') { gkg = 2.0; protQuelle = 'ISSN: 1,4–2,0 g/kg, im Defizit oberes Ende (2,0)'; }
  else if (p.kraft) { gkg = 1.4; protQuelle = 'ISSN: 1,4–2,0 g/kg für Trainierende (Erhalt: 1,4)'; }
  else { gkg = p.alter >= 65 ? 1.0 : 0.8; protQuelle = p.alter >= 65 ? 'DGE: 1,0 g/kg ab 65 Jahren (Schätzwert)' : 'DGE: 0,8 g/kg (Breitensport braucht laut DGE keine erhöhte Zufuhr)'; }
  const protein = rund(gkg * bezug, 5);
  const fettAnteil = pal >= 1.7 ? 0.35 : 0.30;
  const fett = rund(kcal * fettAnteil / 9, 5);
  const kh = Math.max(0, rund((kcal - protein * 4 - fett * 9) / 4, 5));
  const khAnteil = Math.round(kh * 4 / kcal * 100);
  const schritte = [
    `Ruheenergieverbrauch (DGE-Formel, ${p.geschlecht === 'm' ? 'Männer' : 'Frauen'}): (0,047 × ${p.gewicht} kg${p.geschlecht === 'm' ? ' + 1,009' : ''} − 0,01452 × ${p.alter} J. + 3,21) × 239 ≈ ${Math.round(ree)} kcal`,
    `Aktivität: Alltag PAL ${palA.toLocaleString('de-DE')} + Training ${palT.toLocaleString('de-DE')} = PAL ${pal.toLocaleString('de-DE')} – Training wird nur einmal angerechnet.`,
    `Gesamtumsatz ≈ ${Math.round(ree)} × ${pal.toLocaleString('de-DE')} ≈ ${Math.round(gesamt)} kcal`,
    p.ziel === 'halten' ? 'Ziel „Gewicht halten“: keine Anpassung.' : p.ziel === 'aufbau' ? 'Ziel „Muskelaufbau“: +10 % (unteres Ende der Spanne 10–20 % aus einer Übersichtsarbeit zur Aufbauphase).' : `Ziel „Fettabbau“: −${Math.round(abbauStufe * 100)} % (vorsichtiger Startwert, eigener Vorschlag).`,
    `Energieziel ≈ ${kcal.toLocaleString('de-DE')} kcal (auf 50 gerundet – genauer lässt es sich nicht schätzen).`,
    `Protein: ${gkg.toLocaleString('de-DE')} g/kg × ${Math.round(bezug)} kg (${bezugText}) ≈ ${protein} g – ${protQuelle}.`,
    `Fett: ${Math.round(fettAnteil * 100)} % der Energie (DGE-Richtwert${fettAnteil > 0.3 ? ' für körperlich Aktive' : ''}) ≈ ${fett} g.`,
    `Kohlenhydrate: Rest der Energie ≈ ${kh} g (${khAnteil} % der Energie).`,
    'Ballaststoffe: mindestens 30 g (DGE-Richtwert für Erwachsene).',
    ...(bmiWert && bmiWert >= 30 ? ['Grenze: Bei deutlichem Übergewicht (BMI ≥ 30) schätzen Formeln für den Energiebedarf erfahrungsgemäß ungenauer; der Verlauf des Körpergewichts über einige Wochen ist der bessere Maßstab. Ärztliche oder ernährungsfachliche Begleitung ist sinnvoll (Hinweis, ungeprüft).'] : [])
  ];
  return { ok: true, ree, pal, gesamt, kcal, protein, fett, kh, ballaststoffe: 30, khAnteil, schritte };
}
/* Wirksame Ziele: berechnet, manuell oder keine */
function aktuelleZiele() {
  const z = D.einstellungen.ziele || {};
  if (z.modus === 'manuell') { const m = z.manuell || {}; return Object.values(m).some(v => v != null && v !== '') ? Object.assign({ herkunft: 'manuell' }, m) : null; }
  if (z.modus === 'auto') { const b = zielBerechnung(); return b.ok ? { herkunft: 'berechnet', kcal: b.kcal, protein: b.protein, fett: b.fett, kh: b.kh, ballaststoffe: b.ballaststoffe } : null; }
  return null;
}

/* ---------- Bilder: Foto mit Nachweis oder gestaltete Alternative ---------- */
function kurztitel(t) { return String(t).split(/ – | mit | und | aus /)[0]; }
/* Nachweis nach den Creative-Commons-Bedingungen: Urheber, Lizenz mit Link, Quelle, Hinweis auf Änderung */
function bildNachweisHtml(m) {
  const a = (url, t) => url && /^https:\/\//.test(url) ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(t)}</a>` : esc(t);
  return `Foto: ${esc(m.bild_autor || 'unbekannt')} · ${a(m.bild_lizenz_url, m.bild_lizenz || 'Lizenz unbekannt')} · ${a(m.bild_quelle, 'Wikimedia Commons')} · verkleinert · Beispielfoto, nicht nach diesem Rezept`;
}
function bildHtml(r, art = 'karte') {
  const m = r.meta || {}; const hero = art === 'hero';
  if (m.bild) {
    const nachweis = `Foto: ${esc(m.bild_autor || 'unbekannt')}${m.bild_lizenz ? ', ' + esc(m.bild_lizenz) : ''}`;
    return `<figure class="bildrahmen ${hero ? 'hero' : ''}" style="margin:0"><img src="bilder/${esc(m.bild)}" alt="Beispielfoto: ${esc(r.titel)}" loading="${hero ? 'eager' : 'lazy'}" decoding="async">
      <figcaption class="bildnachweis">${hero ? bildNachweisHtml(m) : nachweis}</figcaption></figure>`;
  }
  return `<div class="bildrahmen ${hero ? 'hero' : ''} b-${esc(m.bereich || '')}" role="img" aria-label="Kein Foto vorhanden: ${esc(r.titel)}"><div class="teller"><span>${esc(kurztitel(r.titel))}</span><small>${esc(BEREICH_NAME[m.bereich] || '')}</small></div></div>`;
}

/* ---------- Ersteinrichtung (überspringbar, jederzeit bearbeitbar) ---------- */
const EINR_SCHRITTE = ['Ziel', 'Körper', 'Aktivität', 'Essen', 'Küche'];
let einrSchritt = 0;
function vEinrichtung(teil) {
  const e = D.einstellungen; const p = e.person || {};
  if (teil != null && !isNaN(Number(teil))) einrSchritt = Math.max(0, Math.min(EINR_SCHRITTE.length - 1, Number(teil)));
  const s = einrSchritt;
  const radio = (name, wert, titel, unter = '', aktiv) => `<label><input type="radio" name="${name}" value="${esc(wert)}" ${aktiv ? 'checked' : ''}><span>${esc(titel)}${unter ? `<small>${esc(unter)}</small>` : ''}</span></label>`;
  const teile = [
    `<fieldset><legend>Was möchtest du mit der App?</legend><div class="wahl">
      ${radio('ziel', 'aufbau', 'Muskelaufbau', 'mit leichtem Energieüberschuss', p.ziel === 'aufbau')}${radio('ziel', 'halten', 'Gewicht halten', '', p.ziel === 'halten')}
      ${radio('ziel', 'abbau', 'Fettabbau', 'mit moderatem Defizit', p.ziel === 'abbau')}${radio('ziel', 'keins', 'Nur kochen', 'ohne Ernährungsziele', p.ziel === 'keins' || !p.ziel)}</div>
      <p class="leise klein">Ziele lassen sich jederzeit ändern oder ganz von Hand festlegen. Ohne Ziel funktioniert alles außer dem Zielvergleich.</p></fieldset>`,
    `<fieldset><legend>Angaben für die Berechnung <span class="leise klein">(optional)</span></legend>
      <p class="leise klein">Nur für die Schätzung deines Energiebedarfs nach der DGE-Formel. Die Daten bleiben auf diesem Gerät.</p>
      <div class="zeile"><label class="feld"><span>Alter</span><input type="number" name="alter" min="10" max="110" value="${esc(p.alter || '')}" inputmode="numeric" style="width:6em"></label>
      <label class="feld"><span>Gewicht (kg)</span><input type="number" name="gewicht" min="30" max="300" step="0.1" value="${esc(p.gewicht || '')}" inputmode="decimal" style="width:7em"></label>
      <label class="feld"><span>Größe (cm)</span><input type="number" name="groesse" min="120" max="230" value="${esc(p.groesse || '')}" inputmode="numeric" style="width:7em"><small>für den Protein-Bezug bei BMI > 25</small></label></div>
      <span class="leise klein">Die DGE-Formel rechnet getrennt für</span><div class="wahl" style="margin-top:6px">${radio('geschlecht', 'w', 'Frauen', '', p.geschlecht === 'w')}${radio('geschlecht', 'm', 'Männer', '', p.geschlecht === 'm')}${radio('geschlecht', 'k', 'Keine Angabe', 'dann Ziele von Hand', p.geschlecht === 'k')}</div>
      <label style="margin-top:12px"><input type="checkbox" name="besonders" ${p.besonders ? 'checked' : ''}> Schwanger, stillend oder eine Erkrankung, die die Ernährung betrifft</label>
      <p class="leise klein">Dann rechnet die App nicht automatisch – Rezepte und Tagebuch funktionieren trotzdem.</p></fieldset>`,
    `<fieldset><legend>Alltag – ohne Sport</legend><div class="wahl">${Object.entries(PAL_ALLTAG).map(([k, [, t]]) => radio('alltag', k, t, '', p.alltag === k)).join('')}</div></fieldset>
     <fieldset><legend>Training – getrennt erfasst</legend><div class="wahl">${Object.entries(TRAINING).map(([k, [, t]]) => radio('training', k, t, '', (p.training || 'keins') === k)).join('')}</div>
      <label style="margin-top:12px"><input type="checkbox" name="kraft" ${p.kraft ? 'checked' : ''}> Ich mache regelmäßig Krafttraining</label>
      <p class="leise klein">Alltag und Training werden getrennt gefragt und nur einmal angerechnet (DGE: +0,3 PAL bei 4–5 × 30–60 Min. Sport pro Woche).</p></fieldset>`,
    `<fieldset><legend>Ernährungsweise</legend><div class="wahl">${WEISEN.map(([k, t, u]) => radio('weise', k, t, u, (e.ernaehrungsweise || 'alles') === k)).join('')}</div></fieldset>
     <fieldset><legend>Allergien und Unverträglichkeiten</legend><p class="leise klein">Werden als <b>harte Filter</b> behandelt. Grundlage sind Zutatenarten; bei gekauften Produkten zählt immer das Etikett – die App garantiert keine Verträglichkeit.</p>
      <div class="wahl">${ALLERGENE.map(([k, t]) => `<label><input type="checkbox" name="allergie" value="${k}" ${(e.allergien || []).includes(k) ? 'checked' : ''}><span>${esc(t)}</span></label>`).join('')}</div></fieldset>
     <fieldset><legend>Abneigungen</legend><p class="leise klein">„esse ich nie“ blendet Rezepte aus, die anderen Stufen sortieren nur nach hinten.</p>
      <div id="abneigungen">${Object.entries(e.abneigungen || {}).map(([zid, st]) => abneigungZeile(zid, st)).join('')}</div>
      <div class="zeile"><label class="feld" style="flex:1 1 180px"><span>Zutat</span><input id="abneigung-neu" list="zutaten-liste-e" placeholder="z. B. Kapern"></label><button type="button" data-a="abneigung-add">Hinzufügen</button></div>
      <datalist id="zutaten-liste-e">${K.zutaten.map(z => `<option value="${esc(z.name)}">`).join('')}</datalist></fieldset>`,
    `<fieldset><legend>Deine Küche</legend><p class="leise klein">Rezepte, die ein fehlendes Gerät brauchen, werden ausgeblendet. Leer lassen = noch nicht erfasst (kein Filter).</p>
      <div class="wahl">${[...new Set(K.rezepte.flatMap(r => [...arr(r.meta.geraete_noetig), ...arr(r.meta.geraete_optional)]))].map(g => `<label><input type="checkbox" name="ger" value="${esc(g)}" ${(e.geraete || []).includes(g) ? 'checked' : ''}><span>${esc(GERAETE[g] || g)}</span></label>`).join('')}</div></fieldset>
     <fieldset><legend>Optional</legend><div class="zeile">
      <label class="feld"><span>Budget pro Portion</span><select name="budget"><option value="">egal</option>${['günstig', 'mittel', 'darf mehr kosten'].map(b => `<option ${e.budget === b ? 'selected' : ''}>${b}</option>`).join('')}</select></label>
      <label class="feld"><span>Typische Kochzeit an Werktagen</span><select name="kochzeit"><option value="">egal</option>${[20, 30, 45, 60, 90].map(n => `<option value="${n}" ${String(e.kochzeit) === String(n) ? 'selected' : ''}>bis ${n} Min.</option>`).join('')}</select></label></div></fieldset>`
  ];
  return `<div class="einrichtung"><p class="leise klein">Einrichtung · Schritt ${s + 1} von ${EINR_SCHRITTE.length} · ${esc(EINR_SCHRITTE[s])}</p>
    <div class="schritte-anzeige">${EINR_SCHRITTE.map((_, i) => `<i class="${i <= s ? 'an' : ''}"></i>`).join('')}</div>
    <h1>${s === 0 ? 'Willkommen bei Fitomat' : esc(EINR_SCHRITTE[s])}</h1>
    ${s === 0 ? '<p class="unterzeile">Ein paar kurze Fragen, damit Vorschläge und Ziele zu dir passen. Alles ist optional und später unter Profil änderbar.</p>' : ''}
    <form id="einr-form">${teile[s]}
    <div class="knopfreihe">${s > 0 ? '<button type="button" data-a="einr-zurueck">' + ico('zurueck', 'klein') + ' Zurück</button>' : ''}
      <button type="submit" class="haupt">${s < EINR_SCHRITTE.length - 1 ? 'Weiter' : 'Fertig'}</button>
      <button type="button" class="still" data-a="einr-ueberspringen">Einrichtung überspringen</button></div></form>
    <p class="leise klein">Hinweis: Deine Angaben liegen nur auf diesem Gerät, in diesem Profil. Es gibt kein Konto und keinen Abgleich mit anderen Geräten.</p></div>`;
}
function abneigungZeile(zid, st) {
  const z = Z[zid]; if (!z) return '';
  return `<div class="zeile" style="align-items:center;margin:6px 0"><span style="flex:1 1 120px">${esc(z.name)}</span><select data-abneigung="${esc(zid)}">${Object.entries(ABNEIGUNG).map(([k, t]) => `<option value="${k}" ${Number(st) === Number(k) ? 'selected' : ''}>${t}</option>`).join('')}<option value="0">entfernen</option></select></div>`;
}
function einrichtungSpeichern(form, weiter) {
  const fd = new FormData(form); const s = einrSchritt;
  aendere(null, d => {
    const e = d.einstellungen; const p = e.person = Object.assign({}, e.person || {});
    const zahl = k => { const v = fd.get(k); return v === null || v === '' ? null : Number(v); };
    if (s === 0) { p.ziel = fd.get('ziel') || 'keins'; if (p.ziel !== 'keins' && (!e.ziele || e.ziele.modus === 'keine')) e.ziele = { modus: 'auto' }; if (p.ziel === 'keins') e.ziele = Object.assign({}, e.ziele, { modus: (e.ziele && e.ziele.modus === 'manuell') ? 'manuell' : 'keine' }); }
    if (s === 1) { p.alter = zahl('alter'); p.gewicht = zahl('gewicht'); p.groesse = zahl('groesse'); p.geschlecht = fd.get('geschlecht') || null; p.besonders = !!fd.get('besonders'); }
    if (s === 2) { p.alltag = fd.get('alltag') || null; p.training = fd.get('training') || 'keins'; p.kraft = !!fd.get('kraft'); }
    if (s === 3) { e.ernaehrungsweise = fd.get('weise') || 'alles'; e.allergien = fd.getAll('allergie'); $$('[data-abneigung]', form).forEach(sel => { const v = Number(sel.value); if (!e.abneigungen) e.abneigungen = {}; if (v) e.abneigungen[sel.dataset.abneigung] = v; else delete e.abneigungen[sel.dataset.abneigung]; }); }
    if (s === 4) { const g = fd.getAll('ger'); e.geraete = g.length ? g : null; e.budget = fd.get('budget') || null; e.kochzeit = fd.get('kochzeit') || null; }
    if (weiter && s === EINR_SCHRITTE.length - 1) e.einrichtung = 'erledigt';
  }, { neuZeichnen: false });
  if (weiter && s < EINR_SCHRITTE.length - 1) location.hash = '#/einrichtung/' + (s + 1);
  else if (weiter) { toast('Eingerichtet – du kannst alles unter Profil ändern.'); location.hash = '#/ziele'; }
}
vEinrichtung.danach = () => {
  const f = $('#einr-form'); if (!f) return;
  f.addEventListener('submit', ev => { ev.preventDefault(); einrichtungSpeichern(f, true); });
};

/* ---------- Profil & Ziele ---------- */
function vZiele() {
  const e = D.einstellungen; const p = e.person || {}; const z = e.ziele || { modus: 'keine' }; const b = zielBerechnung(); const m = z.manuell || {};
  const wirk = aktuelleZiele();
  return `<div class="seitenkopf"><h1>Ziele</h1><a class="knopf klein" href="#/einrichtung/0">Angaben ändern</a></div>
  <p class="unterzeile">Schätzungen zur Orientierung – keine medizinische Bewertung. Alle Werte sind änderbar.</p>
  <form id="ziel-form">
  <div class="wahl" role="radiogroup" aria-label="Art der Ziele">
    <label><input type="radio" name="modus" value="auto" ${z.modus === 'auto' ? 'checked' : ''}><span>Berechnen<small>aus den Angaben im Profil (DGE)</small></span></label>
    <label><input type="radio" name="modus" value="manuell" ${z.modus === 'manuell' ? 'checked' : ''}><span>Selbst festlegen<small>z. B. aus deinem Fitnessplan</small></span></label>
    <label><input type="radio" name="modus" value="keine" ${(!z.modus || z.modus === 'keine') ? 'checked' : ''}><span>Keine Ziele<small>nur protokollieren</small></span></label></div>
  <h2>Berechnung</h2>
  ${b.ok ? `<div class="flaeche"><div class="naehr"><div><b>${b.kcal.toLocaleString('de-DE')}</b><span>kcal</span></div><div><b>${b.protein}</b><span>g Protein</span></div><div><b>${b.kh}</b><span>g Kohlenh.</span></div><div><b>${b.fett}</b><span>g Fett</span></div></div>
    <ol class="klein" style="margin-top:12px">${b.schritte.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
    <p class="leise klein">Grenzen: Formeln schätzen Durchschnitte – der tatsächliche Verbrauch kann deutlich abweichen. Entscheidend ist langfristig der Verlauf deines Körpergewichts (DGE). Einzelne Wiegetage ändern hier nichts.</p></div>`
    : `<div class="hinweis">Keine automatische Berechnung: ${b.grund.map(esc).join(' ')}</div>`}
  ${p.ziel === 'abbau' ? `<label class="feld"><span>Defizit beim Fettabbau</span><select name="defizit">${[0.10, 0.15, 0.20].map(x => `<option value="${x}" ${Number(p.defizit || 0.10) === x ? 'selected' : ''}>−${Math.round(x * 100)} %</option>`).join('')}</select><small>−10 % ist ein vorsichtiger Startwert (eigener Vorschlag).</small></label>` : ''}
  <h2>Eigene Ziele</h2><p class="leise klein">Gelten, wenn „Selbst festlegen“ gewählt ist. Leere Felder = kein Ziel für diesen Wert.</p>
  <div class="zeile">${[['kcal', 'kcal'], ['protein', 'Protein g'], ['kh', 'Kohlenhydrate g'], ['fett', 'Fett g'], ['ballaststoffe', 'Ballaststoffe g']].map(([k, n]) => `<label class="feld"><span>${n}</span><input type="number" name="m_${k}" min="0" value="${esc(m[k] ?? '')}" inputmode="decimal" style="width:7.5em"></label>`).join('')}</div>
  <label class="feld"><span>Herkunft (z. B. Trainingsplan, Datum)</span><input name="m_quelle" value="${esc(z.quelle || '')}"></label>
  <div class="knopfreihe"><button type="submit" class="haupt">Speichern</button></div></form>
  <p class="leise klein">Gerade wirksam: ${wirk ? `${wirk.herkunft} – ${[['kcal', ''], ['protein', 'Protein '], ['kh', 'Kohlenhydrate '], ['fett', 'Fett '], ['ballaststoffe', 'Ballaststoffe ≥ ']].filter(([k]) => wirk[k] != null && wirk[k] !== '').map(([k, n]) => `${n}${zahlDE(wirk[k])}${k === 'kcal' ? ' kcal' : ' g'}`).join(' · ')}` : 'keine Ziele'}. Methode und Quellen: DGE (Energie, Protein, Fett, Ballaststoffe), ISSN 2017 (Protein bei Training), Iraki 2019 (Aufbau).</p>`;
}
vZiele.danach = () => { const f = $('#ziel-form'); if (!f) return; f.addEventListener('submit', ev => { ev.preventDefault(); const fd = new FormData(f);
  aendere('Ziele gespeichert', d => { const e = d.einstellungen; const n = k => { const v = fd.get(k); return v === '' || v == null ? null : Number(v); };
    e.ziele = { modus: fd.get('modus') || 'keine', manuell: { kcal: n('m_kcal'), protein: n('m_protein'), kh: n('m_kh'), fett: n('m_fett'), ballaststoffe: n('m_ballaststoffe') }, quelle: fd.get('m_quelle') || '', geaendert_am: heute() };
    if (fd.get('defizit')) e.person = Object.assign({}, e.person, { defizit: Number(fd.get('defizit')) }); }); }); };

function vProfile() {
  const l = profilListe(); const akt = PROFIL;
  return `<h1>Profile auf diesem Gerät</h1>
  <div class="hinweis"><b>So funktioniert es:</b> Jedes Profil hat eigene Daten auf <b>diesem</b> Gerät. Es gibt kein gemeinsames Konto, keinen automatischen Abgleich zwischen Geräten und keine gegenseitige Sichtbarkeit über Geräte hinweg. Ein Profilwechsel ist <b>kein Passwortschutz</b>. Lokale Speicherung ersetzt keine Sicherung – bitte regelmäßig exportieren.</div>
  <ul class="eintraege">${l.map(p => `<li><span><b>${esc(p.name)}</b>${p.id === akt ? ' <span class="chip gut">aktiv</span>' : ''}</span><span>${p.id === akt ? '' : `<button class="klein" data-a="profil-wechseln" data-v="${esc(p.id)}">Wechseln</button>`}</span>
    <span class="unter"><button class="still klein" data-a="profil-umbenennen" data-v="${esc(p.id)}">Umbenennen</button></span></li>`).join('')}</ul>
  <form id="profil-neu" class="zeile" style="margin-top:12px"><label class="feld" style="flex:1 1 200px"><span>Neues Profil (z. B. für eine Freundin)</span><input name="name" required maxlength="30"></label><button class="haupt" type="submit">${ico('plus', 'klein')} Anlegen</button></form>
  ${PROFIL && !l.some(p => p.id === PROFIL) ? `<p class="leise klein">Du nutzt gerade ein Profil aus der Adresse (?profil=${esc(PROFIL)}), z. B. zum Testen.</p>` : ''}`;
}
vProfile.danach = () => { const f = $('#profil-neu'); if (!f) return; f.addEventListener('submit', ev => { ev.preventDefault();
  const name = f.name.value.trim(); if (!name) return; const l = profilListe(); const id = 'p-' + Date.now().toString(36);
  l.push({ id, name }); try { localStorage.setItem(PROFILE_SPEICHER, JSON.stringify(l)); localStorage.setItem(AKTIV_SPEICHER, id); } catch (e) { toast('Speichern nicht möglich'); return; }
  location.href = location.pathname + '#/einrichtung/0'; location.reload(); }); };
function profilWechseln(id) { try { localStorage.setItem(AKTIV_SPEICHER, id); } catch (e) { /* */ } location.href = location.pathname + '#/entdecken'; location.reload(); }

/* ---------- Tagebuch ---------- */
const MAKROS = [['kcal', 'Energie', 'kcal'], ['protein', 'Protein', 'g'], ['kh', 'Kohlenhydrate', 'g'], ['fett', 'Fett', 'g'], ['ballaststoffe', 'Ballaststoffe', 'g']];
let tbDatum = null, tbSuche = '', tbArt = 'alle';
function tagWerte(tag) {
  const s = { kcal: 0, protein: 0, kh: 0, fett: 0, ballaststoffe: 0, zucker: 0, salz: 0, eintraege: 0, fehlend: {} };
  D.tagebuch.filter(e => e.datum === tag).forEach(e => { s.eintraege++; for (const k of ['kcal', 'protein', 'kh', 'fett', 'ballaststoffe', 'zucker', 'salz']) { const v = e.naehr ? e.naehr[k] : null; if (v == null) s.fehlend[k] = (s.fehlend[k] || 0) + 1; else s[k] += v; } });
  return s;
}
function tagMikro(tag) {
  const ein = D.tagebuch.filter(e => e.datum === tag); const erg = {};
  for (const k of Object.keys(K.naehrstoffe || {})) {
    let w = 0, mit = 0, ohne = 0, abd = 0;
    ein.forEach(e => { const m = e.mikro && e.mikro[k]; if (m && m.w != null) { w += m.w; mit++; abd += (m.abdeckung ?? 100); } else ohne++; });
    erg[k] = { w, mit, ohne, abdeckung: mit ? Math.round(abd / mit) : 0 };
  }
  return { erg, n: ein.length };
}
function eintragSkalieren(e, faktor) { const s = v => v == null ? null : Math.round(v * faktor * 10) / 10; e.naehr = Object.fromEntries(Object.entries(e.naehr || {}).map(([k, v]) => [k, s(v)])); if (e.mikro) e.mikro = Object.fromEntries(Object.entries(e.mikro).map(([k, v]) => [k, { w: v.w == null ? null : Math.round(v.w * faktor * 1000) / 1000, abdeckung: v.abdeckung }])); }
function rezeptEintrag(r, portionen, quelle = 'rezept', extra = {}) {
  const pp = r.naehrwerte.pro_portion, mp = r.naehrwerte.mikro_pro_portion || {};
  const e = Object.assign({ id: uid('mz'), datum: tbDatum || heute(), zeit: new Date().toTimeString().slice(0, 5), quelle, mahlzeit: neuerEintragSlot(), rezept: r.id, rezept_version: r.meta.version || 1, titel: r.titel, portionen, einheit: 'Portion', naehr: Object.assign({}, pp), mikro: JSON.parse(JSON.stringify(mp)), status: r.naehrwerte.status }, extra);
  eintragSkalieren(e, portionen); return e;
}
function lebensmittelEintrag(z, gramm) {
  const code = Object.keys(z.bls || {})[0]; const w = code ? z.bls[code].werte : {};
  const naehr = {}; ['kcal', 'protein', 'kh', 'fett', 'ballaststoffe', 'zucker', 'salz'].forEach(k => { naehr[k] = w[k] == null ? null : w[k] / 100; });
  const mikro = {}; Object.keys(K.naehrstoffe || {}).forEach(k => { mikro[k] = { w: w[k] == null ? null : w[k] / 100, abdeckung: w[k] == null ? 0 : 100 }; });
  const e = { id: uid('mz'), datum: tbDatum || heute(), zeit: new Date().toTimeString().slice(0, 5), quelle: 'lebensmittel', mahlzeit: neuerEintragSlot(), zutat: z.id, titel: z.name, gramm, einheit: 'g', naehr, mikro, status: code ? 'vollstaendig' : 'unvollstaendig', datenquelle: code ? 'BLS ' + code + ' (allgemeiner Wert)' : 'keine Nährwerte' };
  eintragSkalieren(e, gramm); return e;
}
function eigenerEintrag(l, gramm) {
  const naehr = {}; ['kcal', 'protein', 'kh', 'fett', 'ballaststoffe', 'zucker', 'salz'].forEach(k => { naehr[k] = l.naehr[k] == null ? null : l.naehr[k] / 100; });
  const e = { id: uid('mz'), datum: tbDatum || heute(), zeit: new Date().toTimeString().slice(0, 5), quelle: 'eigen', lebensmittel: l.id, titel: l.name + (l.marke ? ' (' + l.marke + ')' : ''), gramm, einheit: l.bezug === '100ml' ? 'ml' : 'g', naehr, mikro: null, status: Object.values(l.naehr).some(v => v == null) ? 'unvollstaendig' : 'vollstaendig', datenquelle: (l.quelle || 'eigene Angabe') + (l.quelle_datum ? ', Stand ' + l.quelle_datum : ''), mahlzeit: neuerEintragSlot(), produkt_version: l.version || 1, produkt_pruefstatus: l.pruefstatus || 'ungeprueft' };
  eintragSkalieren(e, gramm); return e;
}
function vTagebuch2(datum) {
  if (datum && /^\d{4}-\d\d-\d\d$/.test(datum)) tbDatum = datum; if (!tbDatum) tbDatum = heute();
  const tag = tbDatum, s = tagWerte(tag), ziele = aktuelleZiele(), info = (D.tage || {})[tag] || {};
  const ein = D.tagebuch.filter(e => e.datum === tag).sort((a, b) => (a.zeit || '').localeCompare(b.zeit || ''));
  const zeileBalken = ([k, n, einh]) => { const z = ziele && ziele[k] != null && ziele[k] !== '' ? Number(ziele[k]) : null; const w = s[k]; const pct = z ? Math.min(100, Math.round(w / z * 100)) : 0;
    return `<div class="zeile2"><span>${n}</span><span class="spur">${z ? `<i class="${w >= z ? 'voll' : ''}" style="width:${pct}%"></i>` : ''}</span><span class="wert"><b>${zahlDE(w, einh === 'kcal' ? 0 : 1)}</b>${z ? ` / ${zahlDE(z)}` : ''} ${einh}${z && w >= z ? `<span class="ziel-info">${w - z >= (einh === 'kcal' ? 10 : 1) ? zahlDE(w - z, einh === 'kcal' ? 0 : 1) + ' ' + einh + ' über dem eingestellten Ziel' : 'eingestelltes Ziel erreicht'}</span>` : z ? `<span class="ziel-info">noch ${zahlDE(z - w, einh === 'kcal' ? 0 : 1)} ${einh} bis zum eingestellten Ziel</span>` : ''}${s.fehlend[k] ? ` <span class="chip warn" title="${s.fehlend[k]} Einträge ohne Wert">${s.fehlend[k]}× ?</span>` : ''}</span></div>`; };
  const rest = D.restportionen.filter(p => p.portionen > 0);
  const haeufig = Object.values(D.tagebuch.reduce((acc, e) => { const k = (e.rezept || e.zutat || e.lebensmittel || e.titel) + '|' + (e.portionen || e.gramm); acc[k] = acc[k] || { e, n: 0 }; acc[k].n++; return acc; }, {})).sort((a, b) => b.n - a.n).slice(0, 6);
  const tage7 = [...Array(7)].map((_, i) => plusTage(tag, i - 6));
  const w7 = tage7.map(t => ({ t, s: tagWerte(t), voll: ((D.tage || {})[t] || {}).vollstaendig }));
  const mitDaten = w7.filter(x => x.s.eintraege); const maxK = Math.max(1, ...w7.map(x => x.s.kcal), ziele && ziele.kcal ? Number(ziele.kcal) : 0);
  const mk = tagMikro(tag);
  return `<div class="tagnav"><button class="klein" data-a="tb-tag" data-v="-1" aria-label="Vortag">${ico('zurueck', 'klein')}</button>
    <strong>${tag === heute() ? 'Heute' : datumDE(tag)}</strong>
    <button class="klein" data-a="tb-tag" data-v="1" aria-label="Nächster Tag" ${tag >= heute() ? 'disabled' : ''}>${ico('weiter', 'klein')}</button></div>
  <div class="flaeche"><div class="balken">${MAKROS.map(zeileBalken).join('')}</div>
    <p class="leise klein" style="margin-bottom:0">Laut protokollierten Einträgen (${s.eintraege}). ${ziele ? `Ziele: ${esc(ziele.herkunft)}.` : '<a href="#/ziele">Ziele festlegen</a> (optional).'} Fehlende Einträge heißen nicht, dass nichts gegessen wurde.</p>
    <label style="margin-top:10px"><input type="checkbox" data-a="tb-vollstaendig" ${info.vollstaendig ? 'checked' : ''}> Tag vollständig protokolliert</label></div>
  <h2>Hinzufügen</h2>${slotWahlHtml()}
  ${rest.length ? `<h4>Restportionen</h4><div class="schnellwahl">${rest.map(p => `<button class="klein" data-a="rest-essen" data-v="${esc(p.id)}">${ico('portion', 'klein')} ${esc(kurztitel(p.titel))} · 1 Portion</button>`).join('')}</div>` : ''}
  ${haeufig.length ? `<h4>Häufig gegessen</h4><div class="schnellwahl">${haeufig.map(({ e }) => `<button class="klein" data-a="tb-kopie" data-v="${esc(e.id)}">${esc(kurztitel(e.titel))} · ${e.einheit === 'Portion' ? zahlDE(e.portionen, 1) + ' P.' : zahlDE(e.gramm) + ' ' + esc(e.einheit || 'g')}</button>`).join('')}</div>` : ''}
  ${schnellwahlHtml()}<div class="zeile" style="margin-top:12px"><label class="feld" style="flex:1 1 220px"><span>Suchen: Rezept, Lebensmittel, eigenes Produkt</span><input id="tb-suche" value="${esc(tbSuche)}" placeholder="z. B. Dal, Apfel, Haferflocken" autocomplete="off"></label></div>
  <div id="tb-treffer">${tbTreffer()}</div>
  <details class="klein"><summary>Freier Eintrag oder eigenes Lebensmittel anlegen</summary>${tbFormulare()}</details>
  <h2>Einträge</h2>${eintraegeHtml(ein, tag)}
  <h2>Letzte 7 Tage</h2>
  <div class="woche" role="img" aria-label="Energie der letzten 7 Tage">${w7.map(x => `<div><i class="${x.voll ? '' : 'unv'}" style="height:${Math.round(x.s.kcal / maxK * 100)}%" title="${datumDE(x.t)}: ${zahlDE(x.s.kcal)} kcal${x.voll ? '' : ' (nicht als vollständig markiert)'}"></i>${new Date(x.t + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short' })}</div>`).join('')}</div>
  <p class="leise klein">${mitDaten.length ? `Ø ${zahlDE(mitDaten.reduce((a, x) => a + x.s.kcal, 0) / mitDaten.length)} kcal · ${zahlDE(mitDaten.reduce((a, x) => a + x.s.protein, 0) / mitDaten.length)} g Protein an ${mitDaten.length} Tagen mit Einträgen (davon ${w7.filter(x => x.voll && x.s.eintraege).length} als vollständig markiert). Schraffiert = nicht als vollständig markiert.` : 'Noch keine Einträge in diesen 7 Tagen.'}</p>
  <details class="flaeche"><summary><b>Mikronährstoffe</b> <span class="leise klein">– protokolliert, Referenzwert, Abdeckung</span></summary>
    ${mikroHtml(tag)}</details>`;
}
function tbTreffer() {
  const q = tbSuche.trim().toLowerCase(); if (q.length < 2) return '';
  const rz = K.rezepte.filter(r => r.titel.toLowerCase().includes(q)).slice(0, 5);
  const zt = K.zutaten.filter(z => (z.name.toLowerCase().includes(q) || (z.aliases || []).some(a => a.toLowerCase().includes(q))) && Object.keys(z.bls || {}).length).slice(0, 6);
  const eg = (D.lebensmittel || []).filter(l => (l.name + ' ' + (l.marke || '') + ' ' + (l.gtin || '')).toLowerCase().includes(q)).slice(0, 6);
  if (!rz.length && !zt.length && !eg.length) return '<p class="leise klein">Nichts gefunden – unten ein eigenes Lebensmittel anlegen.</p>';
  return `<ul class="eintraege">${rz.map(r => `<li><span>${esc(r.titel)}<br><span class="leise klein">Rezept · ${r.naehrwerte.pro_portion.kcal != null ? zahlDE(r.naehrwerte.pro_portion.kcal) + ' kcal/Portion' : 'kcal unbekannt'}</span></span><span><button class="klein" data-a="tb-rezept" data-v="${esc(r.id)}" data-p="1">1 Portion</button> <button class="klein still" data-a="tb-rezept" data-v="${esc(r.id)}" data-p="0.5">½</button></span></li>`).join('')}
    ${zt.map(z => `<li><span>${esc(z.name)}<br><span class="leise klein">allgemeiner BLS-Wert · ${zahlDE(z.bls[Object.keys(z.bls)[0]].werte.kcal)} kcal/100 g</span></span><span class="zeile" style="gap:6px"><input type="number" min="1" value="100" aria-label="Gramm ${esc(z.name)}" data-gramm="${esc(z.id)}" style="width:5.5em" inputmode="decimal"><button class="klein" data-a="tb-lm" data-v="${esc(z.id)}">g eintragen</button></span></li>`).join('')}
    ${eg.map(l => `<li><span>${esc(l.name)}${l.marke ? ' · ' + esc(l.marke) : ''}<br><span class="leise klein">eigenes Produkt · ${l.naehr.kcal != null ? zahlDE(l.naehr.kcal) + ' kcal/100 ' + (l.bezug === '100ml' ? 'ml' : 'g') : 'kcal unbekannt'}</span></span><span class="zeile" style="gap:6px"><input type="number" min="1" value="${esc(l.portion || 100)}" data-gramm="${esc(l.id)}" style="width:5.5em" inputmode="decimal"><button class="klein" data-a="tb-eigen" data-v="${esc(l.id)}">eintragen</button></span></li>`).join('')}</ul>`;
}
function tbFormulare() {
  const f = (k, n) => `<label class="feld"><span>${n}</span><input type="number" name="${k}" min="0" step="any" inputmode="decimal" style="width:6.5em"></label>`;
  return `<form id="tb-frei"><h4>Freier Eintrag (z. B. auswärts gegessen)</h4><div class="zeile"><label class="feld" style="flex:2 1 200px"><span>Was?</span><input name="titel" required></label>${f('kcal', 'kcal')}${f('protein', 'Protein g')}${f('kh', 'KH g')}${f('fett', 'Fett g')}</div><p class="leise klein">Leere Felder bleiben unbekannt (nicht 0).</p><button class="haupt klein" type="submit">Eintragen</button></form><hr>
  <p class="klein"><a href="#/produkte/neu">Markenprodukt mit allen Angaben anlegen</a> (Barcode, Packung, Allergene, Quelle, Prüfstatus) · <a href="#/produkte">alle Produkte</a></p><form id="tb-lm-neu"><h4>Schnell: eigenes Lebensmittel (Werte laut Etikett)</h4><div class="zeile"><label class="feld" style="flex:2 1 180px"><span>Name</span><input name="name" required></label><label class="feld"><span>Marke</span><input name="marke"></label><label class="feld"><span>Barcode (GTIN)</span><input name="gtin" inputmode="numeric" pattern="[0-9]{8,14}" title="8 bis 14 Ziffern"></label></div>
   <div class="zeile"><label class="feld"><span>Bezug</span><select name="bezug"><option value="100g">je 100 g</option><option value="100ml">je 100 ml</option></select></label>${f('kcal', 'kcal')}${f('protein', 'Protein')}${f('kh', 'Kohlenh.')}${f('zucker', 'davon Zucker')}${f('fett', 'Fett')}${f('ballaststoffe', 'Ballastst.')}${f('salz', 'Salz')}${f('portion', 'übliche Portion g/ml')}</div>
   <label class="feld"><span>Quelle</span><select name="quelle"><option>Etikett</option><option>eigene Schätzung</option></select></label>
   <p class="leise klein">Bleibt nur in deinem Profil auf diesem Gerät – nichts davon gelangt in den öffentlichen Katalog. Spätere Änderungen verändern bereits gebuchte Einträge nicht.</p><button class="haupt klein" type="submit">Speichern</button></form>`;
}
vTagebuch2.danach = () => {
  const s = $('#tb-suche'); if (s) s.addEventListener('input', () => { tbSuche = s.value; $('#tb-treffer').innerHTML = tbTreffer(); });
  const fr = $('#tb-frei'); if (fr) fr.addEventListener('submit', ev => { ev.preventDefault(); const n = k => fr[k].value === '' ? null : Number(fr[k].value);
    aendere('Eingetragen', d => d.tagebuch.push({ id: uid('mz'), datum: tbDatum, zeit: new Date().toTimeString().slice(0, 5), quelle: 'frei', mahlzeit: neuerEintragSlot(), titel: fr.titel.value, portionen: 1, einheit: 'Portion', naehr: { kcal: n('kcal'), protein: n('protein'), kh: n('kh'), fett: n('fett'), ballaststoffe: null }, mikro: null, status: 'unvollstaendig' })); });
  const lm = $('#tb-lm-neu'); if (lm) lm.addEventListener('submit', ev => { ev.preventDefault(); const n = k => lm[k].value === '' ? null : Number(lm[k].value);
    aendere('Lebensmittel gespeichert', d => { (d.lebensmittel = d.lebensmittel || []).push({ id: uid('lm'), name: lm.name.value.trim(), marke: lm.marke.value.trim() || null, gtin: lm.gtin.value.trim() || null, bezug: lm.bezug.value, naehr: { kcal: n('kcal'), protein: n('protein'), kh: n('kh'), zucker: n('zucker'), fett: n('fett'), ballaststoffe: n('ballaststoffe'), salz: n('salz') }, portion: n('portion'), quelle: lm.quelle.value, erfasst: heute(), version: 1 }); });
    tbSuche = lm.name.value; route(); });
};
/* Aktionen dieses Moduls (vor den Aktionen von app.js registriert) */
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a, v = b.dataset.v;
  switch (a) {
    case 'einr-zurueck': { const f = $('#einr-form'); if (f) einrichtungSpeichern(f, false); location.hash = '#/einrichtung/' + Math.max(0, einrSchritt - 1); break; }
    case 'einr-ueberspringen': aendere('Einrichtung übersprungen – jederzeit unter Profil möglich', d => { d.einstellungen.einrichtung = d.einstellungen.einrichtung || 'uebersprungen'; }, { neuZeichnen: false }); location.hash = '#/entdecken'; break;
    case 'abneigung-add': { const i = $('#abneigung-neu'); const z = ZN[(i.value || '').trim()]; if (!z) { toast('Bitte eine Zutat aus der Liste wählen'); break; } const box = $('#abneigungen'); if (!box.querySelector(`[data-abneigung="${z.id}"]`)) box.insertAdjacentHTML('beforeend', abneigungZeile(z.id, 2)); i.value = ''; break; }
    case 'profil-wechseln': profilWechseln(v); break;
    case 'profil-umbenennen': { const l = profilListe(); const p = l.find(x => x.id === v); const n = prompt('Neuer Name', p.name); if (n && n.trim()) { p.name = n.trim().slice(0, 30); try { localStorage.setItem(PROFILE_SPEICHER, JSON.stringify(l)); } catch (e) { /* */ } route(); } break; }
    case 'tb-tag': tbDatum = plusTage(tbDatum || heute(), Number(v)); if (tbDatum > heute()) tbDatum = heute(); location.hash = '#/tagebuch/' + tbDatum; break;
    case 'tb-vollstaendig': aendere(null, d => { d.tage = d.tage || {}; d.tage[tbDatum] = Object.assign({}, d.tage[tbDatum], { vollstaendig: b.checked }); }); break;
    case 'tb-rezept': { const r = R[v]; aendere(`${kurztitel(r.titel)} eingetragen`, d => d.tagebuch.push(rezeptEintrag(r, Number(b.dataset.p) || 1))); break; }
    case 'tb-lm': { const z = Z[v]; const g = Number(($(`[data-gramm="${v}"]`) || {}).value) || 100; aendere(`${z.name} eingetragen`, d => d.tagebuch.push(lebensmittelEintrag(z, g))); break; }
    case 'tb-eigen': { const l = (D.lebensmittel || []).find(x => x.id === v); const g = Number(($(`[data-gramm="${v}"]`) || {}).value) || 100; aendere(`${l.name} eingetragen`, d => d.tagebuch.push(eigenerEintrag(l, g))); break; }
    case 'tb-menge': { aendere(null, d => { const e = d.tagebuch.find(x => x.id === v); const dir = Number(b.dataset.d);
      if (e.einheit === 'Portion' || !e.einheit) { const alt = e.portionen || 1; const neu = Math.max(0.25, Math.round((alt + dir * 0.25) * 100) / 100); eintragSkalieren(e, neu / alt); e.portionen = neu; }
      else { const alt = e.gramm || 100; const schritt = alt >= 200 ? 25 : 10; const neu = Math.max(5, alt + dir * schritt); eintragSkalieren(e, neu / alt); e.gramm = neu; } }); break; }
  }
});
