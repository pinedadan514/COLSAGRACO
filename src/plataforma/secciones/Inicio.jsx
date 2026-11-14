import Icono from '../../comun/Icono.jsx';
import { diasRestantes, formatoFecha, promedio, totalesAsistencia } from '../../comun/utilidades.js';

function saludo() {
  const hora = new Date().getHours();
  if (hora < 12) return 'Buenos días';
  if (hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

const NOMBRE_TIPO = { evaluacion: 'Evaluación', festivo: 'Festivo', evento: 'Evento' };

function Inicio({ datos, irA }) {
  const { materias, tareas, eventos, asistencia, comunicados, perfil, usuario } = datos;
  const materiaDe = (id) => materias.find((m) => m.id === id);

  const pendientes = tareas.filter((t) => !t.entregada).sort((a, b) => a.fecha - b.fecha);
  const proximos = eventos.filter((e) => diasRestantes(e.fecha) >= 0).slice(0, 4);
  const porcentajeAsistencia = totalesAsistencia(asistencia).porcentaje;
  const promedioGeneral = promedio(materias);
  const sinLeer = comunicados.filter((c) => !c.leido);

  return (
    <>
      <section className="bienvenida-panel">
        <div>
          <p>{saludo()},</p>
          <h2>{perfil.nombres || usuario.documento}</h2>
          <span>
            {formatoFecha(new Date(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>
        <p className="bienvenida-lema">Unión · Ciencia · Virtud</p>
      </section>

      <section className="resumen">
        <button type="button" className="resumen-tarjeta" onClick={() => irA('tareas')}>
          <span className="resumen-icono rojo"><Icono nombre="tareas" /></span>
          <strong>{pendientes.length}</strong>
          <small>Tareas pendientes</small>
        </button>
        <button type="button" className="resumen-tarjeta" onClick={() => irA('asistencia')}>
          <span className="resumen-icono verde"><Icono nombre="asistencia" /></span>
          <strong>{porcentajeAsistencia === null ? '—' : `${porcentajeAsistencia}%`}</strong>
          <small>Asistencia</small>
        </button>
        <button type="button" className="resumen-tarjeta" onClick={() => irA('materias')}>
          <span className="resumen-icono azul"><Icono nombre="materias" /></span>
          <strong>{promedioGeneral === null ? '—' : promedioGeneral.toFixed(1)}</strong>
          <small>Promedio general</small>
        </button>
        <button type="button" className="resumen-tarjeta" onClick={() => irA('comunicados')}>
          <span className="resumen-icono amarillo"><Icono nombre="comunicados" /></span>
          <strong>{sinLeer.length}</strong>
          <small>Comunicados nuevos</small>
        </button>
      </section>

      <div className="columnas">
        <section className="panel">
          <div className="panel-titulo">
            <h3>Próximas entregas</h3>
            <button type="button" className="enlace" onClick={() => irA('tareas')}>Ver todas</button>
          </div>
          {pendientes.length === 0 ? (
            <p className="vacio">¡No tienes tareas pendientes! 🎉</p>
          ) : (
            <ul className="lista">
              {pendientes.slice(0, 4).map((t) => {
                const materia = materiaDe(t.materiaId);
                const dias = diasRestantes(t.fecha);
                return (
                  <li key={t.id}>
                    <span className="punto" style={{ background: materia?.color }} />
                    <div>
                      <strong>{t.titulo}</strong>
                      <small>{materia?.nombre}</small>
                    </div>
                    <span className={`etiqueta ${dias <= 1 ? 'urgente' : dias <= 3 ? 'pronto' : ''}`}>
                      {dias < 0 ? 'Vencida' : dias === 0 ? 'Hoy' : dias === 1 ? 'Mañana' : formatoFecha(t.fecha)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="panel">
          <div className="panel-titulo">
            <h3>Próximos eventos</h3>
            <button type="button" className="enlace" onClick={() => irA('calendario')}>Calendario</button>
          </div>
          {proximos.length === 0 ? (
            <p className="vacio">No hay eventos próximos.</p>
          ) : (
            <ul className="lista">
              {proximos.map((e) => (
                <li key={e.id}>
                  <span className="fecha-mini">
                    <b>{e.fecha.getDate()}</b>
                    {formatoFecha(e.fecha, { month: 'short' })}
                  </span>
                  <div>
                    <strong>{e.titulo}</strong>
                    <small className={`tipo-${e.tipo}`}>{NOMBRE_TIPO[e.tipo]}</small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {sinLeer.length > 0 && (
        <section className="panel">
          <div className="panel-titulo">
            <h3>Último comunicado</h3>
            <button type="button" className="enlace" onClick={() => irA('comunicados')}>Ver comunicados</button>
          </div>
          <p className="comunicado-destacado">
            <strong>{sinLeer[0].titulo}</strong> — {sinLeer[0].contenido}
          </p>
        </section>
      )}
    </>
  );
}

export default Inicio;
