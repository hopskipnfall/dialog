import { Injectable, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import * as ffmpeg from 'fluent-ffmpeg';
import { BehaviorSubject, Observable } from 'rxjs';
import { ElectronService } from './core/services';
import { ReadSubtitlesRequest, ReadSubtitlesResponse } from './shared/ipc/messages';
import { ExtractionStatus, VideoModel } from './shared/models/video-model';

export interface VideoExtractionConfig {
  video: VideoModel;
  subtitleStream?: ffmpeg.FfprobeStream;
  audioStream: ffmpeg.FfprobeStream;
  ignoredChapters: string[];
}

@Injectable({
  providedIn: 'root',
})
export class VideoService implements OnDestroy {
  private videos: VideoModel[] = [];

  private videosSubject: BehaviorSubject<VideoModel[]> = new BehaviorSubject(this.videos);

  private extractionQueue: VideoExtractionConfig[] = [];

  statusMap: BehaviorSubject<{ [key: string]: ExtractionStatus }> = new BehaviorSubject({});

  constructor(private electron: ElectronService, private router: Router) {
    // New videos are added.
    this.electron.ipcRenderer.on('new-files', (event, filename: string, ffprobeData: ffmpeg.FfprobeData) => {
      // todo: dedupe
      this.videos.push(new VideoModel(filename, ffprobeData));
      this.videosSubject.next(this.videos);
    });

    this.electron.ipcRenderer.on('progress-update', (event, status: ExtractionStatus) => {
      const copy = { ...this.statusMap.getValue() };
      copy[status.uri] = status;
      this.statusMap.next(copy);
    });

    this.electron.ipcRenderer.on('read-subtitles-response', (event, response: ReadSubtitlesResponse) => {
      console.log('ReadSubtitlesResponse', response);
      const copy = { ...this.statusMap.getValue() };
      copy[response.path].percentage = 0;
      copy[response.path].phase = 'PENDING';
      this.statusMap.next(copy);

      const config = this.extractionQueue.find((c) => c.video.ffprobeData.format.filename === response.path);
      if (!config) {
        throw Error('WHAT HAPPENED');
      }
      this.extractAudio(config);
    });
  }

  extractAudio(videoConfig: VideoExtractionConfig): void {
    this.electron.ipcRenderer.send('');
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
