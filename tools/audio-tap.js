// Injected before the game loads: copies everything the game plays (WebAudio) into a MediaRecorder,
// so recordings can carry the real in-game sound effects. Read back with window.__audDump().
(() => {
  const orig = AudioNode.prototype.connect;
  window.__aud = { chunks: [], t0: 0 };
  AudioNode.prototype.connect = function (dest, ...rest) {
    if (dest instanceof AudioDestinationNode) {
      const ctx = dest.context;
      if (!ctx.__tap) {
        ctx.__tap = ctx.createMediaStreamDestination();
        const mr = new MediaRecorder(ctx.__tap.stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 160000 });
        mr.ondataavailable = (e) => { if (e.data.size) window.__aud.chunks.push(e.data); };
        mr.start(250); window.__aud.mr = mr; window.__aud.t0 = Date.now();
      }
      orig.call(this, ctx.__tap);
    }
    return orig.call(this, dest, ...rest);
  };
  window.__audDump = () => new Promise((res) => {
    const a = window.__aud; if (!a.mr) return res(null);
    a.mr.onstop = async () => { const b = new Blob(a.chunks, { type: 'audio/webm' }); const buf = new Uint8Array(await b.arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000)); res({ t0: a.t0, b64: btoa(s) }); };
    a.mr.stop();
  });
})();
