import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { ElectronService } from '../core/services';
import { VideoModel } from '../shared/models/video-model';
import { VideoService } from '../video.service';
import * as ffmpeg from 'fluent-ffmpeg';
import * as moment from 'moment';

type VideoFormSelection = {
  video: VideoModel
  subtitleStream?: ffmpeg.FfprobeStream
  audioStream: ffmpeg.FfprobeStream
  ignoreIntervals: { start: number, end: number }[]
};

type ChapterSummary = {
  title: string
  medianStart: string
  medianEnd: string
  count: number
};

@Component({
  selector: 'app-wizard',
  templateUrl: './wizard.component.html',
  styleUrls: ['./wizard.component.scss']
})
export class WizardComponent implements OnInit {
  formVideos: VideoFormSelection[] = [];
  chapterSummaries: ChapterSummary[] = [];
  ignoredChapterTitles: string[] = [];

  isLinear = false;
  firstFormGroup: FormGroup;
  secondFormGroup: FormGroup;

  // Whether user can go back and make changes in the stepper.
  editable = true;

  constructor(
    private videoService: VideoService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    const videos = this.videoService.getCurrentVideos();
    console.log('videos', videos);

    if (videos.length === 0) {
      this.router.navigateByUrl('/');
      return;
    }

    this.formVideos = videos.map(video => this.initialOptions(video));

    const titles: string[] = [];
    const startTimes = {};
    const endTimes = {};
    const counts = {}
    for (const video of this.formVideos) {
      console.log(video.video.ffprobeData);
      for (const chapter of video.video.ffprobeData.chapters) {
        const title = chapter['TAG:title']
        if (title) {
          if (titles.indexOf(title) == -1) titles.push(title);

          if (!counts[title]) counts[title] = 0;
          if (!startTimes[title]) startTimes[title] = [];
          if (!endTimes[title]) endTimes[title] = [];
          counts[title]++;
          startTimes[title].push(chapter.start_time);
          endTimes[title].push(chapter.end_time);
        }
      }
    }

    this.chapterSummaries = titles.map(title => {
      const start = moment.duration(this.median(startTimes[title]), 'seconds');
      const end = moment.duration(this.median(endTimes[title]), 'seconds');
      return {
        title,
        medianStart: this.humanize(start),
        medianEnd: this.humanize(end),
        count: counts[title],
      };
    }).sort((a, b) => (a.medianStart > b.medianStart) ? 1 : ((b.medianStart > a.medianStart) ? -1 : 0));
  }

  extract(): void {
    this.editable = false;

    this.videoService.queueExtraction(
      this.formVideos.map(formVideo => ({
        video: formVideo.video,
        audioStream: formVideo.audioStream,
        subtitleStream: formVideo.subtitleStream,
        ignoredChapters: this.ignoredChapterTitles,
      })));
  }

  private humanize(duration: moment.Duration) {
    return `${duration.hours()}:${`${duration.minutes()}`.padStart(2, '0')}:${`${duration.seconds()}`.padStart(2, '0')}`
  }

  private median(values: number[]): number {
    if (values.length === 0) {
      throw Error('No entries to sort!');
    }

    const sorted = [...values].sort(function (a, b) {
      return a - b;
    });

    const half = Math.floor(sorted.length / 2);
    if (sorted.length % 2) {
      return sorted[half];
    }
    return (sorted[half - 1] + sorted[half]) / 2.0;
  }

  private initialOptions(video: VideoModel): VideoFormSelection {
    // TODO: Validate this.
    return {
      video,
      subtitleStream: this.getSubtitleTracks(video)[0],
      audioStream: this.getAudioTracks(video)[0],
      ignoreIntervals: [],
    };
  }

  isIgnoredChapter(chapter: ChapterSummary): boolean {
    return this.ignoredChapterTitles.indexOf(chapter.title) != -1;
  }

  chapterClicked(chapter: ChapterSummary): void {
    if (this.isIgnoredChapter(chapter)) {
      this.ignoredChapterTitles.splice(this.ignoredChapterTitles.indexOf(chapter.title), 1);
    } else {
      this.ignoredChapterTitles.push(chapter.title);
    }
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
    const name: string =
      stream.tags && stream.tags.language
        ? stream.tags.title
        : 'No title';
    const language: string =
      stream.tags && stream.tags.language
        ? stream.tags.language
        : 'No title';
    return `${name || 'No title'} (${language || 'No language'})`;
  }
}
