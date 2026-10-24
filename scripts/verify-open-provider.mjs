// Live short synthetic Open provider smoke. Credentials/audio/transcripts stay in memory.
import fs from 'node:fs'; import {execFileSync} from 'node:child_process'; import ts from 'typescript';
import assert from 'node:assert/strict';
const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>l&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1).replace(/^['"]|['"]$/g,'')];}));
const single=process.argv.includes('--single');
const source=fs.readFileSync('src/lib/captions/provider.ts','utf8');
const js=ts.transpile(source,{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022});
const {AssemblyAIStreamingProvider,OPEN_ASSEMBLYAI_OPTIONS,SINGLE_SPEAKER_ASSEMBLYAI_OPTIONS}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const options=single?SINGLE_SPEAKER_ASSEMBLYAI_OPTIONS:OPEN_ASSEMBLYAI_OPTIONS;
globalThis.window=globalThis;
let ps=`Add-Type -AssemblyName System.Speech
$taskSynth=New-Object System.Speech.Synthesis.SpeechSynthesizer
$taskFormat=New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000,[System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen,[System.Speech.AudioFormat.AudioChannel]::Mono)
$taskStream=New-Object System.IO.MemoryStream
try {$taskSynth.SetOutputToAudioStream($taskStream,$taskFormat);$taskSynth.SelectVoice('Microsoft David Desktop');$taskSynth.Speak('We should leave tomorrow because the weather looks better.');$taskSynth.SelectVoice('Microsoft Zira Desktop');$taskSynth.Speak('Yes, I agree. We can meet at the station after breakfast.');$taskSynth.SetOutputToNull();[Convert]::ToBase64String($taskStream.ToArray())}finally{$taskSynth.Dispose();$taskStream.Dispose()}`;
if(single) ps=ps.replace("$taskSynth.SelectVoice('Microsoft Zira Desktop');","$taskSynth.SelectVoice('Microsoft David Desktop');");
const audio=Buffer.from(execFileSync('powershell.exe',['-NoProfile','-Command',ps],{windowsHide:true,encoding:'utf8'}).trim(),'base64');
const tokenResponse=await fetch('https://streaming.assemblyai.com/v3/token?expires_in_seconds=60',{headers:{authorization:env.ASSEMBLYAI_API_KEY}});assert.equal(tokenResponse.ok,true,'temporary token request');const {token}=await tokenResponse.json();
const counts={Begin:0,Turn:0,SpeakerRevision:0,Termination:0,Error:0};const labels=new Set();let configuration; let partials=0; let finals=0; let partialBeforeFirstFinal=false;
const NativeSocket=globalThis.WebSocket;
globalThis.WebSocket=class extends NativeSocket {constructor(url){super(url);this.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.type in counts)counts[m.type]++;if(m.type==='Begin')configuration=m.configuration;if(m.type==='Turn'){if(m.end_of_turn)finals++;else{partials++;if(!finals)partialBeforeFirstFinal=true;}};for(const w of m.words??[])if(w.speaker)labels.add(w.speaker);if(m.speaker_label)labels.add(m.speaker_label);});}};
const provider=new AssemblyAIStreamingProvider(token,single?'single-smoke':'open-smoke',options);
try{await provider.connect();const pcm=Buffer.concat([audio,Buffer.alloc(16000*2*2)]);for(let offset=0;offset<pcm.length;offset+=3200){const chunk=pcm.subarray(offset,offset+3200);provider.sendAudio(chunk.buffer.slice(chunk.byteOffset,chunk.byteOffset+chunk.length));await new Promise(r=>setTimeout(r,100));}await new Promise(r=>setTimeout(r,1500));}finally{await provider.terminate();}
assert.ok(counts.Begin>0&&counts.Turn>0&&counts.Termination>0&&counts.Error===0,'provider lifecycle');
if(single){assert.equal(configuration.speaker_labels,false);assert.equal(configuration.model,"universal-3-6-pro");assert.ok(partialBeforeFirstFinal,"partials must arrive before the first final");}
console.log(JSON.stringify({singleSpeaker:single,options,partials,finals,partialBeforeFirstFinal,counts,distinctSyntheticSpeakerLabels:labels.size,configuration,syntheticOnly:true,midSessionRevisionObserved:false}));
