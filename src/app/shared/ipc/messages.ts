import * as ffmpeg from 'fluent-ffmpeg';

export type ServerIpcEvent =
  | 'read-subtitles-response'
  | 'progress-update'
  | 'new-files'
  | 'error';

export type ClientIpcEvent =
  | 'read-subtitles'
  | 'select-files'
  | 'extract-dialog-new';

const CLIENT_READ_SUBTITLES = 'read-subtitles';

export type ReadSubtitlesRequest = {
  type: typeof CLIENT_READ_SUBTITLES;
  path: string;
  stream: ffmpeg.FfprobeStream;
};

const READ_SUBTITLES_RESPONSE = 'read-subtitles-response';

export type ReadSubtitlesResponse = {
  type: typeof READ_SUBTITLES_RESPONSE;
  path: string;
  subtitles: string;
};

export type ClientMessage = ReadSubtitlesRequest;

export type ServerMessage = ReadSubtitlesResponse;

export interface Interval {
  start: string;
  end: string;
}
