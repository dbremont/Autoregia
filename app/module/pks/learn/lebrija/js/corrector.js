/* Vista del corrector: envía el texto al endpoint relativo "api/corregir"
   (resuelve bajo la página que sirve esta vista) y muestra el resultado
   con regla y razón por cada corrección.
   Estado en Autoregia: el backend aún no está conectado — la vista informa
   con honestidad y los ejercicios/examen/repaso funcionan con normalidad. */
(function () {
  "use strict";

  const MAX_CARACTERES = 5000;

  function app() {
    return document.getElementById("app");
  }

  function escapeHtml(texto) {
    return GV.util.escape(texto);
  }

  function estado(mensaje, esError, cargando) {
    const zona = document.getElementById("corrector-estado");
    if (!zona) return;
    zona.className = "corrector-estado" + (esError ? " error" : "");
    zona.innerHTML = (cargando ? '<span class="girador"></span>' : "") + escapeHtml(mensaje);
  }

  function renderCorrecciones(resultado, textoOriginal) {
    const zona = document.getElementById("corrector-resultado");
    if (!zona) return;

    const hayCambios = textoOriginal !== resultado.textoCorregido;
    const lista = resultado.correcciones || [];

    let html =
      '<h2>Texto corregido</h2>' +
      '<div class="texto-corregido">' + escapeHtml(resultado.textoCorregido).replace(/\n/g, "<br>") + "</div>" +
      '<div class="copia-fila"><button class="btn btn-secundario btn-copiar">Copiar texto corregido</button></div>';

    if (!lista.length) {
      html += hayCambios
        ? '<p class="meta">El texto cambió, pero el corrector no detalló las correcciones.</p>'
        : '<div class="feedback ok" style="margin-top:16px"><p class="veredicto">\u2714 Impecable</p><p>El texto ya cumple la norma culta: no encontramos nada que corregir.</p></div>';
    } else {
      html += "<h2>Correcciones (" + lista.length + ")</h2>";
      html += lista.map(function (c) {
        return (
          '<div class="correccion-item">' +
          '<span class="tipo-chip">' + escapeHtml(c.tipo) + "</span>" +
          '<p class="cambio"><span class="tachado">' + escapeHtml(c.original) + "</span>" +
          '<span class="flecha">\u2192</span><strong>' + escapeHtml(c.correccion) + "</strong></p>" +
          (c.regla ? "<h4>Regla</h4><p>" + escapeHtml(c.regla) + "</p>" : "") +
          (c.razon ? "<h4>Razón</h4><p>" + escapeHtml(c.razon) + "</p>" : "") +
          "</div>"
        );
      }).join("");
    }

    zona.innerHTML = html;

    const boton = zona.querySelector(".btn-copiar");
    if (boton) {
      boton.addEventListener("click", function () {
        const escribir = navigator.clipboard && navigator.clipboard.writeText
          ? navigator.clipboard.writeText(resultado.textoCorregido)
          : Promise.reject(new Error("sin clipboard"));
        escribir.then(function () {
          boton.textContent = "\u2714 Copiado";
          setTimeout(function () { boton.textContent = "Copiar texto corregido"; }, 1500);
        }).catch(function () {
          estado("No se pudo copiar automáticamente; selecciona y copia a mano.", true, false);
        });
      });
    }
  }

  function corregir(textarea, boton) {
    const texto = textarea.value.trim();
    if (!texto) {
      estado("Escribe o pega algún texto primero.", true, false);
      return;
    }
    if (!window.location.protocol.startsWith("http")) {
      estado("Estás abriendo la página como archivo local. Entra a través del servidor de Autoregia (/pks/learn/lebrija/) para usar el corrector.", true, false);
      return;
    }

    boton.disabled = true;
    textarea.disabled = true;
    estado("Consultando al corrector…", false, true);

    // Endpoint relativo: resuelve bajo la página servida
    // (/pks/learn/lebrija/api/corregir). Sin backend, el error informa.
    fetch("api/corregir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto: texto })
    })
      .then(function (respuesta) {
        return respuesta.json().catch(function () {
          throw new Error("El corrector aún no está conectado en Autoregia.");
        }).then(function (datos) {
          if (!respuesta.ok) throw new Error(datos.error || "Error desconocido del servidor.");
          return datos;
        });
      })
      .then(function (datos) {
        estado("", false, false);
        renderCorrecciones(datos, texto);
      })
      .catch(function (e) {
        estado(e.message || "El corrector aún no está disponible en Autoregia.", true, false);
      })
      .then(function () {
        boton.disabled = false;
        textarea.disabled = false;
      });
  }

  GV.vistaCorrector = function () {
    app().innerHTML =
      '<p class="migas"><a href="#/">\u2190 Temas</a> / Corrector</p>' +
      "<h1>Corrector</h1>" +
      '<p class="entradilla">Pega tu texto y lo revisaremos según la norma culta. Cada corrección viene con su <strong>regla</strong> y su <strong>razón</strong>, como en los ejercicios. El corrector en línea aún no está conectado en Autoregia: los ejercicios, el examen y el repaso funcionan con normalidad.</p>' +
      '<div class="tarjeta corrector-tarjeta">' +
      '<textarea id="texto-corrector" class="area-texto" aria-label="Texto para corregir" maxlength="' + MAX_CARACTERES +
      '" placeholder="Escribe o pega aquí tu texto (máximo ' + MAX_CARACTERES + " caracteres)…\"></textarea>" +
      '<div class="corrector-fila">' +
      '<span class="meta contador">0 / ' + MAX_CARACTERES + "</span>" +
      '<button class="btn btn-primario btn-corregir">Corregir</button>' +
      "</div>" +
      '<div id="corrector-estado" class="corrector-estado"></div>' +
      '<div id="corrector-resultado"></div>' +
      "</div>";

    const textarea = document.getElementById("texto-corrector");
    const boton = document.querySelector(".btn-corregir");
    const contador = document.querySelector(".contador");

    textarea.addEventListener("input", function () {
      contador.textContent = textarea.value.length + " / " + MAX_CARACTERES;
    });

    boton.addEventListener("click", function () {
      corregir(textarea, boton);
    });

    textarea.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) {
        ev.preventDefault();
        corregir(textarea, boton);
      }
    });

    textarea.focus();
  };
})();
