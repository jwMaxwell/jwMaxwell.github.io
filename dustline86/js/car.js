export const DEFAULT_CAR={
  mass:1180, cgHeight:.52, wheelbase:2.55, trackWidth:1.52, weightFront:.53,
  steerMax:0.40, steeringRatio:13.2, diffLock:.72,
  engineTorque:285, idleRPM:950, redline:7600, rpmResponse:7.5,
  reverseRatio:3.05, gears:[3.10,2.05,1.48,1.16,.93,.78], finalDrive:3.72,
  tireFront:1.28,tireRear:.90,longGrip:1.08,latGrip:1.00,
  tireStiffness:3.2, slipPeak:.115, anglePeak:.105,
  frontBrake:1.0,rearBrake:.72, brakeBias:.68, brakeLockup:.90,
  drag:.34, downforce:.003, rolling:.016, surfaceShoulder:.64,
  suspensionStiffness:32000, suspensionDamping:3800
};

export function cloneCarParams(){return structuredClone(DEFAULT_CAR)}

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function sign(v){return v<0?-1:1}
function wrapPi(a){while(a>Math.PI)a-=Math.PI*2;while(a<-Math.PI)a+=Math.PI*2;return a}

export class Car{
  constructor(params=cloneCarParams()){
    this.p=params; this.reset();
  }
  reset(){
    this.x=-118;this.z=-72;this.y=0;this.vx=0;this.vz=0;this.yaw=Math.PI/2;
    this.yawRate=0;this.pitch=0;this.roll=0;this.vy=0;this.steer=0;this.throttle=0;this.frontBrake=0;this.rearBrake=0;this.handbrake=0;
    this.gear=1;this.rpm=this.p.idleRPM;this.wheelOmega=0;this.speed=0;this.offRoad=false;this.surfaceGrip=1;
    this.wheelStates=[{}, {}, {}, {}];this.slipAngle=0;this.slipRatio=0;this.skid=0;this.roadY=0;this._prevForwardSpeed=0;this.trackIndex=0;this.recoverySnap=false;
  }
  setGear(g){this.gear=clamp(g,-1,this.p.gears.length)}
  update(dt,input,track){
    const p=this.p, g=9.81;
    this.steer += (input.steer-this.steer)*clamp(dt*10,0,1);
    this.throttle=clamp(input.throttle,0,1);
    this.frontBrake=clamp(input.frontBrake,0,1);
    this.rearBrake=clamp(input.rearBrake,0,1);
    this.handbrake=input.handbrake?1:0;

    const nearest=track.nearest(this.x,this.z,this.y,this.trackIndex);
    this.offRoad=Math.abs(nearest.lateral)>track.width/2;
    this.surfaceGrip=this.offRoad?p.surfaceShoulder:1;
    this.roadY=nearest.point.y;

    const fx=Math.cos(this.yaw),fz=Math.sin(this.yaw),rx=-fz,rz=fx;
    const forwardSpeed=this.vx*fx+this.vz*fz;
    const lateralSpeed=this.vx*rx+this.vz*rz;
    const roadPitch=nearest.point.pitch||0;
    const roadGrade=nearest.point.grade||0;
    const trackAlong=fx*nearest.point.tx+fz*nearest.point.tz;
    this.speed=Math.hypot(this.vx,this.vz);
    const longitudinalAccel=Number.isFinite(this._prevForwardSpeed)?(forwardSpeed-this._prevForwardSpeed)/Math.max(dt,.001):0;

    // Load transfer is kept physically modest so the car stays predictable when
    // braking on a hill. Downforce increases normal load with speed.
    const aeroLoad=p.downforce*this.speed*this.speed*p.mass;
    const staticFront=p.mass*g*p.weightFront;
    const staticRear=p.mass*g*(1-p.weightFront);
    const transfer=p.mass*longitudinalAccel*p.cgHeight/p.wheelbase;
    const fLoad=Math.max(300,staticFront-transfer+aeroLoad*p.weightFront);
    const rLoad=Math.max(300,staticRear+transfer+aeroLoad*(1-p.weightFront));
    const wb=p.wheelbase,tw=p.trackWidth;

    const wheels=[
      {x: wb*.5,y:tw*.5,load:fLoad*.5,drive:false,brake:this.frontBrake*p.frontBrake*p.brakeBias},
      {x: wb*.5,y:-tw*.5,load:fLoad*.5,drive:false,brake:this.frontBrake*p.frontBrake*p.brakeBias},
      {x:-wb*.5,y:tw*.5,load:rLoad*.5,drive:true,brake:this.rearBrake*p.rearBrake*(1-p.brakeBias)},
      {x:-wb*.5,y:-tw*.5,load:rLoad*.5,drive:true,brake:this.rearBrake*p.rearBrake*(1-p.brakeBias)}
    ];

    // A single rear-axle wheel speed is sufficient for this simcade car and keeps
    // the differential behavior deliberately predictable.
    const wheelR=.31;
    const ratio=Math.abs(this.gear)<1 ? 0 : (this.gear<0 ? p.reverseRatio : p.gears[this.gear-1])*p.finalDrive;
    const driveDirection=this.gear<0?-1:1;
    const wheelRpm=Math.abs(this.wheelOmega)*60/(2*Math.PI);
    const mechanicallyLinkedRpm=wheelRpm*ratio;
    const engineNorm=clamp(this.rpm/Math.max(1,p.redline),0,1.15);
    const torqueCurve=p.engineTorque*(.70+.44*Math.max(0,1-Math.pow((engineNorm-.55)/.60,2)));
    // Mechanical gear limits come from wheel speed. Once the selected gear reaches
    // redline, throttle no longer produces usable drive torque. This prevents the car
    // from reaching absurd speeds without shifting while preserving manual control.
    const overspeedRPM=Math.max(0,mechanicallyLinkedRpm-p.redline);
    const redlineCut=overspeedRPM<=0?1:Math.max(0,1-overspeedRPM/260);
    const limiterPulse=(this.rpm>=p.redline-35)?0.03:1;
    const driveTorque=this.throttle*torqueCurve*ratio*redlineCut*limiterPulse*driveDirection;
    const brakeTorque=frontBrakeTorque(p,this.frontBrake)+rearBrakeTorque(p,this.rearBrake,this.handbrake);
    const drivenPerWheel=driveTorque*.5/wheelR;

    let totalX=0,totalZ=0,totalMz=0,maxSkid=0;
    let rearGroundTorque=0;

    // Project gravity down the road grade. The previous model was completely flat
    // to the dynamics, so an uphill could be rendered visually while the physics
    // still behaved like level pavement.
    const gradeForce=-p.mass*g*Math.sin(roadPitch)*trackAlong*0.82;
    totalX+=nearest.point.tx*gradeForce;
    totalZ+=nearest.point.tz*gradeForce;

    wheels.forEach((w,idx)=>{
      const rWorldX=fx*w.x+rx*w.y;
      const rWorldZ=fz*w.x+rz*w.y;
      const localVx=this.vx-this.yawRate*rWorldZ;
      const localVz=this.vz+this.yawRate*rWorldX;
      const baseLong=localVx*fx+localVz*fz;
      const baseLat=localVx*rx+localVz*rz;

      const steerScale=.68+.32/(1+this.speed/22);
      const steerAngle=idx<2?this.steer*p.steerMax*steerScale:0;
      const ca=Math.cos(steerAngle),sa=Math.sin(steerAngle);
      const tireLong=baseLong*ca+baseLat*sa;
      const tireLat=-baseLong*sa+baseLat*ca;

      // Longitudinal slip is retained as a wheel-state/visual diagnostic, but it no
      // longer generates an unphysical backwards force while the driven wheel-speed
      // state catches up from rest. Traction is instead solved as a force request
      // inside the tire's combined friction ellipse.
      const wheelSurface=w.drive?this.wheelOmega*wheelR:tireLong;
      const denom=Math.max(2.5,Math.abs(tireLong));
      let slipRatio=(wheelSurface-tireLong)/denom;
      if(Math.abs(tireLong)<1.5&&Math.abs(this.wheelOmega)<5)slipRatio=0;
      slipRatio=clamp(slipRatio,-2.5,2.5);
      const slipAng=Math.atan2(tireLat,Math.abs(tireLong)+1.5);

      const handbrakeGrip=(idx>=2&&this.handbrake)?.62:1;
      const tireMu=(idx<2?p.tireFront:p.tireRear)*p.longGrip*this.surfaceGrip*handbrakeGrip;
      const fxMax=Math.max(1,w.load*tireMu);
      const fyMax=Math.max(1,w.load*tireMu*p.latGrip*(idx>=2?.97:1));

      // Progressive brush-style cornering force. The previous tangent model hit the
      // lateral limit too abruptly, which made any 60 mph slide collapse into a 180.
      const normalizedSlip=Math.tan(slipAng)/Math.max(.04,p.anglePeak);
      const lateralDemand=-Math.sign(normalizedSlip)*fyMax*(1-Math.exp(-Math.abs(normalizedSlip)*.72));
      const latF=clamp(lateralDemand,-fyMax,fyMax);
      const remaining=Math.sqrt(Math.max(0,fxMax*fxMax-latF*latF));

      let longDemand=0;
      if(w.drive){
        // Drive force follows the selected gear direction. Reverse is a true separate gear,
        // while neutral has no engine force. This avoids the
        // old startup failure where a lagging wheel-speed state was interpreted as a
        // huge negative tire slip and overpowered the engine.
        longDemand+=drivenPerWheel;
      }

      const tireBrake=w.brake>0?w.brake*5200:0;
      if(tireBrake)longDemand-=Math.min(tireBrake,fxMax)*sign(tireLong||forwardSpeed||1)*p.brakeLockup;
      if(this.handbrake&&idx>=2)longDemand-=Math.min(1500,fxMax)*sign(tireLong||forwardSpeed||1);

      const longF=clamp(longDemand,-remaining,remaining);
      const carLong=longF*ca-latF*sa, carLat=longF*sa+latF*ca;
      const worldX=carLong*fx+carLat*rx,worldZ=carLong*fz+carLat*rz;
      totalX+=worldX;totalZ+=worldZ;
      totalMz+=w.x*carLat-w.y*carLong;
      const slipPresence=clamp(Math.abs(slipAng)/.14+Math.abs(slipRatio)/.35,0,1);
      maxSkid=Math.max(maxSkid,slipPresence);
      rearGroundTorque+=w.drive?longF*wheelR:0;
      this.wheelStates[idx]={slipRatio,slipAngle:slipAng,load:w.load,grip:tireMu,lock:Math.abs(slipRatio)>.25||Math.abs(longF)>=remaining*.98&&tireBrake>0};
    });

    // Realistic road resistance: rolling resistance is proportional to normal load,
    // while aero drag grows with v². The old force was only a tiny linear drag, hence
    // the bizarre "ice rink" feeling and very long coasting distances.
    const v=Math.max(this.speed,.01);
    const rollingForce=p.rolling*p.mass*g;
    const aeroForce=.5*p.drag*v*v*6.2;
    let resist=rollingForce+aeroForce;
    if(this.throttle<.02&&Math.abs(forwardSpeed)>1&&this.gear!==0){
      // Engine braking is tied to the selected reduction ratio. Short gears therefore
      // hold the car back much more strongly, while tall gears coast farther.
      const selectedRatio=Math.abs(this.gear)<1?0:(this.gear<0?p.reverseRatio:p.gears[this.gear-1]);
      const ratioBrake=115+selectedRatio*p.finalDrive*64;
      const overspeedBrake=clamp(overspeedRPM/420,0,1)*(320+selectedRatio*p.finalDrive*70);
      resist+=ratioBrake+overspeedBrake;
    }
    if(this.throttle>=.02&&this.gear>0&&overspeedRPM>0){
      // A forward gear cannot continue accelerating past its mechanical redline. The
      // excess engine speed produces a strong limiter/engine-braking load, so a downhill
      // run in first gear also cannot turn into an arbitrary-speed coast.
      resist+=clamp(overspeedRPM/180,0,1)*(520+ratio*58);
    }
    if(this.offRoad){
      const deep=clamp((Math.abs(nearest.lateral)-track.width/2)/18,0,1);
      resist+=p.mass*g*.08 + deep*(p.mass*g*.22+this.speed*55);
    }
    totalX-=this.vx/v*resist;totalZ-=this.vz/v*resist;

    this.vx+=(totalX/p.mass)*dt;this.vz+=(totalZ/p.mass)*dt;

    // Do not let numerical energy build while stopped or reversing through a tire.
    if(this.speed<.8&&this.throttle<.03&&this.frontBrake<.03&&this.rearBrake<.03){
      this.vx*=Math.pow(.84,dt*60);this.vz*=Math.pow(.84,dt*60);
    }

    this.x+=this.vx*dt;this.z+=this.vz*dt;

    const post=track.nearest(this.x,this.z,this.y,this.trackIndex);
    this.trackIndex=post.index;
    const previousY=this.y;
    this.roadY=post.point.y;
    this.pitch=post.point.pitch||0;
    const targetY=post.point.y+.42;
    const verticalContactError=Math.abs(post.dy||0);
    const validSurface=verticalContactError<3.5;
    if(Math.abs(post.lateral)<=track.width*.78&&validSurface){
      // Keep the chassis on the same physical road surface selected in 3D space.
      // A vertical-error gate is important on this track because two road sections
      // can occupy similar X/Z coordinates at different elevations.
      this.y += (targetY-this.y)*clamp(dt*18,0,1);
      if(Math.abs(this.y-targetY)<.008)this.y=targetY;
    }
    // Outside a valid contact region the car keeps its current elevation instead of
    // snapping toward a visually adjacent overpass or lower section of track.
    this.vy=(this.y-previousY)/Math.max(dt,.001);

    // Yaw comes from the actual tire moments. Add mild yaw-rate damping so steering
    // feels like a car rather than a camera orbiting on a pin.
    const inertia=p.mass*(wb*wb+tw*tw)/12;
    this.yawRate+=(totalMz/inertia)*dt;
    const countering=this.yawRate*this.steer<-.035;
    const counterAssist=countering?6.0*clamp(Math.abs(this.yawRate)/1.0,0,1):0;
    const yawDamp=1/(1+dt*(3.4+this.speed*.028+counterAssist));
    this.yawRate*=yawDamp;
    if(this.speed>10)this.yawRate=clamp(this.yawRate,-2.0,2.0);
    this.yaw+=this.yawRate*dt;
    if(this.speed<.25){this.yawRate*=Math.pow(.55,dt*60)}

    // Keep the driveline coupled to road speed through a simple clutch/differential
    // model. Throttle permits a little positive slip; rear braking can still drag the
    // driven wheels below road speed and create a lockup. This avoids the previous
    // runaway wheel-speed state while preserving tire-based traction behavior.
    const groundOmega=forwardSpeed/wheelR;
    const throttleSlip=1+.065*this.throttle;
    const rearBrakeAmount=clamp(this.rearBrake+.75*this.handbrake,0,1);
    const clutchTarget=this.gear===0?0:groundOmega*throttleSlip*(1-rearBrakeAmount);
    this.wheelOmega+=(clutchTarget-this.wheelOmega)*clamp(dt*18,0,1);
    if(Math.abs(forwardSpeed)<.25&&this.throttle<.02)this.wheelOmega*=Math.pow(.35,dt*60);

    const targetRpm=Math.max(p.idleRPM,mechanicallyLinkedRpm + this.throttle*280);
    this.rpm+=(targetRpm-this.rpm)*clamp(dt*p.rpmResponse,0,1);
    this.rpm=clamp(this.rpm,p.idleRPM,p.redline);
    this.slipAngle=Math.atan2(lateralSpeed,Math.max(1,Math.abs(forwardSpeed)));
    this.slipRatio=this.wheelStates[2]?.slipRatio||0;
    this._prevForwardSpeed=forwardSpeed;
    this.skid=maxSkid;

    // Recovery is deliberately weak at a dead stop so it cannot cancel the engine
    // and pin a sideways car forever. Instead, a stopped off-track car gets a gentle
    // orientation nudge toward the road direction, which acts like a practical reset
    // aid without teleporting the vehicle.
    const offRoadDepth=Math.max(0,Math.abs(post.lateral)-track.width/2);
    const offRoadDeep=offRoadDepth>1.5;
    this.recoverySnap=false;
    if(offRoadDeep){
      const toX=post.point.x-this.x,toZ=post.point.z-this.z,len=Math.hypot(toX,toZ)||1;
      // Deep-desert recovery is deliberately active even from a dead stop. This is
      // a practical rescue aid, not a teleport: it applies a capped tow-like force
      // toward the actual road center so the car can always work its way home.
      const pullAccel=clamp(5.5+offRoadDepth*.42,5.5,12.5);
      this.vx+=(toX/len)*pullAccel*dt;this.vz+=(toZ/len)*pullAccel*dt;

      const roadYaw=Math.atan2(post.point.tz,post.point.tx);
      const homeYaw=Math.atan2(toZ,toX);
      const desiredYaw=offRoadDepth>12?homeYaw:roadYaw;
      const yawError=wrapPi(desiredYaw-this.yaw);
      const rate=clamp(yawError*(offRoadDepth>12?2.4:1.8),-1.55,1.55);
      if(this.speed<8||offRoadDepth>18)this.yawRate=rate;
      this.yaw+=rate*dt;
      if(offRoadDepth>18&&this.speed>12){
        // Prevent a high-speed off-road excursion from outrunning the recovery force.
        const cap=15+Math.max(0,30-offRoadDepth)*.35;
        if(this.speed>cap){const damp=Math.pow(.86,dt*60);this.vx*=damp;this.vz*=damp;}
      }

      // Last-resort marshal reset for genuinely stranded runs. Normal off-road play
      // never reaches this branch. Beyond 30 m from the road, put the car just outside
      // the pavement, aligned with it, and retain only a small useful forward speed.
      if(offRoadDepth>30){
        const side=post.lateral<0?-1:1;
        const safeOffset=track.width*.5+5.5;
        this.x=post.point.x+post.point.nx*side*safeOffset;
        this.z=post.point.z+post.point.nz*side*safeOffset;
        this.y=post.point.y+.42;
        this.yaw=Math.atan2(post.point.tz,post.point.tx);
        const keepSpeed=Math.min(5,this.speed);
        this.vx=post.point.tx*keepSpeed;this.vz=post.point.tz*keepSpeed;
        this.yawRate=0;
        this.trackIndex=post.index;
        this.recoverySnap=true;
      }
    }

    // A tiny amount of clutch creep makes a completely stationary RWD car wake up
    // reliably after a hard stop without creating wheelspin at normal speed.
    if(this.speed<.35&&this.throttle>.08&&!this.frontBrake&&!this.rearBrake&&!this.handbrake&&this.gear!==0){
      const creep=.35*this.p.engineTorque/p.mass;
      this.vx+=fx*creep*dt;this.vz+=fz*creep*dt;
    }
  }
}

function frontBrakeTorque(p,pedal){return pedal*p.frontBrake*2600*p.brakeBias}
function rearBrakeTorque(p,pedal,handbrake){return (pedal*p.rearBrake*(1-p.brakeBias)+handbrake*.75)*2600}
