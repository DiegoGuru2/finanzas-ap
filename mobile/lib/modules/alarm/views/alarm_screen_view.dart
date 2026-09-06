import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../models/activity_model.dart';
import '../../../providers/activities_provider.dart';
import '../../../core/services/alarm_service.dart';
import '../../../core/theme/app_theme.dart';

class AlarmScreenView extends StatefulWidget {
  final ActivityModel activity;

  const AlarmScreenView({super.key, required this.activity});

  @override
  State<AlarmScreenView> createState() => _AlarmScreenViewState();
}

class _AlarmScreenViewState extends State<AlarmScreenView>
    with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  late Animation<double> _pulseAnimation;
  final AlarmService _alarmService = AlarmService();

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 0.95, end: 1.1).animate(
      CurvedAnimation(parent: _animController, curve: Curves.easeInOut),
    );

    // Iniciar sonido de alarma fuerte
    _alarmService.startAlarmSound();
  }

  @override
  void dispose() {
    _animController.dispose();
    _alarmService.stopAlarmSound();
    super.dispose();
  }

  void _onCompleted() async {
    final nav = Navigator.of(context);
    final provider = context.read<ActivitiesProvider>();
    await _alarmService.stopAlarmSound();
    await provider.markCompleted(widget.activity.id);
    if (mounted) nav.pop();
  }

  void _onSnooze() async {
    final nav = Navigator.of(context);
    final provider = context.read<ActivitiesProvider>();
    await _alarmService.stopAlarmSound();
    await provider.snoozeActivity(widget.activity.id, minutes: 10);
    if (mounted) nav.pop();
  }

  @override
  Widget build(BuildContext context) {
    final cat = widget.activity.category;

    return PopScope(
      // Si requiere bloqueo, prevenir salida con botón atrás físico hasta responder
      canPop: !widget.activity.requiresLock,
      child: Scaffold(
        backgroundColor: const Color(0xFF070A12),
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Encabezado con hora actual
                Column(
                  children: [
                    const Text(
                      'RECORDATORIO ACTIVO',
                      style: TextStyle(
                        color: AppTheme.textMuted,
                        fontSize: 12,
                        letterSpacing: 2,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      TimeOfDay.now().format(context),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 48,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -1,
                      ),
                    ),
                  ],
                ),

                // Tarjeta central animada
                ScaleTransition(
                  scale: _pulseAnimation,
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(28),
                    decoration: BoxDecoration(
                      color: AppTheme.surface,
                      borderRadius: BorderRadius.circular(28),
                      border: Border.all(
                        color: cat.color.withValues(alpha: 0.6),
                        width: 2,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: cat.color.withValues(alpha: 0.25),
                          blurRadius: 35,
                          spreadRadius: 5,
                        ),
                      ],
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Icono de la categoría
                        Container(
                          width: 80,
                          height: 80,
                          decoration: BoxDecoration(
                            color: cat.color.withValues(alpha: 0.15),
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: cat.color.withValues(alpha: 0.5),
                              width: 1.5,
                            ),
                          ),
                          child: Icon(
                            cat.icon,
                            color: cat.color,
                            size: 42,
                          ),
                        ),
                        const SizedBox(height: 20),

                        // Etiqueta de categoría
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 5),
                          decoration: BoxDecoration(
                            color: cat.color.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            cat.displayName.toUpperCase(),
                            style: TextStyle(
                              color: cat.color,
                              fontWeight: FontWeight.w800,
                              fontSize: 12,
                              letterSpacing: 1,
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),

                        // Título de la actividad
                        Text(
                          widget.activity.title,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 24,
                            fontWeight: FontWeight.w800,
                            height: 1.2,
                          ),
                        ),
                        const SizedBox(height: 12),

                        // Descripción / Dosis
                        if (widget.activity.description.isNotEmpty) ...[
                          Text(
                            widget.activity.description,
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              color: AppTheme.textSecondary,
                              fontSize: 15,
                              height: 1.4,
                            ),
                          ),
                          const SizedBox(height: 16),
                        ],

                        // Aviso de frecuencia (ej: cada 8 horas)
                        if (widget.activity.intervalHours != null)
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: AppTheme.background,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: AppTheme.border),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.repeat_rounded,
                                    size: 16, color: AppTheme.primaryLight),
                                const SizedBox(width: 6),
                                Text(
                                  'Cada ${widget.activity.intervalHours} horas',
                                  style: const TextStyle(
                                    color: AppTheme.primaryLight,
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ),
                ),

                // Botones de acción
                Column(
                  children: [
                    // Botón principal: Completado / Tomado
                    SizedBox(
                      width: double.infinity,
                      height: 58,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.success,
                          foregroundColor: Colors.white,
                          elevation: 8,
                          shadowColor: AppTheme.success.withValues(alpha: 0.5),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(18),
                          ),
                        ),
                        onPressed: _onCompleted,
                        icon: const Icon(Icons.check_circle_rounded, size: 24),
                        label: Text(
                          cat == ActivityCategory.medicamento
                              ? '¡YA LO TOMÉ!'
                              : '¡ACTIVIDAD REALIZADA!',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Botón secundario: Posponer
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppTheme.textSecondary,
                          side: const BorderSide(color: AppTheme.border, width: 1.5),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                        onPressed: _onSnooze,
                        icon: const Icon(Icons.snooze_rounded, size: 20),
                        label: const Text(
                          'Posponer 10 minutos',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
