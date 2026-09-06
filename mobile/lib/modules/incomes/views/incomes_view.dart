import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../../providers/finances_provider.dart';
import '../../../core/theme/app_theme.dart';
import 'add_income_modal.dart';

class IncomesView extends StatelessWidget {
  const IncomesView({super.key});

  void _openAddModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const AddIncomeModal(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final fin = context.watch<FinancesProvider>();
    final currencyFormat = NumberFormat.currency(symbol: '\$', decimalDigits: 2);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Ingresos y Sueldos', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18)),
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
            // Resumen de Ingresos
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AppTheme.surface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppTheme.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('TOTAL INGRESOS NETOS MENSUALES', style: TextStyle(color: AppTheme.textMuted, fontSize: 10, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 6),
                  Text(
                    currencyFormat.format(fin.netIncome),
                    style: const TextStyle(color: AppTheme.secondary, fontSize: 24, fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 12),
                  const Divider(height: 1, color: AppTheme.border),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '${fin.incomes.length} fuentes registradas',
                        style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12),
                      ),
                      const Text(
                        'Con cálculo IESS y Quincena',
                        style: TextStyle(color: AppTheme.primaryLight, fontSize: 11, fontWeight: FontWeight.w700),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),

            if (fin.incomes.isEmpty)
              Padding(
                padding: const EdgeInsets.all(40),
                child: Center(
                  child: Column(
                    children: [
                      Icon(Icons.account_balance_wallet_rounded, size: 56, color: AppTheme.textMuted.withValues(alpha: 0.5)),
                      const SizedBox(height: 12),
                      const Text('No tienes ingresos registrados', style: TextStyle(color: AppTheme.textSecondary)),
                    ],
                  ),
                ),
              )
            else
              ...fin.incomes.map((inc) {
                final amount = (inc['amount'] as num?)?.toDouble() ?? 0.0;
                final net = (inc['netAmount'] as num?)?.toDouble() ?? amount;
                final isSalary = inc['isSalary'] == true;
                final quincena = (inc['quincenaAmount'] as num?)?.toDouble() ?? 0.0;
                final finDeMes = (inc['finDeMesAmount'] as num?)?.toDouble() ?? 0.0;

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
                                  Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: AppTheme.secondary.withValues(alpha: 0.2),
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Text(
                                          isSalary ? 'Sueldo' : 'Ingreso',
                                          style: const TextStyle(color: AppTheme.secondary, fontSize: 10, fontWeight: FontWeight.w800),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    inc['name']?.toString() ?? 'Ingreso',
                                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white),
                                  ),
                                ],
                              ),
                            ),
                            Text(
                              currencyFormat.format(net),
                              style: const TextStyle(color: AppTheme.secondary, fontSize: 18, fontWeight: FontWeight.w900),
                            ),
                            IconButton(
                              icon: const Icon(Icons.delete_outline_rounded, color: AppTheme.danger, size: 20),
                              onPressed: () => fin.deleteIncome(inc['id'].toString()),
                            ),
                          ],
                        ),

                        if (quincena > 0 || finDeMes > 0) ...[
                          const SizedBox(height: 10),
                          const Divider(height: 1, color: AppTheme.border),
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('Quincena: ${currencyFormat.format(quincena)}', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
                              Text('Fin de Mes: ${currencyFormat.format(finDeMes)}', style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12)),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                );
              }),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppTheme.primary,
        foregroundColor: Colors.white,
        onPressed: () => _openAddModal(context),
        icon: const Icon(Icons.add_rounded),
        label: const Text('Nuevo Ingreso', style: TextStyle(fontWeight: FontWeight.w800)),
      ),
    );
  }
}
