import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, of, switchMap, tap } from 'rxjs';

import { AuthStateService } from '../../../auth/services/auth-state.service';
import type { CartItem, CartResponse } from '../../models/cart.models';
import type { CheckoutResponse } from '../../models/checkout.models';
import { PriceLabelPipe } from '../../pipes/price-label.pipe';
import { CartApiService } from '../../services/cart-api.service';
import { CheckoutApiService } from '../../services/checkout-api.service';

interface ShippingAddressFormModel {
  fullName: FormControl<string>;
  street: FormControl<string>;
  city: FormControl<string>;
  postalCode: FormControl<string>;
  country: FormControl<string>;
}

interface CheckoutFormModel {
  paymentMethod: FormControl<string>;
  shippingAddress: FormGroup<ShippingAddressFormModel>;
}

const EMPTY_CART_RESPONSE: CartResponse = {
  data: {
    items: [],
    currency: 'GALLEON',
    totalPrice: 0
  }
};

@Component({
  selector: 'app-checkout-page',
  imports: [ReactiveFormsModule, RouterLink, PriceLabelPipe],
  templateUrl: './checkout-page.html',
  styleUrl: './checkout-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CheckoutPage {
  private readonly cartApiService = inject(CartApiService);
  private readonly checkoutApiService = inject(CheckoutApiService);
  private readonly authStateService = inject(AuthStateService);
  protected readonly currentUser = this.authStateService.user;

  private readonly checkoutResultHeading = viewChild<ElementRef<HTMLHeadingElement>>('checkoutResultHeading');

  private readonly cartReloadTick = signal(0);
  private readonly quantityDrafts = signal<Record<string, string>>({});

  protected readonly cartErrorMessage = signal<string | null>(null);
  protected readonly cartMessage = signal<string | null>(null);
  protected readonly checkoutErrorMessage = signal<string | null>(null);
  protected readonly checkoutResult = signal<CheckoutResponse['data'] | null>(null);
  protected readonly currentlyUpdatingItemId = signal<string | null>(null);
  protected readonly currentlyRemovingItemId = signal<string | null>(null);
  protected readonly isSubmittingCheckout = signal(false);

  protected readonly checkoutForm = new FormGroup<CheckoutFormModel>({
    paymentMethod: new FormControl('credit-card', {
      nonNullable: true,
      validators: [Validators.required]
    }),
    shippingAddress: new FormGroup<ShippingAddressFormModel>({
      fullName: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(2)]
      }),
      street: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(2)]
      }),
      city: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(2)]
      }),
      postalCode: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(2)]
      }),
      country: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(2)]
      })
    })
  });

  constructor() {
    this.authStateService.restoreSession();
  }

  private readonly cartResource = toSignal(
    toObservable(this.cartReloadTick).pipe(
      switchMap(() => this.cartApiService.getCart()),
      tap((response) => {
        this.cartErrorMessage.set(null);
        this.pruneQuantityDrafts(response.data.items);
      }),
      catchError(() => {
        this.cartErrorMessage.set('Warenkorb konnte nicht geladen werden.');
        return of(EMPTY_CART_RESPONSE);
      })
    ),
    { initialValue: EMPTY_CART_RESPONSE }
  );

  protected readonly cart = computed(() => this.cartResource().data);
  protected readonly cartItems = computed(() => this.cart().items);
  protected readonly hasCartItems = computed(() => this.cartItems().length > 0);

  protected readonly shippingAddressForm = computed(() => this.checkoutForm.controls.shippingAddress);

  protected readonly fieldErrors = computed(() => {
    const controls = this.checkoutForm.controls.shippingAddress.controls;
    const fieldNames = Object.keys(controls) as (keyof ShippingAddressFormModel)[];

    return Object.fromEntries(
      fieldNames.map((fieldName) => [fieldName, this.hasFieldError(controls[fieldName])])
    ) as Record<keyof ShippingAddressFormModel, boolean>;
  });

  protected updateItemQuantity(item: CartItem): void {
    const draftQuantity = this.quantityDrafts()[item.itemId];
    if (draftQuantity === undefined) {
      this.cartMessage.set('Bitte gib eine neue Menge ein.');
      return;
    }

    const parsedQuantity = this.parseQuantity(draftQuantity);
    if (parsedQuantity === null) {
      this.cartMessage.set('Die Menge muss eine ganze Zahl groesser als 0 sein.');
      return;
    }

    if (parsedQuantity === item.quantity) {
      this.cartMessage.set('Menge bleibt unveraendert.');
      return;
    }

    this.currentlyUpdatingItemId.set(item.itemId);
    this.cartMessage.set(null);
    this.checkoutResult.set(null);

    this.cartApiService.updateCartItem(item.itemId, { quantity: parsedQuantity }).subscribe({
      next: () => {
        this.currentlyUpdatingItemId.set(null);
        this.refreshCart();
        this.quantityDrafts.update((current) => {
          const { [item.itemId]: _removed, ...remaining } = current;
          return remaining;
        });
        this.cartMessage.set('Menge wurde aktualisiert.');
      },
      error: () => {
        this.currentlyUpdatingItemId.set(null);
        this.cartMessage.set('Menge konnte nicht aktualisiert werden.');
      }
    });
  }

  protected removeItem(itemId: string): void {
    this.currentlyRemovingItemId.set(itemId);
    this.cartMessage.set(null);
    this.checkoutResult.set(null);

    this.cartApiService.removeCartItem(itemId).subscribe({
      next: () => {
        this.currentlyRemovingItemId.set(null);
        this.refreshCart();
        this.quantityDrafts.update((current) => {
          const { [itemId]: _removed, ...remaining } = current;
          return remaining;
        });
        this.cartMessage.set('Artikel wurde entfernt.');
      },
      error: () => {
        this.currentlyRemovingItemId.set(null);
        this.cartMessage.set('Artikel konnte nicht entfernt werden.');
      }
    });
  }

  protected onQuantityInput(itemId: string, event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    this.quantityDrafts.update((current) => ({
      ...current,
      [itemId]: target.value
    }));
  }

  protected quantityInputValue(itemId: string, currentQuantity: number): string {
    return this.quantityDrafts()[itemId] ?? String(currentQuantity);
  }

  protected submitCheckout(): void {
    if (!this.hasCartItems()) {
      this.checkoutErrorMessage.set('Dein Warenkorb ist leer.');
      return;
    }

    if (this.checkoutForm.invalid) {
      this.checkoutForm.markAllAsTouched();
      return;
    }

    this.isSubmittingCheckout.set(true);
    this.checkoutErrorMessage.set(null);
    this.cartMessage.set(null);
    this.checkoutResult.set(null);

    const { paymentMethod, shippingAddress } = this.checkoutForm.getRawValue();

    this.checkoutApiService
      .checkout({
        paymentMethod,
        shippingAddress
      })
      .subscribe({
        next: (response) => {
          this.isSubmittingCheckout.set(false);
          this.checkoutResult.set(response.data);
          this.refreshCart();
          queueMicrotask(() => this.checkoutResultHeading()?.nativeElement.focus());
        },
        error: () => {
          this.isSubmittingCheckout.set(false);
          this.checkoutErrorMessage.set('Checkout ist fehlgeschlagen. Bitte pruefe deine Angaben.');
        }
      });
  }

  protected logout(): void {
    this.authStateService.logout().subscribe();
  }

  protected itemSubtotal(item: CartItem): number {
    return item.quantity * item.unitPrice;
  }

  private hasFieldError(field: FormControl<string>): boolean {
    return field.invalid && (field.dirty || field.touched);
  }

  private parseQuantity(value: string): number | null {
    if (!/^\d+$/.test(value)) {
      return null;
    }

    const parsed = Number.parseInt(value, 10);
    if (!Number.isInteger(parsed) || parsed < 1) {
      return null;
    }

    return parsed;
  }

  private refreshCart(): void {
    this.cartReloadTick.update((value) => value + 1);
  }

  private pruneQuantityDrafts(items: CartItem[]): void {
    const validItemIds = new Set(items.map((item) => item.itemId));

    this.quantityDrafts.update((current) => {
      const filtered = Object.entries(current).filter(([itemId]) => validItemIds.has(itemId));
      return Object.fromEntries(filtered);
    });
  }
}
