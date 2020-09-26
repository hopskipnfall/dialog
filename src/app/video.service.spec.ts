import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { VideoService } from './video.service';

describe('VideoService', () => {
  let service: VideoService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [{ provide: Router, useValue: {} }] });
    service = TestBed.inject(VideoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
