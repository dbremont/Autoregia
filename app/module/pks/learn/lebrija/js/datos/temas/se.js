/* Tema: construcciones con SE (pasiva refleja, impersonal, se accidental). */
(function () {
  "use strict";

  GV.registrarTema({
    id: "se",
    titulo: "Construcciones con SE",
    inicial: "Se",
    descripcion: "«Se vende casas» frente a «se venden casas»: el pequeño pronombre que decide si la frase es culta o no.",
    teoria: [
      {
        titulo: "Pasiva refleja: concordancia obligatoria",
        regla: "En la pasiva refleja («se + verbo + sujeto paciente»), el verbo concuerda con lo vendido, alquilado o buscado: se venden casas, se alquilan pisos, se buscan cajeras. Singular solo si el paciente es singular: se vende la casa.",
        ejemplos: [
          "Se venden coches usados ✓",
          "Se alquilan habitaciones ✓",
          "Se vende coches usados ✗"
        ]
      },
      {
        titulo: "Impersonal: siempre singular",
        regla: "En la impersonal («se + verbo», sin sujeto), el verbo va en singular aunque el sentido sea plural: «se vende de todo», «se puede entrar», «se vive bien aquí».",
        ejemplos: [
          "Aquí se vive tranquilo ✓",
          "En la agenda se apunta de todo ✓",
          "Se puede pedir más información ✓"
        ]
      },
      {
        titulo: "¿Pasiva refleja o impersonal? El truco del plural",
        regla: "Con paciente plural, la norma culta prefiere la pasiva refleja con concordancia: «se venden flores» (las flores son vendidas). La forma singular «se vende flores» se interpreta como impersonal coloquial y se evita por escrito.",
        ejemplos: [
          "Se necesitan voluntarios ✓ (pasiva refleja)",
          "Se necesita voluntarios ✗ (coloquial)",
          "Se necesita paciencia ✓ (singular: correcto)"
        ]
      },
      {
        titulo: "El «se» accidental (involuntario)",
        regla: "Para eventos no deseados o accidentales, el español combina se + me/te/le/nos/os/les + verbo: «se me cayó», «se nos olvidó», «se le rompió». El que sufre el accidente aparece como me/te/le..., no como sujeto.",
        ejemplos: [
          "Se me cayó el móvil ✓ (nunca «me caí el móvil»)",
          "Se nos dañó la computadora ✓",
          "Se les quemó el pan ✓"
        ]
      }
    ],
    ejercicios: [
      {
        tipo: "seleccion",
        enunciado: "___ casas en la avenida principal.",
        opciones: ["Se venden", "Se vende"],
        respuesta: "Se venden",
        regla: "En la pasiva refleja, el verbo concuerda con el paciente plural: se venden casas.",
        razon: "«Casas» es el sujeto paciente (las casas son vendidas); el verbo debe ir en plural. «Se vende casas» es la versión coloquial que la norma culta evita.",
        ejemplos: [
          "Se venden motos ✓",
          "Se vende una moto ✓ (singular: concuerda)",
          "Se vende motos ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "___ pisos de dos habitaciones.",
        opciones: ["Se alquilan", "Se alquila"],
        respuesta: "Se alquilan",
        regla: "Con paciente plural, la pasiva refleja exige plural: se alquilan pisos.",
        razon: "El paciente («pisos») manda la concordancia del verbo. Es uno de los carteles más erróneos de las ciudades: «se alquila pisos» ✗.",
        ejemplos: [
          "Se alquilan bicicletas por horas ✓",
          "Se alquila bicicleta ✓ (singular, también válido)",
          "Se alquila bicicletas ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "___ la casa de tus sueños.",
        opciones: ["Se vende", "Se venden"],
        respuesta: "Se vende",
        regla: "Con paciente singular, el verbo va en singular: se vende la casa.",
        razon: "La concordancia funciona en ambos sentidos: paciente singular → singular. El error solo aparece cuando el paciente es plural.",
        ejemplos: [
          "Se vende un apartamento luminoso ✓",
          "Se busca administrativo ✓",
          "Se venden la casa ✗"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta en la norma culta?",
        opciones: [
          "Se venden coches usados.",
          "Se vende coches usados."
        ],
        respuesta: "Se venden coches usados.",
        regla: "La pasiva refleja con paciente plural lleva verbo en plural.",
        razon: "«Coches usados» es el sujeto de la pasiva refleja; el verbo se adapta: se venden. La forma singular se considera coloquial.",
        ejemplos: [
          "Se aceptan donativos ✓",
          "Se hacen arreglos ✓",
          "Se hace arreglos ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Aquí ___ muy bien.",
        opciones: ["se vive", "se viven"],
        respuesta: "se vive",
        regla: "La impersonal («se + verbo» sin sujeto) va siempre en singular.",
        razon: "En «se vive bien» no hay paciente que concuerde: es una impersonal. Aunque el sentido sea «la gente vive bien», el verbo queda en singular.",
        ejemplos: [
          "Se trabaja con gusto ✓",
          "Se cena tarde en España ✓",
          "Aquí se viven bien ✗"
        ]
      },
      {
        tipo: "hueco",
        enunciado: "___ olvidó la cita y llegué tarde. (se accidental, primera persona)",
        respuesta: "se me",
        regla: "El se accidental combina se + me/te/le/nos: se me olvidó.",
        razon: "El olvidar no es voluntario: el español lo expresa con el pronombre de interés (me) y el se accidental. «Me olvidé la cita» es válido en América, pero «se me olvidó» es la fórmula panhispánica culta.",
        ejemplos: [
          "Se me olvidaron las llaves ✓",
          "Se te quedó el paraguas ✓",
          "Olvidé la cita (correcto, sin matiz accidental)"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Ayer ___ rompió mi taza favorita.",
        opciones: ["se me", "me"],
        respuesta: "se me",
        regla: "Para eventos accidentales, la fórmula culta es se + pronombre: se me rompió.",
        razon: "«Me rompió mi taza» sugeriría que alguien la rompió a propósito sobre mí. El matiz involuntario se marca con «se»: se me rompió (sin querer).",
        ejemplos: [
          "Se le manchó la camisa ✓",
          "Se nos paró el reloj ✓",
          "Ayer me rompió mi taza ✗ (sentido distinto)"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: [
          "Se nos dañó la computadora.",
          "Se nos dañó las computadoras."
        ],
        respuesta: "Se nos dañó la computadora.",
        regla: "En el se accidental, el verbo concuerda con la cosa afectada, no con el pronombre.",
        razon: "El sujeto es «la computadora» (singular): se dañó. Si el paciente fuera plural: «se nos dañaron las computadoras». Mezclar singular y plural es discordancia.",
        ejemplos: [
          "Se me rompieron los lentes ✓ (plural: rompieron)",
          "Se le olvidó la reunión ✓ (singular: olvidó)",
          "Se nos dañó las computadoras ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "___ hablar varios idiomas es una ventaja.",
        opciones: ["Se puede", "Se pueden"],
        respuesta: "Se puede",
        regla: "«Se puede + infinitivo» es impersonal: siempre singular.",
        razon: "El infinitivo («hablar») no es un paciente concordable: la construcción es impersonal. «Se pueden hablar idiomas» mezcla los dos patrones y es incorrecto.",
        ejemplos: [
          "Se puede entrar por aquí ✓",
          "Se pueden comprar entradas ✓ (pasiva refleja con paciente plural)",
          "Se pueden hablar idiomas ✗"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta en la norma culta?",
        opciones: [
          "Se necesitan voluntarios.",
          "Se necesita voluntarios."
        ],
        respuesta: "Se necesitan voluntarios.",
        regla: "Con paciente plural, la pasiva refleja concuerda: se necesitan.",
        razon: "«Voluntarios» es el sujeto paciente. La forma «se necesita voluntarios» mezcla impersonal (singular) con paciente plural, y la norma la evita.",
        ejemplos: [
          "Se necesitan fondos urgentemente ✓",
          "Se necesita ayuda ✓ (singular: correcto)",
          "Se necesita voluntarios ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "___ pasos en el pasillo.",
        opciones: ["Se escuchan", "Se escucha"],
        respuesta: "Se escuchan",
        regla: "«Pasos» es el paciente plural de la pasiva refleja: se escuchan pasos.",
        razon: "El verbo concuerda con lo que se oye (los pasos): se escuchan. Con «se escucha pasos» la oración queda coloquial.",
        ejemplos: [
          "Se oyen campanas a lo lejos ✓",
          "Se oye música ✓ (singular)",
          "Se escucha pasos ✗"
        ]
      },
      {
        tipo: "hueco",
        enunciado: "___ perdió el autobús por tu culpa. (se accidental, a nosotros)",
        respuesta: "se nos",
        regla: "El se accidental usa los pronombres me/te/le/nos/os/les: se nos perdió.",
        razon: "El perjuicio recae sobre nosotros («nos») y el evento es involuntario («se»): se nos perdió el autobús. Es la fórmula panhispánica culta.",
        ejemplos: [
          "Se nos acabó el tiempo ✓",
          "Se les escapó el gato ✓",
          "Se nos perdieron las llaves ✓ (plural: perdieron)"
        ]
      }
    ]
  });
})();
