# Nueva selección de mazos C1

`dist/canonical-selection.js` es la política pura compartida de selección nueva. No importa ni consulta `engine`, `CARDS`, storage, estado de sala o runtime; su allowlist se deriva de `canonical-table-v2.json` en selección versión 1. SHA-256 del módulo de esta entrega: `d063c0a48170db86082dfed568fcc08d86aee64554c3255f7098cd88f3f97bc4`.

Exports:

- `selectionVersion`: versión de política (`1`).
- `resolveSelectionKey(key)`: resuelve sólo aliases preservados en `SELECTION_ALIASES`; devuelve `{key, alias, reason}`. No cambia ni persiste la key recibida.
- `checkSelectionCard(key)`: devuelve `{ok,key,canonicalKey,reason}` para admitir sólo una de las 46 representantes aprobadas.
- `checkSelectionDeck(deck)`: no compacta ni completa el array. Exige ocho posiciones, ocho keys elegibles y ocho identidades distintas; devuelve `{ok,version,reasons,slots}` con el motivo por slot.

Las migraciones de restauración y selección nueva son contextos distintos. En particular, el alias engine/storage histórico `blastoise → octillery` no es un alias de admisión: la conversión de significado sigue pendiente y el slot requiere reemplazo o aceptación explícita. `Game.spawn`, snapshots, tokens, partidas guardadas y perfiles históricos no consultan esta política.

El servidor importa exactamente el mismo archivo/versionado de política y valida sólo al crear una búsqueda nueva, después de autenticación/restauración. Una conexión reanudada conserva su cohorte histórica. Esta política no implementa colas, TTL, aliases de red ni restauración; tampoco certifica fidelidad mecánica de los representantes.

## Cliente y límites

La colección ofrece los 46 representantes. Un mazo guardado conserva sus posiciones y claves originales; aliases compatibles se resuelven para mostrar y jugar sin escribirlos de vuelta. Las cartas inactivas presentes en CARDS conservan su identidad e Info sólo en los espacios guardados y permiten quitar o reemplazar por índice. La key histórica `blastoise`, ausente de CARDS, muestra su nombre como espacio conservado sin Info ni conversión automática: la versión anterior exacta de un slot guardado no está identificada. Una key desconocida conserva un placeholder sin perder el valor guardado.

CPU y tutorial usan representantes elegibles; laboratorio y `SandboxGame.place` validan selección nueva y resuelven aliases compatibles. El idle de cola histórica transmite el mensaje al aviso, conserva token cuando la sesión no expiró y no reinicia una búsqueda. El servidor y la validación autoritativa de admisiones corresponden a Main. Los cambios de engine compartido y versiones de assets deben reconciliarse con la fuente frontend pública más nueva antes de publicación; este candidato parte de 316.
