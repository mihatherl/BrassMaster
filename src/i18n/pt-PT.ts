/**
 * European Portuguese — complete, and drafted for review by a native brass
 * player.
 *
 * **One of two Portuguese packs**, split by the player's ruling of
 * 2026-08-28. The fork is not cosmetic: the nouns this app repeats on almost
 * every screen are exactly the ones that differ — `ecrã` (not *tela*),
 * `telemóvel` (not *celular*), `auscultadores` (not *fones de ouvido*). One
 * merged pack would have read as foreign on every calibration screen at one
 * end of the language or the other. See `pt-BR.ts` for the sibling.
 *
 * Addressed as `tu`, as the other packs are. Portugal's bandas filarmónicas
 * are the closest cultural match to a British brass band anywhere — several
 * hundred town bands, cornets and euphoniums included — so this pack has a
 * real chance of reaching a player who can correct it.
 *
 * Duration names follow Portuguese convention (semínima, colcheia,
 * semicolcheia).
 */
import type { Pack } from './index';

export const PT_PT: Pack = {
  'common.back': 'Voltar',
  'common.save': 'Guardar',
  'common.cancel': 'Cancelar',
  'common.forget': 'Esquecer',
  'common.done': 'Concluído',
  'common.clear': 'Limpar',

  'home.structured': 'Aprendizagem guiada',
  'home.free': 'Jogo livre',
  'home.start': 'Começar',
  'home.myMusic': 'As minhas partituras',
  'home.instrument': 'Instrumento',
  'home.clef': 'Clave',
  'home.language': 'Idioma',
  'home.keys': 'Tonalidades',
  'home.drill': 'Exercício',
  'home.difficulty': 'Dificuldade',
  'home.timeSignature': 'Compasso',
  'home.register': 'Registo',
  'home.tunesFrom': 'Peças de',
  'home.composed': 'Composto',
  'home.selection': 'Seleção',
  'home.medley': 'Série aleatória',
  'home.defined': 'Definida',
  'home.favourWrong': 'Privilegiar as notas que falho',
  'home.keysRoute': 'Toca {route}, mudando de tonalidade pelo caminho.',
  'home.doubleSharp':
    'Um método escreve a sétima elevada de {key} com dobrado sustenido. Esta aplicação nunca imprime um, por isso aparece o bequadro por cima.',
  'home.composedNote':
    'Peças novas, escritas para esta sessão. Escolhe uma ou mais coleções para tocares música escrita.',
  'home.nothingAtLevel':
    'Neste nível não há nada escrito aqui, por isso tocarão peças compostas. Experimenta outro nível.',
  'home.medleyNote': 'O que houver nas coleções escolhidas, no nível escolhido.',
  'home.playingSteps.one': 'Toca {n} passo na ordem que definiste, na sua própria tonalidade.',
  'home.playingSteps.other':
    'Toca {n} passos na ordem que definiste, cada um na sua própria tonalidade.',
  'home.shortenedSpan':
    '{instrument} em {key} só tem espaço para {span}, e é isso que vais ter — a nota inicial do exercício fica demasiado aguda para mais.',
  'home.writtenRange': 'Extensão escrita de {low} a {high}.',
  'home.writtenRangeConcert': 'Extensão escrita de {low} a {high} (som real).',

  'clef.treble': 'Clave de sol',
  'clef.bass': 'Clave de fá',
  'clefShort.treble': 'Sol',
  'clefShort.bass': 'Fá',

  'kind.drills': 'Exercícios',
  'kind.phrases': 'Primeira vista',
  'kind.themes': 'Temas',
  'kind.drills.blurb': 'Escalas e arpejos.',
  'kind.phrases.blurb': 'Frases musicais com contorno, saltos e pausas.',
  'kind.themes.blurb': 'Melodias que conheces e gostas de tocar.',

  'picker.title': 'Escolher peças e tonalidades',
  'picker.available': 'Disponíveis',
  'picker.steps':
    'Toca numa peça e depois numa das suas tonalidades para acrescentar um passo. A mesma peça pode entrar duas vezes: em duas tonalidades, ou na mesma.',
  'picker.note':
    'Nem todas as peças cabem em todas as tonalidades em todos os instrumentos. Indica aqui as tonalidades e cada peça abaixo oferecerá as que consegue tocar em {instrument}.',

  'gate.tempo': 'Andamento',
  'gate.reading': 'Leitura',
  'gate.beat': 'Pulsação',
  'gate.sound': 'Som',
  'gate.fingerings': 'Dedilhações',
  'gate.preferences': 'Preferências',
  'gate.metronome': 'Metrónomo',
  'gate.conductor': 'Maestro',
  'gate.beatBands': 'Sombreado dos tempos',
  'gate.metronomeVolume': 'Volume do metrónomo',
  'gate.metronomeVolumeNote':
    'Ouve-lo enquanto o ajustas. O clique está timbrado para passar por cima de um instrumento na sala: baixa-o quando estiveres a ler contra a voz da aplicação.',
  'gate.key': 'Tonalidade',
  'gate.yourChoice': 'Neste nível escolhes tu',
  'gate.keyRemembered': 'Fica guardada para o próximo nível que te deixe a tonalidade.',
  'gate.setByCourse': 'Definido pelo curso para este nível.',
  'gate.variableTempo': 'Andamento variável',
  'gate.scrollSpeed': 'Velocidade de deslocamento',
  'gate.scrollSpeedNote':
    'A que velocidade a música avança, seja qual for o andamento. O espaçamento acompanha.',
  'gate.conductorStyle': 'Estilo da batuta',
  'gate.conductorStyleNote':
    'Com que nitidez a pulsação cai. O ligado é mais difícil de seguir, e é essa a intenção.',
  'gate.cushion': 'Colchão sonoro',
  'gate.cushionNote':
    'Quão alto é o som suave por trás de uma nota até a dedilhares bem, face ao instrumento que assume quando acertas.',
  'gate.cushionOff':
    'Desligado nesta saída: o som chega {ms} ms atrasado, por isso o instrumento que assume ouvir-se-ia muito depois da dedilhação a que responde. A avaliação aparece no ecrã em vez disso.',
  'gate.timingTolerance': 'Tolerância rítmica',
  'gate.countIn': 'Compasso de entrada',
  'gate.countIn.none': 'Nenhum',
  'gate.countIn.1': '1 compasso',
  'gate.countIn.2': '2 compassos',
  'gate.compound': 'Semínimas com ponto: {n} por compasso, a pulsação que contas.',
  'beat.both': 'Metrónomo + maestro',
  'beat.none': 'Nada marca o tempo',

  'reading.scrolling': 'Linha em movimento',
  'reading.paged': 'Ler a página',
  'playback.reference': 'Tocar as notas',
  'playback.off': 'Silencioso',
  'fingerings.trouble': 'Onde me atrapalho',
  'fingerings.never': 'Nunca',
  'fingerings.always': 'Em cada nota',
  'register.low': 'Grave',
  'register.middle': 'Médio',
  'register.high': 'Agudo',
  'conductorStyle.smooth': 'ligado',
  'conductorStyle.flowing': 'fluido',
  'conductorStyle.lively': 'vivo',
  'conductorStyle.crisp': 'marcado',
  'conductorStyle.marcato': 'marcato',

  'difficulty.beginner': 'Principiante',
  'difficulty.beginner.blurb':
    'Segundas e terceiras dentro de uma oitava, semínimas e mínimas. Sem alterações.',
  'difficulty.beginner.patterns': 'Quinta',
  'difficulty.beginner.patternsBlurb':
    'As cinco primeiras notas da tonalidade, a subir e a descer, em semínimas simples.',
  'difficulty.easy': 'Fácil',
  'difficulty.easy.blurb':
    'Uma oitava e meia, colcheias, uma alteração e uma ligadura de vez em quando.',
  'difficulty.easy.patterns': '1 oitava',
  'difficulty.easy.patternsBlurb':
    'Uma oitava completa, a subir e a descer, em semínimas simples.',
  'difficulty.medium': 'Médio',
  'difficulty.medium.blurb':
    'Saltos mais largos, ritmos pontuados, ligaduras sobre a barra de compasso, alterações a sério.',
  'difficulty.medium.patterns': '2 oitavas',
  'difficulty.medium.patternsBlurb':
    'Duas oitavas, com colcheias à mistura. Os ritmos pontuados esperam pelo Difícil.',
  'difficulty.hard': 'Difícil',
  'difficulty.hard.blurb': 'Duas oitavas, passagens de semicolcheias, alterações frequentes.',
  'difficulty.hard.patterns': '2 oit · misto',
  'difficulty.hard.patternsBlurb':
    'Duas oitavas, com passagens de semicolcheias e uma pausa ocasional.',

  'drill.major-scale': 'Escala maior',
  'drill.harmonic-minor-scale': 'Escala menor harmónica',
  'drill.melodic-minor-scale': 'Escala menor melódica',
  'drill.tonic-arpeggio': 'Arpejo de tónica',
  'drill.subdominant-arpeggio': 'Arpejo de subdominante',
  'drill.dominant-arpeggio': 'Arpejo de dominante',
  'drill.dominant-7th': 'Sétima da dominante',
  'drill.relative-minor-arpeggio': 'Arpejo menor',

  'play.tapToStart': 'Toca para começar',
  'play.loading': 'A carregar o instrumento…',
  'play.starting': 'A começar…',
  'play.tryAgain': 'Tentar de novo',
  'play.stop': 'Parar',
  'play.continue': 'Continuar',
  'play.pause': 'Pausa',
  'play.start': 'Começar',
  'play.ready': 'Pronto',
  'play.lockStopped':
    'A sessão parou quando o ecrã se apagou: nada é avaliado sem ser visto.',
  'play.stalled': 'O som não arrancou',
  'play.stalledNote':
    'O telemóvel cortou o som antes de o exercício arrancar — fá-lo depois de a aplicação ter estado ausente — e o compasso de entrada fica preso. Tentar de novo arranca o som de raiz.',
  'play.leadNote': 'Som adiantado {ms} ms para {name}',
  'play.backOneBar': 'Um compasso atrás',
  'play.backFiveBars': 'Cinco compassos atrás',
  'play.calibrationTitle': 'É preciso calibrar',
  'play.calibrationBody':
    'Ajusta as colunas ou os auscultadores à pulsação para que tudo caia junto.',
  'play.calibrationWhere':
    'Podes medir {output} quando quiseres em Saídas, no menu Avançado.',
  'play.anOutput': 'uma saída',
  'play.calibrateNow': 'Calibrar agora',
  'play.later': 'Mais tarde',
  'play.acceptOffset': 'Aceitar o desvio atual ({ms} ms)',

  'results.correct': 'Certas',
  'results.wrongValves': 'Pistões errados',
  'results.missed': 'Falhadas',
  'results.another': 'Outra',
  'results.sameAgain': 'A mesma outra vez',
  'results.settings': 'Definições',
  'results.dontCount': 'Não contes esta sessão: não estava mesmo a tocar',
  'results.windowed':
    'Nos últimos {bars} compassos — {whole}% em toda a sessão, sequência mais longa {streak}',
  'results.wholeRun': '{correct} de {total} notas, sequência mais longa {streak}',
  'results.beyond.one':
    '{n} compasso para além da duração que escolheste: a música continuou, e tu também.',
  'results.beyond.other':
    '{n} compassos para além da duração que escolheste: a música continuou, e tu também.',
  'results.averageLate': 'Em média {ms} ms atrasado nas notas que acertaste.',
  'results.notCounted':
    'Não foi tocado nada, por isso esta sessão não conta para o teu progresso.',
  'results.whatYouPlayed': 'O que tocaste',
  'results.allGreen': 'Todas as notas a verde: nada a corrigir.',
  'results.fingeringNote': 'A dedilhação por baixo de uma nota é a que ela pedia.',
  'results.worthDrilling': 'Vale a pena trabalhar',
  'results.drillingNote':
    'Acumulado ao longo de várias sessões em {instrument} na clave de {clef}, e escrito na tonalidade que acabaste de tocar.',

  'outputs.title': 'Saídas',
  'outputs.intro':
    'Todas as formas de ouvir a aplicação estão um pouco atrasadas em relação a ela, e cada uma numa medida diferente: uns auscultadores Bluetooth muito, uns com fio menos, e a coluna do próprio aparelho aquilo que o seu material custa. Mede cada uma uma vez e a aplicação adianta o som exatamente isso sempre que ela estiver escolhida.',
  'outputs.choosing':
    'Escolher aqui não desloca o som. É o telemóvel que decide por onde sai: liga uns auscultadores e sai por eles, esteja o que estiver selecionado abaixo. A escolha diz à aplicação qual a saída que tens mesmo nos ouvidos, para valer a correção certa; quando mudares para outra, di-lo aqui, porque a aplicação não dá por isso sozinha.',
  'outputs.notMeasured': 'Ainda não medida',
  'outputs.lead': 'Som adiantado {ms} ms',
  'outputs.measure': 'Medir',
  'outputs.measureNamed': 'Medir {name}',
  'outputs.measureNamedAgain': 'Medir {name} de novo',
  'outputs.forgetNamed': 'Esquecer {name}',
  'outputs.add': 'Adicionar uma saída',

  'calibrate.title': 'Medir {name}',
  'calibrate.intro':
    'Ouve pela saída que queres medir. Cada nota deve soar no momento em que a sua cabeça atravessa a linha: se o som chegar depois do que vês, adianta-o até os dois caírem juntos.',
  'calibrate.late': 'O som está atrasado: adiantar',
  'calibrate.early': 'O som está adiantado: atrasar',
  'calibrate.lead': 'Som adiantado',
  'calibrate.leadAria': 'Som adiantado, em milissegundos',
  'calibrate.drag':
    'Ou arrasta, se o som estiver muito fora. Os auscultadores Bluetooth andam muitas vezes um quinto de segundo atrás.',
  'calibrate.name': 'Como se chama esta saída?',
  'calibrate.namePlaceholder': 'Auscultadores',

  'range.choose': 'Escolher eu a extensão',
  'range.lowest': 'A mais grave',
  'range.highest': 'A mais aguda',
  'range.stave': 'Extensão: de {low} a {high}',
  'range.note': '{span} — todas as notas nela, sem favorecer o meio.',
  'dial.key': 'Tonalidade',
  'dial.tempo': 'Andamento',
  'dial.tempoValue': '{n} pulsações por minuto',
  'dial.valves': 'Pistões',

  'error.title': 'Alguma coisa avariou',
  'error.body':
    'A aplicação parou em vez de te mostrar algo errado. Vale a pena comunicar esta falha: a mensagem abaixo é a parte útil.',
  'error.version': 'versão {version} · compilada {built}',
  'error.back': 'Voltar ao início',
};
