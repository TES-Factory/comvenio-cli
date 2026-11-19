---
type: tech-teilsystem
kennung: mcp-server
titel: MCP-Server — Werkzeuge, Konnektoren, Auth
repository: comvenio-cli
stand: teilweise
entitaeten: []
routen: []
cli: []
dateien:
- apps/mcp-server/**
use_cases:
- UC-1
- UC-2
- UC-3
- UC-4
- UC-5
- UC-6
- UC-7
entscheidungen: []
faehigkeiten:
- mcp-server
- oeffentliche-werkzeuge
- lazy-auth
- rechte-filter
- mandantentrennung
- fachwerkzeuge
- vorschau-und-bestaetigung
- widgets
- jobs-und-dateien
- hilfe
- fehlerantworten
- betrieb
quellen: []
letzte_beschreibung:
  klammer: null
  commit: null
---

# MCP-Server — Werkzeuge, Konnektoren, Auth

## Zweck

Der MCP-Server ist der Comvenio AI Connector: Er macht die Vereinsfunktionen, die das comvenio-CLI nutzt, in ChatGPT und Claude als Remote-MCP-Werkzeuge verfügbar — für Mitglieder, Nutzer und Verwalter aller angeschlossenen Vereine. Ein kanonischer Werkzeugkatalog trägt Namen, Schemata, Sicherheitsklasse, OAuth-Scopes, Vereinsrechte und Widget-Bindungen; Rechte werden vor der Werkzeugauswahl ermittelt und bei jedem Backend-Aufruf erneut durchgesetzt. Dazu kommen MCP-Apps-Widgets, Vorschau und Bestätigung kritischer Schreibvorgänge, asynchrone Jobs mit Dateiprüfung, eine Hilfe und einheitliche Fehlerantworten. <!-- q: code:apps/mcp-server/src/runtime-tools.ts#createRuntimeServer; code:apps/mcp-server/src/runtime-tools.ts#createRuntimeToolCatalog; code:apps/mcp-server/src/domain-runtime.ts#registerFullDomainRuntime; code:apps/mcp-server/src/widget-runtime.ts#registerFullWidgetRuntime; comvenio-ai-connector; comvenio-ai-connector-02 -->

<!-- techdoc:luecke Begründung fehlt: Das Hilfe-Werkzeug hat kein Lastenheft mit Kennung, nur Code und Tests -->

## Use Cases

**UC-1 Öffentliches ohne Anmeldung lesen.** Akteur: anonyme Nutzer in ChatGPT oder Claude. Auslöser: öffentliche Lesewerkzeuge, etwa veröffentlichte Termine, News und Speisepläne. Ablauf: Öffentliche Werkzeuge laufen ohne Login mit dem Scope `public.read`; die Antworten werden vor der Rückgabe auf öffentliche Felder reduziert. Ergebnis: öffentliche Vereinsinhalte im Chat. <!-- q: code:apps/mcp-server/src/runtime-tools.ts#createRuntimeAccessPolicy; code:apps/mcp-server/src/public/redaction.ts#eventRecord; code:apps/mcp-server/src/public/redaction.ts#newsRecord; comvenio-ai-connector-06 -->

**UC-2 Anmelden, wenn es privat wird (Lazy Auth).** Akteur: Mitglieder und Verwalter. Auslöser: Aufruf eines privaten oder schreibenden Werkzeugs ohne passenden Scope. Ablauf: Der Server antwortet mit einer OAuth-Challenge samt aller nötigen Scopes; der Nutzer meldet sich im Comvenio-Browserflow an, wählt bei mehreren Vereinen einen und genehmigt die Scopes. Scopes geben nie mehr Rechte, als der Backend-RBAC zulässt. Ergebnis: verbundenes Konto mit Vereinsbindung. <!-- q: code:apps/mcp-server/src/oauth-tool-challenge.ts#insufficientScopeToolResult; code:apps/mcp-server/src/tool-security-schemes.ts#installToolSecuritySchemeProjection; code:apps/mcp-server/src/http/auth.ts#extractBearerToken; comvenio-ai-connector-03; comvenio-ai-connector-06 -->

**UC-3 Vereinsfunktionen als Werkzeuge nutzen.** Akteur: Mitglieder und Verwalter nach ihren Vereinsrechten. Auslöser: Fachwerkzeuge der Domänen Identität, Verein, Mitglieder, Teams und Rollen; Veranstaltungen und Planung; Sitzungen und Turniere; Buchungen, Objekte und Aufgaben; Rezepte, Speisepläne und Einkäufe; Homepage, News und Daten; Sponsoring und Marketing; Finanzen. Ablauf: Jedes Werkzeug entsteht aus einem geprüften Operationsvertrag und ruft die öffentliche Dienst-API mit expliziter `club_id`; der Dienst prüft Mandant, Rolle und Fachobjekt erneut. Ergebnis: Vereinsarbeit im Chat. <!-- q: code:apps/mcp-server/src/domain-runtime.ts#registerFullDomainRuntime; code:apps/mcp-server/src/domain-runtime.ts#fullDomainOperationContracts; code:apps/mcp-server/src/domain-runtime.ts#domainToolName; comvenio-ai-connector-07; comvenio-ai-connector-08; comvenio-ai-connector-09; comvenio-ai-connector-10; comvenio-ai-connector-11; comvenio-ai-connector-12; comvenio-ai-connector-13 -->

**UC-4 Kritisches mit Vorschau bestätigen.** Akteur: Verwalter. Auslöser: Veröffentlichen, Löschen, Massenänderung, Import, Export personenbezogener Daten. Ablauf: Der Server erstellt eine Vorschau mit Verein, Ziel, Wirkung je Operation (anlegen, ändern, löschen), betroffener Anzahl und maskierten Feldern und gibt ein kurzlebiges Bestätigungstoken aus, gebunden an Nutzer, Verein, Payload-Hash und Aktion; erst die zweite Bestätigung führt aus. Ergebnis: bewusst bestätigte, wiederholungssichere Änderung. <!-- q: code:apps/mcp-server/src/domain-runtime.ts#impactFor; code:apps/mcp-server/src/domain-state-store.ts#confirmationMatchHash; code:apps/mcp-server/src/domain-state-store.ts#sealJson; comvenio-ai-connector-14; comvenio-ai-connector-20 -->

**UC-5 Widgets im Chat bedienen.** Akteur: Mitglieder und Verwalter. Auslöser: Widget-Werkzeuge für Event und Kalender, Mitgliederverwaltung, Buchung und Objekt, News sowie das Vorschau- und Bestätigungs-Widget. Ablauf: Das Werkzeug liefert ein auf das Nötige reduziertes Modell, das Widget zeigt es mobil-first an; ohne Vereinsbindung hängt kein Widget-Modell an der Antwort. Ergebnis: bedienbare Oberflächen in ChatGPT und Claude. <!-- q: code:apps/mcp-server/src/widget-runtime.ts#registerFullWidgetRuntime; code:apps/mcp-server/src/runtime-tools.ts#projectPublicWidgetModel; comvenio-ai-connector-16; comvenio-ai-connector-17; comvenio-ai-connector-18; comvenio-ai-connector-19; comvenio-ai-connector-20 -->

**UC-6 Lange Läufe und Dateien.** Akteur: Verwalter. Auslöser: Werkzeuge für Uploads und Jobs, etwa Daten-Upload oder Schrift-Upload des Vereins. Ablauf: Nur wenn die Konfigurationsgruppe für Uploads und Jobs vollständig gesetzt ist, erscheinen die Plattformwerkzeuge. Eine hochgeladene Datei landet in Quarantäne, wird auf Typ (Magic Bytes), Größe, ZIP-Inhalt und Schadcode geprüft und genau einmal verbraucht; der Job speichert seine Eingabe verschlüsselt, ohne Token, und ist idempotent; das Ergebnis liest nur der Auftraggeber. Ergebnis: geprüfte Datei und Jobergebnis. <!-- q: code:apps/mcp-server/src/job-file-tools.ts#registerJobFileTools; code:apps/mcp-server/src/files/object-inspection.ts#inspectStoredObject; code:apps/mcp-server/src/files/validation.ts#validateStoredObject; code:apps/mcp-server/src/files/zip-inspection.ts#inspectZipDirectory; code:apps/mcp-server/src/files/clamd-scanner.ts#parseClamdResponse; code:apps/mcp-server/src/files/sigv4-presign.ts#presignSigV4; comvenio-ai-connector-15 -->

**UC-7 Hilfe nachschlagen.** Akteur: jeder, auch ohne Anmeldung. Auslöser: das Hilfe-Werkzeug mit Suchbegriff oder Artikelkennung. Ablauf: Es durchsucht die Hilfeartikel (deutsch und englisch, auch Fehlerartikel) unscharf, liefert bei unbekannter Kennung die nächsten Treffer und listet jeden Artikel als Ressource; die öffentliche Liste öffnet nie ein geschütztes Werkzeug. Ergebnis: Antwort aus der Hilfe. <!-- q: code:apps/mcp-server/src/help-tool.ts#registerHelpTool; code:apps/mcp-server/src/help-tool.ts#answerHelp -->

## Funktionsweise

**Katalog und Freigabe.** Der Werkzeugkatalog entsteht aus geprüften Operationsverträgen; veröffentlicht werden nur extern freigegebene Werkzeuge. Der kanonische Review-Katalog bleibt stabil, weil Clients Werkzeuglisten zwischenspeichern; Sichtbarkeit je Nutzer entsteht durch Filtern. <!-- q: code:apps/mcp-server/src/runtime-tools.ts#createRuntimeToolCatalog; code:apps/mcp-server/src/domain-runtime.ts#fullDomainOperationContracts; comvenio-ai-connector-02; comvenio-ai-connector-04 -->

**Rechte und Mandant.** Der Server ermittelt Vereine, Scopes und Rechte-Version; nach der Vereinswahl lädt er die wirksamen Rechte und filtert Werkzeuge und Widget-Aktionen. Ein Nutzer mit mehreren Vereinen muss vor der privaten Werkzeugsuche einen Verein nennen; fremde Mandanten und unbekannte Werkzeuge werden abgewiesen, bevor ein Handler aufgelöst wird; auch zwischengespeicherte Aufrufe werden erneut geprüft. Die native CLI-Route ist von der Anbieter-Identität getrennt. <!-- q: code:apps/mcp-server/src/runtime-tools.ts#createRuntimeAccessPolicy; code:apps/mcp-server/src/http/context.ts#requestRisk; comvenio-ai-connector-04 -->

**Schreibklassen.** Lesen läuft direkt, umkehrbares Schreiben auf ausdrücklichen Auftrag mit Ergebnisbeleg, kritisches Schreiben mit Vorschau und zweiter Bestätigung, lange Läufe als Job mit Statusabfrage. Bestätigungen und abgeschlossene Schreibvorgänge liegen verschlüsselt im Zustandsspeicher; eine Bestätigung wird genau einmal verbraucht, ein wiederholter Schreibvorgang liefert das frühere Ergebnis, eine geänderte Payload wird abgewiesen. <!-- q: code:apps/mcp-server/src/domain-state-store.ts#sealJson; code:apps/mcp-server/src/domain-state-store.ts#confirmationMatchHash; code:apps/mcp-server/src/domain-runtime.ts#impactFor; comvenio-ai-connector-14 -->

**Fehlerantworten.** Jede Werkzeugantwort im Fehlerfall hat eine öffentliche Form: fehlender Scope als `SCOPE_REQUIRED` mit allen Scopes, Login-Befehl und Step-up; fehlendes Vereinsrecht als `PERMISSION_DENIED` mit dem Recht als Kategorie; Konflikte und Validierungsfehler behalten den Grund des Dienstes, aber nur einen geprüften Code in seinem zugelassenen Aufbau (Code, Zusatzfelder des Clients, bei Versionskonflikten fester Text und Tab-Kennungen); freier Text dahinter wird auf den Code gekürzt; fremde Fehler werden `UNKNOWN_ERROR` mit Anfragekennung. Diese öffentliche Fehlerform ist einmal definiert, und das veröffentlichte `outputSchema` jedes Werkzeugs ist die Vereinigung aus seiner Erfolgsform und ihr (`type: "object"` mit `anyOf`, gemeinsame Definitionen an der Wurzel), weil der SDK-Client `structuredContent` auch bei `isError` gegen das Schema prüft; der Server selbst prüft weiter nur erfolgreiche Antworten gegen die Erfolgsform. Kein Werkzeug wirft einen Fehler an das SDK durch: Jede Registrierung am Server läuft über dieselbe Fehlergrenze, auch später hinzukommende Werkzeuge; der Rückfall des SDK nennt nur die eigene Eingabe oder den Werkzeugnamen, alles andere wird `UNKNOWN_ERROR`. Ein fehlgeschlagener Lauf einer Agent-Funktion trägt keinen Text des Dienstes, der Grund steht am Lauf in Web oder App. <!-- q: code:apps/mcp-server/src/runtime-tools.ts#registerAgentFunctionTools; code:apps/mcp-server/src/public-tool-error.ts#publicToolError; code:apps/mcp-server/src/public-tool-error.ts#publicDetail; code:apps/mcp-server/src/tool-error-boundary.ts#guardToolErrors; code:apps/mcp-server/src/oauth-tool-challenge.ts#insufficientScopeToolResult; code:apps/mcp-server/src/public-error-output.ts#withPublicErrorOutput; code:apps/mcp-server/src/tool-security-schemes.ts#installToolSecuritySchemeProjection; bug:8916dcef; bug:b1c53c74; bug:4fd71f53 -->

**Laufberichte.** Dasselbe gilt für Lauf- und Verlaufsdaten der Werkzeuge: Automatisierungsläufe samt auslösendem Ereignis, Kalender-Synchronisationen samt letztem Fehler eines Abos, Läufe der Wochenvorschau, externe Team-Synchronisationen und die Laufreferenzen des Club-Agenten. Nur ein erfolgreicher Automatisierungslauf behält seinen Ergebnistext. Zustand, Art, Auslöser, Grund, Pausegrund und Fehler gehen nur als eines der bekannten Wörter ihres Dienstes hinaus, sonst als fester Code (`run_failed`, `SYNC_FAILED`, `unknown`). Die Fehlerlisten einer Team-Synchronisation tragen Ausnahmetexte, deshalb geht von ihnen nur die Anzahl hinaus, auch wenn der Dienst einen einzelnen Text statt einer Liste schickt; ihr Laufergebnis geht als feste Projektion hinaus, unbekannte Felder bleiben drinnen, und die letzte Zusammenfassung nur mit den vier bekannten Zählern. Zeitpunkte und Kennungen eines Laufberichts gehen nur in ihrer Form hinaus (Datum oder ISO-Zeitpunkt, UUID, kurze Kennung), sonst leer. Warnungen der Kalendervorschau nennen eine Feed-Kennung und gehen nur als ihre Art hinaus; Art und Zustand einer Klärung nur als bekanntes Wort. Eine Agent-Funktion gibt die Lauf-Kennung nur als UUID und den Freigabelink nur als https-Link in Comvenio ohne Zugangsdaten weiter. Bei typisierten Antworten sitzt die Prüfung im Ausgabeschema, bei offenen in der Antwort des Handlers; sie läuft bei jeder Antwort (MCP-Text, `structuredContent`, CLI). Das veröffentlichte JSON-Schema bleibt unverändert. Ein Mustertest ordnet jedes Freitextfeld jedes Fachwerkzeugs und jede offene Ausgabe eines Lauf-, Sync-, Verlaufs-, Status-, Import- oder Exportwerkzeugs als geschützt oder als eigenen Vereinsinhalt ein; ob ein Werkzeug dazugehört, liest er an Aktion und Teilaktion. Geschützte Werkzeuge bekommen einen Kanarientext in jedes ungeprüfte Textfeld; ausgenommen sind nur Felder mit eigenem Vereinsinhalt wie Name, Titel und Ort, nicht Zeitpunkte und Kennungen. <!-- q: code:apps/mcp-server/src/run-reports.ts#publicAutomationRun; code:apps/mcp-server/src/run-reports.ts#publicSyncRun; code:apps/mcp-server/src/run-reports.ts#publicWeeklyPreviewRun; code:apps/mcp-server/src/run-reports.ts#publicExternalSyncResult; code:apps/mcp-server/src/run-reports.ts#publicAgentRunRef; code:apps/mcp-server/src/run-reports.ts#publicActivationPreview; code:apps/mcp-server/src/run-reports.ts#publicClarification; code:apps/mcp-server/src/run-reports.ts#publicApprovalUrl; code:apps/mcp-server/src/run-reports.ts#publicRunId; bug:7b331d46 -->

**Betrieb.** Der Server startet als Deployment-Kandidat mit geprüfter Prozesskonfiguration und schreibt beim Fehlstart einen Diagnose-Datensatz. <!-- q: code:apps/mcp-server/src/bootstrap.ts#startMcpDeploymentCandidate; code:apps/mcp-server/src/bootstrap.ts#readMcpProcessConfig; code:apps/mcp-server/src/startup-diagnostics.ts#mcpStartupFailureRecord; comvenio-ai-connector-05 -->

<!-- techdoc:erzeugt zustaende -->
_Keine Einträge._
<!-- /techdoc:erzeugt -->


## Datenmodell

<!-- techdoc:erzeugt datenmodell -->
_Keine Einträge._
<!-- /techdoc:erzeugt -->

<!-- techdoc:erzeugt uml-klassen -->
_Keine Einträge._
<!-- /techdoc:erzeugt -->


## Schnittstellen

<!-- techdoc:erzeugt schnittstellen -->
**Routen**

_Keine Einträge._

**CLI**

_Keine Einträge._

**Hooks**

_Keine Einträge._

**Ereignisse**

_Keine Einträge._
<!-- /techdoc:erzeugt -->


## Abhängigkeiten

Der MCP-Server ruft die öffentlichen APIs der Comvenio-Dienste über den gemeinsamen Comvenio-Client, den role-service für wirksame Rechte, den Comvenio-OAuth-Autorisierungsserver, Redis für Bestätigungen, Jobs und Dateizustände, einen S3-kompatiblen Speicher für die Quarantäne und einen ClamAV-Dienst für die Schadcodeprüfung. Aufgerufen wird er von ChatGPT und Claude als Remote-MCP sowie vom lokalen comvenio-CLI über die native Route. <!-- q: code:apps/mcp-server/src/domain-runtime.ts#registerFullDomainRuntime; code:apps/mcp-server/src/files/s3-quarantine.ts#createBunS3Backend; code:apps/mcp-server/src/files/clamd-scanner.ts#parseClamdResponse; code:apps/mcp-server/src/domain-state-store.ts#sealJson; comvenio-ai-connector-01; comvenio-ai-connector-05; comvenio-ai-connector-15 -->

<!-- techdoc:erzeugt abhaengigkeiten -->
Nutzt: cli, pakete-und-integrationen

Genutzt von: cli, pakete-und-integrationen
<!-- /techdoc:erzeugt -->


## Regeln

- Jeder private oder schreibende Werkzeugaufruf trägt `club_id` ausdrücklich; der Dienst prüft Mandant, Rolle, Fachobjekt und Recht bei jedem Aufruf erneut. <!-- q: code:apps/mcp-server/src/runtime-tools.ts#createRuntimeAccessPolicy; comvenio-ai-connector §1; comvenio-ai-connector §4 -->
- Scopes erteilen nie mehr Rechte als der Backend-RBAC; Schreibrechte brauchen einen schreibenden Scope. <!-- q: code:apps/mcp-server/src/oauth-tool-challenge.ts#insufficientScopeToolResult; comvenio-ai-connector §5 -->
- Bestätigungstokens sind kurzlebig und an Nutzer, Verein, Payload-Hash und Aktion gebunden; eine Bestätigung wird genau einmal verbraucht. <!-- q: code:apps/mcp-server/src/domain-state-store.ts#confirmationMatchHash; comvenio-ai-connector §6; comvenio-ai-connector-14 -->
- Die Vorschau zählt die Wirkung je Operation, nicht aus der ganzen Operationsliste der Aktion. <!-- q: code:apps/mcp-server/src/domain-runtime.ts#impactFor; commit:cd7a02b -->
- Plattformwerkzeuge für Uploads und Jobs erscheinen nur bei vollständiger Konfiguration; fehlende Werte werden benannt, fehlerhafte nicht ausgegeben. <!-- q: code:apps/mcp-server/src/job-file-tools.ts#registerJobFileTools; code:apps/mcp-server/src/bootstrap.ts#readMcpProcessConfig; comvenio-ai-connector-15 -->
- Dateien über der harten Größengrenze werden weder gehasht noch geparst; erlaubt sind nur erkannte Typen, deren Bytes zur Angabe passen, und SVG oder HTML nur ohne aktive Inhalte. <!-- q: code:apps/mcp-server/src/files/object-inspection.ts#inspectStoredObject; code:apps/mcp-server/src/files/validation.ts#validateStoredObject -->
- Eine offene Ausgabe (etwa `z.json`), die die Antwort des Dienstes ungeprüft weitergibt, kommt nicht neu hinzu: Der heutige Bestand steht als eingefrorene Liste mit Zählerstand im Repository, ein neuer offener Knoten macht den Mustertest rot, und ein Eintrag, der nicht mehr offen ist, muss aus der Liste. Die Liste wird nur kürzer. <!-- q: code:apps/mcp-server/tests/open-output-ratchet.pattern.test.ts#ratchet; code:apps/mcp-server/tests/support/output-schema.ts#isOpen; bug:da6abb50 -->
- Der Connector erzeugt nur minimale technische Telemetrie ohne Inhalts- und Personendaten; Detailfelder zu Personen brauchen `view_members_details`, Vorschauen maskieren. <!-- q: comvenio-ai-connector §1 -->

## Fehlerbilder

- **Serien-Materialisierung zeigte in der Vorschau Löschungen statt Anlagen** → die Wirkung wurde aus der Aktion samt Liste aller Operationen gelesen, 177 von 801 Operationen waren falsch eingeordnet → Wirkung je Operation. <!-- q: commit:cd7a02b; bug:b956d7dd -->
- **Homepage-Umwandlung verlor Abschnitte und Widgets** → die Reiter-Route des club-service ist flach, die Umwandlung erwartete verschachtelte Reiter und gab leere Abschnitte zurück → Abschnitte und Widgets je Reiter lesen, fremde Vereinsabschnitte brechen ab. <!-- q: commit:58791ad; bug:ddc0a35a -->
- **Jede Terminserie scheiterte mit 422** → die Aktion schickte `name` statt `title` und keine Vorlage → Felder nach dem Vertrag des event-service, `materialize_next` sendet den nächsten Start. <!-- q: commit:089b8bf -->
- **Konflikte kamen ohne Grund beim Nutzer an** → die öffentliche Fehlerantwort verwarf den Grund des Dienstes → Konflikt und Validierungsfehler tragen den Grund (etwa die aktuelle Version). <!-- q: commit:89a3fe9 -->
- **Freier Text hinter einem geprüften Grund erreichte den Kunden** → die Fehlergrenze prüfte nur das erste Wort des Grunds und gab danach den ganzen Text weiter → nur der zugelassene Aufbau je Code geht durch, alles andere wird auf den Code gekürzt. <!-- q: commit:83717cb; code:apps/mcp-server/src/public-tool-error.ts#publicDetail; bug:8916dcef -->
- **Werkzeuge außerhalb der Fehlergrenze zeigten den ganzen Grund des Dienstes** → Aufgaben- und öffentliche Werkzeuge warfen den Fehler weiter, das SDK veröffentlichte seine Meldung samt freiem Dienst-Text → die Registrierung selbst führt jeden geworfenen Fehler über die Fehlergrenze. <!-- q: commit:a81c674; code:apps/mcp-server/src/tool-error-boundary.ts#guardToolErrors; bug:b1c53c74 -->
- **Fehlerantworten scheiterten im SDK-Client an der Schemaprüfung** → der Client (1.29) prüft `structuredContent` auch bei `isError` gegen das `outputSchema`; Werkzeuge mit Schema endeten nach geladener Werkzeugliste in „Structured content does not match“ → das veröffentlichte Schema ist Erfolgsform oder öffentliche Fehlerform. <!-- q: code:apps/mcp-server/src/public-error-output.ts#withPublicErrorOutput; code:apps/mcp-server/src/tool-security-schemes.ts#installToolSecuritySchemeProjection; bug:4fd71f53 -->
- **Laufberichte zeigten den Grund des Dienstes** → Automatisierungsläufe gaben `reason` und `result_text`, Kalender-Synchronisationen `error` und `last_error`, Wochenvorschau-Läufe `error` und externe Team-Synchronisationen ihre Ausnahmetexte ungeprüft weiter, auch bei fehlgeschlagenen Läufen → nur ein erfolgreicher Lauf behält Text, alles andere wird ein bekannter oder fester Code. <!-- q: code:apps/mcp-server/src/run-reports.ts#publicAutomationRun; bug:7b331d46 -->
- **Gleichzeitige Schrift-Uploads konnten sich überschreiben** → Lesen, Liste ersetzen und Nachlesen liefen getrennt → Registrierung in einem gesperrten Aufruf des club-service, ein unbestätigter Aufruf zählt nicht als Erfolg. <!-- q: commit:ab2d4a3 -->

## Code-Anker

<!-- techdoc:erzeugt code-anker -->
| Symbol | Datei |
|---|---|
| createMcpDeploymentCandidate | apps/mcp-server/src/bootstrap.ts |
| csv | apps/mcp-server/src/bootstrap.ts |
| edgeSharedSecret | apps/mcp-server/src/bootstrap.ts |
| environment | apps/mcp-server/src/bootstrap.ts |
| httpsUrl | apps/mcp-server/src/bootstrap.ts |
| jobsFilesConfig | apps/mcp-server/src/bootstrap.ts |
| openAiChallengeToken | apps/mcp-server/src/bootstrap.ts |
| parsePins | apps/mcp-server/src/bootstrap.ts |
| plainValue | apps/mcp-server/src/bootstrap.ts |
| port | apps/mcp-server/src/bootstrap.ts |
| readMcpProcessConfig | apps/mcp-server/src/bootstrap.ts |
| releaseScope | apps/mcp-server/src/bootstrap.ts |
| runtimeReadiness | apps/mcp-server/src/bootstrap.ts |
| runtimeServerFactory | apps/mcp-server/src/bootstrap.ts |
| sharedStateEncryptionKey | apps/mcp-server/src/bootstrap.ts |
| sharedStateRedisUrl | apps/mcp-server/src/bootstrap.ts |
| startMcpDeploymentCandidate | apps/mcp-server/src/bootstrap.ts |
| auditOperationMapping | apps/mcp-server/src/capability-operation-mapping.ts |
| identity | apps/mcp-server/src/capability-operation-mapping.ts |
| sameStrings | apps/mcp-server/src/capability-operation-mapping.ts |
| actionCopy | apps/mcp-server/src/domain-runtime.ts |
| actionOutputSchema | apps/mcp-server/src/domain-runtime.ts |
| actionToolName | apps/mcp-server/src/domain-runtime.ts |
| annotations | apps/mcp-server/src/domain-runtime.ts |
| asToolSet | apps/mcp-server/src/domain-runtime.ts |
| bilderHerausloesen | apps/mcp-server/src/domain-runtime.ts |
| bindOAuthClub | apps/mcp-server/src/domain-runtime.ts |
| callSchema | apps/mcp-server/src/domain-runtime.ts |
| canonical | apps/mcp-server/src/domain-runtime.ts |
| canonicalContractValue | apps/mcp-server/src/domain-runtime.ts |
| confirmationPreview | apps/mcp-server/src/domain-runtime.ts |
| confirmationWidgetResult | apps/mcp-server/src/domain-runtime.ts |
| contractHash | apps/mcp-server/src/domain-runtime.ts |
| definitionMap | apps/mcp-server/src/domain-runtime.ts |
| definitionOperations | apps/mcp-server/src/domain-runtime.ts |
| digest | apps/mcp-server/src/domain-runtime.ts |
| domainToolName | apps/mcp-server/src/domain-runtime.ts |
| executionError | apps/mcp-server/src/domain-runtime.ts |
| externalDomainInputSchema | apps/mcp-server/src/domain-runtime.ts |
| fullDomainCatalogSummary | apps/mcp-server/src/domain-runtime.ts |
| fullDomainOperationContracts | apps/mcp-server/src/domain-runtime.ts |
| fullDomainProtectedToolDescriptors | apps/mcp-server/src/domain-runtime.ts |
| fullDomainReviewToolSummaries | apps/mcp-server/src/domain-runtime.ts |
| highestRisk | apps/mcp-server/src/domain-runtime.ts |
| impactFor | apps/mcp-server/src/domain-runtime.ts |
| outputUnion | apps/mcp-server/src/domain-runtime.ts |
| registerFullDomainRuntime | apps/mcp-server/src/domain-runtime.ts |
| requiredScopes | apps/mcp-server/src/domain-runtime.ts |
| schemaMap | apps/mcp-server/src/domain-runtime.ts |
| selectedOperation | apps/mcp-server/src/domain-runtime.ts |
| toMcpResult | apps/mcp-server/src/domain-runtime.ts |
| withoutConfirmation | apps/mcp-server/src/domain-runtime.ts |
| confirmationMatchHash | apps/mcp-server/src/domain-state-store.ts |
| encryptionKey | apps/mcp-server/src/domain-state-store.ts |
| openJson | apps/mcp-server/src/domain-state-store.ts |
| parseRecord | apps/mcp-server/src/domain-state-store.ts |
| redisDomainStateStore | apps/mcp-server/src/domain-state-store.ts |
| redisKey | apps/mcp-server/src/domain-state-store.ts |
| safeClone | apps/mcp-server/src/domain-state-store.ts |
| sealJson | apps/mcp-server/src/domain-state-store.ts |
| ttlMilliseconds | apps/mcp-server/src/domain-state-store.ts |
| ttlSeconds | apps/mcp-server/src/domain-state-store.ts |
| lengthPrefix | apps/mcp-server/src/files/clamd-scanner.ts |
| parseClamdResponse | apps/mcp-server/src/files/clamd-scanner.ts |
| writeAll | apps/mcp-server/src/files/clamd-scanner.ts |
| holds | apps/mcp-server/src/files/memory-store.ts |
| ascii | apps/mcp-server/src/files/object-inspection.ts |
| classifyCompoundFile | apps/mcp-server/src/files/object-inspection.ts |
| classifyText | apps/mcp-server/src/files/object-inspection.ts |
| classifyZipContainer | apps/mcp-server/src/files/object-inspection.ts |
| dataView | apps/mcp-server/src/files/object-inspection.ts |
| decodeCharacterReferences | apps/mcp-server/src/files/object-inspection.ts |
| detectBinarySignature | apps/mcp-server/src/files/object-inspection.ts |
| ebmlDocType | apps/mcp-server/src/files/object-inspection.ts |
| extensionMatches | apps/mcp-server/src/files/object-inspection.ts |
| headCachedReader | apps/mcp-server/src/files/object-inspection.ts |
| includesSequence | apps/mcp-server/src/files/object-inspection.ts |
| inspectStoredObject | apps/mcp-server/src/files/object-inspection.ts |
| isActiveContentFree | apps/mcp-server/src/files/object-inspection.ts |
| isSfntFont | apps/mcp-server/src/files/object-inspection.ts |
| isWoff2Header | apps/mcp-server/src/files/object-inspection.ts |
| looksLikeHtml | apps/mcp-server/src/files/object-inspection.ts |
| looksLikeSvg | apps/mcp-server/src/files/object-inspection.ts |
| matches | apps/mcp-server/src/files/object-inspection.ts |
| mpegAudioFrame | apps/mcp-server/src/files/object-inspection.ts |
| skipXmlPreamble | apps/mcp-server/src/files/object-inspection.ts |
| streamObject | apps/mcp-server/src/files/object-inspection.ts |
| parseRecord | apps/mcp-server/src/files/redis-store.ts |
| secondsUntil | apps/mcp-server/src/files/redis-store.ts |
| assertConfig | apps/mcp-server/src/files/s3-quarantine.ts |
| assertHttps | apps/mcp-server/src/files/s3-quarantine.ts |
| createBunS3Backend | apps/mcp-server/src/files/s3-quarantine.ts |
| localFile | apps/mcp-server/src/files/s3-quarantine.ts |
| localRead | apps/mcp-server/src/files/s3-quarantine.ts |
| localStream | apps/mcp-server/src/files/s3-quarantine.ts |
| removeLocalCopy | apps/mcp-server/src/files/s3-quarantine.ts |
| after | apps/mcp-server/src/files/service.ts |
| assertActiveMetadata | apps/mcp-server/src/files/service.ts |
| bound | apps/mcp-server/src/files/service.ts |
| guardOf | apps/mcp-server/src/files/service.ts |
| safeObjectKey | apps/mcp-server/src/files/service.ts |
| amzDate | apps/mcp-server/src/files/sigv4-presign.ts |
| canonicalHeaderValue | apps/mcp-server/src/files/sigv4-presign.ts |
| encodeS3Path | apps/mcp-server/src/files/sigv4-presign.ts |
| hmac | apps/mcp-server/src/files/sigv4-presign.ts |
| presignSigV4 | apps/mcp-server/src/files/sigv4-presign.ts |
| sha256Hex | apps/mcp-server/src/files/sigv4-presign.ts |
| uriEncode | apps/mcp-server/src/files/sigv4-presign.ts |
| validateStoredObject | apps/mcp-server/src/files/validation.ts |
| zipRejection | apps/mcp-server/src/files/validation.ts |
| analyzePath | apps/mcp-server/src/files/zip-inspection.ts |
| dataView | apps/mcp-server/src/files/zip-inspection.ts |
| decodeName | apps/mcp-server/src/files/zip-inspection.ts |
| emptyInspection | apps/mcp-server/src/files/zip-inspection.ts |
| inspectZipDirectory | apps/mcp-server/src/files/zip-inspection.ts |
| limitBreached | apps/mcp-server/src/files/zip-inspection.ts |
| readExact | apps/mcp-server/src/files/zip-inspection.ts |
| readStoredEntry | apps/mcp-server/src/files/zip-inspection.ts |
| readZipDirectory | apps/mcp-server/src/files/zip-inspection.ts |
| safeUint64 | apps/mcp-server/src/files/zip-inspection.ts |
| answerHelp | apps/mcp-server/src/help-tool.ts |
| found | apps/mcp-server/src/help-tool.ts |
| helpResourceUri | apps/mcp-server/src/help-tool.ts |
| listing | apps/mcp-server/src/help-tool.ts |
| notFound | apps/mcp-server/src/help-tool.ts |
| registerHelpTool | apps/mcp-server/src/help-tool.ts |
| extractBearerToken | apps/mcp-server/src/http/auth.ts |
| splitMachineIntrospection | apps/mcp-server/src/http/auth.ts |
| assertStatelessContext | apps/mcp-server/src/http/context.ts |
| mcpClientKind | apps/mcp-server/src/http/context.ts |
| messages | apps/mcp-server/src/http/context.ts |
| object | apps/mcp-server/src/http/context.ts |
| protocolVersion | apps/mcp-server/src/http/context.ts |
| requestRisk | apps/mcp-server/src/http/context.ts |
| requestedTenant | apps/mcp-server/src/http/context.ts |
| singleRequestedValue | apps/mcp-server/src/http/context.ts |
| deployment | apps/mcp-server/src/http/deployment.ts |
| railwayDeploymentConfig | apps/mcp-server/src/http/deployment.ts |
| validateRailwayDeploymentConfig | apps/mcp-server/src/http/deployment.ts |
| jsonRpcErrorBody | apps/mcp-server/src/http/errors.ts |
| runtimeError | apps/mcp-server/src/http/errors.ts |
| toHttpError | apps/mcp-server/src/http/errors.ts |
| edgeSecretMatches | apps/mcp-server/src/http/server.ts |
| methodForTelemetry | apps/mcp-server/src/http/server.ts |
| normalizeOptionalToolArguments | apps/mcp-server/src/http/server.ts |
| validEdgeSecret | apps/mcp-server/src/http/server.ts |
| validateRuntimeOptions | apps/mcp-server/src/http/server.ts |
| createSafeTelemetryRecord | apps/mcp-server/src/http/telemetry.ts |
| capabilityKey | apps/mcp-server/src/http/upstreams.ts |
| createHttpReadinessCheck | apps/mcp-server/src/http/upstreams.ts |
| endpoint | apps/mcp-server/src/http/upstreams.ts |
| internalHeaders | apps/mcp-server/src/http/upstreams.ts |
| jsonResponse | apps/mcp-server/src/http/upstreams.ts |
| normalizeBaseUrl | apps/mcp-server/src/http/upstreams.ts |
| timedFetch | apps/mcp-server/src/http/upstreams.ts |
| startJobFilePlatform | apps/mcp-server/src/job-file-runtime.ts |
| registerJobFileTools | apps/mcp-server/src/job-file-tools.ts |
| result | apps/mcp-server/src/job-file-tools.ts |
| currentSnapshot | apps/mcp-server/src/jobs/authorization.ts |
| currentSnapshotVersion | apps/mcp-server/src/jobs/authorization.ts |
| denied | apps/mcp-server/src/jobs/authorization.ts |
| executorScopesByToolName | apps/mcp-server/src/jobs/authorization.ts |
| requireFilePermission | apps/mcp-server/src/jobs/authorization.ts |
| requireScopes | apps/mcp-server/src/jobs/authorization.ts |
| clone | apps/mcp-server/src/jobs/bullmq.ts |
| projectBullJob | apps/mcp-server/src/jobs/bullmq.ts |
| stateFromBull | apps/mcp-server/src/jobs/bullmq.ts |
| currentFonts | apps/mcp-server/src/jobs/club-font-upload-executor.ts |
| failure | apps/mcp-server/src/jobs/club-font-upload-executor.ts |
| record | apps/mcp-server/src/jobs/club-font-upload-executor.ts |
| timed | apps/mcp-server/src/jobs/club-font-upload-executor.ts |
| failure | apps/mcp-server/src/jobs/data-upload-executor.ts |
| stringHeaders | apps/mcp-server/src/jobs/data-upload-executor.ts |
| timed | apps/mcp-server/src/jobs/data-upload-executor.ts |
| requiresAsyncJob | apps/mcp-server/src/jobs/execution-policy.ts |
| key | apps/mcp-server/src/jobs/executors.ts |
| bundledRateLimitConfig | apps/mcp-server/src/jobs/fair-use.ts |
| fairUseConfigReadiness | apps/mcp-server/src/jobs/fair-use.ts |
| heavySlotKey | apps/mcp-server/src/jobs/fair-use.ts |
| opaqueKey | apps/mcp-server/src/jobs/fair-use.ts |
| parseRateLimitConfig | apps/mcp-server/src/jobs/fair-use.ts |
| policyKey | apps/mcp-server/src/jobs/fair-use.ts |
| envelopeFrom | apps/mcp-server/src/jobs/input-store.ts |
| ttl | apps/mcp-server/src/jobs/input-store.ts |
| jobBindingMessage | apps/mcp-server/src/jobs/job-actor.ts |
| normalizeBaseUrl | apps/mcp-server/src/jobs/job-actor.ts |
| signJobBinding | apps/mcp-server/src/jobs/job-actor.ts |
| nextJobPollDelayMs | apps/mcp-server/src/jobs/polling.ts |
| sameBinding | apps/mcp-server/src/jobs/processor.ts |
| validateRedisUrl | apps/mcp-server/src/jobs/redis.ts |
| bound | apps/mcp-server/src/jobs/service.ts |
| deterministicJobId | apps/mcp-server/src/jobs/service.ts |
| terminal | apps/mcp-server/src/jobs/service.ts |
| canonical | apps/mcp-server/src/jobs/starter.ts |
| configInvalid | apps/mcp-server/src/jobs/starter.ts |
| operationReference | apps/mcp-server/src/jobs/starter.ts |
| createComvenioJobWorker | apps/mcp-server/src/jobs/worker.ts |
| writeLifecycleRecord | apps/mcp-server/src/main.ts |
| insufficientScopeToolResult | apps/mcp-server/src/oauth-tool-challenge.ts |
| normalizedScopes | apps/mcp-server/src/oauth-tool-challenge.ts |
| withPublicErrorOutput | apps/mcp-server/src/public-error-output.ts |
| withoutDialect | apps/mcp-server/src/public-error-output.ts |
| publicDetail | apps/mcp-server/src/public-tool-error.ts |
| publicToolError | apps/mcp-server/src/public-tool-error.ts |
| reviewedExtras | apps/mcp-server/src/public-tool-error.ts |
| reviewedTabs | apps/mcp-server/src/public-tool-error.ts |
| createAuthChallenge | apps/mcp-server/src/public/auth-challenge.ts |
| permissionPolicyIsPublic | apps/mcp-server/src/public/policy.ts |
| array | apps/mcp-server/src/public/redaction.ts |
| eventRecord | apps/mcp-server/src/public/redaction.ts |
| homeRecord | apps/mcp-server/src/public/redaction.ts |
| menuItem | apps/mcp-server/src/public/redaction.ts |
| menuRecord | apps/mcp-server/src/public/redaction.ts |
| newsRecord | apps/mcp-server/src/public/redaction.ts |
| nullableString | apps/mcp-server/src/public/redaction.ts |
| number | apps/mcp-server/src/public/redaction.ts |
| object | apps/mcp-server/src/public/redaction.ts |
| string | apps/mcp-server/src/public/redaction.ts |
| uuid | apps/mcp-server/src/public/redaction.ts |
| object | apps/mcp-server/src/public/resolver.ts |
| calledToolNames | apps/mcp-server/src/public/subset.ts |
| rpcMessages | apps/mcp-server/src/public/subset.ts |
| assign | apps/mcp-server/src/run-reports.ts |
| assignShaped | apps/mcp-server/src/run-reports.ts |
| count | apps/mcp-server/src/run-reports.ts |
| errorCodes | apps/mcp-server/src/run-reports.ts |
| isRecord | apps/mcp-server/src/run-reports.ts |
| known | apps/mcp-server/src/run-reports.ts |
| publicActivationPreview | apps/mcp-server/src/run-reports.ts |
| publicAgentApprovalRef | apps/mcp-server/src/run-reports.ts |
| publicAgentRunRef | apps/mcp-server/src/run-reports.ts |
| publicApprovalUrl | apps/mcp-server/src/run-reports.ts |
| publicAutomation | apps/mcp-server/src/run-reports.ts |
| publicAutomationRun | apps/mcp-server/src/run-reports.ts |
| publicCalendarSubscription | apps/mcp-server/src/run-reports.ts |
| publicClarification | apps/mcp-server/src/run-reports.ts |
| publicExternalSyncConfig | apps/mcp-server/src/run-reports.ts |
| publicExternalSyncResult | apps/mcp-server/src/run-reports.ts |
| publicRunId | apps/mcp-server/src/run-reports.ts |
| publicSyncRun | apps/mcp-server/src/run-reports.ts |
| publicTriggerEvent | apps/mcp-server/src/run-reports.ts |
| publicWeeklyPreviewEntry | apps/mcp-server/src/run-reports.ts |
| publicWeeklyPreviewRun | apps/mcp-server/src/run-reports.ts |
| publicWeeklyPreviewSnapshot | apps/mcp-server/src/run-reports.ts |
| shaped | apps/mcp-server/src/run-reports.ts |
| syncSummary | apps/mcp-server/src/run-reports.ts |
| agentFunctionScope | apps/mcp-server/src/runtime-tools.ts |
| agentFunctionToolName | apps/mcp-server/src/runtime-tools.ts |
| anonymousContext | apps/mcp-server/src/runtime-tools.ts |
| clubAgentBridgeReleased | apps/mcp-server/src/runtime-tools.ts |
| clubAgentRefs | apps/mcp-server/src/runtime-tools.ts |
| createRuntimeAccessPolicy | apps/mcp-server/src/runtime-tools.ts |
| createRuntimeServer | apps/mcp-server/src/runtime-tools.ts |
| createRuntimeToolCatalog | apps/mcp-server/src/runtime-tools.ts |
| executePublic | apps/mcp-server/src/runtime-tools.ts |
| filterMyTasks | apps/mcp-server/src/runtime-tools.ts |
| includesClubAgent | apps/mcp-server/src/runtime-tools.ts |
| noAuthSecuritySchemes | apps/mcp-server/src/runtime-tools.ts |
| oauthSecuritySchemes | apps/mcp-server/src/runtime-tools.ts |
| pathFor | apps/mcp-server/src/runtime-tools.ts |
| projectMyTask | apps/mcp-server/src/runtime-tools.ts |
| projectPublicWidgetModel | apps/mcp-server/src/runtime-tools.ts |
| projectTaskReminder | apps/mcp-server/src/runtime-tools.ts |
| protectedToolError | apps/mcp-server/src/runtime-tools.ts |
| publicCandidates | apps/mcp-server/src/runtime-tools.ts |
| publishedRuntimeCatalog | apps/mcp-server/src/runtime-tools.ts |
| publishedRuntimeToolNames | apps/mcp-server/src/runtime-tools.ts |
| publishedWidgetResourceUris | apps/mcp-server/src/runtime-tools.ts |
| queryFor | apps/mcp-server/src/runtime-tools.ts |
| record | apps/mcp-server/src/runtime-tools.ts |
| registerAgentFunctionTools | apps/mcp-server/src/runtime-tools.ts |
| safeText | apps/mcp-server/src/runtime-tools.ts |
| taskTimestamp | apps/mcp-server/src/runtime-tools.ts |
| toMcpResult | apps/mcp-server/src/runtime-tools.ts |
| widgetMetadata | apps/mcp-server/src/runtime-tools.ts |
| withSecurityMetadata | apps/mcp-server/src/runtime-tools.ts |
| configurationField | apps/mcp-server/src/startup-diagnostics.ts |
| errorCode | apps/mcp-server/src/startup-diagnostics.ts |
| errorMessage | apps/mcp-server/src/startup-diagnostics.ts |
| mcpStartupFailureRecord | apps/mcp-server/src/startup-diagnostics.ts |
| serializeMcpStartupFailure | apps/mcp-server/src/startup-diagnostics.ts |
| guardSdkFallback | apps/mcp-server/src/tool-error-boundary.ts |
| guardToolErrors | apps/mcp-server/src/tool-error-boundary.ts |
| installToolSecuritySchemeProjection | apps/mcp-server/src/tool-security-schemes.ts |
| isToolListResult | apps/mcp-server/src/tool-security-schemes.ts |
| availabilityRequestsForMutation | apps/mcp-server/src/tools/booking-object-task/availability.ts |
| canonical | apps/mcp-server/src/tools/booking-object-task/availability.ts |
| durationReason | apps/mcp-server/src/tools/booking-object-task/availability.ts |
| items | apps/mcp-server/src/tools/booking-object-task/availability.ts |
| mergeBusySlots | apps/mcp-server/src/tools/booking-object-task/availability.ts |
| record | apps/mcp-server/src/tools/booking-object-task/availability.ts |
| requiredString | apps/mcp-server/src/tools/booking-object-task/availability.ts |
| canonical | apps/mcp-server/src/tools/booking-object-task/booking-conflict.ts |
| createBookingConflictPreviewStore | apps/mcp-server/src/tools/booking-object-task/booking-conflict.ts |
| inputDigest | apps/mcp-server/src/tools/booking-object-task/booking-conflict.ts |
| action | apps/mcp-server/src/tools/booking-object-task/definitions.ts |
| bookingRead | apps/mcp-server/src/tools/booking-object-task/definitions.ts |
| bookingWrite | apps/mcp-server/src/tools/booking-object-task/definitions.ts |
| canonicalTaskRead | apps/mcp-server/src/tools/booking-object-task/definitions.ts |
| objectRead | apps/mcp-server/src/tools/booking-object-task/definitions.ts |
| objectWrite | apps/mcp-server/src/tools/booking-object-task/definitions.ts |
| op | apps/mcp-server/src/tools/booking-object-task/definitions.ts |
| policy | apps/mcp-server/src/tools/booking-object-task/definitions.ts |
| read | apps/mcp-server/src/tools/booking-object-task/definitions.ts |
| route | apps/mcp-server/src/tools/booking-object-task/definitions.ts |
| taskRead | apps/mcp-server/src/tools/booking-object-task/definitions.ts |
| taskWrite | apps/mcp-server/src/tools/booking-object-task/definitions.ts |
| validateK10Definitions | apps/mcp-server/src/tools/booking-object-task/definitions.ts |
| write | apps/mcp-server/src/tools/booking-object-task/definitions.ts |
| add | apps/mcp-server/src/tools/booking-object-task/handlers.ts |
| assertClub | apps/mcp-server/src/tools/booking-object-task/handlers.ts |
| by | apps/mcp-server/src/tools/booking-object-task/handlers.ts |
| executeK10Operation | apps/mcp-server/src/tools/booking-object-task/handlers.ts |
| filterReservations | apps/mcp-server/src/tools/booking-object-task/handlers.ts |
| fixed | apps/mcp-server/src/tools/booking-object-task/handlers.ts |
| hasK10OperationHandler | apps/mcp-server/src/tools/booking-object-task/handlers.ts |
| key | apps/mcp-server/src/tools/booking-object-task/handlers.ts |
| nested | apps/mcp-server/src/tools/booking-object-task/handlers.ts |
| object | apps/mcp-server/src/tools/booking-object-task/handlers.ts |
| patchReservation | apps/mcp-server/src/tools/booking-object-task/handlers.ts |
| query | apps/mcp-server/src/tools/booking-object-task/handlers.ts |
| record | apps/mcp-server/src/tools/booking-object-task/handlers.ts |
| simple | apps/mcp-server/src/tools/booking-object-task/handlers.ts |
| string | apps/mcp-server/src/tools/booking-object-task/handlers.ts |
| taskListPage | apps/mcp-server/src/tools/booking-object-task/handlers.ts |
| withParticipantClub | apps/mcp-server/src/tools/booking-object-task/handlers.ts |
| without | apps/mcp-server/src/tools/booking-object-task/handlers.ts |
| buildK10Preview | apps/mcp-server/src/tools/booking-object-task/preview.ts |
| currentSubject | apps/mcp-server/src/tools/booking-object-task/preview.ts |
| label | apps/mcp-server/src/tools/booking-object-task/preview.ts |
| record | apps/mcp-server/src/tools/booking-object-task/preview.ts |
| minimizeGuestStatistics | apps/mcp-server/src/tools/booking-object-task/privacy.ts |
| minimizeReservation | apps/mcp-server/src/tools/booking-object-task/privacy.ts |
| minimizeReservationParticipants | apps/mcp-server/src/tools/booking-object-task/privacy.ts |
| minimizeReservations | apps/mcp-server/src/tools/booking-object-task/privacy.ts |
| minimizeTaskRelations | apps/mcp-server/src/tools/booking-object-task/privacy.ts |
| record | apps/mcp-server/src/tools/booking-object-task/privacy.ts |
| redactBookingObjectTaskValue | apps/mcp-server/src/tools/booking-object-task/privacy.ts |
| removeDirectContactData | apps/mcp-server/src/tools/booking-object-task/privacy.ts |
| contract | apps/mcp-server/src/tools/booking-object-task/schemas.ts |
| union | apps/mcp-server/src/tools/booking-object-task/schemas.ts |
| assertJson | apps/mcp-server/src/tools/booking-object-task/tool-sets.ts |
| confirmationFrom | apps/mcp-server/src/tools/booking-object-task/tool-sets.ts |
| connectorError | apps/mcp-server/src/tools/booking-object-task/tool-sets.ts |
| createK10ToolSets | apps/mcp-server/src/tools/booking-object-task/tool-sets.ts |
| decisionError | apps/mcp-server/src/tools/booking-object-task/tool-sets.ts |
| operationFor | apps/mcp-server/src/tools/booking-object-task/tool-sets.ts |
| targetClubIds | apps/mcp-server/src/tools/booking-object-task/tool-sets.ts |
| targetDepartmentIds | apps/mcp-server/src/tools/booking-object-task/tool-sets.ts |
| validateRuntimeCoverage | apps/mcp-server/src/tools/booking-object-task/tool-sets.ts |
| visibilityDecision | apps/mcp-server/src/tools/booking-object-task/tool-sets.ts |
| altformatBefund | apps/mcp-server/src/tools/content-homepage-news-data/convert-geruest.ts |
| angezeigteBefunde | apps/mcp-server/src/tools/content-homepage-news-data/convert-geruest.ts |
| auszug | apps/mcp-server/src/tools/content-homepage-news-data/convert-geruest.ts |
| befund | apps/mcp-server/src/tools/content-homepage-news-data/convert-geruest.ts |
| befundeDesReiters | apps/mcp-server/src/tools/content-homepage-news-data/convert-geruest.ts |
| breitenAusText | apps/mcp-server/src/tools/content-homepage-news-data/convert-geruest.ts |
| breitenFormOk | apps/mcp-server/src/tools/content-homepage-news-data/convert-geruest.ts |
| dekodiere | apps/mcp-server/src/tools/content-homepage-news-data/convert-geruest.ts |
| dokument | apps/mcp-server/src/tools/content-homepage-news-data/convert-geruest.ts |
| htmlVon | apps/mcp-server/src/tools/content-homepage-news-data/convert-geruest.ts |
| istNeuesFormat | apps/mcp-server/src/tools/content-homepage-news-data/convert-geruest.ts |
| katalogKlassen | apps/mcp-server/src/tools/content-homepage-news-data/convert-geruest.ts |
| parse | apps/mcp-server/src/tools/content-homepage-news-data/convert-geruest.ts |
| pruefeGeruest | apps/mcp-server/src/tools/content-homepage-news-data/convert-geruest.ts |
| pruefeReiter | apps/mcp-server/src/tools/content-homepage-news-data/convert-geruest.ts |
| slotsVon | apps/mcp-server/src/tools/content-homepage-news-data/convert-geruest.ts |
| vorfahren | apps/mcp-server/src/tools/content-homepage-news-data/convert-geruest.ts |
| auszug | apps/mcp-server/src/tools/content-homepage-news-data/convert.ts |
| bereichKuerzel | apps/mcp-server/src/tools/content-homepage-news-data/convert.ts |
| bildquelleZulaessig | apps/mcp-server/src/tools/content-homepage-news-data/convert.ts |
| convertLiveTabs | apps/mcp-server/src/tools/content-homepage-news-data/convert.ts |
| eigenerText | apps/mcp-server/src/tools/content-homepage-news-data/convert.ts |
| headingText | apps/mcp-server/src/tools/content-homepage-news-data/convert.ts |
| inLink | apps/mcp-server/src/tools/content-homepage-news-data/convert.ts |
| inTabelle | apps/mcp-server/src/tools/content-homepage-news-data/convert.ts |
| istAusgenommen | apps/mcp-server/src/tools/content-homepage-news-data/convert.ts |
| jsonArray | apps/mcp-server/src/tools/content-homepage-news-data/convert.ts |
| jsonObject | apps/mcp-server/src/tools/content-homepage-news-data/convert.ts |
| jsonString | apps/mcp-server/src/tools/content-homepage-news-data/convert.ts |
| katalogVorschlag | apps/mcp-server/src/tools/content-homepage-news-data/convert.ts |
| liveTabsAlsBulk | apps/mcp-server/src/tools/content-homepage-news-data/convert.ts |
| naechsterFreierName | apps/mcp-server/src/tools/content-homepage-news-data/convert.ts |
| passenderStil | apps/mcp-server/src/tools/content-homepage-news-data/convert.ts |
| slug | apps/mcp-server/src/tools/content-homepage-news-data/convert.ts |
| stilKatalog | apps/mcp-server/src/tools/content-homepage-news-data/convert.ts |
| verschachtelteLiveTabs | apps/mcp-server/src/tools/content-homepage-news-data/convert.ts |
| wandleGeruestUm | apps/mcp-server/src/tools/content-homepage-news-data/convert.ts |
| wandleUm | apps/mcp-server/src/tools/content-homepage-news-data/convert.ts |
| zahl | apps/mcp-server/src/tools/content-homepage-news-data/convert.ts |
| action | apps/mcp-server/src/tools/content-homepage-news-data/definitions.ts |
| communityOperation | apps/mcp-server/src/tools/content-homepage-news-data/definitions.ts |
| fileRead | apps/mcp-server/src/tools/content-homepage-news-data/definitions.ts |
| fileWrite | apps/mcp-server/src/tools/content-homepage-news-data/definitions.ts |
| job | apps/mcp-server/src/tools/content-homepage-news-data/definitions.ts |
| k12FilePermissionPolicy | apps/mcp-server/src/tools/content-homepage-news-data/definitions.ts |
| newsWrite | apps/mcp-server/src/tools/content-homepage-news-data/definitions.ts |
| operation | apps/mcp-server/src/tools/content-homepage-news-data/definitions.ts |
| policy | apps/mcp-server/src/tools/content-homepage-news-data/definitions.ts |
| read | apps/mcp-server/src/tools/content-homepage-news-data/definitions.ts |
| rightWrite | apps/mcp-server/src/tools/content-homepage-news-data/definitions.ts |
| route | apps/mcp-server/src/tools/content-homepage-news-data/definitions.ts |
| validateK12Definitions | apps/mcp-server/src/tools/content-homepage-news-data/definitions.ts |
| write | apps/mcp-server/src/tools/content-homepage-news-data/definitions.ts |
| add | apps/mcp-server/src/tools/content-homepage-news-data/handlers.ts |
| assertClub | apps/mcp-server/src/tools/content-homepage-news-data/handlers.ts |
| assertCommunityInClub | apps/mcp-server/src/tools/content-homepage-news-data/handlers.ts |
| assertOwnClubPage | apps/mcp-server/src/tools/content-homepage-news-data/handlers.ts |
| clubIds | apps/mcp-server/src/tools/content-homepage-news-data/handlers.ts |
| clubPage | apps/mcp-server/src/tools/content-homepage-news-data/handlers.ts |
| communityPath | apps/mcp-server/src/tools/content-homepage-news-data/handlers.ts |
| executeK12Operation | apps/mcp-server/src/tools/content-homepage-news-data/handlers.ts |
| fullNewsBody | apps/mcp-server/src/tools/content-homepage-news-data/handlers.ts |
| hasK12OperationHandler | apps/mcp-server/src/tools/content-homepage-news-data/handlers.ts |
| key | apps/mcp-server/src/tools/content-homepage-news-data/handlers.ts |
| newsBody | apps/mcp-server/src/tools/content-homepage-news-data/handlers.ts |
| object | apps/mcp-server/src/tools/content-homepage-news-data/handlers.ts |
| objects | apps/mcp-server/src/tools/content-homepage-news-data/handlers.ts |
| ownClubPages | apps/mcp-server/src/tools/content-homepage-news-data/handlers.ts |
| query | apps/mcp-server/src/tools/content-homepage-news-data/handlers.ts |
| record | apps/mcp-server/src/tools/content-homepage-news-data/handlers.ts |
| request | apps/mcp-server/src/tools/content-homepage-news-data/handlers.ts |
| simple | apps/mcp-server/src/tools/content-homepage-news-data/handlers.ts |
| string | apps/mcp-server/src/tools/content-homepage-news-data/handlers.ts |
| canonical | apps/mcp-server/src/tools/content-homepage-news-data/policies.ts |
| digest | apps/mcp-server/src/tools/content-homepage-news-data/policies.ts |
| buildK12Preview | apps/mcp-server/src/tools/content-homepage-news-data/preview.ts |
| identifier | apps/mcp-server/src/tools/content-homepage-news-data/preview.ts |
| record | apps/mcp-server/src/tools/content-homepage-news-data/preview.ts |
| boundedContentList | apps/mcp-server/src/tools/content-homepage-news-data/privacy.ts |
| minimizeFile | apps/mcp-server/src/tools/content-homepage-news-data/privacy.ts |
| minimizeNews | apps/mcp-server/src/tools/content-homepage-news-data/privacy.ts |
| minimizePaper | apps/mcp-server/src/tools/content-homepage-news-data/privacy.ts |
| record | apps/mcp-server/src/tools/content-homepage-news-data/privacy.ts |
| redactContentValue | apps/mcp-server/src/tools/content-homepage-news-data/privacy.ts |
| listK12Schemas | apps/mcp-server/src/tools/content-homepage-news-data/schema-registry.ts |
| showK12Schema | apps/mcp-server/src/tools/content-homepage-news-data/schema-registry.ts |
| checkFields | apps/mcp-server/src/tools/content-homepage-news-data/schemas.ts |
| checkSlots | apps/mcp-server/src/tools/content-homepage-news-data/schemas.ts |
| checkWidgetWith | apps/mcp-server/src/tools/content-homepage-news-data/schemas.ts |
| contract | apps/mcp-server/src/tools/content-homepage-news-data/schemas.ts |
| safeRichHtml | apps/mcp-server/src/tools/content-homepage-news-data/schemas.ts |
| assertJson | apps/mcp-server/src/tools/content-homepage-news-data/tool-sets.ts |
| confirmationFrom | apps/mcp-server/src/tools/content-homepage-news-data/tool-sets.ts |
| connectorError | apps/mcp-server/src/tools/content-homepage-news-data/tool-sets.ts |
| createK12ToolSets | apps/mcp-server/src/tools/content-homepage-news-data/tool-sets.ts |
| decisionError | apps/mcp-server/src/tools/content-homepage-news-data/tool-sets.ts |
| operationFor | apps/mcp-server/src/tools/content-homepage-news-data/tool-sets.ts |
| validateRuntimeCoverage | apps/mcp-server/src/tools/content-homepage-news-data/tool-sets.ts |
| valuesForKey | apps/mcp-server/src/tools/content-homepage-news-data/tool-sets.ts |
| visibilityDecision | apps/mcp-server/src/tools/content-homepage-news-data/tool-sets.ts |
| withoutConfirmation | apps/mcp-server/src/tools/content-homepage-news-data/tool-sets.ts |
| addLocalDays | apps/mcp-server/src/tools/event-plan/calendar.ts |
| dateParts | apps/mcp-server/src/tools/event-plan/calendar.ts |
| eventDaySegments | apps/mcp-server/src/tools/event-plan/calendar.ts |
| isIanaTimeZone | apps/mcp-server/src/tools/event-plan/calendar.ts |
| isoLocalDate | apps/mcp-server/src/tools/event-plan/calendar.ts |
| localDateBoundaryUtc | apps/mcp-server/src/tools/event-plan/calendar.ts |
| rangeQuery | apps/mcp-server/src/tools/event-plan/calendar.ts |
| validateLocalDateRange | apps/mcp-server/src/tools/event-plan/calendar.ts |
| action | apps/mcp-server/src/tools/event-plan/definitions.ts |
| op | apps/mcp-server/src/tools/event-plan/definitions.ts |
| policy | apps/mcp-server/src/tools/event-plan/definitions.ts |
| read | apps/mcp-server/src/tools/event-plan/definitions.ts |
| route | apps/mcp-server/src/tools/event-plan/definitions.ts |
| validateK8Definitions | apps/mcp-server/src/tools/event-plan/definitions.ts |
| write | apps/mcp-server/src/tools/event-plan/definitions.ts |
| add | apps/mcp-server/src/tools/event-plan/handlers.ts |
| by | apps/mcp-server/src/tools/event-plan/handlers.ts |
| crudGroup | apps/mcp-server/src/tools/event-plan/handlers.ts |
| direct | apps/mcp-server/src/tools/event-plan/handlers.ts |
| executeK8Operation | apps/mcp-server/src/tools/event-plan/handlers.ts |
| fixed | apps/mcp-server/src/tools/event-plan/handlers.ts |
| hasK8OperationHandler | apps/mcp-server/src/tools/event-plan/handlers.ts |
| key | apps/mcp-server/src/tools/event-plan/handlers.ts |
| nested | apps/mcp-server/src/tools/event-plan/handlers.ts |
| object | apps/mcp-server/src/tools/event-plan/handlers.ts |
| range | apps/mcp-server/src/tools/event-plan/handlers.ts |
| record | apps/mcp-server/src/tools/event-plan/handlers.ts |
| seriesBody | apps/mcp-server/src/tools/event-plan/handlers.ts |
| simple | apps/mcp-server/src/tools/event-plan/handlers.ts |
| string | apps/mcp-server/src/tools/event-plan/handlers.ts |
| without | apps/mcp-server/src/tools/event-plan/handlers.ts |
| canonical | apps/mcp-server/src/tools/event-plan/preview-confirmation.ts |
| digest | apps/mcp-server/src/tools/event-plan/preview-confirmation.ts |
| buildEventPreview | apps/mcp-server/src/tools/event-plan/preview.ts |
| eventSubject | apps/mcp-server/src/tools/event-plan/preview.ts |
| label | apps/mcp-server/src/tools/event-plan/preview.ts |
| record | apps/mcp-server/src/tools/event-plan/preview.ts |
| isSecretOrInternalKey | apps/mcp-server/src/tools/event-plan/privacy.ts |
| maskEmail | apps/mcp-server/src/tools/event-plan/privacy.ts |
| maskPhone | apps/mcp-server/src/tools/event-plan/privacy.ts |
| privateCalendarEvent | apps/mcp-server/src/tools/event-plan/privacy.ts |
| privateCalendarEvents | apps/mcp-server/src/tools/event-plan/privacy.ts |
| publicCalendarEvent | apps/mcp-server/src/tools/event-plan/privacy.ts |
| publicCalendarEvents | apps/mcp-server/src/tools/event-plan/privacy.ts |
| redactEventPlanValue | apps/mcp-server/src/tools/event-plan/privacy.ts |
| contract | apps/mcp-server/src/tools/event-plan/schemas.ts |
| union | apps/mcp-server/src/tools/event-plan/schemas.ts |
| assertJsonValue | apps/mcp-server/src/tools/event-plan/tool-sets.ts |
| confirmationFrom | apps/mcp-server/src/tools/event-plan/tool-sets.ts |
| connectorError | apps/mcp-server/src/tools/event-plan/tool-sets.ts |
| createK8ToolSets | apps/mcp-server/src/tools/event-plan/tool-sets.ts |
| decisionError | apps/mcp-server/src/tools/event-plan/tool-sets.ts |
| inputOperation | apps/mcp-server/src/tools/event-plan/tool-sets.ts |
| targetDepartmentIds | apps/mcp-server/src/tools/event-plan/tool-sets.ts |
| validateK8RuntimeCoverage | apps/mcp-server/src/tools/event-plan/tool-sets.ts |
| visibilityDecision | apps/mcp-server/src/tools/event-plan/tool-sets.ts |
| action | apps/mcp-server/src/tools/finance/definitions.ts |
| operation | apps/mcp-server/src/tools/finance/definitions.ts |
| policy | apps/mcp-server/src/tools/finance/definitions.ts |
| read | apps/mcp-server/src/tools/finance/definitions.ts |
| route | apps/mcp-server/src/tools/finance/definitions.ts |
| validateK14Definitions | apps/mcp-server/src/tools/finance/definitions.ts |
| write | apps/mcp-server/src/tools/finance/definitions.ts |
| addK14Handler | apps/mcp-server/src/tools/finance/handlers.ts |
| addMitElternpruefung | apps/mcp-server/src/tools/finance/handlers.ts |
| assertDepartmentOfEntry | apps/mcp-server/src/tools/finance/handlers.ts |
| assertHerkunft | apps/mcp-server/src/tools/finance/handlers.ts |
| assertParentPosition | apps/mcp-server/src/tools/finance/handlers.ts |
| assertTenant | apps/mcp-server/src/tools/finance/handlers.ts |
| compact | apps/mcp-server/src/tools/finance/handlers.ts |
| entry | apps/mcp-server/src/tools/finance/handlers.ts |
| executeK14Operation | apps/mcp-server/src/tools/finance/handlers.ts |
| hasK14OperationHandler | apps/mcp-server/src/tools/finance/handlers.ts |
| integer | apps/mcp-server/src/tools/finance/handlers.ts |
| mitVorpruefung | apps/mcp-server/src/tools/finance/handlers.ts |
| object | apps/mcp-server/src/tools/finance/handlers.ts |
| plan | apps/mcp-server/src/tools/finance/handlers.ts |
| plans | apps/mcp-server/src/tools/finance/handlers.ts |
| position | apps/mcp-server/src/tools/finance/handlers.ts |
| record | apps/mcp-server/src/tools/finance/handlers.ts |
| request | apps/mcp-server/src/tools/finance/handlers.ts |
| simple | apps/mcp-server/src/tools/finance/handlers.ts |
| string | apps/mcp-server/src/tools/finance/handlers.ts |
| valuesFor | apps/mcp-server/src/tools/finance/handlers.ts |
| actionRisk | apps/mcp-server/src/tools/finance/hub.ts |
| byId | apps/mcp-server/src/tools/finance/hub.ts |
| club | apps/mcp-server/src/tools/finance/hub.ts |
| gate | apps/mcp-server/src/tools/finance/hub.ts |
| grantPath | apps/mcp-server/src/tools/finance/hub.ts |
| hubOperationCount | apps/mcp-server/src/tools/finance/hub.ts |
| int | apps/mcp-server/src/tools/finance/hub.ts |
| investmentPlanRecord | apps/mcp-server/src/tools/finance/hub.ts |
| journalQuery | apps/mcp-server/src/tools/finance/hub.ts |
| listed | apps/mcp-server/src/tools/finance/hub.ts |
| operationDefinition | apps/mcp-server/src/tools/finance/hub.ts |
| optional | apps/mcp-server/src/tools/finance/hub.ts |
| own | apps/mcp-server/src/tools/finance/hub.ts |
| payload | apps/mcp-server/src/tools/finance/hub.ts |
| periodPath | apps/mcp-server/src/tools/finance/hub.ts |
| policy | apps/mcp-server/src/tools/finance/hub.ts |
| route | apps/mcp-server/src/tools/finance/hub.ts |
| rubricsPath | apps/mcp-server/src/tools/finance/hub.ts |
| scanAnd | apps/mcp-server/src/tools/finance/hub.ts |
| scopes | apps/mcp-server/src/tools/finance/hub.ts |
| seasonPath | apps/mcp-server/src/tools/finance/hub.ts |
| str | apps/mcp-server/src/tools/finance/hub.ts |
| windowPath | apps/mcp-server/src/tools/finance/hub.ts |
| canonical | apps/mcp-server/src/tools/finance/policies.ts |
| digest | apps/mcp-server/src/tools/finance/policies.ts |
| accountOf | apps/mcp-server/src/tools/finance/preview.ts |
| accountTransferShow | apps/mcp-server/src/tools/finance/preview.ts |
| add | apps/mcp-server/src/tools/finance/preview.ts |
| buildK14Preview | apps/mcp-server/src/tools/finance/preview.ts |
| cumulative | apps/mcp-server/src/tools/finance/preview.ts |
| currentFrame | apps/mcp-server/src/tools/finance/preview.ts |
| days | apps/mcp-server/src/tools/finance/preview.ts |
| entryShow | apps/mcp-server/src/tools/finance/preview.ts |
| frac | apps/mcp-server/src/tools/finance/preview.ts |
| gcd | apps/mcp-server/src/tools/finance/preview.ts |
| identifier | apps/mcp-server/src/tools/finance/preview.ts |
| monthShare | apps/mcp-server/src/tools/finance/preview.ts |
| parse | apps/mcp-server/src/tools/finance/preview.ts |
| periodDefaults | apps/mcp-server/src/tools/finance/preview.ts |
| positionShow | apps/mcp-server/src/tools/finance/preview.ts |
| record | apps/mcp-server/src/tools/finance/preview.ts |
| refuse | apps/mcp-server/src/tools/finance/preview.ts |
| roundHalfEven | apps/mcp-server/src/tools/finance/preview.ts |
| shiftDay | apps/mcp-server/src/tools/finance/preview.ts |
| subPositions | apps/mcp-server/src/tools/finance/preview.ts |
| transferAccounts | apps/mcp-server/src/tools/finance/preview.ts |
| transferCheck | apps/mcp-server/src/tools/finance/preview.ts |
| transferDateDefault | apps/mcp-server/src/tools/finance/preview.ts |
| transferShow | apps/mcp-server/src/tools/finance/preview.ts |
| uncoveredParts | apps/mcp-server/src/tools/finance/preview.ts |
| unplannedCheck | apps/mcp-server/src/tools/finance/preview.ts |
| unplannedPosition | apps/mcp-server/src/tools/finance/preview.ts |
| windowParts | apps/mcp-server/src/tools/finance/preview.ts |
| windowShare | apps/mcp-server/src/tools/finance/preview.ts |
| boundedFinanceList | apps/mcp-server/src/tools/finance/privacy.ts |
| minimizeCopyResult | apps/mcp-server/src/tools/finance/privacy.ts |
| minimizeEntry | apps/mcp-server/src/tools/finance/privacy.ts |
| minimizeImportResult | apps/mcp-server/src/tools/finance/privacy.ts |
| minimizePlan | apps/mcp-server/src/tools/finance/privacy.ts |
| minimizePosition | apps/mcp-server/src/tools/finance/privacy.ts |
| minimizeSummary | apps/mcp-server/src/tools/finance/privacy.ts |
| minimizeSummaryRow | apps/mcp-server/src/tools/finance/privacy.ts |
| record | apps/mcp-server/src/tools/finance/privacy.ts |
| redactFinanceValue | apps/mcp-server/src/tools/finance/privacy.ts |
| select | apps/mcp-server/src/tools/finance/privacy.ts |
| contract | apps/mcp-server/src/tools/finance/schemas.ts |
| assertJson | apps/mcp-server/src/tools/finance/tool-set.ts |
| confirmationFrom | apps/mcp-server/src/tools/finance/tool-set.ts |
| createK14ToolSet | apps/mcp-server/src/tools/finance/tool-set.ts |
| decisionError | apps/mcp-server/src/tools/finance/tool-set.ts |
| error | apps/mcp-server/src/tools/finance/tool-set.ts |
| operationFor | apps/mcp-server/src/tools/finance/tool-set.ts |
| setztAbteilungAufNull | apps/mcp-server/src/tools/finance/tool-set.ts |
| validateRuntime | apps/mcp-server/src/tools/finance/tool-set.ts |
| valuesFor | apps/mcp-server/src/tools/finance/tool-set.ts |
| visibilityDecision | apps/mcp-server/src/tools/finance/tool-set.ts |
| withoutConfirmation | apps/mcp-server/src/tools/finance/tool-set.ts |
| definition | apps/mcp-server/src/tools/identity-club-member-team-role/definitions.ts |
| policy | apps/mcp-server/src/tools/identity-club-member-team-role/definitions.ts |
| route | apps/mcp-server/src/tools/identity-club-member-team-role/definitions.ts |
| validateK7Definitions | apps/mcp-server/src/tools/identity-club-member-team-role/definitions.ts |
| automationPath | apps/mcp-server/src/tools/identity-club-member-team-role/handlers.ts |
| currentPermissionMatrix | apps/mcp-server/src/tools/identity-club-member-team-role/handlers.ts |
| feedbackContext | apps/mcp-server/src/tools/identity-club-member-team-role/handlers.ts |
| mutableRole | apps/mcp-server/src/tools/identity-club-member-team-role/handlers.ts |
| nested | apps/mcp-server/src/tools/identity-club-member-team-role/handlers.ts |
| permissionRecord | apps/mcp-server/src/tools/identity-club-member-team-role/handlers.ts |
| record | apps/mcp-server/src/tools/identity-club-member-team-role/handlers.ts |
| request | apps/mcp-server/src/tools/identity-club-member-team-role/handlers.ts |
| rows | apps/mcp-server/src/tools/identity-club-member-team-role/handlers.ts |
| string | apps/mcp-server/src/tools/identity-club-member-team-role/handlers.ts |
| valuesRecord | apps/mcp-server/src/tools/identity-club-member-team-role/handlers.ts |
| versionQuery | apps/mcp-server/src/tools/identity-club-member-team-role/handlers.ts |
| without | apps/mcp-server/src/tools/identity-club-member-team-role/handlers.ts |
| departmentLabels | apps/mcp-server/src/tools/identity-club-member-team-role/privacy.ts |
| fontRoles | apps/mcp-server/src/tools/identity-club-member-team-role/privacy.ts |
| hexRecord | apps/mcp-server/src/tools/identity-club-member-team-role/privacy.ts |
| maskEmail | apps/mcp-server/src/tools/identity-club-member-team-role/privacy.ts |
| maskPhone | apps/mcp-server/src/tools/identity-club-member-team-role/privacy.ts |
| missingClubFonts | apps/mcp-server/src/tools/identity-club-member-team-role/privacy.ts |
| nullableString | apps/mcp-server/src/tools/identity-club-member-team-role/privacy.ts |
| numberRecord | apps/mcp-server/src/tools/identity-club-member-team-role/privacy.ts |
| object | apps/mcp-server/src/tools/identity-club-member-team-role/privacy.ts |
| optionalBoolean | apps/mcp-server/src/tools/identity-club-member-team-role/privacy.ts |
| permissionEntries | apps/mcp-server/src/tools/identity-club-member-team-role/privacy.ts |
| pick | apps/mcp-server/src/tools/identity-club-member-team-role/privacy.ts |
| pickNested | apps/mcp-server/src/tools/identity-club-member-team-role/privacy.ts |
| redactAssignment | apps/mcp-server/src/tools/identity-club-member-team-role/privacy.ts |
| redactClubSettings | apps/mcp-server/src/tools/identity-club-member-team-role/privacy.ts |
| redactMemberDetail | apps/mcp-server/src/tools/identity-club-member-team-role/privacy.ts |
| redactMemberList | apps/mcp-server/src/tools/identity-club-member-team-role/privacy.ts |
| redactMemberListItem | apps/mcp-server/src/tools/identity-club-member-team-role/privacy.ts |
| redactPermissionMatrix | apps/mcp-server/src/tools/identity-club-member-team-role/privacy.ts |
| redactPositionRole | apps/mcp-server/src/tools/identity-club-member-team-role/privacy.ts |
| redactWhoami | apps/mcp-server/src/tools/identity-club-member-team-role/privacy.ts |
| requiredString | apps/mcp-server/src/tools/identity-club-member-team-role/privacy.ts |
| statusLabel | apps/mcp-server/src/tools/identity-club-member-team-role/privacy.ts |
| contract | apps/mcp-server/src/tools/identity-club-member-team-role/schemas.ts |
| entityContext | apps/mcp-server/src/tools/identity-club-member-team-role/schemas.ts |
| forumText | apps/mcp-server/src/tools/identity-club-member-team-role/schemas.ts |
| assertJsonValue | apps/mcp-server/src/tools/identity-club-member-team-role/tool-sets.ts |
| connectorError | apps/mcp-server/src/tools/identity-club-member-team-role/tool-sets.ts |
| createK7ToolSets | apps/mcp-server/src/tools/identity-club-member-team-role/tool-sets.ts |
| decisionError | apps/mcp-server/src/tools/identity-club-member-team-role/tool-sets.ts |
| targetDepartmentIds | apps/mcp-server/src/tools/identity-club-member-team-role/tool-sets.ts |
| validateK7RuntimeCoverage | apps/mcp-server/src/tools/identity-club-member-team-role/tool-sets.ts |
| action | apps/mcp-server/src/tools/meeting-tournament/definitions.ts |
| meetingRead | apps/mcp-server/src/tools/meeting-tournament/definitions.ts |
| meetingWrite | apps/mcp-server/src/tools/meeting-tournament/definitions.ts |
| op | apps/mcp-server/src/tools/meeting-tournament/definitions.ts |
| policy | apps/mcp-server/src/tools/meeting-tournament/definitions.ts |
| route | apps/mcp-server/src/tools/meeting-tournament/definitions.ts |
| tournamentRead | apps/mcp-server/src/tools/meeting-tournament/definitions.ts |
| tournamentWrite | apps/mcp-server/src/tools/meeting-tournament/definitions.ts |
| validateK9Definitions | apps/mcp-server/src/tools/meeting-tournament/definitions.ts |
| add | apps/mcp-server/src/tools/meeting-tournament/handlers.ts |
| by | apps/mcp-server/src/tools/meeting-tournament/handlers.ts |
| createTournamentParticipant | apps/mcp-server/src/tools/meeting-tournament/handlers.ts |
| executeK9Operation | apps/mcp-server/src/tools/meeting-tournament/handlers.ts |
| fixed | apps/mcp-server/src/tools/meeting-tournament/handlers.ts |
| hasK9OperationHandler | apps/mcp-server/src/tools/meeting-tournament/handlers.ts |
| key | apps/mcp-server/src/tools/meeting-tournament/handlers.ts |
| nested | apps/mcp-server/src/tools/meeting-tournament/handlers.ts |
| object | apps/mcp-server/src/tools/meeting-tournament/handlers.ts |
| query | apps/mcp-server/src/tools/meeting-tournament/handlers.ts |
| record | apps/mcp-server/src/tools/meeting-tournament/handlers.ts |
| simple | apps/mcp-server/src/tools/meeting-tournament/handlers.ts |
| string | apps/mcp-server/src/tools/meeting-tournament/handlers.ts |
| tournament | apps/mcp-server/src/tools/meeting-tournament/handlers.ts |
| without | apps/mcp-server/src/tools/meeting-tournament/handlers.ts |
| canonical | apps/mcp-server/src/tools/meeting-tournament/policies.ts |
| digest | apps/mcp-server/src/tools/meeting-tournament/policies.ts |
| buildK9Preview | apps/mcp-server/src/tools/meeting-tournament/preview.ts |
| label | apps/mcp-server/src/tools/meeting-tournament/preview.ts |
| record | apps/mcp-server/src/tools/meeting-tournament/preview.ts |
| subject | apps/mcp-server/src/tools/meeting-tournament/preview.ts |
| compareNullable | apps/mcp-server/src/tools/meeting-tournament/privacy.ts |
| minimizeMeetingParticipants | apps/mcp-server/src/tools/meeting-tournament/privacy.ts |
| minimizeTournamentParticipant | apps/mcp-server/src/tools/meeting-tournament/privacy.ts |
| minimizeTournamentParticipants | apps/mcp-server/src/tools/meeting-tournament/privacy.ts |
| record | apps/mcp-server/src/tools/meeting-tournament/privacy.ts |
| redactMeetingTournamentValue | apps/mcp-server/src/tools/meeting-tournament/privacy.ts |
| stableTournamentMatches | apps/mcp-server/src/tools/meeting-tournament/privacy.ts |
| time | apps/mcp-server/src/tools/meeting-tournament/privacy.ts |
| withLocalDaySegments | apps/mcp-server/src/tools/meeting-tournament/privacy.ts |
| containsForbidden | apps/mcp-server/src/tools/meeting-tournament/schemas.ts |
| contract | apps/mcp-server/src/tools/meeting-tournament/schemas.ts |
| entityBody | apps/mcp-server/src/tools/meeting-tournament/schemas.ts |
| union | apps/mcp-server/src/tools/meeting-tournament/schemas.ts |
| assertJson | apps/mcp-server/src/tools/meeting-tournament/tool-sets.ts |
| confirmationFrom | apps/mcp-server/src/tools/meeting-tournament/tool-sets.ts |
| connectorError | apps/mcp-server/src/tools/meeting-tournament/tool-sets.ts |
| createK9ToolSets | apps/mcp-server/src/tools/meeting-tournament/tool-sets.ts |
| decisionError | apps/mcp-server/src/tools/meeting-tournament/tool-sets.ts |
| operationFor | apps/mcp-server/src/tools/meeting-tournament/tool-sets.ts |
| targetDepartmentIds | apps/mcp-server/src/tools/meeting-tournament/tool-sets.ts |
| validateRuntimeCoverage | apps/mcp-server/src/tools/meeting-tournament/tool-sets.ts |
| visibilityDecision | apps/mcp-server/src/tools/meeting-tournament/tool-sets.ts |
| action | apps/mcp-server/src/tools/sponsor-marketing/definitions.ts |
| operation | apps/mcp-server/src/tools/sponsor-marketing/definitions.ts |
| policy | apps/mcp-server/src/tools/sponsor-marketing/definitions.ts |
| read | apps/mcp-server/src/tools/sponsor-marketing/definitions.ts |
| route | apps/mcp-server/src/tools/sponsor-marketing/definitions.ts |
| validateK13Definitions | apps/mcp-server/src/tools/sponsor-marketing/definitions.ts |
| write | apps/mcp-server/src/tools/sponsor-marketing/definitions.ts |
| assertTenant | apps/mcp-server/src/tools/sponsor-marketing/handlers.ts |
| compact | apps/mcp-server/src/tools/sponsor-marketing/handlers.ts |
| contractBody | apps/mcp-server/src/tools/sponsor-marketing/handlers.ts |
| executeK13Operation | apps/mcp-server/src/tools/sponsor-marketing/handlers.ts |
| hasK13OperationHandler | apps/mcp-server/src/tools/sponsor-marketing/handlers.ts |
| object | apps/mcp-server/src/tools/sponsor-marketing/handlers.ts |
| productBody | apps/mcp-server/src/tools/sponsor-marketing/handlers.ts |
| query | apps/mcp-server/src/tools/sponsor-marketing/handlers.ts |
| record | apps/mcp-server/src/tools/sponsor-marketing/handlers.ts |
| request | apps/mcp-server/src/tools/sponsor-marketing/handlers.ts |
| simple | apps/mcp-server/src/tools/sponsor-marketing/handlers.ts |
| sponsorBody | apps/mcp-server/src/tools/sponsor-marketing/handlers.ts |
| string | apps/mcp-server/src/tools/sponsor-marketing/handlers.ts |
| valuesFor | apps/mcp-server/src/tools/sponsor-marketing/handlers.ts |
| canonical | apps/mcp-server/src/tools/sponsor-marketing/policies.ts |
| digest | apps/mcp-server/src/tools/sponsor-marketing/policies.ts |
| buildK13Preview | apps/mcp-server/src/tools/sponsor-marketing/preview.ts |
| identifier | apps/mcp-server/src/tools/sponsor-marketing/preview.ts |
| record | apps/mcp-server/src/tools/sponsor-marketing/preview.ts |
| boundedSponsorList | apps/mcp-server/src/tools/sponsor-marketing/privacy.ts |
| minimizeAssignment | apps/mcp-server/src/tools/sponsor-marketing/privacy.ts |
| minimizeContract | apps/mcp-server/src/tools/sponsor-marketing/privacy.ts |
| minimizeDocument | apps/mcp-server/src/tools/sponsor-marketing/privacy.ts |
| minimizeProduct | apps/mcp-server/src/tools/sponsor-marketing/privacy.ts |
| minimizeResponsible | apps/mcp-server/src/tools/sponsor-marketing/privacy.ts |
| minimizeSponsor | apps/mcp-server/src/tools/sponsor-marketing/privacy.ts |
| record | apps/mcp-server/src/tools/sponsor-marketing/privacy.ts |
| redactSponsorValue | apps/mcp-server/src/tools/sponsor-marketing/privacy.ts |
| select | apps/mcp-server/src/tools/sponsor-marketing/privacy.ts |
| contract | apps/mcp-server/src/tools/sponsor-marketing/schemas.ts |
| assertJson | apps/mcp-server/src/tools/sponsor-marketing/tool-set.ts |
| confirmationFrom | apps/mcp-server/src/tools/sponsor-marketing/tool-set.ts |
| createK13ToolSet | apps/mcp-server/src/tools/sponsor-marketing/tool-set.ts |
| decisionError | apps/mcp-server/src/tools/sponsor-marketing/tool-set.ts |
| error | apps/mcp-server/src/tools/sponsor-marketing/tool-set.ts |
| operationFor | apps/mcp-server/src/tools/sponsor-marketing/tool-set.ts |
| validateRuntime | apps/mcp-server/src/tools/sponsor-marketing/tool-set.ts |
| valuesFor | apps/mcp-server/src/tools/sponsor-marketing/tool-set.ts |
| visibilityDecision | apps/mcp-server/src/tools/sponsor-marketing/tool-set.ts |
| withoutConfirmation | apps/mcp-server/src/tools/sponsor-marketing/tool-set.ts |
| number | apps/mcp-server/src/tools/supply-menu-shopping/calculation.ts |
| record | apps/mcp-server/src/tools/supply-menu-shopping/calculation.ts |
| scaleRecipeQuantities | apps/mcp-server/src/tools/supply-menu-shopping/calculation.ts |
| action | apps/mcp-server/src/tools/supply-menu-shopping/definitions.ts |
| job | apps/mcp-server/src/tools/supply-menu-shopping/definitions.ts |
| operation | apps/mcp-server/src/tools/supply-menu-shopping/definitions.ts |
| policy | apps/mcp-server/src/tools/supply-menu-shopping/definitions.ts |
| procurement | apps/mcp-server/src/tools/supply-menu-shopping/definitions.ts |
| read | apps/mcp-server/src/tools/supply-menu-shopping/definitions.ts |
| route | apps/mcp-server/src/tools/supply-menu-shopping/definitions.ts |
| validateK11Definitions | apps/mcp-server/src/tools/supply-menu-shopping/definitions.ts |
| write | apps/mcp-server/src/tools/supply-menu-shopping/definitions.ts |
| add | apps/mcp-server/src/tools/supply-menu-shopping/handlers.ts |
| assertClub | apps/mcp-server/src/tools/supply-menu-shopping/handlers.ts |
| by | apps/mcp-server/src/tools/supply-menu-shopping/handlers.ts |
| executeK11Operation | apps/mcp-server/src/tools/supply-menu-shopping/handlers.ts |
| fixed | apps/mcp-server/src/tools/supply-menu-shopping/handlers.ts |
| hasK11OperationHandler | apps/mcp-server/src/tools/supply-menu-shopping/handlers.ts |
| key | apps/mcp-server/src/tools/supply-menu-shopping/handlers.ts |
| object | apps/mcp-server/src/tools/supply-menu-shopping/handlers.ts |
| pick | apps/mcp-server/src/tools/supply-menu-shopping/handlers.ts |
| query | apps/mcp-server/src/tools/supply-menu-shopping/handlers.ts |
| record | apps/mcp-server/src/tools/supply-menu-shopping/handlers.ts |
| simple | apps/mcp-server/src/tools/supply-menu-shopping/handlers.ts |
| string | apps/mcp-server/src/tools/supply-menu-shopping/handlers.ts |
| canonical | apps/mcp-server/src/tools/supply-menu-shopping/policies.ts |
| digest | apps/mcp-server/src/tools/supply-menu-shopping/policies.ts |
| buildK11Preview | apps/mcp-server/src/tools/supply-menu-shopping/preview.ts |
| current | apps/mcp-server/src/tools/supply-menu-shopping/preview.ts |
| label | apps/mcp-server/src/tools/supply-menu-shopping/preview.ts |
| record | apps/mcp-server/src/tools/supply-menu-shopping/preview.ts |
| boundedList | apps/mcp-server/src/tools/supply-menu-shopping/privacy.ts |
| minimizeShoppingList | apps/mcp-server/src/tools/supply-menu-shopping/privacy.ts |
| minimizeTemplate | apps/mcp-server/src/tools/supply-menu-shopping/privacy.ts |
| record | apps/mcp-server/src/tools/supply-menu-shopping/privacy.ts |
| redactSupplyValue | apps/mcp-server/src/tools/supply-menu-shopping/privacy.ts |
| contract | apps/mcp-server/src/tools/supply-menu-shopping/schemas.ts |
| union | apps/mcp-server/src/tools/supply-menu-shopping/schemas.ts |
| assertJson | apps/mcp-server/src/tools/supply-menu-shopping/tool-sets.ts |
| confirmationFrom | apps/mcp-server/src/tools/supply-menu-shopping/tool-sets.ts |
| connectorError | apps/mcp-server/src/tools/supply-menu-shopping/tool-sets.ts |
| createK11ToolSets | apps/mcp-server/src/tools/supply-menu-shopping/tool-sets.ts |
| decisionError | apps/mcp-server/src/tools/supply-menu-shopping/tool-sets.ts |
| operationFor | apps/mcp-server/src/tools/supply-menu-shopping/tool-sets.ts |
| validateRuntimeCoverage | apps/mcp-server/src/tools/supply-menu-shopping/tool-sets.ts |
| valuesForKey | apps/mcp-server/src/tools/supply-menu-shopping/tool-sets.ts |
| visibilityDecision | apps/mcp-server/src/tools/supply-menu-shopping/tool-sets.ts |
| actionDescriptor | apps/mcp-server/src/widget-runtime.ts |
| bookingSlotActionId | apps/mcp-server/src/widget-runtime.ts |
| bookingSlotIdempotencyKey | apps/mcp-server/src/widget-runtime.ts |
| filterMembers | apps/mcp-server/src/widget-runtime.ts |
| fullWidgetProtectedToolDescriptors | apps/mcp-server/src/widget-runtime.ts |
| fullWidgetReviewToolSummaries | apps/mcp-server/src/widget-runtime.ts |
| metadata | apps/mcp-server/src/widget-runtime.ts |
| oauthClubId | apps/mcp-server/src/widget-runtime.ts |
| oauthSecuritySchemes | apps/mcp-server/src/widget-runtime.ts |
| objectId | apps/mcp-server/src/widget-runtime.ts |
| objectItems | apps/mcp-server/src/widget-runtime.ts |
| registerFullWidgetRuntime | apps/mcp-server/src/widget-runtime.ts |
| widgetError | apps/mcp-server/src/widget-runtime.ts |
| widgetResult | apps/mcp-server/src/widget-runtime.ts |
| mountBookingObjectWidgetAssets | apps/mcp-server/src/widgets/booking-object/assets.ts |
| actionMatchesSlot | apps/mcp-server/src/widgets/booking-object/client.ts |
| actionObjectId | apps/mcp-server/src/widgets/booking-object/client.ts |
| actionPayload | apps/mcp-server/src/widgets/booking-object/client.ts |
| badge | apps/mcp-server/src/widgets/booking-object/client.ts |
| call | apps/mcp-server/src/widgets/booking-object/client.ts |
| initialize | apps/mcp-server/src/widgets/booking-object/client.ts |
| object | apps/mcp-server/src/widgets/booking-object/client.ts |
| render | apps/mcp-server/src/widgets/booking-object/client.ts |
| resultModel | apps/mcp-server/src/widgets/booking-object/client.ts |
| status | apps/mcp-server/src/widgets/booking-object/client.ts |
| valid | apps/mcp-server/src/widgets/booking-object/client.ts |
| AvailabilityBadge | apps/mcp-server/src/widgets/booking-object/components.ts |
| BookingObjectWidget | apps/mcp-server/src/widgets/booking-object/components.ts |
| BookingSlotGrid | apps/mcp-server/src/widgets/booking-object/components.ts |
| ObjectSelector | apps/mcp-server/src/widgets/booking-object/components.ts |
| ReservationActionBar | apps/mcp-server/src/widgets/booking-object/components.ts |
| dateTime | apps/mcp-server/src/widgets/booking-object/components.ts |
| escapeHtml | apps/mcp-server/src/widgets/booking-object/components.ts |
| bound | apps/mcp-server/src/widgets/booking-object/projector.ts |
| filteredActions | apps/mcp-server/src/widgets/booking-object/projector.ts |
| safeBookingConflictWidget | apps/mcp-server/src/widgets/booking-object/projector.ts |
| safeBookingPermissionChangedWidget | apps/mcp-server/src/widgets/booking-object/projector.ts |
| safeSlots | apps/mcp-server/src/widgets/booking-object/projector.ts |
| slotLabel | apps/mcp-server/src/widgets/booking-object/projector.ts |
| slotState | apps/mcp-server/src/widgets/booking-object/projector.ts |
| bookingObjectToolMetadata | apps/mcp-server/src/widgets/booking-object/resource.ts |
| bookingObjectWidgetHtml | apps/mcp-server/src/widgets/booking-object/resource.ts |
| bookingObjectWidgetUiMetadata | apps/mcp-server/src/widgets/booking-object/resource.ts |
| registerBookingObjectWidgetResource | apps/mcp-server/src/widgets/booking-object/resource.ts |
| availabilityState | apps/mcp-server/src/widgets/booking-object/state.ts |
| bookingObjectState | apps/mcp-server/src/widgets/booking-object/state.ts |
| safeBookingWidgetTelemetry | apps/mcp-server/src/widgets/booking-object/state.ts |
| mountConfirmationWidgetAssets | apps/mcp-server/src/widgets/confirmation/assets.ts |
| call | apps/mcp-server/src/widgets/confirmation/client.ts |
| consume | apps/mcp-server/src/widgets/confirmation/client.ts |
| dismiss | apps/mcp-server/src/widgets/confirmation/client.ts |
| exactCredential | apps/mcp-server/src/widgets/confirmation/client.ts |
| exactWidgetInput | apps/mcp-server/src/widgets/confirmation/client.ts |
| hiddenCredential | apps/mcp-server/src/widgets/confirmation/client.ts |
| initialize | apps/mcp-server/src/widgets/confirmation/client.ts |
| node | apps/mcp-server/src/widgets/confirmation/client.ts |
| object | apps/mcp-server/src/widgets/confirmation/client.ts |
| render | apps/mcp-server/src/widgets/confirmation/client.ts |
| resultEnvelope | apps/mcp-server/src/widgets/confirmation/client.ts |
| resultModel | apps/mcp-server/src/widgets/confirmation/client.ts |
| status | apps/mcp-server/src/widgets/confirmation/client.ts |
| valid | apps/mcp-server/src/widgets/confirmation/client.ts |
| ConfirmationActionBar | apps/mcp-server/src/widgets/confirmation/components.ts |
| ConfirmationPanel | apps/mcp-server/src/widgets/confirmation/components.ts |
| ConfirmationWidget | apps/mcp-server/src/widgets/confirmation/components.ts |
| ImpactSummary | apps/mcp-server/src/widgets/confirmation/components.ts |
| MaskedFieldView | apps/mcp-server/src/widgets/confirmation/components.ts |
| escapeHtml | apps/mcp-server/src/widgets/confirmation/components.ts |
| fieldLabel | apps/mcp-server/src/widgets/confirmation/components.ts |
| hasWriteAuthority | apps/mcp-server/src/widgets/confirmation/policy.ts |
| bound | apps/mcp-server/src/widgets/confirmation/projector.ts |
| containsSensitiveRawValue | apps/mcp-server/src/widgets/confirmation/projector.ts |
| confirmationActionToolMetadata | apps/mcp-server/src/widgets/confirmation/resource.ts |
| confirmationToolMetadata | apps/mcp-server/src/widgets/confirmation/resource.ts |
| confirmationWidgetHtml | apps/mcp-server/src/widgets/confirmation/resource.ts |
| confirmationWidgetUiMetadata | apps/mcp-server/src/widgets/confirmation/resource.ts |
| registerConfirmationWidgetResource | apps/mcp-server/src/widgets/confirmation/resource.ts |
| confirmationWidgetState | apps/mcp-server/src/widgets/confirmation/state.ts |
| effectKind | apps/mcp-server/src/widgets/confirmation/state.ts |
| safeConfirmationWidgetTelemetry | apps/mcp-server/src/widgets/confirmation/state.ts |
| mountEventCalendarWidgetAssets | apps/mcp-server/src/widgets/event-calendar/assets.ts |
| callTool | apps/mcp-server/src/widgets/event-calendar/client.ts |
| format | apps/mcp-server/src/widgets/event-calendar/client.ts |
| initialize | apps/mcp-server/src/widgets/event-calendar/client.ts |
| render | apps/mcp-server/src/widgets/event-calendar/client.ts |
| resultModel | apps/mcp-server/src/widgets/event-calendar/client.ts |
| status | apps/mcp-server/src/widgets/event-calendar/client.ts |
| text | apps/mcp-server/src/widgets/event-calendar/client.ts |
| validModel | apps/mcp-server/src/widgets/event-calendar/client.ts |
| validObject | apps/mcp-server/src/widgets/event-calendar/client.ts |
| CalendarGrid | apps/mcp-server/src/widgets/event-calendar/components.ts |
| ClubContextChip | apps/mcp-server/src/widgets/event-calendar/components.ts |
| EventActionBar | apps/mcp-server/src/widgets/event-calendar/components.ts |
| EventCalendarStatus | apps/mcp-server/src/widgets/event-calendar/components.ts |
| EventCalendarWidget | apps/mcp-server/src/widgets/event-calendar/components.ts |
| EventFilterBar | apps/mcp-server/src/widgets/event-calendar/components.ts |
| EventSummaryCard | apps/mcp-server/src/widgets/event-calendar/components.ts |
| escapeHtml | apps/mcp-server/src/widgets/event-calendar/components.ts |
| eventTime | apps/mcp-server/src/widgets/event-calendar/components.ts |
| localDateParts | apps/mcp-server/src/widgets/event-calendar/components.ts |
| stateMessage | apps/mcp-server/src/widgets/event-calendar/components.ts |
| assertEventWidgetJson | apps/mcp-server/src/widgets/event-calendar/projector.ts |
| boundPrivate | apps/mcp-server/src/widgets/event-calendar/projector.ts |
| common | apps/mcp-server/src/widgets/event-calendar/projector.ts |
| eventStatus | apps/mcp-server/src/widgets/event-calendar/projector.ts |
| filteredActions | apps/mcp-server/src/widgets/event-calendar/projector.ts |
| httpsUrl | apps/mcp-server/src/widgets/event-calendar/projector.ts |
| safePermissionChangedWidget | apps/mcp-server/src/widgets/event-calendar/projector.ts |
| sortEvents | apps/mcp-server/src/widgets/event-calendar/projector.ts |
| eventCalendarToolMetadata | apps/mcp-server/src/widgets/event-calendar/resource.ts |
| eventCalendarWidgetHtml | apps/mcp-server/src/widgets/event-calendar/resource.ts |
| eventCalendarWidgetOrigin | apps/mcp-server/src/widgets/event-calendar/resource.ts |
| eventCalendarWidgetUiMetadata | apps/mcp-server/src/widgets/event-calendar/resource.ts |
| registerEventCalendarWidgetResource | apps/mcp-server/src/widgets/event-calendar/resource.ts |
| eventCalendarState | apps/mcp-server/src/widgets/event-calendar/state.ts |
| safeEventWidgetTelemetry | apps/mcp-server/src/widgets/event-calendar/state.ts |
| mountMemberManagementWidgetAssets | apps/mcp-server/src/widgets/member-management/assets.ts |
| call | apps/mcp-server/src/widgets/member-management/client.ts |
| detailPanel | apps/mcp-server/src/widgets/member-management/client.ts |
| initialize | apps/mcp-server/src/widgets/member-management/client.ts |
| memberId | apps/mcp-server/src/widgets/member-management/client.ts |
| object | apps/mcp-server/src/widgets/member-management/client.ts |
| render | apps/mcp-server/src/widgets/member-management/client.ts |
| resultModel | apps/mcp-server/src/widgets/member-management/client.ts |
| status | apps/mcp-server/src/widgets/member-management/client.ts |
| valid | apps/mcp-server/src/widgets/member-management/client.ts |
| MemberActionBar | apps/mcp-server/src/widgets/member-management/components.ts |
| MemberDetailPanel | apps/mcp-server/src/widgets/member-management/components.ts |
| MemberManagementWidget | apps/mcp-server/src/widgets/member-management/components.ts |
| MemberSummaryRow | apps/mcp-server/src/widgets/member-management/components.ts |
| PermissionExplanation | apps/mcp-server/src/widgets/member-management/components.ts |
| actionMemberId | apps/mcp-server/src/widgets/member-management/components.ts |
| escapeHtml | apps/mcp-server/src/widgets/member-management/components.ts |
| initials | apps/mcp-server/src/widgets/member-management/components.ts |
| bound | apps/mcp-server/src/widgets/member-management/projector.ts |
| filteredActions | apps/mcp-server/src/widgets/member-management/projector.ts |
| ownMemberPermissionExplanation | apps/mcp-server/src/widgets/member-management/projector.ts |
| safeMemberPermissionChangedWidget | apps/mcp-server/src/widgets/member-management/projector.ts |
| selectedDetail | apps/mcp-server/src/widgets/member-management/projector.ts |
| memberManagementToolMetadata | apps/mcp-server/src/widgets/member-management/resource.ts |
| memberManagementWidgetHtml | apps/mcp-server/src/widgets/member-management/resource.ts |
| memberManagementWidgetUiMetadata | apps/mcp-server/src/widgets/member-management/resource.ts |
| registerMemberManagementWidgetResource | apps/mcp-server/src/widgets/member-management/resource.ts |
| memberManagementState | apps/mcp-server/src/widgets/member-management/state.ts |
| safeMemberWidgetTelemetry | apps/mcp-server/src/widgets/member-management/state.ts |
| mountNewsWidgetAssets | apps/mcp-server/src/widgets/news/assets.ts |
| call | apps/mcp-server/src/widgets/news/client.ts |
| initialize | apps/mcp-server/src/widgets/news/client.ts |
| newsId | apps/mcp-server/src/widgets/news/client.ts |
| render | apps/mcp-server/src/widgets/news/client.ts |
| resultModel | apps/mcp-server/src/widgets/news/client.ts |
| safeRich | apps/mcp-server/src/widgets/news/client.ts |
| status | apps/mcp-server/src/widgets/news/client.ts |
| valid | apps/mcp-server/src/widgets/news/client.ts |
| NewsActionBar | apps/mcp-server/src/widgets/news/components.ts |
| NewsPreviewPanel | apps/mcp-server/src/widgets/news/components.ts |
| NewsStatusFilter | apps/mcp-server/src/widgets/news/components.ts |
| NewsSummaryCard | apps/mcp-server/src/widgets/news/components.ts |
| NewsWidget | apps/mcp-server/src/widgets/news/components.ts |
| escapeHtml | apps/mcp-server/src/widgets/news/components.ts |
| statusLabel | apps/mcp-server/src/widgets/news/components.ts |
| managementIntent | apps/mcp-server/src/widgets/news/policy.ts |
| articleFromPrivate | apps/mcp-server/src/widgets/news/projector.ts |
| bound | apps/mcp-server/src/widgets/news/projector.ts |
| filteredActions | apps/mcp-server/src/widgets/news/projector.ts |
| httpsUrl | apps/mcp-server/src/widgets/news/projector.ts |
| safeNewsPermissionChangedWidget | apps/mcp-server/src/widgets/news/projector.ts |
| safeNewsPreviewExpiredWidget | apps/mcp-server/src/widgets/news/projector.ts |
| status | apps/mcp-server/src/widgets/news/projector.ts |
| newsToolMetadata | apps/mcp-server/src/widgets/news/resource.ts |
| newsWidgetHtml | apps/mcp-server/src/widgets/news/resource.ts |
| newsWidgetUiMetadata | apps/mcp-server/src/widgets/news/resource.ts |
| registerNewsWidgetResource | apps/mcp-server/src/widgets/news/resource.ts |
| escapeText | apps/mcp-server/src/widgets/news/sanitizer.ts |
| safeHref | apps/mcp-server/src/widgets/news/sanitizer.ts |
| sanitizeNewsHtml | apps/mcp-server/src/widgets/news/sanitizer.ts |
| newsWidgetState | apps/mcp-server/src/widgets/news/state.ts |
| safeNewsWidgetTelemetry | apps/mcp-server/src/widgets/news/state.ts |
| sendPublicWidgetJavascript | apps/mcp-server/src/widgets/shared/assets.ts |
| callMcpAppsTool | apps/mcp-server/src/widgets/shared/client-bridge.ts |
| handleMcpAppsBridgeMessage | apps/mcp-server/src/widgets/shared/client-bridge.ts |
| initializeMcpAppsBridge | apps/mcp-server/src/widgets/shared/client-bridge.ts |
| mcpAppsBridgeClientSource | apps/mcp-server/src/widgets/shared/client-bridge.ts |
| mcpAppsRecord | apps/mcp-server/src/widgets/shared/client-bridge.ts |
| postMcpAppsMessage | apps/mcp-server/src/widgets/shared/client-bridge.ts |
| ergebnis | apps/mcp-server/tests/bild-rueckgabe.contract.test.ts |
| audit | apps/mcp-server/tests/capability-operation-mapping.test.ts |
| harness | apps/mcp-server/tests/club-font-upload.contract.test.ts |
| input | apps/mcp-server/tests/club-font-upload.contract.test.ts |
| mergeDesign | apps/mcp-server/tests/club-font-upload.contract.test.ts |
| readerOf | apps/mcp-server/tests/club-font-upload.contract.test.ts |
| failure | apps/mcp-server/tests/community-actions.contract.test.ts |
| route | apps/mcp-server/tests/community-actions.contract.test.ts |
| service | apps/mcp-server/tests/community-actions.contract.test.ts |
| errorObjects | apps/mcp-server/tests/connector-error-rewrap.pattern.test.ts |
| rewraps | apps/mcp-server/tests/connector-error-rewrap.pattern.test.ts |
| sourceFiles | apps/mcp-server/tests/connector-error-rewrap.pattern.test.ts |
| send | apps/mcp-server/tests/event-series-template-contract.test.ts |
| fakeClient | apps/mcp-server/tests/feedback.contract.test.ts |
| buildCompoundFile | apps/mcp-server/tests/files-adapters.test.ts |
| buildZip | apps/mcp-server/tests/files-adapters.test.ts |
| bytes | apps/mcp-server/tests/files-adapters.test.ts |
| drain | apps/mcp-server/tests/files-adapters.test.ts |
| fakeClamd | apps/mcp-server/tests/files-adapters.test.ts |
| inspect | apps/mcp-server/tests/files-adapters.test.ts |
| memoryObject | apps/mcp-server/tests/files-adapters.test.ts |
| store | apps/mcp-server/tests/files-adapters.test.ts |
| streamOf | apps/mcp-server/tests/files-adapters.test.ts |
| zipInspection | apps/mcp-server/tests/files-adapters.test.ts |
| client | apps/mcp-server/tests/finance-connector.contract.test.ts |
| reader | apps/mcp-server/tests/finance-connector.contract.test.ts |
| recording | apps/mcp-server/tests/finance-connector.contract.test.ts |
| recording | apps/mcp-server/tests/finance-hub.contract.test.ts |
| connected | apps/mcp-server/tests/help-tool.test.ts |
| tab | apps/mcp-server/tests/homepage-convert.contract.test.ts |
| fakeObjects | apps/mcp-server/tests/jobs-files-runtime.integration.test.ts |
| listedToolDescriptors | apps/mcp-server/tests/jobs-files-runtime.integration.test.ts |
| listedTools | apps/mcp-server/tests/jobs-files-runtime.integration.test.ts |
| runJob | apps/mcp-server/tests/jobs-files-runtime.integration.test.ts |
| seedCleanFile | apps/mcp-server/tests/jobs-files-runtime.integration.test.ts |
| setup | apps/mcp-server/tests/jobs-files-runtime.integration.test.ts |
| snapshotFor | apps/mcp-server/tests/jobs-files-runtime.integration.test.ts |
| startUploadJob | apps/mcp-server/tests/jobs-files-runtime.integration.test.ts |
| uploadInput | apps/mcp-server/tests/jobs-files-runtime.integration.test.ts |
| json | apps/mcp-server/tests/mobile-widgets.visual.test.ts |
| passedPilot | apps/mcp-server/tests/mobile-widgets.visual.test.ts |
| readyEvidence | apps/mcp-server/tests/mobile-widgets.visual.test.ts |
| release | apps/mcp-server/tests/mobile-widgets.visual.test.ts |
| signedRelease | apps/mcp-server/tests/mobile-widgets.visual.test.ts |
| testedConnectorEvalReport | apps/mcp-server/tests/mobile-widgets.visual.test.ts |
| testedResponseQualityReport | apps/mcp-server/tests/mobile-widgets.visual.test.ts |
| testedTenantIsolationReport | apps/mcp-server/tests/mobile-widgets.visual.test.ts |
| entries | apps/mcp-server/tests/open-output-ratchet.pattern.test.ts |
| openNodes | apps/mcp-server/tests/open-output-ratchet.pattern.test.ts |
| ratchet | apps/mcp-server/tests/open-output-ratchet.pattern.test.ts |
| evidence | apps/mcp-server/tests/provider-anthropic.e2e.test.ts |
| operation | apps/mcp-server/tests/provider-anthropic.e2e.test.ts |
| tool | apps/mcp-server/tests/provider-anthropic.e2e.test.ts |
| evidence | apps/mcp-server/tests/provider-openai.e2e.test.ts |
| operation | apps/mcp-server/tests/provider-openai.e2e.test.ts |
| pngDimensions | apps/mcp-server/tests/provider-openai.e2e.test.ts |
| tool | apps/mcp-server/tests/provider-openai.e2e.test.ts |
| collect | apps/mcp-server/tests/run-report-boundary.pattern.test.ts |
| expectNoLeak | apps/mcp-server/tests/run-report-boundary.pattern.test.ts |
| fieldsOf | apps/mcp-server/tests/run-report-boundary.pattern.test.ts |
| output | apps/mcp-server/tests/run-report-boundary.pattern.test.ts |
| setAt | apps/mcp-server/tests/run-report-boundary.pattern.test.ts |
| stale | apps/mcp-server/tests/run-report-boundary.pattern.test.ts |
| textFields | apps/mcp-server/tests/run-report-boundary.pattern.test.ts |
| unclassified | apps/mcp-server/tests/run-report-boundary.pattern.test.ts |
| collect | apps/mcp-server/tests/support/output-schema.ts |
| display | apps/mcp-server/tests/support/output-schema.ts |
| isOpen | apps/mcp-server/tests/support/output-schema.ts |
| isText | apps/mcp-server/tests/support/output-schema.ts |
| walk | apps/mcp-server/tests/support/output-schema.ts |
| expectOutputSchemasAdmitPublicErrors | apps/mcp-server/tests/support/public-error-schema.ts |
| publicErrorForms | apps/mcp-server/tests/support/public-error-schema.ts |
| postCli | apps/mcp-server/tests/tenant-isolation.integration.test.ts |
| postMcp | apps/mcp-server/tests/tenant-isolation.integration.test.ts |
| runtimeCapability | apps/mcp-server/tests/tenant-isolation.integration.test.ts |
| runtimeOptions | apps/mcp-server/tests/tenant-isolation.integration.test.ts |
| runtimePrincipal | apps/mcp-server/tests/tenant-isolation.integration.test.ts |
| visibilityContext | apps/mcp-server/tests/tenant-isolation.integration.test.ts |
| connect | apps/mcp-server/tests/tool-error-boundary.pattern.test.ts |
| expectNoForeignText | apps/mcp-server/tests/tool-error-boundary.pattern.test.ts |
| runtimeServer | apps/mcp-server/tests/tool-error-boundary.pattern.test.ts |
| snapshot | apps/mcp-server/tests/tool-error-boundary.pattern.test.ts |
<!-- /techdoc:erzeugt -->


## Gebaut und geplant

| Fähigkeit | stand | Quelle |
|---|---|---|
| Kanonischer Werkzeugkatalog aus Operationsverträgen | gebaut | <!-- q: code:apps/mcp-server/src/runtime-tools.ts#createRuntimeToolCatalog; comvenio-ai-connector-02 --> |
| Öffentliche Werkzeuge ohne Login, Redaktion | gebaut | <!-- q: code:apps/mcp-server/src/public/redaction.ts#eventRecord; code:apps/mcp-server/src/public/redaction.ts#newsRecord; comvenio-ai-connector-06 --> |
| OAuth-Challenge mit Scopes, Lazy Auth | gebaut | <!-- q: code:apps/mcp-server/src/oauth-tool-challenge.ts#insufficientScopeToolResult; comvenio-ai-connector-03 --> |
| Rechte-Filter und Mandantentrennung | gebaut | <!-- q: code:apps/mcp-server/src/runtime-tools.ts#createRuntimeAccessPolicy; comvenio-ai-connector-04 --> |
| Fachwerkzeuge der acht Domänengruppen | gebaut | <!-- q: code:apps/mcp-server/src/domain-runtime.ts#registerFullDomainRuntime; comvenio-ai-connector-07; comvenio-ai-connector-13 --> |
| Vorschau, Bestätigung, Idempotenz | gebaut | <!-- q: code:apps/mcp-server/src/domain-state-store.ts#confirmationMatchHash; comvenio-ai-connector-14 --> |
| Widgets Event und Kalender, Mitglieder, Buchung und Objekt, News, Bestätigung | gebaut | <!-- q: code:apps/mcp-server/src/widget-runtime.ts#registerFullWidgetRuntime; comvenio-ai-connector-16; comvenio-ai-connector-20 --> |
| Jobs, Dateiquarantäne und -prüfung | gebaut | <!-- q: code:apps/mcp-server/src/job-file-tools.ts#registerJobFileTools; comvenio-ai-connector-15 --> |
| Hilfe-Werkzeug | gebaut | <!-- q: code:apps/mcp-server/src/help-tool.ts#registerHelpTool --> |
| Einreichung bei ChatGPT und im Claude-Connector-Verzeichnis | geplant | <!-- q: comvenio-ai-connector-21; comvenio-ai-connector-22 --> |
| Qualität, Datenschutz, Pilot und Release-Gates | geplant | <!-- q: comvenio-ai-connector-23 --> |
| Drei Ebenen, Club-Agent-API und ausführbarer Capability-Vertrag | geplant | <!-- q: comvenio-ai-connector-24 --> |
