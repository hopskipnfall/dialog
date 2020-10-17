import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';
import { VideoService } from '../video.service';
import { VideoProgressComponent } from './video-progress.component';

describe('VideoProgressComponent', () => {
  let component: VideoProgressComponent;
  let fixture: ComponentFixture<VideoProgressComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [VideoProgressComponent],
      providers: [VideoService],
      imports: [TranslateModule.forRoot(), RouterTestingModule],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VideoProgressComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
