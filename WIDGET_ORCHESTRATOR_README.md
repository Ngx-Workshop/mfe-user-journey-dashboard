# Angular Widget Orchestrator

A comprehensive Angular widget orchestration system that provides dynamic loading, communication, layout management, and configuration for modular dashboard widgets.

## 🚀 Features

### Core Capabilities

- **Dynamic Widget Loading**: Load widgets dynamically with lazy loading support
- **Widget Communication**: Event-driven communication system between widgets
- **Layout Management**: Responsive grid layout with drag & drop, persistence
- **Error Boundaries**: Robust error handling with recovery mechanisms
- **Data Binding**: Flexible data provider system with real-time updates
- **Configuration**: Widget-specific settings and appearance customization

### Advanced Features

- **Lazy Loading**: Reduce initial bundle size with on-demand widget loading
- **Event Bus**: Publish/subscribe event system for widget communication
- **Shared State**: Global state management for cross-widget data sharing
- **Layout Persistence**: Save and restore dashboard layouts
- **Export/Import**: Dashboard configuration export and import
- **Responsive Design**: Mobile-first responsive breakpoints
- **Hot Reloading**: Development-time widget hot reloading (optional)

## 📁 Architecture

```
widget-orchestrator/
├── interfaces/           # TypeScript interfaces and types
│   ├── widget.interface.ts
│   └── index.ts
├── services/            # Core orchestration services
│   ├── widget-registry.service.ts
│   ├── widget-orchestrator.service.ts
│   ├── widget-communication.service.ts
│   ├── dashboard-layout-manager.service.ts
│   ├── data-providers.service.ts
│   └── index.ts
├── components/          # UI components
│   ├── widget-container.component.ts
│   ├── widget-dashboard.component.ts
│   └── index.ts
├── base/               # Base classes and utilities
│   ├── base-widget.directive.ts
│   └── index.ts
└── index.ts            # Main exports
```

## 🛠️ Core Services

### WidgetRegistryService

Manages widget definitions, registration, and discovery.

```typescript
// Register a widget
registry.register({
  type: 'my-widget',
  name: 'My Widget',
  description: 'A sample widget',
  component: MyWidgetComponent,
  category: 'Custom',
  defaultConfig: {
    type: 'my-widget',
    title: 'My Widget',
    layout: { cols: 2, rows: 2 },
  },
  lazy: true,
  loadComponent: () =>
    import('./my-widget.component').then((m) => m.MyWidgetComponent),
});
```

### WidgetOrchestratorService

Core orchestration service for widget lifecycle management.

```typescript
// Create a widget instance
const instance = await orchestrator.createWidget('my-widget', {
  title: 'Custom Title',
  layout: { cols: 3, rows: 2 },
});

// Update widget data
orchestrator.updateWidgetData(instance.id, newData);

// Destroy widget
orchestrator.destroyWidget(instance.id);
```

### WidgetCommunicationService

Event-driven communication between widgets.

```typescript
// Broadcast event to all widgets
communication.broadcast({
  type: 'DATA_UPDATED',
  source: 'widget-1',
  payload: { data: 'new data' },
});

// Subscribe to events
communication.subscribe('DATA_UPDATED', (event) => {
  console.log('Data updated:', event.payload);
});

// Shared state
communication.setSharedState('globalData', { key: 'value' });
const data = communication.getSharedState('globalData');
```

### DashboardLayoutManagerService

Manages widget positioning, responsive layout, and persistence.

```typescript
// Add widget to layout
layoutManager.addWidget(widgetInstance);

// Update widget position
layoutManager.updateWidgetLayout(widgetId, {
  x: 2,
  y: 0,
  cols: 3,
  rows: 2,
});

// Save/load layout
layoutManager.saveLayout('my-dashboard');
layoutManager.loadLayout('my-dashboard');

// Export/import
const config = layoutManager.exportDashboard();
layoutManager.importDashboard(configJson);
```

## 🧩 Creating Widgets

### Basic Widget

