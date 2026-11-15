// Pruebas unitarias del módulo comun/utilidades.js
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  GRADOS, hoyTexto, dia, aFecha, formatoFecha, formatoMomento, diasRestantes, mismoDia,
  iniciales, desempeno, promedio, totalesAsistencia
} from '../comun/utilidades.js';

afterEach(() => vi.useRealTimers());

describe('Utilidades: fechas', () => {
  it('hoyTexto devuelve la fecha local en formato AAAA-MM-DD', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 5, 9, 30));
    expect(hoyTexto()).toBe('2026-11-05');
  });

  it('dia(n) devuelve la fecha a medianoche sumando n días', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 11, 31, 18, 0));
    const manana = dia(1);
    expect([manana.getFullYear(), manana.getMonth(), manana.getDate(), manana.getHours()]).toEqual([2027, 0, 1, 0]);
  });

  it('aFecha convierte el texto de MySQL en una fecha local sin cambiar el día', () => {
    const f = aFecha('2026-03-01');
    expect([f.getFullYear(), f.getMonth(), f.getDate()]).toEqual([2026, 2, 1]);
  });

  it('diasRestantes cuenta los días que faltan (negativo si ya pasó)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 15, 10, 0));
    expect(diasRestantes(aFecha('2026-11-18'))).toBe(3);
    expect(diasRestantes(aFecha('2026-11-15'))).toBe(0);
    expect(diasRestantes(aFecha('2026-11-10'))).toBe(-5);
  });

  it('mismoDia compara solo el día, no la hora', () => {
    expect(mismoDia(new Date(2026, 0, 1, 8), new Date(2026, 0, 1, 20))).toBe(true);
    expect(mismoDia(new Date(2026, 0, 1), new Date(2026, 0, 2))).toBe(false);
  });

  it('formatoFecha escribe la fecha en español de Colombia', () => {
    expect(formatoFecha(aFecha('2026-11-15'), { day: 'numeric', month: 'long' })).toBe('15 de noviembre');
  });

  it('formatoMomento muestra la hora si es de hoy y la fecha si es de otro día', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 15, 18, 0));
    expect(formatoMomento(new Date(2026, 10, 15, 9, 5).toISOString())).toMatch(/9:05/);
    expect(formatoMomento(new Date(2026, 10, 10, 9, 5).toISOString())).toMatch(/10/);
  });
});

describe('Utilidades: textos y notas', () => {
  it('GRADOS va de 6 a 11', () => {
    expect(GRADOS).toEqual([6, 7, 8, 9, 10, 11]);
  });

  it('iniciales toma las dos primeras palabras en mayúscula', () => {
    expect(iniciales('ana maría peña')).toBe('AM');
    expect(iniciales('  Luis  ')).toBe('L');
  });

  it('desempeno usa la escala colombiana', () => {
    expect(desempeno(4.8).nombre).toBe('Superior');
    expect(desempeno(4.6).nombre).toBe('Superior');
    expect(desempeno(4.0).nombre).toBe('Alto');
    expect(desempeno(3.0).nombre).toBe('Básico');
    expect(desempeno(2.9).nombre).toBe('Bajo');
    expect(desempeno(null).nombre).toBe('Sin nota');
  });

  it('promedio ignora las materias sin nota', () => {
    expect(promedio([{ nota: 4 }, { nota: 5 }, { nota: null }])).toBe(4.5);
    expect(promedio([{ nota: null }])).toBeNull();
  });

  it('totalesAsistencia suma las clases y calcula el porcentaje', () => {
    const t = totalesAsistencia([
      { clases: 10, asistidas: 9, tardanzas: 1 },
      { clases: 10, asistidas: 8, tardanzas: 0 }
    ]);
    expect(t).toEqual({ clases: 20, asistidas: 17, tardanzas: 1, porcentaje: 85 });
    expect(totalesAsistencia([]).porcentaje).toBeNull();
  });
});
