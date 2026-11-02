# Backend Code Review – winkelshop-backend

**Datum:** 2026-11-02
**Scope:** Gesamtes Backend (`winkelshop-backend`), nicht nur der letzte Commit
**Reviewer:** `cross-review` Subagent (cortecs/glm-5.3)
**Ausgeschlossen:** Frontend (`winkelshop-frontend`), Tooling/Skills (`.agents`, `.opencode`, `doc`)

## Geprüfter Umfang

- `src/main/java/remast/winkelshop/**` (auth, order: boundary/control/entity)
- `src/main/resources` (`application.yaml`, `application-postgres.yaml`, `db/migration/*.sql`)
- `src/test/java/**`
- `pom.xml`, `compose.yaml`, `requests.http`

## Bewertungsgrundlage

Konventionen aus `winkelshop-backend/AGENTS.md`:

- **Boundary Control Entity Architecture**: Zugriff nur Boundary → Control → Entity.
- Java 25, `var`, Records, funktionaler Style mit Streams statt Schleifen.
- Tests: fachlich sprechende Namen, einzelne Tests statt parametrisierter Tests.
- Build über Maven Wrapper (`./mvnw`).

Prioritäten: Funktionale Fehler, Sicherheit, Datenintegrität, Performance, Architektur, Wartbarkeit.

---

## Übersicht

| # | Schweregrad | Bereich | Kurztitel |
|---|---|---|---|
| 1 | High | Sicherheit | Klartext-Passwörter: Speicherung und Vergleich |
| 2 | High | Sicherheit | Login-Response leakt das Passwort |
| 3 | High | Funktional | Fehlgeschlagener Login liefert HTTP 500 statt 401 |
| 4 | High | Funktional | Flyway-Versionskonflikt: Postgres-Profil defekt |
| 5 | Medium | Sicherheit | Tokens verfallen nie, `expiresIn` ist falsch |
| 6 | Medium | Sicherheit | Fail-open Security-Config (`anyRequest().permitAll()`) |
| 7 | Medium | Datenintegrität | Checkout dekrementiert keinen Lagerbestand (Overselling) |
| 8 | Medium | Datenintegrität | Checkout mit leerem Warenkorb erzeugt leere Bestellung |
| 9 | Medium | Datenintegrität | Konkurrierende Checkouts erzeugen Doppelbestellungen |
| 10 | Medium | Architektur | Control greift auf Boundary zu |
| 11 | Low | Funktional | Kein Merging von Cart-Positionen desselben Produkts |
| 12 | Low | Robustheit | Race Condition beim Wishlist-Add → HTTP 500 |
| 13 | Low | Robustheit | Fehlende Bean-Validation auf `productId` → 500 statt 400 |
| 14 | Low | Datenintegrität | Geldbeträge als `double` trotz `DECIMAL(10,2)` |
| 15 | Low | Performance | N+1-Produktlookups in Cart/Wishlist/Checkout |
| 16 | Low | Performance | Unbegrenzte Page-Size |
| 17 | Low | Wartbarkeit | `requests.http` passt nicht zu den Seed-Daten |
| 18 | Low | Architektur | Auth-Boundary hängt an Boundary eines anderen Components |
| 19 | Low | Tests | Testabdeckung zu dünn für die Risikozonen |

