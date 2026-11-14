import Icono from '../../comun/Icono.jsx';
import { diasRestantes, formatoFecha } from '../../comun/utilidades.js';

function saludo() {
  const hora = new Date().getHours();
  if (hora < 12) return 'Buenos días';
  if (hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function InicioDocente({ datos, irA }) {
  const { asignaciones, materias, estudiantes, tareas, mensajes, perfil, eventos } = datos;
  const nombreMateria = (id) => materias.find((m) => m.id === id)?.nombre ?? id;
  const enGrado = (g) => estudiantes.filter((e) => e.grado === g).length;

  const proximas = tareas.filter((t) => diasRestantes(t.fecha) >= 0).slice(0, 5);
  const sinLeer = mensajes.filter((m) => m.remitente === 'estudiante' && !m.leido).length;
  const proximosEventos = eventos.filter((e) => diasRestantes(e.fecha) >= 0).slice(0, 4);

  return (
    <>
      <section className="bienvenida-panel">
        <div>
          <p>{saludo()},</p>
          <h2>Prof. {perfil.nombres || perfil.nombreCompleto}</h2>
          <span>{formatoFecha(new Date(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
        <p className="bienvenida-lema">Unión · Ciencia · Virtud</p>
      </section>

      {asignaciones.length === 0 && (
        <section className="panel aviso-inicio">
          <div>
            <h3>Empieza eligiendo tus materias</h3>
            <p>Selecciona las materias que dictas y los grados en los que las dictas. Así podrás registrar notas, asistencia y tareas.</p>
          </div>
          <button type="button" className="boton-primario" onClick={() => irA('materias')}>
            Elegir mis materias
          </button>
        </section>
      )}

      <section className="resumen">
        <button type="button" className="resumen-tarjeta" onClick={() => irA('materias')}>
          <span className="resumen-icono azul"><Icono nombre="materias" /></span>
          <strong>{asignaciones.length}</strong>
          <small>Clases asignadas</small>
        </button>
        <button type="button" className="resumen-tarjeta" onClick={() => irA('chat')}>
          <span className="resumen-icono verde"><Icono nombre="perfil" /></span>
          <strong>{estudiantes.length}</strong>
          <small>Estudiantes</small>
        </button>
        <button type="button" className="resumen-tarjeta" onClick={() => irA('tareas')}>
          <span className="resumen-icono rojo"><Icono nombre="tareas" /></span>
          <strong>{proximas.length}</strong>
          <small>Tareas activas</small>
        </button>
        <button type="button" className="resumen-tarjeta" onClick={() => irA('chat')}>
          <span className="resumen-icono amarillo"><Icono nombre="chat" /></span>
          <strong>{sinLeer}</strong>
          <small>Mensajes sin leer</small>
        </button>
      </section>

      <div className="columnas">
        <section className="panel">
          <div className="panel-titulo">
            <h3>Mis clases</h3>
            <button type="button" className="enlace" onClick={() => irA('materias')}>Editar</button>
          </div>
          {asignaciones.length === 0 ? (
            <p className="vacio">Aún no tienes clases asignadas.</p>
          ) : (
            <ul className="lista">
              {asignaciones.map((a) => (
                <li key={`${a.materiaId}-${a.grado}`}>
                  <span className="punto" style={{ background: materias.find((m) => m.id === a.materiaId)?.color }} />
                  <div>
                    <strong>{nombreMateria(a.materiaId)}</strong>
                    <small>{enGrado(a.grado)} estudiantes</small>
                  </div>
                  <span className="etiqueta">Grado {a.grado}°</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <div className="panel-titulo">
            <h3>Próximas entregas</h3>
            <button type="button" className="enlace" onClick={() => irA('tareas')}>Ver tareas</button>
          </div>
          {proximas.length === 0 ? (
            <p className="vacio">No tienes tareas con entrega próxima.</p>
          ) : (
            <ul className="lista">
              {proximas.map((t) => (
                <li key={t.id}>
                  <span className="fecha-mini">
                    <b>{t.fecha.getDate()}</b>
                    {formatoFecha(t.fecha, { month: 'short' })}
                  </span>
                  <div>
                    <strong>{t.titulo}</strong>
                    <small>{nombreMateria(t.materiaId)} · Grado {t.grado}°</small>
                  </div>
                  <span className="etiqueta">{t.entregas}/{enGrado(t.grado)} entregas</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {proximosEventos.length > 0 && (
        <section className="panel">
          <div className="panel-titulo">
            <h3>Próximos eventos del colegio</h3>
            <button type="button" className="enlace" onClick={() => irA('calendario')}>Calendario</button>
          </div>
          <ul className="lista">
            {proximosEventos.map((e) => (
              <li key={e.id}>
                <span className="fecha-mini">
                  <b>{e.fecha.getDate()}</b>
                  {formatoFecha(e.fecha, { month: 'short' })}
                </span>
                <div>
                  <strong>{e.titulo}</strong>
                  <small>{e.grado ? `Grado ${e.grado}°` : 'Todo el colegio'}</small>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

export default InicioDocente;
