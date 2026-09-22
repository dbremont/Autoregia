/* Tema: uso de mayúsculas. */
(function () {
  "use strict";

  GV.registrarTema({
    id: "mayusculas",
    titulo: "Mayúsculas",
    inicial: "M",
    descripcion: "Días, meses, calles, títulos de libros: la lista de las mayúsculas que sobran en el español bien escrito.",
    teoria: [
      {
        titulo: "Siempre en minúscula",
        regla: "Los días de la semana, los meses, las estaciones, los gentilicios, los idiomas y las religiones se escriben en minúscula: lunes, marzo, invierno, español, catolicismo.",
        ejemplos: [
          "El lunes empiezo el curso ✓",
          "Nací en marzo, en pleno invierno ✓",
          "Es un escritor español que vive en México ✓",
          "El Lunes empiezo ✗"
        ]
      },
      {
        titulo: "Nombres propios e instituciones",
        regla: "Van con mayúscula los nombres propios de personas, lugares e instituciones: Universidad de Salamanca, Ministerio de Hacienda, las Naciones Unidas. El genérico, sin nombre propio, va en minúscula: la universidad de mi ciudad.",
        ejemplos: [
          "Estudié en la Universidad de Salamanca ✓ (nombre propio)",
          "Estudié en una universidad pública ✓ (genérico)",
          "Trabaja en la Organización de las Naciones Unidas ✓"
        ]
      },
      {
        titulo: "Vías urbanas",
        regla: "El genérico de la vía (calle, avenida, plaza) va en minúscula; el nombre propio, en mayúscula: calle Mayor, avenida de la Constitución, plaza del Sol.",
        ejemplos: [
          "Vivo en la calle Alcalá ✓",
          "Vivo en la Calle Alcalá ✗",
          "La plaza Mayor de Salamanca ✓ (nombre propio de la plaza: mayúscula)"
        ]
      },
      {
        titulo: "Títulos de obras",
        regla: "En los títulos de libros, películas y canciones, solo la primera palabra y los nombres propios van en mayúscula: «Cien años de soledad», «La sombra del viento».",
        ejemplos: [
          "Leí «Cien años de soledad» ✓",
          "Leí «Cien Años de Soledad» ✗ (mayúsculas inglesas)",
          "La película «El laberinto del fauno» ✓"
        ]
      },
      {
        titulo: "Divinidades y documentos solemnes",
        regla: "Van con mayúscula los nombres de divinidades de cada religión (Dios, Alá, Buda) y los documentos y hechos históricos solemnes: la Constitución, la Declaración Universal, la Revolución Francesa.",
        ejemplos: [
          "Los dioses griegos ✓ (mitología, genérico plural)",
          "El Dios de los cristianos ✓ (nombre propio)",
          "La Constitución fue reformada en 1978 ✓ (documento solemne)"
        ]
      },
      {
        titulo: "Puntos cardinales",
        regla: "Los puntos cardinales van en minúscula cuando son direcciones o zonas geográficas generales: el sur de Chile, viento del norte. Van en mayúscula en abreviaturas (N, S) y cuando forman parte de nombres propios o designaciones geopolíticas consagradas (el Lejano Oriente).",
        ejemplos: [
          "Vive en el sur de España ✓",
          "Sopla un viento del norte ✓",
          "Los acuerdos del Norte con el Sur ✓ (designaciones consagradas)"
        ]
      }
    ],
    ejercicios: [
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: [
          "El lunes empiezo el curso.",
          "El Lunes empiezo el curso."
        ],
        respuesta: "El lunes empiezo el curso.",
        regla: "Los días de la semana se escriben en minúscula.",
        razon: "A diferencia del inglés, el español no escribe con mayúscula los días: lunes, martes, miércoles... La mayúscula solo aparece al inicio de la oración.",
        ejemplos: [
          "Nos vemos el viernes ✓",
          "El Lunes hay fiesta ✗"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: [
          "Vivo en una calle tranquila de Madrid.",
          "Vivo en una Calle tranquila de Madrid."
        ],
        respuesta: "Vivo en una calle tranquila de Madrid.",
        regla: "El genérico de la vía urbana (calle, avenida) va en minúscula cuando no forma parte del nombre propio.",
        razon: "«Calle tranquila» no es el nombre de la vía, sino una descripción: el genérico va en minúscula. Sería mayúscula en «calle de Alcalá»... con el propio en mayúscula y el genérico en minúscula.",
        ejemplos: [
          "Vivo en la calle Mayor ✓ (genérico minúscula + propio en mayúscula)",
          "Vivo en la Calle Mayor ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Los ___ del Olimpo gobernaban el mundo.",
        opciones: ["dioses", "Dioses"],
        respuesta: "dioses",
        regla: "Los nombres genéricos de divinidades (los dioses griegos) van en minúscula; el nombre propio de la divinidad de una religión (Dios, Alá) en mayúscula.",
        razon: "«Los dioses del Olimpo» habla de seres en plural, sin nombre propio individual: minúscula. El singular «Dios» con mayúscula designa al dios único de las religiones monoteístas.",
        ejemplos: [
          "Los dioses egipcios ✓",
          "Confío en Dios ✓ (nombre propio)",
          "Los Dioses del Olimpo ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Mi novela favorita es ___.",
        opciones: [
          "«Cien años de soledad»",
          "«Cien Años de Soledad»"
        ],
        respuesta: "«Cien años de soledad»",
        regla: "En los títulos, solo la primera palabra y los nombres propios llevan mayúscula.",
        razon: "El español no usa la «mayúscula de título» inglesa (Title Case): se escribe «Cien años de soledad», «El amor en los tiempos del cólera».",
        ejemplos: [
          "«La sombra del viento» ✓",
          "«Don Quijote de la Mancha» ✓ (nombres propios con mayúscula)",
          "«La Sombra Del Viento» ✗"
        ]
      },
      {
        tipo: "hueco",
        enunciado: "En ___ visitamos Granada. (mes del año)",
        respuesta: "septiembre",
        regla: "Los meses del año se escriben en minúscula.",
        razon: "Como los días de la semana, los meses no llevan mayúscula en español: enero, septiembre, diciembre.",
        ejemplos: [
          "En diciembre hay vacaciones ✓",
          "En Septiembre hay vacaciones ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: [
          "Estudia español e historia del arte.",
          "Estudia Español e Historia del Arte."
        ],
        respuesta: "Estudia español e historia del arte.",
        regla: "Los idiomas, los gentilicios y las asignaturas se escriben en minúscula.",
        razon: "«Español» (idioma) e «historia del arte» (materia) son nombres comunes: minúscula. Solo llevarían mayúscula en nombres propios de departamentos o titulaciones oficiales.",
        ejemplos: [
          "Habla francés y japonés ✓",
          "Es profesora de biología ✓",
          "Soy mexicano ✓ (gentilicio, minúscula)"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "Si hablamos del documento normativo supremo de un país, ¿qué forma es correcta?",
        opciones: [
          "La Constitución fue reformada en 1978.",
          "La constitución fue reformada en 1978."
        ],
        respuesta: "La Constitución fue reformada en 1978.",
        regla: "Los documentos solemnes de un país (Constitución, Declaración de Independencia) van con mayúscula; el sentido genérico (la constitución de un organismo) en minúscula.",
        razon: "«La Constitución» designa un texto único y solemne: mayúscula. En cambio, «la constitución de la asociación» (sus reglas) es genérico: minúscula.",
        ejemplos: [
          "La Constitución de 1812 ✓",
          "La constitución del club era sencilla ✓ (genérico)",
          "La constitución española de 1978 ✗ (para el documento: Constitución)"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: [
          "Vive en el sur de Chile.",
          "Vive en el Sur de Chile."
        ],
        respuesta: "Vive en el sur de Chile.",
        regla: "Los puntos cardinales, como direcciones o zonas geográficas, van en minúscula.",
        razon: "«El sur de Chile» es una zona geográfica general, no un nombre propio consagrado: minúscula. La mayúscula queda para abreviaturas (S) y designaciones consagradas (el Lejano Oriente).",
        ejemplos: [
          "Viajamos hacia el norte ✓",
          "La cara sur de la montaña ✓",
          "Vive en el Sur de Chile ✗"
        ]
      },
      {
        tipo: "hueco",
        enunciado: "Trabaja en la ___ de las Naciones Unidas. (institución)",
        respuesta: "Organización",
        regla: "Los nombres propios de organismos internacionales llevan mayúscula en todos sus elementos significativos.",
        razon: "«Organización de las Naciones Unidas» es el nombre propio de la institución: cada palabra significativa va con mayúscula.",
        ejemplos: [
          "la Organización Mundial de la Salud ✓",
          "el Banco Mundial ✓",
          "la organización mundial de la salud ✗ (como nombre propio)"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "En una carta formal, ¿qué encabezamiento es correcto?",
        opciones: [
          "Querido Sr. García:",
          "Querido Sr. garcía:"
        ],
        respuesta: "Querido Sr. García:",
        regla: "Los apellidos son nombres propios: siempre con mayúscula inicial.",
        razon: "«García» es el apellido del destinatario: nombre propio y mayúscula. La abreviatura «Sr.» también lleva mayúscula, y tras los dos puntos del salto va minúscula.",
        ejemplos: [
          "Estimada Sra. López: ✓",
          "Estimada Sra. lópez ✗",
          "Querido Sr. García: le escribo para... ✓ (minúscula tras los dos puntos)"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "Tras los dos puntos de una explicación (no cita textual), ¿qué se escribe?",
        opciones: [
          "Solo quedaba una salida: huir.",
          "Solo quedaba una salida: Huir."
        ],
        respuesta: "Solo quedaba una salida: huir.",
        regla: "Después de dos puntos con valor explicativo, se escribe en minúscula.",
        razon: "Los dos puntos no cierran la oración; la palabra que sigue continúa la misma idea. La mayúscula tras dos puntos se reserva para citas textuales y documentos.",
        ejemplos: [
          "Trajo lo pedido: pan y leche ✓",
          "Recordó la máxima: «Más vale tarde». ✓ (cita)",
          "Recordó la máxima: Más vale tarde. ✗ (cita escrita sin comillas)"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: [
          "Estudió en la Universidad de Salamanca.",
          "Estudió en la universidad de Salamanca."
        ],
        respuesta: "Estudió en la Universidad de Salamanca.",
        regla: "El nombre propio de una institución concreta lleva mayúscula en todos sus elementos: Universidad de Salamanca.",
        razon: "«Universidad de Salamanca» es el nombre oficial de la institución: mayúscula. Sin nombre propio, el genérico va en minúscula: «una universidad pública».",
        ejemplos: [
          "Trabaja en el Ministerio de Hacienda ✓",
          "Hay un ministerio nuevo ✓ (genérico: minúscula)",
          "La universidad de Salamanca ✗ (como nombre propio)"
        ]
      }
    ]
  });
})();
