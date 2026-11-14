import { useState } from 'react';
import escudo from '../assets/escudo.jpg';
import Icono from './Icono.jsx';
import { iniciales } from './utilidades.js';
import './plataforma.css';

// Estructura común de las plataformas: menú lateral, barra superior y contenido
function Marco({ portal, secciones, actual, onIr, contadores = {}, nombre, detalle, onSalir, children }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const seccion = secciones.find((s) => s.id === actual);

  const ir = (id) => {
    setMenuAbierto(false);
    onIr(id);
    window.scrollTo(0, 0);
  };

  return (
    <div className={`plataforma ${menuAbierto ? 'menu-abierto' : ''}`}>
      <aside className="lateral">
        <div className="lateral-marca">
          <img src={escudo} alt="Escudo COLSAGRACO" />
          <div>
            <strong>COLSAGRACO</strong>
            <span>{portal}</span>
          </div>
          <button
            type="button"
            className="boton-icono solo-movil"
            onClick={() => setMenuAbierto(false)}
            aria-label="Cerrar menú"
          >
            <Icono nombre="cerrar" />
          </button>
        </div>

        <nav className="lateral-menu">
          {secciones.map((s) => (
            <button key={s.id} type="button" className={s.id === actual ? 'activo' : ''} onClick={() => ir(s.id)}>
              <Icono nombre={s.icono} />
              <span>{s.nombre}</span>
              {contadores[s.id] > 0 && <em className="contador">{contadores[s.id]}</em>}
            </button>
          ))}
        </nav>

        <button type="button" className="lateral-salir" onClick={() => onSalir()}>
          <Icono nombre="salir" />
          <span>Cerrar sesión</span>
        </button>
      </aside>

      <div className="fondo-menu" onClick={() => setMenuAbierto(false)} />

      <div className="principal">
        <header className="barra">
          <button
            type="button"
            className="boton-icono solo-movil"
            onClick={() => setMenuAbierto(true)}
            aria-label="Abrir menú"
          >
            <Icono nombre="menu" />
          </button>
          <h1>{seccion?.nombre}</h1>
          <button type="button" className="barra-usuario" onClick={() => ir('perfil')}>
            <span className="avatar">{iniciales(nombre)}</span>
            <span className="barra-nombre">
              <strong>{nombre}</strong>
              <small>{detalle}</small>
            </span>
          </button>
        </header>

        <main className="seccion">{children}</main>
      </div>
    </div>
  );
}

export default Marco;
