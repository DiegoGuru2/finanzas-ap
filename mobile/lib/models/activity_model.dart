import 'package:flutter/material.dart';

enum ActivityCategory {
  salud,
  medicamento,
  rutina,
  trabajo,
  finanzas,
  personal;

  static ActivityCategory fromString(String? value) {
    return ActivityCategory.values.firstWhere(
      (e) => e.name == value?.toLowerCase(),
      orElse: () => ActivityCategory.salud,
    );
  }

  String get displayName {
    switch (this) {
      case ActivityCategory.medicamento:
        return 'Medicamento';
      case ActivityCategory.salud:
        return 'Salud';
      case ActivityCategory.rutina:
        return 'Rutina';
      case ActivityCategory.trabajo:
        return 'Trabajo';
      case ActivityCategory.finanzas:
        return 'Finanzas';
      case ActivityCategory.personal:
        return 'Personal';
    }
  }

  IconData get icon {
    switch (this) {
      case ActivityCategory.medicamento:
        return Icons.medication_rounded;
      case ActivityCategory.salud:
        return Icons.health_and_safety_rounded;
      case ActivityCategory.rutina:
        return Icons.fitness_center_rounded;
      case ActivityCategory.trabajo:
        return Icons.work_outline_rounded;
      case ActivityCategory.finanzas:
        return Icons.account_balance_wallet_rounded;
      case ActivityCategory.personal:
        return Icons.person_outline_rounded;
    }
  }

  Color get color {
    switch (this) {
      case ActivityCategory.medicamento:
        return const Color(0xFFEC4899); // Pink
      case ActivityCategory.salud:
        return const Color(0xFF10B981); // Emerald
      case ActivityCategory.rutina:
        return const Color(0xFFF59E0B); // Amber
      case ActivityCategory.trabajo:
        return const Color(0xFF3B82F6); // Blue
      case ActivityCategory.finanzas:
        return const Color(0xFF8B5CF6); // Purple
      case ActivityCategory.personal:
        return const Color(0xFF06B6D4); // Cyan
    }
  }
}

class ActivityModel {
  final String id;
  final String? userId;
  final String title;
  final String description;
  final ActivityCategory category;
  final DateTime scheduledAt;
  final String recurrenceType; // 'none' | 'interval_hours' | 'daily' | 'weekly' | 'monthly'
  final int? intervalHours;
  final bool isCritical;
  final bool requiresLock;
  final String sound;
  final bool isCompleted;
  final DateTime? completedAt;
  final DateTime? snoozedUntil;

  ActivityModel({
    required this.id,
    this.userId,
    required this.title,
    this.description = '',
    required this.category,
    required this.scheduledAt,
    this.recurrenceType = 'none',
    this.intervalHours,
    this.isCritical = true,
    this.requiresLock = true,
    this.sound = 'alarm_default',
    this.isCompleted = false,
    this.completedAt,
    this.snoozedUntil,
  });

  factory ActivityModel.fromJson(Map<String, dynamic> json) {
    return ActivityModel(
      id: json['id'] as String,
      userId: json['userId'] as String?,
      title: json['title'] as String? ?? 'Sin título',
      description: json['description'] as String? ?? '',
      category: ActivityCategory.fromString(json['category'] as String?),
      scheduledAt: DateTime.tryParse(json['scheduledAt']?.toString() ?? '') ?? DateTime.now(),
      recurrenceType: json['recurrenceType'] as String? ?? 'none',
      intervalHours: json['intervalHours'] is int ? json['intervalHours'] as int : null,
      isCritical: json['isCritical'] == true || json['isCritical'] == 1,
      requiresLock: json['requiresLock'] == true || json['requiresLock'] == 1,
      sound: json['sound'] as String? ?? 'alarm_default',
      isCompleted: json['isCompleted'] == true || json['isCompleted'] == 1,
      completedAt: json['completedAt'] != null ? DateTime.tryParse(json['completedAt'].toString()) : null,
      snoozedUntil: json['snoozedUntil'] != null ? DateTime.tryParse(json['snoozedUntil'].toString()) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'category': category.name,
      'scheduledAt': scheduledAt.toIso8601String(),
      'recurrenceType': recurrenceType,
      'intervalHours': intervalHours,
      'isCritical': isCritical,
      'requiresLock': requiresLock,
      'sound': sound,
      'isCompleted': isCompleted,
      'completedAt': completedAt?.toIso8601String(),
      'snoozedUntil': snoozedUntil?.toIso8601String(),
    };
  }

  ActivityModel copyWith({
    String? id,
    String? title,
    String? description,
    ActivityCategory? category,
    DateTime? scheduledAt,
    String? recurrenceType,
    int? intervalHours,
    bool? isCritical,
    bool? requiresLock,
    String? sound,
    bool? isCompleted,
    DateTime? completedAt,
    DateTime? snoozedUntil,
  }) {
    return ActivityModel(
      id: id ?? this.id,
      userId: userId,
      title: title ?? this.title,
      description: description ?? this.description,
      category: category ?? this.category,
      scheduledAt: scheduledAt ?? this.scheduledAt,
      recurrenceType: recurrenceType ?? this.recurrenceType,
      intervalHours: intervalHours ?? this.intervalHours,
      isCritical: isCritical ?? this.isCritical,
      requiresLock: requiresLock ?? this.requiresLock,
      sound: sound ?? this.sound,
      isCompleted: isCompleted ?? this.isCompleted,
      completedAt: completedAt ?? this.completedAt,
      snoozedUntil: snoozedUntil ?? this.snoozedUntil,
    );
  }
}
