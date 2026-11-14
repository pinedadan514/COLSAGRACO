import { useState } from 'react';
import SelectorClase from '../SelectorClase.jsx';
import { useClase } from '../useClase.js';
import { desempeno } from '../../comun/utilidades.js';

// Convierte lo escrito ("4,5", "4.5", "") en número o null
function leerNota(texto) {
  const limpio = String(texto ?? '').trim().replace(',', '.');
  if (limpio === '') return null;
  const n = Number(limpio);
  return Number.isNaN(n) ? NaN : n;
}

// Tabla de notas de una clase. Se monta de nuevo cada vez que cambia la clase.
function TablaNotas({ clase, estudiantes, llamar }) {
  const [valores, setValores] = useState(() =>
    Object.fromEntries(estudiantes.map((e) => [e.id, e.nota === null ? '' : e.nota.toFixed(1)]))
  );
  const [originales, setOriginales] = useState(valores);
  const [mensaje, setMensaje] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const cambiados = estudiantes.filter((e) => valores[e.id] !== originales[e.id]);
  const invalidos = estudiantes.filter((e) => {
    const n = leerNota(valores[e.id]);
    return n !== null && !(n >= 1 && n <= 5);
  });

  const guardar = async () => {
    if (invalidos.length > 0) {
      setMensaje({ tipo: 'error', texto: 'Revisa las notas marcadas en rojo: deben estar entre 1.0 y 5.0.' });
      return;
    }
    setGuardando(true);
    try {
      const respuesta = await llamar('/api/docente/notas', {
        metodo: 'PUT',
        cuerpo: {
          materiaId: clase.materiaId,
          grado: clase.grado,
          notas: cambiados.map((e) => ({ estudianteId: e.id, nota: leerNota(valores[e.id]) }))
        }
      });
      // Mostrar las notas con un decimal, como quedaron guardadas
      const normalizados = Object.fromEntries(
        Object.entries(valores).map(([id, v]) => {
          const n = leerNota(v);
          return [id, n === null ? '' : (Math.round(n * 10) / 10).toFixed(1)];
        })
      );
      setValores(normalizados);
      setOriginales(normalizados);
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
      <div className="tabla-contenedor">
        <table className="tabla">
          <thead>
            <tr>
              <th>#</th>
              <th>Estudiante</th>
              <th>Documento</th>
              <th>Nota (1.0 – 5.0)</th>
              <th>Desempeño</th>
            </tr>
          </thead>
          <tbody>
            {estudiantes.map((e, i) => {
              const n = leerNota(valores[e.id]);
              const malo = n !== null && !(n >= 1 && n <= 5);
              const nivel = desempeno(malo ? null : n);
              return (
                <tr key={e.id}>
                  <td>{i + 1}</td>
                  <td><strong>{e.nombre}</strong></td>
                  <td>{e.documento}</td>
                  <td>
                    <input
                      type="text"
                      inputMode="decimal"
                      className={`campo-nota ${malo ? 'invalido' : ''}`}
                      placeholder="—"
                      maxLength={4}
                      value={valores[e.id]}
                      onChange={(ev) => setValores({ ...valores, [e.id]: ev.target.value })}
                      aria-label={`Nota de ${e.nombre}`}
                    />
                  </td>
                  <td><span className={`desempeno ${nivel.clase}`}>{malo ? 'No válida' : nivel.nombre}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="barra-guardar">
        <span>{cambiados.length === 0 ? 'Sin cambios.' : `${cambiados.length} notas por guardar.`}</span>
        <button type="button" className="boton-primario" onClick={guardar} disabled={guardando || cambiados.length === 0}>
          {guardando ? 'Guardando...' : 'Guardar notas'}
        </button>
      </div>
      {mensaje && <p className={`aviso aviso-${mensaje.tipo}`}>{mensaje.texto}</p>}
    </>
  );
}

function Notas({ datos, llamar }) {
  const [clase, setClase] = useState(datos.asignaciones[0] ?? null);
  const { estudiantes, error, cargando } = useClase(llamar, clase);

  if (datos.asignaciones.length === 0) {
    return <section className="panel"><p className="vacio">Primero elige tus materias y grados en "Mis materias".</p></section>;
  }

  return (
    <section className="panel">
      <div className="barra-herramientas">
        <div>
          <label htmlFor="clase-notas">Clase</label>
          <SelectorClase id="clase-notas" asignaciones={datos.asignaciones} materias={datos.materias} valor={clase} onCambiar={setClase} />
        </div>
      </div>

      {!clase ? (
        <p className="vacio">Elige una clase para registrar notas.</p>
      ) : cargando ? (
        <p className="vacio">Cargando estudiantes...</p>
      ) : error ? (
        <p className="aviso aviso-error">{error}</p>
      ) : (
        <TablaNotas key={`${clase.materiaId}-${clase.grado}`} clase={clase} estudiantes={estudiantes} llamar={llamar} />
      )}
    </section>
  );
}

export default Notas;