```typescript
import { Component } from '@angular/core';
import { BaseWidget } from '../widget-orchestrator';

@Component({
  selector: 'app-my-widget',
  template: `
    <div class="widget-content">
      <h3>{{ config?.title }}</h3>
      <p>{{ data() | json }}</p>
    </div>
  `,
})
export class MyWidgetComponent extends BaseWidget {
  override onInit(): void {
    console.log('Widget initialized');
  }

  override onDataChange(data: any): void {
    console.log('New data received:', data);
  }

  override onEvent(event: WidgetEvent): void {
    if (event.type === 'CUSTOM_EVENT') {
      // Handle custom event
    }
  }

  // Emit events to other widgets
  handleClick(): void {
    this.emit({
      type: 'BUTTON_CLICKED',
      payload: { message: 'Button was clicked!' },
    });
  }
}
```

### Advanced Widget with Configuration

```typescript
@Component({
  selector: 'app-chart-widget',
  template: `
    <ngx-charts-line-chart
      [results]="chartData()"
      [scheme]="colorScheme"
      [legend]="showLegend()"
      (select)="onChartSelect($event)"
    >
    </ngx-charts-line-chart>
  `,
})
export class ChartWidgetComponent extends BaseWidget {
  private readonly _chartData = signal([]);

  readonly chartData = computed(() => this._chartData());
  readonly showLegend = computed(
    () => this.config?.settings?.['showLegend'] !== false
  );

  override onInit(): void {
    this.setupDataSubscription();
  }

  override onConfigChange(config: Partial<WidgetConfig>): void {
    // Respond to configuration changes
    if (config.settings?.['chartType']) {
      this.updateChartType(config.settings['chartType']);
    }
  }

  onChartSelect(data: any): void {
    this.emit({
      type: 'CHART_POINT_SELECTED',
      payload: { data, chartType: 'line' },
    });
  }

  private setupDataSubscription(): void {
    this.subscribeToSharedState('chartData', (data) => {
      this._chartData.set(data);
    });
  }
}
```

## 🎛️ Dashboard Usage

### Basic Dashboard

```typescript
@Component({
  template: `
    <ngx-widget-dashboard
      dashboardId="my-dashboard"
      [autoLoad]="true"
      [autoSave]="true"
    ></ngx-widget-dashboard>
  `,
})
export class MyDashboardComponent {}
```

### Programmatic Widget Management

```typescript
export class CustomDashboardComponent implements OnInit {
  constructor(
    private orchestrator: WidgetOrchestratorService,
    private registry: WidgetRegistryService
  ) {}

  async ngOnInit() {
    // Register custom widgets
    this.registerCustomWidgets();

    // Create initial widgets
    await this.createInitialWidgets();
  }

  private registerCustomWidgets(): void {
    this.registry.register({
      type: 'custom-widget',
      name: 'Custom Widget',
      description: 'My custom widget',
      component: CustomWidgetComponent,
      category: 'Custom',
      defaultConfig: {
        type: 'custom-widget',
        title: 'Custom Widget',
        layout: { cols: 2, rows: 2 },
      },
    });
  }

  private async createInitialWidgets(): Promise<void> {
    const widget1 = await this.orchestrator.createWidget(
      'custom-widget',
      {
        title: 'Widget 1',
        layout: { cols: 2, rows: 2, x: 0, y: 0 },
      }
    );

    const widget2 = await this.orchestrator.createWidget(
      'custom-widget',
      {
        title: 'Widget 2',
        layout: { cols: 2, rows: 2, x: 2, y: 0 },
      }
    );
  }
}
```

## 📊 Data Providers

Create custom data providers for different data sources:

