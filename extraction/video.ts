import * as ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as moment from 'moment';
import * as os from 'os';
import * as path from 'path';
import { BehaviorSubject, Observable } from 'rxjs';
import { ExtractAudioRequest } from '../src/app/shared/ipc/messages';

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
  } as ExtractionStatus); // TODO: Find a safer way to enforce this type.

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

  async extractDialogNewNew(request: ExtractAudioRequest): Promise<void> {
    try {
      // TODO: Is there a better way to find the "desktop" folder?
      const outputFolder = path.join(os.homedir(), 'Desktop', 'Dialog');
      if (!fs.existsSync(outputFolder)) {
        fs.mkdirSync(outputFolder);
      }
      // TODO: This somehow throws a user-visible error but does not stop execution.
      // Figure out how to catch this and prevent moving forward.
      this.stream = fs.createWriteStream(
        `${path.join(
          outputFolder,
          path.basename(this.videoPath, path.extname(this.videoPath)),
        )}.mp3`,
      );
      const combined = request.intervals;
      await this.extractAudio(combined, request);

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

  private async toPromise(
    command: ffmpeg.FfmpegCommand,
    finish: (command: ffmpeg.FfmpegCommand) => void,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      finish(
        command
          .on('start', (cmd) => console.error('Executing FFMPEG command:', cmd))
          .on('error', (err, stdout: string, stderr: string) => {
            console.error('SOMETHING WENT WRONG', err, stdout, stderr);
            // eslint-disable-next-line prefer-promise-reject-errors
            reject({ err, stdout, stderr });
          })
          .on('end', (stdout: string, stderr: string) => {
            resolve({ stdout, stderr });
          }),
      );
    });
  }

  /** Synchronously extracts segments. */
  private async extractAudio(
    intervals: Interval[],
    track: ExtractAudioRequest,
  ) {
    console.error('ExtractAudioRequest', track);
    const metadataParameters = [];
    if (track.outputOptions.albumName) {
      metadataParameters.push(
        '-metadata',
        // TODO: Get rid of these apostrophes.. I think this
        // is a FFMPEG bug. I can only repro with the album field.
        `album='${track.outputOptions.albumName}'`,
      );
    }
    if (track.outputOptions.trackName) {
      metadataParameters.push(
        '-metadata',
        `title=${track.outputOptions.trackName}`,
      );
    }
    if (track.outputOptions.trackNumber) {
      metadataParameters.push(
        '-metadata',
        `track=${track.outputOptions.trackNumber}`,
      );
    }
    for (let i = 0, max = intervals.length; i < max; i += 1) {
      const interval = intervals[i];
      const duration = moment
        .duration(interval.end)
        .subtract(moment.duration(interval.start));
      const command = ffmpeg(this.videoPath)
        .noVideo()
        .setStartTime(interval.start)
        .setDuration(duration.asSeconds())
        .outputOption([
          '-map',
          `0:${track.audioSourceTrack}`,
          ...metadataParameters,
        ])
        .audioCodec('libmp3lame')
        .format('mp3')
        .on('progress', (progress) => {
          this.extractionProgress.next({
            uri: this.videoPath,
            phase: 'EXTRACTING_DIALOG',
            percentage:
              (((1 / intervals.length) * (+progress.percent / 100) + i) * 100) /
              intervals.length,
          });
        });
      // eslint-disable-next-line no-await-in-loop
      await this.toPromise(command, (cmd) =>
        cmd.pipe(this.stream, i === max - 1 ? { end: true } : { end: false }),
      );
    }
  }

  async readSubtitlesFromStream(stream: ffmpeg.FfprobeStream): Promise<string> {
    const scratchPath = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        `${path.basename(this.videoPath, path.extname(this.videoPath))}-`,
      ),
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
    await this.toPromise(command, (c) => c.run());

    const out = await this.readTextFile(tempFile);

    // Note: This doesn't throw an error when it fails (for example, with recursive: false)...
    fs.rmdirSync(scratchPath, { recursive: true });

    return out;
  }

  readTextFile(filePath: string): Promise<string> {
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
}
