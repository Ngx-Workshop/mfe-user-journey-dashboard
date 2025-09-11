import { Type } from '@angular/core';
import { Observable } from 'rxjs';

/**
 * Base interface that all widgets must implement
 */
export interface IWidget {
  /** Widget instance ID */
  id: string;

  /** Widget configuration */
  config: WidgetConfig;

  /** Data input for the widget */
  data?: any;

  /** Widget initialization */
  onInit?(): void;

  /** Widget cleanup */
  onDestroy?(): void;

  /** Handle data updates */
  onDataChange?(data: any): void;

  /** Handle configuration changes */
  onConfigChange?(config: Partial<WidgetConfig>): void;

  /** Emit events to other widgets */
  emit?(event: WidgetEvent): void;

  /** Handle events from other widgets */
  onEvent?(event: WidgetEvent): void;
}

/**
 * Widget configuration interface
 */
export interface WidgetConfig {
  /** Unique widget type identifier */
  type: string;

  /** Display title */
  title: string;

  /** Widget description */
  description?: string;

  /** Layout configuration */
  layout: WidgetLayout;

  /** Visual settings */
  appearance?: WidgetAppearance;

  /** Data source configuration */
  dataSource?: WidgetDataSource;

  /** Widget-specific settings */
  settings?: Record<string, any>;

  /** Whether widget can be resized */
  resizable?: boolean;

  /** Whether widget can be moved */
  movable?: boolean;

  /** Whether widget can be removed */
  removable?: boolean;

  /** Widget permissions */
  permissions?: WidgetPermissions;
}

/**
 * Widget layout configuration
 */
export interface WidgetLayout {
  /** Grid column span */
  cols: number;

  /** Grid row span */
  rows: number;

  /** X position in grid */
  x?: number;

  /** Y position in grid */
  y?: number;

  /** Minimum width */
  minCols?: number;

  /** Minimum height */
  minRows?: number;

  /** Maximum width */
  maxCols?: number;

  /** Maximum height */
  maxRows?: number;
}

/**
 * Widget appearance configuration
 */
export interface WidgetAppearance {
  /** Widget theme */
  theme?: string;

  /** Custom CSS classes */
  cssClasses?: string[];

  /** Custom styles */
  styles?: Record<string, string>;

  /** Icon for widget */
  icon?: string;

  /** Background color */
  backgroundColor?: string;

  /** Text color */
  textColor?: string;

  /** Border settings */
  border?: {
    width?: number;
    color?: string;
    style?: string;
  };
}

/**
 * Widget data source configuration
 */
export interface WidgetDataSource {
  /** Data source type */
  type: 'service' | 'api' | 'static' | 'event';

  /** Service name or API endpoint */
  source: string;

  /** Data transformation method */
  transform?: string;

  /** Refresh interval in milliseconds */
  refreshInterval?: number;

  /** Parameters for data fetching */
  parameters?: Record<string, any>;

  /** Cache settings */
  cache?: {
    enabled: boolean;
    ttl?: number; // Time to live in milliseconds
  };
}

/**
 * Widget permissions
 */
export interface WidgetPermissions {
  /** Can view widget */
  view?: boolean;

  /** Can edit widget */
  edit?: boolean;

  /** Can delete widget */
  delete?: boolean;

  /** Can configure widget */
  configure?: boolean;

  /** Required roles */
  roles?: string[];
}

/**
 * Widget definition for registration
 */
export interface WidgetDefinition {
  /** Widget type identifier */
  type: string;

  /** Display name */
  name: string;

  /** Widget description */
  description: string;

  /** Component class */
  component: Type<any>;

  /** Widget category */
  category: string;

  /** Default configuration */
  defaultConfig: Partial<WidgetConfig>;

  /** Configuration schema for validation */
  configSchema?: any;

  /** Widget icon */
  icon?: string;

  /** Widget tags for discovery */
  tags?: string[];

  /** Widget version */
  version?: string;

  /** Dependencies */
  dependencies?: string[];

  /** Whether widget supports lazy loading */
  lazy?: boolean;

  /** Lazy loading factory */
  loadComponent?: () => Promise<Type<any>>;
}

/**
 * Widget instance interface
 */
export interface WidgetInstance {
  /** Unique instance ID */
  id: string;

  /** Widget definition */
  definition: WidgetDefinition;

  /** Widget configuration */
  config: WidgetConfig;

  /** Current data */
  data?: any;

  /** Widget state */
  state: WidgetState;

  /** Creation timestamp */
  createdAt: Date;

  /** Last updated timestamp */
  updatedAt: Date;

  /** Error information */
  error?: WidgetError;
}

/**
 * Widget state enumeration
 */
export enum WidgetState {
  INITIALIZING = 'initializing',
  LOADING = 'loading',
  LOADED = 'loaded',
  ERROR = 'error',
  DESTROYED = 'destroyed',
}

/**
 * Widget error interface
 */
export interface WidgetError {
  /** Error code */
  code: string;

  /** Error message */
  message: string;

  /** Detailed error information */
  details?: any;

  /** Timestamp when error occurred */
  timestamp: Date;

  /** Whether error is recoverable */
  recoverable?: boolean;
}

/**
 * Widget event interface
 */
export interface WidgetEvent {
  /** Event type */
  type: string;

  /** Source widget ID */
  source: string;

  /** Target widget ID (optional, for directed events) */
  target?: string;

  /** Event payload */
  payload?: any;

  /** Event timestamp */
  timestamp: Date;

  /** Whether event should bubble */
  bubble?: boolean;
}

/**
 * Dashboard configuration
 */
export interface DashboardConfig {
  /** Dashboard ID */
  id: string;

  /** Dashboard title */
  title: string;

  /** Grid configuration */
  grid: {
    cols: number;
    rowHeight: number;
    margin: number;
    outerMargin: number;
    responsive: boolean;
    breakpoints?: Record<string, number>;
  };

  /** Widget instances */
  widgets: WidgetInstance[];

  /** Dashboard theme */
  theme?: string;

  /** Auto-save settings */
  autoSave?: {
    enabled: boolean;
    interval: number;
  };

  /** Dashboard permissions */
  permissions?: WidgetPermissions;
}

/**
 * Widget registry configuration
 */
export interface WidgetRegistryConfig {
  /** Enable lazy loading */
  lazyLoading?: boolean;

  /** Widget discovery paths */
  discoveryPaths?: string[];

  /** Enable hot reloading in development */
  hotReload?: boolean;

  /** Cache widget definitions */
  cache?: boolean;
}

/**
 * Widget communication channels
 */
export interface WidgetCommunication {
  /** Broadcast event to all widgets */
  broadcast(event: WidgetEvent): void;

  /** Send event to specific widget */
  send(targetId: string, event: WidgetEvent): void;

  /** Subscribe to events */
  subscribe(
    eventType: string,
    handler: (event: WidgetEvent) => void
  ): () => void;

  /** Subscribe to events from specific widget */
  subscribeToWidget(
    sourceId: string,
    handler: (event: WidgetEvent) => void
  ): () => void;
}

/**
 * Widget data provider interface
 */
export interface WidgetDataProvider {
  /** Provider name */
  name: string;

  /** Get data */
  getData(config: WidgetDataSource): Observable<any>;

  /** Check if provider supports data source */
  supports(config: WidgetDataSource): boolean;
}
