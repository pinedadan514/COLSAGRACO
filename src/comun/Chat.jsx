import { useEffect, useRef, useState } from 'react';
import Icono from './Icono.jsx';
import { formatoMomento, iniciales } from './utilidades.js';

// Cada cuántos segundos se buscan mensajes nuevos mientras el chat está abierto
const SEGUNDOS_ACTUALIZAR = 15;

// Chat entre estudiantes y docentes.
// contactos: [{ id, nombre, detalle, color, grupo }]   (grupo es opcional, sirve para filtrar)
// miRol: 'estudiante' o 'docente'
function Chat({ contactos, mensajes, miRol, llamar, actualizar, inicial, textoVacio }) {
  const otroDe = (m) => (miRol === 'estudiante' ? m.docenteId : m.estudianteId);

  const [actual, setActual] = useState(inicial ?? null);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const finRef = useRef(null);

  const contacto = contactos.find((c) => c.id === actual);
  const conversacion = mensajes.filter((m) => otroDe(m) === actual);
  const sinLeerDe = (id) => mensajes.filter((m) => otroDe(m) === id && m.remitente !== miRol && !m.leido).length;

  // Buscar mensajes nuevos cada cierto tiempo
  useEffect(() => {
    const reloj = setInterval(() => {
      llamar('/api/mensajes')
        .then((nuevos) => actualizar(() => ({ mensajes: nuevos })))
        .catch(() => {});
    }, SEGUNDOS_ACTUALIZAR * 1000);
    return () => clearInterval(reloj);
  }, [llamar, actualizar]);

  // Al ver una conversación, marcar como leídos los mensajes recibidos
  const pendientes = actual === null ? 0 : sinLeerDe(actual);
  useEffect(() => {
    if (actual === null || pendientes === 0) return;
    llamar('/api/mensajes/leidos', { metodo: 'POST', cuerpo: { con: actual } }).catch(() => {});
    actualizar((d) => ({
      mensajes: d.mensajes.map((m) => (otroDe(m) === actual && m.remitente !== miRol ? { ...m, leido: true } : m))
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actual, pendientes]);

  useEffect(() => {
    finRef.current?.scrollIntoView({ block: 'end' });
  }, [actual, conversacion.length]);

  if (contactos.length === 0) {
    return (
      <section className="panel">
        <p className="vacio">{textoVacio}</p>
      </section>
    );
  }

  // Ordenar: primero quienes tienen mensajes más recientes
  const ultimoDe = (id) => mensajes.filter((m) => otroDe(m) === id).at(-1);
  const grupos = [...new Set(contactos.map((c) => c.grupo).filter(Boolean))];
  const lista = contactos
    .filter((c) => filtro === 'todos' || c.grupo === filtro)
    .filter((c) => c.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()))
    .map((c, i) => ({ ...c, ultimo: ultimoDe(c.id), orden: i }))
    .sort((a, b) => {
      if (a.ultimo && b.ultimo) return new Date(b.ultimo.fecha) - new Date(a.ultimo.fecha);
      if (a.ultimo) return -1;
      if (b.ultimo) return 1;
      return a.orden - b.orden;
    });

  const enviar = async (e) => {
    e.preventDefault();
    const limpio = texto.trim();
    if (!limpio || enviando) return;

    setEnviando(true);
    setError('');
    try {
      const nuevo = await llamar('/api/mensajes', { metodo: 'POST', cuerpo: { para: actual, texto: limpio } });
      actualizar((d) => ({ mensajes: [...d.mensajes, nuevo] }));
      setTexto('');
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  const abrir = (id) => {
    setActual(id);
    setError('');
  };

  return (
    <div className={`chat ${contacto ? 'ver-conversacion' : 'ver-lista'}`}>
      <aside className="chat-lista">
        {grupos.length > 1 || contactos.length > 8 ? (
          <div className="chat-filtros">
            {grupos.length > 1 && (
              <select value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Filtrar por grupo">
                <option value="todos">Todos</option>
                {grupos.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            )}
            <input
              type="search"
              placeholder="Buscar..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              aria-label="Buscar contacto"
            />
          </div>
        ) : (
          <h3 className="panel-subtitulo">Contactos</h3>
        )}

        {lista.length === 0 && <p className="vacio">No hay resultados.</p>}

        {lista.map((c) => {
          const sinLeer = sinLeerDe(c.id);
          return (
            <button
              key={c.id}
              type="button"
              className={`chat-contacto ${c.id === actual ? 'activo' : ''}`}
              onClick={() => abrir(c.id)}
            >
              <span className="avatar" style={{ background: c.color }}>{iniciales(c.nombre)}</span>
              <span className="chat-contacto-texto">
                <strong>{c.nombre}</strong>
                <small>{c.ultimo ? c.ultimo.texto : c.detalle}</small>
              </span>
              {sinLeer > 0 && <em className="contador">{sinLeer}</em>}
            </button>
          );
        })}
      </aside>

      <section className="chat-conversacion">
        {!contacto ? (
          <p className="vacio chat-elige">Elige un contacto para ver la conversación.</p>
        ) : (
          <>
            <header className="chat-cabeza">
              <button
                type="button"
                className="boton-icono solo-movil"
                onClick={() => setActual(null)}
                aria-label="Volver a la lista de contactos"
              >
                <Icono nombre="izquierda" />
              </button>
              <span className="avatar" style={{ background: contacto.color }}>{iniciales(contacto.nombre)}</span>
              <div>
                <strong>{contacto.nombre}</strong>
                <small>{contacto.detalle}</small>
              </div>
            </header>

            <div className="chat-mensajes">
              {conversacion.length === 0 && <p className="vacio">Aún no hay mensajes. Escribe el primero.</p>}
              {conversacion.map((m) => (
                <div key={m.id} className={`burbuja ${m.remitente === miRol ? 'mia' : ''}`}>
                  <p>{m.texto}</p>
                  <small>
                    {formatoMomento(m.fecha)}
                    {m.remitente === miRol && m.leido && ' · Leído'}
                  </small>
                </div>
              ))}
              <div ref={finRef} />
            </div>

            {error && <p className="aviso aviso-error chat-error">{error}</p>}

            <form className="chat-escribir" onSubmit={enviar}>
              <input
                type="text"
                placeholder={`Escribe un mensaje a ${contacto.nombre}...`}
                maxLength={1000}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
              />
              <button
                type="submit"
                className="boton-primario"
                aria-label="Enviar mensaje"
                disabled={!texto.trim() || enviando}
              >
                <Icono nombre="enviar" tamano={18} />
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

export default Chat;
