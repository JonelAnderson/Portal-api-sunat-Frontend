// Angular Import
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BidiModule } from '@angular/cdk/bidi';

// project import
import { CardComponent } from './components/card/card.component';
// third party
import { NgScrollbarModule } from 'ngx-scrollbar';
import { TranslateDirective, TranslatePipe } from '@ngx-translate/core';

// bootstrap import
import {
  NgbDropdownModule,
  NgbNavModule,
  NgbTooltipModule,
  NgbModule,
  NgbAccordionModule,
  NgbCollapseModule,
  NgbDatepickerModule,
  NgbProgressbarModule
} from '@ng-bootstrap/ng-bootstrap';
import { MaterialModule } from './import-modules/material.module';
import { LayoutModule } from '@angular/cdk/layout';
import { NgxSpinnerModule } from 'ngx-spinner';

const bootstrap = [
  NgbDropdownModule,
  NgbNavModule,
  NgbTooltipModule,
  NgbModule,
  NgbAccordionModule,
  NgbCollapseModule,
  NgbDatepickerModule,
  NgbProgressbarModule
];


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardComponent,
    NgScrollbarModule,
    bootstrap,
    BidiModule,
    TranslatePipe,
    TranslateDirective,
    MaterialModule,
    LayoutModule,
    NgxSpinnerModule
  ],
  exports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CardComponent,
    NgScrollbarModule,
    NgxSpinnerModule,
    bootstrap,
    TranslatePipe,
    TranslateDirective,
    BidiModule,
    MaterialModule,
    LayoutModule
  ],
  declarations: []
})
export class SharedModule {}
