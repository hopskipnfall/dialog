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
  interval: Interval;
  outputPath: string;
  closeStream: boolean;
};

const EXTRACT_AUDIO_RESPONSE = 'extract-audio-response';

export type ExtractAudioResponse = {
  type: typeof EXTRACT_AUDIO_RESPONSE;
  interval: Interval;
  outputPath: string;
  closeStream: boolean;
};

export type ClientMessage = ReadSubtitlesRequest | ExtractAudioRequest;

export type ServerMessage = ReadSubtitlesResponse | ExtractAudioResponse;

export interface Interval {
  start: string;
  end: string;
}
