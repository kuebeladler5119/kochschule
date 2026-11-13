/* Fitomat-Build 202611131313 */
/* Fitomat – Mentality: kurze, sachliche Übungen für konkrete Situationen. Alles lokal; nichts wird gesendet.
   Grundlagen, Belege und Grenzen: Vault „70 Mentality/Mentality – Grundlagen“. Keine Diagnosen, keine Heilversprechen. */

function mtDaten() { if (!D.mentality) D.mentality = { favoriten: [], verlauf: [], journal: [], checkins: [], regeln: [], fokus: [] }; const m = D.mentality; ['favoriten', 'verlauf', 'journal', 'checkins', 'regeln', 'fokus'].forEach(k => { if (!Array.isArray(m[k])) m[k] = []; }); return m; }

/* Übungen: art = still (sitzen/liegen) | bewegt | schreiben; unauffaellig = geht auch unterwegs/im Büro */
const MT_UEBUNGEN = [
  { id: 'atem-langsam', name: 'Langsam atmen', art: 'still', unauffaellig: true, minuten: [2, 3, 5], takt: { ein: 4, aus: 6 },
    kurz: 'Etwa 4 Sekunden ein, 6 Sekunden aus – ungefähr 6 Atemzüge pro Minute.',
    schritte: ['Setz dich bequem hin, Füße auf dem Boden. Augen offen oder geschlossen, wie es dir lieber ist.', 'Atme durch die Nase ein, während der Kreis wächst, und langsam wieder aus, während er schrumpft.', 'Nicht pressen und nicht besonders tief atmen – nur langsamer. Wird dir schwindlig, atme normal weiter.'],
    beleg: 'Langsames Atmen (unter 10 Atemzügen pro Minute) ging in Studien mit weniger Anspannung und Angst einher; die Studien sind klein (Übersicht Zaccaro et al. 2018).' },
  { id: 'atem-beobachten', name: 'Atem beobachten', art: 'still', unauffaellig: true, minuten: [3, 5, 10],
    kurz: 'Kurze Meditation: Aufmerksamkeit beim Atem, abschweifen ist normal.',
    schritte: ['Setz dich aufrecht, aber bequem hin.', 'Spür, wo du den Atem am deutlichsten merkst – Nase, Brust oder Bauch. Den Atem nicht verändern.', 'Wenn die Gedanken abschweifen, merk kurz „abgeschweift“ und geh freundlich zurück zum Atem. Das ist die eigentliche Übung, kein Fehler.', 'Zum Schluss ein paar Atemzüge lang den ganzen Körper und den Raum wahrnehmen, dann die Augen öffnen.'],
    beleg: 'Achtsamkeitsprogramme senkten in einer Meta-Analyse bei gesunden Erwachsenen Stress im Mittel moderat (Khoury et al. 2015). Eine einzelne kurze Übung ist kein Programm.' },
  { id: 'body-scan', name: 'Body-Scan', art: 'still', unauffaellig: false, minuten: [5, 10],
    kurz: 'Aufmerksamkeit langsam von den Füßen bis zum Kopf wandern lassen.', gefuehrt: true, vorbereitung: 'Leg dich hin oder setz dich bequem. Augen schließen, wenn das angenehm ist. Es gibt nichts zu erreichen – nur wahrnehmen.',
    schritte: ['Füße und Beine: nur wahrnehmen, was da ist – Wärme, Druck, Kribbeln oder nichts Besonderes.', 'Becken, Bauch und Rücken: der Atem darf sich bewegen, wie er will.', 'Hände, Arme, Schultern: wenn etwas angespannt ist, nur bemerken – loslassen ist kein Muss.', 'Nacken, Gesicht, Kopf. Zum Schluss den ganzen Körper auf einmal spüren.'],
    beleg: 'Teil vieler Achtsamkeitsprogramme; die Wirkung des Body-Scans allein ist wenig untersucht.' },
  { id: 'pmr', name: 'Muskeln anspannen und lösen', art: 'still', unauffaellig: false, minuten: [5, 10],
    kurz: 'Kurzform der progressiven Muskelentspannung: je Muskelgruppe kurz anspannen, dann lösen.',
    gefuehrt: true, vorbereitung: 'Setz oder leg dich bequem hin. Nur leicht anspannen (etwa halbe Kraft), nie bis zum Schmerz; Stellen mit Verletzung oder Krampfneigung auslassen. Je Abschnitt: etwa 5 Sekunden anspannen, dann lösen und nachspüren.',
    schritte: ['Hände: zu Fäusten ballen – etwa 5 Sekunden halten – lösen und nachspüren, wie die Spannung nachlässt.', 'Arme: Unterarme beugen und die Oberarme anspannen – halten – lösen.', 'Schultern: zu den Ohren ziehen – halten – fallen lassen.', 'Gesicht: Augen zukneifen, Stirn runzeln – halten – lösen.', 'Bauch: anspannen – halten – lösen, ruhig weiteratmen.', 'Beine und Füße: Oberschenkel anspannen, Zehen zu dir ziehen – halten – lösen. Zum Schluss den ganzen Körper wahrnehmen.'],
    beleg: 'Progressive Muskelentspannung ist ein gut eingeführtes Entspannungsverfahren; die Kurzform hier ist vereinfacht (Vorschlag).' },
  { id: 'sinne-54321', name: '5-4-3-2-1 – mit den Sinnen ankommen', art: 'still', unauffaellig: true, minuten: [2, 3],
    kurz: 'Aufmerksamkeit nach außen lenken: 5 Dinge sehen, 4 hören, 3 spüren, 2 riechen, 1 schmecken.',
    schritte: ['Nenn innerlich 5 Dinge, die du siehst.', '4 Dinge, die du hörst.', '3 Dinge, die du spürst (Stuhl, Kleidung, Luft).', '2 Dinge, die du riechst – oder 2 Gerüche, die du magst.', '1 Sache, die du schmeckst.'],
    beleg: 'Gängige Übung zum Unterbrechen von Gedankenschleifen; kaum eigens untersucht (Vorschlag).' },
  { id: 'pause-ohne-bildschirm', name: 'Pause ohne Bildschirm', art: 'bewegt', unauffaellig: true, minuten: [5, 10, 15],
    kurz: 'Handy weglegen, aufstehen, Fenster oder kurz raus – ohne Ziel.',
    schritte: ['Leg das Handy außer Reichweite oder mit dem Bildschirm nach unten.', 'Steh auf, trink etwas Wasser, schau aus dem Fenster oder geh ein paar Schritte.', 'Wenn es geht, kurz nach draußen. Kein Podcast, keine Nachrichten – nur Pause.', 'Wenn die Zeit um ist: Was ist der nächste kleine Schritt?'],
    beleg: 'Kurze Bewegungspausen und Gehen können Stimmung und Wachheit kurzfristig verbessern; die Effekte sind klein und von Person zu Person verschieden.' },
  { id: 'spaziergang', name: 'Kurzer Spaziergang', art: 'bewegt', unauffaellig: true, minuten: [10, 15, 20],
    kurz: 'Gehen in ruhigem Tempo, möglichst draußen.',
    schritte: ['Handy in die Tasche, stumm. Ziel: einfach gehen.', 'Achte ein paar Minuten lang auf deine Schritte und was du siehst.', 'Wenn Gedanken kommen, ist das in Ordnung – zurück zu den Schritten.'],
    beleg: 'Körperliche Aktivität hängt in Studien mit besserer Stimmung zusammen; ein einzelner Spaziergang ist keine Behandlung.' },
  { id: 'journal', name: 'Mini-Journal', art: 'schreiben', unauffaellig: true, minuten: [3, 5], journal: true,
    kurz: 'Drei kurze Fragen aufschreiben: Was beschäftigt mich? Was kann ich beeinflussen? Nächster machbarer Schritt?',
    schritte: ['Schreib kurz auf, was dich gerade beschäftigt – Stichworte reichen.', 'Was davon kannst du beeinflussen, was nicht?', 'Was ist ein nächster Schritt, der in 10 Minuten machbar ist?'],
    beleg: 'Strukturiertes Aufschreiben ist Teil vieler Problemlöse-Ansätze; hier als einfaches Werkzeug, nicht als Therapie.' },
  { id: 'gruebelzeit', name: 'Grübeln verschieben', art: 'schreiben', unauffaellig: true, minuten: [2, 3],
    kurz: 'Den Gedanken notieren und eine feste, kurze Grübelzeit später am Tag festlegen.',
    schritte: ['Schreib den Gedanken in einem Satz auf.', 'Leg eine Zeit für später fest (z. B. 15 Minuten am frühen Abend, nicht direkt vor dem Schlafen).', 'Bis dahin: Kommt der Gedanke wieder, sag dir „später, um …“ und geh zurück zu dem, was du gerade tust.', 'Zur Grübelzeit: Liste durchgehen. Oft hat sich manches erledigt; für den Rest einen nächsten Schritt notieren.'],
    beleg: 'Grübelzeit-Verschiebung zeigte in einzelnen Studien weniger Sorgen (McGowan & Behar 2013); bei generalisierter Angststörung waren Ergebnisse uneinheitlich.' },
  { id: 'fokus', name: 'Fokus-Timer', art: 'schreiben', unauffaellig: true, minuten: [10, 15, 25, 45], fokus: true,
    kurz: 'Eine selbst gewählte Aufgabe, eine feste Zeit, danach eine kurze Pause.',
    schritte: ['Schreib die eine Aufgabe auf, an der du jetzt arbeitest.', 'Benachrichtigungen aus, Handy außer Sicht.', 'Wenn dir etwas anderes einfällt: kurz notieren und weiter.', 'Nach Ablauf: 3–5 Minuten Pause, aufstehen.'],
    beleg: 'Feste Arbeitsblöcke mit Pausen sind ein verbreitetes Werkzeug; belastbare Studien zu bestimmten Minutenzahlen gibt es kaum. Fang klein an und verlängere schrittweise.' },
  { id: 'scroll-stopp', name: 'Scrollen unterbrechen', art: 'still', unauffaellig: true, minuten: [1, 2], scroll: true,
    kurz: 'Kurz innehalten: Was wollte ich eigentlich? Dann bewusst entscheiden.',
    schritte: ['Leg das Handy für einen Moment hin und atme zweimal langsam aus.', 'Frag dich: Wollte ich etwas Bestimmtes – oder ist es Gewohnheit, Langeweile oder Stress?', 'Entscheide bewusst: weitermachen mit Zeitgrenze, oder etwas anderes tun.'],
    beleg: 'Wenn-dann-Pläne halfen in einer Meta-Analyse, Vorsätze umzusetzen (Gollwitzer & Sheeran 2006). Die App kann andere Apps nicht sperren.' }
];
const MT_SITUATION = {
  stress: { titel: 'Ich bin gestresst.', ids: ['atem-langsam', 'pmr', 'pause-ohne-bildschirm', 'journal', 'sinne-54321'] },
  konzentration: { titel: 'Ich kann mich nicht konzentrieren.', ids: ['fokus', 'pause-ohne-bildschirm', 'atem-beobachten', 'journal'] },
  scrollen: { titel: 'Ich hänge im Scrollen fest.', ids: ['scroll-stopp', 'pause-ohne-bildschirm', 'fokus', 'spaziergang'] },
  gruebeln: { titel: 'Ich grüble.', ids: ['gruebelzeit', 'journal', 'sinne-54321', 'spaziergang', 'atem-beobachten'] },
  runter: { titel: 'Ich möchte runterkommen oder meditieren.', ids: ['atem-beobachten', 'body-scan', 'atem-langsam', 'pmr'] }
};
const mtUeb = id => MT_UEBUNGEN.find(u => u.id === id);
let mtFrage = { situation: null, zeit: null, art: null, unauff: false };
let mtLauf = null;   // { id, min, start, pausiertSeit, pausiertMs, schritt, aufgabe }
let mtTakt = null;

