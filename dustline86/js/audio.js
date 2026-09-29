export class AudioEngine{
  constructor(){this.ctx=null;this.master=null;this.osc=null;this.sub=null;this.noise=null}
  start(){
    if(this.ctx)return;
    this.ctx=new (window.AudioContext||window.webkitAudioContext)();
    this.master=this.ctx.createGain();this.master.gain.value=.08;this.master.connect(this.ctx.destination);
    this.osc=this.ctx.createOscillator();this.osc.type="sawtooth";
    this.sub=this.ctx.createOscillator();this.sub.type="square";
    const g=this.ctx.createGain();g.gain.value=0;this.osc.connect(g);this.sub.connect(g);g.connect(this.master);this.gain=g;
    this.osc.start();this.sub.start();
  }
  update(rpm,throttle,gear,skid=0){
    if(!this.ctx)return;
    const now=this.ctx.currentTime, base=32+rpm/60;
    this.osc.frequency.setTargetAtTime(base,now,.03);
    this.sub.frequency.setTargetAtTime(base*.5,now,.03);
    this.gain.gain.setTargetAtTime(.018+throttle*.045+skid*.012,now,.04);
  }
  beep(freq=440,duration=.08){
    if(!this.ctx)return;
    const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.frequency.value=freq;o.type="square";g.gain.value=.04;o.connect(g);g.connect(this.master);o.start();g.gain.exponentialRampToValueAtTime(.0001,this.ctx.currentTime+duration);o.stop(this.ctx.currentTime+duration);
  }
}
