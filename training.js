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
const satzText = s => `${s.wdh || '?'} × ${kgText(s.kg)}${s.rir !== '' && s.rir != null ? ' · RIR ' + s.rir : ''}`;

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
  if (teil === 'routine') return trRoutineHtml(id);
  if (teil === 'uebung') return trUebungHtml(id);
  if (teil === 'uebungen') return trUebungenHtml();
  if (teil === 'gewicht') return trGewichtHtml();
  if (teil === 'plan') return trPlanHtml(id);
  if (teil === 'einrichtung') return trEinrichtungHtml();
  if (teil === 'cardio') return trCardioHtml();
  const akt = t.aktiv && t.einheiten.find(e => e.id === t.aktiv);
  const fertig = t.einheiten.filter(e => e.ende).sort((a, b) => b.start.localeCompare(a.start)).slice(0, 8);
  const kg = [...t.koerpergewicht].sort((a, b) => b.datum.localeCompare(a.datum))[0];
  const ap = t.plaene.find(p => p.aktiv) || null;
  const rn = rid => (t.routinen.find(r => r.id === rid) || { name: 'Einheit fehlt' }).name;
  const naechste = ap ? planNaechste(ap) : null; const heutig = ap ? ap.einheiten.findIndex(x => x.tag === heuteTag()) : -1;
  const startKnopf = (i, haupt) => { const pe = ap.einheiten[i]; return `<button class="${haupt ? 'haupt ' : ''}klein" data-a="tr-start" data-v="${esc(pe.routine)}" data-plan="${esc(ap.id)}" data-pe="${i}" ${akt ? 'disabled' : ''}>Starten</button>`; };
  return `<div class="seitenkopf"><h1>Training</h1><a class="knopf klein" href="#/training/uebungen">Übungen</a></div>
  ${akt ? `<div class="hinweis"><b>Einheit läuft</b> seit ${esc(new Date(akt.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }))} · ${esc(akt.name)} <a class="knopf haupt klein" href="#/training/einheit">Fortsetzen</a></div>` : ''}
  <h2>Plan</h2>
  ${ap ? `<div class="karte"><div class="zeile" style="justify-content:space-between;align-items:baseline"><b><a href="#/training/plan/${esc(ap.id)}">${esc(ap.name)}</a></b><span class="leise klein">${esc(PLAN_ART[ap.art] || '')}</span></div>
      ${heutig >= 0 ? `<p style="margin:.4em 0">Heute laut Wochentag: <b>${esc(rn(ap.einheiten[heutig].routine))}</b> ${startKnopf(heutig, true)}</p>` : ''}
      ${naechste != null && naechste !== heutig ? `<p style="margin:.4em 0">Nächste in der Reihenfolge: <b>${esc(rn(ap.einheiten[naechste].routine))}</b> ${startKnopf(naechste, heutig < 0)}</p>` : ''}
      <ul class="eintraege">${ap.einheiten.map((pe, i) => `<li><span>${pe.tag ? `<span class="chip">${esc((WOCHENTAGE.find(w => w[0] === pe.tag) || [])[1] || '')}</span> ` : ''}<a href="#/training/routine/${esc(pe.routine)}">${esc(rn(pe.routine))}</a></span><span>${startKnopf(i, false)}</span></li>`).join('')}</ul>
      <p class="leise klein">Verpasste Einheiten zählen nicht als erledigt – du startest einfach die passende als Nächstes.</p></div>`
    : `<p class="leise">Kein Plan aktiv. Ein Plan fasst mehrere Einheiten zusammen – mit Wochentagen oder flexibel in Reihenfolge.</p>`}
  ${t.plaene.filter(p => !p.aktiv).length ? `<p class="klein">Weitere Pläne: ${t.plaene.filter(p => !p.aktiv).map(p => `<a href="#/training/plan/${esc(p.id)}">${esc(p.name)}</a>`).join(' · ')}</p>` : ''}
  <div class="knopfreihe"><button data-a="tr-plan-neu">${ico('plus', 'klein')} Neuer Plan</button><a class="knopf still" href="#/training/einrichtung">Einrichtung und Planvorschläge</a><a class="knopf still" href="#/training/cardio">Cardio</a></div>
  <details class="karte klein"><summary><b>Pausentimer</b></summary>
    <label><input type="checkbox" data-tr-einst="auto_pause" ${t.einstellungen.auto_pause !== false ? 'checked' : ''}> Pause nach jedem abgeschlossenen Arbeitssatz automatisch starten</label>
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
  <p class="leise klein">Körpergewicht wird getrennt von Trainingsgewichten gespeichert. Gewichtsvorschläge für Übungen gibt es noch nicht – sie folgen erst nach fachlicher Recherche und mit genügend eigenen Daten.</p>`;
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
      <span><button class="klein still" data-a="tr-r-hoch" data-v="${i}" ${i ? '' : 'disabled'} aria-label="nach oben">↑</button><button class="klein still" data-a="tr-r-runter" data-v="${i}" ${i < r.uebungen.length - 1 ? '' : 'disabled'} aria-label="nach unten">↓</button><button class="klein still" data-a="tr-r-weg" data-v="${i}">entfernen</button></span></div>
    <div class="zeile">${[['aufwaerm', 'Aufwärmsätze', 0, 5, 1], ['saetze', 'Arbeitssätze', 1, 10, 1], ['wdh_von', 'Wdh. von', 1, 50, 1], ['wdh_bis', 'Wdh. bis', 1, 50, 1], ['pause_s', 'Pause (Sek.)', 0, 600, 15], ['referenz_kg', 'Referenz kg', 0, 500, 0.25], ['schritt_kg', 'Gewichtsschritt kg', 0, 50, 0.25]].map(([k, n, mi, ma, st]) => `<label class="feld"><span>${n}</span><input type="number" inputmode="decimal" min="${mi}" max="${ma}" step="${st}" value="${esc(x[k] ?? '')}" placeholder="${k === 'saetze' && x.saetze_offen ? 'offen' : ''}" data-tr-r-feld="${k}" data-i="${i}" style="width:5.5em"></label>`).join('')}
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
function zielErreicht(h, bis) {
  if (!h.saetze.length || h.saetze.length < h.geplant) return false;
  return h.saetze.every(s => (Number(s.kg) || 0) === h.top && Number(s.wdh) >= bis && (s.rir === '' || s.rir == null || s.rir === '5+' || Number(s.rir) >= 1));
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
  if (pause > 14) return { art: 'wiedereinstieg', titel: `Seit ${pause} Tagen nicht trainiert`, begruendung: 'Erste Einheit als Standortbestimmung: Gewicht selbst wählen, die alte Last nicht automatisch übernehmen. Kraft kommt nach kurzen Pausen meist rasch zurück.', daten: 'Zuletzt ' + sitzungText(l), unsicherheit: 'Für die Lastreduktion beim Wiedereinstieg gibt es keine belegten Prozentwerte.' };
  if (l.beschwerde) return { art: 'beschwerde', titel: 'Nicht steigern – zuletzt Beschwerden notiert', begruendung: 'Last halten oder senken bzw. eine schmerzfreie Alternative wählen. Bei anhaltenden Beschwerden ärztlich oder physiotherapeutisch abklären lassen.', daten: sitzungText(l), unsicherheit: '' };
  if (l.qualitaet === 'unsauber') return { art: 'halten', titel: 'Gewicht halten', begruendung: 'Ausführung zuletzt als unsauber markiert – erst die Technik festigen.', daten: sitzungText(l), unsicherheit: '' };
  if (!von) return { art: 'manuell', titel: 'Kein Wiederholungsbereich hinterlegt', begruendung: 'In der Routine „Wdh. von/bis“ eintragen, dann gibt es Vorschläge.', daten: sitzungText(l), unsicherheit: '' };
  const rirUnbekannt = l.saetze.every(s => s.rir === '' || s.rir == null);
  const unsicher = rirUnbekannt ? 'RIR nicht eingetragen – die Anstrengung ist unbekannt; der Vorschlag stützt sich nur auf Gewicht und Wiederholungen.' : 'RIR ist eine grobe Selbsteinschätzung (im Mittel etwa ±1 Wiederholung).';
  if (hist.length >= 2 && zielErreicht(hist[0], bis) && zielErreicht(hist[1], bis) && hist[0].top === hist[1].top && hist[0].top > 0) {
    const neu = schritt ? hist[0].top + schritt : null;
    return { art: 'steigern', kg: neu, titel: neu ? `Gewicht auf ${kgText(neu)} erhöhen` : 'Kleinste verfügbare Gewichtsstufe erhöhen', begruendung: `In den letzten 2 vergleichbaren Einheiten alle Arbeitssätze mit ${bis} Wdh. bei ${kgText(hist[0].top)} geschafft. Danach wieder Wiederholungen aufbauen; Sätze und Anstrengung bleiben gleich.`, daten: hist.slice(0, 2).map(sitzungText).join(' · '), unsicherheit: unsicher + (eigenerSchritt ? '' : schritt ? ` Schritt ${zahlDE(schritt, 2)} kg ist ein allgemeiner Vorschlag aus der Übungsbibliothek – an deinem Gerät kann er anders sein (Routine: „Gewichtsschritt“).` : ' Kleinster Gewichtsschritt nicht hinterlegt (Routine: „Gewichtsschritt“).') + (hist[0].vorschlag && hist[0].vorschlag.art === 'steigern' && hist[0].vorschlag.entscheidung === 'beibehalten' ? ' Beim letzten Mal hast du „Beibehalten“ gewählt.' : '') };
  }
  const wdhErreicht = l.saetze.length >= l.geplant && l.saetze.length && l.saetze.every(s => Number(s.wdh) >= bis && (Number(s.kg) || 0) === l.top);
  if (wdhErreicht && !zielErreicht(l, bis)) return { art: 'halten', titel: 'Gewicht halten', begruendung: `Alle Sätze mit ${bis} Wdh., aber mindestens einer mit RIR 0 (am Limit). Weniger RIR ist kein Ziel an sich – erst wenn das Ziel mit etwas Reserve gelingt, steigern.`, daten: sitzungText(l), unsicherheit: unsicher };
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
function uebVerfuegbar(u, ger) { const g = arr(u.geraet).filter(x => x !== 'bank' && x !== 'rack'); const echt = g.filter(x => x !== 'koerpergewicht'); return !echt.length || echt.some(x => ger.includes(x)); }
function slotUebung(slot, ger, nein, schon, versatz) {
  const iso = { 'iso:arme': ['bizeps', 'trizeps'], 'iso:bizeps': ['bizeps'], 'iso:trizeps': ['trizeps'], 'iso:schultern': ['seitliche_schulter', 'hintere_schulter'] }[slot];
  const kand = (K.uebungen || []).filter(u => uebVerfuegbar(u, ger) && !nein.includes(u.id) && !schon.includes(u.id) && (iso ? u.bewegungsmuster === 'isolation' && arr(u.muskeln_haupt).some(m => iso.includes(m)) : u.bewegungsmuster === slot));
  return kand.length ? kand[versatz % kand.length] : null;
}
function planVorschlag(cfg, splitKey, n) {
  const sp = SPLITS[splitKey]; const ger = cfg.geraete && cfg.geraete.length ? cfg.geraete : ['langhantel', 'kurzhantel', 'kabel', 'maschine', 'klimmzugstange', 'koerpergewicht'];
  const nein = arr(cfg.unerwuenscht); const prio = arr(cfg.schwerpunkte); const basis = cfg.erfahrung === 'einsteiger' ? 2 : 3;
  const tage = []; for (let i = 0; i < n; i++) tage.push(sp.tage[i % sp.tage.length]);
  const zaehl = {}; const einheiten = tage.map((tn, ti) => { const schon = [];
    const ue = sp.slots[tn].map((slot, si) => { const u = slotUebung(slot, ger, nein, schon, Math.floor(ti / sp.tage.length) + si); if (!u) return null; schon.push(u.id);
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
  return { key: splitKey, name: sp.name + (n > sp.tage.length ? ` (${n}×/Woche)` : ''), plus: sp.plus, minus: sp.minus, einheiten, wochensaetze: zaehl, fehlend: einheiten.some(e => e.uebungen.length < sp.slots[e.name].length) };
}
let trVorschlagWahl = null;
function trEinrichtungHtml() {
  const t = trDaten(); const c = t.einrichtung || {};
  const chk = (name, wert, an, text) => `<label class="wahl-chip"><input type="checkbox" name="${name}" value="${wert}" ${an ? 'checked' : ''}> ${text}</label>`;
  const tage = arr(c.tage); const n = tage.length || Number(c.tage_anzahl) || 0;
  const opts = n ? splitOptionen(n).map(([k, m]) => planVorschlag(c, k, m)) : [];
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
  ${n ? `<h2>Vorschläge für ${n} Tage</h2><p class="leise klein">Bei gleichem Wochenvolumen sind die Aufteilungen für Muskelaufbau etwa gleichwertig – entscheidend sind Tage, Zeit und was du durchhältst. Übungen nur aus der geprüften Bibliothek (${(K.uebungen || []).length} Übungen); eigene Übungen kannst du danach ergänzen.</p>
    ${opts.map((o, oi) => `<section class="karte"><h3 style="margin-top:0">${esc(o.name)}</h3><p class="klein">+ ${esc(o.plus)}<br>− ${esc(o.minus)}</p>
      ${o.einheiten.map(e => `<details class="klein"><summary><b>${esc(e.name)}</b> · ca. ${e.minuten} Min. · ${e.uebungen.length} Übungen</summary><ul>${e.uebungen.map(x => `<li>${esc(ueb(x.uebung).name)}: ${x.saetze} × ${x.wdh_von ? x.wdh_von + '–' + x.wdh_bis : 'Zeit'} · Pause ${x.pause_s} s</li>`).join('')}</ul>${e.gekuerzt.length ? `<p class="leise">Wegen der Zeitvorgabe: ${esc(e.gekuerzt.join(', '))}</p>` : ''}</details>`).join('')}
      <p class="leise klein">Arbeitssätze pro Woche (nur Hauptmuskeln): ${MUSKEL_GRUPPEN.filter(([k]) => o.wochensaetze[k]).map(([k, n2]) => `${n2} ${o.wochensaetze[k]}`).join(' · ') || '–'}${o.fehlend ? ' · Für einige Plätze fehlt mit deinen Geräten eine passende Übung.' : ''}</p>
      ${arr(c.schwerpunkte).length ? `<p class="leise klein">Schwerpunkt: ${o.einheiten.reduce((s, e) => s + e.bonusSaetze, 0)} Zusatzsätze pro Woche (je ca. 2–4 Min.)${o.einheiten.some(e => e.bonusWeg) ? `; ${o.einheiten.reduce((s, e) => s + e.bonusWeg, 0)} weitere passten nicht in die Zeitvorgabe` : ''}. Andere Gruppen behalten ihre Grundsätze.</p>` : ''}
      <button class="klein" data-a="tr-vorschlag-anlegen" data-v="${oi}">Als neuen Plan anlegen (inaktiv)</button></section>`).join('')}
    ${c.cardio === 'ja' ? `<p class="hinweis klein"><b>Cardio:</b> getrennt protokolliert. Als Ableitung aus Studien: Radfahren stört Kraftzuwächse weniger als Laufen; an Krafttagen am besten nach dem Krafttraining oder mit einigen Stunden Abstand. Trainingskalorien werden nicht automatisch zum Ernährungsbudget addiert – Schätzungen von Uhren und Formeln weichen oft über 20 % ab.</p>` : ''}` : '<p class="leise">Trainingstage wählen, dann erscheinen Vorschläge.</p>'}`;
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
function tauschHtml(u, ui, info) {
  const alle = alleUebungen().filter(x => x.id !== u.uebung); const gr = uebGruppen(info);
  const alt = arr(info.alternativen).map(a => alle.find(x => x.id === a)).filter(Boolean);
  const muster = info.bewegungsmuster && info.bewegungsmuster !== 'isolation' ? alle.filter(x => x.bewegungsmuster === info.bewegungsmuster && !alt.includes(x)) : [];
  const gruppe = alle.filter(x => !alt.includes(x) && !muster.includes(x) && uebGruppen(x).some(g => gr.includes(g)));
  const opt = (l, n) => l.length ? `<optgroup label="${n}">${l.map(x => `<option value="${esc(x.id)}">${esc(x.name)}${x.quelle === 'eigen' ? ' (eigene)' : ''}</option>`).join('')}</optgroup>` : '';
  return `<div class="zeile"><select data-tr-tausch="${ui}"><option value="">– Ersatz wählen –</option>${opt(alt, 'Hinterlegte Alternativen')}${opt(muster, 'Gleiches Bewegungsmuster')}${opt(gruppe, 'Gleiche Muskelgruppe')}${opt(alle.filter(x => !alt.includes(x) && !muster.includes(x) && !gruppe.includes(x)), 'Alle übrigen')}</select></div>
    <p class="leise klein">Gewichte werden nicht übertragen – jedes Gerät und jede Übung hat einen eigenen Verlauf. Nur die offenen Sätze wechseln die Übung.</p>`;
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
function trainingsplanImport(obj) {
  if (!obj.plan || !Array.isArray(obj.routinen)) throw new Error('Trainingsplan-Datei unvollständig.');
  const schon = (trDaten().plaene || []).some(p => p.import_id && p.import_id === obj.import_id);
  if (schon) return { text: `„${obj.plan.name}“ wurde bereits importiert – es wird nichts doppelt angelegt.`, anwenden: () => {} };
  const neueUeb = arr(obj.uebungen).filter(u => !alleUebungen().some(x => x.id === u.id));
  return { text: `Trainingsplan „${obj.plan.name}“: ${obj.routinen.length} Einheiten, ${obj.routinen.reduce((s, r) => s + r.uebungen.length, 0)} Übungseinträge, ${neueUeb.length} neue eigene Übungen. Vorhandene Routinen, Pläne und Trainings bleiben unverändert. Referenzgewichte werden als Referenz gespeichert, nicht als Leistung.`,
    anwenden: d => { const t = d.training || (d.training = { uebungen: [], routinen: [], einheiten: [], aktiv: null, koerpergewicht: [] }); t.plaene = t.plaene || []; t.einstellungen = t.einstellungen || { auto_pause: true, ton: true };
      neueUeb.forEach(u => t.uebungen.push(JSON.parse(JSON.stringify(u))));
      const ids = {}; obj.routinen.forEach(r => { const id = uid('rou'); ids[r.key] = id; t.routinen.push({ id, name: r.name, historisch: obj.plan.art === 'historisch', uebungen: JSON.parse(JSON.stringify(r.uebungen)) }); });
      t.plaene.push({ id: uid('plan'), import_id: obj.import_id, name: obj.plan.name, art: obj.plan.art || 'eigen', hinweis: obj.plan.hinweis || '', aktiv: !t.plaene.some(p => p.aktiv), erstellt: heute(), einheiten: arr(obj.einheiten).filter(pe => ids[pe.routine]).map(pe => ({ routine: ids[pe.routine], tag: pe.tag || '' })) });
      if (obj.einstellungen && obj.einstellungen.aufwaermen_text) t.einstellungen.aufwaermen_text = obj.einstellungen.aufwaermen_text; } };
}

/* ---------- Plan bearbeiten ---------- */
function trPlanHtml(id) {
  const t = trDaten(); const p = t.plaene.find(x => x.id === id); if (!p) return '<p class="leer">Plan nicht gefunden.</p>';
  const rn = rid => (t.routinen.find(r => r.id === rid) || { name: 'Einheit fehlt' }).name;
  return `<p class="klein"><a class="knopf still klein" href="#/training">${ico('zurueck', 'klein')} Training</a></p>
  <label class="feld"><span>Name des Plans</span><input data-tr-plan-name="${esc(p.id)}" value="${esc(p.name)}"></label>
  <p class="leise klein">${esc(PLAN_ART[p.art] || '')}${p.aktiv ? ' · aktiv' : ''}${p.hinweis ? ' · ' + esc(p.hinweis) : ''}</p>
  <h2>Einheiten</h2>
  ${p.einheiten.length ? `<ol class="tr-liste">${p.einheiten.map((pe, i) => `<li class="karte"><div class="zeile" style="justify-content:space-between;align-items:center"><b><a href="#/training/routine/${esc(pe.routine)}">${esc(rn(pe.routine))}</a></b>
      <span><button class="klein still" data-a="tr-pe-hoch" data-v="${i}" ${i ? '' : 'disabled'} aria-label="nach oben">↑</button><button class="klein still" data-a="tr-pe-weg" data-v="${i}">entfernen</button></span></div>
      <label class="feld"><span>Wochentag (optional)</span><select data-tr-pe-tag="${i}"><option value="">flexibel</option>${WOCHENTAGE.map(([k, n]) => `<option value="${k}" ${pe.tag === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label></li>`).join('')}</ol>` : '<p class="leise">Noch keine Einheit im Plan.</p>'}
  <div class="zeile"><label class="feld" style="flex:1 1 200px"><span>Einheit hinzufügen</span><select id="tr-pe-neu"><option value="">– Routine wählen –</option>${t.routinen.map(r => `<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('')}</select></label><button data-a="tr-pe-add" data-v="${esc(p.id)}">hinzufügen</button><button class="still" data-a="tr-pe-neu" data-v="${esc(p.id)}">neue Einheit anlegen</button></div>
  <div class="knopfreihe">${p.aktiv ? '' : `<button class="haupt" data-a="tr-plan-aktiv" data-v="${esc(p.id)}">Als aktiven Plan verwenden</button>`}<button data-a="tr-plan-kopie" data-v="${esc(p.id)}">Als eigene Variante kopieren</button><button class="still" data-a="tr-plan-weg" data-v="${esc(p.id)}">Plan löschen</button></div>
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
    <details class="karte klein"${e.check ? '' : ''}><summary><b>Kurz-Check</b> <span class="leise">(freiwillig)</span>${e.check && (e.check.beschwerden === 'ja' || e.check.kater === 'stark' || e.check.muede === 'erhoeht') ? ' <span class="chip warn">heute vorsichtiger</span>' : ''}</summary>
      <div class="zeile">${[['muede', 'Müdigkeit', [['', '–'], ['normal', 'normal'], ['erhoeht', 'ungewöhnlich hoch']]], ['kater', 'Muskelkater', [['', '–'], ['nein', 'keiner'], ['leicht', 'leicht'], ['stark', 'stark']]], ['beschwerden', 'Beschwerden', [['', '–'], ['nein', 'keine'], ['ja', 'ja']]]].map(([k, n, o]) => `<label class="feld"><span>${n}</span><select data-tr-check="${k}">${o.map(([v, t]) => `<option value="${v}" ${((e.check || {})[k] || '') === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label>`).join('')}</div>
      <p class="leise klein">Nur ein Merker für dich – daraus wird keine Erholungs-„Diagnose“ berechnet. Bei Beschwerden oder starkem Muskelkater schlägt die App heute keine Steigerung vor.</p></details>
    <details class="karte klein"><summary><b>Heute weniger Zeit?</b></summary>
      <div class="zeile"><label class="feld"><span>Verfügbare Minuten ab jetzt</span><input type="number" inputmode="numeric" min="5" max="240" step="5" id="tr-zeit-min" value="${esc(trZeitMin || '')}" style="width:6em"></label><button class="klein" data-a="tr-zeit-plan">Vorschlag zeigen</button></div>
      <div id="tr-zeit-vorschau">${trZeitVorschlag ? trZeitVorschauHtml(e) : `<p class="leise klein">Geschätzt verbleibend: ca. ${Math.round(einheitRestSek(e) / 60)} Min. (je Satz ca. 45 s plus eingestellte Pause).</p>`}</div></details>
  </div>
  ${e.uebungen.map((u, ui) => { const info = ueb(u.uebung); const l = letzteLeistung(u.uebung, e.id, u.variante);
    return `<section class="karte tr-uebung"><div class="zeile" style="justify-content:space-between;align-items:baseline"><h2 style="margin:0">${esc(info.name)}</h2><a class="klein" href="#/training/uebung/${esc(u.uebung)}">Anleitung</a></div>
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

/* ---------- Übung: Anleitung und Verlauf ---------- */
function trUebungHtml(id) {
  const u = ueb(id); const t = trDaten();
  const verlauf = t.einheiten.filter(e => e.ende && e.uebungen.some(x => x.uebung === id)).sort((a, b) => b.start.localeCompare(a.start));
  return `<p class="klein"><a class="knopf still klein" href="javascript:history.back()">${ico('zurueck', 'klein')} zurück</a></p>
  <h1>${esc(u.name)}</h1>
  ${u.quelle === 'eigen' ? `<p class="leise klein">Eigene Übung${u.geraet ? ' · ' + esc(u.geraet) : ''}${u.schritt_kg ? ' · kleinster Gewichtsschritt ' + esc(zahlDE(u.schritt_kg, 2)) + ' kg' : ''}</p>${u.notiz ? `<p>${esc(u.notiz)}</p>` : ''}${u.link ? `<p><a href="${esc(u.link)}" target="_blank" rel="noopener">Eigener Demonstrationslink</a> <span class="leise klein">(von dir eingetragen, nicht geprüft)</span></p>` : ''}`
    : `${u.md ? md(String(u.md).replace(/^\s*# .*\n/, '')) : '<p class="leise">Anleitung folgt.</p>'}${u.demo_link ? `<p><a href="${esc(u.demo_link)}" target="_blank" rel="noopener">Demonstration ansehen</a> <span class="leise klein">(${esc(u.demo_link_quelle || 'externe Seite')}; geprüft: ${esc(u.demo_link_geprueft || 'nicht angegeben')})</span></p>` : ''}`}
  <h2>Verlauf</h2>${verlaufSvg(verlauf.slice(0, 12).reverse().map(e => ({ kg: Math.max(0, ...e.uebungen.filter(x => x.uebung === id).flatMap(x => x.saetze.filter(y => y.art === 'arbeit' && y.erledigt).map(y => Number(y.kg) || 0))) })))}
  ${verlauf.length ? `<div class="tabelle-wrap"><table class="mikro"><thead><tr><th>Datum</th><th>Arbeitssätze</th><th>bester Satz</th></tr></thead><tbody>${verlauf.map(e => { const s = e.uebungen.filter(x => x.uebung === id).flatMap(x => x.saetze.filter(y => y.art === 'arbeit' && y.erledigt)); const best = [...s].sort((a, b) => (Number(b.kg) || 0) - (Number(a.kg) || 0) || (Number(b.wdh) || 0) - (Number(a.wdh) || 0))[0];
    return `<tr><td>${esc(datumDE(e.start.slice(0, 10)))}</td><td>${esc(s.map(satzText).join(', ') || '–')}</td><td>${best ? esc(satzText(best)) : '–'}</td></tr>`; }).join('')}</tbody></table></div>` : '<p class="leise">Noch nicht trainiert.</p>'}`;
}
function trUebungenHtml() {
  const l = alleUebungen();
  return `<p class="klein"><a class="knopf still klein" href="#/training">${ico('zurueck', 'klein')} Training</a></p><h1>Übungen</h1>
  ${l.length ? `<ul class="eintraege">${l.map(u => `<li><span><b><a href="#/training/uebung/${esc(u.id)}">${esc(u.name)}</a></b>${u.quelle === 'eigen' ? ' <span class="chip">eigene</span>' : ''}</span></li>`).join('')}</ul>` : '<p class="leise">Die geprüfte Übungsbibliothek wird gerade aufgebaut – bis dahin kannst du eigene Übungen anlegen.</p>'}
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
const ROUTINE_FELDER = ['wdh_von', 'wdh_bis', 'pause_s', 'je_seite', 'referenz_kg', 'ziel_rir', 'variante', 'aufwaerm_schema', 'schritt_kg'];
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
    case 'tr-start': { if (trDaten().aktiv) { toast('Es läuft schon eine Einheit'); return; } const r = v ? trDaten().routinen.find(x => x.id === v) : null; const id = uid('tre'); const plan = b.dataset.plan || null; const pe = b.dataset.pe != null ? Number(b.dataset.pe) : null;
      // Die Einheit bekommt eine Kopie der Routine – spätere Planänderungen verändern gespeicherte Trainings nicht
      aendere(null, d => { trDaten(); d.training.einheiten.push({ id, routine: r ? r.id : null, plan, plan_eintrag: plan ? pe : null, name: r ? r.name : 'Freie Einheit', start: new Date().toISOString(), ende: null, notiz: '', uebungen: (r ? r.uebungen : []).map(x => Object.assign({ uebung: x.uebung }, Object.fromEntries(ROUTINE_FELDER.filter(k => x[k] != null && x[k] !== '').map(k => [k, JSON.parse(JSON.stringify(x[k]))])), { saetze: trNeueSaetze(x), notiz: '', beschwerde: false })) }); d.training.aktiv = id; }, { neuZeichnen: false });
      location.hash = '#/training/einheit'; break; }
    case 'tr-satz-ok': { const e = trEinheit(); const u = e.uebungen[ui]; const s = u.saetze[si]; const fertig = !s.erledigt;
      if (fertig && s.art === 'arbeit' && (s.wdh === '' || s.wdh == null)) { const l0 = letzteLeistung(u.uebung, e.id, u.variante); const vw = trVorher(u, l0, si, 'wdh'); if (vw === '') { toast('Bitte zuerst die Wiederholungen eintragen'); return; } s.wdh = Number(vw); if (s.kg === '' || s.kg == null) { const vk = trVorher(u, l0, si, 'kg'); if (vk !== '') s.kg = Number(vk); } }
      aendere(null, d => { const s2 = trEinheit().uebungen[ui].saetze[si]; s2.erledigt = fertig; s2.zeit = fertig ? new Date().toISOString() : null; });
      // Pause nur nach Arbeitssätzen und nur, wenn eingeschaltet; spätere Sätze werden nie automatisch abgeschlossen
      const einst = trDaten().einstellungen;
      if (fertig && s.art === 'arbeit' && u.pause_s > 0 && einst.auto_pause !== false) { timer = timer.filter(t0 => t0.art !== 'pause'); timer.push({ id: uid('t'), art: 'pause', name: 'Pause ' + ueb(u.uebung).name, naechstes: naechsterSatzText(trEinheit(), ui, si), ton: einst.ton !== false, ende: Date.now() + u.pause_s * 1000 }); timerSpeichern(); zeichneTimer(); }
      break; }
    case 'tr-vorschlag-anlegen': { const c = trDaten().einrichtung || {}; const n = arr(c.tage).length; const opt = splitOptionen(n)[Number(v)]; if (!opt) return; const vs = planVorschlag(c, opt[0], opt[1]); const tage = WOCHENTAGE.map(w => w[0]).filter(k => arr(c.tage).includes(k));
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
    case 'tr-plan-weg': { const p = trDaten().plaene.find(x => x.id === v); if (!p || !confirm(`Plan „${p.name}“ löschen? Routinen und gespeicherte Trainings bleiben erhalten.`)) return; aendere('Plan gelöscht', d => { d.training.plaene = d.training.plaene.filter(x => x.id !== v); }, { neuZeichnen: false }); location.hash = '#/training'; break; }
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
    case 'tr-verwerfen': if (!confirm('Diese Einheit verwerfen? Rückgängig ist direkt danach möglich.')) return; aendere('Einheit verworfen', d => { d.training.einheiten = d.training.einheiten.filter(x => x.id !== d.training.aktiv); d.training.aktiv = null; }, { neuZeichnen: false }); location.hash = '#/training'; break;
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
  else if (d.trTausch != null && el.value) aendere('Übung getauscht – frühere Leistung siehe oben', () => { const u = trEinheit().uebungen[Number(d.trTausch)]; u.ersetzt = u.ersetzt || u.uebung; u.uebung = el.value; u.saetze.forEach(s => { if (!s.erledigt) s.kg = ''; }); });
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
