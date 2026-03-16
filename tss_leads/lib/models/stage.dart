class StageForm {
  final String id;
  final String stageId;
  final String formId;
  final int order;
  final bool isRequired;
  final bool isActive;

  const StageForm({
    required this.id,
    required this.stageId,
    required this.formId,
    required this.order,
    required this.isRequired,
    required this.isActive,
  });

  factory StageForm.fromJson(Map<String, dynamic> json) {
    return StageForm(
      id: json['id'] as String? ?? '',
      stageId: json['stage_id'] as String? ?? '',
      formId: json['form_id'] as String? ?? '',
      order: json['order'] as int? ?? 0,
      isRequired: json['is_required'] as bool? ?? false,
      isActive: json['is_active'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'stage_id': stageId,
    'form_id': formId,
    'order': order,
    'is_required': isRequired,
    'is_active': isActive,
  };
}

class FormField {
  final String id;
  final String formId;
  final String label;
  final String fieldType; // text, email, number, textarea, select, checkbox, radio
  final String? placeholder;
  final String? helpText;
  final bool isRequired;
  final bool isActive;
  final int order;
  final List<String>? options; // for select, radio, checkbox

  const FormField({
    required this.id,
    required this.formId,
    required this.label,
    required this.fieldType,
    this.placeholder,
    this.helpText,
    required this.isRequired,
    required this.isActive,
    required this.order,
    this.options,
  });

  factory FormField.fromJson(Map<String, dynamic> json) {
    return FormField(
      id: json['id'] as String? ?? '',
      formId: json['form_id'] as String? ?? '',
      label: json['label'] as String? ?? '',
      fieldType: json['field_type'] as String? ?? 'text',
      placeholder: json['placeholder'] as String?,
      helpText: json['help_text'] as String?,
      isRequired: json['is_required'] as bool? ?? false,
      isActive: json['is_active'] as bool? ?? true,
      order: json['order'] as int? ?? 0,
      options: (json['options'] as List<dynamic>?)
          ?.map((o) => o as String)
          .toList(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'form_id': formId,
    'label': label,
    'field_type': fieldType,
    'placeholder': placeholder,
    'help_text': helpText,
    'is_required': isRequired,
    'is_active': isActive,
    'order': order,
    'options': options,
  };
}

class FormModel {
  final String id;
  final String? name;
  final String? description;
  final bool isActive;
  final int order;
  final List<FormField> fields;

  const FormModel({
    required this.id,
    this.name,
    this.description,
    required this.isActive,
    required this.order,
    this.fields = const [],
  });

  factory FormModel.fromJson(Map<String, dynamic> json) {
    return FormModel(
      id: json['id'] as String? ?? '',
      name: json['name'] as String?,
      description: json['description'] as String?,
      isActive: json['is_active'] as bool? ?? true,
      order: json['order'] as int? ?? 0,
      fields: ((json['fields'] as List<dynamic>?) ?? [])
          .map((f) => FormField.fromJson(f as Map<String, dynamic>))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'description': description,
    'is_active': isActive,
    'order': order,
    'fields': fields.map((f) => f.toJson()).toList(),
  };
}

class Stage {
  final String id;
  final String companyId;
  final String name;
  final String? description;
  final int order;
  final String color;
  final bool isDefault;
  final bool isFinal;
  final bool isActive;
  final String? responsibleTeamId;
  final List<String> responsibleUserIds;
  final List<StageForm>? forms;

  const Stage({
    required this.id,
    required this.companyId,
    required this.name,
    this.description,
    required this.order,
    required this.color,
    required this.isDefault,
    required this.isFinal,
    required this.isActive,
    this.responsibleTeamId,
    this.responsibleUserIds = const [],
    this.forms,
  });

  factory Stage.fromJson(Map<String, dynamic> json) {
    return Stage(
      id: json['id'] as String? ?? '',
      companyId: json['company_id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      description: json['description'] as String?,
      order: json['order'] as int? ?? 0,
      color: json['color'] as String? ?? '#000000',
      isDefault: json['is_default'] as bool? ?? false,
      isFinal: json['is_final'] as bool? ?? false,
      isActive: json['is_active'] as bool? ?? true,
      responsibleTeamId: json['responsible_team_id'] as String?,
      responsibleUserIds:
          (json['responsible_user_ids'] as List<dynamic>?)
              ?.map((id) => id as String)
              .toList() ??
          [],
      forms: ((json['forms'] as List<dynamic>?) ?? [])
          .map((f) => StageForm.fromJson(f as Map<String, dynamic>))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'company_id': companyId,
    'name': name,
    'description': description,
    'order': order,
    'color': color,
    'is_default': isDefault,
    'is_final': isFinal,
    'is_active': isActive,
    'responsible_team_id': responsibleTeamId,
    'responsible_user_ids': responsibleUserIds,
    'forms': forms?.map((f) => f.toJson()).toList(),
  };
}
