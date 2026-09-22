/* Tema: homófonos con ll e y. */
(function () {
  "use strict";

  GV.registrarTema({
    id: "ll-y",
    titulo: "LL e Y homófonas",
    inicial: "Yll",
    descripcion: "Haya/halla, vaya/valla, cayó/calló... El yeísmo nos hace pronunciarlas igual, pero la escritura distingue.",
    teoria: [
      {
        titulo: "El origen del problema: el yeísmo",
        regla: "En casi toda Hispanoamérica y gran parte de España, «ll» e «y» suenan igual (yeísmo). Por eso, al escribir, hay que fijarse en el significado: cada pareja de homófonos tiene su propia letra.",
        ejemplos: [
          "Halla (encuentra) y haya (haber o árbol) suenan igual ✓",
          "Pero se escriben distinto, como «vasto» y «basto»"
        ]
      },
      {
        titulo: "Haya / halla",
        regla: "«Haya» es el subjuntivo del verbo haber (que haya paz) o el árbol. «Halla» viene de hallar (encontrar): no halla sus llaves. Prueba: si puede sustituirse por «encontrar», es halla; si por «haber», es haya.",
        ejemplos: [
          "Espero que haya terminado ✓ (haber)",
          "No halla sus llaves ✓ (= las encuentra)",
          "La hay a del parque ✓ (el árbol, con hache)"
        ]
      },
      {
        titulo: "Vaya / valla",
        regla: "«Vaya» es el subjuntivo del verbo ir: ojalá vaya. «Valla» es la cerca o el cartel publicitario: saltó la valla. Prueba: si significa «cerca» o «anuncio», es valla.",
        ejemplos: [
          "Ojalá vaya a la fiesta ✓ (ir)",
          "Saltó la valla del jardín ✓ (cerca)",
          "Ese vall a publicitario ✓ (cartel)"
        ]
      },
      {
        titulo: "Cayó / calló y otros pares",
        regla: "«Cayó» viene de caer; «calló» de callar (guardar silencio). También: olla (recipiente) / hoya (hueco); malla (tejido) / maya (civilización); raya (línea, pescado) / ralla (de rallar).",
        ejemplos: [
          "Se cayó de la bicicleta ✓ (caer)",
          "Calló ante el juez ✓ (callar)",
          "La malla del portero ✓ / La cultura maya ✓"
        ]
      },
      {
        titulo: "Verbos en -uir y el verbo caer",
        regla: "Los verbos terminados en -uir (huir, construir, contribuir, influir) escriben y entre vocales en sus formas: huyo, huyó, construyó, influyó. El verbo caer también usa y: cayó, caímos.",
        ejemplos: [
          "El río fluye y crece ✓",
          "Su ejemplo influyó en mí ✓",
          "Influlló ✗ / Construllen ✗"
        ]
      }
    ],
    ejercicios: [
      {
        tipo: "seleccion",
        enunciado: "No ___ nada en el cajón, por más que busco.",
        opciones: ["halla", "haya"],
        respuesta: "halla",
        regla: "«Halla» viene del verbo hallar (encontrar).",
        razon: "El sentido es «no encuentra nada»: hallar → halla. La prueba del «encontrar» lo confirma: no encuentra nada en el cajón.",
        ejemplos: [
          "No halla sus llaves ✓",
          "Halla consuelo en la música ✓",
          "No haya nada en el cajón ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Espero que no ___ problemas mañana.",
        opciones: ["haya", "halla"],
        respuesta: "haya",
        regla: "«Haya» es el subjuntivo del verbo haber.",
        razon: "Tras «espero que» el verbo va en subjuntivo: (espero que) haya problemas, del verbo haber. La prueba del «haber» lo confirma.",
        ejemplos: [
          "Puede que haya lluvia ✓",
          "Cuando haya tiempo, vamos ✓",
          "Puede que halla lluvia ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Ojalá ___ pronto la reunión.",
        opciones: ["vaya", "valla"],
        respuesta: "vaya",
        regla: "«Vaya» es el subjuntivo del verbo ir.",
        razon: "El deseo expresado con «ojalá» exige subjuntivo, y el verbo es ir: ojalá vaya. «Valla» sería solo la cerca o el cartel.",
        ejemplos: [
          "Que te vaya bien ✓",
          "Ojalá vaya todo según lo previsto ✓",
          "Ojalá valla pronto ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "El caballo saltó la ___ del hipódromo.",
        opciones: ["valla", "vaya"],
        respuesta: "valla",
        regla: "«Valla» (con ll) es la cerca o el obstáculo; también el cartel publicitario.",
        razon: "El sustantivo que designa la cerca se escribe con ll: valla. El verbo ir en subjuntivo es «vaya» con y.",
        ejemplos: [
          "La valla publicitaria del estadio ✓",
          "Saltar la valla ✓",
          "Saltó la vaya ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Se ___ de la moto a la primera curva.",
        opciones: ["cayó", "calló"],
        respuesta: "cayó",
        regla: "«Cayó» es el pretérito de caer; «calló», el de callar (guardar silencio).",
        razon: "El sentido es «perdió el equilibrio y se fue al suelo»: caer → cayó. «Calló» significaría que guardó silencio.",
        ejemplos: [
          "Cayó redondo en el suelo ✓",
          "Se cayó del árbol ✓",
          "Se calló de la moto ✗ (salvo que guardara silencio al caer)"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "El testigo prefirió ___ antes que mentir.",
        opciones: ["callar", "cayar"],
        respuesta: "callar",
        regla: "El verbo que significa guardar silencio se escribe con ll: callar.",
        razon: "«Callar» (con ll) es no hablar; «cayar» no existe. El par «cayó/calló» solo existe en pretérito; en infinitivo es «callar».",
        ejemplos: [
          "Callar no es mentir ✓",
          "Calló durante todo el juicio ✓",
          "Prefirió cayar ✗"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración está escrita correctamente?",
        opciones: [
          "Es posible que haya llegado tarde.",
          "Es posible que halla llegado tarde."
        ],
        respuesta: "Es posible que haya llegado tarde.",
        regla: "Con el verbo haber, el homófono correcto es «haya».",
        razon: "«Haber + participio» forma los tiempos compuestos: haya llegado. Sustituir por otro verbo lo confirma: «es posible que haya comido».",
        ejemplos: [
          "Cuando haya llegado, avísame ✓",
          "Cuando halla llegado ✗"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración está escrita correctamente?",
        opciones: [
          "La sopa se enfrió en la olla.",
          "La sopa se enfrió en la hoya."
        ],
        respuesta: "La sopa se enfrió en la olla.",
        regla: "«Olla» (con ll) es el recipiente de cocina; «hoya» (con h) es un hueco u hondonada.",
        razon: "El recipiente donde se cocina se escribe con ll: olla. «Hoya» designa un agujero o una depresión del terreno.",
        ejemplos: [
          "Una olla a presión ✓",
          "Cayó en una hoya profunda ✓ (hueco)",
          "La sopa se enfrió en la hoya ✗"
        ]
      },
      {
        tipo: "hueco",
        enunciado: "El niño ___ del perro calle arriba. (verbo huir, presente)",
        respuesta: "huye",
        regla: "Los verbos terminados en -uir escriben y entre vocales: huyo, huye, huían.",
        razon: "«Huir» forma su presente con y entre vocales: hu-yo, hu-ye. Escribir «lluye» o «llo» es error; la y es la que corresponde.",
        ejemplos: [
          "Huye del peligro ✓",
          "Huyó cuando llegó la policía ✓",
          "El humo fluye por la chimenea ✓"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Su discurso ___ profundamente en los oyentes.",
        opciones: ["influyó", "influlló"],
        respuesta: "influyó",
        regla: "«Influir» se conjuga con y: influyó, influyen, influyendo.",
        razon: "Como todos los verbos en -uir, la consonante es y entre vocales: in-flu-yó. «Influlló» con ll no existe.",
        ejemplos: [
          "El maestro influyó en su vocación ✓",
          "Esos datos influyen en la decisión ✓",
          "Influlló ✗"
        ]
      },
      {
        tipo: "hueco",
        enunciado: "___ el libro perdido en el desván. (lo encontraron, pasado)",
        respuesta: "Hallaron",
        regla: "«Hallar» significa encontrar; su pretérito es «hallaron», con ll.",
        razon: "El sentido es «encontraron»: hallar → hallaron. Se escribe con ll y sin hache inicial... ¡ojo!: con hache inicial (halla-) y doble elle final: ha-lla-ron.",
        ejemplos: [
          "Hallaron restos romanos en la excavación ✓",
          "Allaron ✗ (sin h) / Hallerón ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Los pájaros anidan en la ___ del jardín botánico.",
        opciones: ["haya", "halla"],
        respuesta: "haya",
        regla: "«Haya» es también el nombre de un árbol de hoja caduca.",
        razon: "Además del verbo haber, «haya» designa al árbol (Fagus sylvatica). Con el sentido de árbol, siempre con hache y y: la haya.",
        ejemplos: [
          "El bosque de hayas del hayedo ✓",
          "Anidan en las hayas ✓",
          "Anidan en las hallas ✗"
        ]
      }
    ]
  });
})();
