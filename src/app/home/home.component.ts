import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { OpenBrowserRequest } from 'app/shared/ipc/messages';
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

  devConsoleOpen = false;

  constructor(
    private router: Router,
    private videoService: VideoService,
    private ref: ChangeDetectorRef,
    private electron: ElectronService,
  ) {
    this.electron.ipcRenderer.on('error', (event, error: string) => {
      console.log('ERROR REPORTED', event, error);
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

  getStatus(video: VideoModel): ExtractionStatus | undefined {
    return this.statuses[video.ffprobeData.format.filename];
  }

  showDevConsole(): void {
    this.electron.ipcRenderer.send('open-debug-console');
    this.devConsoleOpen = true;
  }

  openGithubPage(): void {
    const request: OpenBrowserRequest = {
      type: 'open-browser-request',
      url: 'https://github.com/hopskipnfall/dialog/releases/tag/latest-stable',
    };
    this.electron.ipcRenderer.send('open-browser-request', request);
  }
}
