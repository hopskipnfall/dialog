import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { VideoProgressComponent } from './video-progress.component';

describe('VideoProgressComponent', () => {
  let component: VideoProgressComponent;
  let fixture: ComponentFixture<VideoProgressComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [VideoProgressComponent],
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
