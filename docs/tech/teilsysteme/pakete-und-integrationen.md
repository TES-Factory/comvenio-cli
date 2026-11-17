---
type: tech-teilsystem
kennung: pakete-und-integrationen
titel: Pakete und Integrationen — Auth, Konnektor-Verträge, Werkzeugkatalog, Client, Kundendoku, OpenAI, Anthropic, Release, Remotion
repository: comvenio-cli
stand: teilweise
entitaeten: []
routen: []
cli: []
dateien:
- packages/**
- integrations/**
- remotion/**
use_cases: []
entscheidungen: []
faehigkeiten:
- pakete-und-integrationen
quellen: []
letzte_beschreibung:
  klammer: null
  commit: null
---

# Pakete und Integrationen — Auth, Konnektor-Verträge, Werkzeugkatalog, Client, Kundendoku, OpenAI, Anthropic, Release, Remotion

## Zweck

Die Pakete und Integrationen sind die gemeinsamen Bausteine von comvenio-CLI und MCP-Server (Comvenio AI Connector): der OAuth- und Rechtekern (`packages/auth`), die anbieterneutralen Konnektor-Verträge mit Fehlermodell, Schreibsicherheit und Widget-Schemata (`packages/connector-contracts`), der HTTP-Client für die Comvenio-Dienste (`packages/comvenio-client`), die durchsuchbare Kundendoku (`packages/kundendoku`) und der Werkzeugkatalog, der Operationen zu Anbieter-Werkzeugen kompiliert (`packages/tool-catalog`). Dazu kommen die Einreichungs- und Freigabepakete für OpenAI, Anthropic und den Release (`integrations/`) sowie die Video-Vorlagen für News und Turniere (`remotion/`). <!-- q: code:packages/comvenio-client/src/client.ts#createComvenioApiClient; code:packages/tool-catalog/src/compiler.ts#compileProviderCatalog; code:packages/kundendoku/src/index.ts#search; code:integrations/release/src/release-gate.ts#buildReleaseGateReport; code:remotion/src/Root.tsx#RemotionRoot; comvenio-ai-connector; comvenio-cli-doku-03; cli-rich-news-07 -->

## Use Cases

**UC-1 Einen Comvenio-Dienst aufrufen.** Akteur: CLI und MCP-Server. Auslöser: jede Aktion, die Vereinsdaten liest oder schreibt. Ablauf: `createComvenioApiClient` prüft Basis-URL und Pfad, setzt das Zugangstoken, bricht nach 15 Sekunden ab (höchstens 120 Sekunden, Dateien 60 Sekunden) und wiederholt nur `GET` bis zu dreimal bei 429, 502, 503 und 504; ein HTTP-Status wird auf einen Fehlercode abgebildet (401 `AUTH_REQUIRED`, 403 `PERMISSION_DENIED` bzw. `SCOPE_REQUIRED`, 409 `CONFLICT`, 429 `RATE_LIMITED`, 400 und 422 `VALIDATION_FAILED`). Ergebnis: eine Antwort oder ein einheitlicher Konnektor-Fehler. <!-- q: code:packages/comvenio-client/src/client.ts#createComvenioApiClient; code:packages/comvenio-client/src/client.ts#errorForStatus; code:packages/comvenio-client/src/client.ts#validateRequestTarget; code:packages/comvenio-client/src/client.ts#normalizeGatewayBaseUrl; comvenio-ai-connector-01 -->

**UC-2 Einen KI-Anbieter per OAuth verbinden.** Akteur: ChatGPT oder Claude über den MCP-Server. Auslöser: der Nutzer verbindet den Connector. Ablauf: Die Metadaten nennen Authorization Code mit PKCE S256 ohne Client-Secret; der Client wird über ein Client-ID-Metadokument (CIMD) aufgelöst, das nur für gepinnte Client-IDs gilt; Anfrage, Code und Token werden feldgenau geprüft, ein lokales `cvn_`-Token wird als `invalid_grant` abgewiesen; danach wählt der Nutzer den Verein, bei genau einem Verein automatisch. Ergebnis: ein Grant mit Scopes für einen Verein. <!-- q: code:packages/auth/src/oauth/metadata.ts#createAuthorizationServerMetadata; code:packages/auth/src/oauth/wire.ts#verifyPkceS256; code:packages/auth/src/oauth/wire.ts#rejectLocalOrPasswordSecret; code:packages/auth/src/oauth/cimd-resolver.ts#validateClientId; code:packages/auth/src/oauth/club-selection.ts#createClubSelectionContext; comvenio-ai-connector-03; comvenio-ai-connector-21; comvenio-ai-connector-22 -->

**UC-3 Werkzeuge nach Rechten zeigen.** Akteur: MCP-Server. Auslöser: Werkzeugliste oder Aufruf in einem Vereinskontext. Ablauf: Die wirksamen Rechte des Nutzers kommen über `/permissions/effective/self` vom role-service, werden kanonisch gehasht und 30 Sekunden zwischengespeichert; vor einem Schreibaufruf wird neu geprüft. Ergebnis: nur Werkzeuge, die Scope und Vereinsrecht tragen. <!-- q: code:packages/auth/src/capabilities/client.ts#buildEffectivePermissionSelfPath; code:packages/auth/src/capabilities/version.ts#computeCapabilityVersion; code:packages/auth/src/capabilities/cache.ts#cacheKey; code:packages/auth/src/capabilities/errors.ts#assertCapability; comvenio-ai-connector-04 -->

**UC-4 Eine kritische Schreibaktion bestätigen.** Akteur: Nutzer im KI-Assistenten. Auslöser: ein Werkzeug der Klasse `critical_write`. Ablauf: Der Dienst legt eine Vorschau mit Bestätigungstoken an, speichert nur dessen Hash und einen Hash der Nutzlast und verbraucht die Bestätigung beim Ausführen genau einmal. Ergebnis: Quittung `succeeded`, `partially_succeeded` oder `failed`. <!-- q: code:packages/connector-contracts/src/safety/canonical.ts#safetyPayloadHash; code:packages/connector-contracts/src/safety/store.ts#confirmationRedisKey; code:packages/connector-contracts/src/safety/service.ts#receiptOutcome; comvenio-ai-connector-14 -->

**UC-5 Eine Fehlermeldung verstehen.** Akteur: Nutzer von CLI und Connector. Auslöser: ein Fehler. Ablauf: Der öffentliche Fehler nennt einen Code aus dem Katalog in der Sprache aus `--lang`, `LC_ALL`, `LANG` oder Deutsch und verweist auf `comvenio help fehler <code>`; die Kundendoku findet Artikel auch bei Tippfehlern. Ergebnis: Meldung ohne interne Dienstnamen und ein passender Hilfeartikel. <!-- q: code:packages/connector-contracts/src/public-errors.ts#renderPublicError; code:packages/connector-contracts/src/public-errors.ts#resolvePublicErrorLang; code:packages/connector-contracts/src/public-errors.ts#formatPublicError; code:packages/kundendoku/src/index.ts#search; comvenio-cli-doku-01; comvenio-cli-doku-03 -->

**UC-6 Den Werkzeugkatalog bauen.** Akteur: Entwickler und Vertragstests. Auslöser: eine neue oder geänderte Operation. Ablauf: Der Compiler prüft Rechte-Audit, Schemata und Route-Trace jeder Operation, fasst Operationen mit gleichem Gruppenschlüssel zu einem Werkzeug zusammen und erzeugt CLI- und MCP-Bindungen; der Paritätsbericht vergleicht die Operationen mit der Basis aus 303 CLI-Actions. Ergebnis: ein deterministischer Katalog für OpenAI und Anthropic. <!-- q: code:packages/tool-catalog/src/compiler.ts#compileProviderCatalog; code:packages/tool-catalog/src/parity.ts#createParityReport; code:packages/tool-catalog/src/inventory.ts#assertGeneratedInventory; comvenio-ai-connector-02 -->

**UC-7 Eine Einreichung beim Anbieter vorbereiten.** Akteur: Release-Verantwortliche. Auslöser: Einreichung im OpenAI-Marktplatz bzw. im Claude-Verzeichnis. Ablauf: Je Anbieter entstehen Manifest, Prüfer-Runbook und Einreichungspaket; ein Preflight prüft Nachweise wie Organisation, öffentlichen MCP-Endpunkt, OAuth, Rechtstexte, echte Artefakte, Werkzeugtests und Prüferkonten. Ergebnis: Bericht `ready` oder eine Liste von Blockern. <!-- q: code:integrations/openai/src/preflight.ts#runOpenAiSubmissionPreflight; code:integrations/openai/src/bundle.ts#buildMarketplaceSubmissionBundle; code:integrations/anthropic/src/preflight.ts#runAnthropicSubmissionPreflight; code:integrations/anthropic/src/bundle.ts#buildClaudeSubmissionBundle; comvenio-ai-connector-21; comvenio-ai-connector-22 -->

**UC-8 Den Release freigeben.** Akteur: Release-Manager. Auslöser: Veröffentlichung eines Release-Umfangs. Ablauf: Das Release-Gate vergleicht den geplanten Umfang mit dem veröffentlichten Laufzeitkatalog, verlangt Signaturen und bewertet offene Sicherheits- und Datenschutzbefunde. Ergebnis: freigegeben oder blockiert mit Gründen. <!-- q: code:integrations/release/src/release-gate.ts#buildReleaseGateReport; code:integrations/release/src/release-gate.ts#assertProviderReleaseReady; comvenio-ai-connector-23 -->

**UC-9 Ein Video rendern.** Akteur: Verwalter über `comvenio news video`. Auslöser: News-Video oder Turnier-Highlight. Ablauf: Die CLI prüft die Parameter und startet `node remotion/render.mjs`; das Skript legt die Bilder in einen Job-Ordner, bündelt das Projekt und rendert eine der Vorlagen `slideshow`, `result`, `teaser` oder `highlight`. Ergebnis: eine MP4-Datei. <!-- q: code:remotion/render.mjs#stage; code:remotion/src/Root.tsx#RemotionRoot; cli-rich-news-07; tournament-27 -->

## Funktionsweise

**OAuth-Grundwerte.** Ein Autorisierungszustand gilt 600 Sekunden, ein Access-Token 900 Sekunden, ein Grant verfällt nach 30 Tagen Inaktivität; ein Grant ist aktiv, solange er nicht widerrufen und nicht abgelaufen ist. <!-- q: code:packages/auth/src/oauth/lifecycle.ts#pkceChallenge; code:packages/auth/src/oauth/grant.ts#isGrantActive; comvenio-ai-connector-03 -->

**CIMD-Auflösung.** Ein Client-Metadokument wird nur für gepinnte Client-IDs geholt, mit DNS-Prüfung gegen verbotene IP-Bereiche, einer Zeitgrenze von drei Sekunden und Fingerabdruck; vor dem Release müssen Pins für OpenAI und Anthropic gesetzt sein. <!-- q: code:packages/auth/src/oauth/cimd-resolver.ts#isForbiddenCimdIpAddress; code:packages/auth/src/oauth/cimd-resolver.ts#validateClientId; code:packages/auth/src/oauth/cimd-resolver.ts#assertCimdReleaseReady; comvenio-ai-connector-21 -->

**Rechte-Version.** Die Version eines Rechte-Schnappschusses ist der base64url-kodierte SHA-256 der kanonischen Rechteliste; eine geänderte Version lädt den Schnappschuss neu, ein fehlender Vereinskontext verweigert. <!-- q: code:packages/auth/src/capabilities/version.ts#computeCapabilityVersion; code:packages/auth/src/capabilities/version.ts#createCapabilitySnapshot; code:packages/auth/src/capabilities/cache.ts#requirePrivateContext; comvenio-ai-connector-04 -->

**Schreibsicherheit.** Vorschau und Bestätigung leben je 300 Sekunden unter eigenen Redis-Schlüsseln, dazu ein Idempotenzschlüssel; Steuerfelder in der Eingabe sind verboten, die Nutzlast wird vor dem Hashen kanonisch serialisiert. <!-- q: code:packages/connector-contracts/src/safety/store.ts#previewRedisKey; code:packages/connector-contracts/src/safety/store.ts#idempotencyRedisKey; code:packages/connector-contracts/src/safety/canonical.ts#assertSafeNormalizedInput; code:packages/connector-contracts/src/safety/canonical.ts#canonicalJson; comvenio-ai-connector-14 -->

**Jobs und Uploads.** Lange Läufe werden als Job mit Abfrage nach 1, 2, 4, 8 und 15 Sekunden verfolgt; eine Datei darf höchstens 200 MiB groß sein, ein ZIP entpackt höchstens 512 MiB. <!-- q: code:packages/connector-contracts/tests/jobs.contract.test.ts#startRequest; code:packages/connector-contracts/tests/uploads.contract.test.ts#safeZip; comvenio-ai-connector-15 -->

**Release-Umfang.** Ohne Angabe gilt der Umfang `personal_productivity_v1`, daneben `club_agent_bridge_v1` und `full_connector_v1`; Maschinen-Grants dürfen keine Admin-, Rollen-, Grant- oder Mitglieder-Detail-Scopes tragen. <!-- q: code:packages/connector-contracts/src/index.ts#parseConnectorReleaseScope; code:packages/connector-contracts/src/index.ts#isMachineGrantScope; comvenio-ai-connector-23 -->

**Werkzeugnamen.** Ein Werkzeug heißt `cv_<Bereich>_<read|write|critical>_<Rechte>_<8 Zeichen Gruppen-Hash>`, höchstens 64 Zeichen; öffentliche Werkzeuge mit nur `public.read` brauchen keine `club_id` und laufen bei OpenAI ohne Anmeldung (`noauth`). <!-- q: code:packages/tool-catalog/src/compiler.ts#createToolName; code:packages/tool-catalog/src/compiler.ts#inputSchemaFor; code:integrations/openai/src/adapter.ts#securitySchemes; comvenio-ai-connector-02 -->

**Kundendoku-Suche.** Die Suche gibt je Wort drei Punkte für einen genauen Treffer, zwei für einen enthaltenen und einen für einen unscharfen (Wörter über drei Zeichen), nimmt höchstens acht Wörter zu je 40 Zeichen und lässt bis zu zwei Tippfehler je Wort zu; Artikel fallen auf Deutsch zurück. <!-- q: code:packages/kundendoku/src/index.ts#search; code:packages/kundendoku/src/index.ts#withinTwoEdits; code:packages/kundendoku/src/index.ts#article; commit:b5199a2; comvenio-cli-doku-03 -->

**Videovorlagen.** Alle Vorlagen rendern 1920 × 1080 Pixel mit 30 Bildern je Sekunde; die Länge folgt aus den Parametern (Ergebnis 12 s, Teaser 10 s, Highlight 20 s plus Zuschlag, Diashow mindestens 8 s), eine angegebene Dauer gewinnt. <!-- q: code:remotion/src/Root.tsx#toFrames; code:remotion/src/types.ts#slideshowDurationSeconds; code:remotion/src/types.ts#highlightDurationSeconds; cli-rich-news-07; tournament-27 -->

<!-- techdoc:luecke integrations/railway: nur Review-Beschreibung des MCP-Dienstes und Anleitung zum Produktionswechsel, kein Code und kein Lastenheft als Quelle -->

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

Die Pakete werden vom MCP-Server und vom CLI eingebunden; der Client ruft die Comvenio-Dienste über das Gateway, der Rechtekern den role-service, die Schreibsicherheit Redis. Das Release-Paket liest den veröffentlichten Laufzeitkatalog des MCP-Servers, die Videovorlagen laufen als Node-Prozess der CLI. <!-- q: code:packages/comvenio-client/src/client.ts#buildUrl; code:packages/auth/src/capabilities/client.ts#buildEffectivePermissionSelfPath; code:packages/connector-contracts/src/safety/store.ts#previewRedisKey; code:integrations/release/src/evidence.ts#evaluatedRuntimeToolNames; code:remotion/render.mjs#arg -->

<!-- techdoc:erzeugt abhaengigkeiten -->
Nutzt: mcp-server

Genutzt von: cli, mcp-server
<!-- /techdoc:erzeugt -->


## Regeln

- Ein publizierter Katalog braucht auditierte Operationen; jede Operation braucht Route-Trace, Rechte-Audit und eine reviewte Copy-Fixture, sonst bricht der Bau ab. <!-- q: code:packages/tool-catalog/src/compiler.ts#compileProviderCatalog; code:packages/tool-catalog/src/route-audit.ts#validateRouteTraceFixture; comvenio-ai-connector-02 -->
- Der Paritätsbericht verlangt die vollständige Basis von 303 CLI-Actions; jede Action ist durch eine Operation oder einen OAuth-Ersatz gedeckt. <!-- q: code:packages/tool-catalog/src/parity.ts#createParityReport; code:packages/tool-catalog/src/parity.ts#assertParity; comvenio-ai-connector-02 -->
- Eine Werkzeuggruppe darf höchstens eine Widget-Ressource referenzieren, und nur eine bekannte. <!-- q: code:integrations/openai/src/adapter.ts#widgetUri; code:integrations/anthropic/src/adapter.ts#widgetUri; comvenio-ai-connector-16 -->
- Der Release ist nur freigegeben, wenn Produkt, Sicherheit, Datenschutz, Release und Pilot signiert haben, Sicherheits- und Release-Signatur von verschiedenen Personen stammen und kein kritischer oder hoher Befund offen ist; ein mittlerer Befund braucht Verantwortlichen und Gegenmaßnahme. <!-- q: code:integrations/release/src/release-gate.ts#signatureGate; code:integrations/release/src/release-gate.ts#findingsGate; comvenio-ai-connector-23 -->
- Der geplante Umfang (303 Actions, 572 Routen-Aufrufstellen, 5 Widget-Verträge) und die Zahl veröffentlichter Werkzeuge müssen zum Laufzeitkatalog passen, sonst `PLANNED_SCOPE_DRIFT`. <!-- q: code:integrations/release/src/release-gate.ts#evidenceBlockers; comvenio-ai-connector-23 -->
- Ein HTTP-Aufruf wird nur bei `GET` wiederholt; schreibende Aufrufe nie. <!-- q: code:packages/comvenio-client/src/client.ts#createComvenioApiClient; comvenio-ai-connector-01 -->
- Öffentliche Fehler nennen keine internen Dienstnamen; nach einer möglichen Wirkung eines Schreibaufrufs heißt der Ausgang `OUTCOME_UNKNOWN`. <!-- q: code:packages/connector-contracts/src/public-errors.ts#publicErrorCode; commit:111d2c8; commit:0c7017f; comvenio-cli-doku-01 -->

## Fehlerbilder

- **Anonyme Suchen in der Kundendoku konnten den Dienst auslasten** → bis zu 300 Suchwörter je Anfrage ergaben rund 400 Millionen Levenshtein-Schritte → höchstens acht Wörter zu je 40 Zeichen, Vergleich nur im Band von zwei Fehlern. <!-- q: commit:b5199a2; code:packages/kundendoku/src/index.ts#withinTwoEdits; code:packages/kundendoku/src/index.ts#search -->
- **Ein Schreibfehler nach eingetretener Wirkung sah aus wie ein sicherer Fehlschlag** → der Ausgang hing an der HTTP-Methode statt an der Wirkung → `OUTCOME_UNKNOWN` nach der Wirkung, ohne Dienstnamen. <!-- q: commit:111d2c8; commit:0c7017f; code:packages/connector-contracts/src/public-errors.ts#publicErrorCode -->
- **Konflikt- und Prüffehler verloren die Begründung des Dienstes** → der Client warf das Detail weg → Detail und Zusatzfelder (etwa `live_version`, `limit`, `paused_reason`, `field`) werden übernommen. <!-- q: commit:89a3fe9; code:packages/comvenio-client/src/client.ts#detailExtras; code:packages/comvenio-client/src/client.ts#upstreamBody -->
- **Gültige Rechte-Antworten wurden abgelehnt** → der role-service liefert Zeitstempel mit wechselnder Nachkommastelle oder `+00:00`, das Muster war zu streng → tolerante Prüfung des Zeitpunkts. <!-- q: commit:d916903; code:packages/auth/src/capabilities/validation.ts#validUtcInstant; code:packages/auth/src/capabilities/validation.ts#compareConnectorPermissionSources -->
- **Die MCP-Initialisierung ohne Anbieter-Kopfzeile wurde abgelehnt** → jeder Kontext verlangte einen Anbieter → nur ein angemeldeter Kontext braucht ihn. <!-- q: commit:7a0bc35; code:packages/connector-contracts/src/index.ts#normalizeRequestContext -->
- **Ein Formular-Body hätte in Aufnahme-Tests still als passend gelten können** → der Aufnahme-Client kannte nur JSON → er lehnt Formular-Bodies ab. <!-- q: commit:27dde32; code:packages/tool-catalog/src/recording-client.ts#normalizedQuery -->

## Code-Anker

<!-- techdoc:erzeugt code-anker -->
| Symbol | Datei |
|---|---|
| widgetUri | integrations/anthropic/src/adapter.ts |
| buildClaudeSubmissionBundle | integrations/anthropic/src/bundle.ts |
| artifactPath | integrations/anthropic/src/preflight.ts |
| assertAnthropicSubmissionReady | integrations/anthropic/src/preflight.ts |
| check | integrations/anthropic/src/preflight.ts |
| realFile | integrations/anthropic/src/preflight.ts |
| runAnthropicSubmissionPreflight | integrations/anthropic/src/preflight.ts |
| safeToolCopy | integrations/anthropic/src/preflight.ts |
| validCarouselPng | integrations/anthropic/src/preflight.ts |
| buildClaudeDirectoryManifest | integrations/anthropic/src/profile.ts |
| buildClaudeReviewerRunbook | integrations/anthropic/src/runbook.ts |
| buildClaudeRuntimeToolSyncPlan | integrations/anthropic/src/tool-sync.ts |
| changedFields | integrations/anthropic/src/tool-sync.ts |
| stable | integrations/anthropic/src/tool-sync.ts |
| toolSyncPlan | integrations/anthropic/src/tool-sync.ts |
| securitySchemes | integrations/openai/src/adapter.ts |
| widgetUri | integrations/openai/src/adapter.ts |
| buildMarketplaceSubmissionBundle | integrations/openai/src/bundle.ts |
| assertOpenAiSubmissionReady | integrations/openai/src/preflight.ts |
| check | integrations/openai/src/preflight.ts |
| runOpenAiSubmissionPreflight | integrations/openai/src/preflight.ts |
| safeArtifact | integrations/openai/src/preflight.ts |
| buildChatGptAppManifest | integrations/openai/src/profile.ts |
| buildOpenAiReviewerRunbook | integrations/openai/src/runbook.ts |
| buildOpenAiRuntimeToolTestPlan | integrations/openai/src/test-plan.ts |
| buildOpenAiToolTestPlan | integrations/openai/src/test-plan.ts |
| buildPlan | integrations/openai/src/test-plan.ts |
| submissionExamples | integrations/openai/src/test-plan.ts |
| buildPendingConnectorEvalReport | integrations/release/src/evidence.ts |
| buildPendingProviderGates | integrations/release/src/evidence.ts |
| buildPendingReleaseArtifacts | integrations/release/src/evidence.ts |
| buildPendingReleaseEvidence | integrations/release/src/evidence.ts |
| buildPendingResponseQualityReport | integrations/release/src/evidence.ts |
| buildPendingSignatures | integrations/release/src/evidence.ts |
| buildPendingTenantIsolationReport | integrations/release/src/evidence.ts |
| evaluatedRuntimeToolNames | integrations/release/src/evidence.ts |
| buildPilotProtocol | integrations/release/src/pilot.ts |
| calendarDays | integrations/release/src/pilot.ts |
| buildPrivacyThreatModel | integrations/release/src/privacy.ts |
| findingBlocks | integrations/release/src/privacy.ts |
| assertProviderReleaseReady | integrations/release/src/release-gate.ts |
| buildReleaseGateReport | integrations/release/src/release-gate.ts |
| evidenceBlockers | integrations/release/src/release-gate.ts |
| findingsGate | integrations/release/src/release-gate.ts |
| signatureGate | integrations/release/src/release-gate.ts |
| resultKey | integrations/release/src/response-quality.ts |
| buildSupportRunbook | integrations/release/src/support.ts |
| cacheKey | packages/auth/src/capabilities/cache.ts |
| requirePrivateContext | packages/auth/src/capabilities/cache.ts |
| buildEffectivePermissionSelfPath | packages/auth/src/capabilities/client.ts |
| assertCapability | packages/auth/src/capabilities/errors.ts |
| assertExactKeys | packages/auth/src/capabilities/validation.ts |
| compareConnectorPermissionSources | packages/auth/src/capabilities/validation.ts |
| isRecord | packages/auth/src/capabilities/validation.ts |
| validUtcInstant | packages/auth/src/capabilities/validation.ts |
| validateCapabilityKey | packages/auth/src/capabilities/validation.ts |
| validateCapabilityUuid | packages/auth/src/capabilities/validation.ts |
| validateCapabilityVersion | packages/auth/src/capabilities/validation.ts |
| validateEffectivePermissionRead | packages/auth/src/capabilities/validation.ts |
| validatePermissionSource | packages/auth/src/capabilities/validation.ts |
| canonicalize | packages/auth/src/capabilities/version.ts |
| capabilityVersionPayload | packages/auth/src/capabilities/version.ts |
| computeCapabilityVersion | packages/auth/src/capabilities/version.ts |
| createCapabilitySnapshot | packages/auth/src/capabilities/version.ts |
| normalizedSources | packages/auth/src/capabilities/version.ts |
| denied | packages/auth/src/capabilities/visibility.ts |
| assertCimdReleaseReady | packages/auth/src/oauth/cimd-resolver.ts |
| forbiddenIpv4 | packages/auth/src/oauth/cimd-resolver.ts |
| forbiddenIpv6 | packages/auth/src/oauth/cimd-resolver.ts |
| isForbiddenCimdIpAddress | packages/auth/src/oauth/cimd-resolver.ts |
| parseRegistration | packages/auth/src/oauth/cimd-resolver.ts |
| validateClientId | packages/auth/src/oauth/cimd-resolver.ts |
| validateRedirectUri | packages/auth/src/oauth/cimd-resolver.ts |
| createClubSelectionContext | packages/auth/src/oauth/club-selection.ts |
| instant | packages/auth/src/oauth/grant.ts |
| isGrantActive | packages/auth/src/oauth/grant.ts |
| listOwnConnectorGrants | packages/auth/src/oauth/grant.ts |
| uuid | packages/auth/src/oauth/grant.ts |
| validateConnectorGrant | packages/auth/src/oauth/grant.ts |
| hashSecret | packages/auth/src/oauth/lifecycle.ts |
| pkceChallenge | packages/auth/src/oauth/lifecycle.ts |
| assertHttps | packages/auth/src/oauth/metadata.ts |
| createAuthorizationServerMetadata | packages/auth/src/oauth/metadata.ts |
| createProtectedResourceMetadata | packages/auth/src/oauth/metadata.ts |
| oauthEndpoints | packages/auth/src/oauth/metadata.ts |
| tokenHash | packages/auth/src/oauth/revocation.ts |
| validateIntrospectionResult | packages/auth/src/oauth/revocation.ts |
| sortedUnique | packages/auth/src/oauth/scope-set.ts |
| assertRegistration | packages/auth/src/oauth/wire.ts |
| createAuthorizationCodeRecord | packages/auth/src/oauth/wire.ts |
| createBearerChallenge | packages/auth/src/oauth/wire.ts |
| exactFields | packages/auth/src/oauth/wire.ts |
| httpsUrl | packages/auth/src/oauth/wire.ts |
| oauthNoStoreHeaders | packages/auth/src/oauth/wire.ts |
| one | packages/auth/src/oauth/wire.ts |
| parseAuthorizationRequest | packages/auth/src/oauth/wire.ts |
| parseIntrospectionRequest | packages/auth/src/oauth/wire.ts |
| parseTokenRequest | packages/auth/src/oauth/wire.ts |
| redirectUrl | packages/auth/src/oauth/wire.ts |
| rejectLocalOrPasswordSecret | packages/auth/src/oauth/wire.ts |
| validateAuthorizationCodeRecord | packages/auth/src/oauth/wire.ts |
| verifyPkceS256 | packages/auth/src/oauth/wire.ts |
| buildUrl | packages/comvenio-client/src/client.ts |
| configError | packages/comvenio-client/src/client.ts |
| createComvenioApiClient | packages/comvenio-client/src/client.ts |
| detailExtras | packages/comvenio-client/src/client.ts |
| discardResponseBody | packages/comvenio-client/src/client.ts |
| errorForStatus | packages/comvenio-client/src/client.ts |
| isAbortError | packages/comvenio-client/src/client.ts |
| isJsonValue | packages/comvenio-client/src/client.ts |
| normalizeGatewayBaseUrl | packages/comvenio-client/src/client.ts |
| resolveAccessToken | packages/comvenio-client/src/client.ts |
| retryAfterSeconds | packages/comvenio-client/src/client.ts |
| upstreamBody | packages/comvenio-client/src/client.ts |
| upstreamError | packages/comvenio-client/src/client.ts |
| validateRequestTarget | packages/comvenio-client/src/client.ts |
| failure | packages/comvenio-client/tests/public-errors.test.ts |
| createConnectorError | packages/connector-contracts/src/index.ts |
| createProviderNeutralResult | packages/connector-contracts/src/index.ts |
| invalidContext | packages/connector-contracts/src/index.ts |
| isConnectorError | packages/connector-contracts/src/index.ts |
| isIanaTimeZone | packages/connector-contracts/src/index.ts |
| isMachineGrantScope | packages/connector-contracts/src/index.ts |
| normalizeNullableUuid | packages/connector-contracts/src/index.ts |
| normalizeRequestContext | packages/connector-contracts/src/index.ts |
| parseConnectorReleaseScope | packages/connector-contracts/src/index.ts |
| fill | packages/connector-contracts/src/public-errors.ts |
| formatPublicError | packages/connector-contracts/src/public-errors.ts |
| isPublicErrorCode | packages/connector-contracts/src/public-errors.ts |
| publicErrorCode | packages/connector-contracts/src/public-errors.ts |
| renderPublicError | packages/connector-contracts/src/public-errors.ts |
| resolvePublicErrorLang | packages/connector-contracts/src/public-errors.ts |
| assertSafeNormalizedInput | packages/connector-contracts/src/safety/canonical.ts |
| canonicalJson | packages/connector-contracts/src/safety/canonical.ts |
| canonicalNumber | packages/connector-contracts/src/safety/canonical.ts |
| safetyPayloadHash | packages/connector-contracts/src/safety/canonical.ts |
| sha256 | packages/connector-contracts/src/safety/canonical.ts |
| bound | packages/connector-contracts/src/safety/service.ts |
| error | packages/connector-contracts/src/safety/service.ts |
| isoAfter | packages/connector-contracts/src/safety/service.ts |
| receiptOutcome | packages/connector-contracts/src/safety/service.ts |
| safeStrings | packages/connector-contracts/src/safety/service.ts |
| clone | packages/connector-contracts/src/safety/store.ts |
| confirmationRedisKey | packages/connector-contracts/src/safety/store.ts |
| idempotencyRedisKey | packages/connector-contracts/src/safety/store.ts |
| previewRedisKey | packages/connector-contracts/src/safety/store.ts |
| allowlistedNewsHtml | packages/connector-contracts/src/widgets/schemas.ts |
| bookingActionBinding | packages/connector-contracts/src/widgets/schemas.ts |
| nullableText | packages/connector-contracts/src/widgets/schemas.ts |
| safeText | packages/connector-contracts/src/widgets/schemas.ts |
| k10Dependencies | packages/connector-contracts/tests/actions.contract.test.ts |
| k11Dependencies | packages/connector-contracts/tests/actions.contract.test.ts |
| k12Dependencies | packages/connector-contracts/tests/actions.contract.test.ts |
| k13Dependencies | packages/connector-contracts/tests/actions.contract.test.ts |
| k7Capability | packages/connector-contracts/tests/actions.contract.test.ts |
| k7Client | packages/connector-contracts/tests/actions.contract.test.ts |
| k7Context | packages/connector-contracts/tests/actions.contract.test.ts |
| k7Dependencies | packages/connector-contracts/tests/actions.contract.test.ts |
| k8Capability | packages/connector-contracts/tests/actions.contract.test.ts |
| k8Context | packages/connector-contracts/tests/actions.contract.test.ts |
| k8Dependencies | packages/connector-contracts/tests/actions.contract.test.ts |
| k9Dependencies | packages/connector-contracts/tests/actions.contract.test.ts |
| context | packages/connector-contracts/tests/capabilities.contract.test.ts |
| effectiveRead | packages/connector-contracts/tests/capabilities.contract.test.ts |
| snapshot | packages/connector-contracts/tests/capabilities.contract.test.ts |
| fixture | packages/connector-contracts/tests/jobs.contract.test.ts |
| startRequest | packages/connector-contracts/tests/jobs.contract.test.ts |
| authorizationParams | packages/connector-contracts/tests/oauth.contract.test.ts |
| authorizationState | packages/connector-contracts/tests/safety.contract.test.ts |
| connectorCode | packages/connector-contracts/tests/safety.contract.test.ts |
| criticalPreview | packages/connector-contracts/tests/safety.contract.test.ts |
| fixture | packages/connector-contracts/tests/safety.contract.test.ts |
| successfulEffect | packages/connector-contracts/tests/safety.contract.test.ts |
| fixture | packages/connector-contracts/tests/uploads.contract.test.ts |
| safeInspection | packages/connector-contracts/tests/uploads.contract.test.ts |
| safeZip | packages/connector-contracts/tests/uploads.contract.test.ts |
| startAndComplete | packages/connector-contracts/tests/uploads.contract.test.ts |
| uploadRequest | packages/connector-contracts/tests/uploads.contract.test.ts |
| privateWidget | packages/connector-contracts/tests/widgets.contract.test.ts |
| article | packages/kundendoku/src/index.ts |
| articleBody | packages/kundendoku/src/index.ts |
| errorCodeOf | packages/kundendoku/src/index.ts |
| findById | packages/kundendoku/src/index.ts |
| findError | packages/kundendoku/src/index.ts |
| findTopic | packages/kundendoku/src/index.ts |
| rawArticle | packages/kundendoku/src/index.ts |
| relatedIds | packages/kundendoku/src/index.ts |
| search | packages/kundendoku/src/index.ts |
| withinTwoEdits | packages/kundendoku/src/index.ts |
| isPublicTool | packages/tool-catalog/src/catalog.ts |
| validateCatalogOperations | packages/tool-catalog/src/catalog.ts |
| visibility | packages/tool-catalog/src/catalog.ts |
| canonicalGroupKey | packages/tool-catalog/src/compiler.ts |
| cloneTools | packages/tool-catalog/src/compiler.ts |
| compileProviderCatalog | packages/tool-catalog/src/compiler.ts |
| createToolGroupKey | packages/tool-catalog/src/compiler.ts |
| createToolName | packages/tool-catalog/src/compiler.ts |
| inputSchemaFor | packages/tool-catalog/src/compiler.ts |
| outputSchemaFor | packages/tool-catalog/src/compiler.ts |
| policySlug | packages/tool-catalog/src/compiler.ts |
| riskSlug | packages/tool-catalog/src/compiler.ts |
| safeSlug | packages/tool-catalog/src/compiler.ts |
| assertGeneratedInventory | packages/tool-catalog/src/inventory.ts |
| clone | packages/tool-catalog/src/inventory.ts |
| loadReviewInventory | packages/tool-catalog/src/inventory.ts |
| assertParity | packages/tool-catalog/src/parity.ts |
| createParityReport | packages/tool-catalog/src/parity.ts |
| expectedQuery | packages/tool-catalog/src/recording-client.ts |
| normalizedQuery | packages/tool-catalog/src/recording-client.ts |
| renderExpectedPath | packages/tool-catalog/src/recording-client.ts |
| fixtureIdsAsRecord | packages/tool-catalog/src/route-audit.ts |
| resolveOperationPermissionAudit | packages/tool-catalog/src/route-audit.ts |
| routeKey | packages/tool-catalog/src/route-audit.ts |
| sortedUnique | packages/tool-catalog/src/route-audit.ts |
| validateRouteTraceFixture | packages/tool-catalog/src/route-audit.ts |
| assertCatalog | packages/tool-catalog/src/validation.ts |
| assertMatchesJsonSchema | packages/tool-catalog/src/validation.ts |
| assertNonEmptyStrings | packages/tool-catalog/src/validation.ts |
| assertRequiredClubIdSchema | packages/tool-catalog/src/validation.ts |
| assertSortedUnique | packages/tool-catalog/src/validation.ts |
| canonicalJson | packages/tool-catalog/src/validation.ts |
| deriveAnnotations | packages/tool-catalog/src/validation.ts |
| inspectSchemaNode | packages/tool-catalog/src/validation.ts |
| isJsonValue | packages/tool-catalog/src/validation.ts |
| isPlainObject | packages/tool-catalog/src/validation.ts |
| matchesType | packages/tool-catalog/src/validation.ts |
| normalizePermissionPolicy | packages/tool-catalog/src/validation.ts |
| permissionPolicyFingerprint | packages/tool-catalog/src/validation.ts |
| sha256 | packages/tool-catalog/src/validation.ts |
| sortedUnique | packages/tool-catalog/src/validation.ts |
| validateBackendRoutePermissionAudit | packages/tool-catalog/src/validation.ts |
| validateJsonSchema | packages/tool-catalog/src/validation.ts |
| validateOperationDefinition | packages/tool-catalog/src/validation.ts |
| validatePermissionPolicy | packages/tool-catalog/src/validation.ts |
| validateToolDefinition | packages/tool-catalog/src/validation.ts |
| compilerInput | packages/tool-catalog/tests/tool-catalog.test.ts |
| fixtures | packages/tool-catalog/tests/tool-catalog.test.ts |
| handlers | packages/tool-catalog/tests/tool-catalog.test.ts |
| mapRegistry | packages/tool-catalog/tests/tool-catalog.test.ts |
| routeTraces | packages/tool-catalog/tests/tool-catalog.test.ts |
| schemas | packages/tool-catalog/tests/tool-catalog.test.ts |
| arg | remotion/render.mjs |
| stage | remotion/render.mjs |
| BrandBar | remotion/src/Branding.tsx |
| FadeInOut | remotion/src/Branding.tsx |
| LogoCorner | remotion/src/Branding.tsx |
| Background | remotion/src/Highlight.tsx |
| Hero | remotion/src/Highlight.tsx |
| Highlight | remotion/src/Highlight.tsx |
| Opener | remotion/src/Highlight.tsx |
| win | remotion/src/Highlight.tsx |
| ResultBoard | remotion/src/ResultBoard.tsx |
| ScoreDigit | remotion/src/ResultBoard.tsx |
| formatDate | remotion/src/ResultBoard.tsx |
| RemotionRoot | remotion/src/Root.tsx |
| toFrames | remotion/src/Root.tsx |
| Slideshow | remotion/src/Slideshow.tsx |
| TitleIntro | remotion/src/Slideshow.tsx |
| Teaser | remotion/src/Teaser.tsx |
| formatDate | remotion/src/Teaser.tsx |
| highlightDurationSeconds | remotion/src/types.ts |
| slideshowDurationSeconds | remotion/src/types.ts |
<!-- /techdoc:erzeugt -->


## Gebaut und geplant

| Fähigkeit | stand | Quelle |
|---|---|---|
| OAuth-Kern mit PKCE, CIMD, Grants und Vereinsauswahl | gebaut | <!-- q: code:packages/auth/src/oauth/wire.ts#verifyPkceS256; code:packages/auth/src/oauth/cimd-resolver.ts#validateClientId; comvenio-ai-connector-03 --> |
| Rechte-Schnappschuss mit Version und Cache | gebaut | <!-- q: code:packages/auth/src/capabilities/version.ts#computeCapabilityVersion; comvenio-ai-connector-04 --> |
| Schreibsicherheit mit Vorschau, Bestätigung, Quittung | gebaut | <!-- q: code:packages/connector-contracts/src/safety/service.ts#receiptOutcome; comvenio-ai-connector-14 --> |
| Öffentliches Fehlermodell mit Katalog und Sprache | gebaut | <!-- q: code:packages/connector-contracts/src/public-errors.ts#renderPublicError; comvenio-cli-doku-01 --> |
| Kundendoku mit fehlertoleranter Suche | gebaut | <!-- q: code:packages/kundendoku/src/index.ts#search; comvenio-cli-doku-03 --> |
| Werkzeugkatalog-Compiler und Paritätsbericht | gebaut | <!-- q: code:packages/tool-catalog/src/compiler.ts#compileProviderCatalog; comvenio-ai-connector-02 --> |
| Einreichungspakete und Preflight für OpenAI und Anthropic | gebaut | <!-- q: code:integrations/openai/src/preflight.ts#runOpenAiSubmissionPreflight; code:integrations/anthropic/src/preflight.ts#runAnthropicSubmissionPreflight; comvenio-ai-connector-21; comvenio-ai-connector-22 --> |
| Release-Gate mit Signaturen und Befunden | gebaut | <!-- q: code:integrations/release/src/release-gate.ts#buildReleaseGateReport; comvenio-ai-connector-23 --> |
| Videovorlagen für News und Turnier-Highlights | gebaut | <!-- q: code:remotion/src/Root.tsx#RemotionRoot; cli-rich-news-07; tournament-27 --> |
| Vollumfang `full_connector_v1` | geplant | <!-- q: comvenio-ai-connector-23 --> |
| Live-Auslosung im Player der Web-App | geplant | <!-- q: tournament-28 --> |
