
import * as ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs';
import { BehaviorSubject, Observable } from 'rxjs';
import { FfpathsConfig } from './ffpaths';
import * as moment from 'moment';

type Statuses =
  | 'NOT_STARTED'
  | 'EXTRACTING_SUBTITLES'
  | 'EXTRACTING_SUBTITLES_DONE'
  | 'EXTRACTING_AUDIO'
  | 'SPLITTING'
  | 'SPLITTING_DONE'
  | 'JOINING'
  | 'DONE';

export interface ExtractionStatus {
  uri: string;
  phase: Statuses;
  percentage: number;
}

export interface Interval {
  start: string;
  end: string;
}

export class Video {
  stream: fs.WriteStream;

  extractionProgress: BehaviorSubject<ExtractionStatus> = new BehaviorSubject({ uri: this.videoPath, phase: 'NOT_STARTED', percentage: 0 });

  constructor(private videoPath: string, private scratchPath: string, private ffpaths: FfpathsConfig) {
    ffmpeg.setFfmpegPath(this.ffpaths.ffmpeg);
    ffmpeg.setFfprobePath(this.ffpaths.ffprobe);
  }

  getProgress(): Observable<ExtractionStatus> {
    return this.extractionProgress;
  }

  getInfo(): Promise<ffmpeg.FfprobeData> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(this.videoPath, (err, data) => {
        if (data) resolve(data);
        if (err) reject(err);
      });
    });
  }

  async extractDialog(): Promise<any> {
    fs.mkdirSync(this.scratchPath, { recursive: true });
    this.stream = fs.createWriteStream(`${path.basename(this.videoPath, path.extname(this.videoPath))}.mp3`);
    await this.extractSubtitles();
    const val = await this.getSubtitleIntervals();
    const combined = this.combineIntervals(val);
    await this.extractSegment(combined);
    console.error('marking as resolved');
  }

  private async toPromise(command: ffmpeg.FfmpegCommand, finish: (command: ffmpeg.FfmpegCommand) => void): Promise<any> {
    return new Promise((resolve, reject) => {
      finish(
        command
          .on('error', (err, stdout: string, stderr: string) => {
            console.error('SOMETHING WENT WRONG', err, stdout, stderr);
            reject({ stdout: stdout, stderr: stderr });
          })
          .on('end', (stdout: string, stderr: string) => {
            resolve({ stdout: stdout, stderr: stderr });
          }));
    });
  }

  /** Synchronously extracts segments. */
  private async extractSegment(intervals: Interval[]) {

    for (let i = 0, max = intervals.length; i < max; i++) {//intervals.length; i++) {
      const interval = intervals[i];
      const command = ffmpeg(this.videoPath)
        .noVideo()
        .outputOption(`-ss`, `${interval.start}`, `-to`, `${interval.end}`)//, "-q:a", "0", "-map", "a")
        .audioBitrate('128k')
        .audioCodec('libmp3lame')
        .format('mp3')
        .on('progress', progress => {
          this.extractionProgress.next({
            uri: this.videoPath, phase: 'JOINING',
            percentage: ((1 / intervals.length) * (+progress.percent / 100) + i) * 100 / intervals.length,
          });
        });
      await this.toPromise(command, command => command.pipe(this.stream, i === max - 1 ? { end: true } : { end: false }));
    }

    this.extractionProgress.next({
      uri: this.videoPath, phase: 'DONE',
      percentage: 100,
    });
  }

  private async extractSubtitles() {
    const command = ffmpeg(this.videoPath)
      .outputOption('-map 0:2')
      .saveToFile(path.join(this.scratchPath, 'subs.srt'))
      .on('progress', progress => {
        this.extractionProgress.next({ uri: this.videoPath, phase: 'EXTRACTING_SUBTITLES', percentage: progress.percent });
      });
    return this.toPromise(command, command => command.run());
  }

  private isGapOverThreshold(start: string, end: string) {
    return moment.duration(end).subtract(moment.duration(start)).milliseconds() > 150;// todo threshold
  }

  private combineIntervals(intervals: Interval[]): Interval[] {
    intervals = intervals.sort((a, b) => (a.start > b.start) ? 1 : ((b.start > a.start) ? -1 : 0));

    const combined: Interval[] = [];
    let pending = intervals[0];
    for (const cur of intervals) {
      if (cur.start < pending.end || !this.isGapOverThreshold(pending.end, cur.start)) {
        if (cur.end >= pending.end) {
          pending = { start: pending.start, end: cur.end };
        }
      } else {
        if (pending.start != pending.end) {
          combined.push(pending)
        }
        pending = cur
      }
    }
    if (pending.start != pending.end) {
      combined.push(pending)
    }

    // let fixed = '';
    // combined.forEach(c => {
    //   fixed += `\n ${c.start} - ${c.end}`;
    // });
    // fs.writeFile(path.join(this.scratchPath, 'subs_fixed.srt'), fixed, () => { });
    return combined;
  }

  private getSubtitleIntervals(): Promise<Interval[]> {
    return new Promise((resolve, reject) => {
      fs.readFile(path.join(this.scratchPath, 'subs.srt'), 'utf8', (err, data) => {
        if (err) {
          reject(err);
        }
        const srtTimingRegex = /^([^,]+),([^ ]+) --> ([^,]+),([^ ]+)$/;
        const intervals = data.split(/[\r\n]/)
          .filter(s => srtTimingRegex.test(s))
          .map(s => {
            const res = srtTimingRegex.exec(s);
            return {
              start: `${res[1]}.${res[2]}`,
              end: `${res[3]}.${res[4]}`,
            };
          });
        resolve(intervals);
      });
    });
  }
}
