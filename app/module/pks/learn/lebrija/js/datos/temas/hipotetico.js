/* Tema: si, condicional y períodos hipotéticos. */
(function () {
  "use strict";

  GV.registrarTema({
    id: "hipotetico",
    titulo: "Si, condicional e hipótesis",
    inicial: "Si",
    descripcion: "«Si tendría dinero...» no: la oración condicional es una de las señas más visibles del español cuidado.",
    teoria: [
      {
        titulo: "La regla de oro: tras si, jamás condicional",
        regla: "En las oraciones hipotéticas, la cláusula con «si» lleva imperfecto de subjuntivo y la consecuencia lleva condicional: «Si tuviera dinero, viajaría». Nunca «si tendría», nunca el condicional tras «si».",
        ejemplos: [
          "Si tuviera tiempo, aprendería chino ✓",
          "Si tendría tiempo, aprendería ✗",
          "Si podría venir, te avisaría ✗"
        ]
      },
      {
        titulo: "Tras si tampoco va habría",
        regla: "En el pasado irreal: «Si hubiera estudiado, habría aprobado». La condición lleva pluscuamperfecto de subjuntivo (hubiera/hubiese) y la consecuencia, condicional compuesto (habría). El error típico: «si habría estudiado».",
        ejemplos: [
          "Si hubiera sabido la verdad, habría reaccionado distinto ✓",
          "Si habría sabido la verdad ✗",
          "De haberlo sabido, habría venido ✓ (fórmula abreviada)"
        ]
      },
      {
        titulo: "Condición probable: si + presente, futuro",
        regla: "Para condiciones verosímiles, «si» va con presente y la consecuencia con futuro: «Si llueve, nos quedaremos». También con imperativo: «Si llegas tarde, avísame».",
        ejemplos: [
          "Si hace sol, iremos a la playa ✓",
          "Si terminas pronto, avísame ✓",
          "Si haría sol, iremos ✗"
        ]
      },
      {
        titulo: "Condicional de rumor y de cortesía",
        regla: "El condicional sirve para informes no confirmados («Según la prensa, el ministro habría dimitido») y para la cortesía («¿Podría decirme...?», «Me gustaría...»). También expresa deseo no cumplido: «Me habría gustado ir».",
        ejemplos: [
          "El culpable habría huido hacia el norte ✓ (rumor)",
          "¿Podría repetirlo, por favor? ✓ (cortesía)",
          "Me habría encantado conocerte ✓ (no pudo ser)"
        ]
      }
    ],
    ejercicios: [
      {
        tipo: "seleccion",
        enunciado: "Si ___ tiempo, viajaría más.",
        opciones: ["tuviera", "tendría"],
        respuesta: "tuviera",
        regla: "Tras «si» hipotético va imperfecto de subjuntivo, nunca condicional.",
        razon: "La condición irreal se expresa con subjuntivo: si tuviera. El condicional queda para la consecuencia: viajaría. Mezclarlos («si tendría») es el error más censurado de este terreno.",
        ejemplos: [
          "Si tuviera dinero, compraría una casa ✓",
          "Si tendría dinero ✗",
          "Si tuvieses prisa, lo dirías ✓ (variante -se)"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Si ___ sabido antes, habría actuado distinto.",
        opciones: ["hubiera", "habría"],
        respuesta: "hubiera",
        regla: "La condición en pasado irreal lleva pluscuamperfecto de subjuntivo: si hubiera sabido.",
        razon: "«Habría» pertenece a la consecuencia (habría actuado); en la cláusula del si solo cabe «hubiera/hubiese». El fallo «si habría» es muy frecuente en el habla coloquial.",
        ejemplos: [
          "Si hubiera venido, lo habría visto ✓",
          "Si habría venido ✗",
          "De haber venido, lo habría visto ✓"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: [
          "Si pudiera, te ayudaría.",
          "Si podría, te ayudaría."
        ],
        respuesta: "Si pudiera, te ayudaría.",
        regla: "La cláusula del «si» lleva subjuntivo (pudiera), nunca condicional (podría).",
        razon: "«Podría» en la condición adelanta el condicional que pertenece a la consecuencia. El esquema correcto es: si + subjuntivo, condicional.",
        ejemplos: [
          "Si pudieras venir, sería genial ✓",
          "Si podrían venir ✗",
          "Podrían venir si quisieran ✓ (orden invertido, correcto)"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: [
          "Si estudiara, aprobaría el examen.",
          "Si estudiaría, aprobaría el examen."
        ],
        respuesta: "Si estudiara, aprobaría el examen.",
        regla: "Si + imperfecto de subjuntivo (estudiara), condicional (aprobaría).",
        razon: "El condicional no puede entrar en la cláusula condicionante. «Estudiara» (o «estudiese») marca la hipótesis; «aprobaría», el resultado.",
        ejemplos: [
          "Si durmieras mejor, rendirías más ✓",
          "Si dormirías mejor ✗",
          "Rendirías más si durmieras mejor ✓ (orden invertido)"
        ]
      },
      {
        tipo: "hueco",
        enunciado: "Ojalá ___ venir contigo. (poder, irreal de presente)",
        respuesta: "pudiera",
        variantes: ["pudiese"],
        regla: "El deseo irreal de presente se expresa con imperfecto de subjuntivo: ojalá pudiera.",
        razon: "«Ojalá» admite presente (deseo posible: ojalá pueda) e imperfecto (deseo irreal: ojalá pudiera). Con «pudiera» el hablante da el deseo por casi imposible.",
        ejemplos: [
          "Ojalá pudiera quedarme ✓ (no puedo)",
          "Ojalá pueda quedarme ✓ (quizá pueda)",
          "Ojalá podría quedarme ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Según el diario, el presidente ___ renunciado anoche.",
        opciones: ["habría", "habrá"],
        respuesta: "habría",
        regla: "El condicional compuesto transmite rumor o información no confirmada: habría renunciado.",
        razon: "Cuando el medio no garantiza el hecho, usa el condicional de rumor: «habría». El futuro «habrá» presentaría la renuncia como segura.",
        ejemplos: [
          "Los autores del robo habrían huido ✓",
          "El accidente habría causado tres heridos ✓",
          "Según trascendió, habrá renunciado ✗ (sería confirmación)"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "¿___ decirme la hora?",
        opciones: ["Podría", "Podré"],
        respuesta: "Podría",
        regla: "El condicional expresa cortesía en peticiones: ¿podría...?",
        razon: "«Podría» suaviza la petición al proyectarla en lo hipotético. El futuro «podré» describiría una capacidad futura, no una solicitud amable.",
        ejemplos: [
          "¿Podrías ayudarme? ✓",
          "Me gustaría un café, por favor ✓",
          "¿Podré decirme la hora? ✗"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: [
          "De saberlo antes, te lo habría dicho.",
          "De saberlo antes, te lo habrá dicho."
        ],
        respuesta: "De saberlo antes, te lo habría dicho.",
        regla: "La fórmula condicional abreviada «de + infinitivo» se combina con condicional: habría dicho.",
        razon: "«De saberlo» equivale a «si lo hubiera sabido», y su consecuencia natural es el condicional: habría. El futuro «habrá» rompe la relación hipotética.",
        ejemplos: [
          "De haberlo sabido, habría reaccionado ✓",
          "De llegar tarde, lo lamentarías ✓",
          "De saberlo antes, te lo habrá dicho ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Si mañana ___ sol, iremos a la playa.",
        opciones: ["hace", "haría"],
        respuesta: "hace",
        regla: "Condición probable: si + presente (hace), consecuencia en futuro (iremos).",
        razon: "Cuando la condición es verosímil, el español usa presente en el si: si hace sol. El condicional «haría» solo cabe en hipótesis irreal.",
        ejemplos: [
          "Si llegas tarde, empezaremos sin ti ✓",
          "Si tuviera tiempo, iría ✓ (irreal: otra familia)",
          "Si haría sol, iremos ✗"
        ]
      },
      {
        tipo: "hueco",
        enunciado: "Si ___ , nos habríamos mojado. (llover, pasado irreal)",
        respuesta: "hubiera llovido",
        variantes: ["hubiese llovido"],
        regla: "Condición irreal de pasado: si + hubiera/hubiese + participio.",
        razon: "La lluvia no ocurrió; para referirse a ese pasado no realizado se usa el pluscuamperfecto de subjuntivo. «Si habría llovido» es el error clásico.",
        ejemplos: [
          "Si hubiera traído paraguas... ✓",
          "Hubiésemos llegado antes si no hubiera tráfico ✓",
          "Si habría llovido ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Me ___ gustado acompañaros.",
        opciones: ["habría", "habrá"],
        respuesta: "habría",
        regla: "El deseo no cumplido se expresa con condicional compuesto: me habría gustado.",
        razon: "La accompañación no ocurrió; el condicional compuesto mira un pasado irreal. El futuro compuesto «habrá gustado» haría una deducción, otra cosa muy distinta.",
        ejemplos: [
          "Me habría encantado veros ✓",
          "Habríamos ido de haber sabido la fecha ✓",
          "Me habrá gustado ✓ (deducción sobre el pasado: otro sentido)"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: [
          "Si tuviera dinero, me compraría una casa.",
          "Si tendría dinero, me compraría una casa."
        ],
        respuesta: "Si tuviera dinero, me compraría una casa.",
        regla: "El esquema canónico: si + imperfecto de subjuntivo, condicional simple.",
        razon: "«Tendría» no puede entrar tras «si»: la condición irreal exige «tuviera/tuviese». Es la corrección estrella de los correctores de estilo.",
        ejemplos: [
          "Si tuviese más suerte, ganaría siempre ✓",
          "Ganaría más si trabajase horas extra ✓",
          "Si tendría más suerte ✗"
        ]
      }
    ]
  });
})();
