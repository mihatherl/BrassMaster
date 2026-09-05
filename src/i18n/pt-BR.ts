/**
 * Brazilian Portuguese — complete, and drafted for review by a native brass
 * player.
 *
 * **The sibling of `pt-PT.ts`**, and the reason the split exists. The words
 * below are where the two diverge, and they are not rare words — they are on
 * the calibration screen, the outputs screen and the stall warning, which is
 * to say on the screens a new player meets first:
 *
 *     ecrã        → tela
 *     telemóvel   → celular
 *     auscultadores → fones de ouvido
 *     ficheiro    → arquivo
 *     separador   → aba
 *     registo     → registro
 *     definições  → configurações
 *
 * Also the grammar: Brazilian Portuguese takes `você` where European takes
 * `tu`, and prefers the gerund (`está carregando`) where European takes
 * `a carregar`. Both are followed here.
 *
 * Duration names are the same as European (semínima, colcheia, semicolcheia);
 * the notation vocabulary did not fork, only the everyday nouns.
 */
import type { Pack } from './index';

export const PT_BR: Pack = {
  'common.back': 'Voltar',
  'common.save': 'Salvar',
  'common.cancel': 'Cancelar',
  'common.forget': 'Esquecer',
  'common.done': 'Pronto',
  'common.clear': 'Limpar',

  'home.structured': 'Aprendizado guiado',
  'home.free': 'Jogo livre',
  'home.start': 'Começar',
  'home.myMusic': 'Minhas partituras',
  'home.reading': 'Leitura',
  'home.what': 'O que',
  'home.keysByPlaylist': 'Escolhidas melodia por melodia na sua lista',
  'home.levelByPlaylist': 'Definido pela sua lista',
  'home.timeFollowsTune': 'Segue a melodia',
  'home.instrument': 'Instrumento',
  'home.clef': 'Clave',
  'home.language': 'Idioma',
  'home.keys': 'Tonalidades',
  'home.drill': 'Exercício',
  'home.difficulty': 'Dificuldade',
  'home.timeSignature': 'Fórmula de compasso',
  'home.register': 'Registro',
  'home.tunesFrom': 'Peças de',
  'home.composed': 'Composto',
  'home.selection': 'Seleção',
  'home.medley': 'Série aleatória',
  'home.defined': 'Definida',
  'home.favourWrong': 'Priorizar as notas que eu erro',
  'home.keysRoute': 'Toca {route}, mudando de tonalidade pelo caminho.',
  'home.doubleSharp':
    'Um método escreve a sétima elevada de {key} com dobrado sustenido. Este aplicativo nunca imprime um, então aparece o bequadro por cima.',
  'home.composedNote':
    'Peças novas, escritas para esta sessão. Escolha uma ou mais coleções para tocar música escrita.',
  'home.nothingAtLevel':
    'Neste nível não há nada escrito aqui, então vão tocar peças compostas. Experimente outro nível.',
  'home.medleyNote': 'O que houver nas coleções escolhidas, no nível escolhido.',
  'home.playingSteps.one': 'Toca {n} passo na ordem que você definiu, na tonalidade dele.',
  'home.playingSteps.other':
    'Toca {n} passos na ordem que você definiu, cada um na sua própria tonalidade.',
  'home.shortenedSpan':
    '{instrument} em {key} só tem espaço para {span}, e é isso que você vai ter — a nota inicial do exercício fica aguda demais para mais que isso.',
  'home.writtenRange': 'Extensão escrita de {low} a {high}.',
  'home.writtenRangeConcert': 'Extensão escrita de {low} a {high} (som real).',

  'clef.treble': 'Clave de sol',
  'clef.bass': 'Clave de fá',
  'clefShort.treble': 'Sol',
  'clefShort.bass': 'Fá',

  'kind.drills': 'Exercícios',
  'kind.phrases': 'Frases',
  'kind.themes': 'Melodias',
  'kind.drills.blurb': 'Escalas e arpejos.',
  'kind.phrases.blurb': 'Frases musicais com contorno, saltos e pausas.',
  'kind.themes.blurb': 'Melodias que você conhece e gosta de tocar.',

  'picker.title': 'Escolher peças e tonalidades',
  'picker.available': 'Disponíveis',
  'picker.steps':
    'Toque numa peça e depois numa das tonalidades dela para adicionar um passo. A mesma peça pode entrar duas vezes: em duas tonalidades, ou na mesma.',
  'picker.note':
    'Nem toda peça cabe em toda tonalidade em todo instrumento. Indique aqui as tonalidades e cada peça abaixo vai oferecer as que consegue tocar no {instrument}.',

  'gate.tempo': 'Andamento',
  'gate.reading': 'Leitura',
  'gate.beat': 'Pulsação',
  'gate.sound': 'Som',
  'gate.fingerings': 'Dedilhados',
  'gate.preferences': 'Preferências',
  'gate.metronome': 'Metrônomo',
  'gate.conductor': 'Regente',
  'gate.beatBands': 'Sombreado dos tempos',
  'gate.metronomeVolume': 'Volume do metrônomo',
  'gate.metronomeVolumeNote':
    'Você ouve enquanto ajusta. O clique é timbrado para passar por cima de um instrumento na sala: abaixe quando estiver lendo contra a voz do aplicativo.',
  'gate.key': 'Tonalidade',
  'gate.yourChoice': 'Neste nível você escolhe',
  'gate.keyRemembered': 'Fica guardada para o próximo nível que deixar a tonalidade com você.',
  'gate.setByCourse': 'Definido pelo curso para este nível.',
  'gate.variableTempo': 'Andamento variável',
  'gate.scrollSpeed': 'Velocidade de rolagem',
  'gate.scrollSpeedNote':
    'A que velocidade a música anda, qualquer que seja o andamento. O espaçamento acompanha.',
  'gate.conductorStyle': 'Estilo da batuta',
  'gate.conductorStyleNote':
    'Com que nitidez a pulsação cai. O ligado é mais difícil de seguir, e é essa a intenção.',
  'gate.cushion': 'Colchão sonoro',
  'gate.cushionNote':
    'Quão alto é o som suave por trás de uma nota até você dedilhar certo, em relação ao instrumento que assume quando você acerta.',
  'gate.cushionOff':
    'Desligado nesta saída: o som dela chega {ms} ms atrasado, então o instrumento que assume seria ouvido muito depois do dedilhado a que ele responde. A avaliação aparece na tela em vez disso.',
  'gate.timingTolerance': 'Tolerância rítmica',
  'gate.countIn': 'Compasso de entrada',
  'gate.countIn.none': 'Nenhum',
  'gate.countIn.1': '1 compasso',
  'gate.countIn.2': '2 compassos',
  'gate.compound': 'Semínimas pontuadas: {n} por compasso, a pulsação que você conta.',
  'beat.both': 'Metrônomo + regente',
  'beat.none': 'Nada marca o tempo',

  'reading.scrolling': 'Linha em movimento',
  'reading.paged': 'Ler a página',
  'playback.reference': 'Tocar as notas',
  'playback.off': 'Silencioso',
  'fingerings.trouble': 'Onde eu travo',
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

  'difficulty.beginner': 'Iniciante',
  'difficulty.beginner.blurb':
    'Segundas e terças dentro de uma oitava, semínimas e mínimas. Sem acidentes.',
  'difficulty.beginner.patterns': 'Quinta',
  'difficulty.beginner.patternsBlurb':
    'As cinco primeiras notas da tonalidade, subindo e descendo, em semínimas simples.',
  'difficulty.easy': 'Fácil',
  'difficulty.easy.blurb':
    'Uma oitava e meia, colcheias, um acidente e uma ligadura de vez em quando.',
  'difficulty.easy.patterns': '1 oitava',
  'difficulty.easy.patternsBlurb':
    'Uma oitava inteira, subindo e descendo, em semínimas simples.',
  'difficulty.medium': 'Médio',
  'difficulty.medium.blurb':
    'Saltos maiores, ritmos pontuados, ligaduras sobre a barra de compasso, acidentes para valer.',
  'difficulty.medium.patterns': '2 oitavas',
  'difficulty.medium.patternsBlurb':
    'Duas oitavas, com colcheias misturadas. Os ritmos pontuados esperam o Difícil.',
  'difficulty.hard': 'Difícil',
  'difficulty.hard.blurb': 'Duas oitavas, passagens de semicolcheias, acidentes frequentes.',
  'difficulty.hard.patterns': '2 oit · misto',
  'difficulty.hard.patternsBlurb':
    'Duas oitavas, com passagens de semicolcheias e uma pausa de vez em quando.',

  'drill.major-scale': 'Escala maior',
  'drill.harmonic-minor-scale': 'Escala menor harmônica',
  'drill.melodic-minor-scale': 'Escala menor melódica',
  'drill.tonic-arpeggio': 'Arpejo de tônica',
  'drill.subdominant-arpeggio': 'Arpejo de subdominante',
  'drill.dominant-arpeggio': 'Arpejo de dominante',
  'drill.dominant-7th': 'Sétima da dominante',
  'drill.relative-minor-arpeggio': 'Arpejo menor',

  'play.tapToStart': 'Toque para começar',
  'play.loading': 'Carregando o instrumento…',
  'play.starting': 'Começando…',
  'play.tryAgain': 'Tentar de novo',
  'play.stop': 'Parar',
  'play.continue': 'Continuar',
  'play.pause': 'Pausa',
  'play.start': 'Começar',
  'play.ready': 'Pronto',
  'play.lockStopped':
    'A sessão parou quando a tela apagou: nada é avaliado sem ser visto.',
  'play.stalled': 'O som não começou',
  'play.stalledNote':
    'O celular cortou o som antes de o exercício engrenar — ele faz isso depois que o aplicativo fica um tempo fora — e o compasso de entrada trava. Tentar de novo começa o som do zero.',
  'play.leadNote': 'Som adiantado {ms} ms para {name}',
  'play.backOneBar': 'Um compasso atrás',
  'play.backFiveBars': 'Cinco compassos atrás',
  'play.calibrationTitle': 'Precisa calibrar',
  'play.calibrationBody':
    'Ajuste suas caixas de som ou fones de ouvido à pulsação para que tudo caia junto.',
  'play.calibrationWhere':
    'Você pode medir {output} quando quiser em Saídas, no menu Avançado.',
  'play.anOutput': 'uma saída',
  'play.calibrateNow': 'Calibrar agora',
  'play.later': 'Mais tarde',
  'play.acceptOffset': 'Aceitar o desvio atual ({ms} ms)',

  'results.correct': 'Certas',
  'results.wrongValves': 'Pistões errados',
  'results.missed': 'Perdidas',
  'results.another': 'Outra',
  'results.sameAgain': 'A mesma de novo',
  'results.settings': 'Configurações',
  'results.dontCount': 'Não conte esta sessão: eu não estava tocando de verdade',
  'results.windowed':
    'Nos últimos {bars} compassos — {whole}% na sessão inteira, sequência mais longa {streak}',
  'results.wholeRun': '{correct} de {total} notas, sequência mais longa {streak}',
  'results.beyond.one':
    '{n} compasso além do tamanho que você escolheu: a música continuou, e você também.',
  'results.beyond.other':
    '{n} compassos além do tamanho que você escolheu: a música continuou, e você também.',
  'results.averageLate': 'Em média {ms} ms atrasado nas notas que você acertou.',
  'results.notCounted':
    'Não foi tocado nada, então esta sessão não conta para o seu progresso.',
  'results.whatYouPlayed': 'O que você tocou',
  'results.allGreen': 'Todas as notas em verde: nada a corrigir.',
  'results.fingeringNote': 'O dedilhado embaixo de uma nota é o que ela pedia.',
  'results.worthDrilling': 'Vale a pena treinar',
  'results.drillingNote':
    'Acumulado ao longo de várias sessões no {instrument} na clave de {clef}, e escrito na tonalidade que você acabou de tocar.',

  'outputs.title': 'Saídas',
  'outputs.intro':
    'Toda forma de ouvir o aplicativo fica um pouco atrás dele, e cada uma numa medida diferente: fones de ouvido Bluetooth muito, os com fio menos, e a caixa de som do próprio aparelho o quanto o material dele custar. Meça cada uma uma vez e o aplicativo adianta o som exatamente isso sempre que ela estiver escolhida.',
  'outputs.choosing':
    'Escolher aqui não move o som. É o celular que decide por onde sai: ligue um fone e vai sair por ele, esteja o que estiver marcado abaixo. A escolha diz ao aplicativo qual saída você tem de fato nos ouvidos, para valer a correção certa; quando trocar por outra, avise aqui, porque o aplicativo não percebe sozinho.',
  'outputs.notMeasured': 'Ainda não medida',
  'outputs.lead': 'Som adiantado {ms} ms',
  'outputs.measure': 'Medir',
  'outputs.measureNamed': 'Medir {name}',
  'outputs.measureNamedAgain': 'Medir {name} de novo',
  'outputs.forgetNamed': 'Esquecer {name}',
  'outputs.add': 'Adicionar uma saída',

  'calibrate.title': 'Medir {name}',
  'calibrate.intro':
    'Ouça pela saída que você quer medir. Cada nota deve soar no momento em que a cabeça dela cruza a linha: se o som chegar depois do que você vê, adiante até os dois caírem juntos.',
  'calibrate.late': 'O som está atrasado: adiantar',
  'calibrate.early': 'O som está adiantado: atrasar',
  'calibrate.lead': 'Som adiantado',
  'calibrate.leadAria': 'Som adiantado, em milissegundos',
  'calibrate.drag':
    'Ou arraste, se o som estiver muito fora. Fones de ouvido Bluetooth costumam ficar um quinto de segundo atrás.',
  'calibrate.name': 'Como se chama esta saída?',
  'calibrate.namePlaceholder': 'Fones de ouvido',

  'range.choose': 'Eu escolho a extensão',
  'range.lowest': 'A mais grave',
  'range.highest': 'A mais aguda',
  'range.stave': 'Extensão: de {low} a {high}',
  'range.note': '{span} — todas as notas dentro dela, sem favorecer o meio.',
  'dial.key': 'Tonalidade',
  'dial.tempo': 'Andamento',
  'dial.tempoValue': '{n} pulsações por minuto',
  'dial.valves': 'Pistões',

  'error.title': 'Alguma coisa quebrou',
  'error.body':
    'O aplicativo parou em vez de te mostrar algo errado. Vale a pena relatar essa falha: a mensagem abaixo é a parte útil.',
  'error.version': 'versão {version} · compilada {built}',
  'error.back': 'Voltar ao início',
};
