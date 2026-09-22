/* Tema: indefinido, imperfecto y perfecto (aspecto verbal). */
(function () {
  "use strict";

  GV.registrarTema({
    id: "aspecto",
    titulo: "Indefinido, imperfecto y perfecto",
    inicial: "I/f",
    descripcion: "No son tres formas del pasado al azar: cada una pinta el tiempo de un modo distinto. Y el «he comido hoy» cambia según el país.",
    teoria: [
      {
        titulo: "Imperfecto: el fondo; indefinido: la acción",
        regla: "El imperfecto presenta el pasado como fondo: hábitos, descripciones y acciones en curso sin final marcado (jugaba, era, había). El indefinido presenta acciones puntuales y cerradas, la trama: jugué, fue, hubo.",
        ejemplos: [
          "Cuando era niño, jugaba aquí todos los días ✓ (hábito: imperfecto)",
          "Ayer jugué un partido tremendo ✓ (puntual: indefinido)",
          "Hacía sol y la gente paseaba ✓ (descripción)"
        ]
      },
      {
        titulo: "La regla del interruptor",
        regla: "Cuando una acción en curso (imperfecto) es interrumpida por otra puntual (indefinido), cada verbo toma su modo: «Mientras cocinaba, sonó el teléfono». El interruptor es indefinido; lo que se interrumpe, imperfecto.",
        ejemplos: [
          "Mientras leía, sonó el teléfono ✓",
          "Salíamos de casa cuando empezó a llover ✓",
          "Mientras leí, sonaba el teléfono ✗ (al revés)"
        ]
      },
      {
        titulo: "Perfecto compuesto: hoy o todo el tiempo",
        regla: "El perfecto compuesto (he comido) sirve para períodos aún no terminados: hoy, esta semana, este año, ya, todavía no. En España se usa generosamente; en gran parte de América se prefiere el indefinido: «comí hoy». Ambas normas son correctas.",
        ejemplos: [
          "Hoy he desayunado tarde ✓ (España)",
          "Hoy desayuné tarde ✓ (América: igual de correcta)",
          "Todavía no ha llegado ✓ (período abierto)"
        ]
      },
      {
        titulo: "Marco acabado, acción acabada",
        regla: "Con marcos cerrados (ayer, anoche, el año pasado, en 1998), el español pide indefinido: «estuve enfermo», «viví dos años en Lima». El imperfecto queda para el fondo dentro de ese marco: «cuando viví allí, hacía frío».",
        ejemplos: [
          "Estuve enfermo todo el fin de semana ✓",
          "Viví dos años en Lima ✓",
          "Eran las diez cuando por fin llegó ✓ (la hora: fondo)"
        ]
      }
    ],
    ejercicios: [
      {
        tipo: "seleccion",
        enunciado: "Cuando era niño, ___ al parque todos los días.",
        opciones: ["iba", "fui"],
        respuesta: "iba",
        regla: "El hábito del pasado se expresa en imperfecto: iba.",
        razon: "«Todos los días» señala repetición, un fondo sin cierre: imperfecto. El indefinido «fui» contaría un día concreto.",
        ejemplos: [
          "Íbamos a la playa cada verano ✓",
          "Fui a la playa el martes ✓ (un solo día)",
          "Fui al parque todos los días (cambiando el sentido: una vez por día puntual)"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Ayer ___ al cine con Marta.",
        opciones: ["fui", "iba"],
        respuesta: "fui",
        regla: "La acción puntual y cerrada («ayer») va en indefinido: fui.",
        razon: "«Ayer» enmarca un hecho único y terminado: la trama del pasado pide indefinido.",
        ejemplos: [
          "Ayer fui al dentista ✓",
          "El año pasado fuimos a Roma ✓",
          "Ayer iba al cine (solo como fondo: «ayer iba al cine cuando me encontré a Ana»)"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Mientras ___ la cena, sonó el teléfono.",
        opciones: ["preparaba", "preparé"],
        respuesta: "preparaba",
        regla: "La acción en curso que sufre la interrupción va en imperfecto.",
        razon: "«Mientras» marca simultaneidad: cocinar es el fondo sobre el que irrumpe «sonó» (puntual). El interruptor es indefinido; lo interrumpido, imperfecto.",
        ejemplos: [
          "Dormía cuando llegó la noticia ✓",
          "Estudiaba cuando llamaste ✓",
          "Mientras preparé la cena, sonó ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "De repente, ___ un estruendo terrible.",
        opciones: ["hubo", "había"],
        respuesta: "hubo",
        regla: "«De repente» señala lo puntual: indefinido (hubo).",
        razon: "La brusquedad del acontecimiento pide indefinido. «Había» presentaría el hecho como fondo previo, incompatible con «de repente».",
        ejemplos: [
          "De repente, hubo un silencio ✓",
          "Había un silencio enorme en la sala ✓ (descripción: imperfecto)",
          "De repente, había un estruendo ✗"
        ]
      },
      {
        tipo: "hueco",
        enunciado: "Esta mañana ___ tarde. (desayunar, perfecto compuesto, España)",
        respuesta: "he desayunado",
        regla: "«Esta mañana» es un período aún abierto: perfecto compuesto (norma española).",
        razon: "Mientras la mañana no termina, «he desayunado» conecta el pasado con el presente. Es la norma peninsular; en América se dice igualmente «desayuné».",
        ejemplos: [
          "Hoy he trabajado mucho ✓",
          "Esta semana hemos tenido suerte ✓",
          "Ayer he trabajado mucho ✗ (ayer es cerrado: trabajé)"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "(Norma americana) Esta mañana ___ temprano.",
        opciones: ["desayuné", "he desayunado"],
        respuesta: "desayuné",
        regla: "En gran parte de América, con «esta mañana» se usa el indefinido: desayuné.",
        razon: "La norma americana reserva el compuesto para períodos que incluyen el presente con relevancia actual («hoy he tenido suerte» también se dice), pero con períodos de tiempo como «esta mañana» es normal el indefinido. Ambas normas son correctas en su región.",
        ejemplos: [
          "Esta semana fui al médico dos veces ✓ (uso americano)",
          "Esta semana he ido al médico ✓ (uso peninsular)",
          "Ninguna de las dos es incorrecta: son normas distintas"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta para contar un hecho acabado?",
        opciones: [
          "Estuve enfermo todo el fin de semana.",
          "Estaba enfermo todo el fin de semana."
        ],
        respuesta: "Estuve enfermo todo el fin de semana.",
        regla: "Un marco cerrado («todo el fin de semana») con hecho único pide indefinido.",
        razon: "La enfermedad es la noticia: empezó y terminó en ese fin de semana. «Estaba» serviría como fondo («estaba enfermo, así que no salí»), no como hecho contado con sus límites.",
        ejemplos: [
          "Estuve enfermo, por eso falté ✓",
          "Estaba enfermo y no pude ir ✓ (fondo de otra acción)",
          "Estaba enfermo todo el fin de semana ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "___ las diez cuando por fin llegó.",
        opciones: ["Eran", "Fueron"],
        respuesta: "Eran",
        regla: "La hora funciona como fondo del pasado: imperfecto (eran las diez).",
        razon: "La hora marca el escenario en el que ocurre la acción puntual («llegó»). Como fondo, va en imperfecto: eran, era la una.",
        ejemplos: [
          "Era de noche cuando desperté ✓",
          "Eran casi las doce ✓",
          "Fueron las diez cuando llegó ✗"
        ]
      },
      {
        tipo: "hueco",
        enunciado: "Anoche ___ una película buenísima. (ver, indefinido)",
        respuesta: "vi",
        regla: "«Anoche» es marco cerrado: indefinido (vi).",
        razon: "El ver en la tele anoche es un hecho contado, con principio y fin: vi. El imperfecto «veía» reservaría el hecho para el fondo de otra acción.",
        ejemplos: [
          "Anoche vi un documental ✓",
          "Veía la tele cuando llamaste ✓ (fondo)",
          "Anoche veía una película ✗ (sin acción que la interrumpa)"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: [
          "Viví dos años en Lima.",
          "Vivía dos años en Lima."
        ],
        respuesta: "Viví dos años en Lima.",
        regla: "Un período delimitado («dos años») contado como hecho va en indefinido.",
        razon: "La estancia se presenta cerrada y con medida: viví. «Vivía» no cuadra con una duración contada sin más contexto.",
        ejemplos: [
          "Trabajé allí diez años ✓",
          "Cuando trabajaba allí, vivía con mis tíos ✓ (fondo)",
          "Vivía dos años en Lima ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "De pequeño, ___ mucho miedo a la oscuridad.",
        opciones: ["tenía", "tuve"],
        respuesta: "tenía",
        regla: "Los estados y sentimientos prolongados del pasado van en imperfecto: tenía.",
        razon: "El miedo era un rasgo duradero de esa época («de pequeño»), no un hecho puntual: tenía. «Tuve» lo convertiría en un episodio único.",
        ejemplos: [
          "Era muy tímido de niño ✓",
          "Teníamos un perro que ladraba mucho ✓",
          "De pequeño tuve miedo esa noche ✓ (una noche concreta)"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "La semana pasada ___ una conferencia muy interesante.",
        opciones: ["asistí", "asistía"],
        respuesta: "asistí",
        regla: "«La semana pasada» es marco cerrado: indefinido.",
        razon: "La asistencia es un hecho terminado dentro de un período ya cerrado: asistí. Es la elección normal para contar la trama.",
        ejemplos: [
          "El viernes asistimos a la boda ✓",
          "Asistía a clases nocturnas entonces ✓ (hábito: imperfecto)",
          "La semana pasada asistía ✗"
        ]
      }
    ]
  });
})();
