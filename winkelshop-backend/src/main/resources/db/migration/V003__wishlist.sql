CREATE TABLE wishlist_items (
    id UUID PRIMARY KEY,
    item_id UUID NOT NULL UNIQUE,
    user_id UUID NOT NULL,
    product_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_wishlist_items_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_wishlist_items_product FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT uq_wishlist_items_user_product UNIQUE (user_id, product_id)
);

CREATE INDEX idx_wishlist_items_user ON wishlist_items(user_id);
