import escudo from '../assets/escudo.jpg';
import './plataforma.css';

// Pantalla mientras se cargan los datos (o si falla la carga)
function Cargando({ error, onReintentar, onSalir }) {
  return (
    <div className="cargando-pantalla">
      <img src={escudo} alt="" />
      {error ? (
        <>
          <p className="aviso aviso-error">{error}</p>
          <div className="perfil-botones">
            <button type="button" className="boton-secundario-plat" onClick={() => onSalir()}>
              Cerrar sesión
            </button>
            <button type="button" className="boton-primario" onClick={onReintentar}>
              Reintentar
            </button>
          </div>
        </>
      ) : (
        <p>Cargando tu información...</p>
      )}
    </div>
  );
}

export default Cargando;
