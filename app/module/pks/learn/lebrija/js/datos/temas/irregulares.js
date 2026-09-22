/* Tema: verbos irregulares frecuentes. */
(function () {
  "use strict";

  GV.registrarTema({
    id: "irregulares",
    titulo: "Irregulares frecuentes",
    inicial: "Ir",
    descripcion: "Haiga, dijieron, andé, apreta: cuatro fantasmas del habla que no existen en el diccionario.",
    teoria: [
      {
        titulo: "«Haiga» no existe (ni «vaiga»)",
        regla: "El subjuntivo de haber es haya (hayas, haya, hayamos...), y el de ir es vaya. Las formas «haiga» y «vaiga» son deformaciones populares sin validez en la norma culta.",
        ejemplos: [
          "Ojalá haya tiempo ✓",
          "Cuando haya dinero, viajamos ✓",
          "Ojalá haiga tiempo ✗ / Cuando vaiga ✗"
        ]
      },
      {
        titulo: "Pretéritos con j: dijeron, trajeron, condujeron",
        regla: "Los verbos decir, traer, conducir y sus compuestos forman el indefinido con j, no con g: dijeron, trajiste, condujeron. Nunca «dijieron», «trajieron», «condujieron».",
        ejemplos: [
          "Me lo dijeron ayer ✓",
          "Los niños trajeron flores ✓",
          "Lo condujeron hasta la frontera ✓",
          "Dijieron ✗ / Trajieron ✗"
        ]
      },
      {
        titulo: "«Anduve», «cupo»: irregularidades de siempre",
        regla: "«Andar» hace anduve, anduviste (no *andé); «caber» hace cupo, cupieron (no *cabó); «poder» hizo pudo; «poner» puso; «saber» supo; «querer» quiso.",
        ejemplos: [
          "Anduve diez kilómetros ayer ✓",
          "La maleta no cupo en el maletero ✓",
          "Andé ✗ / Cabó ✗"
        ]
      },
      {
        titulo: "Diptongos que algunos aplanan",
        regla: "Muchos verbos diptongan en presente: aprieta (apretar), friega (fregar), nieva (nevar), tiembla (temblar), llueva (llover), calienta (calentar). Las formas sin diptongo («apreta», «neva») son coloquiales e incorrectas en la escritura.",
        ejemplos: [
          "El frío aprieta ✓",
          "En enero nieva mucho ✓",
          "Apretá bien el tornillo ✓ (vosotros) / Aprieta el tornillo ✓",
          "Apreta ✗ / Neva ✗"
        ]
      },
      {
        titulo: "Subjuntivos con diptongo",
        regla: "Igual que el presente, el subjuntivo diptonga: llueva (no *llova), nieve (no *neve), apriete, tiemble. La diptongación del presente se mantiene en todo el subjuntivo.",
        ejemplos: [
          "Espero que llueva pronto ✓",
          "Ojalá nieve en Navidad ✓",
          "Llova ✗ / Neve ✗"
        ]
      }
    ],
    ejercicios: [
      {
        tipo: "seleccion",
        enunciado: "Ojalá ___ llovido menos durante la excursión.",
        opciones: ["hubiera", "haiga"],
        respuesta: "hubiera",
        regla: "El subjuntivo de haber es «haya/hubiera»; «haiga» no existe.",
        razon: "«Haiga» es una deformación popular del subjuntivo de haber. En la norma culta solo hay haya, hubiera, hubiese.",
        ejemplos: [
          "Ojalá hubiera traído abrigo ✓",
          "Cuando haya ocasión, volvemos ✓",
          "Ojalá haiga llovido ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Ojalá ___ tiempo para todo.",
        opciones: ["haya", "haiga"],
        respuesta: "haya",
        regla: "El presente de subjuntivo de haber es «haya», con y.",
        razon: "Como «vaya» (ir) y «caiga» (caer), «haya» es la forma culta. «Haiga» pertenece al habla popular y no debe escribirse.",
        ejemplos: [
          "Espero que haya hueco ✓",
          "No creo que vaiga ✗ (sería «vaya»)",
          "Ojalá haiga hueco ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Ellos me lo ___ ayer.",
        opciones: ["dijeron", "dijieron"],
        respuesta: "dijeron",
        regla: "El indefinido de «decir» lleva j: dije, dijiste, dijo, dijeron.",
        razon: "Los verbos que en indefinido usan la j (decir, traer, conducir) la mantienen en todas las personas: dijeron, no dijieron. La g solo aparece en el presente: digo, dices.",
        ejemplos: [
          "Me dijeron que viniera ✓",
          "¿Qué dijiste? ✓",
          "Dijieron ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Los niños ___ flores a la maestra.",
        opciones: ["trajeron", "trajieron"],
        respuesta: "trajeron",
        regla: "El indefinido de «traer» lleva j: traje, trajiste, trajeron.",
        razon: "Como «decir», «traer» forma su indefinido con la j en toda la serie: traje, trajiste, trajo, trajimos, trajisteis, trajeron.",
        ejemplos: [
          "Trajeron pasteles ✓",
          "No trajiste nada ✓",
          "Trajieron ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "El año pasado ___ diez kilómetros todos los domingos.",
        opciones: ["anduve", "andé"],
        respuesta: "anduve",
        regla: "El indefinido de «andar» es irregular: anduve, anduviste, anduvo.",
        razon: "«Andar» pertenece al grupo de verbos con -uv- (andar → anduve; estar → estuve; tener → tuve). La forma regular «andé» no es la culta.",
        ejemplos: [
          "Anduvimos por el casco viejo ✓",
          "Estuvimos en casa ✓ (mismo patrón)",
          "Andé ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "La maleta no ___ en el maletero.",
        opciones: ["cupo", "cabó"],
        respuesta: "cupo",
        regla: "El indefinido de «caber» es «cupo»; «cabó» no existe.",
        razon: "«Caber» es irregular: quepo, cupo, cabrán. La forma «cabó» es una regularización errónea del pretérito.",
        ejemplos: [
          "No cupo entre las maletas ✓",
          "Cupieron todos en el coche ✓",
          "Cabó ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Ella ___ los platos sin quejarse.",
        opciones: ["frega", "friega"],
        respuesta: "friega",
        regla: "El verbo «fregar» diptonga: friego, friegas, friega, fregamos.",
        razon: "Como «apretar → aprieta» o «temblar → tiembla», la e tónica se convierte en ie: friega. La forma plana «frega» es coloquial e incorrecta.",
        ejemplos: [
          "Friega el suelo los sábados ✓",
          "No friegues tan fuerte ✓",
          "Frega los platos ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "En invierno ___ mucho en esta zona.",
        opciones: ["nieva", "neva"],
        respuesta: "nieva",
        regla: "El verbo «nevar» diptonga: nieva, nieve.",
        razon: "Como «llover → llueve» o «helar → hiela», la e tónica se convierte en ie en presente y subjuntivo: nieva, nieve.",
        ejemplos: [
          "Está nublado y nieva ✓",
          "Espero que nieve en Navidad ✓",
          "Neva ✗ / Neve ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "El puente se ___ con cada camión.",
        opciones: ["tiembla", "trembla"],
        respuesta: "tiembla",
        regla: "El verbo «temblar» diptonga: tiembla.",
        razon: "La e tónica se convierte en ie (temblar → tiembla), igual que «apretar → aprieta». La forma «trembla» es un error de aplano.",
        ejemplos: [
          "Tiembla de miedo ✓",
          "La tierra tembló anoche ✓ (imperfecto sin diptongo: tembló)",
          "Trembla ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Espero que ___ pronto; el campo lo necesita.",
        opciones: ["llueva", "llova"],
        respuesta: "llueva",
        regla: "El subjuntivo de «llover» diptonga: llueva; «llova» no existe.",
        razon: "La diptongación del presente (llueve) se mantiene en el subjuntivo: llueva, lluevas, lluevan. Igual que «nieve» (nevar) o «hiela» (helar).",
        ejemplos: [
          "Ojalá llueva esta noche ✓",
          "Cuando llueva, nos refugiamos ✓",
          "Llova ✗"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración está escrita correctamente?",
        opciones: [
          "No cabe duda de su valentía.",
          "No cabó duda de su valentía."
        ],
        respuesta: "No cabe duda de su valentía.",
        regla: "El presente de «caber» (yo quepo, él cabe) no se regulariza: cabe.",
        razon: "«Caber» es irregular en todo su paradigma: quepo, cabes, cabe... cupo (indefinido). La forma «cabó» mezcla presente e indefinido con error.",
        ejemplos: [
          "Aquí no cabe ni un alfiler ✓",
          "No cupo en el saco ✓ (indefinido: cupo)",
          "No cabó ✗"
        ]
      },
      {
        tipo: "hueco",
        enunciado: "Los agentes ___ la carga hasta el puerto. (conducir, indefinido, ellos)",
        respuesta: "condujeron",
        regla: "El indefinido de «conducir» lleva j: conduje, condujiste, condujeron.",
        razon: "Como «traducir → tradujeron» o «producir → produjeron», la serie del indefinido es con j en todas las personas.",
        ejemplos: [
          "Los bomberos condujeron la operación ✓",
          "Traduje el contrato ✓",
          "Condujieron ✗ / Produjieron ✗"
        ]
      }
    ]
  });
})();
