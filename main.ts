import * as ffmpeg from '@ffmpeg-installer/ffmpeg';
import * as ffprobe from '@ffprobe-installer/ffprobe';
import { app, BrowserWindow, dialog, ipcMain, screen } from 'electron';
import * as path from 'path';
import * as url from 'url';
import { Video } from './extraction/video';

let win: BrowserWindow = null;
const args = process.argv.slice(1),
  serve = args.some(val => val === '--serve');

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
      enableRemoteModule: false, // true if you want to use remote module in renderer context (e.g. Angular)
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


  // if (fs.existsSync(dest)) {
  //   console.log('exists')
  // } else {
  //   console.log('LOGGING STUFF', ffmpeg.path, ffmpeg.version);
  //   console.log('ALSO FFPROBE', ffprobe.path, ffprobe.version);

  //   // ffbinaries.downloadBinaries(['ffmpeg', 'ffprobe'], { platform: ffbinaries.detectPlatform(), quiet: true, destination: dest }, function (err, data) {
  //   //   console.log("err,data", err, data)
  //   //   console.log('Downloaded ffplay and ffprobe binaries for linux-64 to ' + dest + '.');
  //   // });
  // }
  console.log('LOGGING STUFF', ffmpeg.path, ffmpeg.version);
  console.log('ALSO FFPROBE', ffprobe.path, ffprobe.version);

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store window
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });

  return win;
}

ipcMain.on('select-files', (event) => {
  dialog.showOpenDialog({
    properties: ['openFile', 'openDirectory', 'multiSelections'],
    filters: [{ name: 'videosOnly', extensions: ['mkv'] }],
  }).then(value => {
    if (value.canceled) {
      // User hit "cancel" on the file selector.
      return;
    }

    value.filePaths.forEach(file => {
      new Video(file, path.join(__dirname, '.tmp/'), { ffmpeg: ffmpeg.path, ffprobe: ffprobe.path })
        .getInfo()
        .then(val => {
          const humanName = path.basename(val.format.filename);
          event.sender.send('new-files', humanName, val);
        });
    });
  })
});

ipcMain.on('extract-dialog', (event, vidPath) => {
  console.log('Extracting for file', vidPath);
  new Video(vidPath, path.join(__dirname, '.tmp/'), { ffmpeg: ffmpeg.path, ffprobe: ffprobe.path })
    .extractDialog();
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
