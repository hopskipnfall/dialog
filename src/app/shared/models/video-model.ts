import * as ffmpeg from 'fluent-ffmpeg';

// TODO: consolidate?
export interface ExtractionStatus {
  uri: string;
  phase:
    | 'NOT_STARTED'
    | 'EXTRACTING_SUBTITLES'
    | 'EXTRACTING_SUBTITLES_DONE'
    | 'DONE'
    | 'PENDING';
  percentage: number;
}

export class VideoModel {
  constructor(
    public filename: string,
    public ffprobeData: ffmpeg.FfprobeData,
  ) {}
}
