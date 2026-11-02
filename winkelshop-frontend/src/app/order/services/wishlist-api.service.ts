import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import type { WishlistAddItemRequest, WishlistResponse } from '../models/wishlist.models';

@Injectable({ providedIn: 'root' })
export class WishlistApiService {
  private readonly httpClient = inject(HttpClient);
  private readonly apiBaseUrl = '/api';

  public addWishlistItem(payload: WishlistAddItemRequest) {
    return this.httpClient.post<WishlistResponse>(`${this.apiBaseUrl}/wishlist/items`, payload);
  }

  public getWishlist() {
    return this.httpClient.get<WishlistResponse>(`${this.apiBaseUrl}/wishlist`);
  }

  public removeWishlistItem(itemId: string) {
    return this.httpClient.delete<WishlistResponse>(`${this.apiBaseUrl}/wishlist/items/${itemId}`);
  }
}
