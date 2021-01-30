import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { ElectronService } from 'app/core/services';
import { PickFileRequest, PickFileResponse } from 'app/shared/ipc/messages';
import * as ffmpeg from 'fluent-ffmpeg';
import * as moment from 'moment';
import { VideoModel } from '../shared/models/video-model';
import { sortOnField } from '../shared/sort';
import { VideoService } from '../video.service';

const reverseString = (s: string): string => {
  return s.split('').reverse().join('');
};

export type VideoFormSelection = {
  video: VideoModel;
  subtitleStream?: ffmpeg.FfprobeStream;
  subtitlesOverridePath?: string;
  audioStream: ffmpeg.FfprobeStream;
  ignoreIntervals: { start: number; end: number }[];
  outputOptions: {
    trackNumber: number;
    trackName: string;
    albumName: string;
  };
};

type ChapterSummary = {
  title: string;
  medianStart: string;
  medianEnd: string;
  count: number;
};

function findCommonPrefix(a: string, b: string) {
  let common = '';
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
    if (a[i] === b[i]) {
      common += a[i];
    } else {
      break;
    }
  }
  return common;
}

const guessTrackNumber = (
  filename: string,
  prefix: string,
  suffix: string,
): number => {
  console.log('guessing track number for ', filename, prefix, suffix);
  let stripped = filename.substring(prefix.length);
  stripped = stripped.substring(0, stripped.length - suffix.length);
  const num = stripped.match(/(\d+)/)[0];
  console.log('num', num);
  if (num && !Number.isNaN(Number(num))) {
    return Number(num);
  }
  return 0;
};

type TrackNamingScheme = {
  id: 'album_track' | 'original' | 'custom' | 'strip_common';
  displayName: string;
};

@Component({
  selector: 'app-wizard',
  templateUrl: './wizard.component.html',
  styleUrls: ['./wizard.component.scss'],
})
export class WizardComponent implements OnInit, OnDestroy {
  formVideos: VideoFormSelection[] = [];

  trackOptions: TrackNamingScheme[] = [
    {
      id: 'strip_common',
      displayName: 'Remove prefix/suffix',
    },
    {
      id: 'album_track',
      displayName: 'Album - Track No.',
    },
    {
      id: 'original',
      displayName: 'Filename',
    },
    {
      id: 'custom',
      displayName: 'Custom',
    },
  ];

  trackNameAlg: TrackNamingScheme = this.trackOptions.find(
    (option) => option.id === 'original',
  );

  albumName = '';

  chapterSummaries: ChapterSummary[] = [];

  ignoredChapterTitles: string[] = [];

  isLinear = false;

  firstFormGroup: FormGroup;

  secondFormGroup: FormGroup;

  // Whether user can go back and make changes in the stepper.
  editable = true;

  /** Prefix shared between all video titles. */
  commonPrefix = '';

  /** Suffix shared between all video titles. */
  commonSuffix = '';

  constructor(
    private videoService: VideoService,
    private router: Router,
    private electron: ElectronService,
    private ref: ChangeDetectorRef,
  ) {
    this.electron.ipcRenderer.on(
      'pick-file-response',
      (event, response: PickFileResponse) => {
        console.log('RESPRESP', response);
        if (!response.path) {
          console.log('Nothing to do');
          return;
        }
        const video = this.formVideos.find(
          (v) => v.video.ffprobeData.format.filename === response.token,
        );
        video.subtitlesOverridePath = response.path;
        video.subtitleStream = undefined;
        // Terrible I hate this.
        this.ref.detectChanges();
      },
    );
  }

  ngOnDestroy(): void {
    this.electron.ipcRenderer.removeAllListeners('pick-file-response');
  }

  ngOnInit(): void {
    const videos = this.videoService.getCurrentVideos();
    console.log('videos', videos);

    if (videos.length === 0) {
      this.router.navigateByUrl('/');
      return;
    }

    this.formVideos = videos.map((video) => this.initialOptions(video));

    const titles: string[] = [];
    const startTimes = {};
    const endTimes = {};
    const counts = {};
    for (let i = 0; i < this.formVideos.length; i += 1) {
      const video = this.formVideos[i];
      console.log(video.video.ffprobeData);
      for (let j = 0; j < video.video.ffprobeData.chapters.length; j += 1) {
        const chapter = video.video.ffprobeData.chapters[j];
        const title = chapter['TAG:title'];
        if (title) {
          if (!titles.includes(title)) titles.push(title);

          if (!counts[title]) counts[title] = 0;
          if (!startTimes[title]) startTimes[title] = [];
          if (!endTimes[title]) endTimes[title] = [];
          counts[title] += 1;
          startTimes[title].push(chapter.start_time);
          endTimes[title].push(chapter.end_time);
        }
      }
    }

    const videoTitles = this.formVideos.map((video) => video.video.filename);
    if (videoTitles.length > 1) {
      this.commonPrefix = videoTitles.reduce(findCommonPrefix);
      this.commonSuffix = reverseString(
        videoTitles
          .map((title) => reverseString(title))
          .reduce(findCommonPrefix),
      );
    }
    for (let i = 0; i < this.formVideos.length; i += 1) {
      const video = this.formVideos[i];
      video.outputOptions.trackNumber = guessTrackNumber(
        video.video.filename,
        this.commonPrefix,
        this.commonSuffix,
      );
    }

    this.chapterSummaries = titles.map((title) => {
      const start = moment.duration(this.median(startTimes[title]), 'seconds');
      const end = moment.duration(this.median(endTimes[title]), 'seconds');
      return {
        title,
        medianStart: this.humanize(start),
        medianEnd: this.humanize(end),
        count: counts[title],
      };
    });
    this.chapterSummaries = sortOnField(
      this.chapterSummaries,
      (summary) => summary.medianStart,
    );
  }

