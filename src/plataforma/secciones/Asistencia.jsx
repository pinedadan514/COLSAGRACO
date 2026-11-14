import { formatoFecha, totalesAsistencia } from '../../comun/utilidades.js';

function Asistencia({ datos, irA }) {
  const { asistencia, novedades, materias } = datos;
  const totales = totalesAsistencia(asistencia);
  const nombreMateria = (id) => materias.find((m) => m.id === id)?.nombre ?? id;

  if (asistencia.length === 0) {
    return (
      <section className="panel">
        <p className="vacio">Todavía no hay registros de asistencia para ti.</p>
      </section>
    );
  }

  return (
    <>
      <section className="resumen">
        <div className="resumen-tarjeta estatica">
          <div className="anillo" style={{ '--valor': totales.porcentaje }}>
            <span>{totales.porcentaje}%</span>
          </div>
          <small>Asistencia general</small>
        </div>
        <div className="resumen-tarjeta estatica">
          <strong>{totales.asistidas}</strong>
          <small>Clases asistidas de {totales.clases}</small>
        </div>
        <div className="resumen-tarjeta estatica">
          <strong className="texto-rojo">{totales.clases - totales.asistidas}</strong>
          <small>Faltas</small>
        </div>
        <div className="resumen-tarjeta estatica">
          <strong className="texto-naranja">{totales.tardanzas}</strong>
          <small>Llegadas tarde</small>
        </div>
      </section>

      <div className="columnas">
        <section className="panel">
          <h3 className="panel-subtitulo">Asistencia por materia</h3>
          <ul className="asistencia-lista">
            {asistencia.map((a) => {
              const p = a.clases ? Math.round((a.asistidas / a.clases) * 100) : 100;
              return (
                <li key={a.materiaId}>
                  <div className="progreso-texto">
                    <span>{nombreMateria(a.materiaId)}</span>
                    <span className={p < 90 ? 'texto-rojo' : ''}>
                      {a.asistidas}/{a.clases} · {p}%
                    </span>
                  </div>
                  <div className="barra-progreso">
                    <span style={{ width: `${p}%`, background: p < 90 ? 'var(--naranja)' : 'var(--verde-claro)' }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="panel">
          <h3 className="panel-subtitulo">Novedades recientes</h3>
          {novedades.length === 0 ? (
            <p className="vacio">No tienes faltas ni llegadas tarde registradas.</p>
          ) : (
            <ul className="lista">
              {novedades.map((r) => (
                <li key={r.id}>
                  <span className="fecha-mini">
                    <b>{r.fecha.getDate()}</b>
                    {formatoFecha(r.fecha, { month: 'short' })}
                  </span>
                  <div>
                    <strong>{nombreMateria(r.materiaId)}</strong>
                    <small>{r.nota}</small>
                  </div>
                  <span className={`etiqueta estado-${r.estado.toLowerCase()}`}>{r.estado}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="nota-ayuda">
            Si faltaste por un motivo justificado,{' '}
            <button type="button" className="enlace" onClick={() => irA('permisos')}>
              envía una solicitud de permiso o excusa
            </button>
            .
          </p>
        </section>
      </div>
    </>
  );
}

export default Asistencia;
