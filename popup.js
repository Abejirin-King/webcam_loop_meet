const $ = id => document.getElementById(id);
const preview = $("preview"), clip = $("clip");
let stream = null, recorder = null, chunks = [], clipUrl = null, timer = null, recording = false;

function status(message){ $("status").textContent = message; }
async function startCamera(){
  try {
    stream = await navigator.mediaDevices.getUserMedia({video:{width:{ideal:1280},height:{ideal:720}},audio:false});
    preview.srcObject = stream;
    $("camera").textContent = "Stop camera";
    $("record").disabled = false;
    status("Camera ready");
  } catch (err) {
    status(err.name === "NotAllowedError" ? "Camera permission was denied. Allow access in Chrome site settings." : "Could not start camera: " + err.message);
  }
}
function stopCamera(){
  if(recording) stopRecording();
  if(stream) stream.getTracks().forEach(track => track.stop());
  stream = null; preview.srcObject = null;
  $("camera").textContent = "Start camera"; $("record").disabled = true;
  status("Camera is off");
}
function startRecording(){
  if(!stream || recording) return;
  chunks = [];
  const mime = ["video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm"].find(type => MediaRecorder.isTypeSupported(type));
  try { recorder = new MediaRecorder(stream, mime ? {mimeType:mime} : undefined); }
  catch(e){ status("Recording is not supported by this browser."); return; }
  recorder.ondataavailable = e => { if(e.data && e.data.size) chunks.push(e.data); };
  recorder.onstop = () => {
    clearTimeout(timer);
    const blob = new Blob(chunks,{type:recorder.mimeType || "video/webm"});
    if(clipUrl) URL.revokeObjectURL(clipUrl);
    clipUrl = URL.createObjectURL(blob);
    clip.src = clipUrl; $("clipSection").hidden = false; clip.currentTime = 0;
    status("Loop captured · " + (blob.size/1024).toFixed(0) + " KB");
    $("record").disabled = false; $("stop").disabled = true;
  };
  recorder.start(100); recording = true;
  $("record").disabled = true; $("stop").disabled = false;
  status("Recording… hold still, or do your thing.");
  timer = setTimeout(stopRecording, Number($("duration").value)*1000);
}
function stopRecording(){
  if(!recording || !recorder) return;
  recording = false; clearTimeout(timer);
  if(recorder.state !== "inactive") recorder.stop();
}
$("camera").addEventListener("click",()=>stream ? stopCamera() : startCamera());
$("record").addEventListener("click",startRecording);
$("stop").addEventListener("click",stopRecording);
$("duration").addEventListener("input",()=>{$("durationLabel").textContent=$("duration").value+" sec";});
$("play").addEventListener("click",async()=>{if(!clipUrl)return;if(clip.paused){clip.currentTime=0;try{await clip.play();$("play").textContent="Ⅱ Pause loop";}catch(e){status("Press play on the video to start playback.");}}else{clip.pause();$("play").textContent="▶ Play loop";}});
clip.addEventListener("play",()=>{$("play").textContent="Ⅱ Pause loop";});
clip.addEventListener("pause",()=>{$("play").textContent="▶ Play loop";});
$("download").addEventListener("click",()=>{
  if(!clipUrl)return;
  const a=document.createElement("a");a.href=clipUrl;a.download="webcam-loop-"+new Date().toISOString().replace(/[:.]/g,"-")+".webm";a.click();
});
window.addEventListener("pagehide",()=>{clearTimeout(timer);if(stream)stream.getTracks().forEach(t=>t.stop());if(clipUrl)URL.revokeObjectURL(clipUrl);});