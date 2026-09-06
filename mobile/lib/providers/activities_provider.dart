import 'package:flutter/material.dart';
import '../models/activity_model.dart';
import '../core/api/api_client.dart';
import '../core/services/alarm_service.dart';

class ActivitiesProvider extends ChangeNotifier {
  final ApiClient _apiClient = ApiClient();
  final AlarmService _alarmService = AlarmService();

  List<ActivityModel> _activities = [];
  bool _isLoading = false;
  String? _errorMessage;

  List<ActivityModel> get activities => _activities;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  // Filtros
  List<ActivityModel> get pendingActivities =>
      _activities.where((a) => !a.isCompleted).toList();

  List<ActivityModel> get completedActivities =>
      _activities.where((a) => a.isCompleted).toList();

  List<ActivityModel> get medications => _activities
      .where((a) => a.category == ActivityCategory.medicamento)
      .toList();

  List<ActivityModel> get todayActivities {
    final now = DateTime.now();
    return _activities.where((a) {
      return a.scheduledAt.year == now.year &&
          a.scheduledAt.month == now.month &&
          a.scheduledAt.day == now.day;
    }).toList();
  }

  /// Cargar actividades desde el servidor y reprogramar alarmas locales
  Future<void> fetchActivities() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final data = await _apiClient.getActivities();
      _activities = data.map((json) => ActivityModel.fromJson(json)).toList();

      // Programar alarmas para las actividades pendientes futuras
      final now = DateTime.now();
      for (final act in _activities) {
        if (!act.isCompleted && act.scheduledAt.isAfter(now)) {
          await _alarmService.scheduleActivityAlarm(act);
        }
      }
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Crear una nueva actividad o toma de medicamento
  Future<void> addActivity({
    required String title,
    String description = '',
    required ActivityCategory category,
    required DateTime scheduledAt,
    String recurrenceType = 'none',
    int? intervalHours,
    bool isCritical = true,
    bool requiresLock = true,
  }) async {
    _isLoading = true;
    notifyListeners();

    try {
      final payload = {
        'title': title,
        'description': description,
        'category': category.name,
        'scheduledAt': scheduledAt.toIso8601String(),
        'recurrenceType': recurrenceType,
        'intervalHours': intervalHours,
        'isCritical': isCritical,
        'requiresLock': requiresLock,
        'sound': 'alarm_default',
      };

      final newId = await _apiClient.createActivity(payload);

      final newActivity = ActivityModel(
        id: newId,
        title: title,
        description: description,
        category: category,
        scheduledAt: scheduledAt,
        recurrenceType: recurrenceType,
        intervalHours: intervalHours,
        isCritical: isCritical,
        requiresLock: requiresLock,
      );

      _activities.insert(0, newActivity);

      // Programar alarma
      await _alarmService.scheduleActivityAlarm(newActivity);
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Marcar como completada (detiene alarma y reprograma si es medicamento periódico)
  Future<void> markCompleted(String id) async {
    try {
      await _alarmService.cancelActivityAlarm(id);
      await _alarmService.stopAlarmSound();

      await _apiClient.updateActivity({
        'id': id,
        'isCompleted': true,
      });

      // Recargar para obtener la siguiente dosis generada por el backend si aplica
      await fetchActivities();
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      notifyListeners();
    }
  }

  /// Posponer alarma (snooze) por X minutos
  Future<void> snoozeActivity(String id, {int minutes = 10}) async {
    try {
      await _alarmService.stopAlarmSound();

      final snoozedTime = DateTime.now().add(Duration(minutes: minutes));

      await _apiClient.updateActivity({
        'id': id,
        'scheduledAt': snoozedTime.toIso8601String(),
        'snoozedUntil': snoozedTime.toIso8601String(),
      });

      final index = _activities.indexWhere((a) => a.id == id);
      if (index != -1) {
        _activities[index] = _activities[index].copyWith(
          scheduledAt: snoozedTime,
          snoozedUntil: snoozedTime,
        );
        await _alarmService.scheduleActivityAlarm(_activities[index]);
      }
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      notifyListeners();
    }
  }

  /// Eliminar actividad
  Future<void> deleteActivity(String id) async {
    try {
      await _alarmService.cancelActivityAlarm(id);
      await _apiClient.deleteActivity(id);
      _activities.removeWhere((a) => a.id == id);
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      notifyListeners();
    }
  }
}
