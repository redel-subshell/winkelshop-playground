package remast.winkelshop.order.entity;

import org.springframework.data.repository.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WishlistItemRepository extends Repository<WishlistItemEntity, UUID> {

    List<WishlistItemEntity> findByUserIdOrderByCreatedAtAsc(UUID userId);

    Optional<WishlistItemEntity> findByUserIdAndProductId(UUID userId, UUID productId);

    Optional<WishlistItemEntity> findByUserIdAndItemId(UUID userId, UUID itemId);

    WishlistItemEntity save(WishlistItemEntity item);

    void delete(WishlistItemEntity item);
}
