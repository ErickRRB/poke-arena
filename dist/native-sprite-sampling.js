const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));

// Reconstruct diagonal edges using only original palette entries before the
// area reduction. Rule reference: https://www.scale2x.it/algorithm . The input
// frame, its six faces, cracks, silhouette and animation remain the source.
export function expandPixelEdges(data,width,height){
  const source=new Uint32Array(data.buffer,data.byteOffset,data.length/4),out=new Uint32Array(width*height*4);
  const at=(x,y)=>source[clamp(y,0,height-1)*width+clamp(x,0,width-1)];
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const e=at(x,y),up=at(x,y-1),down=at(x,y+1),left=at(x-1,y),right=at(x+1,y),start=y*2*width*2+x*2;
    out[start]=up!==down&&left!==right&&left===up?left:e;
    out[start+1]=up!==down&&left!==right&&up===right?right:e;
    out[start+width*2]=up!==down&&left!==right&&left===down?left:e;
    out[start+width*2+1]=up!==down&&left!==right&&down===right?right:e;
  }
  return{data:new Uint8ClampedArray(out.buffer),width:width*2,height:height*2};
}

export function reduceNativeSprite(input,width,height,targetWidth,targetHeight){
  const expanded=expandPixelEdges(input,width,height);input=expanded.data;width=expanded.width;height=expanded.height;
  const output=new Uint8ClampedArray(targetWidth*targetHeight*4),sx=width/targetWidth,sy=height/targetHeight;
  for(let y=0;y<targetHeight;y++)for(let x=0;x<targetWidth;x++){
    const left=x*sx,right=(x+1)*sx,top=y*sy,bottom=(y+1)*sy,sums=[0,0,0];let alpha=0;
    for(let py=Math.floor(top);py<Math.ceil(bottom);py++)for(let px=Math.floor(left);px<Math.ceil(right);px++){
      const weight=(Math.min(right,px+1)-Math.max(left,px))*(Math.min(bottom,py+1)-Math.max(top,py)),at=(py*width+px)*4,a=input[at+3]/255*weight;alpha+=a;
      for(let c=0;c<3;c++)sums[c]+=input[at+c]*a;
    }
    const at=(y*targetWidth+x)*4;output[at+3]=alpha/(sx*sy)*255;if(alpha)for(let c=0;c<3;c++)output[at+c]=sums[c]/alpha;
  }
  return output;
}

export class NativeSpriteSampler{
  constructor(){this.cache=new Map();this.inputs=new WeakMap();this.enabled=true;}
  frame(id,animation,direction,frame,meta,scale,vertical,transform,image){
    if(!this.enabled||id!==102||!transform||transform.b||transform.c||Math.abs(transform.a)*scale>=1)return null;
    const width=Math.max(1,Math.round(meta.width*Math.abs(transform.a)*scale)),height=Math.max(1,Math.round(meta.height*Math.abs(transform.d)*scale/vertical)),key=[animation,direction,frame,width,height].join(':');
    if(this.cache.has(key))return this.cache.get(key);
    let inputs=this.inputs.get(image);if(!inputs)this.inputs.set(image,inputs=new Map());const sourceKey=frame+':'+direction;let pixels=inputs.get(sourceKey);
    if(!pixels){const source=document.createElement('canvas');source.width=meta.width;source.height=meta.height;const c=source.getContext('2d',{willReadFrequently:true});c.drawImage(image,frame*meta.width,direction*meta.height,meta.width,meta.height,0,0,meta.width,meta.height);pixels=c.getImageData(0,0,meta.width,meta.height).data;inputs.set(sourceKey,pixels);}
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const c=canvas.getContext('2d'),output=c.createImageData(width,height);output.data.set(reduceNativeSprite(pixels,meta.width,meta.height,width,height));c.putImageData(output,0,0);const result={image:canvas,width:meta.width,height:meta.height,padding:0};if(this.cache.size>=256)this.cache.delete(this.cache.keys().next().value);this.cache.set(key,result);return result;
  }
}
