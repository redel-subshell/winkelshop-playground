# Beispiel-Requests und Responses (Winkelshop REST + SPA)

Annahmen:
- Base URL: `http://localhost:8080`
- Auth via Bearer Token: `Authorization: Bearer <accessToken>`
- JSON als Datenformat
- Beispielwerte basieren auf `winkelshop-backend/src/main/resources/db/migration/V002__seed_data.sql`

## UC-01: Kategorien laden

### Request
```http
GET /categories HTTP/1.1
Host: localhost:8080
Accept: application/json
```

### Response (200 OK)
```json
{
  "data": [
    {
      "id": "11111111-1111-1111-1111-111111111111",
      "name": "Zauberstaebe",
      "description": "Zauberstaebe fuer Hexen und Zauberer"
    },
    {
      "id": "11111111-1111-1111-1111-111111111112",
      "name": "Buecher",
      "description": "Magische Lehr- und Fachbuecher"
    }
  ],
  "meta": {
    "count": 2
  }
}
```

---

## UC-02: Produkte laden (Request aus requests.http)

### Request
```http
GET /products?category=11111111-1111-1111-1111-111111111112 HTTP/1.1
Host: localhost:8080
Accept: application/json
```

### Response (200 OK)
```json
{
  "content": [
    {
      "id": "22222222-2222-2222-2222-222222222222",
      "name": "Fortgeschrittene Zaubertrankkunst",
      "description": "Lehrbuch fuer fortgeschrittene Trankbrauer",
      "price": 5.0,
      "currency": "GALLEON",
      "inStock": true,
      "stock": 30,
      "categoryId": "11111111-1111-1111-1111-111111111112",
      "imageUrl": "https://cdn.zauberbedarf.test/products/prod_book_potions_001.jpg"
    },
    {
      "id": "22222222-2222-2222-2222-222222222223",
      "name": "Hogwarts: Eine Geschichte",
      "description": "Historische Chronik von Hogwarts",
      "price": 4.0,
      "currency": "GALLEON",
      "inStock": true,
      "stock": 20,
      "categoryId": "11111111-1111-1111-1111-111111111112",
      "imageUrl": "https://cdn.zauberbedarf.test/products/prod_book_hogwarts_001.jpg"
    },
    {
      "id": "22222222-2222-2222-2222-222222222221",
      "name": "Stechpalme-Zauberstab",
      "description": "11 Zoll, Phoenixfederkern, passend fuer praezise Zauber",
      "price": 7.0,
      "currency": "GALLEON",
      "inStock": true,
      "stock": 14,
      "categoryId": "11111111-1111-1111-1111-111111111111",
      "imageUrl": "https://cdn.zauberbedarf.test/products/prod_wand_holly_001.jpg"
    }
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 20,
    "sort": {
      "sorted": false,
      "unsorted": true,
      "empty": true
    },
    "offset": 0,
    "paged": true,
    "unpaged": false
  },
  "last": true,
  "totalPages": 1,
  "totalElements": 3,
  "size": 20,
  "number": 0,
  "sort": {
    "sorted": false,
    "unsorted": true,
    "empty": true
  },
  "numberOfElements": 3
}
```

Hinweis: Das Backend hat zusaetzlich den Endpunkt `GET /products/category/{categoryId}` fuer echtes Kategorie-Filtering.

---

## UC-03: Produktdetails laden

### Request
```http
GET /products/22222222-2222-2222-2222-222222222221 HTTP/1.1
Host: localhost:8080
Accept: application/json
```

### Response (200 OK)
```json
{
  "data": {
    "id": "22222222-2222-2222-2222-222222222221",
    "name": "Stechpalme-Zauberstab",
    "description": "11 Zoll, Phoenixfederkern, passend fuer praezise Zauber",
    "price": 7.0,
    "currency": "GALLEON",
    "inStock": true,
    "stock": 14,
    "categoryId": "11111111-1111-1111-1111-111111111111",
    "imageUrl": "https://cdn.zauberbedarf.test/products/prod_wand_holly_001.jpg"
  }
}
```

---

## UC-04: Login und Logout

### Login Request
```http
POST /auth/login HTTP/1.1
Host: localhost:8080
Content-Type: application/json
Accept: application/json

{
  "email": "harry.potter@hogwarts.test",
  "password": "Expelliarmus123!"
}
```

