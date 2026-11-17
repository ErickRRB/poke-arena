# Meowth sobre la torre princesa

El guardián Meowth (52) de las princesas usa una escala visual de 1.45 frente a la escala nativa de 1.3. El apoyo sigue en el montaje original de 46; cuerpo de torre, vida y sombras permanecen en sus posiciones. La misma transformación alrededor de ese apoyo ajusta la salida visual de monedas en vivo y desde su trayectoria guardada. Los datos de emisión del motor y las reglas del proyectil se conservan.

La selección exige una princesa y `guard.id===52`. Los reyes Nidoking/Nidoqueen conservan su escala de 1.32 y montaje de 59; las demás identidades no cambian. Esta mejora está separada de cuerpo/base/huella King, contacto de torres y efectos eléctricos.

`tools/review/meowth-guardian.case.json` muestra las dos orientaciones de equipo en un solo encuentro nativo de la App a 390 × 844: un Snorlax de cada bando se aproxima a la princesa rival. La IA está desactivada; todas las cartas, torres, despliegues y relojes mantienen sus valores nativos. Se comparan apoyo, presencia, preparación y salida real de monedas, junto con los rectángulos de arena/mano/elixir. Las pruebas verifican la emisión contra la geometría nativa del sprite en sus ocho vistas y preservan los otros guardianes. La revisión visual independiente evalúa los originales; los controles no prueban FPS percibidos ni contacto cuerpo a cuerpo.
