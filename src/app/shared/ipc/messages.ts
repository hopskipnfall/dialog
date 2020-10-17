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
  stream: ffmpeg.FfprobeStream;
};

const READ_SUBTITLES_RESPONSE = 'read-subtitles-response';

export type ReadSubtitlesResponse = {
  type: typeof READ_SUBTITLES_RESPONSE;
  path: string;
  subtitles: string;
};

const EXTRACT_AUDIO_REQUEST = 'extract-audio-request';

export type ExtractAudioRequest = {
  type: typeof EXTRACT_AUDIO_REQUEST;
  intervals: Interval[];
  videoPath: string;
  audioTrack: number;
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
  | OpenDebugConsoleRequest;

export type ServerMessage =
  | ReadSubtitlesResponse
  | ExtractAudioResponse
  | OpenDebugConsoleResponse;

export interface Interval {
  start: string;
  end: string;
}
