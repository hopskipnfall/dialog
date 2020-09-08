import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ElectronService } from 'app/core/services';
import { VideoService } from 'app/video.service';
import { first } from 'rxjs/operators'
import { VideoModel } from 'app/shared/models/video-model';

@Component({
  selector: 'app-wizard',
  templateUrl: './wizard.component.html',
  styleUrls: ['./wizard.component.scss']
})
export class WizardComponent implements OnInit {
  videos: VideoModel[] = [];

  isLinear = false;
  firstFormGroup: FormGroup;
  secondFormGroup: FormGroup;

  constructor(
    private _formBuilder: FormBuilder,
    private videoService: VideoService,
    // private ref: ChangeDetectorRef,
    private electron: ElectronService,
  ) { }

  ngOnInit(): void {
    this.videos = this.videoService.getCurrentVideos();
    

    this.firstFormGroup = this._formBuilder.group({
      firstCtrl: ['', Validators.required]
    });
    this.secondFormGroup = this._formBuilder.group({
      secondCtrl: ['', Validators.required]
    });
  }
}
