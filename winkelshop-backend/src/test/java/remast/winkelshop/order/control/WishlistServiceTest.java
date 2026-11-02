package remast.winkelshop.order.control;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.jdbc.core.JdbcAggregateTemplate;
import remast.winkelshop.order.entity.ProductEntity;
import remast.winkelshop.order.entity.ProductRepository;
import remast.winkelshop.order.entity.WishlistItemEntity;
import remast.winkelshop.order.entity.WishlistItemRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WishlistServiceTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private WishlistItemRepository wishlistItemRepository;

    @Mock
    private JdbcAggregateTemplate jdbcAggregateTemplate;

    @InjectMocks
    private WishlistService wishlistService;

    @Test
    void addItem_createsWishlistItem() {
        // Arrange
        var userId = UUID.randomUUID();
        var productId = UUID.randomUUID();
        when(productRepository.findById(productId)).thenReturn(Optional.of(product(productId, true)));
        when(wishlistItemRepository.findByUserIdAndProductId(userId, productId)).thenReturn(Optional.empty());
        when(jdbcAggregateTemplate.insert(any(WishlistItemEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        var wishlistItem = wishlistService.addItem(userId, productId);

        // Assert
        assertThat(wishlistItem.userId()).isEqualTo(userId);
        assertThat(wishlistItem.productId()).isEqualTo(productId);
        assertThat(wishlistItem.itemId()).isNotNull();
        assertThat(wishlistItem.createdAt()).isNotNull();

        verify(jdbcAggregateTemplate).insert(any(WishlistItemEntity.class));
    }

    @Test
    void addItem_acceptsOutOfStockProduct() {
        // Arrange
        var userId = UUID.randomUUID();
        var productId = UUID.randomUUID();
        when(productRepository.findById(productId)).thenReturn(Optional.of(product(productId, false)));
        when(wishlistItemRepository.findByUserIdAndProductId(userId, productId)).thenReturn(Optional.empty());
        when(jdbcAggregateTemplate.insert(any(WishlistItemEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        var wishlistItem = wishlistService.addItem(userId, productId);

        // Assert
        assertThat(wishlistItem.productId()).isEqualTo(productId);
        verify(jdbcAggregateTemplate).insert(any(WishlistItemEntity.class));
    }

    @Test
    void addItem_returnsExistingItemWhenProductAlreadyOnWishlist() {
        // Arrange
        var userId = UUID.randomUUID();
        var productId = UUID.randomUUID();
        var existingItem = new WishlistItemEntity(
                UUID.randomUUID(),
                UUID.randomUUID(),
                userId,
                productId,
                Instant.now()
        );
        when(productRepository.findById(productId)).thenReturn(Optional.of(product(productId, true)));
        when(wishlistItemRepository.findByUserIdAndProductId(userId, productId)).thenReturn(Optional.of(existingItem));

        // Act
        var wishlistItem = wishlistService.addItem(userId, productId);

        // Assert
        assertThat(wishlistItem).isEqualTo(existingItem);
        verify(jdbcAggregateTemplate, never()).insert(any(WishlistItemEntity.class));
    }

    @Test
    void addItem_throwsExceptionWhenProductDoesNotExist() {
        // Arrange
        var productId = UUID.randomUUID();
        when(productRepository.findById(productId)).thenReturn(Optional.empty());

        // Act
        var thrown = catchThrowable(() -> wishlistService.addItem(UUID.randomUUID(), productId));

        // Assert
        assertThat(thrown)
                .isInstanceOf(RuntimeException.class)
                .hasMessage("product not found");

        verify(jdbcAggregateTemplate, never()).insert(any(WishlistItemEntity.class));
    }

    @Test
    void getWishlist_returnsItemsWithProductDetails() {
        // Arrange
        var userId = UUID.randomUUID();
        var productId = UUID.randomUUID();
        var itemId = UUID.randomUUID();
        var wishlistItem = new WishlistItemEntity(
                UUID.randomUUID(),
                itemId,
                userId,
                productId,
                Instant.now()
        );
        when(wishlistItemRepository.findByUserIdOrderByCreatedAtAsc(userId)).thenReturn(List.of(wishlistItem));
        when(productRepository.findById(productId)).thenReturn(Optional.of(product(productId, true)));

        // Act
        var wishlist = wishlistService.getWishlist(userId);

        // Assert
        assertThat(wishlist.items()).hasSize(1);
        assertThat(wishlist.itemCount()).isEqualTo(1);
        assertThat(wishlist.items().getFirst().itemId()).isEqualTo(itemId);
        assertThat(wishlist.items().getFirst().name()).isEqualTo("Nimbus 2000");
        assertThat(wishlist.items().getFirst().price()).isEqualTo(1200.0);
        assertThat(wishlist.items().getFirst().inStock()).isTrue();
    }

    @Test
    void removeItem_deletesExistingItem() {
        // Arrange
        var userId = UUID.randomUUID();
        var itemId = UUID.randomUUID();
        var existingItem = new WishlistItemEntity(
                UUID.randomUUID(),
                itemId,
                userId,
                UUID.randomUUID(),
                Instant.now()
        );
        when(wishlistItemRepository.findByUserIdAndItemId(userId, itemId)).thenReturn(Optional.of(existingItem));

        // Act
        wishlistService.removeItem(userId, itemId);

        // Assert
        verify(wishlistItemRepository).delete(existingItem);
    }

    @Test
    void removeItem_throwsExceptionWhenItemDoesNotBelongToUser() {
        // Arrange
        var userId = UUID.randomUUID();
        var itemId = UUID.randomUUID();
        when(wishlistItemRepository.findByUserIdAndItemId(userId, itemId)).thenReturn(Optional.empty());

        // Act
        var thrown = catchThrowable(() -> wishlistService.removeItem(userId, itemId));

        // Assert
        assertThat(thrown).isInstanceOf(RuntimeException.class);

        verify(wishlistItemRepository, never()).delete(any(WishlistItemEntity.class));
    }

    private static ProductEntity product(UUID productId, boolean inStock) {
        return new ProductEntity(
                productId,
                "Nimbus 2000",
                "Racing broom",
                1200.0,
                "GALLEON",
                inStock,
                inStock ? 5 : 0,
                UUID.randomUUID(),
                "nimbus-2000.png"
        );
    }
}