```typescript
@Injectable()
export class ApiDataProvider implements WidgetDataProvider {
  readonly name = 'api';

  getData(config: WidgetDataSource): Observable<any> {
    return this.http.get(config.source).pipe(
      map((response) =>
        this.transformData(response, config.transform)
      ),
      catchError((error) => {
        console.error('API data fetch failed:', error);
        return of(null);
      })
    );
  }

  supports(config: WidgetDataSource): boolean {
    return config.type === 'api';
  }

  private transformData(data: any, transformFn?: string): any {
    if (transformFn && typeof window[transformFn] === 'function') {
      return window[transformFn](data);
    }
    return data;
  }
}

// Register the provider
orchestrator.registerDataProvider(new ApiDataProvider());
```

## 🎨 Widget Configuration

Widgets can be configured with various options:

```typescript
const widgetConfig: WidgetConfig = {
  type: 'chart-widget',
  title: 'Sales Chart',
  description: 'Monthly sales data visualization',
  layout: {
    cols: 4,
    rows: 3,
    x: 0,
    y: 0,
    minCols: 2,
    maxCols: 6,
  },
  appearance: {
    theme: 'dark',
    backgroundColor: '#1e1e1e',
    textColor: '#ffffff',
    border: {
      width: 1,
      color: '#333',
      style: 'solid',
    },
  },
  dataSource: {
    type: 'api',
    source: '/api/sales-data',
    refreshInterval: 30000,
    transform: 'processSalesData',
    cache: {
      enabled: true,
      ttl: 60000,
    },
  },
  settings: {
    chartType: 'line',
    showLegend: true,
    animationDuration: 1000,
  },
  resizable: true,
  movable: true,
  removable: true,
  permissions: {
    view: true,
    edit: true,
    configure: true,
  },
};
```

## 🔧 Configuration Options

### Grid Configuration

```typescript
const gridConfig = {
  cols: 12,
  rowHeight: 100,
  margin: 10,
  outerMargin: 20,
  responsive: true,
  breakpoints: {
    xs: { cols: 1, margin: 5 },
    sm: { cols: 2, margin: 8 },
    md: { cols: 6, margin: 10 },
    lg: { cols: 12, margin: 15 },
  },
};
```

### Dashboard Configuration

```typescript
const dashboardConfig: DashboardConfig = {
  id: 'main-dashboard',
  title: 'Main Dashboard',
  grid: gridConfig,
  widgets: [], // Will be populated with widget instances
  theme: 'light',
  autoSave: {
    enabled: true,
    interval: 30000, // 30 seconds
  },
  permissions: {
    view: true,
    edit: true,
    configure: true,
  },
};
```

## 📱 Responsive Design

The orchestrator includes built-in responsive breakpoints:

- **XS (Extra Small)**: < 600px - 1 column
- **SM (Small)**: 600px - 960px - 2 columns
- **MD (Medium)**: 960px - 1280px - 6 columns
- **LG (Large)**: 1280px - 1920px - 12 columns
- **XL (Extra Large)**: > 1920px - 12 columns

Widgets automatically adapt their layout based on screen size.

## 🧪 Testing

### Unit Testing Widgets

```typescript
describe('MyWidgetComponent', () => {
  let component: MyWidgetComponent;
  let fixture: ComponentFixture<MyWidgetComponent>;
  let orchestrator: jasmine.SpyObj<WidgetOrchestratorService>;

  beforeEach(() => {
    const orchestratorSpy = jasmine.createSpyObj(
      'WidgetOrchestratorService',
      ['createWidget', 'updateWidgetData', 'destroyWidget']
    );

    TestBed.configureTestingModule({
      imports: [MyWidgetComponent],
      providers: [
        {
          provide: WidgetOrchestratorService,
          useValue: orchestratorSpy,
        },
      ],
    });

    fixture = TestBed.createComponent(MyWidgetComponent);
    component = fixture.componentInstance;
    orchestrator = TestBed.inject(
      WidgetOrchestratorService
    ) as jasmine.SpyObj<WidgetOrchestratorService>;
  });

  it('should emit events correctly', () => {
    spyOn(component, 'emit');

    component.handleClick();

    expect(component.emit).toHaveBeenCalledWith({
      type: 'BUTTON_CLICKED',
      payload: { message: 'Button was clicked!' },
    });
  });
});
```

