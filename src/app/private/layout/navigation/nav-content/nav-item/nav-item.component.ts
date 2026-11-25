// angular import
import { Component, inject, input, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { RouterModule } from '@angular/router';

// project import
import { SharedModule } from '@shared/shared.module';
import { GradientAppConfig } from 'src/app/app-gradient-config';
import { NavigationItem } from '@shared/models/navigation-item.interface';

// service

@Component({
  selector: 'app-nav-item',
  imports: [SharedModule, RouterModule],
  templateUrl: './nav-item.component.html',
  styleUrls: ['./nav-item.component.scss']
})
export class NavItemComponent implements OnInit {
  private location = inject(Location);

  // public props
  item = input<NavigationItem>();
  parentRole = input<string[]>();
  themeLayout: string;
  isEnabled: boolean = false;
  // constructor
  constructor() {
    this.themeLayout = GradientAppConfig.layout;
  }

  ngOnInit() {

  }

  // public method
  closeOtherMenu(event: MouseEvent) {
    if (GradientAppConfig.layout === 'vertical') {
      // Keep open every group (and subgroup) that contains the clicked item; close the others.
      // closest() instead of counting parentElement levels: the <app-nav-item>/<app-nav-collapse> hosts and
      // clicking the icon vs the text change the depth, which used to close the current group too.
      const link = (event.target as HTMLElement | null)?.closest('a.nav-link');
      const chain: Element[] = [];
      let group = link?.closest('li.pcoded-hasmenu') ?? null;
      while (group) {
        chain.push(group);
        group = group.parentElement?.closest('li.pcoded-hasmenu') ?? null;
      }
      document.querySelectorAll('.pcoded-hasmenu').forEach((section) => {
        if (!chain.includes(section)) section.classList.remove('active', 'pcoded-trigger');
      });
      chain.forEach((section) => section.classList.add('active', 'pcoded-trigger'));
      if (document.querySelector('app-navigation.pcoded-navbar')?.classList.contains('mob-open')) {
        document.querySelector('app-navigation.pcoded-navbar')?.classList.remove('mob-open');
      }
    } else {
      setTimeout(() => {
        const sections = document.querySelectorAll('.pcoded-hasmenu');
        for (let i = 0; i < sections.length; i++) {
          sections[i].classList.remove('active');
          sections[i].classList.remove('pcoded-trigger');
        }
        let current_url = this.location.path();
        // eslint-disable-next-line
        //@ts-ignore
        if (this.location['_baseHref']) {
          // eslint-disable-next-line
          //@ts-ignore
          current_url = this.location['_baseHref'] + this.location.path();
        }
        const link = "a.nav-link[ href='" + current_url + "' ]";
        const ele = document.querySelector(link);
        if (ele !== null && ele !== undefined) {
          const parent = ele.parentElement;
          const up_parent = parent?.parentElement?.parentElement;
          const pre_parent = up_parent?.parentElement;
          const last_parent = up_parent?.parentElement?.parentElement?.parentElement?.parentElement;
          if (parent?.classList.contains('pcoded-hasmenu')) {
            parent.classList.add('active');
          } else if (up_parent?.classList.contains('pcoded-hasmenu')) {
            up_parent.classList.add('active');
          } else if (pre_parent?.classList.contains('pcoded-hasmenu')) {
            pre_parent.classList.add('active');
          } else if (last_parent?.classList.contains('pcoded-hasmenu')) {
            last_parent.classList.add('active');
          }
        }
      }, 500);
    }
  }
}
