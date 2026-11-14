// Funciones de ayuda para fechas y formatos de la plataforma

export const GRADOS = [6, 7, 8, 9, 10, 11];

// Fecha de hoy en formato AAAA-MM-DD (el que usan los campos tipo "date")
export function hoyTexto() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Fecha de hoy + n días (a medianoche)
export function dia(n = 0) {
  const fecha = new Date();
  fecha.setHours(0, 0, 0, 0);
  fecha.setDate(fecha.getDate() + n);
  return fecha;
}

// Convierte 'AAAA-MM-DD' (como llega de MySQL) en una fecha local
export function aFecha(texto) {
  const [anio, mes, diaMes] = texto.split('-').map(Number);
  return new Date(anio, mes - 1, diaMes);
}

export function formatoFecha(fecha, opciones = { day: 'numeric', month: 'short' }) {
  return fecha.toLocaleDateString('es-CO', opciones);
}

// Hora (o día) en que se envió un mensaje
export function formatoMomento(textoFecha) {
  const fecha = new Date(textoFecha);
  const hoy = dia(0);
  if (fecha >= hoy) {
    return fecha.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
  }
  return formatoFecha(fecha, { day: 'numeric', month: 'short' });
}

export function diasRestantes(fecha) {
  return Math.round((fecha - dia(0)) / 86400000);
}

export function mismoDia(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function iniciales(nombre) {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join('');
}

// Escala de valoración colombiana (1.0 a 5.0)
export function desempeno(nota) {
  if (nota === null || nota === undefined) return { nombre: 'Sin nota', clase: 'sin-nota' };
  if (nota >= 4.6) return { nombre: 'Superior', clase: 'superior' };
  if (nota >= 4.0) return { nombre: 'Alto', clase: 'alto' };
  if (nota >= 3.0) return { nombre: 'Básico', clase: 'basico' };
  return { nombre: 'Bajo', clase: 'bajo' };
}

// Promedio de las notas registradas (null si no hay ninguna)
export function promedio(materias) {
  const conNota = materias.filter((m) => m.nota !== null);
  if (conNota.length === 0) return null;
  return conNota.reduce((s, m) => s + m.nota, 0) / conNota.length;
}

// Totales de asistencia (porcentaje null si no hay clases registradas)
export function totalesAsistencia(asistencia) {
  const t = asistencia.reduce(
    (s, a) => ({
      clases: s.clases + a.clases,
      asistidas: s.asistidas + a.asistidas,
      tardanzas: s.tardanzas + a.tardanzas
    }),
    { clases: 0, asistidas: 0, tardanzas: 0 }
  );
  return { ...t, porcentaje: t.clases ? Math.round((t.asistidas / t.clases) * 100) : null };
}
