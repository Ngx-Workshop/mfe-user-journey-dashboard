// Main exports
export * from './base';
export * from './components';
export * from './interfaces';
export * from './services';

// Re-export commonly used types and services
export {
  DashboardLayoutManagerService,
  WidgetCommunicationService,
  WidgetOrchestratorService,
  WidgetRegistryService,
} from './services';

export {
  WidgetContainerComponent,
  WidgetDashboardComponent,
} from './components';

export { BaseWidget } from './base';

export type {
  DashboardConfig,
  IWidget,
  WidgetConfig,
  WidgetDefinition,
  WidgetEvent,
  WidgetInstance,
  WidgetState,
} from './interfaces';
