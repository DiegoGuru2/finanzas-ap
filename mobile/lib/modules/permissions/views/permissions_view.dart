import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../../core/services/permissions_service.dart';
import '../../../core/services/biometric_service.dart';
import '../../../core/theme/app_theme.dart';

class PermissionsView extends StatefulWidget {
  const PermissionsView({super.key});

  @override
  State<PermissionsView> createState() => _PermissionsViewState();
}

class _PermissionsViewState extends State<PermissionsView> {
  final PermissionsService _permService = PermissionsService();
  final BiometricService _bioService = BiometricService();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  PermissionStatusModel? _status;
  bool _isBiometricAvailable = false;
  bool _isBiometricEnabled = false;
  String _alarmDisplayMode = 'notification'; // 'notification' or 'fullscreen'
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  Future<void> _refresh() async {
    setState(() => _isLoading = true);
    final status = await _permService.checkAllStatuses();
    final bioAvailable = await _bioService.isBiometricAvailable();
    final bioEnabled = await _bioService.isBiometricEnabled();
    final savedMode = await _storage.read(key: 'alarm_display_mode') ?? 'notification';

    setState(() {
      _status = status;
      _isBiometricAvailable = bioAvailable;
      _isBiometricEnabled = bioEnabled;
      _alarmDisplayMode = savedMode;
      _isLoading = false;
    });
  }

