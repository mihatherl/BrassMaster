/**
 * Italian — complete, and drafted for review by a native brass player.
 *
 * Addressed as `tu`, matching the other packs: a practice-room tool speaks
 * the way a teacher in the room does.
 *
 * Duration names follow Italian convention (semiminima, croma, semicroma),
 * and the dynamics-and-articulation vocabulary the app already borrows —
 * `marcato`, `tempo` — is left alone, since it is Italian to begin with.
 * `Lettura a prima vista` is the standing term for sight-reading and is what
 * that tab says; Italy's `bande musicali` use exactly this instrumentation.
 */
import type { Pack } from './index';

export const IT: Pack = {
  'common.back': 'Indietro',
  'common.save': 'Salva',
  'common.cancel': 'Annulla',
  'common.forget': 'Dimentica',
  'common.done': 'Fatto',
  'common.clear': 'Svuota',

  'home.structured': 'Apprendimento guidato',
  'home.free': 'Gioco libero',
  'home.start': 'Inizia',
  'home.myMusic': 'Le mie partiture',
  'home.instrument': 'Strumento',
  'home.clef': 'Chiave',
  'home.language': 'Lingua',
  'home.keys': 'Tonalità',
  'home.drill': 'Esercizio',
  'home.difficulty': 'Difficoltà',
  'home.timeSignature': 'Tempo in chiave',
  'home.register': 'Registro',
  'home.tunesFrom': 'Brani da',
  'home.composed': 'Composto',
  'home.selection': 'Selezione',
  'home.medley': 'Serie casuale',
  'home.defined': 'Definita',
  'home.favourWrong': 'Privilegia le note che sbaglio',
  'home.keysRoute': 'Suona {route}, cambiando tonalità strada facendo.',
  'home.doubleSharp':
    'Un metodo scrive la settima innalzata di {key} con il doppio diesis. Questa applicazione non ne stampa mai uno, quindi compare il bequadro sopra.',
  'home.composedNote':
    'Brani nuovi, scritti per questa sessione. Scegli una o più raccolte per suonare invece musica scritta.',
  'home.nothingAtLevel':
    'A questo livello qui non c’è nulla di scritto, quindi suoneranno brani composti. Prova un altro livello.',
  'home.medleyNote': 'Tutto ciò che si trova nelle raccolte scelte, al livello scelto.',
  'home.playingSteps.one': 'Suona {n} passo nell’ordine che hai stabilito, nella sua tonalità.',
  'home.playingSteps.other':
    'Suona {n} passi nell’ordine che hai stabilito, ciascuno nella propria tonalità.',
  'home.shortenedSpan':
    '{instrument} in {key} ha spazio solo per {span}, quindi è quello che otterrai: la nota iniziale dell’esercizio sta troppo in alto per andare oltre.',
  'home.writtenRange': 'Estensione scritta da {low} a {high}.',
  'home.writtenRangeConcert': 'Estensione scritta da {low} a {high} (suono reale).',

  'clef.treble': 'Chiave di violino',
  'clef.bass': 'Chiave di basso',
  'clefShort.treble': 'Violino',
  'clefShort.bass': 'Basso',

  'kind.drills': 'Esercizi',
  'kind.phrases': 'Prima vista',
  'kind.themes': 'Temi',
  'kind.drills.blurb': 'Scale e arpeggi.',
  'kind.phrases.blurb': 'Frasi musicali con profilo, salti e pause.',
  'kind.themes.blurb': 'Melodie che conosci e che ti piace suonare.',

  'picker.title': 'Scegli brani e tonalità',
  'picker.available': 'Disponibili',
  'picker.steps':
    'Tocca un brano, poi una delle sue tonalità, per aggiungere un passo. Lo stesso brano può entrare due volte: in due tonalità, o nella stessa.',
  'picker.note':
    'Non ogni brano sta in ogni tonalità su ogni strumento. Indica qui le tonalità e ogni brano qui sotto offrirà quelle che può suonare con {instrument}.',

  'gate.tempo': 'Tempo',
  'gate.reading': 'Lettura',
  'gate.beat': 'Battito',
  'gate.sound': 'Suono',
  'gate.fingerings': 'Diteggiature',
  'gate.preferences': 'Preferenze',
  'gate.metronome': 'Metronomo',
  'gate.conductor': 'Direttore',
  'gate.metronomeVolume': 'Volume del metronomo',
  'gate.metronomeVolumeNote':
    'Lo senti mentre lo regoli. Il clic è intonato per passare sopra uno strumento nella stanza: abbassalo quando leggi contro la voce dell’applicazione.',
  'gate.key': 'Tonalità',
  'gate.yourChoice': 'In questo livello la scegli tu',
  'gate.keyRemembered': 'Ricordata per il prossimo livello che ti lascia la tonalità.',
  'gate.setByCourse': 'Stabilito dal corso per questo livello.',
  'gate.variableTempo': 'Tempo variabile',
  'gate.scrollSpeed': 'Velocità di scorrimento',
  'gate.scrollSpeedNote':
    'Quanto velocemente scorre la musica, qualunque sia il tempo. La spaziatura la segue.',
  'gate.conductorStyle': 'Stile della battuta',
  'gate.conductorStyleNote':
    'Con quanta nettezza cade il battito. Il legato è più difficile da seguire, ed è voluto.',
  'gate.cushion': 'Tappeto sonoro',
  'gate.cushionNote':
    'Quanto è forte il suono morbido dietro una nota finché non la diteggi giusta, rispetto allo strumento che subentra quando ci riesci.',
  'gate.cushionOff':
    'Disattivato su questa uscita: il suo suono arriva {ms} ms in ritardo, quindi lo strumento che subentra si sentirebbe molto dopo la diteggiatura a cui risponde. Il giudizio compare invece sullo schermo.',
  'gate.timingTolerance': 'Tolleranza ritmica',
  'gate.countIn': 'Battute di avvio',
  'gate.countIn.none': 'Nessuna',
  'gate.countIn.1': '1 battuta',
  'gate.countIn.2': '2 battute',
  'gate.compound': 'Semiminime col punto: {n} per battuta, il tempo che conti.',
  'beat.both': 'Metronomo + direttore',
  'beat.none': 'Niente tiene il tempo',

  'reading.scrolling': 'Riga scorrevole',
  'reading.paged': 'Leggi la pagina',
  'playback.reference': 'Suona le note',
  'playback.off': 'Muto',
  'fingerings.trouble': 'Dove mi blocco',
  'fingerings.never': 'Mai',
  'fingerings.always': 'Su ogni nota',
  'register.low': 'Grave',
  'register.middle': 'Medio',
  'register.high': 'Acuto',
  'conductorStyle.smooth': 'legato',
  'conductorStyle.flowing': 'scorrevole',
  'conductorStyle.lively': 'vivace',
  'conductorStyle.crisp': 'netto',
  'conductorStyle.marcato': 'marcato',

  'difficulty.beginner': 'Principiante',
  'difficulty.beginner.blurb':
    'Seconde e terze nell’arco di un’ottava, semiminime e minime. Nessuna alterazione.',
  'difficulty.beginner.patterns': 'Quinta',
  'difficulty.beginner.patternsBlurb':
    'Le prime cinque note della tonalità, salendo e scendendo, in semplici semiminime.',
  'difficulty.easy': 'Facile',
  'difficulty.easy.blurb':
    'Un’ottava e mezza, crome, qualche alterazione e legatura di valore ogni tanto.',
  'difficulty.easy.patterns': '1 ottava',
  'difficulty.easy.patternsBlurb':
    'Un’ottava intera, salendo e scendendo, in semplici semiminime.',
  'difficulty.medium': 'Medio',
  'difficulty.medium.blurb':
    'Salti più ampi, ritmi puntati, legature oltre la stanghetta, alterazioni sul serio.',
  'difficulty.medium.patterns': '2 ottave',
  'difficulty.medium.patternsBlurb':
    'Due ottave, con crome mescolate. I ritmi puntati aspettano il livello Difficile.',
  'difficulty.hard': 'Difficile',
  'difficulty.hard.blurb': 'Due ottave, passaggi di semicrome, alterazioni frequenti.',
  'difficulty.hard.patterns': '2 ott · misto',
  'difficulty.hard.patternsBlurb':
    'Due ottave, con passaggi di semicrome e qualche pausa.',

  'drill.major-scale': 'Scala maggiore',
  'drill.harmonic-minor-scale': 'Scala minore armonica',
  'drill.melodic-minor-scale': 'Scala minore melodica',
  'drill.tonic-arpeggio': 'Arpeggio di tonica',
  'drill.subdominant-arpeggio': 'Arpeggio di sottodominante',
  'drill.dominant-arpeggio': 'Arpeggio di dominante',
  'drill.dominant-7th': 'Settima di dominante',
  'drill.relative-minor-arpeggio': 'Arpeggio minore',

  'play.tapToStart': 'Tocca per iniziare',
  'play.loading': 'Caricamento dello strumento…',
  'play.starting': 'Avvio…',
  'play.tryAgain': 'Riprova',
  'play.stop': 'Ferma',
  'play.continue': 'Continua',
  'play.pause': 'Pausa',
  'play.start': 'Inizia',
  'play.ready': 'Pronto',
  'play.lockStopped':
    'La sessione si è fermata quando lo schermo si è spento: nulla viene giudicato senza essere visto.',
  'play.stalled': 'Il suono non è partito',
  'play.stalledNote':
    'Il telefono ha interrotto il suono prima che l’esercizio partisse — lo fa dopo che l’applicazione è rimasta inattiva — e le battute di avvio restano bloccate. Riprova riavvia il suono da capo.',
  'play.leadNote': 'Suono anticipato di {ms} ms per {name}',
  'play.backOneBar': 'Una battuta indietro',
  'play.backFiveBars': 'Cinque battute indietro',
  'play.calibrationTitle': 'Serve la calibrazione',
  'play.calibrationBody':
    'Regola gli altoparlanti o le cuffie sul battito, così tutto cade insieme.',
  'play.calibrationWhere':
    'Puoi misurare {output} quando vuoi da Uscite, nel menu Avanzate.',
  'play.anOutput': 'un’uscita',
  'play.calibrateNow': 'Calibra ora',
  'play.later': 'Più tardi',
  'play.acceptOffset': 'Accetta lo scarto attuale ({ms} ms)',

  'results.correct': 'Giuste',
  'results.wrongValves': 'Pistoni sbagliati',
  'results.missed': 'Mancate',
  'results.another': 'Un’altra',
  'results.sameAgain': 'La stessa di nuovo',
  'results.settings': 'Impostazioni',
  'results.dontCount': 'Non contare questa sessione: non stavo suonando davvero',
  'results.windowed':
    'Sulle ultime {bars} battute — {whole}% su tutta la sessione, serie più lunga {streak}',
  'results.wholeRun': '{correct} note su {total}, serie più lunga {streak}',
  'results.beyond.one':
    '{n} battuta oltre la lunghezza che hai scelto: la musica è andata avanti, e anche tu.',
  'results.beyond.other':
    '{n} battute oltre la lunghezza che hai scelto: la musica è andata avanti, e anche tu.',
  'results.averageLate': 'In media {ms} ms di ritardo sulle note giuste.',
  'results.notCounted':
    'Non è stato suonato nulla, quindi questa sessione non conta per i tuoi progressi.',
  'results.whatYouPlayed': 'Quello che hai suonato',
  'results.allGreen': 'Tutte le note in verde: niente da correggere.',
  'results.fingeringNote': 'La diteggiatura sotto una nota è quella che chiedeva.',
  'results.worthDrilling': 'Vale la pena lavorarci',
  'results.drillingNote':
    'Accumulato su più sedute con {instrument} in chiave di {clef}, e scritto nella tonalità che hai appena suonato.',

  'outputs.title': 'Uscite',
  'outputs.intro':
    'Ogni modo di sentire l’applicazione è un po’ in ritardo su di essa, e ciascuno di una quantità diversa: le cuffie Bluetooth di molto, quelle con il filo di meno, e l’altoparlante del dispositivo di quanto costa la sua elettronica. Misura ciascuna una volta e l’applicazione anticiperà il suono esattamente di quel tanto ogni volta che è scelta.',
  'outputs.choosing':
    'Scegliere qui non sposta il suono. È il telefono a decidere da dove esce: collega le cuffie e suonerà da lì, qualunque cosa sia selezionata qui sotto. La scelta dice all’applicazione quale uscita hai davvero nelle orecchie, così vale la correzione giusta; quando passi a un’altra, dillo qui, perché l’applicazione non può accorgersene da sola.',
  'outputs.notMeasured': 'Non ancora misurata',
  'outputs.lead': 'Suono anticipato di {ms} ms',
  'outputs.measure': 'Misura',
  'outputs.measureNamed': 'Misura {name}',
  'outputs.measureNamedAgain': 'Misura di nuovo {name}',
  'outputs.forgetNamed': 'Dimentica {name}',
  'outputs.add': 'Aggiungi un’uscita',

  'calibrate.title': 'Misura {name}',
  'calibrate.intro':
    'Ascolta attraverso l’uscita che vuoi misurare. Ogni nota deve suonare nel momento in cui la sua testa attraversa la linea: se il suono arriva dopo quello che vedi, anticipalo finché i due non cadono insieme.',
  'calibrate.late': 'Il suono è in ritardo: anticipalo',
  'calibrate.early': 'Il suono è in anticipo: ritardalo',
  'calibrate.lead': 'Suono anticipato di',
  'calibrate.leadAria': 'Suono anticipato, in millisecondi',
  'calibrate.drag':
    'Oppure trascina, se il suono è molto fuori. Le cuffie Bluetooth sono spesso un quinto di secondo indietro.',
  'calibrate.name': 'Come si chiama questa uscita?',
  'calibrate.namePlaceholder': 'Cuffie',

  'range.choose': 'Scelgo io l’estensione',
  'range.lowest': 'La più grave',
  'range.highest': 'La più acuta',
  'range.stave': 'Estensione: da {low} a {high}',
  'range.note': '{span} — tutte le note che contiene, senza favorire il centro.',
  'dial.key': 'Tonalità',
  'dial.tempo': 'Tempo',
  'dial.tempoValue': '{n} battiti al minuto',
  'dial.valves': 'Pistoni',

  'error.title': 'Qualcosa si è rotto',
  'error.body':
    'L’applicazione si è fermata invece di mostrarti qualcosa di sbagliato. Vale la pena segnalare questo difetto: il messaggio qui sotto è la parte utile.',
  'error.version': 'versione {version} · compilata {built}',
  'error.back': 'Torna all’inizio',
};
