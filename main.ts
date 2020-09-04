import { app, BrowserWindow, screen, dialog, ipcMain } from 'electron';
import * as path from 'path';
import * as url from 'url';
import * as ffbinaries from 'ffbinaries';
import * as fs from 'fs';
import { spawn } from 'child_process'

let win: BrowserWindow = null;
const args = process.argv.slice(1),
  serve = args.some(val => val === '--serve');


const dest = path.join(__dirname, 'ffbinaries/');

function createWindow(): BrowserWindow {

  const electronScreen = screen;
  const size = electronScreen.getPrimaryDisplay().workAreaSize;

  // Create the browser window.
  win = new BrowserWindow({
    x: 0,
    y: 0,
    width: size.width / 3,
    height: size.height / 3,
    webPreferences: {
      nodeIntegration: true,
      allowRunningInsecureContent: (serve) ? true : false,
      enableRemoteModule: false // true if you want to use remote module in renderer context (ie. Angular)
    },
  });
  if (serve) {

    win.webContents.openDevTools();

    require('electron-reload')(__dirname, {
      electron: require(`${__dirname}/node_modules/electron`)
    });
    win.loadURL('http://localhost:4200');

  } else {
    win.loadURL(url.format({
      pathname: path.join(__dirname, 'dist/index.html'),
      protocol: 'file:',
      slashes: true
    }));
  }


  if (fs.existsSync(dest)) {
    console.log('exists')
  } else {
    ffbinaries.downloadBinaries(['ffmpeg', 'ffprobe'], { platform: ffbinaries.detectPlatform(), quiet: true, destination: dest }, function (err, data) {
      console.log("err,data", err, data)
      console.log('Downloaded ffplay and ffprobe binaries for linux-64 to ' + dest + '.');
    });
  }

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store window
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });

  return win;
}

ipcMain.handle('perform-action', (event) => {
  // ... do something on behalf of the renderer ...
  console.log('event', event);
  dialog.showOpenDialog({ properties: ['openFile', 'openDirectory', 'multiSelections'] }).then(value => {
    console.error('PATHPATH', path.join(dest, 'ffprobe'));
    console.error('PATHPATH2', value.filePaths[0]);
    const bat = spawn(path.join(dest, 'ffprobe'), [
      value.filePaths[0]
    ]);
    
    bat.stdout.on("data", (data) => {
      console.error('DATA', data)
      // Handle data...
    });
  
    bat.stderr.on("data", (data: string) => {
      console.error(`stderr: ${data}`);
      // Handle error...
    });
  
    bat.on("exit", (code) => {
      console.error('exit code', code);
      const tmpDir = path.join(__dirname, '.tmp');

      fs.mkdirSync(tmpDir, { recursive: true }) //todo: async
      //return shell.ExecuteCommand(v.l, "ffmpeg", "-y", "-i", v.Path, "-map", fmt.Sprintf("%d:%d", ffmpegInputNumber, c.Subtitles.Index), c.TempDir+"subs.srt")
      const bat2 = spawn(path.join(dest, 'ffmpeg'), [
        '-y', // Do not ask for confirmation.
        '-i', // Input.
        value.filePaths[0],
        '-map',
        `0:2`,
        path.join(tmpDir, 'subs.srt'),
      ]);

      bat2.stdout.on("data", (data) => {
        console.error('DATA2', data)
        // Handle data...
      });
    
      bat2.stderr.on("data", (data: string) => {
        console.error(`stderr2: ${data}`);
        // Handle error...
      });

    });
  })
});

try {
  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  // Added 400 ms to fix the black background issue while using transparent window. More detais at https://github.com/electron/electron/issues/15947
  app.on('ready', () => setTimeout(createWindow, 400));

  // Quit when all windows are closed.
  app.on('window-all-closed', () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
      createWindow();
    }
  });

} catch (e) {
  // Catch Error
  // throw e;
}
