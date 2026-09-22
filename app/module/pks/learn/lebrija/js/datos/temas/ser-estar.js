/* Tema: ser y estar avanzado. */
(function () {
  "use strict";

  GV.registrarTema({
    id: "ser-estar",
    titulo: "Ser y estar avanzado",
    inicial: "S/E",
    descripcion: "No es solo «cómo estás»: con participios, eventos y estados, la elección entre ser y estar cambia el significado.",
    teoria: [
      {
        titulo: "Ser + participio = acción; estar + participio = resultado",
        regla: "«La puerta fue cerrada por el portero» (pasiva: alguien actuó) frente a «la puerta está cerrada» (estado resultante). Con ser, el agente puede aparecer con «por»; con estar, la frase describe cómo está la cosa ahora.",
        ejemplos: [
          "El puente fue construido en 1932 ✓ (acción histórica)",
          "El puente está construido en piedra ✓ (resultado/material)",
          "La ley fue reformada ✓ / La ley está reformada ✓ (matices distintos)"
        ]
      },
      {
        titulo: "Característica frente a estado pasajero",
        regla: "Con adjetivos que admiten ambos verbos, «ser» expresa característica permanente y «estar», estado o grado actual: «Juan es aburrido» (es un pesado) / «Juan está aburrido» (ahora no tiene diversion); «la sopa es salada» (receta) / «está salada» (demasiado salada hoy).",
        ejemplos: [
          "Mi jefe es muy simpático ✓ (característica)",
          "Hoy mi jefe está muy simpático ✓ (hoy, raro pero posible)",
          "La sopa está muy salada ✓ (hoy salió salada)"
        ]
      },
      {
        titulo: "Lugar y eventos",
        regla: "La ubicación física va con estar («está en Madrid», «el gato está en el tejado»), salvo eventos: la fiesta, la reunión o el concierto «son» en un lugar («la fiesta es en mi casa»). El origen va con ser: «soy de México».",
        ejemplos: [
          "La reunión es en la sala grande ✓ (evento)",
          "El proyector está en la sala grande ✓ (objeto)",
          "La boda será en el jardín ✓"
        ]
      },
      {
        titulo: "Material y posesión",
        regla: "«Ser de» expresa material («esta mesa es de nogal») y posesión o pertenencia («el coche es de Ana», «es de la universidad»). Estar no se usa en estos sentidos.",
        ejemplos: [
          "El anillo es de oro ✓",
          "Esta casa es de mis padres ✓",
          "El anillo está de oro ✗"
        ]
      }
    ],
    ejercicios: [
      {
        tipo: "seleccion",
        enunciado: "La carta ___ por el director. (acción de firmar)",
        opciones: ["fue firmada", "está firmada"],
        respuesta: "fue firmada",
        regla: "Ser + participio expresa la acción (pasiva), con posible agente con «por».",
        razon: "Si el interese está en quién hizo la acción («por el director»), se usa la pasiva con ser: fue firmada. «Está firmada» solo describiría el estado actual del documento.",
        ejemplos: [
          "El edificio fue diseñado por Gaudí ✓",
          "El edificio está diseñado en cruz ✓ (resultado)",
          "La carta está firmada por el director ✓ (estado: también posible, otro matiz)"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "La carta ___ sobre la mesa.",
        opciones: ["está", "es"],
        respuesta: "está",
        regla: "La ubicación física de objetos y personas va con estar.",
        razon: "Decir dónde está algo («sobre la mesa») pide estar. La excepción son los eventos (la fiesta es en...).",
        ejemplos: [
          "Las llaves están en el cajón ✓",
          "Madrid está en el centro de España ✓",
          "La carta es sobre la mesa ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Juan ___ muy aburrido hoy; no para de bostezar.",
        opciones: ["está", "es"],
        respuesta: "está",
        regla: "«Estar aburrido» = estado pasajero; «ser aburrido» = persona o cosa pesada por naturaleza.",
        razon: "Con «hoy» y bostezos, el sentido es temporal: está aburrido (ahora). «Es aburrido» lo calificaría de pesado como rasgo permanente.",
        ejemplos: [
          "Los niños están aburridos en el museo ✓",
          "Ese profesor es aburrido ✓ (característica)",
          "Juan es muy aburrido hoy ✗ (mezcla incoherente)"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Ese documental ___ aburrido: dura cuatro horas.",
        opciones: ["es", "está"],
        respuesta: "es",
        regla: "La característica permanente va con ser: ese documental es aburrido.",
        razon: "La valoración es un rasgo de la obra, no un estado ocasional: es aburrido. Con estar («está aburrido el público»), el aburrido sería otro.",
        ejemplos: [
          "Es una película muy lenta ✓",
          "Su charla es pesadísima ✓",
          "Ese documental está aburrido ✗ (salvo que hable de su estado actual)"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: [
          "Las ventanas están rotas.",
          "Las ventanas son rotas."
        ],
        respuesta: "Las ventanas están rotas.",
        regla: "El estado resultante de un rompimiento va con estar: están rotas.",
        razon: "El participio con estar describe cómo están las ventanas ahora (resultado). «Son rotas» con ser solo cabría en una pasiva con agente («fueron rotas por los vándalos»).",
        ejemplos: [
          "El vaso está roto ✓",
          "El vaso fue roto por el gato ✓ (pasiva, poco usual pero posible)",
          "Las ventanas son rotas ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "La reunión ___ en la sala grande.",
        opciones: ["es", "está"],
        respuesta: "es",
        regla: "Los eventos (reuniones, fiestas, conciertos) se ubican con ser.",
        razon: "Aunque la sala sea un lugar, el evento «tiene lugar» en ella: la reunión es. Con estar hablaríamos de un objeto físico en la sala.",
        ejemplos: [
          "El concierto es en el anfiteatro ✓",
          "La boda fue en Primavera ✓ (tiempo de evento: ser)",
          "La reunión está en la sala grande ✗"
        ]
      },
      {
        tipo: "hueco",
        enunciado: "¿De dónde ___ tú? (origen)",
        respuesta: "eres",
        regla: "El origen se expresa con ser: soy de, eres de, es de...",
        razon: "La procedencia es un rasgo identitario permanente, terreno de ser: «soy de México», «somos de aquí». Estar no se usa para el origen.",
        ejemplos: [
          "Soy de Bogotá ✓",
          "¿De dónde son tus abuelos? ✓",
          "¿De dónde estás tú? ✗ (preguntaría por tu ubicación actual)"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Este coche ___ de mi hermano.",
        opciones: ["es", "está"],
        respuesta: "es",
        regla: "La posesión o pertenencia va con ser de: es de mi hermano.",
        razon: "«Ser de + persona» indica a quién pertenece algo. «Está de mi hermano» no existe con ese sentido (solo en expresiones como «está de cumpleaños»).",
        ejemplos: [
          "Esa bicicleta es mía ✓",
          "La culpa es de Pedro ✓",
          "Este coche está de mi hermano ✗"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "Al probar la sopa de hoy, ¿qué dices?",
        opciones: [
          "La sopa está muy salada hoy.",
          "La sopa es muy salada hoy."
        ],
        respuesta: "La sopa está muy salada hoy.",
        regla: "El grado actual de un adjetivo va con estar: está muy salada (hoy).",
        razon: "«Hoy» marca un estado puntual de esa olla concreta: está. «Es muy salada» describiría la receta o el tipo de sopa en general.",
        ejemplos: [
          "El café está muy amargo ✓ (esta taza)",
          "El café es amargo ✓ (característica del tipo)",
          "La sopa es muy salada hoy ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "El puente ___ de piedra.",
        opciones: ["es", "está"],
        respuesta: "es",
        regla: "El material se expresa con ser de: es de piedra.",
        razon: "La materia con la que está hecho algo es una característica permanente: es de piedra. «Está de piedra» no existe con ese sentido.",
        ejemplos: [
          "La mesa es de nogal ✓",
          "La camiseta es de algodón ✓",
          "El puente está de piedra ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Los niños ___ cansados del viaje.",
        opciones: ["están", "son"],
        respuesta: "están",
        regla: "El estado físico o anímico temporal va con estar: están cansados.",
        razon: "El cansancio del viaje es pasajero: están cansados. «Son cansados» sería un rasgo permanente (personas que cansan a otros), otro sentido.",
        ejemplos: [
          "Estoy agotado ✓",
          "Mis pies están doloridos ✓",
          "Los niños son cansados ✓ (pero significa: son pesados)"
        ]
      },
      {
        tipo: "hueco",
        enunciado: "La ciudad ___ muy animada esta noche. (estado)",
        respuesta: "está",
        regla: "Los estados o apariencias actuales van con estar: está animada.",
        razon: "«Esta noche» señala un estado coyuntural de la ciudad: está animada. «Es animada» sería un rasgo habitual del lugar.",
        ejemplos: [
          "El barrio está muy vivo los sábados ✓",
          "Sevilla es una ciudad animada ✓ (característica)",
          "La ciudad es muy animada esta noche ✗"
        ]
      }
    ]
  });
})();
