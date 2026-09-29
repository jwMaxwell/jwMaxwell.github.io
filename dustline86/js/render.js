/*
  Deterministic software pseudo-3D renderer.
  World geometry stays in fixed track coordinates. The camera only changes the
  projection, so road markings and scenery no longer slide as the car advances.
*/

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function normalize3(x,y,z){const m=Math.hypot(x,y,z)||1;return [x/m,y/m,z/m]}
function cross3(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}
function lerp(a,b,t){return a+(b-a)*t}
function hexToRgb(hex){return [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)]}
function rgbToHex(r,g,b){return '#'+[r,g,b].map(v=>Math.round(v).toString(16).padStart(2,'0')).join('')}
function fogColor(hex,fog){const [r,g,b]=hexToRgb(hex),fr=126,fg=133,fb=125;return rgbToHex(r+(fr-r)*fog,g+(fg-g)*fog,b+(fb-b)*fog)}

export class Renderer{
  constructor(canvas){
    this.canvas=canvas;
    this.ctx=canvas.getContext('2d',{alpha:false,desynchronized:false});
    if(!this.ctx)throw new Error('Canvas 2D unavailable');
    this.w=0;this.h=0;this.dpr=1;
    this.fov=Math.PI*70/180;
    this.near=.18;
    this.far=380;
    this.camera={x:0,y:0,z:0,forward:[1,0,0],right:[0,0,1],up:[0,1,0]};
    this.nearest=null;
  }

  // Kept for compatibility with main.js and older builds. The current renderer is
  // entirely procedural and does not need a GPU mesh upload.
  upload(){return}

