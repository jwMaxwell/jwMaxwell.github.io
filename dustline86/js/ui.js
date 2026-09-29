import {formatTime} from "./physics.js";
export class UI{
  constructor(){
    this.$=id=>document.getElementById(id);
    this.start=this.$("start-screen");this.finish=this.$("finish-screen");this.center=this.$("center-message");
    this.startBtn=this.$("start-button");this.restartBtn=this.$("restart-button");
    this.gamepad=this.$("gamepad-status");
    this.debug=this.$("debug-panel");this.controls=this.$("debug-controls");
    this.startBtn.onclick=()=>this.onStart?.();this.restartBtn.onclick=()=>this.onRestart?.();
    this.$("fullscreen-button").onclick=()=>this.onFullscreen?.();
    this.$("debug-toggle").onclick=()=>this.debug.classList.toggle("hidden");
    this.$("debug-close").onclick=()=>this.debug.classList.add("hidden");
    this.$("reset-tuning").onclick=()=>this.onReset?.();this.$("save-tuning").onclick=()=>this.onSave?.();
  }
  bind(o){Object.assign(this,o)}
  setStartVisible(v){this.start.classList.toggle("hidden",!v)}
  setFinishVisible(v){this.finish.classList.toggle("hidden",!v)}
  countdown(text){this.center.textContent=text;this.center.classList.remove("hidden")}
  hideCountdown(){this.center.classList.add("hidden")}
  setGamepad(name){this.gamepad.textContent=name?`Gamepad: ${name}`:"Gamepad: none (keyboard fallback)"}
  hud(car,lap,total,best,race){
    this.$("speed").textContent=String(Math.round(car.speed*3.6)).padStart(3,"0");
    this.$("gear").textContent=car.gear<0?"R":(car.gear===0?"N":String(car.gear));
    this.$("rpm-fill").style.width=`${Math.min(1.03,car.rpm/car.p.redline)*100}%`;
    this.$("lap-time").textContent=formatTime(lap);this.$("best-lap").textContent=formatTime(best);
    this.$("race-time").textContent=formatTime(race);
  }
  finishRace(total,best){this.$("finish-time").textContent=formatTime(total);this.$("finish-best").textContent=formatTime(best)}
  toast(t){const x=this.$("toast");x.textContent=t;x.classList.add("show");clearTimeout(this.tt);this.tt=setTimeout(()=>x.classList.remove("show"),1300)}
  buildDebug(params,onChange){
    this.controls.innerHTML="";
    const groups={Engine:["engineTorque","redline","idleRPM","rpmResponse","reverseRatio","finalDrive","steerMax"],Tires:["tireFront","tireRear","longGrip","latGrip","tireStiffness","slipPeak","anglePeak","surfaceShoulder"],Brakes:["frontBrake","rearBrake","brakeBias","brakeLockup"],Vehicle:["mass","cgHeight","wheelbase","trackWidth","weightFront","steeringRatio","diffLock","drag","downforce","rolling"],Suspension:["suspensionStiffness","suspensionDamping"]};
    const ranges={engineTorque:[120,500,1],redline:[4500,10000,50],idleRPM:[600,1600,25],rpmResponse:[1,16,.1],reverseRatio:[2.2,4.2,.01],finalDrive:[2,5,.01],steerMax:[.25,.9,.01],tireFront:[.6,1.8,.01],tireRear:[.6,1.8,.01],longGrip:[.6,1.8,.01],latGrip:[.6,1.8,.01],tireStiffness:[3,16,.1],slipPeak:[.05,.25,.005],anglePeak:[.04,.22,.005],surfaceShoulder:[.45,1,.01],frontBrake:[.3,1.6,.01],rearBrake:[.3,1.6,.01],brakeBias:[.45,.85,.01],brakeLockup:[.4,1.6,.01],mass:[800,1800,10],cgHeight:[.25,.9,.01],wheelbase:[2,3.2,.01],trackWidth:[1.2,1.9,.01],weightFront:[.42,.62,.01],steeringRatio:[9,20,.1],diffLock:[0,1,.01],drag:[.05,.8,.01],downforce:[0,.02,.0002],rolling:[.005,.04,.001],suspensionStiffness:[10000,60000,500],suspensionDamping:[1000,8000,100]};
    for(const [group,names] of Object.entries(groups)){
      const h=document.createElement("div");h.className="debug-group";h.textContent=group;this.controls.appendChild(h);
      for(const name of names){
        if(name==="gears")continue;const r=ranges[name];if(!r)continue;
        const row=document.createElement("div");row.className="debug-row";const label=document.createElement("label");label.textContent=name;
        const input=document.createElement("input");input.type="range";[input.min,input.max,input.step]=r;input.value=params[name];
        const out=document.createElement("output");out.textContent=Number(params[name]).toFixed(3);
        input.oninput=()=>{params[name]=+input.value;out.textContent=Number(params[name]).toFixed(3);onChange?.(name,+input.value)};
        row.append(label,input,out);this.controls.appendChild(row);
      }
    }
  }
}
