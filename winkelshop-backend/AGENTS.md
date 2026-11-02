# Winkelshop Backend

## Architektur

* Struktur folgt der "Boundary Control Entity Architecture"
* Es gibt auf der obersten Ebene Business Components nach fachlichem Schnitt wie "Order" oder "User Management"
* Innerhalb einer Business Component "Order" gibt es die Packages Boundary, Control und Entity
* Zugriffe sind nur erlaubt von Boundary → Control → Entity

### Boundary
The boundary layer serves as the entry point for external actors (users, other systems, schedulers, message brokers, ...), providing appropriate interfaces (REST APIs, GraphQL endpoints, message handlers, Lambda function handlers, web components / custom elements, etc.) depending on the actor type.

Exposes the functionality of components to users and systems.
User interfaces and API endpoints
Input validation and transformation
Coarse-grained operations

Naming: REST Controllers are named like `CartController`

### Control
The orchestration layer containing business logic

Actions / commands
Stateless procedural logic

Naming: Services are named like `OrderService`

### Entity
The domain model layer representing core business concepts

Application data
Domain objects and data classes
Business entities
Persistence mappings

## Coding Konventionen

* Moderner Java Code für Java 25
* Nutze var Keyword, Records
* funktionaler Style mit Streams statt Schleifen

## Test Konventionen

* Nutze fachlich sprechende Namen
* Bevorzuge eher einzelne Tests anstatt parametrisierter Tests.

## Build

Nutze Build Tool Maven mit `mvnw` Wrapper für Build und Test