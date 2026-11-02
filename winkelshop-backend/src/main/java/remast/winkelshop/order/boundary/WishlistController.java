package remast.winkelshop.order.boundary;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import remast.winkelshop.auth.boundary.User;
import remast.winkelshop.order.control.WishlistService;
import remast.winkelshop.order.entity.Wishlist;

import java.util.UUID;

@RestController
@RequestMapping("/wishlist")
@RequiredArgsConstructor
public class WishlistController {

    private final WishlistService wishlistService;

    @PostMapping("/items")
    @ResponseStatus(HttpStatus.CREATED)
    public DataResponse<Wishlist> addItem(User user,
                                          @RequestBody AddWishlistItemRequest request) {
        wishlistService.addItem(user.userId(), request.productId());
        return new DataResponse<>(wishlistService.getWishlist(user.userId()));
    }

    @GetMapping
    public DataResponse<Wishlist> getWishlist(User user) {
        return new DataResponse<>(wishlistService.getWishlist(user.userId()));
    }

    @DeleteMapping("/items/{itemId}")
    public DataResponse<Wishlist> deleteItem(User user, @PathVariable UUID itemId) {
        wishlistService.removeItem(user.userId(), itemId);
        return new DataResponse<>(wishlistService.getWishlist(user.userId()));
    }

    public record AddWishlistItemRequest(UUID productId) {
    }
}
