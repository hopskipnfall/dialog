
import * as path from 'path';
import { FfpathsConfig } from './ffpaths';
import { spawn } from './spawn';
import * as fs from 'fs';
import { Observable, AsyncSubject, BehaviorSubject } from 'rxjs';

export class Video {
  constructor(private videoPath: string, private scratchPath: string, private ffpaths: FfpathsConfig) { }

  extractDialog() : Observable<number> {
    fs.mkdirSync(this.scratchPath, { recursive: true }) //todo: async
    this.extractSubtitles();
    const s = new BehaviorSubject(42);
    return s;
  }

  private async extractSubtitles(): Promise<unknown> {
    // TODO: Add a timeout.
    return spawn(this.ffpaths.ffmpeg, [
      '-y', // Do not ask for confirmation.
      '-i', // Input.
      this.videoPath,
      '-map',
      `0:2`,
      path.join(this.scratchPath, 'subs.srt'),
    ]);
  }
}
