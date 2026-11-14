# Poses nativas para combos

Se importaron cinco clips de [SpriteCollab, commit fijado](https://github.com/PMDCollab/SpriteCollab/tree/576a7f13b5b7f6ad09a5877d5ae6b2d33458c245): Machamp/Punch, Scyther/Slice, Scizor/MultiScratch, Treecko/Appeal y Gardevoir/Appeal.

Cada clip conserva sus PNG originales Anim, Offsets y Shadow, sin alterar píxeles. `provenance.json` identifica la URL de origen, el commit, los 15 archivos importados, sus tamaños y SHA256, y las cinco entradas añadidas a `dist/assets/pokemon/manifest.json`.

Los HitFrame y las duraciones del manifiesto son los originales de la fuente. La sincronización de los contactos de cada combo y los puntos de emisión se resuelven en los perfiles de combate. La geometría generada se regenera después de integrar estos activos.

La comprobación posterior con Renderer está en [renderer/README.md](renderer/README.md), junto al [visor de videos](renderer/index.html), las láminas de ocho direcciones y las trazas de contactos, emisores, recuperación, interrupción y pausa.
