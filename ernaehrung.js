/* Fitomat-Build 202611121956 */
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
  if (!p.alter) grund.push('Alter fehlt (die DGE-Formel braucht es).'); else if (!(p.alter >= 19)) grund.push('Die automatische Formel gilt nur für Erwachsene ab 19 Jahren.');
  if (p.geschlecht !== 'w' && p.geschlecht !== 'm') grund.push('Die DGE-Formel unterscheidet Frauen und Männer – ohne diese Angabe bitte Ziele manuell eintragen.');
  if (!(p.gewicht > 30 && p.gewicht < 300)) grund.push('Körpergewicht fehlt.');
  if (p.besonders) grund.push('Bei Schwangerschaft, Stillzeit oder Erkrankungen rechnet die App nicht automatisch – bitte manuell und ggf. mit Fachberatung.');
  if (p.training === 'viel') grund.push('Für sehr viel Training bzw. Leistungssport gibt es hier keine Standardformel – bitte manuell.');
  if (!p.alltag) grund.push('Alltagsaktivität fehlt.');
  if (grund.length) return { ok: false, grund };
  const ree = (0.047 * p.gewicht + (p.geschlecht === 'm' ? 1.009 : 0) - 0.01452 * p.alter + 3.21) * 239;
  const palA = PAL_ALLTAG[p.alltag][0]; const tr = trainingAngaben(p);
  if (tr.art === 'leistung') return { ok: false, grund: ['Für Leistungssport bzw. sehr viel Training gibt es hier keine Standardformel – bitte manuell.'] };
  // Training einmal und passend zur Art anrechnen: Kraft netto nach Compendium 2024 (Code 02054, 3,5 MET), Ausdauer/anstrengender Sport als DGE-PAL-Zuschlag
  let trKcal = 0, palT = 0, trText = 'kein regelmäßiges Training';
  if (tr.art === 'kraft' && tr.n > 0) { trKcal = (3.5 - 1) * p.gewicht * (tr.min / 60) * tr.n / 7; trText = `Krafttraining ${zahlDE(tr.n, 1)} × ${tr.min} Min./Woche: (3,5 − 1) MET × ${p.gewicht} kg × ${zahlDE(tr.min / 60, 2)} h × ${zahlDE(tr.n, 1)} ÷ 7 ≈ +${Math.round(trKcal)} kcal/Tag (Compendium 2024, Code 02054; Ruheanteil abgezogen)`; }
  else if (tr.art === 'ausdauer' && tr.n > 0) { palT = tr.n >= 4 ? 0.3 : 0.15; trKcal = ree * palT; trText = `Ausdauer/anstrengender Sport ${zahlDE(tr.n, 1)}×/Woche: +${palT.toLocaleString('de-DE')} PAL ≈ +${Math.round(trKcal)} kcal/Tag (DGE-Zuschlag${tr.n < 4 ? ', anteilig – eigene Festlegung' : ''})`; }
  else if ((tr.art === 'kraft' || tr.art === 'ausdauer') && !(tr.n > 0)) trText = 'Trainingsart angegeben, aber ohne Einheiten pro Woche – deshalb nicht angerechnet. Bitte unter „Angaben ändern“ ergänzen';
  else if (tr.art === 'unklar') { const alsKraft = (3.5 - 1) * p.gewicht * (tr.min / 60) * tr.n / 7; const alsAusd = ree * (tr.n >= 4 ? 0.3 : 0.15); trText = `Trainingsart unbekannt (ältere Angabe ohne Art) – deshalb NICHT angerechnet. Als Krafttraining wären es etwa +${Math.round(alsKraft)} kcal/Tag, als Ausdauer etwa +${Math.round(alsAusd)} kcal/Tag. Bitte unter „Angaben ändern“ Art, Einheiten und Minuten eintragen`; }
  const alltagKcal = ree * palA; const gesamt = alltagKcal + trKcal; const pal = Math.round(gesamt / ree * 100) / 100;
  const zf = ZIELE[p.ziel][1]; const abbauKcal = p.ziel === 'abbau' && p.defizit_kcal ? Number(p.defizit_kcal) : null; const abbauStufe = p.ziel === 'abbau' && !abbauKcal ? (p.defizit || 0.10) : null;
  const kcal = p.ziel === 'abbau' ? rund(abbauKcal ? gesamt - abbauKcal : gesamt * (1 - abbauStufe), 50) : rund(gesamt * (1 + zf), 50);
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
    `Alltag ohne Sport: PAL ${palA.toLocaleString('de-DE')} (${PAL_ALLTAG[p.alltag][1]}) → ${Math.round(ree)} × ${palA.toLocaleString('de-DE')} ≈ ${Math.round(alltagKcal)} kcal`,
    `Training: ${trText}.${tr.alt ? ' Hinweis: aus älteren Angaben übernommen (Einheiten/Minuten geschätzt) – bitte unter „Angaben ändern“ prüfen.' : ''} Training wird nur einmal angerechnet.`,
    `Geschätzter Erhaltungsbedarf ≈ ${Math.round(alltagKcal)} + ${Math.round(trKcal)} ≈ ${Math.round(gesamt)} kcal (entspricht PAL ${pal.toLocaleString('de-DE')}). Schon ±0,1 PAL verschieben das um etwa ±${Math.round(ree * 0.1)} kcal – realistisch ist eher eine Spanne von ${rund(gesamt - ree * 0.15, 50).toLocaleString('de-DE')} bis ${rund(gesamt + ree * 0.15, 50).toLocaleString('de-DE')} kcal.`,
    p.ziel === 'halten' ? 'Ziel „Gewicht halten“: keine Anpassung.' : p.ziel === 'aufbau' ? 'Ziel „Muskelaufbau“: +10 % (unteres Ende der Spanne 10–20 % aus einer Übersichtsarbeit zur Aufbauphase).' : abbauKcal ? `Ziel „Fettabbau“: −${abbauKcal} kcal (selbst gewähltes kleines Defizit).` : `Ziel „Fettabbau“: −${Math.round(abbauStufe * 100)} % (vorsichtiger Startwert, eigener Vorschlag).`,
    `Energieziel ≈ ${kcal.toLocaleString('de-DE')} kcal (auf 50 gerundet – genauer lässt es sich nicht schätzen). Das ist ein berechneter Startwert; der tatsächliche Bedarf zeigt sich erst am Gewichtsverlauf.`,
    `Protein: ${gkg.toLocaleString('de-DE')} g/kg × ${Math.round(bezug)} kg (${bezugText}) ≈ ${protein} g – ${protQuelle}.`,
    `Fett: ${Math.round(fettAnteil * 100)} % der Energie (DGE-Richtwert${fettAnteil > 0.3 ? ' für körperlich Aktive' : ''}) ≈ ${fett} g.`,
    `Kohlenhydrate: Rest der Energie ≈ ${kh} g (${khAnteil} % der Energie).`,
    'Ballaststoffe: mindestens 30 g (DGE-Richtwert für Erwachsene).',
    ...(bmiWert && bmiWert >= 30 ? ['Grenze: Bei deutlichem Übergewicht (BMI ≥ 30) schätzen Formeln für den Energiebedarf erfahrungsgemäß ungenauer; der Verlauf des Körpergewichts über einige Wochen ist der bessere Maßstab. Ärztliche oder ernährungsfachliche Begleitung ist sinnvoll (Hinweis, ungeprüft).'] : [])
  ];
  return { ok: true, ree, pal, gesamt, alltagKcal, trKcal, kcal, protein, fett, kh, ballaststoffe: 30, khAnteil, schritte, tr };
}
/* Trainingsangaben; ältere Profile (nur Stufe „wenig/regelmäßig“) werden mit Annahmen übersetzt und als solche gekennzeichnet */
function trainingAngaben(p) {
  if (p.training_art) return { art: p.training_art, n: Number(p.training_einheiten) || 0, min: Number(p.training_minuten) || 60, alt: false };
  const t = p.training || 'keins'; if (t === 'keins') return { art: 'keins', n: 0, min: 0, alt: false }; if (t === 'viel') return { art: 'leistung', n: 6, min: 60, alt: true };
  // Ohne Kraft-Häkchen ist die Art unbekannt – früher wurde dann „Ausdauer“ (+0,15/+0,3 PAL) angenommen, was den Bedarf deutlich erhöhen kann
  return { art: p.kraft ? 'kraft' : 'unklar', n: t === 'wenig' ? 2 : 4.5, min: 60, alt: true };
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
    return `<figure class="bildrahmen ${hero ? 'hero' : ''}" style="margin:0"><img src="bilder/${esc(m.bild)}" alt="Beispielfoto: ${esc(r.titel)}" loading="${hero ? 'eager' : 'lazy'}" decoding="async" onerror="this.parentNode.classList.add('foto-offline'); this.remove()">
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
     <fieldset><legend>Training – getrennt erfasst</legend>${(() => { const tr = trainingAngaben(p); return `<div class="wahl">${[['keins', 'kein regelmäßiges Training', ''], ['kraft', 'überwiegend Krafttraining', 'Gerätetraining, Hanteln, Körpergewicht'], ['ausdauer', 'überwiegend Ausdauer oder anstrengender Sport', 'Laufen, Rad, Mannschaftssport'], ['leistung', 'Leistungssport', 'dann Ziele von Hand']].map(([k, t, u]) => radio('training_art', k, t, u, tr.art === k)).join('')}</div>
      <div class="zeile"><label class="feld"><span>Einheiten pro Woche</span><input type="number" name="training_einheiten" min="0" max="14" step="0.5" inputmode="decimal" value="${esc(tr.alt ? '' : (p.training_einheiten ?? ''))}" placeholder="${tr.alt ? zahlDE(tr.n, 1) : ''}" style="width:6em"></label><label class="feld"><span>Minuten je Einheit</span><input type="number" name="training_minuten" min="10" max="240" step="5" inputmode="numeric" value="${esc(tr.alt ? '' : (p.training_minuten ?? ''))}" placeholder="${tr.alt ? tr.min : '60'}" style="width:6em"></label></div>`; })()}
      <label style="margin-top:12px"><input type="checkbox" name="kraft" ${p.kraft ? 'checked' : ''}> Ich mache regelmäßig Krafttraining <small class="leise">(für den Proteinbedarf)</small></label>
      <p class="leise klein">Training wird nur einmal angerechnet: Krafttraining über den Energieumsatz laut Compendium of Physical Activities (Pausen eingerechnet), Ausdauer über den DGE-Zuschlag. Schritte im Alltag gehören zur Alltagsaktivität oben.</p></fieldset>`,
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
  return `<div class="zeile abneigung-zeile" style="align-items:center;margin:6px 0"><span style="flex:1 1 120px">${esc(z.name)}</span><select data-abneigung="${esc(zid)}" aria-label="Stufe für ${esc(z.name)}">${Object.entries(ABNEIGUNG).map(([k, t]) => `<option value="${k}" ${Number(st) === Number(k) ? 'selected' : ''}>${t}</option>`).join('')}</select><button type="button" class="klein" data-a="abneigung-weg" data-v="${esc(zid)}" aria-label="${esc(z.name)} entfernen">✕ entfernen</button></div>`;
}
function einrichtungSpeichern(form, weiter) {
  const fd = new FormData(form); const s = einrSchritt;
  aendere(null, d => {
    const e = d.einstellungen; const p = e.person = Object.assign({}, e.person || {});
    const zahl = k => { const v = fd.get(k); return v === null || v === '' ? null : Number(v); };
    if (s === 0) { p.ziel = fd.get('ziel') || 'keins'; if (p.ziel !== 'keins' && (!e.ziele || e.ziele.modus === 'keine')) e.ziele = { modus: 'auto' }; if (p.ziel === 'keins') e.ziele = Object.assign({}, e.ziele, { modus: (e.ziele && e.ziele.modus === 'manuell') ? 'manuell' : 'keine' }); }
    if (s === 1) { p.alter = zahl('alter'); p.gewicht = zahl('gewicht'); p.groesse = zahl('groesse'); p.geschlecht = fd.get('geschlecht') || null; p.besonders = !!fd.get('besonders'); }
    if (s === 2) { p.alltag = fd.get('alltag') || null; const alt = trainingAngaben(p); p.training_art = fd.get('training_art') || 'keins'; p.training_einheiten = zahl('training_einheiten') ?? (p.training_art === 'keins' ? 0 : alt.n); p.training_minuten = zahl('training_minuten') ?? (alt.min || 60); p.training = p.training_art === 'keins' ? 'keins' : p.training_art === 'leistung' ? 'viel' : (p.training_einheiten >= 4 ? 'regelmaessig' : 'wenig'); p.kraft = !!fd.get('kraft'); }
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
  <p class="klein"><b>Gerade wirksam:</b> ${wirk ? `${wirk.herkunft === 'manuell' ? 'selbst festgelegtes Ziel' : 'berechnete Schätzung'} – ${wirk.kcal != null && wirk.kcal !== '' ? zahlDE(wirk.kcal) + ' kcal' : 'ohne kcal-Ziel'}` : 'keine Ziele'}. Unten getrennt: berechnete Schätzung, selbst festgelegtes Ziel und Schätzung aus deinem Verlauf – keiner überschreibt einen anderen automatisch.</p>
  ${trainingRueckfrageHtml(false)}
  <h2>1. Berechnete Schätzung</h2>
  ${eingabenHtml(p, b)}
  ${b.ok ? `<div class="flaeche"><div class="naehr"><div><b>${b.kcal.toLocaleString('de-DE')}</b><span>kcal</span></div><div><b>${b.protein}</b><span>g Protein</span></div><div><b>${b.kh}</b><span>g Kohlenh.</span></div><div><b>${b.fett}</b><span>g Fett</span></div></div>
    <ol class="klein" style="margin-top:12px">${b.schritte.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
    <p class="leise klein">Grenzen: Formeln schätzen Durchschnitte – der tatsächliche Verbrauch kann deutlich abweichen. Entscheidend ist langfristig der Verlauf deines Körpergewichts (DGE). Einzelne Wiegetage ändern hier nichts.</p></div>`
    : `<div class="hinweis">Keine automatische Berechnung: ${b.grund.map(esc).join(' ')}</div>`}
  ${p.ziel === 'abbau' ? `<label class="feld"><span>Defizit beim Fettabbau</span><select name="defizit">${[['k200', '−200 kcal (klein)'], ['k250', '−250 kcal (klein)'], ['k300', '−300 kcal (klein)'], ['0.1', '−10 %'], ['0.15', '−15 %'], ['0.2', '−20 %']].map(([v, t]) => `<option value="${v}" ${(p.defizit_kcal ? 'k' + p.defizit_kcal : String(p.defizit || 0.1)) === v ? 'selected' : ''}>${t}</option>`).join('')}</select><small>Ein kleines Defizit verlangsamt den Fettabbau, ist aber leichter durchzuhalten (eigene Einordnung).</small></label>` : ''}
  <h2>2. Selbst festgelegtes Ziel</h2><p class="leise klein">Gelten, wenn „Selbst festlegen“ gewählt ist. Leere Felder = kein Ziel für diesen Wert.</p>
  <div class="zeile">${[['kcal', 'kcal'], ['protein', 'Protein g'], ['kh', 'Kohlenhydrate g'], ['fett', 'Fett g'], ['ballaststoffe', 'Ballaststoffe g']].map(([k, n]) => `<label class="feld"><span>${n}</span><input type="number" name="m_${k}" min="0" value="${esc(m[k] ?? '')}" inputmode="decimal" style="width:7.5em"></label>`).join('')}</div>
  <label class="feld"><span>Herkunft (z. B. Trainingsplan, Datum)</span><input name="m_quelle" value="${esc(z.quelle || '')}"></label>
  <div class="knopfreihe"><button type="submit" class="haupt">Speichern</button></div></form>
  ${verlaufSchaetzungHtml(b)}
  <p class="leise klein">Gerade wirksam: ${wirk ? `${wirk.herkunft} – ${[['kcal', ''], ['protein', 'Protein '], ['kh', 'Kohlenhydrate '], ['fett', 'Fett '], ['ballaststoffe', 'Ballaststoffe ≥ ']].filter(([k]) => wirk[k] != null && wirk[k] !== '').map(([k, n]) => `${n}${zahlDE(wirk[k])}${k === 'kcal' ? ' kcal' : ' g'}`).join(' · ')}` : 'keine Ziele'}. Methode und Quellen: DGE (Energie, Protein, Fett, Ballaststoffe), ISSN 2017 (Protein bei Training), Iraki 2019 (Aufbau).</p>`;
}
vZiele.danach = () => { const f = $('#ziel-form'); if (!f) return; f.addEventListener('submit', ev => { ev.preventDefault(); const fd = new FormData(f);
  aendere('Ziele gespeichert – Rückgängig möglich', d => { const e = d.einstellungen; const n = k => { const v = fd.get(k); return v === '' || v == null ? null : Number(v); };
    // Vorherigen Stand im Zielverlauf aufbewahren (nachvollziehbar, wiederherstellbar)
    e.ziele_verlauf = [...arr(e.ziele_verlauf), { zeit: new Date().toISOString(), ziele: JSON.parse(JSON.stringify(e.ziele || {})), defizit: (e.person || {}).defizit ?? null, defizit_kcal: (e.person || {}).defizit_kcal ?? null }].slice(-10);
    e.ziele = { modus: fd.get('modus') || 'keine', manuell: { kcal: n('m_kcal'), protein: n('m_protein'), kh: n('m_kh'), fett: n('m_fett'), ballaststoffe: n('m_ballaststoffe') }, quelle: fd.get('m_quelle') || '', geaendert_am: heute() };
    const df = fd.get('defizit'); if (df) { const pp = Object.assign({}, e.person); if (df.startsWith('k')) { pp.defizit_kcal = Number(df.slice(1)); } else { pp.defizit = Number(df); delete pp.defizit_kcal; } e.person = pp; } }, { mitUndo: true }); }); };
/* Ältere Profile ohne Trainingsart (vor 2.19.0 still als Ausdauer gerechnet): sichtbar nachfragen, nichts ohne Bestätigung ändern */
function trainingRueckfrageHtml(kurz) {
  const e = D.einstellungen || {}; const p = e.person || {}; if ((e.ziele || {}).modus !== 'auto') return '';
  const tr = trainingAngaben(p); if (tr.art !== 'unklar' && !(tr.art !== 'keins' && tr.art !== 'leistung' && !(tr.n > 0))) return '';
  if (tr.art !== 'unklar') return `<div class="hinweis warn klein" role="status"><b>Training ohne Einheiten pro Woche</b> – es wird deshalb nicht angerechnet. <a href="#/einrichtung/2">Einheiten und Minuten eintragen</a></div>`;
  const b = zielBerechnung(p); if (!b.ok) return '';
  const alsAusd = Math.round(b.alltagKcal + b.ree * (tr.n >= 4 ? 0.3 : 0.15)); const alsKraft = Math.round(b.alltagKcal + (3.5 - 1) * p.gewicht * tr.n / 7);
  return `<div class="hinweis warn ${kurz ? 'klein' : ''}" role="status"><b>Bitte Trainingsart bestätigen.</b> Deine Angabe „${esc(TRAINING[p.training] ? TRAINING[p.training][1] : '')}“ hat keine Art. Bis Version 2.18 wurde sie still als Ausdauer gerechnet (Erhalt ≈ ${zahlDE(alsAusd)} kcal). Jetzt wird sie nicht angerechnet (≈ ${zahlDE(Math.round(b.gesamt))} kcal), bis du wählst. Als Krafttraining mit 60 Min. wären es ≈ ${zahlDE(alsKraft)} kcal.
    <div class="knopfreihe" style="margin-top:8px"><button class="klein" data-a="tr-art-bestaetigen" data-v="kraft">Krafttraining</button><button class="klein" data-a="tr-art-bestaetigen" data-v="ausdauer">Ausdauer / anstrengender Sport</button><a class="knopf klein still" href="#/einrichtung/2">Genauer angeben</a></div>
    <span class="leise">Deine Angaben werden erst geändert, wenn du hier tippst. Selbst festgelegte Ziele bleiben unberührt.</span></div>`;
}
/* Gespeicherte Eingaben der Berechnung sichtbar machen – fehlende werden als fehlend gezeigt, nie ergänzt */
function eingabenHtml(p, b) {
  const tr = trainingAngaben(p); const f = v => v == null || v === '' ? '<span class="chip warn">fehlt</span>' : esc(String(v));
  const trText = tr.art === 'keins' ? 'kein regelmäßiges Training' : tr.art === 'unklar' ? `<span class="chip warn">Art unbekannt</span> ältere Angabe „${esc(TRAINING[p.training] ? TRAINING[p.training][1] : p.training)}“` : `${{ kraft: 'Krafttraining', ausdauer: 'Ausdauer/anstrengender Sport', leistung: 'Leistungssport' }[tr.art] || esc(tr.art)}, ${zahlDE(tr.n, 1)} × ${tr.min} Min. pro Woche${tr.alt ? ' <span class="chip warn">aus älterer Angabe geschätzt</span>' : ''}`;
  return `<details class="flaeche klein" ${b.ok && !tr.alt ? '' : 'open'}><summary><b>Deine gespeicherten Angaben</b> <span class="leise">– Grundlage der Rechnung</span></summary>
    <table class="verlauf-tabelle"><tbody>
      <tr><th>Alter</th><td>${f(p.alter)}${p.alter ? ' Jahre' : ''}</td></tr><tr><th>Formel für</th><td>${p.geschlecht === 'm' ? 'Männer' : p.geschlecht === 'w' ? 'Frauen' : f(null)}</td></tr>
      <tr><th>Gewicht</th><td>${f(p.gewicht)}${p.gewicht ? ' kg' : ''}</td></tr><tr><th>Größe</th><td>${f(p.groesse)}${p.groesse ? ' cm' : ''} <span class="leise">(nur für den Protein-Bezug)</span></td></tr>
      <tr><th>Alltag ohne Sport</th><td>${p.alltag ? `PAL ${PAL_ALLTAG[p.alltag][0].toLocaleString('de-DE')} – ${esc(PAL_ALLTAG[p.alltag][1])}` : f(null)}</td></tr>
      <tr><th>Training</th><td>${trText}</td></tr><tr><th>Krafttraining (Protein)</th><td>${p.kraft ? 'ja' : 'nein'}</td></tr>
      <tr><th>Ziel</th><td>${p.ziel ? esc(ZIELE[p.ziel] ? ZIELE[p.ziel][0] : p.ziel) : f(null)}${p.ziel === 'abbau' ? ` (${p.defizit_kcal ? '−' + p.defizit_kcal + ' kcal' : '−' + Math.round((p.defizit || 0.1) * 100) + ' %'})` : ''}</td></tr>
    </tbody></table>
    <p class="leise klein">Bürojob mit wenigen Schritten = „überwiegend sitzend“ (PAL 1,4). Sport gehört nur in „Training“, nicht zusätzlich in den Alltag – sonst wird er doppelt gezählt. <a href="#/einrichtung/1">Angaben ändern</a></p></details>`;
}
/* Schätzung aus dem eigenen Verlauf: nur mit ausreichend vollständigen Tagen und Gewichtsmessungen; wird nie automatisch übernommen */
function verlaufSchaetzung() {
  const kg = arr((D.training || {}).koerpergewicht).slice().sort((a, b) => a.datum.localeCompare(b.datum)); if (kg.length < 2) return { ok: false, grund: 'mindestens zwei Gewichtsmessungen im Abstand von 14 Tagen nötig (Training › Körpergewicht)' };
  const ende = kg[kg.length - 1]; const start = [...kg].reverse().find(x => tageZwischenE(x.datum, ende.datum) >= 14); if (!start) return { ok: false, grund: 'Gewichtsmessungen über mindestens 14 Tage nötig' };
  const tage = tageZwischenE(start.datum, ende.datum); const vollst = []; for (let i = 0; i < tage; i++) { const t = plusTage(start.datum, i); if (((D.tage || {})[t] || {}).vollstaendig) { const s = tagWerte(t); if (s.kcal > 0 && !s.fehlend.kcal) vollst.push(s.kcal); } }
  if (vollst.length < tage * 0.8) return { ok: false, grund: `nur ${vollst.length} von ${tage} Tagen als vollständig protokolliert (mindestens 80 % nötig)` };
  const schnitt = vollst.reduce((a, b) => a + b, 0) / vollst.length; const diff = ende.kg - start.kg; const kcal = schnitt - diff * 7700 / tage;
  return { ok: true, kcal: rund(kcal, 50), schnitt, diff, tage, n: vollst.length };
}
const tageZwischenE = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000);
function verlaufSchaetzungHtml(b) {
  const v = verlaufSchaetzung();
  return `<h2>3. Schätzung aus deinem Verlauf</h2>${v.ok ? `<div class="flaeche"><p>Erhaltungsbedarf laut Verlauf ≈ <b>${v.kcal.toLocaleString('de-DE')} kcal</b>${b.ok ? ` (Formel: ${Math.round(b.gesamt).toLocaleString('de-DE')} kcal)` : ''}</p><p class="leise klein">Grundlage: ${v.n} vollständig protokollierte Tage, Ø ${Math.round(v.schnitt)} kcal; Gewicht ${v.diff >= 0 ? '+' : ''}${zahlDE(v.diff, 1)} kg in ${v.tage} Tagen; 1 kg ≈ 7.700 kcal (grobe Näherung). Wasserschwankungen und Protokollfehler verzerren das – die App übernimmt diesen Wert nicht automatisch; bei Bedarf unter „Selbst festlegen“ eintragen.</p></div>` : `<p class="leise klein">Noch keine Schätzung: ${esc(v.grund)}.</p>`}`;
}

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
/* Datenquelle eines allgemeinen Werts: BLS 4.0 (Vorrang) oder USDA FoodData Central, wo der BLS keinen passenden Eintrag hat */
const quelleText = code => !code ? 'keine Nährwerte' : /^USDA-/.test(code) ? 'USDA FoodData Central ' + code.slice(5) : 'BLS ' + code;
const istFluessig = z => !!(z && (z.fluessig || z.dichte));
/* Menge in g oder ml; ml wird über die belegte Dichte (sonst Näherung 1 g/ml, gekennzeichnet) in g umgerechnet – Werte gelten je 100 g */
function lebensmittelEintrag(z, menge, einheit = 'g') {
  const code = Object.keys(z.bls || {})[0]; const w = code ? z.bls[code].werte : {};
  const naehr = {}; ['kcal', 'protein', 'kh', 'fett', 'ballaststoffe', 'zucker', 'salz'].forEach(k => { naehr[k] = w[k] == null ? null : w[k] / 100; });
  const mikro = {}; Object.keys(K.naehrstoffe || {}).forEach(k => { mikro[k] = { w: w[k] == null ? null : w[k] / 100, abdeckung: w[k] == null ? 0 : 100 }; });
  const ml = einheit === 'ml'; const d = ml ? (Number(z.dichte) || 1) : 1;
  const e = { id: uid('mz'), datum: tbDatum || heute(), zeit: new Date().toTimeString().slice(0, 5), quelle: 'lebensmittel', mahlzeit: neuerEintragSlot(), zutat: z.id, titel: z.name, gramm: menge, einheit: ml ? 'ml' : 'g', naehr, mikro, status: code ? 'vollstaendig' : 'unvollstaendig', datenquelle: code ? quelleText(code) + ' (allgemeiner Wert)' : 'keine Nährwerte' };
  if (ml) { e.dichte = d; e.dichte_basis = z.dichte ? (z.dichte_quelle || 'belegte Dichte') : 'Näherung 1 g/ml (keine belegte Dichte)'; }
  eintragSkalieren(e, menge * d); return e;
}
/* Oberbegriffe für Markenprodukte (Suchwort → Produktart); nur für die Suche, keine Werteübertragung */
const istProt = p => /protein/i.test(`${p.name} ${p.linie || ''} ${p.variante || ''}`);
const MARKEN_OBERBEGRIFFE = { proteinmilch: p => p.kategorie === 'getraenk' && istProt(p), proteindrink: p => p.kategorie === 'getraenk' && istProt(p), proteinshake: p => p.kategorie === 'getraenk' && istProt(p) || p.kategorie === 'proteinpulver',
  proteinpulver: p => p.kategorie === 'proteinpulver', eiweisspulver: p => p.kategorie === 'proteinpulver', whey: p => p.kategorie === 'proteinpulver', proteinriegel: p => p.kategorie === 'riegel', proteinpudding: p => p.kategorie === 'dessert' && istProt(p),
  hafermilch: p => p.kategorie === 'pflanzendrink' && /hafer/i.test(p.name), sojamilch: p => p.kategorie === 'pflanzendrink' && /soja/i.test(p.name), pflanzenmilch: p => p.kategorie === 'pflanzendrink' };
/* Kuratierte Markenprodukte aus dem Katalog: Werte des konkreten Produkts (Hersteller-/Händlerangabe), nie als allgemeiner Wert */
const markeName = p => `${p.marke ? p.marke + ' ' : ''}${p.name}${p.variante ? ' – ' + p.variante : ''}`;
const PRODUKT = id => (K.produkte || []).find(p => p.id === id);
function markenEintrag(p, menge) {
  const e = eigenerEintrag({ id: p.id, name: markeName(p), naehr: p.naehr || {}, bezug: p.bezug, quelle: { hersteller: 'Herstellerangabe', haendler: 'Händlerangabe', verpackung: 'Verpackungsangabe' }[p.quelle_art] || 'Produktangabe', quelle_datum: p.abgerufen, pruefstatus: 'katalog-' + (p.zuordnung || 'wahrscheinlich') }, menge);
  e.quelle = 'marke'; e.produkt = p.id; delete e.lebensmittel; return e;
}
// Mengen-Schnellwahl: nur belegte Mengen (Packung, Abtropfgewicht, Herstellerportionen)
function mengenWahlHtml(id, typ, p) {
  const opt = []; const einh = p.bezug === '100ml' ? 'ml' : 'g'; const pe = p.packung_einheit || einh;
  // Packung in ml, Werte je 100 g (oder umgekehrt): Menge wird 1:1 übernommen und so gekennzeichnet
  const packText = pe === einh ? `${zahlDE(p.packung)} ${einh}` : `${zahlDE(p.packung)} ${pe}, als ≈ ${zahlDE(p.packung)} ${einh} gerechnet`;
  if (Number(p.packung) > 0) { opt.push([`Packung (${packText})`, p.packung]); opt.push([`½ Packung`, Math.round(p.packung / 2)]); }
  if (Number(p.abtropf) > 0) opt.push([`abgetropft (${zahlDE(p.abtropf)} g)`, p.abtropf]);
  arr(p.portionen).forEach(x => opt.push([`${x.name} (${zahlDE(x.menge)} ${einh})`, x.menge]));
  return opt.length ? `<span class="mengen-wahl">${opt.map(([n, m]) => `<button type="button" class="klein still" data-a="tb-menge-setzen" data-v="${esc(id)}" data-m="${m}">${esc(n)}</button>`).join('')}</span>` : '';
}
/* Wie sicher passen die Werte zu genau dieser Variante (Geschmack, Fettstufe, Packung)? */
const ZUORDNUNG = { belegt: ['Variante belegt', 'gut'], wahrscheinlich: ['Variante nicht bestätigt', 'warn'], naeherung: ['Näherung', 'warn'] };
function markeDetailsHtml(p) {
  const n = p.naehr || {}; const einh = p.bezug === '100ml' ? 'ml' : 'g';
  const zeile = (lab, v, e) => `${lab} ${v == null ? '<span class="leise">?</span>' : zahlDE(v, 1) + ' ' + e}`;
  return `<p class="klein">Je 100 ${einh}: ${[zeile('Fett', n.fett, 'g'), zeile('davon gesättigt', n.gesfs, 'g'), zeile('Kohlenhydrate', n.kh, 'g'), zeile('davon Zucker', n.zucker, 'g'), zeile('Ballaststoffe', n.ballaststoffe, 'g'), zeile('Salz', n.salz, 'g')].join(' · ')}. Fehlende Angaben = unbekannt, nicht 0.</p>
    ${p.zuordnung_hinweis ? `<p class="klein"><b>Zuordnung:</b> ${esc(p.zuordnung_hinweis)}</p>` : ''}
    ${p.zubereitung ? `<p class="klein">${esc(p.zubereitung)}</p>` : ''}
    ${p.gtin ? `<p class="klein">Barcode ${esc(p.gtin)}</p>` : ''}
    ${p.zutaten ? `<p class="klein"><b>Zutaten:</b> ${esc(p.zutaten)}</p>` : ''}
    <p class="klein"><b>Allergene:</b> ${arr(p.allergene).length ? esc(arr(p.allergene).map(a => (typeof ALLERGEN_NAME !== 'undefined' && ALLERGEN_NAME[a]) || a).join(', ')) : 'keine Angabe – Packung beachten'}</p>
    <p class="klein"><b>Quelle:</b> ${p.quelle ? `<a href="${esc(p.quelle)}" target="_blank" rel="noopener">${esc(p.quelle.replace(/^https?:\/\/(www\.)?/, '').split(/[/?]/)[0])}</a>` : 'nicht angegeben'}${p.abgerufen ? `, abgerufen ${esc(datumDE(p.abgerufen))}` : ''}. ${esc(p.pruefstatus || '')}</p>
    ${arr(p.aenderungen).length ? `<p class="klein"><b>Korrekturen:</b> ${arr(p.aenderungen).map(esc).join('<br>')}</p>` : ''}
    <p class="leise klein">Markenprodukte sind Momentaufnahmen. Rezepturen ändern sich – im Zweifel gilt das Etikett. Bereits gebuchte Mahlzeiten behalten ihre damaligen Werte.</p>`;
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
  ${tag === heute() ? trainingRueckfrageHtml(true) : ''}
  <button class="haupt gross-plus" data-a="tb-fokus">${ico('plus')} Essen hinzufügen</button>
  <div class="flaeche tb-kompakt"><div class="balken">${MAKROS.filter(([k]) => k === 'kcal' || k === 'protein').map(zeileBalken).join('')}</div>
    <p class="klein" style="margin:4px 0 0">${MAKROS.filter(([k]) => k !== 'kcal' && k !== 'protein').map(([k, n, einh]) => `${n} <b>${zahlDE(s[k], 1)}</b>${ziele && ziele[k] ? ' / ' + zahlDE(ziele[k]) : ''} ${einh}`).join(' · ')}</p>
    <details class="klein"><summary class="leise">Grundlage und Vollständigkeit</summary><p class="leise klein" style="margin:4px 0">Laut protokollierten Einträgen (${s.eintraege}). ${ziele ? `Ziele: ${esc(ziele.herkunft)}.` : '<a href="#/ziele">Ziele festlegen</a> (optional).'} Fehlende Einträge heißen nicht, dass nichts gegessen wurde.</p></details>
    <label style="margin-top:6px"><input type="checkbox" data-a="tb-vollstaendig" ${info.vollstaendig ? 'checked' : ''}> Tag vollständig protokolliert</label></div>
  <h2 id="tb-hinzufuegen">Essen hinzufügen</h2>
  <div class="zeile"><label class="such-feld" style="flex:1 1 220px"><span class="sr-only">Suchen: Lebensmittel, Marke, Barcode, Rezept</span>${ico('suche', 'klein')}<input id="tb-suche" type="search" enterkeyhint="search" value="${esc(tbSuche)}" placeholder="Lebensmittel, Marke, Barcode oder Rezept" autocomplete="off"></label><button class="klein scan-knopf" data-a="scan-start" aria-label="Barcode mit der Kamera scannen">📷 Scannen</button></div>
  ${slotWahlHtml()}
  <div id="tb-standard">${standardListeHtml()}</div>
  <div id="tb-korb">${korbHtml()}</div>
  <div id="tb-treffer">${tbTreffer()}</div>
  <div id="tb-online">${offOnlineHtml()}</div>
  ${rest.length ? `<h4>Restportionen</h4><div class="schnellwahl">${rest.map(p => `<button class="klein" data-a="rest-essen" data-v="${esc(p.id)}" data-p="1">${ico('portion', 'klein')} ${esc(kurztitel(p.titel))} · 1 Portion</button>${p.portionen >= 0.5 ? `<button class="klein still" data-a="rest-essen" data-v="${esc(p.id)}" data-p="0.5" aria-label="halbe Portion ${esc(kurztitel(p.titel))}">½</button>` : ''}`).join('')}</div>` : ''}
  ${haeufig.length ? `<h4>Häufig gegessen</h4><div class="schnellwahl">${haeufig.map(({ e }) => `<button class="klein" data-a="tb-kopie" data-v="${esc(e.id)}">${esc(kurztitel(e.titel))} · ${e.einheit === 'Portion' ? zahlDE(e.portionen, 1) + ' P.' : zahlDE(e.gramm) + ' ' + esc(e.einheit || 'g')}</button>`).join('')}</div>` : ''}
  ${schnellwahlHtml()}
  <details class="klein"><summary>Freier Eintrag oder eigenes Lebensmittel anlegen</summary>${tbFormulare()}</details>
  <h2>Einträge</h2>${ein.length && tag !== heute() ? `<p style="margin-top:-4px"><button class="still klein" data-a="tb-kopie-vorschau" data-v="">Ganzen Tag kopieren …</button></p>` : ''}${kopierVorschauHtml(ein)}${eintraegeHtml(ein, tag)}
  <h2>Letzte 7 Tage</h2>
  <div class="woche" role="img" aria-label="Energie der letzten 7 Tage">${w7.map(x => `<div><i class="${x.voll ? '' : 'unv'}" style="height:${Math.round(x.s.kcal / maxK * 100)}%" title="${datumDE(x.t)}: ${zahlDE(x.s.kcal)} kcal${x.voll ? '' : ' (nicht als vollständig markiert)'}"></i>${new Date(x.t + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short' })}</div>`).join('')}</div>
  <p class="leise klein">${mitDaten.length ? `Ø ${zahlDE(mitDaten.reduce((a, x) => a + x.s.kcal, 0) / mitDaten.length)} kcal · ${zahlDE(mitDaten.reduce((a, x) => a + x.s.protein, 0) / mitDaten.length)} g Protein an ${mitDaten.length} Tagen mit Einträgen (davon ${w7.filter(x => x.voll && x.s.eintraege).length} als vollständig markiert). Schraffiert = nicht als vollständig markiert.` : 'Noch keine Einträge in diesen 7 Tagen.'}</p>
  <details class="flaeche"><summary><b>Auswertung über mehrere Tage</b> <span class="leise klein">– 7, 14 oder 30 Tage</span></summary>${auswertungHtml(tag)}</details>
  <details class="flaeche"><summary><b>Mikronährstoffe</b> <span class="leise klein">– protokolliert, Referenzwert, Abdeckung</span></summary>
    ${mikroHtml(tag)}</details>`;
}
/* Häufige Suchen ohne allgemeinen BLS-Eintrag → verwandte Einträge als Hinweis (bewusst keine Gleichsetzung) */
const TB_VERWANDT = { skyr: ['Magerquark', 'Joghurt, fettarm', 'Hüttenkäse'], proteinriegel: ['Müsliriegel'], proteinpudding: ['Joghurt, fettarm'], 'griechischer joghurt': ['Joghurt, fettarm'], tofu: [], seitan: [], wrap: ['Weizentortilla'], toast: ['Toastbrot'], semmel: ['Brötchen'], schrippe: ['Brötchen'], bratkartoffeln: ['Kartoffeln, gekocht'], pommes: ['Pommes frites, aus dem Ofen'], cappuccino: ['Kaffee', 'Fettarme Milch'], latte: ['Kaffee', 'Fettarme Milch'], energy: ['Cola'] };
/* Trefferbewertung Lebensmittelsuche (kleiner = besser, 99 = kein Treffer).
   Name vor Alias; Wortanfang vor Wortinnerem; ein Treffer nur auf ein Beiwort im Alias (z. B. „mageres Rindfleisch“ bei „mager“) ist schwach
   und wird ausgeblendet, sobald es passende Treffer gibt. Mehrere Wörter müssen alle vorkommen (Reihenfolge egal). */
const RE_ESC = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Suchfelder einmal vorbereiten (normalisiert, Wortteile, Originalwörter) – sonst kostet jede Eingabe bei ~900 Einträgen spürbar Zeit
const SUCH_FELD_CACHE = new Map();
function suchFeld(o) {
  let f = SUCH_FELD_CACHE.get(o); if (f) return f;
  const s = suchNorm(o); const orig = String(o).split(/[\s,()–-]+/).filter(Boolean);
  f = { o: String(o), ol: String(o).toLowerCase(), s, sk: s.replace(/,/g, ''), tok: s.split(/[^a-z0-9]+/).filter(Boolean), teile: s.split(/[\s,]+/).filter(Boolean), orig: orig.map(w => [w, suchNorm(w)]) };
  SUCH_FELD_CACHE.set(o, f); return f;
}
function suchBewertung(name, aliases, qn, roh) {
  const worte = qn.split(/[\s,]+/).filter(Boolean);
  const umlaut = roh && /[äöüß]/.test(roh) ? roh : '';   // „öl“ soll nicht zuerst „Oliven“ treffen
  let best = 99;
  const pruefe = (o, alias) => {
    if (!o) return; const f = suchFeld(o); const s = f.s; let p;
    if (s === qn || f.sk === qn) p = 0;
    else if (s.startsWith(qn + ',') || s.startsWith(qn + ' ')) p = 0.5;
    else if (s.startsWith(qn)) p = 1;
    else if (worte.length > 1 && worte.every(w => f.tok.some(t => t.startsWith(w)))) p = 1.5;
    else if (worte.length === 1 && f.tok.some(t => t.startsWith(qn))) p = 2;
    else if (worte.length === 1 && f.teile.some(x => x.length > qn.length && x.endsWith(qn))) p = 2.5;   // Grundwort eines zusammengesetzten Worts, z. B. „Rapsöl“ bei „öl“
    else if (qn.length >= 4 && worte.every(w => s.includes(w))) p = 3;   // sonstiges Wortinneres
    else return;
    // Trifft ein einzelnes Suchwort nur ein klein geschriebenes Beiwort („mageres“, „gekocht“), ist das kein passender Name
    if (worte.length === 1 && p > 0) { const w = f.orig.find(x => x[1].startsWith(worte[0])); if (w && /^[a-zäöüß]/.test(w[0])) p = Math.max(p, 2) + 2; }
    if (umlaut && !f.ol.includes(umlaut)) p += 2;
    if (alias) p += p >= 2 ? 2 : 0.3;
    if (p < best) best = p;
  };
  pruefe(name, false); const al = arr(aliases); for (let i = 0; i < al.length; i++) pruefe(al[i], true);
  return best;
}
// Vorsichtige Tippfehlertoleranz: höchstens 1 Fehler (ab 5 Zeichen) bzw. 2 (ab 9 Zeichen), Vertauschung zählt als 1
function tippAbstand(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1; const d = []; for (let i = 0; i <= a.length; i++) { d[i] = [i]; } for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) { let zeileMin = 99; for (let j = 1; j <= b.length; j++) { const k = a[i - 1] === b[j - 1] ? 0 : 1; d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + k); if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1); zeileMin = Math.min(zeileMin, d[i][j]); } if (zeileMin > max) return max + 1; }
  return d[a.length][b.length];
}
function tippVorschlaege(qn) {
  const max = qn.length >= 9 ? 2 : qn.length >= 5 ? 1 : 0; if (!max) return [];
  return K.zutaten.filter(z => Object.keys(z.bls || {}).length).map(z => { const kand = [z.name, ...arr(z.aliases)].flatMap(n => { const s = suchNorm(n); return [s, s.split(/[\s,]+/)[0]]; }); return [z, Math.min(...kand.map(s => tippAbstand(qn, s.slice(0, qn.length + max), max)))]; })
    .filter(([, d]) => d <= max).sort((a, b) => a[1] - b[1] || a[0].name.length - b[0].name.length).slice(0, 4).map(([z]) => z);
}
function tbTreffer() {
  const q = tbSuche.trim().toLowerCase(); if (q.length < 2) return '';
  const qn = suchNorm(q).replace(/\s+/g, ' ').trim();
  const roh = q.replace(/\s+/g, ' ').trim(); const rang = n => suchBewertung(n, [], qn, roh);
  const bewertet = K.zutaten.filter(z => Object.keys(z.bls || {}).length).map(z => [z, suchBewertung(z.name, z.aliases, qn, roh)]).filter(([, p]) => p < 99);
  const stark = bewertet.some(([, p]) => p < 3);
  const zt = bewertet.filter(([, p]) => !stark || p < 3.5).sort((a, b) => a[1] - b[1] || a[0].name.length - b[0].name.length).slice(0, 8).map(([z]) => z);
  const eg = (D.lebensmittel || []).map(l => [l, suchBewertung(l.name + (l.marke ? ' ' + l.marke : ''), [l.gtin || ''], qn, roh)]).filter(([, p]) => p < 99).sort((a, b) => a[1] - b[1]).slice(0, 6).map(([l]) => l);
  const art = MARKEN_OBERBEGRIFFE[qn]; const ober = p => art && art(p) ? 2.5 : 99;   // z. B. „Proteinmilch“ → Protein-Milchgetränke
  const mk = (K.produkte || []).map(p => [p, Math.min(suchBewertung(p.name, [markeName(p), (p.marke || '') + ' ' + p.name, p.linie || '', p.gtin || ''], qn, roh), suchBewertung(markeName(p), [], qn, roh), ober(p))]).filter(([, s]) => s < 99).sort((a, b) => a[1] - b[1] || markeName(a[0]).length - markeName(b[0]).length).slice(0, 10).map(([p]) => p);
  const rz = K.rezepte.map(r => [r, rang(r.titel)]).filter(([, p]) => p < 99).sort((a, b) => a[1] - b[1]).slice(0, 5).map(([r]) => r);
  const mz = (D.mahlzeiten || []).filter(m => rang(m.name) < 99).slice(0, 4);
  if (!zt.length && !eg.length && !mz.length && !mk.length) {
    // Verwandte allgemeine Einträge nur als Hinweis anbieten – keine automatische Gleichsetzung; Tippfehler nur als Rückfrage
    const verw = (TB_VERWANDT[qn] || []).map(n => K.zutaten.find(z => z.name === n && Object.keys(z.bls || {}).length)).filter(Boolean);
    const tipp = verw.length ? [] : tippVorschlaege(qn);
    // Nur über den lokalen Bestand sprechen – ob es das Produkt online gibt, zeigt der Online-Bereich darunter
    const online = qn.length >= 3 || istBarcode(qn);
    return `<div class="hinweis klein"><b>In der App-Datenbank und deinen Produkten nichts zu „${esc(tbSuche.trim())}“.</b>${online ? ' Die Online-Suche läuft darunter.' : ''}${tipp.length ? `<br>Meintest du: ${tipp.map(z => `<button class="klein still" data-a="tb-suche-setzen" data-v="${esc(z.name)}">${esc(z.name)}</button>`).join(' ')}` : ''}${verw.length ? `<br>Ähnlich, aber nicht gleich (Werte weichen ab): ${verw.map(z => `<button class="klein still" data-a="tb-suche-setzen" data-v="${esc(z.name)}">${esc(z.name)}</button>`).join(' ')}` : ''}
      ${online ? '' : '<br>Für die Online-Suche mindestens 3 Zeichen oder einen Barcode eingeben. Oder <a href="#/produkte/neu">Produkt mit den Werten vom Etikett anlegen</a>.'}</div>`
      + (rz.length ? `<h4 class="tg-titel">Rezepte mit „${esc(tbSuche.trim())}“</h4><ul class="eintraege treffer">${rz.map(r => `<li><span class="tz-name"><b>${esc(r.titel)}</b><br><span class="leise klein">Rezept</span></span><span class="tz-aktion"><button class="haupt klein" data-a="tb-rezept" data-v="${esc(r.id)}" data-p="1">${ico('plus', 'klein')} 1 Portion</button></span></li>`).join('')}</ul>` : '');
  }
  const gruppe = (titel, inhalt) => inhalt ? `<h4 class="tg-titel">${titel}</h4><ul class="eintraege treffer">${inhalt}</ul>` : '';
  const lmZeile = z => { const c = Object.keys(z.bls)[0]; const sm = startMenge(z); const fl = istFluessig(z); const zust = zustandText(z);
    return `<li><span class="tz-name"><b>${esc(z.name)}</b>${zust ? ` <span class="chip">${esc(zust)}</span>` : ''}${z.wert_hinweis ? ' <span class="chip warn">Näherung</span>' : ''}<br><span class="leise klein">allgemeiner Wert (${/^USDA-/.test(c) ? 'USDA' : 'BLS'}) · ${zahlDE(z.bls[c].werte.kcal)} kcal/100 g${fl ? (z.dichte ? ` · ${zahlDE(z.dichte, 2)} g/ml` : ' · ml ≈ g (Näherung)') : ''}${z.wert_hinweis ? `<br>${esc(z.wert_hinweis)}` : ''}</span></span>
      <span class="tz-aktion"><label class="feld menge-feld"><span class="sr-only">Menge ${esc(z.name)}</span><input type="number" min="1" value="${sm.m}" data-gramm="${esc(z.id)}" inputmode="decimal"></label>${fl ? `<select data-einheit="${esc(z.id)}" aria-label="Einheit"><option value="ml" ${sm.e === 'ml' ? 'selected' : ''}>ml</option><option value="g" ${sm.e === 'g' ? 'selected' : ''}>g</option></select>` : '<span class="einh">g</span>'}
      <button class="haupt klein" data-a="tb-lm" data-v="${esc(z.id)}">${ico('plus', 'klein')} Eintragen</button><button class="klein" data-a="tb-korb-add" data-t="lm" data-v="${esc(z.id)}">+ Liste</button>${standardKnopf('lm', z.id)}</span></li>`; };
  const egZeile = l => `<li><span class="tz-name"><b>${esc(l.name)}</b>${l.marke ? ' · ' + esc(l.marke) : ''}<br><span class="leise klein">eigenes Produkt · ${l.naehr.kcal != null ? zahlDE(l.naehr.kcal) + ' kcal/100 ' + (l.bezug === '100ml' ? 'ml' : 'g') : 'kcal unbekannt'}</span></span>
      <span class="tz-aktion"><label class="feld menge-feld"><span class="sr-only">Menge ${esc(l.name)}</span><input type="number" min="1" value="${esc(l.portion || 100)}" data-gramm="${esc(l.id)}" inputmode="decimal"></label><span class="einh">${l.bezug === '100ml' ? 'ml' : 'g'}</span><button class="haupt klein" data-a="tb-eigen" data-v="${esc(l.id)}">${ico('plus', 'klein')} Eintragen</button><button class="klein" data-a="tb-korb-add" data-t="eigen" data-v="${esc(l.id)}">+ Liste</button>${standardKnopf('eigen', l.id)}</span></li>`;
  const rzZeile = r => `<li><span class="tz-name"><b>${esc(r.titel)}</b><br><span class="leise klein">Rezept · ${r.naehrwerte.pro_portion.kcal != null ? zahlDE(r.naehrwerte.pro_portion.kcal) + ' kcal/Portion' : 'kcal unbekannt'}</span></span><span class="tz-aktion"><button class="haupt klein" data-a="tb-rezept" data-v="${esc(r.id)}" data-p="1">${ico('plus', 'klein')} 1 Portion</button><button class="klein" data-a="tb-rezept" data-v="${esc(r.id)}" data-p="0.5">½ Portion</button><button class="klein" data-a="tb-korb-add" data-t="rezept" data-v="${esc(r.id)}" data-p="1">+ Liste</button></span></li>`;
  const mzZeile = m => `<li><span class="tz-name"><b>${esc(m.name)}</b><br><span class="leise klein">eigene Mahlzeit · ${m.eintraege.length} Teile</span></span><span class="tz-aktion"><button class="haupt klein" data-a="tb-mz-buchen" data-v="${esc(m.id)}">${ico('plus', 'klein')} Eintragen</button></span></li>`;
  const mkZeile = p => { const einh = p.bezug === '100ml' ? 'ml' : 'g'; const start = (standardFuer('marke', p.id) || {}).menge || (arr(p.portionen)[0] || {}).menge || (Number(p.packung) && p.packung <= 250 ? p.packung : 100);
    // Kompakt: Name, Marke/Variante, Packung, kcal + Eiweiß, knapper Prüfstatus – Quelle, Methodik, Zutaten und Unsicherheiten unter „Details“
    const zu = ZUORDNUNG[p.zuordnung] || ZUORDNUNG.wahrscheinlich;
    return `<li><span class="tz-name"><b>${esc(p.marke ? p.marke + ' ' : '')}${esc(p.name)}</b>${p.variante ? ` · ${esc(p.variante)}` : ''}<br><span class="leise klein">${p.naehr && p.naehr.kcal != null ? zahlDE(p.naehr.kcal) + ' kcal' : 'kcal ?'}${p.naehr && p.naehr.protein != null ? ' · ' + zahlDE(p.naehr.protein, 1) + ' g Eiweiß' : ''} je 100 ${einh}${Number(p.packung) ? ` · Packung ${zahlDE(p.packung)} ${esc(p.packung_einheit || einh)}` : ''}${p.zubereitung && /^Pulver/i.test(p.zubereitung) ? ' · Werte fürs Pulver' : ''}</span>
      <br><span class="chip ${zu[1]}" title="${esc(p.zuordnung_hinweis || '')}">${zu[0]}</span> <span class="leise klein">${p.quelle_art === 'hersteller' ? 'Herstellerangabe' : p.quelle_art === 'verpackung' ? 'Verpackung' : 'Händlerangabe'}${p.abgerufen ? ', ' + esc(datumDE(p.abgerufen)) : ''}</span>${mengenWahlHtml(p.id, 'marke', p)}
      <details class="klein tz-details"><summary>Details</summary>${markeDetailsHtml(p)}</details></span>
      <span class="tz-aktion"><label class="feld menge-feld"><span class="sr-only">Menge ${esc(p.name)}</span><input type="number" min="1" value="${esc(start)}" data-gramm="${esc(p.id)}" inputmode="decimal"></label><span class="einh">${einh}</span><button class="haupt klein" data-a="tb-marke" data-v="${esc(p.id)}">${ico('plus', 'klein')} Eintragen</button><button class="klein" data-a="tb-korb-add" data-t="marke" data-v="${esc(p.id)}">+ Liste</button>${standardKnopf('marke', p.id)}</span></li>`; };
  const nurArt = a => tbArt === 'alle' || tbArt === a;
  const artChips = `<div class="chips-wrap tb-arten" role="group" aria-label="Trefferart">${[['alle', 'Alle'], ['lm', `Lebensmittel (${zt.length})`], ['marke', `Marken (${mk.length})`], ['rezept', `Rezepte (${rz.length})`], ['mz', `Mahlzeiten (${mz.length + eg.length})`]].map(([k, n]) => `<button class="filterchip" data-a="tb-art" data-v="${k}" aria-pressed="${tbArt === k}">${n}</button>`).join('')}</div>`;
  return artChips + (nurArt('lm') ? gruppe('Lebensmittel', zt.map(lmZeile).join('')) : '') + (nurArt('marke') ? gruppe('Markenprodukte', mk.map(mkZeile).join('')) : '') + (nurArt('mz') ? gruppe('Eigene Produkte', eg.map(egZeile).join('')) + gruppe('Gespeicherte Mahlzeiten', mz.map(mzZeile).join('')) : '') + (nurArt('rezept') ? gruppe('Rezepte', rz.map(rzZeile).join('')) : '')
    + `<p class="leise klein">Startmengen sind Vorschläge – bitte anpassen. „+ Liste“ sammelt mehrere Lebensmittel (z. B. Magerquark und Haferflocken) und trägt sie gemeinsam ein; danach lässt sich die Mahlzeit speichern.</p>`;
}
/* Praktische Startmenge je Lebensmittelart (Eingabevorschlag, keine Datenangabe) */
function startMenge(z) {
  const n = suchNorm(z.name);
  if (istFluessig(z)) return /essig|\bol\b|ol,|sauce|sirup|honig|mirin|kecap/.test(n) || z.kategorie === 'fett' ? { m: 10, e: 'ml' } : { m: 200, e: 'ml' };
  if (/quark|joghurt|skyr|huttenkase/.test(n)) return { m: 150, e: 'g' };
  if (/flocken|musli|cornflakes|granola|porridge/.test(n)) return { m: 50, e: 'g' };
  if (/nuss|nusse|kerne|samen|mandel|pistazie|cashew|studentenfutter/.test(n)) return { m: 25, e: 'g' };
  if (/kase|gouda|emmentaler|mozzarella|feta|parmesan/.test(n)) return { m: 30, e: 'g' };
  if (/brot|brotchen|toast|brezel|croissant|tortilla|knackebrot|reiswaffel/.test(n)) return { m: 60, e: 'g' };
  if (/butter|margarine|creme|nougat|konfiture|marmelade|aufstrich/.test(n) || z.kategorie === 'fett') return { m: 15, e: 'g' };
  if (/pulver|pfeffer|salz|zimt|kreuzkummel|kurkuma|oregano|muskat|curry|natron/.test(n)) return { m: 2, e: 'g' };
  if (/schokolade|keks|chips|riegel|fruchtgummi/.test(n)) return { m: 30, e: 'g' };
  return { m: 100, e: 'g' };
}
/* Zubereitungszustand sichtbar machen: gekocht/gebraten/abgetropft im Namen, sonst „roh/trocken“, wenn es eine gegarte Variante gibt */
function zustandText(z) {
  const m = z.name.match(/(gekocht|gebraten|gebacken|abgetropft|getrocknet|aus der Dose|aus dem Glas|aus dem Ofen)/i); if (m) return m[1];
  const basis = suchFeld(z.name).s; return K.zutaten.some(x => x !== z && suchFeld(x.name).s.startsWith(basis + ', gekocht')) ? 'roh/trocken' : '';
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
  const s = $('#tb-suche'); if (s) s.addEventListener('input', () => { tbSuche = s.value; $('#tb-treffer').innerHTML = tbTreffer(); offOnlineSuche(s.value); });
  if (tbSuche && offOnline.q !== tbSuche.trim()) offOnlineSuche(tbSuche);
  const fr = $('#tb-frei'); if (fr) fr.addEventListener('submit', ev => { ev.preventDefault(); const n = k => fr[k].value === '' ? null : Number(fr[k].value);
    aendere('Eingetragen', d => d.tagebuch.push({ id: uid('mz'), datum: tbDatum, zeit: new Date().toTimeString().slice(0, 5), quelle: 'frei', mahlzeit: neuerEintragSlot(), titel: fr.titel.value, portionen: 1, einheit: 'Portion', naehr: { kcal: n('kcal'), protein: n('protein'), kh: n('kh'), fett: n('fett'), ballaststoffe: null }, mikro: null, status: 'unvollstaendig' })); });
  const lm = $('#tb-lm-neu'); if (lm) lm.addEventListener('submit', ev => { ev.preventDefault(); const n = k => lm[k].value === '' ? null : Number(lm[k].value);
    aendere('Lebensmittel gespeichert', d => { (d.lebensmittel = d.lebensmittel || []).push({ id: uid('lm'), name: lm.name.value.trim(), marke: lm.marke.value.trim() || null, gtin: lm.gtin.value.trim() || null, bezug: lm.bezug.value, naehr: { kcal: n('kcal'), protein: n('protein'), kh: n('kh'), zucker: n('zucker'), fett: n('fett'), ballaststoffe: n('ballaststoffe'), salz: n('salz') }, portion: n('portion'), quelle: lm.quelle.value, erfasst: heute(), version: 1 }); });
    tbSuche = lm.name.value; route(); });
};
// Abneigungsstufe sofort speichern (nicht erst beim „Weiter“)
document.addEventListener('change', ev => { const el = ev.target; if (el.dataset && el.dataset.abneigung) { const zid = el.dataset.abneigung; const v = Number(el.value); aendere('Abneigung geändert', d => { d.einstellungen.abneigungen = Object.assign({}, d.einstellungen.abneigungen); if (v) d.einstellungen.abneigungen[zid] = v; else delete d.einstellungen.abneigungen[zid]; }, { neuZeichnen: false }); } });
/* Aktionen dieses Moduls (vor den Aktionen von app.js registriert) */
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a, v = b.dataset.v;
  switch (a) {
    case 'einr-zurueck': { const f = $('#einr-form'); if (f) einrichtungSpeichern(f, false); location.hash = '#/einrichtung/' + Math.max(0, einrSchritt - 1); break; }
    case 'einr-ueberspringen': aendere('Einrichtung übersprungen – jederzeit unter Profil möglich', d => { d.einstellungen.einrichtung = d.einstellungen.einrichtung || 'uebersprungen'; }, { neuZeichnen: false }); location.hash = '#/entdecken'; break;
    case 'abneigung-weg': { const z = Z[v]; aendere(`${z ? z.name : 'Abneigung'} entfernt – keine Angabe mehr`, d => { if (d.einstellungen.abneigungen) delete d.einstellungen.abneigungen[v]; }, { neuZeichnen: false }); const row = b.closest('.abneigung-zeile'); if (row) row.remove(); break; }
    case 'abneigung-add': { const i = $('#abneigung-neu'); const z = ZN[(i.value || '').trim()]; if (!z) { toast('Bitte eine Zutat aus der Liste wählen'); break; } const box = $('#abneigungen'); if (!box.querySelector(`[data-abneigung="${z.id}"]`)) { box.insertAdjacentHTML('beforeend', abneigungZeile(z.id, 2)); aendere(`${z.name} als Abneigung gespeichert`, d => { d.einstellungen.abneigungen = Object.assign({}, d.einstellungen.abneigungen, { [z.id]: 2 }); }, { neuZeichnen: false }); } i.value = ''; break; }
    case 'profil-wechseln': profilWechseln(v); break;
    case 'profil-umbenennen': { const l = profilListe(); const p = l.find(x => x.id === v); const n = prompt('Neuer Name', p.name); if (n && n.trim()) { p.name = n.trim().slice(0, 30); try { localStorage.setItem(PROFILE_SPEICHER, JSON.stringify(l)); } catch (e) { /* */ } route(); } break; }
    case 'tb-tag': tbDatum = plusTage(tbDatum || heute(), Number(v)); if (tbDatum > heute()) tbDatum = heute(); location.hash = '#/tagebuch/' + tbDatum; break;
    case 'tb-vollstaendig': aendere(null, d => { d.tage = d.tage || {}; d.tage[tbDatum] = Object.assign({}, d.tage[tbDatum], { vollstaendig: b.checked }); }); break;
    case 'tb-rezept': { const r = R[v]; aendere(`${kurztitel(r.titel)} eingetragen`, d => d.tagebuch.push(rezeptEintrag(r, Number(b.dataset.p) || 1))); break; }
    case 'tb-lm': { const z = Z[v]; const g = Number(String(($(`[data-gramm="${v}"]`) || {}).value || '').replace(',', '.')) || 100; const einh = ($(`[data-einheit="${v}"]`) || {}).value || 'g'; aendere(`${z.name} eingetragen`, d => d.tagebuch.push(lebensmittelEintrag(z, g, einh))); break; }
    case 'tb-eigen': { const l = (D.lebensmittel || []).find(x => x.id === v); const g = Number(($(`[data-gramm="${v}"]`) || {}).value) || 100; aendere(`${l.name} eingetragen`, d => d.tagebuch.push(eigenerEintrag(l, g))); break; }
    case 'tb-marke': { const p = PRODUKT(v); if (!p) return; const g = Number(String(($(`[data-gramm="${v}"]`) || {}).value || '').replace(',', '.')); if (!(g > 0)) { toast('Bitte eine Menge eingeben'); return; } aendere(`${markeName(p)} eingetragen`, d => d.tagebuch.push(markenEintrag(p, g))); break; }
    case 'tb-menge': { aendere(null, d => { const e = d.tagebuch.find(x => x.id === v); const dir = Number(b.dataset.d);
      if (e.einheit === 'Portion' || !e.einheit) { const alt = e.portionen || 1; let neu = Math.max(0.25, Math.round((alt + dir * 0.25) * 100) / 100); const q = e.restportion ? d.restportionen.find(x => x.id === e.restportion) : null; if (q && neu - alt > q.portionen) neu = alt; if (q) q.portionen = Math.round((q.portionen - (neu - alt)) * 100) / 100; eintragSkalieren(e, neu / alt); e.portionen = neu; }
      else { const alt = e.gramm || 100; const schritt = alt >= 200 ? 25 : 10; const neu = Math.max(5, alt + dir * schritt); eintragSkalieren(e, neu / alt); e.gramm = neu; } }); break; }
  }
});