function mtBewertung(id) { const v = mtDaten().verlauf.filter(x => x.id === id && x.bewertung); return v.reduce((s, x) => s + (x.bewertung === 'hilfreich' ? 1 : x.bewertung === 'nicht' ? -1 : 0), 0); }
function mtVorschlaege() {
  const s = MT_SITUATION[mtFrage.situation]; if (!s) return [];
  return s.ids.map(mtUeb).filter(Boolean).filter(u => !mtFrage.zeit || Math.min(...u.minuten) <= mtFrage.zeit).filter(u => !mtFrage.unauff || u.unauffaellig)
    .map((u, i) => ({ u, p: (mtFrage.art && u.art === mtFrage.art ? 3 : 0) + mtBewertung(u.id) * 1.5 + (mtDaten().favoriten.includes(u.id) ? 1 : 0) - i * 0.3 }))
    .sort((a, b) => b.p - a.p).slice(0, 3).map(x => x.u);
}
const MT_HILFE = `<details class="karte klein mt-hilfe"><summary><b>Wann professionelle Hilfe?</b></summary>
  <p>Diese Übungen sind Hilfen für den Alltag, keine Behandlung und keine Diagnose. Beschwerden wie Kopfschmerzen, Herzklopfen oder Schlafprobleme nicht automatisch als „Stress“ deuten.</p>
  <ul><li><b>Sofort 112:</b> plötzlicher, extrem starker Kopfschmerz („wie ein Donnerschlag“), Kopfschmerz mit Lähmung, Seh- oder Sprachstörung, Verwirrtheit, Krampfanfall, nach einem Sturz auf den Kopf, oder mit Fieber und steifem Nacken; Brustschmerz oder Atemnot.</li>
    <li><b>Ärztlich abklären:</b> neuartige oder deutlich veränderte Kopfschmerzen, Beschwerden, die über Wochen anhalten oder zunehmen.</li>
    <li><b>Wenn es dir seelisch sehr schlecht geht oder du an Suizid denkst:</b> TelefonSeelsorge, kostenlos, rund um die Uhr: <a href="tel:08001110111">0800 111 0 111</a>, <a href="tel:08001110222">0800 111 0 222</a>, <a href="tel:116123">116 123</a> (auf Deutsch). Bei akuter Gefahr: <a href="tel:112">112</a>.</li></ul></details>`;

