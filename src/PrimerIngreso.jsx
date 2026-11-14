import escudo from './assets/escudo.jpg';
import CambiarClaveForm from './comun/CambiarClaveForm.jsx';
import './App.css';
import './comun/plataforma.css';

// Pantalla obligatoria para cambiar la contraseña inicial
function PrimerIngreso({ nombre, onListo, onSalir }) {
  return (
    <main className="pagina">
      <section className="contenido">
        <div className="tarjeta tarjeta-ancha">
          <img src={escudo} alt="" className="escudo-tarjeta" />
          <h2>¡Hola, {nombre}!</h2>
          <p className="subtitulo">
            Es tu primer ingreso. Por seguridad, crea una contraseña nueva que solo tú conozcas.
            En "Contraseña actual" escribe la contraseña con la que acabas de ingresar.
          </p>
          <CambiarClaveForm onListo={onListo} textoBoton="Guardar y continuar" />
          <button type="button" className="boton-secundario boton-salir" onClick={() => onSalir()}>
            Salir
          </button>
        </div>
      </section>
    </main>
  );
}

export default PrimerIngreso;
