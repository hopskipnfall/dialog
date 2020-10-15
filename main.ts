import * as ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import * as ffprobeInstaller from '@ffprobe-installer/ffprobe';
import { app, BrowserWindow, dialog, ipcMain, screen } from 'electron';
import * as ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as url from 'url';
import { extractAudioListener, readSubtitlesListener } from './extraction/ipc';
import { Video } from './extraction/video';

ffmpeg.setFfmpegPath(
  ffmpegInstaller.path.replace('app.asar', 'app.asar.unpacked'),
);
ffmpeg.setFfprobePath(
  ffprobeInstaller.path.replace('app.asar', 'app.asar.unpacked'),
);

let win: BrowserWindow = null;
const args = process.argv.slice(1);
const serve = args.some((val) => val === '--serve');

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
      allowRunningInsecureContent: !!serve,
      enableRemoteModule: true, // true if you want to use remote module in renderer context (e.g. Angular)
    },
  });
  if (serve) {
    win.webContents.openDevTools();
    // eslint-disable-next-line global-require
    require('electron-reload')(__dirname, {
      // eslint-disable-next-line global-require,import/no-dynamic-require
      electron: require(`${__dirname}/node_modules/electron`),
    });
    win.loadURL('http://localhost:4200');
  } else {
    win.loadURL(
      url.format({
        pathname: path.join(__dirname, 'dist/index.html'),
        protocol: 'file:',
        slashes: true,
      }),
    );

    // win.webContents.openDevTools(); // TODO: Un-submit.
  }

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store window
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = undefined;
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
    const val = await new Video(file).getInfo();
    const humanName = path.basename(val.format.filename);
    event.sender.send('new-files', humanName, val);
  }
};

ipcMain.on('select-files', (event) => {
  selectFiles(event).catch((error) => {
    event.sender.send(
      'error',
      `Error occurred while selecting files: ${error as string}`,
    );
  });
});

readSubtitlesListener(async (event, request) => {
  console.log('Reading subtitles request', request);
  const v = new Video(request.path);
  const sub = v.getProgress().subscribe((status) => {
    event.sender.send('progress-update', status);
  });

  const subtitles = await v.readSubtitles(request.stream);

  sub.unsubscribe();

  return {
    type: 'read-subtitles-response',
    path: request.path,
    subtitles,
  };
});

extractAudioListener(async (event, request) => {
  const v = new Video(request.videoPath);
  const sub = v.getProgress().subscribe((status) => {
    event.sender.send('progress-update', status);
  });

  await v.extractDialogNewNew(request);

  sub.unsubscribe();

  return {
    type: 'extract-audio-response',
  };
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
} catch {
  // Catch Error
  // throw e;
}
