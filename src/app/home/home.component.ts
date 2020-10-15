import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ElectronService } from '../core/services';
import { ExtractionStatus, VideoModel } from '../shared/models/video-model';
import { VideoService } from '../video.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit, OnDestroy {
  videos: VideoModel[] = [];

  subs: Subscription[] = [];

  statuses: { [key: string]: ExtractionStatus } = {};

  constructor(
    private router: Router,
    private videoService: VideoService,
    private ref: ChangeDetectorRef,
    private electron: ElectronService,
  ) {
    this.electron.ipcRenderer.on('error', (event, error: string) => {
      console.log('it died', event, error);
    });
  }

  ngOnDestroy(): void {}

  ngOnInit(): void {
    this.subs.push(
      this.videoService.getVideos().subscribe((videos) => {
        this.videos = videos;
        this.ref.detectChanges();
      }),

      this.videoService.getProgressUpdates().subscribe((statuses) => {
        this.statuses = statuses;
        this.ref.detectChanges();
      }),
    );
  }

  doThing(): void {
    this.videoService.addVideos();
  }

  stringify(a: unknown): string {
    return JSON.stringify(a);
  }

  getPercentage(video: VideoModel): number {
    const status = this.getStatus(video);
    if (!status) return 0;
    return status.percentage;
  }

  stripedProgressBar(video: VideoModel): boolean {
    const status = this.getStatus(video);
    if (!status) return false;

    return !(status.phase.endsWith('DONE') || status.phase.endsWith('ERROR'));
  }

  animated(video: VideoModel): boolean {
    const status = this.getStatus(video);
    if (!status) return false;

    return !(
      status.phase.endsWith('DONE') ||
      status.phase.endsWith('ERROR') ||
      status.phase.endsWith('PENDING')
    );
  }

  getStatus(video: VideoModel): ExtractionStatus | undefined {
    return this.statuses[video.ffprobeData.format.filename];
  }

  getType(video: VideoModel): string {
    const status = this.getStatus(video);
    if (!status) return 'dark';

    const { phase } = status;
    if (phase === 'NOT_STARTED') {
      return 'dark';
    }
    if (phase.startsWith('EXTRACTING_SUBTITLES')) {
      return 'info';
    }
    if (phase.startsWith('EXTRACTING_DIALOG')) {
      return 'primary';
    }
    if (phase.startsWith('ERROR')) {
      return 'danger';
    }
    if (phase === 'DONE') {
      return 'success';
    }
    return 'dark';
  }
}
