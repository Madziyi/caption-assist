// Live short synthetic Open provider smoke. Credentials/audio/transcripts stay in memory.
import fs from 'node:fs'; import {execFileSync} from 'node:child_process'; import ts from 'typescript';
import assert from 'node:assert/strict';
const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>l&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1).replace(/^['"]|['"]$/g,'')];}));
const source=fs.readFileSync('src/lib/captions/provider.ts','utf8');
const js=ts.transpile(source,{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022});
const {AssemblyAIStreamingProvider,OPEN_ASSEMBLYAI_OPTIONS}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
globalThis.window=globalThis;
const ps=`Add-Type -AssemblyName System.Speech
$taskSynth=New-Object System.Speech.Synthesis.SpeechSynthesizer
$taskFormat=New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000,[System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen,[System.Speech.AudioFormat.AudioChannel]::Mono)
$taskStream=New-Object System.IO.MemoryStream
try {$taskSynth.SetOutputToAudioStream($taskStream,$taskFormat);$taskSynth.SelectVoice('Microsoft David Desktop');$taskSynth.Speak('We should leave tomorrow because the weather looks better.');$taskSynth.SelectVoice('Microsoft Zira Desktop');$taskSynth.Speak('Yes, I agree. We can meet at the station after breakfast.');$taskSynth.SetOutputToNull();[Convert]::ToBase64String($taskStream.ToArray())}finally{$taskSynth.Dispose();$taskStream.Dispose()}`;
const audio=Buffer.from(execFileSync('powershell.exe',['-NoProfile','-Command',ps],{windowsHide:true,encoding:'utf8'}).trim(),'base64');
const tokenResponse=await fetch('https://streaming.assemblyai.com/v3/token?expires_in_seconds=60',{headers:{authorization:env.ASSEMBLYAI_API_KEY}});assert.equal(tokenResponse.ok,true,'temporary token request');const {token}=await tokenResponse.json();
const counts={Begin:0,Turn:0,SpeakerRevision:0,Termination:0,Error:0};const labels=new Set();let configuration;
const NativeSocket=globalThis.WebSocket;
globalThis.WebSocket=class extends NativeSocket {constructor(url){super(url);this.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.type in counts)counts[m.type]++;if(m.type==='Begin')configuration=m.configuration;for(const w of m.words??[])if(w.speaker)labels.add(w.speaker);if(m.speaker_label)labels.add(m.speaker_label);});}};
const provider=new AssemblyAIStreamingProvider(token,'open-smoke',OPEN_ASSEMBLYAI_OPTIONS);
try{await provider.connect();const pcm=Buffer.concat([audio,Buffer.alloc(16000*2*2)]);for(let offset=0;offset<pcm.length;offset+=3200){const chunk=pcm.subarray(offset,offset+3200);provider.sendAudio(chunk.buffer.slice(chunk.byteOffset,chunk.byteOffset+chunk.length));await new Promise(r=>setTimeout(r,100));}await new Promise(r=>setTimeout(r,1500));}finally{await provider.terminate();}
assert.ok(counts.Begin>0&&counts.Turn>0&&counts.Termination>0&&counts.Error===0,'provider lifecycle');
console.log(JSON.stringify({options:OPEN_ASSEMBLYAI_OPTIONS,counts,distinctSyntheticSpeakerLabels:labels.size,configuration,syntheticOnly:true,midSessionRevisionObserved:false}));
