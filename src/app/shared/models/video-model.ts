import * as ffmpeg from 'fluent-ffmpeg';

// TODO: consolidate?
export interface ExtractionStatus {
  uri: string;
  phase: 'NOT_STARTED' | 'EXTRACTING_SUBTITLES' | 'EXTRACTING_SUBTITLES_DONE' | 'DONE';
  percentage: number;
}

export class VideoModel {
  status: ExtractionStatus;

  constructor(public filename: string, public ffprobeData: ffmpeg.FfprobeData) {
    this.status = {
      uri: filename,
      phase: 'NOT_STARTED',
      percentage: 0,
    };
  }
}
