# Productores retenidos

Estos JSON contienen la salida real de `packGame` de cada árbol indicado, sin editar sus perfiles: partida con Arcanine en mano, cuerpos Arcanine/Onix/Rapidash y un job de ataque pendiente. Los escenarios fueron creados por el autor para probar compatibilidad; no son partidas públicas ni demuestran percepción o transporte online.

- `6044941.json`: `6044941ad49b30144471e3ded8046f80ef28c3e9`, productor C1 público sin metadata de catálogo.
- `29e8869.json`: `29e8869d113fce50c1fb541c4a66d486abcb5c9e`, productor C3 con Arcanine anterior.
- `decb9f9.json`: `decb9f931485052e9ccb31ae897d9118130a07d5`, productor C3 con Arcanine Hog.
- `65ab375.json`: `65ab37512ad54d83d9a4978c3379ffb8ca629c04` ejecutó `unpackGame` del fixture 604 y volvió a empaquetar. Su representación marca catálogo4 y reglas C1; no es una sala C4 ni autorización para mover sesiones.

Los módulos ejecutados se extrajeron directamente de los objetos Git, sin copiar un engine al producto. La procedencia explícita dentro del sobre es documental: los snapshots C3 no recibieron manualmente `profileProducer`; el validador infiere el productor a partir de perfiles completos.
