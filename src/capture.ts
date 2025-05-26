console.log('Test');

async function createCapture(){
  try {
    const constraints: { chromeMediaSource: string, chromeMediaSourceId: string } = await new Promise(
      resolve => {
        window.API.setupAudioCapture(resolve);
      }
    );

    console.log('[DEBUG] Got constraints:', constraints);

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: constraints.chromeMediaSource,
          chromeMediaSourceId: constraints.chromeMediaSourceId
        }
      } as unknown as MediaTrackConstraints,
      video: false
    });

    console.log('[DEBUG] Audio stream obtained:', stream);
    console.log('[DEBUG] Audio tracks:', stream.getAudioTracks());

    const audioContext = new AudioContext();
    console.log('[DEBUG] AudioContext created with sample rate:', audioContext.sampleRate);

    const audioSource = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();

    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    audioSource.connect(analyser);
    analyser.connect(audioContext.destination);

    console.log('Base latency:', audioContext.baseLatency);
    setInterval(() => {
      analyser.getByteFrequencyData(dataArray);
      const audioData = Array.from(dataArray);
      const average = (audioData.reduce((a, b) => a + b, 0)) / audioData.length;
      console.log('[AUDIO DATA]', average);
    }, 1000);

    console.log('Audio capture started');
  } catch (e) {
    console.error('Audio capture failed:', e);
  }
}

createCapture().catch(console.error);