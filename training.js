/* Fitomat-Build 202611122114 */
/* Fitomat – Trainingsprotokoll (eigenständig, lokal, ohne Gewichtsautomatik).
   Daten in D.training: uebungen (eigene), routinen, einheiten, aktiv, koerpergewicht.
   Übungsbibliothek aus dem Katalog (K.uebungen), sobald vorhanden. */

function trDaten() {
  if (!D.training) D.training = { uebungen: [], routinen: [], einheiten: [], aktiv: null, koerpergewicht: [] };
  const t = D.training; if (!t.plaene) t.plaene = []; if (!t.einstellungen) t.einstellungen = { auto_pause: true, ton: true };
  return t;
}
/* ---------- Pläne: mehrere Einheiten (Routinen), optional mit Wochentag, oder flexibel „nächste Einheit“ ---------- */
const WOCHENTAGE = [['mo', 'Mo'], ['di', 'Di'], ['mi', 'Mi'], ['do', 'Do'], ['fr', 'Fr'], ['sa', 'Sa'], ['so', 'So']];
const heuteTag = () => ['so', 'mo', 'di', 'mi', 'do', 'fr', 'sa'][new Date().getDay()];
const PLAN_ART = { historisch: 'historische Vorlage (privat importiert)', eigen: 'eigener Plan', beispiel: 'allgemeines Beispiel' };
function planNaechste(p) {
  // Nächste Einheit = die nach der zuletzt abgeschlossenen aus diesem Plan; verpasste Einheiten gelten nicht als erledigt
  const t = trDaten(); const n = p.einheiten.length; if (!n) return null;
  const letzte = t.einheiten.filter(e => e.ende && e.plan === p.id && e.plan_eintrag != null).sort((a, b) => b.start.localeCompare(a.start))[0];
  return letzte ? (letzte.plan_eintrag + 1) % n : 0;
}
function aufwaermText(x) { return arr(x.aufwaerm_schema).map(w => `${w.pct} % × ${w.wdh}`).join(' · '); }
function alleUebungen() { const t = trDaten(); return [...(K.uebungen || []).map(u => Object.assign({ quelle: 'bibliothek' }, u)), ...t.uebungen.map(u => Object.assign({ quelle: 'eigen' }, u))]; }
function ueb(id) { return alleUebungen().find(u => u.id === id) || { id, name: 'Unbekannte Übung' }; }
const RIR_TEXT = 'RIR = „Wiederholungen in Reserve“: wie viele saubere Wiederholungen du am Ende des Satzes noch geschafft hättest (0 = keine mehr, 2 = noch zwei). Optional – eine grobe Selbsteinschätzung reicht.';
const kgText = v => v == null || v === '' ? '–' : zahlDE(Number(v), 2) + ' kg';

/* Letzte Leistung je Übung (aus abgeschlossenen Einheiten) */
// Gerätevarianten (z. B. anderer Kabelturm) werden getrennt geführt – ihre Gewichte sind nicht vergleichbar
function letzteLeistung(uebungId, ausser, variante) {
  const passt = u => u.uebung === uebungId && (u.variante || '') === (variante || '');
  const e = trDaten().einheiten.filter(x => x.ende && x.id !== ausser && x.uebungen.some(passt)).sort((a, b) => b.start.localeCompare(a.start))[0];
  if (!e) return null; const u = e.uebungen.find(passt);
  return { datum: e.start.slice(0, 10), saetze: u.saetze.filter(s => s.art === 'arbeit' && s.erledigt) };
}
const satzTeil = (w, kg) => `${w || '?'} × ${kgText(kg)}`;
// Einseitige Übungen: beide Seiten bilden EINEN Satz; s.kg/s.wdh enthalten die schwächere Seite (Grundlage für Vorschläge)
const satzText = s => `${s.seiten ? `L ${satzTeil(s.seiten.l.wdh, s.seiten.l.kg)} / R ${satzTeil(s.seiten.r.wdh, s.seiten.r.kg)}` : satzTeil(s.wdh, s.kg)}${s.rir !== '' && s.rir != null ? ' · RIR ' + s.rir : ''}`;

/* ---------- Muskelgruppen, Gewichtsangabe, Auswahl ---------- */
const MUSKEL_GRUPPEN = [['brust', 'Brust', ['brust']], ['ruecken', 'Rücken', ['latissimus', 'oberer_ruecken', 'rueckenstrecker']], ['schultern', 'Schultern', ['vordere_schulter', 'seitliche_schulter', 'hintere_schulter']], ['arme', 'Arme', ['bizeps', 'trizeps']], ['beine', 'Beine', ['quadrizeps', 'beinbeuger', 'waden']], ['gesaess', 'Gesäß', ['gesaess']], ['rumpf', 'Rumpf', ['rumpf']]];
function uebGruppen(u) { const m = [...arr(u.muskeln_haupt)]; return MUSKEL_GRUPPEN.filter(([, , l]) => l.some(x => m.includes(x))).map(g => g[0]); }
/* Was die kg-Zahl bedeutet – verhindert Verwechslung von Gesamtgewicht, Gewicht je Hantel und Geräteanzeige */
function gewichtArt(u) { const g = arr(u.geraet).map(String); if (g.includes('langhantel')) return 'kg gesamt (mit Stange)'; if (g.includes('kurzhantel')) return 'kg je Hantel'; if (g.includes('maschine') || g.includes('kabel')) return 'kg laut Gerät'; if (g.includes('koerpergewicht') || g.includes('klimmzugstange')) return 'Zusatz-kg'; return 'kg'; }
let trWahl = { q: '', gruppe: '' };
function uebungsWahlListe(ziel) {
  const q = trWahl.q.trim().toLowerCase();
  const l = alleUebungen().filter(u => (!trWahl.gruppe || uebGruppen(u).includes(trWahl.gruppe)) && (!q || (u.name + ' ' + arr(u.alias).join(' ')).toLowerCase().includes(q)));
  return l.length ? `<ul class="eintraege">${l.slice(0, 40).map(u => `<li><span><b>${esc(u.name)}</b><br><span class="leise klein">${esc(uebGruppen(u).map(g => MUSKEL_GRUPPEN.find(x => x[0] === g)[1]).join(', ') || (u.quelle === 'eigen' ? 'eigene Übung' : ''))}${arr(u.geraet).length ? ' · ' + esc(arr(u.geraet).join(', ')) : ''}</span></span><span><button class="klein" data-a="tr-wahl" data-v="${esc(u.id)}" data-ziel="${ziel}">${ico('plus', 'klein')} hinzufügen</button></span></li>`).join('')}</ul>` : '<p class="leise klein">Keine passende Übung. <a href="#/training/uebungen">Eigene Übung anlegen</a></p>';
}
function uebungsWahlHtml(ziel) {
  return `<details class="karte tr-wahl"${trWahl.offen === ziel ? ' open' : ''}><summary data-tr-wahl-auf="${ziel}"><b>${ico('plus', 'klein')} Übung hinzufügen</b></summary>
    <label class="feld"><span>Suchen</span><input data-tr-wahl-q="${ziel}" value="${esc(trWahl.q)}" placeholder="z. B. Rudern, Kniebeuge" autocomplete="off"></label>
    <div class="filterleiste" role="group" aria-label="Muskelgruppe"><button class="filterchip" data-a="tr-wahl-gruppe" data-v="" aria-pressed="${!trWahl.gruppe}">Alle</button>${MUSKEL_GRUPPEN.map(([k, n]) => `<button class="filterchip" data-a="tr-wahl-gruppe" data-v="${k}" aria-pressed="${trWahl.gruppe === k}">${n}</button>`).join('')}</div>
    <div id="tr-wahl-liste">${uebungsWahlListe(ziel)}</div></details>`;
}
/* Beispielroutinen: allgemeine, bearbeitbare Beispiele – kein persönlicher Trainingsplan */
const BEISPIEL_ROUTINEN = [
  ['Beispiel: Ganzkörper A', ['ueb-kniebeuge-langhantel', 'ueb-bankdruecken-langhantel', 'ueb-rudern-vorgebeugt-langhantel', 'ueb-plank']],
  ['Beispiel: Ganzkörper B', ['ueb-rumaenisches-kreuzheben', 'ueb-ueberkopfdruecken-stehend', 'ueb-latzug', 'ueb-ausfallschritt']],
  ['Beispiel: Zuhause mit Kurzhanteln', ['ueb-goblet-squat', 'ueb-kurzhantel-bankdruecken', 'ueb-kurzhantel-rudern-einarmig', 'ueb-liegestuetz', 'ueb-plank']]
];
/* Verlauf als kleine Linie: schwerster Arbeitssatz je Einheit */
function verlaufSvg(punkte) {
  if (punkte.length < 2) return '';
  const w = 300, h = 90, p = 8; const ys = punkte.map(x => x.kg); const min = Math.min(...ys), max = Math.max(...ys); const sp = max - min || 1;
  const xy = punkte.map((x, i) => [p + i * (w - 2 * p) / (punkte.length - 1), h - p - (x.kg - min) / sp * (h - 2 * p)]);
  return `<svg class="verlauf" viewBox="0 0 ${w} ${h}" role="img" aria-label="Verlauf schwerster Satz von ${zahlDE(punkte[0].kg, 1)} bis ${zahlDE(punkte[punkte.length - 1].kg, 1)} kg"><polyline points="${xy.map(a => a.join(',')).join(' ')}" fill="none" stroke="var(--akzent)" stroke-width="2.5" stroke-linejoin="round"/>${xy.map(a => `<circle cx="${a[0]}" cy="${a[1]}" r="3.5" fill="var(--akzent)"/>`).join('')}<text x="${p}" y="12" font-size="10" fill="var(--leise)">${zahlDE(max, 1)} kg</text><text x="${p}" y="${h - 1}" font-size="10" fill="var(--leise)">${zahlDE(min, 1)} kg</text></svg>`;
}

/* ---------- Übersicht ---------- */
function vTraining(teil, id) {
  const t = trDaten();
  if (teil === 'einheit') return trEinheitHtml();
  if (teil === 'start') return trStartHtml(id);
  if (teil === 'fuehrung') return trFuehrungHtml();
  if (teil === 'zusammenfassung') return trZusammenfassungHtml(id);
  if (teil === 'routine') return trRoutineHtml(id);
  if (teil === 'uebung') return trUebungHtml(id);
  if (teil === 'uebungen') return trUebungenHtml();
  if (teil === 'gewicht') return trGewichtHtml();
  if (teil === 'plan') return trPlanHtml(id);
  if (teil === 'einrichtung') return trEinrichtungHtml();
  if (teil === 'plaene') return trPlaeneHtml();
  if (teil === 'verlauf') return trVerlaufHtml();
  if (teil === 'cardio') return trCardioHtml();
  const akt = t.aktiv && t.einheiten.find(e => e.id === t.aktiv);
  const fertig = t.einheiten.filter(e => e.ende).sort((a, b) => b.start.localeCompare(a.start)).slice(0, 8);
  const kg = [...t.koerpergewicht].sort((a, b) => b.datum.localeCompare(a.datum))[0];
  const ap = t.plaene.find(p => p.aktiv) || null;
  const rn = rid => (t.routinen.find(r => r.id === rid) || { name: 'Einheit fehlt' }).name;
  const naechste = ap ? planNaechste(ap) : null; const heutig = ap ? ap.einheiten.findIndex(x => x.tag === heuteTag()) : -1;
  const startKnopf = (i, haupt) => { const pe = ap.einheiten[i]; return `<button class="${haupt ? 'haupt ' : ''}klein" data-a="tr-start" data-v="${esc(pe.routine)}" data-plan="${esc(ap.id)}" data-pe="${i}" ${akt ? 'disabled' : ''}>Starten</button>`; };
  return `<div class="seitenkopf"><h1>Training</h1><a class="knopf klein" href="#/training/uebungen">Übungen</a></div>
  ${akt ? `<div class="hinweis"><b>Einheit läuft</b> seit ${esc(new Date(akt.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }))} · ${esc(akt.name)} <a class="knopf haupt klein" href="#/training/${akt.fuehrung ? 'fuehrung' : 'einheit'}">Fortsetzen</a></div>` : ''}
  <h2>Plan</h2>
  ${ap ? `<div class="karte"><div class="zeile" style="justify-content:space-between;align-items:baseline"><b><a href="#/training/plan/${esc(ap.id)}">${esc(ap.name)}</a></b><span class="leise klein">${esc(PLAN_ART[ap.art] || '')}</span></div>
      ${heutig >= 0 ? `<p style="margin:.4em 0">Heute laut Wochentag: <b>${esc(rn(ap.einheiten[heutig].routine))}</b> ${startKnopf(heutig, true)}</p>` : ''}
      ${naechste != null && naechste !== heutig ? `<p style="margin:.4em 0">Nächste in der Reihenfolge: <b>${esc(rn(ap.einheiten[naechste].routine))}</b> ${startKnopf(naechste, heutig < 0)}</p>` : ''}
      <ul class="eintraege">${ap.einheiten.map((pe, i) => `<li><span>${pe.tag ? `<span class="chip">${esc((WOCHENTAGE.find(w => w[0] === pe.tag) || [])[1] || '')}</span> ` : ''}<a href="#/training/routine/${esc(pe.routine)}">${esc(rn(pe.routine))}</a></span><span>${startKnopf(i, false)}</span></li>`).join('')}</ul>
      <p class="leise klein">Verpasste Einheiten zählen nicht als erledigt – du startest einfach die passende als Nächstes.</p></div>`
    : `<p class="leise">Kein Plan aktiv. Ein Plan fasst mehrere Einheiten zusammen – mit Wochentagen oder flexibel in Reihenfolge.</p>${t.plaene.some(p => p.art === 'historisch') ? '' : '<p><a class="knopf haupt" href="#/training/plaene">Eigenen Plan übernehmen (QR-Code oder Plan-Code)</a></p>'}`}
  ${t.plaene.filter(p => !p.aktiv).length ? `<p class="klein">Weitere Pläne: ${t.plaene.filter(p => !p.aktiv).map(p => `<a href="#/training/plan/${esc(p.id)}">${esc(p.name)}</a>`).join(' · ')}</p>` : ''}
  <div class="knopfreihe"><button data-a="tr-plan-neu">${ico('plus', 'klein')} Neuer Plan</button><a class="knopf still" href="#/training/einrichtung">Einrichtung und Planvorschläge</a><a class="knopf still" href="#/training/cardio">Cardio</a></div>
  <details class="karte klein"><summary><b>Pausentimer und Vorschläge</b></summary>
    <label><input type="checkbox" data-tr-einst="auto_pause" ${t.einstellungen.auto_pause !== false ? 'checked' : ''}> Tabellenansicht: Pause nach jedem abgeschlossenen Arbeitssatz automatisch starten</label>
    <label><input type="checkbox" data-tr-einst="auto_weiter" ${t.einstellungen.auto_weiter !== false ? 'checked' : ''}> Geführt: nach Ablauf der Pause automatisch zur Ansicht des nächsten Satzes wechseln (sonst mit Bestätigung)</label>
    <label><input type="checkbox" data-tr-einst="vorschlag_vorausfuellen" ${t.einstellungen.vorschlag_vorausfuellen ? 'checked' : ''}> Geführt: Gewichtsvorschläge (Steigern/Senken) automatisch als Sollwert vorausfüllen – die tatsächliche Leistung bestätigst du weiterhin selbst</label>
    <label><input type="checkbox" data-tr-einst="ton" ${t.einstellungen.ton !== false ? 'checked' : ''}> Ton/Vibration am Ende (wenn das Gerät es unterstützt)</label>
    <p class="leise klein">Die Restzeit wird aus dem Startzeitpunkt berechnet und stimmt auch nach einem App-Wechsel. Ein Signal bei geschlossener oder im Hintergrund laufender App ist auf dem iPhone <b>nicht zuverlässig</b> (nicht geprüft) – beim Zurückkehren steht die Pause richtig da. Der Timer ist eine Hilfe: Weitertrainieren erst, wenn du dich bereit fühlst.</p></details>
  <h2>Routinen</h2>
  ${t.routinen.length ? `<ul class="eintraege">${t.routinen.map(r => `<li><span><b><a href="#/training/routine/${esc(r.id)}">${esc(r.name)}</a></b><br><span class="leise klein">${r.uebungen.length} Übungen · ${esc(r.uebungen.map(x => ueb(x.uebung).name).slice(0, 4).join(', '))}${r.uebungen.length > 4 ? ' …' : ''}</span></span><span><button class="haupt klein" data-a="tr-start" data-v="${esc(r.id)}" ${akt ? 'disabled' : ''}>Starten</button></span></li>`).join('')}</ul>`
    : `<div class="leer">${ico('leer')}Noch keine Routine.<br><span class="klein">Lege eine Routine mit deinen Übungen an – zum Beispiel aus deinem Trainingsplan.</span></div>`}
  <div class="knopfreihe"><button data-a="tr-routine-neu">${ico('plus', 'klein')} Neue Routine</button>${(K.uebungen || []).length ? `<button class="still" data-a="tr-beispiele">Beispielroutinen übernehmen</button>` : ''}<button class="still" data-a="tr-start" data-v="" ${akt ? 'disabled' : ''}>Freie Einheit ohne Routine</button></div>
  <h2>Letzte Einheiten</h2>
  ${fertig.length ? `<ul class="eintraege">${fertig.map(e => { const n = e.uebungen.reduce((s, u) => s + u.saetze.filter(x => x.art === 'arbeit' && x.erledigt).length, 0); const beschw = e.uebungen.filter(u => u.beschwerde).length;
    return `<li><span><b>${esc(e.name)}</b><br><span class="leise klein">${esc(datumDE(e.start.slice(0, 10)))} · ${n} Arbeitssätze · ${Math.round((new Date(e.ende) - new Date(e.start)) / 60000)} Min.${beschw ? ` · <span class="chip warn">Beschwerden notiert</span>` : ''}</span></span></li>`; }).join('')}</ul>` : '<p class="leise">Noch keine abgeschlossene Einheit.</p>'}
  <h2>Körpergewicht</h2>
  <p>${kg ? `Zuletzt ${esc(zahlDE(kg.kg, 1))} kg am ${esc(datumDE(kg.datum))}` : 'Noch nicht erfasst.'} · <a href="#/training/gewicht">Verlauf und Eintrag</a></p>
  <p class="leise klein">Körpergewicht wird getrennt von Trainingsgewichten gespeichert. Gewichtsvorschläge je Übung entstehen aus deinen eigenen bestätigten Sätzen an derselben Übung und Variante (ab der zweiten vergleichbaren Einheit); historische Referenzgewichte sind nur Startwerte.</p>`;
}

/* ---------- Routine bearbeiten ---------- */
function trRoutineHtml(id) {
  const r = trDaten().routinen.find(x => x.id === id); if (!r) return '<p class="leer">Routine nicht gefunden.</p>';
  const opt = alleUebungen().map(u => `<option value="${esc(u.id)}">${esc(u.name)}${u.quelle === 'eigen' ? ' (eigene)' : ''}</option>`).join('');
  return `<p class="klein"><a class="knopf still klein" href="#/training">${ico('zurueck', 'klein')} Training</a></p>
  <label class="feld"><span>Name der Routine</span><input data-tr-routine-name="${esc(r.id)}" value="${esc(r.name)}"></label>
  ${r.beispiel ? '<p class="hinweis klein">Allgemeines Beispiel, kein persönlicher Trainingsplan. 3 Sätze à 8–12 Wiederholungen entsprechen der allgemeinen Empfehlung für Einsteiger (ACSM); Übungen, Sätze und Pausen bitte an Erfahrung, Geräte und Beschwerden anpassen.</p>' : ''}
  ${r.historisch ? '<p class="hinweis klein"><b>Historische Vorlage:</b> unverändert aus deinen früheren Angaben übernommen. Referenzgewichte sind alte Geräteangaben, keine aktuell geschafften Leistungen. Für Änderungen am besten den Plan als eigene Variante kopieren – die Vorlage bleibt dann erhalten.</p>' : ''}
  <ol class="tr-liste">${r.uebungen.map((x, i) => `<li class="karte"><div class="zeile" style="justify-content:space-between"><b><a href="#/training/uebung/${esc(x.uebung)}">${esc(ueb(x.uebung).name)}</a>${x.variante ? ` <span class="leise klein">· ${esc(x.variante)}</span>` : ''}</b>
      <span>${anleitungsKnopf('tr', x.uebung, x.variante, true)}<button class="klein still" data-a="tr-r-hoch" data-v="${i}" ${i ? '' : 'disabled'} aria-label="nach oben">↑</button><button class="klein still" data-a="tr-r-runter" data-v="${i}" ${i < r.uebungen.length - 1 ? '' : 'disabled'} aria-label="nach unten">↓</button><button class="klein still" data-a="tr-r-weg" data-v="${i}">entfernen</button></span></div>
    <div class="zeile">${[['aufwaerm', 'Aufwärmsätze', 0, 5, 1], ['saetze', 'Arbeitssätze', 1, 10, 1], ['wdh_von', 'Wdh. von', 1, 50, 1], ['wdh_bis', 'Wdh. bis', 1, 50, 1], ['pause_s', 'Pause (Sek.)', 0, 600, 15], ['referenz_kg', r.historisch ? 'Startwert kg (historisch)' : 'Startgewicht kg', 0, 500, 0.25], ['schritt_kg', 'Gewichtsschritt kg', 0, 50, 0.25]].map(([k, n, mi, ma, st]) => `<label class="feld"><span>${n}</span><input type="number" inputmode="decimal" min="${mi}" max="${ma}" step="${st}" value="${esc(x[k] ?? '')}" placeholder="${k === 'saetze' && x.saetze_offen ? 'offen' : ''}" data-tr-r-feld="${k}" data-i="${i}" style="width:5.5em"></label>`).join('')}
      <label class="feld"><span>Ziel-RIR</span><input value="${esc(x.ziel_rir ?? '')}" data-tr-r-text="ziel_rir" data-i="${i}" placeholder="z. B. 1–2" style="width:6em"></label>
      <label class="feld" style="flex:1 1 160px"><span>Gerät/Variante</span><input value="${esc(x.variante ?? '')}" data-tr-r-text="variante" data-i="${i}" placeholder="z. B. Kabelturm 1. Stock"></label></div>
    <label><input type="checkbox" data-tr-r-check="je_seite" data-i="${i}" ${x.je_seite ? 'checked' : ''}> einseitig: Wiederholungen und Sätze je Seite</label>
    ${x.saetze_offen ? '<p class="leise klein">Satzanzahl in der Vorlage nicht angegeben – bitte festlegen.</p>' : ''}${x.aufwaerm_schema ? `<p class="leise klein">Aufwärmen (persönliche Regel): ${esc(aufwaermText(x))}</p>` : ''}${x.notiz ? `<p class="leise klein">${esc(x.notiz)}</p>` : ''}</li>`).join('')}</ol>
  <p class="leise klein">Eine andere Variante (z. B. anderer Kabelturm) wird getrennt protokolliert, damit Gewichte nicht vermischt werden. Ändern der Routine verändert keine bereits gespeicherten Einheiten.</p>
  ${uebungsWahlHtml('routine')}
  <p class="klein"><a href="#/training/uebungen">Eigene Übung anlegen</a> (wenn sie in der Liste fehlt)</p>
  <div class="knopfreihe"><button class="haupt" data-a="tr-start" data-v="${esc(r.id)}" ${trDaten().aktiv ? 'disabled' : ''}>Diese Routine starten</button><button class="still" data-a="tr-routine-weg" data-v="${esc(r.id)}">Routine löschen</button></div>`;
}

/* ---------- Progressionsvorschläge (regelbasiert, ohne KI; Regeln: 60 Training/Trainingswissenschaft – Grundlagen, „Regeln für Fitomat“) ----------
   Grundsätze: nur eine Größe ändern; Steigerung erst nach 2 vergleichbaren Einheiten (gleiche Übung + Variante) mit erreichtem Ziel;
   nie bei Beschwerden oder unsauberer Ausführung; fehlende RIR = unbekannt; Referenzgewichte sind keine Leistung; nichts automatisch übernehmen. */
const tageZwischen = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000);
function vergleichbareEinheiten(uebungId, variante, ausser) {
  const passt = u => u.uebung === uebungId && (u.variante || '') === (variante || '');
  return trDaten().einheiten.filter(e => e.ende && e.id !== ausser && e.uebungen.some(passt)).sort((a, b) => b.start.localeCompare(a.start))
    .map(e => { const u = e.uebungen.find(passt); const ar = u.saetze.filter(s => s.art === 'arbeit'); const fertig = ar.filter(s => s.erledigt);
      const top = Math.max(0, ...fertig.map(s => Number(s.kg) || 0));
      return { datum: e.start.slice(0, 10), saetze: fertig, geplant: ar.length, top, beschwerde: !!u.beschwerde, qualitaet: u.qualitaet || '', pause_s: u.pause_s, vorschlag: u.vorschlag || null }; });
}
// Ziel erreicht: alle Arbeitssätze mit gleichem Gewicht und Obergrenze geschafft, mit Reserve (RIR ≥ 1).
// Ohne RIR-Angabe ist die Anstrengung unbekannt – dann erst bei mindestens 2 Wdh. über der Obergrenze (Trainingswissenschaft 14.7).
function zielErreicht(h, bis) {
  if (!h.saetze.length || h.saetze.length < h.geplant) return false;
  return h.saetze.every(s => { const ohneRir = s.rir === '' || s.rir == null; return (Number(s.kg) || 0) === h.top && Number(s.wdh) >= bis + (ohneRir ? 2 : 0) && (ohneRir || s.rir === '5+' || Number(s.rir) >= 1); });
}
const rirText = l => { const r = l.map(s => s.rir === '' || s.rir == null ? '?' : s.rir); return r.every(x => x === '?') ? 'RIR nicht eingetragen' : 'RIR ' + r.join('/'); };
const sitzungText = h => `${datumDE(h.datum)}: ${h.saetze.map(s => (s.wdh || '?') + '×' + (s.kg !== '' && s.kg != null ? zahlDE(Number(s.kg), 2) : '–')).join(', ')} kg (${rirText(h.saetze)})${h.saetze.length < h.geplant ? `, ${h.geplant - h.saetze.length} Satz ausgelassen` : ''}`;
function progressionsVorschlag(u, eId) {
  const info = ueb(u.uebung); const hist = vergleichbareEinheiten(u.uebung, u.variante, eId).slice(0, 3);
  const von = Number(u.wdh_von) || null, bis = Number(u.wdh_bis) || von; const eigenerSchritt = Number(u.schritt_kg) || Number(info.schritt_kg) || null; const schritt = eigenerSchritt || Number(info.gewichtsschritt_kg_vorschlag) || null;
  const zeitbasiert = /plank|halten|unterarmstütz/i.test(info.name + ' ' + info.id);
  if (zeitbasiert) return { art: 'manuell', titel: 'Zeitbasierte Übung – selbst entscheiden', begruendung: 'Für Halteübungen gibt es hier keine Regel.', daten: '', unsicherheit: '' };
  if (!hist.length) return { art: 'start', titel: 'Noch keine eigene Leistung an diesem Gerät', begruendung: u.referenz_kg ? `Die Referenz ${kgText(u.referenz_kg)} ist eine alte Angabe, keine bestätigte Leistung. Mit einem vorsichtigen Satz beginnen und selbst einschätzen.` : 'Gewicht selbst wählen; ab der zweiten vergleichbaren Einheit gibt es Vorschläge.', daten: u.variante ? 'Variante: ' + u.variante : '', unsicherheit: 'Ohne Leistungsdaten keine Empfehlung.' };
  const l = hist[0]; const pause = tageZwischen(l.datum, heute());
  const akt = trDaten().einheiten.find(x => x.id === eId); const ck = (akt && akt.check) || {};
  if (ck.beschwerden === 'ja' || ck.kater === 'stark') return { art: 'halten', titel: 'Heute nicht steigern', begruendung: `Im Kurz-Check ${ck.beschwerden === 'ja' ? 'Beschwerden' : 'starker Muskelkater'} angegeben – Gewicht halten oder leichter; bei Schmerzen die Übung abbrechen.`, daten: 'Kurz-Check dieser Einheit', unsicherheit: '' };
  // Gestufter Wiedereinstieg je Übung (Trainingswissenschaft 14.9): nach 2–3 Wochen kaum Kraftverlust, danach zunehmend; keine belegten Prozentwerte
  if (pause > 84) return { art: 'wiedereinstieg', titel: `Seit ${pause} Tagen nicht trainiert – Arbeitsgewicht neu ermitteln`, begruendung: 'Die alte Leistung ist nur noch eine Referenz. Mit einem sicher machbaren Gewicht beginnen und über einige Einheiten wieder aufbauen; keine Steigerung in dieser Einheit.', daten: 'Zuletzt ' + sitzungText(l), unsicherheit: 'Für die Lastreduktion nach langen Pausen gibt es keine belegten Prozentwerte.' };
  if (pause > 27) return { art: 'wiedereinstieg', titel: `Seit ${pause} Tagen nicht trainiert – etwas leichter einsteigen`, begruendung: 'Etwas weniger Gewicht oder ein Satz weniger als zuletzt; über 2–4 Einheiten zurück zum alten Stand. Keine Steigerung in dieser Einheit.', daten: 'Zuletzt ' + sitzungText(l), unsicherheit: 'Wie viel leichter, ist nicht belegt – nach Gefühl und mit Reserve wählen.' };
  if (pause > 14) return { art: 'wiedereinstieg', titel: `Seit ${pause} Tagen nicht trainiert – alte Last, mehr Reserve`, begruendung: 'Nach 2–4 Wochen Pause geht meist kaum Kraft verloren. Das letzte Gewicht ist ein guter Ausgangspunkt, aber heute mit etwa einer Wiederholung mehr Reserve und ohne Steigerung.', daten: 'Zuletzt ' + sitzungText(l), unsicherheit: 'Studien an Trainierten; einzelne Personen können abweichen.' };
  if (l.beschwerde) return { art: 'beschwerde', titel: 'Nicht steigern – zuletzt Beschwerden notiert', begruendung: 'Last halten oder senken bzw. eine schmerzfreie Alternative wählen. Bei anhaltenden Beschwerden ärztlich oder physiotherapeutisch abklären lassen.', daten: sitzungText(l), unsicherheit: '' };
  if (l.qualitaet === 'unsauber') return { art: 'halten', titel: 'Gewicht halten', begruendung: 'Ausführung zuletzt als unsauber markiert – erst die Technik festigen.', daten: sitzungText(l), unsicherheit: '' };
  if (!von) return { art: 'manuell', titel: 'Kein Wiederholungsbereich hinterlegt', begruendung: 'In der Routine „Wdh. von/bis“ eintragen, dann gibt es Vorschläge.', daten: sitzungText(l), unsicherheit: '' };
  const rirUnbekannt = l.saetze.every(s => s.rir === '' || s.rir == null);
  const unsicher = rirUnbekannt ? 'RIR nicht eingetragen – die Anstrengung ist unbekannt; der Vorschlag stützt sich nur auf Gewicht und Wiederholungen.' : 'RIR ist eine grobe Selbsteinschätzung (im Mittel etwa ±1 Wiederholung).';
  if (hist.length >= 2 && zielErreicht(hist[0], bis) && zielErreicht(hist[1], bis) && hist[0].top === hist[1].top && hist[0].top > 0) {
    const neu = schritt ? hist[0].top + schritt : null;
    // Großer Gewichtssprung (> ca. 10 %): erst Wiederholungen über die Obergrenze hinaus aufbauen (Trainingswissenschaft 14.5)
    if (schritt && schritt / hist[0].top > 0.1 && bis < 20) return { art: 'aufbauen', titel: `Erst Wiederholungen bis ${Math.min(20, bis + 3)} aufbauen`, begruendung: `Der nächste Gewichtsschritt (${zahlDE(schritt, 2)} kg) wäre mehr als 10 % von ${kgText(hist[0].top)}. Statt eines großen Sprungs zuerst die Wiederholungen etwas über ${bis} steigern; danach steigern.`, daten: hist.slice(0, 2).map(sitzungText).join(' · '), unsicherheit: 'Schwellenwert ist eine Produktregel, keine Studienvorgabe. Kleinere Gewichtsschritte an deinem Gerät in der Routine eintragen.' };
    return { art: 'steigern', kg: neu, titel: neu ? `Gewicht auf ${kgText(neu)} erhöhen` : 'Kleinste verfügbare Gewichtsstufe erhöhen', begruendung: `In den letzten 2 vergleichbaren Einheiten alle Arbeitssätze mit ${bis} Wdh. bei ${kgText(hist[0].top)} geschafft. Danach wieder Wiederholungen aufbauen; Sätze und Anstrengung bleiben gleich.`, daten: hist.slice(0, 2).map(sitzungText).join(' · '), unsicherheit: unsicher + (eigenerSchritt ? '' : schritt ? ` Schritt ${zahlDE(schritt, 2)} kg ist ein allgemeiner Vorschlag aus der Übungsbibliothek – an deinem Gerät kann er anders sein (Routine: „Gewichtsschritt“).` : ' Kleinster Gewichtsschritt nicht hinterlegt (Routine: „Gewichtsschritt“).') + (hist[0].vorschlag && hist[0].vorschlag.art === 'steigern' && hist[0].vorschlag.entscheidung === 'beibehalten' ? ' Beim letzten Mal hast du „Beibehalten“ gewählt.' : '') };
  }
  const wdhErreicht = l.saetze.length >= l.geplant && l.saetze.length && l.saetze.every(s => Number(s.wdh) >= bis && (Number(s.kg) || 0) === l.top);
  if (wdhErreicht && !zielErreicht(l, bis)) { const amLimit = l.saetze.some(s => String(s.rir) === '0');
    return { art: 'halten', titel: 'Gewicht halten', begruendung: amLimit ? `Alle Sätze mit ${bis} Wdh., aber mindestens einer mit RIR 0 (am Limit). Weniger RIR ist kein Ziel an sich – erst wenn das Ziel mit etwas Reserve gelingt, steigern.` : `Alle Sätze mit ${bis} Wdh., aber nicht in jedem Satz ist die RIR eingetragen – die Reserve ist dort unbekannt. Ohne RIR gilt das Ziel erst bei mindestens ${bis + 2} Wdh. als sicher erreicht; mit RIR-Angabe (≥ 1) schon bei ${bis}.`, daten: sitzungText(l), unsicherheit: unsicher }; }
  if (zielErreicht(l, bis)) return { art: 'halten', titel: 'Gewicht halten, Ziel bestätigen', begruendung: `Zuletzt alle Sätze mit ${bis} Wdh. – gelingt das ein zweites Mal, kommt der Vorschlag zur nächsten Stufe.`, daten: sitzungText(l), unsicherheit: unsicher };
  const unter = h => h.saetze.length && h.saetze.some(s => Number(s.wdh) < von);
  if (hist.length >= 2 && unter(hist[0]) && unter(hist[1]) && hist[0].top === hist[1].top) {
    if ((Number(u.pause_s) || 0) < 120) return { art: 'pause', pause_s: 150, titel: 'Pause auf etwa 2–3 Min. verlängern', begruendung: `Zweimal Sätze unter ${von} Wdh. bei gleichem Gewicht. Vor einer Lastsenkung zuerst etwas längere Pausen probieren.`, daten: hist.slice(0, 2).map(sitzungText).join(' · '), unsicherheit: unsicher };
    const neu = schritt ? Math.max(0, hist[0].top - schritt) : null;
    return { art: 'reduzieren', kg: neu, titel: neu != null ? `Last auf ${kgText(neu)} senken` : 'Last um die kleinste Stufe senken', begruendung: `Zweimal Sätze unter ${von} Wdh. trotz ausreichender Pause. Eine Stufe leichter, dann wieder aufbauen. Eine einzelne schwache Einheit wäre noch kein Grund.`, daten: hist.slice(0, 2).map(sitzungText).join(' · '), unsicherheit: unsicher };
  }
  return { art: 'aufbauen', titel: `Gewicht halten, Wiederholungen bis ${bis} aufbauen`, begruendung: `Ziel noch nicht in allen Sätzen erreicht${l.saetze.length < l.geplant ? ' (Sätze ausgelassen)' : ''}. Keine Änderung nötig.`, daten: sitzungText(l), unsicherheit: unsicher };
}
function vorschlagHtml(u, ui, e) {
  const v = progressionsVorschlag(u, e.id); const ent = u.vorschlag && u.vorschlag.entscheidung;
  const aenderbar = ['steigern', 'reduzieren', 'pause'].includes(v.art) && (v.kg != null || v.pause_s);
  return `<details class="vorschlag v-${esc(v.art)}"${ent ? '' : ' open'}><summary><b>Vorschlag:</b> ${esc(v.titel)}${ent ? ` <span class="chip">${esc({ uebernommen: 'übernommen', beibehalten: 'beibehalten', selbst: 'selbst geändert' }[ent] || ent)}</span>` : ''}</summary>
    <p class="klein" style="margin:.3em 0">${esc(v.begruendung)}</p>${v.daten ? `<p class="leise klein" style="margin:.2em 0">Daten: ${esc(v.daten)}</p>` : ''}${v.unsicherheit ? `<p class="leise klein" style="margin:.2em 0">Unsicher: ${esc(v.unsicherheit)}</p>` : ''}
    ${ent ? '' : `<div class="knopfreihe">${aenderbar ? `<button class="klein haupt" data-a="tr-v-ok" data-u="${ui}">Übernehmen</button>` : ''}<button class="klein" data-a="tr-v-nein" data-u="${ui}">Beibehalten</button><button class="klein still" data-a="tr-v-selbst" data-u="${ui}">Selbst ändern</button></div>`}</details>`;
}

