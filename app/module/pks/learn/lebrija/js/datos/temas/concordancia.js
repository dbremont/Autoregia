/* Tema: concordancia nominal y verbal. */
(function () {
  "use strict";

  GV.registrarTema({
    id: "concordancia",
    titulo: "Concordancia",
    inicial: "C",
    descripcion: "Haber impersonal, sujetos pospuestos, «la mayoría de» y otros casos donde la concordancia se complica.",
    teoria: [
      {
        titulo: "El verbo haber impersonal",
        regla: "Cuando «haber» expresa existencia, es impersonal y va siempre en singular: había, hay, hubo, habrá, ha habido... aunque lo que exista sea plural.",
        ejemplos: [
          "Había mucha gente en la plaza ✓",
          "Hubo problemas graves ✓",
          "Ha habido muchos cambios ✓",
          "Habían mucha gente ✗"
        ]
      },
      {
        titulo: "«Hacer» impersonal de tiempo",
        regla: "En las construcciones de tiempo «hace dos años», «hacía siglos que...», el verbo hacer es impersonal y va siempre en singular e invariable. El verbo de la oración principal sí concuerda con su sujeto.",
        ejemplos: [
          "Hace tres años que vivo aquí ✓ (nunca «hacen»)",
          "Hacía años que no la veía ✓",
          "Hacían dos años que no la veía ✗"
        ]
      },
      {
        titulo: "Sujeto pospuesto",
        regla: "Cuando el sujeto va después del verbo, el verbo concuerda con él en número: «faltan dos páginas», «llegaron los paquetes».",
        ejemplos: [
          "Faltan dos días para las vacaciones ✓",
          "Falta dos días ✗",
          "Quedan tres entradas ✓"
        ]
      },
      {
        titulo: "«La mayoría de» y cuantificadores",
        regla: "«La mayoría de + plural» prefiere el verbo en plural («la mayoría de los alumnos han aprobado»). Sin complemento, va en singular («la mayoría opina»). Con «medio millón de + plural», el verbo concuerda mejor con el sustantivo plural.",
        ejemplos: [
          "La mayoría de los invitados llegaron tarde ✓",
          "La mayoría opina lo contrario ✓ (sin complemento: singular)",
          "Medio millón de personas asistieron ✓ (mejor que «asistió»)"
        ]
      },
      {
        titulo: "Partitivos y medidas",
        regla: "«Medio» concuerda: media hora, un día y medio, dos horas y media. Ante un número, «medio» es invariable: medio millón, medio ciento.",
        ejemplos: [
          "Esperamos media hora ✓",
          "Dos horas y media ✓ (nunca «medios»)",
          "Medio millón de habitantes ✓ (nunca «medio millones»)"
        ]
      }
    ],
    ejercicios: [
      {
        tipo: "seleccion",
        enunciado: "___ mucha gente en la plaza.",
        opciones: ["Había", "Habían"],
        respuesta: "Había",
        regla: "El verbo «haber» con sentido de existencia es impersonal y va siempre en singular.",
        razon: "Aunque «gente» es plural en intención, el sujeto de la impersonal no existe: «haber» no concuerda con lo que existe. Decir «habían» es uno de los errores más comunes del español.",
        ejemplos: [
          "Había diez personas ✓",
          "Habían diez personas ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "___ muchos cambios este año.",
        opciones: ["Ha habido", "Han habido"],
        respuesta: "Ha habido",
        regla: "También en tiempos compuestos, el «haber» impersonal es invariable: ha habido, había habido, habrá habido.",
        razon: "El auxiliar «haber» de la construcción impersonal nunca pluraliza, aunque el participio vaya seguido de un complemento plural.",
        ejemplos: [
          "Ha habido accidentes ✓",
          "Han habido accidentes ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Hacía dos años que no nos ___.",
        opciones: ["veíamos", "veía", "verían"],
        respuesta: "veíamos",
        regla: "«Hacer» es impersonal (hacía, invariable), pero el verbo principal concuerda con su sujeto real.",
        razon: "El sujeto de «ver» es «nosotros» (no nos veíamos), así que el verbo va en plural: veíamos. El impersonal «hacía» permanece en singular.",
        ejemplos: [
          "Hacía años que no nos veíamos ✓",
          "Hacían años que no nos veíamos ✗ (el «hacer» no pluraliza)"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: ["Faltan dos páginas.", "Falta dos páginas."],
        respuesta: "Faltan dos páginas.",
        regla: "Con el sujeto pospuesto, el verbo concuerda en número con él.",
        razon: "El sujeto es «dos páginas» (plural): faltan. La forma singular («falta») es un error de concordancia frecuente en el habla coloquial.",
        ejemplos: [
          "Quedan cinco minutos ✓",
          "Queda cinco minutos ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "La mayoría de los alumnos ___ aprobado.",
        opciones: ["han", "ha"],
        respuesta: "han",
        regla: "«La mayoría de + sustantivo plural» prefiere el verbo en plural.",
        razon: "Cuando «la mayoría» lleva un complemento explícito en plural, la concordancia con ese sustantivo (los alumnos) es la opción preferida en la norma culta.",
        ejemplos: [
          "La mayoría de los estudiantes han venido ✓",
          "La mayoría opina en silencio ✓ (sin complemento: singular)"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "___ una hora y media de retraso.",
        opciones: ["Había", "Habían"],
        respuesta: "Había",
        regla: "El «haber» impersonal es singular incluso cuando se menciona una cantidad en plural.",
        razon: "La existencia se expresa siempre con el singular: había. La cantidad («una hora y media») es solo el complemento, no el sujeto.",
        ejemplos: [
          "Había diez minutos de diferencia ✓",
          "Habían diez minutos de diferencia ✗"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál es la forma preferida en la norma culta?",
        opciones: [
          "Medio millón de personas asistieron.",
          "Medio millón de personas asistió."
        ],
        respuesta: "Medio millón de personas asistieron.",
        regla: "Con «medio millón de + sustantivo plural», el verbo concuerda preferentemente con ese sustantivo plural.",
        razon: "Aunque «medio millón» es gramaticalmente singular, el complemento «personas» designa un colectivo animado en plural, y con él la norma culta prefiere el verbo en plural («asistieron»).",
        ejemplos: [
          "Medio millón de estudiantes manifestaron ✓ (preferida)",
          "Medio millón de estudiantes manifestó ✗ (menos adecuada)"
        ]
      },
      {
        tipo: "hueco",
        enunciado: "Dos horas y ___ estuvimos esperando.",
        respuesta: "media",
        regla: "«Medio/media» concuerda en género con el sustantivo: media hora, medio día, dos horas y media.",
        razon: "«Hora» es femenino, así que la forma correcta es «media». En «un día y medio» sería «medio» porque «día» es masculino.",
        ejemplos: [
          "Un año y medio ✓",
          "Dos horas y medios ✗",
          "Mediadocena ✓ (escrito junto, forma especial)"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "El equipo ___ ganado el título.",
        opciones: ["ha", "han"],
        respuesta: "ha",
        regla: "Los sustantivos colectivos (equipo, gobierno, familia) concuerdan preferentemente en singular.",
        razon: "«El equipo» es gramaticalmente singular, aunque designe a varias personas. La norma culta prefiere el singular; el plural solo se admite en contextos muy marcados.",
        ejemplos: [
          "El equipo ha entrenado bien ✓",
          "El equipo han entrenado bien ✗"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: ["Nos faltan datos.", "Nos falta datos."],
        respuesta: "Nos faltan datos.",
        regla: "Con «faltar» y sujeto plural pospuesto, el verbo va en plural.",
        razon: "El sujeto es «datos» (plural): faltan. La concordancia con el complemento «nos» no decide el número del verbo.",
        ejemplos: [
          "Me faltan las llaves ✓",
          "Me falta las llaves ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "¿___ suficientes sillas para todos?",
        opciones: ["Hay", "Han"],
        respuesta: "Hay",
        regla: "La forma correcta del impersonal «haber» en presente es «hay»; «han» es la tercera persona del plural del auxiliar, no sirve para expresar existencia.",
        razon: "Confundir «hay» y «han» es muy común en algunas regiones. Para preguntar o afirmar que algo existe, siempre «hay»: hay sillas, ¿hay sillas?",
        ejemplos: [
          "Hay problemas ✓",
          "Han problemas ✗",
          "Han llegado los problemas ✓ (aquí sí: haber auxiliar de «llegar»)"
        ]
      },
      {
        tipo: "hueco",
        enunciado: "___ tres años que estudio en esta ciudad.",
        respuesta: "Hace",
        regla: "En las fórmulas de tiempo, «hacer» es impersonal e invariable: hace X años que...",
        razon: "Aunque los años sean varios, el verbo no pluraliza: hace (nunca «hacen»). Es un resto del impersonal de tiempo.",
        ejemplos: [
          "Hace diez años que no la veo ✓",
          "Hacen diez años que no la veo ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "¿Qué error tiene la oración «Habían muchas personas esperando»?",
        opciones: ["Concordancia del verbo haber", "Gerundio incorrecto", "Ninguno: es correcta"],
        respuesta: "Concordancia del verbo haber",
        regla: "El «haber» existencial es siempre singular: había muchas personas.",
        razon: "El plural «habían» concuerda indebidamente con «personas»; el impersonal no tiene sujeto con quien concordar. (El gerundio «esperando», en cambio, sí es correcto aquí: expresa acción simultánea.)",
        ejemplos: [
          "Había muchas personas esperando ✓",
          "Habían muchas personas esperando ✗"
        ]
      }
    ]
  });
})();
