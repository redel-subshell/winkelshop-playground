# Backend Code Review – winkelshop-backend (Gesamtcode)

**Datum:** 2026-11-02
**Scope:** Gesamtes Backend (`winkelshop-backend`), nicht nur der letzte Commit
**Geprüft:** `src/main`, `db/migration`, `pom.xml`, `application*.yaml`, `src/test`, `requests.http`
**Bewertungsgrundlage:** `winkelshop-backend/AGENTS.md` (Boundary → Control → Entity)
**Verifikation:** Verhaltensaussagen wurden gegen das H2-Profil zur Laufzeit geprüft. Die bestehende Testsuite läuft grün.

---

## Zusammenfassung

| Schweregrad | Anzahl |
|-------------|--------|
| Critical    | 2 |
| High        | 5 |
| Medium      | 7 |
| Low         | 7 |

Die kritischen und die meisten High-Findings betreffen Authentifizierung und Checkout. Die Medium-Findings betreffen Datenmodell, Nebenläufigkeit und Fehlerbehandlung. Die Low-Findings sind überwiegend Struktur, Konfiguration und API-Design.

---

## Critical

### [CRITICAL] Passwörter werden im Klartext gespeichert und verglichen

**Datei:** `auth/control/AuthService.java:22`, `db/migration/V002__seed_data.sql:11-15`

`account.password().equals(password)` vergleicht Klartext. In den Seed-Daten steht `'123'` als Passwort.

**Szenario:** Jeder Lesezugriff auf die `users`-Tabelle (Backup, Log, SQL-Leak, H2-Console) offenbart alle Zugangsdaten. Die Demo-Accounts sind bewusst simpel, aber derselbe Codepfad ist der einzige Login-Mechanismus.

**Lösung:** `PasswordEncoder` (z. B. BCrypt) einführen und mit `matches()` vergleichen. Falls das für die Demo bewusst so bleibt, sollte das dokumentiert werden.

### [CRITICAL] `AuthController` gibt die komplette `UserEntity` inklusive Passwort zurück

**Datei:** `auth/boundary/AuthController.java:55`

`LoginResponse(..., UserEntity user)` enthält das Feld `password`. `POST /auth/login` liefert damit das Passwort im JSON-Body.

**Szenario:** Tritt bei jedem erfolgreichen Login auf.

**Lösung:** Dediziertes DTO (`id`, `name`, `email`, `role`) statt des Persistenz-Records. Unabhängig von der Hashing-Frage ein Defekt.

---

## High

### [HIGH] Login-Fehler werfen `NoSuchElementException` → HTTP 500

**Datei:** `auth/control/AuthService.java:21-23`

`.orElseThrow()` ohne Exception-Typ. Falsches Passwort oder unbekannte E-Mail führen zu `500 Internal Server Error`.

**Szenario:** Jeder fehlgeschlagene Login-Versuch. Erwartet ist `401`.

**Lösung:** Dedizierte `AuthenticationException` oder `ResponseStatusException(HttpStatus.UNAUTHORIZED)` werfen.

### [HIGH] `anyRequest().permitAll()` entwertet die explizite Matcher-Liste

**Datei:** `auth/control/SecurityConfig.java:29`

Alles, was nicht in Zeile 27-28 gematcht wird, ist öffentlich. Aktuell betrifft das nur `/auth/logout` (harmlos), aber jeder später hinzugefügte Endpoint ist ohne Anpassung der `SecurityConfig` unauthentifiziert.

**Szenario:** Latentes Sicherheitsproblem, kein aktiver Exploit. Der nächste neue Controller ist öffentlich.

**Lösung:** `anyRequest().authenticated()` mit explizitem `permitAll()` für öffentliche Routen, oder mindestens ein Kommentar zur Begründung.

### [HIGH] Gleiches Produkt zweimal in den Warenkorb gelegt erzeugt doppelte Zeilen

**Datei:** `order/control/CartService.java:24-40`

`addItem` fügt immer eine neue Zeile ein, ohne nach einer bestehenden Zeile für dieselbe `productId` zu suchen. Zur Laufzeit bestätigt: `addItem(user, product, 2)` und `addItem(user, product, 3)` erzeugen zwei Cart-Lines für dasselbe Produkt.

Die Tabelle `cart_items` hat keinen Unique-Constraint auf `(user_id, product_id)` (anders als `wishlist_items`), die DB verhindert es also auch nicht.

**Szenario:** Mehrfaches Klicken auf „In den Warenkorb" erzeugt Duplikate.

**Lösung:** Beim Hinzufügen Mengen zusammenführen, oder dokumentieren, dass der Client für Änderungen `PATCH` nutzen muss.

### [HIGH] `CheckoutService` prüft keinen Bestand und reduziert ihn nicht

