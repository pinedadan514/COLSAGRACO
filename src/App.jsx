import { useState } from 'react';
import Login from './Login.jsx';
import PrimerIngreso from './PrimerIngreso.jsx';
import Plataforma from './plataforma/Plataforma.jsx';
import PlataformaDocente from './docente/PlataformaDocente.jsx';
import PanelAdmin from './admin/PanelAdmin.jsx';
import { borrarSesion, guardarSesion, leerSesion, pedir } from './api.js';

function App() {
  const [sesion, setSesion] = useState(leerSesion);

  const ingresar = (datos) => {
    guardarSesion(datos);
    setSesion(datos);
  };

  // avisarServidor = false cuando la sesión ya expiró en el servidor
  const salir = (avisarServidor = true) => {
    if (avisarServidor) {
      pedir('/api/logout', { metodo: 'POST' }).catch(() => {});
    }
    borrarSesion();
    setSesion(null);
  };

  if (!sesion) {
    return <Login onIngresar={ingresar} />;
  }

  // La primera vez que ingresa con la contraseña inicial, debe crear una nueva
  if (sesion.usuario.debeCambiarClave) {
    return (
      <PrimerIngreso
        nombre={sesion.usuario.nombre}
        onListo={() => ingresar({ ...sesion, usuario: { ...sesion.usuario, debeCambiarClave: false } })}
        onSalir={salir}
      />
    );
  }

  switch (sesion.usuario.rol) {
    case 'docente':
      return <PlataformaDocente key={sesion.token} onSalir={salir} />;
    case 'administrativo':
      return <PanelAdmin key={sesion.token} onSalir={salir} />;
    default:
      return <Plataforma key={sesion.token} onSalir={salir} />;
  }
}

export default App;
