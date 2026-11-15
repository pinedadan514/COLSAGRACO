// Pruebas del módulo Plataforma del docente (src/docente)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlataformaDocente from '../docente/PlataformaDocente.jsx';
import { servidorFalso, fecha } from './configuracion.js';

function datosDocente() {
  return {
    usuario: { id: 2, documento: '2000000002' },
    perfil: { documento: '2000000002', nombreCompleto: 'Carlos Pérez', nombres: 'Carlos', primerApellido: 'Pérez', celular: '', correo: '', direccion: '' },
    materias: [
      { id: 'mat', nombre: 'Matemáticas', color: '#2563eb' },
      { id: 'fis', nombre: 'Física', color: '#4f46e5' }
    ],
    asignaciones: [{ materiaId: 'mat', grado: 10 }],
    ocupadas: [{ materiaId: 'fis', grado: 11, docente: 'Marta Núñez' }],
    tareas: [{ id: 5, materiaId: 'mat', grado: 10, titulo: 'Taller 1', descripcion: '', fecha: fecha(3), entregas: 1 }],
    eventos: [],
    comunicados: [],
    estudiantes: [{ id: 1, nombre: 'Ana Pérez', grado: 10 }, { id: 4, nombre: 'Luis Gómez', grado: 10 }],
    mensajes: [{ id: 1, estudianteId: 1, docenteId: 2, remitente: 'estudiante', texto: 'Profe, una duda', leido: false, fecha: new Date().toISOString() }],
    categorias: ['Académico', 'Institucional']
  };
}

let peticiones;
beforeEach(() => {
  peticiones = servidorFalso({
    'GET /api/docente': () => [200, datosDocente()],
    'PUT /api/docente/asignaciones': (c) => [200, { asignaciones: c.asignaciones }],
    'GET /api/docente/clase': () => [200, [
      { id: 1, nombre: 'Ana Pérez', documento: '1000000001', nota: null, estado: null, observacion: '' },
      { id: 4, nombre: 'Luis Gómez', documento: '1000000004', nota: null, estado: null, observacion: '' }
    ]],
    'PUT /api/docente/asistencia': (c) => [200, { mensaje: `Asistencia guardada para ${c.registros.length} estudiantes` }],
    'POST /api/docente/tareas': (c) => [201, { id: 9, ...c, entregas: 0 }],
    'POST /api/docente/eventos': (c) => [201, { id: 3, ...c, grado: c.grado === 'todos' ? null : Number(c.grado), mio: true }],
    'POST /api/docente/comunicados': (c) => [201, { id: 4, ...c, fecha: fecha(0) }],
    'GET /api/mensajes': () => [200, datosDocente().mensajes],
    'POST /api/mensajes/leidos': () => [200, {}]
  });
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

async function abrir() {
  const usuario = userEvent.setup();
  render(<PlataformaDocente onSalir={vi.fn()} />);
  await screen.findByRole('heading', { level: 2, name: 'Prof. Carlos' });
  const ir = (nombre) => usuario.click(within(screen.getByRole('navigation')).getByRole('button', { name: new RegExp(nombre) }));
  return { usuario, ir };
}

describe('Plataforma del docente', () => {
  it('muestra el inicio con sus clases y los mensajes sin leer', async () => {
    await abrir();
    expect(screen.getByText('Mis clases')).toBeInTheDocument();
    expect(screen.getByText('1/2 entregas')).toBeInTheDocument();
    const chat = within(screen.getByRole('navigation')).getByRole('button', { name: /Chat con estudiantes/ });
    expect(chat).toHaveTextContent('1');
  });

  it('Mis materias: bloquea los grados de otros docentes y guarda la selección', async () => {
    const { usuario, ir } = await abrir();
    await ir('Mis materias');
    await usuario.click(screen.getByRole('checkbox', { name: /Física/ }));
    const grados = screen.getByRole('group', { name: 'Grados de Física' });
    expect(within(grados).getByRole('button', { name: '11°' })).toBeDisabled();
    await usuario.click(screen.getByRole('button', { name: 'Guardar mis materias' }));
    expect(screen.getByText(/Elige al menos un grado para: Física/)).toBeInTheDocument();

    await usuario.click(within(grados).getByRole('button', { name: '10°' }));
    await usuario.click(screen.getByRole('button', { name: 'Guardar mis materias' }));
    expect(await screen.findByText(/se guardaron correctamente/)).toBeInTheDocument();
    expect(peticiones.find((p) => p.metodo === 'PUT').cuerpo.asignaciones).toEqual([
      { materiaId: 'mat', grado: 10 }, { materiaId: 'fis', grado: 10 }
    ]);
  });

  it('Asistencia: marca una falta y guarda la lista del día', async () => {
    const { usuario, ir } = await abrir();
    await ir('Registrar asistencia');
    const fila = (await screen.findByText('Luis Gómez')).closest('tr');
    await usuario.click(within(fila).getByRole('radio', { name: 'F' }));
    await usuario.type(within(fila).getByRole('textbox'), 'No vino');
    expect(screen.getByText('Falta: 1')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Guardar asistencia' }));
    expect(await screen.findByText('Asistencia guardada para 2 estudiantes')).toBeInTheDocument();
    const envio = peticiones.find((p) => p.ruta === '/api/docente/asistencia');
    expect(envio.cuerpo.registros).toEqual([
      { estudianteId: 1, estado: 'Presente', observacion: '' },
      { estudianteId: 4, estado: 'Falta', observacion: 'No vino' }
    ]);
  });

  it('Tareas: valida y publica una tarea', async () => {
    const { usuario, ir } = await abrir();
    await ir('Tareas');
    await usuario.click(screen.getByRole('button', { name: 'Publicar tarea' }));
    expect(screen.getByText(/título de al menos 3 letras/)).toBeInTheDocument();
    await usuario.type(screen.getByLabelText('Título'), 'Guía de ecuaciones');
    await usuario.type(screen.getByLabelText('Fecha de entrega'), fecha(7));
    await usuario.click(screen.getByRole('button', { name: 'Publicar tarea' }));
    expect(await screen.findByText(/Tarea publicada para Matemáticas grado 10°/)).toBeInTheDocument();
    expect(screen.getByText('Guía de ecuaciones')).toBeInTheDocument();
  });

  it('Calendario y comunicados: publica un evento y un comunicado', async () => {
    const { usuario, ir } = await abrir();
    await ir('Calendario académico');
    await usuario.type(screen.getByLabelText('Título'), 'Salida pedagógica');
    await usuario.type(screen.getByLabelText('Fecha'), fecha(10));
    await usuario.click(screen.getByRole('button', { name: 'Agregar al calendario' }));
    expect(await screen.findByText('Evento agregado al calendario académico.')).toBeInTheDocument();

    await ir('Nuevo comunicado');
    await usuario.type(screen.getByLabelText('Título'), 'Recuperaciones');
    await usuario.type(screen.getByLabelText('Mensaje'), 'Serán el viernes a las 8 a. m.');
    await usuario.click(screen.getByRole('button', { name: 'Publicar comunicado' }));
    expect(await screen.findByText('Comunicado publicado para todo el colegio.')).toBeInTheDocument();
  });

  it('Chat: lista a los estudiantes y abre la conversación', async () => {
    const { usuario, ir } = await abrir();
    await ir('Chat con estudiantes');
    await usuario.click(screen.getByRole('button', { name: /Ana Pérez/ }));
    expect(screen.getAllByText('Profe, una duda').length).toBeGreaterThan(0);
    await vi.waitFor(() => expect(peticiones.some((p) => p.ruta === '/api/mensajes/leidos')).toBe(true));
  });
});