/* ---------- Trainingseinrichtung und begründete Planvorschläge (regelbasiert; Regeln 13–18 in „Trainingswissenschaft – Grundlagen“) ----------
   Alles optional; nichts wird automatisch ersetzt – ein Vorschlag wird erst nach Vorschau als neuer, inaktiver Plan angelegt. */
const TR_GERAETE = [['langhantel', 'Langhantel + Rack'], ['kurzhantel', 'Kurzhanteln'], ['kabel', 'Kabelzug'], ['maschine', 'Maschinen'], ['klimmzugstange', 'Klimmzugstange'], ['bank', 'Bank'], ['koerpergewicht', 'nur Körpergewicht']];
const SPLITS = {
  gk: { name: 'Ganzkörper', tage: ['Ganzkörper A', 'Ganzkörper B', 'Ganzkörper C'], slots: { 'Ganzkörper A': ['kniebeuge', 'horizontal_druecken', 'vertikal_ziehen', 'hueftbeuge', 'iso:arme', 'rumpf'], 'Ganzkörper B': ['hueftbeuge', 'vertikal_druecken', 'horizontal_ziehen', 'kniebeuge', 'iso:schultern', 'iso:arme'], 'Ganzkörper C': ['kniebeuge', 'horizontal_druecken', 'horizontal_ziehen', 'hueftbeuge', 'iso:arme', 'rumpf'] },
    plus: 'Jeder Muskel 2–3× pro Woche; ein ausgefallener Tag fällt weniger ins Gewicht.', minus: 'Einheiten werden bei viel Volumen lang; wenig Platz für viele Armübungen.' },
  ou: { name: 'Ober-/Unterkörper', tage: ['Oberkörper A', 'Unterkörper A', 'Oberkörper B', 'Unterkörper B'], slots: { 'Oberkörper A': ['horizontal_druecken', 'vertikal_ziehen', 'vertikal_druecken', 'horizontal_ziehen', 'iso:arme', 'iso:arme'], 'Unterkörper A': ['kniebeuge', 'hueftbeuge', 'kniebeuge', 'rumpf'], 'Oberkörper B': ['vertikal_ziehen', 'horizontal_druecken', 'horizontal_ziehen', 'iso:schultern', 'iso:arme', 'iso:arme'], 'Unterkörper B': ['hueftbeuge', 'kniebeuge', 'hueftbeuge', 'rumpf'] },
    plus: 'Oberkörper 2× pro Woche mit Platz für Arme und Schultern; gut planbar mit 4 Tagen.', minus: 'Fällt ein Tag aus, bekommt eine Körperhälfte in dieser Woche weniger.' },
  ppl: { name: 'Push/Pull/Beine', tage: ['Push', 'Pull', 'Beine'], slots: { Push: ['horizontal_druecken', 'vertikal_druecken', 'horizontal_druecken', 'iso:schultern', 'iso:trizeps'], Pull: ['vertikal_ziehen', 'horizontal_ziehen', 'horizontal_ziehen', 'iso:bizeps'], Beine: ['kniebeuge', 'hueftbeuge', 'kniebeuge', 'rumpf'] },
    plus: 'Viel Volumen pro Muskel in einer Einheit; übersichtlich je Tag.', minus: 'Mit 3 Tagen nur 1× pro Woche je Muskel; Ausfälle wiegen schwerer.' }
};
function splitOptionen(n) {
  const o = { 2: [['gk', 2]], 3: [['gk', 3], ['ppl', 3]], 4: [['ou', 4], ['gk', 4]], 5: [['ou', 5], ['ppl', 5]], 6: [['ppl', 6], ['ou', 6]] };
  return (o[Math.min(6, Math.max(2, n || 3))] || o[3]);
}
// Verfügbar, wenn die Übung nur Körpergewicht braucht oder eines ihrer Geräte vorhanden ist (Klimmzug braucht die Stange)
// Die Geräteliste einer Übung sind Alternativen; „koerpergewicht“ genügt allein, außer die Übung braucht eine Klimmzugstange
// Spezialgeräte (Stange, Rack, Maschine/Barren, Kabel) neben „koerpergewicht“ sind Voraussetzung, keine Alternative
function uebVerfuegbar(u, ger) {
  const roh = arr(u.geraet); const spezial = roh.filter(x => ['klimmzugstange', 'rack', 'maschine', 'kabel'].includes(x));
  if (spezial.length) return spezial.some(x => x === 'rack' ? ger.includes('langhantel') : ger.includes(x));   // Spezialgeräte sind untereinander Alternativen
  const frei = roh.filter(x => x !== 'bank'); return !frei.length || frei.includes('koerpergewicht') || frei.some(x => ger.includes(x));
}
function slotUebung(slot, ger, nein, schon, versatz) {
  const iso = { 'iso:arme': ['bizeps', 'trizeps'], 'iso:bizeps': ['bizeps'], 'iso:trizeps': ['trizeps'], 'iso:schultern': ['seitliche_schulter', 'hintere_schulter'] }[slot];
  const muster = slot === 'kniebeuge' ? ['kniebeuge', 'ausfallschritt'] : [slot];
  const passt = u => uebVerfuegbar(u, ger) && !nein.includes(u.id) && (iso ? u.bewegungsmuster === 'isolation' && arr(u.muskeln_haupt).some(m => iso.includes(m)) : muster.includes(u.bewegungsmuster));
  // Mit vorhandenen Geräten belastbare Varianten zuerst (Körpergewicht nur, wenn sonst nichts passt oder nur Körpergewicht gewählt ist)
  const nurKg = ger.every(g => g === 'koerpergewicht'); const rang = u => nurKg ? 0 : (arr(u.geraet).some(g => g !== 'koerpergewicht' && g !== 'bank' && ger.includes(g === 'rack' ? 'langhantel' : g)) ? 0 : 1);
  const alle = (K.uebungen || []).filter(passt).sort((a, b) => rang(a) - rang(b)); const kand = alle.filter(u => !schon.includes(u.id));
  if (!kand.length) return alle.length ? 'doppelt' : null;
  const beste = kand.filter(u => rang(u) === rang(kand[0])); return beste[versatz % beste.length];
}
function planVorschlag(cfg, splitKey, n) {
  const sp = SPLITS[splitKey]; const ger = cfg.geraete && cfg.geraete.length ? cfg.geraete : ['langhantel', 'kurzhantel', 'kabel', 'maschine', 'klimmzugstange', 'koerpergewicht'];
  const nein = arr(cfg.unerwuenscht); const prio = arr(cfg.schwerpunkte); const basis = cfg.erfahrung === 'einsteiger' ? 2 : 3;
  const tage = []; for (let i = 0; i < n; i++) tage.push(sp.tage[i % sp.tage.length]);
  const zaehl = {}; const luecken = new Set(); const einheiten = tage.map((tn, ti) => { const schon = [];
    const ue = sp.slots[tn].map((slot, si) => { const u = slotUebung(slot, ger, nein, schon, Math.floor(ti / sp.tage.length) + si); if (u === 'doppelt') return null; if (!u) { luecken.add(slot); return null; } schon.push(u.id);
      const gr = uebGruppen(u); const iso = u.bewegungsmuster === 'isolation' || u.bewegungsmuster === 'rumpf'; const bonus = gr.some(g => prio.includes(g)) && basis < 4 ? 1 : 0;
      const von = String(u.wdh_bereich_vorschlag || '8–12').match(/(\d+)\D+(\d+)/); return { uebung: u.id, aufwaerm: si === 0 ? 2 : 0, saetze: basis + bonus, _bonus: bonus, _iso: iso, wdh_von: u.id === 'ueb-plank' ? null : (von ? Number(von[1]) : 8), wdh_bis: u.id === 'ueb-plank' ? null : (von ? Number(von[2]) : 12), pause_s: iso ? 90 : 150, ziel_rir: '1–3' }; }).filter(Boolean);
    let sek = ue.reduce((s, x) => s + (x.saetze + x.aufwaerm) * 45 + x.saetze * x.pause_s + x.aufwaerm * 60, 0) + 300;
    // Zeitrahmen (nie Pausen kürzen): 1. Schwerpunkt-Zusatzsätze, 2. Isolation ohne Schwerpunkt, 3. Mehrgelenk über 2 Sätze, 4. hintere Übungen
    const ziel = (Number(cfg.minuten) || 0) * 60; const gekuerzt = []; let bonusWeg = 0;
    const satzWeg = (filter, text) => { for (let i = ue.length - 1; i >= 0 && sek > ziel; i--) { const x = ue[i]; if (filter(x)) { x.saetze--; if (x._bonus) { x._bonus = 0; bonusWeg++; } sek -= 45 + x.pause_s; gekuerzt.push(ueb(x.uebung).name + text); } } };
    if (ziel) { satzWeg(x => x._bonus, ' −1 Schwerpunktsatz'); satzWeg(x => x._iso && !x._bonus && x.saetze > 2, ' −1 Satz'); satzWeg(x => !x._iso && x.saetze > 2, ' −1 Satz');
      while (sek > ziel && ue.length > 3) { const x = ue.pop(); sek -= (x.saetze + x.aufwaerm) * 45 + x.saetze * x.pause_s; gekuerzt.push(ueb(x.uebung).name + ' entfällt'); } }
    const bonusSaetze = ue.reduce((s, x) => s + (x._bonus || 0), 0); ue.forEach(x => { delete x._bonus; delete x._iso; });
    ue.forEach(x => uebGruppen(ueb(x.uebung)).forEach(g => { zaehl[g] = (zaehl[g] || 0) + x.saetze; }));
    return { name: tn, uebungen: ue, minuten: Math.round(sek / 60), gekuerzt, bonusSaetze, bonusWeg }; });
  // Ehrlich bewerten: Einheiten mit weniger als 3 Übungen sind kein vollständiger Plan
  const unbrauchbar = einheiten.some(e => e.uebungen.length < 3);
  return { key: splitKey, name: sp.name + (n > sp.tage.length ? ` (${n}×/Woche)` : ''), plus: sp.plus, minus: sp.minus, einheiten, wochensaetze: zaehl, fehlend: luecken.size > 0, luecken: [...luecken], unbrauchbar };
}
const PLATZ_NAME = { kniebeuge: 'Kniebeuge/Ausfallschritt', hueftbeuge: 'Hüftstreckung (Gesäß/Beinbeuger)', horizontal_druecken: 'Drücken horizontal (Brust)', vertikal_druecken: 'Drücken über Kopf (Schulter)', horizontal_ziehen: 'Rudern', vertikal_ziehen: 'Ziehen von oben (Latissimus)', rumpf: 'Rumpf', 'iso:arme': 'Arme (Isolation)', 'iso:bizeps': 'Bizeps', 'iso:trizeps': 'Trizeps', 'iso:schultern': 'Schultern (Isolation)' };
const SLOT_GERAET = { vertikal_ziehen: 'Klimmzugstange oder Kabelzug/Latzug', horizontal_ziehen: 'Kurzhanteln, Kabelzug oder ein stabiler Tisch für umgekehrtes Rudern', vertikal_druecken: 'Kurzhanteln oder Langhantel', 'iso:arme': 'Kurzhanteln, Kabel oder Band', 'iso:bizeps': 'Kurzhanteln, Kabel oder Band', 'iso:trizeps': 'Kabel, Kurzhanteln oder Dips am Stuhl', 'iso:schultern': 'Kurzhanteln, Kabel oder Band', hueftbeuge: 'Kurzhanteln/Langhantel oder eine Bank für Hip Thrusts' };
let trVorschlagWahl = null;
function vorschlagsOptionen(c) {
  const n = arr(c.tage).length; if (!n) return [];
  const opts = splitOptionen(n).map(([k, m]) => planVorschlag(c, k, m));
  // Ist keine Aufteilung sinnvoll erfüllbar, ehrlich eine Alternative mit weniger Tagen anbieten
  if (opts.every(o => o.unbrauchbar) && n > 2) { const m = Math.min(3, n - 1); const alt = planVorschlag(c, 'gk', m); alt.name = `Alternative: Ganzkörper an ${m} Tagen`; alt.plus = 'Mit der vorhandenen Ausstattung lassen sich weniger, dafür vollständigere Einheiten bilden; die übrigen Tage können aktive Erholung oder Mobility sein.'; alt.minus = 'Weniger Trainingstage als gewünscht.'; opts.push(alt); }
  return opts;
}
function trEinrichtungHtml() {
  const t = trDaten(); const c = t.einrichtung || {};
  const chk = (name, wert, an, text) => `<label class="wahl-chip"><input type="checkbox" name="${name}" value="${wert}" ${an ? 'checked' : ''}> ${text}</label>`;
  const tage = arr(c.tage); const n = tage.length || Number(c.tage_anzahl) || 0;
  const opts = vorschlagsOptionen(c);
  return `<p class="klein"><a class="knopf still klein" href="#/training">${ico('zurueck', 'klein')} Training</a></p><h1>Trainingseinrichtung</h1>
  <p class="leise klein">Alles ist freiwillig und jederzeit änderbar. Es bleibt nur auf diesem Gerät. Eigene Pläne und Training ohne Vorschläge bleiben möglich – ein Vorschlag ersetzt nie deinen Plan.</p>
  <form id="tr-einr" class="karte">
    <div class="zeile"><label class="feld"><span>Ziel</span><select name="ziel">${[['', '–'], ['muskelaufbau', 'Muskelaufbau'], ['kraft', 'Kraft'], ['fitness', 'allgemeine Fitness'], ['kombi', 'Kombination']].map(([v, t2]) => `<option value="${v}" ${c.ziel === v ? 'selected' : ''}>${t2}</option>`).join('')}</select></label>
      <label class="feld"><span>Erfahrung</span><select name="erfahrung">${[['', '–'], ['einsteiger', 'Einsteiger (< 1 Jahr)'], ['fortgeschritten', 'Fortgeschritten'], ['erfahren', 'Erfahren']].map(([v, t2]) => `<option value="${v}" ${c.erfahrung === v ? 'selected' : ''}>${t2}</option>`).join('')}</select></label>
      <label class="feld"><span>Minuten pro Einheit</span><input name="minuten" type="number" min="20" max="180" step="5" inputmode="numeric" value="${esc(c.minuten || '')}" style="width:6em"></label></div>
    <fieldset><legend>Trainingstage</legend><div class="chips-wrap">${WOCHENTAGE.map(([k, n2]) => chk('tage', k, tage.includes(k), n2)).join('')}</div></fieldset>
    <fieldset><legend>Ort und Geräte</legend><div class="zeile"><label class="feld"><span>Ort</span><select name="ort">${[['', '–'], ['studio', 'Studio'], ['zuhause', 'Zuhause'], ['beides', 'beides']].map(([v, t2]) => `<option value="${v}" ${c.ort === v ? 'selected' : ''}>${t2}</option>`).join('')}</select></label></div>
      <div class="chips-wrap">${TR_GERAETE.map(([k, n2]) => chk('geraete', k, arr(c.geraete).includes(k), n2)).join('')}</div></fieldset>
    <fieldset><legend>Schwerpunkte (optisch/Vorliebe)</legend><div class="chips-wrap">${MUSKEL_GRUPPEN.map(([k, n2]) => chk('schwerpunkte', k, arr(c.schwerpunkte).includes(k), n2)).join('')}</div>
      <p class="leise klein">Ein Schwerpunkt bedeutet etwas mehr Volumen für diese Gruppe – das ist etwas anderes als stagnierende Leistung oder Beschwerden.</p></fieldset>
    <label class="feld"><span>Unerwünschte Übungen</span><select name="unerwuenscht" multiple size="4">${(K.uebungen || []).map(u => `<option value="${esc(u.id)}" ${arr(c.unerwuenscht).includes(u.id) ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select></label>
    <fieldset><legend>Cardio</legend><div class="zeile"><label class="feld"><span>Interesse</span><select name="cardio">${[['', '–'], ['nein', 'nein'], ['ja', 'ja']].map(([v, t2]) => `<option value="${v}" ${(c.cardio || '') === v ? 'selected' : ''}>${t2}</option>`).join('')}</select></label><label class="feld"><span>Art</span><input name="cardio_art" value="${esc(c.cardio_art || '')}" placeholder="z. B. Rad, Laufen"></label><label class="feld"><span>Min./Woche</span><input name="cardio_min" type="number" min="0" step="10" value="${esc(c.cardio_min || '')}" style="width:6em"></label></div></fieldset>
    <label class="feld"><span>Einschränkungen oder Beschwerden (nur als Notiz)</span><input name="einschraenkungen" value="${esc(c.einschraenkungen || '')}"></label>
    <button class="haupt" type="submit">Speichern und Vorschläge zeigen</button></form>
  ${t.plaene.some(p => p.art === 'historisch') ? '' : `<p class="hinweis klein">Du hast schon einen eigenen Plan als Datei? <a href="#/training/plaene">Training → Pläne → „Eigenen Plan importieren“</a> – danach erscheint er hier als „Deinen gespeicherten Plan verwenden“.</p>`}
  ${t.plaene.filter(p => p.art === 'historisch').map(p => `<section class="karte"><h3 style="margin-top:0">Deinen gespeicherten Plan verwenden: ${esc(p.name)}</h3>
    <p class="klein">${p.einheiten.length} Einheiten${p.einheiten.some(pe => pe.tag) ? ' an ' + esc(p.einheiten.map(pe => (WOCHENTAGE.find(w => w[0] === pe.tag) || [])[1]).filter(Boolean).join(', ')) : ''}. Referenzgewichte sind historische Angaben, keine aktuell bestätigten Leistungen.</p>
    <div class="knopfreihe">${p.aktiv ? '<span class="chip gut">aktiv</span>' : `<button class="haupt klein" data-a="tr-plan-aktiv" data-v="${esc(p.id)}">Diesen Plan verwenden</button>`}<a class="knopf klein" href="#/training/plan/${esc(p.id)}">Ansehen und anpassen</a><button class="klein" data-a="tr-plan-kopie" data-v="${esc(p.id)}">Als eigene Variante kopieren</button></div></section>`).join('')}
  ${(() => { const idx = WOCHENTAGE.map(w => w[0]).map((k, i) => tage.includes(k) ? i : -1).filter(i => i >= 0); let lauf = 1, max = idx.length ? 1 : 0; for (let i = 1; i < idx.length; i++) { lauf = idx[i] === idx[i - 1] + 1 ? lauf + 1 : 1; max = Math.max(max, lauf); }
    return max >= 4 ? `<p class="hinweis klein"><b>${max} Tage am Stück:</b> möglich – die Vorschläge wechseln die Muskelgruppen von Tag zu Tag (z. B. Ober-/Unterkörper), damit derselbe Muskel nicht an zwei Tagen hintereinander schwer belastet wird. Nachteil: kaum ganze Ruhetage in diesem Block; bei ungewöhnlicher Ermüdung oder Beschwerden darf ein Tag ausfallen oder leichter sein – die nächste Einheit bleibt dann einfach die nächste.</p>` : ''; })()}
  ${n ? `<h2>Vorschläge für ${n} Tage</h2><p class="leise klein">Bei gleichem Wochenvolumen sind die Aufteilungen für Muskelaufbau etwa gleichwertig – entscheidend sind Tage, Zeit und was du durchhältst. Übungen nur aus der geprüften Bibliothek (${(K.uebungen || []).length} Übungen); eigene Übungen kannst du danach ergänzen.</p>
    ${opts.map((o, oi) => `<section class="karte"><h3 style="margin-top:0">${esc(o.name)}</h3><p class="klein">+ ${esc(o.plus)}<br>− ${esc(o.minus)}</p>
      ${o.einheiten.map(e => `<details class="klein"><summary><b>${esc(e.name)}</b> · ca. ${e.minuten} Min. · ${e.uebungen.length} Übungen</summary><ul class="anl-liste">${e.uebungen.map(x => `<li><span>${esc(ueb(x.uebung).name)}: ${x.saetze} × ${x.wdh_von ? x.wdh_von + '–' + x.wdh_bis : 'Zeit'} · Pause ${x.pause_s} s</span>${anleitungsKnopf('tr', x.uebung, x.variante, true)}</li>`).join('')}</ul>${e.gekuerzt.length ? `<p class="leise">Wegen der Zeitvorgabe: ${esc(e.gekuerzt.join(', '))}</p>` : ''}</details>`).join('')}
      <p class="leise klein">Arbeitssätze pro Woche (nur Hauptmuskeln): ${MUSKEL_GRUPPEN.filter(([k]) => o.wochensaetze[k]).map(([k, n2]) => `${n2} ${o.wochensaetze[k]}`).join(' · ') || '–'}</p>
      ${o.fehlend ? `<div class="hinweis warn klein"><b>${o.unbrauchbar ? 'So nicht sinnvoll erfüllbar:' : 'Lücken:'}</b> Mit deiner Ausstattung gibt es in der Bibliothek keine passende Übung für ${esc(o.luecken.map(s => PLATZ_NAME[s] || s).join(', '))}.${o.luecken.some(s => SLOT_GERAET[s]) ? ` Optional möglich mit: ${esc(o.luecken.filter(s => SLOT_GERAET[s]).map(s => SLOT_GERAET[s]).join('; '))} – kein Kauf nötig, nur als Hinweis.` : ''}${o.unbrauchbar ? ' Einzelne Einheiten hätten weniger als 3 Übungen; besser weniger Tage mit Ganzkörper wählen oder Ausstattung ergänzen.' : ''}</div>` : ''}
      ${arr(c.geraete).length && arr(c.geraete).every(g => g === 'koerpergewicht') && c.erfahrung !== 'einsteiger' ? '<p class="leise klein">Grenze reinen Körpergewichtstrainings: Für Fortgeschrittene steigt der Reiz vor allem über schwerere Varianten (einbeinig, langsamere Bewegung, größerer Bewegungsumfang) – nicht nur über immer mehr Wiederholungen. Für manche Muskeln (z. B. Rücken ohne Stange) fehlen dann gute Optionen.</p>' : ''}
      ${arr(c.schwerpunkte).length ? `<p class="leise klein">Schwerpunkt: ${o.einheiten.reduce((s, e) => s + e.bonusSaetze, 0)} Zusatzsätze pro Woche (je ca. 2–4 Min.)${o.einheiten.some(e => e.bonusWeg) ? `; ${o.einheiten.reduce((s, e) => s + e.bonusWeg, 0)} weitere passten nicht in die Zeitvorgabe` : ''}. Andere Gruppen behalten ihre Grundsätze.</p>` : ''}
      <button class="klein" data-a="tr-vorschlag-anlegen" data-v="${oi}">Als neuen Plan anlegen (inaktiv)</button></section>`).join('')}
    ${c.cardio === 'ja' ? `<p class="hinweis klein"><b>Cardio:</b> getrennt protokolliert. Als Ableitung aus Studien: Radfahren stört Kraftzuwächse weniger als Laufen; an Krafttagen am besten nach dem Krafttraining oder mit einigen Stunden Abstand. Trainingskalorien werden nicht automatisch zum Ernährungsbudget addiert – Schätzungen von Uhren und Formeln weichen oft über 20 % ab.</p>` : ''}` : '<p class="leise">Trainingstage wählen, dann erscheinen Vorschläge.</p>'}`;
}

/* ---------- Pläne und Verlauf (Unterreiter im Training) ---------- */
let trImportObj = null; let trImportCode = '';
/* ---------- Plan-Code: private Übergabe ohne Datei ----------
   Kompakter, komprimierter Plan im Link-Fragment (#/plan-import/…) oder als kopierbarer Text „FITOMAT-PLAN1:…“.
   Das Fragment wird vom Browser nie an den Server gesendet; die App entfernt es sofort aus der Adresse und der Verlaufsseite.
   Es wird nichts hochgeladen und nichts gespeichert, bevor du in der Vorschau „Plan übernehmen“ tippst. */
const PLANCODE_PREFIX = 'FITOMAT-PLAN1:';
const AW_ERSTE = [{ pct: 50, wdh: '8–10' }, { pct: 70, wdh: '5' }, { pct: 80, wdh: '1–2' }], AW_WEITERE = [{ pct: 50, wdh: '6–8' }];
function planKompaktErweitern(k) {
  if (!k || k.v !== 1 || !Array.isArray(k.d)) throw new Error('Unbekannter oder beschädigter Plan-Code.');
  return { art: 'fitomat-trainingsplan', schema: 1, import_id: k.id, unerwuenschte_uebungen: arr(k.x), plan: { name: k.n, art: k.a || 'eigen', hinweis: k.h || (k.a === 'historisch' ? 'Originalplan übernommen. Gewichte sind historische Startwerte, keine bestätigten Leistungen.' : '') },
    einstellungen: { aufwaermen_text: k.w || 'Erste Übung: ca. 50 % × 8–10, 70 % × 5, 80 % × 1–2. Weitere Übungen: ca. 50 % × 6–8. Persönliche Vorgehensweise; Gewichte werden auf die Gewichtsschritte des Geräts gerundet.' }, uebungen: [],
    routinen: k.d.map(([key, name, ex]) => ({ key, name, uebungen: ex.map(([id, s, kg, fl, va, gh, no, wv, wb]) => Object.assign({ uebung: id, aufwaerm: fl & 2 ? 3 : 1, aufwaerm_schema: fl & 2 ? AW_ERSTE : AW_WEITERE, saetze: s || null, wdh_von: wv || 10, wdh_bis: wb || wv || 10, pause_s: 150, ziel_rir: 'ca. 1–2' },
      kg ? { referenz_kg: kg } : {}, s ? {} : { saetze_offen: true }, fl & 1 ? { je_seite: true } : {}, fl & 4 ? { optional: true } : {}, va ? { variante: va } : {}, gh ? { gewicht_hinweis: gh } : {}, no ? { notiz: no } : {})) })),
    einheiten: k.d.map(([key]) => ({ routine: key, tag: WOCHENTAGE.some(w => w[0] === key) ? key : '' })) };
}
// Umkehrung (für die lokale Erzeugung eines Codes aus einer Plan-Datei): eigene Übungen werden auf Bibliotheksübungen abgebildet
function planKompakt(obj) {
  const map = trImportZuordnung(obj); const def = id => arr(obj.uebungen).find(u => u.id === id) || {};
  return { v: 1, id: obj.import_id, n: obj.plan.name, a: obj.plan.art, x: arr(obj.unerwuenschte_uebungen),
    d: obj.routinen.map(r => [r.key, r.name, r.uebungen.map(x => { const d = def(x.uebung); const e = [map[x.uebung] || x.uebung, x.saetze_offen ? 0 : (Number(x.saetze) || 0), x.referenz_kg || 0, (x.je_seite ? 1 : 0) | (arr(x.aufwaerm_schema).length > 1 ? 2 : 0) | (x.optional ? 4 : 0), x.variante || (map[x.uebung] ? d.bibliothek_variante || '' : ''), x.gewicht_hinweis || '', x.notiz || '', x.wdh_von !== 10 ? x.wdh_von : 0, x.wdh_bis !== x.wdh_von ? x.wdh_bis : 0];
      while (e.length > 4 && !e[e.length - 1]) e.pop(); return e; })]) };
}
const b64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function planCodeErzeugen(obj) { const daten = new TextEncoder().encode(JSON.stringify(planKompakt(obj))); const z = new Uint8Array(await new Response(new Blob([daten]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer()); let s = ''; for (let i = 0; i < z.length; i += 8192) s += String.fromCharCode(...z.subarray(i, i + 8192)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
async function planCodeLesen(text) {
  const t = String(text || '').trim(); if (t.startsWith('{')) { const o = JSON.parse(t); return o.v === 1 ? planKompaktErweitern(o) : o; }
  const m = t.match(/(?:FITOMAT-PLAN1:|plan-import\/)([A-Za-z0-9_-]+)/) || t.match(/^([A-Za-z0-9_-]{40,})$/); if (!m) throw new Error('Kein Plan-Code gefunden.');
  if (!('DecompressionStream' in window)) throw new Error('Dieser Browser kann den Plan-Code nicht entpacken (auf dem iPhone ab iOS 16.4).');
  const b = m[1].replace(/-/g, '+').replace(/_/g, '/'); const bin = Uint8Array.from(atob(b + '==='.slice((b.length + 3) % 4)), c => c.charCodeAt(0));
  const txt = await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
  trImportCode = m[1]; return planKompaktErweitern(JSON.parse(txt));
}
/* ---------- QR-Code (eigene Umsetzung nach ISO/IEC 18004, Byte-Modus, Fehlerkorrektur L/M) – läuft nur lokal, ohne fremde Dienste ---------- */
const QR_ECC = { L: [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30], M: [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28] };
const QR_BLOECKE = { L: [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25], M: [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49] };
const QR_FORMAT_BITS = { L: 1, M: 0 };
const qrRohModule = v => { let r = (16 * v + 128) * v + 64; if (v >= 2) { const n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; } return r; };
const qrDatenCw = (v, e) => Math.floor(qrRohModule(v) / 8) - QR_ECC[e][v] * QR_BLOECKE[e][v];
const qrMul = (x, y) => { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; } return z & 0xFF; };
function qrDivisor(grad) { const r = new Array(grad).fill(0); r[grad - 1] = 1; let root = 1; for (let i = 0; i < grad; i++) { for (let j = 0; j < r.length; j++) { r[j] = qrMul(r[j], root); if (j + 1 < r.length) r[j] ^= r[j + 1]; } root = qrMul(root, 2); } return r; }
function qrRest(daten, div) { const r = new Array(div.length).fill(0); for (const b of daten) { const f = b ^ r.shift(); r.push(0); div.forEach((c, i) => { r[i] ^= qrMul(c, f); }); } return r; }
const qrAusrichtung = v => { if (v === 1) return []; const n = Math.floor(v / 7) + 2; const groesse = v * 4 + 17; const schritt = v === 32 ? 26 : Math.ceil((v * 4 + 4) / (n * 2 - 2)) * 2; const r = [6]; for (let p = groesse - 7; r.length < n; p -= schritt) r.splice(1, 0, p); return r; };
function qrMaske(m, x, y) { switch (m) { case 0: return (x + y) % 2 === 0; case 1: return y % 2 === 0; case 2: return x % 3 === 0; case 3: return (x + y) % 3 === 0; case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; case 5: return x * y % 2 + x * y % 3 === 0; case 6: return (x * y % 2 + x * y % 3) % 2 === 0; default: return ((x + y) % 2 + x * y % 3) % 2 === 0; } }
function qrErzeugen(text, stufe = 'L') {
  const bytes = Array.from(new TextEncoder().encode(text)); let v = 1;
  for (; v <= 40; v++) if (4 + (v < 10 ? 8 : 16) + bytes.length * 8 <= qrDatenCw(v, stufe) * 8) break;
  if (v > 40) throw new Error('Zu viele Daten für einen QR-Code.');
  const bits = []; const add = (wert, n) => { for (let i = n - 1; i >= 0; i--) bits.push((wert >>> i) & 1); };
  add(4, 4); add(bytes.length, v < 10 ? 8 : 16); bytes.forEach(b => add(b, 8));
  const kap = qrDatenCw(v, stufe) * 8; add(0, Math.min(4, kap - bits.length)); add(0, (8 - bits.length % 8) % 8);
  for (let p = 0xEC; bits.length < kap; p ^= 0xEC ^ 0x11) add(p, 8);
  const daten = []; for (let i = 0; i < bits.length; i += 8) daten.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  // Fehlerkorrektur je Block, dann verschränken
  const nb = QR_BLOECKE[stufe][v], ecl = QR_ECC[stufe][v], roh = Math.floor(qrRohModule(v) / 8); const kurz = nb - roh % nb, kurzLen = Math.floor(roh / nb); const div = qrDivisor(ecl);
  const bloecke = []; for (let i = 0, k = 0; i < nb; i++) { const d = daten.slice(k, k + kurzLen - ecl + (i < kurz ? 0 : 1)); k += d.length; const e = qrRest(d, div); if (i < kurz) d.push(0); bloecke.push(d.concat(e)); }
  const cw = []; for (let i = 0; i < bloecke[0].length; i++) bloecke.forEach((b, j) => { if (i !== kurzLen - ecl || j >= kurz) cw.push(b[i]); });
  const n = v * 4 + 17; const m = Array.from({ length: n }, () => new Array(n).fill(false)); const fn = Array.from({ length: n }, () => new Array(n).fill(false));
  const setz = (x, y, d) => { m[y][x] = d; fn[y][x] = true; };
  for (let i = 0; i < n; i++) { setz(6, i, i % 2 === 0); setz(i, 6, i % 2 === 0); }
  [[3, 3], [n - 4, 3], [3, n - 4]].forEach(([cx, cy]) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const x = cx + dx, y = cy + dy; if (x >= 0 && x < n && y >= 0 && y < n) { const d = Math.max(Math.abs(dx), Math.abs(dy)); setz(x, y, d !== 2 && d !== 4); } } });
  const ap = qrAusrichtung(v); ap.forEach((a, i) => ap.forEach((b, j) => { if ((i === 0 && j === 0) || (i === 0 && j === ap.length - 1) || (i === ap.length - 1 && j === 0)) return; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) setz(a + dx, b + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1); }));
  const formatBits = maske => { const d = QR_FORMAT_BITS[stufe] << 3 | maske; let r = d; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537); return ((d << 10) | r) ^ 0x5412; };
  const formatSetzen = maske => { const f = formatBits(maske); const g = i => ((f >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) setz(8, i, g(i)); setz(8, 7, g(6)); setz(8, 8, g(7)); setz(7, 8, g(8)); for (let i = 9; i < 15; i++) setz(14 - i, 8, g(i));
    for (let i = 0; i < 8; i++) setz(n - 1 - i, 8, g(i)); for (let i = 8; i < 15; i++) setz(8, n - 15 + i, g(i)); setz(8, n - 8, true); };
  formatSetzen(0);
  if (v >= 7) { let r = v; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25); const vb = v << 12 | r; for (let i = 0; i < 18; i++) { const bit = ((vb >>> i) & 1) === 1; const a = n - 11 + i % 3, b = Math.floor(i / 3); setz(a, b, bit); setz(b, a, bit); } }
  // Datenmodule im Zickzack setzen
  let i = 0; for (let rechts = n - 1; rechts >= 1; rechts -= 2) { if (rechts === 6) rechts = 5; for (let vert = 0; vert < n; vert++) for (let j = 0; j < 2; j++) { const x = rechts - j; const hoch = ((rechts + 1) & 2) === 0; const y = hoch ? n - 1 - vert : vert; if (!fn[y][x] && i < cw.length * 8) { m[y][x] = ((cw[i >>> 3] >>> (7 - (i & 7))) & 1) === 1; i++; } } }
  // Maske mit geringster Strafe wählen (Regeln 1, 2 und 4)
  const strafe = g => { let p = 0; for (let a = 0; a < n; a++) for (const zeile of [true, false]) { let lauf = 1; for (let b = 1; b <= n; b++) { const w = b < n && (zeile ? g[a][b] === g[a][b - 1] : g[b][a] === g[b - 1][a]); if (w) lauf++; else { if (lauf >= 5) p += lauf - 2; lauf = 1; } } }
    for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) { const c = g[y][x]; if (c === g[y][x + 1] && c === g[y + 1][x] && c === g[y + 1][x + 1]) p += 3; }
    const dunkel = g.reduce((s, z) => s + z.filter(Boolean).length, 0); p += Math.floor(Math.abs(dunkel * 20 - n * n * 10) / (n * n)) * 10; return p; };
  let beste = null, bestP = Infinity, bestM = 0;
  for (let mk = 0; mk < 8; mk++) { formatSetzen(mk); const g = m.map((z, y) => z.map((d, x) => fn[y][x] ? d : d !== qrMaske(mk, x, y))); const p = strafe(g); if (p < bestP) { bestP = p; beste = g; bestM = mk; } }
  formatSetzen(bestM); const end = m.map((z, y) => z.map((d, x) => fn[y][x] ? d : d !== qrMaske(bestM, x, y)));
  return { module: end, version: v, maske: bestM, stufe, funktion: fn, codewoerter: cw };
}
// Gegenprobe: Module zurücklesen, entmasken, Blöcke trennen, Reed-Solomon-Syndrome prüfen und Text zurückgewinnen
function qrPruefen(q, stufe) {
  const n = q.module.length, v = q.version; const bits = []; for (let rechts = n - 1; rechts >= 1; rechts -= 2) { if (rechts === 6) rechts = 5; for (let vert = 0; vert < n; vert++) for (let j = 0; j < 2; j++) { const x = rechts - j; const hoch = ((rechts + 1) & 2) === 0; const y = hoch ? n - 1 - vert : vert; if (!q.funktion[y][x]) bits.push(q.module[y][x] !== qrMaske(q.maske, x, y) ? 1 : 0); } }
  const roh = Math.floor(qrRohModule(v) / 8); const cw = []; for (let i = 0; i < roh; i++) cw.push(bits.slice(i * 8, i * 8 + 8).reduce((a, b) => (a << 1) | b, 0));
  const nb = QR_BLOECKE[stufe][v], ecl = QR_ECC[stufe][v]; const kurz = nb - roh % nb, kurzLen = Math.floor(roh / nb); const bl = Array.from({ length: nb }, () => []); let k = 0;
  for (let i = 0; i < kurzLen + 1; i++) for (let j = 0; j < nb; j++) { if (i === kurzLen - ecl && j < kurz) continue; if (k < cw.length) bl[j].push(cw[k++]); }
  const exp = [1]; for (let i = 1; i < 255; i++) exp.push(qrMul(exp[i - 1], 2));
  const syndromOk = bl.every(b => { for (let s = 0; s < ecl; s++) { let r = 0; for (const c of b) r = qrMul(r, exp[s]) ^ c; if (r) return false; } return true; });
  const daten = bl.flatMap(b => b.slice(0, b.length - ecl)); const db = []; daten.forEach(c => { for (let i = 7; i >= 0; i--) db.push((c >>> i) & 1); });
  const lies = (a, l) => db.slice(a, a + l).reduce((x, y) => (x << 1) | y, 0); const len = lies(4, v < 10 ? 8 : 16); const st = 4 + (v < 10 ? 8 : 16); const out = []; for (let i = 0; i < len; i++) out.push(lies(st + i * 8, 8));
  return { syndromOk, modus: lies(0, 4), text: new TextDecoder().decode(new Uint8Array(out)) };
}
function qrSvg(q, rand = 4) { const n = q.module.length; let p = ''; q.module.forEach((z, y) => z.forEach((d, x) => { if (d) p += `M${x + rand},${y + rand}h1v1h-1z`; })); return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n + 2 * rand} ${n + 2 * rand}" shape-rendering="crispEdges" role="img" aria-label="QR-Code"><rect width="100%" height="100%" fill="#fff"/><path d="${p}" fill="#000"/></svg>`; }
// Gespeicherten Plan als Übergabe-Objekt (für QR/Plan-Code) – nur lokal, nichts wird gesendet
function planAlsUebergabe(p) {
  const t = trDaten(); const rs = p.einheiten.map((pe, i) => ({ pe, r: t.routinen.find(x => x.id === pe.routine), i })).filter(x => x.r);
  return { art: 'fitomat-trainingsplan', import_id: p.import_id || ('plan-' + p.id), plan: { name: p.name, art: p.art || 'eigen' }, unerwuenschte_uebungen: arr((t.einrichtung || {}).unerwuenscht), uebungen: [],
    routinen: rs.map(({ pe, r, i }) => ({ key: pe.tag || ('e' + (i + 1)), name: r.name, uebungen: r.uebungen.map(x => Object.assign({}, x, { referenz_kg: x.referenz_kg || x.start_kg || 0 })) })), einheiten: [] };
}
let trQrAnzeige = null;
const appVomHomeBildschirm = () => !!(navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches));
// Übergabelink: Fragment sofort aus Adresse und Verlauf entfernen, dann Vorschau unter Training → Pläne zeigen (nichts wird automatisch übernommen)
window.addEventListener('hashchange', () => { if (location.hash.startsWith('#/plan-import/')) planImportAusAdresse(); });
planImportAusAdresse();
async function planImportAusAdresse() { const h = location.hash; if (!h.startsWith('#/plan-import/')) return; const code = h.slice('#/plan-import/'.length);
  history.replaceState(null, '', location.pathname + location.search + '#/training/plaene');
  await new Promise(r => document.readyState === 'complete' ? r() : addEventListener('load', r, { once: true }));   // App vollständig geladen
  try { trImportObj = await planCodeLesen('plan-import/' + code); trainingsplanImport(trImportObj); } catch (err) { trImportObj = null; trImportCode = ''; setTimeout(() => toast('Plan-Code nicht lesbar: ' + err.message), 500); }
  if (typeof route === 'function') route(); setTimeout(() => { const k = document.getElementById('tr-import'); if (k) k.scrollIntoView({ block: 'start' }); }, 300); }
