import {app, BrowserWindow, ipcMain, WebContentsView} from "electron";
import * as path from "node:path";
import {RawData, WebSocket, WebSocketServer} from "ws";
import {
  AudioPlayer,
  createAudioResource,
  joinVoiceChannel,
  NoSubscriberBehavior,
  StreamType,
  VoiceConnectionStatus
} from "@discordjs/voice";
import {Client, Collection, GatewayIntentBits, OAuth2Guild, VoiceChannel} from "discord.js";
import {Readable} from "node:stream";
import ffmpegPath from "ffmpeg-static";
import {opus} from "prism-media";
import Encoder = opus.Encoder;
import {configDotenv} from "dotenv";

configDotenv();
const DISCORD_TOKEN = process.env.DISCORD_TOKEN || "ERROR";
console.log("DISCORD_TOKEN", DISCORD_TOKEN);

/** Sample rate of the audio context */
const SAMPLE_RATE = 48000;
/** Number of channels for the audio context */
const NUM_CHANNELS = 2;
/** 16 bit audio data */
const BIT_DEPTH = 16;
/** Number of bytes per audio sample */
const BYTES_PER_SAMPLE = BIT_DEPTH / 8;
/** 20ms Opus frame duration */
const FRAME_DURATION = 20;
/** Duration of each audio frame in seconds */
const FRAME_DURATION_SECONDS = FRAME_DURATION / 1000;
/**
 * Size in bytes of each frame of audio
 * We stream audio to the main context as 16bit PCM data
 * At 48KHz with a frame duration of 20ms (or 0.02s) and a stereo signal
 * our `frameSize` is calculated by:
 * `SAMPLE_RATE * FRAME_DURATION_SECONDS * NUM_CHANNELS / BYTES_PER_SAMPLE`
 * or:
 * `48000 * 0.02 * 2 / 2 = 960`
 */
const FRAME_SIZE =
  (SAMPLE_RATE * FRAME_DURATION_SECONDS * NUM_CHANNELS) / BYTES_PER_SAMPLE;

const indexHTML = path.join(__dirname, "index.html");

async function setupAudioCapture(window: BrowserWindow, captureTab: WebContentsView, youtubeTab: WebContentsView){
  try {
    const sourceId = youtubeTab.webContents.getMediaSourceId(captureTab.webContents);

    captureTab.webContents.send("setup-audio-capture", {
      chromeMediaSource: 'tab',
      chromeMediaSourceId: sourceId,
    } as MediaTrackConstraints)
  } catch (e) {
    console.error('Audio capture failed:', e);
  }
}

function setupWebsocketServer(messageCallback?: (msg: RawData) => Promise<void>){
  const websocketServer = new WebSocketServer({ port: 17253 });
  ipcMain.handle("get-websocket", () => websocketServer.address());

  websocketServer.on("connection", async (socket: WebSocket) => {
    socket.on("message", async (data: RawData) => {
      await (messageCallback ? messageCallback(data) : new Promise<void>((resolve) => resolve()));
    })
  })
}

async function getGuilds(
  raw: Collection<string, OAuth2Guild>,
): Promise<any[]> {
  return Promise.all(
    raw.map(async (baseGuild) => {
      const guild = await baseGuild.fetch();
      const voiceChannels: any[] = [];
      const channels = await guild.channels.fetch();
      channels.forEach((channel) => {
        if (channel && channel.isVoiceBased()) {
          voiceChannels.push({
            id: channel.id,
            name: channel.name,
          });
        }
      });
      return {
        id: guild.id,
        name: guild.name,
        icon: guild.iconURL(),
        voiceChannels,
      };
    }),
  );
}

async function setupDiscord(token: string, stream: Readable): Promise<void> {
  const audioPlayer = new AudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Play,
      maxMissedFrames: 3000
    }
  });
  audioPlayer.on("error", console.error);

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
    ]
  });
  client.login(token);
  await new Promise<void>((resolve) => {client.once("ready", () => resolve())});
  const rawGuilds = await client.guilds.fetch();
  const guilds = await getGuilds(rawGuilds);
  const channelId = guilds[0].voiceChannels[0].id;
  const channel = (await client.channels.fetch(
    channelId,
  )) as VoiceChannel;
  const connection = joinVoiceChannel({
    channelId: channel.id,
    guildId: channel.guild.id,
    adapterCreator: channel.guild.voiceAdapterCreator
  });
  connection.on(VoiceConnectionStatus.Ready, () => {
    console.log('Voice connection started');
    connection.subscribe(audioPlayer);

    const resource = createAudioResource(stream, {
      inputType: StreamType.Opus,
      inlineVolume: true,
      silencePaddingFrames: 5,
      metadata: {
        ffmpegPath
      }
    });
    resource.volume?.setVolume(1);
    audioPlayer.play(resource);
  });
}

app.on("ready", async () => {
  const encoder = new Encoder({
    channels: NUM_CHANNELS,
    frameSize: FRAME_SIZE,
    rate: SAMPLE_RATE
  });

  setupWebsocketServer(async (data) => {
    const buffer = Buffer.from(data as ArrayLike<number>);
    encoder.write(buffer);
  });

  const win = new BrowserWindow({
    width: 1640,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      devTools: true,
      contextIsolation: true,
    }
  });

  const captureTab = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    }
  });

  const youtubeTab = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    }
  })
  youtubeTab.webContents.setAudioMuted(true);

  win.contentView.addChildView(youtubeTab);
  youtubeTab.webContents.openDevTools();
  await youtubeTab.webContents.loadURL("https://youtube.com/");
  youtubeTab.setBounds({ x: 820, y: 0, width: 820, height: 720 });

  win.contentView.addChildView(captureTab);
  captureTab.webContents.openDevTools();
  await captureTab.webContents.loadURL(indexHTML);
  captureTab.setBounds({ x: 0, y: 0, width: 820, height: 720 })

  await setupAudioCapture(win, captureTab, youtubeTab);
  await setupDiscord(DISCORD_TOKEN, encoder);
})