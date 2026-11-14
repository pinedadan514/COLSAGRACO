import { useState } from 'react';
import { formatoFecha } from '../../comun/utilidades.js';

function Comunicados({ datos, actualizar, llamar }) {
  const { comunicados } = datos;
  const [abierto, setAbierto] = useState(null);

  // Marca como leídos en pantalla de inmediato y lo guarda en el servidor
  const marcarLeidos = (ids) => {
    actualizar((d) => ({
      comunicados: d.comunicados.map((c) => (ids === null || ids.includes(c.id) ? { ...c, leido: true } : c))
    }));
    llamar('/api/comunicados/leidos', { metodo: 'POST', cuerpo: ids === null ? {} : { ids } }).catch(() => {});
  };

  const abrir = (comunicado) => {
    setAbierto(abierto === comunicado.id ? null : comunicado.id);
    if (!comunicado.leido) marcarLeidos([comunicado.id]);
  };

  const sinLeer = comunicados.filter((c) => !c.leido).length;

  return (
    <>
      <div className="panel-titulo">
        <p className="seccion-intro">
          {sinLeer > 0
            ? `Tienes ${sinLeer} ${sinLeer === 1 ? 'comunicado sin leer' : 'comunicados sin leer'}.`
            : 'Has leído todos los comunicados.'}
        </p>
        {sinLeer > 0 && (
          <button type="button" className="enlace" onClick={() => marcarLeidos(null)}>
            Marcar todos como leídos
          </button>
        )}
      </div>

      {comunicados.length === 0 && (
        <section className="panel"><p className="vacio">No hay comunicados publicados.</p></section>
      )}

      <div className="comunicados">
        {comunicados.map((c) => {
          const estaAbierto = abierto === c.id;
          return (
            <article key={c.id} className={`comunicado ${c.leido ? '' : 'nuevo'}`}>
              <button
                type="button"
                className="comunicado-cabeza"
                onClick={() => abrir(c)}
                aria-expanded={estaAbierto}
              >
                <div>
                  <span className="comunicado-meta">
                    <span className="etiqueta">{c.categoria}</span>
                    {c.autor} · {formatoFecha(c.fecha, { day: 'numeric', month: 'long' })}
                  </span>
                  <h3>
                    {!c.leido && <i className="punto-nuevo" aria-label="Sin leer" />}
                    {c.titulo}
                  </h3>
                </div>
                <span className="comunicado-flecha">{estaAbierto ? '−' : '+'}</span>
              </button>
              {estaAbierto && <p className="comunicado-texto">{c.contenido}</p>}
            </article>
          );
        })}
      </div>
    </>
  );
}

export default Comunicados;
