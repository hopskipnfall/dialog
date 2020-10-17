import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ExtractionStatus } from '../shared/models/video-model';
import { VideoService } from '../video.service';
import { VideoFormSelection } from '../wizard/wizard.component';

@Component({
  selector: 'app-video-progress',
  templateUrl: './video-progress.component.html',
  styleUrls: ['./video-progress.component.scss'],
})
export class VideoProgressComponent implements OnInit {
  @Input('formVideo') formVideo: VideoFormSelection;

  subs: Subscription[] = [];

  status?: ExtractionStatus;

  constructor(
    private videoService: VideoService,
    private ref: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.videoService.getProgressUpdates().subscribe((statuses) => {
        // this.statuses = statuses;
        if (!this.formVideo) return; // TODO: Figure out how to set this in the test.
        const s = statuses[this.formVideo.video.ffprobeData.format.filename];
        if (s) {
          this.status = s;
          this.ref.detectChanges();
        }
      }),
    );
  }

  stripedProgressBar(): boolean {
    if (!this.status) return false;

    return !(
      this.status.phase.endsWith('DONE') || this.status.phase.endsWith('ERROR')
    );
  }

  animated(): boolean {
    if (!this.status) return false;

    return !(
      this.status.phase.endsWith('DONE') ||
      this.status.phase.endsWith('ERROR') ||
      this.status.phase.endsWith('PENDING')
    );
  }

  getType(): string {
    if (!this.status) return 'dark';

    const { phase } = this.status;
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
