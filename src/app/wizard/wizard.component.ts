import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ElectronService } from 'app/core/services';
import { VideoService } from 'app/video.service';
import { first } from 'rxjs/operators'
import * as ffmpeg from 'fluent-ffmpeg';
import { VideoModel } from 'app/shared/models/video-model';
import { Router } from '@angular/router';

type VideoFormSelection = {
  video: VideoModel
  subtitleStream?: ffmpeg.FfprobeStream
  audioStream: ffmpeg.FfprobeStream
}

@Component({
  selector: 'app-wizard',
  templateUrl: './wizard.component.html',
  styleUrls: ['./wizard.component.scss']
})
export class WizardComponent implements OnInit {
  formVideos: VideoFormSelection[] = [];

  isLinear = false;
  firstFormGroup: FormGroup;
  secondFormGroup: FormGroup;

  constructor(
    private _formBuilder: FormBuilder,
    private videoService: VideoService,
    // private ref: ChangeDetectorRef,
    private electron: ElectronService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    const videos = this.videoService.getCurrentVideos();

    if (videos.length === 0) {
      this.router.navigateByUrl('/');
      return;
    }

    this.formVideos = videos.map(video => this.initialOptions(video))
  }

  private initialOptions(video: VideoModel): VideoFormSelection {
    return {
      video,
      subtitleStream: this.getSubtitleTracks(video)[0],
      audioStream: this.getAudioTracks(video)[0],
    };
  }

  getAudioTracks(video: VideoModel): ffmpeg.FfprobeStream[] {
    return video.ffprobeData.streams
      .filter(stream => stream.codec_type == 'audio');
  }

  getSubtitleTracks(video: VideoModel): ffmpeg.FfprobeStream[] {
    return video.ffprobeData.streams
      .filter(stream => stream.codec_type == 'subtitle');
  }

  getName(stream: ffmpeg.FfprobeStream): string {
    const name = stream.tags && stream.tags.language ? stream.tags.language : 'No title';
    return `${name} (${stream.codec_long_name})`
  }
}
