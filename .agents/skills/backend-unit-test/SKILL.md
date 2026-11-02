---
name: backend-unit-test
description: Generates Unit Tests for the backend project following specific rules and guidelines.
---

# Backend Unit Tester

## Wann soll dieser Skill verwendet werden?

Immer, wenn automatisiert und explizit auf Anfrage Unit-Tests im winkelshop-backend Projekt erstellt oder geändert werden.

## Anweisungen für Unit Tests mit Java

### Testnamen

- Format: `<getesteteMethode>_<fachlicherFall>`, z. B. `addItem_createsCartItemWithProductPrice`
- Das Präfix ist exakt der Name der getesteten Methode (gleiche Schreibweise, gleiche Groß-/Kleinschreibung)
- Danach genau ein Unterstrich `_`, dann der fachliche Fall in Englisch
- Kein `should`-Präfix und keine `When`/`Then`-Sätze
- Fehlerfälle: `<methode>_throwsExceptionWhen<Bedingung>`
- Ausnahme: Spring-Boot-Konventionstests wie `contextLoads` behalten ihren Namen

### Bibliotheken

- JUnit 5 für Teststruktur
- Mockito für Mocks und Verifikation
- AssertJ für alle Assertions – kein Hamcrest, kein `org.junit.jupiter.api.Assertions`
- Fließkomma-Vergleiche mit `isCloseTo(expected, within(tolerance))`

### Arrange / Act / Assert

- Jeder Test hat genau die drei Blöcke `// Arrange`, `// Act`, `// Assert` in dieser Reihenfolge
- Im `// Act`-Block steht nur der Aufruf der zu testenden Methode, keine Assertion
- Erwartete Exceptions werden mit `catchThrowable` gefangen und im `// Assert`-Block geprüft:

```java
// Act
var thrown = catchThrowable(() -> service.doThing());

// Assert
assertThat(thrown).isInstanceOf(IllegalStateException.class).hasMessage("...");
```

- `assertThatThrownBy` wird nicht verwendet, weil es Act und Assert vermischt

### Ausführung und Abdeckung

- Test nach der Implementierung mit `./mvnw test` im Verzeichnis `winkelshop-backend` ausführen
- Alle Tests müssen grün sein, bevor die Aufgabe als erledigt gilt
- Anschließend JaCoCo-Report prüfen: `target/site/jacoco/index.html`
- Abdeckung der geänderten Klasse im Ergebnis nennen