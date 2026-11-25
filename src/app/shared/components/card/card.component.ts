// Angular Import
import { CommonModule } from '@angular/common';
import { Component, ContentChild, ElementRef, TemplateRef, input } from '@angular/core';

@Component({
  selector: 'app-card',
  imports: [CommonModule],
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss']
})
export class CardComponent {
  // public props
  cardTitle = input<string>('Card Title');
  cardClass = input<string>();
  blockClass = input<string>();
  headerClass = input<string>();
  hidHeader = input<boolean>(false);
  customHeader = input<boolean>(false);
  customDate = input<boolean>(false);
  CardDate = input<string>();
  isCardFooter = input<boolean>(false);
  footerClass = input<string>();
  @ContentChild('footerTemplate') footerTemplate!: TemplateRef<ElementRef>;
}
