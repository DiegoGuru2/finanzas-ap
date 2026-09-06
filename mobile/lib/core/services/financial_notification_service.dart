import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/timezone.dart' as tz;
import '../api/api_client.dart';

/// Servicio que programa notificaciones de pagos financieros en la pantalla de bloqueo.
///
/// Consulta /api/schedule para obtener los próximos cortes (quincena día 15, fin de mes día 30)
/// y programa alertas:
///  - 1 día antes del corte a las 21:00: "Mañana tienes X pagos pendientes por $Y"
///  - El día del corte a las 08:00: "¡Hoy es día de pago! Tienes X pagos pendientes"
class FinancialNotificationService {
  static final FinancialNotificationService _instance = FinancialNotificationService._internal();
  factory FinancialNotificationService() => _instance;
  FinancialNotificationService._internal();

  final FlutterLocalNotificationsPlugin _notificationsPlugin = FlutterLocalNotificationsPlugin();
  final ApiClient _apiClient = ApiClient();

  // IDs de notificación reservados para finanzas (rango 200000-299999)
  static const int _financialBaseId = 200000;

  /// Programa notificaciones financieras basándose en los datos del schedule API.
  /// Debe llamarse tras fetchAll() para tener los datos frescos del backend.
  Future<void> scheduleFinancialNotifications() async {
    try {
      final scheduleData = await _apiClient.getSchedule(months: 3);
      final schedule = scheduleData['schedule'] as Map<String, dynamic>?;
      if (schedule == null) {
        debugPrint('[FinancialNotif] No hay datos de schedule');
        return;
      }

      final periods = (schedule['periods'] as List<dynamic>?) ?? [];
      final rows = (schedule['rows'] as List<dynamic>?) ?? [];
      final paid = (scheduleData['paid'] as Map<String, dynamic>?) ?? {};
      final paidExpenses = (scheduleData['paidExpenses'] as Map<String, dynamic>?) ?? {};

      // Cancelar notificaciones financieras anteriores
      await _cancelAllFinancialNotifications();

      final now = DateTime.now();
      int notifIndex = 0;

      for (final period in periods) {
        final periodMap = Map<String, dynamic>.from(period as Map);
        final dateStr = periodMap['date'] as String?;
        final periodKey = periodMap['key'] as String?;
        if (dateStr == null || periodKey == null) continue;

        final periodDate = DateTime.tryParse('${dateStr}T00:00:00');
        if (periodDate == null) continue;

        // Contar pagos pendientes en este corte
        int pendingDebts = 0;
        double totalToPay = 0;
        final debtRows = rows.where((r) {
          final row = Map<String, dynamic>.from(r as Map);
          return row['kind'] == 'debt';
        });
        
        for (final row in debtRows) {
          final rowMap = Map<String, dynamic>.from(row as Map);
          final cells = (rowMap['cells'] as Map<String, dynamic>?) ?? {};
          final amount = (cells[periodKey] as num?)?.toDouble() ?? 0;
          final rowId = rowMap['id'] as String? ?? '';
          final rowPaid = paid[rowId] as Map<String, dynamic>?;
          final isPaid = rowPaid != null && rowPaid[periodKey] != null;
          
          if (amount > 0 && !isPaid) {
            pendingDebts++;
            totalToPay += amount;
          }
        }

        // Contar gastos pendientes
        int pendingExpenses = 0;
        double totalExpenses = 0;
        final expenseRows = rows.where((r) {
          final row = Map<String, dynamic>.from(r as Map);
          return row['kind'] == 'expense';
        });

        for (final row in expenseRows) {
          final rowMap = Map<String, dynamic>.from(row as Map);
          final cells = (rowMap['cells'] as Map<String, dynamic>?) ?? {};
          final amount = (cells[periodKey] as num?)?.toDouble() ?? 0;
          final rowId = rowMap['id'] as String? ?? '';
          final rowPaidExp = paidExpenses[rowId] as Map<String, dynamic>?;
          final isPaid = rowPaidExp != null && rowPaidExp[periodKey] != null;

          if (amount > 0 && !isPaid) {
            pendingExpenses++;
            totalExpenses += amount;
          }
        }

        final totalPending = pendingDebts + pendingExpenses;
        final grandTotal = totalToPay + totalExpenses;

        if (totalPending == 0) continue; // Nada que notificar en este corte

        final day = periodMap['day'] as int? ?? 0;
        final month = (periodMap['month'] as int? ?? 0);
        final monthNames = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        final monthName = month >= 1 && month <= 12 ? monthNames[month] : '';

        final totalStr = '\$${grandTotal.toStringAsFixed(2)}';

        // ─── Notificación 1: Día ANTERIOR al corte a las 21:00 ───
        final dayBefore = periodDate.subtract(const Duration(days: 1));
        final dayBeforeAt21 = DateTime(dayBefore.year, dayBefore.month, dayBefore.day, 21, 0);
        if (dayBeforeAt21.isAfter(now)) {
          final tzTime = tz.TZDateTime.from(dayBeforeAt21, tz.local);
          await _scheduleFinancialNotification(
            id: _financialBaseId + notifIndex++,
            title: '📅 Mañana es día de pago ($day de $monthName)',
            body: 'Tienes $totalPending pagos pendientes por $totalStr. Revisa tu cronograma.',
            scheduledDate: tzTime,
          );
          debugPrint('[FinancialNotif] Programada: víspera $periodKey a $dayBeforeAt21');
        }

        // ─── Notificación 2: DÍA del corte a las 08:00 ───
        final dayOfCutAt8 = DateTime(periodDate.year, periodDate.month, periodDate.day, 8, 0);
        if (dayOfCutAt8.isAfter(now)) {
          final tzTime = tz.TZDateTime.from(dayOfCutAt8, tz.local);
          await _scheduleFinancialNotification(
            id: _financialBaseId + notifIndex++,
            title: '🚨 ¡Hoy es día de pago! ($day de $monthName)',
            body: pendingDebts > 0
                ? 'Tienes $pendingDebts deuda${pendingDebts > 1 ? 's' : ''} pendiente${pendingDebts > 1 ? 's' : ''} por \$${totalToPay.toStringAsFixed(2)}${pendingExpenses > 0 ? ' + $pendingExpenses gasto${pendingExpenses > 1 ? 's' : ''}' : ''}. ¡No te atrases!'
                : 'Tienes $pendingExpenses gasto${pendingExpenses > 1 ? 's' : ''} por pagar por \$${totalExpenses.toStringAsFixed(2)}.',
            scheduledDate: tzTime,
          );
          debugPrint('[FinancialNotif] Programada: día del corte $periodKey a $dayOfCutAt8');
        }
      }

      debugPrint('[FinancialNotif] ✅ $notifIndex notificaciones financieras programadas');
    } catch (e) {
      debugPrint('[FinancialNotif] Error al programar notificaciones: $e');
    }
  }

