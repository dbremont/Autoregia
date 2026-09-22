/* Tema: parónimos y palabras confundidas. */
(function () {
  "use strict";

  GV.registrarTema({
    id: "paronimos",
    titulo: "Parónimos traicioneros",
    inicial: "Hay",
    descripcion: "Hay/ahí/ay, hecho/echo, sino/si no, haber/a ver... Palabras que suenan igual y significan distinto.",
    teoria: [
      {
        titulo: "Ahí, hay, ay",
        regla: "«Ahí» (con h y tilde) señala lugar. «Hay» (con h) es el verbo haber. «Ay» (sin h) es una interjección de dolor o sorpresa.",
        ejemplos: [
          "Deja el libro ahí ✓ (lugar)",
          "Hay mucho ruido ✓ (existencia)",
          "¡Ay, qué dolor! ✓ (interjección)"
        ]
      },
      {
        titulo: "E y he",
        regla: "La conjunción «e» (en lugar de «y») solo se usa ante palabras que empiezan por «i» o «hi»: padres e hijos. «He» es la forma de haber: he comido.",
        ejemplos: [
          "Invitaron a padres e hijos ✓",
          "He terminado la tarea ✓",
          "Padres y hijos ✓ (no «e»: no empieza por i)",
          "Juan e Iñigo ✓"
        ]
      },
      {
        titulo: "Sino y si no",
        regla: "«Sino» (junto) contrapone: no vino Juan, sino María. «Si no» (separado) es condición negada: si no vienes, te llamaré. Prueba: si cabe «que» detrás o puedes añadir una oración con verbo, es «si no».",
        ejemplos: [
          "No lo hizo por dinero, sino por placer ✓",
          "Si no estudias, suspenderás ✓",
          "No vino sino que se quedó ✗ (aquí «sino que»... correcto con «que»)"
        ]
      },
      {
        titulo: "Hecho y echo",
        regla: "«Hecho» es el participio de hacer: he hecho, está hecho. «Echo» es el presente de echar: echo de menos, echo la basura.",
        ejemplos: [
          "Ya he hecho las maletas ✓",
          "Echo la sal en la sopa ✓",
          "He echo las maletas ✗ / He hecho ✗ jamás «hecho» con «e» de echar"
        ]
      },
      {
        titulo: "Haber y a ver",
        regla: "«Haber» es el verbo auxiliar o existencial. «A ver» (preposición + verbo) equivale a «vamos a comprobar»: vamos a ver; a ver si llega.",
        ejemplos: [
          "Debe de haber llegado ✓",
          "Vamos a ver una película ✓",
          "A ver si me explicas ✓",
          "Vamos haber si llega ✗"
        ]
      },
      {
        titulo: "Deber y deber de",
        regla: "«Deber + infinitivo» expresa obligación: debe venir (= tiene que venir). «Deber de + infinitivo» expresa suposición o probabilidad: debe de estar cansado (= probablemente está cansado).",
        ejemplos: [
          "Debes terminar el informe hoy ✓ (obligación)",
          "Debe de ser tarde; el sol se pone ✓ (deducción)",
          "La distinción, aunque recomendable, se está perdiendo en el uso"
        ]
      }
    ],
    ejercicios: [
      {
        tipo: "seleccion",
        enunciado: "___ mucho ruido en la calle.",
        opciones: ["Hay", "Ay", "Ahí"],
        respuesta: "Hay",
        regla: "«Hay» es el presente impersonal del verbo haber.",
        razon: "La oración expresa existencia (existe mucho ruido), así que se usa el verbo haber: hay. «Ay» es interjección y «ahí» es un adverbio de lugar.",
        ejemplos: [
          "Hay pan en la mesa ✓",
          "¡Ay, qué susto! ✓",
          "El pan está ahí ✓"
        ]
      },
      {
        tipo: "hueco",
        enunciado: "¡___, qué dolor de cabeza! (interjección)",
        respuesta: "ay",
        regla: "La interjección de dolor o sorpresa es «ay», sin h.",
        razon: "Las interjecciones reproducen exclamaciones espontáneas; esta se escribe «ay». Con «h» se escriben «hay» (verbo) y «ahí» (lugar).",
        ejemplos: [
          "¡Ay, no lo sabía! ✓",
          "¡Hay, qué dolor! ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Vamos ___ si aparece.",
        opciones: ["a ver", "haber"],
        respuesta: "a ver",
        regla: "«A ver» (preposición + verbo ver) significa comprobemos o miremos; «haber» es el verbo auxiliar.",
        razon: "El sentido es «comprobemos si aparece»: a ver si aparece. «Haber» no cabe: «vamos haber» es un error ortográfico muy común.",
        ejemplos: [
          "A ver si llueve ✓",
          "Debe de haber terminado ✓ (aquí sí «haber»)",
          "Vamos haber si llueve ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Invitaron a padres ___ hijos.",
        opciones: ["e", "y"],
        respuesta: "e",
        regla: "Ante palabras que empiezan por «i» o «hi», la conjunción «y» se convierte en «e».",
        razon: "Para evitar el choque de sonidos («ii»), la conjunción cambia: padres e hijos, Juan e Inés. No ocurre ante «hie» («hiena»: padre y hiena).",
        ejemplos: [
          "Español e inglés ✓",
          "Madre e hija ✓",
          "Padres y abuelos ✓ (no empieza por i)",
          "Aceite e hiel ✓"
        ]
      },
      {
        tipo: "hueco",
        enunciado: "___ no terminas la tarea, no saldrás.",
        respuesta: "si no",
        regla: "«Si no» (separado) es la condición negada: si no ocurre algo, pasa otra cosa.",
        razon: "Puede parafrasearse como «en caso de que no termines»: dos palabras con valor propio, cada una la suya. «Sino» (junto) solo contrapone tras una negación.",
        ejemplos: [
          "Si no vienes, avísame ✓",
          "Sino vienes, avísame ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "No lo hizo por dinero, ___ por placer.",
        opciones: ["sino", "si no"],
        respuesta: "sino",
        regla: "«Sino» (junto) contrapone un término a otro tras una negación.",
        razon: "La estructura «no X, sino Y» corrige o sustituye: no por dinero, sino por placer. «Si no» exigiría una condición con verbo, que aquí no hay.",
        ejemplos: [
          "No es alto, sino bajo ✓",
          "No vino, sino que se quedó ✓ (con verbo: sino que)",
          "No lo hizo por dinero, si no por placer ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Ya he ___ las maletas.",
        opciones: ["hecho", "echo"],
        respuesta: "hecho",
        regla: "El participio de «hacer» es «hecho»; «echo» proviene de «echar».",
        razon: "«Hacer + maletas» → he hecho las maletas. «Echar» significa arrojar o poner: echo la basura. Confundirlos altera radicalmente el sentido.",
        ejemplos: [
          "He hecho la cena ✓",
          "He echo la cena ✗",
          "Echo la casa de menos ✗ (lo correcto es «echo... de menos» con e: echar de menos ✓)"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Siempre ___ la basura por la mañana.",
        opciones: ["echo", "hecho"],
        respuesta: "echo",
        regla: "El presente de «echar» (arrojar, poner) es «echo».",
        razon: "«Echar la basura» = sacarla o arrojarla; en presente, echo. «Hecho» solo sirve como participio de hacer o sustantivo/adjetivo («un hecho», «pelo hecho»)).",
        ejemplos: [
          "Echo azúcar al café ✓",
          "Hecho azúcar al café ✗",
          "Es un hombre muy hecho ✓ (participio de hacer)"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Tiene sueño; ___ de ser tarde.",
        opciones: ["debe", "debe de"],
        respuesta: "debe de",
        regla: "«Deber de + infinitivo» expresa suposición o probabilidad.",
        razon: "La oración deduce («probablemente es tarde») a partir de una pista («tiene sueño»); esa deducción corresponde a «deber de». La obligación se expresa con «deber» a secas.",
        ejemplos: [
          "Debo estudiar hoy ✓ (obligación)",
          "Debe de estar lloviendo; traen paraguas ✓ (deducción)"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Quiero ___ azúcar en el café.",
        opciones: ["más", "mas"],
        respuesta: "más",
        regla: "El adverbio de cantidad es «más», siempre con tilde; la conjunción «mas» (= pero) no la lleva.",
        razon: "Se expresa cantidad (mayor cantidad de azúcar): más. La conjunción «mas» es de uso literario y solo sustituible por «pero».",
        ejemplos: [
          "Necesito más tiempo ✓",
          "Quiso ayudarme, mas no pudo ✓ (= pero)",
          "Quiero mas azúcar ✗"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: [
          "Vamos a ver una película.",
          "Vamos haber una película."
        ],
        respuesta: "Vamos a ver una película.",
        regla: "La perífrasis de futuro es «ir a + infinitivo» (a ver); «haber» no es el verbo que corresponde.",
        razon: "«Ir a ver» une la preposición «a» con el infinitivo «ver». Escribir «haber» es un error de oído: suenan igual, pero solo «ver» tiene sentido aquí.",
        ejemplos: [
          "Voy a ver a mis primos ✓",
          "Hay que ver lo que pasa ✓ (otra estructura, con haber)",
          "Voy haber a mis primos ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "No estudio por gusto, ___ por necesidad.",
        opciones: ["sino", "si no"],
        respuesta: "sino",
        regla: "«Sino» contrapone dos términos tras una negación: no X, sino Y.",
        razon: "La oración niega un motivo (gusto) y contrapone otro (necesidad): esa corrección es el trabajo de «sino». «Si no» necesitaría un verbo en condición.",
        ejemplos: [
          "No trabaja por dinero, sino por vocación ✓",
          "No vino porque no quiso ✓ (aquí «porque», no «sino»)",
          "No estudio por gusto, si no por necesidad ✗"
        ]
      }
    ]
  });
})();
