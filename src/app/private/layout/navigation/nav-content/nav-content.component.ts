// angular import
import { AfterViewInit, Component, ElementRef, OnInit, effect, inject, output, viewChild, ChangeDetectorRef } from '@angular/core';
import { Location, LocationStrategy } from '@angular/common';

// project import
import { environment } from 'src/environments/environment';
import { NavGroupComponent } from './nav-group/nav-group.component';

//service
import { SharedModule } from '@shared/shared.module';
import { GradientAppConfig } from 'src/app/app-gradient-config';

import { MenuNavService } from '@shared/service/menu-nav.service';
import { ThemeService } from '@shared/service/customs-theme.service';
import { NavigationItem } from '@shared/models/navigation-item.interface';
import { ScrollbarComponent } from '@shared/components/scrollbar/scrollbar.component';

// ...

@Component({
  selector: 'app-nav-content',
  imports: [SharedModule, NavGroupComponent,ScrollbarComponent],
  templateUrl: './nav-content.component.html',
  styleUrls: ['./nav-content.component.scss']
})
export class NavContentComponent implements OnInit, AfterViewInit {
  private location = inject(Location);
  private menuService = inject(MenuNavService);
  private locationStrategy = inject(LocationStrategy);
  themeService = inject(ThemeService);
  private cd = inject(ChangeDetectorRef);

  // version
  title = 'Demo application for version numbering';
  currentApplicationVersion = environment.appVersion;

  // public pops
  gradientConfig;
  navigations: NavigationItem[];
  prevDisabled: string;
  nextDisabled: string;
  contentWidth: number;
  wrapperWidth!: number;
  scrollWidth: number;
  windowWidth: number;
  direction = 'ltr';

  NavMobCollapse = output();

  navbarContent = viewChild.required<ElementRef>('navbarContent');
  navbarWrapper = viewChild.required<ElementRef>('navbarWrapper');

  userRoles: string[] = [];

  // constructor
  constructor() {
    this.gradientConfig = GradientAppConfig;
    this.navigations = [];
    this.windowWidth = window.innerWidth;
    this.prevDisabled = 'disabled';
    this.nextDisabled = '';
    this.scrollWidth = 0;
    this.contentWidth = 0;
    effect(() => {
      this.direction = this.themeService.isRtlTheme() ? 'rtl' : 'ltr';
    });
  }

  // life cycle event
  ngOnInit() {
    if (this.windowWidth < 992) {
      GradientAppConfig.layout = 'vertical';
      setTimeout(() => {
        document.querySelector('.pcoded-navbar')?.classList.add('menupos-static');
        (document.querySelector('#nav-ps-gradient-able') as HTMLElement).style.height = '100%';
      }, 500);
    }

    // Subscribe to permissions (triggered on login/refresh) to load dynamic menu
    // Subscribe to navigation stream (backed by localstorage/service)
    this.menuService.navigation$.subscribe(navs => {
      setTimeout(() => {
        this.navigations = navs;
        this.cd.markForCheck();
      });
    });
  }
  
  ngAfterViewInit() {
    if (GradientAppConfig.layout === 'horizontal') {
      this.contentWidth = this.navbarContent().nativeElement.clientWidth;
      this.wrapperWidth = this.navbarWrapper().nativeElement.clientWidth;
      this.cd.detectChanges();
    }
  }

  // public method
  scrollPlus() {
    this.scrollWidth = this.scrollWidth + (this.wrapperWidth - 100);
    if (this.scrollWidth > this.contentWidth - this.wrapperWidth) {
      this.scrollWidth = this.contentWidth - this.wrapperWidth + 100;
      this.nextDisabled = 'disabled';
    }
    this.prevDisabled = '';
    if (GradientAppConfig.isRtlLayout) {
      (document.querySelector('#side-nav-horizontal') as HTMLElement).style.marginRight = '-' + this.scrollWidth + 'px';
    } else {
      (document.querySelector('#side-nav-horizontal') as HTMLElement).style.marginLeft = '-' + this.scrollWidth + 'px';
    }
  }

  scrollMinus() {
    this.scrollWidth = this.scrollWidth - this.wrapperWidth;
    if (this.scrollWidth < 0) {
      this.scrollWidth = 0;
      this.prevDisabled = 'disabled';
    }
    this.nextDisabled = '';
    if (GradientAppConfig.isRtlLayout) {
      (document.querySelector('#side-nav-horizontal') as HTMLElement).style.marginRight = '-' + this.scrollWidth + 'px';
    } else {
      (document.querySelector('#side-nav-horizontal') as HTMLElement).style.marginLeft = '-' + this.scrollWidth + 'px';
    }
  }

  fireLeave() {
    const sections = document.querySelectorAll('.pcoded-hasmenu');
    for (let i = 0; i < sections.length; i++) {
      sections[i].classList.remove('active');
      sections[i].classList.remove('pcoded-trigger');
    }

    let current_url = this.location.path();
    const baseHref = this.locationStrategy.getBaseHref();
    if (baseHref) {
      current_url = baseHref + this.location.path();
    }
    const link = "a.nav-link[ href='" + current_url + "' ]";
    const ele = document.querySelector(link);
    if (ele !== null && ele !== undefined) {
      const parent = ele.parentElement;
      const up_parent = parent?.parentElement?.parentElement;
      const last_parent = up_parent?.parentElement;
      if (parent?.classList.contains('pcoded-hasmenu')) {
        parent.classList.add('active');
      } else if (up_parent?.classList.contains('pcoded-hasmenu')) {
        up_parent.classList.add('active');
      } else if (last_parent?.classList.contains('pcoded-hasmenu')) {
        last_parent.classList.add('active');
      }
    }
  }

  navMob() {
    if (this.windowWidth < 992 && document.querySelector('app-navigation.pcoded-navbar')?.classList.contains('mob-open')) {
      this.NavMobCollapse.emit();
    }
  }

  fireOutClick() {
    let current_url = this.location.path();
    const baseHref = this.locationStrategy.getBaseHref();
    if (baseHref) {
      current_url = baseHref + this.location.path();
    }
    const link = "a.nav-link[ href='" + current_url + "' ]";
    const ele = document.querySelector(link);
    if (ele !== null && ele !== undefined) {
      const parent = ele.parentElement;
      const up_parent = parent?.parentElement?.parentElement;
      const last_parent = up_parent?.parentElement;
      if (parent?.classList.contains('pcoded-hasmenu')) {
        if (GradientAppConfig.layout === 'vertical') {
          parent.classList.add('pcoded-trigger');
        }
        parent.classList.add('active');
      } else if (up_parent?.classList.contains('pcoded-hasmenu')) {
        if (GradientAppConfig.layout === 'vertical') {
          up_parent.classList.add('pcoded-trigger');
        }
        up_parent.classList.add('active');
      } else if (last_parent?.classList.contains('pcoded-hasmenu')) {
        if (GradientAppConfig.layout === 'vertical') {
          last_parent.classList.add('pcoded-trigger');
        }
        last_parent.classList.add('active');
      }
    }
  }
}
