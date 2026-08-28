/**
 * Spanish — complete, and drafted for review by a native brass player.
 *
 * Addressed as `tú` throughout, matching the German `du` and the Dutch `je`:
 * this is a practice-room tool, not a bank. `tú` reads naturally in Spain and
 * across Latin America, so no regional fork was needed here — unlike
 * Portuguese, which got two packs because its everyday nouns diverge.
 *
 * Duration names follow Spanish convention (negra, corchea, semicorchea)
 * rather than transliterating crotchet/quaver. `Solfeo` would be the term for
 * sight-singing; reading an unseen part on an instrument is `lectura a primera
 * vista`, which is what the sight-reading tab says.
 */
import type { Pack } from './index';

export const ES: Pack = {
  'common.back': 'Atrás',
  'common.save': 'Guardar',
  'common.cancel': 'Cancelar',
  'common.forget': 'Olvidar',
  'common.done': 'Hecho',
  'common.clear': 'Vaciar',

  'home.structured': 'Aprendizaje guiado',
  'home.free': 'Juego libre',
  'home.start': 'Empezar',
  'home.myMusic': 'Mis partituras',
  'home.instrument': 'Instrumento',
  'home.clef': 'Clave',
  'home.language': 'Idioma',
  'home.keys': 'Tonalidades',
  'home.drill': 'Ejercicio',
  'home.difficulty': 'Dificultad',
  'home.timeSignature': 'Compás',
  'home.register': 'Registro',
  'home.tunesFrom': 'Melodías de',
  'home.composed': 'Compuesto',
  'home.selection': 'Selección',
  'home.medley': 'Serie aleatoria',
  'home.defined': 'Definida',
  'home.favourWrong': 'Priorizar las notas que fallo',
  'home.keysRoute': 'Toca {route}, cambiando de tonalidad sobre la marcha.',
  'home.doubleSharp':
    'Un método escribe la séptima elevada de {key} con doble sostenido. Esta aplicación nunca imprime uno, así que aparece el becuadro por encima.',
  'home.composedNote':
    'Melodías nuevas, escritas para esta sesión. Elige una o más colecciones para tocar música escrita en su lugar.',
  'home.nothingAtLevel':
    'A este nivel no hay nada escrito aquí, así que sonarán melodías compuestas. Prueba otro nivel.',
  'home.medleyNote': 'Lo que haya en las colecciones elegidas, al nivel elegido.',
  'home.playingSteps.one': 'Toca {n} paso en el orden que has fijado, en su propia tonalidad.',
  'home.playingSteps.other':
    'Toca {n} pasos en el orden que has fijado, cada uno en su propia tonalidad.',
  'home.shortenedSpan':
    '{instrument} en {key} solo tiene sitio para {span}, así que eso es lo que tendrás: la nota inicial del ejercicio queda demasiado aguda para más.',
  'home.writtenRange': 'Extensión escrita de {low} a {high}.',
  'home.writtenRangeConcert': 'Extensión escrita de {low} a {high} (sonido real).',

  'clef.treble': 'Clave de sol',
  'clef.bass': 'Clave de fa',
  'clefShort.treble': 'Sol',
  'clefShort.bass': 'Fa',

  'kind.drills': 'Ejercicios',
  'kind.phrases': 'Primera vista',
  'kind.themes': 'Temas',
  'kind.drills.blurb': 'Escalas y arpegios.',
  'kind.phrases.blurb': 'Frases musicales con perfil, saltos y silencios.',
  'kind.themes.blurb': 'Melodías que conoces y disfrutas.',

  'picker.title': 'Elegir melodías y tonalidades',
  'picker.available': 'Disponibles',
  'picker.steps':
    'Toca una melodía y luego una de sus tonalidades para añadir un paso. La misma melodía puede entrar dos veces: en dos tonalidades, o en la misma.',
  'picker.note':
    'No todas las melodías caben en todas las tonalidades en todos los instrumentos. Indica aquí las tonalidades y cada melodía de abajo ofrecerá las que puede tocar en {instrument}.',

  'gate.tempo': 'Tempo',
  'gate.reading': 'Lectura',
  'gate.beat': 'Pulso',
  'gate.sound': 'Sonido',
  'gate.fingerings': 'Digitaciones',
  'gate.preferences': 'Preferencias',
  'gate.metronome': 'Metrónomo',
  'gate.conductor': 'Director',
  'gate.metronomeVolume': 'Volumen del metrónomo',
  'gate.metronomeVolumeNote':
    'Lo oyes mientras lo ajustas. El clic está timbrado para pasar por encima de un instrumento en la sala: bájalo cuando leas contra la voz de la aplicación.',
  'gate.setByCourse': 'Fijado por el curso para este nivel.',
  'gate.variableTempo': 'Tempo variable',
  'gate.scrollSpeed': 'Velocidad de desplazamiento',
  'gate.scrollSpeedNote':
    'A qué velocidad avanza la música, sea cual sea el tempo. El espaciado la sigue.',
  'gate.conductorStyle': 'Estilo de batuta',
  'gate.conductorStyleNote':
    'Con qué nitidez cae el pulso. Ligado cuesta más de seguir, y así debe ser.',
  'gate.cushion': 'Colchón sonoro',
  'gate.cushionNote':
    'Cuánto suena el sonido suave detrás de una nota hasta que la digitas bien, frente al instrumento que toma el relevo cuando aciertas.',
  'gate.cushionOff':
    'Desactivado en esta salida: su sonido llega {ms} ms tarde, así que el instrumento que toma el relevo se oiría mucho después de la digitación a la que responde. La valoración aparece en pantalla en su lugar.',
  'gate.timingTolerance': 'Tolerancia rítmica',
  'gate.countIn': 'Compás de entrada',
  'gate.countIn.none': 'Ninguno',
  'gate.countIn.1': '1 compás',
  'gate.countIn.2': '2 compases',
  'gate.compound': 'Negras con puntillo: {n} por compás, el pulso que cuentas.',
  'beat.both': 'Metrónomo + director',
  'beat.none': 'Nada marca el tiempo',

  'reading.scrolling': 'Línea en movimiento',
  'reading.paged': 'Leer la página',
  'playback.reference': 'Tocar las notas',
  'playback.off': 'En silencio',
  'fingerings.trouble': 'Donde me atasco',
  'fingerings.never': 'Nunca',
  'fingerings.always': 'En cada nota',
  'register.low': 'Grave',
  'register.middle': 'Medio',
  'register.high': 'Agudo',
  'conductorStyle.smooth': 'ligado',
  'conductorStyle.flowing': 'fluido',
  'conductorStyle.lively': 'vivo',
  'conductorStyle.crisp': 'marcado',
  'conductorStyle.marcato': 'marcato',

  'difficulty.beginner': 'Principiante',
  'difficulty.beginner.blurb':
    'Segundas y terceras dentro de una octava, negras y blancas. Sin alteraciones.',
  'difficulty.beginner.patterns': 'Quinta',
  'difficulty.beginner.patternsBlurb':
    'Las cinco primeras notas de la tonalidad, subiendo y bajando, en negras simples.',
  'difficulty.easy': 'Fácil',
  'difficulty.easy.blurb':
    'Una octava y media, corcheas, alguna alteración y ligadura de vez en cuando.',
  'difficulty.easy.patterns': '1 octava',
  'difficulty.easy.patternsBlurb':
    'Una octava completa, subiendo y bajando, en negras simples.',
  'difficulty.medium': 'Medio',
  'difficulty.medium.blurb':
    'Saltos más amplios, ritmos con puntillo, ligaduras sobre la barra de compás, alteraciones en serio.',
  'difficulty.medium.patterns': '2 octavas',
  'difficulty.medium.patternsBlurb':
    'Dos octavas, con corcheas mezcladas. Los ritmos con puntillo esperan a Difícil.',
  'difficulty.hard': 'Difícil',
  'difficulty.hard.blurb': 'Dos octavas, pasajes de semicorcheas, alteraciones frecuentes.',
  'difficulty.hard.patterns': '2 oct · mixto',
  'difficulty.hard.patternsBlurb':
    'Dos octavas, con pasajes de semicorcheas y algún silencio.',

  'drill.major-scale': 'Escala mayor',
  'drill.harmonic-minor-scale': 'Escala menor armónica',
  'drill.melodic-minor-scale': 'Escala menor melódica',
  'drill.tonic-arpeggio': 'Arpegio de tónica',
  'drill.subdominant-arpeggio': 'Arpegio de subdominante',
  'drill.dominant-arpeggio': 'Arpegio de dominante',
  'drill.dominant-7th': 'Séptima de dominante',
  'drill.relative-minor-arpeggio': 'Arpegio menor',

  'play.tapToStart': 'Toca para empezar',
  'play.loading': 'Cargando el instrumento…',
  'play.starting': 'Empezando…',
  'play.tryAgain': 'Reintentar',
  'play.stop': 'Parar',
  'play.continue': 'Seguir',
  'play.pause': 'Pausa',
  'play.start': 'Empezar',
  'play.ready': 'Listo',
  'play.lockStopped':
    'La sesión se detuvo cuando la pantalla se apagó: nada se juzga sin verse.',
  'play.stalled': 'El sonido no arrancó',
  'play.stalledNote':
    'El teléfono cortó el sonido antes de que el ejercicio arrancara — lo hace después de que la aplicación haya estado ausente — y el compás de entrada se queda colgado. Reintentar arranca el sonido de nuevo.',
  'play.leadNote': 'Sonido adelantado {ms} ms para {name}',
  'play.backOneBar': 'Un compás atrás',
  'play.backFiveBars': 'Cinco compases atrás',
  'play.calibrationTitle': 'Hace falta calibrar',
  'play.calibrationBody':
    'Ajusta tus altavoces o auriculares al pulso para que todo caiga junto.',
  'play.calibrationWhere':
    'Puedes medir {output} cuando quieras desde Salidas, en el menú Avanzado.',
  'play.anOutput': 'una salida',
  'play.calibrateNow': 'Calibrar ahora',
  'play.later': 'Más tarde',
  'play.acceptOffset': 'Aceptar el desfase actual ({ms} ms)',

  'results.correct': 'Correctas',
  'results.wrongValves': 'Pistones erróneos',
  'results.missed': 'Perdidas',
  'results.another': 'Otra',
  'results.sameAgain': 'La misma otra vez',
  'results.settings': 'Ajustes',
  'results.dontCount': 'No cuentes esta sesión: no estaba tocando de verdad',
  'results.windowed':
    'En los últimos {bars} compases — {whole}% en toda la sesión, racha más larga {streak}',
  'results.wholeRun': '{correct} de {total} notas, racha más larga {streak}',
  'results.beyond.one':
    '{n} compás más allá de la longitud que elegiste: la música siguió, y tú también.',
  'results.beyond.other':
    '{n} compases más allá de la longitud que elegiste: la música siguió, y tú también.',
  'results.averageLate': 'De media {ms} ms tarde en las notas que acertaste.',
  'results.notCounted':
    'No se tocó nada, así que esta sesión no cuenta para tu progreso.',
  'results.whatYouPlayed': 'Lo que tocaste',
  'results.allGreen': 'Todas las notas en verde: nada que corregir.',
  'results.fingeringNote': 'La digitación bajo una nota es la que pedía.',
  'results.worthDrilling': 'Merece la pena trabajarlo',
  'results.drillingNote':
    'Acumulado a lo largo de varias sesiones con {instrument} en clave de {clef}, y escrito en la tonalidad que acabas de tocar.',

  'outputs.title': 'Salidas',
  'outputs.intro':
    'Cada forma de oír la aplicación va un poco por detrás de ella, y cada una en distinta medida: unos auriculares Bluetooth mucho, unos con cable menos, y el altavoz del propio aparato lo que cueste su electrónica. Mide cada una una vez y la aplicación adelantará el sonido justo eso siempre que esté elegida.',
  'outputs.choosing':
    'Elegir aquí no mueve el sonido. Tu teléfono decide por dónde suena: enchufa unos auriculares y sonará por ellos, esté marcado lo que esté abajo. La elección le dice a la aplicación qué salida tienes de verdad en los oídos, para que se aplique la corrección correcta; cuando cambies a otra, dilo aquí, porque la aplicación no puede darse cuenta sola.',
  'outputs.notMeasured': 'Sin medir todavía',
  'outputs.lead': 'Sonido adelantado {ms} ms',
  'outputs.measure': 'Medir',
  'outputs.measureNamed': 'Medir {name}',
  'outputs.measureNamedAgain': 'Volver a medir {name}',
  'outputs.forgetNamed': 'Olvidar {name}',
  'outputs.add': 'Añadir una salida',

  'calibrate.title': 'Medir {name}',
  'calibrate.intro':
    'Escucha por la salida que quieras medir. Cada nota debe sonar en el momento en que su cabeza cruza la línea: si el sonido llega después de lo que ves, adelántalo hasta que ambos caigan juntos.',
  'calibrate.late': 'El sonido llega tarde: adelantarlo',
  'calibrate.early': 'El sonido llega pronto: retrasarlo',
  'calibrate.lead': 'Sonido adelantado',
  'calibrate.leadAria': 'Sonido adelantado, en milisegundos',
  'calibrate.drag':
    'O arrastra, si el sonido está muy desviado. Los auriculares Bluetooth suelen ir una quinta parte de segundo por detrás.',
  'calibrate.name': '¿Cómo se llama esta salida?',
  'calibrate.namePlaceholder': 'Auriculares',

  'range.choose': 'Elegir yo la extensión',
  'range.lowest': 'La más grave',
  'range.highest': 'La más aguda',
  'range.stave': 'Extensión: de {low} a {high}',
  'range.note': '{span} — todas las notas que contiene, sin favorecer el centro.',
  'dial.key': 'Tonalidad',
  'dial.tempo': 'Tempo',
  'dial.tempoValue': '{n} pulsos por minuto',
  'dial.valves': 'Pistones',

  'error.title': 'Algo se ha roto',
  'error.body':
    'La aplicación se ha parado en vez de enseñarte algo incorrecto. Este fallo merece comunicarse: el mensaje de abajo es la parte útil.',
  'error.version': 'versión {version} · compilada {built}',
  'error.back': 'Volver al principio',
};
