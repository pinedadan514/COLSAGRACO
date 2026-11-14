// Panel del administrador
import { useState } from 'react';
import Marco from '../comun/Marco.jsx';
import Cargando from '../comun/Cargando.jsx';
import { usePlataforma } from '../comun/usePlataforma.js';
import PerfilDocente from '../docente/secciones/PerfilDocente.jsx';
import ImportarEstudiantes from './secciones/ImportarEstudiantes.jsx';
import Estudiantes from './secciones/Estudiantes.jsx';
import Docentes from './secciones/Docentes.jsx';

function PerfilAdmin(props) {
  return <PerfilDocente {...props} rol="Administrador" />;
}

const SECCIONES = [
  { id: 'importar', nombre: 'Cargar estudiantes (Excel)', icono: 'permiso', Componente: ImportarEstudiantes },
  { id: 'estudiantes', nombre: 'Estudiantes', icono: 'asistencia', Componente: Estudiantes },
  { id: 'docentes', nombre: 'Docentes', icono: 'materias', Componente: Docentes },
  { id: 'perfil', nombre: 'Mi perfil', icono: 'perfil', Componente: PerfilAdmin }
];

function PanelAdmin({ onSalir }) {
  const { datos, error, reintentar, llamar, actualizar } = usePlataforma('/api/admin', onSalir);
  const [seccionActual, setSeccionActual] = useState('importar');

  if (!datos) {
    return <Cargando error={error} onReintentar={reintentar} onSalir={onSalir} />;
  }

  const { Componente } = SECCIONES.find((s) => s.id === seccionActual);

  return (
    <Marco
      portal="Administración"
      secciones={SECCIONES}
      actual={seccionActual}
      onIr={setSeccionActual}
      nombre={datos.perfil.nombreCompleto || datos.usuario.documento}
      detalle="Administrador"
      onSalir={onSalir}
    >
      <Componente
        key={seccionActual}
        datos={datos}
        actualizar={actualizar}
        llamar={llamar}
        recargar={reintentar}
        irA={setSeccionActual}
      />
    </Marco>
  );
}

export default PanelAdmin;
