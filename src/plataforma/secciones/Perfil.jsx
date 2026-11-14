import { useState } from 'react';
import CambiarClaveForm from '../../comun/CambiarClaveForm.jsx';
import { aFecha, formatoFecha, iniciales, promedio, totalesAsistencia } from '../../comun/utilidades.js';

// Datos que vienen del Excel del colegio (solo lectura)
const DATOS_COLEGIO = [
  ['documento', 'Documento de identidad'],
  ['fechaNacimiento', 'Fecha de nacimiento'],
  ['acudienteNombre', 'Acudiente'],
  ['acudienteParentesco', 'Parentesco'],
  ['acudienteCelular', 'Celular del acudiente'],
  ['acudienteCorreo', 'Correo del acudiente']
];

// Datos que el estudiante puede actualizar
const CAMPOS_CONTACTO = [
  { id: 'celular', nombre: 'Celular', tipo: 'tel', maximo: 20 },
  { id: 'correo', nombre: 'Correo electrónico', tipo: 'email', maximo: 120 },
  { id: 'direccion', nombre: 'Dirección', tipo: 'text', maximo: 150 }
];

function Perfil({ datos, actualizar, llamar }) {
  const { perfil, usuario, materias, asistencia } = datos;
  const [borrador, setBorrador] = useState(perfil);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const nombreVisible = perfil.nombreCompleto || usuario.documento;
  const promedioGeneral = promedio(materias);
  const porcentaje = totalesAsistencia(asistencia).porcentaje;

  const mostrarDato = (campo) => {
    const valor = perfil[campo];
    if (!valor) return null;
    if (campo === 'fechaNacimiento') return formatoFecha(aFecha(valor), { day: 'numeric', month: 'long', year: 'numeric' });
    return valor;
  };

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setMensaje(null);
    try {
      const contacto = await llamar('/api/cuenta/contacto', {
        metodo: 'PUT',
        cuerpo: { celular: borrador.celular, correo: borrador.correo, direccion: borrador.direccion }
      });
      actualizar((d) => ({ perfil: { ...d.perfil, ...contacto } }));
      setEditando(false);
      setMensaje({ tipo: 'exito', texto: 'Tus datos de contacto se guardaron correctamente.' });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="perfil">
      <section className="panel perfil-tarjeta">
        <span className="avatar grande">{iniciales(nombreVisible)}</span>
        <h2>{nombreVisible}</h2>
        <p>Documento {usuario.documento}</p>
        <span className="etiqueta">Estudiante · Grado {perfil.grado}°</span>

        <dl className="perfil-datos">
          <div><dt>Grado</dt><dd>{perfil.grado}°</dd></div>
          <div><dt>Promedio</dt><dd>{promedioGeneral === null ? '—' : promedioGeneral.toFixed(1)}</dd></div>
          <div><dt>Asistencia</dt><dd>{porcentaje === null ? '—' : `${porcentaje}%`}</dd></div>
          <div><dt>Materias</dt><dd>{materias.length}</dd></div>
        </dl>
      </section>

      <div className="perfil-columna">
        <section className="panel">
          <div className="panel-titulo">
            <h3>Mis datos de contacto</h3>
            {!editando && (
              <button
                type="button"
                className="boton-secundario-plat"
                onClick={() => {
                  setBorrador(perfil);
                  setEditando(true);
                  setMensaje(null);
                }}
              >
                Editar
              </button>
            )}
          </div>

          <form className="formulario perfil-formulario" onSubmit={guardar}>
            {CAMPOS_CONTACTO.map((c) => (
              <div key={c.id}>
                <label htmlFor={c.id}>{c.nombre}</label>
                {editando ? (
                  <input
                    id={c.id}
                    type={c.tipo}
                    maxLength={c.maximo}
                    value={borrador[c.id]}
                    onChange={(e) => setBorrador({ ...borrador, [c.id]: e.target.value })}
                  />
                ) : (
                  <p className={perfil[c.id] ? 'dato' : 'dato vacio-dato'}>{perfil[c.id] || 'Sin registrar'}</p>
                )}
              </div>
            ))}

            {editando && (
              <div className="perfil-botones">
                <button type="button" className="boton-secundario-plat" onClick={() => setEditando(false)}>
                  Cancelar
                </button>
                <button type="submit" className="boton-primario" disabled={guardando}>
                  {guardando ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            )}
          </form>
          <p className="nota-ayuda">
            Tu celular se usa para enviarte el PIN si olvidas tu contraseña. Si no tienes, se usa el del acudiente.
          </p>
          {mensaje && <p className={`aviso aviso-${mensaje.tipo}`}>{mensaje.texto}</p>}
        </section>

        <section className="panel">
          <h3 className="panel-subtitulo">Datos registrados en el colegio</h3>
          <div className="perfil-formulario">
            {DATOS_COLEGIO.map(([campo, nombre]) => (
              <div key={campo}>
                <span className="dato-titulo">{nombre}</span>
                <p className={perfil[campo] ? 'dato' : 'dato vacio-dato'}>{mostrarDato(campo) || 'Sin registrar'}</p>
              </div>
            ))}
          </div>
          <p className="nota-ayuda">Si algún dato está mal, pide a la secretaría del colegio que lo corrija.</p>
        </section>

        <section className="panel">
          <h3 className="panel-subtitulo">Cambiar contraseña</h3>
          <CambiarClaveForm />
        </section>
      </div>
    </div>
  );
}

export default Perfil;
