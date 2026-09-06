import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../../providers/finances_provider.dart';
import '../../../core/theme/app_theme.dart';
import 'add_expense_modal.dart';

class ExpensesView extends StatelessWidget {
  const ExpensesView({super.key});

  void _openAddModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const AddExpenseModal(),
    );
  }

  IconData _getCategoryIcon(String? category) {
    switch (category) {
      case 'food':
        return Icons.restaurant_rounded;
      case 'housing':
        return Icons.home_rounded;
      case 'transport':
        return Icons.directions_car_rounded;
      case 'utilities':
        return Icons.bolt_rounded;
      case 'health':
        return Icons.local_pharmacy_rounded;
      case 'entertainment':
        return Icons.movie_rounded;
      default:
        return Icons.category_rounded;
    }
  }

  Color _getCategoryColor(String? category) {
    switch (category) {
      case 'food':
        return const Color(0xFFF59E0B);
      case 'housing':
        return const Color(0xFF3B82F6);
      case 'transport':
        return const Color(0xFF8B5CF6);
      case 'utilities':
        return const Color(0xFF06B6D4);
      case 'health':
        return const Color(0xFFEC4899);
      case 'entertainment':
        return const Color(0xFF10B981);
      default:
        return AppTheme.textSecondary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final fin = context.watch<FinancesProvider>();
    final currencyFormat = NumberFormat.currency(symbol: '\$', decimalDigits: 2);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Gastos del Mes', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18)),
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
            // Resumen de Gastos
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AppTheme.surface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppTheme.border),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('TOTAL GASTOS MENSUALES', style: TextStyle(color: AppTheme.textMuted, fontSize: 10, fontWeight: FontWeight.w800)),
                      const SizedBox(height: 6),
                      Text(
                        currencyFormat.format(fin.totalExpenses),
                        style: const TextStyle(color: AppTheme.danger, fontSize: 22, fontWeight: FontWeight.w900),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppTheme.danger.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '${fin.expenses.length} gastos',
                      style: const TextStyle(color: AppTheme.danger, fontWeight: FontWeight.w800, fontSize: 12),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),

            if (fin.expenses.isEmpty)
              Padding(
                padding: const EdgeInsets.all(40),
                child: Center(
                  child: Column(
                    children: [
                      Icon(Icons.receipt_long_rounded, size: 56, color: AppTheme.textMuted.withValues(alpha: 0.5)),
                      const SizedBox(height: 12),
                      const Text('No tienes gastos registrados', style: TextStyle(color: AppTheme.textSecondary)),
                    ],
                  ),
                ),
              )
            else
              ...fin.expenses.map((exp) {
                final amount = (exp['amount'] as num?)?.toDouble() ?? 0.0;
                final cat = exp['category']?.toString() ?? 'other';
                final isEssential = exp['isEssential'] == true;
                final color = _getCategoryColor(cat);

                return Card(
                  margin: const EdgeInsets.only(bottom: 10),
                  child: ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    leading: Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(_getCategoryIcon(cat), color: color, size: 22),
                    ),
                    title: Text(
                      exp['name']?.toString() ?? 'Gasto',
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Colors.white),
                    ),
                    subtitle: Row(
                      children: [
                        if (isEssential)
                          Container(
                            margin: const EdgeInsets.only(right: 6, top: 4),
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppTheme.success.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: const Text('Esencial', style: TextStyle(color: AppTheme.success, fontSize: 10, fontWeight: FontWeight.w700)),
                          ),
                        Text(
                          exp['frequency']?.toString() ?? 'monthly',
                          style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
                        ),
                      ],
                    ),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          currencyFormat.format(amount),
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 16),
                        ),
                        IconButton(
                          icon: const Icon(Icons.delete_outline_rounded, color: AppTheme.danger, size: 20),
                          onPressed: () => fin.deleteExpense(exp['id'].toString()),
                        ),
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
        label: const Text('Nuevo Gasto', style: TextStyle(fontWeight: FontWeight.w800)),
      ),
    );
  }
}
