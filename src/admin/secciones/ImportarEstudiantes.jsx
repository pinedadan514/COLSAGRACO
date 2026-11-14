import { useRef, useState } from 'react';
import Icono from '../../comun/Icono.jsx';
import { descargar } from '../../api.js';
import { GRADOS } from '../../comun/utilidades.js';

const MAXIMO_MB = 8;

// Lee el archivo y devuelve su contenido en base64 (sin el prefijo "data:...")
function leerBase64(archivo) {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => resolver(String(lector.result).split(',')[1] ?? '');
    lector.onerror = () => rechazar(new Error('No se pudo leer el archivo'));
    lector.readAsDataURL(archivo);
  });
}

function ImportarEstudiantes({ datos, llamar, recargar }) {
  const [archivo, setArchivo] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [cargando, setCargando] = useState(false);
  const campoRef = useRef(null);

  const total = datos.porGrado.reduce((s, g) => s + g.total, 0);
  const enGrado = (g) => datos.porGrado.find((x) => x.grado === g)?.total ?? 0;

  const bajarPlantilla = async () => {
    try {
      await descargar('/api/admin/plantilla', 'plantilla-estudiantes-colsagraco.xlsx');
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    }
  };

  const elegir = (e) => {
    const elegido = e.target.files?.[0] ?? null;
    setResultado(null);
    setMensaje(null);
    if (elegido && !elegido.name.toLowerCase().endsWith('.xlsx')) {
      setMensaje({ tipo: 'error', texto: 'El archivo debe ser de Excel (.xlsx). Si es .xls o .csv, ábrelo en Excel y guárdalo como .xlsx.' });
      setArchivo(null);
      return;
    }
    if (elegido && elegido.size > MAXIMO_MB * 1024 * 1024) {
      setMensaje({ tipo: 'error', texto: `El archivo es demasiado grande (máximo ${MAXIMO_MB} MB).` });
      setArchivo(null);
      return;
    }
    setArchivo(elegido);
  };

  const importar = async () => {
    if (!archivo) return;
    setCargando(true);
    setMensaje(null);
    try {
      const contenido = await leerBase64(archivo);
      const respuesta = await llamar('/api/admin/importar', { metodo: 'POST', cuerpo: { archivo: contenido } });
      setResultado(respuesta);
      setArchivo(null);
      if (campoRef.current) campoRef.current.value = '';
      recargar();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    } finally {
      setCargando(false);
    }
  };

  return (
    <>
      <section className="resumen resumen-grados">
        <div className="resumen-tarjeta estatica">
          <strong>{total}</strong>
          <small>Estudiantes en total</small>
        </div>
        {GRADOS.map((g) => (
          <div key={g} className="resumen-tarjeta estatica">
            <strong>{enGrado(g)}</strong>
            <small>Grado {g}°</small>
          </div>
        ))}
      </section>

      <div className="columnas">
        <section className="panel">
          <h3 className="panel-subtitulo">1. Descarga la plantilla</h3>
          <p className="seccion-intro">
            Llena una fila por estudiante con sus datos y los del acudiente. Las columnas obligatorias son: documento,
            nombres, primer apellido y grado (6 a 11).
          </p>
          <button type="button" className="boton-secundario-plat boton-con-icono" onClick={bajarPlantilla}>
            <Icono nombre="permiso" tamano={18} /> Descargar plantilla de Excel
          </button>

          <div className="nota-ayuda">
            <strong>¿Cómo ingresa cada estudiante?</strong>
            <br />
            Usuario: su número de documento.
            <br />
            Contraseña inicial: primer apellido en minúsculas y sin tildes + los dos primeros números del documento.
            <br />
            Ejemplo: Pérez, documento 1098765432 → <b>perez10</b>. Al primer ingreso debe crear una contraseña nueva.
          </div>
        </section>

        <section className="panel">
          <h3 className="panel-subtitulo">2. Sube el archivo lleno</h3>
          <label className={`zona-archivo ${archivo ? 'con-archivo' : ''}`}>
            <input ref={campoRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={elegir} />
            <Icono nombre="permiso" tamano={28} />
            <span>{archivo ? archivo.name : 'Haz clic aquí para elegir el archivo .xlsx'}</span>
            {archivo && <small>{(archivo.size / 1024).toFixed(0)} KB</small>}
          </label>
          <button type="button" className="boton-primario boton-ancho" onClick={importar} disabled={!archivo || cargando}>
            {cargando ? 'Cargando estudiantes...' : 'Cargar estudiantes'}
          </button>
          <p className="nota-ayuda">
            Si un estudiante ya existe (mismo documento), se actualizan sus datos y su grado, pero no su contraseña.
          </p>
          {mensaje && <p className={`aviso aviso-${mensaje.tipo}`}>{mensaje.texto}</p>}
        </section>
      </div>

      {resultado && (
        <section className="panel">
          <h3 className="panel-subtitulo">Resultado de la carga</h3>
          <div className="resultado-carga">
            <span className="estado-conteo presente">Cuentas nuevas: {resultado.creados}</span>
            <span className="estado-conteo excusa">Actualizados: {resultado.actualizados}</span>
            <span className={`estado-conteo ${resultado.errores.length ? 'falta' : 'presente'}`}>
              Filas con error: {resultado.errores.length}
            </span>
          </div>
          {resultado.errores.length > 0 && (
            <>
              <p className="seccion-intro">Corrige estas filas en el Excel y vuelve a subirlo (las demás no se duplican):</p>
              <div className="tabla-contenedor">
                <table className="tabla">
                  <thead>
                    <tr><th>Fila</th><th>Documento</th><th>Problema</th></tr>
                  </thead>
                  <tbody>
                    {resultado.errores.map((e) => (
                      <tr key={e.fila}>
                        <td>{e.fila}</td>
                        <td>{e.documento || '—'}</td>
                        <td className="texto-rojo">{e.mensaje}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}
    </>
  );
}

export default ImportarEstudiantes;
