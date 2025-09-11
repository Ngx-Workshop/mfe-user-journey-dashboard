import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { RouterLink } from '@angular/router';
import { SubjectLevel } from '../assessment-test.service';
import { BaseWidget } from '../widget-orchestrator/base/base-widget.directive';
import { WidgetConfig } from '../widget-orchestrator/interfaces';

interface TodoItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate?: Date;
}

@Component({
  selector: 'ngx-todo-widget',
  imports: [CommonModule, MatExpansionModule, RouterLink],
  template: `
    <div class="todo-widget">
      <h2>{{ widgetTitle() }}</h2>
    
      <!-- Quick Actions -->
      <div class="quick-actions" [routerLink]="['/assessment-test']">
        <img src="../../../assets/img/nestjs2.svg" alt="NestJS" />
        <img
          src="../../../assets/img/angular_nav_gradient.gif"
          alt="Angular"
          />
        <img src="../../../assets/img/rxjs1.svg" alt="RxJS" />
      </div>
    
      <!-- Todo List -->
      @if (todos().length > 0) {
        <div class="todo-list">
          @for (todo of todos(); track trackTodo($index, todo)) {
            <div
              class="todo-item"
          [ngClass]="{
            completed: todo.completed,
            'high-priority': todo.priority === 'high'
          }"
              >
              <input
                type="checkbox"
                [checked]="todo.completed"
                (change)="toggleTodo(todo.id)"
                />
              <div class="todo-content">
                <h4>{{ todo.title }}</h4>
                <p>{{ todo.description }}</p>
                @if (todo.dueDate) {
                  <small
                    >Due: {{ todo.dueDate | date : 'short' }}</small
                    >
                  }
                </div>
              </div>
            }
          </div>
        }
    
        <!-- Empty State -->
        @if (todos().length === 0) {
          <div class="empty-state">
            <h3>{{ emptyMessage() }}</h3>
            <p>
              Start by taking some assessment tests to see your progress.
            </p>
          </div>
        }
      </div>
    `,
  styles: [
    `
      .todo-widget {
        padding: 16px;
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      h2 {
        font-weight: 300;
        margin: 0 0 16px 0;
        color: var(--mat-sys-on-surface);
      }

      .quick-actions {
        display: flex;
        justify-content: space-around;
        margin-bottom: 20px;
        cursor: pointer;
        padding: 12px;
        border-radius: 8px;
        transition: background-color 0.3s;
      }

      .quick-actions:hover {
        background-color: rgba(0, 0, 0, 0.04);
      }

      .quick-actions img {
        width: 48px;
        height: 48px;
        object-fit: contain;
        transition: transform 0.3s;
      }

      .quick-actions img:hover {
        transform: scale(1.1);
      }

      .todo-list {
        flex: 1;
        overflow-y: auto;
      }

      .todo-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 12px;
        margin-bottom: 8px;
        border-radius: 8px;
        border: 1px solid rgba(0, 0, 0, 0.12);
        transition: all 0.3s;
      }

      .todo-item:hover {
        background-color: rgba(0, 0, 0, 0.02);
        border-color: var(--mat-sys-primary);
      }

      .todo-item.completed {
        opacity: 0.6;
        text-decoration: line-through;
      }

      .todo-item.high-priority {
        border-left: 4px solid #f44336;
      }

      .todo-content {
        flex: 1;
      }

      .todo-content h4 {
        margin: 0 0 4px 0;
        font-weight: 500;
        font-size: 14px;
      }

      .todo-content p {
        margin: 0 0 4px 0;
        font-size: 12px;
        color: var(--mat-sys-on-surface-variant);
      }

      .todo-content small {
        font-size: 11px;
        color: var(--mat-sys-on-surface-variant);
      }

      .empty-state {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        color: var(--mat-sys-on-surface-variant);
      }

      .empty-state h3 {
        font-weight: 400;
        margin: 0 0 8px 0;
      }

      .empty-state p {
        margin: 0;
        font-size: 14px;
      }

      input[type='checkbox'] {
        margin: 4px 0 0 0;
        cursor: pointer;
      }
    `,
  ],
})
export class TodoWidgetComponent extends BaseWidget {
  // Widget-specific state
  private readonly _todos = signal<TodoItem[]>([]);

