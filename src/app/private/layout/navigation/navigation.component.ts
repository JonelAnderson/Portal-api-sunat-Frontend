// Angular Import
import { Component, output } from '@angular/core';

// project import
import { NavContentComponent } from './nav-content/nav-content.component';
import { SharedModule } from '@shared/shared.module';
import { GradientAppConfig } from 'src/app/app-gradient-config';

@Component({
  selector: 'app-navigation',
  imports: [SharedModule, NavContentComponent],
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent {
  // public props
  windowWidth: number;
  gradientConfig;
  NavMobCollapse = output();
  NavCollapsedMob = output();

  // constructor
  constructor() {
    this.gradientConfig = GradientAppConfig;
    this.windowWidth = window.innerWidth;
  }

  // public method
  navMobCollapse() {
    if (this.windowWidth < 992) {
      this.NavMobCollapse.emit();
      this.NavCollapsedMob.emit();
    }
  }
}
