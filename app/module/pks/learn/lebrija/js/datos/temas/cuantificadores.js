/* Tema: muy, mucho y cuantificadores; comparación. */
(function () {
  "use strict";

  GV.registrarTema({
    id: "cuantificadores",
    titulo: "Muy, mucho y comparación",
    inicial: "Mu",
    descripcion: "Muy dinero ✗, ambos dos ✗, más mejor ✗: los cuantificadores tienen sus propias leyes.",
    teoria: [
      {
        titulo: "Muy + adjetivo/adverbio; mucho + sustantivo/verbo",
        regla: "«Muy» intensifica adjetivos y adverbios (muy bueno, muy rápido, muy bien). «Mucho» acompaña a sustantivos (mucho calor) o funciona como adverbio del verbo (trabaja mucho). El error «muy dinero» nace de cruzar los dos papeles.",
        ejemplos: [
          "El libro es muy bueno ✓ / Hace mucho calor ✓",
          "Trabaja mucho ✓ / Es muy trabajador ✓",
          "Muy dinero ✗ / Mucho bueno ✗"
        ]
      },
      {
        titulo: "La excepción: mucho mejor, mucho más, mucho antes",
        regla: "Con comparativos y adverbios de cantidad (mejor, peor, más, menos, antes, después), se usa «mucho», no «muy»: está mucho mejor, mucho más caro, mucho antes. Es la excepción que salva del «muy mejor».",
        ejemplos: [
          "Tras la operación, está mucho mejor ✓",
          "Este modelo es mucho más barato ✓",
          "Muy mejor ✗ / Muy más caro ✗"
        ]
      },
      {
        titulo: "Ambos, sendos y cada",
        regla: "«Ambos dos» es redundante: basta «ambos». «Sendos» no significa «ambos»: significa que cada persona recibe la suya (dieron sendos discursos = cada uno, uno). «Cada» va con singular (cada casa), y «cada uno de nosotros» con verbo singular.",
        ejemplos: [
          "Vinieron ambos hermanos ✓ (no: ambos dos)",
          "Los ministros presentaron sendas propuestas ✓ (una cada uno)",
          "Cada uno de los alumnos lleva su uniforme ✓"
        ]
      },
      {
        titulo: "Comparativos sin refuerzo doble",
        regla: "Los comparativos irregulares (mejor, peor, mayor, menor) no llevan «más»: «Juan es mayor que Pedro» (no *más mayor). Las estructuras son: tan + adjetivo + como; tanto/a/os/as + sustantivo + como; y «cuanto más..., más...».",
        ejemplos: [
          "Este café es tan rico como el otro ✓",
          "No tiene tantos amigos como antes ✓",
          "Cuanto más estudias, más aprendes ✓",
          "Más mejor ✗ / Más mayor ✗"
        ]
      }
    ],
    ejercicios: [
      {
        tipo: "seleccion",
        enunciado: "Hace ___ calor hoy.",
        opciones: ["mucho", "muy"],
        respuesta: "mucho",
        regla: "«Mucho» acompaña a sustantivos: mucho calor, mucho dinero.",
        razon: "«Calor» es sustantivo, así que el cuantificador es «mucho». «Muy» solo intensifica adjetivos y adverbios: muy caliente, muy rápido.",
        ejemplos: [
          "Tengo mucho sueño ✓",
          "Tengo muy sueño ✗",
          "Mucho caliente ✗ (sería: mucho calor o muy caliente)"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "El libro es ___ bueno.",
        opciones: ["muy", "mucho"],
        respuesta: "muy",
        regla: "«Muy» intensifica adjetivos: muy bueno, muy interesante.",
        razon: "«Bueno» es adjetivo, así que el intensificador es «muy». La secuencia «mucho bueno» es un error frecuente en el habla coloquial americana.",
        ejemplos: [
          "La película es muy buena ✓",
          "Fuimos muy contentos ✓ (adverbio)",
          "El libro es mucho bueno ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Tras la operación, está ___ mejor.",
        opciones: ["mucho", "muy"],
        respuesta: "mucho",
        regla: "Con comparativos (mejor, peor, más, menos) se usa «mucho», no «muy».",
        razon: "«Mejor» es comparativo, y la excepción manda: mucho mejor, mucho más. «Muy mejor» duplicaría la comparación.",
        ejemplos: [
          "Está mucho peor de lo que pensaba ✓",
          "Llegaron mucho antes ✓",
          "Está muy mejor ✗"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: [
          "Vinieron ambos hermanos.",
          "Vinieron ambos dos hermanos."
        ],
        respuesta: "Vinieron ambos hermanos.",
        regla: "«Ambos dos» es redundante: «ambos» ya significa «los dos».",
        razon: "Decir «ambos dos» suma dos cuantificadores con el mismo valor (los dos + los dos). En la escritura cuidada basta «ambos» o, directamente, «los dos».",
        ejemplos: [
          "Ambos bandos firmaron ✓",
          "Los dos hermanos vinieron ✓",
          "Ambos dos hermanos ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Los ministros presentaron ___ propuestas: una por cabeza.",
        opciones: ["sendas", "ambas"],
        respuesta: "sendas",
        regla: "«Sendos/sendas» significa «cada uno su (una)»: distribución individual.",
        razon: "Si cada ministro presentó una propuesta, la palabra exacta es «sendas». «Ambas» significaría dos propuestas en total, no una por ministro.",
        ejemplos: [
          "Les dieron sendos abrazos ✓ (un abrazo a cada uno)",
          "Ambos discursos fueron largos ✓ (dos discursos en total)",
          "Sendos no significa «muchos» ni «idénticos»"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "___ casa tiene su encanto.",
        opciones: ["Cada", "Todas"],
        respuesta: "Cada",
        regla: "«Cada» va siempre seguido de singular: cada casa, cada persona.",
        razon: "Aunque el sentido sea distributivo plural, «cada» exige singular: cada casa tiene. «Cada casas» es agramatical.",
        ejemplos: [
          "Cada mañana salgo a correr ✓",
          "Cada dos kilómetros hay una fuente ✓ (numeral: cada dos...)",
          "Cada casas tiene ✗"
        ]
      },
      {
        tipo: "hueco",
        enunciado: "___ uno de los alumnos lleva su uniforme. (cuantificador distributivo)",
        respuesta: "Cada",
        regla: "«Cada uno de + plural» lleva el verbo en singular: cada uno lleva.",
        razon: "Aunque el grupo sea plural (los alumnos), el sujeto real es «cada uno», singular: lleva. Decir «llevan» es un error de atracción con el complemento.",
        ejemplos: [
          "Cada uno de nosotros trae algo ✓",
          "Cada una de las casas tiene jardín ✓",
          "Cada uno de los alumnos llevan ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Este café es ___ mejor que el de ayer.",
        opciones: ["mucho", "muy"],
        respuesta: "mucho",
        regla: "Ante el comparativo «mejor», la intensificación correcta es «mucho»: mucho mejor.",
        razon: "Como con «más», «menos» o «peor», «mucho» es el intensificador de los comparativos. «Muy mejor» es imposible en la norma.",
        ejemplos: [
          "Mucho más barato ✓",
          "Mucho peor organizado ✓",
          "Muy mejor ✗"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: [
          "Juan es mayor que Pedro.",
          "Juan es más mayor que Pedro."
        ],
        respuesta: "Juan es mayor que Pedro.",
        regla: "Los comparativos irregulares (mejor, peor, mayor, menor) no llevan «más».",
        razon: "«Mayor» ya es comparativo (de grande): no se refuerza con «más». La forma «más mayor» es uno de los errores más extendidos; se acepta «más viejo» como alternativa.",
        ejemplos: [
          "Este error es peor que el otro ✓",
          "Su casa es más vieja que la mía ✓ (aquí sí: viejo es regular)",
          "Juan es más mayor que Pedro ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Ella es ___ inteligente como su hermana.",
        opciones: ["tan", "tanto"],
        respuesta: "tan",
        regla: "«Tan + adjetivo + como» para igualdad con adjetivos.",
        razon: "«Inteligente» es adjetivo, así que el esquema es tan... como. «Tanto» solo acompaña a verbos o sustantivos: trabaja tanto como ella; tiene tanto dinero como ella.",
        ejemplos: [
          "Es tan alto como su padre ✓",
          "Corre tan rápido como tú ✓",
          "Tan inteligente... nunca «tanto inteligente»"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "No tiene ___ amigos como antes.",
        opciones: ["tantos", "tan"],
        respuesta: "tantos",
        regla: "«Tanto/a/os/as + sustantivo + como» para igualdad con sustantivos.",
        razon: "«Amigos» es sustantivo, así que «tanto» concuerda con él: tantos amigos. «Tan» no puede acompañar directamente a un sustantivo.",
        ejemplos: [
          "No hay tanta gente como ayer ✓",
          "Tiene tanta suerte como tú ✓",
          "No tiene tan amigos ✗"
        ]
      },
      {
        tipo: "hueco",
        enunciado: "___ más estudias, más aprendes. (correlación proporcional)",
        respuesta: "Cuanto",
        regla: "La correlación proporcional se expresa con «cuanto más..., más...».",
        razon: "El «cuanto» inicial (sin tilde) fija la correlación: cuanto más estudias, más aprendes. Es una estructura fija cuyo primer término no varía.",
        ejemplos: [
          "Cuanto más tardes, menos veremos ✓",
          "Cuanto más, mejor ✓",
          "Entre más estudias... ✓ (variante americana aceptada, aunque «cuanto más» es la clásica)"
        ]
      }
    ]
  });
})();
