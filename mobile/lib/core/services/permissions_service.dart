import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class PermissionStatusModel {
  final bool notificationsGranted;
  final bool exactAlarmGranted;

  PermissionStatusModel({
    required this.notificationsGranted,
    required this.exactAlarmGranted,
  });

  bool get allCoreGranted => notificationsGranted && exactAlarmGranted;
}

class PermissionsService {
  static final PermissionsService _instance = PermissionsService._internal();
  factory PermissionsService() => _instance;
  PermissionsService._internal();

  final FlutterLocalNotificationsPlugin _notificationsPlugin = FlutterLocalNotificationsPlugin();

  /// Comprueba el estado actual de las notificaciones
  Future<PermissionStatusModel> checkAllStatuses() async {
    final androidImpl = _notificationsPlugin
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();

    final notifEnabled = await androidImpl?.areNotificationsEnabled() ?? true;

    return PermissionStatusModel(
      notificationsGranted: notifEnabled,
      exactAlarmGranted: true,
    );
  }

  /// Solicitar permiso de Notificaciones (Pantalla de bloqueo y barra de estado)
  Future<bool> requestNotificationPermission() async {
    final androidImpl = _notificationsPlugin
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    final granted = await androidImpl?.requestNotificationsPermission();
    return granted ?? false;
  }

  /// Solicitar permiso de Alarmas Exactas
  Future<bool> requestExactAlarmPermission() async {
    final androidImpl = _notificationsPlugin
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    final granted = await androidImpl?.requestExactAlarmsPermission();
    return granted ?? false;
  }
}
