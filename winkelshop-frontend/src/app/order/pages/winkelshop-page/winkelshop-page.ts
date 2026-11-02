import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, distinctUntilChanged, map, of, switchMap, tap } from 'rxjs';

import { AuthStateService } from '../../../auth/services/auth-state.service';
import { ProductCard } from '../../components/product-card/product-card';
import type { CartData } from '../../models/cart.models';
import type { CategoriesResponse, ProductPageResponse } from '../../models/shop.models';
import { PriceLabelPipe } from '../../pipes/price-label.pipe';
import { CartApiService } from '../../services/cart-api.service';
import { ShopApiService } from '../../services/shop-api.service';

const EMPTY_CATEGORIES_RESPONSE: CategoriesResponse = {
  data: [],
  meta: { count: 0 }
};

@Component({
  selector: 'app-winkelshop-page',
  imports: [RouterLink, PriceLabelPipe, ProductCard],
  templateUrl: './winkelshop-page.html',
  styleUrl: './winkelshop-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WinkelshopPage {
  private readonly cartApiService = inject(CartApiService);
  private readonly authStateService = inject(AuthStateService);
  private readonly shopApiService = inject(ShopApiService);

  protected readonly selectedCategoryId = signal<string | null>(null);
  protected readonly categoriesErrorMessage = signal<string | null>(null);
  protected readonly productsErrorMessage = signal<string | null>(null);
  protected readonly cartMessage = signal<string | null>(null);
  protected readonly currentUser = this.authStateService.user;
  protected readonly cartSummary = signal<CartData | null>(null);
  protected readonly hasCartItems = computed(() => (this.cartSummary()?.items.length ?? 0) > 0);

  constructor() {
    this.authStateService.restoreSession();

    if (this.authStateService.isAuthenticated()) {
      this.loadCartSummary();
    }
  }

  protected readonly categoriesResource = toSignal(
    this.shopApiService.getCategoriesResponse().pipe(
      tap(() => this.categoriesErrorMessage.set(null)),
      catchError(() => {
        this.categoriesErrorMessage.set('Kategorien konnten nicht geladen werden.');
        return of(EMPTY_CATEGORIES_RESPONSE);
      })
    ),
    { initialValue: EMPTY_CATEGORIES_RESPONSE }
  );

  private readonly productsResponse = toSignal<ProductPageResponse | null>(
    toObservable(this.selectedCategoryId).pipe(
      distinctUntilChanged(),
      switchMap((categoryId) => this.shopApiService.getProductsResponse(categoryId)),
      map((response) => this.sortProducts(response)),
      tap(() => this.productsErrorMessage.set(null)),
      catchError(() => {
        this.productsErrorMessage.set('Produkte konnten nicht geladen werden.');
        return of(null);
      })
    ),
    { initialValue: null }
  );

  protected readonly categories = computed(() => this.categoriesResource().data);

  protected readonly products = computed(() => this.productsResponse()?.content ?? []);

  protected readonly hasProducts = computed(() => this.products().length > 0);

  protected readonly combinedErrorMessage = computed(() => {
    return this.categoriesErrorMessage() ?? this.productsErrorMessage();
  });

  protected readonly selectedCategoryName = computed(() => {
    const selectedCategoryId = this.selectedCategoryId();
    if (!selectedCategoryId) {
      return 'Alle Kategorien';
    }

    const category = this.categories().find((entry) => entry.id === selectedCategoryId);
    return category?.name ?? 'Kategorie';
  });

  protected showAllCategories(): void {
    this.selectedCategoryId.set(null);
  }

  protected selectCategory(categoryId: string): void {
    this.selectedCategoryId.set(categoryId);
  }

  protected logout(): void {
    this.cartSummary.set(null);
    this.authStateService.logout().subscribe();
  }

  protected addToCart(productId: string): void {
    if (!this.authStateService.isAuthenticated()) {
      this.cartMessage.set('Bitte melde dich an, um Artikel in den Warenkorb zu legen.');
      return;
    }

    this.cartApiService.addCartItem({ productId, quantity: 1 }).subscribe({
      next: (response) => {
        this.cartSummary.set(response.data);
        this.cartMessage.set('Artikel wurde in den Warenkorb gelegt.');
      },
      error: () => {
        this.cartMessage.set('Artikel konnte nicht in den Warenkorb gelegt werden.');
      }
    });
  }

  private loadCartSummary(): void {
    this.cartApiService.getCart().subscribe({
      next: (response) => {
        this.cartSummary.set(response.data);
      },
      error: () => {
        this.cartSummary.set(null);
      }
    });
  }

  private sortProducts(response: ProductPageResponse): ProductPageResponse {
    return {
      ...response,
      content: [...response.content].sort((leftProduct, rightProduct) => {
        return leftProduct.name.localeCompare(rightProduct.name, 'de');
      })
    };
  }
}
