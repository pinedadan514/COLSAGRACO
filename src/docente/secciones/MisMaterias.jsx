import { useState } from 'react';
import { GRADOS } from '../../comun/utilidades.js';

// El docente elige las materias que dicta y, en cada una, los grados
function MisMaterias({ datos, llamar, recargar }) {
  const { materias, asignaciones, ocupadas } = datos;

  // seleccion: { materiaId: [grados] }
  const [seleccion, setSeleccion] = useState(() => {
    const inicial = {};
    for (const a of asignaciones) {
      inicial[a.materiaId] = [...(inicial[a.materiaId] ?? []), a.grado];
    }
    return inicial;
  });
  const [mensaje, setMensaje] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const ocupadaPor = (materiaId, grado) =>
    ocupadas.find((o) => o.materiaId === materiaId && o.grado === grado)?.docente;

  const alternarMateria = (materiaId) => {
    const nueva = { ...seleccion };
    if (nueva[materiaId]) delete nueva[materiaId];
    else nueva[materiaId] = [];
    setSeleccion(nueva);
    setMensaje(null);
  };

  const alternarGrado = (materiaId, grado) => {
    const actuales = seleccion[materiaId] ?? [];
    setSeleccion({
      ...seleccion,
      [materiaId]: actuales.includes(grado) ? actuales.filter((g) => g !== grado) : [...actuales, grado].sort((a, b) => a - b)
    });
    setMensaje(null);
  };

  const sinGrados = Object.entries(seleccion).filter(([, grados]) => grados.length === 0);
  const total = Object.values(seleccion).reduce((s, g) => s + g.length, 0);

  const guardar = async () => {
    if (sinGrados.length > 0) {
      const nombres = sinGrados.map(([id]) => materias.find((m) => m.id === id)?.nombre).join(', ');
      setMensaje({ tipo: 'error', texto: `Elige al menos un grado para: ${nombres}` });
      return;
    }
    setGuardando(true);
    try {
      const lista = Object.entries(seleccion).flatMap(([materiaId, grados]) => grados.map((grado) => ({ materiaId, grado })));
      await llamar('/api/docente/asignaciones', { metodo: 'PUT', cuerpo: { asignaciones: lista } });
      setMensaje({ tipo: 'exito', texto: 'Tus materias y grados se guardaron correctamente.' });
      recargar();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <p className="seccion-intro">
        Marca las materias que dictas y luego elige los grados (6° a 11°) en los que dictas cada una. Los grados en gris ya
        los tiene otro docente.
      </p>

      <div className="rejilla rejilla-asignar">
        {materias.map((m) => {
          const elegida = Boolean(seleccion[m.id]);
          return (
            <article key={m.id} className={`materia asignar ${elegida ? 'elegida' : ''}`} style={{ '--color': m.color }}>
              <label className="asignar-cabeza">
                <input type="checkbox" checked={elegida} onChange={() => alternarMateria(m.id)} />
                <span className="materia-letra">{m.nombre[0]}</span>
                <strong>{m.nombre}</strong>
              </label>

              {elegida && (
                <div className="chips" role="group" aria-label={`Grados de ${m.nombre}`}>
                  {GRADOS.map((g) => {
                    const otro = ocupadaPor(m.id, g);
                    const activo = seleccion[m.id].includes(g);
                    return (
                      <button
                        key={g}
                        type="button"
                        className={`chip ${activo ? 'activo' : ''}`}
                        disabled={Boolean(otro)}
                        title={otro ? `La dicta ${otro}` : `Grado ${g}°`}
                        aria-pressed={activo}
                        onClick={() => alternarGrado(m.id, g)}
                      >
                        {g}°
                      </button>
                    );
                  })}
                </div>
              )}
            </article>
          );
        })}
      </div>

      <div className="barra-guardar">
        <span>
          {total === 0 ? 'No has elegido ninguna clase.' : `${total} ${total === 1 ? 'clase elegida' : 'clases elegidas'} (materia + grado)`}
        </span>
        <button type="button" className="boton-primario" onClick={guardar} disabled={guardando}>
          {guardando ? 'Guardando...' : 'Guardar mis materias'}
        </button>
      </div>
      {mensaje && <p className={`aviso aviso-${mensaje.tipo}`}>{mensaje.texto}</p>}
    </>
  );
}

export default MisMaterias;
