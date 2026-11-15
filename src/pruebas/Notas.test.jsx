// Pruebas del módulo del docente "Registrar notas"
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Notas from '../docente/secciones/Notas.jsx';

const datos = {
  materias: [{ id: 'mat', nombre: 'Matemáticas' }],
  asignaciones: [{ materiaId: 'mat', grado: 10 }]
};

const estudiantes = [
  { id: 1, nombre: 'Ana Pérez', documento: '1000000001', nota: 4.5 },
  { id: 2, nombre: 'Luis Gómez', documento: '1000000002', nota: null }
];

function llamarFalso() {
  return vi.fn((ruta, opciones) => {
    if (!opciones) return Promise.resolve(estudiantes);
    return Promise.resolve({ mensaje: `Se guardaron ${opciones.cuerpo.notas.length} notas` });
  });
}

describe('Docente: Registrar notas', () => {
  it('pide primero elegir materias si el docente no tiene clases', () => {
    render(<Notas datos={{ ...datos, asignaciones: [] }} llamar={vi.fn()} />);
    expect(screen.getByText(/Primero elige tus materias/)).toBeInTheDocument();
  });

  it('carga los estudiantes de la clase con sus notas y desempeño', async () => {
    const llamar = llamarFalso();
    render(<Notas datos={datos} llamar={llamar} />);
    expect(await screen.findByText('Ana Pérez')).toBeInTheDocument();
    expect(llamar.mock.calls[0][0]).toBe('/api/docente/clase?materia=mat&grado=10&fecha=');
    expect(screen.getByLabelText('Nota de Ana Pérez')).toHaveValue('4.5');
    expect(screen.getByText('Alto')).toBeInTheDocument();
    expect(screen.getByText('Sin nota')).toBeInTheDocument();
  });

  it('marca como no válida una nota fuera de 1.0 a 5.0 y no la guarda', async () => {
    const usuario = userEvent.setup();
    const llamar = llamarFalso();
    render(<Notas datos={datos} llamar={llamar} />);
    const campo = await screen.findByLabelText('Nota de Luis Gómez');
    await usuario.type(campo, '7');
    expect(campo).toHaveClass('invalido');
    expect(screen.getByText('No válida')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Guardar notas' }));
    expect(screen.getByText(/deben estar entre 1.0 y 5.0/)).toBeInTheDocument();
    expect(llamar).toHaveBeenCalledTimes(1);
  });

  it('envía solo las notas que cambiaron (acepta coma decimal)', async () => {
    const usuario = userEvent.setup();
    const llamar = llamarFalso();
    render(<Notas datos={datos} llamar={llamar} />);
    await usuario.type(await screen.findByLabelText('Nota de Luis Gómez'), '3,8');
    expect(screen.getByText('1 notas por guardar.')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: 'Guardar notas' }));
    expect(llamar).toHaveBeenLastCalledWith('/api/docente/notas', {
      metodo: 'PUT',
      cuerpo: { materiaId: 'mat', grado: 10, notas: [{ estudianteId: 2, nota: 3.8 }] }
    });
    expect(await screen.findByText('Se guardaron 1 notas')).toBeInTheDocument();
    expect(screen.getByLabelText('Nota de Luis Gómez')).toHaveValue('3.8');
  });
});
