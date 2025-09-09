import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  inject,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  CreateExampleMongodbDocDto,
  ExampleMongodbDocDto,
} from '@tmdjr/seed-service-nestjs-contracts';
import { finalize } from 'rxjs';
import { ExampleCrudApiService } from '../services/example-crud-api.service';
import { ExampleFormService } from '../services/example-form.service';

export type ExampleFormDialogData = {
  mode: 'create' | 'edit';
  doc?: ExampleMongodbDocDto;
};

@Component({
  selector: 'ngx-example-mongodb-doc-create-form-modal',
  standalone: true,
  imports: [
    MatDialogModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
  ],
  template: `
    <header mat-dialog-title>
      {{
        data.mode === 'create'
          ? 'Create Example Doc'
          : 'Edit Example Doc'
      }}
    </header>
    <mat-dialog-content>
      <form class="form" [formGroup]="form">
        <mat-form-field appearance="outline" class="full">
          <mat-label>Name</mat-label>
          <input matInput formControlName="name" required />
          @if(form.controls.name.hasError('required')) {

          <mat-error>Name is required</mat-error>
          } @if(form.controls.name.hasError('maxlength')) {

          <mat-error>Too long</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Type</mat-label>
          <mat-select formControlName="type" required>
            <mat-option value="SOME_ENUM">Some Enum</mat-option>
            <mat-option value="SOME_OTHER_ENUM"
              >Some Other Enum</mat-option
            >
          </mat-select>
          @if(form.controls.type.hasError('required')) {
          <mat-error>Type is required</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Description</mat-label>
          <textarea
            matInput
            formControlName="description"
            rows="4"
          ></textarea>
          <mat-hint>Optional</mat-hint>
        </mat-form-field>

        <mat-checkbox formControlName="archived"
          >Archived</mat-checkbox
        >

        <div class="address-section">
          <h4>Address Information (Optional)</h4>
          <div
            formGroupName="exampleMongodbDocObject"
            class="address-form"
          >
            <mat-form-field appearance="outline" class="full">
              <mat-label>Street</mat-label>
              <input matInput formControlName="street" />
              <mat-hint>Optional</mat-hint>
            </mat-form-field>

            <div class="row">
              <mat-form-field appearance="outline" class="city">
                <mat-label>City</mat-label>
                <input matInput formControlName="city" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="state">
                <mat-label>State</mat-label>
                <input matInput formControlName="state" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="zip">
                <mat-label>ZIP</mat-label>
                <input matInput formControlName="zip" />
              </mat-form-field>
            </div>
          </div>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <div class="actions">
        <button mat-button type="button" (click)="close()">
          Cancel
        </button>
        <button
          mat-flat-button
          color="primary"
          type="submit"
          [disabled]="form.invalid || submitting"
          (click)="onSubmit()"
        >
          {{ data.mode === 'create' ? 'Create' : 'Save' }}
        </button>
      </div>
    </mat-dialog-actions>
  `,
  styles: [
    `
      :host {
        .form {
          display: flex;
          padding: 0 1.125rem;
          gap: 0.625rem;
          flex-direction: column;
        }
        .full {
          width: 100%;
        }
        .address-section {
          border: 1px solid var(--mat-sys-secondary);
          border-radius: 4px;
          padding: 16px;
        }
        .address-section h4 {
          margin: 0 0 16px 0;
          color: #666;
          font-size: 14px;
          font-weight: 500;
        }
        .address-form {
          display: grid;
          gap: 12px;
        }
        .row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 12px;
        }
        .city {
          grid-column: 1;
        }
        .state {
          grid-column: 2;
        }
        .zip {
          grid-column: 3;
        }
        .actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }
        mat-dialog-content {
          padding: 0px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExampleMongodbDocCreateFormModalComponent {
  private readonly dialogRef = inject(
    MatDialogRef<ExampleMongodbDocCreateFormModalComponent>
  );
  private readonly formSvc = inject(ExampleFormService);
  private readonly api = inject(ExampleCrudApiService);

  submitting = false;
  form = this.formSvc.createCreateForm();

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ExampleFormDialogData
  ) {
    this.form = this.formSvc.createCreateForm(
      this.data.doc
        ? {
            name: this.data.doc.name,
            type: this.data.doc.type as any,
            description: (this.data.doc as any).description ?? '',
            archived: (this.data.doc as any).archived ?? false,
            exampleMongodbDocObject: (this.data.doc as any)
              .exampleMongodbDocObject,
          }
        : undefined
    );
  }

  close(result?: ExampleMongodbDocDto) {
    this.dialogRef.close(result);
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.submitting = true;

    console.log('Submitting', this.data.mode);
    if (this.data.mode === 'create') {
      const dto: CreateExampleMongodbDocDto =
        this.formSvc.toCreateDto(this.form);
      this.api
        .create$(dto)
        .pipe(finalize(() => (this.submitting = false)))
        .subscribe({
          next: (created) => this.close(created),
          error: (err) => this.close(undefined), // you can surface a snackbar in parent if you prefer
        });
    } else if (this.data.doc) {
      const patch = this.formSvc.toCreateDto(
        this.form
      ) as Partial<CreateExampleMongodbDocDto>;
      this.api
        .update$(this.data.doc._id as unknown as string, patch)
        .pipe(finalize(() => (this.submitting = false)))
        .subscribe({
          next: (updated) => this.close(updated),
          error: () => this.close(undefined),
        });
    }
  }
}
