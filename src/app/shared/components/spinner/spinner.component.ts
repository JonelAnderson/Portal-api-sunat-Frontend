import { Component, OnDestroy, OnInit, ViewEncapsulation, inject, input } from '@angular/core';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';

// project import
import { Spinkit } from './spinkits';

@Component({
  selector: 'app-spinner',
  templateUrl: './spinner.component.html',
  styleUrls: ['./spinner.component.scss', './spinkit-css/sk-line-material.scss'],
  encapsulation: ViewEncapsulation.None
})
export class SpinnerComponent implements OnInit, OnDestroy {
  private router = inject(Router);

  // public props - must start hidden or full-screen #http-loader blocks all clicks
  isSpinnerVisible = false;
  Spinkit = Spinkit;
  backgroundColor = input<string>('#2689E2');
  spinner = input(Spinkit.skLine);

  ngOnInit(): void {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.isSpinnerVisible = true;
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.isSpinnerVisible = false;
      }
    });
  }

  // life cycle event
  ngOnDestroy(): void {
    this.isSpinnerVisible = false;
  }
}
