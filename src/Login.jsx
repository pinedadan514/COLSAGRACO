import { useState } from 'react';
import escudo from './assets/escudo.jpg';
import { pedir } from './api.js';
import './App.css';

// Pantalla de inicio: ingresar con documento o recuperar la contraseña con un PIN por SMS
function Login({ onIngresar }) {
  // 'login' | 'recuperar' (pedir documento) | 'pin' (escribir PIN y nueva contraseña)
  const [modo, setModo] = useState('login');
  const [documento, setDocumento] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [pin, setPin] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [mensaje, setMensaje] = useState(null);
  const [cargando, setCargando] = useState(false);

  const mostrar = (texto, tipo = 'info') => setMensaje({ texto, tipo });

  const cambiarModo = (nuevoModo) => {
    setModo(nuevoModo);
    setMensaje(null);
    setContrasena('');
    setPin('');
    setNueva('');
    setConfirmacion('');
  };

  // Ejecuta una acción mostrando "cargando" y los errores del servidor
  const conCarga = async (accion) => {
    setCargando(true);
    try {
      await accion();
    } catch (error) {
      mostrar(error.message, 'error');
    } finally {
      setCargando(false);
    }
  };

  const ingresar = (e) => {
    e.preventDefault();
    if (!documento.trim() || !contrasena) {
      mostrar('Ingresa tu número de documento y tu contraseña.', 'error');
      return;
    }
    conCarga(async () => {
      mostrar('Validando...');
      const respuesta = await pedir('/api/login', {
        metodo: 'POST',
        cuerpo: { documento: documento.trim(), contrasena }
      });
      onIngresar({ token: respuesta.token, usuario: respuesta.usuario });
    });
  };

  const solicitarPin = (e) => {
    e?.preventDefault();
    if (!documento.trim()) {
      mostrar('Ingresa tu número de documento.', 'error');
      return;
    }
    conCarga(async () => {
      const respuesta = await pedir('/api/recuperar/solicitar', {
        metodo: 'POST',
        cuerpo: { documento: documento.trim() }
      });
      setModo('pin');
      mostrar(`${respuesta.mensaje}. Vence en ${respuesta.minutos} minutos.`, 'exito');
    });
  };

  const cambiarClave = (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(pin.trim())) {
      mostrar('El PIN tiene 6 números.', 'error');
      return;
    }
    if (nueva.length < 6) {
      mostrar('La nueva contraseña debe tener al menos 6 caracteres.', 'error');
      return;
    }
    if (nueva !== confirmacion) {
      mostrar('Las contraseñas no coinciden.', 'error');
      return;
    }
    conCarga(async () => {
      const respuesta = await pedir('/api/recuperar/cambiar', {
        metodo: 'POST',
        cuerpo: { documento: documento.trim(), pin: pin.trim(), nueva }
      });
      cambiarModo('login');
      mostrar(respuesta.mensaje, 'exito');
    });
  };

  const titulos = {
    login: ['Iniciar sesión', 'Ingresa con tu número de documento'],
    recuperar: ['Recuperar contraseña', 'Te enviaremos un PIN al celular registrado en el colegio'],
    pin: ['Crear nueva contraseña', 'Escribe el PIN que recibiste y tu nueva contraseña']
  };

  return (
    <main className="pagina">
      <header className="encabezado">
        <div className="logo">
          <img src={escudo} alt="" className="logo-escudo" />
          <div>
            <span>COLSAGRACO</span>
            <small>Plataforma educativa</small>
          </div>
        </div>
      </header>

      <section className="contenido">
        <div className="bienvenida">
          <img
            src={escudo}
            alt="Escudo del Colegio Departamental Integrado Sagrado Corazón de Jesús"
            className="escudo-grande"
          />
          <p className="colegio">
            Colegio Departamental Integrado
            <strong>Sagrado Corazón de Jesús</strong>
          </p>
          <h1>Bienvenido a COLSAGRACO</h1>
          <p className="descripcion">
            Un espacio para aprender, consultar y estar conectado con nuestra comunidad educativa.
          </p>
          <p className="lema">Unión · Ciencia · Virtud</p>
        </div>

        <div className="tarjeta">
          <h2>{titulos[modo][0]}</h2>
          <p className="subtitulo">{titulos[modo][1]}</p>

          {modo === 'login' && (
            <form onSubmit={ingresar}>
              <label htmlFor="documento">Número de documento</label>
              <input
                id="documento"
                type="text"
                placeholder="Ej: 1098765432"
                autoComplete="username"
                maxLength={50}
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
              />

              <label htmlFor="contrasena">Contraseña</label>
              <input
                id="contrasena"
                type="password"
                placeholder="Ingresa tu contraseña"
                autoComplete="current-password"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
              />

              <button type="submit" disabled={cargando}>
                {cargando ? 'Procesando...' : 'Ingresar'}
              </button>
            </form>
          )}

          {modo === 'recuperar' && (
            <form onSubmit={solicitarPin}>
              <label htmlFor="documento-recuperar">Número de documento</label>
              <input
                id="documento-recuperar"
                type="text"
                placeholder="Ej: 1098765432"
                autoComplete="username"
                maxLength={50}
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
              />
              <button type="submit" disabled={cargando}>
                {cargando ? 'Enviando...' : 'Enviar PIN'}
              </button>
            </form>
          )}

          {modo === 'pin' && (
            <form onSubmit={cambiarClave}>
              <label htmlFor="pin">PIN de 6 números</label>
              <input
                id="pin"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                className="campo-pin"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              />

              <label htmlFor="nueva">Nueva contraseña</label>
              <input
                id="nueva"
                type="password"
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
                value={nueva}
                onChange={(e) => setNueva(e.target.value)}
              />

              <label htmlFor="confirmacion">Repite la nueva contraseña</label>
              <input
                id="confirmacion"
                type="password"
                autoComplete="new-password"
                value={confirmacion}
                onChange={(e) => setConfirmacion(e.target.value)}
              />

              <button type="submit" disabled={cargando}>
                {cargando ? 'Guardando...' : 'Cambiar contraseña'}
              </button>
              <button type="button" className="enlace-login" onClick={() => solicitarPin()} disabled={cargando}>
                ¿No te llegó? Enviar otro PIN
              </button>
            </form>
          )}

          {mensaje && <p className={`mensaje mensaje-${mensaje.tipo}`}>{mensaje.texto}</p>}

          <div className="separador">
            <span>{modo === 'login' ? '¿Olvidaste tu contraseña?' : '¿Ya la recordaste?'}</span>
          </div>

          <button
            type="button"
            className="boton-secundario"
            onClick={() => cambiarModo(modo === 'login' ? 'recuperar' : 'login')}
          >
            {modo === 'login' ? 'Recuperar contraseña' : 'Volver a iniciar sesión'}
          </button>

          {modo === 'login' && (
            <p className="ayuda-login">
              Primer ingreso: tu contraseña es tu primer apellido en minúsculas y sin tildes, seguido de los dos
              primeros números de tu documento. Ejemplo: <b>perez10</b>
            </p>
          )}
        </div>
      </section>

      <footer>
        <p>COLSAGRACO © 2026 · Plataforma educativa para la comunidad de Albania, Santander.</p>
      </footer>
    </main>
  );
}

export default Login;
