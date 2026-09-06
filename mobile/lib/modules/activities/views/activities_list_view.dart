import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../../models/activity_model.dart';
import '../../../providers/activities_provider.dart';
import '../../../providers/auth_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../alarm/views/alarm_screen_view.dart';
import 'add_activity_modal.dart';

class ActivitiesListView extends StatefulWidget {
  const ActivitiesListView({super.key});

  @override
  State<ActivitiesListView> createState() => _ActivitiesListViewState();
}

class _ActivitiesListViewState extends State<ActivitiesListView>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ActivitiesProvider>().fetchActivities();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _openAddModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const AddActivityModal(),
    );
  }

  void _testAlarm(ActivityModel act) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => AlarmScreenView(activity: act),
        fullscreenDialog: true,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ActivitiesProvider>();
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'ProyecAhorro Móvil',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
            ),
            Text(
              auth.userEmail ?? 'Agenda & Medicamentos',
              style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Cargar de nuevo',
            onPressed: () => provider.fetchActivities(),
            icon: const Icon(Icons.refresh_rounded, color: AppTheme.textSecondary),
          ),
          IconButton(
            tooltip: 'Cerrar Sesión',
            onPressed: () => auth.logout(),
            icon: const Icon(Icons.logout_rounded, color: AppTheme.danger),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: AppTheme.primary,
          labelColor: Colors.white,
          unselectedLabelColor: AppTheme.textMuted,
          labelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12),
          tabs: const [
            Tab(text: 'Pendientes'),
            Tab(text: '💊 Medicinas'),
            Tab(text: 'Hoy'),
            Tab(text: 'Historial'),
          ],
        ),
      ),
      body: provider.isLoading && provider.activities.isEmpty
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primary))
          : TabBarView(
              controller: _tabController,
              children: [
                _buildList(provider.pendingActivities, 'No tienes actividades pendientes.'),
                _buildList(provider.medications, 'No tienes medicamentos registrados.'),
                _buildList(provider.todayActivities, 'No tienes recordatorios para hoy.'),
                _buildList(provider.completedActivities, 'No hay actividades completadas aún.'),
              ],
            ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppTheme.primary,
        foregroundColor: Colors.white,
        onPressed: _openAddModal,
        icon: const Icon(Icons.add_rounded),
        label: const Text('Nuevo Recordatorio', style: TextStyle(fontWeight: FontWeight.w800)),
      ),
    );
  }

  Widget _buildList(List<ActivityModel> list, String emptyMessage) {
    if (list.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.event_available_rounded, size: 64, color: AppTheme.textMuted.withValues(alpha: 0.5)),
              const SizedBox(height: 16),
              Text(
                emptyMessage,
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppTheme.textSecondary, fontSize: 14),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.only(left: 16, right: 16, top: 16, bottom: 84),
      itemCount: list.length,
      itemBuilder: (context, i) {
        final act = list[i];
        final cat = act.category;
        final timeStr = DateFormat('hh:mm a - dd MMM').format(act.scheduledAt);

        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Icono de categoría
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: cat.color.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: cat.color.withValues(alpha: 0.3)),
                      ),
                      child: Icon(cat.icon, color: cat.color, size: 22),
                    ),
                    const SizedBox(width: 12),

                    // Título y categoría
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: cat.color.withValues(alpha: 0.2),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  cat.displayName,
                                  style: TextStyle(
                                    color: cat.color,
                                    fontSize: 10,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                              if (act.intervalHours != null) ...[
                                const SizedBox(width: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: AppTheme.background,
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(color: AppTheme.border),
                                  ),
                                  child: Text(
                                    'c/${act.intervalHours}h',
                                    style: const TextStyle(
                                      color: AppTheme.primaryLight,
                                      fontSize: 10,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            act.title,
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                              color: act.isCompleted ? AppTheme.textMuted : Colors.white,
                              decoration: act.isCompleted ? TextDecoration.lineThrough : null,
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Botón de opciones
                    PopupMenuButton<String>(
                      icon: const Icon(Icons.more_vert_rounded, color: AppTheme.textMuted, size: 20),
                      color: AppTheme.surfaceElevated,
                      onSelected: (val) {
                        if (val == 'test') _testAlarm(act);
                        if (val == 'delete') context.read<ActivitiesProvider>().deleteActivity(act.id);
                      },
                      itemBuilder: (_) => [
                        const PopupMenuItem(
                          value: 'test',
                          child: Row(
                            children: [
                              Icon(Icons.alarm_on_rounded, size: 18, color: AppTheme.secondary),
                              SizedBox(width: 8),
                              Text('Probar Alarma'),
                            ],
                          ),
                        ),
                        const PopupMenuItem(
                          value: 'delete',
                          child: Row(
                            children: [
                              Icon(Icons.delete_outline_rounded, size: 18, color: AppTheme.danger),
                              SizedBox(width: 8),
                              Text('Eliminar'),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),

                if (act.description.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Text(
                    act.description,
                    style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13),
                  ),
                ],

                const SizedBox(height: 12),
                const Divider(height: 1, color: AppTheme.border),
                const SizedBox(height: 10),

                // Footer con hora y botón de acción rápido
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.access_time_rounded, size: 14, color: AppTheme.textMuted),
                        const SizedBox(width: 6),
                        Text(
                          timeStr,
                          style: const TextStyle(color: AppTheme.textMuted, fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),

                    if (!act.isCompleted)
                      TextButton.icon(
                        style: TextButton.styleFrom(
                          foregroundColor: AppTheme.success,
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        ),
                        onPressed: () => context.read<ActivitiesProvider>().markCompleted(act.id),
                        icon: const Icon(Icons.check_circle_outline_rounded, size: 18),
                        label: Text(
                          cat == ActivityCategory.medicamento ? 'Tomado' : 'Hecho',
                          style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12),
                        ),
                      )
                    else
                      const Row(
                        children: [
                          Icon(Icons.check_circle_rounded, color: AppTheme.success, size: 16),
                          SizedBox(width: 4),
                          Text('Completado', style: TextStyle(color: AppTheme.success, fontSize: 12, fontWeight: FontWeight.w700)),
                        ],
                      ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
