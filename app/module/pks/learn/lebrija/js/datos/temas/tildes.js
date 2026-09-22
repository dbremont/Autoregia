/* Tema: tildes diacríticas y acentuación. */
(function () {
  "use strict";

  GV.registrarTema({
    id: "tildes",
    titulo: "Tildes diacríticas",
    inicial: "Á",
    descripcion: "Monosílabos, interrogativos y palabras que cambian de sentido con la tilde. La base de la escritura cuidada.",
    teoria: [
      {
        titulo: "Reglas generales",
        regla: "Las palabras agudas llevan tilde si terminan en -n, -s o vocal. Las llanas la llevan si NO terminan en -n, -s ni vocal. Las esdrújulas y sobresdrújulas la llevan siempre.",
        ejemplos: [
          "Agudas con tilde: sofá, jamás, camión, menú",
          "Llanas con tilde: árbol, lápiz, débil, césped",
          "Esdrújulas (siempre): música, brújula, teléfono",
          "Sobresdrújulas (siempre): cómpramelo, dígamelo, rápidamente"
        ]
      },
      {
        titulo: "Tildes diacríticas en monosílabos",
        regla: "Algunos monosílabos llevan tilde para distinguirse de otro igual: él (pronombre) / el (artículo); tú (pronombre) / tu (posesivo); mí (pronombre) / mi (posesivo); sí (afirmación o pronombre) / si (condición); sé (saber o ser) / se; dé (verbo dar) / de (preposición); té (bebida) / te.",
        ejemplos: [
          "Él vino, pero el coche no arrancó",
          "Quiero que vengas tú con tu hermana",
          "Esto es para mí, no para mi primo",
          "Sé que vendrá, aunque no se lo he dicho",
          "Espero que te dé tiempo (verbo dar) frente a el paquete de café"
        ]
      },
      {
        titulo: "Interrogativos y exclamativos",
        regla: "Qué, quién, cómo, cuándo, dónde, cuál y cuánto llevan tilde tanto en preguntas directas como en interrogativas indirectas (después de verbos como saber, preguntar, decir o querer).",
        ejemplos: [
          "¿Dónde estás? (directa)",
          "No sé dónde está (indirecta)",
          "Me preguntó quién había llamado",
          "Dime cómo se hace ✓ frente a No sé como se hace ✗"
        ]
      },
      {
        titulo: "La familia de «porque»",
        regla: "«Por qué» (separado, con tilde) para preguntas. «Porque» (junto, sin tilde) para responder o dar causa. «El porqué» (sustantivo, con tilde) equivale a «la razón». «Por que» solo cuando equivale a «por el que/la que».",
        ejemplos: [
          "¿Por qué llegaste tarde?",
          "Llegué tarde porque había tráfico",
          "Nadie entiende el porqué de su decisión",
          "Esa es la causa por que (por la que) se marchó"
        ]
      },
      {
        titulo: "Reglas recientes",
        regla: "Los demostrativos (este, ese, aquel...) ya no llevan tilde nunca. «Solo» tampoco la lleva (desde la Ortografía de 2023, incluso en casos de ambigüedad). «Aún» (todavía) conserva la tilde frente a «aun» (incluso).",
        ejemplos: [
          "Este libro me gusta ✓ (nunca «éste»)",
          "Trabaja solo los sábados ✓ (nunca «sólo»)",
          "Aún no ha llegado (= todavía) / Se lo daré aun si se enfada (= incluso)"
        ]
      }
    ],
    ejercicios: [
      {
        tipo: "seleccion",
        enunciado: "¿A ___ hora empieza la función?",
        opciones: ["qué", "que"],
        respuesta: "qué",
        regla: "Los interrogativos (qué, quién, cómo, cuándo, dónde, cuál, cuánto) llevan tilde en preguntas directas.",
        razon: "La oración es una pregunta directa: va entre signos de interrogación y «qué» es la palabra interrogativa que introduce el complemento «hora».",
        ejemplos: [
          "¿Qué quieres? ✓",
          "¿Que quieres? ✗ (solo sería correcta con otro sentido, como «¿(dices) que quieres?»)"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "No sé ___ dejé las llaves.",
        opciones: ["dónde", "donde"],
        respuesta: "dónde",
        regla: "Los interrogativos llevan tilde también en las preguntas indirectas, aunque no haya signos de interrogación.",
        razon: "«No sé...» introduce una pregunta indirecta: el hablante desconoce el lugar, por lo que «dónde» funciona como interrogativo y lleva tilde.",
        ejemplos: [
          "Me preguntó cuándo volverías ✓",
          "No sé quién fue ✓",
          "No sé donde dejé las llaves ✗"
        ]
      },
      {
        tipo: "hueco",
        enunciado: "Ese paquete es para ___.",
        respuesta: "mí",
        regla: "El pronombre personal «mí» lleva tilde; el posesivo «mi» no.",
        razon: "Tras la preposición «para» necesitamos el pronombre tónico «mí» (con tilde). El posesivo átono «mi» solo acompaña a un sustantivo («mi casa»).",
        ejemplos: [
          "Vino sin mí ✓",
          "Mi casa es tu casa ✓ (posesivo, sin tilde)",
          "Es para mi ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Espero que te ___ tiempo de descansar.",
        opciones: ["dé", "de"],
        respuesta: "dé",
        regla: "El verbo «dar» lleva tilde diacrítica en presente de subjuntivo: dé, des, demos... La preposición «de» nunca la lleva.",
        razon: "Tras «espero que» el verbo va en subjuntivo: «(espero que) dé», del verbo dar. Si sustituimos por otro verbo («espero que te sobre tiempo»), se confirma que es un verbo, no la preposición.",
        ejemplos: [
          "Que Dios te dé salud ✓",
          "El libro de Ana ✓ (preposición, sin tilde)",
          "Espero que te de tiempo ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "No vamos ___ llueve.",
        opciones: ["si", "sí"],
        respuesta: "si",
        regla: "La conjunción condicional «si» (introduce una condición) no lleva tilde. «Sí» (afirmación o pronombre) la lleva.",
        razon: "Aquí «si llueve» expresa la condición para no irnos. La condición se escribe sin tilde; solo «sí» afirmativo o pronombre la lleva («Sí, iré»; «sí mismo»).",
        ejemplos: [
          "Si estudias, aprobarás ✓",
          "Sí, claro que voy ✓",
          "No vamos sí llueve ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "___ lo dijo ayer en la reunión.",
        opciones: ["Él", "El"],
        respuesta: "Él",
        regla: "El pronombre personal «él» lleva tilde; el artículo «el» no.",
        razon: "La palabra funciona como sujeto de «dijo» (¿quién lo dijo? él). Cuando puede sustituirse por «ella/usted», es el pronombre y lleva tilde; si acompaña a un sustantivo, es artículo («el coche»).",
        ejemplos: [
          "Él y ella llegaron juntos ✓",
          "El perro duerme ✓ (artículo)",
          "El lo dijo ayer ✗"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración está escrita correctamente?",
        opciones: ["Todavía no he comido.", "Todavia no he comido."],
        respuesta: "Todavía no he comido.",
        regla: "«Todavía» (con tilde) significa «aún, hasta ahora»; es esdrújula y siempre la lleva.",
        razon: "Las palabras esdrújulas (toda palabra tónica en la antepenúltima sílaba) llevan tilde siempre: to-da-ví-a. Escribirla sin tilde es una falta ortográfica frecuente.",
        ejemplos: [
          "Todavía hay entradas ✓",
          "Todavia hay entradas ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Quiero saber ___ prefieres: café o té.",
        opciones: ["qué", "que"],
        respuesta: "qué",
        regla: "En preguntas indirectas («quiero saber...», «dime...», «no sé...») los interrogativos llevan tilde.",
        razon: "Aunque no hay signos de interrogación, «saber» introduce una pregunta indirecta cuya respuesta es «café o té»; «qué» es interrogativo y lleva tilde.",
        ejemplos: [
          "Quiero saber qué piensas ✓",
          "Dime cuál prefieres ✓",
          "Quiero saber que prefieres ✗"
        ]
      },
      {
        tipo: "hueco",
        enunciado: "___ no han llegado tus primos. (significa «todavía»)",
        respuesta: "Aún",
        regla: "«Aún» (con tilde) significa «todavía»; «aun» (sin tilde) significa «incluso».",
        razon: "El sentido de la oración es «todavía no han llegado», valor temporal, que corresponde a «aún» con tilde. Si el sentido fuera «incluso», se escribiría «aun» («aun los niños lo saben»).",
        ejemplos: [
          "Aún duerme (= todavía) ✓",
          "Aun enfermo, vino (= incluso) ✓",
          "Aun no ha llegado ✗ (si se quiere decir «todavía»)"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Tras la comida, siempre tomo un ___.",
        opciones: ["té", "te"],
        respuesta: "té",
        regla: "El sustantivo «té» (la infusión) lleva tilde; el pronombre «te» no.",
        razon: "«Té» es un sustantivo agudo terminado en vocal, por lo que, además de distinguirse del pronombre, sigue la regla general de acentuación (agudo + vocal = tilde).",
        ejemplos: [
          "Un té con leche ✓",
          "Te lo dije ✓ (pronombre, sin tilde)",
          "Tomo un te ✗"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración está escrita correctamente?",
        opciones: ["¿Sabes quién llamó?", "¿Sabes quien llamó?"],
        respuesta: "¿Sabes quién llamó?",
        regla: "En las preguntas indirectas, los interrogativos conservan la tilde aunque no haya signos de interrogación en esa parte.",
        razon: "«¿Sabes...?» pregunta por la identidad de la persona: «quién» es interrogativo (¿quién llamó? → pregunta indirecta) y debe llevar tilde.",
        ejemplos: [
          "¿Sabes cuándo llega? ✓",
          "¿Sabes quien llamó? ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Necesito ___ tiempo para pensarlo.",
        opciones: ["más", "mas"],
        respuesta: "más",
        regla: "El adverbio de cantidad «más» lleva tilde siempre. La conjunción «mas» (= pero, de uso culto y literario) no la lleva.",
        razon: "Aquí expresamos cantidad («necesito más tiempo»), valor que corresponde a «más» con tilde. La conjunción «mas» solo puede sustituirse por «pero»: «quería ir, mas no pude».",
        ejemplos: [
          "Quiero más café ✓",
          "Iba a ir, mas llovió (= pero) ✓ sin tilde",
          "Necesito mas tiempo ✗"
        ]
      }
    ]
  });
})();
