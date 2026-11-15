// Pruebas del módulo Panel del administrador (src/admin)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PanelAdmin from '../admin/PanelAdmin.jsx';
import { servidorFalso } from './configuracion.js';

let peticiones;
beforeEach(() => {
  peticiones = servidorFalso({
    'GET /api/admin': () => [200, {
      usuario: { id: 3, documento: '3000000003' },
      perfil: { nombreCompleto: 'Administrador Prueba', celular: '', correo: '', direccion: '' },
      porGrado: [{ grado: 10, total: 25 }, { grado: 11, total: 20 }],
      docentes: [{ id: 2, documento: '2000000002', nombre: 'Carlos Pérez', celular: '', debeCambiarClave: false, asignaciones: ['Matemáticas 10°'] }]
    }],
    'GET /api/admin/estudiantes': (c, url) => [200, url.includes('grado=10')
      ? [{ id: 1, documento: '1000000001', nombre: 'Ana Pérez', grado: 10, celular: '', acudiente: 'Luz', acudienteCelular: '300', debeCambiarClave: true }]
      : []],
    'POST /api/admin/docentes': () => [201, { id: 9, claveInicial: 'nunez52' }],
    'POST /api/admin/usuarios/:id/restablecer': () => [200, { clave: 'perez10' }]
  });
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

async function abrir() {
  const usuario = userEvent.setup();
  render(<PanelAdmin onSalir={vi.fn()} />);
  await screen.findByText('Estudiantes en total');
  const ir = (nombre) => usuario.click(within(screen.getByRole('navigation')).getByRole('button', { name: new RegExp(nombre) }));
  return { usuario, ir };
}

describe('Panel del administrador', () => {
  it('muestra el total de estudiantes y el conteo por grado', async () => {
    await abrir();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
  });

  it('Cargar Excel: rechaza archivos que no son .xlsx', async () => {
    const usuario = userEvent.setup({ applyAccept: false });
    render(<PanelAdmin onSalir={vi.fn()} />);
    await screen.findByText('Estudiantes en total');
    const campo = document.querySelector('.zona-archivo input');
    await usuario.upload(campo, new File(['a,b'], 'estudiantes.csv', { type: 'text/csv' }));
    expect(screen.getByText(/debe ser de Excel \(\.xlsx\)/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cargar estudiantes' })).toBeDisabled();
  });

  it('Estudiantes: lista por grado y restablece la contraseña', async () => {
    const { usuario, ir } = await abrir();
    await ir('^Estudiantes');
    await usuario.selectOptions(screen.getByLabelText('Grado'), '10');
    expect(await screen.findByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.getByText('No ha ingresado')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Restablecer contraseña' }));
    expect(await screen.findByText('La contraseña de Ana Pérez ahora es: perez10')).toBeInTheDocument();
  });

  it('Docentes: valida el formulario y crea la cuenta mostrando la contraseña inicial', async () => {
    const { usuario, ir } = await abrir();
    await ir('Docentes');
    await usuario.click(screen.getByRole('button', { name: 'Crear docente' }));
    expect(screen.getByText(/entre 5 y 15 números/)).toBeInTheDocument();

    await usuario.type(screen.getByLabelText('Número de documento'), '52111222');
    await usuario.type(screen.getByLabelText('Nombres'), 'Marta');
    await usuario.type(screen.getByLabelText('Primer apellido'), 'Núñez');
    await usuario.click(screen.getByRole('button', { name: 'Crear docente' }));
    expect(await screen.findByText(/Contraseña inicial: nunez52/)).toBeInTheDocument();
    expect(peticiones.find((p) => p.metodo === 'POST').cuerpo).toMatchObject({ documento: '52111222', nombres: 'Marta', primerApellido: 'Núñez' });
  });
});
