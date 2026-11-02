package remast.winkelshop.order.control;

import lombok.RequiredArgsConstructor;
import org.springframework.data.jdbc.core.JdbcAggregateTemplate;
import org.springframework.stereotype.Service;
import remast.winkelshop.order.entity.Currency;
import remast.winkelshop.order.entity.ProductRepository;
import remast.winkelshop.order.entity.Wishlist;
import remast.winkelshop.order.entity.WishlistItemEntity;
import remast.winkelshop.order.entity.WishlistItemRepository;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WishlistService {

    private final ProductRepository productRepository;
    private final WishlistItemRepository wishlistItemRepository;
    private final JdbcAggregateTemplate jdbcAggregateTemplate;

    public WishlistItemEntity addItem(UUID userId, UUID productId) {
        productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("product not found"));

        return wishlistItemRepository.findByUserIdAndProductId(userId, productId)
                .orElseGet(() -> jdbcAggregateTemplate.insert(new WishlistItemEntity(
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        userId,
                        productId,
                        Instant.now()
                )));
    }

    public Wishlist getWishlist(UUID userId) {
        var lines = wishlistItemRepository.findByUserIdOrderByCreatedAtAsc(userId).stream()
                .map(item -> {
                    var product = productRepository.findById(item.productId())
                            .orElseThrow();
                    return new Wishlist.WishlistItemLine(
                            item.itemId(),
                            item.productId(),
                            product.name(),
                            product.price(),
                            product.imageUrl(),
                            product.inStock(),
                            product.stock()
                    );
                })
                .toList();

        return new Wishlist(lines, Currency.GALLEON);
    }

    public void removeItem(UUID userId, UUID itemId) {
        var existing = wishlistItemRepository.findByUserIdAndItemId(userId, itemId)
                .orElseThrow();
        wishlistItemRepository.delete(existing);
    }
}
