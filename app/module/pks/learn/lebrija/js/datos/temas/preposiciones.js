/* Tema: preposiciones y regímenes verbales. */
(function () {
  "use strict";

  GV.registrarTema({
    id: "preposiciones",
    titulo: "Preposiciones",
    inicial: "En",
    descripcion: "Influir en, carecer de, insistir en... y el clásico «entre tú y yo». Las preposiciones que se equivocan hasta los doctos.",
    teoria: [
      {
        titulo: "Regímenes verbales frecuentes",
        regla: "Muchos verbos exigen una preposición concreta: influir EN, insistir EN, consistir EN, confiar EN, carecer DE, gozar DE, depender DE, constar DE, soñar CON, casarse CON, amenazar CON.",
        ejemplos: [
          "Ese dato influye en mi decisión ✓",
          "El informe carece de rigor ✓",
          "Anoche soñé con tu pueblo ✓",
          "Amenazó con despedirnos ✓"
        ]
      },
      {
        titulo: "«Entre tú y yo»",
        regla: "Después de «entre» se usan «yo» y «tú», no «mí» ni «ti»: entre tú y yo, entre él y yo. La razón histórica es que «entre» exigía el nominativo en el latín vulgar.",
        ejemplos: [
          "Esto queda entre tú y yo ✓",
          "Esto queda entre tú y mí ✗",
          "Entre ellos y nosotros hay diferencia ✓"
        ]
      },
      {
        titulo: "«A pesar de» y similares",
        regla: "La locución correcta es «a pesar de (que)». La forma «a pesar que», sin «de», se considera coloquial y debe evitarse en la escritura cuidada.",
        ejemplos: [
          "Vino a pesar de la lluvia ✓",
          "Vino a pesar de que llovía ✓",
          "Vino a pesar que llovía ✗ (coloquial)"
        ]
      },
      {
        titulo: "Tratarse de / tratar de",
        regla: "Ambas fórmulas son válidas: «¿de qué trata el libro?» y «¿de qué se trata el libro?». Pero en presente impersonal no se dice «se trata sobre...».",
        ejemplos: [
          "¿De qué se trata la película? ✓",
          "¿De qué trata la película? ✓",
          "La película se trata de... ✗ (sujeto personal + tratarse de: incorrecto)"
        ]
      },
      {
        titulo: "Quedar en / quedar con",
        regla: "«Quedar en» significa acordar o resolver algo (quedamos en seguir negociando). «Quedar con» significa verse con alguien (quedé con Laura).",
        ejemplos: [
          "Quedamos en enviar el informe el lunes ✓ (acordamos)",
          "Quedé con Laura a las cinco ✓ (me vi con ella)",
          "Quedamos de enviar el informe ✗ (uso no normativo)"
        ]
      }
    ],
    ejercicios: [
      {
        tipo: "hueco",
        enunciado: "Ese ruido no influye ___ mi decisión.",
        respuesta: "en",
        regla: "El verbo «influir» rige la preposición «en»: influir en algo/alguien.",
        razon: "Lo que se influye es un ámbito o proceso, y ese valor locativo-metafórico se expresa con «en». «Influir sobre» está desaconsejado y «influir en que» es lo correcto.",
        ejemplos: [
          "El clima influye en el ánimo ✓",
          "Influyó en que lo ascendieran ✓",
          "Influyó sobre el ánimo ✗ (desaconsejado)"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "El informe carece ___ rigor.",
        opciones: ["de", "en"],
        respuesta: "de",
        regla: "El verbo «carecer» rige «de»: carecer de algo.",
        razon: "«Carecer» expresa privación, y la preposición de privación en español es «de»: carece de fondos, carece de sentido.",
        ejemplos: [
          "El plan carece de fundamento ✓",
          "El plan carece en fundamento ✗"
        ]
      },
      {
        tipo: "hueco",
        enunciado: "Quedamos ___ seguir negociando la semana próxima.",
        respuesta: "en",
        regla: "«Quedar en + infinitivo» significa acordar hacer algo.",
        razon: "El acuerdo se expresa con «en»: quedamos en eso → quedamos en seguir negociando. La preposición «de» no corresponde a este verbo en este sentido.",
        ejemplos: [
          "Quedaron en reuniarse el viernes ✓",
          "Quedamos en nada ✓ (no llegamos a un acuerdo)"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: [
          "Esto queda entre tú y yo.",
          "Esto queda entre tú y mí."
        ],
        respuesta: "Esto queda entre tú y yo.",
        regla: "Tras la preposición «entre» se emplean «yo» y «tú».",
        razon: "Aunque en general las preposiciones piden «mí» y «ti» (para mí, de ti), la excepción histórica es «entre», que en el latín de la que procede exigía nominativo: entre tú y yo.",
        ejemplos: [
          "Entre tú y yo lo sabíamos ✓",
          "Entre él y yo no hay rencilla ✓",
          "Entre tú y mí lo sabíamos ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Anoche soñé ___ ti.",
        opciones: ["con", "de"],
        respuesta: "con",
        regla: "El verbo «soñar» rige «con»: soñar con alguien/algo/que...",
        razon: "El soñado aparece en la oración como acompañante de la fantasía, y ese valor de compañía se marca con «con». «Soñar de» no es normativo.",
        ejemplos: [
          "Soñé con que volaba ✓ (también «soñé que volaba»)",
          "Soñé con mi abuela ✓",
          "Soñé de ti ✗"
        ]
      },
      {
        tipo: "hueco",
        enunciado: "Insistió ___ que le devolvieran el dinero.",
        respuesta: "en",
        regla: "El verbo «insistir» rige «en»: insistir en algo/en que...",
        razon: "La insistencia se dirige a un punto concreto, y ese valor de foco se marca con «en»: insistió en eso → insistió en que... «Insistir en que» es lo único correcto.",
        ejemplos: [
          "Insistió en pagar la cuenta ✓",
          "Insistió en que fueran juntos ✓",
          "Insistió de que fueran juntos ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "La reunión consta ___ tres puntos.",
        opciones: ["de", "con"],
        respuesta: "de",
        regla: "El verbo «constar» rige «de»: constar de algo.",
        razon: "«Constar de» significa estar compuesto de; la composición se expresa con «de». «Constar con» no existe.",
        ejemplos: [
          "El examen constará de cinco preguntas ✓",
          "El examen constará con cinco preguntas ✗"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: [
          "Me amenazó con despedirme.",
          "Me amenazó de despedirme."
        ],
        respuesta: "Me amenazó con despedirme.",
        regla: "El verbo «amenazar» rige «con»: amenazar con algo/con que...",
        razon: "Lo amenazante aparece como instrumento o medio, valor que expresa «con»: amenazó con eso → amenazó con despedirme.",
        ejemplos: [
          "Amenazó con ir a la policía ✓",
          "Amenazó de ir a la policía ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "¿Qué fórmula(s) son correctas?",
        opciones: [
          "¿De qué trata la película?",
          "¿De qué se trata la película?",
          "Las dos son correctas."
        ],
        respuesta: "Las dos son correctas.",
        regla: "«Tratar» (sin se) y «tratarse de» (con se) son ambas válidas para preguntar por el asunto de algo.",
        razon: "«¿De qué trata?» y «¿de qué se trata?» son fórmulas equivalentes y correctas. Lo que no es correcto es usar «tratarse de» con sujeto personal: «la película se trata de...».",
        ejemplos: [
          "¿De qué trata el libro? ✓",
          "¿De qué se trata el libro? ✓",
          "El libro se trata de historia ✗"
        ]
      },
      {
        tipo: "hueco",
        enunciado: "No goza ___ buena salud económica.",
        respuesta: "de",
        regla: "El verbo «gozar» rige «de»: gozar de algo.",
        razon: "«Gozar de» significa disfrutar o poseer algo positivo (goza de buena salud, de prestigio). La posesión placentera se marca con «de».",
        ejemplos: [
          "Gozan de mucha influencia ✓",
          "Gozan de buena salud ✓",
          "Gozan mucha influencia ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Confió ___ su instinto.",
        opciones: ["en", "de"],
        respuesta: "en",
        regla: "El verbo «confiar» rige «en»: confiar en alguien/algo.",
        razon: "La confianza se deposita «en» un lugar metafórico: confié en eso → confié en su instinto. «Confiar de» no existe en la norma.",
        ejemplos: [
          "Confío en tu criterio ✓",
          "Confía en que vendrá ✓",
          "Confío de tu criterio ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Lo pasamos muy bien, ___ el calor.",
        opciones: ["a pesar de", "a pesar que"],
        respuesta: "a pesar de",
        regla: "La locución concesiva correcta es «a pesar de» (ante sustantivo) o «a pesar de que» (ante verbo conjugado).",
        razon: "«A pesar que», sin «de», es una forma coloquial censurada en la escritura cuidada; ante sustantivo («el calor») se requiere «a pesar de».",
        ejemplos: [
          "Salimos a pesar de la lluvia ✓",
          "Salimos a pesar de que llovía ✓",
          "Salimos a pesar que llovía ✗ (coloquial)"
        ]
      }
    ]
  });
})();
