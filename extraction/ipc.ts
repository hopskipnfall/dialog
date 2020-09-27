import { ipcMain, IpcMainEvent } from 'electron';
import { ReadSubtitlesRequest, ReadSubtitlesResponse, ServerMessage } from '../src/app/shared/ipc/messages';

const toString = (maybeString: unknown): string => {
  if (typeof maybeString === 'object' && maybeString !== null) {
    return JSON.stringify(maybeString);
  } else {
    return `${maybeString as string}`;
  }
};

const finalize = (event: IpcMainEvent, promise: Promise<ServerMessage>) => {
  promise.then(
    (response) => {
      event.sender.send(response.type, response);
    },
    (reason) => {
      event.sender.send('error', `Error producing response: ${toString(reason)}`);
      return null;
    },
  );
};

export const readSubtitlesListener = (
  callback: (event: IpcMainEvent, request: ReadSubtitlesRequest) => Promise<ReadSubtitlesResponse>,
): void => {
  ipcMain.on('read-subtitles', (event, ...args) => {
    finalize(event, callback(event, args[0]));
  });
};
