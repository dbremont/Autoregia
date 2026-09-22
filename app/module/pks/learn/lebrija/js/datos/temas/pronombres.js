/* Tema: pronombres personales átonos (CD y CI). */
(function () {
  "use strict";

  GV.registrarTema({
    id: "pronombres",
    titulo: "Pronombres: lo, la, le",
    inicial: "Lo",
    descripcion: "Leísmo, laísmo, loísmo y la combinación de dos pronombres. La prueba definitiva del habla cuidada.",
    teoria: [
      {
        titulo: "CD frente a CI",
        regla: "El complemento directo (CD) responde a «¿a qué o a quién + verbo?» y se sustituye por lo, la, los, las. El complemento indirecto (CI) responde a «¿a quién se le da algo?» y se sustituye por le, les. Prueba: si puedes sustituirlo por «lo/la», es CD; si por «le», es CI.",
        ejemplos: [
          "Vi a Juan → Lo vi (CD)",
          "Di el libro a Ana → Le di el libro (CI)",
          "Escribí una carta → La escribí (CD)"
        ]
      },
      {
        titulo: "Leísmo",
        regla: "El leísmo (usar «le» como CD) solo se considera aceptable, y no siempre, con persona masculina singular («A Juan le vi»). No es aceptable con femenino, con plural ni con cosas: «A Ana le vi», «A los niños les vi», «Le compré (el libro)» deben ser «La vi», «Los vi», «Lo compré».",
        ejemplos: [
          "A Pedro le llamé ✓ (aceptado por tradición, aunque «lo llamé» es preferible hoy)",
          "A María le llamé ✗ → La llamé ✓",
          "A los invitados les recibieron ✗ → Los recibieron ✓"
        ]
      },
      {
        titulo: "Laísmo y loísmo",
        regla: "El laísmo (usar «la» como CI: «La dije la verdad») y el loísmo (usar «lo» como CI: «Lo di un susto») no son aceptables en ningún registro culto. El CI es siempre le/les.",
        ejemplos: [
          "Le dije la verdad ✓ / La dije la verdad ✗ (laísmo)",
          "Le dio un abrazo ✓ / Lo dio un abrazo ✗ (loísmo)"
        ]
      },
      {
        titulo: "Dos pronombres juntos",
        regla: "Cuando coinciden CI + CD, primero va el CI y después el CD («me lo dio»). Si el CI es le o les, se convierte en se ante lo, la, los, las: nunca «le lo», «les la».",
        ejemplos: [
          "Le di el libro a Ana → Se lo di ✓",
          "Les di las llaves → Se las di ✓",
          "Le lo di ✗ (imposible en español)"
        ]
      },
      {
        titulo: "Colocación de los pronombres",
        regla: "Con verbo conjugado, el pronombre va delante (lo hago). Con infinitivo y gerundio, va pegado detrás (hacerlo, haciéndolo), aunque con perífrasis puede ir delante del auxiliar (lo estoy haciendo). Ante gerundio enclítico, el acento se mantiene con tilde: haciéndolo.",
        ejemplos: [
          "Estoy haciéndolo ✓ / Lo estoy haciendo ✓",
          "Estoy haciendo lo ✗",
          "Habiéndolo pensado ✓ (con tilde)"
        ]
      },
      {
        titulo: "«Consigo» frente a «con él/ella»",
        regla: "«Consigo» es reflexivo: su referente es el sujeto de la oración. Para referirse a otra persona, se usa «con él», «con ella», «con usted».",
        ejemplos: [
          "María habla consigo misma ✓ (de sí misma)",
          "María habla con ella ✓ (con otra mujer)",
          "Lleva la contraseña consigo ✓ (la lleva encima, mismo sujeto)"
        ]
      }
    ],
    ejercicios: [
      {
        tipo: "seleccion",
        enunciado: "A Ana ___ vi ayer en el mercado.",
        opciones: ["la", "le"],
        respuesta: "la",
        regla: "Con CD femenino, se usa «la»; el leísmo femenino no es aceptable.",
        razon: "«Ver» lleva CD: vi a Ana → la vi. El leísmo solo se tolera con masculino singular de persona, nunca con femenino.",
        ejemplos: [
          "A Ana la vimos ✓",
          "A Ana le vimos ✗ (leísmo femenino)"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "A los niños ___ llevaron al parque.",
        opciones: ["los", "les"],
        respuesta: "los",
        regla: "El leísmo con plural no es aceptable: CD masculino plural = los.",
        razon: "«Llevar» exige CD: llevaron a los niños → los llevaron. El «les» solo funciona como CI (les llevaron helados = les llevaron helados a ellos).",
        ejemplos: [
          "Los llevaron al parque ✓",
          "Les llevaron al parque ✗ (leísmo plural)"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "A Juan ___ vi ayer. ¿Qué formas se consideran aceptables?",
        opciones: ["lo", "le", "Ambas se consideran aceptables"],
        respuesta: "Ambas se consideran aceptables",
        regla: "Con CD masculino singular de persona, la RAE admite «lo vi» (preferible) y tolera el leísmo «le vi» por tradición literaria.",
        razon: "El leísmo de persona masculina singular («A Juan le vi») es el único leísmo que la norma considera admisible, aunque hoy se prefiere «lo». Con femenino o plural no hay tolerancia.",
        ejemplos: [
          "A Juan lo vi ✓ (preferible)",
          "A Juan le vi ✓ (aceptado, leísmo antiguo)",
          "A María le vi ✗ (nunca)"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "El paquete ___ envié el lunes.",
        opciones: ["lo", "le"],
        respuesta: "lo",
        regla: "Con cosas, el CD es siempre lo/la/los/las; el leísmo de cosa no se acepta.",
        razon: "«Enviar» exige CD: envié el paquete → lo envié. Usar «le» con cosas (leísmo de cosa) está fuera del habla culta.",
        ejemplos: [
          "El paquete lo envié ayer ✓",
          "El paquete le envié ayer ✗ (leísmo de cosa)"
        ]
      },
      {
        tipo: "hueco",
        enunciado: "¿Le diste el libro a María? — Sí, ___ di ayer. (dos pronombres)",
        respuesta: "se lo",
        regla: "Ante los CD lo, la, los, las, los CI le/les se transforman en se.",
        razon: "La secuencia «le lo» no existe en español: el CI «le» pasa a «se» y el CD «lo» se mantiene: se lo di.",
        ejemplos: [
          "¿Les enviaste los documentos? — Se los envié ✓",
          "Le lo di ✗",
          "Selo di ✗ (escrito junto, incorrecto)"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "(a ella) ___ dije la verdad.",
        opciones: ["Le", "La"],
        respuesta: "Le",
        regla: "El CI es siempre le/les; usar «la» como CI (laísmo) no es aceptable.",
        razon: "«Decir» lleva CI de persona: dije la verdad a ella → le dije. El laísmo («la dije la verdad») es muy marcado regionalmente y ajeno a la norma culta.",
        ejemplos: [
          "Les dijimos todo ✓",
          "Las dijimos todo ✗ (laísmo)"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "(a él) ___ dio un gran susto.",
        opciones: ["Le", "Lo"],
        respuesta: "Le",
        regla: "«Dar un susto a alguien» lleva CI de persona; usar «lo» como CI (loísmo) no es aceptable.",
        razon: "La persona que recibe el susto es CI: le dio un susto. El loísmo («lo dio un susto») no existe en el habla culta.",
        ejemplos: [
          "Le dieron las gracias ✓ (CI)",
          "Lo dieron las gracias ✗ (loísmo)"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: ["Estoy haciéndolo ahora.", "Estoy haciendo lo ahora."],
        respuesta: "Estoy haciéndolo ahora.",
        regla: "Tras gerundio e infinitivo, el pronombre va pegado al verbo (enclítico), con su tilde si corresponde.",
        razon: "El gerundio «haciendo» + «lo» forma «haciéndolo», conservando el acento con tilde. Separar el pronombre («haciendo lo») es incorrecto.",
        ejemplos: [
          "Estoy terminándolo ✓ / Lo estoy terminando ✓",
          "Voy a comprárselo ✓ / Se lo voy a comprar ✓",
          "Estoy haciendo lo ✗"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: ["Tengo que decírselo.", "Tengo que se lo decir."],
        respuesta: "Tengo que decírselo.",
        regla: "Tras infinitivo, los pronombres se unen al verbo: decírselo (decir + se + lo).",
        razon: "El infinitivo «decir» recibe los pronombres detrás, escritos junto a él con la tilde correspondiente. Proclíticos ante infinitivo simple («se lo decir») son imposibles.",
        ejemplos: [
          "Voy a dárselo ✓ / Se lo voy a dar ✓",
          "Voy a se lo dar ✗"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "María habla ___ misma desde hace años.",
        opciones: ["consigo", "con ella"],
        respuesta: "consigo",
        regla: "«Consigo» es el reflexivo: su referente es el sujeto («María consigo misma» = ella consigo misma).",
        razon: "Como quien habla es María, se usa «consigo»: hablar consigo misma. «Con ella» señalaría a otra mujer distinta del sujeto.",
        ejemplos: [
          "Juan discute consigo mismo ✓",
          "Juan discute con él ✓ (con otro hombre)",
          "María habla con ella misma ✓ solo si «misma» aclara que se trata de María"
        ]
      },
      {
        tipo: "seleccion",
        enunciado: "A mis padres ___ he pedido perdón.",
        opciones: ["les", "los"],
        respuesta: "les",
        regla: "«Pedir perdón a alguien» lleva CI de persona: les he pedido perdón.",
        razon: "La persona a quien se pide algo es CI (a mis padres → les). El «los» convertiría a los padres en CD (lo que se pide), lo que no corresponde: lo que se pide es el perdón.",
        ejemplos: [
          "Les pedí un favor ✓ (CI)",
          "Los pedí un favor ✗ (loísmo)"
        ]
      },
      {
        tipo: "oraciones",
        enunciado: "¿Cuál oración es la correcta?",
        opciones: ["Se lo advertí mil veces.", "Le lo advertí mil veces."],
        respuesta: "Se lo advertí mil veces.",
        regla: "La secuencia CI le + CD lo nunca puede aparecer: le pasa a se.",
        razon: "En español, «le lo» es una secuencia prohibida; el CI «le» se transforma siempre en «se» ante los pronombres lo, la, los, las: se lo advertí.",
        ejemplos: [
          "Se la entregué ✓",
          "Se los dije ✓",
          "Le lo entregué ✗"
        ]
      }
    ]
  });
})();
