# Simple Electron + Discord.js sound capturing app
This app is a demo project to test if one browser tab can record a sound from the second browser tab and stream that captured audio to the Discord bot.

### Setup
1. Make sure NodeJS is installed on your system.
2. Perform `npm i` to install dependencies.
3. Create `.env` file in the root of the project and populate it with the DISCORD BOT API token
```dotenv
DISCORD_TOKEN="..."
```
4. Make sure your Discord bot is part of exactly one Discord server, which has at least one joinable voice channel.
5. Start the app by `npm run start`
6. Once loaded, check if your Discord bot has logged in and joined the first available voice channel on the server.
7. Play anything on the left tab. (You should be able to hear that in Discord)


Disclaimer:
- File [PCMStream.worklet.js](src/PCMStream.worklet.js) comes from [https://github.com/owlbear-rodeo/kenku-fm](https://github.com/owlbear-rodeo/kenku-fm) repo.