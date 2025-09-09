import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import {
  MatSnackBar,
  MatSnackBarModule,
} from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ExampleMongodbDocDto } from '@tmdjr/seed-service-nestjs-contracts';
import { catchError, of, switchMap, tap } from 'rxjs';
import { ExampleCrudApiService } from '../services/example-crud-api.service';
import { ExampleMongodbDocCreateFormModalComponent } from './example-mongodb-doc-create-form-modal.component';
import { ExampleMongodbDocComponent } from './example-mongodb-doc.component';

@Component({
  selector: 'ngx-example-mongodb-doc-list',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    ExampleMongodbDocComponent,
    MatProgressBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
  ],
  template: `
    <div class="header">
      <h1>Example MongoDB Docs</h1>
    </div>

    @if (loading()) {
    <mat-progress-bar mode="indeterminate"></mat-progress-bar>
    }

    <div class="list">
      <div class="controls">
        <mat-form-field appearance="outline" class="search">
          <mat-label>Search</mat-label>
          <input
            matInput
            placeholder="Filter by name or description"
            [value]="query()"
            (input)="query.set($any($event.target).value)"
          />
          @if(query()) {
          <button
            mat-icon-button
            matSuffix
            (click)="query.set('')"
            aria-label="Clear search"
          >
            <mat-icon>close</mat-icon>
          </button>
          }
        </mat-form-field>
        <button
          mat-flat-button
          class="add-btn"
          (click)="openCreate()"
        >
          <mat-icon>add</mat-icon> New
        </button>
      </div>
      <div class="grid">
        @for (d of filtered(); track d._id) {
        <ngx-example-mongodb-doc
          [doc]="d"
          (edit)="openEdit($event)"
          (remove)="confirmDelete($event)"
        ></ngx-example-mongodb-doc>
        }
      </div>
    </div>

    @if (!loading() && filtered().length === 0) {
    <div class="empty">
      <mat-icon>inbox</mat-icon>
      <p>No matching documents</p>
      <button mat-flat-button color="primary" (click)="openCreate()">
        <mat-icon>add</mat-icon> New
      </button>
    </div>
    }

    <button
      matFab
      (click)="openCreate()"
      class="add-fab"
      matTooltip="Refresh list"
      aria-label="Refresh"
    >
      <mat-icon>add</mat-icon>
    </button>
    <button
      matFab
      (click)="reload()"
      matTooltip="Refresh list"
      aria-label="Refresh"
    >
      <mat-icon>refresh</mat-icon>
    </button>
  `,
  styles: [
    `
      .header {
        display: flex;
        color: var(--mat-sys-on-secondary);
        background-color: var(--mat-sys-secondary);
        padding: 0 1.125rem;
      }
      .search {
        width: min(500px, 90vw);
      }
      .list {
        display: block;
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem;
        margin-bottom: 6rem;
      }
      @media (max-width: 768px) {
        .list {
          padding: 0.5rem;
        }
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 16px;
        margin-top: 1rem;
      }
      .empty {
        opacity: 0.7;
        text-align: center;
        margin-top: 3rem;
        display: grid;
        gap: 12px;
        justify-items: center;
      }
      .empty mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
      }
      .controls {
        display: flex;
        gap: 1.125rem;
        justify-content: space-between;
        align-items: baseline;
      }
      button[matFab] {
        position: fixed;
        bottom: 48px;
        right: 20px;
        z-index: 1000;
        &.add-fab {
          bottom: 124px;
          display: none;
        }
      }
      @media (max-width: 628px) {
        .controls {
          justify-content: center;
        }
        .add-btn {
          display: none;
        }
        button[matFab].add-fab {
          display: block;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExampleMongodbDocListComponent {
  private readonly api = inject(ExampleCrudApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  // signal-based local store for simplicity
  protected readonly docs = signal<ExampleMongodbDocDto[]>([]);
  protected readonly loading = signal(false);
  protected readonly query = signal('');
  protected readonly filtered = computed(() => {
    const q = this.query().toLowerCase().trim();
    if (!q) return this.docs();
    return this.docs().filter((d) => {
      const name = (d.name || '').toLowerCase();
      const desc = ((d as any).description || '').toLowerCase();
      return (
        name.includes(q) ||
        desc.includes(q) ||
        String(d._id).includes(q)
      );
    });
  });

  constructor() {
    this.reload();
  }

  trackById = (_: number, d: ExampleMongodbDocDto) =>
    (d as any)._id ?? d._id;

  reload() {
    this.loading.set(true);
    this.api
      .list$()
      .pipe(
        tap(() => {}),
        catchError((err) => {
          this.snack.open('Failed to load docs', 'Dismiss', {
            duration: 3000,
          });
          return of<ExampleMongodbDocDto[]>([]);
        })
      )
      .subscribe((rows) => {
        this.docs.set(rows);
        this.loading.set(false);
      });
  }

  openCreate() {
    this.dialog
      .open(ExampleMongodbDocCreateFormModalComponent, {
        data: { mode: 'create' },
      })
      .afterClosed()
      .pipe(
        switchMap((created: ExampleMongodbDocDto | undefined) => {
          if (created)
            this.snack.open('Created!', 'OK', { duration: 2000 });
          return created ? this.api.list$() : of(this.docs());
        })
      )
      .subscribe((rows) => this.docs.set(rows));
  }

  openEdit(doc: ExampleMongodbDocDto) {
    this.dialog
      .open(ExampleMongodbDocCreateFormModalComponent, {
        data: { mode: 'edit', doc },
      })
      .afterClosed()
      .pipe(
        switchMap((updated: ExampleMongodbDocDto | undefined) => {
          if (updated)
            this.snack.open('Saved!', 'OK', { duration: 2000 });
          return updated ? this.api.list$() : of(this.docs());
        })
      )
      .subscribe((rows) => this.docs.set(rows));
  }

  confirmDelete(doc: ExampleMongodbDocDto) {
    // keep it simple; swap for a real confirm dialog if you want
    const ok = confirm(`Delete "${doc.name}"?`);
    if (!ok) return;

    this.api
      .delete$((doc as any)._id ?? (doc as any).id)
      .pipe(
        tap(() =>
          this.snack.open('Deleted', 'OK', { duration: 2000 })
        ),
        switchMap(() => this.api.list$()),
        catchError((err) => {
          this.snack.open('Delete failed', 'Dismiss', {
            duration: 3000,
          });
          return of(this.docs());
        })
      )
      .subscribe((rows) => this.docs.set(rows));
  }
}
