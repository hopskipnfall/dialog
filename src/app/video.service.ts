import { Injectable, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import * as ffmpeg from 'fluent-ffmpeg';
import * as moment from 'moment';
import { BehaviorSubject, Observable } from 'rxjs';
import { ElectronService } from './core/services';
import { combineIntervals, subtractIntervals } from './shared/intervals';
import {
  ExtractAudioRequest,
  ExtractAudioResponse,
  Interval,
  ReadSubtitlesRequest,
  ReadSubtitlesResponse,
} from './shared/ipc/messages';
import { ExtractionStatus, VideoModel } from './shared/models/video-model';

const GAP_THRESHOLD = moment.duration(1500);

export interface VideoExtractionConfig {
  video: VideoModel;
  subtitles?: {
    subtitleStream?: ffmpeg.FfprobeStream;
    subtitlesOverridePath?: string;
  };
  audioStream: ffmpeg.FfprobeStream;
  ignoredChapters: string[];
  intervals: Interval[];
  finished: boolean;
  outputOptions: {
    trackNumber: number;
    trackName: string;
    albumName: string;
  };
}

/** Extracts subtitle intervals from a SRT-formatted file. */
const extractSrtSubtitleIntervals = (subtitles: string): Interval[] => {
  const srtTimingRegex = /^([^,]+),([^ ]+) --> ([^,]+),([^ ]+)$/;
  const intervals = subtitles
    .split(/[\n\r]/) // Split on newlines.
    .filter((s) => srtTimingRegex.test(s))
    .map((s) => {
      const res = srtTimingRegex.exec(s);
      return {
        start: `${res[1]}.${res[2]}`,
        end: `${res[3]}.${res[4]}`,
      };
    });
  return intervals;
};

const formalize = (duration: moment.Duration): string => {
  return `${`${duration.hours()}`.padStart(
    2,
    '0',
  )}:${`${duration.minutes()}`.padStart(
    2,
    '0',
  )}:${`${duration.seconds()}`.padStart(
    2,
    '0',
  )}.${`${duration.milliseconds()}`.padStart(3, '0')}`;
};

/** Removes skipped chapters from the list of intervals. */
const subtractChapters = (
  combined: Interval[],
  config: VideoExtractionConfig,
): Interval[] => {
  const chapterIntervals: Interval[] = [];
  config.ignoredChapters.forEach((chap) =>
    config.video.ffprobeData.chapters
      .filter((c) => c['TAG:title'] === chap)
      .forEach((c) =>
        chapterIntervals.push({
          start: formalize(moment.duration(c.start_time, 'seconds')),
          end: formalize(moment.duration(c.end_time, 'seconds')),
        }),
      ),
  );

  return subtractIntervals(combined, chapterIntervals);
};

@Injectable({
  providedIn: 'root',
})
export class VideoService implements OnDestroy {
  private videos: VideoModel[] = [];

  private actionInProgress = false;

  private videosSubject: BehaviorSubject<VideoModel[]> = new BehaviorSubject(
    this.videos,
  );

  private extractionQueue: VideoExtractionConfig[] = [];

  statusMap: BehaviorSubject<{
    [key: string]: ExtractionStatus;
  }> = new BehaviorSubject({});

  constructor(private electron: ElectronService, private router: Router) {
    // New videos are added.
    this.electron.ipcRenderer.on(
      'new-files',
      (event, filename: string, ffprobeData: ffmpeg.FfprobeData) => {
        // todo: dedupe
        this.videos.push(new VideoModel(filename, ffprobeData));
        this.videosSubject.next(this.videos);
      },
    );

    this.electron.ipcRenderer.on(
      'progress-update',
      (event, status: ExtractionStatus) => {
        const copy = { ...this.statusMap.getValue() };
        copy[status.uri] = status;
        this.statusMap.next(copy);
      },
    );

    this.electron.ipcRenderer.on(
      'read-subtitles-response',
      (event, response: ReadSubtitlesResponse) => {
        this.actionInProgress = false;

        const config = this.extractionQueue.find(
          (c) => c.video.ffprobeData.format.filename === response.path,
        );
        if (!config) {
          throw Error('WHAT HAPPENED');
        }

        let intervals = extractSrtSubtitleIntervals(response.subtitles);
        intervals = combineIntervals(intervals, GAP_THRESHOLD);
        intervals = subtractChapters(intervals, config);

        config.intervals = intervals;

        const copy = { ...this.statusMap.getValue() };
        copy[response.path].percentage = 100;
        copy[response.path].phase = 'PENDING';
        this.statusMap.next(copy);

        this.triggerNextAction();
        // this.extractAudio(config);
      },
    );

    this.electron.ipcRenderer.on(
      'extract-audio-response',
      (event, response: ExtractAudioResponse) => {
        this.actionInProgress = false;
        console.log('ExtractAudioResponse', response);

        this.triggerNextAction();
      },
    );
  }

  private triggerNextAction() {
    if (this.actionInProgress) {
      return;
    }

    this.actionInProgress = true;

    this.extractionQueue
      .filter(
        (c) =>
          (!c.intervals || c.intervals.length === 0) &&
          !c.subtitles.subtitleStream &&
          !c.subtitles.subtitlesOverridePath,
      )
      .forEach((noSubtitles) => {
        const durationSeconds = noSubtitles.video.ffprobeData.format.duration;
        const start = formalize(moment.duration(0, 'seconds'));
        const end = formalize(moment.duration(durationSeconds, 'seconds'));
        let intervals = [{ start, end }];
        intervals = subtractChapters(intervals, noSubtitles);
        noSubtitles.intervals = intervals;
      });

    const noIntervals = this.extractionQueue.find(
      (c) => !c.intervals || c.intervals.length === 0,
    );
    const notExtracted = this.extractionQueue.find((c) => !c.finished);
    if (noIntervals) {
      const request: ReadSubtitlesRequest = {
        type: 'read-subtitles',
        path: noIntervals.video.ffprobeData.format.filename,
        stream: noIntervals.subtitles.subtitleStream,
        subtitlesOverridePath: noIntervals.subtitles.subtitlesOverridePath,
      };
      this.electron.ipcRenderer.send('read-subtitles', request);
    } else if (notExtracted) {
      // TODO: Put this in a better place.
      notExtracted.finished = true;

      console.log('Extracting now!', notExtracted);
      const audioSourceTrack = notExtracted.audioStream
        ? notExtracted.audioStream.index
        : 2; // TODO: get rid of 2

      const request: ExtractAudioRequest = {
        type: 'extract-audio-request',
        intervals: notExtracted.intervals,
        audioSourceTrack,
        videoPath: notExtracted.video.ffprobeData.format.filename,
        outputOptions: {
          ...notExtracted.outputOptions,
        },
      };
      this.electron.ipcRenderer.send('extract-audio', request);
    } else {
      this.actionInProgress = false;
    }
  }

  getProgressUpdates(): Observable<{ [key: string]: any }> {
    return this.statusMap;
  }

  queueExtraction(videoConfigs: VideoExtractionConfig[]): void {
    // was this.electron.ipcRenderer.send('extract-dialog-new', videoConfigs);
    // TODO: Make this do more than just extract subtitles.
    // this.router.navigateByUrl('/'); // DUMB
    this.extractionQueue.push(...videoConfigs);
    this.triggerNextAction();
  }

  addVideos(): void {
    this.electron.ipcRenderer.send('select-files');
  }

  getVideos(): Observable<VideoModel[]> {
    return this.videosSubject;
  }

  getCurrentVideos(): VideoModel[] {
    return this.videosSubject.getValue();
  }

  ngOnDestroy(): void {
    this.electron.ipcRenderer.removeAllListeners('new-files');
    this.electron.ipcRenderer.removeAllListeners('progress-update');
    this.electron.ipcRenderer.removeAllListeners('read-subtitles-response');
    this.electron.ipcRenderer.removeAllListeners('extract-audio-response');
  }
}
