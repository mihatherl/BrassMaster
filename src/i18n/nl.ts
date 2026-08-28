/**
 * Dutch — complete, and drafted for review by a native brass player.
 *
 * Every key, for the reason given in `de.ts`: a partial pack is how the app
 * came to translate "Back" on one screen and not the next.
 *
 * Duration names follow Dutch convention (kwartnoot, achtste, zestiende).
 * Dutch brass bands are the largest non-English audience the landing page
 * ranks for, so this is the pack most likely to be read by somebody who can
 * correct it.
 */
import type { Pack } from './index';

export const NL: Pack = {
  'common.back': 'Terug',
  'common.save': 'Opslaan',
  'common.cancel': 'Annuleren',
  'common.forget': 'Verwijderen',
  'common.done': 'Klaar',
  'common.clear': 'Wissen',
  'common.outputs': 'Uitgangen',

  'home.structured': 'Gestructureerd leren',
  'home.free': 'Vrij spelen',
  'home.start': 'Start',
  'home.myMusic': 'Mijn muziek',
  'home.instrument': 'Instrument',
  'home.clef': 'Sleutel',
  'home.language': 'Taal',
  'home.keys': 'Toonsoorten',
  'home.drill': 'Oefening',
  'home.difficulty': 'Niveau',
  'home.timeSignature': 'Maatsoort',
  'home.register': 'Ligging',
  'home.tunesFrom': 'Stukken uit',
  'home.composed': 'Gecomponeerd',
  'home.selection': 'Selectie',
  'home.medley': 'Willekeurige reeks',
  'home.defined': 'Vastgelegd',
  'home.favourWrong': 'Noten voortrekken die ik fout speel',
  'home.keysRoute': 'Speelt {route} en wisselt onderweg van toonsoort.',
  'home.doubleSharp':
    'Een boek schrijft de verhoogde zevende trap van {key} als dubbelkruis. Deze app drukt er nooit een af, dus staat er het herstellingsteken erboven.',
  'home.composedNote':
    'Nieuwe stukken, voor deze ronde geschreven. Kies een of meer bundels om in plaats daarvan genoteerde muziek te spelen.',
  'home.nothingAtLevel':
    'Op dit niveau staat hier niets genoteerd, dus worden er gecomponeerde stukken gespeeld. Probeer een ander niveau.',
  'home.medleyNote': 'Wat er ook in de gekozen bundels op het gekozen niveau staat.',
  'home.playingSteps.one': 'Speelt {n} stap in de volgorde die je hebt gezet, in zijn eigen toonsoort.',
  'home.playingSteps.other':
    'Speelt {n} stappen in de volgorde die je hebt gezet, elk in zijn eigen toonsoort.',
  'home.shortenedSpan':
    '{instrument} in {key} heeft alleen ruimte voor {span}, en dat krijg je dan ook — de beginnoot van de oefening ligt te hoog voor meer.',
  'home.writtenRange': 'Genoteerd bereik {low} tot {high}.',
  'home.writtenRangeConcert': 'Genoteerd bereik {low} tot {high} (klinkend).',

  'clef.treble': 'G-sleutel',
  'clef.bass': 'F-sleutel',
  'clefShort.treble': 'G',
  'clefShort.bass': 'F',

  'kind.drills': 'Oefeningen',
  'kind.phrases': 'Bladlezen',
  'kind.themes': "Thema's",
  'kind.drills.blurb': 'Toonladders en drieklanken.',
  'kind.phrases.blurb': 'Muzikale frasen met lijn, sprongen en rusten.',
  'kind.themes.blurb': 'Melodieën die je kent en graag speelt.',

  'picker.title': 'Stukken en toonsoorten kiezen',
  'picker.available': 'Beschikbaar',
  'picker.steps':
    'Tik een stuk aan, dan een van zijn toonsoorten, om een stap toe te voegen. Hetzelfde stuk mag er twee keer in — in twee toonsoorten, of in dezelfde.',
  'picker.note':
    'Niet elk stuk past in elke toonsoort op elk instrument. Noem hier de toonsoorten, en elk stuk hieronder biedt de toonsoorten aan die het op {instrument} kan spelen.',

  'gate.tempo': 'Tempo',
  'gate.reading': 'Lezen',
  'gate.beat': 'Maat',
  'gate.sound': 'Klank',
  'gate.fingerings': 'Grepen',
  'gate.preferences': 'Voorkeuren',
  'gate.metronome': 'Metronoom',
  'gate.conductor': 'Dirigent',
  'gate.metronomeVolume': 'Metronoomvolume',
  'gate.metronomeVolumeNote':
    'Je hoort het terwijl je het instelt. De klik is zo gestemd dat hij over een instrument in de kamer heen draagt — zet hem zachter als je tegen de stem van de app in leest.',
  'gate.setByCourse': 'Door de cursus voor dit niveau vastgelegd.',
  'gate.variableTempo': 'Wisselend tempo',
  'gate.scrollSpeed': 'Loopsnelheid',
  'gate.scrollSpeedNote':
    'Hoe snel de muziek voorbijkomt, ongeacht het tempo. De afstanden volgen mee.',
  'gate.conductorStyle': 'Slagstijl',
  'gate.conductorStyleNote':
    'Hoe scherp de tel landt. Vloeiend is moeilijker te volgen, en dat is de bedoeling.',
  'gate.cushion': 'Klankbed',
  'gate.cushionNote':
    'Hoe hard de zachte klank achter een noot is totdat je hem goed grijpt, tegenover het instrument dat het dan overneemt.',
  'gate.cushionOff':
    'Uit op deze uitgang: de klank komt {ms} ms te laat, dus het overnemende instrument zou lang na de greep te horen zijn waarop het antwoordt. Het oordeel verschijnt in plaats daarvan op het scherm.',
  'gate.timingTolerance': 'Tijdmarge',
  'gate.countIn': 'Voortellen',
  'gate.countIn.none': 'Geen',
  'gate.countIn.1': '1 maat',
  'gate.countIn.2': '2 maten',
  'gate.compound': 'Gepunteerde kwartnoten — {n} per maat, dat is je tel.',
  'beat.both': 'Metronoom + dirigent',
  'beat.none': 'Niets houdt de maat',

  'reading.scrolling': 'Lopende regel',
  'reading.paged': 'Van blad',
  'playback.reference': 'Noten voorspelen',
  'playback.off': 'Stil',
  'fingerings.trouble': 'Waar ik vastloop',
  'fingerings.never': 'Nooit',
  'fingerings.always': 'Bij elke noot',
  'register.low': 'Laag',
  'register.middle': 'Midden',
  'register.high': 'Hoog',
  'conductorStyle.smooth': 'vloeiend',
  'conductorStyle.flowing': 'stromend',
  'conductorStyle.lively': 'levendig',
  'conductorStyle.crisp': 'strak',
  'conductorStyle.marcato': 'marcato',

  'difficulty.beginner': 'Beginner',
  'difficulty.beginner.blurb':
    'Secundes en tertsen over een octaaf, kwartnoten en halve noten. Geen voortekens.',
  'difficulty.beginner.patterns': 'Kwint',
  'difficulty.beginner.patternsBlurb':
    'De eerste vijf noten van de toonsoort, op en neer, in eenvoudige kwartnoten.',
  'difficulty.easy': 'Makkelijk',
  'difficulty.easy.blurb':
    'Anderhalf octaaf, achtsten, af en toe een voorteken en een overbinding.',
  'difficulty.easy.patterns': '1 octaaf',
  'difficulty.easy.patternsBlurb': 'Een heel octaaf, op en neer, in eenvoudige kwartnoten.',
  'difficulty.medium': 'Gemiddeld',
  'difficulty.medium.blurb':
    'Grotere sprongen, gepunteerde ritmes, overbindingen over de maatstreep, voortekens in ernst.',
  'difficulty.medium.patterns': '2 octaven',
  'difficulty.medium.patternsBlurb':
    'Twee octaven, met achtsten ertussen. Gepunteerde ritmes wachten op Moeilijk.',
  'difficulty.hard': 'Moeilijk',
  'difficulty.hard.blurb': 'Twee octaven, zestiendenlopen, veel voortekens.',
  'difficulty.hard.patterns': '2 oct · gemengd',
  'difficulty.hard.patternsBlurb': 'Twee octaven, met zestiendenlopen en af en toe een rust.',

  'drill.major-scale': 'Majeurtoonladder',
  'drill.harmonic-minor-scale': 'Harmonische mineurtoonladder',
  'drill.melodic-minor-scale': 'Melodische mineurtoonladder',
  'drill.tonic-arpeggio': 'Tonica-drieklank',
  'drill.subdominant-arpeggio': 'Subdominant-drieklank',
  'drill.dominant-arpeggio': 'Dominant-drieklank',
  'drill.dominant-7th': 'Dominantseptiemakkoord',
  'drill.relative-minor-arpeggio': 'Mineur-drieklank',

  'play.tapToStart': 'Tik om te starten',
  'play.loading': 'Instrument wordt geladen…',
  'play.starting': 'Start…',
  'play.tryAgain': 'Opnieuw proberen',
  'play.stop': 'Stop',
  'play.continue': 'Verder',
  'play.pause': 'Pauze',
  'play.start': 'Start',
  'play.back': 'Terug',
  'play.ready': 'Klaar',
  'play.lockStopped':
    'De ronde stopte toen het scherm donker werd — ongezien wordt er niets beoordeeld.',
  'play.stalled': 'Het geluid startte niet',
  'play.stalledNote':
    'De telefoon heeft het geluid gestopt voordat de oefening op gang kwam — dat doet hij nadat de app weg is geweest — waardoor het voortellen blijft hangen. Opnieuw proberen start het geluid vers.',
  'play.leadNote': 'Klank {ms} ms naar voren voor {name}',
  'play.backOneBar': 'Eén maat terug',
  'play.backFiveBars': 'Vijf maten terug',
  'play.calibrationTitle': 'Kalibratie nodig',
  'play.calibrationBody':
    'Stem je luidsprekers of koptelefoon af op de tel, zodat alles samenvalt.',
  'play.calibrationWhere':
    'Je kunt {output} altijd meten via Uitgangen, in het menu Geavanceerd.',
  'play.anOutput': 'een uitgang',
  'play.calibrateNow': 'Nu kalibreren',
  'play.later': 'Later',
  'play.acceptOffset': 'Huidige afwijking aanvaarden ({ms} ms)',

  'course.back': 'Terug',
  'course.forward': 'Vooruit',
  'course.stayHere': 'Hier blijven',
  'course.atTheBar': 'bij de maatstreep',
  'course.whereYouAre': 'Waar je staat',
  'course.suggestion': 'Het voorstel',
  'course.aimingFor': 'Je doel',
  'course.progress': 'Voortgang',
  'course.import': 'Cursus importeren…',
  'course.export': 'Exporteren',
  'course.delete': 'Verwijderen',
  'course.course': 'Cursus',

  'practice.backStep': 'Een stap terug',
  'practice.forwardStep': 'Een stap vooruit',
  'practice.clearIt': 'Opheffen',
  'practice.nothingAbove': 'Er staat niets hogers in deze cursus om op te mikken.',
  'practice.nothingSet': 'Niets gezet. Kies waar je heen gaat.',
  'practice.progressDoor': 'Wat er beter is geworden, en waaraan te werken',

  'results.correct': 'Goed',
  'results.wrongValves': 'Verkeerde ventielen',
  'results.missed': 'Gemist',
  'results.another': 'Nog een',
  'results.sameAgain': 'Nog eens hetzelfde',
  'results.settings': 'Instellingen',
  'results.dontCount': 'Tel deze ronde niet mee — ik speelde niet echt',
  'results.windowed':
    'Over de laatste {bars} maten — {whole}% over de hele ronde, langste reeks {streak}',
  'results.wholeRun': '{correct} van {total} noten, langste reeks {streak}',
  'results.beyond.one':
    '{n} maat voorbij de lengte die je koos — de muziek ging door, en jij ook.',
  'results.beyond.other':
    '{n} maten voorbij de lengte die je koos — de muziek ging door, en jij ook.',
  'results.averageLate': 'Gemiddeld {ms} ms te laat bij de noten die je goed had.',
  'results.notCounted':
    'Er is niets gespeeld, dus deze ronde telt niet mee voor je voortgang.',
  'results.whatYouPlayed': 'Wat je speelde',
  'results.allGreen': 'Alle noten groen — niets te verbeteren.',
  'results.fingeringNote': 'De greep onder een noot is de greep die hij wilde.',
  'results.worthDrilling': 'De moeite van het oefenen waard',
  'results.drillingNote':
    'Verzameld over meerdere sessies op {instrument} in de {clef}-sleutel, en genoteerd in de toonsoort die je net hebt gespeeld.',

  'progress.title': 'Voortgang',
  'progress.nothingYet':
    'Nog niets opgeslagen. Speel een paar rondes, dan vult dit zich vanzelf.',
  'progress.runs.one': '{n} ronde',
  'progress.runs.other': '{n} rondes',
  'progress.sittings.one': '{n} sessie',
  'progress.sittings.other': '{n} sessies',
  'progress.tally': '{runs} in {sittings}.',
  'progress.recent': 'Recente sessies',
  'progress.recentNote': 'Het gemiddelde van elke sessie, nieuwste eerst.',
  'progress.notEnough':
    'Nog te weinig om te zeggen wat zwak is — een paar rondes meer en hier staat iets bruikbaars.',
  'progress.rhythm': 'Ritmes',
  'progress.interval': 'Intervallen',
  'progress.key': 'Toonsoorten',

  'outputs.title': 'Uitgangen',
  'outputs.intro':
    'Elke manier om de app te horen loopt er iets op achter, en elke manier met een ander bedrag — een bluetoothkoptelefoon veel, een bedrade minder, en de eigen luidspreker van dit toestel wat zijn hardware kost. Meet elke uitgang één keer, en de app haalt de klank precies zoveel naar voren wanneer die gekozen is.',
  'outputs.choosing':
    'Kiezen verplaatst de klank hier niet. Je telefoon bepaalt waar hij speelt — steek een koptelefoon in en hij speelt daardoor, wat er hieronder ook geselecteerd is. De keuze vertelt de app welke uitgang echt in je oren zit, zodat de juiste correctie geldt; wissel je naar een andere, zeg het dan hier, want de app merkt het niet uit zichzelf.',
  'outputs.notMeasured': 'Nog niet gemeten',
  'outputs.lead': 'Klank {ms} ms naar voren',
  'outputs.measure': 'Meten',
  'outputs.measureNamed': '{name} meten',
  'outputs.measureNamedAgain': '{name} opnieuw meten',
  'outputs.forgetNamed': '{name} verwijderen',
  'outputs.add': 'Uitgang toevoegen',

  'calibrate.title': '{name} meten',
  'calibrate.intro':
    'Luister via de uitgang die je wilt meten. Elke noot hoort te klinken op het moment dat zijn notenkop de lijn kruist — komt de klank na wat je ziet, haal hem dan naar voren tot de twee samenvallen.',
  'calibrate.late': 'Klank is te laat — naar voren halen',
  'calibrate.early': 'Klank is te vroeg — terugzetten',
  'calibrate.lead': 'Klank naar voren gehaald',
  'calibrate.leadAria': 'Klank naar voren gehaald, in milliseconden',
  'calibrate.drag':
    'Of sleep, als de klank er ver naast zit. Bluetoothkoptelefoons lopen vaak een vijfde seconde achter.',
  'calibrate.name': 'Hoe heet deze uitgang?',
  'calibrate.namePlaceholder': 'Koptelefoon',

  'import.intro':
    'Open een MusicXML-partij — .musicxml of .mxl, zoals MuseScore, Sibelius of Finale die exporteren. Herhalingen, eerste en tweede haken en D.S.-sprongen worden uitgeschreven gespeeld. Al het andere wordt genoemd in plaats van voor je verborgen.',
  'import.detail': '{part} · {bars} maten',
  'import.forgetNamed': '{title} verwijderen',
  'import.reading': 'Wordt gelezen…',
  'import.choose': 'Bestand kiezen',
  'import.whichPart': 'Welke partij',
  'import.divides': 'Waar de partij zich deelt, speel de',
  'import.upper': 'Bovenste lijn',
  'import.lower': 'Onderste lijn',
  'import.divisiNote':
    'Er wordt één lijn gelezen, zodat notatie, weergave en beoordeling het eens zijn — welke je sectie je ook gaf. Waar de twee een octaaf uit elkaar liggen, is de greep toch dezelfde.',
  'import.count': '{bars} maten, {notes} noten — uit {from}',
  'import.asks':
    'Vraagt {bpm} tellen per minuut{changes}. De temposchuif blijft van jou — de aanwijzingen zijn genoteerd, niet opgevolgd.',
  'import.changes.one': ' en wisselt later één keer van tempo',
  'import.changes.other': ' en wisselt later {n} keer van tempo',
  'import.beforeYouPlay': 'Voordat je speelt:',
  'import.playIt': 'Spelen',
  'import.chooseBars': 'Maten kiezen',
  'import.keep': 'Bewaren',
  'import.kept': 'Bewaard in Mijn muziek',
  'import.noStorage':
    'Deze browser bewaart niets tussen sessies — hoogstwaarschijnlijk een privévenster. Het stuk speelt nu en is weg zodra het tabblad dat is.',

  'score.label': 'De partij, zoals gedrukt. Tik een maat aan om hem te kiezen.',
  'score.bar': 'Maat {list}',
  'score.bars': 'Maten {list}',
  'score.inAll': ' — {n} in totaal',
  'score.tapFirst': 'Tik de eerste maat van een reeks aan, dan de laatste.',
  'score.tapLast': 'Maat {bar} — tik nu de laatste maat aan.',
  'score.chooseSome': 'Maten kiezen',
  'score.practise.one': '{n} maat oefenen',
  'score.practise.other': '{n} maten oefenen',
  'score.startAgain': 'Opnieuw beginnen',

  'range.choose': 'Bereik zelf kiezen',
  'range.lowest': 'Laagste',
  'range.highest': 'Hoogste',
  'range.stave': 'Bereik: {low} tot {high}',
  'range.note': '{span} — elke noot erin, zonder het midden voor te trekken.',
  'dial.key': 'Toonsoort',
  'dial.tempo': 'Tempo',
  'dial.tempoValue': '{n} tellen per minuut',
  'dial.valves': 'Ventielen',

  'error.title': 'Er ging iets stuk',
  'error.body':
    'De app is gestopt in plaats van je iets verkeerds te tonen. Deze fout is het melden waard — het bericht hieronder is het bruikbare deel.',
  'error.version': 'versie {version} · gebouwd {built}',
  'error.back': 'Terug naar het begin',
};
