import { ipcMain, IpcMainEvent } from 'electron';
import {
  ExtractAudioRequest,
  ExtractAudioResponse,
  OpenDebugConsoleRequest,
  OpenDebugConsoleResponse,
  PickFileRequest,
  PickFileResponse,
  ReadSubtitlesRequest,
  ReadSubtitlesResponse,
  ServerMessage,
} from '../src/app/shared/ipc/messages';

const toString = (maybeString: unknown): string => {
  if (typeof maybeString === 'object' && maybeString !== null) {
    return JSON.stringify(maybeString);
  }
  return `${maybeString as string}`;
};

const finalize = (event: IpcMainEvent, promise: Promise<ServerMessage>) => {
  promise.then(
    (response) => {
      event.sender.send(response.type, response);
    },
    (reason) => {
      event.sender.send(
        'error',
        `Error producing response: ${toString(reason)}`,
      );
      return null;
    },
  );
};

export const readSubtitlesListener = (
  callback: (
    event: IpcMainEvent,
    request: ReadSubtitlesRequest,
  ) => Promise<ReadSubtitlesResponse>,
): void => {
  ipcMain.on('read-subtitles', (event, ...args) => {
    finalize(event, callback(event, args[0]));
  });
};

export const extractAudioListener = (
  callback: (
    event: IpcMainEvent,
    request: ExtractAudioRequest,
  ) => Promise<ExtractAudioResponse>,
): void => {
  ipcMain.on('extract-audio', (event, ...args) => {
    finalize(event, callback(event, args[0]));
  });
};

export const openDebugConsoleListener = (
  callback: (
    event: IpcMainEvent,
    request: OpenDebugConsoleRequest,
  ) => Promise<OpenDebugConsoleResponse>,
): void => {
  ipcMain.on('open-debug-console', (event, ...args) => {
    finalize(event, callback(event, args[0]));
  });
};

export const pickFileListener = (
  callback: (
    event: IpcMainEvent,
    request: PickFileRequest,
  ) => Promise<PickFileResponse>,
): void => {
  ipcMain.on('pick-file', (event, ...args) => {
    finalize(event, callback(event, args[0]));
  });
};
