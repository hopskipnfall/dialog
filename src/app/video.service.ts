import { Injectable, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import * as ffmpeg from 'fluent-ffmpeg';
import * as moment from 'moment';
import { BehaviorSubject, Observable } from 'rxjs';
import { ElectronService } from './core/services';
import {
  Interval,
  ReadSubtitlesRequest,
  ReadSubtitlesResponse,
} from './shared/ipc/messages';
import { ExtractionStatus, VideoModel } from './shared/models/video-model';
import { sortOnField } from './shared/sort';

export interface VideoExtractionConfig {
  video: VideoModel;
  subtitleStream?: ffmpeg.FfprobeStream;
  audioStream: ffmpeg.FfprobeStream;
  ignoredChapters: string[];
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

const isGapOverThreshold = (start: string, end: string) => {
  return (
    moment.duration(end).subtract(moment.duration(start)).milliseconds() > 150
  ); // todo threshold
};

/** Merges overlapping intervals and sorts. */
const combineIntervals = (intervals: Interval[]): Interval[] => {
  const sorted = sortOnField(intervals, (i) => i.start);

  const combined: Interval[] = [];
  let pending = sorted[0];
  // eslint-disable-next-line no-restricted-syntax
  for (const cur of sorted) {
    if (
      cur.start < pending.end ||
      !isGapOverThreshold(pending.end, cur.start)
    ) {
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
  return combined;
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
};

@Injectable({
  providedIn: 'root',
})
export class VideoService implements OnDestroy {
  private videos: VideoModel[] = [];

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
        const config = this.extractionQueue.find(
          (c) => c.video.ffprobeData.format.filename === response.path,
        );
        if (!config) {
          throw Error('WHAT HAPPENED');
        }

        let intervals = extractSrtSubtitleIntervals(response.subtitles);
        intervals = combineIntervals(intervals);
        intervals = subtractChapters(intervals, config);

        const copy = { ...this.statusMap.getValue() };
        copy[response.path].percentage = 0;
        copy[response.path].phase = 'PENDING';
        this.statusMap.next(copy);
        this.extractAudio(config);
      },
    );
  }

  extractAudio(videoConfig: VideoExtractionConfig): void {
    // this.electron.ipcRenderer.send('');
  }

  getProgressUpdates(): Observable<{ [key: string]: any }> {
    return this.statusMap;
  }

  queueExtraction(videoConfigs: VideoExtractionConfig[]): void {
    // was this.electron.ipcRenderer.send('extract-dialog-new', videoConfigs);
    // TODO: Make this do more than just extract subtitles.
    const request: ReadSubtitlesRequest = {
      type: 'read-subtitles',
      path: videoConfigs[0].video.ffprobeData.format.filename,
      stream: videoConfigs[0].subtitleStream,
    };
    this.electron.ipcRenderer.send('read-subtitles', request);
    this.router.navigateByUrl('/');
    this.extractionQueue.push(videoConfigs[0]);
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
  }
}
