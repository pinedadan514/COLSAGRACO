// Pruebas del componente Login (inicio de sesión y recuperación de contraseña con PIN)
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from '../Login.jsx';
import { respuesta } from './configuracion.js';

function montar() {
  const onIngresar = vi.fn();
  const usuario = userEvent.setup();
  render(<Login onIngresar={onIngresar} />);
  return { onIngresar, usuario };
}

describe('Login: iniciar sesión', () => {
  it('muestra el formulario por documento y no tiene opción de crear cuenta', () => {
    montar();
    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(screen.getByLabelText('Número de documento')).toBeInTheDocument();
    expect(screen.queryByText(/crear una cuenta/i)).not.toBeInTheDocument();
  });

  it('pide completar los campos antes de enviar', async () => {
    const { usuario } = montar();
    const fetchFalso = vi.fn();
    vi.stubGlobal('fetch', fetchFalso);
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(screen.getByText(/Ingresa tu número de documento y tu contraseña/)).toBeInTheDocument();
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it('con datos correctos entrega el token y el usuario', async () => {
    const { usuario, onIngresar } = montar();
    const datos = { token: 't'.repeat(64), usuario: { id: 1, rol: 'docente', nombre: 'Docente Prueba', debeCambiarClave: false } };
    const fetchFalso = vi.fn(() => respuesta(200, datos));
    vi.stubGlobal('fetch', fetchFalso);

    await usuario.type(screen.getByLabelText('Número de documento'), ' 2000000002 ');
    await usuario.type(screen.getByLabelText('Contraseña'), 'prueba20');
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(JSON.parse(fetchFalso.mock.calls[0][1].body)).toEqual({ documento: '2000000002', contrasena: 'prueba20' });
    expect(onIngresar).toHaveBeenCalledWith(datos);
  });

  it('muestra el error que envía el servidor', async () => {
    const { usuario, onIngresar } = montar();
    vi.stubGlobal('fetch', vi.fn(() => respuesta(401, { mensaje: 'Documento o contraseña incorrectos' })));
    await usuario.type(screen.getByLabelText('Número de documento'), '1000000001');
    await usuario.type(screen.getByLabelText('Contraseña'), 'mala');
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(await screen.findByText('Documento o contraseña incorrectos')).toBeInTheDocument();
    expect(onIngresar).not.toHaveBeenCalled();
  });
});

describe('Login: recuperar contraseña con PIN', () => {
  it('pide el PIN, valida los datos y cambia la contraseña', async () => {
    const { usuario } = montar();
    const fetchFalso = vi.fn()
      .mockImplementationOnce(() => respuesta(200, { mensaje: 'Enviamos un PIN de 6 números al celular *** *** 4567', minutos: 10 }))
      .mockImplementationOnce(() => respuesta(200, { mensaje: 'Contraseña cambiada. Ya puedes iniciar sesión con tu nueva contraseña.' }));
    vi.stubGlobal('fetch', fetchFalso);

    await usuario.click(screen.getByRole('button', { name: 'Recuperar contraseña' }));
    await usuario.type(screen.getByLabelText('Número de documento'), '1000000001');
    await usuario.click(screen.getByRole('button', { name: 'Enviar PIN' }));

    expect(await screen.findByRole('heading', { name: 'Crear nueva contraseña' })).toBeInTheDocument();
    expect(screen.getByText(/\*\*\* \*\*\* 4567/)).toBeInTheDocument();

    // El campo del PIN solo acepta números
    await usuario.type(screen.getByLabelText('PIN de 6 números'), '12ab34');
    expect(screen.getByLabelText('PIN de 6 números')).toHaveValue('1234');
    await usuario.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));
    expect(screen.getByText('El PIN tiene 6 números.')).toBeInTheDocument();

    await usuario.type(screen.getByLabelText('PIN de 6 números'), '56');
    await usuario.type(screen.getByLabelText('Nueva contraseña'), 'nueva123');
    await usuario.type(screen.getByLabelText('Repite la nueva contraseña'), 'distinta1');
    await usuario.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));
    expect(screen.getByText('Las contraseñas no coinciden.')).toBeInTheDocument();

    await usuario.clear(screen.getByLabelText('Repite la nueva contraseña'));
    await usuario.type(screen.getByLabelText('Repite la nueva contraseña'), 'nueva123');
    await usuario.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

    expect(JSON.parse(fetchFalso.mock.calls[1][1].body)).toEqual({ documento: '1000000001', pin: '123456', nueva: 'nueva123' });
    expect(await screen.findByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(screen.getByText(/Contraseña cambiada/)).toBeInTheDocument();
  });
});
