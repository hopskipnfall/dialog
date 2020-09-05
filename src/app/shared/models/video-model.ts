import * as ffmpeg from 'fluent-ffmpeg';

export class VideoModel {

  constructor(public filename: string, public ffprobeData: ffmpeg.FfprobeData) {}
}
