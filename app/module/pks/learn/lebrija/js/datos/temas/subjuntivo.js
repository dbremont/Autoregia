/* Tema: indicativo vs. subjuntivo. */
(function () {
  "use strict";

  GV.registrarTema({
    id: "subjuntivo",
    titulo: "Indicativo y subjuntivo",
    inicial: "Sub",
    descripcion: "Creo que / no creo que, cuando + futuro, aunque + hecho o hipótesis. El corazón del español avanzado.",
    teoria: [
      {
        titulo: "Creencia y negación",
        regla: "«Creo que», «pienso que», «parece que», «es verdad que» van con indicativo. Al negarlos («no creo que», «no pienso que», «no es verdad que»), el verbo siguiente pasa al subjuntivo.",
        ejemplos: [
          "Creo que viene mañana ✓ (indicativo)",
          "No creo que venga mañana ✓ (subjuntivo)",
          "Parece que lloverá ✓ / No parece que llueva ✓"
        ]
      },
      {
        titulo: "Cláusulas de tiempo: habitual, pasado y futuro",
        regla: "Con «cuando», «después de que», «hasta que» y «en cuanto»: indicativo para lo habitual o lo ya ocurrido; subjuntivo para lo que aún no ha sucedido (futuro).",
        ejemplos: [
          "Cuando llego a casa, ceno (hábito: indicativo)",
          "Cuando llegó, ya nos habíamos ido (pasado: indicativo)",
          "Cuando llegues, te llamo (aún no ocurre: subjuntivo)",
          "En cuanto termine, salimos ✓ (subjuntivo)"
        ]
      },
      {
        titulo: "«Aunque»: hecho real frente a hipótesis",
        regla: "«Aunque + indicativo» presenta un hecho cierto que no impide lo principal. «Aunque + subjuntivo» presenta una concesión hipotética, posible o no.",
        ejemplos: [
          "Aunque hace frío, iremos (hace frío de verdad: indicativo)",
          "Aunque haga frío, iremos (quizá haga frío: subjuntivo)",
          "Aunque llueve, saldremos ✓ / Aunque llueva, saldremos ✓ (sentidos distintos)"
        ]
      },
      {
        titulo: "Deseo, duda e influencia",
        regla: "«Ojalá» va siempre con subjuntivo. «Tal vez» y «quizás» admiten ambos modos: con subjuntivo expresan menor certeza. Los verbos de voluntad e influencia (querer que, pedir que, es importante que) exigen subjuntivo.",
        ejemplos: [
          "Ojalá tengas suerte ✓",
          "Ojalá pudiera quedarme ✓",
          "Es importante que llegues puntual ✓",
          "Quiero que vengas ✓ (nunca «quiero que vienes»)"
        ]
      },
      {
        titulo: "«Como si»",
        regla: "La comparación hipotética «como si» va siempre con imperfecto de subjuntivo (o pluscuamperfecto): nunca con indicativo.",
        ejemplos: [
          "Habla como si lo supiera todo ✓",
          "Gasta como si fuera millonario ✓",
          "Habla como si lo sabe todo ✗"
        ]
      }
    ],
    ejercicios: [
      {
        tipo: "hueco",
        enunciado: "Creo que ella ___ (venir) mañana. (verbo venir, presente)",
        respuesta: "viene",
        regla: "«Creo que» va con indicativo: afirmo algo que presento como cierto.",
        razon: "La creencia afirmada selecciona indicativo («viene»). Solo la negación («no creo que») cambia al subjuntivo.",
        ejemplos: [
          "Creo que viene ✓",
          "No creo que venga ✓",
          "Creo que venga ✗"
        ]
      },
      {
        tipo: "hueco",
        enunciado: "No creo que ella ___ (venir) mañana. (verbo venir, presente)",
        respuesta: "venga",
        regla: "La negación de creencia («no creo que») arrastra al subjuntivo.",
        razon: "Al negar, la oración presenta el hecho como dudoso o irreal para el hablante, y la duda exige subjuntivo: venga.",
        ejemplos: [
          "No creo que venga ✓",
          "No creo que viene ✗",
          "No pienso que sea buena idea ✓"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Cuando ___ a Madrid, te llamaré. (algún día futuro)",
        opciones: ["llegue", "llego"],
        respuesta: "llegue",
        regla: "«Cuando» + acción futura aún no realizada exige subjuntivo.",
        razon: "La llegada aún no ha ocurrido: es una hipótesis sobre el futuro, y el español exige subjuntivo en las cláusulas temporales futuras: cuando llegue, te llamaré.",
        ejemplos: [
          "Cuando llegues, cenamos ✓",
          "Cuando llegues a Madrid, te llamaré ✓",
          "Cuando llego a Madrid, te llamaré ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Cuando ___ a Madrid, siempre hace frío. (costumbre)",
        opciones: ["llego", "llegue"],
        respuesta: "llego",
        regla: "«Cuando» + acción habitual o repetida va con indicativo.",
        razon: "Se describe un hábito: cada vez que llego, hace frío. Lo habitual y lo ya ocurrido seleccionan indicativo; solo el futuro puro exige subjuntivo.",
        ejemplos: [
          "Cuando voy al cine, compro palomitas ✓ (hábito)",
          "Cuando llegué, hacía sol ✓ (pasado)",
          "Cuando llegue al cine, compro palomitas ✗ (para hábito)"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "(Afuera está lloviendo ahora mismo.) Iré a la tienda aunque ___ lloviendo.",
        opciones: ["esté", "está"],
        respuesta: "está",
        regla: "«Aunque + indicativo» presenta el hecho como real y cierto.",
        razon: "Como la lluvia es un hecho comprobable (está lloviendo ahora), se usa indicativo: aunque está lloviendo. El subjuntivo («aunque esté») dejaría la lluvia en hipótesis.",
        ejemplos: [
          "Aunque está cansado, seguirá trabajando ✓ (está cansado de verdad)",
          "Aunque esté cansado, seguirá ✓ (quizá esté, quizá no)"
        ]
      },
      {
        tipo: "hueco",
        enunciado: "Ojalá ___ (tener) más tiempo. (presente de subjuntivo)",
        respuesta: "tenga",
        variantes: ["tuviera"],
        regla: "«Ojalá» exige subjuntivo: presente para deseos posibles, imperfecto para deseos irrealizables.",
        razon: "El deseo siempre se expresa en subjuntivo tras «ojalá». Tanto «ojalá tenga» (deseo con esperanza) como «ojalá tuviera» (deseo casi imposible) son correctos.",
        ejemplos: [
          "Ojalá llueva pronto ✓",
          "Ojalá lloviera pronto ✓ (menos probable)",
          "Ojalá llueve ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Habla del tema como si ___ todo.",
        opciones: ["supiera", "sabe"],
        respuesta: "supiera",
        regla: "«Como si» exige siempre imperfecto de subjuntivo.",
        razon: "La comparación es hipotética: no lo sabe de verdad, solo aparenta saberlo. Esa irrealidad fija el subjuntivo: como si supiera.",
        ejemplos: [
          "Habla como si lo supiera todo ✓",
          "Come como si fuera el último día ✓",
          "Habla como si lo sabe todo ✗ (indicativo: imposible)"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Es importante que ___ (venir, tú) puntual.",
        opciones: ["vengas", "vienes"],
        respuesta: "vengas",
        regla: "Las fórmulas de valoración con «que» (es importante que, es necesario que, es mejor que) exigen subjuntivo.",
        razon: "La valoración presenta el hecho como deseable o necesario, no como real: por eso el verbo va en subjuntivo («vengas»).",
        ejemplos: [
          "Es necesario que lo sepas ✓",
          "Es mejor que te vayas ✓",
          "Es importante que vienes ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Después de que ___ la clase, fuimos a tomar algo. (hecho pasado)",
        opciones: ["terminó", "termine"],
        respuesta: "terminó",
        regla: "«Después de que» va con indicativo cuando el hecho ya ocurrió; con subjuntivo solo para el futuro.",
        razon: "La clase ya terminó (pasado real): indicativo «terminó». Sería «termine» solo si la acción fuera futura: «después de que termine la clase, iremos».",
        ejemplos: [
          "Después de que comimos, salimos ✓ (pasado)",
          "Después de que comamos, saldremos ✓ (futuro)",
          "Después de que comamos, salimos ✗ (para el pasado)"
        ]
      },
      {
        tipo: "hueco",
        enunciado: "No pienso que esa ___ (ser) buena idea. (presente de subjuntivo)",
        respuesta: "sea",
        regla: "La negación de opinión («no pienso que») arrastra al subjuntivo.",
        razon: "Como con «no creo que», negar la opinión vuelve el contenido dudoso, y la duda exige subjuntivo: sea.",
        ejemplos: [
          "No pienso que sea fácil ✓",
          "No pienso que es fácil ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Tal vez ___ mañana, pero no estoy seguro. (llover)",
        opciones: ["llueva", "lloverá"],
        respuesta: "llueva",
        regla: "«Tal vez» y «quizás» admiten los dos modos; el subjuntivo transmite menor certeza.",
        razon: "Como el hablante añade «no estoy seguro», el subjuntivo («llueva») refleja mejor esa duda. «Lloverá» (indicativo futuro) sería correcto pero con más convicción.",
        ejemplos: [
          "Quizá venga más tarde ✓ (menos seguro)",
          "Quizá vendrá más tarde ✓ (más seguro)",
          "Tal vez sean las ocho, no lo sé ✓"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: [
          "Me alegra que estés aquí.",
          "Me alegra que estás aquí."
        ],
        respuesta: "Me alegra que estés aquí.",
        regla: "Los verbos de emoción (alegrarse de que, sentir que, sorprender que) exigen subjuntivo.",
        razon: "La emoción se dirige a un hecho presentado como valioso o deseado, no como mera información; esa subjectivización fija el subjuntivo: «estés».",
        ejemplos: [
          "Siento que estés mal ✓",
          "Me sorprende que digas eso ✓",
          "Me alegra que estás aquí ✗"
        ]
      }
    ]
  });
})();