  Future<void> _toggleBiometrics(bool value) async {
    if (value) {
      final success = await _bioService.setBiometricEnabled(true);
      if (success) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              backgroundColor: AppTheme.success,
              content: Text('✅ Huella dactilar activada para inicio de sesión'),
            ),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              backgroundColor: AppTheme.danger,
              content: Text('No se pudo verificar la huella dactilar'),
            ),
          );
        }
      }
    } else {
      await _bioService.setBiometricEnabled(false);
    }
    await _refresh();
  }

  Future<void> _setAlarmMode(String mode) async {
    await _storage.write(key: 'alarm_display_mode', value: mode);
    setState(() => _alarmDisplayMode = mode);
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator(color: AppTheme.primary)),
      );
    }

    final s = _status!;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Permisos & Seguridad', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
      ),
      body: RefreshIndicator(
        color: AppTheme.primary,
        onRefresh: _refresh,
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
          children: [
            // ─── Cabecera Informativa ───
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppTheme.border),
              ),
              child: Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: AppTheme.primary.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(Icons.security_rounded, color: AppTheme.primaryLight, size: 24),
                  ),
                  const SizedBox(width: 14),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Privacidad & Seguridad Garantizada',
                            style: TextStyle(fontWeight: FontWeight.w800, color: Colors.white, fontSize: 14)),
                        SizedBox(height: 4),
                        Text(
                          'La app respeta la seguridad nativa de tu celular (PIN, Patrón o Huella) y no se salta ninguna protección del sistema.',
                          style: TextStyle(color: AppTheme.textMuted, fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // ─── Sección: Huella Dactilar / Biometría ───
            _buildSectionTitle(Icons.fingerprint_rounded, 'Seguridad y Acceso con Huella'),
            const SizedBox(height: 10),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 38,
                          height: 38,
                          decoration: BoxDecoration(
                            color: AppTheme.secondary.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(Icons.fingerprint_rounded, color: AppTheme.secondary, size: 22),
                        ),
                        const SizedBox(width: 12),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Desbloquear con Huella Dactilar',
                                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: Colors.white)),
                              SizedBox(height: 2),
                              Text('Entra a la aplicación de forma rápida y protegida',
                                  style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                            ],
                          ),
                        ),
                        if (_isBiometricAvailable)
                          Switch(
                            value: _isBiometricEnabled,
                            activeColor: AppTheme.secondary,
                            onChanged: (val) => _toggleBiometrics(val),
                          )
                        else
                          const Text('No disponible', style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                      ],
                    ),
                    if (_isBiometricEnabled)
                      Padding(
                        padding: const EdgeInsets.only(top: 12),
                        child: OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: AppTheme.secondary,
                            side: const BorderSide(color: AppTheme.secondary),
                          ),
                          onPressed: () async {
                            final ok = await _bioService.authenticate(reason: 'Prueba de reconocimiento de huella');
                            if (!mounted) return;
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                backgroundColor: ok ? AppTheme.success : AppTheme.danger,
                                content: Text(ok ? '✅ ¡Huella verificada correctamente!' : '❌ Verificación fallida'),
                              ),
                            );
                          },
                          icon: const Icon(Icons.fingerprint_rounded, size: 18),
                          label: const Text('Probar sensor de huella', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // ─── Sección: Modo de Alarma en Pantalla de Bloqueo ───
            _buildSectionTitle(Icons.lock_clock_rounded, 'Modo de Notificación de Alarma'),
            const SizedBox(height: 10),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    RadioListTile<String>(
                      contentPadding: EdgeInsets.zero,
                      value: 'notification',
                      groupValue: _alarmDisplayMode,
                      title: const Text(
                        'Notificación en Bloqueo (Recomendado y Seguro)',
                        style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                      ),
                      subtitle: const Text(
                        'Sale como notificación con sonido en tu pantalla de bloqueo. Respeta el PIN/Huella de tu celular sin forzar la pantalla.',
                        style: TextStyle(fontSize: 11, color: AppTheme.textMuted),
                      ),
                      activeColor: AppTheme.primary,
                      onChanged: (v) => _setAlarmMode(v!),
                    ),
                    const Divider(color: Colors.white10),
                    RadioListTile<String>(
                      contentPadding: EdgeInsets.zero,
                      value: 'fullscreen',
                      groupValue: _alarmDisplayMode,
                      title: const Text(
                        'Pantalla Completa Interactiva',
                        style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
                      ),
                      subtitle: const Text(
                        'Abre una ventana con botones grandes para confirmar o posponer cuando suena la alarma.',
                        style: TextStyle(fontSize: 11, color: AppTheme.textMuted),
                      ),
                      activeColor: AppTheme.primary,
                      onChanged: (v) => _setAlarmMode(v!),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // ─── Sección: Permisos del Sistema ───
            _buildSectionTitle(Icons.check_circle_outline_rounded, 'Permisos del Sistema'),
            const SizedBox(height: 10),

            // Permiso 1: Notificaciones
            _buildPermissionItem(
              icon: Icons.notifications_active_rounded,
              title: 'Notificaciones en Bloqueo & Barra',
              desc: 'Permite avisarte sobre medicamentos, citas y recordatorios de deudas.',
              isGranted: s.notificationsGranted,
              onRequest: () async {
                await _permService.requestNotificationPermission();
                await _refresh();
              },
            ),
            const SizedBox(height: 10),

            // Permiso 2: Alarmas Exactas
            _buildPermissionItem(
              icon: Icons.alarm_on_rounded,
              title: 'Alarmas Exactas',
              desc: 'Garantiza que los recordatorios suenen justo al minuto programado.',
              isGranted: s.exactAlarmGranted,
              onRequest: () async {
                await _permService.requestExactAlarmPermission();
                await _refresh();
              },
            ),

            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(IconData icon, String title) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AppTheme.primaryLight),
        const SizedBox(width: 8),
        Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Colors.white)),
      ],
    );
  }

  Widget _buildPermissionItem({
    required IconData icon,
    required String title,
    required String desc,
    required bool isGranted,
    required VoidCallback onRequest,
  }) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: (isGranted ? AppTheme.success : AppTheme.warning).withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: isGranted ? AppTheme.success : AppTheme.warning, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: Colors.white)),
                  const SizedBox(height: 2),
                  Text(desc, style: const TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                ],
              ),
            ),
            const SizedBox(width: 8),
            if (isGranted)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: AppTheme.success.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.check_rounded, color: AppTheme.success, size: 14),
                    SizedBox(width: 4),
                    Text('Activo', style: TextStyle(color: AppTheme.success, fontSize: 11, fontWeight: FontWeight.w700)),
                  ],
                ),
              )
            else
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primary,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                onPressed: onRequest,
                child: const Text('Activar', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.white)),
              ),
          ],
        ),
      ),
    );
  }
}
