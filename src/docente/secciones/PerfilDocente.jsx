import { useState } from 'react';
import CambiarClaveForm from '../../comun/CambiarClaveForm.jsx';
import { iniciales } from '../../comun/utilidades.js';

// "Mi perfil" para docentes y administradores: datos de contacto y cambio de contraseña
function PerfilDocente({ datos, actualizar, llamar, rol = 'Docente' }) {
  const { perfil, usuario } = datos;
  const [borrador, setBorrador] = useState({ celular: perfil.celular, correo: perfil.correo, direccion: perfil.direccion });
  const [mensaje, setMensaje] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const contacto = await llamar('/api/cuenta/contacto', { metodo: 'PUT', cuerpo: borrador });
      actualizar((d) => ({ perfil: { ...d.perfil, ...contacto } }));
      setMensaje({ tipo: 'exito', texto: 'Datos guardados.' });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    } finally {
      setGuardando(false);
    }
  };

  const nombre = perfil.nombreCompleto || usuario.documento;

  return (
    <div className="perfil">
      <section className="panel perfil-tarjeta">
        <span className="avatar grande">{iniciales(nombre)}</span>
        <h2>{nombre}</h2>
        <p>Documento {usuario.documento}</p>
        <span className="etiqueta">{rol}</span>
      </section>

      <div className="perfil-columna">
        <section className="panel">
          <h3 className="panel-subtitulo">Datos de contacto</h3>
          <form className="formulario" onSubmit={guardar}>
            <div className="formulario-fila">
              <div>
                <label htmlFor="celular-perfil">Celular</label>
                <input
                  id="celular-perfil"
                  type="tel"
                  maxLength={20}
                  value={borrador.celular}
                  onChange={(e) => setBorrador({ ...borrador, celular: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="correo-perfil">Correo electrónico</label>
                <input
                  id="correo-perfil"
                  type="email"
                  maxLength={120}
                  value={borrador.correo}
                  onChange={(e) => setBorrador({ ...borrador, correo: e.target.value })}
                />
              </div>
            </div>
            <label htmlFor="direccion-perfil">Dirección</label>
            <input
              id="direccion-perfil"
              maxLength={150}
              value={borrador.direccion}
              onChange={(e) => setBorrador({ ...borrador, direccion: e.target.value })}
            />
            <button type="submit" className="boton-primario" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar datos'}
            </button>
            {mensaje && <p className={`aviso aviso-${mensaje.tipo}`}>{mensaje.texto}</p>}
          </form>
          <p className="nota-ayuda">Tu celular se usa para enviarte el PIN si olvidas tu contraseña.</p>
        </section>

        <section className="panel">
          <h3 className="panel-subtitulo">Cambiar contraseña</h3>
          <CambiarClaveForm />
        </section>
      </div>
    </div>
  );
}

export default PerfilDocente;
