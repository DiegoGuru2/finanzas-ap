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
import '../../settings/views/settings_view.dart';

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

  void _openSettings() {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const SettingsView()),
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
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        children: [
          // ─── Banner de Error (si hubo fallo de conexión) ───
          if (fin.errorMessage != null)
            Container(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppTheme.danger.withValues(alpha: 0.1),
                border: Border.all(color: AppTheme.danger.withValues(alpha: 0.3)),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Row(
                children: [
                  const Icon(Icons.warning_amber_rounded, color: AppTheme.danger, size: 24),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      fin.errorMessage!,
                      style: const TextStyle(color: AppTheme.danger, fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                  ),
                  TextButton(
                    onPressed: () => fin.fetchAll(),
                    child: const Text('Reintentar', style: TextStyle(color: AppTheme.primaryLight, fontSize: 12)),
                  ),
                ],
              ),
            ),

          // ─── Tarjeta 1: Superávit Disponible / Excedente ───
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
                        fin.status == 'healthy'
                            ? 'Saludable'
                            : (fin.status == 'tight' ? 'Ajustado' : 'Déficit'),
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
                  'Ingreso neto: ${currencyFormat.format(fin.netIncome)}  ·  Gastos y cuotas: ${currencyFormat.format(fin.totalExpenses + fin.totalMinimumPayments)}',
                  style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // ─── Tarjeta 2: Sueldo Neto Líquido & Configuración ───
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.account_balance_wallet_rounded, color: AppTheme.secondary, size: 20),
                          const SizedBox(width: 8),
                          const Text(
                            'Sueldo Neto Líquido',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white),
                          ),
                        ],
                      ),
                      TextButton.icon(
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        onPressed: _openSettings,
                        icon: const Icon(Icons.settings_outlined, size: 15, color: AppTheme.primaryLight),
                        label: const Text('Configurar', style: TextStyle(color: AppTheme.primaryLight, fontSize: 12, fontWeight: FontWeight.w700)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    currencyFormat.format(fin.netIncome),
                    style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: AppTheme.secondary),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Bruto: ${currencyFormat.format(fin.grossIncome)}  ·  IESS: -${currencyFormat.format(fin.iessDeductions)}${fin.benefitsMonthly > 0 ? '  ·  Beneficios: +${currencyFormat.format(fin.benefitsMonthly)}' : ''}',
                    style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),

          // ─── Tarjeta 3: Flujo Quincena vs Fin de Mes ───
          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Flujo Quincena vs Fin de Mes',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white),
                      ),
                      if (fin.programmedSavings > 0)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppTheme.success.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: AppTheme.success.withValues(alpha: 0.3)),
                          ),
                          child: Text(
                            'Ahorro: ${currencyFormat.format(fin.programmedSavings)}',
                            style: const TextStyle(color: AppTheme.success, fontSize: 10, fontWeight: FontWeight.w800),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppTheme.surfaceElevated,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppTheme.border),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Quincena (Día 15)', style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                              const SizedBox(height: 4),
                              Text(
                                currencyFormat.format(fin.quincenaAvailable),
                                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 16),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppTheme.surfaceElevated,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppTheme.border),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Fin de Mes (Día 30)', style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                              const SizedBox(height: 4),
                              Text(
                                currencyFormat.format(fin.finDeMesAvailable),
                                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 16),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),

          // ─── Tarjeta 4: Deuda Total Activa ───
          Card(
            child: InkWell(
              onTap: () => widget.onNavigateTab?.call(1),
              borderRadius: BorderRadius.circular(18),
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Deuda Total Activa', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white)),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppTheme.danger.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            '${fin.activeDebtsCount} activa${fin.activeDebtsCount == 1 ? '' : 's'}',
                            style: const TextStyle(color: AppTheme.danger, fontSize: 11, fontWeight: FontWeight.w700),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      currencyFormat.format(fin.totalDebt),
                      style: const TextStyle(color: AppTheme.danger, fontSize: 24, fontWeight: FontWeight.w900),
                    ),
                    const SizedBox(height: 8),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: LinearProgressIndicator(
                        value: (fin.totalDebtProgress / 100).clamp(0.0, 1.0),
                        backgroundColor: Colors.white12,
                        valueColor: const AlwaysStoppedAnimation(AppTheme.success),
                        minHeight: 6,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Mínimo mensual: ${currencyFormat.format(fin.totalMinimumPayments)}',
                            style: const TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                        if (fin.totalDebtPaidOff > 0)
                          Text('Pagado: ${currencyFormat.format(fin.totalDebtPaidOff)} (${fin.totalDebtProgress.toStringAsFixed(0)}%)',
                              style: const TextStyle(color: AppTheme.success, fontSize: 11, fontWeight: FontWeight.w700)),
                      ],
                    ),
                  ],
                ),
              ),
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
          const SizedBox(height: 20),

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
                  onTap: () => widget.onNavigateTab?.call(2),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildMetricCard(
                  title: 'Total Ahorrado',
                  amount: currencyFormat.format(fin.totalSaved),
                  icon: Icons.savings_rounded,
                  color: AppTheme.success,
                  subtitle: fin.totalSavingsTarget > 0 ? '${fin.savingsProgress.toStringAsFixed(0)}% objetivo' : 'Activo',
                ),
              ),
            ],
          ),
          const SizedBox(height: 28),

          // ─── Sección: Medicamentos & Alarmas de Hoy ───
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                '💊 Medicamentos & Agenda de Hoy',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                ),
              ),
              TextButton(
                onPressed: () => widget.onNavigateTab?.call(4),
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
