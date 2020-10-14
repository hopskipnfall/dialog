import * as ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as moment from 'moment';
import * as os from 'os';
import * as path from 'path'; // eslint-disable-line unicorn/import-style
import { BehaviorSubject, Observable } from 'rxjs';

type Statuses =
  | 'NOT_STARTED'
  | 'EXTRACTING_SUBTITLES'
  | 'EXTRACTING_SUBTITLES_DONE'
  | 'EXTRACTING_DIALOG'
  | 'DONE'
  | 'ERROR';

export interface ExtractionStatus {
  uri: string;
  phase: Statuses;
  percentage: number;
  debug?: unknown;
}

export interface Interval {
  start: string;
  end: string;
}

export class Video {
  stream: fs.WriteStream;

  extractionProgress: BehaviorSubject<ExtractionStatus> = new BehaviorSubject({
    uri: this.videoPath,
    phase: 'NOT_STARTED',
    percentage: 0,
  });

  constructor(private videoPath: string) {}

  getProgress(): Observable<ExtractionStatus> {
    return this.extractionProgress;
  }

  getInfo(): Promise<ffmpeg.FfprobeData> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(this.videoPath, ['-show_chapters'], (err, data) => {
        if (data) resolve(data);
        if (err) reject(err);
      });
    });
  }

  async extractDialog(): Promise<void> {
    try {
      const scratchPath = fs.mkdtempSync(
        path.join(os.tmpdir(), `${path.basename(this.videoPath, path.extname(this.videoPath))}-`),
      );
      console.log('Scratch path', scratchPath);
      fs.mkdirSync(scratchPath, { recursive: true });
      // TODO: Is there a better way to find the "desktop" folder?
      const outputFolder = path.join(os.homedir(), 'Desktop', 'Dialog');
      if (!fs.existsSync(outputFolder)) {
        fs.mkdirSync(outputFolder);
      }
      // TODO: This somehow throws a user-visible error but does not stop execution.
      // Figure out how to catch this and prevent moving forward.
      this.stream = fs.createWriteStream(
        `${path.join(outputFolder, path.basename(this.videoPath, path.extname(this.videoPath)))}.mp3`,
      );
      const subtitlesPath = path.join(scratchPath, 'subs.srt');
      await this.extractSubtitles(subtitlesPath);
      const intervals = await this.getSubtitleIntervals(subtitlesPath);
      const combined = this.combineIntervals(intervals);
      await this.extractAudio(combined);
      // Note: This doesn't throw an error when it fails (for example, with recursive: false)...
      fs.rmdirSync(scratchPath, { recursive: true });

      this.extractionProgress.next({
        uri: this.videoPath,
        phase: 'DONE',
        percentage: 100,
      });
      console.log('Extraction complete.');
    } catch (error) {
      this.extractionProgress.next({
        uri: this.videoPath,
        phase: 'ERROR',
        percentage: 100,
        debug: error,
      });
      throw error;
    }
  }

  async extractDialogNew(config: any): Promise<void> {
    try {
      const scratchPath = fs.mkdtempSync(
        path.join(os.tmpdir(), `${path.basename(this.videoPath, path.extname(this.videoPath))}-`),
      );
      console.log('Scratch path', scratchPath);
      fs.mkdirSync(scratchPath, { recursive: true });
      // TODO: Is there a better way to find the "desktop" folder?
      const outputFolder = path.join(os.homedir(), 'Desktop', 'Dialog');
      if (!fs.existsSync(outputFolder)) {
        fs.mkdirSync(outputFolder);
      }
      // TODO: This somehow throws a user-visible error but does not stop execution.
      // Figure out how to catch this and prevent moving forward.
      this.stream = fs.createWriteStream(
        `${path.join(outputFolder, path.basename(this.videoPath, path.extname(this.videoPath)))}.mp3`,
      );
      const subtitlesPath = path.join(scratchPath, 'subs.srt');
      await this.extractSubtitles(subtitlesPath, config.subtitleStream);
      const intervals = await this.getSubtitleIntervals(subtitlesPath);
      let combined = this.combineIntervals(intervals);
      combined = await this.subtractChapters(combined, config.ignoredChapters);
      await this.extractAudio(combined, config.audioStream);
      // Note: This doesn't throw an error when it fails (for example, with recursive: false)...
      fs.rmdirSync(scratchPath, { recursive: true });

      this.extractionProgress.next({
        uri: this.videoPath,
        phase: 'DONE',
        percentage: 100,
      });
      console.log('Extraction complete.');
    } catch (error) {
      this.extractionProgress.next({
        uri: this.videoPath,
        phase: 'ERROR',
        percentage: 100,
      });
      throw error;
    }
  }

  private async subtractChapters(combined: Interval[], chapters: string[]): Promise<Interval[]> {
    const info = await this.getInfo();

    const chapterIntervals: Interval[] = [];
    chapters.forEach((chap) =>
      info.chapters
        .filter((c) => c['TAG:title'] === chap)
        .forEach((c) =>
          chapterIntervals.push({
            start: this.formalize(moment.duration(c.start_time, 'seconds')),
            end: this.formalize(moment.duration(c.end_time, 'seconds')),
          }),
        ),
    );

    let out: Interval[] = [...combined];

    // eslint-disable-next-line no-restricted-syntax
    for (const chapter of chapterIntervals) {
      const revision = [];
      // eslint-disable-next-line no-restricted-syntax
      for (const ivl of out) {
        const cur: Interval = { start: ivl.start, end: ivl.end };
        if (cur.start > chapter.start && cur.start < chapter.end) {
          cur.start = chapter.end;
        }
        if (cur.end > chapter.start && cur.end < chapter.end) {
          cur.end = chapter.start;
        }
        if (cur.start < cur.end) {
          revision.push(cur);
        }
      }
      out = revision;
    }

    return out;
  }

  private formalize(duration: moment.Duration): string {
    return `${`${duration.hours()}`.padStart(2, '0')}:${`${duration.minutes()}`.padStart(
      2,
      '0',
    )}:${`${duration.seconds()}`.padStart(2, '0')}.${`${duration.milliseconds()}`.padStart(3, '0')}`;
  }

  private async toPromise(
    command: ffmpeg.FfmpegCommand,
    finish: (command: ffmpeg.FfmpegCommand) => void,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      finish(
        command
          .on('error', (err, stdout: string, stderr: string) => {
            console.error('SOMETHING WENT WRONG', err, stdout, stderr);
            reject({ err, stdout, stderr });
          })
          .on('end', (stdout: string, stderr: string) => {
            resolve({ stdout, stderr });
          }),
      );
    });
  }

  /** Synchronously extracts segments. */
  private async extractAudio(intervals: Interval[], stream?: ffmpeg.FfprobeStream) {
    const track = stream ? stream.index : 2; // TODO: get rid of 2

    for (let i = 0, max = intervals.length; i < max; i++) {
      const interval = intervals[i];
      const command = ffmpeg(this.videoPath)
        .noVideo()
        .outputOption('-ss', `${interval.start}`, '-to', `${interval.end}`, '-map', `0:${track}`) // , "-q:a", "0", "-map", "a")
        .audioBitrate('128k')
        .audioCodec('libmp3lame')
        .format('mp3')
        .on('progress', (progress) => {
          this.extractionProgress.next({
            uri: this.videoPath,
            phase: 'EXTRACTING_DIALOG',
            percentage: (((1 / intervals.length) * (+progress.percent / 100) + i) * 100) / intervals.length,
          });
        });
      // eslint-disable-next-line no-await-in-loop
      await this.toPromise(command, (cmd) => cmd.pipe(this.stream, i === max - 1 ? { end: true } : { end: false }));
    }
  }

  private async extractSubtitles(outputPath: string, stream?: ffmpeg.FfprobeStream) {
    const track = stream ? stream.index : 2; // TODO: get rid of 2
    const command = ffmpeg(this.videoPath)
      .outputOption(`-map 0:${track}`)
      .saveToFile(outputPath)
      .on('progress', (progress) => {
        this.extractionProgress.next({
          uri: this.videoPath,
          phase: 'EXTRACTING_SUBTITLES',
          percentage: progress.percent,
        });
      });
    return this.toPromise(command, (cmd) => cmd.run());
  }

  async readSubtitles(stream: ffmpeg.FfprobeStream): Promise<string> {
    const scratchPath = fs.mkdtempSync(
      path.join(os.tmpdir(), `${path.basename(this.videoPath, path.extname(this.videoPath))}-`),
    );
    console.log('Scratch path', scratchPath);
    fs.mkdirSync(scratchPath, { recursive: true });

    const tempFile = path.join(scratchPath, 'subs.srt');
    const track = stream.index;
    const command = ffmpeg(this.videoPath)
      .outputOption(`-map 0:${track}`)
      .saveToFile(tempFile)
      .on('progress', (progress) => {
        this.extractionProgress.next({
          uri: this.videoPath,
          phase: 'EXTRACTING_SUBTITLES',
          percentage: progress.percent,
        });
      });
    await this.toPromise(command, (command) => command.run());

    const out = await this.readTextFile(tempFile);

    // Note: This doesn't throw an error when it fails (for example, with recursive: false)...
    fs.rmdirSync(scratchPath, { recursive: true });

    return out;
  }

  private readTextFile(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }

  private isGapOverThreshold(start: string, end: string) {
    return moment.duration(end).subtract(moment.duration(start)).milliseconds() > 150; // todo threshold
  }

  private combineIntervals(intervals: Interval[]): Interval[] {
    // eslint-disable-next-line no-param-reassign,unicorn/no-nested-ternary
    intervals = intervals.sort((a, b) => (a.start > b.start ? 1 : b.start > a.start ? -1 : 0));

    const combined: Interval[] = [];
    let pending = intervals[0];
    for (const cur of intervals) {
      if (cur.start < pending.end || !this.isGapOverThreshold(pending.end, cur.start)) {
        if (cur.end >= pending.end) {
          pending = { start: pending.start, end: cur.end };
        }
      } else {
        if (pending.start !== pending.end) {
          combined.push(pending);
        }
        pending = cur;
      }
    }
    if (pending.start !== pending.end) {
      combined.push(pending);
    }

    // let fixed = '';
    // combined.forEach(c => {
    //   fixed += `\n ${c.start} - ${c.end}`;
    // });
    // fs.writeFile(path.join(this.scratchPath, 'subs_fixed.srt'), fixed, () => { });
    return combined;
  }

  /** @deprecated */
  private getSubtitleIntervals(subtitlePath: string): Promise<Interval[]> {
    return new Promise((resolve, reject) => {
      fs.readFile(subtitlePath, 'utf8', (err, data) => {
        if (err) {
          reject(err);
        }
        const srtTimingRegex = /^([^,]+),([^ ]+) --> ([^,]+),([^ ]+)$/;
        const intervals = data
          .split(/[\n\r]/)
          .filter((s) => srtTimingRegex.test(s))
          .map((s) => {
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
