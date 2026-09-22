/* Tema: g, j, h y otras letras traicioneras (x, cc). */
(function () {
  "use strict";

  GV.registrarTema({
    id: "gjh",
    titulo: "G, J, H y otras letras",
    inicial: "G-j",
    descripcion: "Coje o coge, averiguar o aberiguar, excepción o exepción: las letras que no se oyen pero se escriben.",
    teoria: [
      {
        titulo: "Los verbos en -ger y -gir",
        regla: "Los verbos terminados en -ger y -gir escriben j en las formas donde el sonido suena ante o y a: coger → cojo, elegir → elijo, proteger → protejo, dirigir → dirijo. Excepciones: tejer (tejo, teje) y crujir (crujo, cruje), que usan j en todas sus formas.",
        ejemplos: [
          "Yo cojo el autobús, él coge el metro ✓",
          "Quiere que lo proteja ✓",
          "Coje ✗ / Protege ✗ (en formas con o: protejo ✓)"
        ]
      },
      {
        titulo: "Ge y gi con pocas excepciones",
        regla: "Las sílabas je y ji son raras en español y casi todas son palabras de uso fijo: jinete, jengibre, Jiménez, jilguero, jinjolero. Fuera de estas, lo normal es ge y gi: gente, gigante, genial.",
        ejemplos: [
          "El jinete domó el caballo ✓",
          "El jengibre pica ✓",
          "Gente amable, un gigante ✓ (con g)"
        ]
      },
      {
        titulo: "La hache muda: dónde sí se escribe",
        regla: "Se escribe h en las palabras que empiezan por hue- (huevo, hueso, huelga), hum- (humano, húmedo) e hi- procedentes de hierro (hierba, hierro), y en verbos como hacer, hablar, hallar, hasta. También llevan h intercalada exhibir, prohibir, adhesión, exhalar.",
        ejemplos: [
          "Un huevo y un hueso ✓",
          "Debemos averiguar qué pasó ✓ (¡sin h!)",
          "El museo exhibe joyas ✓ / Prohibido fumar ✓"
        ]
      },
      {
        titulo: "Averiguar no lleva h (y otros engaños)",
        regla: "Errores frecuentes por h de más o de menos: averiguar (no *aberiguar), desahogar (no *desaogar), ahora (no *ahura), hartura no; y «harto» (saciado) frente a «arto» (fastidiado).",
        ejemplos: [
          "Voy a averiguarlo ✓",
          "Necesito desahogarme ✓",
          "Estoy harto de esperas ✓ (saciado, h con h)"
        ]
      },
      {
        titulo: "X y CC: letras que se omiten al hablar",
        regla: "Se escriben con x: excelente, excepción, examen, conexión, reflexión. Con cc: dirección, reacción, accidente, sución. Escribir «eselente», «exepción» o «conecsión» es un error grave en la escritura cuidada.",
        ejemplos: [
          "Una excelente decisión ✓",
          "Fue una excepción a la regla ✓",
          "Su reacción fue inmediata ✓"
        ]
      }
    ],
    ejercicios: [
      {
        tipo: "seleccion",
        enunciado: "El anciano ___ el bastón con firmeza.",
        opciones: ["coge", "coje"],
        respuesta: "coge",
        regla: "Del verbo coger: yo cojo (con j), pero tú/él coge (con g).",
        razon: "La alternancia es: co-jo (j ante o, primera persona) pero co-ges, co-ge (g ante e). «Coje» con j en tercera persona no existe.",
        ejemplos: [
          "El niño coge su mochila ✓",
          "Yo cojo el teléfono primero ✓",
          "El anciano coje el bastón ✗"
        ]
      },
      {
        tipo: "hueco",
        enunciado: "Yo nunca ___ el camino fácil. (verbo elegir, yo, presente)",
        respuesta: "elijo",
        regla: "Del verbo elegir: yo elijo (con j), pero tú eliges y ellos eligen (con g).",
        razon: "Como en «cojo/coge», la j aparece solo en las formas con o y a: elijo, elija, eligió. Ante e, se conserva la g: eliges, elige, elegimos, eligen.",
        ejemplos: [
          "Elijo siempre la ventana ✓",
          "Ellos eligen al delegado ✓ (con g)",
          "Elillo ✗ / Elejimos ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "La madre ___ al niño del parque.",
        opciones: ["recoge", "recoje"],
        respuesta: "recoge",
        regla: "Del verbo recoger: yo recojo, pero él recoge (con g).",
        razon: "Solo la primera persona cambia a j (recojo); las demás conservan la g ante e: recoges, recoge, recogemos.",
        ejemplos: [
          "Ella recoge a los niños a las cinco ✓",
          "Yo recojo la mesa ✓",
          "Ella recoje ✗"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración está escrita correctamente?",
        opciones: [
          "El jinete montó su caballo.",
          "El ginete montó su caballo."
        ],
        respuesta: "El jinete montó su caballo.",
        regla: "«Jinete» es una de las pocas palabras con ji, junto a jengibre, jilguero y Jiménez.",
        razon: "Las sílabas ji son excepcionales y forman un grupo cerrado de palabras que conviene memorizar: jinete, jengibre, jilguero.",
        ejemplos: [
          "El jengibre fresco ✓",
          "Un jilguero cantaba ✓",
          "El ginete ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Quiere que lo ___ del frío. (proteger, subjuntivo)",
        opciones: ["proteja", "protega"],
        respuesta: "proteja",
        regla: "En subjuntivo, los verbos en -ger/-gir escriben j: proteja, elija, dirija.",
        razon: "La j aparece ante la vocal a del subjuntivo: prote-ja. En presente de indicativo, ante e, va con g: protege.",
        ejemplos: [
          "Espero que te proteja ✓",
          "Ojalá la elijan ✓",
          "Quiere que lo protega ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "La rama ___ bajo el peso de la nieve.",
        opciones: ["cruje", "cruge"],
        respuesta: "cruje",
        regla: "«Crujir» es excepción: se conjuga con j en todas sus formas: crujo, cruje, crujimos.",
        razon: "Mientras los demás verbos en -ir conservan la g ante e (dirige), «crujir» escribe j siempre: cruje, cruja, crujió... conviene memorizarlo junto a «tejer» (teje).",
        ejemplos: [
          "El suelo cruje al pisarlo ✓",
          "El papel cruje en sus manos ✓",
          "El suelo cruje... nunca «cruge»"
        ]
      },
      {
        tipo: "hueco",
        enunciado: "Debemos ___ qué ocurrió aquella noche. (descubrir preguntando; empieza por a- y lleva g y u)",
        respuesta: "averiguar",
        regla: "«Averiguar» se escribe sin h: a-ve-ri-guar.",
        razon: "La forma «aberiguar» con h intercalada es un error popular muy extendido. El verbo se escribe sin hache, con g y con u: a-ve-ri-guar.",
        ejemplos: [
          "Averiguar la verdad ✓",
          "Averiguamos el paradero ✓",
          "Aberiguar ✗ / Averigüar ✗ (la u no lleva diéresis)"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "El museo ___ piezas de la Edad Media.",
        opciones: ["exhibe", "exibe"],
        respuesta: "exhibe",
        regla: "«Exhibir» se escribe con h intercalada: e-x-hi-bir.",
        razon: "Como «prohibir» e «inhibir», lleva h tras la x aunque no se pronuncie. Escribir «exibir» es error.",
        ejemplos: [
          "La galería exhibe esculturas ✓",
          "Exhibió su colección ✓",
          "Exibe ✗ / Proibir ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Está ___ el acceso sin casco.",
        opciones: ["prohibido", "proibido"],
        respuesta: "prohibido",
        regla: "«Prohibir» lleva h intercalada: pro-hi-bir; participio: prohibido.",
        razon: "La h de prohibir no se pronuncia, pero se escribe. También en «inhibir» y «cohibir».",
        ejemplos: [
          "Prohibido el paso ✓",
          "Prohibieron el acceso ✓",
          "Proibir ✗"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración está escrita correctamente?",
        opciones: [
          "Fue una excelente decisión.",
          "Fue una escelente decisión."
        ],
        respuesta: "Fue una excelente decisión.",
        regla: "Las palabras con ex- conservan la x: excelente, examen, exercer... mejor dicho: exentos de excepción.",
        razon: "La x de «excelente» y «excepción» se escribe aunque en algunas regiones se pronuncie como s («eselente»). La escritura es con x.",
        ejemplos: [
          "Un examen difícil ✓",
          "La excepción confirma la regla ✓",
          "Eselente ✗ / Exepción ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Su ___ ante la noticia fue de pura alegría.",
        opciones: ["reacción", "reasción"],
        respuesta: "reacción",
        regla: "Las palabras terminadas en -cción se escriben con doble c: reacción, dirección, conexión.",
        razon: "El sufijo -cción (del latín -ctio) lleva cc: acc-ión, conn-exión. Escribir «reasción» o «conecsión» es error de composición.",
        ejemplos: [
          "La dirección correcta ✓",
          "Una conexión a internet ✓",
          "Reasción ✗ / Conecsión ✗"
        ]
      },
      {
        tipo: "hueco",
        enunciado: "Te acompaño ___ la puerta. (preposición de final, lleva h)",
        respuesta: "hasta",
        regla: "La preposición «hasta» se escribe con h.",
        razon: "Como «hacer», «hablar» o «horno», «hasta» conserva la h del latín. Escribir «asta» es incorrecto en este sentido; el sustantivo «el asta» (el palo de la bandera) sí va sin h.",
        ejemplos: [
          "Hasta mañana ✓",
          "Desde el tejado hasta el sótano ✓",
          "Asta mañana ✗ (el «asta» es solo el palo de la bandera)"
        ]
      }
    ]
  });
})();
