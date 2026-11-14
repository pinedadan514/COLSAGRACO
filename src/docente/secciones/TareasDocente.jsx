import { useState } from 'react';
import SelectorClase from '../SelectorClase.jsx';
import { aFecha, diasRestantes, formatoFecha, hoyTexto } from '../../comun/utilidades.js';

function TareasDocente({ datos, actualizar, llamar }) {
  const { asignaciones, materias, tareas, estudiantes } = datos;
  const vacio = () => ({ clase: asignaciones[0] ?? null, titulo: '', descripcion: '', fecha: '' });
  const [formulario, setFormulario] = useState(vacio);
  const [mensaje, setMensaje] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [verPasadas, setVerPasadas] = useState(false);

  const nombreMateria = (id) => materias.find((m) => m.id === id)?.nombre ?? id;
  const colorMateria = (id) => materias.find((m) => m.id === id)?.color;
  const enGrado = (g) => estudiantes.filter((e) => e.grado === g).length;

  if (asignaciones.length === 0) {
    return <section className="panel"><p className="vacio">Primero elige tus materias y grados en "Mis materias".</p></section>;
  }

  const crear = async (e) => {
    e.preventDefault();
    const { clase, titulo, descripcion, fecha } = formulario;
    if (!clase) return setMensaje({ tipo: 'error', texto: 'Elige la materia y el grado.' });
    if (titulo.trim().length < 3) return setMensaje({ tipo: 'error', texto: 'Escribe un título de al menos 3 letras.' });
    if (!fecha) return setMensaje({ tipo: 'error', texto: 'Elige la fecha de entrega.' });

    setGuardando(true);
    try {
      const nueva = await llamar('/api/docente/tareas', {
        metodo: 'POST',
        cuerpo: { materiaId: clase.materiaId, grado: clase.grado, titulo, descripcion, fecha }
      });
      actualizar((d) => ({
        tareas: [...d.tareas, { ...nueva, fecha: aFecha(nueva.fecha) }].sort((a, b) => a.fecha - b.fecha)
      }));
      setFormulario({ ...vacio(), clase });
      setMensaje({ tipo: 'exito', texto: `Tarea publicada para ${nombreMateria(clase.materiaId)} grado ${clase.grado}°.` });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (tarea) => {
    if (!window.confirm(`¿Eliminar la tarea "${tarea.titulo}"? Los estudiantes dejarán de verla.`)) return;
    try {
      await llamar(`/api/docente/tareas/${tarea.id}`, { metodo: 'DELETE' });
      actualizar((d) => ({ tareas: d.tareas.filter((t) => t.id !== tarea.id) }));
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    }
  };

  const activas = tareas.filter((t) => diasRestantes(t.fecha) >= 0);
  const pasadas = tareas.filter((t) => diasRestantes(t.fecha) < 0).reverse();
  const lista = verPasadas ? pasadas : activas;

  return (
    <div className="columnas columnas-formulario">
      <section className="panel">
        <h3 className="panel-subtitulo">Nueva tarea</h3>
        <form className="formulario" onSubmit={crear}>
          <label htmlFor="clase-tarea">Materia y grado</label>
          <SelectorClase
            id="clase-tarea"
            asignaciones={asignaciones}
            materias={materias}
            valor={formulario.clase}
            onCambiar={(clase) => setFormulario({ ...formulario, clase })}
          />

          <label htmlFor="titulo-tarea">Título</label>
          <input
            id="titulo-tarea"
            maxLength={150}
            placeholder="Ej: Taller de fracciones"
            value={formulario.titulo}
            onChange={(e) => setFormulario({ ...formulario, titulo: e.target.value })}
          />

          <label htmlFor="descripcion-tarea">Instrucciones</label>
          <textarea
            id="descripcion-tarea"
            rows="4"
            maxLength={2000}
            placeholder="Explica qué deben hacer los estudiantes..."
            value={formulario.descripcion}
            onChange={(e) => setFormulario({ ...formulario, descripcion: e.target.value })}
          />

          <label htmlFor="fecha-tarea">Fecha de entrega</label>
          <input
            id="fecha-tarea"
            type="date"
            min={hoyTexto()}
            value={formulario.fecha}
            onChange={(e) => setFormulario({ ...formulario, fecha: e.target.value })}
          />

          <button type="submit" className="boton-primario" disabled={guardando}>
            {guardando ? 'Publicando...' : 'Publicar tarea'}
          </button>
          {mensaje && <p className={`aviso aviso-${mensaje.tipo}`}>{mensaje.texto}</p>}
        </form>
      </section>

      <section className="panel">
        <div className="pestanas pestanas-panel">
          <button type="button" className={!verPasadas ? 'activa' : ''} onClick={() => setVerPasadas(false)}>
            Activas ({activas.length})
          </button>
          <button type="button" className={verPasadas ? 'activa' : ''} onClick={() => setVerPasadas(true)}>
            Vencidas ({pasadas.length})
          </button>
        </div>

        {lista.length === 0 ? (
          <p className="vacio">{verPasadas ? 'No hay tareas vencidas.' : 'No tienes tareas activas.'}</p>
        ) : (
          <ul className="solicitudes">
            {lista.map((t) => (
              <li key={t.id} style={{ borderLeft: `4px solid ${colorMateria(t.materiaId)}` }}>
                <div className="solicitud-cabeza">
                  <strong>{t.titulo}</strong>
                  <span className="etiqueta">Grado {t.grado}°</span>
                </div>
                <small>
                  {nombreMateria(t.materiaId)} · Entrega: {formatoFecha(t.fecha, { weekday: 'short', day: 'numeric', month: 'short' })}
                </small>
                {t.descripcion && <p>{t.descripcion}</p>}
                <div className="solicitud-pie">
                  <small>{t.entregas} de {enGrado(t.grado)} estudiantes la marcaron como entregada</small>
                  <button type="button" className="enlace peligro" onClick={() => eliminar(t)}>Eliminar</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default TareasDocente;