**Datei:** `order/control/CheckoutService.java:36-46`

Produkte werden nur für den Namen gelesen; `stock`/`in_stock` werden weder validiert noch nach dem Kauf reduziert. `CartService.addItem` prüft nur `inStock`, nicht `quantity <= stock`.

**Szenario:** Ein Käufer legt 1000 Stück eines Produkts mit `stock = 14` in den Warenkorb und checkt erfolgreich aus. Die Bestandsfelder sind nach der ersten Bestellung bedeutungslos.

**Lösung:** Validierung und Reduktion innerhalb der bestehenden `@Transactional`-Methode.

### [HIGH] `@Transactional` auf Checkout schützt die Warenkorb-Bereinigung nur teilweise

**Datei:** `order/control/CheckoutService.java:28-36`, `order/control/CartService.java:74-78`

`consumeCart` liest die Zeilen und löscht sie danach ohne Lock. Zwei parallele Checkouts desselben Nutzers können beide dieselben Cart-Lines lesen, bevor einer löscht → zwei Bestellungen für dieselben Artikel.

**Szenario:** Doppelklick oder wiederholter Request. Schweregrad hängt davon ab, ob doppelte Bestellungen akzeptabel sind.

**Lösung:** `SELECT ... FOR UPDATE` auf die Cart-Zeilen oder Löschen anhand der zurückgegebenen Row-Count.

---

## Medium

### [MEDIUM] Spalte `item_id` ist redundant und dupliziert den Primärschlüssel

**Datei:** `order/entity/CartItemEntity.java:11-12`, `order/entity/WishlistItemEntity.java:11-12`, `CartService.java:32-33`, `WishlistService.java:29-30`

Beide Entities haben `@Id id` und zusätzlich `@Column("item_id") itemId`; beide Services erzeugen zwei zufällige UUIDs. Die API exponiert `itemId`, `id` wird nie genutzt. Geprüft: beide Spalten werden korrekt befüllt, Lookups über `itemId` funktionieren.

**Lösung:** `item_id` entfernen und `id` als öffentlichen Identifier nutzen, oder die Existenz beider IDs kommentieren.

### [MEDIUM] N+1-Queries beim Laden von Produkten

**Datei:** `CartService.getCart` (`:43-49`), `WishlistService.getWishlist` (`:38-52`), `CheckoutService.checkout` (`:38-46`)

Pro Zeile wird `productRepository.findById` aufgerufen. Ein Warenkorb mit 20 Zeilen löst 20 zusätzliche Queries aus.

**Lösung:** `findAllById` nutzen.

### [MEDIUM] `PagedResponse.of` gibt eine `subList`-View zurück, die auf der Quellliste basiert

**Datei:** `order/boundary/PagedResponse.java:41`

`all.subList(from, to)` ist eine View, keine Kopie. Spätere Änderungen der Quellliste verändern den Response-Inhalt; die komplette Liste bleibt erreichbar. Aktuell nur über `of` erreichbar, die echten Endpoints nutzen `fromContentAndTotal`.

**Lösung:** `List.copyOf(...)` für Konsistenz.

### [MEDIUM] Race Condition in `WishlistService.addItem` auf dem Unique-Constraint

**Datei:** `order/control/WishlistService.java:27-34`

Find-then-Insert ohne Lock. Zwei parallele Adds für dasselbe Produkt sehen beide `empty` und fügen beide ein; der zweite scheitert am `uq_wishlist_items_user_product` mit `DataIntegrityViolationException` → 500.

**Szenario:** Zwei fast gleichzeitige Requests (Doppelklick auf Wishlist-Button).

**Lösung:** Constraint-Verletzung abfangen und neu lesen, oder Upsert verwenden.

### [MEDIUM] `RuntimeException` mit beliebigen Meldungen statt passender HTTP-Status

**Datei:** `CartService.java:26-28`, `WishlistService.java:25`, sowie die nackten `.orElseThrow()` in `CartService.java:46,56,70`, `OrderService.java:22`, `CheckoutService.java:41`, `ProductService.java:37`

Alle erscheinen als HTTP 500. Für fehlendes Produkt oder nicht existierende Cart-Zeile ist `404` korrekt.

**Szenario:** Jeder „not found"-Fall sieht für den Client wie ein Serverfehler aus.

**Lösung:** Domain-Exceptions oder ein zentraler `ExceptionHandler`, der auf Statuscodes mappt.

### [MEDIUM] `requests.http` nutzt nicht existierende Login-Daten

**Datei:** `requests.http:90-91`

Login mit `harry.potter@hogwarts.test` / `Expelliarmus123!`, in den Seed-Daten (`V002__seed_data.sql:11`) steht aber `harry@hog.warts` / `123`.

