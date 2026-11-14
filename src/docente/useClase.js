import { useEffect, useState } from 'react';

// Carga la lista de estudiantes de una clase (materia + grado), con su nota y,
// si se indica una fecha, su asistencia de ese día.
export function useClase(llamar, clase, fecha = '') {
  const [estado, setEstado] = useState({ clave: '', estudiantes: [], error: '' });
  const clave = clase ? `${clase.materiaId}|${clase.grado}|${fecha}` : '';

  useEffect(() => {
    if (!clase) return;
    let activo = true;
    const consulta = new URLSearchParams({ materia: clase.materiaId, grado: clase.grado, fecha });
    llamar(`/api/docente/clase?${consulta}`)
      .then((estudiantes) => activo && setEstado({ clave, estudiantes, error: '' }))
      .catch((e) => activo && setEstado({ clave, estudiantes: [], error: e.message }));
    return () => {
      activo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, llamar]);

  const cargando = Boolean(clase) && estado.clave !== clave;
  return { estudiantes: cargando ? [] : estado.estudiantes, error: estado.error, cargando };
}
