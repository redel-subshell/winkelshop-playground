import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of, switchMap, tap } from 'rxjs';

import { AuthStateService } from '../../../auth/services/auth-state.service';
import type { WishlistItem, WishlistResponse } from '../../models/wishlist.models';
import { PriceLabelPipe } from '../../pipes/price-label.pipe';
import { CartApiService } from '../../services/cart-api.service';
import { WishlistApiService } from '../../services/wishlist-api.service';

const EMPTY_WISHLIST_RESPONSE: WishlistResponse = {
  data: {
    items: [],
    currency: 'GALLEON',
    itemCount: 0
  }
};

@Component({
  selector: 'app-wishlist-page',
  imports: [RouterLink, PriceLabelPipe],
  templateUrl: './wishlist-page.html',
  styleUrl: './wishlist-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WishlistPage {
  private readonly wishlistApiService = inject(WishlistApiService);
  private readonly cartApiService = inject(CartApiService);
  private readonly authStateService = inject(AuthStateService);
  protected readonly currentUser = this.authStateService.user;

  private readonly wishlistReloadTick = signal(0);

  protected readonly wishlistErrorMessage = signal<string | null>(null);
  protected readonly wishlistMessage = signal<string | null>(null);
  protected readonly currentlyRemovingItemId = signal<string | null>(null);
  protected readonly currentlyAddingToCartItemId = signal<string | null>(null);

  constructor() {
    this.authStateService.restoreSession();
  }

  private readonly wishlistResource = toSignal(
    toObservable(this.wishlistReloadTick).pipe(
      switchMap(() => this.wishlistApiService.getWishlist()),
      tap(() => this.wishlistErrorMessage.set(null)),
      catchError(() => {
        this.wishlistErrorMessage.set('Wunschliste konnte nicht geladen werden.');
        return of(EMPTY_WISHLIST_RESPONSE);
      })
    ),
    { initialValue: EMPTY_WISHLIST_RESPONSE }
  );

  protected readonly wishlist = computed(() => this.wishlistResource().data);
  protected readonly wishlistItems = computed(() => this.wishlist().items);
  protected readonly hasWishlistItems = computed(() => this.wishlistItems().length > 0);

  protected removeItem(itemId: string): void {
    this.currentlyRemovingItemId.set(itemId);
    this.wishlistMessage.set(null);

    this.wishlistApiService.removeWishlistItem(itemId).subscribe({
      next: () => {
        this.currentlyRemovingItemId.set(null);
        this.refreshWishlist();
        this.wishlistMessage.set('Artikel wurde von der Wunschliste entfernt.');
      },
      error: () => {
        this.currentlyRemovingItemId.set(null);
        this.wishlistMessage.set('Artikel konnte nicht entfernt werden.');
      }
    });
  }

  protected addToCart(item: WishlistItem): void {
    this.currentlyAddingToCartItemId.set(item.itemId);
    this.wishlistMessage.set(null);

    this.cartApiService.addCartItem({ productId: item.productId, quantity: 1 }).subscribe({
      next: () => {
        this.currentlyAddingToCartItemId.set(null);
        this.wishlistMessage.set(`${item.name} wurde in den Warenkorb gelegt.`);
      },
      error: () => {
        this.currentlyAddingToCartItemId.set(null);
        this.wishlistMessage.set(`${item.name} konnte nicht in den Warenkorb gelegt werden.`);
      }
    });
  }

  protected logout(): void {
    this.authStateService.logout().subscribe();
  }

  private refreshWishlist(): void {
    this.wishlistReloadTick.update((value) => value + 1);
  }
}
