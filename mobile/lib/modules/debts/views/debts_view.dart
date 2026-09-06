import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../../providers/finances_provider.dart';
import '../../../core/theme/app_theme.dart';
import 'add_debt_modal.dart';

class DebtsView extends StatelessWidget {
  const DebtsView({super.key});

  void _openAddModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const AddDebtModal(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final fin = context.watch<FinancesProvider>();
    final currencyFormat = NumberFormat.currency(symbol: '\$', decimalDigits: 2);

    final activeDebts = fin.debts.where((d) => d['status'] != 'liquidated').toList();
    final liquidatedDebts = fin.debts.where((d) => d['status'] == 'liquidated').toList();

    double totalBalance = 0.0;
    double totalMinPay = 0.0;
    for (final d in activeDebts) {
      totalBalance += (d['currentBalance'] as num?)?.toDouble() ?? 0.0;
      totalMinPay += (d['minimumPayment'] as num?)?.toDouble() ?? 0.0;
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Gestión de Deudas', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: AppTheme.textSecondary),
            onPressed: () => fin.fetchAll(),
          ),
        ],
      ),
      body: RefreshIndicator(
        color: AppTheme.primary,
        onRefresh: () => fin.fetchAll(),
        child: ListView(
          padding: const EdgeInsets.only(left: 16, right: 16, top: 16, bottom: 84),
          children: [
            // Resumen de Deudas
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AppTheme.surface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppTheme.border),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('DEUDA ACTIVA TOTAL', style: TextStyle(color: AppTheme.textMuted, fontSize: 10, fontWeight: FontWeight.w800)),
                        const SizedBox(height: 6),
                        Text(
                          currencyFormat.format(totalBalance),
                          style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900),
                        ),
                      ],
                    ),
                  ),
                  Container(width: 1, height: 40, color: AppTheme.border),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('CUOTA MÍNIMA TOTAL', style: TextStyle(color: AppTheme.textMuted, fontSize: 10, fontWeight: FontWeight.w800)),
                        const SizedBox(height: 6),
                        Text(
                          currencyFormat.format(totalMinPay),
                          style: const TextStyle(color: AppTheme.warning, fontSize: 20, fontWeight: FontWeight.w900),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            if (fin.debts.isEmpty)
              Padding(
                padding: const EdgeInsets.all(40),
                child: Center(
                  child: Column(
                    children: [
                      Icon(Icons.credit_score_rounded, size: 56, color: AppTheme.textMuted.withValues(alpha: 0.5)),
                      const SizedBox(height: 12),
                      const Text('No tienes deudas registradas', style: TextStyle(color: AppTheme.textSecondary)),
                    ],
                  ),
                ),
              )
            else ...[
              // Deudas Activas
              if (activeDebts.isNotEmpty) ...[
                const Text('DEUDAS ACTIVAS', style: TextStyle(color: AppTheme.textMuted, fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1)),
                const SizedBox(height: 10),
                ...activeDebts.map((d) => _buildDebtCard(context, d, false, currencyFormat, fin)),
                const SizedBox(height: 16),
              ],

              // Deudas Liquidadas / Pagadas
              if (liquidatedDebts.isNotEmpty) ...[
                const Text('DEUDAS LIQUIDADAS', style: TextStyle(color: AppTheme.success, fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1)),
                const SizedBox(height: 10),
                ...liquidatedDebts.map((d) => _buildDebtCard(context, d, true, currencyFormat, fin)),
              ],
            ],
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppTheme.primary,
        foregroundColor: Colors.white,
        onPressed: () => _openAddModal(context),
        icon: const Icon(Icons.add_rounded),
        label: const Text('Nueva Deuda', style: TextStyle(fontWeight: FontWeight.w800)),
      ),
    );
  }

  Widget _buildDebtCard(
    BuildContext context,
    Map<String, dynamic> d,
    bool isLiquidated,
    NumberFormat currencyFormat,
    FinancesProvider fin,
  ) {
    final curBal = (d['currentBalance'] as num?)?.toDouble() ?? 0.0;
    final minPay = (d['minimumPayment'] as num?)?.toDouble() ?? 0.0;
    final apr = (d['apr'] as num?)?.toDouble() ?? 0.0;
    final dueDay = d['dueDay'] ?? 15;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        d['name']?.toString() ?? 'Deuda',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: isLiquidated ? AppTheme.textMuted : Colors.white,
                          decoration: isLiquidated ? TextDecoration.lineThrough : null,
                        ),
                      ),
                      if (d['creditor'] != null && d['creditor'].toString().isNotEmpty)
                        Text(
                          d['creditor'].toString(),
                          style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12),
                        ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: (isLiquidated ? AppTheme.success : AppTheme.secondary).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    isLiquidated ? 'LIQUIDADA' : 'Día $dueDay',
                    style: TextStyle(
                      color: isLiquidated ? AppTheme.success : AppTheme.secondary,
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            const Divider(height: 1, color: AppTheme.border),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Saldo Actual', style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                    const SizedBox(height: 2),
                    Text(
                      currencyFormat.format(curBal),
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                        color: isLiquidated ? AppTheme.textMuted : Colors.white,
                        decoration: isLiquidated ? TextDecoration.lineThrough : null,
                      ),
                    ),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Cuota Mínima', style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                    const SizedBox(height: 2),
                    Text(
                      currencyFormat.format(minPay),
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: isLiquidated ? AppTheme.textMuted : AppTheme.warning,
                        decoration: isLiquidated ? TextDecoration.lineThrough : null,
                      ),
                    ),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Tasa APR', style: TextStyle(color: AppTheme.textMuted, fontSize: 11)),
                    const SizedBox(height: 2),
                    Text('$apr%', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppTheme.textSecondary)),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.delete_outline_rounded, color: AppTheme.danger, size: 20),
                  onPressed: () => fin.deleteDebt(d['id'].toString()),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
