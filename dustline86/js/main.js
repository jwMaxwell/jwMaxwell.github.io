import {Car,cloneCarParams} from "./car.js";
import {TRACKS,buildTrackMesh,buildScenery} from "./track.js";
import {Input} from "./input.js";
import {AudioEngine} from "./audio.js";
import {Renderer} from "./render.js";
import {UI} from "./ui.js";
import {formatTime,crossedLapForward} from "./physics.js";

const canvas=document.getElementById("game");
const renderer=new Renderer(canvas),input=new Input(),audio=new AudioEngine(),ui=new UI();
let selectedTrackId=localStorage.getItem("dustline86-track")||"mesa86";
let track=TRACKS[selectedTrackId]||TRACKS.mesa86;
const params=loadParams(), car=new Car(params);
let scenery=buildScenery(track);
renderer.upload("track",buildTrackMesh(null,track));

let state="menu",count=3,countTimer=0,raceTime=0,lapTime=0,bestLap=Infinity,lap=0,lastProgress=0,lapValid=true,lapArmed=false,lapDistance=0,totalDistance=0;
let last=performance.now(),gearLatch=0;

ui.bind({
  onStart:()=>start(),
  onRestart:()=>start(),
  onFullscreen:()=>toggleFullscreen(),
  onReset:()=>{Object.assign(params,cloneCarParams());ui.buildDebug(params,()=>{});ui.toast("Defaults restored")},
  onSave:()=>{localStorage.setItem("dustline86-tuning-v6",JSON.stringify(params));ui.toast("Tuning saved locally")},
  onTrackSelect:(id)=>selectTrack(id)
});
ui.buildDebug(params,(k,v)=>params[k]=v);
ui.renderTrackSelector(TRACKS,selectedTrackId,id=>selectTrack(id));
ui.setGamepad(input.connectedName());

function selectTrack(id){
  if(!TRACKS[id])return;
  selectedTrackId=id;track=TRACKS[id];scenery=buildScenery(track);
  renderer.upload("track",buildTrackMesh(null,track));
  localStorage.setItem("dustline86-track",id);
  ui.setTrackSelected(id,track);
}

function loadParams(){try{return Object.assign(cloneCarParams(),JSON.parse(localStorage.getItem("dustline86-tuning-v6")||"{}"))}catch{return cloneCarParams()}}
function start(){
  audio.start();car.reset();
  const startPose=track.sample(track.startHint||0);
  car.x=startPose.x; car.z=startPose.z; car.y=startPose.y+.42;
  car.trackIndex=0;
  car.yaw=Math.atan2(startPose.tz,startPose.tx);
  state="countdown";count=3;countTimer=0;raceTime=0;lapTime=0;bestLap=Infinity;lap=0;totalDistance=0;lastProgress=track.nearest(car.x,car.z,car.y,car.trackIndex).progress;lapValid=true;lapArmed=false;lapDistance=0;gearLatch=0;
  ui.setStartVisible(false);ui.setFinishVisible(false);ui.hideCountdown();
}
function toggleFullscreen(){
  const el=document.getElementById("game-shell");
  if(!document.fullscreenElement)el.requestFullscreen?.();else document.exitFullscreen?.();
}
function step(dt){
  const ctl=input.poll();ui.setGamepad(input.connectedName());
  if(ctl.fullscreen)toggleFullscreen();
  if(ctl.restart && state!=="menu")start();
  if(state==="menu")return;
  if(state==="countdown"){
    countTimer+=dt;
    if(countTimer>1){countTimer=0;count--;audio.beep(count>0?330:660,.09)}
    ui.countdown(count>0?String(count):"GO!");
    if(count<=0&&countTimer>.45){state="race";ui.hideCountdown();lastProgress=track.nearest(car.x,car.z,car.y,car.trackIndex).progress;lapArmed=false;lapDistance=0}
    car.update(dt,{steer:0,throttle:0,frontBrake:0,rearBrake:0,handbrake:false},track);
    return;
  }
  if(state==="race"){
    if(ctl.reverse&&!gearLatch){
      if(car.speed<1.5){
        car.setGear(car.gear<0?0:-1);
        audio.beep(car.gear<0?300:600,.05);
      }else{
        ui.toast("Slow down to engage reverse");
      }
      gearLatch=1;
    }
    if(ctl.up&&!gearLatch){
      if(car.gear<car.p.gears.length)car.setGear(car.gear+1);
      audio.beep(740,.04);gearLatch=1;
    }
    if(ctl.down&&!gearLatch){
      if(car.gear>0)car.setGear(car.gear-1);
      audio.beep(260,.04);gearLatch=1;
    }
    if(!ctl.up&&!ctl.down&&!ctl.reverse)gearLatch=0;
    // Upshifts are entirely manual. At redline the engine simply reaches the limiter;
    // the selected gear never changes without a driver command.
    car.update(dt,ctl,track);
    raceTime+=dt;lapTime+=dt;
    const distanceStep=car.speed*dt;
    lapDistance+=distanceStep;
    totalDistance+=distanceStep;
    const prog=track.nearest(car.x,car.z,car.y,car.trackIndex).progress;
    // The start line is physically the same point as the lap seam. Do not allow the
    // first few meters of movement to count as a completed lap due to sample jitter.
    if(!lapArmed&&prog>.12)lapArmed=true;
    if(lapArmed&&lapDistance>track.length*.78&&crossedLapForward(lastProgress,prog)){
      if(lapValid){bestLap=Math.min(bestLap,lapTime);audio.beep(880,.12)}
      lapTime=0;lapValid=true;
      lap++;
      lapArmed=false;
      lapDistance=0;
      if(lap>=5){state="finish";ui.finishRace(raceTime,bestLap);ui.setFinishVisible(true)}
    }
    // If the player goes substantially off track, mark the lap dirty rather than
    // inventing a reset or invisible wall.
    if(Math.abs(track.nearest(car.x,car.z,car.y,car.trackIndex).lateral)>track.width*.75)lapValid=false;
    lastProgress=prog;
    audio.update(car.rpm,car.throttle,car.gear,car.skid);
  }
  ui.hud(car,Math.min(lapTime,99999),lap,bestLap,raceTime);
}
function loop(now){
  const dt=Math.min(.033,(now-last)/1000);last=now;
  step(dt);
  renderer.render(car,track,scenery);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