### Login Response (200 OK)
```json
{
  "data": {
    "accessToken": "<jwt-oder-random-token>",
    "tokenType": "Bearer",
    "expiresIn": 3600,
    "user": {
      "id": "33333333-3333-3333-3333-333333333331",
      "name": "Harry Potter",
      "email": "harry.potter@hogwarts.test",
      "password": "Expelliarmus123!",
      "role": "buyer",
      "createdAt": "2026-01-01T00:00:00Z"
    }
  }
}
```

### Logout Request
```http
POST /auth/logout HTTP/1.1
Host: localhost:8080
Authorization: Bearer <accessToken>
Accept: application/json
```

### Logout Response (204 No Content)
```http
<leerer Body>
```

---

## UC-05: Warenkorb ansehen

### Request
```http
GET /cart HTTP/1.1
Host: localhost:8080
Authorization: Bearer <accessToken>
Accept: application/json
```

### Response (200 OK, leerer Warenkorb)
```json
{
  "data": {
    "items": [],
    "totalPrice": 10.0,
    "currency": "GALLEON"
  }
}
```

---

## UC-06: Artikel in den Warenkorb legen

### Request
```http
POST /cart/items HTTP/1.1
Host: localhost:8080
Authorization: Bearer <accessToken>
Content-Type: application/json
Accept: application/json

{
  "productId": "22222222-2222-2222-2222-222222222221",
  "quantity": 1
}
```

### Response (201 Created)
```json
{
  "data": {
    "items": [
      {
        "itemId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "productId": "22222222-2222-2222-2222-222222222221",
        "name": "Stechpalme-Zauberstab",
        "quantity": 1,
        "unitPrice": 7.0
      }
    ],
    "currency": "GALLEON"
  }
}
```

---

## UC-07: Mehrere Artikel hinzufuegen (aus requests.http)

### Request 1
```http
POST /cart/items HTTP/1.1
Host: localhost:8080
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "productId": "22222222-2222-2222-2222-222222222222",
  "quantity": 2
}
```

### Request 2
```http
POST /cart/items HTTP/1.1
Host: localhost:8080
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "productId": "22222222-2222-2222-2222-222222222223",
  "quantity": 1
}
```

### Response nach Request 2 (201 Created)
```json
{
  "data": {
    "items": [
      {
        "itemId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "productId": "22222222-2222-2222-2222-222222222221",
        "name": "Stechpalme-Zauberstab",
        "quantity": 1,
        "unitPrice": 7.0
      },
      {
        "itemId": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        "productId": "22222222-2222-2222-2222-222222222222",
        "name": "Fortgeschrittene Zaubertrankkunst",
        "quantity": 2,
        "unitPrice": 5.0
      },
      {
        "itemId": "cccccccc-cccc-cccc-cccc-cccccccccccc",
        "productId": "22222222-2222-2222-2222-222222222223",
        "name": "Hogwarts: Eine Geschichte",
        "quantity": 1,
        "unitPrice": 4.0
      }
    ],
    "currency": "GALLEON"
  }
}
```

---

## UC-08: Warenkorbposition aktualisieren und loeschen

### Menge aendern
```http
PATCH /cart/items/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb HTTP/1.1
Host: localhost:8080
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "quantity": 3
}
```

### Artikel entfernen
```http
DELETE /cart/items/cccccccc-cccc-cccc-cccc-cccccccccccc HTTP/1.1
Host: localhost:8080
Authorization: Bearer <accessToken>
```

### Response nach DELETE (200 OK)
```json
{
  "data": {
    "items": [
      {
        "itemId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "productId": "22222222-2222-2222-2222-222222222221",
        "name": "Stechpalme-Zauberstab",
        "quantity": 1,
        "unitPrice": 7.0
      },
      {
        "itemId": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        "productId": "22222222-2222-2222-2222-222222222222",
        "name": "Fortgeschrittene Zaubertrankkunst",
        "quantity": 3,
        "unitPrice": 5.0
      }
    ],
    "currency": "GALLEON"
  }
}
```

---

## UC-09: Checkout

### Request
```http
POST /checkout HTTP/1.1
Host: localhost:8080
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "paymentMethod": "credit-card",
  "shippingAddress": {
    "fullName": "Harry Potter",
    "street": "4 Privet Drive",
    "city": "Little Whinging",
    "postalCode": "CR3 0AA",
    "country": "UK"
  }
}
```

