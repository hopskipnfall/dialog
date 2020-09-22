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
  console.log('Screen size', size);

  // Create the browser window.
  win = new BrowserWindow({
    x: 0,
    y: 0,
    width: 560,
    height: 660,
    webPreferences: {
      nodeIntegration: true,
      allowRunningInsecureContent: (serve) ? true : false,
      enableRemoteModule: true, // true if you want to use remote module in renderer context (e.g. Angular)
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

    // win.webContents.openDevTools(); // TODO: Un-submit.
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

const selectFiles = async (event: Electron.IpcMainEvent) => {
  const value = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    // filters: [{ name: 'videosOnly', extensions: ['mkv'] }],
  });
  if (value.canceled) {
    // User hit "cancel" on the file selector.
    return;
  }

  for (const file of value.filePaths) {
    const val = await new Video(file, path.join(__dirname, '.tmp/'), { ffmpeg: ffmpeg.path.replace('app.asar', 'app.asar.unpacked'), ffprobe: ffprobe.path.replace('app.asar', 'app.asar.unpacked') })
      .getInfo();
    const humanName = path.basename(val.format.filename);
    event.sender.send('new-files', humanName, val);
  }
}

ipcMain.on('select-files', (event) => {
  selectFiles(event)
    .catch(reason => {
      event.sender.send('error', `Error occurred while selecting files: ${reason as string}`);
    });
});

const extractDialog = async (event: Electron.IpcMainEvent, vidConfigs: any[]) => {
  console.log('VidConfigs!', vidConfigs);

  for (let i = 0; i < vidConfigs.length; i++) {
    const vidConfig = vidConfigs[i];

    const myUri = vidConfig.video.ffprobeData.format.filename; //(vidConfig.video.ffprobeData.format as FfprobeData).format.filename;
    console.log('Extracting for file', myUri);
    const v = new Video(myUri, path.join(__dirname, '.tmp/'), {
      ffmpeg: ffmpeg.path.replace('app.asar', 'app.asar.unpacked'),
      ffprobe: ffprobe.path.replace('app.asar', 'app.asar.unpacked'),
    });
    const sub = v.getProgress().subscribe(status => {
      event.sender.send('progress-update', status);
    });
    await v.extractDialogNew(vidConfig);
    sub.unsubscribe();
  }
};

ipcMain.on('extract-dialog-new', (event, vidConfigs) => {
  extractDialog(event, vidConfigs)
    .catch(reason => {
      event.sender.send('error', `Error occurred while extracting dialog: ${reason as string}`);
    });
});

try {
  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  // Added 400 ms to fix the black background issue while using transparent window. More details at https://github.com/electron/electron/issues/15947
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
