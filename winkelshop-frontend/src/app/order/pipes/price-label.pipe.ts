import { Pipe, PipeTransform } from '@angular/core';

const PRICE_FORMATTER = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

@Pipe({
  name: 'priceLabel'
})
export class PriceLabelPipe implements PipeTransform {
  public transform(price: number, currency: string): string {
    return `${PRICE_FORMATTER.format(price)} ${currencyLabel(currency)}`;
  }
}

function currencyLabel(currency: string): string {
  if (currency === 'GALLEON') {
    return '🪙 GALLEON';
  }

  return currency;
}
