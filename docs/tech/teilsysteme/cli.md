---
type: tech-teilsystem
kennung: cli
titel: CLI — Befehle, Hilfe, OAuth, Schema, Abdeckung, Skripte
repository: comvenio-cli
stand: teilweise
entitaeten: []
routen: []
cli:
- action
- agent
- finance
- help
- login
- logout
- whoami
dateien:
- src/**
- apps/cli/**
- scripts/**
- tests/**
- '*.ts'
- '*.mjs'
- '*.js'
- '*.py'
use_cases: []
entscheidungen: []
faehigkeiten:
- cli
quellen: []
letzte_beschreibung:
  klammer: null
  commit: null
---

# CLI — Befehle, Hilfe, OAuth, Schema, Abdeckung, Skripte

## Zweck

Das comvenio-CLI ist das Kommandozeilenwerkzeug für Vereinsverantwortliche und ihre KI-Assistenten: Es meldet sich per OAuth im Browser an und führt dieselben typisierten Connector-Aktionen aus wie ChatGPT und Claude — mit denselben Rechten aus dem Grant, derselben Vorschau und Bestätigung bei kritischen Schreibaktionen und demselben Fehlermodell. Seit dem Geräte-Token-Abbau ist die OAuth-Anmeldung der einzige Anmeldeweg; daneben gibt es den Maschinen-Grant für Automatisierung. Zum Teilsystem gehören außerdem die Bau-, Prüf- und Generatorskripte unter `scripts/`. <!-- q: code:src/oauth/client.ts#loginWithOAuth; code:src/commands/action.ts#registerActionCommands; code:src/auth.ts#machineGrantFromEnv; geraetetoken-abbau; geraetetoken-abbau-04; comvenio-cli-doku-05 -->

## Use Cases

**UC-1 Anmelden und abmelden.** Akteur: Vereinsverantwortliche. Auslöser: `comvenio login [--env prod|dev] [--scopes …]`, `comvenio logout`. Ablauf: Das CLI startet einen Rückruf-Server auf `127.0.0.1` mit zufälligem Port, öffnet den Browser zum Comvenio-Consent, in dem der Nutzer den Verein wählt (`--club` ist nicht zulässig), und tauscht den Code gegen Tokens; ohne `--scopes` fordert es alle Scopes an, die Vereinsrollen begrenzen. Abmelden widerruft das Refresh-Token und löscht die lokale Anmeldung. Ergebnis: eine OAuth-Verbindung für genau einen Verein. <!-- q: code:src/oauth/client.ts#loginWithOAuth; code:src/oauth/client.ts#waitForAuthorizationCode; code:src/oauth/client.ts#revokeOAuthCredentials; code:src/auth.ts#writeConnectorLogin; geraetetoken-abbau-04 -->

**UC-2 Anmeldung prüfen.** Akteur: Nutzer oder Assistent. Auslöser: `comvenio whoami [--json]`. Ablauf: Das CLI zeigt Verein, Umgebung und Scopes der OAuth-Verbindung bzw. des Maschinen-Grants; Name und E-Mail kennt der Connector nicht und werden nicht erfunden. Ergebnis: wessen Anmeldung es ist und was sie darf. <!-- q: code:src/commands/whoami.ts#registerWhoamiCommand; comvenio-cli-doku-05 -->

**UC-3 Eine Aktion finden und ausführen.** Akteur: Nutzer oder KI-Assistent. Auslöser: `comvenio action list|show|call|confirm`. Ablauf: `list` zeigt die Aktionen, `show` die Eingabefelder je Teilaktion, `call` ruft die Aktion mit einer streng typisierten JSON-Eingabe über den MCP-Connector; eine kritische Schreibaktion antwortet mit einer Vorschau, und die Textausgabe nennt den fertigen `confirm`-Befehl mit demselben Idempotenzschlüssel. Ergebnis: das Ergebnis der Aktion oder eine bestätigte Ausführung. <!-- q: code:src/commands/action.ts#registerActionCommands; code:src/commands/action.ts#parseInput; code:src/commands/action-output.ts#formatActionDescription; code:src/commands/action-output.ts#formatCallText; code:src/mcp/client.ts#connectorActionToolName; commit:ba6b779 -->

**UC-4 Eine Datei hochladen.** Akteur: Nutzer. Auslöser: `comvenio action call <Upload-Aktion> --file <Pfad>`. Ablauf: Das CLI liest und hasht die Datei lokal, startet den Upload über die Datei-Werkzeuge des Connectors, lädt die Bytes an die einmalige Upload-Adresse, schließt mit Größe, SHA-256 und Typ ab und wartet auf den Virenscan, bevor es die Aktion mit der Datei-ID ruft. Ergebnis: die Datei im Verein bzw. ein Hintergrund-Job. <!-- q: code:src/commands/action-file-upload.ts#runFileUpload; code:src/commands/action-file-upload.ts#readUploadFile; code:src/commands/action-file-upload.ts#sha256Hex; code:src/commands/action-file-upload.ts#pollDelayMs; comvenio-ai-connector-15 -->

**UC-5 Mit dem Club-Agenten sprechen.** Akteur: Vereinsverantwortliche. Auslöser: `comvenio agent chat`. Ablauf: Das CLI ruft das Connector-Werkzeug `cv_club_agent_converse`; Verein und Nutzer kommen aus dem Grant, nie vom CLI; Freigabeanfragen des Agenten werden angezeigt, entschieden werden sie nur in Web oder App. Ergebnis: Antwort des Agenten mit angestoßenen Läufen und offenen Freigaben. <!-- q: code:src/commands/agent.ts#runAgentChat; code:src/commands/agent.ts#buildClubAgentConverseArguments; code:src/commands/agent.ts#formatChatResponse; geraetetoken-abbau-02 -->

**UC-6 Buchhaltung führen.** Akteur: Kassier. Auslöser: `comvenio finance …`. Ablauf: Die Befehle laufen über die typisierten Finanz-Aktionen des Connectors mit denselben Prüfungen wie für einen KI-Agenten: Verein und Abteilung aus dem Grant, Vorprüfung fremder Kennungen, Bestätigung. Ergebnis: Jahresplan, Posten und Buchungen im finance-service. <!-- q: code:src/commands/finance-connector.ts#callFinance; code:src/commands/finance-connector.ts#checkClubChoice; code:src/commands/finance.ts#registerFinanceCommands; geraetetoken-abbau-04 -->

**UC-7 Automatisiert arbeiten.** Akteur: ein Skript oder Dienst mit Maschinen-Grant. Auslöser: `COMVENIO_CLIENT_ID` und `COMVENIO_CLIENT_SECRET` (optional `COMVENIO_ENV`) sind gesetzt. Ablauf: Das CLI holt ein Token per `client_credentials`; es lebt nur im Prozess, nichts wird in Zustandsdatei oder Schlüsselbund geschrieben. Ergebnis: Aktionen ohne Browser-Anmeldung. <!-- q: code:src/auth.ts#machineGrantFromEnv; code:src/oauth/client.ts#fetchMachineAccessToken; geraetetoken-abbau-03 -->

**UC-8 Hilfe lesen.** Akteur: Nutzer. Auslöser: `comvenio help [<Thema>|fehler <Code>]`. Ablauf: Die Kundendoku ist beim Bau eingebettet und offline auf Deutsch und Englisch lesbar. Ergebnis: Hilfeartikel oder Exit-Code 1 bei unbekanntem Thema. <!-- q: code:src/commands/help.ts#registerHelpCommand; comvenio-cli-doku-03 -->

## Funktionsweise

**Umgebung und Ziele.** `--env` wählt das Gateway (`api.comvenio.app` bzw. `apidev.comvenio.app`); der MCP-Connector liegt daneben (`mcp.comvenio.app` für Produktion), beide lassen sich mit `--gateway` und `--connector` überschreiben, nur über HTTPS. OAuth hat eine eigene CLI-Ressource und nutzt nie die Audience des MCP-Servers. <!-- q: code:src/oauth/client.ts#oauthRuntime; code:src/oauth/client.ts#canonicalHttpsOrigin; geraetetoken-abbau-04 -->

**Zugangsdaten.** Access- und Refresh-Token liegen im Schlüsselspeicher des Betriebssystems: unter Windows per DPAPI geschützt, unter macOS im Schlüsselbund (bei Bedarf in Teilen), unter Linux im Secret Service; die Zustandsdatei hält nur die Verbindung (Client, Ressource, Scopes, Verein). Läuft das Access-Token ab, wird es mit dem Refresh-Token erneuert. <!-- q: code:src/oauth/credential-store.ts#saveOAuthCredentials; code:src/oauth/credential-store.ts#macosCredentialCommand; code:src/oauth/client.ts#refreshOAuthCredentials; code:src/auth.ts#loadState -->

**Profile.** `COMVENIO_CLI_PROFILE` erlaubt eine zweite Anmeldung neben der ersten, etwa für das Vier-Augen-Prinzip; jedes Profil hat eigene Zustandsdatei und eigenen Eintrag im Schlüsselspeicher. <!-- q: code:src/oauth/credential-store.ts#loadOAuthCredentials; code:src/auth.ts#stateHome; geraetetoken-abbau-04 -->

**Entfernte Befehle.** Befehle, die das CLI seit dem Geräte-Token-Abbau nicht mehr trägt, sind nicht registriert; ein Aufruf endet mit `USAGE_ERROR` und nennt die Stelle in der Web-App, ein alter Geräte-Token-Block in der Zustandsdatei wird entfernt und gemeldet. <!-- q: code:src/commands/removed.ts#removedCommandError; code:src/commands/removed.ts#deviceBlockRemovedNotice; code:src/auth.ts#dropDeviceBlock; geraetetoken-abbau-02 -->

**Fehlerausgabe.** Jeder Fehler erscheint als „Fehler <CODE>: <Meldung> <Ursache>“ mit nächstem Befehl und Hilfeverweis, mit `--json` als ein Objekt; die Texte kommen aus dem Fehlerkatalog. Lehnt das MCP-SDK eine Eingabe vor dem Werkzeug ab, nennt das CLI das abgelehnte Feld. <!-- q: code:src/mcp/client.ts#inputValidationDetail; code:src/commands/removed.ts#unknownCommandError; comvenio-cli-doku-01; commit:ba6b779 -->

**Skripte.** Unter `scripts/` liegen Generatoren für Kundendoku und Schemata, die Prüfungen der Anbieter-Einreichungen und des Connector-Releases und der Probelauf, in dem eine fremde KI-Sitzung nur mit CLI und Hilfe einen festen Aufgabenkatalog löst und die Doku daran gemessen wird. <!-- q: code:scripts/docs-lib.ts#generateDocs; code:scripts/docs-lib.ts#checkDocs; code:scripts/gen-schema.ts#genEvent; code:scripts/probelauf.ts#baueKatalog; code:scripts/probelauf.ts#bewerteLoesung; comvenio-cli-doku-03; comvenio-cli-doku-09 -->

<!-- techdoc:luecke Übrige Skripte (etwa Rechenschaftsberichte, Lageplan, Web-App-Führung) nur im Code, ohne Beschreibung je Skript -->

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

| Befehl | Datei | Symbol | Ruft |
|---|---|---|---|
| action | src/commands/action.ts | registerActionCommands |  |
| agent | src/commands/agent.ts | registerAgentCommands |  |
| finance | src/commands/finance.ts | registerFinanceCommands |  |
| help | src/commands/help.ts | registerHelpCommand |  |
| login | src/index.ts | widerrufeVerwaistenGrant |  |
| logout | src/index.ts | widerrufeVerwaistenGrant |  |
| whoami | src/commands/whoami.ts | registerWhoamiCommand |  |

**Hooks**

_Keine Einträge._

**Ereignisse**

_Keine Einträge._
<!-- /techdoc:erzeugt -->


## Abhängigkeiten

Das CLI nutzt den Comvenio-OAuth-Server und den MCP-Connector für alle Aktionen, den Schlüsselspeicher des Betriebssystems für Tokens und die gemeinsamen Pakete für Verträge, Fehlermodell und Kundendoku. <!-- q: code:src/oauth/client.ts#loginWithOAuth; code:src/mcp/client.ts#connectorActionToolName; code:src/oauth/credential-store.ts#saveOAuthCredentials -->

<!-- techdoc:erzeugt abhaengigkeiten -->
Nutzt: mcp-server, pakete-und-integrationen

Genutzt von: mcp-server
<!-- /techdoc:erzeugt -->


## Regeln

- Den Verein wählt der Nutzer im Comvenio-Consent; `--club` beim Login ist nicht zulässig. <!-- q: code:src/oauth/client.ts#loginWithOAuth; geraetetoken-abbau-04 -->
- Ein Maschinen-Grant schreibt nichts auf die Platte und gilt für genau eine Umgebung mit öffentlichem HTTPS-Gateway. <!-- q: code:src/auth.ts#machineGrantFromEnv; code:src/auth.ts#loadState; geraetetoken-abbau-03 -->
- `--file` gilt nur für `action call` mit einer Upload-Aktion; Felder, die aus der Datei abgeleitet werden, dürfen nicht in der Eingabe stehen. <!-- q: code:src/commands/action.ts#registerActionCommands; code:src/commands/action-file-upload.ts#assertNoFileDerivedFields; comvenio-ai-connector-15 -->
- Eine Bestätigung muss denselben Idempotenzschlüssel tragen wie der Aufruf mit Vorschau. <!-- q: code:src/commands/action-output.ts#formatCallText; commit:ba6b779; comvenio-ai-connector-14 -->

## Fehlerbilder

- **Schema-Fehler vor dem Werkzeug kamen als `UNKNOWN_ERROR` an** → das MCP-SDK lehnt die Eingabe vor jedem Handler ab → das CLI wertet die Meldung aus und antwortet `VALIDATION_FAILED` mit dem Feld (etwa `input.operation`). <!-- q: commit:ba6b779; code:src/mcp/client.ts#inputValidationDetail -->
- **`action confirm` endete in `CONFIRMATION_MISMATCH`** → der erzeugte Idempotenzschlüssel stand nur in `--json`, ein neuer Schlüssel beim Bestätigen passte nicht → die Textausgabe nennt den fertigen `confirm`-Befehl. <!-- q: commit:ba6b779; code:src/commands/action-output.ts#formatCallText -->
- **Bilder aus Screenshot-Aktionen gingen verloren** → die Ausgabe verwarf Bildinhalte → sie werden als Dateien gespeichert. <!-- q: commit:ba6b779; code:src/commands/action-output.ts#saveScreenshots -->
- **Nicht bestätigte Wirkungen einer Freigabe fehlten in der Ausgabe von `agent chat`** → die Ausgabe zeigte nur Bestätigtes → offene Wirkungen werden angezeigt. <!-- q: commit:01e4446; code:src/commands/agent.ts#formatChatResponse -->

## Code-Anker

<!-- techdoc:erzeugt code-anker -->
| Symbol | Datei |
|---|---|
| loadActionInventory | scripts/action-inventory.ts |
| load | scripts/audit-capability-mapping.ts |
| buildStamp | scripts/build-cli.ts |
| commit | scripts/build-cli.ts |
| actionTopic | scripts/docs-lib.ts |
| checkDocs | scripts/docs-lib.ts |
| commandsBlock | scripts/docs-lib.ts |
| embeddedArticlesModule | scripts/docs-lib.ts |
| errorSlug | scripts/docs-lib.ts |
| generateDocs | scripts/docs-lib.ts |
| headings | scripts/docs-lib.ts |
| kundentextVerstoss | scripts/docs-lib.ts |
| markdownFiles | scripts/docs-lib.ts |
| parseArticle | scripts/docs-lib.ts |
| parseList | scripts/docs-lib.ts |
| readArticles | scripts/docs-lib.ts |
| readCatalog | scripts/docs-lib.ts |
| readHomepageSchema | scripts/docs-lib.ts |
| readWebAppFuehrung | scripts/docs-lib.ts |
| realUuid | scripts/docs-lib.ts |
| sectionBody | scripts/docs-lib.ts |
| vorlagenBlock | scripts/docs-lib.ts |
| webAppBlock | scripts/docs-lib.ts |
| webAppHubs | scripts/docs-lib.ts |
| widgetsBlock | scripts/docs-lib.ts |
| withCommandsBlock | scripts/docs-lib.ts |
| withMarkedBlock | scripts/docs-lib.ts |
| withVorlagenBlock | scripts/docs-lib.ts |
| withWebAppBlock | scripts/docs-lib.ts |
| withWidgetsBlock | scripts/docs-lib.ts |
| abteilungsPlan | scripts/finance-sim.ts |
| act | scripts/finance-sim.ts |
| beleg | scripts/finance-sim.ts |
| cli | scripts/finance-sim.ts |
| d | scripts/finance-sim.ts |
| dienstCode | scripts/finance-sim.ts |
| eur | scripts/finance-sim.ts |
| fin | scripts/finance-sim.ts |
| main | scripts/finance-sim.ts |
| monatlich | scripts/finance-sim.ts |
| quartal | scripts/finance-sim.ts |
| rnd | scripts/finance-sim.ts |
| rund | scripts/finance-sim.ts |
| saisonBericht | scripts/finance-sim.ts |
| save | scripts/finance-sim.ts |
| simulate2026 | scripts/finance-sim.ts |
| simulateAbteilungen | scripts/finance-sim.ts |
| simulateBereichAlsSicht | scripts/finance-sim.ts |
| simulateKorrektur | scripts/finance-sim.ts |
| simulateSaison | scripts/finance-sim.ts |
| simulateYear | scripts/finance-sim.ts |
| step | scripts/finance-sim.ts |
| vary | scripts/finance-sim.ts |
| writeTmp | scripts/finance-sim.ts |
| codeFieldsNotDocumented | scripts/gen-schema.ts |
| configFieldsNotInSource | scripts/gen-schema.ts |
| diffSummary | scripts/gen-schema.ts |
| documentedValuesNotInSource | scripts/gen-schema.ts |
| forwardedWidgetSources | scripts/gen-schema.ts |
| genBooking | scripts/gen-schema.ts |
| genEvent | scripts/gen-schema.ts |
| genHomepage | scripts/gen-schema.ts |
| genMember | scripts/gen-schema.ts |
| genMenu | scripts/gen-schema.ts |
| genTask | scripts/gen-schema.ts |
| importedConfigBodies | scripts/gen-schema.ts |
| leseErklaerungenDeklaration | scripts/gen-schema.ts |
| leseFelderDeklaration | scripts/gen-schema.ts |
| looksLikeFieldList | scripts/gen-schema.ts |
| main | scripts/gen-schema.ts |
| meldeHomepageBefunde | scripts/gen-schema.ts |
| parseFieldBlob | scripts/gen-schema.ts |
| parseLiteralUnionAliases | scripts/gen-schema.ts |
| parseMenuDesignOptions | scripts/gen-schema.ts |
| parsePromptConfigs | scripts/gen-schema.ts |
| parsePromptWidgetKinds | scripts/gen-schema.ts |
| parsePyEnum | scripts/gen-schema.ts |
| parsePythonLiteral | scripts/gen-schema.ts |
| parsePythonStringSet | scripts/gen-schema.ts |
| parseSectionEnums | scripts/gen-schema.ts |
| parseWidgetKinds | scripts/gen-schema.ts |
| parseWidgetSources | scripts/gen-schema.ts |
| slash | scripts/gen-schema.ts |
| stableJson | scripts/gen-schema.ts |
| veralteteAusnahmen | scripts/gen-schema.ts |
| parseErklaerungenJson | scripts/homepage-erklaerungen.ts |
| array | scripts/import-connector-inventory.ts |
| assert | scripts/import-connector-inventory.ts |
| findSourcecodeRoot | scripts/import-connector-inventory.ts |
| integer | scripts/import-connector-inventory.ts |
| parseYaml | scripts/import-connector-inventory.ts |
| record | scripts/import-connector-inventory.ts |
| sha256 | scripts/import-connector-inventory.ts |
| stableJson | scripts/import-connector-inventory.ts |
| string | scripts/import-connector-inventory.ts |
| uniqueStrings | scripts/import-connector-inventory.ts |
| writeOrCheck | scripts/import-connector-inventory.ts |
| writeTextOrCheck | scripts/import-connector-inventory.ts |
| comvenio | scripts/probelauf-lauf.ts |
| fehler | scripts/probelauf-lauf.ts |
| fuehreAus | scripts/probelauf-lauf.ts |
| option | scripts/probelauf-lauf.ts |
| optionen | scripts/probelauf-lauf.ts |
| baueKatalog | scripts/probelauf.ts |
| befehlVon | scripts/probelauf.ts |
| bekannteActions | scripts/probelauf.ts |
| berichtMarkdown | scripts/probelauf.ts |
| bewertbar | scripts/probelauf.ts |
| bewerteLoesung | scripts/probelauf.ts |
| claudeArgumente | scripts/probelauf.ts |
| cliHuelle | scripts/probelauf.ts |
| codeSpans | scripts/probelauf.ts |
| dateiImSandbox | scripts/probelauf.ts |
| erfundenes | scripts/probelauf.ts |
| faqPaare | scripts/probelauf.ts |
| filterImSandbox | scripts/probelauf.ts |
| gemessen | scripts/probelauf.ts |
| genannt | scripts/probelauf.ts |
| gruppiere | scripts/probelauf.ts |
| hashAufgaben | scripts/probelauf.ts |
| imSandbox | scripts/probelauf.ts |
| imTitel | scripts/probelauf.ts |
| istConfirm | scripts/probelauf.ts |
| istNachschlag | scripts/probelauf.ts |
| istStabil | scripts/probelauf.ts |
| kernaussagen | scripts/probelauf.ts |
| klickAussagen | scripts/probelauf.ts |
| leseTranskript | scripts/probelauf.ts |
| luecken | scripts/probelauf.ts |
| mcpKonfiguration | scripts/probelauf.ts |
| menueSchritte | scripts/probelauf.ts |
| nichtGemessen | scripts/probelauf.ts |
| normal | scripts/probelauf.ts |
| prompt | scripts/probelauf.ts |
| segmente | scripts/probelauf.ts |
| slug | scripts/probelauf.ts |
| standardSatz | scripts/probelauf.ts |
| strangFuer | scripts/probelauf.ts |
| vergleiche | scripts/probelauf.ts |
| webAppAufgaben | scripts/probelauf.ts |
| werteAus | scripts/probelauf.ts |
| widgetFragen | scripts/probelauf.ts |
| zelle | scripts/probelauf.ts |
| readSource | scripts/quellen.ts |
| resolveSource | scripts/quellen.ts |
| umleitung | scripts/quellen.ts |
| workspaceRoot | scripts/quellen.ts |
| SAMMEL | scripts/rele/uebernahme.ts |
| argumente | scripts/rele/uebernahme.ts |
| bruttoSoll | scripts/rele/uebernahme.ts |
| eingabeHash | scripts/rele/uebernahme.ts |
| laufen | scripts/rele/uebernahme.ts |
| planen | scripts/rele/uebernahme.ts |
| pruefeGate | scripts/rele/uebernahme.ts |
| schrittSchluessel | scripts/rele/uebernahme.ts |
| centroid | scripts/render-gruendungsfest-lageplan.mjs |
| esc | scripts/render-gruendungsfest-lageplan.mjs |
| labelPoint | scripts/render-gruendungsfest-lageplan.mjs |
| parsePoints | scripts/render-gruendungsfest-lageplan.mjs |
| sx | scripts/render-gruendungsfest-lageplan.mjs |
| sy | scripts/render-gruendungsfest-lageplan.mjs |
| stable | scripts/sync-provider-submission-scope.ts |
| sync | scripts/sync-provider-submission-scope.ts |
| assertSame | scripts/validate-connector-release.ts |
| readJson | scripts/validate-connector-release.ts |
| requestedWriteScope | scripts/validate-connector-release.ts |
| stable | scripts/validate-connector-release.ts |
| abschnitt | scripts/web-app-fuehrung.ts |
| aktionenVon | scripts/web-app-fuehrung.ts |
| bauWebAppFuehrung | scripts/web-app-fuehrung.ts |
| dateien | scripts/web-app-fuehrung.ts |
| elemente | scripts/web-app-fuehrung.ts |
| hubVon | scripts/web-app-fuehrung.ts |
| klubEintraege | scripts/web-app-fuehrung.ts |
| kundentext | scripts/web-app-fuehrung.ts |
| leseNavigation | scripts/web-app-fuehrung.ts |
| leseSpezifikation | scripts/web-app-fuehrung.ts |
| lies | scripts/web-app-fuehrung.ts |
| menuepfadVon | scripts/web-app-fuehrung.ts |
| modulLiterale | scripts/web-app-fuehrung.ts |
| registryLabels | scripts/web-app-fuehrung.ts |
| sammleAnker | scripts/web-app-fuehrung.ts |
| sectionsVon | scripts/web-app-fuehrung.ts |
| titelVon | scripts/web-app-fuehrung.ts |
| vertraege | scripts/web-app-fuehrung.ts |
| webPfad | scripts/web-app-fuehrung.ts |
| webPfade | scripts/web-app-fuehrung.ts |
| zweckVon | scripts/web-app-fuehrung.ts |
| aufraeumenNachFehlschlag | src/auth.ts |
| clearAllAuthState | src/auth.ts |
| clearState | src/auth.ts |
| connectorAusRoh | src/auth.ts |
| dropDeviceBlock | src/auth.ts |
| gleichesGateway | src/auth.ts |
| leseConnector | src/auth.ts |
| leseDatei | src/auth.ts |
| loadMachineState | src/auth.ts |
| loadState | src/auth.ts |
| machineCacheKey | src/auth.ts |
| machineGrantFromEnv | src/auth.ts |
| objekt | src/auth.ts |
| parseStoredState | src/auth.ts |
| raeumeNachFehlschlagAuf | src/auth.ts |
| readStoredState | src/auth.ts |
| removeDeviceBlock | src/auth.ts |
| resetMachineTokenCache | src/auth.ts |
| resolveOAuthCredentials | src/auth.ts |
| runtimeForState | src/auth.ts |
| schreibeZustand | src/auth.ts |
| stateHome | src/auth.ts |
| text | src/auth.ts |
| writeConnectorLogin | src/auth.ts |
| cliVersion | src/build-info.ts |
| EXTENSION_MIME | src/commands/action-file-upload.ts |
| assertNoFileDerivedFields | src/commands/action-file-upload.ts |
| clubFontResult | src/commands/action-file-upload.ts |
| dataShareFileResult | src/commands/action-file-upload.ts |
| defaultSleep | src/commands/action-file-upload.ts |
| errorCode | src/commands/action-file-upload.ts |
| formatFileUploadResult | src/commands/action-file-upload.ts |
| isFileUploadAction | src/commands/action-file-upload.ts |
| jobUnfinished | src/commands/action-file-upload.ts |
| mimeForFilename | src/commands/action-file-upload.ts |
| object | src/commands/action-file-upload.ts |
| pollDelayMs | src/commands/action-file-upload.ts |
| purposeFor | src/commands/action-file-upload.ts |
| readUploadFile | src/commands/action-file-upload.ts |
| retryAfterMs | src/commands/action-file-upload.ts |
| runFileUpload | src/commands/action-file-upload.ts |
| sha256Hex | src/commands/action-file-upload.ts |
| uploadIncomplete | src/commands/action-file-upload.ts |
| fileStem | src/commands/action-output.ts |
| formatActionDescription | src/commands/action-output.ts |
| formatCallText | src/commands/action-output.ts |
| inputVariants | src/commands/action-output.ts |
| object | src/commands/action-output.ts |
| saveScreenshots | src/commands/action-output.ts |
| typeOf | src/commands/action-output.ts |
| connector | src/commands/action.ts |
| parseInput | src/commands/action.ts |
| registerActionCommands | src/commands/action.ts |
| uploadFile | src/commands/action.ts |
| buildClubAgentConverseArguments | src/commands/agent.ts |
| formatChatResponse | src/commands/agent.ts |
| object | src/commands/agent.ts |
| parseClubAgentAnswer | src/commands/agent.ts |
| registerAgentCommands | src/commands/agent.ts |
| resolveAgentChatMessage | src/commands/agent.ts |
| runAgentChat | src/commands/agent.ts |
| sessionLostHint | src/commands/agent.ts |
| detectAgent | src/commands/feedback-client.ts |
| withFeedbackClient | src/commands/feedback-client.ts |
| belegLaden | src/commands/finance-connector.ts |
| callFinance | src/commands/finance-connector.ts |
| cents | src/commands/finance-connector.ts |
| checkClubChoice | src/commands/finance-connector.ts |
| compact | src/commands/finance-connector.ts |
| csvZelle | src/commands/finance-connector.ts |
| exklusivSchreiben | src/commands/finance-connector.ts |
| fileInput | src/commands/finance-connector.ts |
| findConfirmation | src/commands/finance-connector.ts |
| fundstelle | src/commands/finance-connector.ts |
| gueltigesLabel | src/commands/finance-connector.ts |
| isObject | src/commands/finance-connector.ts |
| labelText | src/commands/finance-connector.ts |
| mapClassic | src/commands/finance-connector.ts |
| need | src/commands/finance-connector.ts |
| ohneDatei | src/commands/finance-connector.ts |
| renderPruefbericht | src/commands/finance-connector.ts |
| runBelege | src/commands/finance-connector.ts |
| runHub | src/commands/finance-connector.ts |
| runPruefung | src/commands/finance-connector.ts |
| vereinsplanDesJahres | src/commands/finance-connector.ts |
| year | src/commands/finance-connector.ts |
| zelle | src/commands/finance-connector.ts |
| registerFinanceCommands | src/commands/finance.ts |
| removedFinanceActionError | src/commands/finance.ts |
| registerHelpCommand | src/commands/help.ts |
| terminalWidth | src/commands/help.ts |
| deviceBlockRemovedNotice | src/commands/removed.ts |
| deviceTokenOptionError | src/commands/removed.ts |
| removedCommandError | src/commands/removed.ts |
| unknownCommandError | src/commands/removed.ts |
| unmatchedCommandError | src/commands/removed.ts |
| registerWhoamiCommand | src/commands/whoami.ts |
| userLine | src/commands/whoami.ts |
| cleanDetail | src/errors.ts |
| exitCodeFor | src/errors.ts |
| formatCliError | src/errors.ts |
| langArgument | src/errors.ts |
| object | src/errors.ts |
| resolveCliLang | src/errors.ts |
| strings | src/errors.ts |
| toPublicError | src/errors.ts |
| output | src/format.ts |
| renderTable | src/format.ts |
| truncate | src/format.ts |
| article | src/help/help.ts |
| help | src/help/help.ts |
| helpArgument | src/help/help.ts |
| listing | src/help/help.ts |
| notFound | src/help/help.ts |
| overview | src/help/help.ts |
| renderArticle | src/help/render.ts |
| stripInline | src/help/render.ts |
| tableCells | src/help/render.ts |
| wrap | src/help/render.ts |
| wrapCode | src/help/render.ts |
| main | src/index.ts |
| widerrufeVerwaistenGrant | src/index.ts |
| actionArguments | src/mcp/client.ts |
| connectionNeverOpened | src/mcp/client.ts |
| connectorActionToolName | src/mcp/client.ts |
| connectorToolActionId | src/mcp/client.ts |
| inputValidationDetail | src/mcp/client.ts |
| object | src/mcp/client.ts |
| base64Url | src/oauth/client.ts |
| canonicalHttpsOrigin | src/oauth/client.ts |
| defaultConnectorOrigin | src/oauth/client.ts |
| fetchMachineAccessToken | src/oauth/client.ts |
| formPost | src/oauth/client.ts |
| loginWithOAuth | src/oauth/client.ts |
| machineTokenResponse | src/oauth/client.ts |
| oauthRuntime | src/oauth/client.ts |
| openSystemBrowser | src/oauth/client.ts |
| refreshOAuthCredentials | src/oauth/client.ts |
| revokeOAuthCredentials | src/oauth/client.ts |
| tokenResponse | src/oauth/client.ts |
| waitForAuthorizationCode | src/oauth/client.ts |
| clearOAuthCredentials | src/oauth/credential-store.ts |
| credentialCommand | src/oauth/credential-store.ts |
| execRun | src/oauth/credential-store.ts |
| keychainHead | src/oauth/credential-store.ts |
| keychainPartCount | src/oauth/credential-store.ts |
| linuxCredentialCommand | src/oauth/credential-store.ts |
| loadOAuthCredentials | src/oauth/credential-store.ts |
| macosCredentialCommand | src/oauth/credential-store.ts |
| powershellCredentialCommand | src/oauth/credential-store.ts |
| saveOAuthCredentials | src/oauth/credential-store.ts |
| validateCredentials | src/oauth/credential-store.ts |
| windowsProtect | src/oauth/credential-store.ts |
| windowsUnprotect | src/oauth/credential-store.ts |
| cliProfile | src/profile.ts |
| profileSuffix | src/profile.ts |
| readJsonFile | src/util/file.ts |
| fakeClient | tests/action-file-upload.test.ts |
| fakePut | tests/action-file-upload.test.ts |
| handle | tests/action-file-upload.test.ts |
| job | tests/action-file-upload.test.ts |
| localFile | tests/action-file-upload.test.ts |
| recordingSleep | tests/action-file-upload.test.ts |
| agentAnswer | tests/agent.test.ts |
| fakeConnector | tests/agent.test.ts |
| lies | tests/anmeldewege.test.ts |
| mitEigenemHeim | tests/anmeldewege.test.ts |
| pfadIn | tests/anmeldewege.test.ts |
| schreibe | tests/anmeldewege.test.ts |
| errorArticle | tests/check-docs.test.ts |
| fixture | tests/check-docs.test.ts |
| hubTopic | tests/check-docs.test.ts |
| topic | tests/check-docs.test.ts |
| write | tests/check-docs.test.ts |
| connectorAnswering | tests/cli-befunde-k16.test.ts |
| sdkValidationText | tests/cli-befunde-k16.test.ts |
| client | tests/cli-befunde-maschinen-grant.test.ts |
| failure | tests/cli-befunde-maschinen-grant.test.ts |
| credentials | tests/credential-store-macos.test.ts |
| fakeSecurity | tests/credential-store-macos.test.ts |
| file | tests/credential-store-windows.test.ts |
| articles | tests/docs-examples.test.ts |
| fill | tests/docs-examples.test.ts |
| dateien | tests/feldweg-spalten-breiten.test.ts |
| client | tests/finance-belege.test.ts |
| datei | tests/finance-belege.test.ts |
| client | tests/finance-pruefung.test.ts |
| files | tests/geraetetoken-abbau-04.test.ts |
| withOwnHome | tests/geraetetoken-abbau-04.test.ts |
| fixture | tests/homepage-erklaerungen.test.ts |
| errorArticle | tests/homepage-widgets-vorlagen-docs.test.ts |
| fixture | tests/homepage-widgets-vorlagen-docs.test.ts |
| homepageArticle | tests/homepage-widgets-vorlagen-docs.test.ts |
| schema | tests/homepage-widgets-vorlagen-docs.test.ts |
| write | tests/homepage-widgets-vorlagen-docs.test.ts |
| sourceFiles | tests/package-boundaries.architecture.test.ts |
| aufgabe | tests/probelauf.test.ts |
| bash | tests/probelauf.test.ts |
| bericht | tests/probelauf.test.ts |
| posixShell | tests/probelauf.test.ts |
| transkript | tests/probelauf.test.ts |
| json | tests/railway-config.test.ts |
| dienst | tests/rele-uebernahme.test.ts |
| neu | tests/rele-uebernahme.test.ts |
| schema | tests/schema.test.ts |
| bau | tests/web-app-fuehrung.test.ts |
| docsFixture | tests/web-app-fuehrung.test.ts |
| hubArticle | tests/web-app-fuehrung.test.ts |
| tempRoot | tests/web-app-fuehrung.test.ts |
| workspace | tests/web-app-fuehrung.test.ts |
| write | tests/web-app-fuehrung.test.ts |
| runHelp | tests/workspace-compatibility.test.ts |
| workspacePackages | tests/workspace-lockfile.test.ts |
<!-- /techdoc:erzeugt -->


## Gebaut und geplant

| Fähigkeit | stand | Quelle |
|---|---|---|
| OAuth-Login mit Browser, Refresh und Widerruf | gebaut | <!-- q: code:src/oauth/client.ts#loginWithOAuth; geraetetoken-abbau-04 --> |
| Maschinen-Grant über Umgebungsvariablen | gebaut | <!-- q: code:src/auth.ts#machineGrantFromEnv; geraetetoken-abbau-03 --> |
| Connector-Aktionen mit Vorschau und Bestätigung | gebaut | <!-- q: code:src/commands/action.ts#registerActionCommands; comvenio-ai-connector-14 --> |
| Datei-Upload mit Virenscan | gebaut | <!-- q: code:src/commands/action-file-upload.ts#runFileUpload; comvenio-ai-connector-15 --> |
| Club-Agent-Chat über den Connector | gebaut | <!-- q: code:src/commands/agent.ts#runAgentChat; geraetetoken-abbau-02 --> |
| Buchhaltung über Finanz-Aktionen | gebaut | <!-- q: code:src/commands/finance-connector.ts#callFinance; geraetetoken-abbau-04 --> |
| Offline-Hilfe und Fehlerkatalog | gebaut | <!-- q: code:src/commands/help.ts#registerHelpCommand; comvenio-cli-doku-01; comvenio-cli-doku-03 --> |
| Profile für eine zweite Anmeldung | gebaut | <!-- q: code:src/auth.ts#stateHome; geraetetoken-abbau-04 --> |
