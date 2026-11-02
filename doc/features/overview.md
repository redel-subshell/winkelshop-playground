# High-Level-Spezifikation: Zauberbedarf Online Shop

## Überblick

Ein Online-Shop für magischen Bedarf (Zauberstäbe, Bücher, Tränke, Roben u. v. m.). Artikel sind in Kategorien organisiert. Ein Checkout-Prozess ermöglicht Bestellungen ohne echte Zahlungsabwicklung (Simulation/Platzhalter).

## Test-Accounts (vordefiniert)

Für Demo- und Testzwecke ist **keine Registrierung** vorgesehen. Stattdessen stehen folgende Käufer-Accounts bereit:

| Name | E-Mail                     | Passwort | Rolle |
|------|----------------------------|----------|-------|
| Harry Potter | harry@hog.warts            | 123 | Käufer |
| Hermione Granger | hermione@hog.warts | 123 | Käufer |
| Ron Weasley | ron@hog.warts    | 123 | Käufer |
| Draco Malfoy | draco@hog.warts  | 123 | Käufer |
| Luna Lovegood | luna@hog.warts   | 123 | Käufer |

---

## Akteure

| Akteur | Beschreibung |
|--------|-------------|
| **Besucher** | Nicht eingeloggter Nutzer; kann stöbern und suchen |
| **Käufer** | Eingeloggter Besucher; kann kaufen und Bestellungen einsehen |

Ein Käufer erbt alle Fähigkeiten eines Besuchers (Generalisierung).

---

## Use Cases – Besucher (anonym)

### UC-01: Kategorien durchsuchen
**Akteur:** Besucher  
**Ziel:** Überblick über das Sortiment nach Themenbereichen gewinnen  
**Beschreibung:** Der Besucher sieht eine strukturierte Übersicht der Produktkategorien (z. B. Zauberstäbe, Bücher & Lernmittel, Tränke & Zutaten, Roben & Kleidung, Tierbedarf). Er navigiert in eine Kategorie und sieht die zugehörigen Artikel.  
**Vorbedingung:** Shop ist erreichbar  
**Ergebnis:** Artikelliste der gewählten Kategorie wird angezeigt

---

### UC-02: Artikel suchen & filtern
**Akteur:** Besucher  
**Ziel:** Gezielt nach einem bestimmten Produkt suchen  
**Beschreibung:** Über eine Suchleiste gibt der Besucher einen Begriff ein. Ergebnisse können nach Kategorie, Preis oder Verfügbarkeit gefiltert werden.  
**Vorbedingung:** –  
**Ergebnis:** Gefilterte Trefferliste wird angezeigt

---

### UC-03: Artikeldetails anzeigen
**Akteur:** Besucher  
**Ziel:** Detailinformationen zu einem Produkt einsehen  
**Beschreibung:** Der Besucher öffnet einen Artikel und sieht Name, Beschreibung, Preis, Verfügbarkeit, Kategorie und ein Bild.  
**Vorbedingung:** Artikel existiert  
**Ergebnis:** Detailseite des Artikels

---

### UC-04: Anmelden / Abmelden
**Akteur:** Besucher  
**Ziel:** Mit bestehendem Konto einloggen  
**Beschreibung:** Der Besucher gibt Anmeldedaten eines vorhandenen (vordefinierten) Kontos ein. Bei Erfolg erhält er Zugang zu Käufer-Funktionen. Abmelden beendet die Sitzung.  
**Vorbedingung:** Konto existiert  
**Ergebnis:** Benutzer ist ein- oder ausgeloggt

---

## Use Cases – Käufer (eingeloggt)

### UC-05: Artikel in Warenkorb legen
**Akteur:** Käufer  
**Ziel:** Gewünschte Artikel für den Kauf vormerken  
**Beschreibung:** Auf der Detailseite oder Listenansicht wählt der Käufer eine Menge und legt den Artikel in den Warenkorb.  
**Vorbedingung:** Käufer ist eingeloggt, Artikel ist verfügbar  
**Ergebnis:** Artikel befindet sich im Warenkorb

---

### UC-06: Warenkorb verwalten
**Akteur:** Käufer  
**Ziel:** Warenkorb prüfen und anpassen  
**Beschreibung:** Der Käufer sieht alle vorgemerkten Artikel mit Mengen und Gesamtpreis. Er kann Mengen ändern oder Artikel entfernen.  
**Vorbedingung:** Warenkorb enthält mindestens einen Artikel  
**Ergebnis:** Aktualisierter Warenkorb

---

### UC-07: Checkout durchführen
**Akteur:** Käufer  
**Ziel:** Bestellung abschicken  
**Beschreibung:** Der Käufer gibt eine Lieferadresse an und wählt eine Zahlungsart (Simulation: z. B. „Galleon-Überweisung" oder „Auf Rechnung"). Eine echte Zahlungsabwicklung findet nicht statt. Der Käufer bestätigt die Bestellung.  
**Vorbedingung:** Warenkorb nicht leer, Käufer eingeloggt  
**Ergebnis:** Bestellung wird angelegt, Warenkorb wird geleert  
**Untergeordnete Schritte:**  
1. Lieferadresse eingeben / bestätigen  
2. Zahlungsart wählen (Simulation)  
3. Bestellübersicht prüfen  
4. Bestellung absenden

---

### UC-08: Bestellbestätigung erhalten
**Akteur:** Käufer  
**Ziel:** Sicherheit über die aufgegebene Bestellung  
**Beschreibung:** Nach erfolgreichem Checkout wird eine Bestätigungsseite angezeigt (Bestellnummer, Zusammenfassung). Eine Bestätigungs-E-Mail (simuliert) wird versendet.  
**Vorbedingung:** Checkout wurde erfolgreich abgeschlossen  
**Ergebnis:** Bestätigungsseite und -mail mit Bestelldetails

---

### UC-09: Bestellhistorie anzeigen
**Akteur:** Käufer  
**Ziel:** Vergangene Bestellungen einsehen  
**Beschreibung:** Im persönlichen Bereich sieht der Käufer eine Liste seiner Bestellungen mit Datum, Status und bestellten Artikeln.  
**Vorbedingung:** Mindestens eine Bestellung vorhanden  
**Ergebnis:** Übersicht aller Bestellungen

---

## Datenbereiche (grobe Übersicht)

| Entität | Wichtige Attribute |
|---------|-------------------|
| Artikel | ID, Name, Beschreibung, Preis, Lagerbestand, Kategorie(n), Bild, aktiv |
| Kategorie | ID, Name, Beschreibung, aktiv |
| Benutzer | ID, Name, E-Mail, Passwort (gehasht), Rolle (Käufer/Admin), Adresse |
| Warenkorb | Benutzer-Ref, Artikel-Positionen, Menge, Zeitstempel |
| Bestellung | ID, Benutzer-Ref, Positionen, Gesamtbetrag, Lieferadresse, Zahlungsart, Status, Datum |

---

## Out of Scope (bewusst ausgelassen)

- Echte Zahlungsabwicklung
- Bewertungen & Rezensionen
- Wunschliste
- Rabattcodes / Aktionen
- Mehrstufige Rollenverwaltung
- Selbstregistrierung von Nutzern

---

*Version 0.2 – Registrierung entfernt, Test-Accounts ergänzt*