**Gesamtbild:** Kein Einzelfund ist für sich genommen kritisch, aber die Kombination aus
Klartext-Passwörtern (#1) und Passwort-Leak im Login-Response (#2) ist für jede reale Umgebung
zusammen als **kritisch** zu bewerten.

---

## High

### 1. Klartext-Passwörter: Speicherung und Vergleich

- **Dateien:** `src/main/java/remast/winkelshop/auth/control/AuthService.java:22`,
  `src/main/resources/db/migration/V002__seed_data.sql:11-15`
- **Beschreibung:** `account.password().equals(password)` vergleicht Klartext-Passwörter; in der DB
  liegen Klartext-Passwörter (`'123'`). `spring-security-crypto` (BCrypt) ist über den
  Security-Starter ohnehin verfügbar.
- **Fehlerszenario:** Datenbank-Leak (auch nur ein H2-/Postgres-Dump) offenbart alle Passwörter im
  Klartext; ein DB-Dump reicht für eine vollständige Account-Übernahme.
- **Lösungsvorschlag:** Passwörter als BCrypt/Argon2-Hash speichern und Vergleich über
  `PasswordEncoder.matches()`; Seed-Data entsprechend migrieren (z. B. `V004`).

### 2. Login-Response leakt das Passwort

- **Dateien:** `src/main/java/remast/winkelshop/auth/boundary/AuthController.java:34` (Rückgabe von
  `result.user()`), `:55` (`LoginResponse` enthält `UserEntity`)
- **Beschreibung:** `UserEntity` ist ein Record mit `password`-Komponente und ohne `@JsonIgnore`.
  Jackson serialisiert alle Record-Komponenten → `$.data.user.password` steht im JSON-Response.
- **Fehlerszenario:** `POST /auth/login` → Response-Body enthält `"user": { ..., "password": "123",
  ... }`. Jeder Client (und jedes Proxy-/Frontend-Log) sieht das Passwort.
- **Lösungsvorschlag:** Dediziertes `UserResponse`-Record ohne `password` im Boundary-Layer mappen.

### 3. Fehlgeschlagener Login liefert HTTP 500 statt 401

- **Datei:** `src/main/java/remast/winkelshop/auth/control/AuthService.java:21-23`
- **Beschreibung:** `userRepository.findByEmail(email).filter(...).orElseThrow()` wirft ohne Message
  `NoSuchElementException` → Global Handling → HTTP 500.
- **Fehlerszenario:** Client sendet falsches Passwort (oder unbekannte E-Mail) → 500 Internal Server
  Error statt 401. Falsche Credentials sind ein *erwarteter* Fehlerfall, kein Serverfehler; jedes
  Frontend-Error-Handling darauf bricht.
- **Lösungsvorschlag:** `BadCredentialsException` / `ResponseStatusException(UNAUTHORIZED)` werfen
  (idealerweise ohne Unterscheidung „User existiert / Passwort falsch").

### 4. Flyway-Versionskonflikt: Postgres-Profil zur Laufzeit defekt

- **Datei:** `pom.xml:74-79`
- **Beschreibung:** `flyway-database-postgresql` ist fest auf **12.7.0** gepinnt, während das
  Spring-Boot-4.0.6-Parent `flyway-core` auf **11.14.1** managed. Flyway-DB-Module müssen
  versionsgleich mit `flyway-core` sein. Das Default-Profil (H2) läuft, weil H2-Support in
  `flyway-core` steckt – PostgreSQL-Support liegt seit Flyway 10 aber ausschließlich im Modul.
- **Fehlerszenario:** Start mit Profil `postgres`: Flyway 11.14.1 lädt das 12.7.0-Plugin (per
  ServiceLoader, gegen 12er-API kompiliert) → `FlywayException: No database found to handle
  jdbc:postgresql://…` bzw. `NoSuchMethodError`/`AbstractMethodError`; die Anwendung startet nicht
  bzw. Migrationen laufen nicht. Das Postgres-Setup (`compose.yaml`, `application-postgres.yaml`)
  ist damit aktuell nicht funktionsfähig.
- **Lösungsvorschlag:** `<version>12.7.0</version>` entfernen und die vom Parent gemanagte Version
  (11.14.1) nutzen – oder konsistent beide auf 12.x heben.
- **Hinweis:** Diese Aussage sollte vor der Umsetzung mit `./mvnw dependency:tree` bzw. einem
  Start mit Profil `postgres` verifiziert werden.

---

## Medium

### 5. Tokens verfallen nie – `expiresIn` ist falsch, Memory wächst unbegrenzt

- **Dateien:** `src/main/java/remast/winkelshop/auth/control/TokenStore.java:14-20`,
  `src/main/java/remast/winkelshop/auth/control/AuthService.java:15`
- **Beschreibung:** `TOKEN_EXPIRES_IN_SECONDS = 3600` wird dem Client als `expiresIn` mitgeteilt,
  aber `TokenStore` speichert nur `Map<String, User>` ohne Zeitstempel. Tokens gelten bis zum Logout
  oder App-Neustart – und ohne Logout bis ans Ende der Zeit.
- **Fehlerszenario:** (a) Token wird aus einem Browser-Cache/Log geleakt → dauerhaft gültig.
  (b) Jeder Login ohne Logout bleibt im `ConcurrentHashMap` → in Langzeitbetrieb monotone
  Memory-Erschöpfung.
- **Lösungsvorschlag:** Issued-At speichern (`record TokenEntry(User user, Instant issuedAt)`) und in
  `resolve()` Ablauf prüfen; optional periodische Bereinigung.

### 6. Fail-open Security-Config: `anyRequest().permitAll()`

- **Datei:** `src/main/java/remast/winkelshop/auth/control/SecurityConfig.java:29`
- **Beschreibung:** Nach den expliziten `authenticated()`-Regeln wird alles andere `permitAll()`.
  Neue Endpoints sind damit automatisch öffentlich – das Gegenteil des sicheren Defaults
  `anyRequest().authenticated()`. Hinzu: `/h2-console/**` ist mit `h2.console.enabled: true`
  (globales `application.yaml`) ungeschützt und erlaubt beliebige SQL-Ausführung gegen die
  In-Memory-DB.
- **Fehlerszenario:** Ein neuer Controller (z. B. zukünftiger Admin-Endpoint) wird ergänzt →
  automatisch öffentlich, ohne dass jemand an die Security-Config denkt.
- **Lösungsvorschlag:** `.anyRequest().authenticated()`; H2-Console auf ein Dev-Profil beschränken
  und den Pfad dort explizit freigeben.

### 7. Checkout dekrementiert keinen Lagerbestand → Overselling

- **Dateien:** `src/main/java/remast/winkelshop/order/control/CheckoutService.java:28-77`,
  `src/main/java/remast/winkelshop/order/control/CartService.java:27-29`
- **Beschreibung:** Der Bestand wird nur beim *Hinzufügen zum Warenkorb* über den boolschen Flag
  `inStock` geprüft (Menge vs. `stock` bleibt ungeprüft). Beim Checkout wird `stock` nie
  dekrementiert und nie erneut geprüft – auch nicht die Gesamtmenge über mehrere Zeilen desselben
  Produkts.
- **Fehlerszenario:** 14 Zauberstäbe im Stock; 20 User legen je 1 in den Cart und checken aus → 20
  „placed"-Bestellungen, Stock bleibt 14. `stock`/`in_stock` sind damit nur Dekoration.
- **Lösungsvorschlag:** In der `@Transactional`-Methode `checkout()` für jede Order-Position `stock`
  prüfen (inkl. Aggregation pro Produkt) und atomar dekrementieren
  (`UPDATE ... SET stock = stock - :qty WHERE id = :id AND stock >= :qty`, geänderte Zeilenanzahl
  prüfen) und `in_stock` ggf. auf `false` setzen.

### 8. Checkout mit leerem Warenkorb erzeugt eine leere Bestellung

- **Datei:** `src/main/java/remast/winkelshop/order/control/CheckoutService.java:36-46`
- **Beschreibung:** `consumeCart` liefert bei leerem Cart eine leere Liste; es gibt keine Prüfung.
  Es wird eine Order mit `total = 0.0`, Status „placed" und ohne Items persistiert.
- **Fehlerszenario:** `POST /checkout` ohne vorheriges `POST /cart/items` → HTTP 201 mit leerer
  Bestellung; die Order-Historie füllt sich mit Müll-Datensätzen.
- **Lösungsvorschlag:** Vor dem Anlegen validieren:
  `if (cartItems.isEmpty()) throw new ResponseStatusException(BAD_REQUEST/UNPROCESSABLE_ENTITY,
  "cart is empty")`.

### 9. Konkurrierende Checkouts können den Warenkorb doppelt „verkaufen"

- **Datei:** `src/main/java/remast/winkelshop/order/control/CartService.java:74-78` (SELECT, dann
  DELETE), aufgerufen aus `CheckoutService.java:36`
- **Fehlerszenario:** Doppelklick auf den „Bestellen"-Button → zwei parallele Requests: beide
  Transactions lesen die Cart-Items (READ_COMMITTED verhindert Phantoms nicht), beide legen eine
  Order an; das zweite `deleteAllByUserId` trifft 0 Zeilen, stört aber nicht. Ergebnis: zwei
  komplette Bestellungen aus einem Warenkorb.
- **Lösungsvorschlag:** Das Löschen als Wächter nutzen (z. B. `deleteAllByUserId` vorab ausführen und
  bei Rückgabe 0 abbrechen) oder ein DB-Lock/Idempotency-Token pro Checkout verwenden.

### 10. Architekturverletzung: Control greift auf Boundary zu

- **Dateien:** `AuthService.java:5,25` und `TokenStore.java:4,16` (beide `auth.control` importieren
  `auth.boundary.User`); `OrderService.java:5` und `ProductService.java:7` (beide `order.control`
  importieren `order.boundary.PagedResponse`)
- **Beschreibung:** AGENTS.md erlaubt nur „Boundary → Control → Entity". Vier Control-Klassen hängen
  an Boundary-Typen. Das Dto `PagedResponse` (ein Boundary-Response-Format inkl. `SortDetails` /
  `PageableDetails` für den JSON-Client) formatiert hier den Rückgabewert der Services.
- **Fehlerszenario:** Jede Änderung des Wire-Formats (`PagedResponse`, `User`) ist eine Änderung *am
  Boundary*, die Control-Klassen und deren Tests mitreißt; eine Aufteilung der Komponenten in Module
  (via Spring Modulith/ArchUnit prüfbar) ist so unmöglich.
- **Lösungsvorschlag:** `User` nach `auth.control` verschieben; `OrderService`/`ProductService` eine
  fachliche Rückgabe (Liste + Total) geben lassen und das `PagedResponse`-Mapping in die Controller
  verlagern – oder `PagedResponse` in ein neutrales/shared Package legen.

---

## Low

### 11. Kein Merging von Cart-Positionen desselben Produkts

- **Dateien:** `CartService.java:24-40`; Schema `V001__init_schema.sql:31` (`item_id UNIQUE`, aber
  `item_id` ist ein frischer Zufalls-UUID pro Insert)
- **Fehlerszenario:** Zweimal `POST /cart/items` mit gleichem `productId` → zwei Zeilen; zwei
  Order-Items. Im Gegensatz zum Wishlist-Service (`findByUserIdAndProductId`), der dedupliziert,
  erscheint das Produkt in der Bestellung doppelt.
- **Lösungsvorschlag:** Beim Add nach existierender (userId, productId)-Zeile suchen und Menge
  addieren.

### 12. Race Condition beim Wishlist-Add → 500 bei konkurrierenden Requests

- **Datei:** `WishlistService.java:27-34`
- **Fehlerszenario:** Prüfe-dann-insert ohne Lock; das DB-Constraint
  `uq_wishlist_items_user_product` (V003:9) fängt die Race ab – als
  `DataIntegrityViolationException` → HTTP 500.
- **Lösungsvorschlag:** Die `DataIntegrityViolationException` abfangen oder über
  `INSERT ... ON CONFLICT DO NOTHING` idempotent machen.

### 13. Fehlende Bean-Validation auf `productId` → 500 statt 400

- **Dateien:** `CartController.java:56` (`AddCartItemRequest.productId` ohne `@NotNull`),
  `WishlistController.java:29,45` (`@RequestBody` ganz ohne `@Valid`, `productId` ohne `@NotNull`)
- **Fehlerszenario:** `POST /wishlist/items` mit `{"productId": null}` → `findById(null)` wirft
  `IllegalArgumentException` / `InvalidDataAccessApiUsageException` → HTTP 500.
- **Lösungsvorschlag:** `@Valid` ergänzen, `@NotNull` auf `productId`.

### 14. Geldbeträge als `double` trotz `DECIMAL(10,2)`

- **Dateien:** `ProductEntity.java:14`, `CartItemEntity.java:16`, `OrderEntity.java:15`,
  `CheckoutService.java:43` (`item.unitPrice() * item.quantity()`)
- **Fehlerszenario:** Binäre Gleitkommadarstellung führt zu Rundungsartefakten bei
  Summierung/Serialisierung; DB rundet stillschweigend beim Schreiben in `DECIMAL`, Java-seitig
  bleibt der ungerundete Wert (Cart-Anzeige `totalPrice()` vs. persistierte Order-`total` können
  abweichen).
- **Lösungsvorschlag:** `BigDecimal` für Preise/Summen verwenden (inkl. `lineTotal()` in
  `Cart.java:17-19`).

### 15. N+1-Produktlookups in Cart/Wishlist/Checkout

- **Dateien:** `CartService.java:43-49`, `WishlistService.java:38-52`,
  `CheckoutService.java:38-46` (zusätzlich impures `products.put` in einer `map`-Stufe)
- **Fehlerszenario:** Warenkorb mit 50 Positionen → 50 einzelne `findById`-Queries pro GET. Aktuell
  unkritisch (kleine Carts, PK-Lookups), skaliert aber linear mit der Zeilenzahl.
- **Lösungsvorschlag:** `findAllById(...)` bzw. einen Join-Query verwenden. (`CheckoutService`:
  Produkt einmalig je `productId` laden, statt pro Item.)

### 16. Unbegrenzte Page-Size

- **Dateien:** `ProductService.java:42-44`, `OrderService.java:28-29`
- **Fehlerszenario:** `GET /products?size=2000000` → `Math.max(size, 1)` klemmt nur den *unteren*
  Rand → riesige Query/Response.
- **Lösungsvorschlag:** Oberes Limit clampen (z. B. `Math.min(size, 100)`).

### 17. `requests.http` ist gegen die Seed-Daten kaputt

- **Dateien:** `requests.http:90-91` vs. `V002__seed_data.sql:11`
- **Fehlerszenario:** Login mit `harry.potter@hogwarts.test` / `Expelliarmus123!` – geseedet ist
  `harry@hog.warts` / `123`. Jede Authentifizierungsanfrage der Datei schlägt fehl (aktuell sogar mit
  500, siehe #3); das Dokument ist als funktionale Referenz unbrauchbar.
- **Lösungsvorschlag:** Zugangsdaten an die Seed-Data angleichen.

### 18. Auth-Boundary hängt am Boundary eines anderen Components

- **Datei:** `AuthController.java:15` (`import remast.winkelshop.order.boundary.DataResponse`)
- **Fehlerszenario:** `DataResponse` ist ein generischer Envelope im Order-Component; die
  Auth-Componente wird an Order gekoppelt. Bei einer Modularisierung bricht Auth.
- **Lösungsvorschlag:** `DataResponse` in ein gemeinsames `api`-Package verschieben.

### 19. Testabdeckung zu dünn für die Risikozonen

- **Dateien:** `src/test/java/**` (nur `CartServiceTest`, `WishlistServiceTest`, `CartTest`,
  `contextLoads`)
- **Beschreibung:** Für die fehleranfälligsten Bereiche existieren keine Tests: Login-Fehlerfall
  (#3), Token-Expiry/Logout (#5), Security-Config (#6; `@SpringBootTest` + `spring-security-test`
  liegt bei), Checkout (#7, #8), Order-Scoping.
- **Lösungsvorschlag:** Mindestens einen MockMvc-Test je Security-Pfad (401 ohne Token, Zugriff nur
  auf eigene Cart/Orders) und Checkout-Tests ergänzen.

---

## Explizit geprüft – keine Beanstandung

- **Migrations vs. Entity-Mappings:** Alle `@Table`/`@Column`-Mappings von `CartItemEntity`,
  `WishlistItemEntity`, `ProductEntity`, `OrderEntity`, `OrderItemEntity`, `CategoryEntity`,
  `UserEntity` decken sich mit `V001`/`V003` (inkl. `shipping_*`-Spalten und `created_at`).
- **IDOR/Zugriffsscoping:** Cart-, Wishlist- und Order-Zugriffe sind durchgehend nach `userId`
  gefiltert (`findByUserIdAndItemId`, `findByIdAndUserId`, `findPageByUserId`).
- **Paginierung:** Orders und Products sind korrekt seitenweise implementiert (`LIMIT/OFFSET` bzw.
  `Pageable`).
- **Session/CSRF:** `STATELESS` + CSRF-disabled ist für eine reine Bearer-Token-API korrekt; der
  Filter setzt nur bei gültigem Token eine Authentication und ist idempotent.
- **`PagedResponse`-Berechnungen:** `last`, `totalPages`, Empty-Case sind mathematisch korrekt.
- **Tests:** Die existierenden Tests sind sauber aufgebaut und folgen den Konventionen (individuelle
  Tests, fachlich nachvollziehbare Namen, Given/When/Then).

---

## Empfohlene Reihenfolge

1. **Quick Wins:** #2 (Passwort aus Response entfernen), #3 (401 statt 500), #4 (Flyway-Version
   prüfen/entfernen), #6 (`anyRequest().authenticated()`).
2. **Korrektheit:** #7/#8/#9 (Checkout-Validierung, Stock-Dekrement, idempotentes Consume), #5
   (Token-Expiry).
3. **Struktur:** #10 (`User` nach `control`, `PagedResponse`-Mapping in Controller), #14
   (`BigDecimal`).
4. **Tests:** MockMvc-Abdeckung für 401, User-Scoping und Checkout – hätte #3, #7 und #8 abgefangen.

## Anmerkung zum Review-Setup

Der Agent `.opencode/agents/cross-review.md` ist mit `cortecs/glm-5.3#medium` konfiguriert, dieser
Variant existiert jedoch nicht (verfügbar: `low`, `high`, `max`). Der Review-Lauf wurde deshalb mit
`#high` durchgeführt.
