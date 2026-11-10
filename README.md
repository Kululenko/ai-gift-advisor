# KI-Geschenkefinder · Portfolio-Auszug

**Freitext verstehen, Daten prüfen, nachvollziehbare Vorschläge auswählen.** Dieser eigenständige Auszug zeigt die Architektur des KI-Finders auf [geschenkideengenerator.com](https://geschenkideengenerator.com/) – von der strukturierten Interpretation bis zur regelbasierten Auswahl aus einem Katalog.

> **Demo statt Produktivsystem:** Die lokale Anwendung simuliert die Modellantwort mit einem einfachen Parser. Alle Beispielprodukte und Preise sind erfunden. Sie stellt keine externe KI-Anfrage und benötigt keinen API-Schlüssel. Das ist keine Messung der Qualität eines Sprachmodells.

## Lokal ausprobieren

Voraussetzung: Node.js 22 oder neuer. Zusätzliche Pakete werden nicht benötigt.

```sh
npm start
```

Danach [http://127.0.0.1:4184](http://127.0.0.1:4184) öffnen und eine Beschreibung eingeben. Mit `Strg+C` wird der lokale Server beendet.

```sh
npm test
```

Die Tests verwenden fiktive Daten und kontrollierte Modellantworten; sie prüfen Auswahl, Validierung und das Verhalten bei parallelen Budgetreservierungen. Es entstehen keine API-Kosten.

## Wie der echte Finder arbeitet

1. Ein Sprachmodell erhält die Beschreibung und erstellt ein strukturiertes Suchprofil mit Interessen und – soweit genannt – Alter, Budget und Ausschlüssen.
2. Der Server validiert das Profil. Eindeutig im Text genannte Alters- und Budgetgrenzen werden zusätzlich lokal berücksichtigt.
3. Die Auswahl verwendet ausschließlich Produkte und Links aus dem vorhandenen Katalog. Sie filtert nach Metadaten, bewertet die passenden Interessen und vermeidet bestimmte Dubletten.
4. Fehlen wichtige Angaben oder gibt es keinen ausreichend passenden Katalogtreffer, kann das System nachfragen beziehungsweise keinen Vorschlag ausgeben.

```text
Beschreibung → Modell: strukturiertes Profil → Validierung → Katalogfilter → Ergebnis
```

Die Produktionslösung verwendet JavaScript, Netlify Functions, OpenAI Responses API und einen gemeinsam genutzten Store für Kontingente. Sie begrenzt Eingabe und Ausgabelänge, Zeit und Nutzungsbudget und reserviert ein Budget vor dem Modellaufruf. Die lokale Demo ersetzt sowohl Modellzugriff als auch den persistenten Store. Die Vorlagen in diesem Repository sind kein fertiges Deployment und sollen nicht unverändert öffentlich betrieben werden; dafür müssten Modellverfügbarkeit, aktuelle Kosten, Identität der Anfragen, Speicher, Datenschutz und Sicherheitskonfiguration geprüft werden.

## Was dieser Auszug enthält

| Pfad | Inhalt |
| --- | --- |
| `server/gift-advisor.mjs` | Anfrageprüfung, strukturiertes Modellformat, Validierung und Auswahl |
| `server/advisor-quota.mjs` | Kontingentreservierung mit bedingten Schreibvorgängen |
| `static/` | Auswahl- und Parsinglogik aus dem bestehenden Projekt |
| `demo/` | Lokale Oberfläche, simulierte Modellantwort und erfundener Katalog |
| `tests/` | Automatisierte Tests für Grenzen und Auswahl |

Der Kern wurde aus dem bestehenden privaten Produktprojekt als eigener Snapshot übernommen. Ein produktiver Affiliate-Standardwert wurde durch einen Beispielwert ersetzt. Der Katalog, die Demo und ein Teil der Tests wurden für dieses Portfolio erstellt; die ursprüngliche Git-Historie und der Produktkatalog sind nicht enthalten. Die Modell- und Kostenangaben im Kerncode spiegeln den damaligen Stand wider und sind keine aktuelle Preisgarantie.

## Grenzen und Auswertung

Katalogmetadaten können unvollständig und Preise veraltet sein. Der Finder garantiert weder Verfügbarkeit noch Eignung für Allergien oder Kompatibilität. Die Regeln sind keine allgemeine Lösung für jedes Geschenk und modellbasierte Interpretationen können Fehler enthalten.

Am 4. November 2026 wurden im Produktprojekt 100 fiktive Beschreibungen mit einem Modell ausgewertet. Nach einer Überarbeitung der Katalogauswahl und erneuter Verwendung derselben gespeicherten Modellantworten ergaben sich 83 Fälle mit mindestens einem Vorschlag, 13 Rückfragen und vier Fälle ohne Treffer. Das beschreibt diesen begrenzten Testdatensatz, keine allgemeine Qualitätsquote. Die Rohdaten sind in diesem Auszug nicht enthalten.

## Arbeitsweise

Aleks Paramonov legt Produktentscheidungen, Architektur und Abnahmekriterien fest. Coding-Agenten unterstützen bei der Umsetzung; Ergebnisse werden anhand von Tests und Auswertungen geprüft. Dieser Auszug enthält auch Code aus dieser Arbeitsweise.