  /// Programar una notificación financiera individual
  Future<void> _scheduleFinancialNotification({
    required int id,
    required String title,
    required String body,
    required tz.TZDateTime scheduledDate,
  }) async {
    const androidDetails = AndroidNotificationDetails(
      'financial_reminders',
      'Recordatorios Financieros',
      channelDescription: 'Alertas de pagos de deudas, gastos y cortes quincenales',
      importance: Importance.high,
      priority: Priority.high,
      category: AndroidNotificationCategory.reminder,
      visibility: NotificationVisibility.public,
      autoCancel: true,
      actions: [
        AndroidNotificationAction('view_financial', 'Ver detalles', showsUserInterface: true),
      ],
    );

    try {
      await _notificationsPlugin.zonedSchedule(
        id,
        title,
        body,
        scheduledDate,
        const NotificationDetails(android: androidDetails),
        androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
        uiLocalNotificationDateInterpretation: UILocalNotificationDateInterpretation.absoluteTime,
        payload: 'financial_alert',
      );
    } catch (e) {
      debugPrint('[FinancialNotif] Error zonedSchedule id=$id: $e');
    }
  }

  /// Cancelar todas las notificaciones financieras previas
  Future<void> _cancelAllFinancialNotifications() async {
    // Cancelar un rango razonable de IDs financieros (máximo 100 periodos * 2 notifs)
    for (int i = 0; i < 200; i++) {
      await _notificationsPlugin.cancel(_financialBaseId + i);
    }
  }
}
