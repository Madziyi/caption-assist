// Opt-in live infrastructure verification. Credentials remain in process memory.
// Input lines: {url,key}, then {roomId,hostId,guestId}. Only opaque fixture IDs/results are printed.
// Create/end/delete the synthetic metadata via the service-only SQL API between these phases.
import { createClient } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'node:crypto';
import readline from 'node:readline';
const lines = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
const iterator = lines[Symbol.asyncIterator]();
const clients = [];
const channels = [];
async function join(channel, denied = false) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('subscription_timeout')), 12000);
    channel.subscribe((status, error) => {
      if (status === 'SUBSCRIBED') { clearTimeout(timeout); if (denied) reject(new Error('unauthorized_subscription_allowed')); else resolve(); }
      else if (['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status)) { clearTimeout(timeout); if (denied) resolve(); else reject(new Error(`authorized_subscription_failed:${status}:${error?.message ?? 'no_detail'}`)); }
    });
  });
}
async function main() {
  const config = JSON.parse((await iterator.next()).value);
  const users = [];
  for (let i=0;i<3;i++) {
    const client = createClient(config.url,config.key,{auth:{persistSession:false,autoRefreshToken:false}});
    clients.push(client);
    const {data,error} = await client.auth.signInAnonymously();
    if (error || !data.session) throw new Error('anonymous_signin_failed');
    await client.realtime.setAuth(data.session.access_token);
    users.push(data.user.id);
  }
  const tokenHash = createHash('sha256').update(randomBytes(32)).digest('hex');
  process.stdout.write(JSON.stringify({phase:'identities_ready',users,tokenHash})+'\n');
  const fixture = JSON.parse((await iterator.next()).value);
  const channel = (client,topic) => {
    const value = client.channel(topic,{config:{private:true,broadcast:{ack:true,self:false}}});
    channels.push({client,value}); return value;
  };
  const guestTopic = `caption-room:${fixture.roomId}:participant:${fixture.guestId}`;
  const hostRead = channel(clients[0],guestTopic);
  const guestOwn = channel(clients[1],guestTopic);
  let receivedResolve;
  const received = new Promise((resolve) => { receivedResolve=resolve; });
  hostRead.on('broadcast',{event:'caption'},() => receivedResolve(performance.now()));
  await join(hostRead); await join(guestOwn);
  const start=performance.now();
  const receipt=await guestOwn.send({type:'broadcast',event:'caption',payload:{synthetic:true}});
  if (receipt!=='ok') throw new Error('own_send_failed');
  const receivedAt=await Promise.race([received,new Promise((_,reject)=>setTimeout(()=>reject(new Error('delivery_timeout')),5000))]);
  const relayMs=receivedAt-start;
  await guestOwn.track({microphoneActive:false});
  await join(channel(clients[2],guestTopic),true);
  await join(channel(clients[1],`caption-room:${fixture.roomId}:participant:${fixture.hostId}`),true);
  const guestControl=channel(clients[1],`caption-room:${fixture.roomId}:control`);
  await join(guestControl);
  const spoof = await guestControl.send({type:'broadcast',event:'control',payload:{type:'room-ended'}});
  if (spoof==='ok') throw new Error('guest_control_send_allowed');
  process.stdout.write(JSON.stringify({phase:'passed',anonymousAuth:true,privateDelivery:true,relayMs,outsiderDenied:true,impersonationDenied:true,guestControlDenied:true})+'\n');
}
main().catch((error) => { process.stdout.write(JSON.stringify({phase:'failed',category:error.message})+'\n'); process.exitCode=1; }).finally(async()=>{
  await Promise.race([Promise.all(channels.map(({client,value})=>client.removeChannel(value))),new Promise((resolve)=>setTimeout(resolve,3000))]);
  clients.forEach((client)=>client.realtime.disconnect());
  await Promise.race([Promise.all(clients.map((client)=>client.auth.signOut())),new Promise((resolve)=>setTimeout(resolve,10000))]);
  lines.close();
});
