// One decoded buffer, with an independent volume control and a gapless loop.
export class LoopMusic {
  constructor({url,getContext,volume=.3,onState=()=>{}}) {
    this.getContext=getContext;
    this.volume=volume;
    this.onState=onState;
    this.state='paused';
    this.requested=false;
    this.generation=0;
    this.offset=0;
    this.voice=null;
    this.context=null;
    this.buffer=null;
    this.master=null;
    this.url=url;
    this.bytes=this.load();
  }

  load() {
    this.loadError=null;
    return fetch(this.url).then(response=>{
      if(!response.ok)throw new Error('Music asset unavailable');
      return response.arrayBuffer();
    }).catch(error=>{this.loadError=error;return null;});
  }

  setState(state) {
    this.state=state;
    this.onState(state);
  }

  play() {
    if(this.requested&&this.voice&&this.context.state!=='running')return this.context.resume();
    if(this.requested)return this.pendingPlay||Promise.resolve();
    if(this.state==='error'){this.bytes=this.load();this.decoding=null;}
    this.requested=true;
    const generation=++this.generation;
    this.setState('loading');
    // Create/resume immediately in the input handler, before awaiting the file.
    this.pendingPlay=this.start(generation);
    return this.pendingPlay;
  }

  async start(generation) {
    try {
      if(!this.context){
        this.context=this.getContext();
        this.context.addEventListener('statechange',()=>{
          if(this.voice&&this.requested)this.setState(this.context.state==='running'?'playing':'paused');
        });
      }
      const context=this.context;
      if(context.state!=='running')await context.resume();
      const bytes=await this.bytes;
      if(generation!==this.generation||!this.requested)return;
      if(!bytes)throw this.loadError||new Error('Music asset unavailable');
      this.decoding??=context.decodeAudioData(bytes.slice(0));
      this.buffer??=await this.decoding;
      if(generation!==this.generation||!this.requested)return;
      this.master??=context.createGain();
      if(!this.connected){this.master.connect(context.destination);this.connected=true;}
      this.master.gain.setValueAtTime(this.volume,context.currentTime);
      const source=context.createBufferSource(),envelope=context.createGain();
      source.buffer=this.buffer;
      source.loop=true;
      source.loopStart=0;
      source.loopEnd=this.buffer.duration;
      envelope.gain.setValueAtTime(0,context.currentTime);
      envelope.gain.linearRampToValueAtTime(1,context.currentTime+.45);
      source.connect(envelope);
      envelope.connect(this.master);
      const offset=this.offset%this.buffer.duration;
      source.start(0,offset);
      this.offset=offset;
      this.startedAt=context.currentTime;
      this.voice={source,envelope};
      source.onended=()=>{source.disconnect();envelope.disconnect();};
      this.setState(context.state==='running'?'playing':'paused');
    } catch(error) {
      if(generation===this.generation){this.requested=false;this.setState('error');throw error;}
    }
  }

  pause() {
    this.requested=false;
    ++this.generation;
    if(this.voice){
      const {source,envelope}=this.voice,now=this.context.currentTime;
      this.offset=(this.offset+Math.max(0,now-this.startedAt))%this.buffer.duration;
      envelope.gain.cancelScheduledValues(now);
      envelope.gain.setValueAtTime(envelope.gain.value,now);
      envelope.gain.linearRampToValueAtTime(0,now+.12);
      source.stop(now+.13);
      this.voice=null;
    }
    this.setState('paused');
  }

  setVolume(volume) {
    this.volume=Math.max(0,Math.min(1,volume));
    if(this.master)this.master.gain.setTargetAtTime(this.volume,this.context.currentTime,.04);
  }
}
