// Angular Import
import { Component, inject, input, ChangeDetectorRef } from '@angular/core';
import { NavigationEnd, Router, RouterModule, Event } from '@angular/router';
import { Title } from '@angular/platform-browser';

// project import
import { SharedModule } from '../../shared.module';
import { NavigationItem } from '@shared/models/navigation-item.interface';
import { MenuNavService } from '@shared/service/menu-nav.service';

interface titleType {
  // eslint-disable-next-line
  url: string | boolean | any | undefined;
  title: string;
  breadcrumbs: unknown;
  type: string;
}

@Component({
  selector: 'app-breadcrumb',
  imports: [RouterModule, SharedModule],
  templateUrl: './breadcrumb.component.html',
  styleUrls: ['./breadcrumb.component.scss']
})
export class BreadcrumbComponent {
  private route = inject(Router);
  private menuService = inject(MenuNavService);
  private titleService = inject(Title);
  private cd = inject(ChangeDetectorRef);

  // public props
  type = input<string>('theme2');
  navigations: NavigationItem[];
  breadcrumbList: Array<string> = [];
  navigationList!: titleType[];

  // constructor
  constructor() {
    this.menuService.navigation$.subscribe((navs) => {
      this.navigations = navs;
      this.updateBreadcrumb();
    });
    this.setBreadcrumb();
  }

  // public method
  setBreadcrumb() {
    this.route.events.subscribe((router: Event) => {
      if (router instanceof NavigationEnd) {
        this.updateBreadcrumb();
      }
    });
  }

  updateBreadcrumb() {
    const activeLink = this.route.url;
    if (this.navigations && this.navigations.length > 0) {
      const breadcrumbList = this.filterNavigation(this.navigations, activeLink);
      this.navigationList = breadcrumbList;
      const title = breadcrumbList[breadcrumbList.length - 1]?.title || 'Welcome';
      this.titleService.setTitle(title + ' | DS.ERP');
      this.cd.markForCheck();
    }
  }

  filterNavigation(navItems: NavigationItem[], activeLink: string): titleType[] {
    for (const navItem of navItems) {
      if (navItem.type === 'item' && 'url' in navItem && navItem.url === activeLink) {
        return [
          {
            url: 'url' in navItem ? navItem.url : false,
            title: navItem.title,
            breadcrumbs: 'breadcrumbs' in navItem ? navItem.breadcrumbs : true,
            type: navItem.type
          }
        ];
      }
      if ((navItem.type === 'group' || navItem.type === 'collapse') && 'children' in navItem) {
        const breadcrumbList = this.filterNavigation(navItem.children!, activeLink);
        if (breadcrumbList.length > 0) {
          breadcrumbList.unshift({
            url: 'url' in navItem ? navItem.url : false,
            title: navItem.title,
            breadcrumbs: 'breadcrumbs' in navItem ? navItem.breadcrumbs : true,
            type: navItem.type
          });
          return breadcrumbList;
        }
      }
    }
    return [];
  }
}
