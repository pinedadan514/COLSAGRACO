import Icono from '../../comun/Icono.jsx';
import { desempeno } from '../../comun/utilidades.js';

function Materias({ datos, irA }) {
  const { materias, tareas, asistencia } = datos;

  if (materias.length === 0) {
    return (
      <section className="panel">
        <p className="vacio">Todavía no hay materias asignadas a tu grado. Los docentes las agregan desde su plataforma.</p>
      </section>
    );
  }

  return (
    <>
      <p className="seccion-intro">
        Estas son tus materias de grado {datos.perfil.grado}° con su docente, tu nota y tu asistencia.
      </p>
      <div className="rejilla">
        {materias.map((m) => {
          const nivel = desempeno(m.nota);
          const pendientes = tareas.filter((t) => t.materiaId === m.id && !t.entregada).length;
          const a = asistencia.find((x) => x.materiaId === m.id);
          const porcentaje = a?.clases ? Math.round((a.asistidas / a.clases) * 100) : null;
          return (
            <article key={m.id} className="materia" style={{ '--color': m.color }}>
              <div className="materia-cabeza">
                <span className="materia-letra">{m.nombre[0]}</span>
                <div>
                  <h3>{m.nombre}</h3>
                  <small>Prof. {m.docente}</small>
                </div>
              </div>

              <ul className="materia-datos">
                <li>
                  <Icono nombre="tareas" tamano={16} /> {pendientes}{' '}
                  {pendientes === 1 ? 'tarea pendiente' : 'tareas pendientes'}
                </li>
                <li>
                  <Icono nombre="asistencia" tamano={16} />{' '}
                  {porcentaje === null ? 'Sin registros de asistencia' : `Asistencia: ${porcentaje}% (${a.asistidas} de ${a.clases} clases)`}
                </li>
              </ul>

              {porcentaje !== null && (
                <div className="barra-progreso">
                  <span style={{ width: `${porcentaje}%` }} />
                </div>
              )}

              <div className="materia-pie">
                <div>
                  <small>Nota actual</small>
                  <strong>{m.nota === null ? '—' : m.nota.toFixed(1)}</strong>
                </div>
                <span className={`desempeno ${nivel.clase}`}>{nivel.nombre}</span>
                <button type="button" className="boton-pequeno" onClick={() => irA('chat', m.docenteId)}>
                  <Icono nombre="chat" tamano={16} /> Escribir
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

export default Materias;
