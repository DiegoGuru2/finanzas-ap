import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:android_alarm_manager_plus/android_alarm_manager_plus.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:timezone/timezone.dart' as tz;
import '../../models/activity_model.dart';

class AlarmService {
  static final AlarmService _instance = AlarmService._internal();
  factory AlarmService() => _instance;

  final FlutterLocalNotificationsPlugin _notificationsPlugin = FlutterLocalNotificationsPlugin();
  final AudioPlayer _audioPlayer = AudioPlayer();
  bool _isRinging = false;

  bool get isRinging => _isRinging;

  AlarmService._internal();

  /// Inicializar servicios de alarmas y notificaciones
  Future<void> initialize({Function(String? payload)? onAlarmClick}) async {
    // Inicializar Alarm Manager en Android
    try {
      await AndroidAlarmManager.initialize();
    } catch (e) {
      debugPrint('[AlarmService] AlarmManager init error (non-android or dev): $e');
    }

    // Inicializar Flutter Local Notifications
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const darwinSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: darwinSettings,
    );

    await _notificationsPlugin.initialize(
      initSettings,
      onDidReceiveNotificationResponse: (response) {
        if (response.payload != null && onAlarmClick != null) {
          onAlarmClick(response.payload);
        }
      },
    );

    // Crear canal de notificación de alta prioridad para actividades/medicamentos
    const androidChannel = AndroidNotificationChannel(
      'urgent_activity_alarms',
      'Alarmas de Medicamentos y Actividades',
      description: 'Canal de alta prioridad con sonido para despertar la pantalla en alarmas y medicinas',
      importance: Importance.max,
      playSound: true,
      enableVibration: true,
    );

    await _notificationsPlugin
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(androidChannel);

    // Crear canal separado para notificaciones financieras
    const financialChannel = AndroidNotificationChannel(
      'financial_reminders',
      'Recordatorios Financieros',
      description: 'Alertas de pagos de deudas, gastos y cortes quincenales',
      importance: Importance.high,
      playSound: true,
      enableVibration: true,
    );

    await _notificationsPlugin
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(financialChannel);
  }

  /// Programar una alarma de actividad o toma de medicina usando zonedSchedule
  /// para que suene a la hora exacta incluso con la app cerrada
  Future<void> scheduleActivityAlarm(ActivityModel activity) async {
    final int notificationId = activity.id.hashCode.abs() % 100000;
    final now = DateTime.now();

    // Si ya pasó la hora programada, no programar
    if (activity.scheduledAt.isBefore(now)) return;

    debugPrint('[AlarmService] Programando alarma para: ${activity.title} a las ${activity.scheduledAt}');

    // Cancelar notificación anterior con el mismo ID para evitar duplicados
    await _notificationsPlugin.cancel(notificationId);

    // Usar AndroidAlarmManager para ejecutar el disparo exacto (backup)
    try {
      await AndroidAlarmManager.oneShotAt(
        activity.scheduledAt,
        notificationId,
        alarmCallback,
        exact: true,
        wakeup: true,
        alarmClock: true,
        rescheduleOnReboot: true,
      );
    } catch (e) {
      debugPrint('[AlarmService] AndroidAlarmManager error: $e');
    }

    // Obtener preferencia del usuario (Notificación en bloqueo vs Pantalla completa)
    const storage = FlutterSecureStorage();
    final mode = await storage.read(key: 'alarm_display_mode') ?? 'notification';
    final bool isFullScreen = mode == 'fullscreen';

    final androidDetails = AndroidNotificationDetails(
      'urgent_activity_alarms',
      'Alarmas de Medicamentos y Actividades',
      channelDescription: 'Recordatorios con sonido y notificación en pantalla de bloqueo',
      importance: Importance.max,
      priority: Priority.high,
      fullScreenIntent: isFullScreen,
      category: AndroidNotificationCategory.alarm,
      audioAttributesUsage: AudioAttributesUsage.alarm,
      visibility: NotificationVisibility.public,
      actions: const [
        AndroidNotificationAction('complete_act', 'Tomada / Hecho', showsUserInterface: true),
        AndroidNotificationAction('snooze_act', 'Posponer', showsUserInterface: true),
      ],
      ongoing: isFullScreen,
      autoCancel: !isFullScreen,
    );

    // Usar zonedSchedule para que la notificación se dispare a la hora exacta
    // incluso con la app cerrada - esto es el fix del bug principal
    final scheduledTZ = tz.TZDateTime.from(activity.scheduledAt, tz.local);

    try {
      await _notificationsPlugin.zonedSchedule(
        notificationId,
        '⏰ ${activity.category.displayName.toUpperCase()}: ${activity.title}',
        activity.description.isNotEmpty
            ? activity.description
            : 'Toca para confirmar o posponer la actividad.',
        scheduledTZ,
        NotificationDetails(android: androidDetails),
        androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
        uiLocalNotificationDateInterpretation: UILocalNotificationDateInterpretation.absoluteTime,
        payload: activity.id,
      );
      debugPrint('[AlarmService] ✅ zonedSchedule programado para: $scheduledTZ');
    } catch (e) {
      debugPrint('[AlarmService] zonedSchedule error: $e, usando show() como fallback');
      // Fallback: si zonedSchedule falla (ej: hora muy cercana), mostrar de inmediato
      await _notificationsPlugin.show(
        notificationId,
        '⏰ ${activity.category.displayName.toUpperCase()}: ${activity.title}',
        activity.description.isNotEmpty
            ? activity.description
            : 'Toca para confirmar o posponer la actividad.',
        NotificationDetails(android: androidDetails),
        payload: activity.id,
      );
    }
  }

  /// Cancelar una alarma existente
  Future<void> cancelActivityAlarm(String activityId) async {
    final int notificationId = activityId.hashCode.abs() % 100000;
    await _notificationsPlugin.cancel(notificationId);
    try {
      await AndroidAlarmManager.cancel(notificationId);
    } catch (_) {}
    stopAlarmSound();
  }

  /// Cancelar todas las alarmas de actividades (para evitar duplicados al reprogramar)
  Future<void> cancelAllActivityAlarms() async {
    await _notificationsPlugin.cancelAll();
  }

  /// Iniciar sonido repetitivo de alarma fuerte
  Future<void> startAlarmSound() async {
    if (_isRinging) return;
    _isRinging = true;
    try {
      await _audioPlayer.setReleaseMode(ReleaseMode.loop);
      // Reproducir tono de alerta por defecto o beep
      await _audioPlayer.play(AssetSource('sounds/alarm.mp3'));
    } catch (e) {
      debugPrint('[AlarmService] No se pudo reproducir sonido custom: $e');
    }
  }

  /// Detener sonido de alarma
  Future<void> stopAlarmSound() async {
    _isRinging = false;
    try {
      await _audioPlayer.stop();
    } catch (_) {}
  }

  /// Callback estático ejecutado por el AlarmManager en segundo plano
  @pragma('vm:entry-point')
  static void alarmCallback(int id) {
    debugPrint('[AlarmService] 🔔 ¡DISPARO DE ALARMA ID $id EN SEGUNDO PLANO!');
  }
}
