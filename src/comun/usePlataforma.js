import { useCallback, useEffect, useRef, useState } from 'react';
import { pedir } from '../api.js';

// Carga los datos de una plataforma (estudiante, docente o administrador) y
// entrega funciones para llamar a la API y actualizar los datos en pantalla.
// "preparar" debe ser una función definida fuera del componente.
export function usePlataforma(ruta, onSalir, preparar) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [intento, setIntento] = useState(0);

  // Se guarda onSalir en una referencia para que "llamar" no cambie en cada render
  const onSalirRef = useRef(onSalir);
  useEffect(() => {
    onSalirRef.current = onSalir;
  });

  // Llamar a la API; si la sesión expiró, volver al inicio de sesión
  const llamar = useCallback(async (destino, opciones) => {
    try {
      return await pedir(destino, opciones);
    } catch (e) {
      if (e.estado === 401) onSalirRef.current(false);
      throw e;
    }
  }, []);

  useEffect(() => {
    let activo = true;
    llamar(ruta)
      .then((respuesta) => activo && setDatos(preparar ? preparar(respuesta) : respuesta))
      .catch((e) => activo && setError(e.message));
    return () => {
      activo = false;
    };
  }, [llamar, ruta, preparar, intento]);

  const reintentar = () => {
    setError('');
    setIntento((n) => n + 1);
  };

  // Cambia una parte de los datos sin volver a pedir todo al servidor
  const actualizar = useCallback((cambio) => setDatos((previos) => ({ ...previos, ...cambio(previos) })), []);

  return { datos, error, reintentar, llamar, actualizar };
}