  // Computed properties
  readonly todos = computed(() => this._todos());
  readonly widgetTitle = computed(
    () => this.config?.title || 'To Do'
  );
  readonly emptyMessage = computed(() => {
    const subjectData = this.data() as {
      subjectLevels?: SubjectLevel[];
    };
    if (
      subjectData?.subjectLevels &&
      subjectData.subjectLevels.length > 0
    ) {
      return 'Great progress! Keep going!';
    }
    return 'Just keep taking tests for now...';
  });

  override onInit(): void {
    this.generateTodosFromData();
    this.setupDataSubscription();
  }

  override onDataChange(data: any): void {
    this.generateTodosFromData();
  }

  override onConfigChange(config: Partial<WidgetConfig>): void {
    // Handle configuration changes
    if (config.title) {
      // Title updated, trigger change detection
    }
  }

  override onEvent(event: any): void {
    switch (event.type) {
      case 'ASSESSMENT_COMPLETED':
        this.handleAssessmentCompleted(event.payload);
        break;
      case 'SUBJECT_LEVEL_CHANGED':
        this.handleSubjectLevelChanged(event.payload);
        break;
    }
  }

  /**
   * Toggle todo completion status
   */
  toggleTodo(todoId: string): void {
    const todos = this._todos();
    const updatedTodos = todos.map((todo) =>
      todo.id === todoId
        ? { ...todo, completed: !todo.completed }
        : todo
    );

    this._todos.set(updatedTodos);

    // Emit event for other widgets
    this.emit({
      type: 'TODO_TOGGLED',
      payload: {
        todoId,
        completed: updatedTodos.find((t) => t.id === todoId)
          ?.completed,
      },
    });
  }

  /**
   * Track function for ngFor
   */
  trackTodo(index: number, todo: TodoItem): string {
    return todo.id;
  }

  /**
   * Generate todos from assessment data
   */
  private generateTodosFromData(): void {
    const data = this.data() as {
      subjectLevels?: SubjectLevel[];
      assessmentTests?: any[];
    };
    const todos: TodoItem[] = [];

    if (data?.subjectLevels) {
      data.subjectLevels.forEach((subject) => {
        if (!subject.enabled) {
          todos.push({
            id: `unlock-${subject.subject.toLowerCase()}`,
            title: `Unlock ${subject.subject}`,
            description: `Complete prerequisites to unlock ${subject.subject} assessments`,
            completed: false,
            priority: 'medium',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
          });
        } else if (subject.levelCount < subject.totalCount) {
          todos.push({
            id: `advance-${subject.subject.toLowerCase()}`,
            title: `Advance in ${subject.subject}`,
            description: `Current level: ${subject.levelCount}/${subject.totalCount}. Take more tests to advance!`,
            completed: false,
            priority: subject.levelCount === 0 ? 'high' : 'medium',
          });
        }
      });
    }

    // Add generic todos if no specific ones generated
    if (todos.length === 0) {
      todos.push({
        id: 'start-assessment',
        title: 'Start Your First Assessment',
        description:
          'Begin your learning journey by taking an assessment test',
        completed: false,
        priority: 'high',
      });
    }

    this._todos.set(todos);
  }

  /**
   * Setup data subscription for real-time updates
   */
  private setupDataSubscription(): void {
    // Subscribe to shared state changes
    this.subscribeToSharedState<any>('assessmentData', (data) => {
      if (data) {
        this.generateTodosFromData();
      }
    });
  }

  /**
   * Handle assessment completion event
   */
  private handleAssessmentCompleted(payload: any): void {
    const { subject, passed } = payload;

    if (passed) {
      // Mark related todos as completed
      const todos = this._todos();
      const updatedTodos = todos.map((todo) => {
        if (todo.id.includes(subject.toLowerCase())) {
          return { ...todo, completed: true };
        }
        return todo;
      });

      this._todos.set(updatedTodos);

      // Emit celebration event
      this.emit({
        type: 'CELEBRATION',
        payload: {
          message: `Congratulations on completing ${subject}!`,
        },
      });
    }
  }

  /**
   * Handle subject level change event
   */
  private handleSubjectLevelChanged(payload: any): void {
    this.generateTodosFromData();
  }
}
