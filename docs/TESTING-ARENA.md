# Arena de pruebas

Abrir `/testing.html` o usar «Arena de pruebas» en el menú del juego. Funciona en el navegador sin CPU ni conexión multijugador y conserva los mazos guardados.

Al entrar hay seis referencias preparadas: Geodude (Caballero), Rhydon (P.E.K.K.A.), Charmander (parcial de Mago), Horda Diglett (parcial de Ejército de esqueletos), una Torre princesa y Sableye (parcial de Bandida). Las tres columnas siguientes están vacías y la décima permite comprobar Bola de fuego contra una torre y una defensa central. Cada escenario comienza pausado y se activa al colocar el otro bando. El selector de cada columna permite cambiar de rival o dejarla vacía. Se pueden comparar hasta 24 columnas.

La selección global admite todas las cartas jugables y ambos bandos, sin coste ni rotación de mano. Para preparar grupos, desactivar el inicio automático. Cada columna permite pausar, avanzar 0,1 s y reiniciar su escenario. La velocidad global admite ¼×, ½×, 1×, 2× y 4×. El sonido sigue la última columna usada y se puede silenciar.

El daño y el DPS cuentan la vida y el escudo efectivamente retirados, sin exceso de daño. El DPS usa una ventana de cinco segundos. La vida muestra los cuerpos y escudos del bando, e incluye la torre en el escenario de una Torre princesa. Las torres recuperan dos barras completas por segundo tras dos segundos sin daño; si mueren, reviven al terminar esa espera. Se puede desactivar su ataque.

Las cartas comparten estadísticas, colisiones, ataques y tiempos con `Game`. En los duelos sin torres, los bandos se acercan al rival aunque estén fuera de su visión. Para comprobar atracción, activación del rey y recorridos de partida, usar «Torres completas».

Validación: `npm run test:sandbox` y `node scripts/test-ui.mjs sandbox --matrix`. La superficie `window.arenaLab` permite repetir escenarios y revisar unidades, mediciones y sonido desde las herramientas del navegador.

## Revisión del 14 de noviembre de 2026

Sableye prepara su embestida durante 0,8 s y recorre el trayecto a 420 unidades/s, durante al menos 0,18 s. Puede iniciarla entre 84 y 144 unidades, en la misma orilla, y hace daño doble al llegar. La preparación es vulnerable e interrumpible; la invulnerabilidad solo cubre el desplazamiento. El golpe reinicia la cadencia normal y la habilidad conserva sus 3 s de recarga. Es una adaptación de Bandida, sin prometer paridad con su balance actual.

Se corrigieron las acciones posteriores a una muerte por daño continuo, la extensión del TTL de invocaciones durante aturdimientos y la copia incompleta de `windup` y `burnKind` en Ditto. Se ampliaron las siluetas de 17 especies pequeñas sin modificar sus radios de colisión. Las voces de las seis especies nuevas provienen del mismo archivo de grabaciones usado por el resto del catálogo.

El tablero usa terreno, orillas y puentes originales, con el agua conservada entre y=388 e y=412. Las marcas de hechizos usan el radio real y muestran posiciones de invocación calculadas con las mismas restricciones que su despliegue. Las trayectorias, las salpicaduras y los ataques físicos usan efectos distintos, con menos copias superpuestas del proyectil.

Los hechizos consideran el cuerpo completo del objetivo. Las torres reciben hechizos en un cuadrado de 2×2 celdas y las demás unidades usan su radio de colisión completo. Antes solo se sumaba el 40 % de ese radio, lo que recortaba el margen junto a las torres aproximadamente media celda. Bola de fuego conserva su radio de 2,5 celdas (60 unidades). El dato de radio y la distinción entre alcance circular y huella de torre se revisaron con el [informe de extracción y medición de RoyaleSim](https://royalegym.github.io/RoyaleGym/repos/royalesim/spell-spec/); su criterio de intersección para tropas se declara allí como inferencia, no como verificación completa del cliente actual. La vista previa, la CPU, el daño y los campos comparten ahora el mismo cálculo local.

La Pokébola original de `assets/ui/pokeball-v2.webp` se comparte entre despliegues, invocaciones, proyectiles, menús, cargas y favicon. El despliegue muestra la Pokébola y una barra breve sin placa de fondo.
