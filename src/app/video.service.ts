import { Injectable, OnDestroy, ChangeDetectorRef } from '@angular/core';
import * as ffmpeg from 'fluent-ffmpeg';
import { ElectronService } from './core/services';
import { VideoModel } from './shared/models/video-model';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class VideoService implements OnDestroy {
  private videos: BehaviorSubject<VideoModel[]> = new BehaviorSubject([]);

  constructor(private electron: ElectronService) {

    // New videos are added.
    this.electron.ipcRenderer.on('new-files', (event, filename: string, ffprobeData: ffmpeg.FfprobeData) => {
      this.videos.next([...this.videos.getValue(), new VideoModel(filename, ffprobeData)]);
      // ref.detectChanges();
    });
  }

  addVideos() {
    this.electron.ipcRenderer.send('select-files');
  }

  getVideos(): Observable<VideoModel[]> {
    return this.videos;
  }

  ngOnDestroy(): void {
    this.electron.ipcRenderer.removeAllListeners('new-files');
  }
}
