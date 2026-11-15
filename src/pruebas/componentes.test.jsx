// Pruebas de componentes reutilizables: Marco, CambiarClaveForm, Chat y SelectorClase
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Marco from '../comun/Marco.jsx';
import CambiarClaveForm from '../comun/CambiarClaveForm.jsx';
import Chat from '../comun/Chat.jsx';
import SelectorClase from '../docente/SelectorClase.jsx';
import { respuesta } from './configuracion.js';

describe('Componente Marco (menú lateral y barra superior)', () => {
  const SECCIONES = [
    { id: 'inicio', nombre: 'Inicio', icono: 'inicio' },
    { id: 'chat', nombre: 'Chat con profesores', icono: 'chat' },
    { id: 'perfil', nombre: 'Mi perfil', icono: 'perfil' }
  ];

  it('muestra las secciones, el título actual y los contadores', () => {
    render(
      <Marco portal="Portal del estudiante" secciones={SECCIONES} actual="chat" onIr={() => {}} contadores={{ chat: 3 }} nombre="Ana Pérez" detalle="Grado 10°" onSalir={() => {}}>
        <p>Contenido</p>
      </Marco>
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Chat con profesores' })).toBeInTheDocument();
    const menu = screen.getByRole('navigation');
    expect(within(menu).getByRole('button', { name: /Chat con profesores\s*3/ })).toHaveClass('activo');
    expect(screen.getByText('AP')).toBeInTheDocument();
    expect(screen.getByText('Contenido')).toBeInTheDocument();
  });

  it('avisa al cambiar de sección y al cerrar sesión', async () => {
    const usuario = userEvent.setup();
    const onIr = vi.fn();
    const onSalir = vi.fn();
    render(<Marco portal="P" secciones={SECCIONES} actual="inicio" onIr={onIr} nombre="Ana" detalle="" onSalir={onSalir} />);
    await usuario.click(screen.getByRole('button', { name: 'Mi perfil' }));
    expect(onIr).toHaveBeenCalledWith('perfil');
    await usuario.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(onSalir).toHaveBeenCalled();
  });
});

describe('Componente CambiarClaveForm', () => {
  it('valida que la nueva contraseña tenga 6 caracteres y coincida', async () => {
    const usuario = userEvent.setup();
    render(<CambiarClaveForm />);
    await usuario.type(screen.getByLabelText('Contraseña actual'), 'perez10');
    await usuario.type(screen.getByLabelText('Nueva contraseña'), '123');
    await usuario.type(screen.getByLabelText('Repite la nueva contraseña'), '123');
    await usuario.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));
    expect(screen.getByText(/al menos 6 caracteres/)).toBeInTheDocument();
  });

  it('envía la contraseña y avisa cuando termina', async () => {
    const usuario = userEvent.setup();
    const onListo = vi.fn();
    const fetchFalso = vi.fn(() => respuesta(200, { mensaje: 'Contraseña actualizada correctamente' }));
    vi.stubGlobal('fetch', fetchFalso);
    render(<CambiarClaveForm onListo={onListo} textoBoton="Guardar y continuar" />);
    await usuario.type(screen.getByLabelText('Contraseña actual'), 'perez10');
    await usuario.type(screen.getByLabelText('Nueva contraseña'), 'Segura2026');
    await usuario.type(screen.getByLabelText('Repite la nueva contraseña'), 'Segura2026');
    await usuario.click(screen.getByRole('button', { name: 'Guardar y continuar' }));
    expect(JSON.parse(fetchFalso.mock.calls[0][1].body)).toEqual({ actual: 'perez10', nueva: 'Segura2026' });
    expect(await screen.findByText('Contraseña actualizada correctamente')).toBeInTheDocument();
    expect(onListo).toHaveBeenCalled();
  });
});

describe('Componente Chat', () => {
  const contactos = [
    { id: 2, nombre: 'Prof. Carlos Pérez', detalle: 'Matemáticas', color: '#2563eb' },
    { id: 3, nombre: 'Prof. Ana Gómez', detalle: 'Lengua Castellana', color: '#d7261e' }
  ];
  const mensajes = [
    { id: 1, estudianteId: 1, docenteId: 3, remitente: 'docente', texto: '¿Ya elegiste el tema?', leido: false, fecha: new Date().toISOString() }
  ];

  it('muestra un aviso cuando no hay contactos', () => {
    render(<Chat contactos={[]} mensajes={[]} miRol="estudiante" llamar={vi.fn()} actualizar={vi.fn()} textoVacio="No hay docentes." />);
    expect(screen.getByText('No hay docentes.')).toBeInTheDocument();
  });

  it('pone primero a quien escribió y muestra los mensajes sin leer', () => {
    render(<Chat contactos={contactos} mensajes={mensajes} miRol="estudiante" llamar={vi.fn(() => Promise.resolve([]))} actualizar={vi.fn()} />);
    const botones = screen.getAllByRole('button').filter((b) => b.className.includes('chat-contacto'));
    expect(botones[0]).toHaveTextContent('Prof. Ana Gómez');
    expect(botones[0]).toHaveTextContent('1');
  });

  it('envía el mensaje al contacto abierto', async () => {
    const usuario = userEvent.setup();
    const llamar = vi.fn((ruta, opciones) => Promise.resolve(opciones ? { id: 9, docenteId: 2, estudianteId: 1, remitente: 'estudiante', texto: 'Hola', fecha: new Date().toISOString() } : []));
    const actualizar = vi.fn();
    render(<Chat contactos={contactos} mensajes={[]} miRol="estudiante" llamar={llamar} actualizar={actualizar} inicial={2} />);
    await usuario.type(screen.getByPlaceholderText(/Escribe un mensaje/), '  Hola profe  ');
    await usuario.click(screen.getByRole('button', { name: 'Enviar mensaje' }));
    expect(llamar).toHaveBeenCalledWith('/api/mensajes', { metodo: 'POST', cuerpo: { para: 2, texto: 'Hola profe' } });
    expect(actualizar).toHaveBeenCalled();
  });
});

describe('Componente SelectorClase', () => {
  const materias = [{ id: 'mat', nombre: 'Matemáticas' }, { id: 'fis', nombre: 'Física' }];
  const asignaciones = [{ materiaId: 'mat', grado: 11 }, { materiaId: 'mat', grado: 10 }, { materiaId: 'fis', grado: 10 }];

  it('ordena las clases por materia y grado', () => {
    render(<SelectorClase asignaciones={asignaciones} materias={materias} valor={null} onCambiar={() => {}} />);
    const opciones = screen.getAllByRole('option').map((o) => o.textContent);
    expect(opciones).toEqual(['Elige materia y grado...', 'Física · Grado 10°', 'Matemáticas · Grado 10°', 'Matemáticas · Grado 11°']);
  });

  it('entrega la materia y el grado elegidos', async () => {
    const usuario = userEvent.setup();
    const onCambiar = vi.fn();
    render(<SelectorClase asignaciones={asignaciones} materias={materias} valor={null} onCambiar={onCambiar} />);
    await usuario.selectOptions(screen.getByRole('combobox'), 'mat|11');
    expect(onCambiar).toHaveBeenCalledWith({ materiaId: 'mat', grado: 11 });
  });
});
