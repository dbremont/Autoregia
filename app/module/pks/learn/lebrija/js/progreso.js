/* Progreso del usuario, persistido en localStorage. */
(function () {
  "use strict";

  const CLAVE = "lebrija:progreso:v1";

  function datosVacios() {
    return { temas: {}, sesiones: [], dias: [] };
  }

  function cargar() {
    try {
      const crudo = JSON.parse(localStorage.getItem(CLAVE));
      if (crudo && crudo.temas) return crudo;
    } catch (e) { /* datos corruptos: se empieza de cero */ }
    return datosVacios();
  }

  let datos = cargar();

  function guardar() {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(datos));
    } catch (e) { /* modo privado: se ignora */ }
  }

  function claveDia(fecha) {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, "0");
    const d = String(fecha.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  }

  GV.progreso = {
    /** Registra el resultado de un ejercicio (idx es su posición dentro del tema). */
    registrarRespuesta(temaId, idx, acierto) {
      const t = datos.temas[temaId] || (datos.temas[temaId] = { aciertos: 0, intentos: 0, fallados: [] });
      t.intentos += 1;
      if (acierto) {
        t.aciertos += 1;
        t.fallados = t.fallados.filter(function (i) { return i !== idx; });
      } else if (t.fallados.indexOf(idx) === -1) {
        t.fallados.push(idx);
      }
      guardar();
    },

    tema(id) {
      return datos.temas[id] || { aciertos: 0, intentos: 0, fallados: [] };
    },

    registrarSesion(aciertos, total) {
      datos.sesiones.push({ fecha: Date.now(), aciertos: aciertos, total: total });
      if (datos.sesiones.length > 200) datos.sesiones = datos.sesiones.slice(-200);
      const hoy = claveDia(new Date());
      if (datos.dias.indexOf(hoy) === -1) {
        datos.dias.push(hoy);
        if (datos.dias.length > 400) datos.dias = datos.dias.slice(-400);
      }
      guardar();
    },

    /** Días seguidos practicando (incluido hoy si se practicó hoy). */
    racha() {
      const vistos = new Set(datos.dias);
      let racha = 0;
      const dia = new Date();
      if (!vistos.has(claveDia(dia))) dia.setDate(dia.getDate() - 1);
      while (vistos.has(claveDia(dia))) {
        racha += 1;
        dia.setDate(dia.getDate() - 1);
      }
      return racha;
    },

    /** Lista de ejercicios fallados y aún no acertados después. */
    fallados() {
      const lista = [];
      Object.keys(datos.temas).forEach(function (temaId) {
        const tema = GV.obtenerTema(temaId);
        if (!tema) return;
        datos.temas[temaId].fallados.forEach(function (idx) {
          if (tema.ejercicios[idx]) {
            lista.push({ tema: tema, idx: idx, ejercicio: tema.ejercicios[idx] });
          }
        });
      });
      return lista;
    },

    resumen() {
      let intentos = 0;
      let aciertos = 0;
      Object.keys(datos.temas).forEach(function (id) {
        intentos += datos.temas[id].intentos;
        aciertos += datos.temas[id].aciertos;
      });
      return {
        intentos: intentos,
        aciertos: aciertos,
        precision: intentos ? Math.round((100 * aciertos) / intentos) : 0
      };
    },

    reiniciar() {
      datos = datosVacios();
      guardar();
    }
  };
})();
