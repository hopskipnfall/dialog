
import * as ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import { BehaviorSubject, Observable } from 'rxjs';
import { FfpathsConfig } from './ffpaths';

export class Video {
  constructor(private videoPath: string, private scratchPath: string, private ffpaths: FfpathsConfig) {
    ffmpeg.setFfmpegPath(this.ffpaths.ffmpeg);
    ffmpeg.setFfprobePath(this.ffpaths.ffprobe);
  }

  getInfo(): Promise<ffmpeg.FfprobeData> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(this.videoPath, (err, data) => {
        if (data) resolve(data);
        if (err) reject(err);
      });
    });
  }

  extractDialog(): Observable<number> {
    fs.mkdirSync(this.scratchPath, { recursive: true }) //todo: async
    this.extractSubtitles();
    const s = new BehaviorSubject(42);
    return s;
  }

  private extractSubtitles() {
    // TODO: Add a timeout.
    ffmpeg.ffprobe(this.videoPath, (err, data) => {
      console.error('FFPROBEDATA', data);
    })
    //   const cmd = ffmpeg(this.videoPath);
    //   cmd.map(`0:2`)

    //   return spawn(this.ffpaths.ffmpeg, [
    //     '-y', // Do not ask for confirmation.
    //     '-i', // Input.
    //     this.videoPath,
    //     '-map',
    //     `0:2`,
    //     path.join(this.scratchPath, 'subs.srt'),
    //   ]);
  }
}
