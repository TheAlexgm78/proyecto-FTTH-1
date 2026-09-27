# Arquitectura del Simulador FTTH

## Objetivo

Construir un laboratorio web interactivo que permita aprender una red FTTH de extremo a extremo.

## Módulos principales

1. Red
   - OLT
   - ODF
   - Feeder
   - Mufas
   - Splitters
   - CTO / NAP
   - Drop
   - ONT

2. Empalmes
   - Buffers
   - Hilos
   - Bandejas
   - Fusiones
   - Guías de empalme

3. Potencia óptica
   - dBm
   - dB
   - Atenuación
   - Splitters
   - Conectores
   - Presupuesto óptico

4. Averías
   - Cortes
   - Curvaturas
   - Empalmes defectuosos
   - Conectores sucios
   - Equipos dañados

5. OTDR
   - Trazas
   - Eventos
   - Distancia
   - Pérdida
   - Reflectancia

6. Entrenamiento
   - Tutorial
   - Práctica
   - Examen

## Estructura

```
src/
  assets/
  components/
  data/
  features/
    network/
    splicing/
    faults/
    otdr/
    training/
  styles/
  utils/
docs/
```

Esta estructura permite agregar módulos sin convertir `App.jsx` en un archivo demasiado grande.
