/* Motor de sesiones de ejercicios con corrección didáctica:
   tras cada respuesta se muestran la regla y la razón. */
(function () {
  "use strict";

  const util = {
    normalizar(texto) {
      return String(texto)
        .trim()
        .toLowerCase()
        .replace(/[.,;:!?¡¿"'«»\u2014\u2013…]/g, "")
        .replace(/\s+/g, " ");
    },

    escape(texto) {
      const div = document.createElement("div");
      div.textContent = String(texto);
      return div.innerHTML;
    },

    barajar(lista) {
      const copia = lista.slice();
      for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = copia[i];
        copia[i] = copia[j];
        copia[j] = tmp;
      }
      return copia;
    }
  };

  GV.util = util;

  function comprobar(ejercicio, valor) {
    if (ejercicio.tipo === "hueco") {
      const aceptadas = [ejercicio.respuesta].concat(ejercicio.variantes || []);
      const dada = util.normalizar(valor);
      return dada !== "" && aceptadas.some(function (v) {
        return util.normalizar(v) === dada;
      });
    }
    return valor === ejercicio.respuesta;
  }

  let sesion = null;

  GV.iniciarSesion = function (contenedor, lista, opciones) {
    opciones = opciones || {};
    sesion = {
      contenedor: contenedor,
      lista: lista,
      titulo: opciones.titulo || "Sesión de práctica",
      pos: 0,
      aciertos: 0,
      errores: [],
      respondida: false
    };
    if (!lista.length) {
      contenedor.innerHTML =
        '<div class="tarjeta estado-vacio">' +
        "<p>Aquí no hay nada pendiente: ¡no tienes errores que repasar!</p>" +
        '<a class="btn btn-primario" href="#/examen">Hacer un examen mixto</a>' +
        "</div>";
      return;
    }
    render();
  };

  /* ---------- render ---------- */

  function render() {
    const c = sesion.contenedor;
    c.innerHTML =
      '<div class="sesion-cabecera">' +
      "<h2>" + util.escape(sesion.titulo) + "</h2>" +
      '<div class="sesion-progreso">' +
      '<div class="rotulo"><span>Ejercicio <b class="num"></b> de ' +
      sesion.lista.length + '</span><span class="marcador-parcial"></span></div>' +
      '<div class="barra-progreso"><i class="relleno"></i></div>' +
      "</div></div>" +
      '<div class="tarjeta ejercicio"><div class="cuerpo-ejercicio"></div></div>';
    renderEjercicio();
  }

  function actualizarCabecera() {
    const c = sesion.contenedor;
    const num = c.querySelector(".num");
    const parcial = c.querySelector(".marcador-parcial");
    const relleno = c.querySelector(".relleno");
    if (num) num.textContent = String(sesion.pos + 1);
    if (parcial) parcial.textContent = sesion.aciertos + " correctas";
    if (relleno) relleno.style.width = Math.round((100 * sesion.pos) / sesion.lista.length) + "%";
  }

  function renderEjercicio() {
    const item = sesion.lista[sesion.pos];
    const ej = item.ejercicio;
    const cuerpo = sesion.contenedor.querySelector(".cuerpo-ejercicio");

    let html =
      '<p class="tema-etiqueta">' + util.escape(item.tema.titulo) + "</p>" +
      '<p class="enunciado">' + util.escape(ej.enunciado) + "</p>";

    if (ej.tipo === "hueco") {
      html +=
        '<div class="hueco-fila">' +
        '<input class="entrada-hueco" type="text" autocomplete="off" ' +
        'autocapitalize="off" spellcheck="false" aria-label="Escribe tu respuesta" placeholder="Escribe tu respuesta">' +
        '<button class="btn btn-primario btn-comprobar">Comprobar</button>' +
        "</div>";
    } else {
      const largas = ej.tipo === "oraciones";
      html += '<div class="opciones">' + util.barajar(ej.opciones).map(function (op) {
        const texto = largas ? "«" + op + "»" : op;
        return '<button class="opcion' + (largas ? " opcion-larga" : "") +
          '" data-valor="' + util.escape(op) + '">' + util.escape(texto) + "</button>";
      }).join("") + "</div>";
    }

    html += '<div class="zona-feedback"></div><div class="zona-acciones"></div>';
    cuerpo.innerHTML = html;
    actualizarCabecera();
    activarEventos(ej, cuerpo);
  }

  function activarEventos(ej, cuerpo) {
    if (ej.tipo === "hueco") {
      const entrada = cuerpo.querySelector(".entrada-hueco");
      const boton = cuerpo.querySelector(".btn-comprobar");
      function enviar() {
        if (sesion.respondida) return;
        responder(ej, entrada.value);
      }
      boton.addEventListener("click", enviar);
      entrada.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter") { ev.preventDefault(); enviar(); }
      });
      entrada.focus();
    } else {
      cuerpo.querySelectorAll(".opcion").forEach(function (boton) {
        boton.addEventListener("click", function () {
          if (sesion.respondida) return;
          responder(ej, boton.getAttribute("data-valor"));
        });
      });
    }
  }

  /* ---------- respuesta y corrección ---------- */

  function responder(ej, valor) {
    const item = sesion.lista[sesion.pos];
    const acierto = comprobar(ej, valor);
    sesion.respondida = true;
    GV.progreso.registrarRespuesta(item.tema.id, item.idx, acierto);
    if (acierto) {
      sesion.aciertos += 1;
    } else {
      sesion.errores.push({ item: item, dada: valor });
    }
    marcarOpciones(ej, acierto, valor);
    renderFeedback(ej, acierto, valor);
  }

  function marcarOpciones(ej, acierto, valor) {
    if (ej.tipo === "hueco") {
      const cuerpo = sesion.contenedor.querySelector(".cuerpo-ejercicio");
      const entrada = cuerpo.querySelector(".entrada-hueco");
      const boton = cuerpo.querySelector(".btn-comprobar");
      entrada.disabled = true;
      boton.disabled = true;
      if (!acierto) {
        entrada.classList.add("elegida-error");
        entrada.value = valor;
      }
      return;
    }
    sesion.contenedor.querySelectorAll(".opcion").forEach(function (boton) {
      const valorBoton = boton.getAttribute("data-valor");
      boton.disabled = true;
      if (valorBoton === ej.respuesta) boton.classList.add("correcta");
      else if (valorBoton === valor && !acierto) boton.classList.add("elegida-error");
    });
  }

  function renderFeedback(ej, acierto, valor) {
    const zona = sesion.contenedor.querySelector(".zona-feedback");
    const cuerpo = sesion.contenedor.querySelector(".cuerpo-ejercicio");
    const item = sesion.lista[sesion.pos];
    const veredicto = acierto
      ? "\u2714 Correcto"
      : "\u2718 Incorrecto";
    const comparacion = (!acierto)
      ? '<p class="respuestas-comparadas">' +
        '<span class="tachado">Tu respuesta: ' + util.escape(valor === "" ? "(vacía)" : valor) +
        "</span> &middot; Correcta: <strong>" + util.escape(ej.respuesta) + "</strong></p>"
      : "";

    const liEjemplos = ej.ejemplos.map(function (texto) {
      const mal = String(texto).indexOf("\u2718") !== -1;
      return "<li" + (mal ? ' class="mal"' : "") + ">" + util.escape(texto) + "</li>";
    }).join("");

    zona.innerHTML =
      '<div class="feedback ' + (acierto ? "ok" : "mal") + '">' +
      '<p class="veredicto">' + veredicto + "</p>" +
      comparacion +
      "<h4>Regla</h4><p>" + util.escape(ej.regla) + "</p>" +
      "<h4>Razón</h4><p>" + util.escape(ej.razon) + "</p>" +
      "<h4>Ejemplos</h4><ul class=\"lista-ejemplos\">" + liEjemplos + "</ul>" +
      "</div>";

    const esUltimo = sesion.pos + 1 >= sesion.lista.length;
    const acciones = cuerpo.querySelector(".zona-acciones");
    acciones.innerHTML =
      '<button class="btn btn-primario btn-siguiente">' +
      (esUltimo ? "Ver resultados" : "Siguiente \u2192") + "</button>" +
      '<a class="enlace-teoria" href="#/tema/' + util.escape(item.tema.id) +
      '">Repasar la teoría de «' + util.escape(item.tema.titulo) + "»</a>";
    acciones.querySelector(".btn-siguiente").addEventListener("click", siguiente);
    acciones.querySelector(".btn-siguiente").focus();
  }

  /* ---------- flujo de la sesión ---------- */

  function siguiente() {
    sesion.pos += 1;
    sesion.respondida = false;
    if (sesion.pos >= sesion.lista.length) {
      GV.progreso.registrarSesion(sesion.aciertos, sesion.lista.length);
      renderResumen();
    } else {
      renderEjercicio();
    }
  }

  function renderResumen() {
    const total = sesion.lista.length;
    const aciertos = sesion.aciertos;
    const porcentaje = Math.round((100 * aciertos) / total);
    let clase = "";
    let mensaje = "Excelente: dominas este material.";
    if (porcentaje < 50) {
      clase = "bajo";
      mensaje = "Repasa la teoría y vuelve a intentarlo: así se aprende.";
    } else if (porcentaje < 80) {
      clase = "medio";
      mensaje = "Buen trabajo. Los puntos débiles quedan en «Mis errores».";
    }

    const listaErrores = sesion.errores.length
      ? '<ul class="lista-errores-sesion">' + sesion.errores.map(function (e) {
          return "<li><strong>" + util.escape(e.item.tema.titulo) + ":</strong> " +
            util.escape(e.item.ejercicio.enunciado) +
            ' <span class="meta">(correcta: ' + util.escape(e.item.ejercicio.respuesta) + ")</span></li>";
        }).join("") + "</ul>"
      : "<p>No fallaste ninguno. Enhorabuena.</p>";

    sesion.contenedor.innerHTML =
      '<div class="tarjeta resumen">' +
      '<h2>Sesión terminada</h2>' +
      '<div class="marcador ' + clase + '">' + aciertos + " / " + total + "</div>" +
      "<p>" + porcentaje + "% de acierto. " + mensaje + "</p>" +
      listaErrores +
      '<div class="zona-acciones" style="justify-content:center">' +
      '<button class="btn btn-primario btn-repetir">Repetir la sesión</button>' +
      '<a class="btn btn-secundario" href="#/">Volver a los temas</a>' +
      "</div></div>";

    sesion.contenedor.querySelector(".btn-repetir").addEventListener("click", function () {
      GV.iniciarSesion(sesion.contenedor, sesion.lista, { titulo: sesion.titulo });
    });
  }
})();
