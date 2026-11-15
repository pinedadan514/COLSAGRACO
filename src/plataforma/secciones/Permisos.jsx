import { useState } from 'react';
import { aFecha, formatoFecha } from '../../comun/utilidades.js';

// Fecha de hoy en formato AAAA-MM-DD (el que usan los campos tipo "date")
function hoyTexto() {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const diaMes = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${diaMes}`;
}

function mostrarFecha(texto) {
  return formatoFecha(aFecha(texto), { day: 'numeric', month: 'short', year: 'numeric' });
}

const CLASE_ESTADO = { 'En revisión': 'pronto', Aprobado: '', Rechazado: 'urgente' };

function Permisos({ datos, actualizar, llamar }) {
  const { permisos, tiposPermiso } = datos;
  const formularioVacio = () => ({ tipo: tiposPermiso[0], desde: hoyTexto(), hasta: hoyTexto(), motivo: '' });

  const [formulario, setFormulario] = useState(formularioVacio);
  const [mensaje, setMensaje] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const cambiar = (campo) => (e) => setFormulario({ ...formulario, [campo]: e.target.value });

  const enviar = async (e) => {
    e.preventDefault();

    if (formulario.motivo.trim().length < 10) {
      setMensaje({ tipo: 'error', texto: 'Describe el motivo con al menos 10 caracteres.' });
      return;
    }
    if (formulario.hasta < formulario.desde) {
      setMensaje({ tipo: 'error', texto: 'La fecha final no puede ser anterior a la fecha inicial.' });
      return;
    }

    setEnviando(true);
    try {
      const nueva = await llamar('/api/estudiante/permisos', { metodo: 'POST', cuerpo: formulario });
      actualizar((d) => ({ permisos: [nueva, ...d.permisos] }));
      setFormulario(formularioVacio());
      setMensaje({ tipo: 'exito', texto: 'Solicitud enviada. Coordinación la revisará pronto.' });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    } finally {
      setEnviando(false);
    }
  };

  const cancelar = async (id) => {
    try {
      await llamar(`/api/estudiante/permisos/${id}`, { metodo: 'DELETE' });
      actualizar((d) => ({ permisos: d.permisos.filter((p) => p.id !== id) }));
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    }
  };

  return (
    <div className="columnas">
      <section className="panel">
        <h3 className="panel-subtitulo">Nueva solicitud</h3>
        <form className="formulario" onSubmit={enviar}>
          <label htmlFor="tipo">Tipo de permiso</label>
          <select id="tipo" value={formulario.tipo} onChange={cambiar('tipo')}>
            {tiposPermiso.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>

          <div className="formulario-fila">
            <div>
              <label htmlFor="desde">Desde</label>
              <input id="desde" type="date" value={formulario.desde} onChange={cambiar('desde')} required />
            </div>
            <div>
              <label htmlFor="hasta">Hasta</label>
              <input id="hasta" type="date" value={formulario.hasta} min={formulario.desde} onChange={cambiar('hasta')} required />
            </div>
          </div>

          <label htmlFor="motivo">Motivo</label>
          <textarea
            id="motivo"
            rows="5"
            maxLength={1000}
            placeholder="Explica brevemente el motivo del permiso..."
            value={formulario.motivo}
            onChange={cambiar('motivo')}
          />

          <button type="submit" className="boton-primario" disabled={enviando}>
            {enviando ? 'Enviando...' : 'Enviar solicitud'}
          </button>

          {mensaje && <p className={`aviso aviso-${mensaje.tipo}`}>{mensaje.texto}</p>}
        </form>
      </section>

      <section className="panel">
        <h3 className="panel-subtitulo">Mis solicitudes</h3>
        {permisos.length === 0 ? (
          <p className="vacio">Todavía no has enviado solicitudes de permiso.</p>
        ) : (
          <ul className="solicitudes">
            {permisos.map((s) => (
              <li key={s.id}>
                <div className="solicitud-cabeza">
                  <strong>{s.tipo}</strong>
                  <span className={`etiqueta ${CLASE_ESTADO[s.estado] ?? ''}`}>{s.estado}</span>
                </div>
                <small>
                  {s.desde === s.hasta
                    ? mostrarFecha(s.desde)
                    : `${mostrarFecha(s.desde)} al ${mostrarFecha(s.hasta)}`}
                </small>
                <p>{s.motivo}</p>
                <div className="solicitud-pie">
                  <small>Enviada el {formatoFecha(new Date(s.enviada), { day: 'numeric', month: 'short', year: 'numeric' })}</small>
                  {s.estado === 'En revisión' && (
                    <button type="button" className="enlace peligro" onClick={() => cancelar(s.id)}>
                      Cancelar solicitud
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default Permisos;
