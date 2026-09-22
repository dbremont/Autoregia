/* Paleta de órdenes de Lebrija (ui.spec §7.6, alcance mínimo):
   Ctrl/⌘+K abre un buscador sobre los 22 temas (teoría + práctica) y las
   cinco vistas. Sin dependencias; reutiliza las clases .paleta-* de
   css/styles.css. El atajo es un acorde (Ctrl/⌘+K): no interfiere con la
   escritura en los ejercicios (ui.spec §8.1). */
(function () {
  "use strict";

  let overlay = null;
  let entrada = null;
  let lista = null;
  let indiceActivo = 0;
  let visibles = [];
  let ultimoFoco = null;

  function construirEntradas() {
    const entradas = [];
    GV.temasOrdenados().forEach(function (tema) {
      entradas.push({ tipo: "Teoría", titulo: tema.titulo, hash: "#/tema/" + tema.id });
      entradas.push({
        tipo: "Práctica",
        titulo: tema.titulo + " (" + tema.ejercicios.length + " ejercicios)",
        hash: "#/tema/" + tema.id + "/practica"
      });
    });
    entradas.push({ tipo: "Vista", titulo: "Examen mixto", hash: "#/examen" });
    entradas.push({ tipo: "Vista", titulo: "Mis errores", hash: "#/errores" });
    entradas.push({ tipo: "Vista", titulo: "Corrector", hash: "#/corrector" });
    entradas.push({ tipo: "Vista", titulo: "Referencias", hash: "#/referencias" });
    entradas.push({ tipo: "Vista", titulo: "Temas", hash: "#/" });
    return entradas;
  }

  function normalizar(s) {
    return String(s).toLowerCase()
      .replace(/[áàä]/g, "a").replace(/[éèë]/g, "e")
      .replace(/[íìï]/g, "i").replace(/[óòö]/g, "o")
      .replace(/[úùü]/g, "u").replace(/ñ/g, "n");
  }

  function filtrar(q) {
    const todas = construirEntradas();
    const nq = normalizar(q.trim());
    if (!nq) return todas;
    return todas.filter(function (e) {
      return normalizar(e.tipo + " " + e.titulo).indexOf(nq) !== -1;
    });
  }

  function pintar() {
    if (!lista) return;
    lista.innerHTML = visibles.length
      ? visibles.map(function (e, i) {
          return '<li class="paleta-item' + (i === indiceActivo ? " activo" : "") + '"' +
            ' data-i="' + i + '" role="option" aria-selected="' + (i === indiceActivo) + '">' +
            '<span class="paleta-tipo">' + e.tipo + "</span>" +
            "<span>" + GV.util.escape(e.titulo) + "</span></li>";
        }).join("")
      : '<li class="paleta-vacio">Sin resultados para esta búsqueda.</li>';
    lista.querySelectorAll(".paleta-item").forEach(function (li) {
      li.addEventListener("click", function () {
        irA(parseInt(li.getAttribute("data-i"), 10));
      });
      li.addEventListener("mousemove", function () {
        const i = parseInt(li.getAttribute("data-i"), 10);
        if (i !== indiceActivo) { indiceActivo = i; pintar(); }
      });
    });
    const activo = lista.querySelector(".paleta-item.activo");
    if (activo && activo.scrollIntoView) activo.scrollIntoView({ block: "nearest" });
  }

  function irA(i) {
    const e = visibles[i];
    cerrar();
    if (e) location.hash = e.hash;
  }

  function abrir() {
    if (overlay) return;
    ultimoFoco = document.activeElement;
    overlay = document.createElement("div");
    overlay.className = "paleta-overlay";
    overlay.innerHTML =
      '<div class="paleta" role="dialog" aria-modal="true" aria-label="Buscar en Lebrija">' +
      '<input class="paleta-entrada" type="text" autocomplete="off" spellcheck="false" ' +
      'aria-label="Buscar temas y vistas" placeholder="Buscar temas y vistas…">' +
      '<ul class="paleta-lista" role="listbox" aria-label="Resultados"></ul></div>';
    document.body.appendChild(overlay);
    entrada = overlay.querySelector(".paleta-entrada");
    lista = overlay.querySelector(".paleta-lista");
    visibles = filtrar("");
    indiceActivo = 0;
    pintar();
    entrada.addEventListener("input", function () {
      visibles = filtrar(entrada.value);
      indiceActivo = 0;
      pintar();
    });
    entrada.addEventListener("keydown", function (ev) {
      if (ev.key === "ArrowDown") { ev.preventDefault(); mover(1); }
      else if (ev.key === "ArrowUp") { ev.preventDefault(); mover(-1); }
      else if (ev.key === "Enter") { ev.preventDefault(); irA(indiceActivo); }
      else if (ev.key === "Escape") { ev.preventDefault(); cerrar(); }
    });
    overlay.addEventListener("click", function (ev) {
      if (ev.target === overlay) cerrar();
    });
    entrada.focus();
  }

  function mover(d) {
    if (!visibles.length) return;
    indiceActivo = (indiceActivo + d + visibles.length) % visibles.length;
    pintar();
  }

  function cerrar() {
    if (!overlay) return;
    overlay.remove();
    overlay = entrada = lista = null;
    visibles = [];
    if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus();
  }

  document.addEventListener("keydown", function (ev) {
    const acorde = (ev.ctrlKey || ev.metaKey) && !ev.altKey && !ev.shiftKey &&
      (ev.key === "k" || ev.key === "K");
    if (!acorde) return;
    // No robar el atajo dentro de la propia paleta (su Enter/Esc mandan).
    if (overlay && document.activeElement === entrada) return;
    ev.preventDefault();
    if (overlay) cerrar();
    else abrir();
  });

  GV.paleta = { abrir: abrir, cerrar: cerrar };
})();
