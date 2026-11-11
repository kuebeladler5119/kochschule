/* Fitomat – Trainingsprotokoll (eigenständig, lokal, ohne Gewichtsautomatik).
   Daten in D.training: uebungen (eigene), routinen, einheiten, aktiv, koerpergewicht.
   Übungsbibliothek aus dem Katalog (K.uebungen), sobald vorhanden. */

function trDaten() { if (!D.training) D.training = { uebungen: [], routinen: [], einheiten: [], aktiv: null, koerpergewicht: [] }; return D.training; }
function alleUebungen() { const t = trDaten(); return [...(K.uebungen || []).map(u => Object.assign({ quelle: 'bibliothek' }, u)), ...t.uebungen.map(u => Object.assign({ quelle: 'eigen' }, u))]; }
function ueb(id) { return alleUebungen().find(u => u.id === id) || { id, name: 'Unbekannte Übung' }; }
const RIR_TEXT = 'RIR = „Wiederholungen in Reserve“: wie viele saubere Wiederholungen du am Ende des Satzes noch geschafft hättest (0 = keine mehr, 2 = noch zwei). Optional – eine grobe Selbsteinschätzung reicht.';
const kgText = v => v == null || v === '' ? '–' : zahlDE(Number(v), 2) + ' kg';

/* Letzte Leistung je Übung (aus abgeschlossenen Einheiten) */
function letzteLeistung(uebungId, ausser) {
  const e = trDaten().einheiten.filter(x => x.ende && x.id !== ausser && x.uebungen.some(u => u.uebung === uebungId)).sort((a, b) => b.start.localeCompare(a.start))[0];
  if (!e) return null; const u = e.uebungen.find(x => x.uebung === uebungId);
  return { datum: e.start.slice(0, 10), saetze: u.saetze.filter(s => s.art === 'arbeit' && s.erledigt) };
}
const satzText = s => `${s.wdh || '?'} × ${kgText(s.kg)}${s.rir !== '' && s.rir != null ? ' · RIR ' + s.rir : ''}`;

/* ---------- Übersicht ---------- */
function vTraining(teil, id) {
  const t = trDaten();
  if (teil === 'einheit') return trEinheitHtml();
  if (teil === 'routine') return trRoutineHtml(id);
  if (teil === 'uebung') return trUebungHtml(id);
  if (teil === 'uebungen') return trUebungenHtml();
  if (teil === 'gewicht') return trGewichtHtml();
  const akt = t.aktiv && t.einheiten.find(e => e.id === t.aktiv);
  const fertig = t.einheiten.filter(e => e.ende).sort((a, b) => b.start.localeCompare(a.start)).slice(0, 8);
  const kg = [...t.koerpergewicht].sort((a, b) => b.datum.localeCompare(a.datum))[0];
  return `<div class="seitenkopf"><h1>Training</h1><a class="knopf klein" href="#/training/uebungen">Übungen</a></div>
  ${akt ? `<div class="hinweis"><b>Einheit läuft</b> seit ${esc(new Date(akt.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }))} · ${esc(akt.name)} <a class="knopf haupt klein" href="#/training/einheit">Fortsetzen</a></div>` : ''}
  <h2>Routinen</h2>
  ${t.routinen.length ? `<ul class="eintraege">${t.routinen.map(r => `<li><span><b><a href="#/training/routine/${esc(r.id)}">${esc(r.name)}</a></b><br><span class="leise klein">${r.uebungen.length} Übungen · ${esc(r.uebungen.map(x => ueb(x.uebung).name).slice(0, 4).join(', '))}${r.uebungen.length > 4 ? ' …' : ''}</span></span><span><button class="haupt klein" data-a="tr-start" data-v="${esc(r.id)}" ${akt ? 'disabled' : ''}>Starten</button></span></li>`).join('')}</ul>`
    : `<div class="leer">${ico('leer')}Noch keine Routine.<br><span class="klein">Lege eine Routine mit deinen Übungen an – zum Beispiel aus deinem Trainingsplan.</span></div>`}
  <div class="knopfreihe"><button data-a="tr-routine-neu">${ico('plus', 'klein')} Neue Routine</button><button class="still" data-a="tr-start" data-v="" ${akt ? 'disabled' : ''}>Freie Einheit ohne Routine</button></div>
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
  <ol class="tr-liste">${r.uebungen.map((x, i) => `<li class="karte"><div class="zeile" style="justify-content:space-between"><b><a href="#/training/uebung/${esc(x.uebung)}">${esc(ueb(x.uebung).name)}</a></b>
      <span><button class="klein still" data-a="tr-r-hoch" data-v="${i}" ${i ? '' : 'disabled'} aria-label="nach oben">↑</button><button class="klein still" data-a="tr-r-weg" data-v="${i}">entfernen</button></span></div>
    <div class="zeile">${[['aufwaerm', 'Aufwärmsätze', 0, 5, 1], ['saetze', 'Arbeitssätze', 1, 10, 1], ['wdh_von', 'Wdh. von', 1, 50, 1], ['wdh_bis', 'Wdh. bis', 1, 50, 1], ['pause_s', 'Pause (Sek.)', 0, 600, 15]].map(([k, n, mi, ma, st]) => `<label class="feld"><span>${n}</span><input type="number" inputmode="numeric" min="${mi}" max="${ma}" step="${st}" value="${esc(x[k] ?? '')}" data-tr-r-feld="${k}" data-i="${i}" style="width:5.5em"></label>`).join('')}</div></li>`).join('')}</ol>
  <div class="zeile"><label class="feld" style="flex:1 1 200px"><span>Übung hinzufügen</span><select id="tr-r-neu"><option value="">– wählen –</option>${opt}</select></label><button data-a="tr-r-add" data-v="${esc(r.id)}">${ico('plus', 'klein')} Hinzufügen</button></div>
  <p class="klein"><a href="#/training/uebungen">Eigene Übung anlegen</a> (wenn sie in der Liste fehlt)</p>
  <div class="knopfreihe"><button class="haupt" data-a="tr-start" data-v="${esc(r.id)}" ${trDaten().aktiv ? 'disabled' : ''}>Diese Routine starten</button><button class="still" data-a="tr-routine-weg" data-v="${esc(r.id)}">Routine löschen</button></div>`;
}

