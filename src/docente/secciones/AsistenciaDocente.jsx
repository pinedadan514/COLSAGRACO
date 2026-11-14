import { useState } from 'react';
import SelectorClase from '../SelectorClase.jsx';
import { useClase } from '../useClase.js';
import { hoyTexto } from '../../comun/utilidades.js';

const ESTADOS = [
  { id: 'Presente', corto: 'P', clase: 'presente' },
  { id: 'Falta', corto: 'F', clase: 'falta' },
  { id: 'Tardanza', corto: 'T', clase: 'tardanza' },
  { id: 'Excusa', corto: 'E', clase: 'excusa' }
];

// Lista de asistencia de una clase en una fecha. Se monta de nuevo al cambiar la clase o la fecha.
function TablaAsistencia({ clase, fecha, estudiantes, llamar }) {
  const yaRegistrada = estudiantes.some((e) => e.estado);
  const [registros, setRegistros] = useState(() =>
    Object.fromEntries(estudiantes.map((e) => [e.id, { estado: e.estado || 'Presente', observacion: e.observacion }]))
  );
  const [mensaje, setMensaje] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const cambiar = (id, cambio) => {
    setRegistros({ ...registros, [id]: { ...registros[id], ...cambio } });
    setMensaje(null);
  };

  const todosPresentes = () => {
    setRegistros(Object.fromEntries(estudiantes.map((e) => [e.id, { estado: 'Presente', observacion: '' }])));
  };

  const conteo = Object.fromEntries(
    ESTADOS.map((s) => [s.id, Object.values(registros).filter((r) => r.estado === s.id).length])
  );

  const guardar = async () => {
    setGuardando(true);
    try {
      const respuesta = await llamar('/api/docente/asistencia', {
        metodo: 'PUT',
        cuerpo: {
          materiaId: clase.materiaId,
          grado: clase.grado,
          fecha,
          registros: estudiantes.map((e) => ({ estudianteId: e.id, ...registros[e.id] }))
        }
      });
      setMensaje({ tipo: 'exito', texto: respuesta.mensaje });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    } finally {
      setGuardando(false);
    }
  };

  if (estudiantes.length === 0) {
    return <p className="vacio">No hay estudiantes registrados en grado {clase.grado}°.</p>;
  }

  return (
    <>
      <div className="asistencia-resumen">
        {yaRegistrada && <span className="etiqueta">Ya registrada este día · puedes corregirla</span>}
        {ESTADOS.map((s) => (
          <span key={s.id} className={`estado-conteo ${s.clase}`}>{s.id}: {conteo[s.id]}</span>
        ))}
        <button type="button" className="boton-pequeno" onClick={todosPresentes}>Todos presentes</button>
      </div>

      <div className="tabla-contenedor">
        <table className="tabla">
          <thead>
            <tr>
              <th>#</th>
              <th>Estudiante</th>
              <th>Asistencia</th>
              <th>Observación</th>
            </tr>
          </thead>
          <tbody>
            {estudiantes.map((e, i) => (
              <tr key={e.id}>
                <td>{i + 1}</td>
                <td><strong>{e.nombre}</strong></td>
                <td>
                  <div className="estados" role="radiogroup" aria-label={`Asistencia de ${e.nombre}`}>
                    {ESTADOS.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        role="radio"
                        aria-checked={registros[e.id].estado === s.id}
                        className={`${s.clase} ${registros[e.id].estado === s.id ? 'activo' : ''}`}
                        title={s.id}
                        onClick={() => cambiar(e.id, { estado: s.id })}
                      >
                        {s.corto}
                      </button>
                    ))}
                  </div>
                </td>
                <td>
                  {registros[e.id].estado !== 'Presente' && (
                    <input
                      type="text"
                      className="campo-observacion"
                      placeholder="Opcional"
                      maxLength={150}
                      value={registros[e.id].observacion}
                      onChange={(ev) => cambiar(e.id, { observacion: ev.target.value })}
                      aria-label={`Observación de ${e.nombre}`}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="nota-ayuda">P = Presente · F = Falta · T = Tardanza (llegó tarde) · E = Excusa</p>

      <div className="barra-guardar">
        <span>{estudiantes.length} estudiantes</span>
        <button type="button" className="boton-primario" onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando...' : 'Guardar asistencia'}
        </button>
      </div>
      {mensaje && <p className={`aviso aviso-${mensaje.tipo}`}>{mensaje.texto}</p>}
    </>
  );
}

function AsistenciaDocente({ datos, llamar }) {
  const [clase, setClase] = useState(datos.asignaciones[0] ?? null);
  const [fecha, setFecha] = useState(hoyTexto());
  const fechaValida = /^\d{4}-\d{2}-\d{2}$/.test(fecha) && fecha <= hoyTexto();
  const { estudiantes, error, cargando } = useClase(llamar, fechaValida ? clase : null, fecha);

  if (datos.asignaciones.length === 0) {
    return <section className="panel"><p className="vacio">Primero elige tus materias y grados en "Mis materias".</p></section>;
  }

  return (
    <section className="panel">
      <div className="barra-herramientas">
        <div>
          <label htmlFor="clase-asistencia">Clase</label>
          <SelectorClase id="clase-asistencia" asignaciones={datos.asignaciones} materias={datos.materias} valor={clase} onCambiar={setClase} />
        </div>
        <div>
          <label htmlFor="fecha-asistencia">Fecha</label>
          <input id="fecha-asistencia" type="date" value={fecha} max={hoyTexto()} onChange={(e) => setFecha(e.target.value)} />
        </div>
      </div>

      {!clase ? (
        <p className="vacio">Elige una clase para tomar asistencia.</p>
      ) : !fechaValida ? (
        <p className="aviso aviso-error">Elige una fecha de hoy o anterior.</p>
      ) : cargando ? (
        <p className="vacio">Cargando estudiantes...</p>
      ) : error ? (
        <p className="aviso aviso-error">{error}</p>
      ) : (
        <TablaAsistencia
          key={`${clase.materiaId}-${clase.grado}-${fecha}`}
          clase={clase}
          fecha={fecha}
          estudiantes={estudiantes}
          llamar={llamar}
        />
      )}
    </section>
  );
}

export default AsistenciaDocente;
