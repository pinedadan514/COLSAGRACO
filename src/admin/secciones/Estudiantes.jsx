import { useEffect, useState } from 'react';
import { GRADOS } from '../../comun/utilidades.js';

function Estudiantes({ llamar }) {
  const [grado, setGrado] = useState('6');
  const [busqueda, setBusqueda] = useState('');
  const [lista, setLista] = useState({ grado: null, estudiantes: [] });
  const [mensaje, setMensaje] = useState(null);

  useEffect(() => {
    let activo = true;
    llamar(`/api/admin/estudiantes?grado=${grado}`)
      .then((estudiantes) => activo && setLista({ grado, estudiantes }))
      .catch((e) => activo && setMensaje({ tipo: 'error', texto: e.message }));
    return () => {
      activo = false;
    };
  }, [grado, llamar]);

  const restablecer = async (e) => {
    if (!window.confirm(`¿Restablecer la contraseña de ${e.nombre}? Volverá a ser la contraseña inicial y deberá cambiarla al ingresar.`)) return;
    try {
      const { clave } = await llamar(`/api/admin/usuarios/${e.id}/restablecer`, { metodo: 'POST' });
      setMensaje({ tipo: 'exito', texto: `La contraseña de ${e.nombre} ahora es: ${clave}` });
      setLista((l) => ({ ...l, estudiantes: l.estudiantes.map((x) => (x.id === e.id ? { ...x, debeCambiarClave: true } : x)) }));
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    }
  };

  const cargando = lista.grado !== grado;
  const filtro = busqueda.trim().toLowerCase();
  const visibles = lista.estudiantes.filter(
    (e) => !filtro || e.nombre.toLowerCase().includes(filtro) || e.documento.includes(filtro)
  );

  return (
    <section className="panel">
      <div className="barra-herramientas">
        <div>
          <label htmlFor="grado-lista">Grado</label>
          <select id="grado-lista" value={grado} onChange={(e) => setGrado(e.target.value)}>
            {GRADOS.map((g) => <option key={g} value={g}>Grado {g}°</option>)}
          </select>
        </div>
        <div className="crece">
          <label htmlFor="buscar-estudiante">Buscar</label>
          <input id="buscar-estudiante" type="search" placeholder="Nombre o documento" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
      </div>

      {mensaje && <p className={`aviso aviso-${mensaje.tipo}`}>{mensaje.texto}</p>}

      {cargando ? (
        <p className="vacio">Cargando...</p>
      ) : visibles.length === 0 ? (
        <p className="vacio">No hay estudiantes{filtro ? ' con esa búsqueda' : ` en grado ${grado}°`}.</p>
      ) : (
        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th>Estudiante</th>
                <th>Documento</th>
                <th>Celular</th>
                <th>Acudiente</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visibles.map((e) => (
                <tr key={e.id}>
                  <td><strong>{e.nombre}</strong></td>
                  <td>{e.documento}</td>
                  <td>{e.celular || '—'}</td>
                  <td>
                    {e.acudiente || '—'}
                    {e.acudienteCelular && <small className="bloque">{e.acudienteCelular}</small>}
                  </td>
                  <td>
                    <span className={`etiqueta ${e.debeCambiarClave ? 'pronto' : ''}`}>
                      {e.debeCambiarClave ? 'No ha ingresado' : 'Activo'}
                    </span>
                  </td>
                  <td>
                    <button type="button" className="enlace" onClick={() => restablecer(e)}>Restablecer contraseña</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default Estudiantes;
