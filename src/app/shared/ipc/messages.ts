import * as ffmpeg from 'fluent-ffmpeg';

export type ServerIpcEvent =
  | 'read-subtitles-response'
  | 'progress-update'
  | 'new-files'
  | 'error';

export type ClientIpcEvent =
  | 'read-subtitles'
  | 'select-files'
  | 'extract-audio'
  | 'extract-dialog-new';

const CLIENT_READ_SUBTITLES = 'read-subtitles';

export type ReadSubtitlesRequest = {
  type: typeof CLIENT_READ_SUBTITLES;
  path: string;
  subtitlesOverridePath?: string;
  stream: ffmpeg.FfprobeStream;
};

const READ_SUBTITLES_RESPONSE = 'read-subtitles-response';

export type ReadSubtitlesResponse = {
  type: typeof READ_SUBTITLES_RESPONSE;
  path: string;
  subtitles: string;
};

const CLIENT_PICK_FILE = 'pick-file';

export type PickFileRequest = {
  type: typeof CLIENT_PICK_FILE;
  token: string;
};

const PICK_FILE_RESPONSE = 'pick-file-response';

export type PickFileResponse = {
  type: typeof PICK_FILE_RESPONSE;
  path?: string;
  token: string;
};

const EXTRACT_AUDIO_REQUEST = 'extract-audio-request';

export type ExtractAudioRequest = {
  type: typeof EXTRACT_AUDIO_REQUEST;
  intervals: Interval[];
  videoPath: string;
  /** Channel number. */
  audioSourceTrack: number;

  outputOptions: {
    trackName?: string;
    albumName?: string;
    trackNumber?: number;
  };
};

const EXTRACT_AUDIO_RESPONSE = 'extract-audio-response';

export type ExtractAudioResponse = {
  type: typeof EXTRACT_AUDIO_RESPONSE;
};

const OPEN_DEBUG_CONSOLE_REQUEST = 'extract-audio-request';

export type OpenDebugConsoleRequest = {
  type: typeof OPEN_DEBUG_CONSOLE_REQUEST;
};

const OPEN_DEBUG_CONSOLE_RESPONSE = 'extract-audio-response';

export type OpenDebugConsoleResponse = {
  type: typeof EXTRACT_AUDIO_RESPONSE;
};
export type ClientMessage =
  | ReadSubtitlesRequest
  | ExtractAudioRequest
  | OpenDebugConsoleRequest
  | PickFileRequest;

export type ServerMessage =
  | ReadSubtitlesResponse
  | ExtractAudioResponse
  | OpenDebugConsoleResponse
  | PickFileResponse;

export interface Interval {
  start: string;
  end: string;
}
