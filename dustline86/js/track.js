// Track data and procedural scenery.
export const TRACKS = {};

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}

function makeTrack(){
  // Unique control points for a genuinely periodic spline. The old track repeated
  // its first point at the end, but the incoming tangent approached the seam from
  // the opposite direction. That created the ugly 180-degree hairpin at lap start.
  const pts=[];
  const M=48;
  for(let k=0;k<M;k++){
    const theta=-Math.PI/2+k*Math.PI*2/M;
    // A perturbed ellipse keeps the course fully closed and non-self-intersecting,
    // while the harmonics create a few faster sweepers and tighter technical bends.
    const radius=1+.05*Math.sin(3*theta+.4)+.025*Math.sin(5*theta-1.1);
    const x=210*radius*Math.cos(theta);
    const z=-18+150*radius*Math.sin(theta);
    const y=2.5+18*(.5+.5*Math.sin(theta+Math.PI/2))+3*Math.sin(2*theta-.6);
    pts.push([x,y,z]);
  }

  const samples=[];
  const N=720;
  const width=11.5;

  function pointAt(u,dim){
    // Periodic Catmull-Rom. No duplicated endpoint, no seam tangent discontinuity.
    const wrapped=((u%M)+M)%M;
    const j=Math.floor(wrapped),t=wrapped-j;
    const p0=pts[(j-1+M)%M],p1=pts[j],p2=pts[(j+1)%M],p3=pts[(j+2)%M];
    const t2=t*t,t3=t2*t;
    return .5*((2*p1[dim])+(-p0[dim]+p2[dim])*t+(2*p0[dim]-5*p1[dim]+4*p2[dim]-p3[dim])*t2+(-p0[dim]+3*p1[dim]-3*p2[dim]+p3[dim])*t3);
  }

  for(let i=0;i<N;i++){
    const u=i/N*M;
    samples.push({x:pointAt(u,0),y:pointAt(u,1),z:pointAt(u,2)});
  }

  for(let i=0;i<N;i++){
    const prev=samples[(i-1+N)%N],a=samples[i],b=samples[(i+1)%N];
    const dx=b.x-prev.x,dz=b.z-prev.z,dy=b.y-prev.y;
    const hlen=Math.hypot(dx,dz)||1;
    a.tx=dx/hlen;a.tz=dz/hlen;a.grade=dy/hlen;a.pitch=Math.atan(a.grade);
    a.nx=-a.tz;a.nz=a.tx;
  }

  let length=0;
  for(let i=0;i<N;i++){
    const a=samples[i],b=samples[(i+1)%N];
    a.s=length;
    length+=Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z);
  }

  function wrappedIndexDistance(a,b){
    const d=Math.abs(a-b);return Math.min(d,N-d);
  }

  function nearest(x,z,y=NaN,hintIndex=null){
    const useY=Number.isFinite(y);
    const verticalWeight=5.5;
    const hint=Number.isFinite(hintIndex)?((Math.round(hintIndex)%N)+N)%N:null;
    let best=null;

    // Coarse global search gives recovery after spins; continuity bonus keeps the
    // solver from jumping to an over/underlapping piece of road when the car stops.
    for(let i=0;i<N;i+=2){
      const p=samples[i],dx=x-p.x,dz=z-p.z,dy=useY?y-p.y:0;
      const d2=dx*dx+dz*dz;
      const continuity=hint===null?0:Math.pow(wrappedIndexDistance(i,hint)/N*2.5,2);
      const vertical=useY?dy*dy*verticalWeight*verticalWeight:0;
      const score=d2+vertical+continuity;
      if(!best||score<best.score)best={score,d2,index:i,dy};
    }

    // Fine search around the candidate and around the continuity hint. The latter is
    // especially important on stacked track sections and at a dead stop.
    const centers=hint===null?[best.index]:[best.index,hint];
    const seen=new Set();
    for(const c of centers){
      for(let k=-8;k<=8;k++){
        const i=(c+k+N)%N;if(seen.has(i))continue;seen.add(i);
        const p=samples[i],dx=x-p.x,dz=z-p.z,dy=useY?y-p.y:0;
        const d2=dx*dx+dz*dz;
        const continuity=hint===null?0:Math.pow(wrappedIndexDistance(i,hint)/N*2.5,2);
        const vertical=useY?dy*dy*verticalWeight*verticalWeight:0;
        const score=d2+vertical+continuity;
        if(score<best.score)best={score,d2,index:i,dy};
      }
    }

    const p=samples[best.index];
    const nx=p.nx,nz=p.nz;
    const dx=x-p.x,dz=z-p.z;
    const lateral=dx*nx+dz*nz;
    return {...best,point:p,lateral,progress:p.s/length,index:best.index};
  }

  function sample(progress){
    progress=((progress%1)+1)%1;
    const f=progress*N,i=Math.floor(f)%N,t=f-i;
    const a=samples[i],b=samples[(i+1)%N];
    const tx=a.tx+(b.tx-a.tx)*t,tz=a.tz+(b.tz-a.tz)*t;
    const h=Math.hypot(tx,tz)||1;
    return {
      x:a.x+(b.x-a.x)*t,
      y:a.y+(b.y-a.y)*t,
      z:a.z+(b.z-a.z)*t,
      tx:tx/h,tz:tz/h,
      nx:-(tz/h),nz:tx/h,
      grade:a.grade+(b.grade-a.grade)*t,
      pitch:a.pitch+(b.pitch-a.pitch)*t,
      width,length
    };
  }

  return {id:"mesa86",name:"Mesa Circuit",samples,width,length,nearest,sample,N};
}
TRACKS.mesa86=makeTrack();

export function buildTrackMesh(gl,track){
  const positions=[],normals=[],colors=[],indices=[];
  const W=track.width/2,shoulder=2.8,N=track.samples.length;
  for(let i=0;i<N;i++){
    const p=track.samples[i],nx=-p.tz,nz=p.tx;
    for(const l of [-W-shoulder,-W,W,W+shoulder]){
      positions.push(p.x+nx*l,p.y-0.04,p.z+nz*l);
      normals.push(0,1,0);
      const road=Math.abs(l)<=W;
      colors.push(...(road?[.17,.19,.18]:[.31,.27,.20]));
    }
  }
  for(let i=0;i<N;i++){
    const ni=(i+1)%N;
    for(let j=0;j<3;j++){
      const a=i*4+j,b=i*4+j+1,c=ni*4+j+1,d=ni*4+j;
      indices.push(a,b,d,b,c,d);
    }
  }
  return {positions,normals,colors,indices};
}

export function buildScenery(track){
  const items=[];
  let s=918273;
  const rand=()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296};
  for(let i=0;i<190;i++){
    const progress=(i*0.0137+rand()*0.018)%1;
    const p=track.sample(progress);
    const side=rand()<.5?-1:1;
    const dist=track.width/2+5+rand()*30;
    const nx=p.nx,nz=p.nz;
    items.push({
      type:rand()<.38?"cactus":rand()<.68?"rock":"marker",
      x:p.x+nx*side*dist,z:p.z+nz*side*dist,
      y:p.y-(dist-track.width/2)*.012,scale:.6+rand()*1.7,rot:rand()*Math.PI*2,
      progress,groundY:p.y-(dist-track.width/2)*.012,side
    });
  }
  return items;
}
