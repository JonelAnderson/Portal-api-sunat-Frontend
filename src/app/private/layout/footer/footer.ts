// Angular import
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// project import

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.scss'
})
export class Footer {
  readonly year = new Date().getFullYear();
}
