// Plataforma del docente
import { useState } from 'react';
import Marco from '../comun/Marco.jsx';
import Cargando from '../comun/Cargando.jsx';
import Chat from '../comun/Chat.jsx';
import { usePlataforma } from '../comun/usePlataforma.js';
import { aFecha } from '../comun/utilidades.js';
import InicioDocente from './secciones/InicioDocente.jsx';
import MisMaterias from './secciones/MisMaterias.jsx';
import Notas from './secciones/Notas.jsx';
import AsistenciaDocente from './secciones/AsistenciaDocente.jsx';
import TareasDocente from './secciones/TareasDocente.jsx';
import CalendarioDocente from './secciones/CalendarioDocente.jsx';
import ComunicadosDocente from './secciones/ComunicadosDocente.jsx';
import PerfilDocente from './secciones/PerfilDocente.jsx';

const COLORES_GRADO = { 6: '#2563eb', 7: '#0891b2', 8: '#1b7a3d', 9: '#ca8a04', 10: '#e8730c', 11: '#be185d' };

// Chat del docente: sus contactos son los estudiantes de los grados donde dicta clase
function ChatDocente({ datos, actualizar, llamar }) {
  const contactos = datos.estudiantes.map((e) => ({
    id: e.id,
    nombre: e.nombre,
    detalle: `Grado ${e.grado}°`,
    grupo: `Grado ${e.grado}°`,
    color: COLORES_GRADO[e.grado]
  }));
  return (
    <Chat
      contactos={contactos}
      mensajes={datos.mensajes}
      miRol="docente"
      llamar={llamar}
      actualizar={actualizar}
      textoVacio='Aún no hay estudiantes en tus grados. Elige tus materias y grados en "Mis materias".'
    />
  );
}

const SECCIONES = [
  { id: 'inicio', nombre: 'Inicio', icono: 'inicio', Componente: InicioDocente },
  { id: 'materias', nombre: 'Mis materias y grados', icono: 'materias', Componente: MisMaterias },
  { id: 'notas', nombre: 'Registrar notas', icono: 'tareas', Componente: Notas },
  { id: 'asistencia', nombre: 'Registrar asistencia', icono: 'asistencia', Componente: AsistenciaDocente },
  { id: 'tareas', nombre: 'Tareas', icono: 'permiso', Componente: TareasDocente },
  { id: 'calendario', nombre: 'Calendario académico', icono: 'calendario', Componente: CalendarioDocente },
  { id: 'comunicados', nombre: 'Nuevo comunicado', icono: 'comunicados', Componente: ComunicadosDocente },
  { id: 'chat', nombre: 'Chat con estudiantes', icono: 'chat', Componente: ChatDocente },
  { id: 'perfil', nombre: 'Mi perfil', icono: 'perfil', Componente: PerfilDocente }
];

function prepararDatos(d) {
  const conFecha = (lista) => lista.map((x) => ({ ...x, fecha: aFecha(x.fecha) }));
  return { ...d, tareas: conFecha(d.tareas), eventos: conFecha(d.eventos), comunicados: conFecha(d.comunicados) };
}

function PlataformaDocente({ onSalir }) {
  const { datos, error, reintentar, llamar, actualizar } = usePlataforma('/api/docente', onSalir, prepararDatos);
  const [seccionActual, setSeccionActual] = useState('inicio');

  if (!datos) {
    return <Cargando error={error} onReintentar={reintentar} onSalir={onSalir} />;
  }

  const { Componente } = SECCIONES.find((s) => s.id === seccionActual);
  const contadores = { chat: datos.mensajes.filter((m) => m.remitente === 'estudiante' && !m.leido).length };

  return (
    <Marco
      portal="Portal del docente"
      secciones={SECCIONES}
      actual={seccionActual}
      onIr={setSeccionActual}
      contadores={contadores}
      nombre={datos.perfil.nombreCompleto || datos.usuario.documento}
      detalle="Docente"
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

export default PlataformaDocente;
