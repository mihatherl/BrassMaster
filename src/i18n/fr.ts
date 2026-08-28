/**
 * French — complete, and drafted for review by a native brass player.
 *
 * Every key, for the reason given in `de.ts`.
 *
 * Duration names follow French convention (noire, croche, double croche),
 * and the level names use the words a French method book uses rather than a
 * literal rendering of Easy/Medium/Hard. `Déchiffrage` is the standing term
 * for sight-reading and is what the Themes/Sight-reading tab should say.
 */
import type { Pack } from './index';

export const FR: Pack = {
  'common.back': 'Retour',
  'common.save': 'Enregistrer',
  'common.cancel': 'Annuler',
  'common.forget': 'Oublier',
  'common.done': 'Terminé',
  'common.clear': 'Vider',

  'home.structured': 'Apprentissage guidé',
  'home.free': 'Jeu libre',
  'home.start': 'Démarrer',
  'home.myMusic': 'Mes partitions',
  'home.instrument': 'Instrument',
  'home.clef': 'Clé',
  'home.language': 'Langue',
  'home.keys': 'Tonalités',
  'home.drill': 'Exercice',
  'home.difficulty': 'Niveau',
  'home.timeSignature': 'Mesure',
  'home.register': 'Registre',
  'home.tunesFrom': 'Morceaux de',
  'home.composed': 'Composé',
  'home.selection': 'Sélection',
  'home.medley': 'Suite aléatoire',
  'home.defined': 'Définie',
  'home.favourWrong': 'Privilégier les notes que je rate',
  'home.keysRoute': 'Joue {route}, en changeant de tonalité au fil du morceau.',
  'home.doubleSharp':
    'Un recueil écrit la septième haussée de {key} avec un double dièse. Cette application n’en imprime jamais : elle écrit donc le bécarre au-dessus.',
  'home.composedNote':
    'Des morceaux neufs, écrits pour cette session. Choisissez un ou plusieurs recueils pour jouer de la musique écrite à la place.',
  'home.nothingAtLevel':
    'Rien n’est écrit à ce niveau ici, ce sont donc des morceaux composés qui seront joués. Essayez un autre niveau.',
  'home.medleyNote': 'Tout ce que contiennent les recueils choisis, au niveau choisi.',
  'home.playingSteps.one': 'Joue {n} étape dans l’ordre que vous avez fixé, dans sa propre tonalité.',
  'home.playingSteps.other':
    'Joue {n} étapes dans l’ordre que vous avez fixé, chacune dans sa propre tonalité.',
  'home.shortenedSpan':
    '{instrument} en {key} n’a la place que pour {span} : c’est donc ce que vous aurez — la note de départ de l’exercice est trop haute pour aller plus loin.',
  'home.writtenRange': 'Étendue écrite de {low} à {high}.',
  'home.writtenRangeConcert': 'Étendue écrite de {low} à {high} (en sons réels).',

  'clef.treble': 'Clé de sol',
  'clef.bass': 'Clé de fa',
  'clefShort.treble': 'Sol',
  'clefShort.bass': 'Fa',

  'kind.drills': 'Exercices',
  'kind.phrases': 'Déchiffrage',
  'kind.themes': 'Thèmes',
  'kind.drills.blurb': 'Gammes et arpèges.',
  'kind.phrases.blurb': 'Des phrases musicales avec profil, sauts et silences.',
  'kind.themes.blurb': 'Des mélodies que vous connaissez et aimez jouer.',

  'picker.title': 'Choisir morceaux et tonalités',
  'picker.available': 'Disponible',
  'picker.steps':
    'Touchez un morceau, puis l’une de ses tonalités, pour ajouter une étape. Le même morceau peut figurer deux fois — dans deux tonalités, ou dans la même.',
  'picker.note':
    'Tous les morceaux ne conviennent pas à toutes les tonalités sur tous les instruments. Désignez ici les tonalités, et chaque morceau ci-dessous proposera celles qu’il peut jouer sur {instrument}.',

  'gate.tempo': 'Tempo',
  'gate.reading': 'Lecture',
  'gate.beat': 'Pulsation',
  'gate.sound': 'Son',
  'gate.fingerings': 'Doigtés',
  'gate.preferences': 'Préférences',
  'gate.metronome': 'Métronome',
  'gate.conductor': 'Chef',
  'gate.metronomeVolume': 'Volume du métronome',
  'gate.metronomeVolumeNote':
    'Vous l’entendez pendant que vous le réglez. Le clic est timbré pour porter par-dessus un instrument dans la pièce — baissez-le quand vous lisez contre la voix de l’application.',
  'gate.key': 'Tonalité',
  'gate.yourChoice': 'À vous de choisir pour ce niveau',
  'gate.keyRemembered': 'Retenue pour le prochain niveau qui vous laisse la tonalité.',
  'gate.setByCourse': 'Fixé par le cours pour ce niveau.',
  'gate.variableTempo': 'Tempo variable',
  'gate.scrollSpeed': 'Vitesse de défilement',
  'gate.scrollSpeedNote':
    'À quelle vitesse la musique défile, quel que soit le tempo. L’espacement suit.',
  'gate.conductorStyle': 'Style de battue',
  'gate.conductorStyleNote':
    'Avec quelle netteté le temps tombe. Le lié est plus difficile à suivre, et c’est voulu.',
  'gate.cushion': 'Fond sonore',
  'gate.cushionNote':
    'Le volume du son doux derrière une note tant que le doigté n’est pas juste, face à l’instrument qui prend le relais quand il l’est.',
  'gate.cushionOff':
    'Désactivé sur cette sortie : son son arrive {ms} ms en retard, l’instrument qui prend le relais s’entendrait donc bien après le doigté auquel il répond. Le jugement s’affiche à l’écran à la place.',
  'gate.timingTolerance': 'Tolérance rythmique',
  'gate.countIn': 'Décompte',
  'gate.countIn.none': 'Aucun',
  'gate.countIn.1': '1 mesure',
  'gate.countIn.2': '2 mesures',
  'gate.compound': 'Noires pointées — {n} par mesure, c’est le temps que vous comptez.',
  'beat.both': 'Métronome + chef',
  'beat.none': 'Rien ne tient le temps',

  'reading.scrolling': 'Ligne défilante',
  'reading.paged': 'Lire la page',
  'playback.reference': 'Jouer les notes',
  'playback.off': 'Silencieux',
  'fingerings.trouble': 'Là où je bute',
  'fingerings.never': 'Jamais',
  'fingerings.always': 'Chaque note',
  'register.low': 'Grave',
  'register.middle': 'Médium',
  'register.high': 'Aigu',
  'conductorStyle.smooth': 'lié',
  'conductorStyle.flowing': 'coulant',
  'conductorStyle.lively': 'vif',
  'conductorStyle.crisp': 'net',
  'conductorStyle.marcato': 'marcato',

  'difficulty.beginner': 'Débutant',
  'difficulty.beginner.blurb':
    'Secondes et tierces sur une octave, noires et blanches. Aucune altération.',
  'difficulty.beginner.patterns': 'Quinte',
  'difficulty.beginner.patternsBlurb':
    'Les cinq premières notes de la tonalité, en montant et en descendant, en noires simples.',
  'difficulty.easy': 'Facile',
  'difficulty.easy.blurb':
    'Une octave et demie, des croches, une altération et une liaison de temps à autre.',
  'difficulty.easy.patterns': '1 octave',
  'difficulty.easy.patternsBlurb':
    'Une octave entière, en montant et en descendant, en noires simples.',
  'difficulty.medium': 'Moyen',
  'difficulty.medium.blurb':
    'Sauts plus larges, rythmes pointés, liaisons par-dessus la barre de mesure, altérations pour de bon.',
  'difficulty.medium.patterns': '2 octaves',
  'difficulty.medium.patternsBlurb':
    'Deux octaves, avec des croches mêlées. Les rythmes pointés attendent le niveau Difficile.',
  'difficulty.hard': 'Difficile',
  'difficulty.hard.blurb': 'Deux octaves, traits de doubles croches, altérations fréquentes.',
  'difficulty.hard.patterns': '2 oct · mêlé',
  'difficulty.hard.patternsBlurb':
    'Deux octaves, avec des traits de doubles croches et un silence de temps à autre.',

  'drill.major-scale': 'Gamme majeure',
  'drill.harmonic-minor-scale': 'Gamme mineure harmonique',
  'drill.melodic-minor-scale': 'Gamme mineure mélodique',
  'drill.tonic-arpeggio': 'Arpège de tonique',
  'drill.subdominant-arpeggio': 'Arpège de sous-dominante',
  'drill.dominant-arpeggio': 'Arpège de dominante',
  'drill.dominant-7th': 'Septième de dominante',
  'drill.relative-minor-arpeggio': 'Arpège mineur',

  'play.tapToStart': 'Touchez pour démarrer',
  'play.loading': 'Chargement de l’instrument…',
  'play.starting': 'Démarrage…',
  'play.tryAgain': 'Réessayer',
  'play.stop': 'Arrêter',
  'play.continue': 'Continuer',
  'play.pause': 'Pause',
  'play.start': 'Démarrer',
  'play.ready': 'Prêt',
  'play.lockStopped':
    'La session s’est arrêtée quand l’écran s’est éteint — rien n’est jugé sans être vu.',
  'play.stalled': 'Le son n’a pas démarré',
  'play.stalledNote':
    'Le téléphone a coupé le son avant que l’exercice ne démarre — il le fait après une absence de l’application — ce qui laisse le décompte bloqué. Réessayer relance le son à neuf.',
  'play.leadNote': 'Son avancé de {ms} ms pour {name}',
  'play.backOneBar': 'Une mesure en arrière',
  'play.backFiveBars': 'Cinq mesures en arrière',
  'play.calibrationTitle': 'Calibrage nécessaire',
  'play.calibrationBody':
    'Calez vos haut-parleurs ou votre casque sur la pulsation pour que tout tombe ensemble.',
  'play.calibrationWhere':
    'Vous pouvez mesurer {output} à tout moment depuis Sorties, dans le menu Avancé.',
  'play.anOutput': 'une sortie',
  'play.calibrateNow': 'Calibrer maintenant',
  'play.later': 'Plus tard',
  'play.acceptOffset': 'Accepter le décalage actuel ({ms} ms)',

  'results.correct': 'Juste',
  'results.wrongValves': 'Mauvais pistons',
  'results.missed': 'Manqué',
  'results.another': 'Encore un',
  'results.sameAgain': 'Le même',
  'results.settings': 'Réglages',
  'results.dontCount': 'Ne comptez pas cette session — je ne jouais pas vraiment',
  'results.windowed':
    'Sur les {bars} dernières mesures — {whole}% sur toute la session, plus longue série {streak}',
  'results.wholeRun': '{correct} notes sur {total}, plus longue série {streak}',
  'results.beyond.one':
    '{n} mesure au-delà de la longueur choisie — la musique a continué, et vous aussi.',
  'results.beyond.other':
    '{n} mesures au-delà de la longueur choisie — la musique a continué, et vous aussi.',
  'results.averageLate': 'En moyenne {ms} ms de retard sur les notes justes.',
  'results.notCounted':
    'Rien n’a été joué : cette session ne compte donc pas dans votre progression.',
  'results.whatYouPlayed': 'Ce que vous avez joué',
  'results.allGreen': 'Toutes les notes en vert — rien à corriger.',
  'results.fingeringNote': 'Le doigté sous une note est celui qu’elle attendait.',
  'results.worthDrilling': 'À travailler',
  'results.drillingNote':
    'Cumulé sur plusieurs séances à {instrument} en clé de {clef}, et orthographié dans la tonalité que vous venez de jouer.',

  'outputs.title': 'Sorties',
  'outputs.intro':
    'Chaque façon d’entendre l’application est un peu en retard sur elle, et chacune d’un retard différent — un casque Bluetooth de beaucoup, un casque filaire de moins, et le haut-parleur de cet appareil de ce que coûte son matériel. Mesurez chacune une fois, et l’application avance le son d’autant chaque fois qu’elle est choisie.',
  'outputs.choosing':
    'Choisir ici ne déplace pas le son. C’est votre téléphone qui décide où il sort — branchez un casque et il y sortira, quelle que soit la sélection ci-dessous. Le choix indique à l’application quelle sortie est réellement dans vos oreilles, pour que la bonne correction s’applique ; quand vous en changez, dites-le ici, car l’application ne peut pas s’en apercevoir seule.',
  'outputs.notMeasured': 'Pas encore mesurée',
  'outputs.lead': 'Son avancé de {ms} ms',
  'outputs.measure': 'Mesurer',
  'outputs.measureNamed': 'Mesurer {name}',
  'outputs.measureNamedAgain': 'Mesurer {name} à nouveau',
  'outputs.forgetNamed': 'Oublier {name}',
  'outputs.add': 'Ajouter une sortie',

  'calibrate.title': 'Mesurer {name}',
  'calibrate.intro':
    'Écoutez par la sortie que vous voulez mesurer. Chaque note doit sonner au moment où sa tête franchit la ligne — si le son arrive après ce que vous voyez, avancez-le jusqu’à ce que les deux coïncident.',
  'calibrate.late': 'Le son est en retard — l’avancer',
  'calibrate.early': 'Le son est en avance — le reculer',
  'calibrate.lead': 'Son avancé de',
  'calibrate.leadAria': 'Son avancé, en millisecondes',
  'calibrate.drag':
    'Ou faites glisser, si le son est très décalé. Les casques Bluetooth ont souvent un cinquième de seconde de retard.',
  'calibrate.name': 'Comment s’appelle cette sortie ?',
  'calibrate.namePlaceholder': 'Casque',

  'range.choose': 'Choisir l’étendue moi-même',
  'range.lowest': 'La plus grave',
  'range.highest': 'La plus aiguë',
  'range.stave': 'Étendue : de {low} à {high}',
  'range.note': '{span} — toutes les notes qu’elle contient, sans privilégier le médium.',
  'dial.key': 'Tonalité',
  'dial.tempo': 'Tempo',
  'dial.tempoValue': '{n} pulsations par minute',
  'dial.valves': 'Pistons',

  'error.title': 'Quelque chose a lâché',
  'error.body':
    'L’application s’est arrêtée plutôt que de vous montrer quelque chose de faux. Ce défaut mérite d’être signalé — le message ci-dessous en est la partie utile.',
  'error.version': 'version {version} · compilée {built}',
  'error.back': 'Retour au début',
};
