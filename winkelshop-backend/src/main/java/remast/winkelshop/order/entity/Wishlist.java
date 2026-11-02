package remast.winkelshop.order.entity;

import java.util.List;
import java.util.UUID;

public record Wishlist(List<WishlistItemLine> items, Currency currency) {

    public int itemCount() {
        return items.size();
    }

    public int getItemCount() {
        return itemCount();
    }

    public record WishlistItemLine(UUID itemId,
                                   UUID productId,
                                   String name,
                                   double price,
                                   String imageUrl,
                                   boolean inStock,
                                   int stock) {
    }
}
