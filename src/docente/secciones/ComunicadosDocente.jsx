import { useState } from 'react';
import { aFecha, formatoFecha, GRADOS } from '../../comun/utilidades.js';

function ComunicadosDocente({ datos, actualizar, llamar }) {
  const vacio = { titulo: '', categoria: datos.categorias[0], grado: 'todos', contenido: '' };
  const [formulario, setFormulario] = useState(vacio);
  const [mensaje, setMensaje] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const cambiar = (campo) => (e) => setFormulario({ ...formulario, [campo]: e.target.value });

  const publicar = async (e) => {
    e.preventDefault();
    if (formulario.titulo.trim().length < 3) return setMensaje({ tipo: 'error', texto: 'Escribe un título de al menos 3 letras.' });
    if (formulario.contenido.trim().length < 10) return setMensaje({ tipo: 'error', texto: 'El comunicado debe tener al menos 10 caracteres.' });

    const para = formulario.grado === 'todos' ? 'todo el colegio' : `grado ${formulario.grado}°`;
    if (!window.confirm(`¿Publicar este comunicado para ${para}?`)) return;

    setGuardando(true);
    try {
      const nuevo = await llamar('/api/docente/comunicados', { metodo: 'POST', cuerpo: formulario });
      actualizar((d) => ({ comunicados: [{ ...nuevo, fecha: aFecha(nuevo.fecha) }, ...d.comunicados] }));
      setFormulario(vacio);
      setMensaje({ tipo: 'exito', texto: `Comunicado publicado para ${para}.` });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (c) => {
    if (!window.confirm(`¿Eliminar el comunicado "${c.titulo}"? Los estudiantes dejarán de verlo.`)) return;
    try {
      await llamar(`/api/docente/comunicados/${c.id}`, { metodo: 'DELETE' });
      actualizar((d) => ({ comunicados: d.comunicados.filter((x) => x.id !== c.id) }));
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    }
  };

  return (
    <div className="columnas columnas-formulario">
      <section className="panel">
        <h3 className="panel-subtitulo">Nuevo comunicado</h3>
        <form className="formulario" onSubmit={publicar}>
          <label htmlFor="titulo-comunicado">Título</label>
          <input id="titulo-comunicado" maxLength={150} placeholder="Ej: Salida pedagógica" value={formulario.titulo} onChange={cambiar('titulo')} />

          <div className="formulario-fila">
            <div>
              <label htmlFor="categoria-comunicado">Categoría</label>
              <select id="categoria-comunicado" value={formulario.categoria} onChange={cambiar('categoria')}>
                {datos.categorias.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="grado-comunicado">Para</label>
              <select id="grado-comunicado" value={formulario.grado} onChange={cambiar('grado')}>
                <option value="todos">Todo el colegio</option>
                {GRADOS.map((g) => <option key={g} value={g}>Grado {g}°</option>)}
              </select>
            </div>
          </div>

          <label htmlFor="contenido-comunicado">Mensaje</label>
          <textarea
            id="contenido-comunicado"
            rows="7"
            maxLength={5000}
            placeholder="Escribe el comunicado..."
            value={formulario.contenido}
            onChange={cambiar('contenido')}
          />

          <button type="submit" className="boton-primario" disabled={guardando}>
            {guardando ? 'Publicando...' : 'Publicar comunicado'}
          </button>
          {mensaje && <p className={`aviso aviso-${mensaje.tipo}`}>{mensaje.texto}</p>}
        </form>
      </section>

      <section className="panel">
        <h3 className="panel-subtitulo">Mis comunicados publicados</h3>
        {datos.comunicados.length === 0 ? (
          <p className="vacio">Aún no has publicado comunicados.</p>
        ) : (
          <ul className="solicitudes">
            {datos.comunicados.map((c) => (
              <li key={c.id}>
                <div className="solicitud-cabeza">
                  <strong>{c.titulo}</strong>
                  <span className="etiqueta">{c.grado ? `Grado ${c.grado}°` : 'Todo el colegio'}</span>
                </div>
                <small>{c.categoria} · {formatoFecha(c.fecha, { day: 'numeric', month: 'long', year: 'numeric' })}</small>
                <p>{c.contenido}</p>
                <div className="solicitud-pie">
                  <span />
                  <button type="button" className="enlace peligro" onClick={() => eliminar(c)}>Eliminar</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default ComunicadosDocente;
