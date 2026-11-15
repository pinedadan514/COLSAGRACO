import { useState } from 'react';
import Icono from '../../comun/Icono.jsx';
import { diasRestantes, formatoFecha } from '../../comun/utilidades.js';

function textoPlazo(dias) {
  if (dias < 0) return `Venció hace ${-dias} ${dias === -1 ? 'día' : 'días'}`;
  if (dias === 0) return 'Se entrega hoy';
  if (dias === 1) return 'Se entrega mañana';
  return `Faltan ${dias} días`;
}

function Tareas({ datos, actualizar, llamar }) {
  const [filtro, setFiltro] = useState('pendientes');
  const [guardando, setGuardando] = useState(null);
  const [error, setError] = useState('');

  const { tareas, materias } = datos;
  const verPendientes = filtro === 'pendientes';
  const lista = tareas
    .filter((t) => t.entregada !== verPendientes)
    .sort((a, b) => (verPendientes ? a.fecha - b.fecha : b.fecha - a.fecha));
  const cantidadPendientes = tareas.filter((t) => !t.entregada).length;

  const alternar = async (tarea) => {
    setGuardando(tarea.id);
    setError('');
    try {
      await llamar(`/api/estudiante/tareas/${tarea.id}/entrega`, {
        metodo: 'PUT',
        cuerpo: { entregada: !tarea.entregada }
      });
      actualizar((d) => ({
        tareas: d.tareas.map((t) => (t.id === tarea.id ? { ...t, entregada: !t.entregada } : t))
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(null);
    }
  };

  return (
    <>
      <div className="pestanas">
        <button type="button" className={verPendientes ? 'activa' : ''} onClick={() => setFiltro('pendientes')}>
          Pendientes ({cantidadPendientes})
        </button>
        <button type="button" className={!verPendientes ? 'activa' : ''} onClick={() => setFiltro('entregadas')}>
          Entregadas ({tareas.length - cantidadPendientes})
        </button>
      </div>

      {error && <p className="aviso aviso-error">{error}</p>}

      {lista.length === 0 ? (
        <section className="panel">
          <p className="vacio">
            {verPendientes ? '¡Estás al día! No tienes tareas pendientes. 🎉' : 'Aún no has entregado tareas.'}
          </p>
        </section>
      ) : (
        <div className="tareas">
          {lista.map((t) => {
            const materia = materias.find((m) => m.id === t.materiaId);
            const dias = diasRestantes(t.fecha);
            const estado = t.entregada ? 'hecha' : dias <= 1 ? 'urgente' : dias <= 3 ? 'pronto' : '';
            return (
              <article key={t.id} className={`tarea ${estado}`} style={{ '--color': materia?.color }}>
                <div className="tarea-cuerpo">
                  <span className="tarea-materia">{materia?.nombre}</span>
                  <h3>{t.titulo}</h3>
                  {t.descripcion && <p>{t.descripcion}</p>}
                  <small>
                    <Icono nombre="calendario" tamano={14} />
                    {formatoFecha(t.fecha, { weekday: 'long', day: 'numeric', month: 'long' })}
                    {!t.entregada && <b> · {textoPlazo(dias)}</b>}
                  </small>
                </div>
                <button
                  type="button"
                  className={t.entregada ? 'boton-secundario-plat' : 'boton-primario'}
                  onClick={() => alternar(t)}
                  disabled={guardando === t.id}
                >
                  {guardando === t.id
                    ? 'Guardando...'
                    : t.entregada
                      ? 'Marcar como pendiente'
                      : (<><Icono nombre="check" tamano={16} /> Marcar entregada</>)}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

export default Tareas;
