export interface WishlistAddItemRequest {
  productId: string;
}

export interface WishlistItem {
  itemId: string;
  productId: string;
  name: string;
  price: number;
  imageUrl: string | null;
  inStock: boolean;
  stock: number;
}

export interface WishlistData {
  items: WishlistItem[];
  currency: string;
  itemCount: number;
}

export interface WishlistResponse {
  data: WishlistData;
}
