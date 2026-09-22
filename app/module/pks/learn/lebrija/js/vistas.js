/* Vistas y navegación basada en hash. */
(function () {
  "use strict";

  const util = GV.util;

  function app() {
    return document.getElementById("app");
  }

  /* ---------- utilidades de vista ---------- */

  function barraProgreso(porcentaje, clase) {
    return '<div class="barra-progreso' + (clase ? " " + clase : "") + '">' +
      '<i style="width:' + Math.min(100, Math.max(0, porcentaje)) + '%"></i></div>';
  }

  function enlacesSesion(lista, titulo) {
    GV.iniciarSesion(app(), lista, { titulo: titulo });
  }

  function areaEtiqueta(idArea) {
    const area = GV.areas.find(function (a) { return a.id === idArea; });
    return area ? area.etiqueta : "";
  }

  /* ---------- barra lateral ---------- */

  function actualizarLateral() {
    const zona = document.getElementById("lateral-progreso");
    if (!zona) return;
    const resumen = GV.progreso.resumen();
    const racha = GV.progreso.racha();
    const pendientes = GV.progreso.fallados().length;
    zona.innerHTML =
      '<p class="lateral-titulo">Tu progreso</p>' +
      '<dl class="dato-lista">' +
      "<div><dt>Precisión</dt><dd>" + resumen.precision + "%</dd></div>" +
      "<div><dt>Racha</dt><dd>" + racha + (racha === 1 ? " día" : " días") + "</dd></div>" +
      "<div><dt>Por repasar</dt><dd>" + pendientes + "</dd></div>" +
      "<div><dt>Respuestas</dt><dd>" + resumen.intentos + "</dd></div>" +
      "</dl>";
  }

  function marcarActivo(ruta) {
    ["menu-lateral", "menu-movil"].forEach(function (idMenu) {
      const menu = document.getElementById(idMenu);
      if (!menu) return;
      menu.querySelectorAll("a").forEach(function (a) {
        a.classList.toggle("activo", a.getAttribute("data-ruta") === ruta);
      });
    });
  }

  /* ---------- inicio ---------- */

  function tarjetaTema(tema) {
    const meta = GV.metaTemas[tema.id] || {};
    const p = GV.progreso.tema(tema.id);
    const precision = p.intentos ? Math.round((100 * p.aciertos) / p.intentos) : 0;
    const pendientes = p.fallados.length;
    const nivel = meta.nivel || "";
    const etiquetaArea = areaEtiqueta(meta.area);

    return (
      '<article class="tarjeta tarjeta-tema">' +
      '<div class="cabecera-tarjeta">' +
      '<div class="monograma">' + util.escape(tema.inicial || tema.titulo.charAt(0)) + "</div>" +
      '<div class="titulos-tarjeta">' +
      '<p class="area-etiqueta">' + util.escape(etiquetaArea) + "</p>" +
      "<h3>" + util.escape(tema.titulo) + "</h3>" +
      (nivel ? '<p class="nivel nivel-' + util.escape(nivel) + '"><i></i>' + util.escape(nivel) + "</p>" : "") +
      "</div></div>" +
      '<p class="descripcion">' + util.escape(tema.descripcion) + "</p>" +
      '<p class="meta">' + tema.ejercicios.length + " ejercicios" +
      (pendientes ? " · " + pendientes + " por repasar" : "") + "</p>" +
      (p.intentos
        ? barraProgreso(precision, "verde") + '<p class="meta">' + precision + "% de acierto</p>"
        : "") +
      '<div class="pie-tarjeta">' +
      '<a class="btn btn-primario" href="#/tema/' + tema.id + '/practica">Practicar</a>' +
      '<a class="btn btn-secundario" href="#/tema/' + tema.id + '">Teoría</a>' +
      "</div></article>"
    );
  }

  const TARJETAS_POR_PAGINA = 9;
  const estadoRejilla = { area: "todas", pagina: 1 };

  function pintarTemas(idArea, pagina) {
    const rejilla = document.getElementById("rejilla");
    const zonaPaginacion = document.getElementById("paginacion");
    if (!rejilla) return;

    estadoRejilla.area = idArea;
    const temas = GV.temasOrdenados().filter(function (t) {
      return idArea === "todas" || (GV.metaTemas[t.id] || {}).area === idArea;
    });
    const totalPaginas = Math.max(1, Math.ceil(temas.length / TARJETAS_POR_PAGINA));
    estadoRejilla.pagina = Math.min(Math.max(1, pagina || 1), totalPaginas);

    const desde = (estadoRejilla.pagina - 1) * TARJETAS_POR_PAGINA;
    const visibles = temas.slice(desde, desde + TARJETAS_POR_PAGINA);

    rejilla.innerHTML = visibles.map(tarjetaTema).join("") ||
      '<p class="meta">No hay temas en esta área.</p>';

    if (!zonaPaginacion) return;
    if (temas.length <= TARJETAS_POR_PAGINA) {
      zonaPaginacion.innerHTML = "";
      return;
    }

    let numeros = "";
    for (let i = 1; i <= totalPaginas; i++) {
      numeros += '<button class="pag-num' + (i === estadoRejilla.pagina ? " activo" : "") +
        '" data-pagina="' + i + '">' + i + "</button>";
    }
    zonaPaginacion.innerHTML =
      '<div class="paginacion">' +
      '<button class="pag-flecha" data-pagina="' + (estadoRejilla.pagina - 1) + '"' +
      (estadoRejilla.pagina === 1 ? " disabled" : "") +
      ' aria-label="P\u00e1gina anterior">\u2190</button>' +
      numeros +
      '<button class="pag-flecha" data-pagina="' + (estadoRejilla.pagina + 1) + '"' +
      (estadoRejilla.pagina === totalPaginas ? " disabled" : "") +
      ' aria-label="P\u00e1gina siguiente">\u2192</button>' +
      "</div>" +
      '<p class="meta pag-info">' + (desde + 1) + "\u2013" + (desde + visibles.length) +
      " de " + temas.length + " temas</p>";

    zonaPaginacion.querySelectorAll("[data-pagina]").forEach(function (boton) {
      boton.addEventListener("click", function () {
        const destino = parseInt(boton.getAttribute("data-pagina"), 10);
        if (!isNaN(destino)) pintarTemas(estadoRejilla.area, destino);
      });
    });
  }

  const COMO_FUNCIONA =
    '<section class="como-funciona">' +
    "<h2>Cómo funciona</h2>" +
    '<ol class="pasos">' +
    '<li><span class="paso-num">I</span><div><h3>Lee</h3><p>La teoría de cada tema: breve, con ejemplos correctos e incorrectos.</p></div></li>' +
    '<li><span class="paso-num">II</span><div><h3>Practica</h3><p>Ejercicios de selección, oraciones y huecos por tema o en examen mixto.</p></div></li>' +
    '<li><span class="paso-num">III</span><div><h3>Entiende</h3><p>Cada corrección explica la regla y la razón, no solo el resultado.</p></div></li>' +
    '<li><span class="paso-num">IV</span><div><h3>Domina</h3><p>Tus errores se guardan para repetirlos hasta agotarlos.</p></div></li>' +
    "</ol></section>";

  function vistaInicio() {
    const resumen = GV.progreso.resumen();
    const fallados = GV.progreso.fallados().length;

    const filtros = [{ id: "todas", etiqueta: "Todas" }].concat(GV.areas).map(function (area, i) {
      return '<button class="filtro' + (i === 0 ? " activo" : "") +
        '" data-area="' + area.id + '">' + util.escape(area.etiqueta) + "</button>";
    }).join("");

    app().innerHTML =
      '<section class="heroe">' +
      "<h1>La gramática que ya hablas, ahora por escrito.</h1>" +
      '<p class="entradilla">' + GV.temas.length + " temas de la norma culta española para hablantes nativos. " +
      "Cada corrección no te dice solo qué fallaste: te explica <strong>la regla</strong> y <strong>la razón</strong>.</p>" +
      '<div class="acciones-principales">' +
      '<a class="btn btn-primario" href="#/examen">Hacer un examen mixto</a>' +
      '<a class="btn btn-secundario" href="#/errores">Repasar mis errores (' + fallados + ")</a>" +
      '<a class="btn btn-secundario" href="#/corrector">Corrector de textos</a>' +
      "</div></section>" +
      '<section><h2>Temas</h2>' +
      '<div class="filtros" id="filtros">' + filtros + "</div>" +
      '<div class="rejilla-temas" id="rejilla"></div>' +
      '<div id="paginacion" class="zona-paginacion"></div>' +
      "</section>" +
      COMO_FUNCIONA;

    pintarTemas("todas");

    document.querySelectorAll(".filtro").forEach(function (boton) {
      boton.addEventListener("click", function () {
        document.querySelectorAll(".filtro").forEach(function (b) { b.classList.remove("activo"); });
        boton.classList.add("activo");
        pintarTemas(boton.getAttribute("data-area"));
      });
    });
  }

  /* ---------- teoría de un tema ---------- */

  function vistaTema(tema) {
    const meta = GV.metaTemas[tema.id] || {};
    const p = GV.progreso.tema(tema.id);
    const precision = p.intentos ? Math.round((100 * p.aciertos) / p.intentos) : 0;
    const etiquetaArea = areaEtiqueta(meta.area);

    const secciones = tema.teoria.map(function (seccion) {
      const items = seccion.ejemplos.map(function (texto) {
        const mal = String(texto).indexOf("\u2718") !== -1;
        return "<li" + (mal ? ' class="mal"' : "") + ">" + util.escape(texto) + "</li>";
      }).join("");
      return (
        '<div class="seccion-teoria">' +
        "<h3>" + util.escape(seccion.titulo) + "</h3>" +
        "<p>" + util.escape(seccion.regla) + "</p>" +
        '<ul class="ejemplos">' + items + "</ul>" +
        "</div>"
      );
    }).join("");

    app().innerHTML =
      '<p class="migas"><a href="#/">\u2190 Temas</a> / ' + util.escape(tema.titulo) + "</p>" +
      "<h1>" + util.escape(tema.titulo) + "</h1>" +
      '<p class="entradilla">' + util.escape(tema.descripcion) + "</p>" +
      '<p class="meta">' +
      (etiquetaArea ? util.escape(etiquetaArea) + " · " : "") +
      "nivel " + util.escape(meta.nivel || "—") +
      " · " + tema.ejercicios.length + " ejercicios</p>" +
      (p.intentos
        ? '<p class="meta">Llevas ' + p.intentos + " respuestas · " + precision +
          "% de acierto · " + p.fallados.length + " por repasar.</p>"
        : "") +
      secciones +
      '<div class="acciones-principales">' +
      '<a class="btn btn-primario" href="#/tema/' + tema.id + '/practica">Practicar este tema (' +
      tema.ejercicios.length + " ejercicios)</a>" +
      '<a class="btn btn-fantasma" href="#/">Volver</a>' +
      "</div>";
  }

  /* ---------- práctica de un tema ---------- */

  function vistaPractica(tema) {
    const lista = tema.ejercicios.map(function (ej, idx) {
      return { tema: tema, idx: idx, ejercicio: ej };
    });
    enlacesSesion(lista, tema.titulo);
  }

  /* ---------- examen mixto ---------- */

  function vistaExamen() {
    const todos = [];
    GV.temasOrdenados().forEach(function (tema) {
      tema.ejercicios.forEach(function (ej, idx) {
        todos.push({ tema: tema, idx: idx, ejercicio: ej });
      });
    });
    const mezclados = util.barajar(todos).slice(0, 15);
    enlacesSesion(mezclados, "Examen mixto");
  }

  /* ---------- repaso de errores ---------- */

  function vistaErrores() {
    const fallados = GV.progreso.fallados();
    if (!fallados.length) {
      app().innerHTML =
        '<p class="migas"><a href="#/">\u2190 Temas</a> / Mis errores</p>' +
        "<h1>Mis errores</h1>" +
        '<div class="tarjeta estado-vacio">' +
        "<p><strong>No tienes nada pendiente.</strong></p>" +
        "<p>Los ejercicios que falles aparecerán aquí para que los repitas hasta dominarlos.</p>" +
        '<a class="btn btn-primario" href="#/examen">Hacer un examen mixto</a>' +
        "</div>";
      return;
    }
    enlacesSesion(fallados, "Mis errores (" + fallados.length + ")");
  }

  /* ---------- referencias ---------- */

  function vistaReferencias() {
    const fuentes = [
      {
        autor: "Elio Antonio de Nebrija (c. 1444\u20131522)",
        obra: "Gram\u00e1tica de la lengua castellana (1492)",
        detalle: "La primera gram\u00e1tica impresa de una lengua romance moderna. Su autor naci\u00f3 en Lebrija (Sevilla), de donde esta herramienta toma el nombre. Hay ediciones modernas en la Biblioteca Virtual Miguel de Cervantes.",
        url: "https://www.cervantesvirtual.com",
        etiqueta: "Biblioteca Virtual Miguel de Cervantes"
      },
      {
        autor: "Real Academia Espa\u00f1ola y ASALE",
        obra: "Ortograf\u00eda de la lengua espa\u00f1ola (2010)",
        detalle: "La referencia para acentuaci\u00f3n, tildes diacr\u00edticas, puntuaci\u00f3n y uso de may\u00fasculas que sigue esta herramienta.",
        url: "https://www.rae.es",
        etiqueta: "rae.es"
      },
      {
        autor: "Real Academia Espa\u00f1ola y ASALE",
        obra: "Nueva gram\u00e1tica de la lengua espa\u00f1ola (2009)",
        detalle: "La gram\u00e1tica de referencia panhisp\u00e1nica: concordancia, subjuntivo, pronombres, construcciones con \u00abse\u00bb.",
        url: "https://www.rae.es",
        etiqueta: "rae.es"
      },
      {
        autor: "Real Academia Espa\u00f1ola",
        obra: "Diccionario de la lengua espa\u00f1ola (DLE)",
        detalle: "Edici\u00f3n en l\u00ednea de consulta para significados y usos.",
        url: "https://dle.rae.es",
        etiqueta: "dle.rae.es"
      },
      {
        autor: "Real Academia Espa\u00f1ola",
        obra: "Diccionario panhisp\u00e1nico de dudas (2005)",
        detalle: "Respuestas a dudas concretas de uso: deque\u00edsmo, reg\u00edmenes verbales, dobles participios.",
        url: "https://www.rae.es",
        etiqueta: "rae.es"
      },
      {
        autor: "Fund\u00e9u RAE",
        obra: "Recomendaciones ling\u00fc\u00edsticas",
        detalle: "Orientaciones sobre escritura y estilo; base de varias explicaciones de esta herramienta.",
        url: "https://www.fundeu.es",
        etiqueta: "fundeu.es"
      },
      {
        autor: "Manuel Seco",
        obra: "Diccionario de dudas y dificultades de la lengua espa\u00f1ola (1998)",
        detalle: "Cl\u00e1sico de consulta para los usos controvertidos del espa\u00f1ol culto.",
        url: null
      }
    ];

    const bloques = fuentes.map(function (f) {
      const enlace = f.url
        ? '<p class="meta"><a href="' + f.url + '" target="_blank" rel="noopener">' + util.escape(f.etiqueta) + "</a></p>"
        : "";
      return (
        '<div class="seccion-teoria">' +
        "<h3>" + util.escape(f.obra) + "</h3>" +
        "<p>" + util.escape(f.autor) + ". " + util.escape(f.detalle) + "</p>" +
        enlace + "</div>"
      );
    }).join("");

    app().innerHTML =
      '<p class="migas"><a href="#/">\u2190 Temas</a> / Referencias</p>' +
      "<h1>Referencias</h1>" +
      '<p class="entradilla">Esta herramienta honra a <strong>Elio Antonio de Nebrija</strong> (c. 1444\u20131522), nacido en <strong>Lebrija</strong> (Sevilla) y autor de la <em>Gram\u00e1tica de la lengua castellana</em> (1492), la primera gram\u00e1tica impresa de una lengua romance moderna. Todo el contenido sigue la norma culta fijada por las obras que se listan.</p>' +
      bloques;
  }

  /* ---------- enrutador ---------- */

  /* Lleva el foco al encabezado de la vista (ui.spec §10.2): la
     navegación por hash re-renderiza #app sin recargar la página. */
  function enfocarVista() {
    const h = app().querySelector("h1, h2");
    if (!h) return;
    if (!h.hasAttribute("tabindex")) h.setAttribute("tabindex", "-1");
    h.focus({ preventScroll: true });
  }

  function navegar() {
    const hash = location.hash.replace(/^#\/?/, "");
    const partes = hash.split("/").filter(Boolean);
    window.scrollTo(0, 0);

    let rutaMenu = "inicio";
    if (partes.length && ["examen", "errores", "referencias", "corrector"].indexOf(partes[0]) !== -1) {
      rutaMenu = partes[0];
    }
    marcarActivo(rutaMenu);
    actualizarLateral();

    if (partes.length === 0) { vistaInicio(); enfocarVista(); return; }
    if (partes[0] === "examen") { vistaExamen(); enfocarVista(); return; }
    if (partes[0] === "errores") { vistaErrores(); enfocarVista(); return; }
    if (partes[0] === "referencias") { vistaReferencias(); enfocarVista(); return; }
    if (partes[0] === "corrector") { GV.vistaCorrector(); enfocarVista(); return; }
    if (partes[0] === "tema" && partes[1]) {
      const tema = GV.obtenerTema(partes[1]);
      if (!tema) { vistaInicio(); enfocarVista(); return; }
      if (partes[2] === "practica") { vistaPractica(tema); enfocarVista(); return; }
      vistaTema(tema); enfocarVista(); return;
    }
    vistaInicio();
    enfocarVista();
  }

  window.addEventListener("hashchange", navegar);
  document.addEventListener("DOMContentLoaded", navegar);
})();
