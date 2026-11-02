package remast.winkelshop.order.entity;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class CartTest {

    @Test
    void lineTotal_multipliesQuantityWithUnitPrice() {
        // Arrange
        var line = new Cart.CartItemLine(UUID.randomUUID(), UUID.randomUUID(), "Nimbus 2000", 3, 12.5);

        // Act
        var lineTotal = line.lineTotal();

        // Assert
        assertThat(lineTotal).isCloseTo(37.5, within(0.0001));
    }

    @Test
    void totalPrice_sumsAllItemLines() {
        // Arrange
        var firstLine = new Cart.CartItemLine(UUID.randomUUID(), UUID.randomUUID(), "Nimbus 2000", 2, 10.5);
        var secondLine = new Cart.CartItemLine(UUID.randomUUID(), UUID.randomUUID(), "Firebolt", 1, 15.0);
        var cart = new Cart(List.of(firstLine, secondLine), Currency.GALLEON);

        // Act
        var totalPrice = cart.totalPrice();

        // Assert
        assertThat(totalPrice).isCloseTo(36.0, within(0.0001));
    }
}
