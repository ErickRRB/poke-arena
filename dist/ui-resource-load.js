// Hidden dialogs and results need their existing font faces before first use,
// too. Their loads share the initial resource gate and its measured progress.
export async function loadUiResources(loadAssets,onProgress=()=>{},fontSet=globalThis.document?.fonts){
  const faces=Array.from(fontSet||[]);let fontsLoaded=0,assetsLoaded=0,assetsTotal=null;
  // One real completion step covers renderer finalization and font layout.
  const report=()=>{if(assetsTotal!==null)onProgress(assetsLoaded+fontsLoaded,assetsTotal+faces.length+1);};
  await Promise.all([
    Promise.resolve().then(()=>loadAssets((loaded,total)=>{assetsLoaded=loaded;assetsTotal=total;report();})),
    ...faces.map(async face=>{await face.load();fontsLoaded++;report();})
  ]);
  if(fontSet?.ready)await fontSet.ready;
  if(assetsTotal!==null)onProgress(assetsTotal+faces.length+1,assetsTotal+faces.length+1);
}
