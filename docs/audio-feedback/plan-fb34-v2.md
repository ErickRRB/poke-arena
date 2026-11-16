# Ampliación FB34: tres controles — 2026-11-16

Pedido posterior al prototipo de dos controles conservado en el commit anterior; ese prototipo no se publicó y su primera prueba encontró que Ajustes no era accesible desde la arena, por lo que se agregó un acceso flotante, pendiente de verificación visual y funcional.

- Separar Música, Voces de Pokémon y Efectos del juego. Valores predeterminados 50/100/100, cada uno multiplica solo su bus original; voces usan `voices`, efectos usan `effects` y `ui`. No duplicar el factor sobre voces ni alterar FB26, ataques, música o silencio global. Guardar cada valor y conservar ceros y silencio en recarga. Migrar el `game-volume` del prototipo solo si existe, para efectos y voces cuando falten sus claves nuevas.
- Verificar con navegador real y música activa los tres nodos, cada cero por separado, continuidad de pista, cambio de teclado/táctil, foco y Escape, persistencia y silencio, además de rectángulos y gasto de cartas. No inferir calidad auditiva de los números. Mantener FB29 y música 92 fuera de esta rama.
