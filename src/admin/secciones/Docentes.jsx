import { useState } from 'react';

const VACIO = { documento: '', nombres: '', primerApellido: '', segundoApellido: '', celular: '', correo: '' };

function Docentes({ datos, llamar, recargar }) {
  const [formulario, setFormulario] = useState(VACIO);
  const [mensaje, setMensaje] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const cambiar = (campo) => (e) => setFormulario({ ...formulario, [campo]: e.target.value });

  const crear = async (e) => {
    e.preventDefault();
    if (!/^\d{5,15}$/.test(formulario.documento.replace(/\D/g, ''))) {
      return setMensaje({ tipo: 'error', texto: 'El documento debe tener entre 5 y 15 números.' });
    }
    if (!formulario.nombres.trim() || !formulario.primerApellido.trim()) {
      return setMensaje({ tipo: 'error', texto: 'Escribe los nombres y el primer apellido.' });
    }
    setGuardando(true);
    try {
      const { claveInicial } = await llamar('/api/admin/docentes', { metodo: 'POST', cuerpo: formulario });
      setMensaje({
        tipo: 'exito',
        texto: `Cuenta creada. Usuario: ${formulario.documento.replace(/\D/g, '')} · Contraseña inicial: ${claveInicial}`
      });
      setFormulario(VACIO);
      recargar();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    } finally {
      setGuardando(false);
    }
  };

  const restablecer = async (d) => {
    if (!window.confirm(`¿Restablecer la contraseña de ${d.nombre}? Volverá a ser la contraseña inicial.`)) return;
    try {
      const { clave } = await llamar(`/api/admin/usuarios/${d.id}/restablecer`, { metodo: 'POST' });
      setMensaje({ tipo: 'exito', texto: `La contraseña de ${d.nombre} ahora es: ${clave}` });
      recargar();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    }
  };

  return (
    <div className="columnas columnas-formulario">
      <section className="panel">
        <h3 className="panel-subtitulo">Crear cuenta de docente</h3>
        <form className="formulario" onSubmit={crear}>
          <label htmlFor="doc-docente">Número de documento</label>
          <input id="doc-docente" inputMode="numeric" maxLength={15} value={formulario.documento} onChange={cambiar('documento')} />

          <label htmlFor="nombres-docente">Nombres</label>
          <input id="nombres-docente" maxLength={80} value={formulario.nombres} onChange={cambiar('nombres')} />

          <div className="formulario-fila">
            <div>
              <label htmlFor="ape1-docente">Primer apellido</label>
              <input id="ape1-docente" maxLength={60} value={formulario.primerApellido} onChange={cambiar('primerApellido')} />
            </div>
            <div>
              <label htmlFor="ape2-docente">Segundo apellido</label>
              <input id="ape2-docente" maxLength={60} value={formulario.segundoApellido} onChange={cambiar('segundoApellido')} />
            </div>
          </div>

          <div className="formulario-fila">
            <div>
              <label htmlFor="cel-docente">Celular</label>
              <input id="cel-docente" type="tel" maxLength={20} value={formulario.celular} onChange={cambiar('celular')} />
            </div>
            <div>
              <label htmlFor="correo-docente">Correo</label>
              <input id="correo-docente" type="email" maxLength={120} value={formulario.correo} onChange={cambiar('correo')} />
            </div>
          </div>

          <button type="submit" className="boton-primario" disabled={guardando}>
            {guardando ? 'Creando...' : 'Crear docente'}
          </button>
          {mensaje && <p className={`aviso aviso-${mensaje.tipo}`}>{mensaje.texto}</p>}
        </form>
        <p className="nota-ayuda">
          La contraseña inicial sigue la misma regla que los estudiantes: primer apellido + dos primeros números del documento.
          El docente elige sus materias y grados desde su propia plataforma.
        </p>
      </section>

      <section className="panel">
        <h3 className="panel-subtitulo">Docentes registrados ({datos.docentes.length})</h3>
        {datos.docentes.length === 0 ? (
          <p className="vacio">Aún no hay docentes.</p>
        ) : (
          <ul className="solicitudes">
            {datos.docentes.map((d) => (
              <li key={d.id}>
                <div className="solicitud-cabeza">
                  <strong>{d.nombre}</strong>
                  <span className={`etiqueta ${d.debeCambiarClave ? 'pronto' : ''}`}>
                    {d.debeCambiarClave ? 'No ha ingresado' : 'Activo'}
                  </span>
                </div>
                <small>Documento {d.documento}{d.celular ? ` · Cel. ${d.celular}` : ''}</small>
                <p>{d.asignaciones.length ? d.asignaciones.join(' · ') : 'Todavía no ha elegido materias.'}</p>
                <div className="solicitud-pie">
                  <span />
                  <button type="button" className="enlace" onClick={() => restablecer(d)}>Restablecer contraseña</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default Docentes;