### Integration Testing

```typescript
describe('Widget Orchestrator Integration', () => {
  let orchestrator: WidgetOrchestratorService;
  let registry: WidgetRegistryService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        WidgetOrchestratorService,
        WidgetRegistryService,
        WidgetCommunicationService,
      ],
    });

    orchestrator = TestBed.inject(WidgetOrchestratorService);
    registry = TestBed.inject(WidgetRegistryService);
  });

  it('should create and manage widgets', async () => {
    // Register test widget
    registry.register({
      type: 'test-widget',
      name: 'Test Widget',
      component: TestWidgetComponent,
      category: 'Test',
      defaultConfig: {
        type: 'test-widget',
        title: 'Test',
        layout: { cols: 1, rows: 1 },
      },
    });

    // Create widget instance
    const instance = await orchestrator.createWidget(
      'test-widget',
      {}
    );

    expect(instance).toBeDefined();
    expect(instance.definition.type).toBe('test-widget');
    expect(orchestrator.getAllWidgets()).toContain(instance);

    // Destroy widget
    const destroyed = orchestrator.destroyWidget(instance.id);
    expect(destroyed).toBe(true);
    expect(orchestrator.getAllWidgets()).not.toContain(instance);
  });
});
```

## 🚀 Performance

### Optimization Tips

1. **Lazy Loading**: Use lazy loading for large widgets to reduce initial bundle size
2. **OnPush Change Detection**: Use OnPush change detection strategy for better performance
3. **Virtual Scrolling**: For large numbers of widgets, consider virtual scrolling
4. **Caching**: Enable data caching for frequently accessed data
5. **Memory Management**: Properly dispose of subscriptions and clean up resources

### Bundle Analysis

```bash
# Analyze bundle size
ng build --stats-json
npx webpack-bundle-analyzer dist/stats.json
```

## 🔍 Debugging

Enable debug mode for detailed logging:

```typescript
// In development
import { environment } from '../environments/environment';

if (!environment.production) {
  // Enable widget orchestrator debugging
  window['WIDGET_DEBUG'] = true;
}
```

## 📈 Extending the System

### Custom Widget Types

Create new widget types by implementing the `IWidget` interface:

```typescript
export interface CustomWidget extends IWidget {
  customMethod(): void;
  customProperty: string;
}
```

### Custom Services

Extend the orchestrator with custom services:

```typescript
@Injectable()
export class CustomWidgetService {
  constructor(private orchestrator: WidgetOrchestratorService) {}

  createSpecialWidget(): Promise<WidgetInstance> {
    // Custom widget creation logic
    return this.orchestrator.createWidget('special-widget', {
      // Custom configuration
    });
  }
}
```

## 📚 API Reference

### Interfaces

- `IWidget` - Base widget interface
- `WidgetConfig` - Widget configuration
- `WidgetDefinition` - Widget definition for registry
- `WidgetInstance` - Runtime widget instance
- `WidgetEvent` - Event object for communication
- `DashboardConfig` - Dashboard configuration
- `WidgetDataSource` - Data source configuration

### Services

- `WidgetOrchestratorService` - Core orchestration
- `WidgetRegistryService` - Widget registration and discovery
- `WidgetCommunicationService` - Event system and shared state
- `DashboardLayoutManagerService` - Layout management
- `WidgetDataProvider` - Data provider interface

### Components

- `WidgetContainerComponent` - Widget wrapper with error boundaries
- `WidgetDashboardComponent` - Complete dashboard implementation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

---

## 🎯 Getting Started

1. **Install dependencies**: `npm install`
2. **Import the orchestrator**: Import services and components in your module
3. **Register widgets**: Use `WidgetRegistryService` to register your widgets
4. **Create dashboard**: Use `WidgetDashboardComponent` in your template
5. **Configure data providers**: Set up data sources for your widgets
6. **Customize**: Extend with your own widgets and functionality

For a complete example, see the demo component in `/demo/dashboard-demo.component.ts`.
