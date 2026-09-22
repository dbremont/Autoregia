/* Núcleo de la aplicación: espacio de nombres global y registro de temas. */
(function () {
  "use strict";

  window.GV = {
    version: "1.0.0",
    temas: [],
    orden: [],

    registrarTema(tema) {
      const TIPOS_VALIDOS = ["seleccion", "oraciones", "hueco"];

      if (!tema.id || !tema.titulo) {
        throw new Error("Tema sin id o título");
      }
      if (this.obtenerTema(tema.id)) {
        throw new Error("Tema duplicado: " + tema.id);
      }
      if (!Array.isArray(tema.teoria) || tema.teoria.length === 0) {
        throw new Error("El tema " + tema.id + " no tiene teoría");
      }
      if (!Array.isArray(tema.ejercicios) || tema.ejercicios.length < 8) {
        throw new Error("El tema " + tema.id + " debe tener al menos 8 ejercicios");
      }

      tema.ejercicios.forEach((ej, i) => {
        const etiqueta = "tema " + tema.id + ", ejercicio " + (i + 1);

        // Requisito editorial: toda corrección debe explicar la regla y la razón.
        if (!ej.regla || !ej.razon) {
          throw new Error(etiqueta + ": falta «regla» o «razón»");
        }
        if (!Array.isArray(ej.ejemplos) || ej.ejemplos.length === 0) {
          throw new Error(etiqueta + ": falta «ejemplos»");
        }
        if (TIPOS_VALIDOS.indexOf(ej.tipo) === -1) {
          throw new Error(etiqueta + ": tipo inválido «" + ej.tipo + "»");
        }
        if (ej.tipo === "hueco") {
          if (typeof ej.respuesta !== "string" || !ej.respuesta.trim()) {
            throw new Error(etiqueta + ": sin respuesta");
          }
        } else {
          if (!Array.isArray(ej.opciones) || ej.opciones.length < 2) {
            throw new Error(etiqueta + ": necesita al menos 2 opciones");
          }
          if (ej.opciones.indexOf(ej.respuesta) === -1) {
            throw new Error(etiqueta + ": la respuesta no está entre las opciones");
          }
          const unicas = new Set(ej.opciones.map(function (o) { return o; }));
          if (unicas.size !== ej.opciones.length) {
            throw new Error(etiqueta + ": opciones repetidas");
          }
        }
      });

      this.temas.push(tema);
    },

    obtenerTema(id) {
      return this.temas.find(function (t) { return t.id === id; });
    },

    temasOrdenados() {
      if (!this.orden.length) return this.temas.slice();
      const lista = this.orden
        .map(function (id) { return this.obtenerTema(id); }, this)
        .filter(Boolean);
      // Por si algún tema quedó fuera del índice:
      this.temas.forEach(function (t) {
        if (lista.indexOf(t) === -1) lista.push(t);
      });
      return lista;
    }
  };
})();
