# Dashboard<br><sup>MFE User Journey - Learner</sup>

<img src="https://github.com/Ngx-Workshop/.github/blob/main/readme-assets/angular-gradient-wordmark.gif?raw=true" height="132" alt="Angular Logo" /> <img src="https://github.com/Ngx-Workshop/.github/blob/main/readme-assets/module-federation-logo.svg?raw=true" style="max-width: 100%;height: 132px;" alt="Module Federation" />

Angular micro-frontend (remote) for the **Learner Dashboard** user journey in the NGX Workshop ecosystem.

Angular 21 standalone micro-frontend that exposes a dashboard experience as a Module Federation remote for NGX Workshop. It ships a dynamic widget orchestrator (drag-drop grid, lazy-loaded widgets, inter-widget event bus) and exposes both the shell component and route config under the remote name `ngx-seed-mfe`.

## Getting Started

- Prereqs: Node 20+ and npm.
- Install: `npm install`
- Develop: `npm start` (serves on http://localhost:4201 with `remoteEntry.js`)
- Dev bundle (watch + static server): `npm run dev:bundle`
- Tests: `npm test`
- Build: `npm run build` (outputs to `dist/mfe-user-journey-dashboard`)

### Consuming as a remote

Add the remote to a host’s federation map:

```js
remotes: {
	'ngx-seed-mfe': 'ngx-seed-mfe@http://localhost:4201/remoteEntry.js',
}
```

Consume either the routed entry (`./Routes`) or the standalone component (`./Component`):

```ts
// Example route in a host
{
	path: 'dashboard',
	loadChildren: () => import('ngx-seed-mfe/Routes').then((m) => m.Routes),
}
```

## Architectural Overview

- **Entry & Bootstrap**: [src/bootstrap.ts](src/bootstrap.ts#L1-L6) bootstraps the standalone App with providers from [src/app/app.config.ts](src/app/app.config.ts#L1-L17) (HTTP client, animations, zoneless CD).
- **App Shell**: [src/app/app.ts](src/app/app.ts#L1-L55) hosts the router/animations and wires the NGX user metadata service for auth/user context. Routes are defined in [src/app/app.routes.ts](src/app/app.routes.ts#L1-L13).
- **Module Federation**: [webpack.config.js](webpack.config.js#L1-L48) registers the remote as `ngx-seed-mfe`, exposing `./Component` and `./Routes`, sharing Angular, Material, RxJS, and the user metadata lib.
- **Widget Orchestrator Library**: exported via [src/app/widget-orchestrator/index.ts](src/app/widget-orchestrator/index.ts#L1-L24) and used by the demo dashboard.
  - Registry: [services/widget-registry.service.ts](src/app/widget-orchestrator/services/widget-registry.service.ts#L1-L132) validates/organizes widget definitions, categories, and lazy loading.
  - Orchestrator: [services/widget-orchestrator.service.ts](src/app/widget-orchestrator/services/widget-orchestrator.service.ts#L1-L191) owns widget lifecycle (create/load/destroy), configuration and data updates, and an event bus for inter-widget communication.
  - Dashboard UI: [components/widget-dashboard.component.ts](src/app/widget-orchestrator/components/widget-dashboard.component.ts#L1-L120) renders a drag-drop, resizable grid with menus to add/save/export layouts and grid helpers for snapping.
  - Container: [components/widget-container.component.ts](src/app/widget-orchestrator/components/widget-container.component.ts#L1-L130) provides per-widget chrome, actions (refresh/configure/remove), and error/loading boundaries before hosting the dynamic component instance.
  - Contracts: [interfaces/widget.interface.ts](src/app/widget-orchestrator/interfaces/widget.interface.ts#L1-L93) describe widget config, layout, appearance, data sources, permissions, and lifecycle hooks.
- **Sample Widgets**: See [src/app/widgets](src/app/widgets) for example implementations (graph, todo, tests info) used by the demo dashboard.

## Notes

- Default dev server runs on port 4201; `publicHost` is set accordingly in [angular.json](angular.json#L40-L52).
- The orchestrator relies on Angular CDK drag-drop and Material components; these are shared/singleton via federation to avoid version drift across hosts/remotes.
