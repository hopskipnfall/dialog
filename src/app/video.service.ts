import { Injectable, OnDestroy, ChangeDetectorRef } from '@angular/core';
import * as ffmpeg from 'fluent-ffmpeg';
import { ElectronService } from './core/services';
import { VideoModel, ExtractionStatus } from './shared/models/video-model';
import { BehaviorSubject, Observable } from 'rxjs';
import { Router } from '@angular/router';

export interface VideoExtractionConfig {
  video: VideoModel
  subtitleStream?: ffmpeg.FfprobeStream
  audioStream: ffmpeg.FfprobeStream
  ignoredChapters: string[]
}

@Injectable({
  providedIn: 'root',
})
export class VideoService implements OnDestroy {
  private videos: VideoModel[] = [];
  private videosSubject: BehaviorSubject<VideoModel[]> = new BehaviorSubject(this.videos);

  private extractionQueue: VideoExtractionConfig[] = [];

  constructor(
    private electron: ElectronService,
    private router: Router,
    ) {

    // New videos are added.
    this.electron.ipcRenderer.on('new-files', (event, filename: string, ffprobeData: ffmpeg.FfprobeData) => {
      // todo: dedupe
      this.videos.push(new VideoModel(filename, ffprobeData))
      this.videosSubject.next(this.videos);
    });

    this.electron.ipcRenderer.on('progress-update', (event, status: ExtractionStatus) => {
      const i = this.videos.findIndex(v => v.ffprobeData.format.filename == status.uri);
      if (i == -1) {
        console.error('Video for status not found!', status);
        return;
      }
      this.videos[i] = {...this.videos[i]}
      this.videos[i].status = status;
      this.notifyVideos();
    });
  }

  private notifyVideos() {
    this.videosSubject.next([...this.videos]);
  }

  queueExtraction(videoConfigs: VideoExtractionConfig[]): void {
    this.electron.ipcRenderer.send('extract-dialog-new', videoConfigs);
    this.router.navigateByUrl('/');
  }

  addVideos() {
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
  }
}
