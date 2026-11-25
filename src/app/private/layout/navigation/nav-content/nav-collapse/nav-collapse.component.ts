// angular import
import { Component, inject, input, OnInit } from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

// project import
import { NavItemComponent } from '../nav-item/nav-item.component';

import { SharedModule } from '@shared/shared.module';
import { GradientAppConfig } from 'src/app/app-gradient-config';
import { NavigationItem } from '@shared/models/navigation-item.interface';

@Component({
  selector: 'app-nav-collapse',
  imports: [SharedModule, NavItemComponent, RouterModule, CommonModule],
  templateUrl: './nav-collapse.component.html',
  styleUrls: ['./nav-collapse.component.scss'],
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateY(-100%)', display: 'block' }),
        animate('250ms ease-in', style({ transform: 'translateY(0%)' }))
      ]),
      transition(':leave', [animate('250ms ease-in', style({ transform: 'translateY(-100%)' }))])
    ])
  ]
})
export class NavCollapseComponent implements OnInit {

  // public props
  visible;
  item = input.required<NavigationItem>();
  parentRole = input<string[]>();
  gradientConfig;
  themeLayout: string;
  isEnabled: boolean = false;

  // constructor
  constructor() {
    this.visible = false;
    this.gradientConfig = GradientAppConfig;
    this.themeLayout = GradientAppConfig.layout;
  }

  ngOnInit() {
  }

  // public method
  navCollapse(e: MouseEvent) {
    this.visible = !this.visible;
    let parent = e.target as HTMLElement;

    if (parent?.tagName === 'SPAN') {
      parent = parent.parentElement!;
    }

    if (this.themeLayout === 'vertical') {
      parent = (parent as HTMLElement).parentElement as HTMLElement;
    }

    const sections = document.querySelectorAll('.pcoded-hasmenu');
    for (let i = 0; i < sections.length; i++) {
      if (sections[i] !== parent) {
        sections[i].classList.remove('pcoded-trigger');
      }
    }

    let first_parent = parent.parentElement;
    let pre_parent = ((parent as HTMLElement).parentElement as HTMLElement).parentElement as HTMLElement;
    if (first_parent?.classList.contains('pcoded-hasmenu')) {
      do {
        first_parent.classList.add('pcoded-trigger');
        first_parent = ((first_parent as HTMLElement).parentElement as HTMLElement).parentElement as HTMLElement;
      } while (first_parent.classList.contains('pcoded-hasmenu'));
    } else if (pre_parent.classList.contains('pcoded-submenu')) {
      do {
        pre_parent?.parentElement?.classList.add('pcoded-trigger');
        pre_parent = (((pre_parent as HTMLElement).parentElement as HTMLElement).parentElement as HTMLElement).parentElement as HTMLElement;
      } while (pre_parent.classList.contains('pcoded-submenu'));
    }
    parent.classList.toggle('pcoded-trigger');
  }
}
