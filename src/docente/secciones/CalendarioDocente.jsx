import { useState } from 'react';
import Calendario from '../../plataforma/secciones/Calendario.jsx';
import { aFecha, diasRestantes, formatoFecha, GRADOS, hoyTexto } from '../../comun/utilidades.js';

const TIPOS = [
  ['evaluacion', 'Evaluación'],
  ['evento', 'Evento'],
  ['festivo', 'Festivo / sin clases']
];

function CalendarioDocente({ datos, actualizar, llamar }) {
  const vacio = { titulo: '', fecha: '', tipo: 'evaluacion', grado: 'todos' };
  const [formulario, setFormulario] = useState(vacio);
  const [mensaje, setMensaje] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const cambiar = (campo) => (e) => setFormulario({ ...formulario, [campo]: e.target.value });

  const crear = async (e) => {
    e.preventDefault();
    if (formulario.titulo.trim().length < 3) return setMensaje({ tipo: 'error', texto: 'Escribe un título de al menos 3 letras.' });
    if (!formulario.fecha) return setMensaje({ tipo: 'error', texto: 'Elige la fecha del evento.' });

    setGuardando(true);
    try {
      const nuevo = await llamar('/api/docente/eventos', { metodo: 'POST', cuerpo: formulario });
      actualizar((d) => ({
        eventos: [...d.eventos, { ...nuevo, fecha: aFecha(nuevo.fecha) }].sort((a, b) => a.fecha - b.fecha)
      }));
      setFormulario(vacio);
      setMensaje({ tipo: 'exito', texto: 'Evento agregado al calendario académico.' });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (evento) => {
    if (!window.confirm(`¿Eliminar "${evento.titulo}" del calendario?`)) return;
    try {
      await llamar(`/api/docente/eventos/${evento.id}`, { metodo: 'DELETE' });
      actualizar((d) => ({ eventos: d.eventos.filter((x) => x.id !== evento.id) }));
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    }
  };

  const misEventos = datos.eventos.filter((x) => x.mio && diasRestantes(x.fecha) >= 0);

  return (
    <>
      <div className="columnas columnas-formulario">
        <section className="panel">
          <h3 className="panel-subtitulo">Agregar evento</h3>
          <form className="formulario" onSubmit={crear}>
            <label htmlFor="titulo-evento">Título</label>
            <input id="titulo-evento" maxLength={150} placeholder="Ej: Evaluación de periodo" value={formulario.titulo} onChange={cambiar('titulo')} />

            <div className="formulario-fila">
              <div>
                <label htmlFor="fecha-evento">Fecha</label>
                <input id="fecha-evento" type="date" min={hoyTexto()} value={formulario.fecha} onChange={cambiar('fecha')} />
              </div>
              <div>
                <label htmlFor="tipo-evento">Tipo</label>
                <select id="tipo-evento" value={formulario.tipo} onChange={cambiar('tipo')}>
                  {TIPOS.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
                </select>
              </div>
            </div>

            <label htmlFor="grado-evento">¿Para quién?</label>
            <select id="grado-evento" value={formulario.grado} onChange={cambiar('grado')}>
              <option value="todos">Todo el colegio</option>
              {GRADOS.map((g) => <option key={g} value={g}>Grado {g}°</option>)}
            </select>

            <button type="submit" className="boton-primario" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Agregar al calendario'}
            </button>
            {mensaje && <p className={`aviso aviso-${mensaje.tipo}`}>{mensaje.texto}</p>}
          </form>
        </section>

        <section className="panel">
          <h3 className="panel-subtitulo">Eventos que he creado</h3>
          {misEventos.length === 0 ? (
            <p className="vacio">No has creado eventos próximos.</p>
          ) : (
            <ul className="lista">
              {misEventos.map((x) => (
                <li key={x.id}>
                  <span className="fecha-mini">
                    <b>{x.fecha.getDate()}</b>
                    {formatoFecha(x.fecha, { month: 'short' })}
                  </span>
                  <div>
                    <strong>{x.titulo}</strong>
                    <small>{x.grado ? `Grado ${x.grado}°` : 'Todo el colegio'}</small>
                  </div>
                  <button type="button" className="enlace peligro" onClick={() => eliminar(x)}>Eliminar</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Calendario datos={datos} />
    </>
  );
}

export default CalendarioDocente;
