/* Tema: participios irregulares y tiempos compuestos. */
(function () {
  "use strict";

  GV.registrarTema({
    id: "participios",
    titulo: "Participios y compuestos",
    inicial: "Pt",
    descripcion: "Abrido, murido, «las he compradas»: tres errores del hablante apurado y la regla que los corrige.",
    teoria: [
      {
        titulo: "Participios irregulares de memoria",
        regla: "Algunos verbos forman el participio de forma irregular y no admiten la terminación -ido/-ado regular: escrito (no *escrido), visto (no *vido), puesto (no *ponido), roto (no *rompido), muerto (no *murido), abierto (no *abrido), hecho, dicho, vuelto, cubierto, descubierto.",
        ejemplos: [
          "He escrito tres páginas ✓",
          "Ha muerto mi tío ✓ (nunca *murido)",
          "¿Has visto las fotos? ✓ (nunca *vido)",
          "El jarrón se ha roto ✓ (nunca *rompido)"
        ]
      },
      {
        titulo: "El participio con haber es invariable",
        regla: "En los tiempos compuestos, el participio no concuerda nunca: «las cartas que he escrito», «las he comprado hoy», «habían llegado». Aunque el objeto sea plural y femenino, el participio acaba en -o.",
        ejemplos: [
          "Las maletas que he hecho son pesadas ✓",
          "Las he comprado hoy ✓ (nunca *compradas)",
          "Habían salido cuando llegamos ✓ (nunca *salidos)"
        ]
      },
      {
        titulo: "Como adjetivo, sí concuerda",
        regla: "Fuera del compuesto, el participio funciona como adjetivo y concuerda en género y número: «las puertas cerradas», «unas cartas escritas a mano», «las tareas hechas».",
        ejemplos: [
          "Las ventanas están abiertas ✓ (adjetivo)",
          "Unas tierras descubiertas hace siglos ✓",
          "Las tareas hechas a tiempo ✓"
        ]
      },
      {
        titulo: "Dobles participios",
        regla: "Algunos verbos tienen dos participios: freír (frito/freído), imprimir (impreso/imprimido), proveer (provisto/proveído). En general se prefiere el irregular: pescado frito, libro impreso.",
        ejemplos: [
          "Los buñuelos están fritos ✓ (preferido)",
          "El contrato está impreso ✓ (preferido)",
          "Freído y imprimido son válidos, pero menos usados"
        ]
      }
    ],
    ejercicios: [
      {
        tipo: "seleccion",
        enunciado: "He ___ la carta dos veces.",
        opciones: ["escrito", "escrido"],
        respuesta: "escrito",
        regla: "El participio de «escribir» es «escrito»; «escrido» no existe.",
        razon: "Como verbo irregular, «escribir» forma el participio del latín: escrito. La terminación regular -ido solo va en verbos regulares (comido, vivido).",
        ejemplos: [
          "He escrito el informe ✓",
          "La carta está escrita ✓ (adjetivo: concuerda)",
          "He escrido ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "¿Ya has ___ las ventanas?",
        opciones: ["abierto", "abrido"],
        respuesta: "abierto",
        regla: "El participio de «abrir» es «abierto»; «abrido» no existe en la norma.",
        razon: "«Abrir» es irregular: abierto, como «cubrir → cubierto» y «descubrir → descubierto». «Abrido» es dialectal y debe evitarse por escrito.",
        ejemplos: [
          "He abierto la tienda ✓",
          "Las tiendas están abiertas ✓",
          "He abrido ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "El jarrón se ha ___.",
        opciones: ["roto", "rompido"],
        respuesta: "roto",
        regla: "El participio de «romper» es «roto»; «rompido» no existe.",
        razon: "«Romper» forma su participio irregular: roto, como «morir → muerto» o «volver → vuelto». No cabe la forma regular.",
        ejemplos: [
          "Se ha roto el vaso ✓",
          "La promesa quedó rota ✓",
          "Se ha rompido ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Mi perro ___ el mes pasado. (ha)",
        opciones: ["ha muerto", "ha murido"],
        respuesta: "ha muerto",
        regla: "El participio de «morir» es «muerto»; «murido» no existe.",
        razon: "«Morir» es irregular: muerto (y adjetivo: «un perro muerto»). «Murido» es un error dialectal frecuente que hay que evitar por escrito.",
        ejemplos: [
          "Ha muerto el abuelo de Marta ✓",
          "Las flores están muertas ✓",
          "Ha murido ✗"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: [
          "Las cartas que he escrito son largas.",
          "Las cartas que he escritas son largas."
        ],
        respuesta: "Las cartas que he escrito son largas.",
        regla: "Con «haber», el participio es invariable: he escrito, sin concordancia.",
        razon: "En los tiempos compuestos, el auxiliar «haber» impide la concordancia: las cartas que he escrito. La concordancia solo aparece en el adjetivo: «escritas a mano».",
        ejemplos: [
          "Las fotos que he tomado ✓",
          "Las fotos tomadas ayer ✓ (adjetivo: sí concuerda)",
          "Las cartas que he escritas ✗"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: [
          "Las he comprado hoy.",
          "Las he compradas hoy."
        ],
        respuesta: "Las he comprado hoy.",
        regla: "El participio con «haber» nunca pluraliza ni cambia de género: comprado.",
        razon: "Aunque el complemento («las» = las frutas) sea femenino plural, el compuesto exige participio en -o: he comprado. Es uno de los errores más sonados del habla apurada.",
        ejemplos: [
          "Las he lavado ✓",
          "Los he visto ✓",
          "Las he compradas ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Las maletas están ___ en el pasillo.",
        opciones: ["puestas", "puesto"],
        respuesta: "puestas",
        regla: "Como adjetivo (con estar/ser), el participio sí concuerda: puestas.",
        razon: "Aquí «puestas» describe el estado de las maletas, no forma un compuesto con haber: por eso concuerda en femenino plural.",
        ejemplos: [
          "Las llaves están puestas ✓",
          "He puesto las llaves ✓ (compuesto: invariable)",
          "Las maletas están puesto ✗"
        ]
      },
      {
        tipo: "hueco",
        enunciado: "El cocinero ya ha ___ los buñuelos. (freír, participio preferido)",
        respuesta: "frito",
        variantes: ["freído"],
        regla: "«Freír» tiene dos participios: frito (preferido) y freído (válido).",
        razon: "La norma prefiere el irregular «frito» (pescado frito, patatas fritas), aunque «freído» no es incorrecto. En la escritura cuidada, «frito» es la apuesta segura.",
        ejemplos: [
          "Ha frito pescado para todos ✓",
          "El pescado está frito ✓",
          "Patatas fritas ✓ (preferido a «freídas»)"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "¿___ las noticias ya?",
        opciones: ["Has visto", "Has vido"],
        respuesta: "Has visto",
        regla: "El participio de «ver» es «visto»; «vido» no existe.",
        razon: "«Ver» es irregular: visto, como «revolver → revuelto» o «resolver → resuelto». «Vido» es solo arcaísmo o error.",
        ejemplos: [
          "He visto esa película tres veces ✓",
          "La situación está vista ✓",
          "Has vido ✗"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: [
          "Habían salido cuando llegamos.",
          "Habían salidos cuando llegamos."
        ],
        respuesta: "Habían salido cuando llegamos.",
        regla: "Con «haber», el participio es invariable incluso con sujeto plural.",
        razon: "El pluscuamperfecto (habían + participio) no admite concordancia: habían salido. La concordancia solo sería posible como adjetivo («los invitados ya salidos»... poco natural).",
        ejemplos: [
          "Habían comido antes de llegar ✓",
          "Los invitados habían salido ✓",
          "Habían salidos ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Tal y como estaba ___ en el contrato.",
        opciones: ["dicho", "decido"],
        respuesta: "dicho",
        regla: "El participio de «decir» es «dicho»; «decido» no existe.",
        razon: "«Decir» forma su participio irregular: dicho, como «hacer → hecho». La forma «decido» es un cruce ilegítimo con «decidir» (decidido).",
        ejemplos: [
          "Lo he dicho mil veces ✓",
          "Según lo dicho en la reunión ✓",
          "Tal y como estaba decido ✗"
        ]
      },
      {
        tipo: "hueco",
        enunciado: "Mis primos ya ___ de vacaciones. (haber + participio de volver)",
        respuesta: "han vuelto",
        regla: "El participio de «volver» es «vuelto»; con haber queda invariable: han vuelto.",
        razon: "«Volver» es irregular: vuelto (como «envolver → envuelto»). El compuesto no concuerda: mis primos han vuelto (no *vueltos).",
        ejemplos: [
          "Han vuelto del viaje ✓",
          "La carta ha vuelto al remitente ✓",
          "Han vueltos ✗"
        ]
      }
    ]
  });
})();