function trImportVorschauHtml(obj) {
  let plan; try { plan = trainingsplanImport(obj); } catch (err) { return `<p class="hinweis warn klein">${esc(err.message)}</p>`; }
  const ab = arr(obj.einheiten).map(pe => pe.tag); const map = trImportZuordnung(obj);
  return `<div class="karte fz-importvorschau"><h3 style="margin-top:0">Vorschau: ${esc(obj.plan.name)}</h3><p class="klein">${esc(plan.text)}</p>
    ${plan.doppelt ? '' : `<ol class="klein">${obj.routinen.map(r => `<li><b>${esc(r.name)}</b>${ab.length ? '' : ''}<ul>${r.uebungen.map(x => { const id = map[x.uebung] || x.uebung; const nm = (alleUebungen().find(y => y.id === id) || arr(obj.uebungen).find(y => y.id === x.uebung) || { name: id }).name; return `<li>${esc(nm)}${x.variante ? ` <span class="leise">· ${esc(x.variante)}</span>` : ''}: ${x.saetze_offen ? '<b>Sätze offen</b>' : esc(x.saetze) + ' ×'} ${esc(x.wdh_bis || x.wdh_von || '?')}${x.je_seite ? ' je Seite' : ''}${x.referenz_kg ? ` · Startwert ${esc(kgText(x.referenz_kg))}` : ''}${x.optional ? ' · optional' : ''}${x.gewicht_hinweis ? ` <span class="chip warn">prüfen</span>` : ''}</li>`; }).join('')}</ul></li>`).join('')}</ol>`}
    <div class="knopfreihe">${plan.doppelt && !plan.etwasNeu ? '' : `<button class="haupt" data-a="tr-import-ok">${plan.doppelt ? 'Ergänzungen übernehmen' : 'Plan übernehmen'}</button>`}<button class="still" data-a="tr-import-ab">Verwerfen</button></div></div>`;
}
function trPlaeneHtml() {
  const t = trDaten(); const rn = rid => (t.routinen.find(r => r.id === rid) || { name: '?' }).name;
  const zeile = p => `<li><span><b><a href="#/training/plan/${esc(p.id)}">${esc(p.name)}</a></b>${p.aktiv ? ' <span class="chip gut">aktiv</span>' : ''}<br><span class="leise klein">${esc(PLAN_ART[p.art] || '')} · ${p.einheiten.length} Einheiten: ${esc(p.einheiten.map(pe => rn(pe.routine)).join(', '))}</span></span><span><a class="knopf klein" href="#/training/plan/${esc(p.id)}">Öffnen</a></span></li>`;
  const aktiv = t.plaene.filter(p => !p.archiviert), archiv = t.plaene.filter(p => p.archiviert);
  return `<h1>Pläne</h1>
  <h2>Meine Pläne</h2>
  ${aktiv.length ? `<ul class="eintraege">${aktiv.map(zeile).join('')}</ul>` : '<p class="leise">Noch kein Plan. Importiere deinen eigenen Plan, lege einen neuen an oder lass dir einen vorschlagen.</p>'}
  <div class="knopfreihe"><button class="haupt" data-a="tr-plan-neu">${ico('plus', 'klein')} Neuer Plan</button><a class="knopf" href="#/training/einrichtung">Vorschläge nach deinen Angaben</a></div>
  <section class="karte" id="tr-import"><h2 style="margin-top:0">Eigenen Plan übernehmen</h2>
    <p class="klein">Per <b>Übergabe-QR-Code</b> (mit der iPhone-Kamera scannen), per <b>Plan-Code</b> aus der Zwischenablage oder als Datei. Die Übernahme <b>ergänzt</b> nur: vorhandene Pläne, Trainings, Mahlzeiten und Vorräte bleiben unverändert, ein doppelter Import wird erkannt. Vor der Übernahme siehst du eine Vorschau; danach ist Rückgängig möglich. Nichts wird hochgeladen.</p>
    ${trImportObj ? (trImportCode && !appVomHomeBildschirm() ? `<div class="hinweis warn import-wahl"><b>Wo nutzt du Fitomat?</b>
      <p class="klein" style="margin:.4em 0">Du bist gerade im <b>Browser (Safari)</b>. Die App vom Home-Bildschirm hat auf dem iPhone einen <b>eigenen Speicher</b> – was du hier übernimmst, ist dort <b>nicht</b> vorhanden.</p>
      <ol class="klein"><li><b>App vom Home-Bildschirm:</b> <button class="haupt" data-a="tr-code-kopieren">1. Plan-Code kopieren</button><br>2. Fitomat vom Home-Bildschirm öffnen → Training → Pläne → „Plan-Code einfügen“ → Einfügen erlauben → „Plan übernehmen“.</li>
      <li><b>Nur im Browser:</b> unten in der Vorschau „Plan übernehmen“ tippen.</li></ol>
      <details class="klein"><summary>Kopieren klappt nicht?</summary><p>Code markieren und kopieren:</p><textarea readonly rows="3" style="width:100%" onfocus="this.select()">${esc(PLANCODE_PREFIX + trImportCode)}</textarea></details></div>` : '') + trImportVorschauHtml(trImportObj) : ''}
    <div class="knopfreihe"><button class="haupt" data-a="tr-code-einfuegen">Plan-Code einfügen</button></div>
    <details class="klein"><summary>Code von Hand einfügen oder Datei wählen</summary><textarea id="tr-import-text" rows="3" style="width:100%" placeholder="FITOMAT-PLAN1:… oder Inhalt einer Plan-Datei"></textarea><button class="klein" data-a="tr-import-text">Prüfen</button>
      <label class="feld"><span>Plan-Datei wählen</span><input type="file" id="tr-import-datei" accept="application/json,.json,text/plain"></label></details></section>
  ${archiv.length ? `<details class="karte"><summary>Archivierte Pläne (${archiv.length})</summary><ul class="eintraege">${archiv.map(zeile).join('')}</ul></details>` : ''}
  <h2>Einzelne Routinen</h2>
  ${t.routinen.length ? `<ul class="eintraege">${t.routinen.map(r => `<li><span><a href="#/training/routine/${esc(r.id)}">${esc(r.name)}</a><br><span class="leise klein">${r.uebungen.length} Übungen</span></span></li>`).join('')}</ul>` : '<p class="leise">Keine.</p>'}`;
}
/* ---------- Verlauf und Statistik: nur bestätigte Sätze; Varianten/Geräte getrennt; fehlende Angaben = unbekannt ---------- */
let trVZeit = '12w'; const trVVar = {};
const TR_ZEITRAUM = [['4w', '4 Wochen', 28], ['12w', '12 Wochen', 84], ['alle', 'gesamt', 0]];
const trZeitGrenze = () => { const z = TR_ZEITRAUM.find(x => x[0] === trVZeit) || TR_ZEITRAUM[1]; return z[2] ? new Date(Date.now() - z[2] * 864e5).toISOString().slice(0, 10) : '0000'; };
const zeitChips = () => `<div class="fz-chips" role="group" aria-label="Zeitraum">${TR_ZEITRAUM.map(([k, n]) => `<button class="filterchip" data-a="tr-vz-zeit" data-v="${k}" aria-pressed="${trVZeit === k}">${n}</button>`).join('')}</div>`;
// Linien-Diagramm über die Zeit (x = Datum); Werte zusätzlich als Tabelle darunter
function linienSvg(punkte, titel, einheit) {
  if (!punkte.length) return ''; const w = 320, h = 150, pl = 40, pr = 10, pt = 14, pb = 24; const ts = punkte.map(p => new Date(p.datum + 'T12:00:00').getTime()); const t0 = Math.min(...ts), t1 = Math.max(...ts);
  const ys = punkte.map(p => p.y); let min = Math.min(...ys), max = Math.max(...ys); if (min === max) { min -= 1; max += 1; } const sp = max - min;
  const xy = punkte.map((p, i) => [pl + (t1 > t0 ? (ts[i] - t0) / (t1 - t0) : 0.5) * (w - pl - pr), pt + (1 - (p.y - min) / sp) * (h - pt - pb)]);
  const fmt = v => zahlDE(v, 1);
  return `<figure class="diagramm"><figcaption>${esc(titel)}</figcaption><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(titel)}: von ${fmt(punkte[0].y)} bis ${fmt(punkte[punkte.length - 1].y)} ${esc(einheit)}">
    <line x1="${pl}" y1="${pt}" x2="${pl}" y2="${h - pb}" stroke="var(--linie)"/><line x1="${pl}" y1="${h - pb}" x2="${w - pr}" y2="${h - pb}" stroke="var(--linie)"/>
    <text x="${pl - 4}" y="${pt + 4}" font-size="11" text-anchor="end" fill="var(--leise)">${fmt(max)}</text><text x="${pl - 4}" y="${h - pb}" font-size="11" text-anchor="end" fill="var(--leise)">${fmt(min)}</text>
    <text x="${pl}" y="${h - 6}" font-size="11" fill="var(--leise)">${esc(datumDE(punkte[0].datum))}</text><text x="${w - pr}" y="${h - 6}" font-size="11" text-anchor="end" fill="var(--leise)">${esc(datumDE(punkte[punkte.length - 1].datum))}</text>
    ${xy.length > 1 ? `<polyline points="${xy.map(a => a.map(n => n.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="var(--akzent)" stroke-width="2.5" stroke-linejoin="round"/>` : ''}
    ${xy.map((a, i) => `<circle cx="${a[0].toFixed(1)}" cy="${a[1].toFixed(1)}" r="${punkte[i].hohl ? 4 : 3.5}" fill="${punkte[i].hohl ? 'var(--flaeche)' : 'var(--akzent)'}" stroke="var(--akzent)" stroke-width="2"><title>${esc(datumDE(punkte[i].datum))}: ${fmt(punkte[i].y)} ${esc(einheit)}</title></circle>`).join('')}</svg></figure>`;
}
// Sitzungen einer Übung, getrennt nach Variante; je Sitzung schwerster Satz, Wdh. dabei, Volumen, geschätzte Kraft (nur 1–12 Wdh.)
function uebungsSitzungen(id) {
  const out = {}; trDaten().einheiten.filter(e => e.ende).sort((a, b) => a.start.localeCompare(b.start)).forEach(e => e.uebungen.filter(u => u.uebung === id).forEach(u => {
    const s = u.saetze.filter(x => x.art === 'arbeit' && x.erledigt && Number(x.wdh) > 0); if (!s.length) return; const k = u.variante || '';
    const top = [...s].sort((a, b) => (Number(b.kg) || 0) - (Number(a.kg) || 0) || Number(b.wdh) - Number(a.wdh))[0];
    const e1 = s.filter(x => Number(x.wdh) <= 12 && Number(x.kg) > 0).map(x => Number(x.kg) * (1 + Number(x.wdh) / 30));
    (out[k] = out[k] || []).push({ datum: e.start.slice(0, 10), saetze: s, aufwaerm: u.saetze.filter(x => x.art === 'aufwaerm' && x.erledigt).length, top, volumen: s.reduce((a, x) => a + (Number(x.kg) || 0) * Number(x.wdh), 0), e1rm: e1.length ? Math.max(...e1) : null, rirFehlt: s.some(x => x.rir === '' || x.rir == null), beschwerde: !!u.beschwerde, technik: s.map(x => x.technik).filter(Boolean) }); }));
  return out;
}
function uebungVerlaufHtml(id) {
  const alle = uebungsSitzungen(id); const vars = Object.keys(alle); if (!vars.length) return '<h2>Verlauf</h2><p class="leise">Noch keine bestätigten Arbeitssätze.</p>';
  const v = vars.includes(trVVar[id]) ? trVVar[id] : vars.sort((a, b) => alle[b][alle[b].length - 1].datum.localeCompare(alle[a][alle[a].length - 1].datum))[0];
  const grenze = trZeitGrenze(); const l = alle[v].filter(s => s.datum >= grenze);
  const erste = l[0], letzte = l[l.length - 1];
  const zus = l.length >= 2 ? (() => { const a = erste.top, b = letzte.top; const ka = Number(a.kg) || 0, kb = Number(b.kg) || 0, wa = Number(a.wdh), wb = Number(b.wdh);
    const urteil = kb === ka ? (wb > wa ? 'gleiches Gewicht, mehr Wiederholungen' : wb < wa ? 'gleiches Gewicht, weniger Wiederholungen' : 'gleiches Gewicht und gleiche Wiederholungen') : kb > ka && wb >= wa ? 'mehr Gewicht bei mindestens gleich vielen Wiederholungen' : kb < ka && wb <= wa ? 'weniger Gewicht bei höchstens gleich vielen Wiederholungen' : kb > ka ? 'mehr Gewicht, aber weniger Wiederholungen – nicht eindeutig vergleichbar' : 'weniger Gewicht, aber mehr Wiederholungen – nicht eindeutig vergleichbar';
    return `${l.length} Einheiten im Zeitraum. Schwerster Satz: ${satzText(a)} (${datumDE(erste.datum)}) → ${satzText(b)} (${datumDE(letzte.datum)}): ${urteil}.${l.some(s => s.rirFehlt) ? ' In manchen Sätzen fehlt die RIR – die Anstrengung ist dort unbekannt.' : ''}${l.some(s => s.beschwerde) ? ' In mindestens einer Einheit waren Beschwerden notiert.' : ''}`; })() : l.length ? '1 Einheit im Zeitraum – für einen Vergleich sind mindestens zwei nötig.' : 'Keine Einheit in diesem Zeitraum.';
  return `<h2>Verlauf</h2>
  ${vars.length > 1 ? `<p class="klein" style="margin:0">Variante/Gerät (getrennt geführt, nicht vergleichbar):</p><div class="fz-chips">${vars.map(x => `<button class="filterchip" data-a="tr-vz-var" data-u="${esc(id)}" data-v="${esc(x)}" aria-pressed="${x === v}">${esc(x || 'ohne Angabe')}</button>`).join('')}</div>` : v ? `<p class="leise klein">Variante: ${esc(v)}</p>` : ''}
  ${zeitChips()}<p class="klein">${esc(zus)}</p>
  ${l.length ? `${linienSvg(l.map(s => ({ datum: s.datum, y: Number(s.top.kg) || 0, hohl: s.rirFehlt })), 'Gewicht des schwersten Arbeitssatzes (kg)', 'kg')}
    ${linienSvg(l.map(s => ({ datum: s.datum, y: Number(s.top.wdh) || 0 })), 'Wiederholungen in diesem Satz', 'Wdh.')}
    <details class="klein"><summary>Volumen und geschätzte Maximalkraft</summary>
      ${linienSvg(l.map(s => ({ datum: s.datum, y: Math.round(s.volumen) })), 'Volumen: Summe Gewicht × Wiederholungen aller Arbeitssätze (kg)', 'kg')}
      ${l.some(s => s.e1rm) ? linienSvg(l.filter(s => s.e1rm).map(s => ({ datum: s.datum, y: Math.round(s.e1rm * 10) / 10 })), 'Geschätztes 1-Wiederholungs-Maximum (Epley-Formel, nur Sätze mit 1–12 Wdh.)', 'kg') : ''}
      <p class="leise">Volumen hängt stark von Satzzahl und Wiederholungen ab und ist kein direktes Maß für Muskelwachstum. Das geschätzte Maximum ist eine Formelschätzung (Fehler oft mehrere kg, abhängig von Übung und Nähe zum Versagen) – kein gemessener Wert. Hohle Punkte: RIR fehlte.</p></details>
    <table class="mikro verlauf-tabelle"><thead><tr><th>Datum</th><th>Arbeitssätze (Wdh. × kg)</th></tr></thead><tbody>${[...l].reverse().map(s => `<tr><td>${esc(datumDE(s.datum))}${s.aufwaerm ? `<br><span class="leise">+${s.aufwaerm} Aufw.</span>` : ''}</td><td>${s.saetze.map(satzText).map(esc).join('<br>')}${s.technik.length ? `<br><span class="leise">Ausführung: ${esc([...new Set(s.technik)].join('/'))}</span>` : ''}${s.beschwerde ? '<br><span class="chip warn">Beschwerden</span>' : ''}</td></tr>`).join('')}</tbody></table>` : ''}`;
}
function trVerlaufHtml() {
  const t = trDaten(); const grenze = trZeitGrenze(); const fertig = t.einheiten.filter(e => e.ende && e.start.slice(0, 10) >= grenze).sort((a, b) => b.start.localeCompare(a.start));
  const sets = fertig.flatMap(e => e.uebungen.flatMap(u => u.saetze.filter(s => s.erledigt).map(s => ({ s, u, info: ueb(u.uebung) }))));
  const ar = sets.filter(x => x.s.art === 'arbeit'), aw = sets.filter(x => x.s.art === 'aufwaerm');
  const z = TR_ZEITRAUM.find(x => x[0] === trVZeit); const wochen = z && z[2] ? z[2] / 7 : (fertig.length ? Math.max(1, (Date.now() - new Date(fertig[fertig.length - 1].start)) / 6048e5) : 1);
  const direkt = {}, indirekt = {}; ar.forEach(({ info }) => { arr(info.muskeln_haupt).forEach(m => { direkt[m] = (direkt[m] || 0) + 1; }); arr(info.muskeln_neben).forEach(m => { indirekt[m] = (indirekt[m] || 0) + 1; }); });
  const muskeln = [...new Set([...Object.keys(direkt), ...Object.keys(indirekt)])].sort((a, b) => (direkt[b] || 0) - (direkt[a] || 0));
  const zaehl = (feld, werte) => { const c = {}; werte.forEach(([k]) => { c[k] = 0; }); let unb = 0; ar.forEach(({ s }) => { const v = s[feld]; if (v === '' || v == null) unb++; else c[v] = (c[v] || 0) + 1; }); return { c, unb }; };
  const tech = zaehl('technik', TECHNIK), gef = zaehl('gefuehl', GEFUEHL), rir = zaehl('rir', [0, 1, 2, 3, 4, '5+'].map(x => [String(x)]));
  const beschw = fertig.reduce((a, e) => a + e.uebungen.filter(u => u.beschwerde).length, 0);
  const verteilung = (o, liste) => `${liste.map(([k, n]) => `${esc(n || k)}: ${o.c[k] || 0}`).join(' · ')} · unbekannt: ${o.unb}`;
  const jeUebung = {}; t.einheiten.filter(e => e.ende).forEach(e => e.uebungen.forEach(u => { if (!u.saetze.some(x => x.art === 'arbeit' && x.erledigt)) return; const k = u.uebung; (jeUebung[k] = jeUebung[k] || { uebung: k, varianten: new Set(), n: 0, letzte: '' }).n++; jeUebung[k].varianten.add(u.variante || ''); if (e.start > jeUebung[k].letzte) jeUebung[k].letzte = e.start; }));
  const kg = [...t.koerpergewicht].sort((a, b) => a.datum.localeCompare(b.datum)).filter(x => x.datum >= grenze);
  return `<h1>Verlauf und Statistik</h1>${zeitChips()}
  <section class="karte"><h2 style="margin-top:0">Überblick</h2>
    <div class="fz-soll"><div><span>Einheiten</span><b>${fertig.length}</b></div><div><span>pro Woche</span><b>${zahlDE(fertig.length / wochen, 1)}</b></div><div><span>Arbeitssätze</span><b>${ar.length}</b></div><div><span>Aufwärmsätze</span><b>${aw.length}</b></div></div>
    <p class="leise klein">Gezählt werden nur bestätigte Sätze abgeschlossener Einheiten. Übersprungene und offene Sätze zählen nicht.</p></section>
  ${ar.length ? `<section class="karte"><h2 style="margin-top:0">Arbeitssätze je Muskel</h2><div class="tabelle-wrap"><table class="mikro"><thead><tr><th>Muskel</th><th>direkt</th><th>zusätzlich mitbeteiligt</th></tr></thead><tbody>${muskeln.map(m => `<tr><td>${esc(MUSKEL_NAME[m] || m)}</td><td>${direkt[m] || 0}</td><td class="leise">${indirekt[m] || 0}</td></tr>`).join('')}</tbody></table></div>
    <p class="leise klein">„Direkt“: Satz einer Übung, bei der der Muskel als Zielmuskel hinterlegt ist. „Mitbeteiligt“: Hilfsmuskel laut Übungsbibliothek – getrennt aufgeführt und nicht addiert. Eigene Übungen ohne Muskelangabe fehlen hier.</p></section>
  <section class="karte"><h2 style="margin-top:0">Subjektive Angaben (Arbeitssätze)</h2>
    <p class="klein"><b>Ausführung:</b> ${verteilung(tech, TECHNIK)}</p><p class="klein"><b>Zielmuskel gespürt:</b> ${verteilung(gef, GEFUEHL)}</p><p class="klein"><b>RIR eingetragen:</b> ${ar.length - rir.unb} von ${ar.length} Sätzen${ar.length - rir.unb ? ' (' + [0, 1, 2, 3, 4, '5+'].map(x => `${x}: ${rir.c[String(x)] || 0}`).join(' · ') + ')' : ''}</p><p class="klein"><b>Beschwerden notiert:</b> bei ${beschw} Übungseinträgen</p>
    <p class="leise klein">Getrennt von der Leistung ausgewertet. Fehlende Angaben sind „unbekannt“, nicht null. Das Zielmuskelgefühl ist ein subjektiver Eindruck und kein Messwert für Muskelwachstum.</p></section>` : ''}
  <h2>Je Übung</h2>${Object.keys(jeUebung).length ? `<ul class="eintraege">${Object.values(jeUebung).sort((a, b) => b.letzte.localeCompare(a.letzte)).map(x => `<li><span><b><a href="#/training/uebung/${esc(x.uebung)}">${esc(ueb(x.uebung).name)}</a></b><br><span class="leise klein">${x.n} Einheiten · zuletzt ${esc(datumDE(x.letzte.slice(0, 10)))}${x.varianten.size > 1 ? ` · ${x.varianten.size} Varianten getrennt` : ''}</span></span><span><a class="knopf klein" href="#/training/uebung/${esc(x.uebung)}">Grafik</a></span></li>`).join('')}</ul>` : '<p class="leise">Noch keine abgeschlossenen Einheiten.</p>'}
  <h2>Körpergewicht</h2>${kg.length ? linienSvg(kg.map(x => ({ datum: x.datum, y: Number(x.kg) })), 'Körpergewicht (kg)', 'kg') : '<p class="leise">Keine Einträge im Zeitraum.</p>'}<p class="klein"><a href="#/training/gewicht">Eintragen und alle Werte</a></p>
  <h2>Einheiten</h2>${fertig.length ? `<ul class="eintraege">${fertig.slice(0, 40).map(e => { const n = e.uebungen.reduce((s, u) => s + u.saetze.filter(x => x.art === 'arbeit' && x.erledigt).length, 0); return `<li><span><b><a href="#/training/zusammenfassung/${esc(e.id)}">${esc(e.name)}</a></b><br><span class="leise klein">${esc(datumDE(e.start.slice(0, 10)))} · ${n} Arbeitssätze · ${Math.round((new Date(e.ende) - new Date(e.start)) / 60000)} Min.</span></span></li>`; }).join('')}</ul>` : '<p class="leise">Keine Einheiten im Zeitraum.</p>'}`;
}

/* ---------- Mobility und Stretching (Inhalte aus 65 Mobility; persönliche Daten nur lokal) ---------- */
function mobDaten() { if (!D.mobility) D.mobility = { eigene: [], verlauf: [], favoriten: [], einrichtung: {} }; return D.mobility; }
const MOB = () => (K.mobility || { uebungen: [], routinen: [], quellen: {} });
const mobUeb = id => MOB().uebungen.find(u => u.id === id) || { id, name: 'Unbekannte Übung' };
const MOB_ZIEL = { beweglichkeit: 'Bewegungsumfang', aktive_kontrolle: 'aktive Kontrolle', vorbereitung: 'Vorbereitung/Aufwärmen', allgemein: 'allgemeine Bewegungsroutine' };
const MOB_KONTEXT = { vor_training: 'vor dem Training', nach_training: 'nach dem Training', eigenstaendig: 'eigenständig', buero: 'Büro/Pause' };
const MOB_ART = { dynamisch: 'dynamisch', aktiv: 'aktive Mobility', statisch: 'statisches Dehnen' };
const MOB_BEREICH = { huefte: 'Hüfte', gesaess: 'Gesäß', oberschenkel_vorne: 'Oberschenkel vorne', oberschenkel_hinten: 'Oberschenkel hinten', adduktoren: 'Adduktoren', waden: 'Waden', sprunggelenk: 'Sprunggelenk', lendenwirbelsaeule: 'unterer Rücken', brustwirbelsaeule: 'Brustwirbelsäule', schulter: 'Schulter', brust: 'Brust', nacken: 'Nacken', handgelenk: 'Handgelenk' };
let mobFilter = { ziel: '', kontext: '' };
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a, v = b.dataset.v; if (!a.startsWith('mob-')) return;
  const m = mobDaten();
  switch (a) {
    case 'mob-filter': mobFilter[b.dataset.k] = v; route(); break;
    case 'mob-start': aendere(null, d => { mobDaten(); d.mobility.lauf = { id: v, i: 0, start: new Date().toISOString() }; }, { neuZeichnen: false }); location.hash = '#/mobility/lauf'; break;
    case 'mob-schritt': aendere(null, d => { d.mobility.lauf.i = Math.max(0, d.mobility.lauf.i + Number(v)); }); window.scrollTo(0, 0); break;
    case 'mob-fertig': case 'mob-abbruch': { const l = m.lauf; const r = l && mobRoutine(l.id); const voll = a === 'mob-fertig';
      aendere(voll ? 'Routine abgeschlossen' : 'Routine abgebrochen', d => { if (r && (voll || l.i > 0)) d.mobility.verlauf = [...arr(d.mobility.verlauf), { datum: heute(), id: r.id, name: r.name, vollstaendig: voll }]; d.mobility.lauf = null; }, { neuZeichnen: false }); location.hash = '#/mobility'; break; }
    case 'mob-fav': aendere(null, d => { const f = new Set(arr(d.mobility.favoriten)); f.has(v) ? f.delete(v) : f.add(v); d.mobility.favoriten = [...f]; }); break;
    case 'mob-eigen-weg': aendere('Eigene Routine gelöscht – Rückgängig möglich', d => { d.mobility.eigene = arr(d.mobility.eigene).filter(r => r.id !== v); }, { neuZeichnen: false }); location.hash = '#/mobility'; break;
    case 'mob-eigen-speichern': { const c = m.einrichtung || {}; const vs = mobVorschlag(c); if (!vs.uebungen.length) return; const id = uid('mrou');
      aendere('Als eigene Routine gespeichert', d => { d.mobility.eigene = [...arr(d.mobility.eigene), { id, name: 'Meine Routine (' + (MOB_ZIEL[c.ziel] || 'allgemein') + ')', ziel: c.ziel || 'allgemein', kontext: c.kontext || 'eigenstaendig', dauer_min: vs.minuten, bereiche: arr(c.bereiche), uebungen: vs.uebungen.map(u => u.id + '|' + (u.dauer_vorschlag || '')) }]; }, { neuZeichnen: false }); location.hash = '#/mobility/routine/' + id; break; }
  }
});
document.addEventListener('submit', ev => { const f = ev.target; if (f.id !== 'mob-einr') return; ev.preventDefault(); const w = n => [...f.querySelectorAll(`input[name="${n}"]:checked`)].map(x => x.value);
  aendere('Gespeichert', d => { mobDaten(); d.mobility.einrichtung = { ziel: f.ziel.value, minuten: Number(f.minuten.value) || 10, kontext: f.kontext.value, bereiche: w('bereiche'), hilfsmittel: w('hilfsmittel'), unerwuenscht: [...f.unerwuenscht.selectedOptions].map(o => o.value), beschwerden: f.beschwerden.value.trim() }; }); });
function alleMobRoutinen() { return [...MOB().routinen.map(r => Object.assign({ quelle: 'bibliothek' }, r)), ...arr(mobDaten().eigene).map(r => Object.assign({ quelle: 'eigen' }, r))]; }
function mobRoutine(id) { return alleMobRoutinen().find(r => r.id === id); }
function vMobility(teil, id) {
  const m = mobDaten();
  if (!MOB().uebungen.length) return `<h1>Mobility</h1><p class="leer">Die geprüfte Mobility-Bibliothek wird gerade aufgebaut.</p>`;
  if (teil === 'routine') return mobRoutineHtml(id);
  if (teil === 'uebung') return mobUebungHtml(id);
  if (teil === 'lauf') return mobLaufHtml();
  if (teil === 'plan') return mobPlanHtml();
  if (teil === 'verlauf') return mobVerlaufHtml();
  const l = alleMobRoutinen().filter(r => (!mobFilter.ziel || r.ziel === mobFilter.ziel) && (!mobFilter.kontext || r.kontext === mobFilter.kontext));
  const fav = arr(m.favoriten);
  const chip = (k, v, n) => `<button class="filterchip" data-a="mob-filter" data-k="${k}" data-v="${v}" aria-pressed="${mobFilter[k] === v}">${n}</button>`;
  return `<h1>Mobility</h1><p class="leise klein">Dynamisches Aufwärmen, aktive Mobility und statisches Dehnen – kurze Routinen aus geprüften Übungen. Kein Ersatz für Behandlung; keine Garantie für Verletzungsschutz oder Regeneration.</p>
  <div class="chips-wrap">${chip('ziel', '', 'alle Ziele')}${Object.entries(MOB_ZIEL).map(([k, n]) => chip('ziel', k, n)).join('')}</div>
  <div class="chips-wrap" style="margin-top:6px">${chip('kontext', '', 'jederzeit')}${Object.entries(MOB_KONTEXT).map(([k, n]) => chip('kontext', k, n)).join('')}</div>
  <ul class="eintraege" style="margin-top:10px">${l.sort((a, b) => (fav.includes(b.id) ? 1 : 0) - (fav.includes(a.id) ? 1 : 0)).map(r => `<li><span><b><a href="#/mobility/routine/${esc(r.id)}">${esc(r.name)}</a></b>${fav.includes(r.id) ? ' ★' : ''}${r.quelle === 'eigen' ? ' <span class="chip">eigene</span>' : ''}<br><span class="leise klein">${esc(r.dauer_min)} Min. · ${esc(MOB_ZIEL[r.ziel] || '')} · ${esc(MOB_KONTEXT[r.kontext] || '')} · ${esc(arr(r.bereiche).map(b => MOB_BEREICH[b] || b).join(', '))}</span></span><span><button class="haupt klein" data-a="mob-start" data-v="${esc(r.id)}">Starten</button></span></li>`).join('') || '<li class="leise">Keine Routine für diese Auswahl.</li>'}</ul>
  <p class="klein"><a href="#/mobility/plan">Eigene Routine nach deinen Angaben zusammenstellen</a></p>
  <details class="karte"><summary><b>Alle Übungen (${MOB().uebungen.length})</b> <span class="leise klein">– mit Anleitung</span></summary>
    ${Object.entries(MOB_ART).map(([k, n]) => { const l2 = MOB().uebungen.filter(u => u.art === k); return l2.length ? `<h3>${esc(n)}</h3><ul class="anl-liste">${l2.map(u => `<li><span><a href="#/mobility/uebung/${esc(u.id)}">${esc(u.name)}</a> <span class="leise klein">· ${esc(u.dauer_vorschlag || '')}</span></span>${anleitungsKnopf('mob', u.id, '', true)}</li>`).join('')}</ul>` : ''; }).join('')}</details>`;
}
function mobRoutineHtml(id) {
  const r = mobRoutine(id); if (!r) return '<p class="leer">Routine nicht gefunden.</p>'; const fav = arr(mobDaten().favoriten).includes(r.id);
  return `<p class="klein"><a class="knopf still klein" href="#/mobility">${ico('zurueck', 'klein')} Mobility</a></p><h1>${esc(r.name)}</h1>
  <p class="leise klein">${esc(r.dauer_min)} Min. · ${esc(MOB_ZIEL[r.ziel] || '')} · ${esc(MOB_KONTEXT[r.kontext] || '')}</p>
  <div class="knopfreihe"><button class="haupt" data-a="mob-start" data-v="${esc(r.id)}">Routine starten</button><button data-a="mob-fav" data-v="${esc(r.id)}">${fav ? '★ Favorit' : '☆ Als Favorit merken'}</button>${r.quelle === 'eigen' ? `<button class="still" data-a="mob-eigen-weg" data-v="${esc(r.id)}">✕ Löschen</button>` : ''}</div>
  <ol class="tr-liste">${arr(r.uebungen).map(e => { const [uid2, dauer] = String(e).split('|'); const u = mobUeb(uid2.trim()); return `<li class="karte"><div class="zeile" style="justify-content:space-between;align-items:flex-start"><span><b><a href="#/mobility/uebung/${esc(u.id)}">${esc(u.name)}</a></b> <span class="chip">${esc(MOB_ART[u.art] || u.art || '')}</span><br><span class="klein">${esc((dauer || u.dauer_vorschlag || '').trim())}</span></span>${anleitungsKnopf('mob', u.id, '', true)}</div>${u.intensitaet_hinweis ? `<span class="leise klein">${esc(u.intensitaet_hinweis)}</span>` : ''}</li>`; }).join('')}</ol>
  ${r.md ? `<details class="abschnitt-zu"><summary>Wofür, Hinweise und Grenzen</summary>${md(String(r.md).replace(/^\s*# .*\n/, ''))}</details>` : ''}
  <p class="hinweis klein">Deutliches Ziehen ist in Ordnung, Schmerz nicht. Bei Schmerz, Taubheit oder Kribbeln abbrechen. Bei akuten oder ungeklärten Beschwerden ärztlich oder physiotherapeutisch abklären lassen – eine allgemeine Routine ersetzt das nicht.</p>`;
}
function mobUebungHtml(id) {
  const u = mobUeb(id); const q = MOB().quellen || {};
  return `<p class="klein"><a class="knopf still klein" href="javascript:history.back()">${ico('zurueck', 'klein')} zurück</a></p><div class="seitenkopf"><h1>${esc(u.name)}</h1>${anleitungsKnopf('mob', u.id, '')}</div>
  <p class="leise klein">${esc(MOB_ART[u.art] || '')} · ${esc(arr(u.bereiche).map(b => MOB_BEREICH[b] || b).join(', '))} · ${esc(u.dauer_vorschlag || '')} · Hilfsmittel: ${esc(arr(u.hilfsmittel).join(', ') || 'keins')}</p>
  ${u.md ? md(String(u.md).replace(/^\s*# .*\n/, '')) : ''}
  ${u.demo_link ? `<p><a href="${esc(u.demo_link)}" target="_blank" rel="noopener">Demonstration ansehen ↗</a> <span class="leise klein">(${esc(u.demo_link_quelle || 'externe Seite')}${u.demo_link_geprueft ? '; geprüft ' + esc(u.demo_link_geprueft) : ''})</span></p>` : ''}
  ${arr(u.quellen).length ? `<p class="belege">Quellen: ${arr(u.quellen).map(x => { const k = String(x).replace(/^\^/, ''); const e = q[k]; return e && e.url ? `<a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(String(e.titel).slice(0, 70))}</a>` : esc(e ? e.titel : k); }).join(' · ')}</p>` : ''}`;
}
/* Geführter Ablauf: Übung für Übung, Zeitangaben aus der Routine; Timer nur als Hilfe */
function mobLaufHtml() {
  const mobLauf = mobDaten().lauf; const r = mobLauf && mobRoutine(mobLauf.id);
  if (!r) return '<p class="leer">Keine Routine aktiv. <a href="#/mobility">Zu den Routinen</a></p>';
  const l = arr(r.uebungen); const i = Math.min(mobLauf.i, l.length - 1); const [uid2, dauer] = String(l[i]).split('|'); const u = mobUeb(uid2.trim());
  const sek = (String(dauer || u.dauer_vorschlag).match(/(\d+)\s*(?:–\s*\d+\s*)?s\b/) || [])[1];
  return `<p class="leise klein">${esc(r.name)} · Übung ${i + 1} von ${l.length}</p><div class="fortschritt"><i style="width:${Math.round(100 * (i + 1) / l.length)}%"></i></div>
  <div class="seitenkopf"><h1>${esc(u.name)}</h1>${anleitungsKnopf('mob', u.id, '')}</div><p class="klein"><b>${esc((dauer || u.dauer_vorschlag || '').trim())}</b> · ${esc(MOB_ART[u.art] || '')}</p>
  ${sek ? `<div class="knopfreihe"><button data-a="timer" data-min="${Number(sek) / 60}" data-name="${esc(u.name)}">⏱ ${sek} s</button></div>` : ''}
  ${(() => { const b = arr(u.anleitung)[0]; return b ? `<section class="karte"><p><b>Start:</b> ${inline(String(b.start || ''))}</p><ol class="anl-schritte">${arr(b.schritte).map(x => `<li>${inline(String(x))}</li>`).join('')}</ol>${b.intensitaet ? `<p class="klein"><b>Intensität:</b> ${inline(String(b.intensitaet))}</p>` : ''}<p class="leise klein">Fehler, Kontrolle, Varianten und „Dehngefühl oder Schmerz?“ unter „ⓘ Anleitung“.</p></section>` : u.md ? md(String(u.md).replace(/^\s*# .*\n/, '')) : ''; })()}
  <p class="hinweis warn klein">Deutliches Ziehen ist in Ordnung, Schmerz nicht: bei Schmerz, Taubheit oder Kribbeln diese Übung beenden.</p>
  <div style="height:80px"></div>
  <div class="kochnav"><button data-a="mob-schritt" data-v="-1" ${i === 0 ? 'disabled' : ''}>← Zurück</button>${i === l.length - 1 ? '<button class="haupt" data-a="mob-fertig">Fertig ✓</button>' : '<button class="haupt" data-a="mob-schritt" data-v="1">Weiter →</button>'}</div>
  <p><button class="still klein" data-a="mob-abbruch">✕ Routine abbrechen</button></p>`;
}
function mobVerlaufHtml() {
  const v = [...arr(mobDaten().verlauf)].sort((a, b) => b.datum.localeCompare(a.datum));
  return `<h1>Verlauf</h1>${v.length ? `<ul class="eintraege">${v.slice(0, 40).map(x => `<li><span>${esc(datumDE(x.datum))} · <b>${esc(x.name)}</b>${x.vollstaendig ? '' : ' <span class="leise klein">(teilweise)</span>'}</span></li>`).join('')}</ul>` : '<p class="leise">Noch keine Routine abgeschlossen.</p>'}
  <p class="leise klein">Nur ein Protokoll – daraus wird keine Beweglichkeits-„Messung“ abgeleitet.</p>`;
}
/* Persönliche Routine: aus geprüften Übungen nach Ziel, Bereichen, Zeit, Hilfsmitteln; unerwünschte Übungen ausgeschlossen */
function mobSekunden(u, dauer) { const t = String(dauer || u.dauer_vorschlag || ''); const sets = Number((t.match(/(\d+)\s*×/) || [])[1]) || 1; const seiten = /seite/i.test(t) ? 2 : 1; const s = Number((t.match(/(\d+)\s*(?:–\s*(\d+)\s*)?s\b/) || [])[1]); const w = Number((t.match(/(\d+)\s*(?:–\s*\d+\s*)?Wdh/) || [])[1]); return (s ? s : w ? w * 4 : 45) * sets * seiten + 15; }
function mobVorschlag(c) {
  const artNach = { vorbereitung: ['dynamisch', 'aktiv'], beweglichkeit: ['statisch', 'aktiv'], aktive_kontrolle: ['aktiv'], allgemein: ['dynamisch', 'aktiv', 'statisch'] }[c.ziel || 'allgemein'];
  const hm = arr(c.hilfsmittel).length ? arr(c.hilfsmittel) : ['keins']; const nein = arr(c.unerwuenscht); const ber = arr(c.bereiche);
  const kand = MOB().uebungen.filter(u => artNach.includes(u.art) && !nein.includes(u.id) && arr(u.hilfsmittel).every(h => h === 'keins' || hm.includes(h)) && (!ber.length || arr(u.bereiche).some(b => ber.includes(b))));
  const ziel = (Number(c.minuten) || 10) * 60; const gew = []; let sek = 0; const genutzt = new Set();
  // Bereiche reihum abdecken, dann auffüllen
  const reihen = ber.length ? ber : [...new Set(kand.flatMap(u => arr(u.bereiche)))];
  for (let runde = 0; runde < 3 && sek < ziel; runde++) for (const b of reihen) { const u = kand.find(x => !genutzt.has(x.id) && arr(x.bereiche).includes(b)); if (!u) continue; const s = mobSekunden(u); if (sek + s > ziel * 1.1) continue; genutzt.add(u.id); gew.push(u); sek += s; if (sek >= ziel) break; }
  if (c.ziel === 'vorbereitung') gew.sort((a, b) => (a.art === 'dynamisch' ? 0 : 1) - (b.art === 'dynamisch' ? 0 : 1));
  return { uebungen: gew, minuten: Math.round(sek / 60), fehlend: ber.filter(b => !gew.some(u => arr(u.bereiche).includes(b))) };
}
function mobPlanHtml() {
  const c = mobDaten().einrichtung || {}; const v = c.ziel ? mobVorschlag(c) : null;
  const chk = (n, w, an, t) => `<label class="wahl-chip"><input type="checkbox" name="${n}" value="${w}" ${an ? 'checked' : ''}> ${t}</label>`;
  return `<h1>Mein Plan</h1><p class="leise klein">Kurze Angaben, daraus wird eine Routine aus geprüften Übungen zusammengestellt. Alles optional und nur auf diesem Gerät.</p>
  <form id="mob-einr" class="karte">
    <div class="zeile"><label class="feld"><span>Ziel</span><select name="ziel">${[['', '–'], ...Object.entries(MOB_ZIEL)].map(([k, n]) => `<option value="${k}" ${c.ziel === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="feld"><span>Minuten</span><input name="minuten" type="number" min="3" max="45" step="1" value="${esc(c.minuten || 10)}" inputmode="numeric" style="width:5em"></label>
      <label class="feld"><span>Wann</span><select name="kontext">${Object.entries(MOB_KONTEXT).map(([k, n]) => `<option value="${k}" ${c.kontext === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div>
    <fieldset><legend>Körperbereiche</legend><div class="chips-wrap">${Object.entries(MOB_BEREICH).map(([k, n]) => chk('bereiche', k, arr(c.bereiche).includes(k), n)).join('')}</div></fieldset>
    <fieldset><legend>Hilfsmittel</legend><div class="chips-wrap">${[['matte', 'Matte'], ['band', 'Band'], ['wand', 'Wand'], ['stuhl', 'Stuhl'], ['stange', 'Stange']].map(([k, n]) => chk('hilfsmittel', k, arr(c.hilfsmittel).includes(k), n)).join('')}</div></fieldset>
    <label class="feld"><span>Unerwünschte Übungen</span><select name="unerwuenscht" multiple size="4">${MOB().uebungen.map(u => `<option value="${esc(u.id)}" ${arr(c.unerwuenscht).includes(u.id) ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select></label>
    <label class="feld"><span>Einschränkungen oder Beschwerden (nur Notiz)</span><input name="beschwerden" value="${esc(c.beschwerden || '')}"></label>
    <button class="haupt" type="submit">Speichern und Vorschlag zeigen</button></form>
  ${c.beschwerden ? '<p class="hinweis warn klein">Du hast Beschwerden notiert: Die Routine ist allgemein und berücksichtigt sie nicht medizinisch. Bei akuten oder ungeklärten Beschwerden zuerst abklären lassen; Übungen, die schmerzen, weglassen.</p>' : ''}
  ${v ? `<section class="karte"><h2 style="margin-top:0">Vorschlag · ca. ${v.minuten} Min.</h2>${v.uebungen.length ? `<ol>${v.uebungen.map(u => `<li class="anl-zeile"><span><a href="#/mobility/uebung/${esc(u.id)}">${esc(u.name)}</a> <span class="leise klein">· ${esc(MOB_ART[u.art])} · ${esc(u.dauer_vorschlag || '')}</span></span>${anleitungsKnopf('mob', u.id, '', true)}</li>`).join('')}</ol>` : '<p>Mit diesen Angaben passt keine Übung – Bereiche oder Hilfsmittel erweitern.</p>'}
    ${v.fehlend.length ? `<p class="leise klein">Für ${esc(v.fehlend.map(b => MOB_BEREICH[b] || b).join(', '))} passte keine Übung zu Ziel/Hilfsmitteln.</p>` : ''}
    ${v.uebungen.length && v.minuten < (Number(c.minuten) || 10) * 0.7 ? `<p class="leise klein">Kürzer als gewünscht: Für diese Auswahl gibt es nicht mehr passende Übungen – weitere Bereiche oder Hilfsmittel wählen, oder Übungen in Ruhe zweimal durchgehen.</p>` : ''}
    ${v.uebungen.length ? '<button class="klein haupt" data-a="mob-eigen-speichern">Als meine Routine speichern</button>' : ''}</section>` : ''}`;
}

/* ---------- Cardio: getrennt protokolliert, keine Kalorien ins Ernährungsbudget ---------- */
function trCardioHtml() {
  const l = [...arr(trDaten().cardio)].sort((a, b) => b.datum.localeCompare(a.datum));
  const woche = l.filter(x => tageZwischen(x.datum, heute()) < 7).reduce((s, x) => s + (Number(x.minuten) || 0), 0);
  return `<p class="klein"><a class="knopf still klein" href="#/training">${ico('zurueck', 'klein')} Training</a></p><h1>Cardio</h1>
  <form id="tr-cardio" class="karte zeile"><label class="feld"><span>Datum</span><input type="date" name="datum" value="${esc(heute())}"></label><label class="feld"><span>Art</span><input name="art" required placeholder="z. B. Rad, Laufen" style="width:9em"></label><label class="feld"><span>Minuten</span><input name="minuten" type="number" min="1" max="600" inputmode="numeric" required style="width:5em"></label><label class="feld"><span>Intensität</span><select name="intensitaet"><option value="">–</option><option>locker</option><option>mittel</option><option>hart</option></select></label><button class="haupt" type="submit">Eintragen</button></form>
  <p>Letzte 7 Tage: <b>${woche} Min.</b>${trDaten().einrichtung && trDaten().einrichtung.cardio_min ? ` von geplant ${esc(trDaten().einrichtung.cardio_min)} Min.` : ''}</p>
  ${l.length ? `<ul class="eintraege">${l.slice(0, 30).map((x, i) => `<li><span>${esc(datumDE(x.datum))} · <b>${esc(x.art)}</b> ${esc(x.minuten)} Min.${x.intensitaet ? ' · ' + esc(x.intensitaet) : ''}</span><span><button class="still klein" data-a="tr-cardio-weg" data-v="${esc(x.id)}">löschen</button></span></li>`).join('')}</ul>` : '<p class="leise">Noch nichts eingetragen.</p>'}
  <p class="leise klein">Cardio wird getrennt vom Krafttraining gespeichert. Verbrauchte Kalorien werden bewusst nicht geschätzt und nicht zum Ernährungsbudget addiert – Schätzungen weichen oft stark ab.</p>`;
}

/* ---------- Gerät besetzt: Alternativen nach hinterlegter Alternative, Bewegungsmuster, Muskelgruppe ---------- */
/* Passender Ersatz = gleiches Bewegungsmuster bzw. bei Isolation gleicher Hauptmuskel, und mindestens ein gemeinsamer Hauptmuskel.
   Eine gemeinsame Muskelgruppe allein (z. B. „Rücken“ bei Latzug und Kreuzheben) reicht nicht. Freie Auswahl ist davon getrennt. */
const MUSKEL_NAME = { brust: 'Brust', latissimus: 'Latissimus', oberer_ruecken: 'oberer Rücken', rueckenstrecker: 'Rückenstrecker', vordere_schulter: 'vordere Schulter', seitliche_schulter: 'seitliche Schulter', hintere_schulter: 'hintere Schulter', bizeps: 'Bizeps', trizeps: 'Trizeps', quadrizeps: 'Quadrizeps', beinbeuger: 'Beinbeuger', waden: 'Waden', gesaess: 'Gesäß', rumpf: 'Rumpf', adduktoren: 'Adduktoren', unterarme: 'Unterarme' };
const GERAET_NAME = { langhantel: 'Langhantel', kurzhantel: 'Kurzhantel', kabel: 'Kabel', maschine: 'Maschine', koerpergewicht: 'Körpergewicht', klimmzugstange: 'Klimmzugstange', rack: 'Rack', bank: 'Bank', band: 'Band', kettlebell: 'Kettlebell' };
function ersatzVorschlaege(info, ohne) {
  const ein = trDaten().einrichtung || {}; const ger = arr(ein.geraete); const nein = arr(ein.unerwuenscht);
  const haupt = arr(info.muskeln_haupt); const iso = !info.bewegungsmuster || info.bewegungsmuster === 'isolation';
  const geraete = x => arr(x.geraet).filter(g => g !== 'bank').map(g => GERAET_NAME[g] || g);
  return alleUebungen().filter(x => x.id !== info.id && !arr(ohne).includes(x.id) && !nein.includes(x.id)).map(x => {
    const gemein = arr(x.muskeln_haupt).filter(m => haupt.includes(m)); const hinterlegt = arr(info.alternativen).includes(x.id);
    const gleichesMuster = !iso && x.bewegungsmuster === info.bewegungsmuster; const gleicheRolle = iso && x.bewegungsmuster === 'isolation' && arr(x.muskeln_haupt)[0] === haupt[0];
    if (!(gemein.length && (gleichesMuster || gleicheRolle)) && !(hinterlegt && gemein.length)) return null;
    const warum = [gleichesMuster ? 'gleiches Bewegungsmuster (' + (PLATZ_NAME[x.bewegungsmuster] || x.bewegungsmuster) + ')' : gleicheRolle ? 'gleiche Rolle (Isolation)' : 'in der Bibliothek als Alternative hinterlegt', 'Zielmuskel ' + gemein.map(m => MUSKEL_NAME[m] || m).join(', ')];
    const gA = geraete(info), gB = geraete(x); const unterschied = [!gleichesMuster && !gleicheRolle && x.bewegungsmuster !== info.bewegungsmuster ? `anderes Bewegungsmuster (${PLATZ_NAME[x.bewegungsmuster] || x.bewegungsmuster} statt ${PLATZ_NAME[info.bewegungsmuster] || info.bewegungsmuster})` : '', gB.join('/') !== gA.join('/') ? `Gerät: ${gB.join('/') || '–'} statt ${gA.join('/') || '–'}` : '', arr(x.muskeln_haupt).filter(m => !haupt.includes(m)).length ? 'zusätzlich ' + arr(x.muskeln_haupt).filter(m => !haupt.includes(m)).map(m => MUSKEL_NAME[m] || m).join(', ') : ''].filter(Boolean);
    const verfuegbar = !ger.length || x.quelle === 'eigen' || uebVerfuegbar(x, ger);
    return { u: x, warum: warum.join(' · '), unterschied: unterschied.join(' · '), verfuegbar, punkte: (hinterlegt ? 1 : 0) + (gleichesMuster || gleicheRolle ? 3 : 0) + gemein.length + (verfuegbar ? 2 : 0) };
  }).filter(Boolean).sort((a, b) => b.punkte - a.punkte).slice(0, 6);
}
function tauschHtml(u, ui, info) {
  const vs = ersatzVorschlaege(info);
  return `${vs.length ? `<p class="klein" style="margin:.4em 0 .2em"><b>Passende Alternativen</b></p><ul class="ersatz-liste">${vs.map(v => `<li><button type="button" class="klein" data-a="tr-tausch" data-u="${ui}" data-v="${esc(v.u.id)}">${esc(v.u.name)}</button><span class="leise klein">${esc(v.warum)}${v.unterschied ? '. Anders: ' + esc(v.unterschied) : ''}${v.verfuegbar ? '' : ' · laut deiner Einrichtung evtl. nicht verfügbar'}</span></li>`).join('')}</ul>` : '<p class="leise klein">Keine passende Alternative in der Bibliothek.</p>'}
    <details class="klein"><summary>Andere Übung frei wählen</summary><select data-tr-tausch="${ui}" aria-label="Beliebige andere Übung"><option value="">– beliebige Übung –</option>${alleUebungen().filter(x => x.id !== u.uebung).map(x => `<option value="${esc(x.id)}">${esc(x.name)}${x.quelle === 'eigen' ? ' (eigene)' : ''}</option>`).join('')}</select><p class="leise klein">Bewusst freie Wahl – nicht unbedingt gleichwertig.</p></details>
    <p class="leise klein">Gewichte werden nicht übertragen – jede Übung hat einen eigenen Verlauf. Bereits abgeschlossene Sätze bleiben bei der bisherigen Übung.</p>`;
}
// Tausch: erledigte Sätze bleiben bei der alten Übung; offene Sätze wandern in einen neuen Eintrag direkt dahinter
function trTausche(d, ui, neu) {
  const e = d.training.einheiten.find(x => x.id === d.training.aktiv); const u = e.uebungen[ui]; if (!u || !neu || neu === u.uebung) return;
  const offen = u.saetze.filter(s => !s.erledigt).map(s => Object.assign({}, s, { kg: '', wdh: '', rir: '', erledigt: false }));
  const n = { uebung: neu, ersetzt: u.uebung, wdh_von: u.wdh_von, wdh_bis: u.wdh_bis, pause_s: u.pause_s, ziel_rir: u.ziel_rir, je_seite: ueb(neu).je_seite || false, saetze: offen.length ? offen : [{ art: 'arbeit', kg: '', wdh: '', rir: '', erledigt: false }], notiz: '', beschwerde: false };
  if (u.saetze.some(s => s.erledigt)) { u.saetze = u.saetze.filter(s => s.erledigt); u.ersetzt_durch = neu; e.uebungen.splice(ui + 1, 0, n); }
  else e.uebungen.splice(ui, 1, n);
  return n;
}
/* ---------- Heute weniger Zeit: kürzen nach Reihenfolge, Pausen bleiben ---------- */
let trZeitMin = ''; let trZeitVorschlag = null;
const satzSek = (u, s) => 45 + (s.art === 'arbeit' ? (Number(u.pause_s) || 90) : 60);
function einheitRestSek(e) { return e.uebungen.reduce((sum, u) => sum + u.saetze.filter(s => !s.erledigt).reduce((a, s) => a + satzSek(u, s), 0), 0); }
function zeitKuerzen(e, minuten) {
  // Kopie der offenen Sätze; zuerst je Übung (von hinten) einen Arbeitssatz streichen, wenn mind. 3 offen; dann ganze Übungen von hinten (die erste bleibt)
  const ziel = minuten * 60; const plan = e.uebungen.map(u => ({ offenA: u.saetze.filter(s => !s.erledigt && s.art === 'arbeit').length, offenW: u.saetze.filter(s => !s.erledigt && s.art === 'aufwaerm').length, weg: 0, ganz: false }));
  const rest = () => plan.reduce((sum, p, i) => p.ganz ? sum : sum + (p.offenA - p.weg) * (45 + (Number(e.uebungen[i].pause_s) || 90)) + p.offenW * 105, 0);
  for (let i = plan.length - 1; i >= 0 && rest() > ziel; i--) if (plan[i].offenA - plan[i].weg >= 3) plan[i].weg++;
  for (let i = plan.length - 1; i >= 1 && rest() > ziel; i--) if (plan[i].offenA + plan[i].offenW > 0) plan[i].ganz = true;
  return { plan, rest: rest(), passt: rest() <= ziel };
}
function trZeitVorschauHtml(e) {
  const v = trZeitVorschlag; if (!v) return '';
  const aend = v.plan.map((p, i) => p.ganz ? `<li><b>${esc(ueb(e.uebungen[i].uebung).name)}</b>: entfällt heute</li>` : p.weg ? `<li>${esc(ueb(e.uebungen[i].uebung).name)}: ${p.weg} Arbeitssatz weniger</li>` : '').join('');
  return `${aend ? `<ul>${aend}</ul>` : '<p class="klein">Passt ohne Kürzung.</p>'}<p class="leise klein">Danach ca. ${Math.round(v.rest / 60)} Min.${v.passt ? '' : ' – reicht trotzdem nicht ganz; die erste Übung bleibt immer erhalten.'} Pausen werden nicht verkürzt. Reihenfolge der Routine = Priorität.</p>
    ${aend ? '<div class="knopfreihe"><button class="klein haupt" data-a="tr-zeit-ok">So kürzen</button><button class="klein still" data-a="tr-zeit-ab">Abbrechen</button></div>' : ''}`;
}

/* ---------- Privater Plan-Import (Datei liegt nur lokal, nie im öffentlichen Katalog) ----------
   Legt Plan, Routinen und fehlende eigene Übungen an; vorhandene Routinen bleiben unberührt; doppelter Import wird erkannt. */
// Eigene Übungen der Datei auf Bibliotheksübungen abbilden, sobald es sie gibt (dann mit geprüfter Anleitung)
function trImportZuordnung(obj) { const m = {}; arr(obj.uebungen).forEach(u => { if (u.bibliothek && (K.uebungen || []).some(x => x.id === u.bibliothek)) m[u.id] = u.bibliothek; }); return m; }
function trainingsplanImport(obj) {
  if (!obj || obj.art !== 'fitomat-trainingsplan') throw new Error('Das ist keine Fitomat-Plan-Datei (erwartet: art „fitomat-trainingsplan“).');
  if (!obj.plan || !Array.isArray(obj.routinen) || !obj.routinen.length) throw new Error('Trainingsplan-Datei unvollständig.');
  const schon = (trDaten().plaene || []).some(p => p.import_id && p.import_id === obj.import_id);
  const fehlendNein = arr(obj.unerwuenschte_uebungen).filter(x => !arr((trDaten().einrichtung || {}).unerwuenscht).includes(x));
  if (schon) return { doppelt: true, etwasNeu: fehlendNein.length > 0, text: `„${obj.plan.name}“ wurde bereits importiert – es wird nichts doppelt angelegt.${fehlendNein.length ? ' Nur die Liste unerwünschter Übungen für Vorschläge wird ergänzt.' : ''}`, anwenden: d => { if (!fehlendNein.length) return; const t = d.training; t.einrichtung = Object.assign({}, t.einrichtung); t.einrichtung.unerwuenscht = [...new Set([...arr(t.einrichtung.unerwuenscht), ...fehlendNein])]; } };
  const map = trImportZuordnung(obj);
  const neueUeb = arr(obj.uebungen).filter(u => !map[u.id] && !alleUebungen().some(x => x.id === u.id));
  return { text: `${obj.routinen.length} Einheiten, ${obj.routinen.reduce((s, r) => s + r.uebungen.length, 0)} Übungseinträge${Object.keys(map).length ? `, ${Object.keys(map).length} Übungen aus der Bibliothek zugeordnet` : ''}${neueUeb.length ? `, ${neueUeb.length} als eigene Übung angelegt` : ''}. Startgewichte sind historische Angaben – sie werden vorausgefüllt, aber nicht als Leistung gespeichert. Vorhandene Pläne, Trainings, Mahlzeiten und Vorräte bleiben unverändert.`,
    anwenden: d => { const t = d.training || (d.training = { uebungen: [], routinen: [], einheiten: [], aktiv: null, koerpergewicht: [] }); t.plaene = t.plaene || []; t.einstellungen = t.einstellungen || { auto_pause: true, ton: true };
      neueUeb.forEach(u => t.uebungen.push(JSON.parse(JSON.stringify(u))));
      const ids = {}; obj.routinen.forEach(r => { const id = uid('rou'); ids[r.key] = id; t.routinen.push({ id, name: r.name, historisch: obj.plan.art === 'historisch', import_id: obj.import_id, uebungen: JSON.parse(JSON.stringify(r.uebungen)).map(x => { const def = arr(obj.uebungen).find(u => u.id === x.uebung); if (map[x.uebung]) { if (!x.variante && def && def.bibliothek_variante) x.variante = def.bibliothek_variante; x.uebung = map[x.uebung]; } return x; }) }); });
      t.plaene.push({ id: uid('plan'), import_id: obj.import_id, name: obj.plan.name, art: obj.plan.art || 'eigen', hinweis: obj.plan.hinweis || '', aktiv: !t.plaene.some(p => p.aktiv), erstellt: heute(), einheiten: arr(obj.einheiten).filter(pe => ids[pe.routine]).map(pe => ({ routine: ids[pe.routine], tag: pe.tag || '' })) });
      if (obj.einstellungen && obj.einstellungen.aufwaermen_text) t.einstellungen.aufwaermen_text = obj.einstellungen.aufwaermen_text;
      // Persönliche Abneigungen (z. B. Überkopf-Trizeps) für Vorschläge übernehmen, ohne vorhandene Angaben zu löschen
      if (arr(obj.unerwuenschte_uebungen).length) { t.einrichtung = Object.assign({}, t.einrichtung); t.einrichtung.unerwuenscht = [...new Set([...arr(t.einrichtung.unerwuenscht), ...arr(obj.unerwuenschte_uebungen)])]; } } };
}

/* ---------- Plan bearbeiten ---------- */
function trPlanHtml(id) {
  const t = trDaten(); const p = t.plaene.find(x => x.id === id); if (!p) return '<p class="leer">Plan nicht gefunden.</p>';
  const rn = rid => (t.routinen.find(r => r.id === rid) || { name: 'Einheit fehlt' }).name;
  return `<p class="klein"><a class="knopf still klein" href="#/training">${ico('zurueck', 'klein')} Training</a></p>
  <label class="feld"><span>Name des Plans</span><input data-tr-plan-name="${esc(p.id)}" value="${esc(p.name)}"></label>
  <p class="leise klein">${esc(PLAN_ART[p.art] || '')}${p.aktiv ? ' · aktiv' : ''}${p.hinweis ? ' · ' + esc(p.hinweis) : ''}</p>
  <h2>Einheiten</h2>
  ${(() => { const rs = p.einheiten.map(pe => t.routinen.find(r => r.id === pe.routine)).filter(Boolean); const ohne = rs.flatMap(r => r.uebungen).filter(x => (x.referenz_kg || x.start_kg) && !vergleichbareEinheiten(x.uebung, x.variante, null).length).length; const offen = rs.flatMap(r => r.uebungen.filter(x => x.saetze_offen && !(Number(x.saetze) > 0)).map(x => r.name + ': ' + ueb(x.uebung).name)); const unklar = rs.flatMap(r => r.uebungen.filter(x => x.gewicht_hinweis).map(x => r.name.split(' – ')[0] + ': ' + ueb(x.uebung).name));
    return ohne || offen.length || unklar.length ? `<div class="hinweis klein"><b>Vor dem ersten Training prüfen</b><ul>${ohne ? `<li>${ohne} Startgewichte sind ${p.art === 'historisch' ? 'historische Angaben' : 'Startwerte'}: vorausgefüllt, jederzeit änderbar, nicht als Leistung gespeichert. Gesteigert wird erst nach deinen eigenen bestätigten Einheiten.</li>` : ''}${offen.length ? `<li>Satzanzahl offen: ${esc(offen.join(', '))} – wird vor der Übung abgefragt.</li>` : ''}${unklar.length ? `<li>Gewichtsangabe unklar (gesamt oder je Seite, Kabelübersetzung): ${esc(unklar.join(', '))}.</li>` : ''}</ul></div>` : ''; })()}
  ${p.einheiten.length ? `<ol class="tr-liste">${p.einheiten.map((pe, i) => `<li class="karte"><div class="zeile" style="justify-content:space-between;align-items:center"><b><a href="#/training/routine/${esc(pe.routine)}">${esc(rn(pe.routine))}</a></b>
      <button class="haupt klein" data-a="tr-start" data-v="${esc(pe.routine)}" data-plan="${esc(p.id)}" data-pe="${i}" ${t.aktiv ? 'disabled' : ''}>▶ Starten</button></div>
      <div class="zeile" style="justify-content:flex-end"><a class="knopf klein" href="#/training/routine/${esc(pe.routine)}">Übungen und Startwerte</a><button class="klein still" data-a="tr-pe-hoch" data-v="${i}" ${i ? '' : 'disabled'} aria-label="nach oben">↑</button><button class="klein still" data-a="tr-pe-weg" data-v="${i}">entfernen</button></div>
      <label class="feld"><span>Wochentag (optional)</span><select data-tr-pe-tag="${i}"><option value="">flexibel</option>${WOCHENTAGE.map(([k, n]) => `<option value="${k}" ${pe.tag === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      ${(() => { const r = t.routinen.find(x => x.id === pe.routine); return r && r.uebungen.length ? `<details class="klein"><summary>Übungen (${r.uebungen.length}) mit Anleitung</summary><ul class="anl-liste">${r.uebungen.map(x => `<li><span>${esc(ueb(x.uebung).name)}${x.variante ? ` <span class="leise">· ${esc(x.variante)}</span>` : ''}</span>${anleitungsKnopf('tr', x.uebung, x.variante, true)}</li>`).join('')}</ul></details>` : ''; })()}</li>`).join('')}</ol>` : '<p class="leise">Noch keine Einheit im Plan.</p>'}
  <div class="zeile"><label class="feld" style="flex:1 1 200px"><span>Einheit hinzufügen</span><select id="tr-pe-neu"><option value="">– Routine wählen –</option>${t.routinen.map(r => `<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('')}</select></label><button data-a="tr-pe-add" data-v="${esc(p.id)}">hinzufügen</button><button class="still" data-a="tr-pe-neu" data-v="${esc(p.id)}">neue Einheit anlegen</button></div>
  <div class="knopfreihe">${p.aktiv ? `<button data-a="tr-plan-inaktiv" data-v="${esc(p.id)}">Deaktivieren</button>` : `<button class="haupt" data-a="tr-plan-aktiv" data-v="${esc(p.id)}">Als aktiven Plan verwenden</button>`}<button data-a="tr-plan-kopie" data-v="${esc(p.id)}">Duplizieren (eigene Variante)</button><button data-a="tr-plan-qr" data-v="${esc(p.id)}">Auf anderes Gerät übertragen (QR)</button>${p.archiviert ? `<button data-a="tr-plan-zurueck" data-v="${esc(p.id)}">Aus dem Archiv holen</button>` : `<button data-a="tr-plan-archiv" data-v="${esc(p.id)}">Archivieren</button>`}<button class="still" data-a="tr-plan-weg" data-v="${esc(p.id)}">✕ Plan löschen</button></div>
  ${trQrAnzeige && trQrAnzeige.id === p.id ? `<section class="karte" id="tr-qr"><h2 style="margin-top:0">Auf anderes Gerät übertragen</h2>
    <p class="hinweis warn klein"><b>Privat:</b> Der Code enthält diesen Plan mit Startgewichten. Nur mit dem eigenen Gerät scannen, nicht fotografieren oder teilen.</p>
    <div class="qr-gross">${trQrAnzeige.svg}</div>
    <p class="klein">Mit der Kamera des anderen Geräts scannen → Fitomat öffnet sich mit einer Vorschau unter Training → Pläne. Der Plan steht nur im Teil der Adresse nach „#“, der nicht an den Server gesendet wird.</p>
    <div class="knopfreihe"><button class="klein" data-a="tr-qr-kopieren">Plan-Code kopieren</button><button class="klein still" data-a="tr-qr-zu">Ausblenden</button></div></section>` : ''}
  <p class="leise klein">Die Kopie bekommt eigene Einheiten (Routinen); Änderungen daran lassen das Original und alle gespeicherten Trainings unverändert. Beim Löschen eines Plans bleiben Routinen und Trainingsverlauf erhalten.</p>`;
}

/* ---------- Laufende Einheit ---------- */
function trEinheitHtml() {
  const t = trDaten(); const e = t.aktiv && t.einheiten.find(x => x.id === t.aktiv);
  if (!e) return `<p class="leer">Keine Einheit aktiv. <a href="#/training">Zur Übersicht</a></p>`;
  const opt = alleUebungen().map(u => `<option value="${esc(u.id)}">${esc(u.name)}</option>`).join('');
  return `<div class="seitenkopf"><h1>${esc(e.name)}</h1><span class="leise klein">seit ${esc(new Date(e.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }))}</span></div>
  <p class="leise klein">Alles wird sofort gespeichert – du kannst die App schließen und später fortsetzen. ${RIR_TEXT}</p>
  <div class="tr-hilfen">
    <details class="karte klein"><summary><b>Training beenden oder abbrechen</b></summary>
      <div class="knopfreihe"><button class="haupt klein" data-a="tr-ende">${ico('haken', 'klein')} Beenden und speichern</button><button class="klein" data-a="tr-verwerfen">✕ Abbrechen – nichts speichern</button></div>
      <p class="leise klein">„Beenden“ speichert die abgeschlossenen Sätze; offene Sätze zählen nicht. „Abbrechen“ verwirft die ganze Einheit (direkt danach rückgängig machbar). Zum Pausieren einfach die App verlassen – die Einheit bleibt offen.</p></details>
    <details class="karte klein"><summary><b>Kurz-Check</b> <span class="leise">(freiwillig)</span>${e.check && (e.check.beschwerden === 'ja' || e.check.kater === 'stark' || e.check.muede === 'erhoeht') ? ' <span class="chip warn">heute vorsichtiger</span>' : ''}</summary>
      <div class="zeile">${[['muede', 'Müdigkeit', [['', '–'], ['normal', 'normal'], ['erhoeht', 'ungewöhnlich hoch']]], ['kater', 'Muskelkater', [['', '–'], ['nein', 'keiner'], ['leicht', 'leicht'], ['stark', 'stark']]], ['beschwerden', 'Beschwerden', [['', '–'], ['nein', 'keine'], ['ja', 'ja']]]].map(([k, n, o]) => `<label class="feld"><span>${n}</span><select data-tr-check="${k}">${o.map(([v, t]) => `<option value="${v}" ${((e.check || {})[k] || '') === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label>`).join('')}</div>
      <p class="leise klein">Nur ein Merker für dich – daraus wird keine Erholungs-„Diagnose“ berechnet. Bei Beschwerden oder starkem Muskelkater schlägt die App heute keine Steigerung vor.</p></details>
    <details class="karte klein"><summary><b>Heute weniger Zeit?</b></summary>
      <div class="zeile"><label class="feld"><span>Verfügbare Minuten ab jetzt</span><input type="number" inputmode="numeric" min="5" max="240" step="5" id="tr-zeit-min" value="${esc(trZeitMin || '')}" style="width:6em"></label><button class="klein" data-a="tr-zeit-plan">Vorschlag zeigen</button></div>
      <div id="tr-zeit-vorschau">${trZeitVorschlag ? trZeitVorschauHtml(e) : `<p class="leise klein">Geschätzt verbleibend: ca. ${Math.round(einheitRestSek(e) / 60)} Min. (je Satz ca. 45 s plus eingestellte Pause).</p>`}</div></details>
  </div>
  ${e.uebungen.map((u, ui) => { const info = ueb(u.uebung); const l = letzteLeistung(u.uebung, e.id, u.variante);
    return `<section class="karte tr-uebung"><div class="zeile" style="justify-content:space-between;align-items:baseline"><h2 style="margin:0">${esc(info.name)}</h2>${anleitungsKnopf('tr', u.uebung, u.variante)}</div>
      ${u.variante ? `<p class="klein" style="margin:.1em 0">${esc(u.variante)}</p>` : ''}
      <p class="leise klein" style="margin:.2em 0 .6em"><b>${esc(gewichtArt(info))}</b> · ${u.wdh_von ? `Ziel ${u.wdh_von}${u.wdh_bis && u.wdh_bis !== u.wdh_von ? '–' + u.wdh_bis : ''} Wdh.${u.je_seite ? ' je Seite' : ''} · ` : u.je_seite ? 'je Seite · ' : ''}${u.ziel_rir ? `Ziel-RIR ${esc(u.ziel_rir)} · ` : ''}${l ? `Letztes Mal (${esc(datumDE(l.datum))}): ${esc(l.saetze.map(satzText).join(', ') || 'keine Arbeitssätze')}` : 'Noch keine frühere Leistung'}${u.referenz_kg ? ` · Referenz (historisch): ${esc(kgText(u.referenz_kg))}` : ''}${u.ersetzt ? ` · ersetzt ${esc(ueb(u.ersetzt).name)}` : ''}</p>
      ${u.aufwaerm_schema && u.saetze.some(s => s.art === 'aufwaerm') ? `<p class="leise klein" style="margin:-.3em 0 .5em">Aufwärmen (deine Regel): ${esc(aufwaermText(u))} – Gewichte als Vorschlag im Feld, bezogen auf ${l && l.saetze.length ? 'den letzten Arbeitssatz' : u.referenz_kg ? 'das Referenzgewicht' : 'dein Arbeitsgewicht'}.</p>` : ''}
      ${!u.saetze.some(s => s.art === 'arbeit') ? '<p class="hinweis klein">Satzanzahl offen – Arbeitssätze mit „+ Satz“ hinzufügen.</p>' : ''}
      ${vorschlagHtml(u, ui, e)}
      <table class="tr-saetze"><thead><tr><th>Satz</th><th>Vorher</th><th>kg</th><th>Wdh.</th><th>RIR</th><th></th></tr></thead><tbody>
      ${u.saetze.map((s, si) => `<tr class="${s.erledigt ? 'erledigt' : ''}"><td><button class="klein still" data-a="tr-satz-art" data-u="${ui}" data-s="${si}" aria-label="Satzart wechseln">${s.art === 'aufwaerm' ? 'A' : 'W' + (u.saetze.filter((x, xi) => x.art === 'arbeit' && xi <= si).length)}</button></td>
        <td class="vorher">${(() => { const idx = u.saetze.filter((x, xi) => x.art === 'arbeit' && xi <= si).length - 1; const vs = s.art === 'arbeit' && l ? l.saetze[idx] : null; return vs ? esc((vs.kg !== '' && vs.kg != null ? zahlDE(Number(vs.kg), 2) : '–') + '×' + (vs.wdh || '?')) : '–'; })()}</td>
        <td><input type="number" inputmode="decimal" step="0.25" min="0" value="${esc(s.kg ?? '')}" placeholder="${esc(s.art === 'aufwaerm' ? aufwaermVorschlag(u, l, si, 'kg') : trVorher(u, l, si, 'kg'))}" data-tr-satz="kg" data-u="${ui}" data-s="${si}" aria-label="Gewicht kg"></td>
        <td><input type="number" inputmode="numeric" step="1" min="0" value="${esc(s.wdh ?? '')}" placeholder="${esc(s.art === 'aufwaerm' ? aufwaermVorschlag(u, l, si, 'wdh') : trVorher(u, l, si, 'wdh'))}" data-tr-satz="wdh" data-u="${ui}" data-s="${si}" aria-label="Wiederholungen"></td>
        <td><select data-tr-satz="rir" data-u="${ui}" data-s="${si}" aria-label="RIR"><option value=""></option>${[0, 1, 2, 3, 4, '5+'].map(x => `<option ${String(s.rir) === String(x) ? 'selected' : ''}>${x}</option>`).join('')}</select></td>
        <td><button class="klein ${s.erledigt ? '' : 'haupt'}" data-a="tr-satz-ok" data-u="${ui}" data-s="${si}" aria-label="Satz ${s.erledigt ? 'wieder öffnen' : 'abschließen'}">${s.erledigt ? ico('haken', 'klein') : 'fertig'}</button></td></tr>`).join('')}
      </tbody></table>
      <p class="leise klein" style="margin:.4em 0">A = Aufwärmsatz, W = Arbeitssatz (Kürzel antippen zum Wechseln). Pause: ${u.pause_s ? zahlDE(u.pause_s / 60, 1) + ' Min.' : 'frei'}${trDaten().einstellungen.auto_pause !== false ? ' – startet nach einem fertigen Arbeitssatz' : ''}. <button class="klein still" data-a="tr-pause-start" data-u="${ui}">Pause jetzt starten</button></p>
      <div class="knopfreihe"><button class="klein" data-a="tr-satz-add" data-u="${ui}">${ico('plus', 'klein')} Satz</button><button class="klein still" data-a="tr-satz-weg" data-u="${ui}" ${u.saetze.length ? '' : 'disabled'}>letzten Satz entfernen</button>
        <details class="klein"><summary>Gerät besetzt / Übung tauschen</summary>${tauschHtml(u, ui, info)}</details></div>
      <div class="zeile"><label class="feld" style="flex:2 1 180px"><span>Notiz</span><input value="${esc(u.notiz || '')}" data-tr-u-feld="notiz" data-u="${ui}" placeholder="z. B. Griff, Sitzeinstellung"></label>
        <label class="feld"><span>Ausführung (freiwillig)</span><select data-tr-u-qual="${ui}"><option value="">–</option>${[['sauber', 'sauber'], ['unsicher', 'unsicher'], ['unsauber', 'unsauber']].map(([k, n]) => `<option value="${k}" ${u.qualitaet === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div>
      <label style="margin-top:4px"><input type="checkbox" data-tr-u-beschwerde="${ui}" ${u.beschwerde ? 'checked' : ''}> Schmerzen oder Beschwerden bei dieser Übung</label>
      ${u.beschwerde ? `<label class="feld"><span>Was und wo?</span><input value="${esc(u.beschwerde_text || '')}" data-tr-u-feld="beschwerde_text" data-u="${ui}"></label><p class="hinweis warn klein">Bei Schmerzen die Übung nicht „durchziehen“: Satz beenden, leichter oder eine schmerzfreie Alternative wählen. Halten Beschwerden an, ärztlich oder physiotherapeutisch abklären lassen.</p>` : ''}
    </section>`; }).join('')}
  ${uebungsWahlHtml('einheit')}
  <label class="feld"><span>Notiz zur Einheit</span><input value="${esc(e.notiz || '')}" data-tr-e-notiz="1" placeholder="z. B. Schlaf, Energie"></label>
  <div class="knopfreihe"><button class="haupt" data-a="tr-ende">${ico('haken', 'klein')} Einheit beenden</button><button class="still" data-a="tr-verwerfen">Einheit verwerfen</button></div>`;
}

/* ---------- Geführter Modus „Training starten“: ein Satz im Mittelpunkt, Soll und Ist getrennt ----------
   Vorausgefüllte Werte sind Vorgaben. Als Leistung zählt nur, was mit „Satz abschließen“ bestätigt wurde.
   Der Zustand steht in e.fuehrung (gespeichert) – nach App-Wechsel oder Neuladen geht es am selben Satz weiter.
   Pausen nutzen den gemeinsamen Pausentimer (Endzeitpunkt gespeichert); ein Timerablauf erzeugt nie einen Eintrag. */
let trStartWahl = null; let trFUebersicht = false; let trFSperre = 0;
const TECHNIK = [['sauber', 'sauber'], ['unsicher', 'unsicher'], ['unsauber', 'unsauber']];
const GEFUEHL = [['deutlich', 'deutlich'], ['etwas', 'etwas'], ['kaum', 'kaum']];
function trSchritt(u) { const i = ueb(u.uebung); return Number(u.schritt_kg) || Number(i.schritt_kg) || Number(i.gewichtsschritt_kg_vorschlag) || 2.5; }
const trRund = (kg, u) => { const s = trSchritt(u); return Math.round(Math.round(Number(kg) / s) * s * 100) / 100; };
const trOffen = s => !s.erledigt && !s.uebersprungen;
function satzLabel(u, si) { const s = u.saetze[si]; if (!s) return ''; if (s.art === 'aufwaerm') { const k = u.saetze.slice(0, si + 1).filter(x => x.art === 'aufwaerm').length; return `Aufwärmsatz ${k} von ${u.saetze.filter(x => x.art === 'aufwaerm').length}`; } return `Arbeitssatz ${u.saetze.slice(0, si + 1).filter(x => x.art === 'arbeit').length} von ${u.saetze.filter(x => x.art === 'arbeit').length}`; }
// Nächster offener Satz ab Position (ui, si); Übungen mit offener Satzanzahl melden sich mit si = -1
function trNaechsterOffen(e, ui, si) {
  for (let i = ui; i < e.uebungen.length; i++) { const u = e.uebungen[i]; if (u.heute_ausgelassen) continue;
    // Offene Satzanzahl wird vor den Aufwärmsätzen erfragt
    if (u.saetze_offen && !u.saetze.some(s => s.art === 'arbeit') && (i > ui || si < 0)) return { ui: i, si: -1 };
    const ab = i === ui ? si : -1; const j = u.saetze.findIndex((s, k) => k > ab && trOffen(s)); if (j >= 0) return { ui: i, si: j }; }
  return null;
}
function trFuehrung(e) {
  const f = e.fuehrung || (e.fuehrung = { ui: 0, si: 0, phase: 'satz' });
  if (f.phase === 'satz') { const u0 = e.uebungen[f.ui]; if (u0 && f.si >= 0 && u0.saetze_offen && !u0.saetze.some(x => x.art === 'arbeit')) f.si = -1;   // erst Satzanzahl klären
    const u = e.uebungen[f.ui]; const s = u && u.saetze[f.si]; const offenFrage = u && f.si === -1 && u.saetze_offen && !u.saetze.some(x => x.art === 'arbeit');
    if (!offenFrage && !(s && trOffen(s))) { const n = trNaechsterOffen(e, 0, -1); if (n) { f.ui = n.ui; f.si = n.si; } else f.phase = 'fertig'; } }
  return f;
}
// Soll-Werte eines Satzes: Herkunft wird immer angezeigt (eigene Leistung, Vorschlag, historischer Startwert)
function trSoll(e, ui, si) {
  const u = e.uebungen[ui]; const s = u.saetze[si] || { art: 'arbeit' }; const info = ueb(u.uebung);
  const hist = vergleichbareEinheiten(u.uebung, u.variante, e.id); const l = hist[0]; const vs = progressionsVorschlag(u, e.id);
  let basis = null, herkunft = '';
  if (u.soll_kg != null && u.soll_kg !== '') { basis = Number(u.soll_kg); herkunft = 'für heute gewählt'; }
  else if (l && l.top > 0) { basis = l.top; herkunft = `wie zuletzt (${datumDE(l.datum)})${vs.art === 'wiedereinstieg' ? ' – ' + vs.titel : ''}`;
    if (trDaten().einstellungen.vorschlag_vorausfuellen && ['steigern', 'reduzieren'].includes(vs.art) && vs.kg != null) { basis = vs.kg; herkunft = 'Vorschlag, laut deiner Einstellung vorausgefüllt'; } }
  else if (u.start_kg) { basis = Number(u.start_kg); herkunft = 'Startgewicht aus dem Plan'; }
  else if (u.referenz_kg) { basis = Number(u.referenz_kg); herkunft = 'historischer Startwert – noch nie mit der App bestätigt, bitte prüfen'; }
  const von = Number(u.wdh_von) || null, bis = Number(u.wdh_bis) || von; let ziel = von && bis && von !== bis ? `${von}–${bis}` : String(bis || von || ''); let wdh = bis || von || '';
  let kg = basis; let zusatz = '';
  if (s.art === 'arbeit') { const vor = u.saetze.slice(0, si).filter(x => x.art === 'arbeit' && x.erledigt && x.kg !== '' && x.kg != null).pop(); if (vor) { kg = Number(vor.kg); herkunft = 'wie dein letzter Satz heute'; } }
  else { const k = u.saetze.slice(0, si + 1).filter(x => x.art === 'aufwaerm').length - 1; const sch = arr(u.aufwaerm_schema)[k];
    if (sch) { kg = basis ? trRund(basis * sch.pct / 100, u) : null; ziel = String(sch.wdh); wdh = Number((String(sch.wdh).match(/\d+/) || [''])[0]) || ''; zusatz = `ca. ${sch.pct} % des Arbeitsgewichts, auf ${zahlDE(trSchritt(u), 2)}-kg-Schritte gerundet`; }
    else { kg = basis ? trRund(basis * 0.5, u) : null; ziel = '6–8'; wdh = 6; zusatz = 'leichter Aufwärmsatz (ca. 50 %)'; } }
  const idx = u.saetze.slice(0, si + 1).filter(x => x.art === s.art).length - 1;
  const letzter = s.art === 'arbeit' && l ? l.saetze[idx] || null : null;
  return { kg: kg == null || isNaN(kg) ? '' : kg, wdh, ziel, rir: s.art === 'arbeit' ? (u.ziel_rir || '') : '', herkunft: s.art === 'arbeit' ? herkunft : zusatz, letzte: l, letzter, vs, einheit: gewichtArt(info) };
}
function trEntwurf(e, f) {
  const key = f.ui + '-' + f.si; if (f.entwurf && f.entwurf.key === key) return f.entwurf;
  const so = trSoll(e, f.ui, f.si); return { key, kg: so.kg, wdh: so.wdh, rir: null, technik: '', gefuehl: '', beschwerde: false, beschwerde_text: '', getrennt: false, kgL: so.kg, wdhL: so.wdh, kgR: so.kg, wdhR: so.wdh };
}
function stepperHtml(id, label, wert, schritt, einheit) {
  return `<div class="fz-feld"><label for="${id}">${label}${einheit ? ` <span class="leise">(${esc(einheit)})</span>` : ''}</label><div class="fz-stepper"><button type="button" data-a="tr-f-plus" data-feld="${id}" data-d="${-schritt}" aria-label="${label} verringern">−</button><input id="${id}" data-tr-f-feld="${id}" type="number" inputmode="decimal" step="any" min="0" value="${esc(wert ?? '')}"><button type="button" data-a="tr-f-plus" data-feld="${id}" data-d="${schritt}" aria-label="${label} erhöhen">+</button></div></div>`;
}
const chipsHtml = (feld, liste, wert, unbekannt) => `<div class="fz-chips" role="group">${unbekannt ? `<button type="button" class="filterchip" data-a="tr-f-wert" data-feld="${feld}" data-v="" aria-pressed="${wert == null || wert === ''}">${unbekannt}</button>` : ''}${liste.map(([k, n]) => `<button type="button" class="filterchip" data-a="tr-f-wert" data-feld="${feld}" data-v="${esc(k)}" aria-pressed="${String(wert) === String(k)}">${esc(n)}</button>`).join('')}</div>`;
function trStartHtml(rid) {
  const r = trDaten().routinen.find(x => x.id === decodeURIComponent(rid || '')); if (!r) return '<p class="leer">Einheit nicht gefunden. <a href="#/training">Zum Training</a></p>';
  const ohneVerlauf = r.uebungen.filter(x => (x.referenz_kg || x.start_kg) && !vergleichbareEinheiten(x.uebung, x.variante, null).length);
  const pruefen = [ohneVerlauf.length ? `<li><b>Startwerte:</b> ${ohneVerlauf.length} Gewichte sind ${r.historisch ? 'historische Angaben' : 'Startwerte'} und noch nie mit der App bestätigt. Sie werden vorausgefüllt; du bestätigst oder änderst sie bei jedem Satz. Keine automatische Steigerung vor deiner ersten echten Einheit.</li>` : '',
    ...r.uebungen.filter(x => x.saetze_offen && !(Number(x.saetze) > 0)).map(x => `<li><b>${esc(ueb(x.uebung).name)}:</b> Satzanzahl offen – du legst sie vor dieser Übung fest.</li>`),
    ...r.uebungen.filter(x => x.gewicht_hinweis).map(x => `<li><b>${esc(ueb(x.uebung).name)}:</b> ${esc(x.gewicht_hinweis)}</li>`),
    ...r.uebungen.filter(x => /offen/i.test(x.variante || '')).map(x => `<li><b>${esc(ueb(x.uebung).name)}:</b> Variante „${esc(x.variante)}“ – bei Bedarf in der Routine genauer eintragen.</li>`)].filter(Boolean);
  const min = Math.round(r.uebungen.reduce((s, x) => s + (Number(x.aufwaerm) || 0) * 105 + (Number(x.saetze) || 0) * (45 + (Number(x.pause_s) || 90)), 0) / 60);
  return `<p class="klein"><a class="knopf still klein" href="javascript:history.back()">${ico('zurueck', 'klein')} zurück</a></p><h1>${esc(r.name)}</h1>
  <p class="leise klein">${r.uebungen.length} Übungen · ca. ${min} Min. (grob geschätzt)</p>
  ${pruefen.length ? `<div class="hinweis klein"><b>Vor dem ersten Start prüfen</b><ul>${pruefen.join('')}</ul></div>` : ''}
  <ol class="fz-vorschau">${r.uebungen.map(x => { const n = Number(x.saetze) || 0; const kg = x.start_kg || x.referenz_kg; return `<li><span><b>${esc(ueb(x.uebung).name)}</b>${x.variante ? ` <span class="leise klein">· ${esc(x.variante)}</span>` : ''}${x.optional ? ' <span class="chip">optional</span>' : ''}<br><span class="klein">${x.aufwaerm ? x.aufwaerm + ' Aufwärm + ' : ''}${n ? n + ' × ' : 'Sätze offen × '}${esc(x.wdh_von && x.wdh_bis && x.wdh_von !== x.wdh_bis ? x.wdh_von + '–' + x.wdh_bis : (x.wdh_bis || x.wdh_von || '?'))}${x.je_seite ? ' je Seite' : ''}${kg ? ` · Start ${esc(kgText(kg))}` : ''}${x.ziel_rir ? ` · Ziel-RIR ${esc(x.ziel_rir)}` : ''}</span></span>${anleitungsKnopf('tr', x.uebung, x.variante, true)}</li>`; }).join('')}</ol>
  <button class="haupt fz-ok" data-a="tr-f-start" data-v="${esc(r.id)}">▶ Training starten</button>
  <div class="knopfreihe"><a class="knopf still klein" href="#/training/routine/${esc(r.id)}">Übungen und Startwerte bearbeiten</a><button class="still klein" data-a="tr-start-tabelle" data-v="${esc(r.id)}">Ohne Führung (Tabelle)</button></div>`;
}
function trFuehrungHtml() {
  const e = trEinheit(); if (!e) return '<p class="leer">Keine Einheit aktiv. <a href="#/training">Zum Training</a></p>';
  const f = trFuehrung(e); const n = e.uebungen.length;
  const ende = `<button class="haupt" data-a="tr-f-ende">${ico('haken', 'klein')} Training beenden</button>`;
  if (e.pausiert) return `<div class="fz"><h1>Training pausiert</h1><p>Seit ${esc(new Date(e.pausiert).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }))}. Alle bestätigten Sätze sind gespeichert.</p><button class="haupt fz-ok" data-a="tr-f-fortsetzen">▶ Training fortsetzen</button><div class="knopfreihe">${ende}</div></div>`;
  if (!n) return `<div class="fz"><h1>${esc(e.name)}</h1><p class="leise">Diese Einheit hat noch keine Übungen.</p><a class="knopf" href="#/training/einheit">Übungen hinzufügen (Tabelle)</a></div>`;
  const uebersicht = trFUebersicht ? `<section class="karte fz-uebersicht"><div class="zeile" style="justify-content:space-between"><h2 style="margin:0">Übersicht</h2><button class="klein" data-a="tr-f-uebersicht">✕ schließen</button></div><ol>${e.uebungen.map((u, i) => { const ar = u.saetze.filter(s => s.art === 'arbeit'); const ok = ar.filter(s => s.erledigt).length; return `<li class="${i === f.ui ? 'aktuell' : ''}"><span><b>${esc(ueb(u.uebung).name)}</b>${u.variante ? ` <span class="leise klein">· ${esc(u.variante)}</span>` : ''}<br><span class="leise klein">${u.heute_ausgelassen ? 'übersprungen' : `${ok} von ${ar.length || '?'} Arbeitssätzen`}</span></span>${u.saetze.some(trOffen) || (u.saetze_offen && !ar.length) ? `<button class="klein" data-a="tr-f-spring" data-u="${i}">hierhin</button>` : ''}</li>`; }).join('')}</ol><a class="klein" href="#/training/einheit">Tabellenansicht aller Sätze</a></section>` : '';
  const weitere = `<details class="fz-mehr"><summary>Weitere Aktionen</summary><div class="fz-aktionen">
    ${f.letzter ? `<button data-a="tr-f-korr">Letzten Satz korrigieren</button>` : ''}
    ${f.phase === 'satz' && f.si >= 0 ? `<button data-a="tr-f-skip-satz">Satz überspringen</button>` : ''}
    <button data-a="tr-f-satz-plus">Zusätzlicher Satz</button>
    <button data-a="tr-f-skip-uebung">Übung überspringen</button>
    <button data-a="tr-f-uebersicht">Übersicht aller Übungen</button>
    <a class="knopf" href="#/training/uebung/${esc((e.uebungen[f.ui] || {}).uebung || '')}">Verlauf dieser Übung</a>
    <button data-a="tr-f-pausieren">Training pausieren</button>
    ${ende}<button class="still" data-a="tr-f-verwerfen">✕ Abbrechen – nichts speichern</button></div>
    ${f.phase === 'satz' && e.uebungen[f.ui] ? `<details class="klein"><summary>Übung ersetzen (Gerät besetzt)</summary>${tauschHtml(e.uebungen[f.ui], f.ui, ueb(e.uebungen[f.ui].uebung)).replace(/data-a="tr-tausch"/g, 'data-a="tr-f-tausch"').replace(/data-tr-tausch=/g, 'data-tr-f-tausch=')}</details>` : ''}</details>`;
  if (f.korrektur) { const k = f.korrektur; const u = e.uebungen[k.ui]; const s = u && u.saetze[k.si]; if (s) return `<div class="fz">${uebersicht}<p class="fz-kopf">Korrektur · ${esc(ueb(u.uebung).name)} · ${esc(satzLabel(u, k.si))}</p>
    <h1>Satz korrigieren</h1><p class="leise klein">Bisher: ${esc(satzText(s))}</p>
    ${s.seiten ? `<div class="fz-seiten"><div><b>Links</b>${stepperHtml('fz-k-kgL', 'Gewicht', s.seiten.l.kg, trSchritt(u))}${stepperHtml('fz-k-wdhL', 'Wdh.', s.seiten.l.wdh, 1)}</div><div><b>Rechts</b>${stepperHtml('fz-k-kgR', 'Gewicht', s.seiten.r.kg, trSchritt(u))}${stepperHtml('fz-k-wdhR', 'Wdh.', s.seiten.r.wdh, 1)}</div></div>` : `${stepperHtml('fz-k-kg', 'Gewicht', s.kg, trSchritt(u), gewichtArt(ueb(u.uebung)))}${stepperHtml('fz-k-wdh', 'Wiederholungen', s.wdh, 1)}`}
    <p class="klein"><b>RIR (tatsächlich)</b></p>${chipsHtml('k-rir', [0, 1, 2, 3, 4, '5+'].map(x => [x, x]), f.korrektur.rir !== undefined ? f.korrektur.rir : s.rir, 'unbekannt')}
    <button class="haupt fz-ok" data-a="tr-f-korr-ok">Korrektur speichern</button><button class="still" data-a="tr-f-korr-ab">abbrechen</button></div>`; }
  if (f.phase === 'fertig') return `<div class="fz">${uebersicht}<h1>Alle Sätze erledigt</h1><p>Gut gemacht. Beende das Training, um die Zusammenfassung und die Vorschläge für das nächste Mal zu sehen.</p>
    <button class="haupt fz-ok" data-a="tr-f-ende">Training beenden & Zusammenfassung</button><div class="knopfreihe"><button data-a="tr-f-satz-plus">Zusätzlicher Satz</button>${f.letzter ? '<button data-a="tr-f-korr">Letzten Satz korrigieren</button>' : ''}<button data-a="tr-f-uebersicht">Übersicht</button></div></div>`;
  const u = e.uebungen[f.ui]; const info = ueb(u.uebung);
  const kopf = `<div class="fz-kopf"><span>Übung ${f.ui + 1} von ${n}</span><button class="still klein" data-a="tr-f-uebersicht">≡ Übersicht</button></div>`;
  if (f.phase === 'pause') { const t = timer.find(x => x.art === 'pause'); const rest = t ? (t.pausiert != null ? t.pausiert : Math.max(0, Math.round((t.ende - Date.now()) / 1000))) : 0; const nx = trNaechsterOffen(e, f.letzter ? f.letzter.ui : f.ui, f.letzter ? f.letzter.si : f.si) || null;
    const lu = f.letzter && e.uebungen[f.letzter.ui]; const ls = lu && lu.saetze[f.letzter.si]; const nu = nx && e.uebungen[nx.ui]; const wechsel = nx && f.letzter && nx.ui !== f.letzter.ui;
    const nso = nx && nx.si >= 0 ? trSoll(e, nx.ui, nx.si) : null; const block = nu && wechsel ? arr(ueb(nu.uebung).anleitung)[anlBlockWahl(arr(ueb(nu.uebung).anleitung), nu.variante).i] : null;
    return `<div class="fz fz-pause">${uebersicht}<p class="fz-kopf">${wechsel ? 'Pause und Wechsel zur nächsten Übung' : 'Pause'}</p>
      <div class="fz-countdown${rest === 0 ? ' fertig' : ''}" id="fz-countdown" aria-live="off">${rest === 0 ? 'Pause vorbei' : `${Math.floor(rest / 60)}:${String(rest % 60).padStart(2, '0')}`}${t && t.pausiert != null ? '<small>angehalten</small>' : ''}</div>
      <div class="fz-pausenknoepfe"><button class="haupt" data-a="tr-f-pause-ende">${rest === 0 ? 'Weiter zum nächsten Satz' : 'Pause beenden'}</button>${t && rest > 0 ? `<button data-a="timer-plus" data-v="${esc(t.id)}" data-s="30">+30 s</button><button data-a="timer-plus" data-v="${esc(t.id)}" data-s="60">+60 s</button><button data-a="timer-halt" data-v="${esc(t.id)}">${t.pausiert != null ? '▶ fortsetzen' : 'Ⅱ anhalten'}</button>` : ''}</div>
      ${ls ? `<p class="klein">Bestätigt: <b>${esc(ueb(lu.uebung).name)}</b>, ${esc(satzLabel(lu, f.letzter.si))}: ${esc(satzText(ls))} <button class="still klein" data-a="tr-f-korr">korrigieren</button></p>` : ''}
      ${nx ? `<section class="karte fz-naechst"><p class="leise klein" style="margin:0">Als Nächstes – noch nicht begonnen</p><h2 style="margin:.2em 0">${esc(ueb(nu.uebung).name)}</h2>${nu.variante ? `<p class="klein" style="margin:0">${esc(nu.variante)}</p>` : ''}
        <p style="margin:.4em 0">${nx.si >= 0 ? `${esc(satzLabel(nu, nx.si))}: <b>${nso.kg !== '' ? esc(zahlDE(Number(nso.kg), 2)) + ' kg' : 'Gewicht selbst wählen'}</b> · ${esc(nso.ziel || '?')} Wdh.${nu.je_seite ? ' je Seite' : ''}` : 'Satzanzahl festlegen'}</p>
        ${block && block.einstellung ? `<p class="klein"><b>Einstellung:</b> ${inline(String(block.einstellung))}</p>` : ''}${wechsel ? anleitungsKnopf('tr', nu.uebung, nu.variante, true) : ''}</section>` : '<p>Das war der letzte Satz.</p>'}
      <label class="klein"><input type="checkbox" data-tr-einst="auto_weiter" ${trDaten().einstellungen.auto_weiter !== false ? 'checked' : ''}> Nach Ablauf automatisch zur Ansicht des nächsten Satzes wechseln</label>
      ${weitere}</div>`; }
  if (f.si === -1) return `<div class="fz">${uebersicht}${kopf}<h1 class="fz-titel">${esc(info.name)}</h1>${u.variante ? `<p class="fz-var">${esc(u.variante)}</p>` : ''}
    <div class="hinweis"><b>Satzanzahl offen.</b> In deinem Plan war für diese Übung keine Satzanzahl angegeben. Wie viele Arbeitssätze heute?</div>
    <div class="fz-chips">${[1, 2, 3, 4].map(x => `<button class="filterchip fz-gross" data-a="tr-f-saetze" data-v="${x}">${x}</button>`).join('')}</div>
    <label class="klein"><input type="checkbox" id="fz-saetze-merken" checked> Auch im Plan speichern (sonst nur für heute)</label>${weitere}</div>`;
  const s = u.saetze[f.si]; const so = trSoll(e, f.ui, f.si); const ent = trEntwurf(e, f); const schritt = trSchritt(u);
  const vsKurz = s.art === 'arbeit' && u.saetze.filter(x => x.art === 'arbeit').indexOf(s) === 0 && so.vs && so.vs.art !== 'start' ? `<details class="vorschlag v-${esc(so.vs.art)} klein"><summary><b>Vorschlag:</b> ${esc(so.vs.titel)}</summary><p class="klein">${esc(so.vs.begruendung)}</p>${so.vs.daten ? `<p class="leise klein">Daten: ${esc(so.vs.daten)}</p>` : ''}${so.vs.unsicherheit ? `<p class="leise klein">Unsicher: ${esc(so.vs.unsicherheit)}</p>` : ''}${so.vs.kg != null && ['steigern', 'reduzieren'].includes(so.vs.art) ? `<button class="klein" data-a="tr-f-vorschlag" data-v="${esc(so.vs.kg)}">${esc(kgText(so.vs.kg))} für heute übernehmen</button>` : ''}</details>` : '';
  const hinw = [u.gewicht_hinweis, u.plan_notiz, /kabel/.test(arr(info.geraet).join()) ? 'Kabelgewichte nur am selben Turm vergleichen.' : ''].filter(Boolean);
  return `<div class="fz">${uebersicht}${kopf}
    <h1 class="fz-titel">${esc(info.name)}</h1>${u.variante ? `<p class="fz-var">${esc(u.variante)}</p>` : ''}
    <div class="fz-zeile"><span class="fz-satz">${esc(satzLabel(u, f.si))}</span>${anleitungsKnopf('tr', u.uebung, u.variante)}</div>
    <div class="fz-soll"><div><span>Soll Gewicht</span><b>${so.kg !== '' ? esc(zahlDE(Number(so.kg), 2)) + ' kg' : '–'}</b></div><div><span>Ziel Wdh.</span><b>${esc(so.ziel || '–')}${u.je_seite ? ' <small>je Seite</small>' : ''}</b></div>${so.rir ? `<div><span>Ziel-RIR</span><b>${esc(so.rir)}</b></div>` : ''}</div>
    <p class="leise klein fz-herkunft">${esc(so.herkunft || (so.kg === '' ? 'Kein Startwert – Gewicht selbst wählen' : ''))}${so.letzter ? ` · Letztes Mal dieser Satz: ${esc(satzText(so.letzter))}` : so.letzte ? ` · Zuletzt ${esc(datumDE(so.letzte.datum))}: ${esc(so.letzte.saetze.map(satzText).join(', '))}` : ''}</p>
    ${hinw.length ? `<p class="hinweis klein">${hinw.map(esc).join('<br>')}</p>` : ''}${vsKurz}
    <div class="fz-eingabe"><p class="fz-ist">Tatsächlich – bestätigen oder ändern:</p>
      ${u.je_seite ? `<label class="klein"><input type="checkbox" data-a="tr-f-getrennt" ${ent.getrennt ? 'checked' : ''}> Seiten unterschiedlich</label>` : ''}
      ${u.je_seite && ent.getrennt ? `<div class="fz-seiten"><div><b>Links</b>${stepperHtml('fz-kgL', 'Gewicht', ent.kgL, schritt)}${stepperHtml('fz-wdhL', 'Wdh.', ent.wdhL, 1)}</div><div><b>Rechts</b>${stepperHtml('fz-kgR', 'Gewicht', ent.kgR, schritt)}${stepperHtml('fz-wdhR', 'Wdh.', ent.wdhR, 1)}</div></div>`
        : `<div class="fz-paar">${stepperHtml('fz-kg', 'Gewicht', ent.kg, schritt, so.einheit)}${stepperHtml('fz-wdh', u.je_seite ? 'Wdh. je Seite' : 'Wiederholungen', ent.wdh, 1)}</div>`}
      ${s.art === 'arbeit' ? `<p class="klein fz-label"><b>RIR</b> – Wiederholungen in Reserve (freiwillig; leer = unbekannt)</p>${chipsHtml('rir', [0, 1, 2, 3, 4, '5+'].map(x => [x, x]), ent.rir, 'unbekannt')}` : ''}
      <details class="fz-optional"><summary>Ausführung, Zielmuskel, Beschwerden <span class="leise">(freiwillig)</span></summary>
        <p class="klein fz-label"><b>Ausführung</b></p>${chipsHtml('technik', TECHNIK, ent.technik, '–')}
        <p class="klein fz-label"><b>Zielmuskel gespürt</b> <span class="leise">(subjektiv, kein Wachstumsmaß)</span></p>${chipsHtml('gefuehl', GEFUEHL, ent.gefuehl, '–')}
        <label class="klein fz-label"><input type="checkbox" data-a="tr-f-beschwerde" ${ent.beschwerde ? 'checked' : ''}> Schmerzen oder Beschwerden in diesem Satz</label>
        ${ent.beschwerde ? `<label class="feld"><span>Was und wo?</span><input data-tr-f-feld="beschwerde_text" value="${esc(ent.beschwerde_text || '')}"></label><p class="hinweis warn klein">Nicht durchziehen: Übung beenden, leichter oder eine schmerzfreie Alternative wählen. Halten Beschwerden an, ärztlich oder physiotherapeutisch abklären lassen. Bei Beschwerden schlägt die App keine Steigerung vor.</p>` : ''}</details>
    </div>
    <button class="haupt fz-ok" data-a="tr-f-ok" data-k="${esc(ent.key)}">${ico('haken', 'klein')} Satz abschließen & Pause</button>
    ${weitere}</div>`;
}
function trFEntwurfLesen(f) {
  const v = id => { const el = document.getElementById(id); if (!el) return null; const x = String(el.value).replace(',', '.').trim(); return x === '' ? '' : Number(x); };
  const ent = Object.assign({}, f.entwurf || {}); ['kg', 'wdh', 'kgL', 'wdhL', 'kgR', 'wdhR'].forEach(k => { const x = v('fz-' + k); if (x !== null) ent[k] = x; });
  const bt = document.querySelector('[data-tr-f-feld="beschwerde_text"]'); if (bt) ent.beschwerde_text = bt.value; return ent;
}
// Pause starten bzw. ersetzen – Aufwärmsätze kurz, Arbeitssätze laut Routine; nie ein Eintrag durch Timerablauf
function trFPauseStarten(e, u, s) {
  const einst = trDaten().einstellungen; const nx = trNaechsterOffen(e, e.fuehrung.letzter.ui, e.fuehrung.letzter.si);
  const sek = s.art === 'aufwaerm' ? 60 : (Number(u.pause_s) || 120);
  timer = timer.filter(t0 => t0.art !== 'pause'); timer.push({ id: uid('t'), art: 'pause', einheit: e.id, name: 'Pause', naechstes: nx ? (nx.si >= 0 ? satzLabel(e.uebungen[nx.ui], nx.si) + ' · ' : '') + ueb(e.uebungen[nx.ui].uebung).name : 'Training beenden', ton: einst.ton !== false, ende: Date.now() + sek * 1000 });
  timerSpeichern(); zeichneTimer();
}
function trFWeiter(f, e) { const n = trNaechsterOffen(e, f.ui, f.si); if (n) { f.ui = n.ui; f.si = n.si; f.phase = 'satz'; } else f.phase = 'fertig'; f.entwurf = null; }
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-a^="tr-f-"]'); if (!b) return; const a = b.dataset.a; const e = trEinheit(); if (!e) return; const f = trFuehrung(e);
  if (b.tagName === 'INPUT' && b.type === 'checkbox') { const ent = trFEntwurfLesen(f); ent.key = ent.key || f.ui + '-' + f.si;
    if (a === 'tr-f-getrennt') { trSpeichernStill(() => { f.entwurf = Object.assign(trEntwurf(e, f), ent, { getrennt: b.checked }); }); route(); }
    if (a === 'tr-f-beschwerde') { trSpeichernStill(() => { f.entwurf = Object.assign(trEntwurf(e, f), ent, { beschwerde: b.checked }); }); route(); }
    return; }
  switch (a) {
    case 'tr-f-plus': { const el = document.getElementById(b.dataset.feld); if (!el) return; const alt = Number(String(el.value).replace(',', '.')) || 0; el.value = Math.max(0, Math.round((alt + Number(b.dataset.d)) * 100) / 100); el.dispatchEvent(new Event('input', { bubbles: true })); break; }
    case 'tr-f-wert': { const feld = b.dataset.feld; const val = b.dataset.v === '' ? null : b.dataset.v;
      if (feld === 'k-rir') { f.korrektur.rir = val == null ? '' : val; } else trSpeichernStill(() => { f.entwurf = Object.assign(trEntwurf(e, f), trFEntwurfLesen(f), { [feld]: val }); });
      b.parentElement.querySelectorAll('.filterchip').forEach(c => c.setAttribute('aria-pressed', String(c === b))); break; }
    case 'tr-f-ok': {
      // Doppeltippen und veraltete Ansicht abfangen: nur der aktuelle, noch offene Satz kann bestätigt werden
      if (Date.now() - trFSperre < 1200 || b.dataset.k !== f.ui + '-' + f.si || f.phase !== 'satz') return; const u = e.uebungen[f.ui]; const s = u && u.saetze[f.si]; if (!s || !trOffen(s)) return;
      const ent = Object.assign(trEntwurf(e, f), trFEntwurfLesen(f)); const so = trSoll(e, f.ui, f.si);
      const seiten = u.je_seite && ent.getrennt ? { l: { kg: ent.kgL, wdh: ent.wdhL }, r: { kg: ent.kgR, wdh: ent.wdhR } } : null;
      const wdh = seiten ? Math.min(Number(seiten.l.wdh) || 0, Number(seiten.r.wdh) || 0) : ent.wdh; const kg = seiten ? (Number(seiten.l.wdh) <= Number(seiten.r.wdh) ? seiten.l.kg : seiten.r.kg) : ent.kg;
      if (wdh === '' || wdh == null || !(Number(wdh) >= 0)) { toast('Bitte die tatsächlichen Wiederholungen eintragen'); return; }
      trFSperre = Date.now(); b.disabled = true;
      aendere(null, d => { const e2 = trEinheit(); const f2 = e2.fuehrung; const u2 = e2.uebungen[f2.ui]; const s2 = u2.saetze[f2.si];
        Object.assign(s2, { soll: { kg: so.kg, wdh: so.wdh, ziel: so.ziel, rir: so.rir }, kg: kg === '' ? '' : Number(kg), wdh: Number(wdh), rir: ent.rir == null ? '' : ent.rir, erledigt: true, zeit: new Date().toISOString() });
        if (seiten) s2.seiten = seiten; else delete s2.seiten;
        if (ent.technik) s2.technik = ent.technik; if (ent.gefuehl) s2.gefuehl = ent.gefuehl;
        if (ent.beschwerde) { s2.beschwerde = true; s2.beschwerde_text = ent.beschwerde_text || ''; u2.beschwerde = true; u2.beschwerde_text = [u2.beschwerde_text, ent.beschwerde_text].filter(Boolean).join('; '); }
        if (ent.technik === 'unsauber') u2.qualitaet = 'unsauber'; else if (ent.technik && !u2.qualitaet) u2.qualitaet = ent.technik;
        f2.letzter = { ui: f2.ui, si: f2.si }; f2.entwurf = null; f2.phase = 'pause'; }, { neuZeichnen: false });
      trFPauseStarten(trEinheit(), e.uebungen[f.ui], e.uebungen[f.ui].saetze[f.si]); window.scrollTo(0, 0); route(); break; }
    case 'tr-f-pause-ende': timer = timer.filter(t0 => t0.art !== 'pause'); timerSpeichern(); zeichneTimer(); aendere(null, () => { const l = f.letzter || { ui: f.ui, si: f.si }; f.ui = l.ui; f.si = l.si; trFWeiter(f, e); }, { neuZeichnen: false }); window.scrollTo(0, 0); route(); break;
    case 'tr-f-korr': if (f.letzter) { f.korrektur = { ui: f.letzter.ui, si: f.letzter.si }; route(); window.scrollTo(0, 0); } break;
    case 'tr-f-korr-ab': delete f.korrektur; route(); break;
    case 'tr-f-korr-ok': { const k = f.korrektur; const s = e.uebungen[k.ui].saetze[k.si]; const v = id => { const el = document.getElementById(id); return el && el.value !== '' ? Number(String(el.value).replace(',', '.')) : ''; };
      aendere('Satz korrigiert', () => { if (s.seiten) { s.seiten = { l: { kg: v('fz-k-kgL'), wdh: v('fz-k-wdhL') }, r: { kg: v('fz-k-kgR'), wdh: v('fz-k-wdhR') } }; const lw = Number(s.seiten.l.wdh) <= Number(s.seiten.r.wdh); s.wdh = Math.min(Number(s.seiten.l.wdh) || 0, Number(s.seiten.r.wdh) || 0); s.kg = lw ? s.seiten.l.kg : s.seiten.r.kg; } else { s.kg = v('fz-k-kg'); s.wdh = v('fz-k-wdh'); } if (k.rir !== undefined) s.rir = k.rir; s.korrigiert = new Date().toISOString(); delete f.korrektur; }); break; }
    case 'tr-f-skip-satz': aendere('Satz übersprungen – zählt nicht', () => { const s = e.uebungen[f.ui].saetze[f.si]; if (s && trOffen(s)) s.uebersprungen = true; trFWeiter(f, e); }); break;
    case 'tr-f-satz-plus': aendere('Zusätzlicher Arbeitssatz', () => { const ui0 = f.phase === 'fertig' && f.letzter ? f.letzter.ui : f.ui; const u = e.uebungen[ui0]; u.saetze.push({ art: 'arbeit', kg: '', wdh: '', rir: '', erledigt: false, extra: true }); if (f.phase === 'fertig') { f.ui = ui0; f.si = u.saetze.length - 1; f.phase = 'satz'; } }); break;
    case 'tr-f-skip-uebung': aendere('Übung übersprungen – offene Sätze zählen nicht', () => { const u = e.uebungen[f.ui]; u.saetze.forEach(s => { if (trOffen(s)) s.uebersprungen = true; }); u.heute_ausgelassen = 'übersprungen'; f.si = u.saetze.length; trFWeiter(f, e); }); break;
    case 'tr-f-uebersicht': trFUebersicht = !trFUebersicht; route(); if (trFUebersicht) window.scrollTo(0, 0); break;
    case 'tr-f-spring': { const i = Number(b.dataset.u); trFUebersicht = false; aendere(null, () => { const u = e.uebungen[i]; delete u.heute_ausgelassen; u.saetze.forEach(s => { delete s.uebersprungen; }); const n = trNaechsterOffen(e, i, -1); f.ui = i; f.si = n && n.ui === i ? n.si : u.saetze.findIndex(trOffen); f.phase = 'satz'; f.entwurf = null; }); break; }
    case 'tr-f-pausieren': { const t = timer.find(x => x.art === 'pause'); if (t && t.pausiert == null) { t.pausiert = Math.max(0, Math.round((t.ende - Date.now()) / 1000)); timerSpeichern(); zeichneTimer(); } aendere('Training pausiert – alles gespeichert', () => { e.pausiert = new Date().toISOString(); }); break; }
    case 'tr-f-fortsetzen': { const t = timer.find(x => x.art === 'pause'); if (t && t.pausiert != null) { t.ende = Date.now() + t.pausiert * 1000; t.pausiert = null; timerSpeichern(); zeichneTimer(); } aendere(null, () => { delete e.pausiert; }); break; }
    case 'tr-f-saetze': { const n = Number(b.dataset.v); const merken = ($('#fz-saetze-merken') || {}).checked; aendere(`${n} Arbeitssätze festgelegt${merken ? ' – auch im Plan gespeichert' : ' (nur heute)'}`, d => { const u = e.uebungen[f.ui]; for (let i = 0; i < n; i++) u.saetze.push({ art: 'arbeit', kg: '', wdh: '', rir: '', erledigt: false }); const j = u.saetze.findIndex(trOffen); f.si = j; f.phase = 'satz';
      if (merken && e.routine) { const r = d.training.routinen.find(x => x.id === e.routine); const x = r && r.uebungen.find(y => y.uebung === u.uebung && (y.variante || '') === (u.variante || '') && y.saetze_offen); if (x) { x.saetze = n; delete x.saetze_offen; } } }); break; }
    case 'tr-f-vorschlag': aendere(`Für heute: ${kgText(Number(b.dataset.v))} – du bestätigst jeden Satz selbst`, () => { const u = e.uebungen[f.ui]; u.soll_kg = Number(b.dataset.v); u.vorschlag = { art: 'steigern', entscheidung: 'uebernommen', kg: Number(b.dataset.v), zeit: new Date().toISOString() }; f.entwurf = null; }); break;
    case 'tr-f-tausch': { const v = b.dataset.v; if (!v) return; aendere(`Ersetzt durch ${ueb(v).name} – Gewichte nicht übernommen`, d => { const geteilt = e.uebungen[f.ui].saetze.some(s => s.erledigt); trTausche(d, f.ui, v); const e2 = trEinheit(); const i = geteilt ? f.ui + 1 : f.ui; e2.fuehrung.ui = i; e2.fuehrung.si = e2.uebungen[i].saetze.findIndex(trOffen); e2.fuehrung.phase = 'satz'; e2.fuehrung.entwurf = null; }); break; }
    case 'tr-f-ende': { const offen = e.uebungen.reduce((s, u) => s + u.saetze.filter(x => trOffen(x) && x.art === 'arbeit').length, 0);
      if (offen && !confirm(`${offen} Arbeitssätze sind nicht bestätigt. Trotzdem beenden? Sie werden nicht gezählt.`)) return;
      timer = timer.filter(t0 => !(t0.art === 'pause' && t0.einheit === e.id)); timerSpeichern(); zeichneTimer(); const id = e.id;
      aendere('Training gespeichert', d => { const e2 = trEinheit(); e2.ende = new Date().toISOString(); delete e2.pausiert; if (e2.fuehrung) e2.fuehrung.phase = 'beendet'; d.training.aktiv = null; }, { neuZeichnen: false }); location.hash = '#/training/zusammenfassung/' + id; break; }
    case 'tr-f-verwerfen': if (!confirm('Training abbrechen? Alle Sätze dieser Einheit werden verworfen (direkt danach rückgängig machbar).')) return; timer = timer.filter(t0 => t0.art !== 'pause'); timerSpeichern(); zeichneTimer();
      aendere('Training abgebrochen – nichts gespeichert; Rückgängig möglich', d => { d.training.einheiten = d.training.einheiten.filter(x => x.id !== d.training.aktiv); d.training.aktiv = null; }, { neuZeichnen: false }); location.hash = '#/training'; break;
  }
});
document.addEventListener('change', async ev => { const el = ev.target; if (el.id !== 'tr-import-datei' || !el.files || !el.files[0]) return;
  try { trImportObj = JSON.parse(await el.files[0].text()); trainingsplanImport(trImportObj); } catch (err) { trImportObj = null; toast('Datei nicht lesbar: ' + err.message); } el.value = ''; route(); const k = $('#tr-import'); if (k) k.scrollIntoView({ block: 'start' }); });
document.addEventListener('change', ev => { const el = ev.target; if (el.dataset && el.dataset.trFTausch != null && el.value) { const e = trEinheit(); const f = e && trFuehrung(e); if (!f) return; const v = el.value;
  aendere(`Ersetzt durch ${ueb(v).name} – Gewichte nicht übernommen`, d => { const geteilt = e.uebungen[f.ui].saetze.some(s => s.erledigt); trTausche(d, f.ui, v); const e2 = trEinheit(); const i = geteilt ? f.ui + 1 : f.ui; e2.fuehrung.ui = i; e2.fuehrung.si = e2.uebungen[i].saetze.findIndex(trOffen); e2.fuehrung.phase = 'satz'; e2.fuehrung.entwurf = null; }); } });
// Eingaben im aktuellen Satz sofort als Entwurf sichern (nicht als Leistung) – überstehen Neuladen und App-Wechsel
document.addEventListener('input', ev => { const el = ev.target; const k = el.dataset && el.dataset.trFFeld; if (!k || /^fz-k-/.test(k)) return; const e = trEinheit(); if (!e || !e.fuehrung) return; const f = e.fuehrung;
  trSpeichernStill(() => { const ent = Object.assign(trEntwurf(e, f), trFEntwurfLesen(f)); f.entwurf = ent; }); });
// Sekundentakt: Countdown aktualisieren; nach Ablauf (wenn eingestellt) zur Ansicht des nächsten Satzes – ohne etwas zu buchen
setInterval(() => {
  document.body.classList.toggle('fz-aktiv', location.hash.startsWith('#/training/fuehrung'));
  if (!location.hash.startsWith('#/training/fuehrung')) return; const e = trEinheit(); if (!e || !e.fuehrung || e.fuehrung.phase !== 'pause' || e.pausiert) return;
  const t = timer.find(x => x.art === 'pause'); const rest = t ? (t.pausiert != null ? t.pausiert : Math.max(0, Math.round((t.ende - Date.now()) / 1000))) : 0;
  const el = document.getElementById('fz-countdown');
  if (rest > 0 || (t && t.pausiert != null)) { if (el) el.firstChild.nodeValue = `${Math.floor(rest / 60)}:${String(rest % 60).padStart(2, '0')}`; return; }
  if (trDaten().einstellungen.auto_weiter === false) { if (el && !el.classList.contains('fertig')) route(); return; }
  if (document.querySelector('.anl[open]') || document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;   // nicht mitten in Anleitung oder Eingabe umschalten
  timer = timer.filter(t0 => t0.art !== 'pause'); timerSpeichern(); zeichneTimer();
  aendere(null, () => { const f = e.fuehrung; const l = f.letzter || { ui: f.ui, si: f.si }; f.ui = l.ui; f.si = l.si; trFWeiter(f, e); }, { neuZeichnen: false }); route();
}, 1000);
window.addEventListener('hashchange', () => { document.body.classList.toggle('fz-aktiv', location.hash.startsWith('#/training/fuehrung')); trFUebersicht = false; });
/* Zusammenfassung nach dem Training: bestätigte Sätze, Bestleistungen nur bei vergleichbarer Basis, Beschwerden, Vorschläge fürs nächste Mal */
function trBestleistung(u, e) {
  const frueher = trDaten().einheiten.filter(x => x.ende && x.id !== e.id && x.start < e.start).flatMap(x => x.uebungen.filter(y => y.uebung === u.uebung && (y.variante || '') === (u.variante || '')).flatMap(y => y.saetze.filter(s => s.art === 'arbeit' && s.erledigt)));
  if (!frueher.length) return null;
  const heute = u.saetze.filter(s => s.art === 'arbeit' && s.erledigt && Number(s.wdh) > 0);
  const neu = heute.filter(s => !frueher.some(p => (Number(p.kg) || 0) >= (Number(s.kg) || 0) && (Number(p.wdh) || 0) >= Number(s.wdh)));
  return neu.length ? neu.sort((a, b) => (Number(b.kg) || 0) - (Number(a.kg) || 0) || Number(b.wdh) - Number(a.wdh))[0] : null;
}
function trZusammenfassungHtml(id) {
  const e = trDaten().einheiten.find(x => x.id === id); if (!e) return '<p class="leer">Einheit nicht gefunden.</p>';
  const dauer = e.ende ? Math.round((new Date(e.ende) - new Date(e.start)) / 60000) : null;
  const zeilen = e.uebungen.map(u => { const info = ueb(u.uebung); const ar = u.saetze.filter(s => s.art === 'arbeit' && s.erledigt); const aw = u.saetze.filter(s => s.art === 'aufwaerm' && s.erledigt).length; const ub = u.saetze.filter(s => s.uebersprungen).length;
    const pr = trBestleistung(u, e); const vs = ar.length ? progressionsVorschlag(u, '—') : null;
    return `<li class="karte"><b>${esc(info.name)}</b>${u.variante ? ` <span class="leise klein">· ${esc(u.variante)}</span>` : ''}${u.ersetzt ? ` <span class="leise klein">(Ersatz für ${esc(ueb(u.ersetzt).name)})</span>` : ''}
      <p class="klein" style="margin:.3em 0">${ar.length ? ar.map(satzText).map(esc).join(' · ') : '<span class="leise">keine bestätigten Arbeitssätze</span>'}${aw ? ` <span class="leise">(+ ${aw} ${aw === 1 ? 'Aufwärmsatz' : 'Aufwärmsätze'})</span>` : ''}${ub ? ` <span class="leise">· ${ub} übersprungen</span>` : ''}</p>
      ${pr ? `<p class="klein chip gut">Bestleistung an dieser Übung/Variante: ${esc(satzText(pr))}</p>` : ''}
      ${u.beschwerde ? `<p class="hinweis warn klein">Beschwerden notiert${u.beschwerde_text ? ': ' + esc(u.beschwerde_text) : ''}. Beim nächsten Mal keine Steigerung.</p>` : ''}
      ${vs ? `<p class="klein" style="margin:.2em 0"><b>Nächstes Mal:</b> ${esc(vs.titel)}<br><span class="leise">${esc(vs.begruendung)}</span></p>` : ''}</li>`; }).join('');
  return `<p class="klein"><a class="knopf still klein" href="#/training">${ico('zurueck', 'klein')} Training</a></p><h1>Zusammenfassung</h1>
  <p class="leise klein">${esc(e.name)} · ${esc(datumDE(e.start.slice(0, 10)))}${dauer != null ? ` · ${dauer} Min.` : ''} · ${(n => n + (n === 1 ? ' bestätigter Arbeitssatz' : ' bestätigte Arbeitssätze'))(e.uebungen.reduce((s, u) => s + u.saetze.filter(x => x.art === 'arbeit' && x.erledigt).length, 0))}</p>
  <p class="leise klein">Bestleistungen nur im Vergleich mit derselben Übung und Variante und nur, wenn kein früherer Satz mit mindestens gleichem Gewicht und gleich vielen Wiederholungen existiert. Vorschläge beruhen ausschließlich auf deinen bestätigten Sätzen.</p>
  <ol class="tr-liste">${zeilen}</ol>
  <label class="feld"><span>Notiz zur Einheit</span><input value="${esc(e.notiz || '')}" data-tr-z-notiz="${esc(e.id)}" placeholder="z. B. Schlaf, Energie"></label>
  <div class="knopfreihe"><a class="knopf haupt" href="#/training">Fertig</a><a class="knopf" href="#/training/verlauf">Verlauf und Statistik</a></div>`;
}
document.addEventListener('input', ev => { const el = ev.target; if (el.dataset && el.dataset.trZNotiz) trSpeichernStill(() => { const e = trDaten().einheiten.find(x => x.id === el.dataset.trZNotiz); if (e) e.notiz = el.value; }); });

/* ---------- ⓘ Anleitung: Kurzanleitung je Übung und Variante als Fenster über der aktuellen Ansicht.
   Das Fenster liegt außerhalb von #app – Eingaben, Sätze und Timer bleiben unberührt. Keine automatische Ton-/Videowiedergabe. ---------- */
const DEHN_SCHMERZ = () => `<b>Dehngefühl:</b> gleichmäßiges, deutliches Ziehen im gedehnten Bereich – etwa 4–6 auf einer gefühlten Skala von 0 bis 10 –, das beim Lösen der Position rasch nachlässt. Bis zur Schmerzgrenze zu dehnen ist nicht nötig ${linkHtml('Mobility – Grundlagen#^mob-konrad-2024', 'Konrad 2024')} ${linkHtml('Mobility – Grundlagen#^mob-delphi-2025', 'Delphi 2025')}.<br><b>Schmerz – sofort beenden:</b> stechend, einschießend, ausstrahlend oder brennend; Taubheit oder Kribbeln; Beschwerden, die nach dem Lösen bleiben <i>(Abbruchregel der App; Beschreibung Vorschlag, ungeprüft)</i>.`;
function anleitungsKnopf(art, id, variante, klein) { return `<button type="button" class="anl-knopf${klein ? ' anl-klein' : ''}" data-a="anleitung" data-art="${art}" data-id="${esc(id)}" data-var="${esc(variante || '')}" aria-haspopup="dialog"><span aria-hidden="true">ⓘ</span> Anleitung</button>`; }
// Plan-Variante (freier Text) → passender Block. Stichwörter: „Passt zu“ plus Wörter des Blocknamens; Treffer am Wortanfang.
// Gewicht = Wortlänge ÷ Zahl der Blöcke mit diesem Stichwort – unterscheidende Wörter (Seil, einarmig) schlagen gemeinsame (stehend, beidarmig).
const ANL_STOPP = new Set(['oder', 'eine', 'einer', 'einem', 'einen', 'etwa', 'beim', 'dabei', 'sowie', 'grundform', 'variante', 'übung']);
function anlStichwoerter(b) { return [...new Set([...arr(b.passt).map(w => String(w).toLowerCase().trim()), ...String(b.name || '').toLowerCase().split(/[^a-zäöüß0-9-]+/).filter(w => w.length >= 4 && !ANL_STOPP.has(w))].filter(Boolean))]; }
function anlBlockWahl(bl, variante) {
  const v = String(variante || '').toLowerCase(); if (!v || !bl.length) return { i: 0, treffer: !v };
  const sw = bl.map(anlStichwoerter); const haeufig = {}; sw.forEach(l => l.forEach(w => { haeufig[w] = (haeufig[w] || 0) + 1; }));
  const trifft = w => new RegExp('(^|[^a-zäöüß])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(v);
  let best = -1, punkte = 0;
  sw.forEach((l, i) => { const p = l.filter(trifft).reduce((s, w) => s + w.length / haeufig[w], 0); if (p > punkte + 1e-9) { punkte = p; best = i; } });
  return best >= 0 ? { i: best, treffer: true } : { i: 0, treffer: false };
}
let anlZustand = null;
function anleitungInhalt() {
  const { art, id, variante, wahl } = anlZustand; const mob = art === 'mob'; const u = mob ? mobUeb(id) : ueb(id); const bl = arr(u.anleitung);
  const w = wahl != null ? { i: wahl, treffer: true } : anlBlockWahl(bl, variante); const b = bl[w.i];
  const li = l => arr(l).map(x => `<li>${inline(String(x))}</li>`).join('');
  const zeile = (titel, text) => text ? `<p><b>${titel}:</b> ${inline(String(text))}</p>` : '';
  const quellen = arr(u.quellen).map(x => { const k = String(x).replace(/^\^/, ''); if (mob) { const e = (MOB().quellen || {})[k]; return e ? (e.url ? `<a href="${esc(e.url)}" target="_blank" rel="noopener">${esc(String(e.titel).slice(0, 90))} ↗</a>` : esc(e.titel)) : esc(k); } const q = K.quellen && K.quellen[k]; return q ? linkHtml('Quellenverzeichnis#' + k, String(q.titel || k).slice(0, 90)) : esc(k); });
  let kopf = `<div class="anl-kopf"><div><h2 id="anl-titel">${esc(u.name)}</h2>${b ? `<p class="anl-variante">${esc(b.name)}</p>` : ''}</div><button type="button" class="anl-zu" data-a="anleitung-zu" aria-label="Anleitung schließen">✕</button></div>`;
  if (u.quelle === 'eigen') return kopf + `<div class="anl-inhalt"><p class="hinweis klein">Eigene Übung – dafür gibt es keine geprüfte Anleitung.</p>${u.notiz ? `<p>${esc(u.notiz)}</p>` : ''}${u.link ? `<p><a href="${esc(u.link)}" target="_blank" rel="noopener">Eigener Demonstrationslink ↗</a> <span class="leise klein">(von dir eingetragen, nicht geprüft)</span></p>` : ''}<p class="klein">Bei Schmerz Satz beenden und eine schmerzfreie Alternative wählen.</p></div>`;
  if (!b) return kopf + `<div class="anl-inhalt"><p class="leise">Für diese Übung ist die Kurzanleitung noch nicht fertig.</p>${u.md ? `<details><summary>Ausführliche Beschreibung</summary>${md(String(u.md).replace(/^\s*# .*\n/, ''))}</details>` : ''}</div>`;
  const hinweisVar = variante && !w.treffer ? `<p class="hinweis klein">Für deine Variante „${esc(variante)}“ gibt es keine eigene Anleitung. Angezeigt wird „${esc(b.name)}“ – Griff, Gerät oder Position können abweichen.</p>` : variante && wahl == null ? `<p class="leise klein">Passend zu deiner Variante „${esc(variante)}“.</p>` : '';
  const auswahl = bl.length > 1 ? `<div class="anl-wahl" role="group" aria-label="Variante wählen">${bl.map((x, i) => `<button type="button" class="filterchip" data-a="anleitung-var" data-v="${i}" aria-pressed="${i === w.i}">${esc(x.name)}</button>`).join('')}</div>` : '';
  return kopf + `<div class="anl-inhalt">${hinweisVar}${auswahl}
    ${mob && (b.dauer || b.intensitaet) ? `<div class="anl-dosis">${b.dauer ? `<div><span>Dauer</span><b>${inline(String(b.dauer))}</b></div>` : ''}${b.intensitaet ? `<div><span>Intensität</span><b>${inline(String(b.intensitaet))}</b></div>` : ''}</div>` : ''}
    <h3>Ausgangsposition</h3><p>${inline(String(b.start || ''))}</p>${b.einstellung ? `<p><b>Einstellung:</b> ${inline(String(b.einstellung))}</p>` : ''}
    <h3>Ausführung</h3><ol class="anl-schritte">${li(b.schritte)}</ol>
    ${zeile('Atmung', b.atmung)}${arr(b.wichtig).length ? `<h3>Wichtig</h3><ul>${li(b.wichtig)}</ul>` : ''}
    ${arr(b.fehler).length ? `<h3>Typische Fehler</h3><ul class="anl-fehler">${arr(b.fehler).map(f => `<li><span>${inline(String(f.f))}</span><span><b>Besser:</b> ${inline(String(f.k))}</span></li>`).join('')}</ul>` : ''}
    ${arr(b.kontrolle).length ? `<h3>So prüfst du die Bewegung</h3><ul>${li(b.kontrolle)}</ul>` : ''}
    ${mob ? `<h3>Dehngefühl oder Schmerz?</h3>${b.gefuehl ? `<p>${inline(String(b.gefuehl))}</p>` : ''}<p class="klein">${DEHN_SCHMERZ()}</p>` : ''}
    <div class="hinweis warn klein"><b>Abbrechen:</b> ${arr(b.abbruch).map(x => inline(String(x))).join(' ')}</div>
    ${u.demo_link ? `<p><a href="${esc(u.demo_link)}" target="_blank" rel="noopener">Demonstration ansehen ↗</a> <span class="leise klein">(externe Seite: ${esc(u.demo_link_quelle || 'ohne Angabe')}; öffnet sich in einem neuen Tab, nichts startet automatisch)</span></p>` : ''}
    ${u.md ? `<details class="anl-mehr"><summary>Vertiefung: Varianten, Hintergründe, Sicherheit</summary>${md(String(u.md).replace(/^\s*# .*\n/, ''))}</details>` : ''}
    ${quellen.length ? `<details class="anl-mehr"><summary>Quellen (${quellen.length})</summary><ul class="klein anl-quellen">${quellen.map(q => `<li>${q}</li>`).join('')}</ul><p class="leise klein">Kennzeichnung: Quellenlink = belegt; <i>(abgeleitet)</i> = übertragen; <i>(Vorschlag, ungeprüft)</i> = eigener Vorschlag ohne direkte Quelle.</p></details>` : ''}
    <p><button type="button" class="haupt anl-schliessen" data-a="anleitung-zu">Schließen</button></p></div>`;
}
function anleitungOeffnen(art, id, variante) {
  let dlg = document.getElementById('anleitung');
  if (!dlg) { dlg = document.createElement('dialog'); dlg.id = 'anleitung'; dlg.className = 'anl'; dlg.setAttribute('aria-labelledby', 'anl-titel'); document.body.appendChild(dlg);
    dlg.addEventListener('click', ev => { if (ev.target === dlg) dlg.close(); });   // Tippen neben das Fenster schließt
    dlg.addEventListener('close', () => { document.body.classList.remove('anl-offen'); const z = anlZustand && anlZustand.zurueck; anlZustand = null; if (z && document.contains(z)) z.focus(); }); }
  anlZustand = { art, id, variante: variante || '', wahl: null, zurueck: document.activeElement };
  dlg.innerHTML = anleitungInhalt(); document.body.classList.add('anl-offen');
  if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); }
  dlg.scrollTop = 0; const zu = dlg.querySelector('.anl-zu'); if (zu) zu.focus({ preventScroll: true });
}
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-a="anleitung"],[data-a="anleitung-zu"],[data-a="anleitung-var"]'); if (!b) return;
  ev.preventDefault(); ev.stopPropagation(); const dlg = document.getElementById('anleitung');
  if (b.dataset.a === 'anleitung') anleitungOeffnen(b.dataset.art || 'tr', b.dataset.id, b.dataset.var);
  else if (b.dataset.a === 'anleitung-zu') { if (dlg) { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); } }
  else if (anlZustand && dlg) { anlZustand.wahl = Number(b.dataset.v); const y = dlg.scrollTop; dlg.innerHTML = anleitungInhalt(); dlg.scrollTop = y; const k = dlg.querySelector(`[data-a="anleitung-var"][data-v="${b.dataset.v}"]`); if (k) k.focus({ preventScroll: true }); }
}, true);

/* ---------- Übung: Anleitung und Verlauf ---------- */
function trUebungHtml(id) {
  const u = ueb(id); const t = trDaten();
  const verlauf = t.einheiten.filter(e => e.ende && e.uebungen.some(x => x.uebung === id)).sort((a, b) => b.start.localeCompare(a.start));
  return `<p class="klein"><a class="knopf still klein" href="javascript:history.back()">${ico('zurueck', 'klein')} zurück</a></p>
  <div class="seitenkopf"><h1>${esc(u.name)}</h1>${anleitungsKnopf('tr', id, '')}</div>
  ${arr(u.anleitung).length ? `<p class="leise klein">Kurzanleitung für ${arr(u.anleitung).length > 1 ? arr(u.anleitung).length + ' Varianten' : 'die Grundform'} über „ⓘ Anleitung“; darunter die ausführliche Beschreibung.</p>` : ''}
  ${u.quelle === 'eigen' ? `<p class="leise klein">Eigene Übung${u.geraet ? ' · ' + esc(u.geraet) : ''}${u.schritt_kg ? ' · kleinster Gewichtsschritt ' + esc(zahlDE(u.schritt_kg, 2)) + ' kg' : ''}</p>${u.notiz ? `<p>${esc(u.notiz)}</p>` : ''}${u.link ? `<p><a href="${esc(u.link)}" target="_blank" rel="noopener">Eigener Demonstrationslink</a> <span class="leise klein">(von dir eingetragen, nicht geprüft)</span></p>` : ''}`
    : `${u.md ? md(String(u.md).replace(/^\s*# .*\n/, '')) : '<p class="leise">Anleitung folgt.</p>'}${u.demo_link ? `<p><a href="${esc(u.demo_link)}" target="_blank" rel="noopener">Demonstration ansehen</a> <span class="leise klein">(${esc(u.demo_link_quelle || 'externe Seite')}; geprüft: ${esc(u.demo_link_geprueft || 'nicht angegeben')})</span></p>` : ''}`}
  ${trEinheit() ? `<p class="hinweis klein">Training läuft – <a href="#/training/${trEinheit().fuehrung ? 'fuehrung' : 'einheit'}">zurück zum aktuellen Satz</a> (Eingaben und Timer bleiben erhalten).</p>` : ''}
  ${uebungVerlaufHtml(id)}`;
}
function trUebungenHtml() {
  const l = alleUebungen();
  return `<p class="klein"><a class="knopf still klein" href="#/training">${ico('zurueck', 'klein')} Training</a></p><h1>Übungen</h1>
  ${l.length ? `<ul class="eintraege">${l.map(u => `<li><span><b><a href="#/training/uebung/${esc(u.id)}">${esc(u.name)}</a></b>${u.quelle === 'eigen' ? ' <span class="chip">eigene</span>' : ''}</span><span>${anleitungsKnopf('tr', u.id, '', true)}</span></li>`).join('')}</ul>` : '<p class="leise">Die geprüfte Übungsbibliothek wird gerade aufgebaut – bis dahin kannst du eigene Übungen anlegen.</p>'}
  <form id="tr-ueb-neu" class="karte"><h3 style="margin-top:0">Eigene Übung anlegen</h3><div class="zeile">
    <label class="feld" style="flex:2 1 180px"><span>Name</span><input name="name" required></label>
    <label class="feld"><span>Gerät</span><input name="geraet" placeholder="z. B. Kurzhantel"></label>
    <label class="feld"><span>kleinster Gewichtsschritt (kg)</span><input name="schritt_kg" type="number" step="0.25" min="0" inputmode="decimal" style="width:6em"></label></div>
    <label class="feld"><span>Demonstrationslink (optional)</span><input name="link" type="url" placeholder="https://…"></label>
    <label class="feld"><span>Notiz / Ausführungshinweise</span><input name="notiz"></label>
    <button class="haupt klein" type="submit">Speichern</button></form>`;
}
function trGewichtHtml() {
  const l = [...trDaten().koerpergewicht].sort((a, b) => b.datum.localeCompare(a.datum));
  return `<p class="klein"><a class="knopf still klein" href="#/training">${ico('zurueck', 'klein')} Training</a></p><h1>Körpergewicht</h1>
  <form id="tr-kg" class="zeile"><label class="feld"><span>Datum</span><input type="date" name="datum" value="${esc(heute())}"></label><label class="feld"><span>kg</span><input type="number" name="kg" step="0.1" min="20" max="300" inputmode="decimal" required style="width:6em"></label><button class="haupt" type="submit">Eintragen</button></form>
  ${l.length ? `<ul class="eintraege">${l.map(x => `<li><span>${esc(datumDE(x.datum))}</span><span><b>${esc(zahlDE(x.kg, 1))} kg</b> <button class="still klein" data-a="tr-kg-weg" data-v="${esc(x.datum)}">löschen</button></span></li>`).join('')}</ul>` : ''}
  <p class="leise klein">Einzelne Messungen schwanken (Wasser, Mahlzeiten, Tageszeit). Aussagekräftig ist der Verlauf über Wochen, am besten unter gleichen Bedingungen gemessen. Die Ziele im Ernährungsteil ändern sich dadurch nicht automatisch.</p>`;
}

/* Aufwärmsatz-Vorschlag nach der persönlichen Regel (Prozent vom letzten Arbeitsgewicht bzw. Referenz), auf 2,5 kg gerundet */
function aufwaermVorschlag(u, l, si, feld) {
  const sch = arr(u.aufwaerm_schema); const idx = u.saetze.filter((x, xi) => x.art === 'aufwaerm' && xi <= si).length - 1; const w = sch[idx]; if (!w) return '';
  if (feld === 'wdh') return String(w.wdh);
  const basis = l && l.saetze.length ? Math.max(...l.saetze.map(s => Number(s.kg) || 0)) : Number(u.referenz_kg) || 0; if (!basis) return '';
  return String(Math.round(basis * w.pct / 100 / 2.5) * 2.5);
}
/* Wert des passenden Arbeitssatzes der letzten Einheit (für „Vorher“ und als Vorschlag im leeren Feld) */
function trVorher(u, l, si, feld) {
  if (!l || !u.saetze[si] || u.saetze[si].art !== 'arbeit') return '';
  const idx = u.saetze.filter((x, xi) => x.art === 'arbeit' && xi <= si).length - 1; const vs = l.saetze[idx];
  return vs && vs[feld] !== '' && vs[feld] != null ? String(vs[feld]) : '';
}

/* ---------- Ereignisse ---------- */
function trEinheit() { const t = trDaten(); return t.einheiten.find(e => e.id === t.aktiv); }
function trSpeichernStill(fn) { fn(D); speichern(); }   // Eingaben in der Einheit ohne Neuzeichnen (Fokus bleibt)
function trNeueSaetze(x) { const s = []; const n = x.saetze_offen && !(Number(x.saetze) > 0) ? 0 : (Number(x.saetze) || 3); for (let i = 0; i < (Number(x.aufwaerm) || 0); i++) s.push({ art: 'aufwaerm', kg: '', wdh: '', rir: '', erledigt: false }); for (let i = 0; i < n; i++) s.push({ art: 'arbeit', kg: '', wdh: '', rir: '', erledigt: false }); return s; }
const ROUTINE_FELDER = ['wdh_von', 'wdh_bis', 'pause_s', 'je_seite', 'referenz_kg', 'ziel_rir', 'variante', 'aufwaerm_schema', 'schritt_kg', 'saetze_offen', 'gewicht_hinweis', 'start_kg', 'optional'];
// Die Einheit bekommt eine Kopie der Routine – spätere Planänderungen verändern gespeicherte Trainings nicht
function trEinheitAnlegen(d, r, plan, pe, gefuehrt) {
  trDaten(); const id = uid('tre');
  d.training.einheiten.push({ id, routine: r ? r.id : null, plan, plan_eintrag: plan ? pe : null, name: r ? r.name : 'Freie Einheit', start: new Date().toISOString(), ende: null, notiz: '',
    uebungen: (r ? r.uebungen : []).map(x => Object.assign({ uebung: x.uebung }, Object.fromEntries(ROUTINE_FELDER.filter(k => x[k] != null && x[k] !== '').map(k => [k, JSON.parse(JSON.stringify(x[k]))])), x.notiz ? { plan_notiz: x.notiz } : {}, { saetze: trNeueSaetze(x), notiz: '', beschwerde: false })),
    fuehrung: gefuehrt ? { ui: 0, si: 0, phase: 'satz' } : undefined });
  d.training.aktiv = id; return id;
}
function naechsterSatzText(e, ui, si) {
  const u = e.uebungen[ui]; const rest = u.saetze.findIndex((s, i) => i > si && !s.erledigt);
  if (rest >= 0) { const s = u.saetze[rest]; return `${s.art === 'aufwaerm' ? 'Aufwärmsatz' : 'Satz W' + u.saetze.filter((x, xi) => x.art === 'arbeit' && xi <= rest).length} · ${ueb(u.uebung).name}`; }
  const n = e.uebungen.slice(ui + 1).find(x => x.saetze.some(s => !s.erledigt)); return n ? ueb(n.uebung).name : 'Einheit beenden';
}
function planKopie(d, p) {
  const map = {}; const t = d.training;
  const neu = { id: uid('plan'), name: p.name.replace(/ – historische Vorlage$/, '') + ' (meine Variante)', art: 'eigen', aktiv: false, erstellt: heute(), kopie_von: p.id, einheiten: p.einheiten.map(pe => { const r = t.routinen.find(x => x.id === pe.routine); if (!r) return null; const nr = JSON.parse(JSON.stringify(r)); nr.id = uid('rou'); delete nr.historisch; nr.name = r.name; t.routinen.push(nr); map[r.id] = nr.id; return { routine: nr.id, tag: pe.tag || '' }; }).filter(Boolean) };
  t.plaene.push(neu); return neu;
}
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a, v = b.dataset.v; if (!a.startsWith('tr-')) return;
  const ui = Number(b.dataset.u), si = Number(b.dataset.s);
  switch (a) {
    case 'tr-wahl-gruppe': trWahl.gruppe = v; { const el = $('#tr-wahl-liste'); const z = (b.closest('.tr-wahl').querySelector('[data-tr-wahl-q]') || {}).dataset.trWahlQ; if (el) el.innerHTML = uebungsWahlListe(z); b.parentElement.querySelectorAll('.filterchip').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.v === v))); } break;
    case 'tr-wahl': { const u = ueb(v); const von = String(u.wdh_bereich_vorschlag || '').match(/(\d+)\D+(\d+)/); const x = { uebung: v, aufwaerm: 1, saetze: 3, wdh_von: von ? Number(von[1]) : 8, wdh_bis: von ? Number(von[2]) : 12, pause_s: 120 };
      trWahl.offen = b.dataset.ziel;
      if (b.dataset.ziel === 'routine') { const rid = location.hash.split('/')[3]; aendere(`${u.name} hinzugefügt`, d => { d.training.routinen.find(r => r.id === rid).uebungen.push(x); }); }
      else aendere(`${u.name} hinzugefügt`, d => { trEinheit().uebungen.push({ uebung: v, wdh_von: x.wdh_von, wdh_bis: x.wdh_bis, pause_s: x.pause_s, saetze: trNeueSaetze(x), notiz: '', beschwerde: false }); });
      break; }
    case 'tr-beispiele': { const vorhanden = new Set(trDaten().routinen.map(r => r.name)); const neu = BEISPIEL_ROUTINEN.filter(([n, l]) => !vorhanden.has(n) && l.every(id => (K.uebungen || []).some(u => u.id === id)));
      if (!neu.length) { toast('Beispielroutinen sind schon da'); return; }
      aendere(`${neu.length} Beispielroutinen übernommen – bitte an dich anpassen`, d => { neu.forEach(([n, l]) => d.training.routinen.push({ id: uid('rou'), name: n, beispiel: true, uebungen: l.map(id => ({ uebung: id, aufwaerm: id === 'ueb-plank' ? 0 : 1, saetze: 3, wdh_von: id === 'ueb-plank' ? null : 8, wdh_bis: id === 'ueb-plank' ? null : 12, pause_s: 120 })) })); }); break; }
    case 'tr-routine-neu': { const id = uid('rou'); aendere(null, d => { trDaten(); d.training.routinen.push({ id, name: 'Neue Routine', uebungen: [] }); }, { neuZeichnen: false }); location.hash = '#/training/routine/' + id; break; }
    case 'tr-routine-weg': { const r = trDaten().routinen.find(x => x.id === v); if (!r || !confirm(`Routine „${r.name}“ löschen? Bisherige Einheiten bleiben erhalten.`)) return; aendere('Routine gelöscht', d => { d.training.routinen = d.training.routinen.filter(x => x.id !== v); }, { neuZeichnen: false }); location.hash = '#/training'; break; }
    case 'tr-r-add': { const sel = $('#tr-r-neu'); if (!sel || !sel.value) { toast('Bitte eine Übung wählen'); return; } const u = ueb(sel.value); const von = String(u.wdh_bereich_vorschlag || '').match(/(\d+)\D+(\d+)/);
      aendere(null, d => { d.training.routinen.find(x => x.id === v).uebungen.push({ uebung: sel.value, aufwaerm: 1, saetze: 3, wdh_von: von ? Number(von[1]) : 8, wdh_bis: von ? Number(von[2]) : 12, pause_s: 120 }); }); break; }
    case 'tr-r-weg': { const rid = location.hash.split('/')[3]; aendere(null, d => { d.training.routinen.find(x => x.id === rid).uebungen.splice(Number(v), 1); }); break; }
    case 'tr-r-hoch': { const rid = location.hash.split('/')[3]; const i = Number(v); aendere(null, d => { const l = d.training.routinen.find(x => x.id === rid).uebungen; [l[i - 1], l[i]] = [l[i], l[i - 1]]; }); break; }
    case 'tr-start': { if (trDaten().aktiv) { toast('Es läuft schon eine Einheit'); return; } const plan = b.dataset.plan || null; const pe = b.dataset.pe != null ? Number(b.dataset.pe) : null;
      // Mit Routine: zuerst die kurze Vorschau, dann geführt starten. Freie Einheit ohne Routine: Tabellenansicht.
      if (v) { trStartWahl = { rid: v, plan, pe }; location.hash = '#/training/start/' + encodeURIComponent(v); break; }
      aendere(null, d => { trEinheitAnlegen(d, null, null, null, false); }, { neuZeichnen: false }); location.hash = '#/training/einheit'; break; }
    case 'tr-start-tabelle': case 'tr-f-start': { if (trDaten().aktiv) { toast('Es läuft schon eine Einheit'); return; } const r = trDaten().routinen.find(x => x.id === v); if (!r) return; const w = trStartWahl && trStartWahl.rid === v ? trStartWahl : { plan: null, pe: null };
      aendere(null, d => { trEinheitAnlegen(d, r, w.plan, w.pe, a === 'tr-f-start'); }, { neuZeichnen: false }); trStartWahl = null;
      location.hash = a === 'tr-f-start' ? '#/training/fuehrung' : '#/training/einheit'; break; }
    case 'tr-vz-zeit': trVZeit = v; route(); break;
    case 'tr-vz-var': trVVar[b.dataset.u] = v; route(); break;
    case 'tr-tausch': { if (!v) return; aendere(`Ersetzt durch ${ueb(v).name} – Gewichte nicht übernommen`, d => { trTausche(d, ui, v); }); break; }
    case 'tr-satz-ok': { const e = trEinheit(); const u = e.uebungen[ui]; const s = u.saetze[si]; const fertig = !s.erledigt;
      if (fertig && s.art === 'arbeit' && (s.wdh === '' || s.wdh == null)) { const l0 = letzteLeistung(u.uebung, e.id, u.variante); const vw = trVorher(u, l0, si, 'wdh'); if (vw === '') { toast('Bitte zuerst die Wiederholungen eintragen'); return; } s.wdh = Number(vw); if (s.kg === '' || s.kg == null) { const vk = trVorher(u, l0, si, 'kg'); if (vk !== '') s.kg = Number(vk); } }
      aendere(null, d => { const s2 = trEinheit().uebungen[ui].saetze[si]; s2.erledigt = fertig; s2.zeit = fertig ? new Date().toISOString() : null; });
      // Pause nur nach Arbeitssätzen und nur, wenn eingeschaltet; spätere Sätze werden nie automatisch abgeschlossen
      const einst = trDaten().einstellungen;
      if (fertig && s.art === 'arbeit' && u.pause_s > 0 && einst.auto_pause !== false) { timer = timer.filter(t0 => t0.art !== 'pause'); timer.push({ id: uid('t'), art: 'pause', name: 'Pause ' + ueb(u.uebung).name, naechstes: naechsterSatzText(trEinheit(), ui, si), ton: einst.ton !== false, ende: Date.now() + u.pause_s * 1000 }); timerSpeichern(); zeichneTimer(); }
      break; }
    case 'tr-vorschlag-anlegen': { const c = trDaten().einrichtung || {}; const vs = vorschlagsOptionen(c)[Number(v)]; if (!vs) return; const tage = WOCHENTAGE.map(w => w[0]).filter(k => arr(c.tage).includes(k));
      if (!confirm(`Plan „${vs.name}“ mit ${vs.einheiten.length} Einheiten als neuen, inaktiven Plan anlegen? Bestehende Pläne und Routinen bleiben unverändert.`)) return; let pid;
      aendere('Vorschlag als neuer Plan angelegt – aktivieren kannst du ihn im Plan', d => { trDaten(); const ids = vs.einheiten.map(e => { const id = uid('rou'); d.training.routinen.push({ id, name: e.name + ' (Vorschlag)', uebungen: JSON.parse(JSON.stringify(e.uebungen)) }); return id; }); pid = uid('plan'); d.training.plaene.push({ id: pid, name: vs.name + ' – Vorschlag', art: 'eigen', hinweis: 'aus Planvorschlag erstellt ' + heute(), aktiv: !d.training.plaene.some(p => p.aktiv), erstellt: heute(), einheiten: ids.map((r, i) => ({ routine: r, tag: tage[i] || '' })) }); }, { neuZeichnen: false });
      location.hash = '#/training/plan/' + pid; break; }
    case 'tr-cardio-weg': aendere('Eintrag gelöscht', d => { d.training.cardio = arr(d.training.cardio).filter(x => x.id !== v); }); break;
    case 'tr-zeit-plan': { const m = Number(($('#tr-zeit-min') || {}).value); if (!(m > 0)) { toast('Bitte verfügbare Minuten eintragen'); return; } trZeitMin = m; trZeitVorschlag = zeitKuerzen(trEinheit(), m); const el = $('#tr-zeit-vorschau'); if (el) el.innerHTML = trZeitVorschauHtml(trEinheit()); break; }
    case 'tr-zeit-ab': trZeitVorschlag = null; route(); break;
    case 'tr-zeit-ok': { const v = trZeitVorschlag; if (!v) return; trZeitVorschlag = null;
      aendere('Einheit für heute gekürzt – Plan bleibt unverändert', d => { trEinheit().uebungen.forEach((u, i) => { const p = v.plan[i]; if (p.ganz) { u.saetze = u.saetze.filter(s => s.erledigt); u.heute_ausgelassen = 'Zeit'; return; } for (let k = 0; k < p.weg; k++) { const idx = u.saetze.map((s, j) => (!s.erledigt && s.art === 'arbeit') ? j : -1).filter(j => j >= 0).pop(); if (idx != null) u.saetze.splice(idx, 1); } if (p.weg) u.gekuerzt = p.weg; }); }); break; }
    case 'tr-v-ok': { const e = trEinheit(); const u = e.uebungen[ui]; const vs = progressionsVorschlag(u, e.id);
      aendere(vs.kg != null ? `Vorschlag übernommen: ${kgText(vs.kg)} für die offenen Arbeitssätze dieser Einheit` : 'Vorschlag übernommen', d => { const u2 = trEinheit().uebungen[ui]; if (vs.kg != null) u2.saetze.forEach(s => { if (s.art === 'arbeit' && !s.erledigt) s.kg = vs.kg; }); if (vs.pause_s) u2.pause_s = vs.pause_s; u2.vorschlag = { art: vs.art, entscheidung: 'uebernommen', kg: vs.kg ?? null, zeit: new Date().toISOString() }; }); break; }
    case 'tr-v-nein': case 'tr-v-selbst': { const e = trEinheit(); const vs = progressionsVorschlag(e.uebungen[ui], e.id); aendere(null, d => { trEinheit().uebungen[ui].vorschlag = { art: vs.art, entscheidung: a === 'tr-v-nein' ? 'beibehalten' : 'selbst', zeit: new Date().toISOString() }; }); break; }
    case 'tr-pause-start': { const e = trEinheit(); const u = e.uebungen[ui]; const einst = trDaten().einstellungen; timer = timer.filter(t0 => t0.art !== 'pause'); timer.push({ id: uid('t'), art: 'pause', name: 'Pause', naechstes: naechsterSatzText(e, ui, -1), ton: einst.ton !== false, ende: Date.now() + (u.pause_s || 120) * 1000 }); timerSpeichern(); zeichneTimer(); break; }
    case 'tr-r-runter': { const rid = location.hash.split('/')[3]; const i = Number(v); aendere(null, d => { const l = d.training.routinen.find(x => x.id === rid).uebungen; [l[i + 1], l[i]] = [l[i], l[i + 1]]; }); break; }
    case 'tr-plan-neu': { const id = uid('plan'); aendere(null, d => { trDaten(); d.training.plaene.push({ id, name: 'Neuer Plan', art: 'eigen', aktiv: !d.training.plaene.some(p => p.aktiv), erstellt: heute(), einheiten: [] }); }, { neuZeichnen: false }); location.hash = '#/training/plan/' + id; break; }
    case 'tr-plan-aktiv': aendere('Plan aktiv', d => { d.training.plaene.forEach(p => { p.aktiv = p.id === v; }); }); break;
    case 'tr-plan-kopie': { const p = trDaten().plaene.find(x => x.id === v); if (!p) return; let neu; aendere('Kopie angelegt – das Original bleibt unverändert', d => { neu = planKopie(d, p); }, { neuZeichnen: false }); if (neu) location.hash = '#/training/plan/' + neu.id; break; }
    case 'tr-plan-inaktiv': aendere('Plan deaktiviert – er bleibt gespeichert', d => { d.training.plaene.forEach(p => { if (p.id === v) p.aktiv = false; }); }); break;
    case 'tr-import-text': { const tx = ($('#tr-import-text') || {}).value || ''; (async () => { try { trImportCode = ''; trImportObj = await planCodeLesen(tx); trainingsplanImport(trImportObj); } catch (err) { trImportObj = null; toast('Nicht lesbar: ' + err.message); } route(); })(); break; }
    case 'tr-code-einfuegen': (async () => { let tx = ''; try { tx = await navigator.clipboard.readText(); } catch (err) { toast('Kein Zugriff auf die Zwischenablage – Code bitte unten von Hand einfügen'); const d = $('#tr-import details'); if (d) d.open = true; return; }
      try { trImportCode = ''; trImportObj = await planCodeLesen(tx); trainingsplanImport(trImportObj); } catch (err) { trImportObj = null; toast('In der Zwischenablage ist kein gültiger Plan-Code'); } route(); })(); break;
    case 'tr-code-kopieren': (async () => { try { await navigator.clipboard.writeText(PLANCODE_PREFIX + trImportCode); toast('Plan-Code kopiert – jetzt Fitomat vom Home-Bildschirm öffnen'); } catch (err) { toast('Kopieren nicht möglich'); } })(); break;
    case 'tr-import-ab': trImportObj = null; trImportCode = ''; route(); break;
    case 'tr-import-ok': { const obj = trImportObj; if (!obj) return; let plan; try { plan = trainingsplanImport(obj); } catch (err) { toast(err.message); return; } trImportObj = null; trImportCode = ''; zwischenstand('vor Plan-Import');
      aendere(plan.doppelt ? 'Ergänzungen übernommen' : `„${obj.plan.name}“ importiert – Rückgängig möglich`, plan.anwenden, { neuZeichnen: false });
      const p = trDaten().plaene.find(x => x.import_id === obj.import_id); location.hash = p ? '#/training/plan/' + p.id : '#/training/plaene'; route(); break; }
    case 'tr-plan-qr': { const p = trDaten().plaene.find(x => x.id === v); if (!p) return; (async () => { try { const code = await planCodeErzeugen(planAlsUebergabe(p)); const url = location.origin + location.pathname + '#/plan-import/' + code; const q = qrErzeugen(url, 'L'); const pr = qrPruefen(q, 'L'); if (!pr.syndromOk || pr.text !== url) throw new Error('Gegenprobe fehlgeschlagen');
      trQrAnzeige = { id: p.id, svg: qrSvg(q), code }; route(); setTimeout(() => { const k = $('#tr-qr'); if (k) k.scrollIntoView({ block: 'start' }); }, 100); } catch (err) { toast('QR-Code nicht möglich: ' + err.message); } })(); break; }
    case 'tr-qr-zu': trQrAnzeige = null; route(); break;
    case 'tr-qr-kopieren': (async () => { try { await navigator.clipboard.writeText(PLANCODE_PREFIX + trQrAnzeige.code); toast('Plan-Code kopiert'); } catch (err) { toast('Kopieren nicht möglich'); } })(); break;
    case 'tr-plan-archiv': aendere('Plan archiviert – unter „Archivierte Pläne“', d => { const p = d.training.plaene.find(x => x.id === v); if (p) { p.archiviert = true; p.aktiv = false; } }); break;
    case 'tr-plan-zurueck': aendere('Plan wieder in „Meine Pläne“', d => { const p = d.training.plaene.find(x => x.id === v); if (p) delete p.archiviert; }); break;
    case 'tr-plan-weg': { const p = trDaten().plaene.find(x => x.id === v); if (!p) return; aendere('Plan gelöscht – Routinen und Trainings bleiben; Rückgängig möglich', d => { d.training.plaene = d.training.plaene.filter(x => x.id !== v); }, { neuZeichnen: false }); location.hash = '#/training'; break; }
    case 'tr-pe-hoch': { const pid = location.hash.split('/')[3]; const i = Number(v); aendere(null, d => { const l = d.training.plaene.find(x => x.id === pid).einheiten; [l[i - 1], l[i]] = [l[i], l[i - 1]]; }); break; }
    case 'tr-pe-weg': { const pid = location.hash.split('/')[3]; aendere(null, d => { d.training.plaene.find(x => x.id === pid).einheiten.splice(Number(v), 1); }); break; }
    case 'tr-pe-add': { const sel = $('#tr-pe-neu'); if (!sel || !sel.value) { toast('Bitte eine Routine wählen'); return; } aendere(null, d => { d.training.plaene.find(x => x.id === v).einheiten.push({ routine: sel.value, tag: '' }); }); break; }
    case 'tr-pe-neu': { const rid = uid('rou'); aendere(null, d => { d.training.routinen.push({ id: rid, name: 'Neue Einheit', uebungen: [] }); d.training.plaene.find(x => x.id === v).einheiten.push({ routine: rid, tag: '' }); }, { neuZeichnen: false }); location.hash = '#/training/routine/' + rid; break; }
    case 'tr-satz-add': aendere(null, d => { const l = trEinheit().uebungen[ui].saetze; const vor = l[l.length - 1]; l.push({ art: 'arbeit', kg: vor ? vor.kg : '', wdh: '', rir: '', erledigt: false }); }); break;
    case 'tr-satz-weg': aendere(null, d => { trEinheit().uebungen[ui].saetze.pop(); }); break;
    case 'tr-satz-art': aendere(null, d => { const s = trEinheit().uebungen[ui].saetze[si]; s.art = s.art === 'aufwaerm' ? 'arbeit' : 'aufwaerm'; }); break;
    case 'tr-e-add': { const sel = $('#tr-e-neu'); if (!sel || !sel.value) { toast('Bitte eine Übung wählen'); return; } aendere(null, d => { trEinheit().uebungen.push({ uebung: sel.value, pause_s: 120, saetze: trNeueSaetze({ aufwaerm: 1, saetze: 3 }), notiz: '', beschwerde: false }); }); break; }
    case 'tr-ende': { const e = trEinheit(); const offen = e.uebungen.reduce((s, u) => s + u.saetze.filter(x => !x.erledigt && x.art === 'arbeit').length, 0);
      if (offen && !confirm(`${offen} Arbeitssätze sind nicht als fertig markiert. Trotzdem beenden? (Sie werden nicht gezählt.)`)) return;
      aendere('Einheit gespeichert', d => { trEinheit().ende = new Date().toISOString(); d.training.aktiv = null; }, { neuZeichnen: false }); location.hash = '#/training'; break; }
    case 'tr-verwerfen': aendere('Training abgebrochen – nichts gespeichert; Rückgängig möglich', d => { d.training.einheiten = d.training.einheiten.filter(x => x.id !== d.training.aktiv); d.training.aktiv = null; }, { neuZeichnen: false }); location.hash = '#/training'; break;
    case 'tr-kg-weg': aendere('Eintrag gelöscht', d => { d.training.koerpergewicht = d.training.koerpergewicht.filter(x => x.datum !== v); }); break;
  }
});
document.addEventListener('input', ev => {
  const el = ev.target; const d = el.dataset || {};
  if (d.trWahlQ) { trWahl.q = el.value; const li = $('#tr-wahl-liste'); if (li) li.innerHTML = uebungsWahlListe(d.trWahlQ); return; }
  if (d.trSatz) trSpeichernStill(() => { const s = trEinheit().uebungen[Number(d.u)].saetze[Number(d.s)]; s[d.trSatz] = el.value === '' ? '' : (d.trSatz === 'rir' ? el.value : Number(el.value)); });
  else if (d.trUFeld) trSpeichernStill(() => { trEinheit().uebungen[Number(d.u)][d.trUFeld] = el.value; });
  else if (d.trENotiz) trSpeichernStill(() => { trEinheit().notiz = el.value; });
  else if (d.trRoutineName) trSpeichernStill(() => { trDaten().routinen.find(x => x.id === d.trRoutineName).name = el.value || 'Routine'; });
  else if (d.trRFeld) { const rid = location.hash.split('/')[3]; trSpeichernStill(() => { const x = trDaten().routinen.find(r => r.id === rid).uebungen[Number(d.i)]; x[d.trRFeld] = el.value === '' ? null : Number(String(el.value).replace(',', '.')); if (d.trRFeld === 'saetze' && x.saetze > 0) delete x.saetze_offen; }); }
  else if (d.trRText) { const rid = location.hash.split('/')[3]; trSpeichernStill(() => { trDaten().routinen.find(r => r.id === rid).uebungen[Number(d.i)][d.trRText] = el.value.trim() || null; }); }
  else if (d.trPlanName) trSpeichernStill(() => { trDaten().plaene.find(x => x.id === d.trPlanName).name = el.value || 'Plan'; });
});
document.addEventListener('change', ev => {
  const el = ev.target; const d = el.dataset || {};
  if (d.trRCheck) { const rid = location.hash.split('/')[3]; trSpeichernStill(() => { trDaten().routinen.find(r => r.id === rid).uebungen[Number(d.i)][d.trRCheck] = el.checked; }); return; }
  if (d.trPeTag != null) { const pid = location.hash.split('/')[3]; trSpeichernStill(() => { trDaten().plaene.find(x => x.id === pid).einheiten[Number(d.trPeTag)].tag = el.value; }); return; }
  if (d.trEinst) { trSpeichernStill(() => { trDaten().einstellungen[d.trEinst] = el.checked; }); return; }
  if (d.trCheck) { aendere(null, () => { const e = trEinheit(); e.check = Object.assign({}, e.check || {}, { [d.trCheck]: el.value }); }); return; }
  if (d.trUQual != null) { trSpeichernStill(() => { trEinheit().uebungen[Number(d.trUQual)].qualitaet = el.value; }); return; }
  if (d.trUBeschwerde != null) aendere(null, () => { trEinheit().uebungen[Number(d.trUBeschwerde)].beschwerde = el.checked; });
  else if (d.trTausch != null && el.value) aendere('Übung getauscht – Gewichte nicht übernommen', dd => { trTausche(dd, Number(d.trTausch), el.value); }, { undo: true });
});
document.addEventListener('submit', ev => {
  const f = ev.target;
  if (f.id === 'tr-ueb-neu') { ev.preventDefault(); const name = f.name.value.trim(); if (!name) return;
    aendere('Eigene Übung gespeichert', d => { trDaten(); d.training.uebungen.push({ id: uid('uebe'), name, geraet: f.geraet.value.trim() || null, schritt_kg: f.schritt_kg.value === '' ? null : Number(f.schritt_kg.value), link: /^https:\/\//.test(f.link.value) ? f.link.value : null, notiz: f.notiz.value.trim() || null }); }); }
  if (f.id === 'tr-einr') { ev.preventDefault(); const werte = n => [...f.querySelectorAll(`input[name="${n}"]:checked`)].map(x => x.value);
    aendere('Einrichtung gespeichert', d => { trDaten(); d.training.einrichtung = { ziel: f.ziel.value, erfahrung: f.erfahrung.value, minuten: f.minuten.value === '' ? '' : Number(f.minuten.value), tage: werte('tage'), ort: f.ort.value, geraete: werte('geraete'), schwerpunkte: werte('schwerpunkte'), unerwuenscht: [...f.unerwuenscht.selectedOptions].map(o => o.value), cardio: f.cardio.value, cardio_art: f.cardio_art.value.trim(), cardio_min: f.cardio_min.value === '' ? '' : Number(f.cardio_min.value), einschraenkungen: f.einschraenkungen.value.trim(), geaendert: heute() }; }); return; }
  if (f.id === 'tr-cardio') { ev.preventDefault(); const m = Number(f.minuten.value); if (!(m > 0)) return;
    aendere('Cardio eingetragen', d => { trDaten(); (d.training.cardio = d.training.cardio || []).push({ id: uid('car'), datum: f.datum.value || heute(), art: f.art.value.trim().slice(0, 40), minuten: m, intensitaet: f.intensitaet.value }); }); return; }
  if (f.id === 'tr-kg') { ev.preventDefault(); const kg = Number(String(f.kg.value).replace(',', '.')); if (!(kg > 20)) return;
    aendere('Körpergewicht eingetragen', d => { trDaten(); d.training.koerpergewicht = d.training.koerpergewicht.filter(x => x.datum !== f.datum.value); d.training.koerpergewicht.push({ datum: f.datum.value || heute(), kg }); }); }
});
