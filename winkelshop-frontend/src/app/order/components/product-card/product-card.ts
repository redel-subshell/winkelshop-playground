import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import type { Product } from '../../models/shop.models';
import { PriceLabelPipe } from '../../pipes/price-label.pipe';

@Component({
  selector: 'app-product-card',
  imports: [PriceLabelPipe],
  templateUrl: './product-card.html',
  styleUrl: './product-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductCard {
  public readonly product = input.required<Product>();
  public readonly addToCart = output<string>();

  protected readonly initial = computed(() => this.product().name.slice(0, 1).toUpperCase());
}
