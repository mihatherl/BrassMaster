/**
 * German — complete, and drafted for review by a native brass player.
 *
 * Every key, deliberately: this pack used to hold 52 and lean on the English
 * fallback for the rest, which is how the app came to show "Zurück" on one
 * screen and "Back" on the next. A complete pack cannot do that. Where a
 * phrase is uncertain it is marked, and the whole file wants a pass from
 * somebody who plays in German — `Blattspiel`, `Griffe` and the level names
 * are the words a German band actually uses, but that is the assistant's
 * reading of them, not a player's.
 *
 * Duration names follow German convention (Viertel, Achtel, Sechzehntel)
 * rather than transliterating the English crotchet/quaver.
 */
import type { Pack } from './index';

export const DE: Pack = {
  'common.back': 'Zurück',
  'common.save': 'Speichern',
  'common.cancel': 'Abbrechen',
  'common.forget': 'Entfernen',
  'common.done': 'Fertig',
  'common.clear': 'Leeren',

  'home.structured': 'Geführtes Lernen',
  'home.free': 'Freies Spiel',
  'home.start': 'Start',
  'home.myMusic': 'Meine Noten',
  'home.instrument': 'Instrument',
  'home.clef': 'Schlüssel',
  'home.language': 'Sprache',
  'home.keys': 'Tonarten',
  'home.drill': 'Übung',
  'home.difficulty': 'Schwierigkeit',
  'home.timeSignature': 'Taktart',
  'home.register': 'Lage',
  'home.tunesFrom': 'Stücke aus',
  'home.composed': 'Komponiert',
  'home.selection': 'Auswahl',
  'home.medley': 'Zufällige Folge',
  'home.defined': 'Festgelegt',
  'home.favourWrong': 'Töne bevorzugen, die mir schwerfallen',
  'home.keysRoute': 'Spielt {route} und wechselt dabei die Tonart.',
  'home.doubleSharp':
    'Ein Notenbuch schreibt die erhöhte siebte Stufe von {key} als Doppelkreuz. Diese App druckt nie eines, also steht dort das Auflösungszeichen darüber.',
  'home.composedNote':
    'Neue Stücke, für diesen Durchlauf geschrieben. Wähle eine oder mehrere Sammlungen, um stattdessen notierte Musik zu spielen.',
  'home.nothingAtLevel':
    'Auf dieser Stufe ist hier nichts notiert, also werden komponierte Stücke gespielt. Probiere eine andere Stufe.',
  'home.medleyNote': 'Was immer in den gewählten Sammlungen auf der gewählten Stufe steht.',
  'home.playingSteps.one': 'Spielt {n} Schritt in der von dir gesetzten Reihenfolge, in seiner eigenen Tonart.',
  'home.playingSteps.other':
    'Spielt {n} Schritte in der von dir gesetzten Reihenfolge, jeden in seiner eigenen Tonart.',
  'home.shortenedSpan':
    '{instrument} in {key} hat nur Platz für {span}, und das bekommst du — der Anfangston der Übung liegt zu hoch für mehr.',
  'home.writtenRange': 'Notierter Umfang {low} bis {high}.',
  'home.writtenRangeConcert': 'Notierter Umfang {low} bis {high} (klingend).',

  'clef.treble': 'Violinschlüssel',
  'clef.bass': 'Bassschlüssel',
  'clefShort.treble': 'Violin',
  'clefShort.bass': 'Bass',

  'kind.drills': 'Übungen',
  'kind.phrases': 'Blattspiel',
  'kind.themes': 'Themen',
  'kind.drills.blurb': 'Tonleitern und Dreiklänge.',
  'kind.phrases.blurb': 'Musikalische Phrasen mit Verlauf, Sprüngen und Pausen.',
  'kind.themes.blurb': 'Melodien, die du kennst und gern spielst.',

  'picker.title': 'Stücke und Tonarten wählen',
  'picker.available': 'Verfügbar',
  'picker.steps':
    'Tippe ein Stück an, dann eine seiner Tonarten, um einen Schritt hinzuzufügen. Dasselbe Stück darf zweimal vorkommen — in zwei Tonarten oder in derselben.',
  'picker.note':
    'Nicht jedes Stück passt in jede Tonart auf jedem Instrument. Benenne hier die Tonarten, und jedes Stück darunter bietet die an, die es auf {instrument} spielen kann.',

  'gate.tempo': 'Tempo',
  'gate.reading': 'Lesen',
  'gate.beat': 'Takt',
  'gate.sound': 'Klang',
  'gate.fingerings': 'Griffe',
  'gate.preferences': 'Einstellungen',
  'gate.metronome': 'Metronom',
  'gate.conductor': 'Dirigent',
  'gate.metronomeVolume': 'Metronom-Lautstärke',
  'gate.metronomeVolumeNote':
    'Du hörst es, während du es einstellst. Der Klick ist so gestimmt, dass er über ein Instrument im Raum trägt — dreh ihn leiser, wenn du gegen die Stimme der App liest.',
  'gate.setByCourse': 'Vom Kurs für diese Stufe festgelegt.',
  'gate.variableTempo': 'Wechselndes Tempo',
  'gate.scrollSpeed': 'Lauftempo',
  'gate.scrollSpeedNote':
    'Wie schnell die Noten wandern, unabhängig vom Tempo. Die Abstände folgen mit.',
  'gate.conductorStyle': 'Schlagart',
  'gate.conductorStyleNote':
    'Wie scharf der Schlag ankommt. Weich ist schwerer zu folgen, und das ist Absicht.',
  'gate.cushion': 'Klangbett',
  'gate.cushionNote':
    'Wie laut der weiche Klang hinter einem Ton ist, bis du ihn richtig greifst — gegenüber dem Instrument, das dann übernimmt.',
  'gate.cushionOff':
    'Auf diesem Ausgang aus: sein Klang kommt {ms} ms zu spät, das übernehmende Instrument wäre also lange nach dem Griff zu hören, auf den es antwortet. Die Bewertung erscheint stattdessen auf dem Bildschirm.',
  'gate.timingTolerance': 'Zeittoleranz',
  'gate.countIn': 'Einzähler',
  'gate.countIn.none': 'Keiner',
  'gate.countIn.1': '1 Takt',
  'gate.countIn.2': '2 Takte',
  'gate.compound': 'Punktierte Viertel — {n} pro Takt, das ist dein Zählschlag.',
  'beat.both': 'Metronom + Dirigent',
  'beat.none': 'Nichts hält den Takt',

  'reading.scrolling': 'Laufende Zeile',
  'reading.paged': 'Vom Blatt',
  'playback.reference': 'Noten vorspielen',
  'playback.off': 'Stumm',
  'fingerings.trouble': 'Wo ich hänge',
  'fingerings.never': 'Nie',
  'fingerings.always': 'Bei jedem Ton',
  'register.low': 'Tief',
  'register.middle': 'Mittel',
  'register.high': 'Hoch',
  'conductorStyle.smooth': 'weich',
  'conductorStyle.flowing': 'fließend',
  'conductorStyle.lively': 'lebhaft',
  'conductorStyle.crisp': 'straff',
  'conductorStyle.marcato': 'marcato',

  'difficulty.beginner': 'Anfänger',
  'difficulty.beginner.blurb':
    'Sekunden und Terzen über eine Oktave, Viertel und Halbe. Keine Vorzeichen.',
  'difficulty.beginner.patterns': 'Quinte',
  'difficulty.beginner.patternsBlurb':
    'Die ersten fünf Töne der Tonart, auf und ab, in schlichten Vierteln.',
  'difficulty.easy': 'Leicht',
  'difficulty.easy.blurb':
    'Anderthalb Oktaven, Achtel, gelegentlich ein Vorzeichen und ein Haltebogen.',
  'difficulty.easy.patterns': '1 Oktave',
  'difficulty.easy.patternsBlurb': 'Eine volle Oktave, auf und ab, in schlichten Vierteln.',
  'difficulty.medium': 'Mittel',
  'difficulty.medium.blurb':
    'Weitere Sprünge, punktierte Rhythmen, Bögen über den Taktstrich, Vorzeichen im Ernst.',
  'difficulty.medium.patterns': '2 Oktaven',
  'difficulty.medium.patternsBlurb':
    'Zwei Oktaven, mit Achteln gemischt. Punktierte Rhythmen warten auf Schwer.',
  'difficulty.hard': 'Schwer',
  'difficulty.hard.blurb': 'Zwei Oktaven, Sechzehntelläufe, häufige Vorzeichen.',
  'difficulty.hard.patterns': '2 Okt · gemischt',
  'difficulty.hard.patternsBlurb':
    'Zwei Oktaven, mit Sechzehntelläufen und gelegentlicher Pause.',

  'drill.major-scale': 'Durtonleiter',
  'drill.harmonic-minor-scale': 'Harmonische Molltonleiter',
  'drill.melodic-minor-scale': 'Melodische Molltonleiter',
  'drill.tonic-arpeggio': 'Tonika-Dreiklang',
  'drill.subdominant-arpeggio': 'Subdominant-Dreiklang',
  'drill.dominant-arpeggio': 'Dominant-Dreiklang',
  'drill.dominant-7th': 'Dominantseptakkord',
  'drill.relative-minor-arpeggio': 'Moll-Dreiklang',

  'play.tapToStart': 'Zum Starten tippen',
  'play.loading': 'Instrument wird geladen…',
  'play.starting': 'Startet…',
  'play.tryAgain': 'Nochmal versuchen',
  'play.stop': 'Stopp',
  'play.continue': 'Weiter',
  'play.pause': 'Pause',
  'play.start': 'Start',
  'play.ready': 'Bereit',
  'play.lockStopped':
    'Der Durchlauf endete, als der Bildschirm dunkel wurde — ungesehen wird nichts bewertet.',
  'play.stalled': 'Der Ton kam nicht',
  'play.stalledNote':
    'Das Telefon hat den Klang gestoppt, bevor die Übung anlief — das tut es, nachdem die App weg war — und der Einzähler bleibt hängen. „Nochmal versuchen“ startet den Klang neu.',
  'play.leadNote': 'Klang {ms} ms früher für {name}',
  'play.backOneBar': 'Einen Takt zurück',
  'play.backFiveBars': 'Fünf Takte zurück',
  'play.calibrationTitle': 'Kalibrierung nötig',
  'play.calibrationBody':
    'Stimme deine Lautsprecher oder Kopfhörer mit dem Schlag ab, damit alles zusammenpasst.',
  'play.calibrationWhere':
    'Du kannst {output} jederzeit unter „Ausgänge“ im Menü „Erweitert“ messen.',
  'play.anOutput': 'einen Ausgang',
  'play.calibrateNow': 'Jetzt kalibrieren',
  'play.later': 'Später',
  'play.acceptOffset': 'Aktuellen Versatz übernehmen ({ms} ms)',

  'results.correct': 'Richtig',
  'results.wrongValves': 'Falsche Ventile',
  'results.missed': 'Verpasst',
  'results.another': 'Noch eins',
  'results.sameAgain': 'Nochmal dasselbe',
  'results.settings': 'Einstellungen',
  'results.dontCount': 'Diesen Durchlauf nicht werten — ich habe nicht wirklich gespielt',
  'results.windowed':
    'Über die letzten {bars} Takte — {whole}% über den ganzen Durchlauf, längste Serie {streak}',
  'results.wholeRun': '{correct} von {total} Tönen, längste Serie {streak}',
  'results.beyond.one':
    '{n} Takt über die gewählte Länge hinaus — die Musik lief weiter, und du auch.',
  'results.beyond.other':
    '{n} Takte über die gewählte Länge hinaus — die Musik lief weiter, und du auch.',
  'results.averageLate':
    'Im Schnitt {ms} ms zu spät bei den Tönen, die du getroffen hast.',
  'results.notCounted':
    'Es wurde nichts gespielt, also zählt dieser Durchlauf nicht für deinen Fortschritt.',
  'results.whatYouPlayed': 'Was du gespielt hast',
  'results.allGreen': 'Alle Töne grün — nichts zu verbessern.',
  'results.fingeringNote': 'Der Griff unter einem Ton ist der, den er wollte.',
  'results.worthDrilling': 'Übenswert',
  'results.drillingNote':
    'Über mehrere Sitzungen auf {instrument} im {clef}-Schlüssel gesammelt und in der Tonart notiert, die du gerade gespielt hast.',

  'outputs.title': 'Ausgänge',
  'outputs.intro':
    'Jeder Weg, die App zu hören, hinkt ihr etwas hinterher, und jeder um einen anderen Betrag — Bluetooth-Kopfhörer um viel, kabelgebundene um weniger, und der eigene Lautsprecher dieses Geräts um das, was seine Hardware kostet. Miss jeden einmal, und die App zieht den Klang um genau so viel vor, wann immer er gewählt ist.',
  'outputs.choosing':
    'Die Wahl hier verschiebt den Klang nicht. Dein Telefon entscheidet, wo gespielt wird — steck Kopfhörer ein, und es spielt darüber, was auch immer unten ausgewählt ist. Die Wahl sagt der App, welcher Ausgang wirklich in deinen Ohren steckt, damit die richtige Korrektur greift; wenn du wechselst, sag es hier, denn die App merkt es nicht von allein.',
  'outputs.notMeasured': 'Noch nicht gemessen',
  'outputs.lead': 'Klang {ms} ms früher',
  'outputs.measure': 'Messen',
  'outputs.measureNamed': '{name} messen',
  'outputs.measureNamedAgain': '{name} erneut messen',
  'outputs.forgetNamed': '{name} entfernen',
  'outputs.add': 'Ausgang hinzufügen',

  'calibrate.title': '{name} messen',
  'calibrate.intro':
    'Hör über den Ausgang, den du messen willst. Jeder Ton soll in dem Moment klingen, in dem sein Notenkopf die Linie kreuzt — kommt der Klang nach dem, was du siehst, zieh ihn vor, bis beides zusammenfällt.',
  'calibrate.late': 'Klang kommt zu spät — vorziehen',
  'calibrate.early': 'Klang kommt zu früh — zurückschieben',
  'calibrate.lead': 'Klang vorgezogen um',
  'calibrate.leadAria': 'Klang vorgezogen, in Millisekunden',
  'calibrate.drag':
    'Oder zieh den Regler, wenn der Klang weit daneben liegt. Bluetooth-Kopfhörer hinken oft eine Fünftelsekunde hinterher.',
  'calibrate.name': 'Wie heißt dieser Ausgang?',
  'calibrate.namePlaceholder': 'Kopfhörer',

  'range.choose': 'Umfang selbst wählen',
  'range.lowest': 'Tiefster',
  'range.highest': 'Höchster',
  'range.stave': 'Umfang: {low} bis {high}',
  'range.note': '{span} — jeder Ton darin, ohne die Mitte zu bevorzugen.',
  'dial.key': 'Tonart',
  'dial.tempo': 'Tempo',
  'dial.tempoValue': '{n} Schläge pro Minute',
  'dial.valves': 'Ventile',

  'error.title': 'Etwas ist kaputtgegangen',
  'error.body':
    'Die App hat angehalten, statt dir etwas Falsches zu zeigen. Dieser Fehler ist eine Meldung wert — die Nachricht unten ist der nützliche Teil.',
  'error.version': 'Version {version} · gebaut {built}',
  'error.back': 'Zurück zum Anfang',
};
