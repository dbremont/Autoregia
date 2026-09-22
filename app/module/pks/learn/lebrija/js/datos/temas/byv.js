/* Tema: ortografía de b y v. */
(function () {
  "use strict";

  GV.registrarTema({
    id: "byv",
    titulo: "B y V",
    inicial: "B/v",
    descripcion: "Suenan igual y por eso las confundimos al escribir. Cinco reglas y dos excepciones para no volver a dudar.",
    teoria: [
      {
        titulo: "Se escribe v tras n, d y b",
        regla: "Las combinaciones nv, dv y bv se escriben con v: envolver, invierno, adverso, obvio, subversivo, bienaventurado.",
        ejemplos: [
          "En invierno nieva ✓",
          "Es obvio que falta un dato ✓",
          "El juicio adverso lo sorprendió ✓",
          "Es una costumbre bien vista ✓"
        ]
      },
      {
        titulo: "Verbos terminados en -bir",
        regla: "Casi todos los verbos terminados en -bir se escriben con b: escribir, recibir, subir, vivir, servir, prohibir, contribuir. Y sus compuestos: describir, prescribir.",
        ejemplos: [
          "Escribe cartas todas las noches ✓",
          "Recibimos tu mensaje ayer ✓",
          "Escrivir ✗, recivir ✗ (errores típicos)"
        ]
      },
      {
        titulo: "-bilidad (con dos salvedades)",
        regla: "Las palabras terminadas en -bilidad se escriben con b: amabilidad, habilidad, posibilidad. Solo hay dos excepciones con v: movilidad (de móvil) y civilidad (de civil).",
        ejemplos: [
          "Tu amabilidad es admirable ✓",
          "La movilidad urbana mejoró ✓ (¡con v!)",
          "La mobiliidad ✗ / La civiliidad ✗"
        ]
      },
      {
        titulo: "El imperfecto de los verbos -ar y el verbo ir",
        regla: "El pretérito imperfecto de los verbos terminados en -ar se escribe con b: cantaba, jugaba, hablaba. Igual que el imperfecto de ir: iba, ibas, íbamos.",
        ejemplos: [
          "Cuando era niño, jugaba en esta plaza ✓",
          "Iba a casa cuando me llamaste ✓",
          "Jugava ✗ / Iva ✗"
        ]
      },
      {
        titulo: "Formas de venir, y prefijos bi-, bis-, sub-",
        regla: "Las formas de venir llevan b: viene, vino, vengamos... Se escriben con b los prefijos bi- (dos), bis- (dos veces) y sub- (debajo): bicicleta, bisabuelo, subterráneo, subdesarrollo.",
        ejemplos: [
          "Mi bisabuelo cumplió cien años ✓",
          "El tren circula por el túnel subterráneo ✓",
          "Vino, vio y venció ✓ (¡y esta frase es de v!)"
        ]
      }
    ],
    ejercicios: [
      {
        tipo: "hueco",
        enunciado: "El ladrón intentó ___ el paquete con una manta. (cubrir dándole vueltas)",
        respuesta: "envolver",
        regla: "La combinación nv se escribe con v: envolver, invierno, envidia.",
        razon: "Tras la consonante n, la letra es siempre v. La forma «embolver» con b es un error gráfico frecuente.",
        ejemplos: [
          "Envolver regalos ✓",
          "En invierno, envolverse bien ✓",
          "Embolver el paquete ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Ella ___ cartas todas las noches.",
        opciones: ["escribía", "escrivía"],
        respuesta: "escribía",
        regla: "El verbo escribir (y sus compuestos) se escribe con b, también en el imperfecto: escribía.",
        razon: "Los verbos en -bir llevan b (escribir, recibir, subir); y el imperfecto de los -ir añade -ía, sin alterar la consonante: escribía.",
        ejemplos: [
          "Escribía con letra menuda ✓",
          "Describía todo lo que veía ✓",
          "Escrivía ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Ese perro ___ en la calle hasta que lo adoptaron.",
        opciones: ["vivía", "vibía"],
        respuesta: "vivía",
        regla: "El verbo vivir se escribe con v en todas sus formas: vivía, vivió, viven.",
        razon: "«Vivir» no pertenece a ningún grupo con b: es de los pocos verbos comunes con v inicial que hay que memorizar como tal.",
        ejemplos: [
          "Vivía con su abuela ✓",
          "Hemos vivido aquí siempre ✓",
          "Vibía ✗"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración está escrita correctamente?",
        opciones: [
          "Tiene mucha amabilidad.",
          "Tiene mucha amavilidad."
        ],
        respuesta: "Tiene mucha amabilidad.",
        regla: "Las palabras terminadas en -bilidad se escriben con b: amabilidad, habilidad, posibilidad.",
        razon: "El sufijo -bilidad proviene de «-ble» + «-idad» (amable → amabilidad); la b se conserva. Solo movilidad y civilidad rompen la regla.",
        ejemplos: [
          "Posibilidad, responsabilidad ✓",
          "Posavilidad ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "La ___ urbana de la ciudad mejoró con el tranvía.",
        opciones: ["movilidad", "mobilidad"],
        respuesta: "movilidad",
        regla: "«Movilidad» es una de las dos excepciones con v (junto a «civilidad»), porque deriva de «móvil».",
        razon: "La regla general de -bilidad es con b, pero cuando el sustantivo deriva de una palabra con v (móvil, civil), la conserva: movilidad, civilidad.",
        ejemplos: [
          "Movilidad sostenible ✓",
          "Civilidad y respeto ✓",
          "Mobilidad ✗ (el error más frecuente de esta regla)"
        ]
      },
      {
        tipo: "hueco",
        enunciado: "Cuando éramos niños, ___ en esta plaza todas las tardes. (imperfecto de jugar)",
        respuesta: "jugábamos",
        regla: "El pretérito imperfecto de los verbos en -ar se escribe con b: jugaba, jugábamos.",
        razon: "Es una regla absoluta: cantaba, bailaba, jugaban... jamás con v. Como «jugábamos» lleva tilde, conviene escribirla: ju-gá-ba-mos.",
        ejemplos: [
          "Jugábamos hasta el anochecer ✓",
          "Cantabas muy bonito ✓",
          "Jugávamos ✗ (sin tilde) / Jugavamos ✗ (con v)"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "No ___ a casa tarde.",
        opciones: ["venía", "benía"],
        respuesta: "venía",
        regla: "Las formas del verbo venir se escriben con v: venía, vino, viene, venga.",
        razon: "Todo el paradigma de «venir» es con v. Escribirlo con b («benía», «bino») es un error típico del cruce con palabras como «bene-».",
        ejemplos: [
          "Venía del trabajo ✓",
          "Vino a mediodía ✓",
          "Benía ✗ / Bino ✗"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración está escrita correctamente?",
        opciones: [
          "Iba a casa cuando me llamaste.",
          "Iva a casa cuando me llamaste."
        ],
        respuesta: "Iba a casa cuando me llamaste.",
        regla: "El imperfecto de ir es «iba», con b.",
        razon: "Como el imperfecto de los verbos en -ar, «ir» forma su imperfecto con -ba: iba, ibas, íbamos, iban. Nunca «iva».",
        ejemplos: [
          "Ibamos al cine cada domingo ✓",
          "Ivan a llegar tarde ✓ (¡ojo: el nombre Iván es con v!)",
          "Iva ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Mi ___ cumplió cien años.",
        opciones: ["bisabuelo", "vizabuelo"],
        respuesta: "bisabuelo",
        regla: "El prefijo bis- (dos veces) se escribe con b: bisabuelo, bisnieto, bisiesto.",
        razon: "«Bis-» significa «dos veces»: bisabuelo = abuelo del abuelo. Igual que bicicleta (dos ruedas) y bilingüe (dos lenguas).",
        ejemplos: [
          "Bisnieto del fundador ✓",
          "El año bisiesto tiene 366 días ✓",
          "Vizabuelo ✗"
        ]
      },
      {
        tipo: "hueco",
        enunciado: "El tren circula por la vía ___. (bajo tierra)",
        respuesta: "subterránea",
        regla: "El prefijo sub- (debajo) se escribe con b: subterráneo, submarino, subdesarrollo.",
        razon: "«Sub-» indica posición inferior: subterráneo = bajo la tierra. La combinación bv resultante (sub+verso) también es con b y v: subversivo.",
        ejemplos: [
          "Un paso subterráneo ✓",
          "La vía subterránea ✓",
          "Suterránea ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "En ___ hace frío en esta región.",
        opciones: ["invierno", "imbierno"],
        respuesta: "invierno",
        regla: "Las palabras con nv se escriben con v: invierno, invitar, invención.",
        razon: "Tras n viene siempre v: in-vierno, in-vitar. La forma «imbierno» mezcla dos errores (la n cambiada a m y la v a b).",
        ejemplos: [
          "Te invito a mi casa ✓",
          "La invasión de insectos ✓",
          "Imbierno ✗"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración está escrita correctamente?",
        opciones: [
          "Recibimos tu mensaje ayer.",
          "Recivimos tu mensaje ayer."
        ],
        respuesta: "Recibimos tu mensaje ayer.",
        regla: "El verbo recibir se escribe con b en todas sus formas.",
        razon: "Pertenece al grupo de verbos en -bir con b: recibir, recibimos, recibió. La forma «recivir» con v es uno de los errores ortográficos más comunes del español.",
        ejemplos: [
          "Recibí tu carta ✓",
          "Recibirán el premio mañana ✓",
          "Recivir ✗"
        ]
      }
    ]
  });
})();
