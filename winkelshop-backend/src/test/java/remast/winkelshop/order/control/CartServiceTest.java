package remast.winkelshop.order.control;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.jdbc.core.JdbcAggregateTemplate;
import remast.winkelshop.order.entity.CartItemEntity;
import remast.winkelshop.order.entity.CartItemRepository;
import remast.winkelshop.order.entity.ProductEntity;
import remast.winkelshop.order.entity.ProductRepository;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CartServiceTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private CartItemRepository cartItemRepository;

    @Mock
    private JdbcAggregateTemplate jdbcAggregateTemplate;

    @InjectMocks
    private CartService cartService;

    @Test
    void addItem_createsCartItemWithProductPrice() {
        // Arrange
        var userId = UUID.randomUUID();
        var productId = UUID.randomUUID();
        var availableProduct = new ProductEntity(
                productId,
                "Nimbus 2000",
                "Racing broom",
                1200.0,
                "GALLEON",
                true,
                5,
                UUID.randomUUID(),
                "nimbus-2000.png"
        );
        when(productRepository.findById(productId)).thenReturn(Optional.of(availableProduct));
        when(jdbcAggregateTemplate.insert(any(CartItemEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        var cartItem = cartService.addItem(userId, productId, 2);

        // Assert
        assertThat(cartItem.userId()).isEqualTo(userId);
        assertThat(cartItem.productId()).isEqualTo(productId);
        assertThat(cartItem.quantity()).isEqualTo(2);
        assertThat(cartItem.unitPrice()).isEqualTo(1200.0);
        assertThat(cartItem.itemId()).isNotNull();
        assertThat(cartItem.createdAt()).isNotNull();

        verify(jdbcAggregateTemplate).insert(any(CartItemEntity.class));
    }

    @Test
    void addItem_throwsExceptionWhenProductIsOutOfStock() {
        // Arrange
        var productId = UUID.randomUUID();
        var outOfStockProduct = new ProductEntity(
                productId,
                "Nimbus 2000",
                "Racing broom",
                1200.0,
                "GALLEON",
                false,
                0,
                UUID.randomUUID(),
                "nimbus-2000.png"
        );
        when(productRepository.findById(productId)).thenReturn(Optional.of(outOfStockProduct));

        // Act
        var thrown = catchThrowable(() -> cartService.addItem(UUID.randomUUID(), productId, 1));

        // Assert
        assertThat(thrown)
                .isInstanceOf(RuntimeException.class)
                .hasMessage("product is out of stock");

        verify(jdbcAggregateTemplate, never()).insert(any(CartItemEntity.class));
    }
}
