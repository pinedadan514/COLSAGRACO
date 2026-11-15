// Pruebas del módulo Plataforma del estudiante (src/plataforma)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Plataforma from '../plataforma/Plataforma.jsx';
import { servidorFalso, fecha } from './configuracion.js';

function datosEstudiante() {
  return {
    usuario: { id: 1, documento: '1000000001' },
    perfil: {
      documento: '1000000001', nombres: 'Ana', nombreCompleto: 'Ana Pérez Ruiz', grado: 10, fechaNacimiento: '2010-05-03',
      celular: '3001112233', correo: '', direccion: '', acudienteNombre: 'Luz Ruiz', acudienteDocumento: '',
      acudienteParentesco: 'Madre', acudienteCelular: '3009998877', acudienteCorreo: ''
    },
    materias: [{ id: 'mat', nombre: 'Matemáticas', color: '#2563eb', docenteId: 2, docente: 'Carlos Pérez', nota: 4.2 }],
    tareas: [{ id: 7, materiaId: 'mat', titulo: 'Taller de fracciones', descripcion: 'Guía 3', fecha: fecha(2), entregada: false }],
    eventos: [{ id: 1, titulo: 'Evaluación de periodo', fecha: fecha(5), tipo: 'evaluacion', grado: 10 }],
    asistencia: [{ materiaId: 'mat', clases: 4, asistidas: 3, tardanzas: 1 }],
    novedades: [{ id: 'mat-1', materiaId: 'mat', fecha: fecha(-3), estado: 'Falta', nota: 'Sin excusa' }],
    comunicados: [{ id: 3, titulo: 'Reunión de padres', autor: 'Prof. Carlos Pérez', categoria: 'Institucional', fecha: fecha(0), contenido: 'Se cita a los acudientes el viernes.', grado: null, leido: false }],
    mensajes: [],
    docentes: [{ id: 2, nombre: 'Carlos Pérez', color: '#2563eb', materias: ['Matemáticas'] }],
    permisos: [],
    tiposPermiso: ['Cita médica', 'Otro']
  };
}

let peticiones;
beforeEach(() => {
  peticiones = servidorFalso({
    'GET /api/estudiante': () => [200, datosEstudiante()],
    'PUT /api/estudiante/tareas/:id/entrega': (c) => [200, { id: 7, entregada: c.entregada }],
    'POST /api/estudiante/comunicados/leidos': () => [200, { mensaje: 'ok' }],
    'POST /api/estudiante/permisos': (c) => [201, { id: 1, ...c, estado: 'En revisión', enviada: new Date().toISOString() }],
    'GET /api/mensajes': () => [200, []]
  });
});

async function abrir() {
  const usuario = userEvent.setup();
  const onSalir = vi.fn();
  render(<Plataforma onSalir={onSalir} />);
  await screen.findByRole('heading', { level: 2, name: 'Ana' });
  const ir = (nombre) => usuario.click(within(screen.getByRole('navigation')).getByRole('button', { name: new RegExp(nombre) }));
  return { usuario, onSalir, ir };
}

describe('Plataforma del estudiante', () => {
  it('carga los datos y muestra el resumen del inicio', async () => {
    await abrir();
    expect(screen.getByText('Estudiante · Grado 10°')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('4.2')).toBeInTheDocument();
    expect(screen.getAllByText('Taller de fracciones').length).toBeGreaterThan(0);
    expect(screen.getByText('Evaluación de periodo')).toBeInTheDocument();
  });

  it('si la sesión expiró vuelve al inicio de sesión', async () => {
    servidorFalso({ 'GET /api/estudiante': () => [401, { mensaje: 'La sesión expiró' }] });
    const onSalir = vi.fn();
    render(<Plataforma onSalir={onSalir} />);
    await vi.waitFor(() => expect(onSalir).toHaveBeenCalledWith(false));
  });

  it('Materias: muestra docente, nota, desempeño y asistencia', async () => {
    const { ir } = await abrir();
    await ir('Materias');
    expect(screen.getByText('Prof. Carlos Pérez')).toBeInTheDocument();
    expect(screen.getByText('Alto')).toBeInTheDocument();
    expect(screen.getByText(/Asistencia: 75% \(3 de 4 clases\)/)).toBeInTheDocument();
  });

  it('Tareas: marcar como entregada la guarda en el servidor y la mueve de pestaña', async () => {
    const { usuario, ir } = await abrir();
    await ir('Tareas pendientes');
    await usuario.click(screen.getByRole('button', { name: /Marcar entregada/ }));
    expect(peticiones.at(-1)).toMatchObject({ metodo: 'PUT', ruta: '/api/estudiante/tareas/7/entrega', cuerpo: { entregada: true } });
    expect(await screen.findByText(/No tienes tareas pendientes/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entregadas (1)' })).toBeInTheDocument();
  });

  it('Comunicados: al abrir uno se marca como leído', async () => {
    const { usuario, ir } = await abrir();
    await ir('Comunicados');
    expect(screen.getByText('Tienes 1 comunicado sin leer.')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: /Reunión de padres/ }));
    expect(screen.getByText('Se cita a los acudientes el viernes.')).toBeInTheDocument();
    expect(screen.getByText('Has leído todos los comunicados.')).toBeInTheDocument();
    expect(peticiones.at(-1)).toMatchObject({ metodo: 'POST', ruta: '/api/estudiante/comunicados/leidos', cuerpo: { ids: [3] } });
  });

  it('Permisos: valida el motivo y envía la solicitud', async () => {
    const { usuario, ir } = await abrir();
    await ir('Solicitud de permiso');
    await usuario.type(screen.getByLabelText('Motivo'), 'corto');
    await usuario.click(screen.getByRole('button', { name: 'Enviar solicitud' }));
    expect(screen.getByText(/al menos 10 caracteres/)).toBeInTheDocument();

    await usuario.type(screen.getByLabelText('Motivo'), ' — cita médica en Bucaramanga');
    await usuario.click(screen.getByRole('button', { name: 'Enviar solicitud' }));
    expect(await screen.findByText(/Solicitud enviada/)).toBeInTheDocument();
    expect(screen.getByText('En revisión')).toBeInTheDocument();
    expect(peticiones.at(-1).cuerpo.tipo).toBe('Cita médica');
  });

  it('Asistencia y Perfil: muestran los datos del colegio', async () => {
    const { ir } = await abrir();
    await ir('Asistencia');
    expect(screen.getByText('Sin excusa')).toBeInTheDocument();
    await ir('Mi perfil');
    expect(screen.getByText('Luz Ruiz')).toBeInTheDocument();
    expect(screen.getByText('3 de mayo de 2010')).toBeInTheDocument();
  });

  it('Calendario: muestra los eventos del mes', async () => {
    const { ir } = await abrir();
    await ir('Calendario');
    expect(screen.getAllByText('Evaluación de periodo').length).toBeGreaterThan(0);
  });
});
