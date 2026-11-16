# Plan previo — estrategia CPU (2026-11-16)

Base 21903c2004ff23108d5987ea0e2413aae6961aab, árbol c4cf4bd3ee06df93bbe806da7715ed59095f9e09. Fuente extraída sin modificar el checkout público.

Incertidumbre principal: el arrastre nativo ocurre en pasos y depende de velocidad/masa, obstáculos y colisión; cercanía y score no demuestran que agrupe, active rey o evite daño. Primero ejecutar Game.ai + Game.step con una escena de grupo y aliado de área, observar lanzamiento, posiciones y daño real. Si falla, corregir antes de ampliar. Usar sólo unidades visibles, alcance/filtros reales, campo vigente y punto legal; sin conocer mano rival ni cambiar economía o reglas. No prometer combo futuro sin acción temporal viable.

Luego evaluar abstención ante aislado, defensa y activación del rey con consecuencias reales, cancelación y continuación tras torre caída; validar costes y 8 cartas seleccionables. Documentar sustituciones y evidencia; no modificar UI ni mazos guardados. La revisión técnica y de uso independiente y decisión final corresponden a Root; este documento no es aprobación.
