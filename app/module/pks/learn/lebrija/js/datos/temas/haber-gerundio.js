/* Tema: verbo haber y gerundio. */
(function () {
  "use strict";

  GV.registrarTema({
    id: "haber-gerundio",
    titulo: "Haber y gerundio",
    inicial: "H",
    descripcion: "«Habemos» y el gerundio del boletín: dos señales infalibles de que la frase necesita revisión.",
    teoria: [
      {
        titulo: "Haber impersonal: siempre singular",
        regla: "Cuando «haber» expresa existencia o presencia, no tiene sujeto y va siempre en singular: hay, había, hubo, habrá, ha habido... nunca en plural.",
        ejemplos: [
          "Había bastantes motivos ✓",
          "Hubo fiestas enormes ✓",
          "Habían fiestas enormes ✗"
        ]
      },
      {
        titulo: "«Habemos» y compañía",
        regla: "«Habemos» no es correcto en la norma culta para expresar existencia o cantidad de personas. Se usan «somos» o «estamos»: somos muchos.",
        ejemplos: [
          "Somos seis en la casa ✓",
          "Habemos seis en la casa ✗",
          "No estamos todos los que somos ✓"
        ]
      },
      {
        titulo: "Haber de y haber que",
        regla: "«Haber de + infinitivo» expresa obligación o propósito (he de decirte). «Haber que + infinitivo» (hay que) expresa necesidad impersonal. Nunca se conjuga «haber que» en plural ni en otras personas.",
        ejemplos: [
          "He de reconocer que me equivoqué ✓",
          "Hay que madrugar ✓",
          "Hemos que madrugar ✗"
        ]
      },
      {
        titulo: "El gerundio: usos correctos",
        regla: "El gerundio expresa una acción simultánea o anterior a la principal, no posterior. Es correcto en la perífrasis progresiva (estoy leyendo), en el valor de modo (se ganó la vida vendiendo flores) y en el perfecto (habiendo terminado, salió).",
        ejemplos: [
          "Salió corriendo ✓ (simultánea)",
          "Habiendo comido, se fue ✓ (anterior)",
          "Vino cantando por la calle ✓ (modo)"
        ]
      },
      {
        titulo: "El gerundio de posterioridad",
        regla: "No es correcto usar el gerundio para acciones posteriores a la principal: «Goya pintó este cuadro en 1814, muriendo en 1828». Debe sustituirse por una coordinación: «...y murió en 1828».",
        ejemplos: [
          "El artista vivió en París y murió en 1927 ✓",
          "El artista vivió en París, muriendo en 1927 ✗",
          "Abrió la puerta, entrando en casa ✗"
        ]
      },
      {
        titulo: "El gerundio especificativo («del boletín»)",
        regla: "El gerundio no funciona como adjetivo que especifica: «un perfume emitiendo aromas» debe ser «un perfume que emitía aromas». Es el llamado «gerundio del boletín oficial» («dictaminando su detención»).",
        ejemplos: [
          "Me gusta el café que huele a canela ✓",
          "Me gusta el café oliendo a canela ✗",
          "«Vendiendo frutas», decía el cartel ✓ (pero el cartel, no la fruta)"
        ]
      }
    ],
    ejercicios: [
      {
        tipo: "seleccion",
        enunciado: "___ bastantes motivos para quejarse.",
        opciones: ["Hay", "Han"],
        respuesta: "Hay",
        regla: "El haber existencial en presente es «hay», invariable.",
        razon: "«Haber» impersonal no concuerda con «motivos»: hay bastantes motivos. «Han» pertenece al haber auxiliar (han llegado) y no expresa existencia.",
        ejemplos: [
          "Hay motivos ✓",
          "Había motivos ✓",
          "Han motivos ✗"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: ["Había tres opciones.", "Habían tres opciones."],
        respuesta: "Había tres opciones.",
        regla: "El verbo haber, con sentido de existencia, es siempre singular.",
        razon: "«Habían tres opciones» pluraliza indebidamente el impersonal. Es uno de los errores más extendidos del español, incluso en medios de comunicación.",
        ejemplos: [
          "Había tres caminos ✓",
          "Habían tres caminos ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "___ muchos problemas, pero al final los resolvimos.",
        opciones: ["Hubo", "Hubieron"],
        respuesta: "Hubo",
        regla: "El impersonal «haber» es singular en todos sus tiempos: hubo, aunque siga un plural.",
        razon: "«Hubieron» solo sería correcto como auxiliar con un sujeto real: «hubieron problemas que resolvieron» (auxiliar de «resolvieron»), nunca con valor existencial.",
        ejemplos: [
          "Hubo pérdidas enormes ✓",
          "Hubieron pérdidas enormes ✗"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: ["Somos seis en la casa.", "Habemos seis en la casa."],
        respuesta: "Somos seis en la casa.",
        regla: "«Habemos» no es normativo para contar personas; se usan «somos» o «estamos».",
        razon: "El haber impersonal no puede usarse con sujeto de personas («habemos» sería un plural del impersonal, algo imposible). La norma culta: «somos seis».",
        ejemplos: [
          "Somos muchos los que pensamos así ✓",
          "Habemos muchos los que pensamos así ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "___ que madrugar mañana.",
        opciones: ["Hay", "Hemos"],
        respuesta: "Hay",
        regla: "La fórmula impersonal de necesidad es «hay que + infinitivo», siempre en singular.",
        razon: "«Haber que» expresa necesidad sin sujeto: hay que hacerlo. Nunca se conjuga en plural («hemos que») ni en otras personas.",
        ejemplos: [
          "Hay que revisar los datos ✓",
          "Hubo que revisarlos dos veces ✓",
          "Hemos que revisar los datos ✗"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: [
          "El artista vivió en París y murió en 1927.",
          "El artista vivió en París, muriendo en 1927."
        ],
        respuesta: "El artista vivió en París y murió en 1927.",
        regla: "El gerundio no puede expresar acciones posteriores a la del verbo principal (gerundio de posterioridad).",
        razon: "Morir ocurre después de vivir en París; esa relación temporal posterior exige una oración coordinada («y murió»), no un gerundio. Es una de las normas más citadas por el corrector de estilo.",
        ejemplos: [
          "Estudió medicina y se doctoró en 1890 ✓",
          "Estudió medicina, doctorándose en 1890 ✗",
          "Se fue cerrando la puerta ✓ (aquí el gerundio sí es simultáneo)"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "___ terminado el informe, se fue a casa.",
        opciones: ["Habiendo", "Hubiendo"],
        respuesta: "Habiendo",
        regla: "El gerundio compuesto se forma con «habiendo» + participio; la forma «hubiendo» no existe.",
        razon: "El verbo auxiliar en gerundio es «habiendo» (haber → habiendo). «Hubiendo» es una forma fantasma sin existencia en el paradigma verbal.",
        ejemplos: [
          "Habiendo comido, salimos ✓",
          "Habiéndolo pensado bien, aceptó ✓ (con tilde)",
          "Hubiendo comido, salimos ✗"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: [
          "Me gusta el café que huele a canela.",
          "Me gusta el café oliendo a canela."
        ],
        respuesta: "Me gusta el café que huele a canela.",
        regla: "El gerundio no funciona como adjetivo especificativo (gerundio «del boletín»).",
        razon: "Para restringir o caracterizar a un sustantivo se usa una oración de relativo («que huele»), no un gerundio. «El café oliendo a canela» es agramatical en la norma culta.",
        ejemplos: [
          "Los pacientes que necesitan cuidados ✓",
          "Los pacientes necesitando cuidados ✗ (gerundio del boletín)",
          "Encontré a los niños jugando en el patio ✓ (aquí sí: complemento del verbo)"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "En la oración «Habían muchas personas esperando el autobús», ¿qué error hay?",
        opciones: [
          "Concordancia del verbo haber",
          "Gerundio de posterioridad",
          "Ninguno: es correcta"
        ],
        respuesta: "Concordancia del verbo haber",
        regla: "El haber existencial es siempre singular: había muchas personas.",
        razon: "«Habían» pluraliza el impersonal. El gerundio «esperando», en cambio, es correcto: la acción de esperar es simultánea a la de estar allí.",
        ejemplos: [
          "Había muchas personas esperando ✓",
          "Habían muchas personas esperando ✗"
        ]
      },
      {
        tipo: "hueco",
        enunciado: "Estoy ___ (leer) un libro fascinante. (gerundio de leer)",
        respuesta: "leyendo",
        regla: "La perífrasis estar + gerundio expresa acción en curso: leyendo.",
        razon: "«Leer» forma su gerundio regularmente: leyendo (le-yendo). La perífrasis «estoy leyendo» es el uso más natural del gerundio: acción simultánea al momento del habla.",
        ejemplos: [
          "Estoy leyendo ✓",
          "Estaba leyendo cuando llamaste ✓",
          "Estoy leer ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Se ganó la vida ___ flores en el mercado.",
        opciones: ["vendiendo", "vendió"],
        respuesta: "vendiendo",
        regla: "El gerundio con valor de modo indica cómo se realiza la acción principal: vendiendo.",
        razon: "La venta es simultánea y explica el modo de ganarse la vida: «se ganó la vida vendiendo flores». Es un uso correcto y elegante del gerundio.",
        ejemplos: [
          "Se ganó la vida vendiendo flores ✓",
          "Salió corriendo ✓ (modo)",
          "Se ganó la vida y vendió flores (cambiaría el sentido)"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: [
          "Hay que revisar los datos.",
          "Hemos que revisar los datos."
        ],
        respuesta: "Hay que revisar los datos.",
        regla: "«Haber que + infinitivo» solo existe en la forma impersonal «hay que» (y sus tiempos: hubo que, habrá que).",
        razon: "El «haber que» de necesidad es impersonal: no se conjuga en plural ni en otras personas. «Hemos que revisar» mezcla el haber auxiliar con la fórmula impersonal.",
        ejemplos: [
          "Hay que intentarlo ✓",
          "Hubo que intentarlo ✓",
          "Hemos que intentarlo ✗"
        ]
      }
    ]
  });
})();
