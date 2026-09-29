export class Input{
  constructor(){
    this.state={steer:0,throttle:0,frontBrake:0,rearBrake:0,handbrake:false,up:false,down:false,reverse:false,restart:false,fullscreen:false};
    this.prev={...this.state};this.gpPrev={up:false,down:false,options:false,triangle:false};this.gamepad=null;
    addEventListener("keydown",e=>this.key(e,true));addEventListener("keyup",e=>this.key(e,false));
    addEventListener("gamepadconnected",e=>{this.gamepad=e.gamepad});
    addEventListener("gamepaddisconnected",e=>{if(this.gamepad?.index===e.gamepad.index)this.gamepad=null});
  }
  key(e,on){
    const k=e.key.toLowerCase();
    if(["arrowleft","arrowright","arrowup","arrowdown"," ","q","e","r","f","z","s","x"].includes(k))e.preventDefault();
    if(k==="a"||k==="arrowleft")this.state.steer=on?-1:(this.state.steer<0?0:this.state.steer);
    if(k==="d"||k==="arrowright")this.state.steer=on?1:(this.state.steer>0?0:this.state.steer);
    if(k==="w"||k==="arrowup")this.state.throttle=on?1:0;
    if(k==="s"||k==="arrowdown")this.state.frontBrake=on?1:0;
    if(k==="z")this.state.rearBrake=on?1:0;
    if(k===" ")this.state.handbrake=on;
    if(k==="e")this.state.up=on;
    if(k==="q")this.state.down=on;
    if(k==="x"&&on)this.state.reverse=true;
    if(k==="r"&&on)this.state.restart=true;
    if(k==="f"&&on)this.state.fullscreen=true;
  }
  poll(){
    const gps=navigator.getGamepads?navigator.getGamepads():[];
    if(this.gamepad)this.gamepad=gps[this.gamepad.index]||this.gamepad;
    else this.gamepad=[...gps].find(Boolean)||null;
    if(this.gamepad){
      const b=this.gamepad.buttons,a=this.gamepad.axes;
      const dz=.08, raw=a[0]||0;
      const analogDeadzone=v=>Math.abs(v)<.035?0:(v<0?-1:1)*(Math.abs(v)-.035)/.965; this.state.steer=Math.abs(raw)<dz?0:Math.sign(raw)*(Math.abs(raw)-dz)/(1-dz);
      // Standard mapping: R2 7, L2 6, Square 2, Cross 0, L1 4, R1 5, Options 9.
      this.state.throttle=Math.max(0,analogDeadzone(b[7]?.value??0));this.state.frontBrake=Math.max(0,analogDeadzone(b[6]?.value??0));this.state.rearBrake=b[2]?.pressed?1:0;this.state.handbrake=!!b[0]?.pressed;
      const up=!!b[5]?.pressed,down=!!b[4]?.pressed,options=!!b[9]?.pressed,triangle=!!b[3]?.pressed;
      this.state.up=up&&!this.gpPrev.up;this.state.down=down&&!this.gpPrev.down;
      if(options&&!this.gpPrev.options)this.state.restart=true;
      if(triangle&&!this.gpPrev.triangle)this.state.reverse=true;
      this.gpPrev={up,down,options,triangle};
    }
    const out={...this.state};
    this.prev={...this.state};this.state.up=false;this.state.down=false;this.state.reverse=false;this.state.restart=false;this.state.fullscreen=false;
    return out;
  }
  connectedName(){return this.gamepad?.id||null}
}
