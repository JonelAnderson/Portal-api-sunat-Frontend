import { Component, HostListener, inject, OnInit } from '@angular/core';
import { NavBarComponent } from './nav-bar/nav-bar.component';
import { NavigationComponent } from './navigation/navigation.component';
import { RouterModule } from '@angular/router';
import { CommonModule, Location, LocationStrategy } from '@angular/common';
import { GradientAppConfig } from 'src/app/app-gradient-config';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { Footer } from './footer/footer';
import { SessionBootstrapService } from '@shared/service/session-bootstrap.service';

@Component({
  selector: 'app-private-layout',
  imports: [
    NavBarComponent,
    NavigationComponent,
    RouterModule,
    CommonModule,
    BreadcrumbComponent,
    Footer
  ],
  templateUrl: './private-layout.component.html',
  styleUrl: './private-layout.component.scss'
})
export class PrivateLayoutComponent implements OnInit {
  private sessionBootstrap = inject(SessionBootstrapService);
  private location = inject(Location);
  private locationStrategy = inject(LocationStrategy);

  // public props
  gradientConfig;
  navCollapsed: boolean;
  navCollapsedMob: boolean;
  windowWidth: number;
  
  // Mobile app mode for Client role
  isClientRole: boolean = false;
  isMobileView: boolean = false;

  ngOnInit(): void {
    if (this.sessionBootstrap.hasStoredSession()) {
      this.sessionBootstrap.bootstrap().subscribe();
    }
  }

  constructor() {
    this.gradientConfig = GradientAppConfig;
    let current_url = this.location.path();
    const baseHref = this.locationStrategy.getBaseHref();
    if (baseHref) {
      current_url = baseHref + this.location.path();
    }

    this.windowWidth = window.innerWidth;
    this.isMobileView = this.windowWidth < 992;

    if (
      current_url === baseHref + '/layout/collapse-menu' ||
      current_url === baseHref + '/layout/box' ||
      (this.windowWidth >= 992 && this.windowWidth <= 1024)
    ) {
      GradientAppConfig.isCollapse_menu = true;
    }

    this.navCollapsed = this.windowWidth >= 992 ? GradientAppConfig.isCollapse_menu : false;
    this.navCollapsedMob = false;
  }
  




  // Check if should show mobile app layout (Client on mobile)
  get showMobileAppLayout(): boolean {
    return this.isClientRole && this.isMobileView;
  }

  @HostListener('window:resize', ['$event'])
  // eslint-disable-next-line
  onResize(event: any): void {
    this.windowWidth = event.target.innerWidth;
    if (this.windowWidth < 992) {
      GradientAppConfig.layout = 'vertical';
      document.querySelector('.pcoded-navbar')?.classList.add('menupos-static');
      (document.querySelector('#nav-ps-gradient-able') as HTMLElement).style.maxHeight = '100%'; // 100%
      if (document.querySelector('app-navigation.pcoded-navbar')?.classList.contains('navbar-collapsed')) {
        document.querySelector('app-navigation.pcoded-navbar')?.classList.remove('navbar-collapsed');
      }
    }
  }

  // public method
  navMobClick() {
    if (this.windowWidth < 992) {
      if (this.navCollapsedMob && !document.querySelector('app-navigation.pcoded-navbar')?.classList.contains('mob-open')) {
        this.navCollapsedMob = !this.navCollapsedMob;
        setTimeout(() => {
          this.navCollapsedMob = !this.navCollapsedMob;
        }, 100);
      } else {
        this.navCollapsedMob = !this.navCollapsedMob;
      }
    }
  }

  handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closeMenu();
    }
  }

  closeMenu() {
    if (document.querySelector('app-navigation.pcoded-navbar')?.classList.contains('mob-open')) {
      document.querySelector('app-navigation.pcoded-navbar')?.classList.remove('mob-open');
    }
  }

}
