/* Tema: estilo indirecto. */
(function () {
  "use strict";

  GV.registrarTema({
    id: "estilo-indirecto",
    titulo: "Estilo indirecto",
    inicial: "Ei",
    descripcion: "«Me preguntó que dónde iba»: el error más sonoro del español hablado y las reglas para contarlo bien.",
    teoria: [
      {
        titulo: "Preguntar no lleva «que»",
        regla: "El verbo preguntar introduce la pregunta indirecta directamente: «Me preguntó dónde vivía». La fórmula «me preguntó que dónde...» es un error muy extendido. Para las preguntas de sí/no, se usa «si»: «me preguntó si quería ir».",
        ejemplos: [
          "Me preguntó cuántos años tenía ✓",
          "Me preguntó si cerraría la ventana ✓",
          "Me preguntó que dónde vivía ✗"
        ]
      },
      {
        titulo: "Concordancia de tiempos",
        regla: "Al pasar al estilo indirecto, los tiempos retroceden un paso: «vendré» → dijo que vendría; «estoy cansado» → dijo que estaba cansado; «he perdido» → dijo que había perdido.",
        ejemplos: [
          "«Terminaré mañana» → Dijo que terminaría al día siguiente ✓",
          "«No tengo hambre» → Dijo que no tenía hambre ✓",
          "«Iré» → Dijo que irá ✗ (si el verbo introductor está en pasado)"
        ]
      },
      {
        titulo: "Órdenes y peticiones",
        regla: "Los imperativos se transforman en subjuntivo imperfecto tras pedir/mandar/rogar: «Siéntate» → me pidió que me sentara; «No llegues tarde» → me mandó que no llegara tarde.",
        ejemplos: [
          "«Ven conmigo» → Me pidió que fuera con él ✓",
          "«Escucha» → Me rogó que escuchara ✓",
          "Me pidió que te sientas ✗ (en pasado introductor)"
        ]
      },
      {
        titulo: "Persona, lugar y tiempo se ajustan",
        regla: "Los deícticos cambian de perspectiva: yo → él/ella, aquí → allí, hoy → aquel día, mañana → al día siguiente, ayer → el día anterior. «Dijo que iría allí al día siguiente» ✓ frente a «dijo que irá aquí mañana» ✗.",
        ejemplos: [
          "«Vengo aquí hoy» → Dijo que iba allí aquel día ✓",
          "«Ayer llegué» → Contó que había llegado el día anterior ✓",
          "Dijo que vendrá aquí mañana ✗ (quedándose en directo)"
        ]
      }
    ],
    ejercicios: [
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: [
          "Me preguntó dónde vivía.",
          "Me preguntó que dónde vivía."
        ],
        respuesta: "Me preguntó dónde vivía.",
        regla: "El verbo preguntar no lleva «que» ante la pregunta indirecta.",
        razon: "«Preguntar» introduce la subordinada directamente: preguntó dónde, cuándo, por qué... El «que» sobrante («me preguntó que dónde») es uno de los errores más frecuentes del español hablado.",
        ejemplos: [
          "Preguntó a qué hora abría ✓",
          "Nos preguntó si veníamos ✓",
          "Me preguntó que dónde vivía ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Me preguntó ___ quería ir con ellos.",
        opciones: ["si", "que"],
        respuesta: "si",
        regla: "Las preguntas de sí/no pasan al estilo indirecto con «si»: preguntó si...",
        razon: "Cuando la pregunta original es cerrada («¿quieres ir?»), el estilo indirecto usa «si»: me preguntó si quería ir. El «que» no sirve aquí.",
        ejemplos: [
          "Preguntó si había sitio ✓",
          "Me preguntó si hacía frío fuera ✓",
          "Me preguntó que quería ir ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "«Os entregaré el informe mañana» → Dijo que nos ___ el informe al día siguiente.",
        opciones: ["entregaría", "entrega"],
        respuesta: "entregaría",
        regla: "Futuro en estilo directo → condicional en indirecto con verbo introductor en pasado.",
        razon: "El retroceso de tiempos convierte «entregaré» en «entregaría», y «mañana» en «al día siguiente». Mantener el futuro («entrega») rompe la concordancia con «dijo».",
        ejemplos: [
          "Dijo que llegaría tarde ✓",
          "Contó que lo harían pronto ✓",
          "Dijo que nos entrega mañana ✗"
        ]
      },
      {
        tipo: "hueco",
        enunciado: "«Estoy cansado», dijo. → Dijo que ___ cansado.",
        respuesta: "estaba",
        regla: "Presente en estilo directo → imperfecto en estilo indirecto con verbo en pasado.",
        razon: "El presente de «estoy» retrocede a imperfecto tras «dijo»: estaba. El resto de la frase ya está adaptado, así que el verbo también debe adaptarse.",
        ejemplos: [
          "«Tengo frío» → Dijo que tenía frío ✓",
          "«Vamos tarde» → Dijo que íbamos tarde ✓",
          "Dijo que estoy cansado ✗ (si «dijo» está en pasado)"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "«¿Me acompañas?» → ¿Cuál transformación es correcta?",
        opciones: [
          "Me pidió que la acompañara.",
          "Me pidió que la acompaño."
        ],
        respuesta: "Me pidió que la acompañara.",
        regla: "Tras «pedir que» con verbo introductor en pasado, el verbo va en subjuntivo imperfecto.",
        razon: "La petición se subordina con «que + subjuntivo», y el pasado del introductor arrastra el imperfecto: acompañara. El presente «acompaño» queda anclado en el presente.",
        ejemplos: [
          "Me pidió que la ayudara ✓",
          "Nos rogó que volviéramos ✓",
          "Me pidió que la acompaño ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "«No llegues tarde» → Me pidió que no ___ tarde.",
        opciones: ["llegara", "llegue"],
        respuesta: "llegara",
        regla: "El imperativo negativo se transforma en imperfecto de subjuntivo: que no llegara.",
        razon: "Las órdenes pasan al indirecto con «que + subjuntivo»; con introductor en pasado, imperfecto: llegara. El presente de subjuntivo «llegue» corresponde a un introductor en presente («me pide que no llegue»).",
        ejemplos: [
          "Me mandó que no fumara allí ✓",
          "Me pide que no fume ✓ (introductor en presente)",
          "Me pidió que no llegue ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "«¿Dónde compras la fruta?» → Me preguntó dónde ___ la fruta.",
        opciones: ["compraba", "compro"],
        respuesta: "compraba",
        regla: "Presente interrogativo → imperfecto en el indirecto: preguntó dónde compraba.",
        razon: "Tras un introductor en pasado, el presente del directo retrocede a imperfecto: compro → compraba. La pregunta indirecta no lleva «que» ni tilde en «dónde»... ¡ojo!: sí lleva tilde, pues sigue siendo interrogativa indirecta.",
        ejemplos: [
          "Me preguntó cuánto costaba ✓",
          "Preguntó cuándo cerraban ✓",
          "Me preguntó dónde compro ✗"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál transformación de «Iré allí mañana» es la correcta?",
        opciones: [
          "Dijo que iría allí al día siguiente.",
          "Dijo que irá aquí mañana."
        ],
        respuesta: "Dijo que iría allí al día siguiente.",
        regla: "Al pasar al indirecto cambian el tiempo verbal y los deícticos: allí (no aquí), al día siguiente (no mañana).",
        razon: "El hablante se sitúa en otro momento y otro lugar: futuro → condicional, aquí → allí, mañana → al día siguiente. Dejar «aquí» y «mañana» es quedarse a medias en estilo directo.",
        ejemplos: [
          "Dijo que vendría aquella tarde ✓",
          "Contó que lo haría allí mismo ✓",
          "Dijo que irá aquí mañana ✗"
        ]
      },
      {
        tipo: "hueco",
        enunciado: "«Ven conmigo» → Me pidió que ___ con él. (ir, imperfecto de subjuntivo)",
        respuesta: "fuera",
        variantes: ["fuese"],
        regla: "El imperativo «ven» se transforma en «que fuera/fuese» tras pedir/rogar en pasado.",
        razon: "El verbo ir tiene dos imperfectos de subjuntivo equivalentes: fuera y fuese. Ambos son correctos; la forma «ven» no puede mantenerse tras el introductor en pasado.",
        ejemplos: [
          "Me pidió que fuera con él ✓",
          "Me pidió que fuese con él ✓ (equivalente)",
          "Me pidió que voy con él ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "«¡Cierra la puerta!» → Me mandó que ___ la puerta.",
        opciones: ["cerrara", "cierro"],
        respuesta: "cerrara",
        regla: "La orden directa pasa a «mandar que + subjuntivo imperfecto»: cerrara.",
        razon: "Con introductor en pasado («mandó»), el subjuntivo se retrotrae: cerrara. El presente «cierro» ni siquiera es subjuntivo.",
        ejemplos: [
          "Me ordenó que saliera ✓",
          "Nos pidió que esperáramos ✓",
          "Me mandó que cierro ✗"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: [
          "Preguntó cuánto costaba la entrada.",
          "Preguntó que cuánto costaba la entrada."
        ],
        respuesta: "Preguntó cuánto costaba la entrada.",
        regla: "Preguntar + interrogativo indirecto, sin «que»: preguntó cuánto...",
        razon: "Como con «dónde» o «cómo», el «que» es siempre sobrante tras preguntar. El interrogativo («cuánto») introduce la subordinada directamente.",
        ejemplos: [
          "Preguntó cuántos éramos ✓",
          "Me preguntó por qué llegaba tan tarde ✓",
          "Preguntó que cuánto costaba ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "«He perdido las llaves» → Dijo que ___ las llaves.",
        opciones: ["había perdido", "perdería"],
        respuesta: "había perdido",
        regla: "El pretérito perfecto («he perdido») retrocede a pluscuamperfecto: había perdido.",
        razon: "Con introductor en pasado, «he perdido» (perfecto) pasa a «había perdido» (pluscuamperfecto). El condicional «perdería» transformaría la pérdida en algo futuro.",
        ejemplos: [
          "Dijo que había comido ✓",
          "Contó que había visto la noticia ✓",
          "Dijo que perdería las llaves ✗ (cambia el sentido)"
        ]
      }
    ]
  });
})();
