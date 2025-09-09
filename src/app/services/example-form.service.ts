import { Injectable } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { CreateExampleMongodbDocDto } from '@tmdjr/seed-service-nestjs-contracts';

export type CreateForm = FormGroup<{
  name: FormControl<string>;
  type: FormControl<'SOME_ENUM' | 'SOME_OTHER_ENUM'>;
  description: FormControl<string>;
  archived: FormControl<boolean>;
  // Using nested FormGroup for ExampleMongodbDocObjectDto
  exampleMongodbDocObject: FormGroup<{
    street: FormControl<string>;
    city: FormControl<string>;
    state: FormControl<string>;
    zip: FormControl<string>;
  }>;
}>;

@Injectable({ providedIn: 'root' })
export class ExampleFormService {
  constructor(private fb: FormBuilder) {}

  createCreateForm(
    initial?: Partial<CreateExampleMongodbDocDto>
  ): CreateForm {
    return this.fb.group({
      name: this.fb.control(initial?.name ?? '', {
        validators: [Validators.required, Validators.maxLength(120)],
        nonNullable: true,
      }),
      type: this.fb.control((initial?.type as any) ?? 'SOME_ENUM', {
        validators: [Validators.required],
        nonNullable: true,
      }),
      description: this.fb.control(initial?.description ?? '', {
        validators: [Validators.maxLength(1000)],
        nonNullable: true,
      }),
      archived: this.fb.control(Boolean(initial?.archived ?? false), {
        nonNullable: true,
      }),
      exampleMongodbDocObject: this.fb.group({
        street: this.fb.control(
          initial?.exampleMongodbDocObject?.street ?? '',
          {
            nonNullable: true,
          }
        ),
        city: this.fb.control(
          initial?.exampleMongodbDocObject?.city ?? '',
          {
            nonNullable: true,
          }
        ),
        state: this.fb.control(
          initial?.exampleMongodbDocObject?.state ?? '',
          {
            nonNullable: true,
          }
        ),
        zip: this.fb.control(
          initial?.exampleMongodbDocObject?.zip ?? '',
          {
            nonNullable: true,
          }
        ),
      }),
    });
  }

  toCreateDto(form: CreateForm): CreateExampleMongodbDocDto {
    const v = form.getRawValue();

    const dto: CreateExampleMongodbDocDto = {
      name: v.name,
      type: v.type,
    } as CreateExampleMongodbDocDto;

    if (v.description?.trim()) dto.description = v.description.trim();
    if (v.archived === true) dto.archived = true; // omit when false

    // Only include the object if at least one field has a value
    const objData = v.exampleMongodbDocObject;
    if (
      objData.street.trim() ||
      objData.city.trim() ||
      objData.state.trim() ||
      objData.zip.trim()
    ) {
      dto.exampleMongodbDocObject = {
        street: objData.street.trim(),
        city: objData.city.trim(),
        state: objData.state.trim(),
        zip: objData.zip.trim(),
      };
    }

    return dto;
  }
}
