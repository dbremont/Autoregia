/* Orden, áreas temáticas y nivel de cada tema. */
(function () {
  "use strict";

  GV.orden = [
    "tildes",
    "byv",
    "ll-y",
    "gjh",
    "dequeismo",
    "concordancia",
    "subjuntivo",
    "pronombres",
    "preposiciones",
    "haber-gerundio",
    "aspecto",
    "participios",
    "hipotetico",
    "irregulares",
    "se",
    "ser-estar",
    "relativos",
    "estilo-indirecto",
    "cuantificadores",
    "paronimos",
    "puntuacion",
    "mayusculas"
  ];

  GV.areas = [
    { id: "letras", etiqueta: "Acentuación y letras" },
    { id: "gramatica", etiqueta: "Gramática" },
    { id: "sintaxis", etiqueta: "Sintaxis y estilo" },
    { id: "escritura", etiqueta: "Escritura" }
  ];

  GV.metaTemas = {
    tildes: { area: "letras", nivel: "básico" },
    byv: { area: "letras", nivel: "básico" },
    "ll-y": { area: "letras", nivel: "básico" },
    gjh: { area: "letras", nivel: "intermedio" },

    concordancia: { area: "gramatica", nivel: "intermedio" },
    subjuntivo: { area: "gramatica", nivel: "avanzado" },
    pronombres: { area: "gramatica", nivel: "avanzado" },
    preposiciones: { area: "gramatica", nivel: "intermedio" },
    "haber-gerundio": { area: "gramatica", nivel: "intermedio" },
    aspecto: { area: "gramatica", nivel: "avanzado" },
    participios: { area: "gramatica", nivel: "intermedio" },
    hipotetico: { area: "gramatica", nivel: "avanzado" },
    irregulares: { area: "gramatica", nivel: "básico" },
    "ser-estar": { area: "gramatica", nivel: "básico" },
    cuantificadores: { area: "gramatica", nivel: "intermedio" },

    dequeismo: { area: "sintaxis", nivel: "intermedio" },
    se: { area: "sintaxis", nivel: "intermedio" },
    relativos: { area: "sintaxis", nivel: "avanzado" },
    "estilo-indirecto": { area: "sintaxis", nivel: "avanzado" },

    paronimos: { area: "escritura", nivel: "intermedio" },
    puntuacion: { area: "escritura", nivel: "intermedio" },
    mayusculas: { area: "escritura", nivel: "básico" }
  };
})();