  updateTrackTitle(video: VideoFormSelection): void {
    let title = '';

    switch (this.trackNameAlg.id) {
      case 'album_track':
        title = `${this.albumName} - ${video.outputOptions.trackNumber}`;
        break;
      case 'original':
        title = video.video.filename;
        break;
      case 'strip_common':
        title = video.video.filename.substring(this.commonPrefix.length);
        title = title.substring(0, title.length - this.commonSuffix.length);
        break;
      case 'custom':
      default:
        title = '';
    }

    if (title) {
      video.outputOptions.trackName = title;
    }
  }

  updateTrackTitles(): void {
    if (this.trackNameAlg.id === 'custom') return;

    this.formVideos.forEach((v) => {
      this.updateTrackTitle(v);
    });
  }

  extract(): void {
    this.editable = false;

    // Update album name.
    this.formVideos.forEach((v) => {
      v.outputOptions.albumName = this.albumName;
    });

    this.videoService.queueExtraction(
      this.formVideos.map((formVideo) => ({
        video: formVideo.video,
        audioStream: formVideo.audioStream,
        subtitles: {
          subtitleStream: formVideo.subtitleStream,
          subtitlesOverridePath: formVideo.subtitlesOverridePath,
        },
        ignoredChapters: this.ignoredChapterTitles,
        intervals: [],
        finished: false,
        outputOptions: {
          ...formVideo.outputOptions,
        },
      })),
    );
  }

  private humanize(duration: moment.Duration) {
    return `${duration.hours()}:${`${duration.minutes()}`.padStart(
      2,
      '0',
    )}:${`${duration.seconds()}`.padStart(2, '0')}`;
  }

  setAllAlbumTitles(albumName: string) {
    this.formVideos.forEach((formVideo) => {
      formVideo.outputOptions.albumName = albumName;
    });
  }

  private median(values: number[]): number {
    if (values.length === 0) {
      throw new Error('No entries to sort!');
    }

    const sorted = [...values].sort((a, b) => {
      return a - b;
    });

    const half = Math.floor(sorted.length / 2);
    if (sorted.length % 2) {
      return sorted[half];
    }
    return (sorted[half - 1] + sorted[half]) / 2;
  }

  private initialOptions(video: VideoModel): VideoFormSelection {
    // TODO: Validate this.
    return {
      video,
      subtitleStream: this.getSubtitleTracks(video)[0],
      audioStream: this.getAudioTracks(video)[0],
      ignoreIntervals: [],
      outputOptions: {
        trackNumber: 0,
        trackName: video.filename,
        albumName: '',
      },
    };
  }

  isIgnoredChapter(chapter: ChapterSummary): boolean {
    return this.ignoredChapterTitles.includes(chapter.title);
  }

  chapterClicked(chapter: ChapterSummary): void {
    if (this.isIgnoredChapter(chapter)) {
      this.ignoredChapterTitles.splice(
        this.ignoredChapterTitles.indexOf(chapter.title),
        1,
      );
    } else {
      this.ignoredChapterTitles.push(chapter.title);
    }
  }

  getAudioTracks(video: VideoModel): ffmpeg.FfprobeStream[] {
    return video.ffprobeData.streams.filter(
      (stream) => stream.codec_type === 'audio',
    );
  }

  getSubtitleTracks(video: VideoModel): ffmpeg.FfprobeStream[] {
    return video.ffprobeData.streams.filter(
      (stream) => stream.codec_type === 'subtitle',
    );
  }

  getName(stream?: ffmpeg.FfprobeStream): string {
    if (!stream) {
      return 'Do not use subtitles';
    }
    const name: string =
      stream.tags && stream.tags.language ? stream.tags.title : 'No title';
    const language: string =
      stream.tags && stream.tags.language ? stream.tags.language : 'No title';
    return `${name || 'No title'} (${language || 'No language'})`;
  }

  pickSubtitleFile(formVideo: VideoFormSelection) {
    const request: PickFileRequest = {
      type: 'pick-file',
      token: formVideo.video.ffprobeData.format.filename,
    };
    console.log('picking file!!!');
    this.electron.ipcRenderer.send('pick-file', request);
  }
}