function vMentality(teil, id) {
  const m = mtDaten();
  if (teil === 'u') return mtUebungHtml(id);
  if (teil === 'lauf') return mtLaufHtml();
  if (teil === 'werkzeuge') return mtWerkzeugeHtml();
  if (teil === 'journal') return mtJournalHtml();
  if (teil === 'verlauf') return mtVerlaufHtml();
  if (teil === 'scroll') return mtScrollHtml();
  const s = MT_SITUATION[mtFrage.situation];
  const chip = (k, v, t) => `<button class="filterchip gross-chip" data-a="mt-frage" data-k="${k}" data-v="${v}" aria-pressed="${String(mtFrage[k]) === String(v)}">${t}</button>`;
  const fav = m.favoriten.map(mtUeb).filter(Boolean);
  return `<h1>Mentality</h1><p class="leise klein">Kurze, konkrete Übungen für bestimmte Situationen. Alles bleibt auf diesem Gerät.</p>
  <div class="mt-situationen">${Object.entries(MT_SITUATION).map(([k, x]) => `<button class="mt-situation" data-a="mt-situation" data-v="${k}" aria-pressed="${mtFrage.situation === k}">${esc(x.titel)}</button>`).join('')}</div>
  ${s ? `<section class="karte"><h2 style="margin-top:0">${esc(s.titel)}</h2>
    <p class="klein"><b>Wie viel Zeit?</b></p><div class="chips-wrap">${chip('zeit', 3, 'bis 3 Min.')}${chip('zeit', 10, 'bis 10 Min.')}${chip('zeit', 0, 'mehr')}</div>
    <p class="klein"><b>Was passt gerade?</b></p><div class="chips-wrap">${chip('art', 'still', 'ruhig sitzen/liegen')}${chip('art', 'bewegt', 'bewegen')}${chip('art', 'schreiben', 'aufschreiben')}${chip('art', '', 'egal')}</div>
    <label class="klein"><input type="checkbox" data-a="mt-unauff" ${mtFrage.unauff ? 'checked' : ''}> Ich bin unterwegs oder nicht allein (nur Unauffälliges)</label>
    <h3>Vorschläge</h3>${mtVorschlaege().map(u => mtKarte(u)).join('') || '<p class="leise klein">Mit diesen Angaben passt nichts – Zeit „mehr“ oder „egal“ wählen.</p>'}</section>` : ''}
  ${fav.length ? `<h2>Gespeichert</h2>${fav.map(u => mtKarte(u)).join('')}` : ''}
  ${MT_HILFE}`;
}
function mtKarte(u) {
  const b = mtBewertung(u.id); const fav = mtDaten().favoriten.includes(u.id);
  return `<div class="karte mt-karte"><div class="zeile" style="justify-content:space-between;align-items:flex-start"><span><b>${esc(u.name)}</b> <span class="leise klein">· ${u.minuten.join('/')} Min.</span><br><span class="klein">${esc(u.kurz)}</span>${b ? `<br><span class="leise klein">Deine Rückmeldung bisher: ${b > 0 ? 'eher hilfreich' : 'eher nicht hilfreich'}</span>` : ''}</span>
    <button class="klein still" data-a="mt-fav" data-v="${u.id}" aria-label="${fav ? 'aus Gespeichert entfernen' : 'speichern'}">${fav ? '★' : '☆'}</button></div>
    <div class="knopfreihe">${u.scroll ? `<a class="knopf haupt" href="#/mentality/scroll">Starten</a>` : `<a class="knopf haupt" href="#/mentality/u/${u.id}">Ansehen und starten</a>`}</div></div>`;
}
function mtUebungHtml(id) {
  const u = mtUeb(id); if (!u) return '<p class="leer">Übung nicht gefunden. <a href="#/mentality">Mentality</a></p>';
  const letzteFokus = mtDaten().fokus.filter(f => f.geschafft).slice(-1)[0];
  return `<p class="klein"><a class="knopf still klein" href="#/mentality">${ico('zurueck', 'klein')} Mentality</a></p><h1>${esc(u.name)}</h1><p>${esc(u.kurz)}</p>
  ${u.vorbereitung ? `<p class="hinweis klein"><b>Vorbereiten:</b> ${esc(u.vorbereitung)}</p>` : ''}
  ${u.gefuehrt ? `<details class="klein"><summary>Alle ${u.schritte.length} Abschnitte ansehen</summary><ol class="mt-schritte">${u.schritte.map(s => `<li>${esc(s)}</li>`).join('')}</ol></details><p class="leise klein">Beim Üben führt die App Abschnitt für Abschnitt; die gewählte Dauer wird gleichmäßig verteilt. Du kannst jederzeit weiter- oder zurückspringen.</p>` : `<ol class="mt-schritte">${u.schritte.map(s => `<li>${esc(s)}</li>`).join('')}</ol>`}
  ${u.fokus ? `<label class="feld"><span>Deine Aufgabe</span><input id="mt-aufgabe" maxlength="120" placeholder="z. B. Bericht Abschnitt 2 entwerfen"></label>${letzteFokus ? `<p class="leise klein">Zuletzt ganz geschafft: ${letzteFokus.min} Min. Wenn das gut ging, kannst du ${letzteFokus.min + 5} Min. versuchen.</p>` : '<p class="leise klein">Fang lieber kurz an; verlängern kannst du später.</p>'}` : ''}
  <p class="klein"><b>Dauer:</b></p><div class="chips-wrap">${u.minuten.map(n => `<button class="haupt gross-chip" data-a="mt-start" data-v="${u.id}" data-min="${n}">${n} Min. starten</button>`).join('')}</div>
  <details class="klein"><summary>Was ist belegt?</summary><p>${esc(u.beleg)}</p><p class="leise">Quellen und Grenzen: Vault „Mentality – Grundlagen“.</p></details>
  <p class="leise klein">Der Timer läuft nur, solange die App offen ist; bei gesperrtem iPhone kann er stehen bleiben und kein Ton kommen.</p>`;
}
/* Aktive Dauer = Uhrzeit seit Start minus Pausen; beim Beenden eingefroren. Zeit außerhalb der App wird nach der Rückkehr erfragt. */
function mtAktivMs() { if (!mtLauf) return 0; if (mtLauf.aktivMsEnde != null) return mtLauf.aktivMsEnde; const pause = mtLauf.pausiertMs + (mtLauf.pausiertSeit ? Date.now() - mtLauf.pausiertSeit : 0); return Math.min(mtLauf.min * 60000, Math.max(0, Date.now() - mtLauf.start - pause)); }
function mtRest() { return mtLauf ? Math.max(0, mtLauf.min * 60000 - mtAktivMs()) : 0; }
const mtDauerText = x => x.sek != null ? `${x.sek < 60 ? x.sek + ' s' :Math.floor(x.sek / 60) + ':' + String(x.sek % 60).padStart(2, '0') + ' Min.'}${x.min_geplant ? ` von ${x.min_geplant} Min.` : ''}` : `${x.min} Min.`;
document.addEventListener('visibilitychange', () => { if (!mtLauf || mtLauf.aktivMsEnde != null) return;
  if (document.visibilityState === 'hidden') { mtLauf.verstecktSeit = Date.now(); return; }
  const weg = mtLauf.verstecktSeit ? Date.now() - mtLauf.verstecktSeit : 0; const seit = mtLauf.verstecktSeit; mtLauf.verstecktSeit = null;
  if (weg > 20000 && !mtLauf.pausiertSeit) { mtLauf.pausiertSeit = seit; mtLauf.abwesendMs = weg; if (location.hash.startsWith('#/mentality/lauf')) route(); } });