### Response (201 Created)
```json
{
  "data": {
    "order": {
      "id": "dddddddd-dddd-dddd-dddd-dddddddddddd",
      "userId": "33333333-3333-3333-3333-333333333331",
      "status": "placed",
      "paymentMethod": "credit-card",
      "total": 22.0,
      "currency": "GALLEON",
      "shippingFullName": "Harry Potter",
      "shippingStreet": "4 Privet Drive",
      "shippingCity": "Little Whinging",
      "shippingPostalCode": "CR3 0AA",
      "shippingCountry": "UK",
      "createdAt": "2026-05-25T12:00:00Z"
    },
    "items": [
      {
        "id": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
        "orderId": "dddddddd-dddd-dddd-dddd-dddddddddddd",
        "productId": "22222222-2222-2222-2222-222222222221",
        "name": "Stechpalme-Zauberstab",
        "quantity": 1,
        "unitPrice": 7.0
      },
      {
        "id": "ffffffff-ffff-ffff-ffff-ffffffffffff",
        "orderId": "dddddddd-dddd-dddd-dddd-dddddddddddd",
        "productId": "22222222-2222-2222-2222-222222222222",
        "name": "Fortgeschrittene Zaubertrankkunst",
        "quantity": 3,
        "unitPrice": 5.0
      }
    ]
  }
}
```

---

## UC-10: Order Details abrufen

### Request
```http
GET /orders/44444444-4444-4444-4444-444444444441 HTTP/1.1
Host: localhost:8080
Authorization: Bearer <accessToken>
Accept: application/json
```

### Response (200 OK)
```json
{
  "data": {
    "order": {
      "id": "44444444-4444-4444-4444-444444444441",
      "userId": "33333333-3333-3333-3333-333333333331",
      "status": "placed",
      "paymentMethod": "invoice",
      "total": 25.0,
      "currency": "GALLEON",
      "shippingFullName": "Harry Potter",
      "shippingStreet": "Ligusterweg 4",
      "shippingCity": "Little Whinging",
      "shippingPostalCode": "12345",
      "shippingCountry": "UK",
      "createdAt": "2026-05-25T10:15:30Z"
    },
    "items": [
      {
        "id": "55555555-5555-5555-5555-555555555551",
        "orderId": "44444444-4444-4444-4444-444444444441",
        "productId": "22222222-2222-2222-2222-222222222221",
        "name": "Stechpalme-Zauberstab",
        "quantity": 3,
        "unitPrice": 7.0
      },
      {
        "id": "55555555-5555-5555-5555-555555555552",
        "orderId": "44444444-4444-4444-4444-444444444441",
        "productId": "22222222-2222-2222-2222-222222222223",
        "name": "Hogwarts: Eine Geschichte",
        "quantity": 1,
        "unitPrice": 4.0
      }
    ]
  }
}
```

---

## UC-11: Order-Historie abrufen

### Request
```http
GET /orders?page=0&size=20 HTTP/1.1
Host: localhost:8080
Authorization: Bearer <accessToken>
Accept: application/json
```

### Response (200 OK)
```json
{
  "content": [
    {
      "orderId": "44444444-4444-4444-4444-444444444441",
      "status": "placed",
      "total": 25.0,
      "currency": "GALLEON",
      "createdAt": "2026-05-25T10:15:30Z"
    },
    {
      "orderId": "44444444-4444-4444-4444-444444444442",
      "status": "shipped",
      "total": 8.0,
      "currency": "GALLEON",
      "createdAt": "2026-05-20T08:02:10Z"
    }
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 20,
    "sort": {
      "sorted": false,
      "unsorted": true,
      "empty": true
    },
    "offset": 0,
    "paged": true,
    "unpaged": false
  },
  "last": true,
  "totalPages": 1,
  "totalElements": 2,
  "size": 20,
  "number": 0,
  "sort": {
    "sorted": false,
    "unsorted": true,
    "empty": true
  },
  "numberOfElements": 2
}
```

---

## Optional: Validierungsfehler

### Request
```http
POST /cart/items HTTP/1.1
Host: localhost:8080
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "productId": "22222222-2222-2222-2222-222222222221",
  "quantity": 0
}
```

### Response (400 Bad Request)
```json
{
  "timestamp": "2026-05-25T12:10:00.000+00:00",
  "status": 400,
  "error": "Bad Request",
  "path": "/cart/items"
}
```
