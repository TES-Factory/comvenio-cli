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

<!-- techdoc:luecke noch nicht beschrieben -->

## Use Cases

<!-- techdoc:luecke noch nicht beschrieben -->

## Funktionsweise

<!-- techdoc:luecke noch nicht beschrieben -->

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

<!-- techdoc:luecke noch nicht beschrieben -->

<!-- techdoc:erzeugt abhaengigkeiten -->
Nutzt: mcp-server

Genutzt von: cli, mcp-server
<!-- /techdoc:erzeugt -->


## Regeln

<!-- techdoc:luecke noch nicht beschrieben -->

## Fehlerbilder

<!-- techdoc:luecke noch nicht beschrieben -->

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

<!-- techdoc:luecke noch nicht beschrieben -->