function mtLaufHtml() {
  if (!mtLauf) return '<p class="leer">Keine Übung aktiv. <a href="#/mentality">Mentality</a></p>';
  const u = mtUeb(mtLauf.id); const rest = mtRest(); const fertig = rest <= 0 || mtLauf.beendet;
  if (fertig) return `<h1>${esc(u.name)}</h1><p>${mtLauf.beendet === 'frueh' ? 'Vorzeitig beendet' : 'Die Zeit ist um'} – aktiv ${esc(mtDauerText({ sek: Math.round(mtAktivMs() / 1000), min_geplant: mtLauf.min }))}</p>
    ${u.journal ? mtJournalForm() : ''}
    ${u.fokus ? `<p class="klein"><b>Aufgabe:</b> ${esc(mtLauf.aufgabe || '–')}</p><div class="knopfreihe"><button data-a="mt-fokus-ergebnis" data-v="ja">Konnte dranbleiben</button><button data-a="mt-fokus-ergebnis" data-v="teils">Teilweise</button><button data-a="mt-fokus-ergebnis" data-v="nein">Kaum</button></div>` : ''}
    <section class="karte"><p class="klein"><b>War das hilfreich?</b> (freiwillig)</p><div class="knopfreihe"><button data-a="mt-bewerten" data-v="hilfreich">hilfreich</button><button data-a="mt-bewerten" data-v="neutral">neutral</button><button data-a="mt-bewerten" data-v="nicht">nicht hilfreich</button><button class="still" data-a="mt-bewerten" data-v="">ohne Rückmeldung</button></div></section>`;
  const min = Math.floor(rest / 60000), sek = Math.floor(rest / 1000) % 60;
  return `<p class="leise klein">${esc(u.name)} · ${mtLauf.min} Min.${mtLauf.pausiertSeit && !mtLauf.abwesendMs ? ' · angehalten' : ''}</p>
  ${mtLauf.abwesendMs ? `<div class="hinweis klein"><b>Du warst ca. ${mtLauf.abwesendMs < 60000 ? Math.round(mtLauf.abwesendMs / 1000) + ' s' : Math.round(mtLauf.abwesendMs / 60000) + ' Min.'} außerhalb der App.</b> Hast du in dieser Zeit weitergeübt (z. B. mit gesperrtem Bildschirm)? <div class="knopfreihe"><button class="klein" data-a="mt-abwesend" data-v="ja">Ja, mitzählen</button><button class="klein" data-a="mt-abwesend" data-v="nein">Nein, als Pause werten</button></div><span class="leise">Bei gesperrtem iPhone kann die App die Zeit nicht beobachten und keinen Ton geben.</span></div>` : ''}
  ${u.takt ? `<div class="mt-takt" id="mt-takt" aria-live="off"><div class="mt-kreis" id="mt-kreis"></div><b id="mt-takt-text">ein</b></div>` : ''}
  <div class="mt-uhr" id="mt-uhr" aria-live="off">${min}:${String(sek).padStart(2, '0')}</div>
  ${u.fokus ? `<p class="klein"><b>Aufgabe:</b> ${esc(mtLauf.aufgabe || '–')}</p>` : u.gefuehrt ? `<div id="mt-abschnitt">${mtAbschnittHtml(u)}</div>` : `<ol class="mt-schritte">${u.schritte.map(s => `<li>${esc(s)}</li>`).join('')}</ol>`}
  <div class="knopfreihe"><button class="gross" data-a="mt-pause">${mtLauf.pausiertSeit ? '▶ weiter' : 'Ⅱ anhalten'}</button><button class="gross" data-a="mt-ende">Beenden</button><button class="still" data-a="mt-abbruch">✕ abbrechen (nichts speichern)</button></div>
  ${u.gefuehrt ? `<details class="klein"><summary>Signal beim Abschnittswechsel</summary><label><input type="checkbox" data-a="mt-signal" data-v="vibration" ${mtEinst().vibration ? 'checked' : ''}> Vibration (wo der Browser es unterstützt – Safari auf dem iPhone kann das nicht)</label><br><label><input type="checkbox" data-a="mt-signal" data-v="ton" ${mtEinst().ton ? 'checked' : ''}> leiser Ton (nur bei geöffneter App und nicht stumm geschaltetem Gerät)</label></details>` : ''}`;
}
/* Geführte Übungen (Body-Scan, Muskelentspannung): ein Abschnitt nach dem anderen; Dauer gleichmäßig auf die Abschnitte verteilt.
   Weiter/Zurück jederzeit; Signal nur, wenn ausdrücklich eingeschaltet. */
