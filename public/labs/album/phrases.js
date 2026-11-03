/* Adult Album Creator — phrase banks (EN FR ES PT IT DE).
   Pure data + a tiny pick() helper. No network, no storage, no dependencies. */
(function (root) {
  'use strict';

  var LANGS = ['en', 'fr', 'es', 'pt', 'it', 'de'];

  // I(id, tones, [en, fr, es, pt, it, de], extra) -> phrase item
  function I(id, tones, texts, extra) {
    var t = {};
    for (var i = 0; i < LANGS.length; i++) t[LANGS[i]] = texts[i];
    var o = { id: id, tone: tones, t: t };
    if (extra) for (var k in extra) o[k] = extra[k];
    return o;
  }
  // L(arrayOfSix) -> {en,fr,...}
  function L(a) {
    var o = {};
    for (var i = 0; i < LANGS.length; i++) o[LANGS[i]] = a[i];
    return o;
  }
  // S(a1,a2,...) pairs per language -> {en:[l1,l2],...}
  function S(pairs) {
    var o = {};
    for (var i = 0; i < LANGS.length; i++) o[LANGS[i]] = pairs[i];
    return o;
  }

  var P = 'playful', C = 'classy', W = 'warm';

  /* ------------------------------------------------------------------ face (page 1) */
  var face = [
    I('p1-01', [P, W], [
      'You wanted a face pic? Here it is.',
      'Tu voulais voir ma tête ? La voici.',
      '¿Querías una foto de mi cara? Aquí la tienes.',
      'Queria ver meu rosto? Aqui está.',
      'Volevi una foto del mio viso? Eccola.',
      'Du wolltest ein Gesichtsfoto? Bitte sehr.'
    ]),
    I('p1-02', [C, P], [
      'No shades, no cap. Your turn.',
      'Sans lunettes, sans casquette. À toi.',
      'Sin lentes, sin gorra. Ahora tú.',
      'Sem óculos, sem boné. Sua vez.',
      'Niente occhiali, niente cappellino. Ora tocca a te.',
      'Ohne Sonnenbrille, ohne Cap. Du bist dran.'
    ]),
    I('p1-03', [C, P], [
      'Face first. The rest comes later.',
      'D’abord le visage. Le reste, après.',
      'Primero la cara. Lo demás viene después.',
      'Primeiro o rosto. O resto vem depois.',
      'Prima il viso. Il resto viene dopo.',
      'Erst das Gesicht. Der Rest kommt später.'
    ]),
    I('p1-04', [C, W], [
      'Yes, it’s really me.',
      'Oui, c’est vraiment moi.',
      'Sí, soy yo de verdad.',
      'Sim, sou eu mesmo.',
      'Sì, sono proprio io.',
      'Ja, das bin wirklich ich.'
    ]),
    I('p1-05', [W, C], [
      'Nice to put a face on a chat.',
      'Ça fait du bien de mettre un visage sur un chat.',
      'Qué bien ponerle cara a un chat.',
      'Que bom dar um rosto a um chat.',
      'Bello mettere una faccia a una chat.',
      'Schön, einem Chat ein Gesicht zu geben.'
    ]),
    I('p1-06', [W, P], [
      'Smile included. The rest is optional.',
      'Sourire inclus. Le reste est en option.',
      'Sonrisa incluida. Lo demás es opcional.',
      'Sorriso incluso. O resto é opcional.',
      'Sorriso incluso. Il resto è opzionale.',
      'Lächeln inklusive. Der Rest ist optional.'
    ])
  ];

  /* ------------------------------------------------------------------ intro (pages 2–3) */
  var intro = [
    I('p2-01', [P], [
      'You were wishing for more, right?',
      'Tu en voulais plus, non ?',
      '¿Querías más, no?',
      'Queria mais, né?',
      'Ne volevi di più, vero?',
      'Du wolltest mehr, oder?'
    ]),
    I('p2-02', [C, W], [
      'This is me, for real.',
      'C’est moi, en vrai.',
      'Este soy yo, en serio.',
      'Sou eu, de verdade.',
      'Questo sono io, davvero.',
      'Das bin ich, ganz echt.'
    ]),
    I('p2-03', [C, W], [
      'Let’s talk first.',
      'D’abord, on parle.',
      'Primero, hablemos.',
      'Primeiro, a gente conversa.',
      'Prima parliamo.',
      'Erst mal reden wir.'
    ]),
    I('p2-04', [C, W], [
      'I like to connect before anything else.',
      'J’aime connecter avant tout.',
      'Me gusta conectar antes que nada.',
      'Gosto de criar conexão antes de tudo.',
      'Mi piace creare intesa prima di tutto.',
      'Mir ist zuerst die Verbindung wichtig.'
    ]),
    I('p2-05', [P, W], [
      'A chat, a vibe… and if it clicks, things go off the rails fast.',
      'On papote, au feeling… et si ça accroche, ça dérape vite.',
      'Una charla, buena onda… y si hay química, todo se descontrola rápido.',
      'Um papo, uma vibe… e se rolar, a coisa foge do controle rápido.',
      'Due chiacchiere, feeling… e se scatta, si perde la testa in fretta.',
      'Ein Chat, ein Vibe … und wenn’s funkt, geht’s schnell zur Sache.'
    ]),
    I('p2-06', [P, W], [
      'Chill, but never boring.',
      'Cool, mais jamais ennuyeux.',
      'Tranqui, pero nunca aburrido.',
      'De boa, mas nunca chato.',
      'Rilassato, ma mai noioso.',
      'Entspannt, aber nie langweilig.'
    ]),
    I('p2-07', [W, C], [
      'Good energy only.',
      'Que des bonnes ondes.',
      'Pura buena energía.',
      'Só energia boa.',
      'Solo buone vibrazioni.',
      'Nur gute Energie.'
    ]),
    I('p2-08', [P, C], [
      'Swipe gently. Or not.',
      'Swipe doucement. Ou pas.',
      'Desliza con calma. O no.',
      'Deslize com calma. Ou não.',
      'Scorri piano. O no.',
      'Wisch sanft. Oder nicht.'
    ])
  ];

  /* ------------------------------------------------------------------ alert (page 4)
     t: full sentence; split: [line1 (white), line2 (coral)] per language; small: helper line. */
  var alert = [
    I('p4-01', [C, P, W], [
      'Nudes ahead. Keep swiping only if you want to see.',
      'Nudes à suivre. Continue à swiper seulement si tu as envie de voir.',
      'Nudes a continuación. Sigue deslizando solo si quieres ver.',
      'Nudes à frente. Continue deslizando só se quiser ver.',
      'Nudes in arrivo. Continua a scorrere solo se ti va di vedere.',
      'Nudes folgen. Wisch nur weiter, wenn du sehen willst.'
    ], {
      split: S([['Nudes', 'ahead.'], ['Nudes', 'à suivre.'], ['Nudes', 'a continuación.'],
        ['Nudes', 'à frente.'], ['Nudes', 'in arrivo.'], ['Nudes', 'folgen.']]),
      small: L(['Keep swiping only if you want to see.',
        'Continue à swiper seulement si tu as envie de voir.',
        'Sigue deslizando solo si quieres ver.',
        'Continue deslizando só se quiser ver.',
        'Continua a scorrere solo se ti va di vedere.',
        'Wisch nur weiter, wenn du sehen willst.'])
    }),
    I('p4-02', [C, W], [
      'From here, it’s 18+.',
      'À partir d’ici, c’est 18+.',
      'Desde aquí, es 18+.',
      'A partir daqui, é 18+.',
      'Da qui in poi, è 18+.',
      'Ab hier ist es 18+.'
    ], {
      split: S([['From here,', 'it’s 18+.'], ['À partir d’ici,', 'c’est 18+.'], ['Desde aquí,', 'es 18+.'],
        ['A partir daqui,', 'é 18+.'], ['Da qui in poi,', 'è 18+.'], ['Ab hier', 'ist es 18+.']]),
      small: L(['Adults only.', 'Réservé aux adultes.', 'Solo para adultos.',
        'Só para adultos.', 'Solo per adulti.', 'Nur für Erwachsene.'])
    }),
    I('p4-03', [P, C], [
      'Last chance to look away.',
      'Dernière chance de détourner les yeux.',
      'Última oportunidad de apartar la vista.',
      'Última chance de desviar o olhar.',
      'Ultima occasione per guardare altrove.',
      'Letzte Chance, wegzuschauen.'
    ], {
      split: S([['Last chance', 'to look away.'], ['Dernière chance', 'de détourner les yeux.'],
        ['Última oportunidad', 'de apartar la vista.'], ['Última chance', 'de desviar o olhar.'],
        ['Ultima occasione', 'per guardare altrove.'], ['Letzte Chance,', 'wegzuschauen.']]),
      small: L(['Or don’t. Your call.', 'Ou pas. À toi de voir.', 'O no. Tú decides.',
        'Ou não. Você decide.', 'O no. Decidi tu.', 'Oder auch nicht. Du entscheidest.'])
    }),
    I('p4-04', [P, W], [
      'Still curious? Swipe.',
      'Toujours curieux ? Swipe.',
      '¿Aún con curiosidad? Desliza.',
      'Ainda curioso? Deslize.',
      'Ancora curioso? Scorri.',
      'Noch neugierig? Wisch.'
    ], {
      split: S([['Still curious?', 'Swipe.'], ['Toujours curieux ?', 'Swipe.'], ['¿Aún con curiosidad?', 'Desliza.'],
        ['Ainda curioso?', 'Deslize.'], ['Ancora curioso?', 'Scorri.'], ['Noch neugierig?', 'Wisch.']]),
      small: L(['Consider yourself warned.', 'Te voilà prévenu.', 'Ya estás avisado.',
        'Você foi avisado.', 'Sei stato avvisato.', 'Du wurdest gewarnt.'])
    })
  ];

  /* ------------------------------------------------------------------ likes (pages 5–9) */
  var likes = [
    // style
    I('p5-01', [C, W], [
      'Love to receive. Love to give.',
      'J’aime donner. J’aime recevoir.',
      'Me encanta recibir. Me encanta dar.',
      'Amo receber. Amo dar.',
      'Mi piace ricevere. Mi piace dare.',
      'Ich gebe gern. Ich nehme gern.'
    ], { group: 'style' }),
    I('p5-02', [C, W], [
      'Prefer long sessions over quickies.',
      'Je préfère les longues sessions aux quickies.',
      'Prefiero las sesiones largas a los rapiditos.',
      'Prefiro sessões longas a rapidinhas.',
      'Meglio le sessioni lunghe dei mordi e fuggi.',
      'Lange Sessions sind mir lieber als Quickies.'
    ], { group: 'pace' }),
    I('p5-03', [C, P, W], [
      'Versatile — depends on the mood and the guy.',
      'Polyvalent — selon l’humeur et le mec.',
      'Versátil: depende del ánimo y del chico.',
      'Versátil — depende do clima e do cara.',
      'Versatile: dipende dall’umore e dal ragazzo.',
      'Vielseitig – hängt von Stimmung und Typ ab.'
    ], { group: 'style' }),
    I('p5-04', [C, W, P], [
      'Open-minded, no extreme kinks.',
      'Ouvert d’esprit, sans kinks extrêmes.',
      'Mente abierta, sin fetiches extremos.',
      'Mente aberta, sem fetiches extremos.',
      'Mentalità aperta, niente kink estremi.',
      'Aufgeschlossen, aber keine extremen Kinks.'
    ], { group: 'limits' }),
    I('p5-05', [C, W, P], [
      'I like talking about what we’re into.',
      'J’aime qu’on se dise ce qu’on aime.',
      'Me gusta hablar de lo que nos gusta.',
      'Gosto de conversar sobre o que a gente curte.',
      'Mi piace parlare di ciò che ci piace.',
      'Ich rede gern darüber, worauf wir stehen.'
    ], { group: 'limits' }),
    I('p5-06', [P, C, W], [
      'Respectful, but not too well-behaved.',
      'Respectueux, mais pas trop sage.',
      'Respetuoso, pero no tan bien portado.',
      'Respeitoso, mas nem tão bonzinho.',
      'Rispettoso, ma non troppo ammodo.',
      'Respektvoll, aber nicht allzu brav.'
    ], { group: 'style' }),
    I('p5-07', [P, W], [
      'Kissing is a must.',
      'Les bisous, c’est obligatoire.',
      'Los besos son obligatorios.',
      'Beijo é obrigatório.',
      'I baci sono d’obbligo.',
      'Küssen ist Pflicht.'
    ], { group: 'style' }),
    I('p5-08', [P, C], [
      'Slow start, strong finish.',
      'Je démarre doucement, je finis fort.',
      'Arranco lento, termino fuerte.',
      'Começo devagar, termino forte.',
      'Parto piano, finisco forte.',
      'Langsamer Start, starkes Finale.'
    ], { group: 'pace' }),
    I('p5-09', [C, W], [
      'Taking my time is my thing.',
      'Prendre mon temps, c’est mon truc.',
      'Tomarme mi tiempo es lo mío.',
      'Não ter pressa é a minha praia.',
      'Prendermi il mio tempo è il mio forte.',
      'Mir Zeit zu lassen ist mein Ding.'
    ], { group: 'pace' }),
    I('p5-10', [P, W, C], [
      'Playful in bed, gentle outside.',
      'Joueur au lit, doux en dehors.',
      'Juguetón en la cama, tierno fuera de ella.',
      'Brincalhão na cama, gentil fora dela.',
      'Giocherellone a letto, dolce fuori.',
      'Verspielt im Bett, sanft im Alltag.'
    ], { group: 'vibe' }),
    I('p5-11', [W], [
      'More of a cuddler than you’d think.',
      'Plus câlin qu’on ne le croit.',
      'Más cariñoso de lo que parece.',
      'Mais carinhoso do que parece.',
      'Più coccolone di quanto pensi.',
      'Kuschliger, als man denkt.'
    ], { group: 'vibe' }),
    I('p5-12', [W, C], [
      'Into confident guys. Shy ones too.',
      'J’aime les mecs sûrs d’eux. Les timides aussi.',
      'Me gustan los seguros de sí mismos. Los tímidos también.',
      'Curto caras seguros. Os tímidos também.',
      'Mi piacciono i tipi sicuri di sé. I timidi pure.',
      'Ich mag selbstbewusste Typen. Schüchterne auch.'
    ], { group: 'vibe' }),
    I('p5-13', [C, P, W], [
      'Best at night.',
      'Plutôt du soir.',
      'Mejor de noche.',
      'Melhor à noite.',
      'Meglio di sera.',
      'Abends in Bestform.'
    ], { group: 'pace' }),
    I('p5-14', [P], [
      'Morning person, if you know what I mean.',
      'Plutôt du matin, si tu vois ce que je veux dire.',
      'Más de mañanas, ya sabes a qué me refiero.',
      'Mais de manhã, se é que você me entende.',
      'Più mattiniero, se capisci cosa intendo.',
      'Eher der Morgentyp, du weißt schon.'
    ], { group: 'pace' }),
    I('p5-15', [C, P], [
      'No filter. All real.',
      'Sans filtre. Tout est vrai.',
      'Sin filtro. Todo real.',
      'Sem filtro. Tudo real.',
      'Senza filtri. Tutto vero.',
      'Ohne Filter. Alles echt.'
    ], { group: 'vibe' }),
    // extras
    I('p5-16', [P, W], [
      'A bit of banter goes a long way.',
      'Un peu de taquinerie, ça aide beaucoup.',
      'Un poco de picardía ayuda mucho.',
      'Uma provocação leve ajuda muito.',
      'Un po’ di battute fa sempre bene.',
      'Ein bisschen Geplänkel schadet nie.'
    ], { group: 'vibe' }),
    I('p5-17', [C, P], [
      'Eye contact does half the work.',
      'Le regard fait déjà la moitié du boulot.',
      'La mirada hace la mitad del trabajo.',
      'O olhar faz metade do trabalho.',
      'Lo sguardo fa metà del lavoro.',
      'Der Blickkontakt macht schon die halbe Arbeit.'
    ], { group: 'style' }),
    I('p5-18', [C, W, P], [
      'Clear limits, easy yeses.',
      'Des limites claires, des oui faciles.',
      'Límites claros, síes fáciles.',
      'Limites claros, sim sem drama.',
      'Limiti chiari, sì facili.',
      'Klare Grenzen, leichtes Ja.'
    ], { group: 'limits' }),
    I('p5-19', [C], [
      'Protection is non-negotiable.',
      'La protection, c’est non négociable.',
      'La protección no es negociable.',
      'Proteção não é negociável.',
      'La protezione non è negoziabile.',
      'Schutz ist nicht verhandelbar.'
    ], { group: 'limits' }),
    I('p5-20', [W, C], [
      'Tell me your limits, I’ll respect them.',
      'Dis-moi tes limites, je les respecte.',
      'Dime tus límites, yo los respeto.',
      'Me diga seus limites, eu respeito.',
      'Dimmi i tuoi limiti, io li rispetto.',
      'Sag mir deine Grenzen, ich respektiere sie.'
    ], { group: 'limits' })
  ];

  /* ------------------------------------------------------------------ rules (page 10) */
  var rules = [
    I('r-01', [C, W], [
      'Respect, always.',
      'Le respect, toujours.',
      'Respeto, siempre.',
      'Respeito, sempre.',
      'Rispetto, sempre.',
      'Respekt, immer.'
    ]),
    I('r-02', [C, W, P], [
      'Talk first, then we see.',
      'On discute d’abord, ensuite on voit.',
      'Primero hablamos, después vemos.',
      'Primeiro a gente conversa, depois vê.',
      'Prima si parla, poi si vede.',
      'Erst reden, dann sehen wir weiter.'
    ]),
    I('r-03', [C, W], [
      'Impeccable hygiene.',
      'Hygiène irréprochable.',
      'Higiene impecable.',
      'Higiene impecável.',
      'Igiene impeccabile.',
      'Tadellose Hygiene.'
    ]),
    I('r-04', [C, W], [
      'Face pic before meeting.',
      'Une photo de visage avant de se voir.',
      'Foto de cara antes de vernos.',
      'Foto do rosto antes de a gente se encontrar.',
      'Foto del viso prima di incontrarci.',
      'Gesichtsfoto, bevor wir uns treffen.'
    ]),
    I('r-05', [C, W], [
      'A quick video call so we’re on the same page.',
      'Un petit appel vidéo pour être sur la même longueur d’onde.',
      'Una videollamada rápida para estar en la misma sintonía.',
      'Uma chamada de vídeo rápida pra alinhar as expectativas.',
      'Una breve videochiamata per essere sulla stessa lunghezza d’onda.',
      'Kurzer Videocall, damit wir auf einer Wellenlänge sind.'
    ]),
    I('r-06', [P, C], [
      'No “hi” with nothing else.',
      'Pas de « salut » tout seul.',
      'Nada de un «hola» solo.',
      'Nada de «oi» e mais nada.',
      'Niente «ciao» e basta.',
      'Kein einsames „Hi“.'
    ]),
    I('r-07', [C, W, P], [
      'Be honest with your pics.',
      'Sois honnête avec tes photos.',
      'Sé honesto con tus fotos.',
      'Seja honesto com suas fotos.',
      'Sii onesto con le tue foto.',
      'Sei ehrlich mit deinen Fotos.'
    ]),
    I('r-08', [C, W], [
      'Discretion goes both ways.',
      'La discrétion, ça marche dans les deux sens.',
      'La discreción va en ambos sentidos.',
      'Discrição é pros dois lados.',
      'La discrezione vale per entrambi.',
      'Diskretion gilt für beide Seiten.'
    ]),
    I('r-09', [C, W, P], [
      'Consent at every step.',
      'Le consentement, à chaque étape.',
      'Consentimiento en cada paso.',
      'Consentimento a cada passo.',
      'Consenso a ogni passo.',
      'Einverständnis bei jedem Schritt.'
    ]),
    I('r-10', [C, P], [
      'Say clearly what you want.',
      'Dis clairement ce que tu veux.',
      'Di claramente lo que quieres.',
      'Diga claramente o que você quer.',
      'Dì chiaramente cosa vuoi.',
      'Sag klar, was du willst.'
    ]),
    I('r-11', [W, C], [
      'No pressure, no rush.',
      'Pas de pression, pas d’urgence.',
      'Sin presión, sin prisa.',
      'Sem pressão, sem pressa.',
      'Niente pressioni, niente fretta.',
      'Kein Druck, keine Eile.'
    ]),
    I('r-12', [P, W], [
      'Not into it? Just say so.',
      'Pas intéressé ? Dis-le, simplement.',
      '¿No te va? Solo dilo.',
      'Não curtiu? É só dizer.',
      'Non ti va? Basta dirlo.',
      'Keine Lust? Sag es einfach.'
    ])
  ];

  /* ------------------------------------------------------------------ end (page 10 closing)
     t = split joined with a space; split: [line1 (white), line2 (coral)] per language. */
  var end = [
    I('e-01', [P, C, W], [
      'Liked it? Say it. Didn’t? Say that too.',
      'Ça t’a plu ? Dis-le. Pas plu ? Dis-le aussi.',
      '¿Te gustó? Dilo. ¿No? Dilo también.',
      'Gostou? Diga. Não gostou? Diga também.',
      'Ti è piaciuto? Dillo. Se no, dillo lo stesso.',
      'Gefallen? Sag’s. Nicht gefallen? Sag’s auch.'
    ], {
      split: S([['Liked it? Say it.', 'Didn’t? Say that too.'], ['Ça t’a plu ? Dis-le.', 'Pas plu ? Dis-le aussi.'],
        ['¿Te gustó? Dilo.', '¿No? Dilo también.'], ['Gostou? Diga.', 'Não gostou? Diga também.'],
        ['Ti è piaciuto? Dillo.', 'Se no, dillo lo stesso.'], ['Gefallen? Sag’s.', 'Nicht gefallen? Sag’s auch.']])
    }),
    I('e-02', [C, P], [
      'Your move.',
      'À toi de jouer.',
      'Tu turno.',
      'Sua vez.',
      'Tocca a te.',
      'Du bist dran.'
    ], {
      split: S([['Your', 'move.'], ['À toi', 'de jouer.'], ['Tu', 'turno.'],
        ['Sua', 'vez.'], ['Tocca', 'a te.'], ['Du bist', 'dran.']])
    }),
    I('e-03', [P, W], [
      'Still here? Then text me.',
      'Toujours là ? Alors écris-moi.',
      '¿Sigues ahí? Entonces escríbeme.',
      'Ainda aí? Então me chama.',
      'Sei ancora qui? Allora scrivimi.',
      'Noch da? Dann schreib mir.'
    ], {
      split: S([['Still here?', 'Then text me.'], ['Toujours là ?', 'Alors écris-moi.'],
        ['¿Sigues ahí?', 'Entonces escríbeme.'], ['Ainda aí?', 'Então me chama.'],
        ['Sei ancora qui?', 'Allora scrivimi.'], ['Noch da?', 'Dann schreib mir.']])
    }),
    I('e-04', [P, C], [
      'Your turn to show me.',
      'À ton tour de te montrer.',
      'Ahora te toca mostrarte.',
      'Agora é a sua vez de se mostrar.',
      'Ora tocca a te mostrarti.',
      'Jetzt bist du dran, dich zu zeigen.'
    ], {
      split: S([['Your turn', 'to show me.'], ['À ton tour', 'de te montrer.'],
        ['Ahora te toca', 'mostrarte.'], ['Agora é a sua vez', 'de se mostrar.'],
        ['Ora tocca a te', 'mostrarti.'], ['Jetzt bist du dran,', 'dich zu zeigen.']])
    }),
    I('e-05', [C, W], [
      'Stay respectful — that’s all I ask.',
      'Reste respectueux, c’est tout ce que je demande.',
      'Sé respetuoso, es todo lo que pido.',
      'Seja respeitoso, é só o que eu peço.',
      'Sii rispettoso, è tutto ciò che chiedo.',
      'Bleib respektvoll – mehr verlange ich nicht.'
    ], {
      split: S([['Stay respectful —', 'that’s all I ask.'], ['Reste respectueux,', 'c’est tout ce que je demande.'],
        ['Sé respetuoso,', 'es todo lo que pido.'], ['Seja respeitoso,', 'é só o que eu peço.'],
        ['Sii rispettoso,', 'è tutto ciò che chiedo.'], ['Bleib respektvoll –', 'mehr verlange ich nicht.']])
    }),
    I('e-06', [C], [
      'If you don’t play fair with your pics, I may not reply.',
      'Si tu ne joues pas le jeu avec tes photos, je risque de ne pas répondre.',
      'Si no eres honesto con tus fotos, puede que no responda.',
      'Se você não for honesto com as fotos, posso não responder.',
      'Se non giochi pulito con le foto, potrei non rispondere.',
      'Wer bei den Fotos schummelt, bekommt vielleicht keine Antwort.'
    ], {
      split: S([['If you don’t play fair with your pics,', 'I may not reply.'],
        ['Si tu ne joues pas le jeu avec tes photos,', 'je risque de ne pas répondre.'],
        ['Si no eres honesto con tus fotos,', 'puede que no responda.'],
        ['Se você não for honesto com as fotos,', 'posso não responder.'],
        ['Se non giochi pulito con le foto,', 'potrei non rispondere.'],
        ['Wer bei den Fotos schummelt,', 'bekommt vielleicht keine Antwort.']])
    })
  ];

  /* ------------------------------------------------------------------ tones */
  var tones = {
    playful: {
      label: L(['Playful & teasing', 'Joueur et taquin', 'Juguetón y pícaro', 'Brincalhão e provocador', 'Giocoso e provocante', 'Verspielt & neckisch']),
      sample: L(['You were wishing for more, right?', 'Tu en voulais plus, non ?', '¿Querías más, no?',
        'Queria mais, né?', 'Ne volevi di più, vero?', 'Du wolltest mehr, oder?'])
    },
    classy: {
      label: L(['Classy & direct', 'Classe et direct', 'Elegante y directo', 'Elegante e direto', 'Elegante e diretto', 'Stilvoll & direkt']),
      sample: L(['No filter. Your move.', 'Sans filtre. À toi de jouer.', 'Sin filtro. Tu turno.',
        'Sem filtro. Sua vez.', 'Senza filtri. Tocca a te.', 'Ohne Filter. Du bist dran.'])
    },
    warm: {
      label: L(['Warm & funny', 'Chaleureux et drôle', 'Cálido y divertido', 'Caloroso e divertido', 'Caloroso e divertente', 'Herzlich & witzig']),
      sample: L(['Promise, I don’t bite (unless you ask).', 'Promis, je mords pas (sauf si tu demandes).',
        'Prometo que no muerdo (a menos que me lo pidas).', 'Prometo que não mordo (a menos que você peça).',
        'Giuro che non mordo (a meno che tu non me lo chieda).', 'Versprochen, ich beiße nicht (außer du bittest darum).'])
    }
  };

  /* ------------------------------------------------------------------ strings printed on the images */
  var img = {
    tagline: L([
      'Your album in 5 min · your rules first → fluidz.app/album',
      'Ton album en 5 min · tes règles d’abord → fluidz.app/album',
      'Tu álbum en 5 min · tus reglas primero → fluidz.app/album',
      'Seu álbum em 5 min · suas regras primeiro → fluidz.app/album',
      'Il tuo album in 5 min · prima le tue regole → fluidz.app/album',
      'Dein Album in 5 Min. · deine Regeln zuerst → fluidz.app/album'
    ]),
    madeWith: L(['Made with Fluidz Labs', 'Fait avec Fluidz Labs', 'Hecho con Fluidz Labs',
      'Feito com Fluidz Labs', 'Fatto con Fluidz Labs', 'Gemacht mit Fluidz Labs']),
    badge: '● 18+ · NSFW',
    brand: 'fluidz labs'
  };

  var banks = { face: face, intro: intro, alert: alert, likes: likes, rules: rules, end: end };

  /* ------------------------------------------------------------------ helpers */
  function suits(item, tone) {
    if (!tone || !tones[tone]) return true;           // unknown/empty tone: anything goes
    return item.tone.indexOf(tone) !== -1;
  }

  function toSet(exclude) {
    var s = {};
    if (!exclude) return s;
    if (typeof exclude.forEach === 'function') {      // Array or Set
      exclude.forEach(function (x) { s[x] = true; });
    } else if (typeof exclude === 'string') {
      s[exclude] = true;
    }
    return s;
  }

  // Returns up to n distinct items from banks[bankName] suiting `tone`, never an id in `exclude`, in random order.
  function pick(bankName, tone, n, exclude) {
    var bank = banks[bankName];
    if (!bank) return [];
    var ex = toSet(exclude);
    var pool = [];
    for (var i = 0; i < bank.length; i++) {
      if (!ex[bank[i].id] && suits(bank[i], tone)) pool.push(bank[i]);
    }
    for (var j = pool.length - 1; j > 0; j--) {      // Fisher–Yates
      var k = Math.floor(Math.random() * (j + 1));
      var tmp = pool[j]; pool[j] = pool[k]; pool[k] = tmp;
    }
    var count = Math.max(0, Math.min(pool.length, (n === undefined || n === null) ? 1 : Math.floor(n)));
    return pool.slice(0, count);
  }

  function byId(id) {
    for (var b in banks) {
      for (var i = 0; i < banks[b].length; i++) if (banks[b][i].id === id) return banks[b][i];
    }
    return null;
  }

  root.AlbumPhrases = {
    langs: LANGS.slice(),
    langNames: { en: 'English', fr: 'Français', es: 'Español', pt: 'Português', it: 'Italiano', de: 'Deutsch' },
    banks: banks,
    tones: tones,
    img: img,
    pick: pick,
    byId: byId
  };
})(typeof window !== 'undefined' ? window : this);
