/* Tema: pronombres relativos (que, quien, el cual, cuyo, donde). */
(function () {
  "use strict";

  GV.registrarTema({
    id: "relativos",
    titulo: "Pronombres relativos",
    inicial: "Rq",
    descripcion: "Cuyo, el cual, «el día en que»: las herramientas que dan elegancia a la frase y delatan al que las usa mal.",
    teoria: [
      {
        titulo: "Que, quien y el cual",
        regla: "«Que» es el relativo universal («el libro que leí»). «Quien» solo se usa con personas, sobre todo tras preposición («la persona con quien hablé») o en explicativas («mi hermano, quien llegó tarde»). «El cual» se reserva para evitar ambigüedades y en registros formales («el hijo del vecino, el cual estudia en Roma»).",
        ejemplos: [
          "El libro que me prestaste ✓",
          "Los amigos con quienes crecí ✓ (tras preposición)",
          "El coche de mi jefe, el cual está averiado ✓ (claro: el coche)"
        ]
      },
      {
        titulo: "Cuyo: la posesión elegante",
        regla: "«Cuyo» indica posesión y concuerda con lo poseído: «el autor cuya novela leí» (la novela), «los vecinos cuyos perros ladran». Nunca se dice «el autor que su novela» ni «el autor cuyo me ayudó» (cuyo no puede ir suelto).",
        ejemplos: [
          "La escritora cuya casa visitamos ✓",
          "El proyecto cuyos detalles omitió ✓",
          "El autor que su novela ganó ✗"
        ]
      },
      {
        titulo: "Donde es lugar; para el tiempo, «en que»",
        regla: "«Donde» expresa lugar: «la ciudad donde nací», «la mesa donde comimos». Para el tiempo se usa «en que» o «cuando»: «el día en que nos conocimos», «la época en que vivíamos allí». «El día donde» es un error extendido.",
                ejemplos: [
          "El pueblo donde veraneamos ✓",
          "El verano en que nos conocimos ✓",
          "El verano donde nos conocimos ✗"
        ]
      },
      {
        titulo: "El relativo no duplica",
        regla: "El pronombre relativo ya hace de sujeto o complemento, así que no se le añade pronombre: «el libro que me prestaste» (no *que me lo prestaste). Y con preposición + persona, que no sirve: «la amiga a quien llamé» (no *a que llamé).",
        ejemplos: [
          "La casa que compramos ✓ (no: que la compramos)",
          "El profesor a quien escribí ✓",
          "El profesor a que escribí ✗"
        ]
      }
    ],
    ejercicios: [
      {
        tipo: "seleccion",
        enunciado: "La persona con ___ hablé era tu vecino.",
        opciones: ["quien", "que"],
        respuesta: "quien",
        regla: "Tras preposición y refiriéndose a personas, el relativo es «quien»: con quien.",
        razon: "«Que» no se combina directamente con preposición ante persona: la persona con quien hablé. Con cosas sí: «el asunto de que hablamos».",
        ejemplos: [
          "Los amigos con quienes crecí ✓",
          "La señora de quien te hablé ✓",
          "La persona con que hablé ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "El escritor ___ novela ganó el premio es peruano.",
        opciones: ["cuya", "que su"],
        respuesta: "cuya",
        regla: "La posesión en el relativo se expresa con cuyo: cuya novela.",
        razon: "«Cuyo» concuerda con lo poseído (la novela → cuya). La fórmula «que su novela» es un error frecuente, especialmente en el español americano hablado.",
        ejemplos: [
          "La autora cuya obra admiro ✓",
          "Los vecinos cuyos hijos juegan aquí ✓",
          "El escritor que su novela ganó ✗"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: [
          "Recuerdo el día en que nos conocimos.",
          "Recuerdo el día donde nos conocimos."
        ],
        respuesta: "Recuerdo el día en que nos conocimos.",
        regla: "«Donde» solo expresa lugar; para el tiempo se usa «en que» (o «cuando»).",
        razon: "El día no es un lugar: el relativo temporal correcto es «en que». Extender «donde» al tiempo («el día donde») es un error muy extendido.",
        ejemplos: [
          "La hora en que llegaste ✓",
          "La casa donde nací ✓ (aquí sí: lugar)",
          "El día donde nos conocimos ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "La ciudad ___ nací es pequeña.",
        opciones: ["donde", "que"],
        respuesta: "donde",
        regla: "Para el lugar, el relativo es «donde»: la ciudad donde nací.",
        razon: "«Donde» funciona como relativo de lugar («en la cual nací»). «Que» exigiría preposición: «la ciudad en que nací» también es correcta.",
        ejemplos: [
          "El pueblo donde nos casamos ✓",
          "El hotel donde dormimos ✓",
          "La ciudad que nací ✗ (faltó la preposición: en que)"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: [
          "Conozco a la chica cuyo padre es médico.",
          "Conozco a la chica que su padre es médico."
        ],
        respuesta: "Conozco a la chica cuyo padre es médico.",
        regla: "La construcción «que su...» no es relativo posesivo válido: se usa cuyo.",
        razon: "«Cuyo» aporta la posesión con concordancia: cuyo padre, cuya madre, cuyos padres. «Que su padre» es la versión coloquial del error.",
        ejemplos: [
          "El alumno cuyo cuaderno perdí ✓",
          "La casa cuyos muros son de adobe ✓",
          "La chica que su padre es médico ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Los vecinos ___ nos invitaron son muy amables.",
        opciones: ["que", "quienes"],
        respuesta: "que",
        regla: "Como sujeto, el relativo normal es «que»; «quienes» es opcional y formal.",
        razon: "«Que» sirve como sujeto sin preposición: los vecinos que nos invitaron. «Quienes» también es correcto («los vecinos quienes...») pero resulta más formal; el error sería usarlo tras preposición con cosas.",
        ejemplos: [
          "Los libros que compré ✓",
          "Los amigos a quienes visitamos ✓ (con preposición: quienes)",
          "Los vecinos quienes nos invitaron ✓ (correcto, formal)"
        ]
      },
      {
        tipo: "hueco",
        enunciado: "Ese es el motivo ___ no vine. (por + relativo)",
        respuesta: "por el que",
        variantes: ["por el cual", "por que"],
        regla: "Tras «por», el relativo de causa es «por el que», «por la que», «por lo que» o «por el cual».",
        razon: "El motivo no es persona, así que no cabe «quien»; y «que» solo tras preposición requiere artículo: por el que. La secuencia «por que» también existe en este uso.",
        ejemplos: [
          "No sé la razón por la que se fue ✓",
          "Este es el motivo por el cual llamé ✓",
          "El motivo por vine ✗ (faltó el relativo)"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Los amigos con ___ crecí viven ahora lejos.",
        opciones: ["quienes", "quien"],
        respuesta: "quienes",
        regla: "«Quien» tiene plural: quienes, obligatorio con antecedente plural.",
        razon: "El antecedente es «los amigos» (plural), así que el relativo concuerda: con quienes. «Con quien crecí» señalaría a una sola persona.",
        ejemplos: [
          "Las maestras con quienes estudié ✓",
          "El amigo con quien salgo ✓ (singular)",
          "Los amigos con quien crecí ✗"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: [
          "El libro que me prestaste es buenísimo.",
          "El libro que me lo prestaste es buenísimo."
        ],
        respuesta: "El libro que me prestaste es buenísimo.",
        regla: "El relativo ya ocupa la función de complemento: no se añade pronombre (me lo).",
        razon: "«Que» hace de complemento directo de «prestaste», así que no cabe duplicarlo con «lo». El relativo basta y sobra para cubrir esa función.",
        ejemplos: [
          "La carta que escribí ✓",
          "Las llaves que encontré ✓",
          "El libro que me lo prestaste ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "La casa ___ tejado es rojo está en venta.",
        opciones: ["cuyo", "que su"],
        respuesta: "cuyo",
        regla: "«Cuyo» concuerda con lo poseído (el tejado → cuyo) y no con el poseedor.",
        razon: "El poseedor es la casa y lo poseído el tejado: cuyo tejado (masculino singular, como «tejado»). «Que su tejado» no es normativo.",
        ejemplos: [
          "El edificio cuyas ventanas brillan ✓",
          "La familia cuyo coche se vendió ✓",
          "La casa que su tejado es rojo ✗"
        ]
      },
      {
        tipo: "hueco",
        enunciado: "Es un tema ___ ya hablamos. (sobre + relativo)",
        respuesta: "sobre el que",
        variantes: ["sobre el cual", "del que", "del cual"],
        regla: "Tras preposición con antecedente de cosa, el relativo lleva artículo: sobre el que, sobre el cual.",
        razon: "«Sobre que» sin artículo no funciona como relativo en este contexto: se dice «sobre el que hablamos» o «sobre el cual hablamos».",
        ejemplos: [
          "El asunto del que te hablé ✓",
          "La película sobre la que escribí ✓",
          "El tema sobre hablamos ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Fue en Sevilla ___ nos conocimos.",
        opciones: ["donde", "que"],
        respuesta: "donde",
        regla: "En las estructuras enfáticas «fue en X donde...», el relativo de lugar es donde.",
        razon: "Con «fue en...» el español enfático pide «donde»: fue en Sevilla donde. Usar «que» («fue en Sevilla que») es un calco del inglés y el francés, censurado en la norma culta.",
        ejemplos: [
          "Fue en París donde se conocieron ✓",
          "Aquí es donde vivo ✓",
          "Fue en Sevilla que nos conocimos ✗ (calco)"
        ]
      }
    ]
  });
})();