**Szenario:** Der Login-Request schlägt immer fehl (aktuell mit 500), `accessToken` wird nie gesetzt, alle authentifizierten Requests der Datei schlagen fehl.

**Lösung:** Zugangsdaten an die Seed-Daten anpassen.

### [MEDIUM] `CartService` und `WishlistService` liefern `RuntimeException` für fachliche Fehler

**Datei:** `CartService.java:26-28`, `WishlistService.java:25`

Siehe oben – zusammengefasst mit dem Statuscode-Finding, hier separat benannt, weil die Meldungstexte (`"product not found"`, `"product is out of stock"`) als API-Vertrag missverstanden werden könnten.

---

## Low

### [LOW] H2-Console-Konfiguration nutzt den alten Property-Prefix

**Datei:** `application.yaml:15-17`

Gesetzt ist `h2.console.enabled: true`, das Spring-Boot-4-Modul `spring-boot-h2console` liest aber `spring.h2.console.enabled` (aus der Konfigurations-Metadaten im Jar bestätigt). Die Console ist damit nicht aktiv; `/h2-console` liefert 404.

`SecurityConfig` erlaubt weiterhin `/h2-console/**` und setzt `frameOptions.sameOrigin()`, die Absicht war also klar.

**Lösung:** Key auf `spring.h2.console.enabled` ändern und ggf. auf ein Dev-Profil beschränken.

### [LOW] `ProductController` akzeptiert `categoryId` und `category` für denselben Parameter

**Datei:** `order/boundary/ProductController.java:23-28`

Zwei Request-Params, einer wird bevorzugt. `requests.http` nutzt `category`. Kein Bug, aber der Alias ist undokumentiert.

**Lösung:** Dokumentieren oder einen Parameter entfernen.

### [LOW] `OrderController` hat keine Obergrenze für `size`

**Datei:** `order/boundary/OrderController.java:30`

`size` wird in `OrderService.getOrders` nur nach unten begrenzt. `?size=1000000` versucht, so viele Zeilen zu laden. Gleiches gilt für `ProductController`.

**Lösung:** Ein Cap (z. B. 100) ergänzen.

### [LOW] `OrderService` und `CartService` importieren `boundary`-Typen aus `control`

**Datei:** `OrderService.java:5`, `AuthService.java:5`

`control` importiert `order.boundary.PagedResponse` bzw. `auth.boundary.User`. Laut `AGENTS.md` ist die Richtung Boundary → Control → Entity; das ist eine Umkehrung.

**Lösung:** `PagedResponse` in ein gemeinsames Package verschieben oder das Mapping im Controller durchführen.

### [LOW] `Currency.GALLEON` ist in Responses hartkodiert

**Datei:** `CartService.java:51`, `WishlistService.java:54`, `CheckoutService.java:56`

Immer `GALLEON`, während `ProductEntity.currency` und `orders.currency` aus der DB kommen. Mit aktuellen Seed-Daten nicht erreichbar.

### [LOW] `Cart` und `Wishlist` exponieren `totalPrice()` und `getTotalPrice()`

**Datei:** `order/entity/Cart.java:8-14`, `order/entity/Wishlist.java:8-14`

Der Getter existiert nur für das JSON-Shape. Funktioniert, aber zwei Namen für denselben Wert.

### [LOW] Doppelte `item_id`-Erzeugung in Services

**Datei:** `CartService.java:32-33`, `WishlistService.java:29-30`

Zwei `UUID.randomUUID()` pro Eintrag. Siehe Medium-Finding zum Datenmodell.

---

## Tests

- `CartServiceTest` und `WishlistServiceTest` mocken `JdbcAggregateTemplate` und prüfen das zurückgegebene Objekt. Sie können `item_id`-Mapping, doppelte Cart-Lines und die Unique-Constraint-Race nicht erkennen, weil sie die DB nicht berühren.
- `ApplicationTests` prüft nur, dass der Context startet.
- Es fehlen Tests für `AuthService` (Login-Erfolg/-Fehler), `CheckoutService` (Bestand, leerer Warenkorb, Summen) und `OrderService` (Ownership-Check). Der Login-Fehler (500) und die fehlende Bestandsprüfung im Checkout wären mit je einem Test auffangbar.

---

## Korrekt geprüft

- `findByIdAndUserId(orderId, userId)` in `OrderService.getOrder` verhindert korrekt das Lesen fremder Bestellungen.
- `PagedResponse.fromContentAndTotal` und `OrderService.getOrders` behandeln `page = 0`, `size = 1` und leere Ergebnisse korrekt.
- `BearerTokenAuthenticationFilter` + `UserArgumentResolver` liefern `401` für fehlende/ungültige Tokens auf geschützten Routen.
- Die Seed-Bestellsummen in `V002` passen zu ihren `order_items` (3×7 + 1×4 = 25, 2×4 = 8).