const mtEinst = () => Object.assign({ vibration: false, ton: false }, mtDaten().einst || {});
function mtAbschnittHtml(u) {
  const n = u.schritte.length; const i = Math.min(mtLauf.abIdx || 0, n - 1); const per = mtLauf.min * 60000 / n; const rest = Math.max(0, per - (mtAktivMs() - (mtLauf.abStart || 0)));
  return `<p class="leise klein" style="margin:0">Abschnitt ${i + 1} von ${n}${i < n - 1 ? ` · nächster in ca. ${Math.ceil(rest / 1000)} s` : ' · letzter Abschnitt'}</p>
    <div class="mt-punkte" aria-hidden="true">${u.schritte.map((_, k) => `<i class="${k < i ? 'fertig' : k === i ? 'jetzt' : ''}"></i>`).join('')}</div>
    <p class="mt-abschnitt-text">${esc(u.schritte[i])}</p>
    <div class="knopfreihe"><button class="still" data-a="mt-ab" data-v="-1" ${i === 0 ? 'disabled' : ''}>← Zurück</button><button class="still" data-a="mt-ab" data-v="1" ${i === n - 1 ? 'disabled' : ''}>Weiter →</button></div>`;
}
function mtSignal() {
  const e = mtEinst(); try { if (e.vibration && navigator.vibrate) navigator.vibrate(120); } catch (er) { /* */ }
  if (e.ton) { try { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; mtSignal.ctx = mtSignal.ctx || new AC(); const c = mtSignal.ctx; const o = c.createOscillator(), g = c.createGain(); o.frequency.value = 528; g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.exponentialRampToValueAtTime(0.06, c.currentTime + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.6); o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + 0.65); } catch (er) { /* */ } }
}
function mtTick() {
  if (mtLauf && !mtLauf.pausiertSeit && mtLauf.aktivMsEnde == null) { const u0 = mtUeb(mtLauf.id); if (u0 && u0.gefuehrt) { const n = u0.schritte.length, per = mtLauf.min * 60000 / n, i = mtLauf.abIdx || 0;
    if (i < n - 1 && mtAktivMs() - (mtLauf.abStart || 0) >= per) { mtLauf.abIdx = i + 1; mtLauf.abStart = mtAktivMs(); mtSignal(); }
    const el = $('#mt-abschnitt'); if (el && (!el.dataset.i || Number(el.dataset.i) !== (mtLauf.abIdx || 0) || Date.now() - (el._t || 0) > 1000)) { el.innerHTML = mtAbschnittHtml(u0); el.dataset.i = mtLauf.abIdx || 0; el._t = Date.now(); } } }
  if (!mtLauf || !location.hash.startsWith('#/mentality/lauf')) { clearInterval(mtTakt); mtTakt = null; return; }
  const rest = mtRest(); const uhr = $('#mt-uhr'); if (uhr) uhr.textContent = `${Math.floor(rest / 60000)}:${String(Math.floor(rest / 1000) % 60).padStart(2, '0')}`;
  const u = mtUeb(mtLauf.id); if (u.takt && !mtLauf.pausiertSeit) { const zyk = (u.takt.ein + u.takt.aus) * 1000; const t = (Date.now() - mtLauf.start) % zyk; const ein = t < u.takt.ein * 1000;
    const tx = $('#mt-takt-text'); if (tx) tx.textContent = ein ? 'einatmen' : 'ausatmen'; const k = $('#mt-kreis'); if (k) k.style.transform = `scale(${ein ? 0.6 + 0.4 * t / (u.takt.ein * 1000) : 1 - 0.4 * (t - u.takt.ein * 1000) / (u.takt.aus * 1000)})`; }
  if (rest <= 0 && !mtLauf.gemeldet) { mtLauf.gemeldet = true; mtLauf.aktivMsEnde = mtLauf.min * 60000; try { navigator.vibrate && navigator.vibrate(200); } catch (e) { /* */ } route(); }
}
function mtWerkzeugeHtml() {
  return `<h1>Werkzeuge</h1><p class="leise klein">Alle Übungen direkt. Mit ☆ speicherst du sie für den Start.</p>${MT_UEBUNGEN.map(u => mtKarte(u)).join('')}
  <section class="karte"><h2 style="margin-top:0">Check-in (freiwillig)</h2><p class="leise klein">Nur für dich: wie angespannt und wie wach du gerade bist. Keine Bewertung, keine Serie.</p>
    <div class="zeile"><label class="feld"><span>Anspannung 0–10</span><input id="mt-ci-an" type="number" min="0" max="10" inputmode="numeric" style="width:5em"></label><label class="feld"><span>Energie 0–10</span><input id="mt-ci-en" type="number" min="0" max="10" inputmode="numeric" style="width:5em"></label></div>
    <label class="feld"><span>Notiz (optional)</span><input id="mt-ci-no" maxlength="200"></label><button class="klein" data-a="mt-checkin">Speichern</button></section>
  ${MT_HILFE}`;
}
function mtJournalForm() {
  return `<form id="mt-journal" class="karte"><label class="feld"><span>Was beschäftigt mich?</span><textarea name="was" rows="2" maxlength="600"></textarea></label>
    <label class="feld"><span>Was davon kann ich beeinflussen?</span><textarea name="beeinflussen" rows="2" maxlength="600"></textarea></label>
    <label class="feld"><span>Nächster machbarer Schritt</span><input name="schritt" maxlength="200"></label><button class="haupt klein" type="submit">Im Journal speichern</button></form>`;
}
function mtJournalHtml() {
  const m = mtDaten(); const l = [...m.journal].sort((a, b) => b.zeit.localeCompare(a.zeit));
  return `<h1>Journal</h1><p class="leise klein">Bleibt in diesem Browser auf diesem Gerät; die App sendet es nirgendwohin. Eine Datei entsteht nur, wenn du selbst exportierst.</p>${mtJournalForm()}
  ${l.length ? `<ul class="eintraege">${l.slice(0, 50).map(j => `<li><span><b>${esc(datumDE(j.zeit.slice(0, 10)))}</b><br>${esc(j.was || '–')}${j.beeinflussen ? `<br><span class="klein">Beeinflussbar: ${esc(j.beeinflussen)}</span>` : ''}${j.schritt ? `<br><span class="klein">Nächster Schritt: ${esc(j.schritt)}</span>` : ''}</span><span><button class="klein still" data-a="mt-j-weg" data-v="${esc(j.id)}">löschen</button></span></li>`).join('')}</ul>` : '<p class="leise">Noch keine Einträge.</p>'}
  ${mtDatenHtml()}`;
}
function mtVerlaufHtml() {
  const m = mtDaten(); const v = [...m.verlauf].sort((a, b) => b.zeit.localeCompare(a.zeit)); const ci = [...m.checkins].sort((a, b) => b.zeit.localeCompare(a.zeit));
  return `<h1>Verlauf</h1><p class="leise klein">Ein einfaches Protokoll – keine Punkte, keine Serien.</p>
  ${v.length ? `<ul class="eintraege">${v.slice(0, 40).map(x => `<li><span>${esc(datumDE(x.zeit.slice(0, 10)))} · <b>${esc((mtUeb(x.id) || { name: x.id }).name)}</b> · ${esc(mtDauerText(x))}${x.frueh ? ' (vorzeitig beendet)' : ''}${x.bewertung ? ` · ${esc({ hilfreich: 'hilfreich', neutral: 'neutral', nicht: 'nicht hilfreich' }[x.bewertung])}` : ''}</span></li>`).join('')}</ul>` : '<p class="leise">Noch keine Übung abgeschlossen.</p>'}
  ${ci.length ? `<h2>Check-ins</h2><ul class="eintraege">${ci.slice(0, 30).map(c => `<li><span>${esc(datumDE(c.zeit.slice(0, 10)))} ${esc(c.zeit.slice(11, 16))} · Anspannung ${c.anspannung ?? '–'} · Energie ${c.energie ?? '–'}${c.notiz ? ' · ' + esc(c.notiz) : ''}</span><span><button class="klein still" data-a="mt-ci-weg" data-v="${esc(c.id)}">löschen</button></span></li>`).join('')}</ul>` : ''}
  ${mtDatenHtml()}`;
}
function mtDatenHtml() {
  return `<details class="karte klein"><summary><b>Meine Mentality-Daten</b> – exportieren oder löschen</summary>
    <p>Journal, Check-ins, Regeln und Verlauf liegen nur in diesem Browser. Sie sind auch in der allgemeinen Datensicherung der App enthalten.</p>
    <div class="knopfreihe"><button class="klein" data-a="mt-export">Nur Mentality exportieren (Datei)</button><button class="klein still" data-a="mt-loeschen">Alle Mentality-Daten löschen</button></div></details>`;
}
/* Scrollen unterbrechen: Absicht klären, bewusst entscheiden, Wenn-dann-Regeln. Keine Sperre anderer Apps möglich. */
const MT_ABSICHT = [['bestimmt', 'Ich wollte etwas Bestimmtes'], ['gewohnheit', 'Gewohnheit'], ['langeweile', 'Langeweile'], ['stress', 'Stress oder Ausweichen'], ['weiss_nicht', 'Weiß nicht']];
let mtAbsicht = null;
function mtScrollHtml() {
  const m = mtDaten(); const antwort = { bestimmt: 'Dann erledige genau das – und leg das Handy danach weg. Ein Timer über 5 Minuten kann helfen.', gewohnheit: 'Gewohnheiten laufen oft automatisch. Eine Wenn-dann-Regel und etwas mehr Abstand (Handy in einen anderen Raum, App vom Startbildschirm) machen den Griff bewusster.', langeweile: 'Langeweile ist kein Problem, das gelöst werden muss. Wähl etwas Kleines: 5 Minuten Pause ohne Bildschirm, ein Glas Wasser, kurz raus.', stress: 'Scrollen kann kurz ablenken, löst den Stress aber selten. Probier 2 Minuten langsames Atmen oder schreib auf, was gerade drückt.', weiss_nicht: 'Auch in Ordnung. Leg das Handy für 2 Minuten weg und schau, ob du danach noch weitermachen willst.' };
  return `<p class="klein"><a class="knopf still klein" href="#/mentality">${ico('zurueck', 'klein')} Mentality</a></p><h1>Scrollen unterbrechen</h1>
  <p>Leg das Handy kurz hin und atme zweimal langsam aus. <b>Was wolltest du eigentlich?</b></p>
  <div class="mt-situationen">${MT_ABSICHT.map(([k, t]) => `<button class="mt-situation" data-a="mt-absicht" data-v="${k}" aria-pressed="${mtAbsicht === k}">${t}</button>`).join('')}</div>
  ${mtAbsicht ? `<section class="karte"><p>${esc(antwort[mtAbsicht])}</p><div class="knopfreihe"><a class="knopf" href="#/mentality/u/pause-ohne-bildschirm">Pause ohne Bildschirm</a><a class="knopf" href="#/mentality/u/atem-langsam">2 Min. langsam atmen</a><button data-a="mt-scroll-ok">Bewusst weiter – 10 Min.</button></div></section>` : ''}
  <section class="karte"><h2 style="margin-top:0">Meine Wenn-dann-Regeln</h2><p class="leise klein">Ein konkreter Plan hilft eher als ein allgemeiner Vorsatz: „Wenn …, dann …“.</p>
    <div class="zeile"><label class="feld"><span>Wenn …</span><input id="mt-r-wenn" maxlength="100" placeholder="ich im Bett liege"></label><label class="feld"><span>dann …</span><input id="mt-r-dann" maxlength="100" placeholder="liegt das Handy auf dem Schreibtisch"></label></div><button class="klein" data-a="mt-regel">Regel speichern</button>
    ${m.regeln.length ? `<ul class="eintraege">${m.regeln.map(r => `<li><span>Wenn ${esc(r.wenn)}, dann ${esc(r.dann)}</span><span><button class="klein still" data-a="mt-regel-weg" data-v="${esc(r.id)}">löschen</button></span></li>`).join('')}</ul>` : ''}</section>
  <p class="leise klein">Die App kann andere Apps nicht sperren. Zeitlimits für Apps stellst du auf dem iPhone selbst unter Einstellungen → Bildschirmzeit ein.</p>`;
}
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a, v = b.dataset.v; if (!a.startsWith('mt-')) return; const m = mtDaten();
  switch (a) {
    case 'mt-situation': mtFrage.situation = mtFrage.situation === v ? null : v; route(); break;
    case 'mt-frage': mtFrage[b.dataset.k] = b.dataset.k === 'zeit' ? Number(v) : v; route(); break;
    case 'mt-unauff': mtFrage.unauff = b.checked; route(); break;
    case 'mt-fav': aendere(null, d => { mtDaten(); const f = new Set(d.mentality.favoriten); f.has(v) ? f.delete(v) : f.add(v); d.mentality.favoriten = [...f]; }); break;
    case 'mt-start': { const auf = ($('#mt-aufgabe') || {}).value || ''; mtLauf = { id: v, min: Number(b.dataset.min), start: Date.now(), pausiertSeit: null, pausiertMs: 0, aufgabe: auf.trim().slice(0, 120) }; location.hash = '#/mentality/lauf'; clearInterval(mtTakt); mtTakt = setInterval(mtTick, 200); break; }
    case 'mt-pause': if (!mtLauf) return; if (mtLauf.pausiertSeit) { mtLauf.pausiertMs += Date.now() - mtLauf.pausiertSeit; mtLauf.pausiertSeit = null; } else mtLauf.pausiertSeit = Date.now(); route(); break;
    case 'mt-ende': if (!mtLauf) return; mtLauf.aktivMsEnde = mtAktivMs(); mtLauf.beendet = mtRest() > 0 ? 'frueh' : 'zeit'; route(); break;
    case 'mt-ab': { if (!mtLauf) return; const n = mtUeb(mtLauf.id).schritte.length; mtLauf.abIdx = Math.max(0, Math.min(n - 1, (mtLauf.abIdx || 0) + Number(v))); mtLauf.abStart = mtAktivMs(); const el = $('#mt-abschnitt'); if (el) { el.innerHTML = mtAbschnittHtml(mtUeb(mtLauf.id)); el.dataset.i = mtLauf.abIdx; } break; }
    case 'mt-signal': aendere(null, d => { mtDaten(); d.mentality.einst = Object.assign({}, d.mentality.einst || {}, { [v]: b.checked }); }, { neuZeichnen: false }); if (b.checked && v === 'ton') mtSignal(); break;
    case 'mt-abwesend': if (!mtLauf || !mtLauf.pausiertSeit) return; if (v === 'ja') { mtLauf.pausiertSeit = null; } else { mtLauf.pausiertMs += Date.now() - mtLauf.pausiertSeit; mtLauf.pausiertSeit = null; } mtLauf.abwesendMs = null; route(); break;
    case 'mt-abbruch': mtLauf = null; clearInterval(mtTakt); mtTakt = null; location.hash = '#/mentality'; break;
    case 'mt-fokus-ergebnis': if (!mtLauf) return; mtLauf.fokusErgebnis = v; toast('Notiert'); break;
    case 'mt-bewerten': { const l = mtLauf; if (!l) return; const sek = Math.round(mtAktivMs() / 1000); const gespielt = Math.round(sek / 60);
      aendere(v ? 'Rückmeldung gespeichert' : 'Gespeichert', d => { mtDaten(); d.mentality.verlauf.push({ zeit: new Date().toISOString(), id: l.id, sek, min: gespielt, min_geplant: l.min, frueh: l.beendet === 'frueh', bewertung: v || null });
        if (mtUeb(l.id).fokus) d.mentality.fokus.push({ zeit: new Date().toISOString(), min: gespielt, geplant: l.min, geschafft: l.fokusErgebnis === 'ja' && l.beendet !== 'frueh', ergebnis: l.fokusErgebnis || null }); }, { neuZeichnen: false });
      mtLauf = null; clearInterval(mtTakt); mtTakt = null; location.hash = '#/mentality'; break; }
    case 'mt-checkin': { const z = id => { const x = ($(id) || {}).value; return x === '' || x == null ? null : Math.max(0, Math.min(10, Math.round(Number(x)))); };
      const an = z('#mt-ci-an'), en = z('#mt-ci-en'); if (an == null && en == null) { toast('Bitte mindestens einen Wert eintragen'); return; }
      aendere('Check-in gespeichert', d => { mtDaten(); d.mentality.checkins.push({ id: uid('mci'), zeit: new Date().toISOString(), anspannung: an, energie: en, notiz: (($('#mt-ci-no') || {}).value || '').trim().slice(0, 200) }); }); break; }
    case 'mt-ci-weg': aendere('Check-in gelöscht – Rückgängig möglich', d => { d.mentality.checkins = d.mentality.checkins.filter(c => c.id !== v); }); break;
    case 'mt-j-weg': aendere('Eintrag gelöscht – Rückgängig möglich', d => { d.mentality.journal = d.mentality.journal.filter(j => j.id !== v); }); break;
    case 'mt-absicht': mtAbsicht = v; route(); break;
    case 'mt-scroll-ok': timer.push({ id: uid('t'), name: 'Bewusst scrollen', quelle: 'mt', ende: Date.now() + 10 * 60000 }); timerSpeichern(); zeichneTimer(); toast('Timer 10 Min. – danach Handy weglegen'); break;
    case 'mt-regel': { const w = (($('#mt-r-wenn') || {}).value || '').trim(), dn = (($('#mt-r-dann') || {}).value || '').trim(); if (!w || !dn) { toast('Bitte beide Teile ausfüllen'); return; } aendere('Regel gespeichert', d => { mtDaten(); d.mentality.regeln.push({ id: uid('mr'), wenn: w.slice(0, 100), dann: dn.slice(0, 100) }); }); break; }
    case 'mt-regel-weg': aendere('Regel gelöscht – Rückgängig möglich', d => { d.mentality.regeln = d.mentality.regeln.filter(r => r.id !== v); }); break;
    case 'mt-export': { const blob = new Blob([JSON.stringify({ art: 'fitomat-mentality', exportiert: new Date().toISOString(), daten: mtDaten() }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const ln = document.createElement('a'); ln.href = url; ln.download = 'fitomat-mentality-' + heute() + '.json'; document.body.appendChild(ln); ln.click(); ln.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000); break; }
    case 'mt-loeschen': if (!confirm('Alle Mentality-Daten (Journal, Check-ins, Regeln, Verlauf, Gespeichert) löschen? Direkt danach ist Rückgängig möglich.')) return; aendere('Mentality-Daten gelöscht – Rückgängig möglich', d => { d.mentality = { favoriten: [], verlauf: [], journal: [], checkins: [], regeln: [], fokus: [] }; }); break;
  }
});
document.addEventListener('submit', ev => { const f = ev.target; if (f.id !== 'mt-journal') return; ev.preventDefault();
  const was = f.was.value.trim(), be = f.beeinflussen.value.trim(), sc = f.schritt.value.trim(); if (!was && !be && !sc) { toast('Leer – nichts gespeichert'); return; }
  aendere('Im Journal gespeichert', d => { mtDaten(); d.mentality.journal.push({ id: uid('mj'), zeit: new Date().toISOString(), was: was.slice(0, 600), beeinflussen: be.slice(0, 600), schritt: sc.slice(0, 200) }); }, { neuZeichnen: !location.hash.startsWith('#/mentality/lauf') });
  if (location.hash.startsWith('#/mentality/lauf')) f.outerHTML = '<p class="hinweis klein">Im Journal gespeichert.</p>'; });
window.addEventListener('hashchange', () => { if (location.hash.startsWith('#/mentality/lauf') && mtLauf && !mtTakt) mtTakt = setInterval(mtTick, 200); });
