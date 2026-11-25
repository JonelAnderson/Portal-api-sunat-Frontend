// angular import
import { Component, output, Input, HostListener, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

// project import
import { NavLeftComponent } from './nav-left/nav-left.component';
import { NavRightComponent } from './nav-right/nav-right.component';
import { SharedModule } from '@shared/shared.module';
import { GradientAppConfig } from 'src/app/app-gradient-config';

@Component({
  selector: 'app-nav-bar',
  // NavLeftComponent tiene que estar aquí: sin él <app-nav-left> (selector de empresa) no se renderiza.
  imports: [SharedModule, NavLeftComponent, NavRightComponent, RouterModule, CommonModule],
  templateUrl: './nav-bar.component.html',
  styleUrls: ['./nav-bar.component.scss']
})
export class NavBarComponent {
  // public props
  gradientConfig;
  menuClass: boolean;
  collapseStyle: string;
  windowWidth: number;
  
  NavCollapse = output();
  NavCollapsedMob = output();

  // constructor
  constructor() {
    this.gradientConfig = GradientAppConfig;
    this.menuClass = false;
    this.collapseStyle = 'none';
    this.windowWidth = window.innerWidth;
  }
  

  // public method
  toggleMobOption() {
    this.menuClass = !this.menuClass;
    this.collapseStyle = this.menuClass ? 'block' : 'none';
  }

  navCollapse() {
    if (this.windowWidth >= 992) {
      this.NavCollapse.emit();
    }
  }

  navCollapseMob() {
    if (this.windowWidth < 992) {
      this.NavCollapsedMob.emit();
    }
  }
}
