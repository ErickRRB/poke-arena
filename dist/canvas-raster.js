// CSS/world geometry stays independent of the bounded physical drawing buffer.
export function canvasBackingSize(width,height,deviceRatio=1){
  if(!(width>0&&height>0))return null;
  const requested=Math.max(1,Math.min(3,Number(deviceRatio)||1));
  const ratio=Math.min(requested,4096/Math.max(width,height),Math.sqrt(6_000_000/(width*height)));
  return{width:Math.max(1,Math.round(width*ratio)),height:Math.max(1,Math.round(height*ratio)),ratio};
}

export function alignedSpriteRect(rect,transform){
  const result=rect.slice();
  if(!transform||transform.b||transform.c||!transform.a||!transform.d){result[4]=Math.round(result[4]);result[5]=Math.round(result[5]);return result;}
  result[4]=(Math.round(result[4]*transform.a+transform.e)-transform.e)/transform.a;
  result[5]=(Math.round(result[5]*transform.d+transform.f)-transform.f)/transform.d;
  return result;
}
