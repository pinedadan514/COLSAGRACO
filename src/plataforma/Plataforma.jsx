// Plataforma del estudiante
import { useState } from 'react';
import Marco from '../comun/Marco.jsx';
import Cargando from '../comun/Cargando.jsx';
import Chat from '../comun/Chat.jsx';
import { usePlataforma } from '../comun/usePlataforma.js';
import { aFecha } from '../comun/utilidades.js';
import Inicio from './secciones/Inicio.jsx';
import Materias from './secciones/Materias.jsx';
import Calendario from './secciones/Calendario.jsx';
import Tareas from './secciones/Tareas.jsx';
import Asistencia from './secciones/Asistencia.jsx';
import Permisos from './secciones/Permisos.jsx';
import Perfil from './secciones/Perfil.jsx';
import Comunicados from './secciones/Comunicados.jsx';

// Chat del estudiante: sus contactos son los docentes de su grado
function ChatEstudiante({ datos, actualizar, llamar, parametro }) {
  const contactos = datos.docentes.map((d) => ({
    id: d.id,
    nombre: `Prof. ${d.nombre}`,
    detalle: d.materias.join(', '),
    color: d.color
  }));
  return (
    <Chat
      contactos={contactos}
      mensajes={datos.mensajes}
      miRol="estudiante"
      llamar={llamar}
      actualizar={actualizar}
      inicial={parametro}
      textoVacio="Todavía no hay docentes asignados a tu grado."
    />
  );
}

const SECCIONES = [
  { id: 'inicio', nombre: 'Inicio', icono: 'inicio', Componente: Inicio },
  { id: 'materias', nombre: 'Materias', icono: 'materias', Componente: Materias },
  { id: 'calendario', nombre: 'Calendario académico', icono: 'calendario', Componente: Calendario },
  { id: 'chat', nombre: 'Chat con profesores', icono: 'chat', Componente: ChatEstudiante },
  { id: 'tareas', nombre: 'Tareas pendientes', icono: 'tareas', Componente: Tareas },
  { id: 'asistencia', nombre: 'Asistencia', icono: 'asistencia', Componente: Asistencia },
  { id: 'permisos', nombre: 'Solicitud de permiso', icono: 'permiso', Componente: Permisos },
  { id: 'comunicados', nombre: 'Comunicados', icono: 'comunicados', Componente: Comunicados },
  { id: 'perfil', nombre: 'Mi perfil', icono: 'perfil', Componente: Perfil }
];

// Convierte las fechas que llegan como texto en objetos Date
function prepararDatos(d) {
  const conFecha = (lista) => lista.map((x) => ({ ...x, fecha: aFecha(x.fecha) }));
  return {
    ...d,
    tareas: conFecha(d.tareas),
    eventos: conFecha(d.eventos),
    novedades: conFecha(d.novedades),
    comunicados: conFecha(d.comunicados)
  };
}

function Plataforma({ onSalir }) {
  const { datos, error, reintentar, llamar, actualizar } = usePlataforma('/api/estudiante', onSalir, prepararDatos);
  const [seccionActual, setSeccionActual] = useState('inicio');
  // "parametro" permite abrir una sección con algo ya elegido (por ejemplo, el chat con un profesor)
  const [parametro, setParametro] = useState(null);

  if (!datos) {
    return <Cargando error={error} onReintentar={reintentar} onSalir={onSalir} />;
  }

  const irA = (id, valor = null) => {
    setSeccionActual(id);
    setParametro(valor);
  };

  const contadores = {
    tareas: datos.tareas.filter((t) => !t.entregada).length,
    comunicados: datos.comunicados.filter((c) => !c.leido).length,
    chat: datos.mensajes.filter((m) => m.remitente === 'docente' && !m.leido).length
  };
  const { Componente } = SECCIONES.find((s) => s.id === seccionActual);

  return (
    <Marco
      portal="Portal del estudiante"
      secciones={SECCIONES}
      actual={seccionActual}
      onIr={irA}
      contadores={contadores}
      nombre={datos.perfil.nombreCompleto || datos.usuario.documento}
      detalle={datos.perfil.grado ? `Estudiante · Grado ${datos.perfil.grado}°` : 'Estudiante'}
      onSalir={onSalir}
    >
      <Componente
        key={`${seccionActual}-${parametro}`}
        datos={datos}
        actualizar={actualizar}
        llamar={llamar}
        irA={irA}
        parametro={parametro}
      />
    </Marco>
  );
}

export default Plataforma;