  resize(){
    const dpr=Math.min(window.devicePixelRatio||1,2);
    const r=this.canvas.getBoundingClientRect();
    const w=Math.max(1,Math.floor(r.width*dpr)),h=Math.max(1,Math.floor(r.height*dpr));
    if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h}
    this.w=w;this.h=h;this.dpr=dpr;
  }

  setupCamera(car,track){
    const nearest=track.nearest(car.x,car.z,car.y,car.trackIndex);
    const pitch=clamp(Number.isFinite(car.pitch)?car.pitch:(nearest.point.pitch||0),-.42,.42);
    const yaw=car.yaw;
    const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
    const forward=normalize3(cy*cp,sp,sy*cp);
    const right=normalize3(-sy,0,cy);
    const up=normalize3(...cross3(right,forward));

    const camForward=.08,camRight=-.16,camUp=.62;
    this.camera.x=car.x+forward[0]*camForward+right[0]*camRight;
    this.camera.y=car.y+camUp+forward[1]*camForward;
    this.camera.z=car.z+forward[2]*camForward+right[2]*camRight;
    this.camera.forward=forward;this.camera.right=right;this.camera.up=up;
    this.nearest=nearest;
  }

  cameraPoint(x,y,z){
    const c=this.camera,dx=x-c.x,dy=y-c.y,dz=z-c.z,f=c.forward,r=c.right,u=c.up;
    return {
      lateral:dx*r[0]+dy*r[1]+dz*r[2],
      vertical:dx*u[0]+dy*u[1]+dz*u[2],
      depth:dx*f[0]+dy*f[1]+dz*f[2]
    };
  }

  projectCP(cp){
    if(cp.depth<this.near||cp.depth>this.far)return null;
    const focal=(this.h*.5)/Math.tan(this.fov*.5),scale=focal/cp.depth;
    return {x:this.w*.5+cp.lateral*scale,y:this.h*.43-cp.vertical*scale,depth:cp.depth,scale};
  }
  project(x,y,z){return this.projectCP(this.cameraPoint(x,y,z))}

  clipCamera(poly){
    let out=poly;
    for(const evalPlane of [p=>p.depth-this.near,p=>this.far-p.depth]){
      if(!out.length)break;
      const next=[];
      for(let i=0;i<out.length;i++){
        const a=out[i],b=out[(i+1)%out.length],da=evalPlane(a),db=evalPlane(b),ina=da>=0,inb=db>=0;
        if(ina&&inb)next.push(b);
        else if(ina&&!inb){const t=da/(da-db);next.push({lateral:lerp(a.lateral,b.lateral,t),vertical:lerp(a.vertical,b.vertical,t),depth:lerp(a.depth,b.depth,t)})}
        else if(!ina&&inb){const t=da/(da-db);next.push({lateral:lerp(a.lateral,b.lateral,t),vertical:lerp(a.vertical,b.vertical,t),depth:lerp(a.depth,b.depth,t)});next.push(b)}
      }
      out=next;
    }
    return out;
  }

  drawPolyCP(ctx,poly,fill,alpha=1){
    const clipped=this.clipCamera(poly);if(clipped.length<3)return;
    const pts=[];for(const p of clipped){const q=this.projectCP(p);if(q)pts.push(q)}
    if(pts.length<3)return;
    ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=fill;
    ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);ctx.closePath();ctx.fill();ctx.restore();
  }
  triangleWorld(ctx,a,b,c,fill,alpha=1){this.drawPolyCP(ctx,[this.cameraPoint(...a),this.cameraPoint(...b),this.cameraPoint(...c)],fill,alpha)}
  quadTriangles(ctx,a,b,c,d,fill,alpha=1){this.triangleWorld(ctx,a,b,c,fill,alpha);this.triangleWorld(ctx,a,c,d,fill,alpha)}

  render(car,track,scenery){
    this.resize();
    const ctx=this.ctx,w=this.w,h=this.h;
    ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.clearRect(0,0,w,h);
    this.setupCamera(car,track);
    const horizon=h*.43;
    this.drawSky(ctx,w,h);this.drawMountains(ctx,w,h);this.drawGround(ctx,w,h,horizon);

    const primitives=[];
    this.collectTrackPrimitives(track,primitives);
    this.collectSceneryPrimitives(scenery,primitives);
    primitives.sort((a,b)=>b.depth-a.depth);
    for(const p of primitives)p.draw(ctx);
    this.drawHood(ctx,w,h,car);
  }

  drawSky(ctx,w,h){
    const g=ctx.createLinearGradient(0,0,0,h*.68);
    g.addColorStop(0,'#5c9ec2');g.addColorStop(.48,'#a9ced0');g.addColorStop(1,'#d6bb82');
    ctx.fillStyle=g;ctx.fillRect(0,0,w,h*.72);
    ctx.fillStyle='rgba(248,243,220,.58)';
    for(const c of [[.16,.16,.16,.02],[.72,.12,.2,.025],[.5,.25,.1,.014]]){
      ctx.fillRect(w*c[0],h*c[1],w*c[2],h*c[3]);
      ctx.fillRect(w*(c[0]+.03),h*(c[1]-.012),w*c[2]*.48,h*c[3]*1.5);
    }
  }

  drawMountains(ctx,w,h){
    const base=h*.48;
    const layers=[['#62766f',[0,.28,.17,.18,.35,.24,.53,.16,.76,.24,1,.2]],['#465c56',[0,.16,.18,.27,.34,.16,.54,.29,.76,.2,1,.15]]];
    for(const [color,a] of layers){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,base+34);for(let i=0;i<a.length;i+=2)ctx.lineTo(w*a[i],base-h*a[i+1]*.16);ctx.lineTo(w,base+34);ctx.closePath();ctx.fill()}
  }

  drawGround(ctx,w,h,horizon){
    const g=ctx.createLinearGradient(0,horizon,0,h);
    g.addColorStop(0,'#9e8560');g.addColorStop(.55,'#6e6047');g.addColorStop(1,'#39342c');
    ctx.fillStyle=g;ctx.fillRect(0,horizon,w,h-horizon);
    // Screen-space horizon bands are only a distant backdrop. All near ground is
    // world-space geometry below, so these cannot make the track appear to scroll.
    ctx.globalAlpha=.16;ctx.fillStyle='#d2b77d';
    for(let i=0;i<10;i++){const yy=horizon+(h-horizon)*Math.pow(i/10,1.7);ctx.fillRect(0,yy,w,Math.max(1,(h-horizon)/48))}
    ctx.globalAlpha=1;
  }

  trackRingIndices(center,n,back=220,ahead=240){
    const ids=[];
    for(let k=-back;k<=ahead;k++)ids.push((center+k+n)%n);
    return ids;
  }

  collectTrackPrimitives(track,out){
    const n=track.samples.length,center=this.nearest.index,ids=this.trackRingIndices(center,n,300,320);
    const W=track.width*.5,outer=W+26;

    const pushTriangle=(a,b,c,fill,depth)=>{
      out.push({depth,draw:ctx=>this.triangleWorld(ctx,a,b,c,fill)});
    };
    const triDepth=(a,b,c)=>{
      const ca=this.cameraPoint(...a),cb=this.cameraPoint(...b),cc=this.cameraPoint(...c);
      return (ca.depth+cb.depth+cc.depth)/3;
    };

    for(let q=0;q<ids.length-1;q++){
      const i=ids[q],j=ids[q+1],a=track.samples[i],b=track.samples[j];
      const na=[a.nx,0,a.nz],nb=[b.nx,0,b.nz];
      const leftOuterA=[a.x-na[0]*outer,a.y-.28,a.z-na[2]*outer];
      const rightOuterA=[a.x+na[0]*outer,a.y-.28,a.z+na[2]*outer];
      const leftOuterB=[b.x-nb[0]*outer,b.y-.28,b.z-nb[2]*outer];
      const rightOuterB=[b.x+nb[0]*outer,b.y-.28,b.z+nb[2]*outer];
      const leftA=[a.x-na[0]*W,a.y+.025,a.z-na[2]*W];
      const rightA=[a.x+na[0]*W,a.y+.025,a.z+na[2]*W];
      const leftB=[b.x-nb[0]*W,b.y+.025,b.z-nb[2]*W];
      const rightB=[b.x+nb[0]*W,b.y+.025,b.z+nb[2]*W];
      const leftCurbA=[a.x-na[0]*(W+.22),a.y+.045,a.z-na[2]*(W+.22)];
      const rightCurbA=[a.x+na[0]*(W+.22),a.y+.045,a.z+na[2]*(W+.22)];
      const leftCurbB=[b.x-nb[0]*(W+.22),b.y+.045,b.z-nb[2]*(W+.22)];
      const rightCurbB=[b.x+nb[0]*(W+.22),b.y+.045,b.z+nb[2]*(W+.22)];

      const cps=[leftA,rightA,leftB,rightB].map(v=>this.cameraPoint(...v));
      const segmentMax=Math.max(...cps.map(v=>v.depth));
      const segmentMin=Math.min(...cps.map(v=>v.depth));
      if(segmentMax<this.near||segmentMin>this.far)continue;
      const midDepth=cps.reduce((sum,v)=>sum+v.depth,0)/cps.length;
      const fog=clamp((Math.max(0,midDepth)-95)/(this.far-95),0,1);
      const roadColor=fogColor(i%28<4?'#4c5553':'#353d3f',fog);
      const curbColor=fogColor(i%10<5?'#d05b46':'#e5d39a',fog);
      const groundColor=fogColor(i%24<12?'#7d694d':'#665840',fog);
      const groundVisible=midDepth>18;

      // Sort each triangle independently. Sorting a complete road segment by a single
      // average depth allowed adjacent triangles to overwrite one another at steep
      // viewing angles, producing the disappearing road chunks seen near the car.
      const rd1=[leftA,rightA,rightB],rd2=[leftA,rightB,leftB];
      pushTriangle(...rd1,roadColor,triDepth(...rd1));
      pushTriangle(...rd2,roadColor,triDepth(...rd2));
      const lc1=[leftCurbA,leftA,leftB],lc2=[leftCurbA,leftB,leftCurbB];
      pushTriangle(...lc1,curbColor,triDepth(...lc1));
      pushTriangle(...lc2,curbColor,triDepth(...lc2));
      const rc1=[rightA,rightCurbA,rightCurbB],rc2=[rightA,rightCurbB,rightB];
      pushTriangle(...rc1,curbColor,triDepth(...rc1));
      pushTriangle(...rc2,curbColor,triDepth(...rc2));
      if(groundVisible){
        const g1=[leftOuterA,rightOuterA,rightOuterB],g2=[leftOuterA,rightOuterB,leftOuterB];
        pushTriangle(...g1,groundColor,triDepth(...g1));
        pushTriangle(...g2,groundColor,triDepth(...g2));
      }
      if(i%6<2){
        const half=.11;
        const da=[a.x-na[0]*half,a.y+.055,a.z-na[2]*half],db=[a.x+na[0]*half,a.y+.055,a.z+na[2]*half];
        const dc=[b.x-nb[0]*half,b.y+.055,b.z-nb[2]*half],dd=[b.x+nb[0]*half,b.y+.055,b.z+nb[2]*half];
        const mark=fogColor('#dbc78f',fog);
        const m1=[da,db,dd],m2=[da,dd,dc];
        pushTriangle(...m1,mark,triDepth(...m1));
        pushTriangle(...m2,mark,triDepth(...m2));
      }
    }
  }

  spriteGeometry(s){
    const baseHeights={cactus:2.55,marker:3.15,rock:1.05};
    const widthRatios={cactus:.42,marker:.26,rock:.95};
    const worldHeight=(baseHeights[s.type]||1.5)*s.scale;
    const widthRatio=widthRatios[s.type]||.5;
    return {worldHeight,widthRatio};
  }

  collectSceneryPrimitives(scenery,out){
    for(const s of scenery){
      const baseY=s.groundY??s.y;
      const geom=this.spriteGeometry(s);
      const baseCP=this.cameraPoint(s.x,baseY,s.z);
      const topCP=this.cameraPoint(s.x,baseY+geom.worldHeight,s.z);
      const centerDepth=(baseCP.depth+topCP.depth)*.5;
      if(Math.max(baseCP.depth,topCP.depth)<this.near||Math.min(baseCP.depth,topCP.depth)>this.far)continue;
      const fog=clamp((centerDepth-75)/(this.far-75),0,1);
      const alpha=1-fog*.78;
      out.push({depth:centerDepth+.01,draw:ctx=>{
        const base=this.project(s.x,baseY,s.z);
        const top=this.project(s.x,baseY+geom.worldHeight,s.z);
        if(!base||!top)return;
        // Derive the sprite's pixel size from its actual projected world height.
        // This guarantees that a fixed-height object gets larger as camera distance
        // decreases, including when the car approaches from an angle.
        const pixelHeight=Math.abs(base.y-top.y);
        if(pixelHeight<.75)return;
        const width=Math.max(2,pixelHeight*geom.widthRatio);
        const x=base.x,y=base.y;
        ctx.save();ctx.globalAlpha=Math.min(1,alpha);
        ctx.fillStyle='rgba(24,22,17,.30)';ctx.beginPath();ctx.ellipse(x,y+pixelHeight*.018,width*.42,Math.max(1,pixelHeight*.055),0,0,Math.PI*2);ctx.fill();
        if(s.type==='rock'){
          ctx.fillStyle=fogColor('#5b5044',fog);ctx.beginPath();
          ctx.moveTo(x-width*.54,y);ctx.lineTo(x-width*.32,y-pixelHeight*.60);ctx.lineTo(x-width*.03,y-pixelHeight);ctx.lineTo(x+width*.55,y-pixelHeight*.32);ctx.lineTo(x+width*.42,y);ctx.closePath();ctx.fill();
          ctx.fillStyle=fogColor('#8f7a59',fog);ctx.fillRect(x-width*.14,y-pixelHeight*.68,width*.24,pixelHeight*.10);
        }else if(s.type==='marker'){
          ctx.fillStyle=fogColor('#dbc27c',fog);ctx.fillRect(x-width*.13,y-pixelHeight,width*.26,pixelHeight);
          ctx.fillStyle=fogColor('#a8483e',fog);ctx.fillRect(x-width*.31,y-pixelHeight,width*.62,pixelHeight*.27);
        }else{
          ctx.fillStyle=fogColor('#2e5535',fog);
          ctx.fillRect(x-width*.22,y-pixelHeight*.91,width*.44,pixelHeight*.91);
          ctx.fillRect(x-width*.72,y-pixelHeight*.66,width*.54,pixelHeight*.13);
          ctx.fillRect(x+width*.18,y-pixelHeight*.56,width*.54,pixelHeight*.13);
          ctx.fillStyle=fogColor('#4c7542',fog);ctx.fillRect(x-width*.40,y-pixelHeight,width*.80,pixelHeight*.10);
        }
        ctx.restore();
      }});
    }
  }

  drawHood(ctx,w,h,car){
    const shift=clamp(car.steer*16*this.dpr,-12*this.dpr,12*this.dpr),y=h*.895;
    ctx.fillStyle='#0b1114';ctx.beginPath();ctx.moveTo(w*.21+shift,h);ctx.lineTo(w*.31+shift*.45,y);ctx.lineTo(w*.69+shift*.45,y);ctx.lineTo(w*.79+shift,h);ctx.closePath();ctx.fill();
    ctx.fillStyle='#29353b';ctx.beginPath();ctx.moveTo(w*.31+shift*.45,y);ctx.lineTo(w*.36+shift*.45,y-h*.035);ctx.lineTo(w*.64+shift*.45,y-h*.035);ctx.lineTo(w*.69+shift*.45,y);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#af9661';ctx.lineWidth=Math.max(1,this.dpr);ctx.stroke();
  }
}
