# Mounted royal guardian scale

Only mounted King Nidoking (34) and Nidoqueen (31) use presentation scale 1.32 instead of 1.15, an increase of about 14.8%. Princess guardians and troop/card sizes keep their existing values. The guardian's x and foot mount remain at the original tower x and `tower.y - TOWER_MOUNTS.king / verticalScale`.

The engine uses the shared `sprite-motion.emissionPoint`, so it is deliberately unchanged. `tower-guardian-art.js` maps a native unprojected emitter point about that same foot mount for rendering. Both live visual emission and the saved projectile launch point use the mapping before projection. Saved native projectile state, end point, timing, direction, tower body/collider, health and activation rules are unchanged.

This change is kept in its own product commit after the scenery/perimeter. Main must selectively apply these guardian call sites and helper, preserving the current renderer's other changes. It does not implement Main's King-health visibility or Terra/Main's tower base/contact work. The explicit unchanged mount is 59 world units above the logical King y; the tower graphic itself keeps its existing base and width.