/* ---------- Laufende Einheit ---------- */
function trEinheitHtml() {
  const t = trDaten(); const e = t.aktiv && t.einheiten.find(x => x.id === t.aktiv);
  if (!e) return `<p class="leer">Keine Einheit aktiv. <a href="#/training">Zur Übersicht</a></p>`;
  const opt = alleUebungen().map(u => `<option value="${esc(u.id)}">${esc(u.name)}</option>`).join('');
  return `<div class="seitenkopf"><h1>${esc(e.name)}</h1><span class="leise klein">seit ${esc(new Date(e.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }))}</span></div>
  <p class="leise klein">Alles wird sofort gespeichert – du kannst die App schließen und später fortsetzen. ${RIR_TEXT}</p>
  ${e.uebungen.map((u, ui) => { const info = ueb(u.uebung); const l = letzteLeistung(u.uebung, e.id);
    return `<section class="karte tr-uebung"><div class="zeile" style="justify-content:space-between;align-items:baseline"><h2 style="margin:0">${esc(info.name)}</h2><a class="klein" href="#/training/uebung/${esc(u.uebung)}">Anleitung</a></div>
      <p class="leise klein" style="margin:.2em 0 .6em">${u.wdh_von ? `Ziel ${u.wdh_von}${u.wdh_bis && u.wdh_bis !== u.wdh_von ? '–' + u.wdh_bis : ''} Wdh. · ` : ''}${l ? `Letztes Mal (${esc(datumDE(l.datum))}): ${esc(l.saetze.map(satzText).join(', ') || 'keine Arbeitssätze')}` : 'Noch keine frühere Leistung'}${u.ersetzt ? ` · ersetzt ${esc(ueb(u.ersetzt).name)}` : ''}</p>
      <table class="tr-saetze"><thead><tr><th>Satz</th><th>kg</th><th>Wdh.</th><th>RIR</th><th></th></tr></thead><tbody>
      ${u.saetze.map((s, si) => `<tr class="${s.erledigt ? 'erledigt' : ''}"><td><button class="klein still" data-a="tr-satz-art" data-u="${ui}" data-s="${si}" aria-label="Satzart wechseln">${s.art === 'aufwaerm' ? 'A' : 'W' + (u.saetze.filter((x, xi) => x.art === 'arbeit' && xi <= si).length)}</button></td>
        <td><input type="number" inputmode="decimal" step="0.25" min="0" value="${esc(s.kg ?? '')}" data-tr-satz="kg" data-u="${ui}" data-s="${si}" aria-label="Gewicht kg"></td>
        <td><input type="number" inputmode="numeric" step="1" min="0" value="${esc(s.wdh ?? '')}" data-tr-satz="wdh" data-u="${ui}" data-s="${si}" aria-label="Wiederholungen"></td>
        <td><select data-tr-satz="rir" data-u="${ui}" data-s="${si}" aria-label="RIR"><option value=""></option>${[0, 1, 2, 3, 4, '5+'].map(x => `<option ${String(s.rir) === String(x) ? 'selected' : ''}>${x}</option>`).join('')}</select></td>
        <td><button class="klein ${s.erledigt ? '' : 'haupt'}" data-a="tr-satz-ok" data-u="${ui}" data-s="${si}" aria-label="Satz ${s.erledigt ? 'wieder öffnen' : 'abschließen'}">${s.erledigt ? ico('haken', 'klein') : 'fertig'}</button></td></tr>`).join('')}
      </tbody></table>
      <p class="leise klein" style="margin:.4em 0">A = Aufwärmsatz, W = Arbeitssatz (Kürzel antippen zum Wechseln). Pause: ${u.pause_s ? Math.round(u.pause_s / 60 * 10) / 10 + ' Min.' : 'frei'} – startet nach „fertig“.</p>
      <div class="knopfreihe"><button class="klein" data-a="tr-satz-add" data-u="${ui}">${ico('plus', 'klein')} Satz</button><button class="klein still" data-a="tr-satz-weg" data-u="${ui}" ${u.saetze.length ? '' : 'disabled'}>letzten Satz entfernen</button>
        <details class="klein"><summary>Übung tauschen</summary><div class="zeile"><select data-tr-tausch="${ui}"><option value="">– Ersatz wählen –</option>${(info.alternativen || []).filter(a => alleUebungen().some(x => x.id === a)).map(a => `<option value="${esc(a)}">${esc(ueb(a).name)} (Alternative)</option>`).join('')}${opt}</select></div></details></div>
      <label class="feld"><span>Notiz</span><input value="${esc(u.notiz || '')}" data-tr-u-feld="notiz" data-u="${ui}" placeholder="z. B. Griff, Sitzeinstellung"></label>
      <label style="margin-top:4px"><input type="checkbox" data-tr-u-beschwerde="${ui}" ${u.beschwerde ? 'checked' : ''}> Schmerzen oder Beschwerden bei dieser Übung</label>
      ${u.beschwerde ? `<label class="feld"><span>Was und wo?</span><input value="${esc(u.beschwerde_text || '')}" data-tr-u-feld="beschwerde_text" data-u="${ui}"></label><p class="hinweis warn klein">Bei Schmerzen die Übung nicht „durchziehen“: Satz beenden, leichter oder eine schmerzfreie Alternative wählen. Halten Beschwerden an, ärztlich oder physiotherapeutisch abklären lassen.</p>` : ''}
    </section>`; }).join('')}
  <div class="zeile"><label class="feld" style="flex:1 1 200px"><span>Übung hinzufügen</span><select id="tr-e-neu"><option value="">– wählen –</option>${opt}</select></label><button data-a="tr-e-add">${ico('plus', 'klein')} Hinzufügen</button></div>
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
    : `${u.md ? md(u.md) : '<p class="leise">Anleitung folgt.</p>'}${u.demo_link ? `<p><a href="${esc(u.demo_link)}" target="_blank" rel="noopener">Demonstration ansehen</a> <span class="leise klein">(${esc(u.demo_link_quelle || 'externe Seite')}; geprüft: ${esc(u.demo_link_geprueft || 'nicht angegeben')})</span></p>` : ''}`}
  <h2>Verlauf</h2>
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

/* ---------- Ereignisse ---------- */
function trEinheit() { const t = trDaten(); return t.einheiten.find(e => e.id === t.aktiv); }
function trSpeichernStill(fn) { fn(D); speichern(); }   // Eingaben in der Einheit ohne Neuzeichnen (Fokus bleibt)
function trNeueSaetze(x) { const s = []; for (let i = 0; i < (Number(x.aufwaerm) || 0); i++) s.push({ art: 'aufwaerm', kg: '', wdh: '', rir: '', erledigt: false }); for (let i = 0; i < (Number(x.saetze) || 3); i++) s.push({ art: 'arbeit', kg: '', wdh: '', rir: '', erledigt: false }); return s; }
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a, v = b.dataset.v; if (!a.startsWith('tr-')) return;
  const ui = Number(b.dataset.u), si = Number(b.dataset.s);
  switch (a) {
    case 'tr-routine-neu': { const id = uid('rou'); aendere(null, d => { trDaten(); d.training.routinen.push({ id, name: 'Neue Routine', uebungen: [] }); }, { neuZeichnen: false }); location.hash = '#/training/routine/' + id; break; }
    case 'tr-routine-weg': { const r = trDaten().routinen.find(x => x.id === v); if (!r || !confirm(`Routine „${r.name}“ löschen? Bisherige Einheiten bleiben erhalten.`)) return; aendere('Routine gelöscht', d => { d.training.routinen = d.training.routinen.filter(x => x.id !== v); }, { neuZeichnen: false }); location.hash = '#/training'; break; }
    case 'tr-r-add': { const sel = $('#tr-r-neu'); if (!sel || !sel.value) { toast('Bitte eine Übung wählen'); return; } const u = ueb(sel.value); const von = String(u.wdh_bereich_vorschlag || '').match(/(\d+)\D+(\d+)/);
      aendere(null, d => { d.training.routinen.find(x => x.id === v).uebungen.push({ uebung: sel.value, aufwaerm: 1, saetze: 3, wdh_von: von ? Number(von[1]) : 8, wdh_bis: von ? Number(von[2]) : 12, pause_s: 120 }); }); break; }
    case 'tr-r-weg': { const rid = location.hash.split('/')[3]; aendere(null, d => { d.training.routinen.find(x => x.id === rid).uebungen.splice(Number(v), 1); }); break; }
    case 'tr-r-hoch': { const rid = location.hash.split('/')[3]; const i = Number(v); aendere(null, d => { const l = d.training.routinen.find(x => x.id === rid).uebungen; [l[i - 1], l[i]] = [l[i], l[i - 1]]; }); break; }
    case 'tr-start': { const r = v ? trDaten().routinen.find(x => x.id === v) : null; const id = uid('tre');
      aendere(null, d => { trDaten(); d.training.einheiten.push({ id, routine: r ? r.id : null, name: r ? r.name : 'Freie Einheit', start: new Date().toISOString(), ende: null, notiz: '', uebungen: (r ? r.uebungen : []).map(x => ({ uebung: x.uebung, wdh_von: x.wdh_von, wdh_bis: x.wdh_bis, pause_s: x.pause_s, saetze: trNeueSaetze(x), notiz: '', beschwerde: false })) }); d.training.aktiv = id; }, { neuZeichnen: false });
      location.hash = '#/training/einheit'; break; }
    case 'tr-satz-ok': { const e = trEinheit(); const u = e.uebungen[ui]; const s = u.saetze[si]; const fertig = !s.erledigt;
      if (fertig && (s.wdh === '' || s.wdh == null)) { toast('Bitte zuerst die Wiederholungen eintragen'); return; }
      aendere(null, d => { const s2 = trEinheit().uebungen[ui].saetze[si]; s2.erledigt = fertig; s2.zeit = fertig ? new Date().toISOString() : null; });
      if (fertig && u.pause_s > 0) { timer.push({ id: uid('t'), name: 'Pause ' + ueb(u.uebung).name, ende: Date.now() + u.pause_s * 1000 }); timerSpeichern(); zeichneTimer(); }
      break; }
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
  if (d.trSatz) trSpeichernStill(() => { const s = trEinheit().uebungen[Number(d.u)].saetze[Number(d.s)]; s[d.trSatz] = el.value === '' ? '' : (d.trSatz === 'rir' ? el.value : Number(el.value)); });
  else if (d.trUFeld) trSpeichernStill(() => { trEinheit().uebungen[Number(d.u)][d.trUFeld] = el.value; });
  else if (d.trENotiz) trSpeichernStill(() => { trEinheit().notiz = el.value; });
  else if (d.trRoutineName) trSpeichernStill(() => { trDaten().routinen.find(x => x.id === d.trRoutineName).name = el.value || 'Routine'; });
  else if (d.trRFeld) { const rid = location.hash.split('/')[3]; trSpeichernStill(() => { trDaten().routinen.find(x => x.id === rid).uebungen[Number(d.i)][d.trRFeld] = el.value === '' ? null : Number(el.value); }); }
});
document.addEventListener('change', ev => {
  const el = ev.target; const d = el.dataset || {};
  if (d.trUBeschwerde != null) aendere(null, () => { trEinheit().uebungen[Number(d.trUBeschwerde)].beschwerde = el.checked; });
  else if (d.trTausch != null && el.value) aendere('Übung getauscht – frühere Leistung siehe oben', () => { const u = trEinheit().uebungen[Number(d.trTausch)]; u.ersetzt = u.ersetzt || u.uebung; u.uebung = el.value; u.saetze.forEach(s => { if (!s.erledigt) s.kg = ''; }); });
});
document.addEventListener('submit', ev => {
  const f = ev.target;
  if (f.id === 'tr-ueb-neu') { ev.preventDefault(); const name = f.name.value.trim(); if (!name) return;
    aendere('Eigene Übung gespeichert', d => { trDaten(); d.training.uebungen.push({ id: uid('uebe'), name, geraet: f.geraet.value.trim() || null, schritt_kg: f.schritt_kg.value === '' ? null : Number(f.schritt_kg.value), link: /^https:\/\//.test(f.link.value) ? f.link.value : null, notiz: f.notiz.value.trim() || null }); }); }
  if (f.id === 'tr-kg') { ev.preventDefault(); const kg = Number(String(f.kg.value).replace(',', '.')); if (!(kg > 20)) return;
    aendere('Körpergewicht eingetragen', d => { trDaten(); d.training.koerpergewicht = d.training.koerpergewicht.filter(x => x.datum !== f.datum.value); d.training.koerpergewicht.push({ datum: f.datum.value || heute(), kg }); }); }
});
