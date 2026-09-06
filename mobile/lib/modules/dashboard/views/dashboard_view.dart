import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../../providers/finances_provider.dart';
import '../../../providers/activities_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../expenses/views/add_expense_modal.dart';
import '../../debts/views/add_debt_modal.dart';
import '../../activities/views/add_activity_modal.dart';
import '../../alarm/views/alarm_screen_view.dart';

class DashboardView extends StatefulWidget {
  final Function(int)? onNavigateTab;

  const DashboardView({super.key, this.onNavigateTab});

  @override
  State<DashboardView> createState() => _DashboardViewState();
}

class _DashboardViewState extends State<DashboardView> {
  final currencyFormat = NumberFormat.currency(symbol: '\$', decimalDigits: 2);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<FinancesProvider>().fetchAll();
      context.read<ActivitiesProvider>().fetchActivities();
    });
  }

  void _openAddExpense() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const AddExpenseModal(),
    );
  }

  void _openAddDebt() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const AddDebtModal(),
    );
  }

  void _openAddActivity() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const AddActivityModal(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final fin = context.watch<FinancesProvider>();
    final act = context.watch<ActivitiesProvider>();

    if (fin.isLoading && fin.dashboardData == null) {
      return const Center(child: CircularProgressIndicator(color: AppTheme.primary));
    }

    return RefreshIndicator(
      color: AppTheme.primary,
      onRefresh: () async {
        await Future.wait([
          fin.fetchAll(),
          act.fetchActivities(),
        ]);
      },
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
        children: [
          // ─── Tarjeta Principal de Balance (Superávit) ───
          Container(
            padding: const EdgeInsets.all(22),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  fin.surplus >= 0 ? const Color(0xFF1E3A8A) : const Color(0xFF881337),
                  const Color(0xFF111827),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(
                color: (fin.surplus >= 0 ? AppTheme.primary : AppTheme.danger).withValues(alpha: 0.35),
              ),
              boxShadow: [
                BoxShadow(
                  color: (fin.surplus >= 0 ? AppTheme.primary : AppTheme.danger).withValues(alpha: 0.2),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'SUPERÁVIT DISPONIBLE',
                      style: TextStyle(
                        color: AppTheme.textMuted,
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.5,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: (fin.surplus >= 0 ? AppTheme.success : AppTheme.danger).withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        fin.surplus >= 0 ? 'Saludable' : 'Déficit',
                        style: TextStyle(
                          color: fin.surplus >= 0 ? AppTheme.success : AppTheme.danger,
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  currencyFormat.format(fin.surplus),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 34,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -1,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Ingresos netos: ${currencyFormat.format(fin.netIncome)}',
                  style: const TextStyle(color: AppTheme.textSecondary, fontSize: 13),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // ─── Botones de Acción Rápida ───
          Row(
            children: [
              Expanded(
                child: _buildQuickBtn(
                  label: '+ Gasto',
                  icon: Icons.remove_circle_outline_rounded,
                  color: AppTheme.danger,
                  onTap: _openAddExpense,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildQuickBtn(
                  label: '+ Deuda',
                  icon: Icons.credit_card_rounded,
                  color: AppTheme.secondary,
                  onTap: _openAddDebt,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildQuickBtn(
                  label: '+ Alarma',
                  icon: Icons.alarm_add_rounded,
                  color: AppTheme.primaryLight,
                  onTap: _openAddActivity,
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // ─── Métricas en Cuadrícula ───
          Row(
            children: [
              Expanded(
                child: _buildMetricCard(
                  title: 'Gastos Mensuales',
                  amount: currencyFormat.format(fin.totalExpenses),
                  icon: Icons.receipt_long_rounded,
                  color: AppTheme.danger,
                  subtitle: '${fin.expenses.length} registros',
                  onTap: () => widget.onNavigateTab?.call(2), // Tab Gastos
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildMetricCard(
                  title: 'Cuotas Deudas',
                  amount: currencyFormat.format(fin.totalMinimumPayments),
                  icon: Icons.credit_score_rounded,
                  color: AppTheme.warning,
                  subtitle: '${fin.activeDebtsCount} deudas activas',
                  onTap: () => widget.onNavigateTab?.call(1), // Tab Deudas
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildMetricCard(
                  title: 'Total Ahorrado',
                  amount: currencyFormat.format(fin.totalSaved),
                  icon: Icons.savings_rounded,
                  color: AppTheme.success,
                  subtitle: '${fin.savingsGoals.length} metas activas',
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildMetricCard(
                  title: 'Ingresos Netos',
                  amount: currencyFormat.format(fin.netIncome),
                  icon: Icons.account_balance_wallet_rounded,
                  color: AppTheme.secondary,
                  subtitle: '${fin.incomes.length} fuentes de ingreso',
                  onTap: () => widget.onNavigateTab?.call(3), // Tab Ingresos
                ),
              ),
            ],
          ),
          const SizedBox(height: 28),

          // ─── Sección: Medicamentos y Alarmas de Hoy ───
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                '💊 Medicamentos & Tareas de Hoy',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                ),
              ),
              TextButton(
                onPressed: () => widget.onNavigateTab?.call(4), // Tab Actividades
                child: const Text('Ver todas', style: TextStyle(color: AppTheme.primaryLight, fontSize: 13)),
              ),
            ],
          ),
          const SizedBox(height: 10),

          if (act.todayActivities.isEmpty)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Center(
                  child: Column(
                    children: [
                      Icon(Icons.check_circle_outline_rounded, size: 40, color: AppTheme.success.withValues(alpha: 0.7)),
                      const SizedBox(height: 8),
                      const Text(
                        '¡No tienes recordatorios pendientes para hoy!',
                        style: TextStyle(color: AppTheme.textSecondary, fontSize: 13, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
              ),
            )
          else
            ...act.todayActivities.take(3).map((a) {
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: a.category.color.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(a.category.icon, color: a.category.color, size: 20),
                  ),
                  title: Text(
                    a.title,
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 14,
                      decoration: a.isCompleted ? TextDecoration.lineThrough : null,
                      color: a.isCompleted ? AppTheme.textMuted : Colors.white,
                    ),
                  ),
                  subtitle: Text(
                    DateFormat('hh:mm a').format(a.scheduledAt),
                    style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                  ),
                  trailing: a.isCompleted
                      ? const Icon(Icons.check_circle_rounded, color: AppTheme.success, size: 20)
                      : IconButton(
                          icon: const Icon(Icons.alarm_on_rounded, color: AppTheme.primaryLight, size: 20),
                          tooltip: 'Probar alarma',
                          onPressed: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => AlarmScreenView(activity: a),
                                fullscreenDialog: true,
                              ),
                            );
                          },
                        ),
                ),
              );
            }),
        ],
      ),
    );
  }

  Widget _buildQuickBtn({
    required String label,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: AppTheme.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppTheme.border),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 18, color: color),
            const SizedBox(width: 6),
            Text(
              label,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w700,
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetricCard({
    required String title,
    required String amount,
    required IconData icon,
    required Color color,
    required String subtitle,
    VoidCallback? onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    title,
                    style: const TextStyle(color: AppTheme.textSecondary, fontSize: 11, fontWeight: FontWeight.w700),
                  ),
                  Icon(icon, size: 18, color: color),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                amount,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                subtitle,
                style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
