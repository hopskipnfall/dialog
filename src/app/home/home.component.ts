import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { VideoService } from '../video.service';
import { Observable, Subscription } from 'rxjs';
import { VideoModel } from 'app/shared/models/video-model';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  // videos: Observable<VideoModel[]>;
  videos: VideoModel[] = [];
  subs: Subscription[] = [];

  constructor(private router: Router, private videoService: VideoService, private ref: ChangeDetectorRef, private ngZone: NgZone) {
  }
  ngOnDestroy(): void {

  }

  ngOnInit(): void {
    // this.videos = videoService.getVideos();
    this.subs.push(
      this.videoService.getVideos().subscribe(videos => {
        console.log('GETTING NEW VIDEOS NOW');
        // This is really dumb. https://stackoverflow.com/a/51169586/2875073
        // this.ngZone.run(() => {
        //   console.log('why')
        //   this.videos = videos;
        // })
        this.videos = videos;
        this.ref.detectChanges();
      })
    )
  }

  doThing() {
    console.error('hey it\'s doing the thing!');

    this.videoService.addVideos()
  }

  start() {
    this.videoService.start()
  }

  stringify(a: unknown): string {
    return JSON.stringify(a);
  }

  // type Statuses =
  // | 'NOT_STARTED'
  // | 'EXTRACTING_SUBTITLES'
  // | 'EXTRACTING_SUBTITLES_DONE'
  // | 'EXTRACTING_AUDIO'
  // | 'SPLITTING'
  // | 'SPLITTING_DONE'
  // | 'JOINING'
  // | 'DONE';
  getType(video: VideoModel): string {
    const phase = video.status.phase;
    if (phase === 'NOT_STARTED') {
      return 'dark'
    } else if (phase.startsWith('EXTRACTING_SUBTITLES')) {
      return 'info';
    } else if (phase.startsWith('EXTRACTING_AUDIO')) {
      return 'warning';
    } else if (phase.startsWith('SPLITTING')) {
      return 'danger';
    } else if (phase.startsWith('JOINING')) {
      return 'primary';
    } else if (phase === 'DONE') {
      return 'success';
    } else {
      return 'dark';
    }
  }
}
