import { useState } from 'react';
import { pedir } from '../api.js';

// Formulario para cambiar la contraseña (se usa al primer ingreso y en "Mi perfil")
function CambiarClaveForm({ onListo, textoBoton = 'Cambiar contraseña' }) {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [mensaje, setMensaje] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const guardar = async (e) => {
    e.preventDefault();
    if (!actual || !nueva || !confirmacion) {
      setMensaje({ tipo: 'error', texto: 'Completa todos los campos.' });
      return;
    }
    if (nueva.length < 6) {
      setMensaje({ tipo: 'error', texto: 'La nueva contraseña debe tener al menos 6 caracteres.' });
      return;
    }
    if (nueva !== confirmacion) {
      setMensaje({ tipo: 'error', texto: 'Las contraseñas nuevas no coinciden.' });
      return;
    }

    setGuardando(true);
    try {
      const respuesta = await pedir('/api/cambiar-clave', { metodo: 'POST', cuerpo: { actual, nueva } });
      setActual('');
      setNueva('');
      setConfirmacion('');
      setMensaje({ tipo: 'exito', texto: respuesta.mensaje });
      onListo?.();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form className="formulario" onSubmit={guardar}>
      <label htmlFor="clave-actual">Contraseña actual</label>
      <input
        id="clave-actual"
        type="password"
        autoComplete="current-password"
        value={actual}
        onChange={(e) => setActual(e.target.value)}
      />

      <label htmlFor="clave-nueva">Nueva contraseña</label>
      <input
        id="clave-nueva"
        type="password"
        autoComplete="new-password"
        placeholder="Mínimo 6 caracteres"
        value={nueva}
        onChange={(e) => setNueva(e.target.value)}
      />

      <label htmlFor="clave-confirmacion">Repite la nueva contraseña</label>
      <input
        id="clave-confirmacion"
        type="password"
        autoComplete="new-password"
        value={confirmacion}
        onChange={(e) => setConfirmacion(e.target.value)}
      />

      <button type="submit" className="boton-primario" disabled={guardando}>
        {guardando ? 'Guardando...' : textoBoton}
      </button>

      {mensaje && <p className={`aviso aviso-${mensaje.tipo}`}>{mensaje.texto}</p>}
    </form>
  );
}

export default CambiarClaveForm;
