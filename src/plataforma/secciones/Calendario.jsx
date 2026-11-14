import { useState } from 'react';
import Icono from '../../comun/Icono.jsx';
import { dia, formatoFecha, mismoDia } from '../../comun/utilidades.js';

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const NOMBRE_TIPO = {
  evaluacion: 'Evaluación',
  evento: 'Evento',
  festivo: 'Festivo',
  entrega: 'Entrega de tarea'
};

function Calendario({ datos }) {
  const hoy = dia(0);
  const [mes, setMes] = useState(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  const [seleccionado, setSeleccionado] = useState(hoy);

  // Une los eventos del colegio con las fechas de entrega de las tareas
  const todosLosEventos = [
    ...datos.eventos,
    ...datos.tareas.map((t) => ({
      id: `tarea-${t.id}`,
      titulo: `${t.titulo} (${datos.materias.find((m) => m.id === t.materiaId)?.nombre ?? ''})`,
      fecha: t.fecha,
      tipo: 'entrega'
    }))
  ].sort((a, b) => a.fecha - b.fecha);

  // Construir las casillas del mes (la semana empieza el lunes)
  const desfase = (mes.getDay() + 6) % 7;
  const diasDelMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
  const casillas = [
    ...Array(desfase).fill(null),
    ...Array.from({ length: diasDelMes }, (_, i) => new Date(mes.getFullYear(), mes.getMonth(), i + 1))
  ];

  const eventosDe = (fecha) => todosLosEventos.filter((e) => mismoDia(e.fecha, fecha));
  const eventosSeleccionados = eventosDe(seleccionado);
  const proximos = todosLosEventos.filter((e) => e.fecha >= hoy).slice(0, 8);

  const cambiarMes = (cantidad) => {
    setMes(new Date(mes.getFullYear(), mes.getMonth() + cantidad, 1));
  };

  return (
    <div className="calendario-contenedor">
      <section className="panel">
        <div className="calendario-cabeza">
          <button type="button" className="boton-icono" onClick={() => cambiarMes(-1)} aria-label="Mes anterior">
            <Icono nombre="izquierda" />
          </button>
          <h3>{formatoFecha(mes, { month: 'long', year: 'numeric' })}</h3>
          <button type="button" className="boton-icono" onClick={() => cambiarMes(1)} aria-label="Mes siguiente">
            <Icono nombre="derecha" />
          </button>
        </div>

        <div className="calendario">
          {DIAS_SEMANA.map((d) => (
            <span key={d} className="calendario-dia-nombre">{d}</span>
          ))}
          {casillas.map((fecha, i) => {
            if (!fecha) return <span key={`vacio-${i}`} />;
            const delDia = eventosDe(fecha);
            const clases = [
              'calendario-dia',
              mismoDia(fecha, hoy) ? 'hoy' : '',
              mismoDia(fecha, seleccionado) ? 'seleccionado' : ''
            ].join(' ');
            return (
              <button key={fecha.getDate()} type="button" className={clases} onClick={() => setSeleccionado(fecha)}>
                <span>{fecha.getDate()}</span>
                <span className="marcas">
                  {delDia.slice(0, 3).map((e) => (
                    <i key={e.id} className={`marca tipo-${e.tipo}`} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>

        <div className="leyenda">
          {Object.entries(NOMBRE_TIPO).map(([tipo, nombre]) => (
            <span key={tipo}><i className={`marca tipo-${tipo}`} /> {nombre}</span>
          ))}
        </div>
      </section>

      <div className="calendario-lado">
        <section className="panel">
          <h3 className="panel-subtitulo">
            {formatoFecha(seleccionado, { weekday: 'long', day: 'numeric', month: 'long' })}
          </h3>
          {eventosSeleccionados.length === 0 ? (
            <p className="vacio">No hay actividades para este día.</p>
          ) : (
            <ul className="lista">
              {eventosSeleccionados.map((e) => (
                <li key={e.id}>
                  <i className={`marca grande tipo-${e.tipo}`} />
                  <div>
                    <strong>{e.titulo}</strong>
                    <small>{NOMBRE_TIPO[e.tipo]}</small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <h3 className="panel-subtitulo">Próximas actividades</h3>
          {proximos.length === 0 ? (
            <p className="vacio">No hay actividades próximas.</p>
          ) : (
            <ul className="lista">
              {proximos.map((e) => (
                <li key={e.id}>
                  <span className="fecha-mini">
                    <b>{e.fecha.getDate()}</b>
                    {formatoFecha(e.fecha, { month: 'short' })}
                  </span>
                  <div>
                    <strong>{e.titulo}</strong>
                    <small className={`tipo-${e.tipo}`}>{NOMBRE_TIPO[e.tipo]}</small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

export default Calendario;
