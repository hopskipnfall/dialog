import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import {VideoService} from '../video.service';
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

  constructor(private router: Router, private videoService: VideoService, private ref: ChangeDetectorRef) {
  }
  ngOnDestroy(): void {
    
  }

  ngOnInit(): void {
    
    // this.videos = videoService.getVideos();
    this.subs.push(
      this.videoService.getVideos().subscribe(videos => {
        console.log('GETTING NEW VIDEOS NOW');
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
}
