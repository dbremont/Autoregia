/* Tema: queísmo y dequeísmo. */
(function () {
  "use strict";

  GV.registrarTema({
    id: "dequeismo",
    titulo: "Queísmo y dequeísmo",
    inicial: "De",
    descripcion: "La preposición de que todos olvidan y la de que todos añaden de más. Dos errores gemelos muy frecuentes.",
    teoria: [
      {
        titulo: "Dos errores opuestos",
        regla: "El queísmo consiste en omitir la preposición «de» que exige la palabra anterior («estoy seguro que» → «estoy seguro de que»). El dequeísmo es lo contrario: añadir «de» donde no corresponde («pienso de que» → «pienso que»).",
        ejemplos: [
          "Queísmo: Me di cuenta que llegaba tarde ✗ → Me di cuenta de que llegaba tarde ✓",
          "Dequeísmo: Pienso de que tienes razón ✗ → Pienso que tienes razón ✓"
        ]
      },
      {
        titulo: "Palabras que exigen «de»",
        regla: "Piden «de que» los verbos pronominales y locuciones como darse cuenta de, acordarse de, alegrarse de, asegurarse de, quejarse de; expresiones como no cabe duda de, es señal de, depende de; y adjetivos como seguro de, consciente de, convencido de, responsable de.",
        ejemplos: [
          "No cabe duda de que saldrá bien ✓",
          "Me alegro de que hayas venido ✓",
          "Estoy convencido de que es verdad ✓",
          "El resultado depende de que todos votemos ✓"
        ]
      },
      {
        titulo: "Palabras que no llevan «de»",
        regla: "No llevan «de» los verbos pensar, creer, decir, saber, esperar, entender, opinar, recordar (con CD: «recuerdo que»), resultar, ocurrir, entre otros.",
        ejemplos: [
          "Opino que la medida es injusta ✓",
          "Resulta que no venía ✓",
          "Recuerdo que me lo prometiste ✓",
          "Pienso de que tienes razón ✗"
        ]
      },
      {
        titulo: "El truco del «eso»",
        regla: "Sustituye la subordinada por «eso»: si la oración funciona con «de eso», lleva «de» (me di cuenta de eso); si funciona sin preposición (pienso eso), no la lleva.",
        ejemplos: [
          "Me di cuenta (de eso) ✓ → con «de»",
          "Pienso (eso) ✓ → sin «de»",
          "Estoy seguro (de eso) ✓ → con «de»"
        ]
      }
    ],
    ejercicios: [
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: [
          "Me di cuenta de que había llegado tarde.",
          "Me di cuenta que había llegado tarde."
        ],
        respuesta: "Me di cuenta de que había llegado tarde.",
        regla: "«Darse cuenta» rige la preposición «de»: darse cuenta de que...",
        razon: "El truco del «eso» lo confirma: «me di cuenta de eso» funciona, pero «me di cuenta eso» no. Omitir la «de» es queísmo.",
        ejemplos: [
          "Se dio cuenta de que lo vigilaban ✓",
          "Se dio cuenta que lo vigilaban ✗ (queísmo)"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: [
          "Pienso que tienes razón.",
          "Pienso de que tienes razón."
        ],
        respuesta: "Pienso que tienes razón.",
        regla: "El verbo «pensar» (en el sentido de opinar) no lleva preposición ante «que».",
        razon: "«Pienso eso» funciona sin preposición; añadir «de» produce dequeísmo, uno de los errores más censurados en el habla culta.",
        ejemplos: [
          "Creo que vendrá ✓",
          "Creo de que vendrá ✗ (dequeísmo)"
        ]
      },
      {
        tipo: "hueco",
        enunciado: "No cabe duda ___ que el proyecto saldrá adelante.",
        respuesta: "de",
        regla: "La locución «no cabe duda» exige la preposición «de» ante la conjunción «que».",
        razon: "La duda es «de» algo: no cabe duda de eso → no cabe duda de que... Omitir la «de» sería queísmo.",
        ejemplos: [
          "No cabe duda de que es el mejor ✓",
          "No cabe duda que es el mejor ✗ (queísmo)"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Elige la forma correcta:",
        opciones: ["depende de que lleguemos", "depende que lleguemos"],
        respuesta: "depende de que lleguemos",
        regla: "El verbo «depender» rige «de»: depender de que...",
        razon: "Algo depende «de» una causa: depende de eso → depende de que lleguemos. La forma sin «de» es queísmo.",
        ejemplos: [
          "Todo depende de que haga sol ✓",
          "Todo depende que haga sol ✗ (queísmo)"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: [
          "Estoy seguro de que vendrá.",
          "Estoy seguro que vendrá."
        ],
        respuesta: "Estoy seguro de que vendrá.",
        regla: "El adjetivo «seguro» (y también convencido, consciente, responsable, capaz...) rige «de» ante la subordinada.",
        razon: "Se está seguro «de» algo: estoy seguro de eso → estoy seguro de que vendrá. La forma sin «de» es queísmo, muy extendida incluso en el habla culta.",
        ejemplos: [
          "Estaba convencido de que ganaría ✓",
          "Estaba convencido que ganaría ✗ (queísmo)"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: [
          "Opino que la medida es injusta.",
          "Opino de que la medida es injusta."
        ],
        respuesta: "Opino que la medida es injusta.",
        regla: "El verbo «opinar» no lleva «de» ante «que».",
        razon: "«Opino eso» funciona sin preposición; el añadido de «de» constituye dequeísmo.",
        ejemplos: [
          "Opino que deberíamos esperar ✓",
          "Opino de que deberíamos esperar ✗ (dequeísmo)"
        ]
      },
      {
        tipo: "hueco",
        enunciado: "Me alegro ___ que hayas venido.",
        respuesta: "de",
        regla: "El verbo «alegrarse» rige «de»: alegrarse de que...",
        razon: "Uno se alegra «de» una causa: me alegro de eso → me alegro de que hayas venido. Es queísmo omitir la «de».",
        ejemplos: [
          "Se alegró de que la llamaran ✓",
          "Se alegró que la llamaran ✗ (queísmo)"
        ]
      },
      {
        tipo: "hueco",
        enunciado: "Me aseguré ___ que cerrara la puerta antes de salir.",
        respuesta: "de",
        regla: "El verbo «asegurarse» rige «de»: asegurarse de que...",
        razon: "Uno se asegura «de» algo: me aseguré de eso → me aseguré de que cerrara. Omitir la preposición es queísmo.",
        ejemplos: [
          "Asegúrate de que está todo apagado ✓",
          "Asegúrate que está todo apagado ✗ (queísmo)"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Qué oración(s) son correctas?",
        opciones: [
          "El informe advierte de que hay riesgos.",
          "El informe advierte que hay riesgos.",
          "Las dos son correctas."
        ],
        respuesta: "Las dos son correctas.",
        regla: "El verbo «advertir» admite dos construcciones: advertir de que (con la preposición, tradicional) y advertir que (con complemento directo, hoy también válida).",
        razon: "La RAE acepta ambas: «advertir de algo a alguien» y «advertir algo a alguien». Es un caso especial: no es dequeísmo usar la «de» con este verbo.",
        ejemplos: [
          "Le advirtieron de que el camino era peligroso ✓",
          "Le advirtieron que el camino era peligroso ✓"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: [
          "Resulta que no venía.",
          "Resulta de que no venía."
        ],
        respuesta: "Resulta que no venía.",
        regla: "La locución «resulta que» no lleva preposición.",
        razon: "«Resultar» introduce la subordinada directamente: resulta eso → resulta que no venía. El añadido de «de» es dequeísmo, frecuente en el registro coloquial.",
        ejemplos: [
          "Resulta que ya se había ido ✓",
          "Resulta de que ya se había ido ✗ (dequeísmo)"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "En la oración «Estoy convencido que es verdad», ¿qué error hay?",
        opciones: ["Queísmo (falta una «de»)", "Dequeísmo (sobra una «de»)", "Ninguno"],
        respuesta: "Queísmo (falta una «de»)",
        regla: "El adjetivo «convencido» rige «de»: convencido de que...",
        razon: "La forma correcta es «estoy convencido de que es verdad». Omitir la preposición exigida es precisamente queísmo.",
        ejemplos: [
          "Estoy convencido de que es verdad ✓",
          "Estoy convencido que es verdad ✗ (queísmo)"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "En la oración «Concluyó de que había un error», ¿qué error hay?",
        opciones: ["Dequeísmo (sobra una «de»)", "Queísmo (falta una «de»)", "Ninguno"],
        respuesta: "Dequeísmo (sobra una «de»)",
        regla: "El verbo «concluir» no lleva «de» ante «que»: concluyó que...",
        razon: "«Concluyó eso» funciona sin preposición, así que la «de» está de más: es dequeísmo. La forma correcta es «concluyó que había un error».",
        ejemplos: [
          "Concluyó que había un error ✓",
          "Concluyó de que había un error ✗ (dequeísmo)"
        ]
      }
    ]
  });
})();
