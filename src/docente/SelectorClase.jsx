// Lista desplegable para elegir una clase (materia + grado) de las que dicta el docente
function claveClase(c) {
  return c ? `${c.materiaId}|${c.grado}` : '';
}

function SelectorClase({ asignaciones, materias, valor, onCambiar, id = 'clase' }) {
  const nombre = (materiaId) => materias.find((m) => m.id === materiaId)?.nombre ?? materiaId;
  const ordenadas = [...asignaciones].sort(
    (a, b) => nombre(a.materiaId).localeCompare(nombre(b.materiaId)) || a.grado - b.grado
  );

  return (
    <select
      id={id}
      value={claveClase(valor)}
      onChange={(e) => {
        const [materiaId, grado] = e.target.value.split('|');
        onCambiar(materiaId ? { materiaId, grado: Number(grado) } : null);
      }}
    >
      <option value="">Elige materia y grado...</option>
      {ordenadas.map((a) => (
        <option key={claveClase(a)} value={claveClase(a)}>
          {nombre(a.materiaId)} · Grado {a.grado}°
        </option>
      ))}
    </select>
  );
}

export default SelectorClase;
