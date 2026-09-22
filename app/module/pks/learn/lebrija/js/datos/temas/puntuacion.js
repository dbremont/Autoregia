/* Tema: puntuación. */
(function () {
  "use strict";

  GV.registrarTema({
    id: "puntuacion",
    titulo: "Puntuación",
    inicial: "P",
    descripcion: "Comas que cambian sentidos, comillas con o sin punto y la raya del diálogo. Escribir bien también es respirar bien el texto.",
    teoria: [
      {
        titulo: "No coma entre sujeto y verbo",
        regla: "El sujeto y el verbo nunca se separan con coma, salvo que haya un inciso en medio. Tampoco se separan el verbo y su complemento directo.",
        ejemplos: [
          "El libro que me prestaste me gustó mucho ✓",
          "El libro que me prestaste, me gustó ✗",
          "Mis primos, que viven lejos, llegaron ✓ (inciso: sí lleva comas)"
        ]
      },
      {
        titulo: "La coma ante «y»",
        regla: "En una enumeración, no se pone coma antes de «y» («pan, leche y huevos»). Sí se admite (y a veces se exige) cuando la última parte es una oración completa con sujeto propio o cambia el sentido.",
        ejemplos: [
          "Compré pan, leche y huevos ✓",
          "Compré pan, leche, y huevos ✗ (enumeración simple)",
          "Pagó el alquiler, y aun así lo echaron ✓ (oraciones completas)"
        ]
      },
      {
        titulo: "El vocativo",
        regla: "El vocativo (el nombre a quien llamamos o hablamos) se aísla con comas: «Ana, ven aquí».",
        ejemplos: [
          "Marta, ¿has visto mis llaves? ✓",
          "Les digo, señores, que se abstengan ✓",
          "Marta ¿has visto mis llaves? ✗"
        ]
      },
      {
        titulo: "Comillas y puntos",
        regla: "En español, la puntuación va fuera de las comillas: «Voy a llegar», dijo Marta. El punto se coloca después de las comillas de cierre, nunca dentro.",
        ejemplos: [
          "«Voy a llegar», dijo Marta. ✓",
          "«Voy a llegar,» dijo Marta. ✗",
          "Dijo que estaba «cansado». ✓ (punto fuera)"
        ]
      },
      {
        titulo: "Guion y raya",
        regla: "El guion (-) une y separa: composiciones (teórico-práctico) e intervalos (1914-1918). La raya (—) encierra incisos e introduce los turnos de palabra en diálogos.",
        ejemplos: [
          "El período 1914-1918 fue devastador ✓ (guion)",
          "—¿Vienes? —preguntó Luis ✓ (rayas de diálogo)",
          "Un argumento —el mejor de todos— convenció al jurado ✓ (raya de inciso)"
        ]
      },
      {
        titulo: "Dos puntos y minúscula",
        regla: "Los dos puntos anuncian una enumeración o una explicación; lo que sigue se escribe en minúscula, salvo que sea cita textual, encabezamiento o documento.",
        ejemplos: [
          "Trae tres cosas: pan, queso y vino ✓",
          "Me gusta una frase: vivir y dejar vivir ✓",
          "Y con esta frase cerró: «Se acabó lo que se daba». ✓ (cita: mayúscula)"
        ]
      },
      {
        titulo: "Etcétera y demás parientes",
        regla: "«Etc.» ya significa «y otras cosas»: no se repite ni se acompaña de puntos suspensivos. Ante «etc.» va coma, y tras él el punto que corresponda.",
        ejemplos: [
          "Trajo pan, leche, huevos, etc. ✓",
          "Trajo pan, leche, huevos, etcétera... ✗ (redundante)",
          "Trajo pan, leche y huevos ✓ (mejor: si puedes cerrar la enumeración, ciérrala)"
        ]
      }
    ],
    ejercicios: [
      {
        tipo: "oraciones",
        enunciado: "«Juan, mi hermano, llegó tarde»: ¿dónde están bien puestas las comas?",
        opciones: [
          "Juan, mi hermano, llegó tarde.",
          "Juan, mi hermano llegó tarde."
        ],
        respuesta: "Juan, mi hermano, llegó tarde.",
        regla: "Los incisos explicativos se aíslan con dos comas: una para abrirlos y otra para cerrarlos.",
        razon: "«Mi hermano» es una explicación sobre Juan: abre con coma y cierra con coma. Dejar solo la primera es un error muy común (coma abierta y nunca cerrada).",
        ejemplos: [
          "Mi jefe, que es de León, vino ayer ✓",
          "Mi jefe, que es de León vino ayer ✗"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: [
          "Compré pan, leche y huevos.",
          "Compré pan, leche, y huevos."
        ],
        respuesta: "Compré pan, leche y huevos.",
        regla: "En las enumeraciones, no se escribe coma antes de la conjunción «y».",
        razon: "La enumeración simple («A, B y C») cierra sin coma ante «y». La coma solo se admite si el último elemento es una oración completa o hay riesgo de ambigüedad.",
        ejemplos: [
          "Vino, comió y se fue ✓",
          "Vino, comió, y se fue ✗",
          "Dejó su casa, su ciudad, y aquello que tanto amaba, el mar ✓ (matiz literario admisible)"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: [
          "Ana, cierra la puerta.",
          "Ana cierra, la puerta."
        ],
        respuesta: "Ana, cierra la puerta.",
        regla: "El vocativo (a quien llamamos) se separa con coma del resto de la oración.",
        razon: "«Ana» es el vocativo: la persona a la que se llama. Debe ir entre comas si está en medio («Te lo digo, Ana, en serio») o seguida de coma si va delante.",
        ejemplos: [
          "Señores, hagan silencio ✓",
          "¿Te gusta, Pedro, esta canción? ✓",
          "Señores hagan silencio ✗"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: [
          "Llegó, saludó y se sentó.",
          "Llegó, saludó, y se sentó."
        ],
        respuesta: "Llegó, saludó y se sentó.",
        regla: "Con tres o más verbos consecutivos del mismo sujeto, no hay coma ante «y».",
        razon: "«Llegó», «saludó» y «se sentó» son acciones encadenadas de un mismo sujeto: enumeración simple, sin coma antes de «y».",
        ejemplos: [
          "Abrió la puerta, encendió la luz y se durmió ✓",
          "Abrió la puerta, encendió la luz, y se durmió ✗"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál es la puntuación correcta de la cita?",
        opciones: [
          "«Voy a llegar», dijo Marta.",
          "«Voy a llegar,» dijo Marta."
        ],
        respuesta: "«Voy a llegar», dijo Marta.",
        regla: "En español, la coma y otros signos de puntuación van fuera de las comillas.",
        razon: "A diferencia del inglés, el español coloca la puntuación después de las comillas de cierre: «...», dijo. La coma dentro de las comillas es un anglicismo gráfico.",
        ejemplos: [
          "«No sé», respondió ella. ✓",
          "«No sé,» respondió ella. ✗",
          "«¿Vienes?», preguntó. ✓ (el signo de interrogación sí va dentro, pues pertenece a la cita)"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "Para indicar el intervalo de años de la Primera Guerra Mundial, ¿qué signo corresponde?",
        opciones: [
          "El período 1914-1918 fue devastador.",
          "El período 1914—1918 fue devastador."
        ],
        respuesta: "El período 1914-1918 fue devastador.",
        regla: "Los intervalos (fechas, páginas) se expresan con guion (-), no con raya (—).",
        razon: "El guion une extremos de un intervalo: 1914-1918, págs. 23-45. La raya larga se reserva para incisos y diálogos.",
        ejemplos: [
          "Lee las páginas 10-25 ✓",
          "Lee las páginas 10—25 ✗",
          "Un viaje Madrid—Lisboa ✗ → Madrid-Lisboa ✓"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: [
          "Trae tres cosas: pan, queso y vino.",
          "Trae tres cosas, pan, queso y vino."
        ],
        respuesta: "Trae tres cosas: pan, queso y vino.",
        regla: "Ante una enumeración anunciada, se usan dos puntos, no coma.",
        razon: "«Tres cosas» anuncia que a continuación se explicará qué son: esa anticipación exige dos puntos. La coma dejaría la oración sin cerrar la expectativa.",
        ejemplos: [
          "Necesito lo siguiente: tiempo, dinero y paciencia ✓",
          "Necesito lo siguiente, tiempo, dinero y paciencia ✗"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "Después de dos puntos y sin ser cita textual, ¿qué corresponde?",
        opciones: [
          "Me gusta una frase: vivir y dejar vivir.",
          "Me gusta una frase: Vivir y dejar vivir."
        ],
        respuesta: "Me gusta una frase: vivir y dejar vivir.",
        regla: "Tras dos puntos se escribe en minúscula, salvo que siga una cita textual, un encabezamiento o un documento.",
        razon: "Los dos puntos no cierran la oración; lo que sigue es continuación de ella. Solo las citas textuales autónomas conservan la mayúscula.",
        ejemplos: [
          "Solo pido una cosa: puntualidad ✓",
          "Solo pido una cosa: Puntualidad ✗",
          "Terminó con su máxima: «Nunca es tarde». ✓ (cita: mayúscula)"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: [
          "Marta, ¿has visto mis llaves?",
          "Marta ¿has visto mis llaves?"
        ],
        respuesta: "Marta, ¿has visto mis llaves?",
        regla: "El vocativo va seguido de coma, incluso ante signos de interrogación.",
        razon: "«Marta» es el nombre de la persona a la que se pregunta; para aislarlo del resto se usa la coma, igual que en la oración enunciativa.",
        ejemplos: [
          "Juan, ¿vienes? ✓",
          "Juan ¿vienes? ✗",
          "¿Vienes, Juan? ✓ (vocativo en medio o al final, también con comas)"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "¿Cuál es la forma correcta de cerrar una enumeración abierta?",
        opciones: [
          "Trajo pan, leche, huevos, etc.",
          "Trajo pan, leche, huevos, etcétera, etcétera.",
          "Trajo pan, leche, huevos, etcétera..."
        ],
        respuesta: "Trajo pan, leche, huevos, etc.",
        regla: "«Etc.» ya significa «y otras cosas»: no se repite ni se combina con puntos suspensivos.",
        razon: "Etcétera equivale a «y el resto»: añadir otra «etcétera» o puntos suspensivos duplica el cierre. Ante «etc.» se escribe coma; tras él, el punto final.",
        ejemplos: [
          "Vinieron Ana, Luis, etc. ✓",
          "Vinieron Ana, Luis, etc., y todos trajeron algo ✓ (etc. en medio: coma tras él)",
          "Vinieron Ana, Luis, etcétera... ✗"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: [
          "El libro que me prestaste me gustó mucho.",
          "El libro, que me prestaste me gustó mucho."
        ],
        respuesta: "El libro que me prestaste me gustó mucho.",
        regla: "No se escribe coma entre el sujeto (o su oración de relativo especificativa) y el verbo.",
        razon: "«Que me prestaste» especifica de qué libro se trata (especificativa: sin comas). Añadir la coma tras «libro» separa indebidamente el sujeto del verbo «gustó».",
        ejemplos: [
          "Los que quieran venir que lo digan ✓",
          "Los que quieran venir, que lo digan ✓ (aquí la coma marca un inciso apelativo admitido)",
          "El libro que me prestaste, me gustó ✗"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: [
          "—¿Vienes? —preguntó Luis.",
          "—¿Vienes? ¡preguntó Luis!"
        ],
        respuesta: "—¿Vienes? —preguntó Luis.",
        regla: "En los diálogos, la raya introduce el turno de palabra y los incisos del narrador.",
        razon: "La raya abre cada intervención y encierra los comentarios del narrador («—preguntó Luis»). Los signos de exclamación e interrogación pertenecen a la cita, no al narrador.",
        ejemplos: [
          "—¿Dónde estabas? —gritó ella ✓",
          "—Ya voy —respondió él—, dame un minuto. ✓ (inciso del narrador entre rayas)",
          "—Ya voy, respondió él, dame un minuto. ✗"
        ]
      }
    ]
  });
})();
